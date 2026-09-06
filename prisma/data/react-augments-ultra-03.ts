/**
 * React "ultra" rewrite — batch 03 (remaining fundamentals + JSX/components).
 *
 * Same conventions as react-augments-ultra-01.ts. Verified material in this
 * batch was produced by executing code against React 19.2.8 in this repo, plus
 * a real JSX compile through the project's own bundler toolchain (oxc via vite),
 * which is where the compiled-output listings come from.
 *
 * Highlights worth keeping consistent if these are edited:
 *   - JSX compiles to jsx()/jsxs() from react/jsx-runtime, and `key` is passed
 *     as the THIRD argument, not inside props. That is the mechanical reason
 *     props.key does not exist.
 *   - Composition measured: a child rendered inside a stateful parent re-rendered
 *     3 times over mount + 2 clicks; the same child passed as `children`
 *     rendered once.
 *   - Memory leak measured: 3 mount/unmount cycles left 3 listeners attached
 *     without cleanup, 0 with it.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is JSX?",
    seoDescription:
      "JSX is syntax sugar compiled to plain function calls. Verified: it becomes jsx()/jsxs() from react/jsx-runtime, and it escapes interpolated values.",
    description: `**Question presented to candidate:**
"What is JSX, and what actually happens to it before the browser runs your code?"

**What a strong answer should cover:**
- JSX is an **XML-like syntax extension to JavaScript**, not HTML and not a template language.
- Browsers cannot run it — a compiler (Babel, SWC, oxc, TypeScript) turns it into plain function calls at build time.
- Under the **modern automatic runtime** it compiles to \`jsx()\` / \`jsxs()\` auto-imported from \`react/jsx-runtime\`; the older classic runtime compiled to \`React.createElement\` and required \`React\` to be in scope.
- The calls return **elements** — plain objects — so JSX produces data, it does not render anything.
- Capitalisation matters: lowercase names compile to strings (host elements), capitalised ones to the identifier itself.
- It is an **expression**, so it can be assigned to variables, returned, and put in arrays.
- Attribute differences: \`className\`, \`htmlFor\`, camelCased event handlers, \`style\` as an object.
- Security: interpolated values are **escaped**, which is why \`dangerouslySetInnerHTML\` has to exist and is named that way.
- Depth signal: \`key\` is compiled to a separate argument, not into props — which is why \`props.key\` does not exist.

**Clarifying questions expected:**
- "Do you want the syntax rules, or what it compiles to?"

**Code / implementation expected:** Optional, but showing the compiled output next to the source is the strongest version of this answer.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes JavaScript basics, no React required.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The compiled output in section 3 was produced by actually running a JSX source file through this project bundler toolchain, and the escaping behaviour in section 5 by rendering it in React 19.2.8.

## 1. Why This Even Matters — A Story First

Musical notation is not music. It is a written shorthand that a performer converts into sound. Nobody claims the page *is* the symphony — but writing the symphony directly as air-pressure waveforms would be unbearable, so we use the notation.

JSX is notation. It looks like HTML because UI trees are shaped like HTML, and reading nested function calls is unbearable. A compiler converts it to those function calls before the browser ever sees it.

## 2. The Core Idea

📌 **Interview term: JSX** — a **syntax extension to JavaScript** that lets you write XML-like markup inside your code. It is not HTML, not a string, and not a template language. It has no runtime of its own: a build step converts it into ordinary function calls.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="JSX source is compiled to jsx function calls which return element objects rendered by react-dom">
  <defs>
    <marker id="jx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">JSX never reaches the browser</text>
  <rect class="d-box-accent" x="16" y="52" width="150" height="84" rx="10"/>
  <text class="d-text d-accent" x="91" y="80" text-anchor="middle">JSX source</text>
  <text class="d-sub" x="91" y="102" text-anchor="middle">what you write</text>
  <text class="d-sub" x="91" y="122" text-anchor="middle">build time only</text>
  <path class="d-edge" d="M 172 94 L 196 94" marker-end="url(#jx-arrow)"/>
  <rect class="d-box" x="202" y="52" width="150" height="84" rx="10"/>
  <text class="d-text" x="277" y="80" text-anchor="middle">compiler</text>
  <text class="d-sub" x="277" y="102" text-anchor="middle">Babel, SWC, oxc</text>
  <text class="d-sub" x="277" y="122" text-anchor="middle">or TypeScript</text>
  <path class="d-edge" d="M 358 94 L 382 94" marker-end="url(#jx-arrow)"/>
  <rect class="d-box" x="388" y="52" width="150" height="84" rx="10"/>
  <text class="d-text" x="463" y="80" text-anchor="middle">jsx() calls</text>
  <text class="d-sub" x="463" y="102" text-anchor="middle">plain JavaScript</text>
  <text class="d-sub" x="463" y="122" text-anchor="middle">react/jsx-runtime</text>
  <path class="d-edge" d="M 544 94 L 568 94" marker-end="url(#jx-arrow)"/>
  <rect class="d-box-muted" x="574" y="52" width="72" height="84" rx="10"/>
  <text class="d-text" x="610" y="86" text-anchor="middle">element</text>
  <text class="d-sub" x="610" y="108" text-anchor="middle">an object</text>
</svg>

Only the last box exists at runtime, and it is just data. Nothing has touched the DOM yet.

## 3. Verified: what JSX actually compiles to

This source was run through the compiler this project uses:

\`\`\`jsx
function Greeting({ name, items }) {
  return (
    <h1 className="hi">
      Hello {name}
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </h1>
  );
}
\`\`\`

Actual compiled output:

\`\`\`js
var _reactJsxRuntime = require("react/jsx-runtime");
function Greeting({ name, items }) {
  return /* @__PURE__ */ _reactJsxRuntime.jsxs("h1", {
    className: "hi",
    children: [
      "Hello ",
      name,
      /* @__PURE__ */ _reactJsxRuntime.jsx("ul", {
        children: items.map((i) => /* @__PURE__ */ _reactJsxRuntime.jsx("li", { children: i }, i))
      })
    ]
  });
}
\`\`\`

Four things worth reading straight off that output — each is a follow-up question waiting to happen:

- **<code>jsxs</code> versus <code>jsx</code>.** The plural form is used when children are a static array; the singular for a single child. It is a small optimisation, not two different concepts.
- **<code>react/jsx-runtime</code> was imported automatically.** Confirmed on React 19.2.8, that module exports <code>jsx</code>, <code>jsxs</code>, and <code>Fragment</code>. This is why modern React code no longer needs <code>import React from "react"</code> at the top of every file.
- **<code>key</code> became the third argument** — <code>jsx("li", { children: i }, i)</code>. It is passed *beside* props, not inside them.
- **<code>children</code> is an ordinary prop.** Nesting in JSX is just a nicer way of writing a <code>children</code> key.

📌 **Interview term:** the **automatic runtime** (React 17 and later) auto-imports the JSX functions. The older **classic runtime** compiled to <code>React.createElement</code> and required <code>React</code> to be in lexical scope — the reason for that once-mandatory unused-looking import.

## 4. Why <code>props.key</code> does not exist

Because <code>key</code> is compiled to a separate argument, it never lands in the props object. A component genuinely cannot read its own key. If you need the value, pass it twice:

\`\`\`jsx
<Row key={row.id} id={row.id} />
\`\`\`

That is not a workaround for a quirk — <code>key</code> belongs to React reconciliation machinery, not to your component API.

## 5. Verified: JSX escapes interpolated values

\`\`\`jsx
const evil = '<img src=x onerror="alert(1)">';
render(<div>{evil}</div>);
\`\`\`

Actual DOM produced:

\`\`\`
rendered innerHTML: <div>&lt;img src=x onerror="alert(1)"&gt;</div>
did an <img> element get created? false
\`\`\`

📌 **Interview term:** everything interpolated with <code>{}</code> is **escaped to text** before insertion. React treats interpolated values as content, never as markup — which is why rendering user input is safe by default, and why bypassing it requires the deliberately alarming <code>dangerouslySetInnerHTML</code>.

## 6. The syntax rules that trip people up

| JSX | HTML | Why |
| :--- | :--- | :--- |
| <code>className</code> | <code>class</code> | <code>class</code> is a reserved word |
| <code>htmlFor</code> | <code>for</code> | <code>for</code> is a reserved word |
| <code>onClick</code> | <code>onclick</code> | Props are camelCase |
| <code>style={{color: "red"}}</code> | <code>style="color:red"</code> | An object, not a string |
| <code>&lt;br /&gt;</code> | <code>&lt;br&gt;</code> | Every tag must be closed |
| One root element | Any number | A function returns one value |

That last row is what <a href="PASTE_FRAGMENTS_URL_HERE" target="_blank" rel="noopener noreferrer">Fragments</a> exist to solve.

## 7. Common Pitfalls

- **Calling JSX "HTML in JavaScript".** It is JavaScript syntax that *resembles* HTML and compiles to function calls.
- **Expecting <code>props.key</code> to work.** Verified above: <code>key</code> compiles to a separate argument.
- **Using <code>class</code> or <code>for</code>.** Reserved words; use <code>className</code> and <code>htmlFor</code>.
- **Rendering <code>false</code>, <code>null</code>, or <code>undefined</code> and expecting output.** They render nothing — but <code>0</code> renders as "0", which is why <code>{items.length && &lt;List /&gt;}</code> prints a stray 0 on an empty array. Use a ternary or <code>&gt; 0</code>.
- **Forgetting JSX is an expression.** You can assign it, return it early, and put it in an array — no need for awkward nested ternaries.
- **Adding <code>import React from "react"</code> out of habit.** Unnecessary since React 17 under the automatic runtime.
- **Reaching for <code>dangerouslySetInnerHTML</code> to render a string with markup.** It disables the escaping verified above. Sanitise first, or restructure.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it precisely:</strong> <span style="color:#f0e2c8;">"A syntax extension to JavaScript that looks like markup. It is not HTML and not a template language — a compiler turns it into plain function calls at build time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say what it compiles to:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsxs()</code> auto-imported from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react/jsx-runtime</code> under the modern transform — the classic one used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.createElement</code> and needed React in scope."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Note what comes back:</strong> <span style="color:#f0e2c8;">"Those calls return elements — plain objects. JSX produces data; it does not render anything by itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention escaping unprompted:</strong> <span style="color:#f0e2c8;">"Anything interpolated with braces is escaped to text, so rendering user input is safe by default — that is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> has that name."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The detail that lands:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> compiles to a separate argument rather than into props — which is exactly why a component cannot read its own key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do modern files not need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import React from "react"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The automatic runtime, introduced in React 17, makes the compiler insert its own import of <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react/jsx-runtime</code>. The classic transform compiled to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React.createElement</code>, so <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React</code> had to be a real binding in the file even when it looked unused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you read a component own <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It compiles to a separate argument on the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx()</code> call, so it never enters props. Pass it a second time as a normal prop if you need the value. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> was historically the same; in React 19 <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> is a regular prop but <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> still is not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is JSX safe against XSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Interpolated values are escaped to text, so <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;div&gt;{userInput}&lt;/div&gt;</code> cannot inject an element. It is not blanket immunity though — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> opts out, and a user-controlled <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code> can still carry a <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">javascript:</code> URL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{items.length && &lt;List /&gt;}</code> print a 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On an empty array the expression evaluates to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, and React renders <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> as text — unlike <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, which render nothing. Use <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">items.length &gt; 0 && ...</code> or a ternary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you have to use JSX?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — you can call <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">createElement</code> or the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx</code> functions directly, which is what a no-build-step setup does. Nobody chooses it for application code, because deeply nested calls are far harder to read than the markup they represent.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **JSX** | XML-like syntax extension to JavaScript, compiled away at build time |
| **Automatic runtime** | React 17+ transform auto-importing <code>react/jsx-runtime</code> |
| **Classic runtime** | The older transform emitting <code>React.createElement</code> |
| **<code>jsx</code> / <code>jsxs</code>** | The emitted functions; the plural form takes a static child array |
| **Element** | The plain object those functions return |
| **<code>dangerouslySetInnerHTML</code>** | The deliberate opt-out from JSX escaping |

---
**Conclusion:** JSX is a syntax extension compiled to plain JavaScript before the browser sees it — verified here as <code>jsx()</code> and <code>jsxs()</code> calls auto-imported from <code>react/jsx-runtime</code>, returning element objects rather than rendering anything. Two details carry an answer past the surface: interpolated values are escaped to text, which is what makes rendering user content safe by default; and <code>key</code> is emitted as a separate argument rather than a prop, which is precisely why a component can never read its own key.`,
    examples: [
      {
        label: "JSX is an expression, values are escaped, and 0 is not falsy enough",
        runnable: true,
        code: `import { useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);
  const evil = '<img src=x onerror="alert(1)">';

  // JSX is an EXPRESSION: assign it, store it in an array, return it early.
  const badge = <span style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}>badge</span>;
  const rows = ["alpha", "beta"].map((t) => <li key={t}>{t}</li>);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h3>Interpolated values are escaped</h3>
      {/* Renders as literal text — no <img> element is created, so the
          onerror handler can never fire. */}
      <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>{evil}</p>

      <h3>JSX is just a value</h3>
      <p>Here is a {badge} stored in a variable.</p>
      <ul>{rows}</ul>

      <h3>The classic 0 bug</h3>
      <p>
        {/* ❌ On an empty array this renders a stray "0" */}
        Wrong: [{items.length && <strong>has items</strong>}]
      </p>
      <p>
        {/* ✅ Force a real boolean */}
        Right: [{items.length > 0 && <strong>has items</strong>}]
      </p>
      <button onClick={() => setItems(items.length ? [] : ["one"])}>
        Toggle items (currently {items.length})
      </button>

      <p style={{ color: "#666", fontSize: 13 }}>
        With the list empty, the first line shows a 0 and the second shows
        nothing. React renders 0 as text; false, null and undefined render nothing.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React Components?",
    seoDescription:
      "A component is a reusable function taking props and returning UI. Function components have no instance, and reuse comes from composition not inheritance.",
    description: `**Question presented to candidate:**
"What is a component in React, and what makes something a good one?"

**What a strong answer should cover:**
- A component is a **reusable, self-contained piece of UI**: a function that takes **props** and returns a description of what to render.
- Naming rule: must start with a **capital letter**, because lowercase JSX names compile to host-element strings.
- **Function components** are the modern default; **class components** are legacy but still supported and still required for Error Boundaries.
- Function components have **no instance** — there is no \`this\`; state lives in Hooks keyed by call order.
- **Props are read-only.** A component must never mutate them.
- **Purity**: given the same props and state, a component should return the same output and cause no side effects during render.
- Reuse is by **composition**, not inheritance — React has no component inheritance story at all.
- Components can return arrays, strings, numbers, \`null\`, and Fragments — not just a single element.

**Clarifying questions expected:**
- "Function or class — is this a legacy codebase?"
- "Do you want the definition, or how I decide where to draw component boundaries?"

**Code / implementation expected:** Yes — a small component taking props, plus one composing another.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes JavaScript functions, no React required.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The instance and prototype claims in section 4 were produced by inspecting real components on React 19.2.8.

## 1. Why This Even Matters — A Story First

Think about LEGO. A brick is small, does one thing, and — crucially — has a standard connector. You do not build a castle by carving one enormous block; you build it from bricks that snap together, and you can swap a red brick for a blue one without disturbing anything around it.

A component is that brick. The connector is **props**. A UI is assembled from components the way a castle is assembled from bricks, and the reason both work is that the pieces do not need to know what they are part of.

## 2. The Core Idea

📌 **Interview term: Component** — a reusable, self-contained piece of UI. In modern React it is a **function** that receives a single **props** object and returns a description of what should appear.

\`\`\`jsx
function Welcome({ name }) {
  return <h1>Hello, {name}</h1>;
}
\`\`\`

📌 **Interview term: Props** — the inputs a parent passes down. They are **read-only**: a component may read them but must never assign to them. That one-way contract is what makes a component safe to reuse anywhere.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Props flow down into a component which returns UI, and events flow back up">
  <defs>
    <marker id="cp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Props in, UI out, events back up</text>
  <rect class="d-box-muted" x="30" y="70" width="150" height="60" rx="10"/>
  <text class="d-text" x="105" y="94" text-anchor="middle">props</text>
  <text class="d-sub" x="105" y="114" text-anchor="middle">read-only inputs</text>
  <path class="d-edge-accent" d="M 186 100 L 244 100" marker-end="url(#cp-arrow)"/>
  <rect class="d-box-accent" x="250" y="56" width="160" height="88" rx="10"/>
  <text class="d-text d-accent" x="330" y="84" text-anchor="middle">Component</text>
  <text class="d-sub" x="330" y="106" text-anchor="middle">a function</text>
  <text class="d-sub" x="330" y="126" text-anchor="middle">plus its own state</text>
  <path class="d-edge-accent" d="M 416 100 L 474 100" marker-end="url(#cp-arrow)"/>
  <rect class="d-box-muted" x="480" y="70" width="150" height="60" rx="10"/>
  <text class="d-text" x="555" y="94" text-anchor="middle">UI description</text>
  <text class="d-sub" x="555" y="114" text-anchor="middle">elements</text>
  <path class="d-edge-dashed" d="M 480 158 L 190 158" marker-end="url(#cp-arrow)"/>
  <text class="d-sub" x="335" y="180" text-anchor="middle">callbacks travel back up</text>
</svg>

Data goes one way; the only route back up is a callback the parent passed down. That is the whole contract.

## 3. Function components versus class components

| | Function component | Class component |
| :--- | :--- | :--- |
| Syntax | A plain function | <code>extends React.Component</code> |
| State | <code>useState</code>, <code>useReducer</code> | <code>this.state</code>, <code>this.setState</code> |
| Side effects | <code>useEffect</code> | Lifecycle methods |
| <code>this</code> | None | Bound instance |
| Instance | **None** | One per mounted element |
| Status | The modern default | Legacy, still supported |
| Still required for | — | **Error Boundaries** |

📌 **Interview term:** Error Boundaries are the one thing function components still cannot do — <code>getDerivedStateFromError</code> and <code>componentDidCatch</code> have no Hook equivalent, so a class (or a wrapper library) is unavoidable there.

## 4. Verified: a function component has no instance

\`\`\`js
function Fn() { return null; }
class Cls extends React.Component { render() { return null; } }
\`\`\`

\`\`\`
Fn.prototype.isReactComponent  : false
Cls.prototype.isReactComponent : true
\`\`\`

That flag is how React itself decides how to invoke your component: construct an instance and call <code>render()</code>, or simply call the function. It is also the concrete reason there is no <code>this</code> in a function component — there is nothing to be <code>this</code>. State is not stored on an object you own; React keeps it in its internal fiber, matched to your component by **the order your Hooks are called**.

## 5. The rules a component must follow

📌 **Interview term: purity** — for the same props and state, a component must return the same output, and must not touch anything outside itself while rendering. No fetching, no DOM writes, no mutating a variable defined elsewhere. Effects and event handlers exist for all of that.

React genuinely depends on this: it may call your component more than once for a single update, discard the result, or re-run it later. <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> deliberately double-invokes render in development to catch violations.

The other rules:

- **Capitalise the name.** Lowercase compiles to a host-element string.
- **Never mutate props.** Ask the parent for a callback instead.
- **Call Hooks unconditionally, at the top level.** Order is the identity.
- **Return something renderable.** An element, string, number, array, Fragment, or <code>null</code>.

## 6. Composition, not inheritance

React has **no component inheritance model**, deliberately. You never extend a <code>Button</code> to make a <code>PrimaryButton</code>. Instead you compose:

- **Props** for configuration
- **<code>children</code>** for arbitrary nested content
- **Custom Hooks** for shared *behaviour*
- **Wrapper components** for shared *structure*

See <a href="PASTE_COMPOSITION_URL_HERE" target="_blank" rel="noopener noreferrer">composition</a> for the mechanics and the measurable performance benefit.

## 7. Common Pitfalls

- **Lowercase component names.** <code>&lt;myButton /&gt;</code> compiles to the string <code>"myButton"</code> and React looks for an unknown HTML tag.
- **Mutating props.** <code>props.items.push(x)</code> corrupts the parent state and skips the re-render, because React compares by reference.
- **Side effects during render.** Fetching or writing to the DOM in the component body breaks under StrictMode and concurrent rendering.
- **Defining a component inside another component.** It becomes a new function identity every render, so React unmounts and remounts the whole subtree, destroying its state.
- **Reaching for inheritance.** There is no supported story; use composition.
- **Splitting too early.** A component per element is as unhelpful as one giant component. Split when a piece is reused, or when it owns state that nothing else needs.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A reusable, self-contained piece of UI — a function that takes props and returns a description of what to render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Function versus class:</strong> <span style="color:#f0e2c8;">"Functions with Hooks are the default now. Classes are legacy but still supported — and still the only way to write an Error Boundary."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the contract:</strong> <span style="color:#f0e2c8;">"Props are read-only and flow one way. The only route back up is a callback the parent passed down."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring up purity unprompted:</strong> <span style="color:#f0e2c8;">"Render has to be pure — same props and state, same output, no side effects — because React may call it more than once or throw the result away."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on composition:</strong> <span style="color:#f0e2c8;">"Reuse is by composition — props, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>, and custom Hooks. React has no inheritance model on purpose."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must a component name be capitalised?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSX compiles a lowercase name to a string and a capitalised one to the identifier. So <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;welcome /&gt;</code> becomes <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">type: "welcome"</code> and React looks for an HTML tag by that name instead of calling your function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are class components deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not deprecated, but no longer recommended — they still work and there is no removal planned. New code uses functions and Hooks. The one genuine exception is Error Boundaries, which have no Hook equivalent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you define a component inside another component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is redefined on every render, so its element <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is a different function each time. React sees a different component, unmounts the old subtree and mounts a new one — losing all its state and refiring its effects. Define components at module level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component return something other than JSX?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a string, a number, an array of elements, a Fragment, or <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> to render nothing. Returning <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> is perfectly normal; the component still mounts and its Hooks still run, it just produces no output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decide where to split a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a piece is genuinely reused, when it owns state nothing else needs, or when the file has grown past what you can hold in your head. Splitting purely for line count produces a maze of one-line components that is harder to follow than what it replaced.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Component** | A function taking props and returning a UI description |
| **Props** | Read-only inputs passed from a parent |
| **Function component** | The modern default; no instance, state via Hooks |
| **Class component** | Legacy; has an instance and lifecycle methods |
| **Purity** | Same inputs, same output, no side effects during render |
| **Composition** | Building from smaller components rather than inheriting |

---
**Conclusion:** a React component is a reusable function that takes read-only props and returns a description of UI. Function components are the modern default and — verified against React 19.2.8 — have no instance at all, which is why there is no <code>this</code> and why Hook call order is what identifies your state. The rules that actually matter in an interview are that render must be pure, props must never be mutated, and reuse comes from composition rather than inheritance, which React deliberately does not support.`,
    examples: [
      {
        label: "Props in, callbacks up, and composition via children",
        runnable: true,
        code: `import { useState } from "react";

// A presentational component: props in, UI out, no state of its own.
// It knows nothing about where it is used — that is what makes it reusable.
function Avatar({ name, size = 40 }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#4f46e5",
      color: "white", display: "grid", placeItems: "center", fontSize: size / 2.5,
    }}>
      {initials}
    </div>
  );
}

// A component taking a CALLBACK — the only way data travels back up.
// Note it never mutates props; it calls what the parent handed it.
function UserRow({ user, onSelect }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <Avatar name={user.name} size={32} />
      <span style={{ flex: 1 }}>{user.name}</span>
      <button onClick={() => onSelect(user.id)}>select</button>
    </li>
  );
}

// A component composing arbitrary content through the children prop — the
// generic slot that makes wrappers reusable without knowing what goes inside.
function Card({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <h4 style={{ margin: "0 0 10px" }}>{title}</h4>
      {children}
    </section>
  );
}

const USERS = [
  { id: 1, name: "Ada Lovelace" },
  { id: 2, name: "Grace Hopper" },
  { id: 3, name: "Alan Turing" },
];

export default function App() {
  const [selected, setSelected] = useState(null);
  const chosen = USERS.find((u) => u.id === selected);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 420 }}>
      <Card title="Team">
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {USERS.map((u) => (
            <UserRow key={u.id} user={u} onSelect={setSelected} />
          ))}
        </ul>
      </Card>

      {/* The same Card wrapper, completely different children */}
      <Card title="Selection">
        {chosen ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={chosen.name} size={48} />
            <strong>{chosen.name}</strong>
          </div>
        ) : (
          <em style={{ color: "#666" }}>Nothing selected yet.</em>
        )}
      </Card>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are fragments in React?",
    seoDescription:
      "A Fragment groups children without adding a DOM node. Verified: two spans in a Fragment produce two direct children; a div wrapper produces one.",
    description: `**Question presented to candidate:**
"A component needs to return two sibling elements. What are your options, and why would you reach for a Fragment?"

**What a strong answer should cover:**
- A component returns **one value**, so multiple siblings need a single parent — a Fragment is that parent without the DOM cost.
- A Fragment renders **no DOM node at all**; children land directly in the parent element.
- Two syntaxes: the shorthand \`<>...</>\` and the explicit \`<Fragment>...</Fragment>\`.
- **The shorthand cannot take a \`key\`.** Mapping over a list that emits sibling pairs requires the long form.
- Why the wrapper div actually matters: it breaks CSS layout contracts (flex/grid parent-child relationships), produces invalid HTML inside \`<table>\`, \`<dl>\`, \`<ul>\`, and adds depth to the DOM.
- \`Fragment\` is exported from both \`react\` and \`react/jsx-runtime\` — the same symbol.
- Nuance: Fragments accept only \`key\` and \`children\`; no \`className\`, no \`style\`, no ref.

**Clarifying questions expected:**
- "Is this inside a list where each item emits multiple siblings?" — that decides shorthand versus long form.

**Code / implementation expected:** Yes — a keyed Fragment inside a \`map\` is the case worth showing.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic JSX.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The DOM output in section 3 was produced by rendering both versions in React 19.2.8 and reading back the real HTML.

## 1. Why This Even Matters — A Story First

You need to post three documents. The post office insists on one item, so you put them in an envelope. Fine — except the recipient files documents in a cabinet with slots sized to a sheet of paper, and now everything arrives inside an envelope that does not fit the slots.

A Fragment is a rubber band. It holds the three sheets together long enough to hand them over, then it is gone. Nothing downstream ever knows it existed.

## 2. The Core Idea

📌 **Interview term: Fragment** — a wrapper that groups multiple children **without producing a DOM element**. It exists purely to satisfy the rule that a component returns a single value.

\`\`\`jsx
// Shorthand
return <><Title /><Body /></>;

// Explicit — required when you need a key
return <Fragment key={id}><Title /><Body /></Fragment>;
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="A div wrapper adds a DOM node while a Fragment adds none">
  <text class="d-text" x="330" y="24" text-anchor="middle">What reaches the DOM</text>
  <rect class="d-box-muted" x="24" y="48" width="280" height="132" rx="10"/>
  <text class="d-text" x="164" y="74" text-anchor="middle">wrapped in a div</text>
  <rect class="d-box" x="60" y="90" width="208" height="34" rx="7"/>
  <text class="d-sub" x="164" y="112" text-anchor="middle">div (an extra node)</text>
  <rect class="d-box" x="80" y="132" width="76" height="30" rx="6"/>
  <text class="d-sub" x="118" y="152" text-anchor="middle">span</text>
  <rect class="d-box" x="172" y="132" width="76" height="30" rx="6"/>
  <text class="d-sub" x="210" y="152" text-anchor="middle">span</text>
  <rect class="d-box-accent" x="356" y="48" width="280" height="132" rx="10"/>
  <text class="d-text d-accent" x="496" y="74" text-anchor="middle">wrapped in a Fragment</text>
  <text class="d-sub" x="496" y="106" text-anchor="middle">nothing here at all</text>
  <rect class="d-box" x="412" y="132" width="76" height="30" rx="6"/>
  <text class="d-sub" x="450" y="152" text-anchor="middle">span</text>
  <rect class="d-box" x="504" y="132" width="76" height="30" rx="6"/>
  <text class="d-sub" x="542" y="152" text-anchor="middle">span</text>
</svg>

The right-hand spans are direct children of whatever contains them. That is the entire feature, and it is why Fragments matter more than they first appear.

## 3. Verified: a Fragment really adds nothing

The same two spans, rendered both ways into an empty container on React 19.2.8:

\`\`\`
fragment innerHTML : <span>a</span><span>b</span>
direct children    : 2

wrapper div        : <div><span>a</span><span>b</span></div>
direct children    : 1
\`\`\`

With the Fragment, the container has **two** direct children. With the div, it has **one**. That difference is not cosmetic — it decides whether the spans are flex or grid items of the container, and whether the HTML is valid at all.

## 4. Why the extra div is a real problem, not a tidiness preference

- **It breaks CSS layout contracts.** <code>display: flex</code> and <code>display: grid</code> apply to *direct children*. An intervening div means your items are no longer flex items; the div is, and the layout collapses.
- **It produces invalid HTML.** <code>&lt;table&gt;</code> may only contain table sections, <code>&lt;ul&gt;</code> only <code>&lt;li&gt;</code>, <code>&lt;dl&gt;</code> only <code>&lt;dt&gt;</code> and <code>&lt;dd&gt;</code>. A wrapper div in any of those is invalid, and browsers recover unpredictably.
- **It deepens the tree.** Every component adding one wrapper compounds into a deeply nested DOM that is slower to style and harder to read in devtools.

## 5. Verified: keyed Fragments, and why the shorthand cannot do it

Mapping over rows where each row emits a <code>&lt;dt&gt;</code> and a <code>&lt;dd&gt;</code> — a case with no valid wrapper element:

\`\`\`jsx
<dl>
  {rows.map((r) => (
    <Fragment key={r.id}>
      <dt>{r.k}</dt>
      <dd>{r.v}</dd>
    </Fragment>
  ))}
</dl>
\`\`\`

Actual DOM produced:

\`\`\`
<dl><dt>Name</dt><dd>Ada</dd><dt>Role</dt><dd>Engineer</dd></dl>
\`\`\`

Valid, flat, correct. 📌 **Interview term:** the shorthand <code>&lt;&gt;&lt;/&gt;</code> **cannot accept props**, including <code>key</code>, because it compiles to a bare call with no props object. Any Fragment inside a <code>map</code> must use the explicit <code>&lt;Fragment key={...}&gt;</code> form. This is the single most common Fragment question.

## 6. Shorthand versus explicit

| | <code>&lt;&gt;&lt;/&gt;</code> | <code>&lt;Fragment&gt;&lt;/Fragment&gt;</code> |
| :--- | :--- | :--- |
| Import needed | No | Yes, from <code>react</code> |
| Accepts <code>key</code> | **No** | Yes |
| Accepts other props | No | No — only <code>key</code> |
| Use it for | Almost everything | Anything inside a <code>map</code> |

Confirmed on React 19.2.8: <code>Fragment</code> is a <code>Symbol</code>, and the one exported from <code>react/jsx-runtime</code> is the **same value** as <code>React.Fragment</code>.

## 7. Common Pitfalls

- **Putting a <code>key</code> on the shorthand.** It is a syntax error. Switch to the long form.
- **Trying to style a Fragment.** No <code>className</code>, no <code>style</code>, no <code>ref</code> — it has no DOM node to attach them to. If you need styling, you genuinely need an element.
- **Wrapping everything in a div by reflex.** Verified above: it changes the direct-child relationship and can invalidate the markup.
- **Assuming a Fragment costs nothing to reconcile.** It has no DOM node, but it is still a node in the React tree and still participates in diffing.
- **Forgetting Fragments can be returned from a component,** not just used inline — that is usually the point.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line:</strong> <span style="color:#f0e2c8;">"A Fragment groups children without producing a DOM node — it satisfies the one-return-value rule without adding a wrapper element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give a concrete reason it matters:</strong> <span style="color:#f0e2c8;">"A stray div breaks flex and grid, because those apply to direct children — and it is invalid inside a table, list, or definition list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name both syntaxes:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;&gt;&lt;/&gt;</code> for almost everything, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Fragment&gt;</code> when you need a key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Volunteer the key rule:</strong> <span style="color:#f0e2c8;">"The shorthand takes no props at all, so anything inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> has to use the explicit form." That is the follow-up they were about to ask.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. If asked for a case,</strong> <span style="color:#f0e2c8;">rows of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dt&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dd&gt;</code> pairs in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;dl&gt;</code> — there is no legal wrapper element, so a keyed Fragment is the only correct answer.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you put a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key</code> on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;&gt;&lt;/&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — the shorthand compiles to a form with no props object, so it accepts nothing at all. Import <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Fragment</code> and use <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Fragment key={id}&gt;</code>. It is the only prop a Fragment accepts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just always wrap in a div?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it changes the DOM relationship. Flex and grid style direct children, so an extra div makes the div the item instead of your content. It is also invalid HTML inside a table or a list, and it deepens the tree everywhere it is repeated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you add a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">className</code> to a Fragment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. There is no DOM node for a class to land on. Only <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> are accepted. Needing a class means you actually need an element, so use one deliberately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a Fragment have any runtime cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It creates no DOM node, which is the saving, but it is still a node in the React tree and still takes part in reconciliation. Compared with a real element it is essentially free — the win is a flatter, valid DOM rather than a measurable speed-up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component return a Fragment directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and that is the main use. It lets a component contribute several siblings to its parent layout without imposing a wrapper — which is exactly what you want for a component that renders table cells or list items.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fragment** | Groups children without producing a DOM node |
| **Shorthand** | <code>&lt;&gt;&lt;/&gt;</code> — accepts no props |
| **Keyed Fragment** | <code>&lt;Fragment key={id}&gt;</code>, required inside a <code>map</code> |
| **Direct child** | What flex and grid actually style |
| **Wrapper div** | The extra element a Fragment exists to avoid |

---
**Conclusion:** a Fragment groups children while producing no DOM node — verified on React 19.2.8 as two direct children where a wrapper div gives one. That difference is what keeps flex and grid layouts intact and keeps markup valid inside tables and lists. The rule worth memorising is that the <code>&lt;&gt;&lt;/&gt;</code> shorthand accepts no props at all, so any Fragment produced inside a <code>map</code> must use the explicit <code>&lt;Fragment key={...}&gt;</code> form.`,
    examples: [
      {
        label: "Keyed Fragments in a definition list, and what a wrapper div breaks",
        runnable: true,
        code: `import { Fragment, useState } from "react";

const ROWS = [
  { id: 1, term: "Fragment", def: "Groups children with no DOM node" },
  { id: 2, term: "Element", def: "The frozen object a component returns" },
];

export default function App() {
  const [wrap, setWrap] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h3>A definition list has no legal wrapper element</h3>
      {/* Each row emits a <dt> AND a <dd>. A <div> here would be invalid HTML,
          so a keyed Fragment is the only correct option. The shorthand <></>
          cannot take a key, hence the explicit form. */}
      <dl style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        {ROWS.map((r) => (
          <Fragment key={r.id}>
            <dt style={{ fontWeight: 600 }}>{r.term}</dt>
            <dd style={{ margin: "0 0 8px 16px", color: "#555" }}>{r.def}</dd>
          </Fragment>
        ))}
      </dl>

      <h3>Flex styles direct children only</h3>
      <label style={{ display: "block", marginBottom: 8 }}>
        <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />{" "}
        wrap the items in a div instead of a Fragment
      </label>

      <div style={{ display: "flex", gap: 8, border: "2px dashed #4f46e5", padding: 8 }}>
        {wrap ? (
          // The div becomes the single flex item; the boxes inside it stack.
          <div>
            <Box label="one" />
            <Box label="two" />
            <Box label="three" />
          </div>
        ) : (
          // Each box is a direct child, so each is its own flex item.
          <>
            <Box label="one" />
            <Box label="two" />
            <Box label="three" />
          </>
        )}
      </div>
      <p style={{ color: "#666", fontSize: 13 }}>
        Tick the box: with a div in the way the three boxes stop being flex
        items and stack vertically, because flex applies to direct children.
      </p>
    </div>
  );
}

function Box({ label }) {
  return (
    <span style={{ background: "#eef", border: "1px solid #99f", borderRadius: 6, padding: "6px 12px" }}>
      {label}
    </span>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you pass data between components in React?",
    seoDescription:
      "Props down, callbacks up, lift state for siblings, Context for deep trees, and a store for genuinely global state — pick the narrowest tool that works.",
    description: `**Question presented to candidate:**
"Walk me through the ways data moves between components in React — parent to child, child to parent, and between two siblings."

**What a strong answer should cover:**
- **Parent to child: props.** The default, and read-only.
- **Child to parent: a callback passed down as a prop.** Data still flows one way; the child invokes a function it was given.
- **Sibling to sibling: lift state up** to the nearest common ancestor and pass it down to both.
- **Deep trees: Context**, to avoid prop drilling — but note it is not a state manager, and every consumer re-renders when the value changes.
- **Genuinely global or server state:** a store (Redux, Zustand, Jotai) or a data library (TanStack Query, SWR). Server state is a different problem from UI state.
- **Composition (\`children\`)** as the underrated alternative to Context — often it removes the drilling entirely without any new machinery.
- The judgement point: choose the **narrowest** mechanism that works; reaching for Context or Redux too early is the common mistake.
- Refs and imperative handles exist for the rare escape-hatch case.

**Clarifying questions expected:**
- "How far apart are these components in the tree?"
- "Is this server data or UI state?" — they call for different tools.
- "How often does it change?" — a frequently-changing Context value is a performance problem.

**Code / implementation expected:** Yes — lifting state up between two siblings is the canonical thing to write.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and state basics.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The composition measurement referenced in section 6 was produced by counting real renders on React 19.2.8; see <a href="PASTE_COMPOSITION_URL_HERE" target="_blank" rel="noopener noreferrer">composition</a> for the full figures.

## 1. Why This Even Matters — A Story First

In a well-run kitchen, orders travel one way: front of house to the pass, the pass to each station. If a station needs something, it does not walk to another station and take it — it raises a hand and the pass handles it. The rule feels bureaucratic until service gets busy, at which point it is the only reason anyone knows where anything is.

React works the same way, and for the same reason. Data flows **down**. If a child needs to cause a change, it calls a function its parent gave it. When two stations need the same information, the pass holds it.

## 2. The Core Idea

📌 **Interview term: unidirectional data flow** — data moves in one direction, parent to child, through props. There is no route for a child to write into its parent state directly. The only upward path is invoking a callback the parent passed down.

The whole question is really "how far apart are the two components, and what kind of data is it?" That determines the tool.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Props flow down, callbacks flow up, and shared state lifts to a common ancestor">
  <defs>
    <marker id="pd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Props down, callbacks up, state lifted to the common parent</text>
  <rect class="d-box-accent" x="250" y="48" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="335" y="72" text-anchor="middle">common parent</text>
  <text class="d-sub" x="335" y="92" text-anchor="middle">owns the shared state</text>
  <path class="d-edge-accent" d="M 290 112 L 175 162" marker-end="url(#pd-arrow)"/>
  <path class="d-edge-accent" d="M 380 112 L 495 162" marker-end="url(#pd-arrow)"/>
  <text class="d-sub" x="196" y="132" text-anchor="middle">props</text>
  <text class="d-sub" x="472" y="132" text-anchor="middle">props</text>
  <rect class="d-box" x="60" y="166" width="200" height="56" rx="10"/>
  <text class="d-text" x="160" y="190" text-anchor="middle">child A</text>
  <text class="d-sub" x="160" y="210" text-anchor="middle">reads the value</text>
  <rect class="d-box" x="410" y="166" width="200" height="56" rx="10"/>
  <text class="d-text" x="510" y="190" text-anchor="middle">child B</text>
  <text class="d-sub" x="510" y="210" text-anchor="middle">calls the callback</text>
</svg>

Two siblings never talk to each other. They talk to the parent that owns the value.

## 3. The five mechanisms, narrowest first

| Distance | Mechanism | Notes |
| :--- | :--- | :--- |
| Parent to child | **Props** | Read-only; the default |
| Child to parent | **Callback prop** | The child calls a function it was given |
| Sibling to sibling | **Lift state up** | Move it to the nearest common ancestor |
| Deep tree | **Composition or Context** | Try composition first |
| App-wide / server | **Store or data library** | Redux, Zustand, TanStack Query |

📌 **Interview term: lifting state up** — when two components need the same value, move that state into their closest shared ancestor and pass it down to both. The ancestor becomes the single source of truth, and the two children stay independent of each other.

## 4. Prop drilling, and the two ways out

📌 **Interview term: prop drilling** — threading a prop through components that do not use it, purely to reach a deep descendant. It is not a crime, but past three or four levels it becomes noise that obscures which components actually depend on the value.

There are two escapes, and most candidates only name one:

**Composition** — restructure so the deep component is created higher up and passed down as <code>children</code>. No new machinery, and it has a measurable performance benefit; see <a href="PASTE_COMPOSITION_URL_HERE" target="_blank" rel="noopener noreferrer">composition</a>.

**Context** — publish a value at a provider and read it anywhere below with <code>useContext</code>.

📌 **Interview term:** Context is a **transport mechanism, not a state manager**. It solves *how a value reaches a distant component*, not *how state is stored or updated*. And every consumer re-renders whenever the provider value changes, so a frequently-changing value in a Context read by many components is a performance problem. See <a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">the Context API</a>.

## 5. UI state versus server state

This distinction earns credit because it reframes the question:

- **UI state** — is the modal open, which tab is active, what is typed in this field. Local, ephemeral. Props, lifted state, and Context handle it.
- **Server state** — data that lives in a database and is merely cached in the browser. It needs fetching, caching, invalidation, refetching, and staleness handling.

Putting server state in Redux by hand is the classic over-engineering trap. TanStack Query or SWR exist because that problem is genuinely different from "which tab is open".

## 6. Common Pitfalls

- **Reaching for Context immediately.** Two or three levels of props is usually clearer than a provider. Try composition first.
- **Treating Context as a state manager.** It transports a value; it has no store, no selectors, and no way to subscribe to part of a value.
- **Putting a fresh object literal in a Provider value.** A new reference every render re-renders every consumer. Memoise it.
- **Mutating props to communicate upward.** It corrupts the parent state and React skips the re-render, because it compares by reference.
- **Lifting state too high.** Hoisting a value to the root re-renders the whole tree for a change only two components care about. Lift to the *nearest* common ancestor.
- **Using refs to reach into a sibling.** That is an escape hatch for imperative DOM work, not a data-flow mechanism.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as one rule:</strong> <span style="color:#f0e2c8;">"Data flows down through props; the only way up is a callback the parent passed down. Everything else is a variation on that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the sibling case explicitly:</strong> <span style="color:#f0e2c8;">"Siblings do not talk to each other — you lift the state to their nearest common ancestor and pass it down to both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name composition before Context:</strong> <span style="color:#f0e2c8;">"For deep trees I would first try restructuring so the component is passed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> — that often removes the drilling with no new machinery."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Qualify Context precisely:</strong> <span style="color:#f0e2c8;">"Context is transport, not a state manager, and every consumer re-renders when the value changes — so it suits low-frequency values like theme, locale, or the current user."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Split UI from server state:</strong> <span style="color:#f0e2c8;">"Server data is a caching problem, not a state problem — that is TanStack Query, not Redux. Naming that split usually ends the question well."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do two sibling components share data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They do not share it directly. You lift the state into their nearest common ancestor, which passes the value to one and a setter callback to the other. The ancestor is the single source of truth and the siblings stay unaware of each other.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is prop drilling actually a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Past three or four levels, or when intermediate components take props purely to forward them. Two levels is fine and more explicit than a provider. The cost is readability — you can no longer see which components genuinely depend on the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Context a replacement for Redux?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly — Context is transport, Redux is a store with selectors, middleware, and devtools. Context plus <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code> covers many apps, but it cannot subscribe to part of a value, so every consumer re-renders on any change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a child modify a prop it received?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Props are read-only. Mutating an object or array received as a prop corrupts the parent state and usually produces no re-render at all, because React compares by reference and sees the same object. Ask the parent for a callback instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does server data fit in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a caching problem rather than a state problem — you need fetching, deduplication, invalidation, and staleness handling. TanStack Query or SWR handle it, and they remove most of what people used to put in a global store in the first place.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Props** | Read-only data passed from parent to child |
| **Callback prop** | A function passed down so the child can signal upward |
| **Lifting state up** | Moving shared state to the nearest common ancestor |
| **Prop drilling** | Threading a prop through components that do not use it |
| **Context** | A transport for values across a deep tree |
| **Server state** | Cached remote data, needing invalidation rather than storage |

---
**Conclusion:** data moves down through props and back up through callbacks — every other mechanism is a variation on that one rule. Siblings share by lifting state to their nearest common ancestor; deep trees are best served by composition first and Context second; and genuinely global or server data belongs in a store or a query library. The judgement an interviewer is listening for is picking the narrowest tool that works, and knowing that Context transports values rather than managing state.`,
    examples: [
      {
        label: "Lifting state up so two siblings stay in sync",
        runnable: true,
        code: `import { useState } from "react";

// Sibling A — receives the value. It has no state of its own and no idea
// that another component exists.
function TemperatureInput({ scale, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      Temperature in {scale === "c" ? "Celsius" : "Fahrenheit"}:{" "}
      <input
        value={value}
        onChange={(e) => onChange(scale, e.target.value)}
        style={{ width: 90 }}
      />
    </label>
  );
}

// Sibling B — reads the same lifted state, derived differently.
function BoilingVerdict({ celsius }) {
  if (Number.isNaN(celsius)) return <p style={{ color: "#888" }}>Enter a number.</p>;
  return <p><strong>{celsius >= 100 ? "The water would boil." : "The water would not boil."}</strong></p>;
}

const toC = (f) => ((f - 32) * 5) / 9;
const toF = (c) => (c * 9) / 5 + 32;
const round = (n) => (Number.isNaN(n) ? "" : String(Math.round(n * 1000) / 1000));

export default function App() {
  // The state lives in the nearest COMMON ANCESTOR of the components that
  // need it. Neither sibling owns it; neither talks to the other.
  const [temperature, setTemperature] = useState("22");
  const [scale, setScale] = useState("c");

  // The single callback both inputs share — this is the "up" direction.
  const handleChange = (whichScale, nextValue) => {
    setScale(whichScale);
    setTemperature(nextValue);
  };

  const parsed = parseFloat(temperature);
  const celsius = scale === "f" ? toC(parsed) : parsed;
  const fahrenheit = scale === "c" ? toF(parsed) : parsed;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 380 }}>
      <h3>Two inputs, one source of truth</h3>
      <TemperatureInput scale="c" value={scale === "c" ? temperature : round(celsius)} onChange={handleChange} />
      <TemperatureInput scale="f" value={scale === "f" ? temperature : round(fahrenheit)} onChange={handleChange} />
      <BoilingVerdict celsius={celsius} />
      <p style={{ color: "#666", fontSize: 13 }}>
        Type in either box and the other follows. The inputs never communicate —
        they both read from, and write to, the parent that owns the value.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the concept of 'composition' in React components.",
    seoDescription:
      "Build UI by nesting and passing components as props. Verified: passing a child as children cut its renders from 3 to 1 over the same interaction.",
    description: `**Question presented to candidate:**
"React has no component inheritance. So how do you share and extend behaviour — and what does 'composition over inheritance' mean in practice here?"

**What a strong answer should cover:**
- Composition means building complex UI by **combining** components rather than extending them. React has no inheritance model at all, deliberately.
- The mechanisms: **\`children\`** for arbitrary content, **props as slots** (passing elements, not just data), **render props**, and **custom Hooks** for shared behaviour.
- The distinction that matters: **composition shares structure; custom Hooks share behaviour.**
- **Containment** (a generic wrapper that does not know its content) versus **specialisation** (a specific component configuring a generic one).
- A measurable benefit: a child passed as \`children\` is created by the grandparent, so its element is the *same object* across the parent's re-renders — React bails out of re-rendering it, with no \`memo\` needed.
- This makes composition a legitimate **performance** technique, not just an organisational one.
- Why inheritance is avoided: it couples components to a hierarchy, and UI variation is rarely a clean single-axis taxonomy.

**Clarifying questions expected:**
- "Are we sharing markup/structure, or behaviour?" — that picks composition versus a custom Hook.

**Code / implementation expected:** Yes — a wrapper taking \`children\`, ideally showing the re-render benefit.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and components.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts in section 4 were produced by actually counting renders on React 19.2.8 in this repo — this is the part of the answer that most candidates only assert.

## 1. Why This Even Matters — A Story First

Consider two ways to build a range of coffee. **Inheritance**: define a <code>Coffee</code>, then a <code>LatteCoffee</code> that extends it, then a <code>LargeLatteCoffee</code>, then a <code>LargeDecafOatLatteCoffee</code>. Every new axis of variation doubles the class tree, and adding "iced" late means touching all of it.

**Composition**: a cup, and you add things to it. Espresso, milk, oat, ice, sugar. Four ingredients cover more combinations than sixteen classes, and adding a fifth breaks nothing.

React chose the cup.

## 2. The Core Idea

📌 **Interview term: Composition** — building complex UI by **combining** simple components: nesting them, and passing components *to* other components. React deliberately provides no inheritance mechanism for components; composition is the only reuse story.

The key insight is that a component can accept **another component** as an input, not merely data.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A generic wrapper receives specific content through the children prop">
  <defs>
    <marker id="cm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">A generic shell, filled in from outside</text>
  <rect class="d-box" x="30" y="56" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="80" text-anchor="middle">Card</text>
  <text class="d-sub" x="130" y="100" text-anchor="middle">knows layout only</text>
  <rect class="d-box" x="30" y="140" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="164" text-anchor="middle">UserProfile</text>
  <text class="d-sub" x="130" y="184" text-anchor="middle">knows content only</text>
  <path class="d-edge-accent" d="M 236 86 L 300 118" marker-end="url(#cm-arrow)"/>
  <path class="d-edge-accent" d="M 236 170 L 300 138" marker-end="url(#cm-arrow)"/>
  <rect class="d-box-accent" x="306" y="98" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="406" y="122" text-anchor="middle">composed at the call site</text>
  <text class="d-sub" x="406" y="142" text-anchor="middle">Card wrapping UserProfile</text>
  <path class="d-edge" d="M 512 128 L 560 128" marker-end="url(#cm-arrow)"/>
  <rect class="d-box-muted" x="566" y="98" width="76" height="60" rx="10"/>
  <text class="d-sub" x="604" y="132" text-anchor="middle">rendered</text>
</svg>

Neither component knows about the other. They meet only where they are used, which is what makes both independently reusable.

## 3. The four mechanisms

| Mechanism | Shares | Use it when |
| :--- | :--- | :--- |
| **<code>children</code>** | Structure | A wrapper needs arbitrary content |
| **Props as slots** | Structure | Several named holes — <code>header</code>, <code>sidebar</code>, <code>footer</code> |
| **Render props** | Behaviour + structure | The child needs data the parent computes |
| **Custom Hooks** | Behaviour only | Logic is shared but markup is not |

📌 **Interview term: containment versus specialisation.** *Containment* is a generic component that does not know what it will hold — a <code>Card</code>, a <code>Modal</code>, a <code>Layout</code>. *Specialisation* is a specific component built by configuring a generic one — a <code>ConfirmDialog</code> that renders a <code>Dialog</code> with particular props. Both are composition; neither requires inheritance.

📌 **Interview term:** the sharpest line to draw is **composition shares structure, custom Hooks share behaviour**. If two components need the same markup, compose. If they need the same logic but look different, write a Hook.

## 4. Verified: composition is a performance technique, not just an organisational one

This is the part worth actually measuring. The same expensive child, arranged two ways, with a counter click driving the parent to re-render twice:

**(a) The child rendered inside the stateful parent:**

\`\`\`jsx
function Inside() {
  const [n, setN] = useState(0);
  return <div><button onClick={() => setN(n + 1)}>{n}</button><Slow /></div>;
}
\`\`\`

**(b) The same child passed in as <code>children</code>:**

\`\`\`jsx
function Wrapper({ children }) {
  const [n, setN] = useState(0);
  return <div><button onClick={() => setN(n + 1)}>{n}</button>{children}</div>;
}
function Outside() { return <Wrapper><Slow /></Wrapper>; }
\`\`\`

Actual render counts over mount plus two clicks:

\`\`\`
child INSIDE parent  -> Slow rendered 3 times
child as CHILDREN    -> Slow rendered 1 time
\`\`\`

📌 **Interview term:** in version (b), the <code>&lt;Slow /&gt;</code> element is created by <code>Outside</code>, which never re-renders. When <code>Wrapper</code> re-renders, <code>children</code> is **the exact same element object** as before, so React compares it by reference, sees no change, and bails out of re-rendering that subtree entirely.

No <code>React.memo</code>, no <code>useMemo</code>, no dependency array. Just moving where the element is created. That is why "lift content up, pass it as children" belongs in a performance answer as well as an architecture one.

## 5. Why React rejected inheritance

The React team documented composition as a core design principle: components written by different people should work together, and you should be able to add functionality to a component without rippling changes through everything that uses it. Inheritance works against both — it couples a component to a hierarchy, and UI variation almost never forms a clean single-axis taxonomy.

Source: [React Design Principles](https://legacy.reactjs.org/docs/design-principles.html).

The practical test: a <code>Button</code> may vary by size, colour, icon, loading state, and shape. As classes that is a combinatorial explosion. As props and <code>children</code> it is one component.

## 6. Common Pitfalls

- **Reaching for a Higher-Order Component where <code>children</code> would do.** HOCs obscure the tree and complicate typing; most cases predate Hooks.
- **Prop-drilling through a wrapper.** If <code>Layout</code> takes <code>user</code> only to forward it to <code>Header</code>, pass <code>&lt;Header user={user} /&gt;</code> as a slot instead.
- **Missing the re-render win.** Verified above — many developers reach for <code>memo</code> when restructuring would have been free.
- **Creating the element inline inside the re-rendering parent.** <code>&lt;Wrapper&gt;&lt;Slow /&gt;&lt;/Wrapper&gt;</code> only helps when <code>Wrapper</code> is the component holding the state. If the state lives in the grandparent, the element is recreated and the benefit disappears.
- **Using composition for shared behaviour.** If there is no shared markup, a custom Hook is the cleaner tool.
- **Building a component with fifteen boolean props.** That is a signal it wants to be several composable pieces.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the rule:</strong> <span style="color:#f0e2c8;">"React has no component inheritance by design. You reuse by composition — nesting components and passing components as props."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mechanisms:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>, named element slots, render props, and custom Hooks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Draw the line cleanly:</strong> <span style="color:#f0e2c8;">"Composition shares structure; custom Hooks share behaviour. If the markup differs but the logic is the same, that is a Hook."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring the performance angle — this is the differentiator:</strong> <span style="color:#f0e2c8;">"A child passed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> is created by the grandparent, so its element is the same object across the parent re-render and React skips it. I have measured three renders drop to one, with no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Justify the design choice:</strong> <span style="color:#f0e2c8;">"UI variation is multi-axis — size, colour, icon, state. Inheritance turns that into a combinatorial class tree; props and children keep it as one component."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does composition help performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An element passed as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> is created by the component *above* the one holding the state. When that stateful component re-renders, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> is the identical object it received before, so React compares by reference and bails out of that subtree — the same effect as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, for free.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a custom Hook instead of composition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the shared thing is logic rather than markup — pagination state, a subscription, a debounced value. If two components need the same behaviour but render completely differently, a Hook shares exactly the part that is common and nothing else.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React not support component inheritance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because UI variation is not a clean taxonomy. A button varies by size, colour, icon, and loading state simultaneously, which as a class hierarchy is a combinatorial explosion. Composition also keeps components decoupled — you can add functionality without rippling changes through everything that uses them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are Higher-Order Components still relevant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely in new code. They were the pre-Hooks way to share behaviour, and they cost you an obscured component tree, prop-name collisions, and awkward typing. Custom Hooks do the same job more directly; HOCs survive mostly in older libraries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a sign a component should be decomposed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A long list of boolean configuration props, or props that only exist to be forwarded somewhere deeper. Both mean the component is trying to anticipate every variation instead of leaving a hole for the caller to fill with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> or a slot.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Composition** | Building UI by combining components rather than extending them |
| **<code>children</code>** | The generic content slot every component gets |
| **Slot prop** | A named prop that takes an element rather than data |
| **Containment** | A wrapper that does not know what it holds |
| **Specialisation** | A specific component configuring a generic one |
| **Render prop** | A function prop returning UI, given data by the parent |

---
**Conclusion:** composition is React's entire reuse story — there is no inheritance, on purpose, because UI varies along too many axes for a class hierarchy to capture. You compose with <code>children</code>, with element slots, and with render props for structure, and with custom Hooks for behaviour. The point worth carrying into an interview is that it is not only an architectural preference: passing a child as <code>children</code> keeps its element identity stable across the parent re-renders, which measurably dropped an expensive child from three renders to one here with no memoisation at all.`,
    examples: [
      {
        label: "Composition cuts re-renders without memo — watch the counters",
        runnable: true,
        code: `import { useState } from "react";

let insideRenders = 0;
let outsideRenders = 0;

// A deliberately "expensive" child. It is identical in both arrangements —
// the only difference is WHERE its element gets created.
function Expensive({ tag, count }) {
  // simulate real work
  let x = 0;
  for (let i = 0; i < 200000; i++) x += i;
  return (
    <p style={{ background: "#f6f6f6", padding: 8, borderRadius: 6 }}>
      {tag} rendered <strong>{count}</strong> time(s)
    </p>
  );
}

// (a) The child is created INSIDE the stateful component, so a new element
//     object is produced on every render and React re-renders the subtree.
function Inside() {
  const [n, setN] = useState(0);
  insideRenders++;
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h4 style={{ marginTop: 0 }}>Child created inside the stateful parent</h4>
      <button onClick={() => setN(n + 1)}>clicked {n} times</button>
      <Expensive tag="Inside" count={insideRenders} />
    </div>
  );
}

// (b) The stateful component receives the child as its children prop. That element was
//     created by Outside, which never re-renders — so it is the SAME object
//     every time and React bails out of re-rendering it.
function Wrapper({ children }) {
  const [n, setN] = useState(0);
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h4 style={{ marginTop: 0 }}>Child passed in as children</h4>
      <button onClick={() => setN(n + 1)}>clicked {n} times</button>
      {children}
    </div>
  );
}

function Outside() {
  outsideRenders++;
  return (
    <Wrapper>
      <Expensive tag="Children" count={outsideRenders} />
    </Wrapper>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Inside />
      <Outside />
      <p style={{ color: "#666", fontSize: 13 }}>
        Click both buttons a few times. The first counter climbs on every click;
        the second stays at 1. No React.memo anywhere — only a change in where
        the element is created.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the role of a bundler like Webpack in a React project?",
    seoDescription:
      "A bundler resolves imports, compiles JSX, and emits browser-ready assets. Verified: JSX compiles to jsx() calls with tree-shaking annotations attached.",
    description: `**Question presented to candidate:**
"Why does a React project need a bundler at all? What is Webpack — or Vite — actually doing between your source files and the browser?"

**What a strong answer should cover:**
- Two non-negotiable jobs: **browsers cannot run JSX**, and **bare module specifiers** like \`import React from "react"\` are not resolvable by the browser.
- **Module resolution and dependency graphing** — following imports from an entry point.
- **Transformation** — JSX and modern syntax through a compiler (Babel, SWC, esbuild, oxc).
- **Bundling and code splitting** — combining modules, then splitting them again at route or \`import()\` boundaries.
- **Optimisation** — minification, **tree shaking** (helped by the \`/* @__PURE__ */\` annotations the JSX transform emits), and content hashing for cache busting.
- **Asset handling** — CSS, images, fonts as importable modules.
- **Dev server** with **HMR**, which is what preserves component state across edits.
- The modern landscape: Webpack is the incumbent; Vite (Rollup/Rolldown + native ESM in dev) is the current default; Turbopack and Rspack are the Rust-based successors.
- The architectural point: Webpack bundles before serving; Vite serves native ES modules on demand — that is why dev startup differs so much.

**Clarifying questions expected:**
- "Are we talking about the development experience or the production build?" — the tools behave very differently in each.

**Code / implementation expected:** No. Being able to describe the pipeline and name what each stage produces is what is being tested.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes you have run a build.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The compiled output in section 3 was produced by running a real JSX file through this project own compiler toolchain, not copied from documentation.

## 1. Why This Even Matters — A Story First

A publisher does not hand a reader a box of loose manuscript pages, each referencing others by note. They resolve the references, set the type, order the pages, trim the blank ones, and bind the result into something a reader can open and use.

A bundler is that publisher. Your source is dozens or thousands of interlinked files written in syntax no browser understands. The bundler resolves the links, converts the syntax, discards what nothing references, and emits something a browser can actually load.

## 2. The Core Idea

📌 **Interview term: Bundler** — a build tool that takes an **entry point**, follows every <code>import</code> to build a **dependency graph**, transforms each module, and emits browser-ready assets.

Two reasons a React project cannot skip this:

1. **JSX is not JavaScript.** No browser can parse it. It must be compiled away.
2. **Bare specifiers do not resolve in a browser.** <code>import { useState } from "react"</code> means nothing to a browser, which only understands URLs and relative paths. Something has to map <code>"react"</code> to a real file.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="A bundler resolves modules, transforms them, and emits optimised chunks">
  <defs>
    <marker id="bd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">From source files to something a browser can load</text>
  <rect class="d-box" x="16" y="56" width="140" height="88" rx="10"/>
  <text class="d-text" x="86" y="84" text-anchor="middle">your source</text>
  <text class="d-sub" x="86" y="106" text-anchor="middle">JSX, TS, CSS</text>
  <text class="d-sub" x="86" y="126" text-anchor="middle">bare imports</text>
  <path class="d-edge" d="M 162 100 L 186 100" marker-end="url(#bd-arrow)"/>
  <rect class="d-box" x="192" y="56" width="140" height="88" rx="10"/>
  <text class="d-text" x="262" y="84" text-anchor="middle">resolve</text>
  <text class="d-sub" x="262" y="106" text-anchor="middle">follow imports</text>
  <text class="d-sub" x="262" y="126" text-anchor="middle">build the graph</text>
  <path class="d-edge" d="M 338 100 L 362 100" marker-end="url(#bd-arrow)"/>
  <rect class="d-box-accent" x="368" y="56" width="140" height="88" rx="10"/>
  <text class="d-text d-accent" x="438" y="84" text-anchor="middle">transform</text>
  <text class="d-sub" x="438" y="106" text-anchor="middle">JSX to jsx() calls</text>
  <text class="d-sub" x="438" y="126" text-anchor="middle">minify, tree shake</text>
  <path class="d-edge" d="M 514 100 L 538 100" marker-end="url(#bd-arrow)"/>
  <rect class="d-box-muted" x="544" y="56" width="100" height="88" rx="10"/>
  <text class="d-text" x="594" y="84" text-anchor="middle">chunks</text>
  <text class="d-sub" x="594" y="106" text-anchor="middle">hashed JS</text>
  <text class="d-sub" x="594" y="126" text-anchor="middle">and CSS</text>
</svg>

Only the right-hand box is deployed. Everything to its left exists solely at build time.

## 3. Verified: what the transform stage actually produces

Running a JSX source file through the compiler this project uses:

\`\`\`js
var _reactJsxRuntime = require("react/jsx-runtime");
function Greeting({ name, items }) {
  return /* @__PURE__ */ _reactJsxRuntime.jsxs("h1", {
    className: "hi",
    children: ["Hello ", name, /* @__PURE__ */ _reactJsxRuntime.jsx("ul", { /* ... */ })]
  });
}
\`\`\`

Two bundler-specific things are visible in that output:

- **The <code>react/jsx-runtime</code> import was inserted by the compiler.** This is the resolution problem in miniature: your source never wrote that import, and it is a bare specifier the bundler must map to a real file.
- **<code>/* @__PURE__ */</code> annotations.** 📌 **Interview term:** these tell the minifier the call has no side effects, so if its result is unused the whole call can be deleted. That is **tree shaking** working at the expression level, not just the module level — and it is emitted by the JSX transform specifically so bundlers can drop unused UI code.

## 4. What a bundler does, stage by stage

| Stage | What happens |
| :--- | :--- |
| **Resolution** | Map <code>"react"</code> and <code>"./Button"</code> to real files |
| **Transformation** | JSX and modern syntax compiled by Babel, SWC, esbuild, or oxc |
| **Dependency graph** | Follow every import from the entry point |
| **Tree shaking** | Drop exports nothing imports; drop <code>@__PURE__</code> calls whose result is unused |
| **Code splitting** | Break the graph at routes and dynamic <code>import()</code> |
| **Assets** | Treat CSS, images, and fonts as importable modules |
| **Output** | Minified, content-hashed chunks plus a manifest |

📌 **Interview term: code splitting** — emitting several chunks instead of one, so a route the user never visits is never downloaded. In React this is driven by <code>React.lazy</code> plus a dynamic <code>import()</code>, which the bundler recognises as a split point.

📌 **Interview term: content hashing** — putting a hash of the file contents in its name (<code>main.a3f9c2.js</code>) so the file can be cached forever and a new deploy is a new URL. Cache busting for free.

## 5. Development is a different problem

📌 **Interview term: HMR (Hot Module Replacement)** — swapping a changed module into the running page without a full reload, so component state survives your edit. This is the single biggest quality-of-life feature a dev server provides, and it is why editing a form does not reset the fields you just filled in.

The architectural split that explains modern tooling:

- **Webpack** bundles the entire application *before* serving anything. Startup time scales with codebase size.
- **Vite** serves native ES modules directly and transforms only the files the browser actually requests, pre-bundling dependencies once. Startup is roughly constant regardless of project size.

That difference is the reason <a href="PASTE_CRA_URL_HERE" target="_blank" rel="noopener noreferrer">create-react-app</a>, which was Webpack-based, felt so slow on large projects compared with its replacements.

## 6. The current landscape

| Tool | Position |
| :--- | :--- |
| **Webpack** | The incumbent; enormously configurable, still everywhere in legacy code |
| **Vite** | The common default now; native ESM in dev, Rollup-family for production |
| **Turbopack** | Rust-based, developed for Next.js |
| **Rspack** | Rust-based, deliberately Webpack-config-compatible |
| **esbuild / SWC / oxc** | Not bundlers primarily — the fast compilers the above use |

Worth keeping straight: **a compiler transforms one file; a bundler orchestrates the whole graph.** Vite uses one internally; they are not competitors.

## 7. Common Pitfalls

- **Saying a bundler "just combines files".** Resolution, transformation, tree shaking, splitting, and asset handling are all part of the job.
- **Confusing the compiler with the bundler.** esbuild and SWC transform; Webpack and Vite orchestrate.
- **Thinking one big bundle is the goal.** It was, before HTTP/2 and code splitting. Now you want several cacheable chunks.
- **Assuming tree shaking removes anything unused.** It needs static ES modules and side-effect-free code; CommonJS and a missing <code>sideEffects</code> flag both defeat it.
- **Believing bundlers are obsolete because browsers support ESM.** Native ESM still cannot resolve bare specifiers without an import map, and shipping thousands of unbundled modules is far slower over the network.
- **Reaching for <code>eject</code> or a hand-written Webpack config by default.** Framework defaults are well-tuned; custom configuration is a maintenance liability.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the two hard requirements first:</strong> <span style="color:#f0e2c8;">"Browsers cannot parse JSX, and they cannot resolve a bare specifier like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import from "react"</code>. Something has to solve both before any code runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Walk the pipeline:</strong> <span style="color:#f0e2c8;">resolve imports into a dependency graph, transform each module, tree shake, split into chunks, hash the filenames.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Separate dev from production:</strong> <span style="color:#f0e2c8;">"In development the job is a fast server with HMR so state survives edits. In production it is small, cacheable, split output. Very different goals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Explain why Vite feels faster:</strong> <span style="color:#f0e2c8;">"Webpack bundles everything before serving, so startup scales with the codebase. Vite serves native ES modules and transforms only what the browser asks for."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The detail that lands:</strong> <span style="color:#f0e2c8;">"The JSX transform even emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/* @__PURE__ */</code> annotations so the minifier can tree-shake unused element creation at the expression level."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Browsers support ES modules now — why still bundle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Native ESM still cannot resolve bare specifiers without an import map, JSX and TypeScript still need compiling, and shipping thousands of separate module requests is much slower than a handful of chunks. Vite does use native ESM in development, but production still goes through a bundler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is tree shaking, and when does it fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Removing exports nothing imports. It needs statically analysable ES modules, so CommonJS defeats it, as does a dependency without a <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">sideEffects</code> flag in its package.json — the bundler must then assume importing it does something and keeps it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does code splitting work in React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React.lazy</code> with a dynamic <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code>, wrapped in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Suspense</code> for the loading state. The bundler treats the dynamic import as a split point and emits a separate chunk fetched on demand. Route boundaries are the usual place to do it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between Webpack and Babel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Different layers. Babel is a compiler — it transforms one file, turning JSX into function calls. Webpack is a bundler — it resolves the module graph and orchestrates output, calling a compiler like Babel or SWC per file along the way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does content hashing matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The filename contains a hash of the contents, so you can set a very long cache lifetime safely — a changed file gets a new name and therefore a new URL, while unchanged chunks stay cached. It is what makes aggressive caching and frequent deploys compatible.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bundler** | Resolves the module graph and emits browser-ready assets |
| **Compiler** | Transforms one file — JSX and modern syntax to plain JS |
| **Bare specifier** | <code>"react"</code>, which a browser cannot resolve on its own |
| **Tree shaking** | Dropping code nothing imports or uses |
| **Code splitting** | Emitting several chunks so unused routes are not downloaded |
| **Content hashing** | Hash in the filename, enabling permanent caching |
| **HMR** | Swapping a module in place without losing component state |

---
**Conclusion:** a bundler exists because two things are true at once — browsers cannot parse JSX, and they cannot resolve bare module specifiers. From there it resolves the dependency graph, compiles each module, drops what nothing uses, splits the result into cacheable content-hashed chunks, and in development runs a server with HMR so your component state survives an edit. Webpack bundles everything before serving; Vite serves native ES modules on demand, which is the architectural reason its dev startup does not grow with the codebase.`,
    examples: [
      {
        label: "Code splitting: what the bundler does with React.lazy",
        runnable: true,
        code: `import { lazy, Suspense, useState } from "react";

// A dynamic import() is the SPLIT POINT the bundler looks for. Everything
// reachable only from here is emitted as a separate chunk and fetched the
// first time this component actually renders — not on initial page load.
//
// In a real project this would be:
//   const Settings = lazy(() => import("./Settings"));
//
// The playground has no second file, so we simulate the same shape with a
// promise that resolves to a module object with a default export.
const Settings = lazy(
  () =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            default: function Settings() {
              return (
                <div style={{ background: "#eef", padding: 12, borderRadius: 8 }}>
                  <strong>Settings panel</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                    In a real build this arrived as its own chunk, requested
                    only when you clicked.
                  </p>
                </div>
              );
            },
          }),
        900, // stand-in for network latency fetching the chunk
      ),
    ),
);

export default function App() {
  const [show, setShow] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 460 }}>
      <h3>Code splitting with React.lazy</h3>
      <p style={{ fontSize: 14 }}>
        This chunk is not downloaded until it is needed. Suspense supplies the
        fallback while the request is in flight.
      </p>

      <button onClick={() => setShow((s) => !s)}>
        {show ? "Hide" : "Load"} settings
      </button>

      <div style={{ marginTop: 14 }}>
        {show && (
          <Suspense fallback={<em style={{ color: "#666" }}>Fetching chunk…</em>}>
            <Settings />
          </Suspense>
        )}
      </div>

      <p style={{ color: "#666", fontSize: 13 }}>
        Click Load and watch the fallback appear first. In a production build
        the Network panel would show a separate hashed .js file being fetched
        at exactly that moment.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle memory leaks in React?",
    seoDescription:
      "Return a cleanup from every effect that sets something up. Verified: 3 mount/unmount cycles left 3 listeners attached without cleanup, and 0 with it.",
    description: `**Question presented to candidate:**
"A long-running React app gets slower the more the user navigates around. What kinds of memory leaks does React make easy to write, and how do you prevent them?"

**What a strong answer should cover:**
- The single unifying rule: **every effect that sets something up must return a cleanup that tears it down.**
- The usual culprits: event listeners, \`setInterval\`/\`setTimeout\`, WebSocket and observer subscriptions, and in-flight requests.
- Cleanup runs **before the next effect run and on unmount** — that ordering is what makes it work.
- \`AbortController\` for fetches; a cancellation flag when the API cannot be aborted.
- Observers (\`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\`) need explicit \`disconnect()\`.
- A subtle one: a closure captured in a long-lived subscription keeps its entire scope alive, including large objects.
- **StrictMode makes this visible in development** by mounting, cleaning up, and remounting — an effect that leaks accumulates immediately.
- Modern nuance: since React 18 a \`setState\` on an unmounted component is a silent no-op, so the old "can't perform a React state update on an unmounted component" warning is gone. Its absence does **not** mean there is no leak.
- Diagnosis: DevTools Profiler for render cost, Chrome Memory panel heap snapshots and the detached-DOM-node check for actual retention.

**Clarifying questions expected:**
- "Is memory actually growing, or is it a re-render performance problem?" — different diagnosis entirely.
- "Does it get worse with navigation, or over time on one screen?"

**Code / implementation expected:** Yes — an effect with a cleanup, and the \`AbortController\` fetch pattern.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code> familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The listener counts in section 3 and the unmount behaviour in section 6 were produced by executing real mount and unmount cycles against React 19.2.8 in this repo.

## 1. Why This Even Matters — A Story First

You rent a meeting room and book a courier to deliver coffee there every morning. Then you move out. If nobody cancels the standing order, coffee keeps arriving at a room you no longer occupy — forever, and once for every room you ever rented.

That is a React memory leak. A component mounts and starts something: a listener, a timer, a subscription. It unmounts. Nobody cancels the order. The subscription is still live, still holding a reference to the component closure, and the next mount starts another one.

## 2. The Core Idea

📌 **Interview term: memory leak** — memory that is no longer needed but cannot be garbage collected, because something still holds a reference to it. In React the reference is almost always something an effect set up and never tore down.

There is one rule underneath every case:

📌 **Interview term:** if an effect **sets something up, it must return a function that tears it down**. That returned cleanup runs before the next effect run and again on unmount. See <a href="PASTE_SIDE_EFFECTS_URL_HERE" target="_blank" rel="noopener noreferrer">handling side effects</a> for the verified ordering.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Without cleanup each mount leaves a subscription attached and they accumulate">
  <defs>
    <marker id="ml-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three mount and unmount cycles</text>
  <rect class="d-box-muted" x="24" y="48" width="280" height="76" rx="10"/>
  <text class="d-text" x="164" y="74" text-anchor="middle">no cleanup returned</text>
  <text class="d-sub" x="164" y="96" text-anchor="middle">3 added, 0 removed</text>
  <text class="d-sub" x="164" y="114" text-anchor="middle">3 still attached</text>
  <rect class="d-box-accent" x="356" y="48" width="280" height="76" rx="10"/>
  <text class="d-text d-accent" x="496" y="74" text-anchor="middle">cleanup returned</text>
  <text class="d-sub" x="496" y="96" text-anchor="middle">3 added, 3 removed</text>
  <text class="d-sub" x="496" y="114" text-anchor="middle">0 still attached</text>
  <rect class="d-box" x="24" y="150" width="280" height="56" rx="10"/>
  <text class="d-sub" x="164" y="172" text-anchor="middle">each listener retains its closure</text>
  <text class="d-sub" x="164" y="192" text-anchor="middle">so the component cannot be collected</text>
  <rect class="d-box" x="356" y="150" width="280" height="56" rx="10"/>
  <text class="d-sub" x="496" y="172" text-anchor="middle">nothing references the component</text>
  <text class="d-sub" x="496" y="192" text-anchor="middle">it is collected normally</text>
</svg>

## 3. Verified: the leak is real and it accumulates

Two components — one whose effect adds a <code>resize</code> listener and returns nothing, one that returns a cleanup — each mounted and unmounted three times, with <code>addEventListener</code> and <code>removeEventListener</code> instrumented:

\`\`\`
Leaky : 3 mount+unmount cycles -> added 3, removed 0, still attached 3
Clean : 3 mount+unmount cycles -> added 3, removed 3, still attached 0
\`\`\`

Three unmounted components are still subscribed. Each listener closure holds a reference to the component scope, so none of them can be garbage collected. Navigate around an app fifty times and that is fifty live listeners, all firing on every resize.

## 4. The five things that actually leak

| Set up | Torn down by |
| :--- | :--- |
| <code>addEventListener</code> | <code>removeEventListener</code> with **the same function reference** |
| <code>setInterval</code> / <code>setTimeout</code> | <code>clearInterval</code> / <code>clearTimeout</code> |
| WebSocket, EventSource, store subscription | <code>close()</code> or the returned unsubscribe function |
| <code>IntersectionObserver</code>, <code>ResizeObserver</code>, <code>MutationObserver</code> | <code>disconnect()</code> |
| <code>fetch</code> in flight | <code>AbortController.abort()</code>, or a cancellation flag |

📌 **Interview term:** <code>removeEventListener</code> only works with **the identical function reference** that was added. Passing an inline arrow to both calls removes nothing, because they are two different functions — a very common silent leak.

## 5. The fetch case

\`\`\`jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(\\\`/api/users/\\\${id}\\\`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => { if (e.name !== "AbortError") setError(e); });

  return () => controller.abort();
}, [id]);
\`\`\`

<code>AbortController</code> is better than a cancellation flag because it actually **cancels the request**, not merely the state update — freeing the connection as well as preventing the write. Use a flag only when the underlying API cannot be aborted.

## 6. Verified: React 18 removed the warning, not the problem

Older React logged *"Can't perform a React state update on an unmounted component"*. On React 19.2.8, calling a setter after unmount produces:

\`\`\`
console.error after setState on unmounted component: (none — silently ignored)
\`\`\`

📌 **Interview term:** since React 18 a state update on an unmounted component is a **silent no-op**. The warning was removed because it produced false positives — but its absence is not evidence of correctness. The state update was never the leak; the **subscription still holding the closure** is. This is a genuinely good thing to know, because a lot of older advice tells you to guard setters with an <code>isMounted</code> ref, which addresses the symptom the warning complained about and not the leak at all.

## 7. How to find one

- **StrictMode** surfaces it immediately in development: it mounts, cleans up, and remounts, so a leaky effect doubles on the spot. See <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a>.
- **Chrome Memory panel** — take a heap snapshot, navigate around, take another, and compare. Growth that never comes back down is the signal.
- **Detached DOM nodes** — filter a heap snapshot for "Detached"; nodes still referenced after removal are a classic symptom.
- **Performance monitor** — watch the JS heap and listener count live while repeating a navigation.
- **DevTools Profiler** — if memory is flat but the app is slow, it is a re-render problem, not a leak.

## 8. Common Pitfalls

- **Forgetting cleanup entirely.** Verified above: three cycles, three live listeners.
- **Removing a different function reference.** Two inline arrows are two functions; store the handler in a variable.
- **Guarding with an <code>isMounted</code> ref instead of cleaning up.** It silences a warning that no longer exists and leaves the subscription running.
- **Not aborting fetches.** The request continues, holding a connection, even after nobody needs the result.
- **Forgetting <code>disconnect()</code> on observers.** They keep observing DOM nodes that have been removed, which also retains those nodes.
- **Keeping a large object in a closure captured by a long-lived subscription.** The subscription pins the whole scope alive, not just the value you meant to use.
- **Assuming StrictMode double-invocation is the bug.** It is the detector. Removing it hides the leak.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the single rule:</strong> <span style="color:#f0e2c8;">"Every effect that sets something up returns a cleanup that tears it down. Almost every React leak is a missing cleanup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. List the culprits:</strong> <span style="color:#f0e2c8;">listeners, timers, subscriptions and sockets, observers, and in-flight requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain why it retains memory:</strong> <span style="color:#f0e2c8;">"The listener closure holds a reference to the component scope, so nothing in it can be collected — and it accumulates once per mount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correct the outdated advice:</strong> <span style="color:#f0e2c8;">"Since React 18, a setState after unmount is a silent no-op — the old warning is gone. So an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMounted</code> guard fixes nothing; the subscription is the leak."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say how you would find it:</strong> <span style="color:#f0e2c8;">"StrictMode surfaces it in development; heap snapshots before and after repeated navigation confirm it, and I would filter for detached DOM nodes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a missing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">removeEventListener</code> retain memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The handler is a closure over the component scope, and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> holds a reference to that handler. So <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> transitively keeps the component state, props, and anything else in that scope alive — and a new one accumulates on every mount.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the "state update on an unmounted component" warning still a thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — React 18 removed it, and the update is now silently ignored. It caused too many false positives. Importantly, that never was the leak: the state write was harmless, and the subscription holding the closure is the actual problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need to abort a fetch on unmount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, where you can. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> frees the connection and stops the response being processed, rather than merely discarding the result. A cancellation flag only prevents the state write and leaves the request running — use it only when the API cannot be aborted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you confirm a leak rather than guess?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Heap snapshot, repeat the suspect navigation ten times, snapshot again, and compare retained size. Filtering for detached DOM nodes usually names the culprit directly. If memory is flat, it is a rendering problem and the Profiler is the right tool instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useRef</code> cause a leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself — React drops the ref when the component unmounts. It becomes a problem if you store something in it that registers itself elsewhere, like a live socket or an observer, and never tear that down. The ref is not the leak; what you put in it can be.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Memory leak** | Memory that cannot be collected because something still references it |
| **Cleanup function** | What an effect returns; runs before the next run and on unmount |
| **<code>AbortController</code>** | Cancels an in-flight request, not just its result |
| **Detached DOM node** | A removed element still referenced by JavaScript |
| **Closure retention** | A callback keeping its entire enclosing scope alive |
| **Heap snapshot** | A point-in-time record of what memory is holding |

---
**Conclusion:** React memory leaks almost always reduce to one omission — an effect that set something up and returned no cleanup. Verified here: three mount and unmount cycles left three listeners attached without cleanup and none with it, each one retaining the component closure. The modern trap is that React 18 removed the unmounted-setState warning, so the old signal is gone and an <code>isMounted</code> guard addresses nothing; the fix is to tear down what you set up, use <code>AbortController</code> for requests, and let StrictMode surface the omission in development.`,
    examples: [
      {
        label: "A leaking effect beside a clean one, with a live listener count",
        runnable: true,
        code: `import { useState, useEffect, useRef } from "react";

// Instrument the real APIs so the leak is visible rather than theoretical.
let attached = 0;
const origAdd = window.addEventListener.bind(window);
const origRemove = window.removeEventListener.bind(window);
window.addEventListener = (...args) => { attached++; return origAdd(...args); };
window.removeEventListener = (...args) => { attached--; return origRemove(...args); };

// ❌ Leaks: no cleanup returned, so the listener outlives every unmount.
function Leaky() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    window.addEventListener("resize", () => setW(window.innerWidth));
    // no return — nothing is ever removed
  }, []);
  return <span>width {w}</span>;
}

// ✅ Clean: the SAME function reference is added and removed. Two inline
// arrows would be two different functions and would remove nothing.
function Clean() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return <span>width {w}</span>;
}

// The fetch case: abort cancels the request itself, not just the state write.
function AbortDemo() {
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    const controller = new AbortController();
    setStatus("requesting…");
    fetch("https://example.com/slow", { signal: controller.signal })
      .then(() => setStatus("done"))
      .catch((e) => setStatus(e.name === "AbortError" ? "aborted on unmount" : "failed (expected offline)"));
    return () => controller.abort();
  }, []);
  return <span>fetch: {status}</span>;
}

export default function App() {
  const [showLeaky, setShowLeaky] = useState(false);
  const [showClean, setShowClean] = useState(false);
  const [showFetch, setShowFetch] = useState(false);
  const [, force] = useState(0);
  const cycles = useRef({ leaky: 0, clean: 0 });

  const row = { display: "flex", gap: 10, alignItems: "center", marginBottom: 10 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <p style={{ background: "#fff3cd", padding: 10, borderRadius: 6 }}>
        Listeners currently attached to window: <strong>{attached}</strong>{" "}
        <button onClick={() => force((n) => n + 1)}>refresh count</button>
      </p>

      <div style={row}>
        <button onClick={() => { if (!showLeaky) cycles.current.leaky++; setShowLeaky(!showLeaky); }}>
          {showLeaky ? "Unmount" : "Mount"} Leaky ({cycles.current.leaky} mounts)
        </button>
        {showLeaky && <Leaky />}
      </div>

      <div style={row}>
        <button onClick={() => { if (!showClean) cycles.current.clean++; setShowClean(!showClean); }}>
          {showClean ? "Unmount" : "Mount"} Clean ({cycles.current.clean} mounts)
        </button>
        {showClean && <Clean />}
      </div>

      <div style={row}>
        <button onClick={() => setShowFetch(!showFetch)}>
          {showFetch ? "Unmount" : "Mount"} AbortDemo
        </button>
        {showFetch && <AbortDemo />}
      </div>

      <p style={{ color: "#666", fontSize: 13 }}>
        Mount and unmount Leaky several times, then hit refresh count — it climbs
        and never comes back down. Do the same with Clean and it always returns
        to where it started.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React's design principles?",
    seoDescription:
      "React's documented principles: composition over inheritance, a common abstraction, escape hatches, stability, scheduling, and being optimised for tooling.",
    description: `**Question presented to candidate:**
"Beyond the API, what principles has the React team said guide its design — and where can you see them in the library you use every day?"

**What a strong answer should cover:**
- **Composition** — the headline principle. Components by different authors must work together, and you must be able to add functionality without rippling changes.
- **Common abstraction** — React resists adding features that can be built in userland; a feature has to earn its place in the core.
- **Escape hatches** — React is pragmatic. \`useRef\`, \`useEffect\`, \`flushSync\`, portals, and \`dangerouslySetInnerHTML\` all exist to let you step outside the declarative model.
- **Stability** — gradual migration paths, deprecation warnings before removal, and codemods rather than hard breaks.
- **Interoperability** — it must wrap non-React code and be wrappable by it.
- **Scheduling** — React controls *when* work happens, which is precisely what made concurrent rendering possible later.
- **Optimised for tooling** — explicit, statically analysable APIs so linters, compilers, and devtools can reason about your code.
- **Developer experience and debugging** — component stacks, warnings, and DevTools are treated as first-class.
- The strongest version connects each principle to something concrete: Hooks rules exist for tooling; \`key\` exists for scheduling; \`children\` exists for composition.

**Clarifying questions expected:**
- "Do you want the documented principles, or my read on the trade-offs they imply?"

**Code / implementation expected:** No. This is a discussion question; concrete examples of each principle matter more than code.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes broad familiarity with the API.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is a discussion question rather than a mechanical one, so instead of a "Verified" section it cites the React team own published principles and ties each to a concrete API you already use.

## 1. Why This Even Matters — A Story First

Two houses can have the same rooms and feel completely different to live in, because one was designed around a principle — light, or flow, or privacy — and the other was assembled from whatever seemed reasonable at each step.

The interesting thing about this question is not whether you have memorised a list. It is whether you can look at an API you use daily and say *why it is shaped that way*. Interviewers ask it to find out whether you have opinions about design or only familiarity with syntax.

## 2. The Core Idea

The React team published a **Design Principles** document explaining the reasoning behind the library, aimed at contributors but revealing for anyone using it. Source: [React Design Principles](https://legacy.reactjs.org/docs/design-principles.html).

The principles worth knowing, each tied to something you can point at:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Six React design principles and the APIs that embody them">
  <text class="d-text" x="330" y="24" text-anchor="middle">Each principle shows up in an API you already use</text>
  <rect class="d-box-accent" x="20" y="48" width="196" height="70" rx="10"/>
  <text class="d-text d-accent" x="118" y="72" text-anchor="middle">Composition</text>
  <text class="d-sub" x="118" y="94" text-anchor="middle">children, no inheritance</text>
  <rect class="d-box-accent" x="232" y="48" width="196" height="70" rx="10"/>
  <text class="d-text d-accent" x="330" y="72" text-anchor="middle">Escape hatches</text>
  <text class="d-sub" x="330" y="94" text-anchor="middle">refs, effects, portals</text>
  <rect class="d-box-accent" x="444" y="48" width="196" height="70" rx="10"/>
  <text class="d-text d-accent" x="542" y="72" text-anchor="middle">Scheduling</text>
  <text class="d-sub" x="542" y="94" text-anchor="middle">React decides when</text>
  <rect class="d-box" x="20" y="132" width="196" height="70" rx="10"/>
  <text class="d-text" x="118" y="156" text-anchor="middle">Common abstraction</text>
  <text class="d-sub" x="118" y="178" text-anchor="middle">features must earn a place</text>
  <rect class="d-box" x="232" y="132" width="196" height="70" rx="10"/>
  <text class="d-text" x="330" y="156" text-anchor="middle">Stability</text>
  <text class="d-sub" x="330" y="178" text-anchor="middle">warn, codemod, then remove</text>
  <rect class="d-box" x="444" y="132" width="196" height="70" rx="10"/>
  <text class="d-text" x="542" y="156" text-anchor="middle">Tooling</text>
  <text class="d-sub" x="542" y="178" text-anchor="middle">statically analysable APIs</text>
</svg>

## 3. Composition — the one that shapes everything else

📌 **Interview term: composition** — components written by different people must work together, and you must be able to add functionality to a component without rippling changes through everything that uses it.

This is why React has **no component inheritance at all**. Reuse happens through <code>children</code>, element slots, and custom Hooks. See <a href="PASTE_COMPOSITION_URL_HERE" target="_blank" rel="noopener noreferrer">composition</a> — where it also turns out to have a measurable performance benefit.

## 4. Common abstraction — the reason React feels small

📌 **Interview term:** React resists adding features that can be implemented in userland. A feature must be something *only* the core can provide, because every core API is permanent surface area everyone must learn.

That is why React ships no router, no data-fetching layer, and no global store — all of those are buildable on top. What it *does* ship is what nothing else could: reconciliation, scheduling, and the Hooks primitives.

## 5. Escape hatches — the pragmatic principle

📌 **Interview term: escape hatch** — a deliberate way to step outside the declarative model when reality demands it. React documents this explicitly rather than pretending the paradigm covers everything.

| Escape hatch | Steps outside |
| :--- | :--- |
| <code>useRef</code> | Values that persist without triggering renders |
| <code>useEffect</code> | Synchronising with systems outside React |
| <code>createPortal</code> | Rendering outside the parent DOM position |
| <code>flushSync</code> | Forcing a synchronous, unbatched update |
| <code>dangerouslySetInnerHTML</code> | Bypassing JSX escaping |

The naming is part of the design: <code>dangerouslySetInnerHTML</code> is deliberately unpleasant so it never gets used casually.

## 6. Stability, interoperability, and scheduling

**Stability.** React favours gradual migration over clean breaks — deprecation warnings for a full major version, published codemods, and the ability to run old and new patterns side by side. It is why class components still work years after Hooks arrived.

**Interoperability.** React must wrap imperative non-React code and be wrappable by it. Refs and effects are what make integrating a jQuery plugin or a mapping library possible at all.

📌 **Interview term: scheduling** — React controls *when* rendering work happens rather than doing it immediately. When you call <code>setState</code>, you are describing an intention, not commanding a synchronous re-render. That principle was in the design long before it paid off — it is exactly what made batching, transitions, and concurrent rendering possible later without changing the API you write.

## 7. Optimised for tooling — the principle that explains the Rules of Hooks

📌 **Interview term:** React APIs are deliberately explicit and statically analysable so external tools can reason about your code.

This principle explains several things that otherwise look arbitrary:

- **The Rules of Hooks** — call them unconditionally, at the top level. That constraint is what lets a linter verify correctness and what lets the compiler know it is safe to memoise.
- **JSX compiling to plain function calls** — analysable by any bundler, which is how tree shaking reaches unused element creation.
- **<code>key</code> being explicit** rather than inferred — reconciliation stays predictable and checkable.

The React Compiler is the strongest evidence this principle paid off. It can only auto-memoise because the rules make component behaviour statically knowable.

## 8. Common Pitfalls

- **Reciting a list without examples.** Naming "composition" is worth little; connecting it to <code>children</code> and the absence of inheritance is worth a lot.
- **Confusing principles with features.** The Virtual DOM is an implementation detail, not a principle.
- **Missing scheduling.** It is the least obvious and the most predictive — it is why <code>setState</code> is asynchronous and why concurrent React was possible at all.
- **Treating escape hatches as failures.** They are deliberate. Knowing when to reach for one is a senior signal.
- **Assuming "small API" means "does little".** It reflects the common-abstraction principle: only what nothing else can provide.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with composition:</strong> <span style="color:#f0e2c8;">"Components by different authors must work together, and you should be able to extend one without rippling changes. That is why there is no inheritance at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain why React is small:</strong> <span style="color:#f0e2c8;">"Common abstraction — a feature has to be something only the core can provide. That is why there is no router and no data layer in React itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name escape hatches as deliberate:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useRef</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code>, portals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushSync</code> — React is pragmatic about letting you leave the paradigm, and names the dangerous one to discourage casual use."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring up scheduling — the differentiator:</strong> <span style="color:#f0e2c8;">"React owns <em style="color:#ffe0b2;">when</em> work happens. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setState</code> is an intention, not a command — which is precisely what made concurrent rendering possible later without changing the API."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with tooling:</strong> <span style="color:#f0e2c8;">"APIs are statically analysable on purpose — that is what the Rules of Hooks buy, and it is exactly why the React Compiler can auto-memoise safely."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React have no built-in router or data-fetching layer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The common-abstraction principle. Both can be built on top, and every core API is permanent surface area everyone has to learn and the team has to support forever. React ships what only the core can do — reconciliation, scheduling, the Hook primitives — and leaves the rest to the ecosystem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are the Rules of Hooks so strict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mechanically, because call order is how React identifies each Hook state. But as a design choice it is the tooling principle: an unconditional top-level call is statically analysable, which is what lets the ESLint rule verify your code and lets the React Compiler know it is safe to memoise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "scheduling" mean as a principle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React decides when rendering work runs rather than doing it synchronously on demand. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setState</code> expresses an intention. Holding that line for years is what allowed automatic batching, transitions, and interruptible rendering to arrive later without breaking the API people had already written.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> badly named?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is named exactly as intended. It is an escape hatch from JSX escaping, and the awkward name is deliberate friction so it never gets used without thought. That is the design philosophy visible in an API name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which principle do you think React has compromised on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fair answer is simplicity of the mental model. Effects, dependency arrays, memoisation, and concurrent behaviour are genuinely harder to reason about than early React was. The team appears to agree — the React Compiler exists specifically to take memoisation back out of the developer hands.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Composition** | Combining components rather than extending them |
| **Common abstraction** | Only adding to the core what nothing else can provide |
| **Escape hatch** | A deliberate exit from the declarative model |
| **Scheduling** | React deciding when rendering work happens |
| **Interoperability** | Wrapping, and being wrapped by, non-React code |
| **Optimised for tooling** | Explicit APIs that linters and compilers can analyse |

---
**Conclusion:** React documented principles explain most of what looks arbitrary in the API. Composition is why there is no inheritance and why <code>children</code> carries so much weight. Common abstraction is why there is no router in the box. Escape hatches are why <code>useRef</code>, portals, and <code>flushSync</code> exist and why the dangerous one is named to make you hesitate. Scheduling — React owning *when* work happens — is the quiet one that made concurrent rendering possible a decade later, and being optimised for tooling is why the Rules of Hooks are strict enough for a compiler to build on.`,
    examples: [
      {
        label: "Escape hatches in practice: ref, effect, portal, and flushSync",
        runnable: true,
        code: `import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal, flushSync } from "react-dom";

export default function App() {
  const [log, setLog] = useState([]);
  const [showPortal, setShowPortal] = useState(false);
  const listRef = useRef(null);

  // ESCAPE HATCH 1 — useRef: a value that survives renders WITHOUT causing one.
  // Rendering cannot see this, which is exactly the point.
  const renderCount = useRef(0);
  renderCount.current++;

  // ESCAPE HATCH 2 — useEffect: synchronising with something outside React.
  useEffect(() => {
    document.title = \`\${log.length} entries\`;
    return () => { document.title = "React"; };
  }, [log.length]);

  // ESCAPE HATCH 3 — useLayoutEffect: read layout before the browser paints,
  // so the scroll adjustment never flickers.
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [log]);

  const add = (text) => setLog((l) => [...l, text]);

  // ESCAPE HATCH 4 — flushSync: opt out of batching and force the DOM to
  // update synchronously, so we can measure it in the same tick.
  const addAndMeasure = () => {
    flushSync(() => add("measured immediately"));
    // Without flushSync the DOM would not be updated yet at this line.
    add(\`height right after flush: \${listRef.current.scrollHeight}px\`);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <p>
        Renders: <strong>{renderCount.current}</strong>{" "}
        <span style={{ color: "#666", fontSize: 13 }}>(tracked in a ref, so reading it causes no render)</span>
      </p>

      <div
        ref={listRef}
        style={{ height: 110, overflow: "auto", border: "1px solid #ddd", borderRadius: 6, padding: 8, marginBottom: 10 }}
      >
        {log.length === 0 && <em style={{ color: "#888" }}>empty</em>}
        {log.map((l, i) => <div key={i} style={{ fontSize: 13 }}>{l}</div>)}
      </div>

      <button onClick={() => add("plain entry " + (log.length + 1))}>Add</button>{" "}
      <button onClick={addAndMeasure}>Add with flushSync</button>{" "}
      <button onClick={() => setShowPortal((s) => !s)}>
        {showPortal ? "Close" : "Open"} portal
      </button>

      {/* ESCAPE HATCH 5 — createPortal: render outside the parent DOM position. */}
      {showPortal &&
        createPortal(
          <div style={{
            position: "fixed", right: 16, bottom: 16, background: "#1f2937",
            color: "white", padding: "10px 14px", borderRadius: 8, fontSize: 13,
          }}>
            Rendered into document.body, not into the div above.
          </div>,
          document.body,
        )}

      <p style={{ color: "#666", fontSize: 13 }}>
        Each button demonstrates a documented escape hatch. The list auto-scrolls
        via useLayoutEffect so you never see it jump.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
