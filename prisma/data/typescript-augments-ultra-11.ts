/**
 * TYPESCRIPT ULTRA — batch 11: Type-level programming II (infer, deep
 * Awaited / ReturnType / Unwrap utilities, template literal types, recursive
 * types, DeepPartial). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What does the infer keyword do?`,
    difficulty: "hard",
    seoDescription: `infer declares a type variable inside a conditional type pattern to extract part of a type: positions, no match, unions, constraints, overloads.`,
    description: `**Question presented to candidate:**
"What does the \`infer\` keyword do in TypeScript? Show me how you would use it to pull a type out of another type, like the return type of a function."

**What a strong answer should cover:**
- \`infer X\` declares a new type variable inside the \`extends\` clause of a conditional type; TypeScript fills it in by matching the checked type against the pattern, and \`X\` is usable in the true branch
- If the pattern does not match, the false branch is taken; \`infer\` is only legal in the \`extends\` clause (error TS1338 elsewhere)
- It can sit in any position: return type, parameters, array element, tuple head or rest, a generic argument like \`Promise<infer V>\`, or a hole in a template literal type
- Built-ins such as \`ReturnType\`, \`Parameters\` and \`InstanceType\` are written with it (added with conditional types in TypeScript 2.8)
- Finer rules: one name in several covariant spots gives a union, in parameter spots an intersection; \`infer X extends C\` (TypeScript 4.7) constrains the match; overloaded functions infer from the last signature

**Code / implementation expected:** Yes — write a \`MyReturnType<F>\` or \`ElementOf<T>\` with \`infer\`, and explain the false branch.`,
    answer: `**Target Audience:** Developers who know generics and have seen a conditional type (\`T extends U ? X : Y\`), and want to extract parts of types.
**Difficulty:** Hard
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release facts (2.8, 4.7, 4.8) are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A postal worker sorts envelopes with a stencil. The stencil has a window cut out where the postcode goes: "street, town, **[____]**". She lays it over each envelope. If the envelope fits the stencil, whatever shows through the window is the postcode, and she can write it down. If it does not fit (a parcel, a postcard with no address), she puts it in the "other" tray.

\`infer\` is the window in the stencil. You describe a shape — "a function returning **something**" — and mark the part you care about with \`infer R\`. TypeScript lays that shape over a real type. If it fits, \`R\` is whatever showed through the window. If it does not fit, you get the other branch.

Without \`infer\` you can only ask yes/no questions about a type ("is this a function?"). With it you can ask "what is **inside** it?" — and that is what most of the built-in helper types are made of.

📌 **Interview term: infer** — a keyword that declares a type variable inside the \`extends\` clause of a conditional type. TypeScript works out its value by matching, and it can be used in the true branch.

## 2. The Core Idea

A conditional type is \`T extends Pattern ? Yes : No\`. Normally the pattern is a fixed type. With \`infer\`, part of the pattern is a placeholder:

~~~ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
~~~

Read it out loud: "if \`F\` is a function that returns some type — call it \`R\` — then the answer is \`R\`; otherwise \`never\`."

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="A function type is matched against a pattern with infer R, and the hole is filled with number">
  <defs>
    <marker id="q1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="210" height="100" rx="10"/>
  <text class="d-text" x="125" y="92" text-anchor="middle">checked type F</text>
  <text class="d-sub" x="125" y="118" text-anchor="middle">(x: string) =&gt; number</text>
  <rect class="d-box" x="290" y="50" width="210" height="100" rx="10"/>
  <text class="d-text" x="395" y="92" text-anchor="middle">pattern</text>
  <text class="d-sub" x="395" y="118" text-anchor="middle">(...args) =&gt; infer R</text>
  <rect class="d-box-accent" x="560" y="50" width="200" height="100" rx="10"/>
  <text class="d-text" x="660" y="92" text-anchor="middle">match found</text>
  <text class="d-sub" x="660" y="118" text-anchor="middle">R is number</text>
  <path class="d-edge" d="M 234 100 L 284 100" marker-end="url(#q1arrow)"/>
  <path class="d-edge-accent" d="M 504 100 L 554 100" marker-end="url(#q1arrow)"/>
</svg>

TypeScript lines up the checked type with the pattern, the same way it infers a generic argument when you call a function, and reads off what sits where \`infer R\` is. Example 1 applies it to a real function:

~~~ts
function makeUser(name: string, age: number) {
  return { name, age, admin: false };
}
type User = MyReturnType<typeof makeUser>; // { name: string; age: number; admin: boolean }
~~~

You never wrote the \`User\` type by hand: it is derived, so it stays correct when \`makeUser\` changes. The built-in \`ReturnType\` in the 5.4.5 lib is the same idea:

~~~ts
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
~~~

\`infer\` arrived together with conditional types in TypeScript 2.8, and \`ReturnType\`, \`Exclude\`, \`Extract\` and \`NonNullable\` were added to the lib in the same release ([TypeScript 2.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html)). For the built-ins themselves, see [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

📌 **Interview term: conditional type** — \`T extends U ? X : Y\`: a type that picks \`X\` or \`Y\` depending on whether \`T\` is assignable to \`U\`. Covered in depth in [What are conditional types?](/interview-question/what-are-conditional-types)

📌 **Interview term: true branch / false branch** — the \`X\` and \`Y\` parts. An \`infer\` variable exists only in the true branch.

## 3. Where You Can Put \`infer\`

Anywhere in the pattern that a type could go. Example 1 checks each of these:

| Helper | Pattern | Input | Result |
| :--- | :--- | :--- | :--- |
| \`FirstArg<F>\` | \`(first: infer A, ...rest: any[]) => any\` | \`typeof makeUser\` | \`string\` |
| \`ElementOf<T>\` | \`readonly (infer E)[]\` | \`string[]\` | \`string\` |
| \`Head<T>\` | \`[infer H, ...unknown[]]\` | \`[boolean, string, number]\` | \`boolean\` |
| \`Tail<T>\` | \`[unknown, ...infer Rest]\` | \`[boolean, string, number]\` | \`[string, number]\` |
| \`PromiseValue<T>\` | \`Promise<infer V>\` | \`Promise<Date>\` | \`Date\` |
| \`MapValue<T>\` | \`Map<any, infer V>\` | \`Map<string, number[]>\` | \`number[]\` |
| \`Getter<K>\` | \`\` \`get\${infer Name}\` \`\` | \`"getUserName"\` | \`"userName"\` (after \`Uncapitalize\`) |

Two details in that table matter in interviews:

- **Parentheses in \`(infer E)[]\`.** Without them, \`T extends infer E[] ? E : never\` does not even parse: tsc 5.4.5 stops with \`error TS1005: '?' expected.\` Write \`(infer E)[]\` or \`Array<infer E>\`.
- **\`readonly\` in the array pattern.** A plain \`(infer E)[]\` pattern does not match a \`readonly string[]\` (example 1 checks that the result is \`never\`), because a readonly array is not assignable to a mutable one. \`readonly (infer E)[]\` matches both.

The last row is a **template literal type** with a hole — \`infer\` there parses a string. That topic has its own page: [What are template literal types?](/interview-question/what-are-template-literal-types)

## 4. When the Pattern Does Not Match

\`infer\` never "fails" with an error. If the checked type does not fit the pattern, there is nothing to fill in, and the false branch is chosen:

~~~ts
type A = MyReturnType<string>; // never  (string is not a function)
type B = ElementOf<number>;    // never  (number is not an array)
~~~

That is why the false branch deserves thought. \`never\` says "this makes no sense"; returning \`T\` unchanged says "leave non-matching types alone" — the choice \`Awaited\` makes for non-promises.

And \`infer\` is only allowed in that one place. Example 1 writes \`type Bad = infer X;\` and a generic constraint \`<T extends Promise<infer U>>\`, each under a \`// @ts-expect-error\`. Without the directives tsc 5.4.5 reports the same error for both:

~~~text
error TS1338: 'infer' declarations are only permitted in the 'extends' clause of a conditional type.
~~~

📌 **Interview term: pattern matching (on types)** — describing a shape with holes and letting the compiler fill the holes, which is what \`extends ... infer ...\` does.

## 5. The Finer Rules

### One name, several places

You may use the same \`infer U\` twice. What \`U\` becomes depends on **where** the places are:

~~~ts
type BothProps<T> = T extends { a: infer U; b: infer U } ? U : never;
// BothProps<{ a: string; b: number }>  is  string | number

type BothParams<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
// with a: (x: { id: number }) => void and b: (x: { name: string }) => void
// the result is { id: number } & { name: string }
~~~

Property types are **covariant** (output) positions, so the candidates are combined into a union. Function parameters are **contravariant** (input) positions: a value has to work for both functions, so the candidates are combined into an intersection. The TypeScript 2.8 release notes state this rule: covariant candidates give a union, otherwise contravariant ones give an intersection. Example 2 checks both. Variance itself is explained in [What are covariance and contravariance?](/interview-question/what-are-covariance-and-contravariance)

📌 **Interview term: inference candidate** — each type the compiler collects for an \`infer\` variable while matching; several candidates are merged into a union or an intersection.

### Constraining the inferred type: \`infer X extends C\`

Since TypeScript 4.7 you can attach a constraint directly to the inferred variable ([TypeScript 4.7 playground example](https://www.typescriptlang.org/play/4-7/new-ts-features/extends-constraints.ts.html)). The match only succeeds if the inferred type also satisfies \`C\`:

~~~ts
type FirstString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
// FirstString<["a", 1]> is "a";  FirstString<[1, "a"]> is never
~~~

Before 4.7 this needed a second, nested conditional (\`S extends string ? S : never\`).

With a primitive constraint inside a template literal, the constraint also **converts**: since TypeScript 4.8, \`"42"\` matched against \`\` \`\${infer N extends number}\` \`\` gives the literal type \`42\`, not just \`number\` ([Announcing TypeScript 4.8](https://devblogs.microsoft.com/typescript/announcing-typescript-4-8/)). It only does this when the string survives a round trip: \`"1.0"\` becomes the number \`1\`, which prints back as \`"1"\`, so the result widens to \`number\`. Example 2 checks \`"42"\` → \`42\`, \`"abc"\` → \`never\` and \`"1.0"\` → \`number\`.

### Overloaded functions: the last signature wins

~~~ts
function parse(x: string): number;
function parse(x: number): string;
type ParseResult = ReturnType<typeof parse>; // string  (from the LAST overload)
~~~

Inference against an overloaded function reads only the last signature, so \`ReturnType\` cannot tell you "number for strings". If you need that, call the function with a specific argument type instead, or reorder the overloads. More on overloads: [What are function overloads?](/interview-question/what-are-function-overloads)

### Generic functions: type parameters become their constraints

\`ReturnType<typeof identity>\` for \`function identity<T>(x: T): T\` is \`unknown\`: the compiler has no specific \`T\`, so it uses the constraint (\`unknown\` when there is none). An **instantiation expression** fixes \`T\` first: \`ReturnType<typeof identity<number>>\` is \`number\`. Example 2 checks both.

📌 **Interview term: instantiation expression** — \`fn<Type>\` written without a call, which produces the function type with its type parameters filled in .

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5. Every \`Equal<...>\` line is a compile-time check, and the \`// @ts-expect-error\` line is a real error, quoted in section 4 from a run with the directive removed. Then each example was run the way the page runs it.

Example 1, \`infer\` in every position:

~~~text
{"name":"Ada","age":36,"admin":false}
GRACE
["x",2]
userName,id
~~~

Example 2, candidates, constraints, overloads and generics:

~~~text
8
71
84
{"id":1,"name":"x"}
~~~

Lines 1 and 2 are the overloads at run time: \`parse("7")\` returns the number \`7\`, so \`+ 1\` gives \`8\`; \`parse(7)\` returns the string \`"7"\`, so \`+ 1\` concatenates to \`71\`. The types agree (\`number + 1\` and \`string + 1\`), yet \`ReturnType<typeof parse>\` only ever reports \`string\`.

## 7. Edge Cases

| Case | Result | Why |
| :--- | :--- | :--- |
| No match | false branch | nothing to infer |
| \`infer\` outside \`extends\` | TS1338 | only legal in a conditional type pattern |
| Same name in two property spots | union | covariant candidates |
| Same name in two parameter spots | intersection | contravariant candidates |
| Overloaded function | last signature | inference reads one signature |
| Generic function | its constraint (\`unknown\`) | no specific type argument |
| \`\` \`\${infer N extends number}\` \`\` on \`"1.0"\` | \`number\` | literal does not round-trip |

## Common Pitfalls

- **Forgetting the false branch matters.** \`never\` and \`T\` give very different results for non-matching input; choose deliberately.
- **Writing \`(infer E)[]\` without \`readonly\`.** A \`readonly string[]\` will not match, and you silently get the false branch.
- **Expecting \`ReturnType\` to understand overloads.** It reports the last overload only.
- **Using \`infer\` in a generic constraint.** \`<T extends Promise<infer U>>\` is error TS1338; move the extraction into a conditional type.
- **Assuming the same \`infer\` name always gives a union.** In parameter positions it gives an intersection.
- **Over-nesting conditionals before 4.7.** Use \`infer X extends C\` instead of a second conditional when your TypeScript version supports it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> declares a type variable inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> clause of a conditional type. TypeScript fills it by <strong style="color:#ffca28;">matching</strong> the checked type against the pattern, and I can use it in the true branch.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Example:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type MyReturnType&lt;F&gt; = F extends (...args: any[]) =&gt; infer R ? R : never</code>. That is how the built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Parameters</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InstanceType</code> work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Positions:</strong> <span style="color:#f0e2c8;">It works anywhere in the pattern: parameters, array elements with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly (infer E)[]</code>, tuple heads and rests, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;infer V&gt;</code>, even a hole in a template literal type to parse strings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. No match:</strong> <span style="color:#f0e2c8;">If the pattern does not fit, the false branch is chosen, so I pick <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> there on purpose. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> anywhere else is error TS1338.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Fine print:</strong> <span style="color:#f0e2c8;">Same name in covariant spots gives a union, in parameter spots an intersection; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer X extends C</code> (4.7+) constrains the match; overloads infer from the last signature only.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReturnType</code> of an overloaded function give the wrong answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inference against an overload set uses only the <strong style="color:#ffca28;">last</strong> signature. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse(x: string): number; parse(x: number): string</code> it reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>. Call it with the argument type you care about, or reorder the overloads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof identity&gt;</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function identity&lt;T&gt;(x: T): T</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>: the type parameter becomes its constraint. Use an instantiation expression, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof identity&lt;number&gt;&gt;</code>, to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you use the same <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">infer U</code> in two places?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Covariant spots such as two properties give a union of the candidates; contravariant spots such as two callback parameters give an intersection, because a value must satisfy both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you infer a number from a string like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"42"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Match it against a template literal type whose hole is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer N extends number</code>. Since 4.8 that gives the literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">42</code>; a string that does not round-trip, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"1.0"</code>, widens to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">infer</code> in a generic constraint like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;T extends Promise&lt;infer U&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is error TS1338 there too (checked), as the 2.8 notes say. Constrain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;unknown&gt;</code> and extract with a conditional type such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;T&gt;</code> inside.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| infer | Declares a type variable in a conditional type pattern, filled by matching |
| Conditional type | \`T extends U ? X : Y\`, choosing a branch by assignability |
| True / false branch | The two results of a conditional type; \`infer\` variables live in the true one |
| Pattern matching (on types) | Describing a shape with holes the compiler fills |
| Inference candidate | Each type collected for an \`infer\` variable; merged into a union or intersection |
| Instantiation expression | \`fn<Type>\` without a call, fixing a generic function type parameters |

**Conclusion:** \`infer\` turns a conditional type from a yes/no question into an extraction: describe the shape, mark the part you want, and TypeScript fills it in or falls back to the other branch. Knowing where it may appear, what the false branch should be, how repeated names combine, and the overload and generic edge cases is what separates "I have seen \`ReturnType\`" from being able to write your own utilities — the next step, building deep recursive ones, is in [How do you use infer to build deep Awaited, ReturnType and Unwrap utilities?](/interview-question/how-do-you-use-infer-to-build-deep-awaited-returntype-and-unwrap-utilities)`,
    examples: [
      {
        label: `infer in every position, the false branch and where infer is not allowed`,
        code: `// infer: "match this pattern, and give a name to the part I mark".
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Pull the return type out of a function type.
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
function makeUser(name: string, age: number) {
  return { name, age, admin: false };
}
type User = MyReturnType<typeof makeUser>;
const _1: Equal<User, { name: string; age: number; admin: boolean }> = true;

// 2. The same idea in other positions.
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type Head<T> = T extends [infer H, ...unknown[]] ? H : never;
type Tail<T> = T extends [unknown, ...infer Rest] ? Rest : never;
type PromiseValue<T> = T extends Promise<infer V> ? V : never;
type MapValue<T> = T extends Map<any, infer V> ? V : never;
const _2: Equal<FirstArg<typeof makeUser>, string> = true;
const _3: Equal<ElementOf<string[]>, string> = true;
const _4: Equal<Head<[boolean, string, number]>, boolean> = true;
const _5: Equal<Tail<[boolean, string, number]>, [string, number]> = true;
const _6: Equal<PromiseValue<Promise<Date>>, Date> = true;
const _7: Equal<MapValue<Map<string, number[]>>, number[]> = true;

// 3. No match: the false branch is taken, nothing is inferred.
const _8: Equal<MyReturnType<string>, never> = true;
const _9: Equal<ElementOf<number>, never> = true;
// A pattern without readonly does not match a readonly array.
type MutableElementOf<T> = T extends (infer E)[] ? E : never;
const _11: Equal<MutableElementOf<readonly string[]>, never> = true;

// 4. infer inside a template literal type parses strings.
type Getter<K> = K extends \`get\${infer Name}\` ? Uncapitalize<Name> : never;
const _10: Equal<Getter<"getUserName">, "userName"> = true;

// 5. infer is only legal in the extends clause of a conditional type.
// @ts-expect-error 'infer' declarations are only permitted in the 'extends' clause
type Bad = infer X;
// @ts-expect-error not in a generic constraint either
function onlyPromises<T extends Promise<infer U>>(p: T) {}

// Run time: the types describe these real values.
const u: User = makeUser("Ada", 36);
console.log(JSON.stringify(u));
const first: FirstArg<typeof makeUser> = "Grace";
console.log(first.toUpperCase());
const pair: Tail<[boolean, string, number]> = ["x", 2];
console.log(JSON.stringify(pair));
console.log(["getUserName", "getId"].map((k) => k.slice(3, 4).toLowerCase() + k.slice(4)).join(","));`,
      },
      {
        label: `Candidates, infer X extends C, overloads and generic functions`,
        code: `// The finer rules of infer: candidates, constraints, overloads, generics.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. The same name used twice. Out positions (covariant) give a UNION...
type BothProps<T> = T extends { a: infer U; b: infer U } ? U : never;
const _1: Equal<BothProps<{ a: string; b: number }>, string | number> = true;
// ...parameter positions (contravariant) give an INTERSECTION.
type BothParams<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
const _2: Equal<BothParams<{ a: (x: { id: number }) => void; b: (x: { name: string }) => void }>, { id: number } & { name: string }> = true;

// 2. A constraint on the inferred variable (infer X extends C).
type FirstString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
const _3: Equal<FirstString<["a", 1]>, "a"> = true;
const _4: Equal<FirstString<[1, "a"]>, never> = true;
// With a primitive constraint, a template literal infers the literal type.
type ToNumber<S> = S extends \`\${infer N extends number}\` ? N : never;
const _5: Equal<ToNumber<"42">, 42> = true;
const _6: Equal<ToNumber<"abc">, never> = true;
// The round trip rule: "1.0" becomes the number 1, and back to "1", so the literal is lost.
const _7: Equal<ToNumber<"1.0">, number> = true;

// 3. Overloads: inference reads the LAST signature only.
function parse(x: string): number;
function parse(x: number): string;
function parse(x: string | number): string | number {
  return typeof x === "string" ? Number(x) : String(x);
}
type ParseResult = ReturnType<typeof parse>;
const _8: Equal<ParseResult, string> = true;

// 4. A generic function: its type parameter becomes its constraint (unknown here).
function identity<T>(x: T): T {
  return x;
}
const _9: Equal<ReturnType<typeof identity>, unknown> = true;
// An instantiation expression fixes T first.
const _10: Equal<ReturnType<typeof identity<number>>, number> = true;

// 5. Without infer you would have to know the answer already.
type Elem1<T> = T extends (infer E)[] ? E : never;
const _11: Equal<Elem1<(string | boolean)[]>, string | boolean> = true;

// Run time.
console.log(parse("7") + 1);
console.log(parse(7) + 1);
const n: ToNumber<"42"> = 42;
console.log(n * 2);
const both: BothParams<{ a: (x: { id: number }) => void; b: (x: { name: string }) => void }> = { id: 1, name: "x" };
console.log(JSON.stringify(both));`,
      },
    ],
  },
  {
    title: `How do you use \`infer\` to build deep \`Awaited\`, \`ReturnType\` and \`Unwrap\` utilities?`,
    difficulty: "hard",
    seoDescription: `Build deep Awaited, curried ReturnType and Unwrap types with infer and recursion, type an API client, and handle unions, greediness and depth limits.`,
    description: `**Question presented to candidate:**
"Using \`infer\`, build me a deep version of \`Awaited\`, a \`ReturnType\` that sees through curried functions, and a general \`Unwrap\` that peels promises, arrays and functions. Then tell me where these break."

**What a strong answer should cover:**
- The recipe: a conditional type whose true branch calls itself on the inferred part (\`T extends PromiseLike<infer V> ? DeepAwaited<V> : T\`), with the false branch as the base case
- Ordering several \`infer\` checks in one chain (promise, then array, then function) and choosing what non-matching types return
- Distribution: a naked \`T\` unwraps each union member separately; \`[T] extends [...]\` tests the union as a whole
- Practical use: mapping an API client to its resolved data with \`Awaited<ReturnType<...>>\`, and typing arguments with \`infer P\`
- Limits: deep unwraps are greedy, special inputs (\`any\`, \`never\`, \`unknown\`), and the instantiation depth limit (error TS2589); tail-recursive conditional types (TypeScript 4.5) go much deeper

**Clarifying questions expected:**
- Should \`Unwrap\` stop at arrays and functions, or only peel promises?
- Should a union be unwrapped member by member, or treated as one type?

**Code / implementation expected:** Yes — write the recursive utilities and show them on nested input.`,
    answer: `**Target Audience:** Developers who know what \`infer\` does and want to write their own recursive utility types for real code.
**Difficulty:** Hard
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; the 4.5 release fact is cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

This page is the applied follow-up to [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do) (the basics of \`infer\`) and [What is the Awaited utility type?](/interview-question/what-is-the-awaited-utility-type) (the built-in). Here we build our own.

## 1. Why This Even Matters — A Story First

Think of Russian nesting dolls. Your friend hands you a doll and asks "what is the smallest one inside?" You do not know how many layers there are. So you follow one rule: **if it opens, open it and ask the same question about what is inside; if it does not open, that is your answer.**

That rule is all a deep utility type is. "If it opens" is an \`infer\` pattern. "Ask the same question about what is inside" is the type calling itself. "If it does not open, that is your answer" is the false branch. Real code is full of nested dolls: a function that returns a promise of an array of objects, a curried function that returns a function that returns a number. Deep utilities let you name the innermost type once, instead of writing \`Awaited<ReturnType<...>>[number]\` by hand everywhere.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which wrappers should be peeled: promises only, or arrays and functions too? | Decides the \`infer\` checks in the chain and their order |
| Should a union be unwrapped per member? | Decides between a naked \`T\` (distributes) and \`[T]\` (does not) |
| What should a non-matching type give: itself or \`never\`? | The base case; \`T\` is the usual answer for "unwrap" utilities |
| How deep can inputs get? | Non-tail recursion hits error TS2589 after a few dozen levels |

## 3. The Recipe

Every deep utility here has the same three parts:

~~~ts
type Deep<T> = T extends Wrapper<infer Inner>  // 1. pattern: does it open?
  ? Deep<Inner>                                 // 2. recursive step: same question, one layer in
  : T;                                          // 3. base case: does not open, done
~~~

📌 **Interview term: recursive conditional type** — a conditional type that refers to itself in a branch, allowed since TypeScript 4.1 ([TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html)). It is what lets one definition handle any depth.

📌 **Interview term: base case** — the branch that stops the recursion. Without one that is reachable, the type cannot finish.

### Deep \`Awaited\`

~~~ts
type DeepAwaited<T> = T extends { then(onfulfilled: (value: infer V) => any): any } ? DeepAwaited<V> : T;
// DeepAwaited<Promise<Promise<Promise<number>>>> is number
// DeepAwaited<string> is string
~~~

The pattern matches anything with a \`then\` method — a **thenable** — and infers the value its callback receives. Example 1 checks it agrees with the built-in \`Awaited\` on nested promises. The built-in adds special cases (null, a \`then\` that is not callable); [What is the Awaited utility type?](/interview-question/what-is-the-awaited-utility-type) walks through its source.

### Deep \`ReturnType\`: see through curried functions

~~~ts
type FinalReturn<F> = F extends (...args: any[]) => infer R ? FinalReturn<R> : F;
const add = (a: number) => (b: number) => (c: number) => a + b + c;
// ReturnType<typeof add>  is (b: number) => (c: number) => number   one layer only
// FinalReturn<typeof add> is number                                  every layer
~~~

📌 **Interview term: curried function** — a function that takes one argument and returns another function for the next one, like \`add(1)(2)(3)\`.

### A general \`Unwrap\`

Several patterns, tried in order, each recursing:

~~~ts
type Unwrap<T> =
  T extends PromiseLike<infer V> ? Unwrap<V> :
  T extends readonly (infer E)[] ? Unwrap<E> :
  T extends (...args: any[]) => infer R ? Unwrap<R> :
  T;
// Unwrap<Promise<string[][]>>               is string
// Unwrap<() => Promise<Array<() => Date>>>  is Date
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="Unwrap checks promise, then array, then function, each looping back, and otherwise returns T">
  <defs>
    <marker id="q2arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="80" text-anchor="middle">input T</text>
  <rect class="d-box" x="230" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="305" y="72" text-anchor="middle">promise?</text>
  <text class="d-sub" x="305" y="94" text-anchor="middle">infer V</text>
  <rect class="d-box" x="430" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="505" y="72" text-anchor="middle">array?</text>
  <text class="d-sub" x="505" y="94" text-anchor="middle">infer E</text>
  <rect class="d-box" x="630" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="705" y="72" text-anchor="middle">function?</text>
  <text class="d-sub" x="705" y="94" text-anchor="middle">infer R</text>
  <rect class="d-box-accent" x="630" y="200" width="150" height="70" rx="10"/>
  <text class="d-text" x="705" y="232" text-anchor="middle">return T</text>
  <text class="d-sub" x="705" y="254" text-anchor="middle">base case</text>
  <rect class="d-box-muted" x="230" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="355" y="232" text-anchor="middle">Unwrap again</text>
  <text class="d-sub" x="355" y="254" text-anchor="middle">on the inferred part</text>
  <path class="d-edge" d="M 174 75 L 224 75" marker-end="url(#q2arrow)"/>
  <path class="d-edge-dashed" d="M 384 75 L 424 75" marker-end="url(#q2arrow)"/>
  <path class="d-edge-dashed" d="M 584 75 L 624 75" marker-end="url(#q2arrow)"/>
  <path class="d-edge-dashed" d="M 705 114 L 705 194" marker-end="url(#q2arrow)"/>
  <path class="d-edge-accent" d="M 305 114 L 305 194" marker-end="url(#q2arrow)"/>
  <path class="d-edge" d="M 230 235 L 95 235 L 95 116" marker-end="url(#q2arrow)"/>
</svg>

Dashed arrows are "no match, try the next pattern"; a match at any of the three checks goes down to "Unwrap again" (only the promise arrow is drawn), which feeds back to the start. Only when nothing matches does the type return \`T\`.

Order matters when a type fits more than one pattern: the checks are tried top to bottom and the first match wins, so put the most specific check first.

## 4. Unions: Distribute or Not?

\`Unwrap<T>\` checks a **naked** type parameter, so it is a **distributive conditional type**: a union is split, each member unwrapped, and the results joined.

~~~ts
// Unwrap<Promise<number> | string[]>  is  number | string
~~~

Usually that is what you want. To test the union **as a whole**, wrap both sides in a one-element tuple:

~~~ts
type UnwrapWhole<T> = [T] extends [PromiseLike<infer V>] ? UnwrapWhole<V> : T;
// UnwrapWhole<Promise<number> | string>           is Promise<number> | string   (string is no promise, so no match)
// UnwrapWhole<Promise<number> | Promise<string>>  is string | number            (every member is a promise)
~~~

The full story of why naked type parameters distribute is in [Why are conditional types distributive and how do you control it with infer?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer)

📌 **Interview term: distributive conditional type** — a conditional type over a naked type parameter, applied to each member of a union separately.

## 5. Inferring Parameters Too

\`infer\` can capture a whole parameter list as a tuple. Combining it with the recursion gives "the arguments of the **last** function in a curried chain":

~~~ts
type LastParams<F> = F extends (...args: infer P) => infer R
  ? (R extends (...args: any[]) => any ? LastParams<R> : P)
  : never;
// LastParams<typeof add> is [c: number]   (the parameter name is kept as a tuple label)
~~~

## 6. Applied: Typing an API Client

The most common real use is deriving data types from an object of async functions, so the types follow the implementation. Example 2:

~~~ts
const api = {
  async getUser(id: number) { return { id, name: "Ada", tags: ["admin"] }; },
  async listOrders() { return [{ sku: "A1", qty: 2 }]; },
  ping() { return "pong" as const; },
};

type Fn = (...args: any[]) => any;
type ApiData<T> = { [K in keyof T]: T[K] extends Fn ? Awaited<ReturnType<T[K]>> : never };
type Args<T>    = { [K in keyof T]: T[K] extends (...args: infer P) => any ? P : never };

async function call<K extends keyof typeof api>(name: K, ...args: Args<typeof api>[K]): Promise<ApiData<typeof api>[K]> {
  const f = api[name] as (...a: unknown[]) => unknown;
  return (await f(...args)) as ApiData<typeof api>[K];
}
~~~

\`ApiData<typeof api>["getUser"]\` is \`{ id: number; name: string; tags: string[] }\`, \`["ping"]\` is \`"pong"\`, and \`call("getUser", "7")\` is rejected:

~~~text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

The \`as\` casts inside \`call\` are where the type system cannot follow a value indexed by a generic key; they are kept to one place on purpose. Mapped types over \`keyof\` are covered in [What are mapped types?](/interview-question/what-are-mapped-types)

## 7. Where Deep Unwraps Break

**They are greedy.** \`Unwrap<typeof api.listOrders>\` is \`{ sku: string; qty: number }\` — the element, not the array. If you wanted the array of orders, \`Unwrap\` has gone one layer past it; \`Awaited<ReturnType<...>>\` stops where you want. It does **not** look inside object properties, though: in example 2 \`tags\` stays \`string[]\`.

**Special inputs.** Example 2 checks: \`Unwrap<any>\` is \`any\`, \`Unwrap<never>\` is \`never\` (a distributive type over an empty union), \`Unwrap<unknown>\` is \`unknown\`.

**Depth limits.** The compiler stops instantiating types that nest too deeply, with:

~~~text
error TS2589: Type instantiation is excessively deep and possibly infinite.
~~~

In a separate tsc 5.4.5 run, \`DeepAwaited\` handled 999 nested promises and reported TS2589 at 1000. It gets that far because it is **tail recursive**: the recursive call is the **whole** branch, which TypeScript 4.5 optimised so it evaluates in a loop ([TypeScript 4.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html)). A type that wraps the recursive call in something else (a template, a union with another type) is not tail recursive and fails after a few dozen levels — measured in [What are recursive types?](/interview-question/what-are-recursive-types)

📌 **Interview term: tail-recursive conditional type** — a conditional type whose branch is just the recursive call, so the compiler can evaluate it in a loop instead of a growing stack.

**Self-referential thenables.** An interface like \`interface Chain { then(cb: (v: Chain) => void): void }\` never reaches a base case: in that same run both \`DeepAwaited<Chain>\` and the built-in \`Awaited<Chain>\` reported TS2589.

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a compile-time check, and the \`// @ts-expect-error\` line is the TS2345 error quoted above. Then each example was run as the page runs it.

Example 1, the deep utilities:

~~~text
6
42
~~~

\`6\` is \`add\` called through every layer with \`2\` (\`2 + 2 + 2\`), via a loop that keeps calling while the result is a function — the run-time twin of \`FinalReturn\`. \`42\` is printed later because it comes from an \`await\`. Note one more detail checked there: \`Promise.resolve(Promise.resolve(41))\` is already typed \`Promise<number>\`, because the lib types \`Promise.resolve\` with \`Awaited\`.

Example 2, the API client:

~~~text
Ada 7 1
A1 2
pong
~~~

## Common Pitfalls

- **No reachable base case.** A self-referencing input or a missing false branch ends in TS2589.
- **Unwrapping one layer too many.** A greedy \`Unwrap\` returns array elements when you wanted the array.
- **Forgetting distribution.** A naked \`T\` unwraps unions per member; use \`[T]\` when the union must be tested as one type.
- **Putting a broad check first.** The first matching pattern wins; order checks from most to least specific.
- **Non-tail recursion on long inputs.** Wrapping the recursive call (in a template or union) cuts the depth to a few dozen levels; use an accumulator.
- **Reinventing \`Awaited\`.** For "the value an async function resolves to", \`Awaited<ReturnType<typeof fn>>\` already handles thenables and edge cases.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recipe:</strong> <span style="color:#f0e2c8;">A deep utility is a conditional type whose true branch <strong style="color:#ffca28;">calls itself</strong> on what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> captured, with the false branch as the base case: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends PromiseLike&lt;infer V&gt; ? DeepAwaited&lt;V&gt; : T</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Deep ReturnType:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">F extends (...args: any[]) =&gt; infer R ? FinalReturn&lt;R&gt; : F</code> sees through curried functions; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code> stops after one layer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Unwrap:</strong> <span style="color:#f0e2c8;">Chain several checks — promise, then array, then function — each recursing, ending in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. The first matching pattern wins, so order matters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unions:</strong> <span style="color:#f0e2c8;">With a naked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> it distributes and unwraps each member; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [...]</code> tests the union as a whole.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">It is greedy, and deep nesting hits TS2589. Keeping the recursive call as the whole branch makes it <strong style="color:#ffca28;">tail recursive</strong> (4.5+), which in 5.4.5 handled 999 nested promises.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the resolved value of one async function, do use it. A custom deep utility is for chains the built-ins do not cover: curried functions, arrays inside promises, or a whole API object mapped at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unwrap&lt;never&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. A distributive conditional type over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> maps over an empty union, so the result is empty too. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unwrap&lt;any&gt;</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unwrap</code> from distributing over a union?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap both sides: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [PromiseLike&lt;infer V&gt;]</code>. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;number&gt; | string</code> does not match as a whole and comes back unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "tail recursive" mean for a type, and why care?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive call is the entire branch, nothing wrapped around it. TypeScript 4.5 evaluates such types in a loop, so they go about a thousand levels deep instead of a few dozen before TS2589.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you type a function that calls any method of an API client by name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call&lt;K extends keyof typeof api&gt;(name: K, ...args: Args&lt;typeof api&gt;[K]): Promise&lt;ApiData&lt;typeof api&gt;[K]&gt;</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Args</code> infers each method parameter tuple and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ApiData</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;ReturnType&lt;...&gt;&gt;</code> per key.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive conditional type | A conditional type that refers to itself in a branch |
| Base case | The branch that stops the recursion |
| Curried function | A function returning a function for the next argument |
| Distributive conditional type | A conditional type over a naked type parameter, applied to each union member |
| Tail-recursive conditional type | A conditional type whose branch is only the recursive call, evaluated in a loop |

**Conclusion:** \`infer\` extracts one layer; recursion turns that into "all the layers". The recipe — pattern, recursive step, base case — builds deep \`Awaited\`, a curried-function \`ReturnType\` and a general \`Unwrap\` in a few lines. The judgement is in the details: which wrappers to peel and in what order, whether unions distribute, not peeling one layer too many, and keeping the recursion in tail position so real-world depths do not hit TS2589.`,
    examples: [
      {
        label: `Deep Awaited, FinalReturn, Unwrap and distribution`,
        code: `// Building deep unwrap utilities from infer + recursion.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Deep Awaited: infer the value a thenable passes on, then recurse on it.
type DeepAwaited<T> = T extends { then(onfulfilled: (value: infer V) => any): any } ? DeepAwaited<V> : T;
const _1: Equal<DeepAwaited<Promise<Promise<Promise<number>>>>, number> = true;
const _2: Equal<DeepAwaited<string>, string> = true;
// It matches the built-in on these inputs.
const _3: Equal<DeepAwaited<Promise<Promise<number>>>, Awaited<Promise<Promise<number>>>> = true;

// 2. Deep ReturnType: keep calling until the result is not a function.
type FinalReturn<F> = F extends (...args: any[]) => infer R ? FinalReturn<R> : F;
const add = (a: number) => (b: number) => (c: number) => a + b + c;
const _4: Equal<ReturnType<typeof add>, (b: number) => (c: number) => number> = true;
const _5: Equal<FinalReturn<typeof add>, number> = true;

// 3. A general Unwrap: promises, arrays and functions, any mix, any depth.
type Unwrap<T> =
  T extends PromiseLike<infer V> ? Unwrap<V> :
  T extends readonly (infer E)[] ? Unwrap<E> :
  T extends (...args: any[]) => infer R ? Unwrap<R> :
  T;
const _6: Equal<Unwrap<Promise<string[][]>>, string> = true;
const _7: Equal<Unwrap<() => Promise<Array<() => Date>>>, Date> = true;

// 4. These are distributive: a union is unwrapped member by member.
const _8: Equal<Unwrap<Promise<number> | string[]>, number | string> = true;
// Wrapping both sides in [ ] switches that off: the union is tested as a whole.
type UnwrapWhole<T> = [T] extends [PromiseLike<infer V>] ? UnwrapWhole<V> : T;
const _9: Equal<UnwrapWhole<Promise<number> | string>, Promise<number> | string> = true;
const _10: Equal<UnwrapWhole<Promise<number> | Promise<string>>, string | number> = true;

// 5. Unwrap the parameters too, not only results: the last arguments of a curried function.
type LastParams<F> = F extends (...args: infer P) => infer R ? (R extends (...args: any[]) => any ? LastParams<R> : P) : never;
const _11: Equal<LastParams<typeof add>, [c: number]> = true;

// Run time: the same recursion as real code.
async function main() {
  // Promise.resolve flattens too: its type is already Promise<number>.
  const nested = Promise.resolve(Promise.resolve(41));
  const _n: Equal<typeof nested, Promise<number>> = true;
  const v: DeepAwaited<typeof nested> = await nested;
  console.log(v + 1);
}
function callAll(f: unknown, arg: number): unknown {
  let r = f;
  while (typeof r === "function") r = r(arg);
  return r;
}
const total = callAll(add, 2) as FinalReturn<typeof add>;
console.log(total);
main();`,
      },
      {
        label: `Typing an API client with ApiData and Args`,
        code: `// Applied: deriving data types from an API client, and where deep unwraps stop.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const api = {
  async getUser(id: number) {
    return { id, name: "Ada", tags: ["admin"] };
  },
  async listOrders() {
    return [{ sku: "A1", qty: 2 }];
  },
  ping() {
    return "pong" as const;
  },
};

// 1. One mapped type gives the resolved data of every method.
type Fn = (...args: any[]) => any;
type ApiData<T> = { [K in keyof T]: T[K] extends Fn ? Awaited<ReturnType<T[K]>> : never };
type Data = ApiData<typeof api>;
const _1: Equal<Data["getUser"], { id: number; name: string; tags: string[] }> = true;
const _2: Equal<Data["ping"], "pong"> = true;

// 2. A deep Unwrap goes further: the element of a list result.
type Unwrap<T> =
  T extends PromiseLike<infer V> ? Unwrap<V> :
  T extends readonly (infer E)[] ? Unwrap<E> :
  T extends (...args: any[]) => infer R ? Unwrap<R> :
  T;
type Order = Unwrap<typeof api.listOrders>;
const _3: Equal<Order, { sku: string; qty: number }> = true;
// It is greedy (if you wanted the array of orders, it went past it),
// but it never looks inside object properties: tags stays string[].
type Tag = Unwrap<ReturnType<typeof api.getUser>>["tags"];
const _4: Equal<Tag, string[]> = true;

// 3. Arguments, with infer on the parameter list.
type Args<T> = { [K in keyof T]: T[K] extends (...args: infer P) => any ? P : never };
const _5: Equal<Args<typeof api>["getUser"], [id: number]> = true;

// 4. A typed caller built from these pieces.
async function call<K extends keyof typeof api>(name: K, ...args: Args<typeof api>[K]): Promise<Data[K]> {
  const f = api[name] as (...a: unknown[]) => unknown;
  return (await f(...args)) as Data[K];
}

// 5. Special inputs.
const _6: Equal<Unwrap<any>, any> = true;
const _7: Equal<Unwrap<never>, never> = true;
const _8: Equal<Unwrap<unknown>, unknown> = true;

async function main() {
  const user = await call("getUser", 7);
  console.log(user.name, user.id, user.tags.length);
  const orders = await call("listOrders");
  const first: Order = orders[0];
  console.log(first.sku, first.qty);
  console.log(await call("ping"));
  // @ts-expect-error getUser needs a number argument
  await call("getUser", "7");
}
main();`,
      },
    ],
  },
  {
    title: `What are template literal types?`,
    difficulty: "hard",
    seoDescription: `Template literal types build string types from other types: unions multiply, Capitalize and friends, pattern holes, key remapping and parsing with infer.`,
    description: `**Question presented to candidate:**
"What are template literal types in TypeScript? Show me a couple of places you would actually use them, and how you would pull information back out of a string type."

**What a strong answer should cover:**
- The syntax mirrors JavaScript template strings, but builds string literal **types**: \`\` \`on\${Capitalize<Ev>}\` \`\`; added in TypeScript 4.1
- Unions in the holes multiply: every combination is produced, and very large products are refused (error TS2590)
- The intrinsic helpers \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`, and primitive holes such as \`\` \`\${number}px\` \`\` that make patterns rather than finite unions
- Combined with key remapping (\`as\`) to derive property names, e.g. \`onNameChange\` handlers from a model
- With \`infer\` in a conditional type they parse strings: route params, \`Split\`, dotted paths; a leading \`infer\` takes the shortest match

**Code / implementation expected:** Yes — derive event or handler names, and write one small parser such as route params.`,
    answer: `**Target Audience:** Developers comfortable with literal and union types who want string-shaped APIs (event names, routes, CSS values, config paths) to be checked by the compiler.
**Difficulty:** Hard
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release facts (4.1, 4.8) are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A café prints its menu from two lists: sizes (small, medium, large) and drinks (latte, mocha). Nobody types out "small latte", "small mocha", "medium latte"... by hand. The printer combines the lists and produces all six. And when an order slip comes back saying "large mocha", the barista can read it **backwards**: the first word is the size, the rest is the drink.

Template literal types do both jobs for string types. They **build** string types by combining other types, and, with \`infer\`, they **read** string types back into parts. That means a typo in \`"onClik"\`, a missing \`:postId\` route parameter or a wrong config path \`"db.prot"\` becomes a compile error instead of a bug.

📌 **Interview term: template literal type** — a type written like a JavaScript template string, \`\` \`prefix-\${T}\` \`\`, whose holes hold types. The result is a string literal type, or a union of them. Added in TypeScript 4.1 ([TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html)).

## 2. Building Strings

### One hole

~~~ts
type Greeting = \`hello \${"world" | "there"}\`;
// "hello world" | "hello there"
~~~

The hole takes a type, not a value. A union in the hole gives a union result: one string per member. If literal and union types are new to you, start at [What are literal types?](/interview-question/what-are-literal-types)

### Several holes multiply

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Three sizes times two tones gives six class name strings">
  <defs>
    <marker id="q3arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">Size</text>
  <text class="d-sub" x="120" y="88" text-anchor="middle">sm, md, lg</text>
  <rect class="d-box" x="20" y="150" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="184" text-anchor="middle">Tone</text>
  <text class="d-sub" x="120" y="208" text-anchor="middle">primary, danger</text>
  <rect class="d-box-muted" x="290" y="90" width="180" height="80" rx="10"/>
  <text class="d-text" x="380" y="124" text-anchor="middle">btn-Size-Tone</text>
  <text class="d-sub" x="380" y="148" text-anchor="middle">3 times 2</text>
  <rect class="d-box-accent" x="540" y="70" width="220" height="120" rx="10"/>
  <text class="d-text" x="650" y="112" text-anchor="middle">6 literals</text>
  <text class="d-sub" x="650" y="138" text-anchor="middle">btn-sm-primary</text>
  <text class="d-sub" x="650" y="160" text-anchor="middle">and five more</text>
  <path class="d-edge" d="M 224 70 L 284 120" marker-end="url(#q3arrow)"/>
  <path class="d-edge" d="M 224 190 L 284 140" marker-end="url(#q3arrow)"/>
  <path class="d-edge-accent" d="M 474 130 L 534 130" marker-end="url(#q3arrow)"/>
</svg>

~~~ts
type Size = "sm" | "md" | "lg";
type Tone = "primary" | "danger";
type ButtonClass = \`btn-\${Size}-\${Tone}\`;
// "btn-sm-primary" | "btn-sm-danger" | "btn-md-primary" | "btn-md-danger" | "btn-lg-primary" | "btn-lg-danger"
~~~

The 4.1 release notes describe the result as every possible string that the union members can form. Example 1 checks all six.

📌 **Interview term: cross product (of unions)** — every combination of one member from each union, which is what several union holes produce.

It grows fast, and there is a ceiling. Example 2 checks that four holes of ten digits (10,000 strings) are fine, and five holes (100,000) are refused:

~~~text
error TS2590: Expression produces a union type that is too complex to represent.
~~~

### The intrinsic string helpers

Four built-in types change letter case. They are declared as \`type Uppercase<S extends string> = intrinsic;\` in the lib: the compiler implements them, you cannot write them yourself.

| Helper | Input | Result |
| :--- | :--- | :--- |
| \`Uppercase\` | \`"get"\` | \`"GET"\` |
| \`Lowercase\` | \`"POST"\` | \`"post"\` |
| \`Capitalize\` | \`"click" \\| "keyDown"\` in \`\` \`on\${...}\` \`\` | \`"onClick" \\| "onKeyDown"\` |
| \`Uncapitalize\` | \`"UserId"\` | \`"userId"\` |

📌 **Interview term: intrinsic string manipulation types** — \`Uppercase\`, \`Lowercase\`, \`Capitalize\` and \`Uncapitalize\`, built into the compiler.

### Primitive holes are patterns

A hole holding \`string\`, \`number\`, \`bigint\` or \`boolean\` does not list values; it describes a **pattern**:

~~~ts
type Px = \`\${number}px\`;
const ok1: Px = "12px";
const ok2: Px = "-0.5px";
const bad1: Px = "px";   // error
const bad2: Px = "12em"; // error
type Id = \`user_\${string}\`;
~~~

The two errors, from tsc 5.4.5 with the directives removed:

~~~text
error TS2322: Type '"px"' is not assignable to type '\`\${number}px\`'.
error TS2322: Type '"12em"' is not assignable to type '\`\${number}px\`'.
~~~

How strict is \`\${number}\`? The text before \`px\` is checked by whether it reads as a number, and that is looser than a CSS parser: example 2 checks that \`" 1px"\`, \`"0x10px"\` and \`"1e3px"\` are all accepted. Use it to catch mistakes, not to validate untrusted input.

## 3. Deriving Property Names

Template literal types become really useful inside a mapped type with **key remapping** (\`as\`):

~~~ts
type Model = { name: string; age: number };
type Handlers<T> = { [K in keyof T & string as \`on\${Capitalize<K>}Change\`]: (value: T[K]) => void };
// keyof Handlers<Model> is "onNameChange" | "onAgeChange"
// onNameChange takes a string, onAgeChange takes a number
~~~

\`keyof T & string\` keeps only string keys: \`keyof T\` may include \`symbol\`, and a hole accepts only \`string | number | bigint | boolean | null | undefined\` (tsc reports TS2322 for a bare \`keyof T\` there), and \`Capitalize\` needs a string anyway. The \`as\` clause itself is the subject of [What is key remapping in mapped types?](/interview-question/what-is-key-remapping-in-mapped-types)

A function can return the matching type, so the value and the type are built the same way:

~~~ts
function handlerName<K extends string>(k: K): \`on\${Capitalize<K>}Change\` {
  return \`on\${cap(k)}Change\`;
}
const hn = handlerName("name"); // type "onNameChange"
handlers[hn]("ada");            // checked: hn is a key of handlers
~~~

## 4. Reading Strings Back: \`infer\` in a Template

Put \`infer\` in a hole inside a conditional type, and TypeScript splits the string for you. (The basics of \`infer\` are in [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do))

### Route parameters

~~~ts
type Params<Path extends string> =
  Path extends \`\${string}:\${infer P}/\${infer Rest}\` ? P | Params<\`/\${Rest}\`> :
  Path extends \`\${string}:\${infer P}\` ? P :
  never;
// Params<"/users/:id/posts/:postId"> is "id" | "postId"
// Params<"/health"> is never

function buildUrl<P extends string>(path: P, params: Record<Params<P>, string | number>): string { ... }
buildUrl("/users/:id/posts/:postId", { id: 7 }); // error: postId is missing
~~~

The error, verbatim:

~~~text
error TS2345: Argument of type '{ id: number; }' is not assignable to parameter of type 'Record<"id" | "postId", string | number>'.
  Property 'postId' is missing in type '{ id: number; }' but required in type 'Record<"id" | "postId", string | number>'.
~~~

This is how typed routers check that the params object matches the path string.

### How the match splits

When two holes sit next to each other around a fixed piece of text, an \`infer\` before the separator takes the **shortest** possible match, and the last hole takes the rest:

~~~ts
type FirstDot<S> = S extends \`\${infer A}.\${infer B}\` ? [A, B] : never;
// FirstDot<"a.b.c"> is ["a", "b.c"]
~~~

That rule is what makes \`Split\` and dotted paths work:

~~~ts
type Split<S extends string, D extends string> =
  S extends \`\${infer Head}\${D}\${infer Tail}\` ? [Head, ...Split<Tail, D>] : [S];
// Split<"a,b,c", ","> is ["a", "b", "c"]

type Get<T, P extends string> =
  P extends \`\${infer K}.\${infer Rest}\` ? (K extends keyof T ? Get<T[K], Rest> : never) :
  P extends keyof T ? T[P] : never;
// Get<Config, "db.port"> is number,  Get<Config, "db.nope"> is never
~~~

These call themselves; recursion and its depth limits are covered in [What are recursive types?](/interview-question/what-are-recursive-types)

### Inferring numbers from strings

Since TypeScript 4.8, \`\` \`\${infer N extends number}\` \`\` matched against \`"42"\` gives the literal \`42\` ([Announcing TypeScript 4.8](https://devblogs.microsoft.com/typescript/announcing-typescript-4-8/)); the \`infer\` page checks it in 5.4.5.

📌 **Interview term: string parsing at the type level** — using \`infer\` inside template literal patterns to split a string literal type into typed parts.

## 5. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a compile-time check, and every \`// @ts-expect-error\` line is a real error, quoted above from a run with the directives removed. Then each example was run as the page runs it.

Example 1, building strings:

~~~text
onNameChange
name -> ADA
age -> 37
12px -0.5px user_42 px 12em
~~~

The last line is a reminder: the two values that failed type checking (\`"px"\`, \`"12em"\`) still exist at run time. Template literal types are erased; they check code, they do not validate data.

Example 2, parsing strings:

~~~text
/users/7/posts/intro
5433
3
0420
~~~

\`5433\` is \`get(cfg, "db.port") + 1\`: the dotted-path type made the result a \`number\`, so \`+ 1\` is arithmetic, not string concatenation.

## 6. Edge Cases

| Case | Result |
| :--- | :--- |
| Union in a hole | one string per member |
| Several union holes | cross product; 10^5 members gives TS2590 |
| \`\` \`\${number}px\` \`\` with \`" 1px"\` or \`"0x10px"\` | accepted |
| \`\` \`\${infer A}.\${infer B}\` \`\` on \`"a.b.c"\` | \`A\` is \`"a"\` (shortest), \`B\` is \`"b.c"\` |

## Common Pitfalls

- **Exploding unions.** Several large unions in holes multiply; at 100,000 members the compiler refuses with TS2590.
- **Putting \`keyof T\` straight into a hole.** \`keyof T\` may contain \`symbol\`, which no hole accepts (TS2322, \`Type 'symbol' is not assignable to type 'string | number | bigint | boolean | null | undefined'.\`); use \`keyof T & string\`.
- **Treating \`\${number}\` as a validator.** \`" 1px"\` and \`"0x10px"\` pass; and types are erased, so run-time data is not checked at all.
- **Forgetting which side is greedy.** An \`infer\` before a separator takes the shortest match; design parsers around that.
- **Hand-writing the value and the type separately.** Build both with the same helper, as \`handlerName\` does, so they cannot drift.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A template literal type uses template-string syntax at the type level — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on\${Capitalize&lt;Ev&gt;}</code> — to build string literal types. TypeScript 4.1 added them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Unions multiply:</strong> <span style="color:#f0e2c8;">A union in a hole gives one string per member; several holes give the <strong style="color:#ffca28;">cross product</strong>. Very large products fail with TS2590.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Helpers and patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uppercase</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lowercase</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Capitalize</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uncapitalize</code> are compiler intrinsics. A primitive hole like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\${number}px</code> is a pattern, not a finite list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real use:</strong> <span style="color:#f0e2c8;">With key remapping I derive names — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onNameChange</code> handlers from a model — and type string APIs like event names, CSS classes and config paths.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Parsing:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> in a hole, a conditional type splits strings: route params, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Split</code>, dotted paths. A leading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> takes the shortest match.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you type route params from a path like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">/users/:id</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A recursive conditional type that matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer P</code> up to the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code>, unioning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">P</code> with the params of the rest. Then the params argument is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;Params&lt;Path&gt;, string&gt;</code>, so a missing one is an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">keyof T &amp; string</code> in a remapped key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> can include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol</code> keys, and a hole only accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number | bigint | boolean | null | undefined</code>, so tsc reports TS2322. Intersecting with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> keeps only string keys, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Capitalize</code> needs too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a template literal type validate strings at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Types are erased; a value cast or parsed from JSON is not checked. And even at compile time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\${number}</code> accepts forms like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0x10</code> and a leading space. Validate untrusted input with code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">\${Digit}\${Digit}\${Digit}\${Digit}\${Digit}</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">10^5 combinations: TypeScript 5.4.5 reports TS2590, union too complex to represent. Four holes (10,000) still work. Use a pattern like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\${number}</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Split&lt;"a,b,c", ","&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Match <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">S</code> against a template with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer Head</code>, the separator, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer Tail</code>, and recurse: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Head, ...Split&lt;Tail, D&gt;]</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[S]</code> as the base case.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Template literal type | A type written like a template string whose holes hold types |
| Cross product (of unions) | Every combination of members from several union holes |
| Intrinsic string manipulation types | \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`, built into the compiler |
| String parsing at the type level | Using \`infer\` in template patterns to split string literal types |

**Conclusion:** Template literal types bring string templates to the type level: holes take types, unions multiply into every combination, and primitive holes describe patterns. Combined with key remapping they derive property names from models; combined with \`infer\` they parse strings into typed pieces, which is how typed routers and config getters work. Know the limits — the union size ceiling, the loose \`\${number}\` check, and the fact that nothing is checked at run time — and you can use them with confidence.`,
    examples: [
      {
        label: `Building string types: unions, intrinsics, patterns and handler names`,
        code: `// Template literal types: building string types out of other types.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Same syntax as a JS template string, but at the type level.
type Greeting = \`hello \${"world" | "there"}\`;
const _1: Equal<Greeting, "hello world" | "hello there"> = true;

// 2. Several unions multiply: every combination is produced.
type Size = "sm" | "md" | "lg";
type Tone = "primary" | "danger";
type ButtonClass = \`btn-\${Size}-\${Tone}\`;
const _2: Equal<ButtonClass, "btn-sm-primary" | "btn-sm-danger" | "btn-md-primary" | "btn-md-danger" | "btn-lg-primary" | "btn-lg-danger"> = true;

// 3. The four intrinsic string helpers.
type Ev = "click" | "keyDown";
const _3: Equal<\`on\${Capitalize<Ev>}\`, "onClick" | "onKeyDown"> = true;
const _4: Equal<Uppercase<"get">, "GET"> = true;
const _5: Equal<Lowercase<"POST">, "post"> = true;
const _6: Equal<Uncapitalize<"UserId">, "userId"> = true;

// 4. Primitive holes make patterns, not finite unions.
type Px = \`\${number}px\`;
const ok1: Px = "12px";
const ok2: Px = "-0.5px";
// @ts-expect-error "px" alone has no number in front
const bad1: Px = "px";
// @ts-expect-error a unit other than px
const bad2: Px = "12em";
type Id = \`user_\${string}\`;
const id: Id = "user_42";

// 5. With key remapping: derive handler names from a model.
type Model = { name: string; age: number };
type Handlers<T> = { [K in keyof T & string as \`on\${Capitalize<K>}Change\`]: (value: T[K]) => void };
const _7: Equal<keyof Handlers<Model>, "onNameChange" | "onAgeChange"> = true;

const handlers: Handlers<Model> = {
  onNameChange: (v) => console.log("name ->", v.toUpperCase()),
  onAgeChange: (v) => console.log("age ->", v + 1),
};

// 6. Run time: the type and the string building agree.
function cap<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}
function handlerName<K extends string>(k: K): \`on\${Capitalize<K>}Change\` {
  return \`on\${cap(k)}Change\`;
}
const hn = handlerName("name");
const _8: Equal<typeof hn, "onNameChange"> = true;
console.log(hn);
handlers[hn]("ada");
handlers[handlerName("age")](36);
console.log([ok1, ok2, id, bad1, bad2].join(" "));`,
      },
      {
        label: `Parsing strings: route params, Split, dotted paths and limits`,
        code: `// Template literal types + infer: parsing strings at the type level.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Route params: "/users/:id/posts/:postId" -> "id" | "postId".
type Params<Path extends string> =
  Path extends \`\${string}:\${infer P}/\${infer Rest}\` ? P | Params<\`/\${Rest}\`> :
  Path extends \`\${string}:\${infer P}\` ? P :
  never;
const _1: Equal<Params<"/users/:id/posts/:postId">, "id" | "postId"> = true;
const _2: Equal<Params<"/health">, never> = true;

function buildUrl<P extends string>(path: P, params: Record<Params<P>, string | number>): string {
  return path.replace(/:(\\w+)/g, (_, k: string) => String((params as Record<string, string | number>)[k]));
}
console.log(buildUrl("/users/:id/posts/:postId", { id: 7, postId: "intro" }));
// @ts-expect-error postId is missing
buildUrl("/users/:id/posts/:postId", { id: 7 });

// 2. Split and Trim, written with recursion.
type Split<S extends string, D extends string> =
  S extends \`\${infer Head}\${D}\${infer Tail}\` ? [Head, ...Split<Tail, D>] : [S];
const _3: Equal<Split<"a,b,c", ",">, ["a", "b", "c"]> = true;
type TrimLeft<S extends string> = S extends \` \${infer R}\` ? TrimLeft<R> : S;
const _4: Equal<TrimLeft<"   hi">, "hi"> = true;

// 3. A leading infer takes the SHORTEST match, the last one takes the rest.
type FirstDot<S> = S extends \`\${infer A}.\${infer B}\` ? [A, B] : never;
const _5: Equal<FirstDot<"a.b.c">, ["a", "b.c"]> = true;

// 4. Dotted paths into an object.
type Get<T, P extends string> =
  P extends \`\${infer K}.\${infer Rest}\` ? (K extends keyof T ? Get<T[K], Rest> : never) :
  P extends keyof T ? T[P] : never;
type Config = { db: { host: string; port: number }; debug: boolean };
const _6: Equal<Get<Config, "db.port">, number> = true;
const _7: Equal<Get<Config, "db.nope">, never> = true;

function get<P extends string>(obj: Config, path: P): Get<Config, P> {
  return path.split(".").reduce<any>((o, k) => o?.[k], obj);
}
const cfg: Config = { db: { host: "localhost", port: 5432 }, debug: false };
const port = get(cfg, "db.port");
console.log(port + 1);

// 5. Patterns are checked by parsing, so these also count as \`\${number}px\`.
type Px = \`\${number}px\`;
const odd: Px[] = [" 1px", "0x10px", "1e3px"];
console.log(odd.length);

// 6. There is a size limit: 10^4 combinations is fine, 10^5 is refused.
type D = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type FourDigits = \`\${D}\${D}\${D}\${D}\`;
const pin: FourDigits = "0420";
console.log(pin);
// @ts-expect-error 10^5 combinations is too many
type FiveDigits = \`\${D}\${D}\${D}\${D}\${D}\`;`,
      },
    ],
  },
  {
    title: `What are recursive types?`,
    difficulty: "hard",
    seoDescription: `Recursive types refer to themselves to model JSON, trees and lists, and recursive conditional types compute types; TS2589 and tail recursion explained.`,
    description: `**Question presented to candidate:**
"What are recursive types in TypeScript? Give me a data structure you would model with one, and then a type-level computation that uses recursion. What limits do you run into?"

**What a strong answer should cover:**
- A recursive type refers to itself, to describe nesting of unknown depth: \`Json\`, trees, linked lists, expression ASTs, including mutual recursion between two types
- The self-reference must go through a structure (object, array, tuple, generic); a bare \`type Loop = Loop | string\` is error TS2456. Type aliases became much more flexible here in TypeScript 3.7
- Recursive functions walk recursive types, and a discriminated union makes every case checked
- Recursive conditional types (TypeScript 4.1) compute types: deep array elements, all dotted paths of an object, tuple-length arithmetic
- The depth limit (error TS2589) and tail-recursive conditional types (TypeScript 4.5), which go about a thousand levels instead of a few dozen; the accumulator pattern

**Code / implementation expected:** Yes — a \`Json\` or tree type with a function over it, and one recursive conditional type.`,
    answer: `**Target Audience:** Developers who know unions, object types and generics, and need to describe nested data or compute types by recursion.
**Difficulty:** Hard
**TypeScript version:** Every type claim and depth measurement below was checked by TypeScript 5.4.5 with \`--strict\`; release facts (3.7, 4.1, 4.5) are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

How do you describe a folder on your computer? "A folder has a name, some files, and **some folders**." The definition uses the word it is defining — and that is fine, because each inner folder is smaller, and eventually you reach folders with no folders inside. Nobody needs to know in advance how deep the tree goes.

Lots of real data is like that: JSON documents, comment threads with replies, menus with submenus, the syntax tree of a formula. A fixed type — "an object with an object inside with an object inside" — would stop at some depth. A **recursive type** says it once, for every depth.

📌 **Interview term: recursive type** — a type whose definition refers to itself, directly or through another type, so it describes structures of any depth.

## 2. Recursive Data Types

### JSON

~~~ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
~~~

"A JSON value is a primitive, or a list of JSON values, or an object whose values are JSON values." Example 1 accepts a nested document and rejects a \`Date\`:

~~~text
error TS2322: Type '{ when: Date; }' is not assignable to type 'Json'.
  Types of property 'when' are incompatible.
    Type 'Date' is not assignable to type 'Json | undefined'.
      Type 'Date' is not assignable to type '{ [key: string]: Json; }'.
        Index signature for type 'string' is missing in type 'Date'.
~~~

(At run time \`JSON.stringify\` silently turns that \`Date\` into a string — exactly the kind of quiet change the type warns about.) Validating JSON that arrives from outside is a different job: [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)

### Trees and lists

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="A TreeNode holds a value and children, and each child is again a TreeNode">
  <defs>
    <marker id="q4arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="350" y="52" text-anchor="middle">TreeNode root</text>
  <text class="d-sub" x="350" y="74" text-anchor="middle">children: TreeNode[]</text>
  <rect class="d-box" x="60" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="160" y="202" text-anchor="middle">TreeNode a</text>
  <text class="d-sub" x="160" y="224" text-anchor="middle">children: one node</text>
  <rect class="d-box" x="440" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="540" y="202" text-anchor="middle">TreeNode b</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">children: none</text>
  <path class="d-edge" d="M 300 94 L 180 164" marker-end="url(#q4arrow)"/>
  <path class="d-edge" d="M 400 94 L 520 164" marker-end="url(#q4arrow)"/>
</svg>

Every box has the same type; only the data decides how deep it goes. An empty \`children\` array is where it stops.

~~~ts
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

type List<T> = { head: T; tail: List<T> } | null;
~~~

The list shows the other way to stop: a union with a terminating case (\`null\`).

📌 **Interview term: base case (of a data type)** — the part of a recursive type that does not refer to itself, such as \`null\` in \`List<T>\` or an empty \`children\` array, where the nesting ends.

### Mutual recursion

Two types may refer to each other:

~~~ts
type Expr = { kind: "num"; value: number } | { kind: "add"; args: Expr[] } | Neg;
type Neg = { kind: "neg"; arg: Expr };
~~~

Because \`Expr\` is a **discriminated union**, a \`switch (e.kind)\` in \`evaluate\` handles every case and tsc knows the function always returns a number. See [What is a discriminated union?](/interview-question/what-is-a-discriminated-union)

📌 **Interview term: mutually recursive types** — two or more types that refer to each other, like \`Expr\` and \`Neg\`.

### What is not allowed

The reference must go **through a structure** — a property, an array, a tuple, a generic like \`Promise<...>\`. A bare self-reference has no meaning: "a Loop is a Loop or a string" never says what a Loop is.

~~~ts
type Loop = Loop | string;
~~~

~~~text
error TS2456: Type alias 'Loop' circularly references itself.
~~~

Older versions were stricter: before TypeScript 3.7, a type alias could not refer to itself even through an array or tuple (such as \`Json[]\`), and people paired aliases with interfaces as a workaround ([InfoQ on TypeScript 3.7](https://www.infoq.com/news/2019/11/typescript-3-7-release/)). The \`Json\` type above is the shape that 3.7 made possible. Interfaces could always refer to themselves in properties.

📌 **Interview term: circular reference (TS2456)** — a type alias that refers to itself with no structure in between, which the compiler rejects.

## 3. Recursive Functions for Recursive Types

The natural way to process a recursive type is a recursive function: one case per branch of the type. Example 1:

~~~ts
function depth(j: Json): number {
  if (Array.isArray(j)) return 1 + Math.max(0, ...j.map(depth));
  if (j !== null && typeof j === "object") return 1 + Math.max(0, ...Object.values(j).map(depth));
  return 0;
}
function sum(l: List<number>): number {
  return l === null ? 0 : l.head + sum(l.tail);
}
~~~

Narrowing does the work: after \`Array.isArray(j)\`, \`j\` is \`Json[]\`; after the \`null\` and \`object\` checks, it is the object case. The base case of the type (a primitive, \`null\`) is the base case of the function.

## 4. Recursive Type-Level Computation

Types can also **compute** by recursion. A conditional type may refer to itself in a branch — allowed since TypeScript 4.1 ([TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html)). Example 2 has three classic ones.

**Innermost element of nested arrays:**

~~~ts
type DeepElement<T> = T extends readonly (infer E)[] ? DeepElement<E> : T;
// DeepElement<number[][][]> is number
~~~

**Every dotted path of an object** (recursion inside a mapped type):

~~~ts
type Paths<T> = T extends object
  ? { [K in keyof T & string]: K | \`\${K}.\${Paths<T[K]>}\` }[keyof T & string]
  : never;
type Settings = { theme: { color: string; font: { size: number } }; lang: string };
// Paths<Settings> is "theme" | "lang" | "theme.color" | "theme.font" | "theme.font.size"
~~~

For a leaf like \`string\`, \`Paths<string>\` is \`never\`, and a template with a \`never\` hole is \`never\`, so only the plain key \`K\` survives. That is the base case.

**Arithmetic with tuple lengths:**

~~~ts
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
type Add<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]["length"];
// Add<20, 22> is 42
~~~

A tuple type knows its length as a literal, so building tuples of the right size and joining them adds numbers. It is a party trick more than a tool, but it is a common interview exercise. The \`infer\` machinery behind these is on [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do); applied unwrapping utilities are on [How do you use infer to build deep Awaited, ReturnType and Unwrap utilities?](/interview-question/how-do-you-use-infer-to-build-deep-awaited-returntype-and-unwrap-utilities)

📌 **Interview term: recursive conditional type** — a conditional type that refers to itself in a branch, used to compute a type step by step.

## 5. Depth Limits and Tail Recursion

The compiler protects itself (and your editor) from runaway types. Past a certain depth it stops with:

~~~text
error TS2589: Type instantiation is excessively deep and possibly infinite.
~~~

How deep you can go depends on the **shape** of the recursion. Compare two ways to reverse a string type:

~~~ts
// NOT tail recursive: the recursive call is wrapped in a template.
type Reverse<S extends string> = S extends \`\${infer H}\${infer R}\` ? \`\${Reverse<R>}\${H}\` : "";

// Tail recursive: the branch is ONLY the call; the work is carried in an accumulator.
type ReverseAcc<S extends string, Acc extends string = ""> =
  S extends \`\${infer H}\${infer R}\` ? ReverseAcc<R, \`\${H}\${Acc}\`> : Acc;
~~~

TypeScript 4.5 evaluates a conditional type whose branch is just another conditional type in a loop, without stacking up intermediate instantiations ([TypeScript 4.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html)). The 4.5 notes use this same accumulator idea as the fix for a non-tail type. What that means in numbers, measured with tsc 5.4.5:

| Type | Input length that works | First failing length |
| :--- | :--- | :--- |
| \`Reverse\` (not tail), evaluated alone | 48 characters | 49 |
| \`Reverse\`, after \`Reverse<"abc">\` was evaluated first | 49 | 60 |
| \`ReverseAcc\` (tail recursive), evaluated alone | 999 characters | 1000 |

The second row is a real finding worth knowing: the non-tail limit is not a fixed number, because results the compiler already computed are reused. Example 2 therefore tests 40 characters (fine) and 60 (TS2589 under \`// @ts-expect-error\`) for \`Reverse\`, and 60 for \`ReverseAcc\` (fine). Do not design a type that only works if it stays just under the limit.

📌 **Interview term: tail-recursive conditional type** — a conditional type whose branch is only the recursive call, which TypeScript 4.5+ evaluates in a loop, allowing about a thousand levels.

📌 **Interview term: accumulator** — an extra type parameter that carries the partial result, so the recursive call can be the whole branch.

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a compile-time check, and every \`// @ts-expect-error\` line is a real error, quoted above from a run with the directives removed (TS2322 for the \`Date\`, TS2456 for \`Loop\`, TS2589 for the 60-character \`Reverse\`). Then each example was run as the page runs it.

Example 1, recursive data types:

~~~text
2
root a a1 b
6
{"when":"1970-01-01T00:00:00.000Z"}
-3
~~~

\`2\` is the depth of the sample document, \`root a a1 b\` the tree flattened depth-first, \`6\` the list \`1 + 2 + 3\`, and \`-3\` is \`2 + -5\` from the expression tree.

Example 2, recursive type-level computation:

~~~text
theme theme.color theme.font theme.font.size lang
7
40 60
~~~

The first line is the run-time \`paths\` function; its output is typed \`Paths<Settings>[]\`, and the five strings are exactly the five members tsc computed. \`40 60\` are the lengths of the reversed strings stored in variables typed \`Reverse<...>\` and \`ReverseAcc<...>\`.

## Common Pitfalls

- **A bare self-reference.** \`type Loop = Loop | string\` is TS2456; recursion has to go through an object, array, tuple or generic.
- **No reachable base case.** A recursive type with no terminating branch cannot be built as data, and a recursive conditional type without one hits TS2589.
- **Non-tail recursion on long inputs.** Wrapping the recursive call in a template or union limits you to a few dozen levels; move the work into an accumulator.
- **Relying on a measured limit.** The non-tail cutoff moved between 49 and 60 characters depending on what was evaluated before; leave a wide margin.
- **Computing huge types in hot paths.** Every use of a heavy recursive type costs compile time in every file that touches it; keep type-level computation for library boundaries.
- **Expecting a recursive type to validate data.** \`Json\` checks values you write; data from \`JSON.parse\` is \`any\` and must be checked at run time.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A recursive type refers to itself, so it can describe nesting of any depth: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Json = string | number | boolean | null | Json[] | { [key: string]: Json }</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Data structures:</strong> <span style="color:#f0e2c8;">Trees, linked lists, comment threads and ASTs; two types can even refer to each other. A discriminated union plus a recursive function handles every case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rule:</strong> <span style="color:#f0e2c8;">The reference must go <strong style="color:#ffca28;">through a structure</strong>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Loop = Loop | string</code> is TS2456. Since 3.7 aliases can recurse through arrays and tuples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Type-level recursion:</strong> <span style="color:#f0e2c8;">Conditional types that call themselves (4.1+) compute types: the deep element of nested arrays, all dotted paths of an object, tuple-length arithmetic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Too deep gives TS2589. A <strong style="color:#ffca28;">tail-recursive</strong> type, whose branch is only the call with an accumulator, goes about 1000 levels in 5.4.5 versus a few dozen.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type Loop = Loop | string</code> an error but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type Json = ... | Json[]</code> fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Json[]</code> puts the reference inside a structure, so the compiler can define it lazily. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Loop</code> would have to be resolved to know what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Loop</code> is — TS2456, circularly references itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is TS2589 and how do you fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">"Type instantiation is excessively deep and possibly infinite." Make sure there is a reachable base case, and rewrite the type so the recursive call is the whole branch, carrying the partial result in an accumulator parameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get every dotted path of a nested object as a type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mapped type over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T &amp; string</code> that maps each key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> or a template literal of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code>, a dot and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Paths&lt;T[K]&gt;</code>, then indexes itself by its keys to get the union. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> for non-objects is the base case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Interface or type alias for a recursive type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. Interfaces could always refer to themselves through properties; type aliases can since 3.7 through arrays and tuples, and they are needed for unions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Json</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;T&gt; | null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add two numbers at the type level?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build tuples of each length with a recursive accumulator, spread both into one tuple and read its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Add&lt;20, 22&gt;</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">42</code>. It shows tuple length literals, not production code.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive type | A type whose definition refers to itself |
| Base case (of a data type) | The part that does not refer to itself, where nesting ends |
| Mutually recursive types | Types that refer to each other |
| Circular reference (TS2456) | A type alias that refers to itself with no structure in between |
| Recursive conditional type | A conditional type that refers to itself in a branch |
| Tail-recursive conditional type | One whose branch is only the recursive call, evaluated in a loop |
| Accumulator | An extra type parameter carrying the partial result |

**Conclusion:** Recursive types are how TypeScript describes data with no fixed depth — JSON, trees, lists, syntax trees — as long as the self-reference goes through a structure and there is a base case. The same idea at the type level gives recursive conditional types that compute paths, deep elements and more. The practical skill is knowing the limits: TS2589 arrives after a few dozen levels for wrapped recursion, while a tail-recursive accumulator version goes about a thousand, so write the tail-recursive form whenever input length is not tiny. Applying recursion to make every property optional is the next question: [How would you build a DeepPartial type?](/interview-question/how-would-you-build-a-deeppartial-type)`,
    examples: [
      {
        label: `Recursive data types: Json, trees, lists and mutual recursion`,
        code: `// Recursive data types: a type that mentions itself to describe nesting.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. JSON: a value is a primitive, an array of values, or an object of values.
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const doc: Json = { name: "Ada", langs: ["en", "fr"], meta: { born: 1815, alive: false, spouse: null } };
// @ts-expect-error a Date is not JSON
const notJson: Json = { when: new Date(0) };

// 2. A tree: each node holds children of the same type.
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}
const tree: TreeNode<string> = {
  value: "root",
  children: [
    { value: "a", children: [{ value: "a1", children: [] }] },
    { value: "b", children: [] },
  ],
};

// 3. A linked list, as a type alias (no interface needed).
type List<T> = { head: T; tail: List<T> } | null;
const list: List<number> = { head: 1, tail: { head: 2, tail: { head: 3, tail: null } } };

// 4. Recursion must go through a structure. A bare self-reference has no meaning.
// @ts-expect-error circularly references itself
type Loop = Loop | string;

// 5. Recursive functions walk recursive types; the type proves every case is handled.
function depth(j: Json): number {
  if (Array.isArray(j)) return 1 + Math.max(0, ...j.map(depth));
  if (j !== null && typeof j === "object") return 1 + Math.max(0, ...Object.values(j).map(depth));
  return 0;
}
function flattenTree<T>(n: TreeNode<T>): T[] {
  return [n.value, ...n.children.flatMap((c) => flattenTree(c))];
}
function sum(l: List<number>): number {
  return l === null ? 0 : l.head + sum(l.tail);
}

console.log(depth(doc));
console.log(flattenTree(tree).join(" "));
console.log(sum(list));
console.log(JSON.stringify(notJson));

// 6. Mutual recursion between two types also works.
type Expr = { kind: "num"; value: number } | { kind: "add"; args: Expr[] } | Neg;
type Neg = { kind: "neg"; arg: Expr };
function evaluate(e: Expr): number {
  switch (e.kind) {
    case "num":
      return e.value;
    case "add":
      return e.args.reduce((s, a) => s + evaluate(a), 0);
    case "neg":
      return -evaluate(e.arg);
  }
}
const e: Expr = { kind: "add", args: [{ kind: "num", value: 2 }, { kind: "neg", arg: { kind: "num", value: 5 } }] };
console.log(evaluate(e));
const _1: Equal<Extract<Expr, { kind: "neg" }>["arg"], Expr> = true;`,
      },
      {
        label: `Recursive type-level computation and depth limits`,
        code: `// Recursive type-level computation: conditional types that call themselves.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Flatten a nested array type to its innermost element.
type DeepElement<T> = T extends readonly (infer E)[] ? DeepElement<E> : T;
const _1: Equal<DeepElement<number[][][]>, number> = true;

// 2. Every dotted path of an object (recursion inside a mapped type).
type Paths<T> = T extends object
  ? { [K in keyof T & string]: K | \`\${K}.\${Paths<T[K]>}\` }[keyof T & string]
  : never;
type Settings = { theme: { color: string; font: { size: number } }; lang: string };
const _2: Equal<Paths<Settings>, "theme" | "lang" | "theme.color" | "theme.font" | "theme.font.size"> = true;

// 3. Counting with a tuple: the classic "number arithmetic" trick.
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
type Add<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]["length"];
const _3: Equal<Add<20, 22>, 42> = true;

// 4. Depth limits. This Reverse is NOT tail recursive: the recursive call is
// wrapped in a template, so each level stays open.
type Reverse<S extends string> = S extends \`\${infer H}\${infer R}\` ? \`\${Reverse<R>}\${H}\` : "";
const _4: Equal<Reverse<"abc">, "cba"> = true;
type R40 = Reverse<"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb">;
// @ts-expect-error 60 levels is too deep for a non-tail recursive type
type R60 = Reverse<"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">;

// The accumulator version IS tail recursive (the branch is only the call), so it goes much further.
type ReverseAcc<S extends string, Acc extends string = ""> =
  S extends \`\${infer H}\${infer R}\` ? ReverseAcc<R, \`\${H}\${Acc}\`> : Acc;
type RA60 = ReverseAcc<"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">;
const _5: Equal<ReverseAcc<"abc">, "cba"> = true;

// Run time: the same algorithms on values.
function paths(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => {
    const p = prefix + k;
    return v !== null && typeof v === "object" ? [p, ...paths(v, p + ".")] : [p];
  });
}
const settings: Settings = { theme: { color: "teal", font: { size: 14 } }, lang: "en" };
const all = paths(settings) as Paths<Settings>[];
console.log(all.join(" "));

function deepFirst(x: unknown): unknown {
  return Array.isArray(x) ? deepFirst(x[0]) : x;
}
const grid: number[][][] = [[[7, 8]], [[9]]];
console.log(deepFirst(grid) as DeepElement<typeof grid>);
const r: R40 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ra: RA60 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
console.log(r.length, ra.length);`,
      },
    ],
  },
  {
    title: `How would you build a DeepPartial type?`,
    difficulty: "hard",
    seoDescription: `Build a DeepPartial type that makes nested properties optional: why the one-liner breaks on null, Date and functions, a robust version and a typed merge.`,
    description: `**Question presented to candidate:**
"\`Partial<T>\` only makes the top level optional. How would you build a \`DeepPartial<T>\` that makes every nested property optional — and what would you watch out for?"

**What a strong answer should cover:**
- The basic idea: a mapped type with \`?\` that recurses into object-typed properties
- Why the one-liner \`T[K] extends object ? DeepPartial<T[K]> : T[K]\` breaks: \`X | null\` is not distributed so it is not recursed into, and \`Date\`s and functions turn into bags of optional members (\`{}\` is accepted, functions stop being callable)
- A robust version: leaf types (primitives, \`Date\`, \`RegExp\`, functions) pass through, a naked \`T\` distributes over unions, arrays and tuples keep their shape, \`Map\` and \`Set\` handled explicitly
- Typical use: config overrides and test fixtures, merged into defaults by a deep-merge function whose behaviour matches the type (arrays replace, \`undefined\` keeps the default)
- Caveats: explicit \`undefined\` is allowed under plain \`strict\` (\`exactOptionalPropertyTypes\` changes that), and inside generic code \`DeepPartial<T>\` stays unresolved

**Clarifying questions expected:**
- Should arrays become partial element by element, or be replaced as a whole?
- Which types are leaves for this codebase (dates, class instances, branded types)?

**Code / implementation expected:** Yes — write \`DeepPartial<T>\`, show where the naive version fails, and use it in a typed merge.`,
    answer: `**Target Audience:** Developers who know \`Partial\`, mapped types and conditional types, and need optional-at-every-level types for config, patches or test data.
**Difficulty:** Hard
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A new app ships with factory settings: server on \`localhost:8080\`, TLS off, three retries, the \`log\` plugin. In production you only want to change two things — the port and TLS. Writing out the whole settings object again is tedious and error-prone. What you want to say is "everything as default, **except** \`server.port\` is 443 and \`server.tls.enabled\` is true".

The type of that "except" object is the question. Every property, at every level, should be optional — but whatever you **do** write must still be the right type, with no typos in key names. That is \`DeepPartial<T>\`.

📌 **Interview term: DeepPartial** — a user-written utility type (not built in) that makes every property optional at every nesting level, keeping the types of the values.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should arrays be partial per element, or replaced as a whole? | Decides the array branch, and must match how the merge treats arrays |
| Which types are leaves: \`Date\`, class instances, branded IDs? | A leaf must be given whole; recursing into it makes \`{}\` acceptable |
| Do \`Map\` and \`Set\` appear in the data? | They need their own branch, or they become bags of optional methods |
| Is \`exactOptionalPropertyTypes\` on? | Decides whether \`{ port: undefined }\` is accepted |

## 3. Start From \`Partial\`

\`Partial<T>\` is a mapped type that adds \`?\` to each property — one level only:

~~~ts
type Partial<T> = { [P in keyof T]?: T[P] };
~~~

(Covered on [What are utility types like Partial, Pick, and Omit?](/interview-question/what-are-utility-types-like-partial-pick-and-omit); mapped types themselves on [What are mapped types?](/interview-question/what-are-mapped-types)) The obvious deep version recurses when a property is an object:

~~~ts
type NaiveDeepPartial<T> = { [K in keyof T]?: T[K] extends object ? NaiveDeepPartial<T[K]> : T[K] };
~~~

It works for plain nested objects: \`{ server: { port: 8080 } }\` is accepted for the \`Settings\` type in example 1. Interviewers ask this question **because** the one-liner has three bugs.

📌 **Interview term: mapped type** — \`{ [K in keyof T]: ... }\`, a type built by transforming each property of another type; \`?\` and \`readonly\` modifiers can be added or removed.

## 4. Where the One-Liner Breaks

Example 1 uses this type:

~~~ts
type Settings = {
  server: { host: string; port: number };
  owner: { name: string; email: string } | null;
  createdAt: Date;
  onError: (e: Error) => void;
  tags: string[];
};
~~~

**Bug A — nullable objects are not recursed into.** \`T[K] extends object\` checks \`T[K]\`, which is not a naked type parameter, so it does **not** distribute. \`{ name; email } | null\` as a whole is not an \`object\` (because of \`null\`), so the false branch keeps it unchanged and \`email\` is still required:

~~~text
error TS2741: Property 'email' is missing in type '{ name: string; }' but required in type '{ name: string; email: string; }'.
~~~

**Bug B — leaves are treated as objects.** A \`Date\` and a function are objects, so the type recurses into them, turning every method into an optional property. \`{ createdAt: {}, onError: {} }\` is accepted — nonsense data that type-checks.

**Bug C — functions stop being callable.** The recursed function type keeps no call signature:

~~~text
error TS2349: This expression is not callable.
  Type 'NaiveDeepPartial<(e: Error) => void>' has no call signatures.
~~~

📌 **Interview term: naked type parameter** — a type parameter checked on its own (\`T extends ...\`), not wrapped or indexed. Only a naked one makes a conditional type distribute over a union; \`T[K] extends ...\` does not. Background: [Why are conditional types distributive and how do you control it with infer?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer)

## 5. A Version That Holds Up

Move the decision **out** of the mapped type into a conditional type on a naked \`T\`, and list the leaves explicitly:

~~~ts
type Leaf = string | number | boolean | bigint | symbol | null | undefined | Date | RegExp | ((...args: any[]) => unknown);

type DeepPartial<T> =
  T extends Leaf ? T :
  T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>> :
  T extends Set<infer U> ? Set<DeepPartial<U>> :
  T extends readonly unknown[] ? { [I in keyof T]: DeepPartial<T[I]> } :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="DeepPartial checks leaf, then Map or Set, then array, then object, and recurses on the inner types">
  <defs>
    <marker id="q5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="130" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="160" text-anchor="middle">DeepPartial</text>
  <text class="d-sub" x="95" y="182" text-anchor="middle">naked T</text>
  <rect class="d-box" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">leaf: keep T</text>
  <rect class="d-box" x="250" y="100" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="136" text-anchor="middle">Map or Set</text>
  <rect class="d-box" x="250" y="180" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="216" text-anchor="middle">array or tuple</text>
  <rect class="d-box" x="250" y="260" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="296" text-anchor="middle">plain object</text>
  <rect class="d-box-accent" x="530" y="100" width="210" height="60" rx="10"/>
  <text class="d-text" x="635" y="136" text-anchor="middle">recurse on values</text>
  <rect class="d-box-accent" x="530" y="180" width="210" height="60" rx="10"/>
  <text class="d-text" x="635" y="216" text-anchor="middle">same shape, recurse</text>
  <rect class="d-box-accent" x="530" y="260" width="210" height="60" rx="10"/>
  <text class="d-text" x="635" y="296" text-anchor="middle">add ?, recurse</text>
  <path class="d-edge" d="M 174 150 L 244 55" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 174 160 L 244 130" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 174 175 L 244 205" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 174 190 L 244 285" marker-end="url(#q5arrow)"/>
  <path class="d-edge-accent" d="M 454 130 L 524 130" marker-end="url(#q5arrow)"/>
  <path class="d-edge-accent" d="M 454 210 L 524 210" marker-end="url(#q5arrow)"/>
  <path class="d-edge-accent" d="M 454 290 L 524 290" marker-end="url(#q5arrow)"/>
</svg>

The checks run top to bottom and the first match wins. Each fixes one bug:

- **Naked \`T\`** — \`DeepPartial<{ name; email } | null>\` distributes: the object member is made partial, \`null\` stays. \`owner: { name: "Ada" }\` is accepted now.
- **\`Leaf\` first** — a \`Date\` must be a whole \`Date\`; \`{ createdAt: {} }\` is an error again (\`error TS2740: Type '{}' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 37 more.\`). Functions are leaves, so \`q4.onError?.(...)\` is callable and prints \`handled boom\`.
- **Arrays** — a homomorphic mapped type over an array or tuple keeps the array or tuple shape and recurses into elements, without adding \`?\` to positions. \`{ b: number }[]\` becomes \`{ b?: number }[]\`, and \`readonly [number, { x: string }]\` becomes \`readonly [number, { x?: string }]\`.
- **\`Map\` / \`Set\`** — \`infer\` captures the key and value types; \`Map<string, { n: number }>\` becomes \`Map<string, { n?: number }>\` instead of a bag of optional methods.

Example 1 checks each of these with \`Equal\`. Recursion in types in general is covered on [What are recursive types?](/interview-question/what-are-recursive-types)

📌 **Interview term: leaf type** — a type that is replaced as a whole, never recursed into: primitives, \`Date\`, \`RegExp\`, functions, and whatever your codebase treats as atomic.

📌 **Interview term: homomorphic mapped type** — a mapped type over \`keyof T\` for a type parameter \`T\`; applied to an array or tuple it produces an array or tuple, keeping \`readonly\`.

## 6. Using It: Typed Config Overrides

The type is half of the job. The merge function that consumes it must behave the way the type promises. Example 2:

~~~ts
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;          // undefined means "keep the default"
    out[k] = deepMerge(base[k], v as DeepPartial<unknown>);
  }
  return out as T;
}

const prod = deepMerge(defaults, { server: { port: 443, tls: { enabled: true } }, plugins: ["metrics"] });
~~~

Design decisions, each matched in the type:

- **Plain objects merge key by key** — the type made their keys optional.
- **Arrays replace** — the type keeps arrays as arrays (not "partial arrays"), so the patch gives a whole new list: \`plugins\` becomes \`["metrics"]\`, not a mix.
- **Leaves replace** — a \`Date\` or function in the patch replaces the default.

The type still catches mistakes deep inside the patch:

~~~text
error TS2353: Object literal may only specify known properties, and 'prot' does not exist in type '{ host?: string | undefined; port?: number | undefined; tls?: { enabled?: boolean | undefined; cert?: string | undefined; } | undefined; }'.
error TS2322: Type 'string' is not assignable to type 'boolean | undefined'.
~~~

### Explicit \`undefined\`

Look at that message: \`port?: number | undefined\`. Under plain \`--strict\`, an optional property also accepts an explicit \`undefined\`, so \`{ retries: undefined }\` type-checks. The merge must therefore skip \`undefined\`, or it would wipe out the default — example 2 checks that \`retries\` stays \`3\`. The \`exactOptionalPropertyTypes\` flag makes \`?\` mean "may be missing" only; see [How do noUncheckedIndexedAccess, exactOptionalPropertyTypes and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

### Generic code

Inside a function generic over \`T\`, the compiler cannot evaluate \`DeepPartial<T>\` yet, so it cannot tell that \`{}\` fits:

~~~text
error TS2322: Type '{}' is not assignable to type 'DeepPartial<T>'.
~~~

That is a deferred conditional type. Keep \`DeepPartial\` at the API boundary (a parameter type callers fill in), as \`withDefaults\` does, and cast inside the implementation where necessary.

📌 **Interview term: deferred conditional type** — a conditional type that depends on a type parameter not yet known, so the compiler keeps it unevaluated and accepts only values it can prove fit.

## 7. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a compile-time check, and every \`// @ts-expect-error\` line is a real error, quoted above from a run with the directives removed. Then each example was run as the page runs it.

Example 1, the naive and the robust version:

~~~text
handled boom
[{"server":{"port":8080}},{"owner":{"name":"Ada"}},{"createdAt":{},"onError":{}},{"owner":{"name":"Ada"}}]
true function
~~~

The third object in line 2 is the nonsense the naive type accepted: an empty \`createdAt\` and an \`onError\` that is not a function. Its \`p2\` neighbour exists at run time only because the error was suppressed.

Example 2, the typed merge:

~~~text
{"server":{"host":"localhost","port":443,"tls":{"enabled":true,"cert":""}},"retries":3,"plugins":["metrics"]}
3 localhost
5 log
~~~

## Common Pitfalls

- **Testing \`T[K] extends object\` inside the mapped type.** It does not distribute, so \`X | null\` properties are not made deep; decide on a naked \`T\` instead.
- **Recursing into \`Date\`, functions and class instances.** They become bags of optional members and accept \`{}\`; list them as leaves.
- **Mismatched merge semantics.** If the type keeps arrays whole, the merge must replace arrays; if it makes elements partial, the merge must merge by index. Pick one and keep both in sync.
- **Letting \`undefined\` overwrite defaults.** Under plain \`strict\`, \`{ port: undefined }\` is a valid \`DeepPartial\`; skip \`undefined\` in the merge or enable \`exactOptionalPropertyTypes\`.
- **Using \`DeepPartial\` as the type of finished data.** Every read then needs \`?.\` and a fallback; merge first, and pass the full \`T\` around.
- **Expecting it in the standard library.** There is no built-in \`DeepPartial\`; it is a user-written type, or comes from a utility library.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial</code> is one level. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeepPartial</code> is a mapped type with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> that <strong style="color:#ffca28;">recurses</strong> into nested objects, so config overrides and test fixtures can give any subset at any depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The naive bug:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K] extends object ? DeepPartial&lt;T[K]&gt; : T[K]</code> does not distribute, so an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X | null</code> property is not made deep; and it recurses into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code>s and functions, which then accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> and stop being callable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Robust version:</strong> <span style="color:#f0e2c8;">Decide on a naked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>: leaves (primitives, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RegExp</code>, functions) pass through, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> recurse on their values with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code>, arrays and tuples keep their shape, plain objects get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> and recurse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Use with a merge:</strong> <span style="color:#f0e2c8;">Pair it with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepMerge(defaults, patch)</code> whose rules match the type: objects merge per key, arrays and leaves replace, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> keeps the default.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">Under plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>, explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> is allowed unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exactOptionalPropertyTypes</code> is on; and inside generic code <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeepPartial&lt;T&gt;</code> is deferred, so even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> needs a cast.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">owner: { name: "Ada" }</code> fail with the naive version when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">owner</code> is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">X | null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K] extends object</code> is not over a naked type parameter, so it does not distribute; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X | null</code> as a whole is not an object, so the type is kept as-is and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email</code> stays required.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How should arrays be handled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a design choice. Keeping arrays whole and replacing them in the merge is simplest and predictable; a homomorphic mapped type keeps the array or tuple shape while making element objects partial.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ createdAt: {} }</code> accepted by the naive version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> is an object, so the type recursed into it and made every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> method optional. Listing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> as a leaf requires a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> and gives error TS2740 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you assign <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{}</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DeepPartial&lt;T&gt;</code> inside a generic function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the conditional type is <strong style="color:#ffca28;">deferred</strong> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is known, so tsc reports TS2322. Use it as a parameter type at the API boundary and cast inside the implementation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DeepReadonly</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DeepRequired</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same skeleton with different modifiers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlyMap</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlyArray</code>), or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-?</code> to remove optionality. The leaf list and the naked-<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> rule stay the same.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| DeepPartial | A user-written type making every property optional at every level |
| Mapped type | A type built by transforming each property of another type |
| Naked type parameter | A type parameter checked on its own; only these distribute over unions |
| Leaf type | A type replaced as a whole, never recursed into |
| Homomorphic mapped type | A mapped type over \`keyof T\` that keeps array, tuple and modifier shape |
| Deferred conditional type | A conditional type left unevaluated until its type parameter is known |

**Conclusion:** A \`DeepPartial\` is a mapped type plus recursion, but the one-liner hides three bugs: it does not distribute over \`X | null\`, it recurses into \`Date\`s and functions, and it breaks callability. Deciding on a naked \`T\`, listing leaves first and giving arrays, \`Map\` and \`Set\` their own branches fixes all three. Pair it with a merge function whose semantics match the type, remember that plain \`strict\` lets \`undefined\` through, and keep it at API boundaries — that is the full answer an interviewer is looking for. Immutability's equivalent, \`DeepReadonly\`, is discussed on [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript)`,
    examples: [
      {
        label: `The naive DeepPartial, its three bugs and a robust version`,
        code: `// DeepPartial: the one-liner, where it breaks, and a version that holds up.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Settings = {
  server: { host: string; port: number };
  owner: { name: string; email: string } | null;
  createdAt: Date;
  onError: (e: Error) => void;
  tags: string[];
};

// 1. The one-liner: optional at every level, recurse into objects.
type NaiveDeepPartial<T> = { [K in keyof T]?: T[K] extends object ? NaiveDeepPartial<T[K]> : T[K] };
const p1: NaiveDeepPartial<Settings> = { server: { port: 8080 } };

// Bug A: "X | null" is tested as a whole, and null is not an object, so no recursion.
// @ts-expect-error email is still required inside owner
const p2: NaiveDeepPartial<Settings> = { owner: { name: "Ada" } };
// Bug B: a Date and a function become bags of optional members, so {} is accepted.
const p3: NaiveDeepPartial<Settings> = { createdAt: {}, onError: {} };
// Bug C: the recursed function type has no call signature any more.
declare const naive: NaiveDeepPartial<Settings>;
// @ts-expect-error onError is not callable
const call = () => naive.onError?.(new Error("x"));

// 2. A version that holds up: leaves stay as they are, T is a naked type
// parameter so unions distribute, and arrays keep their array shape.
type Leaf = string | number | boolean | bigint | symbol | null | undefined | Date | RegExp | ((...args: any[]) => unknown);
type DeepPartial<T> =
  T extends Leaf ? T :
  T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>> :
  T extends Set<infer U> ? Set<DeepPartial<U>> :
  T extends readonly unknown[] ? { [I in keyof T]: DeepPartial<T[I]> } :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

const q2: DeepPartial<Settings> = { owner: { name: "Ada" } };
// @ts-expect-error a Date must be a whole Date now
const q3: DeepPartial<Settings> = { createdAt: {} };
const q4: DeepPartial<Settings> = { createdAt: new Date(0), onError: (e) => console.log("handled", e.message) };
q4.onError?.(new Error("boom"));

// 3. What it resolves to, checked by tsc.
const _1: Equal<DeepPartial<Settings>["owner"], { name?: string; email?: string } | null | undefined> = true;
const _2: Equal<DeepPartial<{ a: { b: number }[] }>["a"], { b?: number }[] | undefined> = true;
const _3: Equal<DeepPartial<readonly [number, { x: string }]>, readonly [number, { x?: string }]> = true;
const _4: Equal<DeepPartial<Map<string, { n: number }>>, Map<string, { n?: number }>> = true;
const _5: Equal<DeepPartial<string>, string> = true;

console.log(JSON.stringify([p1, p2, p3, q2]));
console.log(q4.createdAt instanceof Date, typeof call);`,
      },
      {
        label: `Typed config overrides with a matching deepMerge`,
        code: `// Using DeepPartial for config overrides, with a deep merge that matches it.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Leaf = string | number | boolean | bigint | symbol | null | undefined | Date | RegExp | ((...args: any[]) => unknown);
type DeepPartial<T> =
  T extends Leaf ? T :
  T extends readonly unknown[] ? { [I in keyof T]: DeepPartial<T[I]> } :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

type Config = {
  server: { host: string; port: number; tls: { enabled: boolean; cert: string } };
  retries: number;
  plugins: string[];
};
const defaults: Config = {
  server: { host: "localhost", port: 8080, tls: { enabled: false, cert: "" } },
  retries: 3,
  plugins: ["log"],
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}
// Objects merge key by key; arrays and leaves REPLACE; undefined means "keep the default".
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = deepMerge(base[k], v as DeepPartial<unknown>);
  }
  return out as T;
}

const prod = deepMerge(defaults, { server: { port: 443, tls: { enabled: true } }, plugins: ["metrics"] });
console.log(JSON.stringify(prod));
const _1: Equal<typeof prod, Config> = true;

// @ts-expect-error a typo in a nested key is still caught
deepMerge(defaults, { server: { prot: 443 } });
// @ts-expect-error wrong type for a nested leaf
deepMerge(defaults, { server: { tls: { enabled: "yes" } } });

// Under plain --strict an explicit undefined is allowed by the type, so the merge must skip it.
const kept = deepMerge(defaults, { retries: undefined, server: { host: undefined } });
console.log(kept.retries, kept.server.host);

// Inside generic code DeepPartial<T> stays unresolved, so even {} needs help.
function withDefaults<T>(base: T) {
  // @ts-expect-error {} is not assignable to the unresolved DeepPartial<T>
  const empty: DeepPartial<T> = {};
  return (patch: DeepPartial<T>) => deepMerge(base, patch);
}
const forConfig = withDefaults(defaults);
console.log(forConfig({ retries: 5 }).retries, forConfig({}).plugins.join(","));`,
      },
    ],
  },
];

export default augments;
