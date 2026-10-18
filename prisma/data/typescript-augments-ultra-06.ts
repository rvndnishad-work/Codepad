/**
 * TYPESCRIPT ULTRA — batch 06: Narrowing II and escape hatches (void, undefined and never
 * return types, assertion functions, type assertions, the definite assignment assertion, JSON of unknown shape). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What is the difference between void, undefined and never as return types?`,
    difficulty: "medium",
    seoDescription: `void means ignore the result, undefined means you get exactly undefined, never means the function never returns. Rules, inference and callback quirks.`,
    description: `**Question presented to candidate:**
"When you write a function's return type, what is the difference between \`void\`, \`undefined\` and \`never\`? When would you pick each one, and why can a callback typed \`() => void\` return a number?"

**What a strong answer should cover:**
- \`void\` means "the caller should not use the result"; \`undefined\` means "the caller gets exactly the value \`undefined\`"; \`never\` means "this function never returns normally" (it always throws or loops forever)
- Assignability: \`never\` is assignable to everything, \`undefined\` is assignable to \`void\`, but \`void\` is not assignable to \`undefined\`, and nothing except \`never\` is assignable to \`never\`
- The \`void\` function-type rule: a callback type \`(x) => void\` accepts a function that returns a value (that is why \`arr.forEach(x => list.push(x))\` compiles), while a declaration annotated \`: void\` may not return a value
- Inference: no return gives \`void\`; a function declaration that only throws is still \`void\`, but a function expression or arrow that only throws is \`never\`; TypeScript 5.1 lets a \`: undefined\` function omit the \`return\`
- \`never\` in control flow: after calling an explicitly annotated \`never\` function, the code is unreachable, so variables are narrowed (the basis of \`fail()\` and exhaustiveness helpers)

**Code / implementation expected:** Yes — three small functions with each return type, plus a callback example showing the \`void\` substitutability rule.`,
    answer: `**Target Audience:** Developers who annotate return types and want to know exactly what \`void\`, \`undefined\` and \`never\` promise to the caller.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You send three people on errands.

- The first posts a letter. You never expect anything back; if they happen to bring you a receipt, you throw it away without looking. That is **\`void\`**.
- The second is told: "go to the locker and bring back whatever is in it — and I know it is empty." You *will* look at what they bring, and you are counting on it being exactly nothing. That is **\`undefined\`**.
- The third walks into a room and never comes out. Nothing you wrote after "wait for them to return" will ever happen. That is **\`never\`**.

All three look alike at run time — a JavaScript function without a \`return\` gives back \`undefined\` — so beginners often treat them as synonyms. They are three different *promises to the caller*, and the compiler uses each one differently.

## 2. The Three Return Types in One Table

| Return type | Promise to the caller | Typical function | Can the caller use the result? |
| :--- | :--- | :--- | :--- |
| \`void\` | "Ignore what I return" | \`logLine(msg)\`, event handlers, callbacks | No: \`void\` cannot be used in arithmetic or assigned to \`undefined\` |
| \`undefined\` | "I return the value \`undefined\`" | A function implementing an interface that demands \`undefined\` | Yes: it is a real value of type \`undefined\` |
| \`never\` | "I do not return at all" | \`fail(msg)\` that throws, an infinite event loop | There is no result; the code after the call is unreachable |

📌 **Interview term: \`void\` return type** — the return type that says the result is not meant to be used. A function annotated \`: void\` may only \`return;\` or return \`undefined\`.

📌 **Interview term: \`undefined\` return type** — the return type that says the function hands back the concrete value \`undefined\`, which callers may rely on, store and compare.

📌 **Interview term: \`never\` return type** — the return type of a function whose end point is unreachable: it always throws or runs forever. \`never\` is the *bottom type*, the type with no values. The type itself is covered in depth in [What is the never type?](/interview-question/what-is-the-never-type)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Assignability chain: never is assignable to undefined, undefined is assignable to void, and void is not assignable back to undefined">
  <defs>
    <marker id="vun-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="160" height="80" rx="10"/>
  <text class="d-text" x="100" y="104" text-anchor="middle">never</text>
  <text class="d-sub" x="100" y="128" text-anchor="middle">no values at all</text>
  <rect class="d-box" x="280" y="70" width="160" height="80" rx="10"/>
  <text class="d-text" x="360" y="104" text-anchor="middle">undefined</text>
  <text class="d-sub" x="360" y="128" text-anchor="middle">exactly one value</text>
  <rect class="d-box-accent" x="540" y="70" width="160" height="80" rx="10"/>
  <text class="d-text" x="620" y="104" text-anchor="middle">void</text>
  <text class="d-sub" x="620" y="128" text-anchor="middle">do not use me</text>
  <path class="d-edge" d="M 184 110 L 274 110" marker-end="url(#vun-arrow)"/>
  <text class="d-sub" x="229" y="50" text-anchor="middle">assignable to</text>
  <path class="d-edge" d="M 444 110 L 534 110" marker-end="url(#vun-arrow)"/>
  <text class="d-sub" x="489" y="50" text-anchor="middle">assignable to</text>
  <path class="d-edge-dashed" d="M 600 154 C 560 205, 420 205, 380 156" marker-end="url(#vun-arrow)"/>
  <text class="d-accent" x="490" y="218" text-anchor="middle">not assignable back</text>
</svg>

Arrows point in the direction values may flow: a \`never\` fits anywhere, \`undefined\` fits where \`void\` is expected, but a \`void\` result cannot be used where \`undefined\` is required (error TS2322 in example 1).

## 3. \`void\`: "Do Not Use the Result"

~~~ts
function logLine(msg: string): void {
  console.log("log: " + msg);
}
const r1 = logLine("saved");   // r1: void, and at run time it is undefined
~~~

Two rules make \`void\` special, and they point in opposite directions.

**Rule 1 — a function *declared* \`: void\` may not return a value.**

~~~text
error TS2322: Type 'number' is not assignable to type 'void'.
~~~

That is what \`return 42\` inside \`function badVoid(): void\` reports.

**Rule 2 — a function *type* returning \`void\` accepts functions that do return something.**

~~~ts
type Listener = (value: number) => void;
const results: number[] = [];
const listener: Listener = (v) => results.push(v * 10);   // push returns a number: allowed
~~~

This is deliberate. It is why \`["a", "b"].forEach((s) => seen.push(s))\` compiles even though \`push\` returns the new length and \`forEach\` wants a \`void\` callback. The callback's value is still there at run time (\`String(listener(3))\` printed \`3\`), but the type \`void\` stops the caller from using it: \`leaked + 1\` fails with

~~~text
error TS2365: Operator '+' cannot be applied to types 'void' and 'number'.
~~~

📌 **Interview term: substitutability of \`void\`-returning function types** — a function that returns a value may be used where a \`() => void\` function type is expected, because a caller that ignores the result cannot be hurt by getting one. The behaviour is shown by example 2 rather than quoted from a document.

## 4. \`undefined\`: A Real Value the Caller Can Rely On

Pick \`undefined\` when the caller is entitled to the value — for example an interface method that must return \`undefined\`, or a callback type that should *not* allow leaking values:

~~~ts
type StrictListener = (value: number) => undefined;
const strict: StrictListener = (v) => results.push(v);       // error
const ok: StrictListener = (v) => { results.push(v); };      // fine
~~~

~~~text
error TS2322: Type 'number' is not assignable to type 'undefined'.
~~~

And because \`void\` means "unknown, do not use", a \`void\` result is not assignable to \`undefined\`: \`const r3: undefined = logLine("again")\` reports \`Type 'void' is not assignable to type 'undefined'.\`

**TypeScript 5.1 change.** Before 5.1, a function annotated \`: undefined\` needed at least one \`return\` statement. Since 5.1, \`function resetCache(): undefined {}\` compiles, and an arrow with no return passed where \`() => undefined\` is expected is inferred as returning \`undefined\` ([Announcing TypeScript 5.1](https://devblogs.microsoft.com/typescript/announcing-typescript-5-1/), "Easier Implicit Returns for undefined-Returning Functions"). Example 1 relies on that and passes on 5.4.5.

## 5. \`never\`: The Function Does Not Come Back

~~~ts
function fail(message: string): never {
  throw new Error(message);
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    fail("PORT is missing");
  }
  const port: string = raw;   // raw is string: the undefined branch never continues
  return Number(port);
}
~~~

Because \`fail\` is annotated \`never\`, the compiler knows the end of the \`if\` block is unreachable, so after the \`if\` \`raw\` is narrowed to \`string\`. That is the same mechanism behind exhaustiveness helpers like \`assertNever\` — see [How do you do exhaustiveness checking?](/interview-question/how-do-you-do-exhaustiveness-checking)

📌 **Interview term: unreachable end point** — a function whose last statement can never be reached (every path throws or loops). Its inferred or annotated return type is \`never\`, and a call to it ends control-flow analysis for that path.

There is a catch for this narrowing: the call target must have an **explicit** type. When checked separately on 5.4.5, an arrow assigned to an unannotated \`const\` did not narrow:

~~~ts
const failArrow = (m: string): never => { throw new Error(m); };
function a(raw: string | undefined): string {
  if (raw === undefined) failArrow("x");
  return raw;   // error: still string | undefined
}
~~~

~~~text
main.ts(5,3): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
~~~

Writing \`const failTyped: (m: string) => never = ...\` or a plain \`function\` declaration fixes it. The same rule, with its own error message, applies to assertion functions: [What are assertion functions (asserts)?](/interview-question/what-are-assertion-functions-asserts)

## 6. What TypeScript Infers When You Write Nothing

| Function | Inferred return type (checked with \`Equal\` in the examples) |
| :--- | :--- |
| \`function noReturn() {}\` | \`void\` |
| \`function earlyReturn(flag: boolean) { if (flag) return; }\` | \`void\` |
| \`function maybe(flag: boolean) { if (flag) return 1; }\` | \`1 \\| undefined\` |
| \`function throwsDecl() { throw new Error("x"); }\` | \`void\` |
| \`const throwsArrow = () => { throw new Error("x"); };\` | \`never\` |

The last two rows surprise people. A function *declaration* that only throws is still inferred as \`void\`, while an arrow or function expression is inferred as \`never\`. So if you want a throwing helper to narrow, annotate \`: never\` explicitly — which you need anyway for the control-flow rule above.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(13,3): error TS2322: Type 'number' is not assignable to type 'void'.
main.ts(26,7): error TS2322: Type 'void' is not assignable to type 'undefined'.
main.ts(51,7): error TS2322: Type 'string' is not assignable to type 'never'.
~~~

and example 2:

~~~text
main.ts(16,13): error TS2365: Operator '+' cannot be applied to types 'void' and 'number'.
main.ts(27,39): error TS2322: Type 'number' is not assignable to type 'undefined'.
~~~

Example 1, the three return types, prints:

~~~text
log: saved
true
function
undefined
log: again
true
boom
true true
true string
~~~

\`true true\` confirms the inference of the throwing declaration (\`void\`) and the throwing arrow (\`never\`); \`true string\` confirms that \`never\` is assignable to \`string\` (checked as \`[never] extends [string]\`). The last word is \`string\` because the rejected \`const n2: never = "text"\` still runs as plain JavaScript — types are erased.

Example 2, callbacks and control flow, prints:

~~~text
[10,20]
3
number
a,b
function undefined 4
8080
PORT is missing
true true true
~~~

The \`3\` is the value a \`void\` callback leaked at run time: the type hides it, it does not remove it.

## 8. Edge Cases Worth Knowing

- **\`void\` in a union.** \`string | void\` is legal but rarely what you want; prefer \`string | undefined\` so callers can check the value.
- **Async functions.** The equivalents are \`Promise<void>\` and \`Promise<never>\`, with the same inference split: when checked separately on 5.4.5, an \`async function\` declaration that only throws was inferred as \`Promise<void>\` and an async arrow as \`Promise<never>\`. But even \`await failAsync("x")\` on a function annotated \`Promise<never>\` did **not** narrow the code after it — the next \`return raw\` still reported \`Type 'string | undefined' is not assignable to type 'string'.\` For narrowing, keep the throwing check synchronous. More in [How do you type async functions and Promises?](/interview-question/how-do-you-type-async-functions-and-promises)
- **\`never\` is not "returns nothing".** A function that returns nothing returns \`undefined\`; \`never\` is reserved for functions that do not finish.
- **\`void\` as a value type.** \`let x: void = undefined\` is allowed, but there is little reason to write it.

## Common Pitfalls

- **Annotating a throwing helper as \`void\`.** It compiles, but the compiler then cannot narrow after the call. Use \`: never\`.
- **Expecting \`() => void\` to forbid return values.** It does not; values are allowed and ignored. Use \`() => undefined\` if leaking a value must be an error.
- **Using a \`void\` result.** \`if (save())\` where \`save(): void\` is a design smell; return \`boolean\` instead.
- **Relying on narrowing from an unannotated arrow.** \`const fail = (m: string): never => { ... }\` without a type on the \`const\` does not narrow callers.
- **Thinking an inferred \`void\` means nothing came back.** A \`void\` callback can hand back any value at run time.
- **Confusing \`never\` with \`undefined\` in docs and interviews.** "Returns nothing" is \`void\` or \`undefined\`; "never returns" is \`never\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three promises:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> means "do not use my result", <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> means "I return the value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and you may rely on it", and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> means "I never return normally": I always throw or loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Assignability:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> fits everywhere, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> fits into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> result does not fit into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>: the compiler reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Type 'void' is not assignable to type 'undefined'</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The callback rule:</strong> <span style="color:#f0e2c8;">A function type returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> accepts functions that return a value, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach(x =&gt; list.push(x))</code> compiles; a declaration annotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: void</code> may not return a value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. never in control flow:</strong> <span style="color:#f0e2c8;">After calling an explicitly annotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> function the code is unreachable, so TypeScript narrows. I annotate throwing helpers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: never</code> because a throwing declaration is otherwise inferred as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> for side-effect functions and callbacks, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> when callers must get exactly that value (TypeScript 5.1 dropped the need for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> there), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fail</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertNever</code> helpers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">() =&gt; 42</code> where <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">() =&gt; void</code> is expected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because of <strong style="color:#ffca28;">substitutability</strong>: a caller that ignores the result is not harmed by getting one. The value still exists at run time; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> type just stops the caller from using it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does TypeScript infer for a function that only throws?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the syntax: a function declaration is inferred as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, an arrow or function expression as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code>. I annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">: never</code> explicitly so callers get the narrowing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const fail = (m: string): never =&gt; ...</code> not narrow after the call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Control-flow analysis only uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> and assertion signatures when every name in the call target has an explicit type. Annotate the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> with a function type, or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function</code> declaration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Promise&lt;void&gt;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Promise&lt;never&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;void&gt;</code> resolves with nothing useful; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;never&gt;</code> can never resolve, only reject. Unlike a sync <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">never</code> call, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>ing it does not make the following code unreachable on 5.4.5, so it does not narrow; keep throwing guards synchronous.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">undefined</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code> as a return type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the result is part of a contract the caller reads, such as an interface method or a strict callback type that must not leak values. Since TypeScript 5.1 such a function may omit the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> statement.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`void\` return type | The result exists but must not be used |
| \`undefined\` return type | The function returns the concrete value \`undefined\` |
| \`never\` return type | The function never returns normally; \`never\` is the bottom type |
| Substitutability of \`void\` function types | A value-returning function can be used where a \`() => void\` type is expected |
| Unreachable end point | Every path throws or loops, so the return type is \`never\` and control flow stops |

**Conclusion:** \`void\`, \`undefined\` and \`never\` all look like "nothing" at run time, but they say three different things to the caller: ignore my result, rely on getting \`undefined\`, or do not expect me back. \`void\` is the everyday choice for side effects and callbacks — and its function types deliberately accept value-returning functions. \`undefined\` is for contracts that need the actual value, which TypeScript 5.1 made easier to write. \`never\` marks functions that throw, and with an explicit annotation it lets the compiler narrow everything after the call.`,
    examples: [
      {
        label: `void, undefined and never as return types`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// void: "the caller should not use the result".
function logLine(msg: string): void {
  console.log("log: " + msg);
}
const r1 = logLine("saved");
console.log(r1 === undefined);

// A function declared ": void" may still not return a real value.
function badVoid(): void {
  // @ts-expect-error Type 'number' is not assignable to type 'void'.
  return 42;
}
console.log(typeof badVoid);

// undefined: the caller may rely on getting exactly undefined back.
// Since TypeScript 5.1 the body needs no return statement.
function resetCache(): undefined {}
const r2: undefined = resetCache();
console.log(r2);

// void is not assignable to undefined, so the result of a void call
// cannot be used where undefined is required.
// @ts-expect-error Type 'void' is not assignable to type 'undefined'.
const r3: undefined = logLine("again");
console.log(r3 === undefined);

// never: the function never finishes normally.
function fail(message: string): never {
  throw new Error(message);
}
try {
  fail("boom");
} catch (e) {
  console.log(e instanceof Error ? e.message : "?");
}

// Inference: a function declaration that only throws is inferred as void,
// a function expression or arrow that only throws is inferred as never.
function throwsDecl() { throw new Error("x"); }
const throwsArrow = () => { throw new Error("x"); };
const e1: Equal<ReturnType<typeof throwsDecl>, void> = true;
const e2: Equal<ReturnType<typeof throwsArrow>, never> = true;
console.log(e1, e2);

// never is assignable to every type; nothing is assignable to never.
type NeverToString = [never] extends [string] ? true : false;
const e3: NeverToString = true;
// @ts-expect-error Type 'string' is not assignable to type 'never'.
const n2: never = "text";
console.log(e3, typeof n2);`,
      },
      {
        label: `void callbacks, strict undefined callbacks and never in control flow`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A void FUNCTION TYPE accepts functions that return something.
type Listener = (value: number) => void;
const results: number[] = [];
// push returns a number, yet it fits a callback typed as returning void.
const listener: Listener = (v) => results.push(v * 10);
listener(1);
listener(2);
console.log(JSON.stringify(results));

// The value is still there at run time; the type just tells you to ignore it.
const leaked = listener(3);
console.log(String(leaked));
// @ts-expect-error Operator '+' cannot be applied to types 'void' and 'number'.
const sum = leaked + 1;
console.log(typeof sum);

// That is why forEach works with callbacks that return values.
const seen: string[] = [];
["a", "b"].forEach((s) => seen.push(s));
console.log(seen.join(","));

// 2. A callback typed as returning undefined is strict about it.
type StrictListener = (value: number) => undefined;
// @ts-expect-error Type 'number' is not assignable to type 'undefined'.
const strict: StrictListener = (v) => results.push(v);
const ok: StrictListener = (v) => { results.push(v); };
console.log(typeof strict, ok(4), results.length);

// 3. never in control flow: code after a never call is unreachable,
// so the compiler narrows the variable for the rest of the block.
function fail(message: string): never {
  throw new Error(message);
}
function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    fail("PORT is missing");
  }
  // raw is string here because fail() never returns.
  const port: string = raw;
  return Number(port);
}
console.log(parsePort("8080"));
try {
  parsePort(undefined);
} catch (e) {
  console.log((e as Error).message);
}

// 4. Inferred return types of common shapes.
function noReturn() {}
function earlyReturn(flag: boolean) { if (flag) return; }
function maybe(flag: boolean) { if (flag) return 1; }
const c1: Equal<ReturnType<typeof noReturn>, void> = true;
const c2: Equal<ReturnType<typeof earlyReturn>, void> = true;
const c3: Equal<ReturnType<typeof maybe>, 1 | undefined> = true;
console.log(c1, c2, c3);`,
      },
    ],
  },
  {
    title: `What are assertion functions (asserts)?`,
    difficulty: "medium",
    seoDescription: `Assertion functions use asserts x is T or asserts condition to narrow types after a call that throws on failure. Forms, rules, TS2775 and pitfalls.`,
    description: `**Question presented to candidate:**
"What is an assertion function in TypeScript — the \`asserts\` keyword in a return type? How is it different from a type guard that returns \`value is T\`, and what can go wrong with it?"

**What a strong answer should cover:**
- The two forms: \`asserts condition\` (like Node's \`assert\`) and \`asserts value is T\`; added in TypeScript 3.7
- Behaviour: if the function returns, the compiler narrows for the rest of the scope; if the check fails, the function throws
- The difference from a type guard (\`value is T\` returning a boolean, narrowing only inside the \`if\`)
- Rules: the function must return \`void\`, and every name in the call target needs an explicit type (TS2775), which trips up arrow functions and methods on inferred instances
- The compiler trusts the signature, not the body: a wrong or empty check is an unchecked lie, so keep assertion bodies small and tested
- Uses: validating inputs and config at boundaries, \`assertDefined\`, \`asserts this is T\` for class state, test helpers

**Code / implementation expected:** Yes — an \`assertIsString\` or \`assertDefined\` helper and a call site that is narrowed afterwards.`,
    answer: `**Target Audience:** Developers who know type guards and want to write validation helpers that narrow types without wrapping everything in \`if\` blocks.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

At an airport there are two ways to check a passport.

One officer looks at it and says "valid" or "not valid", and you decide what to do next. That is a **type guard**: it answers a yes/no question, and only the code inside your \`if (valid)\` block gets to treat the passenger as cleared.

The other is the gate itself: if your passport is bad, the gate does not open and you never reach the other side. Everyone *past* the gate is known to be cleared — nobody has to ask again. That is an **assertion function**. It either throws, or it returns and from then on the compiler knows the check passed.

## 2. The Two Forms

~~~ts
// Form 1: asserts condition
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Form 2: asserts value is Type
function assertIsString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(name + " must be a string, got " + typeof value);
  }
}
~~~

After \`assertIsString(input, "input")\` returns, \`input\` is \`string\` for the rest of the function. After \`assert(width !== undefined, "...")\`, whatever that condition proves holds afterwards: \`width\` loses \`undefined\`. Before the call, \`unknown\` really is unusable:

~~~text
error TS18046: 'input' is of type 'unknown'.
~~~

📌 **Interview term: assertion function** — a function whose return type is an *assertion signature*, \`asserts condition\` or \`asserts param is T\`. Returning normally tells the compiler the assertion holds; failing must be signalled by throwing. Assertion signatures arrived in TypeScript 3.7, modelled on Node's \`assert\` ([TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html)).

📌 **Interview term: assertion signature** — the \`asserts ...\` return-type annotation itself. It is a type-level claim; the compiler does not check that the body actually enforces it.

A generic version is the most reused helper in many codebases:

~~~ts
function assertDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) throw new Error(name + " is missing");
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="An assertion call either throws, so the caller stops, or returns, so the value is string for the rest of the scope">
  <defs>
    <marker id="asf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="95" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="126" text-anchor="middle">input: unknown</text>
  <text class="d-sub" x="105" y="148" text-anchor="middle">before the call</text>
  <rect class="d-box" x="260" y="95" width="190" height="70" rx="10"/>
  <text class="d-text" x="355" y="126" text-anchor="middle">assertIsString</text>
  <text class="d-sub" x="355" y="148" text-anchor="middle">checks at run time</text>
  <rect class="d-box-accent" x="520" y="20" width="180" height="70" rx="10"/>
  <text class="d-text" x="610" y="51" text-anchor="middle">input: string</text>
  <text class="d-sub" x="610" y="73" text-anchor="middle">rest of the scope</text>
  <rect class="d-box-muted" x="520" y="170" width="180" height="70" rx="10"/>
  <text class="d-text" x="610" y="201" text-anchor="middle">throws</text>
  <text class="d-sub" x="610" y="223" text-anchor="middle">caller stops here</text>
  <path class="d-edge" d="M 194 130 L 254 130" marker-end="url(#asf-arrow)"/>
  <path class="d-edge-accent" d="M 454 115 L 514 62" marker-end="url(#asf-arrow)"/>
  <text class="d-accent" x="470" y="70" text-anchor="middle">returns</text>
  <path class="d-edge-dashed" d="M 454 145 L 514 198" marker-end="url(#asf-arrow)"/>
  <text class="d-sub" x="468" y="205" text-anchor="middle">fails</text>
</svg>

There are only two outcomes, which is why the compiler can narrow without an \`if\`: if execution continues past the call, the check passed.

## 3. Assertion Function vs Type Guard

| | Type guard \`value is T\` | Assertion function \`asserts value is T\` |
| :--- | :--- | :--- |
| Returns | \`boolean\` | \`void\` (returning a value is error TS2322) |
| On failure | returns \`false\` | throws |
| Where it narrows | inside the \`if\` / ternary branch | everything after the call, in the same scope |
| Caller writes | \`if (isString(x)) { ... }\` | \`assertIsString(x); ...\` |
| Good for | branching on data that may legitimately vary | invariants: "if this is false, the program has a bug or bad input" |

Example 1 uses both in one function: \`isString(a)\` only narrows inside its \`if\`, while \`assertIsString(b, "b")\` narrows \`b\` until the function ends. Guards are covered in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards); since TypeScript 5.5 some guards are even inferred for you, see [How does TypeScript 5.5 infer type predicates for Array.filter automatically?](/interview-question/how-does-typescript-5-5-infer-type-predicates-for-array-filter-automatically)

📌 **Interview term: \`asserts this is T\`** — an assertion signature on a method that narrows the object it is called on. In example 1, after \`conn.assertOpen()\` the compiler treats \`conn.socket\` as \`string\`, not \`string | null\`.

## 4. The Rules That Trip People Up

### Every name in the call target needs an explicit type

~~~ts
const assertNumberLoose = (value: unknown): asserts value is number => { ... };
assertNumberLoose(x);   // error
~~~

~~~text
error TS2775: Assertions require every name in the call target to be declared with an explicit type annotation.
~~~

The arrow has an annotated *return* type, but the \`const\` itself has an inferred type, and control-flow analysis does not use inferred types for this. Fix it by typing the variable — \`const assertNumber: AssertNumber = (value) => {...}\` with \`type AssertNumber = (value: unknown) => asserts value is number\` — or by using a \`function\` declaration. The same applies to methods: when checked separately, \`const g = new Guard(); g.check(v)\` also reported TS2775, while \`const g2: Guard = new Guard()\` worked.

### It must return \`void\`

\`function assertPositive(n: number): asserts n { return n > 0; }\` fails with \`Type 'boolean' is not assignable to type 'void'.\` If you want a boolean, you want a type guard.

### The compiler trusts the signature, not the body

~~~ts
function assertIsUser(value: unknown): asserts value is { name: string } {}   // checks nothing
~~~

This compiles. \`shout({ nickname: "x" })\` then crashes inside with a \`TypeError\`, because \`value.name\` was \`undefined\` — the compiler had been told it was a string. An assertion function is as trustworthy as its body, so keep the body short, test it, and prefer generated validators (see [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape)) for big shapes.

## 5. Where Assertion Functions Shine

- **Boundaries:** validating a config object, environment variables or a request body once, then using it fully typed. Example 2's \`assertConfig\` accepts \`{ host: "db", port: 5432 }\` and rejects a string port and \`null\` with clear messages.
- **Invariants:** \`assertDefined(user, "user")\` after a lookup that "cannot" fail, replacing a silent \`user!\` (compare [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)).
- **Tests:** a test helper \`expectString(value)\` that throws a readable message and narrows for the following lines.
- **Class state:** \`asserts this is { socket: string }\` for objects that must be opened or initialised before use.

## 6. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(21,26): error TS18046: 'input' is of type 'unknown'.
~~~

and example 2:

~~~text
main.ts(13,3): error TS2775: Assertions require every name in the call target to be declared with an explicit type annotation.
main.ts(37,49): error TS2322: Type 'boolean' is not assignable to type 'void'.
~~~

Example 1, the two forms and \`asserts this\`, prints:

~~~text
Hello, ADA
TypeError: input must be a string, got number
12
Error: height is missing
guard narrowed a inside the if: 2
3
SOCK-1
~~~

Example 2, pitfalls and a config validator, prints:

~~~text
function
42
TypeError
function
2
ok db:5432
rejected port must be a number
rejected config must be an object
~~~

The third line, \`TypeError\`, is the empty \`assertIsUser\` letting bad data through: tsc was satisfied, the program was not.

## Common Pitfalls

- **Arrow functions without a typed variable.** TS2775; annotate the \`const\` with a function type or use \`function\`.
- **Calling a method on an inferred instance.** \`const g = new Guard()\` hits the same TS2775; write \`const g: Guard = ...\`.
- **Returning a boolean.** Assertion functions return \`void\`; for a boolean answer write a type guard.
- **Bodies that do not match the signature.** Nothing checks them; one missed field makes every caller unsafe.
- **Using an assertion where failure is normal.** Throwing for expected cases (a user typed a wrong value) forces \`try\`/\`catch\` everywhere; a guard or a result object is often kinder.
- **Reassigning after the assertion.** The narrowing lasts only until the next assignment: when checked separately, \`assertIsString(x); x = 5; x.length\` reported \`'x' is of type 'unknown'.\` again.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An assertion function has a return type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asserts condition</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asserts value is T</code>. If it returns, the compiler narrows; if the check fails, it throws. It arrived in TypeScript 3.7.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Versus a type guard:</strong> <span style="color:#f0e2c8;">A guard returns a boolean and narrows only inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>; an assertion returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> and narrows everything after the call, so validation code stays flat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">It must return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, and every name in the call target needs an explicit type, or I get TS2775. That bites arrow functions stored in an unannotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Trust:</strong> <span style="color:#f0e2c8;">The compiler trusts the signature, not the body, so an assertion is only as safe as its check. I keep them small and tested, or generate them from a schema.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Uses:</strong> <span style="color:#f0e2c8;">I use them at boundaries for config and inputs, for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertDefined</code> invariants instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code>, in test helpers, and with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asserts this is T</code> for objects that must be initialised first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">asserts x is T</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x is T</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x is T</code> is a <strong style="color:#ffca28;">type predicate</strong> on a function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean</code>, used in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asserts x is T</code> is an <strong style="color:#ffca28;">assertion signature</strong> on a function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> that throws on failure and narrows the rest of the scope.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my arrow-function assertion give TS2775?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Control-flow analysis only uses assertion signatures from call targets with explicit types. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const assertX = (v: unknown): asserts v is X =&gt; ...</code> has an inferred variable type; annotate the variable or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function</code> declaration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an assertion function be async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Checked on 5.4.5, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async function f(v: unknown): asserts v is string</code> is error TS1064 (the return type of an async function must be the global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise&lt;T&gt;</code> type). Fetch with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> first, then call a synchronous assertion on the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">asserts condition</code> without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">is</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It narrows using whatever the argument expression proves, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert(x !== null)</code> removing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>. It mirrors Node's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make sure an assertion function is not lying?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit-test both the passing and throwing paths, keep the body a direct translation of the type, or derive both the type and the check from one schema so they cannot drift.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Assertion function | A function with an \`asserts\` return type that narrows after it returns and throws on failure |
| Assertion signature | The \`asserts condition\` / \`asserts x is T\` return annotation, trusted without checking the body |
| \`asserts this is T\` | An assertion signature that narrows the object a method is called on |

**Conclusion:** Assertion functions turn a runtime check into compile-time knowledge: once \`assertIsString(x)\` returns, \`x\` is a \`string\` for the rest of the scope, with no \`if\` block and no cast. They differ from type guards by throwing instead of returning \`false\`, they must return \`void\`, and they only narrow when the call target has an explicit type. Because the compiler trusts the signature blindly, the body is the whole safety story — keep it small, tested, or generated — and they become the cleanest way to validate data at the edges of a program.`,
    examples: [
      {
        label: `The two assertion forms, assertDefined and asserts this`,
        code: `// Form 1: asserts condition (like Node's assert).
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Form 2: asserts value is Type.
function assertIsString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(name + " must be a string, got " + typeof value);
  }
}

// Generic helper: remove null and undefined.
function assertDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) throw new Error(name + " is missing");
}

function greet(input: unknown): string {
  // Before the assertion, unknown cannot be used (never called here).
  // @ts-expect-error 'input' is of type 'unknown'.
  const tooEarly = () => input.toUpperCase();
  assertIsString(input, "input");
  // From here on input is string: no if-block, no extra variable.
  return "Hello, " + input.toUpperCase();
}
console.log(greet("ada"));
try {
  greet(42);
} catch (e) {
  console.log(String(e));
}

function area(width: number | undefined, height: number | null): number {
  assert(width !== undefined, "width is required");
  assertDefined(height, "height");
  // Both are plain numbers now.
  return width * height;
}
console.log(area(3, 4));
try {
  area(3, null);
} catch (e) {
  console.log(String(e));
}

// The narrowing lasts for the rest of the scope, unlike a type guard,
// which only narrows inside the if-block.
function isString(value: unknown): value is string {
  return typeof value === "string";
}
function compare(a: unknown, b: unknown): number {
  if (isString(a)) {
    console.log("guard narrowed a inside the if:", a.length);
  }
  assertIsString(b, "b");
  return b.length;
}
console.log(compare("xy", "xyz"));

// asserts this is: narrow the object a method is called on.
class Connection {
  socket: string | null = null;
  open(): void { this.socket = "sock-1"; }
  assertOpen(): asserts this is { socket: string } {
    if (this.socket === null) throw new Error("connection is closed");
  }
}
const conn: Connection = new Connection();
conn.open();
conn.assertOpen();
console.log(conn.socket.toUpperCase());`,
      },
      {
        label: `Pitfalls: TS2775, unchecked bodies and a config validator`,
        code: `// Pitfalls of assertion functions, each checked by tsc.

// 1. Arrow functions need an explicit type on the variable.
type AssertNumber = (value: unknown) => asserts value is number;
const assertNumber: AssertNumber = (value) => {
  if (typeof value !== "number") throw new TypeError("not a number");
};
const assertNumberLoose = (value: unknown): asserts value is number => {
  if (typeof value !== "number") throw new TypeError("not a number");
};
function looseCall(x: unknown): void {
  // @ts-expect-error Assertions require every name in the call target to be declared with an explicit type annotation.
  assertNumberLoose(x);
}
console.log(typeof looseCall);
function double(x: unknown): number {
  assertNumber(x);
  return x * 2;
}
console.log(double(21));

// 2. The compiler trusts the signature, not the body.
// This "assertion" never checks anything, and tsc accepts it.
function assertIsUser(value: unknown): asserts value is { name: string } {}
function shout(value: unknown): string {
  assertIsUser(value);
  return value.name.toUpperCase();
}
try {
  shout({ nickname: "x" });
} catch (e) {
  console.log((e as Error).name);
}

// 3. An assertion function must return void.
// @ts-expect-error Type 'boolean' is not assignable to type 'void'.
function assertPositive(n: number): asserts n { return n > 0; }
console.log(typeof assertPositive);

// 4. On a union, the assertion keeps only the matching member.
function assertIsArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new TypeError("not an array");
}
function lengthOf(value: string | unknown[]): number {
  assertIsArray(value);
  return value.length;
}
console.log(lengthOf(["a", "b"]));

// 5. Validating a config object field by field.
type Config = { host: string; port: number };
function assertConfig(raw: unknown): asserts raw is Config {
  if (typeof raw !== "object" || raw === null) throw new TypeError("config must be an object");
  const r = raw as Record<string, unknown>;
  if (typeof r.host !== "string") throw new TypeError("host must be a string");
  if (typeof r.port !== "number") throw new TypeError("port must be a number");
}
const inputs: unknown[] = [{ host: "db", port: 5432 }, { host: "db", port: "5432" }, null];
for (const raw of inputs) {
  try {
    assertConfig(raw);
    console.log("ok", raw.host + ":" + raw.port);
  } catch (e) {
    console.log("rejected", (e as Error).message);
  }
}`,
      },
    ],
  },
  {
    title: `What are type assertions and when should you use them?`,
    difficulty: "medium",
    seoDescription: `A type assertion (x as T) changes what the compiler believes, never the value. The overlap rule, double assertions, and safer tools like satisfies.`,
    description: `**Question presented to candidate:**
"What is a type assertion — \`value as SomeType\` — in TypeScript? What does it actually do at run time, when is it legitimate to use one, and what would you reach for instead?"

**What a strong answer should cover:**
- An assertion tells the compiler to treat an expression as a type; it is erased, so there is no run-time check or conversion (\`"8080" as unknown as number\` is still a string)
- Syntax: \`x as T\` and \`<T>x\` (the angle-bracket form is not allowed in \`.tsx\` files)
- The overlap rule: TypeScript rejects assertions between unrelated types (TS2352) and the double assertion \`as unknown as T\` bypasses it
- Assertion vs annotation: \`{ id: 1 } as User\` compiles with a missing property, \`const u: User = { id: 1 }\` does not
- Legitimate uses: DOM lookups, \`Object.keys(obj) as (keyof T)[]\`, data you have already validated, narrowing a library type you know more about
- Safer alternatives: narrowing and type guards, \`satisfies\`, annotations, \`instanceof\` in \`catch\`, validation of untrusted data; related operators \`!\` and \`as const\`

**Code / implementation expected:** Optional — an example showing an assertion that compiles but is wrong at run time, and a safer rewrite.`,
    answer: `**Target Audience:** Developers who see \`as\` in code reviews and want a precise rule for when it is fine and when it hides a bug.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A removal company labels every box. Normally the packers look inside and write what they see. Now and then you grab the marker yourself and write "BOOKS" on a box — because you packed it and you know.

The movers will believe your label. They will stack it under the heavy boxes and carry it with two hands. If it actually holds glasses, nobody checks: the label changed how everyone *treats* the box, not what is *in* it.

A type assertion is you writing the label. TypeScript stops inferring and takes your word for it. That is useful when you really know more than the compiler — and dangerous when you are guessing.

## 2. What an Assertion Is

~~~ts
type User = { id: number; name: string };
const raw: unknown = JSON.parse('{"id":"7","nickname":"ada"}');
const user = raw as User;
console.log(typeof user.id, String(user.name));   // string undefined
~~~

The compiler now believes \`user.id\` is a \`number\` and \`user.name\` a \`string\`. At run time neither is true. Nothing was checked, nothing was converted.

📌 **Interview term: type assertion** — the \`expr as T\` (or \`<T>expr\`) syntax that tells the compiler to treat an expression as type \`T\`. It is removed during compilation: the emitted JavaScript for \`(x: unknown) => (x as string).length\` is \`(x) => x.length\`, as example 1 prints.

📌 **Interview term: angle-bracket assertion** — the older \`<T>expr\` form, identical in meaning. It cannot be used in \`.tsx\` files because it looks like JSX: in a \`.tsx\` file \`<number>v\` reported \`error TS17008: JSX element 'number' has no corresponding closing tag.\` Use \`as\` everywhere for consistency.

An assertion is **not** a cast in the C or Java sense: it does not convert a value. To turn \`"8080"\` into a number, call \`Number("8080")\` (example 1 prints \`8081\` for \`Number(port) + 1\`).

## 3. The Overlap Rule and the Double Assertion

TypeScript does not let you assert just anything. The source and target must be *comparable* — one must roughly fit into the other:

~~~ts
const port = "8080";
const bad = port as number;                 // error
const forced = port as unknown as number;   // compiles
~~~

~~~text
error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
~~~

📌 **Interview term: double assertion** — \`x as unknown as T\` (or \`as any as T\`). Every type is assignable to \`unknown\`, and \`unknown\` may be asserted to anything, so the pair always compiles. It is the strongest "trust me" in the language: a sign to stop and look for a safer design.

What *does* pass the overlap rule:

| Assertion | Compiles? | Why |
| :--- | :--- | :--- |
| \`rex as Animal\` (subtype to supertype) | yes | \`Dog\` fits into \`Animal\` |
| \`asAnimal as Dog\` (supertype to subtype) | yes | \`Dog\` fits into \`Animal\`, so they overlap; a cat asserted to \`Dog\` has \`bark\` \`undefined\` at run time |
| \`{ path: "/admin" } as Route\` (missing property) | yes | the literal is comparable to \`Route\` |
| \`{ path: "/admin", auht: true } as Route\` (typo) | no, TS2352 | neither side fits the other |
| \`"8080" as number\` | no, TS2352 | no overlap |
| \`"8080" as unknown as number\` | yes | goes through \`unknown\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="A value of type unknown can be checked at run time by a type guard or simply relabelled by an assertion, and only the guard looks at the value">
  <defs>
    <marker id="ta-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="106" text-anchor="middle">raw: unknown</text>
  <text class="d-sub" x="105" y="128" text-anchor="middle">from JSON or an API</text>
  <rect class="d-box-accent" x="500" y="10" width="200" height="70" rx="10"/>
  <text class="d-text" x="600" y="41" text-anchor="middle">narrowing or guard</text>
  <text class="d-sub" x="600" y="63" text-anchor="middle">looks at the value</text>
  <rect class="d-box" x="500" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="600" y="171" text-anchor="middle">raw as User</text>
  <text class="d-sub" x="600" y="193" text-anchor="middle">changes the label only</text>
  <path class="d-edge-accent" d="M 194 100 L 494 45" marker-end="url(#ta-arrow)"/>
  <text class="d-accent" x="330" y="52" text-anchor="middle">checked at run time</text>
  <path class="d-edge-dashed" d="M 194 120 L 494 175" marker-end="url(#ta-arrow)"/>
  <text class="d-sub" x="330" y="180" text-anchor="middle">erased by the compiler</text>
</svg>

Both paths end with the type \`User\`, but only the top one has any evidence that the value really is one.

## 4. Assertion vs Annotation

~~~ts
const annotated: User = { id: 1 };       // error
const asserted = { id: 1 } as User;      // compiles, name is undefined
~~~

~~~text
error TS2741: Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
~~~

An **annotation** (\`: User\`) asks the compiler to *check* the value against the type. An **assertion** asks it to *believe* the type. Prefer the annotation whenever you are creating the value yourself. When you want the check *and* the inferred type, use \`satisfies\`: in example 2, \`{ gap: 8, color: "teal" } satisfies Theme\` keeps \`gap: number\`, while \`as Theme\` widens it to \`string | number\`, and \`{ path: "/admin" } satisfies Route\` reports \`error TS1360: Type '{ path: string; }' does not satisfy the expected type 'Route'.\` where \`as Route\` said nothing. Full details in [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do)

## 5. When an Assertion Is the Right Tool

1. **DOM lookups.** \`document.getElementById("chart") as HTMLCanvasElement\` — the compiler only knows \`HTMLElement | null\`; you know the markup. (Example 2 type-checks this but cannot call it: the page runs in a worker with no DOM.) Even here, a check like \`if (!(el instanceof HTMLCanvasElement)) throw ...\` is safer when the markup is not yours.
2. **Library types that are deliberately wide.** \`Object.keys(prices)\` returns \`string[]\` because an object may have extra keys at run time; \`Object.keys(prices) as (keyof typeof prices)[]\` is fine for an object literal you own.
3. **After real validation.** Inside a validator that has checked every field, a final \`return out as T\` is reasonable (the schema example in [How do you safely work with JSON of unknown shape?](/interview-question/how-do-you-safely-work-with-json-of-unknown-shape) does this).
4. **Test fixtures.** \`{ id: 1 } as User\` in a test that only needs one field — knowing it is a lie.

What they have in common: **you have evidence the compiler cannot see**. If you are asserting because "the compiler is complaining", that is the wrong reason.

## 6. The Family of Escape Hatches

| Syntax | What it claims | Checked at run time? | Doc |
| :--- | :--- | :--- | :--- |
| \`x as T\` | "x is a T" | no | this page |
| \`x!\` (non-null assertion) | "x is not null or undefined" | no | [What is the definite assignment assertion (!)?](/interview-question/what-is-the-definite-assignment-assertion) |
| \`let x!: T\` / \`field!: T\` | "this is assigned before use" | no | same |
| \`x as const\` | "infer the narrowest literal type" | nothing to check: it cannot lie | [What does as const do?](/interview-question/what-does-as-const-do) |
| \`asserts x is T\` | "this function throws unless x is a T" | yes, by the function body | [What are assertion functions (asserts)?](/interview-question/what-are-assertion-functions-asserts) |
| \`x satisfies T\` | "check x against T, keep its type" | not needed: it is a real check | [What does the satisfies operator do?](/interview-question/what-does-the-satisfies-operator-do) |

The non-null assertion in example 2 shows the same risk: \`lookup.get("zzz")!\` has the type \`number\` and the value \`undefined\`.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(11,7): error TS2741: Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
main.ts(19,13): error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
~~~

and example 2:

~~~text
main.ts(32,13): error TS2352: Conversion of type '{ path: string; auht: boolean; }' to type 'Route' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'auth' is missing in type '{ path: string; auht: boolean; }' but required in type 'Route'.
main.ts(34,31): error TS1360: Type '{ path: string; }' does not satisfy the expected type 'Route'.
  Property 'auth' is missing in type '{ path: string; }' but required in type 'Route'.
~~~

Example 1, what an assertion does and does not do, prints:

~~~text
string undefined
{"id":1} {"id":1} undefined
string string false
8081
woof
undefined
43
(x) => x.length
~~~

\`string string false\` is the double assertion at work: \`forced\` is typed \`number\`, holds the string \`"8080"\`, and is not equal to \`8080\`. The last line is the emitted JavaScript — the \`as string\` is gone.

Example 2, legitimate uses and better tools, prints:

~~~text
apple,pear 8
function
true true 16
undefined
object object
OK 2.0
non-error thrown: plain string
too big
["ada"]
true 1 undefined
~~~

## Common Pitfalls

- **Asserting untrusted data.** \`await res.json() as User\` is a guess about someone else's server. Validate it instead.
- **Reaching for \`as unknown as T\` to silence an error.** The error was usually right; the double assertion only hides it.
- **Using \`as\` where an annotation would check.** \`{...} as Config\` skips missing-property errors that \`: Config\` or \`satisfies Config\` would report.
- **\`catch (e) { (e as Error).message }\`.** Anything can be thrown; \`e instanceof Error ? e.message : String(e)\` handles a thrown string, as example 2 shows.
- **Expecting a conversion.** \`value as number\` never parses a string; use \`Number\`, \`parseInt\` or a validator.
- **Empty arrays.** \`[] as string[]\` works, but \`const names: string[] = []\` says the same thing with a check.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A type assertion, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x as T</code>, tells the compiler to treat an expression as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>. It is erased at compile time, so there is no run-time check or conversion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Guard rail:</strong> <span style="color:#f0e2c8;">TypeScript only allows it when the types overlap, otherwise it reports TS2352, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as unknown as T</code> is the escape hatch that always compiles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Versus annotation:</strong> <span style="color:#f0e2c8;">An annotation checks a value against a type; an assertion asks the compiler to believe it, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ id: 1 } as User</code> compiles with a missing field.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When I use it:</strong> <span style="color:#f0e2c8;">Only with evidence the compiler cannot see: a DOM element I control, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> on my own object, data I have already validated, or test fixtures.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Instead:</strong> <span style="color:#f0e2c8;">Usually I narrow with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> or an annotation for literals, and validate untrusted data with a guard or schema.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a type assertion the same as a cast in Java or C#?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A Java cast is checked at run time and can throw; a TypeScript assertion is removed from the output and never checks or converts anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"8080" as number</code> fail but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"8080" as unknown as number</code> compile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Assertions require the types to be <strong style="color:#ffca28;">comparable</strong>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> are not. Every type is assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> can be asserted to any type, so the double assertion skips the check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">satisfies</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> checks a value I am writing and keeps its precise type; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> is for overriding a type the compiler already inferred, such as a DOM element or a widened library return type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;T&gt;x</code> in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.tsx</code> file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The parser reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;T&gt;</code> as the start of a JSX element, so it reports a JSX error. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> form means the same and works everywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x!</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x as T</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x!</code> is a specialised assertion that only removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> from the type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x as T</code> can claim any comparable type. Both are unchecked.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type assertion | \`x as T\`: treat an expression as \`T\`, erased at compile time |
| Angle-bracket assertion | \`<T>x\`, the same operation, not allowed in \`.tsx\` |
| Double assertion | \`x as unknown as T\`, always compiles, bypasses the overlap check |

**Conclusion:** A type assertion is a label, not an inspection: \`x as T\` changes what the compiler believes and nothing about the value, and the emitted JavaScript keeps no trace of it. TypeScript adds one guard rail — the types must overlap — and \`as unknown as T\` removes even that. Use assertions only where you hold evidence the compiler lacks, such as your own DOM or already-validated data; everywhere else, annotations, \`satisfies\`, narrowing and run-time validation give you the same types with an actual check behind them.`,
    examples: [
      {
        label: `What an assertion does and does not do`,
        code: `type User = { id: number; name: string };

// 1. An assertion changes the type the compiler sees, nothing else.
const raw: unknown = JSON.parse('{"id":"7","nickname":"ada"}');
const user = raw as User;
// The compiler now believes user.name is a string. It is not.
console.log(typeof user.id, String(user.name));

// 2. Assertion vs annotation on an object literal.
// @ts-expect-error Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
const annotated: User = { id: 1 };
// The assertion compiles: it only needs the types to overlap.
const asserted = { id: 1 } as User;
console.log(JSON.stringify(annotated), JSON.stringify(asserted), String(asserted.name));

// 3. Unrelated types are rejected...
const port = "8080";
// @ts-expect-error Conversion of type 'string' to type 'number' may be a mistake.
const bad = port as number;
// ...unless you go through unknown (a double assertion), which always compiles.
const forced = port as unknown as number;
console.log(typeof bad, typeof forced, forced === 8080);
// To convert, call a function that converts.
console.log(Number(port) + 1);

// 4. Widening to a supertype and narrowing to a subtype both compile.
type Animal = { name: string };
type Dog = Animal & { bark(): string };
const rex: Dog = { name: "Rex", bark: () => "woof" };
const asAnimal = rex as Animal;
const backToDog = asAnimal as Dog;
console.log(backToDog.bark());
const cat: Animal = { name: "Tom" };
const fakeDog = cat as Dog;
console.log(typeof fakeDog.bark);

// 5. The angle-bracket form is the same operation (not allowed in .tsx files).
const n = <number>(42 as unknown);
console.log(n + 1);

// 6. An assertion is erased: the emitted JavaScript has no trace of it.
console.log(String(((x: unknown) => (x as string).length)));`,
      },
      {
        label: `Legitimate uses and better alternatives`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Legitimate use 1: you know more than the compiler about a library type.
// Object.keys returns string[] on purpose (objects can have extra keys).
const prices = { apple: 3, pear: 5 };
const keys = Object.keys(prices) as (keyof typeof prices)[];
let total = 0;
for (const k of keys) total += prices[k];
console.log(keys.join(","), total);

// Legitimate use 2: a DOM lookup whose element type only you know.
// (Type-checked only: there is no DOM in the page worker, so it is never called.)
function getCanvas(): HTMLCanvasElement {
  return document.getElementById("chart") as HTMLCanvasElement;
}
console.log(typeof getCanvas);

// Better tool 1: satisfies checks the value and keeps the inferred type.
type Theme = Record<string, string | number>;
const themeA = { gap: 8, color: "teal" } as Theme;
const themeB = { gap: 8, color: "teal" } satisfies Theme;
const t1: Equal<typeof themeA.gap, string | number> = true;
const t2: Equal<typeof themeB.gap, number> = true;
console.log(t1, t2, themeB.gap * 2);

// as accepts a literal with a missing property; satisfies reports it.
type Route = { path: string; auth: boolean };
const r1 = { path: "/admin" } as Route;
console.log(String(r1.auth));
// A clash that shares no overlap is still caught by as (error TS2352).
// @ts-expect-error Conversion of type '{ path: string; auht: boolean; }' to type 'Route' may be a mistake.
const r1b = { path: "/admin", auht: true } as Route;
// @ts-expect-error Type '{ path: string; }' does not satisfy the expected type 'Route'.
const r2 = { path: "/admin" } satisfies Route;
console.log(typeof r1b, typeof r2);

// Better tool 2: a check that narrows at run time.
function labelOf(value: string | number): string {
  return typeof value === "string" ? value.toUpperCase() : value.toFixed(1);
}
console.log(labelOf("ok"), labelOf(2));

// Better tool 3: instanceof in a catch block instead of e as Error.
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : "non-error thrown: " + String(e);
}
try { throw "plain string"; } catch (e) { console.log(messageOf(e)); }
try { throw new RangeError("too big"); } catch (e) { console.log(messageOf(e)); }

// Better tool 4: annotate an empty array instead of asserting it.
const names: string[] = [];
names.push("ada");
console.log(JSON.stringify(names));

// The non-null assertion is also an assertion: it removes null and undefined.
const lookup = new Map([["a", 1]]);
const a = lookup.get("a")!;
const t3: Equal<typeof a, number> = true;
const missing = lookup.get("zzz")!;
console.log(t3, a, String(missing));`,
      },
    ],
  },
  {
    title: `What is the definite assignment assertion (!)?`,
    difficulty: "medium",
    seoDescription: `The definite assignment assertion (name!: string) silences TS2564 and TS2454. Why it exists, why it is unchecked, how it emits, and safer alternatives.`,
    description: `**Question presented to candidate:**
"What does the \`!\` mean in \`name!: string\` on a class field, or in \`let total!: number\`? Why does TypeScript make you write it, and what are the risks compared with initialising the value properly?"

**What a strong answer should cover:**
- The definite assignment assertion: \`!\` after a property or variable name says "this is assigned before use", silencing TS2564 (property has no initializer) and TS2454 (used before being assigned)
- Why the error exists: \`strictPropertyInitialization\` (part of \`--strict\`) only follows the constructor body, not helper methods, frameworks or callbacks; both features arrived in TypeScript 2.7
- It is unchecked: if the value is never assigned, the program reads \`undefined\` with a type that says \`string\`
- The difference from the non-null assertion operator (\`expr!\`), which applies to an expression rather than a declaration
- Emit detail: with ES2022+ class fields, \`field!: T\` is still emitted as a field, which can overwrite a value set by a base-class constructor; \`declare field: T\` emits nothing
- Alternatives: initialisers, constructor parameter properties, honest optional types (\`field?: T\`), or restructuring so the compiler can see the assignment

**Code / implementation expected:** Optional — a class with a field initialised in a helper method, and the safer alternatives.`,
    answer: `**Target Audience:** Developers who meet \`field!: Type\` in Angular, ORM or class-heavy code and want to know what it promises and what it costs.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A hotel receptionist will not hand you a room key until the bill is settled. One evening a regular guest says: "My company pays — the invoice arrives tomorrow." The receptionist cannot see the invoice, but marks the bill as "settled — guest guarantees it" and hands over the key.

That mark is the definite assignment assertion. TypeScript is the receptionist: it refuses to let you read a field it has not seen assigned. The \`!\` is you guaranteeing that someone else — a helper method, a framework, a callback — will fill it in. If the invoice never comes, the hotel finds out much later, and so do you: at run time, with an \`undefined\` that the type said could not exist.

## 2. The Error It Silences

Under \`--strict\`, \`strictPropertyInitialization\` checks that every class field is assigned by an initializer or in the constructor body:

~~~ts
class Plain {
  name: string;   // error
}
~~~

~~~text
error TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.
~~~

The analysis is deliberately simple: it does **not** follow calls. In example 1, \`Widget\` assigns \`label\` in a private \`init()\` method called from the constructor — perfectly safe, but invisible to the check. Writing \`label!: string\` tells the compiler to stop worrying, and \`new Widget(7).label\` prints \`widget-7\`.

For local variables, the matching error comes from definite-assignment analysis, which also cannot see into callbacks:

~~~ts
let total: number;
[1, 2, 3].forEach((n) => { total = n; });
console.log(total);   // error
~~~

~~~text
error TS2454: Variable 'total' is used before being assigned.
~~~

📌 **Interview term: definite assignment assertion** — a \`!\` placed after the *name* in a property or variable declaration (\`label!: string\`, \`let first!: number\`), telling the compiler the value will be assigned before it is read. Both this assertion and the \`--strictPropertyInitialization\` flag arrived in TypeScript 2.7 ([Announcing TypeScript 2.7](https://devblogs.microsoft.com/typescript/announcing-typescript-2-7/)).

📌 **Interview term: strictPropertyInitialization** — the compiler option, included in \`--strict\`, that reports TS2564 for class fields not assigned by an initializer or the constructor body. See [What does the strict flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable)

## 3. It Is a Promise Nobody Checks

~~~ts
class Lazy {
  value!: string;
  load(): void { this.value = "loaded"; }
}
const lazy = new Lazy();
lazy.value.toUpperCase();   // compiles; throws a TypeError at run time
~~~

Example 1 prints \`undefined\` for \`lazy.value\` and then \`TypeError\` for the call. The type said \`string\` the whole time. This is the core trade-off: \`!\` moves the guarantee from the compiler to you.

## 4. The Other \`!\`: Non-Null Assertion

The same character has a second meaning when it follows an *expression*:

| | Definite assignment assertion | Non-null assertion operator |
| :--- | :--- | :--- |
| Position | after a declared name: \`x!: T\`, \`let x!: T\` | after an expression: \`map.get(k)!\`, \`el!.focus()\` |
| Claims | "assigned before it is read" | "this value is not \`null\` or \`undefined\`" |
| Effect on the type | none; silences TS2564 / TS2454 | removes \`null\` and \`undefined\` from the expression type |
| Checked at run time | no | no |

Both are unchecked escape hatches; the non-null form is compared with other assertions in [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them) and with \`?.\` and \`??\` in [How does TypeScript handle null and undefined safely?](/interview-question/how-does-typescript-handle-null-and-undefined-safely)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="The exclamation mark after a declared name is a definite assignment assertion, after an expression it is a non-null assertion">
  <rect class="d-box-accent" x="20" y="20" width="320" height="80" rx="10"/>
  <text class="d-text" x="180" y="54" text-anchor="middle">label!: string</text>
  <text class="d-sub" x="180" y="78" text-anchor="middle">after a declared name</text>
  <rect class="d-box" x="380" y="20" width="320" height="80" rx="10"/>
  <text class="d-text" x="540" y="54" text-anchor="middle">scores.get(key)!</text>
  <text class="d-sub" x="540" y="78" text-anchor="middle">after an expression</text>
  <rect class="d-box-muted" x="20" y="130" width="320" height="64" rx="10"/>
  <text class="d-text" x="180" y="168" text-anchor="middle">assigned before use</text>
  <rect class="d-box-muted" x="380" y="130" width="320" height="64" rx="10"/>
  <text class="d-text" x="540" y="168" text-anchor="middle">not null or undefined</text>
</svg>

Same character, two jobs: the position decides which claim you are making, and neither claim is checked when the program runs.

## 5. A Run-Time Trap: Class Field Emit

With target ES2022 or later, TypeScript emits real JavaScript class fields by default (the \`useDefineForClassFields\` option; see the [TSConfig reference](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields)). A field declared with \`!\` is **still emitted**. Transpiling the same class with TypeScript 5.4.5:

~~~text
class WithBang extends Base {
    tag;
    setup() { this.tag = "x"; }
}

---- ES2021
class WithBang extends Base {
    setup() { this.tag = "x"; }
}
~~~

That \`tag;\` line defines the field as \`undefined\` right after \`super()\` returns. So if the base-class constructor calls an overridden \`setup()\` that assigns \`this.tag\`, the subclass field definition then **overwrites it**. Example 2 prints \`undefined\` for \`new WithBang().tag\`. Writing \`declare tag: string;\` instead emits nothing, and the value survives (\`set in setup\`).

📌 **Interview term: \`declare\` field** — a class property declared with \`declare\`, which exists only in the type system and produces no JavaScript. It cannot have an initializer (\`error TS1039: Initializers are not allowed in ambient contexts.\`). More on the keyword in [What does the declare keyword do?](/interview-question/what-does-the-declare-keyword-do)

The compiler also enforces two shape rules on \`!\` (example 2):

~~~text
error TS1263: Declarations with initializers cannot also have definite assignment assertions.
error TS1264: Declarations with definite assignment assertions must also have type annotations.
~~~

## 6. Safer Alternatives

Reach for these first, in roughly this order:

1. **An initializer:** \`hits = 0\`. No \`!\`, and the type is inferred.
2. **A constructor parameter property:** \`constructor(public readonly name: string) {}\` assigns in the constructor, which the check understands.
3. **Assign in the constructor body** instead of a helper, or have the helper *return* the value: \`this.label = this.buildLabel()\`.
4. **An honest optional type:** \`lastSeen?: string\`, forcing callers to handle \`undefined\` (\`c.lastSeen ?? "never"\` prints \`never\`).
5. **Use \`!\` only** when something outside the compiler's view really guarantees the assignment — a framework that injects it (Angular \`@ViewChild\`, ORM entities hydrated by the library), a test \`beforeEach\`, or an \`init()\` that every code path calls first.

## 7. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(4,3): error TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.
main.ts(45,13): error TS2454: Variable 'total' is used before being assigned.
~~~

and example 2:

~~~text
main.ts(38,23): error TS1039: Initializers are not allowed in ambient contexts.
main.ts(45,4): error TS1263: Declarations with initializers cannot also have definite assignment assertions.
main.ts(51,6): error TS1264: Declarations with definite assignment assertions must also have type annotations.
~~~

Example 1, fields, locals and alternatives, prints:

~~~text
function
widget-7
undefined
TypeError
10
3
11
home 0 never
~~~

Example 2, \`!\` versus \`declare\` under ES2022 field emit, prints:

~~~text
undefined
set in setup
true tag
function
function
3
~~~

\`true tag\` shows the \`!\` field really exists on the instance (as an own key with the value \`undefined\`). The page compiles with target ES2022, so this is the behaviour readers see; with \`useDefineForClassFields: false\` or an older target, the field line is not emitted and the base-class assignment survives (checked separately by transpiling example 2 with that option: both classes then printed \`set in setup\`).

## Common Pitfalls

- **Using \`!\` to make the error go away.** If you cannot name what assigns the field, you have a bug waiting, not a missing annotation.
- **Fields set by a base-class constructor.** Under ES2022 field emit, \`field!: T\` in the subclass resets them to \`undefined\`; use \`declare field: T\`.
- **Lazy loading.** A field filled by \`load()\` is \`undefined\` until someone calls it; model that with \`?:\` or a state union, not \`!\`.
- **Confusing it with \`expr!\`.** \`name!: string\` is about assignment; \`user!.name\` is about null. Both are unchecked.
- **Turning the whole flag off.** Disabling \`strictPropertyInitialization\` to avoid a few \`!\` hides every future missing initialiser too.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name!: string</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let x!: number</code> is a <strong style="color:#ffca28;">definite assignment assertion</strong>: I promise the value is assigned before it is read, so the compiler drops TS2564 or TS2454.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it exists:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictPropertyInitialization</code>, part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--strict</code>, only looks at initialisers and the constructor body. It cannot see a helper method, a framework injection or a callback. The check and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> both arrived in TypeScript 2.7.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The risk:</strong> <span style="color:#f0e2c8;">Nothing checks the promise. If the field is never assigned, I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> from a value typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Not the same as \`expr!\`:</strong> <span style="color:#f0e2c8;">After an expression, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> is the non-null assertion that removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> from that expression type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My rule:</strong> <span style="color:#f0e2c8;">I prefer an initialiser, a parameter property or an optional type; I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> only for framework-injected or setup-guaranteed fields, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare</code> when a base class assigns the field.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does TypeScript not see an assignment made in a method called from the constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The check is local: it reads initialisers and the constructor body and does not follow calls into other methods. Following them would not be reliable anyway, since a subclass can override the method.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is emitted for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tag!: string</code> with target ES2022?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real class field <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tag;</code>, which is defined as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> returns. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declare tag: string</code> nothing is emitted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">!</code> field a real bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a base-class constructor assigns it through an overridden method: the subclass field definition runs afterwards and resets it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Also whenever no code path guarantees the assignment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">!</code> with an initializer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: that is error TS1263. And <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let x!;</code> without a type is error TS1264, because the assertion needs a declared type to promise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you model a field that is legitimately empty for a while?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make it honest: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field?: T</code>, or a discriminated union of states like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ status: "loading" } | { status: "ready"; data: T }</code>, so callers must check before use.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Definite assignment assertion | \`!\` after a declared name: "assigned before it is read" |
| strictPropertyInitialization | The \`--strict\` check that class fields are assigned by an initializer or the constructor |
| \`declare\` field | A type-only class field with no emitted JavaScript |

**Conclusion:** The definite assignment assertion is a signed guarantee: \`label!: string\` tells TypeScript a value will be there by the time anyone reads it, which is often true for framework-injected or helper-initialised fields that the constructor-only check cannot follow. Nothing verifies the guarantee, and with ES2022 class fields a \`!\` field is still emitted and can even wipe out a value set by a base class, where \`declare\` would not. Treat it as the last option after initialisers, parameter properties and honest optional types, and keep it apart from its sibling \`expr!\`, which removes \`null\` from an expression.`,
    examples: [
      {
        label: `Fields, locals, the other ! and safer alternatives`,
        code: `// 1. Class fields under strictPropertyInitialization (part of --strict).
class Plain {
  // @ts-expect-error Property 'name' has no initializer and is not definitely assigned in the constructor.
  name: string;
}
console.log(typeof Plain);

// The ! tells the compiler: "this is assigned, just not where you can see it".
class Widget {
  id: number;
  label!: string;
  constructor(id: number) {
    this.id = id;
    this.init();
  }
  private init(): void {
    // Assigned in a helper method: the constructor check cannot follow calls.
    this.label = "widget-" + this.id;
  }
}
console.log(new Widget(7).label);

// 2. The ! is a promise you can break. Nothing checks it.
class Lazy {
  value!: string;
  load(): void { this.value = "loaded"; }
}
const lazy = new Lazy();
console.log(String(lazy.value));
try {
  // Compiles, because value is typed string. Fails at run time.
  console.log(lazy.value.toUpperCase());
} catch (e) {
  console.log((e as Error).name);
}

// 3. Local variables: assigned inside a callback the compiler cannot see into.
let first!: number;
[5, 6, 7].forEach((n, i) => { if (i === 0) first = n; });
console.log(first * 2);

let total: number;
[1, 2, 3].forEach((n) => { total = n; });
// @ts-expect-error Variable 'total' is used before being assigned.
console.log(total);

// 4. The ! sits after the NAME in a declaration. The other ! (non-null
// assertion) sits after an EXPRESSION.
const scores = new Map<string, number>([["ada", 10]]);
const ada = scores.get("ada")!;
console.log(ada + 1);

// 5. Safer alternatives for the same situations.
class Counter {
  // An initializer: no ! needed.
  hits = 0;
  // Honest optional type: callers must handle undefined.
  lastSeen?: string;
  // Constructor parameter property: assigned in the constructor.
  constructor(public readonly name: string) {}
}
const c = new Counter("home");
console.log(c.name, c.hits, c.lastSeen ?? "never");`,
      },
      {
        label: `! versus declare under ES2022 class field emit`,
        code: `// How ! interacts with class field emit (target ES2022, the page setting).
// With ES2022+ targets, TypeScript emits real class fields, and a field
// declared with ! is still emitted as a field that starts as undefined.

class Base {
  constructor() {
    // Runs BEFORE the subclass fields are defined.
    this.setup();
  }
  setup(): void {}
}

class WithBang extends Base {
  tag!: string;
  setup(): void {
    this.tag = "set in setup";
  }
}

class WithDeclare extends Base {
  // declare: a type-only field. No emit, so nothing overwrites it.
  declare tag: string;
  setup(): void {
    this.tag = "set in setup";
  }
}

console.log(String(new WithBang().tag));
console.log(new WithDeclare().tag);

// The field really exists on the instance, with the value undefined.
const bang = new WithBang();
console.log("tag" in bang, Object.keys(bang).join(","));

// A declare field cannot have an initializer.
class Bad {
  // @ts-expect-error Initializers are not allowed in ambient contexts.
  declare x: number = 1;
}
console.log(typeof Bad);

// ! and an initializer together are rejected too.
class AlsoBad {
  // @ts-expect-error Declarations with initializers cannot also have definite assignment assertions.
  y!: number = 1;
}
console.log(typeof AlsoBad);

// ! requires a type annotation.
// @ts-expect-error Declarations with definite assignment assertions must also have type annotations.
let z!;
z = 3;
console.log(z);`,
      },
    ],
  },
  {
    title: `How do you safely work with JSON of unknown shape?`,
    difficulty: "medium",
    seoDescription: `Type parsed JSON as unknown, validate it at the boundary with guards or a schema that infers its type, and handle invalid JSON and dates deliberately.`,
    description: `**Question presented to candidate:**
"You call \`JSON.parse\` on a request body or \`fetch(...).json()\` on an API response. How do you work with that data safely in TypeScript, given that the compiler has no idea what shape it has?"

**What a strong answer should cover:**
- \`JSON.parse\` returns \`any\`, which switches type checking off and spreads silently; the fix is to treat parsed data as \`unknown\`
- Narrow \`unknown\` with checks: \`typeof\`, \`Array.isArray\`, an \`isRecord\` helper, type guards or assertion functions, field by field, and build a fresh object so unknown keys are not passed on
- Handle the two failure modes separately: invalid JSON (\`JSON.parse\` throws a \`SyntaxError\`) and valid JSON of the wrong shape; a \`Result\` type keeps both explicit
- Schema validation libraries (Zod, Valibot and others) give one definition for the run-time check and the static type (\`z.infer\`-style inference), avoiding drift between a hand-written type and a hand-written guard
- JSON has no \`Date\`, \`Map\`, \`undefined\` or class instances: dates arrive as strings and need a reviver or explicit conversion
- Why a type assertion (\`as User\`) is not validation

**Clarifying questions expected:**
- Is the data from our own backend with a shared contract, or from a third party or user input?
- What should happen on invalid data: reject, fall back to defaults, or log and continue?
- Is a validation library already in the project, and does bundle size matter on the client?

**Code / implementation expected:** Yes — a parse wrapper returning \`unknown\` plus a type guard or schema that validates the shape.`,
    answer: `**Target Audience:** Developers who parse API responses, request bodies, config files or \`localStorage\` and want those values typed without lying to the compiler.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and output below was produced with TypeScript 5.4.5 (\`--strict\`, target ES2022).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A restaurant kitchen receives a delivery every morning. The supplier's van says "FRESH FISH". A careless kitchen takes the crates straight to the grill. A careful one opens each crate at the back door, checks it, and only then lets it into the kitchen — after which every cook can trust it without checking again.

JSON from outside your program is that delivery. TypeScript cannot see across the network, so it has no idea what is in the crate. Its default is the careless kitchen: \`JSON.parse\` returns \`any\`, and any type check downstream is quietly switched off. The safe approach is the back door: treat the data as \`unknown\`, check it **once** at the boundary, and hand typed values to the rest of the program.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Where does the JSON come from: our backend, a third party, or user input? | Shared contracts may justify generated types plus light checks; anything external needs full validation |
| What should happen on bad data? | Decides between throwing, returning a \`Result\`, or using defaults |
| Is there a validation library already? | Reuse it instead of hand-writing guards; on the client, bundle size may matter |
| How large and how nested are the payloads? | Hand-written guards are fine for three fields, painful for thirty |
| Do we need dates, big integers or other non-JSON types? | JSON only has strings, numbers, booleans, null, arrays and objects |

## 3. The Problem: \`any\` Leaks

~~~ts
const leaky = JSON.parse('{"price":"12"}');   // leaky: any
const price: number = leaky.price;            // no error
console.log(typeof price, price + 1);         // string 121
~~~

In TypeScript 5.4.5's standard library, \`JSON.parse\` is declared as returning \`any\`, and so is the DOM \`Response.json()\` (\`json(): Promise<any>\`). An \`any\` value can be assigned to \`number\`, so the string \`"12"\` travels into a \`number\` variable and \`price + 1\` produces \`"121"\`. No error appears anywhere — the bug shows up far from where the data arrived.

📌 **Interview term: \`any\` leakage** — an \`any\` value flowing into typed variables, parameters and return values, switching off checks wherever it goes. The \`any\` vs \`unknown\` comparison is covered in [What is the difference between any and unknown?](/interview-question/what-is-the-difference-between-any-and-unknown)

## 4. Step 1: Make the Boundary Return \`unknown\`

~~~ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function parseJson(text: string): Result<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : "unknown error" };
  }
}
~~~

\`as unknown\` is the one assertion that can never lie, since every value is an \`unknown\`. From here the compiler refuses to let you touch the data until you check it:

~~~text
error TS18046: 'raw' is of type 'unknown'.
~~~

Note that the wrapper also turns the *first* failure mode — text that is not JSON at all — into a value: for \`'{"id":3,"name":"Chair",'\` it returns \`parse failed: SyntaxError\`. (The error *message* text differs between JavaScript engines, so the example prints only the name.)

📌 **Interview term: trust boundary** — the place where data enters your program from something you do not control (network, files, storage, user input). Validate there, once, and pass typed values inward.

## 5. Step 2: Narrow It, Field by Field

~~~ts
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toProduct(v: unknown): Result<Product> {
  if (!isRecord(v)) return { ok: false, error: "expected an object" };
  const { id, name, tags, discount } = v;
  if (typeof id !== "number" || !Number.isInteger(id)) return { ok: false, error: "id: expected an integer" };
  if (typeof name !== "string") return { ok: false, error: "name: expected a string" };
  if (!Array.isArray(tags) || !tags.every((t): t is string => typeof t === "string"))
    return { ok: false, error: "tags: expected string[]" };
  ...
  return { ok: true, value: { id, name, tags, ...(discount !== undefined ? { discount } : {}) } };
}
~~~

Things worth pointing out in an interview:

- **\`isRecord\`** is the reusable first step: \`typeof null\` is \`"object"\` and arrays are objects too, so both need excluding. The \`[1,2,3]\` input is rejected with \`expected an object\`.
- **Every narrowing is real.** After \`typeof name !== "string"\` returns early, \`name\` is \`string\`; \`tags.every\` with a type predicate narrows \`tags\` to \`string[]\`.
- **Build a fresh object.** The first input carried an extra \`"admin": true\`; the validated value printed \`{"id":1,"name":"Lamp","tags":["home"]}\` without it. Returning the original object would pass unchecked keys on to the rest of the program.
- **Report the path.** \`"id":"1"\` gives \`id: expected an integer\`, which is far easier to debug than a later crash.

The same checks can be written as an assertion function (\`asserts v is Product\`) if you prefer throwing — see [What are assertion functions (asserts)?](/interview-question/what-are-assertion-functions-asserts)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Text goes through JSON parse into unknown, then a validator produces either a typed value for the app or an error at the boundary">
  <defs>
    <marker id="js-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="111" text-anchor="middle">raw text</text>
  <text class="d-sub" x="90" y="133" text-anchor="middle">network or file</text>
  <rect class="d-box" x="220" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="295" y="111" text-anchor="middle">unknown</text>
  <text class="d-sub" x="295" y="133" text-anchor="middle">after JSON.parse</text>
  <rect class="d-box" x="430" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="500" y="111" text-anchor="middle">validator</text>
  <text class="d-sub" x="500" y="133" text-anchor="middle">guard or schema</text>
  <rect class="d-box-accent" x="620" y="10" width="125" height="70" rx="10"/>
  <text class="d-text" x="682" y="41" text-anchor="middle">Product</text>
  <text class="d-sub" x="682" y="63" text-anchor="middle">typed value</text>
  <rect class="d-box-muted" x="620" y="150" width="125" height="70" rx="10"/>
  <text class="d-text" x="682" y="181" text-anchor="middle">error</text>
  <text class="d-sub" x="682" y="203" text-anchor="middle">with a path</text>
  <path class="d-edge" d="M 164 115 L 214 115" marker-end="url(#js-arrow)"/>
  <path class="d-edge" d="M 374 115 L 424 115" marker-end="url(#js-arrow)"/>
  <path class="d-edge-accent" d="M 574 100 L 614 50" marker-end="url(#js-arrow)"/>
  <path class="d-edge-dashed" d="M 574 130 L 614 180" marker-end="url(#js-arrow)"/>
</svg>

Only the validator decides what the rest of the program may assume: everything to its right is typed, everything to its left is \`unknown\`.

## 6. Step 3: One Definition for the Type and the Check

Hand-written guards have a weakness: the \`type Product\` and the \`toProduct\` function are two separate things that can drift apart. Schema libraries solve this by making the **schema** the single source, and *deriving* the type from it. Example 2 builds a tiny version in about 40 lines to show the mechanism:

~~~ts
type Check<T> = { parse(v: unknown, path?: string): T };
type Infer<S> = S extends Check<infer T> ? T : never;

const UserSchema = object({
  id: num,
  name: str,
  role: literal("admin", "member"),
  emails: array(str),
  nickname: optional(str),
});
type User = Infer<typeof UserSchema>;
// { id: number; name: string; role: "admin" | "member"; emails: string[]; nickname: string | undefined }
~~~

The \`Equal\` check in the example confirms that exact type. Each combinator returns a \`Check<T>\`; \`object\` maps over its shape with a mapped type, and \`Infer\` pulls \`T\` out with \`infer\` (see [What does the infer keyword do?](/interview-question/what-does-the-infer-keyword-do) and [What are mapped types?](/interview-question/what-are-mapped-types)). Errors carry a path: \`emails[1]: expected string, got 42\`.

📌 **Interview term: schema validation** — describing the expected shape as a run-time value (a schema) that both validates data and, through type inference, produces the matching static type. Zod and Valibot are popular libraries built on this idea; both offer a throwing \`parse\` and a non-throwing \`safeParse\`, and infer the type from the schema (\`z.infer<typeof Schema>\` in Zod, \`v.InferOutput<typeof Schema>\` in Valibot, per the [Valibot type inference guide](https://valibot.dev/guides/infer-types/)). The toy version imitates the throwing \`parse\`. (The libraries themselves were not run here — the page cannot import packages.)

A simplification to be aware of: the toy \`optional\` gives \`nickname: string | undefined\` with a *required* key. Real libraries add an extra mapped-type step so optional fields become \`nickname?: string\`.

## 7. JSON Is Not JavaScript

JSON only has strings, numbers, booleans, \`null\`, arrays and plain objects. Anything else changes on the round trip:

- **Dates become strings.** \`JSON.parse(JSON.stringify({ at: new Date(...) }))\` gave \`typeof event.at === "string"\`. Convert explicitly, or pass a *reviver* to \`JSON.parse\` — example 1's reviver turned \`"at"\` back into a \`Date\` (\`true 2024\`).
- **\`undefined\` properties disappear**, \`Map\` and \`Set\` become \`{}\`, class instances lose their methods.
- **Big integers lose precision** beyond \`Number.MAX_SAFE_INTEGER\`; send them as strings.

So the *type* you validate against should describe the JSON (\`at: string\`), and conversion to richer types should be a separate, deliberate step.

## 8. Verified: Running the Code

Both examples were type-checked with \`tsc --strict\` (5.4.5), with every \`// @ts-expect-error\` line really rejected, and run as the page runs them. With the directives removed, example 1 reports:

~~~text
main.ts(57,23): error TS18046: 'raw' is of type 'unknown'.
~~~

Example 2 has no expected errors. Example 1, \`unknown\`, guards and a \`Result\`, prints:

~~~text
true string 121
valid: {"id":1,"name":"Lamp","tags":["home"]}
invalid: id: expected an integer
invalid: tags: expected string[]
invalid: expected an object
parse failed: SyntaxError
function
string 2024-01-02T00:00:00.000Z
true 2024
~~~

Example 2, a schema that infers its own type, prints:

~~~text
true
ok Ada admin {"id":1,"name":"Ada","role":"admin","emails":["ada@example.com"]}
role: expected admin | member, got "owner"
emails[1]: expected string, got 42
id: expected number, got "4"
~~~

## 9. Approaches Compared

| Approach | Run-time check | Type and check in sync | Effort | Use when |
| :--- | :--- | :--- | :--- | :--- |
| \`JSON.parse(text) as User\` | none | no | none | never for external data |
| \`unknown\` + hand-written guards | yes | manually | medium | small payloads, no dependencies wanted |
| \`unknown\` + assertion function | yes | manually | medium | you prefer throwing at the boundary |
| Schema library (Zod, Valibot, ...) | yes | yes, type is inferred | low per schema | most real APIs and forms |
| Types generated from OpenAPI / JSON Schema | depends on the generator | yes, from the contract | setup cost | large APIs with a published contract |

## Common Pitfalls

- **\`as User\` on parsed JSON.** It is a label, not a check — see [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)
- **Letting \`any\` escape.** \`const data = await res.json()\` is \`any\`; annotate it as \`unknown\` immediately (\`const data: unknown = await res.json()\`).
- **Forgetting \`null\` and arrays.** \`typeof v === "object"\` is true for both; use an \`isRecord\` helper.
- **Returning the input object.** Extra properties pass through; build a new object from the checked fields.
- **Mixing up the two failures.** Invalid JSON throws a \`SyntaxError\`; wrong shape is your validator's job. Handle both.
- **Typing dates as \`Date\`.** The JSON holds a string; validate the string, then convert.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Response.json()</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, which switches type checking off and leaks into everything it touches.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule:</strong> <span style="color:#f0e2c8;">I treat parsed data as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> at the trust boundary, so the compiler forces me to check it before use.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Checking:</strong> <span style="color:#f0e2c8;">For small shapes I write guards: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isRecord</code> helper, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.isArray</code> per field, then build a fresh typed object and return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Result</code> with a clear error path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. At scale:</strong> <span style="color:#f0e2c8;">For real APIs I use a schema library such as Zod or Valibot, so one schema gives both the run-time check and the inferred type, and they cannot drift.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JSON limits:</strong> <span style="color:#f0e2c8;">I handle invalid JSON (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code>) separately from a wrong shape, and remember JSON has no dates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so I convert those deliberately.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unknown</code> better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any</code> for parsed JSON?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> allows every operation and assignment without checks; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> allows none until you narrow it, so the compiler makes sure validation happens before use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">JSON.parse(text) as User</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for data whose shape you fully control and trust. The assertion is erased, so a wrong payload becomes a wrongly typed value with no error at the boundary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a schema library infer a TypeScript type from a schema?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each schema is a value with a generic type parameter, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Check&lt;T&gt;</code>. Combinators such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> use mapped types over the shape, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infer</code> type uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infer</code> to extract <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do with dates in JSON?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Validate them as strings in the JSON type, then convert explicitly, either in the validator or with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code> reviver, and check the result is a valid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the trade-off of validating everything at run time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some CPU time and, on the client, bundle size for the library. In return, bad data fails at the boundary with a precise message instead of crashing somewhere unrelated later.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`any\` leakage | An \`any\` value flowing into typed code and disabling checks wherever it goes |
| Trust boundary | Where external data enters the program; validate there, once |
| Schema validation | A run-time schema that validates data and infers the matching static type |

**Conclusion:** Working safely with JSON of unknown shape means refusing the \`any\` that \`JSON.parse\` and \`Response.json()\` hand you: type the result as \`unknown\`, validate it at the trust boundary with guards or a schema, and let only checked, freshly built values into the rest of the program. Hand-written guards are fine for small shapes; a schema library is better at scale because the type is derived from the check. Treat invalid JSON and wrong shapes as separate failures, remember that JSON cannot carry dates or other rich types, and never mistake \`as User\` for validation.`,
    examples: [
      {
        label: `unknown, type guards and a Result for parsed JSON`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. The problem: JSON.parse returns any, and any spreads silently.
const leaky = JSON.parse('{"price":"12"}');
const isAny: Equal<typeof leaky, any> = true;
// No error: any lets you call anything and assign it anywhere.
const price: number = leaky.price;
console.log(isAny, typeof price, price + 1);

// 2. The fix: a wrapper that returns unknown and never throws.
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
function parseJson(text: string): Result<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : "unknown error" };
  }
}

// 3. Small reusable guards.
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
type Product = { id: number; name: string; tags: string[]; discount?: number };

function toProduct(v: unknown): Result<Product> {
  if (!isRecord(v)) return { ok: false, error: "expected an object" };
  const { id, name, tags, discount } = v;
  if (typeof id !== "number" || !Number.isInteger(id)) return { ok: false, error: "id: expected an integer" };
  if (typeof name !== "string") return { ok: false, error: "name: expected a string" };
  if (!Array.isArray(tags) || !tags.every((t): t is string => typeof t === "string"))
    return { ok: false, error: "tags: expected string[]" };
  if (discount !== undefined && typeof discount !== "number")
    return { ok: false, error: "discount: expected a number" };
  // Build a fresh object: unknown extra keys are dropped, not passed on.
  return { ok: true, value: { id, name, tags, ...(discount !== undefined ? { discount } : {}) } };
}

const inputs = [
  '{"id":1,"name":"Lamp","tags":["home"],"admin":true}',
  '{"id":"1","name":"Lamp","tags":[]}',
  '{"id":2,"name":"Desk","tags":["office",3]}',
  '[1,2,3]',
  '{"id":3,"name":"Chair",',
];
for (const text of inputs) {
  const parsed = parseJson(text);
  if (!parsed.ok) { console.log("parse failed:", parsed.error); continue; }
  const product = toProduct(parsed.value);
  // After checking ok, product.value is Product and fully typed.
  console.log(product.ok ? "valid: " + JSON.stringify(product.value) : "invalid: " + product.error);
}

// 4. unknown forces the check: this line does not compile.
const raw: unknown = JSON.parse('{"name":"x"}');
// @ts-expect-error 'raw' is of type 'unknown'.
const tooSoon = () => raw.name;
console.log(typeof tooSoon);

// 5. JSON has no Date type: dates come back as strings.
const event = JSON.parse(JSON.stringify({ at: new Date(Date.UTC(2024, 0, 2)) }));
console.log(typeof event.at, event.at);
const revived = JSON.parse('{"at":"2024-01-02T00:00:00.000Z"}', (key, value) =>
  key === "at" && typeof value === "string" ? new Date(value) : value);
console.log(revived.at instanceof Date, revived.at.getUTCFullYear());`,
      },
      {
        label: `A tiny schema validator that infers its own type`,
        code: `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A tiny schema library in the style of Zod or Valibot: one definition gives
// both the run-time check and the static type, so they cannot drift apart.
type Check<T> = { parse(v: unknown, path?: string): T };
type Infer<S> = S extends Check<infer T> ? T : never;

class ValidationError extends Error {
  name = "ValidationError";
}
const fail = (path: string, expected: string, v: unknown): never => {
  throw new ValidationError((path || "value") + ": expected " + expected + ", got " + JSON.stringify(v));
};

const str: Check<string> = { parse: (v, p = "") => (typeof v === "string" ? v : fail(p, "string", v)) };
const num: Check<number> = {
  parse: (v, p = "") => (typeof v === "number" && Number.isFinite(v) ? v : fail(p, "number", v)),
};
function literal<L extends string>(...options: L[]): Check<L> {
  return { parse: (v, p = "") => (options.includes(v as L) ? (v as L) : fail(p, options.join(" | "), v)) };
}
function array<T>(item: Check<T>): Check<T[]> {
  return { parse: (v, p = "") => (Array.isArray(v) ? v.map((x, i) => item.parse(x, p + "[" + i + "]")) : fail(p, "array", v)) };
}
function optional<T>(inner: Check<T>): Check<T | undefined> {
  return { parse: (v, p) => (v === undefined ? undefined : inner.parse(v, p)) };
}
function object<S extends Record<string, Check<unknown>>>(shape: S): Check<{ [K in keyof S]: Infer<S[K]> }> {
  return {
    parse(v, p = "") {
      if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(p, "object", v);
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        out[key] = shape[key].parse((v as Record<string, unknown>)[key], p ? p + "." + key : key);
      }
      // The loop above checked every key of the shape.
      return out as { [K in keyof S]: Infer<S[K]> };
    },
  };
}

// One definition...
const UserSchema = object({
  id: num,
  name: str,
  role: literal("admin", "member"),
  emails: array(str),
  nickname: optional(str),
});
// ...and the type is derived from it.
type User = Infer<typeof UserSchema>;
const shape: Equal<User, {
  id: number; name: string; role: "admin" | "member"; emails: string[]; nickname: string | undefined;
}> = true;
console.log(shape);

const payloads = [
  '{"id":1,"name":"Ada","role":"admin","emails":["ada@example.com"],"extra":1}',
  '{"id":2,"name":"Bob","role":"owner","emails":[]}',
  '{"id":3,"name":"Cy","role":"member","emails":["a@b.c",42]}',
  '{"id":"4","name":"Di","role":"member","emails":[]}',
];
for (const text of payloads) {
  try {
    const user: User = UserSchema.parse(JSON.parse(text));
    console.log("ok", user.name, user.role, JSON.stringify(user));
  } catch (e) {
    console.log(e instanceof ValidationError ? e.message : String(e));
  }
}`,
      },
    ],
  },
];

export default augments;
