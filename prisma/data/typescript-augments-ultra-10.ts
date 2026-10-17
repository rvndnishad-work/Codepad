/**
 * TYPESCRIPT ULTRA — batch 10: Type-level programming I (indexed access types, mapped
 * types, key remapping, conditional types, distributive conditional types and infer). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are indexed access types?`,
    difficulty: "medium",
    seoDescription: `Indexed access types like Person["name"] look up a property type by key: unions of keys, [number] for arrays, and the K extends keyof T pattern.`,
    description: `**Question presented to candidate:**
"TypeScript lets you write \`Person["name"]\` in a type. What is that, what can you put inside the brackets, and where would you actually use it?"

**What a strong answer should cover:**
- An indexed access type \`T[K]\` looks up the type of property \`K\` on type \`T\`, using element-access syntax at the type level (added with \`keyof\` in TypeScript 2.1)
- The index must be a type: a literal key, a union of keys (gives a union of property types), \`keyof T\` (all value types), \`number\` for array elements, or a literal index or \`"length"\` on a tuple
- \`T[K]\` is checked: a key that does not exist is error TS2339, and a value used as the key needs \`typeof\`
- The generic pattern \`K extends keyof T\` with return type \`T[K]\`, so getters and setters follow the key the caller passes
- Practical use: drilling into large generated or third-party types (\`Api["data"]["users"][number]\`) instead of re-declaring them
- Edge cases: optional properties include \`undefined\`, index signatures are indexed by their key type, a union of objects only exposes keys every member has

**Code / implementation expected:** Yes — derive a few types with \`T[K]\` and write a typed \`getProp<T, K extends keyof T>\`.`,
    answer: `**Target Audience:** Developers who know basic object types and want to reuse parts of existing types instead of copying them.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page is the building block. The [\`keyof\` and \`typeof\`](/interview-question/what-do-keyof-and-typeof-do-in-typescript) operators that usually feed it have their own page, and the most common applied recipe, turning an object's values into a union, is in [How do you get a union of an object's values as a type?](/interview-question/how-do-you-get-a-union-of-an-object-s-values-as-a-type)

## 1. Why This Even Matters — A Story First

Picture a big filing cabinet labelled **Person**. Each drawer has a label (\`name\`, \`age\`, \`address\`) and holds a certain kind of thing. If a colleague asks "what kind of thing is in the \`address\` drawer?", you do not build a second cabinet to answer: you open the drawer with that label and look.

In code, people often do the opposite. A function needs "the type of a user's address", so they write a new \`type Address = { city: string; zip: string }\` by hand. Now there are two copies, and the day someone adds \`country\` to the user type, the hand-written copy is silently out of date.

An **indexed access type** is "open the drawer with this label" for types. You write \`Person["address"]\` and TypeScript hands you exactly the type stored there, always in sync with the original.

## 2. The Core Idea

In JavaScript, \`person["age"]\` reads a **value** at run time. In a type position, \`Person["age"]\` reads a **type** at compile time. The syntax is the same; what moves through it is different.

~~~ts
interface Person {
  name: string;
  age: number;
  address: { city: string; zip: string };
  tags: string[];
}

type Name = Person["name"];               // string
type City = Person["address"]["city"];    // string  (chained)
~~~

📌 **Interview term: indexed access type** — the type \`T[K]\`, the type of property \`K\` of type \`T\`. Older TypeScript docs call it a **lookup type**; it arrived together with \`keyof\` in TypeScript 2.1 ([TypeScript 2.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The type Person indexed by the key age gives the property type number">
  <rect class="d-box" x="30" y="40" width="250" height="170" rx="10"/>
  <text class="d-text" x="155" y="72" text-anchor="middle">Person</text>
  <text class="d-sub" x="155" y="108" text-anchor="middle">name: string</text>
  <text class="d-accent" x="155" y="140" text-anchor="middle">age: number</text>
  <text class="d-sub" x="155" y="172" text-anchor="middle">address: object</text>
  <rect class="d-box-muted" x="340" y="95" width="110" height="60" rx="10"/>
  <text class="d-text" x="395" y="131" text-anchor="middle">key age</text>
  <rect class="d-box-accent" x="510" y="95" width="160" height="60" rx="10"/>
  <text class="d-text" x="590" y="131" text-anchor="middle">number</text>
  <line class="d-edge" x1="280" y1="125" x2="338" y2="125"/>
  <line class="d-edge-accent" x1="450" y1="125" x2="508" y2="125"/>
</svg>

The key goes in, the property type comes out. Nothing exists at run time: the whole lookup is erased.

## 3. What You Can Put Inside the Brackets

The thing inside the brackets must itself be a **type**. These are the forms you will meet:

| Index | Example | Result |
| :--- | :--- | :--- |
| One literal key | \`Person["name"]\` | \`string\` |
| A union of keys | \`Person["name" \\| "age"]\` | \`string \\| number\` |
| Every key | \`Person[keyof Person]\` | union of all property types |
| \`number\` on an array | \`Person["tags"][number]\` | \`string\` (the element type) |
| A literal index on a tuple | \`[string, boolean][1]\` | \`boolean\` |
| \`"length"\` on a tuple | \`[string, boolean]["length"]\` | \`2\` (a literal) |
| The key type of an index signature | \`Record<string, number>[string]\` | \`number\` |

A **union of keys** returns the **union of the matching property types**. That one rule is what makes \`T[keyof T]\` "all the value types".

📌 **Interview term: element type via \`[number]\`** — indexing an array or tuple type with \`number\` gives the union of its element types, e.g. \`(typeof LEVELS)[number]\` for a constant array.

### The key must be a type, not a value

~~~ts
const key = "age";
type ByValue = Person[key];         // error
type ByKey = Person[typeof key];    // number
~~~

~~~text
error TS2538: Type 'key' cannot be used as an index type.
error TS2749: 'key' refers to a value, but is being used as a type here. Did you mean 'typeof key'?
~~~

\`key\` is a variable (a value). \`typeof key\` is its type, the literal \`"age"\`, and that is a valid index.

### The key must exist

~~~ts
type Nope = Person["nope"];
~~~

~~~text
error TS2339: Property 'nope' does not exist on type 'Person'.
~~~

This is the main advantage over copying types by hand: rename a property and every \`T["oldName"]\` becomes a compile error you can fix.

## 4. The Generic Pattern: \`K extends keyof T\` and \`T[K]\`

Indexed access types become really useful with generics. The classic example is a property getter whose return type follows the key you pass:

~~~ts
function getProp<T, K extends keyof T>(obj: T, k: K): T[K] {
  return obj[k];
}
const age = getProp(ada, "age");               // number
const city = getProp(ada, "address").city;     // string
~~~

\`K extends keyof T\` restricts \`K\` to real keys of \`T\` (a [generic constraint](/interview-question/what-are-generic-constraints)). The return type \`T[K]\` is then resolved per call: \`"age"\` gives \`number\`, \`"address"\` gives the address object.

Drop the constraint and TypeScript refuses, because an arbitrary \`K\` might not be a key of \`T\`:

~~~text
error TS2536: Type 'K' cannot be used to index type 'T'.
~~~

The same idea works for writing. A setter typed \`v: T[K]\` only accepts a value that matches the key:

~~~ts
function setProp<T, K extends keyof T>(obj: T, k: K, v: T[K]): void { obj[k] = v; }
setProp(s, "size", 14);       // ok
setProp(s, "size", "big");    // error
~~~

~~~text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

📌 **Interview term: deferred indexed access** — inside a generic function, \`T[K]\` stays unresolved (written as \`T[K]\`) until a call supplies concrete \`T\` and \`K\`. That is why \`first<T extends unknown[]>(xs: T): T[0]\` returns \`string\` for a \`[string, number]\` argument.

## 5. The Everyday Use: Drilling Into Types You Do Not Own

Generated API clients, ORM models and library types are often one big nested type. Indexed access lets you name the piece you need without re-declaring it:

~~~ts
type ApiResponse = {
  data: { users: { id: number; email: string; roles: ("admin" | "user")[] }[] };
};
type User = ApiResponse["data"]["users"][number];   // one user object
type Role = User["roles"][number];                  // "admin" | "user"
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="Chained lookups: ApiResponse, then data, then users, then number gives one User">
  <rect class="d-box-muted" x="20" y="45" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="81" text-anchor="middle">ApiResponse</text>
  <rect class="d-box" x="200" y="45" width="130" height="60" rx="10"/>
  <text class="d-text" x="265" y="81" text-anchor="middle">data</text>
  <rect class="d-box" x="370" y="45" width="130" height="60" rx="10"/>
  <text class="d-text" x="435" y="81" text-anchor="middle">users</text>
  <rect class="d-box-accent" x="540" y="45" width="160" height="60" rx="10"/>
  <text class="d-text" x="620" y="72" text-anchor="middle">number</text>
  <text class="d-sub" x="620" y="94" text-anchor="middle">one User</text>
  <line class="d-edge" x1="160" y1="75" x2="198" y2="75"/>
  <line class="d-edge" x1="330" y1="75" x2="368" y2="75"/>
  <line class="d-edge-accent" x1="500" y1="75" x2="538" y2="75"/>
</svg>

Each bracket steps one level down; \`[number]\` steps from "array of users" to "one user".

## 6. Edge Cases

- **Optional properties include \`undefined\`.** For \`theme?: "dark" | "light"\`, \`Settings["theme"]\` is \`"dark" | "light" | undefined\`. Wrap it in \`NonNullable<...>\` if you want only the values.
- **Index signatures.** For \`Record<string, number>\` you index with the key type, \`[string]\`, and get \`number\`. With an index signature, any string literal also works: \`Dict["anything"]\` is the value type.
- **Unions of objects.** On \`Cat | Dog\`, \`Pet["kind"]\` works (both have \`kind\`) and gives \`"cat" | "dog"\`, but \`Pet["meows"]\` is \`error TS2339: Property 'meows' does not exist on type 'Pet'.\` because \`Dog\` has no \`meows\`. Narrow first or use \`Extract<Pet, { kind: "cat" }>["meows"]\`.
- **Types only.** A setter call that is wrong but suppressed (the example does this with \`// @ts-expect-error\`) still runs: the object ends up as \`{"size":"big","theme":"dark"}\`. Types are erased, so they guard compile time only.
- **Indexed access versus \`.\`** Type positions do not support dot access: write \`Person["address"]\`, never \`Person.address\` (that syntax means a namespace member).

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(38,23): error TS2538: Type 'key' cannot be used as an index type.
main.ts(38,23): error TS2749: 'key' refers to a value, but is being used as a type here. Did you mean 'typeof key'?
main.ts(42,20): error TS2339: Property 'nope' does not exist on type 'Person'.
main.ts(46,40): error TS2536: Type 'K' cannot be used to index type 'T'.
~~~

and for example 2:

~~~text
main.ts(19,18): error TS2339: Property 'meows' does not exist on type 'Pet'.
main.ts(43,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
~~~

Example 1, the forms of \`T[K]\` and the generic getter, prints:

~~~text
true true true true true true true true true
37 LONDON
string true
~~~

Example 2, edge cases and a typed setter, prints:

~~~text
true true true true true true true true
{"size":"big","theme":"dark"}
a 3
~~~

Every \`true\` is a compile-time \`Equal<...>\` check that tsc accepted, for instance that \`Person["tags"][number]\` is exactly \`string\` and that \`[string, boolean]["length"]\` is the literal \`2\`. The \`"big"\` in example 2 is the suppressed bad call actually running.

## Common Pitfalls

- **Using a value as the index.** \`Person[key]\` fails; write \`Person[typeof key]\`.
- **Dot syntax in a type.** \`Person.address\` is not an indexed access; use \`Person["address"]\`.
- **Forgetting \`K extends keyof T\`.** Without it, \`T[K]\` is error TS2536.
- **Using \`[keyof T]\` on an array.** \`keyof\` of an array includes \`length\` and the method names; use \`[number]\` for elements.
- **Forgetting the \`undefined\` of optional properties.** \`T["opt"]\` includes \`undefined\`; strip it with \`NonNullable\` if needed.
- **Indexing a union by a key only some members have.** It is an error; narrow or \`Extract\` the member first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An indexed access type, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K]</code>, looks up the type of property <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> on type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. It is element-access syntax at the type level, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Person["age"]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What goes in the brackets:</strong> <span style="color:#f0e2c8;">Any type that is a key: a literal, a union of keys (which gives a union of property types), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code> for all value types, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> for array elements, or a literal index or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"length"</code> on a tuple.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. It is checked:</strong> <span style="color:#f0e2c8;">A missing key is a compile error, and a variable must be turned into a type with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> first. Renaming a property breaks every lookup, which is what you want.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. With generics:</strong> <span style="color:#f0e2c8;">The key pattern is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T, K extends keyof T&gt;(obj: T, k: K): T[K]</code>: the return type follows whichever key the caller passes, and the same works for typed setters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where I use it:</strong> <span style="color:#f0e2c8;">Mostly to drill into big generated or library types, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Api["data"]["users"][number]</code>, so I never keep hand-written copies that drift out of date.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Person[keyof Person]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The union of all property value types of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Person</code>, because indexing with a union of keys returns the union of the matching property types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the element type of an array type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Index it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[][number]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(typeof LEVELS)[number]</code> on an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> array gives the literal union.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">function get&lt;T, K&gt;(o: T, k: K): T[K]</code> not compile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof T</code>, TypeScript cannot know <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> is a key of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, so it reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Type 'K' cannot be used to index type 'T'</code> (TS2536).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Settings["theme"]</code> give for an optional <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">theme?: string</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | undefined</code>. Optional properties include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> in their indexed access type; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NonNullable&lt;Settings["theme"]&gt;</code> strips it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you index a union of object types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with a key every member has. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pet["kind"]</code> works and gives the union of the kinds, but a key unique to one member is error TS2339, so I narrow with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract</code> first.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Indexed access type | \`T[K]\`: the type of property \`K\` of \`T\` (also called a lookup type) |
| Element type via \`[number]\` | Indexing an array or tuple type with \`number\` gives the union of its element types |
| Deferred indexed access | Inside a generic, \`T[K]\` stays unresolved until a call supplies \`T\` and \`K\` |

**Conclusion:** An indexed access type is "open the drawer with this label" for types: \`T[K]\` returns the type stored under key \`K\`, a union of keys returns a union of types, \`[number]\` returns array elements, and every lookup is checked against the real keys. Combined with \`K extends keyof T\` it gives accessors whose return type follows the key, and on its own it lets you name any piece of a large type without copying it. It is also the \`T[K]\` you write inside every [mapped type](/interview-question/what-are-mapped-types), which is the next step.`,
    examples: [
      {
        label: `The forms of T[K] and a generic getter`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface Person {
  name: string;
  age: number;
  address: { city: string; zip: string };
  tags: string[];
}

// 1. One key: the type of that property
type Name = Person["name"];
const n1: Equal<Name, string> = true;

// 2. A union of keys gives a union of property types
type NameOrAge = Person["name" | "age"];
const n2: Equal<NameOrAge, string | number> = true;

// 3. Every key: the union of all value types
type AnyValue = Person[keyof Person];
const n3: Equal<AnyValue, string | number | string[] | { city: string; zip: string }> = true;

// 4. Chaining goes deeper, [number] gives an array element
type City = Person["address"]["city"];
type Tag = Person["tags"][number];
const n4: Equal<City, string> = true;
const n5: Equal<Tag, string> = true;

// 5. Tuples: a literal index and "length"
type Pair = [string, boolean];
const n6: Equal<Pair[1], boolean> = true;
const n7: Equal<Pair["length"], 2> = true;

// 6. The key must be a type, not a value
const key = "age";
type ByKey = Person[typeof key];
const n8: Equal<ByKey, number> = true;
// @ts-expect-error key is a value; a type position needs typeof key
type ByValue = Person[key];

// 7. A key that does not exist is a compile error
// @ts-expect-error Property nope does not exist on Person
type Nope = Person["nope"];

// 8. Without a constraint, K is not known to be a key of T
// @ts-expect-error K cannot be used to index T
function getLoose<T, K>(obj: T, k: K): T[K] {
  return obj[k as unknown as keyof T] as never;
}

// 9. The generic accessor: the return type follows the key
function getProp<T, K extends keyof T>(obj: T, k: K): T[K] {
  return obj[k];
}
const ada: Person = { name: "Ada", age: 36, address: { city: "London", zip: "N1" }, tags: ["math"] };
const age = getProp(ada, "age");
const city = getProp(ada, "address").city;
const n9: Equal<typeof age, number> = true;

console.log(n1, n2, n3, n4, n5, n6, n7, n8, n9);
console.log(age + 1, city.toUpperCase());
console.log(typeof getProp(ada, "name"), Array.isArray(getProp(ada, "tags")));`,
      },
      {
        label: `Edge cases: optional keys, index signatures, unions and a typed setter`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Optional properties include undefined
interface Settings { theme?: "dark" | "light"; size: number }
const e1: Equal<Settings["theme"], "dark" | "light" | undefined> = true;

// 2. Index signatures: index with the signature key type
type Scores = Record<string, number>;
const e2: Equal<Scores[string], number> = true;
type Dict = { [id: string]: boolean };
const e3: Equal<Dict["anything"], boolean> = true;

// 3. A union of objects: only keys present in every member
type Cat = { kind: "cat"; meows: boolean };
type Dog = { kind: "dog"; barks: boolean };
type Pet = Cat | Dog;
const e4: Equal<Pet["kind"], "cat" | "dog"> = true;
// @ts-expect-error meows is not on every member of the union
type Meows = Pet["meows"];

// 4. Digging into an API response type you do not own
type ApiResponse = {
  data: { users: { id: number; email: string; roles: ("admin" | "user")[] }[] };
};
type User = ApiResponse["data"]["users"][number];
type Role = User["roles"][number];
const e5: Equal<User["id"], number> = true;
const e6: Equal<Role, "admin" | "user"> = true;

// 5. Arrays of constants: element union with [number]
const LEVELS = ["debug", "info", "warn"] as const;
type Level = (typeof LEVELS)[number];
const e7: Equal<Level, "debug" | "info" | "warn"> = true;

// 6. A typed setter: the value must match the key
function setProp<T, K extends keyof T>(obj: T, k: K, v: T[K]): void {
  obj[k] = v;
}
const s: Settings = { size: 12 };
setProp(s, "theme", "dark");
setProp(s, "size", 14);
// @ts-expect-error size is a number, not a string
setProp(s, "size", "big");

// 7. Indexed access on a generic stays deferred until T is known
function first<T extends unknown[]>(xs: T): T[0] {
  return xs[0];
}
const f = first(["a", 1] as [string, number]);
const e8: Equal<typeof f, string> = true;

console.log(e1, e2, e3, e4, e5, e6, e7, e8);
console.log(JSON.stringify(s));
console.log(f, LEVELS.length);`,
      },
    ],
  },
  {
    title: `What are mapped types?`,
    difficulty: "medium",
    seoDescription: `Mapped types loop over keys with { [K in keyof T]: ... } to build Partial, Readonly and Record, add or remove modifiers, and keep tuple shapes.`,
    description: `**Question presented to candidate:**
"What is a mapped type in TypeScript? Show me how you would write \`Partial\` or \`Readonly\` yourself, and tell me what else mapped types can do."

**What a strong answer should cover:**
- Syntax \`{ [K in Keys]: Type }\`: a type-level loop over a union of keys that produces one property per key, usually \`[K in keyof T]: T[K]\`
- Changing value types (\`T[K] | null\`, functions per property) and the modifiers: adding \`?\` / \`readonly\`, removing them with \`-?\` / \`-readonly\` (the \`+\`/\`-\` syntax arrived in TypeScript 2.8)
- That \`Partial\`, \`Required\`, \`Readonly\`, \`Record\` and \`Pick\` are mapped types in the standard library
- Homomorphic mapped types (\`in keyof T\`, or \`K extends keyof T\`) copy the original modifiers, work element-wise on arrays and tuples, and distribute over unions; mapping over an unrelated key union does not keep modifiers
- Mapped types are compile-time only: building the matching run-time object still needs a loop (and usually one cast); \`readonly\` is not enforced at run time
- Key remapping with \`as\` exists for renaming or filtering keys (its own topic)

**Code / implementation expected:** Yes — implement \`Partial\`, \`Readonly\` or a \`Mutable\` helper with a mapped type.`,
    answer: `**Target Audience:** Developers comfortable with \`keyof\` and indexed access types who want to transform whole object types.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

Mapped types are built from two pieces with their own pages: [\`keyof\`](/interview-question/what-do-keyof-and-typeof-do-in-typescript) for the keys and [indexed access types](/interview-question/what-are-indexed-access-types) (\`T[K]\`) for the values. Renaming and filtering keys with \`as\` is covered in [What is key remapping in mapped types?](/interview-question/what-is-key-remapping-in-mapped-types)

## 1. Why This Even Matters — A Story First

A school has a form with fields for name, age and email. For the **draft** version of the form, every field becomes optional. For the **printed, signed** version, every field becomes read-only. For the **error report**, every field becomes "an error message or nothing".

Nobody redesigns the form three times. You take the original and apply one rule to every field: "make it optional", "make it read-only", "replace it with a message". A **mapped type** is that rule written once: it walks over every key of a type and produces a new property for each, so the three variants stay in sync with the original form forever.

## 2. The Core Idea: A Loop Over Keys

~~~ts
type Copy<T> = { [K in keyof T]: T[K] };
~~~

Read it as: "for each key \`K\` in \`keyof T\`, make a property \`K\` whose type is \`T[K]\`". The part in brackets is the loop; after the colon is what each property becomes.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="A mapped type takes each key of the input type, applies one rule, and produces one property per key">
  <rect class="d-box" x="30" y="40" width="200" height="180" rx="10"/>
  <text class="d-text" x="130" y="72" text-anchor="middle">User</text>
  <text class="d-sub" x="130" y="110" text-anchor="middle">id: number</text>
  <text class="d-sub" x="130" y="145" text-anchor="middle">name: string</text>
  <text class="d-sub" x="130" y="180" text-anchor="middle">email: string</text>
  <rect class="d-box-muted" x="280" y="95" width="170" height="70" rx="10"/>
  <text class="d-text" x="365" y="125" text-anchor="middle">for each K</text>
  <text class="d-sub" x="365" y="148" text-anchor="middle">T[K] or null</text>
  <rect class="d-box-accent" x="500" y="40" width="200" height="180" rx="10"/>
  <text class="d-text" x="600" y="72" text-anchor="middle">Nullable User</text>
  <text class="d-sub" x="600" y="110" text-anchor="middle">id: number or null</text>
  <text class="d-sub" x="600" y="145" text-anchor="middle">name: string or null</text>
  <text class="d-sub" x="600" y="180" text-anchor="middle">email: string or null</text>
  <line class="d-edge" x1="230" y1="130" x2="278" y2="130"/>
  <line class="d-edge-accent" x1="450" y1="130" x2="498" y2="130"/>
</svg>

One rule in the middle, applied to every key: add a property later to \`User\` and the mapped version gains it automatically.

📌 **Interview term: mapped type** — a type of the form \`{ [K in Keys]: Type }\` that creates one property for each member of the key union \`Keys\`. Mapped types were introduced in TypeScript 2.1 ([TypeScript 2.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)).

## 3. Changing the Value Type

The value side can be any type, and it can use \`K\` and \`T[K]\`:

~~~ts
type Stringify<T> = { [K in keyof T]: string };
type Nullable<T>  = { [K in keyof T]: T[K] | null };
type Validators<T> = { [K in keyof T]: (value: T[K]) => boolean };
~~~

\`Validators<T>\` is a nice real-world one: it gives you a table with one checker per field, and each checker's parameter is typed as that field's type, so \`name: (v) => v.trim().length > 0\` knows \`v\` is a \`string\` without any annotation. The example runs it on \`{ id: 7, name: "  " }\` and prints \`failed: ["name"]\`.

## 4. Modifiers: Adding and Removing \`?\` and \`readonly\`

Put \`?\` after the brackets or \`readonly\` before them to add a modifier to every property. That is all the standard \`Partial\` and \`Readonly\` are:

~~~ts
type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
~~~

A \`-\` removes a modifier, which is how \`Required\` works and how you write the (not built-in) \`Mutable\`:

~~~ts
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type Mutable<T>    = { -readonly [K in keyof T]: T[K] };
~~~

The example proves \`MyPartial<User>\` equals \`Partial<User>\`, \`MyReadonly<User>\` equals \`Readonly<User>\` and \`MyRequired<User>\` equals \`Required<User>\`. Writing to a \`readonly\` property is rejected:

~~~text
error TS2540: Cannot assign to 'count' because it is a read-only property.
~~~

📌 **Interview term: mapping modifiers** — \`?\` and \`readonly\` in a mapped type, with an optional \`+\` (add, the default) or \`-\` (remove) prefix. The explicit \`+\`/\`-\` syntax was added in TypeScript 2.8 ([TypeScript 2.8 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-2-8-2/)).

| Modifier | Effect | Standard helper |
| :--- | :--- | :--- |
| \`?\` (or \`+?\`) | every property optional | \`Partial<T>\` |
| \`-?\` | every property required | \`Required<T>\` |
| \`readonly\` (or \`+readonly\`) | every property read-only | \`Readonly<T>\` |
| \`-readonly\` | read-only removed | none (write \`Mutable<T>\` yourself) |

## 5. Mapping Over Any Union of Keys

The keys do not have to come from \`keyof\`. Any union of string, number or symbol literal types works:

~~~ts
type Flags = { [K in "darkMode" | "beta"]: boolean };
// same as Record<"darkMode" | "beta", boolean>
~~~

That is exactly how the standard \`Record<K, T>\` is defined (see [What is the Record utility type?](/interview-question/what-is-the-record-utility-type)). The overview of the standard helpers is in [What are utility types like Partial, Pick, and Omit?](/interview-question/what-are-utility-types-like-partial-pick-and-omit)

## 6. Homomorphic Mapped Types: The Detail Interviewers Probe

When the loop is \`in keyof T\` for a type parameter \`T\` (or over \`K\` where \`K extends keyof T\`), TypeScript treats the mapped type as a transformation **of** \`T\`. It is called **homomorphic** ("same shape"), and it gets three extra behaviours:

1. **It copies the original modifiers.** \`{ [K in keyof T]: T[K] }\` on \`{ readonly host: string; port?: number }\` keeps \`readonly host\` and \`port?\`. If you compute the keys separately (\`type Keys = keyof Config\` and then \`[K in Keys]\`), the modifiers are lost and you get \`{ host: string; port: number | undefined }\`. This is also why \`Pick<T, K>\` keeps \`?\`: its \`K extends keyof T\`.
2. **Arrays and tuples stay arrays and tuples.** \`Boxed<[string, number]>\` is the tuple \`[{ value: string }, { value: number }]\`, not an object with \`push\`, \`length\` and friends; \`Partial<[string, number]>\` is \`[string?, number?]\`. This behaviour arrived in TypeScript 3.1 ([TypeScript 3.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html)).
3. **It distributes over unions and passes primitives through.** \`Partial<A | B>\` is \`Partial<A> | Partial<B>\`, and \`Partial<string>\` is just \`string\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Homomorphic mapping over keyof T keeps modifiers; mapping over a separate key union drops them">
  <rect class="d-box" x="240" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="350" y="45" text-anchor="middle">Config</text>
  <text class="d-sub" x="350" y="66" text-anchor="middle">readonly host, port optional</text>
  <rect class="d-box-accent" x="30" y="160" width="280" height="70" rx="10"/>
  <text class="d-text" x="170" y="188" text-anchor="middle">K in keyof T</text>
  <text class="d-sub" x="170" y="211" text-anchor="middle">modifiers kept</text>
  <rect class="d-box-muted" x="390" y="160" width="280" height="70" rx="10"/>
  <text class="d-text" x="530" y="188" text-anchor="middle">K in a separate union</text>
  <text class="d-sub" x="530" y="211" text-anchor="middle">modifiers lost</text>
  <line class="d-edge-accent" x1="300" y1="80" x2="190" y2="158"/>
  <line class="d-edge-dashed" x1="400" y1="80" x2="510" y2="158"/>
</svg>

The example checks each of these with \`Equal\`, all \`true\`.

📌 **Interview term: homomorphic mapped type** — a mapped type of the form \`{ [K in keyof T]: ... }\` (or over \`K extends keyof T\`) for a type parameter \`T\`; it preserves \`T\`'s property modifiers, maps arrays and tuples element-wise and distributes over unions.

## 7. The Run-Time Side

A mapped type describes an object; it does not build one. To create the matching value you loop at run time, and because TypeScript cannot follow a loop that fills an object key by key, the usual implementation has one cast at the start:

~~~ts
function mapValues<T extends object, R>(obj: T, fn: (v: T[keyof T]) => R): { [K in keyof T]: R } {
  const out = {} as { [K in keyof T]: R };
  for (const k in obj) out[k] = fn(obj[k]);
  return out;
}
mapValues({ a: "x", b: "yyy" }, (s) => s.length);   // type { a: number; b: number }
~~~

It prints \`{"a":1,"b":3}\`. Two more run-time facts: \`readonly\` is erased, so the example's \`frozen.count\` assignment (suppressed with \`// @ts-expect-error\`) really sets it to \`2\`; and for tuples, \`Array.prototype.map\` produces exactly what the homomorphic mapped type describes, an array of the same length.

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(34,8): error TS2540: Cannot assign to 'count' because it is a read-only property.
~~~

Example 2 has no directives and compiles cleanly.

Example 1, value types and modifiers, prints:

~~~text
true true true true true true true true
2
failed: ["name"]
~~~

Example 2, homomorphic behaviour and the run-time side, prints:

~~~text
true true true true true true true true true
{"a":1,"b":3}
[{"value":"id"},{"value":42}] 2
~~~

Each \`true\` is a compile-time \`Equal\` check, for instance that a mapping over a separate key union produces \`{ host: string; port: number | undefined }\` with both modifiers gone.

## Common Pitfalls

- **Computing the keys separately and losing modifiers.** \`[K in Keys]\` over a precomputed \`type Keys = keyof Config\`, or over a separate type parameter \`Keys = keyof T\`, is not homomorphic (both checked in a scratch run with 5.4.5); write \`[K in keyof T]\` directly.
- **Expecting deep transformation.** \`Partial<T>\` and \`Readonly<T>\` are one level deep; nested objects need a recursive type (see [How would you build a DeepPartial type?](/interview-question/how-would-you-build-a-deeppartial-type)).
- **Thinking \`readonly\` freezes the object.** It is compile-time only; use \`Object.freeze\` for a run-time guarantee.
- **Using \`interface\` syntax.** A mapped type can only be written as a \`type\` alias; \`interface I { [K in "a"]: string }\` fails with \`error TS7061: A mapped type may not declare properties or methods.\` (scratch run, 5.4.5).
- **Trying to rename keys with \`[K in keyof T]\` alone.** Renaming and filtering need the \`as\` clause.
- **Expecting the run-time loop to be checked.** Building the matching object needs a cast; test that code, the type will not catch a missed key.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A mapped type is a loop over keys at the type level: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [K in keyof T]: T[K] }</code> creates one property for each key of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, and I can change the value type, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K] | null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Modifiers:</strong> <span style="color:#f0e2c8;">I can add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> to every property, or remove them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-?</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-readonly</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Required</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly</code> are exactly these one-liners, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Mutable</code> is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-readonly</code> version.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Any key union:</strong> <span style="color:#f0e2c8;">The keys can be any union of literals, not just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [K in "a" | "b"]: boolean }</code> is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record</code> works.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Homomorphic:</strong> <span style="color:#f0e2c8;">When it maps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code> directly, it is homomorphic: it keeps the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code>, keeps arrays and tuples as arrays and tuples, and distributes over unions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">It is compile time only and one level deep, so deep variants need recursion, and building the matching run-time object still needs a loop and usually a cast. For renaming or filtering keys I add an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> clause.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Required&lt;T&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [K in keyof T]-?: T[K] }</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-?</code> removes the optional modifier and also drops the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> that came from it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ [K in Keys]: Config[K] }</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type Keys = keyof Config</code> lose the optional modifiers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is no longer homomorphic: TypeScript only copies modifiers when the mapping is directly over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code> or over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof T</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Partial&lt;[string, number]&gt;</code> give?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tuple <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string?, number?]</code>. Homomorphic mapped types map arrays and tuples element-wise instead of turning them into objects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code> object immutable at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> is erased; it only stops assignments at compile time. For run-time protection use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a mapped type and an index signature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An index signature, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [key: string]: T }</code>, allows any key of that type. A mapped type, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [K in "a" | "b"]: T }</code>, produces a fixed set of named properties, one per member of the union.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Mapped type | \`{ [K in Keys]: Type }\`: one property per member of the key union |
| Mapping modifiers | \`?\` and \`readonly\`, added with \`+\` (default) or removed with \`-\` |
| Homomorphic mapped type | A mapping over \`keyof T\` that keeps modifiers, maps tuples element-wise and distributes over unions |

**Conclusion:** A mapped type is a loop over keys: it takes a union of keys, applies one rule to each and produces a new object type, which is all \`Partial\`, \`Required\`, \`Readonly\`, \`Record\` and \`Pick\` are. You control the value type and the \`?\` / \`readonly\` modifiers (adding or removing them), and when the loop is directly over \`keyof T\` the mapping is homomorphic, preserving modifiers and tuple shapes. Remember that it shapes types only, one level deep, and pair it with [key remapping](/interview-question/what-is-key-remapping-in-mapped-types) and [conditional types](/interview-question/what-are-conditional-types) for anything that needs to rename, filter or decide per property.`,
    examples: [
      {
        label: `Value types, modifiers and your own Partial, Readonly and Mutable`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface User { id: number; name: string; email?: string; readonly createdAt: string }

// 1. The basic shape: for each key K of T, a property of type T[K]
type Copy<T> = { [K in keyof T]: T[K] };
const m1: Equal<Copy<User>, User> = true;

// 2. Changing the value type
type Stringify<T> = { [K in keyof T]: string };
type Nullable<T> = { [K in keyof T]: T[K] | null };
const m2: Equal<Stringify<{ a: number; b: boolean }>, { a: string; b: string }> = true;
const m3: Equal<Nullable<{ a: number }>, { a: number | null }> = true;

// 3. Adding modifiers: our own Partial and Readonly
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
const m4: Equal<MyPartial<User>, Partial<User>> = true;
const m5: Equal<MyReadonly<User>, Readonly<User>> = true;

// 4. Removing modifiers with a minus sign
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
const m6: Equal<MyRequired<User>, Required<User>> = true;
const m7: Equal<Mutable<User>["createdAt"], string> = true;

// 5. Mapping over a plain union of keys (this is how Record works)
type Flags = { [K in "darkMode" | "beta"]: boolean };
const m8: Equal<Flags, Record<"darkMode" | "beta", boolean>> = true;

// 6. Readonly is enforced
const frozen: MyReadonly<{ count: number }> = { count: 1 };
// @ts-expect-error count is read-only
frozen.count = 2;

// 7. A function type per property: a typed validator table
type Validators<T> = { [K in keyof T]: (value: T[K]) => boolean };
const userRules: Validators<Pick<User, "id" | "name">> = {
  id: (v) => Number.isInteger(v) && v > 0,
  name: (v) => v.trim().length > 0,
};
function check<T>(rules: Validators<T>, obj: T): string[] {
  const failed: string[] = [];
  for (const k in rules) if (!rules[k](obj[k])) failed.push(k);
  return failed;
}
const failed = check(userRules, { id: 7, name: "  " });

console.log(m1, m2, m3, m4, m5, m6, m7, m8);
console.log(frozen.count);
console.log("failed:", JSON.stringify(failed));`,
      },
      {
        label: `Homomorphic mapped types and the run-time side`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface Config { readonly host: string; port?: number }

// 1. Homomorphic (in keyof T): the ? and readonly modifiers are copied
type Same<T> = { [K in keyof T]: T[K] };
const h1: Equal<Same<Config>, { readonly host: string; port?: number }> = true;

// 2. Not homomorphic (keys from a separate union): modifiers are lost
type Keys = keyof Config;
type Loose = { [K in Keys]: Config[K] };
const h2: Equal<Loose, { host: string; port: number | undefined }> = true;

// 3. K extends keyof T also counts, which is why Pick keeps modifiers
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
const h3: Equal<MyPick<Config, "port">, { port?: number }> = true;

// 4. Arrays and tuples stay arrays and tuples
type Boxed<T> = { [K in keyof T]: { value: T[K] } };
type BoxedPair = Boxed<[string, number]>;
const h4: Equal<BoxedPair, [{ value: string }, { value: number }]> = true;
const h5: Equal<Partial<[string, number]>, [string?, number?]> = true;
const h6: Equal<Readonly<string[]>, readonly string[]> = true;

// 5. Homomorphic mapped types distribute over a union of objects
type A = { a: number };
type B = { b: string };
const h7: Equal<Partial<A | B>, Partial<A> | Partial<B>> = true;

// 6. A primitive passes through unchanged
const h8: Equal<Partial<string>, string> = true;

// 7. Mapped types are not checked against your run-time code:
// building the value still needs a loop and usually one cast
function mapValues<T extends object, R>(obj: T, fn: (v: T[keyof T]) => R): { [K in keyof T]: R } {
  const out = {} as { [K in keyof T]: R };
  for (const k in obj) out[k] = fn(obj[k]);
  return out;
}
const lengths = mapValues({ a: "x", b: "yyy" }, (s) => s.length);
const h9: Equal<typeof lengths, { a: number; b: number }> = true;

// 8. Tuples at run time: the mapped type matches what Array.map does
const pair: [string, number] = ["id", 42];
const boxed = pair.map((value) => ({ value })) as BoxedPair;

console.log(h1, h2, h3, h4, h5, h6, h7, h8, h9);
console.log(JSON.stringify(lengths));
console.log(JSON.stringify(boxed), boxed.length);`,
      },
    ],
  },
  {
    title: `What is key remapping in mapped types?`,
    difficulty: "hard",
    seoDescription: `Key remapping adds an as clause to a mapped type to rename keys with template literals, drop keys by mapping them to never, or key by a field.`,
    description: `**Question presented to candidate:**
"In a mapped type you can write \`as\` after the key. What does that do? Show me how you would generate getter names like \`getName\` from a \`Person\` type, and how you would drop some keys."

**What a strong answer should cover:**
- The \`as\` clause, \`{ [K in keyof T as NewKey]: ... }\`, computes the output key from each input key; added in TypeScript 4.1 together with template literal types
- Renaming with template literal types and the intrinsic string helpers: \`\` \`get\${Capitalize<string & K>}\` \`\`, and why \`string & K\` is needed (keys can be \`number\` or \`symbol\`)
- Filtering: a key remapped to \`never\` is dropped, by key (\`Exclude<K, "kind">\`) or by value (\`T[K] extends V ? K : never\`)
- Mapping over a union of objects rather than keys, e.g. an event union to an \`onClick\` / \`onKey\` handler map
- Behaviour details: modifiers are still copied from \`keyof T\`, keys that collide merge into a union, and a filtering \`as\` turns an array or tuple into an object of all its members
- The run-time object still has to be built by hand with matching names

**Code / implementation expected:** Yes — a \`Getters<T>\` type and a filter that keeps only properties of a given value type.`,
    answer: `**Target Audience:** Developers who can write a basic mapped type and want to rename or filter keys while mapping.
**Difficulty:** Hard
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page assumes [mapped types](/interview-question/what-are-mapped-types). The string tricks used for new names (\`\` \`get\${...}\` \`\`, \`Capitalize\`) are [template literal types](/interview-question/what-are-template-literal-types), and the filters use [conditional types](/interview-question/what-are-conditional-types); each has its own page.

## 1. Why This Even Matters — A Story First

A label printer in a warehouse goes through every box on a shelf. A plain mapped type is a printer that can only reprint the **same** label with different contents. Key remapping gives the printer two new powers: it can print a **different** label (box \`name\` becomes \`getName\`), and it can **skip** a box entirely (no label printed means the box is not on the new shelf).

Before TypeScript 4.1 neither power existed in a mapped type: the output keys were exactly the input keys. People combined \`Pick\`, \`Omit\` and hand-written names. With the \`as\` clause, renaming and filtering happen in the same loop that builds the type.

## 2. The Core Idea: \`as\` Computes the New Key

~~~ts
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type PersonGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }
~~~

The loop still runs over \`K in keyof T\`, and the value side still uses the **original** \`K\` (\`T[K]\`). Only the property name in the output comes from the expression after \`as\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Each key goes through the as clause: name becomes getName, age becomes getAge, kind maps to never and is dropped">
  <rect class="d-box" x="30" y="20" width="150" height="50" rx="10"/>
  <text class="d-text" x="105" y="51" text-anchor="middle">name</text>
  <rect class="d-box" x="30" y="95" width="150" height="50" rx="10"/>
  <text class="d-text" x="105" y="126" text-anchor="middle">age</text>
  <rect class="d-box" x="30" y="170" width="150" height="50" rx="10"/>
  <text class="d-text" x="105" y="201" text-anchor="middle">kind</text>
  <rect class="d-box-muted" x="260" y="80" width="190" height="80" rx="10"/>
  <text class="d-text" x="355" y="113" text-anchor="middle">as clause</text>
  <text class="d-sub" x="355" y="138" text-anchor="middle">new name or never</text>
  <rect class="d-box-accent" x="540" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="620" y="51" text-anchor="middle">getName</text>
  <rect class="d-box-accent" x="540" y="95" width="160" height="50" rx="10"/>
  <text class="d-text" x="620" y="126" text-anchor="middle">getAge</text>
  <rect class="d-box-muted" x="540" y="170" width="160" height="50" rx="10"/>
  <text class="d-sub" x="620" y="201" text-anchor="middle">dropped</text>
  <line class="d-edge" x1="180" y1="45" x2="258" y2="100"/>
  <line class="d-edge" x1="180" y1="120" x2="258" y2="120"/>
  <line class="d-edge" x1="180" y1="195" x2="258" y2="140"/>
  <line class="d-edge-accent" x1="450" y1="100" x2="538" y2="45"/>
  <line class="d-edge-accent" x1="450" y1="120" x2="538" y2="120"/>
  <line class="d-edge-dashed" x1="450" y1="140" x2="538" y2="195"/>
</svg>

Every input key passes through the \`as\` expression. A string comes out as the new property name; \`never\` comes out as "no property".

📌 **Interview term: key remapping** — the \`as\` clause in a mapped type, \`{ [K in Keys as NewKey]: Type }\`, which computes each output property name from \`K\`. Introduced in TypeScript 4.1 ([TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html)).

## 3. Renaming: Template Literals and \`string & K\`

The name is usually built with a template literal type and one of the intrinsic string helpers (\`Capitalize\`, \`Uncapitalize\`, \`Uppercase\`, \`Lowercase\`). Why \`string & K\` and not just \`K\`? Because \`keyof T\` is \`string | number | symbol\` in general, and \`Capitalize\` only accepts strings. Without it:

~~~ts
type Broken<T> = { [K in keyof T as \`get\${Capitalize<K>}\`]: T[K] };
~~~

~~~text
error TS2344: Type 'K' does not satisfy the constraint 'string'.
  Type 'keyof T' is not assignable to type 'string'.
    Type 'string | number | symbol' is not assignable to type 'string'.
      Type 'number' is not assignable to type 'string'.
~~~

\`string & K\` keeps the string keys and turns number and symbol keys into \`never\`, so they are **dropped**. The example proves it: for \`{ name: string; 0: boolean; [ID]: number }\`, \`keyof Getters<Mixed>\` is only \`"getName"\`. If you want numeric keys too, intersect with \`string | number\` and skip \`Capitalize\`: \`\` \`get_\${K & (string | number)}\` \`\` gives \`"get_name" | "get_0"\` (scratch run, 5.4.5).

Generated names are fully checked. Misspell one and TypeScript even suggests the right one:

~~~text
error TS2551: Property 'getname' does not exist on type 'Getters<Person>'. Did you mean 'getName'?
~~~

📌 **Interview term: intrinsic string manipulation types** — the built-in \`Uppercase<S>\`, \`Lowercase<S>\`, \`Capitalize<S>\` and \`Uncapitalize<S>\`, implemented inside the compiler and commonly used in \`as\` clauses.

## 4. Filtering: Remap to \`never\`

Returning \`never\` from the \`as\` clause removes the key. Filter **by key**:

~~~ts
type WithoutKind<T> = { [K in keyof T as Exclude<K, "kind">]: T[K] };
~~~

or **by value type**, with a conditional type on \`T[K]\`:

~~~ts
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
PickByValue<Person, string>;   // { name: string; kind: "person" }
~~~

You can rename and filter in one go: \`Setters<T>\` in the example keeps only the string-typed fields and calls them \`setName\` and \`setKind\`.

📌 **Interview term: key filtering** — dropping properties in a mapped type by mapping their key to \`never\` in the \`as\` clause.

### Why not just \`Omit\`?

\`WithoutKind<T>\` gives the same result as \`Omit<T, "kind">\`. The difference shows up when you need a condition on the value (\`Omit\` only takes keys) or need rename and filter at once. Many codebases still use \`Pick\`/\`Omit\` for simple cases because they read better.

## 5. Mapping Over Things That Are Not Keys

Since the output key comes from \`as\`, the loop variable no longer has to be a key at all. You can iterate over a **union of objects** and key each one by a field:

~~~ts
type Events =
  | { type: "click"; x: number; y: number }
  | { type: "key"; code: string };
type Handlers = { [E in Events as \`on\${Capitalize<E["type"]>}\`]: (e: E) => string };
// { onClick: (e: click event) => string; onKey: (e: key event) => string }
~~~

Each handler's parameter is the matching member of the union, so \`e.x\` is allowed in \`onClick\` and \`e.code\` in \`onKey\`. The example dispatches both events and prints \`click at 3,4\` and \`key Enter\`.

## 6. Behaviour Details

| Situation | What happens (checked in the examples) |
| :--- | :--- |
| \`?\` and \`readonly\` on the source keys | copied: \`{ readonly id; note? }\` becomes \`{ readonly db_id; db_note? }\` |
| \`as\` returns a union | one key becomes several: \`K \\| \${K}Changed\` gives \`x\` and \`xChanged\` |
| two keys map to the same name | merged into one property whose type is the union: \`{ all: number \\| string }\` |
| \`number\` / \`symbol\` keys with \`string & K\` | dropped |
| array or tuple input with a filtering \`as\` | becomes a plain object of every array member, not a tuple |

The last row deserves a note. A plain homomorphic mapped type maps a tuple element-wise: \`Wrap<[string, number]>\` is \`[{ v: string }, { v: number }]\`. Add an \`as\` clause that filters (\`K extends "push" ? never : K\`) and the result is no longer an array: it is an object where even \`length\` became \`{ v: 2 }\` and every remaining method name is a key. To get just the elements as an object, keep the numeric string keys: \`\` K extends \`\${number}\` ? K : never \`\` gives \`{ "0": string; "1": number }\`.

## 7. The Run-Time Side

Remapped names exist only in the type. The object that matches them has to be built with the same naming rule:

~~~ts
function makeGetters<T extends object>(obj: T): Getters<T> {
  const out: Record<string, () => unknown> = {};
  for (const k of Object.keys(obj) as (keyof T & string)[]) {
    out["get" + k[0].toUpperCase() + k.slice(1)] = () => obj[k];
  }
  return out as Getters<T>;
}
~~~

The cast at the end is the honest admission that TypeScript cannot prove the string concatenation matches the template literal type, so test this function.

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(29,12): error TS2551: Property 'getname' does not exist on type 'Getters<Person>'. Did you mean 'getName'?
~~~

and for example 2:

~~~text
main.ts(9,54): error TS2344: Type 'K' does not satisfy the constraint 'string'.
  Type 'keyof T' is not assignable to type 'string'.
    Type 'string | number | symbol' is not assignable to type 'string'.
      Type 'number' is not assignable to type 'string'.
~~~

Example 1, renaming and filtering, prints:

~~~text
true true true true true
Ada 37 person
["getName","getAge","getKind"]
~~~

Example 2, edge cases and an event-handler map, prints:

~~~text
true true true true true true true true true
click at 3,4
key Enter
~~~

Each \`true\` is a compile-time \`Equal\` check; for example the eighth in example 2 proves \`length\` became \`{ v: 2 }\` under a filtering \`as\` clause.

## Common Pitfalls

- **Forgetting \`string & K\`.** \`Capitalize<K>\` on \`keyof T\` is error TS2344, because keys can be numbers or symbols.
- **Using the new key on the value side.** Inside the mapping, \`K\` is still the original key; write \`T[K]\`, not a lookup by the new name.
- **Expecting \`as\` on arrays to keep the tuple.** A filtering \`as\` turns it into an object with every array member; filter with \`\` \`\${number}\` \`\` or map without \`as\`.
- **Accidental collisions.** Two keys that remap to the same name silently merge into one union-typed property.
- **Assuming the run-time object follows.** The names exist only in the type; the code that builds the object needs its own tests.
- **Reaching for \`as\` when \`Pick\`/\`Omit\` reads better.** Use remapping for renaming or value-based filters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Key remapping is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> clause in a mapped type: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [K in keyof T as NewKey]: T[K] }</code>. The loop and the value still use the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code>; only the output property name comes from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> expression. It arrived in TypeScript 4.1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Renaming:</strong> <span style="color:#f0e2c8;">With a template literal type such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get\${Capitalize&lt;string &amp; K&gt;}</code> I generate names, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getName</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; K</code> is needed because keys can also be numbers or symbols.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Filtering:</strong> <span style="color:#f0e2c8;">If the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> clause produces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>, the key is dropped. I can filter by key with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude&lt;K, "kind"&gt;</code> or by value with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[K] extends string ? K : never</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Beyond keys:</strong> <span style="color:#f0e2c8;">I can even iterate over a union of objects and key each one by a field, which turns an event union into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClick</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onKey</code> handler map with correctly typed parameters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">Modifiers are still copied, colliding names merge into a union, and a filtering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> turns tuples into plain objects. The run-time object with those names still has to be built and tested by hand.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Capitalize&lt;string &amp; K&gt;</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Capitalize&lt;K&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code> can include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Capitalize</code> requires a string, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Capitalize&lt;K&gt;</code> is error TS2344. The intersection keeps string keys and drops the rest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you remove a property with key remapping?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Map its key to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> clause, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as Exclude&lt;K, "id"&gt;</code>, or conditionally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as T[K] extends Function ? never : K</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ [K in keyof T as Exclude&lt;K, "a"&gt;]: T[K] }</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Omit&lt;T, "a"&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a plain object the result is the same. Remapping can also filter by the value type and rename in the same step, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> cannot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two keys map to the same new name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They merge into one property whose type is the union of both value types, with no error, so it is worth checking for collisions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you map over something that is not a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>, the loop can run over a union of object types, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[E in Events as E["type"]]: (e: E) =&gt; void</code>, keyed by a discriminant field.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Key remapping | The \`as\` clause in a mapped type that computes each output property name |
| Intrinsic string manipulation types | \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`, built into the compiler |
| Key filtering | Dropping a property by remapping its key to \`never\` |

**Conclusion:** Key remapping adds one clause to a mapped type, \`as NewKey\`, and with it the loop can rename keys (with template literal types and \`Capitalize<string & K>\`), drop keys (by mapping them to \`never\`, by key or by value type) and even iterate over unions of objects keyed by a field. The value side keeps using the original key, modifiers are still copied, and a few corners (merged collisions, tuples turning into objects) are worth knowing for the follow-up questions. The matching run-time object is still yours to build and test.`,
    examples: [
      {
        label: `Renaming and filtering keys with as`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface Person { name: string; age: number; kind: "person" }

// 1. Rename: the as clause computes a new key from K
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type PersonGetters = Getters<Person>;
const r1: Equal<PersonGetters, { getName: () => string; getAge: () => number; getKind: () => "person" }> = true;

// 2. Filter: mapping a key to never drops it
type WithoutKind<T> = { [K in keyof T as Exclude<K, "kind">]: T[K] };
const r2: Equal<WithoutKind<Person>, { name: string; age: number }> = true;

// 3. Filter by value type with a conditional in the as clause
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
const r3: Equal<PickByValue<Person, string>, { name: string; kind: "person" }> = true;

// 4. Rename and filter together: only the string fields get setters
type Setters<T> = {
  [K in keyof T as T[K] extends string ? \`set\${Capitalize<string & K>}\` : never]: (v: T[K]) => void;
};
const r4: Equal<keyof Setters<Person>, "setName" | "setKind"> = true;

// 5. A typo in a generated name is caught
function readName(g: PersonGetters) {
  // @ts-expect-error there is no getname, only getName
  return g.getname();
}

// 6. The run-time object that matches the type
function makeGetters<T extends object>(obj: T): Getters<T> {
  const out: Record<string, () => unknown> = {};
  for (const k of Object.keys(obj) as (keyof T & string)[]) {
    out["get" + k[0].toUpperCase() + k.slice(1)] = () => obj[k];
  }
  return out as Getters<T>;
}
const ada = makeGetters({ name: "Ada", age: 36, kind: "person" as const });
const r5: Equal<ReturnType<typeof ada.getAge>, number> = true;

console.log(r1, r2, r3, r4, r5);
console.log(ada.getName(), ada.getAge() + 1, ada.getKind());
console.log(JSON.stringify(Object.keys(ada)));`,
      },
      {
        label: `string & K, collisions, unions of objects and tuples`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. keyof T can contain number and symbol keys, so Capitalize needs string & K
const ID = Symbol("id");
type Mixed = { name: string; 0: boolean; [ID]: number };
type Getters<T> = { [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K] };
const k1: Equal<keyof Getters<Mixed>, "getName"> = true;
// @ts-expect-error K may be a number or symbol, and Capitalize only takes strings
type Broken<T> = { [K in keyof T as \`get\${Capitalize<K>}\`]: T[K] };

// 2. Remapping over keyof T still copies ? and readonly
type Prefixed<T> = { [K in keyof T as \`db_\${string & K}\`]: T[K] };
type Row = Prefixed<{ readonly id: number; note?: string }>;
const k2: Equal<Row, { readonly db_id: number; db_note?: string }> = true;

// 3. One key can become several keys
type Both<T> = { [K in keyof T as K | \`\${string & K}Changed\`]: T[K] };
const k3: Equal<keyof Both<{ x: number }>, "x" | "xChanged"> = true;

// 4. Two keys mapped to the same name merge: the value types are unioned
type Collapse<T> = { [K in keyof T as "all"]: T[K] };
const k4: Equal<Collapse<{ a: number; b: string }>, { all: number | string }> = true;

// 5. Iterate over a union of objects, not keys, and key each by a field
type Events =
  | { type: "click"; x: number; y: number }
  | { type: "key"; code: string };
type Handlers = { [E in Events as \`on\${Capitalize<E["type"]>}\`]: (e: E) => string };
const k5: Equal<keyof Handlers, "onClick" | "onKey"> = true;

const handlers: Handlers = {
  onClick: (e) => "click at " + e.x + "," + e.y,
  onKey: (e) => "key " + e.code,
};
function dispatch(e: Events): string {
  return e.type === "click" ? handlers.onClick(e) : handlers.onKey(e);
}

// 6. Arrays and tuples: a plain mapped type keeps the tuple,
// an as clause that filters turns it into an object of every array member
type Wrap<T> = { [K in keyof T]: { v: T[K] } };
type WrapNoPush<T> = { [K in keyof T as K extends "push" ? never : K]: { v: T[K] } };
const k6: Equal<Wrap<[string, number]>, [{ v: string }, { v: number }]> = true;
const k7: Equal<WrapNoPush<[string, number]> extends unknown[] ? 1 : 0, 0> = true;
const k8: Equal<WrapNoPush<[string, number]>["length"], { v: 2 }> = true;
// Keep only the numeric index keys to get a clean object
type Indexes<T> = { [K in keyof T as K extends \`\${number}\` ? K : never]: T[K] };
const k9: Equal<Indexes<[string, number]>, { "0": string; "1": number }> = true;

console.log(k1, k2, k3, k4, k5, k6, k7, k8, k9);
console.log(dispatch({ type: "click", x: 3, y: 4 }));
console.log(dispatch({ type: "key", code: "Enter" }));`,
      },
    ],
  },
  {
    title: `What are conditional types?`,
    difficulty: "hard",
    seoDescription: `Conditional types, T extends U ? X : Y, pick a type by assignability: chains, deferred types in generic functions, infer and the standard helpers.`,
    description: `**Question presented to candidate:**
"What is a conditional type in TypeScript? Write one, explain what \`extends\` means inside it, and tell me where you have seen them used."

**What a strong answer should cover:**
- The form \`T extends U ? X : Y\`: a type-level if/else that picks \`X\` when \`T\` is assignable to \`U\`, otherwise \`Y\`; added in TypeScript 2.8
- \`extends\` means assignability, not equality: literals fit their wide type, objects with extra properties fit, \`any\` gives both branches, the first match in a chain wins
- Deferred resolution: inside a generic function the condition is unresolved, so returning a concrete value needs a cast (or overloads)
- \`infer\` to pull a type out of a pattern (\`T extends (infer E)[] ? E : T\`), and that the standard \`Exclude\`, \`Extract\` and \`ReturnType\` are conditional types (\`NonNullable\` started as one in 2.8 but is \`T & {}\` in today's lib)
- When the checked type is a naked type parameter the condition distributes over unions (its own topic), and \`never\` then gives \`never\`
- Trade-off against function overloads for return types that depend on arguments

**Code / implementation expected:** Yes — a small conditional type such as \`TypeName<T>\` or a return type that depends on an argument.`,
    answer: `**Target Audience:** Developers who know generics and want types that change depending on their input.
**Difficulty:** Hard
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page covers the fundamentals. How conditional types behave on **unions** (distribution, and how to switch it off) is the subject of [Why are conditional types distributive and how do you control it with \`infer\`?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer), and \`infer\` itself has [its own page](/interview-question/what-does-the-infer-keyword-do).

## 1. Why This Even Matters — A Story First

A coat-check desk gives you a ticket for whatever you hand over. Hand over a coat, you get a coat ticket. Hand over an umbrella, you get an umbrella ticket. Hand over something odd, you get a generic "other" ticket. The person at the desk is making a **decision** based on what they receive.

Ordinary generics cannot decide: \`Box<T>\` always wraps \`T\` the same way. A **conditional type** lets a type look at its input and pick a different result: "if \`T\` is a string, the answer is this; otherwise it is that". That is how \`ReturnType\` and \`Exclude\` work, and how a function like \`query("list")\` can return \`string[]\` while \`query("count")\` returns \`number\`.

## 2. The Core Idea: An If/Else for Types

~~~ts
type IsString<T> = T extends string ? "yes" : "no";
type A = IsString<"hi">;   // "yes"
type B = IsString<42>;     // "no"
~~~

The syntax mirrors JavaScript's ternary operator, \`condition ? a : b\`, but the condition is always "does \`T\` fit \`U\`?", written \`T extends U\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="A conditional type tests whether T is assignable to U and picks the true branch X or the false branch Y">
  <rect class="d-box-muted" x="270" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="350" y="51" text-anchor="middle">input T</text>
  <rect class="d-box" x="230" y="110" width="240" height="60" rx="10"/>
  <text class="d-text" x="350" y="136" text-anchor="middle">T extends U ?</text>
  <text class="d-sub" x="350" y="158" text-anchor="middle">is T assignable to U</text>
  <rect class="d-box-accent" x="60" y="200" width="200" height="50" rx="10"/>
  <text class="d-text" x="160" y="231" text-anchor="middle">yes: X</text>
  <rect class="d-box-muted" x="440" y="200" width="200" height="50" rx="10"/>
  <text class="d-text" x="540" y="231" text-anchor="middle">no: Y</text>
  <line class="d-edge" x1="350" y1="70" x2="350" y2="108"/>
  <line class="d-edge-accent" x1="290" y1="170" x2="200" y2="198"/>
  <line class="d-edge-dashed" x1="410" y1="170" x2="500" y2="198"/>
</svg>

📌 **Interview term: conditional type** — a type \`T extends U ? X : Y\` that resolves to \`X\` when \`T\` is assignable to \`U\` and to \`Y\` otherwise. Introduced in TypeScript 2.8 ([TypeScript 2.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8)).

Chains read like \`else if\`, and the **first** matching branch wins:

~~~ts
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends (...args: never[]) => unknown ? "function" :
  "object";
~~~

\`TypeName<() => void>\` is \`"function"\` and \`TypeName<string[]>\` is \`"object"\`. The example pairs it with a run-time \`typeName\` function that prints \`number string object function\`.

## 3. What \`extends\` Really Means: Assignability

This is where most confusion comes from. \`extends\` here does **not** mean "is the same as" or "is a subclass of". It means "a value of type \`T\` could be used where a \`U\` is expected".

| Check | Result | Why |
| :--- | :--- | :--- |
| \`"hi" extends string\` | true | a literal fits its wide type |
| \`string extends "hi"\` | false | not every string is \`"hi"\` |
| \`{ id; name } extends { id }\` | true | structural typing: extra properties are fine |
| \`{ id } extends { id; name }\` | false | \`name\` is missing |
| \`(() => void) extends ((x: number) => void)\` | true | a function that ignores its parameter can be passed anywhere |
| \`unknown extends string\` | false | \`unknown\` could be anything |
| \`never extends string\` (inline) | true | \`never\` fits everything |
| \`any\` checked against \`string\` | both branches, \`"string" \\| "other"\` | \`any\` is treated as possibly either |

All of these are checked in example 2. The one-way nature also explains a trap in chains: \`Kind<1>\` with \`T extends number ? "number" : T extends 1 ? "one" : "other"\` is \`"number"\`, because \`1\` already fits \`number\` and the more specific branch is never reached. Put the narrow cases first.

If you need "are these two types **equal**", \`extends\` alone is not enough: \`[A] extends [B]\` both ways says \`{ a: 1 }\` and \`{ readonly a: 1 }\` are the same, while the stricter \`Equal\` helper used in all examples on this site tells them apart. Structural assignability itself is explained in [What is structural typing?](/interview-question/what-is-structural-typing)

📌 **Interview term: assignability** — the relation "a value of type \`T\` may be assigned to a \`U\`", which is what \`extends\` tests in a conditional type (and in generic constraints).

## 4. Deferred Conditional Types: The Cast Inside Generic Functions

A conditional type is resolved when TypeScript knows \`T\`. Inside a generic function body it does not, so the type stays **deferred**:

~~~ts
type ApiResult<T> = T extends "list" ? string[] : T extends "count" ? number : never;

function query<Q extends "list" | "count">(q: Q): ApiResult<Q> {
  return (q === "list" ? ["a", "b"] : 2) as ApiResult<Q>;
}
const names = query("list");    // string[]
const total = query("count");   // number
~~~

Callers get precise types. The body, however, needs the cast; without it:

~~~text
error TS2322: Type '2 | string[]' is not assignable to type 'ApiResult<Q>'.
  Type 'number' is not assignable to type 'ApiResult<Q>'.
~~~

Checking \`q === "list"\` narrows the value \`q\` but not the type parameter \`Q\`, so TypeScript cannot pick a branch of \`ApiResult<Q>\`. The cast is the accepted pattern; keep it in one place and test the function.

📌 **Interview term: deferred conditional type** — a conditional type whose checked type is still a type parameter, so it stays unresolved (and only assignable from itself or casts) until instantiated.

### Conditional types versus overloads

[Function overloads](/interview-question/what-are-function-overloads) solve the same problem with one signature per case: \`parse(kind: "int", raw: string): number\` and \`parse(kind: "bool", raw: string): boolean\`. They read better for two or three cases. A conditional type scales to many cases and composes with other types, and it also handles a **union** argument: \`Parsed<"int" | "bool">\` is \`number | boolean\`, which an overload list only covers if you add a third signature.

## 5. \`infer\`: Pulling a Type Out

Inside the \`extends\` part you can declare a placeholder with \`infer\` and use it in the true branch:

~~~ts
type ElementType<T> = T extends readonly (infer E)[] ? E : T;
ElementType<number[]>;   // number
ElementType<string>;     // string (not an array, so the false branch)
~~~

Read it as "if \`T\` is an array of something, call that something \`E\` and return it". \`infer\` only works inside the \`extends\` clause of a conditional type. The details are on [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do)

## 6. The Standard Library Is Full of Them

TypeScript 2.8 added \`Exclude\`, \`Extract\`, \`NonNullable\` and \`ReturnType\` to \`lib.d.ts\` as predefined conditional types ([TypeScript 2.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8)). The definitions below are copied from the \`lib.es5.d.ts\` that ships with 5.4.5:

| Helper | Definition in 5.4.5 | Example |
| :--- | :--- | :--- |
| \`Exclude<T, U>\` | \`T extends U ? never : T\` | \`Exclude<"a" \\| "b" \\| "c", "a">\` is \`"b" \\| "c"\` |
| \`Extract<T, U>\` | \`T extends U ? T : never\` | keep only members that fit \`U\` |
| \`NonNullable<T>\` | \`T & {}\` (no longer a conditional type in 5.4.5) | \`NonNullable<string \\| null \\| undefined>\` is \`string\` |
| \`ReturnType<T>\` | \`T extends (...args: any) => infer R ? R : any\` | \`ReturnType<() => Promise<number>>\` is \`Promise<number>\` |

\`Exclude\` only works on a union because of distribution, covered next. See also [What do Exclude, Extract, and NonNullable do?](/interview-question/what-do-exclude-extract-and-nonnullable-do) and [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

## 7. A Preview of Distribution

When the checked type is a bare type parameter and you pass a union, the condition runs once per member and the results are unioned. Two visible effects in this page's examples: \`Parsed<"int" | "bool">\` is \`number | boolean\`, and \`Fits<never, string>\` is \`never\`, even though \`never extends string\` written inline is \`true\` (\`never\` is the empty union, so there is nothing to check). The full story, and how to switch it off with \`[T] extends [U]\`, is on the [distributive conditional types page](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer).

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(33,3): error TS2322: Type '2 | string[]' is not assignable to type 'ApiResult<Q>'.
  Type 'number' is not assignable to type 'ApiResult<Q>'.
~~~

Example 2 has no directives and compiles cleanly.

Example 1, conditional types, deferral and \`infer\`, prints:

~~~text
true true true true true true true true true true true true
["a","b"] 3
number string object function
~~~

Example 2, what \`extends\` means, prints:

~~~text
true true true true true true true true true true true true true true true
8081 true
~~~

Each \`true\` is a compile-time \`Equal\` check that tsc accepted, covering every row of the assignability table above.

## Common Pitfalls

- **Reading \`extends\` as equality.** It is one-way assignability; \`"hi"\` fits \`string\` but not the reverse.
- **Putting the wide case first in a chain.** The first match wins, so narrow branches placed after a wider one are dead.
- **Expecting the body of a generic function to type-check without a cast.** The return type is deferred while \`T\` is generic; cast once, or use overloads.
- **Being surprised by unions and \`never\`.** A naked type parameter distributes, so a union in gives a union out and \`never\` in gives \`never\` out; wrap in \`[T]\` to check the whole type.
- **Forgetting \`any\`.** \`any\` as the checked type yields the union of both branches.
- **Building huge chains.** Very long or deeply recursive conditional types slow the compiler and produce unreadable errors; a lookup table (an object type indexed by key) is often simpler.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A conditional type is an if/else for types: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends U ? X : Y</code> resolves to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">U</code>, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Y</code>. It has existed since TypeScript 2.8.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What extends means:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> is assignability, not equality: a literal fits its wide type, an object with extra properties fits a smaller one, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> gives both branches. In a chain the first match wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Real use:</strong> <span style="color:#f0e2c8;">The classic is a return type that depends on an argument: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">query("list")</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">query("count")</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>. Inside the generic body the type is deferred, so I need one cast or overloads.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. infer:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> I can extract part of a type, such as the element type with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends (infer E)[] ? E : T</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract</code> are all built this way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Unions:</strong> <span style="color:#f0e2c8;">When the checked type is a bare type parameter, the condition distributes over a union, so a union in gives a union out, and I wrap it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [U]</code> when I want to check the whole type.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does returning a value from a function typed with a conditional return type need a cast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The type parameter is unknown inside the body, so the conditional type is deferred and TypeScript cannot choose a branch. Narrowing the argument value does not narrow the type parameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any extends string ? 1 : 2</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through a generic, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 | 2</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> makes TypeScript take both branches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">IsString&lt;never&gt;</code> give if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">IsString&lt;T&gt; = T extends string ? true : false</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is the empty union and the type distributes, so there are no members to check. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [string]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use overloads instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For two or three fixed cases, overloads read better and need no cast in the body. Conditional types scale to many cases, handle union arguments and compose with other types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Exclude</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Exclude&lt;T, U&gt; = T extends U ? never : T</code>. It relies on distribution: each member that fits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">U</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> and disappears from the union.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Conditional type | \`T extends U ? X : Y\`: \`X\` if \`T\` is assignable to \`U\`, else \`Y\` |
| Assignability | "A \`T\` may be used where a \`U\` is expected", the relation \`extends\` tests |
| Deferred conditional type | A conditional type left unresolved because its checked type is still a type parameter |

**Conclusion:** A conditional type is the type system's if/else: \`T extends U ? X : Y\` checks one-way assignability and picks a branch, chains pick the first match, and \`infer\` lets the check capture part of the type. That is enough to build \`ReturnType\`, \`Exclude\` and return types that depend on arguments, with the one catch that a generic body sees a deferred type and needs a cast. Once you pass unions through a bare type parameter, distribution kicks in, which is the topic of the [next page](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer).`,
    examples: [
      {
        label: `Conditional types, deferral and infer`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. The shape: T extends U ? X : Y (a type-level if/else)
type IsString<T> = T extends string ? "yes" : "no";
const c1: Equal<IsString<"hi">, "yes"> = true;
const c2: Equal<IsString<42>, "no"> = true;

// 2. Chains read like else-if
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends (...args: never[]) => unknown ? "function" :
  "object";
const c3: Equal<TypeName<() => void>, "function">  = true;
const c4: Equal<TypeName<string[]>, "object"> = true;

// 3. Result types that depend on the input
type ApiResult<T> = T extends "list" ? string[] : T extends "count" ? number : never;
function query<Q extends "list" | "count">(q: Q): ApiResult<Q> {
  // Inside the body Q is unresolved, so the conditional is deferred: a cast is needed
  return (q === "list" ? ["a", "b"] : 2) as ApiResult<Q>;
}
const names = query("list");
const total = query("count");
const c5: Equal<typeof names, string[]> = true;
const c6: Equal<typeof total, number> = true;

// 4. Without the cast the deferred type rejects the value
function queryNoCast<Q extends "list" | "count">(q: Q): ApiResult<Q> {
  // @ts-expect-error the conditional type is deferred while Q is generic
  return q === "list" ? ["a", "b"] : 2;
}

// 5. Pulling a type out with infer
type ElementType<T> = T extends readonly (infer E)[] ? E : T;
const c7: Equal<ElementType<number[]>, number> = true;
const c8: Equal<ElementType<string>, string> = true;

// 6. Standard helpers (Exclude and ReturnType are conditional types)
const c9: Equal<Exclude<"a" | "b" | "c", "a">, "b" | "c"> = true;
const c10: Equal<NonNullable<string | null | undefined>, string> = true;
const c11: Equal<ReturnType<() => Promise<number>>, Promise<number>> = true;

// The run-time twin of TypeName
function typeName<T>(x: T): TypeName<T> {
  const t = typeof x;
  return (t === "string" || t === "number" || t === "boolean" || t === "undefined" || t === "function" ? t : "object") as TypeName<T>;
}
const tn = typeName(3.5);
const c12: Equal<typeof tn, "number"> = true;

console.log(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12);
console.log(JSON.stringify(names), total + 1);
console.log(tn, typeName("x"), typeName([1]), typeName(() => 0));`,
      },
      {
        label: `What extends means: assignability edge cases`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// extends in a conditional type means "is assignable to", not "is equal to"
type Fits<A, B> = A extends B ? true : false;

// 1. Literals fit their wider type, not the other way round
const a1: Equal<Fits<"hi", string>, true> = true;
const a2: Equal<Fits<string, "hi">, false> = true;

// 2. Structural: extra properties still fit
const a3: Equal<Fits<{ id: number; name: string }, { id: number }>, true> = true;
const a4: Equal<Fits<{ id: number }, { id: number; name: string }>, false> = true;

// 3. Functions: fewer parameters fit a type with more
const a5: Equal<Fits<() => void, (x: number) => void>, true> = true;

// 4. Special inputs: never fits everything when written inline...
const a6: Equal<never extends string ? true : false, true> = true;
// ...but through a generic, never is an empty union and the result is never
const a6b: Equal<Fits<never, string>, never> = true;
const a7: Equal<Fits<unknown, string>, false> = true;
type AnyCheck<T> = T extends string ? "string" : "other";
const a8: Equal<AnyCheck<any>, "string" | "other"> = true;

// 5. Order matters in a chain: the first match wins
type Kind<T> = T extends number ? "number" : T extends 1 ? "one" : "other";
const a9: Equal<Kind<1>, "number"> = true;

// 6. "Equal" needs more than extends: both directions plus a trick for any
type MutualFit<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const a10: Equal<MutualFit<{ a: 1 }, { readonly a: 1 }>, true> = true;
const a11: Equal<Equal<{ a: 1 }, { readonly a: 1 }>, false> = true;

// 7. Conditional types versus overloads: one signature, many result types
type Parsed<T extends "int" | "bool"> = T extends "int" ? number : boolean;
function parse<T extends "int" | "bool">(kind: T, raw: string): Parsed<T> {
  const v = kind === "int" ? parseInt(raw, 10) : raw === "true";
  return v as Parsed<T>;
}
const port = parse("int", "8080");
const debug = parse("bool", "true");
const a12: Equal<typeof port, number> = true;
const a13: Equal<typeof debug, boolean> = true;

// 8. A union argument produces a union result (more on this on the distributive page)
declare const mode: "int" | "bool";
type Either = Parsed<typeof mode>;
const a14: Equal<Either, number | boolean> = true;

console.log(a1, a2, a3, a4, a5, a6, a6b, a7, a8, a9, a10, a11, a12, a13, a14);
console.log(port + 1, debug === true);`,
      },
    ],
  },
  {
    title: `Why are conditional types distributive and how do you control it with \`infer\`?`,
    difficulty: "hard",
    seoDescription: `A conditional type on a naked type parameter runs once per union member. Turn it off with [T] extends [U], and see how infer behaves on unions.`,
    description: `**Question presented to candidate:**
"\`type ToArray<T> = T extends unknown ? T[] : never\` gives \`string[] | number[]\` for \`string | number\`, not \`(string | number)[]\`. Why? How do you turn that off, and how does \`infer\` behave when the input is a union?"

**What a strong answer should cover:**
- Distribution: when the checked type is a naked type parameter instantiated with a union, the conditional type is applied to each member separately and the results are unioned (documented since TypeScript 2.8)
- Only a bare type parameter distributes: a union written inline, or \`T\` wrapped in \`{ v: T }\`, is checked as a whole
- Turning it off with \`[T] extends [U]\`, and turning it on deliberately with \`T extends unknown ? ... : never\`
- Consequences: \`boolean\` distributes as \`true | false\`, \`never\` gives \`never\` (hence \`[T] extends [never]\` for \`IsNever\`), and \`Exclude\` / \`Extract\` depend on it
- \`infer\` inside a distributive conditional runs per member (\`Unwrap<Promise<string> | number>\` is \`string | number\`); with the tuple wrapper it must match the whole union; \`infer X extends C\` (TypeScript 4.7) filters while extracting
- Advanced uses: \`IsUnion\`, and contravariant \`infer\` candidates giving an intersection (\`UnionToIntersection\`)

**Code / implementation expected:** Yes — show \`ToArray\` both ways and an \`infer\`-based unwrap on a union.`,
    answer: `**Target Audience:** Developers who can write conditional types and keep getting surprising results when unions go in.
**Difficulty:** Hard
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page is the applied deep-dive on unions. The basics of \`T extends U ? X : Y\` are on [What are conditional types?](/interview-question/what-are-conditional-types), \`infer\` on its own is on [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do), and building deep unwrap utilities with it is on [How do you use \`infer\` to build deep \`Awaited\`, \`ReturnType\` and \`Unwrap\` utilities?](/interview-question/how-do-you-use-infer-to-build-deep-awaited-returntype-and-unwrap-utilities)

## 1. Why This Even Matters — A Story First

A sorting machine at a post office has one rule: "if it is a parcel, stamp it PARCEL; otherwise stamp it LETTER". Drop a **sack** of mixed mail into the machine. Does it look at the sack and stamp the whole sack once, or open the sack and stamp each item?

TypeScript's answer, for conditional types, is usually "open the sack". A union like \`string | number\` is a sack, and when a conditional type receives it through a type parameter, the rule runs **once per item** and the results go back into a new sack. That is very handy (it is how \`Exclude\` removes members from a union) and very surprising when you wanted to check the sack as a whole. This page is about knowing which one you get and how to choose.

## 2. The Core Idea: One Check per Union Member

~~~ts
type ToArray<T> = T extends unknown ? T[] : never;
type R = ToArray<string | number>;   // string[] | number[]
~~~

TypeScript evaluates this as:

~~~text
ToArray<string | number>
  = ToArray<string> | ToArray<number>
  = string[] | number[]
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="A union string or number is split, each member goes through the conditional type separately, and the results are joined into string array or number array">
  <rect class="d-box-muted" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="51" text-anchor="middle">string or number</text>
  <rect class="d-box" x="70" y="115" width="220" height="60" rx="10"/>
  <text class="d-text" x="180" y="141" text-anchor="middle">ToArray of string</text>
  <text class="d-sub" x="180" y="163" text-anchor="middle">string[]</text>
  <rect class="d-box" x="430" y="115" width="220" height="60" rx="10"/>
  <text class="d-text" x="540" y="141" text-anchor="middle">ToArray of number</text>
  <text class="d-sub" x="540" y="163" text-anchor="middle">number[]</text>
  <rect class="d-box-accent" x="230" y="215" width="260" height="50" rx="10"/>
  <text class="d-text" x="360" y="246" text-anchor="middle">string[] or number[]</text>
  <line class="d-edge" x1="320" y1="70" x2="200" y2="113"/>
  <line class="d-edge" x1="400" y1="70" x2="520" y2="113"/>
  <line class="d-edge-accent" x1="180" y1="175" x2="300" y2="213"/>
  <line class="d-edge-accent" x1="540" y1="175" x2="420" y2="213"/>
</svg>

The union is split, each member goes through the rule alone, and the results are unioned again.

The practical difference: a value of the distributed type must be **all strings or all numbers**. A mixed array is rejected:

~~~text
error TS2322: Type '(string | number)[]' is not assignable to type 'string[] | number[]'.
  Type '(string | number)[]' is not assignable to type 'string[]'.
    Type 'string | number' is not assignable to type 'string'.
      Type 'number' is not assignable to type 'string'.
~~~

📌 **Interview term: distributive conditional type** — a conditional type whose checked type is a naked type parameter; when that parameter is instantiated with a union, the conditional is applied to each member and the results are unioned. The TypeScript 2.8 release notes, where conditional types arrived, define it this way ([TypeScript 2.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8)).

## 3. When Does It Distribute? Only for a Naked Type Parameter

"Naked" means the type parameter stands alone on the left of \`extends\`, not wrapped in anything.

| Checked type | Distributes? | \`string \\| number\` gives |
| :--- | :--- | :--- |
| \`T extends unknown ? T[] : never\` | yes | \`string[] \\| number[]\` |
| \`[T] extends [unknown] ? T[] : never\` | no | \`(string \\| number)[]\` |
| \`{ v: T } extends { v: string } ? 1 : 2\` | no | \`2\` (checked as a whole) |
| \`string \\| number extends string ? 1 : 2\` (no type parameter) | no | \`2\` |

📌 **Interview term: naked type parameter** — a type parameter used directly as the checked type (\`T extends ...\`), not wrapped in a tuple, object, array or other type. Only naked type parameters trigger distribution.

## 4. Turning Distribution Off: The Tuple Wrapper

Wrap **both sides** in a one-element tuple. \`[T]\` is no longer naked, so TypeScript compares the whole union at once:

~~~ts
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
ToArrayWhole<string | number>;   // (string | number)[]
~~~

This matters whenever the question is about the union **as a whole**:

~~~ts
type AllStrings<T> = [T] extends [string] ? true : false;   // is every member a string?
type SomeString<T> = T extends string ? true : false;       // per member
AllStrings<"a" | 1>;   // false
SomeString<"a" | 1>;   // boolean  (true | false: one per member)
~~~

The \`boolean\` result is the tell-tale sign of distribution: you asked a yes/no question and got "yes and no".

📌 **Interview term: tuple wrapping (\`[T] extends [U]\`)** — the standard idiom for making a conditional type non-distributive, by putting the checked type and the tested type each inside a one-element tuple.

## 5. Two Consequences Everyone Trips On

**\`boolean\` is a union.** \`boolean\` is \`true | false\`, so \`Flip<boolean>\` with \`T extends true ? false : true\` gives \`false | true\`, which is \`boolean\` again, not "the opposite of boolean".

**\`never\` is the empty union.** Distributing over zero members gives zero results, so any distributive conditional type returns \`never\` for \`never\`, whatever its branches say:

~~~ts
type IsNeverWrong<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
IsNeverWrong<never>;   // never  (not true!)
IsNever<never>;        // true
~~~

This is why every \`IsNever\` helper you see uses the tuple wrapper.

## 6. Distribution Is a Feature: \`Exclude\`, \`Extract\` and Friends

\`Exclude\` is only possible because of distribution:

~~~ts
type MyExclude<T, U> = T extends U ? never : T;
MyExclude<"a" | "b" | "c", "a">
  = ("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" extends "a" ? never : "c")
  = never | "b" | "c"
  = "b" | "c"
~~~

\`never\` disappears from a union, so members mapped to \`never\` are filtered out. Sometimes you want distribution where it would not happen on its own, for example \`keyof\` on a union only gives the **common** keys. Force it with \`T extends unknown\`:

~~~ts
type Keys<T> = T extends unknown ? keyof T : never;
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
keyof Shape;    // "kind"
Keys<Shape>;    // "kind" | "r" | "side"
~~~

\`T extends unknown\` (or \`T extends any\`) is always true, so its only job is to switch on distribution.

## 7. \`infer\` and Unions: Per Member, or the Whole Thing

\`infer\` lives inside the \`extends\` clause, so it inherits the distribution behaviour of the conditional type around it.

**Distributive: infer per member.** Each member is matched against the pattern on its own:

~~~ts
type Unwrap<T> = T extends Promise<infer V> ? V : T;
Unwrap<Promise<string> | number>;   // string | number
~~~

\`Promise<string>\` matches and gives \`string\`; \`number\` does not match and falls through to the false branch, \`number\`. The same goes for \`ElementOf<string[] | number[]>\` (\`string | number\`) and the return types of a union of functions.

**Non-distributive: infer must match the whole union.**

~~~ts
type UnwrapWhole<T> = [T] extends [Promise<infer V>] ? V : T;
UnwrapWhole<Promise<string> | number>;             // Promise<string> | number  (no match)
UnwrapWhole<Promise<string> | Promise<number>>;    // string | number
~~~

The mixed union is not a \`Promise\` as a whole, so nothing is unwrapped. When every member is a \`Promise\`, the single inference collects both candidates and gives \`string | number\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Distributive Unwrap matches each member and gives string or number; tuple wrapped UnwrapWhole matches the whole union, fails, and returns the input unchanged">
  <rect class="d-box-muted" x="210" y="20" width="300" height="50" rx="10"/>
  <text class="d-text" x="360" y="51" text-anchor="middle">Promise of string or number</text>
  <rect class="d-box-accent" x="40" y="140" width="270" height="60" rx="10"/>
  <text class="d-text" x="175" y="166" text-anchor="middle">Unwrap, per member</text>
  <text class="d-sub" x="175" y="188" text-anchor="middle">string or number</text>
  <rect class="d-box" x="410" y="140" width="270" height="60" rx="10"/>
  <text class="d-text" x="545" y="166" text-anchor="middle">UnwrapWhole, whole union</text>
  <text class="d-sub" x="545" y="188" text-anchor="middle">no match, input unchanged</text>
  <line class="d-edge-accent" x1="310" y1="70" x2="200" y2="138"/>
  <line class="d-edge-dashed" x1="410" y1="70" x2="520" y2="138"/>
</svg>

So "controlling distribution with \`infer\`" really means choosing where the pattern is applied: per member (naked \`T\`) or to the whole type (\`[T]\`).

### \`infer ... extends\`: filter while you extract

Since TypeScript 4.7 an \`infer\` variable can carry its own constraint ([TypeScript 4.7 playground example, extends constraints on infer](https://www.typescriptlang.org/play/4-7/new-ts-features/extends-constraints.ts.html)). Combined with distribution, it keeps only the members whose extracted part fits:

~~~ts
type FirstString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
FirstString<["id", 2] | [3, "x"]>;   // "id"
~~~

\`["id", 2]\` starts with a string and gives \`"id"\`; \`[3, "x"]\` does not, gives \`never\`, and vanishes from the union.

📌 **Interview term: \`infer\` constraint** — \`infer X extends C\` inside a conditional type: the pattern only matches when the inferred \`X\` is assignable to \`C\`.

## 8. Two Advanced Patterns Interviewers Like

**Is this type a union?** Distribution plus a copy of the original:

~~~ts
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;
IsUnion<"a" | "b">;   // true
IsUnion<"a">;         // false
~~~

Inside the distributive branch, \`T\` is one member while \`U\` is still the whole union. If the whole union fits the single member, there was only one member.

**Union to intersection.** When one \`infer\` variable gets several candidates from **contravariant** positions (function parameters), TypeScript infers their **intersection**, not their union (this rule is spelled out in the [TypeScript 2.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8)):

~~~ts
type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
UnionToIntersection<{ a: 1 } | { b: 2 }>;   // { a: 1 } & { b: 2 }
~~~

The first conditional distributes to \`((x: {a: 1}) => void) | ((x: {b: 2}) => void)\`; the second infers \`I\` from both parameter positions and gets the intersection. Why parameters flip the direction is explained in [What are covariance and contravariance?](/interview-question/what-are-covariance-and-contravariance)

## 9. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(9,7): error TS2322: Type '(string | number)[]' is not assignable to type 'string[] | number[]'.
  Type '(string | number)[]' is not assignable to type 'string[]'.
    Type 'string | number' is not assignable to type 'string'.
      Type 'number' is not assignable to type 'string'.
~~~

Example 2 has no directives and compiles cleanly.

Example 1, distribution on and off, prints:

~~~text
true true true true true true true true true true true
ToArray: string[] | number[]
ToArrayWhole: (string | number)[]
["a",1]
~~~

Example 2, \`infer\` on unions and the advanced patterns, prints:

~~~text
true true true true true true true true true true true
["ready",7]
~~~

Each \`true\` is a compile-time \`Equal\` check that tsc accepted (for example that \`IsNeverWrong<never>\` is \`never\` and \`Keys<Shape>\` is \`"kind" | "r" | "side"\`). The two \`ToArray\` lines are a run-time picture of the same idea: map each member, then join with \`|\`, versus join first. \`["a",1]\` is the mixed array that only the non-distributive type accepts.

## Common Pitfalls

- **Asking a yes/no question about a union with a naked \`T\`.** You get \`boolean\`; wrap as \`[T] extends [U]\` to ask about the whole union.
- **Writing \`IsNever<T> = T extends never ? ...\`.** It returns \`never\` for \`never\`; use \`[T] extends [never]\`.
- **Wrapping only one side.** \`[T] extends U\` compares a tuple to \`U\`; wrap both: \`[T] extends [U]\`.
- **Expecting a union written inline to distribute.** Distribution needs a type parameter; \`string | number extends string\` is checked as a whole.
- **Forgetting \`boolean\` is \`true | false\`.** Conditional types over \`boolean\` produce one result per member.
- **Unwrapping a mixed union non-distributively.** \`[T] extends [Promise<infer V>]\` fails on \`Promise<string> | number\`; use the naked form to unwrap member by member.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A conditional type distributes when its checked type is a naked type parameter and you pass a union: it runs once per member and unions the results, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ToArray&lt;string | number&gt;</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[] | number[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">Only a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> on the left of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> triggers it. A union written inline, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> wrapped in a tuple or object, is checked as a whole.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Off and on:</strong> <span style="color:#f0e2c8;">I turn it off with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [U]</code> when I care about the whole union, and turn it on deliberately with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends unknown ? ... : never</code>, for example to get all keys of a union of objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Consequences:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract</code> rely on it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code> distributes as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true | false</code>; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is the empty union, so a distributive type returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> for it, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IsNever</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [never]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. infer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> follows the same rule: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends Promise&lt;infer V&gt; ? V : T</code> unwraps each member, while the tuple-wrapped version must match the whole union. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer V extends C</code> filters while extracting, and contravariant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> positions give intersections.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">With <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SomeString&lt;T&gt; = T extends string ? true : false</code>, why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SomeString&lt;"a" | 1&gt;</code> equal to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">boolean</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">false</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It distributes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a"</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true | false</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [string]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> for the whole union.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T extends never ? true : false</code> give <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is a union with no members, so distribution produces no results, and an empty union is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. Wrapping both sides in tuples avoids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get every key from a union of object types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Keys&lt;T&gt; = T extends unknown ? keyof T : never</code>. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> on a union gives only the common keys; the distributive version collects each member's keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unwrap&lt;Promise&lt;string&gt; | number&gt;</code> give with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T extends Promise&lt;infer V&gt; ? V : T</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number</code>: the promise member is unwrapped and the number member falls through to the false branch, because the check runs per member.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UnionToIntersection</code> work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It first distributes the union into a union of functions taking each member, then infers the parameter of that union of functions. Candidates in contravariant positions are intersected, so the result is the intersection of the members.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Distributive conditional type | A conditional type on a naked type parameter, applied to each member of a union separately |
| Naked type parameter | A type parameter used directly as the checked type, not wrapped in another type |
| Tuple wrapping | \`[T] extends [U]\`: the idiom that makes a conditional type check the whole union |
| \`infer\` constraint | \`infer X extends C\`: the match only succeeds when the inferred \`X\` fits \`C\` (TypeScript 4.7+) |

**Conclusion:** Conditional types distribute because a naked type parameter is treated as "each member of whatever union you pass", which makes \`Exclude\`, \`Extract\` and per-member \`infer\` unwraps work, and also makes yes/no checks return \`boolean\` and \`never\` vanish. You control it with one idiom each way: \`[T] extends [U]\` to check the union as a whole, \`T extends unknown\` to force per-member processing. \`infer\` follows the same rule, so the choice decides whether a pattern is matched member by member or against the whole union, and \`infer X extends C\` plus contravariant inference give you filtering and intersections on top.`,
    examples: [
      {
        label: `Distribution on and off: ToArray, IsNever and Exclude`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A naked type parameter distributes: each union member is checked alone
type ToArray<T> = T extends unknown ? T[] : never;
const d1: Equal<ToArray<string | number>, string[] | number[]> = true;

// The distributed type rejects a mixed array
// @ts-expect-error each array must hold one member type only
const mixed: ToArray<string | number> = ["a", 1];
const okMixed: ToArrayWhole<string | number> = ["a", 1];

// 2. Wrapping both sides in a one-element tuple turns distribution off
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
const d2: Equal<ToArrayWhole<string | number>, (string | number)[]> = true;

// 3. Why it matters: a check on the whole union versus on each member
type AllStrings<T> = [T] extends [string] ? true : false;
type SomeString<T> = T extends string ? true : false;
const d3: Equal<AllStrings<"a" | 1>, false> = true;
const d4: Equal<SomeString<"a" | 1>, boolean> = true;

// 4. boolean is the union true | false, so it distributes too
type Flip<T> = T extends true ? false : true;
const d5: Equal<Flip<boolean>, boolean> = true;

// 5. never is the empty union: distributing over it gives never
type IsNeverWrong<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
const d6: Equal<IsNeverWrong<never>, never> = true;
const d7: Equal<IsNever<never>, true> = true;

// 6. Only a naked type parameter distributes, not a union written inline
const d8: Equal<string | number extends string ? 1 : 2, 2> = true;
type Boxed<T> = { v: T } extends { v: string } ? 1 : 2;
const d9: Equal<Boxed<string | number>, 2> = true;

// 7. Distribution is what makes Exclude and Extract work
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
const d10: Equal<MyExclude<"a" | "b" | "c", "a">, "b" | "c"> = true;
const d11: Equal<MyExtract<string | number | boolean, number | boolean>, number | boolean> = true;

// 8. A run-time picture of distribution: map each member, then union the results
const members = ["string", "number"];
const distributed = members.map((m) => m + "[]").join(" | ");
const whole = "(" + members.join(" | ") + ")[]";

console.log(d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11);
console.log("ToArray:", distributed);
console.log("ToArrayWhole:", whole);
console.log(JSON.stringify(okMixed));`,
      },
      {
        label: `infer on unions: Unwrap, infer extends, IsUnion and UnionToIntersection`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. infer inside a distributive conditional runs once per member
type Unwrap<T> = T extends Promise<infer V> ? V : T;
const i1: Equal<Unwrap<Promise<string> | number>, string | number> = true;

// 2. The same pattern with the tuple wrapper checks the union as a whole
type UnwrapWhole<T> = [T] extends [Promise<infer V>] ? V : T;
const i2: Equal<UnwrapWhole<Promise<string> | number>, Promise<string> | number> = true;
const i3: Equal<UnwrapWhole<Promise<string> | Promise<number>>, string | number> = true;

// 3. Element type of a union of arrays
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
const i4: Equal<ElementOf<string[] | number[]>, string | number> = true;

// 4. Return types of a union of functions
type Ret<T> = T extends (...args: never[]) => infer R ? R : never;
const i5: Equal<Ret<(() => string) | (() => boolean)>, string | boolean> = true;

// 5. infer with an extends constraint filters while it extracts (TypeScript 4.7+)
type FirstString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
const i6: Equal<FirstString<["id", 2] | [3, "x"]>, "id"> = true;

// 6. Distribution used on purpose: is T a union?
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;
const i7: Equal<IsUnion<"a" | "b">, true> = true;
const i8: Equal<IsUnion<"a">, false> = true;

// 7. Several candidates for one infer in contravariant spots give an intersection
type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
const i9: Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }> = true;

// 8. Distribution can be switched on deliberately with T extends unknown
type Keys<T> = T extends unknown ? keyof T : never;
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
const i10: Equal<keyof Shape, "kind">  = true;
const i11: Equal<Keys<Shape>, "kind" | "r" | "side"> = true;

// Run time: unwrap a mixed list of values and promises
async function main() {
  const inputs: (Promise<string> | number)[] = [Promise.resolve("ready"), 7];
  const out: Unwrap<Promise<string> | number>[] = await Promise.all(inputs);
  console.log(i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11);
  console.log(JSON.stringify(out));
}
main();`,
      },
    ],
  },
];

export default augments;
