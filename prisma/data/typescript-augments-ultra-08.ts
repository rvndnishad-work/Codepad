/**
 * TYPESCRIPT ULTRA — batch 08: Utility types and async (Partial / Pick / Omit,
 * Exclude / Extract / NonNullable, ReturnType / Parameters, Awaited, typing
 * async functions and Promises). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are utility types like Partial, Pick, and Omit?`,
    difficulty: "medium",
    seoDescription: `Partial, Required, Readonly, Pick and Omit derive new object types from one source type: how each works, where they are shallow and the Omit-on-union trap.`,
    description: `**Question presented to candidate:**
"TypeScript ships utility types like \`Partial\`, \`Pick\` and \`Omit\`. What do they do, how are they built, and when would you reach for each one in real code?"

**What a strong answer should cover:**
- They are generic types in the standard library that derive a new object type from an existing one, so one source type stays the single source of truth
- \`Partial<T>\` makes every property optional, \`Required<T>\` makes every property mandatory, \`Readonly<T>\` makes every property readonly, \`Pick<T, K>\` keeps keys \`K\`, \`Omit<T, K>\` drops keys \`K\`
- They are mapped types over \`keyof T\` (\`Omit\` is \`Pick\` plus \`Exclude\`), and they are shallow: nested objects are not changed
- Typical uses: update patches (\`Partial<Omit<User, "id">>\`), create inputs (\`Omit<User, "id">\`), previews (\`Pick\`), and combining them (make only some keys optional)
- Traps: \`Omit\` does not check its keys, \`Omit\` on a union collapses it to the shared keys, and \`Partial\` lets a spread overwrite a value with \`undefined\`

**Clarifying questions expected:**
- Should the derived type change if the source type changes (derive it), or is it a separate contract (write it out)?
- Is \`exactOptionalPropertyTypes\` on? It changes what an optional property may hold

**Code / implementation expected:** Optional — derive a patch and a create type from one interface, or write \`Partial\` by hand as a mapped type.`,
    answer: `**Target Audience:** Developers who write interfaces by hand and want to derive the variants (patch, create, preview) instead of copying them.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release versions are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A restaurant has one master recipe card for its lasagne. The waiter needs a card with only the name and the price. The supplier needs everything except the price. A cook adjusting tonight's batch needs a card where every line is optional: "change only the salt". Nobody rewrites the recipe three times — they photocopy the master card and cover or uncover lines. When the chef changes the recipe, every copy is updated automatically.

Utility types are that photocopier. You write \`User\` once, and describe the variants as operations on it: "\`User\` with every field optional", "only \`id\` and \`name\` of \`User\`", "\`User\` without \`id\`". When someone adds a field to \`User\`, every derived type picks it up, and the compiler tells you everywhere the change matters.

📌 **Interview term: utility type** — a generic type shipped in TypeScript standard library (\`lib.es5.d.ts\`) that transforms another type. \`Partial\`, \`Required\`, \`Readonly\`, \`Pick\`, \`Omit\`, \`Record\`, \`Exclude\`, \`ReturnType\` and \`Awaited\` are the ones interviewers ask about most.

📌 **Interview term: single source of truth** — one declared type from which the others are derived, so they cannot drift apart.

## 2. The Five Object Utilities

Given:

~~~ts
interface User {
  id: number;
  name: string;
  email: string;
  nickname?: string;
}
~~~

| Utility | What it does | Result for \`User\` |
| :--- | :--- | :--- |
| \`Partial<User>\` | every property optional | \`{ id?: number; name?: string; email?: string; nickname?: string }\` |
| \`Required<User>\` | every property mandatory | \`nickname\` becomes \`string\`, no \`?\` |
| \`Readonly<User>\` | every property \`readonly\` | assigning \`frozen.name\` is an error |
| \`Pick<User, "id" \\| "name">\` | keep only those keys | \`{ id: number; name: string }\` |
| \`Omit<User, "id">\` | drop those keys | \`{ name: string; email: string; nickname?: string }\` |

Each row is an \`Equal<...>\` line in example 1 that tsc accepts.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="User has four keys. Pick keeps id and name. Omit of id keeps name, email and nickname.">
  <defs>
    <marker id="q1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="80" width="200" height="170" rx="10"/>
  <text class="d-text" x="140" y="112" text-anchor="middle">User</text>
  <text class="d-sub" x="140" y="146" text-anchor="middle">id: number</text>
  <text class="d-sub" x="140" y="172" text-anchor="middle">name: string</text>
  <text class="d-sub" x="140" y="198" text-anchor="middle">email: string</text>
  <text class="d-sub" x="140" y="224" text-anchor="middle">nickname?: string</text>
  <rect class="d-box" x="460" y="30" width="260" height="100" rx="10"/>
  <text class="d-text" x="590" y="62" text-anchor="middle">Pick of id and name</text>
  <text class="d-sub" x="590" y="90" text-anchor="middle">id: number</text>
  <text class="d-sub" x="590" y="114" text-anchor="middle">name: string</text>
  <rect class="d-box" x="460" y="190" width="260" height="120" rx="10"/>
  <text class="d-text" x="590" y="222" text-anchor="middle">Omit of id</text>
  <text class="d-sub" x="590" y="250" text-anchor="middle">name: string</text>
  <text class="d-sub" x="590" y="274" text-anchor="middle">email: string</text>
  <text class="d-sub" x="590" y="298" text-anchor="middle">nickname?: string</text>
  <path class="d-edge-accent" d="M 244 130 L 454 84" marker-end="url(#q1arrow)"/>
  <path class="d-edge" d="M 244 200 L 454 246" marker-end="url(#q1arrow)"/>
</svg>

\`Pick\` names what to keep; \`Omit\` names what to throw away. Use whichever list is shorter and more stable: if new fields should appear in the derived type automatically, \`Omit\` does that; if they should not, \`Pick\` does.

📌 **Interview term: Partial / Required / Readonly** — the three "modifier" utilities: they keep every key and add \`?\`, remove \`?\`, or add \`readonly\`.

📌 **Interview term: Pick / Omit** — the two "key selection" utilities: \`Pick<T, K>\` keeps keys \`K\`, \`Omit<T, K>\` keeps every key except \`K\`.

## 3. How They Are Built

They are not compiler magic. Here are the definitions from TypeScript 5.4.5 own \`lib.es5.d.ts\`:

~~~ts
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
~~~

Read \`[P in keyof T]\` as a loop: "for every key \`P\` of \`T\`, produce a property \`P\` whose type is \`T[P]\`". The \`?\`, \`-?\` and \`readonly\` are modifiers added (or, with \`-\`, removed) on each property. Writing your own variants is covered in [What are mapped types?](/interview-question/what-are-mapped-types); \`keyof\` and \`T[P]\` in [What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript) and [What are indexed access types?](/interview-question/what-are-indexed-access-types).

📌 **Interview term: mapped type** — a type of the form \`{ [P in Keys]: ... }\` that builds an object type by iterating over a union of keys.

📌 **Interview term: homomorphic mapped type** — a mapped type over \`keyof T\` (or a subset of it, as \`Pick\` does). It copies each property optional and readonly modifiers from \`T\`, which is why \`Pick<Doc, "id">\` keeps \`readonly id\` (checked in example 2).

**History, cited not run:** \`Partial\`, \`Readonly\`, \`Record\` and \`Pick\` arrived with mapped types in TypeScript 2.1 ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)); \`Required\` and the \`-?\` modifier in 2.8 ([Marius Schulz](https://mariusschulz.com/blog/mapped-type-modifiers-in-typescript)); \`Omit\` only in 3.5 — before that, everyone wrote \`Pick<T, Exclude<keyof T, K>>\` by hand ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-5.html)). \`Record\` has its own page: [What is the Record utility type?](/interview-question/what-is-the-record-utility-type)

## 4. Real-World Patterns

Example 1 builds three variants from \`User\`:

~~~ts
function updateUser(user: User, patch: Partial<Omit<User, "id">>): User {
  return { ...user, ...patch };
}
function createUser(input: NewUser, nextId: number): User { ... } // NewUser = Omit<User, "id">
type UserPreview = Pick<User, "id" | "name">;
~~~

- **Update patch: \`Partial<Omit<User, "id">>\`.** "Any subset of the fields, but never the id." Passing \`{ id: 99 }\` fails with \`error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Partial<Omit<User, "id">>'.\`
- **Create input: \`Omit<User, "id">\`.** The server assigns the id; the caller provides the rest.
- **Preview: \`Pick<User, "id" | "name">\`.** A list item that only needs two fields.
- **Make only some keys optional.** Utilities compose. Example 2 defines \`type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>\`, and a \`DraftDoc\` that may omit \`body\` but must have \`id\`.

Note how the run shows the \`id\` really changed to \`99\` on line 3 of the output: \`// @ts-expect-error\` silences the error, it does not stop the code. Types are erased before the program runs.

## 5. Where They Surprise People

**They are shallow.** \`Readonly<Settings>\` stops \`s.tags = []\` (\`error TS2540: Cannot assign to 'tags' because it is a read-only property.\`) but still allows \`s.tags.push("b")\` and \`s.theme.dark = true\` — the first output line of example 2 shows both changes. For deep versions see [How would you build a DeepPartial type?](/interview-question/how-would-you-build-a-deeppartial-type) and [How do you make values immutable in TypeScript?](/interview-question/how-do-you-make-values-immutable-in-typescript).

**\`Readonly\` is compile-time only.** In example 1, \`frozen.name = "Bob"\` is a type error, but with the error suppressed it runs and prints \`Bob\`. Use \`Object.freeze\` if you need run-time protection.

**\`Pick\` checks its keys, \`Omit\` does not.** \`Pick<User, "nmae">\` is \`error TS2344: Type '"nmae"' does not satisfy the constraint 'keyof User'.\` But \`Omit<User, "nmae">\` compiles and silently removes nothing — tsc confirms it is equal to \`User\`. \`Omit\` is declared with \`K extends keyof any\` on purpose, so you can omit keys that only some types have; the price is that typos go unnoticed.

**\`Omit\` on a union destroys the union.** \`keyof (A | B)\` is only the keys *both* members share, so \`Omit<Shape, "id">\` on a circle-or-square union becomes \`{ kind: "circle" | "square" }\` — \`radius\` and \`side\` are gone, and \`{ kind: "circle", radius: 2 }\` is rejected:

~~~text
error TS2353: Object literal may only specify known properties, and 'radius' does not exist in type 'ShapeInput'.
~~~

The fix is a distributive version that applies \`Omit\` to each member:

~~~ts
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
~~~

Why \`T extends unknown ? ... : never\` runs once per member is explained in [Why are conditional types distributive and how do you control it with \`infer\`?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer); unions with a \`kind\` tag are [discriminated unions](/interview-question/what-is-a-discriminated-union).

**\`Partial\` lets \`undefined\` overwrite real data.** An optional property accepts an explicit \`undefined\`, so \`{ ...base, ...{ title: undefined } }\` removes the title at run time — and tsc still types \`merged.title\` as \`string\` (an \`Equal\` line in example 2 confirms it). The run prints \`{"body":"text"} true undefined\`: the key exists, its value is \`undefined\`. The \`exactOptionalPropertyTypes\` flag forbids writing \`undefined\` into an optional property; see [How do noUncheckedIndexedAccess, exactOptionalPropertyTypes and TS 5.6+ checks harden 2025 codebases?](/interview-question/how-do-nouncheckedindexedaccess-exactoptionalpropertytypes-and-ts-5-6-checks-har)

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, deriving patch, preview and create types:

~~~text
Bob
{"id":1,"name":"Ada","email":"ada@x.io","nickname":"countess"}
99
{"id":2,"name":"Lin"}
id,name,email
~~~

Example 2, the edges:

~~~text
{"theme":{"dark":true},"tags":["a","b"]}
{"id":"d1"}
13 9
{"body":"text"} true undefined
~~~

## 7. Which One When

| You want | Use | Watch out for |
| :--- | :--- | :--- |
| A partial update | \`Partial<T>\` (often \`Partial<Omit<T, "id">>\`) | explicit \`undefined\` overwrites values |
| Every field filled in, e.g. after applying defaults | \`Required<T>\` | shallow |
| A value callers must not reassign | \`Readonly<T>\` | shallow, compile-time only |
| A small view of a big type | \`Pick<T, K>\` | new fields are not added automatically |
| Everything except a few fields | \`Omit<T, K>\` | typos in \`K\` are ignored; collapses unions |
| A dictionary type | \`Record<K, V>\` | see its own page |

## Common Pitfalls

- **Using \`Omit\` on a union type.** It keeps only the shared keys; use a \`DistributiveOmit\`.
- **Trusting \`Omit\` to catch a misspelled key.** It accepts any key; wrap it as \`type StrictOmit<T, K extends keyof T> = Omit<T, K>\` or prefer \`Pick\` when the list is short.
- **Expecting deep behaviour.** \`Partial\`, \`Required\` and \`Readonly\` change only the top level.
- **Thinking \`Readonly\` freezes the object.** Types are erased; nothing stops a mutation at run time.
- **Spreading a \`Partial\` patch over data without \`exactOptionalPropertyTypes\`.** A \`{ title: undefined }\` patch silently wipes a field that tsc still calls \`string\`.
- **Copying an interface instead of deriving it.** Two hand-written types drift; a derived type cannot.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they are:</strong> <span style="color:#f0e2c8;">Generic types in the standard library that <strong style="color:#ffca28;">derive</strong> a new object type from an existing one, so one interface stays the single source of truth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The five:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial</code> makes all properties optional, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Required</code> makes them mandatory, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Readonly</code> makes them readonly, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pick&lt;T, K&gt;</code> keeps keys <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit&lt;T, K&gt;</code> drops keys <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How they work:</strong> <span style="color:#f0e2c8;">They are mapped types over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ [P in keyof T]?: T[P] }</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code>. Pick and the modifiers copy each property optional and readonly flags.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real use:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Partial&lt;Omit&lt;User, "id"&gt;&gt;</code> for an update patch, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit&lt;User, "id"&gt;</code> for a create input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pick</code> for a list view, and compositions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit&lt;T, K&gt; &amp; Partial&lt;Pick&lt;T, K&gt;&gt;</code> to make only some keys optional.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">All of them are shallow and compile-time only, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> does not check its keys, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> on a union keeps only shared keys unless you write a distributive version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Omit&lt;Shape, "id"&gt;</code> lose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">radius</code> when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Shape</code> is a union?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof T</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof (A | B)</code> is only the keys common to both. Wrap it in a distributive conditional, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends unknown ? Omit&lt;T, K&gt; : never</code>, so it runs once per member.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Pick</code> reject a misspelled key but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Omit</code> accepts it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pick</code> declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof T</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">K extends keyof any</code> so it can remove keys that only some types have. The cost is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit&lt;User, "nmae"&gt;</code> is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">User</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make only <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">body</code> optional?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compose: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit&lt;T, "body"&gt; &amp; Partial&lt;Pick&lt;T, "body"&gt;&gt;</code>. The intersection keeps every other property as it was and adds an optional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">body</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Readonly&lt;T&gt;</code> make an object immutable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is shallow, so nested objects and arrays can still change, and it is erased at compile time, so suppressed or unchecked code can still assign. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> protects at run time; a recursive mapped type or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> goes deeper at compile time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the risk of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{ ...user, ...patch }</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">patch: Partial&lt;User&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Optional properties accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so a patch like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ name: undefined }</code> wipes the value while the result is still typed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exactOptionalPropertyTypes</code> makes writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> into an optional property an error.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Utility type | A generic type in the standard library that transforms another type |
| Single source of truth | One declared type from which every variant is derived |
| Partial / Required / Readonly | Keep every key; add \`?\`, remove \`?\`, or add \`readonly\` |
| Pick / Omit | Keep only the listed keys, or every key except the listed ones |
| Mapped type | \`{ [P in Keys]: ... }\`, an object type built by iterating over keys |
| Homomorphic mapped type | A mapped type over \`keyof T\` that copies each property modifiers |

**Conclusion:** \`Partial\`, \`Required\`, \`Readonly\`, \`Pick\` and \`Omit\` let you write a type once and describe its variants as transformations, so a patch type, a create type and a preview can never drift from the real model. They are ordinary mapped types over \`keyof T\`, which explains both their power and their limits: they are shallow, they vanish at run time, \`Omit\` checks nothing about its keys, and over a union \`keyof\` keeps only the shared keys. Name those limits and the fix for each, and you have the answer an interviewer is listening for.`,
    examples: [
      {
        label: `Deriving patch, preview and create types from one User type`,
        code: `// One source type, many derived views. Every Equal line is checked by tsc.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface User {
  id: number;
  name: string;
  email: string;
  nickname?: string;
}

// Partial: every property optional. Ideal for a "patch" argument.
type UserPatch = Partial<User>;
const _p: Equal<UserPatch, { id?: number; name?: string; email?: string; nickname?: string }> = true;

// Required: every property mandatory (removes ?).
const _r: Equal<Required<User>["nickname"], string> = true;

// Pick: keep only the listed keys. Omit: drop the listed keys.
type UserPreview = Pick<User, "id" | "name">;
type NewUser = Omit<User, "id">;
const _pk: Equal<UserPreview, { id: number; name: string }> = true;
const _om: Equal<NewUser, { name: string; email: string; nickname?: string }> = true;

// Readonly: every property readonly (one level deep only).
const frozen: Readonly<User> = { id: 1, name: "Ada", email: "ada@x.io" };
// @ts-expect-error Cannot assign to 'name' because it is a read-only property.
frozen.name = "Bob";
console.log(frozen.name);

function updateUser(user: User, patch: Partial<Omit<User, "id">>): User {
  return { ...user, ...patch };
}

let db: User = { id: 1, name: "Ada", email: "ada@x.io" };
db = updateUser(db, { nickname: "countess" });
console.log(JSON.stringify(db));

// The id is not part of the patch type, so this is a compile error.
// @ts-expect-error Object literal may only specify known properties, and 'id' does not exist in type
db = updateUser(db, { id: 99 });
console.log(db.id);

function createUser(input: NewUser, nextId: number): User {
  return { id: nextId, ...input };
}
const created = createUser({ name: "Lin", email: "lin@x.io" }, 2);
const preview: UserPreview = { id: created.id, name: created.name };
console.log(JSON.stringify(preview));

// Pick checks its keys; Omit does not (K extends keyof any).
// @ts-expect-error Type '"nmae"' does not satisfy the constraint 'keyof User'.
type BadPick = Pick<User, "nmae">;
type SilentOmit = Omit<User, "nmae">;
// A typo in Omit removes nothing: SilentOmit is just User again.
const _so: Equal<SilentOmit, User> = true;
console.log(Object.keys(created).join(","));`,
      },
      {
        label: `Shallow Readonly, PartialBy, Omit on unions and explicit undefined`,
        code: `// The edges of Partial, Readonly, Pick and Omit, each checked by tsc.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Readonly and Partial are shallow: nested objects are untouched.
interface Settings {
  theme: { dark: boolean };
  tags: string[];
}
const s: Readonly<Settings> = { theme: { dark: false }, tags: ["a"] };
s.theme.dark = true;
s.tags.push("b");
console.log(JSON.stringify(s));
// Only the top-level property itself is readonly.
// @ts-expect-error Cannot assign to 'tags' because it is a read-only property.
s.tags = [];

// 2. Pick keeps the modifiers of the keys it copies (it is homomorphic).
interface Doc {
  readonly id: string;
  title?: string;
  body: string;
}
const _m: Equal<Pick<Doc, "id" | "title">, { readonly id: string; title?: string }> = true;

// 3. Combine them: make only some keys optional.
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type DraftDoc = PartialBy<Doc, "body">;
const draft: DraftDoc = { id: "d1" };
console.log(JSON.stringify(draft));

// 4. Omit on a union is NOT applied per member: keyof (A | B) is only the
// shared keys, so member-specific keys are lost.
type Shape =
  | { kind: "circle"; radius: number; id: string }
  | { kind: "square"; side: number; id: string };
type ShapeInput = Omit<Shape, "id">;
const _lost: Equal<ShapeInput, { kind: "circle" | "square" }> = true;
// @ts-expect-error Object literal may only specify known properties, and 'radius' does not exist
const bad: ShapeInput = { kind: "circle", radius: 2 };

// The fix: a distributive Omit that runs once per union member.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type ShapeInput2 = DistributiveOmit<Shape, "id">;
const good: ShapeInput2 = { kind: "circle", radius: 2 };
function area(x: ShapeInput2): number {
  return x.kind === "circle" ? Math.round(Math.PI * x.radius ** 2) : x.side ** 2;
}
console.log(area(good), area({ kind: "square", side: 3 }));

// 5. Partial allows an explicit undefined (unless exactOptionalPropertyTypes is on),
// so a spread can overwrite a real value with undefined.
const base = { title: "Hello", body: "text" };
const patch: Partial<typeof base> = { title: undefined };
const merged = { ...base, ...patch };
// Worse: tsc types merged.title as plain string, yet at run time it is undefined.
const _t: Equal<typeof merged.title, string> = true;
console.log(JSON.stringify(merged), "title" in merged, typeof merged.title);`,
      },
    ],
  },
  {
    title: `What do Exclude, Extract, and NonNullable do?`,
    difficulty: "medium",
    seoDescription: `Exclude, Extract and NonNullable filter the members of a union: how they work as distributive conditional types and where they surprise you.`,
    description: `**Question presented to candidate:**
"What do \`Exclude\`, \`Extract\` and \`NonNullable\` do? Can you show how \`Exclude\` is implemented, and give a case where one of them surprised you?"

**What a strong answer should cover:**
- They filter the **members of a union**: \`Exclude<T, U>\` drops members assignable to \`U\`, \`Extract<T, U>\` keeps only those, \`NonNullable<T>\` drops \`null\` and \`undefined\`
- \`Exclude\` and \`Extract\` are one-line distributive conditional types (\`T extends U ? never : T\`); members mapped to \`never\` vanish from the union
- Practical uses: narrowing a status union, picking one variant of a discriminated union with \`Extract<Action, { type: "add" }>\`, typing a filter that removes empty values, building \`Omit\`
- Limits: they work on unions, not object properties (use \`Omit\` for that); \`Exclude<string, "a">\` is still \`string\`; \`U\` is not checked against \`T\`, so typos are silent
- \`NonNullable<T>\` is \`T & {}\` since TypeScript 4.8, which lets a narrowed generic value be returned as \`NonNullable<T>\`; it is shallow

**Code / implementation expected:** Optional — write \`MyExclude\` by hand, or use \`Extract\` to pick a union member.`,
    answer: `**Target Audience:** Developers who know union types and want to transform them: remove members, keep members, strip \`null\`.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release versions are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A box of mixed sweets arrives: toffees, mints, chocolates and two empty wrappers. Three ways to sort it: "everything except the mints" (**Exclude**), "only the chocolates" (**Extract**), "throw away the empty wrappers" (**NonNullable**). You never open a sweet or change one — you only decide which ones stay in the box.

A union type is that box. \`"idle" | "loading" | "success" | "error"\` contains four members; \`string | null | undefined\` contains a real value and two "empty wrappers". These three utilities pick which members stay. They never reach *inside* a member — that job belongs to \`Pick\` and \`Omit\` ([What are utility types like Partial, Pick, and Omit?](/interview-question/what-are-utility-types-like-partial-pick-and-omit)).

📌 **Interview term: union member** — one of the alternatives in a union type. \`"a" | "b"\` has two members; \`string | null\` has two.

## 2. What Each One Does

| Utility | Keeps | Example | Result |
| :--- | :--- | :--- | :--- |
| \`Exclude<T, U>\` | members of \`T\` **not** assignable to \`U\` | \`Exclude<Status, "idle" \\| "loading">\` | \`"success" \\| "error"\` |
| \`Extract<T, U>\` | members of \`T\` that **are** assignable to \`U\` | \`Extract<Status, "loading" \\| "pending">\` | \`"loading"\` |
| \`NonNullable<T>\` | members that are not \`null\` or \`undefined\` | \`NonNullable<string \\| null \\| undefined>\` | \`string\` |

All three rows are \`Equal<...>\` lines in example 1.

\`U\` can be broad: \`Exclude<string | number | boolean | (() => void), Function>\` removes the function member, and \`Extract<..., string | number>\` keeps both primitives. Note that \`Extract\` with \`"pending"\` is fine even though \`"pending"\` is not in \`Status\`: it just matches nothing.

📌 **Interview term: Exclude / Extract** — union filters: \`Exclude\` removes the members assignable to \`U\`, \`Extract\` keeps only them. They are exact opposites.

📌 **Interview term: NonNullable** — removes \`null\` and \`undefined\` from a type.

## 3. How They Work: Distribution

The definitions in TypeScript 5.4.5 \`lib.es5.d.ts\` are one line each:

~~~ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};
~~~

\`T extends U ? X : Y\` is a [conditional type](/interview-question/what-are-conditional-types). When \`T\` is a bare type parameter and you pass a union, TypeScript runs the condition **once per member** and unions the results. Each member either survives or becomes \`never\`, and \`never\` vanishes from a union ([What is the never type?](/interview-question/what-is-the-never-type)):

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Each member of Status is tested against idle or loading. Matches become never and vanish. success and error remain.">
  <defs>
    <marker id="q2arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="150" height="50" rx="10"/>
  <text class="d-text" x="105" y="60" text-anchor="middle">idle</text>
  <rect class="d-box" x="215" y="30" width="150" height="50" rx="10"/>
  <text class="d-text" x="290" y="60" text-anchor="middle">loading</text>
  <rect class="d-box" x="400" y="30" width="150" height="50" rx="10"/>
  <text class="d-text" x="475" y="60" text-anchor="middle">success</text>
  <rect class="d-box" x="585" y="30" width="150" height="50" rx="10"/>
  <text class="d-text" x="660" y="60" text-anchor="middle">error</text>
  <rect class="d-box-muted" x="30" y="150" width="150" height="50" rx="10"/>
  <text class="d-sub" x="105" y="180" text-anchor="middle">never</text>
  <rect class="d-box-muted" x="215" y="150" width="150" height="50" rx="10"/>
  <text class="d-sub" x="290" y="180" text-anchor="middle">never</text>
  <rect class="d-box-accent" x="400" y="150" width="150" height="50" rx="10"/>
  <text class="d-text" x="475" y="180" text-anchor="middle">success</text>
  <rect class="d-box-accent" x="585" y="150" width="150" height="50" rx="10"/>
  <text class="d-text" x="660" y="180" text-anchor="middle">error</text>
  <rect class="d-box-accent" x="250" y="260" width="260" height="50" rx="10"/>
  <text class="d-text" x="380" y="290" text-anchor="middle">success or error</text>
  <path class="d-edge-dashed" d="M 105 84 L 105 146" marker-end="url(#q2arrow)"/>
  <path class="d-edge-dashed" d="M 290 84 L 290 146" marker-end="url(#q2arrow)"/>
  <path class="d-edge" d="M 475 84 L 475 146" marker-end="url(#q2arrow)"/>
  <path class="d-edge" d="M 660 84 L 660 146" marker-end="url(#q2arrow)"/>
  <path class="d-edge-accent" d="M 475 204 L 420 256" marker-end="url(#q2arrow)"/>
  <path class="d-edge-accent" d="M 660 204 L 480 256" marker-end="url(#q2arrow)"/>
</svg>

That is \`Exclude<Status, "idle" | "loading">\`: the two matches are mapped to \`never\` (dashed) and disappear; the rest are unioned into the result.

📌 **Interview term: distributive conditional type** — a conditional type on a bare type parameter; given a union, it is applied to each member separately. Wrap the parameter in a tuple, \`[T] extends [U]\`, to test the whole union at once instead — example 2 shows \`WholeExclude<Letters, "a">\` then removes nothing. Details: [Why are conditional types distributive and how do you control it with \`infer\`?](/interview-question/why-are-conditional-types-distributive-and-how-do-you-control-it-with-infer)

**History, cited not run:** \`Exclude\`, \`Extract\`, \`NonNullable\`, \`ReturnType\` and \`InstanceType\` were the first predefined conditional types, added with conditional types in TypeScript 2.8 ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html)). \`Omit\`, added later, is built from \`Exclude\`: \`Pick<T, Exclude<keyof T, K>>\` — example 2 checks that \`Exclude<keyof Row, "secret">\` is \`"id" | "name"\`.

## 4. Real Uses

**Picking a variant of a discriminated union.** \`Extract\` with a partial object shape keeps every member that has that shape:

~~~ts
type Action = { type: "add"; amount: number } | { type: "reset" } | { type: "rename"; name: string };
type AddAction = Extract<Action, { type: "add" }>;        // { type: "add"; amount: number }
type NoPayload = Exclude<Action, { type: "add" | "rename" }>; // { type: "reset" }
~~~

A handler for one action can now be typed without repeating its shape. More on tags in [What is a discriminated union?](/interview-question/what-is-a-discriminated-union)

**Filtering out empty values.** A type guard using \`NonNullable\` turns \`Array<string | null | undefined>\` into \`string[]\`:

~~~ts
const isPresent = <T>(v: T): v is NonNullable<T> => v != null;
const names = raw.filter(isPresent); // string[]
~~~

\`v != null\` (loose \`!=\`) is true for everything except \`null\` and \`undefined\`. How \`v is ...\` predicates work is covered in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards); TypeScript 5.5 can infer such predicates for simple \`filter\` callbacks ([How does TypeScript 5.5 infer type predicates for Array.filter automatically?](/interview-question/how-does-typescript-5-5-infer-type-predicates-for-array-filter-automatically)), which 5.4.5 used here does not.

## 5. NonNullable Is \`T & {}\`

\`{}\` in TypeScript means "any value except \`null\` and \`undefined\`" (strings and numbers included). Intersecting with it keeps every real member and turns \`null & {}\` and \`undefined & {}\` into \`never\` — tsc confirms \`(null | undefined) & {}\` is \`never\`.

The old definition was a conditional type, \`T extends null | undefined ? never : T\`; TypeScript 4.8 rewrote it to \`T & {}\` ([TypeScript 4.8 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-8/)). The practical gain, from the same post: after narrowing a generic value against \`null\` and \`undefined\`, tsc now types it as \`T & {}\`, so this compiles without a cast (example 2):

~~~ts
function required<T>(value: T, label: string): NonNullable<T> {
  if (value === null || value === undefined) throw new Error(label + " is required");
  return value;
}
~~~

That this failed before 4.8 is the announcement claim, not something run here. For the wider topic, see [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

**It is shallow:** \`NonNullable<{ bio: string | null } | null>\` is \`{ bio: string | null }\` — the outer \`null\` is gone, the inner one stays.

## 6. Where They Surprise People

- **There must be a union to filter.** \`Exclude<string, "admin">\` is \`string\` (checked): \`string\` is not a union of literals, and \`string extends "admin"\` is false. There is no "string except admin" type.
- **Typos are silent.** \`Exclude<Status, "sucess">\` is just \`Status\` (checked), because \`U\` is unconstrained. A stricter wrapper fixes it: \`type StrictExclude<T, U extends T> = Exclude<T, U>\` turns the typo into \`error TS2344: Type '"z"' does not satisfy the constraint 'Letters'.\`
- **They do not touch properties.** \`Exclude<User, "email">\` does nothing useful; to remove a property use \`Omit\`.
- **Assignability, not equality.** \`Exclude<T, string>\` removes every string literal too, since \`"a"\` is assignable to \`string\`: a separate 5.4.5 check confirms \`Exclude<"a" | "b" | 1 | boolean, string>\` is \`1 | boolean\`.

## 7. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and the \`// @ts-expect-error\` line is a real error (quoted above, from a run with the directive removed). Then each example was run as the page runs it.

Example 1, filtering unions:

~~~text
42
a-b-c 3
["success","error"]
~~~

Example 2, how they are built and \`NonNullable\` as \`T & {}\`:

~~~text
x
Error: email is required
{"bio":null}
~~~

## 8. Exclude vs Extract vs Omit

| | \`Exclude<T, U>\` | \`Extract<T, U>\` | \`Omit<T, K>\` |
| :--- | :--- | :--- | :--- |
| Works on | members of a union | members of a union | properties of an object |
| Keeps | members not assignable to \`U\` | members assignable to \`U\` | every key except \`K\` |
| Built as | \`T extends U ? never : T\` | \`T extends U ? T : never\` | \`Pick<T, Exclude<keyof T, K>>\` |
| Checks its second argument | No | No | No (\`K extends keyof any\`) |

## Common Pitfalls

- **Using \`Exclude\` to remove a property.** It filters union members; use \`Omit\` for keys.
- **Expecting \`Exclude<string, "x">\` to mean "any string but x".** Without a literal union there is nothing to remove.
- **Misspelling the member to exclude.** Nothing complains; add a \`U extends T\` wrapper for strictness.
- **Assuming \`NonNullable\` is deep.** Nested \`null\` properties survive.
- **Using \`Extract\` on a union whose tag is typed \`string\`.** \`{ type: string; amount: number }\` is not assignable to \`{ type: "add" }\`, so \`Extract\` returns \`never\` (checked separately on 5.4.5). Keep tags as literal types.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they do:</strong> <span style="color:#f0e2c8;">They filter the <strong style="color:#ffca28;">members of a union</strong>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude&lt;T, U&gt;</code> drops members assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">U</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract&lt;T, U&gt;</code> keeps only those, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NonNullable&lt;T&gt;</code> drops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How they work:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends U ? never : T</code>. The conditional is <strong style="color:#ffca28;">distributive</strong>: it runs once per member, and members mapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> vanish from the union.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where I use them:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract&lt;Action, { type: "add" }&gt;</code> to pick one variant of a discriminated union, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code> to narrow a status union, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v is NonNullable&lt;T&gt;</code> guards to filter empties, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Omit</code> itself is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pick</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. NonNullable detail:</strong> <span style="color:#f0e2c8;">Since 4.8 it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T &amp; {}</code>, so a generic value narrowed against null and undefined is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NonNullable&lt;T&gt;</code> without a cast. It is shallow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Caveats:</strong> <span style="color:#f0e2c8;">They need a union (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exclude&lt;string, "a"&gt;</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>), they do not touch properties, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">U</code> is not checked, so a typo silently removes nothing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Implement <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Exclude</code> yourself.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type MyExclude&lt;T, U&gt; = T extends U ? never : T</code>. Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is a bare type parameter the condition distributes over each union member, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> results disappear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[T] extends [U]</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Distribution stops: the whole union is tested at once. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Letters</code> is not assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a"</code>, so nothing is removed and you get the full union back.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">add</code> action type out of an action union?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extract&lt;Action, { type: "add" }&gt;</code>. Every member assignable to that partial shape is kept, which for a discriminated union is exactly the one variant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NonNullable</code> defined as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">T &amp; {}</code> now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> is every value except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so the intersection removes them. Unlike a conditional type, an intersection can be simplified and assigned to, so a narrowed generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> checks as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NonNullable&lt;T&gt;</code>. The change was in TypeScript 4.8.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Exclude</code> reject members that are not in the union?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Constrain the second parameter: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type StrictExclude&lt;T, U extends T&gt; = Exclude&lt;T, U&gt;</code>. A typo is then error TS2344.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Union member | One alternative in a union type |
| Exclude / Extract | Remove, or keep only, the union members assignable to \`U\` |
| NonNullable | Removes \`null\` and \`undefined\`; defined as \`T & {}\` |
| Distributive conditional type | A conditional type on a bare type parameter, applied to each union member separately |

**Conclusion:** \`Exclude\`, \`Extract\` and \`NonNullable\` are the union-level counterparts of \`Pick\` and \`Omit\`: instead of choosing properties, they choose members. \`Exclude\` and \`Extract\` are one-line distributive conditional types whose rejected members turn into \`never\` and vanish, and \`NonNullable\` is an intersection with \`{}\`. Knowing that mechanism explains every surprise — no effect on a plain \`string\`, no check against typos, no reach into properties — and shows how to build stricter or custom versions when an interviewer asks.`,
    examples: [
      {
        label: `Filtering string unions, action unions and nullable values`,
        code: `// Exclude, Extract and NonNullable filter the MEMBERS of a union.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Status = "idle" | "loading" | "success" | "error";

// Exclude<T, U>: drop every member of T that is assignable to U.
type Settled = Exclude<Status, "idle" | "loading">;
const _e1: Equal<Settled, "success" | "error"> = true;

// Extract<T, U>: keep only the members of T that are assignable to U.
type Busy = Extract<Status, "loading" | "pending">;
const _x1: Equal<Busy, "loading"> = true;

// U can be a broad type: keep or drop whole families of members.
type Mixed = string | number | boolean | (() => void);
const _e2: Equal<Exclude<Mixed, Function>, string | number | boolean> = true;
const _x2: Equal<Extract<Mixed, string | number>, string | number> = true;

// Extract with an object shape picks members of a discriminated union.
type Action =
  | { type: "add"; amount: number }
  | { type: "reset" }
  | { type: "rename"; name: string };
type AddAction = Extract<Action, { type: "add" }>;
const _x3: Equal<AddAction, { type: "add"; amount: number }> = true;
type NoPayload = Exclude<Action, { type: "add" | "rename" }>;
const _e3: Equal<NoPayload, { type: "reset" }> = true;

function handleAdd(a: AddAction): number {
  return a.amount * 2;
}
console.log(handleAdd({ type: "add", amount: 21 }));

// NonNullable<T>: remove null and undefined.
type MaybeName = string | null | undefined;
const _n1: Equal<NonNullable<MaybeName>, string> = true;

// A typical use: the element type after filtering out empty slots.
const raw: Array<string | null | undefined> = ["a", null, "b", undefined, "c"];
const isPresent = <T>(v: T): v is NonNullable<T> => v != null;
const names = raw.filter(isPresent);
const _n2: Equal<typeof names, string[]> = true;
console.log(names.join("-"), names.length);

// They only filter unions. string is not a union of literals,
// so there is nothing to subtract from it.
const _e4: Equal<Exclude<string, "admin">, string> = true;

// Exclude does not check U against T: a typo is silently ignored.
const _e5: Equal<Exclude<Status, "sucess">, Status> = true;

const all: Status[] = ["idle", "loading", "success", "error"];
const settled = all.filter((s): s is Settled => s === "success" || s === "error");
console.log(JSON.stringify(settled));`,
      },
      {
        label: `How they are built, a stricter Exclude and NonNullable as T & {}`,
        code: `// How Exclude, Extract and NonNullable work, and how to make them stricter.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Written by hand they are one-line conditional types.
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type Letters = "a" | "b" | "c";
const _1: Equal<MyExclude<Letters, "a">, "b" | "c"> = true;
const _2: Equal<MyExtract<Letters, "a" | "z">, "a"> = true;

// 2. They work because a conditional type on a bare type parameter is
// DISTRIBUTIVE: it runs once per member, and never vanishes from the union.
//   MyExclude<"a" | "b" | "c", "a">
//   = ("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" ...)
//   = never | "b" | "c"  =  "b" | "c"
// Wrap T in a tuple and distribution stops: the whole union is tested at once.
type WholeExclude<T, U> = [T] extends [U] ? never : T;
const _3: Equal<WholeExclude<Letters, "a">, Letters> = true;

// 3. Omit is built on Exclude over the keys.
interface Row { id: number; name: string; secret: string }
const _4: Equal<Exclude<keyof Row, "secret">, "id" | "name"> = true;

// 4. A stricter Exclude that rejects members that are not in T.
type StrictExclude<T, U extends T> = Exclude<T, U>;
// @ts-expect-error Type '"z"' does not satisfy the constraint 'Letters'.
type Typo = StrictExclude<Letters, "z">;
const _5: Equal<StrictExclude<Letters, "c">, "a" | "b"> = true;

// 5. NonNullable<T> is defined as T & {} (since TypeScript 4.8).
// {} means "any value except null and undefined", so null & {} and
// undefined & {} collapse to never and drop out.
const _6: Equal<NonNullable<string | null | undefined>, string> = true;
const _7: Equal<(null | undefined) & {}, never> = true;

// Because it is an intersection, a narrowed generic value is assignable to it.
function required<T>(value: T, label: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(label + " is required");
  }
  return value;
}
console.log(required("x", "name"));
try {
  required(null, "email");
} catch (e) {
  console.log(String(e));
}

// 6. NonNullable is shallow: properties keep their null.
type Profile = { bio: string | null } | null;
const _8: Equal<NonNullable<Profile>, { bio: string | null }> = true;
const profile: NonNullable<Profile> = { bio: null };
console.log(JSON.stringify(profile));`,
      },
    ],
  },
  {
    title: `What do ReturnType and Parameters do?`,
    difficulty: "medium",
    seoDescription: `ReturnType and Parameters read the result and argument types out of a function type: typeof, wrappers, overloads, generics and the class versions.`,
    description: `**Question presented to candidate:**
"What do \`ReturnType\` and \`Parameters\` do? When have you used them, and what are their limits — say with overloads or generic functions?"

**What a strong answer should cover:**
- \`ReturnType<F>\` gives the return type of a function type; \`Parameters<F>\` gives its parameter types as a (labelled) tuple; both need a function **type**, so you pass \`typeof fn\`
- They are conditional types with \`infer\` (\`F extends (...args: any) => infer R ? R : any\`)
- Uses: name a type nobody exported, type wrappers and decorators that keep a signature (\`(...args: Parameters<F>) => ReturnType<F>\`), forward arguments; \`ConstructorParameters\` and \`InstanceType\` for classes
- Async functions: \`ReturnType\` is the \`Promise\`; combine with \`Awaited\` for the resolved value
- Limits: overloads use only the last signature, generic functions get their constraint (\`unknown\`) unless you pin the type with an instantiation expression, and non-functions are rejected by the constraint

**Code / implementation expected:** Optional — a \`withLog\` wrapper using both, or \`MyReturnType\` with \`infer\`.`,
    answer: `**Target Audience:** Developers who keep writing the same type twice — once on a function, once next to it — and want to derive it instead.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release versions are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

You buy a coffee machine with no manual. You can still learn everything that matters by looking at it: the slots on the top tell you what goes **in** (water, beans, a pod), the spout tells you what comes **out** (coffee). You do not need the factory to send you a separate spec sheet — the machine itself is the spec.

A function is the same. Its signature already says what goes in and what comes out. \`Parameters\` reads the inputs and \`ReturnType\` reads the output, so you can reuse them as types without the author having exported a name for them. If the function changes, your derived types change with it.

📌 **Interview term: ReturnType** — \`ReturnType<F>\` is the return type of the function type \`F\`.

📌 **Interview term: Parameters** — \`Parameters<F>\` is the parameter list of the function type \`F\`, as a tuple type.

## 2. The Basics

~~~ts
function createOrder(customerId: string, items: string[], express = false) {
  return { id: "o-" + items.length, customerId, items, express, total: items.length * 10 };
}
type Order = ReturnType<typeof createOrder>;
// { id: string; customerId: string; items: string[]; express: boolean; total: number }
type OrderArgs = Parameters<typeof createOrder>;
// [customerId: string, items: string[], express?: boolean]
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A function type splits into Parameters, a tuple of inputs, and ReturnType, the output.">
  <defs>
    <marker id="q3arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="30" width="360" height="70" rx="10"/>
  <text class="d-text" x="380" y="60" text-anchor="middle">typeof createOrder</text>
  <text class="d-sub" x="380" y="84" text-anchor="middle">(customerId, items, express?) to Order</text>
  <rect class="d-box" x="30" y="190" width="320" height="80" rx="10"/>
  <text class="d-text" x="190" y="222" text-anchor="middle">Parameters</text>
  <text class="d-sub" x="190" y="248" text-anchor="middle">[string, string[], boolean?]</text>
  <rect class="d-box" x="420" y="190" width="310" height="80" rx="10"/>
  <text class="d-text" x="575" y="222" text-anchor="middle">ReturnType</text>
  <text class="d-sub" x="575" y="248" text-anchor="middle">id, customerId, items, total</text>
  <path class="d-edge" d="M 300 104 L 210 186" marker-end="url(#q3arrow)"/>
  <path class="d-edge" d="M 460 104 L 555 186" marker-end="url(#q3arrow)"/>
</svg>

Three details from that example, each checked by tsc:

- **They take a type, not a value.** \`ReturnType<createOrder>\` fails with \`error TS2749: 'createOrder' refers to a value, but is being used as a type here. Did you mean 'typeof createOrder'?\` — \`typeof\` turns the value into its type ([What do keyof and typeof do in TypeScript?](/interview-question/what-do-keyof-and-typeof-do-in-typescript)).
- **The tuple keeps names and optionality.** A parameter with a default value becomes an optional slot, \`express?: boolean\`. The names are only labels for editors; \`OrderArgs[0]\` is \`string\`. Tuples have their own page: [What are tuple types?](/interview-question/what-are-tuple-types)
- **Non-functions are rejected.** \`ReturnType<string>\` is \`error TS2344: Type 'string' does not satisfy the constraint '(...args: any) => any'.\`

📌 **Interview term: labelled tuple** — a tuple type whose elements carry names, such as \`[customerId: string, items: string[]]\`. The names document; they do not change the type.

## 3. How They Are Built

From TypeScript 5.4.5 \`lib.es5.d.ts\`:

~~~ts
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
~~~

\`infer R\` means "whatever type sits in this position, call it \`R\`". tsc matches \`T\` against the pattern of a function and captures the return type (or the whole argument list). Example 2 rebuilds both as \`MyReturnType\` and \`MyParameters\` and checks them. The keyword itself is covered in [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do); deeper unwrapping utilities in [How do you use infer to build deep Awaited, ReturnType and Unwrap utilities?](/interview-question/how-do-you-use-infer-to-build-deep-awaited-returntype-and-unwrap-utilities)

📌 **Interview term: infer** — a keyword usable only in the \`extends\` clause of a conditional type; it declares a type variable that tsc fills in from the matched type.

**The class versions** work the same way on constructor types: \`ConstructorParameters<typeof Cache>\` is \`[name: string, ttlMs: number]\` and \`InstanceType<typeof Cache>\` is \`Cache\` (both checked in example 1). **History, cited not run:** \`ReturnType\` and \`InstanceType\` came with conditional types in TypeScript 2.8 ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html)); the handbook lists \`Parameters\` and \`ConstructorParameters\` as added in 3.1 ([Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)).

## 4. Where They Earn Their Keep

**A type nobody named.** Third-party code often exports a function but not its result type. \`type Order = ReturnType<typeof createOrder>\` gives you one that follows every change.

**Wrappers that keep the signature.** Logging, retry, caching and timing wrappers must accept exactly what the wrapped function accepts:

~~~ts
function withLog<F extends (...args: any[]) => any>(name: string, fn: F) {
  return (...args: Parameters<F>): ReturnType<F> => {
    const result = fn(...args);
    console.log(name + "(" + JSON.stringify(args) + ") -> " + JSON.stringify(result));
    return result;
  };
}
const loggedAdd = withLog("add", (a: number, b: number) => a + b); // (a: number, b: number) => number
~~~

\`loggedAdd(2, "3")\` is \`error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.\` With the error suppressed, the run prints \`add([2,"3"]) -> "23"\` — the bug the type would have prevented.

**Forwarding arguments.** \`function scheduleOrder(delayMs: number, ...args: Parameters<typeof createOrder>)\` accepts exactly the same arguments as \`createOrder\` after its own. Rest parameters are covered in [How do you type functions: optional, default and rest parameters?](/interview-question/how-do-you-type-functions-optional-default-and-rest-parameters)

**Generic factories.** \`make<C extends new (...args: any[]) => any>(Ctor: C, ...args: ConstructorParameters<C>): InstanceType<C>\` creates any class with checked constructor arguments.

## 5. Edge Cases Interviewers Like

**Async functions return the Promise.** \`ReturnType<typeof loadUser>\` is \`Promise<{ id: number; name: string }>\`. For the resolved value, wrap it: \`Awaited<ReturnType<typeof loadUser>>\` — see [What is the Awaited utility type?](/interview-question/what-is-the-awaited-utility-type)

**Overloads: only the last signature counts.** With \`parse(input: string): number\` declared first and \`parse(input: number): string\` last, tsc gives \`ReturnType<typeof parse>\` = \`string\` and \`Parameters<typeof parse>\` = \`[input: number]\`. Inference from an overloaded type uses the last signature, so put the most general one last, or extract the one you need another way. See [What are function overloads?](/interview-question/what-are-function-overloads)

**Generic functions lose their type parameter.** \`function first<T>(xs: T[]): T | undefined\` gives \`ReturnType<typeof first>\` = \`unknown\` — tsc replaced \`T\` with its constraint, which for an unconstrained \`T\` is \`unknown\`. With \`T extends { length: number }\` you get \`{ length: number } | undefined\`. To get a specific instance, use an **instantiation expression**: \`ReturnType<typeof first<string>>\` is \`string | undefined\`. Instantiation expressions arrived in TypeScript 4.7 ([InfoQ](https://www.infoq.com/news/2022/07/typescript-4-7-4-8/)).

📌 **Interview term: instantiation expression** — \`fn<Type>\` written without a call, which produces the type of \`fn\` with its type parameters filled in.

**Methods.** \`Parameters<typeof api.get>\` and \`ReturnType<(typeof api)["get"]>\` both work; the indexed-access form is useful when you only have the object type. \`as const\` on \`200\` keeps the literal \`200\` in the result type.

**\`any\` and \`never\`.** \`ReturnType<any>\` is \`any\`, \`ReturnType<never>\` is \`never\`, and \`Parameters<() => void>\` is \`[]\` (all checked).

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, deriving types and typing a wrapper:

~~~text
o-2 for c1: 20
add([2,3]) -> 5
add([2,"3"]) -> "23"
{"delayMs":5,"order":{"id":"o-1","customerId":"c2","items":["cap"],"express":true,"total":10}}
users 1000 true
~~~

Example 2, edge cases:

~~~text
number string
a 3
{"path":"/me","status":200}
checked
~~~

The first line also shows why overloads matter: at run time \`parse("42")\` really returns a number, while \`ReturnType<typeof parse>\` claims \`string\` — it only looked at the last overload.

## 7. The Function-Type Utilities

| Utility | Input | Result |
| :--- | :--- | :--- |
| \`Parameters<F>\` | function type | tuple of parameter types |
| \`ReturnType<F>\` | function type | return type |
| \`ConstructorParameters<C>\` | constructor type (\`typeof Class\`) | tuple of constructor parameter types |
| \`InstanceType<C>\` | constructor type | the instance type |
| \`Awaited<ReturnType<F>>\` | async function type | the resolved value type |

## Common Pitfalls

- **Forgetting \`typeof\`.** \`ReturnType<fn>\` is TS2749; pass \`typeof fn\`.
- **Using \`ReturnType\` on an async function and expecting the data.** You get \`Promise<...>\`; add \`Awaited\`.
- **Relying on it with overloads.** Only the last signature is read.
- **Using it on a generic function without pinning the type.** You get the constraint (\`unknown\`); use \`typeof fn<Type>\`.
- **Typing wrappers with \`(...args: any[]) => any\` and returning \`any\`.** Use \`Parameters<F>\` and \`ReturnType<F>\` so the wrapper keeps the exact signature.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they do:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType&lt;F&gt;</code> is the return type of a function type and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Parameters&lt;F&gt;</code> is its parameter list as a tuple. They take a type, so you write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof fn&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How they work:</strong> <span style="color:#f0e2c8;">Both are conditional types with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">F extends (...args: any) =&gt; infer R ? R : any</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConstructorParameters</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InstanceType</code> do the same for classes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why use them:</strong> <span style="color:#f0e2c8;">To name a type a library did not export, to type wrappers as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(...args: Parameters&lt;F&gt;) =&gt; ReturnType&lt;F&gt;</code> so the signature is preserved, and to forward arguments with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">...args: Parameters&lt;typeof fn&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Async:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code> of an async function is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code> gives the resolved value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Overloads use only the last signature, generic functions give their constraint (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>) unless you pin them with an instantiation expression like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof first&lt;string&gt;</code>, and non-function types are rejected.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReturnType</code> yourself.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type MyReturnType&lt;F&gt; = F extends (...args: any[]) =&gt; infer R ? R : never</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer R</code> captures whatever type is in the return position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReturnType</code> give for an overloaded function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The return type of the last overload signature. In my test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string =&gt; number</code> overload followed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number =&gt; string</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>, even though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse("42")</code> returns a number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof first&gt;</code> <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">first&lt;T&gt;(xs: T[]): T | undefined</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no concrete <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> to read, so tsc substitutes the constraint, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>. Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType&lt;typeof first&lt;string&gt;&gt;</code> to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string | undefined</code>; instantiation expressions exist since TypeScript 4.7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a generic retry or logging wrapper?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function wrap&lt;F extends (...args: any[]) =&gt; any&gt;(fn: F): (...args: Parameters&lt;F&gt;) =&gt; ReturnType&lt;F&gt;</code>. Callers then get the exact parameter names and types of the wrapped function, and wrong arguments are compile errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the type of a class instance from the class value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InstanceType&lt;typeof MyClass&gt;</code>, which for a plain class is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyClass</code>; it matters for generic factories where you only have a constructor type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConstructorParameters&lt;C&gt;</code> gives the constructor arguments.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| ReturnType | The return type of a function type |
| Parameters | The parameter types of a function type, as a tuple |
| Labelled tuple | A tuple whose elements carry names for documentation |
| infer | Declares a type variable inside a conditional type that tsc fills from the match |
| Instantiation expression | \`fn<Type>\` without a call: the function type with type parameters filled in |

**Conclusion:** \`ReturnType\` and \`Parameters\` treat a function signature as the specification it already is: inputs as a tuple, output as a type, both derived with \`infer\` so they follow every change to the function. They are the standard tool for typing wrappers and for naming types a library never exported. Their limits all come from the same fact — they read one plain function type — so overloads give the last signature, generics give the constraint, and async functions give the \`Promise\`. Mention \`typeof\`, \`Awaited\` and instantiation expressions as the fixes, and the answer is complete.`,
    examples: [
      {
        label: `Deriving types from functions and typing a wrapper`,
        code: `// ReturnType and Parameters read types OUT of an existing function.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

function createOrder(customerId: string, items: string[], express = false) {
  return { id: "o-" + items.length, customerId, items, express, total: items.length * 10 };
}

// They take a function TYPE, so use typeof on the value.
type Order = ReturnType<typeof createOrder>;
type OrderArgs = Parameters<typeof createOrder>;
const _o: Equal<Order, { id: string; customerId: string; items: string[]; express: boolean; total: number }> = true;
// Parameters is a tuple; a default value makes that slot optional.
const _a: Equal<OrderArgs, [customerId: string, items: string[], express?: boolean]> = true;
const _a0: Equal<OrderArgs[0], string> = true;

// @ts-expect-error 'createOrder' refers to a value, but is being used as a type here.
type Wrong = ReturnType<createOrder>;

// Typical use 1: a type for a value nobody named.
function summary(order: Order): string {
  return order.id + " for " + order.customerId + ": " + order.total;
}
console.log(summary(createOrder("c1", ["pen", "ink"])));

// Typical use 2: a wrapper that keeps the exact signature of what it wraps.
function withLog<F extends (...args: any[]) => any>(name: string, fn: F) {
  return (...args: Parameters<F>): ReturnType<F> => {
    const result = fn(...args);
    console.log(name + "(" + JSON.stringify(args) + ") -> " + JSON.stringify(result));
    return result;
  };
}
const add = (a: number, b: number) => a + b;
const loggedAdd = withLog("add", add);
const _w: Equal<typeof loggedAdd, (a: number, b: number) => number> = true;
loggedAdd(2, 3);
// @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'.
loggedAdd(2, "3");

// Typical use 3: forward arguments to a library function you do not own.
function scheduleOrder(delayMs: number, ...args: Parameters<typeof createOrder>) {
  return { delayMs, order: createOrder(...args) };
}
console.log(JSON.stringify(scheduleOrder(5, "c2", ["cap"], true)));

// The class versions: ConstructorParameters and InstanceType.
class Cache {
  constructor(public name: string, public ttlMs: number) {}
}
const _c: Equal<ConstructorParameters<typeof Cache>, [name: string, ttlMs: number]> = true;
const _i: Equal<InstanceType<typeof Cache>, Cache> = true;
function make<C extends new (...args: any[]) => any>(Ctor: C, ...args: ConstructorParameters<C>): InstanceType<C> {
  return new Ctor(...args);
}
const c = make(Cache, "users", 1000);
console.log(c.name, c.ttlMs, c instanceof Cache);`,
      },
      {
        label: `Overloads, generic functions, methods and other edge cases`,
        code: `// The edge cases of ReturnType and Parameters, each checked by tsc.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Both are conditional types with infer (the same idea as lib.es5.d.ts).
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type MyParameters<F> = F extends (...args: infer P) => any ? P : never;
const _1: Equal<MyReturnType<() => Date>, Date> = true;
const _2: Equal<MyParameters<(a: string, ...rest: number[]) => void>, [a: string, ...rest: number[]]> = true;

// 2. An async function returns a Promise; add Awaited for the resolved value.
async function loadUser(id: number) {
  return { id, name: "user" + id };
}
const _3: Equal<ReturnType<typeof loadUser>, Promise<{ id: number; name: string }>> = true;
const _4: Equal<Awaited<ReturnType<typeof loadUser>>, { id: number; name: string }> = true;

// 3. Overloads: only the LAST signature is used.
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}
const _5: Equal<ReturnType<typeof parse>, string> = true;
const _6: Equal<Parameters<typeof parse>, [input: number]> = true;
console.log(typeof parse("42"), typeof parse(42));

// 4. Generic functions: the type parameter is replaced by its constraint.
function first<T>(xs: T[]): T | undefined {
  return xs[0];
}
function firstLen<T extends { length: number }>(xs: T[]): T | undefined {
  return xs[0];
}
const _7: Equal<ReturnType<typeof first>, unknown> = true;
const _8: Equal<ReturnType<typeof firstLen>, { length: number } | undefined> = true;
// Instantiation expressions (TypeScript 4.7+) pin T first.
const _9: Equal<ReturnType<typeof first<string>>, string | undefined> = true;
console.log(first(["a", "b"]), firstLen(["xyz"])?.length);

// 5. Methods: reach them with an indexed access type.
const api = {
  get(path: string, retries?: number) {
    return { path, status: 200 as const };
  },
};
type GetArgs = Parameters<typeof api.get>;
type GetResult = ReturnType<(typeof api)["get"]>;
const _10: Equal<GetArgs, [path: string, retries?: number | undefined]> = true;
const _11: Equal<GetResult, { path: string; status: 200 }> = true;
console.log(JSON.stringify(api.get("/me")));

// 6. A non-function is rejected by the constraint.
// @ts-expect-error Type 'string' does not satisfy the constraint '(...args: any) => any'.
type NotFn = ReturnType<string>;
// any and never pass through.
const _12: Equal<ReturnType<any>, any> = true;
const _13: Equal<ReturnType<never>, never> = true;
const _14: Equal<Parameters<() => void>, []> = true;
console.log("checked");`,
      },
    ],
  },
  {
    title: `What is the Awaited utility type?`,
    difficulty: "medium",
    seoDescription: `Awaited<T> is the type await produces: it unwraps promises and thenables recursively. Why it exists, how Promise.all uses it and generic gotchas.`,
    description: `**Question presented to candidate:**
"What is the \`Awaited\` utility type? Why did TypeScript add it when \`T extends Promise<infer U> ? U : T\` already existed, and where do you use it?"

**What a strong answer should cover:**
- \`Awaited<T>\` is the type you get from \`await\` on a \`T\`: it unwraps promises **recursively**, unwraps any thenable (an object with a callable \`then\`), and leaves non-promise types unchanged
- It distributes over unions: \`Awaited<boolean | Promise<number>>\` is \`boolean | number\`
- Common use: \`Awaited<ReturnType<typeof fn>>\` for the resolved value of an async function; library typings such as \`Promise.all\` use it so tuples keep each slot type
- It was added in TypeScript 4.5; a one-level \`infer\` version leaves \`Promise<string>\` behind for nested promises
- Generic code: \`await\` on a \`T\` gives \`Awaited<T>\`, and an inferred generic async return type can be wrong, so annotate \`Promise<Awaited<T>>\`

**Code / implementation expected:** Optional — \`Awaited<ReturnType<...>>\`, or a hand-written recursive version.`,
    answer: `**Target Audience:** Developers comfortable with \`async\`/\`await\` who want to describe "the value inside the promise" as a type.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; that \`Awaited\` arrived in TypeScript 4.5 is cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

You order a gift online. It arrives in a shipping box. Inside the shipping box is a gift box. Inside the gift box is the watch. When you "open the present", you do not stop at the first box — you keep opening until you reach the watch. And if someone hands you the watch directly, there is nothing to open: you just have the watch.

\`await\` behaves like that. \`await\` on a promise of a promise of a string gives a string — every layer is opened. \`await 5\` is just \`5\`. \`Awaited<T>\` is the type-level description of that behaviour: "what do I hold after I have opened every box?"

📌 **Interview term: Awaited** — \`Awaited<T>\` is the type of \`await x\` when \`x\` has type \`T\`: promises and thenables are unwrapped recursively, other types pass through.

📌 **Interview term: thenable** — any object with a callable \`then\` method. \`await\` treats it like a promise; so does \`Awaited\` (it is \`PromiseLike\`, not only \`Promise\`).

## 2. What It Does

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Promise of Promise of string unwraps to Promise of string, which unwraps to string.">
  <defs>
    <marker id="q4arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="130" y="94" text-anchor="middle">Promise of</text>
  <text class="d-sub" x="130" y="118" text-anchor="middle">Promise of string</text>
  <rect class="d-box" x="300" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="390" y="94" text-anchor="middle">Promise of</text>
  <text class="d-sub" x="390" y="118" text-anchor="middle">string</text>
  <rect class="d-box-accent" x="560" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="640" y="94" text-anchor="middle">string</text>
  <text class="d-sub" x="640" y="118" text-anchor="middle">no then: stop</text>
  <path class="d-edge" d="M 244 100 L 294 100" marker-end="url(#q4arrow)"/>
  <path class="d-edge-accent" d="M 484 100 L 554 100" marker-end="url(#q4arrow)"/>
</svg>

Each step removes one layer, and the recursion stops at a type that has no callable \`then\`. Example 1 checks the core rules:

| Input | \`Awaited<...>\` |
| :--- | :--- |
| \`Promise<string>\` | \`string\` |
| \`Promise<Promise<number>>\` | \`number\` (recursive) |
| \`boolean\` | \`boolean\` (not a promise: unchanged) |
| \`boolean \\| Promise<number>\` | \`boolean \\| number\` (per union member) |
| \`PromiseLike<Date>\` | \`Date\` (any thenable) |

The run side matches: \`await Promise.resolve(Promise.resolve(Promise.resolve("deep")))\` prints \`deep string\` — one \`await\`, every layer gone. A hand-written object with a \`then(onFulfilled)\` method is awaited too and yields \`7\`.

## 3. Why It Was Added

Before \`Awaited\`, people wrote a one-level unwrap:

~~~ts
type OneLevel<T> = T extends Promise<infer V> ? V : T;
// OneLevel<Promise<Promise<string>>> is Promise<string>  (checked in example 2)
~~~

That disagrees with what \`await\` does at run time. The TypeScript 4.5 release notes introduce \`Awaited\` to model \`await\` and \`.then()\`, and name \`Promise.all\` inference problems as a motivation; \`Promise.all\` and friends were re-typed with it ([TypeScript 4.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html)). In the 5.4.5 lib, the tuple overload is:

~~~ts
all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
~~~

so \`await Promise.all([Promise.resolve(1), fetchConfig(), "already a value"])\` is typed \`[number, Config, string]\` — each slot unwrapped, a plain value left alone (checked).

## 4. How It Is Built

The 5.4.5 definition, comments trimmed:

~~~ts
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ?
    F extends ((value: infer V, ...args: infer _) => any) ? Awaited<V> : never :
  T;
~~~

Read it top to bottom:

1. \`null\` and \`undefined\` pass through (a special case for code without \`strictNullChecks\`).
2. If \`T\` is an **object** with a \`then\` method, \`infer F\` captures \`then\` first parameter — the callback.
3. If that callback is a function, \`infer V\` captures the value it receives, and the type **recurses** on \`V\`.
4. If \`then\` exists but its first parameter is not callable, the result is \`never\`: such a thing can never deliver a value. Example 2 checks \`Awaited<{ then(x: number): void }>\` is \`never\`.
5. Anything else is returned unchanged: \`Awaited<{ then: string }>\` is \`{ then: string }\` because a \`then\` that is a string is not a method.

Example 2 also writes a simplified \`MyAwaited\` with the same recursion. The techniques — \`infer\` and recursive conditional types — are covered in [How do you use infer to build deep Awaited, ReturnType and Unwrap utilities?](/interview-question/how-do-you-use-infer-to-build-deep-awaited-returntype-and-unwrap-utilities) and [What are recursive types?](/interview-question/what-are-recursive-types)

📌 **Interview term: recursive conditional type** — a conditional type that refers to itself in a branch, as \`Awaited<V>\` does, so it can peel any number of layers.

## 5. Where You Use It

**The resolved value of an async function.** The most common line in real code:

~~~ts
async function fetchConfig() { return { retries: 3, region: "eu" }; }
type Config = Awaited<ReturnType<typeof fetchConfig>>; // { retries: number; region: string }
~~~

Without \`Awaited\` you have the promise type, and \`ReturnType<typeof fetchConfig>["retries"]\` is \`error TS2339: Property 'retries' does not exist on type 'Promise<{ retries: number; region: string; }>'.\` More on \`ReturnType\`: [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

**Helpers that accept "a value or a promise".** Example 2 types a timeout helper as \`withTimeout<T>(work: T | PromiseLike<T>, ms: number): Promise<Awaited<T>>\`. It works with a promise (\`"fast"\`), a plain value (\`99\` gives \`100\` after \`+ 1\`) and rejects slow work with \`timeout after 30ms\`.

## 6. The Generic Async Trap

Inside a generic function, \`await value\` with \`value: T\` gives \`Awaited<T>\`, not \`T\` (checked). But look at the **inferred return type**:

~~~ts
async function settle<T>(value: T) {
  const v = await value; // Awaited<T>
  return v;
}
// tsc 5.4.5: ReturnType<typeof settle<Promise<number>>> is Promise<Promise<number>>
~~~

tsc shows the signature as \`<T>(value: T) => Promise<T>\`, so with \`T = Promise<number>\` it claims a promise of a promise — something an async function can never return, since \`await\` and \`return\` flatten it. The run prints \`number\` for the awaited result. The fix is to state the truth in the annotation:

~~~ts
async function settleFixed<T>(value: T): Promise<Awaited<T>> {
  return await value;
}
// ReturnType<typeof settleFixed<Promise<number>>> is Promise<number>  (checked)
~~~

The wrong type mostly hides, because \`await settle(...)\` unwraps every layer again (tsc confirms the awaited result is \`number\`); it bites when you store or pass the promise itself. For general guidance on typing async code, see [How do you type async functions and Promises?](/interview-question/how-do-you-type-async-functions-and-promises)

## 7. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and the \`// @ts-expect-error\` line is a real error (quoted above, from a run with the directive removed). Then each example was run as the page runs it.

Example 1, what \`Awaited\` unwraps:

~~~text
deep string
[{"retries":3,"region":"eu"}]
1
2 eu ALREADY A VALUE
42
~~~

The \`1\` on line 3 is \`const r: Wrong["retries"] = 1\` running with its type error suppressed — at run time it is just a number.

Example 2, a hand-written version, edge cases and generic code:

~~~text
fast
100
timeout after 30ms
10
number
~~~

## 8. Edge Cases

| Input | Result | Why |
| :--- | :--- | :--- |
| \`any\` | \`any\` | checked |
| \`unknown\` | \`unknown\` | not known to be a thenable |
| \`null\` | \`null\` | special case in the definition |
| \`{ then: string }\` | unchanged | \`then\` is not callable |
| \`{ then(x: number): void }\` | \`never\` | \`then\` takes no callback, so it can never resolve |

## Common Pitfalls

- **Writing a one-level \`infer\` unwrap.** Nested promises leave \`Promise<...>\` behind; use \`Awaited\`.
- **Using \`ReturnType\` of an async function as the data type.** It is the promise; wrap it in \`Awaited\`.
- **Trusting the inferred return type of a generic async function.** Annotate \`Promise<Awaited<T>>\`.
- **Expecting \`Awaited\` to unwrap only \`Promise\`.** Any object with a callable \`then\` is unwrapped, at the type level and at run time.
- **Treating \`Awaited\` as a run-time operation.** It only describes \`await\`; nothing waits unless you \`await\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;T&gt;</code> is the type of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await x</code> for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> of type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. It unwraps promises <strong style="color:#ffca28;">recursively</strong>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;Promise&lt;Promise&lt;number&gt;&gt;&gt;</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">Non-promise types pass through unchanged, unions are unwrapped per member, and any <strong style="color:#ffca28;">thenable</strong> (an object with a callable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code>) counts, not only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it exists:</strong> <span style="color:#f0e2c8;">A one-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T extends Promise&lt;infer U&gt; ? U : T</code> disagreed with run-time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> on nested promises. TypeScript 4.5 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> uses it so tuples keep each slot type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Everyday use:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;ReturnType&lt;typeof fetchUser&gt;&gt;</code> for the data an async function resolves to, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;Awaited&lt;T&gt;&gt;</code> for helpers that accept a value or a promise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Generic gotcha:</strong> <span style="color:#f0e2c8;">In a generic async function, awaiting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;T&gt;</code>, but the inferred return type is shown as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T&gt;</code>; annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;Awaited&lt;T&gt;&gt;</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T = Promise&lt;number&gt;</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;number&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write a simple <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Awaited</code> yourself.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type MyAwaited&lt;T&gt; = T extends { then(onfulfilled: (value: infer V) =&gt; any): any } ? MyAwaited&lt;V&gt; : T</code>. The recursion on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">V</code> is what handles nested promises; the built-in adds special cases for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and non-callable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Awaited&lt;boolean | Promise&lt;number&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean | number</code>. It is a distributive conditional type, so each union member is unwrapped separately and the non-promise member passes through.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Promise.all</code> need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Awaited</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its tuple overload maps each element to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;T[P]&gt;</code>, so a mix of promises and plain values resolves to the right tuple, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[number, Config, string]</code>. The 4.5 release notes name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> inference problems as a motivation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Awaited</code> of an object whose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">then</code> does not take a callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. Such an object would be treated as a thenable by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, but it can never call back with a value, so there is no resolved type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Promise&lt;Awaited&lt;T&gt;&gt;</code> explicitly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In generic async helpers, like a timeout or cache wrapper that accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | PromiseLike&lt;T&gt;</code>. The annotation says the result is flattened, which inference does not express for a generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Awaited | The type of \`await x\` for an \`x\` of type \`T\`, unwrapped recursively |
| Thenable | Any object with a callable \`then\` method |
| Recursive conditional type | A conditional type that refers to itself in a branch |

**Conclusion:** \`Awaited<T>\` is a type-level model of \`await\`: open every promise-like layer, leave anything else alone, and do it per union member. It replaced the one-level \`infer\` unwrap that disagreed with run-time behaviour, and it is why \`Promise.all\` and \`Awaited<ReturnType<typeof fn>>\` give the types you expect. In generic code, remember that awaiting \`T\` gives \`Awaited<T>\` and annotate \`Promise<Awaited<T>>\` on the result — that detail is what separates a memorised definition from real understanding.`,
    examples: [
      {
        label: `What Awaited unwraps, at compile time and at run time`,
        code: `// Awaited<T> is "the type you get after await". Checked by tsc, then run.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. It unwraps a Promise, and keeps unwrapping nested ones.
const _1: Equal<Awaited<Promise<string>>, string> = true;
const _2: Equal<Awaited<Promise<Promise<number>>>, number> = true;
// 2. A non-promise passes through unchanged (await 5 is 5).
const _3: Equal<Awaited<boolean>, boolean> = true;
// 3. Unions are unwrapped member by member.
const _4: Equal<Awaited<boolean | Promise<number>>, boolean | number> = true;
// 4. Anything with a callable then (a "thenable") counts, not only Promise.
const _5: Equal<Awaited<PromiseLike<Date>>, Date> = true;

// The run-time side: await really does flatten every layer.
async function main() {
  const nested = Promise.resolve(Promise.resolve(Promise.resolve("deep")));
  const v = await nested;
  const _v: Equal<typeof v, string> = true;
  console.log(v, typeof v);

  // Most common use: the resolved type of an async function you did not annotate.
  async function fetchConfig() {
    return { retries: 3, region: "eu" };
  }
  type Config = Awaited<ReturnType<typeof fetchConfig>>;
  const _c: Equal<Config, { retries: number; region: string }> = true;
  const cache: Config[] = [];
  cache.push(await fetchConfig());
  console.log(JSON.stringify(cache));

  // Without Awaited you get the Promise, which is usually the wrong thing to store.
  type Wrong = ReturnType<typeof fetchConfig>;
  // @ts-expect-error Property 'retries' does not exist on type 'Promise<{ retries: number; region: string; }>'.
  const r: Wrong["retries"] = 1;
  console.log(r);

  // Promise.all uses Awaited in its lib type, so a tuple keeps each slot type.
  const [n, s, plain] = await Promise.all([Promise.resolve(1), fetchConfig(), "already a value"]);
  const _t: Equal<[typeof n, typeof s, typeof plain], [number, Config, string]> = true;
  console.log(n + 1, s.region, plain.toUpperCase());

  // A hand-written thenable is unwrapped by await too.
  const thenable = {
    then(onFulfilled: (value: number) => void) {
      onFulfilled(7);
    },
  };
  const t = await thenable;
  const _th: Equal<typeof t, number> = true;
  console.log(t * 6);
}
main();`,
      },
      {
        label: `A hand-written Awaited, edge cases and Awaited in generic code`,
        code: `// Awaited in generic code, a hand-written version, and its edge cases.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A simplified hand-written Awaited: infer the value then passes on, and recurse.
type MyAwaited<T> = T extends { then(onfulfilled: (value: infer V) => any): any } ? MyAwaited<V> : T;
const _1: Equal<MyAwaited<Promise<Promise<string>>>, string> = true;
// One level only (no recursion) is what people often write first.
type OneLevel<T> = T extends Promise<infer V> ? V : T;
const _2: Equal<OneLevel<Promise<Promise<string>>>, Promise<string>> = true;

// 2. Edge cases of the built-in.
const _3: Equal<Awaited<null>, null> = true;
const _4: Equal<Awaited<any>, any> = true;
const _5: Equal<Awaited<unknown>, unknown> = true;
// An object whose then is NOT callable is not a thenable: it stays as it is.
const _6: Equal<Awaited<{ then: string }>, { then: string }> = true;
// A then whose first argument is not a callback can never resolve: never.
const _7: Equal<Awaited<{ then(x: number): void }>, never> = true;

// 3. Generic async code: inside, awaiting a T gives Awaited<T>...
async function settle<T>(value: T) {
  const v = await value;
  const _in: Equal<typeof v, Awaited<T>> = true;
  return v;
}
// ...but the INFERRED return type is Promise<T>, so with T = Promise<number>
// tsc claims Promise<Promise<number>>, which no async function can return.
const _8: Equal<ReturnType<typeof settle<Promise<number>>>, Promise<Promise<number>>> = true;
// Annotating Promise<Awaited<T>> states the truth.
async function settleFixed<T>(value: T): Promise<Awaited<T>> {
  return await value;
}
const _9: Equal<ReturnType<typeof settleFixed<Promise<number>>>, Promise<number>> = true;

// 4. A helper that accepts a value OR a promise and times it out.
function withTimeout<T>(work: T | PromiseLike<T>, ms: number): Promise<Awaited<T>> {
  return new Promise<Awaited<T>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout after " + ms + "ms")), ms);
    Promise.resolve(work).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const delay = <T,>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

async function main() {
  const fast = await withTimeout(delay(10, "fast"), 200);
  const _f: Equal<typeof fast, string> = true;
  console.log(fast);

  const plain = await withTimeout(99, 50);
  console.log(plain + 1);

  try {
    await withTimeout(delay(300, "slow"), 30);
  } catch (e) {
    console.log(e instanceof Error ? e.message : "?");
  }

  const n = await settleFixed(Promise.resolve(5));
  console.log(n * 2);
  // await unwraps every layer anyway, so the wrong type hides until you
  // store or pass the promise itself.
  const lie = await settle(Promise.resolve(5));
  const _l: Equal<typeof lie, number> = true;
  console.log(typeof lie);
}
main();`,
      },
    ],
  },
  {
    title: `How do you type async functions and Promises?`,
    difficulty: "medium",
    seoDescription: `Type async functions as Promise<T>, give new Promise a type argument, narrow unknown errors and type Promise.all, allSettled and race correctly.`,
    description: `**Question presented to candidate:**
"How do you type async functions and Promises in TypeScript? Walk me through return types, errors, and running several promises at once — and tell me which async bugs the compiler will not catch."

**What a strong answer should cover:**
- An async function always returns \`Promise<T>\`: annotate \`Promise<User>\` (annotating \`User\` is error TS1064), \`Promise<void>\` when nothing useful is returned; plain returned values are wrapped
- \`new Promise<T>(...)\` needs its type argument or the value is \`unknown\`; callback types say \`() => Promise<T>\`; \`Awaited\` and \`ReturnType\` derive types from existing async functions
- Errors are untyped: \`Promise<T>\` has no error parameter, a \`catch (err)\` variable is \`unknown\` under \`strict\` (TypeScript 4.4+), but \`.catch\` and \`allSettled\` reasons are \`any\`
- Concurrency: \`Promise.all\` on an array literal gives a typed tuple, \`allSettled\` results narrow on \`status\`, \`race\` with a \`Promise<never>\` timeout keeps the result type
- Bugs tsc does not flag: async callbacks passed to \`forEach\`, floating promises, \`return\` without \`await\` inside \`try\` — lint rules like \`no-floating-promises\` cover some of them

**Clarifying questions expected:**
- Should independent calls run in parallel or one after another?
- Is \`strict\` (or \`useUnknownInCatchVariables\`) on, and is type-aware linting part of the toolchain?

**Code / implementation expected:** Yes — a typed async function with error handling, and a \`Promise.all\` or \`allSettled\` call.`,
    answer: `**Target Audience:** Developers who use \`async\`/\`await\` daily and want the types to be precise — return types, errors, and concurrent calls.
**Difficulty:** Medium
**TypeScript version:** Every type claim below was checked by TypeScript 5.4.5 with \`--strict\`; release versions are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

At a busy burger place you order and get a buzzer instead of food. The buzzer is a promise: right now it holds nothing, later it will either buzz "your burger is ready" or "sorry, we ran out". The useful thing to write on the buzzer is **what** you will get when it buzzes — "1 cheeseburger" — not "a buzzer".

That is the whole idea of typing async code. An async function hands back a buzzer, \`Promise<T>\`, and \`T\` is what you will get when it settles successfully. Most mistakes come from mixing up the buzzer and the burger: annotating the burger where the buzzer goes, using the buzzer as if it were the burger (a missing \`await\`), or walking away from a buzzer nobody is watching (a floating promise).

📌 **Interview term: Promise&lt;T&gt;** — an object representing a value of type \`T\` that will be available later, or a failure. \`T\` describes only the success value.

📌 **Interview term: settle** — a promise settles once: it is **fulfilled** with a value or **rejected** with a reason. Before that it is **pending**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="A pending promise settles once, either fulfilled with a value of type T or rejected with an untyped reason.">
  <defs>
    <marker id="q5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="105" width="200" height="80" rx="10"/>
  <text class="d-text" x="140" y="140" text-anchor="middle">pending</text>
  <text class="d-sub" x="140" y="164" text-anchor="middle">Promise of User</text>
  <rect class="d-box-accent" x="480" y="20" width="240" height="90" rx="10"/>
  <text class="d-text" x="600" y="56" text-anchor="middle">fulfilled</text>
  <text class="d-sub" x="600" y="82" text-anchor="middle">value has type User</text>
  <rect class="d-box" x="480" y="180" width="240" height="90" rx="10"/>
  <text class="d-text" x="600" y="216" text-anchor="middle">rejected</text>
  <text class="d-sub" x="600" y="242" text-anchor="middle">reason is untyped</text>
  <path class="d-edge-accent" d="M 244 130 L 474 70" marker-end="url(#q5arrow)"/>
  <path class="d-edge-dashed" d="M 244 160 L 474 222" marker-end="url(#q5arrow)"/>
</svg>

The type parameter describes only the top branch. Nothing in \`Promise<User>\` says what a rejection carries — that is the most important fact about errors in section 4.

## 2. Typing Async Functions

**An async function always returns a Promise.** Annotate \`Promise<T>\`, where \`T\` is what you \`return\`:

~~~ts
async function getUser(id: number): Promise<User> {
  return { id, name: "user" + id }; // a plain value: async wraps it
}
async function countUsers() { return 2; } // inferred: Promise<number>
async function audit(msg: string): Promise<void> { log.push("audit:" + msg); }
~~~

Annotating the inner type is a compile error (example 1):

~~~text
error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<User>'?
~~~

Whether to annotate or infer: inference is correct for simple functions, but an explicit \`Promise<User>\` on exported functions turns "I returned the wrong shape" into an error at the function, not at every caller. Return types like \`void\` vs \`undefined\` are discussed in [What is the difference between void, undefined and never as return types?](/interview-question/what-is-the-difference-between-void-undefined-and-never-as-return-types)

**Function types for async callbacks** say \`Promise\` too: \`type Loader<T> = (id: number) => Promise<T>\`.

**\`new Promise\` needs its type argument.** \`new Promise((resolve) => resolve(42))\` is \`Promise<unknown>\` (checked) — tsc cannot infer \`T\` from a later \`resolve\` call. Write \`new Promise<number>(...)\`; for a timer, \`new Promise<void>((resolve) => setTimeout(resolve, ms))\`.

**Derive instead of repeating.** \`Awaited<ReturnType<typeof getUser>>\` is \`User\`. See [What is the Awaited utility type?](/interview-question/what-is-the-awaited-utility-type) and [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

**\`.then\` chains are typed per step.** \`await risky(false).then((s) => s.length).catch(() => -1)\` is \`number\` (checked): each callback return type becomes the next promise type.

## 3. Typing Concurrent Work

Example 2:

| Call | Type you get | Notes |
| :--- | :--- | :--- |
| \`await Promise.all([delay(20, 3), delay(10, "users"), delay(5, [true])])\` | \`[number, string, boolean[]]\` | an array literal gives a **tuple**; rejects as soon as one input rejects |
| \`await Promise.allSettled([...])\` | array of \`PromiseSettledResult<...>\` | never rejects; check \`r.status === "fulfilled"\` to read \`r.value\`, otherwise \`r.reason\` |
| \`await Promise.race([delay(10, "data"), failAfter(200, "timeout")])\` | \`string\` | \`failAfter\` returns \`Promise<never>\`, and \`never\` adds nothing to a union |
| \`await Promise.all(items.map(async (x) => ...))\` | \`string[]\` | parallel; results keep input order |

📌 **Interview term: Promise&lt;never&gt;** — a promise that can only reject. Typing a timeout as \`Promise<never>\` means racing it does not widen the result type.

📌 **Interview term: sequential vs parallel** — \`for (const x of xs) await f(x)\` runs one call after another; \`Promise.all(xs.map(f))\` starts them all at once. Example 2 prints \`seq 30, seq 10 / par 30, par 10\`: both keep input order, but the parallel version waits about as long as the slowest call, not the sum: a separate Node run with 100 ms and 50 ms timers took 100 ms with \`Promise.all\` and 149 ms with the loop.

## 4. Errors Are Not Part of the Type

\`Promise<T>\` has no second parameter for the error. Anything can be thrown, so TypeScript cannot know what a rejection holds. What you get depends on **where** you catch (example 3):

| Where | Type of the error | Checked |
| :--- | :--- | :--- |
| \`catch (err)\` in \`try\`/\`catch\` with \`strict\` | \`unknown\` | yes |
| \`.catch((reason) => ...)\` | \`any\` | yes |
| \`PromiseRejectedResult["reason"]\` from \`allSettled\` | \`any\` | yes |

Under \`strict\`, using \`err.message\` directly is \`error TS18046: 'err' is of type 'unknown'.\` — narrow first with \`err instanceof Error\`. This default comes from \`useUnknownInCatchVariables\`, added in TypeScript 4.4 and included in \`strict\` ([TypeScript 4.4 RC announcement](https://devblogs.microsoft.com/typescript/?p=3042), [OpenReplay](https://blog.openreplay.com/typescript-44-the-good-the-bad-and-the-not-so-bad/)). The \`any\` in \`.catch\` is how the lib declares it; in example 3 the typo \`reason.mesage\` compiles and prints \`undefined\`. A safe habit is to treat every reason as \`unknown\` and pass it to one \`describe(e: unknown)\` helper. More: [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown) and [What does the strict flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable)

Something that is not an \`Error\` can be thrown too: \`Promise.reject("plain string")\` prints \`non-error: "plain string"\`.

📌 **Interview term: useUnknownInCatchVariables** — the compiler option (part of \`strict\`) that types \`catch\` variables as \`unknown\` instead of \`any\`.

## 5. Async Bugs the Compiler Does Not Catch

Each of these compiles under \`--strict\` in 5.4.5 and misbehaves at run time:

**1. \`forEach\` with an async callback.** \`forEach\` expects a callback returning \`void\`, and a function returning a Promise is assignable to that (a \`void\` return type means "the result is ignored"). So nothing waits:

~~~text
after forEach | forEach 10 | forEach 30
~~~

"after forEach" ran first, and the callbacks finished in timer order. Use \`for...of\` with \`await\` (sequential) or \`Promise.all(xs.map(async ...))\` (parallel).

**2. A floating promise.** \`delay(1, "ignored");\` with no \`await\` compiles: an unused value is not a type error, and a rejection there would go unhandled. The moment you use the result, tsc does notice: \`notAwaited.total\` is \`error TS2339: Property 'total' does not exist on type 'Promise<{ total: number; }>'.\` (with the error suppressed it prints \`undefined\`).

**3. \`return\` without \`await\` inside \`try\`.** In example 3, \`withoutAwait\` does \`return loadPrice("").then(String)\` inside a \`try\`. The function returns before the promise rejects, so its \`catch\` never runs and the caller sees \`escaped: Error: empty sku\`. \`return await\` keeps the rejection inside the \`try\` and prints \`fallback\`. Both versions have the same type, \`Promise<string>\`.

📌 **Interview term: floating promise** — a promise that nobody awaits, returns or attaches a rejection handler to.

Type-aware lint rules fill this gap: typescript-eslint \`no-floating-promises\` flags unhandled promises, and \`no-misused-promises\` (its \`checksVoidReturn\` option) flags async callbacks passed where a \`void\` callback is expected, such as \`forEach\` ([no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises), [no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises)). Not run here.

## 6. Verified: Running the Code

All three examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, async return types, \`new Promise\`, \`Promise<void>\` and \`unknown\` errors:

~~~text
user7
43 2
db down
caught db down
2 audit:start
~~~

Line 3 is \`err.message\` running with its \`unknown\` error suppressed: here \`err\` happened to be an \`Error\`, which is exactly what the compiler could not know.

Example 2, concurrency and the \`forEach\` trap:

~~~text
3 users 1
ok 1
failed boom
ok 3
race: data
after forEach | forEach 10 | forEach 30
seq 30, seq 10 / par 30, par 10
undefined
5
~~~

Example 3, error types and \`return await\`:

~~~text
try/catch -> Error: empty sku
catch typo -> undefined
allSettled -> non-error: "plain string"
with await -> fallback
without await -> escaped: Error: empty sku
~~~

## 7. Choosing a Combinator

| Need | Use | Result type |
| :--- | :--- | :--- |
| All results, fail fast | \`Promise.all\` | tuple or array of \`Awaited\` values |
| All results, never fail | \`Promise.allSettled\` | \`PromiseSettledResult<T>[]\`, narrow on \`status\` |
| First to settle (timeouts) | \`Promise.race\` | union of the inputs; \`Promise<never>\` adds nothing |
| First to succeed | \`Promise.any\` | union of the inputs; rejects with an \`AggregateError\` only if all fail |

Async iteration and disposal have their own pages: [What's new to type in TypeScript 5.5+ libs — Array.fromAsync, Set methods, Iterator helpers?](/interview-question/what-s-new-to-type-in-typescript-5-5-libs-array-fromasync-set-methods-iterator-h) and [How does using / await using with Symbol.dispose work in TypeScript 5.2+?](/interview-question/how-does-using-await-using-with-symbol-dispose-work-in-typescript-5-2)

## Common Pitfalls

- **Annotating an async function with the inner type.** It must be \`Promise<T>\` (TS1064).
- **\`new Promise(...)\` without a type argument.** The value is \`unknown\`.
- **Using \`err.message\` without narrowing**, or trusting the \`any\` in \`.catch\` and \`allSettled\` reasons. Narrow with \`instanceof Error\`.
- **Passing an async callback to \`forEach\`.** It compiles; nothing waits. Use \`for...of\` or \`Promise.all\` with \`map\`.
- **Awaiting in a loop when the calls are independent.** It is sequential; \`Promise.all\` runs them in parallel.
- **\`return promise\` inside \`try\` without \`await\`.** The rejection escapes the \`catch\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Return types:</strong> <span style="color:#f0e2c8;">An async function always returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T&gt;</code>, so I annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;User&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;void&gt;</code>; writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">User</code> is error TS1064. Returned plain values are wrapped automatically.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Creating promises:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Promise&lt;T&gt;(...)</code> needs the type argument, otherwise the value is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>. Callback types say <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; Promise&lt;T&gt;</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code> derives the resolved type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Errors:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T&gt;</code> does not type its rejection. Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catch</code> variable is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> and must be narrowed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof Error</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.catch</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allSettled</code> reasons are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, so I treat them as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> anyway.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Concurrency:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> on an array literal gives a typed tuple, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allSettled</code> results narrow on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, and a timeout typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;never&gt;</code> can be raced without widening the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What tsc misses:</strong> <span style="color:#f0e2c8;">Async callbacks in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code>, floating promises and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> all compile. I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return await</code>, and the typescript-eslint promise rules.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a function typed to return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code> accept an async callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> return type in a callback type means the result is ignored, so any return value is allowed, including a Promise. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2].forEach(async ...)</code> compiles and nothing waits for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type the error of a rejected promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot in the Promise type: it has no error parameter, because anything can be thrown. Model expected failures in the success type instead, like a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ok: false; error: string }</code> result union, and narrow unexpected ones from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the type of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await Promise.all([fetchUser(), fetchPosts()])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A tuple, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[User, Post[]]</code>. The lib overload maps each element of the input tuple through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Awaited</code>, so plain values and promises can be mixed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return await</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catch</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> the function returns the pending promise and leaves the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, so a later rejection skips the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catch</code>. Outside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> the caller sees the same value or rejection either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a timeout helper?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the timeout side <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;never&gt;</code>, since it can only reject, and race it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.race([work, timeout(ms)])</code> keeps the type of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work</code>. Or write a generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withTimeout&lt;T&gt;(work: PromiseLike&lt;T&gt;, ms): Promise&lt;Awaited&lt;T&gt;&gt;</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Promise&lt;T&gt; | A value of type \`T\` available later, or a failure; \`T\` describes only success |
| Settle | Become fulfilled (with a value) or rejected (with a reason), once |
| Promise&lt;never&gt; | A promise that can only reject, such as a timeout |
| Sequential vs parallel | Awaiting in a loop vs starting all calls and awaiting \`Promise.all\` |
| useUnknownInCatchVariables | Option in \`strict\` that types \`catch\` variables as \`unknown\` |
| Floating promise | A promise nobody awaits, returns or handles |

**Conclusion:** Typing async code comes down to keeping the buzzer and the burger apart: functions return \`Promise<T>\`, \`await\` gives you \`T\`, and \`Awaited\` and \`ReturnType\` derive both from code you already have. The compiler is precise about success values — tuples from \`Promise.all\`, narrowed \`allSettled\` results, \`never\` timeouts — but it knows nothing about rejections and cannot see promises that nobody waits for. A strong answer says both halves: how to make the success types exact, and which async bugs need \`unknown\` narrowing, \`return await\` and lint rules because the type system will not catch them.`,
    examples: [
      {
        label: `Async return types, new Promise, Promise<void> and unknown errors`,
        code: `// Typing async functions and Promises: the basics, checked by tsc and run.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface User { id: number; name: string }

// 1. An async function ALWAYS returns a Promise. Annotate Promise<T>, where T is
// what you return. Returning a plain value is fine: it gets wrapped.
async function getUser(id: number): Promise<User> {
  return { id, name: "user" + id };
}
// Inference works too: this is Promise<number>.
async function countUsers() {
  return 2;
}
const _1: Equal<ReturnType<typeof countUsers>, Promise<number>> = true;

// 2. Annotating the inner type instead of the Promise is a compile error (TS1064).
// @ts-expect-error The return type of an async function or method must be the global Promise<T> type.
async function wrong(): User {
  return { id: 0, name: "x" };
}

// 3. A function with no useful result returns Promise<void>.
async function audit(msg: string): Promise<void> {
  log.push("audit:" + msg);
}
const log: string[] = [];

// 4. Function TYPES for async callbacks say Promise too.
type Loader<T> = (id: number) => Promise<T>;
const loadUser: Loader<User> = getUser;

// 5. new Promise needs its type argument, or the value is unknown.
const vague = new Promise((resolve) => resolve(42));
const _2: Equal<typeof vague, Promise<unknown>> = true;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const answer = new Promise<number>((resolve) => setTimeout(() => resolve(42), 5));

// 6. Under strict, a caught value is unknown: narrow it before use.
async function risky(fail: boolean): Promise<string> {
  if (fail) throw new Error("db down");
  return "ok";
}

async function main() {
  const u = await loadUser(7);
  console.log(u.name);
  await audit("start");
  await sleep(5);
  console.log((await answer) + 1, await countUsers());
  try {
    await risky(true);
  } catch (err) {
    const _e: Equal<typeof err, unknown> = true;
    // @ts-expect-error 'err' is of type 'unknown'.
    console.log(err.message);
    console.log(err instanceof Error ? "caught " + err.message : String(err));
  }
  // .then chains are typed step by step.
  const len = await risky(false).then((s) => s.length).catch(() => -1);
  const _l: Equal<typeof len, number> = true;
  console.log(len, log.join(","));
}
main();`,
      },
      {
        label: `Promise.all tuples, allSettled, race and the forEach trap`,
        code: `// Typing concurrent Promise code, and the async mistakes tsc does NOT catch.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const delay = <T,>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const failAfter = (ms: number, msg: string) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

async function main() {
  // 1. Promise.all on an array literal gives a TUPLE: each slot keeps its type.
  const [count, label, flags] = await Promise.all([delay(20, 3), delay(10, "users"), delay(5, [true])]);
  const _1: Equal<[typeof count, typeof label, typeof flags], [number, string, boolean[]]> = true;
  console.log(count, label, flags.length);

  // 2. allSettled never rejects; narrow each result on status.
  const results = await Promise.allSettled([delay(5, 1), failAfter(5, "boom"), delay(5, 3)]);
  for (const r of results) {
    if (r.status === "fulfilled") console.log("ok", r.value);
    else console.log("failed", r.reason instanceof Error ? r.reason.message : r.reason);
  }

  // 3. race with a timeout: Promise<never> adds nothing to the result type.
  const winner = await Promise.race([delay(10, "data"), failAfter(200, "timeout")]);
  const _3: Equal<typeof winner, string> = true;
  console.log("race:", winner);

  // 4. forEach does not wait for async callbacks. tsc accepts it because a
  // callback typed to return void may return anything, including a Promise.
  const order: string[] = [];
  [30, 10].forEach(async (ms) => {
    await delay(ms, null);
    order.push("forEach " + ms);
  });
  order.push("after forEach");
  await delay(50, null);
  console.log(order.join(" | "));

  // The fix: for...of runs in sequence, Promise.all + map in parallel.
  const seq: string[] = [];
  for (const ms of [30, 10]) {
    await delay(ms, null);
    seq.push("seq " + ms);
  }
  const par = await Promise.all([30, 10].map(async (ms) => {
    await delay(ms, null);
    return "par " + ms;
  }));
  const _4: Equal<typeof par, string[]> = true;
  console.log(seq.join(", "), "/", par.join(", "));

  // 5. A forgotten await is not a type error if the value is unused...
  delay(1, "ignored");
  // ...but it is the moment you use the result as the inner type.
  const notAwaited = delay(1, { total: 5 });
  // @ts-expect-error Property 'total' does not exist on type 'Promise<{ total: number; }>'.
  console.log(notAwaited.total);
  console.log((await notAwaited).total);
}
main();`,
      },
      {
        label: `Error types in async code and return await inside try`,
        code: `// Errors in async code: what tsc knows about them, and what it cannot see.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A Promise type says nothing about its error: Promise<T> has no error parameter.
async function loadPrice(sku: string): Promise<number> {
  if (sku === "") throw new Error("empty sku");
  return 9.5;
}

// 1. try/catch: under strict the error is unknown, so you must narrow it.
// 2. .catch and allSettled: the lib types the reason as any, so nothing is checked.
function describe(e: unknown): string {
  if (e instanceof Error) return e.name + ": " + e.message;
  return "non-error: " + JSON.stringify(e);
}

// 3. return without await inside try: the rejection escapes the catch.
async function withoutAwait(): Promise<string> {
  try {
    return loadPrice("").then(String);
  } catch {
    return "fallback";
  }
}
async function withAwait(): Promise<string> {
  try {
    return await loadPrice("").then(String);
  } catch {
    return "fallback";
  }
}

async function main() {
  try {
    await loadPrice("");
  } catch (err) {
    const _u: Equal<typeof err, unknown> = true;
    console.log("try/catch ->", describe(err));
  }

  await loadPrice("").catch((reason) => {
    const _a: Equal<typeof reason, any> = true;
    // any: this typo compiles and only fails at run time.
    console.log("catch typo ->", String(reason.mesage));
  });

  const [r] = await Promise.allSettled([Promise.reject("plain string")]);
  if (r.status === "rejected") {
    const _a2: Equal<typeof r.reason, any> = true;
    console.log("allSettled ->", describe(r.reason));
  }

  console.log("with await ->", await withAwait());
  try {
    console.log(await withoutAwait());
  } catch (e) {
    console.log("without await -> escaped:", describe(e));
  }
}
main();`,
      },
    ],
  },
];

export default augments;
