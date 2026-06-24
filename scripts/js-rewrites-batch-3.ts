/**
 * Phase 1 — Batch 3: the remaining distinct core JavaScript fundamentals
 * (async iteration, the async-handling evolution, yield*, prototypal-vs-classical,
 * and the broad "scope" question). Same TL;DR + SVG + table + tip + runnable
 * example format and patch-in-place strategy as batches 1–2.
 *
 *   npx tsx scripts/js-rewrites-batch-3.ts
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
    title: "What are async iterators and for await...of?",
    answer: `**Core concept (TL;DR).** An *async iterator* is the asynchronous twin of a normal iterator: its <code>next()</code> returns a **Promise** of <code>{ value, done }</code> instead of a plain object. An object is *async iterable* via <code>[Symbol.asyncIterator]()</code>, and <code>for await…of</code> is the loop that consumes it — awaiting each step before moving on.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">for await…of: await each next() before continuing</text>
  <rect x="20" y="52" width="150" height="92" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="95" y="74" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">async iterable</text>
  <text x="95" y="98" fill="currentColor" font-size="9.5" text-anchor="middle">[Symbol.asyncIterator]</text>
  <text x="95" y="118" fill="currentColor" font-size="9.5" text-anchor="middle">async function*</text>
  <rect x="200" y="52" width="150" height="92" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="275" y="74" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">next()</text>
  <text x="275" y="98" fill="currentColor" font-size="9.5" text-anchor="middle">returns a Promise of</text>
  <text x="275" y="118" fill="currentColor" font-size="9.5" text-anchor="middle">{ value, done }</text>
  <rect x="380" y="52" width="120" height="92" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="440" y="74" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">await</text>
  <text x="440" y="98" fill="currentColor" font-size="9.5" text-anchor="middle">unwrap value</text>
  <text x="440" y="118" fill="currentColor" font-size="9.5" text-anchor="middle">loop body runs</text>
  <path d="M 170 98 L 198 98" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#ai-a)"/>
  <path d="M 350 98 L 378 98" fill="none" stroke="currentColor" stroke-width="1.7" marker-end="url(#ai-a)"/>
  <text x="260" y="170" fill="currentColor" font-size="9.5" text-anchor="middle">ideal for streams, paginated APIs, and chunked I/O</text>
  <defs><marker id="ai-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Where a sync iterator must have all its data ready, an async iterator can <code>await</code> between values — so each item can arrive from the network or disk. <code>async function*</code> generators are the easy way to author one: every <code>yield</code> can follow an <code>await</code>. <code>for await…of</code> only works inside an <code>async</code> function, and it processes items **sequentially** (it awaits each before the next).

### Sync vs async iteration
| | Sync iterator | Async iterator |
| --- | --- | --- |
| Hook | <code>[Symbol.iterator]</code> | <code>[Symbol.asyncIterator]</code> |
| <code>next()</code> returns | <code>{ value, done }</code> | <code>Promise&lt;{ value, done }&gt;</code> |
| Consumed by | <code>for…of</code> | <code>for await…of</code> |
| Authored with | <code>function*</code> | <code>async function*</code> |

> **Interview tip:** Note that <code>for await…of</code> is *sequential* — to run many async tasks in parallel you'd use <code>Promise.all</code> instead. Real-world fit: paginating an API, or reading a Node stream (which is async-iterable out of the box).`,
    examples: [
      {
        label: "An async generator + for await…of",
        runnable: true,
        code: `async function* counter(max) {
  for (let i = 1; i <= max; i++) {
    // each value can come from awaited async work
    yield await Promise.resolve(i);
  }
}

console.log("loop starts asynchronously after this line");

(async () => {
  const collected = [];
  for await (const n of counter(4)) collected.push(n);
  console.log("collected:", collected); // [1, 2, 3, 4]
})();`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle asynchronous operations in JavaScript?",
    answer: `**Core concept (TL;DR).** There are three generations of async handling, each fixing the last one's pain: **callbacks** (a function to run when work finishes), **Promises** (a chainable object representing a future value), and **async/await** (syntax that lets you write Promise-based code in a flat, synchronous-looking style). Modern code defaults to async/await.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">The evolution of async handling</text>
  <rect x="18" y="48" width="152" height="118" rx="9" fill="#ef4444" fill-opacity="0.09" stroke="#ef4444" stroke-width="1.5"/>
  <text x="94" y="70" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">1 · Callbacks</text>
  <text x="94" y="94" fill="currentColor" font-size="9.5" text-anchor="middle">fn(data, cb)</text>
  <text x="94" y="116" fill="currentColor" font-size="9.5" text-anchor="middle">nesting →</text>
  <text x="94" y="136" fill="#ef4444" font-size="9.5" text-anchor="middle">"callback hell"</text>
  <rect x="184" y="48" width="152" height="118" rx="9" fill="#3b82f6" fill-opacity="0.09" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="260" y="70" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">2 · Promises</text>
  <text x="260" y="94" fill="currentColor" font-size="9.5" text-anchor="middle">.then / .catch</text>
  <text x="260" y="116" fill="currentColor" font-size="9.5" text-anchor="middle">flat chaining,</text>
  <text x="260" y="136" fill="currentColor" font-size="9.5" text-anchor="middle">Promise.all</text>
  <rect x="350" y="48" width="152" height="118" rx="9" fill="#22c55e" fill-opacity="0.09" stroke="#22c55e" stroke-width="1.5"/>
  <text x="426" y="70" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">3 · async/await</text>
  <text x="426" y="94" fill="currentColor" font-size="9.5" text-anchor="middle">await aPromise</text>
  <text x="426" y="116" fill="currentColor" font-size="9.5" text-anchor="middle">try/catch errors</text>
  <text x="426" y="136" fill="#22c55e" font-size="9.5" text-anchor="middle">reads like sync</text>
  <path d="M 170 107 L 184 107" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ah-a)"/>
  <path d="M 336 107 L 350 107" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ah-a)"/>
  <defs><marker id="ah-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** A **Promise** is in one of three states — *pending*, then settled as *fulfilled* or *rejected* — and you react with <code>.then</code>/<code>.catch</code>/<code>.finally</code>. <code>async/await</code> is built directly on Promises: <code>await</code> pauses the async function until the Promise settles (without blocking the thread), and errors surface through ordinary <code>try/catch</code>. To run independent tasks concurrently, combine them with <code>Promise.all</code> (all succeed), <code>Promise.allSettled</code> (collect every outcome), or <code>Promise.race</code>.

### Combinators worth naming
| Helper | Resolves when | Use for |
| --- | --- | --- |
| <code>Promise.all</code> | all fulfil (rejects fast) | parallel "need everything" |
| <code>Promise.allSettled</code> | all settle | collect successes + failures |
| <code>Promise.race</code> | first settles | timeouts, fastest-wins |
| <code>Promise.any</code> | first fulfils | first success, ignore errors |

> **Interview tip:** Emphasise that <code>await</code> in a loop runs **sequentially** — if the tasks are independent, gather the promises and <code>await Promise.all(...)</code> instead for big speedups. Also: always handle rejections, or you'll get an unhandled-rejection warning.`,
    examples: [
      {
        label: "Promise chaining vs async/await + Promise.all",
        runnable: true,
        code: `function fetchPrice(item) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(item === "book" ? 12 : 5), 20),
  );
}

// (2) Promise chaining
fetchPrice("book").then((p) => console.log("then →", p));

// (3) async/await + parallel with Promise.all
(async () => {
  const [book, pen] = await Promise.all([fetchPrice("book"), fetchPrice("pen")]);
  console.log("await + Promise.all →", book, pen, "total", book + pen);
})();`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does yield* do in a generator?",
    answer: `**Core concept (TL;DR).** <code>yield*</code> *delegates* to another iterable from inside a generator. Instead of yielding a single value, it yields **every** value the target produces, one by one — flattening a sub-sequence into the current generator's output.

${card(`<svg viewBox="0 0 520 184" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">yield* splices another iterable's values in</text>
  <rect x="20" y="44" width="170" height="120" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="105" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">outer()</text>
  <text x="105" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">yield 1</text>
  <text x="105" y="108" fill="#f59e0b" font-size="9.5" text-anchor="middle" font-weight="700">yield* inner()</text>
  <text x="105" y="128" fill="currentColor" font-size="9.5" text-anchor="middle">yield 2</text>
  <rect x="250" y="60" width="120" height="62" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.4"/>
  <text x="310" y="82" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">inner()</text>
  <text x="310" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">yield "a", "b"</text>
  <path d="M 190 104 L 248 92" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#ys-a)"/>
  <rect x="400" y="60" width="104" height="62" rx="8" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="452" y="82" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">output</text>
  <text x="452" y="104" fill="currentColor" font-size="9" text-anchor="middle">1,a,b,2</text>
  <path d="M 370 91 L 398 91" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ys-b)"/>
  <defs>
    <marker id="ys-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker>
    <marker id="ys-b" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker>
  </defs>
</svg>`)}

**How it works.** <code>yield expr</code> produces one value; <code>yield* iterable</code> hands control to that iterable and re-yields each of its values until it's exhausted, then resumes. It works on **any** iterable — another generator, an array, a string, a <code>Set</code>. It also forwards the delegated generator's **return value** as the result of the <code>yield*</code> expression, which makes it the natural tool for composing or recursively walking generators (e.g. tree traversal).

### yield vs yield*
| | <code>yield x</code> | <code>yield* iterable</code> |
| --- | --- | --- |
| Produces | one value (<code>x</code>) | every value of <code>iterable</code> |
| Operand | any expression | an iterable |
| Use | emit a single item | delegate / flatten a sub-sequence |

> **Interview tip:** Frame <code>yield*</code> as "generator composition." A clean example is recursive tree traversal — a generator that <code>yield*</code>s itself on each child node yields the whole tree as a flat stream.`,
    examples: [
      {
        label: "Delegating to generators and arrays",
        runnable: true,
        code: `function* inner() {
  yield "a";
  yield "b";
}
function* outer() {
  yield 1;
  yield* inner();     // delegate to another generator
  yield* [10, 20];    // works on any iterable
  yield 2;
}
console.log([...outer()]); // [1, "a", "b", 10, 20, 2]

// Recursive flattening with yield*
function* flatten(arr) {
  for (const x of arr) {
    if (Array.isArray(x)) yield* flatten(x);
    else yield x;
  }
}
console.log([...flatten([1, [2, [3, 4]], 5])]); // [1, 2, 3, 4, 5]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how prototypal inheritance differs from classical inheritance.",
    answer: `**Core concept (TL;DR).** In *classical* inheritance (Java, C++, C#) classes are blueprints, and objects are instances stamped out from them at compile time. In *prototypal* inheritance (JavaScript) there are no blueprints — objects inherit **directly from other objects** through a live <code>[[Prototype]]</code> link, resolved dynamically at runtime.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Blueprint-and-instance vs object-to-object</text>
  <rect x="18" y="38" width="232" height="148" rx="10" fill="#64748b" fill-opacity="0.08" stroke="#64748b" stroke-width="1.4"/>
  <text x="134" y="58" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle">Classical</text>
  <rect x="90" y="68" width="120" height="28" rx="6" fill="#64748b" fill-opacity="0.18" stroke="#64748b"/>
  <text x="150" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">class (blueprint)</text>
  <path d="M 110 96 L 80 128" fill="none" stroke="#64748b" stroke-width="1.4" marker-end="url(#cl-x)"/>
  <path d="M 150 96 L 150 128" fill="none" stroke="#64748b" stroke-width="1.4" marker-end="url(#cl-x)"/>
  <path d="M 190 96 L 220 128" fill="none" stroke="#64748b" stroke-width="1.4" marker-end="url(#cl-x)"/>
  <text x="150" y="150" fill="currentColor" font-size="9" text-anchor="middle">instances stamped out</text>
  <text x="150" y="172" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.8">fixed at compile time</text>
  <rect x="270" y="38" width="232" height="148" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.4"/>
  <text x="386" y="58" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">Prototypal (JS)</text>
  <rect x="326" y="68" width="120" height="26" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/>
  <text x="386" y="85" fill="currentColor" font-size="9.5" text-anchor="middle">object</text>
  <rect x="326" y="116" width="120" height="26" rx="6" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/>
  <text x="386" y="133" fill="currentColor" font-size="9.5" text-anchor="middle">prototype object</text>
  <path d="M 386 94 L 386 114" fill="none" stroke="#ef4444" stroke-width="1.6" marker-end="url(#cl-x)"/>
  <text x="386" y="170" fill="currentColor" font-size="9" text-anchor="middle">[[Prototype]] link, resolved at runtime</text>
  <defs><marker id="cl-x" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Classical languages copy a class's structure into each instance at definition time; the hierarchy is rigid. JavaScript instead links objects: a lookup that misses on an object walks up its prototype chain at runtime, so you can even change behaviour by swapping a prototype. The <code>class</code> keyword (ES2015) *looks* classical but is pure **syntactic sugar** — it still wires up prototype links underneath, with no real classes involved.

### Side by side
| | Classical | Prototypal (JS) |
| --- | --- | --- |
| Inherit from | classes (blueprints) | live objects |
| Resolved | compile time | runtime (dynamic) |
| Methods | copied per class | shared on the prototype |
| Flexibility | rigid hierarchy | reshape at runtime |
| Keyword | real <code>class</code> | <code>class</code> = sugar over prototypes |

> **Interview tip:** The line interviewers want to hear: "JavaScript's <code>class</code> is syntactic sugar over prototypes — there are no real classes; method lookup is a dynamic walk up the prototype chain." Mention <code>Object.create</code> as the most direct expression of object-to-object inheritance.`,
    examples: [
      {
        label: "class is sugar; Object.create is the raw form",
        runnable: true,
        code: `// class syntax — but it's prototypes underneath
class Animal { speak() { return "…"; } }
class Dog extends Animal { speak() { return "woof"; } }
const d = new Dog();
console.log(d.speak());                    // "woof"
console.log(typeof Dog);                   // "function" — not a real class!
console.log(Object.getPrototypeOf(d) === Dog.prototype);              // true
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true

// The same object-to-object link without any class keyword
const proto = { area() { return this.w * this.h; } };
const rect = Object.create(proto);   // rect inherits directly from proto
rect.w = 3; rect.h = 4;
console.log(rect.area());                  // 12`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the concept of 'scope' in JavaScript.",
    answer: `**Core concept (TL;DR).** *Scope* is the region of a program where a given name is accessible. JavaScript has three flavours: **global** (visible everywhere), **function** (visible anywhere inside the function — how <code>var</code> behaves), and **block** (visible only inside <code>{ }</code> — how <code>let</code>/<code>const</code> behave). Scopes nest, and inner scopes can read outward.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Three nested kinds of scope</text>
  <rect x="40" y="34" width="440" height="152" rx="12" fill="#64748b" fill-opacity="0.07" stroke="#64748b" stroke-width="1.4"/>
  <text x="56" y="52" fill="#64748b" font-size="10.5" font-weight="700">Global scope — window / globalThis</text>
  <rect x="70" y="62" width="380" height="112" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="86" y="80" fill="#3b82f6" font-size="10.5" font-weight="700">Function scope — var lives here</text>
  <rect x="100" y="90" width="320" height="74" rx="9" fill="#22c55e" fill-opacity="0.09" stroke="#22c55e" stroke-width="1.4"/>
  <text x="116" y="108" fill="#22c55e" font-size="10.5" font-weight="700">Block scope { } — let / const</text>
  <text x="116" y="132" fill="currentColor" font-size="9.5">reads block ✓, function ↑, global ↑↑</text>
  <text x="116" y="152" fill="currentColor" font-size="9.5">outer scopes cannot see inward</text>
</svg>`)}

**How it works.** A name is resolved by looking in the current scope first, then each enclosing scope, out to global — that search path is the *scope chain*. The crucial split: <code>var</code> ignores blocks and attaches to the nearest **function** (or global), so a <code>var</code> declared inside an <code>if</code> leaks out of it; <code>let</code> and <code>const</code> are confined to the **block**. Each function call also creates a fresh scope, which is what lets closures capture private state.

### The three scopes
| Scope | Created by | Holds |
| --- | --- | --- |
| Global | the top level | <code>var</code> at top level, <code>globalThis</code> props |
| Function | any function call | <code>var</code>, params, inner functions |
| Block | a <code>{ }</code> block | <code>let</code>, <code>const</code> |

> **Interview tip:** The headline contrast is "<code>var</code> is function-scoped; <code>let</code>/<code>const</code> are block-scoped." Be ready to show that a <code>var</code> inside an <code>if</code> block is still visible after the block, whereas a <code>let</code> there is not.`,
    examples: [
      {
        label: "Function scope vs block scope",
        runnable: true,
        code: `var g = "global";

function demo() {
  var f = "function-scoped";
  if (true) {
    let b = "block-only";          // confined to this block
    var leaks = "var ignores blocks";
    console.log("inside block:", f, b);
  }
  console.log("var leaked out:", leaks);   // var is function-scoped → visible
  try {
    console.log(b);                         // let did NOT leak
  } catch (e) {
    console.log("b outside block:", e.name); // "ReferenceError"
  }
}

demo();
console.log("global still visible:", g);`,
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
