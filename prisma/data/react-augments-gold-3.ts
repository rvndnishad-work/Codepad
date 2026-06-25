/**
 * React Phase R1 — Batch 3 (State & data flow). Gold-standard rewrites.
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
    title: "Explain the concept of 'lifting state up' in React.",
    answer: `**Core concept.** When two or more components need to share or stay in sync over the same data, you move that state **up to their nearest common ancestor** and pass it down as props (with callbacks to update it). The parent becomes the **single source of truth**; the children become controlled by it.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Shared state moves to the common parent</text>
  <rect x="180" y="38" width="160" height="38" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="56" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">Parent — owns state</text>
  <text x="260" y="70" fill="currentColor" font-size="8.5" text-anchor="middle">single source of truth</text>
  <rect x="70" y="112" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="140" y="133" fill="currentColor" font-size="9" text-anchor="middle">Child A (value+onChange)</text>
  <rect x="310" y="112" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="380" y="133" fill="currentColor" font-size="9" text-anchor="middle">Child B (reads same)</text>
  <path d="M 230 76 L 150 110" fill="none" stroke="currentColor" stroke-width="1.3" marker-end="url(#ls-a)"/>
  <path d="M 290 76 L 370 110" fill="none" stroke="currentColor" stroke-width="1.3" marker-end="url(#ls-a)"/>
  <defs><marker id="ls-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Instead of duplicating state in two siblings (which then drift out of sync), the common parent holds it once and hands each child the current value plus a callback to change it. A child requesting a change calls the callback; the parent updates its state and re-renders both children with the new value — keeping them perfectly in sync. This is React's standard answer for sibling communication and is the natural precursor to Context/stores when the shared state needs to reach *far*-apart components.

### Lifting state up
| Step | What |
| --- | --- |
| Identify shared data | which components need it |
| Find common ancestor | their nearest shared parent |
| Move state there | one source of truth |
| Pass value + callback down | children become controlled |

> **Interview tip:** Phrase it as "single source of truth in the common parent; children get value + an update callback." Note that when the parent is too far up, this becomes prop drilling — the cue to reach for Context or a store.`,
    examples: [
      {
        label: "Two inputs sharing one lifted state",
        runnable: false,
        code: `import { useState } from "react";

function CelsiusInput({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="°C" />;
}

export default function App() {
  const [celsius, setCelsius] = useState("");      // lifted to the parent
  const fahrenheit = celsius === "" ? "" : (celsius * 9) / 5 + 32;
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <CelsiusInput value={celsius} onChange={setCelsius} />
      <p>= {fahrenheit === "" ? "—" : fahrenheit + " °F"}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of 'unidirectional data flow' in React.",
    answer: `**Core concept.** Data in React flows in **one direction**: parent → child via **props**. Children never write to their parent's data directly — they communicate **up** by calling **callback** props the parent provided. State lives in one place and updates flow downward, making the UI predictable and easy to trace.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Props flow down · events bubble up via callbacks</text>
  <rect x="180" y="38" width="160" height="36" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="61" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">Parent (state)</text>
  <rect x="190" y="112" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="260" y="133" fill="currentColor" font-size="9" text-anchor="middle">Child</text>
  <path d="M 235 74 L 235 110" fill="none" stroke="#06b6d4" stroke-width="1.6" marker-end="url(#ud-a)"/>
  <text x="200" y="96" fill="#06b6d4" font-size="8.5" text-anchor="end">props ↓</text>
  <path d="M 285 110 L 285 74" fill="none" stroke="#22c55e" stroke-width="1.6" marker-end="url(#ud-b)"/>
  <text x="320" y="96" fill="#22c55e" font-size="8.5">callback ↑</text>
  <defs>
    <marker id="ud-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#06b6d4"/></marker>
    <marker id="ud-b" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#22c55e"/></marker>
  </defs>
</svg>`)}

**How it works.** Because state has a single owner and only flows downward, any UI change traces back to one place — you debug by asking "which state changed and who owns it." A child that needs to affect shared data invokes a callback prop; the owner updates its state, and React re-renders the subtree with new props. This "one-way binding" contrasts with two-way binding (where views and models mutate each other), trading a little ceremony for far more predictability. It's also why **lifting state up** and Context fit naturally into the model.

### Direction of flow
| Direction | Mechanism |
| --- | --- |
| parent → child | props (data) |
| child → parent | callback props (events) |
| state change | re-render flows downward |

> **Interview tip:** Contrast with two-way binding (e.g. Angular's <code>ngModel</code>). The payoff line: one-way flow makes state changes predictable and traceable — you always know who owns the data and how it got updated.`,
    examples: [
      {
        label: "Child requests change via a callback",
        runnable: false,
        code: `import { useState } from "react";

function LikeButton({ count, onLike }) {     // receives data + callback (down)
  return <button onClick={onLike}>👍 {count}</button>; // calls up, never mutates
}

export default function App() {
  const [likes, setLikes] = useState(0);     // owner of the state
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <LikeButton count={likes} onLike={() => setLikes((n) => n + 1)} />
      <p>Total likes: {likes}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is 'prop drilling' and how can it be avoided?",
    answer: `**Core concept.** Prop drilling is passing data through **many intermediate components that don't use it**, just to reach a deeply nested child. It clutters components with props they only forward, and makes refactoring brittle. Fix it with **Context**, **component composition** (<code>children</code>), or a **state library**.

${card(`<svg viewBox="0 0 520 158" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Threading props through uninterested layers</text>
  <g font-size="9" text-anchor="middle">
    <rect x="30" y="48" width="90" height="30" rx="6" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="75" y="67" fill="currentColor">App (data)</text>
    <rect x="30" y="96" width="90" height="30" rx="6" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="75" y="115" fill="currentColor">Layout (forwards)</text>
  </g>
  <path d="M 75 78 L 75 94" stroke="#ef4444" stroke-width="1.4" marker-end="url(#pd-a)"/>
  <text x="150" y="92" fill="#ef4444" font-size="9">…through Page, Panel…</text>
  <path d="M 120 111 L 270 111" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#pd-a)"/>
  <rect x="290" y="96" width="100" height="30" rx="6" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="340" y="115" fill="currentColor" font-size="9" text-anchor="middle">deep Child uses it</text>
  <text x="260" y="146" fill="currentColor" font-size="9.5" text-anchor="middle">Context / composition lets the deep child read it directly</text>
  <defs><marker id="pd-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ef4444"/></marker></defs>
</svg>`)}

**How it works.** A little prop passing is normal and explicit (a virtue). It becomes "drilling" when intermediate components must accept and forward props purely as a relay. The cleanest fixes: **Context** broadcasts a value to any descendant via <code>useContext</code> (best for low-churn global-ish data like theme/auth); **composition** sidesteps it by passing the deep element as <code>children</code> from where the data lives, so the middle layers don't see the prop at all; and for large app state, a **store** (Redux/Zustand) lets components subscribe directly.

### Ways to avoid it
| Technique | Best for |
| --- | --- |
| Context | theme, auth, locale (low churn) |
| composition (<code>children</code>) | passing one element through layers |
| state library | large/shared app state |
| component colocation | keep state near where it's used |

> **Interview tip:** Note that *some* prop passing is healthy/explicit. Offer the trio — Context, composition, store — and call out **composition** as the underrated fix: pass the consumer as <code>children</code> so middle components never touch the prop.`,
    examples: [
      {
        label: "Composition removes the drilling",
        runnable: false,
        code: `import { useState } from "react";

// Layout doesn't know about 'user' — it just renders children
function Layout({ children }) {
  return <main style={{ padding: 16 }}>{children}</main>;
}
function Welcome({ user }) {
  return <h3>Welcome, {user}</h3>;
}

export default function App() {
  const [user] = useState("Ada");
  return (
    <div style={{ fontFamily: "system-ui" }}>
      {/* pass the consumer as children → no prop threaded through Layout */}
      <Layout>
        <Welcome user={user} />
      </Layout>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you pass data between components in React?",
    answer: `**Core concept.** It depends on the relationship. **Parent → child:** props. **Child → parent:** call a **callback** prop the parent passed. **Between siblings:** lift the state to their common parent. **Between distant components:** **Context** or an external **store**.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Pick the channel by component relationship</text>
  <g font-size="9.5">
    <rect x="20" y="40" width="232" height="26" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="57" fill="currentColor">parent → child : props</text>
    <rect x="20" y="72" width="232" height="26" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="89" fill="currentColor">child → parent : callback prop</text>
    <rect x="20" y="104" width="232" height="26" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="121" fill="currentColor">sibling ↔ sibling : lift state up</text>
  </g>
  <rect x="270" y="56" width="232" height="58" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/>
  <text x="386" y="80" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">distant / global</text>
  <text x="386" y="100" fill="currentColor" font-size="9" text-anchor="middle">Context or a store</text>
</svg>`)}

**How it works.** Props carry data down and are read-only in the child. To send information **up**, the parent passes a function prop (<code>onChange</code>, <code>onSelect</code>) that the child calls with the new value — the parent then updates its state. Siblings can't talk directly, so you **lift** the shared state to their nearest common parent and feed both via props. When components are far apart in the tree (or the data is truly global), threading props is painful — **Context** broadcasts to any descendant, and a store (Redux/Zustand) or a server-cache library (React Query) handles larger app/server state.

### Channel by relationship
| Relationship | Channel |
| --- | --- |
| parent → child | props |
| child → parent | callback prop |
| sibling ↔ sibling | lift state to common parent |
| distant / app-wide | Context / store |

> **Interview tip:** Map each relationship to its mechanism out loud. The two that score: child→parent is a **callback prop** (not direct mutation), and siblings communicate by **lifting state up** — Context/stores are for distance, not the default.`,
    examples: [
      {
        label: "Down via props, up via callback",
        runnable: false,
        code: `import { useState } from "react";

function Child({ label, onPick }) {          // data down (label), event up (onPick)
  return <button onClick={() => onPick(label)}>{label}</button>;
}

export default function App() {
  const [picked, setPicked] = useState("none");
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Child label="A" onPick={setPicked} />
      <Child label="B" onPick={setPicked} />
      <p>Picked: {picked}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you manage global state in a large React application?",
    answer: `**Core concept.** Match the tool to the data. **Context** suits low-churn global values (theme, auth, locale). For complex client state use a dedicated **store** (Redux Toolkit, Zustand, Jotai). For **server** data, prefer a data-fetching cache (React Query / SWR) rather than hand-rolling it into global state.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Different state, different tool</text>
  <rect x="18" y="44" width="156" height="100" rx="9" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="96" y="66" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">Context</text>
  <text x="96" y="90" fill="currentColor" font-size="9" text-anchor="middle">theme, auth, locale</text>
  <text x="96" y="110" fill="currentColor" font-size="9" text-anchor="middle">low update frequency</text>
  <rect x="184" y="44" width="156" height="100" rx="9" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="262" y="66" fill="#8b5cf6" font-size="10.5" font-weight="700" text-anchor="middle">Store</text>
  <text x="262" y="90" fill="currentColor" font-size="9" text-anchor="middle">Redux / Zustand / Jotai</text>
  <text x="262" y="110" fill="currentColor" font-size="9" text-anchor="middle">complex client state</text>
  <rect x="350" y="44" width="152" height="100" rx="9" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.4"/>
  <text x="426" y="66" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">Server cache</text>
  <text x="426" y="90" fill="currentColor" font-size="9" text-anchor="middle">React Query / SWR</text>
  <text x="426" y="110" fill="currentColor" font-size="9" text-anchor="middle">remote data</text>
</svg>`)}

**How it works.** The biggest mistake is treating *all* state as one bucket. **Server state** (data you fetch) needs caching, revalidation, and de-duplication — exactly what React Query/SWR provide, so it shouldn't live in Redux. **Client/UI state** that's genuinely global (cart, modals, filters) fits a store; modern stores like Zustand/Jotai are lighter than classic Redux and avoid Context's "re-render all consumers" problem via selectors. Reserve **Context** for stable, rarely-changing values. Also: keep state **colocated** — only promote to global what's actually shared; over-globalizing hurts performance and clarity.

### Choosing a tool
| State kind | Use |
| --- | --- |
| theme/auth/locale | Context |
| complex shared UI state | Zustand / Redux Toolkit / Jotai |
| fetched server data | React Query / SWR |
| local to one component | <code>useState</code>/<code>useReducer</code> |

> **Interview tip:** The senior point: **separate server state from client state** — don't put fetched data in Redux; use React Query. Mention Context's re-render caveat and that stores use selectors to subscribe narrowly.`,
    examples: [
      {
        label: "A tiny Context + useReducer store",
        runnable: false,
        code: `import { createContext, useContext, useReducer } from "react";

const StoreContext = createContext(null);
function reducer(s, a) { return a.type === "add" ? { count: s.count + 1 } : s; }

function StoreProvider({ children }) {
  const value = useReducer(reducer, { count: 0 });
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
function Counter() {
  const [state, dispatch] = useContext(StoreContext);
  return <button onClick={() => dispatch({ type: "add" })}>count: {state.count}</button>;
}

export default function App() {
  return (
    <StoreProvider>
      <div style={{ padding: 24, fontFamily: "system-ui" }}><Counter /></div>
    </StoreProvider>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Why must React state updates be immutable?",
    answer: `**Core concept.** React decides whether to re-render by comparing the **previous and next state by reference** (<code>Object.is</code>). If you **mutate** the existing object/array, the reference is unchanged, so React thinks nothing happened and skips the update. Always produce a **new** object/array instead of editing in place.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Same reference → no re-render · new reference → render</text>
  <rect x="20" y="46" width="230" height="100" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="66" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">mutate ✗</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">state.tags.push(x)</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">ref unchanged → Object.is true</text>
  <text x="135" y="132" fill="#ef4444" font-size="9" text-anchor="middle">React bails out, no render</text>
  <rect x="270" y="46" width="230" height="100" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="66" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">new object ✓</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">{...state, tags:[...]}</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">new ref → change detected</text>
  <text x="385" y="132" fill="#22c55e" font-size="9" text-anchor="middle">re-renders correctly</text>
</svg>`)}

**How it works.** React (and <code>React.memo</code>/<code>useMemo</code>) relies on cheap **referential** comparison to know what changed — it doesn't deep-compare. Mutating state in place keeps the same reference, so memoized children and the component itself may not update, producing stale UI. Immutability also enables predictable debugging, time-travel in Redux DevTools, and safe concurrent rendering. Create new values with spread (<code>{...obj}</code>, <code>[...arr]</code>) or non-mutating methods (<code>map</code>, <code>filter</code>, <code>concat</code>) — never <code>push</code>/<code>splice</code>/direct assignment on state. For deep updates, libraries like Immer let you write "mutating" code that produces an immutable copy.

### Mutating vs immutable updates
| Goal | ❌ mutating | ✅ immutable |
| --- | --- | --- |
| add to array | <code>arr.push(x)</code> | <code>[...arr, x]</code> |
| update field | <code>obj.k = v</code> | <code>{...obj, k: v}</code> |
| remove item | <code>arr.splice(i,1)</code> | <code>arr.filter(...)</code> |

> **Interview tip:** The mechanism is the answer: React compares by **reference** (<code>Object.is</code>), so mutation is invisible to it. Mention spread/non-mutating methods, and Immer for deep updates.`,
    examples: [
      {
        label: "Immutable update triggers the render",
        runnable: false,
        code: `import { useState } from "react";

export default function App() {
  const [user, setUser] = useState({ name: "Ada", tags: ["js"] });

  // ✅ new objects/arrays → React detects the change
  const addTag = () =>
    setUser((u) => ({ ...u, tags: [...u.tags, "react"] }));

  // ❌ would NOT re-render (same reference):
  //   user.tags.push("react"); setUser(user);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>{user.name}: {user.tags.join(", ")}</p>
      <button onClick={addTag}>Add tag</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between controlled and uncontrolled components?",
    answer: `**Core concept.** In a **controlled** component, React state is the single source of truth for a form input — you set its <code>value</code> and update state in <code>onChange</code>. In an **uncontrolled** component, the **DOM** holds the value and you read it when needed via a <code>ref</code> (with an optional <code>defaultValue</code>).

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">React state vs the DOM as source of truth</text>
  <rect x="20" y="46" width="230" height="100" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="66" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">controlled</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">value={state} onChange</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">React owns the value</text>
  <text x="135" y="132" fill="#06b6d4" font-size="9" text-anchor="middle">live validation, formatting</text>
  <rect x="270" y="46" width="230" height="100" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="66" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">uncontrolled</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">defaultValue + ref</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">DOM owns the value</text>
  <text x="385" y="132" fill="#8b5cf6" font-size="9" text-anchor="middle">simpler, read on submit</text>
</svg>`)}

**How it works.** A controlled input renders whatever its state says and reports every keystroke to <code>onChange</code>, so React always has the current value — enabling instant validation, conditional disabling, input masking, and a clear single source of truth. An uncontrolled input lets the browser manage its own value; you grab it imperatively via a ref (commonly on submit), which is less code for simple forms and integrates with non-React widgets or file inputs (<code>&lt;input type="file"&gt;</code> is always uncontrolled). Most apps prefer controlled; uncontrolled is a pragmatic shortcut.

### Controlled vs uncontrolled
| | controlled | uncontrolled |
| --- | --- | --- |
| Value lives in | React state | the DOM |
| Read value via | state | a <code>ref</code> |
| Set initial value | <code>value</code> | <code>defaultValue</code> |
| Best for | validation, dynamic forms | simple forms, file inputs |

> **Interview tip:** "Controlled = React state drives the input via <code>value</code>+<code>onChange</code>; uncontrolled = the DOM holds it, read with a ref." Note <code>&lt;input type="file"&gt;</code> is always uncontrolled, and warn against switching an input between the two (controlled/uncontrolled warning).`,
    examples: [
      {
        label: "Controlled and uncontrolled side by side",
        runnable: false,
        code: `import { useState, useRef } from "react";

export default function App() {
  const [name, setName] = useState("");      // controlled
  const ageRef = useRef(null);               // uncontrolled

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (controlled)" />
      <input ref={ageRef} defaultValue="18" placeholder="age (uncontrolled)" />
      <button onClick={() => alert(name + " / " + ageRef.current.value)}>Submit</button>
      <p>Live name: {name}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle forms in React?",
    answer: `**Core concept.** Manage inputs as **controlled** components (state + <code>onChange</code>) or **uncontrolled** (refs), handle submission with an <code>onSubmit</code> that calls <code>e.preventDefault()</code>, and validate in the handler. React 19 adds **Actions** (<code>&lt;form action={fn}&gt;</code> + <code>useActionState</code>) for built-in pending/error handling; for complex forms, libraries like React Hook Form reduce re-renders and boilerplate.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Inputs → submit handler → validate → action</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="24" y="58" width="100" height="40" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="74" y="76" fill="currentColor">inputs</text><text x="74" y="90" fill="currentColor" font-size="8">state/ref</text>
    <rect x="160" y="58" width="120" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="220" y="76" fill="currentColor">onSubmit</text><text x="220" y="90" fill="currentColor" font-size="8">preventDefault</text>
    <rect x="316" y="58" width="100" height="40" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="366" y="76" fill="currentColor">validate</text>
    <rect x="448" y="58" width="50" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="473" y="80" fill="currentColor">submit</text>
  </g>
  <path d="M 124 78 L 158 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#fm-a)"/>
  <path d="M 280 78 L 314 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#fm-a)"/>
  <path d="M 416 78 L 446 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#fm-a)"/>
  <defs><marker id="fm-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The classic approach binds each field to state and intercepts <code>onSubmit</code> with <code>preventDefault</code> to stop the browser's full-page reload, then validates and sends the data (e.g. via <code>fetch</code>). For many fields, a single state object with one change handler (keyed by <code>name</code>) keeps it tidy. React 19's form **Actions** let you pass an async function to a form's <code>action</code> and read pending/result/error state with <code>useActionState</code> and <code>useFormStatus</code> — less manual wiring. For large forms, React Hook Form uses uncontrolled inputs + refs to minimize re-renders.

### Form approaches
| Approach | Notes |
| --- | --- |
| controlled + <code>onSubmit</code> | full control, easy validation |
| uncontrolled + refs | less code, read on submit |
| React 19 Actions | built-in pending/error state |
| React Hook Form | perf + validation for big forms |

> **Interview tip:** Always mention <code>e.preventDefault()</code> on submit and the single-handler pattern (key by <code>name</code>). Bonus depth: React 19 form **Actions** + <code>useActionState</code>/<code>useFormStatus</code> for pending UI, and React Hook Form for performance.`,
    examples: [
      {
        label: "Controlled form with one change handler",
        runnable: false,
        code: `import { useState } from "react";

export default function App() {
  const [form, setForm] = useState({ name: "", email: "" });
  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value })); // key by name

  const onSubmit = (e) => {
    e.preventDefault();                       // stop the page reload
    if (!form.email.includes("@")) return alert("invalid email");
    alert("submitted: " + JSON.stringify(form));
  };

  return (
    <form onSubmit={onSubmit} style={{ padding: 24, fontFamily: "system-ui" }}>
      <input name="name" value={form.name} onChange={onChange} placeholder="name" />
      <input name="email" value={form.email} onChange={onChange} placeholder="email" />
      <button type="submit">Send</button>
    </form>
  );
}`,
      },
    ],
  },
];

export default augments;
