/**
 * TYPESCRIPT ULTRA — batch 14: Declarations (declare, .d.ts files, declaration merging,
 * module augmentation, Stage 3 vs legacy decorators). Every example was run by
 * the TypeScript 5.5+ lib additions, migrating JavaScript to TypeScript). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What does the declare keyword do?`,
    difficulty: "medium",
    seoDescription: `TypeScript declare keyword: ambient declarations with no emitted JavaScript, declare global, build-time constants and declare class fields vs !.`,
    description: `**Question presented to candidate:**
"You see \`declare const __APP_VERSION__: string;\` at the top of a file, and \`declare name: string;\` inside a class. What does the \`declare\` keyword do in each case, what does it compile to, and what can go wrong?"

**What a strong answer should cover:**
- \`declare\` makes an ambient declaration: it tells the checker a value, function, class, enum or namespace exists at run time, and emits no JavaScript for it
- Typical uses: build-time constants (bundler "define" replacements), globals from a script tag, \`declare global\` / \`declare module\` blocks, and the contents of \`.d.ts\` files
- Ambient declarations cannot have initializers or bodies (TS1039, TS1183), and the compiler cannot check that the thing really exists: a wrong declaration is a run-time \`ReferenceError\`
- \`declare\` on a class field (TypeScript 3.7+) is type-only: no field is emitted, so with \`useDefineForClassFields\` (the default at target ES2022+) it does not wipe a value set by the base class, unlike \`name!: string\` (TS2612)
- The common class use: narrowing an inherited property type (\`declare resident: Dog\`) without changing run-time behaviour

**Code / implementation expected:** Optional — a \`declare const\` for a build constant and a \`declare\` class field, with what they emit.`,
    answer: `**Target Audience:** Developers who have seen \`declare\` in a codebase or a \`.d.ts\` file and want to know exactly what it does and does not do.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

\`declare\` is the building block of two bigger topics with their own pages: [declaration files (.d.ts)](/interview-question/what-are-declaration-files-d-ts) are made of ambient declarations, and [module augmentation](/interview-question/what-is-module-augmentation) uses \`declare module\` and \`declare global\`. This page is about the keyword itself.

## 1. Why This Even Matters — A Story First

You are writing a play. Halfway through, a character says "as the butler told us...". The butler never appears on stage, but the audience accepts he exists because the programme lists him in the cast.

\`declare\` is that cast list. It tells TypeScript "a thing with this name and this type exists; someone else brings it on stage". TypeScript believes you, lets your code use the name, and **writes nothing** for it into the JavaScript. If the butler never actually exists (no script tag, no build step defines him), the audience finds out at run time, not at compile time.

## 2. The Core Idea: A Type Without a Value

Normally a TypeScript line does two jobs: it gives a name a type **and** produces JavaScript. \`const port = 8080\` declares the type \`number\` and emits \`const port = 8080\`.

\`declare\` keeps only the first job.

~~~ts
declare const __APP_VERSION__: string;        // replaced by the bundler at build time
declare function trackEvent(name: string): void; // defined by a <script> tag
declare class Widget { constructor(id: string); render(): string }
declare enum LegacyCodes { Ok, Fail }
declare namespace Analytics { const sessionId: string }
declare global { var featureFlags: Record<string, boolean> }
~~~

📌 **Interview term: ambient declaration** — a declaration that describes something that exists at run time but is implemented elsewhere. It is written with \`declare\` (or appears inside a \`.d.ts\` file, where everything is ambient) and produces no JavaScript.

📌 **Interview term: ambient context** — the region where only ambient declarations are allowed: a \`declare\` statement, a \`declare module\` / \`declare global\` / \`declare namespace\` block, or a whole \`.d.ts\` file.

This is the \`ts.transpile\` output (target ES2022) for a file using \`declare\`:

~~~ts
declare const __APP_VERSION__: string;
declare function trackEvent(name: string): void;
declare global { var featureFlags: Record<string, boolean>; }
class Base { name: string = "base"; }
class Declared extends Base { declare name: string; }
class Redeclared extends Base { name!: string; }
trackEvent(__APP_VERSION__);
~~~

~~~text
class Base {
    name = "base";
}
class Declared extends Base {
}
class Redeclared extends Base {
    name;
}
trackEvent(__APP_VERSION__);
~~~

Every \`declare\` line vanished, and so did the \`declare name\` field. Only the *uses* of the declared names remain. (The \`name!\` line still emits \`name;\`, which matters in section 5. \`name!\` makes the checker error here, which is why the playground line in example 2 carries a \`// @ts-expect-error\`.)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="A normal const produces a type and JavaScript, a declare const produces only a type">
  <rect class="d-box" x="30" y="30" width="230" height="64" rx="10"/>
  <text class="d-text" x="145" y="58" text-anchor="middle">const port = 8080</text>
  <text class="d-sub" x="145" y="80" text-anchor="middle">normal declaration</text>
  <rect class="d-box-accent" x="30" y="156" width="230" height="64" rx="10"/>
  <text class="d-text" x="145" y="184" text-anchor="middle">declare const port</text>
  <text class="d-sub" x="145" y="206" text-anchor="middle">ambient declaration</text>
  <rect class="d-box" x="460" y="30" width="230" height="64" rx="10"/>
  <text class="d-text" x="575" y="58" text-anchor="middle">type for the checker</text>
  <text class="d-sub" x="575" y="80" text-anchor="middle">port is number</text>
  <rect class="d-box-muted" x="460" y="156" width="230" height="64" rx="10"/>
  <text class="d-text" x="575" y="184" text-anchor="middle">JavaScript output</text>
  <text class="d-sub" x="575" y="206" text-anchor="middle">const port = 8080</text>
  <line class="d-edge" x1="260" y1="62" x2="458" y2="62"/>
  <line class="d-edge" x1="260" y1="70" x2="458" y2="180"/>
  <line class="d-edge-accent" x1="260" y1="182" x2="458" y2="76"/>
</svg>

The normal declaration feeds both boxes on the right; the \`declare\` line feeds only the type, so nothing about it reaches the JavaScript.

## 3. The Rules of an Ambient Context

Because nothing is emitted, an ambient declaration may not contain anything that would need to run:

~~~ts
declare const port: number = 8080;  // no values
declare function f(): void { }      // no bodies
~~~

~~~text
main.ts(5,29): error TS1039: Initializers are not allowed in ambient contexts.
main.ts(6,29): error TS1183: An implementation cannot be declared in ambient contexts.
~~~

Two more rules you meet in practice:

- **The checker cannot verify the claim.** \`declare const __APP_VERSION__: string\` compiles whether or not anything defines it. If nothing does, reading it at run time is a \`ReferenceError\` (example 1 shows it). \`typeof __APP_VERSION__\` is the one safe probe: it gives \`"undefined"\` instead of throwing.
- **Scope follows the file.** In a module (a file with an \`import\` or \`export\`, or every file under \`moduleDetection: "force"\`), a top-level \`declare const X\` is a *module-scoped* name. To add a name to the global scope from a module, write it inside \`declare global { ... }\`.

📌 **Interview term: \`declare global\`** — a block, allowed only inside a module, whose declarations are added to the global scope (for example a \`var\` on \`globalThis\` or a member of \`interface Window\`). It is a kind of global augmentation; see [module augmentation](/interview-question/what-is-module-augmentation).

## 4. Where You See \`declare\` in Real Code

| Form | Typical use |
| :--- | :--- |
| \`declare const NAME: T\` | A constant a bundler substitutes at build time, or a global from a script tag |
| \`declare function f(...): R\` | A function provided by a script tag or a host environment |
| \`declare class C { ... }\` | A class implemented in plain JavaScript |
| \`declare namespace NS { ... }\` | A global object full of members (old-style libraries like \`$\` or \`google.maps\`) |
| \`declare enum E { ... }\` | An enum whose JavaScript object exists elsewhere (rare; \`declare const enum\` is inlined, so it needs no object) |
| \`declare module "x" { ... }\` | Typing a module (an untyped package, or \`*.svg\` imports) or augmenting one |
| \`declare global { ... }\` | Adding to the global scope from inside a module |
| \`declare field: T\` in a class | A type-only class field (section 5) |

Most of these normally live in a \`.d.ts\` file, where the \`declare\` is implied for some forms and written for others. That is covered on [What are declaration files (.d.ts)?](/interview-question/what-are-declaration-files-d-ts)

## 5. \`declare\` on Class Fields

TypeScript 3.7 added \`declare\` as a property modifier, together with the \`useDefineForClassFields\` flag ([TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html), section "The useDefineForClassFields Flag and The declare Property Modifier").

The reason: standard JavaScript class fields are *defined* on the instance after the base constructor has run. TypeScript follows that standard when \`useDefineForClassFields\` is on, and it is on by default when the target is ES2022 or higher ([TSConfig reference: useDefineForClassFields](https://www.typescriptlang.org/tsconfig/useDefineForClassFields.html)). So re-declaring a field in a subclass resets it:

~~~ts
class Base {
  name: string;
  constructor() { this.name = "set by Base"; }
}
class Redeclared extends Base { name!: string; }   // emits "name;" -> undefined
class Declared extends Base { declare name: string; } // emits nothing
~~~

TypeScript catches the first one:

~~~text
main.ts(13,3): error TS2612: Property 'name' will overwrite the base property in 'Base'. If this is intentional, add an initializer. Otherwise, add a 'declare' modifier or remove the redundant declaration.
~~~

At run time (example 2) \`new Redeclared().name\` is \`undefined\` and \`new Declared().name\` is \`"set by Base"\`.

📌 **Interview term: \`declare\` field** — a class property marked \`declare\`: it exists only in the type, no field definition is emitted, so it can never overwrite a value. It cannot have an initializer.

The everyday use is **narrowing an inherited property**: a \`Kennel extends Pen\` whose \`resident\` is always a \`Dog\` writes \`declare resident: Dog;\`. Code inside and outside the class then sees \`Dog\` without casts, and the JavaScript is unchanged. (The definite assignment assertion \`!\` solves a different problem; see [What is the definite assignment assertion (!)?](/interview-question/what-is-the-definite-assignment-assertion))

## 6. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line really rejected, and were run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(21,30): error TS1039: Initializers are not allowed in ambient contexts.
~~~

and for example 2:

~~~text
main.ts(13,3): error TS2612: Property 'name' will overwrite the base property in 'Base'. If this is intentional, add an initializer. Otherwise, add a 'declare' modifier or remove the redundant declaration.
~~~

Example 1, ambient declarations, prints:

~~~text
types ok: true true
undefined
true ReferenceError
["page_view","signup"] true
~~~

\`typeof\` gives \`undefined\` and reading \`.length\` throws a \`ReferenceError\`, because nothing defined \`__APP_VERSION__\`. Once the code plays the role of the script tag and puts \`trackEvent\` and \`featureFlags\` on \`globalThis\`, the declared names work.

Example 2, \`declare\` on class fields, prints:

~~~text
undefined
set by Base
ball resident
~~~

\`Object.keys(k)\` lists only \`resident\`: the \`declare resident: Dog\` added no field of its own.

## Common Pitfalls

- **Treating \`declare\` as a definition.** It defines nothing; if no script, bundler or host provides the value, you get a \`ReferenceError\` at run time with no compile error.
- **A build constant the bundler is not told about.** \`declare const __APP_VERSION__\` must match the bundler "define" config exactly; a typo on either side is invisible to tsc.
- **Writing a global from a module without \`declare global\`.** In a module, top-level \`declare var X\` is module-scoped; other files will not see it.
- **Using \`name!: string\` to re-type an inherited field.** Under ES2022 field semantics it re-initialises the field to \`undefined\` (TS2612). Use \`declare name: string\`.
- **Reaching for \`declare\` to silence an error.** \`declare const user: User\` in application code is just a cast in disguise; only declare things that genuinely exist elsewhere.
- **Expecting \`declare enum\` to be inlined.** tsc compiled \`declare enum E1 { A = 1 }\` + \`E1.A\` to a plain \`E1.A\` (the object must exist at run time), and only inlined the \`declare const enum\` member, as \`2 /* E2.B */\`. A single-file transpiler cannot do even that: \`ts.transpile\` left \`E2.B\` untouched.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare</code> creates an ambient declaration: it tells the checker that a value, function, class, enum or namespace exists at run time, and emits no JavaScript for it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Uses:</strong> <span style="color:#f0e2c8;">Build-time constants like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare const __APP_VERSION__: string</code>, globals from a script tag, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global</code> blocks, and everything inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">No initializers and no bodies (TS1039, TS1183), and the compiler trusts it blindly: if nothing provides the value, it is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError</code> at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Class fields:</strong> <span style="color:#f0e2c8;">Since 3.7, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare name: string</code> in a class is a type-only field. With ES2022 field semantics a plain re-declaration would reset the value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, which TS2612 warns about.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">Declare only what really exists elsewhere, keep it next to the thing that provides it, and never use it to dodge a type error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare const x: number</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let x: number</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let x: number</code> creates a variable in the JavaScript (it starts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare const x: number</code> creates nothing; it only tells the checker that some other code already created <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare global</code> exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a module, top-level declarations are module-scoped. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global { ... }</code> is how a module adds names to the global scope, such as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code> or a member on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interface Window</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare</code> on a class property?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To narrow an inherited property type, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare resident: Dog</code> in a subclass, or to type a property that something else (a decorator, a framework) sets. It emits no field, so it never overwrites the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check that a declared global really exists at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof NAME !== "undefined"</code> works without throwing. Reading the name directly throws a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError</code> if it was never defined.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare</code> work inside a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare const z: number</code> inside a function body is error TS1184, "Modifiers cannot appear here." Ambient declarations go at the top level of a file or inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare namespace</code> block.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Ambient declaration | A \`declare\` declaration: a type for something implemented elsewhere, no JavaScript emitted |
| Ambient context | Where only ambient declarations are allowed: \`declare\` blocks and \`.d.ts\` files |
| \`declare global\` | A block in a module that adds declarations to the global scope |
| \`declare\` field | A type-only class property: no field definition is emitted |

**Conclusion:** \`declare\` splits a declaration in half: it keeps the type and throws away the JavaScript. That is exactly what you need to describe things your code did not create, such as build-time constants, script-tag globals and plain JavaScript libraries, and it is what every \`.d.ts\` file is made of. The price is trust: TypeScript cannot check the claim, so a wrong or missing declaration becomes a run-time \`ReferenceError\`. On class fields the same idea gives you a type-only property that never resets an inherited value, which is the clean way to narrow a field in a subclass.`,
    examples: [
      {
        label: `Ambient declarations: types without emitted code`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Ambient declarations: "this exists at run time, trust me". No JavaScript is emitted for them.
declare const __APP_VERSION__: string; // normally replaced by the bundler (a "define" option)
declare function trackEvent(name: string, data?: Record<string, unknown>): void; // from a script tag
declare class Widget {
  constructor(id: string);
  render(): string;
}
declare global {
  var featureFlags: Record<string, boolean>;
}

// The compiler type-checks uses against the declarations...
const versionIsString: Equal<typeof __APP_VERSION__, string> = true;
const renderReturns: Equal<ReturnType<Widget["render"]>, string> = true;
console.log("types ok:", versionIsString, renderReturns);

// ...but a declaration cannot carry a value or a body.
// @ts-expect-error TS1039: Initializers are not allowed in ambient contexts.
declare const port: number = 8080;

// 2. Nothing provided __APP_VERSION__ here, so the program fails at run time.
console.log(typeof __APP_VERSION__);
try {
  console.log(__APP_VERSION__.length);
} catch (e) {
  console.log(e instanceof ReferenceError, (e as Error).name);
}

// 3. When something else really provides the value, the declared name just works.
//    (Here we play the role of the script tag that defines trackEvent and the flags.)
const host = globalThis as unknown as Record<string, unknown>;
const events: string[] = [];
host.trackEvent = (name: string) => events.push(name);
host.featureFlags = { newCheckout: true };

trackEvent("page_view");
trackEvent("signup", { plan: "pro" });
console.log(JSON.stringify(events), featureFlags.newCheckout);`,
      },
      {
        label: `declare on class fields vs re-declaring with !`,
        code: `// declare on a class field: "this property exists (with this type), but emit no field for it".
class Base {
  name: string;
  constructor() {
    this.name = "set by Base";
  }
}

// With target ES2022, useDefineForClassFields is on: a re-declared field is
// emitted as "name;" and re-initialised to undefined after Base ran.
class Redeclared extends Base {
  // @ts-expect-error TS2612: Property 'name' will overwrite the base property in 'Base'...
  name!: string;
}

// declare: type-only, no field is emitted, so the value from Base survives.
class Declared extends Base {
  declare name: string;
}

console.log(String(new Redeclared().name));
console.log(new Declared().name);

// The common real use: narrow an inherited property type without touching run time.
interface Animal { sound: string }
interface Dog extends Animal { fetch(): string }

class Pen {
  resident: Animal;
  constructor(resident: Animal) {
    this.resident = resident;
  }
}
class Kennel extends Pen {
  declare resident: Dog;
  constructor(dog: Dog) {
    super(dog);
  }
}

const k = new Kennel({ sound: "woof", fetch: () => "ball" });
// resident is typed Dog here, so fetch() is allowed without a cast.
console.log(k.resident.fetch(), Object.keys(k).join(","));`,
      },
    ],
  },
  {
    title: `What are declaration files (.d.ts)?`,
    difficulty: "medium",
    seoDescription: `TypeScript .d.ts declaration files: what tsc --declaration emits, @types and DefinitelyTyped, TS7016, script vs module files and skipLibCheck.`,
    description: `**Question presented to candidate:**
"What is a \`.d.ts\` file? Where do they come from, how does TypeScript find the types for a package you install, and what happens when a declaration file is wrong?"

**What a strong answer should cover:**
- A \`.d.ts\` file contains only types (ambient declarations): it describes JavaScript that exists elsewhere and produces no output of its own
- Where they come from: generated by \`tsc --declaration\` from your own \`.ts\`, shipped by a package (\`"types"\` in \`package.json\`), published to \`@types/*\` from DefinitelyTyped, or written by hand (globals, \`declare module "*.svg"\`)
- What happens with none: under \`strict\` (\`noImplicitAny\`), importing an untyped JavaScript package is error TS7016
- Declarations are trusted, not checked against the JavaScript: a wrong \`.d.ts\` compiles and crashes at run time
- \`skipLibCheck\` skips type-checking \`.d.ts\` files: faster builds, but a broken declaration then silently degrades to \`any\`
- Script vs module \`.d.ts\`: a file with top-level \`import\`/\`export\` is a module; global declarations and wildcard \`declare module\` patterns belong in a script file (or \`declare global\`)

**Code / implementation expected:** Optional — the \`.d.ts\` that \`tsc --declaration\` emits for a small module, or a hand-written declaration for an untyped package.`,
    answer: `**Target Audience:** Developers who install packages, see "Could not find a declaration file", or need to publish a library with types.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022). The multi-file projects in sections 3 to 6 were compiled separately with the same compiler, since the page runs a single file.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

A \`.d.ts\` file is made of ambient declarations, the subject of [What does the declare keyword do?](/interview-question/what-does-the-declare-keyword-do) Adding to a package's types from the outside is [module augmentation](/interview-question/what-is-module-augmentation).

## 1. Why This Even Matters — A Story First

You buy a flat-pack wardrobe. The box contains the panels (the actual thing) and a sheet listing every part with its size: "panel A, 180 cm; four hinges; 24 screws". You can plan your bedroom from the sheet alone, without touching a single panel.

JavaScript packages are the panels. A \`.d.ts\` file is the parts sheet: names, shapes and types, no code. TypeScript reads only the sheet when it checks your program. If the sheet says "180 cm" and the panel is really 170, nobody finds out until you try to fit it.

## 2. The Core Idea: Types Without Code

A declaration file has the extension \`.d.ts\` and contains only declarations: interfaces, type aliases, and \`declare\`d functions, classes, constants and modules. It produces no JavaScript; TypeScript reads it for types only.

📌 **Interview term: declaration file** — a \`.d.ts\` file containing only type information (ambient declarations) for JavaScript implemented elsewhere. Everything in it is in an ambient context, so bodies and initializers are not allowed.

📌 **Interview term: type surface** (also "public API types") — the part of a module other code can see: its exported names and their types. A \`.d.ts\` is exactly the type surface of a \`.js\` file.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="tsc splits a TypeScript file into a JavaScript file that runs and a declaration file that other code type-checks against">
  <rect class="d-box-accent" x="30" y="98" width="200" height="64" rx="10"/>
  <text class="d-text" x="130" y="126" text-anchor="middle">money.ts</text>
  <text class="d-sub" x="130" y="148" text-anchor="middle">types and code</text>
  <rect class="d-box" x="470" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="580" y="58" text-anchor="middle">money.js</text>
  <text class="d-sub" x="580" y="80" text-anchor="middle">runs in Node or a browser</text>
  <rect class="d-box" x="470" y="166" width="220" height="64" rx="10"/>
  <text class="d-text" x="580" y="194" text-anchor="middle">money.d.ts</text>
  <text class="d-sub" x="580" y="216" text-anchor="middle">read by the type checker</text>
  <line class="d-edge" x1="230" y1="118" x2="468" y2="62"/>
  <line class="d-edge-accent" x1="230" y1="142" x2="468" y2="198"/>
  <text class="d-sub" x="320" y="58" text-anchor="middle">bodies</text>
  <text class="d-sub" x="320" y="222" text-anchor="middle">types only</text>
</svg>

The compiler splits one source file into two outputs: the bodies go to \`.js\`, the types go to \`.d.ts\`. Consumers of a published library only ever see the pair.

## 3. Where Declaration Files Come From

**1. Generated from your own TypeScript.** \`tsc\` with \`"declaration": true\` writes a \`.d.ts\` next to each \`.js\` (\`"emitDeclarationOnly": true\` writes only the \`.d.ts\`, when a bundler produces the JavaScript). For this source:

~~~ts
export type Currency = "USD" | "EUR";
export interface Money { amount: number; currency: Currency }
/** Adds two amounts of the same currency. */
export function add(a: Money, b: Money): Money { /* ... */ }
export const ZERO_USD = { amount: 0, currency: "USD" } as const;
export class Wallet {
  private items: Money[] = [];
  constructor(public owner: string) {}
  total(currency: Currency) { /* ... */ }
}
~~~

TypeScript 5.4.5 emitted this \`money.d.ts\`:

~~~ts
export type Currency = "USD" | "EUR";
export interface Money {
    amount: number;
    currency: Currency;
}
/** Adds two amounts of the same currency. */
export declare function add(a: Money, b: Money): Money;
export declare const ZERO_USD: {
    readonly amount: 0;
    readonly currency: "USD";
};
export declare class Wallet {
    owner: string;
    private items;
    constructor(owner: string);
    total(currency: Currency): number;
}
~~~

Things to notice: every body is gone and functions became \`export declare function\`; the **inferred** return type of \`total\` was written out as \`number\`; the JSDoc comment was kept (editors show it on hover); and \`private items\` kept its name but lost its type, so consumers know the property exists without seeing its type. Example 2 checks these same types with compile-time \`Equal\` assertions.

**2. Shipped inside the package.** A package that ships its own types points to them from \`package.json\` with \`"types"\` (the handbook notes \`"typings"\` is a synonym), or simply places \`index.d.ts\` beside \`index.js\` ([Handbook: Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)).

**3. From DefinitelyTyped.** For packages that do not ship types, the community writes them in the DefinitelyTyped repository, and they are published automatically to npm under the \`@types\` scope with the same name as the package: \`npm i -D @types/lodash\` for \`lodash\` (same source). TypeScript looks in \`node_modules/@types\` when resolving an import.

📌 **Interview term: DefinitelyTyped / \`@types\`** — the community repository of declaration files for JavaScript packages, published to npm as \`@types/<package-name>\`.

**4. Written by hand.** For globals, for build-tool features, or for a package that has no types anywhere. That is section 5.

## 4. When There Are No Types: TS7016

I made a tiny untyped package, \`node_modules/untyped-lib/index.js\` (\`exports.shout = (s) => s.toUpperCase() + "!"\`), and imported it under \`strict\`:

~~~ts
import { shout } from "untyped-lib";
~~~

~~~text
src/app.ts(1,23): error TS7016: Could not find a declaration file for module 'untyped-lib'. '<project>/node_modules/untyped-lib/index.js' implicitly has an 'any' type.
  Try \`npm i --save-dev @types/untyped-lib\` if it exists or add a new declaration (.d.ts) file containing \`declare module 'untyped-lib';\`
~~~

(The absolute project path is shortened to \`<project>\`.) The error comes from \`noImplicitAny\`, part of \`strict\`: without types, the import would silently be \`any\`. Adding \`node_modules/@types/untyped-lib/index.d.ts\` with

~~~ts
/** Upper-cases a string and adds "!". */
export declare function shout(s: string): string;
~~~

made the project compile, and \`const b: number = shout("hi")\` then failed with \`error TS2322: Type 'string' is not assignable to type 'number'.\` The quick-fix the message suggests, a bare \`declare module 'untyped-lib';\`, also silences it, but types everything from that module as \`any\`.

## 5. Writing Your Own: Script vs Module Files

A \`.d.ts\` file follows the same rule as any TypeScript file: if it has a top-level \`import\` or \`export\`, it is a **module** and its declarations are local to it; otherwise it is a **script** and its declarations are global.

📌 **Interview term: global (script) declaration file** — a \`.d.ts\` with no top-level \`import\`/\`export\`; its declarations, including \`declare module "..."\` blocks, apply to the whole program.

The usual hand-written file for an app is a script, here \`types/assets.d.ts\`:

~~~ts
declare module "*.svg" {
  const url: string;
  export default url;
}
declare const __APP_VERSION__: string;
~~~

With it (included through \`"include": ["src", "types"]\`), \`import logo from "./logo.svg"\` gives \`logo: string\` and \`__APP_VERSION__\` is a known global; the project compiled with exit code 0.

📌 **Interview term: wildcard module declaration** — \`declare module "*.svg" { ... }\`: types every import whose specifier matches the pattern. Bundlers really handle those imports; this only tells TypeScript what they return.

Put the same wildcard block into a *module* file and it means something else: in a module, \`declare module "..."\` is an augmentation of an existing module, so 5.4.5 rejects the pattern with \`error TS2664: Invalid module name in augmentation, module '*.svg' cannot be found.\` (I checked it in a single-file module.) The difference is explained on [What is module augmentation?](/interview-question/what-is-module-augmentation)

## 6. Declarations Are Trusted, and \`skipLibCheck\`

TypeScript never compares a \`.d.ts\` with the JavaScript it describes. Example 1 makes the point in one file: the "library" returns a string, its declaration says \`number\`, and \`parsePrice("$12.50") + 1\` type-checks as number addition but produces the string \`"12.501"\` at run time. A declared-but-missing function type-checks and throws a \`ReferenceError\`.

📌 **Interview term: \`skipLibCheck\`** — a compiler option that skips type-checking of all \`.d.ts\` files. Your code is still checked *against* them; errors *inside* them are not reported.

It is widely enabled because it makes builds faster and avoids errors in third-party types you cannot fix. The cost, shown with a deliberately broken \`@types\` file (\`shout(s: string): Strng;\`):

~~~text
node_modules/@types/untyped-lib/index.d.ts(2,43): error TS2552: Cannot find name 'Strng'. Did you mean 'String'?
~~~

That error appears with \`skipLibCheck: false\`. With \`--skipLibCheck\` the same project compiled with exit code 0, **including** a line \`const n: number = shout("x")\`: the unresolvable return type silently became \`any\`. Keep \`skipLibCheck\` off in a library you publish (or check its emitted \`.d.ts\` in CI), so your own declarations are verified.

## 7. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) and were run as the page runs them. Example 1, a wrong declaration, prints:

~~~text
string 12.501
ReferenceError
13.5
~~~

\`typeof price\` is \`string\` although the declared type is \`number\`, \`total\` is the concatenation \`12.501\`, and calling the declared-but-missing \`formatPrice\` throws a \`ReferenceError\`. With the type corrected (\`(text: string) => string\`), the conversion becomes explicit and the result is \`13.5\`.

Example 2, the type surface a \`.d.ts\` keeps, prints:

~~~text
true true true
Ada 12 3
Error: currency mismatch
~~~

The three \`true\` values are compile-time checks that match the emitted \`money.d.ts\` in section 3: \`ZERO_USD\` is the readonly literal object, \`total\` returns \`number\`, and the public keys of \`Wallet\` are \`owner | put | total\` (\`items\` is private). The other lines are the JavaScript half doing the work.

## 8. Comparison: Where Types Can Come From

| Source | Who writes it | How TypeScript finds it | Watch out for |
| :--- | :--- | :--- | :--- |
| Your own \`.ts\` | the compiler (\`declaration: true\`) | \`"types"\` in your published \`package.json\` | inferred types leak into your API |
| Bundled in the package | the package author | \`"types"\` / \`"typings"\`, or \`index.d.ts\` next to \`index.js\` | can lag behind the JS in hand-written cases |
| \`@types/<name>\` | DefinitelyTyped contributors | \`node_modules/@types\` | versions can drift from the library version |
| Your own \`.d.ts\` | you | \`include\` / \`files\` in tsconfig | it is only as correct as you make it |

## Common Pitfalls

- **Silencing TS7016 with a bare \`declare module "x";\`.** It works, but every import from that package becomes \`any\`; write at least the functions you use.
- **Adding an \`import\` to a global \`.d.ts\`.** The file turns into a module and its globals and wildcard modules stop applying. Use \`import("pkg").Type\` in type positions, or wrap globals in \`declare global\`.
- **Trusting \`@types\` versions blindly.** \`@types/foo\` is maintained separately from \`foo\`; match the major versions and check the changelog when types and behaviour disagree.
- **Relying on \`skipLibCheck\` in a library.** Broken emitted declarations slip through and degrade to \`any\` for your users.
- **Forgetting \`declaration: true\` when publishing.** Consumers of a TypeScript-built package get TS7016 if only \`.js\` files are published.
- **Putting implementation in a \`.d.ts\`.** Bodies and initializers are errors there (TS1183, TS1039); a \`.d.ts\` is never compiled to JavaScript.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file holds only type information, ambient declarations, for JavaScript implemented elsewhere. TypeScript reads it for checking and never turns it into JavaScript.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Sources:</strong> <span style="color:#f0e2c8;">Generated by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --declaration</code> from your own code, shipped in a package via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code>, published to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@types/*</code> from DefinitelyTyped, or written by hand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. No types:</strong> <span style="color:#f0e2c8;">Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>, importing an untyped package is TS7016. The fixes are an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@types</code> package, real hand-written declarations, or as a last resort <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "x";</code>, which makes it all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Trust:</strong> <span style="color:#f0e2c8;">Declarations are not checked against the JavaScript, so a wrong <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> compiles and fails at run time. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">skipLibCheck</code> also stops checking the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> files themselves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Script vs module:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> without top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export</code> is global: that is where wildcard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "*.svg"</code> and global constants go. With an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code>, it becomes a module and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module</code> becomes an augmentation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">skipLibCheck</code> actually skip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Type-checking inside every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file. Your code is still checked against those declarations, but errors inside them are not reported, and an unresolvable type in them silently becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tsc</code> write into a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.d.ts</code> for a function without a return type annotation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The inferred type, written out explicitly, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total(currency: Currency): number;</code>. That is why inferred types can accidentally become part of your public API.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare module "*.svg"</code> stop working after you add an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import</code> to the file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> turns the file into a module, and inside a module <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "..."</code> means augmenting an existing module. A wildcard is not a module that exists, so 5.4.5 reports TS2664.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do private class members appear in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.d.ts</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private items;</code> with no type: consumers learn the name exists (which matters for assignability between classes) but not its type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your package is written in TypeScript. What do you publish?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiled <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.js</code>, the generated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> files (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declaration: true</code>), and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> entry in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code> pointing at the entry declaration file.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Declaration file | A \`.d.ts\` file with only type information for JavaScript implemented elsewhere |
| Type surface | The exported names and types of a module, which is what a \`.d.ts\` contains |
| DefinitelyTyped / \`@types\` | Community declaration files, published to npm as \`@types/<package>\` |
| Global (script) declaration file | A \`.d.ts\` without top-level \`import\`/\`export\`; its declarations are global |
| Wildcard module declaration | \`declare module "*.svg"\`: types every matching import |
| \`skipLibCheck\` | Skip type-checking inside \`.d.ts\` files |

**Conclusion:** A declaration file is the parts sheet for JavaScript: names and types with every body removed. TypeScript checks your code against it and never against the JavaScript itself, which is what makes typed packages, \`@types\`, build-tool imports and global constants possible, and also what makes a wrong declaration so dangerous. Generate them with \`declaration: true\` for your own code, prefer bundled or \`@types\` declarations for others, write your own as a script file for globals and asset imports, and remember that \`skipLibCheck\` trades safety in those files for speed.`,
    examples: [
      {
        label: `A declaration is trusted, not checked`,
        code: `// A .d.ts is a promise about JavaScript that TypeScript cannot see. It is trusted, not checked.
// This page runs one file, so the "library" and its "declaration file" live side by side.

// --- what the untyped JavaScript library really does (imagine node_modules/price-utils/index.js)
const untyped = globalThis as unknown as Record<string, unknown>;
untyped.parsePrice = (text: string) => text.replace("$", "").trim(); // returns a STRING

// --- what its declaration says (imagine node_modules/@types/price-utils/index.d.ts)
declare global {
  /** Parses "$12.50" into a number. */
  function parsePrice(text: string): number; // wrong: the JS returns a string
  function formatPrice(n: number): string; // declared, but the JS never defines it
}

// The compiler believes the declaration completely:
const price = parsePrice("$12.50");
const total = price + 1; // number + number, says the checker
console.log(typeof price, total);

// No error at compile time, a crash at run time:
try {
  formatPrice(3);
} catch (e) {
  console.log((e as Error).name);
}

// A correct declaration makes the same code safe: fix the type and the bug shows up in the editor.
type Correct = (text: string) => string;
const parsePriceFixed = untyped.parsePrice as Correct;
const fixedTotal = Number(parsePriceFixed("$12.50")) + 1;
console.log(fixedTotal);`,
      },
      {
        label: `The type surface a .d.ts keeps`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Source file money.ts. "tsc --declaration" turns it into money.d.ts (shown in the answer).
type Currency = "USD" | "EUR";
interface Money {
  amount: number;
  currency: Currency;
}
function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error("currency mismatch");
  return { amount: a.amount + b.amount, currency: a.currency };
}
const ZERO_USD = { amount: 0, currency: "USD" } as const;
class Wallet {
  private items: Money[] = [];
  constructor(public owner: string) {}
  put(m: Money) {
    this.items.push(m);
  }
  total(currency: Currency) {
    return this.items.filter((m) => m.currency === currency).reduce((s, m) => s + m.amount, 0);
  }
}

// The .d.ts keeps the type surface: these are the types written into it.
const zeroType: Equal<typeof ZERO_USD, { readonly amount: 0; readonly currency: "USD" }> = true;
const totalType: Equal<ReturnType<Wallet["total"]>, number> = true; // inferred, then written out
const publicKeys: Equal<keyof Wallet, "owner" | "put" | "total"> = true; // "private items;" has no type
console.log(zeroType, totalType, publicKeys);

// ...and drops every body: the JavaScript is what actually runs.
const w = new Wallet("Ada");
w.put(add({ amount: 5, currency: "USD" }, { amount: 7, currency: "USD" }));
w.put({ amount: 3, currency: "EUR" });
console.log(w.owner, w.total("USD"), w.total("EUR"));
try {
  add(ZERO_USD, { amount: 1, currency: "EUR" });
} catch (e) {
  console.log(e);
}`,
      },
    ],
  },
  {
    title: `What is declaration merging?`,
    difficulty: "medium",
    seoDescription: `TypeScript declaration merging: interface members, overload order, namespaces with functions, classes and enums, and what never merges.`,
    description: `**Question presented to candidate:**
"TypeScript lets you write \`interface User\` twice and ends up with one type. What is declaration merging, which kinds of declarations can merge with which, and when is it useful or dangerous?"

**What a strong answer should cover:**
- Declaration merging: the compiler combines several declarations with the same name (in the same scope) into one definition
- Interface + interface: members are combined; a non-function member declared twice must have the identical type (TS2717); methods become overloads, with later declarations' signatures first and single-string-literal signatures bubbled to the top
- Namespace merges with a function, class or enum (static members, nested types, helpers), and must come after the function or class (TS2434); enums merge with enums
- What does not merge: \`type\` aliases (TS2300 Duplicate identifier) and classes with classes
- Class + interface merging is unsafe: the interface adds members the class never implements, with no error; \`implements\` is the checked alternative
- Real uses: extending global or library interfaces (\`Window\`, a library's options interface), which is the basis of module augmentation

**Code / implementation expected:** Optional — two interface declarations merging, and a function or class merged with a namespace.`,
    answer: `**Target Audience:** Developers who have seen the same interface name declared twice, or \`namespace\` blocks next to a function, and want the rules.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page covers the merging rules. Using them to extend a library from your own code is [module augmentation](/interview-question/what-is-module-augmentation), and merging is one of the deciding differences in [interface vs type](/interview-question/what-is-the-difference-between-interface-and-type).

## 1. Why This Even Matters — A Story First

A school keeps one folder per student. The maths teacher adds a sheet with grades; the nurse adds a sheet with allergies; the coach adds a sheet with team positions. Nobody rewrites the folder, and at the end of the year there is still **one** folder for each student, containing everything.

Declaration merging is that folder. Several pieces of code can each say "the \`User\` interface also has this", and TypeScript keeps a single \`User\` that contains all of it. It is how libraries let you add your own fields to their types, and also how a careless duplicate name quietly changes a type.

## 2. The Core Idea

📌 **Interview term: declaration merging** — when two or more declarations with the same name in the same scope are combined by the compiler into a single definition that has the features of all of them.

To know what can merge, you need one fact: a TypeScript declaration creates a **value**, a **type**, a **namespace**, or a combination.

| Declaration | Creates a value | Creates a type | Creates a namespace |
| :--- | :---: | :---: | :---: |
| \`interface\` | | ✓ | |
| \`type\` alias | | ✓ | |
| \`class\` | ✓ | ✓ | |
| \`enum\` | ✓ | ✓ | |
| \`function\` | ✓ | | |
| \`namespace\` with values | ✓ | | ✓ |

📌 **Interview term: declaration space** — the three kinds of meaning (value, type, namespace) a name can have. Merging works when the combination is one TypeScript knows how to combine; otherwise it is a duplicate identifier.

## 3. Interfaces Merge Members

~~~ts
interface User { id: number }
interface User { name: string }
const u: User = { id: 1, name: "Ada" }; // both members are now required
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Two interface declarations named User combine into one User type with both members">
  <rect class="d-box" x="30" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="58" text-anchor="middle">interface User</text>
  <text class="d-sub" x="140" y="80" text-anchor="middle">id: number</text>
  <rect class="d-box" x="30" y="156" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="184" text-anchor="middle">interface User</text>
  <text class="d-sub" x="140" y="206" text-anchor="middle">name: string</text>
  <rect class="d-box-accent" x="450" y="88" width="240" height="74" rx="10"/>
  <text class="d-text" x="570" y="118" text-anchor="middle">merged User</text>
  <text class="d-sub" x="570" y="142" text-anchor="middle">id: number, name: string</text>
  <line class="d-edge" x1="250" y1="62" x2="448" y2="112"/>
  <line class="d-edge" x1="250" y1="188" x2="448" y2="140"/>
</svg>

Each declaration contributes its members to one interface; there is no "first" or "second" \`User\` left afterwards.

The rules, all checked in the examples:

- **Non-function members must agree.** Declaring \`width: number\` and then \`width: string\` is not a union, it is an error:

~~~text
main.ts(7,3): error TS2717: Subsequent property declarations must have the same type.  Property 'width' must be of type 'number', but here has type 'string'.
~~~

- **Methods become overloads.** Same-named methods do not conflict; they are combined into one overloaded method. The signatures of a **later** declaration are tried **before** an earlier one's: with \`parse(x: string): "first block"\` and then \`parse(x: string): "second block"\`, a call returns \`"second block"\`.
- **String-literal signatures jump the queue.** A signature whose parameter is a single string literal type is moved to the top. With \`create(tag: "div")\` declared first and \`create(tag: string)\` later, \`create("div")\` still returns \`"HTMLDivElement"\`, and \`create("p")\` returns \`"Element"\`.

📌 **Interview term: interface merging** — combining same-named interfaces; properties must have identical types, methods become overload lists.

📌 **Interview term: overload ordering** — in merged interfaces, later declarations' signatures come first, except that signatures with a single string-literal parameter are bubbled to the top.

## 4. Namespaces Merge With Functions, Classes and Enums

A namespace can attach values and types to an existing function, class or enum. This is the typed way to model a common JavaScript pattern: a function that also has properties.

~~~ts
function greet(name: string) { return greet.prefix + name; }
namespace greet { export const prefix = "Hello, "; }

class Point { constructor(public x: number, public y: number) {} }
namespace Point {
  export interface Json { x: number; y: number }   // a type: Point.Json
  export const origin = new Point(0, 0);           // a value: Point.origin
  export function fromJson(j: Json) { return new Point(j.x, j.y); }
}

enum Color { Red = "red" }
enum Color { Blue = "blue" }                       // enums merge with enums
namespace Color { export function parse(s: string): Color | undefined { /* ... */ } }
~~~

Unlike interface merging, this **does emit JavaScript**: a namespace with values compiles to code that adds properties to the function, class or enum object. So \`greet.prefix\`, \`Point.origin\` and \`Color.parse("blue")\` all work at run time (example 1).

One ordering rule: the namespace must come **after** the function or class, because its code adds properties to an object that must already exist:

~~~text
main.ts(18,11): error TS2434: A namespace declaration cannot be located prior to a class or function with which it is merged.
~~~

📌 **Interview term: namespace merging** — a namespace with the same name as a function, class or enum adds its exported members to it, both as types (\`Point.Json\`) and as run-time values (\`Point.origin\`).

## 5. What Does Not Merge

| Pair | Result in 5.4.5 |
| :--- | :--- |
| \`interface\` + \`interface\` | merged |
| \`namespace\` + \`namespace\` | merged (exported members combined) |
| \`namespace\` after \`function\` / \`class\` / \`enum\` | merged |
| \`enum\` + \`enum\` | merged |
| \`class\` + \`interface\` | merged (and unsafe, see below) |
| \`type\` + \`type\` | \`error TS2300: Duplicate identifier 'Settings'.\` |
| \`class\` + \`class\` | \`error TS2300: Duplicate identifier 'Service'.\` |

Type aliases never merge: a second \`type Settings\` is a duplicate. This is the practical reason libraries expose **interfaces** for anything users may need to extend. (Two classes with the same name are also a run-time error: when I ran that version in the page runner, it failed with \`SyntaxError: Identifier 'Service' has already been declared\`, so the example leaves it out.)

## 6. The Unsafe One: Class + Interface

An interface with the same name as a class merges into the class's **instance type**. The compiler then believes every instance has those members, but the class never got any code for them:

~~~ts
class Logger { log(msg: string) { return "LOG " + msg; } }
interface Logger { warn(msg: string): string }   // no error

new Logger().warn("disk almost full");           // type-checks, throws TypeError
~~~

This is legitimate when something else really adds the members (a mixin helper, or a declaration file describing a JavaScript class). In application code, use \`implements\`, which checks the class instead of extending it:

~~~text
main.ts(43,7): error TS2420: Class 'SafeLogger' incorrectly implements interface 'CanWarn'.
  Property 'warn' is missing in type 'SafeLogger' but required in type 'CanWarn'.
~~~

## 7. Where Merging Is Used on Purpose

- **The standard library itself.** In TypeScript 5.4.5, \`interface Array<T>\` is declared in \`lib.es5.d.ts\` and again in \`lib.es2015.core.d.ts\`, \`lib.es2019.array.d.ts\`, \`lib.es2022.array.d.ts\`, \`lib.es2023.array.d.ts\` and others; each adds the methods of its ECMAScript version. Choosing \`"lib": ["ES2022"]\` vs \`ESNext\` is choosing which merges happen.
- **Extending globals from your code.** \`declare global { interface Window { analytics: Analytics } }\` merges a member into the DOM's \`Window\`.
- **Extending libraries.** A library exposes an interface (an options object, an event map, a request object) and your code merges into it through \`declare module "lib"\`. That is [module augmentation](/interview-question/what-is-module-augmentation), which is just declaration merging across a module boundary.

## 8. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line really rejected, and were run as the page runs them. Example 1, the merges that work, prints:

~~~text
{"id":1,"name":"Ada"}
second block HTMLDivElement Element true true true
Hello, Lin 7
true {"x":0,"y":0}
blue red
~~~

The three \`true\` values are compile-time checks: the later \`parse\` signature wins, \`create("div")\` resolves to the literal signature declared earlier, and other tags get \`"Element"\`. The remaining lines are namespace members working at run time.

Example 2, the merges that do not work. With the directives removed, tsc reports:

~~~text
main.ts(7,3): error TS2717: Subsequent property declarations must have the same type.  Property 'width' must be of type 'number', but here has type 'string'.
main.ts(12,6): error TS2300: Duplicate identifier 'Settings'.
main.ts(14,6): error TS2300: Duplicate identifier 'Settings'.
main.ts(18,11): error TS2434: A namespace declaration cannot be located prior to a class or function with which it is merged.
main.ts(43,7): error TS2420: Class 'SafeLogger' incorrectly implements interface 'CanWarn'.
  Property 'warn' is missing in type 'SafeLogger' but required in type 'CanWarn'.
~~~

Note that \`logger.warn(...)\` is **not** in that list: the class + interface merge is accepted. At run time it prints:

~~~text
LOG ready
TypeError undefined
function
~~~

\`warn\` is \`undefined\` on the instance, so the call throws a \`TypeError\`.

## Common Pitfalls

- **Accidental merging.** Two script files (no \`import\`/\`export\`) both declaring \`interface Config\` silently combine: compiling \`a.ts\` with \`{ a: string }\` and \`b.ts\` with \`{ b: number }\` made \`const c: Config = { a: "x" }\` in \`b.ts\` fail with TS2741, \`Property 'b' is missing\`; making files modules (any \`import\`/\`export\`, or \`moduleDetection: "force"\`) keeps them separate.
- **Expecting a union from conflicting properties.** \`width: number\` and \`width: string\` is TS2717, not \`number | string\`.
- **Trying to extend a \`type\` alias by redeclaring it.** Aliases never merge; use an interface, or an intersection under a new name.
- **Merging an interface into a class to "add" methods.** It compiles and throws at run time; use \`implements\`, or actually add the method.
- **Relying on hover order for overloads.** Resolution follows the merge rules (later block first, string-literal signatures on top); check the result type of a call rather than guessing.
- **Forgetting namespaces are run-time code.** Unlike interfaces, a namespace with values emits JavaScript that mutates the merged function, class or enum object; it is not type-only.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Declaration merging is the compiler combining several same-named declarations in one scope into a single definition with all their parts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Interfaces:</strong> <span style="color:#f0e2c8;">Interface members are combined. A property declared twice must have the identical type (TS2717); methods become overloads, later declarations first and single string-literal signatures on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Namespaces:</strong> <span style="color:#f0e2c8;">A namespace merges into a function, class or enum to add static values and nested types, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point.origin</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point.Json</code>; it must come after the function or class, and it emits JavaScript.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> aliases and classes never merge (TS2300). Class + interface does merge, which is unsafe because the class never implements the added members.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it matters:</strong> <span style="color:#f0e2c8;">It is how the lib files build up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> version by version, how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global</code> extends them, and how module augmentation lets you add fields to a library's interfaces.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you extend <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Window</code> but not a type alias exported by a library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Window</code> is an interface, and interfaces merge. A type alias is fixed at its declaration; a second one with the same name is a duplicate identifier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order are overloads tried after two interfaces merge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The later declaration's signatures are tried first, each block keeping its own order, except that signatures with a single string-literal parameter are moved to the top. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create("div")</code> can hit a literal signature declared earlier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is merging an interface into a class type-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The compiler adds the members to the instance type without checking the class implements them, so calls compile and fail at run time. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">implements</code> to have the class checked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do namespaces still matter in modern code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly through merging and declaration files: typing a function with properties, or describing old global libraries. For new application code, ES modules replace namespaces as a way to organise code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do declarations in two different modules merge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: each module has its own scope. Merging across modules happens only through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "x"</code> (module augmentation) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Declaration merging | Combining same-named declarations in one scope into one definition |
| Declaration space | Whether a name is a value, a type, a namespace, or several |
| Interface merging | Same-named interfaces combine members; methods become overloads |
| Overload ordering | Later declarations' signatures first; single string-literal signatures bubble to the top |
| Namespace merging | A namespace adds exported values and types to a function, class or enum |

**Conclusion:** Declaration merging means a name can be built up from several declarations: interfaces combine members, namespaces add statics and nested types to functions, classes and enums, and enums combine with enums, while type aliases and classes refuse with a duplicate-identifier error. The rules are strict where safety is easy (identical property types, namespace after the function) and loose in one dangerous place (an interface merged into a class). Knowing them explains how the standard library is assembled, why libraries expose interfaces, and how module augmentation can extend types you do not own.`,
    examples: [
      {
        label: `The merges that work`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Interface + interface: the members are combined into one interface.
interface User { id: number }
interface User { name: string }
const u: User = { id: 1, name: "Ada" }; // both members required
console.log(JSON.stringify(u));

// 2. Merged methods become overloads. The LATER interface's signatures are tried first,
//    except a signature whose parameter is a single string literal, which moves to the top.
interface Parser { parse(x: string): "first block" }
interface Parser { parse(x: string): "second block" }
const parser = { parse: () => "second block" } as unknown as Parser;
const r = parser.parse("a");
const laterWins: Equal<typeof r, "second block"> = true;

interface Doc { create(tag: "div"): "HTMLDivElement" }
interface Doc { create(tag: string): "Element" } // later, but the literal one still wins for "div"
const doc = { create: (tag: string) => (tag === "div" ? "HTMLDivElement" : "Element") } as unknown as Doc;
const d = doc.create("div");
const other = doc.create("p");
const literalFirst: Equal<typeof d, "HTMLDivElement"> = true;
const wideForRest: Equal<typeof other, "Element"> = true;
console.log(r, d, other, laterWins, literalFirst, wideForRest);

// 3. Function + namespace: give a function static properties, with types.
function greet(name: string) {
  return greet.prefix + name;
}
namespace greet { export const prefix = "Hello, "; }
console.log(greet("Lin"), greet.prefix.length);

// 4. Class + namespace: nested types and helpers hang off the class name.
class Point {
  constructor(public x: number, public y: number) {}
}
// (One-line namespace blocks; several blocks with the same name merge with each other too.)
namespace Point { export interface Json { x: number; y: number } }
namespace Point { export const origin = new Point(0, 0); }
namespace Point { export function fromJson(j: Json) { return new Point(j.x, j.y); } }
const p = Point.fromJson({ x: 3, y: 4 });
console.log(p instanceof Point, JSON.stringify(Point.origin));

// 5. Enum + namespace: helper functions on an enum, and enum + enum.
enum Color { Red = "red" }
enum Color { Blue = "blue" }
const parseColor = (s: string): Color | undefined => (s === "red" ? Color.Red : s === "blue" ? Color.Blue : undefined);
namespace Color { export const parse = parseColor; }
console.log(Color.parse("blue"), Color.Red);`,
      },
      {
        label: `What does not merge, and the unsafe class + interface merge`,
        code: `// What does NOT merge, and the one merge that is unsafe.

// 1. Same property, different type: an error, not a union.
interface Box { width: number }
interface Box {
  // @ts-expect-error TS2717: Subsequent property declarations must have the same type.
  width: string;
}

// 2. type aliases never merge: a second one is a duplicate.
// @ts-expect-error TS2300: Duplicate identifier 'Settings'.
type Settings = { theme: string };
// @ts-expect-error TS2300: Duplicate identifier 'Settings'.
type Settings = { lang: string };

// 3. A namespace that merges with a function or class must come after it.
// @ts-expect-error TS2434: A namespace declaration cannot be located prior to a class or function...
namespace tooEarly { export const v = 1 }
function tooEarly() {}

// 4. Class + interface DOES merge, and that is the dangerous one:
//    the interface adds members to the class type that the class never implements.
class Logger {
  log(msg: string) {
    return "LOG " + msg;
  }
}
interface Logger {
  warn(msg: string): string; // no error: the class type now claims to have warn
}

const logger = new Logger();
console.log(logger.log("ready"));
try {
  logger.warn("disk almost full"); // type-checks, but there is no warn at run time
} catch (e) {
  console.log((e as Error).name, typeof logger.warn);
}

// Compare: "implements" checks the class, so the gap is caught at compile time.
interface CanWarn { warn(msg: string): string }
// @ts-expect-error TS2420: Class 'SafeLogger' incorrectly implements interface 'CanWarn'.
class SafeLogger implements CanWarn {
  log(msg: string) {
    return msg;
  }
}
console.log(typeof SafeLogger);`,
      },
    ],
  },
  {
    title: `What is module augmentation?`,
    difficulty: "hard",
    seoDescription: `TypeScript module augmentation: declare module to extend library interfaces, declare global, the module-file rule, limits and run-time pitfalls.`,
    description: `**Question presented to candidate:**
"Your auth middleware puts a \`user\` on every request object, but the framework's \`Request\` type does not have it. How do you add that property to a third-party library's types without forking them, and what can go wrong?"

**What a strong answer should cover:**
- Module augmentation: \`declare module "lib" { interface Request { user?: User } }\` inside a file that is itself a module merges new members into the library's exported interface
- It is declaration merging across a module boundary, so you can extend interfaces (and namespaces), not type aliases; libraries expose interfaces like Vue's \`ComponentCustomProperties\` precisely to be augmented
- The file must be a module (a top-level \`import\`/\`export\`): in a script file the same block is an ambient module declaration that replaces the library's types
- Global augmentation: \`declare global { interface Window { ... } interface Array<T> { ... } }\` from a module, the same mechanism for global types
- Augmentation is type-only: it never adds the run-time value, so the middleware, plugin or polyfill must really provide it; \`export default x\` inside an augmentation is TS2666
- Placement: the augmenting file must be part of the compilation (\`include\`, or imported), otherwise the extra members silently disappear

**Clarifying questions expected:**
- Is the property set on every request, or only after a specific middleware (should it be optional)?
- Is this app code, or a library/plugin that should ship the augmentation to its users?

**Code / implementation expected:** Yes — a \`declare module\` block that adds a property to a library interface, and a usage that type-checks.`,
    answer: `**Target Audience:** Developers who need to add fields to a framework's types (request objects, component instances, config or event maps) or to global types like \`Window\` and \`Array\`.
**Difficulty:** Hard
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022). The multi-file project in sections 3 and 4 was compiled separately with the same compiler, since the page runs a single file.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

Module augmentation is [declaration merging](/interview-question/what-is-declaration-merging) applied across a module boundary, written with the \`declare\` keyword ([What does the declare keyword do?](/interview-question/what-does-the-declare-keyword-do)). Those pages cover the merging rules; this one covers extending code you do not own.

## 1. Why This Even Matters — A Story First

You rent a furnished flat. The landlord's inventory lists a bed, a table and two chairs. You bring your own bookshelf. You do not get to rewrite the landlord's inventory, but you can staple a page to it: "plus one bookshelf, belongs to the tenant".

A library's types are the landlord's inventory, sitting in \`node_modules\`. Your auth middleware adds \`req.user\`, your plugin adds \`this.$http\` to every component: real things the library's types know nothing about. Module augmentation is the stapled page: you add members to the library's interfaces from your own code, and every file that imports the library sees them.

The stapled page only *describes* the bookshelf; it does not deliver one. The middleware still has to actually set \`req.user\`.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the property always set, or only after some middleware runs? | Decides \`user: User\` vs \`user?: User\`; a required property is a lie on routes without that middleware |
| Is this app code or a library/plugin? | A plugin should ship the augmentation in its own \`.d.ts\` so users get it automatically |
| Is the thing you want to extend an interface or a type alias? | Only interfaces (and namespaces) merge; an alias cannot be augmented |
| Global type (like \`Window\`) or a module export? | Globals use \`declare global\`, module exports use \`declare module "name"\` |

## 3. The Core Idea

📌 **Interview term: module augmentation** — a \`declare module "specifier" { ... }\` block inside a module file that adds declarations to an existing module. Interfaces declared in it merge with the module's exported interfaces of the same name.

I compiled this three-file project with a stand-in package \`fake-server\`, whose \`node_modules/fake-server/index.d.ts\` is:

~~~ts
export interface Request { url: string }
export declare function handle(cb: (req: Request) => void): void;
export default function createServer(): { listen(port: number): void };
~~~

The augmentation, \`src/augment.ts\`:

~~~ts
// Any top-level import or export makes this file a module, so the block below is an augmentation.
import "fake-server";

declare module "fake-server" {
  interface Request {
    user?: { id: string };
  }
}
~~~

And the code that uses it, \`src/use.ts\`:

~~~ts
import { handle } from "fake-server";

handle((req) => {
  const url: string = req.url; // from the library
  const id: string | undefined = req.user?.id; // from our augmentation
  console.log(url, id);
});
~~~

The project compiled with exit code 0. With \`src/augment.ts\` removed from the project, the same \`use.ts\` failed with:

~~~text
src/use.ts(5,38): error TS2339: Property 'user' does not exist on type 'Request'.
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="The library Request interface and the augmentation in your code merge into one Request that every importer sees">
  <rect class="d-box" x="30" y="30" width="250" height="64" rx="10"/>
  <text class="d-text" x="155" y="58" text-anchor="middle">node_modules: Request</text>
  <text class="d-sub" x="155" y="80" text-anchor="middle">url: string</text>
  <rect class="d-box-accent" x="30" y="156" width="250" height="64" rx="10"/>
  <text class="d-text" x="155" y="184" text-anchor="middle">your augment.ts</text>
  <text class="d-sub" x="155" y="206" text-anchor="middle">user?: id</text>
  <rect class="d-box" x="450" y="88" width="240" height="74" rx="10"/>
  <text class="d-text" x="570" y="118" text-anchor="middle">Request seen by use.ts</text>
  <text class="d-sub" x="570" y="142" text-anchor="middle">url and user</text>
  <line class="d-edge" x1="280" y1="62" x2="448" y2="112"/>
  <line class="d-edge-accent" x1="280" y1="188" x2="448" y2="140"/>
</svg>

Both declarations target the same exported interface of the same module, so they merge, and any file that imports \`Request\` from \`fake-server\` sees both members.

The real-world versions look the same. Vue's documentation, for example, asks plugins to type \`app.config.globalProperties\` additions by augmenting \`ComponentCustomProperties\` in \`declare module 'vue'\` ([Vue: TypeScript with Options API](https://vuejs.org/guide/typescript/options-api)).

## 4. The Rule That Bites: The File Must Be a Module

The \`import "fake-server";\` line is not decoration. A \`declare module "x"\` block means two different things depending on the file it is in:

| File kind | \`declare module "fake-server" { ... }\` means |
| :--- | :--- |
| Module (has a top-level \`import\` or \`export\`) | **augmentation**: merge into the real \`fake-server\` types |
| Script (no top-level \`import\`/\`export\`) | **ambient module declaration**: this *is* the whole \`fake-server\` module |

With the import line commented out, the project fails, and the error is about the library's own export:

~~~text
src/use.ts(1,10): error TS2305: Module '"fake-server"' has no exported member 'handle'.
src/use.ts(3,9): error TS7006: Parameter 'req' implicitly has an 'any' type.
~~~

The script-file block replaced the package's declarations instead of extending them, so \`handle\` vanished. Vue's docs warn about the same failure. Any top-level \`import\` or \`export {}\` turns the file into a module; importing the library itself also documents what you are augmenting.

📌 **Interview term: ambient module declaration** — \`declare module "x" { ... }\` in a script file: it declares the entire module, as in the \`declare module "*.svg"\` files described on [What are declaration files (.d.ts)?](/interview-question/what-are-declaration-files-d-ts)

The reverse also applies: an augmentation of a module TypeScript cannot resolve is an error. In a module file, \`declare module "lib-x" {}\` gave \`error TS2664: Invalid module name in augmentation, module 'lib-x' cannot be found.\`

## 5. Global Augmentation

Global types (\`Window\`, \`Array<T>\`, \`SymbolConstructor\`) are not exported from any module. From a module file you reach them with \`declare global\`:

~~~ts
declare global {
  interface Array<T> { last(): T | undefined }
  interface Window { __APP_STATE__: { user: string | null } }
  interface SymbolConstructor { readonly appTag: unique symbol }
}
~~~

📌 **Interview term: global augmentation** — a \`declare global { ... }\` block inside a module that merges declarations into the global scope.

TypeScript's own lib files work this way: \`lib.esnext.decorators.d.ts\` contains \`interface SymbolConstructor { readonly metadata: unique symbol; }\` to add \`Symbol.metadata\`. Example 1 adds \`Array.prototype.last\`, and shows the trap on the other side: an \`interface Array<T>\` written **outside** \`declare global\` in a module is a new local type, so \`[1, 2].first\` is still

~~~text
main.ts(40,20): error TS2339: Property 'first' does not exist on type 'number[]'.
~~~

## 6. Designing for Augmentation: Empty Interfaces

Libraries that expect users to add types usually expose an interface that is empty or minimal on purpose, and read its keys. Example 2 is a small event bus built that way:

~~~ts
interface Events {} // library: deliberately empty

function createBus() {
  return {
    on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void) { /* ... */ },
    emit<K extends keyof Events>(event: K, payload: Events[K]) { /* ... */ },
  };
}

interface Events {  // your app; in a real project: declare module "tiny-bus" { interface Events {...} }
  "user:login": { id: string };
  "cart:add": { sku: string; qty: number };
}
~~~

After the augmentation, \`on\` and \`emit\` know the event names and payloads:

~~~text
main.ts(36,10): error TS2345: Argument of type '"cart:remove"' is not assignable to parameter of type 'keyof Events'.
main.ts(38,36): error TS2353: Object literal may only specify known properties, and 'admin' does not exist in type '{ id: string; }'.
~~~

Example 2 keeps both halves in one file, where it is plain interface merging, because the page runs a single file. The type-level effect is the same as the multi-file project in section 3.

## 7. Limits

All checked with 5.4.5:

- **Only mergeable declarations can be extended.** Interfaces and namespaces merge; an exported \`type\` alias cannot be reopened (TS2300 Duplicate identifier, see [declaration merging](/interview-question/what-is-declaration-merging)).
- **Default exports.** \`export default x;\` inside an augmentation is \`error TS2666: Exports and export assignments are not permitted in module augmentations.\` Augment the named interface the default export uses instead.
- **New exports are accepted, but they are only types.** The TypeScript handbook says augmentations can only patch existing declarations ([Handbook: Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)). In 5.4.5, though, adding \`export function extra(): void;\` inside the \`fake-server\` augmentation compiled cleanly, and so did \`import { extra } from "fake-server"; extra();\`, although the package has no such function. Treat that as a way to lie to the compiler, not a feature.
- **The augmenting file must be in the program.** If \`augment.ts\` is outside \`include\`, or never imported, its members are simply absent (the TS2339 in section 3).
- **It never touches run time.** In example 1 the \`Array.prototype.last\` implementation is a separate statement; delete it and the code still compiles and then throws.

## 8. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line really rejected, and were run as the page runs them.

Example 1, global augmentation, prints:

~~~text
3 undefined
true true symbol
undefined
~~~

\`[1, 2, 3].last()\` is \`3\` and an empty array gives \`undefined\`. The two \`true\` values are compile-time checks that \`string[]["last"]\` returns \`string | undefined\` and that \`Window\` gained \`__APP_STATE__\`. The final \`undefined\` is \`[1, 2].first\` at run time: the shadowing local interface added nothing.

Example 2, an augmentable event map, prints:

~~~text
["login u1","add book x2","login u2"]
~~~

The \`"cart:remove"\` call is rejected by the checker and has no handler at run time; the \`admin: true\` call is rejected by the checker but still runs, which is why \`login u2\` appears. Types do not stop bad calls from executing; they stop them from being written.

## Common Pitfalls

- **Augmenting from a script file.** Without a top-level \`import\`/\`export\`, \`declare module "lib"\` replaces the library's types (TS2305 on its real exports) instead of extending them.
- **Declaring a property required when it is conditional.** If only some routes run the auth middleware, \`user?: User\` is the honest type.
- **Forgetting the run-time half.** Augmentation adds no code; the middleware, plugin or polyfill must actually set the value.
- **Augmenting the wrong module name.** You must use the specifier of the module that *declares* the interface; if a package re-exports a type from an internal module, augmenting the outer name may not merge with it.
- **Leaving the augmentation out of the compilation.** A \`.d.ts\` outside \`include\` is silently ignored, and the members vanish.
- **Patching built-in prototypes in a library.** A global \`Array\` augmentation affects every consumer; keep that for applications and polyfills.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Module augmentation is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "lib" { ... }</code> block in a module file that merges new declarations into an existing module's types, typically adding members to an exported interface.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Example:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "fake-server" { interface Request { user?: { id: string } } }</code> and every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req</code> from that library has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user</code>. Vue's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentCustomProperties</code> works the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The module rule:</strong> <span style="color:#f0e2c8;">The file must have a top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export</code>. In a script file the same block is an ambient module declaration that replaces the library's types; I have seen <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handle</code> disappear with TS2305 because of a missing import.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Globals:</strong> <span style="color:#f0e2c8;">For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Window</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SymbolConstructor</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global { ... }</code> from a module; TypeScript's own lib adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.metadata</code> that way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Only interfaces and namespaces merge, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export default</code> in an augmentation is TS2666, the file must be in the compilation, and nothing is added at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the augmentation stop working when you delete the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import</code> at the top?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export</code> the file is a script, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "x"</code> in a script declares the whole module instead of augmenting it. It hides the library's real declarations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you augment a type alias exported by a library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Aliases do not merge. You can only extend interfaces and namespaces, which is why libraries that want to be extended export interfaces.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare global</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declare module</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "x"</code> targets the exports of one module; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare global</code> targets the global scope, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Window</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array&lt;T&gt;</code>. Both must live in a module file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does augmentation add the property at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is type-only. If the middleware never sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.user</code>, the code compiles and reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>; for an added method, the call throws.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should a plugin library put its augmentation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> that its package exposes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> (or one it imports from its entry declarations), so users get the extra members just by installing and importing the plugin.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Module augmentation | \`declare module "x"\` in a module file, merging declarations into an existing module |
| Ambient module declaration | \`declare module "x"\` in a script file, declaring the whole module |
| Global augmentation | \`declare global { ... }\` in a module, merging into the global scope |

**Conclusion:** Module augmentation lets you staple your own members onto a library's types: write \`declare module "lib"\` in a file that is a module, reopen the exported interface, and every importer sees the result. It works because interfaces merge across declarations, which is also why it cannot touch type aliases, and its global twin \`declare global\` is how you extend \`Window\` or \`Array\`. The two things to remember are the ones that cause silent breakage: without a top-level \`import\` or \`export\` you replace the library's types instead of extending them, and augmentation never adds anything at run time.`,
    examples: [
      {
        label: `Global augmentation: Array, Window and SymbolConstructor`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
// This file is a module (the page and the checker use moduleDetection "force"),
// so global types can only be extended from inside "declare global".

declare global {
  interface Array<T> {
    /** Last element, or undefined for an empty array. */
    last(): T | undefined;
  }
  interface Window {
    __APP_STATE__: { user: string | null };
  }
  // Exactly what lib.esnext.decorators.d.ts does for Symbol.metadata:
  interface SymbolConstructor {
    readonly appTag: unique symbol;
  }
}

// The types only describe the patch; the run-time patch is a separate job.
Object.defineProperty(Array.prototype, "last", {
  value: function <T>(this: T[]) {
    return this[this.length - 1];
  },
  configurable: true,
});
(Symbol as { appTag: symbol }).appTag = Symbol("appTag");

console.log([1, 2, 3].last(), String([].last()));
const lastIsTyped: Equal<ReturnType<string[]["last"]>, string | undefined> = true;
const windowHasState: Equal<Window["__APP_STATE__"], { user: string | null }> = true;
console.log(lastIsTyped, windowHasState, typeof Symbol.appTag);

// An interface named Array declared outside "declare global" (here inside a namespace)
// is a NEW local type that shadows the global one: nothing is merged.
namespace Shadow {
  interface Array<T> {
    first(): T | undefined;
  }
  // @ts-expect-error TS2339: Property 'first' does not exist on type 'number[]'.
  const f = [1, 2].first;
  console.log(typeof f);
}`,
      },
      {
        label: `An augmentable event map, the pattern libraries use`,
        code: `// The pattern behind most module augmentation: a library exposes an EMPTY interface
// and reads its keys, and your code adds the keys. One file here, so both halves sit
// side by side; in a real project the second half is
//   declare module "tiny-bus" { interface Events { ... } }
// in your own code, and the first half lives in node_modules/tiny-bus.

// ---- "library" half --------------------------------------------------------
interface Events {} // deliberately empty: users augment it

function createBus() {
  const handlers: { [event: string]: ((payload: unknown) => void)[] } = {};
  return {
    on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void) {
      (handlers[event] ??= []).push(fn as (payload: unknown) => void);
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]) {
      for (const fn of handlers[event] ?? []) fn(payload);
    },
  };
}

// ---- "your app" half: augment the interface ------------------------------
interface Events {
  "user:login": { id: string };
  "cart:add": { sku: string; qty: number };
}

const bus = createBus();
const seen: string[] = [];
bus.on("user:login", (p) => seen.push("login " + p.id));
bus.on("cart:add", (p) => seen.push("add " + p.sku + " x" + p.qty));

bus.emit("user:login", { id: "u1" });
bus.emit("cart:add", { sku: "book", qty: 2 });
// @ts-expect-error TS2345: "cart:remove" is not a key of the augmented Events.
bus.emit("cart:remove", { sku: "book" });
// @ts-expect-error TS2353: payload is checked against the augmented shape.
bus.emit("user:login", { id: "u2", admin: true });

console.log(JSON.stringify(seen));`,
      },
    ],
  },
  {
    title: `How do TypeScript 5.0 Stage 3 decorators differ from legacy \`experimentalDecorators\`?`,
    difficulty: "hard",
    seoDescription: `TypeScript 5.0 standard decorators vs experimentalDecorators: (value, context) vs descriptors, accessor, addInitializer, metadata and evaluation order.`,
    description: `**Question presented to candidate:**
"TypeScript has had decorators behind \`experimentalDecorators\` for years, and TypeScript 5.0 added standard decorators. What actually changed: the function signature, what a decorator can do, the evaluation order, and what this means for Angular-, TypeORM- or NestJS-style code?"

**What a strong answer should cover:**
- Standard (TC39 Stage 3) decorators need no flag in TypeScript 5.0+; legacy decorators need \`experimentalDecorators\`, and the flag switches the whole project to the legacy semantics
- Signature: legacy \`(target, key, descriptor)\` mutating the prototype or descriptor vs standard \`(value, context)\` returning a replacement; \`context\` has \`kind\`, \`name\`, \`static\`, \`private\`, \`access\`, \`addInitializer\` and (5.2+) \`metadata\`
- Kinds: standard supports classes, methods, getters, setters, fields and \`accessor\` auto-accessors; field decorators get \`undefined\` and return an initializer transform; parameter decorators exist only in legacy (TS1206 otherwise)
- Metadata: legacy \`emitDecoratorMetadata\` + \`reflect-metadata\` emits design-time types (used by DI containers); standard has \`context.metadata\` / \`Symbol.metadata\` but no emitted type information
- Evaluation order differs: standard evaluates all decorator expressions first, then applies them (methods, then fields, then the class); legacy works member by member
- Migration: the two are not interchangeable at run time, so a library's decorators target one mode, and frameworks that rely on parameter decorators or emitted type metadata still need the legacy flag

**Clarifying questions expected:**
- Which framework or library is involved (does it depend on parameter decorators or \`reflect-metadata\`)?
- Are we writing decorators, or only using a library's?

**Code / implementation expected:** Yes — a standard method decorator with \`(value, context)\`, ideally next to the legacy equivalent.`,
    answer: `**Target Audience:** Developers who use or write decorators (Angular, NestJS, TypeORM, MobX, Lit, or their own) and need to know which of the two systems they are on.
**Difficulty:** Hard
**TypeScript version:** Standard decorators shipped in TypeScript 5.0 ([Announcing TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)). Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022). The legacy examples were compiled separately with \`"experimentalDecorators": true\`, since the page cannot set that flag.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Two tailors both offer to "alter your jacket". The first one is old-school: you hand over the jacket, and he unpicks the seams and sews things directly onto it. The second one follows a new trade standard: you hand him the sleeve and a form describing it ("left sleeve, outer, belongs to jacket #12"), and he hands back a *new* sleeve, or the same one, plus notes for whoever assembles the jacket.

Both are "decorators". But a pattern made for the first tailor makes no sense to the second: he never gets the whole jacket, and he does not unpick anything. TypeScript has both tailors. \`experimentalDecorators\` is the old one, from an early version of the proposal. Since 5.0 the standard one is the default, and code written for one does not work with the other.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which framework is involved? | Angular, NestJS, TypeORM and similar libraries are built on legacy decorators and their metadata; check what they require before switching |
| Do you rely on parameter decorators (constructor injection)? | Only legacy decorators support them |
| Do you need emitted type metadata (\`reflect-metadata\`)? | Only legacy \`emitDecoratorMetadata\` emits design-time types |
| Are we writing decorators or only consuming them? | Authors must pick a mode and say so; consumers just match the library |

## 3. The Core Difference: What a Decorator Receives

📌 **Interview term: decorator** — a function applied with \`@expr\` to a class or class member at class-definition time, which can observe, replace or add initialization logic to the thing it decorates.

📌 **Interview term: Stage 3 (standard) decorators** — the TC39 decorators proposal that reached Stage 3, implemented by TypeScript 5.0 without any flag. Each decorator receives \`(value, context)\`.

📌 **Interview term: legacy decorators** — TypeScript's older implementation of an earlier proposal, enabled with \`"experimentalDecorators": true\`. Member decorators receive \`(target, key, descriptor)\`.

~~~ts
// Legacy (experimentalDecorators): mutate the descriptor of the prototype method.
function logged(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (this: unknown, ...args: unknown[]) {
    console.log("call " + key);
    return original.apply(this, args);
  };
}

// Standard (TypeScript 5.0+, no flag): receive the method, return a replacement.
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
  return function (this: This, ...args: Args): R {
    console.log("call " + String(context.name));
    return target.call(this, ...args);
  };
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="A legacy decorator receives the prototype, the key and a descriptor and mutates them">
  <rect class="d-box-muted" x="30" y="40" width="250" height="74" rx="10"/>
  <text class="d-text" x="155" y="70" text-anchor="middle">legacy decorator</text>
  <text class="d-sub" x="155" y="94" text-anchor="middle">target, key, descriptor</text>
  <rect class="d-box" x="440" y="40" width="250" height="74" rx="10"/>
  <text class="d-text" x="565" y="70" text-anchor="middle">class prototype</text>
  <text class="d-sub" x="565" y="94" text-anchor="middle">descriptor mutated in place</text>
  <line class="d-edge" x1="280" y1="77" x2="438" y2="77"/>
  <text class="d-sub" x="360" y="160" text-anchor="middle">writes directly</text>
  <line class="d-edge-dashed" x1="360" y1="140" x2="360" y2="82"/>
</svg>

A legacy decorator works on the class from the outside: it gets the prototype (or the constructor) and changes it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="A standard decorator receives the value and a context object and returns a replacement">
  <rect class="d-box" x="30" y="40" width="200" height="74" rx="10"/>
  <text class="d-text" x="130" y="70" text-anchor="middle">value</text>
  <text class="d-sub" x="130" y="94" text-anchor="middle">the method itself</text>
  <rect class="d-box" x="30" y="140" width="200" height="64" rx="10"/>
  <text class="d-text" x="130" y="168" text-anchor="middle">context</text>
  <text class="d-sub" x="130" y="190" text-anchor="middle">kind, name, metadata</text>
  <rect class="d-box-accent" x="300" y="80" width="170" height="74" rx="10"/>
  <text class="d-text" x="385" y="122" text-anchor="middle">decorator</text>
  <rect class="d-box" x="530" y="80" width="160" height="74" rx="10"/>
  <text class="d-text" x="610" y="110" text-anchor="middle">replacement</text>
  <text class="d-sub" x="610" y="134" text-anchor="middle">or nothing</text>
  <line class="d-edge" x1="230" y1="77" x2="298" y2="105"/>
  <line class="d-edge" x1="230" y1="172" x2="298" y2="132"/>
  <line class="d-edge-accent" x1="470" y1="117" x2="528" y2="117"/>
</svg>

A standard decorator is a function from a value to a value: it never sees the prototype or a descriptor, and it extends the class only through what it returns and through \`context.addInitializer\`.

The \`context\` object for a method, from \`lib.decorators.d.ts\` in 5.4.5, has \`kind: "method"\`, \`name\`, \`static\`, \`private\`, \`access\` (\`has\` / \`get\`), \`addInitializer(fn)\` and \`metadata\`. Each kind has its own typed context: \`ClassDecoratorContext\`, \`ClassMethodDecoratorContext\`, \`ClassGetterDecoratorContext\`, \`ClassSetterDecoratorContext\`, \`ClassFieldDecoratorContext\` and \`ClassAccessorDecoratorContext\`.

## 4. What Each Kind Gets and Returns (Standard)

| Decorated | \`value\` received | May return |
| :--- | :--- | :--- |
| Class | the class | a replacement class |
| Method / getter / setter | the function | a replacement function |
| Field | \`undefined\` (there is no field yet) | a function \`initial => newInitial\`, run per instance |
| \`accessor\` field | \`{ get, set }\` of the auto-accessor | \`{ get?, set?, init? }\` |
| Parameter | not supported | (error TS1206) |

📌 **Interview term: auto-accessor** — a field declared with the \`accessor\` keyword (TypeScript 4.9, [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)) that compiles to a getter/setter pair over a private storage slot. It is how a standard decorator intercepts reads and writes of a field.

📌 **Interview term: \`addInitializer\`** — a \`context\` method that registers code to run at construction (for member decorators) or after the class is defined (for class decorators). It replaces the old trick of patching the constructor, for example to bind a method to each instance.

Example 1 uses all of them on one \`Counter\` class: \`@doubled\` turns \`step = 5\` into \`10\`, \`@tracked accessor count\` logs every write, \`@bound\` binds \`inc\` per instance with \`addInitializer\`, \`@logged\` wraps \`inc\`, and \`@registered\` decorates the class.

## 5. Side by Side

| | Legacy (\`experimentalDecorators\`) | Standard (5.0+) |
| :--- | :--- | :--- |
| Flag | required | none |
| Member signature | \`(target, key, descriptor?)\` | \`(value, context)\` |
| \`target\` | the prototype (or the constructor for statics) | never given |
| How it changes things | mutate the descriptor or prototype, or return a descriptor | return a replacement, use \`addInitializer\` |
| Parameter decorators | yes | no (TS1206) |
| Field decorators | get \`(prototype, key)\`; cannot see the value | get \`undefined\`; return an initializer transform |
| \`accessor\` keyword | not supported by the decorator | yes |
| Metadata | \`emitDecoratorMetadata\` + \`reflect-metadata\`: emitted design-time types | \`context.metadata\` → \`Class[Symbol.metadata]\` (5.2+), no type information |
| Emit helper (seen in 5.4.5 output) | \`__decorate\`, \`__param\` | \`__esDecorate\`, \`__runInitializers\` |

The TypeScript team stated when standard decorators arrived that the new proposal "is not compatible with --emitDecoratorMetadata, and it does not allow decorating parameters" ([Announcing TypeScript 5.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/)). Decorator metadata for standard decorators followed in TypeScript 5.2 ([InfoWorld on TypeScript 5.2](https://www.infoworld.com/article/3701454/typescript-52-brings-explicit-resource-management.html)). That is the reason many dependency-injection frameworks still need the legacy flag: constructor-parameter decorators and emitted parameter types are exactly what they use.

## 6. The Same Class, Two Systems

Here is a legacy class with all four legacy kinds, compiled with \`"experimentalDecorators": true\` and run with Node:

~~~ts
@sealed
class Greeter {
  @tag greeting = "hello";
  @logged
  greet(@param name: string) {
    return this.greeting + " " + name;
  }
}
~~~

~~~text
property decorator greeting (3 arguments)
parameter decorator greet index 0
method decorator greet, target is the prototype: true
class decorator Greeter
call greet(Ada)
hello Ada
~~~

The \`__decorate\` helper calls even the property decorator with three arguments (the third is the \`void 0\` it passed as the descriptor), and \`target\` is \`Greeter.prototype\`. None of that exists in the standard model.

Without the flag, the same legacy-shaped decorator is checked against the standard signature:

~~~text
main.ts(15,5): error TS1241: Unable to resolve signature of method decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
main.ts(15,6): error TS1270: Decorator function return type 'PropertyDescriptor' is not assignable to type 'void | (() => string)'.
~~~

and a parameter decorator is \`error TS1206: Decorators are not valid here.\` Example 3 runs the legacy decorator anyway (the error suppressed): it receives \`function, object, undefined\`, there is no descriptor to set \`writable\` on, and the class definition itself throws a \`TypeError\`. The two systems are not interchangeable at run time.

## 7. Evaluation Order Changed Too

I ran the same class with a logging decorator factory \`mk(name)\` on the class, a field, a stacked pair on a method (\`@mk("outer") @mk("inner")\`) and a static method, in both modes.

Standard (5.4.5, no flag):

~~~text
evaluate class
evaluate field-a
evaluate outer
evaluate inner
evaluate static-m
apply static-m to method s
apply inner to method m
apply outer to method m
apply field-a to field a
apply class to class A
~~~

Legacy (\`experimentalDecorators\`):

~~~text
evaluate field-a
apply field-a
evaluate outer
evaluate inner
apply inner
apply outer
evaluate static-m
apply static-m
evaluate class
apply class
~~~

In the standard model every decorator *expression* is evaluated first, top to bottom (the class one included), and only then are they applied: static methods, then instance methods, then fields, then the class. The legacy model evaluates and applies member by member (instance members, then statics) and handles the class decorator last. Both apply a stack of decorators closest-first (\`inner\` before \`outer\`). Example 1 shows the standard order in a real class: the method is decorated before the field above it.

## 8. Metadata, and a Trap

Every decorator of one class gets the same \`context.metadata\` object, and after decoration it is available as \`Class[Symbol.metadata]\`. A subclass's metadata object has the parent's as its prototype, so lookups fall through to the parent.

That inheritance is a trap. \`context.metadata.columns ??= []\` in a subclass **finds the parent's array** through the prototype and pushes into it. Example 2 shows it: after defining \`Admin extends User\`, \`User\` reports both \`name:text\` and \`root:bool\`, and \`Admin\`'s own metadata is \`{}\`. The fix is to check \`Object.hasOwn(meta, "columns")\` and copy the inherited list before adding.

\`Symbol.metadata\` is not in lib ES2022 and not in every runtime yet, so the example adds the same declarations \`lib.esnext.decorators.d.ts\` contains (a [global augmentation](/interview-question/what-is-module-augmentation)) and a run-time stand-in symbol. Without one, TypeScript's emitted code leaves \`context.metadata\` undefined: in a Node 22 run without the stand-in, a field decorator logged \`meta is undefined\`.

## 9. Verified: Running the Code

All three examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line really rejected, and were run as the page runs them.

Example 1, the standard decorator kinds, prints:

~~~text
10 10 10
decorate method inc (kind=method, static=false)
decorate field step
decorate class Counter
class initializer: class is ready
--- class defined, now using it
call inc(1)
set count = 10
~~~

\`detached(1)\` works because \`@bound\` bound it per instance, and returns \`1 * 10\`; \`step\` is \`10\` because the field decorator doubled the initial \`5\`; the accessor decorator logged the write to \`count\`.

Example 2, metadata, prints:

~~~text
{"columns":["name:text","root:bool"]} {}
true
{"columns":["title:text"]} {"columns":["title:text","due:date"]}
~~~

The first line is the trap (the parent's list was modified), \`true\` confirms the prototype link between the metadata objects, and the last line is the fixed decorator.

Example 3, a legacy decorator without the flag, prints:

~~~text
class definition failed with TypeError
arg 1: function, arg 2: object, arg 3: undefined
loaded false
~~~

The standard replacement, \`@frozenMethod\`, uses \`addInitializer\` to define a non-writable \`load\` on each instance. Because the page runs code in sloppy mode, the assignment of \`"hacked"\` fails silently (strict mode would throw), \`load()\` still returns \`loaded\`, and the descriptor shows \`writable: false\`.

## Common Pitfalls

- **Mixing the two systems.** \`experimentalDecorators\` applies to the whole project; a decorator library written for one mode breaks or fails to type-check in the other. Check what each library expects.
- **Porting by renaming parameters.** A standard decorator never receives the prototype or a descriptor; logic that mutates \`descriptor.value\` must become "return a new function".
- **Expecting parameter decorators or emitted types.** Standard decorators have neither (TS1206 for parameters, no \`design:type\` metadata); DI frameworks built on them still need the legacy flag.
- **Mutating inherited metadata.** \`context.metadata.x ??= []\` in a subclass finds and mutates the parent's array.
- **Assuming \`Symbol.metadata\` exists.** Add the lib (\`esnext.decorators\` or \`esnext\`) for the types and a polyfill for the run time where it is missing.
- **Forgetting field semantics.** With ES2022 class fields, a legacy property decorator that defines an accessor on the prototype is shadowed by the instance field (\`useDefineForClassFields\` is on by default at ES2022+); standard \`accessor\` fields are the intended replacement. I checked it: a legacy \`@upper name = "ada"\` decorator that defines an upper-casing accessor printed \`ada\` at ES2022 and \`ADA\` with \`--useDefineForClassFields false\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two systems:</strong> <span style="color:#f0e2c8;">TypeScript 5.0 implements standard TC39 decorators with no flag. The old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimentalDecorators</code> implementation, from an earlier proposal, is still there and switches the whole project to legacy semantics.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Signature:</strong> <span style="color:#f0e2c8;">Legacy member decorators get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(target, key, descriptor)</code> and mutate the prototype. Standard decorators get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(value, context)</code> and return a replacement; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">access</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addInitializer</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadata</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Capabilities:</strong> <span style="color:#f0e2c8;">Standard adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accessor</code> decorators and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addInitializer</code>, and field decorators return an initializer transform. It drops parameter decorators (TS1206) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitDecoratorMetadata</code>; metadata is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context.metadata</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.metadata</code> since 5.2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">Standard evaluates every decorator expression first, then applies static methods, instance methods, fields and finally the class. Legacy goes member by member. Both apply stacked decorators closest-first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;">Frameworks built on parameter decorators and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reflect-metadata</code> (many DI containers) still need the legacy flag. New decorators I write use the standard form, which works without the flag and matches the JavaScript standard.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use both kinds in one project?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in one compilation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimentalDecorators</code> changes how every decorator in the program is type-checked and emitted (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__decorate</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__esDecorate</code>), so a project or package picks one mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write a field decorator in the standard system?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClassFieldDecoratorContext</code>, and returns a function that receives the initial value and returns the value to use, called for each instance. To intercept later reads and writes, use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accessor</code> field instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bind a method to the instance with a standard decorator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context.addInitializer(function () { this[context.name] = this[context.name].bind(this); })</code>; method initializers run for each instance before any field initializer (checked: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">method initializer</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field x initializer</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor body</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reflect-metadata</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context.metadata</code>, a per-class object shared by its decorators and exposed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class[Symbol.metadata]</code>. It holds what decorators write into it, but TypeScript emits no design-time type information, so it is not a drop-in replacement for constructor-injection metadata.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a legacy property decorator stop working when you move to target ES2022?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At ES2022 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDefineForClassFields</code> defaults to true, so the instance field is defined on the object and shadows any getter/setter the decorator put on the prototype.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Decorator | A function applied with \`@expr\` to a class or member at class-definition time |
| Stage 3 (standard) decorators | TC39 decorators, TypeScript 5.0+, \`(value, context)\`, no flag |
| Legacy decorators | \`experimentalDecorators\`: \`(target, key, descriptor)\`, includes parameter decorators |
| Auto-accessor | An \`accessor\` field: a getter/setter pair over private storage, decoratable as a unit |
| \`addInitializer\` | Registers code to run per instance (members) or after definition (class) |

**Conclusion:** The two decorator systems share a syntax and almost nothing else. Legacy decorators receive the prototype and a descriptor and mutate them, support parameters and emitted type metadata, and need a flag that changes the whole project. Standard decorators, the default since TypeScript 5.0, receive a value and a context, return replacements, add \`accessor\` and \`addInitializer\`, get a metadata object since 5.2, and evaluate in a different order. New code should use the standard form; code built on parameter decorators and \`reflect-metadata\` stays on the legacy flag until its framework moves.`,
    examples: [
      {
        label: `Standard decorators on a class: method, field, accessor and class`,
        code: `// Standard (TC39 Stage 3) decorators: no compiler flag. Every decorator gets (value, context).
const log: string[] = [];

// Method decorator: receives the method, may return a replacement.
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
  const name = String(context.name);
  log.push("decorate method " + name + " (kind=" + context.kind + ", static=" + context.static + ")");
  return function (this: This, ...args: Args): R {
    log.push("call " + name + "(" + args.join(",") + ")");
    return target.call(this, ...args);
  };
}

// addInitializer: runs for every instance, at the start of construction.
function bound<This, T extends (this: This, ...args: any[]) => any>(_: T, context: ClassMethodDecoratorContext<This, T>) {
  context.addInitializer(function (this: This) {
    const self = this as Record<string | symbol, Function>;
    self[context.name] = self[context.name].bind(this);
  });
}

// Field decorator: the value is always undefined; return a function that maps the initial value.
function doubled(_: undefined, context: ClassFieldDecoratorContext<unknown, number>) {
  log.push("decorate field " + String(context.name));
  return (initial: number) => initial * 2;
}

// Auto-accessor decorator: wraps the generated get/set pair.
function tracked<This, V>(target: ClassAccessorDecoratorTarget<This, V>, context: ClassAccessorDecoratorContext<This, V>): ClassAccessorDecoratorResult<This, V> {
  return {
    get() {
      return target.get.call(this);
    },
    set(v) {
      log.push("set " + String(context.name) + " = " + v);
      target.set.call(this, v);
    },
  };
}

// Class decorator: receives the class itself.
function registered<C extends abstract new (...args: any) => any>(_: C, context: ClassDecoratorContext<C>) {
  log.push("decorate class " + context.name);
  context.addInitializer(() => log.push("class initializer: class is ready"));
}

@registered
class Counter {
  @doubled step = 5;
  @tracked accessor count = 0;

  @logged
  @bound
  inc(by: number) {
    this.count += by * this.step;
    return this.count;
  }
}
log.push("--- class defined, now using it");

const c = new Counter();
const detached = c.inc; // safe thanks to @bound
console.log(detached(1), c.step, c.count);
console.log(log.join("\\n"));`,
      },
      {
        label: `Decorator metadata and the inheritance trap`,
        code: `// Decorator metadata (TypeScript 5.2+): every decorator of a class shares context.metadata,
// which ends up on Class[Symbol.metadata]. lib ES2022 has no Symbol.metadata, so add the
// same declarations lib.esnext.decorators.d.ts has, plus a run-time stand-in.
declare global {
  interface SymbolConstructor { readonly metadata: unique symbol }
  interface Function { [Symbol.metadata]: DecoratorMetadata | null }
}
(Symbol as { metadata: symbol }).metadata ??= Symbol("Symbol.metadata");

// Naive version: reads an inherited array and pushes into the PARENT's list.
function columnNaive(type: string) {
  return function (_: undefined, context: ClassFieldDecoratorContext) {
    const cols = (context.metadata.columns ??= []) as string[];
    cols.push(String(context.name) + ":" + type);
  };
}
class User {
  @columnNaive("text") name = "";
}
class Admin extends User {
  @columnNaive("bool") root = false;
}
console.log(JSON.stringify(User[Symbol.metadata]), JSON.stringify(Admin[Symbol.metadata]));
console.log(Object.getPrototypeOf(Admin[Symbol.metadata]) === User[Symbol.metadata]);

// Fixed version: copy the inherited list into an own property before adding to it.
function column(type: string) {
  return function (_: undefined, context: ClassFieldDecoratorContext) {
    const meta = context.metadata;
    const own = Object.hasOwn(meta, "columns") ? (meta.columns as string[]) : [...((meta.columns as string[] | undefined) ?? [])];
    own.push(String(context.name) + ":" + type);
    meta.columns = own;
  };
}
class Post {
  @column("text") title = "";
}
class Draft extends Post {
  @column("date") due = "";
}
console.log(JSON.stringify(Post[Symbol.metadata]), JSON.stringify(Draft[Symbol.metadata]));`,
      },
      {
        label: `A legacy decorator under the standard semantics`,
        code: `// A legacy (experimentalDecorators) decorator does not fit the standard calling convention.
// Without the flag, TypeScript type-checks decorators against the standard signature.

const calls: string[] = [];

function legacyReadonly(target: any, key: string, descriptor: PropertyDescriptor) {
  calls.push("arg 1: " + typeof target + ", arg 2: " + typeof key + ", arg 3: " + typeof descriptor);
  descriptor.writable = false;
  return descriptor;
}

try {
  class Config {
    // @ts-expect-error TS1241: Unable to resolve signature of method decorator when called as an expression.
    @legacyReadonly
    load() {
      return "loaded";
    }
  }
  console.log(typeof Config);
} catch (e) {
  // The class never gets defined: the decorator crashed while the class was being built.
  console.log("class definition failed with", (e as Error).name);
}

// What the standard runtime really passed: (method, context object), no descriptor.
console.log(calls.join("\\n"));

// The standard way to get the same effect: return a replacement, or use addInitializer.
function frozenMethod<This, T extends (this: This, ...a: any[]) => any>(fn: T, context: ClassMethodDecoratorContext<This, T>) {
  context.addInitializer(function (this: This) {
    Object.defineProperty(this, context.name, { value: fn, writable: false });
  });
}
class SafeConfig {
  @frozenMethod
  load() {
    return "loaded";
  }
}
const s = new SafeConfig();
// The page runs in sloppy mode, so writing a non-writable property fails silently (strict mode would throw).
(s as { load: unknown }).load = () => "hacked";
console.log(s.load(), Object.getOwnPropertyDescriptor(s, "load")?.writable);`,
      },
    ],
  },
];

export default augments;
