/**
 * TYPESCRIPT ULTRA — batch 05: Narrowing I (narrowing and type guards, the in
 * operator, discriminated unions, exhaustiveness checking, the never type). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What is type narrowing and what are type guards?`,
    difficulty: "medium",
    seoDescription: `Type narrowing is how TypeScript refines a union after typeof, instanceof, equality or in checks, and how to write your own x is T type guards.`,
    description: `**Question presented to candidate:**
"TypeScript lets you write \`if (typeof x === 'string')\` and then call string methods on \`x\` inside the block. What is that mechanism called, which checks does the compiler understand, and how do you write your own type guard?"

**What a strong answer should cover:**
- Narrowing is control-flow analysis: a variable has a declared type and, at each point in the code, a narrower current type based on the checks and assignments that came before
- The built-in guards: \`typeof\`, truthiness, \`===\` / \`!==\` (including \`null\` checks), \`instanceof\`, \`Array.isArray\`, \`in\`, and discriminant property checks; early returns narrow the rest of the function
- Classic traps: \`typeof null === "object"\`, truthiness also drops \`""\` and \`0\`, narrowing of mutable values is not trusted inside callbacks
- User-defined type guards (\`x is T\`): the false branch narrows too, \`filter(isX)\` gives a narrowed array, and the compiler trusts the predicate blindly, so a wrong guard is a real bug
- Related tools and versions: assertion functions (\`asserts x is T\`), 5.4 keeping narrowing in closures after the last assignment, 5.5 inferring predicates

**Code / implementation expected:** Yes — a function that narrows a union with built-in checks, plus one hand-written \`x is T\` guard.`,
    answer: `**Target Audience:** Developers who use unions every day and want to know exactly when TypeScript lets them treat a value as one specific member.
**Difficulty:** Medium
**TypeScript version:** Every narrowing result and compiler message below comes from TypeScript 5.4.5 with \`--strict\`. The 5.5 feature mentioned at the end is cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every type claim is checked by \`tsc\` (with an \`Equal<...>\` check or a \`// @ts-expect-error\` line), and every output was produced by running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A parcel arrives at a sorting office. The label says "parcel": it could be a letter, a box of books, or a bag of frozen fish. A sorter cannot put it in the freezer yet. Then someone weighs it, scans it, opens the flap — and from that moment the sorter *knows* what it is and handles it accordingly. The parcel did not change. What changed is what the sorter knows *at this point of the process*.

TypeScript does the same with your variables. A parameter declared as \`string | number | null\` is "a parcel": you may only do what is safe for all three. After \`if (value === null) return;\`, the compiler knows null is gone for the rest of the function. After \`typeof value === "string"\`, it knows the value is a string inside that block. Nothing happens at run time — the check is ordinary JavaScript — but the compiler follows it and gives you a more precise type.

📌 **Interview term: type narrowing** — the compiler refining a variable from its declared type to a more specific type at a particular point in the code, based on the checks, returns and assignments that lead to that point.

📌 **Interview term: control-flow analysis** — the part of the checker that walks the possible execution paths (\`if\`, \`else\`, \`return\`, \`switch\`, \`throw\`, \`&&\`, \`||\`, assignments) to work out the current type of each variable at each location.

📌 **Interview term: type guard** — an expression the compiler understands as a test on a type, such as \`typeof x === "string"\`. Inside the branch where the test passed, the variable is narrowed; in the other branch, it is narrowed the opposite way.

## 2. The Picture: One Variable, Several Current Types

<svg class="iq-diagram" width="100%" viewBox="0 0 720 420" role="img" aria-label="Control flow narrowing of a value through a null check and a typeof check">
  <defs>
    <marker id="q1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="20" width="280" height="60" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">value: string | number | null</text>
  <text class="d-sub" x="360" y="67" text-anchor="middle">declared type</text>
  <rect class="d-box" x="20" y="150" width="220" height="60" rx="10"/>
  <text class="d-text" x="130" y="177" text-anchor="middle">value === null</text>
  <text class="d-sub" x="130" y="197" text-anchor="middle">here: null, then return</text>
  <rect class="d-box" x="420" y="150" width="280" height="60" rx="10"/>
  <text class="d-text" x="560" y="177" text-anchor="middle">rest of the function</text>
  <text class="d-sub" x="560" y="197" text-anchor="middle">here: string | number</text>
  <rect class="d-box" x="300" y="300" width="190" height="60" rx="10"/>
  <text class="d-text" x="395" y="327" text-anchor="middle">typeof is string</text>
  <text class="d-sub" x="395" y="347" text-anchor="middle">here: string</text>
  <rect class="d-box" x="530" y="300" width="170" height="60" rx="10"/>
  <text class="d-text" x="615" y="327" text-anchor="middle">otherwise</text>
  <text class="d-sub" x="615" y="347" text-anchor="middle">here: number</text>
  <path class="d-edge" d="M 300 84 L 160 146" marker-end="url(#q1arrow)"/>
  <path class="d-edge" d="M 420 84 L 540 146" marker-end="url(#q1arrow)"/>
  <path class="d-edge" d="M 520 214 L 420 296" marker-end="url(#q1arrow)"/>
  <path class="d-edge" d="M 590 214 L 610 296" marker-end="url(#q1arrow)"/>
</svg>

The declared type never changes; each box shows the narrowed type the compiler uses in that region of the code.

📌 **Interview term: declared type vs narrowed type** — the declared type is what you annotated (\`let id: string | number\`); the narrowed (or "current") type is what the checker believes at a given line. After \`id = 42\`, the current type of \`id\` is \`number\` even though its declared type is still \`string | number\` — example 1 checks both with \`Equal\`.

## 3. The Built-in Type Guards

| Check | Narrows to | Watch out for |
| :--- | :--- | :--- |
| \`typeof x === "string"\` (also \`"number"\`, \`"boolean"\`, \`"bigint"\`, \`"symbol"\`, \`"undefined"\`, \`"function"\`, \`"object"\`) | the matching primitive or function type | \`typeof null\` is \`"object"\`, so \`"object"\` keeps \`null\` |
| Truthiness: \`if (x)\` | removes \`null\`, \`undefined\` and falsy literals | also rejects \`""\`, \`0\`, \`NaN\` and \`false\` — real values |
| Equality: \`x === null\`, \`x !== undefined\`, \`x === "a"\` | the matching type, or the rest in the other branch | \`x == null\` matches both \`null\` and \`undefined\` |
| \`x instanceof Date\` | the class instance type | only works for classes (things with a constructor at run time), never for interfaces or type aliases |
| \`Array.isArray(x)\` | the array member of the union | from \`unknown\` it gives \`any[]\` |
| \`"key" in x\` | members that have (or may have) \`key\` | see [How does the 'in' operator narrow types?](/interview-question/how-does-the-in-operator-narrow-types) |
| \`x.kind === "circle"\` | the union member with that literal tag | see [What is a discriminated union?](/interview-question/what-is-a-discriminated-union) |

Example 1 walks one function through \`=== null\`, \`typeof\`, \`Array.isArray\` and finally a branch where only \`Date\` remains. Two details from that run deserve to be said out loud in an interview:

**Early returns narrow everything after them.** After \`if (value === null) return "null";\`, tsc confirms the rest of the function sees \`string | number | string[] | Date\`. When all other members have been returned, the last line sees only \`Date\` — no \`instanceof\` needed.

**\`typeof x === "object"\` does not remove \`null\`.** Inside that branch, tsc reports the type as \`object | null\`, and passing it to \`Object.keys\` is rejected:

~~~text
main.ts(52,24): error TS2769: No overload matches this call.
  Overload 1 of 2, '(o: {}): string[]', gave the following error.
    Argument of type 'object | null' is not assignable to parameter of type '{}'.
      Type 'null' is not assignable to type '{}'.
  Overload 2 of 2, '(o: object): string[]', gave the following error.
    Argument of type 'object | null' is not assignable to parameter of type 'object'.
      Type 'null' is not assignable to type 'object'.
~~~

Running it anyway gives \`TypeError: Cannot convert undefined or null to object\`. The fix is \`typeof x === "object" && x !== null\`.

📌 **Interview term: truthiness narrowing** — using \`if (x)\` or \`x && ...\` as a guard. Convenient for removing \`null\`/\`undefined\`, but it also throws away legitimate falsy values: in the run, \`greet("")\` printed \`Hi stranger\`, not \`Hi \`. For numbers and strings that can be empty, compare with \`!== undefined\` instead. More in [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

## 4. Writing Your Own Type Guard

Built-in checks cover primitives and classes. For your own object types (which do not exist at run time), you write a function that does the real check and *tells* the compiler what it proved:

~~~ts
function isCat(pet: Cat | Dog): pet is Cat {
  return "meow" in pet;
}
~~~

📌 **Interview term: type predicate** — a return type of the form \`param is Type\`. The function still returns a boolean at run time; the predicate tells the checker "when this returns \`true\`, the argument is \`Type\`".

📌 **Interview term: user-defined type guard** — a function with a type predicate return. Calling it in an \`if\` narrows the argument in both branches: in example 2, the \`true\` branch sees \`Cat\` and the \`else\` branch sees \`Dog\`.

Three facts from example 2:

1. **A \`boolean\` return type narrows nothing.** The same body typed \`: boolean\` leaves \`first\` as \`Cat | Dog\`, and \`first.meow()\` fails with \`TS2339: Property 'meow' does not exist on type 'Cat | Dog'.\` The predicate is the whole point.
2. **Guards plug into \`filter\`.** \`pets.filter(isCat)\` is typed \`Cat[]\` (checked with \`Equal\`), because \`Array.prototype.filter\` has an overload that accepts a type predicate.
3. **The compiler trusts the predicate completely.** \`isNumberLie\` returns \`typeof x === "string"\` but claims \`x is number\`. It compiles without a warning, and the run ends in \`TypeError: value.toFixed is not a function\`. A type guard is a promise you make; tsc does not check the body against it. Keep guard bodies small and test them.

For \`unknown\` input from outside (JSON, \`postMessage\`, storage), a guard like \`isStringArray(x: unknown): x is string[]\` is the honest way in; the full pattern is in [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape). The cousin that throws instead of returning a boolean is the assertion function, covered in [What are assertion functions (asserts)?](/interview-question/what-are-assertion-functions-asserts).

## 5. Where Narrowing Stops: Callbacks

Narrowing is about a point in the code. A callback runs at *another* point, possibly later, so the compiler has to ask "could the variable have changed in between?"

- **No assignment after the closure is created: narrowing survives.** In example 3, \`label\` assigns \`input = "default"\` when it is \`undefined\` and then returns \`() => input.toUpperCase()\`. That compiles on 5.4.5. This is the 5.4 improvement: for parameters and \`let\` variables used in non-hoisted functions, the checker looks for the last assignment and keeps narrowing created after it ([TypeScript 5.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/), [InfoWorld](https://www.infoworld.com/article/3712660/typescript-soothes-type-narrowing-pain-point.html)). Older versions reported an error here; that part was not run here.
- **An assignment after the closure: narrowing is dropped.** In \`labelLate\`, \`input = 0\` comes after the arrow function, and tsc reports \`TS2339: Property 'toUpperCase' does not exist on type 'string | number'.\` It is right: the run calls the closure after the assignment and crashes with \`TypeError: input.toUpperCase is not a function\`.
- **Property narrowing on a mutable object is not kept in callbacks.** \`if (settings.title) [1, 2].forEach(() => settings.title.length)\` fails with \`TS18048: 'settings.title' is possibly 'undefined'.\` The idiomatic fix is to copy the narrowed value into a \`const\` first.

## 6. Verified: Running the Code

All three examples pass \`tsc --strict\` on TypeScript 5.4.5. Every \`Equal<...>\` line compiles only if the narrowed type is exactly the one claimed, and every \`// @ts-expect-error\` line is a real error — with the directives removed, tsc printed the messages quoted above. Then each example was run as the page runs it.

Example 1, the built-in guards:

~~~text
null
string of length 5
number 3.1
array joined: a+b
date year 2024
Hi ADA
Hi stranger
TypeError: Cannot convert undefined or null to object
number
~~~

Example 2, user-defined type guards:

~~~text
Tom meow
Rex woof
1
AB
TypeError: value.toFixed is not a function
~~~

Example 3, narrowing and callbacks:

~~~text
DEFAULT
TypeError: input.toUpperCase is not a function
Report 1, Report 2
~~~

## 7. Newer: Inferred Type Predicates (5.5+)

Since TypeScript 5.5, a function with no return annotation, a single \`return\`, and a boolean result tied to a check on its parameter gets a type predicate inferred for it, so \`arr.filter((x) => x !== undefined)\` narrows without a hand-written guard ([TypeScript 5.5 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5)). This doc runs 5.4.5, which does not have it, so it was not verified here; the details are in [How does TypeScript 5.5 infer type predicates for \`Array.filter\` automatically?](/interview-question/how-does-typescript-5-5-infer-type-predicates-for-array-filter-automatically)

## Common Pitfalls

- **\`typeof x === "object"\` as a null check.** It keeps \`null\`; add \`&& x !== null\`.
- **Truthiness on numbers and strings.** \`if (count)\` skips \`0\`; \`if (name)\` skips \`""\`. Compare against \`undefined\` or \`null\` explicitly.
- **Returning \`boolean\` from a guard.** Without \`x is T\` the caller gets no narrowing at all.
- **Writing a guard that lies.** The body is not checked against the predicate; a wrong guard is a silent \`as\` cast that crashes later.
- **\`instanceof\` on interfaces or type aliases.** They do not exist at run time; use a discriminant or a predicate instead.
- **Expecting narrowing inside callbacks after a later assignment.** Copy the narrowed value into a \`const\` before the callback.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Narrowing</strong> is control-flow analysis: a variable has a declared type, and at each point the compiler computes a narrower current type from the checks, returns and assignments before it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Built-in guards:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code>, truthiness, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.isArray</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>, and discriminant checks like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.kind === "circle"</code>. Early returns narrow the rest of the function, and the else branch narrows the opposite way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Custom guards:</strong> <span style="color:#f0e2c8;">For my own types I write a <strong style="color:#ffca28;">type predicate</strong>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function isCat(p: Cat | Dog): p is Cat</code>. It returns a boolean at run time; the predicate tells the compiler what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> means, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter(isCat)</code> then gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cat[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof null</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"object"</code>, truthiness drops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>, and the compiler trusts a predicate blindly, so a wrong guard is as unsafe as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits and versions:</strong> <span style="color:#f0e2c8;">Narrowing is per location, so callbacks lose it if the variable can change later; 5.4 keeps it after the last assignment, and 5.5 infers simple predicates automatically.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a type guard and a type assertion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A guard is a real run-time check that the compiler follows, so the narrowed type is earned. An assertion (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x as Cat</code>) is just a claim with no check. A user-defined guard sits in between: the check is real, but the compiler trusts that your check matches the predicate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof x === "object"</code> not remove <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because JavaScript itself returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"object"</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof null</code>, and TypeScript models that faithfully. In 5.4.5 the branch type is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object | null</code>; you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp; x !== null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the false branch of a user-defined guard narrow to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The declared type minus the guarded type. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isCat(pet: Cat | Dog): pet is Cat</code>, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> branch sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog</code>. That is why a guard that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> for some cats is also a bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did narrowing disappear inside my callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The callback may run later, after the variable was reassigned. If there is an assignment after the closure is created (or the variable is a property of a mutable object), tsc drops the narrowing. Copy the narrowed value into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is an assertion function different from a type guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A guard returns a boolean and narrows inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>. An assertion function, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asserts x is T</code>, returns nothing and throws on failure, so the narrowing applies to all code after the call.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type narrowing | Refining a variable from its declared type to a more specific type at a point in the code |
| Control-flow analysis | The checker following branches, returns and assignments to compute each variable type per location |
| Type guard | A check the compiler understands as a test on a type, such as \`typeof\` or \`instanceof\` |
| Declared vs narrowed type | The annotated type versus the type the checker believes at a given line |
| Truthiness narrowing | Using \`if (x)\` as a guard; removes null and undefined but also falsy values |
| Type predicate | A return type \`param is Type\` that tells the checker what \`true\` means |
| User-defined type guard | A function whose return type is a type predicate |

**Conclusion:** Narrowing is how TypeScript makes unions usable: you declare a wide type, write ordinary JavaScript checks, and control-flow analysis gives you the precise type inside each branch. Know the built-in guards and their traps (\`typeof null\`, falsy values), write type predicates for your own shapes while remembering that the compiler trusts them blindly, and know where narrowing stops — callbacks after a later assignment — plus the two recent improvements, 5.4 closures and 5.5 inferred predicates. The sibling pages go deeper on the [\`in\` operator](/interview-question/how-does-the-in-operator-narrow-types), [discriminated unions](/interview-question/what-is-a-discriminated-union) and [exhaustiveness checking](/interview-question/how-do-you-do-exhaustiveness-checking).`,
    examples: [
      {
        label: `Built-in guards: typeof, equality, Array.isArray and early returns`,
        code: `// Built-in narrowing: typeof, truthiness, equality, instanceof, Array.isArray.
// Equal<A, B> is checked by tsc: each "const _: Equal<...> = true" line
// only compiles if the variable really has that type at that point.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

function describe(value: string | number | string[] | Date | null): string {
  if (value === null) {
    const _n: Equal<typeof value, null> = true;
    return "null";
  }
  // After the early return, null is gone from the type.
  const _rest: Equal<typeof value, string | number | string[] | Date> = true;

  if (typeof value === "string") {
    const _s: Equal<typeof value, string> = true;
    return "string of length " + value.length;
  }
  if (typeof value === "number") {
    return "number " + value.toFixed(1);
  }
  if (Array.isArray(value)) {
    const _a: Equal<typeof value, string[]> = true;
    return "array joined: " + value.join("+");
  }
  // Only Date is left, so instanceof is not even needed here.
  const _d: Equal<typeof value, Date> = true;
  return "date year " + value.getUTCFullYear();
}

console.log(describe(null));
console.log(describe("hello"));
console.log(describe(3.14159));
console.log(describe(["a", "b"]));
console.log(describe(new Date(Date.UTC(2024, 0, 1))));

// Truthiness narrowing removes null and undefined, but also "" and 0.
function greet(name?: string): string {
  if (name) {
    return "Hi " + name.toUpperCase();
  }
  const _u: Equal<typeof name, string | undefined> = true;
  return "Hi stranger";
}
console.log(greet("ada"));
console.log(greet(""));

// typeof null is "object": a typeof check alone does not remove null.
function keys(x: object | null | string): string {
  if (typeof x === "object") {
    const _o: Equal<typeof x, object | null> = true;
    // @ts-expect-error No overload matches this call (null is not an object).
    return Object.keys(x).join(",");
  }
  return "string";
}
try {
  keys(null);
} catch (err) {
  console.log(String(err));
}

// Assignment narrowing: the declared type is wide, the current type is narrow.
let id: string | number = "abc";
const _afterString: Equal<typeof id, string> = true;
id = 42;
const _afterNumber: Equal<typeof id, number> = true;
console.log(typeof id);`,
      },
      {
        label: `User-defined type guards with x is T, and a guard that lies`,
        code: `// User-defined type guards: a function whose return type is "x is T".
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Cat = { name: string; meow(): string };
type Dog = { name: string; bark(): string };

function isCat(pet: Cat | Dog): pet is Cat {
  return "meow" in pet;
}

const pets: (Cat | Dog)[] = [
  { name: "Tom", meow: () => "meow" },
  { name: "Rex", bark: () => "woof" },
];

for (const pet of pets) {
  if (isCat(pet)) {
    const _c: Equal<typeof pet, Cat> = true;
    console.log(pet.name, pet.meow());
  } else {
    // The false branch narrows too: Cat is removed.
    const _d: Equal<typeof pet, Dog> = true;
    console.log(pet.name, pet.bark());
  }
}

// A plain boolean return does NOT narrow anything at the call site.
function isCatBoolean(pet: Cat | Dog): boolean {
  return "meow" in pet;
}
const first = pets[0];
if (isCatBoolean(first)) {
  // @ts-expect-error Property 'meow' does not exist on type 'Cat | Dog'.
  first.meow();
}

// filter with a type guard gives a narrowed array type.
const cats = pets.filter(isCat);
const _cats: Equal<typeof cats, Cat[]> = true;
console.log(cats.length);

// Guarding unknown input.
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((item) => typeof item === "string");
}
const raw: unknown = JSON.parse('["a","b"]');
if (isStringArray(raw)) {
  console.log(raw.map((s) => s.toUpperCase()).join(""));
}

// The compiler trusts the predicate. A lying guard compiles fine...
function isNumberLie(x: unknown): x is number {
  return typeof x === "string";
}
const value: unknown = "not a number";
if (isNumberLie(value)) {
  try {
    console.log(value.toFixed(2));
  } catch (err) {
    // ...and crashes at run time.
    console.log(String(err));
  }
}`,
      },
      {
        label: `When narrowing survives into callbacks, and when it does not`,
        code: `// When narrowing survives into a callback, and when it does not.
// Narrowing inside callbacks (checked on TypeScript 5.4.5).
// No assignment after the closure is created: the narrowing survives.
function label(input: string | undefined) {
  if (input === undefined) input = "default";
  return () => input.toUpperCase();
}
console.log(label(undefined)());

// An assignment AFTER the closure is created: the narrowing is dropped.
function labelLate(input: string | number) {
  if (typeof input === "string") {
    // @ts-expect-error Property 'toUpperCase' does not exist on type 'string | number'.
    const read = () => input.toUpperCase();
    input = 0;
    return read;
  }
  return () => "number";
}
try {
  console.log(labelLate("x")());
} catch (err) {
  console.log(String(err));
}

// Property narrowing on a mutable object is not trusted inside a callback:
// the callback could run after someone sets settings.title back to undefined.
const settings: { title?: string } = { title: "Report" };
if (settings.title) {
  // @ts-expect-error 'settings.title' is possibly 'undefined'.
  [1, 2].forEach(() => settings.title.length);
  // Fix: copy the narrowed value into a const first.
  const title = settings.title;
  console.log([1, 2].map((n) => title + " " + n).join(", "));
}`,
      },
    ],
  },
  {
    title: `How does the 'in' operator narrow types?`,
    difficulty: "medium",
    seoDescription: `How "key" in obj narrows a union of object types, why optional keys stay in both branches, the 4.9 unknown-key rule and run-time gotchas.`,
    description: `**Question presented to candidate:**
"You have a \`Payment\` union where a card has \`cardNumber\` and a bank transfer has \`iban\`. How does \`if ('iban' in payment)\` narrow it, and what are the cases where the \`in\` operator surprises people?"

**What a strong answer should cover:**
- \`"key" in obj\` keeps the union members that declare \`key\` (required or optional) in the true branch and the members that do not declare it, or declare it optional, in the false branch
- An optional property keeps that member in both branches, so the property can still be \`undefined\`
- Since 4.9, a key that no member declares is added to the type as \`Record<"key", unknown>\`, which makes \`in\` useful on \`unknown\` / \`object\` input
- Run-time semantics: \`in\` walks the prototype chain (\`"toString" in {}\` is \`true\`) and throws on primitives; \`Object.hasOwn\` checks own properties only and does not narrow
- When to prefer a discriminant property over \`in\`, and why \`in\` is the right tool for unions you do not control

**Code / implementation expected:** Yes — a function that narrows a union of object types with \`in\`, ideally including an optional-property case.`,
    answer: `**Target Audience:** Developers who narrow unions of object types and want to know the exact rules of \`in\` narrowing, including the cases that differ between the type checker and the running code.
**Difficulty:** Medium
**TypeScript version:** Every narrowing result and error below was checked with TypeScript 5.4.5 and \`--strict\`; the 4.9 change is cited from its release notes.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full. The general idea of narrowing is covered in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards); this page is only about \`in\`.

## 1. Why This Even Matters — A Story First

At an airport, three kinds of people walk up to the desk: passengers with a boarding pass, crew with a staff badge, and visitors with nothing. The agent does not ask "what kind of person are you?" — they look for a thing only one group carries. A staff badge? Then this is crew, and the agent can ask for the crew roster. No badge? Then it is a passenger or a visitor.

Object types often work the same way. A \`Card\` has a \`cardNumber\`, a \`BankTransfer\` has an \`iban\`, a \`Voucher\` has a \`code\`. There is no shared "kind" field to compare. Asking "does this object have an \`iban\`?" is the natural check, and in JavaScript it is spelled \`"iban" in payment\`. TypeScript understands that question and narrows the union for you.

📌 **Interview term: \`in\` operator narrowing** — the compiler treating \`"key" in obj\` as a type guard: in the true branch, \`obj\` is narrowed to the union members that can have \`key\`; in the false branch, to the members that may lack it.

## 2. The Rule, Member by Member

For each member of the union, the compiler asks how that member declares \`key\`:

| Member declares \`key\` as... | True branch (\`"key" in obj\`) | False branch |
| :--- | :--- | :--- |
| required (\`iban: string\`) | kept | removed |
| optional (\`swim?: () => string\`) | kept | kept |
| not at all | removed | kept |
| not at all, in **any** member | added as \`Record<"key", unknown>\` (since 4.9) | unchanged |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="The in check splits a payment union into the bank transfer member and the remaining members">
  <defs>
    <marker id="q2arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="380" height="60" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">p: Card | BankTransfer | Voucher</text>
  <text class="d-sub" x="360" y="67" text-anchor="middle">check: iban in p</text>
  <rect class="d-box" x="30" y="180" width="260" height="60" rx="10"/>
  <text class="d-text" x="160" y="207" text-anchor="middle">true branch</text>
  <text class="d-sub" x="160" y="227" text-anchor="middle">p: BankTransfer</text>
  <rect class="d-box" x="430" y="180" width="260" height="60" rx="10"/>
  <text class="d-text" x="560" y="207" text-anchor="middle">false branch</text>
  <text class="d-sub" x="560" y="227" text-anchor="middle">p: Card | Voucher</text>
  <rect class="d-box-muted" x="430" y="280" width="260" height="60" rx="10"/>
  <text class="d-text" x="560" y="307" text-anchor="middle">next check: cardNumber in p</text>
  <text class="d-sub" x="560" y="327" text-anchor="middle">Card, else Voucher</text>
  <path class="d-edge" d="M 290 84 L 180 176" marker-end="url(#q2arrow)"/>
  <path class="d-edge" d="M 430 84 L 540 176" marker-end="url(#q2arrow)"/>
  <path class="d-edge-dashed" d="M 560 244 L 560 276" marker-end="url(#q2arrow)"/>
</svg>

Each \`in\` check removes members; chaining checks narrows down to a single member, which is what example 1 does.

Two consequences shown in example 1:

**A key shared by several members keeps all of them.** \`"expiry" in p\` is true for both \`Card\` and \`Voucher\`, and tsc confirms the branch type is \`Card | Voucher\`.

**An optional property keeps its member in both branches.** With \`type Duck = { fly(): string; swim?: () => string }\`, the true branch of \`"swim" in a\` is still \`Fish | Duck\`, and only the false branch is narrowed (to \`Duck\`). That is correct: a duck object may or may not have \`swim\`. In the true branch you still have to handle \`a.swim\` being undefined for the duck case.

📌 **Interview term: optional property** — a property marked \`?\` that may be missing from the object. Because "may be missing" also means "may be present", \`in\` cannot use it to rule a member out of the true branch.

## 3. \`in\` on Unknown Input (4.9+)

Before 4.9, \`in\` could only *filter* union members. If no member declared the key — typical for a value typed \`object\` or narrowed from \`unknown\` — the check did nothing useful. TypeScript 4.9 changed this: when no member lists the key, the type is intersected with \`Record<"key", unknown>\` ([TypeScript 4.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/)).

Example 2 checks it on 5.4.5: after \`typeof data === "object" && data !== null && "name" in data\`, tsc confirms the type is exactly \`object & Record<"name", unknown>\`. So \`data.name\` is readable, but it is \`unknown\`: you still need \`typeof data.name === "string"\` before using it as a string. This is the building block for parsing JSON by hand; the full pattern is in [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)

## 4. What \`in\` Does at Run Time

The type rule is only half the story; \`in\` is a JavaScript operator with its own semantics.

📌 **Interview term: prototype chain** — the chain of objects JavaScript searches when you read a property: the object itself, then its prototype, then that prototype's prototype. \`in\` searches the whole chain.

- **Inherited keys count.** In the run, \`"toString" in {}\` printed \`true\` while \`Object.hasOwn({}, "toString")\` printed \`false\`. A class getter lives on the prototype: \`"double" in pt\` was \`true\`, \`Object.hasOwn(pt, "double")\` was \`false\`. So a check on a common name like \`"toString"\` or \`"constructor"\` is true for nearly every object.
- **The right side must be an object.** \`"length" in "hello"\` throws \`TypeError: Cannot use 'in' operator to search for 'length' in hello\` (V8 wording). tsc catches it when the type may be a primitive:

~~~text
main.ts(51,22): error TS2322: Type 'string | { length: number; }' is not assignable to type 'object'.
  Type 'string' is not assignable to type 'object'.
~~~

- **\`Object.hasOwn\` does not narrow.** On 5.4.5, \`if (Object.hasOwn(v, "a")) v.a\` fails with \`TS2339: Property 'a' does not exist on type 'A | B'.\` The same check written with \`in\` narrows to \`A\`. If you need own-property semantics, wrap \`Object.hasOwn\` in your own type predicate.

📌 **Interview term: own property** — a property stored on the object itself rather than inherited from its prototype. \`Object.hasOwn(obj, key)\` (ES2022) tests for one; \`in\` does not distinguish.

## 5. \`in\` or a Discriminant?

| | \`"key" in obj\` | Discriminant \`obj.kind === "x"\` |
| :--- | :--- | :--- |
| Needs a shared tag field | No | Yes |
| Works on types you do not control (library types, DOM) | Yes | Only if they already have a tag |
| Optional keys | Keep the member in both branches | Not an issue |
| Reads well in \`switch\` | No | Yes, plus exhaustiveness checking |
| Run-time cost | Prototype-chain lookup | One property read and compare |

Use \`in\` when the shapes are already distinguished by which keys they have and you cannot add a tag. When you design the types yourself, a literal tag is usually clearer and enables exhaustiveness checks — see [What is a discriminated union?](/interview-question/what-is-a-discriminated-union) and [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim about the narrowed type, and every \`// @ts-expect-error\` line is a real error (messages quoted above, taken from a run with the directives removed). Then each example was run as the page runs it.

Example 1, narrowing a union of object types:

~~~text
card ending 1111
bank DE89370400440532013000
voucher SPRING
01/27
never expires
fish swims
duck flies
duck paddles
~~~

Example 2, unknown input, the prototype chain, \`hasOwn\` and primitives:

~~~text
codepad
name is not a string
no name
no name
true
false
true false
1
TypeError: Cannot use 'in' operator to search for 'length' in hello
~~~

## Common Pitfalls

- **Expecting an optional property to narrow.** \`"swim" in a\` keeps every member that declares \`swim?\`; check the value too.
- **Testing a key that exists on the prototype.** \`"toString" in x\` is true for almost every object. Pick a key that only one shape owns.
- **Using \`in\` on something that may be a primitive.** It throws at run time; narrow with \`typeof x === "object" && x !== null\` first.
- **Reaching for \`Object.hasOwn\` and losing narrowing.** It is correct at run time but is not a type guard; wrap it in an \`x is T\` function if you need both.
- **Forgetting that the 4.9 result is \`unknown\`.** \`"name" in data\` makes \`data.name\` readable, not typed; check it before use.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"key" in obj</code> is a type guard. In the true branch the union keeps members that declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code>; in the false branch it keeps members that do not declare it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optional keys:</strong> <span style="color:#f0e2c8;">A member with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key?</code> stays in <strong style="color:#ffca28;">both</strong> branches, because the property may or may not be there, so you still check the value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Unknown input:</strong> <span style="color:#f0e2c8;">Since 4.9, if no member declares the key, the type gains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;"key", unknown&gt;</code>, so after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof x === "object" &amp;&amp; x !== null &amp;&amp; "name" in x</code> I can read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x.name</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Run time:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> walks the prototype chain and throws on primitives. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn</code> checks own properties but does not narrow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use it:</strong> <span style="color:#f0e2c8;">Great for shapes I do not control. For my own types I prefer a literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind</code> tag, which reads well in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch</code> and supports exhaustiveness checks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my optional property still possibly undefined after an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">in</code> check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the member that declares it optionally stays in the true branch. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> proves the key exists on some member, not that this object has a value; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swim?: () =&gt; string</code>, 5.4.5 keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Fish | Duck</code> in the true branch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">in</code> in TypeScript 4.9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keys that no union member declares are no longer useless: the narrowed type becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T &amp; Record&lt;"key", unknown&gt;</code>. That makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> usable on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> or narrowed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> values, typically when validating JSON.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"key" in obj</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.key !== undefined</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> is true for a key that exists with the value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and for inherited keys. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!== undefined</code> is false in the first case. Pick the one that matches the data you expect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.hasOwn</code> not narrow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its declaration in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code> is a plain function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>, not a type predicate. In 5.4.5, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn(v, "a")</code> leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> as the full union. Wrap it in your own guard if you need own-property semantics and narrowing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">in</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I design the types myself: a discriminant like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind: "card"</code> is explicit, cannot be fooled by inherited keys, and gives exhaustiveness checking in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`in\` operator narrowing | Treating \`"key" in obj\` as a type guard that keeps or removes union members by their declared keys |
| Optional property | A \`?\` property that may be missing, which keeps its member in both branches of an \`in\` check |
| Prototype chain | The objects JavaScript searches for a property; \`in\` searches all of them |
| Own property | A property stored on the object itself; tested with \`Object.hasOwn\` |

**Conclusion:** The \`in\` operator narrows a union by the keys each member declares: required keys move a member into the true branch, missing keys into the false branch, and optional keys leave it in both. Since 4.9 it also adds unlisted keys as \`unknown\`, which makes it a tool for validating input. Remember that it is a real JavaScript operator — prototype chain included, primitives rejected — and that \`Object.hasOwn\` is not a guard. For types you own, a literal discriminant is usually the cleaner design.`,
    examples: [
      {
        label: `Narrowing a union of object types with in`,
        code: `// "key" in obj narrows a union to the members that can have that key.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Card = { cardNumber: string; expiry: string };
type BankTransfer = { iban: string };
type Voucher = { code: string; expiry: string };
type Payment = Card | BankTransfer | Voucher;

function describe(p: Payment): string {
  if ("iban" in p) {
    const _b: Equal<typeof p, BankTransfer> = true;
    return "bank " + p.iban;
  }
  // The false branch removes BankTransfer.
  const _rest: Equal<typeof p, Card | Voucher> = true;

  if ("cardNumber" in p) {
    return "card ending " + p.cardNumber.slice(-4);
  }
  return "voucher " + p.code;
}

console.log(describe({ cardNumber: "4111111111111111", expiry: "12/29" }));
console.log(describe({ iban: "DE89370400440532013000" }));
console.log(describe({ code: "SPRING", expiry: "05/26" }));

// A key that several members have keeps all of them.
function expiry(p: Payment): string {
  if ("expiry" in p) {
    const _e: Equal<typeof p, Card | Voucher> = true;
    return p.expiry;
  }
  return "never expires";
}
console.log(expiry({ code: "X", expiry: "01/27" }));
console.log(expiry({ iban: "GB00" }));

// An OPTIONAL property can be present or absent, so the member that
// declares it optionally stays in BOTH branches.
type Fish = { swim(): string };
type Duck = { fly(): string; swim?: () => string };

function move(a: Fish | Duck): string {
  if ("swim" in a) {
    const _yes: Equal<typeof a, Fish | Duck> = true;
    // So a.swim is still possibly undefined here for the Duck case.
    return a.swim ? a.swim() : "cannot tell";
  }
  const _no: Equal<typeof a, Duck> = true;
  return a.fly();
}
console.log(move({ swim: () => "fish swims" }));
console.log(move({ fly: () => "duck flies" }));
console.log(move({ fly: () => "duck flies", swim: () => "duck paddles" }));`,
      },
      {
        label: `Unknown input, the prototype chain, hasOwn and primitives`,
        code: `// The edges of "in": unknown input, the prototype chain, primitives, hasOwn.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A key no member declares: the type gains that key as unknown.
function readName(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) {
    const _t: Equal<typeof data, object & Record<"name", unknown>> = true;
    // data.name is unknown, so it still needs its own check.
    if (typeof data.name === "string") return data.name;
    return "name is not a string";
  }
  return "no name";
}
console.log(readName(JSON.parse('{"name":"codepad"}')));
console.log(readName(JSON.parse('{"name":42}')));
console.log(readName(JSON.parse("[1,2]")));
console.log(readName(null));

// 2. At run time "in" also looks at the prototype chain.
const plain = {};
console.log("toString" in plain); // true
console.log(Object.hasOwn(plain, "toString")); // false

class Point {
  constructor(public x: number) {}
  get double() {
    return this.x * 2;
  }
}
const pt = new Point(3);
// The getter lives on Point.prototype, not on the object itself.
console.log("double" in pt, Object.hasOwn(pt, "double"));

// 3. Object.hasOwn and hasOwnProperty do NOT narrow (TypeScript 5.4.5).
type A = { kind: "a"; a: number };
type B = { kind: "b"; b: string };
function pick(v: A | B): string {
  if (Object.hasOwn(v, "a")) {
    // @ts-expect-error Property 'a' does not exist on type 'A | B'.
    return String(v.a);
  }
  if ("a" in v) return "in narrowed to A: " + v.a;
  return v.b;
}
console.log(pick({ kind: "a", a: 1 }));

// 4. The right side must be an object. A primitive throws at run time,
// and tsc rejects a union that may contain one.
function size(x: string | { length: number }) {
  // @ts-expect-error Type 'string' is not assignable to type 'object'.
  return "length" in x ? x.length : -1;
}
try {
  size("hello");
} catch (err) {
  console.log(String(err));
}`,
      },
    ],
  },
  {
    title: `What is a discriminated union?`,
    difficulty: "medium",
    seoDescription: `A discriminated union is a union of object types with a shared literal tag; checking the tag narrows the object and rules out impossible states.`,
    description: `**Question presented to candidate:**
"What is a discriminated union in TypeScript? Model shapes, or a request that can be loading, successful or failed, and show how the compiler knows which fields are available in each case."

**What a strong answer should cover:**
- A union of object types that all share one property (the discriminant or tag) whose type is a different literal in each member
- Checking the tag (\`switch (s.kind)\`, \`if (r.ok)\`) narrows the whole object, so member-specific fields become available
- Why it is better than one object with many optional fields: impossible states cannot be written, and excess-property checks reject mixed objects
- The tag must be a literal type (string, number, boolean literal, \`undefined\`); a plain \`string\` tag narrows nothing
- Narrowing also works through destructured tags and checks stored in a \`const\` (4.4 / 4.6), and the pattern enables exhaustiveness checking
- Typical uses: reducer actions, \`Result\` types, API response states, AST nodes

**Code / implementation expected:** Yes — define a small discriminated union and a function that switches on the tag.`,
    answer: `**Target Audience:** Developers who model state, events or API results and want the most useful pattern in everyday TypeScript explained from first principles.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`; the 4.4 and 4.6 improvements are cited from their release notes.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A coffee shop hands you a buzzer. When it lights up, the screen shows one of three words: **READY**, **DELAYED** or **SOLD OUT**. Each word comes with different information: READY tells you the counter number, DELAYED tells you how many minutes, SOLD OUT suggests an alternative. You read the word first, and the word tells you which other information to look for. Nobody looks for a counter number on a SOLD OUT message.

A discriminated union is that buzzer, as a type. Every variant carries a small label — the same field name in every variant, a different fixed value in each — and the label tells the compiler (and the reader) which other fields exist.

📌 **Interview term: discriminated union** (also *tagged union* or *sum type*) — a union of object types where every member has a common property whose type is a distinct literal in each member. Checking that property narrows the value to one member.

📌 **Interview term: discriminant** (also *tag*) — the shared property, such as \`kind\`, \`type\` or \`ok\`. Its type in each member is a literal type like \`"circle"\` or \`true\`, not a general type like \`string\`. Literal types are explained in [What are literal types?](/interview-question/what-are-literal-types)

## 2. The Shape of the Pattern

~~~ts
type Circle = { kind: "circle"; radius: number };
type Rect = { kind: "rect"; width: number; height: number };
type Triangle = { kind: "triangle"; base: number; height: number };
type Shape = Circle | Rect | Triangle;
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Switching on the kind tag narrows a Shape to Circle, Rect or Triangle">
  <defs>
    <marker id="q3arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="230" y="20" width="260" height="60" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">s: Shape</text>
  <text class="d-sub" x="360" y="67" text-anchor="middle">switch on s.kind</text>
  <rect class="d-box" x="20" y="200" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">case circle</text>
  <text class="d-sub" x="120" y="255" text-anchor="middle">s.radius</text>
  <rect class="d-box" x="260" y="200" width="200" height="80" rx="10"/>
  <text class="d-text" x="360" y="230" text-anchor="middle">case rect</text>
  <text class="d-sub" x="360" y="255" text-anchor="middle">s.width, s.height</text>
  <rect class="d-box" x="500" y="200" width="200" height="80" rx="10"/>
  <text class="d-text" x="600" y="230" text-anchor="middle">case triangle</text>
  <text class="d-sub" x="600" y="255" text-anchor="middle">s.base, s.height</text>
  <path class="d-edge" d="M 300 84 L 140 196" marker-end="url(#q3arrow)"/>
  <path class="d-edge" d="M 360 84 L 360 196" marker-end="url(#q3arrow)"/>
  <path class="d-edge" d="M 420 84 L 580 196" marker-end="url(#q3arrow)"/>
</svg>

Inside each \`case\`, only the fields of that member are available; in example 1, tsc confirms the \`"circle"\` case sees exactly \`Circle\`.

Before the tag is checked, only the fields common to all members are available. Example 1 tries \`s.radius\` on a \`Shape\` and gets:

~~~text
main.ts(37,15): error TS2339: Property 'radius' does not exist on type 'Shape'.
  Property 'radius' does not exist on type 'Rect'.
~~~

After \`s.kind === "circle"\`, the same read is fine. This is narrowing by a discriminant — one of the type guards listed in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)

## 3. Why Not One Object with Optional Fields?

The alternative many people start with:

~~~ts
type ShapeLoose = { kind: string; radius?: number; width?: number; height?: number; base?: number };
~~~

It accepts \`{ kind: "circle", width: 2 }\` — a circle with a width and no radius — and every read of \`radius\` is \`number | undefined\`, so you end up writing \`!\` everywhere. The discriminated union rules that object out at compile time. In example 1, \`const bad: Shape = { kind: "circle", width: 2 }\` fails with:

~~~text
main.ts(31,38): error TS2353: Object literal may only specify known properties, and 'width' does not exist in type 'Circle'.
~~~

Notice how precise that is: the compiler used the tag to pick \`Circle\` and then reported the extra field against \`Circle\`, not against the whole union.

📌 **Interview term: make illegal states unrepresentable** — design the types so that combinations that make no sense (a circle with a width, a successful request with an error message) cannot be written at all, instead of checking for them at run time.

## 4. The Everyday Uses

**A \`Result\` type.** Success and failure carry different data, and a boolean tag is enough:

~~~ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
~~~

In example 1, \`if (r.ok)\` narrows to the success member (\`r.value\` is available), and the \`else\` branch has \`r.error\`. The run printed \`value 43\` and \`error not an age: abc\`.

**Reducer actions.** Example 2 models \`{ type: "add"; payload: number } | { type: "rename"; payload: string } | { type: "reset" }\`. Inside \`case "add"\`, \`action.payload\` is a \`number\`; inside \`case "rename"\`, it is a \`string\` and \`.trim()\` is allowed; \`"reset"\` has no payload at all. The run ends with \`{"total":15,"name":"budget"}\`.

**Request state.** \`{ loading: true } | { loading: false; data: string[] }\` — \`f.loading ? "spinner" : f.data.join(",")\` compiles because the false branch is the member that has \`data\`.

## 5. What Counts as a Discriminant

- **Literal types only.** String, number and boolean literals, and \`undefined\`/\`null\`, can discriminate. In example 2, a union whose members both have \`kind: string\` does not narrow at all: after \`s.kind === "circle"\`, \`s.radius\` is still an error:

~~~text
main.ts(61,14): error TS2339: Property 'radius' does not exist on type 'Loose'.
  Property 'radius' does not exist on type '{ kind: string; side: number; }'.
~~~

- **Destructured tags still narrow.** \`const { type, payload } = msg; if (type === "num") payload.toFixed(2)\` compiles on 5.4.5, and tsc confirms \`payload\` is \`number\` there. This works when the bindings come from a \`const\` declaration or a parameter that is never reassigned, added in TypeScript 4.6 ([TypeScript 4.6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html), [InfoWorld](https://www.infoworld.com/article/3647880/typescript-46-adds-control-flow-analysis-es2022-support.html)).
- **A check stored in a \`const\` still narrows.** \`const isNum = msg.type === "num"; if (isNum) msg.payload\` sees the \`"num"\` member. That aliasing of conditions arrived in TypeScript 4.4 ([TypeScript 4.4 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-4/)).

📌 **Interview term: aliased condition** — a type-guard expression saved in a \`const\` and used later in an \`if\`. Since 4.4 the compiler follows it, as long as the guarded value is a \`const\`, a \`readonly\` property or a parameter that is not reassigned.

## 6. The Payoff: Exhaustiveness

Because the set of tags is closed, the compiler knows when a \`switch\` has handled every case. In example 1, \`area\` has a declared return type of \`number\`, three \`case\` branches and no \`default\` — and it compiles, because tsc can see that no path falls off the end. Add a fourth shape and forget a case, and the same function becomes an error. Turning that into a reliable safety net is its own topic: [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)

## 7. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, shapes and a \`Result\` type:

~~~text
circle 3.14
rect 6.00
triangle 10.00
circle
1 0
value 43
error not an age: abc
~~~

The \`circle\` line comes from \`bad.kind\`: the \`@ts-expect-error\` silences the compile error, but the object still exists at run time — types are erased, so the "impossible" object is only impossible for code that compiles cleanly.

Example 2, reducer, destructuring, aliased checks and literal tags:

~~~text
{"total":15,"name":"budget"}
{"total":0,"name":"untitled"}
3.00 HI
number 1
2
spinner a,b
~~~

## 8. Discriminated Union vs Alternatives

| Approach | Narrowing | Impossible states | Exhaustiveness | Best for |
| :--- | :--- | :--- | :--- | :--- |
| Discriminated union | One property compare | Rejected | Yes | Types you design |
| \`in\` checks | By key presence | Rejected if keys differ | Awkward | Types you do not control — see [How does the 'in' operator narrow types?](/interview-question/how-does-the-in-operator-narrow-types) |
| Class hierarchy + \`instanceof\` | By constructor | Rejected | No | Behaviour attached to data |
| One object with optional fields | None | Allowed | No | Rarely the right choice |

## Common Pitfalls

- **Typing the tag as \`string\`.** \`kind: string\` in each member narrows nothing; use literal types.
- **Widening the tag when building objects.** \`const s = { kind: "circle", radius: 1 }\` without an annotation infers \`kind: string\`, and passing it as a \`Shape\` fails. Annotate (\`const s: Shape = ...\`) or use \`as const\`/\`satisfies\`.
- **Different tag names per member.** \`{ kind: "a" } | { type: "b" }\` is not discriminated by either name; use one shared property.
- **Destructuring with \`let\`.** Narrowing through destructured bindings needs \`const\` (or an unchanged parameter).
- **Trusting external data.** JSON with an unknown tag still reaches your code at run time; validate it, and let a \`default\` branch throw.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">discriminated union</strong> is a union of object types that share one property, the <strong style="color:#ffca28;">discriminant</strong>, whose type is a different literal in each member, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind: "circle"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind: "rect"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it narrows:</strong> <span style="color:#f0e2c8;">Checking the tag, in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch (s.kind)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (r.ok)</code>, narrows the whole object, so inside each case only that member fields are available.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it wins:</strong> <span style="color:#f0e2c8;">It makes illegal states unrepresentable: no circle with a width, no success with an error. Compare that with one object full of optional fields and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> everywhere.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules:</strong> <span style="color:#f0e2c8;">The tag must be a literal type; string, number and boolean literals all work. Since 4.4 and 4.6, aliased checks in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> and destructured tags still narrow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Payoff:</strong> <span style="color:#f0e2c8;">Because the set of tags is closed, the compiler can check that a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch</code> handles every case: exhaustiveness checking with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a boolean be a discriminant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ok: true; value: T } | { ok: false; error: string }</code> is the classic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Result</code> type; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (r.ok)</code> narrows to the success member and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> branch has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the tag is typed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string</code> instead of a literal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing narrows. In 5.4.5, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.kind === "circle"</code> on a union whose members both have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kind: string</code>, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.radius</code> still fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2339</code>, because both members can have that kind.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my object literal fail to match the union?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually the tag was widened to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> when the object was created without an annotation, or the literal has a field that does not belong to the member its tag picked; the error then names that member, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'width' does not exist in type 'Circle'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does destructuring break narrowing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not since 4.6, as long as the bindings come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> or an unchanged parameter: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const { type, payload } = msg; if (type === "num")</code> narrows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from a class hierarchy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The union is plain data, works across JSON and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">postMessage</code>, and the compiler knows the full list of cases. A class hierarchy is open: anyone can add a subclass, so the compiler cannot check that you handled them all.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Discriminated union | A union of object types that share a literal-typed property used to tell them apart |
| Discriminant (tag) | The shared property, such as \`kind\` or \`ok\`, with a different literal type in each member |
| Make illegal states unrepresentable | Designing types so that meaningless combinations cannot be written |
| Aliased condition | A guard saved in a \`const\` and used later; still narrows since 4.4 |

**Conclusion:** A discriminated union gives every variant the same tag field with a different literal value, and checking that tag narrows the object to exactly one variant. It replaces bags of optional fields with types where impossible states cannot be written, it reads naturally in a \`switch\`, and because the list of tags is closed it is the foundation for exhaustiveness checking. Keep the tag a literal type, annotate objects so the tag does not widen, and validate tags that come from outside your program.`,
    examples: [
      {
        label: `Shapes and a Result type: narrowing by a literal tag`,
        code: `// A discriminated union: every member has the same literal-typed "kind" field.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Circle = { kind: "circle"; radius: number };
type Rect = { kind: "rect"; width: number; height: number };
type Triangle = { kind: "triangle"; base: number; height: number };
type Shape = Circle | Rect | Triangle;

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": {
      const _c: Equal<typeof s, Circle> = true;
      return Math.PI * s.radius ** 2;
    }
    case "rect":
      return s.width * s.height;
    case "triangle":
      return (s.base * s.height) / 2;
  }
}

const shapes: Shape[] = [
  { kind: "circle", radius: 1 },
  { kind: "rect", width: 2, height: 3 },
  { kind: "triangle", base: 4, height: 5 },
];
for (const s of shapes) console.log(s.kind, area(s).toFixed(2));

// The union makes impossible objects impossible to write.
// @ts-expect-error Object literal may only specify known properties.
const bad: Shape = { kind: "circle", width: 2 };
console.log(bad.kind);

// Reading a property that only some members have is an error until you narrow.
function radiusOf(s: Shape): number {
  // @ts-expect-error Property 'radius' does not exist on type 'Shape'.
  const r = s.radius;
  return s.kind === "circle" ? s.radius : 0;
}
console.log(radiusOf(shapes[0]), radiusOf(shapes[1]));

// The classic use: a result type where success and failure carry different data.
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function parseAge(text: string): Result<number> {
  const n = Number(text);
  if (Number.isInteger(n) && n >= 0) return { ok: true, value: n };
  return { ok: false, error: "not an age: " + text };
}

for (const input of ["42", "abc"]) {
  const r = parseAge(input);
  if (r.ok) {
    console.log("value", r.value + 1);
  } else {
    console.log("error", r.error);
  }
}`,
      },
      {
        label: `Reducer actions, destructured tags and literal-only discriminants`,
        code: `// Discriminated unions in a reducer, destructuring, aliased checks,
// and why the tag has to be a literal type.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Action =
  | { type: "add"; payload: number }
  | { type: "rename"; payload: string }
  | { type: "reset" };

type State = { total: number; name: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { ...state, total: state.total + action.payload };
    case "rename":
      return { ...state, name: action.payload.trim() };
    case "reset":
      return { total: 0, name: "untitled" };
  }
}

const actions: Action[] = [
  { type: "add", payload: 5 },
  { type: "add", payload: 10 },
  { type: "rename", payload: "  budget  " },
];
let state: State = { total: 0, name: "untitled" };
for (const a of actions) state = reducer(state, a);
console.log(JSON.stringify(state));
console.log(JSON.stringify(reducer(state, { type: "reset" })));

// Destructured tag and payload from a const: checking one narrows the other.
type Msg = { type: "num"; payload: number } | { type: "str"; payload: string };
function render(msg: Msg): string {
  const { type, payload } = msg;
  if (type === "num") {
    const _p: Equal<typeof payload, number> = true;
    return payload.toFixed(2);
  }
  return payload.toUpperCase();
}
console.log(render({ type: "num", payload: 3 }), render({ type: "str", payload: "hi" }));

// A check stored in a const still narrows the original object.
function render2(msg: Msg): string {
  const isNum = msg.type === "num";
  if (isNum) {
    const _m: Equal<typeof msg, { type: "num"; payload: number }> = true;
    return "number " + msg.payload;
  }
  return "string " + msg.payload;
}
console.log(render2({ type: "num", payload: 1 }));

// The tag must be a literal type. With kind: string, the check narrows nothing.
type Loose = { kind: string; radius: number } | { kind: string; side: number };
function looseArea(s: Loose): number {
  if (s.kind === "circle") {
    // @ts-expect-error Property 'radius' does not exist on type 'Loose'.
    return s.radius;
  }
  return 0;
}
console.log(looseArea({ kind: "circle", radius: 2 }));

// Booleans and undefined work as tags too.
type Fetch = { loading: true } | { loading: false; data: string[] };
function view(f: Fetch): string {
  return f.loading ? "spinner" : f.data.join(",");
}
console.log(view({ loading: true }), view({ loading: false, data: ["a", "b"] }));`,
      },
    ],
  },
  {
    title: `How do you do exhaustiveness checking?`,
    difficulty: "medium",
    seoDescription: `Make TypeScript flag every switch that misses a union member: assertNever, satisfies never, Record lookup tables and return-type checks.`,
    description: `**Question presented to candidate:**
"A teammate adds a new status to a union type, and three \`switch\` statements across the codebase silently stop handling it. How would you make the compiler catch that the next time?"

**What a strong answer should cover:**
- Exhaustiveness checking: once every member of a union is handled, the narrowed type in the remaining branch is \`never\`, and code that requires \`never\` stops compiling when a member is left over
- The \`assertNever(x: never): never\` helper in \`default\`, which also throws at run time for data that escaped the type system
- \`x satisfies never\` (4.9+) as a helper-free compile-time check, and a declared return type with no \`default\` (\`TS2366\`) as a weaker check
- \`Record<Union, T>\` lookup tables, which force every key to be present
- The error messages name the forgotten member, which makes the fix obvious; the check works on literal unions and discriminated unions alike
- Trade-offs: run-time safety for external data, and why a \`default\` that returns a fallback value defeats the check

**Code / implementation expected:** Yes — a \`switch\` over a union with an \`assertNever\` default, and the error you get after adding a member.`,
    answer: `**Target Audience:** Developers who \`switch\` over unions and want the compiler to flag every place that must change when a new variant is added.
**Difficulty:** Medium
**TypeScript version:** Every error message below was produced by TypeScript 5.4.5 with \`--strict\`; the \`satisfies\` version fact is cited from the 4.9 release notes.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A pilot runs a checklist before take-off. The point of a checklist is not the items you remember; it is the item you would have forgotten. Now imagine the airline adds a new item to the checklist, and the printed copies in half the cockpits are never updated. Those pilots will happily finish "the whole list" without the new item.

A \`switch\` over a union is a checklist. When someone adds \`"cancelled"\` to \`type Status = "idle" | "loading" | "success" | "error"\`, every \`switch (status)\` in the codebase is an old printed copy. Without help, they all still compile — the new value just falls through to whatever the \`default\` does, or makes the function return \`undefined\`. Exhaustiveness checking makes the compiler hand you a fresh copy of the checklist at every one of those places.

📌 **Interview term: exhaustiveness checking** — a compile-time check that every member of a union has been handled, so adding a member turns every incomplete \`switch\` or \`if\` chain into a compile error.

## 2. The Trick: What Is Left Over Is \`never\`

As each \`case\` handles a member, narrowing removes it from the type. After the last member has been handled, nothing is left: the type in the \`default\` branch is \`never\`, the empty type (explained from first principles in [What is the never type?](/interview-question/what-is-the-never-type)).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 380" role="img" aria-label="Each case removes a member from the union until only never is left in default">
  <defs>
    <marker id="q4arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="20" width="400" height="56" rx="10"/>
  <text class="d-text" x="360" y="54" text-anchor="middle">idle | loading | success | error</text>
  <rect class="d-box" x="200" y="116" width="320" height="56" rx="10"/>
  <text class="d-text" x="360" y="150" text-anchor="middle">after case idle: three left</text>
  <rect class="d-box" x="200" y="212" width="320" height="56" rx="10"/>
  <text class="d-text" x="360" y="246" text-anchor="middle">after all four cases</text>
  <rect class="d-box-muted" x="260" y="308" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="342" text-anchor="middle">default: never</text>
  <path class="d-edge" d="M 360 80 L 360 112" marker-end="url(#q4arrow)"/>
  <path class="d-edge-dashed" d="M 360 176 L 360 208" marker-end="url(#q4arrow)"/>
  <path class="d-edge" d="M 360 272 L 360 304" marker-end="url(#q4arrow)"/>
</svg>

When every case is handled, nothing reaches \`default\` and its type is \`never\`; when one is forgotten, that member is what reaches it.

So if the \`default\` branch contains code that **only compiles when given \`never\`**, the check is done: a forgotten member reaches \`default\`, it is not \`never\`, and the compiler complains — naming the member.

📌 **Interview term: never (bottom type)** — the type with no values. Only \`never\` can be assigned to \`never\`, which is what makes it usable as a "nothing should be left" assertion.

## 3. Technique 1: \`assertNever\`

~~~ts
function assertNever(x: never): never {
  throw new Error("Unhandled value: " + JSON.stringify(x));
}

switch (s) {
  case "idle": return "Waiting";
  case "loading": return "Loading...";
  case "success": return "Done";
  case "error": return "Failed";
  default: return assertNever(s);
}
~~~

In example 1, \`Status2\` adds \`"cancelled"\` and \`label2\` does not handle it. tsc confirms (with \`Equal\`) that the type of \`s\` in \`default\` is exactly \`"cancelled"\`, and the call is rejected:

~~~text
main.ts(41,26): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
~~~

Note the wording on 5.4.5: for a string literal left over, the message says \`'string'\`, even though tsc confirmed the leftover type is \`"cancelled"\`. For object members the message is more helpful — in example 2 a forgotten triangle gives:

~~~text
main.ts(16,22): error TS2345: Argument of type '{ kind: "triangle"; base: number; height: number; }' is not assignable to parameter of type 'never'.
~~~

The second half of \`assertNever\` — the \`throw\` — matters at run time. Types are erased, so a value from outside the type system (an API that started sending \`"paused"\`, an old mobile client, a typo in a database row) still reaches \`default\`. In the run, \`label(JSON.parse('"paused"') as Status)\` printed \`Error: Unhandled value: "paused"\` instead of silently returning \`undefined\`.

📌 **Interview term: assertNever** — the common name for a function whose parameter is typed \`never\` and that throws if it is ever actually called. It gives a compile-time exhaustiveness check and a run-time failure for impossible values in one line.

## 4. Technique 2: \`satisfies never\`

~~~ts
default:
  s satisfies never;
  throw new Error("unreachable");
~~~

The \`satisfies\` operator (TypeScript 4.9, [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/)) checks that an expression matches a type without changing it. \`s satisfies never\` therefore fails whenever anything is left over, with no helper function to import. Example 2 shows its message:

~~~text
main.ts(34,9): error TS1360: Type '{ kind: "triangle"; base: number; height: number; }' does not satisfy the expected type 'never'.
~~~

It does nothing at run time, so add the \`throw\` yourself if external data can reach this code. In example 2's \`perimeter\`, which returns \`NaN\` after the check, the unhandled triangle printed \`NaN\` — no crash, but a wrong answer. More on the operator: [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)

## 5. Technique 3: A Declared Return Type and No \`default\`

If a function declares a return type that does not include \`undefined\` and its \`switch\` has no \`default\`, a missing case means control can fall off the end. In example 2, \`sides(k: Kind): number\` handles \`"circle"\` and \`"square"\` only:

~~~text
main.ts(50,26): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
~~~

This needs no helper, but it is weaker: it only works when every case returns, it says nothing about *which* member is missing, and it does nothing for \`switch\` statements that do not return. At run time, the missing case silently returned \`undefined\`.

## 6. Technique 4: \`Record<Union, T>\` Lookup Tables

Often the cleanest fix is no \`switch\` at all:

~~~ts
const names: Record<Kind, string> = { circle: "Circle", square: "Square", triangle: "Triangle" };
~~~

\`Record<Kind, string>\` requires every key of the union. Leaving one out fails:

~~~text
main.ts(43,7): error TS2741: Property 'triangle' is missing in type '{ circle: string; square: string; }' but required in type 'Record<"circle" | "square" | "triangle", string>'.
~~~

Background: [What is the Record utility type?](/interview-question/what-is-the-record-utility-type)

## 7. Which One to Use

| Technique | Names the missing member | Run-time protection | Needs a helper | Works for |
| :--- | :--- | :--- | :--- | :--- |
| \`assertNever(x)\` in \`default\` | Yes | Yes, throws | Yes | \`switch\`, \`if\` chains |
| \`x satisfies never\` | Yes | No (add a \`throw\`) | No | \`switch\`, \`if\` chains, TS 4.9+ |
| Return type, no \`default\` | No | No, returns \`undefined\` | No | Functions where every case returns |
| \`Record<Union, T>\` | Yes | Only if keys come from the union | No | Mapping a value per member |

A sensible default for application code: \`assertNever\` in \`default\` for logic, \`Record<Union, T>\` for plain mappings.

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5. Each \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed), and the \`Equal\` line in example 1 proves what reaches \`default\`. Then each example was run as the page runs it.

Example 1, \`assertNever\` and \`satisfies never\` on a string union:

~~~text
Waiting | Loading... | Done | Failed
busy-ish
Error: Unhandled value: "paused"
v
~~~

Example 2, object unions, \`Record\` tables and the return-type check:

~~~text
9
Error: Unhandled shape: {"kind":"triangle","base":2,"height":2}
NaN
3 Circle
undefined
~~~

The second and last lines show what the compile errors were protecting against: with the error silenced, the forgotten triangle reaches \`assertNever\` and throws, and the \`sides\` function quietly returns \`undefined\`.

## Common Pitfalls

- **A \`default\` that returns a fallback value.** \`default: return "Unknown"\` handles every future member silently, so the compiler can never warn you. Keep \`default\` for the \`never\` check.
- **Typing the helper parameter as \`any\` or \`unknown\`.** \`assertNever(x: unknown)\` accepts everything and checks nothing; the parameter must be \`never\`.
- **Relying on \`satisfies never\` for external data.** It is compile-time only; add a \`throw\`.
- **Switching on a widened type.** If the value is typed \`string\` instead of the union, nothing ever narrows to \`never\`; make sure the switch subject has the union type.
- **Exhaustive on paper, not in data.** A JSON value with a new tag still reaches \`default\` at run time. The throw in \`assertNever\` is your alarm; log it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Narrowing removes each handled member from the union, so after the last <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case</code> the leftover type is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. If the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default</code> branch requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>, any forgotten member is a compile error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The standard tool:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function assertNever(x: never): never { throw ... }</code>, called as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default: return assertNever(s)</code>. The error names the leftover member, and at run time it throws for values that escaped the types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternatives:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s satisfies never</code> since 4.9 needs no helper but does nothing at run time; a declared return type with no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2366</code> but does not say which case is missing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mappings:</strong> <span style="color:#f0e2c8;">For per-member data I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;Status, string&gt;</code>, which fails to compile when a key is missing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rule:</strong> <span style="color:#f0e2c8;">Never give such a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default</code> a fallback return, because that silently swallows every future member.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">assertNever</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code> as well as take it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So it can be used as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return assertNever(s)</code> in a function that must return, say, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is assignable to every type. The return type also documents that the function never returns normally, because it always throws.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would the code ever reach <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">assertNever</code> at run time if it type-checks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Types are erased. Data from JSON, a database or an older client can contain a value the union does not list, or a cast like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as Status</code> can lie. Throwing there turns a silent wrong answer into a visible error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does exhaustiveness checking work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">else</code> chains?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (s.kind === "x") return ...</code> narrows the rest of the function, so after the last one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertNever(s)</code> checks it, exactly as in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switch</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the error look like when a member is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 5.4.5 and a discriminated union: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Argument of type '{ kind: "triangle"; base: number; height: number; }' is not assignable to parameter of type 'never'.</code> It names the member you forgot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">noFallthroughCasesInSwitch</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Different problem. That flag catches a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case</code> that falls into the next one by accident; it does not check that every union member has a case. Exhaustiveness still needs the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> check.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Exhaustiveness checking | A compile-time check that every member of a union is handled |
| never (bottom type) | The type with no values; only \`never\` is assignable to it |
| assertNever | A helper with a \`never\` parameter that throws if it is ever called |

**Conclusion:** Exhaustiveness checking turns "we added a variant and forgot a switch" from a production bug into a compile error. It works because narrowing removes each handled member until only \`never\` is left, so code that demands \`never\` — \`assertNever\`, \`satisfies never\`, a \`Record\` keyed by the union, or a declared return type — fails exactly where a case is missing. Prefer \`assertNever\` for logic because it also throws at run time for data that escaped the type system, and never let a catch-all \`default\` return a fallback.`,
    examples: [
      {
        label: `assertNever and satisfies never on a string union`,
        code: `// Exhaustiveness checking: make the compiler tell you about a case you forgot.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Status = "idle" | "loading" | "success" | "error";

// Technique 1: assertNever. Only "never" fits the parameter, so this call
// compiles only when every member has been handled above it.
function assertNever(x: never): never {
  throw new Error("Unhandled value: " + JSON.stringify(x));
}

function label(s: Status): string {
  switch (s) {
    case "idle":
      return "Waiting";
    case "loading":
      return "Loading...";
    case "success":
      return "Done";
    case "error":
      return "Failed";
    default:
      return assertNever(s);
  }
}
console.log(["idle", "loading", "success", "error"].map((s) => label(s as Status)).join(" | "));

// Someone adds "cancelled" to the union and forgets one switch:
type Status2 = Status | "cancelled";
function label2(s: Status2): string {
  switch (s) {
    case "idle":
    case "loading":
      return "busy-ish";
    case "success":
    case "error":
      return "finished";
    default: {
      // tsc confirms what is left over in default:
      const _left: Equal<typeof s, "cancelled"> = true;
      // @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'never'.
      return assertNever(s);
    }
  }
}
console.log(label2("idle"));

// Data from outside the type system (JSON, an old client) reaches default
// at run time, and assertNever turns it into a clear error.
const fromServer = JSON.parse('"paused"') as Status;
try {
  label(fromServer);
} catch (err) {
  console.log(String(err));
}

// Technique 2: "satisfies never" in default: no helper, no run-time throw.
function icon(s: Status): string {
  switch (s) {
    case "idle":
      return "o";
    case "loading":
      return "~";
    case "success":
      return "v";
    case "error":
      return "x";
    default:
      s satisfies never;
      throw new Error("unreachable");
  }
}
console.log(icon("success"));`,
      },
      {
        label: `Object unions, Record lookup tables and the return-type check`,
        code: `// Exhaustiveness with object unions, lookup tables and if/else chains.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function assertNever(x: never): never {
  throw new Error("Unhandled shape: " + JSON.stringify(x));
}

// triangle is forgotten here: the leftover member is named in the error.
function area(s: Shape): number {
  if (s.kind === "circle") return Math.PI * s.radius ** 2;
  if (s.kind === "square") return s.side ** 2;
  // @ts-expect-error Argument of type '{ kind: "triangle"; base: number; height: number; }' is not assignable to parameter of type 'never'.
  return assertNever(s);
}
try {
  console.log(area({ kind: "square", side: 3 }));
  console.log(area({ kind: "triangle", base: 2, height: 2 }));
} catch (err) {
  console.log(String(err));
}

// satisfies never reports the same kind of error, with no helper function.
function perimeter(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return 2 * Math.PI * s.radius;
    case "square":
      return 4 * s.side;
    default:
      // @ts-expect-error Type '{ kind: "triangle"; base: number; height: number; }' does not satisfy the expected type 'never'.
      s satisfies never;
      return NaN;
  }
}
console.log(perimeter({ kind: "triangle", base: 1, height: 1 }));

// A lookup table typed as Record<Union, ...> must list every key.
type Kind = Shape["kind"];
// @ts-expect-error Property 'triangle' is missing in type '{ circle: string; square: string; }'.
const names: Record<Kind, string> = { circle: "Circle", square: "Square" };
const fullNames: Record<Kind, string> = { circle: "Circle", square: "Square", triangle: "Triangle" };
console.log(Object.keys(fullNames).length, names.circle);

// A declared return type and no default: if a case is missing, the
// function can fall off the end, and tsc reports it.
// @ts-expect-error Function lacks ending return statement and return type does not include 'undefined'.
function sides(k: Kind): number {
  switch (k) {
    case "circle":
      return 0;
    case "square":
      return 4;
  }
}
// At run time the missing case silently returns undefined.
console.log(String(sides("triangle")));`,
      },
    ],
  },
  {
    title: `What is the never type?`,
    difficulty: "medium",
    seoDescription: `never is the TypeScript bottom type with no values: where it appears, why it vanishes from unions, and how Exclude and exhaustiveness checks use it.`,
    description: `**Question presented to candidate:**
"What is the \`never\` type in TypeScript? Where does it show up on its own, and where would you write it deliberately?"

**What a strong answer should cover:**
- \`never\` is the bottom type: the type with no values. It is assignable to every type, and nothing (not even \`any\` or \`unknown\` values) is assignable to it
- Where it appears by itself: functions that cannot return normally, branches where narrowing has removed every member, impossible intersections like \`string & number\`, and \`[]\` inside an object literal (\`never[]\`)
- Algebra: \`T | never\` is \`T\`; a conditional type maps members to \`never\` to drop them (how \`Exclude\` works); key filtering with mapped types
- Deliberate uses: exhaustiveness checks, forbidding a property with \`prop?: never\`
- Traps: a distributive conditional over \`never\` gives \`never\`, so \`IsNever\` needs \`[T] extends [never]\`; \`never\` vs \`void\` vs \`unknown\`

**Code / implementation expected:** Optional — a few type-level checks, or an exhaustiveness helper.`,
    answer: `**Target Audience:** Developers who have seen \`never\` in error messages and utility types and want to understand what it is and how to use it on purpose.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; that \`never\` arrived in TypeScript 2.0 is cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

Think of types as boxes of allowed values. \`boolean\` is a box with two things in it, \`true\` and \`false\`. \`"red" | "green"\` is a box with two strings. \`string\` is a box with every string. \`unknown\` is the biggest box: everything fits.

Now imagine the **empty box**. Nothing is in it — no string, no number, not even \`undefined\`. That box is \`never\`. It sounds useless, but it is the zero of the type system: like \`0\` in arithmetic, you rarely write it on its own, yet every calculation needs it. "Which values are both a string and a number?" — the empty box. "What does a function that always throws return?" — nothing, the empty box. "Which members of this union have I not handled yet?" — hopefully the empty box.

📌 **Interview term: never** — the type that has no values. A variable of type \`never\` can never actually hold anything, and code that produces a \`never\` never finishes normally.

📌 **Interview term: bottom type** — the type at the bottom of the type hierarchy: a subtype of every other type. \`never\` is TypeScript bottom type, and \`unknown\` is its top type. \`never\` was added in TypeScript 2.0 ([Marius Schulz](https://mariusschulz.com/blog/the-never-type-in-typescript), [i-programmer](https://www.i-programmer.info/news/167-javascript/10117-typescript-20-adds-null-undefined-and-never.html)).

## 2. The Two Assignability Rules

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="unknown at the top, everyday types in the middle, never at the bottom">
  <defs>
    <marker id="q5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="260" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">unknown</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">top: every value</text>
  <rect class="d-box" x="40" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="120" y="184" text-anchor="middle">string</text>
  <rect class="d-box" x="280" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="360" y="184" text-anchor="middle">number</text>
  <rect class="d-box" x="520" y="150" width="160" height="56" rx="10"/>
  <text class="d-text" x="600" y="184" text-anchor="middle">Shape</text>
  <rect class="d-box-muted" x="260" y="284" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="310" text-anchor="middle">never</text>
  <text class="d-sub" x="360" y="328" text-anchor="middle">bottom: no values</text>
  <path class="d-edge" d="M 140 146 L 290 80" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 360 146 L 360 80" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 580 146 L 430 80" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 300 280 L 140 210" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 360 280 L 360 210" marker-end="url(#q5arrow)"/>
  <path class="d-edge" d="M 420 280 L 580 210" marker-end="url(#q5arrow)"/>
</svg>

An arrow means "is assignable to". Everything flows up into \`unknown\`; \`never\` flows up into everything.

1. **\`never\` is assignable to every type.** A \`never\` value cannot exist, so promising "this is a string" about it is never wrong. That is why \`const n: string = cond ? fail("x") : "fine"\` compiles in example 1: \`fail\` returns \`never\`, and \`never | string\` is just \`string\`.
2. **Nothing is assignable to \`never\`** except \`never\` itself. In example 1, \`const bad: never = u\` (with \`u: unknown\`) is rejected with \`TS2322: Type 'unknown' is not assignable to type 'never'.\` Even \`any\` is rejected: a separate 5.4.5 check of \`declare const a: any; const n: never = a;\` gave \`TS2322: Type 'any' is not assignable to type 'never'.\` — one of the few places where \`any\` does not switch checking off.

That second rule is the reason \`never\` is useful: wherever code requires \`never\`, the compiler will reject anything else — the basis of [exhaustiveness checking](/interview-question/how-do-you-do-exhaustiveness-checking).

## 3. Where \`never\` Shows Up on Its Own

All checked with \`Equal<...>\` in example 1:

| Situation | Result |
| :--- | :--- |
| \`string \\| never\` | \`string\` — the empty set adds nothing to a union |
| \`string & number\` | \`never\` — no value is both |
| \`{ kind: "a" } & { kind: "b" }\` | \`never\` — the \`kind\` property can not be both literals |
| Arrow function whose body always throws | return type inferred as \`never\` |
| Function *declaration* whose body always throws | return type inferred as \`void\`, not \`never\` |
| After narrowing away every member (\`typeof\` string, then number, of \`string \\| number\`) | \`never\` |
| \`const box = { items: [] }\` | \`box.items\` is \`never[]\`; \`box.items.push(1)\` fails |

Two of those deserve a sentence each in an interview:

**Declarations vs expressions.** The run confirms that \`const crash = () => { throw ... }\` gets \`never\` while \`function crashDecl() { throw ... }\` gets \`void\`. If you want a declared function to be usable as \`never\` (for example, in a \`return fail(...)\` position), annotate it: \`function fail(message: string): never\`. The differences between \`void\`, \`undefined\` and \`never\` as return types are covered in [What is the difference between void, undefined and never as return types?](/interview-question/what-is-the-difference-between-void-undefined-and-never-as-return-types)

**\`never[]\` from an empty array.** An empty \`[]\` with no context to infer from, as a property in an object literal, is typed \`never[]\`, so nothing can be pushed into it:

~~~text
main.ts(55,16): error TS2345: Argument of type 'number' is not assignable to parameter of type 'never'.
~~~

The fix is to annotate: \`const typedBox: { items: number[] } = { items: [] }\`. (A standalone \`let arr = []\` behaves differently — it starts as an evolving array whose type grows with each \`push\`.)

📌 **Interview term: uninhabited type** — a type with no values. \`never\` is the canonical one, and impossible intersections such as \`string & number\` reduce to it.

## 4. \`never\` in Type-Level Code

In conditional and mapped types, \`never\` means "drop this". Example 2 checks each line:

~~~ts
type MyExclude<T, U> = T extends U ? never : T;
type NonKey = MyExclude<"click" | "scroll" | "keydown" | "keyup", \`key\${string}\`>; // "click" | "scroll"

type NumberKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
// NumberKeys<{ id: number; name: string; price: number; tags: string[] }> is "id" | "price"
~~~

The conditional type runs once per union member (it is *distributive*); members mapped to \`never\` vanish because \`T | never\` is \`T\`. This is exactly how the built-in \`Exclude\` is defined — see [What do Exclude, Extract, and NonNullable do?](/interview-question/what-do-exclude-extract-and-nonnullable-do)

📌 **Interview term: distributive conditional type** — a conditional type \`T extends U ? X : Y\` where \`T\` is a bare type parameter; given a union, it is applied to each member separately and the results are unioned.

**The \`IsNever\` trap.** Because \`never\` is the empty union, a distributive conditional over it has *no members to run on*, and the result is \`never\` — not \`true\`, not \`false\`. tsc confirms \`IsNeverWrong<never>\` is \`never\`. Wrapping both sides in a one-element tuple turns distribution off: \`type IsNever<T> = [T] extends [never] ? true : false\` gives \`true\` for \`never\` and \`false\` for \`string\`. More in [Why are conditional types distributive and how do you control it with \`infer\`?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer)

**\`keyof never\`** is \`string | number | symbol\`: an object that cannot exist can be said to have every key. tsc confirms it.

## 5. Writing \`never\` on Purpose

- **Exhaustiveness:** \`function assertNever(x: never): never { throw ... }\` in a \`default\` branch — the full pattern is in [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)
- **Functions that never return:** annotate \`: never\` on helpers that always throw or loop forever, so callers get correct narrowing after them.
- **Forbidding a property:** \`type WithId = { id: number; tempId?: never }\` says "a \`WithId\` must not have \`tempId\`". In example 2, an object with both is rejected:

~~~text
main.ts(37,7): error TS2322: Type '{ id: number; tempId: string; }' is not assignable to type 'Row'.
  Types of property 'tempId' are incompatible.
    Type 'string' is not assignable to type 'undefined'.
~~~

The message says \`undefined\` because an optional property of type \`never\` can only ever be absent or \`undefined\`. This "either-or" trick is often combined with [discriminated unions](/interview-question/what-is-a-discriminated-union).

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5. Every \`Equal<...>\` line is a checked claim, and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, the assignability rules and where \`never\` appears:

~~~text
fine
number
Error: boom
string number
{"items":[1]}
~~~

The \`number\` on line 2 is worth noticing: \`bad\` is typed \`never\`, but because the error was silenced with \`@ts-expect-error\`, it actually holds \`1\` at run time. A \`never\` that exists means a type error was suppressed or a cast lied.

Example 2, \`never\` in type-level code:

~~~text
id:7 temp:t-1
id:1
click,scroll
~~~

## 7. never vs void vs unknown

| | \`never\` | \`void\` | \`unknown\` |
| :--- | :--- | :--- | :--- |
| Values | none | \`undefined\` (as a return: "ignore the result") | every value |
| Position in the hierarchy | bottom | — | top |
| Assignable to every type | Yes | No | No |
| Everything assignable to it | No | No | Yes |
| Typical use | unreachable code, impossible cases, filtering unions | functions called for their side effects | values you must check before use — see [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown) |

## Common Pitfalls

- **Confusing \`never\` with \`void\`.** A \`void\` function returns (with \`undefined\`); a \`never\` function does not return at all.
- **Expecting a thrown-only function declaration to be \`never\`.** Declarations infer \`void\`; annotate \`: never\`.
- **Leaving \`[]\` unannotated in object literals.** It becomes \`never[]\` and rejects every push.
- **Writing \`T extends never ? ...\` to test for \`never\`.** It distributes over nothing and yields \`never\`; use \`[T] extends [never]\`.
- **Seeing \`never\` in a type you built and moving on.** An intersection that collapsed to \`never\` (\`{ kind: "a" } & { kind: "b" }\`) usually means two requirements conflict; find which.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is the <strong style="color:#ffca28;">bottom type</strong>: the type with no values, the empty set. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> is the top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rules:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is assignable to every type, and nothing else is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. In a union it disappears: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | never</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where it appears:</strong> <span style="color:#f0e2c8;">Functions that always throw, branches where narrowing removed every member, impossible intersections like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; number</code>, and an unannotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> in an object literal, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Type-level use:</strong> <span style="color:#f0e2c8;">Mapping a member to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> drops it, which is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code> and key filters work. A distributive conditional over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IsNever</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T] extends [never]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Deliberate use:</strong> <span style="color:#f0e2c8;">Exhaustiveness checks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertNever(x: never)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: never</code> on helpers that always throw, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prop?: never</code> to forbid a property.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> means the function returns but you should not use the result (it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> means it does not return normally at all: it throws, exits or loops forever. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is assignable to every type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a throwing function declaration inferred as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code> but a throwing arrow function as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> for function expressions and arrow functions with no reachable end, but keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> for declarations. In 5.4.5, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code> of the arrow is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> and of the declaration is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>; annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: never</code> if you need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T extends never ? true : false</code> not work for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Conditional types on a bare type parameter distribute over unions, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> is the empty union, so there is nothing to distribute over and the result is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. Wrap both sides in a tuple to stop distribution.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">keyof never</code> give?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | number | symbol</code>. A value that can not exist can be said to have every possible key, so it is the widest key type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">never</code> help model "one or the other but not both"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make each variant forbid the other property: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id: number; tempId?: never } | { tempId: string; id?: never }</code>. An object with both fails, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tempId</code> can only be absent or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> in the first member.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| never | The type with no values |
| Bottom type | The type that is a subtype of every other type; in TypeScript, \`never\` |
| Uninhabited type | A type with no values, such as \`never\` or \`string & number\` |
| Distributive conditional type | A conditional type on a bare type parameter that is applied to each union member separately |

**Conclusion:** \`never\` is the empty type at the bottom of the hierarchy: assignable to everything, with nothing assignable to it, and invisible in unions. That makes it the natural result of impossible situations — code that cannot finish, branches that cannot be reached, intersections that cannot be satisfied — and a precise tool when written on purpose: exhaustiveness checks, functions that always throw, forbidden properties, and type-level filters like \`Exclude\`. Remember the two traps, \`void\`-typed throwing declarations and the distributive \`IsNever\`, and you can explain both what \`never\` is and why it is everywhere in TypeScript type errors.`,
    examples: [
      {
        label: `The rules of never and where it appears`,
        code: `// never is the empty type: no value has it. Every rule below is checked by tsc.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. never is assignable TO every type (it is the bottom type)...
function fail(message: string): never {
  throw new Error(message);
}
const n: string = fail.length > 99 ? fail("x") : "fine";
console.log(n);

// ...but nothing (not even any or unknown) is assignable to never.
const u: unknown = 1;
// @ts-expect-error Type 'unknown' is not assignable to type 'never'.
const bad: never = u;
console.log(typeof bad);

// 2. In a union, never disappears: it is the empty set.
const _u1: Equal<string | never, string> = true;

// 3. Impossible intersections reduce to never.
const _i1: Equal<string & number, never> = true;
const _i2: Equal<{ kind: "a" } & { kind: "b" }, never> = true;

// 4. A function that can never return normally.
const crash = () => {
  throw new Error("boom");
};
const _r1: Equal<ReturnType<typeof crash>, never> = true;
// A function DECLARATION with the same body is inferred as void, not never.
function crashDecl() {
  throw new Error("boom");
}
const _r2: Equal<ReturnType<typeof crashDecl>, void> = true;

try {
  crash();
} catch (err) {
  console.log(String(err));
}

// 5. Narrowing everything away leaves never.
function check(x: string | number) {
  if (typeof x === "string") return "string";
  if (typeof x === "number") return "number";
  const _left: Equal<typeof x, never> = true;
  return x;
}
console.log(check("a"), check(1));

// 6. An empty array literal inside an object literal is never[]:
// nothing can be pushed until you annotate it.
const box = { items: [] };
const _e: Equal<typeof box.items, never[]> = true;
// @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'never'.
box.items.push(1);
const typedBox: { items: number[] } = { items: [] };
typedBox.items.push(1);
console.log(JSON.stringify(typedBox));`,
      },
      {
        label: `never in type-level code: filtering unions and IsNever`,
        code: `// never in type-level code: filtering unions and the distributive trap.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Exclude is written with never: "drop this member" means "map it to never",
// and never then vanishes from the resulting union.
type MyExclude<T, U> = T extends U ? never : T;
type Event = "click" | "scroll" | "keydown" | "keyup";
type NonKey = MyExclude<Event, \`key\${string}\`>;
const _x: Equal<NonKey, "click" | "scroll"> = true;

// Filtering object keys by value type uses the same trick.
type Product = { id: number; name: string; price: number; tags: string[] };
type NumberKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
const _k: Equal<NumberKeys<Product>, "id" | "price"> = true;

// A conditional type over never gives never, not the true or false branch,
// because never is an empty union and there is nothing to distribute over.
type IsNeverWrong<T> = T extends never ? true : false;
const _w: Equal<IsNeverWrong<never>, never> = true;
// Wrapping both sides in a tuple turns distribution off.
type IsNever<T> = [T] extends [never] ? true : false;
const _a: Equal<IsNever<never>, true> = true;
const _b: Equal<IsNever<string>, false> = true;

// keyof never is every possible key type.
const _kn: Equal<keyof never, string | number | symbol> = true;

// A practical use: forbid a property by typing it as never (optional).
type WithId = { id: number; tempId?: never };
type WithTempId = { tempId: string; id?: never };
type Row = WithId | WithTempId;
function key(r: Row): string {
  return r.id !== undefined ? "id:" + r.id : "temp:" + r.tempId;
}
console.log(key({ id: 7 }), key({ tempId: "t-1" }));
// @ts-expect-error Types of property 'tempId' are incompatible.
const both: Row = { id: 1, tempId: "t-2" };
console.log(key(both));

// Runtime echo of the type-level filters above.
const events: Event[] = ["click", "scroll", "keydown", "keyup"];
console.log(events.filter((e) => !e.startsWith("key")).join(","));`,
      },
    ],
  },
];

export default augments;
