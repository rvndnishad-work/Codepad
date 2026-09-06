/**
 * React "ultra" rewrite — batch 14 (the client boundary, Server Actions, the
 * Activity API, and the four practical/tooling questions).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed here:
 *   - React.Activity is exported on 19.2.8 as a SYMBOL (an element type like
 *     Suspense), not a function. React.unstable_Activity is undefined.
 *   - Activity mode="hidden": the counter kept "count 3" and, on returning to
 *     visible, still read "count 3". Its effect ran mount -> CLEANUP -> mount.
 *     So STATE SURVIVES and EFFECTS ARE TORN DOWN.
 *   - The same component behind a plain conditional came back as "count 0".
 *   - useActionState / useOptimistic / useTransition are on react;
 *     useFormStatus is on react-dom. 46 exports on react total.
 *   - A plain async function passed to <form action> received FormData
 *     ("hello") — the same call shape a Server Action uses.
 *   - TypeScript 7.0.2 (node_modules) produced these exact diagnostics on a
 *     deliberately wrong component usage: TS2322 string->number, TS2741
 *     missing required prop, TS2322 outside a union, TS2322 + "Did you mean
 *     label?" for a typo, TS2345 into a state setter.
 *   - Testing Library: against a PURE REFACTOR (same behaviour, restyled
 *     markup) the byRole assertion passed on both versions while byTestId and
 *     by-CSS-class both failed on the refactored one.
 *   - getByRole matched an icon button through its aria-label.
 *
 * NOT executable here and stated as such: anything needing a Next.js server or
 * an RSC runtime (react-server-dom-webpack is not installed). Note the ledger
 * titles say "Next.js 15"; the version installed in this repo is 16.3.4, and
 * the docs say so rather than asserting a version they did not check.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "RSC vs Client Components — when do you add 'use client' in Next.js 15?",
    seoDescription:
      "Add it at the interactive leaves, not the top. The directive is an import-graph boundary: everything a Client Component imports joins the browser bundle.",
    description: `**Question presented to candidate:**
"How do you decide which components get \`"use client"\`?"

**What a strong answer should cover:**
- The default in the App Router is a **Server Component**. \`"use client"\` is an **opt out**, not an opt in — you add it only when you need something the server cannot do.
- The trigger list is short and concrete: **state**, **effects**, **event handlers**, **browser APIs**, **refs to DOM nodes**, and any hook that depends on those.
- It is an **import-graph boundary**, not a per-file label. Everything a Client Component imports — transitively — joins the client bundle. That is why placement matters so much.
- So the rule is **push it down to the leaves**. A \`"use client"\` near the root converts the whole tree and you keep all the constraints while losing the benefit.
- The composition escape hatch: a Client Component can **receive Server Components as \`children\`**. The parent being client does not force its children to be.
- Props crossing the boundary must be **serialisable** — no functions, no class instances.
- Practical smell test: if a component only formats and displays data, it should be a Server Component; if it responds to the user, it is a leaf that needs the directive.

**Clarifying questions expected:**
- "Does this component actually need interactivity, or does only a small part of it?" — that decides where the boundary goes.
- "What does this file import?" — a heavy library pulled in by a client component ships too.

**Code / implementation expected:** Optional. Showing a component split into a server shell and a client leaf is the substance.`,
    answer: `**Target Audience:** Engineers preparing for Next.js interviews — assumes <a href="PASTE_RSC_VS_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">what Server Components are</a>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** this needs an RSC runtime, and <code>react-server-dom-webpack</code> is **not installed here**, so nothing below was executed. **Version note:** the question says Next.js 15; the version installed in this repo is **16.3.4**, and the model described has been stable across both.

## 1. Why This Even Matters — A Story First

A building has a secure zone. The badge reader is on one door, and the rule is simple: everything past that door is inside the zone.

Put the reader on the front entrance and you have technically secured the building — while also making the lobby, the canteen and the car park part of the secure zone, with all the constraints that implies and none of the benefit.

Put it on the one door that actually needs it and everything else stays ordinary.

<code>"use client"</code> is the badge reader, and most people install it far too close to the entrance.

## 2. The Core Idea

📌 **Interview term:** in the App Router, **Server Component is the default**. <code>"use client"</code> is an **opt out** of that default, added only where the server genuinely cannot do the job.

📌 **Interview term:** it is not a label on one file — it is an **import-graph boundary**. Everything a Client Component imports, and everything those import, **transitively joins the client bundle**. A single directive high in the tree can pull your entire application into the browser.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="A directive near the root turns the whole tree into client components while one at the leaves does not">
  <defs>
    <marker id="uc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Where the directive goes decides what ships</text>
  <text class="d-text" x="60" y="76" text-anchor="middle">too high</text>
  <rect class="d-box" x="130" y="44" width="516" height="64" rx="10"/>
  <text class="d-text" x="388" y="68" text-anchor="middle">use client on the layout</text>
  <text class="d-sub" x="388" y="90" text-anchor="middle">every component below it is now a client component</text>
  <text class="d-text d-accent" x="60" y="180" text-anchor="middle">at the leaf</text>
  <rect class="d-box-muted" x="130" y="140" width="240" height="64" rx="10"/>
  <text class="d-sub" x="250" y="166" text-anchor="middle">page and layout</text>
  <text class="d-sub" x="250" y="186" text-anchor="middle">stay on the server</text>
  <path class="d-edge-accent" d="M 376 172 L 416 172" marker-end="url(#uc-arrow)"/>
  <rect class="d-box-accent" x="422" y="140" width="224" height="64" rx="10"/>
  <text class="d-text d-accent" x="534" y="166" text-anchor="middle">one interactive leaf</text>
  <text class="d-sub" x="534" y="186" text-anchor="middle">only this subtree ships</text>
</svg>

## 3. The trigger list

You need <code>"use client"</code> if and only if the component uses:

| Trigger | Why the server cannot |
| :--- | :--- |
| <code>useState</code>, <code>useReducer</code> | A server render happens once; there is no second render |
| <code>useEffect</code>, <code>useLayoutEffect</code> | Effects run after a commit; the server never commits |
| <code>onClick</code> and other handlers | Not serialisable — <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">verified</a>: server HTML has no <code>onclick</code> attribute |
| <code>window</code>, <code>localStorage</code>, <code>matchMedia</code> | They do not exist on the server |
| A <code>ref</code> to a DOM node | There is no DOM |
| <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useFormStatus</code></a>, <code>useContext</code>, custom hooks using the above | They depend on client-only machinery |

📌 **Interview term:** notice what is **not** on that list — fetching data, reading a database, formatting, sorting, rendering markdown. Those are all better on the server, and doing them in a Client Component is the most common wasted opportunity.

## 4. The rule: push it down

The mistake and the fix, side by side:

\`\`\`jsx
// ❌ One state hook drags an entire page into the bundle.
"use client";
import { marked } from "marked";          // now shipped to the browser
export default function ArticlePage({ article }) {
  const [open, setOpen] = useState(false);
  return (
    <article>
      <div dangerouslySetInnerHTML={{ __html: marked(article.body) }} />
      <button onClick={() => setOpen(!open)}>Comments</button>
      {open && <Comments />}
    </article>
  );
}
\`\`\`

\`\`\`jsx
// ✅ The page stays a Server Component. Only the toggle ships.
import { marked } from "marked";          // stays on the server
import CommentsToggle from "./CommentsToggle";   // "use client" lives in there
export default function ArticlePage({ article }) {
  return (
    <article>
      <div dangerouslySetInnerHTML={{ __html: marked(article.body) }} />
      <CommentsToggle>
        <Comments />                       {/* still a Server Component */}
      </CommentsToggle>
    </article>
  );
}
\`\`\`

📌 **Interview term:** that last line is the **composition escape hatch**, and it is the part people miss. A Client Component can **receive Server Components as <code>children</code>** — the parent being client does not make its children client. The children were rendered on the server and passed down as already-rendered output.

## 5. What that means in practice

- **Interactivity is usually a leaf.** A button, a toggle, an input — not the page around it.
- **Wrap, do not absorb.** A client wrapper taking <code>children</code> keeps the subtree on the server.
- **Watch the imports.** A date library or a markdown renderer imported by a client component ships. Check the bundle, not the directive count.
- **A file with the directive is a client module everywhere** it is imported from — you cannot use it on the server "just this once".

📌 **Interview term:** and props crossing the boundary must be **serialisable** — strings, numbers, plain objects, arrays, rendered children, and unresolved promises. **Not** functions. Passing an event handler down from a Server Component is the error everyone hits once.

## 6. Common Pitfalls

- **The directive on a root layout.** Everything below becomes a client component.
- **Adding it to "fix" an error** without asking which line needed it.
- **Forgetting the import graph.** A heavy library reached through a client component ships too.
- **Not using <code>children</code> to keep subtrees on the server.** The single highest-leverage technique here.
- **Passing a function across the boundary.** Not serialisable.
- **Fetching in a Client Component out of habit.** The server can do it with no round trip from the browser.
- **Assuming a Server Component can be nested inside a client one by import.** It can only arrive as <code>children</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as an opt out:</strong> <span style="color:#f0e2c8;">"Server Component is the default. The directive is how I opt out, and only where I need something the server cannot do."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the trigger list:</strong> <span style="color:#f0e2c8;">"State, effects, event handlers, browser APIs, DOM refs, and hooks that depend on those. That is the whole list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name what it really is:</strong> <span style="color:#f0e2c8;">"It is an import-graph boundary, not a file label — everything a client component imports, transitively, joins the bundle."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State the rule:</strong> <span style="color:#f0e2c8;">"So push it to the leaves. A directive on a layout converts the whole tree and you keep every constraint while losing the benefit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the technique:</strong> <span style="color:#f0e2c8;">"And a client component can take Server Components as children — so I wrap rather than absorb, and the subtree stays on the server."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Server Component be rendered inside a Client Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only as children, not by importing it. If a client module imports a component, that component becomes part of the client bundle by definition. But a Server Component passed down as the children prop was already rendered on the server and arrives as output, so it stays server-side. That distinction is the whole technique for keeping trees off the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you put it on the root layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything it imports becomes a client component, which in a typical app is the entire tree. The app still works — that is what makes it insidious — but you have taken on the serialisation constraints and lost the bundle savings and the direct data access. It usually happens because someone hit an error and moved the directive up until the error went away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a Client Component still get server-rendered?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the name is misleading. It is rendered to HTML on the server for the initial response and then hydrated in the browser, exactly like ordinary SSR. What "client" means is that its code also ships to the browser so it can become interactive, not that it is skipped on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you audit an existing app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look at the bundle rather than counting directives — the question is what ships, not how many files are marked. Find the highest directives first, since those do the most damage, and for each ask which specific line needed it. Usually it is one button, and the fix is to extract that button and let the rest go back to the server.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>"use client"</code>** | Opt a module and its imports into the client bundle |
| **Import-graph boundary** | Everything reachable from a client module ships |
| **Client island** | An interactive leaf inside a server tree |
| **Composition escape hatch** | Passing Server Components as <code>children</code> |
| **Serialisable prop** | Data that can cross the boundary; not a function |

---
**Conclusion:** Server Component is the default and <code>"use client"</code> is the **opt out**, needed only for state, effects, event handlers, browser APIs, DOM refs, or hooks depending on those. The thing to say precisely is that it is an **import-graph boundary**: everything a Client Component imports, transitively, joins the browser bundle — so a directive on a layout converts the whole tree and keeps every constraint while losing every benefit. Push it down to the **interactive leaves**, and use the composition escape hatch — a Client Component can receive **Server Components as <code>children</code>** — to keep subtrees on the server. Props crossing the boundary must be serialisable; functions cannot. **Not executed here:** this repo has no RSC runtime.`,
    examples: [
      {
        label: "The same page split badly and well, with what ships in each case",
        runnable: true,
        code: `import { useState } from "react";

// No RSC runtime in a browser playground, so this is an annotated comparison
// of the two file layouts plus a live bundle-impact estimate.

const BAD = \`// app/article/page.jsx
"use client";                       //  the whole page is now a client module
import { marked } from "marked";           // 40KB -> shipped to the browser
import { formatDistance } from "date-fns"; // 20KB -> shipped
import { useState } from "react";

export default function ArticlePage({ article }) {
  const [open, setOpen] = useState(false);   // <- the ONLY reason for the directive

  return (
    <article>
      <h1>{article.title}</h1>
      <time>{formatDistance(article.date, new Date())}</time>
      <div dangerouslySetInnerHTML={{ __html: marked(article.body) }} />
      <button onClick={() => setOpen(!open)}>Comments</button>
      {open && <Comments articleId={article.id} />}
    </article>
  );
}\`;

const GOOD = \`// app/article/page.jsx     — NO directive: a Server Component
import { marked } from "marked";           // stays on the server
import { formatDistance } from "date-fns"; // stays on the server
import Disclosure from "./Disclosure";     // the client leaf

export default async function ArticlePage({ params }) {
  const article = await db.article.find(params.id);   // no API route needed

  return (
    <article>
      <h1>{article.title}</h1>
      <time>{formatDistance(article.date, new Date())}</time>
      <div dangerouslySetInnerHTML={{ __html: marked(article.body) }} />

      {/* Disclosure is a client component, but Comments is passed as
          CHILDREN — already rendered on the server, so it does NOT ship. */}
      <Disclosure label="Comments">
        <Comments articleId={article.id} />
      </Disclosure>
    </article>
  );
}

// app/article/Disclosure.jsx
"use client";                        // the directive lives HERE, on the leaf
import { useState } from "react";

export default function Disclosure({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}>{label}</button>
      {open && children}
    </>
  );
}\`;

const SHIPS = [
  ["marked (markdown renderer)", "~40KB", false, true],
  ["date-fns (formatting)", "~20KB", false, true],
  ["the page component itself", "~2KB", false, true],
  ["the Disclosure toggle", "~0.4KB", true, true],
];

export default function App() {
  const [good, setGood] = useState(true);
  const total = SHIPS.filter(([, , inGood, inBad]) => (good ? inGood : inBad))
    .reduce((n, [, size]) => n + parseFloat(size.replace(/[^\\d.]/g, "")), 0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setGood(false)} style={{ fontWeight: !good ? "bold" : "normal" }}>
          ❌ directive on the page
        </button>
        <button onClick={() => setGood(true)} style={{ fontWeight: good ? "bold" : "normal" }}>
          ✅ directive on the leaf
        </button>
      </div>

      <pre style={{ background: good ? "#f2f9f2" : "#fdf0f0", border: "1px solid #ddd",
                    borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{good ? GOOD : BAD}
      </pre>

      <h4 style={{ margin: "12px 0 6px" }}>What reaches the browser</h4>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <tbody>
          {SHIPS.map(([name, size, inGood, inBad]) => {
            const ships = good ? inGood : inBad;
            return (
              <tr key={name} style={{ borderBottom: "1px solid #eee", opacity: ships ? 1 : 0.4 }}>
                <td style={{ padding: "3px 8px 3px 0" }}>{name}</td>
                <td style={{ color: "#666" }}>{size}</td>
                <td style={{ color: ships ? "#a33" : "#161" }}>{ships ? "ships" : "stays on the server"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        client bundle: <strong>{total.toFixed(1)}KB</strong>
      </p>

      <p style={{ fontSize: 13, color: "#666" }}>
        The behaviour is identical in both. One <code>useState</code> was the
        only thing forcing the directive, and moving it to a leaf that takes{" "}
        <code>children</code> keeps the markdown renderer, the date library and
        the page itself entirely on the server.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Server Actions and the `\"use server\"` directive in React 19?",
    seoDescription:
      "The directive turns a function into an RPC endpoint the client calls by reference. Verified client half: a form action received real FormData the same way.",
    description: `**Question presented to candidate:**
"What does the \`"use server"\` directive actually do to a function?"

**What a strong answer should cover:**
- It marks a function as callable **from the client but executed on the server**. The bundler replaces the function body in the client bundle with a **reference**, and calling it performs a network request.
- So it is **RPC with a function-call syntax** — the ergonomics of calling a function, the semantics of a POST.
- **The body never ships.** That is the security property: a Server Action can read secrets and query the database because its code does not exist in the browser.
- It is the **inverse** of \`"use client"\`. One marks code that ships; the other marks code that never does.
- Arguments and return values must be **serialisable**, because they are crossing a network.
- **Every Server Action is a public HTTP endpoint.** Anyone can call it with any arguments. It must authenticate and validate exactly like an API route — the directive is not authorisation.
- On the client it plugs into the same machinery as any Action: pass it to \`<form action>\`, wrap it with \`useActionState\`, read status with \`useFormStatus\`.
- With a form it works **before hydration**, because the form can post to the endpoint natively.

**Clarifying questions expected:**
- "Who is allowed to call this, and is that checked inside the action?" — the security question, and the important one.
- "Is this called from a form or from an event handler?" — that decides progressive enhancement.

**Code / implementation expected:** Optional. The security point is what distinguishes a strong answer.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">Actions</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** the directive is a bundler-plus-runtime feature and this repo has **no RSC runtime**, so the server half was not executed. The **client half was** — a plain async function passed to <code>&lt;form action&gt;</code> received real <code>FormData</code>, which is the identical call shape a Server Action uses, and that measurement is labelled in section 5.

## 1. Why This Even Matters — A Story First

A restaurant kitchen has a bell. A waiter presses it and a dish appears.

From the waiter's side it is one action — press the bell. On the other side is a whole kitchen: recipes, suppliers, a walk-in fridge with the restaurant's actual food in it. None of that is in the dining room, and no amount of pressing the bell reveals it.

But the bell is in the dining room, and **anyone in the dining room can press it**. That last sentence is the whole security discussion, and it is where most answers stop too early.

## 2. The Core Idea

📌 **Interview term: <code>"use server"</code>** — marks a function as **callable from the client but executed on the server**. The bundler removes the body from the client bundle and leaves a **reference**; calling it performs a network request to an endpoint the framework generates.

\`\`\`jsx
// actions.js
"use server";

export async function deletePost(id) {
  const user = await requireUser();              // runs on the server
  await db.post.delete({ where: { id, authorId: user.id } });
}
\`\`\`

\`\`\`jsx
// Any Client Component — imports it and calls it like a function.
import { deletePost } from "./actions";
<button onClick={() => deletePost(post.id)}>Delete</button>
\`\`\`

📌 **Interview term:** it is **RPC with function-call syntax** — the ergonomics of calling a local function, the semantics of a POST request. No route file, no fetch, no manually kept-in-sync request and response types.

📌 **Interview term:** it is the **inverse of <a href="PASTE_USE_CLIENT_URL_HERE" target="_blank" rel="noopener noreferrer"><code>"use client"</code></a>**. One marks code that **ships to the browser**; this marks code that **never does**.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="The client keeps only a reference while the function body stays on the server">
  <defs>
    <marker id="sv2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">What the browser actually has</text>
  <rect class="d-box-muted" x="24" y="46" width="250" height="76" rx="10"/>
  <text class="d-text" x="149" y="72" text-anchor="middle">the client bundle</text>
  <text class="d-sub" x="149" y="94" text-anchor="middle">a reference id, not the body</text>
  <text class="d-sub" x="149" y="112" text-anchor="middle">calling it makes a request</text>
  <path class="d-edge-accent" d="M 280 84 L 350 84" marker-end="url(#sv2-arrow)"/>
  <text class="d-sub" x="315" y="74" text-anchor="middle">POST</text>
  <rect class="d-box-accent" x="356" y="46" width="290" height="76" rx="10"/>
  <text class="d-text d-accent" x="501" y="72" text-anchor="middle">the server runs the real function</text>
  <text class="d-sub" x="501" y="94" text-anchor="middle">database, secrets, filesystem</text>
  <text class="d-sub" x="501" y="112" text-anchor="middle">none of it in the browser</text>
  <rect class="d-box" x="150" y="156" width="380" height="46" rx="10"/>
  <text class="d-sub" x="340" y="184" text-anchor="middle">the endpoint is public — anyone can call it</text>
</svg>

## 3. The security point

📌 **Interview term:** a Server Action is a **public HTTP endpoint**. The directive controls **where code runs**, not **who may run it**. Anyone can send a request with any arguments, from anywhere, whether or not your UI ever renders the button.

So every Server Action needs the same three things an API route needs:

\`\`\`jsx
"use server";

export async function deletePost(id) {
  const user = await requireUser();                    // 1. AUTHENTICATE
  const post = await db.post.findUnique({ where: { id } });
  if (post.authorId !== user.id) throw new Error("Forbidden");   // 2. AUTHORISE
  if (typeof id !== "string") throw new Error("Bad input");      // 3. VALIDATE
  await db.post.delete({ where: { id } });
}
\`\`\`

📌 **Interview term:** and note that **hiding the button is not authorisation**. An attacker never renders your UI. The check has to be **inside the action**, because that is the only code path the request must go through.

Two further consequences worth naming:

- **Arguments cross a network**, so they are attacker-controlled — validate them as you would a request body.
- Marking a whole module <code>"use server"</code> makes **every export** an endpoint. A helper you did not intend to expose is now callable.

## 4. What can cross

| Direction | Allowed | Not allowed |
| :--- | :--- | :--- |
| Arguments | Strings, numbers, plain objects, arrays, <code>FormData</code>, <code>Date</code> | Functions, class instances |
| Return value | The same serialisable set, plus JSX | Functions, non-serialisable objects |

📌 **Interview term:** it is a **network boundary wearing a function signature**. Everything surprising about it — serialisation limits, the public endpoint, the latency — follows from remembering that.

## 5. Verified: the client half

The directive itself needs a bundler and a server runtime, neither of which exists here. What **was** executed is the calling convention, which is identical either way — a plain async function passed to <code>&lt;form action&gt;</code>:

\`\`\`
the action received:  "hello"
\`\`\`

📌 **Interview term:** that is the point of the design. A Server Action **plugs into the same Action machinery** as a local one — <code>&lt;form action&gt;</code>, <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useActionState</code></a> for the result and pending flag, <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useFormStatus</code></a> for a nested button, <a href="PASTE_USE_OPTIMISTIC_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useOptimistic</code></a> for instant feedback. Verified exports: those three are on <code>react</code> and <code>useFormStatus</code> is on <code>react-dom</code>.

📌 **Interview term:** and with a **form** it works **before hydration**, because a form can post to the endpoint natively. That is genuine progressive enhancement — but only in the form case. Calling an action from an <code>onClick</code> needs JavaScript like any other handler.

## 6. Common Pitfalls

- **Treating the directive as authorisation.** It is a location marker; the endpoint is public.
- **Relying on a hidden button.** The attacker never renders your UI.
- **Marking a whole module.** Every export becomes an endpoint.
- **Passing a function as an argument.** Not serialisable.
- **Trusting arguments.** They arrive over the network.
- **Expecting progressive enhancement from an <code>onClick</code>.** Only the form path works pre-hydration.
- **Using one for a read.** They are POSTs and are not cached; reads belong in a Server Component.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what the bundler does:</strong> <span style="color:#f0e2c8;">"It marks a function as callable from the client but executed on the server. The body is stripped from the client bundle and replaced with a reference — calling it makes a network request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shape:</strong> <span style="color:#f0e2c8;">"It is RPC with function-call syntax — the ergonomics of a function, the semantics of a POST. And it is the exact inverse of use client."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Go straight to security:</strong> <span style="color:#f0e2c8;">"Every Server Action is a public HTTP endpoint. The directive says where code runs, not who may run it — so it needs authentication, authorisation and validation inside the action, exactly like an API route."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Kill the common mistake:</strong> <span style="color:#f0e2c8;">"Hiding the button is not authorisation. An attacker never renders your UI — they post to the endpoint directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Connect it to the hooks:</strong> <span style="color:#f0e2c8;">"On the client it is just an Action — form action, useActionState, useFormStatus. And through a form it works before hydration, because the form can post natively."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a Server Action safe because the code is not in the browser?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The secrets inside it are safe — the body genuinely never ships. The action itself is not: it is a public endpoint anyone can post to with arbitrary arguments. The directive protects your code, not your data, and conflating those is the most common serious mistake with this feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it different from an API route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly ergonomics and type safety — no route file, no fetch call, no request and response shapes to keep in sync, and arguments typed end to end. Security-wise it is the same thing: a public POST endpoint. The one genuine functional gain is that a form can post to it before hydration, which a hand-rolled fetch cannot do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What can you pass and return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Serialisable values in both directions — strings, numbers, plain objects, arrays, FormData, Dates — plus JSX as a return value. Not functions or class instances. If you find yourself wanting to pass a callback, that is the network boundary reminding you what this actually is.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use one to fetch data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are POSTs, they are not cached, and they serialise on the server. For reading, a Server Component already has direct access with no round trip from the browser at all. Actions are for mutations — the name is accurate.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>"use server"</code>** | Marks a function that runs on the server, callable from the client |
| **RPC** | Calling a remote procedure with local syntax |
| **Reference** | What the client bundle holds instead of the body |
| **Public endpoint** | Anyone can post to it, with any arguments |
| **Serialisable** | Able to cross the network as data |

---
**Conclusion:** <code>"use server"</code> marks a function as **executed on the server but callable from the client**. The bundler strips the body and leaves a **reference**, so calling it performs a network request — **RPC with function-call syntax**, and the exact inverse of <code>"use client"</code>. The body never ships, which is why an action can hold secrets and query the database. But the directive says **where code runs, not who may run it**: every Server Action is a **public HTTP endpoint** that must authenticate, authorise and validate internally, because hiding the button protects nobody. On the client it is an ordinary Action — verified, a function passed to <code>&lt;form action&gt;</code> receives real <code>FormData</code> — and through a form it works before hydration. **The server half was not executed here**; this repo has no RSC runtime.`,
    examples: [
      {
        label: "What ships versus what does not, and the security checks that are not optional",
        runnable: true,
        code: `import { useState } from "react";

// The directive needs a bundler and a server runtime, so this is an annotated
// reference. The live part below is the calling convention, which is identical
// whether the function is local or a Server Action.

const ACTION_FILE = \`// app/actions.js
"use server";                         // every export here becomes an ENDPOINT

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function deletePost(id) {
  //  1. AUTHENTICATE — the request may come from anyone at all
  const user = await requireUser();

  //  2. VALIDATE — id arrived over the network; it is attacker-controlled
  if (typeof id !== "string" || id.length > 40) throw new Error("Bad input");

  //  3. AUTHORISE — hiding the button in the UI protects nothing
  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.authorId !== user.id) throw new Error("Forbidden");

  await db.post.delete({ where: { id } });
}

// ⚠️ This helper is exported from a "use server" module, so it is ALSO a
//    public endpoint — probably not what its author intended.
export async function internalRecalculateTotals() { /* ... */ }\`;

const CLIENT_FILE = \`// app/PostRow.jsx
"use client";
import { deletePost } from "./actions";   // imports a REFERENCE, not the body

export function PostRow({ post }) {
  // Looks like a function call. Is a POST to a generated endpoint.
  return <button onClick={() => deletePost(post.id)}>Delete</button>;
}\`;

// ── Live: the calling convention ───────────────────────────────────────────
const save = async (formData) => {
  await new Promise((r) => setTimeout(r, 500));
  return formData.get("title");
};

export default function App() {
  const [tab, setTab] = useState(0);
  const [result, setResult] = useState(null);

  const TABS = [["actions.js (server)", ACTION_FILE, "#f2f9f2"], ["PostRow.jsx (client)", CLIENT_FILE, "#eef"]];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {TABS.map(([label], i) => (
          <button key={label} onClick={() => setTab(i)} style={{ fontWeight: i === tab ? "bold" : "normal" }}>
            {label}
          </button>
        ))}
      </div>

      <pre style={{ background: TABS[tab][2], border: "1px solid #ddd", borderRadius: 8,
                    padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{TABS[tab][1]}
      </pre>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 12 }}>
        <strong style={{ fontSize: 13 }}>The calling convention, running for real</strong>
        <form
          action={async (fd) => { setResult("saved: " + JSON.stringify(await save(fd))); }}
          style={{ marginTop: 6 }}
        >
          <input name="title" defaultValue="a new post" style={{ width: "100%", marginBottom: 6 }} />
          <button type="submit">submit</button>
        </form>
        {result && <div style={{ fontSize: 13, color: "#161", marginTop: 6 }}>{result}</div>}
        <p style={{ fontSize: 12, color: "#666", margin: "6px 0 0" }}>
          This action is local, but the shape is identical to a Server Action:
          the function receives <code>FormData</code> and React owns the pending
          state. Swapping in an imported <code>"use server"</code> function
          changes nothing on this side — which is the whole design.
        </p>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        The three numbered checks in the first tab are not defensive extras.
        The endpoint exists whether or not your UI ever renders a delete button,
        and anyone can post any id to it.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "The Activity API — hiding UI without unmounting in React 19",
    seoDescription:
      "Verified on React 19.2.8: with mode hidden a counter kept its value and its effects were torn down. A plain conditional reset the same counter to zero.",
    description: `**Question presented to candidate:**
"A tab panel loses its scroll position and form input every time the user switches away. How would you keep it without keeping it mounted and running?"

**What a strong answer should cover:**
- \`<Activity mode="hidden">\` **hides a subtree while preserving its state**. React keeps the component's state and DOM but **unmounts its effects**.
- That is the key distinction and the whole reason it exists: **state survives, effects do not**. Timers stop, subscriptions unsubscribe, observers disconnect — but the input value, scroll position and local state are all still there when it returns.
- The alternatives are both worse: a conditional unmount **destroys state**, and CSS \`display: none\` **keeps everything running** — timers, subscriptions, polling.
- Returning to \`mode="visible"\` restores the state and **re-runs the effects**, exactly like a remount for effect purposes.
- Because effects tear down and set up again, this only works if your effects are **idempotent** — the same property \`StrictMode\` tests for.
- React can also use hidden Activity boundaries to **pre-render** content at low priority, so it is ready before the user asks for it.
- Typical uses: tab panels, multi-step wizards, a route the user is likely to go back to, an off-screen detail pane.

**Clarifying questions expected:**
- "Should the hidden panel keep polling, or stop?" — Activity stops it; \`display: none\` does not.
- "How much state is there to lose?" — a single scroll position may not justify it.

**Code / implementation expected:** Optional. The three-way comparison against a conditional and \`display: none\` is what makes it land.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes the component lifecycle.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is **executed against React 19.2.8**, including the contrast against a plain conditional. Related: <a href="PASTE_LIFECYCLE_URL_HERE" target="_blank" rel="noopener noreferrer">the component lifecycle</a> and <a href="PASTE_KEY_RESET_URL_HERE" target="_blank" rel="noopener noreferrer">using key to reset state</a>, which is the opposite operation.

## 1. Why This Even Matters — A Story First

You leave a room mid-task. Three things could happen to it.

**Someone clears it out.** You come back to an empty desk and start again. That is a conditional unmount.

**Everything is left running.** The taps, the printer, the radio — all still going while you are away, for nobody. That is <code>display: none</code>.

**The lights go off and the door closes, and your papers stay exactly where you left them.** Nothing is consuming anything; the work is untouched. That is <code>Activity</code>.

## 2. The Core Idea

📌 **Interview term: <code>&lt;Activity&gt;</code>** — a boundary with a <code>mode</code> of <code>"visible"</code> or <code>"hidden"</code>. Hidden, React **keeps the subtree's state and DOM** but **unmounts its effects**.

📌 **Interview term:** that split — **state preserved, effects torn down** — is the entire feature, and it is what neither alternative gives you.

\`\`\`jsx
<Activity mode={tab === "settings" ? "visible" : "hidden"}>
  <SettingsPanel />
</Activity>
\`\`\`

## 3. Verified: the three-way difference

The same counter component, clicked three times, then hidden and shown again.

**With <code>Activity mode="hidden"</code>:**

\`\`\`
visible, after 3 clicks:  "count 3"   effects: mounted
after mode=hidden:        "count 3"   effects: mounted, CLEANED UP
back to visible:          "count 3"   effects: mounted, CLEANED UP, mounted
\`\`\`

**The same component behind a plain conditional:**

\`\`\`
shown, after 3 clicks:    "count 3"
after hiding:             "(hidden)"  effects: mounted, CLEANED UP
after showing again:      "count 0"   effects: mounted, CLEANED UP, mounted
\`\`\`

📌 **Interview term:** read the last line of each. Activity came back at **<code>count 3</code>**; the conditional came back at **<code>count 0</code>**. Identical effect lifecycles — mounted, cleaned up, mounted — and **opposite state outcomes**. That is the measurement that makes the feature make sense.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Activity keeps state while tearing down effects unlike a conditional or display none">
  <defs>
    <marker id="ac-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Hide a panel: three options, three outcomes</text>
  <text class="d-text" x="80" y="72" text-anchor="middle">conditional</text>
  <rect class="d-box-muted" x="170" y="46" width="228" height="46" rx="9"/>
  <text class="d-sub" x="284" y="74" text-anchor="middle">state destroyed</text>
  <rect class="d-box" x="410" y="46" width="236" height="46" rx="9"/>
  <text class="d-sub" x="528" y="74" text-anchor="middle">effects torn down</text>
  <text class="d-text" x="80" y="140" text-anchor="middle">display none</text>
  <rect class="d-box" x="170" y="114" width="228" height="46" rx="9"/>
  <text class="d-sub" x="284" y="142" text-anchor="middle">state kept</text>
  <rect class="d-box-muted" x="410" y="114" width="236" height="46" rx="9"/>
  <text class="d-sub" x="528" y="142" text-anchor="middle">effects still running</text>
  <text class="d-text d-accent" x="80" y="208" text-anchor="middle">Activity</text>
  <rect class="d-box-accent" x="170" y="182" width="228" height="46" rx="9"/>
  <text class="d-text d-accent" x="284" y="210" text-anchor="middle">state kept</text>
  <rect class="d-box-accent" x="410" y="182" width="236" height="46" rx="9"/>
  <text class="d-text d-accent" x="528" y="210" text-anchor="middle">effects torn down</text>
</svg>

## 4. Verified: the API surface

\`\`\`
typeof React.Activity            ->  "symbol"
typeof React.unstable_Activity   ->  undefined
React.version                    ->  19.2.8
\`\`\`

📌 **Interview term:** it is a **symbol**, not a function — an element **type**, the same shape as <code>Suspense</code> and <code>Fragment</code>. Worth knowing because a naive <code>typeof x === "function"</code> feature check reports it as missing, which is exactly the mistake this doc's own harness made on the first run.

Note also that <code>unstable_Activity</code> is **undefined** on this version — the prefixed name is gone.

## 5. Why "effects torn down" is the right design

If effects kept running, a hidden panel would keep polling, keep its socket open and keep its <code>ResizeObserver</code> attached — you would have <code>display: none</code> with extra steps, and ten hidden tabs would mean ten live subscriptions.

If state were destroyed, you would have a conditional, and the user loses their half-filled form.

📌 **Interview term:** so the contract is **cheap to keep, correct to resume**. A hidden Activity costs memory but no ongoing work.

📌 **Interview term:** the requirement it puts on you is that your effects must be **idempotent** — able to tear down and set up again cleanly. That is the same property <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> exists to test, which is a good argument for not silencing StrictMode: it is checking the thing Activity depends on.

## 6. Where it fits

| Situation | Reach for |
| :--- | :--- |
| Tab panels the user switches between | **Activity** |
| A multi-step wizard where going back must preserve input | **Activity** |
| A route the user is likely to return to | **Activity** |
| A modal that should start fresh every time | A conditional — or a <a href="PASTE_KEY_RESET_URL_HERE" target="_blank" rel="noopener noreferrer">key change</a> |
| Content that must keep polling while hidden | Neither — keep it mounted deliberately |
| A purely visual show and hide with no state | Plain CSS |

📌 **Interview term:** React can also render a hidden Activity boundary **at low priority before the user asks for it** — pre-rendering the next likely screen without competing with the current one. That is the forward-looking half of the feature, and it is why it is framed as more than a state-preservation trick.

## 7. Common Pitfalls

- **Expecting effects to keep running.** Verified: they are torn down.
- **A feature check of <code>typeof === "function"</code>.** It is a symbol.
- **Using it where state should reset.** A fresh modal wants a conditional.
- **Non-idempotent effects.** They break on the resume.
- **Assuming hidden content is free.** It costs memory; it is the ongoing work that is saved.
- **Hiding dozens of heavy trees.** Memory is a real budget.
- **Confusing it with a <a href="PASTE_PORTALS_URL_HERE" target="_blank" rel="noopener noreferrer">portal</a>.** One relocates, this one suspends activity.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the one-line contract:</strong> <span style="color:#f0e2c8;">"Activity with mode hidden keeps the subtree's state and DOM but unmounts its effects. State survives, effects do not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Contrast both alternatives:</strong> <span style="color:#f0e2c8;">"A conditional destroys the state; display none keeps everything running. Activity is the only one that keeps the state without keeping the work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the measurement:</strong> <span style="color:#f0e2c8;">"I have run both: hidden and shown again, Activity came back at count 3 and the conditional came back at count 0 — with identical effect lifecycles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Explain why that is right:</strong> <span style="color:#f0e2c8;">"If effects kept running you would have display none with extra steps — ten hidden tabs, ten live subscriptions. Cheap to keep, correct to resume."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the requirement:</strong> <span style="color:#f0e2c8;">"It needs idempotent effects, since they tear down and set up again — the same property StrictMode is testing for."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">display: none</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because React has no idea the subtree is hidden — every effect keeps running. The panel keeps polling, its socket stays open, its observers stay attached, and it still re-renders when its data changes. With several hidden tabs that is real ongoing cost for something nobody is looking at. Activity is the version where React knows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly survives being hidden?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Component state, refs, and the DOM nodes with whatever is in them — a half-typed input keeps its value, a scrolled list keeps its position. What does not survive is anything an effect was maintaining, because the cleanup ran: a timer, a subscription, an observer. Those are re-established when it becomes visible again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you NOT want it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When starting fresh is the correct behaviour — a modal that should not remember last time, a form that should be empty on each open. There a conditional or a key change is right. And it is not free: hidden trees hold memory, so keeping a dozen heavy panels alive is a trade rather than a win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does it require of my effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That they can be torn down and set up again without damage — a cleanup that genuinely reverses the setup. That is exactly what StrictMode's double-invoke checks, which is a good reason not to silence it: it is verifying the property this feature depends on. An effect with a ref guard that only runs once will not re-establish itself on resume.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it only about hiding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — the other half is pre-rendering. React can render a hidden boundary at low priority before the user asks for it, so the next likely screen is already built when they navigate. That is why it is framed as a scheduling primitive rather than just a way to keep a tab's state.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>Activity</code>** | A boundary that can be visible or hidden |
| **<code>mode="hidden"</code>** | State kept, effects torn down |
| **Idempotent effect** | Safe to set up, clean up, and set up again |
| **Pre-rendering** | Building a hidden subtree at low priority |
| **Conditional unmount** | Removing the subtree; state destroyed |

---
**Conclusion:** <code>&lt;Activity mode="hidden"&gt;</code> **keeps a subtree's state and DOM while unmounting its effects** — the one combination neither alternative offers. Verified on React 19.2.8: hidden and shown again, the counter came back at **<code>count 3</code>** while the same component behind a plain conditional came back at **<code>count 0</code>**, with identical effect lifecycles of mounted → cleaned up → mounted. That design is deliberate: keeping effects alive would be <code>display: none</code> with extra steps, and destroying state would be a conditional. It is exported as a **symbol**, an element type like <code>Suspense</code>, and it requires **idempotent effects** — the property StrictMode exists to check. Beyond hiding, React can pre-render a hidden boundary at low priority before the user asks for it.`,
    examples: [
      {
        label: "Activity against a conditional and display:none — same panel, three behaviours",
        runnable: true,
        code: `import { useState, useEffect, useRef, Activity } from "react";

// A panel with BOTH kinds of state: React state, uncontrolled DOM state, and
// an effect doing ongoing work. Each strategy treats these differently.
function Panel({ label, onTick }) {
  const [count, setCount] = useState(0);
  const ticks = useRef(0);

  useEffect(() => {
    // Ongoing work — exactly what should stop when nobody is looking.
    const id = setInterval(() => { ticks.current++; onTick(label); }, 500);
    return () => clearInterval(id);
  }, [label, onTick]);

  return (
    <div style={{ border: "1px solid #ccd", borderRadius: 6, padding: 10, background: "#fafaff" }}>
      <div style={{ fontSize: 13 }}>
        React state: <strong>{count}</strong>{" "}
        <button onClick={() => setCount((c) => c + 1)}>+1</button>
      </div>
      <input placeholder="type something (uncontrolled)" style={{ width: "100%", marginTop: 6 }} />
    </div>
  );
}

export default function App() {
  const [strategy, setStrategy] = useState("activity");
  const [shown, setShown] = useState(true);
  const timers = useRef({});
  const [, refresh] = useState(0);

  // Counted in a ref so counting never causes a render of its own.
  const onTick = (label) => { timers.current[label] = (timers.current[label] || 0) + 1; };

  const panel = <Panel label={strategy} onTick={onTick} />;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[["activity", "✅ Activity"], ["conditional", "❌ conditional"], ["css", "⚠️ display:none"]].map(([k, l]) => (
          <button key={k} onClick={() => { setStrategy(k); setShown(true); timers.current = {}; }}
                  style={{ fontWeight: strategy === k ? "bold" : "normal" }}>
            {l}
          </button>
        ))}
        <button onClick={() => setShown((s) => !s)}>{shown ? "hide" : "show"}</button>
        <button onClick={() => refresh((n) => n + 1)}>refresh counts</button>
      </div>

      <div style={{ minHeight: 96 }}>
        {strategy === "activity" && (
          // State AND DOM preserved; effects unmounted while hidden.
          <Activity mode={shown ? "visible" : "hidden"}>{panel}</Activity>
        )}
        {strategy === "conditional" && (
          // Everything destroyed and rebuilt.
          (shown ? panel : <em style={{ fontSize: 13, color: "#999" }}>(unmounted)</em>)
        )}
        {strategy === "css" && (
          // Everything kept — including the interval, still firing.
          <div style={{ display: shown ? "block" : "none" }}>{panel}</div>
        )}
        {!shown && strategy !== "conditional" && (
          <em style={{ fontSize: 13, color: "#999" }}>(hidden)</em>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#666", marginTop: 10 }}>
        interval ticks recorded for <code>{strategy}</code>:{" "}
        <strong>{timers.current[strategy] || 0}</strong>
      </p>

      <p style={{ fontSize: 13, color: "#666" }}>
        Try each: click +1 a few times, type in the box, hide, wait a couple of
        seconds, then show and press refresh. <strong>Activity</strong> returns
        your count and your typing with the tick counter frozen while hidden.{" "}
        <strong>Conditional</strong> returns everything at zero and empty.{" "}
        <strong>display:none</strong> returns everything intact — and the tick
        counter kept climbing the whole time nobody was looking.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Server Actions — how do mutations work without API routes in Next.js 15?",
    seoDescription:
      "You call a function; the framework makes it a POST, then revalidates the cache so the page reflects the change without a client refetch or an API route.",
    description: `**Question presented to candidate:**
"Walk me through a form that creates a record in the App Router. Where does the mutation go, and how does the list update afterwards?"

**What a strong answer should cover:**
- The mutation is a function marked \`"use server"\`, passed directly to \`<form action>\`. **No route file, no fetch, no client state for the request.**
- The step people forget: **the cache.** After mutating you call the framework's revalidation — by path or by tag — so the affected Server Components re-render on the next request.
- Without that, the write succeeds and the UI still shows stale data, which is the classic "it worked but nothing changed" bug.
- Because the server re-renders, **no client refetch is needed** — the updated markup streams back and replaces the affected segment.
- Errors: catch inside the action and return them as state via \`useActionState\`; throwing reaches an error boundary, which is disproportionate for validation.
- Redirect after a successful mutation is a server-side call, not a router push.
- For instant feedback, \`useOptimistic\` shows the change before the round trip completes.
- Security is not optional: the action is a **public endpoint**, so authentication, authorisation and validation live inside it.

**Clarifying questions expected:**
- "Does the list that needs updating live in a Server Component?" — that decides revalidation versus client state.
- "Should this feel instant, or is a spinner acceptable?" — that decides whether \`useOptimistic\` is worth it.

**Code / implementation expected:** Yes — this is a workflow question and a short end-to-end sketch is the natural answer.`,
    answer: `**Target Audience:** Engineers preparing for Next.js interviews — assumes <a href="PASTE_SERVER_ACTIONS_REACT_URL_HERE" target="_blank" rel="noopener noreferrer">what the directive does</a>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** this needs a running Next.js server and there is none here, so the workflow was **not executed**. The React-level pieces it builds on **were** — those are labelled where they appear. **Version note:** the question says Next.js 15; the version installed in this repo is **16.3.4**.

## 1. Why This Even Matters — A Story First

You post a change-of-address form. It arrives, it is processed, your record is updated. The mutation worked perfectly.

And every letter still goes to the old address, because nobody told the mailing list to regenerate.

That is the entire failure mode of this question. Candidates describe the write correctly and stop — and the write was never the hard part.

## 2. The Core Idea

📌 **Interview term:** a mutation in the App Router is a function marked <code>"use server"</code> handed to <code>&lt;form action&gt;</code>. There is **no route file, no fetch call, no client state for the request**.

📌 **Interview term:** but a mutation is **two steps**, not one — **write, then invalidate**. Server Components render from cached data, so after changing the data you must tell the framework which cached output is now wrong.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A mutation writes then revalidates so the server re-renders the affected segment">
  <defs>
    <marker id="sa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">A mutation is two steps, not one</text>
  <rect class="d-box-muted" x="20" y="48" width="140" height="52" rx="9"/>
  <text class="d-sub" x="90" y="70" text-anchor="middle">form submit</text>
  <text class="d-sub" x="90" y="90" text-anchor="middle">FormData</text>
  <path class="d-edge-accent" d="M 166 74 L 206 74" marker-end="url(#sa-arrow)"/>
  <rect class="d-box-accent" x="212" y="48" width="150" height="52" rx="9"/>
  <text class="d-text d-accent" x="287" y="70" text-anchor="middle">1. write</text>
  <text class="d-sub" x="287" y="90" text-anchor="middle">database updated</text>
  <path class="d-edge-accent" d="M 368 74 L 408 74" marker-end="url(#sa-arrow)"/>
  <rect class="d-box-accent" x="414" y="48" width="160" height="52" rx="9"/>
  <text class="d-text d-accent" x="494" y="70" text-anchor="middle">2. revalidate</text>
  <text class="d-sub" x="494" y="90" text-anchor="middle">cache marked stale</text>
  <path class="d-edge-accent" d="M 494 106 L 494 142" marker-end="url(#sa-arrow)"/>
  <rect class="d-box" x="330" y="146" width="326" height="52" rx="9"/>
  <text class="d-text" x="493" y="168" text-anchor="middle">the server re-renders that segment</text>
  <text class="d-sub" x="493" y="188" text-anchor="middle">new markup streams back — no client refetch</text>
  <rect class="d-box-muted" x="20" y="146" width="280" height="52" rx="9"/>
  <text class="d-sub" x="160" y="168" text-anchor="middle">skip step 2 and the write succeeds</text>
  <text class="d-sub" x="160" y="188" text-anchor="middle">while the page still shows old data</text>
</svg>

## 3. The whole thing, end to end

\`\`\`jsx
// app/todos/actions.js
"use server";
import { revalidatePath } from "next/cache";

export async function createTodo(previous, formData) {
  const user = await requireUser();                    // public endpoint: check
  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title is required", title };   // RETURN, do not throw

  await db.todo.create({ data: { title, userId: user.id } });

  revalidatePath("/todos");                            // <- the step people forget
  return { error: null, title: "" };
}
\`\`\`

\`\`\`jsx
// app/todos/NewTodo.jsx
"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTodo } from "./actions";

function Submit() {
  const { pending } = useFormStatus();                 // must be INSIDE the form
  return <button type="submit" disabled={pending}>{pending ? "Adding…" : "Add"}</button>;
}

export function NewTodo() {
  const [state, formAction] = useActionState(createTodo, { error: null, title: "" });
  return (
    <form action={formAction}>
      <input name="title" defaultValue={state.title} />
      {state.error && <p role="alert">{state.error}</p>}
      <Submit />
    </form>
  );
}
\`\`\`

📌 **Interview term:** the list itself stays a **Server Component**. It is not passed anything and holds no state — <code>revalidatePath</code> makes the server re-render it, and the new markup streams back to replace that segment.

## 4. Verified: the React pieces underneath

The framework parts were not executed here, but everything this composes **was**, elsewhere in this collection:

\`\`\`
a function passed to <form action> received FormData:  "hello"
useActionState returns [state, formAction, isPending], length 3
one submit produced TWO renders: old state + pending, then the new state
useFormStatus inside the form saw pending=true while the parent saw false
React reset the uncontrolled form after the action resolved
\`\`\`

📌 **Interview term:** that last one matters here. React **clears an uncontrolled form on success**, which is why the example feeds <code>state.title</code> back into <code>defaultValue</code> — so a **failed** submit keeps what the user typed while a successful one starts clean.

## 5. Revalidation: by path or by tag

| Call | Use when |
| :--- | :--- |
| <code>revalidatePath("/todos")</code> | You know exactly which route is affected |
| <code>revalidateTag("todos")</code> | Several routes show this data and you tagged the fetches |
| Neither | The data was never cached — but check, do not assume |

📌 **Interview term:** **tags scale better.** A path call means every place that displays the data has to be remembered at every mutation site. Tagging the read once and invalidating the tag keeps that knowledge in one place.

## 6. The rest of the workflow

**Redirect after success** — a server-side call inside the action, not a client router push, so it happens as part of the same response.

**Errors** — catch inside and **return** them, as above. Throwing reaches an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a> and blanks the region over a missing title.

**Instant feedback** — <a href="PASTE_USE_OPTIMISTIC_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useOptimistic</code></a> renders the new item immediately and reconciles when the server responds.

**Security** — the action is a **public endpoint**; authenticate, authorise and validate inside it.

## 7. Common Pitfalls

- **Forgetting to revalidate.** The write succeeds and the UI stays stale.
- **Revalidating the wrong path.** Same symptom, harder to spot.
- **Throwing validation errors.** Return them as state instead.
- **Losing the user's input on failure.** Return the values and feed them to <code>defaultValue</code>.
- **Calling <code>useFormStatus</code> in the component that renders the form.** Verified: it reads false forever.
- **Skipping the auth check.** The endpoint exists whether or not you render the button.
- **Using an action to read data.** They are uncached POSTs; reads belong in a Server Component.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Describe the shape:</strong> <span style="color:#f0e2c8;">"The mutation is a use server function passed straight to the form's action prop. No route file, no fetch, no client state for the request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Immediately name the second step:</strong> <span style="color:#f0e2c8;">"A mutation is write then invalidate. After the write I revalidate by path or tag, or the page keeps rendering cached data and it looks like nothing happened."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say how the list updates:</strong> <span style="color:#f0e2c8;">"The server re-renders that segment and streams the new markup back. The list stays a Server Component — no client refetch and no client state for it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Handle failure properly:</strong> <span style="color:#f0e2c8;">"Validation errors get caught and returned as state through useActionState, with the submitted values so nothing is lost — React clears an uncontrolled form on success."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on security:</strong> <span style="color:#f0e2c8;">"And the action is a public endpoint, so auth and validation go inside it. Not rendering the button protects nothing."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The write succeeds but the list does not change. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Almost always a missing or wrong revalidation. The list is a Server Component rendered from cached data, and nothing told the cache it is stale — so the server happily serves the same markup. Reloading the page fixes it temporarily, which is the tell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Path or tag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Path when one route is obviously affected and you want it explicit. Tags once the same data appears in several places — you tag the read once and every mutation invalidates the tag, instead of each mutation site having to remember the full list of routes that display it. The path approach rots as the app grows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make it feel instant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">useOptimistic — render the new item immediately from the submitted values and let React reconcile when the server responds and the segment re-renders. Worth it for something like adding a comment where the round trip is noticeable; unnecessary for a fast mutation where a disabled button is honest enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the redirect go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the action, as a server-side call, so it is part of the same response rather than a client navigation you trigger afterwards. That also means it works in the pre-hydration case where the form posted natively and there is no client router to push to.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server Action** | A <code>"use server"</code> function called from the client |
| **Revalidation** | Marking cached server output stale |
| **By path** | Invalidate one route |
| **By tag** | Invalidate everything reading tagged data |
| **Segment re-render** | The server rebuilding part of the page |

---
**Conclusion:** the mutation is a <code>"use server"</code> function passed straight to <code>&lt;form action&gt;</code> — no route file, no fetch, no client state for the request. The part that separates a complete answer from a half one is that a mutation is **two steps**: **write, then revalidate**, by path or by tag. Skip the second and the write succeeds while the page keeps rendering cached data, which is the classic "it worked but nothing changed". Once revalidated the server re-renders that segment and streams the new markup back, so the list stays a Server Component with no client refetch. Return validation errors as state with the submitted values — React clears an uncontrolled form on success — and remember the action is a **public endpoint** that must check auth itself. **Not executed here:** no Next.js server in this repo.`,
    examples: [
      {
        label: "The full mutation flow, with the revalidation step made visible",
        runnable: true,
        code: `import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

// No Next.js server here, so the cache and revalidation are simulated in
// memory — but the shape is exactly the real one, and the point is what
// happens when you FORGET step two.

const db = { todos: [{ id: 1, title: "existing todo" }] };
let cache = { todos: null, stale: true };

// Stands in for a Server Component reading cached data.
function readTodosFromCache() {
  if (cache.stale) {
    cache.todos = db.todos.map((t) => ({ ...t }));   // "server re-render"
    cache.stale = false;
  }
  return cache.todos;
}
const revalidatePath = () => { cache.stale = true; };

function Submit() {
  // Must be INSIDE the form — in the component that renders the form it
  // would read false forever.
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Adding…" : "Add"}</button>;
}

export default function App() {
  const [revalidate, setRevalidate] = useState(true);
  const [, forceRead] = useState(0);

  const [state, formAction] = useActionState(
    // Reducer signature: previous state first, FormData second.
    async (previous, formData) => {
      const title = String(formData.get("title") || "").trim();
      await new Promise((r) => setTimeout(r, 500));

      // Validation failures are RETURNED with the input, not thrown.
      if (!title) return { error: "Title is required", title, n: previous.n };

      db.todos.push({ id: Date.now(), title });          // 1. WRITE

      if (revalidate) revalidatePath("/todos");          // 2. INVALIDATE

      forceRead((n) => n + 1);
      return { error: null, title: "", n: previous.n + 1 };
    },
    { error: null, title: "", n: 0 },
  );

  const todos = readTodosFromCache();

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 500 }}>
      <label style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
        <input type="checkbox" checked={revalidate} onChange={(e) => setRevalidate(e.target.checked)} />
        {" "}call <code>revalidatePath</code> after the write
      </label>

      <form action={formAction} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <input
          name="title"
          defaultValue={state.title}
          placeholder="a new todo — try submitting it empty too"
          style={{ width: "100%", marginBottom: 6 }}
        />
        {state.error && <div role="alert" style={{ color: "#a33", fontSize: 13 }}>⚠ {state.error}</div>}
        <Submit />
      </form>

      <h4 style={{ margin: "14px 0 4px", fontSize: 14 }}>
        The list (a "Server Component" reading cache)
      </h4>
      <ul style={{ fontSize: 13, margin: 0 }}>
        {todos.map((t) => <li key={t.id}>{t.title}</li>)}
      </ul>
      <p style={{ fontSize: 12, color: "#666" }}>
        rows in the database: <strong>{db.todos.length}</strong> · rows the page
        is showing: <strong>{todos.length}</strong> · successful writes:{" "}
        <strong>{state.n}</strong>
      </p>

      <p style={{ fontSize: 13, color: "#666" }}>
        Untick the box and add a todo. The write succeeds — the database count
        goes up — and the list does not change, because nothing told the cache
        it was stale. That is the entire "it worked but nothing happened" bug,
        and it is the half of the answer candidates usually leave out.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Describe the benefits of using TypeScript with React.",
    seoDescription:
      "Props become a contract the compiler checks. Five real diagnostics captured from a wrong component usage, including a typo caught with Did you mean label.",
    description: `**Question presented to candidate:**
"What does TypeScript actually buy you in a React codebase?"

**What a strong answer should cover:**
- **Props become a checked contract.** A component's prop types are its API, and every call site is verified against it — wrong types, missing required props, and values outside a union are all compile errors.
- **Typos in prop names are caught**, which JSX otherwise swallows silently: an unknown prop just does nothing.
- **State setters are typed**, so \`setCount("many")\` fails rather than corrupting state at runtime.
- **Discriminated unions model impossible states away** — a loading union means you cannot read \`data\` before checking the status.
- **Refactoring becomes mechanical.** Rename a prop and every call site errors; that is the difference between a rename and an audit.
- **Editor support is the daily win** — autocomplete for props, jump to definition, inline docs. Often more valuable in practice than the error catching.
- Honest costs: build and check time, typing complexity for generic components, and \`any\` quietly reintroducing every problem.
- The rule of thumb: type the **boundaries** — props, API responses, context values — and let inference handle the interior.

**Clarifying questions expected:**
- "Is this a new codebase or a migration?" — the answers differ substantially.
- "How strict are we willing to be?" — \`strict\` off removes most of the value.

**Code / implementation expected:** Optional. Showing a props type and a discriminated union is enough.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic TypeScript familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is **five real compiler diagnostics**, produced by running the **TypeScript 7.0.2 installed in this repo** over a deliberately wrong component usage — exact codes and messages, not paraphrases.

## 1. Why This Even Matters — A Story First

A plug and a socket agree on a shape. You cannot put a three-pin plug into a two-pin socket, and nobody considers that a restriction — it is the mechanism that stops you connecting things that will not work.

JSX without types is a socket that accepts anything. Push in whatever you like; it fits. You find out later, from a user.

## 2. The Core Idea

📌 **Interview term:** a component's **props are its API**, and TypeScript makes that API **checked**. Every usage is verified against the declaration, at compile time, everywhere in the codebase at once.

\`\`\`tsx
type BadgeProps = { label: string; count: number; tone?: "info" | "warn" };

function Badge({ label, count, tone = "info" }: BadgeProps) {
  return <span data-tone={tone}>{label}: {count}</span>;
}
\`\`\`

Five lines, and every call site now has to be correct.

## 3. Verified: five real diagnostics

That component, used wrongly five ways, checked with the repo's own compiler:

\`\`\`
1. <Badge label="items" count="3" />
   TS2322: Type 'string' is not assignable to type 'number'.

2. <Badge label="items" />
   TS2741: Property 'count' is missing in type '{ label: string; }'
           but required in type 'BadgeProps'.

3. <Badge label="items" count={n} tone="danger" />
   TS2322: Type '"danger"' is not assignable to type '"info" | "warn" | undefined'.

4. <Badge lable="items" count={n} />
   TS2322: Property 'lable' does not exist on type
           'IntrinsicAttributes & BadgeProps'. Did you mean 'label'?

5. <button onClick={() => setN("many")}>
   TS2345: Argument of type 'string' is not assignable to parameter
           of type 'SetStateAction<number>'.
\`\`\`

📌 **Interview term:** number **4** is the one worth citing in an interview. In plain JSX, <code>lable</code> is simply **ignored** — no error, no warning, and the badge renders with an empty label. It is a silent bug that survives code review because it looks right. TypeScript catches it **and suggests the correction**.

📌 **Interview term:** number **5** shows the checking is not limited to props. The state setter is typed from the initial value, so <code>useState(0)</code> produces a setter that rejects a string.

## 4. Modelling impossible states away

The larger win is not catching typos — it is **making bad states unrepresentable**.

\`\`\`tsx
// ❌ Every combination is possible, including nonsense.
type State = { loading: boolean; data?: User; error?: Error };

// ✅ A discriminated union: exactly three shapes, and no others.
type State =
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error };
\`\`\`

📌 **Interview term:** with the union, reading <code>state.data</code> before narrowing on <code>status</code> is a **compile error**. The bug where a component renders <code>data.name</code> while still loading stops being possible rather than becoming a thing you remember to guard.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="A boolean shape allows nonsense combinations while a union allows only valid ones">
  <defs>
    <marker id="ts-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Which states can even exist</text>
  <text class="d-text" x="70" y="76" text-anchor="middle">booleans</text>
  <rect class="d-box-muted" x="150" y="46" width="118" height="46" rx="8"/>
  <text class="d-sub" x="209" y="74" text-anchor="middle">loading</text>
  <rect class="d-box-muted" x="278" y="46" width="118" height="46" rx="8"/>
  <text class="d-sub" x="337" y="74" text-anchor="middle">has data</text>
  <rect class="d-box" x="406" y="46" width="240" height="46" rx="8"/>
  <text class="d-sub" x="526" y="74" text-anchor="middle">loading AND error AND data</text>
  <text class="d-text d-accent" x="70" y="164" text-anchor="middle">union</text>
  <rect class="d-box-accent" x="150" y="134" width="118" height="46" rx="8"/>
  <text class="d-sub" x="209" y="162" text-anchor="middle">loading</text>
  <rect class="d-box-accent" x="278" y="134" width="118" height="46" rx="8"/>
  <text class="d-sub" x="337" y="162" text-anchor="middle">success</text>
  <rect class="d-box-accent" x="406" y="134" width="118" height="46" rx="8"/>
  <text class="d-sub" x="465" y="162" text-anchor="middle">error</text>
  <rect class="d-box-muted" x="534" y="134" width="112" height="46" rx="8"/>
  <text class="d-sub" x="590" y="162" text-anchor="middle">nothing else</text>
</svg>

## 5. Refactoring, and the editor

📌 **Interview term:** rename a prop and **every call site becomes a compile error**. Without types, renaming a prop is an audit — grep, hope, and find the one in a rarely-visited route six weeks later. With types it is mechanical, and that is what makes large refactors tractable at all.

📌 **Interview term:** and the honest day-to-day answer is **the editor**. Autocomplete for a component's props, jump to definition, inline documentation on hover, and errors as you type rather than at build. Most engineers get more value per hour from that than from the bugs prevented — worth saying, because it is true and it is not the textbook answer.

## 6. The costs, honestly

| Cost | Reality |
| :--- | :--- |
| Build and check time | Real; noticeable on a large codebase |
| Generic components | Genuinely fiddly to type well |
| Third-party types | Sometimes wrong or missing |
| <code>any</code> | Silently reintroduces every problem |
| Learning curve | Real, and front-loaded |

📌 **Interview term:** the failure mode to name is **<code>any</code> as an escape valve**. A codebase with types everywhere and <code>any</code> at the boundaries has the build cost and none of the guarantees. <code>unknown</code> plus narrowing is the honest version.

📌 **Interview term:** and without <code>strict</code>, <code>null</code> and <code>undefined</code> are assignable to everything — which removes most of the value. "We use TypeScript" and "we use TypeScript in strict mode" are different claims.

## 7. Common Pitfalls

- **<code>any</code> at the boundaries.** Cost without benefit; prefer <code>unknown</code> and narrow.
- **Not enabling <code>strict</code>.** Null-safety is most of the point.
- **Booleans where a union belongs.** Impossible states stay representable.
- **Typing everything, including inferable locals.** Noise; type the boundaries.
- **Trusting an API response's declared type.** It is a claim about the network — validate at runtime.
- **Casting with <code>as</code> to silence an error.** That is an assertion, not a check.
- **Believing it catches runtime errors.** It checks types, not logic.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame props as an API:</strong> <span style="color:#f0e2c8;">"A component's props are its API, and TypeScript makes that API checked at every call site — wrong types, missing required props, values outside a union."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the silent-bug example:</strong> <span style="color:#f0e2c8;">"A misspelled prop name in plain JSX is just ignored — the component renders with it missing. TypeScript errors and suggests the correction. I have that exact diagnostic."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Go beyond typos:</strong> <span style="color:#f0e2c8;">"The bigger win is modelling impossible states away — a discriminated union for loading, success and error means you cannot read data before narrowing on the status."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the refactoring benefit:</strong> <span style="color:#f0e2c8;">"Rename a prop and every call site errors. That turns a rename from an audit into a mechanical change, which is what makes big refactors possible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be honest about the costs:</strong> <span style="color:#f0e2c8;">"Build time, fiddly generics, and any silently undoing all of it. And without strict mode you lose most of the null-safety, which is the bulk of the value."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the single biggest win?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Confident refactoring. Bug prevention is real but a good test suite competes with it; nothing else tells you every one of four hundred call sites that a prop changed shape. That is what lets a team keep changing a large codebase instead of accreting around it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type an API response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Carefully, because a declared type there is a claim about something you do not control. Annotating a fetch result is an assertion, not a check — the server can send anything. For anything important I validate at runtime with a schema library and derive the type from the schema, so the type and the check cannot drift apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is it not worth it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuine throwaway prototype, or a team with no TypeScript experience under a hard deadline — the learning curve is front-loaded and real. Anything with more than one maintainer or a life beyond a few weeks, the balance goes the other way quickly, mostly because of the refactoring point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What should you NOT type explicitly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Local variables and most return types, where inference is better than what you would write and stays correct as the code changes. Type the boundaries — props, context values, API shapes, function parameters — and let the interior infer. Annotating everything is noise that has to be maintained.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Props type** | The checked API of a component |
| **Discriminated union** | Variants distinguished by a shared tag field |
| **Narrowing** | Proving which variant you have before using it |
| **<code>strict</code>** | The flag that makes null-safety real |
| **<code>any</code>** | Opting out of checking entirely |
| **<code>unknown</code>** | Unchecked input you must narrow before using |

---
**Conclusion:** TypeScript turns a component's props into a **checked contract** enforced at every call site. Verified against this repo's own compiler, a deliberately wrong usage produced five real diagnostics — a string where a number was required, a missing required prop, a value outside a union, a **misspelled prop name that plain JSX would silently ignore** (caught with "Did you mean 'label'?"), and a bad argument to a state setter. Beyond that, discriminated unions make **impossible states unrepresentable**, and typed props make renames **mechanical rather than an audit** — which is the biggest win on a large codebase, with editor support the biggest win day to day. The costs are real: build time, fiddly generics, and <code>any</code> quietly removing every guarantee — so enable <code>strict</code>, type the boundaries, and let inference handle the interior.`,
    examples: [
      {
        label: "The five diagnostics, with the fixed version beside each",
        runnable: true,
        code: `import { useState } from "react";

// This playground runs JavaScript, so none of the errors below are enforced
// here — which is precisely the point. Each row shows what plain JSX does with
// a mistake, and the exact diagnostic TypeScript produced for it.

const BADGE_TYPE = \`type BadgeProps = {
  label: string;
  count: number;
  tone?: "info" | "warn";
};\`;

const CASES = [
  {
    wrong: '<Badge label="items" count="3" />',
    right: '<Badge label="items" count={3} />',
    error: "TS2322: Type 'string' is not assignable to type 'number'.",
    js: "renders 'items: 3' — looks fine until you do arithmetic on it",
  },
  {
    wrong: '<Badge label="items" />',
    right: '<Badge label="items" count={0} />',
    error: "TS2741: Property 'count' is missing in type '{ label: string; }' but required in type 'BadgeProps'.",
    js: "renders 'items: ' with nothing after it",
  },
  {
    wrong: '<Badge label="items" count={n} tone="danger" />',
    right: '<Badge label="items" count={n} tone="warn" />',
    error: "TS2322: Type '\\"danger\\"' is not assignable to type '\\"info\\" | \\"warn\\" | undefined'.",
    js: "sets data-tone='danger', which no stylesheet matches — silently unstyled",
  },
  {
    wrong: '<Badge lable="items" count={n} />',
    right: '<Badge label="items" count={n} />',
    error: "TS2322: Property 'lable' does not exist on type 'IntrinsicAttributes & BadgeProps'. Did you mean 'label'?",
    js: "renders ': 3' — the typo is IGNORED entirely. The worst one.",
  },
  {
    wrong: 'onClick={() => setN("many")}',
    right: 'onClick={() => setN(n + 1)}',
    error: "TS2345: Argument of type 'string' is not assignable to parameter of type 'SetStateAction<number>'.",
    js: "state becomes the string 'many'; the next n + 1 gives 'many1'",
  },
];

export default function App() {
  const [i, setI] = useState(3);
  const c = CASES[i];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 620 }}>
      <pre style={{ background: "#eef", border: "1px solid #ccd", borderRadius: 8, padding: 10, fontSize: 12 }}>
{BADGE_TYPE}
      </pre>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        {CASES.map((_, n) => (
          <button key={n} onClick={() => setI(n)} style={{ fontWeight: n === i ? "bold" : "normal" }}>
            case {n + 1}
          </button>
        ))}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, fontSize: 13 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#a33" }}>❌ </span><code>{c.wrong}</code>
        </div>
        <div style={{ background: "#fdf0f0", border: "1px solid #e0b4b4", borderRadius: 6, padding: 8,
                      fontSize: 12, fontFamily: "ui-monospace, monospace", marginBottom: 8 }}>
          {c.error}
        </div>
        <div style={{ marginBottom: 8, color: "#666", fontSize: 12 }}>
          <strong>without types:</strong> {c.js}
        </div>
        <div>
          <span style={{ color: "#161" }}>✅ </span><code>{c.right}</code>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        Case 4 is the one to remember. An unknown prop in JSX is not an error —
        it is simply dropped, so the component renders with a missing label and
        nothing anywhere tells you. Every diagnostic above was produced by
        actually compiling this component with the wrong usage.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you test React components?",
    seoDescription:
      "Test what the user does, not how it is built. Verified: against a pure refactor a byRole assertion still passed while byTestId and CSS-class ones broke.",
    description: `**Question presented to candidate:**
"How do you decide what to test in a React component, and what do you avoid testing?"

**What a strong answer should cover:**
- Test **behaviour, not implementation**. Render the component, interact with it the way a user would, and assert on what is visible — not on state, not on which hooks ran.
- The concrete test of whether you got that right: a **pure refactor must not break the test**. If restyling the markup breaks it, the test was coupled to implementation.
- **Query priority matters**: prefer accessible queries — by role with an accessible name, by label, by text — over test ids, and never CSS classes. Role queries double as an accessibility check.
- \`getBy\` throws if not found, \`queryBy\` returns null (use it to assert absence), \`findBy\` is async (use it for anything that appears later).
- Use \`userEvent\` over raw \`fireEvent\` where available — it simulates the full interaction sequence rather than dispatching one synthetic event.
- The pyramid in practice: many small **unit/component tests**, some **integration tests** across a few components, few **end-to-end tests** for critical journeys.
- Do not test the library — that a \`useState\` updates is React's problem. Test the behaviour it produces.
- Mock at the **network boundary** rather than mocking your own modules, so the test exercises real component wiring.

**Clarifying questions expected:**
- "Is this a shared component or a page-level flow?" — that changes the level to test at.
- "Do we have accessible names on these controls?" — if not, the test problem is really an accessibility problem.

**Code / implementation expected:** Optional. One good test is more convincing than a description.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic testing familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is **executed** — the same three assertions run against a component and against a **pure refactor** of it, using the Testing Library version installed in this repo.

## 1. Why This Even Matters — A Story First

A restaurant inspector could grade a kitchen two ways.

**Order a meal, eat it, judge the result.** If the food is good and arrives hot, the kitchen works. Rearrange the kitchen tomorrow and the grade is unaffected — as long as the food is still good.

**Check that the pans are in the third drawer.** Also a rule. But move the pans and the kitchen "fails", having become no worse at cooking.

Most bad React tests check the drawer.

## 2. The Core Idea

📌 **Interview term:** test **behaviour, not implementation**. Render, interact as a user would, assert on what is visible. Do not reach for internal state, hook calls, or which component re-rendered.

📌 **Interview term:** the practical test of whether you achieved that is the **refactor test** — a change that alters the markup but not the behaviour **must not break the test**. That is not a slogan; it is checkable, and section 3 checks it.

## 3. Verified: the refactor test, run

The same counter in two versions. **V2 is a pure refactor**: identical behaviour, restyled markup — the paragraph became a span, the class names changed to hashed module names, the test id is gone.

The same three assertions against each:

\`\`\`
                                        V1      V2
byRole (what the user sees)             PASS    PASS
byTestId (an implementation hook)       PASS    FAIL — Unable to find an element by:
                                                       [data-testid="count-display"]
by CSS class (pure implementation)      PASS    FAIL — Unable to find an element with
                                                       class .count
\`\`\`

📌 **Interview term:** all three tests passed on V1, so all three "worked". Only one of them was testing the **component** rather than its **current markup** — and you cannot tell which until something changes. That is exactly the situation a real refactor puts you in, except the failures arrive as a morning of debugging tests that were never testing anything real.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="A role based query survives a refactor while test id and class queries break">
  <defs>
    <marker id="tq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Same behaviour, restyled markup</text>
  <rect class="d-box-muted" x="230" y="44" width="220" height="40" rx="9"/>
  <text class="d-sub" x="340" y="70" text-anchor="middle">a pure refactor</text>
  <path class="d-edge-accent" d="M 300 88 L 200 124" marker-end="url(#tq-arrow)"/>
  <path class="d-edge" d="M 380 88 L 480 124" marker-end="url(#tq-arrow)"/>
  <rect class="d-box-accent" x="30" y="128" width="290" height="66" rx="10"/>
  <text class="d-text d-accent" x="175" y="152" text-anchor="middle">getByRole, name Increment</text>
  <text class="d-sub" x="175" y="172" text-anchor="middle">still passes</text>
  <text class="d-sub" x="175" y="188" text-anchor="middle">it asked for what the user sees</text>
  <rect class="d-box" x="360" y="128" width="290" height="66" rx="10"/>
  <text class="d-text" x="505" y="152" text-anchor="middle">getByTestId, querySelector</text>
  <text class="d-sub" x="505" y="172" text-anchor="middle">both fail</text>
  <text class="d-sub" x="505" y="188" text-anchor="middle">they asked about the markup</text>
</svg>

## 4. Query priority, and why role comes first

📌 **Interview term:** prefer queries in this order — **by role** with an accessible name, **by label text**, **by text**, then **by test id** as a deliberate last resort. **Never** a CSS class.

Verified, a role query matches on the **accessible name**, not the text content:

\`\`\`
<button aria-label="Close dialog">×</button>
getByRole("button", { name: /close dialog/i })  ->  matched, textContent is "×"
\`\`\`

📌 **Interview term:** that is the hidden benefit. A role query only finds a control that is **exposed to assistive technology**. If your test cannot find the button by its accessible name, a screen-reader user cannot find it either — so the query priority is an accessibility check you get for free.

| Query | Returns | Use for |
| :--- | :--- | :--- |
| <code>getBy…</code> | Throws if not found | Something that must be there now |
| <code>queryBy…</code> | <code>null</code> if not found | Asserting **absence** |
| <code>findBy…</code> | A promise | Something that appears **later** |

📌 **Interview term:** using <code>getBy</code> to assert absence is the classic error — it throws instead of returning nothing, so the test fails for the wrong reason.

## 5. What not to test

- **The library.** That <code>useState</code> updates is React's problem, not your test suite's.
- **Internal state.** Assert on the rendered result the state produces.
- **Implementation details** — which hooks ran, how many renders happened, prop identity.
- **Styling**, beyond what changes behaviour. That is what visual regression tools are for.

📌 **Interview term:** the guiding question is "**would a user notice if this broke?**" If not, the test is protecting a decision rather than a behaviour, and it will cost you on the next refactor.

## 6. Levels, and where to mock

**Component tests** for a single unit's behaviour — most of your tests. **Integration tests** across a few components working together, which catch the wiring bugs unit tests miss. **End-to-end tests** for a handful of critical journeys, because they are slow and flaky in proportion to their coverage.

📌 **Interview term:** mock at the **network boundary**, not your own modules. Intercepting HTTP means the component, its hooks, its state handling and its error paths all run for real; mocking your own data-fetching module means the test passes with the wiring broken.

## 7. Common Pitfalls

- **Querying by CSS class or test id first.** Verified: both break on a pure refactor.
- **<code>getBy</code> for absence.** It throws; use <code>queryBy</code>.
- **Missing <code>await</code> on <code>findBy</code>.** It returns a promise.
- **Asserting on state or render counts.** Implementation, not behaviour.
- **Mocking your own modules.** The test then verifies the mock.
- **Testing that React works.** Not your job.
- **A test that a refactor breaks.** It was coupled; that is the whole diagnostic.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the principle:</strong> <span style="color:#f0e2c8;">"Test behaviour, not implementation. Render it, interact the way a user would, assert on what is visible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the checkable version:</strong> <span style="color:#f0e2c8;">"The test of that is a pure refactor. I have run it — restyle the markup and a byRole assertion still passes while byTestId and a CSS-class query both fail."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the query priority:</strong> <span style="color:#f0e2c8;">"By role with an accessible name first, then label, then text, then a test id as a last resort. Never a class."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention the free benefit:</strong> <span style="color:#f0e2c8;">"Role queries match the accessible name, so if my test cannot find the button, a screen-reader user cannot either. The priority order is an accessibility check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say what you skip and where you mock:</strong> <span style="color:#f0e2c8;">"I do not test that React works or assert on internal state, and I mock at the network boundary so the component's real wiring runs."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a test id acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there is genuinely nothing accessible to query — a purely decorative container, or a chart canvas with no text. It is an escape hatch rather than a default, and reaching for it often is a signal that the UI is hard to query because it is hard to use, which is worth fixing instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getBy</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queryBy</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">findBy</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">getBy throws when nothing matches, which gives a good failure message for something that must be present. queryBy returns null, which is the only one you can use to assert something is absent. findBy returns a promise and retries, for anything that appears after an async update — and forgetting to await it is a common source of tests that pass when they should not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you mock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the network boundary, by intercepting HTTP. Then the component, its hooks, its loading and error states and its wiring all execute for real and only the server is fake. Mocking your own data module skips exactly the code most likely to be wrong, and the test will keep passing after you break the integration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually through a component that uses it, since that is how it will actually be consumed and it keeps the test behavioural. For a genuinely standalone hook with complex logic, renderHook is reasonable — but if most of your tests are hook tests, the logic has probably drifted away from the UI it exists to serve.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Behavioural test** | Asserts what a user can observe |
| **The refactor test** | A pure refactor must not break it |
| **Accessible name** | What assistive technology calls a control |
| **<code>queryBy</code>** | Returns null; the one for asserting absence |
| **<code>findBy</code>** | Async, retries; for content appearing later |
| **Network-boundary mocking** | Faking HTTP, not your own modules |

---
**Conclusion:** test **behaviour, not implementation** — render, interact as a user would, assert on what is visible. That principle has a checkable form: a **pure refactor must not break the test**, and running exactly that showed a <code>byRole</code> assertion still passing on the refactored component while <code>byTestId</code> and a CSS-class query both failed. All three passed before the refactor, which is why you cannot tell a coupled test from a good one until something changes. Prefer **role with an accessible name**, then label, then text, with a test id as a deliberate last resort — role queries only find controls exposed to assistive technology, so the priority order doubles as an accessibility check. Use <code>queryBy</code> for absence and <code>findBy</code> for anything async, do not test that React works, and mock at the **network boundary** so the component's real wiring runs.`,
    examples: [
      {
        label: "The refactor test: one component, two versions, three assertions",
        runnable: true,
        code: `import { useState } from "react";

// The playground cannot run a test runner, so this reproduces the experiment
// live: the same three query strategies, applied to two versions of the same
// component. V2 is a PURE REFACTOR — identical behaviour, restyled markup.

function CounterV1() {
  const [n, setN] = useState(0);
  return (
    <div className="counter-box">
      <p data-testid="count-display" className="count">Count: {n}</p>
      <button className="btn-primary" onClick={() => setN((v) => v + 1)}>Increment</button>
    </div>
  );
}

function CounterV2() {
  const [n, setN] = useState(0);
  return (
    <section className="Counter_root__x7f2a">
      <span className="Counter_value__9bd1c" role="status">Count: {n}</span>
      <button className="Counter_button__2ke9x" onClick={() => setN((v) => v + 1)}>Increment</button>
    </section>
  );
}

// The three query strategies, run against whatever is in the container.
const STRATEGIES = [
  {
    name: "by role + accessible name",
    good: true,
    run: (root) => {
      const btn = [...root.querySelectorAll("button")]
        .find((b) => /increment/i.test(b.textContent || b.getAttribute("aria-label") || ""));
      if (!btn) throw new Error("no button with the accessible name Increment");
      return "found: " + JSON.stringify(btn.textContent);
    },
  },
  {
    name: "by test id",
    good: false,
    run: (root) => {
      const el = root.querySelector('[data-testid="count-display"]');
      if (!el) throw new Error('Unable to find an element by: [data-testid="count-display"]');
      return "found: " + JSON.stringify(el.textContent);
    },
  },
  {
    name: "by CSS class",
    good: false,
    run: (root) => {
      const el = root.querySelector(".count");
      if (!el) throw new Error("Unable to find an element with class .count");
      return "found: " + JSON.stringify(el.textContent);
    },
  },
];

export default function App() {
  const [v2, setV2] = useState(false);
  const [results, setResults] = useState(null);

  const check = () => {
    const root = document.getElementById("subject");
    setResults(STRATEGIES.map((s) => {
      try { return { name: s.name, good: s.good, ok: true, detail: s.run(root) }; }
      catch (e) { return { name: s.name, good: s.good, ok: false, detail: e.message }; }
    }));
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => { setV2(false); setResults(null); }} style={{ fontWeight: !v2 ? "bold" : "normal" }}>
          V1 (original)
        </button>
        <button onClick={() => { setV2(true); setResults(null); }} style={{ fontWeight: v2 ? "bold" : "normal" }}>
          V2 (pure refactor)
        </button>
        <button onClick={check}>run the three assertions</button>
      </div>

      <div id="subject" style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        {v2 ? <CounterV2 /> : <CounterV1 />}
      </div>

      {results && results.map((r) => (
        <div key={r.name} style={{
          border: "1px solid " + (r.ok ? "#cde3cd" : "#e0b4b4"),
          background: r.ok ? "#f2f9f2" : "#fdf0f0",
          borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 13,
        }}>
          <strong>{r.ok ? "PASS" : "FAIL"}</strong> · {r.name}
          <div style={{ fontSize: 12, color: "#555" }}>{r.detail}</div>
        </div>
      ))}

      <p style={{ fontSize: 13, color: "#666" }}>
        Run the assertions against V1: all three pass, so all three look like
        good tests. Switch to V2 — same behaviour, restyled markup — and run
        them again. Only the one that asked for what the <em>user</em> sees
        survives. That is the diagnostic for whether a test is coupled to
        implementation, and you can only apply it by actually refactoring.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle routing in React applications?",
    seoDescription:
      "React ships no router. The real decision is whether routing is a client concern or a server one, because that determines where your data loading lives.",
    description: `**Question presented to candidate:**
"React has no built-in router. How do you choose one, and what does that choice actually commit you to?"

**What a strong answer should cover:**
- **React has no router.** It renders a tree; mapping URLs to trees is a separate concern, which is why several credible options exist.
- The real fork is **client-side routing versus server-side routing**, because it decides **where data loading lives** — not which API you prefer.
- **Client routing** (React Router, TanStack Router): the URL is client state, the router swaps components, navigation is instant after load. Data loading is yours to arrange.
- **Server routing** (Next.js App Router and similar): the URL maps to files, the server can render and stream the new segment, and data loading is part of the route.
- The critical shared idea is **route-level data loading** — starting the fetch on navigation rather than after the component mounts, which is what avoids the classic waterfall.
- Every router must handle the same list: **nested layouts**, **URL params and search params**, **code splitting per route**, **pending and error states**, and **scroll restoration**.
- **Search params are state** — filters, sort order, pagination — and putting them in the URL makes them shareable, bookmarkable and back-button-correct for free.
- A tiny app may need nothing: conditional rendering on a state value is a legitimate answer for two screens.

**Clarifying questions expected:**
- "Is this content public and crawlable, or an authenticated app?" — that leans the client/server decision.
- "Do we already have a framework?" — the router usually comes with it.

**Code / implementation expected:** Optional. Naming the decision axis matters more than API syntax.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior routing knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** no client router is installed in this repo — routing here is Next.js's file-based App Router (**16.3.4** installed) — so no router API was executed. The **data-loading measurements** the argument turns on were executed and are labelled in section 4. Related: <a href="PASTE_FETCH_PATTERNS_URL_HERE" target="_blank" rel="noopener noreferrer">the three fetching patterns</a>.

## 1. Why This Even Matters — A Story First

A building has rooms. Deciding which room a visitor should be standing in is not a property of the rooms — it is a separate job, and you can do it several ways: a receptionist, a directory board, or a sign on each door.

React builds rooms. It has nothing whatsoever to say about which one you should be in.

## 2. The Core Idea

📌 **Interview term:** **React ships no router.** It maps state to a tree; mapping **URLs** to a tree is a separate concern, deliberately left out. That is why there are several credible answers rather than one blessed one.

📌 **Interview term:** and the choice that matters is not the API — it is **where routing lives**, because that determines **where data loading lives**.

| | **Client-side routing** | **Server-side routing** |
| :--- | :--- | :--- |
| Examples | React Router, TanStack Router | Next.js App Router and similar |
| The URL is | Client state | A file-system path |
| Navigation | Swap components — instant after load | Request a segment; server can render it |
| Data loading | Yours to arrange, via route loaders | Part of the route, on the server |
| First load | Bundle, then render | HTML, streamed |
| Best for | Authenticated apps, dashboards, tools | Public, crawlable, content-heavy |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Client routing swaps components in the browser while server routing requests a rendered segment">
  <defs>
    <marker id="rt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Where does the next screen come from?</text>
  <text class="d-text" x="66" y="76" text-anchor="middle">client</text>
  <rect class="d-box-muted" x="130" y="46" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="76" text-anchor="middle">URL changes</text>
  <path class="d-edge-accent" d="M 286 72 L 326 72" marker-end="url(#rt-arrow)"/>
  <rect class="d-box-accent" x="332" y="46" width="314" height="52" rx="9"/>
  <text class="d-sub" x="489" y="68" text-anchor="middle">the router swaps components already in the bundle</text>
  <text class="d-sub" x="489" y="88" text-anchor="middle">data is your job to start</text>
  <text class="d-text" x="66" y="164" text-anchor="middle">server</text>
  <rect class="d-box-muted" x="130" y="134" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="164" text-anchor="middle">URL changes</text>
  <path class="d-edge" d="M 286 160 L 326 160" marker-end="url(#rt-arrow)"/>
  <rect class="d-box" x="332" y="134" width="314" height="52" rx="9"/>
  <text class="d-sub" x="489" y="156" text-anchor="middle">the server renders the segment and streams it</text>
  <text class="d-sub" x="489" y="176" text-anchor="middle">data loading is part of the route</text>
</svg>

## 3. The idea both camps converged on

📌 **Interview term: route-level data loading** — starting the fetch **when navigation begins**, not when the component mounts. Every serious router now does this, under different names: loaders, route data, Server Components.

The reason is measurable. Executed elsewhere in this collection, with identical 120ms requests:

\`\`\`
fetch-on-render (mount, then fetch, nested)   everything visible at 279ms
render-as-you-fetch (start before rendering)  shell at 5ms, everything by 128ms
\`\`\`

📌 **Interview term:** a component that fetches in an effect **cannot** start its request until it exists, and a nested one cannot start until its parent's has resolved — the <a href="PASTE_SUSPENSE_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">waterfall</a>. The router knows where you are going **before** it renders anything, so it can start every request for that route at once. That is the whole argument for route-level loading, and it is why "which router" is really "how does data loading work here".

## 4. What every router has to solve

Whatever you pick, the same list has to be handled — and this is a good checklist to recite:

- **Nested layouts.** A shell that persists while the inner content changes, without remounting.
- **URL params** — <code>/users/:id</code> — and **search params**.
- **Code splitting per route**, so you ship one route's code, not all of them.
- **Pending states** during navigation, ideally without a <a href="PASTE_RESPONSIVE_UPDATE_URL_HERE" target="_blank" rel="noopener noreferrer">fallback flash</a> on an already-visible screen.
- **Error states** per route, so one broken page does not blank the app.
- **Scroll restoration** on back, which is invisible when right and infuriating when wrong.
- **Prefetching** on hover or viewport entry.

📌 **Interview term:** **search params are state.** Filters, sort order, pagination, an open tab — putting them in the URL rather than in <code>useState</code> makes them shareable, bookmarkable, and correct with the back button, for free. Candidates who mention this are usually the ones who have maintained something real.

## 5. Typed routes, and the smallest answer

📌 **Interview term:** the newer client routers put weight on **type-safe routing** — params and search params typed from the route definition, so a link to a route that needs an id will not compile without one. Given how often a route rename breaks a link silently, that is a real gain rather than a nicety.

And the honest small case: **two or three screens with no deep linking need no router at all**. Conditional rendering on a state value is a legitimate answer, and saying so is better than reaching for a dependency because it is expected.

## 6. Common Pitfalls

- **Thinking React has a router.** It does not, deliberately.
- **Choosing on API taste.** The decision is where data loading lives.
- **Fetching in an effect after navigation.** Verified: that is the 279ms path.
- **Filters in <code>useState</code> instead of the URL.** Unshareable, and the back button lies.
- **No code splitting per route.** The first load carries the whole app.
- **Forgetting scroll restoration.** Nobody notices it working.
- **Remounting the layout on navigation.** Nested layouts exist to avoid exactly that.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start with the fact:</strong> <span style="color:#f0e2c8;">"React has no router — it maps state to a tree, and mapping URLs to trees was deliberately left out. That is why there are several credible options."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real fork:</strong> <span style="color:#f0e2c8;">"Client-side or server-side routing — and that matters because it decides where data loading lives, not because of the API."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the convergent idea:</strong> <span style="color:#f0e2c8;">"Both camps landed on route-level data loading — start the fetch when navigation begins, not when the component mounts. That is what avoids the waterfall."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Back it with numbers:</strong> <span style="color:#f0e2c8;">"Measured on identical requests, fetching after mount in a nested tree finished at 279ms; starting before render had a shell at 5ms and everything by 128ms."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show the maintenance instinct:</strong> <span style="color:#f0e2c8;">"And search params are state — filters and sort order belong in the URL so they are shareable and the back button works. For two screens with no deep linking I would use no router at all."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React not include a router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because React is a rendering library and routing is an application concern with genuinely different right answers — a native app has no URLs at all, an embedded widget must not own them, and a content site wants the server to decide. Bundling one would have forced a single model on all of those.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is route-level data loading and why does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The router knows the destination before it renders anything, so it can start every request that route needs at once. A component fetching in an effect cannot start until it exists, and a nested one cannot start until its parent resolved — which is the waterfall. Moving the fetch to the route removes an entire class of latency that no amount of component-level optimisation touches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why put filters in the URL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because they are state that the user expects to be able to share, bookmark and go back through. In useState the URL lies about what is on screen, a copied link shows something different, and the back button leaves the page while the user expected to undo a filter. The URL gives you all of that with no extra code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever ship without a router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an embedded widget, a two-screen internal tool, or anything with no deep linking — yes, conditional rendering on a state value is genuinely sufficient. The moment someone needs to send a colleague a link to a specific view, that stops being true, and that is usually the trigger to add one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Client-side routing** | The browser swaps components; the URL is client state |
| **Server-side routing** | The URL maps to a file; the server renders the segment |
| **Route-level loading** | Starting the fetch when navigation begins |
| **Nested layout** | A shell that persists while inner content changes |
| **Search params as state** | Filters and sort order living in the URL |
| **Scroll restoration** | Returning to the previous position on back |

---
**Conclusion:** **React ships no router** — mapping URLs to trees is a separate concern, deliberately. The choice that matters is **client-side versus server-side routing**, because it decides **where data loading lives**, and both camps converged on the same important idea: **route-level data loading**, starting the fetch when navigation begins rather than when a component mounts. That is measurable — on identical requests, fetching after mount in a nested tree finished at **279ms** while starting before render had a shell at **5ms** and everything by **128ms**. Whichever you pick, the same checklist applies: nested layouts, params, per-route code splitting, pending and error states, scroll restoration, prefetching. Treat **search params as state** so filters are shareable and the back button behaves — and for two screens with no deep linking, no router is a legitimate answer.`,
    examples: [
      {
        label: "Search params as state, and a hand-rolled router for the smallest case",
        runnable: true,
        code: `import { useState, useEffect, useSyncExternalStore } from "react";

// Two things worth demonstrating without any router dependency:
// 1. the smallest possible "router" — for an app that genuinely needs none
// 2. why filters belong in the URL rather than in useState

// ── A minimal hash router, ~15 lines ───────────────────────────────────────
const hashStore = {
  subscribe(cb) {
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  },
  get: () => window.location.hash.slice(1) || "/",
  getServer: () => "/",
};
const useHash = () =>
  // The third argument is the SERVER snapshot — without it, server rendering
  // throws "Missing getServerSnapshot".
  useSyncExternalStore(hashStore.subscribe, hashStore.get, hashStore.getServer);

const parse = (hash) => {
  const [path, query = ""] = hash.split("?");
  return { path, params: new URLSearchParams(query) };
};

const ITEMS = [
  { id: 1, name: "Keyboard", tag: "input" },
  { id: 2, name: "Mouse", tag: "input" },
  { id: 3, name: "Monitor", tag: "display" },
  { id: 4, name: "Laptop", tag: "display" },
];

export default function App() {
  const hash = useHash();
  const { path, params } = parse(hash);

  // ✅ The filter lives in the URL: shareable, bookmarkable, back-button-correct.
  const urlTag = params.get("tag") || "all";
  // ❌ The same filter in component state, for contrast.
  const [stateTag, setStateTag] = useState("all");

  const go = (p, q) => { window.location.hash = p + (q ? "?" + q : ""); };

  const shown = ITEMS.filter((i) => urlTag === "all" || i.tag === urlTag);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <nav style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["/", "/about"].map((p) => (
          <button key={p} onClick={() => go(p)} style={{ fontWeight: path === p ? "bold" : "normal" }}>
            {p}
          </button>
        ))}
      </nav>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        {path === "/about" ? (
          <p style={{ fontSize: 13, margin: 0 }}>
            An about page. Fifteen lines of router, no dependency — genuinely
            enough for two or three screens with no deep linking.
          </p>
        ) : (
          <>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>✅ filter in the URL:</strong>{" "}
              {["all", "input", "display"].map((t) => (
                <button key={t} onClick={() => go("/", t === "all" ? "" : "tag=" + t)}
                        style={{ fontWeight: urlTag === t ? "bold" : "normal", marginRight: 4 }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>❌ the same filter in useState:</strong>{" "}
              {["all", "input", "display"].map((t) => (
                <button key={t} onClick={() => setStateTag(t)}
                        style={{ fontWeight: stateTag === t ? "bold" : "normal", marginRight: 4 }}>
                  {t}
                </button>
              ))}
            </div>
            <ul style={{ fontSize: 13, margin: 0 }}>
              {shown.map((i) => <li key={i.id}>{i.name} <em style={{ color: "#888" }}>({i.tag})</em></li>)}
            </ul>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#666", marginTop: 8, fontFamily: "ui-monospace, monospace" }}>
        location.hash = {JSON.stringify(hash)}
      </p>

      <p style={{ fontSize: 13, color: "#666" }}>
        Change the URL filter, then press the browser back button — it undoes
        the filter, and the address bar always describes what is on screen. Do
        the same with the state filter: back leaves the page entirely, and a
        copied link shows a different view than the one you were looking at.
        That is why search params are state.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you structure a large React application?",
    seoDescription:
      "Organise by feature, not by file type. Enforce the boundaries with lint rules, not convention, and keep shared genuinely shared, not a dumping ground.",
    description: `**Question presented to candidate:**
"You are starting a codebase several teams will work in for years. How do you organise it?"

**What a strong answer should cover:**
- **Organise by feature, not by file type.** Grouping every component in \`/components\` and every hook in \`/hooks\` means one change touches five folders and nothing is co-located.
- A feature folder owns its **components, hooks, types, tests and data access**, and exposes a **deliberate public surface** — usually a single index — so its internals stay internal.
- **Dependency direction is the real architecture**: features may depend on shared, shared may never depend on a feature, and features should not reach into each other's internals.
- **Enforce it with tooling.** Import-boundary lint rules turn a convention into a check; without them the structure decays under deadline pressure.
- **Colocation beats categorisation** — a component's test, styles and types belong beside it, so deleting the feature deletes all of it.
- Keep a genuine **shared layer** for design-system components and cross-cutting utilities, and be strict about entry: shared code is code that is genuinely reusable, not code nobody knew where to put.
- **State placement**: server state in a data-fetching layer, URL state in the URL, local UI state in the component. A global store is for the little that is genuinely global.
- Structure serves **change**: the test is whether a new engineer can find, modify and delete a feature confidently.

**Clarifying questions expected:**
- "How many teams, and will they own separate areas?" — that changes how hard the boundaries need to be.
- "Is there a framework with its own routing conventions?" — that constrains the top level.

**Code / implementation expected:** No. A folder tree and the dependency rules are the answer.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes practical experience.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** this is an architecture question with no runtime behaviour to measure, so nothing here was executed and none of it is presented as measured. Where a claim rests on something measurable elsewhere in this collection, it links to it.

## 1. Why This Even Matters — A Story First

Two ways to organise a workshop.

**By tool type.** All screwdrivers in one drawer, all clamps in another, all glue on a shelf. Beautifully tidy — and building one chair means opening nine drawers, and nobody can tell you which tools that chair actually needed.

**By job.** A box per project with everything that job requires. Less tidy in the abstract, far faster in practice — and when the job is finished, you throw away one box and know nothing was left behind.

Codebases have exactly this choice, and the tidy-looking option is the one that hurts.

## 2. The Core Idea

📌 **Interview term: organise by feature, not by file type.** The <code>/components</code>, <code>/hooks</code>, <code>/utils</code> layout groups files by **what they are** rather than **what they are for** — so any real change touches several folders and no folder tells you what the application does.

\`\`\`
❌ by type                        ✅ by feature
src/                              src/
  components/                       features/
    CheckoutForm.tsx                  checkout/
    ProductCard.tsx                     CheckoutForm.tsx
    UserAvatar.tsx                      useCheckout.ts
  hooks/                                checkout.api.ts
    useCheckout.ts                      checkout.types.ts
    useProduct.ts                       CheckoutForm.test.tsx
  api/                                  index.ts        <- the public surface
    checkout.ts                     catalogue/
    products.ts                       products/
  types/                            shared/
    checkout.ts                       ui/               <- design system
                                      lib/              <- genuine utilities
\`\`\`

📌 **Interview term:** the payoff is **deletability**. Removing checkout means deleting one folder. Under the left-hand layout it means finding its pieces in five places and hoping.

## 3. Dependency direction is the architecture

📌 **Interview term:** folders are cosmetic; **which direction imports may point** is the actual structure.

- **Features may depend on shared.**
- **Shared may never depend on a feature.**
- **Features should not reach into another feature's internals** — only its public surface, if at all.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Features depend on shared but shared never depends on a feature">
  <defs>
    <marker id="ar-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Allowed directions</text>
  <rect class="d-box-muted" x="30" y="46" width="170" height="46" rx="9"/>
  <text class="d-sub" x="115" y="74" text-anchor="middle">checkout</text>
  <rect class="d-box-muted" x="255" y="46" width="170" height="46" rx="9"/>
  <text class="d-sub" x="340" y="74" text-anchor="middle">catalogue</text>
  <rect class="d-box-muted" x="480" y="46" width="170" height="46" rx="9"/>
  <text class="d-sub" x="565" y="74" text-anchor="middle">account</text>
  <path class="d-edge-accent" d="M 115 98 L 300 142" marker-end="url(#ar-arrow)"/>
  <path class="d-edge-accent" d="M 340 98 L 340 142" marker-end="url(#ar-arrow)"/>
  <path class="d-edge-accent" d="M 565 98 L 382 142" marker-end="url(#ar-arrow)"/>
  <rect class="d-box-accent" x="200" y="146" width="280" height="52" rx="10"/>
  <text class="d-text d-accent" x="340" y="170" text-anchor="middle">shared: ui, lib</text>
  <text class="d-sub" x="340" y="190" text-anchor="middle">never imports a feature</text>
</svg>

📌 **Interview term:** and the sentence that separates an experienced answer — **enforce it with lint rules, not with a document**. Import-boundary rules make a violation a failed build. A convention in a README is a convention until the first deadline, and then it is a memory.

## 4. The rules that keep it healthy

**A public surface per feature.** An <code>index.ts</code> exporting what other code may use. Everything else is internal, and the lint rule forbids deep imports past it. That is what makes internal refactoring safe.

**Colocation beats categorisation.** The test, the styles, the types belong **beside** the component. If deleting a feature leaves orphans elsewhere, the layout is wrong.

📌 **Interview term:** **a strict door on <code>shared</code>.** The failure mode is universal: <code>shared</code> becomes the folder for anything with no obvious home, then everything depends on it and nothing can move. The entry test is "**is this genuinely used by two or more features, and would a new team understand it without context?**" If not, it stays in the feature.

## 5. State placement

📌 **Interview term:** most "state management" problems are **placement** problems, not library problems.

| Kind of state | Where it belongs |
| :--- | :--- |
| Server data | A data-fetching layer with caching — not a global store |
| Filters, sort, pagination, current tab | **The URL** — see <a href="PASTE_ROUTING_URL_HERE" target="_blank" rel="noopener noreferrer">routing</a> |
| Form input | The form, usually <a href="PASTE_CONTROLLED_UNCONTROLLED_URL_HERE" target="_blank" rel="noopener noreferrer">uncontrolled</a> |
| Whether this panel is open | Local component state |
| Theme, current user, locale | Context, or a small global store |

📌 **Interview term:** the historical mistake is putting **server data in a global store** and hand-writing caching, invalidation and loading flags around it. Almost everything people mean by "our state management is a mess" is that.

## 6. What structure is actually for

📌 **Interview term:** structure serves **change**, not tidiness. The honest test is three questions about a new engineer:

- Can they **find** where a feature lives, from its name alone?
- Can they **change** it without reading unrelated code?
- Can they **delete** it and be confident nothing is left behind?

If yes, the structure works — whatever the folder names are.

📌 **Interview term:** and it should be **allowed to evolve**. Starting with a strict feature layout in a three-file prototype is as much a mistake as never adopting one. Split when a folder gets hard to navigate, extract to <code>shared</code> when a second feature genuinely needs something — not in anticipation.

## 7. Common Pitfalls

- **Organising by file type.** Every change touches five folders.
- **<code>shared</code> as a dumping ground.** Everything depends on it; nothing can move.
- **Boundaries by convention only.** No lint rule means no boundary.
- **Deep imports past a feature's index.** Internals become everyone's dependency.
- **Server data in a global store.** You end up rebuilding a caching library.
- **Circular feature dependencies.** Usually a missing shared concept.
- **Structuring a prototype like a platform.** Ceremony with no benefit yet.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the organising principle:</strong> <span style="color:#f0e2c8;">"By feature, not by file type. A components folder and a hooks folder group things by what they are rather than what they are for, so every real change touches five folders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define a feature:</strong> <span style="color:#f0e2c8;">"It owns its components, hooks, types, tests and data access, and exposes a deliberate public surface. Everything else is internal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real architecture:</strong> <span style="color:#f0e2c8;">"Folders are cosmetic — dependency direction is the structure. Features depend on shared; shared never depends on a feature; features do not reach into each other."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say how you enforce it:</strong> <span style="color:#f0e2c8;">"With import-boundary lint rules, so a violation fails the build. A rule in a README survives until the first deadline."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the test:</strong> <span style="color:#f0e2c8;">"Can a new engineer find a feature from its name, change it without reading unrelated code, and delete it cleanly? If so the structure works, whatever it is called."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does something move into <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shared</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a second feature genuinely needs it — not in anticipation. And it has to survive the entry test: would a new team understand it without knowing the feature it came from? If it still carries assumptions from its origin, moving it just spreads those assumptions across the codebase and makes them harder to remove later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop the structure decaying?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the rules executable. Import-boundary lint rules that forbid deep imports past a feature index and forbid shared importing a feature turn the architecture into something CI checks. Everything enforced only by review erodes, because the person under deadline pressure is not the person who wrote the guidelines.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does state management fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly it is a placement question rather than a library one. Server data goes in a fetching layer with caching, filters and pagination go in the URL, form input stays in the form, and a genuinely global store handles the small remainder — theme, session, locale. The classic mess is server data in a global store with hand-written caching and loading flags around it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this overkill for a small app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and imposing it on a prototype is its own mistake — ceremony with no benefit. Structure should evolve: split a folder when it gets hard to navigate, extract to shared when a second consumer appears. The thing to avoid is the opposite failure, where nobody ever revisits the flat layout and it is four hundred files before anyone notices.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Feature folder** | A vertical slice owning everything it needs |
| **Public surface** | The index other code may import from |
| **Dependency direction** | Which layers may import which |
| **Colocation** | Keeping related files together |
| **Import-boundary rule** | A lint rule enforcing the direction |

---
**Conclusion:** organise **by feature, not by file type** — a feature folder owning its components, hooks, types, tests and data access, exposing a deliberate **public surface** so its internals stay internal and deleting it deletes all of it. The actual architecture is **dependency direction**: features may depend on shared, shared may never depend on a feature, and features do not reach into each other. **Enforce that with import-boundary lint rules rather than a document**, because a convention lasts until the first deadline. Keep a strict door on <code>shared</code> so it does not become the folder for things with no home, and treat most state-management questions as **placement** — server data in a fetching layer, filters in the URL, UI state local. The test of any structure is whether a new engineer can find, change and delete a feature confidently. **Nothing here was executed** — it is an architecture answer, and it is presented as one.`,
    examples: [
      {
        label: "The two layouts side by side, with the import rules that keep one healthy",
        runnable: true,
        code: `import { useState } from "react";

const BY_TYPE = \`src/
  components/
    CheckoutForm.tsx        <- checkout
    OrderSummary.tsx        <- checkout
    ProductCard.tsx         <- catalogue
    Button.tsx              <- genuinely shared
  hooks/
    useCheckout.ts          <- checkout
    useProducts.ts          <- catalogue
  api/
    checkout.ts             <- checkout
    products.ts             <- catalogue
  types/
    checkout.ts             <- checkout
    product.ts              <- catalogue
  __tests__/
    CheckoutForm.test.tsx   <- checkout

# "Delete the checkout feature" means finding SIX files across five folders,
# and nothing in the tree tells you which ones belong together.\`;

const BY_FEATURE = \`src/
  features/
    checkout/
      CheckoutForm.tsx
      OrderSummary.tsx
      useCheckout.ts
      checkout.api.ts
      checkout.types.ts
      CheckoutForm.test.tsx
      index.ts              <- the ONLY thing other features may import
    catalogue/
      ProductCard.tsx
      useProducts.ts
      products.api.ts
      index.ts
  shared/
    ui/Button.tsx           <- design system
    lib/formatMoney.ts      <- genuine utility
  app/
    routes.tsx

# "Delete the checkout feature" means deleting one folder.\`;

const RULES = [
  ["features/* → shared/*", true, "the normal direction"],
  ["features/checkout → features/catalogue (via index)", null, "allowed, but a smell if frequent"],
  ["features/checkout → features/catalogue/useProducts", false, "deep import past the public surface"],
  ["shared/* → features/*", false, "inverts the dependency; shared becomes unmovable"],
  ["features/* → features/* (circular)", false, "usually a missing shared concept"],
];

export default function App() {
  const [feature, setFeature] = useState(true);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 620 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setFeature(false)} style={{ fontWeight: !feature ? "bold" : "normal" }}>
          ❌ by file type
        </button>
        <button onClick={() => setFeature(true)} style={{ fontWeight: feature ? "bold" : "normal" }}>
          ✅ by feature
        </button>
      </div>

      <pre style={{ background: feature ? "#f2f9f2" : "#fdf0f0", border: "1px solid #ddd",
                    borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{feature ? BY_FEATURE : BY_TYPE}
      </pre>

      <h4 style={{ margin: "14px 0 6px" }}>The import rules — enforce these with lint, not a README</h4>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {RULES.map(([rule, ok, why]) => (
            <tr key={rule} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "3px 8px 3px 0", fontFamily: "ui-monospace, monospace" }}>{rule}</td>
              <td style={{ color: ok === true ? "#161" : ok === false ? "#a33" : "#a60", whiteSpace: "nowrap" }}>
                {ok === true ? "allow" : ok === false ? "forbid" : "allow, watch"}
              </td>
              <td style={{ color: "#666" }}>{why}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: "#666" }}>
        The folder layout is the visible half; the import rules are the half
        that actually holds. Without a lint rule forbidding deep imports and
        shared-to-feature imports, both layouts converge on the same tangle
        within a year — the second one just takes slightly longer.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
