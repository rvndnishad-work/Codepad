/**
 * Phase 1 — Batch 2: rewrite the next 8 core JavaScript fundamentals from thin
 * stubs to interview-depth answers (TL;DR + inline SVG diagram + mechanism +
 * comparison table + interview tip) plus one runnable example each.
 *
 * Same patch-in-place strategy as batch 1 (see scripts/js-rewrites-batch-1.ts).
 *
 *   npx tsx scripts/js-rewrites-batch-2.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

type Example = { label: string; code: string; runnable?: boolean };
type Rewrite = { title: string; answer: string; examples: Example[] };

const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px;background:rgba(245,158,11,0.05)">\n${svg}\n</div>`;

const REWRITES: Rewrite[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the `bind`, `call`, and `apply` methods?",
    answer: `**Core concept (TL;DR).** All three let you set <code>this</code> **explicitly** when calling a function, instead of relying on the call-site. The difference is *when* and *how*: <code>call</code> invokes immediately with comma-separated args, <code>apply</code> invokes immediately with an args **array**, and <code>bind</code> returns a **new function** permanently bound to that <code>this</code> (and any preset args) for later use.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Three ways to pin 'this' onto a function</text>
  <rect x="18" y="40" width="152" height="138" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="94" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">call(obj, a, b)</text>
  <text x="94" y="92" fill="currentColor" font-size="10" text-anchor="middle">runs NOW</text>
  <text x="94" y="112" fill="currentColor" font-size="10" text-anchor="middle">args: comma list</text>
  <rect x="184" y="40" width="152" height="138" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="260" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">apply(obj, [a,b])</text>
  <text x="260" y="92" fill="currentColor" font-size="10" text-anchor="middle">runs NOW</text>
  <text x="260" y="112" fill="currentColor" font-size="10" text-anchor="middle">args: one array</text>
  <rect x="350" y="40" width="152" height="138" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="426" y="62" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">bind(obj, a)</text>
  <text x="426" y="92" fill="currentColor" font-size="10" text-anchor="middle">returns a NEW fn</text>
  <text x="426" y="112" fill="currentColor" font-size="10" text-anchor="middle">call it LATER</text>
  <text x="426" y="138" fill="#f59e0b" font-size="9" text-anchor="middle">+ partial application</text>
</svg>`)}

**How it works.** Mnemonic: **a**pply takes an **a**rray; **c**all takes a **c**omma list. Both invoke right away. <code>bind</code> doesn't invoke — it produces a copy whose <code>this</code> (and any leading arguments) are locked in, which is perfect for passing a method as a callback without losing its receiver, or for partial application.

### At a glance
| Method | Invokes? | Args form | Returns |
| --- | --- | --- | --- |
| <code>fn.call(ctx, a, b)</code> | immediately | comma list | the result |
| <code>fn.apply(ctx, [a, b])</code> | immediately | single array | the result |
| <code>fn.bind(ctx, a)</code> | no — later | comma (presets) | a new bound fn |

> **Interview tip:** The classic use of <code>bind</code> is fixing "lost <code>this</code>" when passing <code>obj.method</code> as a callback. <code>apply</code> shines when args already live in an array (e.g. <code>Math.max.apply(null, arr)</code> — though modern code prefers spread).`,
    examples: [
      {
        label: "call / apply / bind in action",
        runnable: true,
        code: `const person = { name: "Sam" };
function intro(greeting, punct) { return greeting + ", " + this.name + punct; }

console.log(intro.call(person, "Hi", "!"));      // call: comma args → "Hi, Sam!"
console.log(intro.apply(person, ["Hey", "."]));  // apply: array args → "Hey, Sam."

const sayHello = intro.bind(person, "Hello");    // bind: preset this + first arg
console.log(sayHello("?"));                       // "Hello, Sam?"

// Borrow a method onto an array-like value
function sum() {
  return Array.prototype.reduce.call(arguments, (a, b) => a + b, 0);
}
console.log(sum(1, 2, 3, 4));                      // 10`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is destructuring?",
    answer: `**Core concept (TL;DR).** *Destructuring* is syntax for unpacking values from arrays or properties from objects into distinct variables in one statement. It supports **defaults**, **renaming**, **nesting**, and a **rest** pattern — replacing piles of <code>const x = obj.x</code> boilerplate.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Unpack structures straight into variables</text>
  <rect x="20" y="44" width="180" height="124" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="110" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">user object</text>
  <text x="110" y="88" fill="currentColor" font-size="10" text-anchor="middle">name: "Ada"</text>
  <text x="110" y="108" fill="currentColor" font-size="10" text-anchor="middle">address: { city }</text>
  <text x="110" y="128" fill="currentColor" font-size="10" text-anchor="middle">(no role)</text>
  <rect x="320" y="44" width="180" height="124" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="410" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">variables</text>
  <text x="410" y="88" fill="currentColor" font-size="10" text-anchor="middle">name = "Ada"</text>
  <text x="410" y="108" fill="currentColor" font-size="10" text-anchor="middle">city = "London"</text>
  <text x="410" y="128" fill="currentColor" font-size="10" text-anchor="middle">role = "guest" (default)</text>
  <path d="M 200 100 L 318 100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#ds-a)"/>
  <text x="259" y="92" fill="currentColor" font-size="9.5" text-anchor="middle">{ } pattern</text>
  <defs><marker id="ds-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The left-hand side mirrors the shape of the data. Missing properties become <code>undefined</code> unless you give a **default**; you can **rename** with <code>{ a: b }</code>, dive into **nested** structures, and collect leftovers with <code>...rest</code>. It's everywhere in modern JS: function parameters, <code>import</code> statements, React props/hooks, and swapping variables without a temp.

### Common patterns
| Pattern | Example |
| --- | --- |
| Default value | <code>const { role = "guest" } = user</code> |
| Rename | <code>const { name: fullName } = user</code> |
| Array + skip | <code>const [first, , third] = arr</code> |
| Rest collect | <code>const [head, ...tail] = arr</code> |
| Param destructure | <code>function f({ id, page = 1 }) {}</code> |

> **Interview tip:** Mention parameter destructuring with defaults — <code>function paginate({ page = 1, size = 20 } = {})</code> — as a clean alternative to "options objects" with manual fallbacks. The trailing <code>= {}</code> guards against calling with no argument.`,
    examples: [
      {
        label: "Objects, arrays, defaults, swap",
        runnable: true,
        code: `const user = { id: 1, name: "Ada", address: { city: "London" } };

// nested + rename + default, all at once
const { name, address: { city }, role = "guest" } = user;
console.log(name, city, role);          // Ada London guest

// array: skip holes, default, rest
const [first, , third = 0, ...rest] = [10, 20, 30, 40, 50];
console.log(first, third, rest);        // 10 30 [40, 50]

// swap with no temp variable
let a = 1, b = 2;
[a, b] = [b, a];
console.log(a, b);                       // 2 1`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the spread and rest operators?",
    answer: `**Core concept (TL;DR).** They share one token, <code>...</code>, but do **opposite** jobs. **Spread** *expands* an iterable (or object) into its individual elements/properties. **Rest** *collects* multiple individual values into a single array (or object). Spread takes things apart; rest gathers them up.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Same '...', opposite directions</text>
  <text x="120" y="48" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">SPREAD — expand</text>
  <rect x="36" y="58" width="74" height="30" rx="6" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e"/>
  <text x="73" y="78" fill="currentColor" font-size="10" text-anchor="middle">[1,2,3]</text>
  <path d="M 110 73 L 150 73" fill="none" stroke="#22c55e" stroke-width="1.8" marker-end="url(#sp-a)"/>
  <g fill="currentColor" font-size="11" text-anchor="middle">
    <text x="170" y="77">1</text><text x="194" y="77">2</text><text x="218" y="77">3</text>
  </g>
  <text x="400" y="48" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">REST — collect</text>
  <g fill="currentColor" font-size="11" text-anchor="middle">
    <text x="300" y="77">2</text><text x="324" y="77">3</text><text x="348" y="77">4</text>
  </g>
  <path d="M 360 73 L 400 73" fill="none" stroke="#f59e0b" stroke-width="1.8" marker-end="url(#rs-a)"/>
  <rect x="408" y="58" width="86" height="30" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/>
  <text x="451" y="78" fill="currentColor" font-size="10" text-anchor="middle">[2,3,4]</text>
  <text x="260" y="128" fill="currentColor" font-size="10" text-anchor="middle">spread: function call, array/obj literals — values flow OUT</text>
  <text x="260" y="150" fill="currentColor" font-size="10" text-anchor="middle">rest: function params, destructuring LHS — values flow IN</text>
  <text x="260" y="174" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.8">rule of thumb: rest is always the LAST element</text>
  <defs>
    <marker id="sp-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#22c55e"/></marker>
    <marker id="rs-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker>
  </defs>
</svg>`)}

**How it works.** Position decides which one it is. In a **function call** or **array/object literal**, <code>...</code> spreads. In a **function parameter list** or on the **left side** of destructuring, <code>...</code> is rest and must come last. Spread also gives you cheap (shallow) copies — <code>[...arr]</code>, <code>{...obj}</code> — which is the idiomatic way to clone without mutating.

### Spread vs rest
| | Spread | Rest |
| --- | --- | --- |
| Job | expand into elements | gather into one array/object |
| Lives in | call args, array/obj literals | params, destructuring target |
| Example | <code>fn(...args)</code>, <code>[...a, ...b]</code> | <code>function f(...args)</code> |
| Copy idiom | <code>{ ...obj }</code> (shallow) | — |

> **Interview tip:** Flag that spread makes a **shallow** copy — nested objects are still shared by reference. For a deep clone reach for <code>structuredClone()</code>. Also note spread works on any iterable (strings, Sets, Maps), not just arrays.`,
    examples: [
      {
        label: "Expanding vs collecting",
        runnable: true,
        code: `// SPREAD — expand an iterable into elements
const nums = [1, 2, 3];
console.log(Math.max(...nums));        // 3
console.log([...nums, 4, 5]);          // [1, 2, 3, 4, 5]
console.log({ ...{ a: 1 }, b: 2 });    // { a: 1, b: 2 }  (shallow copy + merge)
console.log([..."hi"]);                // ["h", "i"]  (strings are iterable)

// REST — collect the remaining args into an array
function tally(first, ...others) {
  return { first, others };
}
console.log(tally(1, 2, 3, 4));        // { first: 1, others: [2, 3, 4] }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is lexical scoping and the scope chain?",
    answer: `**Core concept (TL;DR).** *Lexical (static) scoping* means a variable's accessibility is determined by **where it is written** in the source, not by where or how the function is later called. When a name isn't found in the current scope, the engine searches the enclosing scope, then its parent, and so on up to global — that nested lookup path is the **scope chain**.

${card(`<svg viewBox="0 0 520 198" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Lookup walks outward through nested scopes</text>
  <rect x="24" y="34" width="392" height="156" rx="10" fill="#64748b" fill-opacity="0.08" stroke="#64748b" stroke-width="1.4"/>
  <text x="40" y="52" fill="#64748b" font-size="10.5" font-weight="700">Global scope — outer</text>
  <rect x="56" y="62" width="340" height="116" rx="9" fill="#3b82f6" fill-opacity="0.09" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="72" y="80" fill="#3b82f6" font-size="10.5" font-weight="700">makeGreeter() — greeting</text>
  <rect x="88" y="90" width="288" height="78" rx="8" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="104" y="108" fill="#22c55e" font-size="10.5" font-weight="700">inner fn — who</text>
  <text x="104" y="132" fill="currentColor" font-size="10">uses who ✓ (local)</text>
  <text x="104" y="150" fill="currentColor" font-size="10">uses greeting ↑, outer ↑↑ (chain)</text>
  <path d="M 430 120 L 430 60" fill="none" stroke="#ef4444" stroke-width="1.8" marker-end="url(#ls-a)"/>
  <text x="446" y="96" fill="#ef4444" font-size="9" transform="rotate(90 446 96)">lookup direction</text>
  <defs><marker id="ls-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ef4444"/></marker></defs>
</svg>`)}

**How it works.** Scopes nest like Russian dolls. An inner function can read variables from every scope that *encloses it in the source code*, but outer scopes cannot see inward. The chain is fixed at **author time** — this is exactly the mechanism that makes closures possible, since a returned inner function carries its scope chain with it.

### Key points
| Concept | Meaning |
| --- | --- |
| Lexical scope | determined by code position, not call location |
| Scope chain | ordered list of enclosing scopes searched on lookup |
| Direction | inner → outer (never the reverse) |
| Resolves to | nearest matching binding; <code>ReferenceError</code> if none |

> **Interview tip:** Contrast lexical with *dynamic* scoping (where the call stack would decide). JS is lexically scoped for variables — but note that <code>this</code> is the famous exception: it is bound dynamically by the call-site, which is why arrow functions (lexical <code>this</code>) feel different.`,
    examples: [
      {
        label: "Inner reads outer; outer can't read inner",
        runnable: true,
        code: `const outer = "global";
function makeGreeter() {
  const greeting = "Hi";            // makeGreeter scope
  return function () {
    const who = "there";            // inner scope
    return greeting + " " + who + " (" + outer + ")"; // walks the chain
  };
}
console.log(makeGreeter()());       // "Hi there (global)"

// Outer scope cannot see an inner variable
function f() { let secret = 42; return secret; }
console.log(f());                    // 42
try {
  console.log(secret);               // not visible out here
} catch (e) {
  console.log(e.name);               // "ReferenceError"
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are `let`, `const`, and `var`? What are their differences?",
    answer: `**Core concept (TL;DR).** All three declare variables, but differ on **scope**, **hoisting/initialization**, and **reassignment**. <code>var</code> is function-scoped and hoisted as <code>undefined</code>; <code>let</code> and <code>const</code> are block-scoped and sit in a *temporal dead zone* until their declaration; <code>const</code> additionally forbids reassignment of the binding.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Scope · hoisting · reassignment</text>
  <rect x="18" y="40" width="152" height="138" rx="9" fill="#ef4444" fill-opacity="0.09" stroke="#ef4444" stroke-width="1.5"/>
  <text x="94" y="62" fill="#ef4444" font-size="12" font-weight="700" text-anchor="middle">var</text>
  <text x="94" y="88" fill="currentColor" font-size="10" text-anchor="middle">function-scoped</text>
  <text x="94" y="110" fill="currentColor" font-size="10" text-anchor="middle">hoisted = undefined</text>
  <text x="94" y="132" fill="currentColor" font-size="10" text-anchor="middle">redeclarable</text>
  <text x="94" y="154" fill="#ef4444" font-size="9.5" text-anchor="middle">legacy — avoid</text>
  <rect x="184" y="40" width="152" height="138" rx="9" fill="#3b82f6" fill-opacity="0.09" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="260" y="62" fill="#3b82f6" font-size="12" font-weight="700" text-anchor="middle">let</text>
  <text x="260" y="88" fill="currentColor" font-size="10" text-anchor="middle">block-scoped</text>
  <text x="260" y="110" fill="currentColor" font-size="10" text-anchor="middle">TDZ until declared</text>
  <text x="260" y="132" fill="currentColor" font-size="10" text-anchor="middle">reassignable</text>
  <rect x="350" y="40" width="152" height="138" rx="9" fill="#22c55e" fill-opacity="0.09" stroke="#22c55e" stroke-width="1.5"/>
  <text x="426" y="62" fill="#22c55e" font-size="12" font-weight="700" text-anchor="middle">const</text>
  <text x="426" y="88" fill="currentColor" font-size="10" text-anchor="middle">block-scoped</text>
  <text x="426" y="110" fill="currentColor" font-size="10" text-anchor="middle">TDZ until declared</text>
  <text x="426" y="132" fill="currentColor" font-size="10" text-anchor="middle">no reassignment</text>
  <text x="426" y="154" fill="#22c55e" font-size="9.5" text-anchor="middle">default choice</text>
</svg>`)}

**How it works.** All declarations are "hoisted," but only <code>var</code> is **initialized** to <code>undefined</code> at the top of its function — so reading it early is harmless but useless. <code>let</code>/<code>const</code> are hoisted *without* initialization, so reading them before their line throws a <code>ReferenceError</code> (the TDZ). <code>const</code> locks the **binding**, not the value: a <code>const</code> object can still have its properties mutated.

### Decision table
| | <code>var</code> | <code>let</code> | <code>const</code> |
| --- | --- | --- | --- |
| Scope | function | block | block |
| Hoisted as | <code>undefined</code> | TDZ | TDZ |
| Reassign | yes | yes | no |
| Redeclare in scope | yes | no | no |

> **Interview tip:** Modern guidance: <code>const</code> by default, <code>let</code> only when you must reassign, <code>var</code> essentially never. Be ready to explain that <code>const</code> prevents *rebinding*, not *mutation* — <code>const arr = []; arr.push(1)</code> is perfectly legal.`,
    examples: [
      {
        label: "Hoisting, TDZ, and const mutation",
        runnable: true,
        code: `// var is hoisted and initialized to undefined
console.log(typeof v);   // "undefined" (no error)
var v = 1;

// let/const live in the Temporal Dead Zone until declared
try {
  console.log(notYet);   // touched before declaration
  let notYet = 1;
} catch (e) {
  console.log(e.name);   // "ReferenceError"  (TDZ)
}

// const locks the binding, not the contents
const obj = { n: 1 };
obj.n = 2;               // allowed — mutating contents
console.log(obj.n);      // 2`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you convert a callback-based function to a Promise?",
    answer: `**Core concept (TL;DR).** Wrap the callback API in a <code>new Promise</code>: call the original function inside the executor, and translate its callback into <code>resolve</code> / <code>reject</code>. For Node's <code>(err, data)</code> convention, reject on <code>err</code> and resolve with <code>data</code>. This is exactly what <code>util.promisify</code> automates.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Bridge a callback API to a Promise</text>
  <rect x="20" y="50" width="170" height="96" rx="9" fill="#ef4444" fill-opacity="0.09" stroke="#ef4444" stroke-width="1.5"/>
  <text x="105" y="72" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">callback API</text>
  <text x="105" y="96" fill="currentColor" font-size="10" text-anchor="middle">fn(args, cb)</text>
  <text x="105" y="116" fill="currentColor" font-size="10" text-anchor="middle">cb(err, data)</text>
  <rect x="330" y="50" width="170" height="96" rx="9" fill="#22c55e" fill-opacity="0.09" stroke="#22c55e" stroke-width="1.5"/>
  <text x="415" y="72" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Promise</text>
  <text x="415" y="96" fill="currentColor" font-size="10" text-anchor="middle">err  → reject(err)</text>
  <text x="415" y="116" fill="currentColor" font-size="10" text-anchor="middle">data → resolve(data)</text>
  <path d="M 190 98 L 328 98" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#pm-a)"/>
  <text x="259" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">new Promise(...)</text>
  <text x="259" y="138" fill="currentColor" font-size="9.5" text-anchor="middle">now await-able</text>
  <defs><marker id="pm-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The <code>Promise</code> executor runs synchronously; you invoke the callback-style function inside it and settle the promise from within the callback. Once wrapped, the function composes with <code>.then</code>/<code>.catch</code> and <code>async/await</code>, escaping "callback hell." Resolve a promise once — later <code>resolve</code>/<code>reject</code> calls are ignored.

### Checklist when promisifying
| Step | Why |
| --- | --- |
| <code>return new Promise((resolve, reject) => …)</code> | hand back a thenable |
| call the original fn inside | preserve its behaviour |
| <code>reject(err)</code> on failure | so <code>.catch</code>/<code>try</code> works |
| <code>resolve(data)</code> on success | hand the value downstream |

> **Interview tip:** Mention <code>util.promisify</code> (Node) and that many modern APIs (<code>fetch</code>, <code>fs.promises</code>) are already promise-based. A good follow-up is wrapping <code>setTimeout</code> into a <code>delay(ms)</code> helper — the canonical one-liner promisify.`,
    examples: [
      {
        label: "Promisify a Node-style callback",
        runnable: true,
        code: `// A classic callback API: cb(err, data)
function loadUser(id, cb) {
  setTimeout(() => {
    if (id <= 0) cb(new Error("bad id"));
    else cb(null, { id, name: "User" + id });
  }, 30);
}

// Promisified wrapper
function loadUserP(id) {
  return new Promise((resolve, reject) => {
    loadUser(id, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

console.log("kicked off async load…");
loadUserP(7)
  .then((u) => console.log("resolved:", u))
  .catch((e) => console.log("rejected:", e.message));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between synchronous and asynchronous code?",
    answer: `**Core concept (TL;DR).** JavaScript runs on a **single thread**. *Synchronous* code executes top-to-bottom, each statement **blocking** the next until it finishes. *Asynchronous* code hands long-running work (timers, network, I/O) off to the environment and **continues immediately**; the result is delivered later via a callback, promise, or <code>await</code> — without freezing the thread.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One thread: block vs hand-off</text>
  <text x="120" y="48" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">Synchronous</text>
  <rect x="36" y="58" width="60" height="26" rx="5" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444"/><text x="66" y="75" fill="currentColor" font-size="9" text-anchor="middle">task A</text>
  <rect x="100" y="58" width="92" height="26" rx="5" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444"/><text x="146" y="75" fill="currentColor" font-size="9" text-anchor="middle">wait (blocked)</text>
  <rect x="196" y="58" width="60" height="26" rx="5" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444"/><text x="226" y="75" fill="currentColor" font-size="9" text-anchor="middle">task B</text>
  <text x="146" y="102" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.8">B can't start until the wait ends</text>
  <text x="400" y="48" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Asynchronous</text>
  <rect x="300" y="58" width="56" height="26" rx="5" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e"/><text x="328" y="75" fill="currentColor" font-size="9" text-anchor="middle">task A</text>
  <rect x="360" y="58" width="56" height="26" rx="5" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e"/><text x="388" y="75" fill="currentColor" font-size="9" text-anchor="middle">task B</text>
  <rect x="360" y="92" width="120" height="24" rx="5" fill="#3b82f6" fill-opacity="0.13" stroke="#3b82f6" stroke-dasharray="3 3"/><text x="420" y="108" fill="currentColor" font-size="9" text-anchor="middle">timer/IO runs aside → callback</text>
  <text x="400" y="138" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.8">thread stays free; result arrives later</text>
</svg>`)}

**How it works.** Because there's only one thread, a slow *synchronous* operation (a huge loop, <code>alert</code>, a sync XHR) freezes everything — no rendering, no clicks. Async APIs avoid this: they register a callback and return at once, letting the event loop run that callback once the work completes and the stack is clear. <code>async/await</code> is syntactic sugar that lets you *write* async code in a synchronous-looking style while it stays non-blocking under the hood.

### Sync vs async
| | Synchronous | Asynchronous |
| --- | --- | --- |
| Blocks the thread | yes | no |
| Order | strictly sequential | started now, finished later |
| Examples | loops, <code>JSON.parse</code> | <code>fetch</code>, <code>setTimeout</code>, <code>fs.promises</code> |
| Result via | return value | callback / promise / <code>await</code> |

> **Interview tip:** Stress that "asynchronous" does **not** mean multi-threaded — the work is offloaded to the browser/Node APIs, but *your* JS callbacks still run one at a time on the single main thread, scheduled by the event loop.`,
    examples: [
      {
        label: "Sync blocks; async defers",
        runnable: true,
        code: `console.log("1: sync start");

setTimeout(() => console.log("4: async timer callback"), 0);
Promise.resolve().then(() => console.log("3: async microtask"));

// A blocking synchronous loop — the thread is busy here
let total = 0;
for (let i = 0; i < 1_000_000; i++) total += i;
console.log("2: sync done, total =", total);

// Order: 1, 2, 3, 4 — sync finishes fully before any async callback runs`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do iterators and the iterable protocol work?",
    answer: `**Core concept (TL;DR).** An object is **iterable** if it has a <code>[Symbol.iterator]()</code> method that returns an **iterator**. An iterator is any object with a <code>next()</code> method returning <code>{ value, done }</code>. Together these two protocols are what <code>for…of</code>, spread, and destructuring use to walk a sequence.

${card(`<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Iterable → iterator → { value, done }</text>
  <rect x="20" y="54" width="140" height="88" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="90" y="76" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Iterable</text>
  <text x="90" y="100" fill="currentColor" font-size="9.5" text-anchor="middle">[Symbol.iterator]()</text>
  <text x="90" y="120" fill="currentColor" font-size="9.5" text-anchor="middle">array, string, Map…</text>
  <rect x="200" y="54" width="140" height="88" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="270" y="76" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">Iterator</text>
  <text x="270" y="100" fill="currentColor" font-size="9.5" text-anchor="middle">next()</text>
  <text x="270" y="120" fill="currentColor" font-size="9.5" text-anchor="middle">holds position</text>
  <rect x="380" y="54" width="120" height="88" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="440" y="76" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">result</text>
  <text x="440" y="100" fill="currentColor" font-size="9.5" text-anchor="middle">{ value, done }</text>
  <text x="440" y="120" fill="currentColor" font-size="9.5" text-anchor="middle">done:true ends</text>
  <path d="M 160 98 L 198 98" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#it-a)"/>
  <path d="M 340 98 L 378 98" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#it-a)"/>
  <text x="270" y="166" fill="currentColor" font-size="9.5" text-anchor="middle">for…of calls next() repeatedly until done:true</text>
  <defs><marker id="it-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** <code>for…of</code> calls <code>[Symbol.iterator]()</code> once to get an iterator, then calls <code>next()</code> repeatedly, using each <code>value</code> until <code>done</code> is <code>true</code>. Arrays, strings, <code>Map</code>, <code>Set</code>, and <code>arguments</code> are built-in iterables. You can make any object iterable by implementing the method yourself — and **generators** (<code>function*</code>) produce iterator objects automatically, which is why they're the easy way to author custom iteration.

### The two protocols
| Protocol | Requirement |
| --- | --- |
| Iterable | a <code>[Symbol.iterator]()</code> method |
| Iterator | a <code>next()</code> → <code>{ value, done }</code> |
| Consumed by | <code>for…of</code>, spread <code>...</code>, destructuring |
| Easiest to author with | a generator (<code>function*</code> + <code>yield</code>) |

> **Interview tip:** Point out that a generator object is **both** an iterator *and* iterable (its <code>[Symbol.iterator]</code> returns itself), so you can <code>for…of</code> over a generator directly. That's the cleanest answer when asked to make something iterable.`,
    examples: [
      {
        label: "A hand-written iterable range",
        runnable: true,
        code: `// Make a plain object iterable
function range(start, end) {
  return {
    [Symbol.iterator]() {
      let i = start;
      return {
        next: () =>
          i <= end ? { value: i++, done: false } : { value: undefined, done: true },
      };
    },
  };
}

console.log([...range(1, 4)]);        // [1, 2, 3, 4]  (spread consumes it)
for (const n of range(5, 7)) console.log("n =", n); // 5, 6, 7

// Built-ins are iterable too
console.log([..."hi"]);               // ["h", "i"]`,
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
