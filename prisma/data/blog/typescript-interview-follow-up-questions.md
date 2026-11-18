---
slug: typescript-interview-follow-up-questions
title: "TypeScript Interview Follow-Up Questions, Answered With TypeScript 7"
excerpt: Eight follow-ups interviewers ask after "do you know TypeScript?", from unknown vs any to satisfies, exhaustive checks and erased types, with every compiler error checked against tsc 7.0.2.
tags: ["interview", "typescript", "javascript", "frontend", "backend"]
cover: /blog-images/typescript-interview-follow-up-questions/cover.png
---

"Do you use TypeScript?" is not the real question. Almost everyone says yes. The real interview starts with the follow-up: *what is the difference between `unknown` and `any`?*, *why did this object literal fail but the variable passed?*, *what does `satisfies` give you that a type annotation does not?* Those questions separate people who add types to JavaScript from people who understand what the type checker is actually doing.

This post walks through the eight follow-ups that come up most, each with a one-line answer you can say out loud, a short explanation, and code. Every error message below is real: each snippet was type-checked with **TypeScript 7.0.2** (the new native compiler) using its default settings, and the runtime examples were run with Node.js 22.22.

A quick vocabulary note before we start. **Type checking** means the compiler reads your code and reports places where a value might not fit the type you said it has. It happens before the code runs. **Runtime** means when the JavaScript actually executes. Keeping those two apart is the theme behind most of these questions.

## 1. What is the difference between any, unknown and never?

> **Short answer:** `any` turns type checking off for a value; `unknown` means "could be anything, so prove what it is before you use it"; `never` means "no value can ever be here".

All three show up in the same file:

```typescript
function double(x) {
  return x * 2;
}
let a: any = "hello";
let u: unknown = "hello";
a.toUpperCase();
u.toUpperCase();
if (typeof u === "string") u.toUpperCase();
const n: number = a;
const m: number = u;
```

tsc 7.0.2 output:

```text
q1.ts(1,17): error TS7006: Parameter 'x' implicitly has an 'any' type.
q1.ts(7,1): error TS18046: 'u' is of type 'unknown'.
q1.ts(10,7): error TS2322: Type 'unknown' is not assignable to type 'number'.
```

Read the errors that are *missing* as carefully as the ones that appear:

- `a.toUpperCase()` passed, and so did `const n: number = a`, even though `a` holds a string. `any` is contagious: it silences the checker for that value and for everything it flows into.
- `u.toUpperCase()` failed until we **narrowed** it. Narrowing means using a runtime check (`typeof`, `instanceof`, `in`, a comparison) that the compiler understands, so inside the `if` it knows `u` is a `string`.
- Line 1 errored even though we never asked for strict mode. That is new: since TypeScript 6.0, `strict` is on by default, and 7.0 keeps that default ([TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). On older versions with no tsconfig `strict` flag, `x` silently became `any`.

`never` is the type with no values. You rarely write it on a variable; you meet it as the result of narrowing away every possibility, which is exactly what makes question 5 work.

**What the interviewer wants to hear:** use `unknown` for anything from outside your code (JSON, `catch` errors, message events) and narrow it; treat `any` as a last resort you can point to and justify.

## 2. type vs interface: which should I use?

> **Short answer:** both describe object shapes. Interfaces can be reopened and merged and report conflicting `extends` clearly; type aliases can name anything (unions, tuples, mapped types) but cannot be declared twice.

```typescript
interface User { id: number }
interface User { name: string }
const u: User = { id: 1, name: "Ada" };

type Account = { id: number };
type Account = { name: string };

interface Base { id: string }
interface Child extends Base { id: number }

type BaseT = { id: string };
type ChildT = BaseT & { id: number };
const c: ChildT = { id: 1 };
```

tsc 7.0.2 output:

```text
q2.ts(5,6): error TS2300: Duplicate identifier 'Account'.
q2.ts(6,6): error TS2300: Duplicate identifier 'Account'.
q2.ts(9,11): error TS2430: Interface 'Child' incorrectly extends interface 'Base'.
  Types of property 'id' are incompatible.
    Type 'number' is not assignable to type 'string'.
q2.ts(13,21): error TS2322: Type 'number' is not assignable to type 'never'.
```

Three differences you can show from this one file:

1. **Declaration merging.** The two `User` interfaces merged into one with both fields. The two `Account` types are a duplicate-name error. Merging is how libraries let you add fields to their types (for example, adding a property to `Window`).
2. **Conflicts are caught at the declaration with `extends`.** `Child` is rejected right where it is declared, with a clear reason.
3. **Conflicts are hidden with `&`.** The intersection `BaseT & { id: number }` is accepted. Its `id` becomes `string & number`, which is `never`, and you only find out later, when nothing can be assigned to it.

**A sensible rule:** use `interface` for object shapes other code may extend, and `type` for unions, tuples, function types and anything computed. Consistency within a codebase matters more than which one you pick.

![Interface declarations with the same name merge into one shape and report conflicting extends right away, while type aliases cannot be redeclared and an intersection with a conflicting property silently becomes never.](/blog-images/typescript-interview-follow-up-questions/interface-vs-type.svg)

## 3. Why did the object literal fail, but the same object in a variable pass?

> **Short answer:** TypeScript is structurally typed, so extra properties are normally fine. But a *fresh* object literal gets an extra "excess property check", because an unknown key written right there is almost always a typo.

```typescript
type Point = { x: number; y: number };
function plot(p: Point) { return p.x + p.y; }

plot({ x: 1, y: 2, z: 3 });

const p3 = { x: 1, y: 2, z: 3 };
plot(p3);
```

tsc 7.0.2 output:

```text
q3.ts(4,20): error TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
```

**Structural typing** means compatibility is decided by shape, not by name: anything with a numeric `x` and `y` is a `Point`, whatever else it carries. That is why `plot(p3)` passes. The inline literal fails only because of the excess property check, a deliberate extra rule for literals.

This is a favourite follow-up because it trips up people who think the second call "should" fail too. It also explains a real bug class: if you build an options object in a variable and misspell a key, nothing catches it.

## 4. What does satisfies do that a type annotation does not?

> **Short answer:** an annotation *replaces* the inferred type with the one you wrote; `satisfies` *checks* the value against a type but keeps the more precise inferred type. `as` does neither: it tells the compiler to trust you.

```typescript
type Color = "red" | "green" | "blue";
type Theme = Record<string, Color>;

const annotated: Theme = { primary: "red", accent: "blue" };
annotated.primary;   // type: Color
annotated.missing;   // no error: any string key is allowed

const checked = { primary: "red", accent: "blue" } satisfies Theme;
checked.primary;     // type: "red"
checked.missing;     // error

const wrong = { primary: "pink" } satisfies Theme;
const cast = { primary: "pink" } as Theme;

type A1 = typeof annotated.primary;
type A2 = typeof checked.primary;
const t1: A1 = "green";
const t2: A2 = "green";
```

tsc 7.0.2 output:

```text
q4.ts(10,9): error TS2339: Property 'missing' does not exist on type '{ primary: "red"; accent: "blue"; }'.
q4.ts(12,17): error TS2322: Type '"pink"' is not assignable to type 'Color'.
q4.ts(13,14): error TS2352: Conversion of type '{ primary: "pink"; }' to type 'Theme' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'primary' is incompatible with index signature.
    Type '"pink"' is not comparable to type 'Color'.
q4.ts(18,7): error TS2322: Type '"green"' is not assignable to type '"red"'.
```

What each line tells you:

- With the annotation, `annotated.missing` is **not** an error: the variable's type is now just `Record<string, Color>`, so every key is allowed and `primary` is only known to be some `Color` (`t1 = "green"` passes).
- With `satisfies`, the object's real keys and literal values are kept: `checked.missing` is an error and `checked.primary` is exactly `"red"`.
- `satisfies` still validates: `"pink"` is rejected.
- `as` is an **assertion**: it only complains when the two types do not overlap at all, as with `"pink"` here. Something like `{} as Theme` or `JSON.parse(text) as User` passes without a word, which question 7 shows is dangerous.

![An annotation widens a config object to the declared type, satisfies checks it but keeps the precise inferred type, and as skips the check and trusts the developer.](/blog-images/typescript-interview-follow-up-questions/satisfies-vs-annotation.svg)

## 5. How do you make the compiler tell you when you forgot a case?

> **Short answer:** model the variants as a discriminated union, `switch` on the shared tag, and assign the leftover value to a `never` variable in the `default` branch. Adding a new variant then becomes a compile error everywhere it is not handled.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "square":
      return s.side ** 2;
    default: {
      const unhandled: never = s;
      throw new Error("Unknown shape: " + JSON.stringify(unhandled));
    }
  }
}
```

tsc 7.0.2 output:

```text
q5.ts(13,13): error TS2322: Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
```

A **discriminated union** is a union of object types that all share one literal property (here `kind`) whose value tells them apart. Each `case` narrows `s`: after the `"circle"` and `"square"` branches, the only thing `s` can still be is the triangle. Since a triangle is not assignable to `never`, the compiler points at exactly the variant you forgot. Add a `"triangle"` case and the error disappears, because `s` really is `never` there.

The `throw` is still worth keeping: it protects you at runtime if bad data that is not a valid `Shape` arrives from outside.

![Each case in the switch removes one member from the Shape union; whatever reaches the default branch must be never, so a forgotten triangle case shows up as a type error.](/blog-images/typescript-interview-follow-up-questions/exhaustive-never.svg)

## 6. Write a type-safe getProperty function

> **Short answer:** make the key a second type parameter constrained by `keyof T`, and return `T[K]`, the type of that property.

```typescript
function getLoose(obj: object, key: string) {
  return (obj as any)[key];
}

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 7, name: "Ada", admin: false };

const a = getLoose(user, "nmae");   // any, typo not caught
const b = get(user, "name");        // string
const c = get(user, "admin");       // boolean
const d = get(user, "nmae");        // error

const n: number = get(user, "name");

function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest([1, 2], [3]);
longest("abc", "de");
longest(10, 20);
```

tsc 7.0.2 output:

```text
q6.ts(14,21): error TS2345: Argument of type '"nmae"' is not assignable to parameter of type '"admin" | "id" | "name"'.
q6.ts(16,7): error TS2322: Type 'string' is not assignable to type 'number'.
q6.ts(23,9): error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

The pieces:

- **Generics** are type parameters: `T` is filled in from the arguments at each call, like a function parameter for types.
- **`keyof T`** is the union of `T`'s property names, here `"admin" | "id" | "name"`, which is why the typo is caught.
- **`T[K]`** is an indexed access type: "the type of property `K` on `T`". So `get(user, "name")` returns `string`, and assigning it to a `number` fails.
- **`extends` in a type parameter** is a constraint: `longest` accepts anything with a numeric `length` (arrays, strings) and rejects a number.

The loose version compiles and returns `any`, so the typo `"nmae"` slips through. That contrast is usually the point of the question.

## 7. Do TypeScript types exist at runtime?

> **Short answer:** no. Types are erased when the code is compiled or stripped, so they never check data that arrives while the program runs. Validate external data with real code.

Here is a TypeScript file that type-checks with **zero errors**:

```typescript
type User = { id: number; name: string };
const user = JSON.parse('{"id":"7","nmae":"Ada"}') as User;
console.log(user.id + 1);
console.log(typeof user.id);
```

And this is everything tsc 7.0.2 emitted for it. The type and the `as` are simply gone:

```javascript
"use strict";
const user = JSON.parse('{"id":"7","nmae":"Ada"}');
console.log(user.id + 1);
console.log(typeof user.id);
```

Running the `.ts` file directly with Node 22.22 printed:

```text
71
string
```

`"7" + 1` is string concatenation, so the "number" plus one gave `71`. The compiler believed the `as User` and had nothing to check at runtime. The fix is a **type guard**: a function that checks the shape with real code and tells the compiler about it with a `v is User` return type. The JavaScript below is what that looks like once types are removed. Press Run:

```javascript-run
// At runtime, `JSON.parse(text) as User` is just JSON.parse(text).
// The type annotation is gone, so nothing checks the shape.
const text = '{"id":"7","nmae":"Ada"}';
const user = JSON.parse(text);

console.log('id + 1 =', user.id + 1);
console.log('typeof id:', typeof user.id);
console.log('name:', user.name);

// A type guard is real code, so it does run.
function isUser(v) {
  return typeof v === 'object' && v !== null &&
    typeof v.id === 'number' && typeof v.name === 'string';
}

console.log('isUser(parsed):', isUser(user));
console.log('isUser(good):', isUser({ id: 7, name: 'Ada' }));
```

Output:

```text
id + 1 = 71
typeof id: string
name: undefined
isUser(parsed): false
isUser(good): true
```

In a real app you would usually use a schema library (Zod, Valibot and others) that both validates at runtime and gives you the static type, so the two cannot drift apart.

**The follow-up to the follow-up: "Can Node run TypeScript now?"** Yes, by stripping. According to the [Node.js TypeScript docs](https://nodejs.org/api/typescript.html), type stripping has been enabled by default since v23.6.0 and v22.18.0, and became stable in v25.2.0 and v24.12.0. Node replaces type syntax with whitespace and "no type checking is performed". We confirmed both halves: Node 22.22 ran the file above without a flag or warning, and ran it despite the wrong data. It also refuses syntax that needs real code generation:

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

That is what the `erasableSyntaxOnly` compiler option is for: with it on, tsc 7.0.2 flagged the same `enum` with `error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.`, so you find out in your editor instead of at startup. Enums, namespaces with runtime code and constructor parameter properties are the usual offenders.

![TypeScript source goes through the type checker, which reports errors, and then types are erased by tsc or by Node type stripping, so the JavaScript that runs has no types and external data is only checked by guard code you write.](/blog-images/typescript-interview-follow-up-questions/types-erased.svg)

## 8. What changed in TypeScript 7?

> **Short answer:** the compiler was rewritten as a native Go program, roughly 10 times faster, with the same type-checking behaviour as 6.0. It also locks in 6.0's stricter defaults and turns its deprecations into hard errors.

TypeScript 7.0 was released on July 8, 2026. The [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) calls it "a 10x faster native port of TypeScript" and reports full-build speedups "between 8x and 12x". For example, type-checking the VS Code codebase went from 125.7 s to 10.6 s. It installs the usual way (`npm install -D typescript`), and you still run `tsc`.

What matters in an interview is less the speed than what it means for a project:

- **Same type system.** The announcement says code that compiles cleanly with 6.0 (with `stableTypeOrdering` on and no `ignoreDeprecations`) "should compile identically in TypeScript 7.0". The errors in this post are the same ones you would get from 6.0.
- **New defaults** (carried over from 6.0): `strict: true`, `module: esnext`, `types: []`, `rootDir: ./`, among others. That is why question 1 got an implicit-`any` error without a tsconfig `strict` flag.
- **Old options are now errors.** We tried a tsconfig with `target: "es5"`, `baseUrl` and `moduleResolution: "node"`, and tsc 7.0.2 refused all three:

```text
error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.
error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.
  Use '"paths": {"*": ["./*"]}' instead.
error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
```

- **No compiler API yet.** 7.0 "does not ship with an API"; a new one is expected in 7.1. Tools built on the old JavaScript API, such as typescript-eslint, stay on 6.0 for now, and a `@typescript/typescript6` package exists so both can be installed side by side.

A good answer ends with the practical upshot: upgrade by first getting clean on 6.0 with no deprecation suppressions, then switch the compiler, and keep 6.0 around for lint tooling until 7.1.

## Cheat sheet

| Follow-up | One-line answer |
|---|---|
| `any` vs `unknown` vs `never` | `any` turns checking off; `unknown` must be narrowed before use; `never` has no values |
| `type` vs `interface` | Interfaces merge and catch `extends` conflicts; types name unions and computed types; `&` conflicts become `never` silently |
| Literal fails, variable passes | Structural typing allows extra keys; fresh literals get an excess property check |
| `satisfies` | Checks against a type but keeps the precise inferred type; annotation widens; `as` trusts you |
| Forgotten case | Discriminated union plus `const x: never = value` in `default` |
| Type-safe getter | `<T, K extends keyof T>(obj: T, key: K): T[K]` |
| Types at runtime | Erased; validate external data with guards or a schema library; Node strips types without checking |
| TypeScript 7 | Native Go compiler, about 10x faster, same checking as 6.0, strict by default, old options removed, no API until 7.1 |
