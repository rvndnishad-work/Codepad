/**
 * Phase 1 — Batch 1: rewrite the 9 highest-value JavaScript "core fundamentals"
 * from thin stubs to interview-depth answers (TL;DR + inline SVG diagram +
 * mechanism + comparison table + interview tip) plus one runnable example each.
 *
 * Patches the matching title IN PLACE inside whichever prisma/data/js-augments*.json
 * file already holds it (so the existing `augment:js` pipeline picks it up with no
 * sort-order surprises). Inline code uses <code> tags (rendered via rehype-raw)
 * so the content stays clean inside TS template literals.
 *
 *   npx tsx scripts/js-rewrites-batch-1.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

type Example = { label: string; code: string; runnable?: boolean };
type Rewrite = { title: string; answer: string; examples: Example[] };

// Shared diagram frame so every SVG sits in a consistent JS-amber card.
const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px;background:rgba(245,158,11,0.05)">\n${svg}\n</div>`;

const REWRITES: Rewrite[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are closures in JavaScript?",
    answer: `**Core concept (TL;DR).** A *closure* is a function bundled together with references to the variables of the scope in which it was **defined** — its lexical environment. The inner function keeps a *live link* to those outer variables even after the outer function has already returned.

${card(`<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A closure keeps its birth scope alive on the heap</text>
  <rect x="20" y="38" width="300" height="156" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="34" y="58" fill="#f59e0b" font-size="11" font-weight="700">makeCounter() scope — survives return</text>
  <rect x="40" y="68" width="150" height="30" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/>
  <text x="115" y="87" fill="currentColor" font-size="11" text-anchor="middle">let count = 0</text>
  <rect x="40" y="120" width="262" height="58" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="54" y="140" fill="#3b82f6" font-size="11" font-weight="700">returned { inc, dec }</text>
  <text x="54" y="160" fill="currentColor" font-size="10">reads &amp; writes ++count / --count</text>
  <path d="M 120 120 C 120 108, 118 104, 116 100" fill="none" stroke="#ef4444" stroke-width="2" marker-end="url(#cl-a)"/>
  <text x="196" y="115" fill="#ef4444" font-size="9.5" font-weight="700">live reference</text>
  <rect x="340" y="74" width="160" height="92" rx="9" fill="#64748b" fill-opacity="0.08" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="420" y="96" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.85">Outside world</text>
  <text x="420" y="116" fill="currentColor" font-size="10" text-anchor="middle">const c = makeCounter()</text>
  <text x="420" y="138" fill="currentColor" font-size="10" text-anchor="middle">c.inc() → 1, 2, 3…</text>
  <text x="420" y="156" fill="#ef4444" font-size="9.5" text-anchor="middle">c.count → undefined</text>
  <defs><marker id="cl-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ef4444"/></marker></defs>
</svg>`)}

**How it works.** When a function is created, the engine attaches a hidden reference to the scope it was born in. Variable lookups walk *outward* along this chain. Because the link is to the **variable itself** (not a copy of its value), every call sees the latest value, and the scope is kept on the heap for as long as the inner function is reachable — which is why state outlives the outer call.

### Where closures show up
| Pattern | What the closure captures |
| --- | --- |
| Data privacy / module pattern | private state no caller can reach |
| Function factories | configuration baked into the returned fn |
| Memoization / caching | a cache that persists across calls |
| Event handlers & callbacks | the surrounding variables at definition time |

> **Interview tip:** Say explicitly that a closure captures a *reference to the variable*, not a snapshot of its value. That one sentence explains the classic <code>var</code>-in-a-<code>for</code>-loop bug (every callback logs the final value) and why a per-iteration <code>let</code> binding fixes it.`,
    examples: [
      {
        label: "Private state + the loop-capture gotcha",
        runnable: true,
        code: `function makeCounter() {
  let count = 0;               // private state, lives in the closure
  return {
    inc() { return ++count; },
    dec() { return --count; },
  };
}
const c = makeCounter();
console.log(c.inc(), c.inc(), c.dec()); // 1 2 1
console.log("count is private:", c.count); // undefined

// var shares ONE binding; let creates a fresh binding each iteration
const withVar = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);
console.log("var:", withVar.map(f => f())); // [3, 3, 3]

const withLet = [];
for (let j = 0; j < 3; j++) withLet.push(() => j);
console.log("let:", withLet.map(f => f())); // [0, 1, 2]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain 'this' keyword in JavaScript.",
    answer: `**Core concept (TL;DR).** <code>this</code> is **not** decided by where a function is written — it is decided by **how the function is called** (the call-site). Four rules resolve it, checked from highest precedence down; arrow functions opt out entirely and inherit <code>this</code> from their surrounding scope.

${card(`<svg viewBox="0 0 520 218" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">'this' is bound at the call-site, by these rules</text>
  <rect x="18" y="36" width="232" height="38" rx="7" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444" stroke-width="1.3"/>
  <text x="30" y="54" fill="#ef4444" font-size="11" font-weight="700">new Foo()</text>
  <text x="30" y="68" fill="currentColor" font-size="9.5">this = the brand-new instance</text>
  <rect x="18" y="80" width="232" height="38" rx="7" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.3"/>
  <text x="30" y="98" fill="#f59e0b" font-size="11" font-weight="700">fn.call / apply / bind</text>
  <text x="30" y="112" fill="currentColor" font-size="9.5">this = the object you pass in</text>
  <rect x="18" y="124" width="232" height="38" rx="7" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.3"/>
  <text x="30" y="142" fill="#3b82f6" font-size="11" font-weight="700">obj.method()</text>
  <text x="30" y="156" fill="currentColor" font-size="9.5">this = obj (the receiver)</text>
  <rect x="18" y="168" width="232" height="38" rx="7" fill="#64748b" fill-opacity="0.10" stroke="#64748b" stroke-width="1.3"/>
  <text x="30" y="186" fill="currentColor" font-size="11" font-weight="700">plain fn()</text>
  <text x="30" y="200" fill="currentColor" font-size="9.5">this = undefined (strict) / global</text>
  <rect x="268" y="80" width="234" height="98" rx="9" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="104" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Arrow function ⇒</text>
  <text x="385" y="126" fill="currentColor" font-size="10" text-anchor="middle">ignores all 4 rules</text>
  <text x="385" y="146" fill="currentColor" font-size="10" text-anchor="middle">captures 'this' lexically</text>
  <text x="385" y="166" fill="currentColor" font-size="10" text-anchor="middle">(from where it's defined)</text>
</svg>`)}

**How it works.** At every call the engine asks, in order: was it called with <code>new</code>? with <code>.call/.apply/.bind</code>? as a method on an object? otherwise it falls back to the default (<code>undefined</code> in strict mode, the global object otherwise). An arrow function has no <code>this</code> of its own, so it transparently uses the <code>this</code> of the scope it was created in — which is exactly why arrows are the fix for "lost <code>this</code>" inside callbacks.

### Resolving the binding
| Call form | <code>this</code> resolves to |
| --- | --- |
| <code>new Counter()</code> | the freshly created instance |
| <code>fn.call(obj)</code> / <code>fn.bind(obj)</code> | <code>obj</code> (explicit) |
| <code>user.greet()</code> | <code>user</code> (the receiver) |
| <code>const g = user.greet; g()</code> | <code>undefined</code> — receiver is lost |
| arrow inside a method | the method's <code>this</code> (lexical) |

> **Interview tip:** The most common bug is passing a method as a callback (<code>setTimeout(user.greet)</code>) — the receiver is dropped and <code>this</code> becomes undefined. Fix it with <code>.bind(user)</code> or by wrapping in an arrow.`,
    examples: [
      {
        label: "How the call-site changes 'this'",
        runnable: true,
        code: `const user = {
  name: "Ada",
  greet() { return "Hi, " + (this ? this.name : "?"); },
};

console.log(user.greet());            // "Hi, Ada"  (method call → this = user)

const loose = user.greet;
console.log(loose());                  // "Hi, undefined" (receiver lost)

const bound = user.greet.bind(user);
console.log(bound());                  // "Hi, Ada"  (explicit binding)

// Arrow captures 'this' lexically — handy inside methods/callbacks
const team = {
  name: "Core",
  members: ["a", "b"],
  list() { return this.members.map(m => this.name + ":" + m); },
};
console.log(team.list());              // ["Core:a", "Core:b"]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "In what order do console.log, setTimeout, and Promise.then run?",
    answer: `**Core concept (TL;DR).** The event loop drains work in a strict priority: **(1) all synchronous code** runs to completion, then **(2) the entire microtask queue** (resolved <code>Promise.then</code> / <code>queueMicrotask</code>) is emptied, then **(3) one macrotask** (a <code>setTimeout</code> / <code>setInterval</code> / I/O callback) — after which microtasks are drained again, and so on.

${card(`<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One loop tick: sync → microtasks → one macrotask</text>
  <rect x="18" y="40" width="150" height="150" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="93" y="60" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">1 · Call stack</text>
  <text x="93" y="82" fill="currentColor" font-size="10" text-anchor="middle">synchronous code</text>
  <text x="93" y="100" fill="currentColor" font-size="10" text-anchor="middle">runs to the end</text>
  <rect x="186" y="40" width="150" height="150" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="261" y="60" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">2 · Microtasks</text>
  <text x="261" y="82" fill="currentColor" font-size="10" text-anchor="middle">Promise.then</text>
  <text x="261" y="100" fill="currentColor" font-size="10" text-anchor="middle">queueMicrotask</text>
  <text x="261" y="124" fill="#22c55e" font-size="9.5" text-anchor="middle">drained FULLY</text>
  <text x="261" y="140" fill="#22c55e" font-size="9.5" text-anchor="middle">before any timer</text>
  <rect x="354" y="40" width="150" height="150" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="429" y="60" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">3 · Macrotasks</text>
  <text x="429" y="82" fill="currentColor" font-size="10" text-anchor="middle">setTimeout</text>
  <text x="429" y="100" fill="currentColor" font-size="10" text-anchor="middle">setInterval / I/O</text>
  <text x="429" y="124" fill="#f59e0b" font-size="9.5" text-anchor="middle">one per tick,</text>
  <text x="429" y="140" fill="#f59e0b" font-size="9.5" text-anchor="middle">then back to step 2</text>
  <path d="M 168 115 L 184 115" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#el-a)"/>
  <path d="M 336 115 L 352 115" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#el-a)"/>
  <defs><marker id="el-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** <code>console.log</code> runs immediately (it is synchronous). A <code>setTimeout(fn, 0)</code> callback is a **macrotask** — even with a 0 ms delay it only runs after the current synchronous run *and* after every pending microtask. A resolved <code>Promise.then</code> callback is a **microtask**, so it jumps ahead of any timer. The golden rule: **microtasks always beat macrotasks.**

### Priority cheat-sheet
| Category | Examples | When it runs |
| --- | --- | --- |
| Synchronous | normal statements, <code>console.log</code> | now, on the call stack |
| Microtask | <code>Promise.then/catch/finally</code>, <code>await</code> continuation | after sync, before timers |
| Macrotask | <code>setTimeout</code>, <code>setInterval</code>, I/O | one per loop tick, after microtasks |

> **Interview tip:** Be ready to dry-run a snippet that mixes all three and predict the exact output order. The expected answer for the classic case is <code>start → end → promise → timeout</code>.`,
    examples: [
      {
        label: "Predict the log order",
        runnable: true,
        code: `console.log("1: start");

setTimeout(() => console.log("4: timeout (macrotask)"), 0);

Promise.resolve().then(() => console.log("3: promise (microtask)"));

console.log("2: end");

// Output order:
// 1: start
// 2: end
// 3: promise (microtask)   <- microtasks drain before timers
// 4: timeout (macrotask)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between == and ===?",
    answer: `**Core concept (TL;DR).** <code>===</code> is **strict** equality: it compares value *and* type with **no conversion**. <code>==</code> is **loose** equality: when the types differ it first **coerces** them using a set of abstract rules, then compares. Prefer <code>===</code> everywhere — the coercion rules of <code>==</code> are a well-known source of bugs.

${card(`<svg viewBox="0 0 520 196" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">=== checks type first; == coerces, then checks</text>
  <rect x="20" y="40" width="220" height="138" rx="9" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="130" y="60" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">a === b  (strict)</text>
  <text x="130" y="84" fill="currentColor" font-size="10" text-anchor="middle">same type?</text>
  <text x="130" y="104" fill="#ef4444" font-size="10" text-anchor="middle">no → false (done)</text>
  <text x="130" y="128" fill="currentColor" font-size="10" text-anchor="middle">yes → compare values</text>
  <text x="130" y="156" fill="#22c55e" font-size="9.5" text-anchor="middle">predictable, no surprises</text>
  <rect x="280" y="40" width="220" height="138" rx="9" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="390" y="60" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">a == b  (loose)</text>
  <text x="390" y="84" fill="currentColor" font-size="10" text-anchor="middle">same type? → compare</text>
  <text x="390" y="104" fill="currentColor" font-size="10" text-anchor="middle">different type?</text>
  <text x="390" y="124" fill="#f59e0b" font-size="10" text-anchor="middle">coerce (usually → number)</text>
  <text x="390" y="146" fill="currentColor" font-size="10" text-anchor="middle">then compare</text>
  <text x="390" y="168" fill="#ef4444" font-size="9.5" text-anchor="middle">'' == 0, [] == ![] surprises</text>
</svg>`)}

**How it works.** With <code>===</code>, <code>1 === "1"</code> is <code>false</code> because the operands are a number and a string. With <code>==</code>, the string is coerced to a number first, so <code>1 == "1"</code> is <code>true</code>. The coercion rules produce some famously unintuitive results, so the only <code>==</code> use many style guides allow is <code>x == null</code> (a deliberate shorthand that matches both <code>null</code> and <code>undefined</code>).

### Coercion surprises
| Expression | <code>==</code> | <code>===</code> |
| --- | --- | --- |
| <code>1 == "1"</code> | <code>true</code> | <code>false</code> |
| <code>0 == ""</code> | <code>true</code> | <code>false</code> |
| <code>null == undefined</code> | <code>true</code> | <code>false</code> |
| <code>0 == false</code> | <code>true</code> | <code>false</code> |
| <code>NaN === NaN</code> | <code>false</code> | <code>false</code> |

> **Interview tip:** State the rule of thumb — "default to <code>===</code>; the one acceptable <code>==</code> is <code>x == null</code>." Bonus: <code>NaN</code> is never equal to itself under either operator; use <code>Number.isNaN()</code> to test for it.`,
    examples: [
      {
        label: "Strict vs loose in action",
        runnable: true,
        code: `console.log(1 === "1");   // false — different types
console.log(1 == "1");    // true  — "1" coerced to 1

console.log(0 == "");     // true  — both coerce to 0
console.log(0 === "");    // false

console.log(null == undefined);  // true
console.log(null === undefined); // false

// The one idiomatic use of ==: match null OR undefined
const x = undefined;
console.log(x == null);   // true  (covers null and undefined)

// NaN is never equal to itself
console.log(NaN === NaN);          // false
console.log(Number.isNaN(NaN));    // true  — the correct check`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain prototypal inheritance.",
    answer: `**Core concept (TL;DR).** In JavaScript objects inherit directly from other **objects**. Every object has a hidden link (<code>[[Prototype]]</code>, exposed as <code>__proto__</code>) to another object. When you read a property that an object doesn't own, the engine walks **up this prototype chain** until it finds the property or reaches <code>null</code>.

${card(`<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Property lookup walks up the prototype chain</text>
  <rect x="40" y="40" width="180" height="44" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="130" y="60" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">dog (instance)</text>
  <text x="130" y="76" fill="currentColor" font-size="9.5" text-anchor="middle">own: name = "Rex"</text>
  <rect x="40" y="104" width="180" height="44" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="130" y="124" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">Animal.prototype</text>
  <text x="130" y="140" fill="currentColor" font-size="9.5" text-anchor="middle">speak() lives here</text>
  <rect x="40" y="168" width="180" height="36" rx="8" fill="#64748b" fill-opacity="0.12" stroke="#64748b" stroke-width="1.5"/>
  <text x="130" y="190" fill="currentColor" font-size="10.5" text-anchor="middle">Object.prototype → null</text>
  <path d="M 130 84 L 130 102" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#pr-a)"/>
  <path d="M 130 148 L 130 166" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#pr-a)"/>
  <text x="146" y="98" fill="currentColor" font-size="9" opacity="0.8">[[Prototype]]</text>
  <rect x="280" y="70" width="216" height="104" rx="9" fill="#22c55e" fill-opacity="0.06" stroke="#22c55e" stroke-width="1.3" stroke-dasharray="4 3"/>
  <text x="388" y="92" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">dog.speak()</text>
  <text x="388" y="114" fill="currentColor" font-size="9.5" text-anchor="middle">1· not on dog</text>
  <text x="388" y="132" fill="currentColor" font-size="9.5" text-anchor="middle">2· found on Animal.prototype ✓</text>
  <text x="388" y="154" fill="currentColor" font-size="9.5" text-anchor="middle">shared by every instance</text>
  <defs><marker id="pr-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Methods are stored **once** on the prototype and shared by every instance, instead of being copied onto each object — that is the memory win. <code>class</code> syntax (ES2015) is sugar over exactly this: <code>class Dog extends Animal</code> still wires up prototype links under the hood. You can build the same relationship manually with <code>Object.create(proto)</code> or a constructor function plus <code>Constructor.prototype</code>.

### Prototypal vs classical
| | Prototypal (JS) | Classical (Java/C++) |
| --- | --- | --- |
| Inherit from | live objects | classes (blueprints) |
| Method storage | shared on the prototype | copied per class definition |
| Lookup | dynamic walk up the chain | fixed at compile time |
| Set up with | <code>Object.create</code>, <code>class</code>, ctor fn | <code>class</code> keyword only |

> **Interview tip:** Note that <code>class</code> in JS is *syntactic sugar* over prototypes — there are no real classes underneath. Mention that own properties shadow inherited ones, and <code>hasOwnProperty</code> distinguishes the two.`,
    examples: [
      {
        label: "Shared methods via the prototype chain",
        runnable: true,
        code: `function Animal(name) { this.name = name; }
Animal.prototype.speak = function () {
  return this.name + " makes a sound";
};

function Dog(name) { Animal.call(this, name); }   // inherit instance fields
Dog.prototype = Object.create(Animal.prototype);  // link the chain
Dog.prototype.constructor = Dog;
Dog.prototype.speak = function () {               // override
  return this.name + " barks";
};

const rex = new Dog("Rex");
console.log(rex.speak());                       // "Rex barks"
console.log(rex.name);                          // "Rex" (own property)
console.log(rex instanceof Animal);             // true
console.log(Object.getPrototypeOf(rex) === Dog.prototype); // true
console.log(rex.hasOwnProperty("speak"));       // false — lives on the prototype`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Debounce vs throttle — implement debounce",
    answer: `**Core concept (TL;DR).** *Debouncing* collapses a burst of rapid calls into a **single** call that runs only **after the activity has paused** for a set delay. Every new call resets the timer — so the function fires once, on the trailing edge, when things go quiet.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Debounce: many calls in, one call out after the pause</text>
  <line x1="20" y1="70" x2="500" y2="70" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
  <text x="20" y="56" fill="currentColor" font-size="10" opacity="0.8">events (e.g. keystrokes)</text>
  <g fill="#3b82f6">
    <circle cx="60" cy="70" r="5"/><circle cx="86" cy="70" r="5"/><circle cx="110" cy="70" r="5"/>
    <circle cx="150" cy="70" r="5"/><circle cx="178" cy="70" r="5"/>
  </g>
  <rect x="178" y="92" width="150" height="22" rx="5" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/>
  <text x="253" y="107" fill="currentColor" font-size="9.5" text-anchor="middle">wait for quiet (delay)</text>
  <line x1="20" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
  <text x="20" y="138" fill="currentColor" font-size="10" opacity="0.8">debounced call</text>
  <circle cx="336" cy="150" r="6" fill="#22c55e"/>
  <text x="336" y="174" fill="#22c55e" font-size="9.5" text-anchor="middle">fires once ✓</text>
  <path d="M 178 78 L 320 144" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#db-a)"/>
  <defs><marker id="db-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>`)}

**How it works.** A debounced wrapper keeps a timer id in a closure. Each call **clears** the previous timer and starts a new one; only when calls stop long enough for a timer to survive does the real function run. This is ideal for "act when the user finishes" moments: search-as-you-type, validating an input, or saving a draft.

### Debounce vs throttle
| | Debounce | Throttle |
| --- | --- | --- |
| Fires | once, after calls stop | at most once per interval |
| Resets timer on each call | yes | no |
| Best for | search box, autosave, resize-settled | scroll, drag, mousemove, rate-limit |
| Mental model | "wait until they're done" | "no more than once every N ms" |

> **Interview tip:** Be ready to implement it in ~6 lines and to add a <code>cancel()</code> method (clears the pending timer). Interviewers often follow up by asking how throttle differs — answer with the table above.`,
    examples: [
      {
        label: "A 6-line debounce",
        runnable: true,
        code: `function debounce(fn, delay) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

let runs = 0;
const search = debounce((q) => {
  runs++;
  console.log("API call for:", q, "(total calls:", runs + ")");
}, 50);

// Simulate fast typing — only the LAST one should fire
search("r"); search("re"); search("rea"); search("react");
console.log("4 keystrokes fired, calls so far:", runs); // 0 — still waiting`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement a throttle function?",
    answer: `**Core concept (TL;DR).** *Throttling* guarantees a function runs **at most once per time window**, no matter how often it is called. Unlike debounce (which waits for silence), throttle lets calls through on a **fixed cadence** — perfect for high-frequency events you still want to react to *while* they happen.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Throttle: steady output, capped to one per window</text>
  <line x1="20" y1="66" x2="500" y2="66" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
  <text x="20" y="52" fill="currentColor" font-size="10" opacity="0.8">events (e.g. scroll)</text>
  <g fill="#3b82f6">
    <circle cx="60" cy="66" r="5"/><circle cx="86" cy="66" r="5"/><circle cx="112" cy="66" r="5"/><circle cx="138" cy="66" r="5"/>
    <circle cx="210" cy="66" r="5"/><circle cx="236" cy="66" r="5"/><circle cx="262" cy="66" r="5"/>
    <circle cx="360" cy="66" r="5"/><circle cx="386" cy="66" r="5"/>
  </g>
  <g stroke="#f59e0b" stroke-opacity="0.5" stroke-dasharray="3 3">
    <line x1="190" y1="58" x2="190" y2="150"/><line x1="340" y1="58" x2="340" y2="150"/>
  </g>
  <text x="125" y="92" fill="#f59e0b" font-size="9" text-anchor="middle">window 1</text>
  <text x="265" y="92" fill="#f59e0b" font-size="9" text-anchor="middle">window 2</text>
  <line x1="20" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
  <text x="20" y="138" fill="currentColor" font-size="10" opacity="0.8">throttled calls</text>
  <g fill="#22c55e"><circle cx="60" cy="150" r="6"/><circle cx="210" cy="150" r="6"/><circle cx="360" cy="150" r="6"/></g>
  <text x="280" y="176" fill="#22c55e" font-size="9.5" text-anchor="middle">one call per window — regular cadence</text>
</svg>`)}

**How it works.** A throttle remembers the timestamp (or a "cooling down" flag) of the last allowed call. A new call is permitted only if enough time has elapsed since then; otherwise it is dropped (or, in fancier versions, scheduled as a single trailing call). This keeps expensive handlers — scroll position math, drag updates, analytics pings — running smoothly instead of firing hundreds of times a second.

### When to reach for which
| Scenario | Use |
| --- | --- |
| Search-as-you-type, autosave | debounce |
| Scroll / resize position tracking | throttle |
| Drag-and-drop move handler | throttle |
| Button double-click guard | throttle (leading) |

> **Interview tip:** Mention "leading vs trailing" edges — a leading throttle fires immediately then ignores for the window; a trailing one also fires once at the window's end so the final state isn't lost.`,
    examples: [
      {
        label: "Leading-edge throttle",
        runnable: true,
        code: `function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

let painted = 0;
const onScroll = throttle(() => {
  painted++;
  console.log("paint #" + painted);
}, 100);

// Fire a rapid burst synchronously — only the first gets through the window
onScroll(); onScroll(); onScroll(); onScroll();
console.log("4 scroll events, actual paints:", painted); // 1`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a higher-order function?",
    answer: `**Core concept (TL;DR).** A *higher-order function* (HOF) is a function that does at least one of two things: it **takes another function as an argument**, or it **returns a function**. They are possible because functions in JavaScript are first-class values — you can pass them around like any other data.

${card(`<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Functions in, function out</text>
  <rect x="20" y="64" width="120" height="44" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="80" y="90" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">callback fn</text>
  <rect x="200" y="50" width="130" height="72" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b" stroke-width="1.6"/>
  <text x="265" y="82" fill="#f59e0b" font-size="12" font-weight="700" text-anchor="middle">HOF</text>
  <text x="265" y="102" fill="currentColor" font-size="9" text-anchor="middle">map / filter / compose</text>
  <rect x="390" y="64" width="120" height="44" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="1.5"/>
  <text x="450" y="84" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">result or</text>
  <text x="450" y="100" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">new fn</text>
  <path d="M 140 86 L 198 86" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#hof-a)"/>
  <path d="M 330 86 L 388 86" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#hof-a)"/>
  <defs><marker id="hof-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Because a function value can be stored, passed, and returned, you can build small composable behaviours. <code>Array.prototype.map</code>, <code>filter</code>, and <code>reduce</code> are HOFs that take a callback. Returning a function lets you **pre-bake configuration** — the basis of function factories, currying, decorators (logging/memoizing wrappers), and partial application.

### Built-in HOFs you'll use daily
| HOF | Takes | Returns |
| --- | --- | --- |
| <code>map</code> | transform fn | a new array |
| <code>filter</code> | predicate fn | a new (shorter) array |
| <code>reduce</code> | reducer fn | a single accumulated value |
| <code>sort</code> | comparator fn | the sorted array |

> **Interview tip:** Tie HOFs to "functions are first-class citizens." A strong follow-up answer shows a function that *returns* a function (e.g. a <code>withLogging</code> wrapper or a <code>multiplier</code> factory), not just one that takes a callback.`,
    examples: [
      {
        label: "Taking and returning functions",
        runnable: true,
        code: `const nums = [1, 2, 3, 4, 5];

// HOFs that TAKE a function
const doubled = nums.map(n => n * 2);
const evens   = nums.filter(n => n % 2 === 0);
const sum     = nums.reduce((acc, n) => acc + n, 0);
console.log(doubled, evens, sum);  // [2,4,6,8,10] [2,4] 15

// A HOF that RETURNS a function (a decorator)
function withLogging(fn) {
  return function (...args) {
    console.log("calling with", args);
    const out = fn(...args);
    console.log("→ returned", out);
    return out;
  };
}
const add = withLogging((a, b) => a + b);
add(2, 3);  // logs the call, then "→ returned 5"`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a pure function?",
    answer: `**Core concept (TL;DR).** A *pure function* satisfies two rules: **(1)** given the same inputs it always returns the same output (deterministic), and **(2)** it produces **no side effects** — it doesn't mutate external state, touch the DOM, log, call an API, or read changing globals. Its output depends only on its arguments.

${card(`<svg viewBox="0 0 520 188" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Pure: isolated. Impure: reaches outside.</text>
  <rect x="20" y="40" width="230" height="138" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="60" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Pure</text>
  <rect x="44" y="92" width="60" height="32" rx="6" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/>
  <text x="74" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">input</text>
  <rect x="166" y="92" width="60" height="32" rx="6" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/>
  <text x="196" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">output</text>
  <path d="M 104 108 L 164 108" fill="none" stroke="#22c55e" stroke-width="1.8" marker-end="url(#pf-a)"/>
  <text x="135" y="152" fill="#22c55e" font-size="9" text-anchor="middle">same in → same out</text>
  <rect x="270" y="40" width="230" height="138" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="60" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">Impure</text>
  <rect x="300" y="92" width="64" height="32" rx="6" fill="#ef4444" fill-opacity="0.16" stroke="#ef4444"/>
  <text x="332" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">fn()</text>
  <path d="M 364 100 L 470 76" fill="none" stroke="#ef4444" stroke-width="1.5" marker-end="url(#pf-a)"/>
  <path d="M 364 116 L 470 142" fill="none" stroke="#ef4444" stroke-width="1.5" marker-end="url(#pf-a)"/>
  <text x="472" y="74" fill="#ef4444" font-size="9" text-anchor="end">mutates global</text>
  <text x="472" y="150" fill="#ef4444" font-size="9" text-anchor="end">DOM / API / log</text>
  <defs><marker id="pf-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Purity makes code **referentially transparent** — a call can be replaced by its result without changing behaviour. That is what makes pure functions trivial to test (no mocks, no setup), safe to cache/memoize, easy to run in parallel, and the reason React reducers and selectors are expected to be pure. Side-effecting work isn't bad — you just push it to the edges and keep the core logic pure.

### Pure vs impure
| | Pure | Impure |
| --- | --- | --- |
| Same input → same output | always | not guaranteed |
| Mutates arguments / globals | never | often |
| Side effects (DOM, I/O, log) | none | yes |
| Testability | trivial | needs mocks/setup |

> **Interview tip:** Call out that array methods split along this line — <code>map/filter/slice</code> are pure (return new arrays) while <code>push/splice/sort</code> mutate in place. Preferring the pure ones avoids a whole class of shared-state bugs.`,
    examples: [
      {
        label: "Pure vs impure side by side",
        runnable: true,
        code: `// PURE — depends only on input, returns a new value
function add(a, b) { return a + b; }
function addItem(cart, item) { return [...cart, item]; } // no mutation

console.log(add(2, 3));            // 3 → always 5... er, 5
console.log(add(2, 3));            // 5 again (deterministic)

const cart = ["apple"];
console.log(addItem(cart, "pear")); // ["apple","pear"]
console.log(cart);                  // ["apple"] — original untouched

// IMPURE — mutates external state, output depends on it
let total = 0;
function addToTotal(n) { total += n; return total; } // side effect
console.log(addToTotal(5)); // 5
console.log(addToTotal(5)); // 10 — same input, different output!`,
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
