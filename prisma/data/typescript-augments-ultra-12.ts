/**
 * TYPESCRIPT ULTRA — batch 12: Variance, widening and satisfies (covariance and
 * contravariance, type widening, satisfies, literal preservation, const type parameters). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are covariance and contravariance?`,
    difficulty: "hard",
    seoDescription: `Covariance and contravariance in TypeScript: return vs parameter types, strictFunctionTypes, method bivariance, unsound arrays and in/out annotations.`,
    description: `**Question presented to candidate:**
"If a \`Dog\` is assignable to an \`Animal\`, is a \`Dog[]\` assignable to an \`Animal[]\`? Is a \`(d: Dog) => void\` assignable to an \`(a: Animal) => void\`? Explain covariance and contravariance, and where TypeScript is deliberately unsound."

**What a strong answer should cover:**
- Variance describes how a subtype relation between \`Dog\` and \`Animal\` carries over to a type built from them, such as \`Box<Dog>\` and \`Box<Animal>\`: same direction (covariant), reversed (contravariant), neither (invariant), or both (bivariant)
- Outputs (return types, read-only properties) are covariant; inputs (parameters) are contravariant, because a function that accepts any \`Animal\` can safely be used where only \`Dog\`s will be passed
- \`strictFunctionTypes\` (TypeScript 2.6, part of \`--strict\`) checks function-type parameters contravariantly, but parameters declared with method syntax stay bivariant on purpose
- Mutable arrays are treated as covariant, which is unsound: you can push a \`Cat\` into a \`Dog[]\` through an \`Animal[]\` alias; \`readonly\` arrays are covariant and safe
- A generic type that both reads and writes \`T\` is invariant; TypeScript measures variance from the structure, and \`in\` / \`out\` annotations (TypeScript 4.7) declare and check it

**Clarifying questions expected:**
- Is \`strictFunctionTypes\` (or \`strict\`) on in this codebase?
- Are the callbacks declared with method syntax or as function-typed properties?

**Code / implementation expected:** Yes — assign a \`Dog\`-only callback where an \`Animal\` callback is expected, show the compile error, and show the array hole at run time.`,
    answer: `**Target Audience:** Developers who know classes and generics and keep hitting "Types of parameters are incompatible" errors, or who want to answer the classic "is \`Dog[]\` an \`Animal[]\`?" question precisely.
**Difficulty:** Hard
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`; the 2.6 and 4.7 version facts are cited from the release material.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (a \`// @ts-expect-error\` line fails the build if the error does not happen), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A dog shelter hires two kinds of helpers.

A **walker** is handed an animal and takes it out. If the job ad says "we need someone who can walk dogs," a person who can walk *any* animal — dogs, cats, goats — is perfectly fine for the job. But a person who can walk *only* dogs is no good for a job that says "walk any animal": the first time a cat shows up, things go wrong.

A **breeder** hands animals *to* you. If you asked for "someone who supplies animals," a breeder who only ever supplies dogs is fine — every dog is an animal.

Notice the flip. For the person who *gives you* things (the breeder), "more specific" is safe: dogs-only is fine where animals were asked for. For the person who *takes* things from you (the walker), it is the other way round: "more general" is safe. That flip is all that covariance and contravariance mean.

📌 **Interview term: subtype** — \`Dog\` is a subtype of \`Animal\` when every \`Dog\` can be used where an \`Animal\` is expected. In TypeScript this is checked by shape ([What is structural typing?](/interview-question/what-is-structural-typing)): \`Dog\` has everything \`Animal\` has, plus more.

📌 **Interview term: variance** — the rule for how a subtype relation between two types carries over to types built from them, such as \`Dog[]\` vs \`Animal[]\`, or \`(d: Dog) => void\` vs \`(a: Animal) => void\`.

## 2. The Four Kinds of Variance

Take any type built from another, written here as \`F<T>\` (an array, a function type, a generic interface).

| Name | Rule, given Dog is a subtype of Animal | Typical position of T |
| :--- | :--- | :--- |
| **Covariant** | \`F<Dog>\` is a subtype of \`F<Animal>\` (same direction) | Output: return types, read-only properties |
| **Contravariant** | \`F<Animal>\` is a subtype of \`F<Dog>\` (reversed) | Input: function parameters |
| **Invariant** | Neither is assignable to the other | Both read and written |
| **Bivariant** | Both directions are accepted | TypeScript method parameters (a deliberate unsoundness) |

📌 **Interview term: covariance** — the built type varies *with* its part: a producer of \`Dog\` can stand in for a producer of \`Animal\`.

📌 **Interview term: contravariance** — the built type varies *against* its part: a consumer of \`Animal\` can stand in for a consumer of \`Dog\`.

📌 **Interview term: invariance** — no substitution in either direction, because \`T\` flows both in and out.

📌 **Interview term: bivariance** — substitution in both directions; convenient, but it lets some wrong programs compile.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Covariance keeps the arrow direction from Dog to Animal for producers, contravariance reverses it for consumers">
  <defs>
    <marker id="v1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <text class="d-sub" x="140" y="30" text-anchor="middle">covariant (outputs)</text>
  <rect class="d-box" x="40" y="50" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="86" text-anchor="middle">() =&gt; Dog</text>
  <rect class="d-box-accent" x="40" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="236" text-anchor="middle">() =&gt; Animal</text>
  <path class="d-edge-accent" d="M 140 114 L 140 194" marker-end="url(#v1arrow)"/>
  <text class="d-sub" x="580" y="30" text-anchor="middle">contravariant (inputs)</text>
  <rect class="d-box-accent" x="480" y="50" width="200" height="60" rx="10"/>
  <text class="d-text" x="580" y="86" text-anchor="middle">(a: Animal) =&gt; void</text>
  <rect class="d-box" x="480" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="580" y="236" text-anchor="middle">(d: Dog) =&gt; void</text>
  <path class="d-edge-accent" d="M 580 114 L 580 194" marker-end="url(#v1arrow)"/>
  <rect class="d-box-muted" x="300" y="120" width="120" height="70" rx="10"/>
  <text class="d-text" x="360" y="150" text-anchor="middle">Dog</text>
  <text class="d-sub" x="360" y="174" text-anchor="middle">is an Animal</text>
</svg>

Each arrow means "can be used where the box below is expected." On the left, the function returning \`Dog\` fits where one returning \`Animal\` is expected: same direction as \`Dog\` to \`Animal\`. On the right, the function taking any \`Animal\` fits where one taking a \`Dog\` is expected: the arrow runs the other way.

## 3. Return Types Are Covariant, Parameters Are Contravariant

Example 1 checks both rules directly.

~~~ts
const makeDog = (): Dog => new Dog("Rex");
const makeAnimal: () => Animal = makeDog; // OK: covariant return

const greetAnimal = (a: Animal): string => "hi " + a.name;
const greetDog: (d: Dog) => string = greetAnimal; // OK: contravariant parameter

const walkDog = (d: Dog): string => d.bark();
const walkAnyAnimal: (a: Animal) => string = walkDog; // error
~~~

The last line fails with:

~~~text
main.ts(31,7): error TS2322: Type '(d: Dog) => string' is not assignable to type '(a: Animal) => string'.
  Types of parameters 'd' and 'a' are incompatible.
    Property 'bark' is missing in type 'Animal' but required in type 'Dog'.
~~~

Read the last line of the message carefully: tsc compared the parameters *backwards* — it asked whether \`Animal\` is assignable to \`Dog\`. That reversed check is contravariance. Example 1 then forces the bad assignment through with \`as unknown as\` and calls it with a \`Cat\`; \`d.bark\` is not a function, and the call throws a \`TypeError\` (\`runtime: true\`). The error was protecting a real crash.

📌 **Interview term: \`strictFunctionTypes\`** — the compiler flag that checks parameters of function *types* contravariantly instead of bivariantly. It was added in TypeScript 2.6 and is turned on by \`--strict\` ([TypeScript 2.6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html)). With \`--strictFunctionTypes false\`, the \`walkDog\` assignment above compiles without error (checked on 5.4.5). The rest of \`strict\` is covered in [What does the 'strict' flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable)

## 4. The Method Exception: Bivariance on Purpose

The same 2.6 release notes state that the stricter check applies to all function types **except those originating in method or constructor declarations**, so that types like \`Array<T>\` keep relating covariantly. Example 2 shows the difference that one bit of syntax makes:

~~~ts
interface MethodHandler {
  handle(a: Animal): string;          // method syntax: bivariant
}
interface PropertyHandler {
  handle: (a: Animal) => string;      // property syntax: contravariant
}
const dogOnly = { handle: (d: Dog) => d.bark() };
const m: MethodHandler = dogOnly;     // accepted
const p: PropertyHandler = dogOnly;   // error TS2322
~~~

The method form compiles, and calling \`m.handle(new Animal("Generic"))\` crashes at run time (\`method form accepted, then crashed: true\`). The property form is rejected with the same "Types of parameters are incompatible" chain as before.

**Practical rule:** when you write callback or handler types and want the safe check, declare them as properties with arrow types (\`onSave: (doc: Doc) => void\`), not as methods (\`onSave(doc: Doc): void\`).

📌 **Interview term: method bivariance** — TypeScript compares parameters of method-syntax members in both directions, even under \`strict\`. It is a deliberate trade-off for convenience, not a bug.

## 5. Arrays: Covariant, and Therefore Unsound

\`Array<T>\` declares \`push(...items: T[])\` with method syntax, so its parameter is bivariant and the array as a whole is treated as covariant. That is why \`Dog[]\` is assignable to \`Animal[]\` — and why this compiles:

~~~ts
const dogs: Dog[] = [new Dog("Rex")];
const animals: Animal[] = dogs;     // allowed
animals.push(new Cat("Tom"));        // allowed: it is an Animal[]
~~~

Both names point at the same array, so \`dogs\` now holds a \`Cat\`. Example 1 prints \`dogs: 2 second is a Dog: false\`. Any later \`dogs[1].bark()\` would type-check and crash.

The safe version is a read-only view. \`readonly Animal[]\` has no \`push\`, so there is no way to write a wrong element through it, and covariance becomes sound:

~~~text
main.ts(51,19): error TS2339: Property 'push' does not exist on type 'readonly Animal[]'.
~~~

That is a good reason to type function *inputs* as \`readonly T[]\` ([What is ReadonlyArray and readonly tuple?](/interview-question/what-is-readonlyarray-and-readonly-tuple)): the function promises not to write, and callers may pass a more specific array safely.

📌 **Interview term: soundness** — a type system is sound if a program that type-checks can never have a value of the wrong type at run time. TypeScript is intentionally not fully sound; array covariance and method bivariance are two of its known holes.

## 6. Variance of Your Own Generic Types

TypeScript works out the variance of a generic type from how its type parameter is used. Example 2 defines three shapes:

~~~ts
interface Producer<T> { get: () => T }                       // T only out: covariant
interface Consumer<T> { accept: (value: T) => void }         // T only in: contravariant
interface Box<T> { get: () => T; set: (value: T) => void }   // in and out: invariant
~~~

\`Producer<Dog>\` goes into a \`Producer<Animal>\` and \`Consumer<Animal>\` goes into a \`Consumer<Dog>\`. The reverse consumer assignment fails, and \`Box\` fails in both directions:

~~~text
main.ts(47,3): error TS2322: Type 'Consumer<Dog>' is not assignable to type 'Consumer<Animal>'.
  Type 'Animal' is not assignable to type 'Dog'.
main.ts(49,3): error TS2322: Type 'Box<Dog>' is not assignable to type 'Box<Animal>'.
  Types of property 'set' are incompatible.
    Type '(value: Dog) => void' is not assignable to type '(value: Animal) => void'.
      Types of parameters 'value' and 'value' are incompatible.
        Type 'Animal' is not assignable to type 'Dog'.
main.ts(51,3): error TS2322: Type 'Box<Animal>' is not assignable to type 'Box<Dog>'.
  The types returned by 'get()' are incompatible between these types.
    Type 'Animal' is not assignable to type 'Dog'.
~~~

The two \`Box\` messages point at the two reasons: going up breaks \`set\` (an input), going down breaks \`get()\` (an output). If \`Box\` had declared \`set(value: T): void\` with method syntax, it would have been treated as covariant instead — the method exception again.

📌 **Interview term: variance measurement** — tsc infers the variance of each type parameter by checking marker instantiations of the type, so you rarely write it by hand.

## 7. Variance Annotations: \`in\` and \`out\`

TypeScript 4.7 added optional variance annotations on type parameters of interfaces, type aliases and classes: \`out T\` for covariant, \`in T\` for contravariant, \`in out T\` for invariant ([TypeScript PR #48240](https://github.com/microsoft/TypeScript/pull/48240)). They do two jobs: they document intent, and tsc checks that the structure matches. Example 2 marks a type \`out\` while using \`T\` as a parameter:

~~~ts
interface Broken<out T> {
  write: (value: T) => void;
}
~~~

~~~text
main.ts(62,18): error TS2636: Type 'Broken<sub-T>' is not assignable to type 'Broken<super-T>' as implied by variance annotation.
  Types of property 'write' are incompatible.
    Type '(value: sub-T) => void' is not assignable to type '(value: super-T) => void'.
      Types of parameters 'value' and 'value' are incompatible.
        Type 'super-T' is not assignable to type 'sub-T'.
~~~

The same PR notes that the checker can skip measuring variance when annotations are present, which can help on very large recursive types, and that \`in out\` (invariance) is assumed rather than checked. Treat annotations as a tool for library authors and performance work; ordinary application code rarely needs them.

📌 **Interview term: variance annotation** — an \`in\` or \`out\` modifier on a type parameter declaration that states its variance explicitly.

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`// @ts-expect-error\` line is a real error, and the messages above come from a run with the directives removed. Each example was then run as the page runs it.

Example 1, covariant returns, contravariant parameters and the array hole:

~~~text
Rex
hi Fido
runtime: true
dogs: 2 second is a Dog: false
readonly view: Rex,Tom
~~~

Example 2, method bivariance, measured variance and \`in\` / \`out\`:

~~~text
method form accepted, then crashed: true
Rex, Fido
~~~

## Common Pitfalls

- **Assuming \`strict\` closes every hole.** Method-syntax parameters stay bivariant and mutable arrays stay covariant under \`--strict\`; both compiled and crashed in the examples.
- **Writing callback types with method syntax.** \`onChange(v: T): void\` gets the loose check; \`onChange: (v: T) => void\` gets the contravariant one.
- **Passing a \`Dog[]\` into a function that pushes into an \`Animal[]\`.** Type input arrays as \`readonly Animal[]\` when the function only reads them.
- **Getting the direction backwards in an answer.** Parameters are contravariant: the *wider* parameter type is the substitutable one. Say it with the walker analogy if you get stuck.
- **Expecting a read-write generic to be covariant.** A \`Box<T>\` with both \`get\` and a function-typed \`set\` is invariant; split it into a read-only and a write-only view if you need substitution.
- **Adding \`in\` / \`out\` everywhere.** They are checked for \`in\` and \`out\`, but \`in out\` is assumed; use them when you need them, not as decoration.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Variance</strong> says how a subtype relation carries over to a built type. Covariant keeps the direction (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; Dog</code> fits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; Animal</code>), contravariant reverses it, invariant allows neither.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule of thumb:</strong> <span style="color:#f0e2c8;">Outputs are covariant and inputs are contravariant: a handler that accepts any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Animal</code> can replace a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog</code> handler, never the other way round.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. In TypeScript:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictFunctionTypes</code>, part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--strict</code> since 2.6, checks function-type parameters contravariantly, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(d: Dog) =&gt; void</code> is rejected where an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a: Animal) =&gt; void</code> is expected.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The holes:</strong> <span style="color:#f0e2c8;">Method-syntax parameters stay <strong style="color:#ffca28;">bivariant</strong> on purpose, and mutable arrays are covariant, so you can push a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cat</code> into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog[]</code> through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Animal[]</code> alias. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> arrays are covariant and safe.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Generics:</strong> <span style="color:#f0e2c8;">tsc measures each type parameter variance from its use; a type that reads and writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is invariant. Since 4.7 you can state it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out</code>, which tsc checks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did TypeScript keep method parameters bivariant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The 2.6 release notes say methods were excluded so that generic types such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array&lt;T&gt;</code> keep relating covariantly. Making <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> contravariant would make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog[]</code> not assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Animal[]</code>, which would break a huge amount of existing code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the strict check for a callback in an interface?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare it as a property with a function type, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onSave: (doc: Doc) =&gt; void</code>, instead of method syntax <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onSave(doc: Doc): void</code>. The property form is checked contravariantly under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictFunctionTypes</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Dog[]</code> assignable to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Animal[]</code>, and is that safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Assignable, yes, because arrays are treated as covariant. Not safe: writing through the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Animal[]</code> alias can put a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cat</code> in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog[]</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly Animal[]</code> parameter makes it safe because there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What makes a generic type invariant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> in both an input and an output position, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get: () =&gt; T</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set: (v: T) =&gt; void</code>. Neither <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box&lt;Dog&gt;</code> nor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box&lt;Animal&gt;</code> is assignable to the other.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">in</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">out</code> on a type parameter do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They declare contravariance and covariance explicitly (TypeScript 4.7). tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2636</code> if the structure contradicts the annotation, and it can skip measuring variance, which helps on very complex types.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Subtype | A type usable wherever another is expected (\`Dog\` for \`Animal\`) |
| Variance | How a subtype relation carries over to built types like arrays, functions and generics |
| Covariance | Same direction: \`F<Dog>\` fits \`F<Animal>\`; typical for outputs |
| Contravariance | Reversed: \`F<Animal>\` fits \`F<Dog>\`; typical for parameters |
| Invariance | Neither direction fits; \`T\` is both read and written |
| Bivariance | Both directions fit; how method parameters are compared |
| \`strictFunctionTypes\` | Flag (2.6, in \`--strict\`) that checks function-type parameters contravariantly |
| Method bivariance | The deliberate exception for parameters declared with method syntax |
| Soundness | A guarantee that well-typed programs never hold wrong-typed values at run time |
| Variance measurement | tsc working out each type parameter variance from the structure |
| Variance annotation | \`in\` / \`out\` / \`in out\` on a type parameter (4.7) |

**Conclusion:** Covariance and contravariance are the two directions a subtype relation can travel when you wrap a type: outputs keep the direction, inputs reverse it, and things that are both read and written allow no substitution at all. TypeScript applies the safe contravariant rule to function types under \`strictFunctionTypes\`, but it deliberately keeps method parameters bivariant and arrays covariant, so a few wrong programs still compile — exactly the cases the examples crashed on. Knowing where those holes are, preferring function-typed properties for callbacks and \`readonly\` arrays for inputs, is what turns a textbook definition into a strong interview answer.`,
    examples: [
      {
        label: `Covariant returns, contravariant parameters and the array hole`,
        code: `// A tiny class hierarchy: every Dog is an Animal, not the other way round.
class Animal {
  constructor(public name: string) {}
}
class Dog extends Animal {
  bark(): string {
    return this.name + " says woof";
  }
}
class Cat extends Animal {
  meow(): string {
    return this.name + " says meow";
  }
}

// 1. Return types are covariant: a function that returns a Dog
//    can stand in for one that returns an Animal.
const makeDog = (): Dog => new Dog("Rex");
const makeAnimal: () => Animal = makeDog;
console.log(makeAnimal().name); // Rex

// 2. Parameter types are contravariant (with strictFunctionTypes):
//    a handler for ANY animal can stand in for a Dog handler...
const greetAnimal = (a: Animal): string => "hi " + a.name;
const greetDog: (d: Dog) => string = greetAnimal;
console.log(greetDog(new Dog("Fido")));

// ...but a Dog-only handler cannot stand in for an Animal handler.
const walkDog = (d: Dog): string => d.bark();
// @ts-expect-error a (d: Dog) => string is not an (a: Animal) => string
const walkAnyAnimal: (a: Animal) => string = walkDog;

// 3. What would go wrong without that error: force it through with a cast.
const unsafeWalk = walkDog as unknown as (a: Animal) => string;
try {
  unsafeWalk(new Cat("Tom"));
} catch (e) {
  console.log("runtime:", e instanceof TypeError);
}

// 4. Mutable arrays are treated as covariant, which is unsound.
const dogs: Dog[] = [new Dog("Rex")];
const animals: Animal[] = dogs; // allowed
animals.push(new Cat("Tom")); // also allowed: it is an Animal[]
console.log("dogs:", dogs.length, "second is a Dog:", dogs[1] instanceof Dog);

// 5. ReadonlyArray is covariant AND safe: there is no push to misuse.
const readonlyAnimals: readonly Animal[] = dogs;
function tryPush(): void {
  // @ts-expect-error readonly arrays have no push
  readonlyAnimals.push(new Cat("Kitty"));
}
console.log("readonly view:", readonlyAnimals.map((a) => a.name).join(","));`,
      },
      {
        label: `Method bivariance, measured variance and in / out annotations`,
        code: `class Animal {
  constructor(public name: string) {}
}
class Dog extends Animal {
  bark(): string {
    return this.name + " says woof";
  }
}

// 1. Method syntax vs property syntax. strictFunctionTypes only checks
//    the property (function-typed) form contravariantly.
interface MethodHandler {
  handle(a: Animal): string; // method syntax: bivariant parameter
}
interface PropertyHandler {
  handle: (a: Animal) => string; // property syntax: contravariant parameter
}
const dogOnly = { handle: (d: Dog) => d.bark() };
const m: MethodHandler = dogOnly; // accepted, unsoundly
// @ts-expect-error property syntax rejects the Dog-only handler
const p: PropertyHandler = dogOnly;
try {
  m.handle(new Animal("Generic"));
} catch (e) {
  console.log("method form accepted, then crashed:", e instanceof TypeError);
}

// 2. Variance follows how T is used. Out-only = covariant, in-only =
//    contravariant, both = invariant.
interface Producer<T> {
  get: () => T;
}
interface Consumer<T> {
  accept: (value: T) => void;
}
interface Box<T> {
  get: () => T;
  set: (value: T) => void;
}
declare let pDog: Producer<Dog>, pAnimal: Producer<Animal>;
declare let cDog: Consumer<Dog>, cAnimal: Consumer<Animal>;
declare let bDog: Box<Dog>, bAnimal: Box<Animal>;
function checks(): void {
  pAnimal = pDog; // covariant: OK
  cDog = cAnimal; // contravariant: OK
  // @ts-expect-error Consumer<Dog> is not a Consumer<Animal>
  cAnimal = cDog;
  // @ts-expect-error Box is invariant: neither direction works
  bAnimal = bDog;
  // @ts-expect-error Box is invariant: neither direction works
  bDog = bAnimal;
}

// 3. Variance annotations (TypeScript 4.7) state the intent; tsc checks it.
interface Source<out T> {
  read: () => T;
}
interface Sink<in T> {
  write: (value: T) => void;
}
// @ts-expect-error T is used as a parameter, so it cannot be marked out
interface Broken<out T> {
  write: (value: T) => void;
}

// A real run: a Sink of Animal used where a Sink of Dog is needed.
const log: string[] = [];
const animalSink: Sink<Animal> = { write: (a) => { log.push(a.name); } };
const dogSink: Sink<Dog> = animalSink;
dogSink.write(new Dog("Rex"));
const dogSource: Source<Dog> = { read: () => new Dog("Fido") };
const animalSource: Source<Animal> = dogSource;
log.push(animalSource.read().name);
console.log(log.join(", "));`,
      },
    ],
  },
  {
    title: `What is type widening and how do you prevent it?`,
    difficulty: "medium",
    seoDescription: `Type widening in TypeScript: why let and object properties turn literals into string or number, and how annotations, as const and satisfies stop it.`,
    description: `**Question presented to candidate:**
"Why does \`let method = "GET"\` have type \`string\` but \`const method = "GET"\` has type \`"GET"\`? What is type widening, where does it bite you, and what are your options for stopping it?"

**What a strong answer should cover:**
- Widening is the compiler replacing a literal type (\`"GET"\`, \`3\`, \`true\`) with its general type (\`string\`, \`number\`, \`boolean\`) when the value lands in a mutable place
- Where it happens: \`let\` and \`var\`, object properties, array elements, inferred function return types, and copying a \`const\` into a \`let\`
- \`const\` with a literal initializer keeps the literal; a literal written with an explicit literal annotation is "non-widening" and survives a copy into a \`let\`
- The classic symptom: \`send(request.method)\` fails with "Argument of type 'string' is not assignable to parameter of type 'Method'"
- The fixes and their trade-offs: annotate the slot, \`as const\` (deep, readonly), \`as const\` on one property, \`satisfies\`, a literal return type, a primitive constraint such as \`T extends string\` or a \`const\` type parameter
- Widening is compile-time only; the run-time value is the same string either way

**Code / implementation expected:** Yes — an object literal passed to a function that accepts a literal union, the error, then two or three different fixes.`,
    answer: `**Target Audience:** Developers who have seen "Type 'string' is not assignable to type '"GET" | "POST"'" and want to know why it happens and which fix to use.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`. The widening rules date from TypeScript 2.1 ([PR #10676](https://github.com/microsoft/TypeScript/pull/10676)).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` with \`Equal<...>\` checks and \`// @ts-expect-error\` lines, and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

You write "Table for 2, 7 pm" on a sticky note and put it on the fridge. Your flatmate, copying it into the shared calendar, writes "dinner booking." Nothing is lost for the flatmate — it *is* a dinner booking — but the restaurant needed the exact time, and now it is gone.

TypeScript does the same thing on purpose. When you write \`"GET"\` into a place that might change later, the compiler records the general fact ("this is a string") instead of the exact value, because a \`let\` that is typed \`"GET"\` forever would be useless. That copy-into-something-general step is **widening**. Most of the time it is exactly what you want. It only hurts when some later code needed the exact value.

📌 **Interview term: literal type** — a type with exactly one value, such as \`"GET"\`, \`3\` or \`true\` ([What are literal types?](/interview-question/what-are-literal-types)).

📌 **Interview term: type widening** — the compiler replacing a literal type with its base primitive type (\`"GET"\` becomes \`string\`, \`3\` becomes \`number\`) when inferring the type of a mutable location.

## 2. Where Widening Happens

Example 1 checks every case with \`Equal<A, B>\`, a type that is \`true\` only when two types are identical, so tsc proves each line.

~~~ts
const method = "GET";      // "GET"     const: keeps the literal
let method2 = "GET";       // string    let: may change, so widened

let copy = method;         // string    the literal was a "widening" literal
const annotated: "GET" = "GET";
let copy2 = annotated;     // "GET"     an annotated literal does not widen

const request = { method: "GET", retries: 3 };   // { method: string; retries: number }
const mixed = [1, "a", true];                    // (string | number | boolean)[]

function pick() { return "left"; }               // returns string
~~~

The pattern: anywhere the value could later be replaced (a \`let\`, a non-readonly property, an array slot, an inferred return), the literal is widened. A \`const\` binding cannot be reassigned, so it keeps the literal.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="The literal GET keeps its literal type in a const binding but widens to string in a let, an object property or an array element">
  <defs>
    <marker id="w1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="260" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">literal "GET"</text>
  <rect class="d-box" x="40" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="210" text-anchor="middle">const binding</text>
  <text class="d-sub" x="140" y="234" text-anchor="middle">stays "GET"</text>
  <rect class="d-box-muted" x="480" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="580" y="210" text-anchor="middle">let, property, array</text>
  <text class="d-sub" x="580" y="234" text-anchor="middle">widens to string</text>
  <path class="d-edge-accent" d="M 300 84 L 170 176" marker-end="url(#w1arrow)"/>
  <path class="d-edge-dashed" d="M 420 84 L 550 176" marker-end="url(#w1arrow)"/>
</svg>

The solid arrow is the immutable destination that keeps the exact type; the dashed arrow is every mutable destination, where tsc stores the general type.

📌 **Interview term: widening literal type** — the type a literal gets when inferred for a \`const\` without an annotation. It *displays* as \`"GET"\` but widens again if copied into a mutable place, as \`copy\` shows. An explicitly annotated literal is a **non-widening** literal type and survives the copy.

## 3. Where It Bites: the Literal-Union Parameter

The pain comes when a function accepts only certain literals:

~~~ts
type Method = "GET" | "POST";
function send(m: Method): string { return "sent " + m; }

send(method);            // OK: "GET"
send(request.method);    // error: request.method is string
~~~

~~~text
main.ts(37,6): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Method'.
~~~

The value is still \`"GET"\` at run time — example 1 prints \`string true\` for \`typeof request.method\` and the equality check. Widening changes only what the compiler remembers.

## 4. How to Prevent It: the Toolbox

Example 2 shows six fixes. Pick by asking "where does the knowledge belong?"

| Fix | Code | Resulting type | Use when |
| :--- | :--- | :--- | :--- |
| Annotate the slot | \`const r: { method: Method } = {...}\` | \`{ method: Method }\` | You have a named type and want the object to be exactly that |
| \`as const\` on the whole literal | \`{ method: "GET", retries: 3 } as const\` | \`{ readonly method: "GET"; readonly retries: 3 }\` | Constants that never change; deep and readonly |
| \`as const\` on one property | \`{ method: "POST" as const, retries: 3 }\` | \`{ method: "POST"; retries: number }\` | Only one field needs to stay exact |
| \`satisfies\` | \`{ method: "GET" } satisfies { method: Method }\` | \`{ method: "GET" }\` | Validate against a type and keep the literal |
| Literal return type | \`function pick(): "left" \\| "right"\` | \`"left" \\| "right"\` | Functions whose result is one of a few literals |
| Primitive or \`const\` type parameter | \`function tag<T extends string>(t: T)\` | \`{ tag: "x" }\` for \`tag("x")\` | Generic helpers that should remember the argument |

The last row is subtle. In example 2, the unconstrained \`wrap<T>(t: T): { tag: T }\` infers \`T = string\` for \`wrap("x")\`, but the same helper written \`tag<T extends string>\` infers \`T = "x"\`: a constraint to a primitive type tells tsc to keep the literal. A [\`const\` type parameter](/interview-question/what-are-const-type-parameters-const-t-and-why-are-they-better-than-as-const) does the same for arrays and objects.

📌 **Interview term: const assertion (\`as const\`)** — tells tsc to infer the narrowest type for a literal: literal types, \`readonly\` properties and readonly tuples, all the way down ([What does as const do?](/interview-question/what-does-as-const-do)).

📌 **Interview term: contextual type** — the type the surrounding code expects at a position (an annotation, a parameter type, a \`satisfies\` target). When the contextual type contains literal types, tsc keeps the literal instead of widening, which is how annotations and \`satisfies\` prevent widening ([What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)).

## 5. The Opposite Direction: Auto-Typed Variables

Widening also has a cousin for "no information yet." Under \`--strict\`, \`let later;\` and \`const list = [];\` do not become \`any\` forever. tsc gives them an **evolving** type that follows each assignment or push. Example 2 checks it:

~~~ts
let later;
later = 1;        // typeof later is number here
later = "one";    // and string here
const list = [];
list.push(1);     // typeof list is number[] here
~~~

The same happens for \`let x = null\` and \`let x = undefined\`: right after the declaration the type is \`null\` (checked), and later assignments move it on. Declaration emit (\`--declaration\`) writes such variables as \`any\`, which is a hint that they are best avoided in exported code — give them an annotation.

📌 **Interview term: evolving (auto-typed) variable** — a \`let\` with no initializer, or with \`null\` / \`undefined\` / \`[]\`, whose type tsc tracks through control flow instead of fixing it at the declaration.

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal\` check compiles, and the \`// @ts-expect-error\` line is a real error (quoted above from a run with the directive removed). Each example was then run as the page runs it.

Example 1, where widening happens and the error it causes:

~~~text
sent GET
string true
{"method":"GET","retries":3} [1,"a",true]
~~~

Example 2, six ways to keep the literal, and auto-typed variables:

~~~text
sent GET
sent GET
sent POST
sent GET
[{"method":"GET","retries":3},{"method":"POST","retries":3},{"tag":"x"},{"tag":"x"},"left","one",[1]]
~~~

The two \`{"tag":"x"}\` values are identical at run time; only their compile-time types differ (\`{ tag: string }\` and \`{ tag: "x" }\`).

## Common Pitfalls

- **Thinking \`const\` freezes objects.** \`const request = { method: "GET" }\` keeps the *binding* fixed, but \`request.method\` is still a mutable \`string\` property. Use \`as const\` or a type for the property.
- **Reaching for \`as Method\`.** \`send(request.method as Method)\` silences the error but checks nothing; a typo like \`"GTE"\` would pass too ([What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)).
- **Sprinkling \`as const\` on mutable state.** It makes everything \`readonly\`; if the object is meant to change, annotate it with a named type instead.
- **Forgetting the return type.** A helper that \`return "left"\` is typed as returning \`string\`; callers that need the literal must get it from an explicit return type.
- **Expecting widening to change run-time values.** It never does. If a value is wrong at run time, widening is not the cause.
- **Exporting evolving variables.** \`let x;\` reads well inside a function, but in exported code it is emitted as \`any\`; annotate it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Widening</strong> is tsc replacing a literal type like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"GET"</code> with its base type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> when the value goes into a place that could change later.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var</code>, object properties, array elements and inferred return types widen. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> binding keeps the literal because it can never be reassigned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The symptom:</strong> <span style="color:#f0e2c8;">Passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">request.method</code> to a function that wants <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"GET" | "POST"</code> fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Argument of type string is not assignable</code>, even though the value is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"GET"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fixes:</strong> <span style="color:#f0e2c8;">Annotate with the union type, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> (deep and readonly) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> on one property, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> to validate and keep the literal, or give functions a literal return type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it is a feature:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"GET"</code> forever would be useless, so widening is the right default. It is compile-time only and never changes the value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let x = c</code> widen when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const c = "a"</code> showed as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"a"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An unannotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> gets a <strong style="color:#ffca28;">widening</strong> literal type, which widens again when copied into a mutable place. If you annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const c: "a" = "a"</code>, the literal is non-widening and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let x = c</code> stays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you want the object checked against a type, such as a config shape, and the literals kept, but you do not want everything <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> keeps a literal when the target property is a literal union.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a generic function widen its argument?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the constraint. An unconstrained <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrap&lt;T&gt;(t: T): { tag: T }</code> infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T = string</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"x"</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends string</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"x"</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameter keeps arrays and objects literal too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">let x;</code> get typed as under strict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is auto-typed: tsc tracks its type through each assignment, so after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x = 1</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>. Declaration emit writes it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, so annotate exported variables.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Literal type | A type with one value, like \`"GET"\` or \`3\` |
| Type widening | Replacing a literal type with its base type in a mutable location |
| Widening literal type | An unannotated \`const\` literal; widens again when copied to a \`let\` |
| Non-widening literal type | An explicitly annotated literal; survives copies |
| Const assertion | \`as const\`: narrowest literal, readonly, deep |
| Contextual type | The type expected at a position; literals in it stop widening |
| Evolving variable | A \`let\` without a useful initializer whose type follows assignments |

**Conclusion:** Type widening is TypeScript choosing the general type for values that live in changeable places, which is the right default for \`let\` variables, object properties and array elements. It only becomes a problem when later code needs the exact literal, as with a parameter typed \`"GET" | "POST"\`. The fix is to say where the precision belongs: a type annotation on the slot, \`as const\` for true constants, \`satisfies\` when you want both validation and the literal, a literal return type, or a constrained or \`const\` type parameter for generic helpers.`,
    examples: [
      {
        label: `Where widening happens and the error it causes`,
        code: `// Equal<A, B> is true only when A and B are exactly the same type.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. const keeps the literal, let widens it.
const method = "GET";
let method2 = "GET";
const c1: Equal<typeof method, "GET"> = true;
const c2: Equal<typeof method2, string> = true;

// 2. Copying a const into a let widens again: the literal was "widening".
let copy = method;
const c3: Equal<typeof copy, string> = true;
// An annotated literal type is "non-widening" and survives the copy.
const annotated: "GET" = "GET";
let copy2 = annotated;
const c4: Equal<typeof copy2, "GET"> = true;

// 3. Object properties and array elements are mutable slots: they widen.
const request = { method: "GET", retries: 3 };
const c5: Equal<typeof request, { method: string; retries: number }> = true;
const mixed = [1, "a", true];
const c6: Equal<typeof mixed, (string | number | boolean)[]> = true;

// 4. Inferred return types widen too.
function pick() {
  return "left";
}
const c7: Equal<ReturnType<typeof pick>, string> = true;

// 5. The bug this causes: a function that only accepts some literals.
type Method = "GET" | "POST";
function send(m: Method): string {
  return "sent " + m;
}
console.log(send(method)); // sent GET
// @ts-expect-error request.method widened to string
send(request.method);

// Nothing changed at run time: the value is the same string either way.
console.log(typeof request.method, request.method === method);
console.log(JSON.stringify(request), JSON.stringify(mixed));`,
      },
      {
        label: `Six ways to keep the literal, and auto-typed variables`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Method = "GET" | "POST";
function send(m: Method): string {
  return "sent " + m;
}

// Fix 1: annotate the slot with the type you mean.
const r1: { method: Method; retries: number } = { method: "GET", retries: 3 };
console.log(send(r1.method));

// Fix 2: as const freezes the whole literal (readonly + literal types).
const r2 = { method: "GET", retries: 3 } as const;
const c1: Equal<typeof r2, { readonly method: "GET"; readonly retries: 3 }> = true;
console.log(send(r2.method));

// Fix 3: a const assertion on one property only.
const r3 = { method: "POST" as const, retries: 3 };
const c2: Equal<typeof r3, { method: "POST"; retries: number }> = true;
console.log(send(r3.method));

// Fix 4: satisfies checks against Method but keeps the literal.
const r4 = { method: "GET", retries: 3 } satisfies { method: Method; retries: number };
const c3: Equal<typeof r4.method, "GET"> = true;
console.log(send(r4.method));

// Fix 5: give a function a literal return type (or return "x" as const).
function pick(): "left" | "right" {
  return "left";
}
const c4: Equal<ReturnType<typeof pick>, "left" | "right"> = true;

// Fix 6: a primitive constraint (T extends string) keeps the literal.
function wrap<T>(t: T): { tag: T } {
  return { tag: t };
}
const wrapped = wrap("x");
const c0: Equal<typeof wrapped, { tag: string }> = true;
function tag<T extends string>(t: T): { tag: T } {
  return { tag: t };
}
const tagged = tag("x");
const c6: Equal<typeof tagged, { tag: "x" }> = true;

// The opposite case: let x = null and let x; are "auto-typed".
// Their type follows each assignment instead of widening to any.
let later;
later = 1;
const c7: Equal<typeof later, number> = true;
later = "one";
const c8: Equal<typeof later, string> = true;
const list = [];
list.push(1);
const c9: Equal<typeof list, number[]> = true;

console.log(JSON.stringify([r2, r3, wrapped, tagged, pick(), later, list]));`,
      },
    ],
  },
  {
    title: `What does the satisfies operator do?`,
    difficulty: "medium",
    seoDescription: `The TypeScript satisfies operator checks a value against a type but keeps its inferred type; compared with annotations and as, with contextual typing.`,
    description: `**Question presented to candidate:**
"What does the \`satisfies\` operator do in TypeScript? How is \`const x = value satisfies T\` different from \`const x: T = value\` and from \`value as T\`?"

**What a strong answer should cover:**
- \`expr satisfies T\` checks that the expression is assignable to \`T\` (including excess-property and missing-property checks) but the expression keeps its own inferred type
- Compared with an annotation: both check, but the annotation replaces the type with \`T\`, losing per-property detail (a \`string | RGB\` value stays a union)
- Compared with \`as\`: an assertion barely checks (a missing key slips through), \`satisfies\` reports the error at the offending property
- It provides a contextual type, so callback parameters inside the object are typed and tuple targets produce tuples
- It is an expression operator: usable in returns, arguments and exports, not only on variable declarations; it is erased from the JavaScript
- Introduced in TypeScript 4.9 (November 2022)

**Code / implementation expected:** Yes — the same object written with an annotation, with \`as\`, and with \`satisfies\`, showing one compile error each would or would not catch.`,
    answer: `**Target Audience:** Developers who know type annotations and \`as\`, and want to know what \`satisfies\` adds and when to use it.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`. \`satisfies\` arrived in TypeScript 4.9 ([Announcing TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/), November 2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (a \`// @ts-expect-error\` line fails the build if the error does not happen), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

An airline has a rule: a carry-on must fit the 55 × 40 × 20 cm frame at the gate.

- **Option A:** the agent checks your bag in the frame, and then writes "standard carry-on" on the tag and forgets everything else about it. Later, nobody knows it was the small red one with the laptop.
- **Option B:** the agent does not check at all; you just say "trust me, it fits" and walk on.
- **Option C:** the agent checks it in the frame and hands it back exactly as it was. It is proven to fit, and it is still *your* bag, with everything you know about it.

A type annotation is option A, \`as\` is option B, and \`satisfies\` is option C.

📌 **Interview term: \`satisfies\` operator** — \`expression satisfies Type\` makes tsc check that the expression is assignable to \`Type\`, while the expression keeps its own, more specific inferred type.

## 2. Three Ways to Attach a Type, Side by Side

Example 1 uses a colour palette where each colour is either a hex string or an RGB tuple:

~~~ts
type Color = "red" | "green" | "blue";
type RGB = [number, number, number];
type Palette = Record<Color, string | RGB>;
~~~

**Annotation (\`const annotated: Palette = ...\`).** The object is checked, but its type *becomes* \`Palette\`, so \`annotated.red\` is \`string | RGB\`. tsc no longer knows red was a string:

~~~text
main.ts(8,15): error TS2339: Property 'toUpperCase' does not exist on type 'string | RGB'.
  Property 'toUpperCase' does not exist on type 'RGB'.
~~~

**Assertion (\`{ ... } as Palette\`).** The object is missing \`blue\`, and tsc accepts it anyway; at run time \`asserted.blue is undefined\`. An assertion only rejects types that do not overlap at all, so it is not a shape check ([What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)).

**\`satisfies\`.** The object is checked against \`Palette\`, and its type stays the inferred one: \`red\` is \`string\` and \`green\` is a \`[number, number, number]\` tuple, so both of these compile and run:

~~~ts
palette.red.toUpperCase();                    // "#FF0000"
palette.green.map((n) => n / 255).join(",");  // "0,1,0"
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="An annotation checks and replaces the type, an assertion replaces it without a full check, satisfies checks and keeps the inferred type">
  <rect class="d-box-muted" x="20" y="30" width="200" height="110" rx="10"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">x: Palette</text>
  <text class="d-sub" x="120" y="94" text-anchor="middle">checked: yes</text>
  <text class="d-sub" x="120" y="118" text-anchor="middle">type: Palette</text>
  <rect class="d-box-muted" x="260" y="30" width="200" height="110" rx="10"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">v as Palette</text>
  <text class="d-sub" x="360" y="94" text-anchor="middle">checked: barely</text>
  <text class="d-sub" x="360" y="118" text-anchor="middle">type: Palette</text>
  <rect class="d-box-accent" x="500" y="30" width="200" height="110" rx="10"/>
  <text class="d-text" x="600" y="66" text-anchor="middle">v satisfies Palette</text>
  <text class="d-sub" x="600" y="94" text-anchor="middle">checked: yes</text>
  <text class="d-sub" x="600" y="118" text-anchor="middle">type: as inferred</text>
  <rect class="d-box" x="500" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="600" y="230" text-anchor="middle">red: string</text>
  <text class="d-sub" x="600" y="254" text-anchor="middle">green: tuple</text>
  <path class="d-edge-accent" d="M 600 144 L 600 196"/>
</svg>

Only the right-hand column both checks the object and remembers the details of each property.

| | Annotation \`x: T\` | Assertion \`v as T\` | \`v satisfies T\` |
| :--- | :--- | :--- | :--- |
| Checks shape | Yes | Only that the types overlap | Yes |
| Excess property error | Yes | No | Yes |
| Missing property error | Yes | No | Yes |
| Resulting type | \`T\` | \`T\` | The inferred type of \`v\` |
| Literal values kept | No | No | When \`T\` allows literals ([details](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types)) |
| Typical use | Public contracts, variables you will reassign | Escape hatch you have proved elsewhere | Config objects, lookup tables, route maps |

## 3. Errors Are Reported Where the Mistake Is

Because \`satisfies\` checks the object literal against the target type, each mistake is reported on its own line (example 1):

~~~text
main.ts(28,3): error TS2353: Object literal may only specify known properties, and 'bleu' does not exist in type 'Partial<Palette>'.
main.ts(34,3): error TS2322: Type '[number, number]' is not assignable to type 'string | RGB'.
  Type '[number, number]' is not assignable to type 'RGB'.
    Source has 2 element(s) but target requires 3.
main.ts(39,56): error TS1360: Type '{ red: string; green: [number, number, number]; }' does not satisfy the expected type 'Palette'.
  Property 'blue' is missing in type '{ red: string; green: [number, number, number]; }' but required in type 'Palette'.
~~~

\`TS1360\` ("does not satisfy the expected type") is the code specific to \`satisfies\`; the others are the normal assignability errors.

📌 **Interview term: excess property check** — the extra check tsc applies to *fresh* object literals: a property the target type does not know about is an error, which is what catches the \`bleu\` typo.

## 4. It Gives Context, Too

\`satisfies\` is not only a check after the fact: the target type is also used as the **contextual type** while the object is being inferred. Example 2 shows two effects:

- **Callback parameters are typed.** In \`{ onSave: (doc) => ... } satisfies Handlers\`, \`doc\` gets the type from \`Handlers\`. Without the \`satisfies\`, \`doc\` would be an implicit \`any\` (tsc 5.4.5 reports \`TS7006: Parameter 'e' implicitly has an 'any' type\` in that case).
- **Tuple targets make tuples.** Example 1's \`green: [0, 255, 0]\` is inferred as \`[number, number, number]\` because the target contains a tuple type; on its own it would be \`number[]\`.

📌 **Interview term: contextual typing** — inferring the type of an expression from the type expected where it appears, such as a parameter type or a \`satisfies\` target.

## 5. Anywhere an Expression Goes

\`satisfies\` is an operator on expressions, so it is not limited to \`const\` declarations. Example 2 uses it on a return value, which keeps the discriminant literal and removes the need to narrow:

~~~ts
function unitCircle() {
  return { kind: "circle", r: 1 } satisfies Shape;
}
const c = unitCircle(); // { kind: "circle"; r: number } — c.r is usable directly
~~~

It also works on function arguments and on \`export default { ... } satisfies Config\`, a common pattern in framework config files. Like every type-only syntax it is erased: the emitted JavaScript is the plain object (example 1 prints it with \`JSON.stringify\`).

One thing it never does is *change* the type. \`const empty = [] satisfies string[]\` is still \`never[]\` (checked), so you cannot push into it. When you want the declared type, use an annotation.

📌 **Interview term: type erasure** — TypeScript removes type-only syntax such as annotations, \`as\` and \`satisfies\` when it emits JavaScript.

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`// @ts-expect-error\` line is a real error, and the messages above come from a run with the directives removed. Each example was then run as the page runs it.

Example 1, annotation vs \`as\` vs \`satisfies\`:

~~~text
asserted.blue is undefined
#FF0000
0,1,0
{"red":"#ff0000","green":[0,255,0],"blue":"#0000ff"}
~~~

Example 2, contextual typing and \`satisfies\` as an expression:

~~~text
saved Notes
deleted #7
circle 1
9
["Ada"] 0
~~~

## Common Pitfalls

- **Using \`as\` where you meant \`satisfies\`.** \`as\` let a missing \`blue\` through in example 1; \`satisfies\` reported it.
- **Expecting \`satisfies\` to widen like an annotation.** \`[] satisfies string[]\` stays \`never[]\`. If you want the variable to *have* type \`T\` (for later reassignment or pushes), annotate it.
- **Expecting every literal to survive.** \`{ mode: "dark" } satisfies { mode: string }\` gives \`mode: string\`. Literals stay only where the target allows literal types; see [How does \`satisfies\` validate shape without widening literal types?](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types)
- **Using it on public API types.** Exported values usually want a stable, named type in their declaration; \`satisfies\` exposes the inferred shape instead.
- **Using an old toolchain.** It needs TypeScript 4.9 or later, and every tool that parses your TypeScript (Babel, the ESLint parser, a bundler) must be a version that knows the new syntax.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expr satisfies T</code> checks that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expr</code> is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, then lets it keep its own inferred type. It was added in TypeScript <strong style="color:#ffca28;">4.9</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Versus an annotation:</strong> <span style="color:#f0e2c8;">An annotation checks too, but the variable becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | RGB</code> property stays a union. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">palette.red</code> is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Versus \`as\`:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> asserts and hardly checks: a missing key compiles. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> reports missing keys, excess keys and wrong values on the right line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bonus:</strong> <span style="color:#f0e2c8;">The target is also a <strong style="color:#ffca28;">contextual type</strong>, so callback parameters inside the object are typed and tuple targets produce tuples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use:</strong> <span style="color:#f0e2c8;">Config objects, lookup tables and route maps where you want validation and precise types. Use an annotation when you want the value to be exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code> change the type of the expression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only checks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[] satisfies string[]</code> is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never[]</code>, which is why you sometimes want an annotation instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value as const satisfies T</code>: readonly literals that are also validated. The other order is an error, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1355</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> only applies to literals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What error code does a failed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code> give?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a whole-object failure tsc 5.4.5 reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1360: Type ... does not satisfy the expected type</code>; for a bad property it reports the normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2322</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2353</code> on that property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there any run-time cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None. It is erased like every other type-only syntax; the emitted code is just the expression.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still prefer an annotation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For public API values and variables you will reassign or mutate, where you want the stable declared type rather than the inferred one.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`satisfies\` operator | Checks an expression against a type without changing the expression type (4.9) |
| Excess property check | Error for unknown properties in a fresh object literal |
| Contextual typing | Inferring an expression type from the type expected around it |
| \`TS1360\` | The "does not satisfy the expected type" error |
| Type erasure | Type-only syntax is removed from the emitted JavaScript |

**Conclusion:** \`satisfies\` fills the gap between an annotation and an assertion: it checks a value as strictly as an annotation, but unlike an annotation it does not throw away what tsc inferred, and unlike \`as\` it does not let mistakes through. That makes it the natural choice for configuration objects and lookup tables, where you want both "this matches the contract" and "I still know exactly what each property is." When you need the value to be exactly the declared type, an annotation remains the right tool, and how literal types survive is covered in the sibling question on [validating shape without widening literal types](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types).`,
    examples: [
      {
        label: `Annotation vs as vs satisfies on a colour palette`,
        code: `type Color = "red" | "green" | "blue";
type RGB = [number, number, number];
type Palette = Record<Color, string | RGB>;

// 1. Type annotation: checked, but every value becomes string | RGB.
const annotated: Palette = { red: "#ff0000", green: [0, 255, 0], blue: "#0000ff" };
// @ts-expect-error the annotation forgot that red is a string
annotated.red.toUpperCase();

// 2. Type assertion (as): no real check. A missing key slips through.
const asserted = { red: "#ff0000", green: [0, 255, 0] } as Palette;
console.log("asserted.blue is", typeof asserted.blue);

// 3. satisfies: checked like an annotation, typed like no annotation.
const palette = {
  red: "#ff0000",
  green: [0, 255, 0],
  blue: "#0000ff",
} satisfies Palette;
console.log(palette.red.toUpperCase()); // #FF0000
console.log(palette.green.map((n) => n / 255).join(",")); // 0,1,0

// Mistakes are still caught, at the line that has them:
const typo = {
  red: "#ff0000",
  green: [0, 255, 0],
  // @ts-expect-error bleu is not a Color
  bleu: "#0000ff",
} satisfies Partial<Palette>;

const wrongValue = {
  red: "#ff0000",
  // @ts-expect-error an RGB needs exactly three numbers
  green: [0, 255],
  blue: "#0000ff",
} satisfies Palette;

// @ts-expect-error blue is missing
const missing = { red: "#ff0000", green: [0, 255, 0] } satisfies Palette;

// 4. satisfies is erased: the emitted JavaScript is just the object.
console.log(JSON.stringify(palette));`,
      },
      {
        label: `Contextual typing and satisfies as an expression`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. satisfies gives a contextual type, so callback parameters are typed.
type Handlers = {
  onSave: (doc: { id: number; title: string }) => string;
  onDelete: (id: number) => string;
};
const handlers = {
  onSave: (doc) => "saved " + doc.title,
  onDelete: (id) => "deleted #" + id.toFixed(0),
} satisfies Handlers;
console.log(handlers.onSave({ id: 1, title: "Notes" }));
console.log(handlers.onDelete(7));

// The inferred type is the object, not Handlers: no extra keys allowed,
// and handlers has exactly these two keys.
const k1: Equal<keyof typeof handlers, "onSave" | "onDelete"> = true;

// 2. It is an expression operator: use it in returns and arguments too.
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
function unitCircle() {
  return { kind: "circle", r: 1 } satisfies Shape;
}
const c = unitCircle();
// The discriminant stays the literal "circle", so c.r needs no narrowing.
const k2: Equal<typeof c, { kind: "circle"; r: number }> = true;
console.log(c.kind, c.r);

function area(s: Shape): number {
  return s.kind === "circle" ? Math.PI * s.r * s.r : s.side * s.side;
}
console.log(area({ kind: "square", side: 3 } satisfies Shape));

// 3. satisfies never changes the type: an empty array stays never[].
const empty = [] satisfies string[];
const k3: Equal<typeof empty, never[]> = true;
// To get a usable string[] here, annotate instead.
const names: string[] = [];
names.push("Ada");
console.log(JSON.stringify(names), empty.length);`,
      },
    ],
  },
  {
    title: `How does \`satisfies\` validate shape without widening literal types?`,
    difficulty: "medium",
    seoDescription: `Which literal types satisfies keeps and which still widen, why keys always survive, exhaustive Record maps, and when to write as const satisfies.`,
    description: `**Question presented to candidate:**
"You have a route map or theme config checked with \`satisfies\`. Which literal types survive and which still widen? Walk me through why, and when you would add \`as const\`."

**What a strong answer should cover:**
- \`satisfies T\` supplies \`T\` as the contextual type; a literal is kept when the contextual type at that position contains literal types of the same kind, and widened otherwise
- So \`{ mode: "dark" } satisfies { mode: "dark" | "light" }\` keeps \`"dark"\`, but \`satisfies { mode: string }\` or \`Record<string, unknown>\` gives \`string\`
- Keys are always kept: \`keyof typeof routes\` is \`"home" | "about"\`, while an annotation with \`Record<string, string>\` turns keys into \`string\` and accepts typos
- \`satisfies Record<Union, V>\` makes a map exhaustive: a missing or extra key is a compile error
- \`as const satisfies T\` gives validated, deeply readonly literals; the order matters (\`satisfies T as const\` is error TS1355); with arrays, check against a \`readonly\` array type
- A tuple target such as \`[number, number]\` produces a tuple without \`as const\`

**Clarifying questions expected:**
- Should the values be readonly constants, or will they be changed later?
- Do callers need the literal values (for example to derive a union of paths) or only the keys?

**Code / implementation expected:** Yes — the same object checked against a literal-union target and a \`string\` target, with \`Equal\` checks proving which literals survive, plus an \`as const satisfies\` route map.`,
    answer: `**Target Audience:** Developers who already use \`satisfies\` and want to predict exactly which types it keeps, for config objects, route maps and lookup tables.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`; every "kept" or "widened" claim below is an \`Equal\` check that tsc verified.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. This doc is the applied follow-up to [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do), which covers the basics (annotation vs \`as\` vs \`satisfies\`); here the focus is the literal-type rules. The **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A tailor checks whether a suit meets the dress code of a wedding. If the dress code says "dark colours," the tailor writes down "navy" — the exact colour, since the code talks about colours specifically. If the dress code only says "wear clothes," the tailor writes down "clothing" and moves on: nothing about the code asked for detail, so no detail is recorded.

\`satisfies\` behaves like that tailor. It does not keep every literal by magic. It keeps a literal when the type you check against *talks about literals* at that spot, and it widens when the type only says "some string."

## 2. The Rule

When tsc infers the type of an object literal, each property value is a fresh literal like \`"dark"\`. Normally a property is a mutable slot, so the literal widens ([What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it)). But tsc first looks at the **contextual type** for that position. If the contextual type contains literal types of the same kind (string literals for a string, number literals for a number), the literal is kept.

\`satisfies T\` makes \`T\` the contextual type. So:

| Expression | Inferred type (checked with \`Equal\`) | Why |
| :--- | :--- | :--- |
| \`{ mode: "dark", scale: 2 } satisfies { mode: "dark" \\| "light"; scale: number }\` | \`{ mode: "dark"; scale: number }\` | \`mode\` target has string literals; \`scale\` target is plain \`number\` |
| \`{ mode: "dark" } satisfies { mode: string }\` | \`{ mode: string }\` | Target is plain \`string\`: widened |
| \`{ mode: "dark" } satisfies Record<string, unknown>\` | \`{ mode: string }\` | \`unknown\` contains no literals: widened |
| \`{ button: "sm", gap: 8 } satisfies Record<string, "sm" \\| "md" \\| number>\` | \`{ button: "sm"; gap: number }\` | String literals in the target keep \`"sm"\`; no number literals, so \`8\` widens |

The second row is the one many write-ups get wrong: \`satisfies\` is often described as "never widens," but against a \`string\` target, it does.

📌 **Interview term: contextual type** — the type expected at a position, here the property type of the \`satisfies\` target. Literal types in it are what stop a literal from widening.

📌 **Interview term: literal preservation** — keeping the inferred literal type (\`"dark"\`) instead of its base type (\`string\`). With \`satisfies\`, it happens per property, per primitive kind.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A literal dark checked against a literal union keeps its literal type, checked against string it widens">
  <defs>
    <marker id="s4arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="260" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">mode: "dark"</text>
  <rect class="d-box-accent" x="40" y="180" width="240" height="80" rx="10"/>
  <text class="d-text" x="160" y="212" text-anchor="middle">target "dark" | "light"</text>
  <text class="d-sub" x="160" y="240" text-anchor="middle">kept as "dark"</text>
  <rect class="d-box-muted" x="440" y="180" width="240" height="80" rx="10"/>
  <text class="d-text" x="560" y="212" text-anchor="middle">target string</text>
  <text class="d-sub" x="560" y="240" text-anchor="middle">widened to string</text>
  <path class="d-edge-accent" d="M 310 84 L 190 176" marker-end="url(#s4arrow)"/>
  <path class="d-edge-dashed" d="M 410 84 L 530 176" marker-end="url(#s4arrow)"/>
</svg>

The same literal goes two ways depending only on what the target type says at that property.

## 3. Keys Are Always Kept

Even when values widen, the **keys** of the object are its own. This is often the bigger win. Example 1:

~~~ts
const routes = { home: "/", about: "/about" } satisfies Record<string, string>;
// keyof typeof routes is "home" | "about"
routes.contact;          // error TS2339

const annotatedRoutes: Record<string, string> = { home: "/", about: "/about" };
// keyof typeof annotatedRoutes is string
annotatedRoutes.contcat; // no error: undefined at run time
~~~

~~~text
main.ts(24,8): error TS2339: Property 'contact' does not exist on type '{ home: string; about: string; }'.
~~~

The annotated version prints \`typo via annotation: undefined\`. The \`satisfies\` version made the same typo a compile error ([What is the Record utility type?](/interview-question/what-is-the-record-utility-type)).

## 4. Exhaustive Maps with \`Record<Union, V>\`

Check a lookup table against \`Record<Status, string>\` and you get two guarantees at once: every \`Status\` has an entry (missing one is \`TS1360 ... Property 'x' is missing\`), and no unknown key sneaks in (excess property error). Example 1's \`label\` map has all three statuses, and \`show("loading")\` prints \`Working...\`. Adding a fourth status to the union immediately flags every map that forgot it — the object-shaped cousin of [exhaustiveness checking](/interview-question/how-do-you-do-exhaustiveness-checking).

## 5. When You Need Every Literal: \`as const satisfies\`

Route objects usually need their *values* precise too, so you can derive a union of paths. Example 2 compares:

~~~ts
type Route = { path: string; auth: boolean };

const r1 = { admin: { path: "/admin", auth: true }, ... } satisfies Record<string, Route>;
// r1.admin.path is string — the target says string

const r2 = { admin: { path: "/admin", auth: true }, ... } as const satisfies Record<string, Route>;
// r2.admin is { readonly path: "/admin"; readonly auth: true }
type Path = (typeof r2)[keyof typeof r2]["path"];   // "/" | "/admin"
~~~

\`as const\` makes every literal exact and readonly; \`satisfies\` still checks the shape. A function typed \`(p: Path)\` then rejects anything else:

~~~text
main.ts(24,4): error TS2345: Argument of type '"/login"' is not assignable to parameter of type '"/" | "/admin"'.
~~~

The order matters: \`as const\` must be applied to the literal itself, so \`{ a: 1 } satisfies Record<string, number> as const\` is rejected:

~~~text
main.ts(28,29): error TS1355: A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals.
~~~

📌 **Interview term: \`as const satisfies\`** — the combination that gives deeply readonly literal types *and* a shape check: \`value as const satisfies T\`.

## 6. Arrays and Tuples

- **Check \`as const\` arrays against a readonly type.** \`["news", "sport"] as const satisfies readonly string[]\` gives \`readonly ["news", "sport"]\`.
- **A mutable target changes the result.** On 5.4.5, \`["news", "sport"] as const satisfies string[]\` compiles and gives the *mutable* tuple \`["news", "sport"]\` (checked with \`Equal\`): the readonly part is dropped to fit the target. This was observed on 5.4.5; if you want the readonly tuple, write the target as \`readonly string[]\`.
- **A tuple target makes a tuple without \`as const\`.** \`[3, 4] satisfies [number, number]\` is \`[number, number]\`, so \`Math.hypot(...point)\` is typed as a two-argument call and prints \`5\`.

## 7. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal\` check compiles, and each \`// @ts-expect-error\` line is a real error (messages quoted above from a run with the directives removed). Each example was then run as the page runs it.

Example 1, which literals survive, keys, and exhaustive maps:

~~~text
typo via annotation: undefined
Working... 3
{"button":"sm","gap":8}
~~~

Example 2, \`as const satisfies\`, order, arrays and tuples:

~~~text
navigate /admin
5
{"home":{"path":"/","auth":false},"admin":{"path":"/admin","auth":true}} news+sport 2
~~~

## Common Pitfalls

- **Believing \`satisfies\` never widens.** Against \`{ mode: string }\`, \`"dark"\` becomes \`string\`. Make the target a literal union, or add \`as const\`.
- **Checking against a wide type and expecting value literals.** \`Record<string, unknown>\` keeps the keys but widens every value.
- **Writing \`satisfies T as const\`.** It is \`TS1355\`; write \`as const satisfies T\`.
- **Pairing \`as const\` with a mutable array target.** You quietly lose \`readonly\`; use \`readonly X[]\` in the target.
- **Annotating instead of satisfying a lookup table.** \`const m: Record<string, string>\` turns every typo into \`undefined\` at run time; \`satisfies\` makes it a compile error.
- **Choosing between tools at random.** For the design choice between \`satisfies\`, \`NoInfer\` and \`const\` type parameters, see [How do you choose between \`NoInfer<T>\`, \`satisfies\`, and \`const\` type params when designing APIs?](/interview-question/how-do-you-choose-between-noinfer-t-satisfies-and-const-type-params-when-designi)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The mechanism:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies T</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> the <strong style="color:#ffca28;">contextual type</strong> of the expression. tsc keeps a literal when the contextual type at that spot contains literal types, otherwise it widens as usual.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Example:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ mode: "dark" } satisfies { mode: "dark" | "light" }</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"dark"</code>, but the same object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies { mode: string }</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mode: string</code>. I verified that with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Equal</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keys:</strong> <span style="color:#f0e2c8;">Keys are always kept, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof typeof routes</code> is the exact key union, unlike an annotation with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, string&gt;</code>, where any typo compiles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Exhaustive tables:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies Record&lt;Status, string&gt;</code> errors on a missing or extra key, so adding a status flags every map that forgot it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Full precision:</strong> <span style="color:#f0e2c8;">For readonly literal values plus validation, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const satisfies T</code>. The order matters, and for arrays the target should be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly X[]</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"dark"</code> widen with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies { mode: string }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the contextual type for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mode</code> is plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, which contains no literal types, so the normal widening rule for a mutable property applies. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> only stops widening where the target talks about literals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you derive a union of all route paths from a route map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write the map <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const satisfies Record&lt;string, Route&gt;</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Path = (typeof routes)[keyof typeof routes]["path"]</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Route</code> says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const satisfies string[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On 5.4.5 it compiles and gives a mutable tuple, dropping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly</code> to fit the target. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly string[]</code> to keep the readonly tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as const</code> alone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> keeps the literals but checks nothing: a misspelled key or a wrong value type is accepted. Adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> gives the shape check on top.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Contextual type | The type expected at a position; literal types in it stop widening |
| Literal preservation | Keeping \`"dark"\` rather than \`string\`, decided per property and per primitive kind |
| \`as const satisfies\` | Readonly literal types plus a shape check |
| Exhaustive map | A \`Record<Union, V>\` check that requires every key of the union |

**Conclusion:** \`satisfies\` keeps literal types by giving tsc a contextual type, not by switching widening off. A literal survives when the target type mentions literal types at that property, keys always survive, and a plain \`string\` or \`unknown\` target lets values widen as they normally would. When you need every value exact and readonly — route paths, design tokens, translation keys — combine the two tools as \`as const satisfies T\`, and write array targets as \`readonly\` so nothing is silently dropped.`,
    examples: [
      {
        label: `Which literals survive, keys and exhaustive maps`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Rule: a literal stays a literal when the contextual type at that spot
// contains literal types. satisfies supplies that contextual type.

// 1. The target property is a literal union: "dark" is kept.
const a = { mode: "dark", scale: 2 } satisfies { mode: "dark" | "light"; scale: number };
const k1: Equal<typeof a, { mode: "dark"; scale: number }> = true;

// 2. The target property is plain string: "dark" widens to string.
const b = { mode: "dark" } satisfies { mode: string };
const k2: Equal<typeof b, { mode: string }> = true;

// 3. A wide target like {} or Record<string, unknown> widens every property.
const c = { mode: "dark" } satisfies Record<string, unknown>;
const k3: Equal<typeof c, { mode: string }> = true;

// 4. But KEYS are always kept: that is the part a wide annotation loses.
const routes = { home: "/", about: "/about" } satisfies Record<string, string>;
const k4: Equal<keyof typeof routes, "home" | "about"> = true;
const annotatedRoutes: Record<string, string> = { home: "/", about: "/about" };
const k5: Equal<keyof typeof annotatedRoutes, string> = true;
// @ts-expect-error routes has no key "contact"
routes.contact;
// No error: any string key is allowed by the annotation, even a typo.
console.log("typo via annotation:", annotatedRoutes.contcat);

// 5. Exhaustive maps: Record<Union, ...> plus satisfies forces every key.
type Status = "idle" | "loading" | "error";
const label = {
  idle: "Ready",
  loading: "Working...",
  error: "Failed",
} satisfies Record<Status, string>;
function show(s: Status): string {
  return label[s];
}
console.log(show("loading"), Object.keys(label).length);

// 6. Per primitive: Size contains string literal types, so "sm" is kept;
//    it contains no number literal types, so 8 widens to number.
type Size = "sm" | "md" | number;
const sizes = { button: "sm", gap: 8 } satisfies Record<string, Size>;
const k6: Equal<typeof sizes, { button: "sm"; gap: number }> = true;
console.log(JSON.stringify(sizes));`,
      },
      {
        label: `as const satisfies, order, arrays and tuples`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Route = { path: string; auth: boolean };

// 1. satisfies alone: keys kept, but path widens to string.
const r1 = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} satisfies Record<string, Route>;
const k1: Equal<typeof r1.admin.path, string> = true;

// 2. as const satisfies: validated AND every value literal and readonly.
const r2 = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} as const satisfies Record<string, Route>;
const k2: Equal<typeof r2.admin, { readonly path: "/admin"; readonly auth: true }> = true;
type Path = (typeof r2)[keyof typeof r2]["path"];
const k3: Equal<Path, "/" | "/admin"> = true;
function go(p: Path): string {
  return "navigate " + p;
}
console.log(go(r2.admin.path));
// @ts-expect-error "/login" is not one of the declared paths
go("/login");

// 3. The order matters: as const must touch the literal itself.
// @ts-expect-error as const cannot be applied to a satisfies expression
const wrongOrder = { a: 1 } satisfies Record<string, number> as const;

// 4. Arrays: with as const, check against a readonly array type.
const tags = ["news", "sport"] as const satisfies readonly string[];
const k4: Equal<typeof tags, readonly ["news", "sport"]> = true;
// Seen on 5.4.5: a mutable target makes as const give a mutable tuple.
const tags2 = ["news", "sport"] as const satisfies string[];
const k5: Equal<typeof tags2, ["news", "sport"]> = true;

// 5. A tuple target gives a tuple even without as const.
const point = [3, 4] satisfies [number, number];
const k6: Equal<typeof point, [number, number]> = true;
console.log(Math.hypot(...point)); // 5

console.log(JSON.stringify(r2), tags.join("+"), tags2.length);`,
      },
    ],
  },
  {
    title: `What are \`const\` type parameters (\`<const T>\`) and why are they better than \`as const\`?`,
    difficulty: "medium",
    seoDescription: `TypeScript 5.0 const type parameters infer literal, readonly types without as const at the call site; limits, readonly constraints and TS1277.`,
    description: `**Question presented to candidate:**
"TypeScript 5.0 added \`const\` type parameters, as in \`function f<const T>(x: T)\`. What do they do, and why would a library author use them instead of asking callers to write \`as const\`?"

**What a strong answer should cover:**
- \`<const T>\` makes tsc infer \`T\` as if the argument literal had been written \`as const\`: literal types, readonly properties and readonly tuples, all the way down
- The benefit: the precision is decided once by the function author, not remembered by every caller; the call site stays clean
- Limits: it only affects literals written in the call (a variable that was already widened stays widened), an explicit type argument turns it off, and the result is readonly
- Constraints matter: use \`readonly unknown[]\`-style array constraints; with a mutable array constraint, 5.0 fell back to the constraint, and 5.3 relaxed that (on 5.4.5 the result is a mutable tuple)
- Allowed on type parameters of functions, methods and classes, not interfaces or type aliases (error TS1277); it is erased at run time and freezes nothing

**Code / implementation expected:** Yes — a small \`defineOptions\` or \`defineRoutes\` helper written with and without \`const\`, with \`Equal\` checks of the inferred type.`,
    answer: `**Target Audience:** Developers writing helpers such as \`defineConfig\`, \`defineRoutes\` or typed event lists, who want callers to get exact literal types without extra syntax.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`. \`const\` type parameters arrived in TypeScript 5.0 ([PR #51865](https://github.com/microsoft/TypeScript/pull/51865), released March 2023).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` with \`Equal<...>\` checks and \`// @ts-expect-error\` lines, and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A coffee shop wants every order written down exactly: "oat flat white, extra hot," not "coffee." For years the shop put up a sign asking each customer to *spell out* their order precisely. Most did; some forgot, and their cups came out as "coffee."

Then the shop changed the form instead: the order pad now has a box for every detail. Customers just answer, and the precision is built into the pad.

\`as const\` is the sign: each caller has to remember it. A \`const\` type parameter is the new order pad: the function author asks for exact types once, and every caller gets them for free.

📌 **Interview term: \`const\` type parameter** — a type parameter declared with the \`const\` modifier (\`<const T>\`). When tsc infers \`T\` from an argument, it infers the argument as if it had been written \`as const\`.

## 2. The Problem It Solves

Generic functions widen what they infer, like any other inference ([What is type widening and how do you prevent it?](/interview-question/what-is-type-widening-and-how-do-you-prevent-it)). Example 1:

~~~ts
function plainOptions<T extends readonly string[]>(opts: T): T { return opts; }

const a = plainOptions(["small", "large"]);           // string[]
const b = plainOptions(["small", "large"] as const);  // readonly ["small", "large"]
~~~

Before TypeScript 5.0, the only way to get \`"small" | "large"\` out of that helper was for the caller to add \`as const\` ([What does as const do?](/interview-question/what-does-as-const-do)). Library docs had to say "remember to add \`as const\`," and callers who forgot got silently weaker types.

With one word in the declaration, the function asks for it:

~~~ts
function constOptions<const T extends readonly string[]>(opts: T): T { return opts; }

const c = constOptions(["small", "large"]);   // readonly ["small", "large"]
type Option = (typeof c)[number];             // "small" | "large"
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Without const the array literal is inferred as string array, with a const type parameter it is inferred as a readonly tuple of literals">
  <defs>
    <marker id="c5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="230" y="20" width="260" height="60" rx="10"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">f(["small", "large"])</text>
  <rect class="d-box-muted" x="30" y="180" width="270" height="80" rx="10"/>
  <text class="d-text" x="165" y="212" text-anchor="middle">f&lt;T&gt;</text>
  <text class="d-sub" x="165" y="240" text-anchor="middle">T is string[]</text>
  <rect class="d-box-accent" x="420" y="180" width="270" height="80" rx="10"/>
  <text class="d-text" x="555" y="212" text-anchor="middle">f&lt;const T&gt;</text>
  <text class="d-sub" x="555" y="240" text-anchor="middle">readonly ["small", "large"]</text>
  <path class="d-edge-dashed" d="M 300 84 L 190 176" marker-end="url(#c5arrow)"/>
  <path class="d-edge-accent" d="M 420 84 L 530 176" marker-end="url(#c5arrow)"/>
</svg>

The call site is identical in both cases; only the declaration decides how precise the inferred type is.

## 3. It Goes as Deep as \`as const\`

The PR that added the feature describes it as applying a const context to the literals in the argument: string, numeric and boolean literals, array literals and object literals. Example 1 shows a nested config:

~~~ts
function define<const T>(config: T): T { return config; }

const cfg = define({ env: "prod", ports: [80, 443], debug: false });
// { readonly env: "prod"; readonly ports: readonly [80, 443]; readonly debug: false }
~~~

And because \`T\` *itself* is the literal type, even a \`let\` does not widen the result: \`let size = define("small")\` has type \`"small"\` (checked).

📌 **Interview term: const context** — the inference mode that \`as const\` turns on: literals keep their literal types, arrays become readonly tuples, object properties become readonly.

## 4. Why It Is Better Than \`as const\` — and When It Is Not

| | Caller writes \`as const\` | \`<const T>\` on the function |
| :--- | :--- | :--- |
| Who must remember | Every caller, every call | The function author, once |
| Call site | \`f([...] as const)\` | \`f([...])\` |
| Affects a variable passed in | Only if the variable was declared \`as const\` | No: only literals written in the call |
| Can the caller opt out | Leave out \`as const\` | Pass an explicit type argument, \`f<string[]>(...)\` |
| Where it can appear | Any literal expression | Type parameters of functions, methods and classes |

So \`<const T>\` is better for **APIs**: it moves the decision to the one place that knows the types must be exact, and it removes noise from every call. \`as const\` is still the tool for **values**: a constant declared once and used in many places.

## 5. The Limits, Checked

Example 2 checks each one.

**Only literals in the call are affected.** \`const list = ["a", "b"]\` is already \`string[]\` when it is declared. \`keep(list)\` returns \`string[]\`. The fix is \`as const\` where the variable is declared.

**An explicit type argument wins.** \`keep<string[]>(["a", "b"])\` is \`string[]\`: there is no inference left to change.

**The result is readonly**, which is the point but can surprise:

~~~text
main.ts(22,6): error TS2339: Property 'push' does not exist on type 'readonly ["x", "y"]'.
~~~

\`readonly\` is a compile-time promise only. Example 2 silences that line with \`// @ts-expect-error\`, and the push really runs: \`tags at run time: x,y,z\`. A \`const\` type parameter freezes nothing.

**Array constraints should be readonly.** The original PR says that a \`const\` type parameter constrained to a *mutable* array type fails to infer a tuple, because a readonly tuple is not assignable to \`unknown[]\`, and inference falls back to the constraint. TypeScript 5.3 relaxed this ([Total TypeScript on the 5.3 change](https://totaltypescript.com/the-typescript-5-3-feature-they-didn-t-tell-you-about)): on 5.4.5, \`mut<const T extends string[]>(["a", "b"])\` infers the *mutable* tuple \`["a", "b"]\` (checked). Write \`readonly unknown[]\` style constraints and you get the readonly tuple on every version since 5.0.

**Not on interfaces or type aliases.**

~~~text
main.ts(51,12): error TS1277: 'const' modifier can only appear on a type parameter of a function, method or class
~~~

Classes are fine: \`new Registry(["user", "admin"])\` infers \`items\` as \`readonly ["user", "admin"]\`.

**Rest parameters become a precise tuple.** \`args<const T extends readonly unknown[]>(...xs: T)\` called as \`args("id", 42, true)\` gives \`readonly ["id", 42, true]\` — useful for typed event or column lists.

📌 **Interview term: inference candidate** — the type tsc collects for \`T\` from an argument; the \`const\` modifier changes how that candidate is inferred from literal arguments, not what values exist at run time.

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal\` check compiles, and each \`// @ts-expect-error\` line is a real error (messages quoted above from a run with the directives removed). Each example was then run as the page runs it.

Example 1, plain generic vs \`as const\` vs \`<const T>\`:

~~~text
["small","large"] ["small","large"] false
prod 80/443 small
~~~

\`false\` is \`Object.isFrozen(c)\`: the value is an ordinary array.

Example 2, the limits:

~~~text
[["a","b"],["a","b"],["a","b"],["a","b"],["id",42,true],["user","admin"]]
tags at run time: x,y,z
~~~

All the run-time values look the same; the differences are entirely in the types, which the \`Equal\` checks prove.

## Common Pitfalls

- **Expecting it to work on variables.** Only literals written inside the call get the const context; an already widened \`string[]\` variable stays \`string[]\`.
- **Using a mutable array constraint.** \`T extends string[]\` behaved differently before 5.3 and gives a mutable tuple after; use \`readonly string[]\` for predictable readonly results.
- **Mutating the result inside the function.** \`T\` is readonly; copy it first (\`[...opts]\`) if the function needs a mutable array.
- **Thinking it freezes values.** It is erased; call \`Object.freeze\` if you need run-time immutability.
- **Putting \`const\` on an interface or type alias.** It is \`TS1277\`; put it on the function, method or class that infers the type.
- **Using it where precise types are not needed.** Readonly literal types are harder to pass to APIs that want \`string[]\`; use it for definition helpers, not for every generic. For choosing between this, \`satisfies\` and \`NoInfer\`, see [How do you choose between \`NoInfer<T>\`, \`satisfies\`, and \`const\` type params when designing APIs?](/interview-question/how-do-you-choose-between-noinfer-t-satisfies-and-const-type-params-when-designi)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> type parameter, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;const T&gt;</code>, added in TypeScript <strong style="color:#ffca28;">5.0</strong>, makes tsc infer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> from an argument as if the caller had written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What you get:</strong> <span style="color:#f0e2c8;">Literal types, readonly properties and readonly tuples, deeply: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(["a", "b"])</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly ["a", "b"]</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T[number]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a" | "b"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why better than \`as const\`:</strong> <span style="color:#f0e2c8;">The function author decides once; callers write nothing and cannot forget. That is ideal for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineConfig</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineRoutes</code> style helpers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">It only affects literals written in the call, an explicit type argument turns it off, and it is erased, so it freezes nothing at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotchas:</strong> <span style="color:#f0e2c8;">Use readonly array constraints, since a mutable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends string[]</code> fell back to the constraint before 5.3. It is allowed only on functions, methods and classes, otherwise tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1277</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;const T&gt;</code> affect a variable passed as the argument?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A variable declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const list = ["a", "b"]</code> is already <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keep(list)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code>. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> at the declaration if you need the tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should the constraint be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">readonly unknown[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The inferred type is a readonly tuple, which is not assignable to a mutable array. In 5.0 inference fell back to the constraint; 5.3 relaxed it and 5.4.5 infers a mutable tuple. A readonly constraint gives the readonly tuple everywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class have a const type parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Registry&lt;const T&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Registry(["user", "admin"])</code> infers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readonly ["user", "admin"]</code>. Interfaces and type aliases cannot, because nothing is inferred from a call there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a caller get the wide type if they want it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the type argument explicitly, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keep&lt;string[]&gt;(["a", "b"])</code>, or pass an already widened variable.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`const\` type parameter | \`<const T>\`: infer \`T\` as if the argument were written \`as const\` (5.0) |
| Const context | Inference mode with literal types, readonly properties and readonly tuples |
| Inference candidate | The type tsc collects for a type parameter from an argument |

**Conclusion:** A \`const\` type parameter moves the \`as const\` decision from every call site into the function declaration, so helpers like \`defineRoutes\` or \`defineOptions\` give callers exact, readonly literal types with no extra syntax. It only applies to literals written in the call, it gives way to explicit type arguments, it is purely a compile-time feature, and it works best with readonly array constraints. Use \`as const\` for constant values you declare once, and \`<const T>\` for APIs that should always infer precisely.`,
    examples: [
      {
        label: `Plain generic vs as const vs a const type parameter`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A helper that should remember exactly which options it was given.
function plainOptions<T extends readonly string[]>(opts: T): T {
  return opts;
}
function constOptions<const T extends readonly string[]>(opts: T): T {
  return opts;
}

// 1. Plain generic: the array literal widens to string[].
const a = plainOptions(["small", "large"]);
const k1: Equal<typeof a, string[]> = true;

// 2. The old fix: every CALLER must remember as const.
const b = plainOptions(["small", "large"] as const);
const k2: Equal<typeof b, readonly ["small", "large"]> = true;

// 3. const type parameter: the FUNCTION asks for it once, callers write nothing.
const c = constOptions(["small", "large"]);
const k3: Equal<typeof c, readonly ["small", "large"]> = true;
type Option = (typeof c)[number];
const k4: Equal<Option, "small" | "large"> = true;

// 4. It goes deep, just like as const: objects become readonly literals.
function define<const T>(config: T): T {
  return config;
}
const cfg = define({ env: "prod", ports: [80, 443], debug: false });
const k5: Equal<
  typeof cfg,
  { readonly env: "prod"; readonly ports: readonly [80, 443]; readonly debug: false }
> = true;

// 5. And even a let does not widen it: T itself is the literal type.
let size = define("small");
const k6: Equal<typeof size, "small"> = true;

// 6. Run time: nothing changes. const T is erased; values are untouched.
console.log(JSON.stringify(a), JSON.stringify(c), Object.isFrozen(c));
console.log(cfg.env, cfg.ports.join("/"), size);`,
      },
      {
        label: `The limits: variables, explicit type arguments, constraints and classes`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function keep<const T>(x: T): T {
  return x;
}

// Limit 1: it only affects literals written IN the call.
const list = ["a", "b"]; // already widened to string[] here
const fromVar = keep(list);
const k2: Equal<typeof fromVar, string[]> = true;
// The variable needs as const where it is declared.
const fixedList = ["a", "b"] as const;
const fixed = keep(fixedList);
const k3: Equal<typeof fixed, readonly ["a", "b"]> = true;

// Limit 2: an explicit type argument switches inference off.
const explicit = keep<string[]>(["a", "b"]);
const k4: Equal<typeof explicit, string[]> = true;

// Limit 3: the result is readonly, so it cannot be mutated.
const tags = keep(["x", "y"]);
// @ts-expect-error push does not exist on a readonly tuple
tags.push("z");

// Constraint choice. A readonly array constraint keeps readonly tuples.
function ro<const T extends readonly string[]>(x: T): T {
  return x;
}
const r = ro(["a", "b"]);
const k5: Equal<typeof r, readonly ["a", "b"]> = true;
// A mutable array constraint: on 5.4.5 the tuple is inferred but mutable.
function mut<const T extends string[]>(x: T): T {
  return x;
}
const m = mut(["a", "b"]);
const k6: Equal<typeof m, ["a", "b"]> = true;

// Rest parameters become a precise tuple of the arguments.
function args<const T extends readonly unknown[]>(...xs: T): T {
  return xs;
}
const t = args("id", 42, true);
const k7: Equal<typeof t, readonly ["id", 42, true]> = true;

// Classes accept const type parameters; interfaces and type aliases do not.
class Registry<const T> {
  constructor(public readonly items: T) {}
}
const reg = new Registry(["user", "admin"]);
const k8: Equal<typeof reg.items, readonly ["user", "admin"]> = true;
// @ts-expect-error const is only allowed on functions, methods and classes
type Alias<const T> = T;

console.log(JSON.stringify([fromVar, explicit, r, m, t, reg.items]));
// readonly is type-only: the silenced push above really ran.
console.log("tags at run time:", tags.join(","));`,
      },
    ],
  },
];

export default augments;
