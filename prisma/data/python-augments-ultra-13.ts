/**
 * PYTHON ULTRA — batch 02: Basics II — control flow and scripts: break, continue, pass and
 * loop else; if __name__ == "__main__"; comparison chaining; the walrus operator; f-strings.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output. Examples marked
 * runnable: false were run on the interpreter named in their python field.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does yield from delegation work?`,
    difficulty: "medium",
    seoDescription: `How Python yield from delegates to a subgenerator: forwarding send, throw and close, capturing return values, bytecode and verified examples.`,
    description: `**Question presented to candidate:**
"Python has \`yield from\`. Isn't that just a shorter way of writing \`for x in sub: yield x\`? Explain what it really does, and when the difference matters."

**What a strong answer should cover:**
- \`yield from <iterable>\` makes the current generator a pass-through for a sub-iterator: every value the sub-iterator produces goes straight to the outer caller, and the outer generator stays paused at that line until the sub-iterator is exhausted.
- It is more than the \`for\` loop: \`send()\` values, \`throw()\` exceptions and \`close()\` are forwarded to the subgenerator, which the loop version cannot do (the loop only ever calls \`next()\`).
- The *value* of the \`yield from\` expression is the subgenerator's \`return\` value, carried by \`StopIteration.value\` — so \`result = yield from sub()\` lets helper generators return results.
- Typical uses: flattening recursive structures, splitting a large generator into smaller helper generators, and (historically) the generator-based coroutines that came before \`async\`/\`await\`. It was added by PEP 380 in Python 3.3.
- CPython details: \`GET_YIELD_FROM_ITER\` + a \`SEND\` loop in the bytecode, and \`gi_yieldfrom\` pointing at the current delegate; \`yield from\` is a \`SyntaxError\` inside \`async def\`.

**Code / implementation expected:** Optional — a small delegating generator that captures a subgenerator's return value, or a recursive flatten.`,
    answer: `**Target Audience:** Python developers who know what a generator is and want to understand delegation properly; interview candidates who will be asked "isn't it just a loop?".
**Difficulty:** Medium
**Python version:** All behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the bytecode comparison was also run on CPython 3.12.3.

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it word for word.

## 1. Why This Even Matters — A Story First

Picture a receptionist at a front desk. A visitor asks a question, and the receptionist says "one moment" and puts the visitor through to a specialist on the phone. From then on the visitor talks *directly* to the specialist: questions go to the specialist, answers come back from the specialist, and if the visitor hangs up, the specialist's call ends too. The receptionist just waits. When the specialist finishes, they tell the receptionist a short summary ("sorted, two forms filed"), and the receptionist carries on with the visitor.

That is \`yield from\`. The **outer generator** is the receptionist, the **subgenerator** is the specialist, and the **caller** (your \`for\` loop, or code calling \`send()\`) is the visitor. The naive alternative — the receptionist repeating every sentence back and forth — works for one-way chat (values coming out), but loses anything the visitor says *to* the specialist and loses the summary at the end. Interviewers ask this question precisely to see whether you know about those two extra directions.

If generators themselves are new to you, read [what generators are and why to use them](/interview-question/what-are-generators-and-why-use-them) and [the generator lifecycle](/interview-question/what-is-a-generator-s-lifecycle) first; this page builds on both.

## 2. The Core Idea

📌 **Interview term: delegation (yield from)** — the expression \`yield from <iterable>\` inside a generator. It gets an iterator from the iterable, then repeatedly hands every value that iterator yields to the outer generator's caller, until the iterator is exhausted. The outer generator stays suspended at that line the whole time.

📌 **Interview term: subgenerator (delegate)** — the iterator that \`yield from\` is running. It can be any iterable (a list, a \`range\`, a string), but only a generator can receive \`send()\` and \`throw()\` and return a value.

📌 **Interview term: delegating generator** — the outer generator that contains the \`yield from\` expression.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="The caller talks to the outer generator, which passes next, send, throw and close straight through to the subgenerator">
  <defs>
    <marker id="py13q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="90" width="170" height="90" rx="10"/>
  <text class="d-text" x="115" y="128" text-anchor="middle">Caller</text>
  <text class="d-sub" x="115" y="152" text-anchor="middle">for loop, next, send</text>
  <rect class="d-box-accent" x="295" y="90" width="170" height="90" rx="10"/>
  <text class="d-text d-accent" x="380" y="122" text-anchor="middle">Outer generator</text>
  <text class="d-sub" x="380" y="146" text-anchor="middle">paused on</text>
  <text class="d-sub" x="380" y="164" text-anchor="middle">yield from sub</text>
  <rect class="d-box" x="560" y="90" width="170" height="90" rx="10"/>
  <text class="d-text" x="645" y="128" text-anchor="middle">Subgenerator</text>
  <text class="d-sub" x="645" y="152" text-anchor="middle">does the real work</text>
  <path class="d-edge" d="M 200 110 L 291 110" marker-end="url(#py13q1-arrow)"/>
  <path class="d-edge" d="M 465 110 L 556 110" marker-end="url(#py13q1-arrow)"/>
  <text class="d-sub" x="380" y="60" text-anchor="middle">next, send, throw, close go down</text>
  <path class="d-edge-accent" d="M 556 160 L 469 160" marker-end="url(#py13q1-arrow)"/>
  <path class="d-edge-accent" d="M 291 160 L 204 160" marker-end="url(#py13q1-arrow)"/>
  <text class="d-sub d-accent" x="380" y="222" text-anchor="middle">each yielded value comes straight back up</text>
  <rect class="d-box-muted" x="295" y="240" width="170" height="44" rx="10"/>
  <text class="d-sub" x="380" y="267" text-anchor="middle">return value of sub</text>
  <path class="d-edge-dashed" d="M 645 180 L 645 262 L 469 262" marker-end="url(#py13q1-arrow)"/>
</svg>

Read the diagram top to bottom: everything the caller does to the outer generator — \`next()\`, \`send(x)\`, \`throw(exc)\`, \`close()\` — goes straight down to the subgenerator; every value the subgenerator yields comes straight back up to the caller; and when the subgenerator *returns*, that return value lands in the outer generator as the value of the \`yield from\` expression (the dashed path), after which the outer generator resumes on the next line.

The feature was proposed in [PEP 380 — Syntax for Delegating to a Subgenerator](https://peps.python.org/pep-0380/) and shipped in Python 3.3. Its abstract is the best one-sentence definition: it lets a generator delegate part of its operations to another generator, and lets the subgenerator return a value to the delegating generator.

## 3. Values Out, Return Value Back

The simplest use looks exactly like the loop — and that is the source of the "it is just a shortcut" myth:

~~~python
def letters():
    yield "a"
    yield "b"
    return "letters done"          # becomes StopIteration.value

def loop_version():
    for v in letters():
        yield v
    yield "end"

def delegating_version():
    result = yield from letters()
    yield f"sub returned {result!r}"
    yield "end"
~~~

~~~text
['a', 'b', 'end']
['a', 'b', "sub returned 'letters done'", 'end']
~~~

Both versions yield \`a\` and \`b\`. Only the \`yield from\` version gets the string \`"letters done"\` back. The \`for\` loop silently swallows the \`StopIteration\` that carries it.

📌 **Interview term: StopIteration.value** — when a generator executes \`return x\`, Python raises \`StopIteration\` with \`.value\` set to \`x\`. A \`for\` loop treats \`StopIteration\` as "done" and discards it; \`yield from\` catches it and makes \`x\` the result of the expression.

That return channel is what makes **splitting a big generator into helpers** practical. In Example 1, \`report()\` delegates to \`header()\` and \`body()\`, and each helper both streams lines *and* returns how many it produced:

~~~python
def report(rows):
    lines = yield from header()
    lines += yield from body(rows)
    yield f"total lines: {lines + 1}"
~~~

Without \`yield from\` you would have to pass a mutable counter around or turn the helpers into classes.

### Delegating to any iterable, and recursion

\`yield from\` accepts any iterable, so it is also the cleanest way to write a chaining or flattening generator:

~~~python
def flatten(node):
    if isinstance(node, list):
        for child in node:
            yield from flatten(child)
    else:
        yield node

print(list(flatten([1, [2, [3, [4]], 5], [[6]]])))  # [1, 2, 3, 4, 5, 6]
~~~

Each nested level is another suspended generator frame. That has a cost: values from depth *d* travel through *d* \`yield from\` hops, and very deep nesting hits the recursion limit — on our 3.11 run a chain of 5000 nested \`yield from\` generators raised \`RecursionError: maximum recursion depth exceeded\`. For deep or untrusted data, use an explicit stack instead of recursion.

## 4. The Two-Way Part: send, throw and close

This is the part that separates a real answer from a shallow one.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Comparison of what a for loop forwards and what yield from forwards">
  <rect class="d-box-muted" x="30" y="30" width="300" height="170" rx="10"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">for v in sub: yield v</text>
  <text class="d-sub" x="180" y="100" text-anchor="middle">values out: yes</text>
  <text class="d-sub" x="180" y="126" text-anchor="middle">send values: replaced by None</text>
  <text class="d-sub" x="180" y="152" text-anchor="middle">throw: lands in the outer generator</text>
  <text class="d-sub" x="180" y="178" text-anchor="middle">return value: lost</text>
  <rect class="d-box-accent" x="390" y="30" width="300" height="170" rx="10"/>
  <text class="d-text d-accent" x="540" y="62" text-anchor="middle">yield from sub</text>
  <text class="d-sub" x="540" y="100" text-anchor="middle">values out: yes</text>
  <text class="d-sub" x="540" y="126" text-anchor="middle">send values: reach the subgenerator</text>
  <text class="d-sub" x="540" y="152" text-anchor="middle">throw and close: forwarded</text>
  <text class="d-sub" x="540" y="178" text-anchor="middle">return value: the expression value</text>
</svg>

The left box is the manual loop, the right one \`yield from\`; the rows are what happens to each operation the caller can perform.

📌 **Interview term: transparent forwarding** — while a delegating generator is suspended in \`yield from\`, \`send(x)\` is passed to the subgenerator's \`send(x)\`, \`throw(e)\` to its \`throw(e)\`, and \`close()\` closes the subgenerator first. The outer generator is invisible in the middle.

**\`send()\`.** Example 2 uses an \`averager()\` that receives numbers through \`value = yield\` and returns their mean when it receives \`None\`. Behind \`yield from\`, the caller sends 10, 20 and 60 and gets \`[30.0]\` back. Behind the manual \`for\` loop, the first \`send(10)\` is received by the *loop's* \`yield\`, which throws the 10 away; the loop then calls \`next()\` on the averager, and \`next()\` is the same as \`send(None)\` — the sentinel — so the averager tries to divide by a count of zero:

~~~text
yield from mean: [30.0]
manual loop: averager got None, not 10 -> ZeroDivisionError
~~~

**\`throw()\`.** \`o.throw(ValueError("bad input"))\` on the outer generator raises the exception *inside the subgenerator*, at its paused \`yield\`, so the subgenerator's own \`try/except\` handles it and yields \`"sub handled bad input"\`. If the subgenerator does not handle it, the exception propagates out of the subgenerator, into the outer generator at the \`yield from\` line, where the outer generator gets its own chance to catch it.

**\`close()\`.** Closing the outer generator raises \`GeneratorExit\` in the subgenerator first, so its \`finally\` runs, then in the outer generator. Example 2 prints \`sub cleanup ran\` before \`outer cleanup ran\`. This matters for pipelines holding files or sockets.

📌 **Interview term: gi_yieldfrom** — a read-only attribute of a generator object; while it is paused in \`yield from\`, it refers to the subgenerator (otherwise \`None\`). Example 2 prints \`gi_yieldfrom is sub: sub\`. Debuggers and \`inspect\` use it to show a whole chain of delegating generators.

## 5. What It Expands To

PEP 380 specifies \`RESULT = yield from EXPR\` as a long block of ordinary Python with \`try/except\` around every step. Example 3 writes a simplified version of that expansion as a normal generator called \`delegate()\` — no \`yield from\` inside it — and drives it with exactly the same \`next\`/\`send\`/\`throw\` sequence as the real keyword. The logs match:

~~~text
['ready', 'HI', 'caught KeyError', 'THERE', 'returned 2']
['ready', 'HI', 'caught KeyError', 'THERE', 'returned 2']
same behaviour: True
~~~

The shape of that expansion, in words:

1. \`it = iter(EXPR)\`, then take the first value with \`next(it)\`.
2. Loop: \`yield\` the value to the caller and wait.
3. If the caller sent \`None\` (plain \`next()\`), call \`next(it)\`; otherwise call \`it.send(x)\`.
4. If the caller threw an exception, call \`it.throw(...)\` (or re-raise if \`it\` has no \`throw\`). If it was \`GeneratorExit\`, call \`it.close()\` and re-raise.
5. When any of those raise \`StopIteration\`, its \`.value\` is the result of the whole expression.

Example 3 is simplified: the real specification also handles a few corner cases (for instance an iterator whose \`close()\` itself raises), so treat it as a teaching model, not a drop-in replacement.

### In CPython bytecode

On CPython 3.11.17, \`dis.dis\` of \`def outer(): result = yield from sub(); return result\` shows the loop directly:

~~~text
  3           6 LOAD_GLOBAL              1 (NULL + sub)
             18 PRECALL                  0
             22 CALL                     0
             32 GET_YIELD_FROM_ITER
             34 LOAD_CONST               0 (None)
        >>   36 SEND                     3 (to 44)
             38 YIELD_VALUE
             40 RESUME                   2
             42 JUMP_BACKWARD_NO_INTERRUPT     4 (to 36)
        >>   44 STORE_FAST               0 (result)
~~~

📌 **Interview term: GET_YIELD_FROM_ITER / SEND** — \`GET_YIELD_FROM_ITER\` turns the operand into an iterator (a generator or coroutine is used as is); \`SEND\` passes the current value into the subgenerator and either gets the next value to yield, or — when the subgenerator finishes — jumps out of the loop with the return value on the stack. On 3.12.3 the same function also has \`END_SEND\` and a \`CLEANUP_THROW\` handler, so the exact opcodes are a version detail; the idea of "a \`SEND\`/\`YIELD_VALUE\` loop in C" is stable. Do not oversell speed: on our 3.11 run, iterating three million values through \`yield from sub()\` and through \`for x in sub(): yield x\` took about the same time (0.136 s versus 0.135 s, \`timeit\`, best of three). The reason to choose \`yield from\` is its semantics, not performance.

## 6. Where It Fits Historically: Coroutines

Before \`async\`/\`await\`, \`asyncio\` coroutines were plain generators decorated with \`@asyncio.coroutine\`, and one coroutine awaited another with \`yield from\`. The two-way forwarding is exactly what an event loop needs: the loop sends results and throws exceptions *down* a chain of coroutines. \`await\` is the modern, dedicated version of that idea. In current Python they are kept separate on purpose: on our 3.11 run, compiling \`yield from [1]\` inside an \`async def\` gives \`SyntaxError: 'yield from' inside async function\`. For the full comparison see [the difference between a generator and a coroutine](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine) and [how async/await works](/interview-question/how-does-async-await-work-in-python).

## 7. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly these lines, and every \`print(...)  # expected\` line passed as an in-page test.

**Example 1 — values out, return value back, recursion:**

~~~text
['a', 'b', 'end']
['a', 'b', "sub returned 'letters done'", 'end']
[1, 2, 3, 'x', 'y', 5, 6]
[1, 2, 3, 4, 5, 6]
StopIteration.value = 'letters done'
HEADER
row x
row y
total lines: 4
~~~

**Example 2 — send, throw and close are forwarded:**

~~~text
yield from mean: [30.0]
manual loop: averager got None, not 10 -> ZeroDivisionError
working
sub handled bad input
working
1
sub cleanup ran
outer cleanup ran
gi_yieldfrom is sub: sub
outer state: GEN_SUSPENDED
inner state: GEN_SUSPENDED
~~~

**Example 3 — the keyword versus a hand-written expansion:**

~~~text
['ready', 'HI', 'caught KeyError', 'THERE', 'returned 2']
['ready', 'HI', 'caught KeyError', 'THERE', 'returned 2']
same behaviour: True
~~~

## 8. yield from vs the Alternatives

| | \`for v in sub: yield v\` | \`yield from sub\` | \`itertools.chain(a, b)\` |
| :--- | :--- | :--- | :--- |
| Passes values out | Yes | Yes | Yes |
| Forwards \`send()\` | No (sends become \`None\`) | Yes | No |
| Forwards \`throw()\` / \`close()\` | No / only by dropping the reference | Yes | No |
| Gives back the return value | No | Yes, as the expression value | No |
| Lets you run code between parts | Yes | Yes | No, it is one fixed chain |

Use \`itertools.chain\` when you only need to glue iterables together (see [the itertools module](/interview-question/what-is-the-itertools-module-used-for)); use \`yield from\` inside a generator when you need logic around the parts, two-way communication, or the return value.

## 9. Edge Cases

- **\`yield from\` an exhausted or empty iterable** finishes immediately; the expression value is \`None\` for a plain iterator (only a generator can return something else).
- **Inside a comprehension**, \`yield\` and \`yield from\` are a \`SyntaxError\` (\`'yield' inside list comprehension\` on 3.11), because a comprehension has its own hidden function scope.
- **A non-generator iterator** (a list iterator, a file) has no \`send\` or \`throw\`; sending a non-\`None\` value to it through \`yield from\` raises \`AttributeError\` (\`'list_iterator' object has no attribute 'send'\` on our run), and a thrown exception is raised in the delegating generator at the \`yield from\` line, where its own \`try/except\` can catch it.
- **\`return\` inside the outer generator** after \`yield from\` sets the *outer* generator's \`StopIteration.value\`, so delegation can be nested: \`return (yield from sub())\` passes the inner result one level further up.
- **Breaking out of a \`for\` over a delegating generator** leaves both suspended; when the outer one is closed or garbage-collected, the inner one is closed first.

## Common Pitfalls

- **Saying it is "just syntax sugar for the loop".** It also forwards \`send\`, \`throw\`, \`close\` and returns the subgenerator's value — the loop does none of these.
- **Forgetting \`yield from\` and calling the helper.** Writing \`header()\` instead of \`yield from header()\` creates a generator object and throws it away; nothing is yielded. Linters catch this, tests often do not.
- **Expecting a return value from \`list(gen)\` or a \`for\` loop.** Only \`yield from\` (or catching \`StopIteration\` yourself) sees \`StopIteration.value\`.
- **Raising \`StopIteration\` manually inside a generator** to "return" a value. Under [PEP 479](https://peps.python.org/pep-0479/) it is converted to \`RuntimeError\` (our 3.11 run: \`RuntimeError: generator raised StopIteration\`); use \`return value\`.
- **Deep recursive \`yield from\`** on large trees: each level is a frame, and a few thousand levels raise \`RecursionError\`.
- **Using \`yield from\` for async code.** In modern Python use \`async def\` and \`await\`; \`yield from\` is a \`SyntaxError\` there.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from sub</code> makes the generator a pass-through: every value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub</code> yields goes to my caller, and I stay paused until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub</code> is finished.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is not just a loop:</strong> <span style="color:#f0e2c8;">It also forwards <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> to the subgenerator. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop only calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>, so sent values become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> and exceptions hit the wrong generator.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The return value:</strong> <span style="color:#f0e2c8;">When the subgenerator does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return x</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> arrives in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration.value</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> makes it the value of the expression: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result = yield from sub()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where you use it:</strong> <span style="color:#f0e2c8;">Recursive generators like tree flattening, splitting a big generator into helpers that return counts or results, and historically coroutines before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> (PEP 380, Python 3.3).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. CPython detail:</strong> <span style="color:#f0e2c8;">It compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET_YIELD_FROM_ITER</code> plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEND</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YIELD_VALUE</code> loop, so forwarding happens inside the interpreter, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gi_yieldfrom</code> points at the current delegate.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the value of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield from [1, 2, 3]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>. A list iterator finishes with a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code>. Only a generator that executes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return x</code> gives a non-<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the subgenerator does not catch an exception thrown into it, what happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It propagates out of the subgenerator and is re-raised in the delegating generator at the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> line, where a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/except</code> around it can handle it; otherwise it goes on to the caller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield from</code> without the keyword?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">it = iter(sub)</code>, then loop: yield its value, route a sent value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">it.send</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>), route thrown exceptions to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">it.throw</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">it.close</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GeneratorExit</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration.value</code> when it ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield from</code> in an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async def</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code> there. Inside native coroutines you use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, which is the dedicated successor; async generators also cannot use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield from</code> faster than the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not meaningfully for plain iteration: on our 3.11 run both took about 0.135 s for three million items. Choose it for its semantics: forwarding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close</code> and capturing the return value.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **delegation (yield from)** | A generator hands the caller over to another iterator until it is done |
| **subgenerator (delegate)** | The iterator \`yield from\` is running |
| **delegating generator** | The outer generator containing \`yield from\` |
| **StopIteration.value** | Carries a generator's \`return\` value; becomes the \`yield from\` result |
| **transparent forwarding** | \`send\`, \`throw\` and \`close\` on the outer generator reach the subgenerator |
| **gi_yieldfrom** | Attribute pointing at the subgenerator while delegating |
| **GET_YIELD_FROM_ITER / SEND** | The CPython opcodes that implement the delegation loop |

---
**Conclusion:** \`yield from\` turns a generator into a transparent pipe to a sub-iterator: values flow out to the caller, \`send()\`, \`throw()\` and \`close()\` flow in to the subgenerator, and the subgenerator's \`return\` value becomes the value of the expression. That makes it the right tool for recursive generators, for splitting a large generator into helper generators that return results, and — historically — for the generator-based coroutines that \`await\` replaced. A strong interview answer states the one-line definition, then immediately names the three things the plain \`for\` loop cannot do.`,
    examples: [
      {
        label: `Values out, return value back, and recursive flatten`,
        code: `# yield from: values out, return value back in

def letters():
    yield "a"
    yield "b"
    return "letters done"          # becomes StopIteration.value

def loop_version():
    # Manual loop: passes values out, but the return value is lost
    for v in letters():
        yield v
    yield "end"

def delegating_version():
    # yield from: passes values out AND captures the return value
    result = yield from letters()
    yield f"sub returned {result!r}"
    yield "end"

print(list(loop_version()))
print(list(delegating_version()))

# yield from works with any iterable, not only generators
def chain_all(*iterables):
    for it in iterables:
        yield from it

print(list(chain_all([1, 2], (3,), "xy", range(5, 7))))  # [1, 2, 3, 'x', 'y', 5, 6]

# Recursive delegation: flatten nested lists of any depth
def flatten(node):
    if isinstance(node, list):
        for child in node:
            yield from flatten(child)
    else:
        yield node

print(list(flatten([1, [2, [3, [4]], 5], [[6]]])))  # [1, 2, 3, 4, 5, 6]

# The return value of a generator is carried by StopIteration
g = letters()
next(g); next(g)
try:
    next(g)
except StopIteration as stop:
    print("StopIteration.value =", repr(stop.value))

# Splitting one big generator into helper generators
def header():
    yield "HEADER"
    return 1

def body(rows):
    count = 0
    for r in rows:
        yield f"row {r}"
        count += 1
    return count

def report(rows):
    lines = yield from header()
    lines += yield from body(rows)
    yield f"total lines: {lines + 1}"

for line in report(["x", "y"]):
    print(line)`,
      },
      {
        label: `send, throw and close are forwarded to the subgenerator`,
        code: `# yield from forwards send(), throw() and close() to the subgenerator

def averager():
    # A coroutine-style generator: receives numbers, returns the mean
    total = 0
    count = 0
    while True:
        value = yield
        if value is None:            # sentinel: stop and return a result
            break
        total += value
        count += 1
    return total / count

def manual_delegate():
    # A plain for loop only calls next(); sent values never reach averager
    for _ in averager():
        yield

def yield_from_delegate(results):
    result = yield from averager()   # send() goes straight through
    results.append(result)

# 1) send() through yield from
results = []
d = yield_from_delegate(results)
next(d)                              # prime: run up to the first yield
for n in (10, 20, 60):
    d.send(n)
try:
    d.send(None)                     # averager returns, delegator finishes
except StopIteration:
    pass
print("yield from mean:", results)

# 2) send() through a manual loop: the value is dropped
m = manual_delegate()
next(m)
try:
    m.send(10)    # the loop ignores 10 and calls next(), which sends None
except ZeroDivisionError as e:
    print("manual loop: averager got None, not 10 ->", type(e).__name__)

# 3) throw() is forwarded: the subgenerator can handle it
def sub():
    while True:
        try:
            yield "working"
        except ValueError as e:
            yield f"sub handled {e}"

def outer():
    yield from sub()

o = outer()
print(next(o))
print(o.throw(ValueError("bad input")))
print(next(o))

# 4) close() is forwarded: the subgenerator finally block runs
def sub_with_cleanup():
    try:
        yield 1
        yield 2
    finally:
        print("sub cleanup ran")

def outer_close():
    try:
        yield from sub_with_cleanup()
    finally:
        print("outer cleanup ran")

c = outer_close()
print(next(c))
c.close()

# 5) While delegating, the outer generator reports its delegate
import inspect
o2 = outer()
next(o2)
print("gi_yieldfrom is sub:", o2.gi_yieldfrom.__name__)
print("outer state:", inspect.getgeneratorstate(o2))
print("inner state:", inspect.getgeneratorstate(o2.gi_yieldfrom))`,
      },
      {
        label: `The yield from keyword versus a hand-written PEP 380 expansion`,
        code: `# What yield from does, written out by hand (a simplified PEP 380 expansion)
import sys

def delegate(sub_iterable):
    # Behaves like: result = yield from sub_iterable; return result
    it = iter(sub_iterable)
    try:
        value = next(it)
    except StopIteration as stop:
        return stop.value
    while True:
        try:
            sent = yield value
        except GeneratorExit:
            close = getattr(it, "close", None)
            if close is not None:
                close()
            raise
        except BaseException:
            throw = getattr(it, "throw", None)
            if throw is None:
                raise
            try:
                value = throw(*sys.exc_info())
            except StopIteration as stop:
                return stop.value
        else:
            try:
                value = next(it) if sent is None else it.send(sent)
            except StopIteration as stop:
                return stop.value

def echo():
    # Yields what it receives, upper-cased; returns how many it saw
    seen = 0
    received = yield "ready"
    while received != "stop":
        seen += 1
        try:
            received = yield received.upper()
        except KeyError:
            received = yield "caught KeyError"
    return seen

def run(make_outer):
    log = []
    g = make_outer()
    log.append(next(g))
    log.append(g.send("hi"))
    log.append(g.throw(KeyError("k")))
    log.append(g.send("there"))
    try:
        g.send("stop")
    except StopIteration as stop:
        log.append(f"returned {stop.value}")
    return log

def with_keyword():
    return (yield from echo())

def with_handwritten():
    # delegate() is itself a generator; no yield from anywhere in it
    return delegate(echo())

a = run(with_keyword)
b = run(with_handwritten)
print(a)
print(b)
print("same behaviour:", a == b)`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do generator pipelines stream data lazily?`,
    difficulty: "medium",
    seoDescription: `How Python generator pipelines stream data lazily: pull-based stages, flat memory, infinite sources, early stops, cleanup and trade-offs.`,
    description: `**Question presented to candidate:**
"Say you need to process a 50 GB log file: read lines, keep the errors, parse them, and count by type. How would you do it with generators, and why does that not run out of memory?"

**What a strong answer should cover:**
- A pipeline is a chain of generators, each consuming the previous one: \`count(parse(errors(read(f))))\`. Building the chain runs nothing; the final consumer *pulls* one item at a time through every stage.
- Memory is constant in the input size — only the current item (plus any per-stage state) is alive — versus a list-based version that materialises every intermediate stage.
- Laziness enables infinite sources and early termination: \`islice\`, \`any\`, \`next\` and \`break\` stop pulling, so upstream work that is not needed never happens.
- Trade-offs: generators are one-shot, errors surface when an item is pulled (not when the pipeline is built), cleanup needs \`close()\`/\`with\`, and per-item Python call overhead makes them slower than a vectorised or list approach for small data.
- Tools: generator functions, generator expressions, \`itertools\` (\`islice\`, \`chain\`, \`tee\`), and \`yield from\` for composing stages.

**Clarifying questions expected:**
- Does the output need to be ordered, or can stages run in parallel (which generators alone do not give you)?
- Will the data be read once or several times (one-shot iterators vs. re-reading the source)?

**Code / implementation expected:** Yes — a three- or four-stage generator pipeline over a file-like source, ideally showing that items flow one at a time.`,
    answer: `**Target Audience:** Developers who know basic generators and want to process big or endless data streams; candidates preparing for "how would you process a huge file?" questions.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it word for word.

## 1. Why This Even Matters — A Story First

Think of a sushi conveyor belt versus a buffet. At a buffet, the kitchen cooks *everything* first and lays it all out; you need a huge table and lots of food sits around. On a conveyor belt, the chef makes a plate only when there is room on the belt, each plate passes one station after another (rice, fish, sauce), and when you say "I am full", the chef simply stops — no food was made that nobody ate.

A generator pipeline is the conveyor belt. Each stage is a small generator that takes items from the stage before it, does one job, and passes items on. Nothing moves until the person at the end of the belt (your \`for\` loop, \`sum()\`, \`Counter()\`) asks for the next plate. That is why a generator pipeline can process a file far larger than your RAM, or an endless stream, with a few hundred bytes of overhead.

The idea was popularised by David Beazley's PyCon 2008 tutorial [Generator Tricks for Systems Programmers](https://www.dabeaz.com/generators/), which processes web-server logs exactly this way; this page is the interview-sized version.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big is the input, and does it fit in memory? | If it fits easily, a list or a dataframe may be simpler and faster; generators win when it does not. |
| Do we need the data more than once? | Generators are one-shot. A second pass means re-reading the source, \`itertools.tee\` (which buffers), or a list. |
| Is the source finite? | Infinite sources (sockets, \`tail -f\`, sensors) force a lazy design and a stopping rule. |
| Should a bad record stop the job or be skipped? | Errors appear mid-stream, after some output was already produced; decide the policy up front. |
| Is the work CPU-bound? | A generator pipeline runs in one thread; for heavy CPU work per item you would batch items out to processes. |

## 3. The Core Idea

📌 **Interview term: generator pipeline** — a chain of generators where each stage takes an iterable as input and yields transformed items: \`message(only_errors(read_lines(f)))\`. Each stage only knows about the stage right before it.

📌 **Interview term: lazy evaluation** — work is done only when a result is asked for. Calling a generator function creates a paused generator object and runs none of its body.

📌 **Interview term: pull-based (demand-driven) flow** — the consumer at the end calls \`next()\`; that request travels upstream through every stage to the source, and a single item travels back down. Nothing is pushed.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 250" role="img" aria-label="A four stage pipeline: the consumer pulls from map, map pulls from filter, filter pulls from read, and one item at a time flows back">
  <defs>
    <marker id="py13q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="80" rx="10"/>
  <text class="d-text" x="90" y="114" text-anchor="middle">Source</text>
  <text class="d-sub" x="90" y="138" text-anchor="middle">file, socket</text>
  <rect class="d-box" x="220" y="80" width="140" height="80" rx="10"/>
  <text class="d-text" x="290" y="114" text-anchor="middle">read_lines</text>
  <text class="d-sub" x="290" y="138" text-anchor="middle">one line</text>
  <rect class="d-box" x="420" y="80" width="140" height="80" rx="10"/>
  <text class="d-text" x="490" y="114" text-anchor="middle">only_errors</text>
  <text class="d-sub" x="490" y="138" text-anchor="middle">keep or skip</text>
  <rect class="d-box-accent" x="620" y="80" width="140" height="80" rx="10"/>
  <text class="d-text d-accent" x="690" y="114" text-anchor="middle">Consumer</text>
  <text class="d-sub" x="690" y="138" text-anchor="middle">for, sum, Counter</text>
  <path class="d-edge-dashed" d="M 620 60 L 220 60" marker-end="url(#py13q2-arrow)"/>
  <text class="d-sub" x="420" y="40" text-anchor="middle">next() requests travel upstream</text>
  <path class="d-edge" d="M 160 120 L 216 120" marker-end="url(#py13q2-arrow)"/>
  <path class="d-edge" d="M 360 120 L 416 120" marker-end="url(#py13q2-arrow)"/>
  <path class="d-edge-accent" d="M 560 120 L 616 120" marker-end="url(#py13q2-arrow)"/>
  <text class="d-sub d-accent" x="390" y="200" text-anchor="middle">items flow downstream one by one</text>
</svg>

Read it right to left for requests and left to right for data: the consumer asks \`only_errors\` for an item, \`only_errors\` asks \`read_lines\` (maybe several times, skipping lines that are not errors), \`read_lines\` reads one line from the file, and the first item that survives every stage arrives at the consumer.

### Watching it happen

Example 1 puts a \`print\` in every stage and pulls two results:

~~~python
pipeline = message(only_errors(read_lines(LOG)))
print("pipeline built, nothing read yet:", LOG.tell() == 0)
print("first :", next(pipeline))
print("second:", next(pipeline))
~~~

~~~text
pipeline built, nothing read yet: True
  read    'INFO start'
  read    'ERROR disk full'
  filter  kept 'ERROR disk full'
  map     -> 'disk full'
first : disk full
  read    'INFO tick'
  read    'ERROR net down'
  filter  kept 'ERROR net down'
  map     -> 'net down'
second: net down
~~~

The trace is **interleaved**: read, read, filter, map — then the result — then reading starts again. An eager version prints "stage 1 done" for the whole input before stage 2 starts. That interleaving *is* the streaming behaviour; if you can describe this trace in an interview, you have explained laziness.

## 4. Why Memory Stays Flat

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Eager lists keep every stage in memory at once while a lazy pipeline keeps one item per stage">
  <rect class="d-box-muted" x="30" y="30" width="320" height="210" rx="10"/>
  <text class="d-text" x="190" y="62" text-anchor="middle">Eager: list per stage</text>
  <rect class="d-box" x="60" y="90" width="260" height="34" rx="6"/>
  <text class="d-sub" x="190" y="112" text-anchor="middle">all N lines</text>
  <rect class="d-box" x="60" y="140" width="190" height="34" rx="6"/>
  <text class="d-sub" x="155" y="162" text-anchor="middle">all errors</text>
  <rect class="d-box" x="60" y="190" width="150" height="34" rx="6"/>
  <text class="d-sub" x="135" y="212" text-anchor="middle">all messages</text>
  <rect class="d-box-accent" x="410" y="30" width="320" height="210" rx="10"/>
  <text class="d-text d-accent" x="570" y="62" text-anchor="middle">Lazy: generator per stage</text>
  <rect class="d-box" x="440" y="90" width="80" height="34" rx="6"/>
  <text class="d-sub" x="480" y="112" text-anchor="middle">1 line</text>
  <rect class="d-box" x="440" y="140" width="80" height="34" rx="6"/>
  <text class="d-sub" x="480" y="162" text-anchor="middle">1 error</text>
  <rect class="d-box" x="440" y="190" width="80" height="34" rx="6"/>
  <text class="d-sub" x="480" y="212" text-anchor="middle">1 msg</text>
  <text class="d-sub" x="630" y="162" text-anchor="middle">memory stays flat</text>
</svg>

On the left, every stage builds a full list, so peak memory is the sum of all intermediate lists. On the right, each stage holds one item at a time.

Example 2 measures this with \`tracemalloc\` for \`N = 200_000\` squares. On our 3.11 run the peak was **472 bytes** for \`sum(x * x for x in range(N))\` and **8,023,688 bytes** for \`sum([x * x for x in range(N)])\`. The exact numbers vary by machine and version, so the example prints only the stable fact (\`eager list peak is over 50x the lazy peak: True\`). A generator object itself is small no matter how much it will produce: \`sys.getsizeof\` of \`(x for x in range(10**9))\` was 200 bytes on 3.11 and 192 on 3.12. The page on [the memory difference between a list comprehension and a generator expression](/interview-question/what-is-the-memory-difference-between-a-list-comprehension-and-a-generator-expre) goes deeper into those numbers.

📌 **Interview term: constant (O(1)) memory streaming** — memory use that does not grow with input size, because each stage keeps only the current item and a little state (a counter, a running sum, a small window).

The honest caveat: stages that need the *whole* input — sorting, a \`Counter\` with millions of distinct keys, \`sorted()\`, \`reversed()\` of a stream — break the constant-memory property at that stage. The pipeline is only as lazy as its greediest stage.

## 5. Infinite Sources and Early Termination

Because nothing runs ahead of demand, a pipeline can start from a source that never ends — as long as the consumer stops:

~~~python
first_five = list(itertools.islice(evens(squares(numbers())), 5))
print(first_five)
print("items pulled from the infinite source:", pulled)
~~~

~~~text
[0, 4, 16, 36, 64]
items pulled from the infinite source: 9
~~~

Only 9 numbers were ever produced (0 to 8), because the fifth even square is 64 = 8². \`any(x > 1000 for x in squares(numbers()))\` stops after 33 items, at 32² = 1024.

📌 **Interview term: short-circuiting consumer** — a consumer that can stop before the input ends: \`next()\`, \`any()\`, \`all()\`, \`itertools.islice\`, \`itertools.takewhile\`, a \`for\` loop with \`break\`. Combined with a lazy pipeline, it means upstream work that is not needed never happens.

## 6. Three Ways to Write a Stage

| Style | Example | Best for |
| :--- | :--- | :--- |
| Generator function | \`def only_errors(lines): for l in lines: if ...: yield l\` | Stages with state, several statements, \`try/finally\` cleanup |
| Generator expression | \`(l for l in lines if l.startswith("ERROR"))\` | One-line filters and maps |
| \`itertools\` / built-ins | \`map\`, \`filter\`, \`islice\`, \`chain.from_iterable\`, \`accumulate\` | Standard operations, implemented in C |

All three are lazy and combine freely. Example 2 also shows a tiny \`compose(source, *stages)\` helper that chains stages from a list, which is handy when the pipeline is built from configuration. To merge sub-streams inside a stage, use \`yield from\` (see [yield from delegation](/interview-question/how-does-yield-from-delegation-work)); for the standard building blocks see [the itertools module](/interview-question/what-is-the-itertools-module-used-for).

📌 **Interview term: stage (filter / map / sink)** — a *filter* stage drops items, a *map* stage transforms each item, and the *sink* (consumer) at the end turns the stream into a result or a side effect.

## 7. The Trade-offs (Example 3)

**One-shot iterators.** \`list(evens)\` gives \`[0, 2, 4]\` the first time and \`[]\` the second time. A generator does not rewind. If two consumers need the same stream, use \`itertools.tee\` (it buffers what one consumer has seen and the other has not — which costs memory if they drift apart) or re-create the pipeline from the source.

**Late errors.** \`parse(["1", "2", "oops", "4"])\` is built without error; the \`ValueError\` appears on the third pull, after \`1\` and \`2\` were already processed. Decide whether a stage should skip bad records (catch inside the stage and continue) or stop the job.

**Cleanup.** If the consumer breaks early, the source generator is left *suspended*, with its \`finally\` block not yet run. Calling \`close()\` on the outer generator, or wrapping it in \`contextlib.closing\`, runs the cleanup now: Example 3 prints \`src closed\` right after \`close()\`. In CPython the cleanup also happens as soon as the last reference to the generator disappears, but relying on that is fragile; for files, open them with \`with\` in the stage that reads them.

**Late binding in generator expressions.** A generator expression evaluates its *outermost* iterable immediately (on our run, \`(x for x in 1/0)\` raised \`ZeroDivisionError\` at once), but every other name — conditions, inner loops — is read only when items are pulled. Example 3 changes \`threshold\` after building the expression and gets \`[4]\`, not \`[3, 4]\`. This is the same mechanism as [the late-binding closure pitfall](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops).

**Speed.** Every item crosses one Python-level generator resume per stage. For small inputs that fit in memory, a list comprehension is often faster (on our 3.11 run, \`timeit\` gave 22.1 µs for \`sum([x*x for x in xs])\` and 27.9 µs for \`sum(x*x for x in xs)\` with 1,000 items); for numeric arrays, a vectorised library beats both. Generators win on memory and latency-to-first-result, not raw throughput.

## 8. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly these lines.

**Example 1 — a traced log pipeline, eager vs lazy:**

~~~text
pipeline built, nothing read yet: True
  read    'INFO start'
  read    'ERROR disk full'
  filter  kept 'ERROR disk full'
  map     -> 'disk full'
first : disk full
  read    'INFO tick'
  read    'ERROR net down'
  filter  kept 'ERROR net down'
  map     -> 'net down'
second: net down
  eager stage 1 done: 5 lines in memory
  eager stage 2 done: 3 errors in memory
eager result: ['disk full', 'net down']
[('disk full', 2), ('net down', 1)]
~~~

**Example 2 — infinite sources, early stop, memory:**

~~~text
[0, 4, 16, 36, 64]
items pulled from the infinite source: 9
found: True after pulling 33 items
eager list peak is over 50x the lazy peak: True
generator object under 300 bytes: True
[1, 5, 17, 37, 65]
~~~

**Example 3 — one-shot, late errors, cleanup, tee, late binding:**

~~~text
first pass : [0, 2, 4]
second pass: []
built without error
  got 1
  got 2
  failed while consuming: invalid literal for int() with base 10: 'oops'
  stopped at 4
  src closed
  first item: 0
  src2 closed
max: 5 min: 1
filtered with the late value: [4]
~~~

## 9. Lazy Pipeline vs Eager Lists

| | Eager lists | Lazy generator pipeline |
| :--- | :--- | :--- |
| Peak memory | Sum of all intermediate lists, O(N) | One item per stage, O(1) plus stage state |
| Time to first result | After the whole input passes stage 1 | After the first item passes all stages |
| Infinite input | Impossible | Fine, with a short-circuiting consumer |
| Re-iterate | Yes, lists can be read again | No, one-shot; rebuild or \`tee\` |
| Random access, \`len()\` | Yes | No |
| Error timing | At the stage that fails, before later stages run | When the bad item is pulled, mid-output |
| Raw speed on small data | Usually faster | Per-item generator overhead |

## Common Pitfalls

- **Accidentally materialising a stage**: one \`list(...)\`, \`sorted(...)\` or \`len(list(...))\` in the middle turns the whole pipeline eager again.
- **Consuming a generator twice**, e.g. checking \`if any(gen)\` and then looping over \`gen\` — the check ate items. Peek with \`next(gen, None)\` and put the item back with \`itertools.chain([first], gen)\`.
- **Expecting errors at build time.** Validation that must happen before any output is produced needs a separate pass.
- **Leaving files open** when the consumer stops early; use \`with\` inside the reading stage and \`close()\`/\`contextlib.closing\` on the pipeline.
- **Using \`tee\` when the consumers drift far apart** — it silently buffers everything in between, which is the memory you were trying to save.
- **Changing variables a generator expression depends on** before it is consumed (late binding).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Each stage is a generator that takes the previous stage as input, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(parse(errors(read(f))))</code> is a chain where the consumer pulls one item at a time through every stage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why memory stays flat:</strong> <span style="color:#f0e2c8;">Only the current item is alive in each stage, so memory does not grow with the input; an eager version stores every intermediate list. On our run 472 bytes versus about 8 MB for 200,000 items.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What laziness unlocks:</strong> <span style="color:#f0e2c8;">Infinite sources and early stopping: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> stop pulling, so upstream work that is not needed never runs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trade-offs:</strong> <span style="color:#f0e2c8;">Generators are one-shot, errors appear when an item is pulled, cleanup needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code>, and per-item overhead makes them slower than lists on small data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I would build it:</strong> <span style="color:#f0e2c8;">Generator functions for stages with state or cleanup, generator expressions for one-line maps and filters, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools</code> for standard steps, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> to merge sub-streams.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you build the pipeline but never iterate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing: no line is read and no stage body runs. Calling a generator function only creates a paused generator object. Example 1 checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOG.tell() == 0</code> after building it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do two consumers read the same stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.tee</code>, which buffers items one consumer has seen but the other has not, or rebuild the pipeline from the source. Do not touch the original iterator after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tee</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The consumer breaks out early. Is the file closed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not necessarily at that moment: the generators are suspended. Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> on the outer generator or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.closing</code>; that raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GeneratorExit</code> so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> blocks in the stages run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a generator pipeline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the data is small and fits in memory (lists are simpler and often faster), when you need random access or multiple passes, or when the work is numeric and a vectorised library fits better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you parallelise one stage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generators run in one thread. Batch items from the stream and hand the batches to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> for CPU-bound work, or to threads or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code> for I/O-bound work, then yield the results back into the pipeline.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **generator pipeline** | A chain of generators, each consuming the previous one |
| **lazy evaluation** | Work happens only when a result is requested |
| **pull-based (demand-driven) flow** | The consumer asks; requests go upstream, items come down one at a time |
| **constant (O(1)) memory streaming** | Memory does not grow with input size |
| **short-circuiting consumer** | \`next\`, \`any\`, \`islice\`, \`break\` — stops pulling early |
| **stage (filter / map / sink)** | Drop items / transform items / produce the final result |

---
**Conclusion:** A generator pipeline is a chain of small generators where the final consumer pulls items one at a time through every stage. Building it runs nothing; each \`next()\` travels upstream and a single item travels back, so memory stays flat no matter how large the input, infinite sources become usable, and short-circuiting consumers like \`islice\` and \`any\` stop all upstream work the moment they have enough. The price is that the stream is one-shot, errors appear mid-stream, cleanup needs \`close()\` or \`with\`, and per-item overhead makes it slower than lists on small data — a strong answer names both sides.`,
    examples: [
      {
        label: `A traced log pipeline: lazy stages vs eager lists`,
        code: `# A generator pipeline pulls one item at a time through every stage
import io

LOG = io.StringIO(
    "INFO start\\n"
    "ERROR disk full\\n"
    "INFO tick\\n"
    "ERROR net down\\n"
    "ERROR disk full\\n"
)

def read_lines(f):
    for line in f:
        print(f"  read    {line.strip()!r}")
        yield line.rstrip("\\n")

def only_errors(lines):
    for line in lines:
        if line.startswith("ERROR"):
            print(f"  filter  kept {line!r}")
            yield line

def message(lines):
    for line in lines:
        msg = line.split(" ", 1)[1]
        print(f"  map     -> {msg!r}")
        yield msg

# Building the pipeline runs nothing yet
pipeline = message(only_errors(read_lines(LOG)))
print("pipeline built, nothing read yet:", LOG.tell() == 0)

# Pull two results: each one travels through all stages before the next read
print("first :", next(pipeline))
print("second:", next(pipeline))

# Compare: the eager list version runs each stage to completion first
def eager(text):
    lines = [l for l in text.splitlines()]
    print("  eager stage 1 done:", len(lines), "lines in memory")
    errors = [l for l in lines if l.startswith("ERROR")]
    print("  eager stage 2 done:", len(errors), "errors in memory")
    return [l.split(" ", 1)[1] for l in errors]

print("eager result:", eager(LOG.getvalue())[:2])

# The same lazy pipeline with generator expressions
LOG.seek(0)
lines = (l.rstrip("\\n") for l in LOG)
errors = (l for l in lines if l.startswith("ERROR"))
msgs = (l.split(" ", 1)[1] for l in errors)
from collections import Counter
print(Counter(msgs).most_common())`,
      },
      {
        label: `Infinite sources, early termination and flat memory`,
        code: `# Laziness pays off: infinite sources, early stops, constant memory
import itertools
import sys
import tracemalloc

pulled = 0

def numbers():
    # An infinite source: it only works because consumers pull lazily
    global pulled
    n = 0
    while True:
        pulled += 1
        yield n
        n += 1

def squares(xs):
    for x in xs:
        yield x * x

def evens(xs):
    return (x for x in xs if x % 2 == 0)

first_five = list(itertools.islice(evens(squares(numbers())), 5))
print(first_five)
print("items pulled from the infinite source:", pulled)

# Stop at the first match: any() short-circuits the whole pipeline
pulled = 0
found = any(x > 1000 for x in squares(numbers()))
print("found:", found, "after pulling", pulled, "items")

# Memory: a generator pipeline holds one item at a time
N = 200_000

def peak_bytes(fn):
    tracemalloc.start()
    fn()
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    return peak

lazy_peak = peak_bytes(lambda: sum(x * x for x in range(N)))
eager_peak = peak_bytes(lambda: sum([x * x for x in range(N)]))
print("eager list peak is over 50x the lazy peak:", eager_peak > 50 * lazy_peak)

# A generator object is small no matter how much it will produce
gen = (x for x in range(10**9))
print("generator object under 300 bytes:", sys.getsizeof(gen) < 300)

# Stages can also be chained with a small helper
def compose(source, *stages):
    for stage in stages:
        source = stage(source)
    return source

result = compose(range(10), squares, evens, lambda xs: (x + 1 for x in xs))
print(list(result))`,
      },
      {
        label: `Pipeline gotchas: one-shot, late errors, cleanup, tee, late binding`,
        code: `# Pipeline gotchas: one-shot iterators, late errors, cleanup, tee

# 1) A generator can be consumed only once
evens = (n for n in range(6) if n % 2 == 0)
print("first pass :", list(evens))
print("second pass:", list(evens))

# 2) Errors appear when an item is pulled, not when the pipeline is built
def parse(rows):
    for r in rows:
        yield int(r)

stage = parse(["1", "2", "oops", "4"])
print("built without error")
try:
    for value in stage:
        print("  got", value)
except ValueError as e:
    print("  failed while consuming:", e)

# 3) A consumer that stops early: the source finally block still runs
def source(name):
    try:
        for i in range(100):
            yield i
    finally:
        print(f"  {name} closed")

def double(xs):
    for x in xs:
        yield 2 * x

pipe = double(source("src"))
for v in pipe:
    if v >= 4:
        break
print("  stopped at", v)
pipe.close()          # explicit close runs the cleanup now

# A with-block makes the close automatic
from contextlib import closing
with closing(double(source("src2"))) as p:
    print("  first item:", next(p))

# 4) Two consumers of one stream need itertools.tee (or a list)
import itertools
readings = iter([3, 1, 4, 1, 5])
a, b = itertools.tee(readings)
print("max:", max(a), "min:", min(b))

# 5) Lazy closures: a generator expression reads a variable when it runs
threshold = 2
big = (x for x in [1, 2, 3, 4] if x > threshold)
threshold = 3
print("filtered with the late value:", list(big))`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the itertools module used for?`,
    difficulty: "medium",
    seoDescription: `What Python itertools is for: lazy infinite, terminating and combinatoric iterators, groupby and tee gotchas, recipes and verified examples.`,
    description: `**Question presented to candidate:**
"What is \`itertools\` for? Name a few functions you actually use, and tell me about one that has a surprising behaviour."

**What a strong answer should cover:**
- \`itertools\` is a standard-library module of fast, memory-efficient building blocks that take iterables and return **lazy iterators**; they are implemented in C and compose into pipelines.
- The three families: infinite iterators (\`count\`, \`cycle\`, \`repeat\`), iterators that stop on the shortest input (\`chain\`, \`islice\`, \`accumulate\`, \`compress\`, \`takewhile\`, \`dropwhile\`, \`groupby\`, \`starmap\`, \`zip_longest\`, \`pairwise\`, \`tee\`), and combinatoric iterators (\`product\`, \`permutations\`, \`combinations\`, \`combinations_with_replacement\`).
- The classic gotchas: \`groupby\` only groups *consecutive* equal keys (sort first) and its groups are invalidated when you advance; \`tee\` buffers and the original iterator must not be used afterwards; infinite iterators need a bound.
- Version facts that come up: \`pairwise\` is new in 3.10, \`batched\` in 3.12 (with \`strict=\` in 3.13); before that people used the documented recipes.
- When to use it: replacing nested loops (\`product\`), slicing streams (\`islice\`), flattening (\`chain.from_iterable\`), running totals (\`accumulate\`), windows and batches.

**Code / implementation expected:** Optional — a couple of one-liners (e.g. \`groupby\` after \`sorted\`, \`islice\` on a generator, \`chain.from_iterable\` to flatten).`,
    answer: `**Target Audience:** Python developers who loop a lot and want shorter, faster, lazier loops; candidates who expect "name some itertools functions" in a screen.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the \`batched\` example was run on CPython 3.13.16 and 3.12.3.

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it word for word.

## 1. Why This Even Matters — A Story First

A carpenter could cut every joint by hand with a saw and a chisel. Or they could open the toolbox and take out a mitre saw, a dowel jig and a clamp — tools made for exactly the cuts that come up again and again. The joints are the same; the work is faster, cleaner, and less likely to go wrong.

\`itertools\` is that toolbox for loops. Almost every program has loops that "take the first N", "go over these three lists one after another", "pair each item with the next", "group equal neighbours", "try every combination". You can hand-write each one with indexes and temporary lists, or you can use a tested, C-implemented tool that does it lazily, in one line, without building intermediate lists.

## 2. The Core Idea

📌 **Interview term: itertools** — a standard-library module of functions that take iterables and return **iterators**. The [official documentation](https://docs.python.org/3/library/itertools.html) describes them as fast, memory-efficient tools that form an "iterator algebra" — small pieces you combine into bigger ones.

📌 **Interview term: lazy iterator** — an object that produces the next value only when asked (\`next()\`), keeping no list of results. Every \`itertools\` function returns one; \`list(...)\` is how you force the values out. Example 1 ends with \`accumulate 1 3 6\`: a type name and three values pulled one at a time from an *infinite* running total.

If "iterable" versus "iterator" is fuzzy, see [the difference between an iterable and an iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator) first.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="The three families of itertools functions: infinite, terminating and combinatoric">
  <rect class="d-box" x="20" y="30" width="220" height="190" rx="10"/>
  <text class="d-text" x="130" y="62" text-anchor="middle">Infinite</text>
  <text class="d-sub" x="130" y="100" text-anchor="middle">count</text>
  <text class="d-sub" x="130" y="126" text-anchor="middle">cycle</text>
  <text class="d-sub" x="130" y="152" text-anchor="middle">repeat</text>
  <text class="d-sub" x="130" y="192" text-anchor="middle">need a bound</text>
  <rect class="d-box-accent" x="270" y="30" width="220" height="190" rx="10"/>
  <text class="d-text d-accent" x="380" y="62" text-anchor="middle">Terminating</text>
  <text class="d-sub" x="380" y="100" text-anchor="middle">chain, islice, accumulate</text>
  <text class="d-sub" x="380" y="126" text-anchor="middle">takewhile, dropwhile</text>
  <text class="d-sub" x="380" y="152" text-anchor="middle">groupby, pairwise, tee</text>
  <text class="d-sub" x="380" y="192" text-anchor="middle">stop with the input</text>
  <rect class="d-box" x="520" y="30" width="220" height="190" rx="10"/>
  <text class="d-text" x="630" y="62" text-anchor="middle">Combinatoric</text>
  <text class="d-sub" x="630" y="100" text-anchor="middle">product</text>
  <text class="d-sub" x="630" y="126" text-anchor="middle">permutations</text>
  <text class="d-sub" x="630" y="152" text-anchor="middle">combinations</text>
  <text class="d-sub" x="630" y="192" text-anchor="middle">grow very fast</text>
</svg>

The three boxes are the three families the docs use. Infinite iterators never end on their own, so you always pair them with something that stops (\`islice\`, \`zip\`, \`takewhile\`). Terminating iterators end when their input ends. Combinatoric iterators generate arrangements whose count grows very quickly with input size.

## 3. Family 1 — Infinite Iterators

~~~python
print(list(islice(count(10, 5), 4)))  # [10, 15, 20, 25]
print(list(islice(cycle("AB"), 5)))  # ['A', 'B', 'A', 'B', 'A']
print(list(repeat("x", 3)))  # ['x', 'x', 'x']
print(list(zip(count(1), ["a", "b", "c"])))  # [(1, 'a'), (2, 'b'), (3, 'c')]
~~~

- \`count(start, step)\` — an endless counter; with \`zip\` it acts like \`enumerate\` with any start and step (for the built-ins see [enumerate and zip](/interview-question/what-do-enumerate-and-zip-do)).
- \`cycle(iterable)\` — repeats the items forever. It **saves a copy** of each item it has seen, so cycling a huge one-shot iterator costs memory.
- \`repeat(x, n)\` — the same object \`n\` times (or forever). Common as a constant argument: \`map(pow, range(5), repeat(2))\`.

## 4. Family 2 — Iterators That Stop With Their Input

| Function | What it does | Example 1 result |
| :--- | :--- | :--- |
| \`chain(a, b, ...)\` | One stream from several iterables, in order | \`[1, 2, 3, 4, '5', '6']\` |
| \`chain.from_iterable(xs)\` | Same, from an iterable of iterables — the standard one-level flatten | \`[1, 2, 3]\` |
| \`islice(it, start, stop, step)\` | Slicing for any iterator, without indexes | \`[2, 5, 8, 11]\` |
| \`accumulate(it, func, initial=)\` | Running totals, or a running anything | \`[1, 3, 6, 10]\`, running max \`[3, 3, 4, 4, 5]\` |
| \`compress(data, selectors)\` | Keep items whose selector is truthy | \`['A', 'C', 'E']\` |
| \`takewhile(pred, it)\` | Items while the predicate holds, then stop | \`[1, 4]\` |
| \`dropwhile(pred, it)\` | Skip while the predicate holds, then yield everything | \`[6, 3, 8, 2]\` |
| \`filterfalse(pred, it)\` | The opposite of \`filter\` | \`[4, 6, 8, 2]\` |
| \`starmap(func, it)\` | \`func(*args)\` for each tuple | \`[8, 9, 1]\` |
| \`zip_longest(a, b, fillvalue=)\` | \`zip\` that pads the shorter input | \`[('a', 1), ('b', '-'), ('c', '-')]\` |
| \`pairwise(it)\` | Overlapping neighbours \`(a, b), (b, c), ...\` | \`[(1, 4), (4, 9), (9, 16)]\` |
| \`groupby(it, key)\` | Runs of consecutive items with the same key | see Section 5 |
| \`tee(it, n)\` | \`n\` independent iterators over one stream | see Section 5 |

Two notes that make good interview points:

- **\`takewhile\` vs \`dropwhile\` vs \`filter\`.** \`takewhile\` stops for good at the first failure (\`8\` after \`6, 3\` is never reached), \`dropwhile\` only skips a *prefix*, and \`filter\` tests every item. On \`[1, 4, 6, 3, 8, 2]\` with \`x < 5\` they give \`[1, 4]\`, \`[6, 3, 8, 2]\` and \`[1, 4, 3, 2]\`.
- **\`islice\` never supports negative indexes**, because a stream does not know where it ends. It also *consumes* what it skips.

\`pairwise\` is new in Python 3.10 ([Educative summary](https://www.educative.io/answers/what-is-the-itertoolspairwise-method-in-python); the 3.11 interpreter used here has it; we could not open the official docs page from this environment). The neighbour-difference idiom \`[b - a for a, b in pairwise(temps)]\` gives \`[2, -1, 4]\` with no index arithmetic.

📌 **Interview term: accumulate** — yields every intermediate result of a left fold; it is to [\`functools.reduce\`](/interview-question/how-does-functools-reduce-fold-a-sequence) what a bank statement is to the final balance. With \`initial=10\` the starting value is yielded first: \`[10, 10, 20, 60]\`.

## 5. The Two Functions With Sharp Edges

### groupby groups consecutive items only

📌 **Interview term: groupby** — yields \`(key, group_iterator)\` pairs, starting a new group every time the key *changes*. It does not collect equal keys from across the whole input.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="groupby on unsorted input makes two separate a groups, on sorted input it makes one a group">
  <text class="d-text" x="30" y="40">unsorted input</text>
  <rect class="d-box" x="30" y="60" width="200" height="50" rx="8"/>
  <text class="d-sub" x="130" y="90" text-anchor="middle">a: apple, avocado</text>
  <rect class="d-box" x="280" y="60" width="200" height="50" rx="8"/>
  <text class="d-sub" x="380" y="90" text-anchor="middle">b: banana, blueberry</text>
  <rect class="d-box-muted" x="530" y="60" width="200" height="50" rx="8"/>
  <text class="d-sub" x="630" y="90" text-anchor="middle">a again: apricot</text>
  <text class="d-text" x="30" y="160">sorted by the same key first</text>
  <rect class="d-box-accent" x="30" y="180" width="330" height="50" rx="8"/>
  <text class="d-sub d-accent" x="195" y="210" text-anchor="middle">a: apple, avocado, apricot</text>
  <rect class="d-box" x="410" y="180" width="200" height="50" rx="8"/>
  <text class="d-sub" x="510" y="210" text-anchor="middle">b: banana, blueberry</text>
</svg>

The top row is \`groupby\` on the input as given: \`apricot\` starts a second \`a\` group because \`banana\` and \`blueberry\` came between. The bottom row sorts by the same key first, which is what you almost always want for a SQL-style \`GROUP BY\` (see [sorting with a custom key](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort)).

~~~text
[('a', ['apple', 'avocado']), ('b', ['banana', 'blueberry']), ('a', ['apricot'])]
{'a': ['apple', 'avocado', 'apricot'], 'b': ['banana', 'blueberry']}
~~~

The second edge: each group is a *view* into the same underlying iterator. When \`groupby\` moves on to the next key, the previous group is used up. \`list(groupby("aabbb"))\` collects the keys first, and every group is then empty: \`[('a', []), ('b', [])]\`. Consume each group (for example \`list(g)\`) before advancing.

The flip side of "consecutive only" is useful: run-length encoding is one line, \`[(ch, len(list(g))) for ch, g in groupby("aaabccdddd")]\` → \`[('a', 3), ('b', 1), ('c', 2), ('d', 4)]\`. If you only need counts across the whole input, \`collections.Counter\` is simpler.

### tee buffers, and the original is off limits

📌 **Interview term: tee** — splits one iterator into \`n\` independent iterators. Internally it keeps a buffer of items one copy has produced and another has not yet consumed.

Two rules: after calling \`tee\`, do not use the original iterator (in Example 2, \`next(src2)\` steals \`'a'\`, and both copies then start at \`'b'\`), and if one copy runs far ahead of the other, the buffer grows to hold everything between them — at that point \`list()\` is cheaper.

## 6. Family 3 — Combinatoric Iterators

~~~python
print(list(product("ab", repeat=2)))  # [('a', 'a'), ('a', 'b'), ('b', 'a'), ('b', 'b')]
print(list(permutations([1, 2, 3], 2)))  # [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]
print(list(combinations("abcd", 2)))  # [('a', 'b'), ('a', 'c'), ('a', 'd'), ('b', 'c'), ('b', 'd'), ('c', 'd')]
print(list(combinations_with_replacement("ab", 2)))  # [('a', 'a'), ('a', 'b'), ('b', 'b')]
~~~

| Function | Order matters? | Repeats allowed? | Count for n items, length k |
| :--- | :--- | :--- | :--- |
| \`product(..., repeat=k)\` | Yes | Yes | n^k |
| \`permutations(it, k)\` | Yes | No | n! / (n-k)!  (\`math.perm\`) |
| \`combinations(it, k)\` | No | No | n! / (k! (n-k)!)  (\`math.comb\`) |
| \`combinations_with_replacement(it, k)\` | No | Yes | (n+k-1)! / (k! (n-1)!) |

Example 2 checks the counts for n = 10, k = 3: \`720 720\` and \`120 120\`. The outputs come in lexicographic order of input *positions*, and items are treated as unique by position, not by value. \`product(range(2), range(3))\` replaces two nested \`for\` loops.

📌 **Interview term: combinatorial explosion** — the counts above grow so fast that \`permutations(range(12))\` already has 479,001,600 tuples. Laziness means you can stop early, but iterating all of them is still slow.

## 7. Recipes and Newer Additions

The docs end with an "Itertools Recipes" section: short functions built from the primitives. Example 3 implements five of them for 3.11 — \`batched\`, \`sliding_window\`, \`unique_everseen\`, \`first_true\`, \`nth\` — plus a flatten:

~~~python
def batched(iterable, n):
    it = iter(iterable)
    while batch := tuple(islice(it, n)):
        yield batch
~~~

\`batched\` became a real \`itertools\` function in Python 3.12, and 3.13 added a \`strict=True\` flag that raises \`ValueError\` when the last batch is short ([itertools docs](https://docs.python.org/3/library/itertools.html#itertools.batched)). We confirmed both by running the short script below with \`python3.13\` (3.13.16): it prints \`strict: batched(): incomplete batch\`, and on 3.12.3 the same \`strict=True\` call fails with \`TypeError: batched() takes at most 2 arguments (3 given)\`. It cannot run in the page (Pyodide 0.25.1 is CPython 3.11), which is why the in-page examples use the recipe.

~~~python
# Python 3.12+: itertools.batched, and the strict flag added in 3.13
from itertools import batched

print(list(batched("ABCDEFG", 3)))
print(list(batched(range(6), 2)))

try:
    list(batched("ABCDEFG", 3, strict=True))
except ValueError as e:
    print("strict:", e)
~~~

📌 **Interview term: itertools recipes** — the documented helper functions (windowing, batching, de-duplication, partitioning) built from the primitives. The third-party \`more-itertools\` package ships them, and many more, ready to import.

## 8. Verified: Running the Code

Examples 1-3 were saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly these lines, and every \`print(...)  # expected\` line passed as an in-page test. The \`batched\` script in Section 7 was run with \`python3.13\`.

**Example 1 — a tour of the infinite and terminating iterators:**

~~~text
[10, 15, 20, 25]
['A', 'B', 'A', 'B', 'A']
['x', 'x', 'x']
[(1, 'a'), (2, 'b'), (3, 'c')]
[1, 2, 3, 4, '5', '6']
[1, 2, 3]
[2, 5, 8, 11]
[1, 3, 6, 10]
[3, 3, 4, 4, 5]
[10, 10, 20, 60]
['A', 'C', 'E']
[1, 4]
[6, 3, 8, 2]
[4, 6, 8, 2]
[8, 9, 1]
[('a', 1), ('b', '-'), ('c', '-')]
[(1, 4), (4, 9), (9, 16)]
[2, -1, 4]
accumulate 1 3 6
~~~

**Example 2 — groupby, tee and the combinatorics:**

~~~text
[('a', ['apple', 'avocado']), ('b', ['banana', 'blueberry']), ('a', ['apricot'])]
{'a': ['apple', 'avocado', 'apricot'], 'b': ['banana', 'blueberry']}
[('a', 3), ('b', 1), ('c', 2), ('d', 4)]
[('a', []), ('b', [])]
[0, 1, 2, 3, 4] [0, 1, 2, 3, 4]
['b', 'c'] ['b', 'c']
[('a', 'a'), ('a', 'b'), ('b', 'a'), ('b', 'b')]
[(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]
[('a', 'b'), ('a', 'c'), ('a', 'd'), ('b', 'c'), ('b', 'd'), ('c', 'd')]
[('a', 'a'), ('a', 'b'), ('b', 'b')]
720 720
120 120
[(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)]
~~~

**Example 3 — recipes written for Python 3.11:**

~~~text
[('A', 'B', 'C'), ('D', 'E', 'F'), ('G',)]
[(1, 2, 3), (2, 3, 4), (3, 4, 5)]
['A', 'B', 'C', 'D']
['a', 'B']
[1, 2, 3, 4, 5]
7
105
[11.0, 12.0, 15.0]
[(0, 1, 2, 3), (4, 5, 6, 7)]
['line 1', 'line 2', 'line 3']
slicing a generator: 'generator' object is not subscriptable
~~~

**The Section 7 script — \`itertools.batched\` on Python 3.13.16:**

~~~text
[('A', 'B', 'C'), ('D', 'E', 'F'), ('G',)]
[(0, 1), (2, 3), (4, 5)]
strict: batched(): incomplete batch
~~~

## 9. itertools vs the Hand-Written Loop

| Task | Hand-written | itertools |
| :--- | :--- | :--- |
| First 10 items of a generator | counter + \`break\` | \`islice(gen, 10)\` |
| Flatten a list of lists | nested loop + \`append\` | \`chain.from_iterable(xs)\` |
| All (row, col) pairs | two nested loops | \`product(rows, cols)\` |
| Neighbour pairs | \`for i in range(len(xs) - 1)\` | \`pairwise(xs)\` |
| Running total | variable + loop | \`accumulate(xs)\` |
| Group sorted records | dict of lists | \`groupby(sorted(xs, key=k), key=k)\` |

The \`itertools\` side works on *any* iterable, including generators and files that cannot be indexed (Example 3: slicing a generator gives \`'generator' object is not subscriptable\`), and builds no intermediate lists. That is why these functions are the standard building blocks of [generator pipelines](/interview-question/how-do-generator-pipelines-stream-data-lazily).

## Common Pitfalls

- **\`groupby\` on unsorted data**, producing the same key several times. Sort by the same key first, or use a \`dict\`/\`Counter\` if you do not need streaming.
- **Advancing \`groupby\` before consuming a group** — the group is then empty.
- **Unbounded infinite iterators**: \`list(count())\` or \`list(cycle(x))\` never returns. Always pair them with \`islice\`, \`zip\` or \`takewhile\`.
- **Re-using an iterator after \`tee\`**, or expecting an \`itertools\` result to be reusable: every result is a one-shot iterator.
- **\`takewhile\` when you meant \`filter\`** — it stops at the first failing item.
- **Using \`batched\` or \`strict=\` on an older interpreter** — \`batched\` needs 3.12, \`strict\` needs 3.13; use the recipe otherwise.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools</code> is the standard-library toolbox of fast, C-implemented functions that take iterables and return lazy iterators, so loops become composable one-liners that build no intermediate lists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three families:</strong> <span style="color:#f0e2c8;">Infinite: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cycle</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repeat</code>. Terminating: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chain</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accumulate</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takewhile</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupby</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pairwise</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tee</code>. Combinatoric: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">product</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">permutations</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combinations</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What I use daily:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice</code> to take the first N of a generator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chain.from_iterable</code> to flatten, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">product</code> instead of nested loops, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accumulate</code> for running totals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pairwise</code> for neighbour differences.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotcha to mention:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupby</code> only groups consecutive equal keys, so sort by the same key first, and each group is invalidated once you advance to the next key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versions:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pairwise</code> arrived in 3.10 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">batched</code> in 3.12, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=</code> in 3.13; on older versions I use the documented recipes or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">more-itertools</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">groupby</code> give the same key twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it starts a new group whenever the key changes between neighbours. The input was not sorted by that key. Sort with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> function first, or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of lists or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you take a slice of a generator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice(gen, start, stop, step)</code>. Generators are not subscriptable, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice</code> has no negative indexes because a stream does not know its length. It consumes the skipped items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">chain</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">chain.from_iterable</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chain(a, b, c)</code> takes the iterables as separate arguments; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chain.from_iterable(xs)</code> takes one iterable of iterables and reads it lazily, which also works when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xs</code> is itself a generator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tee</code> cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps a buffer of items that one copy has produced and another has not consumed. If the copies stay close, it is cheap; if one runs to the end first, the buffer holds everything, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code> would be better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many items does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">permutations(range(10), 3)</code> produce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">10 * 9 * 8 = 720, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.perm(10, 3)</code> also gives. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combinations(range(10), 3)</code> gives 120, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.comb(10, 3)</code>. Order matters for permutations, not for combinations.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **itertools** | Standard module of fast, lazy iterator building blocks |
| **lazy iterator** | Produces the next value only when asked; keeps no result list |
| **accumulate** | Every intermediate result of a fold, such as running totals |
| **groupby** | Groups runs of consecutive items that share a key |
| **tee** | Several independent iterators over one stream, backed by a buffer |
| **combinatorial explosion** | Product, permutation and combination counts grow extremely fast |
| **itertools recipes** | Documented helpers built from the primitives (batched, sliding_window, ...) |

---
**Conclusion:** \`itertools\` is the standard library's toolbox for loops: lazy, C-implemented iterators in three families — infinite (\`count\`, \`cycle\`, \`repeat\`), terminating (\`chain\`, \`islice\`, \`accumulate\`, \`takewhile\`, \`groupby\`, \`pairwise\`, \`tee\`...) and combinatoric (\`product\`, \`permutations\`, \`combinations\`). They replace index arithmetic and nested loops with one-liners that work on any iterable and never build intermediate lists. A strong answer names a few you really use, then shows depth with the sharp edges: \`groupby\` only groups consecutive keys and invalidates old groups, \`tee\` buffers and owns the original iterator, infinite iterators need a bound, and \`pairwise\` (3.10) and \`batched\` (3.12) are recent additions.`,
    examples: [
      {
        label: `A tour of itertools: infinite and terminating iterators`,
        code: `# A tour of itertools: every result is a lazy iterator
from itertools import (count, cycle, repeat, islice, chain, accumulate,
                       compress, takewhile, dropwhile, filterfalse,
                       starmap, zip_longest, pairwise)
import operator

# Infinite iterators: always bound them with islice, zip or takewhile
print(list(islice(count(10, 5), 4)))  # [10, 15, 20, 25]
print(list(islice(cycle("AB"), 5)))  # ['A', 'B', 'A', 'B', 'A']
print(list(repeat("x", 3)))  # ['x', 'x', 'x']
print(list(zip(count(1), ["a", "b", "c"])))  # [(1, 'a'), (2, 'b'), (3, 'c')]

# Joining and slicing
print(list(chain([1, 2], (3, 4), "56")))  # [1, 2, 3, 4, '5', '6']
print(list(chain.from_iterable([[1, 2], [3], []])))  # [1, 2, 3]
print(list(islice(range(100), 2, 12, 3)))  # [2, 5, 8, 11]

# Running totals and other folds that keep every step
print(list(accumulate([1, 2, 3, 4])))  # [1, 3, 6, 10]
print(list(accumulate([3, 1, 4, 1, 5], max)))  # [3, 3, 4, 4, 5]
print(list(accumulate([1, 2, 3], operator.mul, initial=10)))  # [10, 10, 20, 60]

# Filtering
data = [1, 4, 6, 3, 8, 2]
print(list(compress("ABCDEF", [1, 0, 1, 0, 1, 0])))  # ['A', 'C', 'E']
print(list(takewhile(lambda x: x < 5, data)))  # [1, 4]
print(list(dropwhile(lambda x: x < 5, data)))  # [6, 3, 8, 2]
print(list(filterfalse(lambda x: x % 2, data)))  # [4, 6, 8, 2]

# Mapping and pairing
print(list(starmap(pow, [(2, 3), (3, 2), (10, 0)])))  # [8, 9, 1]
print(list(zip_longest("abc", [1], fillvalue="-")))  # [('a', 1), ('b', '-'), ('c', '-')]
print(list(pairwise([1, 4, 9, 16])))  # [(1, 4), (4, 9), (9, 16)]

# Differences between neighbours, without indexes
temps = [20, 22, 21, 25]
print([b - a for a, b in pairwise(temps)])  # [2, -1, 4]

# They are lazy: nothing is computed until you ask
lazy = accumulate(count(1))
print(type(lazy).__name__, next(lazy), next(lazy), next(lazy))`,
      },
      {
        label: `groupby gotchas, tee, and the combinatoric iterators`,
        code: `# groupby, tee and the combinatoric iterators
from itertools import groupby, tee, product, permutations, combinations, combinations_with_replacement
from math import comb, perm

# groupby groups CONSECUTIVE equal keys only
words = ["apple", "avocado", "banana", "blueberry", "apricot"]
print([(k, list(g)) for k, g in groupby(words, key=lambda w: w[0])])

# Sort by the same key first to get one group per key
by_letter = sorted(words, key=lambda w: w[0])
print({k: list(g) for k, g in groupby(by_letter, key=lambda w: w[0])})

# Run-length encoding is the classic groupby use
print([(ch, len(list(g))) for ch, g in groupby("aaabccdddd")])  # [('a', 3), ('b', 1), ('c', 2), ('d', 4)]

# Gotcha: each group shares the underlying iterator
groups = list(groupby("aabbb"))
print([(k, list(g)) for k, g in groups])  # [('a', []), ('b', [])]

# tee: several independent iterators over one stream
source = iter(range(5))
left, right = tee(source, 2)
print(list(left), list(right))
# After tee, do not use the original iterator: it would steal items
src2 = iter("abc")
t1, t2 = tee(src2)
next(src2)
print(list(t1), list(t2))

# Combinatorics: lazy, in lexicographic order of input positions
print(list(product("ab", repeat=2)))  # [('a', 'a'), ('a', 'b'), ('b', 'a'), ('b', 'b')]
print(list(permutations([1, 2, 3], 2)))  # [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]
print(list(combinations("abcd", 2)))  # [('a', 'b'), ('a', 'c'), ('a', 'd'), ('b', 'c'), ('b', 'd'), ('c', 'd')]
print(list(combinations_with_replacement("ab", 2)))  # [('a', 'a'), ('a', 'b'), ('b', 'b')]

# Counts match the math module formulas
n, k = 10, 3
print(sum(1 for _ in permutations(range(n), k)), perm(n, k))  # 720 720
print(sum(1 for _ in combinations(range(n), k)), comb(n, k))  # 120 120

# product replaces nested loops
grid = [(r, c) for r, c in product(range(2), range(3))]
print(grid)`,
      },
      {
        label: `The itertools recipes written for Python 3.11`,
        code: `# Building your own tools from itertools: the classic recipes
from collections import deque
from itertools import islice, chain, groupby, tee, count
import operator

def batched(iterable, n):
    # Same idea as itertools.batched (3.12+), written for 3.11
    it = iter(iterable)
    while batch := tuple(islice(it, n)):
        yield batch

def sliding_window(iterable, n):
    it = iter(iterable)
    window = deque(islice(it, n - 1), maxlen=n)
    for x in it:
        window.append(x)
        yield tuple(window)

def unique_everseen(iterable, key=None):
    seen = set()
    for element in iterable:
        k = element if key is None else key(element)
        if k not in seen:
            seen.add(k)
            yield element

def flatten(list_of_lists):
    return chain.from_iterable(list_of_lists)

def first_true(iterable, default=None, pred=None):
    return next(filter(pred, iterable), default)

def nth(iterable, n, default=None):
    return next(islice(iterable, n, None), default)

print(list(batched("ABCDEFG", 3)))  # [('A', 'B', 'C'), ('D', 'E', 'F'), ('G',)]
print(list(sliding_window([1, 2, 3, 4, 5], 3)))  # [(1, 2, 3), (2, 3, 4), (3, 4, 5)]
print(list(unique_everseen("AAAABBBCCDAABBB")))  # ['A', 'B', 'C', 'D']
print(list(unique_everseen(["a", "B", "A", "b"], key=str.lower)))  # ['a', 'B']
print(list(flatten([[1, 2], [3], [4, 5]])))  # [1, 2, 3, 4, 5]
print(first_true([0, "", None, 7, 8]))  # 7
print(nth(count(100), 5))  # 105

# Moving average over a stream with sliding_window
prices = [10, 11, 12, 13, 20]
print([sum(w) / 3 for w in sliding_window(prices, 3)])  # [11.0, 12.0, 15.0]

# Batching an endless stream works because everything is lazy
print(list(islice(batched(count(), 4), 2)))  # [(0, 1, 2, 3), (4, 5, 6, 7)]

# Why the recipes beat slicing: islice works on any iterator
lines = (f"line {i}" for i in range(1, 1_000_000))
print(list(islice(lines, 3)))
try:
    lines[0:3]
except TypeError as e:
    print("slicing a generator:", e)`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What does the functools module offer?`,
    difficulty: "medium",
    seoDescription: `What Python functools offers: partial, wraps, reduce, lru_cache, cache, cached_property, total_ordering and singledispatch, with verified examples.`,
    description: `**Question presented to candidate:**
"Tell me about \`functools\`. Which parts of it do you actually use, and what problem does each one solve?"

**What a strong answer should cover:**
- \`functools\` holds **higher-order functions**: tools that take functions and return functions (or callable objects), for adapting, caching and dispatching.
- Adapting: \`partial\` / \`partialmethod\` freeze arguments; \`wraps\` (via \`update_wrapper\`) copies \`__name__\`, \`__doc__\` and sets \`__wrapped__\` on decorator wrappers; \`reduce\` folds a sequence; \`cmp_to_key\` adapts old compare functions for \`sorted\`.
- Caching: \`lru_cache(maxsize=...)\` memoises with LRU eviction and \`cache_info()\`; \`cache\` (3.9) is the unbounded version; \`cached_property\` (3.8) computes once per instance and stores the result in the instance \`__dict__\`.
- Classes and dispatch: \`total_ordering\` fills in missing comparison methods from \`__eq__\` plus one of them; \`singledispatch\` / \`singledispatchmethod\` choose an implementation by the type of the first argument.
- Trade-offs: cached arguments must be hashable, caches keep references alive (memory leaks on methods), \`cached_property\` needs a \`__dict__\`, \`partial\` is preferable to a \`lambda\` because it is introspectable and picklable.

**Code / implementation expected:** Optional — a \`partial\`, a \`wraps\`-based decorator, or an \`lru_cache\` with \`cache_info()\`.`,
    answer: `**Target Audience:** Python developers who write decorators, sort objects or cache expensive calls; candidates asked the open-ended "what is in functools?".
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it word for word.

## 1. Why This Even Matters — A Story First

A kitchen has its chefs (your functions) and its gadgets: a pre-set timer you only need to start (partial), a label maker that puts the right name on every container (wraps), a fridge that keeps yesterday's sauce so you do not cook it again (the caches), and a sorting station that sends each delivery to the right chef depending on what it is (single dispatch). None of the gadgets cooks anything. Each one changes *how* a chef is used.

That is \`functools\`: a module of tools that work **on functions**. Interviewers like the question because the answer shows whether you have written real decorators, real caches and real sort keys — and whether you know the hidden costs (hashable arguments, memory held by caches).

## 2. The Core Idea

📌 **Interview term: higher-order function** — a function that takes a function as an argument, returns a function, or both. The [functools documentation](https://docs.python.org/3/library/functools.html) introduces the module as "higher-order functions and operations on callable objects".

📌 **Interview term: callable** — anything you can call with \`()\`: functions, methods, classes, and objects with \`__call__\`. Many \`functools\` tools return callable *objects* rather than plain functions (\`partial\` objects, the \`_lru_cache_wrapper\` that \`@lru_cache\` returns).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="functools grouped into adapting functions, caching results, and classes plus dispatch">
  <rect class="d-box" x="20" y="30" width="220" height="200" rx="10"/>
  <text class="d-text" x="130" y="62" text-anchor="middle">Adapt functions</text>
  <text class="d-sub" x="130" y="100" text-anchor="middle">partial, partialmethod</text>
  <text class="d-sub" x="130" y="126" text-anchor="middle">wraps, update_wrapper</text>
  <text class="d-sub" x="130" y="152" text-anchor="middle">reduce</text>
  <text class="d-sub" x="130" y="178" text-anchor="middle">cmp_to_key</text>
  <rect class="d-box-accent" x="270" y="30" width="220" height="200" rx="10"/>
  <text class="d-text d-accent" x="380" y="62" text-anchor="middle">Cache results</text>
  <text class="d-sub" x="380" y="100" text-anchor="middle">lru_cache</text>
  <text class="d-sub" x="380" y="126" text-anchor="middle">cache</text>
  <text class="d-sub" x="380" y="152" text-anchor="middle">cached_property</text>
  <rect class="d-box" x="520" y="30" width="220" height="200" rx="10"/>
  <text class="d-text" x="630" y="62" text-anchor="middle">Classes and dispatch</text>
  <text class="d-sub" x="630" y="100" text-anchor="middle">total_ordering</text>
  <text class="d-sub" x="630" y="126" text-anchor="middle">singledispatch</text>
  <text class="d-sub" x="630" y="152" text-anchor="middle">singledispatchmethod</text>
</svg>

The three groups are how this page is organised: tools that adapt a function, tools that cache its results, and tools that help classes and type-based dispatch.

## 3. Adapting Functions

### partial and partialmethod

📌 **Interview term: partial application** — fixing some arguments of a function now and supplying the rest later. \`partial(power, exponent=2)\` returns a new callable that behaves like \`power(base, exponent=2)\`.

~~~python
square = partial(power, exponent=2)
print(square(5), cube(2))  # 25 8
print(square.func.__name__, square.args, square.keywords)  # power () {'exponent': 2}
parse_hex = partial(int, base=16)
~~~

Why not \`lambda b: power(b, 2)\`? A \`partial\` object can be inspected (\`.func\`, \`.args\`, \`.keywords\`), it has a useful \`repr\`, and it can be pickled when its function can — which matters when you send work to a process pool. A lambda is opaque, and on our run \`pickle.dumps(lambda x: x)\` raised \`PicklingError\`. \`partialmethod\` is the same idea for methods: \`turn_on = partialmethod(set_state, "on")\` creates a method that calls \`self.set_state("on")\`.

### wraps

📌 **Interview term: functools.wraps** — a decorator for the *wrapper* function inside your decorator. It copies \`__name__\`, \`__qualname__\`, \`__doc__\`, \`__module__\` and the annotations from the wrapped function, merges \`__dict__\`, and sets \`wrapper.__wrapped__\` to the original. Example 1 prints \`greet | Say hello. | greet\`. The full story is on [why to use functools.wraps](/interview-question/why-use-functools-wraps-when-writing-decorators); decorators themselves are covered in [what decorators are](/interview-question/what-are-decorators-in-python).

### reduce and cmp_to_key

\`reduce(function, iterable[, initial])\` folds a sequence into one value, left to right: \`reduce(operator.mul, [1, 2, 3, 4, 5])\` is \`120\`. It has its own page: [how functools.reduce folds a sequence](/interview-question/how-does-functools-reduce-fold-a-sequence).

📌 **Interview term: cmp_to_key** — turns an old-style comparison function \`cmp(a, b)\` (negative, zero or positive) into a \`key=\` object that \`sorted\`, \`min\`, \`max\` and \`heapq\` accept. Use it when the ordering is naturally pairwise ("shorter first, then alphabetical"); for most cases a tuple key such as \`key=lambda s: (len(s), s)\` is simpler and faster.

## 4. Caching Results

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="A call to an lru_cache function checks the cache first and only calls the real function on a miss">
  <defs>
    <marker id="py13q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="115" text-anchor="middle">fib(30)</text>
  <rect class="d-box-accent" x="260" y="80" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="106" text-anchor="middle">cache lookup</text>
  <text class="d-sub" x="360" y="126" text-anchor="middle">key built from args</text>
  <rect class="d-box" x="560" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="650" y="55" text-anchor="middle">hit: return value</text>
  <rect class="d-box-muted" x="560" y="140" width="180" height="60" rx="10"/>
  <text class="d-text" x="650" y="166" text-anchor="middle">miss: call fib</text>
  <text class="d-sub" x="650" y="186" text-anchor="middle">store, maybe evict</text>
  <path class="d-edge" d="M 170 110 L 256 110" marker-end="url(#py13q4-arrow)"/>
  <path class="d-edge-accent" d="M 460 95 L 556 55" marker-end="url(#py13q4-arrow)"/>
  <path class="d-edge-dashed" d="M 460 125 L 556 165" marker-end="url(#py13q4-arrow)"/>
</svg>

Every call builds a key from the arguments and checks the cache; a hit returns the stored value without running the function, a miss runs it, stores the result and — if the cache is full — evicts the least recently used entry.

📌 **Interview term: memoization** — caching a function's return value by its arguments so repeated calls with the same arguments are free. It only makes sense for **pure** functions: same inputs, same output, no side effects you need to repeat.

📌 **Interview term: lru_cache** — \`@lru_cache(maxsize=128, typed=False)\` memoises with a bounded size and **least-recently-used** eviction. \`maxsize=None\` means unbounded. The wrapper exposes \`cache_info()\` and \`cache_clear()\`.

~~~text
832040 computed with 31 real calls
CacheInfo(hits=28, misses=31, maxsize=None, currsize=31)
~~~

A naive recursive \`fib(30)\` makes 2,692,537 calls (counted on our run); with the cache it makes 31 real calls — one per distinct \`n\` from 0 to 30. With \`maxsize=2\`, the sequence \`1, 2, 1, 3, 2\` gives \`hits=1, misses=4\`: \`3\` evicted the least recently used key (\`2\`, because \`1\` had just been used), so \`2\` had to be computed again. Internals — the dictionary plus linked list, thread safety, \`typed=True\` — are on [how functools.lru_cache works](/interview-question/how-does-functools-lru-cache-work).

📌 **Interview term: functools.cache** — \`@cache\` is a shorter spelling of \`lru_cache(maxsize=None)\`, added in Python 3.9 ([functools docs](https://docs.python.org/3/library/functools.html#functools.cache)). With no eviction it never has to reorder entries, so it is a little simpler, but it also grows forever.

Arguments become dictionary keys, so they must be **hashable**: \`ways([1, 2])\` raises \`TypeError: unhashable type: 'list'\`.

### cached_property

📌 **Interview term: cached_property** — a decorator for a method that turns it into an attribute computed on first access and then stored in the instance \`__dict__\` under the same name. Added in Python 3.8 ([functools docs](https://docs.python.org/3/library/functools.html#functools.cached_property)).

~~~text
  summing rows
12 12
stored in __dict__: {'rows': [3, 4, 5], 'total': 12}
~~~

It is a descriptor without \`__set__\`, so after the first access the instance attribute shadows it and later reads never call the method (see [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol)). \`del r.total\` removes the cached value and the next access recomputes. Differences from \`@property\` (see [the @property decorator](/interview-question/what-is-the-property-decorator)): the value can go stale, it can be assigned to, and it needs an instance \`__dict__\` — on a class with \`__slots__\` our run raised \`TypeError: No '__dict__' attribute on 'S' instance to cache 'v' property.\` The docs also note that Python 3.12 removed an undocumented lock that earlier versions held while computing the value.

## 5. Classes and Dispatch

### total_ordering

📌 **Interview term: total_ordering** — a class decorator: define \`__eq__\` and **one** of \`__lt__\`, \`__le__\`, \`__gt__\`, \`__ge__\`, and it adds the other three. Example 1's \`Version\` defines \`__eq__\` and \`__lt__\` and still supports \`>\`, \`>=\` and \`<=\`: \`Version("1.10.0") > Version("1.9.3")\` is \`True\` because the parts compare as integer tuples, not strings. The generated methods are slower than hand-written ones because each goes through the one you defined; for plain data classes, \`@dataclass(order=True)\` is an alternative (see [dataclasses](/interview-question/what-are-dataclasses)).

### singledispatch and singledispatchmethod

📌 **Interview term: single dispatch** — choosing which implementation of a function to run based on the **type of the first argument**. \`@singledispatch\` turns a function into a generic function; \`@describe.register\` adds implementations, either from a type annotation or \`register(int)\`.

~~~text
int 7 | list of 2 | something: 2.5
int True
~~~

Dispatch follows the class's MRO, so \`True\` uses the \`int\` implementation (\`bool\` is a subclass of \`int\`), and a type with no registration falls back to the base function. On 3.11 \`register\` also accepted a union annotation (\`x: int | float\`) in our run. \`singledispatchmethod\` does the same for methods, dispatching on the first argument *after* \`self\`: \`Formatter().fmt(3.14159)\` gives \`3.14\`. It is the standard library's answer to "overloading by type", without a chain of \`isinstance\` checks.

## 6. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly these lines, and every \`print(...)  # expected\` line passed as an in-page test.

**Example 1 — partial, partialmethod, reduce, wraps, total_ordering, cmp_to_key:**

~~~text
25 8
power () {'exponent': 2}
255 16
on
120
[2, 4, 6]
greet | Say hello. | greet
True True False
[v1.9, v1.10, v2.0]
['fig', 'kiwi', 'pear', 'apple']
~~~

**Example 2 — lru_cache, cache, cached_property, singledispatch:**

~~~text
832040 computed with 31 real calls
CacheInfo(hits=28, misses=31, maxsize=None, currsize=31)
  computing 1
  computing 2
  computing 3
  computing 2
CacheInfo(hits=1, misses=4, maxsize=2, currsize=2)
20365011074
TypeError: unhashable type: 'list'
  summing rows
12 12
stored in __dict__: {'rows': [3, 4, 5], 'total': 12}
  summing rows
12
int 7 | list of 2 | something: 2.5
int True
3.14 hi
~~~

## 7. Which Tool for Which Job

| You want to... | Use | Instead of |
| :--- | :--- | :--- |
| Pre-fill arguments | \`partial\` | A \`lambda\` (opaque, not picklable) |
| Keep metadata on a decorator wrapper | \`@wraps(fn)\` | Copying \`__name__\` by hand |
| Cache a pure function | \`@lru_cache(maxsize=N)\` / \`@cache\` | A global dict |
| Compute an attribute once per object | \`@cached_property\` | \`@property\` + a private attribute |
| Get all comparisons from two methods | \`@total_ordering\` | Writing six dunder methods |
| Sort with a pairwise compare | \`cmp_to_key(cmp)\` | Python 2 style \`cmp=\` (removed) |
| Branch on argument type | \`@singledispatch\` | An \`isinstance\` ladder |
| Fold to one value | \`reduce\` | Usually a loop, \`sum\`, \`max\`, \`math.prod\` |

## 8. Edge Cases

- **\`lru_cache\` on a method** caches on \`self\` too, so every instance stays alive while it is in the cache — a memory leak for short-lived objects (our run: a \`weakref\` to a deleted instance was still alive after \`gc.collect()\`). Prefer \`cached_property\`, or a cache keyed on a stable id.
- **\`typed=True\`** keeps \`1\` and \`1.0\` as separate entries (our run: \`misses=2, currsize=2\`); by default they share one because \`1 == 1.0\` and they hash the same.
- **Keyword order matters for cache keys**: on our run \`f(a=1, b=2)\` then \`f(b=2, a=1)\` gave \`hits=0, misses=2\` — two entries for the same call.
- **Mutable return values from a cache** are shared: mutating a cached list changes what the next caller gets.
- **\`singledispatch\` only looks at the first argument**; for dispatch on several arguments you need a different design.

## Common Pitfalls

- **Forgetting \`@wraps\`** in a decorator: every decorated function is then called \`wrapper\` in tracebacks, docs and test reports.
- **Caching impure functions** (reading time, files or global state): the cache returns stale results.
- **Passing unhashable arguments** (lists, dicts) to a cached function: \`TypeError: unhashable type\`.
- **Unbounded \`@cache\` in a long-running process** with many distinct arguments — it grows forever.
- **Expecting \`cached_property\` to update** when the data it was computed from changes; delete the attribute to invalidate it.
- **Defining only \`__lt__\` with \`total_ordering\`** and no \`__eq__\` — the decorator assumes a consistent \`__eq__\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools</code> is a module of higher-order tools: functions that take or return functions, for adapting them, caching their results and dispatching on types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Adapting:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> freezes arguments and stays picklable and introspectable, unlike a lambda; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wraps</code> keeps the name, docstring and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code> on decorator wrappers; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> folds a sequence.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Caching:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache(maxsize=N)</code> memoises with LRU eviction and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_info()</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache</code> is the unbounded form; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code> computes once and stores the value in the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Classes and dispatch:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total_ordering</code> derives the other comparisons from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> plus one; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">singledispatch</code> picks an implementation by the type of the first argument, following the MRO.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The costs:</strong> <span style="color:#f0e2c8;">Cached arguments must be hashable, caches keep references alive, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> on methods can leak instances, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code> fails on classes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">partial</code> instead of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lambda</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> object exposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.func</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.args</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.keywords</code>, has a readable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code>, and can be pickled if its function can, which matters for process pools. A lambda is opaque and not picklable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cache</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache(maxsize=None)</code>: no size limit and no eviction. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> with a number keeps at most that many entries and drops the least recently used one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cached_property</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">property</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code> runs the getter on every access. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code> runs it once, then stores the value in the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, which shadows the descriptor; it can go stale and needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">total_ordering</code> need from you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> and one of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__lt__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__le__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__gt__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__ge__</code>. It fills in the rest, at some speed cost because each generated method calls yours.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">describe(True)</code> pick the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> implementation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">singledispatch</code> walks the MRO of the argument type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> is a subclass of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so without a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> registration the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> one is the closest match.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **higher-order function** | Takes or returns functions |
| **callable** | Anything you can call with \`()\` |
| **partial application** | Fix some arguments now, pass the rest later |
| **functools.wraps** | Copies name, docstring and \`__wrapped__\` onto a decorator wrapper |
| **cmp_to_key** | Adapts a compare function to a \`key=\` for sorting |
| **memoization** | Caching results by argument for pure functions |
| **lru_cache** | Bounded memoization with least-recently-used eviction |
| **functools.cache** | Unbounded memoization (3.9+) |
| **cached_property** | Compute an attribute once, store it in the instance \`__dict__\` (3.8+) |
| **total_ordering** | Fill in comparison methods from \`__eq__\` and one more |
| **single dispatch** | Choose an implementation by the type of the first argument |

---
**Conclusion:** \`functools\` is the standard library's kit of higher-order tools: \`partial\` and \`wraps\` adapt functions, \`reduce\` and \`cmp_to_key\` bridge to folding and old-style comparisons, \`lru_cache\`, \`cache\` and \`cached_property\` memoise results, and \`total_ordering\` and \`singledispatch\` cut boilerplate in classes and type-based branching. A strong answer picks the three or four you actually use, explains the problem each solves, and adds the costs that catch people out: cached arguments must be hashable, caches keep objects alive, \`cached_property\` needs a \`__dict__\`, and a forgotten \`@wraps\` hides the real function name.`,
    examples: [
      {
        label: `partial, partialmethod, reduce, wraps, total_ordering and cmp_to_key`,
        code: `# functools part 1: partial, reduce, wraps, total_ordering, cmp_to_key
from functools import partial, partialmethod, reduce, wraps, total_ordering, cmp_to_key
import operator

# partial: freeze some arguments now, supply the rest later
def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)
print(square(5), cube(2))  # 25 8
print(square.func.__name__, square.args, square.keywords)  # power () {'exponent': 2}
parse_hex = partial(int, base=16)
print(parse_hex("ff"), parse_hex("10"))  # 255 16

# partialmethod: the same idea for methods
class Light:
    def __init__(self):
        self.state = "off"
    def set_state(self, value):
        self.state = value
    turn_on = partialmethod(set_state, "on")

lamp = Light()
lamp.turn_on()
print(lamp.state)  # on

# reduce: fold a sequence into one value, left to right
print(reduce(operator.mul, [1, 2, 3, 4, 5]))  # 120
print(reduce(lambda acc, x: acc + [x * 2], [1, 2, 3], []))  # [2, 4, 6]

# wraps: keep the wrapped function name and docstring on a decorator
def logged(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

@logged
def greet(name):
    "Say hello."
    return f"hello {name}"

print(greet.__name__, "|", greet.__doc__, "|", greet.__wrapped__.__name__)  # greet | Say hello. | greet

# total_ordering: write __eq__ and one comparison, get the other three
@total_ordering
class Version:
    def __init__(self, text):
        self.parts = tuple(int(p) for p in text.split("."))
    def __eq__(self, other):
        return self.parts == other.parts
    def __lt__(self, other):
        return self.parts < other.parts
    def __repr__(self):
        return "v" + ".".join(map(str, self.parts))

a, b = Version("1.10.0"), Version("1.9.3")
print(a > b, a >= b, a <= b)  # True True False
print(sorted([Version("2.0"), Version("1.10"), Version("1.9")]))  # [v1.9, v1.10, v2.0]

# cmp_to_key: use an old-style compare function as a sort key
def by_length_then_alpha(x, y):
    if len(x) != len(y):
        return len(x) - len(y)
    return (x > y) - (x < y)

print(sorted(["pear", "fig", "apple", "kiwi"], key=cmp_to_key(by_length_then_alpha)))  # ['fig', 'kiwi', 'pear', 'apple']`,
      },
      {
        label: `lru_cache, cache, cached_property and singledispatch`,
        code: `# functools part 2: caching and single dispatch
from functools import lru_cache, cache, cached_property, singledispatch, singledispatchmethod

calls = 0

@lru_cache(maxsize=None)
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(30), "computed with", calls, "real calls")
print(fib.cache_info())

# maxsize bounds the cache and evicts the least recently used entry
@lru_cache(maxsize=2)
def slow_square(x):
    print(f"  computing {x}")
    return x * x

for x in [1, 2, 1, 3, 2]:
    slow_square(x)
print(slow_square.cache_info())

# cache is lru_cache(maxsize=None) with a shorter name
@cache
def ways(n):
    return 1 if n <= 1 else ways(n - 1) + ways(n - 2)

print(ways(50))  # 20365011074

# Arguments must be hashable, because they become dictionary keys
try:
    ways([1, 2])
except TypeError as e:
    print("TypeError:", e)

# cached_property: compute once per instance, then it is a plain attribute
class Report:
    def __init__(self, rows):
        self.rows = rows
    @cached_property
    def total(self):
        print("  summing rows")
        return sum(self.rows)

r = Report([3, 4, 5])
print(r.total, r.total)
print("stored in __dict__:", r.__dict__)
del r.total               # invalidate: the next access recomputes
print(r.total)

# singledispatch: choose an implementation by the type of the first argument
@singledispatch
def describe(value):
    return f"something: {value!r}"

@describe.register
def _(value: int):
    return f"int {value}"

@describe.register
def _(value: list):
    return f"list of {len(value)}"

print(describe(7), "|", describe([1, 2]), "|", describe(2.5))  # int 7 | list of 2 | something: 2.5
# bool is a subclass of int, so it uses the int implementation
print(describe(True))  # int True

class Formatter:
    @singledispatchmethod
    def fmt(self, value):
        return str(value)
    @fmt.register
    def _(self, value: float):
        return f"{value:.2f}"

print(Formatter().fmt(3.14159), Formatter().fmt("hi"))  # 3.14 hi`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does functools.reduce fold a sequence?`,
    difficulty: "medium",
    seoDescription: `How functools.reduce folds a sequence in Python: accumulator, initializer, left vs right fold, empty input, real uses and when sum or a loop is better.`,
    description: `**Question presented to candidate:**
"What does \`functools.reduce\` do, step by step? What happens with an empty list, and when would you choose it over a loop or a built-in like \`sum\`?"

**What a strong answer should cover:**
- \`reduce(f, iterable[, initial])\` is a **left fold**: it keeps an accumulator and calls \`acc = f(acc, item)\` for each item, returning the final accumulator — \`reduce(f, [a, b, c])\` is \`f(f(a, b), c)\`.
- Without \`initial\`, the first item is the starting accumulator (so \`f\` runs n-1 times); with \`initial\`, \`f\` runs n times and \`initial\` also fixes the result type.
- Edge cases: an empty iterable with no initializer raises \`TypeError\`; a single item is returned without calling \`f\`; \`initial\` is positional only (a keyword raises \`TypeError\` on 3.11-3.13).
- Left fold means order matters for non-associative operations (\`reduce(sub, [1, 2, 3, 4])\` is \`-8\`); a right fold needs \`reversed\` and a flipped function.
- When to use it: composing functions, walking nested keys, merging or intersecting many collections. Prefer \`sum\`, \`math.prod\`, \`max\`, \`all\`, \`any\`, \`"".join\` or a plain loop when they fit — clearer and faster. It moved out of the built-ins into \`functools\` in Python 3.

**Code / implementation expected:** Optional — trace a small fold, or implement \`reduce\` with a loop.`,
    answer: `**Target Audience:** Developers meeting \`reduce\` for the first time, or coming from JavaScript \`Array.prototype.reduce\` or functional languages; candidates expected to trace a fold by hand.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the keyword-argument check was also run on 3.12.3 and 3.13.16.

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it word for word.

## 1. Why This Even Matters — A Story First

You are folding a long paper map. You take the first panel, fold the second onto it, then fold the third onto the stack you already have, and so on. At every step you are holding *one* thing — the folded stack so far — and adding the next panel to it. At the end you hold a single small square.

\`reduce\` does exactly that to a sequence. It holds one value (the **accumulator**), combines it with the next item using your function, and keeps going until the items run out. Adding numbers, multiplying them, merging dictionaries, composing functions — all are "fold the next piece onto what I have so far". Interviewers ask about it because it tests whether you can trace a computation precisely, and whether you know when *not* to use it.

## 2. The Core Idea

📌 **Interview term: fold (reduce)** — combining all items of a sequence into one value by repeatedly applying a two-argument function to an accumulator and the next item. Signature: \`functools.reduce(function, iterable[, initial])\`.

📌 **Interview term: accumulator** — the running value carried from one step to the next. The function's first parameter receives it, the second receives the current item, and the return value becomes the new accumulator.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="Left fold of 1, 2, 3, 4 with addition: the accumulator goes 1, 3, 6, 10">
  <defs>
    <marker id="py13q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="116" text-anchor="middle">acc = 1</text>
  <text class="d-sub" x="75" y="136" text-anchor="middle">first item</text>
  <rect class="d-box" x="220" y="90" width="110" height="60" rx="10"/>
  <text class="d-text" x="275" y="126" text-anchor="middle">acc = 3</text>
  <rect class="d-box" x="420" y="90" width="110" height="60" rx="10"/>
  <text class="d-text" x="475" y="126" text-anchor="middle">acc = 6</text>
  <rect class="d-box-accent" x="620" y="90" width="120" height="60" rx="10"/>
  <text class="d-text d-accent" x="680" y="116" text-anchor="middle">acc = 10</text>
  <text class="d-sub" x="680" y="136" text-anchor="middle">returned</text>
  <path class="d-edge" d="M 130 120 L 216 120" marker-end="url(#py13q5-arrow)"/>
  <path class="d-edge" d="M 330 120 L 416 120" marker-end="url(#py13q5-arrow)"/>
  <path class="d-edge-accent" d="M 530 120 L 616 120" marker-end="url(#py13q5-arrow)"/>
  <text class="d-sub" x="173" y="70" text-anchor="middle">f(1, 2)</text>
  <text class="d-sub" x="373" y="70" text-anchor="middle">f(3, 3)</text>
  <text class="d-sub" x="573" y="70" text-anchor="middle">f(6, 4)</text>
  <text class="d-sub" x="173" y="190" text-anchor="middle">item 2</text>
  <text class="d-sub" x="373" y="190" text-anchor="middle">item 3</text>
  <text class="d-sub" x="573" y="190" text-anchor="middle">item 4</text>
</svg>

The boxes are the accumulator after each step; the labels above the arrows are the calls \`reduce\` makes, and below them the item each call consumes. Example 1 prints the same trace:

~~~text
no initializer:
  f(1, 2) -> 3
  f(3, 3) -> 6
  f(6, 4) -> 10
result: 10
~~~

Four items, **three** calls: without an initializer, the first item *is* the starting accumulator. In general \`reduce(f, [a, b, c, d])\` is \`f(f(f(a, b), c), d)\`.

## 3. The Initializer

📌 **Interview term: initializer (initial value)** — the optional third argument. When given, it becomes the starting accumulator and \`f\` is called once per item:

~~~text
with initializer 100:
  f(100, 1) -> 101
  f(101, 2) -> 103
  f(103, 3) -> 106
  f(106, 4) -> 110
result: 110
~~~

The initializer does three jobs:

1. **Makes empty input safe.** \`reduce(operator.add, [], 0)\` is \`0\`; without it, \`reduce(operator.add, [])\` raises \`TypeError: reduce() of empty iterable with no initial value\` (same message on 3.11, 3.12 and 3.13 in our runs).
2. **Sets the result type.** Folding lists into \`[]\` gives a list (\`[1, 2, 3]\`); folding digits into \`0\` with \`acc * 10 + int(ch)\` turns \`"2024"\` into the integer \`2024\`. Without an initializer the accumulator would start as the string \`"2"\`.
3. **Gives the identity element** for the operation: \`0\` for \`+\`, \`1\` for \`*\`, \`{}\` for dict merging, \`set()\` for union.

📌 **Interview term: identity element** — a value that leaves others unchanged under the operation (\`x + 0 == x\`, \`x * 1 == x\`). It is the natural initializer, because then the result for an empty input is still correct.

The initializer is **positional only** in the C implementation that CPython uses: \`reduce(operator.add, [1, 2], initial=10)\` raised \`TypeError: reduce() takes no keyword arguments\` on 3.11, 3.12 and 3.13 in our runs. A Python Discourse thread [proposed allowing \`initial=\`](https://discuss.python.org/t/remove-positional-only-restriction-on-initial-parameter-of-reduce/68897); we did not confirm whether a later release adopted it, so do not rely on the keyword form.

With a single item and no initializer, \`f\` is never called: \`reduce(operator.add, [42])\` returns \`42\`.

## 4. It Is a Left Fold

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Left fold groups from the left, right fold groups from the right, giving different results for subtraction">
  <rect class="d-box-accent" x="30" y="40" width="320" height="150" rx="10"/>
  <text class="d-text d-accent" x="190" y="74" text-anchor="middle">Left fold: reduce</text>
  <text class="d-sub" x="190" y="112" text-anchor="middle">((1 - 2) - 3) - 4</text>
  <text class="d-sub" x="190" y="150" text-anchor="middle">result: -8</text>
  <rect class="d-box-muted" x="410" y="40" width="320" height="150" rx="10"/>
  <text class="d-text" x="570" y="74" text-anchor="middle">Right fold: by hand</text>
  <text class="d-sub" x="570" y="112" text-anchor="middle">1 - (2 - (3 - 4))</text>
  <text class="d-sub" x="570" y="150" text-anchor="middle">result: -2</text>
</svg>

\`reduce\` groups from the left. For associative operations like \`+\`, \`*\`, \`max\`, \`|\` the grouping does not change the answer; for subtraction, division, exponentiation or "build a string in order", it does. Example 1 prints \`-8\` for \`reduce(operator.sub, [1, 2, 3, 4])\` and \`-2\` for a right fold written as \`reduce(lambda acc, x: x - acc, reversed([1, 2, 3, 4]))\`.

📌 **Interview term: left fold vs right fold** — a left fold (\`foldl\`) combines \`((a op b) op c)\`; a right fold (\`foldr\`) combines \`(a op (b op c))\`. Python only ships the left one; a right fold is \`reduce\` over \`reversed(...)\` with the arguments of \`f\` swapped.

📌 **Interview term: associative operation** — one where \`(a op b) op c == a op (b op c)\`. Only for those is the direction irrelevant — and only those can be split into chunks and folded in parallel, which is the "reduce" in MapReduce.

## 5. What It Does, as a Loop

Example 1 ends with a short \`my_reduce\` that matches the built-in on \`range(1, 6)\` (\`120 120\`):

~~~python
def my_reduce(function, iterable, *initial):
    it = iter(iterable)
    if initial:
        acc = initial[0]
    else:
        try:
            acc = next(it)
        except StopIteration:
            raise TypeError("my_reduce() of empty iterable with no initial value") from None
    for x in it:
        acc = function(acc, x)
    return acc
~~~

Three things to notice: it calls \`iter()\` once, so it works on any iterable including generators (\`reduce(max, (n * n % 17 for n in range(20)))\` is \`16\`); it never builds a list; and it uses \`*initial\` rather than a \`None\` default, because \`None\` is a legitimate initial value. CPython implements \`reduce\` in C (\`type(functools.reduce)\` is \`builtin_function_or_method\`), but the C code follows the same steps.

## 6. Real Uses (Example 2)

| Use | Code | Result |
| :--- | :--- | :--- |
| Compose functions | \`reduce(lambda f, g: lambda x: f(g(x)), fns)\` | \`slug("  Hello World  ")\` → \`hello-world\` |
| Walk nested keys | \`reduce(operator.getitem, ["db", "primary", "port"], config)\` | \`5432\` |
| Merge many dicts | \`reduce(operator.or_, layers, {})\` | \`{'debug': True, 'level': 2}\` |
| Intersect many sets | \`reduce(set.intersection, tags)\` | \`['api', 'py']\` (sorted) |
| GCD / LCM of a list | \`reduce(math.gcd, nums)\`, \`reduce(lcm2, nums)\` | \`6 180\` |

The common thread: an operation that is naturally defined on **two** values, which you need to apply across **many**. That is where \`reduce\` reads well. (\`math.gcd\` and \`set.intersection\` also accept many arguments directly in modern Python, so \`math.gcd(*nums)\` works too; the \`reduce\` form is the general pattern.)

## 7. When Not to Use It

Python 3 moved \`reduce\` out of the built-ins and into \`functools\` (the [Python 3.0a1 NEWS file](https://svn.python.org/projects/python/tags/r30a1/Misc/NEWS) lists it among the removed built-ins). Guido van Rossum explained the reasoning in his 2005 post [The fate of reduce() in Python 3000](https://www.artima.com/weblogs/viewpost.jsp?thread=98196): most uses were either a \`sum\` in disguise or hard to read. The Python 3.0 "What's New" guide puts it bluntly, as quoted in [Dive Into Python 3](https://git.kennethreitz.org/kennethreitz/dive-into-python3/commit/fe57cb02150e9fce96e2c34b054c17c39ff29687): use \`functools.reduce()\` if you really need it, but "99 percent of the time an explicit for loop is more readable". The idiomatic rule follows from that:

| Instead of | Prefer | Example 2 shows |
| :--- | :--- | :--- |
| \`reduce(operator.add, nums)\` | \`sum(nums)\` | \`23 23\` |
| \`reduce(operator.mul, nums)\` | \`math.prod(nums)\` | \`540 540\` |
| \`reduce(max, nums)\` | \`max(nums)\` | \`9 9\` |
| \`reduce(lambda a, b: a and b, xs)\` | \`all(xs)\` | \`x True\` — note \`reduce\` returns the last value, \`all\` returns a bool |
| \`reduce(operator.add, list_of_lists)\` | \`list(chain.from_iterable(...))\` or a comprehension | 500,500 copies vs 1,000 |
| \`reduce(operator.add, strings)\` | \`"".join(strings)\` | — |
| You need every intermediate value | \`itertools.accumulate\` | \`[3, 4, 8, 9, 14, 23]\` |

📌 **Interview term: quadratic accumulation** — folding with an operation that *copies* the accumulator each step (\`list + list\`, \`str + str\`, \`tuple + tuple\`). With 1,000 one-item lists, Example 2 counts **500,500** element copies for \`reduce(concat, chunks, [])\` versus 1,000 for a comprehension. The cost is O(n²).

Speed matters too: on our 3.11 run, summing a million integers took 4.3 ms with \`sum\`, 22.9 ms with \`reduce(operator.add, xs)\` and 43.8 ms with \`reduce(lambda a, b: a + b, xs)\` (\`timeit\`, best of three; numbers vary by machine). \`sum\` adds in C without a Python call per item; \`operator.add\` avoids a Python frame; a \`lambda\` pays for a full Python function call every step. If you do use \`reduce\`, prefer functions from the \`operator\` module over lambdas.

For \`accumulate\` and the other iterator tools see [the itertools module](/interview-question/what-is-the-itertools-module-used-for); \`reduce\`'s neighbours \`map\` and \`filter\` are covered in [lambda functions and map/filter/reduce](/interview-question/what-are-lambda-functions-and-map-filter-reduce), and the rest of the module in [what functools offers](/interview-question/what-does-the-functools-module-offer).

## 8. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly these lines, and every \`print(...)  # expected\` line passed as an in-page test.

**Example 1 — tracing the fold, the initializer, edge cases, a hand-written reduce:**

~~~text
no initializer:
  f(1, 2) -> 3
  f(3, 3) -> 6
  f(6, 4) -> 10
result: 10
with initializer 100:
  f(100, 1) -> 101
  f(101, 2) -> 103
  f(103, 3) -> 106
  f(106, 4) -> 110
result: 110
-8
-2
42
0
TypeError: reduce() of empty iterable with no initial value
[1, 2, 3]
2024
16
120 120
~~~

**Example 2 — real uses, built-in alternatives, and the quadratic trap:**

~~~text
hello-world
5432
{'debug': True, 'level': 2}
['api', 'py']
6 180
23 23
540 540
9 9
x True
[3, 4, 8, 9, 14, 23]
elements copied with +: 500500
elements copied by a comprehension: 1000
~~~

## 9. Edge Cases

- **Empty input, no initializer** → \`TypeError: reduce() of empty iterable with no initial value\`.
- **One item, no initializer** → that item, \`f\` never called; **empty input with an initializer** → the initializer, \`f\` never called.
- **\`reduce\` does not short-circuit.** Folding with \`and\` still visits every item even after a falsy one; \`all()\` stops at the first falsy value.
- **The accumulator can change type** mid-fold if \`f\` returns something different from what it received — legal, but a common source of confusing bugs. Pick an initializer of the result type.
- **Generators are consumed**: after \`reduce(f, gen)\`, \`gen\` is exhausted.

## Common Pitfalls

- **Swapping the parameters** of the function: \`reduce\` always calls \`f(accumulator, item)\`. Writing \`lambda item, acc: ...\` silently computes something else for non-symmetric operations.
- **Forgetting the initializer** when the input can be empty, or when the result type differs from the item type (counting, building a dict).
- **Passing \`initial=\` as a keyword** — it is positional only in CPython's C implementation: \`TypeError: reduce() takes no keyword arguments\`.
- **Re-implementing a built-in** (\`sum\`, \`max\`, \`math.prod\`, \`any\`, \`all\`, \`"".join\`) with \`reduce\` — slower and harder to read.
- **Folding lists or strings with \`+\`** — quadratic copying; use \`chain.from_iterable\`, \`extend\` in a loop, or \`"".join\`.
- **Assuming direction does not matter** for subtraction, division or string building — \`reduce\` is a left fold.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(f, items, initial)</code> is a left fold: it keeps an accumulator and does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acc = f(acc, item)</code> for each item, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(f, [a, b, c])</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(f(a, b), c)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The initializer:</strong> <span style="color:#f0e2c8;">Without it, the first item starts the fold and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> runs n-1 times; an empty input raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. With it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> runs n times, empty input returns the initializer, and it fixes the result type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Direction:</strong> <span style="color:#f0e2c8;">It is a left fold, so for non-associative operations order matters: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(sub, [1, 2, 3, 4])</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-8</code>, while a right fold over the same list is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-2</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it fits:</strong> <span style="color:#f0e2c8;">Binary operations applied across many values: composing functions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator.getitem</code> down nested keys, merging dicts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code>, intersecting sets, GCD or LCM of a list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When not to use it:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.prod</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"".join</code> fits, use that. It is clearer and faster; that is why Python 3 moved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools</code>. Avoid folding lists with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code>: it is quadratic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reduce(operator.add, [])</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: reduce() of empty iterable with no initial value</code>. Pass the identity element as the initializer, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(operator.add, [], 0)</code>, to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many times is the function called for n items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n-1 times without an initializer, n times with one. A single item without an initializer is returned without calling the function at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do a right fold in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(lambda acc, x: f(x, acc), reversed(items))</code>. Python only provides the left fold; the result differs only for non-associative operations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reduce(lambda a, b: a + b, xs)</code> slower than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sum(xs)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum</code> loops in C with no Python call per item. The lambda needs a Python function call each step; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator.add</code> is in between. On our run: 4.3 ms, 43.8 ms and 22.9 ms for a million ints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">initial=</code> as a keyword?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not on 3.11 to 3.13: CPython raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: reduce() takes no keyword arguments</code>, because the C implementation takes positional arguments only. Pass it as the third positional argument.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **fold (reduce)** | Combine all items into one value with a two-argument function |
| **accumulator** | The running value passed from one step to the next |
| **initializer (initial value)** | Optional starting accumulator; makes empty input safe |
| **identity element** | A value that leaves others unchanged (\`0\` for \`+\`, \`1\` for \`*\`) |
| **left fold vs right fold** | Group from the left \`((a op b) op c)\` or from the right |
| **associative operation** | Grouping does not change the result, so direction is irrelevant |
| **quadratic accumulation** | Each step copies the growing accumulator: O(n²) total |

---
**Conclusion:** \`functools.reduce(f, iterable, initial)\` is a left fold: it carries an accumulator, calls \`acc = f(acc, item)\` for each item, and returns the final accumulator — \`f(f(f(a, b), c), d)\`. Without an initializer the first item starts the fold, an empty input raises \`TypeError\`, and a single item is returned untouched; with one, empty input is safe and the result type is fixed. It shines for operations defined on two values that you need across many — composing functions, walking nested keys, merging dicts, intersecting sets — and it is the wrong tool when a built-in like \`sum\`, \`max\`, \`math.prod\`, \`all\` or \`"".join\` already says it better and faster, which is exactly why Python 3 moved it into \`functools\`.`,
    examples: [
      {
        label: `Trace the fold: initializer, left fold, edge cases and a hand-written reduce`,
        code: `# How reduce folds: watch every step
from functools import reduce
import operator

def traced_add(acc, x):
    print(f"  f({acc}, {x}) -> {acc + x}")
    return acc + x

print("no initializer:")
print("result:", reduce(traced_add, [1, 2, 3, 4]))

print("with initializer 100:")
print("result:", reduce(traced_add, [1, 2, 3, 4], 100))

# It is a LEFT fold: ((((1 - 2) - 3) - 4)
print(reduce(operator.sub, [1, 2, 3, 4]))  # -8
# A right fold would be 1 - (2 - (3 - 4)) = -2
print(reduce(lambda acc, x: x - acc, reversed([1, 2, 3, 4])))  # -2

# Edge cases
print(reduce(operator.add, [42]))  # 42
print(reduce(operator.add, [], 0))  # 0
try:
    reduce(operator.add, [])
except TypeError as e:
    print("TypeError:", e)

# The initializer also sets the result type
print(reduce(operator.add, [[1], [2, 3]], []))  # [1, 2, 3]
print(reduce(lambda acc, ch: acc * 10 + int(ch), "2024", 0))  # 2024

# reduce works on any iterable, including a generator
print(reduce(max, (n * n % 17 for n in range(20))))  # 16

# What reduce does, written out as a loop
def my_reduce(function, iterable, *initial):
    it = iter(iterable)
    if initial:
        acc = initial[0]
    else:
        try:
            acc = next(it)
        except StopIteration:
            raise TypeError("my_reduce() of empty iterable with no initial value") from None
    for x in it:
        acc = function(acc, x)
    return acc

print(my_reduce(operator.mul, range(1, 6)), reduce(operator.mul, range(1, 6)))  # 120 120`,
      },
      {
        label: `Real uses of reduce, built-in alternatives and the quadratic trap`,
        code: `# Real uses of reduce, and when a builtin is the better choice
from functools import reduce
from itertools import accumulate
import math
import operator

# 1) Compose functions: compose(f, g, h)(x) == f(g(h(x)))
def compose(*fns):
    return reduce(lambda f, g: lambda x: f(g(x)), fns)

slug = compose(lambda s: s.replace(" ", "-"), str.lower, str.strip)
print(slug("  Hello World  "))  # hello-world

# 2) Walk a nested dict with a path
config = {"db": {"primary": {"host": "10.0.0.5", "port": 5432}}}
print(reduce(operator.getitem, ["db", "primary", "port"], config))  # 5432

# 3) Merge many dicts, later keys win
layers = [{"debug": False, "level": 1}, {"level": 2}, {"debug": True}]
print(reduce(operator.or_, layers, {}))  # {'debug': True, 'level': 2}

# 4) Intersect many sets
tags = [{"py", "web", "api"}, {"py", "api"}, {"api", "py", "cli"}]
print(sorted(reduce(set.intersection, tags)))  # ['api', 'py']

# 5) GCD and LCM of a list
nums = [12, 18, 30]
print(reduce(math.gcd, nums), reduce(lambda a, b: a * b // math.gcd(a, b), nums))  # 6 180

# Prefer the builtin when one exists: same answer, clearer code
values = [3, 1, 4, 1, 5, 9]
print(reduce(operator.add, values), sum(values))  # 23 23
print(reduce(operator.mul, values), math.prod(values))  # 540 540
print(reduce(max, values), max(values))  # 9 9
print(reduce(lambda a, b: a and b, [True, 1, "x"]), all([True, 1, "x"]))  # x True

# accumulate is reduce that keeps every intermediate value
print(list(accumulate(values, operator.add)))  # [3, 4, 8, 9, 14, 23]

# Cost trap: folding lists with + copies the accumulator every step
copied = 0
def concat(acc, x):
    global copied
    copied += len(acc) + len(x)
    return acc + x

chunks = [[i] for i in range(1000)]
reduce(concat, chunks, [])
print("elements copied with +:", copied)
flat = [x for chunk in chunks for x in chunk]
print("elements copied by a comprehension:", len(flat))`,
      },
    ],
  },
];

export default augments;
