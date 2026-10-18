/**
 * TYPESCRIPT ULTRA — batch 01: Foundations (what TypeScript is, basic types,
 * type inference, tsconfig.json, the strict flag). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What is TypeScript and why use it over JavaScript?`,
    difficulty: "easy",
    seoDescription: `TypeScript is JavaScript plus a static type checker: it catches typos, wrong arguments and undefined values before run time, then erases the types.`,
    description: `**Question presented to candidate:**
"Your team is starting a new project and someone asks why we would use TypeScript instead of plain JavaScript. What is TypeScript, what does it actually give us, and what does it cost?"

**What a strong answer should cover:**
- TypeScript is JavaScript plus a static type system: \`tsc\` checks types before the code runs, then erases them and emits plain JavaScript
- Concrete bugs it catches that JavaScript runs anyway: property typos (\`NaN\`), wrong arguments, missing fields, possibly-\`undefined\` values
- Type erasure: no run-time cost and no run-time checking, so data at trust boundaries (JSON, network) still needs validation
- Tooling and refactoring benefits: autocomplete, safe renames, signatures as documentation; structural typing and gradual adoption
- Honest costs: a build or check step (Node.js type stripping does not type-check), learning curve, false confidence from \`any\` and \`as\`, and the fact that plain \`tsc\` still emits on errors unless \`noEmitOnError\` is set

**Code / implementation expected:** Optional — a small typed function showing an error JavaScript would only reveal at run time.`,
    answer: `**Target Audience:** Beginners who know some JavaScript and keep hearing "just use TypeScript".
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`); release history checked against the sources linked inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a big kitchen. JavaScript is a cook who never reads the labels on the jars: hand them salt instead of sugar and they will happily bake the cake, and you find out when someone takes a bite. TypeScript is a kitchen where every jar is labelled and a sous-chef checks each recipe **before** cooking starts: "this step asks for sugar but you reached for the salt jar". The cooking itself is exactly the same — the sous-chef just leaves before the oven goes on.

That is the whole deal. TypeScript adds **labels** (types) to your JavaScript and a **checker** that reads them before the code runs. Then it removes the labels and hands plain JavaScript to the browser or Node.js. Mistakes that JavaScript would only reveal in production — a typo in a property name, a missing field, a function called with the wrong thing — show up in your editor while you type.

## 2. What TypeScript Actually Is

TypeScript is JavaScript plus a static type system. It was made public by Microsoft as version 0.8 on 1 October 2012, with Anders Hejlsberg (also the lead architect of C#) among its designers ([Wikipedia](https://en.wikipedia.org/wiki/TypeScript)).

📌 **Interview term: superset of JavaScript** — TypeScript syntax is JavaScript syntax plus type annotations and a few extra constructs. Existing JavaScript is (almost always) already valid TypeScript, which is why teams can adopt it file by file.

📌 **Interview term: static type checking** — checking types by reading the source code, **before** it runs. JavaScript is *dynamically* typed: values carry their type, and a wrong type is only discovered when that line executes.

📌 **Interview term: type erasure** — the compiler removes every annotation, interface and type alias when it produces JavaScript. Types have **no run-time existence**: the emitted code is the same program you would have written by hand.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A TypeScript file goes through tsc, which reports type errors and emits plain JavaScript that runs in a browser or Node.js">
  <defs>
    <marker id="ts01q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="140" text-anchor="middle">app.ts</text>
  <text class="d-sub" x="95" y="162" text-anchor="middle">code plus types</text>
  <rect class="d-box-accent" x="250" y="110" width="170" height="70" rx="10"/>
  <text class="d-text" x="335" y="140" text-anchor="middle">tsc</text>
  <text class="d-sub" x="335" y="162" text-anchor="middle">check, then erase</text>
  <rect class="d-box-muted" x="500" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">type errors</text>
  <text class="d-sub" x="600" y="72" text-anchor="middle">in the editor or CI</text>
  <rect class="d-box" x="500" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="600" y="230" text-anchor="middle">app.js</text>
  <text class="d-sub" x="600" y="252" text-anchor="middle">plain JavaScript, runs</text>
  <path class="d-edge" d="M 174 145 L 244 145" marker-end="url(#ts01q1-arrow)"/>
  <path class="d-edge-dashed" d="M 424 125 L 494 62" marker-end="url(#ts01q1-arrow)"/>
  <path class="d-edge-accent" d="M 424 165 L 494 230" marker-end="url(#ts01q1-arrow)"/>
</svg>

The checker and the emitter are two separate jobs. By default \`tsc\` still writes the JavaScript even when there are type errors (unless you set \`noEmitOnError\`), and many build tools (esbuild, SWC, Vite, Node.js type stripping) only do the erase step and never check types at all.

## 3. What It Catches: Bugs JavaScript Runs Anyway

Here is a tiny cart. Three mistakes that plain JavaScript accepts without complaint:

~~~ts
type CartItem = { name: string; price: number; qty: number };

function total(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

const buggyTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.prise * item.qty, 0); // typo
total("pen");                                                  // wrong argument
const lamp: CartItem = { name: "lamp", price: 30 };             // missing qty
~~~

\`tsc --strict\` on this code (5.4.5) reports all three, before anything runs:

~~~text
main.ts(17,82): error TS2551: Property 'prise' does not exist on type 'CartItem'. Did you mean 'price'?
main.ts(24,9): error TS2345: Argument of type 'string' is not assignable to parameter of type 'CartItem[]'.
main.ts(31,7): error TS2741: Property 'qty' is missing in type '{ name: string; price: number; }' but required in type 'CartItem'.
~~~

(The line numbers are from the full example below the answer.) And here is what JavaScript does with the same code when you run it anyway: \`NaN\` for the typo, a crash for the wrong argument, \`NaN\` again for the missing field. Two of the three fail **silently** — the worst kind of bug, because the wrong number travels on into an invoice or a database.

## 4. What It Does Not Do: Types Vanish at Run Time

This is the part interviewers love to probe. Because of type erasure, an annotation is a **promise you make to the checker**, not a check on real data:

~~~ts
interface User { id: number; name: string }
const user: User = JSON.parse('{"id": "42", "name": "Ada"}'); // JSON.parse returns any
console.log(typeof user.id); // string  (the type said number)
console.log(user.id + 1);    // 421     (string concatenation)
~~~

\`JSON.parse\` returns \`any\`, so TypeScript accepts the annotation without question. The interface itself is gone after compilation — \`typeof User\` in a value position is a compile error (\`TS2693: 'User' only refers to a type, but is being used as a value here.\`) and at run time there is simply nothing called \`User\`.

📌 **Interview term: trust boundary** — the place where outside data (network, JSON, user input, \`localStorage\`) enters your program. TypeScript cannot see across it. You validate there, with a type guard or a schema library such as Zod, and from then on the types are true. See [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape) for the full pattern and [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown) for why \`unknown\` is the right input type.

## 5. Why Teams Choose It Over JavaScript

| Benefit | What it means in practice |
| :--- | :--- |
| Errors before run time | Typos, wrong arguments, missing fields and possible \`undefined\` are flagged in the editor and in CI |
| Tooling | Autocomplete, go-to-definition, find-all-references and **safe renames** all come from the same type information |
| Living documentation | A function signature says what it takes and returns, and unlike a comment it cannot go stale without a compile error |
| Refactoring at scale | Change a type and the compiler lists every place that must change |
| Gradual adoption | \`allowJs\`, \`checkJs\` and JSDoc types let a codebase migrate file by file (see [How do you migrate a JavaScript codebase to TypeScript?](/interview-question/how-do-you-migrate-a-javascript-codebase-to-typescript)) |

Adoption is no longer a niche bet: GitHub's Octoverse 2025 report says TypeScript overtook Python and JavaScript in August 2025 to become the most used language on GitHub by monthly contributors ([GitHub blog](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)).

📌 **Interview term: structural typing** — TypeScript compares types by their **shape**, not their name: any object with \`name\`, \`price\` and \`qty\` of the right types is a \`CartItem\`, whether or not it was declared as one. This matches how JavaScript objects are actually used. The deep dive is [What is structural typing?](/interview-question/what-is-structural-typing)

## 6. The Costs (Say These Out Loud)

A strong answer is not a sales pitch. The real trade-offs:

- **A build or check step.** Something has to run \`tsc\` (for checking) and something has to erase types (for running). Node.js now strips erasable types by itself: behind \`--experimental-strip-types\` from 22.6, on by default from 23.6 and 22.18, marked stable in 24.12 and 25.2 — and it performs **no type checking** ([Node.js docs](https://nodejs.org/api/typescript.md)). You still run \`tsc --noEmit\` in CI.
- **Learning curve.** Generics, narrowing and the type-level features take time; badly written types can be harder to read than the code.
- **False confidence.** \`any\`, type assertions (\`as\`) and unvalidated \`JSON.parse\` results switch checking off silently. The system is deliberately **not fully sound**.
- **Third-party types.** Libraries without bundled types need \`@types/...\` packages, which can lag or be wrong.
- **Compile speed on huge codebases.** This is what the TypeScript 7.0 native (Go) compiler targets; trade press reported its release in mid-2026 with roughly 10x faster builds ([InfoQ](https://infoq.com/news/2026/08/typescript-7-released/)). I could not check the exact 7.0 release notes here, so treat the speed figure as reported, not measured.

📌 **Interview term: soundness** — a type system is *sound* if a program that type-checks can never produce a value of the wrong type at run time. TypeScript chooses convenience over full soundness (\`any\`, assertions, some variance shortcuts), which is why the trust-boundary rule above matters.

## 7. Verified: Running the Code

Both examples below the answer were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is a compile error the checker really reports — and run the way the page runs them.

Example 1, the bugs TypeScript catches:

~~~text
18
NaN
TypeError: items.reduce is not a function
NaN
~~~

Example 2, types are erased and only a run-time check protects you:

~~~text
string
421
undefined
rejected {"id":"42","name":"Ada"}
valid user 8
~~~

What the run proves:

- The typo and the missing field produce \`NaN\` without any error — JavaScript would ship that.
- The wrong argument only fails when the line executes (\`items.reduce is not a function\`).
- \`user.id + 1\` gave \`"421"\`: the annotation \`id: number\` did nothing to the actual string. Only the \`isUser\` guard, which checks the data, rejected it.

## Common Pitfalls

- **Believing types validate data.** They do not exist at run time. Validate network and JSON input at the boundary.
- **Using \`any\` to make errors go away.** It disables checking for that value and everything it flows into. Prefer \`unknown\` plus narrowing.
- **Thinking your bundler type-checks.** esbuild, SWC, Babel and Node.js type stripping only remove types. Add \`tsc --noEmit\` to CI or errors reach production.
- **Assuming a failed check stops the build.** Plain \`tsc\` still emits JavaScript when there are type errors unless \`noEmitOnError\` is set.
- **Leaving \`strict\` off.** Without it, \`null\` and \`undefined\` are assignable to everything and unannotated parameters become \`any\` — most of the value is gone. See [What does the 'strict' flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">TypeScript is <strong style="color:#ffca28;">JavaScript plus a static type system</strong>. You add types, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> checks them before the code runs, then erases them and outputs plain JavaScript.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">It catches whole classes of bugs early — typos in property names, wrong arguments, missing fields, possible <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> — and powers autocomplete, safe renames and refactoring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Key property:</strong> <span style="color:#f0e2c8;">Types are <strong style="color:#ffca28;">erased</strong>: they cost nothing at run time and they also check nothing at run time, so data from the network still needs validation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Design choices:</strong> <span style="color:#f0e2c8;">It is <strong style="color:#ffca28;">structurally typed</strong> (shape, not name) and intentionally not fully sound, which keeps it close to how JavaScript is really written.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">A build or check step, a learning curve, and false confidence if the team leans on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>. Turning on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> is what makes it worth it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TypeScript make my code run faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The emitted JavaScript is the same program you would write by hand; types are erased. The benefit is fewer bugs and better tooling, not run-time speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a function is typed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(id: number)</code>, can it receive a string at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Any caller that bypasses the checker — plain JavaScript, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code> output — can pass a string. Types are compile-time only; validate at trust boundaries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tsc</code> refuse to output JavaScript when there are type errors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by default: it reports the errors and still emits. Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noEmitOnError</code> to block emit, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noEmit</code> and let a separate tool do the transpiling.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Node.js run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.ts</code> files directly now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for erasable syntax: type stripping is on by default from Node 23.6 and 22.18. It only removes types and does no checking, and features like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enum</code> need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--experimental-transform-types</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is TypeScript a superset of JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Syntactically, almost: valid JavaScript is valid TypeScript syntax. But the checker may still report errors on valid JavaScript, for example an implicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Superset of JavaScript | TypeScript syntax is JavaScript syntax plus types, so existing JavaScript is already almost valid TypeScript |
| Static type checking | Finding type errors by reading the source before it runs |
| Type erasure | The compiler removes all types; nothing of them exists at run time |
| Trust boundary | Where outside data enters the program and must be validated, because types cannot see it |
| Structural typing | Types are compatible when their shapes match, regardless of their names |
| Soundness | The guarantee that a well-typed program never holds a wrongly typed value at run time; TypeScript does not fully provide it |

**Conclusion:** TypeScript is JavaScript with labels and a checker that reads them before the code runs, then removes them. That buys you early errors, editor tooling and safe refactoring at no run-time cost — and, because the labels are gone at run time, it also means data entering your program still has to be checked. The honest interview answer names both halves: catch bugs at compile time, validate at the boundaries, keep \`strict\` on and \`any\` rare.`,
    examples: [
      {
        label: `The bugs TypeScript catches that JavaScript runs anyway`,
        code: `// A typed shopping cart: the type says what every item must look like.
type CartItem = { name: string; price: number; qty: number };

function total(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

const cart: CartItem[] = [
  { name: "pen", price: 2, qty: 3 },
  { name: "book", price: 12, qty: 1 },
];
console.log(total(cart)); // 18

// Bug 1: a typo in a property name.
// Plain JavaScript runs it and quietly produces NaN.
// @ts-expect-error Property 'prise' does not exist on type 'CartItem'. Did you mean 'price'?
const buggyTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.prise * item.qty, 0);
console.log(buggyTotal(cart)); // NaN

// Bug 2: passing the wrong kind of value.
// Plain JavaScript only finds out when the line runs, and then it crashes.
try {
  // @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'CartItem[]'.
  total("pen");
} catch (err) {
  console.log(String(err));
}

// Bug 3: a missing property in an object literal.
// @ts-expect-error Property 'qty' is missing in type '{ name: string; price: number; }'
const lamp: CartItem = { name: "lamp", price: 30 };
console.log(total([lamp])); // NaN`,
      },
      {
        label: `Types are erased: only a run-time check protects you`,
        code: `// Types are erased: they describe the code, they do not check data at run time.
interface User {
  id: number;
  name: string;
}

// JSON.parse returns any, so TypeScript trusts this annotation without checking.
const raw = '{"id": "42", "name": "Ada"}';
const user: User = JSON.parse(raw);
console.log(typeof user.id); // string
// The type says number, the value is a string, so + concatenates.
console.log(user.id + 1); // 421

// An interface does not exist at run time: there is nothing to look up.
// @ts-expect-error 'User' only refers to a type, but is being used as a value here.
console.log(typeof User); // undefined

// The fix: check the data where it enters the program, with a type guard.
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "number" &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

const candidates: unknown[] = [JSON.parse(raw), { id: 7, name: "Linus" }];
for (const c of candidates) {
  if (isUser(c)) {
    // Inside this block c has type User, and that is now actually true.
    console.log("valid user", c.id + 1);
  } else {
    console.log("rejected", JSON.stringify(c));
  }
}`,
      },
    ],
  },
  {
    title: `What are the basic types in TypeScript?`,
    difficulty: "easy",
    seoDescription: `The basic TypeScript types: seven lowercase primitives, arrays, tuples and object types, plus any, unknown, void and never, with the classic traps.`,
    description: `**Question presented to candidate:**
"Walk me through the basic types in TypeScript. Which ones map to JavaScript values, and what are the special ones like \`any\`, \`unknown\`, \`void\` and \`never\` for?"

**What a strong answer should cover:**
- The seven primitives, lowercase: \`string\`, \`number\`, \`bigint\`, \`boolean\`, \`symbol\`, \`null\`, \`undefined\` (and why \`String\` is the wrong type)
- Arrays (\`number[]\` / \`Array<number>\`), tuples (\`[string, number]\`) and object types with optional properties
- The special types: \`any\` disables checking, \`unknown\` must be narrowed, \`void\` means no useful return, \`never\` means no possible value
- \`unknown\` as the top type and \`never\` as the bottom type, with \`any\` outside the ordering
- Classic traps: \`{}\` accepts \`5\`, \`typeof null\` is \`"object"\`, \`bigint\` does not mix with \`number\`, and types are erased at run time

**Code / implementation expected:** Optional — a few annotated declarations and one rejected assignment.`,
    answer: `**Target Audience:** Beginners writing their first TypeScript annotations.
**Difficulty:** Easy
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a post office sorting room. Every parcel goes into a bin by **kind**: letters, small boxes, large boxes, fragile items. Once a bin is labelled "letters", a sorter who tries to drop a bicycle into it gets stopped immediately. A type is that bin label. When you write \`let port: number\`, you are labelling the bin, and TypeScript stops anyone putting the string \`"8080"\` into it.

To label bins you need a vocabulary of kinds. TypeScript's basic types are that vocabulary — and the good news is that most of it is simply JavaScript's own seven kinds of primitive value, plus a handful of special types that describe "anything", "nothing" and "impossible".

## 2. The Primitive Types

These match the seven primitive values of JavaScript one to one, and \`typeof\` reports them at run time (with one famous exception):

| Type | Example values | \`typeof\` at run time | Notes |
| :--- | :--- | :--- | :--- |
| \`string\` | \`"hi"\`, \`'a'\`, template strings | \`"string"\` | Text |
| \`number\` | \`42\`, \`3.14\`, \`NaN\`, \`Infinity\` | \`"number"\` | One type for integers and decimals: a 64-bit float |
| \`bigint\` | \`10n\`, \`9007199254740993n\` | \`"bigint"\` | Arbitrary-size integers; needs target ES2020 or later; not assignable to \`number\` |
| \`boolean\` | \`true\`, \`false\` | \`"boolean"\` | |
| \`symbol\` | \`Symbol("id")\` | \`"symbol"\` | Unique keys |
| \`null\` | \`null\` | \`"object"\` (a JavaScript quirk) | "Deliberately empty" |
| \`undefined\` | \`undefined\` | \`"undefined"\` | "Not set yet" |

📌 **Interview term: type annotation** — the \`: Type\` you write after a variable, parameter or return position, as in \`const port: number = 8080\`. Most of the time you can leave it out and let TypeScript infer it (see [How does type inference work in TypeScript?](/interview-question/how-does-type-inference-work-in-typescript)).

📌 **Interview term: primitive type** — a type for a single immutable value with no properties of its own: \`string\`, \`number\`, \`bigint\`, \`boolean\`, \`symbol\`, \`null\`, \`undefined\`.

Always use the **lowercase** names. \`String\`, \`Number\` and \`Boolean\` (capitalised) are the types of the rarely used wrapper objects. TypeScript 5.4.5 says so itself:

~~~text
error TS2322: Type 'String' is not assignable to type 'string'.
  'string' is a primitive, but 'String' is a wrapper object. Prefer using 'string' when possible.
~~~

Why \`bigint\` exists: \`number\` is a double-precision float, so above 2^53 it cannot represent every integer. The example proves it: \`9007199254740993 === 9007199254740992\` is \`true\`, while \`huge + 1n\` with a \`bigint\` prints the exact \`9007199254740994\`.

## 3. Arrays, Tuples and Objects

~~~ts
const scores: number[] = [90, 85, 77];          // array of numbers
const tags: Array<string> = ["ts", "js"];       // same thing, generic syntax
const entry: [string, number] = ["age", 30];    // tuple: fixed length, typed positions
const point: { x: number; y: number; label?: string } = { x: 1, y: 2 };
~~~

- \`T[]\` and \`Array<T>\` are identical; teams pick one style.
- A **tuple** fixes both the length and the type at each position. The full story is [What are tuple types?](/interview-question/what-are-tuple-types)
- An **object type** lists each property and its type; \`?\` makes a property optional. Reusable object types are usually written with \`interface\` or \`type\` — see [What is the difference between interface and type?](/interview-question/what-is-the-difference-between-interface-and-type)

Three similar-looking types catch people out. Checked with 5.4.5:

| Type | Accepts | Rejects |
| :--- | :--- | :--- |
| \`object\` | any non-primitive: objects, arrays, functions | \`5\` → \`Type 'number' is not assignable to type 'object'.\` |
| \`{}\` | **any value except \`null\` and \`undefined\`**, including \`5\` and \`"x"\` | \`null\` → \`Type 'null' is not assignable to type '{}'.\` |
| \`Object\` | almost the same as \`{}\` | rarely what you want |

## 4. The Special Types: Anything, Nothing, Impossible

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="unknown sits at the top and accepts every type, the primitive and object types sit in the middle, never sits at the bottom and is assignable to every type">
  <rect class="d-box-accent" x="260" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="48" text-anchor="middle">unknown</text>
  <text class="d-sub" x="360" y="68" text-anchor="middle">top type: holds anything</text>
  <rect class="d-box" x="20" y="150" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="183" text-anchor="middle">string</text>
  <rect class="d-box" x="160" y="150" width="120" height="56" rx="10"/>
  <text class="d-text" x="220" y="183" text-anchor="middle">number</text>
  <rect class="d-box" x="300" y="150" width="120" height="56" rx="10"/>
  <text class="d-text" x="360" y="183" text-anchor="middle">boolean</text>
  <rect class="d-box" x="440" y="150" width="120" height="56" rx="10"/>
  <text class="d-text" x="500" y="183" text-anchor="middle">objects</text>
  <rect class="d-box" x="580" y="150" width="120" height="56" rx="10"/>
  <text class="d-text" x="640" y="183" text-anchor="middle">null, ...</text>
  <rect class="d-box-muted" x="260" y="280" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="308" text-anchor="middle">never</text>
  <text class="d-sub" x="360" y="328" text-anchor="middle">bottom type: no values</text>
  <path class="d-edge" d="M 300 84 L 90 146"/>
  <path class="d-edge" d="M 330 84 L 225 146"/>
  <path class="d-edge" d="M 360 84 L 360 146"/>
  <path class="d-edge" d="M 390 84 L 495 146"/>
  <path class="d-edge" d="M 420 84 L 630 146"/>
  <path class="d-edge-dashed" d="M 90 210 L 300 276"/>
  <path class="d-edge-dashed" d="M 225 210 L 330 276"/>
  <path class="d-edge-dashed" d="M 360 210 L 360 276"/>
  <path class="d-edge-dashed" d="M 495 210 L 390 276"/>
  <path class="d-edge-dashed" d="M 630 210 L 420 276"/>
</svg>

Every type fits inside \`unknown\`, and \`never\` fits inside every type. \`any\` is not in the picture because it is not part of the ordering at all: it switches checking off in both directions.

| Type | Meaning | Typical use |
| :--- | :--- | :--- |
| \`any\` | "Do not check this." Every operation is allowed | Escape hatch during migration; avoid |
| \`unknown\` | "Could be anything — prove what it is before using it" | Input from JSON, \`catch\` variables, untrusted data |
| \`void\` | "Returns nothing useful" | Return type of functions like \`log()\` |
| \`never\` | "This cannot happen": a type with no values | Functions that always throw; exhaustiveness checks |
| \`null\` / \`undefined\` | Their own types under \`strict\` | Combined in unions: \`string \\| null\` |

📌 **Interview term: top type / bottom type** — \`unknown\` is the *top type*: every value is assignable to it. \`never\` is the *bottom type*: it has no values and is assignable to every type, which is why \`string | never\` is just \`string\` (the example proves it with a compile-time \`Equal\` check).

📌 **Interview term: any** — the opt-out type. \`loose.toFixed\` compiles even though \`loose\` holds a string, and the run prints \`true\` for \`loose.toFixed === undefined\`. \`unknown\` is the safe twin: \`safe.toUpperCase()\` is rejected with \`'safe' is of type 'unknown'.\` until a \`typeof safe === "string"\` check narrows it. The comparison has its own page: [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown)

For \`never\` and \`void\` in depth, see [What is the never type?](/interview-question/what-is-the-never-type) and [What is the difference between void, undefined and never as return types?](/interview-question/what-is-the-difference-between-void-undefined-and-never-as-return-types). How \`null\` and \`undefined\` become safe is in [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

## 5. Building Bigger Types From the Basics

Two operators turn the basic types into almost everything else you will write:

- **Literal types**: a single exact value as a type, such as \`"up"\` or \`404\`.
- **Union types**: \`A | B\`, "one of these". \`type Direction = "up" | "down"\` lets only those two strings in; assigning \`"left"\` fails with \`Type '"left"' is not assignable to type 'Direction'.\`

📌 **Interview term: literal type** — a type that has exactly one value. Combined with unions it replaces many uses of enums. Details: [What are literal types?](/interview-question/what-are-literal-types) and [What are union and intersection types?](/interview-question/what-are-union-and-intersection-types)

TypeScript also has \`enum\`, which — unlike everything above — generates real JavaScript code. Its trade-offs are covered in [What are enums and what are their trade-offs?](/interview-question/what-are-enums-and-what-are-their-trade-offs)

## 6. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5) — each \`// @ts-expect-error\` marks a line the checker really rejects — and run as the page runs them. With the directives removed, tsc reports:

~~~text
main.ts(30,7): error TS2322: Type 'string' is not assignable to type 'number'.
main.ts(34,11): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
main.ts(11,1): error TS18046: 'safe' is of type 'unknown'.
main.ts(34,1): error TS2322: Type '"left"' is not assignable to type 'Direction'.
~~~

(the first two from example 1, the last two from example 2). Example 1, primitives, arrays, tuples and objects:

~~~text
string number bigint boolean symbol
object undefined
true
9007199254740994
[90,85,77] ["ts","js"] ["age",30]
{"x":1,"y":2}
string
3
~~~

Example 2, the special types:

~~~text
true
HELLO
log: saved
Error: boom
left
true true true
~~~

Two lines are worth pointing at. \`typeof nothing\` printed \`object\` for \`null\` — a JavaScript quirk that TypeScript does not change. And after the rejected \`const port: number = "8080"\` and \`tags.push(3)\`, the program still ran and printed \`string\` and \`3\`: the error was real, but types do not exist at run time, so nothing stops the JavaScript from doing it.

## Common Pitfalls

- **Capitalised types.** \`String\`, \`Number\`, \`Boolean\` and \`Object\` are wrapper-object types. Use \`string\`, \`number\`, \`boolean\`, \`object\`.
- **Expecting \`{}\` to mean "an object".** It means "anything except \`null\` and \`undefined\`" and happily accepts \`5\`. Use \`object\` or a specific shape, or \`Record<string, unknown>\` for a dictionary.
- **Reaching for \`any\`.** It silently spreads. Use \`unknown\` and narrow.
- **Mixing \`bigint\` and \`number\`.** \`10n + 1\` is an error in TypeScript and a \`TypeError\` in JavaScript; convert explicitly with \`Number()\` or \`BigInt()\`.
- **Forgetting that \`typeof null\` is \`"object"\`.** A \`typeof x === "object"\` check must also exclude \`null\` (the type checker reminds you under \`strict\`).
- **Annotating everything.** \`const n: number = 5\` is noise; annotate parameters and public return types, let inference do the rest.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Primitives:</strong> <span style="color:#f0e2c8;">The basic types mirror JavaScript: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bigint</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, always lowercase.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Collections:</strong> <span style="color:#f0e2c8;">Arrays as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number[]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array&lt;number&gt;</code>, tuples like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string, number]</code> with fixed positions, and object types that list each property, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> for optional ones.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Special types:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> turns checking off, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> is the safe "anything" you must narrow, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> means no useful return value and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> means no value can exist.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hierarchy:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> is the <strong style="color:#ffca28;">top type</strong>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> the <strong style="color:#ffca28;">bottom type</strong>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> sits outside the ordering, which is why it is dangerous.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Composition:</strong> <span style="color:#f0e2c8;">Literal types and unions such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"up" | "down"</code> build most real-world types from these pieces, and all of it is erased at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">object</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{}</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> is any non-primitive. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> is any value except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so it even accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object</code> behaves almost like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code>. For "some object" use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> or a specific shape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof null</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"object"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a historical JavaScript bug kept for compatibility. TypeScript gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> its own type, but at run time you still need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x !== null</code> next to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof x === "object"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bigint</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">number</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When integers can exceed 2^53, such as database IDs or exact money in minor units. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> is a float and loses precision there; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bigint</code> does not, but it cannot mix with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> in arithmetic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> for a value you do not know yet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>. It accepts any value but forces a check before use. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> accepts any value and allows any use, so mistakes are never reported.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">undefined</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not quite. A function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> may return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> says "ignore the result", and a callback typed to return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> may even return something. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> is a concrete value type.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type annotation | The \`: Type\` written after a variable, parameter or return position |
| Primitive type | \`string\`, \`number\`, \`bigint\`, \`boolean\`, \`symbol\`, \`null\` or \`undefined\` |
| Top type / bottom type | \`unknown\` holds every value; \`never\` holds none and fits every type |
| any | The opt-out type that disables checking for a value |
| Literal type | A type with exactly one value, such as \`"up"\` or \`404\` |

**Conclusion:** TypeScript's basic types are JavaScript's seven primitives written in lowercase, plus arrays, tuples and object shapes to group them, plus four special types: \`any\` (no checking), \`unknown\` (anything, prove it first), \`void\` (nothing useful returned) and \`never\` (impossible). Literal and union types then combine these into precise descriptions of real data. Know the hierarchy — \`unknown\` at the top, \`never\` at the bottom, \`any\` outside it — and the classic traps (\`{}\` accepts \`5\`, \`typeof null\` is \`"object"\`, \`String\` is not \`string\`), and you have the foundation every other TypeScript question builds on.`,
    examples: [
      {
        label: `Primitives, arrays, tuples and object types`,
        code: `// The seven primitive types, each with an explicit annotation.
const title: string = "TypeScript";
const version: number = 5.4;
const huge: bigint = 9007199254740993n;
const done: boolean = false;
const id: symbol = Symbol("id");
const nothing: null = null;
const notSet: undefined = undefined;

// typeof is JavaScript: it reports the run-time kind of each value.
console.log(typeof title, typeof version, typeof huge, typeof done, typeof id);
console.log(typeof nothing, typeof notSet);

// number is a 64-bit float, so big integers lose precision; bigint does not.
console.log(9007199254740993 === 9007199254740992); // true
console.log(String(huge + 1n)); // 9007199254740994

// Arrays and tuples.
const scores: number[] = [90, 85, 77];
const tags: Array<string> = ["ts", "js"];
const entry: [string, number] = ["age", 30];
console.log(JSON.stringify(scores), JSON.stringify(tags), JSON.stringify(entry));

// Object types: describe the shape, property by property.
const point: { x: number; y: number; label?: string } = { x: 1, y: 2 };
console.log(JSON.stringify(point)); // {"x":1,"y":2}

// The checker rejects values of the wrong type.
// @ts-expect-error Type 'string' is not assignable to type 'number'.
const port: number = "8080";
console.log(typeof port); // string

// @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'.
tags.push(3);
console.log(tags.length); // 3`,
      },
      {
        label: `The special types: any, unknown, void, never and literals`,
        code: `// The special types: any, unknown, void, never, plus literal and union types.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// any switches checking off: every operation is allowed.
const loose: any = "hello";
console.log(loose.toFixed === undefined); // true

// unknown accepts anything but allows nothing until you narrow it.
const safe: unknown = "hello";
// @ts-expect-error 'safe' is of type 'unknown'.
safe.toUpperCase();
if (typeof safe === "string") console.log(safe.toUpperCase()); // HELLO

// void: a function that returns nothing useful.
function log(message: string): void {
  console.log("log:", message);
}
log("saved");

// never: a function that cannot return normally.
function fail(message: string): never {
  throw new Error(message);
}
try {
  fail("boom");
} catch (e) {
  console.log(String(e));
}

// Literal and union types: a value from a fixed set.
type Direction = "up" | "down";
let move: Direction = "up";
// @ts-expect-error Type '"left"' is not assignable to type 'Direction'.
move = "left";
console.log(move); // left

// Compile-time proofs of what some types are.
const a: Equal<string | never, string> = true;
const b: Equal<ReturnType<typeof log>, void> = true;
const c: Equal<typeof fail, (message: string) => never> = true;
console.log(a, b, c);`,
      },
    ],
  },
  {
    title: `How does type inference work in TypeScript?`,
    difficulty: "easy",
    seoDescription: `How TypeScript infers types from initializers, returns and context, why let widens literals, and where you still need annotations.`,
    description: `**Question presented to candidate:**
"A lot of TypeScript code has hardly any type annotations, yet it is fully typed. How does type inference work, where does it come from, and when do you still need to write types yourself?"

**What a strong answer should cover:**
- Inference from initializers, array elements (best common type as a union), object literals and return statements; the result is fixed, not dynamic
- Contextual typing: callback parameters and functions assigned to a typed variable get their types from context
- Literal widening: \`const\` keeps \`"dark"\`, \`let\` and object properties widen to \`string\`; \`as const\` and annotations prevent it
- Limits: parameters are not inferred from call sites (\`TS7006\` under \`noImplicitAny\`), empty arrays evolve, mixed arrays do not get a supertype
- Control flow analysis narrows a variable after assignments and checks, separate from its declared type
- Where to annotate: parameters, public return types, empty collections, object literals that must match a shape

**Code / implementation expected:** Optional — a few declarations with the inferred type stated, ideally proven with a compile-time check.`,
    answer: `**Target Audience:** Beginners who wonder how much TypeScript they actually have to write by hand.
**Difficulty:** Easy
**TypeScript version:** Every inferred type below is proven by a compile-time check that TypeScript 5.4.5 (\`--strict\`) accepts; outputs are from a real run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Inferred types are not guessed from memory: each one is checked by the compiler with an \`Equal\` helper, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A new colleague joins and you introduce them as "Priya, she runs the payments team". Nobody needs to hand everyone a printed badge saying *Priya: Engineer: Payments*; people work out the role from what they have seen. TypeScript does the same with your values. Write \`let count = 0\` and it knows \`count\` is a number — you never wrote the word \`number\`.

That is **type inference**: the compiler works out types from the code you already wrote. It is why idiomatic TypeScript often looks almost identical to JavaScript, with annotations only at a few important places. Knowing *where* inference works, where it widens, and where it gives up is what separates writing TypeScript from fighting it.

📌 **Interview term: type inference** — the compiler deducing a type from context (an initializer, a return statement, an expected type) instead of from an explicit annotation. The inferred type is then **fixed**: \`count = "one"\` is still an error (\`Type 'string' is not assignable to type 'number'.\`). Inference is not dynamic typing.

## 2. Inference Flows in Two Directions

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Bottom-up inference goes from a value to a variable; contextual typing goes from an expected type down into a callback parameter">
  <defs>
    <marker id="ts01q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="30" text-anchor="middle">from the value up</text>
  <rect class="d-box" x="60" y="60" width="220" height="60" rx="10"/>
  <text class="d-text" x="170" y="96" text-anchor="middle">let count = 0</text>
  <rect class="d-box-accent" x="60" y="190" width="220" height="60" rx="10"/>
  <text class="d-text" x="170" y="226" text-anchor="middle">count: number</text>
  <path class="d-edge-accent" d="M 170 124 L 170 184" marker-end="url(#ts01q3-arrow)"/>
  <text class="d-text" x="540" y="30" text-anchor="middle">from the context down</text>
  <rect class="d-box" x="420" y="60" width="240" height="60" rx="10"/>
  <text class="d-text" x="540" y="88" text-anchor="middle">names.map(</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">expects a string callback</text>
  <rect class="d-box-accent" x="420" y="190" width="240" height="60" rx="10"/>
  <text class="d-text" x="540" y="226" text-anchor="middle">(n) gets n: string</text>
  <path class="d-edge-accent" d="M 540 124 L 540 184" marker-end="url(#ts01q3-arrow)"/>
</svg>

On the left, the type of an expression determines the type of the variable. On the right, the type the surrounding code *expects* determines the type of a parameter you did not annotate.

📌 **Interview term: contextual typing** — inferring a type from the position an expression appears in, most often a callback parameter (\`["ada", "linus"].map((n) => n.toUpperCase())\` gives \`n: string\`) or a function assigned to an annotated variable (\`const onKey: Handler = (event) => ...\`).

## 3. The Places Inference Happens

Each row below is proven in the first example by a line like \`const ok: Equal<typeof x, Expected> = true;\` — if the inferred type differed, the file would not compile.

| Source of inference | Code | Inferred type |
| :--- | :--- | :--- |
| Initializer, \`let\` | \`let theme = "dark"\` | \`string\` |
| Initializer, \`const\` | \`const mode = "dark"\` | \`"dark"\` |
| Array elements | \`[1, "two", null]\` | \`(string \\| number \\| null)[]\` |
| Object literal | \`{ x: 1, y: 2, tag: "origin" }\` | \`{ x: number; y: number; tag: string }\` |
| Return statements | \`return null\` / \`return Number(text)\` | \`number \\| null\` |
| Contextual typing | \`["ada"].map((n) => n.toUpperCase())\` | \`string[]\`, with \`n: string\` |
| Generic call | \`firstOf([true, false])\` | \`T = boolean\`, so \`boolean\` |

📌 **Interview term: best common type** — for an array literal, TypeScript takes the union of the element types. It does **not** invent a shared supertype: \`[new Dog(), new Cat()]\` is \`(Dog | Cat)[]\`, not \`Animal[]\`, even if both extend \`Animal\`. If you want \`Animal[]\`, annotate it.

📌 **Interview term: return type inference** — the return type of a function is the union of the types of all its \`return\` expressions. \`parsePort\` returns \`null\` in one branch and a \`number\` in the other, so its type is \`number | null\`.

For generics specifically — how \`T\` is chosen from arguments — see [What are generics and why are they useful?](/interview-question/what-are-generics-and-why-are-they-useful)

## 4. Widening: Why \`let\` and \`const\` Infer Differently

\`const mode = "dark"\` can never change, so its type is the literal \`"dark"\`. \`let theme = "dark"\` can be reassigned to any string later, so TypeScript **widens** the literal to \`string\`. The same happens to object properties: \`{ tag: "origin" }\` gets \`tag: string\` because properties are mutable.

📌 **Interview term: literal widening** — replacing a literal type (\`"dark"\`, \`1\`) with its general type (\`string\`, \`number\`) when the location is mutable. You can stop it with \`as const\`, which the second example shows gives \`readonly ["s", "m", "l"]\` instead of \`string[]\`. Widening has its own page: [What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it), and \`as const\` too: [What does as const do?](/interview-question/what-does-as-const-do)

## 5. Where Inference Stops

**Parameters are not inferred from call sites.** Some languages look at how a function is used to guess its parameter types; TypeScript does not. An unannotated parameter is \`any\`, and under \`strict\` (\`noImplicitAny\`) that is an error. From the second example, with the directive removed:

~~~text
main.ts(22,17): error TS7006: Parameter 'x' implicitly has an 'any' type.
~~~

The one exception is contextual typing: a callback or a function assigned to a typed variable gets its parameter types from that context.

**Empty arrays evolve.** \`const bag = []\` with no annotation starts as an "evolving" array: after \`bag.push(1)\` and \`bag.push("a")\` the checker treats it as \`(string | number)[]\` (proven in example 2). This works, but an explicit \`const bag: string[] = []\` states the intent and catches the wrong push.

**Annotations win.** \`let id: string | number = 42\` keeps the *declared* type \`string | number\`, so \`id = "abc"\` is allowed later. Right after each assignment, though, control flow analysis **narrows** the current type: the example proves \`typeof id\` is \`number\` after \`= 42\` and \`string\` after \`= "abc"\`.

📌 **Interview term: control flow analysis** — the checker follows assignments and conditions (\`if\`, \`typeof\`, \`===\`, early returns) through the code and narrows a variable to a more specific type at each point. It is the same machinery behind type guards; see [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)

## 6. When You Should Still Write Annotations

| Annotate | Why |
| :--- | :--- |
| Function parameters | They cannot be inferred (except from context) |
| Return types of exported or public functions | The signature becomes a contract; a wrong \`return\` deep inside then errors at the source, not at every caller |
| Empty collections | \`const ids: string[] = []\` instead of an evolving \`any[]\` |
| Object literals that must match a shape | \`const cfg: Config = {...}\` checks for typos and missing fields — or use \`satisfies Config\` to check without widening, see [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do) |
| Let inference do it | Local variables with initializers, callback parameters, return types of small private helpers |

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5): every \`Equal\` assertion compiles, so every inferred type in the tables above is what the compiler really infers, and every \`// @ts-expect-error\` line is a real error. Then they were run as the page runs them.

Example 1, where inference happens:

~~~text
true
[1,"two",null] {"x":1,"y":2,"tag":"origin"}
null 8080 ["ADA","LINUS"] true
string
~~~

Example 2, where inference stops or surprises you:

~~~text
key Enter
true true true true true
2 [1,"a"] 42 ["s","m","l"] abc
~~~

The last line of example 1 is a reminder that types are compile-time only: the rejected \`count = "one"\` still ran, and \`typeof count\` printed \`string\`. In example 2, \`double(21)\` printed \`42\` even though \`double\` has an implicit-\`any\` error — the error is about safety, not about whether JavaScript can run it.

## Common Pitfalls

- **Expecting a supertype from mixed arrays.** \`[dog, cat]\` is \`(Dog | Cat)[]\`. Annotate \`Animal[]\` if you need it.
- **Over-annotating locals.** \`const total: number = a + b\` adds nothing and drifts when code changes. Annotate boundaries, not every line.
- **Under-annotating public functions.** Without an explicit return type, a change inside the function silently changes the type every caller sees.
- **Surprised by widening.** \`let status = "idle"\` is \`string\`, so it cannot be passed where \`"idle" | "busy"\` is expected. Use \`const\`, an annotation or \`as const\`.
- **Leaving parameters bare.** Without \`strict\` they silently become \`any\`; with it you get \`TS7006\`. Either way, write the type.
- **Trusting \`any\`-typed sources.** Inference from \`JSON.parse(...)\` gives \`any\`, and \`any\` spreads into everything inferred from it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Type inference means the compiler works out types from the code itself, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let count = 0</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> without an annotation, and that type is then fixed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bottom-up:</strong> <span style="color:#f0e2c8;">Types come from initializers, array elements (the <strong style="color:#ffca28;">best common type</strong>, a union), object literals and every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> statement of a function.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Top-down:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Contextual typing</strong> gives unannotated callback parameters their type from where they are used, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">names.map((n) =&gt; ...)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Widening:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> keeps literal types, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> and object properties widen them to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> or an annotation keeps them narrow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Parameters are not inferred from call sites, so annotate them, plus public return types and empty arrays. Let inference handle the rest.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let x = "a"</code> a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code> but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const x = "a"</code> the type <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"a"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> binding can never be reassigned, so the literal is safe to keep. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> can later hold any string, so TypeScript widens it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What type does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[1, "a"]</code> get, and can you get a tuple instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(string | number)[]</code>, the best common type. For a tuple, annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[number, string]</code> or write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, "a"] as const</code>, which gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly [1, "a"]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TypeScript infer parameter types from how a function is called?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only contextual typing fills parameters in, for callbacks and functions assigned to a typed variable. Otherwise an unannotated parameter is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noImplicitAny</code> reports as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS7006</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you annotate return types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For exported and public functions, yes: the signature becomes a contract and mistakes surface inside the function. For small local helpers, inference is fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between the declared type and the narrowed type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The declared type is what the variable may ever hold, from its annotation or initializer. Control flow analysis narrows it at each point, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let id: string | number = 42</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> right after the assignment.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type inference | The compiler deducing a type from the code instead of an annotation |
| Contextual typing | Inferring a type from where an expression is used, such as a callback parameter |
| Best common type | The union type TypeScript infers for an array literal from its elements |
| Return type inference | A function return type computed as the union of its \`return\` expressions |
| Literal widening | Turning \`"dark"\` into \`string\` (or \`1\` into \`number\`) in mutable positions |
| Control flow analysis | Following assignments and checks to narrow a variable at each point in the code |

**Conclusion:** TypeScript infers types in two directions — up from values (initializers, array elements, return statements) and down from context (callback parameters, typed variables, generic calls) — and then holds you to them. It widens literals in mutable places, narrows as control flow proves more, and never guesses parameter types from call sites. The practical rule follows directly: annotate the boundaries (parameters, public return types, empty collections, shapes that must match) and let inference fill in everything inside.`,
    examples: [
      {
        label: `Where inference happens, proven by compile-time checks`,
        code: `// Each Equal check below is verified by the compiler: if the inferred
// type were different, the file would not compile.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. From an initializer.
let count = 0;
const mode = "dark";
let theme = "dark";
const ok1: Equal<typeof count, number> = true;
// const keeps the literal type; let widens it to string.
const ok2: Equal<typeof mode, "dark"> = true;
const ok3: Equal<typeof theme, string> = true;

// 2. Best common type: the union of the element types.
const mixed = [1, "two", null];
const ok4: Equal<typeof mixed, (string | number | null)[]> = true;

// 3. Object literals: each property is inferred and widened.
const point = { x: 1, y: 2, tag: "origin" };
const ok5: Equal<typeof point, { x: number; y: number; tag: string }> = true;

// 4. Return types are inferred from every return statement.
function parsePort(text: string) {
  if (text === "") return null;
  return Number(text);
}
const ok6: Equal<ReturnType<typeof parsePort>, number | null> = true;

// 5. Contextual typing: the callback parameter gets its type from map.
const names = ["ada", "linus"].map((n) => n.toUpperCase());
const ok7: Equal<typeof names, string[]> = true;

// 6. Generic type arguments are inferred from the call.
function firstOf<T>(items: T[]) {
  return items[0];
}
const flag = firstOf([true, false]);
const ok8: Equal<typeof flag, boolean> = true;

// 7. After inference, the type is fixed: this is not dynamic typing.
// @ts-expect-error Type 'string' is not assignable to type 'number'.
count = "one";

console.log(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8); // true
console.log(JSON.stringify(mixed), JSON.stringify(point));
console.log(parsePort(""), parsePort("8080"), JSON.stringify(names), flag);
console.log(typeof count); // string`,
      },
      {
        label: `Where inference stops or surprises you`,
        code: `// Where inference stops or surprises you.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

class Dog { bark() { return "woof"; } }
class Cat { meow() { return "meow"; } }

// Best common type does not invent a supertype: the result is (Dog | Cat)[].
const pets = [new Dog(), new Cat()];
const ok1: Equal<typeof pets, (Dog | Cat)[]> = true;

// An empty array with no annotation starts as an evolving any[].
// Each push widens it; this is control flow analysis, not a guess.
const bag = [];
bag.push(1);
bag.push("a");
const bagNow = bag;
const ok2: Equal<typeof bagNow, (string | number)[]> = true;

// Parameters are NOT inferred from how a function is called.
// Under strict (noImplicitAny) an unannotated parameter is an error.
// @ts-expect-error Parameter 'x' implicitly has an 'any' type.
function double(x) {
  return x * 2;
}

// Inference flows in from the context instead: here from the annotation.
type Handler = (event: { key: string }) => void;
const onKey: Handler = (event) => console.log("key", event.key);
onKey({ key: "Enter" });

// as const keeps the narrowest type: readonly tuple of literals.
const sizes = ["s", "m", "l"] as const;
const ok3: Equal<typeof sizes, readonly ["s", "m", "l"]> = true;

// An annotation sets the declared type; inference does not override it.
// Right after "= 42", control flow narrows the current type to number,
// but the declared type still accepts a string later.
let id: string | number = 42;
const ok4: Equal<typeof id, number> = true;
id = "abc";
const ok5: Equal<typeof id, string> = true;

console.log(ok1, ok2, ok3, ok4, ok5);
console.log(pets.length, JSON.stringify(bag), double(21), JSON.stringify(sizes), id);`,
      },
    ],
  },
  {
    title: `What is tsconfig.json and which options matter most?`,
    difficulty: "easy",
    seoDescription: `What tsconfig.json does and the options that matter: strict, target vs lib, module and moduleResolution, outDir, noEmit and skipLibCheck.`,
    description: `**Question presented to candidate:**
"What is \`tsconfig.json\` for, and if you were setting up a new project, which compiler options would you actually care about and why?"

**What a strong answer should cover:**
- \`tsconfig.json\` marks the project root and is read by both \`tsc\` and the editor; \`include\`, \`exclude\`, \`files\`, \`extends\`, \`references\`
- \`strict\` (always on) and extra checks such as \`noUncheckedIndexedAccess\`
- The environment options and how they differ: \`target\` changes emitted syntax, \`lib\` only changes which APIs the checker knows, \`module\` and \`moduleResolution\` describe imports
- Output options: \`outDir\`/\`rootDir\`, \`declaration\`, \`sourceMap\`, \`noEmit\` when a bundler builds the code, plus \`skipLibCheck\` for speed
- Defaults change across versions (\`tsc --init\` in 5.9, compiler defaults in 6.0), so set key options explicitly and inspect with \`tsc --showConfig\`

**Clarifying questions expected:**
- Is this an app built by a bundler, or code that \`tsc\` compiles for Node.js or a published library?
- Which runtime and JavaScript version must the output support?

**Code / implementation expected:** Optional — a short tsconfig for a stated kind of project, with each option justified.`,
    answer: `**Target Audience:** Beginners who have just run \`tsc --init\` and are staring at a wall of options.
**Difficulty:** Easy
**TypeScript version:** All compiler runs below used TypeScript 5.4.5; changes in later releases (5.9, 6.0) are cited from their release coverage and were not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every emitted file and compiler message shown came from a real \`tsc\` run; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Before a film shoot, the director hands the crew a one-page brief: which scenes we are shooting, which camera and lens, what format the footage is delivered in, how strict continuity checking will be. Nobody re-explains this every morning. \`tsconfig.json\` is that brief for the TypeScript compiler. It answers four questions once, for the whole project:

1. **Which files** belong to this project?
2. **How strictly** should they be checked?
3. **What environment** will the code run in (which JavaScript version, which built-in APIs)?
4. **What should be produced** — JavaScript, declaration files, nothing at all?

Your editor reads the same file, which is why the red squiggles in VS Code match what \`tsc\` reports in CI.

📌 **Interview term: tsconfig.json** — the project configuration file for the TypeScript compiler. Its presence marks the **project root**: running \`tsc\` (or \`tsc -p <dir>\`) finds it and compiles the project it describes. It is JSON with comments allowed (\`tsc --init\` writes comments into it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="tsconfig.json answers which files, how strict, which environment and what output">
  <rect class="d-box-accent" x="260" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">tsconfig.json</text>
  <rect class="d-box" x="10" y="170" width="160" height="90" rx="10"/>
  <text class="d-text" x="90" y="204" text-anchor="middle">which files</text>
  <text class="d-sub" x="90" y="230" text-anchor="middle">include, exclude</text>
  <rect class="d-box" x="190" y="170" width="160" height="90" rx="10"/>
  <text class="d-text" x="270" y="204" text-anchor="middle">how strict</text>
  <text class="d-sub" x="270" y="230" text-anchor="middle">strict, noUnchecked</text>
  <rect class="d-box" x="370" y="170" width="160" height="90" rx="10"/>
  <text class="d-text" x="450" y="204" text-anchor="middle">environment</text>
  <text class="d-sub" x="450" y="230" text-anchor="middle">target, lib, module</text>
  <rect class="d-box" x="550" y="170" width="160" height="90" rx="10"/>
  <text class="d-text" x="630" y="204" text-anchor="middle">output</text>
  <text class="d-sub" x="630" y="230" text-anchor="middle">outDir, noEmit</text>
  <path class="d-edge" d="M 300 84 L 100 166"/>
  <path class="d-edge" d="M 340 84 L 275 166"/>
  <path class="d-edge" d="M 380 84 L 445 166"/>
  <path class="d-edge" d="M 420 84 L 620 166"/>
</svg>

The rest of this page goes through those four groups and the handful of options in each that actually matter in interviews and in real projects.

## 2. The Shape of the File

~~~json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
~~~

| Top-level key | What it does |
| :--- | :--- |
| \`compilerOptions\` | Every compiler setting; almost everything lives here |
| \`include\` / \`exclude\` | Glob patterns for the project files. With neither \`files\` nor \`include\`, the default is \`["**/*"]\` |
| \`files\` | An explicit list of files, for tiny projects |
| \`extends\` | Inherit another config (a shared base, or a published preset package) and override parts |
| \`references\` | Link sub-projects for **project references** and \`tsc --build\` |

Two behaviours confirmed with 5.4.5 that surprise people:

- \`exclude\` only filters what \`include\` picks up; \`outDir\` is excluded automatically. \`tsc --showConfig\` on the project above printed \`"exclude": ["dist"]\` although the file never mentions it.
- Passing a file on the command line **ignores tsconfig.json entirely**. \`tsc src/index.ts\` in that project emitted \`src/index.js\` as CommonJS beginning with \`"use strict";\` and \`Object.defineProperty(exports, "__esModule", ...)\` — not the ES2022 module output into \`dist\` that the config asks for. Use \`tsc -p .\` (or plain \`tsc\`).

## 3. Group 1 — How Strict: Type-Checking Options

| Option | What it does |
| :--- | :--- |
| \`strict\` | The umbrella switch for the strict family (\`strictNullChecks\`, \`noImplicitAny\` and more). Always on for new code. Full breakdown: [What does the 'strict' flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable) |
| \`noUncheckedIndexedAccess\` | \`arr[i]\` and \`record[key]\` include \`undefined\` in their type |
| \`exactOptionalPropertyTypes\` | \`prop?: string\` no longer accepts an explicit \`undefined\` |
| \`noImplicitOverride\`, \`noFallthroughCasesInSwitch\`, \`noImplicitReturns\` | Smaller safety nets worth enabling |

The two "beyond strict" flags are covered in [How do \`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\` and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

## 4. Group 2 — Environment: \`target\`, \`lib\`, \`module\`

These three are the most misunderstood, because they sound alike.

📌 **Interview term: target** — the JavaScript version \`tsc\` **emits**. Newer syntax is rewritten (downlevelled) for older targets. The same three-line function compiled two ways with 5.4.5:

~~~ts
type User = { name?: string };
export function label(user: User | undefined): string {
  return user?.name ?? "anon";
}
~~~

\`"target": "ES2022"\`, \`"module": "ESNext"\`:

~~~js
export function label(user) {
    return user?.name ?? "anon";
}
~~~

\`--target ES2016 --module CommonJS\`:

~~~js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.label = void 0;
function label(user) {
    var _a;
    return (_a = user === null || user === void 0 ? void 0 : user.name) !== null && _a !== void 0 ? _a : "anon";
}
exports.label = label;
~~~

Optional chaining and \`??\` were rewritten into the long form, and the \`export\` became CommonJS — because of \`module\`, not \`target\`.

📌 **Interview term: lib** — the set of built-in **type declarations** the checker loads: which globals and methods it believes exist (\`Array.prototype.at\`, \`Promise\`, \`document\`...). By default it follows \`target\`; set it explicitly to add \`DOM\` or a newer ES year. \`lib\` changes **only types, never the output**. The example below the answer shows it: with \`lib\` ES2022, \`nums.toSorted()\` is rejected —

~~~text
main.ts(11,21): error TS2339: Property 'toSorted' does not exist on type 'number[]'.
~~~

— yet the call still works at run time because the engine has it. The same file passes with \`--lib ES2023,DOM\` (\`tsc\` exit code 0). \`tsc --listFilesOnly\` on the ES2022 + DOM project lists the declaration files this pulls in, from \`lib.es5.d.ts\` through \`lib.es2022.full.d.ts\` plus \`lib.dom.d.ts\`.

📌 **Interview term: module / moduleResolution** — \`module\` decides the module format of the emitted code (\`ESNext\`, \`CommonJS\`, \`NodeNext\`...); \`moduleResolution\` decides how an \`import "x"\` is **found** on disk (\`Bundler\` for Vite/webpack-style projects, \`NodeNext\` for code Node.js runs directly). Choosing between them is its own question: [When should you use \`moduleResolution: "bundler"\` versus \`"nodenext"\`?](/interview-question/when-should-you-use-moduleresolution-bundler-versus-nodenext)

Related module options: \`esModuleInterop\` (default-import CommonJS packages), \`verbatimModuleSyntax\` (keep imports exactly as written, see [What does \`verbatimModuleSyntax\` enforce and why did it replace \`importsNotUsedAsValues\`?](/interview-question/what-does-verbatimmodulesyntax-enforce-and-why-did-it-replace-importsnotusedasva)), \`isolatedModules\` (forbid code a single-file transpiler cannot handle), \`resolveJsonModule\`, \`paths\` (import aliases), \`jsx\` and \`types\` (which \`@types\` packages are loaded globally).

## 5. Group 3 — Output: What Gets Produced

| Option | What it does |
| :--- | :--- |
| \`outDir\` / \`rootDir\` | Where JavaScript goes, and which source folder maps onto it |
| \`noEmit\` | Type-check only. Standard when Vite, esbuild, SWC or Next.js produce the JavaScript |
| \`declaration\` (+ \`declarationMap\`) | Emit \`.d.ts\` files — needed when you publish a library (see [What are declaration files (.d.ts)?](/interview-question/what-are-declaration-files-d-ts)) |
| \`sourceMap\` | Map emitted JavaScript back to TypeScript in debuggers and stack traces |
| \`noEmitOnError\` | Do not write any JavaScript if there are type errors (by default \`tsc\` reports errors **and still emits**) |

And one performance option almost every project sets: \`skipLibCheck: true\`, which skips type-checking all \`.d.ts\` files (yours and those in \`node_modules\`). Faster builds, at the cost of not noticing conflicts between library declaration files.

## 6. Defaults Have Changed Between Versions

What \`tsc --init\` writes depends on the version, so do not memorise one output.

- **5.4.5** (run here): the generated file is mostly comments; the uncommented options are exactly \`"target": "es2016"\`, \`"module": "commonjs"\`, \`"esModuleInterop": true\`, \`"forceConsistentCasingInFileNames": true\`, \`"strict": true\` and \`"skipLibCheck": true\`.
- **5.9**: \`tsc --init\` writes a much shorter file with \`"module": "nodenext"\`, \`"target": "esnext"\`, \`"types": []\`, declaration and source maps on, and \`noUncheckedIndexedAccess\` on ([TypeScript 5.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)).
- **6.0** (March 2026): several **compiler defaults** changed — reports list \`strict\` on by default, \`module\` defaulting to \`esnext\`, \`types\` defaulting to \`[]\`, and deprecations such as \`target: es5\`, \`moduleResolution: node\`/\`node10\` and \`baseUrl\` ([Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx), [The New Stack](https://thenewstack.io/typescript-6-0-rc-arrives-as-a-bridge-to-a-faster-future/)). I could not open the official 6.0 notes from here, so check them before relying on a specific default.

The practical lesson: **set the important options explicitly** (\`strict\`, \`target\`, \`module\`, \`moduleResolution\`, \`lib\`, \`types\`) instead of relying on whatever default your compiler version has. Then a compiler upgrade cannot silently change your project.

📌 **Interview term: tsc --showConfig** — prints the final, resolved configuration after \`extends\` and defaults are applied. On the project above, 5.4.5 expanded \`"strict": true\` into its eight member flags and added implied options such as \`"resolveJsonModule": true\` for \`moduleResolution: bundler\`. It is the first thing to run when "my setting is not taking effect".

## 7. Two Sensible Starting Points

A web app built by a bundler (Vite, Next.js) — TypeScript only checks:

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
~~~

A Node.js service or library compiled by \`tsc\`:

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
~~~

(These are recommendations, not compiler output. Both were compiled with \`tsc\` 5.4.5 against a one-file \`src\` folder and passed — the second with \`"types": []\` because \`@types/node\` was not installed in the scratch folder. Check \`jsx\` and \`lib\` against your framework's own template.)

## 8. Verified: Running the Code

The example below the answer was type-checked with the same settings the page uses (\`strict\`, target ES2022, lib ES2022 + DOM) — the \`// @ts-expect-error\` on \`toSorted\` proves the \`lib\` error is real — and then run:

~~~text
2
true
[1,2,3]
[3,1,2]
[1,9,10]
~~~

So \`at\` and \`Object.hasOwn\` were allowed by the ES2022 \`lib\`, \`toSorted\` was rejected by the checker yet ran fine, and the feature-detecting \`sortedCopy\` works whichever \`lib\` you have. (It also shows a run-time trap unrelated to config: without a comparator, \`toSorted\` and \`sort\` compare as strings, so a first draft of \`sortedCopy\` returned \`[1,10,9]\`.)

The emitted JavaScript, \`--showConfig\` and \`--init\` results quoted in sections 2, 4 and 6 come from separate \`tsc\` 5.4.5 runs on a scratch project with the tsconfig shown in section 2.

## Common Pitfalls

- **Confusing \`target\` with \`lib\`.** \`target\` changes the emitted syntax; \`lib\` only changes which APIs the checker knows. Neither adds polyfills.
- **Running \`tsc file.ts\` and wondering why options are ignored.** File arguments bypass \`tsconfig.json\`; use \`tsc -p .\`.
- **Relying on defaults.** They changed in 5.9 (\`--init\`) and 6.0 (compiler defaults). Write the key options down.
- **Assuming \`skipLibCheck\` checks nothing.** It only skips \`.d.ts\` files; your \`.ts\` files are still checked.
- **Mixing \`module\` and \`moduleResolution\` that disagree**, for example \`NodeNext\` with \`Bundler\`. Pick the pair that matches how the code is actually run.
- **Expecting \`paths\` to work at run time.** It only tells the checker where aliases point; the bundler or runtime needs the same alias configured.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsconfig.json</code> marks a TypeScript project root and tells <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> and the editor which files to compile and how; running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc -p .</code> uses it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Strictness:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict: true</code> is non-negotiable for new code; I usually add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code> on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Environment:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> is the emitted JavaScript version, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code> is which built-in APIs the checker believes exist, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moduleResolution</code> describe how imports are emitted and found.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Output:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outDir</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rootDir</code> for compiled code, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declaration</code> for libraries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sourceMap</code> for debugging, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noEmit</code> when a bundler builds the JavaScript.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">skipLibCheck</code> for speed, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> for shared bases, and set the key options explicitly because defaults changed in 5.9 and 6.0; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --showConfig</code> shows the resolved result.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">target</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lib</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> controls the syntax <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> emits, so newer syntax is downlevelled. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code> controls which type declarations are loaded, so it only affects type checking. Neither adds polyfills for missing APIs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">noEmit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When another tool such as Vite, esbuild, SWC or Next.js turns TypeScript into JavaScript. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --noEmit</code> then only type-checks, usually in CI or a pre-commit step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">skipLibCheck</code> skip, and is it safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It skips type-checking every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file. It is widely used for speed; the risk is not noticing conflicting or broken library declarations, but your own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> code is still fully checked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">I ran <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tsc index.ts</code> and my tsconfig settings were ignored. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Passing files on the command line makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> ignore <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsconfig.json</code> and use defaults. Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc -p .</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share settings across packages in a monorepo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put common options in a base file and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> it from each package, overriding only what differs; add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">references</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">composite</code> for project references with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --build</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| tsconfig.json | The project configuration file that marks a TypeScript project root |
| target | The JavaScript version the compiler emits |
| lib | Which built-in type declarations the checker loads; affects types only |
| module / moduleResolution | The emitted module format, and how imports are located |
| tsc --showConfig | Prints the fully resolved configuration after defaults and \`extends\` |

**Conclusion:** \`tsconfig.json\` is the one-page brief for the compiler: which files, how strict, what environment, what output. The options that matter most are \`strict\` (always on), the environment trio \`target\` / \`lib\` / \`module\` + \`moduleResolution\` (know that \`target\` changes output while \`lib\` changes only types), and the output switches \`outDir\`, \`declaration\`, \`sourceMap\` and \`noEmit\`, plus \`skipLibCheck\` for speed. Because defaults have shifted across 5.9 and 6.0, a good config states those options explicitly, and \`tsc --showConfig\` is how you confirm what the compiler really sees.`,
    examples: [
      {
        label: `lib only changes types: an ES2023 method under lib ES2022`,
        code: `// "lib" decides which built-in APIs the checker believes exist.
// The verifier and the page check this file with lib ES2022 + DOM.
const nums = [3, 1, 2];

// Array.prototype.at and Object.hasOwn are in lib es2022: allowed.
console.log(nums.at(-1)); // 2
console.log(Object.hasOwn({ a: 1 }, "a")); // true

// toSorted arrived in ES2023, so with lib ES2022 the checker rejects it...
// @ts-expect-error Property 'toSorted' does not exist on type 'number[]'.
const sorted = nums.toSorted();

// ...but lib is only a description. The engine running this code has it,
// so the call still works at run time. Types and runtime are separate.
console.log(JSON.stringify(sorted)); // [1,2,3]
console.log(JSON.stringify(nums)); // [3,1,2]

// Note: like sort, toSorted compares as strings unless you pass a comparator.
// The usual fix is a polyfill or a newer lib ("lib": ["ES2023", "DOM"]).
// A safe pattern when you cannot change lib: feature-detect and fall back.
type WithToSorted = { toSorted?: (compare?: (a: number, b: number) => number) => number[] };
function sortedCopy(values: number[]): number[] {
  const fn = (values as unknown as WithToSorted).toSorted;
  const byNumber = (a: number, b: number) => a - b;
  return fn ? fn.call(values, byNumber) : [...values].sort(byNumber);
}
console.log(JSON.stringify(sortedCopy([10, 9, 1]))); // [1,9,10]`,
      },
    ],
  },
  {
    title: `What does the 'strict' flag in tsconfig enable?`,
    difficulty: "medium",
    seoDescription: `strict turns on the strict family: noImplicitAny, strictNullChecks, strictFunctionTypes and five more, with the bug each one catches.`,
    description: `**Question presented to candidate:**
"Most projects set \`strict: true\` in tsconfig. What does that one flag actually turn on, and what kinds of bugs does each part catch?"

**What a strong answer should cover:**
- \`strict\` is an umbrella for the strict family; each member can be overridden individually
- The members in 5.4: \`noImplicitAny\`, \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`, plus \`strictBuiltinIteratorReturn\` added in 5.6
- Why \`strictNullChecks\` and \`noImplicitAny\` matter most, with a concrete crash each one prevents
- Details: method-syntax parameters stay bivariant, \`strictPropertyInitialization\` needs \`strictNullChecks\`, catch variables become \`unknown\`
- What is not included (\`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\`) and how to roll strict out on an existing codebase

**Code / implementation expected:** Optional — one or two snippets that compile without \`strict\` and fail with it.`,
    answer: `**Target Audience:** Developers who have \`"strict": true\` in their config and want to know exactly what it switched on.
**Difficulty:** Medium
**TypeScript version:** The flag list and every error below come from TypeScript 5.4.5 (its option table and real \`tsc\` runs); the 5.6 and 6.0 changes are cited from release coverage and were not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A building inspector can be booked for a "basic" visit or a "full" one. The basic visit checks that walls are standing. The full visit also checks that every socket is earthed, every exit is marked, every fire door closes. Same building, same price of bricks — but only the full visit catches the wiring fault that starts a fire two years later.

TypeScript without \`strict\` is the basic visit. The two biggest holes it leaves are exactly the bugs JavaScript developers hit most: \`undefined\` sneaking in where a value was expected, and values that are silently typed \`any\`. \`"strict": true\` books the full inspection with one line.

📌 **Interview term: strict mode family** — \`strict\` is not a check by itself. It is an **umbrella** that turns on a group of separate flags, each of which can still be switched off individually. New flags are added to the family over time, so upgrading TypeScript can bring new strict errors.

## 2. Exactly Which Flags It Turns On

The compiler's own option table in 5.4.5 marks eight options as members of the strict family, and \`tsc --showConfig\` on a project with only \`"strict": true\` expands to the same eight:

~~~text
        "noImplicitAny": true,
        "noImplicitThis": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "alwaysStrict": true,
        "useUnknownInCatchVariables": true
~~~

TypeScript 5.6 added a ninth, \`strictBuiltinIteratorReturn\`, which types the return value of built-in iterators as \`undefined\` instead of \`any\` ([TypeScript PR #58243](https://github.com/microsoft/TypeScript/pull/58243), [5.6 beta announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6-beta/)). It is not in 5.4.5, so it was not run here.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 400" role="img" aria-label="The strict flag is an umbrella over nine flags, eight present in TypeScript 5.4 and one added in 5.6">
  <rect class="d-box-accent" x="260" y="16" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">strict: true</text>
  <rect class="d-box" x="20" y="120" width="210" height="56" rx="10"/>
  <text class="d-text" x="125" y="153" text-anchor="middle">noImplicitAny</text>
  <rect class="d-box" x="255" y="120" width="210" height="56" rx="10"/>
  <text class="d-text" x="360" y="153" text-anchor="middle">strictNullChecks</text>
  <rect class="d-box" x="490" y="120" width="210" height="56" rx="10"/>
  <text class="d-text" x="595" y="153" text-anchor="middle">strictFunctionTypes</text>
  <rect class="d-box" x="20" y="210" width="210" height="56" rx="10"/>
  <text class="d-text" x="125" y="243" text-anchor="middle">strictBindCallApply</text>
  <rect class="d-box" x="255" y="210" width="210" height="56" rx="10"/>
  <text class="d-text" x="360" y="236" text-anchor="middle">strictProperty</text>
  <text class="d-sub" x="360" y="256" text-anchor="middle">Initialization</text>
  <rect class="d-box" x="490" y="210" width="210" height="56" rx="10"/>
  <text class="d-text" x="595" y="243" text-anchor="middle">noImplicitThis</text>
  <rect class="d-box" x="20" y="300" width="210" height="56" rx="10"/>
  <text class="d-text" x="125" y="333" text-anchor="middle">alwaysStrict</text>
  <rect class="d-box" x="255" y="300" width="210" height="56" rx="10"/>
  <text class="d-text" x="360" y="326" text-anchor="middle">useUnknownIn</text>
  <text class="d-sub" x="360" y="346" text-anchor="middle">CatchVariables</text>
  <rect class="d-box-muted" x="490" y="300" width="210" height="56" rx="10"/>
  <text class="d-text" x="595" y="326" text-anchor="middle">strictBuiltin</text>
  <text class="d-sub" x="595" y="346" text-anchor="middle">IteratorReturn, 5.6</text>
  <path class="d-edge" d="M 300 76 L 140 116"/>
  <path class="d-edge" d="M 360 76 L 360 116"/>
  <path class="d-edge" d="M 420 76 L 580 116"/>
</svg>

The highlighted box is the umbrella; the muted one is the flag added after 5.4.

| Flag | What it catches | Error you get (5.4.5) |
| :--- | :--- | :--- |
| \`noImplicitAny\` | A parameter or variable whose type would silently be \`any\` | \`TS7006: Parameter 's' implicitly has an 'any' type.\` |
| \`strictNullChecks\` | \`null\` / \`undefined\` used where a value is required | \`TS18048: 'found' is possibly 'undefined'.\` |
| \`strictFunctionTypes\` | Passing a function that accepts *less* than the expected type | \`TS2322: Type '(value: string) => string' is not assignable to type 'Handler'.\` |
| \`strictBindCallApply\` | Wrong arguments to \`.call\`, \`.apply\`, \`.bind\` | \`TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.\` |
| \`strictPropertyInitialization\` | Class fields never assigned in the constructor | \`TS2564: Property 'owner' has no initializer and is not definitely assigned in the constructor.\` |
| \`noImplicitThis\` | \`this\` with no known type | \`TS2683: 'this' implicitly has type 'any' because it does not have a type annotation.\` |
| \`useUnknownInCatchVariables\` | Using \`catch (e)\` as if \`e\` were always an \`Error\` | \`TS18046: 'e' is of type 'unknown'.\` |
| \`alwaysStrict\` | Emits \`"use strict"\` and parses files in JavaScript strict mode | (no type error; changes output) |

## 3. The Two That Matter Most

### \`strictNullChecks\`

📌 **Interview term: strictNullChecks** — makes \`null\` and \`undefined\` their own types instead of values that fit into every type. Without it, \`users.find(...)\` is typed plain \`string\` and \`found.length\` compiles; with it, the type is \`string | undefined\` and you must handle the missing case. The run shows what that error prevents:

~~~text
strictNullChecks would have caught: TypeError: Cannot read properties of undefined (reading 'length')
~~~

That message text is from V8 (Chrome and Node.js); other engines word it differently. The fixes strict pushes you towards are \`found?.length ?? 0\` or an \`if (found !== undefined)\` check. Details: [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

### \`noImplicitAny\`

📌 **Interview term: implicit any** — a type TypeScript falls back to when it cannot infer one and you did not write one, most often an unannotated parameter. An implicit \`any\` disables checking silently; \`noImplicitAny\` turns it into an error, so \`any\` only appears where someone typed it on purpose. Without the flag, \`shout(42)\` compiles and the run ends in \`TypeError: s.toUpperCase is not a function\`.

## 4. The Rest of the Family

**\`strictFunctionTypes\`** — a function that handles only \`string\` is not a safe stand-in for one that must handle \`string | number\`; calling it with \`42\` crashes (\`value.toUpperCase is not a function\` in the run). The flag checks function-typed parameters **contravariantly**.

📌 **Interview term: contravariant parameter check** — a function type \`(x: A) => R\` is assignable to \`(x: B) => R\` only if \`B\` is assignable to \`A\`: the replacement must accept *at least* what the original accepts. Background: [What are covariance and contravariance?](/interview-question/what-are-covariance-and-contravariance)

One deliberate exception, checked with 5.4.5: parameters of **method-syntax** members stay bivariant. Assigning the same string-only function to \`{ handle(value: string | number): string }\` compiled without error, while \`{ handle: (value: string | number) => string }\` (property syntax) was rejected. That exception keeps common patterns such as \`Array<T>\` methods usable, and is a good reason to prefer property syntax for callbacks you want checked strictly.

**\`strictBindCallApply\`** — \`add.call(undefined, 1, "2")\` is checked against \`add(a: number, b: number)\`. Without it the call is unchecked and the run returns the string \`"12"\`.

**\`strictPropertyInitialization\`** — every declared class field must be assigned in the field initializer or the constructor; the run shows \`typeof acct.owner\` is \`undefined\` when it is not. Escape hatches: an initializer, \`owner?: string\`, or the \`owner!: string\` definite assignment assertion ([What is the definite assignment assertion (!)?](/interview-question/what-is-the-definite-assignment-assertion)). It **needs \`strictNullChecks\`**: in 5.4.5 with \`"strict": true, "strictNullChecks": false\` the \`TS2564\` error disappears.

**\`noImplicitThis\`** — a plain \`function\` inside an object method has its own \`this\`, which is not the object. The run shows why it is dangerous: the page runs code in sloppy mode, where a plain call gets the global object (\`typeof this\` printed \`object\`), while inside \`"use strict"\` the same call gets \`undefined\`. Fix with an arrow function or a \`this:\` parameter.

**\`alwaysStrict\`** — parses every file in JavaScript strict mode and emits \`"use strict"\` at the top of non-module output. That is exactly the difference the \`noImplicitThis\` run shows.

**\`useUnknownInCatchVariables\`** (added in TypeScript 4.4, per the [4.4 announcement](https://devblogs.microsoft.com/typescript/?p=2999)) — JavaScript can \`throw\` anything. The run throws a string, so \`e.message\` is \`undefined\`. With the flag, \`e\` is \`unknown\` and you narrow with \`e instanceof Error\` first.

## 5. Strict Is Not "Maximum Strictness"

Several useful flags are **not** in the family and must be enabled on their own: \`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\`, \`noImplicitReturns\`, \`noImplicitOverride\`, \`noFallthroughCasesInSwitch\`, \`noPropertyAccessFromIndexSignature\`. The first two are covered in [How do \`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\` and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har); the wider config picture is in [What is tsconfig.json and which options matter most?](/interview-question/what-is-tsconfig-json-and-which-options-matter-most)

**Version notes.** \`--strict\` itself arrived in TypeScript 2.3 ([Marius Schulz](https://mariusschulz.com/blog/the-strict-compiler-option-in-typescript)). In TypeScript 6.0 (March 2026), \`strict\` reportedly became **on by default**, so older projects that relied on the lenient default need an explicit \`"strict": false\` ([Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx), [The New Stack](https://thenewstack.io/typescript-6-0-rc-arrives-as-a-bridge-to-a-faster-future/)). I could not open the official 6.0 notes from here; set \`strict\` explicitly either way.

## 6. Turning It On in an Existing Codebase

1. Set \`"strict": true\` and, temporarily, turn the noisiest members back off (\`"strictNullChecks": false\`, \`"noImplicitAny": false\`) — an individual flag always overrides the umbrella.
2. Re-enable one flag at a time, fixing errors per directory. \`noImplicitAny\` first is usually cheapest; \`strictNullChecks\` finds the most real bugs.
3. Avoid fixing errors with \`as any\` or \`!\` everywhere; that hides the bug instead of handling it.
4. For large codebases, community tools add per-file opt-in (I did not test any here); the migration story is in [How do you migrate a JavaScript codebase to TypeScript?](/interview-question/how-do-you-migrate-a-javascript-codebase-to-typescript)

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5). Every \`// @ts-expect-error\` line is a real error, and with the directives removed tsc printed the messages in the table above. Then each was run as the page runs it.

Example 1, \`noImplicitAny\`, \`strictNullChecks\` and \`useUnknownInCatchVariables\`:

~~~text
noImplicitAny would have caught: TypeError: s.toUpperCase is not a function
strictNullChecks would have caught: TypeError: Cannot read properties of undefined (reading 'length')
0
true
message is undefined
thrown value: a plain string
~~~

Example 2, function, \`this\` and class checks:

~~~text
strictFunctionTypes: TypeError: value.toUpperCase is not a function
strictBindCallApply: 12 string
noImplicitThis, sloppy mode: object
noImplicitThis, strict mode: undefined
strictPropertyInitialization: undefined 10
~~~

To prove those errors are caused by \`strict\`, the same two files (directives removed) were compiled again with \`"strict": false\`: **both compiled with exit code 0 and no errors at all**. Then with \`"strict": true, "strictNullChecks": false\`, example 1 gave only:

~~~text
main.ts(8,16): error TS7006: Parameter 's' implicitly has an 'any' type.
main.ts(43,31): error TS2339: Property 'message' does not exist on type 'unknown'.
~~~

The two \`strictNullChecks\` errors vanished, and the catch-variable error changed wording but stayed — that flag is independent. In example 2, the same override removed the \`strictPropertyInitialization\` error while the function and \`this\` errors stayed.

## Common Pitfalls

- **Thinking \`strict\` is one check.** It is a family; you can override members individually, and new members arrive with upgrades (5.6 added one).
- **Thinking \`strict\` is everything.** \`noUncheckedIndexedAccess\` and \`exactOptionalPropertyTypes\` are separate and catch real bugs.
- **Silencing errors with \`!\` and \`as any\`.** The error was pointing at a real gap; handle the \`undefined\` case or validate the data.
- **Disabling \`strictNullChecks\` and keeping \`strictPropertyInitialization\`.** The second does nothing without the first.
- **Typing callbacks with method syntax.** \`{ onChange(v: T): void }\` is checked bivariantly even under \`strictFunctionTypes\`; use \`onChange: (v: T) => void\`.
- **Assuming \`catch (e)\` gives an \`Error\`.** Anything can be thrown. Narrow with \`instanceof Error\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> is an <strong style="color:#ffca28;">umbrella flag</strong>: it enables the strict family, and each member can still be turned off on its own.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The members:</strong> <span style="color:#f0e2c8;">In 5.4 that is eight flags: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noImplicitAny</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictFunctionTypes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictBindCallApply</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictPropertyInitialization</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noImplicitThis</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">alwaysStrict</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useUnknownInCatchVariables</code>; 5.6 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictBuiltinIteratorReturn</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The big two:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> separate types, so possibly-missing values must be handled; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noImplicitAny</code> stops untyped parameters from silently becoming <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rest:</strong> <span style="color:#f0e2c8;">Contravariant checks for function parameters, typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">apply</code>, class fields that must be initialised, a typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> catch variables and emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"use strict"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;">Always on for new code. To migrate, enable it and switch noisy members off, then re-enable them one at a time. It is not maximum strictness: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code> too.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you enable <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strict</code> but disable one of its checks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. An explicit member flag overrides the umbrella, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"strict": true, "strictNullChecks": false</code> keeps everything else. That is the usual migration path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strictPropertyInitialization</code> sometimes do nothing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code>. Without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> fits every type, so an unassigned field is not an error; in 5.4.5 the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2564</code> error disappears when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code> is off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strictFunctionTypes</code> not cover?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Method-syntax members such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ handle(v: string | number): string }</code> are still checked bivariantly. Only function-typed properties and standalone function types get the contravariant check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">catch (e)</code> typed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> under strict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript can throw any value, not just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Error</code> objects. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useUnknownInCatchVariables</code> (since 4.4) makes you narrow, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e instanceof Error ? e.message : String(e)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does upgrading TypeScript change what <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strict</code> does?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can. New flags join the family, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictBuiltinIteratorReturn</code> did in 5.6, and 6.0 reportedly made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> the default. Read the release notes and expect new errors after upgrades.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Strict mode family | The group of type-checking flags that \`strict: true\` turns on together |
| strictNullChecks | Makes \`null\` and \`undefined\` separate types that must be handled explicitly |
| Implicit any | An \`any\` the compiler falls back to when no type is written or inferable |
| Contravariant parameter check | A replacement function must accept at least everything the expected function accepts |

**Conclusion:** \`"strict": true\` is an umbrella over the strict family — eight flags in TypeScript 5.4, nine since 5.6 — and the two that justify it are \`strictNullChecks\` (no more surprise \`undefined\`) and \`noImplicitAny\` (no more silent \`any\`). The rest tighten function assignability, \`call\`/\`bind\`/\`apply\`, class initialisation, \`this\`, catch variables and emitted strict mode. Know that members can be overridden individually, that some depend on others, that the family grows across versions, and that a few valuable checks such as \`noUncheckedIndexedAccess\` sit outside it — then you can explain both what strict does and how to roll it out on a real codebase.`,
    examples: [
      {
        label: `noImplicitAny, strictNullChecks and unknown catch variables`,
        code: `// strictNullChecks and noImplicitAny: the two flags that prevent the most crashes.
// Each @ts-expect-error line is an error ONLY because strict is on.
// The try/catch blocks show what plain JavaScript does with the same code.

// --- noImplicitAny -------------------------------------------------------
// Without it, s is silently "any" and the bad call below compiles.
// @ts-expect-error Parameter 's' implicitly has an 'any' type.
function shout(s) {
  return s.toUpperCase() + "!";
}
try {
  shout(42);
} catch (err) {
  console.log("noImplicitAny would have caught:", String(err));
}

// --- strictNullChecks ----------------------------------------------------
// find returns string | undefined. Without the flag, undefined is
// assignable to everything and the type would be just string.
const users = ["ada", "linus"];
const found = users.find((u) => u === "grace");
try {
  // @ts-expect-error 'found' is possibly 'undefined'.
  console.log(found.length);
} catch (err) {
  console.log("strictNullChecks would have caught:", String(err));
}

// The fix strict pushes you towards: handle the missing case.
console.log(found?.length ?? 0); // 0
if (found !== undefined) console.log(found.length);

// @ts-expect-error Type 'null' is not assignable to type 'string'.
const nickname: string = null;
console.log(nickname === null); // true

// --- useUnknownInCatchVariables -----------------------------------------
// JavaScript can throw anything, not only Error objects.
try {
  throw "a plain string";
} catch (e) {
  // @ts-expect-error 'e' is of type 'unknown'.
  console.log("message is", e.message);
  // Narrow first, then use it.
  console.log(e instanceof Error ? e.message : "thrown value: " + String(e));
}`,
      },
      {
        label: `Function, bind/call/apply, this and class checks`,
        code: `// The other strict-family flags: functions, this, classes.

// --- strictFunctionTypes -------------------------------------------------
// A handler that accepts only strings is not a safe "string or number" handler.
type Handler = (value: string | number) => string;
const onlyStrings = (value: string) => value.toUpperCase();
// @ts-expect-error Type '(value: string) => string' is not assignable to type 'Handler'.
const handler: Handler = onlyStrings;
try {
  handler(42);
} catch (err) {
  console.log("strictFunctionTypes:", String(err));
}

// --- strictBindCallApply -------------------------------------------------
function add(a: number, b: number): number {
  return a + b;
}
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'.
const joined = add.call(undefined, 1, "2");
console.log("strictBindCallApply:", joined, typeof joined);

// --- noImplicitThis and alwaysStrict ------------------------------------
const counter = {
  count: 0,
  makeReader() {
    return function () {
      // @ts-expect-error 'this' implicitly has type 'any' because it does not have a type annotation.
      return typeof this;
    };
  },
};
// The page transpiles without "use strict", so a plain call gets the global
// object as this. alwaysStrict makes tsc emit "use strict", where it is undefined.
console.log("noImplicitThis, sloppy mode:", counter.makeReader()());
const strictReader = function (this: unknown) {
  "use strict";
  return typeof this;
};
console.log("noImplicitThis, strict mode:", strictReader());

// --- strictPropertyInitialization ---------------------------------------
class Account {
  // @ts-expect-error Property 'owner' has no initializer and is not definitely assigned in the constructor.
  owner: string;
  balance: number;
  constructor(balance: number) {
    this.balance = balance;
  }
}
const acct = new Account(10);
console.log("strictPropertyInitialization:", typeof acct.owner, acct.balance);`,
      },
    ],
  },
];

export default augments;
