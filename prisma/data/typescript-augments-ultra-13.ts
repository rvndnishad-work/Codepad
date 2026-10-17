/**
 * TYPESCRIPT ULTRA — batch 13: API design and modern inference (NoInfer, choosing
 * between NoInfer / satisfies / const type parameters, inferred type predicates,
 * the TypeScript 5.5+ lib additions, migrating JavaScript to TypeScript). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What does \`NoInfer<T>\` do and when should you block inference?`,
    difficulty: "hard",
    seoDescription: `NoInfer<T> in TypeScript 5.4: inference sites and candidates, check-only parameters, pre-5.4 workarounds, edge cases and when not to block inference.`,
    description: `**Question presented to candidate:**
"TypeScript 5.4 added a utility type called \`NoInfer\`. What problem does it solve, how does it change type inference, and can you show me a function signature where you would actually reach for it?"

**What a strong answer should cover:**
- Every occurrence of a type parameter in the parameter list is an inference site; candidates from all sites are combined, so a "secondary" argument (a default, a fallback, a transition target) can silently widen \`T\`
- \`NoInfer<T>\` (TypeScript 5.4) marks one position as "check only": \`T\` is inferred from the other sites first, then the argument in the \`NoInfer\` position is checked against it
- The classic example: \`light<C extends string>(colors: C[], defaultColor?: NoInfer<C>)\` rejects \`"blue"\` instead of adding it to \`C\`
- Before 5.4: an extra type parameter \`D extends C\`, or a deferred conditional trick; \`C & {}\` does not block inference
- Edge cases: \`NoInfer<X>\` on a concrete type is just \`X\`; if \`NoInfer\` is the only site, \`T\` falls back to \`unknown\` or its default; it is erased at run time
- When not to use it: when every argument should legitimately contribute, or when the plain signature already reports the mistake

**Code / implementation expected:** Yes — a generic function where one argument must conform to a type inferred from another, with and without \`NoInfer\`.`,
    answer: `**Target Audience:** Developers who write generic functions (helpers, hooks, library APIs) and want callers to get errors in the right place.
**Difficulty:** Hard
**TypeScript version:** \`NoInfer\` shipped in TypeScript 5.4 ([TypeScript 5.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/)). Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page is about the tool itself. Choosing between \`NoInfer\`, \`satisfies\` and \`const\` type parameters when you design an API is its own question: [How do you choose between \`NoInfer<T>\`, \`satisfies\`, and \`const\` type params?](/interview-question/how-do-you-choose-between-noinfer-t-satisfies-and-const-type-params-when-designi). If inference itself is new to you, start with [How does type inference work in TypeScript?](/interview-question/how-does-type-inference-work-in-typescript)

## 1. Why This Even Matters — A Story First

A restaurant lets you build your own pizza. You tick the toppings you want on the order form, and then a second box asks "which topping should be doubled?". You write "anchovies", which you never ticked.

A sensible kitchen says "anchovies are not on your pizza, please pick one of your toppings". A silly kitchen quietly **adds anchovies to your toppings** so that the second answer is valid.

Generic functions behave like the silly kitchen by default. When TypeScript works out a type parameter, it listens to *every* argument that mentions it, so the "which one should be doubled" answer can grow the list instead of being checked against it. \`NoInfer<T>\` tells TypeScript: "the first box decides; the second box is only checked".

## 2. The Core Idea: Inference Sites and Candidates

When you call a generic function without writing the type argument, TypeScript looks at each parameter whose type mentions \`T\`, matches the argument against it, and collects what it finds.

📌 **Interview term: inference site** — a position in a signature (a parameter type, or a part of one) where TypeScript looks for \`T\` while inferring it from a call.

📌 **Interview term: inference candidate** — a type collected for \`T\` at an inference site. After all sites are visited, the candidates are combined into the final \`T\` (for literal types under a \`string\` constraint, combined into a union).

Here is the example from the 5.4 announcement, a traffic light that lists its colors and an optional default:

~~~ts
function lightLoose<C extends string>(colors: C[], defaultColor?: C): C { ... }

const loose = lightLoose(["red", "yellow", "green"], "blue");
// C = "red" | "yellow" | "green" | "blue"  (no error!)
~~~

Both \`colors\` and \`defaultColor\` are inference sites. \`"blue"\` is a candidate like the other three, so \`C\` becomes a four-member union and the call is valid. The typo is accepted silently.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Without NoInfer both arguments feed candidates into C, so blue joins the union">
  <rect class="d-box" x="30" y="30" width="220" height="60" rx="10"/>
  <text class="d-text" x="140" y="57" text-anchor="middle">colors argument</text>
  <text class="d-sub" x="140" y="78" text-anchor="middle">red, yellow, green</text>
  <rect class="d-box" x="30" y="140" width="220" height="60" rx="10"/>
  <text class="d-text" x="140" y="167" text-anchor="middle">defaultColor argument</text>
  <text class="d-sub" x="140" y="188" text-anchor="middle">blue</text>
  <rect class="d-box-accent" x="430" y="85" width="260" height="60" rx="10"/>
  <text class="d-text" x="560" y="112" text-anchor="middle">C is inferred as</text>
  <text class="d-sub" x="560" y="133" text-anchor="middle">red or yellow or green or blue</text>
  <line class="d-edge" x1="250" y1="60" x2="428" y2="108"/>
  <line class="d-edge" x1="250" y1="170" x2="428" y2="122"/>
</svg>

Both arrows feed the same type parameter, so the default color can enlarge the set of colors.

Now wrap the second parameter in \`NoInfer\`:

~~~ts
function light<C extends string>(colors: C[], defaultColor?: NoInfer<C>): C { ... }

light(["red", "yellow", "green"], "red");    // ok, C = "red" | "yellow" | "green"
light(["red", "yellow", "green"], "blue");   // error
~~~

~~~text
error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="With NoInfer only colors feeds C, and defaultColor is checked against the result">
  <rect class="d-box" x="30" y="30" width="220" height="60" rx="10"/>
  <text class="d-text" x="140" y="57" text-anchor="middle">colors argument</text>
  <text class="d-sub" x="140" y="78" text-anchor="middle">inference site</text>
  <rect class="d-box-muted" x="30" y="140" width="220" height="60" rx="10"/>
  <text class="d-text" x="140" y="167" text-anchor="middle">defaultColor argument</text>
  <text class="d-sub" x="140" y="188" text-anchor="middle">NoInfer: check only</text>
  <rect class="d-box-accent" x="430" y="30" width="260" height="60" rx="10"/>
  <text class="d-text" x="560" y="57" text-anchor="middle">C is inferred as</text>
  <text class="d-sub" x="560" y="78" text-anchor="middle">red or yellow or green</text>
  <line class="d-edge-accent" x1="250" y1="60" x2="428" y2="60"/>
  <line class="d-edge-dashed" x1="560" y1="90" x2="252" y2="168"/>
</svg>

Inference now runs only on \`colors\`; the dashed line is the check that happens afterwards, in the other direction.

📌 **Interview term: \`NoInfer<T>\`** — a built-in utility type that marks a position as a non-inference site. In the lib it is declared as \`type NoInfer<T> = intrinsic;\` with the comment "Marker for non-inference type position": the compiler implements it, you cannot write it yourself.

## 3. Where You Actually Reach for It

The pattern is always the same: **one argument is the source of truth, another argument must conform to it.**

| API shape | Source of truth | Checked-only position |
| :--- | :--- | :--- |
| A select or radio group | \`options: readonly T[]\` | \`value: NoInfer<T>\` |
| A state machine | \`states: readonly S[]\` | \`transitions: Record<S, NoInfer<S>[]>\` |
| A light, a theme, a locale with a default | the list | \`defaultX?: NoInfer<T>\` |
| Event subscription | \`events: E[]\` | \`handler: (e: NoInfer<E>) => ...\` |
| A typed "fallback" | the main value or loader | \`fallback: NoInfer<T>\` |

The state machine is the most convincing in an interview, because the mistake is buried deep inside an object:

~~~ts
function machine<const S extends string>(
  states: readonly S[],
  transitions: Partial<Record<S, NoInfer<S>[]>>,
) { ... }

machine(["idle", "loading", "done"], { idle: ["error"] });
~~~

~~~text
error TS2322: Type '"error"' is not assignable to type '"idle" | "loading" | "done"'.
~~~

Without \`NoInfer\` this compiles: \`"error"\` becomes a fourth state. (The \`const\` modifier on \`S\` keeps the literals; see [\`const\` type parameters](/interview-question/what-are-const-type-parameters-const-t-and-why-are-they-better-than-as-const).)

## 4. How People Did This Before 5.4

Two workarounds were common, and they behave differently from one another:

~~~ts
// A second type parameter, constrained by the first: works, but the signature gets noisier.
function lightOld<C extends string, D extends C>(colors: C[], defaultColor?: D): C;

// A deferred conditional type: also works.
type OldNoInfer<T> = [T][T extends any ? 0 : never];

// An intersection with {}: does NOT block inference in 5.4.5.
function lightAmp<C extends string>(colors: C[], defaultColor?: C & {}): C;
~~~

The example checks all three. \`lightOld\` and \`OldNoInfer\` both report the same TS2345 for \`"blue"\`; \`lightAmp(["red", "yellow", "green"], "blue")\` compiles and returns \`"red" | "yellow" | "green" | "blue"\`. So if you see \`T & {}\` described as "the old NoInfer", test it before trusting it: in 5.4.5 it does not stop the candidate being collected.

📌 **Interview term: deferred conditional type** — a conditional type whose check depends on a type parameter, so TypeScript cannot resolve it yet; inference does not look inside it, which is why the old trick worked.

## 5. The Edge Cases

These are all checked in example 2.

- **Outside generics it disappears.** \`NoInfer<string>\` is exactly \`string\`, and \`NoInfer<{ a: 1 }>\` is exactly \`{ a: 1 }\`. It only matters while a type parameter is being inferred.
- **If it is the only site, nothing is inferred.** \`onlyBlocked<T>(x: NoInfer<T>): T\` called as \`onlyBlocked(5)\` gives \`T = unknown\`. With a default, \`T = string\` from \`<T = string>\`. An explicit type argument (\`onlyBlocked<number>(5)\`) always works.
- **Literal widening still applies.** With \`same<T>(a: T, b: NoInfer<T>): T\`, \`same("a", "b")\` is an error because \`T\` is the literal \`"a"\` (T is the whole return type, so the literal is kept). With \`pair<T>(a: T, b: NoInfer<T>): { a: T; b: T }\`, \`T\` widens to \`string\` and \`pair("a", "b")\` is fine. \`NoInfer\` decides *where* candidates come from, not *how specific* they are; for that, add a constraint or \`const\`.
- **An empty source gives \`never\`.** \`first<T>(xs: T[], fallback: NoInfer<T>)\` called as \`first([], 42)\` fails with \`Argument of type 'number' is not assignable to parameter of type 'never'.\`, because \`[]\` is the only inference site and it infers \`never\`. Pass the type argument, \`first<number>([], 42)\`.
- **It works nested.** \`handler: Handler<NoInfer<E>>\` blocks inference from the callback parameter just like a top-level position.
- **It is erased.** At run time the function receives the plain argument; \`NoInfer\` exists only in the checker.

📌 **Interview term: literal widening** — turning a literal type such as \`"a"\` into its base type \`string\` during inference, unless something (a \`const\` type parameter, a primitive constraint, or \`T\` being the return type) asks to keep it.

## 6. When Not to Use It

\`NoInfer\` is a scalpel. Do not sprinkle it over every second parameter.

- **When both arguments should contribute.** A \`merge<T>(a: T, b: T)\` that should accept either side's shape wants both sites.
- **When the plain signature already errors.** For object arguments, \`assertEqual<T>(actual: T, expected: T)\` with \`expected = { id: 1, nmae: "Ada" }\` already fails in 5.4.5 with \`Object literal may only specify known properties, and 'nmae' does not exist in type '{ id: number; name: string; }'.\`: the first candidate wins and the second is checked. \`NoInfer\` is mainly needed where candidates are **combined**, typically literal types under a constraint.
- **When the caller cannot fix it.** If the only inference site is the blocked one, you have just forced every caller to write a type argument.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(18,35): error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
main.ts(25,38): error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
main.ts(32,40): error TS2345: Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
main.ts(47,25): error TS2345: Argument of type '"xl"' is not assignable to parameter of type '"s" | "m" | "l"'.
main.ts(55,47): error TS2322: Type '"error"' is not assignable to type '"idle" | "loading" | "done"'.
~~~

and for example 2:

~~~text
main.ts(21,11): error TS2345: Argument of type '"b"' is not assignable to parameter of type '"a"'.
main.ts(39,11): error TS2345: Argument of type 'number' is not assignable to parameter of type 'never'.
~~~

Note that the \`lightAmp\` call (\`C & {}\`) produced no error: that is the claim in section 4.

Example 1, inference with and without \`NoInfer\`, prints:

~~~text
true true true true
blue red m
["done","idle"] []
~~~

Example 2, the edge cases, prints:

~~~text
["OPEN","CLOSE"]
7
42
true true true true true true
5 hi 5 {"a":"a","b":"b"}
~~~

Every \`true\` is a compile-time \`Equal<...>\` check that tsc accepted, for instance that the loose light returns the four-color union and that \`onlyBlocked(5)\` returns \`unknown\`. The first \`blue\` is the typo the loose version accepted and returned.

## Common Pitfalls

- **Blocking the only inference site.** \`f<T>(x: NoInfer<T>)\` makes \`T\` \`unknown\`; there must be another site, a default, or an explicit type argument.
- **Expecting \`NoInfer\` to keep literals.** It controls which argument is listened to; \`const T\` or a constraint controls how specific the inferred type is.
- **Believing \`T & {}\` is an old \`NoInfer\`.** In 5.4.5 it does not stop \`"blue"\` from widening \`C\`.
- **Putting it on the wrong argument.** The source of truth stays a normal site; only the argument that must conform gets \`NoInfer\`.
- **Using it where the error already exists.** Object arguments with excess-property checks are often already caught; adding \`NoInfer\` only adds noise.
- **Forgetting it is compile-time only.** A caller who silences the error with a cast still passes \`"blue"\` at run time; validate at run time if the value comes from outside.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Every parameter that mentions <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is an inference site, and TypeScript combines the candidates. So a secondary argument, like a default value, can silently widen <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> instead of being checked against it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The tool:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer&lt;T&gt;</code>, added in TypeScript 5.4, marks a position as check-only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is inferred from the other arguments first, and the argument in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> position must then be assignable to it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The example:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">light&lt;C extends string&gt;(colors: C[], defaultColor?: NoInfer&lt;C&gt;)</code>. Without it, passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"blue"</code> adds blue to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code>; with it, the call is error TS2345.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">Outside generics <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer&lt;X&gt;</code> is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code>; if it is the only site, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> or its default; it does not stop literal widening; and it is erased at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I use it:</strong> <span style="color:#f0e2c8;">Whenever one argument is the source of truth and another must conform: select values, state transitions, defaults and fallbacks. Before 5.4 I would have used a second type parameter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D extends C</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did people do before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer</code> existed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a second type parameter constrained by the first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;C extends string, D extends C&gt;</code>, or use a deferred conditional like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T][T extends any ? 0 : never]</code>. Both work. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T &amp; {}</code> is sometimes quoted, but in 5.4.5 it does not block the candidate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f&lt;T&gt;(x: NoInfer&lt;T&gt;)</code> called as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f(5)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>, because there is no inference site left. With a default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T = string&gt;</code> it is the default, and an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f&lt;number&gt;(5)</code> always works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer</code> keep <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"a"</code> as a literal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, that is a different axis. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> decides which arguments are inference sites; whether <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a"</code> stays a literal depends on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code>, a primitive constraint, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> being the return type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer</code> inside a callback type or an object type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it can wrap any nested position, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handler: (event: NoInfer&lt;E&gt;) =&gt; void</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;S, NoInfer&lt;S&gt;[]&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer</code> a normal type alias you could write yourself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In the lib it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type NoInfer&lt;T&gt; = intrinsic</code>, implemented by the compiler, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uppercase</code>. It resolves to plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> once inference is done.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Inference site | A position in a signature where TypeScript looks for \`T\` while inferring it |
| Inference candidate | A type collected for \`T\` at an inference site; candidates are combined into the final \`T\` |
| \`NoInfer<T>\` | Intrinsic utility type (5.4) that makes a position check-only, not an inference site |
| Deferred conditional type | A conditional type that cannot resolve yet because it depends on a type parameter |
| Literal widening | Turning a literal like \`"a"\` into \`string\` during inference unless something keeps it |

**Conclusion:** By default every argument that mentions a type parameter gets a vote in what it becomes, so a default or a fallback can quietly enlarge the type instead of being checked. \`NoInfer<T>\` takes that vote away from one position: inference happens on the source-of-truth argument, and the \`NoInfer\` argument is checked against the result, which turns silent widening into a precise error. Use it where one argument must conform to another, remember that it does not control literal widening and needs another inference site, and it becomes one of the cleanest tools for designing generic APIs.`,
    examples: [
      {
        label: `NoInfer vs inference from every argument, and the old workarounds`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Without NoInfer: both parameters are inference sites for C.
function lightLoose<C extends string>(colors: C[], defaultColor?: C): C {
  return defaultColor ?? colors[0];
}
// "blue" becomes a candidate too, so C = "red" | "yellow" | "green" | "blue".
const loose = lightLoose(["red", "yellow", "green"], "blue");
const c1: Equal<typeof loose, "red" | "yellow" | "green" | "blue"> = true;

// 2. With NoInfer: only colors is an inference site; defaultColor is checked afterwards.
function light<C extends string>(colors: C[], defaultColor?: NoInfer<C>): C {
  return defaultColor ?? colors[0];
}
const ok = light(["red", "yellow", "green"], "red");
const c2: Equal<typeof ok, "red" | "yellow" | "green"> = true;
// @ts-expect-error "blue" is not one of the colors inferred from the array
light(["red", "yellow", "green"], "blue");

// 3. The pre-5.4 workaround: a second type parameter constrained by the first.
function lightOld<C extends string, D extends C>(colors: C[], defaultColor?: D): C {
  return defaultColor ?? colors[0];
}
// @ts-expect-error the same error, at the cost of an extra type parameter
lightOld(["red", "yellow", "green"], "blue");
// The older community trick, a deferred conditional type, also blocks it...
type OldNoInfer<T> = [T][T extends any ? 0 : never];
function lightTrick<C extends string>(colors: C[], defaultColor?: OldNoInfer<C>): C {
  return defaultColor ?? colors[0];
}
// @ts-expect-error blocked by the deferred conditional
lightTrick(["red", "yellow", "green"], "blue");
// ...but C & {} does not: "blue" still widens C.
function lightAmp<C extends string>(colors: C[], defaultColor?: C & {}): C {
  return defaultColor ?? colors[0];
}
const amp = lightAmp(["red", "yellow", "green"], "blue");
const c4: Equal<typeof amp, "red" | "yellow" | "green" | "blue"> = true;

// 4. A select box: the value must be one of the options.
function select<const T extends string>(options: readonly T[], value: NoInfer<T>) {
  return { options, value };
}
const size = select(["s", "m", "l"], "m");
const c3: Equal<typeof size.value, "s" | "m" | "l"> = true;
// @ts-expect-error "xl" is not an option
select(["s", "m", "l"], "xl");

// 5. A state machine: transitions may only name states declared in the first argument.
function machine<const S extends string>(states: readonly S[], transitions: Partial<Record<S, NoInfer<S>[]>>) {
  return (from: S) => transitions[from] ?? [];
}
const next = machine(["idle", "loading", "done"], { idle: ["loading"], loading: ["done", "idle"] });
// @ts-expect-error "error" is not a declared state
machine(["idle", "loading", "done"], { idle: ["error"] });

console.log(c1, c2, c3, c4);
console.log(loose, ok, size.value);
console.log(JSON.stringify(next("loading")), JSON.stringify(next("done")));`,
      },
      {
        label: `Edge cases: only site, literal widening, never and nesting`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Outside a generic, NoInfer<X> is just X.
const n1: Equal<NoInfer<string>, string> = true;
const n2: Equal<NoInfer<{ a: 1 }>, { a: 1 }> = true;

// 2. If NoInfer is the only place T appears, nothing is inferred: T falls back.
function onlyBlocked<T>(x: NoInfer<T>): T { return x as T; }
const u = onlyBlocked(5);
const n3: Equal<typeof u, unknown> = true;
// ...to its default if it has one, and an explicit type argument always works.
function withDefault<T = string>(x: NoInfer<T>): T { return x as T; }
const d = withDefault("hi");
const n4: Equal<typeof d, string> = true;
const e = onlyBlocked<number>(5);
const n5: Equal<typeof e, number> = true;

// 3. A single literal candidate is kept when T is the return type...
function same<T>(a: T, b: NoInfer<T>): T { return a; }
// @ts-expect-error T is inferred as "a" from the first argument only
same("a", "b");
// ...but widened to string when T is not at the top level of the return type.
function pair<T>(a: T, b: NoInfer<T>): { a: T; b: T } { return { a, b }; }
const s = pair("a", "b");
const n6: Equal<typeof s, { a: string; b: string }> = true;

// 4. Inside a callback parameter: the handler cannot introduce new event names.
type Handler<E extends string> = (event: E) => string;
function subscribe<E extends string>(events: E[], handler: Handler<NoInfer<E>>) {
  return events.map(handler);
}
console.log(JSON.stringify(subscribe(["open", "close"], (ev) => ev.toUpperCase())));

// 5. NoInfer is erased: at run time it is the plain argument.
function first<T>(xs: T[], fallback: NoInfer<T>): T { return xs.length ? xs[0] : fallback; }
console.log(first([7, 8], 0));
// An empty array literal gives T = never, so the fallback has nothing to match.
// @ts-expect-error number is not assignable to never
first([], 42);
console.log(first<number>([], 42));

console.log(n1, n2, n3, n4, n5, n6);
console.log(String(u), d, e, JSON.stringify(s));`,
      },
    ],
  },
  {
    title: `How do you choose between \`NoInfer<T>\`, \`satisfies\`, and \`const\` type params when designing APIs?`,
    difficulty: "hard",
    seoDescription: `Choosing between satisfies, const type parameters and NoInfer when designing TypeScript APIs: which problem each solves, who writes it, how they compose.`,
    description: `**Question presented to candidate:**
"You are designing a small TypeScript library API, say a router or an i18n helper. When would you use \`satisfies\`, when a \`const\` type parameter, and when \`NoInfer\`? Walk me through how you decide."

**What a strong answer should cover:**
- They solve three different problems: \`satisfies\` checks a value against a type without changing its type; \`<const T>\` makes a generic infer literal, readonly types from what the caller writes; \`NoInfer<T>\` stops one argument from contributing to inference
- Who uses each: \`satisfies\` is written by the caller at a declaration (TypeScript 4.9); \`const\` type parameters (5.0) and \`NoInfer\` (5.4) are written by the library author in the signature
- \`const T\` only affects literals written inside the call; a pre-declared variable is already widened, which is where the caller's \`as const satisfies X\` comes in
- \`NoInfer\` is needed only where a second argument would add candidates (literal unions); \`keyof T\` and object arguments are often already checked
- They compose: \`const\` on the source-of-truth parameter, \`NoInfer\` on the dependent one, \`satisfies\` on the caller's config objects
- Version floor: using them in a published signature requires consumers on a TypeScript version that understands them

**Clarifying questions expected:**
- Am I the library author or the caller, and can I change the function signature?
- Which TypeScript version must consumers of the library support?

**Code / implementation expected:** Yes — one API signature that uses \`const\` and \`NoInfer\`, plus a caller-side \`satisfies\`.`,
    answer: `**Target Audience:** Developers who already know what each of the three features does on its own and now have to pick between them when designing a function or library API.
**Difficulty:** Hard
**TypeScript version:** \`satisfies\` arrived in TypeScript 4.9 ([4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)), \`const\` type parameters in 5.0 ([5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)) and \`NoInfer\` in 5.4 ([5.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/)). Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This is the applied, "which one and why" page. Each tool has its own fundamentals page; this one only recaps them in a sentence each: [What does \`NoInfer<T>\` do?](/interview-question/what-does-noinfer-t-do-and-when-should-you-block-inference), [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do) (and [how it avoids widening](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types)), and [What are \`const\` type parameters?](/interview-question/what-are-const-type-parameters-const-t-and-why-are-they-better-than-as-const)

## 1. Why This Even Matters — A Story First

Think of three different people at a parcel office.

- **The inspector** (\`satisfies\`) looks at your parcel, confirms it fits the size rules, and hands it back **unchanged**. The label still says exactly what you wrote.
- **The careful clerk** (\`const\` type parameter) copies your address **letter for letter** instead of writing "somewhere in Paris". The office decides to be careful; you do not have to ask.
- **The supervisor** (\`NoInfer\`) decides that the delivery slip is the source of truth, and the "leave with neighbour" note must match a name on it. The note is **not allowed to change** the slip.

All three make the system stricter, but they act at different moments and are operated by different people. Picking the right one is mostly a matter of asking *what exactly is going wrong* and *whose code you can change*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Am I designing the signature, or calling one I cannot change? | Only the author can add \`const\` or \`NoInfer\`; a caller only has \`satisfies\` and \`as const\`. |
| Which TypeScript versions must consumers support? | A \`.d.ts\` that uses \`NoInfer\` needs consumers on 5.4 or later; \`const\` type parameters need 5.0. |
| Will callers pass inline literals or pre-built config objects? | \`const T\` only affects literals written inside the call. |
| Is the literal type actually useful downstream? | Keeping \`"en" \\| "fr"\` costs nothing if it powers autocompletion and checks; if nothing reads it, plain types are simpler. |

## 3. The Three Jobs in One Sentence Each

📌 **Interview term: \`satisfies\` operator** — \`expr satisfies Type\` checks that \`expr\` is assignable to \`Type\` and reports errors there, but the expression keeps its own (narrower) inferred type.

📌 **Interview term: \`const\` type parameter** — \`function f<const T>(x: T)\` asks TypeScript to infer \`T\` as if the caller had written \`as const\` on the argument: literal types, and array literals become readonly tuples (example 2 shows \`[1, 2]\` becoming \`readonly [1, 2]\`).

📌 **Interview term: \`NoInfer<T>\`** — wraps one parameter position so it is checked against \`T\` but does not contribute candidates to it.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Decision guide: which problem maps to satisfies, const type parameters or NoInfer">
  <rect class="d-box-muted" x="250" y="20" width="260" height="56" rx="10"/>
  <text class="d-text" x="380" y="54" text-anchor="middle">What goes wrong?</text>
  <rect class="d-box" x="20" y="130" width="220" height="64" rx="10"/>
  <text class="d-text" x="130" y="157" text-anchor="middle">Checked value</text>
  <text class="d-sub" x="130" y="180" text-anchor="middle">loses its literals</text>
  <rect class="d-box" x="270" y="130" width="220" height="64" rx="10"/>
  <text class="d-text" x="380" y="157" text-anchor="middle">Literals widen</text>
  <text class="d-sub" x="380" y="180" text-anchor="middle">when passed to my function</text>
  <rect class="d-box" x="520" y="130" width="220" height="64" rx="10"/>
  <text class="d-text" x="630" y="157" text-anchor="middle">A second argument</text>
  <text class="d-sub" x="630" y="180" text-anchor="middle">widens the type</text>
  <rect class="d-box-accent" x="20" y="230" width="220" height="50" rx="10"/>
  <text class="d-text" x="130" y="261" text-anchor="middle">satisfies (caller)</text>
  <rect class="d-box-accent" x="270" y="230" width="220" height="50" rx="10"/>
  <text class="d-text" x="380" y="261" text-anchor="middle">const T (author)</text>
  <rect class="d-box-accent" x="520" y="230" width="220" height="50" rx="10"/>
  <text class="d-text" x="630" y="261" text-anchor="middle">NoInfer (author)</text>
  <line class="d-edge" x1="300" y1="76" x2="160" y2="128"/>
  <line class="d-edge" x1="380" y1="76" x2="380" y2="128"/>
  <line class="d-edge" x1="460" y1="76" x2="600" y2="128"/>
  <line class="d-edge-accent" x1="130" y1="194" x2="130" y2="228"/>
  <line class="d-edge-accent" x1="380" y1="194" x2="380" y2="228"/>
  <line class="d-edge-accent" x1="630" y1="194" x2="630" y2="228"/>
</svg>

Start from the symptom, not from the feature: each symptom has exactly one natural fix, and the label in brackets says whose code it goes in.

| | \`satisfies\` | \`const\` type parameter | \`NoInfer<T>\` |
| :--- | :--- | :--- | :--- |
| Written by | The caller, at a declaration | The library author, on \`<T>\` | The library author, on one parameter |
| Changes the inferred type? | No, it only checks | Yes: literal, readonly | No, it changes *where* \`T\` comes from |
| Typical symptom | \`Record<string, X>\` annotation forgets the keys | \`["en", "fr"]\` becomes \`string[]\` | A default, fallback or target adds a new member to \`T\` |
| Where the error appears | On the bad property of the literal | Downstream, where the literal type is used | On the argument in the \`NoInfer\` position |
| Minimum TypeScript | 4.9 | 5.0 | 5.4 |

## 4. One API, Three Tools

Here is an i18n helper that uses all three, each for its own job (example 1):

~~~ts
function createI18n<const L extends string, M extends Messages>(opts: {
  locales: readonly L[];          // const L: keep "en" | "fr" without as const at the call
  fallback: NoInfer<L>;           // NoInfer: must be one of the locales, cannot add one
  messages: Record<L, M>;
}) { ... }

// Caller side: satisfies checks the dictionary but keeps its exact keys.
const en = { hello: "Hello", bye: "Goodbye" } satisfies Messages;
const fr = { hello: "Bonjour", bye: "Au revoir" } satisfies Messages;

const i18n = createI18n({ locales: ["en", "fr"], fallback: "en", messages: { en, fr } });
i18n.t("fr", "hello");   // locale: "en" | "fr", key: "hello" | "bye"
~~~

Each tool catches a different mistake, and the compiler puts each error in the right place:

~~~text
main.ts(33,37): error TS2322: Type '"de"' is not assignable to type '"en" | "fr"'.
main.ts(35,14): error TS2345: Argument of type '"greet"' is not assignable to parameter of type '"hello" | "bye"'.
main.ts(37,18): error TS2322: Type 'number' is not assignable to type 'string'.
~~~

- \`fallback: "de"\` is rejected because of \`NoInfer\`. Without it (the \`createLoose\` version in the example) \`"de"\` silently becomes a third locale: its type is \`("en" | "fr" | "de")[]\`.
- \`t("fr", "greet")\` is rejected because \`M\` was inferred from the \`satisfies\`-checked dictionaries, which kept their keys. Annotating \`const en: Messages = ...\` instead would make \`keyof typeof en\` plain \`string\`, and every key would be accepted.
- \`{ hello: 42 } satisfies Messages\` is rejected at the declaration, on the property that is wrong.

📌 **Interview term: source of truth parameter** — the argument from which a generic's type should be inferred; the other arguments that mention the same type parameter should conform to it, which is exactly what \`NoInfer\` expresses.

## 5. The Boundaries Between Them

Example 2 checks the places where people pick the wrong one.

**\`const T\` does nothing for a variable.** The modifier only shapes literals written inside the call:

~~~ts
keep({ mode: "dark", sizes: [1, 2] });   // { readonly mode: "dark"; readonly sizes: readonly [1, 2] }
const declared = { mode: "dark" };
keep(declared);                          // { mode: string }
~~~

\`declared\` was already widened when it was declared, before the call. The fix is on the caller side: \`{ mode: "dark" } as const satisfies { mode: "dark" | "light" }\` both freezes the literals and checks them, and then \`keep\` returns \`{ readonly mode: "dark" }\`.

📌 **Interview term: \`as const satisfies\`** — the caller-side combination that makes a value deeply readonly with literal types *and* checks it against a type, in that order.

**\`satisfies\` never changes the type, so \`let\` still widens.** \`const port = 8080 satisfies number\` is \`8080\`, but \`let mutablePort = 8080 satisfies number\` is \`number\`: the declaration keyword decides widening, \`satisfies\` only checks. See [type widening](/interview-question/what-is-type-widening-and-how-do-you-prevent-it).

**\`NoInfer\` is not always needed.** In \`pick<const T extends Record<string, number>>(obj: T, key: keyof T)\`, \`pick({ a: 1, b: 2 }, "c")\` is already an error in 5.4.5:

~~~text
error TS2345: Argument of type '"c"' is not assignable to parameter of type '"a" | "b"'.
~~~

A \`keyof T\` position did not let \`"c"\` grow \`T\` here, so wrapping it in \`NoInfer\` would add nothing. Reach for \`NoInfer\` when a second argument of the *same* literal type would be combined into a union, like the \`fallback\` above.

**A readonly constraint gives a readonly tuple.** \`keepArr<const T extends readonly string[]>\` returns \`readonly ["a", "b"]\` for \`keepArr(["a", "b"])\`. In 5.4.5 a mutable \`string[]\` constraint returned the mutable tuple \`["a", "b"]\` in a separate check, so pick the constraint that matches what you want callers to receive.

## 6. A Practical Order of Questions

1. **Can I change the signature?** No: use \`satisfies\` (and \`as const\` if literals matter) at the declaration. Yes: continue.
2. **Do callers pass inline literals whose exact values matter later?** Put \`const\` on the type parameter (with a \`readonly\` array constraint).
3. **Does any other argument mention the same type parameter but must only conform?** Wrap that position in \`NoInfer\`.
4. **Does a separate config object need checking without losing keys?** That is the caller's \`satisfies\`; document it in your README.
5. **Check the version floor.** All of it is erased at run time, but your \`.d.ts\` files carry these keywords to your consumers.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(33,37): error TS2322: Type '"de"' is not assignable to type '"en" | "fr"'.
main.ts(35,14): error TS2345: Argument of type '"greet"' is not assignable to parameter of type '"hello" | "bye"'.
main.ts(37,18): error TS2322: Type 'number' is not assignable to type 'string'.
~~~

and for example 2:

~~~text
main.ts(32,22): error TS2345: Argument of type '"c"' is not assignable to parameter of type '"a" | "b"'.
main.ts(40,30): error TS2322: Type '"slow"' is not assignable to type '"fast" | "safe"'.
~~~

Example 1, one API using all three, prints:

~~~text
true true true true true
Bonjour / Goodbye
["en","fr"] {"locales":["en","fr"],"fallback":"de"}
~~~

Example 2, the boundaries, prints:

~~~text
safe x3
true true true true true true
{"mode":"dark","sizes":[1,2]} ["a","b"] 8080 8080
2
~~~

Every \`true\` is a compile-time \`Equal<...>\` check that tsc accepted, for instance that \`keyof typeof en\` is \`"hello" | "bye"\` while the annotated version is \`string\`, and that \`keep(declared)\` is \`{ mode: string }\`. The \`"fallback":"de"\` line is the loose version accepting the typo.

## Common Pitfalls

- **Annotating instead of \`satisfies\`.** \`const routes: Record<string, Route> = ...\` checks the shape but throws away the keys; \`satisfies\` keeps them.
- **Expecting \`const T\` to fix a variable.** It only affects literals written in the call; the caller needs \`as const\` on the declaration.
- **Adding \`NoInfer\` everywhere.** It is only useful on positions that would otherwise add candidates; on the source-of-truth parameter it breaks inference entirely (\`T\` becomes \`unknown\`).
- **Using \`satisfies\` to "narrow" a \`let\`.** It never changes the type, and \`let\` still widens literals.
- **Forgetting consumers' compiler.** A published signature with \`NoInfer\` or \`const T\` needs consumers on 5.4 or 5.0 respectively.
- **Treating any of them as validation.** All three are erased; data from a network or a file still needs a run-time check.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three problems:</strong> <span style="color:#f0e2c8;">They fix different things. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> checks a value without changing its type; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameter makes a generic infer literal, readonly types; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> stops one argument from influencing inference.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who writes them:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> is caller-side, on a declaration, since 4.9. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameters (5.0) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> (5.4) are author-side, in the signature, so they only help if I own the API.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How I decide:</strong> <span style="color:#f0e2c8;">I start from the symptom: a checked config forgets its keys, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code>; inline literals widen when passed in, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const T</code>; a default or fallback adds a new member to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> on that parameter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. They compose:</strong> <span style="color:#f0e2c8;">In an i18n helper, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;const L extends string&gt;</code> keeps the locales, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fallback: NoInfer&lt;L&gt;</code> must be one of them, and callers write their dictionaries with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies Messages</code> so the keys flow into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t()</code> function.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const T</code> does not affect a pre-declared variable, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> does not stop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> widening, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> is not needed for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code>, and all three are erased at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A caller passes a config variable to your <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;const T&gt;</code> function and gets wide types. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The variable was widened at its declaration, before the call; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const T</code> only shapes literals written inside the call. The caller should declare it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const satisfies Config</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just ask callers to write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They forget, and the error appears far away. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;const T&gt;</code> the library gets literal inference by default, and the caller writes nothing extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoInfer</code> on a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key: keyof T</code> parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. In 5.4.5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick({ a: 1, b: 2 }, "c")</code> is already error TS2345 without it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> matters where a second argument of the same literal type would be merged into a union.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code> and a type annotation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An annotation sets the variable's type to the annotated type, so details like literal keys are lost; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> only checks assignability and keeps the expression's own inferred type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your library must support TypeScript 4.8 consumers. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Neither <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameters nor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoInfer</code> can appear in the published <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code>. I would fall back to an extra constrained type parameter (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D extends C</code>) and document <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> for callers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> is caller code, so it does not affect the library at all.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`satisfies\` operator | Checks an expression against a type without changing the expression's type (4.9) |
| \`const\` type parameter | \`<const T>\`: infers literal, readonly types from literals written in the call (5.0) |
| \`NoInfer<T>\` | Makes one parameter position check-only, not an inference site (5.4) |
| Source of truth parameter | The argument a generic's type should be inferred from; others must conform |
| \`as const satisfies\` | Caller-side combination: deep readonly literals, then a shape check |

**Conclusion:** \`satisfies\`, \`const\` type parameters and \`NoInfer\` all make APIs stricter, but they are not alternatives to each other: \`satisfies\` is the caller checking a value without losing detail, \`const T\` is the author asking for literal inference, and \`NoInfer\` is the author choosing which argument is the source of truth. Diagnose the symptom, check whose code you can change, and the right tool, often two of them together, follows directly.`,
    examples: [
      {
        label: `One i18n API using const, NoInfer and a caller-side satisfies`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// The API: an i18n helper. Three different jobs, three different tools.
type Messages = Record<string, string>;

function createI18n<const L extends string, M extends Messages>(opts: {
  locales: readonly L[];          // const L: keep "en" | "fr" without as const at the call
  fallback: NoInfer<L>;           // NoInfer: must be one of the locales, cannot add one
  messages: Record<L, M>;
}) {
  return {
    locales: opts.locales,
    t(locale: L, key: keyof M & string): string {
      return opts.messages[locale][key] ?? opts.messages[opts.fallback][key];
    },
  };
}

// Caller side: satisfies checks the dictionary but keeps its exact keys.
const en = { hello: "Hello", bye: "Goodbye" } satisfies Messages;
const fr = { hello: "Bonjour", bye: "Au revoir" } satisfies Messages;
const c1: Equal<keyof typeof en, "hello" | "bye"> = true;

// An annotation instead would forget the keys.
const enAnnotated: Messages = { hello: "Hello", bye: "Goodbye" };
const c2: Equal<keyof typeof enAnnotated, string> = true;

const i18n = createI18n({ locales: ["en", "fr"], fallback: "en", messages: { en, fr } });
const c3: Equal<Parameters<typeof i18n.t>[0], "en" | "fr"> = true;
const c4: Equal<Parameters<typeof i18n.t>[1], "hello" | "bye"> = true;

// @ts-expect-error fallback "de" is not one of the locales (NoInfer)
createI18n({ locales: ["en", "fr"], fallback: "de", messages: { en, fr } });
// @ts-expect-error "greet" is not a message key (inferred from messages)
i18n.t("fr", "greet");
// @ts-expect-error satisfies catches a value of the wrong type at the declaration
const broken = { hello: 42 } satisfies Messages;

// Without NoInfer (and without const), the typo "de" silently becomes a locale.
function createLoose<L extends string>(opts: { locales: L[]; fallback: L }) {
  return opts;
}
const loose = createLoose({ locales: ["en", "fr"], fallback: "de" });
const c5: Equal<typeof loose.locales, ("en" | "fr" | "de")[]> = true;

console.log(c1, c2, c3, c4, c5);
console.log(i18n.t("fr", "hello"), "/", i18n.t("en", "bye"));
console.log(JSON.stringify(i18n.locales), JSON.stringify(loose));`,
      },
      {
        label: `The boundaries: variables, let, keyof T and readonly constraints`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

function keep<const T>(value: T): T { return value; }
function keepArr<const T extends readonly string[]>(value: T): T { return value; }

// 1. const T only affects literals written inside the call.
const inline = keep({ mode: "dark", sizes: [1, 2] });
const c1: Equal<typeof inline, { readonly mode: "dark"; readonly sizes: readonly [1, 2] }> = true;
const declared = { mode: "dark" };
const fromVar = keep(declared);
const c2: Equal<typeof fromVar, { mode: string }> = true;
// The caller fixes that at the declaration: as const (and satisfies to check it).
const declared2 = { mode: "dark" } as const satisfies { mode: "dark" | "light" };
const fromVar2 = keep(declared2);
const c3: Equal<typeof fromVar2, { readonly mode: "dark" }> = true;

// 2. A readonly array constraint gives a readonly tuple.
const tuple = keepArr(["a", "b"]);
const c4: Equal<typeof tuple, readonly ["a", "b"]> = true;

// 3. satisfies never changes the type of the expression; an annotation does.
const port = 8080 satisfies number;
const c5: Equal<typeof port, 8080> = true;
let mutablePort = 8080 satisfies number;
const c6: Equal<typeof mutablePort, number> = true;

// 4. NoInfer is not needed when the second site cannot add candidates, e.g. keyof T.
function pick<const T extends Record<string, number>>(obj: T, key: keyof T): number {
  return obj[key];
}
// @ts-expect-error already an error without NoInfer: keyof T is checked
pick({ a: 1, b: 2 }, "c");

// 5. satisfies is checked on the caller side only: the library still sees its own types.
type Config = { retries: number; mode: "fast" | "safe" };
function run(cfg: Config): string { return cfg.mode + " x" + cfg.retries; }
const cfg = { retries: 3, mode: "safe" } satisfies Config;
console.log(run(cfg));
// @ts-expect-error satisfies reports the bad literal where it is written
const badCfg = { retries: 3, mode: "slow" } satisfies Config;

console.log(c1, c2, c3, c4, c5, c6);
console.log(JSON.stringify(inline), JSON.stringify(tuple), port, mutablePort);
console.log(pick({ a: 1, b: 2 }, "b"));`,
      },
    ],
  },
  {
    title: `How does TypeScript 5.5 infer type predicates for \`Array.filter\` automatically?`,
    difficulty: "medium",
    seoDescription: `TypeScript 5.5 inferred type predicates: why filter(x => x !== undefined) narrows, the if-and-only-if rule, what is not inferred, and the fallbacks.`,
    description: `**Question presented to candidate:**
"Before TypeScript 5.5, \`values.filter(x => x !== undefined)\` still gave you \`(number | undefined)[]\`. In 5.5 it gives \`number[]\`. What changed, how does the compiler decide, and when does it still not work?"

**What a strong answer should cover:**
- A type predicate (\`x is T\`) is a boolean return type that also narrows; \`filter\` has had an overload taking one, \`filter<S extends T>(pred: (v: T) => v is S): S[]\`, long before 5.5
- What 5.5 added: inferred type predicates. For a function with no return annotation, the checker infers \`x is T\` from its body, so the existing overload is picked; the \`filter\` declaration did not change
- The conditions: no explicit return type, a single return and no implicit returns, the parameter is not reassigned, and the result must narrow in both directions ("true if and only if")
- Examples that are not inferred: \`x => !!x\` on \`number | undefined\` (0 is falsy), \`x !== undefined && x > 1\`, a check on an optional property of a non-union object, and \`filter(Boolean)\`
- Consequences: works for named functions and arrow functions, inline or not; a behaviour change where an inferred \`number[]\` no longer accepts \`push(undefined)\`
- Before 5.5 (and for the cases above): write the predicate by hand or use a generic \`isDefined<T>(x: T): x is NonNullable<T>\`

**Code / implementation expected:** Optional — show a filter that narrows, one that does not, and the hand-written predicate fallback.`,
    answer: `**Target Audience:** Developers who use \`Array.filter\` and type guards daily and want to know exactly when TypeScript 5.5+ narrows the result for them.
**Difficulty:** Medium
**TypeScript version:** Inferred type predicates shipped in TypeScript 5.5 ([TypeScript 5.5 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/); the feature was implemented by Dan Vanderkam, see [Effective TypeScript: TS 5.5](https://effectivetypescript.com/2024/07/02/ts-55/)). The page runs TypeScript 5.4.5, which does **not** have the feature: the runnable examples show the 5.4.5 behaviour and the hand-written predicates, and every 5.5+ claim below was checked separately with **tsc 5.9.3** (\`--strict\`), as marked.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A bouncer checks every guest's ticket and only lets ticket holders in. Inside the club, the barman still asks every single guest "do you have a ticket?". Nobody told him the bouncer already checked.

That was \`filter\` before TypeScript 5.5. Your callback checked \`x !== undefined\` for every element, but the resulting array was still typed as "maybe undefined", so the next line had to check again or use \`!\`. TypeScript 5.5 lets the bouncer's check travel with the guests: if the callback really proves something about each element, the resulting array's type says so.

## 2. Type Predicates, the Part That Already Existed

A normal function that returns \`boolean\` tells the checker nothing about its argument. A **type predicate** is a special return type that does:

~~~ts
function isString(x: unknown): x is string {
  return typeof x === "string";
}
~~~

📌 **Interview term: type predicate** — a return type of the form \`param is Type\`. When the function returns \`true\`, the checker narrows the argument to \`Type\`; when it returns \`false\`, it narrows it to "not \`Type\`". See [type guards](/interview-question/what-is-type-narrowing-and-what-are-type-guards).

\`Array.prototype.filter\` has an overload that uses it. This is the declaration in the 5.4.5 lib, so it is **not** new in 5.5:

~~~ts
filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
~~~

Pass a callback whose type is a predicate and \`filter\` returns \`S[]\`. Pass a callback that returns plain \`boolean\` and the other overload returns \`T[]\`. The whole question is therefore: **when is your callback's type a predicate?**

## 3. What 5.5 Changed: The Compiler Writes the Predicate

Before 5.5, only when you wrote \`x is ...\` yourself. From 5.5, the checker can **infer** it from the function body. Declaration emit makes this visible. The same file compiled with both versions:

~~~ts
export function isString(x: unknown) { return typeof x === "string"; }
export const isDefined = (x: number | undefined) => x !== undefined;
export function isTruthy(x: number | undefined) { return !!x; }
~~~

~~~text
== 5.4.5
export declare function isString(x: unknown): boolean;
export declare const isDefined: (x: number | undefined) => boolean;
export declare function isTruthy(x: number | undefined): boolean;
== 5.9.3
export declare function isString(x: unknown): x is string;
export declare const isDefined: (x: number | undefined) => x is number;
export declare function isTruthy(x: number | undefined): boolean;
~~~

📌 **Interview term: inferred type predicate** — a \`param is Type\` return type that TypeScript 5.5+ infers for a function without a return annotation, when the body's boolean result exactly tracks a narrowing of that parameter.

Because the callback's type is now a predicate, the existing \`filter\` overload is chosen and the array narrows:

~~~ts
const xs: (number | undefined)[] = [1, undefined, 0, 3];
const nums: number[] = xs.filter((x) => x !== undefined);
~~~

On 5.4.5 that line is an error, on 5.9.3 it compiles:

~~~text
b.ts(2,7): error TS2322: Type '(number | undefined)[]' is not assignable to type 'number[]'.
  Type 'number | undefined' is not assignable to type 'number'.
    Type 'undefined' is not assignable to type 'number'.
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="An arrow callback gets an inferred predicate, so filter picks the overload that returns a narrowed array">
  <rect class="d-box" x="20" y="90" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="120" text-anchor="middle">x is not undefined</text>
  <text class="d-sub" x="120" y="142" text-anchor="middle">callback body</text>
  <rect class="d-box-accent" x="270" y="90" width="190" height="70" rx="10"/>
  <text class="d-text" x="365" y="120" text-anchor="middle">x is number</text>
  <text class="d-sub" x="365" y="142" text-anchor="middle">inferred in 5.5+</text>
  <rect class="d-box" x="510" y="20" width="190" height="70" rx="10"/>
  <text class="d-text" x="605" y="50" text-anchor="middle">predicate overload</text>
  <text class="d-sub" x="605" y="72" text-anchor="middle">returns number array</text>
  <rect class="d-box-muted" x="510" y="200" width="190" height="70" rx="10"/>
  <text class="d-text" x="605" y="230" text-anchor="middle">boolean overload</text>
  <text class="d-sub" x="605" y="252" text-anchor="middle">used by 5.4 and older</text>
  <line class="d-edge" x1="220" y1="125" x2="268" y2="125"/>
  <line class="d-edge-accent" x1="460" y1="112" x2="508" y2="62"/>
  <line class="d-edge-dashed" x1="60" y1="160" x2="508" y2="235"/>
</svg>

Nothing about \`filter\` changed; what changed is the type of the callback, which decides which of the two overloads matches.

It is a property of the function, not of \`filter\`, so it works for named functions and for arrow functions stored in a variable and passed later (\`xs.filter(isDefined)\` narrows to \`number[]\` on 5.9.3). It also helps \`find\`, \`every\`, and your own code that calls the function in an \`if\`.

## 4. When It Is Inferred, and When It Is Not

The checker infers a predicate only when it is **safe in both directions**. Each row was checked with tsc 5.9.3:

| Callback | Inferred on 5.9.3? | Why |
| :--- | :--- | :--- |
| \`x => x !== undefined\` on \`number \\| undefined\` | Yes, \`x is number\` | true means number, false means undefined |
| \`x => x != null\` | Yes, \`x is number\` | same |
| \`x => typeof x === "string"\` on \`string \\| number\` | Yes, \`x is string\` | \`typeof\` narrowing |
| \`s => s.kind === "circle"\` on a discriminated union | Yes, the circle member | discriminant narrowing |
| \`o => !!o\` on \`{ id: number } \\| undefined\` | Yes | an object is always truthy, so false means undefined |
| \`x => !!x\` on \`number \\| undefined\` | **No**, \`boolean\` | false could also be \`0\`, so "false means undefined" is untrue |
| \`x => x !== undefined && x > 1\` | **No** | false could be a defined small number |
| \`u => u.name !== undefined\` on \`{ name?: string }\` | **No** | narrowing a property does not narrow the object type |
| \`filter(Boolean)\` | **No** | \`Boolean\` is a constructor declared to return \`boolean\`, not a function body to analyse |
| a function with a declared \`: boolean\` return | **No** | an explicit annotation always wins |
| \`if (x === undefined) return false; return true;\` | **No** | more than one \`return\` statement |
| a function that reassigns its parameter first | **No** | the parameter is no longer the value that was passed |

📌 **Interview term: "if and only if" rule** — a predicate narrows the true branch to \`T\` *and* the false branch to "not \`T\`", so it is only inferred when both halves are true. The 5.5 announcement states the conditions as: no explicit return type or predicate annotation, a single \`return\` and no implicit returns, the parameter is not mutated, and a boolean result tied to a refinement of the parameter.

Example 1 shows *why* the rule is strict. A hand-written predicate that breaks it compiles, and lies:

~~~ts
function isBigLie(x: number | undefined): x is number {
  return x !== undefined && x > 1;
}
// in the false branch the checker believes x is undefined...
~~~

~~~text
treated as undefined: 1 | treated as undefined: undefined | treated as undefined: 0 | big 3
~~~

\`1\` and \`0\` reached code typed as \`undefined\`. That is exactly the bug the compiler avoids by not inferring a predicate for that body.

📌 **Interview term: unsound type predicate** — a hand-written \`x is T\` whose body does not really prove it; the compiler trusts predicates you write and does not check them.

## 5. The Fallbacks That Still Matter

For the "No" rows, and for any codebase still on TypeScript 5.4 or older, write the predicate yourself. A generic helper covers most needs (example 2):

~~~ts
function isDefined<T>(x: T): x is NonNullable<T> {
  return x !== undefined && x !== null;
}
raw.filter(isDefined);   // string[]
raw.filter(Boolean);     // still (string | null | undefined)[]
~~~

Note that these two are not even equivalent at run time: \`Boolean\` also removes \`""\`, \`0\` and \`false\`.

~~~text
["a","b",""] ["a","b"]
~~~

## 6. The Behaviour Change You May Hit When Upgrading

Narrower arrays are stricter arrays. This compiles on 5.4.5, where \`ys\` is \`(number | undefined)[]\`:

~~~ts
const ys = xs.filter((x) => x !== undefined);
ys.push(undefined);
~~~

On 5.9.3, \`ys\` is \`number[]\`, and the same line fails:

~~~text
q3b.ts(30,9): error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'number'.
~~~

The fix is to annotate the variable with the wider type you actually want (\`const ys: (number | undefined)[] = ...\`).

## 7. Verified: Running the Code

Both runnable examples were type-checked with \`tsc --strict\` (5.4.5), with no errors, and run as the page runs them. They contain no \`@ts-expect-error\` directives.

Example 1, filters on 5.4.5, the hand-written predicate and the "if and only if" lie, prints:

~~~text
treated as undefined: 1 | treated as undefined: undefined | treated as undefined: 0 | big 3
1,3
true true true true
[1,0,3] [1,0,3] ["a","b"]
~~~

Example 2, a generic guard, \`filter(Boolean)\`, \`find\`/\`every\` and the upgrade behaviour, prints:

~~~text
["a","b",""] ["a","b"]
all numbers, sum 6 true
[1,"missing"]
true true true true
~~~

Every \`true\` is a compile-time \`Equal<...>\` check that tsc 5.4.5 accepted. To check the 5.5+ claims, the same two files were compiled with tsc 5.9.3, which rejects exactly the checks that describe 5.4.5-only behaviour. Example 1:

~~~text
q3a.ts(7,7): error TS2322: Type 'true' is not assignable to type 'false'.
q3a.ts(16,7): error TS2322: Type 'true' is not assignable to type 'false'.
~~~

Line 7 is "\`plain\` is \`(number | undefined)[]\`" and line 16 is "\`isStringInferred\` returns \`boolean\`": on 5.9.3 the array is \`number[]\` and the function is \`(x: unknown) => x is string\`. Example 2:

~~~text
q3b.ts(30,9): error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'number'.
q3b.ts(31,7): error TS2322: Type 'true' is not assignable to type 'false'.
~~~

The \`filter(Boolean)\` check (still wide) passed on both versions. The table in section 4 was checked with a separate file of \`Equal\` assertions on 5.9.3, all of which passed.

## Common Pitfalls

- **Thinking \`filter\` was changed.** The predicate overload is old; 5.5 changed how callbacks get their type.
- **Expecting \`filter(Boolean)\` to narrow.** It does not, on any version checked here; use \`isDefined\` or \`x => x !== undefined\`.
- **Using \`!!x\` on numbers or strings.** \`0\` and \`""\` are falsy, so no predicate is inferred, and at run time they are removed too.
- **Annotating callbacks as \`: boolean\` out of habit.** An explicit return type switches inference off.
- **Writing an unsound predicate by hand.** The compiler trusts it; the false branch will be narrowed wrongly.
- **Being surprised by stricter arrays after upgrading.** \`push(undefined)\` on a newly narrowed array is now an error; widen with an annotation if needed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The mechanism:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> has always had an overload that takes a type predicate and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">S[]</code>. What 5.5 added is that the compiler infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x is T</code> for a function without a return annotation, so a plain arrow like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x =&gt; x !== undefined</code> now matches that overload.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule:</strong> <span style="color:#f0e2c8;">It is inferred only when it holds in both directions: true must mean <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> and false must mean not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x !== undefined</code> works, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!!x</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number | undefined</code> does not, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> is falsy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Other conditions:</strong> <span style="color:#f0e2c8;">No explicit return type, a single return statement, and the parameter must not be reassigned. It works for named functions and arrow variables, not only inline callbacks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What still needs help:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter(Boolean)</code>, compound checks like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x !== undefined &amp;&amp; x &gt; 1</code>, and properties of non-union objects. There I write a generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isDefined&lt;T&gt;(x: T): x is NonNullable&lt;T&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Upgrade impact:</strong> <span style="color:#f0e2c8;">Arrays get narrower, so code like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push(undefined)</code> on a filtered array can start failing; annotate the wider type where that is intended.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x =&gt; !!x</code> not inferred for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(number | undefined)[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The false branch would have to mean <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> is also falsy. A predicate would then narrow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, which is unsound, so the compiler keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work if the callback is a variable, not inline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The predicate is inferred on the function's own type, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const isDefined = (x: number | undefined) =&gt; x !== undefined</code> has type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x: number | undefined) =&gt; x is number</code>, checked with tsc 5.9.3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">filter(Boolean)</code> still not narrow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Boolean</code> is declared in the lib as a constructor returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>; there is no function body for the checker to analyse, so no predicate is inferred.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you turn inference off for one function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give it an explicit return type, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: boolean</code>. An annotation always wins over inference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did you do before 5.5?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write the predicate explicitly, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x): x is number =&gt; x !== undefined</code>, or reuse a generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isDefined</code> guard. Both still work and are needed on older compilers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type predicate | A return type \`param is Type\` that narrows the argument in both branches |
| Inferred type predicate | A predicate TypeScript 5.5+ infers from a function body without a return annotation |
| "If and only if" rule | A predicate is inferred only if true means \`T\` and false means not \`T\` |
| Unsound type predicate | A hand-written predicate whose body does not prove it; the compiler trusts it anyway |

**Conclusion:** TypeScript 5.5 did not teach \`filter\` anything new; it taught the checker to give simple boolean functions a predicate type when their body proves one, and \`filter\`'s long-standing predicate overload does the rest. The rule is strict on purpose, true must mean \`T\` and false must mean not \`T\`, so truthiness checks on numbers, compound conditions and \`filter(Boolean)\` still need a hand-written guard. Know the rule, keep an \`isDefined\` helper for the rest, and expect slightly stricter arrays when you upgrade.`,
    examples: [
      {
        label: `Filters on 5.4.5, hand-written predicates and the if-and-only-if rule`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const xs: (number | undefined)[] = [1, undefined, 0, 3];

// 1. On TypeScript 5.4.5 (this page) a boolean callback does not narrow the array.
const plain = xs.filter((x) => x !== undefined);
const c1: Equal<typeof plain, (number | undefined)[]> = true;

// 2. The hand-written type predicate: what TypeScript 5.5+ writes for you.
const narrowed = xs.filter((x): x is number => x !== undefined);
const c2: Equal<typeof narrowed, number[]> = true;

// 3. The same with a standalone function. 5.5+ infers "x is string" for isStringInferred.
function isStringInferred(x: unknown) { return typeof x === "string"; }
function isString(x: unknown): x is string { return typeof x === "string"; }
const c3: Equal<typeof isStringInferred, (x: unknown) => boolean> = true;
const mixed: (string | number)[] = [1, "a", 2, "b"];
const strs = mixed.filter(isString);
const c4: Equal<typeof strs, string[]> = true;

// 4. Why "if and only if" matters: a predicate also narrows the false branch.
// This hand-written predicate is a lie: false does not mean "undefined".
function isBigLie(x: number | undefined): x is number {
  return x !== undefined && x > 1;
}
function describe(x: number | undefined): string {
  if (isBigLie(x)) return "big " + x;
  // Here the checker believes x is undefined, but 0 and 1 also land here.
  const shouldBeUndefined: undefined = x;
  return "treated as undefined: " + String(shouldBeUndefined);
}
console.log(xs.map(describe).join(" | "));

// 5. Narrowing a discriminated union by a filter.
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
const shapes: Shape[] = [{ kind: "circle", r: 1 }, { kind: "square", s: 2 }, { kind: "circle", r: 3 }];
const circles = shapes.filter((s): s is Extract<Shape, { kind: "circle" }> => s.kind === "circle");
console.log(circles.map((c) => c.r).join(","));

console.log(c1, c2, c3, c4);
console.log(JSON.stringify(plain), JSON.stringify(narrowed), JSON.stringify(strs));`,
      },
      {
        label: `A generic isDefined guard, filter(Boolean), find, every and the upgrade change`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A reusable generic guard: works on every TypeScript version.
function isDefined<T>(x: T): x is NonNullable<T> {
  return x !== undefined && x !== null;
}
const raw: (string | null | undefined)[] = ["a", null, "b", undefined, ""];
const defined = raw.filter(isDefined);
const c1: Equal<typeof defined, string[]> = true;

// 2. filter(Boolean) does not narrow (on 5.4.5, and 5.5+ does not change that).
const viaBoolean = raw.filter(Boolean);
const c2: Equal<typeof viaBoolean, (string | null | undefined)[]> = true;

// 3. Truthiness is not the same as "defined": "" is dropped by Boolean, kept by isDefined.
console.log(JSON.stringify(defined), JSON.stringify(viaBoolean));

// 4. find and every also accept predicates.
const firstDefined = raw.find(isDefined);
const c3: Equal<typeof firstDefined, string | undefined> = true;
const maybe: (number | string)[] = [1, 2, 3];
if (maybe.every((v): v is number => typeof v === "number")) {
  const c4: Equal<typeof maybe, number[]> = true;
  console.log("all numbers, sum", maybe.reduce((a, b) => a + b, 0), c4);
}

// 5. The 5.5 behaviour change in one line: on 5.4.5 this array still allows undefined.
const xs: (number | undefined)[] = [1, undefined];
const ys = xs.filter((x) => x !== undefined);
ys.push(undefined);
const c5: Equal<typeof ys, (number | undefined)[]> = true;
console.log(JSON.stringify(ys.map((y) => y ?? "missing")));

console.log(c1, c2, c3, c5);`,
      },
    ],
  },
  {
    title: `What's new to type in TypeScript 5.5+ libs — \`Array.fromAsync\`, \`Set\` methods, \`Iterator\` helpers?`,
    difficulty: "medium",
    seoDescription: `Typing the new built-ins: lib and esnext settings, Set union and intersection signatures, IteratorObject and lazy iterator helpers, Array.fromAsync.`,
    description: `**Question presented to candidate:**
"Recent TypeScript releases added types for \`Set.prototype.union\`, iterator helpers like \`values().map().take()\`, and \`Array.fromAsync\`. How do you get those types in a project, what do the signatures look like, and what does TypeScript *not* do for you here?"

**What a strong answer should cover:**
- Built-in API types come from the \`lib\` setting (defaulted from \`target\`); new proposals land in \`esnext.*\` libs first: Set methods in \`esnext.collection\` (TypeScript 5.5), iterator helpers in \`esnext.iterator\` (5.6), \`Array.fromAsync\` in \`esnext.array\`
- Types are not polyfills: \`lib\` only says the methods exist; the engine (or a polyfill) must actually have them
- Set methods: \`union<U>(other: ReadonlySetLike<U>): Set<T | U>\`, \`intersection\` gives \`Set<T & U>\`, \`difference\` keeps \`Set<T>\`; "set-like" means \`size\`, \`has\`, \`keys\` (a \`Map\` qualifies, an array does not)
- Iterator helpers are lazy and return \`IteratorObject<T, undefined, unknown>\`; 5.6 introduced \`IteratorObject\`, \`ArrayIterator\` and friends plus \`BuiltinIteratorReturn\` and the \`--strictBuiltinIteratorReturn\` strict flag
- \`Array.fromAsync\` returns \`Promise<T[]>\`, awaiting each element in order (unlike \`Promise.all\`)
- Version detail: in TypeScript 6.0 the Set and iterator types moved to an \`es2025\` lib, while \`fromAsync\` stays in \`esnext\`

**Code / implementation expected:** Optional — a tsconfig \`lib\` change plus a few typed calls, or a typed userland equivalent.`,
    answer: `**Target Audience:** Developers who want to use the newest built-in JavaScript APIs from TypeScript and need to understand where the types come from and what they promise.
**Difficulty:** Medium
**TypeScript version:** The page runs TypeScript 5.4.5, whose libs have **none** of these three APIs, so the runnable examples use typed userland equivalents. The real lib signatures quoted below were read from, and checked with, **tsc 5.9.3** (\`--strict --lib ESNext,DOM\`) and **tsc 6.0.2**; that program was then run in **Node 22.22.0**. Release attributions: Set methods in TypeScript 5.5 ([5.5 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5-rc/)), iterator helpers and \`IteratorObject\` in 5.6 ([5.6 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/)). I could not pin down which release first shipped the \`Array.fromAsync\` declarations: they are absent from 5.4.5 and present in 5.9.3.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A new phone model comes out with a great camera feature. Your **user manual** (the types) can be updated overnight, but that does not put the new camera inside last year's phone (the JavaScript engine). If you read the new manual while holding the old phone, the button it describes simply is not there.

TypeScript's built-in types are the manual. When TC39 adds \`Set.prototype.union\` or iterator helpers, TypeScript adds declarations so the checker knows they exist. Getting those declarations is one switch in \`tsconfig.json\`; making sure the methods exist when the code runs is a completely separate question.

## 2. Where Built-in Types Come From: \`lib\`

📌 **Interview term: \`lib\` option** — the list of built-in declaration files (\`lib.es2022.d.ts\`, \`lib.dom.d.ts\`, ...) the checker loads. If you do not set it, it is derived from \`target\`.

📌 **Interview term: \`esnext.*\` libs** — declaration files for features that are not yet in a published ECMAScript edition the compiler supports. \`lib: ["ESNext"]\` pulls them all in; individual pieces like \`ESNext.Collection\` can be added one by one.

With \`--lib ES2022\`, tsc 5.9.3 refuses all three APIs in the program from section 6 (first error of each kind shown) and, for two of them, says what to change:

~~~text
run.ts(3,13): error TS2550: Property 'union' does not exist on type 'Set<number>'. Do you need to change your target library? Try changing the 'lib' compiler option to 'esnext' or later.
run.ts(13,17): error TS2339: Property 'map' does not exist on type 'ArrayIterator<number>'.
run.ts(23,27): error TS2550: Property 'fromAsync' does not exist on type 'ArrayConstructor'. Do you need to change your target library? Try changing the 'lib' compiler option to 'esnext' or later.
~~~

Where each one lives, read from the lib files shipped with each compiler:

| API | TypeScript 5.4.5 | TypeScript 5.9.3 | TypeScript 6.0.2 |
| :--- | :--- | :--- | :--- |
| \`Set\` union, intersection, ... | not declared | \`lib.esnext.collection.d.ts\` | \`lib.es2025.collection.d.ts\` |
| Iterator helpers (\`map\`, \`take\`, \`toArray\`, \`Iterator.from\`) | not declared | \`lib.esnext.iterator.d.ts\` | \`lib.es2025.iterator.d.ts\` |
| \`Array.fromAsync\` | not declared | \`lib.esnext.array.d.ts\` | \`lib.esnext.array.d.ts\` |
| \`Object.groupBy\` / \`Map.groupBy\` (for comparison) | \`esnext.object\` / \`esnext.collection\` | \`es2024.object\` / \`es2024.collection\` | \`es2024.object\` / \`es2024.collection\` |

The \`groupBy\` row shows the usual life cycle: declarations start in \`esnext.*\` and move to a year-numbered lib once the feature is in a published edition. So in 6.0.2, \`--lib ES2025\` was enough for the Set and iterator code but still rejected \`fromAsync\` with the same TS2550 message. That matches the language itself: Set methods and iterator helpers are part of ECMAScript 2025 ([2ality: ECMAScript 2025](https://2ality.com/2025/06/ecmascript-2025.html)), while \`Array.fromAsync\` was still a Stage 3 proposal in the [July 2025 spec draft](https://tc39.es/proposal-array-from-async/).

A minimal setup that adds only the Set methods, also checked with 5.9.3:

~~~json
{ "compilerOptions": { "target": "ES2022", "lib": ["ES2022", "ESNext.Collection", "DOM"] } }
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Two separate checks: the lib option gives types at compile time, the engine or a polyfill gives the methods at run time">
  <rect class="d-box-muted" x="20" y="20" width="300" height="50" rx="10"/>
  <text class="d-text" x="170" y="51" text-anchor="middle">compile time</text>
  <rect class="d-box-muted" x="400" y="20" width="300" height="50" rx="10"/>
  <text class="d-text" x="550" y="51" text-anchor="middle">run time</text>
  <rect class="d-box" x="20" y="130" width="300" height="70" rx="10"/>
  <text class="d-text" x="170" y="160" text-anchor="middle">lib includes esnext</text>
  <text class="d-sub" x="170" y="182" text-anchor="middle">the checker knows union exists</text>
  <rect class="d-box-accent" x="400" y="130" width="300" height="70" rx="10"/>
  <text class="d-text" x="550" y="160" text-anchor="middle">engine or polyfill</text>
  <text class="d-sub" x="550" y="182" text-anchor="middle">union really exists</text>
  <line class="d-edge" x1="170" y1="70" x2="170" y2="128"/>
  <line class="d-edge" x1="550" y1="70" x2="550" y2="128"/>
</svg>

The two columns are independent. TypeScript only ever touches the left one: it does not add \`Set.prototype.union\` to your output, even with \`target: "ESNext"\`.

📌 **Interview term: polyfill** — run-time code that adds a missing built-in (for example \`core-js\`). Types say a method exists; a polyfill or a new enough engine makes it true.

## 3. The Set Methods

The 5.9.3 declarations, from \`lib.esnext.collection.d.ts\`:

~~~ts
interface ReadonlySetLike<T> {
  keys(): Iterator<T>;
  has(value: T): boolean;
  readonly size: number;
}
interface Set<T> {
  union<U>(other: ReadonlySetLike<U>): Set<T | U>;
  intersection<U>(other: ReadonlySetLike<U>): Set<T & U>;
  difference<U>(other: ReadonlySetLike<U>): Set<T>;
  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U>;
  isSubsetOf(other: ReadonlySetLike<unknown>): boolean;
  isSupersetOf(other: ReadonlySetLike<unknown>): boolean;
  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean;
}
~~~

What the types encode:

- **\`union\` and \`symmetricDifference\` widen**: \`Set<number>\` with \`Set<string | number>\` gives \`Set<number | string>\`.
- **\`intersection\` uses \`&\`**: an element must be in both, so the element type is \`T & U\` (here \`number & (string | number)\`, which simplifies to \`number\` in use).
- **\`difference\` keeps \`T\`**: removing things never adds a type.
- **The argument is set-like, not a \`Set\`**: anything with \`size\`, \`has\` and \`keys()\`. A \`Map\` qualifies (its keys are used); an array does not:

~~~text
arr.ts(2,9): error TS2345: Argument of type 'number[]' is not assignable to parameter of type 'ReadonlySetLike<unknown>'.
  Type 'number[]' is missing the following properties from type 'ReadonlySetLike<unknown>': has, size
~~~

📌 **Interview term: set-like object** — the protocol the Set methods accept as their argument: a \`size\` property plus \`has\` and \`keys\` methods (\`ReadonlySetLike<T>\` in the lib).

Example 1 rebuilds \`union\`, \`intersection\`, \`difference\` and \`isSubsetOf\` with exactly these signatures, so you can see the types and the behaviour on TypeScript 5.4.5.

## 4. Iterator Helpers and the 5.6 Iterator Types

Arrays had \`map\` and \`filter\` for years; iterators (what \`.values()\`, \`.keys()\`, \`.entries()\` and generators return) had nothing. Iterator helpers add \`map\`, \`filter\`, \`take\`, \`drop\`, \`flatMap\`, \`reduce\`, \`toArray\`, \`forEach\`, \`some\`, \`every\`, \`find\`, and the static \`Iterator.from\`.

To type them, TypeScript 5.6 introduced a type for "an object that really inherits from \`Iterator.prototype\`":

📌 **Interview term: \`IteratorObject<T, TReturn, TNext>\`** — the lib interface for built-in iterator objects; the helpers are declared on it. Specific subtypes such as \`ArrayIterator<T>\`, \`SetIterator<T>\` and \`MapIterator<T>\` are what \`arr.values()\`, \`set.values()\` and \`map.entries()\` return, and generators also extend it.

From 5.9.3's \`lib.esnext.iterator.d.ts\` (abridged):

~~~ts
interface IteratorObject<T, TReturn, TNext> {
  map<U>(callbackfn: (value: T, index: number) => U): IteratorObject<U, undefined, unknown>;
  filter<S extends T>(predicate: (value: T, index: number) => value is S): IteratorObject<S, undefined, unknown>;
  take(limit: number): IteratorObject<T, undefined, unknown>;
  toArray(): T[];
  // drop, flatMap, reduce, forEach, some, every, find ...
}
~~~

Two consequences you can see in the types:

- **They are lazy.** \`[1, 2, 3, 4, 5].values().map(...).filter(...).take(2)\` runs nothing until \`toArray()\` (or a \`for...of\`) pulls values, and then only as many as needed. In the Node run, the map callback ran for 1, 2 and 3 only.
- **The result is an iterator, not an array.** Call \`toArray()\` when you need array methods or \`JSON.stringify\`. Each helper returns \`IteratorObject<U, undefined, unknown>\`, so the return type of the chain is \`undefined\`.

📌 **Interview term: \`BuiltinIteratorReturn\` and \`--strictBuiltinIteratorReturn\`** — 5.6 added an intrinsic type used as the \`TReturn\` of built-in iterators and a new flag, included in \`--strict\`, that makes it \`undefined\` instead of \`any\`. Checked with 5.9.3: \`[1, 2].values().next().value\` is \`number | undefined\` under \`--strict\`, and \`any\` with \`--strictBuiltinIteratorReturn false\`.

## 5. \`Array.fromAsync\`

It is \`Array.from\` for async sources. From 5.9.3's \`lib.esnext.array.d.ts\`:

~~~ts
interface ArrayConstructor {
  fromAsync<T>(iterableOrArrayLike: AsyncIterable<T> | Iterable<T | PromiseLike<T>> | ArrayLike<T | PromiseLike<T>>): Promise<T[]>;
  fromAsync<T, U>(iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>, mapFn: (value: Awaited<T>, index: number) => U, thisArg?: any): Promise<Awaited<U>[]>;
}
~~~

- It **always returns a Promise**, so you need \`await\`.
- It accepts an async iterable (an \`async function*\`), or a normal iterable whose elements may be promises; \`[Promise.resolve("p"), "q"]\` becomes \`Promise<string[]>\`.
- It **consumes one element at a time, in order**. That is the difference from \`Promise.all\`, which starts from an array of already-running promises. For an async generator, the next value is only requested after the previous one settled.

📌 **Interview term: async iterable** — an object with a \`[Symbol.asyncIterator]()\` method whose \`next()\` returns promises, such as the result of an \`async function*\`. See [typing async functions and Promises](/interview-question/how-do-you-type-async-functions-and-promises).

One detail from the run: without an annotation, \`async function* ticks() { yield 1; yield 2; yield 3; }\` makes \`Array.fromAsync(ticks())\` a \`Promise<(1 | 2 | 3)[]>\`, because the generator's yield type is inferred from its literals. Annotating \`AsyncGenerator<number>\` gives \`Promise<number[]>\`.

## 6. Verified: Running the Code

**In the page (TypeScript 5.4.5).** Both examples were type-checked with \`tsc --strict\`, with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directive removed, tsc reports for example 1:

~~~text
main.ts(49,12): error TS2345: Argument of type 'number[]' is not assignable to parameter of type 'SetLike<unknown>'.
  Type 'number[]' is missing the following properties from type 'SetLike<unknown>': size, has
~~~

Example 1, typed Set operations with the lib's signatures, prints:

~~~text
[1,2,3,"x"] [2] [1,3]
[1,2,3,9] true false
true true true true
~~~

Example 2, lazy iterator helpers and a typed \`fromAsync\`, prints:

~~~text
before consuming: 0
[20,30] map 1, map 2, map 3
[1,4,9,16]
[1,2,3] yield 1, yield 2, yield 3
["p","q"] true true true
~~~

Every \`true\` is a compile-time \`Equal<...>\` check that tsc accepted, for instance that \`intersection\` returns \`Set<number & (number | string)>\` and that \`fromAsync(ticks())\` is \`Promise<number[]>\`.

**Outside the page (the real APIs).** This program, not run here because it needs TypeScript 5.5+ libs and a run time that has the methods, was compiled with tsc 5.9.3 (\`--strict --target ES2022 --lib ESNext,DOM\`, no errors) and run with Node 22.22.0:

~~~ts
const a = new Set([1, 2, 3]);
const b = new Set(["x", 2]);
const u = a.union(b);                          // Set<number | string>
const i = a.intersection(b);                   // Set<number & (string | number)>
const d = a.difference(b);                     // Set<number>
const s = a.symmetricDifference(b);            // Set<number | string>
const viaMap = a.union(new Map([[9, "nine"]])); // Set<number>
console.log([...u], [...i], [...d], [...s], [...viaMap]);
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isSupersetOf(new Set([1])), a.isDisjointFrom(new Set([7])));

const it = [1, 2, 3, 4, 5].values();           // ArrayIterator<number>
const log: string[] = [];
const lazy = it.map((n) => { log.push("map " + n); return n * 10; }).filter((n) => n > 10).take(2);
console.log("before toArray:", log.length);
console.log(lazy.toArray(), log.join(", "));
function* naturals() { let n = 1; while (true) yield n++; }
console.log(naturals().map((n) => n * n).take(4).toArray());
// filter narrows: the arrow gets an inferred type predicate (5.5+)
console.log(Iterator.from<string | number>(["a", 1, "b"]).filter((x) => typeof x === "string").toArray());

async function* ticks(): AsyncGenerator<number> { yield 1; yield 2; yield 3; }
async function main() {
  console.log(await Array.fromAsync(ticks()));                      // Promise<number[]>
  const fb = await Array.fromAsync([Promise.resolve("p"), "q"]);    // string[]
  console.log(fb, await Array.fromAsync(ticks(), (n) => n * 2));
}
main();
~~~

Node's console output (Node formats arrays with spaces and quotes, unlike the page):

~~~text
[ 1, 2, 3, 'x' ] [ 2 ] [ 1, 3 ] [ 1, 3, 'x' ] [ 1, 2, 3, 9 ]
true true true
before toArray: 0
[ 20, 30 ] map 1, map 2, map 3
[ 1, 4, 9, 16 ]
[ 'a', 'b' ]
[ 1, 2, 3 ]
[ 'p', 'q' ] [ 2, 4, 6 ]
~~~

The types in the comments were checked by a second file of fourteen \`Equal<...>\` assertions on tsc 5.9.3, all of which passed: for example that \`it\` is exactly \`ArrayIterator<number>\`, that the \`take(2)\` chain is \`IteratorObject<number, undefined, unknown>\`, that \`map.entries()\` is \`MapIterator<[string, number]>\`, that \`Set<string>\` intersected with \`Set<number>\` is \`Set<never>\`, and that an unannotated \`yield 1; yield 2; yield 3\` generator gives \`Promise<(1 | 2 | 3)[]>\`. Both files with \`--lib ES2025,DOM\` on tsc 6.0.2 reported only the \`fromAsync\` lines (TS2550, plus one implicit-any parameter in the \`fromAsync\` map callback that follows from it).

## 7. Edge Cases

- **\`target\` does not polyfill.** Raising \`target\` changes which syntax is down-levelled and the default \`lib\`; it never adds built-in methods.
- **Library authors.** If your published \`.d.ts\` mentions \`IteratorObject\` or \`ReadonlySetLike\`, consumers need a TypeScript version and \`lib\` that declare them.
- **Iterators are single-use.** After \`toArray()\` the iterator is exhausted; in Node 22, calling \`toArray()\` a second time on the same \`[1, 2].values()\` gave \`[]\`. Keep the array, or create a new iterator.
- **Generators extend \`IteratorObject\` too.** That is why \`naturals().map(...)\` type-checks in 5.9.3 (on the ES2022 lib it is \`Property 'map' does not exist on type 'Generator<number, void, unknown>'.\`); in the 5.9.3 lib, \`interface Generator<T, TReturn, TNext> extends IteratorObject<T, TReturn, TNext>\`.
- **\`intersection\`'s \`T & U\`.** With unrelated element types (for example \`Set<string>\` and \`Set<number>\`) the result type is \`Set<never>\`, which correctly says "always empty".

## Common Pitfalls

- **Adding \`"ESNext"\` to \`lib\` and shipping to an old browser.** The code compiles and then throws \`... is not a function\` at run time; add a polyfill or check engine support.
- **Passing an array to \`union\`.** It needs a set-like argument; wrap it in \`new Set(array)\`.
- **Expecting iterator helpers to return arrays.** They return lazy iterators; call \`toArray()\`.
- **Using \`Array.fromAsync\` for parallel work.** It awaits sequentially; use \`Promise.all\` when the promises can run at once.
- **Relying on \`any\` from \`next().value\`.** Under \`--strict\` in 5.6+ it is \`T | undefined\` for built-in iterators; handle the \`done\` case.
- **Assuming the lib names are stable.** In 6.0.2 the Set and iterator declarations live in \`es2025.*\`, not \`esnext.*\`; \`lib: ["ESNext"]\` covers both.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Where types come from:</strong> <span style="color:#f0e2c8;">Built-in API types come from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code> option, which defaults from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>. New proposals land in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext</code> libs: Set methods in 5.5, iterator helpers in 5.6, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.fromAsync</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext.array</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Types are not polyfills:</strong> <span style="color:#f0e2c8;">Adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ESNext</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code> only tells the checker the methods exist. The browser or Node version, or a polyfill, must actually provide them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Set methods:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union&lt;U&gt;(other: ReadonlySetLike&lt;U&gt;): Set&lt;T | U&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">intersection</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set&lt;T &amp; U&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">difference</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set&lt;T&gt;</code>. The argument only has to be set-like: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keys</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> works and an array does not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Iterator helpers:</strong> <span style="color:#f0e2c8;">They are lazy and typed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IteratorObject</code>, which 5.6 introduced along with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIterator</code> and the strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BuiltinIteratorReturn</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next().value</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | undefined</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. fromAsync:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.fromAsync</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T[]&gt;</code> and awaits elements one by one in order, which is different from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code>. In 6.0 the Set and iterator types moved to an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">es2025</code> lib, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fromAsync</code> is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">intersection</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set&lt;T &amp; U&gt;</code> but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">difference</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set&lt;T&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An element in an intersection is in both sets, so it has both types. A difference only removes elements from the first set, so it can never contain anything that is not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lib: ["ESNext"]</code> and it crashes in Safari. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The lib only changes compile-time declarations. TypeScript does not emit polyfills, so if the engine lacks the method the call fails at run time; add a polyfill such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">core-js</code> or check support.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">IteratorObject</code> and why was it added?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the type for objects that inherit from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Iterator.prototype</code>, so the helper methods can be declared once and shared by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIterator</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MapIterator</code>, generators and so on. The plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Iterator</code> interface is a protocol that hand-written objects also satisfy, and those do not have the helpers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I pass a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">set.union</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The parameter is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlySetLike&lt;U&gt;</code>, which needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keys</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> has all three and its keys are used.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get just the Set types without everything else in ESNext?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the single lib entry, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"lib": ["ES2022", "ESNext.Collection", "DOM"]</code>; on TypeScript 6.0, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ES2025</code> also covers them.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`lib\` option | The list of built-in declaration files the checker loads; defaults from \`target\` |
| \`esnext.*\` libs | Declarations for features not yet in a supported ECMAScript edition |
| Polyfill | Run-time code that adds a missing built-in; types never do this |
| Set-like object | Anything with \`size\`, \`has\` and \`keys\`; the argument type of the Set methods |
| \`IteratorObject<T, TReturn, TNext>\` | The 5.6 lib type for built-in iterators, where the iterator helpers live |
| \`BuiltinIteratorReturn\` / \`--strictBuiltinIteratorReturn\` | The 5.6 return type of built-in iterators, \`undefined\` instead of \`any\` under \`--strict\` |
| Async iterable | An object with \`[Symbol.asyncIterator]()\`, such as an \`async function*\` result |

**Conclusion:** The new Set methods, iterator helpers and \`Array.fromAsync\` are typed by lib files, not by the compiler's core, so getting them is a \`lib\` setting and using them safely is a run-time support question TypeScript does not answer for you. The signatures themselves are worth reading: \`union\` widens, \`intersection\` intersects, \`difference\` keeps its type, the argument only needs to be set-like, iterator helpers stay lazy and return \`IteratorObject\`, and \`fromAsync\` awaits in order. Know where each one lives (\`esnext\` in 5.x, partly \`es2025\` in 6.0) and you can enable exactly what your runtime supports.`,
    examples: [
      {
        label: `Set operations with the lib signatures (union, intersection, difference)`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// The shape the TypeScript 5.5+ lib accepts as "other": anything with size, has and keys.
interface SetLike<T> {
  readonly size: number;
  has(value: T): boolean;
  keys(): Iterator<T>;
}

// Userland versions with the same signatures as lib.esnext.collection (5.9.3).
function union<T, U>(a: ReadonlySet<T>, b: SetLike<U>): Set<T | U> {
  const out = new Set<T | U>(a);
  const it = b.keys();
  for (let r = it.next(); !r.done; r = it.next()) out.add(r.value);
  return out;
}
function intersection<T, U>(a: ReadonlySet<T>, b: SetLike<U>): Set<T & U> {
  const out = new Set<T & U>();
  for (const x of a) if (b.has(x as unknown as U)) out.add(x as T & U);
  return out;
}
function difference<T, U>(a: ReadonlySet<T>, b: SetLike<U>): Set<T> {
  const out = new Set<T>();
  for (const x of a) if (!b.has(x as unknown as U)) out.add(x);
  return out;
}
function isSubsetOf<T>(a: ReadonlySet<T>, b: SetLike<unknown>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

const ids = new Set([1, 2, 3]);
const mixed = new Set<number | string>(["x", 2]);

const u = union(ids, mixed);
const i = intersection(ids, mixed);
const d = difference(ids, mixed);
const c1: Equal<typeof u, Set<number | string>> = true;
const c2: Equal<typeof i, Set<number & (number | string)>> = true;
const c3: Equal<typeof d, Set<number>> = true;

// A Map is set-like (size, has, keys), so it is a valid "other"; its keys are used.
const prices = new Map([[3, "three"], [9, "nine"]]);
const viaMap = union(ids, prices);
const c4: Equal<typeof viaMap, Set<number>> = true;

// An array is not: it has no has() and no size.
// @ts-expect-error number[] is missing has and size
union(ids, [4, 5]);

console.log(JSON.stringify([...u]), JSON.stringify([...i]), JSON.stringify([...d]));
console.log(JSON.stringify([...viaMap]), isSubsetOf(new Set([1, 2]), ids), isSubsetOf(ids, prices));
console.log(c1, c2, c3, c4);`,
      },
      {
        label: `Lazy iterator helpers and a typed fromAsync`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Lazy helpers in the style of Iterator.prototype.map / filter / take (5.6+ lib types).
function* map<T, U>(src: Iterable<T>, f: (value: T, index: number) => U): Generator<U, undefined, unknown> {
  let i = 0;
  for (const x of src) yield f(x, i++);
  return undefined;
}
function filter<T, S extends T>(src: Iterable<T>, p: (value: T) => value is S): Generator<S, undefined, unknown>;
function filter<T>(src: Iterable<T>, p: (value: T) => unknown): Generator<T, undefined, unknown>;
function* filter<T>(src: Iterable<T>, p: (value: T) => unknown) {
  for (const x of src) if (p(x)) yield x;
  return undefined;
}
function* take<T>(src: Iterable<T>, limit: number): Generator<T, undefined, unknown> {
  if (limit <= 0) return undefined;
  let n = 0;
  for (const x of src) { yield x; if (++n >= limit) return undefined; }
  return undefined;
}

const log: string[] = [];
const pipeline = take(filter(map([1, 2, 3, 4, 5], (n) => { log.push("map " + n); return n * 10; }), (n) => n > 10), 2);
console.log("before consuming:", log.length);
console.log(JSON.stringify([...pipeline]), log.join(", "));

// 2. An infinite source is fine, because nothing runs until a value is pulled.
function* naturals() { let n = 1; while (true) yield n++; }
console.log(JSON.stringify([...take(map(naturals(), (n) => n * n), 4)]));

// 3. A predicate narrows, like the lib overload of Iterator filter.
const strs = [...filter(["a", 1, "b"], (x): x is string => typeof x === "string")];
const c1: Equal<typeof strs, string[]> = true;

// 4. A typed fromAsync: awaits each element in order, one at a time.
async function fromAsync<T>(src: AsyncIterable<T> | Iterable<T | PromiseLike<T>>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of src) out.push(x);
  return out;
}
const order: string[] = [];
async function* ticks(): AsyncGenerator<number> {
  for (const n of [1, 2, 3]) { order.push("yield " + n); yield n; }
}
async function main() {
  const p = fromAsync(ticks());
  const c2: Equal<typeof p, Promise<number[]>> = true;
  console.log(JSON.stringify(await p), order.join(", "));
  const mixedPromises = await fromAsync([Promise.resolve("p"), "q"]);
  const c3: Equal<typeof mixedPromises, string[]> = true;
  console.log(JSON.stringify(mixedPromises), c1, c2, c3);
}
main();`,
      },
    ],
  },
  {
    title: `How do you migrate a JavaScript codebase to TypeScript?`,
    difficulty: "medium",
    seoDescription: `Migrating JavaScript to TypeScript incrementally: allowJs, checkJs and JSDoc, declare module shims, a strictness ratchet, @ts-expect-error and CI checks.`,
    description: `**Question presented to candidate:**
"You join a team with a large JavaScript codebase that is still shipping features every week. They want to move to TypeScript. How would you plan and run that migration without stopping the team?"

**What a strong answer should cover:**
- Incremental, not big-bang: \`allowJs\` lets \`.js\` and \`.ts\` files live in one project, so files can be converted one at a time while the app keeps building
- Getting value before renaming: \`checkJs\` or per-file \`// @ts-check\` plus JSDoc types, and \`// @ts-nocheck\` to exclude a file for now
- Order of work: leaf modules and shared utilities first, types at the boundaries (API responses, config, \`JSON.parse\` results as \`unknown\`), \`@types/*\` or a \`declare module\` shim for untyped dependencies
- Strictness as a ratchet: start with what the team can pass, then enable \`strict\` (or its flags one by one), tracking escape hatches such as a \`TSFixMe\` alias and \`@ts-expect-error\` (not \`@ts-ignore\`)
- CI and tooling: run \`tsc --noEmit\` in CI because many bundlers only strip types; keep run-time behaviour unchanged during conversion
- What the conversion typically surfaces: missing arguments, possibly-undefined values, typos, string/number mix-ups; types are compile-time only, so validate external data at run time

**Clarifying questions expected:**
- How big is the codebase, how is it built and tested today, and is there a deadline?
- Which parts change most often or break most often?
- Is this an application or a library with external consumers who will need \`.d.ts\` files?

**Code / implementation expected:** Optional — a \`tsconfig.json\` for the mixed phase and one converted module.`,
    answer: `**Target Audience:** Developers and tech leads who need to move a working JavaScript codebase to TypeScript while the team keeps shipping.
**Difficulty:** Medium
**TypeScript version:** Every compiler message below was produced with TypeScript 5.4.5, both on the page's examples (\`--strict\`, target ES2022) and on a small mixed JavaScript/TypeScript project built with \`tsc -p\` and run with Node 22, step by step, as quoted.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

If you are new to what TypeScript adds in the first place, read [What is TypeScript and why use it over JavaScript?](/interview-question/what-is-typescript-and-why-use-it-over-javascript) first. This page is about the process.

## 1. Why This Even Matters — A Story First

Rewiring a house is easy if the house is empty. It is much harder when a family lives there, cooks dinner every evening, and cannot be without electricity for a month.

A good electrician works **room by room**. Old and new wiring coexist for a while, every room keeps working when the electrician goes home, and the most dangerous rooms (the kitchen) get attention first.

A JavaScript-to-TypeScript migration is the same job. The product must keep building and shipping every day. The plan is therefore never "stop and rewrite": it is a sequence of small, safe steps, each of which leaves the codebase working and a bit better checked than before.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big is the codebase and how is it built (webpack, Vite, plain Node)? | Decides how \`.ts\` files get compiled and whether a separate type-check step is needed. |
| Are there tests, and how good are they? | Tests are what prove that the conversion did not change behaviour. |
| Which modules change or break most often? | Converting those first returns the most value soonest. |
| Is it an application or a library with consumers? | A library also needs to publish declaration files. |
| Is there a deadline, or is it "alongside feature work"? | Decides between a tool-assisted bulk rename and a gradual file-by-file approach. |

## 3. The Mixed Phase: \`allowJs\`

The single most important setting is the one that lets old and new code coexist.

📌 **Interview term: \`allowJs\`** — a compiler option that lets \`.js\` files be part of a TypeScript project, so \`.ts\` files can import them and they are emitted alongside. It is what makes an incremental migration possible.

📌 **Interview term: \`checkJs\`** — a compiler option that also *type-checks* the included \`.js\` files, using inference and JSDoc comments. Per file, \`// @ts-check\` turns checking on and \`// @ts-nocheck\` turns it off.

A mixed-phase \`tsconfig.json\`, the one used for the experiment below:

~~~json
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "allowJs": true, "checkJs": false, "strict": true,
    "outDir": "dist", "skipLibCheck": true, "types": []
  },
  "include": ["src"]
}
~~~

\`strict\` is already on here: it applies fully to \`.ts\` files from day one, so every converted file is held to the final standard, while unchecked \`.js\` files are left alone.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 210" role="img" aria-label="Migration ladder: allowJs, then checkJs with JSDoc, then rename to ts, then strict everywhere">
  <rect class="d-box-muted" x="15" y="130" width="150" height="60" rx="10"/>
  <text class="d-text" x="90" y="157" text-anchor="middle">allowJs</text>
  <text class="d-sub" x="90" y="178" text-anchor="middle">js and ts together</text>
  <rect class="d-box" x="210" y="95" width="150" height="60" rx="10"/>
  <text class="d-text" x="285" y="122" text-anchor="middle">checkJs</text>
  <text class="d-sub" x="285" y="143" text-anchor="middle">JSDoc types</text>
  <rect class="d-box" x="405" y="60" width="150" height="60" rx="10"/>
  <text class="d-text" x="480" y="87" text-anchor="middle">rename</text>
  <text class="d-sub" x="480" y="108" text-anchor="middle">file by file to ts</text>
  <rect class="d-box-accent" x="600" y="25" width="150" height="60" rx="10"/>
  <text class="d-text" x="675" y="52" text-anchor="middle">strict</text>
  <text class="d-sub" x="675" y="73" text-anchor="middle">no escape hatches</text>
  <line class="d-edge" x1="165" y1="150" x2="208" y2="132"/>
  <line class="d-edge" x1="360" y1="115" x2="403" y2="97"/>
  <line class="d-edge-accent" x1="555" y1="80" x2="598" y2="62"/>
</svg>

Each step leaves the build green, so the team can stop at any rung and keep shipping.

## 4. The Steps, With What the Compiler Actually Said

A tiny project was built for this page: \`src/cart.js\` (JSDoc-typed, with \`// @ts-check\`), \`src/legacy.js\` (plain JavaScript), \`src/main.ts\`, and an untyped package \`legacy-lib\` in \`node_modules\`.

**Step 1: turn on \`allowJs\` and see what surfaces.** Two errors appeared. \`cart.js\` has \`// @ts-check\` and a JSDoc type, so the checker caught a string price; and the untyped dependency was reported (the absolute path is shortened here):

~~~text
src/cart.js(15,21): error TS2322: Type 'string' is not assignable to type 'number'.
src/main.ts(3,25): error TS7016: Could not find a declaration file for module 'legacy-lib'. '.../mig/node_modules/legacy-lib/index.js' implicitly has an 'any' type.
  Try \`npm i --save-dev @types/legacy-lib\` if it exists or add a new declaration (.d.ts) file containing \`declare module 'legacy-lib';\`
~~~

\`legacy.js\` called \`greet()\` with no argument and was **not** reported, because it has neither \`// @ts-check\` nor \`checkJs\`. The JSDoc that made \`cart.js\` checkable looks like this:

~~~js
// @ts-check
/** @typedef {{ sku: string, price: number, qty: number }} Item */

/**
 * @param {Item[]} items
 * @returns {number}
 */
export function total(items) { ... }
~~~

📌 **Interview term: JSDoc types** — type annotations written in \`/** ... */\` comments (\`@param\`, \`@returns\`, \`@typedef\`) that TypeScript reads in checked \`.js\` files, so you get checking without changing the file's syntax.

**Step 2: describe the untyped dependency.** First look for a community package (\`@types/legacy-lib\`); if there is none, write a small shim. With this file the project compiled cleanly:

~~~ts
// src/types/legacy-lib.d.ts
declare module "legacy-lib" {
  export function slugify(input: string): string;
}
~~~

📌 **Interview term: ambient module declaration** — a \`declare module "name" { ... }\` block in a \`.d.ts\` file that gives types to a module without implementation. The one-line form \`declare module "legacy-lib";\` types everything as \`any\`. See [declaration files](/interview-question/what-are-declaration-files-d-ts) and [the declare keyword](/interview-question/what-does-the-declare-keyword-do).

**Step 3: turn on \`checkJs\`.** Now plain \`legacy.js\` is checked too, and under \`strict\` its untyped parameter is reported:

~~~text
src/legacy.js(1,23): error TS7006: Parameter 'user' implicitly has an 'any' type.
~~~

A file the team is not ready for gets \`// @ts-nocheck\` on line 1; with it, the build was clean again. That is how you turn on \`checkJs\` globally without fixing everything on the same day.

**Step 4: rename \`legacy.js\` to \`legacy.ts\`.** In a \`.ts\` file, function parameters are required unless marked optional, so a second, real bug appears: the call with no argument.

~~~text
src/legacy.ts(1,23): error TS7006: Parameter 'user' implicitly has an 'any' type.
src/legacy.ts(4,1): error TS2554: Expected 1 arguments, but got 0.
~~~

**Step 5: add the types and fix the call.** The project compiled with no errors, and the emitted JavaScript ran with Node:

~~~text
6
Hi ADA hello-world
~~~

Run-time behaviour did not change; the conversion only added checks. That is the goal of every step.

## 5. Order of Work and the Strictness Ratchet

**What to convert first:**

1. **Shared utilities and leaf modules** (no imports of other project files): small, widely used, and their types then flow into every caller.
2. **Boundaries**: API clients, config loading, anything that calls \`JSON.parse\`. Type the data as \`unknown\` and check it once at the edge (example 2, and [working with JSON of unknown shape](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)).
3. **The modules that change or break most**, because that is where the checks pay back fastest.
4. **Everything else**, often opportunistically: "if you touch a file, convert it".

📌 **Interview term: strictness ratchet** — raising the compiler's strictness in steps that only move one way: once a flag (or a folder) passes, CI keeps it passing. Common ladders are \`noImplicitAny\` first, then \`strictNullChecks\`, then the rest of [\`strict\`](/interview-question/what-does-the-strict-flag-in-tsconfig-enable).

In the experiment, the same untyped file was clean without flags and reported TS7006 with \`--noImplicitAny\` alone or with \`--strict\`, which is why \`noImplicitAny\` is a natural first rung.

**Escape hatches, used honestly:**

- A named alias \`type TSFixMe = any\` instead of a bare \`any\`: same effect, but you can search for it and count it. Airbnb's [\`ts-migrate\`](https://www.npmjs.com/package/ts-migrate) tool uses exactly this placeholder, \`$TSFixMe\`, when it bulk-converts a project.
- \`// @ts-expect-error\` instead of \`// @ts-ignore\`: both silence the next line, but \`@ts-expect-error\` becomes an error itself once the problem is fixed, so suppressions cannot outlive their reason:

~~~text
main.ts(2,1): error TS2578: Unused '@ts-expect-error' directive.
~~~

📌 **Interview term: \`@ts-expect-error\`** — a comment directive that suppresses an error on the next line and fails with TS2578 if that line has no error. Prefer it over \`@ts-ignore\` during a migration.

**Bulk versus gradual.** Tool-assisted bulk conversion renames every file at once and inserts placeholders so it compiles; Airbnb reported converting a project of more than 50,000 lines in a day that way ([InfoQ](https://www.infoq.com/news/2020/08/airbnb-typescript-migration)). It trades one big, hard-to-review change for a long tail of \`$TSFixMe\` cleanups. Gradual file-by-file conversion is slower but each change is small and reviewable. Many teams combine them: bulk-rename a leaf folder, then tighten it.

## 6. Tooling and CI

- **Type-check separately from building.** Many build tools only remove type annotations without checking them; esbuild, for example, does no type checking and is meant to be run alongside \`tsc\` ([Modern Web guide](https://modern-web.dev/guides/test-runner/typescript/)). This page itself transpiles examples with \`ts.transpile\`, which does not type-check either. So CI needs a \`tsc --noEmit\` step, or type errors never fail a build.
- **Keep tests running on every step**, ideally unchanged, to prove that behaviour stayed the same.
- **Libraries** also need \`declaration: true\` so consumers get \`.d.ts\` files.

## 7. What the Conversion Surfaces

Example 1 is a cart module right after conversion, with each bug the types catch and what the plain JavaScript actually does. The string-price bug is the classic: in JavaScript, \`0 + "9.99" + "5"\` is not a sum.

~~~text
JS behaviour with string prices: 09.995
~~~

With the \`Item\` type, the same mistake is \`Type 'string' is not assignable to type 'number'.\`. The other findings are typical of every migration: a missing argument (TS2554), a \`find()\` result used without a check (\`'hit' is possibly 'undefined'.\`, which really crashes at run time), a property typo (TS2339), and an untyped leftover parameter (TS7006).

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(15,24): error TS2322: Type 'string' is not assignable to type 'number'.
main.ts(22,1): error TS2554: Expected 2 arguments, but got 1.
main.ts(29,15): error TS18048: 'hit' is possibly 'undefined'.
main.ts(37,20): error TS2339: Property 'quantity' does not exist on type 'Item'.
main.ts(41,23): error TS7006: Parameter 'value' implicitly has an 'any' type.
~~~

and for example 2:

~~~text
main.ts(25,9): error TS2322: Type 'unknown' is not assignable to type 'Settings'.
main.ts(47,16): error TS2353: Object literal may only specify known properties, and 'retry' does not exist in type 'FetchOptions'.
~~~

Example 1, the bugs a conversion finds, prints:

~~~text
JS behaviour with string prices: 09.995
TypeError at run time: true
safe: not found
$20.00 $18.00
undefined function
~~~

Example 2, migration escape hatches and boundaries, prints:

~~~text
42
8080
{"theme":"dark","fontSize":16}
{"theme":"light","fontSize":14}
/api x3
{"retries":2,"timeoutMs":500} {"retries":5,"timeoutMs":500}
~~~

\`TypeError at run time: true\` is the suppressed \`hit.price\` line actually crashing, caught so the program continues. \`undefined\` is the suppressed \`items[0].quantity\` read: JavaScript returns \`undefined\` for the typo instead of failing. The mixed-project steps in section 4 were run separately with \`tsc -p\` (5.4.5) and Node 22.22.0; their output is quoted there.

## Common Pitfalls

- **The big-bang rewrite.** Freezing features to "convert everything" rarely finishes; use \`allowJs\` and convert incrementally.
- **Turning off \`strict\` to make the first files pass.** New \`.ts\` files should meet the final standard from the start; ratchet the old code, not the new.
- **\`any\` everywhere.** It silences the checker and spreads into callers; use a searchable \`TSFixMe\` alias or, better, \`unknown\` at boundaries.
- **\`@ts-ignore\` instead of \`@ts-expect-error\`.** Ignored lines stay ignored forever, even after the bug is fixed.
- **No type check in CI.** If the bundler only strips types, errors never fail a build; add \`tsc --noEmit\`.
- **Trusting types for external data.** Types are erased; JSON from an API still needs a run-time check before it is treated as typed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Incremental, never a big-bang rewrite. I turn on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowJs</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.js</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> files live in one project, and convert file by file while features keep shipping.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Value before renaming:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkJs</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">// @ts-check</code> with JSDoc types gives checking on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.js</code> files immediately, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">// @ts-nocheck</code> excludes the files we are not ready for.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order of work:</strong> <span style="color:#f0e2c8;">Shared utilities and leaf modules first, then the boundaries: API responses and config typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> and validated once. Untyped dependencies get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@types/*</code> or a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module</code> shim.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The ratchet:</strong> <span style="color:#f0e2c8;">New <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> files are strict from day one; for old code I raise strictness in steps, usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noImplicitAny</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code>, and track escape hatches with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TSFixMe</code> alias and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ts-expect-error</code> rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ts-ignore</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Safety net:</strong> <span style="color:#f0e2c8;">CI runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --noEmit</code>, because most bundlers only strip types, and the existing tests prove that behaviour did not change. The conversion typically surfaces missing arguments, unchecked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and string-number mix-ups.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@ts-expect-error</code> rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@ts-ignore</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both suppress the next line, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ts-expect-error</code> fails with TS2578, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unused '@ts-expect-error' directive.</code>, once the error is gone, so suppressions are removed when they are no longer needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A dependency has no types. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@types/&lt;name&gt;</code> first. If there is none, write a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "name" { ... }</code> shim in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> file with just the functions we use; the one-line <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare module "name";</code> is a last resort because it makes everything <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you type-check JavaScript without renaming files?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkJs</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">// @ts-check</code> per file. Types come from inference and JSDoc comments such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@param</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@typedef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a codemod tool like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ts-migrate</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a large codebase with a deadline, yes: it renames files and inserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$TSFixMe</code> placeholders so everything compiles at once. The cost is a long tail of placeholders to clean up, so I track their count and reduce it over time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a successful migration make the app safe from bad API data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Types are erased at run time. Data from outside must be typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> and validated, with a type guard or a schema library, before the rest of the code treats it as typed.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`allowJs\` | Lets \`.js\` files be part of a TypeScript project, enabling a mixed codebase |
| \`checkJs\` | Also type-checks \`.js\` files; \`// @ts-check\` and \`// @ts-nocheck\` toggle it per file |
| JSDoc types | Types written in \`/** */\` comments that TypeScript reads in checked \`.js\` files |
| Ambient module declaration | \`declare module "name" { ... }\` in a \`.d.ts\`, typing a module without code |
| Strictness ratchet | Raising strictness in steps that CI never lets go backwards |
| \`@ts-expect-error\` | Suppresses the next line's error and fails with TS2578 if there is none |

**Conclusion:** Migrating JavaScript to TypeScript is a sequence of small, safe steps, not a rewrite: \`allowJs\` lets both languages coexist, \`checkJs\` and JSDoc give value before any rename, boundaries and shared utilities go first, and strictness rises like a ratchet with honest, trackable escape hatches. Keep the build green and the tests unchanged at every step, run \`tsc --noEmit\` in CI, and the codebase gets safer every week without the team ever stopping to ship.`,
    examples: [
      {
        label: `The bugs a conversion surfaces, and what plain JavaScript does`,
        code: `// A small cart module, right after renaming cart.js to cart.ts and adding types.
interface Item { sku: string; price: number; qty: number }

function subtotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// Bug 1, found by the types: a price that arrived as a string from a form.
const fromForm: any[] = [{ sku: "a1", price: "9.99", qty: 1 }, { sku: "b2", price: "5", qty: 2 }];
// any switches the checker off: this compiles, and the JS bug survives.
const looseSum = fromForm.reduce((s: any, i: any) => s + i.price, 0);
console.log("JS behaviour with string prices:", looseSum);
// With a real type, the same mistake is a compile error.
// @ts-expect-error price must be a number
subtotal([{ sku: "a1", price: "9.99", qty: 1 }]);

// Bug 2: a JS caller that forgot an argument. In .js files parameters are optional; in .ts they are not.
function applyDiscount(total: number, percent: number): number {
  return total * (1 - percent / 100);
}
// @ts-expect-error expected 2 arguments
applyDiscount(100);

// Bug 3: find() can return undefined; strictNullChecks makes you handle it.
const items: Item[] = [{ sku: "a1", price: 10, qty: 2 }];
const hit = items.find((i) => i.sku === "zz");
try {
  // @ts-expect-error hit is possibly undefined
  console.log(hit.price);
} catch (e) {
  console.log("TypeError at run time:", e instanceof TypeError);
}
console.log("safe:", hit?.price ?? "not found");

// Bug 4: a property typo that JS would silently read as undefined.
// @ts-expect-error qty, not quantity
const q = items[0].quantity;

// Bug 5: noImplicitAny (part of strict) flags untyped parameters left over from JS.
// @ts-expect-error parameter implicitly has an any type
function legacyFormat(value) { return "$" + value.toFixed(2); }

// The fixed, typed version.
function format(value: number): string { return "$" + value.toFixed(2); }
console.log(format(subtotal(items)), format(applyDiscount(subtotal(items), 10)));
console.log(String(q), typeof legacyFormat);`,
      },
      {
        label: `Escape hatches and boundaries: TSFixMe, unknown JSON, declare global`,
        code: `// Migration escape hatches, and why the safer ones are safer.

// 1. A named alias for "not typed yet": searchable, countable, removable later.
type TSFixMe = any;
function oldHelper(input: TSFixMe): TSFixMe { return input.value * 2; }
console.log(oldHelper({ value: 21 }));

// 2. @ts-expect-error vs @ts-ignore: both silence the next line,
// but expect-error itself becomes an error once the problem is fixed.
const port: number = Number("8080");
// @ts-ignore stays silently even though nothing is wrong here
const p2: number = port;
console.log(p2);

// 3. unknown at the boundary instead of any: data from JSON must be checked.
interface Settings { theme: "dark" | "light"; fontSize: number }
function isSettings(x: unknown): x is Settings {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (o.theme === "dark" || o.theme === "light") && typeof o.fontSize === "number";
}
function loadSettings(json: string): Settings {
  const data: unknown = JSON.parse(json);
  // @ts-expect-error unknown cannot be used as Settings without a check
  const unchecked: Settings = data;
  if (!isSettings(data)) return { theme: "light", fontSize: 14 };
  return data;
}
console.log(JSON.stringify(loadSettings('{"theme":"dark","fontSize":16}')));
console.log(JSON.stringify(loadSettings('{"theme":"blue"}')));

// 4. A global that an old script tag sets: describe it with declare global.
declare global {
  var legacyConfig: { apiUrl: string; retries: number } | undefined;
}
globalThis.legacyConfig = { apiUrl: "/api", retries: 3 };
const cfg = globalThis.legacyConfig;
console.log(cfg ? cfg.apiUrl + " x" + cfg.retries : "no config");

// 5. Typing a JS-style options bag with defaults, the common first conversion.
interface FetchOptions { retries?: number; timeoutMs?: number }
function withDefaults({ retries = 2, timeoutMs = 500 }: FetchOptions = {}): Required<FetchOptions> {
  return { retries, timeoutMs };
}
console.log(JSON.stringify(withDefaults()), JSON.stringify(withDefaults({ retries: 5 })));
// @ts-expect-error a typo in an option name is caught
withDefaults({ retry: 5 });`,
      },
    ],
  },
];

export default augments;
