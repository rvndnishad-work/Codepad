/**
 * Phase 2 — Batch "Arrays & objects" (B): 8 object/collection stubs to interview
 * depth (TL;DR + SVG + table + tip + runnable example). Patch-in-place.
 *
 *   npx tsx scripts/js-rewrites-phase2-arrays-b.ts
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
    title: "What do Object.keys, values, and entries return?",
    answer: `**Core concept (TL;DR).** All three take an object and return an **array** of its *own enumerable string-keyed* properties: <code>Object.keys</code> → an array of keys, <code>Object.values</code> → an array of values, and <code>Object.entries</code> → an array of <code>[key, value]</code> pairs. They're the bridge that lets you iterate and transform objects with array methods.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One object → three array views</text>
  <rect x="30" y="48" width="120" height="74" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="90" y="70" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">{ a:1, b:2 }</text>
  <text x="90" y="98" fill="currentColor" font-size="9" text-anchor="middle">own enumerable</text>
  <path d="M 150 85 L 196 60" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#oe-a)"/>
  <path d="M 150 85 L 196 85" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#oe-a)"/>
  <path d="M 150 85 L 196 112" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#oe-a)"/>
  <g font-size="9.5">
    <rect x="200" y="48" width="290" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="212" y="64" fill="currentColor">keys → ["a", "b"]</text>
    <rect x="200" y="76" width="290" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="212" y="92" fill="currentColor">values → [1, 2]</text>
    <rect x="200" y="104" width="290" height="24" rx="5" fill="#64748b" fill-opacity="0.12" stroke="#64748b"/><text x="212" y="120" fill="currentColor">entries → [["a",1], ["b",2]]</text>
  </g>
  <defs><marker id="oe-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Each returns only the object's **own** (not inherited) **enumerable** properties, with non-symbol keys, in insertion order (integer-like keys sort numerically first). <code>entries</code> pairs beautifully with <code>for…of</code> destructuring and with <code>Object.fromEntries</code> — together they let you map/filter an object as if it were an array and rebuild it.

### The trio
| Method | Returns |
| --- | --- |
| <code>Object.keys(o)</code> | <code>["a", "b"]</code> |
| <code>Object.values(o)</code> | <code>[1, 2]</code> |
| <code>Object.entries(o)</code> | <code>[["a",1], ["b",2]]</code> |
| <code>Object.fromEntries(pairs)</code> | rebuilds the object |

> **Interview tip:** The power combo is <code>Object.fromEntries(Object.entries(obj).map(...))</code> — transform an object immutably in one line. Note these skip inherited and symbol keys; use <code>Reflect.ownKeys</code> if you need everything.`,
    examples: [
      {
        label: "Iterate and transform an object",
        runnable: true,
        code: `const o = { a: 1, b: 2, c: 3 };
console.log(Object.keys(o));    // ["a", "b", "c"]
console.log(Object.values(o));  // [1, 2, 3]
console.log(Object.entries(o)); // [["a",1],["b",2],["c",3]]

for (const [k, v] of Object.entries(o)) console.log(k + " = " + v);

// transform values immutably, then rebuild
const doubled = Object.fromEntries(
  Object.entries(o).map(([k, v]) => [k, v * 2]),
);
console.log(doubled);           // { a: 2, b: 4, c: 6 }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does Object.create do?",
    answer: `**Core concept (TL;DR).** <code>Object.create(proto)</code> makes a **new object whose prototype is exactly <code>proto</code>**. It's the most direct expression of prototypal inheritance — you link an object to another object without any constructor or <code>class</code>. A special case, <code>Object.create(null)</code>, makes a "bare" object with **no prototype** at all.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Create an object linked to a chosen prototype</text>
  <rect x="60" y="42" width="170" height="36" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="145" y="64" fill="currentColor" font-size="10" text-anchor="middle">child (own: name)</text>
  <rect x="60" y="104" width="170" height="36" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/>
  <text x="145" y="126" fill="currentColor" font-size="10" text-anchor="middle">proto { greet() }</text>
  <path d="M 145 78 L 145 102" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#oc-a)"/>
  <text x="162" y="96" fill="currentColor" font-size="8.5">[[Prototype]]</text>
  <rect x="290" y="58" width="200" height="66" rx="9" fill="#64748b" fill-opacity="0.10" stroke="#64748b" stroke-dasharray="4 3"/>
  <text x="390" y="82" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">Object.create(null)</text>
  <text x="390" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">no prototype → clean dict</text>
  <defs><marker id="oc-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Property lookups on the new object fall through to <code>proto</code> via the prototype chain, so methods on <code>proto</code> are shared. An optional second argument supplies property descriptors (like <code>Object.defineProperties</code>). <code>Object.create(null)</code> is handy for dictionaries/lookup maps: with no inherited <code>Object.prototype</code>, there's no <code>toString</code>/<code>hasOwnProperty</code> to collide with user keys — safer than <code>{}</code> for untrusted keys.

### Uses
| Call | Result |
| --- | --- |
| <code>Object.create(proto)</code> | new object inheriting from <code>proto</code> |
| <code>Object.create(null)</code> | prototype-less "bare" object |
| <code>Object.create(p, descriptors)</code> | + defined properties |

> **Interview tip:** Contrast it with <code>{}</code> (which inherits <code>Object.prototype</code>) and with constructor/<code>class</code> inheritance. The standout use case: <code>Object.create(null)</code> as a collision-proof map — no inherited keys to worry about.`,
    examples: [
      {
        label: "Linking a prototype + bare dictionary",
        runnable: true,
        code: `const proto = { greet() { return "hi " + this.name; } };

const child = Object.create(proto);
child.name = "Ada";
console.log(child.greet());                       // "hi Ada"
console.log(Object.getPrototypeOf(child) === proto); // true
console.log(child.hasOwnProperty("greet"));        // false — on the prototype

// bare dictionary: no inherited members
const dict = Object.create(null);
dict.toString = "I am data, not a method";
console.log(Object.getPrototypeOf(dict));          // null
console.log(dict.toString);                         // the string (no collision)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do getters and setters work?",
    answer: `**Core concept (TL;DR).** Getters and setters are **accessor properties**: a <code>get</code> function runs when the property is **read**, and a <code>set</code> function runs when it's **assigned**. From the outside they look like a normal property (<code>obj.fullName</code>), but behind the scenes they compute, validate, or react — no parentheses needed.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Property access runs a function under the hood</text>
  <rect x="30" y="44" width="150" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="105" y="62" fill="currentColor" font-size="10" text-anchor="middle">read obj.fullName</text>
  <text x="105" y="78" fill="#22c55e" font-size="9" text-anchor="middle">→ get() computes</text>
  <rect x="30" y="96" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="105" y="114" fill="currentColor" font-size="10" text-anchor="middle">obj.fullName = "x y"</text>
  <text x="105" y="130" fill="#3b82f6" font-size="9" text-anchor="middle">→ set(v) validates/splits</text>
  <text x="350" y="72" fill="currentColor" font-size="10" text-anchor="middle">looks like a plain property,</text>
  <text x="350" y="92" fill="currentColor" font-size="10" text-anchor="middle">behaves like a method —</text>
  <text x="350" y="112" fill="currentColor" font-size="10" text-anchor="middle">great for computed + validated fields</text>
</svg>`)}

**How it works.** You define them with <code>get</code>/<code>set</code> keywords in object literals and classes, or via <code>Object.defineProperty</code>. A getter takes no args and returns the value; a setter takes the assigned value and usually stores it in a "backing" field. They enable computed properties (derive <code>fullName</code> from parts), validation on write, lazy computation, and read-only properties (a getter with no setter). The trade-off: a property access can now hide expensive work or side effects, so keep them cheap and predictable.

### Accessor vs data property
| | Data property | Accessor (get/set) |
| --- | --- | --- |
| Stores a value | yes | no (computes) |
| Runs code on read | no | yes (<code>get</code>) |
| Runs code on write | no | yes (<code>set</code>) |
| Read-only | <code>writable: false</code> | omit the <code>set</code> |

> **Interview tip:** Note that a getter without a setter makes a clean **read-only/computed** property, and that setters are the idiomatic place for **validation** on assignment. Caution: they can disguise costly work behind innocent-looking property access.`,
    examples: [
      {
        label: "Computed property + validation",
        runnable: true,
        code: `const user = {
  first: "Ada",
  last: "Lovelace",
  get fullName() { return this.first + " " + this.last; },   // read → compute
  set fullName(v) { [this.first, this.last] = v.split(" "); }, // write → split
};
console.log(user.fullName);       // "Ada Lovelace"
user.fullName = "Grace Hopper";
console.log(user.first, user.last); // "Grace" "Hopper"

// validation in a setter
const acct = {
  _bal: 0,
  get balance() { return this._bal; },
  set balance(v) { if (v < 0) throw new Error("negative!"); this._bal = v; },
};
acct.balance = 100;
console.log(acct.balance);        // 100`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between Object.freeze and const?",
    answer: `**Core concept (TL;DR).** They protect **different things**. <code>const</code> locks the **binding** — you can't reassign the variable to a new value. <code>Object.freeze</code> locks the **object's contents** — you can't add, remove, or change its properties. They're orthogonal: for a truly constant object you often want both.

${card(`<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">const = the variable · freeze = the contents</text>
  <rect x="20" y="42" width="230" height="104" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">const obj = {...}</text>
  <text x="135" y="86" fill="#ef4444" font-size="9.5" text-anchor="middle">obj = {} → TypeError</text>
  <text x="135" y="106" fill="#22c55e" font-size="9.5" text-anchor="middle">obj.a = 9 → allowed!</text>
  <text x="135" y="130" fill="currentColor" font-size="9" text-anchor="middle">locks the binding only</text>
  <rect x="270" y="42" width="230" height="104" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Object.freeze(obj)</text>
  <text x="385" y="86" fill="#ef4444" font-size="9.5" text-anchor="middle">obj.a = 9 → ignored</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">let obj = ... → still reassignable</text>
  <text x="385" y="130" fill="currentColor" font-size="9" text-anchor="middle">locks the contents (shallow)</text>
</svg>`)}

**How it works.** With <code>const obj = { a: 1 }</code>, reassigning <code>obj</code> throws, but <code>obj.a = 2</code> works — the *contents* are mutable. <code>Object.freeze(obj)</code> reverses this: property writes are silently ignored (or throw in strict mode), but a <code>let</code>-bound frozen object could still be reassigned. <code>freeze</code> is also **shallow** — nested objects stay mutable unless you recursively (deep-)freeze.

### What each locks
| Action | <code>const</code> | <code>Object.freeze</code> |
| --- | --- | --- |
| Reassign the variable | blocked | allowed |
| Change a property | allowed | blocked |
| Add / delete a property | allowed | blocked |
| Depth | n/a | shallow |

> **Interview tip:** The crisp line: "<code>const</code> protects the variable, <code>freeze</code> protects the object." Add that <code>freeze</code> is shallow — for true immutability you need a deep freeze (recurse) or a library, and <code>Object.isFrozen</code> tells you the state.`,
    examples: [
      {
        label: "Binding vs contents",
        runnable: true,
        code: `const arr = [1, 2];
arr.push(3);                 // allowed — const locks the binding, not contents
console.log(arr);             // [1, 2, 3]

const frozen = Object.freeze({ a: 1, nested: { b: 2 } });
frozen.a = 99;                // ignored (throws in strict mode)
frozen.c = 3;                 // ignored
console.log(frozen);          // { a: 1, nested: { b: 2 } }
console.log(Object.isFrozen(frozen)); // true

// freeze is SHALLOW — nested objects stay mutable
frozen.nested.b = 999;
console.log(frozen.nested.b); // 999  ⚠️`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between Object.freeze, seal, and preventExtensions?",
    answer: `**Core concept (TL;DR).** They're three escalating levels of object lockdown. <code>preventExtensions</code> blocks **adding** new properties. <code>seal</code> does that **and** blocks **deleting** properties. <code>freeze</code> does both **and** blocks **changing** existing values — full (shallow) immutability.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Escalating restrictions on an object</text>
  <rect x="18" y="42" width="160" height="112" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="98" y="62" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">preventExtensions</text>
  <text x="98" y="86" fill="#ef4444" font-size="9" text-anchor="middle">✗ add new</text>
  <text x="98" y="104" fill="#22c55e" font-size="9" text-anchor="middle">✓ edit existing</text>
  <text x="98" y="122" fill="#22c55e" font-size="9" text-anchor="middle">✓ delete</text>
  <rect x="186" y="42" width="160" height="112" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="266" y="62" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">seal</text>
  <text x="266" y="86" fill="#ef4444" font-size="9" text-anchor="middle">✗ add new</text>
  <text x="266" y="104" fill="#22c55e" font-size="9" text-anchor="middle">✓ edit existing</text>
  <text x="266" y="122" fill="#ef4444" font-size="9" text-anchor="middle">✗ delete</text>
  <rect x="354" y="42" width="150" height="112" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="429" y="62" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">freeze</text>
  <text x="429" y="86" fill="#ef4444" font-size="9" text-anchor="middle">✗ add new</text>
  <text x="429" y="104" fill="#ef4444" font-size="9" text-anchor="middle">✗ edit existing</text>
  <text x="429" y="122" fill="#ef4444" font-size="9" text-anchor="middle">✗ delete</text>
</svg>`)}

**How it works.** Each builds on the last. <code>preventExtensions</code> only stops new keys. <code>seal</code> also marks every property non-configurable (no deleting/redefining) but values stay writable. <code>freeze</code> additionally makes properties non-writable, so nothing changes. All three are **shallow** (nested objects remain mutable), and each has a matching predicate: <code>isExtensible</code>, <code>isSealed</code>, <code>isFrozen</code>. In strict mode, violating these throws; otherwise the operation is silently ignored.

### The three levels
| | add | edit | delete |
| --- | --- | --- | --- |
| <code>preventExtensions</code> | ✗ | ✓ | ✓ |
| <code>seal</code> | ✗ | ✓ | ✗ |
| <code>freeze</code> | ✗ | ✗ | ✗ |

> **Interview tip:** Remember it as a ladder: preventExtensions ⊂ seal ⊂ freeze. Each adds one more restriction (no-add → no-delete → no-edit). And all are shallow — deep immutability needs recursion.`,
    examples: [
      {
        label: "Each level, demonstrated",
        runnable: true,
        code: `const a = Object.preventExtensions({ x: 1 });
a.x = 2; a.y = 3;            // edit ok, add ignored
console.log(a);              // { x: 2 }

const b = Object.seal({ x: 1 });
b.x = 9; delete b.x; b.y = 3; // edit ok; delete + add ignored
console.log(b);              // { x: 9 }

const c = Object.freeze({ x: 1 });
c.x = 9; c.y = 3;            // everything ignored
console.log(c);              // { x: 1 }

console.log(Object.isSealed(b), Object.isFrozen(c)); // true true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When should you use Map and Set over objects and arrays?",
    answer: `**Core concept (TL;DR).** Use a <code>Map</code> instead of a plain object when you need a true **dictionary**: keys of **any type**, reliable **insertion order**, a <code>.size</code>, and frequent add/delete. Use a <code>Set</code> instead of an array when you need a collection of **unique values** with fast membership tests.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Map = keyed dictionary · Set = unique values</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Map vs Object</text>
  <text x="135" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">keys: any type (incl objects)</text>
  <text x="135" y="102" fill="currentColor" font-size="9.5" text-anchor="middle">ordered · .size · easy iterate</text>
  <text x="135" y="122" fill="currentColor" font-size="9.5" text-anchor="middle">fast add/delete, no proto keys</text>
  <text x="135" y="142" fill="#3b82f6" font-size="9" text-anchor="middle">use for dynamic dictionaries</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Set vs Array</text>
  <text x="385" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">unique values only</text>
  <text x="385" y="102" fill="currentColor" font-size="9.5" text-anchor="middle">O(1) has() membership</text>
  <text x="385" y="122" fill="currentColor" font-size="9.5" text-anchor="middle">[...new Set(arr)] dedupes</text>
  <text x="385" y="142" fill="#22c55e" font-size="9" text-anchor="middle">use for dedup + lookups</text>
</svg>`)}

**How it works.** A plain object only supports string/symbol keys, inherits prototype keys (collision risk), and has no direct size. <code>Map</code> fixes all of that: any value as a key (including objects/functions), guaranteed insertion order, <code>.size</code>, and clean iteration with <code>for…of</code>. <code>Set</code> stores only distinct values (using SameValueZero), giving O(1) <code>has</code> versus an array's O(n) <code>includes</code> — the idiomatic dedupe is <code>[...new Set(arr)]</code>. Keep plain objects/arrays for fixed-shape records and ordered lists where JSON serialization matters (Map/Set don't <code>JSON.stringify</code> directly).

### When to switch
| Need | Reach for |
| --- | --- |
| Keys that aren't strings | <code>Map</code> |
| Frequent add/remove + size | <code>Map</code> |
| Unique values | <code>Set</code> |
| Fast "is it in here?" | <code>Set</code> |
| Fixed record / JSON | object/array |

> **Interview tip:** Name concrete wins: object keys are coerced to strings (<code>obj[1]</code> and <code>obj["1"]</code> collide) while <code>Map</code> keeps them distinct; and <code>Set.has</code> is O(1) vs <code>Array.includes</code> O(n). Caveat: Map/Set need conversion to serialize to JSON.`,
    examples: [
      {
        label: "Any-type keys + dedupe",
        runnable: true,
        code: `const m = new Map();
const objKey = { id: 1 };
m.set(objKey, "by object").set("s", 1).set(1, "by number");
console.log(m.get(objKey), m.size);   // "by object" 3
console.log([...m.keys()]);            // [{id:1}, "s", 1] (mixed, ordered)

// object would collide: 1 and "1" become the same key
const o = {}; o[1] = "num"; o["1"] = "str";
console.log(o);                         // { "1": "str" } — collision!

// Set: uniqueness + fast membership
const s = new Set([1, 1, 2, 3, 3]);
console.log([...s], s.size, s.has(2));  // [1,2,3] 3 true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are WeakMap and WeakSet?",
    answer: `**Core concept (TL;DR).** <code>WeakMap</code> and <code>WeakSet</code> are collections that hold their keys/values **weakly**: entries reference objects without preventing them from being garbage-collected. When the only reference left to an object is inside a WeakMap/WeakSet, it can be reclaimed automatically — preventing memory leaks.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Weak references → keys can be garbage-collected</text>
  <rect x="30" y="46" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="105" y="70" fill="currentColor" font-size="10" text-anchor="middle">key object</text>
  <path d="M 180 66 L 240 66" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#wm-a)"/>
  <text x="210" y="56" fill="#f59e0b" font-size="8.5" text-anchor="middle">weak</text>
  <rect x="242" y="46" width="150" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="317" y="70" fill="currentColor" font-size="10" text-anchor="middle">WeakMap value</text>
  <text x="260" y="120" fill="currentColor" font-size="10" text-anchor="middle">drop the last other reference → entry is GC'd automatically</text>
  <text x="260" y="142" fill="#ef4444" font-size="9" text-anchor="middle">object keys only · not iterable · no .size</text>
  <defs><marker id="wm-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>`)}

**How it works.** Because the references are weak, the engine can collect an entry as soon as its key object is unreachable elsewhere. That forces two restrictions: keys (WeakMap) / values (WeakSet) **must be objects**, and the collection is **not iterable** and has no <code>.size</code> (you can't enumerate something that might vanish mid-iteration). Classic uses: attaching **private data** or **metadata** to objects (e.g. DOM nodes) and **caches** keyed by object — all without leaking memory when those objects go away.

### WeakMap/WeakSet vs Map/Set
| | <code>Map</code>/<code>Set</code> | <code>WeakMap</code>/<code>WeakSet</code> |
| --- | --- | --- |
| Keys/values | any | objects only |
| References | strong | weak (GC-able) |
| Iterable / <code>.size</code> | yes | no |
| Best for | general collections | per-object metadata, caches |

> **Interview tip:** The headline: WeakMap lets you associate data with an object **without keeping it alive**, so it's leak-free caching/private-state. Explain that "not iterable / no size" is a *consequence* of weak references — the contents can disappear non-deterministically.`,
    examples: [
      {
        label: "Object-keyed, non-iterable metadata store",
        runnable: true,
        code: `const meta = new WeakMap();
let node = { id: "header" };

meta.set(node, { clicks: 0 });        // attach private metadata
console.log(meta.get(node));           // { clicks: 0 }
console.log(meta.has(node));           // true

// keys MUST be objects
try { meta.set("str", 1); } catch (e) { console.log(e.name); } // "TypeError"

// not iterable, no size (consequence of weak refs)
console.log("size" in meta, typeof meta[Symbol.iterator]); // false "undefined"

// once 'node' is unreachable elsewhere, the entry becomes GC-eligible
node = null;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is JSON and why is it commonly used?",
    answer: `**Core concept (TL;DR).** JSON (JavaScript Object Notation) is a lightweight, **text-based** data format for exchanging structured data. It's language-independent and human-readable, which is why it's the default for APIs, config files, and storage. In JS you serialize with <code>JSON.stringify</code> and parse with <code>JSON.parse</code>.

${card(`<svg viewBox="0 0 520 158" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Objects ⇄ portable text</text>
  <rect x="40" y="48" width="150" height="56" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="115" y="72" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">JS object</text>
  <text x="115" y="92" fill="currentColor" font-size="9" text-anchor="middle">{ name: "Ada" }</text>
  <rect x="330" y="48" width="150" height="56" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="405" y="72" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">JSON text</text>
  <text x="405" y="92" fill="currentColor" font-size="9" text-anchor="middle">{"name":"Ada"}</text>
  <path d="M 192 66 L 328 66" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#js-a)"/>
  <text x="260" y="60" fill="currentColor" font-size="9" text-anchor="middle">JSON.stringify</text>
  <path d="M 328 90 L 192 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#js-a)"/>
  <text x="260" y="104" fill="currentColor" font-size="9" text-anchor="middle">JSON.parse</text>
  <text x="260" y="138" fill="#ef4444" font-size="9" text-anchor="middle">drops functions / undefined / Symbol · dates → strings · no circular refs</text>
  <defs><marker id="js-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** JSON supports a small set of types: objects, arrays, strings, numbers, booleans, and <code>null</code>. <code>JSON.stringify</code> walks a value and emits text (with optional <code>replacer</code> and indentation args); <code>JSON.parse</code> does the reverse (with an optional <code>reviver</code>). Know the lossy edges: functions, <code>undefined</code>, and symbols are **dropped** (or become <code>null</code> in arrays), <code>Date</code> objects become ISO **strings**, <code>Map</code>/<code>Set</code> don't serialize, <code>BigInt</code> throws, and **circular references** throw a <code>TypeError</code>.

### Gotchas to know
| Input | After <code>stringify</code> → <code>parse</code> |
| --- | --- |
| function / <code>undefined</code> | dropped from objects |
| <code>Date</code> | ISO string (not a Date) |
| <code>Map</code> / <code>Set</code> | <code>{}</code> (not serialized) |
| circular reference | <code>TypeError</code> |

> **Interview tip:** A favourite quick gotcha: <code>JSON.parse(JSON.stringify(obj))</code> is a common "deep clone," but it silently loses functions/<code>undefined</code>/dates and dies on cycles — call out <code>structuredClone()</code> as the safer modern alternative.`,
    examples: [
      {
        label: "Serialize, parse, and the lossy edges",
        runnable: true,
        code: `const user = { name: "Ada", born: 1815, fn: () => {}, missing: undefined };
const json = JSON.stringify(user);
console.log(json);              // {"name":"Ada","born":1815} — fn & undefined dropped
console.log(JSON.parse(json));  // { name: "Ada", born: 1815 }

// pretty-print with indentation
console.log(JSON.stringify({ a: 1, b: [2, 3] }, null, 2));

// circular references throw
try {
  const o = {}; o.self = o;
  JSON.stringify(o);
} catch (e) {
  console.log(e.name);          // "TypeError"
}`,
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
