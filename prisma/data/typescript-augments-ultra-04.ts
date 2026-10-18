/**
 * TYPESCRIPT ULTRA — batch 04: Object shapes (interface vs type, structural
 * typing, index signatures, Record, class access modifiers). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What is the difference between interface and type?`,
    difficulty: "easy",
    seoDescription: `Interface vs type alias in TypeScript: what both can do, unions only type can name, declaration merging, extends vs & conflicts and index signatures.`,
    description: `**Question presented to candidate:**
"In TypeScript you can write \`interface User { ... }\` or \`type User = { ... }\`. What is actually different between the two, and how do you decide which one to use?"

**What a strong answer should cover:**
- For a plain object shape the two are interchangeable: same checking, both erased at run time, a class can \`implements\` either
- Only \`type\` can name a union, a primitive, a tuple, a mapped or a conditional type; \`interface\` only describes object (and function or constructor) shapes
- Extending: \`interface X extends Y\` reports a conflicting member as an error (TS2430), while \`Y & { ... }\` silently produces \`never\` for that member
- Declaration merging: two \`interface\` declarations with the same name merge (used for module augmentation and global types); two \`type\` aliases with the same name are a duplicate identifier error (TS2300)
- The subtle one: an object \`type\` alias is assignable to \`Record<string, T>\` (implicit index signature), an \`interface\` is not
- A sensible team rule (interfaces for object shapes you may extend, \`type\` for unions and computed types) and the performance note: the TypeScript wiki prefers \`extends\` over large intersections

**Code / implementation expected:** Optional — the same shape written both ways, plus a union that only \`type\` can express.`,
    answer: `**Target Audience:** Beginners who have seen both keywords in the same codebase and want to know when the choice matters.
**Difficulty:** Easy
**TypeScript version:** Every error and output below comes from TypeScript 5.4.5 with \`--strict\`; release and guidance facts are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A city has two kinds of paperwork for buildings. A **registered blueprint** (an \`interface\`) is filed under a name at the city office. Anyone can later file an *amendment* under the same name ("add a balcony") and the office staples it to the original. A **sticky label** (a \`type\` alias) is a nickname you write on any drawing at all: a single house, a choice between "house or flat", a pair of drawings side by side. You cannot file an amendment to a sticky label; writing a second label with the same nickname is simply a mistake.

For an ordinary house plan, both describe the same building and the builders do not care which paperwork you used. The differences show up only at the edges: amendments, choices between options, and what happens when two plans disagree.

📌 **Interview term: type alias** — a \`type Name = ...\` declaration. It gives a *name* to any type expression; it does not create a new type. 📌 **Interview term: interface** — a named, open declaration of an object shape (properties, methods, call or construct signatures) that can be extended and merged.

## 2. Where They Are the Same

For an object shape, these two declarations behave identically in every check:

~~~ts
interface UserI { id: number; name: string }
type UserT = { id: number; name: string };
const a: UserI = { id: 1, name: "Ada" };
const b: UserT = a; // fine: same shape
~~~

That works because TypeScript compares types by their members, not by their names — see [What is structural typing?](/interview-question/what-is-structural-typing). Both are also **erased**: neither leaves anything behind in the emitted JavaScript (the run prints \`typeof\` as plain \`object\` for both), and a class can \`implements\` either one.

## 3. The Real Differences

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Things only type can name, things both can describe, and the one feature only interface has">
  <rect class="d-box" x="20" y="30" width="200" height="230" rx="12"/>
  <text class="d-text" x="120" y="62" text-anchor="middle">Only type</text>
  <text class="d-sub" x="120" y="104" text-anchor="middle">unions A or B</text>
  <text class="d-sub" x="120" y="138" text-anchor="middle">primitives</text>
  <text class="d-sub" x="120" y="172" text-anchor="middle">tuples</text>
  <text class="d-sub" x="120" y="206" text-anchor="middle">mapped and</text>
  <text class="d-sub" x="120" y="228" text-anchor="middle">conditional types</text>
  <rect class="d-box-accent" x="260" y="30" width="200" height="230" rx="12"/>
  <text class="d-text" x="360" y="62" text-anchor="middle">Both</text>
  <text class="d-sub" x="360" y="104" text-anchor="middle">object shapes</text>
  <text class="d-sub" x="360" y="138" text-anchor="middle">function shapes</text>
  <text class="d-sub" x="360" y="172" text-anchor="middle">generics</text>
  <text class="d-sub" x="360" y="206" text-anchor="middle">used by implements</text>
  <rect class="d-box" x="500" y="30" width="200" height="230" rx="12"/>
  <text class="d-text" x="600" y="62" text-anchor="middle">Only interface</text>
  <text class="d-sub" x="600" y="104" text-anchor="middle">declaration merging</text>
  <text class="d-sub" x="600" y="138" text-anchor="middle">conflicts reported</text>
  <text class="d-sub" x="600" y="160" text-anchor="middle">by extends</text>
</svg>

The middle column is where most everyday code lives; the outer columns are where the choice is made for you.

### 3.1 Only a type alias can name non-object types

~~~ts
type Id = number | string;                         // union
type Pair = [number, number];                      // tuple
type Flags = { [K in "dark" | "compact"]: boolean }; // mapped type
~~~

There is no \`interface Id = number | string\`. Unions, literal unions, tuples, primitives, mapped types ([What are mapped types?](/interview-question/what-are-mapped-types)) and conditional types ([What are conditional types?](/interview-question/what-are-conditional-types)) all need \`type\`.

### 3.2 Extending: extends versus intersection

📌 **Interview term: intersection type** — \`A & B\`, a type that has every member of both. Background: [What are union and intersection types?](/interview-question/what-are-union-and-intersection-types)

~~~ts
interface AdminI extends UserI { role: "admin" }
type AdminT = UserT & { role: "admin" };
~~~

Both produce the same members. They differ when the parts **disagree**. With \`extends\`, tsc refuses:

~~~text
main.ts(41,11): error TS2430: Interface 'Bad' incorrectly extends interface 'Base'.
  Types of property 'kind' are incompatible.
    Type 'number' is not assignable to type 'string'.
~~~

With \`&\`, nothing is reported at the declaration. \`{ kind: string } & { kind: number }\` is accepted and its \`kind\` becomes \`never\` (the example proves it with a compile-time equality check), so the mistake only surfaces later, somewhere far away, as "not assignable to never".

### 3.3 Declaration merging

📌 **Interview term: declaration merging** — two declarations with the same name in the same scope combine into one. Interfaces merge; type aliases do not.

~~~ts
interface Settings { theme: string }
interface Settings { fontSize: number }
const s: Settings = { theme: "dark", fontSize: 14 }; // both members required
~~~

The same trick with \`type\` fails on both lines:

~~~text
main.ts(34,6): error TS2300: Duplicate identifier 'Point'.
main.ts(36,6): error TS2300: Duplicate identifier 'Point'.
~~~

Merging is a feature when you *want* other code to add members: extending \`Window\`, adding a field to a library type through [module augmentation](/interview-question/what-is-module-augmentation). It is a hazard when it happens by accident: two files in the same global scope that both declare \`interface Config\` silently become one type. Full details: [What is declaration merging?](/interview-question/what-is-declaration-merging)

### 3.4 The subtle one: implicit index signatures

📌 **Interview term: implicit index signature** — an object literal type written with \`type\` is treated as if it had an index signature, so it can be passed where \`Record<string, T>\` is expected. An interface does not get this, precisely because it is open to merging: someone could add a member of a different type later.

~~~text
main.ts(15,20): error TS2345: Argument of type 'PointI' is not assignable to parameter of type 'Record<string, number>'.
  Index signature for type 'string' is missing in type 'PointI'.
~~~

The same value typed with the \`type\` alias was accepted. The usual fix for an interface is \`{ ...value }\` (a fresh object literal type) or widening the parameter. This is a real reason people hit when passing interfaces into logging, serialisation or "map over all fields" helpers. Index signatures themselves: [What is an index signature?](/interview-question/what-is-an-index-signature)

### 3.5 Error messages and performance

Error messages keep an interface name, while an intersection points into its parts. Missing \`age\` on each gave:

~~~text
main.ts(5,7): error TS2741: Property 'age' is missing in type '{ name: string; }' but required in type 'PersonI'.
main.ts(6,7): error TS2322: Type '{ name: string; }' is not assignable to type 'PersonT'.
  Property 'age' is missing in type '{ name: string; }' but required in type 'Aged'.
~~~

The TypeScript team performance wiki has a section "Preferring Interfaces Over Intersections": it recommends \`interface Foo extends Bar, Baz {}\` over \`type Foo = Bar & Baz & {}\`, because interfaces form one flat object type that detects conflicts, and relationships between interfaces are cached while intersections are re-checked part by part ([microsoft/TypeScript wiki: Performance](https://github.com/microsoft/TypeScript/wiki/Performance)). I did not benchmark this here; it matters mainly for large codebases with deep type hierarchies.

## 4. Comparison Table

| | \`interface\` | \`type\` alias |
| :--- | :--- | :--- |
| Object shape | Yes | Yes |
| Union, tuple, primitive, mapped, conditional | No | Yes |
| Extend / combine | \`extends A, B\` | \`A & B\` |
| Conflicting member | Error TS2430 at the declaration | Member becomes \`never\`, no error |
| Same name declared twice | Merges | Error TS2300 |
| Assignable to \`Record<string, T>\` | No (TS2345) | Yes |
| \`class X implements ...\` | Yes | Yes (if it is an object type) |
| Exists at run time | No | No |

## 5. So Which Do You Use?

A rule many teams adopt: use \`interface\` for object shapes that are part of a public API or may be extended (classes implement them, consumers augment them), and use \`type\` for everything an interface cannot say — unions, tuples, function aliases, mapped and conditional types. The more important rule is **consistency**: the typescript-eslint rule \`consistent-type-definitions\` enforces one style for object types; its default is \`interface\`, which its docs describe as the prevailing style in TypeScript projects ([typescript-eslint docs](https://typescript-eslint.io/rules/consistent-type-definitions)). Beyond the edges in section 3, it is a style choice, and saying so plainly in an interview is a strong answer.

## 6. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line erroring; with the directives removed tsc printed the messages quoted above. Then each ran as the page runs it.

Example 1, the same shape both ways, unions, merging and conflicts:

~~~text
{"id":1,"name":"Ada"}
true
u-1 [3,4] {"dark":true,"compact":false}
theme,fontSize
intersection kind is never: true
Linus
~~~

Example 2, implicit index signatures and erasure:

~~~text
x=1 y=2
x=3 y=4
x=3 y=4
{"name":"Grace","age":85}
object object
~~~

The second line is worth noticing: \`logAll(pi)\` is a type error, but the JavaScript still runs and prints \`x=3 y=4\`. The difference is purely compile-time.

## Common Pitfalls

- **Using \`&\` to "extend" and hiding a conflict.** A clash turns into \`never\` with no error at the declaration; \`interface ... extends\` reports it immediately.
- **Accidental merging.** Two global \`interface\` declarations with the same name (for example in two script files without imports or exports) silently combine.
- **Expecting an interface to fit \`Record<string, unknown>\`.** It does not (TS2345); spread it or change the parameter type.
- **Trying to write a union as an interface.** \`interface Shape = Circle | Square\` is not valid; it must be \`type Shape = Circle | Square\`.
- **Believing one is "faster at run time".** Both are erased. Any performance difference is in the compiler, not in your app.
- **Mixing styles at random.** Pick a rule for plain object shapes and enforce it with a lint rule.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same for objects:</strong> <span style="color:#f0e2c8;">For a plain object shape <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interface</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> are interchangeable: TypeScript compares <strong style="color:#ffca28;">structure</strong>, both are erased, and a class can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">implements</code> either.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Only type:</strong> <span style="color:#f0e2c8;">A type alias can name anything: unions, primitives, tuples, mapped and conditional types. An interface only describes object and function shapes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Only interface:</strong> <span style="color:#f0e2c8;">Interfaces support <strong style="color:#ffca28;">declaration merging</strong>: a second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interface Window</code> adds members, which is how globals and library types are augmented. A duplicate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is error TS2300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Extending:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> reports a conflicting member (TS2430); an intersection <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A &amp; B</code> silently makes it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. The TypeScript performance wiki also prefers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> over big intersections.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My rule:</strong> <span style="color:#f0e2c8;">Interfaces for object shapes that form an API or get extended, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> for unions and computed types, enforced consistently with a lint rule.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can an object <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type</code> be passed to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Record&lt;string, number&gt;</code> but an interface cannot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object literal types get an <strong style="color:#ffca28;">implicit index signature</strong>; interfaces do not, because they are open to merging and a later declaration could add a member of another type. tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index signature for type 'string' is missing in type 'PointI'</code>. Spread into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ...value }</code> to fix it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class implement a type alias?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, as long as the alias is an object type (or an intersection of object types). It cannot implement a union, because the class must have one known set of members.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is declaration merging a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it is accidental. Two scripts in the global scope that both declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interface Config</code> merge silently, so a property can appear required somewhere unexpected. Modules (files with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export</code>) keep declarations local.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ kind: string } &amp; { kind: number }</code> produce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An object whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; number</code>, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. No error at the declaration; you only find out when nothing can be assigned to it. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extends</code> version is an immediate TS2430 error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a run-time difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Both are removed when TypeScript emits JavaScript; the run prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> for values of either. Differences are compile-time only: checking, error messages and compiler speed.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type alias | \`type Name = ...\`: a name for any type expression |
| Interface | A named, open, mergeable declaration of an object shape |
| Intersection type | \`A & B\`: has every member of both; conflicting members become \`never\` |
| Declaration merging | Same-named interfaces (and some other declarations) combine into one |
| Implicit index signature | Object literal types, but not interfaces, are assignable to \`Record<string, T>\` |

**Conclusion:** For everyday object shapes, \`interface\` and \`type\` are two spellings of the same thing, and TypeScript structural checks treat them alike. The choice matters at the edges: only \`type\` can name unions, tuples and computed types; only \`interface\` merges and reports \`extends\` conflicts; and only object \`type\` aliases fit index-signature types. Know those edges, pick a consistent team rule, and you can answer both the definition and the "which would you choose" follow-up with confidence.`,
    examples: [
      {
        label: `The same shape both ways, unions, merging and conflicts`,
        code: `// Compile-time equality check: tsc proves each "const ok" line.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Both can describe the same object shape.
interface UserI { id: number; name: string }
type UserT = { id: number; name: string };
const a: UserI = { id: 1, name: "Ada" };
const b: UserT = a; // fully interchangeable: same shape
console.log(JSON.stringify(b)); // {"id":1,"name":"Ada"}

// 2. Extending: interface uses extends, type uses an intersection (&).
interface AdminI extends UserI { role: "admin" }
type AdminT = UserT & { role: "admin" };
const ok1: Equal<AdminI["role"], AdminT["role"]> = true;
console.log(ok1); // true

// 3. Only a type alias can name a union, a primitive, a tuple or a mapped type.
type Id = number | string;
type Pair = [number, number];
type Flags = { [K in "dark" | "compact"]: boolean };
const id: Id = "u-1";
const pair: Pair = [3, 4];
const flags: Flags = { dark: true, compact: false };
console.log(id, JSON.stringify(pair), JSON.stringify(flags));

// 4. Declaration merging: a second interface with the same name adds members.
interface Settings { theme: string }
interface Settings { fontSize: number }
const s: Settings = { theme: "dark", fontSize: 14 };
console.log(Object.keys(s).join(",")); // theme,fontSize

// Two type aliases with the same name: tsc flags both lines.
// @ts-expect-error Duplicate identifier 'Point'.
type Point = { x: number };
// @ts-expect-error Duplicate identifier 'Point'.
type Point = { y: number };

// 5. Conflicts: extends reports the clash, & silently produces never.
interface Base { kind: string }
// @ts-expect-error Interface 'Bad' incorrectly extends interface 'Base'.
interface Bad extends Base { kind: number }
type Clash = { kind: string } & { kind: number };
const ok2: Equal<Clash["kind"], never> = true;
console.log("intersection kind is never:", ok2);

// 6. A class can implement either one.
class Account implements UserT { constructor(public id: number, public name: string) {} }
console.log(new Account(2, "Linus").name); // Linus`,
      },
      {
        label: `Implicit index signatures: why an interface does not fit Record`,
        code: `// The subtle difference: implicit index signatures.
// A type alias for an object literal type is assignable to an index-signature
// type; an interface is not, because an interface could be merged later.
interface PointI { x: number; y: number }
type PointT = { x: number; y: number };

function logAll(values: Record<string, number>): string {
  return Object.entries(values).map(([k, v]) => k + "=" + v).join(" ");
}

const pt: PointT = { x: 1, y: 2 };
const pi: PointI = { x: 3, y: 4 };
console.log(logAll(pt)); // x=1 y=2
// @ts-expect-error Index signature for type 'string' is missing in type 'PointI'.
console.log(logAll(pi)); // x=3 y=4
// The fix for interfaces: spread into a fresh object literal.
console.log(logAll({ ...pi })); // x=3 y=4

// Combining several shapes: extends with a list, or an intersection.
// Both describe the same members and are assignable to each other.
interface Named { name: string }
interface Aged { age: number }
interface PersonI extends Named, Aged {}
type PersonT = Named & Aged;
const p1: PersonI = { name: "Grace", age: 85 };
const p2: PersonT = p1;
console.log(JSON.stringify(p2)); // {"name":"Grace","age":85}

// Types are erased: neither keyword leaves anything behind at run time.
console.log(typeof p1, typeof p2);`,
      },
    ],
  },
  {
    title: `What is structural typing?`,
    difficulty: "medium",
    seoDescription: `Structural typing: TypeScript compares types by their members, not names. Excess property checks, the {} type, and brands for nominal behaviour.`,
    description: `**Question presented to candidate:**
"TypeScript is often described as structurally typed. What does that mean, how is it different from Java or C#, and where can it surprise you?"

**What a strong answer should cover:**
- Structural typing: a value is assignable to a type when it has the required members with compatible types; names and \`implements\` clauses do not matter
- Contrast with nominal typing (Java, C#), where a class must explicitly declare that it implements an interface
- Extra members are allowed (width subtyping), except for the excess property check on fresh object literals
- The surprises: two same-shaped types such as \`Celsius\` and \`Fahrenheit\` or \`UserId\` and \`OrderId\` are interchangeable; \`{}\` accepts almost anything
- How to get nominal behaviour when you need it: branded types, or classes with \`private\`/\`#private\` members, which compare by declaration
- Why TypeScript chose it: JavaScript code is duck-typed and objects are often plain literals, so shape is what really matters

**Code / implementation expected:** Optional — a class and an object literal that both satisfy an interface they never mention.`,
    answer: `**Target Audience:** Beginners, and developers coming from Java or C# who expect class names to matter.
**Difficulty:** Medium
**TypeScript version:** Every error and output below comes from TypeScript 5.4.5 with \`--strict\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A power socket does not ask who made your plug. It does not check a brand logo or a certificate that says "I am a Type G plug". It checks the **shape**: three prongs, the right size, the right distance apart. Any plug with that shape fits — even one made by a company the socket designer never heard of. A plug with *extra* bits (a built-in night light) still fits, as long as the prongs are right.

That is how TypeScript checks types. A function that asks for a \`Point\` gets anything with a numeric \`x\` and \`y\`. It does not matter what the value is called, which class built it, or whether anyone ever wrote the word \`Point\` next to it.

📌 **Interview term: structural typing** — type compatibility is decided by the *members* a type has (its structure), not by its name or declared ancestry. Often explained as "duck typing, checked at compile time": if it walks like a duck and quacks like a duck, the compiler treats it as a duck.

📌 **Interview term: nominal typing** — the alternative used by Java, C# and Swift classes: a type is compatible only if it is the same named type or explicitly declared as a subtype (\`class Vector implements Point\`).

## 2. The Rule in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="A class instance and an object with an extra member fit the Point type, an object missing y does not">
  <defs>
    <marker id="ts04q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="48" text-anchor="middle">new Vector(3, 4)</text>
  <text class="d-sub" x="120" y="70" text-anchor="middle">class, never says Point</text>
  <rect class="d-box" x="20" y="104" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="132" text-anchor="middle">x, y, z object</text>
  <text class="d-sub" x="120" y="154" text-anchor="middle">one extra member</text>
  <rect class="d-box-muted" x="20" y="188" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="216" text-anchor="middle">only x</text>
  <text class="d-sub" x="120" y="238" text-anchor="middle">missing y</text>
  <rect class="d-box-accent" x="480" y="90" width="220" height="80" rx="12"/>
  <text class="d-text" x="590" y="124" text-anchor="middle">Point</text>
  <text class="d-sub" x="590" y="148" text-anchor="middle">x: number, y: number</text>
  <path class="d-edge-accent" d="M 226 52 L 474 116" marker-end="url(#ts04q2-arrow)"/>
  <path class="d-edge-accent" d="M 226 136 L 474 132" marker-end="url(#ts04q2-arrow)"/>
  <path class="d-edge-dashed" d="M 226 220 L 474 156"/>
</svg>

The first two fit because they have every member \`Point\` needs; the third is rejected because \`y\` is missing. The class name \`Vector\` and the extra \`z\` play no part.

## 3. What It Looks Like in Code

~~~ts
interface Point { x: number; y: number }
function length(p: Point): number { return Math.sqrt(p.x * p.x + p.y * p.y); }

class Vector { constructor(public x: number, public y: number) {} }
length(new Vector(3, 4));          // 5 — no "implements Point" needed

const point3d = { x: 6, y: 8, z: 100 };
length(point3d);                   // 10 — extra members are fine
~~~

📌 **Interview term: width subtyping** — a type with *more* members is a subtype of one with fewer: \`{ x, y, z }\` is assignable to \`{ x, y }\`. The target only promises what it lists.

Missing members are always errors:

~~~text
main.ts(22,20): error TS2345: Argument of type '{ x: number; }' is not assignable to parameter of type 'Point'.
  Property 'y' is missing in type '{ x: number; }' but required in type 'Point'.
~~~

### The one exception: fresh object literals

Pass the same \`{ x: 6, y: 8, z: 100 }\` *directly* as a literal and tsc complains:

~~~text
main.ts(18,34): error TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
~~~

📌 **Interview term: excess property check** — an extra check applied only to a *fresh* object literal (one written right where the type is expected). Nobody else can ever read \`z\` from that literal, so an unknown property is almost certainly a typo. Assign the literal to a variable first and the check no longer applies; this is a lint-like safety net, not a change to the structural rule. The run shows the JavaScript is unaffected: both calls print \`10\`.

### Functions are structural too

A callback may take *fewer* parameters than the caller provides: \`names.map((n) => n.toUpperCase())\` fits \`(value, index, array) => U\`, because ignoring extra arguments is always safe in JavaScript. Parameter and return types are compared by shape as well; the variance rules are in [What are covariance and contravariance?](/interview-question/what-are-covariance-and-contravariance)

### The empty object type

\`{}\` has no required members, so *every* value with members fits — including \`42\`. Only \`null\` and \`undefined\` are rejected under \`strictNullChecks\`:

~~~text
main.ts(39,7): error TS2322: Type 'null' is not assignable to type '{}'.
~~~

So \`{}\` means "any non-nullish value", not "an empty object". Use \`object\` or \`Record<string, never>\` when you mean that.

## 4. Where Structural Typing Bites

Two types with different names and the same shape are interchangeable:

~~~ts
type Celsius = { value: number };
type Fahrenheit = { value: number };
const boiling: Celsius = { value: 100 };
const oops: Fahrenheit = boiling; // compiles
~~~

The same happens with \`type UserId = string\` and \`type OrderId = string\`: the run passes a user id to \`findOrder\` and gets \`not found\`, with no compile error. Aliases are only names.

### Getting nominal behaviour when you need it

1. **Brands.** Intersect with a phantom property that exists only in the type: \`type SafeOrderId = string & { readonly __brand: "OrderId" }\`. Now a \`SafeUserId\` is rejected:

~~~text
main.ts(19,12): error TS2345: Argument of type 'SafeUserId' is not assignable to parameter of type 'SafeOrderId'.
  Type 'SafeUserId' is not assignable to type '{ readonly __brand: "OrderId"; }'.
    Types of property '__brand' are incompatible.
      Type '"UserId"' is not assignable to type '"OrderId"'.
~~~

At run time the value is still a plain \`string\` (the run prints \`typeof\` as \`string\`). Details: [What are branded (nominal) types?](/interview-question/what-are-branded-nominal-types)

2. **A \`private\` or \`protected\` member.** Classes with private members only match if the member comes from the *same declaration*:

~~~text
main.ts(28,7): error TS2322: Type 'Meters' is not assignable to type 'Feet'.
  Types have separate declarations of a private property 'unit'.
~~~

Without the private member, \`class A\` and \`class B\` with the same public fields are interchangeable (the run assigns an \`A\` to a \`B\` variable; \`instanceof B\` is \`false\`).

3. **A \`#private\` field** does the same, and an object literal can never forge it:

~~~text
main.ts(40,7): error TS2741: Property '#secret' is missing in type '{ label: string; }' but required in type 'Token'.
~~~

More on modifiers: [What are access modifiers in TypeScript classes?](/interview-question/what-are-access-modifiers-in-typescript-classes)

## 5. Structural vs Nominal at a Glance

| | Structural (TypeScript) | Nominal (Java, C#) |
| :--- | :--- | :--- |
| Compatible when | Members match | Same name or declared subtype |
| \`implements\` needed? | No (optional, for checking) | Yes |
| Plain object literals as values | Natural | Need a class |
| Same shape, different meaning | Mixed up silently | Kept apart |
| Opt into the other style | Brands, private members | Interfaces / generics, partly |

## 6. Why TypeScript Chose It

JavaScript code passes plain objects around constantly — options bags, JSON responses, \`{ x, y }\` literals — and real JS programs are duck-typed. A nominal system would force a class or explicit declaration for every one of them. Structural typing lets TypeScript describe the JavaScript people already write. The cost is the "same shape, different meaning" problem in section 4, which brands solve where it matters.

## 7. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line erroring; the messages above are tsc output with the directives removed.

Example 1, the structural rule, excess property checks and \`{}\`:

~~~text
5
10
10
NaN
100
ADA,LINUS
number null
~~~

Note the \`NaN\`: the missing-\`y\` call is a type error, but the JavaScript still ran. Types are erased, so structural checking exists only at compile time.

Example 2, mixed-up ids and three ways to get nominal behaviour:

~~~text
not found
2 books
string
3
false
forged
~~~

## Common Pitfalls

- **Thinking \`implements\` makes a class compatible.** It only asks tsc to check the class; compatibility comes from the shape either way.
- **Treating the excess property check as the rule.** It applies only to fresh literals; through a variable, extra properties are accepted.
- **Expecting \`type UserId = string\` to protect anything.** An alias is a name, not a new type. Use a brand.
- **Using \`{}\` for "an object".** It accepts \`42\` and \`"hi"\`; use \`object\` or a precise shape.
- **Relying on \`instanceof\` after a structural assignment.** A value can be typed \`B\` and still not be an instance of \`B\` at run time.
- **Forgetting that run-time data is not checked.** Structural checks happen at compile time; JSON from the network must be validated ([How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">TypeScript is <strong style="color:#ffca28;">structurally typed</strong>: a value fits a type when it has the required members with compatible types. Names and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">implements</code> clauses do not decide compatibility.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Contrast:</strong> <span style="color:#f0e2c8;">Java and C# are <strong style="color:#ffca28;">nominal</strong>: a class must be declared as implementing the interface. In TypeScript a class that never mentions <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point</code> is still a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Extra members:</strong> <span style="color:#f0e2c8;">Extra members are fine (width subtyping), except for the <strong style="color:#ffca28;">excess property check</strong> on fresh object literals, which catches typos like an unknown <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The catch:</strong> <span style="color:#f0e2c8;">Same-shaped types are interchangeable, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UserId</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderId</code> aliases of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> get mixed up silently, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> accepts almost any value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">When identity matters, use a <strong style="color:#ffca28;">brand</strong> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; { __brand: "OrderId" }</code>) or a class with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> member, which only matches its own declaration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does passing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ x: 1, y: 2, z: 3 }</code> directly fail but passing it through a variable works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <strong style="color:#ffca28;">excess property check</strong> applies only to fresh object literals, where an unknown property is almost always a typo. A variable could be used elsewhere, so the normal structural rule applies and extra members are allowed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are two classes with identical public fields interchangeable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, unless one has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">protected</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> member. Then tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Types have separate declarations of a private property</code> and the classes behave nominally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{}</code> the type of an empty object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is the type with no required members, so any non-nullish value fits, even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">42</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> for non-primitives or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, never&gt;</code> for a truly empty object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are function types compared?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Structurally too: a callback may declare fewer parameters than are passed, parameter types are checked contravariantly under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictFunctionTypes</code> and return types covariantly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does structural typing exist at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Types are erased; the check is compile-time only. A value typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> built from class <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code> reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof B</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, and unvalidated JSON is never checked.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Structural typing | Compatibility decided by members, not names |
| Nominal typing | Compatibility decided by declared names and subtyping |
| Width subtyping | A type with more members is a subtype of one with fewer |
| Excess property check | Fresh object literals may not contain unknown properties |

**Conclusion:** Structural typing means TypeScript asks "does this value have the right members?" and never "what is this value called?". That matches how JavaScript is written — plain literals, duck typing — and it is why a class can satisfy an interface it never names. Know its one exception (excess property checks on fresh literals), its one real weakness (same shape, different meaning) and the tools that fix it (brands and private members), and you have the complete answer.`,
    examples: [
      {
        label: `Compatibility by shape, excess property checks and {}`,
        code: `// Structural typing: compatibility is decided by shape, not by name.
interface Point { x: number; y: number }

function length(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

// 1. A class that never mentions Point is still a Point.
class Vector { constructor(public x: number, public y: number) {} }
console.log(length(new Vector(3, 4))); // 5

// 2. Extra members are fine when the value is not a fresh literal.
const point3d = { x: 6, y: 8, z: 100 };
console.log(length(point3d)); // 10

// 3. ...but a fresh object literal gets an excess property check.
// @ts-expect-error Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
console.log(length({ x: 6, y: 8, z: 100 })); // 10

// 4. Missing members are always an error.
// @ts-expect-error Property 'y' is missing in type '{ x: number; }' but required in type 'Point'.
console.log(length({ x: 1 })); // NaN

// 5. Two aliases with different names but the same shape are interchangeable.
type Celsius = { value: number };
type Fahrenheit = { value: number };
const boiling: Celsius = { value: 100 };
const oops: Fahrenheit = boiling; // compiles: same shape
console.log(oops.value); // 100

// 6. Functions: a callback may ignore parameters it does not need.
const names = ["ada", "linus"];
const upper = names.map((n) => n.toUpperCase()); // (value, index, array) expected
console.log(upper.join(",")); // ADA,LINUS

// 7. The empty object type {} accepts any value except null and undefined.
const anything: {} = 42;
// @ts-expect-error Type 'null' is not assignable to type '{}'.
const nothing: {} = null;
console.log(typeof anything + " " + nothing); // number null`,
      },
      {
        label: `Where it bites, and three ways to get nominal behaviour`,
        code: `// Where structural typing bites, and the three ways to get "nominal" behaviour.

// The bug: two ids are both plain strings, so they are interchangeable.
type UserId = string;
type OrderId = string;
const orders: Record<OrderId, string> = { "o-1": "2 books" };
function findOrder(id: OrderId): string { return orders[id] ?? "not found"; }
const user: UserId = "u-42";
console.log(findOrder(user)); // not found

// Fix 1: a brand. The extra phantom property exists only in the type.
type Brand<T, B extends string> = T & { readonly __brand: B };
type SafeUserId = Brand<string, "UserId">;
type SafeOrderId = Brand<string, "OrderId">;
const toOrderId = (s: string) => s as SafeOrderId;
function findOrder2(id: SafeOrderId): string { return orders[id] ?? "not found"; }
const safeUser = "u-42" as SafeUserId;
// @ts-expect-error Argument of type 'SafeUserId' is not assignable to parameter of type 'SafeOrderId'.
findOrder2(safeUser);
console.log(findOrder2(toOrderId("o-1"))); // 2 books
// At run time the brand is gone: it is still a plain string.
console.log(typeof safeUser); // string

// Fix 2: a private (or protected) member makes a class compare by declaration.
class Meters { private readonly unit = "m"; constructor(public value: number) {} }
class Feet { private readonly unit = "m"; constructor(public value: number) {} }
// @ts-expect-error Types have separate declarations of a private property 'unit'.
const f: Feet = new Meters(3);
console.log(f.value); // 3

// Without the private member the two classes would be interchangeable:
class A { constructor(public value: number) {} }
class B { constructor(public value: number) {} }
const bFromA: B = new A(7);
console.log(bFromA instanceof B); // false

// Fix 3: a #private field also blocks structural matches.
class Token { #secret = "t"; constructor(public label: string) {} }
// @ts-expect-error Property '#secret' is missing in type '{ label: string; }' but required in type 'Token'.
const fake: Token = { label: "forged" };
console.log(fake.label); // forged`,
      },
    ],
  },
  {
    title: `What is an index signature?`,
    difficulty: "medium",
    seoDescription: `Index signatures type objects with open keys: allowed key types, the TS2411 and TS2413 rules, missing-key reads and plain object vs Map traps.`,
    description: `**Question presented to candidate:**
"Say you count words in a text and store the counts in an object whose keys you cannot know in advance. How do you type that object, and what are the gotchas?"

**What a strong answer should cover:**
- Syntax and meaning: \`{ [key: string]: number }\` says every string key maps to a \`number\`; key types can be \`string\`, \`number\`, \`symbol\`, template literal patterns such as \`\` \`data-\${string}\` \`\` (4.4+) or unions of these
- Rules: named properties must fit the index signature type (TS2411), and a \`number\` index type must be assignable to the \`string\` one (TS2413), because number keys become strings at run time
- The big gotcha: reading a missing key is typed \`number\`, not \`number | undefined\`, unless \`noUncheckedIndexedAccess\` is on (not part of \`strict\`)
- Run-time traps of plain objects as dictionaries: inherited keys such as \`constructor\` and the \`__proto__\` setter; \`Object.create(null)\` or \`Map\` avoid them
- When to use \`Record<K, V>\` (same thing for string keys, required keys for literal unions) and when a \`Map\` is the better tool

**Clarifying questions expected:**
- Is the set of keys truly open, or a known list (which would call for \`Record<Union, V>\`)?
- Can keys come from user input (which raises the \`__proto__\` issue)?

**Code / implementation expected:** Yes — a typed word-count dictionary and a lookup that handles missing keys.`,
    answer: `**Target Audience:** Beginners who need to type a dictionary-like object, and anyone who has been bitten by \`obj[key]\` being \`undefined\` at run time.
**Difficulty:** Medium
**TypeScript version:** Every error and output below comes from TypeScript 5.4.5 with \`--strict\` (two flag-specific errors were produced by adding that one flag, as noted); version facts are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A hotel has a key cabinet. The manager does not know in advance which guests will arrive, so the cabinet is not labelled "Mr Smith, Ms Jones". It has a single rule printed on the door: **"Every hook holds exactly one room key."** Any name can go on a hook, but whatever hangs there must be a room key — not an umbrella, not a coat.

That rule is an index signature. You are not listing the keys; you are describing what *any* key maps to. The catch is the same as in the hotel: the rule tells you what a hook holds *if something is there*, not that every hook you check has something on it.

📌 **Interview term: index signature** — a member of the form \`[key: KeyType]: ValueType\` inside an object type. It describes an object with an open set of keys, all of whose values have \`ValueType\`.

## 2. The Syntax

~~~ts
interface WordCounts { [word: string]: number }

function countWords(text: string): WordCounts {
  const counts: WordCounts = {};
  for (const w of text.split(" ")) counts[w] = (counts[w] ?? 0) + 1;
  return counts;
}
~~~

The name \`word\` is only documentation; \`[k: string]\` means the same thing. The run prints \`{"to":2,"be":2,"or":1,"not":1}\` for "to be or not to be".

Allowed key types: \`string\`, \`number\`, \`symbol\`, **template literal patterns** such as \`\` \`data-\${string}\` \`\`, and unions of those. Symbol keys and pattern keys arrived in TypeScript 4.4 ([TypeScript 4.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-4/)); \`{ [k: string | symbol]: number }\` compiled in 5.4.5. A *literal* union is not allowed:

~~~text
main.ts(5,18): error TS1337: An index signature parameter type cannot be a literal type or generic type. Consider using a mapped object type instead.
~~~

That error points you to the right tool: for a known list of keys, use a mapped type — in practice [\`Record<"a" | "b", number>\`](/interview-question/what-is-the-record-utility-type).

## 3. The Rules the Compiler Enforces

**Every value must match.** Assigning a string to a \`WordCounts\` key:

~~~text
main.ts(15,1): error TS2322: Type 'string' is not assignable to type 'number'.
~~~

**Named properties must fit the signature.** You can mix fixed properties with an index signature, but each fixed property's type must be assignable to the index type — because \`obj["debug"]\` has to be describable by the signature too:

~~~text
main.ts(27,3): error TS2411: Property 'debug' of type 'boolean' is not assignable to 'string' index type 'string | number'.
~~~

**Number keys are string keys in disguise.** JavaScript converts every property key that is not a symbol to a string, so \`row[1]\` and \`row["1"]\` are the same slot. The run shows \`Object.keys\` returning strings (\`string,string\`) and the two reads being equal (\`true\`). Because of that, a \`number\` index type must be assignable to the \`string\` index type:

~~~text
main.ts(41,3): error TS2413: 'number' index type 'number' is not assignable to 'string' index type 'string'.
~~~

📌 **Interview term: numeric index signature** — \`[i: number]: T\`, used for array-like objects. It is a narrower view of the string signature, not a separate storage area.

**Pattern keys keep excess property checks for everything else.** With \`\` { [attr: \`data-\${string}\`]: string } \`\`, a key like \`data-id\` is fine, but \`id\` is still rejected:

~~~text
main.ts(48,26): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'DataAttrs'.
~~~

## 4. The Big Gotcha: Missing Keys

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Reading a missing key: the type says number but the run time value is undefined unless noUncheckedIndexedAccess adds undefined to the type">
  <rect class="d-box" x="20" y="70" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">counts of banana</text>
  <text class="d-sub" x="115" y="122" text-anchor="middle">key never stored</text>
  <rect class="d-box-muted" x="270" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="370" y="50" text-anchor="middle">type: number</text>
  <text class="d-sub" x="370" y="72" text-anchor="middle">strict only</text>
  <rect class="d-box-accent" x="270" y="130" width="200" height="70" rx="10"/>
  <text class="d-text" x="370" y="160" text-anchor="middle">number or undefined</text>
  <text class="d-sub" x="370" y="182" text-anchor="middle">noUncheckedIndexedAccess</text>
  <rect class="d-box" x="530" y="70" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="100" text-anchor="middle">value: undefined</text>
  <text class="d-sub" x="615" y="122" text-anchor="middle">at run time</text>
  <path class="d-edge" d="M 210 95 L 266 60"/>
  <path class="d-edge" d="M 210 115 L 266 160"/>
  <path class="d-edge-dashed" d="M 474 60 L 526 95"/>
  <path class="d-edge-accent" d="M 474 160 L 526 115"/>
</svg>

The muted path is the lie: the type promises a \`number\`, the value is \`undefined\`. The highlighted path is what \`noUncheckedIndexedAccess\` gives you.

Under \`strict\` alone, \`counts["banana"]\` is typed \`number\`. The run prints \`undefined\`. Nothing stops you writing \`counts["banana"] * 2\` and getting \`NaN\`. Adding \`--noUncheckedIndexedAccess\` to the same tsc command changes the type to \`number | undefined\`, and the multiplication is caught:

~~~text
nuia.ts(4,25): error TS18048: 'n' is possibly 'undefined'.
~~~

📌 **Interview term: noUncheckedIndexedAccess** — a compiler flag that adds \`undefined\` to the type of every read through an index signature (and of array element reads). It is **not** part of \`strict\`; see [How do \`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\` and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

A related flag, \`noPropertyAccessFromIndexSignature\`, forces bracket syntax for keys that only exist through the signature, so dotted access is reserved for known properties. With it, \`counts.to\` gives:

~~~text
npa.ts(3,18): error TS4111: Property 'to' comes from an index signature, so it must be accessed with ['to'].
~~~

## 5. Run-Time Traps of Plain Objects

The type \`{ [word: string]: number }\` says nothing about the **prototype**. A plain \`{}\` inherits \`constructor\`, \`toString\` and friends from \`Object.prototype\`, and \`__proto__\` is a setter, not a normal key. Feeding the words \`apple, constructor, __proto__, apple\` into a plain object (example 2):

- \`constructor\` started from the inherited \`Object\` function, so \`plain.constructor + 1\` became a **string** — the function source with \`1\` glued on. The run prints \`typeof\` as \`string\` and the start as \`function Object()\`.
- \`__proto__\` was never stored; \`Object.hasOwn(plain, "__proto__")\` is \`false\`.

\`Object.create(null)\` (no prototype) and \`Map\` both count all three words correctly. A \`Map\` also gives you \`size\`, insertion order, non-string keys and a \`get\` typed \`V | undefined\`, so strict mode forces you to handle the missing case.

| | Index signature on \`{}\` | \`Object.create(null)\` | \`Map<K, V>\` |
| :--- | :--- | :--- | :--- |
| Inherited keys | Yes (\`constructor\`...) | No | No |
| \`__proto__\` key | Lost | Stored | Stored |
| Missing key typed as | \`V\` (unless flag) | \`V\` (unless flag) | \`V \\| undefined\` |
| Key types | string, number, symbol | same | any value |
| JSON.stringify | Works | Works | Needs \`[...map]\` |

## 6. Index Signature vs Record

For string keys they are the **same type**: \`Record<string, number>\` equals \`{ [key: string]: number }\` (proven in the [Record](/interview-question/what-is-the-record-utility-type) example). Choose by readability. \`Record\` wins when the keys are a known union, because then every key is required. An index signature wins when you need extra named properties next to the open keys, or a template literal pattern alongside them.

One interface-specific wrinkle: an \`interface\` is not assignable to an index-signature type even when all its values fit; see [What is the difference between interface and type?](/interview-question/what-is-the-difference-between-interface-and-type)

## 7. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line erroring; the messages in sections 2-4 are tsc output with the directives removed, except TS1337, TS18048 and TS4111, which came from small separate files (the last two with the named flag added to the same command).

Example 1, the rules of index signatures:

~~~text
{"to":2,"be":2,"or":1,"not":1}
undefined
string,string
true
data-id data-role
function
false
~~~

Example 2, plain object vs \`Object.create(null)\` vs \`Map\`:

~~~text
apple,constructor
string
function Object()
false
{"apple":2,"constructor":1,"__proto__":1}
[["apple",2],["constructor",1],["__proto__",1]]
pears: 0 size: 3
~~~

## Common Pitfalls

- **Trusting the value type on reads.** \`counts[key]\` is typed \`number\` even when the key is missing; check with \`in\`, \`Object.hasOwn\`, \`?? 0\`, or turn on \`noUncheckedIndexedAccess\`.
- **Using a plain object for user-supplied keys.** \`constructor\`, \`toString\` and \`__proto__\` misbehave; use \`Map\` or \`Object.create(null)\`.
- **Using an index signature for a known list of keys.** You lose "every key is required" and typo checks; use \`Record<Union, V>\`.
- **Adding a named property of a different type.** It must fit the index type (TS2411); widen the index type or move the property out.
- **Forgetting number keys are strings.** \`Object.keys\` returns strings, and \`for...in\` gives strings, even for \`[i: number]\` objects.
- **Writing \`[k: "a" | "b"]\`.** That is TS1337; a literal key set needs a mapped type.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">index signature</strong> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [key: string]: number }</code> types an object with an open set of keys: whatever key you use, the value is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key types:</strong> <span style="color:#f0e2c8;">Keys can be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symbol</code>, template patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-\${string}</code>, or unions of them. Symbol and pattern keys came in TypeScript 4.4. Literal unions need a mapped type such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">Named properties must fit the index type (TS2411), and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> index type must fit the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> one (TS2413), because number keys become strings at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotcha:</strong> <span style="color:#f0e2c8;">A read of a missing key is typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> but is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> does not include, adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">| undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">For known keys use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;Union, V&gt;</code>. For user-supplied keys prefer a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(null)</code>, because plain objects inherit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor</code> and treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code> specially.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Record&lt;string, number&gt;</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ [key: string]: number }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, they are the same type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;K, V&gt;</code> is the mapped type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [P in K]: V }</code>, and with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K = string</code> it produces exactly that index signature. They only differ when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> is a union of literals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the number index type be assignable to the string index type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because JavaScript converts number keys to strings: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[1]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row["1"]</code> are the same property. A value read through the number signature must therefore also be a valid value of the string signature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make missing keys safe without a compiler flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check before reading: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key in obj</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn(obj, key)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[key] ?? fallback</code>. Or declare the value type as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number | undefined</code> yourself, or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> already returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V | undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine an index signature with fixed properties?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, as long as each fixed property type fits the index type, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [k: string]: string | number; name: string }</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code> property there is TS2411. A template pattern signature only covers matching keys, so in 5.4.5 a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debug: boolean</code> property next to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-</code> pattern signature compiled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">noPropertyAccessFromIndexSignature</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.key</code> an error (TS4111) when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> exists only through the index signature, forcing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj["key"]</code>. Dotted access then signals a known property, bracket access a dynamic one.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Index signature | \`[key: K]: V\` member describing an open set of keys with values of type \`V\` |
| Numeric index signature | \`[i: number]: T\`, for array-like objects; a narrower view of string keys |
| noUncheckedIndexedAccess | Flag (outside \`strict\`) adding \`undefined\` to index-signature reads |

**Conclusion:** An index signature is how you type "any key, but every value has this type" — the honest description of a dictionary built at run time. Know the allowed key types, the two consistency rules (named properties and number keys must fit), and above all the gotcha that reads are not typed as possibly \`undefined\` unless you opt in. Pair that with the run-time traps of plain objects and the choice between an index signature, \`Record\` and \`Map\`, and you can answer both the definition and the design follow-ups.`,
    examples: [
      {
        label: `The rules of index signatures, checked by tsc`,
        code: `// An index signature types an object whose keys are not known in advance.
interface WordCounts { [word: string]: number }

function countWords(text: string): WordCounts {
  const counts: WordCounts = {};
  for (const w of text.split(" ")) counts[w] = (counts[w] ?? 0) + 1;
  return counts;
}
const counts = countWords("to be or not to be");
console.log(JSON.stringify(counts)); // {"to":2,"be":2,"or":1,"not":1}

// 1. Every value must match the signature type.
const other: WordCounts = {};
// @ts-expect-error Type 'string' is not assignable to type 'number'.
other.extra = "many";

// 2. Reading a missing key: the type says number, the value is undefined.
const missing = counts["banana"];
console.log(missing); // undefined
// (noUncheckedIndexedAccess would type it number | undefined; strict alone does not.)

// 3. Named properties must fit the index signature too.
interface Config {
  [key: string]: string | number;
  name: string;
  // @ts-expect-error Property 'debug' of type 'boolean' is not assignable to 'string' index type 'string | number'.
  debug: boolean;
}

// 4. Number keys: JavaScript turns them into strings at run time.
interface Row { [index: number]: string }
const row: Row = { 0: "id", 1: "name" };
console.log(Object.keys(row).map((k) => typeof k).join(",")); // string,string
const viaString = (row as Record<string, string>)["1"];
console.log(row[1] === viaString); // true

// 5. A number index type must be assignable to the string index type.
interface Mixed {
  [key: string]: string;
  // @ts-expect-error 'number' index type 'number' is not assignable to 'string' index type 'string'.
  [index: number]: number;
}

// 6. Template literal pattern keys and symbol keys (TypeScript 4.4+).
interface DataAttrs { [attr: \`data-\${string}\`]: string }
const attrs: DataAttrs = { "data-id": "7", "data-role": "tab" };
// @ts-expect-error Object literal may only specify known properties, and 'id' does not exist in type 'DataAttrs'.
const bad: DataAttrs = { id: "7" };
console.log(Object.keys(attrs).join(" ")); // data-id data-role

// 7. Inherited keys are not in the type, but they are on a plain object.
console.log(typeof counts["constructor"]); // function
console.log(Object.hasOwn(counts, "constructor")); // false`,
      },
      {
        label: `Plain object vs Object.create(null) vs Map as a dictionary`,
        code: `// Three ways to store a dictionary, fed the same awkward keys.
const words = ["apple", "constructor", "__proto__", "apple"];

// 1. Plain object with an index signature.
const plain: { [word: string]: number } = {};
for (const w of words) plain[w] = (plain[w] || 0) + 1;
console.log(Object.keys(plain).join(",")); // apple,constructor
// "constructor" started from the inherited Object function, so the "number"
// is really a string: the function source text with "1" glued on the end.
console.log(typeof plain["constructor"]); // string
console.log(String(plain["constructor"]).slice(0, 17)); // function Object()
// "__proto__" was swallowed by the prototype setter and never stored.
console.log(Object.hasOwn(plain, "__proto__")); // false

// 2. Object.create(null): no prototype, so no inherited keys.
const bare: { [word: string]: number } = Object.create(null);
for (const w of words) bare[w] = (bare[w] || 0) + 1;
console.log(JSON.stringify(bare)); // {"apple":2,"constructor":1,"__proto__":1}

// 3. Map: keys of any type, size, insertion order, has() that means own keys.
const map = new Map<string, number>();
for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
console.log(JSON.stringify([...map])); // [["apple",2],["constructor",1],["__proto__",1]]
// Map.get is typed number | undefined, so strict forces the missing case.
const pears: number = map.get("pear") ?? 0;
console.log("pears:", pears, "size:", map.size);`,
      },
    ],
  },
  {
    title: `What is the Record utility type?`,
    difficulty: "medium",
    seoDescription: `Record<K, V> is the mapped type { [P in K]: V }: exhaustive lookup tables with union keys, an index signature with string keys, and its limits.`,
    description: `**Question presented to candidate:**
"What does \`Record<K, V>\` do in TypeScript? When would you reach for it instead of writing an index signature or an object type by hand?"

**What a strong answer should cover:**
- \`Record<K, V>\` builds an object type whose keys are \`K\` and whose values are all \`V\`; in \`lib.es5.d.ts\` it is the mapped type \`{ [P in K]: T }\` with \`K extends keyof any\`
- With a union of literal keys every key is required and unknown keys are rejected, which gives exhaustiveness: adding a union member breaks every table that misses it
- With \`string\` keys it is exactly an index signature, with the same "missing key is still typed \`V\`" gotcha
- Common patterns: lookup tables of labels or handlers, \`Partial<Record<K, V>>\` for optional keys, grouping results with \`Record<string, T[]>\`
- Limits: \`Object.keys\` still returns \`string[]\`, and plain objects carry prototype keys; \`Map\` is better for dynamic, user-supplied keys

**Code / implementation expected:** Yes — a lookup table keyed by a status union, and what tsc says when a key is missing.`,
    answer: `**Target Audience:** Beginners who have met \`Record<string, ...>\` in code and want to know what it really is and when it helps.
**Difficulty:** Medium
**TypeScript version:** Every error and output below comes from TypeScript 5.4.5 with \`--strict\`; the definition is quoted from the 5.4.5 \`lib.es5.d.ts\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A school prints a **register** for each class. The left column lists every pupil, already printed; the right column has one box per pupil for the same kind of thing: "present" or "absent". The teacher cannot skip a pupil (the empty box stands out) and cannot add a pupil who is not on the list (there is no row for them).

\`Record<K, V>\` is that register. \`K\` is the printed list of names, \`V\` is what goes in every box. If the list is a fixed set like \`"idle" | "loading" | "error"\`, TypeScript makes sure every name gets a box and no strangers sneak in. If the list is "any string", it becomes an open guest book instead — still useful, but without those guarantees.

📌 **Interview term: Record utility type** — \`Record<K, V>\`, a built-in generic that produces an object type with keys \`K\` and values of type \`V\`. Shipped with the original mapped-type utilities in TypeScript 2.1 ([TypeScript 2.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)).

## 2. What It Actually Is

The whole definition, from \`lib.es5.d.ts\` in TypeScript 5.4.5:

~~~ts
type Record<K extends keyof any, T> = {
    [P in K]: T;
};
~~~

📌 **Interview term: mapped type** — a type that loops over a set of keys (\`[P in K]\`) and produces one property per key. \`Record\` is the simplest possible mapped type: every property gets the same type \`T\`. Full topic: [What are mapped types?](/interview-question/what-are-mapped-types)

\`keyof any\` is \`string | number | symbol\` — the types that can be property keys. The example rebuilds \`MyRecord\` by hand and proves with a compile-time equality check that it is identical to the built-in one.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Record maps each key of the union idle loading error to a property of type string">
  <rect class="d-box-accent" x="20" y="75" width="220" height="80" rx="12"/>
  <text class="d-text" x="130" y="108" text-anchor="middle">Record of Status</text>
  <text class="d-sub" x="130" y="132" text-anchor="middle">and string</text>
  <rect class="d-box" x="460" y="10" width="240" height="56" rx="10"/>
  <text class="d-text" x="580" y="44" text-anchor="middle">idle: string</text>
  <rect class="d-box" x="460" y="87" width="240" height="56" rx="10"/>
  <text class="d-text" x="580" y="121" text-anchor="middle">loading: string</text>
  <rect class="d-box" x="460" y="164" width="240" height="56" rx="10"/>
  <text class="d-text" x="580" y="198" text-anchor="middle">error: string</text>
  <path class="d-edge" d="M 244 100 L 454 40"/>
  <path class="d-edge" d="M 244 115 L 454 115"/>
  <path class="d-edge" d="M 244 130 L 454 190"/>
</svg>

Each member of the key union becomes one required property, all with the value type.

## 3. Two Very Different Uses

### 3.1 Literal union keys: a complete table

~~~ts
type Status = "idle" | "loading" | "error";
const labels: Record<Status, string> = {
  idle: "Ready",
  loading: "Loading...",
  error: "Something went wrong",
};
~~~

Leave a key out:

~~~text
main.ts(19,7): error TS2741: Property 'error' is missing in type '{ idle: string; loading: string; }' but required in type 'Record<Status, string>'.
~~~

Add a key that is not in the union:

~~~text
main.ts(23,81): error TS2353: Object literal may only specify known properties, and 'done' does not exist in type 'Record<Status, string>'.
~~~

Misspell a key when reading — tsc even suggests the right one:

~~~text
main.ts(12,20): error TS2551: Property 'prro' does not exist on type 'Record<Plan, number>'. Did you mean 'pro'?
~~~

📌 **Interview term: exhaustive lookup table** — an object typed \`Record<Union, V>\`, so the compiler guarantees one entry per union member. When someone adds \`"team"\` to the union, every such table stops compiling until it has a \`team\` entry:

~~~text
main.ts(19,7): error TS2741: Property 'team' is missing in type '{ free: number; pro: number; }' but required in type 'Record<Plan2, number>'.
~~~

That is often a cleaner alternative to a \`switch\` for mapping a union to values; switch-based exhaustiveness is covered in [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)

### 3.2 String keys: a dictionary

\`Record<string, number>\` is **exactly** \`{ [key: string]: number }\` — the example proves the two are equal types. It inherits everything about index signatures, including the main gotcha: \`looseLimits["prro"]\` compiles, is typed \`number\`, and is \`undefined\` at run time (first line of example 2's output). Details and the \`noUncheckedIndexedAccess\` fix: [What is an index signature?](/interview-question/what-is-an-index-signature)

## 4. Patterns Worth Knowing

**Optional keys:** \`Partial<Record<Status, string>>\` — every key may be missing, and reads are typed \`string | undefined\`:

~~~text
main.ts(36,13): error TS18048: 'groups.free' is possibly 'undefined'.
~~~

That is the honest type for a grouping result where some groups may be empty; \`groups.free?.length ?? 0\` handles it. [Partial](/interview-question/what-are-utility-types-like-partial-pick-and-omit) and friends are covered separately.

**Function values:** \`Record<Status, () => string>\` maps each state to a handler; \`handlers[current]()\` dispatches (the run prints \`show spinner\`).

**Grouping:** \`Record<string, T[]>\` with \`(byPlan[key] ??= []).push(item)\` — a typed group-by.

**Keys from a value:** when the keys come from an existing object, derive them instead of repeating them: \`Record<keyof typeof config, boolean>\`. See [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript)

**Validate a literal without losing its keys:** \`const routes = { ... } satisfies Record<string, Route>\` checks every value while keeping the exact key names; see [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)

## 5. What Record Does Not Do

- **\`Object.keys\` still returns \`string[]\`**, not \`Status[]\`. The example checks this with a type equality test. TypeScript does this on purpose: thanks to [structural typing](/interview-question/what-is-structural-typing), an object can hold more keys than its type lists. Cast (\`as Status[]\`) only when you created the object yourself.
- **No run-time object.** \`Record\` is erased; the value is a plain object, with the prototype keys of any plain object (\`constructor\`, \`__proto__\`).
- **No ordering, size or non-string keys.** Number keys become strings at run time. For dynamic or user-supplied keys, a \`Map<K, V>\` is usually the better data structure.

| Need | Use |
| :--- | :--- |
| One value per member of a known union | \`Record<Union, V>\` |
| Some members of a known union | \`Partial<Record<Union, V>>\` |
| Open string keys, JSON-friendly | \`Record<string, V>\` or an index signature |
| Open keys from users, frequent add/delete | \`Map<K, V>\` |
| Fixed keys with different value types | A normal object type or interface |

## 6. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line erroring; the messages above are tsc output with the directives removed.

Example 1, Record as a mapped type and an exhaustive table:

~~~text
Record is a mapped type: true
Loading...
Record<string, number> equals an index signature: true
{"error":"Try again"}
show spinner
true idle|loading|error
~~~

Example 2, \`Record<string, V>\` vs \`Record<Union, V>\`, grouping and \`Partial\`:

~~~text
undefined
undefined
50
{"pro":["Ada","Grace"],"free":["Linus"]}
1
1
~~~

The second \`undefined\` comes from \`limits.prro\`: a type error (TS2551), but the JavaScript still ran. Types catch the bug only if you read the errors.

## Common Pitfalls

- **Using \`Record<string, V>\` when the keys are known.** You lose required keys and typo detection; write \`Record<"a" | "b", V>\`.
- **Trusting reads from \`Record<string, V>\`.** A missing key is typed \`V\` but is \`undefined\`; use \`?? fallback\`, \`Partial\`, or \`noUncheckedIndexedAccess\`.
- **Expecting \`Object.keys\` to return \`K[]\`.** It returns \`string[]\`; cast deliberately or iterate the union instead.
- **Using \`Record\` for objects whose properties have different types.** \`Record<string, string | number | boolean>\` throws away which key has which type; write the object type.
- **Using a plain-object \`Record\` for user-supplied keys.** \`__proto__\` and inherited keys misbehave; use a \`Map\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;K, V&gt;</code> builds an object type with keys <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> and values <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V</code>. Under the hood it is the mapped type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [P in K]: T }</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof any</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Union keys:</strong> <span style="color:#f0e2c8;">With a literal union like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;Status, string&gt;</code> every key is <strong style="color:#ffca28;">required</strong> and unknown keys are rejected, so it is an exhaustive lookup table: add a union member and every table missing it fails to compile.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. String keys:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, V&gt;</code> is exactly an index signature, with the same catch: a missing key is still typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V</code> unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code> is on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial&lt;Record&lt;K, V&gt;&gt;</code> for optional keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;K, () =&gt; R&gt;</code> for handler maps, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, T[]&gt;</code> for grouping, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies Record&lt;...&gt;</code> to validate a literal without widening it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">It is erased, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> still returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code>, and plain objects have prototype keys, so for dynamic user-supplied keys I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Record&lt;string, number&gt;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ [key: string]: number }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None: they are the same type, and an equality check in tsc confirms it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record</code> only differs from a hand-written index signature when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code> is a union of literals, where it produces required named properties instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.keys(record)</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">K[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because of structural typing, an object can carry extra keys its type does not mention, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K[]</code> would be unsound. Cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K[]</code> only when you built the object yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make some keys optional?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial&lt;Record&lt;K, V&gt;&gt;</code> makes every key optional and reads return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V | undefined</code>. For a mix of required and optional keys, intersect two records or write the object type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When keys come from users or change at run time, when you need non-string keys, ordering by insertion or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, or frequent add and delete. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map.get</code> is also typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V | undefined</code>, which is safer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">K extends keyof any</code> mean in the definition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof any</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number | symbol</code>, the types JavaScript allows as property keys. The constraint stops you writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;boolean, V&gt;</code>: tsc 5.4.5 reports TS2344, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Type boolean does not satisfy the constraint string | number | symbol</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Record utility type | \`Record<K, V>\`: object type with keys \`K\` and values of type \`V\` |
| Mapped type | A type that produces one property per key with \`[P in K]\` |
| Exhaustive lookup table | A \`Record<Union, V>\` object that must have an entry for every union member |

**Conclusion:** \`Record<K, V>\` is a one-line mapped type that means two different things depending on \`K\`. With a literal union it is a complete, typo-proof lookup table that the compiler keeps in sync with the union. With \`string\` it is just an index signature, with all its looseness. Knowing which one you are writing, plus the patterns around it (\`Partial\`, \`satisfies\`, \`keyof typeof\`) and its limits (\`Object.keys\`, prototype keys, \`Map\` for dynamic data), is what turns "it is a utility type" into a strong interview answer.`,
    examples: [
      {
        label: `Record as a mapped type and an exhaustive lookup table`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Record<K, V> is a mapped type: { [P in K]: V }.
type MyRecord<K extends keyof any, V> = { [P in K]: V };
const same: Equal<Record<"a" | "b", number>, MyRecord<"a" | "b", number>> = true;
console.log("Record is a mapped type:", same);

// 1. With a union of literal keys, every key is required.
type Status = "idle" | "loading" | "error";
const labels: Record<Status, string> = {
  idle: "Ready",
  loading: "Loading...",
  error: "Something went wrong",
};
console.log(labels.loading); // Loading...

// Forget one key and tsc tells you which.
// @ts-expect-error Property 'error' is missing in type '{ idle: string; loading: string; }'
const partialLabels: Record<Status, string> = { idle: "Ready", loading: "Loading..." };

// A key that is not in the union is rejected too.
// @ts-expect-error Object literal may only specify known properties, and 'done' does not exist
const extraLabels: Record<Status, string> = { idle: "", loading: "", error: "", done: "" };

// 2. With string keys, Record is the same as an index signature.
const ok2: Equal<Record<string, number>, { [key: string]: number }> = true;
console.log("Record<string, number> equals an index signature:", ok2);

// 3. Optional keys: wrap it in Partial.
const overrides: Partial<Record<Status, string>> = { error: "Try again" };
console.log(JSON.stringify(overrides)); // {"error":"Try again"}

// 4. Values can be any type, including functions.
const handlers: Record<Status, () => string> = {
  idle: () => "show button",
  loading: () => "show spinner",
  error: () => "show retry",
};
const current: Status = "loading";
console.log(handlers[current]()); // show spinner

// 5. Object.keys still returns string[], not Status[].
const keys = Object.keys(labels);
const ok3: Equal<typeof keys, string[]> = true;
const typedKeys = Object.keys(labels) as Status[];
console.log(ok3, typedKeys.join("|"));`,
      },
      {
        label: `Record<string, V> vs Record<Union, V>, grouping and Partial`,
        code: `// Record<string, V> versus Record<Union, V> in a real lookup table.
type Plan = "free" | "pro";

// Loose: any string is a valid key, so typos compile and return undefined.
const looseLimits: Record<string, number> = { free: 3, pro: 50 };
const typo = looseLimits["prro"];
console.log(typo); // undefined

// Strict: only the union members are keys.
const limits: Record<Plan, number> = { free: 3, pro: 50 };
// @ts-expect-error Property 'prro' does not exist on type 'Record<Plan, number>'.
console.log(limits.prro); // undefined
console.log(limits.pro); // 50

// Exhaustiveness for free: add "team" to the union and every Record<Plan, ...>
// table stops compiling until the new key is filled in.
type Plan2 = "free" | "pro" | "team";
// @ts-expect-error Property 'team' is missing in type '{ free: number; pro: number; }'
const limits2: Record<Plan2, number> = { free: 3, pro: 50 };

// Typing a dictionary built at run time: Record<string, T[]>.
type User = { name: string; plan: Plan };
const users: User[] = [
  { name: "Ada", plan: "pro" },
  { name: "Linus", plan: "free" },
  { name: "Grace", plan: "pro" },
];
const byPlan: Record<string, string[]> = {};
for (const u of users) (byPlan[u.plan] ??= []).push(u.name);
console.log(JSON.stringify(byPlan)); // {"pro":["Ada","Grace"],"free":["Linus"]}

// Partial<Record<Plan, ...>> says honestly that a key may be absent.
const groups: Partial<Record<Plan, string[]>> = {};
for (const u of users) (groups[u.plan] ??= []).push(u.name);
// @ts-expect-error 'groups.free' is possibly 'undefined'.
console.log(groups.free.length); // 1
console.log(groups.free?.length ?? 0); // 1`,
      },
    ],
  },
  {
    title: `What are access modifiers in TypeScript classes?`,
    difficulty: "easy",
    seoDescription: `public, protected, private and readonly in TypeScript classes, parameter properties, and why private is compile-time only while #private is real.`,
    description: `**Question presented to candidate:**
"What access modifiers does TypeScript give you for class members, what does each one allow, and does \`private\` actually keep data private?"

**What a strong answer should cover:**
- \`public\` (the default), \`protected\` (the class and its subclasses) and \`private\` (the declaring class only), plus \`readonly\` (assign only in the declaration or constructor)
- Parameter properties: \`constructor(private readonly id: string)\` declares and assigns a field in one step
- These modifiers are compile-time only: they are erased, so \`private\` fields show up in \`JSON.stringify\`, \`Object.keys\` and bracket access, and code that ignores tsc can still change them
- JavaScript \`#private\` fields (supported since TypeScript 3.8) are enforced by the engine at run time; \`#x in obj\` is a brand check (TypeScript 4.5)
- Details interviewers probe: \`protected\` access only through an instance of the accessing class (TS2446), private constructors for singletons and factories, and that private members make classes compare nominally

**Code / implementation expected:** Optional — a small class hierarchy showing what each modifier allows and what still happens at run time.`,
    answer: `**Target Audience:** Beginners writing their first TypeScript classes, and developers from Java or C# who expect \`private\` to be enforced at run time.
**Difficulty:** Easy
**TypeScript version:** Every error and output below comes from TypeScript 5.4.5 with \`--strict\` (target ES2022, so \`#private\` fields run natively); version facts are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every compiler message and output was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

An office building has signs on its doors. "Reception — open to everyone." "Staff only." "Manager only." "Do not move this furniture." Everyone who reads and respects the signs stays where they should. But a sign is not a lock: someone who ignores it can walk straight in.

TypeScript \`public\`, \`protected\`, \`private\` and \`readonly\` are **signs**. The compiler reads them and refuses to compile code that ignores them, but they are removed from the JavaScript that actually runs. JavaScript \`#private\` fields are the **lock**: the engine itself refuses access.

📌 **Interview term: access modifier** — a keyword on a class member that controls where it may be used: \`public\`, \`protected\` or \`private\`. 📌 **Interview term: readonly modifier** — a keyword that forbids reassignment after the declaration or the constructor.

## 2. The Four Modifiers

| Modifier | Who may access | Error when broken (5.4.5) |
| :--- | :--- | :--- |
| \`public\` (default) | Everyone | — |
| \`protected\` | The class and its subclasses | \`TS2445: Property 'log' is protected and only accessible within class 'BankAccount' and its subclasses.\` |
| \`private\` | The declaring class only (not subclasses) | \`TS2341: Property 'balance' is private and only accessible within class 'BankAccount'.\` |
| \`readonly\` | Read anywhere it is visible; write only in declaration or constructor | \`TS2540: Cannot assign to 'id' because it is a read-only property.\` |

\`readonly\` combines with the others (\`private readonly\`, \`protected readonly\`). It is shallow: a \`readonly items: string[]\` cannot be reassigned, but \`items.push()\` still works — see [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Nested scopes: private inside the class, protected also in subclasses, public everywhere">
  <rect class="d-box-muted" x="20" y="20" width="680" height="210" rx="14"/>
  <text class="d-text" x="60" y="52">public: any code</text>
  <rect class="d-box" x="60" y="72" width="600" height="140" rx="12"/>
  <text class="d-text" x="100" y="102">protected: class and subclasses</text>
  <rect class="d-box-accent" x="100" y="122" width="300" height="72" rx="10"/>
  <text class="d-text" x="250" y="152" text-anchor="middle">private</text>
  <text class="d-sub" x="250" y="176" text-anchor="middle">declaring class only</text>
</svg>

Each ring can see everything inside the rings it contains: a subclass sees \`protected\` and \`public\` members, outside code only \`public\`.

## 3. A Walk Through the Example

~~~ts
class BankAccount {
  public owner: string;
  readonly id: number;
  private balance = 0;
  protected log: string[] = [];
  // ...
}
class SavingsAccount extends BankAccount {
  addInterest(rate: number) {
    this.log.push("interest " + rate);  // OK: protected
    this.balance *= 1 + rate;           // TS2341: private to BankAccount
  }
}
~~~

\`private\` is **not** inherited as accessible: a subclass cannot touch it. If subclasses need it, it should be \`protected\`.

### Parameter properties

📌 **Interview term: parameter property** — a constructor parameter with a modifier (\`public\`, \`private\`, \`protected\` or \`readonly\`). TypeScript declares a field with that name and assigns the argument to it:

~~~ts
class Point {
  constructor(public readonly x: number, private y: number) {}
}
~~~

That is one of the few TypeScript features that generates code. Transpiling that class with TypeScript 5.4.5 \`ts.transpile\` (target ES2022) printed:

~~~text
class Point {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
~~~

Because it generates code, Node.js type stripping does not support parameter properties, and TypeScript 5.8 added \`--erasableSyntaxOnly\` to flag them along with enums and namespaces with run-time code ([TypeScript 5.8 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)). Not run here: 5.8 is newer than the 5.4.5 used for this page.

## 4. Compile Time Only: What Really Happens

Example 1 writes to \`balance\`, empties \`log\` and reassigns \`id\` from outside the class. tsc rejects all three lines — and the run shows the emitted JavaScript **executed them anyway**: the balance printed as \`1000000\` and the id as \`2\`. The modifiers are erased.

📌 **Interview term: soft privacy** — privacy enforced only by the type checker. TypeScript \`private\` is soft: at run time the field is an ordinary property.

Example 2 makes the difference visible:

| Check | \`private pin\` | \`#pin\` |
| :--- | :--- | :--- |
| \`JSON.stringify(obj)\` | \`{"pin":1234}\` | \`{}\` |
| \`Object.keys(obj)\` | \`pin\` | (nothing, length 0) |
| \`obj["pin"]\` / \`obj["#pin"]\` | \`1234\` — tsc allows bracket access to \`private\` | \`undefined\` — and a tsc error |
| Enforced at run time | No | Yes, by the engine |

Bracket access with a string literal is a deliberate escape hatch: tsc rejects \`soft.pin\` (TS2341) but accepts \`soft["pin"]\`, which tests and debugging code sometimes rely on. The \`#pin\` attempt fails at both levels:

~~~text
main.ts(23,13): error TS7053: Element implicitly has an 'any' type because expression of type '"#pin"' can't be used to index type 'Hard'.
  Property '#pin' does not exist on type 'Hard'.
~~~

📌 **Interview term: ECMAScript private field (hard privacy)** — a class member whose name starts with \`#\`. It is part of JavaScript itself (ES2022) and is inaccessible outside the class body, even to code that ignores TypeScript. TypeScript supports it since 3.8; it cannot be combined with \`public\`/\`private\` modifiers, and when compiled for older targets it is emulated with \`WeakMap\`s ([TypeScript 3.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html)).

\`#pin in x\` checks whether \`x\` really was built by the class — a "brand check" that a look-alike object \`{ pin: 1234 }\` fails (the run prints \`true false\`). TypeScript added support for these private field presence checks in 4.5 ([LogRocket: What is new in TypeScript 4.5](https://blog.logrocket.com/whats-new-typescript-4-5)).

### So which privacy should you use?

- \`private\` — simple, familiar, zero run-time cost; fine inside an app where everyone compiles with tsc. Visible in serialisation and debuggers.
- \`#private\` — when privacy must hold at run time: libraries, security-sensitive state, or values that must not leak through \`JSON.stringify\`. Each \`#\` name is scoped to its own class, so a subclass can declare the same name without a clash (checked: a parent and child that both declare \`#id\` each read their own value).

## 5. Details Interviewers Probe

**Protected access goes through your own class.** Inside \`Square\`, \`other.sides\` works when \`other\` is a \`Square\`, but not when it is typed as the base class \`Shape\`, because that could be some other subclass:

~~~text
main.ts(35,49): error TS2446: Property 'sides' is protected and only accessible through an instance of class 'Square'. This is an instance of class 'Shape'.
~~~

**Private constructors.** \`private constructor()\` means only the class may call \`new\` — the basis of singletons and static factory methods:

~~~text
main.ts(46,1): error TS2673: Constructor of class 'Config' is private and only accessible within the class declaration.
~~~

The run shows \`Config.get() === Config.get()\` is \`true\`. (The forbidden \`new Config("dev")\` still ran — soft privacy again.)

**Private members make classes nominal.** Two classes with the same shape are interchangeable — unless one has a \`private\`, \`protected\` or \`#private\` member; see [What is structural typing?](/interview-question/what-is-structural-typing)

**Related class features** live in their own pages: [abstract classes](/interview-question/what-are-abstract-classes), [the definite assignment assertion](/interview-question/what-is-the-definite-assignment-assertion) for fields assigned outside the constructor, and [the polymorphic \`this\` type](/interview-question/what-is-a-polymorphic-this-type).

## 6. Verified: Running the Code

Both examples passed \`tsc --strict\` (5.4.5) with every \`// @ts-expect-error\` line erroring; with the directives removed tsc printed:

~~~text
main.ts(28,10): error TS2341: Property 'balance' is private and only accessible within class 'BankAccount'.
main.ts(40,6): error TS2341: Property 'balance' is private and only accessible within class 'BankAccount'.
main.ts(42,6): error TS2445: Property 'log' is protected and only accessible within class 'BankAccount' and its subclasses.
main.ts(44,6): error TS2540: Cannot assign to 'id' because it is a read-only property.
~~~

Example 1, the four modifiers and parameter properties:

~~~text
balance: 150
history: deposit 100; interest 0.5
1000000
2
10
{"x":3,"y":4}
~~~

The last line is the parameter property \`Point\`: both fields exist as ordinary properties, the \`private y\` included.

Example 2, \`private\` vs \`#private\`, protected across instances and a private constructor:

~~~text
{"pin":1234}
pin
1234
1234
{}
0
undefined
true
true false
true
true prod
~~~

## Common Pitfalls

- **Treating \`private\` as security.** It is erased; the field is visible in JSON, \`Object.keys\`, bracket access and the debugger. Use \`#private\` when it must be hidden at run time.
- **Expecting subclasses to see \`private\`.** They cannot; use \`protected\`.
- **Thinking \`readonly\` freezes the value.** It blocks reassignment of the property only; arrays and objects inside can still be mutated.
- **Mixing \`#\` with modifiers.** \`private #x\` is TS18010, \`An accessibility modifier cannot be used with a private identifier.\`; a \`#\` field is already private.
- **Leaking \`private\` data through serialisation.** \`JSON.stringify(user)\` includes \`private passwordHash\`; exclude it explicitly or use \`#\`.
- **Accessing \`protected\` through a base-class reference.** TS2446; take a parameter of your own class type.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The modifiers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">public</code> is the default, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">protected</code> allows the class and its subclasses, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> only the declaring class, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> allows assignment only in the declaration or constructor.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shortcut:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Parameter properties</strong> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor(private readonly id: string)</code> declare and assign a field in one step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The key caveat:</strong> <span style="color:#f0e2c8;">These are <strong style="color:#ffca28;">compile-time only</strong>. They are erased, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> field still appears in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> and bracket access, and code that ignores tsc can change it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hard privacy:</strong> <span style="color:#f0e2c8;">JavaScript <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> fields, supported since TypeScript 3.8, are enforced by the engine: invisible to JSON and keys, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#x in obj</code> gives a reliable brand check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">protected</code> members can only be reached through an instance of the accessing class (TS2446); a private constructor enables singletons and factories; private members make classes compare nominally.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is TypeScript <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">private</code> really private?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only at compile time. In the run, writing to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> field from outside, after tsc rejected it, still changed the value, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> printed it. For run-time privacy use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#field</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj["secret"]</code> compile when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.secret</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TypeScript deliberately allows bracket access with a string literal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> members as an escape hatch, mainly for tests. It does not work for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> fields: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj["#secret"]</code> is a different, non-existent property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a subclass access a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">private</code> member of its parent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, that is TS2341. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">protected</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code>, a subclass can even declare its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#field</code> of the same name, because each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> name is scoped to its class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.freeze</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> is a compile-time rule on one property and is shallow. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> acts at run time on the whole object but is also shallow. They are often combined for constants.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a private constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When instances must be created through the class itself: a singleton <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static get()</code> or a factory like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static fromJson()</code> that validates input first. tsc rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> from outside with TS2673.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Access modifier | \`public\`, \`protected\` or \`private\`: where a class member may be used |
| Readonly modifier | Forbids reassignment after the declaration or constructor |
| Parameter property | A constructor parameter with a modifier, which declares and assigns a field |
| Soft privacy | Privacy checked only by the compiler and erased at run time |
| ECMAScript private field (hard privacy) | A \`#name\` member that the JavaScript engine itself keeps private |

**Conclusion:** TypeScript gives you three access levels — \`public\`, \`protected\`, \`private\` — plus \`readonly\`, and parameter properties to declare them concisely. The essential insight is that they are signs, not locks: the compiler enforces them, the run time does not, as the example proved by mutating a \`private\` field after tsc rejected it. When privacy must survive run time, use JavaScript \`#private\` fields. Add the \`protected\`-through-own-class rule, private constructors and the effect on structural typing, and you have an answer that goes beyond the definitions.`,
    examples: [
      {
        label: `The four modifiers, and what still runs after tsc rejects it`,
        code: `// public, private, protected and readonly, with parameter properties.
class BankAccount {
  // public is the default; writing it is optional.
  public owner: string;
  // readonly: assignable only in the declaration or the constructor.
  readonly id: number;
  // private: only code inside BankAccount may touch it.
  private balance = 0;
  // protected: BankAccount and its subclasses.
  protected log: string[] = [];

  constructor(owner: string, id: number) {
    this.owner = owner;
    this.id = id;
  }
  deposit(amount: number): void {
    this.balance += amount;
    this.log.push("deposit " + amount);
  }
  getBalance(): number { return this.balance; }
}

class SavingsAccount extends BankAccount {
  addInterest(rate: number): void {
    // protected is visible in a subclass...
    this.log.push("interest " + rate);
    // @ts-expect-error Property 'balance' is private and only accessible within class 'BankAccount'.
    this.balance *= 1 + rate;
  }
  history(): string { return this.log.join("; "); }
}

const acct = new SavingsAccount("Ada", 1);
acct.deposit(100);
acct.addInterest(0.5);
console.log("balance:", acct.getBalance());
console.log("history:", acct.history());

// @ts-expect-error Property 'balance' is private and only accessible within class 'BankAccount'.
acct.balance = 1_000_000;
// @ts-expect-error Property 'log' is protected and only accessible within class 'BankAccount' and its subclasses.
acct.log.length = 0;
// @ts-expect-error Cannot assign to 'id' because it is a read-only property.
acct.id = 2;
// tsc rejects all three lines, but the emitted JavaScript still ran them:
console.log(acct.getBalance()); // 1000000
console.log(acct.id); // 2

// Parameter properties: a modifier on a constructor parameter declares and
// assigns the field in one step.
class Point {
  constructor(public readonly x: number, private y: number) {}
  sum(): number { return this.x + this.y; }
}
const p = new Point(3, 4);
console.log(p.x + p.sum()); // 10
console.log(JSON.stringify(p)); // {"x":3,"y":4}`,
      },
      {
        label: `private vs #private, protected access and private constructors`,
        code: `// TypeScript private versus JavaScript #private.
class Soft { private pin = 1234; }
class Hard {
  #pin = 1234;
  static isHard(x: object): boolean { return #pin in x; }
  check(guess: number): boolean { return guess === this.#pin; }
}
const soft = new Soft();
const hard = new Hard();

// private is erased: the field is an ordinary property at run time.
console.log(JSON.stringify(soft)); // {"pin":1234}
console.log(Object.keys(soft).join(",")); // pin
// Bracket access with a literal key is an allowed escape hatch for private.
console.log(soft["pin"]); // 1234
// @ts-expect-error Property 'pin' is private and only accessible within class 'Soft'.
console.log(soft.pin); // 1234

// #pin is a real private field: invisible to JSON, keys and brackets.
console.log(JSON.stringify(hard)); // {}
console.log(Object.keys(hard).length); // 0
// @ts-expect-error Element implicitly has an 'any' type because expression of type '"#pin"' cannot be used to index type 'Hard'.
console.log(hard["#pin"]); // undefined
console.log(hard.check(1234)); // true
// "#pin in x" is an ergonomic brand check.
console.log(Hard.isHard(hard), Hard.isHard({ pin: 1234 }));

// protected across instances: a subclass may only reach the protected member
// through its own class, not through a sibling.
class Shape { protected sides = 0; }
class Square extends Shape {
  constructor() { super(); this.sides = 4; }
  sameAs(other: Square): boolean { return other.sides === this.sides; }
  // @ts-expect-error Property 'sides' is protected and only accessible through an instance of class 'Square'.
  compare(other: Shape): boolean { return other.sides === this.sides; }
}
console.log(new Square().sameAs(new Square())); // true

// A private constructor: only the class itself can create instances.
class Config {
  private static instance?: Config;
  private constructor(readonly env: string) {}
  static get(): Config { return (Config.instance ??= new Config("prod")); }
}
// @ts-expect-error Constructor of class 'Config' is private and only accessible within the class declaration.
new Config("dev");
console.log(Config.get() === Config.get(), Config.get().env);`,
      },
    ],
  },
];

export default augments;
