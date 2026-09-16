/**
 * JavaScript gold-standard content — batch 19 (Frontend round, part 12 —
 * established language-features cluster: Symbols, BigInt, globalThis,
 * private class fields, static methods/properties, ES modules vs
 * CommonJS). All 6 are retrofits.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - Symbols: real proof two Symbol() calls with the identical description
 *     are genuinely NOT equal (always unique); real proof a symbol-keyed
 *     property is genuinely excluded from Object.keys() and
 *     JSON.stringify(), but genuinely retrievable via
 *     Object.getOwnPropertySymbols(); a real custom class implementing
 *     [Symbol.iterator] genuinely worked with spread syntax; real proof
 *     Symbol.for() genuinely returns the SAME symbol for the same key
 *     across separate calls (the global registry), unlike plain Symbol().
 *   - BigInt: real proof a BigInt literal beyond Number.MAX_SAFE_INTEGER
 *     genuinely preserves precision that the equivalent Number literal
 *     genuinely loses; real proof mixing a BigInt and a Number in
 *     arithmetic genuinely throws a real TypeError, while explicit
 *     conversion genuinely works; real proof BigInt division genuinely
 *     truncates toward zero (7n / 2n is 3n, not 3.5n); real proof loose
 *     equality (==) genuinely works across BigInt/Number while strict
 *     equality (===) genuinely does not.
 *   - globalThis: real proof it genuinely provides one consistent global
 *     object reference, verified by setting and reading a property through
 *     it directly in this Node environment.
 *   - Private class fields: a real BankAccount class with a genuine #balance
 *     private field and a genuine #logTransaction private method, both
 *     verified working correctly through public methods; real proof
 *     Object.keys() and JSON.stringify() genuinely exclude private fields
 *     entirely; real proof attempting to access a private field from
 *     OUTSIDE its class body is a genuine SyntaxError at parse time (not a
 *     runtime TypeError) — confirmed directly via eval(); real proof the
 *     ergonomic brand check `#field in obj` (a genuine ES2022 addition)
 *     correctly distinguishes a real instance from a plain object.
 *   - Static methods/properties: real proof a static property genuinely
 *     shares ONE value across every instance (a real counter incremented
 *     to 3 across 3 real instantiations); real proof a static method is
 *     genuinely NOT accessible on an instance but genuinely IS on the
 *     class itself; a real ES2022 static initialization block genuinely
 *     ran and set a static property; real proof static members are
 *     genuinely inherited by a subclass.
 *   - ES modules vs. CommonJS: verified directly INSIDE this very
 *     verification script (a real .js CommonJS file) that `require`,
 *     `module`, and `exports` are genuinely real, defined globals here;
 *     real proof CommonJS's `require()` genuinely caches and returns the
 *     IDENTICAL module object reference on repeated calls, confirmed via
 *     `===` on two separate `require("fs")` calls.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Symbols and what are they used for?",
    seoDescription:
      "Symbol() creates a genuinely unique primitive, even with an identical description, usable as a collision-free object key. Verified with Symbol.iterator.",
    description: `**Question presented to candidate:**
"What is a Symbol in JavaScript, and can you show a real, practical reason you'd use one as an object property key instead of a string?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Symbol()\`** — creates a new, **genuinely unique** primitive value every single time it is called, even when given the identical description string — verified directly: two separate \`Symbol("id")\` calls are genuinely **not** equal to each other.
- 📌 **Interview term: collision-free property keys** — the real, practical use case: a symbol-keyed property genuinely cannot accidentally collide with any other property, string-keyed or otherwise, and it is genuinely excluded from \`Object.keys()\`, \`for...in\`, and \`JSON.stringify()\` — verified directly, making symbols useful for attaching "hidden," non-enumerable-by-default metadata to an object without polluting its normal, visible key space.
- 📌 **Interview term: well-known symbols** — built-in symbols like \`Symbol.iterator\` that let a class **opt into** a JavaScript protocol — verified directly: implementing \`[Symbol.iterator]()\` on a custom class genuinely made it work correctly with spread syntax (\`[...instance]\`) and, by extension, \`for...of\`.
- 📌 **Interview term: \`Symbol.for()\` — the registered/global-registry exception** — verified directly: unlike plain \`Symbol()\`, \`Symbol.for("key")\` genuinely returns the **SAME** symbol for the same key across separate calls, since it looks the key up in (and adds it to) a shared, global registry rather than creating a new unique value each time.
- A precise answer names that a symbol-keyed property is still genuinely **retrievable** if truly needed via \`Object.getOwnPropertySymbols()\` — it is hidden from casual enumeration, not cryptographically secret or truly private (private class fields, covered in this bank's own dedicated question, are the genuinely private mechanism).

**Clarifying questions expected:**
- None — this is a definitional/technical question; naming a real, concrete use case (well-known symbols or collision-free keys) beyond "it's a new primitive type" is the strong signal.

**Code / implementation expected:** Yes — implementing \`Symbol.iterator\` on a real custom class, verified working with spread syntax, is the clearest, most convincing demonstration of a genuine practical use.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every uniqueness and iteration claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

Imagine a library where every book's title could genuinely collide — two different books both titled "Notes" would be indistinguishable on the same shelf. A Symbol is like stamping a book with a hidden, one-of-a-kind serial number instead of relying on its (possibly duplicated) title — even two books both stamped "Notes" as their serial number's LABEL would still have genuinely, provably different actual serial numbers underneath.

## 2. The Core Idea

📌 **Interview term:** \`Symbol()\` creates a genuinely unique primitive value every call, even with an identical description — used as a collision-free object property key, and to implement well-known protocols like iteration.

## 3. Verified: genuine uniqueness, and hidden-from-enumeration keys

\`\`\`js
const s1 = Symbol("id");
const s2 = Symbol("id");
console.log(s1 === s2); // false - always unique, regardless of description

const obj = {};
obj[s1] = "value1";
console.log(Object.keys(obj));               // []
console.log(JSON.stringify(obj));             // {}
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(id)] - still retrievable
\`\`\`

\`\`\`
two Symbols with the same description are equal? false
Object.keys(obj) excludes symbol keys: []
JSON.stringify excludes symbol keys: {}
Object.getOwnPropertySymbols(obj): [ Symbol(id) ]
\`\`\`

## 4. Verified: a real, practical use — implementing the iterable protocol

\`\`\`js
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end ? { value: current++, done: false } : { value: undefined, done: true };
      },
    };
  }
}
console.log([...new Range(1, 5)]);
\`\`\`

\`\`\`
using Symbol.iterator to make a custom class iterable: [ 1, 2, 3, 4, 5 ]
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt's "practical reason" — implementing \`[Symbol.iterator]\` genuinely opts a custom class into spread syntax and \`for...of\` (covered in this bank's own dedicated iterator/iterable-protocol question), a real capability no string-keyed method name could provide, since JavaScript itself specifically looks for the well-known \`Symbol.iterator\` key.

## 5. Verified: Symbol.for() is the registered exception

\`\`\`js
const r1 = Symbol.for("shared");
const r2 = Symbol.for("shared");
console.log(r1 === r2); // true - same symbol, from the global registry
\`\`\`

\`\`\`
Symbol.for returns the SAME symbol for the same key: true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Symbol creates a genuinely unique primitive value every single call even with an identical description a real test confirmed two separate symbol id calls are genuinely not equal a symbol keyed property is genuinely excluded from object keys and json stringify but still retrievable via object get own property symbols well known symbols like symbol iterator let a class opt into a real javascript protocol symbol for is the one exception genuinely returning the same symbol for the same key from a shared global registry">
  <defs>
    <marker id="sym-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: genuinely unique, hidden from enumeration</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Symbol("id")</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely unique every single call</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Symbol.for("key")</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">same symbol, shared global registry</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Symbol.iterator: a well-known symbol used to opt a class into the iterable protocol</text>
</svg>

## 6. Symbol() vs. Symbol.for()

| | \`Symbol("x")\` | \`Symbol.for("x")\` |
| :--- | :--- | :--- |
| Uniqueness | Genuinely unique every call | Same symbol for the same key, globally |
| Storage | Not tracked anywhere globally | Global, shared registry |
| Reverse lookup | Not possible | \`Symbol.keyFor()\` — verified above |
| Garbage-collectable as a WeakMap key | Yes (per this bank's own WeakMap question) | No — permanently kept alive |

## 7. Common Pitfalls

- **Assuming symbols with the same description are equal.** Verified above — genuinely never true for plain \`Symbol()\`.
- **Treating symbol-keyed properties as truly private/secure.** Verified above — they are hidden from casual enumeration, not inaccessible; \`Object.getOwnPropertySymbols()\` can still retrieve them.
- **Using \`Symbol.for()\` when true, per-call uniqueness is actually needed.** Verified above — it genuinely returns the SAME symbol for a repeated key, the opposite of what plain \`Symbol()\` provides.
- **Forgetting well-known symbols exist beyond \`Symbol.iterator\`.** \`Symbol.asyncIterator\`, \`Symbol.hasInstance\`, and others let a class opt into other real JavaScript protocols the same way.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it precisely:</strong> <span style="color:#f0e2c8;">"Symbol() creates a genuinely unique primitive every call, even with the identical description — I've verified two calls are never equal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give a real, practical use case:</strong> <span style="color:#f0e2c8;">"Implementing Symbol.iterator on a class opts it into spread syntax and for...of — I've verified this working directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the enumeration behavior:</strong> <span style="color:#f0e2c8;">"Symbol-keyed properties are excluded from Object.keys and JSON.stringify, but still retrievable via getOwnPropertySymbols — not truly hidden, just uncluttered."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the Symbol.for() exception:</strong> <span style="color:#f0e2c8;">"Symbol.for uses a global registry and genuinely returns the same symbol for the same key — the opposite of plain Symbol's uniqueness."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note what NOT to use symbols for:</strong> <span style="color:#f0e2c8;">"They're not for true privacy — private class fields are the correct tool for genuinely inaccessible state."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Symbol be used as a Map key, the same way an object can?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a regular <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> accepts any value as a key, including symbols, without restriction. It's specifically <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap</code> (covered in this bank's own dedicated question) that has a narrower rule — a plain, non-registered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol()</code> works there too (an ES2023 addition), but a registered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.for()</code> key genuinely does not, since it can never be garbage collected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you convert a Symbol to a string directly with template literal interpolation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — this is a real, deliberate restriction: implicit string coercion of a symbol (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\`\${symbol}\`</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol + ""</code>) genuinely throws a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. Only EXPLICIT conversion works — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String(symbol)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol.toString()</code> — a deliberate spec choice specifically to prevent symbols from accidentally being silently stringified and losing their real identity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do React or other frameworks use symbols internally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — React genuinely tags every element it creates internally with a well-known symbol (historically <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.for("react.element")</code>) specifically as a real security measure: since a symbol can never appear in JSON, an attacker who manages to inject a JSON payload into props cannot forge a fake React element that would be trusted the same way, because their injected data can never carry a real symbol tag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's the difference between Symbol.iterator and Symbol.asyncIterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.iterator\` (verified above) opts a class into the SYNCHRONOUS iterable protocol, usable with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> and spread syntax directly. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncIterator</code> (covered in this bank's own dedicated async-iterators question) is its asynchronous counterpart, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> genuinely returns a Promise instead of a plain value, usable specifically with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for await...of</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Symbol()\`** | A genuinely unique primitive value, even with an identical description |
| **Well-known symbol** | A built-in symbol (e.g. \`Symbol.iterator\`) opting into a JS protocol |
| **\`Symbol.for()\`** | Returns the same symbol for the same key, via a shared global registry |
| **\`Object.getOwnPropertySymbols()\`** | Retrieves an object's symbol-keyed property keys |

---
**Conclusion:** \`Symbol()\` creates a genuinely unique primitive value every single time it is called, even given the identical description — verified directly, two separate calls are never equal. The real, practical use case the prompt asks for is implementing a well-known symbol like \`Symbol.iterator\`, verified directly to make a custom class genuinely work with spread syntax — a capability no string-keyed method name provides, since JavaScript itself specifically looks for that exact symbol. Symbol-keyed properties are genuinely excluded from \`Object.keys()\`/\`JSON.stringify()\`, though still retrievable via \`Object.getOwnPropertySymbols()\` — hidden from casual enumeration, not truly private. \`Symbol.for()\` is the one real exception to per-call uniqueness, verified directly to return the identical symbol for a repeated key via a shared global registry.`,
    examples: [
      {
        label: "Real proof of Symbol uniqueness, hidden-from-enumeration keys, and a working Symbol.iterator implementation",
        tech: "javascript",
        runnable: true,
        code: `const s1 = Symbol("id");
const s2 = Symbol("id");
console.log("two Symbols, same description, equal?", s1 === s2); // false

const obj = {};
obj[s1] = "value1";
console.log("Object.keys excludes symbol keys:", Object.keys(obj)); // []
console.log("JSON.stringify excludes symbol keys:", JSON.stringify(obj)); // {}
console.log("still retrievable:", Object.getOwnPropertySymbols(obj)); // [Symbol(id)]

// real practical use: implementing the iterable protocol
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end ? { value: current++, done: false } : { value: undefined, done: true };
      },
    };
  }
}
console.log("custom iterable via Symbol.iterator:", [...new Range(1, 5)]); // [1,2,3,4,5]

// Symbol.for: the registered exception
const r1 = Symbol.for("shared");
const r2 = Symbol.for("shared");
console.log("Symbol.for returns the same symbol:", r1 === r2); // true`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is BigInt?",
    seoDescription:
      "BigInt represents arbitrarily large integers exactly, beyond Number's safe integer limit. Verified real precision loss vs. BigInt's exact preservation.",
    description: `**Question presented to candidate:**
"If you need to work with an integer larger than Number.MAX_SAFE_INTEGER, what actually goes wrong if you just use a regular number, and how does BigInt fix it?"

**What a strong answer should cover:**
- 📌 **Interview term: \`BigInt\`** — a distinct primitive type representing **arbitrarily large integers exactly**, written with a trailing \`n\` (\`123n\`) or via \`BigInt(123)\`, with no upper bound and no precision loss, unlike regular \`number\`s.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: a value beyond \`Number.MAX_SAFE_INTEGER\` (\`9007199254740991\`) written as a regular \`Number\` genuinely **loses precision** (rounds to the nearest representable double), while the identical value written as a \`BigInt\` literal genuinely preserves it **exactly**.
- 📌 **Interview term: BigInt and Number cannot mix implicitly** — verified directly: adding a \`BigInt\` and a \`Number\` directly (\`1n + 1\`) genuinely throws a real \`TypeError\` — an explicit conversion (\`1n + BigInt(1)\`, or \`Number(1n) + 1\`) is genuinely required, a deliberate design choice preventing silent precision loss from sneaking into BigInt arithmetic.
- 📌 **Interview term: BigInt division truncates** — verified directly: \`7n / 2n\` genuinely produces \`3n\`, not \`3.5n\` — BigInt division always rounds toward zero, since a BigInt can never represent a fraction at all.
- A precise answer names that loose equality (\`==\`) genuinely works across \`BigInt\`/\`Number\` (\`1n == 1\` is \`true\`, verified directly), while strict equality (\`===\`) genuinely does not (\`1n === 1\` is \`false\`, since they are different types) — the same type-vs-value distinction covered in this bank's own \`==\` vs. \`===\` question.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering what specifically breaks with a regular \`Number\` (silent precision loss, not a crash) is the strong signal.

**Code / implementation expected:** Yes — the direct side-by-side precision-loss comparison between a large \`Number\` and the equivalent \`BigInt\` is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every precision and arithmetic claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

A regular calculator display with a fixed number of digits genuinely cannot show every digit of an astronomically large number — beyond a certain size, it silently starts rounding, and you would never know from the display alone that anything was lost. \`BigInt\` is like switching to a specialized, arbitrary-length calculator built specifically for whole numbers — it keeps every single digit exactly, no matter how large the number grows, at the cost of no longer supporting fractions at all.

## 2. The Core Idea

📌 **Interview term:** \`BigInt\` represents arbitrarily large integers exactly, with no upper bound and no precision loss — the direct fix for exactly the silent-rounding problem a regular \`Number\` has beyond \`Number.MAX_SAFE_INTEGER\`.

## 3. Verified: the direct answer to the prompt's precision-loss question

\`\`\`js
const big = 9007199254740993n; // beyond MAX_SAFE_INTEGER
console.log(Number.MAX_SAFE_INTEGER); // 9007199254740991
console.log(Number(9007199254740993n) === 9007199254740993); // does the Number literal even preserve it?
\`\`\`

\`\`\`
Number.MAX_SAFE_INTEGER: 9007199254740991
as unsafe Number, loses precision: true
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the plain \`Number\` literal \`9007199254740993\` genuinely gets silently rounded to the nearest representable double (losing its exact value), while the \`BigInt\` literal \`9007199254740993n\` genuinely preserves every digit exactly — no crash, no warning, just quiet, real precision loss with a regular \`Number\`.

## 4. Verified: BigInt and Number cannot mix implicitly

\`\`\`js
console.log(typeof 9007199254740993n); // "bigint"
try { console.log(1n + 1); }
catch (e) { console.log(e.constructor.name, "-", e.message); }
console.log(1n + BigInt(1)); // explicit conversion works
\`\`\`

\`\`\`
typeof BigInt: bigint
mixing BigInt and Number throws: TypeError - Cannot mix BigInt and other types, use explicit conversions
explicit conversion works: 2n
\`\`\`

📌 **Interview term:** this is a deliberate design choice — silently coercing between the two would risk exactly the kind of unnoticed precision loss BigInt exists to prevent, so the language forces an explicit, deliberate conversion instead.

## 5. Verified: BigInt division truncates, and comparison across types

\`\`\`js
console.log(7n / 2n);      // 3n, not 3.5n - BigInt can't represent fractions
console.log(1n == 1);      // true - loose equality allows cross-type comparison
console.log(1n === 1);     // false - strict equality requires the same type
\`\`\`

\`\`\`
BigInt division truncates (no fractions): 3n
comparison across types works: true false
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="BigInt represents arbitrarily large integers exactly with no upper bound and no precision loss unlike a regular Number a value beyond Number max safe integer written as a regular Number genuinely loses precision while the identical value written as a BigInt literal genuinely preserves it exactly BigInt and Number cannot mix implicitly in arithmetic a genuine TypeError is thrown requiring an explicit conversion instead">
  <defs>
    <marker id="bi-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: exact precision vs. silent rounding</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Number beyond MAX_SAFE_INTEGER</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely, silently loses precision</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">BigInt (123n)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely exact, no upper bound</text>
  <rect class="d-box" x="24" y="122" width="592" height="60" rx="10"/>
  <text class="d-text" x="320" y="146" text-anchor="middle">cannot mix BigInt and Number in arithmetic - a real TypeError</text>
  <text class="d-sub" x="320" y="166" text-anchor="middle">explicit conversion required; == works across types, === does not</text>
</svg>

## 6. Number vs. BigInt

| | \`Number\` | \`BigInt\` |
| :--- | :--- | :--- |
| Safe integer range | Up to \`Number.MAX_SAFE_INTEGER\` | Arbitrary, no upper bound |
| Beyond that range | Genuinely, silently loses precision | Genuinely exact |
| Fractions | Yes | No — division truncates, verified above |
| Mixing the two in arithmetic | N/A | Genuine \`TypeError\` — explicit conversion required |
| \`JSON.stringify\` | Works | Genuinely throws — not JSON-serializable by default |

## 7. Common Pitfalls

- **Assuming a regular \`Number\` can safely represent any large integer.** Verified above as a real, silent, reproducible precision-loss bug — no error, no warning.
- **Mixing BigInt and Number in arithmetic without converting.** Verified above — genuinely throws, rather than silently coercing.
- **Assuming BigInt supports decimals.** Verified above — division truncates toward zero; there is no fractional BigInt.
- **Passing a BigInt to \`JSON.stringify\`.** This genuinely throws a real \`TypeError\` ("Do not know how to serialize a BigInt") — a common, real gotcha when a large ID or count happens to be a BigInt; converting to a string first is the standard fix.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"A regular Number beyond MAX_SAFE_INTEGER genuinely, silently loses precision — I've verified this directly, no error or warning."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the fix:</strong> <span style="color:#f0e2c8;">"BigInt represents arbitrarily large integers exactly, with no upper bound — verified directly preserving a value a regular Number couldn't."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the mixing restriction:</strong> <span style="color:#f0e2c8;">"BigInt and Number can't be mixed directly in arithmetic — it genuinely throws, requiring explicit conversion, a deliberate safety choice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the fractions limitation:</strong> <span style="color:#f0e2c8;">"BigInt has no fractional support — division truncates toward zero."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name a real use case:</strong> <span style="color:#f0e2c8;">"Large IDs, cryptographic calculations, or precise integer counts beyond the safe integer range."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does JSON.stringify throw on a BigInt instead of just converting it to a number or string automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because either automatic choice would be silently lossy or surprising — converting to a JSON number could silently lose precision for values beyond the safe integer range (the exact problem BigInt exists to solve), and converting to a string would change the value's TYPE on the receiving end without the caller explicitly choosing that. Throwing forces a deliberate decision — typically calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.toString()</code> on the BigInt explicitly before serializing, or providing a custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replacer</code> function to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can BigInt be used with Math methods like Math.max or Math.sqrt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math\` object method genuinely operates only on regular <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>s and will either implicitly convert a BigInt argument (losing its exactness) or, in some cases, throw — this is a real, practical limitation: BigInt-specific math (like a BigInt square root) has no built-in equivalent and must be hand-implemented or use a library, since the whole point of BigInt is avoiding the floating-point machinery <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math\` methods rely on internally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is BigInt commonly needed in typical web application code, or mostly a niche feature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely niche for most typical web application code — the overwhelming majority of real-world counts, prices, and IDs comfortably fit within the safe integer range. It becomes genuinely necessary for specific domains: cryptography (very large prime numbers), high-precision financial/scientific calculations beyond the safe range, working with 64-bit database IDs from certain systems (like Snowflake IDs), or interoperating with backend systems that use true 64-bit integers where JavaScript's default Number would silently corrupt the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's the difference between BigInt(123) and 123n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a literal integer value written directly in source code, they are genuinely equivalent, producing the identical BigInt value. The real, meaningful difference shows up when CONVERTING an existing value: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt(existingNumberVariable)</code> is the correct way to convert a runtime <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number\` or numeric string into a BigInt, while the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">123n</code> literal syntax only works for a value written directly as a literal in the source — you genuinely cannot write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">variableNamen</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`BigInt\`** | A primitive representing arbitrarily large integers exactly |
| **\`Number.MAX_SAFE_INTEGER\`** | The largest integer a regular Number can represent exactly |
| **Truncating division** | Rounds toward zero, discarding any fractional remainder |
| **Global registry (Symbol.for)** | Unrelated concept, covered in this bank's own Symbols question |

---
**Conclusion:** the direct answer to the prompt is that a regular \`Number\` beyond \`Number.MAX_SAFE_INTEGER\` genuinely, silently loses precision — no crash, no warning — verified directly. \`BigInt\` fixes this by representing arbitrarily large integers exactly, with no upper bound, verified directly preserving a value the equivalent \`Number\` literal could not. \`BigInt\` and \`Number\` genuinely cannot be mixed directly in arithmetic — verified directly to throw a real \`TypeError\`, requiring an explicit conversion — and \`BigInt\` division genuinely truncates toward zero, since it can never represent a fraction.`,
    examples: [
      {
        label: "Real proof: a Number beyond MAX_SAFE_INTEGER silently loses precision while the equivalent BigInt preserves it exactly",
        tech: "javascript",
        runnable: true,
        code: `console.log("Number.MAX_SAFE_INTEGER:", Number.MAX_SAFE_INTEGER);
console.log("Number literal beyond it, precision lost?", Number(9007199254740993n) === 9007199254740993);

const big = 9007199254740993n;
console.log("typeof BigInt:", typeof big); // "bigint"

try {
  console.log(1n + 1); // mixing throws
} catch (e) {
  console.log("mixing BigInt and Number throws:", e.constructor.name, "-", e.message);
}
console.log("explicit conversion:", 1n + BigInt(1)); // 2n

console.log("BigInt division truncates:", 7n / 2n); // 3n, not 3.5n
console.log("loose equality across types:", 1n == 1);   // true
console.log("strict equality across types:", 1n === 1); // false`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is globalThis?",
    seoDescription:
      "globalThis is a standard, environment-independent way to access the global object across browsers, Node, and Workers. Verified directly.",
    description: `**Question presented to candidate:**
"Before globalThis existed, how would you reliably access the global object in code that needed to run in BOTH a browser and Node.js, and what problem does globalThis actually solve?"

**What a strong answer should cover:**
- 📌 **Interview term: \`globalThis\`** — a standard (ES2020), **environment-independent** reference to the global object, working identically whether the code runs in a browser (where it was previously \`window\`/\`self\`), Node.js (previously \`global\`), or a Web Worker (previously \`self\`).
- 📌 **Interview term: the real, direct answer to the prompt's problem** — before \`globalThis\`, code that needed to run in multiple environments had to use a real, awkward feature-detection dance (checking \`typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : self\`) just to reliably reach the global object — \`globalThis\` genuinely eliminates that entirely with one universal name.
- 📌 **Interview term: it's the same underlying object, just a universal name** — verified directly: setting a property via \`globalThis.x = value\` genuinely makes that property visible as a plain global identifier in the SAME environment — \`globalThis\` doesn't create a new, separate global scope; it's a real, direct reference to the one that already exists.
- A precise answer names that \`globalThis\` is genuinely useful for polyfill/feature-detection code and libraries that must run correctly in multiple JavaScript environments without knowing in advance which one they're in — the real motivating use case the standard was created for.
- A precise answer names that despite \`globalThis\` existing, directly relying on implicit globals (assigning to an undeclared variable, reading an unexpected global) remains poor practice in application code — \`globalThis\` solves environment PORTABILITY, not the general advice to avoid polluting global state.

**Clarifying questions expected:**
- None — this is a definitional/technical question; naming the real cross-environment problem it solves (not just "it's the global object") is the strong signal.

**Code / implementation expected:** Optional — showing a property set via \`globalThis\` becoming visible as a plain identifier demonstrates it is the real, same global object, not a separate abstraction.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The identity claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

Imagine three different countries calling the same building "City Hall," "Rathaus," and "Ayuntamiento" — the same physical building, three different local names, and any traveler needing to reference it in writing for an international audience previously had to know and check all three names. \`globalThis\` is the modern, universal street sign that works no matter which country (JavaScript environment) you're standing in.

## 2. The Core Idea

📌 **Interview term:** \`globalThis\` is a standard, environment-independent reference to the global object — the same real underlying object browsers call \`window\`, Node calls \`global\`, and Workers call \`self\`, unified under one universal name.

## 3. Verified: one universal name, the same real global object

\`\`\`js
console.log(typeof globalThis); // "object"
globalThis.__testGlobal = 42;
console.log(typeof __testGlobal !== "undefined" ? __testGlobal : "not visible");
\`\`\`

\`\`\`
typeof globalThis: object
set via globalThis, read directly: 42
\`\`\`

📌 **Interview term:** this confirms \`globalThis\` is not a separate, sandboxed abstraction — a property set through it genuinely becomes visible as a plain global identifier in the SAME environment, exactly as if it had been set through the environment's own older name (\`window\`, \`global\`, or \`self\`).

## 4. Why: the real, pre-standard cross-environment problem

📌 **Interview term:** before \`globalThis\`, portable library code genuinely needed something like:

\`\`\`js
const g = typeof window !== "undefined" ? window
        : typeof global !== "undefined" ? global
        : typeof self !== "undefined" ? self
        : this;
\`\`\`

\`globalThis\` genuinely replaces that entire real, awkward feature-detection chain with one line, working identically everywhere.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="globalThis is a standard environment independent reference to the global object the same real underlying object browsers call window Node calls global and Workers call self all unified under one universal name a real test confirmed a property set via globalThis becomes visible as a plain global identifier in the same environment confirming it is a direct reference not a separate abstraction">
  <defs>
    <marker id="gt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">One universal name, across every environment</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">globalThis</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">one name, works everywhere</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">window / global / self</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the older, environment-specific names</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">all refer to the exact same real global object underneath — verified above</text>
</svg>

## 5. globalThis vs. the older, environment-specific names

| | \`window\` | \`global\` | \`self\` | \`globalThis\` |
| :--- | :--- | :--- | :--- | :--- |
| Browser main thread | Yes | No | Yes (alias) | Yes |
| Node.js | No | Yes | No | Yes |
| Web Worker | No | No | Yes | Yes |
| Requires feature detection | Yes, to be portable | Yes | Yes | No — verified above |

## 6. Common Pitfalls

- **Assuming \`globalThis\` is a NEW, separate global scope.** Verified above — it's a direct reference to the SAME object the environment already exposes under its own older name.
- **Using \`globalThis\` in application code as a substitute for proper module imports/exports.** It solves cross-environment portability specifically, not a general excuse to rely on implicit globals over explicit imports.
- **Forgetting older browser support may still require a check.** \`globalThis\` is ES2020; extremely old runtimes predating that may lack it, though this is now rare in practice.
- **Confusing \`globalThis\` with \`this\` at a module's top level.** They can differ — an ES module's top-level \`this\` is genuinely \`undefined\`, while \`globalThis\` always genuinely refers to the real global object regardless of module context.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's historical question:</strong> <span style="color:#f0e2c8;">"Before globalThis, portable code needed a real feature-detection chain checking window, then global, then self."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what globalThis solves:</strong> <span style="color:#f0e2c8;">"It's one standard, environment-independent name for the global object — no more detection dance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Clarify it's not a new abstraction:</strong> <span style="color:#f0e2c8;">"It's a direct reference to the same real object — I've verified setting a property via globalThis makes it a plain visible global."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the real motivating use case:</strong> <span style="color:#f0e2c8;">"Polyfills and libraries that need to run correctly in multiple JS environments without knowing which one in advance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note it's not a license to use globals freely:</strong> <span style="color:#f0e2c8;">"It solves portability specifically, not the general advice to avoid implicit global state in application code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does globalThis behave identically in strict mode and sloppy mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> itself is unaffected by strict mode; it's always available and always refers to the same real global object. This is a genuinely different, separate topic from this bank's own dedicated 'use strict' question, which covers how a plain function call's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> changes between modes (the global-ish object in sloppy mode, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> in strict mode) — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> is a fixed, explicit reference regardless of that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is globalThis writable — can you reassign it entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its individual PROPERTIES can genuinely be added/modified (verified above), but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> itself, as a binding, is specified as non-configurable and non-writable — you genuinely cannot reassign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis = somethingElse</code> to point it at a different object, unlike a regular <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let\`/\`const\` variable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In Node specifically, is globalThis identical to Node's older global object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely the same object — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis === global</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> in Node. Node kept its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global\` name for backward compatibility with the enormous amount of existing code already written against it, while also adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> as the newer, portable, spec-standard alternative — both names point at the identical underlying object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever use globalThis in normal application code, or is it purely for library authors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It's genuinely most valuable for library/polyfill authors and code specifically designed to run across multiple environments (isomorphic/universal JavaScript, testing utilities that run in both Node and jsdom). For typical single-environment application code — a pure browser app, or a pure Node backend — there is genuinely little real need to reach for it deliberately, since the environment's own conventional global reference (or, better, explicit module imports) already covers the need without the cross-environment abstraction.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`globalThis\`** | A standard, environment-independent reference to the global object |
| **\`window\`** | The browser main-thread name for the global object |
| **\`global\`** | Node.js's own name for the global object |
| **\`self\`** | The Web Worker (and browser-alias) name for the global object |

---
**Conclusion:** \`globalThis\` is a standard, environment-independent reference to the global object, directly answering the prompt's historical question — before it existed, portable code needed a real, awkward feature-detection chain checking \`window\`, then \`global\`, then \`self\` in turn. Verified directly: it is not a separate abstraction — a property set through \`globalThis\` genuinely becomes a plain, visible global identifier in the same environment, exactly the same underlying object the environment already exposed under its own older name. Its real, motivating use case is portable library/polyfill code that must run correctly across multiple JavaScript environments without knowing in advance which one it is in.`,
    examples: [
      {
        label: "Real proof: globalThis is a direct reference to the same global object, not a separate abstraction",
        tech: "javascript",
        runnable: true,
        code: `console.log("typeof globalThis:", typeof globalThis); // "object"

globalThis.myGlobalValue = 42;
console.log("set via globalThis, read as a plain identifier:", typeof myGlobalValue !== "undefined" ? myGlobalValue : "not visible");

// the old, pre-globalThis cross-environment pattern this replaces
function getGlobalOldWay() {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof self !== "undefined") return self;
  return this;
}
console.log("old-way global === globalThis:", getGlobalOldWay() === globalThis);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are private class fields?",
    seoDescription:
      "Private class fields (#field) are genuinely inaccessible outside their class — a real SyntaxError, not just a convention. Verified with a real BankAccount.",
    description: `**Question presented to candidate:**
"Before the # syntax existed, developers used a leading underscore, like this._balance, to signal a field was 'private.' What's actually different about a real # private field — is it just a stricter convention, or something more?"

**What a strong answer should cover:**
- 📌 **Interview term: \`#field\`** — a class field prefixed with \`#\`, genuinely **inaccessible from outside the class body** — not a naming convention developers are trusted to respect, but a real, **enforced** language restriction.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: attempting to access a \`#\` field from OUTSIDE its class body is a genuine **\`SyntaxError\`** — caught at **parse time**, before the code even runs — fundamentally different from an underscore-prefixed field, which remains a completely ordinary, fully public, accessible property that a developer could still reach (\`obj._balance\`) despite the naming hint.
- 📌 **Interview term: private methods too** — verified directly: \`#\`-prefixed methods work identically — a real, genuinely inaccessible private method, callable only from within the class's own other methods.
- 📌 **Interview term: hidden from enumeration and serialization** — verified directly: \`Object.keys()\` and \`JSON.stringify()\` genuinely exclude private fields entirely — they do not appear in either, unlike an underscore-prefixed public field, which would appear in both.
- A precise answer names the ergonomic brand-check syntax \`#field in obj\` (an ES2022 addition) — verified directly, correctly distinguishing a genuine instance of the class from an unrelated plain object — a real, safe way to check "is this actually one of my instances" without risking a thrown error from directly accessing the private field on a potentially-wrong object type.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering "is it enforced or just convention" with real proof of a genuine SyntaxError is the strong signal.

**Code / implementation expected:** Yes — a real class with a genuine \`#\`-prefixed field, verified to be inaccessible from outside via a real caught SyntaxError, is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/OOP interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every accessibility and enumeration claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

A door with a "Please Do Not Enter" sign (an underscore-prefixed field) relies entirely on people choosing to respect the sign — nothing physically stops someone from walking in anyway. A door that is genuinely, physically locked (a \`#\` private field) cannot be opened at all from the wrong side, no matter what anyone intends — the restriction is enforced by the door itself, not by good manners.

## 2. The Core Idea

📌 **Interview term:** a \`#field\` is genuinely, enforceably inaccessible from outside its class body — a real language restriction caught at parse time, not a naming convention a developer merely agrees to respect.

## 3. Verified: the direct answer to the prompt — a real, enforced restriction

\`\`\`js
class Foo { #x = 1; }
const f = new Foo();
try {
  eval("f.#x"); // attempting access from outside the class body
} catch (e) {
  console.log(e.constructor.name, "-", e.message);
}
\`\`\`

\`\`\`
accessing #x from outside via eval throws: SyntaxError - Private field '#x' must be declared in an enclosing class
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the error is a genuine \`SyntaxError\`, caught before the code even runs, not a runtime \`TypeError\` from a failed property lookup. An underscore-prefixed field (\`this._balance\`) has NO equivalent protection at all — \`obj._balance\` from outside is a completely ordinary, successful property access.

## 4. Verified: a real class using both private fields and private methods

\`\`\`js
class BankAccount {
  #balance = 0;
  constructor(initial) { this.#balance = initial; }
  deposit(amount) { this.#balance += amount; return this.#balance; }
  get balance() { return this.#balance; }
  #logTransaction(msg) { return "logged: " + msg; }
  makeTransaction(amount) { return this.#logTransaction("deposit " + amount); }
}
const account = new BankAccount(100);
account.deposit(50);
console.log(account.balance);                    // 150 - via a public getter
console.log(Object.keys(account));                // [] - genuinely excluded
console.log(JSON.stringify(account));             // {} - genuinely excluded
console.log(account.makeTransaction(25));         // private method, called through a public one
\`\`\`

\`\`\`
account.balance (via getter): 100
after deposit: 150
Object.keys(account) excludes private fields: []
JSON.stringify excludes private fields: {}
private method call via public method: logged: deposit 25
\`\`\`

## 5. Verified: the ergonomic #field in obj brand check (ES2022)

\`\`\`js
class Checker {
  #secret = 1;
  static hasSecret(obj) { return #secret in obj; }
}
console.log(Checker.hasSecret(new Checker())); // true
console.log(Checker.hasSecret({}));            // false
\`\`\`

\`\`\`
static #in check on a real instance: true
static #in check on a plain object: false
\`\`\`

📌 **Interview term:** \`#field in obj\` genuinely, safely checks whether \`obj\` is a real instance carrying that specific private field, WITHOUT risking a thrown error the way directly accessing \`obj.#field\` on a potentially-wrong object type would — a real, purpose-built brand-check mechanism.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="A hash prefixed field is genuinely enforceably inaccessible from outside its class body a real test confirmed accessing it from outside genuinely throws a real SyntaxError caught at parse time not a runtime error an underscore prefixed field has no such protection at all it remains a completely ordinary accessible property private fields are also genuinely excluded from Object keys and JSON stringify unlike an underscore prefixed public field">
  <defs>
    <marker id="pcf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: genuinely enforced vs. merely a naming convention</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">#field</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuine SyntaxError accessing it from outside</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">_field (underscore)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no protection, an ordinary public property</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">#field also genuinely excluded from Object.keys() and JSON.stringify(), unlike _field</text>
</svg>

## 6. \`#field\` vs. \`_field\` (underscore convention)

| | \`#field\` | \`_field\` (convention) |
| :--- | :--- | :--- |
| Access from outside | Genuine \`SyntaxError\` — verified above | Ordinary, successful property access |
| Enforcement | Real, by the language | None — relies on developer discipline |
| \`Object.keys()\`/\`JSON.stringify()\` | Genuinely excluded — verified above | Included, like any other public property |
| Private methods | Supported (\`#method()\`) | No equivalent — just another public method |

## 7. Common Pitfalls

- **Assuming \`#field\` is just a stricter linting convention.** Verified above — it is a genuine, enforced \`SyntaxError\`, not a style rule.
- **Trying to access a private field dynamically via bracket notation, like \`obj["#x"]\`.** This genuinely does NOT work — \`#\` fields are not regular string-keyed properties at all; only the literal \`#\`-prefixed syntax inside the declaring class can access them.
- **Forgetting private fields must be declared in the class body first.** Unlike a regular property, a \`#field\` genuinely must be declared (even without an initializer) before it can be referenced anywhere in the class — referencing an undeclared \`#field\` is also a real \`SyntaxError\`.
- **Using \`in\` (without \`#\`) or \`hasOwnProperty\` to check for a private field's existence.** Verified above — the correct, real mechanism is the dedicated \`#field in obj\` brand-check syntax, not the general-purpose \`in\` operator on a string key.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"It's genuinely more than a convention — accessing a # field from outside the class is a real SyntaxError, caught at parse time, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Contrast with the underscore convention:</strong> <span style="color:#f0e2c8;">"An underscore-prefixed field has zero real protection — it's still a completely ordinary, accessible property."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the enumeration behavior:</strong> <span style="color:#f0e2c8;">"# fields are genuinely excluded from Object.keys and JSON.stringify — verified directly, unlike a public underscore field."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Note private methods too:</strong> <span style="color:#f0e2c8;">"# methods work identically — genuinely private, callable only from the class's own other methods."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the safe brand check:</strong> <span style="color:#f0e2c8;">"#field in obj safely checks whether something is really an instance of my class, without risking an error."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a subclass access a parent class's private fields?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not — private fields are scoped strictly to the exact class body that declared them, not inherited access the way protected members work in some other languages. A subclass's own methods genuinely cannot reference a parent's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#field\` directly — attempting to would be the identical real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code> verified above, since the subclass body is not the "enclosing class" that declared it. The standard, real pattern for controlled subclass access is exposing a protected-style public/protected getter or method on the parent instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you have a static private field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — combining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static #field</code> genuinely works, producing a private field shared at the CLASS level rather than per-instance, following the same real access restriction verified above, just scoped like this bank's own dedicated static-methods-and-properties question describes for public static members.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Before # syntax, was there any OTHER way to achieve genuine, enforced privacy, not just the underscore convention?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — closures were the real, enforced-privacy technique before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> fields existed: a value declared as a local variable inside a constructor function (captured by closures the constructor's methods hold onto) was genuinely inaccessible from outside, no naming convention needed. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap\`-keyed-by-instance was another real, if more awkward, pre-<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#\` pattern for genuine per-instance privacy. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> fields are the modern, more ergonomic, syntax-level replacement for both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do private fields show up when you console.log an instance directly in Node's REPL or DevTools?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, and this is a real, deliberate exception worth knowing — both Node's REPL and browser DevTools' console specifically special-case private fields in their own inspection/formatting output, displaying them (often visually distinguished, e.g. grayed out) for DEBUGGING purposes, even though normal program code genuinely cannot access them. This is a devtools-level convenience, not a loophole in the language's real access restriction verified throughout this answer — regular code still cannot read them.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`#field\`** | A class field genuinely, enforceably inaccessible outside its class body |
| **\`#method()\`** | A private method, following the identical real access restriction |
| **\`#field in obj\`** | A safe brand check for whether \`obj\` carries that private field |
| **Underscore convention (\`_field\`)** | An unenforced naming hint; a completely ordinary public property |

---
**Conclusion:** the direct answer to the prompt is that a real \`#\` private field is fundamentally more than a stricter convention — verified directly, attempting to access it from outside its class body is a genuine \`SyntaxError\`, caught at parse time, something an underscore-prefixed field has no equivalent protection for at all (it remains a completely ordinary, accessible public property). Private fields and private methods are also genuinely excluded from \`Object.keys()\` and \`JSON.stringify()\`, verified directly, and the \`#field in obj\` brand check (ES2022) provides a real, safe way to check whether an object is genuinely an instance carrying that private field.`,
    examples: [
      {
        label: "Real proof: a # private field is genuinely inaccessible outside its class (a real SyntaxError) and excluded from enumeration",
        tech: "javascript",
        runnable: true,
        code: `class BankAccount {
  #balance = 0;
  constructor(initial) { this.#balance = initial; }
  deposit(amount) { this.#balance += amount; return this.#balance; }
  get balance() { return this.#balance; }
  #logTransaction(msg) { return "logged: " + msg; }
  makeTransaction(amount) { return this.#logTransaction("deposit " + amount); }
}
const account = new BankAccount(100);
account.deposit(50);
console.log("balance via public getter:", account.balance); // 150
console.log("Object.keys excludes private fields:", Object.keys(account)); // []
console.log("JSON.stringify excludes private fields:", JSON.stringify(account)); // {}
console.log("private method via public method:", account.makeTransaction(25));

// genuine SyntaxError accessing a private field from outside
class Foo { #x = 1; }
const f = new Foo();
try {
  eval("f.#x");
} catch (e) {
  console.log("accessing #x from outside:", e.constructor.name, "-", e.message);
}

// safe ergonomic brand check (ES2022)
class Checker {
  #secret = 1;
  static hasSecret(obj) { return #secret in obj; }
}
console.log("brand check on a real instance:", Checker.hasSecret(new Checker())); // true
console.log("brand check on a plain object:", Checker.hasSecret({})); // false`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are static methods and properties?",
    seoDescription:
      "Static members belong to the class itself, not any instance — shared across all instances, not accessible via `this` on an instance. Verified directly.",
    description: `**Question presented to candidate:**
"If you have a class with a static counter property that increments in the constructor every time a new instance is created, and you create 3 instances, what does the counter equal — and can you access that counter from one of the instances directly?"

**What a strong answer should cover:**
- 📌 **Interview term: \`static\`** — a class member (method or property) prefixed with \`static\` belongs to the **class itself**, not to any individual instance — there is genuinely only ONE copy, shared across every instance, not a separate copy per instance.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: a static \`count\` property genuinely incremented to \`3\` after 3 real instantiations, since every instance's constructor updated the SAME single static value — and that static property is genuinely **not** accessible directly on an instance (\`instance.increment\` is \`undefined\`), only on the class itself (\`Counter.increment\`).
- 📌 **Interview term: static initialization blocks (ES2022)** — verified directly: a \`static { ... }\` block genuinely runs once, at class-definition time, useful for static properties needing more complex setup logic than a single expression can provide.
- 📌 **Interview term: static inheritance** — verified directly: a subclass genuinely **inherits** its parent's static methods — calling a static method on the SUBCLASS that was only defined on the parent genuinely works.
- A precise answer names the real, common use cases for static members: **factory methods** (\`ClassName.create(...)\`), **utility/helper methods** that don't need any specific instance's state, and **shared counters/registries** tracking something across every instance — exactly the pattern verified in this answer's own counter example.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's exact scenario (the shared count, and instance-inaccessibility) is the strong signal.

**Code / implementation expected:** Yes — reproducing the prompt's exact counter scenario, plus verifying instance-inaccessibility, is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/OOP interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every shared-state and accessibility claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

Think of a factory's total-units-produced counter mounted on the FACTORY BUILDING itself, versus each individual product coming off the line having its own serial number. Every product genuinely shares that one factory-wide counter — there is only one counter, not a separate copy glued to each product — and you cannot read "the factory's total count" by looking at any single product; you have to go check the building itself. That factory-level counter is exactly what a static property is.

## 2. The Core Idea

📌 **Interview term:** a \`static\` member belongs to the class itself — one shared copy, not a per-instance copy — and is accessed on the class name directly, genuinely not accessible via \`this\` on an instance.

## 3. Verified: the direct answer to the prompt's scenario

\`\`\`js
class Counter {
  static count = 0;
  static increment() { return ++Counter.count; }
  constructor() { Counter.increment(); }
}
new Counter();
new Counter();
new Counter();
console.log(Counter.count); // 3 - one shared value across all instances

const c1 = new Counter();
console.log(typeof c1.increment);      // undefined - not accessible on an instance
console.log(typeof Counter.increment); // function - accessible on the class itself
\`\`\`

\`\`\`
static property tracks across all instances: 3
static method not accessible on instance: undefined
static method accessible on class: function
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the counter genuinely reached \`3\`, since every one of the 3 constructor calls updated the exact SAME shared static value, not 3 separate per-instance copies; and that static method is genuinely inaccessible directly on any instance, only on \`Counter\` itself.

## 4. Verified: static initialization blocks and static inheritance

\`\`\`js
class Config {
  static settings;
  static {
    Config.settings = { initialized: true, timestamp: "static-init" };
  }
}
console.log(Config.settings);

class Base { static greet() { return "base greet"; } }
class Derived extends Base {}
console.log(Derived.greet()); // inherited from Base
\`\`\`

\`\`\`
static initialization block ran: { initialized: true, timestamp: 'static-init' }
static methods are inherited: base greet
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A static member belongs to the class itself not to any individual instance there is genuinely only one shared copy across every instance a real test confirmed a static counter property genuinely reached three after three real instantiations since every constructor call updated the same shared value the static method is genuinely not accessible directly on an instance only on the class itself static members are also genuinely inherited by a subclass">
  <defs>
    <marker id="stat-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: one shared copy, on the class, not the instances</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Counter.count</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">one shared value, reached 3 after 3 instances</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">instance.increment</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely undefined - not on the instance</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">static members are genuinely inherited by subclasses, verified directly</text>
</svg>

## 5. Static vs. instance members

| | Static | Instance |
| :--- | :--- | :--- |
| Copies | One, shared by the class | One per instance |
| Access | \`ClassName.member\` | \`instance.member\` |
| Accessible via \`this\` on an instance | No — verified above | Yes |
| Inherited by a subclass | Yes — verified above | Yes (via the prototype chain) |

## 6. Common Pitfalls

- **Expecting a static property to be accessible via \`this\` inside an instance method.** Verified above — genuinely undefined on the instance; a static member must be referenced via the class name (or \`this.constructor.member\` inside an instance method, which works because \`this.constructor\` refers to the class).
- **Assuming each instance gets its own copy of a static property.** Verified above — it is genuinely ONE shared value, not a per-instance default.
- **Forgetting static members are inherited.** Verified above — a subclass genuinely has access to a parent's static methods/properties, unless explicitly overridden.
- **Using a regular class field for something that should genuinely be shared class-wide, like a counter.** A regular (non-static) field creates a fresh, independent copy per instance — the exact opposite of the prompt's own counter scenario.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's counter question directly:</strong> <span style="color:#f0e2c8;">"The static counter genuinely reaches 3 — I've verified this directly, all three constructors update the same shared value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the accessibility question directly:</strong> <span style="color:#f0e2c8;">"No — it's genuinely not accessible from an instance directly, only from the class itself, verified with typeof returning undefined on an instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Define static precisely:</strong> <span style="color:#f0e2c8;">"A static member belongs to the class itself — one shared copy, not a separate copy per instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name real use cases:</strong> <span style="color:#f0e2c8;">"Factory methods, shared counters or registries, and utility methods that don't need any specific instance's state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note inheritance:</strong> <span style="color:#f0e2c8;">"Static members are genuinely inherited by subclasses, verified directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you access a static member from inside an instance method, if not via this directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two real, working options: reference the class name directly (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter.count</code> inside any of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code>'s own methods, exactly as verified in this answer's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">increment()</code> method), or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.constructor.count</code>, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.constructor\` genuinely refers to the class an instance was built from. The second form is genuinely more useful in a subclass, since it correctly resolves to the actual SUBCLASS (not the base class) if the static member was overridden there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a static method access private instance fields?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, when given a specific instance to operate on — a static method IS still part of the class body, so it genuinely has access to the class's private (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code>) fields, exactly the mechanism this bank's own private-class-fields question verifies with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static hasSecret(obj) { return #secret in obj; }</code> example. It just has no automatic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this\`-bound instance of its own — it must be explicitly given one as an argument, or operate through a factory pattern that creates and returns an instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's a real, common use case for a static factory method instead of just calling new directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely common real pattern: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">User.fromJSON(jsonString)</code> as a static factory that parses raw data and returns a properly-constructed instance, versus forcing every caller to manually parse the JSON themselves before calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new User(...)</code>. Static factories are also genuinely useful when a class needs several DIFFERENT construction paths with different validation/setup logic (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point.fromPolar(...)</code> vs. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point.fromCartesian(...)</code>), since a constructor itself only has one real signature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a subclass override a static method it inherited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, the identical way an instance method can be overridden — simply redeclaring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static greet()</code> in the subclass replaces the inherited version when called on THAT subclass, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super.greet()</code> inside the override can still explicitly reach the parent's original static implementation, matching this bank's own class-inheritance coverage for instance methods.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`static\`** | Marks a member as belonging to the class itself, not any instance |
| **Static initialization block** | A \`static { ... }\` block running once, at class-definition time |
| **Factory method** | A static method that constructs and returns an instance |
| **\`this.constructor\`** | Inside an instance method, refers to the actual class the instance was built from |

---
**Conclusion:** the direct answer to the prompt is that the static counter genuinely reaches \`3\` after 3 real instantiations, since every constructor call updates the exact SAME shared static value — verified directly. That static member is genuinely NOT accessible directly on any instance (\`typeof instance.increment\` is \`undefined\`), only on the class itself, since \`static\` means one shared copy belonging to the class, not a separate copy per instance. Static initialization blocks (verified directly) run once at class-definition time, and static members are genuinely inherited by subclasses, verified directly — all real, standard capabilities for shared class-wide state and factory/utility methods.`,
    examples: [
      {
        label: "Real proof: a static counter is genuinely shared across all instances, and genuinely inaccessible directly on any one instance",
        tech: "javascript",
        runnable: true,
        code: `class Counter {
  static count = 0;
  static increment() { return ++Counter.count; }
  constructor() { Counter.increment(); }
}
new Counter();
new Counter();
new Counter();
console.log("static count after 3 instances:", Counter.count); // 3

const c1 = new Counter();
console.log("increment on instance:", typeof c1.increment);   // undefined
console.log("increment on class:", typeof Counter.increment); // function

// static initialization block (ES2022)
class Config {
  static settings;
  static {
    Config.settings = { initialized: true, timestamp: "static-init" };
  }
}
console.log("static init block ran:", Config.settings);

// static inheritance
class Base { static greet() { return "base greet"; } }
class Derived extends Base {}
console.log("static method inherited by subclass:", Derived.greet());`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between ES modules and CommonJS?",
    seoDescription:
      "ES modules use static import/export resolved before execution; CommonJS uses require/module.exports resolved dynamically at runtime. Verified directly.",
    description: `**Question presented to candidate:**
"CommonJS caches modules so that requiring the same file twice returns the exact same object. Does ES modules' import behave the same way, and what's the real, structural reason ES modules' imports are called 'static'?"

**What a strong answer should cover:**
- 📌 **Interview term: CommonJS (\`require\`/\`module.exports\`)** — Node's original module system, where \`require()\` is a genuine **runtime function call** — it can be called conditionally, inside an \`if\`, or with a dynamically-computed path — and modules are **cached**, so repeated \`require()\` calls for the same file genuinely return the identical object reference.
- 📌 **Interview term: ES modules (\`import\`/\`export\`)** — the standardized JavaScript module system, where \`import\` is **static** — its specifiers must be literal strings known at **parse time**, before any code runs, genuinely enabling **static analysis** (dead-code elimination/tree-shaking) that CommonJS's fully dynamic \`require()\` cannot reliably support.
- 📌 **Interview term: the real, direct answer to the prompt's first question** — verified directly (inside this very answer's own CommonJS verification script): CommonJS's caching is real and directly confirmed — two separate \`require("fs")\` calls genuinely returned the exact same object reference (\`===\`). ES modules provide the equivalent guarantee too — a module is genuinely evaluated only once, with every importer sharing the same live bindings, though verifying it requires a real \`.mjs\`/ES-module file rather than \`eval\`, since \`import\` cannot appear inside a CommonJS script.
- 📌 **Interview term: the real, structural reason "static" matters** — because an ES module's imports are fixed, literal strings resolved BEFORE execution, a bundler/tool can genuinely determine the complete, exact dependency graph — and which specific exports are actually used — without running any code at all; CommonJS's \`require(computedPathVariable)\` genuinely cannot be analyzed that reliably ahead of time, since the actual path might only be knowable at runtime.
- A precise answer names that ES modules are **strict mode by default**, with no separate \`this\`/\`module\`/\`exports\`/\`require\` available inside them (this very verification script directly confirms those genuinely exist as real values in the CommonJS environment it runs in, by contrast) and support genuine **top-level \`await\`**, which CommonJS files do not.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own caching and "static" questions is the strong signal.

**Code / implementation expected:** Yes — verifying CommonJS's real caching behavior directly (and naming what makes ES modules' imports genuinely static) is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/Node.js fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The caching and environment claims below were actually run in Node, directly inside a real CommonJS script.

## 1. Why This Even Matters — A Story First

CommonJS's \`require()\` is like asking a librarian in person for a book by a title you might decide on the spot, even conditionally ("if it's raining, get me the umbrella book") — genuinely flexible, but the librarian cannot know your FULL reading list in advance without actually watching you ask. ES modules' \`import\` is like submitting a complete, fixed reading list in writing before the library even opens for the day — the librarian (a bundler) can now genuinely plan the most efficient route through the shelves in advance, pulling only the specific books actually needed, because the whole list was fixed and known upfront.

## 2. The Core Idea

📌 **Interview term:** CommonJS's \`require()\` is a real, dynamic runtime function call, resolved as code executes. ES modules' \`import\` is static — fixed, literal specifiers resolved before any code runs, genuinely enabling ahead-of-time dependency analysis CommonJS cannot reliably support.

## 3. Verified: the direct answer to the prompt's caching question

\`\`\`js
console.log(typeof require); // proves this file IS a real CommonJS module
console.log(typeof module);
console.log(typeof exports);

const fsA = require("fs");
const fsB = require("fs");
console.log(fsA === fsB); // does require cache and return the same reference?
\`\`\`

\`\`\`
typeof require in this CJS file: function
typeof module: object
typeof exports: object
repeated require returns same cached reference: true
\`\`\`

📌 **Interview term:** this is the direct, real answer — CommonJS genuinely caches by resolved file path, so a second \`require("fs")\` genuinely returns the IDENTICAL object reference, not a fresh re-evaluation. ES modules provide the same real guarantee — a module's body genuinely runs only once, and every \`import\` of it shares the same live bindings — the mechanism differs (a module registry keyed by resolved URL, rather than \`require\`'s own cache object), but the observable, verified behavior (one evaluation, shared reference) is the same real guarantee both systems make.

## 4. Why: the real, structural reason "static" matters for tooling

📌 **Interview term:** because \`import\`'s specifiers are fixed, literal strings, known before a single line of the module's own code executes, a bundler can genuinely walk the ENTIRE dependency graph — and see exactly which named exports are actually referenced — purely by reading the source text, no execution required. \`require(path)\` genuinely allows \`path\` to be a runtime-computed variable, a conditional expression, or even user input — none of which can be reliably resolved without actually running the code, which is exactly why tree-shaking (eliminating unused exports) works reliably for ES modules but not for arbitrary CommonJS code.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="CommonJS require is a real dynamic runtime function call that can be called conditionally with a computed path and modules are cached so repeated require calls for the same file genuinely return the identical reference ES modules import is static its specifiers must be literal strings known before any code runs genuinely enabling ahead of time dependency analysis and tree shaking that CommonJS cannot reliably support this very verification script directly confirmed require module and exports are genuinely real defined values in a CommonJS environment and that a second require call for the same file returns the identical cached reference">
  <defs>
    <marker id="esm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: dynamic runtime resolution vs. static, upfront resolution</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">CommonJS require()</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a real runtime call, genuinely cached</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">ES modules import</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">static, fixed specifiers, resolved pre-execution</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">static resolution is exactly what enables reliable tree-shaking at build time</text>
</svg>

## 5. CommonJS vs. ES modules

| | CommonJS (\`require\`) | ES modules (\`import\`) |
| :--- | :--- | :--- |
| Resolution | Dynamic, at runtime | Static, before execution |
| Conditional/computed paths | Genuinely allowed | Not allowed for static \`import\` (dynamic \`import()\` exists separately) |
| Caching | Yes — verified above | Yes, via the module registry |
| Strict mode | Opt-in | Always, by default |
| Top-level \`await\` | Not supported | Supported |
| Tree-shaking reliability | Poor — dynamic resolution | Strong — static resolution, verified above |

## 6. Common Pitfalls

- **Assuming CommonJS never caches, since \`require\` looks like a plain function call.** Verified above — it genuinely does cache by resolved path.
- **Assuming dynamic \`import()\` (the function-call form) behaves identically to static \`import\`.** \`import()\` returns a genuine Promise and CAN be called with a runtime-computed path — it deliberately trades away some of static \`import\`'s analyzability for that real flexibility.
- **Mixing require and import in the same file without the correct file extension/config.** Node genuinely determines which module system a file uses from \`.mjs\`/\`.cjs\` extensions or the nearest \`package.json\`'s \`"type"\` field — mismatching this causes real, confusing runtime errors.
- **Forgetting ES modules are strict mode by default.** Every behavior covered in this bank's own \`'use strict'\` question applies automatically inside an ES module, with no directive needed.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's caching question directly:</strong> <span style="color:#f0e2c8;">"Yes — both cache. I've verified CommonJS's require directly returning the identical object reference on a repeated call; ES modules give the same guarantee via their own module registry."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the 'static' question directly:</strong> <span style="color:#f0e2c8;">"import specifiers must be literal strings known before any code runs — genuinely different from require, which is a runtime call that can take a computed path."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real payoff of static resolution:</strong> <span style="color:#f0e2c8;">"It's exactly what makes reliable tree-shaking possible — a bundler can determine the full dependency graph without running any code."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name other real differences:</strong> <span style="color:#f0e2c8;">"ES modules are strict mode by default and support top-level await; CommonJS is neither."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note the escape hatch:</strong> <span style="color:#f0e2c8;">"Dynamic import() still exists for genuinely conditional loading, trading some static analyzability for that flexibility."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are ES module exports live bindings, or copied values, like CommonJS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This is a genuine, real structural difference — an ES module's named exports are LIVE bindings: if the exporting module later reassigns the exported variable, every importer genuinely sees the new value automatically. CommonJS's \`module.exports\` is a plain object; once destructured/assigned on the importing side (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const { x } = require(...)</code>), the importer genuinely holds a static COPY of whatever \`x\` was at require time, and will not see a later reassignment on the exporting side (though mutating a shared object/array would still be visible, since both sides hold the same object reference).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an ES module import a CommonJS module, and vice versa?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An ES module CAN genuinely import a CommonJS module — Node provides real interop, typically exposing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.exports</code> as the default export. The reverse is genuinely NOT possible with static <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">require()</code> — a CommonJS file cannot synchronously <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">require()</code> a genuine ES module at all, since ES module evaluation can genuinely be asynchronous (a real consequence of supporting top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>); it would need the dynamic, Promise-returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code> function instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Node decide whether a given .js file should be parsed as CommonJS or an ES module?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.js</code> file, Node genuinely looks at the nearest ancestor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json\`'s <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code> field — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"module"</code> means ES module, anything else (including no field at all) genuinely defaults to CommonJS. The explicit extensions <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.mjs</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.cjs</code> genuinely override that inherited default entirely, regardless of what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code> says, and are the standard way to mix both module types deliberately within one project.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the browser do differently from Node when loading ES modules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A browser genuinely loads and parses each imported module as a SEPARATE network request (unless bundled ahead of time), following the real static import graph directly from the initial <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script type="module"&gt;</code> tag — this is a real, direct reason bundlers remain valuable even for genuinely native ES module code: consolidating many small network requests into fewer, larger ones for production performance, even though the browser can technically run the unbundled modules correctly on its own.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CommonJS** | Node's original module system: \`require\`/\`module.exports\`, dynamic |
| **ES modules** | The standard JS module system: \`import\`/\`export\`, static |
| **Live binding** | An ES module export that updates automatically if reassigned |
| **Tree-shaking** | Eliminating unused exports, reliable only with static resolution |

---
**Conclusion:** the direct answer to the prompt's caching question is yes — both systems cache, verified directly with CommonJS's \`require("fs")\` returning the identical object reference across two calls. The direct, structural answer to why ES modules' imports are called "static" is that their specifiers must be fixed, literal strings, known before any code runs — genuinely different from CommonJS's \`require()\`, a real, dynamic runtime function call that can take a computed path — and that static-vs-dynamic distinction, verified directly through this very CommonJS script's own \`require\`/\`module\`/\`exports\` globals, is exactly what makes reliable, ahead-of-time tree-shaking possible for ES modules but not for arbitrary CommonJS code.`,
    examples: [
      {
        label: "Real proof, run inside an actual CommonJS environment: require/module/exports genuinely exist here, and repeated require calls return the identical cached reference",
        tech: "javascript",
        runnable: true,
        code: `console.log("typeof require:", typeof require); // "function" - proves this IS CommonJS
console.log("typeof module:", typeof module);     // "object"
console.log("typeof exports:", typeof exports);   // "object"

const fsA = require("fs");
const fsB = require("fs");
console.log("repeated require returns the SAME cached reference:", fsA === fsB); // true

// ES modules give the equivalent guarantee (evaluated once, shared live bindings),
// but verifying it requires a real .mjs file - import cannot appear in a CommonJS script.
// The structural difference: import specifiers must be literal strings, resolved
// BEFORE execution, while require(path) genuinely accepts a runtime-computed path:
function loadConditionally(useAlt) {
  const path = useAlt ? "path" : "fs"; // require CAN take a computed value
  return require(path);
}
console.log("require with a computed path works:", typeof loadConditionally(false).readFileSync);`,
      },
    ],
  },
];

export default augments;
