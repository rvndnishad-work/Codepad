/**
 * Phase 2 — Batch "Types & quirks": rewrite 6 type-system stubs to interview
 * depth (TL;DR + SVG + table + tip + runnable example). Patch-in-place, same as
 * the Phase 1 batch scripts.
 *
 *   npx tsx scripts/js-rewrites-phase2-types.ts
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
    title: "What is the difference between null and undefined?",
    answer: `**Core concept (TL;DR).** Both represent "no value," but the *intent* differs. <code>undefined</code> means a value is **missing by default** — a variable declared but not assigned, a missing property, or a function with no return. <code>null</code> is an **intentional, explicit** "no value" that *you* assign to signal emptiness.

${card(`<svg viewBox="0 0 520 178" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Absent-by-default vs deliberately-empty</text>
  <rect x="20" y="40" width="230" height="124" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="135" y="62" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">undefined</text>
  <text x="135" y="86" fill="currentColor" font-size="10" text-anchor="middle">the engine's default</text>
  <text x="135" y="106" fill="currentColor" font-size="10" text-anchor="middle">unassigned var, missing prop</text>
  <text x="135" y="126" fill="currentColor" font-size="10" text-anchor="middle">no return value</text>
  <text x="135" y="150" fill="#f59e0b" font-size="9.5" text-anchor="middle">typeof → "undefined"</text>
  <rect x="270" y="40" width="230" height="124" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="385" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">null</text>
  <text x="385" y="86" fill="currentColor" font-size="10" text-anchor="middle">you assign it on purpose</text>
  <text x="385" y="106" fill="currentColor" font-size="10" text-anchor="middle">"intentionally empty"</text>
  <text x="385" y="126" fill="currentColor" font-size="10" text-anchor="middle">e.g. "no user yet"</text>
  <text x="385" y="150" fill="#3b82f6" font-size="9.5" text-anchor="middle">typeof → "object" (legacy bug)</text>
</svg>`)}

**How it works.** A famous wart: <code>typeof null</code> returns <code>"object"</code> (a bug kept for backwards-compatibility), while <code>typeof undefined</code> is <code>"undefined"</code>. They're loosely equal but not strictly equal — <code>null == undefined</code> is <code>true</code>, <code>null === undefined</code> is <code>false</code>. Default parameters and <code>??</code> trigger on <code>undefined</code> but treat <code>null</code> as a real value in some cases — know which you're testing.

### null vs undefined
| | <code>undefined</code> | <code>null</code> |
| --- | --- | --- |
| Set by | the engine (default) | the developer |
| <code>typeof</code> | <code>"undefined"</code> | <code>"object"</code> |
| Meaning | "not assigned yet" | "intentionally empty" |
| In JSON | key is omitted | kept as <code>null</code> |
| Default params trigger | yes | no |

> **Interview tip:** The clean catch-all is <code>x == null</code> — the one idiomatic use of loose equality — which is <code>true</code> for **both** <code>null</code> and <code>undefined</code>. And always mention the <code>typeof null === "object"</code> historical bug.`,
    examples: [
      {
        label: "Default vs intentional emptiness",
        runnable: true,
        code: `let a;                       // declared, not assigned
const obj = { name: "Ada" };
console.log(a);              // undefined
console.log(obj.age);       // undefined (missing property)
console.log(typeof undefined, typeof null); // "undefined" "object" (legacy bug)

console.log(null == undefined);   // true  (loose)
console.log(null === undefined);  // false (strict)

// default params trigger on undefined, NOT null
function greet(name = "guest") { return "Hi " + name; }
console.log(greet(undefined)); // "Hi guest"
console.log(greet(null));       // "Hi null"

const x = null;
console.log(x == null);          // true — catches null OR undefined`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you correctly check for NaN?",
    answer: `**Core concept (TL;DR).** <code>NaN</code> ("Not-a-Number") is the only JavaScript value **not equal to itself**, so <code>x === NaN</code> is always <code>false</code> and can never work. The correct test is <code>Number.isNaN(x)</code>, which checks strictly. Avoid the **global** <code>isNaN()</code> — it coerces its argument first, giving false positives.

${card(`<svg viewBox="0 0 520 176" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Number.isNaN (strict) vs global isNaN (coerces)</text>
  <rect x="20" y="40" width="230" height="122" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="62" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">global isNaN("hello")</text>
  <text x="135" y="88" fill="currentColor" font-size="10" text-anchor="middle">coerces "hello" → NaN</text>
  <text x="135" y="110" fill="#ef4444" font-size="10" text-anchor="middle">returns true ❌</text>
  <text x="135" y="138" fill="currentColor" font-size="9.5" text-anchor="middle">false positive</text>
  <rect x="270" y="40" width="230" height="122" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Number.isNaN("hello")</text>
  <text x="385" y="88" fill="currentColor" font-size="10" text-anchor="middle">no coercion</text>
  <text x="385" y="110" fill="#22c55e" font-size="10" text-anchor="middle">returns false ✓</text>
  <text x="385" y="138" fill="currentColor" font-size="9.5" text-anchor="middle">only true for real NaN</text>
</svg>`)}

**How it works.** <code>NaN</code> results from invalid math like <code>0/0</code> or <code>Number("oops")</code>. Because <code>NaN !== NaN</code>, equality checks are useless. <code>Number.isNaN</code> returns <code>true</code> only when the argument *is* the <code>NaN</code> value. The legacy global <code>isNaN</code> first converts to a number, so <code>isNaN("hello")</code> is <code>true</code> — rarely what you want. The self-inequality quirk even gives a clever one-liner: <code>x !== x</code> is <code>true</code> only for <code>NaN</code>.

### Ways to test
| Check | Behaviour |
| --- | --- |
| <code>x === NaN</code> | always <code>false</code> — never use |
| <code>Number.isNaN(x)</code> | strict, correct ✓ |
| <code>isNaN(x)</code> (global) | coerces first — false positives |
| <code>x !== x</code> | <code>true</code> only for <code>NaN</code> |

> **Interview tip:** Lead with "NaN is the only value not equal to itself," then recommend <code>Number.isNaN</code>. Knowing the <code>x !== x</code> trick and why global <code>isNaN</code> is unsafe signals real depth.`,
    examples: [
      {
        label: "Checking for NaN the right way",
        runnable: true,
        code: `const bad = Number("oops");   // NaN
console.log(bad === NaN);     // false — NaN is never equal to anything
console.log(Number.isNaN(bad)); // true  ✓ correct

// global isNaN coerces → false positives
console.log(isNaN("hello"));        // true  ❌ ("hello" → NaN first)
console.log(Number.isNaN("hello")); // false ✓ ("hello" is a string, not NaN)

// the self-inequality trick
console.log(bad !== bad);     // true  → only NaN behaves this way`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does instanceof work?",
    answer: `**Core concept (TL;DR).** <code>obj instanceof Ctor</code> returns <code>true</code> if <code>Ctor.prototype</code> appears **anywhere in <code>obj</code>'s prototype chain**. It tests the inheritance relationship, not a "type" — so it works for objects/instances but not for primitives.

${card(`<svg viewBox="0 0 520 178" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">instanceof walks the prototype chain</text>
  <rect x="40" y="40" width="150" height="34" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="115" y="62" fill="currentColor" font-size="10" text-anchor="middle">dog</text>
  <rect x="40" y="92" width="150" height="34" rx="7" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.4"/>
  <text x="115" y="114" fill="currentColor" font-size="10" text-anchor="middle">Dog.prototype</text>
  <rect x="40" y="144" width="150" height="30" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="1.4"/>
  <text x="115" y="164" fill="currentColor" font-size="10" text-anchor="middle">Animal.prototype</text>
  <path d="M 115 74 L 115 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#io-a)"/>
  <path d="M 115 126 L 115 142" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#io-a)"/>
  <text x="320" y="80" fill="currentColor" font-size="10" text-anchor="middle">dog instanceof Dog → true</text>
  <text x="320" y="104" fill="currentColor" font-size="10" text-anchor="middle">dog instanceof Animal → true</text>
  <text x="320" y="128" fill="#ef4444" font-size="10" text-anchor="middle">dog instanceof Array → false</text>
  <defs><marker id="io-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The engine starts at <code>Object.getPrototypeOf(obj)</code> and follows <code>[[Prototype]]</code> links, checking each against <code>Ctor.prototype</code> until it matches (<code>true</code>) or hits <code>null</code> (<code>false</code>). Two gotchas: it returns <code>false</code> for **primitives** (<code>"hi" instanceof String</code> is <code>false</code>), and it can fail **across realms** (an array from another iframe isn't <code>instanceof</code> your <code>Array</code>) — which is why <code>Array.isArray()</code> exists.

### instanceof vs the alternatives
| Tool | Best for |
| --- | --- |
| <code>instanceof</code> | custom class / inheritance checks |
| <code>typeof</code> | primitives (<code>"string"</code>, <code>"number"</code>…) |
| <code>Array.isArray()</code> | arrays (realm-safe) |
| <code>Object.prototype.toString.call()</code> | precise built-in tag |

> **Interview tip:** Mention the cross-realm pitfall and <code>Array.isArray</code>. Bonus depth: <code>instanceof</code> is customizable via the <code>Symbol.hasInstance</code> well-known symbol.`,
    examples: [
      {
        label: "Chain checks, primitives, and arrays",
        runnable: true,
        code: `class Animal {}
class Dog extends Animal {}
const d = new Dog();

console.log(d instanceof Dog);     // true
console.log(d instanceof Animal);  // true (further up the chain)
console.log(d instanceof Object);  // true (everything inherits Object)
console.log(d instanceof Array);   // false

// primitives are NOT instances of their wrapper
console.log("hi" instanceof String);   // false
console.log(typeof "hi");                // "string" — use typeof for primitives

// arrays: prefer Array.isArray (realm-safe)
console.log([] instanceof Array, Array.isArray([])); // true true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Symbols and what are they used for?",
    answer: `**Core concept (TL;DR).** <code>Symbol</code> is a primitive type whose every value is **guaranteed unique** — <code>Symbol("x") !== Symbol("x")</code>. Their main job is **collision-free object keys**: a symbol property never clashes with a string key, even one with the same description.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Every Symbol() is a brand-new unique token</text>
  <rect x="40" y="44" width="130" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="#3b82f6"/>
  <text x="105" y="68" fill="currentColor" font-size="10" text-anchor="middle">Symbol("id") #1</text>
  <rect x="200" y="44" width="130" height="40" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke="#f59e0b"/>
  <text x="265" y="68" fill="currentColor" font-size="10" text-anchor="middle">Symbol("id") #2</text>
  <rect x="360" y="44" width="130" height="40" rx="8" fill="#22c55e" fill-opacity="0.13" stroke="#22c55e"/>
  <text x="425" y="68" fill="currentColor" font-size="10" text-anchor="middle">Symbol("id") #3</text>
  <text x="265" y="108" fill="#ef4444" font-size="10.5" text-anchor="middle" font-weight="700">#1 !== #2 !== #3  — never collide</text>
  <text x="265" y="138" fill="currentColor" font-size="10" text-anchor="middle">used as hidden, conflict-proof object keys + well-known hooks</text>
</svg>`)}

**How it works.** Symbols are created with <code>Symbol(desc)</code> (the description is just a label for debugging). As keys they're skipped by <code>for…in</code>, <code>Object.keys</code>, and <code>JSON.stringify</code>, making them ideal for metadata you don't want to leak. JavaScript also ships **well-known symbols** that let you hook into language behaviour — <code>Symbol.iterator</code> makes an object iterable, <code>Symbol.asyncIterator</code>, <code>Symbol.hasInstance</code>, and more.

### Uses for symbols
| Use | Why a symbol |
| --- | --- |
| Unique object keys | never clash with other keys |
| "Hidden" metadata | invisible to <code>Object.keys</code> / JSON |
| Well-known hooks | <code>Symbol.iterator</code> etc. customize behaviour |
| Global registry | <code>Symbol.for("k")</code> shares one across the app |

> **Interview tip:** Distinguish <code>Symbol()</code> (always unique) from <code>Symbol.for("k")</code> (looked up in a global registry, so the same key returns the same symbol). And note symbol keys aren't truly private — <code>Object.getOwnPropertySymbols</code> can still find them.`,
    examples: [
      {
        label: "Uniqueness and collision-free keys",
        runnable: true,
        code: `const a = Symbol("id");
const b = Symbol("id");
console.log(a === b);            // false — always unique

const user = { name: "Ada" };
user[a] = 101;                   // symbol key
user.name = "Ada Lovelace";
console.log(user[a]);            // 101
console.log(Object.keys(user));  // ["name"] — symbol key is hidden
console.log(JSON.stringify(user)); // {"name":"Ada Lovelace"} — symbol skipped

// global registry: same key → same symbol
console.log(Symbol.for("app") === Symbol.for("app")); // true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is BigInt?",
    answer: `**Core concept (TL;DR).** <code>BigInt</code> is a primitive for **arbitrary-precision integers** — whole numbers larger than <code>Number</code> can safely hold. Regular numbers are 64-bit floats and lose precision past <code>Number.MAX_SAFE_INTEGER</code> (2⁵³−1); BigInt has no such limit. Create one with an <code>n</code> suffix (<code>10n</code>) or <code>BigInt(10)</code>.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Past 2⁵³−1, Number loses precision; BigInt doesn't</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">Number (64-bit float)</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">safe up to 9007199254740991</text>
  <text x="135" y="112" fill="#ef4444" font-size="9.5" text-anchor="middle">beyond → rounding errors</text>
  <text x="135" y="134" fill="currentColor" font-size="9" text-anchor="middle">…992 === …993 (!)</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">BigInt (arbitrary)</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">10n, BigInt(10)</text>
  <text x="385" y="112" fill="#22c55e" font-size="9.5" text-anchor="middle">exact at any size</text>
  <text x="385" y="134" fill="currentColor" font-size="9" text-anchor="middle">can't mix with Number</text>
</svg>`)}

**How it works.** BigInt arithmetic stays exact no matter how large the value, which matters for IDs, timestamps in nanoseconds, cryptography, and big counters. The catch: you **can't mix** BigInt and Number in an operation (<code>10n + 1</code> throws a <code>TypeError</code>) — convert explicitly first. BigInt is integer-only (no decimals), <code>typeof 10n</code> is <code>"bigint"</code>, and it isn't supported by <code>JSON.stringify</code>.

### Number vs BigInt
| | <code>Number</code> | <code>BigInt</code> |
| --- | --- | --- |
| Range | safe to 2⁵³−1 | unlimited integers |
| Decimals | yes | no (integers only) |
| Literal | <code>10</code> | <code>10n</code> |
| Mix in math | — | not with <code>Number</code> |
| <code>typeof</code> | <code>"number"</code> | <code>"bigint"</code> |

> **Interview tip:** Name the concrete failure: <code>9007199254740992 === 9007199254740993</code> is <code>true</code> for plain numbers (precision loss), whereas BigInt keeps them distinct. Mention you must convert before mixing types.`,
    examples: [
      {
        label: "Precision past MAX_SAFE_INTEGER",
        runnable: true,
        code: `console.log(Number.MAX_SAFE_INTEGER);  // 9007199254740991

// plain Number loses precision beyond that
console.log(9007199254740992 === 9007199254740993); // true (!) — rounding

// BigInt stays exact
const big = 9007199254740993n;
console.log(big);                       // 9007199254740993n
console.log(big + 1n);                  // 9007199254740994n
console.log(typeof big);                // "bigint"

// you can't mix BigInt and Number
try { console.log(10n + 1); } catch (e) { console.log(e.name); } // "TypeError"
console.log(10n + BigInt(1));           // 11n — convert first`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Why is 0.1 + 0.2 not exactly 0.3?",
    answer: `**Core concept (TL;DR).** JavaScript numbers are IEEE-754 **64-bit binary floats**. Just as 1/3 can't be written exactly in decimal, <code>0.1</code> and <code>0.2</code> have **no exact binary representation** — they're stored as the nearest available value. Adding those tiny rounding errors gives <code>0.30000000000000004</code>.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Decimal fractions → inexact binary floats</text>
  <rect x="30" y="44" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke="#f59e0b"/>
  <text x="90" y="62" fill="currentColor" font-size="10" text-anchor="middle">0.1</text>
  <text x="90" y="77" fill="currentColor" font-size="8" text-anchor="middle">≈ 0.1000…0005</text>
  <rect x="30" y="98" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke="#f59e0b"/>
  <text x="90" y="116" fill="currentColor" font-size="10" text-anchor="middle">0.2</text>
  <text x="90" y="131" fill="currentColor" font-size="8" text-anchor="middle">≈ 0.2000…0001</text>
  <path d="M 150 64 L 230 86" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fl-a)"/>
  <path d="M 150 118 L 230 96" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fl-a)"/>
  <rect x="234" y="70" width="250" height="42" rx="8" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/>
  <text x="359" y="88" fill="currentColor" font-size="10" text-anchor="middle">0.1 + 0.2 =</text>
  <text x="359" y="104" fill="#ef4444" font-size="10" text-anchor="middle">0.30000000000000004</text>
  <defs><marker id="fl-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Binary fractions can only exactly represent sums of powers of two (½, ¼, ⅛…). <code>0.1</code> isn't such a sum, so it rounds to the closest 64-bit value, and the error surfaces when you add. This isn't a JS bug — every IEEE-754 language (Python, Java, C) does the same. To compare safely, check that the difference is within a tiny tolerance (<code>Number.EPSILON</code>), or work in integers (cents instead of dollars), or round with <code>toFixed</code>.

### Handling float math
| Approach | Example |
| --- | --- |
| Tolerance compare | <code>Math.abs(a - b) &lt; Number.EPSILON</code> |
| Round for display | <code>(0.1 + 0.2).toFixed(2)</code> → <code>"0.30"</code> |
| Integer cents | store money as <code>30</code>, not <code>0.30</code> |

> **Interview tip:** Say it's IEEE-754 floating point, not a JS quirk, and that money should **never** be stored as a float — use integer minor units (cents). Knowing <code>Number.EPSILON</code> for tolerance comparisons is the senior-level detail.`,
    examples: [
      {
        label: "The error and how to handle it",
        runnable: true,
        code: `console.log(0.1 + 0.2);            // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);    // false

// 1) tolerance comparison
const eq = (a, b) => Math.abs(a - b) < Number.EPSILON;
console.log(eq(0.1 + 0.2, 0.3));   // true

// 2) round for display
console.log((0.1 + 0.2).toFixed(2)); // "0.30"

// 3) work in integer minor units (e.g. cents)
console.log((10 + 20) / 100);       // 0.3 exactly`,
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
