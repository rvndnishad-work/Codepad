/**
 * TYPESCRIPT ULTRA — batch 03: Composing types (union and intersection types,
 * tuple types, ReadonlyArray and readonly tuples, immutability, as const). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are union and intersection types?`,
    difficulty: "medium",
    seoDescription: `Union types (A | B) mean one of several types and need narrowing; intersection types (A & B) mean all at once, and collapse to never when they clash.`,
    description: `**Question presented to candidate:**
"Explain union and intersection types. When would you reach for \`A | B\` versus \`A & B\`, and what happens to the members you are allowed to use in each case?"

**What a strong answer should cover:**
- A union \`A | B\` means the value is one of the types; only members common to every member are usable until you narrow (\`typeof\`, \`in\`, a tag check)
- An intersection \`A & B\` means the value is all of the types at once; it has every property of each part, which is how you compose object types
- The counter-intuitive set view: a union of object types allows more values but fewer usable properties; an intersection allows fewer values but more properties
- Incompatible intersections collapse: \`string & number\` is \`never\`, and a clash on a property makes that property (or, for literal tags, the whole object) \`never\`
- Unions are not exclusive (\`{ x } | { y }\` accepts an object with both) and \`&\` silently produces \`never\` where \`interface extends\` reports a conflict
- Practical uses: literal unions and discriminated unions for states, intersections for mixins, \`merge\` helpers and branded types

**Code / implementation expected:** Optional — narrow a \`string | number\`, and compose two object types with \`&\`.`,
    answer: `**Target Audience:** Developers who know the basic types and want to combine them into real-world shapes.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a coffee shop that accepts **cash or card**. A customer can pay with either one, so the cashier must check which one they are holding before doing anything specific: you cannot swipe cash, and you cannot count a card. That is a **union**: "one of these, find out which".

Now picture a job advert for someone who is **a barista and a cashier**. Whoever gets the job must be able to do everything both roles require. That is an **intersection**: "all of these at once".

Almost every real type you write is built from these two operators. API responses are "success or error" (union). A logged-in user is "a user, plus a session" (intersection). Getting them the right way round is what this question tests.

## 2. Union Types: "One Of These"

You write a union with \`|\`:

~~~ts
type Id = string | number;
type Status = "idle" | "loading" | "done";   // a union of literal types
~~~

A value of type \`Id\` might be a string or might be a number. Because TypeScript does not know which, it only lets you use what **both** have. \`id.toString()\` is fine (strings and numbers both have it); \`id.toUpperCase()\` is rejected:

~~~text
error TS2339: Property 'toUpperCase' does not exist on type 'Id'.
  Property 'toUpperCase' does not exist on type 'number'.
~~~

To use the specific members, you check which member you have. Inside \`if (typeof id === "string")\`, TypeScript knows \`id\` is a \`string\`; after the \`return\`, it knows the rest is a \`number\`.

📌 **Interview term: union type** — \`A | B\`, a type whose values may be any one of its members. Only the operations valid for every member are allowed until the value is narrowed.

📌 **Interview term: narrowing** — refining a union to one member with a run-time check (\`typeof\`, \`instanceof\`, \`in\`, \`===\` on a tag). The full catalogue is in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)

### Literal unions and discriminated unions

A union of literal types is TypeScript's lightweight enum: \`let status: Status\` accepts only the three strings, and \`status = "finished"\` fails with \`Type '"finished"' is not assignable to type 'Status'.\` (Literal types are covered in [What are literal types?](/interview-question/what-are-literal-types)).

When every member of an object union shares a tag field, a check on the tag narrows the whole object:

~~~ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  return s.kind === "circle" ? Math.round(Math.PI * s.radius ** 2) : s.side ** 2;
}
~~~

Before the check, \`s.radius\` is an error — \`Property 'radius' does not exist on type 'Shape'.\` — because a square has no radius. This pattern has its own page: [What is a discriminated union?](/interview-question/what-is-a-discriminated-union)

## 3. Intersection Types: "All Of These"

You write an intersection with \`&\`:

~~~ts
type Timestamped = { createdAt: string };
type Named = { name: string };
type User = Named & Timestamped & { id: number };
~~~

A \`User\` must have **every** property of every part. Leave one out and the message names the part it came from:

~~~text
error TS2322: Type '{ id: number; name: string; }' is not assignable to type 'User'.
  Property 'createdAt' is missing in type '{ id: number; name: string; }' but required in type 'Timestamped'.
~~~

The classic use is composing small reusable pieces, and typing a function that merges objects: \`merge<A, B>(a: A, b: B): A & B\` returns something with the properties of both, so \`merged.host\` and \`merged.port\` are both typed.

📌 **Interview term: intersection type** — \`A & B\`, a type whose values belong to every member at once. For object types this means the value has all the properties of each part.

## 4. The Set View (Why It Feels Backwards)

Think of a type as the **set of values** it allows. Then the names make sense: \`|\` is set union, \`&\` is set intersection.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Union: two overlapping circles, the whole shaded area is allowed, so more values fit but only shared members are known">
  <circle class="d-box-accent" cx="250" cy="120" r="90"/>
  <circle class="d-box-accent" cx="390" cy="120" r="90"/>
  <text class="d-text" x="200" y="115" text-anchor="middle">Cash</text>
  <text class="d-sub" x="200" y="138" text-anchor="middle">has count</text>
  <text class="d-text" x="440" y="115" text-anchor="middle">Card</text>
  <text class="d-sub" x="440" y="138" text-anchor="middle">has swipe</text>
  <text class="d-accent" x="320" y="240" text-anchor="middle">Cash | Card</text>
</svg>

For a union, the whole shaded area is allowed: a value can come from either circle. More values fit, but for any one value you only know what both circles have in common, so only shared members are usable.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Intersection: two overlapping circles, only the middle overlap is allowed, so fewer values fit but every member of both is known">
  <circle class="d-box-muted" cx="250" cy="120" r="90"/>
  <circle class="d-box-muted" cx="390" cy="120" r="90"/>
  <rect class="d-box-accent" x="290" y="95" width="60" height="50" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">both</text>
  <text class="d-sub" x="200" y="125" text-anchor="middle">Barista</text>
  <text class="d-sub" x="440" y="125" text-anchor="middle">Cashier</text>
  <text class="d-accent" x="320" y="240" text-anchor="middle">Barista &amp; Cashier</text>
</svg>

For an intersection, only the overlap is allowed: a value must satisfy both. Fewer values fit, but each one has every member of both types.

| | Union \`A \\| B\` | Intersection \`A & B\` |
| :--- | :--- | :--- |
| Meaning | one of A or B | both A and B |
| Values allowed | more (either set) | fewer (the overlap) |
| Properties usable without narrowing | only the shared ones | all of them |
| Typical use | states, results, options, inputs that vary | composing object types, mixins, brands |
| Identity element | \`never\` (\`A \\| never\` is \`A\`) | \`unknown\` (\`A & unknown\` is \`A\`) |
| Absorbing element | \`unknown\` (\`A \\| unknown\` is \`unknown\`) | \`never\` (\`A & never\` is \`never\`) |

The example proves the union rows with compile-time \`Equal\` checks: \`string | string\` is \`string\`, \`string | never\` is \`string\`, \`string | unknown\` is \`unknown\`, and \`"a" | string\` is just \`string\` (the literal is absorbed by its wider type).

📌 **Interview term: subtype reduction** — the compiler simplifying a union by dropping members that are already covered by another member, which is why \`"a" | string\` displays as \`string\`.

## 5. When Intersections Collapse to \`never\`

An intersection asks for a value that is all its parts at once. When that is impossible, the result is \`never\`, the type with no values (see [What is the never type?](/interview-question/what-is-the-never-type)). The second example checks each case with \`Equal\`:

| Intersection | Result | Why |
| :--- | :--- | :--- |
| \`string & number\` | \`never\` | nothing is both a string and a number |
| \`{ a: string } & { a: number }\` | an object whose \`a\` is \`never\` | the object exists, but no value fits \`a\` |
| \`{ kind: "cat" } & { kind: "dog" }\` | \`never\` (the whole type) | a clash on a literal property empties the whole type |
| \`{ role: string } & { role: "admin" }\` | \`role\` is \`"admin"\` | compatible types narrow to the more specific one |

The second row is a trap because there is no error where the type is declared. You only find out when you try to build a value:

~~~text
error TS2322: Type 'string' is not assignable to type 'never'.
~~~

\`interface ... extends\` behaves differently: it checks for the conflict up front and reports it on the declaration:

~~~text
error TS2430: Interface 'B' incorrectly extends interface 'A'.
  Types of property 'a' are incompatible.
    Type 'number' is not assignable to type 'string'.
~~~

That earlier, clearer error is one reason many teams prefer \`interface extends\` for object inheritance and keep \`&\` for ad-hoc composition. More in [What is the difference between interface and type?](/interview-question/what-is-the-difference-between-interface-and-type)

## 6. Two More Uses Worth Knowing

**Branded types.** \`string & { readonly __brand: "UserId" }\` is still a string at run time, but a plain \`string\` is no longer assignable to it, so you cannot pass an unchecked string where a validated ID is expected (the example shows \`Argument of type 'string' is not assignable to parameter of type 'UserId'.\`). Full treatment: [What are branded (nominal) types?](/interview-question/what-are-branded-nominal-types)

**Functions.** An intersection of function types behaves like an overload set: \`((x: number) => string) & ((x: string) => string)\` can be called with either. The mirror image is the surprising one: a **union** of function types can only be called with arguments that suit every member, so \`((x: string) => void) | ((x: number) => void)\` wants an argument that is both — \`Argument of type 'string' is not assignable to parameter of type 'never'.\` The variance reasons are in [What are covariance and contravariance?](/interview-question/what-are-covariance-and-contravariance)

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, tsc reports for example 1:

~~~text
main.ts(12,31): error TS2339: Property 'toUpperCase' does not exist on type 'Id'.
  Property 'toUpperCase' does not exist on type 'number'.
main.ts(27,1): error TS2322: Type '"finished"' is not assignable to type 'Status'.
main.ts(37,5): error TS2339: Property 'radius' does not exist on type 'Shape'.
  Property 'radius' does not exist on type '{ kind: "square"; side: number; }'.
~~~

and for example 2:

~~~text
main.ts(13,7): error TS2322: Type '{ id: number; name: string; }' is not assignable to type 'User'.
  Property 'createdAt' is missing in type '{ id: number; name: string; }' but required in type 'Timestamped'.
main.ts(47,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UserId'.
  Type 'string' is not assignable to type '{ readonly __brand: "UserId"; }'.
~~~

Example 1, unions and narrowing, prints:

~~~text
string id AB-12
number id 7.0 (7)
finished
13 9
true true true true
~~~

Example 2, intersections, prints:

~~~text
{"id":1,"name":"Ada","createdAt":"2024-01-01"}
Lin
localhost 8080
true true true true
loading u_42
[1] [a]
~~~

Notice \`finished\` and \`Lin\` in the output. The compiler rejected both lines, yet the JavaScript still ran them: types are erased, so an ignored error is a real bug at run time.

## Common Pitfalls

- **Thinking a union lets you use everything.** \`string | number\` gives you only the shared members; narrow first.
- **Expecting unions of objects to be exclusive.** \`{ x: string } | { y: number }\` accepts \`{ x: "a", y: 1 }\` with no error. If you need "exactly one", add a tag field (a discriminated union) or \`y?: never\` on the other side.
- **Silent \`never\` from \`&\`.** Intersecting two object types that disagree on a property gives no error at the declaration; it only surfaces when you build a value. Use \`interface extends\` when you want the conflict reported.
- **Mixing the two up for "A or B options".** \`Options = A & B\` demands both sets of properties; \`A | B\` accepts either. Read the operator as "and" / "or" out loud.
- **Calling a union of functions.** It needs arguments valid for every member, often \`never\`. Narrow to one function first, or type it as an intersection or an overload.
- **Forgetting it is erased.** Neither operator exists at run time; narrowing needs real JavaScript checks such as \`typeof\` or a tag field.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Union:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A | B</code> means the value is <strong style="color:#ffca28;">one of</strong> the types. Only members shared by all of them are usable until I narrow with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> or a tag check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Intersection:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A &amp; B</code> means the value is <strong style="color:#ffca28;">all of</strong> the types at once. For objects it has every property of each part, so I use it to compose types like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Named &amp; Timestamped</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Set view:</strong> <span style="color:#f0e2c8;">In set terms a union allows more values but fewer known members; an intersection allows fewer values but more members. That is why it can feel backwards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. never:</strong> <span style="color:#f0e2c8;">An impossible intersection collapses: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; number</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>, and a clash on a literal tag such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind</code> makes the whole object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;">Literal and discriminated unions model states and results; intersections model mixins, merge helpers and branded types. Both are erased at run time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ a: string } | { b: number }</code> an exclusive or?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. An object with both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> is accepted. For exclusivity add a discriminant like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind</code>, or mark the other property as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b?: never</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">A &amp; B</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">interface C extends A, B</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both produce a type with all properties. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> checks for conflicting properties and reports an error on the declaration; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> silently makes the conflicting property <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not call a union of two function types with a string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The value could be either function, so the argument must suit both. Parameters combine as an intersection, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; number</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. Narrow to one function or model it as an overload.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">A | never</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">A &amp; unknown</code> simplify to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is the identity for unions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> the identity for intersections; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A | unknown</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A &amp; never</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you type a function that merges two objects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function merge&lt;A extends object, B extends object&gt;(a: A, b: B): A &amp; B</code>. It is accurate when the keys do not overlap. If both have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> (a string and a number), the type says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> while at run time the second object wins and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is the number.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Union type | \`A \\| B\`: the value is one of the member types |
| Narrowing | Refining a union to one member with a run-time check |
| Intersection type | \`A & B\`: the value is every member type at once |
| Subtype reduction | Dropping union members already covered by a wider member |

**Conclusion:** A union says "one of these" and an intersection says "all of these". With a union you get flexibility in what values come in, paid for by having to narrow before you use anything specific; with an intersection you get every member of every part, paid for by a narrower set of values, down to \`never\` when the parts contradict each other. Literal unions, discriminated unions and \`&\`-composed object types are the everyday tools built on these two operators, and knowing the traps — non-exclusive unions, silent \`never\` from \`&\`, uncallable unions of functions — is what separates a confident answer from a memorised one.`,
    examples: [
      {
        label: `Unions: shared members, narrowing and literal unions`,
        code: `// Equal<A, B> is true only when A and B are the same type (checked by tsc).
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A union: the value is ONE of these types.
type Id = string | number;

function describe(id: Id): string {
  // Before narrowing, only members shared by string AND number are allowed.
  const shared = id.toString();
  // Wrapped in an arrow that is never called, so only the checker sees it.
  // @ts-expect-error Property 'toUpperCase' does not exist on type 'number'.
  const notAllowed = () => id.toUpperCase();
  // typeof narrows the union to one member inside each branch.
  if (typeof id === "string") {
    return "string id " + id.toUpperCase();
  }
  return "number id " + id.toFixed(1) + " (" + shared + ")";
}
console.log(describe("ab-12"));
console.log(describe(7));

// A union of literal types: only these exact values are allowed.
type Status = "idle" | "loading" | "done";
let status: Status = "idle";
status = "done";
// @ts-expect-error Type '"finished"' is not assignable to type 'Status'.
status = "finished";
console.log(status);

// A union of object types with a shared tag field: a discriminated union.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  // @ts-expect-error Property 'radius' does not exist on type 'Shape'.
  s.radius;
  return s.kind === "circle" ? Math.round(Math.PI * s.radius ** 2) : s.side ** 2;
}
console.log(area({ kind: "circle", radius: 2 }), area({ kind: "square", side: 3 }));

// Union algebra: duplicates collapse, never disappears, unknown absorbs.
const a: Equal<string | string, string> = true;
const b: Equal<string | never, string> = true;
const c: Equal<string | unknown, unknown> = true;
// A literal is absorbed by its wider type.
const d: Equal<"a" | string, string> = true;
console.log(a, b, c, d);`,
      },
      {
        label: `Intersections: composing types, never and brands`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// An intersection: the value has ALL the members of every part.
type Timestamped = { createdAt: string };
type Named = { name: string };
type User = Named & Timestamped & { id: number };

const user: User = { id: 1, name: "Ada", createdAt: "2024-01-01" };
console.log(JSON.stringify(user));

// Missing any part is an error.
// @ts-expect-error Property 'createdAt' is missing
const partial: User = { id: 2, name: "Lin" };
console.log(partial.name);

// A helper that merges two objects returns the intersection of their types.
function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b };
}
const merged = merge({ host: "localhost" }, { port: 8080 });
console.log(merged.host, merged.port);

// Intersecting incompatible primitives leaves no possible value: never.
type Impossible = string & number;
const e1: Equal<Impossible, never> = true;

// Same property, incompatible types: the property becomes never...
type Clash = { a: string } & { a: number };
const e2: Equal<Clash["a"], never> = true;
// ...and when the clash is on a literal tag, the whole object is never.
type TagClash = { kind: "cat" } & { kind: "dog" };
const e3: Equal<TagClash, never> = true;

// Compatible properties combine: string & "admin" is just "admin".
type Role = { role: string } & { role: "admin" };
const e4: Equal<Role["role"], "admin"> = true;
console.log(e1, e2, e3, e4);

// A branded type: string & a phantom tag that only exists at type level.
type UserId = string & { readonly __brand: "UserId" };
const toUserId = (raw: string) => raw as UserId;
function loadUser(id: UserId): string {
  return "loading " + id;
}
console.log(loadUser(toUserId("u_42")));
// @ts-expect-error a plain string is not a UserId
loadUser("u_42");

// Intersecting function types acts like overloads.
type Fmt = ((x: number) => string) & ((x: string) => string);
const fmt: Fmt = (x: number | string) => "[" + String(x) + "]";
console.log(fmt(1), fmt("a"));`,
      },
    ],
  },
  {
    title: `What are tuple types?`,
    difficulty: "easy",
    seoDescription: `Tuple types fix an array's length and the type at each position, with optional, rest and labelled elements, variadic tuples and the push pitfall.`,
    description: `**Question presented to candidate:**
"What is a tuple type in TypeScript, how is it different from an ordinary array, and where have you used one?"

**What a strong answer should cover:**
- A tuple fixes the length and the type at each position, such as \`[string, number]\`; its \`length\` is a literal type
- How it differs from \`(string | number)[]\`, and that an array literal is inferred as an array unless you annotate it or use \`as const\`
- Optional elements (\`[number, number?]\`), rest elements (\`[string, ...string[]]\`, also leading or middle since TypeScript 4.2) and labels (\`[x: number, y: number]\`, TypeScript 4.0)
- Tuples as rest parameters and variadic tuple types (\`[...T]\`) for typing argument lists
- Everyday uses: returning a pair like \`useState\`, \`Object.entries\` style key/value pairs, coordinates
- The pitfall: a mutable tuple still has \`push\`, so prefer \`readonly\` tuples for values you return

**Code / implementation expected:** Optional — declare a tuple, destructure it, and show one rejected out-of-range access.`,
    answer: `**Target Audience:** Beginners who know arrays and want to describe fixed-shape data such as pairs and records.
**Difficulty:** Easy
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

An egg carton holds any number of eggs, all of the same kind. That is an **array**: \`number[]\` says "some numbers, how many we do not know".

A bento box is different. It has exactly three compartments, and each one has a job: rice on the left, fish in the middle, pickles on the right. Put fish where the rice goes and anyone can see something is wrong. That is a **tuple**: a fixed number of slots, each with its own type.

Tuples show up wherever a function hands back a small, fixed bundle of values without naming them: a \`[value, setValue]\` pair, a \`[key, value]\` entry, an \`[x, y]\` point.

## 2. The Basics

~~~ts
const point: [number, number] = [3, 4];
const entry: [string, number] = ["age", 30];
const [key, value] = entry;   // key: string, value: number
~~~

Three things set a tuple apart from an array:

1. **Each position has its own type.** After destructuring, \`key.toUpperCase()\` and \`value.toFixed(2)\` both type-check.
2. **The length is known.** \`entry.length\` has the literal type \`2\`, not \`number\` (the example checks this with \`Equal\`).
3. **Out-of-range access is an error.** \`entry[2]\` fails with \`Tuple type '[string, number]' of length '2' has no element at index '2'.\`

Wrong order and wrong length are rejected too:

~~~text
error TS2322: Type 'number' is not assignable to type 'string'.
error TS2322: Type 'string' is not assignable to type 'number'.
error TS2322: Type '[string, number, boolean]' is not assignable to type '[string, number]'.
  Source has 3 element(s) but target allows only 2.
~~~

📌 **Interview term: tuple type** — an array type with a fixed number of elements and a known type at each index, written \`[T1, T2, ...]\`. At run time it is an ordinary JavaScript array.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="An array has many slots of one type and a length of number, a tuple has two slots with a string at index 0 and a number at index 1 and a length of 2">
  <text class="d-text" x="20" y="40">number[]</text>
  <rect class="d-box" x="160" y="15" width="80" height="44" rx="6"/>
  <text class="d-sub" x="200" y="42" text-anchor="middle">number</text>
  <rect class="d-box" x="260" y="15" width="80" height="44" rx="6"/>
  <text class="d-sub" x="300" y="42" text-anchor="middle">number</text>
  <rect class="d-box" x="360" y="15" width="80" height="44" rx="6"/>
  <text class="d-sub" x="400" y="42" text-anchor="middle">number</text>
  <rect class="d-box-muted" x="460" y="15" width="80" height="44" rx="6"/>
  <text class="d-sub" x="500" y="42" text-anchor="middle">more</text>
  <text class="d-sub" x="560" y="42">length: number</text>
  <text class="d-text" x="20" y="160">[string, number]</text>
  <rect class="d-box-accent" x="180" y="130" width="110" height="50" rx="6"/>
  <text class="d-text" x="235" y="152" text-anchor="middle">string</text>
  <text class="d-sub" x="235" y="171" text-anchor="middle">index 0</text>
  <rect class="d-box-accent" x="310" y="130" width="110" height="50" rx="6"/>
  <text class="d-text" x="365" y="152" text-anchor="middle">number</text>
  <text class="d-sub" x="365" y="171" text-anchor="middle">index 1</text>
  <text class="d-sub" x="460" y="160">length: 2</text>
</svg>

The array row has any number of identical slots; the tuple row has exactly two, and each slot knows its own type.

### Inference does not give you a tuple

Write \`const inferred = ["age", 30]\` without an annotation and TypeScript infers \`(string | number)[]\`, an array where any element may be either type and any length is fine. To get a tuple you either annotate it, or use \`as const\` (which gives a *readonly* tuple of literal types — see [What does as const do?](/interview-question/what-does-as-const-do)). The same applies to return values: \`return [on, toggle]\` from a function is inferred as \`(boolean | (() => boolean))[]\`, and assigning that to \`[boolean, () => boolean]\` fails with \`Target requires 2 element(s) but source may have fewer.\` That is why such functions either declare a tuple return type or end with \`as const\`.

## 3. Optional, Rest and Labelled Elements

| Feature | Syntax | \`length\` type | Since |
| :--- | :--- | :--- | :--- |
| Optional element | \`[number, number, number, number?]\` | \`3 \\| 4\` | TypeScript 3.0 |
| Rest element at the end | \`[string, ...string[]]\` | \`number\` | TypeScript 3.0 |
| Rest at the start or middle | \`[...string[], boolean]\` | \`number\` | TypeScript 4.2 |
| Labels | \`[x: number, y: number]\` | unchanged | TypeScript 4.0 |
| Variadic spread of a generic | \`[string, ...T]\` | depends on \`T\` | TypeScript 4.0 |

Release sources: optional elements in the [TypeScript 3.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html); labels and variadic tuples in the [TypeScript 4.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html); leading and middle rest elements in the [TypeScript 4.2 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-2/). The \`length\` types were checked with \`Equal\` in example 2.

- **Optional elements** must come after the required ones. An \`RGB\` type of \`[red: number, green: number, blue: number, alpha?: number]\` accepts both \`[255, 0, 0]\` and \`[255, 0, 0, 0.5]\`.
- **Rest elements** describe "a fixed part plus any number of these". \`[name: string, ...args: string[]]\` models a command line. A tuple may have only one rest element.
- **Labels** are documentation for editors and error messages only. The example proves \`[x: number, y: number]\` is exactly the same type as \`[number, number]\`. The 4.0 release notes required labels on all elements or none; TypeScript 5.4.5 accepts a mix such as \`[x: number, number]\` without complaint.

📌 **Interview term: optional / rest tuple element** — \`T?\` marks a position that may be missing (its type includes \`undefined\`); \`...T[]\` marks a stretch of zero or more elements of \`T\`.

📌 **Interview term: labelled tuple element** — a name such as \`x:\` in \`[x: number, y: number]\`; it improves tooling and has no effect on type compatibility.

## 4. Tuples and Function Parameters

A function parameter list *is* a tuple. You can write it that way with a rest parameter:

~~~ts
function log(...args: [level: "info" | "warn", message: string]) { ... }
log("warn", "disk almost full");
log("info");   // error TS2554: Expected 2 arguments, but got 1.
~~~

This is what makes utilities such as \`Parameters<typeof fn>\` possible: they hand you the parameter list as a tuple (see [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)).

Combined with generics, a spread inside a tuple type keeps every position precise. \`prepend<T extends unknown[]>(head: string, tail: [...T]): [string, ...T]\` called with \`("id", [1, true])\` returns the type \`[string, number, boolean]\` — not \`(string | number | boolean)[]\`.

📌 **Interview term: variadic tuple type** — a tuple type that spreads a generic tuple, such as \`[string, ...T]\`, so functions can add, remove or forward elements without losing their individual types.

## 5. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(18,21): error TS2493: Tuple type '[string, number]' of length '2' has no element at index '2'.
main.ts(23,36): error TS2322: Type 'number' is not assignable to type 'string'.
main.ts(23,40): error TS2322: Type 'string' is not assignable to type 'number'.
main.ts(25,7): error TS2322: Type '[string, number, boolean]' is not assignable to type '[string, number]'.
  Source has 3 element(s) but target allows only 2.
~~~

and example 2 reports \`main.ts(31,1): error TS2554: Expected 2 arguments, but got 1.\`

Example 1, basics, prints:

~~~text
[3,4] ["age",30]
AGE 30.00
true 2
undefined
2 3
true
5 function
~~~

Example 2, optional, rest, labelled and variadic tuples, prints:

~~~text
3 4 true
git 3 true
["a","b",true]
true
WARN: disk almost full
INFO: undefined
["id",1,true] true
3 ["a",1,99]
~~~

Two lines show the limits of a compile-time check. \`INFO: undefined\` comes from the rejected \`log("info")\` call, which still ran. And the last line shows the real trap: \`pair.push(99)\` compiled without any error on a \`[string, number]\` tuple, and the "two-element" tuple now has three elements.

## 6. Tuples vs Arrays vs Objects

| | Array \`T[]\` | Tuple \`[A, B]\` | Object \`{ a: A; b: B }\` |
| :--- | :--- | :--- | :--- |
| Length | any | fixed (or a known range) | n/a |
| Element types | one type for all | one per position | one per named key |
| Readable at the call site | yes | only with labels or good destructuring names | yes, names are built in |
| Good for | lists | small pairs and triples, argument lists | anything with more than about three fields |

Rule of thumb: if a reader would need to remember what index 3 means, use an object instead.

## Common Pitfalls

- **Expecting inference to make a tuple.** \`["a", 1]\` is \`(string | number)[]\`; annotate or use \`as const\`.
- **\`push\` on a mutable tuple.** It compiles and breaks the length guarantee. Return tuples as \`readonly [A, B]\` — see [What is ReadonlyArray and readonly tuple?](/interview-question/what-is-readonlyarray-and-readonly-tuple)
- **Long tuples.** \`[string, number, boolean, string, number]\` is unreadable at the call site. Use an object.
- **Thinking labels change the type.** They do not; \`[x: number]\` and \`[y: number]\` are interchangeable.
- **Assuming a tuple exists at run time.** It is a plain array; JSON from an API is not checked against your tuple type.
- **Breaking the element order.** \`[number?, number]\` fails with \`A required element cannot follow an optional element.\`, \`[...string[], number?]\` with \`An optional element cannot follow a rest element.\`, and two rest elements with \`A rest element cannot follow another rest element.\`

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A tuple is an array type with a <strong style="color:#ffca28;">fixed length</strong> and a known type at each position, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string, number]</code>; its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> is the literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Versus arrays:</strong> <span style="color:#f0e2c8;">An array <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(string | number)[]</code> allows any length and any order. Array literals are inferred as arrays, so I annotate or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> to get a tuple.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shapes:</strong> <span style="color:#f0e2c8;">Tuples support optional elements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[number, number?]</code>, rest elements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string, ...string[]]</code> and labels <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x: number, y: number]</code>, which are documentation only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Functions:</strong> <span style="color:#f0e2c8;">A parameter list is a tuple, so rest parameters can be typed as tuples, and variadic tuple types like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string, ...T]</code> keep each position precise in generic helpers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">A mutable tuple still has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, so I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> tuples, and I switch to an object once a reader would have to remember what index 3 means.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code> return a tuple instead of an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So callers can name the parts freely: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const [count, setCount] = useState(0)</code>. With an object they would have to rename on destructuring each time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the type of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">length</code> on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[string, number?]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 | 2</code>. Every optional element adds one possible length; a rest element makes it plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a function that returns a pair without writing the tuple type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">End the return with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code>, which infers a readonly tuple, or annotate the return type. A bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return [a, b]</code> infers an array of a union.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a tuple have a rest element in the middle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, since TypeScript 4.2: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[string, ...number[], boolean]</code>. Only one rest element is allowed, and an optional element cannot follow it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are variadic tuple types used for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Typing functions that add or forward arguments, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prepend</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concat</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code> or middleware wrappers, while keeping each argument type instead of collapsing to a union array.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tuple type | An array type with a fixed number of elements and a type per index |
| Optional / rest tuple element | \`T?\` may be missing; \`...T[]\` is zero or more of \`T\` |
| Labelled tuple element | A name such as \`x:\` on a position, for tooling only |
| Variadic tuple type | A tuple that spreads a generic tuple, such as \`[string, ...T]\` |

**Conclusion:** A tuple is TypeScript's way of saying "this array has exactly these slots, and each slot has its own type". It turns \`[key, value]\` pairs, coordinates and \`[state, setState]\` returns into fully typed data, and with optional, rest, labelled and variadic elements it can describe whole argument lists. Remember that inference produces arrays rather than tuples, that a mutable tuple can be pushed past its length, and that past three or so positions an object reads better, and you have the complete picture.`,
    examples: [
      {
        label: `Tuple basics: positions, length and rejected access`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A tuple: fixed length, a known type at each position.
const point: [number, number] = [3, 4];
const entry: [string, number] = ["age", 30];
console.log(JSON.stringify(point), JSON.stringify(entry));

// Each position has its own type, and destructuring keeps them.
const [key, value] = entry;
console.log(key.toUpperCase(), value.toFixed(2));

// The length is a literal type, not number.
const len: Equal<typeof entry.length, 2> = true;
console.log(len, entry.length);

// Reading past the end is a compile error.
// @ts-expect-error Tuple type '[string, number]' of length '2' has no element at index '2'.
const third = entry[2];
console.log(third);

// Wrong order or wrong length is rejected.
// @ts-expect-error Type 'string' is not assignable to type 'number'.
const swapped: [string, number] = [30, "age"];
// @ts-expect-error Source has 3 element(s) but target allows only 2.
const tooLong: [string, number] = ["age", 30, true];
console.log(swapped.length, tooLong.length);

// Without an annotation, an array literal is inferred as an array, not a tuple.
const inferred = ["age", 30];
const e1: Equal<typeof inferred, (string | number)[]> = true;
console.log(e1);

// A function returning a pair, the useState pattern.
function useCounter(start: number): [number, (n: number) => void] {
  let current = start;
  return [current, (n) => { current = n; }];
}
const [count, setCount] = useCounter(5);
setCount(6);
console.log(count, typeof setCount);`,
      },
      {
        label: `Optional, rest, labelled and variadic tuples`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Optional elements: the length becomes a union.
type RGB = [red: number, green: number, blue: number, alpha?: number];
const solid: RGB = [255, 0, 0];
const faded: RGB = [255, 0, 0, 0.5];
const e1: Equal<RGB["length"], 3 | 4> = true;
console.log(solid.length, faded.length, e1);

// Rest elements: a fixed head followed by any number of strings.
type Command = [name: string, ...args: string[]];
const cmd: Command = ["git", "commit", "-m", "msg"];
const e2: Equal<Command["length"], number> = true;
console.log(cmd[0], cmd.slice(1).length, e2);

// The rest element can sit at the start or in the middle too.
type EndsWithFlag = [...names: string[], verbose: boolean];
const call: EndsWithFlag = ["a", "b", true];
console.log(JSON.stringify(call));

// Labels are documentation only: the type is the same as without them.
const e3: Equal<[x: number, y: number], [number, number]> = true;
console.log(e3);

// Tuples as rest parameters: a function signature as a tuple.
function log(...args: [level: "info" | "warn", message: string]) {
  console.log(args[0].toUpperCase() + ": " + args[1]);
}
log("warn", "disk almost full");
// @ts-expect-error Expected 2 arguments, but got 1.
log("info");

// Variadic tuple types: spread a generic tuple into another tuple.
function prepend<T extends unknown[]>(head: string, tail: [...T]): [string, ...T] {
  return [head, ...tail];
}
const p = prepend("id", [1, true]);
const e4: Equal<typeof p, [string, number, boolean]> = true;
console.log(JSON.stringify(p), e4);

// Pitfall: a mutable tuple still has push, and the type does not track it.
const pair: [string, number] = ["a", 1];
pair.push(99);
console.log(pair.length, JSON.stringify(pair));`,
      },
    ],
  },
  {
    title: `What is ReadonlyArray and readonly tuple?`,
    difficulty: "medium",
    seoDescription: `ReadonlyArray and readonly T[] remove push, sort and index writes; readonly tuples fix length too. Assignability is one-way and nothing is frozen.`,
    description: `**Question presented to candidate:**
"What are \`ReadonlyArray\` and readonly tuples in TypeScript? How do they behave when you pass them to functions, and do they actually stop the array from changing?"

**What a strong answer should cover:**
- \`ReadonlyArray<T>\`, \`readonly T[]\` and \`Readonly<T[]>\` are the same type: an array view with no mutating methods (\`push\`, \`sort\`, \`splice\`), no index writes and a read-only \`length\`
- \`readonly [A, B]\` combines a tuple's fixed positions with the same read-only rules; \`as const\` on an array literal produces one
- Assignability is one-way: a mutable array can be passed where a readonly one is expected, but not the reverse (\`'readonly' and cannot be assigned to the mutable type\`)
- API design: accept \`readonly T[]\` parameters so callers can pass both kinds, and constrain generics with \`readonly unknown[]\`
- It is compile-time only: the run-time value is an ordinary array, a mutable alias can still change it, and \`Object.freeze\` is the run-time counterpart
- Version facts: the \`readonly T[]\` syntax, readonly tuples and \`as const\` arrived in TypeScript 3.4

**Code / implementation expected:** Optional — a function taking \`readonly number[]\`, plus one rejected \`push\` or index assignment.`,
    answer: `**Target Audience:** Developers who type function parameters and want to promise callers that their arrays will not be changed.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022, lib ES2022 + DOM).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

When you lend a friend a printed photo album, you hand it over in a glass display case. They can look at every photo, count them and find their favourite, but they cannot pull one out, rearrange the pages or glue in a new one. You still own the album, and you can still open the case at home.

A \`readonly\` array is that display case. The function you pass it to can read everything — \`map\`, \`filter\`, \`includes\`, \`slice\` — but the compiler stops it calling \`push\`, \`sort\` or \`scores[0] = 0\`. Meanwhile you, holding the mutable original, can still change it.

This matters because a whole class of bugs comes from a function quietly sorting or emptying the array it was given. \`Array.prototype.sort\` and \`reverse\` mutate in place, and the caller never sees it coming.

## 2. Three Spellings, One Type

~~~ts
const a: ReadonlyArray<number> = [1, 2];
const b: readonly number[] = [1, 2];       // the usual spelling
const c: Readonly<number[]> = [1, 2];
~~~

Example 1 proves all three are identical with compile-time \`Equal\` checks. The \`readonly T[]\` syntax and readonly tuples were added in TypeScript 3.4 ([TypeScript 3.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html)); \`ReadonlyArray<T>\` is older.

📌 **Interview term: ReadonlyArray** — the built-in interface describing an array you may only read. It has the non-mutating methods of \`Array\` but no \`push\`, \`pop\`, \`shift\`, \`unshift\`, \`splice\`, \`sort\`, \`reverse\`, \`fill\` or \`copyWithin\`, no index assignment, and a read-only \`length\`.

What the compiler says for each kind of write:

~~~text
error TS2339: Property 'push' does not exist on type 'readonly number[]'.
error TS2339: Property 'sort' does not exist on type 'readonly number[]'.
error TS2542: Index signature in type 'readonly number[]' only permits reading.
error TS2540: Cannot assign to 'length' because it is a read-only property.
~~~

Everything that returns a **new** array still works and returns a normal mutable array: \`scores.map(...)\`, \`scores.slice(...)\`, \`[...scores].sort(...)\`. With \`lib\` set to ES2023 or later you also get the copy-returning methods \`toSorted\`, \`toReversed\`, \`toSpliced\` and \`with\` on readonly arrays (checked with 5.4.5: \`r.toSorted()\` compiles under \`--lib ES2023\` and is rejected under \`--lib ES2022\` with \`Property 'toSorted' does not exist on type 'readonly number[]'.\`).

One restriction on the syntax: the \`readonly\` keyword only works directly on array and tuple types. \`readonly string\` or \`readonly Array<number>\` is an error — \`'readonly' type modifier is only permitted on array and tuple literal types.\` For \`Array<number>\` use \`ReadonlyArray<number>\`.

## 3. Readonly Tuples

Put \`readonly\` in front of a tuple and you get fixed positions **and** no writes:

~~~ts
type Point = readonly [x: number, y: number];
const origin: Point = [0, 0];
origin[0] = 5;     // error TS2540: Cannot assign to '0' because it is a read-only property.
origin.push(1);    // error TS2339: Property 'push' does not exist on type 'Point'.
~~~

Note the difference from a plain tuple: a mutable \`[string, number]\` still has \`push\` (see [What are tuple types?](/interview-question/what-are-tuple-types)), while the readonly one does not, so it really keeps its length.

You rarely write readonly tuples by hand. \`as const\` on an array literal produces one: \`[255, 128, 0] as const\` has the type \`readonly [255, 128, 0]\` (example 2 checks it). See [What does as const do?](/interview-question/what-does-as-const-do)

📌 **Interview term: readonly tuple** — \`readonly [A, B]\`: a tuple whose elements cannot be reassigned and which has no mutating methods. It is a subtype of \`ReadonlyArray<A | B>\`.

## 4. Assignability Goes One Way

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="A mutable number array can flow into a readonly number array parameter, but a readonly array cannot flow into a mutable number array parameter">
  <defs>
    <marker id="ro-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">number[]</text>
  <rect class="d-box-accent" x="460" y="30" width="200" height="56" rx="10"/>
  <text class="d-text" x="560" y="64" text-anchor="middle">readonly number[]</text>
  <path class="d-edge-accent" d="M 224 58 L 454 58" marker-end="url(#ro-arrow)"/>
  <text class="d-sub" x="340" y="44" text-anchor="middle">allowed</text>
  <rect class="d-box-accent" x="20" y="140" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="174" text-anchor="middle">readonly number[]</text>
  <rect class="d-box" x="460" y="140" width="200" height="56" rx="10"/>
  <text class="d-text" x="560" y="174" text-anchor="middle">number[]</text>
  <path class="d-edge-dashed" d="M 224 168 L 454 168" marker-end="url(#ro-arrow)"/>
  <text class="d-sub" x="340" y="154" text-anchor="middle">error TS2345</text>
</svg>

Handing a mutable array to code that promises only to read it is safe, so \`average(live)\` with \`live: number[]\` compiles. Handing a read-only view to code that might write is not, so \`shuffleInPlace(scores)\` fails:

~~~text
error TS2345: Argument of type 'readonly number[]' is not assignable to parameter of type 'number[]'.
  The type 'readonly number[]' is 'readonly' and cannot be assigned to the mutable type 'number[]'.
~~~

The same rule holds for tuples (\`The type 'Point' is 'readonly' and cannot be assigned to the mutable type '[number, number]'.\`) and for generic constraints. That gives two API-design rules:

1. **Parameters you only read should be \`readonly T[]\`.** Callers can then pass both mutable and readonly arrays. A \`number[]\` parameter forces callers holding readonly data to copy it.
2. **Generic constraints should be \`readonly unknown[]\`.** \`firstOf<T extends readonly unknown[]>\` accepts \`as const\` tuples and normal arrays alike; \`lastOf<T extends unknown[]>\` rejects \`rgb\` with \`The type 'readonly [255, 128, 0]' is 'readonly' and cannot be assigned to the mutable type 'unknown[]'.\`

📌 **Interview term: readonly-to-mutable assignability** — a readonly array or tuple type is not assignable to its mutable counterpart, while the mutable one is assignable to the readonly one. (This is stricter than readonly *object properties*, which do not affect assignability at all — see [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript))

## 5. It Is Only a Compile-Time Promise

\`readonly\` is erased like every other type. At run time \`scores\` is an ordinary array: \`Array.isArray(scores)\` is \`true\` and \`Object.isFrozen(scores)\` is \`false\`. Two consequences show up in the run:

- **A mutable alias can still change it.** \`const alias: readonly number[] = live; live.push(4);\` and \`alias.length\` is now \`4\`. Readonly describes *your view*, not the value.
- **An ignored error still runs.** \`shuffleInPlace(scores)\` was rejected, but the emitted JavaScript called it anyway, and \`scores\` printed as \`[85,72,90]\` — reversed.

If you need a run-time guarantee, \`Object.freeze(arr)\` makes writes fail (silently in sloppy mode, with a \`TypeError\` in strict mode), and TypeScript types its result as \`readonly T[]\`. Immutability tools as a whole are compared in [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript)

## 6. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(12,30): error TS2339: Property 'push' does not exist on type 'readonly number[]'.
main.ts(14,30): error TS2339: Property 'sort' does not exist on type 'readonly number[]'.
main.ts(17,26): error TS2542: Index signature in type 'readonly number[]' only permits reading.
main.ts(19,34): error TS2540: Cannot assign to 'length' because it is a read-only property.
main.ts(40,16): error TS2345: Argument of type 'readonly number[]' is not assignable to parameter of type 'number[]'.
  The type 'readonly number[]' is 'readonly' and cannot be assigned to the mutable type 'number[]'.
~~~

and example 2:

~~~text
main.ts(7,33): error TS2540: Cannot assign to '0' because it is a read-only property.
main.ts(9,30): error TS2339: Property 'push' does not exist on type 'Point'.
main.ts(23,7): error TS4104: The type 'Point' is 'readonly' and cannot be assigned to the mutable type '[number, number]'.
main.ts(38,8): error TS2345: Argument of type 'readonly [255, 128, 0]' is not assignable to parameter of type 'unknown[]'.
  The type 'readonly [255, 128, 0]' is 'readonly' and cannot be assigned to the mutable type 'unknown[]'.
~~~

The rejected writes in examples 1 and 2 sit inside arrow functions that are never called, so they do not disturb the output. Example 1, readonly arrays, prints:

~~~text
true true
[95,77,90] [72,85,90] [90,72,85]
true 2
2 82.3
[85,72,90]
true false
4
~~~

Example 2, readonly tuples, prints:

~~~text
[0,0] function function
true true
1 2
255 1 x
true 3
~~~

## 7. Comparison

| | \`T[]\` | \`readonly T[]\` | \`[A, B]\` | \`readonly [A, B]\` | \`Object.freeze(arr)\` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Fixed length | no | no | in types (but \`push\` exists) | yes | yes, at run time |
| Index writes | yes | compile error | yes | compile error | ignored or \`TypeError\` |
| Mutating methods | yes | absent | yes | absent | throw \`TypeError\` |
| Assignable to \`T[]\` | yes | no | yes | no | no (typed readonly) |
| Exists at run time | plain array | plain array | plain array | plain array | frozen array |

## Common Pitfalls

- **Typing read-only parameters as \`T[]\`.** It forces callers with readonly data to copy, and it lets the function mutate. Use \`readonly T[]\`.
- **Calling \`sort\` on a readonly array.** It is not there for a reason: it mutates. Use \`[...arr].sort()\` or, with lib ES2023, \`arr.toSorted()\`.
- **Believing readonly freezes the value.** It is a view. Anyone with a mutable reference can still change the array, and nothing is checked at run time.
- **Writing \`readonly Array<T>\`.** The modifier only works on \`T[]\` and tuple syntax; use \`ReadonlyArray<T>\`.
- **Generic constraints of \`unknown[]\`.** They reject \`as const\` tuples; use \`readonly unknown[]\`.
- **Expecting deep immutability.** \`readonly User[]\` stops you replacing elements, but each \`User\` object can still be modified. That needs \`readonly\` properties or a \`DeepReadonly\` type.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlyArray&lt;T&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly T[]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;T[]&gt;</code> are one type: an array you can read but not change — no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>, no index writes, read-only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Tuples:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly [A, B]</code> adds that to a tuple, so it also keeps its length; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> on an array literal produces one with literal types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Assignability:</strong> <span style="color:#f0e2c8;">Mutable to readonly is allowed, readonly to mutable is an error, because the receiver might write. So I type parameters I only read as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly T[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Generics:</strong> <span style="color:#f0e2c8;">In library code I constrain with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends readonly unknown[]</code>, otherwise callers cannot pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> tuples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">It is compile-time only and shallow: the run-time value is a normal array, a mutable alias can still change it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> is the run-time counterpart.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort</code> not exist on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly number[]</code> when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">map</code> does?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> reorders the array in place, which is a mutation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> return a new array. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...arr].sort()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSorted()</code> with lib ES2023.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">number[]</code> be passed to a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly number[]</code> parameter but not the reverse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reading from a mutable array is always safe. Passing a read-only view to code that may call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> would break the promise the readonly type made, so tsc reports TS4104 or TS2345.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly</code> stop the array changing at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Types are erased; the array is ordinary and a mutable alias can still push into it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> gives a run-time lock and is typed as returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly T[]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly [number, number]</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[number, number]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both have two typed positions. The mutable one still has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and allows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t[0] = 1</code>; the readonly one has neither and is not assignable to the mutable one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly T[]</code> arrive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TypeScript 3.4 added the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> modifier for array and tuple types, together with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlyArray&lt;T&gt;</code> existed before that.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| ReadonlyArray | The array type with only non-mutating members; also written \`readonly T[]\` |
| Readonly tuple | \`readonly [A, B]\`: fixed positions with no writes and no mutating methods |
| Readonly-to-mutable assignability | Readonly arrays cannot be assigned to mutable ones; the reverse is fine |

**Conclusion:** \`ReadonlyArray<T>\` (written \`readonly T[]\`) and readonly tuples let a type say "you may look but not touch": every mutating method disappears, index writes and \`length\` changes are rejected, and the type cannot be smuggled into a mutable slot. Used on parameters and generic constraints, they document intent and accept both kinds of caller. Remember that the promise is compile-time and shallow — the array is still an ordinary array at run time, and its elements are not protected — and reach for \`Object.freeze\` or deep readonly types when you need more.`,
    examples: [
      {
        label: `readonly T[]: what is blocked and how it flows into functions`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Three spellings of the same type.
const e1: Equal<ReadonlyArray<number>, readonly number[]> = true;
const e2: Equal<Readonly<number[]>, readonly number[]> = true;
console.log(e1, e2);

const scores: readonly number[] = [90, 72, 85];

// Mutating methods do not exist on the readonly type.
// @ts-expect-error Property 'push' does not exist on type 'readonly number[]'.
const tryPush = () => scores.push(100);
// @ts-expect-error Property 'sort' does not exist on type 'readonly number[]'.
const trySort = () => scores.sort();
// Index assignment and length changes are rejected too.
// @ts-expect-error Index signature in type 'readonly number[]' only permits reading.
const tryIndex = () => { scores[0] = 0; };
// @ts-expect-error Cannot assign to 'length' because it is a read-only property.
const tryLength = () => { scores.length = 0; };

// Non-mutating methods are all still there, and return normal arrays.
const curved = scores.map((s) => s + 5);
const sorted = [...scores].sort((a, b) => a - b);
console.log(JSON.stringify(curved), JSON.stringify(sorted), JSON.stringify(scores));
console.log(scores.includes(72), scores.slice(0, 2).length);

// A function that promises not to change its input.
function average(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
// A mutable array is accepted where a readonly one is expected...
const live: number[] = [1, 2, 3];
console.log(average(live), average(scores).toFixed(1));

// ...but not the other way round.
function shuffleInPlace(values: number[]): void {
  values.reverse();
}
// @ts-expect-error The type 'readonly number[]' is 'readonly' and cannot be assigned to the mutable type 'number[]'.
shuffleInPlace(scores);
// The error was reported, but the emitted JavaScript still ran the call.
console.log(JSON.stringify(scores));

// readonly is compile-time only: the run-time array is an ordinary array.
console.log(Array.isArray(scores), Object.isFrozen(scores));
// Anyone holding a mutable reference can still change it.
const alias: readonly number[] = live;
live.push(4);
console.log(alias.length);`,
      },
      {
        label: `Readonly tuples, as const and generic constraints`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A readonly tuple: fixed positions AND no writes.
type Point = readonly [x: number, y: number];
const origin: Point = [0, 0];
// @ts-expect-error Cannot assign to '0' because it is a read-only property.
const tryWrite = () => { origin[0] = 5; };
// @ts-expect-error Property 'push' does not exist on type 'Point'.
const tryPush = () => origin.push(1);
console.log(JSON.stringify(origin), typeof tryWrite, typeof tryPush);

// Readonly<T> on a tuple type gives the same readonly tuple.
const e1: Equal<Readonly<[number, number]>, readonly [number, number]> = true;
// as const on an array literal produces a readonly tuple of literal types.
const rgb = [255, 128, 0] as const;
const e2: Equal<typeof rgb, readonly [255, 128, 0]> = true;
console.log(e1, e2);

// Mutable tuple -> readonly tuple is fine; the reverse is rejected.
const mutable: [number, number] = [1, 2];
const frozenView: Point = mutable;
// @ts-expect-error The type 'Point' is 'readonly' and cannot be assigned to the mutable type '[number, number]'.
const back: [number, number] = origin;
console.log(frozenView[0], back.length);

// Library tip: constrain generics with readonly unknown[] so callers can pass both kinds.
function firstOf<T extends readonly unknown[]>(items: T): T[0] {
  return items[0];
}
console.log(firstOf(rgb), firstOf(mutable), firstOf(["x", 1] as const));
const e3: Equal<ReturnType<typeof firstOf<typeof rgb>>, 255> = true;

// The narrower constraint unknown[] rejects readonly input.
function lastOf<T extends unknown[]>(items: T) {
  return items[items.length - 1];
}
// @ts-expect-error The type 'readonly [255, 128, 0]' is 'readonly' and cannot be assigned to the mutable type 'unknown[]'.
lastOf(rgb);
console.log(e3, lastOf([1, 2, 3]));`,
      },
    ],
  },
  {
    title: `How do you make values immutable in TypeScript?`,
    difficulty: "easy",
    seoDescription: `The layers of immutability in TypeScript: const, readonly, Readonly<T>, as const, DeepReadonly and Object.freeze, and which ones hold at run time.`,
    description: `**Question presented to candidate:**
"How do you make values immutable in TypeScript? Walk me through the tools, and tell me which ones actually stop a value changing at run time."

**What a strong answer should cover:**
- \`const\` only stops re-assigning the variable; the object it points to can still be changed
- Compile-time tools: \`readonly\` properties, \`Readonly<T>\`, \`readonly T[]\` / \`ReadonlyArray<T>\`, \`ReadonlyMap\` / \`ReadonlySet\`, \`as const\`, and a recursive \`DeepReadonly<T>\` for nested data
- Run-time tool: \`Object.freeze\` (typed as \`Readonly<T>\`), which is shallow, fails silently in sloppy mode and throws in strict mode; a \`deepFreeze\` helper for nested data
- The limits: all of the type-level tools are erased and shallow, and readonly object properties do not affect assignability, so a mutable alias can still write
- Classes: \`readonly\` fields set once in the constructor, \`#private\` fields with a getter for computed read-only state
- The everyday pattern: update by creating new objects (\`{ ...p, y: 3 }\`) rather than writing in place

**Clarifying questions expected:**
- Do we need run-time protection (shared config, untrusted plugins) or is a compile-time guarantee enough?
- How deep is the data: a flat config object or nested state such as a Redux store?

**Code / implementation expected:** Optional — a \`readonly\` interface, \`Readonly<T>\` and \`Object.freeze\`, with one rejected write.`,
    answer: `**Target Audience:** Developers who want to stop accidental mutation of config, state and shared data, and who need to know which guarantee each tool really gives.
**Difficulty:** Easy
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A museum protects a painting in layers. A sign says "Please do not touch" — polite visitors obey it, but nothing physically stops anyone. A rope barrier is harder to ignore. A sealed glass case actually stops hands reaching the canvas. And even the glass case only protects what is inside it: the frame hanging on the wall outside is still exposed.

TypeScript gives you the same layers. Most of them are **signs**: the compiler refuses to compile code that writes, but at run time nothing is enforced. One of them, \`Object.freeze\`, is the **glass case**. And almost all of them are **shallow**: they protect the top level, not the objects nested inside.

Knowing which layer you are using is the whole answer to this question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is a compile-time guarantee enough, or must it hold at run time? | \`readonly\` is erased; only \`Object.freeze\` protects against plain JavaScript or untrusted code. |
| How deeply nested is the data? | Every built-in tool is shallow; nested state needs \`DeepReadonly\` or \`deepFreeze\`. |
| Is this hot-path data? | Freezing and copying cost time and memory; type-level readonly costs nothing at run time. |
| Who writes the code that touches it — our team, or third-party plugins? | Plugins may be plain JavaScript and ignore every type. |

## 3. The Layers, From Weakest to Strongest

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Four layers of immutability: const protects the variable binding, readonly and Readonly protect properties at compile time, DeepReadonly protects nested data at compile time, Object.freeze protects one level at run time">
  <rect class="d-box-muted" x="20" y="20" width="640" height="56" rx="10"/>
  <text class="d-text" x="40" y="44">const</text>
  <text class="d-sub" x="40" y="64">stops re-assigning the variable only</text>
  <rect class="d-box" x="20" y="96" width="640" height="56" rx="10"/>
  <text class="d-text" x="40" y="120">readonly, Readonly, ReadonlyArray, as const</text>
  <text class="d-sub" x="40" y="140">compile time, top level only</text>
  <rect class="d-box" x="20" y="172" width="640" height="56" rx="10"/>
  <text class="d-text" x="40" y="196">DeepReadonly</text>
  <text class="d-sub" x="40" y="216">compile time, every level</text>
  <rect class="d-box-accent" x="20" y="248" width="640" height="56" rx="10"/>
  <text class="d-text" x="40" y="272">Object.freeze and deepFreeze</text>
  <text class="d-sub" x="40" y="292">run time: writes fail or throw</text>
</svg>

Each layer adds a guarantee the one above lacks. The first three are erased when TypeScript compiles to JavaScript; only the last one exists at run time.

### Layer 1: \`const\`

\`const settings = { theme: "dark" }\` stops \`settings = somethingElse\` (\`Cannot assign to 'settings' because it is a constant.\` is the TS2588 message). It does **not** stop \`settings.theme = "light"\`, and the run prints \`light\`.

📌 **Interview term: binding vs value immutability** — \`const\` makes the *binding* (the variable name) permanent; it says nothing about whether the *value* it points to can change.

### Layer 2: \`readonly\` and \`Readonly<T>\`

~~~ts
interface Config {
  readonly apiUrl: string;
  readonly retries: number;
  tags: string[];
}
config.retries = 5;   // error TS2540: Cannot assign to 'retries' because it is a read-only property.
config.tags.push("b"); // fine: readonly is shallow
~~~

\`Readonly<T>\` is the utility type that adds \`readonly\` to every top-level property of \`T\` (a mapped type: \`{ readonly [K in keyof T]: T[K] }\`). For collections there are matching read-only types: \`readonly T[]\` (see [What is ReadonlyArray and readonly tuple?](/interview-question/what-is-readonlyarray-and-readonly-tuple)), \`ReadonlyMap<K, V>\` and \`ReadonlySet<T>\`, which drop \`set\`, \`add\`, \`delete\` and \`clear\` (\`Property 'add' does not exist on type 'ReadonlySet<number>'.\`).

\`as const\` makes a whole literal readonly, nested levels included, and narrows its values to literal types. It has its own page: [What does as const do?](/interview-question/what-does-as-const-do)

📌 **Interview term: readonly modifier** — a property modifier that makes assignment to the property a compile error. It can be removed again in a mapped type with \`-readonly\`, which is how a \`Mutable<T>\` helper is written.

### Layer 3: \`DeepReadonly<T>\`

The built-ins stop at the first level. For nested state you write a recursive mapped type:

~~~ts
type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
~~~

Functions are left alone, arrays become \`ReadonlyArray\` of deep-readonly elements, objects get \`readonly\` on every key recursively, and primitives pass through. With it, both \`state.user.name = "Lin"\` (\`Cannot assign to 'name' because it is a read-only property.\`) and \`state.user.roles.push("guest")\` (\`Property 'push' does not exist on type 'readonly string[]'.\`) are rejected. The same recursive pattern builds a \`DeepPartial\` — see [How would you build a DeepPartial type?](/interview-question/how-would-you-build-a-deeppartial-type) and [What are recursive types?](/interview-question/what-are-recursive-types)

📌 **Interview term: shallow vs deep immutability** — shallow protects only the top-level properties; deep protects every nested object and array as well.

### Layer 4: \`Object.freeze\` (the only run-time lock)

\`Object.freeze(obj)\` is JavaScript, so it survives compilation. TypeScript types its return value as \`Readonly<T>\`, so writes are also compile errors. At run time:

- In **sloppy mode** (how this page runs code), a write to a frozen property is silently ignored: \`frozen.level\` still prints \`1\`.
- In **strict mode** (ES modules, classes, \`"use strict"\`), the same write throws a \`TypeError\`.
- Mutating methods on a frozen array, such as \`push\`, throw a \`TypeError\` in both modes (example 2 catches it).
- It is **shallow**: \`frozen.nested.count = 99\` worked, and \`Object.isFrozen(frozen.nested)\` is \`false\`. TypeScript agrees: the nested property is not readonly in the type either.

A \`deepFreeze\` helper walks the object, freezes every level, and returns \`DeepReadonly<T>\`, giving you the deep compile-time and the deep run-time guarantee together. Example 2 shows \`Object.isFrozen\` is \`true\` at all three levels.

📌 **Interview term: Object.freeze** — a JavaScript built-in that makes an object non-extensible and all its own properties non-writable and non-configurable. It works on one level only.

## 4. The Big Trap: Readonly Properties Do Not Affect Assignability

~~~ts
const locked: { readonly count: number } = { count: 1 };
const sneaky: { count: number } = locked;   // no error!
sneaky.count = 2;
console.log(locked.count);                   // 2
~~~

TypeScript allows assigning a type with readonly properties to the same type without them, so a second, mutable reference can change the "locked" object. (Readonly *arrays* are stricter: \`readonly number[]\` is not assignable to \`number[]\`.) This is why type-level readonly is best understood as "this code promises not to write", not "nobody can write".

## 5. Classes

~~~ts
class Account {
  readonly id: string;        // may be set in the constructor, then never again
  #balance = 0;               // truly private at run time
  get balance(): number { return this.#balance; }
}
acct.id = "acc-2";      // error TS2540
acct.balance = 1000;    // error TS2540: a getter without a setter is read-only
~~~

\`readonly\` fields can be assigned in their declaration or the constructor. A \`#private\` field behind a getter gives read-only access from outside while the class itself can still update it. More on modifiers in [What are access modifiers in TypeScript classes?](/interview-question/what-are-access-modifiers-in-typescript-classes)

## 6. The Everyday Pattern: Update by Copying

Immutability is mostly a habit: instead of writing into an object, build a new one. \`const next: Readonly<Point> = { ...p, y: 3 }\` leaves \`p\` alone. Combined with readonly types, any accidental in-place write becomes a compile error, which is the update style React state and Redux reducers expect.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(14,8): error TS2540: Cannot assign to 'retries' because it is a read-only property.
main.ts(23,3): error TS2540: Cannot assign to 'x' because it is a read-only property.
main.ts(30,8): error TS2540: Cannot assign to 'level' because it is a read-only property.
main.ts(41,26): error TS2339: Property 'add' does not exist on type 'ReadonlySet<number>'.
~~~

and example 2:

~~~text
main.ts(12,36): error TS2540: Cannot assign to 'name' because it is a read-only property.
main.ts(14,40): error TS2339: Property 'push' does not exist on type 'readonly string[]'.
main.ts(57,28): error TS2540: Cannot assign to 'id' because it is a read-only property.
main.ts(59,33): error TS2540: Cannot assign to 'balance' because it is a read-only property.
~~~

Example 1, the layers, prints:

~~~text
light
5 ["a","b"]
10
1 true
99 false
true 36 function
2
{"x":10,"y":2} {"x":10,"y":3}
~~~

Read it top to bottom: \`light\` (const did not protect the object), \`5\` and \`10\` (the type errors on \`config.retries\` and \`p.x\` did not stop the JavaScript), \`1 true\` (the frozen write was silently ignored), \`99 false\` (freeze is shallow), \`2\` (the readonly object was changed through a mutable alias).

Example 2, deep immutability and classes, prints:

~~~text
Ada function function
true true true
TypeError
Ada ["admin"]
acc-1 50 function function
~~~

After \`deepFreeze\`, bypassing the types with \`as unknown as State\` does not help: the nested \`name\` write was ignored and the \`push\` threw a \`TypeError\`.

## 8. Comparison

| Tool | Checked when | Depth | Cost at run time | Notes |
| :--- | :--- | :--- | :--- | :--- |
| \`const\` | compile + run | binding only | none | does not protect the value |
| \`readonly\` property | compile | one level | none | does not affect assignability |
| \`Readonly<T>\` | compile | one level | none | mapped type over all keys |
| \`readonly T[]\`, \`ReadonlyMap\`, \`ReadonlySet\` | compile | one level | none | mutating methods removed |
| \`as const\` | compile | every level of the literal | none | also narrows to literal types |
| \`DeepReadonly<T>\` | compile | every level | none | hand-written recursive type |
| \`Object.freeze\` | run (and typed) | one level | small | silent in sloppy mode, throws in strict |
| \`deepFreeze\` | run (and typed) | every level | walks the object | pair with \`DeepReadonly\` |

## Common Pitfalls

- **Thinking \`const\` means immutable.** It only fixes the variable; \`obj.prop = x\` still works.
- **Forgetting everything is shallow.** \`Readonly<T>\`, \`readonly\` and \`Object.freeze\` protect one level; nested objects and arrays stay writable.
- **Trusting readonly across aliases.** \`{ readonly a: number }\` is assignable to \`{ a: number }\` without error, so another reference can write.
- **Expecting \`Object.freeze\` to throw.** In sloppy-mode scripts a write is silently ignored; only strict code throws.
- **Freezing in hot paths.** Deep-freezing large objects on every update walks the whole object each time; consider freezing only in development builds and relying on the types in production.
- **Mutating then copying.** \`arr.sort()\` before \`[...arr]\` still changed the original; copy first, then sort.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. const:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> makes the <strong style="color:#ffca28;">binding</strong> permanent, not the value: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const obj = {}</code> can still have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.x = 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Type level:</strong> <span style="color:#f0e2c8;">For compile-time immutability I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> properties, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly T[]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlyMap</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadonlySet</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> for literals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shallow:</strong> <span style="color:#f0e2c8;">All of those are shallow, so for nested state I write a recursive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeepReadonly&lt;T&gt;</code> mapped type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Run time:</strong> <span style="color:#f0e2c8;">Types are erased. If I need a real lock I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code>, typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code>; it is shallow too, ignores writes in sloppy mode and throws in strict mode, so nested data needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepFreeze</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveat:</strong> <span style="color:#f0e2c8;">Readonly object properties do not affect assignability, so a mutable alias can still write. The habit that makes it all work is updating by copying: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ...p, y: 3 }</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code> make nested objects readonly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, only the top-level properties. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;{ inner: { b: number } }&gt;</code> still allows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x.inner.b = 2</code>. You need a recursive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeepReadonly&lt;T&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> on a literal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.freeze</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code> is a compile-time type that disappears after compilation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> is a run-time call that makes properties non-writable. TypeScript types the result of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">freeze</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code>, so you get both, but only one level deep.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a readonly property still change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Assigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ readonly count: number }</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ count: number }</code> compiles, and writes through the second reference change the object. Readonly arrays are stricter and reject that assignment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you remove readonly from a type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a mapped type using the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-readonly</code> modifier: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Mutable&lt;T&gt; = { -readonly [K in keyof T]: T[K] }</code>. Use it sparingly, for example in builders or tests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do readonly class fields differ from private fields?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> field is public to read and can only be assigned in its declaration or the constructor. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> field is hidden at run time; behind a getter it gives read-only access from outside while the class keeps the right to update it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Binding vs value immutability | \`const\` fixes the variable name, not the object it refers to |
| Readonly modifier | Makes assignment to a property a compile error; removable with \`-readonly\` |
| Shallow vs deep immutability | One level protected versus every nested level |
| Object.freeze | Run-time lock on one level of an object |

**Conclusion:** Immutability in TypeScript comes in layers. \`const\` fixes a variable; \`readonly\`, \`Readonly<T>\`, the read-only collection types and \`as const\` make writes compile errors; a recursive \`DeepReadonly<T>\` extends that to nested data; and only \`Object.freeze\` (or a \`deepFreeze\`) stops writes at run time. Every built-in layer is shallow, and type-level readonly is a promise about your code rather than a lock on the value. A strong answer names the layers, says which ones are erased, and pairs them with the habit of updating by copying.`,
    examples: [
      {
        label: `From const to Object.freeze: what each layer stops`,
        code: `// Layer 1: const stops re-assigning the variable, not changing the object.
const settings = { theme: "dark" };
settings.theme = "light";
console.log(settings.theme);

// Layer 2: readonly properties stop writes through this type.
interface Config {
  readonly apiUrl: string;
  readonly retries: number;
  tags: string[];
}
const config: Config = { apiUrl: "https://api.example.com", retries: 3, tags: ["a"] };
// @ts-expect-error Cannot assign to 'retries' because it is a read-only property.
config.retries = 5;
// readonly is shallow: the array inside can still be changed.
config.tags.push("b");
console.log(config.retries, JSON.stringify(config.tags));

// Layer 3: Readonly<T> makes every top-level property readonly.
type Point = { x: number; y: number };
const p: Readonly<Point> = { x: 1, y: 2 };
// @ts-expect-error Cannot assign to 'x' because it is a read-only property.
p.x = 10;
console.log(p.x);

// The run printed 5 and 10 above: the type errors do not stop the JavaScript.
// Layer 4: Object.freeze is a real run-time lock (and typed as Readonly<T>).
const frozen = Object.freeze({ level: 1, nested: { count: 0 } });
// @ts-expect-error Cannot assign to 'level' because it is a read-only property.
frozen.level = 2;
// Not strict mode here, so the write above was silently ignored.
console.log(frozen.level, Object.isFrozen(frozen));
// freeze is shallow too, in types and at run time.
frozen.nested.count = 99;
console.log(frozen.nested.count, Object.isFrozen(frozen.nested));

// Readonly collections.
const ids: ReadonlySet<number> = new Set([1, 2]);
const ages: ReadonlyMap<string, number> = new Map([["ada", 36]]);
// @ts-expect-error Property 'add' does not exist on type 'ReadonlySet<number>'.
const tryAdd = () => ids.add(3);
console.log(ids.has(1), ages.get("ada"), typeof tryAdd);

// Pitfall: readonly does not affect assignability, so an alias can write.
const locked: { readonly count: number } = { count: 1 };
const sneaky: { count: number } = locked;
sneaky.count = 2;
console.log(locked.count);

// Updating immutably: build a new object instead of writing.
const next: Readonly<Point> = { ...p, y: 3 };
console.log(JSON.stringify(p), JSON.stringify(next));`,
      },
      {
        label: `DeepReadonly, deepFreeze and readonly class fields`,
        code: `// A recursive mapped type: readonly all the way down.
type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type State = { user: { name: string; roles: string[] }; count: number };

const state: DeepReadonly<State> = { user: { name: "Ada", roles: ["admin"] }, count: 0 };
// @ts-expect-error Cannot assign to 'name' because it is a read-only property.
const tryName = () => { state.user.name = "Lin"; };
// @ts-expect-error Property 'push' does not exist on type 'readonly string[]'.
const tryRole = () => state.user.roles.push("guest");
console.log(state.user.name, typeof tryName, typeof tryRole);

// A matching run-time helper: freeze every nested object, return the deep type.
function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
const app = deepFreeze({ user: { name: "Ada", roles: ["admin"] }, count: 0 });
console.log(Object.isFrozen(app), Object.isFrozen(app.user), Object.isFrozen(app.user.roles));

// Bypass the types to show the run-time lock (sloppy mode: writes fail silently).
const raw = app as unknown as State;
raw.user.name = "Lin";
try {
  raw.user.roles.push("guest");
} catch (e) {
  console.log((e as Error).name);
}
console.log(app.user.name, JSON.stringify(app.user.roles));

// Classes: readonly fields can be set once, in the constructor.
class Account {
  readonly id: string;
  #balance = 0;
  constructor(id: string) {
    this.id = id;
  }
  get balance(): number {
    return this.#balance;
  }
  deposit(amount: number): Account {
    this.#balance += amount;
    return this;
  }
}
const acct = new Account("acc-1").deposit(50);
// @ts-expect-error Cannot assign to 'id' because it is a read-only property.
const tryId = () => { acct.id = "acc-2"; };
// @ts-expect-error Cannot assign to 'balance' because it is a read-only property.
const tryBalance = () => { acct.balance = 1000; };
console.log(acct.id, acct.balance, typeof tryId, typeof tryBalance);`,
      },
    ],
  },
  {
    title: `What does as const do?`,
    difficulty: "medium",
    seoDescription: `as const keeps literal types, makes every property readonly and turns arrays into readonly tuples, so you can derive union types from data.`,
    description: `**Question presented to candidate:**
"What does \`as const\` do in TypeScript? Show me what type you get with and without it, and tell me where you would actually use it."

**What a strong answer should cover:**
- \`as const\` is a const assertion: it stops literal widening, makes every property \`readonly\` and turns array literals into readonly tuples, recursively through the literal
- The before/after types: \`{ method: string }\` vs \`{ readonly method: "GET" }\`, \`string[]\` vs \`readonly ["a", "b"]\`
- Why it matters: values then fit literal-union parameters, and you can derive types from data with \`(typeof ROLES)[number]\` or \`(typeof Obj)[keyof typeof Obj]\`, an enum alternative
- Returning tuples from functions (\`return [value, setValue] as const\`)
- Limits: it is compile-time only (nothing is frozen), it only applies to literals (TS1355 otherwise), and it is not a type check
- Related tools: \`as const satisfies T\` to check a shape while keeping literals (TypeScript 4.9), and \`const\` type parameters (TypeScript 5.0) to get the same inference at a call site

**Code / implementation expected:** Yes — a config or list with \`as const\`, plus a union type derived from it.`,
    answer: `**Target Audience:** Developers who have seen \`as const\` in codebases and want to know exactly what it changes and when to use it.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You fill in a form at the bank and write your account number in pen. A helpful clerk types it into the system as "a number, about eight digits long". Technically true — but now the system cannot tell your account apart from anyone else's. What you wanted recorded was **exactly this number, and it must not change**.

TypeScript's default inference behaves like that clerk. Write \`const config = { method: "GET" }\` and it records \`method\` as \`string\`, because you might change it to another string later. Most of the time that is helpful. When you meant "exactly \`"GET"\`, and never anything else", you add \`as const\`, the pen-not-pencil marker.

## 2. What \`as const\` Changes

Compare the same literal with and without it (both types are checked with \`Equal\` in example 1):

~~~ts
const plain  = { method: "GET", retries: 3, tags: ["a", "b"] };
// { method: string; retries: number; tags: string[] }

const locked = { method: "GET", retries: 3, tags: ["a", "b"] } as const;
// { readonly method: "GET"; readonly retries: 3; readonly tags: readonly ["a", "b"] }
~~~

Three things happened, at every level of the literal:

1. **No widening.** \`"GET"\` stays the literal type \`"GET"\` instead of \`string\`, and \`3\` stays \`3\`.
2. **Every property is \`readonly\`.** \`locked.method = "POST"\` fails with \`Cannot assign to 'method' because it is a read-only property.\`
3. **Arrays become readonly tuples.** \`["a", "b"]\` becomes \`readonly ["a", "b"]\`: fixed length, fixed values, no \`push\`.

📌 **Interview term: const assertion** — the \`as const\` suffix on a literal expression. It tells the compiler to infer the narrowest possible type: literal types, readonly properties and readonly tuples. Const assertions were added in TypeScript 3.4 ([TypeScript 3.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html)).

📌 **Interview term: literal widening** — the default inference rule that turns a literal like \`"GET"\` into its general type \`string\` wherever the value could later change (object properties, \`let\` variables, array elements). Covered in depth in [What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Without as const the literal GET widens to string and the array to string array, with as const it stays the readonly literal GET and a readonly tuple">
  <defs>
    <marker id="ac-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="120" text-anchor="middle">method: GET</text>
  <text class="d-sub" x="110" y="142" text-anchor="middle">tags: a, b</text>
  <rect class="d-box-muted" x="440" y="20" width="220" height="70" rx="10"/>
  <text class="d-text" x="550" y="50" text-anchor="middle">method: string</text>
  <text class="d-sub" x="550" y="72" text-anchor="middle">tags: string[]</text>
  <rect class="d-box-accent" x="440" y="160" width="220" height="70" rx="10"/>
  <text class="d-text" x="550" y="190" text-anchor="middle">readonly method: GET</text>
  <text class="d-sub" x="550" y="212" text-anchor="middle">readonly tags: readonly [a, b]</text>
  <path class="d-edge" d="M 204 110 L 434 60" marker-end="url(#ac-arrow)"/>
  <text class="d-sub" x="300" y="62" text-anchor="middle">default inference</text>
  <path class="d-edge-accent" d="M 204 140 L 434 190" marker-end="url(#ac-arrow)"/>
  <text class="d-accent" x="300" y="200" text-anchor="middle">as const</text>
</svg>

The same object literal can be inferred two ways: the default widens it so it can change later, \`as const\` keeps the exact values and locks them.

## 3. Why You Would Want That

### Passing values to literal-union parameters

~~~ts
type Method = "GET" | "POST";
function send(method: Method) { ... }
send(plain.method);    // error: Argument of type 'string' is not assignable to parameter of type 'Method'.
send(locked.method);   // fine: the type is "GET"
~~~

This is the most common reason people meet \`as const\`: a config object written in one place is passed to a function that only accepts specific strings.

### One source of truth for values and types

~~~ts
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];   // "admin" | "editor" | "viewer"
~~~

The array exists at run time (so you can loop over it or validate input against it, as \`isRole\` does), and the type is derived from it, so they can never drift apart. \`(typeof ROLES)[number]\` reads as "the type of any element of \`ROLES\`". Without \`as const\` it would just be \`string\`. The general technique is covered in [How do you get a union of an object's values as a type?](/interview-question/how-do-you-get-a-union-of-an-object-s-values-as-a-type) and [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript)

### An object as a lightweight enum

~~~ts
const Status = { Active: "active", Banned: "banned" } as const;
type Status = (typeof Status)[keyof typeof Status];   // "active" | "banned"
~~~

You get \`Status.Active\` for readable call sites, plain string values at run time (\`Object.values(Status)\` prints \`["active","banned"]\`), and callers may also pass the raw string \`"active"\`. The trade-offs against real \`enum\` are in [What are enums and what are their trade-offs?](/interview-question/what-are-enums-and-what-are-their-trade-offs)

### Returning tuples

A function ending in \`return [on, toggle]\` infers \`(boolean | (() => boolean))[]\`. Ending it with \`return [on, toggle] as const\` infers \`readonly [boolean, () => boolean]\`, so each destructured name keeps its own type — the \`useState\` pattern. See [What are tuple types?](/interview-question/what-are-tuple-types)

### On a \`let\`

\`let a = "up"\` is \`string\`; \`let b = "up" as const\` is \`"up"\`. (A \`const\` declaration of a primitive is already a literal type without the assertion.)

## 4. What \`as const\` Does Not Do

- **It does not freeze anything.** It is erased like every type. \`Object.isFrozen(locked)\` printed \`false\`. For a run-time lock use \`Object.freeze\` — compared in [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript)
- **It does not check a shape.** \`as const\` never reports a typo in a property name. That is what \`satisfies\` is for (below).
- **It only works on literals.** On anything else, such as the result of a ternary stored in a variable, you get:

~~~text
error TS1355: A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals.
~~~

(The ungrammatical "A 'const' assertions" is the compiler's real wording.) Despite the \`as\`, it is safe: unlike \`x as SomeType\` it cannot lie about a value, it only picks the narrowest type for what is literally written. Ordinary assertions are discussed in [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)

## 5. Its Two Partners: \`satisfies\` and \`const\` Type Parameters

**\`as const satisfies T\`** combines both jobs: \`satisfies\` checks the value against a type without widening it (added in TypeScript 4.9, per the [TypeScript 4.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/)), and \`as const\` keeps the literals. In example 2, \`routes.admin.path\` keeps the type \`"/admin"\`, and a typo is caught:

~~~text
error TS2353: Object literal may only specify known properties, and 'auht' does not exist in type 'Route'.
~~~

Full details: [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do) and [How does satisfies validate shape without widening literal types?](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types)

**\`const\` type parameters** move the assertion from every caller into the function. \`function defineRoles<const T extends readonly string[]>(roles: T): T\` called as \`defineRoles(["read", "write"])\` returns \`readonly ["read", "write"]\` without the caller writing \`as const\`. This modifier arrived in TypeScript 5.0 ([Effective TypeScript, notes on the 5.0 beta](https://effectivetypescript.com/2023/02/07/ts-50-beta/)). Comparison and caveats: [What are const type parameters and why are they better than as const?](/interview-question/what-are-const-type-parameters-const-t-and-why-are-they-better-than-as-const)

## 6. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(19,33): error TS2540: Cannot assign to 'method' because it is a read-only property.
main.ts(28,6): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Method'.
~~~

and example 2:

~~~text
main.ts(39,22): error TS2353: Object literal may only specify known properties, and 'auht' does not exist in type 'Route'.
main.ts(54,13): error TS1355: A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals.
~~~

Example 1, what \`as const\` changes, prints:

~~~text
true true
function
sent GET
true true
false true true
false false
~~~

The last line is the important one: \`false false\` for \`Object.isFrozen\` on the object and its array. \`as const\` changed the types only.

Example 2, deriving types from \`as const\` data, prints:

~~~text
true false true
BLOCKED OK true
["active","banned"]
/admin true
1
["read","write"] true
string
~~~

## 7. \`as const\` vs the Alternatives

| Tool | Narrows literals | Adds readonly | Checks a shape | Exists at run time |
| :--- | :--- | :--- | :--- | :--- |
| No annotation | no (widens) | no | no | — |
| Type annotation \`: Config\` | no (uses \`Config\`) | only if \`Config\` says so | yes | no |
| \`as const\` | yes, deeply | yes, deeply | no | no |
| \`satisfies Config\` | keeps inferred literals where the target type is a literal union; otherwise widens like no annotation | no | yes | no |
| \`as const satisfies Config\` | yes | yes | yes | no |
| \`<const T>\` type parameter | yes, at the call site | readonly only if the constraint is readonly | via the constraint | no |
| \`Object.freeze\` | for one level | one level | no | yes |

## Common Pitfalls

- **Expecting a run-time freeze.** \`as const\` is erased; \`Object.freeze\` is the run-time tool.
- **Then needing to mutate.** Everything is readonly, so \`locked.tags.push("c")\` and passing \`locked.tags\` to a \`string[]\` parameter both fail. Type such parameters as \`readonly string[]\`.
- **Applying it to a non-literal.** \`someVariable as const\` is error TS1355; put it on the literal where the value is written.
- **Losing the shape check.** \`as const\` alone never reports a misspelt key; add \`satisfies\`.
- **Annotating and asserting at once.** \`const x: Config = {...} as const\` throws the literal types away again, because the annotation wins. Use \`as const satisfies Config\`.
- **Forgetting \`typeof\`.** \`type R = ROLES[number]\` fails with \`'ROLES' refers to a value, but is being used as a type here. Did you mean 'typeof ROLES'?\`; you need \`(typeof ROLES)[number]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> is a <strong style="color:#ffca28;">const assertion</strong>: it tells TypeScript to infer the narrowest type for a literal instead of widening it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three effects:</strong> <span style="color:#f0e2c8;">Literals stay literal (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"GET"</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>), every property becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code>, and arrays become readonly tuples, all the way down.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Uses:</strong> <span style="color:#f0e2c8;">I use it for config passed to literal-union parameters, for deriving unions from data with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(typeof ROLES)[number]</code>, for enum-like objects, and for returning tuples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">It is compile-time only, so nothing is frozen; it only applies to literals; and it does not check a shape.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Partners:</strong> <span style="color:#f0e2c8;">For a shape check I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const satisfies T</code>, and in library APIs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameter gives callers the same inference without writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the type of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">["a", "b"] as const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly ["a", "b"]</code>: a readonly tuple of two literal types. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you turn an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code> array into a union type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Role = (typeof ROLES)[number]</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> lifts the value into a type and indexing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> gives the union of all element types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code> a type assertion like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as Foo</code>, and is it unsafe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It shares the syntax but not the risk. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as Foo</code> can claim something false; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> only narrows to exactly what is written, and it is limited to literals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const x: Config = {...} as const</code> lose the literal types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The annotation decides the type of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>; the asserted value is only checked against it. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const x = {...} as const satisfies Config</code> to keep both the check and the literals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code> object over an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">enum</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I want plain string values at run time with no generated code, callers allowed to pass the raw string, and easy iteration with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values</code>. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enum</code> adds a run-time object and nominal-style checks.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Const assertion | \`as const\`: infer literal types, readonly properties and readonly tuples |
| Literal widening | Default inference turning \`"GET"\` into \`string\` where the value could change |

**Conclusion:** \`as const\` switches inference from "what could this become" to "exactly what is written": literals stay literal, objects become deeply readonly and arrays become readonly tuples. That is what lets a config value fit a literal-union parameter, lets one array or object be the single source of truth for both a run-time list and a union type, and lets functions return precise tuples. It changes types only — nothing is frozen and no shape is checked — so pair it with \`satisfies\` for validation, with \`Object.freeze\` for run-time safety, and with \`const\` type parameters when the inference belongs in an API.`,
    examples: [
      {
        label: `What as const changes, proved with type checks`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Without as const: literals widen and arrays stay mutable arrays.
const plain = { method: "GET", retries: 3, tags: ["a", "b"] };
const e1: Equal<typeof plain, { method: string; retries: number; tags: string[] }> = true;

// With as const: three things happen, all the way down.
const locked = { method: "GET", retries: 3, tags: ["a", "b"] } as const;
// 1. literals keep their exact value  2. properties become readonly
// 3. arrays become readonly tuples
const e2: Equal<typeof locked, {
  readonly method: "GET";
  readonly retries: 3;
  readonly tags: readonly ["a", "b"];
}> = true;
console.log(e1, e2);

// @ts-expect-error Cannot assign to 'method' because it is a read-only property.
const tryWrite = () => { locked.method = "POST"; };
console.log(typeof tryWrite);

// Why it matters: a widened string does not fit a literal-union parameter.
type Method = "GET" | "POST";
function send(method: Method): string {
  return "sent " + method;
}
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'Method'.
send(plain.method);
console.log(send(locked.method));

// On a let, as const keeps the literal type that let would widen.
let a = "up";
let b = "up" as const;
const e3: Equal<typeof a, string> = true;
const e4: Equal<typeof b, "up"> = true;
console.log(e3, e4);

// Functions returning a pair: as const gives a tuple, not an array of a union.
function useToggle(initial: boolean) {
  let on = initial;
  const toggle = () => { on = !on; return on; };
  return [on, toggle] as const;
}
const [isOn, toggle] = useToggle(false);
const e5: Equal<ReturnType<typeof useToggle>, readonly [boolean, () => boolean]> = true;
console.log(isOn, toggle(), e5);

// as const is only a type-level change: nothing is frozen at run time.
console.log(Object.isFrozen(locked), Object.isFrozen(locked.tags));`,
      },
      {
        label: `Deriving unions, enum-like objects and as const satisfies`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// One array is the single source of truth for values AND the type.
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];
const e1: Equal<Role, "admin" | "editor" | "viewer"> = true;

// The run-time array powers a type guard for untrusted input.
function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
console.log(isRole("editor"), isRole("owner"), e1);

// An object as a lightweight enum.
const Status = {
  Active: "active",
  Banned: "banned",
} as const;
type Status = (typeof Status)[keyof typeof Status];
const e2: Equal<Status, "active" | "banned"> = true;
function label(s: Status): string {
  return s === Status.Active ? "OK" : "BLOCKED";
}
console.log(label(Status.Banned), label("active"), e2);
console.log(JSON.stringify(Object.values(Status)));

// as const satisfies: check the shape AND keep the literal types.
type Route = { path: string; auth: boolean };
const routes = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} as const satisfies Record<string, Route>;
const e3: Equal<typeof routes.admin.path, "/admin"> = true;
console.log(routes.admin.path, e3);

// A typo in the shape is still caught.
const broken = {
  // @ts-expect-error Object literal may only specify known properties
  home: { path: "/", auht: false },
} as const satisfies Record<string, Route>;
console.log(Object.keys(broken).length);

// A const type parameter gives callers the as const inference automatically.
function defineRoles<const T extends readonly string[]>(roles: T): T {
  return roles;
}
const fromCall = defineRoles(["read", "write"]);
const e4: Equal<typeof fromCall, readonly ["read", "write"]> = true;
console.log(JSON.stringify(fromCall), e4);

// as const only works on literals, not on arbitrary expressions.
const n = Math.random() > 2 ? "a" : "b";
// @ts-expect-error A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals.
const bad = n as const;
console.log(typeof bad);`,
      },
    ],
  },
];

export default augments;
