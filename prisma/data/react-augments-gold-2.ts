/**
 * React Phase R1 — Batch 2 (Components & rendering). Gold-standard rewrites.
 * Same conventions as react-augments-gold-1.ts: TL;DR + cyan SVG + table + tip +
 * self-contained JSX example (runnable:false). Inline code uses <code> tags and
 * &lt;/&gt; entities for JSX angle brackets (raw HTML goes through rehype-raw).
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
    title: "What is JSX?",
    answer: `**Core concept.** JSX is a syntax extension that lets you write markup-like code inside JavaScript. It is **not HTML** — a compiler (Babel/SWC) transforms each tag into a <code>React.createElement</code> call (or the modern <code>jsx()</code> runtime), which returns a plain **React element** object describing the UI.

${card(`<svg viewBox="0 0 520 158" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">JSX compiles to function calls that return objects</text>
  <rect x="20" y="48" width="150" height="62" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="95" y="72" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">JSX</text>
  <text x="95" y="92" fill="currentColor" font-size="9" text-anchor="middle">&lt;h1&gt;Hi {name}&lt;/h1&gt;</text>
  <rect x="195" y="48" width="150" height="62" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="270" y="72" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">compiles to</text>
  <text x="270" y="92" fill="currentColor" font-size="8.5" text-anchor="middle">createElement("h1",…)</text>
  <rect x="370" y="48" width="130" height="62" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="435" y="72" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">element</text>
  <text x="435" y="92" fill="currentColor" font-size="8.5" text-anchor="middle">{type, props}</text>
  <path d="M 170 79 L 193 79" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#jx-a)"/>
  <path d="M 345 79 L 368 79" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#jx-a)"/>
  <defs><marker id="jx-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Inside JSX you embed any JavaScript expression in <code>{ }</code>, and because it compiles to function calls it must return a **single root** (use a Fragment to avoid an extra wrapper). Since it's JavaScript, attribute names follow JS conventions: <code>className</code> (not <code>class</code>), <code>htmlFor</code>, camelCase event props like <code>onClick</code>, and <code>style</code> takes an object. JSX also auto-escapes interpolated values, which protects against XSS. JSX is optional sugar — you *could* call <code>createElement</code> by hand — but it makes UI code readable.

### JSX vs HTML
| HTML | JSX |
| --- | --- |
| <code>class</code> | <code>className</code> |
| <code>for</code> | <code>htmlFor</code> |
| <code>onclick="…"</code> | <code>onClick={fn}</code> |
| <code>style="…"</code> | <code>style={{ }}</code> object |

> **Interview tip:** Say JSX is **not** HTML — it desugars to <code>createElement</code> returning element objects. Mention <code>{}</code> for expressions, the single-root rule, <code>className</code>/camelCase, and that interpolation is auto-escaped (XSS safety).`,
    examples: [
      {
        label: "JSX with expressions and attributes",
        runnable: false,
        code: `export default function App() {
  const name = "Ada";
  const items = ["React", "JSX", "Babel"];
  const active = true;

  return (
    <div className="card" style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Hi {name}!</h1>
      <p>{active ? "Online" : "Offline"}</p>
      <ul>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between element and component in React?",
    answer: `**Core concept.** A **component** is a function (or class) that returns UI — the reusable blueprint. An **element** is the plain, immutable object that a component (or JSX) *produces* to describe what should appear on screen. You write components; React works with the elements they return.

${card(`<svg viewBox="0 0 520 158" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Component (factory) → element (description) → DOM</text>
  <rect x="20" y="50" width="140" height="58" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="90" y="74" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">Component</text>
  <text x="90" y="93" fill="currentColor" font-size="8.5" text-anchor="middle">function Button()</text>
  <rect x="190" y="50" width="150" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="265" y="74" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">Element</text>
  <text x="265" y="93" fill="currentColor" font-size="8" text-anchor="middle">{type:Button, props}</text>
  <rect x="370" y="50" width="130" height="58" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="435" y="74" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">DOM</text>
  <text x="435" y="93" fill="currentColor" font-size="8.5" text-anchor="middle">&lt;button&gt;</text>
  <path d="M 160 79 L 188 79" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#ec-a)"/>
  <path d="M 340 79 L 368 79" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#ec-a)"/>
  <defs><marker id="ec-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Writing <code>&lt;Button color="blue" /&gt;</code> doesn't run the component immediately — it creates an *element*: a lightweight object <code>{ type: Button, props: { color: "blue" } }</code>. React calls the component function to get the elements it returns, builds a tree, diffs it against the previous one (reconciliation), and applies minimal DOM updates. Elements are **immutable** — to change the UI you produce new elements; you don't mutate old ones. So: components describe *how* to build UI; elements are the *what* at a point in time.

### Element vs component
| | Component | Element |
| --- | --- | --- |
| What it is | function/class | plain object |
| Role | blueprint / factory | description of output |
| Mutable | n/a | immutable |
| You write / React uses | you write | React consumes |

> **Interview tip:** Crisp framing: "a component is a function that returns elements; an element is an immutable object describing UI." Note <code>&lt;Button /&gt;</code> creates an element (cheap) rather than calling the function directly.`,
    examples: [
      {
        label: "A component returns elements",
        runnable: false,
        code: `// Button is a COMPONENT (a function)
function Button({ label }) {
  return <button>{label}</button>;   // returns an ELEMENT
}

export default function App() {
  // <Button .../> creates an element: { type: Button, props: { label } }
  const el = <Button label="Click me" />;
  console.log(typeof el, el.type === Button); // "object" true
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {el}
      <Button label="Another" />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between state and props?",
    answer: `**Core concept.** **Props** are inputs passed *into* a component from its parent — read-only from the child's view. **State** is data a component *owns* internally and can change over time; updating it (via the setter) triggers a re-render. Props flow **down**; state is **local** and mutable through its updater.

${card(`<svg viewBox="0 0 520 158" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Props come from above (read-only) · state is internal</text>
  <rect x="20" y="46" width="230" height="100" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="66" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">props</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">passed by parent ↓</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">read-only in child</text>
  <text x="135" y="132" fill="#06b6d4" font-size="9" text-anchor="middle">configure the component</text>
  <rect x="270" y="46" width="230" height="100" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="66" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">state</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">owned internally</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">change → re-render</text>
  <text x="385" y="132" fill="#8b5cf6" font-size="9" text-anchor="middle">remembers over time</text>
</svg>`)}

**How it works.** A child must never mutate its props — to change them, the **parent** passes new ones. State, created with <code>useState</code>/<code>useReducer</code>, is private to the component and persists across renders; calling its setter schedules a re-render with the new value. A useful pattern is "controlled from above": data lives as state in a parent and is handed to children as props, with callbacks (also props) letting children request changes. If two components need the same state, **lift it up** to their nearest common parent.

### State vs props
| | props | state |
| --- | --- | --- |
| Source | parent | the component itself |
| Mutable by component | no (read-only) | yes (via setter) |
| Triggers re-render | when parent passes new | on update |
| Purpose | configuration/input | memory over time |

> **Interview tip:** Two lines: "props are read-only inputs from the parent; state is internal and triggers a re-render when changed." Add that shared state should be **lifted up**, and a child changes parent state via a callback prop.`,
    examples: [
      {
        label: "Parent state passed down as props",
        runnable: false,
        code: `import { useState } from "react";

function Greeting({ name }) {        // 'name' is a read-only prop
  return <p>Hello, {name}!</p>;
}

export default function App() {
  const [name, setName] = useState("Ada"); // state owned by App
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Greeting name={name} />
      <button onClick={() => setName(name === "Ada" ? "Grace" : "Ada")}>
        Switch name
      </button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are fragments in React?",
    answer: `**Core concept.** A Fragment lets a component return **multiple children without adding an extra DOM node**. Because a component must return a single root, fragments — written as <code>&lt;&gt;…&lt;/&gt;</code> or <code>&lt;React.Fragment&gt;</code> — group siblings without the "wrapper <code>&lt;div&gt;</code> soup" that breaks layouts like fl/grid and tables.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Group siblings, emit no wrapper element</text>
  <rect x="30" y="44" width="200" height="84" rx="9" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.4"/>
  <text x="130" y="64" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">&lt;div&gt; wrapper</text>
  <text x="130" y="86" fill="currentColor" font-size="9" text-anchor="middle">extra DOM node</text>
  <text x="130" y="106" fill="currentColor" font-size="9" text-anchor="middle">can break flex/grid/table</text>
  <rect x="290" y="44" width="200" height="84" rx="9" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.4"/>
  <text x="390" y="64" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">&lt;&gt;…&lt;/&gt; Fragment</text>
  <text x="390" y="86" fill="currentColor" font-size="9" text-anchor="middle">no extra node</text>
  <text x="390" y="106" fill="currentColor" font-size="9" text-anchor="middle">clean DOM output</text>
</svg>`)}

**How it works.** Returning two sibling elements directly is a syntax error (no single root), so historically people wrapped them in a <code>&lt;div&gt;</code> — polluting the DOM and sometimes breaking CSS that expects specific parent/child relationships (table rows, fl/grid items). A fragment satisfies the single-root rule while rendering nothing itself. The shorthand <code>&lt;&gt;&lt;/&gt;</code> is most common; when you need a <code>key</code> (e.g. mapping a list of grouped pairs) you must use the explicit <code>&lt;React.Fragment key={id}&gt;</code> form, since the shorthand can't take props.

### Fragment forms
| Form | Can take a key? |
| --- | --- |
| <code>&lt;&gt;…&lt;/&gt;</code> (shorthand) | no |
| <code>&lt;React.Fragment&gt;</code> | yes (<code>key</code> only) |

> **Interview tip:** State the two reasons: satisfy the single-root rule and avoid extra wrapper nodes that bloat the DOM or break table/flex layouts. Note the shorthand can't take a <code>key</code> — use <code>&lt;React.Fragment key={…}&gt;</code> in lists.`,
    examples: [
      {
        label: "Return siblings without a wrapper",
        runnable: false,
        code: `import { Fragment } from "react";

function Columns() {
  return (
    <>                          {/* shorthand fragment — no extra <div> */}
      <td>Name</td>
      <td>Role</td>
    </>
  );
}

export default function App() {
  const rows = [{ id: 1, a: "Ada", b: "Eng" }];
  return (
    <table style={{ fontFamily: "system-ui", margin: 24 }}>
      <tbody>
        <tr><Columns /></tr>
        {rows.map((r) => (
          <Fragment key={r.id}>   {/* keyed fragment in a list */}
            <tr><td>{r.a}</td><td>{r.b}</td></tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the `key` prop when rendering lists in React?",
    answer: `**Core concept.** <code>key</code> gives each item in a list a **stable identity** so React can match elements between renders during reconciliation. With correct keys, React updates/moves only what changed instead of re-creating the whole list. Keys must be **unique among siblings** and **stable** — use a real id, not the array index.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Keys let React match items across renders</text>
  <rect x="20" y="46" width="230" height="100" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="66" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">stable id key ✓</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">reorder → React MOVES nodes</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">preserves item state/focus</text>
  <text x="135" y="132" fill="#22c55e" font-size="9" text-anchor="middle">minimal DOM ops</text>
  <rect x="270" y="46" width="230" height="100" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="66" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">index as key ✗</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">insert/reorder → indexes shift</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">wrong item updated</text>
  <text x="385" y="132" fill="#ef4444" font-size="9" text-anchor="middle">state/input bugs</text>
</svg>`)}

**How it works.** During reconciliation React compares the new children to the old ones. Without keys it matches by **position**, so inserting at the top or reordering makes it think every item changed — wasteful and buggy (a text input's value or a checkbox can attach to the wrong row). A stable, unique key (a database id, a uuid) tells React "this is the *same* item," so it moves/keeps the existing DOM and component state. Using the array **index** is fine only for static, never-reordered lists; otherwise it reintroduces the position-matching bug. Keys are a hint to React — they're not passed to your component as a prop. Bonus: changing an element's key intentionally **resets** its state (remount).

### Good vs bad keys
| Key choice | Verdict |
| --- | --- |
| stable unique id (<code>item.id</code>) | ✅ best |
| uuid generated once | ✅ ok |
| array index | ⚠️ only if list never reorders |
| <code>Math.random()</code> | ❌ remounts everything |

> **Interview tip:** Explain reconciliation: keys match items so React does minimal work and preserves state. The classic bug is **index keys** on a reorderable/insertable list. Bonus: a changing key forces a remount (state reset).`,
    examples: [
      {
        label: "Stable keys preserve per-row state",
        runnable: false,
        code: `import { useState } from "react";

export default function App() {
  const [items, setItems] = useState([
    { id: "a", name: "Ada" },
    { id: "b", name: "Grace" },
    { id: "c", name: "Lin" },
  ]);
  const shuffle = () => setItems((xs) => [...xs].reverse());

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={shuffle}>Reverse</button>
      <ul>
        {items.map((it) => (
          <li key={it.id}>                 {/* stable id, not index */}
            {it.name} <input placeholder="type then reverse" />
          </li>
        ))}
      </ul>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of 'composition' in React components.",
    answer: `**Core concept.** Composition means building complex UIs by **combining and nesting** small components — passing other components/markup via the <code>children</code> prop or named props — instead of using class inheritance. React explicitly favours **composition over inheritance** for reuse and customization.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Build UIs by nesting components via children</text>
  <rect x="120" y="40" width="280" height="96" rx="10" fill="#06b6d4" fill-opacity="0.07" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="58" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">&lt;Card&gt;</text>
  <rect x="150" y="66" width="100" height="56" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="200" y="90" fill="currentColor" font-size="9" text-anchor="middle">{children}</text>
  <text x="200" y="108" fill="currentColor" font-size="8" text-anchor="middle">&lt;Avatar /&gt;</text>
  <rect x="270" y="66" width="110" height="56" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="325" y="90" fill="currentColor" font-size="9" text-anchor="middle">{children}</text>
  <text x="325" y="108" fill="currentColor" font-size="8" text-anchor="middle">&lt;Profile /&gt;</text>
</svg>`)}

**How it works.** A generic container (a <code>Card</code>, <code>Modal</code>, <code>Layout</code>) renders whatever you put between its tags via <code>props.children</code>, so it stays reusable while callers supply the content. You can also pass elements through **named props** (a "slots" pattern: <code>header</code>, <code>sidebar</code>) and create **specialized** components by wrapping a generic one with preset props. This keeps components decoupled and flexible — the same reason React steers you away from inheritance, which couples a subclass to a base's internals. Composition also underpins HOCs and render props as logic-reuse patterns.

### Composition techniques
| Technique | How |
| --- | --- |
| <code>children</code> | render nested content |
| named-prop slots | <code>&lt;Layout header={…} /&gt;</code> |
| specialization | wrap a generic with preset props |
| component as prop | pass <code>&lt;Icon /&gt;</code> in |

> **Interview tip:** Quote React's guidance: "composition over inheritance." Lead with the <code>children</code> prop, then mention slots (named props) and specialization. It's why HOCs/render props/hooks exist for sharing behaviour.`,
    examples: [
      {
        label: "A reusable Card via children",
        runnable: false,
        code: `function Card({ title, children }) {     // generic container
  return (
    <section style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, margin: 8 }}>
      <h3>{title}</h3>
      {children}                            {/* whatever the caller nests */}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <Card title="Profile">
        <p>Ada Lovelace</p>
        <button>Follow</button>
      </Card>
      <Card title="Stats">
        <ul><li>Posts: 12</li><li>Followers: 340</li></ul>
      </Card>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Higher-Order Components (HOCs) in React?",
    answer: `**Core concept.** A Higher-Order Component is a **function that takes a component and returns a new, enhanced component** — <code>const Enhanced = withX(Component)</code>. It was the pre-hooks pattern for reusing cross-cutting logic (auth, data loading, logging) across many components. Today **custom hooks** usually do the same job more cleanly.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Wrap a component to inject shared behaviour</text>
  <rect x="40" y="58" width="120" height="44" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/>
  <text x="100" y="84" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">Component</text>
  <rect x="210" y="50" width="120" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/>
  <text x="270" y="78" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">withX( )</text>
  <text x="270" y="96" fill="currentColor" font-size="8" text-anchor="middle">adds props/logic</text>
  <rect x="380" y="58" width="120" height="44" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="440" y="78" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">Enhanced</text>
  <text x="440" y="94" fill="currentColor" font-size="8" text-anchor="middle">Component</text>
  <path d="M 160 80 L 208 80" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#hc-a)"/>
  <path d="M 330 80 L 378 80" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#hc-a)"/>
  <defs><marker id="hc-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** An HOC wraps the original component, supplies extra props or behaviour, and renders it — e.g. <code>withAuth</code>, <code>connect</code> (Redux), <code>withRouter</code>. Conventions matter: spread through unrelated props (<code>{...props}</code>), forward refs, and copy static methods, or you break the wrapped component. The downsides are real — deeply nested HOCs cause "wrapper hell" in the tree, prop-name collisions are easy, and the data flow gets indirect. Hooks solve the same reuse problem without adding tree nodes, which is why most new code uses a custom hook instead of an HOC.

### HOC vs custom hook
| | HOC | custom hook |
| --- | --- | --- |
| Shape | wraps a component | called inside a component |
| Adds tree nodes | yes (wrapper hell) | no |
| Prop collisions | possible | n/a |
| Today | legacy/libraries | preferred |

> **Interview tip:** Define it precisely ("component in → enhanced component out") and name real ones (<code>connect</code>, <code>withRouter</code>). Then volunteer that **hooks largely replaced HOCs**, avoiding wrapper hell and prop collisions.`,
    examples: [
      {
        label: "A withLoading HOC",
        runnable: false,
        code: `function withLoading(Component) {
  return function Wrapped({ isLoading, ...props }) {  // forward other props
    if (isLoading) return <p>Loading…</p>;
    return <Component {...props} />;
  };
}

function UserList({ users }) {
  return <ul>{users.map((u) => <li key={u}>{u}</li>)}</ul>;
}

const UserListWithLoading = withLoading(UserList);

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <UserListWithLoading isLoading={false} users={["Ada", "Grace"]} />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are render props and how do they work?",
    answer: `**Core concept.** A render prop is a **function passed as a prop** (often as <code>children</code>) that a component calls to let the *caller* decide what to render, while the component supplies the data/behaviour. Like HOCs, it's a pre-hooks pattern for sharing stateful logic — and like HOCs, **custom hooks** have largely replaced it.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Component owns the data; caller owns the UI</text>
  <rect x="30" y="50" width="200" height="62" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="130" y="74" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">&lt;Mouse&gt;</text>
  <text x="130" y="94" fill="currentColor" font-size="8.5" text-anchor="middle">tracks position (state)</text>
  <rect x="290" y="50" width="200" height="62" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="390" y="74" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">children(pos)</text>
  <text x="390" y="94" fill="currentColor" font-size="8.5" text-anchor="middle">caller renders with data</text>
  <path d="M 230 81 L 288 81" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <text x="259" y="73" fill="currentColor" font-size="8" text-anchor="middle">calls</text>
  <defs><marker id="rp-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Instead of rendering fixed markup, the component invokes <code>props.children(data)</code> (or a named <code>render</code> prop) and returns whatever the function gives back. This inverts control: the component encapsulates the *logic* (mouse position, a data subscription, a toggle) and hands the result to the consumer, who decides the *presentation*. It avoids the wrapper-hell of HOCs but can lead to deeply nested "callback pyramids" when several are combined. Hooks express the same idea — share logic, keep rendering local — without the nesting, so render props now mostly appear in older libraries.

### Render props vs the alternatives
| Pattern | Mechanism |
| --- | --- |
| render prop | pass a function that returns UI |
| HOC | wrap and return a component |
| custom hook | call a function returning data |

> **Interview tip:** Define it as "a function prop the component calls to delegate rendering," give the <code>&lt;Mouse&gt;{(pos) =&gt; …}&lt;/Mouse&gt;</code> shape, and note that **hooks superseded** both render props and HOCs for logic reuse (no nesting, no wrappers).`,
    examples: [
      {
        label: "A Toggle component with a render prop",
        runnable: false,
        code: `import { useState } from "react";

function Toggle({ children }) {       // children is a function (render prop)
  const [on, setOn] = useState(false);
  return children({ on, toggle: () => setOn((v) => !v) });
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Toggle>
        {({ on, toggle }) => (        // caller decides the UI from the data
          <button onClick={toggle}>{on ? "ON" : "OFF"}</button>
        )}
      </Toggle>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
