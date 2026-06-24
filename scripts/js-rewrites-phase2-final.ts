/**
 * Phase 2 — Final batch: the last 16 stubs across Async&modules, Functions&classes,
 * Scope&misc, and Other. TL;DR + SVG + table + tip + example. Network/module/DOM
 * examples are `runnable:false` (can't run in the in-page worker); the rest run.
 *
 *   npx tsx scripts/js-rewrites-phase2-final.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

type Example = { label: string; code: string; runnable?: boolean };
type Rewrite = { title: string; answer: string; examples: Example[] };

const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px;background:rgba(245,158,11,0.05)">\n${svg}\n</div>`;

const REWRITES: Rewrite[] = [
  // ═══ Async & modules ════════════════════════════════════════════════════
  {
    title: "How do you make an AJAX request?",
    answer: `**Core concept (TL;DR).** AJAX (Asynchronous JavaScript And XML) is the technique of exchanging data with a server **in the background** and updating the page without a full reload. The original API is <code>XMLHttpRequest</code> (XHR); the modern, Promise-based replacement is <code>fetch</code>, and libraries like Axios wrap either.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Talk to the server in the background; update in place</text>
  <rect x="20" y="48" width="150" height="80" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="95" y="74" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">Page (JS)</text>
  <text x="95" y="98" fill="currentColor" font-size="9" text-anchor="middle">no full reload</text>
  <rect x="350" y="48" width="150" height="80" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="425" y="74" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">Server / API</text>
  <text x="425" y="98" fill="currentColor" font-size="9" text-anchor="middle">JSON response</text>
  <path d="M 172 74 L 348 74" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#aj-a)"/>
  <text x="260" y="66" fill="currentColor" font-size="9" text-anchor="middle">async request</text>
  <path d="M 348 102 L 172 102" fill="none" stroke="#22c55e" stroke-width="1.5" marker-end="url(#aj-a)"/>
  <text x="260" y="118" fill="#22c55e" font-size="9" text-anchor="middle">data → update DOM</text>
  <defs><marker id="aj-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The page issues an HTTP request from JavaScript and, when the response arrives, updates only the affected part of the UI — no navigation. With <code>fetch</code> you call <code>fetch(url)</code>, await the <code>Response</code>, then parse the body (<code>.json()</code>). XHR is the older, event-driven, callback-based equivalent. Despite the "XML" in the name, the payload today is almost always **JSON**.

### AJAX options
| Approach | Style |
| --- | --- |
| <code>fetch</code> | promise-based, built-in (modern default) |
| <code>XMLHttpRequest</code> | callback/event-based (legacy) |
| Axios / ky | library wrappers, nicer ergonomics |

> **Interview tip:** Say AJAX is a *technique*, not an API — today it's done with <code>fetch</code>/<code>async-await</code>. Mention that "XML" is historical; JSON is the norm.`,
    examples: [
      {
        label: "fetch (modern) vs XMLHttpRequest (legacy)",
        runnable: false,
        code: `// Modern AJAX with fetch + async/await
async function loadUser(id) {
  const res = await fetch("/api/users/" + id);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// The legacy equivalent with XMLHttpRequest
const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/users/1");
xhr.responseType = "json";
xhr.onload = () => { if (xhr.status === 200) console.log(xhr.response); };
xhr.onerror = () => console.error("network error");
xhr.send();`,
      },
    ],
  },

  {
    title: "How does `try...catch` work in JavaScript?",
    answer: `**Core concept (TL;DR).** <code>try</code> wraps code that might throw; if anything inside throws, control jumps to <code>catch</code> with the error; an optional <code>finally</code> block runs **either way** (success or failure). It only catches **synchronous** throws — and rejected promises you <code>await</code> — not errors thrown later in async callbacks.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">try → (throw?) → catch → finally (always)</text>
  <rect x="30" y="48" width="120" height="44" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="90" y="68" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">try</text>
  <text x="90" y="84" fill="currentColor" font-size="8.5" text-anchor="middle">risky code</text>
  <rect x="200" y="48" width="120" height="44" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444"/>
  <text x="260" y="68" fill="#ef4444" font-size="10.5" font-weight="700" text-anchor="middle">catch (e)</text>
  <text x="260" y="84" fill="currentColor" font-size="8.5" text-anchor="middle">on throw</text>
  <rect x="370" y="48" width="120" height="44" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="430" y="68" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">finally</text>
  <text x="430" y="84" fill="currentColor" font-size="8.5" text-anchor="middle">always runs</text>
  <path d="M 150 70 L 198 70" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#tc-a)"/>
  <path d="M 320 70 L 368 70" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#tc-a)"/>
  <text x="260" y="126" fill="currentColor" font-size="9.5" text-anchor="middle">catches sync throws + awaited rejections — NOT async callbacks</text>
  <defs><marker id="tc-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** When code in <code>try</code> throws (manually with <code>throw</code>, or from a built-in like <code>JSON.parse</code>), the engine stops and runs <code>catch</code> with the thrown value (usually an <code>Error</code> with <code>name</code>/<code>message</code>/<code>stack</code>). <code>finally</code> always executes — ideal for cleanup. With <code>async/await</code>, a rejected awaited promise behaves like a sync throw, so you can wrap <code>await</code> in <code>try...catch</code>. But a throw inside a <code>setTimeout</code>/event callback runs on a later turn and escapes the original <code>try</code> — handle those where they actually run.

### Pieces & limits
| Part | Role |
| --- | --- |
| <code>try</code> | code that may throw |
| <code>catch (e)</code> | runs on a thrown error |
| <code>finally</code> | always runs (cleanup) |
| catches | sync throws + <code>await</code>ed rejections |
| misses | throws in async callbacks/timers |

> **Interview tip:** Two depth points: <code>finally</code> runs even if <code>try</code>/<code>catch</code> <code>return</code>s; and <code>try...catch</code> can't catch async-callback errors — use it around <code>await</code>, or attach <code>.catch()</code> to the promise.`,
    examples: [
      {
        label: "Sync throw, finally, and awaited rejection",
        runnable: true,
        code: `function parse(json) {
  try { return JSON.parse(json); }
  catch (err) { return { error: err.name }; }
  finally { console.log("attempted"); }       // always runs
}
console.log(parse('{"ok":true}'));   // attempted → { ok: true }
console.log(parse("oops"));           // attempted → { error: "SyntaxError" }

// async/await: a rejected promise IS catchable with try...catch
(async () => {
  try { await Promise.reject(new Error("boom")); }
  catch (e) { console.log("caught async:", e.message); } // "boom"
})();`,
      },
    ],
  },

  {
    title: "How does the fetch API work?",
    answer: `**Core concept (TL;DR).** <code>fetch(url, options)</code> returns a **Promise** that resolves to a <code>Response</code> object. You read the body with another promise-returning method (<code>.json()</code>, <code>.text()</code>, <code>.blob()</code>). The big gotcha: <code>fetch</code> only **rejects** on a network failure — an HTTP <code>404</code>/<code>500</code> still *resolves*, so you must check <code>response.ok</code> yourself.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">fetch → Response → body (two promises)</text>
  <rect x="20" y="50" width="140" height="44" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="90" y="70" fill="#3b82f6" font-size="10" font-weight="700" text-anchor="middle">fetch(url)</text>
  <text x="90" y="86" fill="currentColor" font-size="8.5" text-anchor="middle">Promise&lt;Response&gt;</text>
  <rect x="190" y="50" width="140" height="44" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/>
  <text x="260" y="70" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle">res.ok? status</text>
  <text x="260" y="86" fill="currentColor" font-size="8.5" text-anchor="middle">check it!</text>
  <rect x="360" y="50" width="140" height="44" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="430" y="70" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">res.json()</text>
  <text x="430" y="86" fill="currentColor" font-size="8.5" text-anchor="middle">Promise&lt;data&gt;</text>
  <path d="M 160 72 L 188 72" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#fe-a)"/>
  <path d="M 330 72 L 358 72" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#fe-a)"/>
  <text x="260" y="128" fill="#ef4444" font-size="9.5" text-anchor="middle">404/500 do NOT reject — only network errors do</text>
  <defs><marker id="fe-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** A basic GET is <code>const res = await fetch(url); const data = await res.json();</code>. For other methods you pass options: <code>method</code>, <code>headers</code>, and a <code>body</code> (often <code>JSON.stringify(...)</code>). Reading the body is itself async because the response can stream. Because non-2xx responses resolve normally, robust code checks <code>if (!res.ok) throw ...</code>. Other notes: <code>fetch</code> doesn't send cookies cross-origin unless <code>credentials: "include"</code>, and you cancel it with an <code>AbortController</code>.

### fetch essentials
| Step / option | Detail |
| --- | --- |
| <code>await fetch(url)</code> | resolves to a <code>Response</code> |
| <code>res.ok</code> / <code>res.status</code> | check before trusting |
| <code>await res.json()</code> | parse the body (a promise) |
| <code>method/headers/body</code> | configure POST/PUT |
| <code>AbortController</code> | cancel an in-flight request |

> **Interview tip:** The classic gotcha to volunteer: <code>fetch</code> does **not** reject on 4xx/5xx — always check <code>res.ok</code>. Add: body parsing is async, and you need <code>AbortController</code> for cancellation/timeouts.`,
    examples: [
      {
        label: "GET, error-check, and POST JSON",
        runnable: false,
        code: `// GET with proper error handling (fetch won't reject on 404/500!)
async function getUser(id) {
  const res = await fetch("/api/users/" + id);
  if (!res.ok) throw new Error("HTTP " + res.status); // must check ok
  return res.json();                                    // body parse is async
}

// POST JSON
async function createUser(data) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// cancel with AbortController
const ctrl = new AbortController();
fetch("/slow", { signal: ctrl.signal });
ctrl.abort();`,
      },
    ],
  },

  {
    title: "What are modules in JavaScript?",
    answer: `**Core concept (TL;DR).** Modules let you split code into separate files that explicitly **export** values and **import** them elsewhere. Each ES module has its **own scope** (no global pollution), runs **once** (cached as a singleton), is always in **strict mode**, and loads **deferred**.

${card(`<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">export from one file, import into another</text>
  <rect x="30" y="46" width="180" height="80" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="120" y="68" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">math.js</text>
  <text x="120" y="90" fill="currentColor" font-size="9" text-anchor="middle">export const add = ...</text>
  <text x="120" y="110" fill="currentColor" font-size="9" text-anchor="middle">export default ...</text>
  <rect x="310" y="46" width="180" height="80" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="400" y="68" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">app.js</text>
  <text x="400" y="90" fill="currentColor" font-size="9" text-anchor="middle">import { add } from "./math"</text>
  <text x="400" y="110" fill="currentColor" font-size="9" text-anchor="middle">own scope · runs once</text>
  <path d="M 210 86 L 308 86" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#mo-a)"/>
  <defs><marker id="mo-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** You expose values with **named** exports (<code>export const x</code>) and/or one **default** export per file, and pull them in with <code>import</code>. Because each module is evaluated once and its exports are cached, modules act as singletons — great for shared config/state. Imports are *live bindings* (you see later updates to an exported <code>let</code>), and you can lazy-load on demand with the async <code>import()</code> function for code-splitting. In the browser you opt in with <code>&lt;script type="module"&gt;</code>.

### Module mechanics
| Feature | Behaviour |
| --- | --- |
| Scope | per-file (no globals) |
| Exports | named + one default |
| Evaluation | once, cached (singleton) |
| Mode | always strict |
| Dynamic load | <code>await import("./x.js")</code> |

> **Interview tip:** Note that imports are **live read-only bindings** (not copies), modules run in **strict mode** automatically, and <code>import()</code> enables lazy code-splitting. Contrast static <code>import</code> (hoisted, top-level) with dynamic <code>import()</code> (a promise, anywhere).`,
    examples: [
      {
        label: "named, default, and dynamic import",
        runnable: false,
        code: `// math.js — named + default exports
export const add = (a, b) => a + b;
export const PI = 3.14159;
export default function multiply(a, b) { return a * b; }

// app.js — import them
import multiply, { add, PI } from "./math.js";
console.log(add(2, 3), PI, multiply(2, 4)); // 5 3.14159 8

// rename + namespace import
import { add as sum } from "./math.js";
import * as math from "./math.js";

// dynamic import for lazy code-splitting (returns a promise)
const { add: lazyAdd } = await import("./math.js");`,
      },
    ],
  },

  {
    title: "What is the difference between ES modules and CommonJS?",
    answer: `**Core concept (TL;DR).** They're two module systems. **ES Modules (ESM)** are the official standard — <code>import</code>/<code>export</code>, statically analysable, asynchronous, used in browsers and modern Node. **CommonJS (CJS)** is Node's original system — <code>require</code>/<code>module.exports</code>, dynamic, and synchronous.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">The standard (ESM) vs Node's original (CJS)</text>
  <rect x="20" y="44" width="230" height="104" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">ES Modules</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">import / export</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">static · async</text>
  <text x="135" y="126" fill="currentColor" font-size="9.5" text-anchor="middle">browser + modern Node</text>
  <rect x="270" y="44" width="230" height="104" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="385" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">CommonJS</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">require / module.exports</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">dynamic · synchronous</text>
  <text x="385" y="126" fill="currentColor" font-size="9.5" text-anchor="middle">Node (legacy default)</text>
</svg>`)}

**How it works.** ESM imports are **static** — they're resolved before execution, which enables *tree-shaking* (dead-code elimination) and live bindings; they're also asynchronous and support top-level <code>await</code>. CJS <code>require</code> is a synchronous function call that returns <code>module.exports</code>, so it's dynamic (you can <code>require</code> conditionally) but harder to tree-shake. In Node you select ESM via <code>"type": "module"</code> in <code>package.json</code> or the <code>.mjs</code> extension; the ecosystem is steadily moving to ESM.

### ESM vs CommonJS
| | ES Modules | CommonJS |
| --- | --- | --- |
| Syntax | <code>import</code>/<code>export</code> | <code>require</code>/<code>module.exports</code> |
| Loading | static, async | dynamic, sync |
| Bindings | live (read-only) | copied value |
| Tree-shaking | yes | hard |
| Where | browser + Node | Node (legacy) |

> **Interview tip:** Key technical contrasts: ESM is **static** (enables tree-shaking + top-level <code>await</code>) and exports **live bindings**, whereas CJS is **dynamic/synchronous** and returns a value copy. Mention the Node interop friction (<code>"type": "module"</code>, <code>.mjs</code>/<code>.cjs</code>).`,
    examples: [
      {
        label: "Same module, two systems",
        runnable: false,
        code: `// ── ES Modules (the standard) ──
export const add = (a, b) => a + b;
export default function multiply(a, b) { return a * b; }
import multiply, { add } from "./math.js";

// ── CommonJS (Node legacy) ──
const add2 = (a, b) => a + b;
module.exports = { add: add2 };
module.exports.multiply = (a, b) => a * b;
const { add: addCjs } = require("./math.js");

// ESM resolves imports statically (tree-shakeable, supports top-level await);
// CJS require() is a synchronous function call resolved at runtime.`,
      },
    ],
  },

  // ═══ Functions & classes ════════════════════════════════════════════════
  {
    title: "What are private class fields?",
    answer: `**Core concept (TL;DR).** Private class fields are members prefixed with <code>#</code> that are accessible **only inside the class body** — privacy enforced by the language itself, not a naming convention like a leading underscore. There are private fields (<code>#count</code>), private methods (<code>#helper()</code>), and static private members.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700"># members are reachable only inside the class</text>
  <rect x="60" y="42" width="240" height="98" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="180" y="64" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">class Counter</text>
  <text x="180" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">#count (private) ✓ here</text>
  <text x="180" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">value() reads #count</text>
  <text x="180" y="126" fill="#22c55e" font-size="9" text-anchor="middle">truly hidden</text>
  <text x="400" y="78" fill="#ef4444" font-size="10" text-anchor="middle">outside:</text>
  <text x="400" y="98" fill="#ef4444" font-size="9.5" text-anchor="middle">obj.#count →</text>
  <text x="400" y="116" fill="#ef4444" font-size="9.5" text-anchor="middle">SyntaxError</text>
</svg>`)}

**How it works.** Unlike the old <code>_underscore</code> convention (which is just a hint — the property is still public), <code>#</code> fields are **inaccessible** from outside; even attempting <code>obj.#x</code> in other code is a *syntax* error. They don't appear in <code>Object.keys</code>, <code>JSON.stringify</code>, or <code>for…in</code>, giving real encapsulation. You can also write <code>#method()</code> for private helpers and <code>static #field</code> for class-level secrets, and use <code>#x in obj</code> as a private brand-check.

### Privacy options
| Form | Privacy |
| --- | --- |
| <code>_name</code> | convention only (still public) |
| <code>#name</code> | hard private (enforced) |
| <code>#method()</code> | private method |
| <code>static #x</code> | private static member |

> **Interview tip:** Contrast hard <code>#</code> privacy with the <code>_</code> convention and closures (the pre-class way to get privacy). Note <code>#</code> fields are invisible to <code>JSON.stringify</code>/<code>Object.keys</code> — true encapsulation.`,
    examples: [
      {
        label: "Hard-private state in a class",
        runnable: true,
        code: `class Counter {
  #count = 0;                  // truly private
  #step;
  constructor(step = 1) { this.#step = step; }
  inc() { this.#count += this.#step; return this.#count; }
  get value() { return this.#count; }
}

const c = new Counter(5);
console.log(c.inc(), c.inc());   // 5 10
console.log(c.value);            // 10

// private fields are invisible from outside
console.log(Object.keys(c));     // []
console.log(JSON.stringify(c));  // {}`,
      },
    ],
  },

  {
    title: "What are static methods and properties?",
    answer: `**Core concept (TL;DR).** <code>static</code> members belong to the **class itself**, not to instances. You call them as <code>ClassName.method()</code> / read <code>ClassName.prop</code> — they're for utilities, factory functions, and constants that don't need any particular object's state.

${card(`<svg viewBox="0 0 520 152" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">static = on the class · instance = on objects</text>
  <rect x="30" y="44" width="200" height="84" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="130" y="66" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">MathUtil (the class)</text>
  <text x="130" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">static square(n)</text>
  <text x="130" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">MathUtil.square(5) ✓</text>
  <rect x="290" y="44" width="200" height="84" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="390" y="66" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">an instance</text>
  <text x="390" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">new MathUtil()</text>
  <text x="390" y="108" fill="#ef4444" font-size="9.5" text-anchor="middle">.square → undefined</text>
</svg>`)}

**How it works.** A <code>static</code> method lives on the constructor function, so it isn't on the prototype and instances don't inherit it (<code>new MathUtil().square</code> is <code>undefined</code>). Inside a static method, <code>this</code> refers to the **class**, which is why static *factory* methods (<code>User.fromJSON(...)</code>) can call <code>new this(...)</code>. Built-ins use this pattern everywhere: <code>Array.isArray</code>, <code>Object.keys</code>, <code>Math.max</code>, <code>Promise.all</code>. There are also static blocks (<code>static { ... }</code>) for complex one-time class setup.

### static vs instance
| | <code>static</code> | instance |
| --- | --- | --- |
| Lives on | the class | the prototype/object |
| Called via | <code>Class.fn()</code> | <code>obj.fn()</code> |
| <code>this</code> | the class | the instance |
| Use for | utilities, factories, constants | per-object behaviour |

> **Interview tip:** Cite real examples (<code>Array.isArray</code>, <code>Promise.all</code>) and the **factory** pattern (<code>static fromJSON</code> returning <code>new this(...)</code>). Stress that instances don't see static members.`,
    examples: [
      {
        label: "Class-level utilities + factory",
        runnable: true,
        code: `class MathUtil {
  static PI = 3.14159;
  static square(n) { return n * n; }
}
console.log(MathUtil.PI, MathUtil.square(5)); // 3.14159 25
console.log(new MathUtil().square);            // undefined — not on instances

// static factory: 'this' is the class, so new this(...) works
class User {
  constructor(name) { this.name = name; }
  static fromJSON(json) { return new this(JSON.parse(json).name); }
}
const u = User.fromJSON('{"name":"Ada"}');
console.log(u.name);                           // "Ada"`,
      },
    ],
  },

  {
    title: "What is an IIFE?",
    answer: `**Core concept (TL;DR).** An IIFE (Immediately Invoked Function Expression) is a function that's **defined and called at once**: <code>(function(){ ... })()</code>. Its purpose is to create a **private scope** so variables inside don't leak to the surrounding (historically global) scope — the classic pre-modules encapsulation trick.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Define + run instantly → an isolated private scope</text>
  <rect x="80" y="44" width="360" height="78" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="260" y="68" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">( function () { ... } )()</text>
  <text x="260" y="92" fill="currentColor" font-size="9.5" text-anchor="middle">wrap in ( ) → expression · trailing () → call now</text>
  <text x="260" y="112" fill="#22c55e" font-size="9.5" text-anchor="middle">inner vars never touch the outer scope</text>
</svg>`)}

**How it works.** Wrapping the function in parentheses turns a function *declaration* into an *expression*, and the trailing <code>()</code> invokes it immediately. Everything declared inside is scoped to that call and disappears afterward (unless returned via a closure). Before ES modules and <code>let</code>/<code>const</code>, IIFEs were the standard way to avoid polluting the global namespace, build the "module pattern" (return a public API while keeping internals private), and capture per-iteration values in <code>var</code> loops. Today block scope and modules cover most of these needs.

### Why use one
| Goal | How |
| --- | --- |
| Avoid global pollution | private scope |
| Module pattern | return a public API object |
| Run setup once | execute immediately |
| Async top-level (pre-TLA) | <code>(async () => { ... })()</code> |

> **Interview tip:** Note IIFEs are *mostly* superseded by ES modules + block scope, but still appear as <code>(async () => {})()</code> to use <code>await</code> where top-level await isn't available, and in bundled/minified output.`,
    examples: [
      {
        label: "Private scope + the module pattern",
        runnable: true,
        code: `const counter = (function () {
  let count = 0;                       // private, enclosed in the IIFE
  return { inc: () => ++count, get: () => count }; // public API
})();

console.log(counter.inc(), counter.inc()); // 1 2
console.log(counter.get());                // 2
console.log(typeof count);                  // "undefined" — never leaked

// arrow IIFE — runs immediately, returns a value
const ts = (() => Date.now())();
console.log(typeof ts);                     // "number"`,
      },
    ],
  },

  // ═══ Scope & misc ═════════════════════════════════════════════════════════
  {
    title: "What is globalThis?",
    answer: `**Core concept (TL;DR).** <code>globalThis</code> is the standard, **environment-agnostic** reference to the global object. It unifies the old environment-specific names — <code>window</code> in browsers, <code>self</code> in Web Workers, <code>global</code> in Node — so the same code works everywhere.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One name for the global object, everywhere</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="40" y="50" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="100" y="68" fill="currentColor">browser</text><text x="100" y="82" fill="currentColor">window</text>
    <rect x="200" y="50" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="260" y="68" fill="currentColor">worker</text><text x="260" y="82" fill="currentColor">self</text>
    <rect x="360" y="50" width="120" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="420" y="68" fill="currentColor">Node</text><text x="420" y="82" fill="currentColor">global</text>
  </g>
  <text x="260" y="122" fill="currentColor" font-size="11" font-weight="700" text-anchor="middle">↓ all unified as globalThis ↓</text>
</svg>`)}

**How it works.** Before <code>globalThis</code> (ES2020), portable code had to sniff which global existed — brittle and verbose. Now <code>globalThis</code> always points at the global object for the current runtime, so it's the correct way to feature-detect (<code>typeof globalThis.fetch</code>) or define a value that must be reachable globally. Use it sparingly: relying on global state is still discouraged — prefer modules and explicit imports.

### Per-environment globals
| Environment | Legacy name |
| --- | --- |
| Browser (main) | <code>window</code> |
| Web Worker | <code>self</code> |
| Node.js | <code>global</code> |
| **All** | <code>globalThis</code> |

> **Interview tip:** Frame it as the portable replacement for <code>window</code>/<code>self</code>/<code>global</code>, ideal for library code and feature detection. Add the caveat that needing the global object often signals a design smell — prefer modules.`,
    examples: [
      {
        label: "Portable global access",
        runnable: true,
        code: `console.log(typeof globalThis);          // "object" — exists everywhere

// feature-detect without env-specific names
console.log(typeof globalThis.setTimeout); // "function"

// define something globally (use sparingly)
globalThis.APP_VERSION = "1.0.0";
console.log(globalThis.APP_VERSION);       // "1.0.0"

// in a browser globalThis === window; in a worker === self; in Node === global
console.log("unified global reference ✓");`,
      },
    ],
  },

  {
    title: "What is the temporal dead zone?",
    answer: `**Core concept (TL;DR).** The Temporal Dead Zone (TDZ) is the window between entering a scope and the line where a <code>let</code>/<code>const</code> variable is declared. The binding *exists* (it is hoisted) but is **uninitialised**, so any access during the TDZ throws a <code>ReferenceError</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Hoisted but uninitialised until the declaration line</text>
  <line x1="40" y1="92" x2="480" y2="92" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="60" y="56" fill="currentColor" font-size="9" text-anchor="middle">scope start</text>
  <rect x="60" y="78" width="200" height="28" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444"/>
  <text x="160" y="70" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">TDZ — access throws</text>
  <line x1="260" y1="70" x2="260" y2="106" stroke="#22c55e" stroke-width="2"/>
  <text x="260" y="124" fill="#22c55e" font-size="9" text-anchor="middle">let x = 1 (declared)</text>
  <rect x="260" y="78" width="200" height="28" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="360" y="70" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">usable</text>
</svg>`)}

**How it works.** All declarations are hoisted, but <code>var</code> is also **initialised** to <code>undefined</code> at the top of its function, whereas <code>let</code>/<code>const</code> are hoisted *without* initialisation. From the start of the block until execution reaches the declaration, the variable is in the TDZ and touching it (even <code>typeof</code>) throws. The TDZ exists deliberately — it turns "use before declaration" bugs into loud, immediate errors instead of silent <code>undefined</code> values, and it's what makes <code>const</code> safe (you can never read it before it's assigned).

### var vs let/const at hoist time
| | <code>var</code> | <code>let</code> / <code>const</code> |
| --- | --- | --- |
| Hoisted | yes | yes |
| Initialised early | <code>undefined</code> | no (TDZ) |
| Access before declaration | <code>undefined</code> | <code>ReferenceError</code> |
| <code>typeof</code> before decl. | <code>"undefined"</code> | throws |

> **Interview tip:** Make the distinction crisp: <code>let</code>/<code>const</code> *are* hoisted, but into a TDZ — so "not hoisted" is a common myth. The TDZ converts silent <code>undefined</code> bugs into explicit <code>ReferenceError</code>s.`,
    examples: [
      {
        label: "TDZ throws; var does not",
        runnable: true,
        code: `// let/const live in the TDZ until their declaration line
try {
  console.log(x);     // access during the TDZ
  let x = 1;
} catch (e) {
  console.log(e.name); // "ReferenceError"
}

// var is hoisted AND initialised → no TDZ, just undefined
console.log(typeof y); // "undefined" (no throw)
var y = 2;

// after the declaration, the binding is fully usable
let z = 10;
console.log(z);        // 10`,
      },
    ],
  },

  // ═══ Other ════════════════════════════════════════════════════════════════
  {
    title: "What are function composition and pipe?",
    answer: `**Core concept (TL;DR).** Both combine several small functions into one, feeding each function's output into the next. <code>compose</code> applies them **right-to-left** (math-style: <code>f(g(x))</code>); <code>pipe</code> applies them **left-to-right** (reading order). They're the backbone of point-free, functional-style data pipelines.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Chain small functions into one</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="40" y="56" width="70" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="75" y="76" fill="currentColor">x</text>
    <rect x="160" y="56" width="80" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="200" y="76" fill="currentColor">double</text>
    <rect x="290" y="56" width="80" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="330" y="76" fill="currentColor">inc</text>
    <rect x="420" y="56" width="70" height="32" rx="6" fill="#22c55e" fill-opacity="0.14" stroke="#22c55e"/><text x="455" y="76" fill="currentColor">result</text>
  </g>
  <path d="M 110 72 L 158 72" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#cp-a)"/>
  <path d="M 240 72 L 288 72" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#cp-a)"/>
  <path d="M 370 72 L 418 72" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#cp-a)"/>
  <text x="260" y="120" fill="currentColor" font-size="9.5" text-anchor="middle">pipe: left→right (shown) · compose: right→left</text>
  <defs><marker id="cp-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Each is a higher-order function that takes a list of unary functions and returns a new function. <code>pipe</code> is a <code>reduce</code> that threads the value left-to-right; <code>compose</code> is a <code>reduceRight</code> that threads it right-to-left. Composing pure unary functions keeps logic small, testable, and reusable — the same idea behind Unix pipes, Redux middleware, and RxJS operators. Most utility libraries (Lodash/fp, Ramda) ship both.

### compose vs pipe
| | <code>compose</code> | <code>pipe</code> |
| --- | --- | --- |
| Order | right → left | left → right |
| <code>(double, inc)(5)</code> | <code>double(inc(5))</code> = 12 | <code>inc(double(5))</code> = 11 |
| Built on | <code>reduceRight</code> | <code>reduce</code> |
| Reads like | math notation | a sequence of steps |

> **Interview tip:** Be ready to implement both in one line with <code>reduce</code>/<code>reduceRight</code>. Note the functions should be **unary** (single argument) to chain cleanly, and that <code>pipe</code> usually reads more naturally.`,
    examples: [
      {
        label: "Implement and use both",
        runnable: true,
        code: `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const double = (n) => n * 2;
const inc = (n) => n + 1;

console.log(compose(double, inc)(5)); // double(inc(5)) = 12  (right→left)
console.log(pipe(double, inc)(5));     // inc(double(5))  = 11  (left→right)

// a readable data pipeline with pipe
const shout = pipe((s) => s.trim(), (s) => s.toUpperCase(), (s) => s + "!");
console.log(shout("  hello "));         // "HELLO!"`,
      },
    ],
  },

  {
    title: "How do you deep clone an object in JavaScript?",
    answer: `**Core concept (TL;DR).** A *deep* clone copies an object **and all nested values**, so the copy shares no references with the original (mutating one never affects the other). The modern built-in is <code>structuredClone()</code>; the old trick <code>JSON.parse(JSON.stringify(x))</code> works but is lossy; spread/<code>Object.assign</code> are only **shallow**.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Shallow copies share nested refs; deep copies don't</text>
  <rect x="20" y="44" width="230" height="100" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">shallow ({...o})</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">top level copied</text>
  <text x="135" y="108" fill="#ef4444" font-size="9.5" text-anchor="middle">nested objects SHARED</text>
  <text x="135" y="128" fill="currentColor" font-size="9" text-anchor="middle">mutating nested hits both</text>
  <rect x="270" y="44" width="230" height="100" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">deep (structuredClone)</text>
  <text x="385" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">every level copied</text>
  <text x="385" y="108" fill="#22c55e" font-size="9.5" text-anchor="middle">fully independent</text>
  <text x="385" y="128" fill="currentColor" font-size="9" text-anchor="middle">handles Dates/Maps/cycles</text>
</svg>`)}

**How it works.** <code>structuredClone(value)</code> is the right default: it recursively copies nested objects and supports <code>Date</code>, <code>Map</code>, <code>Set</code>, typed arrays, and **circular references** — but not functions or DOM nodes (it throws on those). <code>JSON.parse(JSON.stringify(x))</code> is a handy one-liner but silently drops functions/<code>undefined</code>/symbols, turns <code>Date</code>s into strings, and throws on cycles. Spread and <code>Object.assign</code> copy only the first level, so nested objects remain shared.

### Cloning options
| Technique | Depth / notes |
| --- | --- |
| <code>{...o}</code> / <code>Object.assign</code> | shallow only |
| <code>JSON.parse(JSON.stringify(o))</code> | deep but lossy, no cycles |
| <code>structuredClone(o)</code> | deep, Dates/Maps/cycles ✓ (no fns) |
| library (Lodash <code>cloneDeep</code>) | deep, configurable |

> **Interview tip:** Recommend <code>structuredClone</code> as the modern default and explain the JSON method's losses (functions/<code>undefined</code>/Dates) and its failure on circular references. Remember spread is **shallow**.`,
    examples: [
      {
        label: "Shallow vs deep",
        runnable: true,
        code: `const original = { user: { name: "Ada" }, tags: ["a"], when: new Date(0) };

// shallow: nested object is SHARED
const shallow = { ...original };
shallow.user.name = "Grace";
console.log(original.user.name);  // "Grace" — leaked! (shared ref)

// deep with structuredClone — fully independent, keeps Dates
const deep = structuredClone(original);
deep.user.name = "Lin";
console.log(original.user.name, deep.user.name); // "Grace" "Lin"
console.log(deep.when instanceof Date);           // true

// JSON method is lossy: Date becomes a string
console.log(typeof JSON.parse(JSON.stringify(original)).when); // "string"`,
      },
    ],
  },

  {
    title: "What does setTimeout with 0 delay actually do?",
    answer: `**Core concept (TL;DR).** <code>setTimeout(fn, 0)</code> does **not** run <code>fn</code> immediately. It queues <code>fn</code> as a **macrotask** that runs only after the current synchronous code finishes *and* the entire microtask queue (promises) has drained. It's a way to "yield" — defer work to the next event-loop turn.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">"0ms" = after sync + all microtasks, next turn</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="30" y="54" width="130" height="40" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="95" y="72" fill="currentColor">1 · sync code</text><text x="95" y="86" fill="currentColor">runs now</text>
    <rect x="190" y="54" width="130" height="40" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="255" y="72" fill="currentColor">2 · microtasks</text><text x="255" y="86" fill="currentColor">Promise.then</text>
    <rect x="350" y="54" width="140" height="40" rx="7" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="420" y="72" fill="currentColor">3 · setTimeout(0)</text><text x="420" y="86" fill="currentColor">macrotask</text>
  </g>
  <path d="M 160 74 L 188 74" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#st-a)"/>
  <path d="M 320 74 L 348 74" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#st-a)"/>
  <defs><marker id="st-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The delay is a **minimum**, not a guarantee — the callback is placed in the macrotask (timer) queue and runs when the call stack is empty and microtasks are done. The HTML spec also clamps nested timeouts to a minimum (~4 ms after several levels). Practical uses: break a long task into chunks so the UI can paint/respond, run code *after* the current call stack unwinds, or escape a deep synchronous flow. For "after the current microtasks but ASAP," <code>queueMicrotask</code> is more precise.

### Scheduling helpers
| Call | Runs |
| --- | --- |
| sync code | immediately |
| <code>queueMicrotask</code> / <code>Promise.then</code> | after sync, before timers |
| <code>setTimeout(fn, 0)</code> | next macrotask (after microtasks) |
| <code>requestAnimationFrame</code> | before the next repaint |

> **Interview tip:** Emphasise it's deferral, not immediacy — it always runs **after** the current sync code and **all** pending microtasks. Mention the ~4 ms nested-timeout clamp and that <code>queueMicrotask</code> is the finer-grained "soon."`,
    examples: [
      {
        label: "0ms still runs last",
        runnable: true,
        code: `console.log("1: sync start");

setTimeout(() => console.log("4: setTimeout(0) — macrotask"), 0);

Promise.resolve().then(() => console.log("3: promise — microtask"));

console.log("2: sync end");

// Output proves "0ms" is deferred, not immediate:
// 1: sync start
// 2: sync end
// 3: promise — microtask   (microtasks beat timers)
// 4: setTimeout(0) — macrotask`,
      },
    ],
  },

  {
    title: "What is the Reflect API?",
    answer: `**Core concept (TL;DR).** <code>Reflect</code> is a built-in object with static methods that mirror JavaScript's internal object operations — <code>Reflect.get</code>, <code>set</code>, <code>has</code>, <code>deleteProperty</code>, <code>ownKeys</code>, <code>defineProperty</code>, and more. They do the same things as operators/<code>Object</code> methods but as **functions with consistent, predictable return values**, and they pair naturally with <code>Proxy</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Object internals, exposed as plain functions</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="30" y="50" width="150" height="36" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="105" y="66" fill="currentColor">obj.x / obj.x = v</text><text x="105" y="80" fill="currentColor">delete · in</text>
    <rect x="340" y="50" width="150" height="36" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="415" y="66" fill="currentColor">Reflect.get/set</text><text x="415" y="80" fill="currentColor">has · deleteProperty</text>
  </g>
  <path d="M 182 68 L 338 68" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#rf-a)"/>
  <text x="260" y="60" fill="currentColor" font-size="9" text-anchor="middle">function form</text>
  <text x="260" y="118" fill="currentColor" font-size="9.5" text-anchor="middle">returns booleans/values, not throws — perfect default for Proxy traps</text>
  <defs><marker id="rf-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Reflect's methods take the target as an argument: <code>Reflect.get(obj, "k")</code> instead of <code>obj.k</code>, <code>Reflect.has(obj, "k")</code> instead of <code>"k" in obj</code>. The win is consistency — <code>Reflect.defineProperty</code> returns <code>true</code>/<code>false</code> instead of throwing like <code>Object.defineProperty</code>, and <code>Reflect.ownKeys</code> returns string **and** symbol keys in one call. Its methods map one-to-one to the <code>Proxy</code> trap handlers, so inside a trap you call the matching <code>Reflect</code> method to get the default behaviour, then layer your customization.

### A few methods
| Reflect | Equivalent to |
| --- | --- |
| <code>Reflect.get(o, k)</code> | <code>o[k]</code> |
| <code>Reflect.set(o, k, v)</code> | <code>o[k] = v</code> |
| <code>Reflect.has(o, k)</code> | <code>k in o</code> |
| <code>Reflect.ownKeys(o)</code> | string + symbol keys |

> **Interview tip:** The standout use case is **Proxy traps**: each trap has a matching <code>Reflect</code> method, so <code>return Reflect.get(...args)</code> forwards the default behaviour cleanly. Mention <code>Reflect</code> returns status values instead of throwing.`,
    examples: [
      {
        label: "Reflect operations + Proxy default",
        runnable: true,
        code: `const obj = { a: 1 };
console.log(Reflect.get(obj, "a"));   // 1
Reflect.set(obj, "b", 2);
console.log(Reflect.has(obj, "b"));   // true
console.log(Reflect.ownKeys({ x: 1, y: 2 })); // ["x", "y"]

// pairs with Proxy: forward the default behaviour with Reflect
const logged = new Proxy(obj, {
  get(target, key, recv) {
    console.log("read:", key);
    return Reflect.get(target, key, recv); // default get
  },
});
console.log(logged.a);                 // logs "read: a" → 1`,
      },
    ],
  },

  {
    title: "What is the difference between arrow and regular functions?",
    answer: `**Core concept (TL;DR).** Arrow functions are not just shorter syntax — they behave differently. They have **no own <code>this</code>** (they capture it lexically), **no <code>arguments</code> object**, **cannot be used as constructors** (<code>new</code> throws), and have **no <code>prototype</code>**. Regular functions get a dynamic <code>this</code>, an <code>arguments</code> object, and can be constructed.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Same idea, different behaviour</text>
  <rect x="20" y="44" width="230" height="104" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Arrow ⇒</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">this = lexical (outer)</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">no arguments / prototype</text>
  <text x="135" y="126" fill="#ef4444" font-size="9.5" text-anchor="middle">can't be a constructor</text>
  <rect x="270" y="44" width="230" height="104" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="385" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Regular function</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">this = call-site (dynamic)</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">has arguments + prototype</text>
  <text x="385" y="126" fill="#22c55e" font-size="9.5" text-anchor="middle">usable with new</text>
</svg>`)}

**How it works.** Because an arrow captures <code>this</code> from where it's *defined*, it's the fix for "lost <code>this</code>" inside callbacks (e.g. <code>arr.map(x => this.fn(x))</code> inside a method). But that same trait makes arrows wrong for **object methods** that need the calling object as <code>this</code>, and for anything used with <code>new</code> or as a prototype method. Regular functions remain the choice for methods, constructors, generators, and when you need the <code>arguments</code> object. Arrows also can't be generators.

### Arrow vs regular
| | Arrow | Regular |
| --- | --- | --- |
| <code>this</code> | lexical (inherited) | dynamic (call-site) |
| <code>arguments</code> | none (use rest) | yes |
| <code>new</code> / constructor | no (throws) | yes |
| <code>prototype</code> | none | yes |
| Good for | callbacks, short fns | methods, constructors |

> **Interview tip:** The decisive points: arrows have **lexical <code>this</code>** (great for callbacks, wrong for methods/constructors) and **no <code>arguments</code>** (use rest params). Tie <code>this</code> back to the four binding rules — arrows opt out of all of them.`,
    examples: [
      {
        label: "Behavioural differences",
        runnable: true,
        code: `// regular functions have their own 'arguments'; arrows don't
function regular() { return arguments.length; }
console.log(regular(1, 2, 3));      // 3
const arrow = (...args) => args.length;  // arrows use rest instead
console.log(arrow(1, 2, 3));        // 3

// arrows can't construct and have no prototype
const Arrow = () => {};
console.log(Arrow.prototype);       // undefined
try { new Arrow(); } catch (e) { console.log(e.name); } // "TypeError"

// 'this': a regular method binds to its object
const obj = { v: 42, get() { return this.v; } };
console.log(obj.get());             // 42`,
      },
    ],
  },

  {
    title: "What is the difference between find and filter?",
    answer: `**Core concept (TL;DR).** Both search an array with a predicate, but <code>find</code> returns the **first matching element** (or <code>undefined</code>) and stops early, while <code>filter</code> returns a **new array of all** matches (or <code>[]</code>). Use <code>find</code> for "give me the one"; use <code>filter</code> for "give me every one."

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">find → first match (one) · filter → all matches (array)</text>
  <rect x="20" y="44" width="230" height="100" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">find</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">returns ONE element</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">stops at first match</text>
  <text x="135" y="128" fill="#3b82f6" font-size="9" text-anchor="middle">miss → undefined</text>
  <rect x="270" y="44" width="230" height="100" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">filter</text>
  <text x="385" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">returns an ARRAY</text>
  <text x="385" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">scans the whole array</text>
  <text x="385" y="128" fill="#22c55e" font-size="9" text-anchor="middle">miss → []</text>
</svg>`)}

**How it works.** <code>find</code> short-circuits on the first truthy predicate result and hands back that element, so it's the efficient choice for lookups (e.g. by id). <code>filter</code> always walks the entire array, collecting every match into a fresh array — even if there's one or none. A common inefficiency is <code>arr.filter(...)[0]</code> to get the first match; <code>find</code> does that in one step and stops early. For positions, the parallels are <code>findIndex</code> (first index) and there's no "filter index" (use <code>reduce</code>/<code>map</code>+<code>filter</code>).

### find vs filter
| | <code>find</code> | <code>filter</code> |
| --- | --- | --- |
| Returns | first element | array of all matches |
| On no match | <code>undefined</code> | <code>[]</code> |
| Stops early | yes | no (full scan) |
| Best for | single lookup | subset selection |

> **Interview tip:** Call out that <code>find</code> short-circuits and returns the element directly — prefer it over <code>filter(...)[0]</code>. And the "not found" values differ: <code>undefined</code> (find) vs <code>[]</code> (filter), which affects how you guard the result.`,
    examples: [
      {
        label: "One vs all",
        runnable: true,
        code: `const users = [
  { id: 1, active: false },
  { id: 2, active: true },
  { id: 3, active: true },
];

console.log(users.find((u) => u.active));   // { id: 2, active: true } — FIRST
console.log(users.filter((u) => u.active)); // [{id:2...}, {id:3...}] — ALL

console.log(users.find((u) => u.id === 99));   // undefined
console.log(users.filter((u) => u.id === 99)); // []

console.log(users.findIndex((u) => u.active)); // 1 (first matching index)`,
      },
    ],
  },
];

// ── patch in place ──────────────────────────────────────────────────────────
const dir = join(process.cwd(), "prisma", "data");
const files = readdirSync(dir).filter((f) => /^js-augments.*\.json$/.test(f));
const loaded = files.map((f) => ({
  f,
  arr: JSON.parse(readFileSync(join(dir, f), "utf8")) as any[],
  dirty: false,
}));

const notFound: string[] = [];
for (const rw of REWRITES) {
  const hit = loaded.find((d) => d.arr.some((x) => x.title === rw.title));
  if (!hit) {
    notFound.push(rw.title);
    continue;
  }
  const item = hit.arr.find((x) => x.title === rw.title);
  item.answer = rw.answer;
  item.examples = rw.examples;
  hit.dirty = true;
}

for (const d of loaded) {
  if (d.dirty) writeFileSync(join(dir, d.f), JSON.stringify(d.arr, null, 2));
}

console.log(
  `Patched ${REWRITES.length - notFound.length}/${REWRITES.length} answers across`,
  loaded.filter((d) => d.dirty).map((d) => d.f).join(", "),
);
if (notFound.length) console.log("NOT FOUND (title mismatch):", notFound);
