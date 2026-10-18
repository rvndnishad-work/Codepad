/**
 * TYPESCRIPT ULTRA — batch 07: Generics (generics, generic constraints, default type
 * parameters, keyof and typeof, unions of object values). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are generics and why are they useful?`,
    difficulty: "medium",
    seoDescription: `Generics are type parameters like <T> that let one function, type or class work for many types while keeping them checked, unlike any.`,
    description: `**Question presented to candidate:**
"What are generics in TypeScript? Show me a function where a generic is better than \`any\`, and tell me where you see generics in everyday code."

**What a strong answer should cover:**
- A generic is a type parameter (\`<T>\`): a placeholder filled in per call or per use, so one piece of code works for many types without losing type information
- Why not \`any\`: \`any\` switches checking off for the result, while \`T\` links the input type to the output type (\`first<T>(items: T[]): T | undefined\`)
- Type arguments are usually inferred from the call, and can be passed explicitly (\`first<string>([])\`); a \`const\` result keeps a literal type
- Generics appear on functions, type aliases, interfaces and classes: \`Array<T>\`, \`Promise<T>\`, \`Map<K, V>\`, \`Result<T, E>\`, a \`Stack<T>\`
- Generics are erased: they do not exist at run time, so you cannot \`new T()\` or check \`typeof T\`
- Rule of thumb: a type parameter should appear at least twice (relate two things); otherwise a plain type is simpler

**Code / implementation expected:** Yes — a small generic function (identity, first, pair) and ideally a generic interface or class.`,
    answer: `**Target Audience:** Developers who can write basic TypeScript types and keep meeting \`<T>\` in library code.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a parcel locker at a train station. The locker does not care what you put inside: a book, a cake, a laptop. But it does make one promise: **whatever you put in is exactly what you get back out**. Put in a cake, take out a cake, never a surprise laptop.

Now imagine two ways to describe that locker in code:

- "It holds *anything* and returns *anything*." That is \`any\`. True, but useless: when you open it, nobody can tell you what is inside.
- "It holds *some type T*, and returns *that same T*." That is a **generic**. The locker still works for every type, but the promise "same thing back" is now written down, so the compiler can check it.

Generics are how TypeScript writes down "the same type, whatever it turns out to be". \`Array<T>\`, \`Promise<T>\`, \`Map<K, V>\`, React's \`useState<S>\` — most of the library code you use every day is generic.

## 2. The Problem Generics Solve

Here is a "first element" helper written with \`any\`:

~~~ts
function firstAny(items: any[]): any {
  return items[0];
}
const a = firstAny([1, 2, 3]);
a.toUpperCase(); // tsc is happy; at run time: TypeError
~~~

The compiler accepts \`a.toUpperCase()\` although \`a\` is the number \`1\`, because \`any\` turns checking off. The example runs it inside \`try\` and prints \`crashed at run time: true\`.

The generic version:

~~~ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const n = first([1, 2, 3]);     // n: number | undefined
const s = first(["x", "y"]);    // s: string | undefined
~~~

\`<T>\` declares a **type parameter**. When you call \`first([1, 2, 3])\`, TypeScript sees that \`items\` is a \`number[]\`, so \`T\` is \`number\`, so the result is \`number | undefined\`. Now the mistake is caught:

~~~text
error TS2339: Property 'toUpperCase' does not exist on type 'number'.
~~~

📌 **Interview term: generic / type parameter** — a placeholder type, written in angle brackets (\`<T>\`), that the caller fills in. It lets one function, class or type work for many types while keeping the relationship between them.

📌 **Interview term: type argument** — the concrete type that fills a parameter for one use: in \`first<string>(...)\` the argument is \`string\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="With any the input type is lost: number array goes in, any comes out">
  <rect class="d-box-muted" x="30" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="105" y="115" text-anchor="middle">number[]</text>
  <rect class="d-box" x="245" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="320" y="108" text-anchor="middle">firstAny</text>
  <text class="d-sub" x="320" y="128" text-anchor="middle">any[] to any</text>
  <rect class="d-box-muted" x="460" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="535" y="115" text-anchor="middle">any</text>
  <line class="d-edge" x1="180" y1="110" x2="243" y2="110"/>
  <line class="d-edge-dashed" x1="395" y1="110" x2="458" y2="110"/>
</svg>

With \`any\`, a \`number[]\` goes in and \`any\` comes out: whatever the compiler knew about the input is gone by the time you use the result.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="With a generic T is inferred as number from the input and the same T comes out">
  <rect class="d-box" x="30" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="105" y="115" text-anchor="middle">number[]</text>
  <rect class="d-box-accent" x="245" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="320" y="108" text-anchor="middle">first</text>
  <text class="d-sub" x="320" y="128" text-anchor="middle">T[] to T</text>
  <rect class="d-box" x="460" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="535" y="115" text-anchor="middle">number</text>
  <line class="d-edge-accent" x1="180" y1="110" x2="243" y2="110"/>
  <line class="d-edge-accent" x1="395" y1="110" x2="458" y2="110"/>
  <text class="d-accent" x="320" y="45" text-anchor="middle">T = number</text>
</svg>

With a generic, the compiler works out \`T = number\` from the argument and carries that same \`T\` to the return type. (The \`| undefined\` part is left off the picture: an empty array has no first element.)

## 3. Inference and Explicit Type Arguments

Most of the time you never write the type argument; the compiler infers it from the values you pass. You can still write it when there is nothing to infer from, or when you want the compiler to check the arguments against a type you chose:

~~~ts
const e = first<string>([]);   // string | undefined, from an empty array
first<string>([1]);            // error
~~~

~~~text
error TS2322: Type 'number' is not assignable to type 'string'.
~~~

Inference follows the usual widening rules (see [How does type inference work in TypeScript?](/interview-question/how-does-type-inference-work-in-typescript)): \`const lit = identity("hi")\` has type \`"hi"\`, while \`let wide = identity("hi")\` has type \`string\`. The second example proves both with compile-time checks. To keep literal types from arrays and objects written in the call, TypeScript 5.0 added \`const\` type parameters ([InfoWorld on TypeScript 5.0](https://www.infoworld.com/article/2337886/whats-new-in-typescript-50.html)); they have their own page, [What are \`const\` type parameters?](/interview-question/what-are-const-type-parameters-const-t-and-why-are-they-better-than-as-const)

📌 **Interview term: type argument inference** — the compiler choosing the type arguments of a call by matching the parameter types against the argument types.

## 4. Several Type Parameters, and Generics Beyond Functions

A function can take several parameters. \`pair<A, B>(a: A, b: B): [A, B]\` returns \`[string, number]\` for \`pair("id", 42)\`.

The same angle brackets work on every kind of type declaration:

| Where | Example | Used as |
| :--- | :--- | :--- |
| Function | \`function first<T>(items: T[]): T \\| undefined\` | \`first([1, 2])\` |
| Type alias | \`type Result<T, E = string> = { ok: true; value: T } \\| { ok: false; error: E }\` | \`Result<number>\` |
| Interface | \`interface ApiResponse<T> { status: number; data: T }\` | \`ApiResponse<User[]>\` |
| Class | \`class Stack<T> { push(item: T): void; pop(): T \\| undefined }\` | \`new Stack<number>()\` |
| Function type | \`type Mapper = <In, Out>(items: In[], fn: (x: In) => Out) => Out[]\` | \`map(words, s => s.length)\` |

A generic type such as \`Result\` is a template, not a type you can use on its own: \`Result<number>\` is a real type. The \`E = string\` part is a **default**, covered in [Can generics have default types?](/interview-question/can-generics-have-default-types).

The \`Stack<number>\` in the second example rejects \`nums.push("three")\`:

~~~text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

## 5. Generics Are Erased

Type parameters exist only for the compiler. After compiling, \`function first<T>(items: T[])\` is just \`function first(items)\`; the example prints \`false\` for "does the emitted code contain \`<T>\`". Two consequences:

- You cannot do anything with \`T\` at run time: no \`new T()\`, no \`typeof T\`, no \`if (T is string)\`. If you need the type at run time, pass a value in (a constructor, a validator, a tag). A constructor parameter is shown in [What are generic constraints?](/interview-question/what-are-generic-constraints).
- A compile error does not stop the code from running. In the second example, \`nums.push("three")\` was rejected by tsc, but the JavaScript still ran and \`pop()\` printed \`three\`.

📌 **Interview term: type erasure** — types, including type parameters, are removed when TypeScript compiles to JavaScript, so they cannot affect run-time behaviour.

## 6. When Not to Use a Generic

A type parameter earns its place when it **relates** two things: an input to an output, two inputs to each other, an element to its container. If \`T\` appears only once, it relates nothing:

~~~ts
function log<T>(x: T): void { console.log(x); }   // T used once: pointless
function log(x: unknown): void { console.log(x); } // same safety, simpler
~~~

The other common mistake is the reverse: returning \`any\` from a helper (as \`JSON.parse\` does) when a generic or \`unknown\` would keep the caller safe. The trade-off between the two "top" types is in [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown).

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(26,24): error TS2339: Property 'toUpperCase' does not exist on type 'number'.
main.ts(32,39): error TS2322: Type 'number' is not assignable to type 'string'.
~~~

and for example 2:

~~~text
main.ts(40,11): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

Example 1, \`any\` versus a generic, prints:

~~~text
crashed at run time: true
1 X true true
true
["id",42] true
false
~~~

Example 2, generic types, interfaces and classes, prints:

~~~text
43
not a number: abc
Ada
three 2
true true
[1,2,3] true
~~~

The \`true\` values are compile-time \`Equal\` checks (for example "\`first([1, 2, 3])\` has type \`number | undefined\`") that tsc verified before the code ran.

## Common Pitfalls

- **Reaching for \`any\` instead.** \`any\` compiles everything and catches nothing; a generic keeps the input-output relationship checked.
- **A type parameter used only once.** \`<T>(x: T): void\` is just \`(x: unknown): void\` with extra noise. Use a generic to relate two positions.
- **Expecting \`T\` at run time.** Generics are erased: \`new T()\` and \`typeof T\` do not exist. Pass a constructor or a validator as a value instead.
- **Using members \`T\` may not have.** Inside \`<T>\` you know nothing about \`T\`; \`x.length\` fails until you add a constraint (\`T extends { length: number }\`). See [What are generic constraints?](/interview-question/what-are-generic-constraints).
- **Return-type-only generics.** \`parse<T>(s: string): T\` compiles, but \`T\` is a promise you make with no check behind it; it is an assertion in disguise. Validate the data, or default \`T\` to \`unknown\`.
- **Over-specifying type arguments.** Writing \`first<number>([1, 2])\` everywhere adds nothing; let inference do it and write arguments only where there is nothing to infer from.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A generic is a <strong style="color:#ffca28;">type parameter</strong>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T&gt;</code>, that the caller fills in. It lets one function, type or class work for many types while keeping track of which type it is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not any:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> the result type is lost and errors slip through. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first&lt;T&gt;(items: T[]): T | undefined</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number | undefined</code> for a number array, so misuse is caught.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inference:</strong> <span style="color:#f0e2c8;">I rarely write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;number&gt;</code> myself: TypeScript infers the type argument from the arguments. I write it explicitly when there is nothing to infer from, like an empty array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Everywhere:</strong> <span style="color:#f0e2c8;">The standard library is built on them: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array&lt;T&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map&lt;K, V&gt;</code>. In app code I write things like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ApiResponse&lt;T&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Result&lt;T, E&gt;</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack&lt;T&gt;</code> class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Generics are erased at run time, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new T()</code>. And a type parameter should appear at least twice, linking an input to an output; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> or a plain type is simpler.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function f(x: unknown): unknown</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function f&lt;T&gt;(x: T): T</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both accept anything, but the generic remembers what came in: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(5)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> version forgets, so the caller has to narrow the result again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new T()</code> inside a generic function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Types are erased, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> does not exist when the code runs. Take the constructor as a value instead: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function create&lt;T&gt;(Ctor: new () =&gt; T): T { return new Ctor(); }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function f&lt;T&gt;(x: T)</code>, why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x.length</code> fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> could be any type, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>, which has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code>. Add a <strong style="color:#ffca28;">constraint</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends { length: number }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const x = identity("hi")</code> infer, compared with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> the type is the literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"hi"</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> it widens to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, just as it would without the function. For arrays and objects written in the call, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameter (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;const T&gt;</code>, added in TypeScript 5.0) keeps the literal types the way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> would.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function parse&lt;T&gt;(s: string): T</code> a good API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It looks typed but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> appears only in the return, so it is an unchecked cast chosen by the caller. Prefer returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> and validating, or take a validator function that produces the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Generic / type parameter | A placeholder type such as \`<T>\` that the caller fills in |
| Type argument | The concrete type filling a parameter for one use, as in \`first<string>\` |
| Type argument inference | The compiler choosing type arguments from the call arguments |
| Type erasure | Types are removed at compile time and do not exist at run time |

**Conclusion:** Generics let you write code once and keep it type-safe for every type it is used with. Instead of throwing type information away with \`any\`, a type parameter records a relationship — "the element that comes out is the element type that went in" — and the compiler checks it at each call, usually inferring the type argument for you. They are everywhere in the standard library and in good application code, they cost nothing at run time because they are erased, and their natural next steps are [constraints](/interview-question/what-are-generic-constraints) (what \`T\` must have), [defaults](/interview-question/can-generics-have-default-types) (what \`T\` is when nobody says) and the \`keyof\` patterns in [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript).`,
    examples: [
      {
        label: `any versus a generic: inference and explicit type arguments`,
        code: `// Equal<A, B> is true only when A and B are the same type (checked by tsc).
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Without generics: any switches the checker off for the result.
function firstAny(items: any[]): any {
  return items[0];
}
const a = firstAny([1, 2, 3]);
// tsc accepts this call although a is a number: any lets everything through.
try {
  a.toUpperCase();
} catch (e) {
  console.log("crashed at run time:", e instanceof TypeError);
}

// With a generic: T is a type parameter, filled in by the caller.
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const n = first([1, 2, 3]);
const s = first(["x", "y"]);
const okN: Equal<typeof n, number | undefined> = true;
const okS: Equal<typeof s, string | undefined> = true;
// Wrapped in an arrow that is never called, so only the checker sees it.
// @ts-expect-error Property 'toUpperCase' does not exist on type 'number'.
const wrong = () => n?.toUpperCase();
console.log(n, s?.toUpperCase(), okN, okS);

// You can also pass the type argument explicitly.
const e = first<string>([]);
// @ts-expect-error Type 'number' is not assignable to type 'string'.
const wrongArg = () => first<string>([1]);
console.log(e === undefined);

// T links the input to the output: one type, used twice.
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const p = pair("id", 42);
const okP: Equal<typeof p, [string, number]> = true;
console.log(JSON.stringify(p), okP);

// Types are erased: the emitted JavaScript has no <T> left in it.
console.log(first.toString().includes("<T>"));`,
      },
      {
        label: `Generic type aliases, interfaces and classes`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A generic type alias: Result is a template, Result<number> a real type.
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parseAge(input: string): Result<number> {
  const n = Number(input);
  return Number.isInteger(n) ? { ok: true, value: n } : { ok: false, error: "not a number: " + input };
}
const r1 = parseAge("42");
const r2 = parseAge("abc");
if (r1.ok) console.log(r1.value + 1);
if (!r2.ok) console.log(r2.error);

// A generic interface.
interface ApiResponse<T> {
  status: number;
  data: T;
}
const res: ApiResponse<{ name: string }[]> = { status: 200, data: [{ name: "Ada" }] };
console.log(res.data[0].name);

// A generic class: one Stack implementation, any element type.
class Stack<T> {
  private items: T[] = [];
  push(item: T): void {
    this.items.push(item);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
  get size(): number {
    return this.items.length;
  }
}
const nums = new Stack<number>();
nums.push(1);
nums.push(2);
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'.
nums.push("three");
console.log(nums.pop(), nums.size);

// Inference picks the literal type for a const, the wider type for a let.
function identity<T>(x: T): T {
  return x;
}
const lit = identity("hi");
let wide = identity("hi");
const okLit: Equal<typeof lit, "hi"> = true;
const okWide: Equal<typeof wide, string> = true;
console.log(okLit, okWide);

// A generic function type, and a higher-order generic: map over any array.
type Mapper = <In, Out>(items: In[], fn: (x: In) => Out) => Out[];
const map: Mapper = (items, fn) => items.map(fn);
const lengths = map(["a", "bb", "ccc"], (s) => s.length);
const okMap: Equal<typeof lengths, number[]> = true;
console.log(JSON.stringify(lengths), okMap);`,
      },
    ],
  },
  {
    title: `What are generic constraints?`,
    difficulty: "medium",
    seoDescription: `Generic constraints (T extends X) limit a type parameter so the body can use its members, power K extends keyof T, and keep the caller type.`,
    description: `**Question presented to candidate:**
"What is a generic constraint? Write a function that only accepts things with a \`length\`, and a \`getProperty(obj, key)\` that rejects keys the object does not have."

**What a strong answer should cover:**
- \`T extends X\` sets an upper bound: \`T\` can be \`X\` or any subtype of it, and inside the function you may use the members \`X\` guarantees
- Without a constraint, \`x.length\` on a \`T\` is an error; with \`T extends { length: number }\` it is allowed, and the caller type (string, array) is still preserved in the return
- Constraints can refer to other type parameters: \`K extends keyof T\`, returning \`T[K]\`
- Why a constraint beats a plain parameter type: \`(x: HasId) => HasId\` forgets extra fields, \`<T extends HasId>(x: T) => T\` keeps them
- The classic error: returning \`{ id: 0 }\` as \`T\` fails because \`T\` "could be instantiated with a different subtype of constraint"
- Variants: \`T extends object\`, unions (\`T extends string | number\`), intersections for several requirements, constructor types (\`new () => T\`)

**Code / implementation expected:** Yes — a \`longest\` or \`getProperty\` with a constraint, and the error it prevents.`,
    answer: `**Target Audience:** Developers who know what \`<T>\` means and want to make generics that can actually do something with \`T\`.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

If generics themselves are new, start with [What are generics and why are they useful?](/interview-question/what-are-generics-and-why-are-they-useful); this page assumes you can read \`function first<T>(items: T[]): T | undefined\`.

## 1. Why This Even Matters — A Story First

A car-rental desk will rent you *any* car, which sounds very flexible. But to rent it to you, they need one thing: **a driving licence**. They do not care whether you are a student, a pilot or a chef; they only check that you hold a licence, and once they know that, they can hand you the keys.

A plain generic \`<T>\` is a rental desk with no rules: it accepts anyone, so it can safely do *nothing* specific with them. A **constraint** is the licence check: "\`T\` can be anything, as long as it has a \`length\`". Callers keep their freedom, and the function gets just enough knowledge to do its job.

## 2. The Problem: an Unconstrained T Knows Nothing

~~~ts
function lengthOf<T>(x: T): number {
  return x.length;
}
~~~

~~~text
error TS2339: Property 'length' does not exist on type 'T'.
~~~

The compiler is right: \`T\` could be \`number\` or \`boolean\`, which have no \`length\`. Inside a generic function you may only use what is true of **every** possible \`T\`.

## 3. The Fix: \`extends\` Sets a Minimum

~~~ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest("apple", "fig");        // "apple"   T = string
longest([1, 2], [1, 2, 3]);     // [1, 2, 3] T = number[]
longest(10, 20);                // error
~~~

~~~text
error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
~~~

Read \`T extends { length: number }\` as "\`T\` is assignable to \`{ length: number }\`" — any type that has at least a numeric \`length\`. Inside the function, \`a.length\` is allowed. Outside, the return type is still the caller's own type: the example proves \`longest([1, 2], [1, 2, 3])\` is \`number[]\`, not \`{ length: number }\`.

📌 **Interview term: generic constraint** — \`T extends X\` in a type parameter list. It limits which type arguments are accepted to \`X\` and its subtypes, and lets the body use the members \`X\` guarantees.

📌 **Interview term: upper bound** — another name for the constraint type: \`T\` may be as specific as the caller likes, but never wider than \`X\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="The constraint has length number contains string, arrays and objects with length; number and boolean fall outside">
  <rect class="d-box-accent" x="40" y="40" width="380" height="220" rx="16"/>
  <text class="d-accent" x="230" y="75" text-anchor="middle">T extends length: number</text>
  <rect class="d-box" x="70" y="110" width="140" height="50" rx="10"/>
  <text class="d-text" x="140" y="140" text-anchor="middle">string</text>
  <rect class="d-box" x="250" y="110" width="140" height="50" rx="10"/>
  <text class="d-text" x="320" y="140" text-anchor="middle">number[]</text>
  <rect class="d-box" x="130" y="190" width="200" height="50" rx="10"/>
  <text class="d-text" x="230" y="220" text-anchor="middle">length: 3, name</text>
  <rect class="d-box-muted" x="470" y="80" width="130" height="50" rx="10"/>
  <text class="d-text" x="535" y="110" text-anchor="middle">number</text>
  <rect class="d-box-muted" x="470" y="180" width="130" height="50" rx="10"/>
  <text class="d-text" x="535" y="210" text-anchor="middle">boolean</text>
</svg>

Everything inside the large box can be passed as \`T\`: strings, arrays and any object with a numeric \`length\`. \`number\` and \`boolean\` sit outside the box and are rejected at the call site.

## 4. Constraints That Use Another Type Parameter: \`K extends keyof T\`

The most common constraint in real code links two parameters:

~~~ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 7, name: "Ada", admin: true };
getProperty(user, "id");      // number
getProperty(user, "admin");   // boolean
getProperty(user, "email");   // error
~~~

~~~text
error TS2345: Argument of type '"email"' is not assignable to parameter of type '"id" | "name" | "admin"'.
~~~

\`keyof T\` is the union of \`T\`'s property names, and \`T[K]\` is the type of the property at \`K\`. Together they give a lookup function that knows both which keys exist and what each one returns. Both operators have their own pages: [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript) and [What are indexed access types?](/interview-question/what-are-indexed-access-types).

## 5. Why Not Just Use the Constraint as the Parameter Type?

You might ask: if \`T\` must have an \`id\`, why not write \`(x: HasId)\`? Because a plain parameter type **forgets** what the caller gave you:

~~~ts
type HasId = { id: number };
function touchPlain(x: HasId): HasId { return x; }
function touch<T extends HasId>(x: T): T { return x; }

const order = { id: 1, total: 99.5 };
touchPlain(order).total;   // error: Property 'total' does not exist on type 'HasId'.
touch(order).total;        // 99.5, type { id: number; total: number }
~~~

Use a constraint when the function **returns** (or passes on) the value and the caller should get its full type back. If the function only reads \`x.id\` and returns something else, the plain type is simpler and just as safe.

The same reasoning applies to \`withTimestamp<T extends object>(x: T): T & { at: string }\`: spreading \`x\` keeps every field, and the return type says so. \`T extends object\` also rejects primitives — \`withTimestamp(5)\` fails with \`Argument of type 'number' is not assignable to parameter of type 'object'.\`

## 6. The Error Everyone Hits: "Could Be Instantiated With a Different Subtype"

~~~ts
function makeDefault<T extends HasId>(): T {
  return { id: 0 };
}
~~~

~~~text
error TS2322: Type '{ id: number; }' is not assignable to type 'T'.
  '{ id: number; }' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'HasId'.
~~~

The constraint is a **minimum**, not the type itself. A caller could write \`makeDefault<{ id: number; total: number }>()\` and would then expect a \`total\` that \`{ id: 0 }\` does not have. The fix is to return the constraint type (\`(): HasId\`), take a value to copy from, or take a factory function. Casting with \`as T\` silences the error but is exactly the lie the compiler was warning about.

📌 **Interview term: "could be instantiated with a different subtype"** — TS2322's explanation that a value matching the constraint is not necessarily a \`T\`, because \`T\` may be any narrower subtype the caller chooses.

## 7. More Kinds of Constraint

| Constraint | Accepts | Typical use |
| :--- | :--- | :--- |
| \`T extends { length: number }\` | strings, arrays, objects with \`length\` | size comparisons |
| \`K extends keyof T\` | only keys of \`T\` | property lookup, \`pluck\`, \`sortBy\` |
| \`T extends object\` | any non-primitive | merging, spreading, freezing |
| \`T extends string \\| number\` | those primitives and their literals | keys, IDs |
| \`T extends HasId & Named\` | values with both shapes | several requirements at once |
| \`Ctor: new () => T\` | a class you can construct | factories, dependency injection |

An inferred \`T\` is not subject to excess-property checks against the constraint: \`label({ id: 3, name: "Lin", role: "dev" })\` compiles because \`T\` becomes the whole literal type, which is a subtype of \`HasId & Named\`. Constraints also appear in [conditional types](/interview-question/what-are-conditional-types), where \`T extends X ? A : B\` is a test rather than a requirement.

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(6,12): error TS2339: Property 'length' does not exist on type 'T'.
main.ts(21,9): error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
main.ts(33,19): error TS2345: Argument of type '"email"' is not assignable to parameter of type '"id" | "name" | "admin"'.
main.ts(41,7): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
~~~

and for example 2:

~~~text
main.ts(17,3): error TS2339: Property 'total' does not exist on type 'HasId'.
main.ts(24,3): error TS2322: Type '{ id: number; }' is not assignable to type 'T'.
  '{ id: number; }' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'HasId'.
main.ts(33,15): error TS2345: Argument of type 'number' is not assignable to parameter of type 'object'.
~~~

Example 1, basic constraints and \`K extends keyof T\`, prints:

~~~text
apple [1,2,3]
true
7 true true
k_a k_1
~~~

Example 2, constraints that keep the caller type, prints:

~~~text
99.5 true
{"id":1,"total":99.5,"at":"2024-01-01"}
3:Lin
0 true true
~~~

## Common Pitfalls

- **Using members without a constraint.** Inside \`<T>\` nothing is known; add \`extends\` for each member you need.
- **Constraining when a plain type would do.** If the function never returns or forwards \`T\`, \`(x: HasId)\` is simpler than \`<T extends HasId>(x: T)\`.
- **Building a \`T\` from scratch.** \`return { id: 0 }\` is not a \`T\`; the caller may have chosen a wider subtype. Return the constraint type, or take a factory.
- **Silencing TS2322 with \`as T\`.** The cast hides exactly the bug the message describes.
- **Expecting constraints to check at run time.** They are erased like every type; \`longest(10, 20)\` was rejected by tsc, but if it ran it would quietly compare \`undefined\` lengths.
- **Confusing \`extends\` in a parameter list with \`extends\` in a conditional type.** \`<T extends X>\` is a requirement on callers; \`T extends X ? A : B\` is a test that picks a branch.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A constraint is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends X</code> on a type parameter. It says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> can be any type, as long as it is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code>, so the function body may use what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code> guarantees.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Example:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">longest&lt;T extends { length: number }&gt;(a: T, b: T): T</code> can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.length</code>, accepts strings and arrays, rejects numbers, and still returns the caller type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. keyof:</strong> <span style="color:#f0e2c8;">The workhorse is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof T</code> with return type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K]</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getProperty(user, "id")</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> and an unknown key is a compile error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why generic:</strong> <span style="color:#f0e2c8;">Compared with a plain parameter type, a constrained <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> keeps the extra fields of the argument in the return type instead of forgetting them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotcha:</strong> <span style="color:#f0e2c8;">The constraint is a lower limit, not the type: returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id: 0 }</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> fails because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> could be a wider subtype. I return the constraint type or take a factory instead of casting.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T</code> could be instantiated with a different subtype of constraint" mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The value you return satisfies the constraint, but the caller picks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> and may pick something with more properties. So a constraint-shaped value is not necessarily a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;T extends HasId&gt;(x: T): T</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(x: HasId): HasId</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the caller needs its own type back, such as a helper that tags and returns an entity. If the function only reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x.id</code>, the plain parameter type is clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you require several things of one type parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Intersect them in one constraint: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends HasId &amp; Named</code>. Each type parameter has one constraint, but it can be any type, including an intersection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a type you can construct inside a generic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the class as a value with a constructor type: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function create&lt;T&gt;(Ctor: new () =&gt; T): T</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create(Counter)</code> infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T extends string</code> in a parameter list mean the same as in a conditional type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The keyword is the same but the role differs: in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T extends string&gt;</code> it rejects callers whose type does not fit; in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends string ? A : B</code> it is a question that selects a branch, and on a bare type parameter it distributes over unions.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Generic constraint | \`T extends X\`: only \`X\` and its subtypes are accepted, and the body may use \`X\` members |
| Upper bound | The constraint type: the widest type \`T\` may be |
| "Could be instantiated with a different subtype" | TS2322 note: a constraint-shaped value is not necessarily a \`T\` |

**Conclusion:** A constraint is the middle ground between "any type, but I can do nothing with it" and "one fixed type, and I lose the caller type". With \`T extends X\` the function gets the members it needs, callers still pass their own richer types and get them back, and patterns such as \`K extends keyof T\` turn property access into something the compiler checks end to end. Remember that the constraint is a minimum: values you build inside the function are not automatically a \`T\`. Next steps are [default type parameters](/interview-question/can-generics-have-default-types) and the \`keyof\` / \`typeof\` operators in [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript).`,
    examples: [
      {
        label: `Constraints: length, K extends keyof T and unions`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Unconstrained: T could be anything, so nothing is known about it.
function lengthOf<T>(x: T): number {
  // @ts-expect-error Property 'length' does not exist on type 'T'.
  return x.length;
}

// Constrained: T must have a numeric length, so x.length is allowed.
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
const w = longest("apple", "fig");
const arr = longest([1, 2], [1, 2, 3]);
console.log(w, JSON.stringify(arr));
// The result keeps the caller type, not just { length: number }.
const okArr: Equal<typeof arr, number[]> = true;
console.log(okArr);

// @ts-expect-error Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
longest(10, 20);

// A constraint that refers to another type parameter: K must be a key of T.
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 7, name: "Ada", admin: true };
const id = getProperty(user, "id");
const admin = getProperty(user, "admin");
const okId: Equal<typeof id, number> = true;
console.log(id, admin, okId);
// @ts-expect-error Argument of type '"email"' is not assignable to parameter of type '"id" | "name" | "admin"'.
getProperty(user, "email");

// Constraints to primitives or a union of them.
function toKey<T extends string | number>(x: T): string {
  return "k_" + x;
}
console.log(toKey("a"), toKey(1));
// @ts-expect-error Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
toKey(true);`,
      },
      {
        label: `Keeping the caller type and the different subtype error`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type HasId = { id: number };

// Plain parameter type: the extra fields are forgotten in the return type.
function touchPlain(x: HasId): HasId {
  return x;
}
// Constrained generic: the caller type flows through unchanged.
function touch<T extends HasId>(x: T): T {
  return x;
}
const order = { id: 1, total: 99.5 };
const p = touchPlain(order);
const g = touch(order);
// @ts-expect-error Property 'total' does not exist on type 'HasId'.
p.total;
const okG: Equal<typeof g, { id: number; total: number }> = true;
console.log(g.total, okG);

// The constraint is a lower bound, not the type: T may be a bigger subtype.
function makeDefault<T extends HasId>(): T {
  // @ts-expect-error 'T' could be instantiated with a different subtype of constraint 'HasId'.
  return { id: 0 };
}

// Spreading a T keeps T in the result, so adding fields is safe.
function withTimestamp<T extends object>(x: T): T & { at: string } {
  return { ...x, at: "2024-01-01" };
}
console.log(JSON.stringify(withTimestamp(order)));
// @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'object'.
withTimestamp(5);

// Several requirements at once: intersect them in one constraint.
type Named = { name: string };
function label<T extends HasId & Named>(x: T): string {
  return x.id + ":" + x.name;
}
console.log(label({ id: 3, name: "Lin", role: "dev" }));

// A constraint on a constructor: T must be a class you can new up.
function create<T>(Ctor: new () => T): T {
  return new Ctor();
}
class Counter {
  count = 0;
}
const c = create(Counter);
const okC: Equal<typeof c, Counter> = true;
console.log(c.count, c instanceof Counter, okC);`,
      },
    ],
  },
  {
    title: `Can generics have default types?`,
    difficulty: "medium",
    seoDescription: `Yes: <T = Default>. The rules for defaults, how they interact with inference and constraints, and why TypeScript has no partial inference.`,
    description: `**Question presented to candidate:**
"Can a generic type parameter have a default? How does that interact with inference and with constraints, and where have you seen defaults used?"

**What a strong answer should cover:**
- Yes: \`interface Box<T = string>\` — writing \`Box\` alone means \`Box<string>\`; defaults arrived in TypeScript 2.3
- Rules: a parameter with a default is optional, required parameters cannot follow optional ones (TS2706), a default must satisfy its constraint (TS2344), and a default may refer to earlier parameters (\`<T, C = T[]>\`)
- For function calls, inference wins: the default only applies when there is nothing to infer from (\`box()\` vs \`box(10)\`); with neither, \`T\` becomes \`unknown\`
- No partial inference: pass one type argument explicitly and the rest come from their defaults, not from the arguments
- Good defaults: \`unknown\` for parse/fetch helpers, a loose event map for an emitter, React typings such as \`useState<S = undefined>()\`

**Code / implementation expected:** Optional — a generic interface or function with a default, and one call where inference overrides it.`,
    answer: `**Target Audience:** Developers who write generic types and want them easy to use without type arguments everywhere.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022). Defaults themselves arrived in TypeScript 2.3 ([TypeScript 2.3 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html)).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

Generics are introduced in [What are generics and why are they useful?](/interview-question/what-are-generics-and-why-are-they-useful) and constraints in [What are generic constraints?](/interview-question/what-are-generic-constraints); this page is about the \`= Default\` part.

## 1. Why This Even Matters — A Story First

At a coffee shop, "a coffee, please" gets you a medium filter coffee. You *can* say "a large oat-milk flat white", but you do not have to: the shop has a **sensible default** for everything you leave out.

A generic type without defaults is a shop that refuses to serve until you specify every detail. A **default type parameter** is the house standard: say nothing and you get the common case; say more and you get exactly what you asked for.

## 2. The Syntax: \`<T = Default>\`

~~~ts
interface Box<T = string> {
  value: T;
}
const b1: Box = { value: "hello" };       // Box<string>
const b2: Box<number> = { value: 42 };     // explicit argument wins
const b3: Box = { value: 1 };              // error
~~~

~~~text
error TS2322: Type 'number' is not assignable to type 'string'.
~~~

Without a default, leaving the argument out is an error on a type:

~~~text
error TS2314: Generic type 'Pair<T>' requires 1 type argument(s).
~~~

📌 **Interview term: default type parameter** — \`<T = D>\`: if no type argument is given and none can be inferred, \`T\` is \`D\`. A parameter with a default is optional.

## 3. The Rules

| Rule | Example | Error when broken |
| :--- | :--- | :--- |
| Optional parameters come last | \`type Wrong<A = string, B> = [A, B]\` | \`TS2706: Required type parameters may not follow optional type parameters.\` |
| A default must satisfy the constraint | \`type BadKeyed<K extends string = number> = K\` | \`TS2344: Type 'number' does not satisfy the constraint 'string'.\` |
| A default may use earlier parameters | \`type Collection<T, C = T[]>\` | — (\`Collection<number>["items"]\` is \`number[]\`) |
| Constraint and default together | \`type Keyed<K extends string = "id">\` | — (\`Keyed\` is \`{ id: number }\`) |

The order is always **constraint first, then default**: \`<K extends string = "id">\`.

## 4. Defaults and Inference: Which One Wins?

For a type you write in an annotation there is nothing to infer, so a missing argument uses the default. For a **function call**, TypeScript first tries to infer from the arguments, and only falls back to the default when inference finds nothing:

~~~ts
function box<T = string>(value?: T): Box<T | undefined> {
  return { value };
}
box(10);   // Box<number | undefined>  inferred from 10
box();     // Box<string | undefined>  nothing to infer: default
~~~

And if there is no default either, an un-inferable \`T\` becomes \`unknown\`: \`emptyList<T>(): T[]\` called as \`emptyList()\` returns \`unknown[]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 320" role="img" aria-label="How T is chosen for a call: an explicit argument first, then inference from arguments, then the default, then unknown">
  <rect class="d-box-accent" x="30" y="40" width="190" height="60" rx="10"/>
  <text class="d-text" x="125" y="66" text-anchor="middle">explicit argument</text>
  <text class="d-sub" x="125" y="86" text-anchor="middle">box of number</text>
  <rect class="d-box" x="460" y="40" width="190" height="60" rx="10"/>
  <text class="d-text" x="555" y="66" text-anchor="middle">inferred</text>
  <text class="d-sub" x="555" y="86" text-anchor="middle">box(10)</text>
  <rect class="d-box" x="460" y="220" width="190" height="60" rx="10"/>
  <text class="d-text" x="555" y="246" text-anchor="middle">default</text>
  <text class="d-sub" x="555" y="266" text-anchor="middle">box()</text>
  <rect class="d-box-muted" x="30" y="220" width="190" height="60" rx="10"/>
  <text class="d-text" x="125" y="246" text-anchor="middle">unknown</text>
  <text class="d-sub" x="125" y="266" text-anchor="middle">no default either</text>
  <line class="d-edge" x1="220" y1="70" x2="458" y2="70"/>
  <text class="d-sub" x="340" y="58" text-anchor="middle">none given</text>
  <line class="d-edge" x1="555" y1="100" x2="555" y2="218"/>
  <text class="d-sub" x="535" y="165" text-anchor="end">no candidates</text>
  <line class="d-edge-dashed" x1="460" y1="250" x2="222" y2="250"/>
  <text class="d-sub" x="340" y="238" text-anchor="middle">no default</text>
</svg>

Read it clockwise: an explicit type argument always wins; if there is none, the compiler infers from the arguments; if the arguments give it nothing, it uses the default; and without a default it falls back to \`unknown\`.

📌 **Interview term: inference candidate** — a type the compiler collects for \`T\` from an argument. A default is used only when there are no candidates.

## 5. The Surprise: No Partial Inference

You might expect to fix one type argument and let the compiler infer the rest. It does not:

~~~ts
function tag<T, U = string>(a: T, b: U): [T, U] { return [a, b]; }
tag(1, true);          // [number, boolean]  both inferred
tag<number>(1, 2);     // U is the default string, not inferred
~~~

~~~text
error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
~~~

Once you write any type argument, **every** remaining parameter takes its default; inference is switched off for that call. If a remaining parameter has no default, it is an error instead:

~~~text
error TS2558: Expected 2 type arguments, but got 1.
~~~

The usual workaround is currying — \`makeTagger<number>()(1, 2)\` — so the second call infers on its own.

📌 **Interview term: partial type argument inference** — inferring some type arguments while the caller supplies others. TypeScript does not do it: explicit arguments plus defaults, or full inference.

## 6. Defaults Worth Using

**\`unknown\` for "I cannot know".** \`parseJson<T = unknown>(text)\` returns \`unknown\` when the caller says nothing, so they must narrow or validate before use (\`raw.name\` fails with \`'raw' is of type 'unknown'.\`), and can opt in with \`parseJson<User>(...)\` when they accept the risk. Compare \`JSON.parse\`, which returns \`any\`. Safe handling of such data is in [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)

**A loose default, a strict opt-in.** The example's \`Emitter<E extends EventMap = EventMap>\` works untyped as \`new Emitter()\` and fully checked as \`new Emitter<{ login: [user: string]; logout: [] }>()\`, where \`emit("signup")\` is rejected.

**React typings.** In \`@types/react\` (19.2, as installed in this repo) the no-argument form of \`useState\` is declared \`function useState<S = undefined>(): [S | undefined, ...]\`, so \`useState()\` gives \`undefined\` state unless you write \`useState<number>()\`.

Defaults are not the tool for "do not infer from this argument" — that is \`NoInfer<T>\`, added in TypeScript 5.4 ([TypeScript 5.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/)); see [What does \`NoInfer<T>\` do?](/interview-question/what-does-noinfer-t-do-and-when-should-you-block-inference).

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(10,19): error TS2322: Type 'number' is not assignable to type 'string'.
main.ts(19,12): error TS2314: Generic type 'Pair<T>' requires 1 type argument(s).
main.ts(33,34): error TS2344: Type 'number' does not satisfy the constraint 'string'.
main.ts(37,24): error TS2706: Required type parameters may not follow optional type parameters.
~~~

and for example 2:

~~~text
main.ts(10,1): error TS18046: 'raw' is of type 'unknown'.
main.ts(21,16): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
main.ts(29,6): error TS2558: Expected 2 type arguments, but got 1.
main.ts(50,13): error TS2345: Argument of type '"signup"' is not assignable to parameter of type '"login" | "logout"'.
~~~

Example 1, the syntax and rules of defaults, prints:

~~~text
hello 42
{"items":[1,2],"first":1} true
{"id":1} {"key":2}
{"value":10} {} true true
true
~~~

(\`{}\` is \`{ value: undefined }\` after \`JSON.stringify\` drops the \`undefined\`.) Example 2, defaults in practice, prints:

~~~text
Ada true
[1,true] true
loose [1,"two"]
login ADA
~~~

## Common Pitfalls

- **Expecting partial inference.** \`tag<number>(1, 2)\` does not infer \`U\`; it uses the default. Curry the function or let inference do all of it.
- **Defaulting to \`any\`.** \`<T = any>\` makes the easy path the unsafe one. Prefer \`unknown\`, or a loose but real type such as \`Record<string, unknown[]>\`.
- **Putting a defaulted parameter first.** Optional parameters must follow required ones (TS2706); reorder them.
- **A default that breaks the constraint.** The default must satisfy \`extends\` (TS2344); write the constraint before the \`=\`.
- **Thinking the default beats inference.** In a call, an inferred type wins; the default only fills in when the arguments give nothing.
- **Using a default to block inference.** That is \`NoInfer<T>\`'s job, not a default's.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Yes:</strong> <span style="color:#f0e2c8;">A type parameter can have a default: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interface Box&lt;T = string&gt;</code>. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box</code> alone means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box&lt;string&gt;</code>. It has been in the language since TypeScript 2.3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">Defaulted parameters are optional and must come after required ones; the default must satisfy the constraint, written as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;K extends string = "id"&gt;</code>; and it can refer to earlier parameters, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T, C = T[]&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inference:</strong> <span style="color:#f0e2c8;">In a function call, inference wins: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">box(10)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box&lt;number&gt;</code>. The default is used only when there is nothing to infer from, and with no default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Partial:</strong> <span style="color:#f0e2c8;">There is no partial inference: if I pass one type argument explicitly, the others take their defaults instead of being inferred.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Use:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> as the default for parse or fetch helpers so callers must opt in to a type, and loose defaults like an untyped event map so simple uses need no type arguments.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T</code> if a function has <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;T&gt;</code> with no default and the call gives nothing to infer from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>. For example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emptyList&lt;T&gt;(): T[]</code> called as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emptyList()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown[]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tag&lt;number&gt;(1, 2)</code> fail when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">U</code> defaults to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Explicit type arguments turn inference off for that call, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">U</code> becomes its default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2</code> is not a string. TypeScript has no partial type argument inference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a good default for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fetchJson&lt;T&gt;()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>, so an untyped call forces the caller to validate. A default of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> would make the shortcut silently unsafe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a default different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer&lt;T&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A default supplies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> when nothing is inferred. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer&lt;T&gt;</code>, added in 5.4, marks a position the compiler must not infer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> from, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is inferred from the other arguments only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class have default type parameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, classes, interfaces, type aliases and functions all accept them, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Emitter&lt;E extends EventMap = EventMap&gt;</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Emitter()</code> works without arguments.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Default type parameter | \`<T = D>\`: \`T\` is \`D\` when no argument is given or inferred |
| Inference candidate | A type collected for \`T\` from an argument; defaults apply when there are none |
| Partial type argument inference | Inferring some type arguments while others are written; TypeScript does not do it |

**Conclusion:** Default type parameters make generic APIs pleasant: the common case needs no angle brackets, and the precise case is one type argument away. They follow simple rules — optional parameters last, defaults that satisfy their constraints, defaults that may build on earlier parameters — and they sit in a clear order with inference: explicit argument, then inferred type, then the default, then \`unknown\`. The two things to remember in an interview are that inference beats a default in a call, and that writing one type argument switches inference off for the rest. Next in the series: [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript)`,
    examples: [
      {
        label: `Default type parameters: syntax, rules and inference`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A default type: Box without an argument means Box<string>.
interface Box<T = string> {
  value: T;
}
const b1: Box = { value: "hello" };
const b2: Box<number> = { value: 42 };
// @ts-expect-error Type 'number' is not assignable to type 'string'.
const b3: Box = { value: 1 };
console.log(b1.value, b2.value);

// Without a default, the type argument is required on a type.
interface Pair<T> {
  left: T;
  right: T;
}
// @ts-expect-error Generic type 'Pair<T>' requires 1 type argument(s).
const bad: Pair = { left: 1, right: 2 };

// A default can refer to an earlier parameter.
type Collection<T, C = T[]> = { items: C; first: T };
const col: Collection<number> = { items: [1, 2], first: 1 };
const okCol: Equal<Collection<number>["items"], number[]> = true;
console.log(JSON.stringify(col), okCol);

// Default plus constraint: the default must satisfy the constraint.
type Keyed<K extends string = "id"> = { [P in K]: number };
const k1: Keyed = { id: 1 };
const k2: Keyed<"key"> = { key: 2 };
console.log(JSON.stringify(k1), JSON.stringify(k2));
// @ts-expect-error Type 'number' does not satisfy the constraint 'string'.
type BadKeyed<K extends string = number> = K;

// Optional parameters must come after the required ones.
// @ts-expect-error Required type parameters may not follow optional type parameters.
type Wrong<A = string, B> = [A, B];

// Functions: inference wins over the default whenever there is an argument.
function box<T = string>(value?: T): Box<T | undefined> {
  return { value };
}
const inferred = box(10);
const fallback = box();
const okInferred: Equal<typeof inferred, Box<number | undefined>> = true;
const okFallback: Equal<typeof fallback, Box<string | undefined>> = true;
console.log(JSON.stringify(inferred), JSON.stringify(fallback), okInferred, okFallback);

// No default and nothing to infer from: T becomes unknown.
function emptyList<T>(): T[] {
  return [];
}
const list = emptyList();
const okList: Equal<typeof list, unknown[]> = true;
console.log(okList);`,
      },
      {
        label: `Defaults in practice: unknown, no partial inference, emitters`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// unknown as a safe default: callers must say what they expect, or check.
function parseJson<T = unknown>(text: string): T {
  return JSON.parse(text) as T;
}
const raw = parseJson('{"name":"Ada"}');
const okRaw: Equal<typeof raw, unknown> = true;
// @ts-expect-error 'raw' is of type 'unknown'.
raw.name;
const typed = parseJson<{ name: string }>('{"name":"Ada"}');
console.log(typed.name, okRaw);

// No partial inference: pass one type argument and the rest use defaults.
function tag<T, U = string>(a: T, b: U): [T, U] {
  return [a, b];
}
const t1 = tag(1, true);
const okT1: Equal<typeof t1, [number, boolean]> = true;
// @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'.
tag<number>(1, 2);
console.log(JSON.stringify(t1), okT1);

// Without a default, every type argument must be given once you give one.
function both<T, U>(a: T, b: U): [T, U] {
  return [a, b];
}
// @ts-expect-error Expected 2 type arguments, but got 1.
both<number>(1, 2);

// A typed event emitter: a default event map keeps the plain form usable.
type EventMap = Record<string, unknown[]>;
class Emitter<E extends EventMap = EventMap> {
  private handlers: { [K in keyof E]?: ((...args: E[K]) => void)[] } = {};
  on<K extends keyof E>(name: K, fn: (...args: E[K]) => void): void {
    (this.handlers[name] ??= []).push(fn);
  }
  emit<K extends keyof E>(name: K, ...args: E[K]): void {
    for (const fn of this.handlers[name] ?? []) fn(...args);
  }
}
const loose = new Emitter();
loose.on("anything", (...args) => console.log("loose", JSON.stringify(args)));
loose.emit("anything", 1, "two");

const strict = new Emitter<{ login: [user: string]; logout: [] }>();
strict.on("login", (user) => console.log("login", user.toUpperCase()));
strict.emit("login", "ada");
// @ts-expect-error Argument of type '"signup"' is not assignable to parameter of type '"login" | "logout"'.
strict.emit("signup");`,
      },
    ],
  },
  {
    title: `What do keyof and typeof do in TypeScript?`,
    difficulty: "medium",
    seoDescription: `keyof gives the union of a type keys; typeof in a type position captures a value type. Combine them with K extends keyof T and know the edge cases.`,
    description: `**Question presented to candidate:**
"What do \`keyof\` and \`typeof\` do in TypeScript? How is TypeScript's \`typeof\` different from JavaScript's, and how would you combine them with generics?"

**What a strong answer should cover:**
- \`keyof T\` is a type operator: the union of \`T\`'s property names (\`keyof User\` is \`"id" | "name" | "admin"\`); it arrived in TypeScript 2.1 with indexed access types
- \`typeof x\` in a type position captures the static type of an existing value; in a value position it is JavaScript's run-time operator returning a string like \`"object"\`
- \`keyof typeof obj\` gives the keys of a value without writing a separate type; \`ReturnType<typeof fn>\` reuses a function's result type
- The generic pattern \`<T, K extends keyof T>(obj: T, key: K): T[K]\` for type-safe property access
- Edge cases: index signatures (\`keyof { [k: string]: X }\` is \`string | number\`), \`keyof (A | B)\` is only the shared keys, \`keyof\` of a class omits private members, and \`Object.keys\` returns \`string[]\` on purpose
- A type name cannot be used with value \`typeof\` (TS2693): types and values live in separate namespaces

**Code / implementation expected:** Yes — \`keyof typeof\` on a config object and a \`getProperty\` or \`pluck\` helper.`,
    answer: `**Target Audience:** Developers who know generics and want to derive types from existing types and values instead of writing them twice.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022). \`keyof\` and indexed access types were introduced in TypeScript 2.1 ([TypeScript 2.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a filing cabinet with labelled drawers: **id**, **name**, **admin**. Two questions come up all the time:

- "What are the labels on this cabinet?" — so nobody opens a drawer called **email** that does not exist.
- "Make me another cabinet shaped exactly like that one." — without measuring it again by hand.

\`keyof\` answers the first question for a **type**: it lists the drawer labels. \`typeof\` answers the second for a **value**: point at an existing object and get its type, no rewriting. Used together they let you write the shape of your data once and derive everything else from it, so the types can never drift away from the code.

## 2. \`keyof\`: the Keys of a Type, as a Union

~~~ts
type User = { id: number; name: string; admin: boolean };
type UserKey = keyof User;          // "id" | "name" | "admin"

let key: UserKey = "name";
key = "email";                      // error
~~~

~~~text
error TS2322: Type '"email"' is not assignable to type 'keyof User'.
~~~

Note that the message shows \`keyof User\` rather than spelling out the union; the example proves it equals \`"id" | "name" | "admin"\` with an \`Equal\` check.

📌 **Interview term: \`keyof\` type operator** — takes an object type and produces the union of its property names as literal types.

## 3. \`typeof\`: Two Operators With One Name

JavaScript already has a \`typeof\` operator: \`typeof config\` evaluates **at run time** to a string such as \`"object"\` or \`"number"\`. TypeScript adds a second meaning, used only **where a type is expected**:

~~~ts
const config = { host: "localhost", port: 8080, debug: false };
type Config = typeof config;   // { host: string; port: number; debug: boolean }

console.log(typeof config, typeof config.port, typeof null);   // object number object
~~~

The compiler tells them apart by position: after \`type X =\`, in an annotation, or inside \`<...>\` it is the type query; in an expression it is plain JavaScript.

| | Type \`typeof\` | JavaScript \`typeof\` |
| :--- | :--- | :--- |
| Where | type positions: \`type T = typeof x\`, \`let y: typeof x\` | expressions: \`if (typeof x === "string")\` |
| Result | a static type (\`{ host: string; ... }\`) | one of eight strings (\`"object"\`, \`"number"\`, ...) |
| When | compile time, then erased | run time |
| Works on | values only (variables, functions, classes) | any expression |
| Role in narrowing | none | the classic narrowing check |

📌 **Interview term: type query** — \`typeof x\` in a type position: the static type TypeScript has for the value \`x\`.

Types and values live in **separate namespaces**. \`type User\` exists only for the compiler, so \`typeof User\` in an expression is an error:

~~~text
error TS2693: 'User' only refers to a type, but is being used as a value here.
~~~

The example runs that line anyway, and JavaScript prints \`undefined\` — \`typeof\` on an undeclared name returns \`"undefined"\` instead of throwing.

## 4. \`keyof typeof\`: Keys of a Value

Because \`keyof\` needs a type and \`config\` is a value, you chain them: \`typeof\` first, then \`keyof\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="keyof typeof config: the value config becomes its type with typeof, then keyof gives the union of its keys">
  <rect class="d-box-muted" x="20" y="80" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="110" text-anchor="middle">config</text>
  <text class="d-sub" x="105" y="132" text-anchor="middle">a run-time value</text>
  <rect class="d-box" x="255" y="80" width="170" height="70" rx="10"/>
  <text class="d-text" x="340" y="110" text-anchor="middle">Config type</text>
  <text class="d-sub" x="340" y="132" text-anchor="middle">host, port, debug</text>
  <rect class="d-box-accent" x="490" y="80" width="170" height="70" rx="10"/>
  <text class="d-text" x="575" y="110" text-anchor="middle">key union</text>
  <text class="d-sub" x="575" y="132" text-anchor="middle">host or port or debug</text>
  <line class="d-edge-accent" x1="190" y1="115" x2="253" y2="115"/>
  <line class="d-edge-accent" x1="425" y1="115" x2="488" y2="115"/>
  <text class="d-accent" x="222" y="60" text-anchor="middle">typeof</text>
  <text class="d-accent" x="457" y="60" text-anchor="middle">keyof</text>
</svg>

\`typeof config\` turns the value into its type; \`keyof\` then lists that type's keys, giving \`"host" | "port" | "debug"\`. Add a field to \`config\` and the union updates by itself.

~~~ts
type ConfigKey = keyof typeof config;   // "host" | "port" | "debug"
function read(k: ConfigKey) {
  return config[k];
}
~~~

\`typeof\` is just as useful on functions: \`type Made = ReturnType<typeof makeUser>\` reuses a function's inferred result type (more in [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)). With \`as const\`, \`(typeof roles)[number]\` gives an array's elements as a union — the full treatment of that trick is in [How do you get a union of an object's values as a type?](/interview-question/how-do-you-get-a-union-of-an-object-s-values-as-a-type)

## 5. With Generics: \`K extends keyof T\` and \`T[K]\`

~~~ts
function pluck<T, K extends keyof T>(items: T[], k: K): T[K][] {
  return items.map((item) => item[k]);
}
pluck(users, "name");   // string[]  -> ["Ada","Lin"]
pluck(users, "id");     // number[]  -> [1,2]
~~~

\`K extends keyof T\` lets only real keys in (a [generic constraint](/interview-question/what-are-generic-constraints)), and \`T[K]\` — an [indexed access type](/interview-question/what-are-indexed-access-types) — looks up the type stored at that key. This one pattern powers \`pick\`, \`sortBy\`, \`groupBy\`, form libraries and ORMs. \`keyof\` is also the engine of [mapped types](/interview-question/what-are-mapped-types): \`{ [K in keyof T]: ... }\`.

📌 **Interview term: indexed access type** — \`T[K]\`, the type of property \`K\` of \`T\`; with a union of keys it gives the union of their types.

## 6. Edge Cases Interviewers Like

The second example checks each row with \`Equal\`:

| Expression | Result | Why |
| :--- | :--- | :--- |
| \`keyof { [key: string]: number }\` | \`string \\| number\` | JavaScript turns numeric keys into strings, so numbers are valid string keys too |
| \`keyof { [i: number]: string }\` | \`number\` | only numeric keys |
| \`keyof any\` | \`string \\| number \\| symbol\` | every possible property key |
| \`keyof (A \\| B)\` | only the shared keys (\`"id"\`) | a value of \`A \\| B\` is only guaranteed to have those |
| \`keyof (A & B)\` | every key (\`"id" \\| "a" \\| "b"\`) | a value has all of them |
| \`keyof Account\` (a class) | public instance members only | \`private balance\` is left out |
| \`typeof Account\` | the constructor type | the static side, used as \`new C(...)\` |

**Why \`Object.keys\` returns \`string[]\`.** Many people expect \`(keyof T)[]\`. But TypeScript is structural (see [What is structural typing?](/interview-question/what-is-structural-typing)): a function typed to take \`{ x: number; y: number }\` can receive \`{ x, y, z }\`, and \`Object.keys\` then really returns \`["x","y","z"]\`, as the example prints. So indexing with a plain \`string\` key is rejected under \`--strict\`:

~~~text
error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ x: number; y: number; }'.
  No index signature with a parameter of type 'string' was found on type '{ x: number; y: number; }'.
~~~

If you know the object has no extra keys, a local cast \`Object.keys(p) as (keyof typeof p)[]\` is a deliberate, visible assumption.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(9,1): error TS2322: Type '"email"' is not assignable to type 'keyof User'.
main.ts(48,20): error TS2693: 'User' only refers to a type, but is being used as a value here.
~~~

and for example 2:

~~~text
main.ts(26,3): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ x: number; y: number; }'.
  No index signature with a parameter of type 'string' was found on type '{ x: number; y: number; }'.
~~~

Example 1, \`keyof\`, both \`typeof\`s and \`pluck\`, prints:

~~~text
object number object
localhost 8080 true true true
["Ada","Lin"] [1,2] true
true
undefined
~~~

Example 2, the edge cases, prints:

~~~text
true true true
true true
["x","y","z"] true
Ada true
3 true
~~~

Every \`true\` is a compile-time \`Equal\` check from the table above that tsc verified before the code ran.

## Common Pitfalls

- **Writing \`keyof config\` on a value.** \`keyof\` needs a type: use \`keyof typeof config\`.
- **Mixing up the two \`typeof\`s.** In a type position it gives a static type; in an expression it gives a run-time string. Only the second narrows.
- **Expecting \`Object.keys\` to return \`(keyof T)[]\`.** It returns \`string[]\` because objects can carry extra keys at run time. Cast locally only when you are sure.
- **\`keyof\` on a union.** \`keyof (A | B)\` is the shared keys only, which surprises people building "all keys of either" helpers.
- **Index signatures widen \`keyof\`.** A \`string\` index signature makes \`keyof\` \`string | number\`, so \`K extends keyof T\` stops catching typos.
- **Duplicating a type next to a value.** Writing \`type Config = { host: string; ... }\` beside the object means two places to update; \`typeof config\` keeps one source of truth.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. keyof:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code> is a type operator that gives the union of the property names of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>: for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">User</code> type it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"id" | "name" | "admin"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. typeof:</strong> <span style="color:#f0e2c8;">In a type position, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof x</code> gives the static type of an existing value. In an expression, it is still the JavaScript operator that returns a string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"object"</code> at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Together:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof typeof config</code> gives the keys of a value without writing a separate type, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof fn&gt;</code> reuses a function result type, so there is one source of truth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Generics:</strong> <span style="color:#f0e2c8;">The key pattern is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K]</code>: only real keys are accepted, and the return type is the type at that key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">A string index signature makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> of a union keeps only shared keys; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code> because objects may have extra keys at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.keys(obj)</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(keyof typeof obj)[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Structural typing lets an object with extra properties be passed where a smaller type is expected, so at run time there may be more keys than the type lists. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code> is the honest type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">keyof { [key: string]: number }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number</code>, because numeric property keys are converted to strings in JavaScript, so a string index signature also accepts number keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof User</code> if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">User</code> is a type alias?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'User' only refers to a type, but is being used as a value here.</code> Type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> works only on values; for a type alias you already have the type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">keyof (A | B)</code> compared with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">keyof (A &amp; B)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the union it is only the keys both have, because a value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A | B</code> is only guaranteed those. For the intersection it is all keys of both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof SomeClass</code> give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The constructor type, the static side of the class, which you can call with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>. The instance type is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SomeClass</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`keyof\` type operator | Produces the union of an object type property names |
| Type query | \`typeof x\` in a type position: the static type of value \`x\` |
| Indexed access type | \`T[K]\`: the type of property \`K\` of \`T\` |

**Conclusion:** \`keyof\` and \`typeof\` are how TypeScript lets you derive types instead of copying them. \`typeof\` lifts a value into the type world, \`keyof\` lists a type's keys, and \`T[K]\` reads the type at a key; combined with a \`K extends keyof T\` constraint they give property access that the compiler checks end to end. Know the two meanings of \`typeof\`, the index-signature and union edge cases, and why \`Object.keys\` is deliberately \`string[]\`, and you have both the everyday pattern and the follow-ups covered.`,
    examples: [
      {
        label: `keyof, both kinds of typeof, and pluck`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// keyof: a type operator that gives the union of a type's property names.
type User = { id: number; name: string; admin: boolean };
type UserKey = keyof User;
const ok1: Equal<UserKey, "id" | "name" | "admin"> = true;
let key: UserKey = "name";
// @ts-expect-error Type '"email"' is not assignable to type 'keyof User'.
key = "email";

// typeof in a TYPE position: the type of an existing value.
const config = { host: "localhost", port: 8080, debug: false };
type Config = typeof config;
const ok2: Equal<Config, { host: string; port: number; debug: boolean }> = true;

// typeof in a VALUE position is plain JavaScript: a run-time string.
console.log(typeof config, typeof config.port, typeof null);

// keyof typeof: the keys of a value, without writing a separate type.
type ConfigKey = keyof typeof config;
const ok3: Equal<ConfigKey, "host" | "port" | "debug"> = true;
function read(k: ConfigKey) {
  return config[k];
}
console.log(read("host"), read("port"), ok1, ok2, ok3);

// The classic pairing: K extends keyof T and the indexed access T[K].
function pluck<T, K extends keyof T>(items: T[], k: K): T[K][] {
  return items.map((item) => item[k]);
}
const users: User[] = [
  { id: 1, name: "Ada", admin: true },
  { id: 2, name: "Lin", admin: false },
];
const names = pluck(users, "name");
const ok4: Equal<typeof names, string[]> = true;
console.log(JSON.stringify(names), JSON.stringify(pluck(users, "id")), ok4);

// typeof also works on functions; combine it with utility types.
function makeUser(name: string) {
  return { id: name.length, name, admin: false };
}
type Made = ReturnType<typeof makeUser>;
const ok5: Equal<Made, User> = true;
console.log(ok5);

// @ts-expect-error 'User' only refers to a type, but is being used as a value here.
console.log(typeof User);`,
      },
      {
        label: `Edge cases: index signatures, unions, Object.keys, classes`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A string index signature: keys can be strings, and numbers too.
type Dict = { [key: string]: number };
const e1: Equal<keyof Dict, string | number> = true;
// A number index signature: only numbers.
type List = { [i: number]: string };
const e2: Equal<keyof List, number> = true;
// keyof any is every possible property key type.
const e3: Equal<keyof any, string | number | symbol> = true;
console.log(e1, e2, e3);

// keyof a union: only the keys every member has. Of an intersection: all keys.
type A = { id: number; a: string };
type B = { id: number; b: string };
const e4: Equal<keyof (A | B), "id"> = true;
const e5: Equal<keyof (A & B), "id" | "a" | "b"> = true;
console.log(e4, e5);

// Object.keys returns string[], not (keyof T)[], because objects may have extra keys.
const point = { x: 1, y: 2 };
const keys = Object.keys(point);
const e6: Equal<typeof keys, string[]> = true;
for (const k of keys) {
  // @ts-expect-error Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ x: number; y: number; }'.
  point[k];
}
// Why: structural typing lets a wider object in at run time.
const point3d = { x: 1, y: 2, z: 3 };
function keysOf(p: { x: number; y: number }) {
  return Object.keys(p);
}
console.log(JSON.stringify(keysOf(point3d)), e6);

// keyof a class type: only public instance members.
class Account {
  constructor(public owner: string, private balance: number) {}
  deposit(n: number) {
    this.balance += n;
  }
}
const e7: Equal<keyof Account, "owner" | "deposit"> = true;
// typeof a class is the constructor (static side), not the instance.
type Ctor = typeof Account;
const make = (C: Ctor) => new C("Ada", 10);
console.log(make(Account).owner, e7);

// typeof on an as const array, then [number] for its element union.
const roles = ["admin", "editor", "viewer"] as const;
type Role = (typeof roles)[number];
const e8: Equal<Role, "admin" | "editor" | "viewer"> = true;
console.log(roles.length, e8);`,
      },
    ],
  },
  {
    title: `How do you get a union of an object's values as a type?`,
    difficulty: "medium",
    seoDescription: `Declare the object as const and write (typeof Obj)[keyof typeof Obj], or a ValueOf<T> helper; use [number] for arrays and validate at run time.`,
    description: `**Question presented to candidate:**
"You have a constant object mapping names to status strings. How do you get a type that is the union of its values, so a function only accepts those strings? Walk me through why each part is needed."

**What a strong answer should cover:**
- The pattern \`(typeof Obj)[keyof typeof Obj]\`: \`typeof\` turns the value into a type, \`keyof\` gives its keys, and indexing with the whole key union gives the union of values
- \`as const\` is required: without it the values widen to \`string\` and the "union" is just \`string\`
- A reusable \`type ValueOf<T> = T[keyof T]\`; arrays use \`[number]\` instead (\`(typeof arr)[number]\`)
- The run-time side: the type is erased, so validating input needs \`Object.values(Obj)\` plus a type guard (and a widening cast for \`includes\`)
- Pitfalls: \`ValueOf\` on an array or tuple also picks up \`length\` and method types; it is one level deep, so nested objects need a recursive helper
- Trade-offs versus \`enum\`; \`as const satisfies Record<string, number>\` to check the shape while keeping literals

**Code / implementation expected:** Yes — derive the union from a constant object and use it as a parameter type.`,
    answer: `**Target Audience:** Developers who want a single constant object to be the source of truth for both run-time values and types.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page is the applied recipe. The building blocks each have their own page: [\`keyof\` and \`typeof\`](/interview-question/what-do-keyof-and-typeof-do-in-typescript), [indexed access types](/interview-question/what-are-indexed-access-types) and [\`as const\`](/interview-question/what-does-as-const-do).

## 1. Why This Even Matters — A Story First

A restaurant prints its menu once. The waiter takes orders from that menu, and the kitchen cooks from that menu. Nobody keeps a second, hand-copied list of dishes in the kitchen, because the day someone adds a dish to the menu and forgets the copy, a customer orders something the kitchen has never heard of.

Code has the same problem. You have a constant object listing the allowed statuses, and you want a **type** listing the same statuses for function parameters. Writing both by hand means two lists that will drift apart. The technique on this page derives the type **from** the object, so the menu is printed once.

## 2. The Recipe in Three Steps

~~~ts
const Status = { Active: "active", Paused: "paused", Closed: "closed" } as const;
type StatusValue = (typeof Status)[keyof typeof Status];
// "active" | "paused" | "closed"
~~~

Read the type from the inside out:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 380" role="img" aria-label="Three steps: typeof Status gives the object type, keyof gives the key union, indexing the type with all keys gives the value union">
  <rect class="d-box-muted" x="40" y="30" width="620" height="70" rx="10"/>
  <text class="d-text" x="350" y="60" text-anchor="middle">typeof Status</text>
  <text class="d-sub" x="350" y="82" text-anchor="middle">readonly Active: active, Paused: paused, Closed: closed</text>
  <rect class="d-box" x="40" y="160" width="620" height="70" rx="10"/>
  <text class="d-text" x="350" y="190" text-anchor="middle">keyof typeof Status</text>
  <text class="d-sub" x="350" y="212" text-anchor="middle">Active or Paused or Closed</text>
  <rect class="d-box-accent" x="40" y="290" width="620" height="70" rx="10"/>
  <text class="d-text" x="350" y="320" text-anchor="middle">typeof Status indexed by all its keys</text>
  <text class="d-sub" x="350" y="342" text-anchor="middle">active or paused or closed</text>
  <line class="d-edge" x1="350" y1="100" x2="350" y2="158"/>
  <line class="d-edge-accent" x1="350" y1="230" x2="350" y2="288"/>
</svg>

1. \`typeof Status\` turns the value into its type.
2. \`keyof typeof Status\` is the union of its keys, \`"Active" | "Paused" | "Closed"\`.
3. Indexing a type with a **union** of keys gives the union of the property types: the values.

Now every use is checked:

~~~ts
function setStatus(s: StatusValue): string { return "status=" + s; }
setStatus(Status.Paused);   // ok
setStatus("closed");        // ok: the plain string works too
setStatus("deleted");       // error
~~~

~~~text
error TS2345: Argument of type '"deleted"' is not assignable to parameter of type 'StatusValue'.
~~~

📌 **Interview term: value union** — \`T[keyof T]\`, the union of all property value types of \`T\`, obtained by an indexed access with the full key union.

## 3. Why \`as const\` Is Not Optional

Without it, TypeScript widens each property to \`string\`, because a normal object property can be reassigned:

~~~ts
const StatusLoose = { Active: "active", Paused: "paused", Closed: "closed" };
type LooseValue = (typeof StatusLoose)[keyof typeof StatusLoose];   // string
~~~

The example proves \`LooseValue\` is exactly \`string\`, which accepts \`"deleted"\` and every other string. \`as const\` keeps each value as its literal type and makes the properties \`readonly\`. Widening itself is explained in [What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it)

## 4. A Reusable Helper and the Array Version

~~~ts
type ValueOf<T> = T[keyof T];
type StatusValue = ValueOf<typeof Status>;
ValueOf<typeof Limits>;    // 10 | "ten" | true  (mixed value types)
~~~

For arrays, the keys you want are the numeric indexes, so you index with \`number\`:

~~~ts
const sizes = ["s", "m", "l"] as const;
type Size = (typeof sizes)[number];   // "s" | "m" | "l"
~~~

A subset works the same way: \`(typeof Status)["Active" | "Paused"]\` is \`"active" | "paused"\`.

📌 **Interview term: \`ValueOf<T>\`** — a common user-defined helper, \`T[keyof T]\`. It is not built into TypeScript; you declare it yourself.

## 5. The Enum-Like Pattern, and the Run-Time Side

You can give the object and the type the **same name**, because values and types live in separate namespaces:

~~~ts
const Status = { Active: "active", Paused: "paused", Closed: "closed" } as const;
type Status = (typeof Status)[keyof typeof Status];
const current: Status = Status.Active;   // reads like an enum
~~~

This is a popular alternative to \`enum\`: the values are plain strings, it emits only an ordinary object, and string literals are accepted directly. The trade-offs are in [What are enums and what are their trade-offs?](/interview-question/what-are-enums-and-what-are-their-trade-offs)

The type is erased, so to **validate input** (a query string, JSON) you need the run-time values. \`Object.values(Status)\` returns \`Status[]\`, but \`ALL.includes(input)\` with a \`string\` input is rejected:

~~~text
error TS2345: Argument of type 'string' is not assignable to parameter of type '"active" | "paused" | "closed"'.
~~~

The usual fix widens the array, not the input, inside a type guard:

~~~ts
function isStatus(x: string): x is Status {
  return (ALL as readonly string[]).includes(x);
}
~~~

The example prints \`valid paused\` and \`rejected deleted\`. More on writing such guards: [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)

**Checking the shape too.** \`as const satisfies Record<string, number>\` checks that every value is a number while keeping the literals, so \`ValueOf<typeof Http>\` is \`200 | 404 | 500\` (see [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)).

## 6. Two Traps

**Arrays and tuples.** \`keyof\` of an array type includes \`length\` and every method name, so \`ValueOf\` on an array is not the element union. For \`["s", "m"] as const\`, \`length\` is the literal \`2\`, and this compiles:

~~~ts
type WrongSize = ValueOf<typeof sizes>;
const oops: WrongSize = 2;            // compiles: 2 is the tuple length
const fine: (typeof sizes)[number] = 2;   // error
~~~

~~~text
error TS2322: Type '2' is not assignable to type '"s" | "m"'.
~~~

Use \`[number]\` for arrays, \`[keyof T]\` for objects.

**Nested objects.** \`ValueOf\` is one level deep: for \`{ colors: { bg, fg }, radius: 4 }\` it is \`4 | { readonly bg: "white"; readonly fg: "black" }\`. If you want the leaves, recurse with a conditional type — \`type DeepValueOf<T> = T extends object ? DeepValueOf<T[keyof T]> : T\` gives \`"white" | "black" | 4\` (background in [What are recursive types?](/interview-question/what-are-recursive-types)).

| You have | You want | Write |
| :--- | :--- | :--- |
| \`const obj = {...} as const\` | union of values | \`(typeof obj)[keyof typeof obj]\` |
| \`const arr = [...] as const\` | union of elements | \`(typeof arr)[number]\` |
| an interface or type \`T\` | union of its value types | \`T[keyof T]\` |
| some keys only | union of those values | \`T["a" \\| "b"]\` |
| nested object | union of leaf values | a recursive conditional type |

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(24,11): error TS2345: Argument of type '"deleted"' is not assignable to parameter of type 'StatusValue'.
~~~

and for example 2:

~~~text
main.ts(14,37): error TS2345: Argument of type 'string' is not assignable to parameter of type '"active" | "paused" | "closed"'.
main.ts(47,7): error TS2322: Type '2' is not assignable to type '"s" | "m"'.
~~~

Example 1, the recipe step by step, prints:

~~~text
true true true
status=paused status=closed
true true
s/m/l true
active
~~~

Example 2, run-time validation and the traps, prints:

~~~text
valid paused
rejected deleted
["active","paused","closed"] true
true true
2 true
true true
~~~

The \`true\` values are compile-time \`Equal\` checks; for instance the first one in example 1 proves that without \`as const\` the value union is plain \`string\`.

## Common Pitfalls

- **Forgetting \`as const\`.** The union collapses to \`string\` and accepts everything.
- **Writing \`keyof Status\` on the value.** \`Status\` is a value; you need \`keyof typeof Status\` (and \`typeof Status\` before indexing).
- **Using \`ValueOf\` on an array.** It includes \`length\` and method types; use \`(typeof arr)[number]\`.
- **Expecting the type to validate input.** It is erased; check against \`Object.values(...)\` in a type guard.
- **Casting the input for \`includes\`.** \`ALL.includes(x as Status)\` hides the check you are trying to make; widen the array to \`readonly string[]\` instead.
- **Expecting deep results.** \`T[keyof T]\` is one level; nested objects need a recursive type.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recipe:</strong> <span style="color:#f0e2c8;">I declare the object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> and write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Status = (typeof Status)[keyof typeof Status]</code>, which gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"active" | "paused" | "closed"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why each part:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> turns the value into a type, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> gives the union of its keys, and indexing a type with a union of keys gives the union of the values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. as const:</strong> <span style="color:#f0e2c8;">Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> the values widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, so the union is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> keeps the literals and makes the properties readonly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">For reuse I define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueOf&lt;T&gt; = T[keyof T]</code>; for arrays I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(typeof arr)[number]</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> of an array also includes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> and methods.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Run time:</strong> <span style="color:#f0e2c8;">The type is erased, so to validate input I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values(Status)</code> inside a type guard. This gives an enum-like API with plain strings and a single source of truth.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof</code> twice in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(typeof Status)[keyof typeof Status]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status</code> is a value. Indexed access and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> both need a type, so both places start from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof Status</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you get without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, because each property is widened so it can be reassigned. Every string would then pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ValueOf&lt;typeof arr&gt;</code> for an array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> of an array includes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> and the method names, so the result mixes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> (or the literal length) and function types. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(typeof arr)[number]</code> gives just the elements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ALL.includes(input)</code> fail when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">input</code> is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> object returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status[]</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code> only accepts a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status</code>. I widen the array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as readonly string[]</code> inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isStatus</code> type guard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use this over an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">enum</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually yes: the values are plain strings, it emits a normal object and string literals are accepted directly. A string enum is the opposite trade-off: assigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"active"</code> to the enum type is rejected, so every value must go through the enum, which some teams prefer.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Value union | \`T[keyof T]\`: the union of all property value types of \`T\` |
| \`ValueOf<T>\` | A user-defined helper for \`T[keyof T]\`, not built in |

**Conclusion:** To turn an object's values into a union type, declare the object \`as const\` and index its type with all of its keys: \`(typeof Obj)[keyof typeof Obj]\`, or a reusable \`ValueOf<T>\`. Each part has a job — \`typeof\` lifts the value into a type, \`keyof\` lists the keys, the indexed access collects the values, and \`as const\` stops the literals from widening to \`string\`. Use \`[number]\` for arrays, keep \`Object.values\` and a type guard for run-time checks, and you get an enum-like set of constants with one source of truth for both code and types.`,
    examples: [
      {
        label: `The recipe: as const, typeof, keyof and indexed access`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Step 1: without as const, the values widen to string.
const StatusLoose = { Active: "active", Paused: "paused", Closed: "closed" };
type LooseValue = (typeof StatusLoose)[keyof typeof StatusLoose];
const w: Equal<LooseValue, string> = true;

// Step 2: as const keeps each value as its literal type (and makes it readonly).
const Status = { Active: "active", Paused: "paused", Closed: "closed" } as const;

// Step 3: typeof gives the type, keyof the keys, [ ] looks up all values at once.
type StatusKey = keyof typeof Status;
type StatusValue = (typeof Status)[keyof typeof Status];
const k: Equal<StatusKey, "Active" | "Paused" | "Closed"> = true;
const v: Equal<StatusValue, "active" | "paused" | "closed"> = true;
console.log(w, k, v);

// The union now checks every use.
function setStatus(s: StatusValue): string {
  return "status=" + s;
}
console.log(setStatus(Status.Paused), setStatus("closed"));
// @ts-expect-error Argument of type '"deleted"' is not assignable to parameter of type 'StatusValue'.
setStatus("deleted");

// A reusable helper: ValueOf<T> is the indexed access T[keyof T].
type ValueOf<T> = T[keyof T];
const v2: Equal<ValueOf<typeof Status>, StatusValue> = true;

// Mixed value types give a mixed union.
const Limits = { max: 10, label: "ten", strict: true } as const;
const v3: Equal<ValueOf<typeof Limits>, 10 | "ten" | true> = true;
console.log(v2, v3);

// Arrays: index with number instead of keyof.
const sizes = ["s", "m", "l"] as const;
type Size = (typeof sizes)[number];
const v4: Equal<Size, "s" | "m" | "l"> = true;
console.log(sizes.join("/"), v4);

// The same name for the value and the type: an enum-like pattern.
type Status = StatusValue;
const current: Status = Status.Active;
console.log(current);`,
      },
      {
        label: `Run-time validation, satisfies and the array and nesting traps`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type ValueOf<T> = T[keyof T];

const Status = { Active: "active", Paused: "paused", Closed: "closed" } as const;
type Status = ValueOf<typeof Status>;

// The type is erased; the run-time list comes from Object.values.
const ALL = Object.values(Status);
const okAll: Equal<typeof ALL, Status[]> = true;

// A type guard: check untrusted input against the run-time values.
function isStatus(x: string): x is Status {
  // @ts-expect-error Argument of type 'string' is not assignable to parameter of type '"active" | "paused" | "closed"'.
  const direct = () => ALL.includes(x);
  return (ALL as readonly string[]).includes(x);
}
for (const input of ["paused", "deleted"]) {
  if (isStatus(input)) console.log("valid", input);
  else console.log("rejected", input);
}
console.log(JSON.stringify(ALL), okAll);

// A subset: index with some keys instead of all of them.
type OpenStatus = (typeof Status)["Active" | "Paused"];
const okSub: Equal<OpenStatus, "active" | "paused"> = true;

// satisfies checks the shape and keeps the literal types from as const.
const Http = { ok: 200, notFound: 404, error: 500 } as const satisfies Record<string, number>;
type HttpCode = ValueOf<typeof Http>;
const okHttp: Equal<HttpCode, 200 | 404 | 500> = true;
console.log(okSub, okHttp);

// ValueOf works on an interface too: no run-time object needed.
interface Settings {
  theme: "light" | "dark";
  fontSize: number;
}
const okSet: Equal<ValueOf<Settings>, "light" | "dark" | number> = true;

// Pitfall: on an array, keyof includes length and every method.
const sizes = ["s", "m"] as const;
type WrongSize = ValueOf<typeof sizes>;
// 2 is the tuple length, so this compiles although it is not a size.
const oops: WrongSize = 2;
type Size = (typeof sizes)[number];
// @ts-expect-error Type '2' is not assignable to type '"s" | "m"'.
const fine: Size = 2;
console.log(oops, okSet);

// Pitfall: ValueOf is one level deep; nested objects stay objects.
const Theme = { colors: { bg: "white", fg: "black" }, radius: 4 } as const;
type Shallow = ValueOf<typeof Theme>;
const okShallow: Equal<Shallow, 4 | { readonly bg: "white"; readonly fg: "black" }> = true;
type DeepValueOf<T> = T extends object ? DeepValueOf<T[keyof T]> : T;
const okDeep: Equal<DeepValueOf<typeof Theme>, "white" | "black" | 4> = true;
console.log(okShallow, okDeep);`,
      },
    ],
  },
];

export default augments;
