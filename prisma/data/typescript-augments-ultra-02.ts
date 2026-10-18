/**
 * TYPESCRIPT ULTRA — batch 02: Everyday types (literal types, any vs unknown,
 * null and undefined, optional properties and chaining, function parameters). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are literal types?`,
    difficulty: "easy",
    seoDescription: `Literal types narrow a value to one exact string, number or boolean; unions of them model closed sets, and widening explains let versus const.`,
    description: `**Question presented to candidate:**
"What is a literal type in TypeScript? Show me where you would use one, and explain why \\\`const x = 'up'\\\` and \\\`let x = 'up'\\\` end up with different types."

**What a strong answer should cover:**
- A literal type is a type with exactly one value (\\\`"up"\\\`, \\\`42\\\`, \\\`true\\\`); a union of literals models a closed set of allowed values
- \\\`boolean\\\` is just \\\`true | false\\\`; string, number, boolean and bigint literals all exist
- Widening: \\\`const\\\` keeps the literal type, \\\`let\\\` and object-literal properties widen to \\\`string\\\` / \\\`number\\\`, which is the classic "string is not assignable to 'GET' | 'POST'" error
- The fixes: annotate with the union, use \\\`as const\\\`, or derive the union from a const array with \\\`(typeof ARR)[number]\\\`
- Comparing against a literal (\\\`===\\\`, \\\`switch\\\`) narrows the union, enabling exhaustiveness checks with \\\`never\\\`
- Literal types are erased: untrusted strings still need a run-time guard

**Code / implementation expected:** Yes — a function that accepts a literal union, a widening error and its fix.`,
    answer: `**Target Audience:** Beginners who know basic TypeScript types and want to model "only these exact values".
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A coffee machine has four buttons: espresso, latte, tea, hot water. There is no button that says "whatever drink you type in". If you could type any text, someone would eventually type "lattee" and the machine would do something strange.

Typing a parameter as \`string\` is the "type anything" keyboard. A **literal type** is the row of buttons: the checker only accepts the exact values you listed, and a typo like \`"lattee"\` is a compile error instead of a bug report.

## 2. What a Literal Type Is

Normally a type is a big set of values: \`string\` is every possible string, \`number\` every number. A literal type is a set with **one** value in it.

~~~ts
type Yes = "yes";   // only the string "yes"
type Answer = 42;    // only the number 42
type On = true;      // only the boolean true
~~~

📌 **Interview term: literal type** — a type whose only member is one specific string, number, boolean or bigint value. String literal types arrived in TypeScript 1.8 ([TypeScript 1.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-8.html)).

On its own a one-value type is rarely useful. The power comes from combining literals with \`|\`:

~~~ts
type Direction = "left" | "right" | "up" | "down";

function move(dir: Direction, steps: number): string {
  return "moved " + dir + " by " + steps;
}
move("left", 2);     // fine
move("forward", 1);  // error
~~~

~~~text
main.ts(19,18): error TS2345: Argument of type '"forward"' is not assignable to parameter of type 'Direction'.
~~~

📌 **Interview term: literal union** — a union of literal types, used as a closed set of allowed values (like an enum, but with no run-time code). Editors autocomplete the members, and a typo is an error. Unions in general are covered in [What are union and intersection types?](/interview-question/what-are-union-and-intersection-types)

Numbers and booleans work the same way: \`type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6\` rejects \`7\` with \`TS2322: Type '7' is not assignable to type 'DiceRoll'.\` And \`boolean\` itself is nothing more than the union \`true | false\` — the example proves it with a compile-time equality check.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The type string contains every string, the literal union Direction contains four strings, and the literal type up contains exactly one">
  <rect class="d-box-muted" x="20" y="20" width="600" height="190" rx="14"/>
  <text class="d-text" x="50" y="52">string</text>
  <text class="d-sub" x="50" y="74">every possible string</text>
  <rect class="d-box" x="240" y="60" width="360" height="125" rx="12"/>
  <text class="d-text" x="265" y="90">Direction</text>
  <text class="d-sub" x="265" y="112">left, right, up, down</text>
  <rect class="d-box-accent" x="440" y="100" width="140" height="60" rx="10"/>
  <text class="d-text" x="510" y="128" text-anchor="middle">up</text>
  <text class="d-sub" x="510" y="148" text-anchor="middle">one value</text>
</svg>

Think of types as sets nested inside each other: the literal \`"up"\` is inside \`Direction\`, which is inside \`string\`. A value can always move to a bigger set (\`"up"\` is assignable to \`string\`), never the other way round.

## 3. Widening: Why \`let\` and \`const\` Differ

TypeScript has to guess the type of a variable from its initial value (see [How does type inference work in TypeScript?](/interview-question/how-does-type-inference-work-in-typescript)). It guesses differently depending on whether the value can change:

~~~ts
const fixed = "up";       // type: "up"     (can never change)
let changeable = "up";    // type: string   (you might assign "down" or "banana" later)

move(fixed, 3);           // fine
move(changeable, 3);      // error
~~~

~~~text
main.ts(30,6): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Direction'.
~~~

📌 **Interview term: literal widening** — when the compiler infers a wider type (\`string\`) than the literal value (\`"up"\`) because the location is mutable. \`const\` bindings are not widened; \`let\`, \`var\` and **properties of object literals** are. The full story, including how to prevent it, is in [What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it)

The object case is the one that bites in real code, because the object itself is \`const\` but its properties are still mutable:

~~~ts
type Method = "GET" | "POST";
declare function request(url: string, method: Method): string;

const opts = { url: "/users", method: "GET" };   // method: string
request(opts.url, opts.method);                    // error TS2345
~~~

Three fixes, all shown in the second example:

| Fix | Code | Effect |
| :--- | :--- | :--- |
| Annotate | \`const opts: { url: string; method: Method } = ...\` | The declared type wins, no widening |
| \`as const\` | \`{ url: "/orders", method: "POST" } as const\` | Every property keeps its literal type and becomes \`readonly\` (see [What does as const do?](/interview-question/what-does-as-const-do)) |
| \`satisfies\` | \`{ ... } satisfies { method: Method }\` | Checks the shape and keeps the literals (see [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)) |

## 4. One Source of Truth: Deriving the Union From an Array

Often you need the allowed values **at run time too** (to render a dropdown or validate input). Writing them twice — once as a type, once as an array — drifts. Instead, declare the array \`as const\` and derive the type from it:

~~~ts
const STATUSES = ["idle", "loading", "done"] as const;
type Status = (typeof STATUSES)[number];   // "idle" | "loading" | "done"
~~~

📌 **Interview term: indexed access with number** — \`(typeof ARR)[number]\` means "the type of any element of this array". On a readonly tuple of literals it produces the union of those literals. More in [What are indexed access types?](/interview-question/what-are-indexed-access-types)

## 5. Narrowing on Literals

Because each member is a single value, comparing with \`===\` or a \`switch\` tells TypeScript exactly which member you have. After all cases are handled, the leftover type is \`never\`, which is how exhaustiveness checks work:

~~~ts
function label(s: Status): string {
  switch (s) {
    case "idle": return "waiting";
    case "loading": return "spinner";
    case "done": return "finished";
    default: {
      const unreachable: never = s;   // compile error if a status is added and not handled
      return unreachable;
    }
  }
}
~~~

This is the foundation of [What is a discriminated union?](/interview-question/what-is-a-discriminated-union) and [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)

## 6. Literal Types Are Erased

A literal type is a compile-time promise only. The first example calls \`move("forward", 1)\` behind a \`@ts-expect-error\` and JavaScript happily prints \`moved forward by 1\`. Data from a form, URL or JSON is just \`string\`; to get a \`Status\` out of it you need a run-time check, such as the \`isStatus\` type guard in the second example, which rejects \`"crashed"\`.

Related: literal types can be built from other literals with template syntax (for example \`on\${Capitalize<E>}\` written between backticks), covered in [What are template literal types?](/interview-question/what-are-template-literal-types)

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is an error the compiler really reports — and run the way the page runs them.

Example 1, literal types, unions and \`const\` vs \`let\`:

~~~text
moved left by 2
moved forward by 1
true true
moved up by 3
5
true yes 42 true
~~~

The compiler errors for the three \`@ts-expect-error\` lines, with the directives removed:

~~~text
main.ts(19,18): error TS2345: Argument of type '"forward"' is not assignable to parameter of type 'Direction'.
main.ts(30,6): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Direction'.
main.ts(40,7): error TS2322: Type '7' is not assignable to type 'DiceRoll'.
~~~

Example 2, object widening, \`as const\`, deriving and narrowing:

~~~text
GET /users
POST /orders
true true
true idle,loading,done
waiting | spinner | finished
done finished
crashed rejected
~~~

What the run proves:

- \`moved forward by 1\` — the literal type stopped nothing at run time; it only caught the call at compile time.
- \`true true\` lines are compile-time equality checks: \`const\` kept \`"up"\`, \`let\` widened to \`string\`, \`as const\` kept \`"POST"\`, and the derived \`Status\` is exactly the three literals.
- \`crashed rejected\` — only the run-time guard protects against an unexpected string.

## Common Pitfalls

- **Expecting an object property to keep its literal.** \`{ method: "GET" }\` is \`{ method: string }\`. Annotate, use \`as const\` or \`satisfies\`.
- **Writing the list twice.** A \`type Status = ...\` and a separate \`const STATUSES = [...]\` drift apart. Derive one from the other.
- **Trusting input to be a literal.** \`req.query.sort as "asc" | "desc"\` is a lie the compiler believes. Check it with a guard.
- **Reaching for \`enum\` by habit.** A literal union gives the same safety with no emitted code; see [What are enums and what are their trade-offs?](/interview-question/what-are-enums-and-what-are-their-trade-offs)
- **Forgetting \`let\` widens.** \`let mode = "dark"\` cannot be passed where \`"dark" | "light"\` is required; annotate it (\`let mode: Theme = "dark"\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">literal type</strong> is a type with exactly one value, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"up"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">42</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Main use:</strong> <span style="color:#f0e2c8;">Unions of literals model a closed set — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Method = "GET" | "POST"</code> — so typos are compile errors and editors autocomplete the options. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code> itself is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true | false</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Widening:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const x = "up"</code> keeps the literal; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> and object-literal properties widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ method: "GET" }</code> fails against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Method</code>; fix it with an annotation, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Narrowing:</strong> <span style="color:#f0e2c8;">Comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch</code> narrows the union, and once every member is handled the remainder is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>, which gives exhaustiveness checks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Literal types are erased. For values from outside, derive the union from a const array and check membership at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Literal union or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">enum</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A literal union has zero run-time cost, works with plain strings from JSON, and is what most modern codebases prefer. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enum</code> emits an object, which is useful only if you need to iterate over it at run time, and even that is easier with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let x = "a"</code> become <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code> but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const x = "a"</code> stay <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"a"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> can never be reassigned, so the narrowest type is safe. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> might be assigned another string later, so TypeScript widens it. Annotate the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> if you want the narrow type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the union from an array of values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> and index it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Status = (typeof STATUSES)[number]</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> the array is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code> and the result is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"up"</code> assignable to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code>? Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code> assignable to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"up"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first yes, the second no. A literal type is a subtype of its primitive; going the other way needs narrowing or an assertion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What other literal types exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">String, number, boolean and bigint literals (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10n</code>), plus template literal types built from them, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">item-\${number}</code> written between backticks.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Literal type | A type with exactly one member value, such as \`"up"\` or \`42\` |
| Literal union | A union of literal types used as a closed set of allowed values |
| Literal widening | Inferring \`string\`/\`number\` instead of the literal for mutable locations (\`let\`, object properties) |
| Indexed access with number | \`(typeof ARR)[number]\`: the type of any element of an array or tuple |

**Conclusion:** A literal type narrows a primitive down to one exact value, and a union of literals turns "any string" into a short, checked menu. Most of the interview interest is in widening: \`const\` keeps the literal, \`let\` and object properties do not, and \`as const\`, an annotation or \`satisfies\` bring it back. Pair literal unions with narrowing for exhaustive switches, and with a run-time guard wherever the value comes from outside the program.`,
    examples: [
      {
        label: `Literal types, literal unions and const vs let`,
        code: `// Compile-time equality check: assigning true only compiles if A and B are the same type.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A literal type is a type with exactly one value.
type Yes = "yes";
type Answer = 42;
type On = true;

// A union of literals is a closed set of allowed values.
type Direction = "left" | "right" | "up" | "down";

function move(dir: Direction, steps: number): string {
  return "moved " + dir + " by " + steps;
}

console.log(move("left", 2)); // moved left by 2

// @ts-expect-error Argument of type '"forward"' is not assignable to parameter of type 'Direction'.
console.log(move("forward", 1)); // moved forward by 1

// const keeps the literal type, let widens it to string.
const fixed = "up";
let changeable = "up";
const okFixed: Equal<typeof fixed, "up"> = true;
const okChangeable: Equal<typeof changeable, string> = true;
console.log(okFixed, okChangeable);

console.log(move(fixed, 3)); // moved up by 3
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'Direction'.
move(changeable, 3);

// Number and boolean literals work the same way.
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
function roll(seed: number): DiceRoll {
  return ((seed % 6) + 1) as DiceRoll;
}
console.log(roll(10)); // 5

// @ts-expect-error Type '7' is not assignable to type 'DiceRoll'.
const impossible: DiceRoll = 7;

// boolean itself is just the union true | false.
const okBool: Equal<boolean, true | false> = true;
const yes: Yes = "yes";
const answer: Answer = 42;
const on: On = true;
console.log(okBool, yes, answer, on);`,
      },
      {
        label: `Object widening, as const, deriving a union and narrowing`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Method = "GET" | "POST";
function request(url: string, method: Method): string {
  return method + " " + url;
}

// The classic trap: properties of an object literal are widened.
const opts = { url: "/users", method: "GET" };
const widened: Equal<typeof opts.method, string> = true;
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'Method'.
request(opts.url, opts.method);

// Fix 1: annotate the object with a type that has the literal union.
const typed: { url: string; method: Method } = { url: "/users", method: "GET" };
console.log(request(typed.url, typed.method)); // GET /users

// Fix 2: as const keeps every literal and makes the properties readonly.
const frozen = { url: "/orders", method: "POST" } as const;
const kept: Equal<typeof frozen.method, "POST"> = true;
console.log(request(frozen.url, frozen.method)); // POST /orders
console.log(widened, kept);

// One source of truth: derive the union from a runtime array.
const STATUSES = ["idle", "loading", "done"] as const;
type Status = (typeof STATUSES)[number];
const derived: Equal<Status, "idle" | "loading" | "done"> = true;
console.log(derived, STATUSES.join(","));

// Comparing against a literal narrows the union in each branch.
function label(s: Status): string {
  switch (s) {
    case "idle":
      return "waiting";
    case "loading":
      return "spinner";
    case "done":
      return "finished";
    default: {
      // Every literal is handled, so s has type never here.
      const unreachable: never = s;
      return unreachable;
    }
  }
}
console.log(STATUSES.map(label).join(" | ")); // waiting | spinner | finished

// A run-time guard turns an unchecked string into the literal union.
function isStatus(x: string): x is Status {
  return (STATUSES as readonly string[]).includes(x);
}
for (const input of ["done", "crashed"]) {
  console.log(input, isStatus(input) ? label(input) : "rejected");
}`,
      },
    ],
  },
  {
    title: `What is the difference between any and unknown?`,
    difficulty: "easy",
    seoDescription: `any turns type checking off; unknown accepts any value but must be narrowed before use. Assignability, contagion, catch variables and JSON.`,
    description: `**Question presented to candidate:**
"Both \\\`any\\\` and \\\`unknown\\\` can hold any value. So what is the difference, and which one would you use for the result of \\\`JSON.parse\\\` or for a caught error?"

**What a strong answer should cover:**
- Both are top types for assignment: every value can be assigned to either
- \\\`any\\\` disables checking: every property access, call and assignment compiles, and it is contagious (whatever you read from it is \\\`any\\\` too)
- \\\`unknown\\\` is the safe top type (added in TypeScript 3.0): you must narrow it with \\\`typeof\\\`, \\\`instanceof\\\`, \\\`Array.isArray\\\`, \\\`in\\\` or a type guard before using it, and it is assignable only to \\\`unknown\\\` and \\\`any\\\`
- Practical uses: \\\`unknown\\\` for untrusted input (\\\`JSON.parse\\\`, network data, catch variables under \\\`strict\\\`), \\\`any\\\` only as a temporary migration escape hatch
- Type algebra: \\\`unknown | T\\\` is \\\`unknown\\\`, \\\`unknown & T\\\` is \\\`T\\\`, \\\`keyof unknown\\\` is \\\`never\\\`

**Code / implementation expected:** Yes — the same operation on \\\`any\\\` and \\\`unknown\\\`, and a narrowing function that accepts \\\`unknown\\\`.`,
    answer: `**Target Audience:** Beginners who have seen \`any\` everywhere and want to know why reviewers keep asking for \`unknown\`.
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`); the history of \`unknown\` checked against the release notes linked inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A parcel arrives with no label. Two ways to deal with it:

- **The \`any\` way:** assume it is whatever you hoped for. "It is probably the new phone" — you plug it in, and it turns out to be a jar of honey.
- **The \`unknown\` way:** accept the parcel, but open it and look before you use it. Shake it, read the contents, then decide.

Both let the parcel into the house. The difference is whether you are **allowed to use it** before checking. \`any\` says yes, always. \`unknown\` says not until you have looked.

## 2. Two Top Types, Opposite Attitudes

📌 **Interview term: top type** — a type that every value is assignable to. In TypeScript both \`any\` and \`unknown\` are top types: \`const a: any = x\` and \`const u: unknown = x\` compile for any \`x\`.

📌 **Interview term: \`any\`** — the escape hatch that switches type checking off for a value. Any property access, call, arithmetic or assignment on it compiles, and the value is assignable to every other type.

📌 **Interview term: \`unknown\`** — the type-safe top type, added in TypeScript 3.0: "anything is assignable to \`unknown\`, but \`unknown\` isn't assignable to anything but itself and \`any\` without a type assertion or a control flow based narrowing" ([TypeScript 3.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html)).

The same mistake, written both ways:

~~~ts
const a: any = "hello";
a.toFixed(2);          // compiles, then crashes: a string has no toFixed

const u: unknown = "hello";
u.toUpperCase();       // compile error
if (typeof u === "string") {
  u.toUpperCase();     // fine: u is string in this block
}
~~~

~~~text
main.ts(14,1): error TS18046: 'u' is of type 'unknown'.
~~~

And at run time the \`any\` line gives \`TypeError: a.toFixed is not a function\` — the error \`unknown\` would have caught at compile time.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="unknown sits at the top of the type hierarchy above string, number and object types, never sits at the bottom, and any sits outside the hierarchy with checking switched off">
  <defs>
    <marker id="ts02q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="270" y="46" text-anchor="middle">unknown</text>
  <text class="d-sub" x="270" y="66" text-anchor="middle">top: holds anything</text>
  <rect class="d-box" x="20" y="140" width="140" height="56" rx="10"/>
  <text class="d-text" x="90" y="173" text-anchor="middle">string</text>
  <rect class="d-box" x="200" y="140" width="140" height="56" rx="10"/>
  <text class="d-text" x="270" y="173" text-anchor="middle">number</text>
  <rect class="d-box" x="380" y="140" width="140" height="56" rx="10"/>
  <text class="d-text" x="450" y="173" text-anchor="middle">User</text>
  <rect class="d-box-muted" x="170" y="255" width="200" height="60" rx="10"/>
  <text class="d-text" x="270" y="281" text-anchor="middle">never</text>
  <text class="d-sub" x="270" y="301" text-anchor="middle">bottom: holds nothing</text>
  <path class="d-edge" d="M 100 136 L 220 84" marker-end="url(#ts02q2-arrow)"/>
  <path class="d-edge" d="M 270 136 L 270 86" marker-end="url(#ts02q2-arrow)"/>
  <path class="d-edge" d="M 440 136 L 320 84" marker-end="url(#ts02q2-arrow)"/>
  <path class="d-edge" d="M 220 251 L 100 200" marker-end="url(#ts02q2-arrow)"/>
  <path class="d-edge" d="M 270 251 L 270 200" marker-end="url(#ts02q2-arrow)"/>
  <path class="d-edge" d="M 320 251 L 440 200" marker-end="url(#ts02q2-arrow)"/>
  <rect class="d-box-muted" x="560" y="130" width="105" height="76" rx="10"/>
  <text class="d-text" x="612" y="162" text-anchor="middle">any</text>
  <text class="d-sub" x="612" y="184" text-anchor="middle">checks off</text>
</svg>

Arrows point from a type to a type it is assignable to. Every type flows **up** into \`unknown\`; \`never\` flows into every type ([What is the never type?](/interview-question/what-is-the-never-type)). \`any\` sits outside the picture: it behaves as top **and** bottom at once — anything goes in, and it goes out into anything — which is exactly why it is unsafe.

## 3. Getting a Value Out of \`unknown\`: Narrowing

To use an \`unknown\`, prove what it is. Every narrowing tool works (the full list is in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)):

~~~ts
function describe(value: unknown): string {
  if (typeof value === "string") return "string of length " + value.length;
  if (typeof value === "number") return "number " + value.toFixed(1);
  if (Array.isArray(value)) return "array of " + value.length;
  if (value instanceof Date) return "date in " + value.getUTCFullYear();
  if (value === null) return "null";
  if (typeof value === "object") return "object with keys " + Object.keys(value).join(",");
  return "something else: " + typeof value;
}
~~~

Note the \`value === null\` check before \`typeof value === "object"\`: \`typeof null\` is \`"object"\` in JavaScript, and TypeScript models that — after the \`typeof\` check alone, \`value\` is \`object | null\`.

📌 **Interview term: narrowing** — the compiler refining a wide type to a narrower one inside a branch, based on a run-time check it understands.

## 4. Why \`any\` Is Contagious

Reading a property of \`any\` gives \`any\`, calling it gives \`any\`, and so on. One \`any\` at the top of a chain silently switches off checking for everything derived from it:

~~~ts
const config: any = { db: { port: "5432" } };
const port = config.db.port;   // any
port + 1;                      // "54321": string concatenation, no warning
~~~

📌 **Interview term: contagious \`any\`** — \`any\` spreading through property reads, calls and inferred variables, so code far from the original \`any\` loses checking without anyone writing \`any\` there.

## 5. Where Each One Belongs

| Situation | Use | Why |
| :--- | :--- | :--- |
| \`JSON.parse\`, \`fetch().json()\`, \`postMessage\` data | \`unknown\` | Outside data must be validated; see [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape) |
| A \`catch (err)\` variable | \`unknown\` (the default under \`strict\`) | Anything can be thrown, including strings |
| A generic container that just stores and returns values | a generic \`T\` | Better than both: keeps the real type ([What are generics and why are they useful?](/interview-question/what-are-generics-and-why-are-they-useful)) |
| Migrating JavaScript file by file | \`any\`, temporarily | Gets the build green; track and remove later ([How do you migrate a JavaScript codebase to TypeScript?](/interview-question/how-do-you-migrate-a-javascript-codebase-to-typescript)) |
| Untyped third-party code with no \`@types\` | a small \`declare\` with real types, or \`unknown\` | Contains the uncertainty in one place |

Catch variables: since TypeScript 4.4, \`useUnknownInCatchVariables\` (part of \`strict\`) types \`catch (err)\` as \`unknown\` instead of \`any\` ([TypeScript 4.4 RC announcement](https://devblogs.microsoft.com/typescript/?p=3042)). So \`err.message\` is an error and you write \`err instanceof Error ? err.message : String(err)\`. The second example throws both a \`RangeError\` and a plain string to show why that check is needed. More in [What does the 'strict' flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable)

## 6. Type Algebra (a Favourite Follow-Up)

All of these are checked at compile time in the second example:

| Expression | Result | Reason |
| :--- | :--- | :--- |
| \`unknown \\| string\` | \`unknown\` | The top type absorbs every union member |
| \`unknown & string\` | \`string\` | Intersecting with "anything" changes nothing |
| \`any \\| string\` | \`any\` | \`any\` absorbs everything |
| \`keyof unknown\` | \`never\` | No key is known to exist on an arbitrary value |
| \`keyof any\` | \`string \\| number \\| symbol\` | Any key could exist |

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is an error the compiler really reports — and run the way the page runs them.

Example 1, \`any\` vs \`unknown\` and narrowing:

~~~text
HELLO
TypeError: a.toFixed is not a function
HELLO
hello hello hello
string of length 2
number 3.1
array of 3
date in 2024
null
object with keys id,name
something else: undefined
~~~

Compiler errors with the directives removed:

~~~text
main.ts(14,1): error TS18046: 'u' is of type 'unknown'.
main.ts(24,7): error TS2322: Type 'unknown' is not assignable to type 'string'.
~~~

Example 2, type algebra, contagious \`any\`, \`JSON.parse\` and catch variables:

~~~text
true true true true true
true 54321
port + 1 = 8081
invalid settings {"port": "8080"}
RangeError -> too big: 5
thrown value: negative
~~~

~~~text
main.ts(39,5): error TS18046: 'err' is of type 'unknown'.
~~~

What the run proves:

- The \`any\` call compiled and crashed; the same call on \`unknown\` did not compile.
- \`54321\` — a value read from \`any\` was inferred as \`any\` (the \`true\` before it), so string concatenation went unnoticed.
- Storing \`JSON.parse\` output as \`unknown\` plus a guard rejected \`{"port": "8080"}\`, where an \`any\` would have let \`"8080" + 1\` through.
- A thrown string has no \`message\`; the \`instanceof Error\` check handled both cases.

## Common Pitfalls

- **Using \`any\` to silence an error.** It removes the error and every future error on that value and everything derived from it. Use \`unknown\` plus narrowing, or fix the type.
- **Casting \`unknown\` straight to the type you want.** \`data as User\` compiles but checks nothing; it is \`any\` with extra steps. Validate first (see [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)).
- **Forgetting \`typeof null === "object"\`.** Check \`!== null\` before treating an \`unknown\` as an object.
- **Implicit \`any\`.** An unannotated parameter is \`any\` unless \`noImplicitAny\` (part of \`strict\`) is on.
- **Assuming \`catch (err)\` is an \`Error\`.** Code can throw strings, numbers or objects; narrow with \`instanceof Error\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shared part:</strong> <span style="color:#f0e2c8;">Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> are <strong style="color:#ffca28;">top types</strong>: any value can be assigned to either.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. any:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> turns checking off. Everything compiles — property access, calls, assignment to any type — and it is contagious, so values derived from it are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. unknown:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> is the safe version, added in TypeScript 3.0. You cannot use it, or assign it to a specific type, until you <strong style="color:#ffca28;">narrow</strong> it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.isArray</code> or a type guard.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where to use:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> for anything from outside the program: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code> results, API responses, and catch variables, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> already types as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">Prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> or a generic; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> for short-term migration and isolate it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as User</code> on an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> value safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. An assertion checks nothing at run time; it only tells the compiler to trust you. Validate the shape with a type guard or a schema library, then the type is true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown | string</code>? And <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown &amp; string</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown | string</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>, because the top type absorbs the union. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown &amp; string</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, because intersecting with "anything" adds no constraint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">catch</code> variable <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript can throw any value, not just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Error</code> objects. Since 4.4, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useUnknownInCatchVariables</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> turns on, types it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> so you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof Error</code> before reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">object</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{}</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> excludes primitives and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> excludes only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> includes everything, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so you must narrow it before any use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">During a JavaScript migration, in a quick prototype, or deep inside a well-tested utility where the types are hard to express, ideally with a comment and a lint rule such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-explicit-any</code> to keep it visible.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Top type | A type every value is assignable to; both \`any\` and \`unknown\` are top types |
| \`any\` | Switches type checking off for a value; assignable to and from everything |
| \`unknown\` | Safe top type: holds anything, usable only after narrowing |
| Narrowing | Refining a type inside a branch based on a run-time check |
| Contagious \`any\` | \`any\` spreading through reads and calls to every derived value |

**Conclusion:** \`any\` and \`unknown\` both accept every value, but \`any\` also lets you do anything with it, while \`unknown\` makes you prove what it is first. That one difference turns run-time crashes into compile errors. Reach for \`unknown\` at every boundary where data comes from outside — JSON, the network, \`catch\` — narrow it with real checks, and treat \`any\` as a temporary, visible exception.`,
    examples: [
      {
        label: `any compiles anything, unknown must be narrowed`,
        code: `// any switches the checker off: every operation compiles.
const a: any = "hello";
console.log(a.toUpperCase()); // HELLO
try {
  // Compiles fine, crashes at run time: a string has no toFixed method.
  a.toFixed(2);
} catch (err) {
  console.log(String(err));
}

// unknown accepts any value too, but you cannot use it until you narrow it.
const u: unknown = "hello";
// @ts-expect-error 'u' is of type 'unknown'.
u.toUpperCase();

// Narrowing with typeof unlocks the string methods.
if (typeof u === "string") {
  console.log(u.toUpperCase()); // HELLO
}

// Assignability: any flows into every type, unknown flows into almost none.
const s1: string = a;
// @ts-expect-error Type 'unknown' is not assignable to type 'string'.
const s2: string = u;
const ok1: unknown = u;
const ok2: any = u;
console.log(s1, ok1, ok2);

// One function, every kind of input, safely narrowed.
function describe(value: unknown): string {
  if (typeof value === "string") return "string of length " + value.length;
  if (typeof value === "number") return "number " + value.toFixed(1);
  if (Array.isArray(value)) return "array of " + value.length;
  if (value instanceof Date) return "date in " + value.getUTCFullYear();
  if (value === null) return "null";
  if (typeof value === "object") return "object with keys " + Object.keys(value).join(",");
  return "something else: " + typeof value;
}

const inputs: unknown[] = ["hi", 3.14159, [1, 2, 3], new Date(Date.UTC(2024, 0, 1)), null, { id: 1, name: "Ada" }, undefined];
for (const v of inputs) console.log(describe(v));`,
      },
      {
        label: `Type algebra, contagious any, JSON.parse and catch variables`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// How the two behave in type algebra.
const t1: Equal<unknown | string, unknown> = true; // unknown absorbs unions
const t2: Equal<unknown & string, string> = true; // and disappears in intersections
const t3: Equal<any | string, any> = true; // any absorbs everything
const t4: Equal<keyof unknown, never> = true; // you cannot index unknown
const t5: Equal<keyof any, string | number | symbol> = true;
console.log(t1, t2, t3, t4, t5);

// any is contagious: everything you read from it is any as well.
const config: any = { db: { port: "5432" } };
const port = config.db.port;
const contagious: Equal<typeof port, any> = true;
// The checker cannot warn: this is string concatenation, not addition.
console.log(contagious, port + 1);

// JSON.parse returns any. Store the result as unknown and check it.
type Settings = { port: number };
function isSettings(x: unknown): x is Settings {
  return typeof x === "object" && x !== null && typeof (x as { port?: unknown }).port === "number";
}
for (const text of ['{"port": 8080}', '{"port": "8080"}']) {
  const data: unknown = JSON.parse(text);
  console.log(isSettings(data) ? "port + 1 = " + (data.port + 1) : "invalid settings " + text);
}

// Under strict, a catch variable is unknown (useUnknownInCatchVariables).
function risky(n: number): void {
  if (n > 1) throw new RangeError("too big: " + n);
  // Anything can be thrown, not only Error objects.
  if (n < 0) throw "negative";
}
for (const n of [5, -1]) {
  try {
    risky(n);
  } catch (err) {
    // @ts-expect-error 'err' is of type 'unknown'.
    err.message;
    console.log(err instanceof Error ? err.name + " -> " + err.message : "thrown value: " + String(err));
  }
}`,
      },
    ],
  },
  {
    title: `How does TypeScript handle null and undefined safely?`,
    difficulty: "easy",
    seoDescription: `strictNullChecks makes null and undefined explicit; narrowing, == null, ?? versus ||, ?. and the ! assertion keep missing values safe.`,
    description: `**Question presented to candidate:**
"Null reference errors are one of the most common JavaScript crashes. How does TypeScript help you avoid them, and which operators and patterns do you use day to day to handle values that might be missing?"

**What a strong answer should cover:**
- \\\`strictNullChecks\\\` (part of \\\`strict\\\`, since TypeScript 2.0) takes \\\`null\\\` and \\\`undefined\\\` out of every type, so "may be missing" must be written as \\\`T | null\\\` or \\\`T | undefined\\\`
- Narrowing removes them: \\\`!== null\\\`, \\\`== null\\\` (matches both null and undefined), truthiness checks (and their trap with \\\`0\\\` and \\\`""\\\`), early returns
- Operators: \\\`??\\\` falls back only on null/undefined, unlike \\\`||\\\`; \\\`?.\\\` short-circuits to \\\`undefined\\\`
- Library signatures that can miss: \\\`Array.prototype.find\\\`, \\\`Map.get\\\`, and \\\`NonNullable<T>\\\`
- The non-null assertion \\\`!\\\` only silences the compiler and does no run-time check
- Narrowing limits: callbacks over a reassigned \\\`let\\\`, and \\\`filter\\\` needing an explicit type predicate before TypeScript 5.5

**Code / implementation expected:** Yes — a function returning \\\`T | null\\\`, the compiler error when it is used unchecked, and the \\\`??\\\` versus \\\`||\\\` difference.`,
    answer: `**Target Audience:** Beginners who have met "Cannot read properties of undefined" and want the compiler to catch it first.
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`); version history checked against the release notes linked inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Tony Hoare, who invented the null reference in 1965, later called it his "billion-dollar mistake" (in a 2009 QCon London talk, [Null References: The Billion Dollar Mistake](https://qconlondon.com/london-2009/qconlondon.com/london-2009/presentation/Null%2BReferences_%2BThe%2BBillion%2BDollar%2BMistake.html)). The trouble is not that "no value" exists — real programs need it — but that **nothing tells you** which variables might hold it. Every \`user.name\` is a small gamble.

Imagine a hotel where some room keys are blank cards that open nothing. If blank cards looked exactly like real keys, guests would find out only at the door. TypeScript with \`strictNullChecks\` prints "MAY BE BLANK" on those cards. You can still have them, but you cannot use one on a door until you have checked it.

## 2. strictNullChecks: Making "Missing" Visible

JavaScript has two "no value" values:

📌 **Interview term: \`undefined\`** — "never set": a missing property, a parameter that was not passed, a function with no \`return\`, a failed \`find\`.

📌 **Interview term: \`null\`** — "deliberately empty", set by a program or an API (\`document.querySelector\` returning no element, a database column with no value).

📌 **Interview term: \`strictNullChecks\`** — the compiler option, added in TypeScript 2.0 ([TypeScript 2.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html)) and included in \`strict\`, under which \`null\` and \`undefined\` are **not** members of other types. \`string\` means a real string; "a string or nothing" must be written \`string | null\` or \`string | undefined\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Without strictNullChecks null hides inside every type; with it, null and undefined are separate types you must add with a union">
  <rect class="d-box-muted" x="20" y="20" width="290" height="190" rx="12"/>
  <text class="d-text" x="165" y="50" text-anchor="middle">strictNullChecks off</text>
  <rect class="d-box" x="60" y="95" width="210" height="80" rx="10"/>
  <text class="d-text" x="165" y="127" text-anchor="middle">string</text>
  <text class="d-sub" x="165" y="151" text-anchor="middle">secretly includes null</text>
  <rect class="d-box-muted" x="370" y="20" width="290" height="190" rx="12"/>
  <text class="d-text" x="515" y="50" text-anchor="middle">strictNullChecks on</text>
  <rect class="d-box-accent" x="395" y="95" width="110" height="80" rx="10"/>
  <text class="d-text" x="450" y="140" text-anchor="middle">string</text>
  <rect class="d-box" x="545" y="95" width="90" height="80" rx="10"/>
  <text class="d-text" x="590" y="129" text-anchor="middle">null</text>
  <text class="d-sub" x="590" y="153" text-anchor="middle">separate</text>
</svg>

With the flag off, the checker accepts \`const n: string = null\` and every \`n.length\` is a possible crash it will not mention. With it on:

~~~ts
const name1: string = null;   // error

function findNickname(id: number): string | null {
  return id === 1 ? "Ace" : null;
}
const nick = findNickname(2);
nick.toUpperCase();           // error
~~~

~~~text
main.ts(3,7): error TS2322: Type 'null' is not assignable to type 'string'.
main.ts(14,3): error TS18047: 'nick' is possibly 'null'.
~~~

The run proves the second error was a real crash: \`TypeError: Cannot read properties of null (reading 'toUpperCase')\` (that wording is from V8, the engine in Chrome and Node.js).

## 3. Narrowing Away null and undefined

Once a value is \`T | null\`, any check the compiler understands removes \`null\` inside the branch (the general mechanism is in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)):

| Check | Removes | Watch out |
| :--- | :--- | :--- |
| \`x !== null\` | \`null\` only | \`undefined\` stays if it was in the type |
| \`x !== undefined\` | \`undefined\` only | \`null\` stays |
| \`x != null\` | **both** \`null\` and \`undefined\` | The one place loose equality is idiomatic |
| \`if (x)\` | both, **plus** \`0\`, \`""\`, \`false\`, \`NaN\` | Wrong for numbers and strings where empty is valid |
| early \`return\` / \`throw\` | whatever was checked, for the rest of the function | Keeps code flat |

The run shows \`v == null\` is \`true\` for exactly \`null\` and \`undefined\` and \`false\` for \`0\`, \`""\` and \`false\`. The truthiness trap shows up in the second example: \`formatCount(0)\` printed \`no data\` because \`if (count)\` treated \`0\` as missing; \`count !== null\` gives \`0 items\`.

## 4. The Operators: ??, ?. and !

📌 **Interview term: nullish** — a value that is \`null\` or \`undefined\`. "Falsy" is a bigger set: nullish plus \`0\`, \`-0\`, \`0n\`, \`""\`, \`false\` and \`NaN\`.

📌 **Interview term: nullish coalescing (\`??\`)** — \`a ?? b\` is \`a\` unless \`a\` is nullish, then \`b\`. Compare \`||\`, which replaces every falsy value:

~~~ts
const volume = 0;
volume || 50;   // 50  (0 is falsy, so a real setting is lost)
volume ?? 50;   // 0   (0 is not nullish, so it is kept)
~~~

📌 **Interview term: optional chaining (\`?.\`)** — \`a?.b\` evaluates to \`undefined\` instead of throwing when \`a\` is nullish. Both \`??\` and \`?.\` arrived in TypeScript 3.7 ([TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7)). The forms, short-circuiting and limits of \`?.\` have their own page: [What are optional properties and optional chaining in TypeScript?](/interview-question/what-are-optional-properties-and-optional-chaining-in-typescript)

📌 **Interview term: non-null assertion (\`!\`)** — a postfix \`x!\` tells the compiler "trust me, this is not null". It is erased from the output and checks **nothing**:

~~~ts
const forced = findNickname(2)!;   // type string, value null
forced.toUpperCase();              // TypeError at run time
~~~

Use it only when you know something the compiler cannot (and prefer an explicit check that throws a useful message). Its cousin for class fields and variables is covered in [What is the definite assignment assertion (!)?](/interview-question/what-is-the-definite-assignment-assertion)

## 5. APIs That Can Miss, and NonNullable

The standard library types are honest about lookups:

~~~ts
const found = users.find((u) => u.id === 3);   // User | undefined
const age = ages.get("Bob");                    // number | undefined (Map.get)
~~~

Array indexing (\`arr[10]\`) and record lookups are the exception: they return \`T\` without \`undefined\` unless you turn on \`noUncheckedIndexedAccess\`, a flag **not** included in \`strict\` — see [How do noUncheckedIndexedAccess, exactOptionalPropertyTypes and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

📌 **Interview term: \`NonNullable<T>\`** — a utility type that removes \`null\` and \`undefined\` from a union: \`NonNullable<string | null | undefined>\` is \`string\`. See [What do Exclude, Extract, and NonNullable do?](/interview-question/what-do-exclude-extract-and-nonnullable-do)

## 6. Where Narrowing Stops

Two cases surprise people:

**\`filter\` (before 5.5).** In 5.4.5, \`raw.filter((x) => x !== null)\` still has type \`(string | null)[]\` — the compile-time check in the second example proves it. Writing the callback as a type predicate fixes it: \`raw.filter((x): x is string => x !== null)\` is \`string[]\`. TypeScript 5.5 (released 20 June 2024) infers that predicate for you, so the plain arrow works there ([TypeScript 5.5 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5)). That 5.5 behaviour was not run here; details are in [How does TypeScript 5.5 infer type predicates for Array.filter automatically?](/interview-question/how-does-typescript-5-5-infer-type-predicates-for-array-filter-automatically)

**Callbacks over a reassigned \`let\`.** A narrowing does not carry into a function created inside the branch if the variable is assigned again later, because the callback may run after that assignment:

~~~ts
let current: User | undefined = users[0];
if (current) {
  const unsafe = () => current.name;   // error TS18048: 'current' is possibly 'undefined'.
  current = undefined;
}
~~~

The run shows the compiler was right: calling \`unsafe()\` afterwards throws. With no later assignment, TypeScript 5.4.5 keeps the narrowing inside the callback (I checked that variant separately: it compiles cleanly).

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is an error the compiler really reports — and run the way the page runs them.

Example 1, \`strictNullChecks\`, narrowing, \`??\` versus \`||\` and \`!\`:

~~~text
TypeError: Cannot read properties of null (reading 'toUpperCase')
no nickname
[true,true,false,false,false,false]
|| gives 50, ?? gives 0
|| gives 50, ?? gives 50
untitled
TypeError: Cannot read properties of null (reading 'toUpperCase')
~~~

~~~text
main.ts(3,7): error TS2322: Type 'null' is not assignable to type 'string'.
main.ts(14,3): error TS18047: 'nick' is possibly 'null'.
~~~

Example 2, lookups, \`NonNullable\`, truthiness, \`filter\` and closures:

~~~text
true true not found unknown age
true
no data / 0 items
true true AB
1 gone
TypeError: Cannot read properties of undefined (reading 'name')
~~~

~~~text
main.ts(44,24): error TS18048: 'current' is possibly 'undefined'.
~~~

What the run proves:

- The two \`TypeError\` lines in example 1 are the crash \`strictNullChecks\` reports at compile time, and the crash \`!\` lets through.
- \`|| gives 50, ?? gives 0\` — \`||\` threw away a real \`0\`.
- \`no data / 0 items\` — the truthiness check misread \`0\` as missing.
- The \`true\` values are compile-time checks: \`find\` and \`Map.get\` include \`undefined\`, \`NonNullable\` removes it, and \`filter\` only narrows with an explicit predicate in 5.4.5.

## Common Pitfalls

- **Turning \`strict\` off to make errors go away.** Without \`strictNullChecks\` the compiler simply stops telling you where the crashes are.
- **\`||\` for defaults.** It replaces \`0\`, \`""\` and \`false\`. Use \`??\` unless you really mean "any falsy value".
- **Sprinkling \`!\`.** Each one is an unchecked promise. Prefer a check, an early return, or a helper that throws a clear error.
- **Truthiness checks on numbers and strings.** \`if (count)\` treats \`0\` as missing; write \`count !== null\` or \`count != null\`.
- **Assuming \`arr[i]\` can be undefined in the type.** It is typed \`T\` unless \`noUncheckedIndexedAccess\` is on.
- **Mixing \`null\` and \`undefined\` without a convention.** Pick one for "empty" in your own APIs (many teams use \`undefined\`) and use \`== null\` where you accept both.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The flag:</strong> <span style="color:#f0e2c8;">With **<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code>**, part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> are no longer hidden inside every type. A value that can be missing must say so: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Using it:</strong> <span style="color:#f0e2c8;">You narrow before use: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!== null</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!= null</code> for both at once, or an early return. The compiler then knows the value is present in that branch.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operators:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?.</code> short-circuits to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of throwing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">??</code> supplies a default only for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code>, which also replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> and the empty string.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Escape hatch:</strong> <span style="color:#f0e2c8;">The non-null assertion <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x!</code> silences the compiler but checks nothing at run time, so I keep it rare.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gaps:</strong> <span style="color:#f0e2c8;">Array indexing is typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code> is on, and narrowing does not survive into a callback if the variable is reassigned later.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">undefined</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> means never set: missing properties, missing arguments, no return value. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> is an explicit "empty" set by code or APIs. TypeScript treats them as two separate types; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x != null</code> checks for both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if (value)</code> be a bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It also rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>. For a count or a name where empty is valid, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value !== null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value != null</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">!</code> add a run-time check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is erased from the JavaScript. If the value is actually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, the next property access throws exactly as it would in JavaScript.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">arr.filter(x =&gt; x !== null)</code> still include <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code> in its type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before TypeScript 5.5, an arrow returning a boolean is not a type predicate, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> keeps the element type. Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x): x is string =&gt; x !== null</code>; 5.5 and later infer that predicate automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you turn on strict null checks in a large existing codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictNullChecks</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>), then fix errors module by module; some teams temporarily mark known-bad files with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">// @ts-expect-error</code> comments or keep a list of files excluded from a strict config until they are cleaned up.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`undefined\` | JavaScript value for "never set" |
| \`null\` | JavaScript value for "deliberately empty" |
| \`strictNullChecks\` | Compiler option (part of \`strict\`) that removes \`null\`/\`undefined\` from every type unless written explicitly |
| Nullish | \`null\` or \`undefined\` |
| Nullish coalescing (\`??\`) | Default that applies only when the left side is nullish |
| Optional chaining (\`?.\`) | Access that yields \`undefined\` instead of throwing on a nullish value |
| Non-null assertion (\`!\`) | Postfix operator that removes \`null\`/\`undefined\` from a type with no run-time check |
| \`NonNullable<T>\` | Utility type that removes \`null\` and \`undefined\` from \`T\` |

**Conclusion:** TypeScript makes missing values safe by making them visible: with \`strictNullChecks\`, \`string\` means a real string and "maybe missing" is written into the type. From there the compiler forces a check before use, and \`!= null\`, early returns, \`?.\` and \`??\` make those checks short. The remaining risks are the ones you opt into — \`!\`, \`as\`, unchecked indexing — so a strong answer names them and says how you keep them rare.`,
    examples: [
      {
        label: `strictNullChecks, narrowing, ?? versus || and the ! trap`,
        code: `// With strictNullChecks (part of strict), null is its own type.
// @ts-expect-error Type 'null' is not assignable to type 'string'.
const name1: string = null;

// You must say so when a value can be missing.
function findNickname(id: number): string | null {
  return id === 1 ? "Ace" : null;
}

const nick = findNickname(2);
try {
  // This is exactly the crash strictNullChecks reports before run time.
  // @ts-expect-error 'nick' is possibly 'null'.
  nick.toUpperCase();
} catch (err) {
  console.log(String(err));
}

// Narrowing removes null inside the checked branch.
if (nick !== null) {
  console.log(nick.toUpperCase());
} else {
  console.log("no nickname");
}

// value == null is true for both null and undefined, and only for them.
const samples = [null, undefined, 0, "", false, "x"];
console.log(samples.map((v) => v == null)); // [true,true,false,false,false,false]

// ?? falls back only on null and undefined; || falls back on every falsy value.
type Prefs = { volume: number | null; title?: string };
function show(p: Prefs): string {
  const withOr = p.volume || 50;
  const withNullish = p.volume ?? 50;
  return "|| gives " + withOr + ", ?? gives " + withNullish;
}
console.log(show({ volume: 0 })); // || gives 50, ?? gives 0
console.log(show({ volume: null })); // || gives 50, ?? gives 50

// Optional chaining stops at null or undefined and yields undefined.
const prefs: Prefs = { volume: 3 };
console.log(prefs.title?.toUpperCase() ?? "untitled"); // untitled

// The non-null assertion ! only silences the checker; it does no check at run time.
try {
  const forced = findNickname(2)!;
  forced.toUpperCase();
} catch (err) {
  console.log(String(err));
}`,
      },
      {
        label: `Lookups that can miss, NonNullable, filter and closures`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type User = { id: number; name: string };
const users: User[] = [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }];

// The standard library tells you when a lookup can miss.
const found = users.find((u) => u.id === 3);
const t1: Equal<typeof found, User | undefined> = true;
const ages = new Map<string, number>([["Ada", 36]]);
const age = ages.get("Bob");
const t2: Equal<typeof age, number | undefined> = true;
console.log(t1, t2, found?.name ?? "not found", age ?? "unknown age");

// NonNullable strips null and undefined from a type.
type MaybeName = string | null | undefined;
const t3: Equal<NonNullable<MaybeName>, string> = true;
console.log(t3);

// Truthiness narrowing also removes 0 and the empty string. Sometimes that is a bug.
function formatCount(count: number | null): string {
  if (count) return count + " items";
  return "no data";
}
function formatCountFixed(count: number | null): string {
  if (count !== null) return count + " items";
  return "no data";
}
console.log(formatCount(0), "/", formatCountFixed(0));

// In TypeScript 5.4, filter with an inline callback does not remove null from the type.
const raw: (string | null)[] = ["a", null, "b"];
const stillNullable = raw.filter((x) => x !== null);
const t4: Equal<typeof stillNullable, (string | null)[]> = true;
// A callback with an explicit type predicate does.
const clean = raw.filter((x): x is string => x !== null);
const t5: Equal<typeof clean, string[]> = true;
console.log(t4, t5, clean.map((s) => s.toUpperCase()).join(""));

// Narrowing does not survive into a callback if the let is reassigned later.
let current: User | undefined = users[0];
if (current) {
  const id = current.id;
  // @ts-expect-error 'current' is possibly 'undefined'.
  const unsafe = () => current.name;
  const safe = () => current?.name ?? "gone";
  current = undefined;
  console.log(id, safe());
  try {
    unsafe();
  } catch (err) {
    console.log(String(err));
  }
}`,
      },
    ],
  },
  {
    title: `What are optional properties and optional chaining in TypeScript?`,
    difficulty: "easy",
    seoDescription: `Optional properties (key?: T) may be missing and read as T | undefined; optional chaining (?.) stops a property, index or call chain at null.`,
    description: `**Question presented to candidate:**
"An API returns users where \\\`email\\\` and \\\`address\\\` are sometimes missing. How do you type those fields, and how do you read \\\`user.address.city\\\` without crashing? Walk me through optional properties and optional chaining."

**What a strong answer should cover:**
- \\\`key?: T\\\` means the key may be absent; reading it gives \\\`T | undefined\\\` and must be narrowed under \\\`strict\\\`
- \\\`key?: T\\\` is not the same as \\\`key: T | undefined\\\` (the second still requires the key); \\\`in\\\` tells "missing" from "present but undefined"; \\\`exactOptionalPropertyTypes\\\` makes the distinction strict
- Optional chaining has three forms: \\\`a?.b\\\`, \\\`a?.[k]\\\` and \\\`f?.()\\\`, and the result type always adds \\\`undefined\\\`
- Short-circuiting: once the left side is \\\`null\\\` or \\\`undefined\\\`, the rest of the chain, including function calls and index expressions, is not evaluated
- \\\`?.\\\` guards only \\\`null\\\`/\\\`undefined\\\` (not \\\`0\\\` or \\\`""\\\`), only the link it is written on, and cannot be used on the left of \\\`=\\\`; pair it with \\\`??\\\` for defaults
- Optional methods and \\\`Partial<T>\\\`

**Code / implementation expected:** Yes — an interface with optional fields and safe reads with \\\`?.\\\` and \\\`??\\\`.`,
    answer: `**Target Audience:** Beginners modelling data where some fields are sometimes missing.
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`, plus one check with \`--exactOptionalPropertyTypes\`); emitted JavaScript checked with the 5.4.5 \`ts.transpile\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A sign-up form has required boxes (name, email) and optional ones (phone, company). The optional boxes are not "filled with nothing"; they may simply not be there in the submission.

Reading such data is like following directions: "go to the second floor, find the blue door, knock". If there is no second floor, you should stop and say "not found" — not walk into a wall. **Optional properties** are how a type says "this box may be missing". **Optional chaining** is how code follows directions and stops politely at the first missing step.

## 2. Optional Properties: \`key?: T\`

📌 **Interview term: optional property** — a property declared with \`?\` after its name. Objects of that type may leave the key out entirely.

~~~ts
interface User {
  id: number;
  name: string;
  email?: string;
  address?: { city: string; zip?: string };
}

const ada: User = { id: 1, name: "Ada" };   // fine: email and address omitted
const broken: User = { id: 3 };              // error: name is required
~~~

~~~text
main.ts(15,7): error TS2741: Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
~~~

Reading an optional property gives \`T | undefined\` (\`User["email"]\` is \`string | undefined\`), so under \`strictNullChecks\` you must deal with the missing case before using it:

~~~ts
ada.address.city;   // error
~~~

~~~text
main.ts(23,15): error TS18048: 'ada.address' is possibly 'undefined'.
~~~

The run shows that error was real: \`TypeError: Cannot read properties of undefined (reading 'city')\`. The general rules for missing values are in [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

### Optional versus "required but may be undefined"

These look alike and are not:

| Declaration | \`{}\` allowed? | \`{ note: undefined }\` allowed? | Meaning |
| :--- | :--- | :--- | :--- |
| \`{ note?: string }\` | Yes | Yes (by default) | The key may be missing |
| \`{ note: string \\| undefined }\` | **No** (TS2741) | Yes | The key must be present, its value may be \`undefined\` |

At run time the difference is visible with the \`in\` operator: \`"note" in {}\` is \`false\`, \`"note" in { note: undefined }\` is \`true\` (both printed by the first example). This matters for \`Object.keys\` and for spreading: \`{ ...defaults, ...{ note: undefined } }\` overwrites the default with \`undefined\`, while an object that omits \`note\` leaves the default alone.

📌 **Interview term: \`exactOptionalPropertyTypes\`** — an opt-in compiler flag (added in TypeScript 4.4 and **not** part of \`strict\`, per the [4.4 RC announcement](https://devblogs.microsoft.com/typescript/?p=3042)) under which \`key?: T\` means "missing or \`T\`", and an explicit \`undefined\` is rejected. Run with the flag on 5.4.5:

~~~ts
interface Settings { theme?: "dark" | "light" }
const s: Settings = { theme: undefined };
~~~

~~~text
eopt.ts(2,7): error TS2375: Type '{ theme: undefined; }' is not assignable to type 'Settings' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'theme' are incompatible.
    Type 'undefined' is not assignable to type '"dark" | "light"'.
~~~

More on hardening flags in [How do noUncheckedIndexedAccess, exactOptionalPropertyTypes and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

### Optional methods and Partial

Methods can be optional too (\`init?(): string\`), and you call them with \`p.init?.()\`. To make **every** property optional at once — a draft, a patch, an update payload — use \`Partial<User>\` ([What are utility types like Partial, Pick, and Omit?](/interview-question/what-are-utility-types-like-partial-pick-and-omit)).

## 3. Optional Chaining: \`?.\`

📌 **Interview term: optional chaining** — the \`?.\` operator (JavaScript ES2020, supported since TypeScript 3.7 per the [3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7)). If the value on its left is \`null\` or \`undefined\`, the whole expression evaluates to \`undefined\` instead of throwing.

It has three forms:

| Form | Example | Meaning |
| :--- | :--- | :--- |
| Property access | \`o.customer?.name\` | Read \`name\` only if \`customer\` is not nullish |
| Element access | \`tags?.[0]\` | Index only if \`tags\` is not nullish |
| Call | \`greet?.("there")\` | Call only if \`greet\` is not nullish |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Evaluating customer then name: if customer is null or undefined the chain stops and the result is undefined, otherwise name is read">
  <defs>
    <marker id="ts02q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="68" text-anchor="middle">o.customer</text>
  <text class="d-sub" x="105" y="90" text-anchor="middle">evaluate left side</text>
  <rect class="d-box-accent" x="260" y="40" width="190" height="64" rx="10"/>
  <text class="d-text" x="355" y="68" text-anchor="middle">null or undefined</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">check</text>
  <rect class="d-box" x="540" y="40" width="150" height="64" rx="10"/>
  <text class="d-text" x="615" y="68" text-anchor="middle">read .name</text>
  <text class="d-sub" x="615" y="90" text-anchor="middle">chain continues</text>
  <rect class="d-box-muted" x="260" y="170" width="190" height="64" rx="10"/>
  <text class="d-text" x="355" y="198" text-anchor="middle">undefined</text>
  <text class="d-sub" x="355" y="220" text-anchor="middle">rest is skipped</text>
  <path class="d-edge" d="M 194 72 L 254 72" marker-end="url(#ts02q4-arrow)"/>
  <path class="d-edge-accent" d="M 454 72 L 534 72" marker-end="url(#ts02q4-arrow)"/>
  <path class="d-edge-dashed" d="M 355 108 L 355 164" marker-end="url(#ts02q4-arrow)"/>
  <text class="d-sub" x="494" y="58" text-anchor="middle">no</text>
  <text class="d-sub" x="375" y="142">yes</text>
</svg>

Each \`?.\` is one check like this. When it says "yes", the **entire rest of the chain** is skipped, not just the next property.

📌 **Interview term: short-circuiting** — when the left side of \`?.\` is nullish, nothing to its right in the same chain is evaluated: no further property reads, no index expressions, no function calls. The second example proves it with a counter: \`missing?.[nextIndex()]\` never calls \`nextIndex\`, \`present?.[nextIndex()]\` does, and the counter ends at \`calls: 1\`.

### What the result type is

The result type always gains \`undefined\` — **even when the value was \`null\`**:

~~~ts
const n = orders[2].customer?.name;   // customer is null here
// typeof n is string | undefined, and n === undefined is true at run time
~~~

So check results with \`=== undefined\` or \`?? fallback\`, not \`=== null\`.

### Its limits

- **It guards only \`null\` and \`undefined\`.** \`""?.length\` is \`0\`; \`0\`, \`""\` and \`false\` are real values and the chain continues.
- **It guards only its own link.** In \`maybe.customer?.name\`, the \`?.\` protects \`customer\`; if \`maybe\` itself is \`undefined\`, the code still throws (and TypeScript reports \`TS18048: 'maybe' is possibly 'undefined'.\`). Write \`maybe?.customer?.name\`.
- **Not on the left of an assignment.** \`o.c?.name = "x"\` is a syntax error in JavaScript and in TypeScript: \`error TS2779: The left-hand side of an assignment expression may not be an optional property access.\`
- **Do not chain everything "just in case".** \`a?.b?.c?.d\` on values that can never be missing hides real bugs as silent \`undefined\`s. Make the type say what is optional, and use \`?.\` exactly there.

### Pair it with \`??\`

\`?.\` produces \`undefined\`; \`??\` turns that into a default: \`o.customer?.tags?.length ?? 0\`. Use \`??\`, not \`||\`, so a real \`0\` or \`""\` survives (see the null-safety page linked above).

### What it compiles to

\`?.\` and \`??\` are ES2020 syntax. With target ES2020 or later TypeScript leaves them as they are; for older targets it rewrites them. The 5.4.5 \`ts.transpile\` output for \`const city = user?.address?.city ?? "unknown";\`:

~~~text
-- ES2019
var _a, _b;
const city = (_b = (_a = user === null || user === void 0 ? void 0 : user.address) === null || _a === void 0 ? void 0 : _a.city) !== null && _b !== void 0 ? _b : "unknown";

-- ES2020
const city = user?.address?.city ?? "unknown";
~~~

The down-levelled version evaluates each link once (into \`_a\`) and checks for both \`null\` and \`undefined\` (\`void 0\` is \`undefined\`).

## 4. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is an error the compiler really reports — and run the way the page runs them.

Example 1, optional properties:

~~~text
true undefined
TypeError: Cannot read properties of undefined (reading 'city')
unknown Portland
unknown no zip
false true
log log ready
noop no init
{} true
~~~

~~~text
main.ts(15,7): error TS2741: Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
main.ts(23,15): error TS18048: 'ada.address' is possibly 'undefined'.
main.ts(41,7): error TS2741: Property 'note' is missing in type '{}' but required in type 'B'.
~~~

Example 2, optional chaining:

~~~text
1 Ada vip hi there
2 Linus undefined undefined
3 undefined undefined undefined
4 undefined undefined undefined
true true
undefined x calls: 1
0
TypeError: Cannot read properties of undefined (reading 'customer')
1,0,0,0
~~~

~~~text
main.ts(46,15): error TS18048: 'maybe' is possibly 'undefined'.
~~~

What the run proves:

- \`false true\` — an omitted optional key and a key set to \`undefined\` are different at run time.
- Orders 3 (\`customer: null\`) and 4 (no \`customer\` key) both give \`undefined\` through \`?.\`.
- \`calls: 1\` — the index expression after a nullish \`?.\` was never evaluated.
- \`0\` — \`?.\` did not stop at an empty string.
- The \`customer\` \`TypeError\` — a \`?.\` later in the chain does not protect an earlier link.

## Common Pitfalls

- **Confusing \`key?: T\` with \`key: T | undefined\`.** The first allows the key to be missing; the second forces callers to write it.
- **Checking a \`?.\` result against \`null\`.** The result is \`undefined\`, even when the original value was \`null\`.
- **Putting \`?.\` on the wrong link.** \`a.b?.c\` still throws when \`a\` is missing.
- **\`?.\` everywhere.** Over-chaining turns crashes into silent \`undefined\`s that surface far away. Model optionality in the type and chain only there.
- **\`||\` after \`?.\`.** \`count?.value || 10\` replaces a real \`0\`. Use \`??\`.
- **Expecting \`?.\` to validate data.** It only handles missing values; a \`customer\` that is a string is still a bug the type cannot see at run time.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Optional property:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email?: string</code> means the key may be missing. Reading it gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | undefined</code>, so with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> the compiler makes me handle the missing case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Subtle part:</strong> <span style="color:#f0e2c8;">Optional is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email: string | undefined</code>: that version still requires the key. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> tells them apart at run time, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exactOptionalPropertyTypes</code> stops people writing an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> into an optional key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optional chaining:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a?.b</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a?.[k]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f?.()</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of throwing when the left side is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Short-circuit:</strong> <span style="color:#f0e2c8;">Once a link is nullish, nothing to its right runs — no calls, no index expressions — and the result type always gains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Usage:</strong> <span style="color:#f0e2c8;">I pair it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">??</code> for defaults, use it only where the type says a value is optional, and remember it guards only its own link and cannot be assigned to.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a?.b</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a &amp;&amp; a.b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code> stops on any falsy value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> returns that value instead of reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?.</code> stops only on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. It also evaluates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">user?.address.city</code> do when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">user</code> exists but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">address</code> is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It throws. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?.</code> guards only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user</code>. You need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user?.address?.city</code>, and the compiler tells you so when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">address</code> is optional.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj?.prop = 5</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. JavaScript forbids optional chaining on the left of an assignment; TypeScript reports TS2779. Check the object first, then assign.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">?.</code> compile to for an old target?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For targets below ES2020, TypeScript rewrites it into temporary variables and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=== null || === void 0</code> checks. From ES2020 up it is emitted unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make every property of a type optional?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial&lt;T&gt;</code>. For only some keys, combine it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial&lt;Pick&lt;T, "a" | "b"&gt;&gt; &amp; Omit&lt;T, "a" | "b"&gt;</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Optional property | A property declared \`key?: T\` that may be absent; reads as \`T \\| undefined\` |
| \`exactOptionalPropertyTypes\` | Opt-in flag: an optional key must be missing or \`T\`, never an explicit \`undefined\` |
| Optional chaining | \`?.\` in property, element or call form, yielding \`undefined\` at a nullish link |
| Short-circuiting | Skipping the rest of the chain once a \`?.\` link is nullish |

**Conclusion:** Optional properties put "this may be missing" into the type, and optional chaining lets code follow a path through such data and stop cleanly at the first missing link. The details interviewers check are the precise ones: \`?\` is not the same as \`| undefined\`, the result of \`?.\` is always \`undefined\`, the rest of the chain is skipped, and \`?.\` protects only the link it is written on. Combine it with \`??\` and keep it to the places the type marks as optional.`,
    examples: [
      {
        label: `Optional properties: missing keys, narrowing, in and Partial`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A ? after the property name: the key may be left out entirely.
interface User {
  id: number;
  name: string;
  email?: string;
  address?: { city: string; zip?: string };
}

const ada: User = { id: 1, name: "Ada" };
const linus: User = { id: 2, name: "Linus", email: "l@k.org", address: { city: "Portland" } };

// @ts-expect-error Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
const broken: User = { id: 3 };

// Reading an optional property gives T | undefined.
const t1: Equal<User["email"], string | undefined> = true;
console.log(t1, ada.email);

try {
  // @ts-expect-error 'ada.address' is possibly 'undefined'.
  console.log(ada.address.city);
} catch (err) {
  console.log(String(err));
}

// Narrow before use, or use ?. and ??.
function city(u: User): string {
  if (u.address !== undefined) return u.address.city;
  return "unknown";
}
console.log(city(ada), city(linus));
console.log(ada.address?.city ?? "unknown", linus.address?.zip ?? "no zip");

// Optional is not the same as "required but may be undefined".
type A = { note?: string };
type B = { note: string | undefined };
const a: A = {};
// @ts-expect-error Property 'note' is missing in type '{}' but required in type 'B'.
const b: B = {};
const b2: B = { note: undefined };

// The in operator tells "missing" apart from "present but undefined".
console.log("note" in a, "note" in b2);

// Optional methods are called with ?.()
interface Plugin {
  name: string;
  init?(): string;
}
const plugins: Plugin[] = [{ name: "log", init: () => "log ready" }, { name: "noop" }];
for (const p of plugins) console.log(p.name, p.init?.() ?? "no init");

// Partial<T> makes every property optional at once.
type Draft = Partial<User>;
const draft: Draft = {};
const t2: Equal<Draft["id"], number | undefined> = true;
console.log(JSON.stringify(draft), t2);`,
      },
      {
        label: `Optional chaining: three forms, short-circuiting and limits`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Order = {
  id: number;
  customer?: { name: string; tags?: string[]; greet?: (s: string) => string } | null;
};

const orders: Order[] = [
  { id: 1, customer: { name: "Ada", tags: ["vip"], greet: (s) => "hi " + s } },
  { id: 2, customer: { name: "Linus" } },
  { id: 3, customer: null },
  { id: 4 },
];

// Three forms: property a?.b, element a?.[i], call f?.()
for (const o of orders) {
  const name = o.customer?.name;
  const firstTag = o.customer?.tags?.[0];
  const greeting = o.customer?.greet?.("there");
  console.log(o.id, String(name), String(firstTag), String(greeting));
}

// The result type always adds undefined, even when the value was null.
const n = orders[2].customer?.name;
const t1: Equal<typeof n, string | undefined> = true;
console.log(t1, n === undefined);

// Short-circuit: once the left side is null or undefined, the rest of the chain does not run.
let calls = 0;
function nextIndex(): number {
  calls++;
  return 0;
}
const missing: string[] | undefined = undefined as string[] | undefined;
const present: string[] | undefined = ["x"];
console.log(String(missing?.[nextIndex()]), present?.[nextIndex()], "calls:", calls);

// ?. only guards null and undefined. Empty string, 0 and false keep going.
const empty = "" as string | undefined;
console.log(empty?.length); // 0

// ?. guards only its own link: a.b?.c still needs a itself to exist.
const maybe = undefined as Order | undefined;
try {
  // @ts-expect-error 'maybe' is possibly 'undefined'.
  console.log(maybe.customer?.name);
} catch (err) {
  console.log(String(err));
}

// Pair it with ?? for a default, and do not use it on the left of =.
console.log(orders.map((o) => o.customer?.tags?.length ?? 0).join(",")); // 1,0,0,0`,
      },
    ],
  },
  {
    title: `How do you type functions: optional, default and rest parameters?`,
    difficulty: "easy",
    seoDescription: `How to type optional (b?: T), default (b = 1) and rest (...xs: T[]) parameters, their order rules, tuple rest types and Function.length.`,
    description: `**Question presented to candidate:**
"Write a TypeScript function that takes a required argument, an optional one, one with a default value, and then any number of extra arguments. How do you type each kind, and what rules does the compiler enforce about them?"

**What a strong answer should cover:**
- Optional parameter \\\`b?: T\\\`: callers may omit it, and inside the body its type is \\\`T | undefined\\\`
- Default parameter \\\`b = 1\\\`: optional for callers, never \\\`undefined\\\` inside, type inferred from the default; the default applies to \\\`undefined\\\` but not to \\\`null\\\`
- Rest parameter \\\`...xs: T[]\\\` (or a tuple type such as \\\`...args: [x: number, y?: number]\\\`), always last and only one
- Order rules: a required parameter cannot follow an optional one (TS1016); a default before a required parameter is allowed but then not skippable
- Function type expressions, spreading arrays into fixed parameters (needs a tuple, TS2556), and \\\`Parameters<typeof f>\\\`
- Callback parameters should not be marked optional unless callers may really omit them

**Code / implementation expected:** Yes — one function using each parameter kind, with calls that pass and fail type checking.`,
    answer: `**Target Audience:** Beginners writing their first typed functions with flexible arguments.
**Difficulty:** Easy
**TypeScript version:** Compiler behaviour checked with TypeScript 5.4.5 (\`tsc --strict\`).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and every output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Ordering a pizza: the size is required. Extra cheese is optional — say nothing and you get none. The crust has a default — say nothing and you get "classic". And toppings are "as many as you like". Four kinds of choices, and the person taking the order needs to know which is which, or "large, thin" gets heard as "large pizza, topping: thin".

Function parameters work the same way. TypeScript gives each kind its own syntax, so the checker knows what callers may leave out and what the function body can rely on.

## 2. The Three Kinds at a Glance

| Kind | Syntax | Caller may omit? | Type inside the body |
| :--- | :--- | :--- | :--- |
| Required | \`name: string\` | No | \`string\` |
| Optional | \`title?: string\` | Yes | \`string \\| undefined\` |
| Default | \`width = 6\` or \`width: number = 6\` | Yes | \`number\` (never \`undefined\`) |
| Rest | \`...nums: number[]\` | Yes (zero or more) | \`number[]\` (always an array) |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="Parameter order: required parameters first, then optional or default parameters, then a single rest parameter last">
  <defs>
    <marker id="ts02q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="80" text-anchor="middle">required</text>
  <text class="d-sub" x="105" y="102" text-anchor="middle">level: Level</text>
  <rect class="d-box-accent" x="260" y="50" width="190" height="70" rx="10"/>
  <text class="d-text" x="355" y="80" text-anchor="middle">optional or default</text>
  <text class="d-sub" x="355" y="102" text-anchor="middle">message?: string</text>
  <rect class="d-box-muted" x="520" y="50" width="160" height="70" rx="10"/>
  <text class="d-text" x="600" y="80" text-anchor="middle">rest, last</text>
  <text class="d-sub" x="600" y="102" text-anchor="middle">...details: string[]</text>
  <path class="d-edge" d="M 194 85 L 254 85" marker-end="url(#ts02q5-arrow)"/>
  <path class="d-edge" d="M 454 85 L 514 85" marker-end="url(#ts02q5-arrow)"/>
</svg>

The order matters because arguments are matched by **position**: \`log("warn", "disk low", "92%", "sda1")\` fills \`level\`, then \`message\`, and everything left over goes into \`details\`.

## 3. Optional Parameters: \`b?: T\`

📌 **Interview term: optional parameter** — a parameter marked with \`?\`. Callers may leave it out, and inside the function its type includes \`undefined\`.

~~~ts
function greet(name: string, title?: string): string {
  return title ? "Hello, " + title + " " + name : "Hello, " + name;
}
greet("Ada");                  // "Hello, Ada"
greet("Ada", "Dr.");           // "Hello, Dr. Ada"
greet("Ada", "Dr.", "extra");  // error
~~~

~~~text
main.ts(10,21): error TS2554: Expected 1-2 arguments, but got 3.
~~~

Because \`title\` can be \`undefined\`, using it unchecked is an error (\`main.ts(15,10): error TS18048: 'title' is possibly 'undefined'.\`). Note that, unlike JavaScript, TypeScript also rejects **too many** arguments.

A required parameter cannot come after an optional one; the compiler stops you:

~~~text
main.ts(1,26): error TS1016: A required parameter cannot follow an optional parameter.
~~~

## 4. Default Parameters: \`b = value\`

📌 **Interview term: default parameter** — a parameter with \`= value\`. It is optional for callers, and inside the body it is never \`undefined\`, because the default fills the gap. Its type is inferred from the default, so \`width = 6\` is \`number\` without an annotation:

~~~ts
function pad(text: string, width = 6, fill = "."): string {
  return text.padEnd(width, fill);
}
pad("ab");            // "ab...."
pad("ab", 4, "-");    // "ab--"
pad("ab", "4");       // error
~~~

~~~text
main.ts(31,11): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

Two JavaScript rules to know, both shown in the run:

- **The default applies to \`undefined\` only.** \`label(undefined)\` gives \`"default"\`; \`label(null)\` passes \`null\` through. If the type allows \`null\`, the body must still handle it.
- **A default before a required parameter does not make it skippable.** In \`range(start = 0, end: number)\`, \`range(3)\` is \`TS2554: Expected 2 arguments, but got 1.\`; callers must write \`range(undefined, 3)\`. Put defaults at the end.

## 5. Rest Parameters: \`...xs: T[]\`

📌 **Interview term: rest parameter** — a final \`...name\` parameter that collects all remaining arguments into a real array. Its type must be an array or tuple type, and there can be only one.

~~~ts
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
sum();            // 0
sum(1, 2, 3);     // 6
sum(...[4, 5, 6]) // 15: spreading an array into a rest parameter is always fine
~~~

The rest type can also be a **tuple**, which gives a fixed number of arguments with names and optional positions — handy for typing forwarded arguments ([What are tuple types?](/interview-question/what-are-tuple-types)):

~~~ts
function point(...args: [x: number, y: number, z?: number]): string { ... }
point(1, 2);       // fine
point(1);          // error TS2554: Expected 2-3 arguments, but got 1.
~~~

📌 **Interview term: spread argument** — \`f(...arr)\` at the call site. Spreading a plain \`number[]\` into **fixed** parameters fails because the array could have any length:

~~~text
main.ts(26,6): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
~~~

A tuple fixes it: \`const dimsTuple = [3, 4] as const; area(...dimsTuple)\` type-checks and returns \`12\`.

## 6. Function Types and How the Signature Reads

The same syntax works in a **function type expression**: \`type Formatter = (value: number, digits?: number) => string\`. An implementation assigned to it can use a default (\`(value, digits = 2) => ...\`), and its parameter types are inferred from the type alias.

📌 **Interview term: \`Parameters<F>\`** — the utility type that turns a function type into a tuple of its parameter types. Both optional and default parameters show up as optional elements: \`Parameters<typeof pad>\` is \`[text: string, width?: number, fill?: string]\`, verified by a compile-time check in the first example. See [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

Two more rules that come up in interviews:

- **Fewer parameters is assignable to more.** \`[1, 2, 3].map((n) => n * 2)\` passes a one-parameter callback where \`map\` offers three (value, index, array). Ignoring extra arguments is safe, so TypeScript allows it.
- **Do not make callback parameters optional just because some callbacks ignore them.** If a callback type says \`(item: string, index?: number) => void\`, every implementation must handle \`index\` being \`undefined\` (\`TS18048: 'index' is possibly 'undefined'.\`), even though \`each\` always passes it. Declare it required; callbacks that do not need it can still leave it out.

When one function needs genuinely different signatures (for example, different return types per argument shape), optional parameters are not enough: that is what [What are function overloads?](/interview-question/what-are-function-overloads) covers.

## 7. A Run-Time Detail: \`Function.length\`

JavaScript's \`f.length\` counts parameters **before the first default or rest parameter**. TypeScript's \`?\` is erased, so an optional parameter still counts. The run prints \`2 1 0 2\` for:

| Function | Parameters | \`length\` |
| :--- | :--- | :--- |
| \`greet\` | \`name, title?\` | 2 (the \`?\` is erased, \`title\` is a normal parameter in JavaScript) |
| \`pad\` | \`text, width = 6, fill = "."\` | 1 (stops at the first default) |
| \`sum\` | \`...nums\` | 0 |
| \`log\` | \`level, message?, ...details\` | 2 |

Libraries that inspect \`length\` (some test runners and middleware frameworks do) therefore see a difference between \`b?: T\` and \`b = value\`.

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5, target ES2022) — each \`// @ts-expect-error\` line is an error the compiler really reports — and run the way the page runs them. The TS1016 message comes from a separate one-line file, because a file with that error does not type-check at all.

Example 1, optional, default and rest parameters:

~~~text
Hello, Ada
Hello, Dr. Ada
DR. ADA
ab....
ab--
default null
0 6
15
info: (none)
warn: disk low [92%, sda1]
true true
2 1 0 2
~~~

~~~text
main.ts(10,21): error TS2554: Expected 1-2 arguments, but got 3.
main.ts(15,10): error TS18048: 'title' is possibly 'undefined'.
main.ts(31,11): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

Example 2, function types, tuple rest, spreads and callbacks:

~~~text
3.14 3
2,4,6
(1, 2, 0)
(1, 2, 3)
12
0,1,2
a0 b1
~~~

~~~text
main.ts(18,1): error TS2554: Expected 2-3 arguments, but got 1.
main.ts(26,6): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
main.ts(38,1): error TS2554: Expected 2 arguments, but got 1.
main.ts(52,20): error TS18048: 'index' is possibly 'undefined'.
~~~

What the run proves:

- \`default null\` — a default replaces \`undefined\`, not \`null\`.
- \`0 6\` and \`15\` — a rest parameter is always an array, empty when no arguments are passed.
- \`true true\` — \`Parameters\` shows optional and default parameters both as optional tuple elements.
- \`2 1 0 2\` — at run time, \`length\` stops at the first default or rest parameter, and an optional \`?\` parameter still counts.

## Common Pitfalls

- **A default in the middle.** \`f(a = 1, b: number)\` forces callers to pass \`undefined\` for \`a\`. Put defaults and optional parameters last.
- **Expecting a default for \`null\`.** \`f(null)\` skips the default. Use \`value ?? fallback\` in the body if \`null\` is possible.
- **Spreading \`number[]\` into fixed parameters.** It fails with TS2556; use a tuple (\`as const\`) or a rest parameter.
- **Optional callback parameters.** They force every implementation to handle \`undefined\`. Make them required.
- **Typing a rest parameter as a single element type.** \`...nums: number\` is \`TS2370: A rest parameter must be of an array type.\`; the type is the whole array, \`number[]\`.
- **Annotating a default that already infers.** \`width: number = 6\` is fine but redundant; annotate only when the default is narrower than what callers may pass (for example \`mode: Mode = "fast"\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Optional:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title?: string</code> — callers may omit it, and inside the body it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | undefined</code>, so I narrow it before use.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width = 6</code> — also optional for callers, but never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> inside; the type is inferred from the default, and it only replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rest:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">...nums: number[]</code> — collects the remaining arguments into a real array; it must be last, and its type can be a tuple like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x: number, y?: number]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules:</strong> <span style="color:#f0e2c8;">Required, then optional or default, then rest. A required parameter after an optional one is TS1016, and TypeScript also rejects too many arguments.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Related:</strong> <span style="color:#f0e2c8;">Spreading an array into fixed parameters needs a tuple, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Parameters&lt;typeof f&gt;</code> shows optional and default parameters as optional elements, and for different signatures I use overloads.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x?: number</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x: number | undefined</code> as a parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x?</code>, callers can omit the argument. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x: number | undefined</code>, they must pass something, even if it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Inside the body both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number | undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.max(...arr)</code> type-check but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">area(...arr)</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code> takes a rest parameter, so any length is fine. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">area(width, height)</code> has fixed parameters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number[]</code> has unknown length, so TypeScript reports TS2556 unless the array is a tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a default parameter refer to an earlier parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, defaults are evaluated left to right at call time, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function f(a: number, b = a * 2)</code> works; it cannot refer to a later parameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should a callback parameter not be optional?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An optional parameter in a callback type means the caller might not pass it, so every implementation must handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. If the caller always passes it, declare it required; implementations can still ignore it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> in a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a fake first parameter, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function f(this: HTMLElement, e: Event)</code>. It is erased from the output and does not count as an argument.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Optional parameter | \`b?: T\`; may be omitted, typed \`T \\| undefined\` inside |
| Default parameter | \`b = value\`; may be omitted or passed \`undefined\`, never \`undefined\` inside |
| Rest parameter | Final \`...xs: T[]\` collecting the remaining arguments into an array |
| Spread argument | \`f(...arr)\` at a call site; needs a tuple for fixed parameters |
| \`Parameters<F>\` | Utility type giving a function's parameter list as a tuple |

**Conclusion:** TypeScript types the three flexible parameter kinds with three small pieces of syntax: \`?\` for "may be missing", \`= value\` for "may be missing, and here is what to use", and \`...\` for "any number more". The compiler enforces the order, counts arguments in both directions, and tracks whether the body can see \`undefined\`. The follow-ups that separate strong answers are the run-time details — defaults ignore \`null\`, \`length\` stops at the first default — and the type-level ones: tuple rest parameters, spreads needing tuples, and keeping callback parameters required.`,
    examples: [
      {
        label: `Optional, default and rest parameters`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Optional parameter: the caller may leave it out; inside, its type is T | undefined.
function greet(name: string, title?: string): string {
  return title ? "Hello, " + title + " " + name : "Hello, " + name;
}
console.log(greet("Ada")); // Hello, Ada
console.log(greet("Ada", "Dr.")); // Hello, Dr. Ada
// @ts-expect-error Expected 1-2 arguments, but got 3.
greet("Ada", "Dr.", "extra");

// Inside the body you must handle the missing case.
function shoutBroken(name: string, title?: string): string {
  // @ts-expect-error 'title' is possibly 'undefined'.
  return title.toUpperCase() + name;
}
function shout(name: string, title?: string): string {
  if (title === undefined) return name;
  return title.toUpperCase() + name;
}
console.log(shout("ADA", "DR. ")); // DR. ADA

// Default parameter: optional for the caller, never undefined inside. The type is inferred from the default.
function pad(text: string, width = 6, fill = "."): string {
  const t: Equal<typeof width, number> = true;
  return t ? text.padEnd(width, fill) : text;
}
console.log(pad("ab")); // ab....
console.log(pad("ab", 4, "-")); // ab--
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'.
pad("ab", "4");

// The default applies for undefined only. null is passed through as a real value.
function label(text: string | null = "default"): string {
  return String(text);
}
console.log(label(undefined), label(null));

// Rest parameter: any number of arguments, collected into a real array.
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
console.log(sum(), sum(1, 2, 3));
const values = [4, 5, 6];
console.log(sum(...values)); // 15

// The order is fixed: required, then optional or default, then one rest parameter last.
function log(level: "info" | "warn", message?: string, ...details: string[]): string {
  return level + ": " + (message ?? "(none)") + (details.length ? " [" + details.join(", ") + "]" : "");
}
console.log(log("info")); // info: (none)
console.log(log("warn", "disk low", "92%", "sda1")); // warn: disk low [92%, sda1]

// How the signature reads as a type: optional and default both become ?.
type PadParams = Parameters<typeof pad>;
const t2: Equal<PadParams, [text: string, width?: number, fill?: string]> = true;
const t3: Equal<Parameters<typeof log>, [level: "info" | "warn", message?: string, ...details: string[]]> = true;
console.log(t2, t3);

// Function.length counts only parameters before the first default or rest one.
console.log(greet.length, pad.length, sum.length, log.length);`,
      },
      {
        label: `Function types, tuple rest, spreads and callback pitfalls`,
        code: `// A function type expression can describe optional and rest parameters too.
type Formatter = (value: number, digits?: number) => string;
const fmt: Formatter = (value, digits = 2) => value.toFixed(digits);
console.log(fmt(3.14159), fmt(3.14159, 0));

// Fewer parameters is fine: a callback may ignore what it is given.
const doubled = [1, 2, 3].map((n) => n * 2);
console.log(doubled.join(",")); // 2,4,6

// Rest parameters can be typed as a tuple, including labels and optional elements.
function point(...args: [x: number, y: number, z?: number]): string {
  const [x, y, z = 0] = args;
  return "(" + x + ", " + y + ", " + z + ")";
}
console.log(point(1, 2)); // (1, 2, 0)
console.log(point(1, 2, 3)); // (1, 2, 3)
// @ts-expect-error Expected 2-3 arguments, but got 1.
point(1);

// Spreading an array into fixed parameters: number[] might have any length.
function area(width: number, height: number): number {
  return width * height;
}
const dims = [3, 4];
// @ts-expect-error A spread argument must either have a tuple type or be passed to a rest parameter.
area(...dims);
// A tuple has a known length, so the spread type-checks.
const dimsTuple = [3, 4] as const;
console.log(area(...dimsTuple)); // 12

// A default before a required parameter does not make it skippable.
function range(start = 0, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  return out;
}
// @ts-expect-error Expected 2 arguments, but got 1.
range(3);
console.log(range(undefined, 3).join(",")); // 0,1,2

// An optional parameter cannot come before a required one.
// Writing function bad(a?: number, b: number) {} gives error TS1016.

// Do not mark callback parameters optional unless the caller may really omit them.
type EachCallback = (item: string, index?: number) => void;
function each(items: string[], cb: EachCallback): void {
  items.forEach((item, i) => cb(item, i));
}
const seen: string[] = [];
each(["a", "b"], (item, index) => {
  // @ts-expect-error 'index' is possibly 'undefined'.
  seen.push(item + index.toFixed(0));
});
console.log(seen.join(" ")); // a0 b1`,
      },
    ],
  },
];

export default augments;
