/**
 * PYTHON ULTRA — batch 15: Context managers and collections. Every example was
 * run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is a context manager?`,
    difficulty: "medium",
    seoDescription: `Python context managers from zero: the with statement, __enter__ and __exit__, exception suppression, @contextmanager and contextlib, verified on 3.11.`,
    description: `**Question presented to candidate:**
"You write \`with open(path) as f:\` all the time. What is actually going on there? Explain what a context manager is, how you would write your own, and what happens when the code inside the block raises."

**What a strong answer should cover:**
- A context manager is an object that sets something up on entry and is guaranteed to tear it down on exit; the \`with\` statement drives it, and it is a structured replacement for \`try\`/\`finally\`.
- The protocol: \`__enter__()\` runs first and its return value is what \`as\` binds; \`__exit__(exc_type, exc_value, traceback)\` always runs, on normal exit, \`return\`, \`break\` or an exception.
- Exception handling: \`__exit__\` receives the exception, and a truthy return value suppresses it; returning \`None\`/\`False\` lets it propagate.
- Two ways to write one: a class with \`__enter__\`/\`__exit__\`, or a generator decorated with \`contextlib.contextmanager\` (the code after \`yield\` must sit in \`finally\` to run on errors).
- Real uses and stdlib helpers: files, locks, transactions, temporary state; \`contextlib.suppress\`, \`nullcontext\`, \`closing\`, \`ExitStack\`, plus \`async with\` for async managers.
- A CPython detail: \`__enter__\`/\`__exit__\` are looked up on the type, not the instance, and in 3.11 the bytecode is \`BEFORE_WITH\` plus \`WITH_EXCEPT_START\`.

**Code / implementation expected:** Yes — a small class-based manager and the same thing written with \`@contextmanager\`, showing what happens when the body raises.`,
    answer: `**Target Audience:** Python learners who use \`with open(...)\` without knowing what it does, up to candidates who need the exact protocol and CPython details.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); spot checks on 3.12 and 3.13 are noted where made.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a library where you can borrow the rare-books room. The librarian unlocks the door when you arrive and must lock it again when you leave. Most days that is easy. But what if you get a phone call and rush out? What if you faint? A careless library leaves the door open; a good one has a rule: *whatever happens inside, the door gets locked on the way out*.

Programs borrow things all the time: open files, network connections, database transactions, locks shared between threads. Each one must be given back. Forget, and you get files that never flush to disk, a database stuck in a half-finished transaction, or a lock nobody can ever take again. A **context manager** is Python's "good library" rule written into an object: it does the unlocking on the way in and the locking on the way out, and the \`with\` statement makes sure the way out always happens.

## 2. The Problem It Solves: Cleanup That Must Always Run

The manual way to guarantee cleanup is \`try\`/\`finally\`:

~~~python
f = open("data.txt")
try:
    process(f.read())
finally:
    f.close()        # runs even if process() raises
~~~

That works, but every caller has to remember the pattern, and with two or three resources it becomes a staircase. The \`with\` statement packages it:

~~~python
with open("data.txt") as f:
    process(f.read())
# f is closed here, whether process() returned or raised
~~~

📌 **Interview term: Resource leak** — a resource (file handle, socket, lock, connection) that is never released because the cleanup code did not run, usually because an exception skipped it.

📌 **Interview term: with statement** — the syntax \`with EXPR as NAME: BLOCK\`. It evaluates \`EXPR\` to get a manager, enters it, runs \`BLOCK\`, and always exits it. It was introduced by PEP 343 in Python 2.5 (behind a \`__future__\` import there, on by default from 2.6), per the [Python 2.5 What's New notes on PEP 343](https://docs.python.org/2.5/whatsnew/pep-343.html).

📌 **Interview term: Context manager** — any object that the \`with\` statement can drive: one whose *type* defines \`__enter__\` and \`__exit__\`.

## 3. The Protocol: Two Methods

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="The with statement evaluates the manager, calls enter, runs the body, then always calls exit">
  <defs>
    <marker id="py15q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">with EXPR</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">build the manager</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#py15q1-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">call</text>
  <rect class="d-box-accent" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">__enter__()</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">result goes to as</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#py15q1-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">then</text>
  <rect class="d-box" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">body</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">your code block</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#py15q1-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">on leave</text>
  <rect class="d-box-accent" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">__exit__()</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">always runs</text>
</svg>

The \`with\` statement calls exactly two methods on the manager, in this order, and the second one is not optional: it runs on a normal finish, on \`return\`, on \`break\`/\`continue\` out of a loop, and on an exception.

📌 **Interview term: Context manager protocol** — the two special methods:

| Method | When it runs | What it receives | What its return value does |
| :--- | :--- | :--- | :--- |
| \`__enter__(self)\` | before the block | nothing | bound to the name after \`as\` (ignored if there is no \`as\`) |
| \`__exit__(self, exc_type, exc_value, traceback)\` | after the block, always | \`None, None, None\` on a clean exit; the exception class, instance and traceback otherwise | truthy = swallow the exception; falsy (\`None\`) = let it propagate |

Note the \`as\` name gets **whatever \`__enter__\` returns**, which is not always the manager. A file's \`__enter__\` returns the file itself, which is why \`with open(p) as f\` feels natural. A \`threading.Lock\`'s \`__enter__\` returns \`True\`: on our 3.11 run \`with threading.Lock() as x: print(x)\` printed \`True\`.

### What \`with\` does, spelled out

Example 1 ends with this desugaring, run by hand, and it behaves the same as the real statement:

~~~python
mgr = Resource("manual")
value = mgr.__enter__()          # 1. enter; value is what "as" would bind
try:
    print("body runs")           # 2. the block
except BaseException as exc:     # 3a. the block raised
    if not mgr.__exit__(type(exc), exc, exc.__traceback__):
        raise                    #     falsy return: re-raise
else:
    mgr.__exit__(None, None, None)   # 3b. clean exit
~~~

Two details here match the real statement: \`__exit__\` is called with the exception *type* first, and catching \`BaseException\` means even \`KeyboardInterrupt\` and \`SystemExit\` trigger cleanup.

## 4. When the Block Raises

<svg class="iq-diagram" width="100%" viewBox="0 0 780 310" role="img" aria-label="When the body raises, exit receives the exception; a truthy return swallows it, a falsy return re-raises it">
  <defs>
    <marker id="py15q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="117" width="200" height="76" rx="10"/>
  <text class="d-text" x="120" y="149" text-anchor="middle">body raises</text>
  <text class="d-sub" x="120" y="173" text-anchor="middle">for example ValueError</text>
  <path class="d-edge-accent" d="M 228 155 L 282 155" marker-end="url(#py15q1-arrow2)"/>
  <rect class="d-box-accent" x="290" y="117" width="210" height="76" rx="10"/>
  <text class="d-text" x="395" y="149" text-anchor="middle">__exit__(t, v, tb)</text>
  <text class="d-sub" x="395" y="173" text-anchor="middle">sees the exception</text>
  <path class="d-edge" d="M 508 135 L 572 72" marker-end="url(#py15q1-arrow2)"/>
  <path class="d-edge" d="M 508 175 L 572 238" marker-end="url(#py15q1-arrow2)"/>
  <rect class="d-box-muted" x="580" y="20" width="180" height="76" rx="10"/>
  <text class="d-text" x="670" y="52" text-anchor="middle">returns True</text>
  <text class="d-sub" x="670" y="76" text-anchor="middle">error swallowed</text>
  <rect class="d-box" x="580" y="214" width="180" height="76" rx="10"/>
  <text class="d-text" x="670" y="246" text-anchor="middle">returns None</text>
  <text class="d-sub" x="670" y="270" text-anchor="middle">error re-raised</text>
</svg>

\`__exit__\` is the one place that sees the exception before anyone else. It can log it, roll back a transaction, or decide to **suppress** it.

📌 **Interview term: Exception suppression** — if \`__exit__\` returns a truthy value, Python treats the exception as handled and continues with the first statement after the \`with\` block. If it returns \`None\` or \`False\`, the exception keeps propagating up the call stack (see [how exceptions propagate](/interview-question/how-does-exception-propagation-work-up-the-call-stack)).

Suppressing should be rare and deliberate. A manager that swallows everything hides bugs. A common, correct pattern is to suppress only one specific type, which is exactly what \`contextlib.suppress(FileNotFoundError)\` does. Also: \`__exit__\` should not re-raise the exception it was given; it returns falsy and lets the \`with\` machinery re-raise the original, so the traceback stays intact.

## 5. Writing One: a Class

~~~python
class Resource:
    def __init__(self, name, swallow=False):
        self.name, self.swallow, self.log = name, swallow, []

    def __enter__(self):
        self.log.append("open")
        return self                       # bound by "as"

    def __exit__(self, exc_type, exc, tb):
        self.log.append("close")
        return self.swallow               # True would suppress
~~~

The full version in Example 1 prints on entry and exit and is driven through four cases: a clean exit, an exception that propagates, an exception that is swallowed, and a \`return\` from inside the block. In all four, \`__exit__\` ran.

A class is the right shape when the manager holds state you want to inspect afterwards, is reusable (enter, exit, enter again), or is an existing object that should also support \`with\`, like a connection class.

## 6. Writing One: a Generator with \`@contextmanager\`

For one-off managers, the class boilerplate is heavy. \`contextlib.contextmanager\` turns a generator function into a manager: everything before \`yield\` is the setup, the yielded value is what \`as\` binds, and everything after \`yield\` is the cleanup.

~~~python
from contextlib import contextmanager

@contextmanager
def tag(name):
    print(f"<{name}>")
    try:
        yield name.upper()
    finally:
        print(f"</{name}>")
~~~

📌 **Interview term: Generator-based context manager** — a generator function wrapped by \`@contextmanager\`. On entry it runs the generator to its single \`yield\`; on a clean exit it resumes it; on an exception it **throws the exception into the generator at the \`yield\` point**. If the generator catches it and does not re-raise, the exception is suppressed. If you are fuzzy on how generators pause and resume, see [what generators are](/interview-question/what-are-generators-and-why-use-them) and [a generator's lifecycle](/interview-question/what-is-a-generator-s-lifecycle).

That "throws at the \`yield\`" detail is the most common bug: without \`try\`/\`finally\`, the cleanup lines after \`yield\` are simply never reached when the body raises. Example 2's \`fragile()\` manager proves it: its "cleanup" line did not print.

Two more facts from Example 2 and our runs:

- **Single use.** Each call of \`tag("p")\` creates one manager. Entering the same object twice failed on 3.11, 3.12 and 3.13 with \`AttributeError: '_GeneratorContextManager' object has no attribute 'args'\` — an unhelpful message from inside contextlib, not a deliberate API. Call the function again instead.
- **Works as a decorator.** The object is also a \`contextlib.ContextDecorator\`, so \`@tag("div")\` above a function wraps every call in the manager; it builds a fresh generator per call, so repeated calls work (we ran it twice).

## 7. What CPython Does

**Lookup is on the type.** \`with\` finds \`__enter__\` and \`__exit__\` through the object's class, the same way \`len()\` finds \`__len__\`. Assigning them on an instance does nothing; the last part of Example 1 shows 3.11 raising \`TypeError: 'Plain' object does not support the context manager protocol\`. The same message appeared on 3.12 and 3.13 in our runs, and \`with 5:\` gives \`'int' object does not support the context manager protocol\`. (Why dunder lookup skips the instance is covered in [attribute lookup](/interview-question/how-does-attribute-lookup-work-on-a-python-object) and [dunder methods](/interview-question/what-are-dunder-magic-methods).)

**The bytecode.** Disassembling \`with open('x') as fh: pass\` with \`dis\` on python3.11 printed (trimmed):

~~~text
  4           2 LOAD_GLOBAL              1 (NULL + open)
             14 LOAD_CONST               1 ('x')
             16 PRECALL                  1
             20 CALL                     1
             30 BEFORE_WITH
             32 STORE_FAST               0 (fh)
  ...
             36 LOAD_CONST               0 (None)
             38 LOAD_CONST               0 (None)
             40 LOAD_CONST               0 (None)
             42 PRECALL                  2
             46 CALL                     2
  ...
        >>   62 PUSH_EXC_INFO
             64 WITH_EXCEPT_START
             66 POP_JUMP_FORWARD_IF_TRUE     4 (to 76)
             68 RERAISE                  2
~~~

Read it as the desugaring from section 3: \`BEFORE_WITH\` looks up \`__exit__\`, calls \`__enter__\` and leaves the bound \`__exit__\` on the stack; the clean path calls it with three \`None\`s (the three \`LOAD_CONST None\` then \`CALL 2\`); the exception path, reached through the exception table, runs \`WITH_EXCEPT_START\` to call \`__exit__\` with the exception, then \`POP_JUMP_FORWARD_IF_TRUE\` skips the \`RERAISE\` when the result is truthy. Opcode names change between versions, so treat this as what 3.11 does, not a stable API.

## 8. Context Managers You Already Use

| Manager | Setup | Cleanup |
| :--- | :--- | :--- |
| \`open(path)\` | open the file | close it (flushes buffered writes); see [reading and writing files](/interview-question/how-do-you-read-and-write-files-in-python) |
| \`threading.Lock()\` | \`acquire()\` | \`release()\`; see [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it) |
| \`decimal.localcontext()\` | install a copy of the decimal context | restore the old one |
| \`unittest.mock.patch(...)\` | replace an attribute | put the original back |
| \`tempfile.TemporaryDirectory()\` | create a directory | delete it and its contents |
| \`contextlib.suppress(*excs)\` | nothing | swallow only the listed exception types |
| \`contextlib.nullcontext(x)\` | nothing; \`as\` gets \`x\` | nothing (a stand-in when a manager is optional) |
| \`contextlib.closing(obj)\` | nothing; \`as\` gets \`obj\` | call \`obj.close()\` |
| \`contextlib.redirect_stdout(f)\` | point \`sys.stdout\` at \`f\` | restore it |
| \`contextlib.chdir(path)\` | change the working directory | change back (added in 3.11, per the [3.11 What's New](https://docs.python.org/3/whatsnew/3.11.html); not safe across threads) |
| \`contextlib.ExitStack()\` | nothing | close every manager pushed onto it, in reverse order |

Combining several managers, and \`ExitStack\` for a number of them known only at run time, has its own page: [using multiple context managers at once](/interview-question/how-do-you-use-multiple-context-managers-at-once).

📌 **Interview term: Asynchronous context manager** — the \`async\` version: the type defines \`__aenter__\` and \`__aexit__\` as coroutines and you use \`async with\` inside an \`async def\`. Examples are \`asyncio.Lock\`, \`aiohttp\` sessions and \`asyncio.TaskGroup\` (see [TaskGroup](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather)). \`contextlib.asynccontextmanager\` is the generator-style helper. Background on coroutines: [async/await](/interview-question/how-does-async-await-work-in-python).

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — a class-based manager through every exit path** prints:

~~~text
--- normal exit ---
enter db
inside, r is the Resource: True
exit  db: exc_type=None
['open', 'close']
--- exception propagates ---
enter file
exit  file: exc_type=ValueError
caught outside: boom
['open', 'close']
--- exception swallowed ---
enter quiet
exit  quiet: exc_type=ZeroDivisionError
still running after ZeroDivisionError
--- early return also runs __exit__ ---
enter loop
exit  loop: exc_type=None
result: 8
--- what with does, written by hand ---
enter manual
body runs
exit  manual: exc_type=None
['open', 'close']
--- __enter__ is looked up on the type, not the instance ---
TypeError: 'Plain' object does not support the context manager protocol
~~~

**Example 2 — \`@contextmanager\`, the missing-\`finally\` bug, and contextlib helpers** prints:

~~~text
<b>
body got: B
</b>
--- body raises inside the generator manager ---
<i>
</i>
propagated: 'missing'
setup
cleanup was skipped
--- contextlib helpers ---
suppress swallowed FileNotFoundError
nullcontext gave: no lock
using connection
Connection.close() called
--- a generator manager is single use ---
<p>
</p>
AttributeError: '_GeneratorContextManager' object has no attribute 'args'
~~~

**What the output shows:**

- \`exit\` printed in every case: clean exit (\`exc_type=None\`), an exception, a swallowed exception, and an early \`return\` from inside a loop.
- With \`swallow=True\`, the \`ZeroDivisionError\` vanished and the program carried on; "never printed" did not print, because the block stops at the raise.
- In the generator version, \`</i>\` printed before "propagated", so cleanup ran first and then the \`KeyError\` continued to the caller. \`fragile()\` lost its cleanup because it had no \`finally\`.
- \`closing()\` called \`close()\` after the body; \`nullcontext\` handed back the value it was given.

## 10. Edge Cases

- **\`__enter__\` raises.** Then the block never runs and \`__exit__\` is **not** called: the manager was never entered. Put setup that can fail before the point of no return, or let the caller handle it.
- **\`__exit__\` raises.** Its new exception replaces the original one, with the original attached as \`__context__\`. Keep \`__exit__\` simple.
- **The name lives on.** \`with open(p) as f:\` leaves \`f\` bound after the block; the file is closed, but the name still exists. Using \`f.read()\` afterwards gives \`ValueError: I/O operation on closed file\`.
- **Generators that \`yield\` twice.** A \`@contextmanager\` generator must yield exactly once; a second \`yield\` raises \`RuntimeError\` on exit ("generator didn't stop").
- **Return values from \`__exit__\` matter.** Writing \`return self.cleanup()\` by accident can suppress exceptions if \`cleanup()\` happens to return something truthy.

## Common Pitfalls

- **Cleanup after \`yield\` without \`finally\`.** In a \`@contextmanager\` generator it is skipped exactly when you need it most: when the body raises.
- **Accidentally swallowing exceptions.** Returning \`True\` (or anything truthy) from \`__exit__\` hides every error inside the block; suppress only specific types, as \`contextlib.suppress\` does.
- **Assuming \`as\` binds the manager.** It binds \`__enter__()\`'s return value; for a lock that is \`True\`, not the lock.
- **Reusing a generator-based manager object.** It is single use; store the factory function, not the object.
- **Opening the file outside the \`with\`.** \`f = open(p)\` followed by \`with f:\` works, but if anything raises between the two lines the file leaks; open it in the \`with\` line itself.
- **Relying on garbage collection instead of \`with\`.** CPython usually closes an unreferenced file promptly thanks to reference counting, but that is a CPython implementation detail, and it does not help locks or transactions. See [del, __del__ and garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A context manager is an object that sets something up when a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> block starts and is guaranteed to clean it up when the block ends, however it ends. It is structured <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Protocol:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__()</code>, binds its return value to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> name, runs the body, then calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__(exc_type, exc_value, traceback)</code> on normal exit, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> or an exception.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Exceptions:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code> gets the exception details; returning a truthy value swallows the exception, returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> lets it propagate. Most managers should not swallow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Two ways to write one:</strong> <span style="color:#f0e2c8;">A class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code>, or a generator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@contextlib.contextmanager</code>: code before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> is setup, code after is cleanup, and it must be inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> or it is skipped on errors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where it shows up:</strong> <span style="color:#f0e2c8;">Files, locks, DB transactions, temporary state like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decimal.localcontext</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mock.patch</code>, plus helpers such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suppress</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullcontext</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">closing</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExitStack</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aenter__</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aexit__</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">as</code> bind: the manager or something else?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whatever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__()</code> returns. A file's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code> returns the file itself, so they look the same, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with threading.Lock() as x</code> binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> (we ran it), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decimal.localcontext()</code> binds the new context object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the code after <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield</code> be in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code> block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the body raises, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextmanager</code> throws that exception into the generator at the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> the lines after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> never run; Example 2 shows the cleanup being skipped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__enter__</code> on an instance to make it a context manager?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Like other special methods, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> looks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code> up on the type. An instance attribute is ignored and 3.11 raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: 'Plain' object does not support the context manager protocol</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@contextmanager</code> function be reused?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each call returns a new single-use manager; entering the same object twice failed on our 3.11 run with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> from inside contextlib. Calling the function again is fine, and the result also works as a decorator because it is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ContextDecorator</code> that rebuilds itself on each call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">with</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Behaviourally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> plus the option to inspect or suppress the exception. The win is that the cleanup logic lives once inside the manager instead of being copied to every call site, so it cannot be forgotten.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Context manager** | an object with \`__enter__\` and \`__exit__\` that a \`with\` statement drives |
| **Context manager protocol** | the pair of special methods \`__enter__()\` and \`__exit__(exc_type, exc_value, traceback)\` |
| **with statement** | syntax that calls \`__enter__\`, runs a block, and always calls \`__exit__\` |
| **Exception suppression** | \`__exit__\` returning a truthy value, which stops the exception from propagating |
| **Generator-based context manager** | a generator function decorated with \`@contextlib.contextmanager\`; setup before \`yield\`, cleanup after |
| **Resource leak** | a file, socket or lock that is never released because cleanup code did not run |
| **Special method lookup** | Python looks dunder methods up on the type, not the instance |
| **Asynchronous context manager** | an object with \`__aenter__\`/\`__aexit__\` coroutines, used with \`async with\` |

---
**Conclusion:** A context manager is Python's way of pairing setup with guaranteed cleanup. The \`with\` statement calls \`__enter__\`, binds its result to the \`as\` name, runs the block and then always calls \`__exit__\`, passing it the exception if there was one; a truthy return swallows that exception, anything else lets it propagate. You write one as a class with the two methods, or as a \`@contextmanager\` generator whose cleanup sits in a \`finally\` after the single \`yield\`. The stdlib is full of them, from files and locks to \`suppress\`, \`closing\`, \`chdir\` and \`ExitStack\`, and the async world mirrors the protocol with \`__aenter__\`, \`__aexit__\` and \`async with\`.`,
    examples: [
      { label: `A class-based context manager through every exit path`, code: `# A class-based context manager: __enter__ runs on the way in,
# __exit__ runs on the way out, no matter how the block ends.
class Resource:
    def __init__(self, name, swallow=False):
        self.name = name
        self.swallow = swallow
        self.log = []

    def __enter__(self):
        self.log.append("open")
        print(f"enter {self.name}")
        # whatever __enter__ returns is bound by "as"
        return self

    def __exit__(self, exc_type, exc, tb):
        self.log.append("close")
        name = exc_type.__name__ if exc_type else None
        print(f"exit  {self.name}: exc_type={name}")
        # a truthy return value swallows the exception
        return self.swallow


print("--- normal exit ---")
with Resource("db") as r:
    print("inside, r is the Resource:", isinstance(r, Resource))
print(r.log)  # ['open', 'close']

print("--- exception propagates ---")
try:
    with Resource("file") as f:
        raise ValueError("boom")
except ValueError as e:
    print("caught outside:", e)
print(f.log)  # ['open', 'close']

print("--- exception swallowed ---")
with Resource("quiet", swallow=True) as q:
    1 / 0
    print("never printed")
print("still running after ZeroDivisionError")

print("--- early return also runs __exit__ ---")
def find_first_even(nums):
    with Resource("loop"):
        for n in nums:
            if n % 2 == 0:
                return n

print("result:", find_first_even([3, 5, 8, 9]))

print("--- what with does, written by hand ---")
mgr = Resource("manual")
value = mgr.__enter__()
try:
    print("body runs")
except BaseException as exc:
    if not mgr.__exit__(type(exc), exc, exc.__traceback__):
        raise
else:
    mgr.__exit__(None, None, None)
print(mgr.log)  # ['open', 'close']

print("--- __enter__ is looked up on the type, not the instance ---")
class Plain:
    pass

p = Plain()
p.__enter__ = lambda: "instance attr"
p.__exit__ = lambda *args: None
try:
    with p:
        pass
except TypeError as e:
    print("TypeError:", e)` },
      { label: `@contextmanager, the missing finally bug, and contextlib helpers`, code: `from contextlib import contextmanager, suppress, nullcontext, closing

# Code before yield = __enter__, code after yield = __exit__.
@contextmanager
def tag(name):
    print(f"<{name}>")
    try:
        yield name.upper()
    finally:
        # finally makes the cleanup run even if the body raises
        print(f"</{name}>")

with tag("b") as value:
    print("body got:", value)

print("--- body raises inside the generator manager ---")
try:
    with tag("i"):
        raise KeyError("missing")
except KeyError as e:
    print("propagated:", e)

# Without try/finally the cleanup is skipped when the body raises
@contextmanager
def fragile():
    print("setup")
    yield
    print("cleanup")

try:
    with fragile():
        raise RuntimeError("oops")
except RuntimeError:
    print("cleanup was skipped")

print("--- contextlib helpers ---")
with suppress(FileNotFoundError):
    open("/no/such/file.txt")
print("suppress swallowed FileNotFoundError")

def maybe_lock(lock=None):
    # nullcontext stands in when there is nothing to manage
    return lock if lock is not None else nullcontext("no lock")

with maybe_lock() as got:
    print("nullcontext gave:", got)

class Connection:
    def close(self):
        print("Connection.close() called")

with closing(Connection()):
    print("using connection")

print("--- a generator manager is single use ---")
cm = tag("p")
with cm:
    pass
try:
    with cm:
        pass
except Exception as e:
    print(type(e).__name__ + ":", e)` },
    ],
  },
  {
    title: `How do you use multiple context managers at once?`,
    difficulty: "medium",
    seoDescription: `Combine Python context managers: with a, b, the parenthesised 3.10 form, enter and exit order, failures part-way, and contextlib.ExitStack, verified.`,
    description: `**Question presented to candidate:**
"Say you need to read from one file and write to another, and hold a lock while you do it. How do you manage all three with \`with\`? And what if the number of files is only known at run time?"

**What a strong answer should cover:**
- \`with a() as x, b() as y:\` is exactly equivalent to nesting one \`with\` inside another; the parenthesised, one-per-line form is official since Python 3.10.
- Order: managers are entered left to right and exited right to left (last in, first out), so a later manager can use an earlier one.
- Failure part-way: if a later \`__enter__\` raises, the managers already entered are still exited; the one that failed is not.
- Exceptions travel inside out: the innermost \`__exit__\` sees the error first and can suppress it, and then outer managers see a clean exit.
- \`contextlib.ExitStack\` for a dynamic number of managers: \`enter_context()\`, \`callback()\`, and \`pop_all()\` for all-or-nothing acquisition; \`AsyncExitStack\` for \`async with\`.
- Look-alikes that are wrong: \`with (a, b) as t:\` makes a tuple, and \`with a and b:\` enters only one.

**Clarifying questions expected:**
- Is the number of resources fixed at write time, or does it depend on input?
- Must acquisition be all-or-nothing, and should the resources outlive the function that opens them?

**Code / implementation expected:** Yes — a comma-separated \`with\` showing enter/exit order, and an \`ExitStack\` loop over a list of resources.`,
    answer: `**Target Audience:** Developers who know the single \`with\` statement and want to combine several resources correctly, including candidates who need the edge cases.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

If the single \`with\` statement is new to you, start with [what a context manager is](/interview-question/what-is-a-context-manager); this page builds on \`__enter__\` and \`__exit__\`.

## 1. Why This Even Matters — A Story First

Think of getting ready for a winter walk: coat on, then scarf, then gloves. Coming back in, you take them off in the reverse order: gloves first (you cannot unwind the scarf with gloves on), then scarf, then coat. And if the zip on your coat breaks while putting it on, you do not bother with the scarf and gloves — but you do take the half-on coat back off.

Real code has the same shape. Copying a file means opening a source *and* a destination. A database job might hold a connection, a transaction and a lock. Each resource must be released, in the reverse order it was taken, and a failure halfway must release exactly the ones already taken — no more, no less. Python gives you two tools for this: several managers in one \`with\` statement when you know them while writing the code, and \`contextlib.ExitStack\` when you only find out at run time.

## 2. The Core Idea: One \`with\`, Several Managers

~~~python
with open("in.txt") as src, open("out.txt", "w") as dst:
    dst.write(src.read())
~~~

📌 **Interview term: Multiple-item with statement** — a \`with\` statement listing several managers separated by commas. The language reference defines it as **exactly equivalent to nested \`with\` statements**:

~~~python
with open("in.txt") as src:
    with open("out.txt", "w") as dst:
        dst.write(src.read())
~~~

Sections 1 and 2 of Example 1 run both forms with the same logging managers and print identical event lists.

When the line gets long, wrap the managers in parentheses, one per line, with an optional trailing comma:

~~~python
with (
    open("in.txt") as src,
    open("out.txt", "w") as dst,
    lock,
):
    ...
~~~

📌 **Interview term: Parenthesised context managers** — that bracketed form. It became officially allowed in Python 3.10 (bpo-12782), made possible by the new PEG parser, per the [What's New In Python 3.10](https://docs.python.org/3/whatsnew/3.10.html) notes. On older versions the usual workaround was backslash line continuation or nesting. Example 1 uses it, and it runs in the page's 3.11 runtime.

## 3. The Order: Enter Left to Right, Exit Right to Left

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="Two managers in one with statement: enter A, enter B, body, exit B, exit A">
  <defs>
    <marker id="py15q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="90" y="72" text-anchor="middle">enter A</text>
  <text class="d-sub" x="90" y="96" text-anchor="middle">first in</text>
  <path class="d-edge-accent" d="M 168 88 L 220 88" marker-end="url(#py15q2-arrow)"/>
  <rect class="d-box" x="230" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="300" y="83" text-anchor="middle">enter B</text>
  <path class="d-edge-accent" d="M 378 88 L 430 88" marker-end="url(#py15q2-arrow)"/>
  <rect class="d-box-accent" x="440" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="510" y="83" text-anchor="middle">body</text>
  <path class="d-edge-accent" d="M 588 88 L 640 88" marker-end="url(#py15q2-arrow)"/>
  <rect class="d-box" x="650" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="720" y="83" text-anchor="middle">exit B</text>
  <path class="d-edge-accent" d="M 798 88 L 850 88" marker-end="url(#py15q2-arrow)"/>
  <rect class="d-box" x="860" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="930" y="72" text-anchor="middle">exit A</text>
  <text class="d-sub" x="930" y="96" text-anchor="middle">last out</text>
</svg>

The first manager written is entered first and exited last.

📌 **Interview term: LIFO cleanup** — "last in, first out": resources are released in the reverse of the order they were acquired, like plates on a stack. That is what you want, because later resources often depend on earlier ones. Section 6 of Example 1 builds a "cursor" from the value the "connection" manager returned, on the same \`with\` line, and the cursor is closed before the connection.

Each manager expression is evaluated **just before** it is entered, not all up front. That matters: in \`with open(a) as f, open(b) as g:\`, \`open(b)\` is not called until \`f\` is already being managed, so if \`open(b)\` raises, \`f\` is closed properly.

## 4. When Something Fails Part-Way

<svg class="iq-diagram" width="100%" viewBox="0 0 990 156" role="img" aria-label="When B fails to enter, A is already open and is exited before the error reaches the caller">
  <defs>
    <marker id="py15q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">enter A</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">succeeds</text>
  <path class="d-edge-accent" d="M 198 88 L 270 88" marker-end="url(#py15q2-arrow2)"/>
  <rect class="d-box-accent" x="280" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="365" y="72" text-anchor="middle">enter B</text>
  <text class="d-sub" x="365" y="96" text-anchor="middle">raises OSError</text>
  <path class="d-edge-accent" d="M 458 88 L 530 88" marker-end="url(#py15q2-arrow2)"/>
  <text class="d-sub d-accent" x="494" y="72" text-anchor="middle">unwind</text>
  <rect class="d-box" x="540" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="625" y="72" text-anchor="middle">exit A</text>
  <text class="d-sub" x="625" y="96" text-anchor="middle">sees OSError</text>
  <path class="d-edge-accent" d="M 718 88 L 790 88" marker-end="url(#py15q2-arrow2)"/>
  <rect class="d-box-muted" x="800" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="885" y="72" text-anchor="middle">caller</text>
  <text class="d-sub" x="885" y="96" text-anchor="middle">catches it</text>
</svg>

Section 4 of Example 1 makes the middle manager \`B\` raise from \`__enter__\`. The output shows \`A\` was entered, \`B\` failed, \`A\` was exited (and saw the \`OSError\`), the caller caught the error, and \`C\` was never even constructed. \`B\` got no \`__exit__\` call because it was never successfully entered.

📌 **Interview term: Exception unwinding** — as an exception travels outward, each \`__exit__\` of an already-entered manager runs, innermost first, and each one can inspect it.

Because the innermost manager sees an exception first, it is also the first that may **suppress** it. Section 5 of Example 1: \`inner\` returns \`True\` from \`__exit__\` on a \`ValueError\`, so \`outer\` then exits with \`saw None\` — from its point of view nothing went wrong. Order your managers with that in mind: a transaction manager that rolls back on error should sit *outside* anything that might swallow the error.

## 5. Look-Alikes That Do Something Else

Two lines that look like "two managers" but are not, both run in section 7 of Example 1:

| Code | What Python does | Result on 3.11 |
| :--- | :--- | :--- |
| \`with (A(), B()) as pair:\` | builds a tuple of two managers and tries to enter the tuple | \`TypeError: 'tuple' object does not support the context manager protocol\` |
| \`with A() and B() as w:\` | evaluates \`A() and B()\`, which is just \`B()\` (a truthy \`A()\`) | only \`B\` is entered and exited; \`A\` is created but never entered |
| \`with (A() as a, B() as b):\` | the correct parenthesised form | both entered, exited in reverse |

The rule: in the parenthesised form, each \`as\` goes inside the parentheses, next to its own manager.

## 6. A Dynamic Number of Managers: \`ExitStack\`

Sometimes you cannot write the managers out, because there are N of them: open every file a user passed, connect to every shard in a list, lock every account touched by a transfer.

A plain loop is wrong:

~~~python
files = [open(p) for p in paths]   # if the 3rd open fails, the first 2 leak
~~~

📌 **Interview term: ExitStack** — \`contextlib.ExitStack\`, a context manager that you push other managers and cleanup functions onto at run time. When its \`with\` block ends (normally or by exception) it unwinds everything registered, in LIFO order, with the same exception semantics as nested \`with\` statements. It was added in Python 3.3, per the [Python 3.3 contextlib docs](https://docs.python.org/3.3/library/contextlib.html).

~~~python
from contextlib import ExitStack

with ExitStack() as stack:
    files = [stack.enter_context(open(p)) for p in paths]
    ...   # all files open here
# all files closed here, last opened first
~~~

Its three key methods, all shown in Example 2:

- 📌 **Interview term: enter_context()** — \`stack.enter_context(cm)\` calls \`cm.__enter__()\`, registers its \`__exit__\`, and returns what \`__enter__\` returned. If an \`enter_context\` call fails half way through a loop, the ones already registered are unwound (Example 2, part 2: \`s3\` is down, so \`s2\` and \`s1\` are closed and \`s4\` is never touched).
- 📌 **Interview term: callback()** — \`stack.callback(fn, *args)\` registers any function as a cleanup, for resources that have a \`close()\`-style function but no context manager support. Callbacks unwind in LIFO order with everything else.
- 📌 **Interview term: pop_all()** — moves every registered cleanup into a **new** \`ExitStack\` and empties the current one. This is the all-or-nothing pattern: acquire everything inside the \`with\` (so a failure releases the partial set), then \`pop_all()\` at the end so the successful set survives the block and is closed later through the new stack. The \`Pool\` class in Example 2 does exactly that.

\`stack.push(exit_fn)\` (register a raw \`__exit__\`-style function) and \`stack.close()\` (unwind now) complete the API.

📌 **Interview term: AsyncExitStack** — \`contextlib.AsyncExitStack\`, the same idea for \`async with\`: \`await stack.enter_async_context(cm)\` and \`stack.push_async_callback(coro_fn)\`. Async managers are introduced in [async/await](/interview-question/how-does-async-await-work-in-python).

## 7. Which Tool When

| Situation | Use |
| :--- | :--- |
| 2 or 3 managers known when writing the code | \`with a as x, b as y:\` |
| Many managers, long names | the parenthesised form (3.10+) |
| Number of managers depends on data | \`ExitStack\` + \`enter_context\` in a loop |
| Cleanup is a plain function, not a manager | \`ExitStack.callback\` |
| Acquire a set now, release it later (in another method) | \`ExitStack\` + \`pop_all()\` |
| A manager is optional (sometimes no lock) | \`contextlib.nullcontext()\` in its slot |
| Async resources | \`async with a, b:\` or \`AsyncExitStack\` |

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — comma, nested and parenthesised forms; failures and suppression; look-alikes** prints:

~~~text
comma form:
    enter A
    enter B
    body uses A and B
    exit B (saw None)
    exit A (saw None)
nested form:
    enter A
    enter B
    body uses A and B
    exit B (saw None)
    exit A (saw None)
parenthesised form:
    enter A
    enter B
    enter C
    body
    exit C (saw None)
    exit B (saw None)
    exit A (saw None)
second __enter__ raises:
    enter A
    B enter FAILED
    exit A (saw OSError)
    caller caught: cannot open B
inner swallows the error:
    enter outer
    enter inner
    exit inner (saw ValueError)
    exit outer (saw None)
later manager uses earlier value:
    enter conn
    enter cursor-on-conn
    query via cursor-on-conn
    exit cursor-on-conn (saw None)
    exit conn (saw None)
tuple with as -> TypeError: 'tuple' object does not support the context manager protocol
and-chained:
    enter B
    only B was entered
    exit B (saw None)
~~~

**Example 2 — \`ExitStack\`: a run-time list, a failure part-way, callbacks and \`pop_all()\`** prints:

~~~text
ExitStack with 3 shards:
  open  s1
  open  s2
  open  s3
  working with ['<s1>', '<s2>', '<s3>']
  close s3
  close s2
  close s1

s3 is broken:
  open  s1
  open  s2
  close s2
  close s1
  caller caught: s3 is down

callbacks:
  body
  cleanup registered second, runs first
  cleanup registered first, runs last

pool built:
  open  p1
  open  p2
  pool is live: ['<p1>', '<p2>']
pool closed:
  close p2
  close p1
~~~

**What the output shows:**

- The comma form and the nested form produce the same five events in the same order.
- Every block exits in the reverse of the order it entered: \`C, B, A\` for three managers, \`s3, s2, s1\` in the \`ExitStack\`.
- A failure while entering the third shard closed only the two already open; nothing tried to close \`s3\` or touch \`s4\`.
- The two callbacks ran in reverse registration order, after the body.
- \`pop_all()\` let the pool outlive its constructor: \`p1\` and \`p2\` stayed open until \`pool.close()\`.

## 9. Edge Cases

- **A manager that returns \`None\` from \`__enter__\`** is fine in a multi-item \`with\`; just do not use \`as\` for it (common for locks: \`with lock, open(p) as f:\`).
- **Reusing one manager twice in the same line** (\`with lock, lock:\`) deadlocks for a non-reentrant \`threading.Lock\`, exactly like nesting would; \`RLock\` allows it.
- **\`ExitStack\` itself suppresses** an exception if any registered \`__exit__\` returns truthy; later (outer) callbacks then see no exception, as with nested \`with\`.
- **A callback that raises** inside \`ExitStack\` replaces the in-flight exception, with the original chained as \`__context__\`, the same as an \`__exit__\` that raises.

## Common Pitfalls

- **Opening N resources in a list comprehension.** A failure on item k leaks items 0 to k-1; use \`ExitStack.enter_context\`.
- **Writing \`with (a, b) as t:\`.** That is one tuple, which is not a context manager; put \`as\` next to each item inside the parentheses.
- **Chaining with \`and\`.** \`with a and b:\` enters only one object.
- **Putting a suppressing manager outside the one that must see the error.** The inner manager sees the exception first; if it swallows it, the outer transaction will commit.
- **Forgetting the stack after \`pop_all()\`.** The returned stack owns the cleanups; if you drop it without calling \`close()\`, nothing is closed.
- **Relying on parenthesised syntax on old interpreters.** It is official only from 3.10; libraries that support older versions must nest or use \`ExitStack\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The syntax:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with a() as x, b() as y:</code> is one statement that is exactly the same as nesting two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> blocks; since Python 3.10 you can wrap the list in parentheses and put one manager per line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The order:</strong> <span style="color:#f0e2c8;">Enter left to right, exit right to left, like a stack, so a later manager may use an earlier one, such as a cursor built from a connection.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Failure part-way:</strong> <span style="color:#f0e2c8;">If the second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code> raises, the first manager is still exited and the error reaches the caller; the manager that failed to enter gets no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code> call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Exceptions:</strong> <span style="color:#f0e2c8;">An error in the body reaches the innermost <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code> first; if that one suppresses it, the outer managers see a clean exit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dynamic count:</strong> <span style="color:#f0e2c8;">When the number of resources is only known at run time, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.ExitStack</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enter_context()</code> in a loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">callback()</code> for plain functions, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_all()</code> to hand ownership on once everything opened.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put the managers in a list and loop over them inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">with</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> statement takes a fixed number of managers written in the source. A list is not a context manager, and opening in a plain loop leaks the earlier ones if a later open fails. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExitStack</code> is the tool: it records each manager as it is entered and unwinds exactly those.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">with (open(a), open(b)) as t:</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The parentheses with a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> after them make one tuple expression, and a tuple is not a context manager: on 3.11 it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: 'tuple' object does not support the context manager protocol</code>. Put an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> inside the parentheses for each item instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ExitStack.pop_all()</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It moves every registered cleanup into a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExitStack</code> and leaves the current one empty, so leaving the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> block closes nothing. You open everything inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> (so a failure closes the ones already open), then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_all()</code> once all succeeded and keep that stack to close later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the comma form the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">contextlib.nested()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It replaced it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nested()</code> from the Python 2 era evaluated all the manager expressions before entering any of them, so a failure in the second constructor leaked the first. The comma form evaluates and enters each one in turn, which is why it is correct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you combine async context managers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same comma form works with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with a, b:</code> inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.AsyncExitStack</code> is the dynamic version, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enter_async_context()</code> for async managers and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_async_callback()</code> for coroutine cleanups.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Multiple-item with statement** | \`with a, b:\` — several managers in one statement, equivalent to nesting |
| **Parenthesised context managers** | the \`with (a as x, b as y):\` form spread over lines, official since 3.10 |
| **LIFO cleanup** | last in, first out: the last manager entered is the first exited |
| **Exception unwinding** | the exception passes through each entered \`__exit__\` from the innermost outwards |
| **ExitStack** | a context manager that collects other managers and callbacks at run time and closes them in reverse |
| **enter_context()** | \`ExitStack\` method: enter a manager now and register its \`__exit__\` |
| **callback()** | \`ExitStack\` method: register any function to run on exit |
| **pop_all()** | \`ExitStack\` method: move all registered cleanups to a new stack, so the current block closes nothing |
| **AsyncExitStack** | the async version of \`ExitStack\` for \`async with\` |

---
**Conclusion:** To manage several resources together, list them in one \`with\` statement: \`with a as x, b as y:\` is exactly nested \`with\` blocks, entered left to right and exited right to left, and since Python 3.10 the list can be wrapped in parentheses one per line. If a later manager fails to enter, the earlier ones are still cleaned up; if the body raises, the innermost manager sees it first and may suppress it. When the number of resources is only known at run time, \`contextlib.ExitStack\` gives the same guarantees dynamically: \`enter_context()\` in a loop, \`callback()\` for plain cleanup functions, and \`pop_all()\` for acquire-everything-or-nothing, with \`AsyncExitStack\` for the async case.`,
    examples: [
      { label: `Enter and exit order, failures part-way, suppression and look-alikes`, code: `events = []

class Res:
    def __init__(self, name, fail_on_enter=False, swallow=False):
        self.name = name
        self.fail_on_enter = fail_on_enter
        self.swallow = swallow

    def __enter__(self):
        if self.fail_on_enter:
            events.append(f"{self.name} enter FAILED")
            raise OSError(f"cannot open {self.name}")
        events.append(f"enter {self.name}")
        return self.name

    def __exit__(self, exc_type, exc, tb):
        seen = exc_type.__name__ if exc_type else "None"
        events.append(f"exit {self.name} (saw {seen})")
        return self.swallow


def show(title):
    print(title)
    for e in events:
        print("   ", e)
    events.clear()


# 1. One with statement, two managers: enter left to right, exit right to left
with Res("A") as a, Res("B") as b:
    events.append(f"body uses {a} and {b}")
show("comma form:")

# 2. Exactly the same as nesting
with Res("A") as a:
    with Res("B") as b:
        events.append(f"body uses {a} and {b}")
show("nested form:")

# 3. Parenthesised form, one manager per line (official since 3.10)
with (
    Res("A") as a,
    Res("B") as b,
    Res("C") as c,
):
    events.append("body")
show("parenthesised form:")

# 4. B fails while entering: A is already open, so A is still closed
try:
    with Res("A"), Res("B", fail_on_enter=True), Res("C"):
        events.append("body never runs")
except OSError as e:
    events.append(f"caller caught: {e}")
show("second __enter__ raises:")

# 5. The innermost manager sees the exception first and may swallow it
with Res("outer"), Res("inner", swallow=True):
    raise ValueError("bad row")
show("inner swallows the error:")

# 6. A later manager can use the earlier one
with Res("conn") as conn, Res(f"cursor-on-{conn}") as cur:
    events.append(f"query via {cur}")
show("later manager uses earlier value:")

# 7. Two look-alikes that are NOT multiple managers
try:
    with (Res("A"), Res("B")) as pair:   # one tuple object, not two managers
        pass
except TypeError as e:
    print("tuple with as -> TypeError:", e)
with Res("A") and Res("B") as which:     # "and" picks one object
    events.append(f"only {which} was entered")
show("and-chained:")` },
      { label: `ExitStack: run-time lists, partial failure, callbacks and pop_all`, code: `from contextlib import ExitStack, contextmanager

@contextmanager
def shard(name, broken=False):
    if broken:
        raise ConnectionError(f"{name} is down")
    print(f"  open  {name}")
    try:
        yield f"<{name}>"
    finally:
        print(f"  close {name}")

# 1. A number of managers only known at run time
names = ["s1", "s2", "s3"]
print("ExitStack with", len(names), "shards:")
with ExitStack() as stack:
    handles = [stack.enter_context(shard(n)) for n in names]
    print("  working with", handles)
print()

# 2. One failure in the middle: the ones already opened are closed
print("s3 is broken:")
try:
    with ExitStack() as stack:
        for n in ["s1", "s2", "s3", "s4"]:
            stack.enter_context(shard(n, broken=(n == "s3")))
except ConnectionError as e:
    print("  caller caught:", e)
print()

# 3. callback() registers any cleanup function, run in LIFO order too
print("callbacks:")
with ExitStack() as stack:
    stack.callback(print, "  cleanup registered first, runs last")
    stack.callback(print, "  cleanup registered second, runs first")
    print("  body")
print()

# 4. pop_all(): all-or-nothing acquisition that hands ownership on
class Pool:
    def __init__(self, names):
        with ExitStack() as stack:
            self.conns = [stack.enter_context(shard(n)) for n in names]
            # every open worked: keep them open past this with block
            self._stack = stack.pop_all()

    def close(self):
        self._stack.close()

print("pool built:")
pool = Pool(["p1", "p2"])
print("  pool is live:", pool.conns)
print("pool closed:")
pool.close()` },
    ],
  },
  {
    title: `What useful types does the collections module provide?`,
    difficulty: "medium",
    seoDescription: `Python collections module explained: Counter, defaultdict, namedtuple, deque, OrderedDict, ChainMap and UserDict, with gotchas and verified 3.11 output.`,
    description: `**Question presented to candidate:**
"Beyond list, dict, set and tuple, Python ships a \`collections\` module. Which types in it do you actually use, what problem does each one solve, and when would you pick it over a plain dict or list?"

**What a strong answer should cover:**
- \`Counter\` (counting, \`most_common\`, multiset arithmetic), \`defaultdict\` (a factory for missing keys), \`namedtuple\` (a tuple with field names), \`deque\` (O(1) at both ends, \`maxlen\`).
- \`OrderedDict\` still matters after dicts became ordered: \`move_to_end\`, \`popitem(last=False)\` and order-sensitive equality, the classic LRU building block.
- \`ChainMap\` (layered lookups over several dicts without copying) and \`UserDict\`/\`UserList\`/\`UserString\` (safe bases for subclassing, because a \`dict\` subclass's \`update()\` skips your \`__setitem__\`).
- Gotchas: reading a missing key creates it in a \`defaultdict\`; \`Counter\` subtraction drops zero and negative counts; \`namedtuple\` is immutable.
- A version fact: the ABC aliases such as \`collections.Mapping\` were removed in 3.10, so import them from \`collections.abc\`.

**Code / implementation expected:** Optional — short snippets per type, ideally a word count with \`Counter\` and grouping with \`defaultdict(list)\`.`,
    answer: `**Target Audience:** Python learners who know \`list\` and \`dict\` and want the tools that make everyday code shorter, up to candidates who need the gotchas and internals.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A kitchen can work with just bowls and boxes, the way Python can work with just \`list\` and \`dict\`. But a good kitchen also has a tally counter for counting guests, a spice rack that hands you an empty jar when you reach for a label nobody has filled yet, a conveyor belt you can load and unload from either end, and a stack of recipe cards where the top card overrides the ones underneath.

The \`collections\` module is that set of special-purpose containers. None of them is magic: each one is a few lines you would otherwise write by hand, every time, slightly wrong. Interviewers ask about it because reaching for \`Counter\` or \`defaultdict\` instead of hand-rolled loops is one of the clearest signs that someone writes idiomatic Python.

📌 **Interview term: collections module** — the standard-library module of specialised container datatypes that complement the built-in \`dict\`, \`list\`, \`set\` and \`tuple\`. On our 3.11 run, its public names were exactly: \`ChainMap\`, \`Counter\`, \`OrderedDict\`, \`UserDict\`, \`UserList\`, \`UserString\`, \`defaultdict\`, \`deque\`, \`namedtuple\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="The nine public types in collections grouped as dict variants, sequence types and subclassing wrappers">
  <rect class="d-box-accent" x="20" y="20" width="230" height="260" rx="12"/>
  <text class="d-text d-accent" x="135" y="54" text-anchor="middle">dict variants</text>
  <text class="d-text" x="135" y="98" text-anchor="middle">Counter</text>
  <text class="d-text" x="135" y="138" text-anchor="middle">defaultdict</text>
  <text class="d-text" x="135" y="178" text-anchor="middle">OrderedDict</text>
  <text class="d-text" x="135" y="218" text-anchor="middle">ChainMap</text>
  <text class="d-sub" x="135" y="256" text-anchor="middle">keyed lookups</text>
  <rect class="d-box" x="275" y="20" width="230" height="260" rx="12"/>
  <text class="d-text d-accent" x="390" y="54" text-anchor="middle">sequences</text>
  <text class="d-text" x="390" y="98" text-anchor="middle">deque</text>
  <text class="d-text" x="390" y="138" text-anchor="middle">namedtuple</text>
  <text class="d-sub" x="390" y="256" text-anchor="middle">ordered by position</text>
  <rect class="d-box-muted" x="530" y="20" width="230" height="260" rx="12"/>
  <text class="d-text d-accent" x="645" y="54" text-anchor="middle">wrappers</text>
  <text class="d-text" x="645" y="98" text-anchor="middle">UserDict</text>
  <text class="d-text" x="645" y="138" text-anchor="middle">UserList</text>
  <text class="d-text" x="645" y="178" text-anchor="middle">UserString</text>
  <text class="d-sub" x="645" y="256" text-anchor="middle">safe to subclass</text>
</svg>

The groups are a teaching aid, not an official classification: the four on the left are \`dict\` subclasses or dict-like mappings, the middle two keep items by position, and the right three exist to be subclassed.

## 2. \`Counter\` — Counting Things

~~~python
from collections import Counter
c = Counter("the cat and the hat and the bat".split())
c.most_common(2)     # [('the', 3), ('and', 2)]
c["dog"]             # 0  (missing keys count as zero, and are not inserted)
~~~

📌 **Interview term: Counter** — a \`dict\` subclass whose keys are items and whose values are their counts. It accepts any iterable or mapping, returns \`0\` for a missing key without inserting it, and adds \`most_common(n)\`, \`elements()\`, \`total()\`, \`update()\` (which *adds* counts) and \`subtract()\`.

📌 **Interview term: Multiset** — a "bag": like a set, but each element has a multiplicity. \`Counter\` supports multiset arithmetic: \`+\` adds counts, \`-\` subtracts and **drops anything at or below zero**, \`&\` takes the minimum of each count, \`|\` the maximum.

On equal counts, \`most_common()\` keeps the order elements were first seen: \`Counter('abracadabra').most_common()\` gave \`[('a', 5), ('b', 2), ('r', 2), ('c', 1), ('d', 1)]\` on our run.

## 3. \`defaultdict\` — Missing Keys Build Themselves

Grouping by hand needs a check on every item:

~~~python
groups = {}
for w in words:
    if len(w) not in groups:
        groups[len(w)] = []
    groups[len(w)].append(w)
~~~

With \`defaultdict(list)\` the check disappears: \`groups[len(w)].append(w)\`.

📌 **Interview term: defaultdict** — a \`dict\` subclass constructed with a \`default_factory\` (any zero-argument callable: \`list\`, \`set\`, \`int\`, a \`lambda\`). When \`d[key]\` finds no key, it calls the factory, **stores** the result under that key, and returns it.

📌 **Interview term: __missing__** — the hook behind it. \`dict.__getitem__\` calls \`self.__missing__(key)\` when a key is absent, if a subclass defines that method. \`defaultdict\` defines it. You can too: a \`dict\` subclass with \`def __missing__(self, k): return k * 2\` returned \`'abab'\` for \`M()['ab']\` in our run. \`Counter\` also uses \`__missing__\`, returning \`0\` without storing it.

The trap: since only \`d[key]\` calls the hook, *reading* a missing key with brackets inserts it (Example 1 shows \`{'ghost': 0}\` appearing after a mere comparison), while \`d.get(key)\` and \`key in d\` leave the dict alone.

## 4. \`namedtuple\` — Tuples With Field Names

~~~python
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"], defaults=[0])
p = Point(3)          # Point(x=3, y=0)
p.x, p[0]             # 3, 3
~~~

📌 **Interview term: namedtuple** — a factory function that creates a new \`tuple\` subclass whose fields can be read by name. Instances are real tuples: they unpack, index, compare equal to plain tuples and can be dict keys. They are immutable; \`p.x = 10\` raised \`AttributeError: can't set attribute\` on 3.11. Helpers: \`_replace()\`, \`_asdict()\`, \`_fields\`, \`_make()\`. The \`defaults=\` argument arrived in Python 3.7 (see the [namedtuple docs](https://docs.python.org/3/library/collections.html#collections.namedtuple)).

The class-syntax version with type hints is \`typing.NamedTuple\`. For mutable records with methods, use [dataclasses](/interview-question/what-are-dataclasses).

## 5. \`deque\` — A Queue That Is Fast at Both Ends

📌 **Interview term: deque** — "deck", a double-ended queue. \`append\`, \`appendleft\`, \`pop\` and \`popleft\` are O(1), while \`list.pop(0)\` and \`list.insert(0, x)\` shift every element and are O(n). \`deque(maxlen=n)\` keeps only the newest \`n\` items, which is a one-line sliding window or "last N events" buffer. Breadth-first search and producer/consumer queues use it. How it achieves that (a linked list of 64-slot blocks) is its own page: [how collections.deque works internally](/interview-question/how-does-collections-deque-work-internally).

## 6. \`OrderedDict\` — Still Useful After 3.7

Plain dicts keep insertion order as a language guarantee since 3.7 ([details](/interview-question/how-are-python-dictionaries-implemented-and-ordered)), so the original reason for \`OrderedDict\` is gone. What remains:

📌 **Interview term: OrderedDict** — a dict subclass with order-manipulating methods: \`move_to_end(key, last=True)\` moves a key to either end, and \`popitem(last=False)\` pops the *oldest* entry. Equality between two \`OrderedDict\`s is order-sensitive.

Those two methods are exactly what a least-recently-used cache needs: on access, move the key to the end; when full, pop from the front. See [how an LRU cache works internally](/interview-question/how-does-an-lru-cache-work-internally) and the stdlib's [functools.lru_cache](/interview-question/how-does-functools-lru-cache-work).

| | \`dict\` | \`OrderedDict\` |
| :--- | :--- | :--- |
| Keeps insertion order | Yes (3.7+) | Yes |
| \`move_to_end()\` | No | Yes |
| \`popitem()\` | LIFO only | \`last=True\` LIFO or \`last=False\` FIFO |
| \`d1 == d2\` with same items, different order | \`True\` | \`False\` (if both are \`OrderedDict\`) |
| \`sys.getsizeof\` of 100 int keys (our 64-bit 3.11 run) | 4688 bytes | 10000 bytes (it also keeps a linked list of keys) |

## 7. \`ChainMap\` — Layers of Dicts

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="ChainMap lookup checks the cli dict, then env, then defaults, and returns the first hit">
  <defs>
    <marker id="py15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="60" width="150" height="76" rx="10"/>
  <text class="d-text" x="95" y="92" text-anchor="middle">lookup</text>
  <text class="d-sub" x="95" y="116" text-anchor="middle">config[key]</text>
  <path class="d-edge-accent" d="M 178 98 L 232 98" marker-end="url(#py15q3-arrow)"/>
  <rect class="d-box" x="240" y="60" width="150" height="76" rx="10"/>
  <text class="d-text" x="315" y="92" text-anchor="middle">cli</text>
  <text class="d-sub" x="315" y="116" text-anchor="middle">writes go here</text>
  <path class="d-edge-dashed" d="M 398 98 L 452 98" marker-end="url(#py15q3-arrow)"/>
  <rect class="d-box" x="460" y="60" width="130" height="76" rx="10"/>
  <text class="d-text" x="525" y="92" text-anchor="middle">env</text>
  <text class="d-sub" x="525" y="116" text-anchor="middle">if missing</text>
  <path class="d-edge-dashed" d="M 598 98 L 632 98" marker-end="url(#py15q3-arrow)"/>
  <rect class="d-box-muted" x="640" y="60" width="120" height="76" rx="10"/>
  <text class="d-text" x="700" y="92" text-anchor="middle">defaults</text>
  <text class="d-sub" x="700" y="116" text-anchor="middle">last resort</text>
</svg>

📌 **Interview term: ChainMap** — a mapping that holds a list of other mappings in \`.maps\` and looks a key up in each in turn, returning the first hit. Nothing is copied, so later edits to any layer are visible immediately. Writes, updates and deletions go to the **first** mapping only, and \`new_child()\` returns a new \`ChainMap\` with a fresh dict pushed on the front, which models nested scopes.

The classic use is configuration with precedence: command-line flags over environment variables over defaults. In Example 2 a write to \`config["theme"]\` landed in \`cli\`, and changing \`env["user"]\` changed \`config["user"]\` without rebuilding anything. A side effect worth knowing: \`del cm["a"]\` only deletes from the first map, so a lower layer's \`a\` shows through (on our run, deleting from \`ChainMap({'a': 1}, {'a': 2})\` left \`cm['a'] == 2\`).

## 8. \`UserDict\`, \`UserList\`, \`UserString\` — Safe Subclassing

Subclassing \`dict\` and overriding \`__setitem__\` looks like it should intercept every write. It does not: the C implementation of \`dict.__init__\` and \`dict.update()\` insert directly, without calling your Python method. Example 2's \`LowerDict\` lower-cases keys set with \`ld["B"] = 2\` but not ones passed to the constructor or \`update()\`, giving \`['A', 'C', 'b']\`.

📌 **Interview term: UserDict / UserList / UserString** — pure-Python wrapper classes that keep the real container in a \`.data\` attribute and implement every method in terms of a few core ones such as \`__setitem__\`. Overriding one method therefore changes the behaviour everywhere: the \`UserDict\` version gave \`['a', 'b', 'c']\`. The price is speed, since every operation goes through Python code.

The alternative is to inherit from an abstract base class like \`collections.abc.MutableMapping\` and implement the five abstract methods yourself; see [abstract base classes and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols).

📌 **Interview term: collections.abc** — the submodule with the container ABCs (\`Iterable\`, \`Sequence\`, \`Mapping\`, \`MutableMapping\` ...). Old code that did \`from collections import Mapping\` breaks on 3.10 and later: those aliases, deprecated since 3.3, were removed in 3.10 ([bpo-37324](https://bugs.python.org/issue37324)). On our 3.11 run, \`hasattr(collections, "Mapping")\` was \`False\`.

## 9. Which One When

| Need | Reach for | Instead of |
| :--- | :--- | :--- |
| Count occurrences, top-k frequent | \`Counter\` | a dict plus \`get(k, 0) + 1\` |
| Group items by a key | \`defaultdict(list)\` | \`if k not in d: d[k] = []\` |
| Lightweight immutable record | \`namedtuple\` / \`typing.NamedTuple\` | a plain tuple with magic indexes |
| FIFO queue, BFS, sliding window | \`deque\` (with \`maxlen\`) | \`list.pop(0)\` |
| LRU cache, reorder by access | \`OrderedDict\` | manual bookkeeping |
| Layered config or scopes | \`ChainMap\` | repeatedly merging dicts |
| Custom dict with overridden writes | \`UserDict\` or \`MutableMapping\` | subclassing \`dict\` |

Neighbouring tools often asked in the same breath: [functools](/interview-question/what-does-the-functools-module-offer), [itertools](/interview-question/what-is-the-itertools-module-used-for), [heapq](/interview-question/how-does-heapq-work-in-python) and [bisect](/interview-question/how-does-the-bisect-module-work).

## 10. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — \`Counter\`, \`defaultdict\` and \`namedtuple\`** prints:

~~~text
[('the', 3), ('and', 2)]
0
False
8
Counter({'b': 4, 'a': 3, 'c': 3, 'd': 1})
Counter({'b': 2, 'a': 1})
Counter({'a': 1, 'b': 1, 'c': 1})
{2: ['ox'], 3: ['cat', 'emu', 'yak', 'ant', 'gnu'], 5: ['zebra', 'horse']}
['apple', 'avocado']
{'ghost': 0}
None False
Point(x=3, y=0)
3 3 True
Point(x=3, y=4)
{'x': 3, 'y': 0}
('x', 'y')
AttributeError: can't set attribute
~~~

**Example 2 — \`deque\`, \`OrderedDict\`, \`ChainMap\` and \`UserDict\` vs a \`dict\` subclass** prints:

~~~text
deque([1, 2, 3, 4])
1 4
deque([7, 8, 9], maxlen=3)
['b', 'c', 'd', 'a']
['d', 'b', 'c', 'a']
('d', None)
True
False
arvind red True
{'debug': True, 'theme': 'dark'}
{'color': 'red', 'debug': True, 'theme': 'dark', 'user': 'arvind'}
root
['A', 'C', 'b']
['a', 'b', 'c']
~~~

**What the output shows:**

- \`Counter("aabbbc") - Counter("abccd")\` kept only the positive results, \`b: 2\` and \`a: 1\`; \`c\` went to zero and disappeared.
- \`defaultdict(list)\` grouped words by length with no key checks, and a bracket read inserted \`'ghost'\` while \`.get()\` and \`in\` did not insert \`'phantom'\`.
- The \`namedtuple\` compared equal to the plain tuple \`(3, 0)\`, and assignment to a field failed.
- \`deque(range(10), maxlen=3)\` kept the last three items; \`OrderedDict\` moved keys to either end and popped the oldest.
- Two dicts with the same items in different orders are equal; the same two as \`OrderedDict\`s are not.
- The \`dict\` subclass missed two of three writes; the \`UserDict\` subclass caught all three.

## 11. Edge Cases

- \`Counter\` accepts negative and zero counts if you set them directly; \`+c\` (unary plus) strips them, and \`elements()\` skips them.
- \`defaultdict(list)\` prints with its factory: \`repr\` shows \`defaultdict(<class 'list'>, {...})\`; wrap in \`dict()\` for clean output or JSON.
- \`defaultdict(None)\` (or no argument) behaves like a plain dict and raises \`KeyError\`.
- A \`namedtuple\` field name cannot start with an underscore or be a keyword unless you pass \`rename=True\`, which replaces bad names with \`_0\`, \`_1\` ...
- \`ChainMap\` length and iteration cover the union of keys across all maps, each key once.

## Common Pitfalls

- **Testing membership with brackets on a \`defaultdict\`.** \`if d[k]:\` inserts \`k\`; use \`k in d\` or \`d.get(k)\`.
- **Expecting \`Counter\` subtraction to keep negatives.** The \`-\` operator drops counts at or below zero; use \`subtract()\` if you need them.
- **Subclassing \`dict\` and overriding \`__setitem__\`.** The constructor and \`update()\` bypass it; use \`UserDict\` or \`MutableMapping\`.
- **Importing ABCs from \`collections\`.** \`from collections import Mapping\` raises \`ImportError\` on 3.10+; use \`collections.abc\`.
- **Using \`list.pop(0)\` as a queue.** That is O(n) per pop; use \`deque.popleft()\`.
- **Assuming \`OrderedDict == dict\` checks order.** With a plain dict on either side the comparison ignores order.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Counting and grouping:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> counts hashable things and gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">most_common(n)</code> plus multiset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code> builds a value for a missing key so grouping is one line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Records and queues:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> is an immutable tuple with named fields and almost no overhead; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> is a double-ended queue with O(1) appends and pops at both ends and an optional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxlen</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Ordered and layered dicts:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict</code> adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code> and order-sensitive equality, which is why it is the textbook LRU base; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChainMap</code> searches several dicts in order without copying them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Subclassing:</strong> <span style="color:#f0e2c8;">Subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UserDict</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UserList</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UserString</code> rather than the built-ins when you override methods, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.update()</code> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> constructor bypass an overridden <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setitem__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotchas:</strong> <span style="color:#f0e2c8;">Reading a missing key in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict</code> inserts it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> subtraction drops counts at or below zero, and the ABCs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Mapping</code> live in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.abc</code> (the old aliases were removed in 3.10).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Plain dicts keep insertion order now. Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OrderedDict</code> still exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It has operations a dict lacks: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end(key, last=False)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code> to pop the oldest item in O(1), which together make an LRU cache. Its equality also checks order against another <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict</code> (our run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> for the same items in a different order), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict(a=1) == {'a': 1}</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> because a plain dict on either side makes the comparison order-blind.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Counter.subtract()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">c1 - c2</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subtract()</code> updates in place and keeps zero and negative counts (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter(a=1)</code> minus 3 gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter({'a': -2})</code> in our run); the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-</code> operator returns a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> that keeps only positive counts. Similarly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter.update()</code> adds counts, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.update()</code> replaces values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defaultdict</code> implemented?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> subclass that defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__missing__</code>, a hook <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.__getitem__</code> calls when a key is absent. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict.__missing__</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default_factory()</code>, stores the result and returns it. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[key]</code> triggers it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d.get(key)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key in d</code> do not, so they do not insert.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">namedtuple</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dataclass</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> when you want an immutable, tuple-compatible record (unpacking, indexing, use as a dict key, a cheap return value). A dataclass when you want mutability, defaults with factories, methods, validation in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__post_init__</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slots=True</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.NamedTuple</code> is the class-syntax version of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> with type hints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ChainMap</code> better than merging dicts with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{**a, **b}</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the layers must stay live or are large. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChainMap</code> copies nothing, sees later changes to any layer (our run changed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">env</code> and the lookup changed with it), writes only to the first map, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new_child()</code> pushes a fresh scope, which is how nested scopes or CLI over env over defaults configs are modelled.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **collections module** | the stdlib module of specialised container types beyond the built-ins |
| **Counter** | a \`dict\` subclass mapping items to counts, with \`most_common\` and multiset arithmetic |
| **Multiset** | a set that allows repeats, each element with a count |
| **defaultdict** | a \`dict\` subclass that calls \`default_factory()\` to create a missing key's value |
| **__missing__** | a hook \`dict.__getitem__\` calls on a missing key in a subclass |
| **namedtuple** | a factory that builds a tuple subclass with named fields |
| **deque** | a double-ended queue with O(1) appends and pops at both ends |
| **OrderedDict** | a dict with order-moving operations and order-sensitive equality |
| **ChainMap** | a view that searches several mappings in order, writing to the first |
| **UserDict / UserList / UserString** | pure-Python wrappers around a real container in \`.data\`, designed for subclassing |
| **collections.abc** | the module holding the abstract base classes such as \`Mapping\` and \`Sequence\` |

---
**Conclusion:** The \`collections\` module is nine purpose-built containers. \`Counter\` counts and does multiset arithmetic, \`defaultdict\` creates missing values through \`__missing__\`, \`namedtuple\` gives tuples named fields, and \`deque\` is the O(1)-at-both-ends queue with an optional \`maxlen\`. \`OrderedDict\` survives ordered dicts because of \`move_to_end\`, \`popitem(last=False)\` and order-sensitive equality; \`ChainMap\` layers dicts without copying; and \`UserDict\`, \`UserList\` and \`UserString\` are the safe bases when you override methods. Know the gotchas — bracket reads insert into a \`defaultdict\`, \`Counter\` subtraction drops non-positive counts, and the ABCs live in \`collections.abc\` — and you have the answer an interviewer is looking for.`,
    examples: [
      { label: `Counter, defaultdict and namedtuple in action`, code: `from collections import Counter, defaultdict, namedtuple

# Counter: a dict that counts. Missing keys read as 0.
words = "the cat and the hat and the bat".split()
c = Counter(words)
print(c.most_common(2))  # [('the', 3), ('and', 2)]
print(c["dog"])  # 0
print("dog" in c)  # False
print(c.total())  # 8

# Counters add, subtract and intersect like multisets
a = Counter("aabbbc")
b = Counter("abccd")
print(a + b)  # Counter({'b': 4, 'a': 3, 'c': 3, 'd': 1})
print(a - b)  # Counter({'b': 2, 'a': 1})
print(a & b)  # Counter({'a': 1, 'b': 1, 'c': 1})

# defaultdict: calls a factory to build the value of a missing key
groups = defaultdict(list)
for w in ["ox", "cat", "emu", "yak", "zebra", "ant", "gnu", "horse"]:
    groups[len(w)].append(w)
print(dict(groups))  # {2: ['ox'], 3: ['cat', 'emu', 'yak', 'ant', 'gnu'], 5: ['zebra', 'horse']}

by_letter = defaultdict(set)
for w in ["apple", "avocado", "banana", "apple"]:
    by_letter[w[0]].add(w)
print(sorted(by_letter["a"]))  # ['apple', 'avocado']

# Gotcha: merely reading a missing key creates it
seen = defaultdict(int)
if seen["ghost"] == 0:
    pass
print(dict(seen))  # {'ghost': 0}
print(seen.get("phantom"), "phantom" in seen)  # None False

# namedtuple: a tuple whose fields also have names
Point = namedtuple("Point", ["x", "y"], defaults=[0])
p = Point(3)
print(p)  # Point(x=3, y=0)
print(p.x, p[0], p == (3, 0))  # 3 3 True
print(p._replace(y=4))  # Point(x=3, y=4)
print(p._asdict())  # {'x': 3, 'y': 0}
print(Point._fields)  # ('x', 'y')

# Immutable like any tuple, so it can be a dict key
try:
    p.x = 10
except AttributeError as e:
    print("AttributeError:", e)` },
      { label: `deque, OrderedDict, ChainMap, and UserDict vs a dict subclass`, code: `from collections import deque, OrderedDict, ChainMap, UserDict

# deque: fast appends and pops at both ends
q = deque([2, 3])
q.appendleft(1)
q.append(4)
print(q)
print(q.popleft(), q.pop())
last3 = deque(range(10), maxlen=3)
print(last3)  # deque([7, 8, 9], maxlen=3)

# OrderedDict: order-aware extras that plain dict does not have
od = OrderedDict.fromkeys("abcd")
od.move_to_end("a")
print(list(od))
od.move_to_end("d", last=False)
print(list(od))
print(od.popitem(last=False))

# Equality: OrderedDict compares order, dict does not
d1, d2 = {"x": 1, "y": 2}, {"y": 2, "x": 1}
print(d1 == d2)  # True
print(OrderedDict(d1) == OrderedDict(d2))  # False

# ChainMap: look through several dicts without copying them
defaults = {"color": "red", "user": "guest", "debug": False}
env = {"user": "arvind"}
cli = {"debug": True}
config = ChainMap(cli, env, defaults)
print(config["user"], config["color"], config["debug"])
config["theme"] = "dark"
print(cli)  # {'debug': True, 'theme': 'dark'}
print(dict(sorted(config.items())))
env["user"] = "root"
print(config["user"])  # root

# Subclassing dict: update() and the constructor skip your __setitem__
class LowerDict(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

ld = LowerDict({"A": 1})
ld["B"] = 2
ld.update({"C": 3})
print(sorted(ld))  # ['A', 'C', 'b']

# UserDict routes every write through __setitem__
class LowerUserDict(UserDict):
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

ud = LowerUserDict({"A": 1})
ud["B"] = 2
ud.update({"C": 3})
print(sorted(ud))  # ['a', 'b', 'c']` },
    ],
  },
  {
    title: `How does collections.deque work internally?`,
    difficulty: "medium",
    seoDescription: `How CPython implements collections.deque: a doubly linked list of 64-slot blocks, O(1) ends, O(n) middle, maxlen and rotate, shown with verified 3.11 runs.`,
    description: `**Question presented to candidate:**
"Everyone says use a deque instead of a list for a queue. Why? What does a deque look like in memory in CPython, and what does that layout make cheap and what does it make expensive?"

**What a strong answer should cover:**
- Layout: a doubly linked list of fixed-size blocks (64 item slots each in CPython), plus \`leftblock\`/\`leftindex\` and \`rightblock\`/\`rightindex\` pointing at the two ends; never one big contiguous array.
- Cost: \`append\`, \`appendleft\`, \`pop\`, \`popleft\` are O(1) and never move other items or call \`realloc\`; a new block is allocated only every 64 pushes on a side.
- Contrast with \`list\`: \`list.pop(0)\` and \`insert(0, x)\` shift every element (O(n)), but a list indexes any position in O(1) while \`deque[i]\` walks blocks, so the middle is O(n).
- Extras that fall out of the layout: \`maxlen\` (bounded, evicts from the opposite end), \`rotate(k)\`, no slicing, and "deque mutated during iteration" detection.
- Why blocks instead of one node per item: far less pointer overhead and far fewer \`malloc\` calls; spare blocks are kept on a small free list.
- Thread safety: the docs describe appends and pops from either end as thread-safe.

**Code / implementation expected:** Optional — demonstrating O(1) ends vs \`list.pop(0)\`, \`maxlen\`, or sketching the block structure.`,
    answer: `**Target Audience:** Developers who use \`deque\` as "the fast queue" and want to explain why, up to candidates expected to describe the CPython data structure.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); the block-growth numbers were identical on python3.13.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a queue of people standing on painted floor squares in a long hall, one person per square, starting at the very first square. When the person at the front is served, everybody behind them has to step forward one square. With five people that is fine. With ten thousand, every single "next, please" makes ten thousand people shuffle.

Now imagine the hall instead has short benches of 64 seats, linked by small corridors. People sit from the middle of a bench outwards. When the front person leaves, their seat simply becomes empty; nobody moves. When a bench fills up at the back, a new bench is wheeled in and connected. Joining or leaving at either end is always the same tiny amount of work.

The first hall is a Python \`list\` used as a queue. The second is \`collections.deque\`. The catch with benches: finding "person number 5,000" means walking bench by bench, while in the painted-square hall you can jump straight to square 5,000.

## 2. The Problem: a List Is One Contiguous Array

📌 **Interview term: Contiguous array** — one unbroken run of memory. A \`list\` stores pointers to its items in a single array, so \`lst[i]\` is a single address calculation, O(1). (How that array grows is explained in [how a list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).)

The same layout makes the front expensive: \`lst.pop(0)\` and \`lst.insert(0, x)\` must move every other pointer by one slot, O(n). On our 3.11 run, 100,000 rounds of \`append\` + \`pop(0)\` on a 100,000-item list took about 1.9 seconds; the same rounds with \`append\` + \`popleft()\` on a deque took about 0.009 seconds. The official documentation makes the same contrast: lists incur O(n) memory movement for \`pop(0)\` and \`insert(0, v)\`, while deques support "thread-safe, memory efficient appends and pops from either side of the deque with approximately the same O(1) performance in either direction" ([collections docs](https://docs.python.org/3/library/collections.html#collections.deque)).

📌 **Interview term: Deque** — pronounced "deck", short for double-ended queue: a sequence built for fast insertion and removal at **both** ends.

## 3. The Layout: a Doubly Linked List of Blocks

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="A deque header points at the left and right blocks of a doubly linked chain of 64 slot blocks">
  <defs>
    <marker id="py15q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="290" y="16" width="220" height="80" rx="10"/>
  <text class="d-text" x="400" y="48" text-anchor="middle">deque header</text>
  <text class="d-sub" x="400" y="74" text-anchor="middle">len, maxlen, state</text>
  <path class="d-edge-accent" d="M 330 100 L 136 182" marker-end="url(#py15q4-arrow)"/>
  <text class="d-sub d-accent" x="150" y="122" text-anchor="middle">leftblock</text>
  <path class="d-edge-accent" d="M 470 100 L 664 182" marker-end="url(#py15q4-arrow)"/>
  <text class="d-sub d-accent" x="650" y="122" text-anchor="middle">rightblock</text>
  <rect class="d-box" x="20" y="190" width="180" height="84" rx="10"/>
  <text class="d-text" x="110" y="224" text-anchor="middle">block</text>
  <text class="d-sub" x="110" y="250" text-anchor="middle">used from leftindex</text>
  <path class="d-edge" d="M 208 220 L 302 220" marker-end="url(#py15q4-arrow)"/>
  <path class="d-edge" d="M 302 246 L 208 246" marker-end="url(#py15q4-arrow)"/>
  <rect class="d-box" x="310" y="190" width="180" height="84" rx="10"/>
  <text class="d-text" x="400" y="224" text-anchor="middle">block</text>
  <text class="d-sub" x="400" y="250" text-anchor="middle">all 64 slots full</text>
  <path class="d-edge" d="M 498 220 L 592 220" marker-end="url(#py15q4-arrow)"/>
  <path class="d-edge" d="M 592 246 L 498 246" marker-end="url(#py15q4-arrow)"/>
  <rect class="d-box" x="600" y="190" width="180" height="84" rx="10"/>
  <text class="d-text" x="690" y="224" text-anchor="middle">block</text>
  <text class="d-sub" x="690" y="250" text-anchor="middle">used to rightindex</text>
</svg>

In CPython (\`Modules/_collectionsmodule.c\`), a deque is a chain of blocks.

📌 **Interview term: Block** — a fixed-size C struct holding an array of item pointers plus a \`leftlink\` and a \`rightlink\` to its neighbours. The deque header points at the leftmost and rightmost blocks.

📌 **Interview term: BLOCKLEN** — the number of item slots per block, \`#define BLOCKLEN 64\` in CPython, with \`CENTER\` defined as \`(BLOCKLEN - 1) / 2\`, which is 31 ([source mirror](https://llvm.googlesource.com/third_party/cpython/+/refs/heads/main/Modules/_collectionsmodule.c)).

📌 **Interview term: leftindex / rightindex** — the slot of the first item in the left block and the last item in the right block. Items live in \`leftblock->data[leftindex]\` through \`rightblock->data[rightindex]\`, and every block between the two is full.

The source comments state the design rules: the chain of blocks is never empty (so the two block pointers are never NULL), it is not circular, and appends or pops never move any other element. They also give the reason for blocks instead of one node per item: a per-item node would carry two link pointers per data pointer (about 200% overhead) and need a \`malloc()\` per push; fixed-length blocks cut both.

You can watch the blocks being allocated with \`sys.getsizeof\`, which counts the header plus every block. Example 1 records the item counts at which the size jumps:

~~~text
append allocates a new block at item: [33, 97, 161, 225, 289]
block size in pointers: 66 = 64 item slots + 2 links
appendleft allocates at item: [33, 97, 161, 225, 289]
~~~

That pattern is the \`CENTER\` rule in action. An empty deque already owns one block, with its indexes set to the middle (\`leftindex = CENTER + 1 = 32\`, \`rightindex = CENTER = 31\`). Pushing right fills slots 32 to 63, so the 33rd \`append\` needs a second block; after that, a new block every 64 items. Pushing left fills slots 31 down to 0, so \`appendleft\` also gets 32 items free. Starting in the middle means a deque used from either side, or both, wastes at most half a block. Each jump is 66 pointers: 64 slots plus the two links (528 bytes on a 64-bit build, 264 on a 32-bit build such as the browser runtime — which is why the example prints pointer counts, not bytes).

📌 **Interview term: Free list** — blocks released when a side empties are not always returned to the memory allocator: CPython keeps a small cache of spare blocks for reuse (\`MAXFREEBLOCKS\`, 16 in current sources per the same file). Popping everything gives the blocks back, and \`sys.getsizeof\` returns to the empty-deque size, as Example 1 shows.

## 4. Watching the Indexes Move

Example 2 is a pure-Python model of the same algorithm with 4-slot blocks so the whole structure fits on one line. \`.\` is an empty slot:

~~~text
empty             [. . . .] left=2 right=1 len=0
append 1, 2       [. . 1 2] left=2 right=3 len=2
append 3          [. . 1 2] <-> [3 . . .] left=2 right=0 len=3
appendleft 0..-2  [. . . -2] <-> [-1 0 1 2] <-> [3 . . .] left=3 right=0 len=6
~~~

Read it step by step:

1. **Empty:** one block; \`leftindex\` is one past \`rightindex\`, both in the middle (with \`BLOCKLEN = 4\`, \`CENTER\` is 1).
2. **\`append\`** increments \`rightindex\` and stores the item. When \`rightindex\` is already the last slot, a new block is linked on the right and \`rightindex\` restarts at 0.
3. **\`appendleft\`** is the mirror image: decrement \`leftindex\`; when it is already 0, link a new block on the left and continue from its last slot.
4. **\`popleft\`** clears the slot and increments \`leftindex\`; when the left block becomes empty it is unlinked (and in CPython, either cached on the free list or freed).

Every operation touches one slot and at most one block link: that is the O(1).

## 5. What the Layout Makes Expensive

📌 **Interview term: Amortised O(1)** — constant cost on average over a long run of operations. \`list.append\` is amortised O(1) (occasionally it reallocates and copies everything). Deque pushes are O(1) in a stricter sense: allocating one new block is a fixed amount of work, and existing items never move.

But there is no address arithmetic from "item i" to a memory location, so:

| Operation | \`list\` | \`deque\` |
| :--- | :--- | :--- |
| \`append(x)\` / \`pop()\` at the right | amortised O(1) | O(1) |
| \`insert(0, x)\` / \`pop(0)\` vs \`appendleft(x)\` / \`popleft()\` | O(n) | O(1) |
| \`x[0]\`, \`x[-1]\` | O(1) | O(1) |
| \`x[i]\` in the middle | O(1) | O(n), walks blocks from the nearer end |
| \`x[a:b]\` slicing | O(b - a) | not supported: \`TypeError: sequence index must be integer, not 'slice'\` |
| \`insert(i, x)\`, \`del x[i]\`, \`remove(x)\` | O(n) | O(n) |
| \`x in seq\` | O(n) | O(n) |
| \`rotate(k)\` | n/a (slice and concat, O(n)) | O(k) |
| sort in place | \`lst.sort()\` | not available; use \`sorted(d)\` |

How slow is the middle? On our run with a million items, \`d[10]\` and \`d[-10]\` took about 0.03 to 0.04 microseconds, \`d[100_000]\` about 4, \`d[900_000]\` about 3, and positions near the middle 15 to 22 microseconds, while \`lst[500_000]\` on a list stayed at about 0.05. The cost grows towards the middle from both sides, which is the walk-from-the-nearer-end behaviour. The exact numbers vary by machine; the shape — fast ends, slow middle — does not.

Membership with \`in\` is linear for both; if you need fast lookups as well as queue order, pair the deque with a set or use a dict ([how a set finds items](/interview-question/how-does-a-python-set-find-items)).

## 6. Features That Fall Out of the Design

- **\`maxlen\`.** 📌 **Interview term: Bounded deque** — \`deque(iterable, maxlen=n)\` never holds more than \`n\` items: once full, \`append\` silently discards from the left and \`appendleft\` discards from the right. Example 1 keeps the last three events and then shows \`appendleft("start")\` pushing \`logout\` out of the right side. \`maxlen\` is read-only after creation (\`d.maxlen\` is \`None\` for an unbounded deque).
- **\`rotate(k)\`.** Moves \`k\` items from the right end to the left (negative \`k\` goes the other way). Because it is just pops and pushes at the ends, it is O(k), not O(n). Example 1: \`rotate(2)\` on \`1..7\` gives \`[6, 7, 1, 2, 3, 4, 5]\`.
- **Mutation detection.** The deque keeps a state counter that every push or pop changes; the iterator checks it and raises \`RuntimeError: deque mutated during iteration\` rather than returning garbage.
- **\`extend\` and \`extendleft\`.** \`extendleft(iterable)\` pushes items one at a time to the left, so the result is reversed: \`deque([3]).extendleft([1, 2])\` gives \`deque([2, 1, 3])\`.
- **Thread-safe ends.** The docs describe appends and pops from either side as thread-safe. For a real producer and consumer setup prefer \`queue.Queue\`, which adds blocking \`get()\`/\`put()\` (see [the GIL](/interview-question/what-is-the-global-interpreter-lock-gil) and [race conditions](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it)).

The deque is also the standard queue for breadth-first search and for sliding-window algorithms. It sits in the same module as the other containers covered in [the collections module](/interview-question/what-useful-types-does-the-collections-module-provide).

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical, because Example 1 prints counts and pointer multiples rather than byte sizes.

**Example 1 — block growth, O(1) ends, rotate, maxlen and mutation detection** prints:

~~~text
append allocates a new block at item: [33, 97, 161, 225, 289]
block size in pointers: 66 = 64 item slots + 2 links
appendleft allocates at item: [33, 97, 161, 225, 289]
size after popping all equals empty deque: True
blocks freed: 15
deque(['a', 'b', 'c', 'd', 'e'])
a e deque(['b', 'c', 'd'])
rotate(2):  [6, 7, 1, 2, 3, 4, 5]
rotate(-3): [2, 3, 4, 5, 6, 7, 1]
deque(['click', 'buy', 'logout'], maxlen=3)
deque(['start', 'click', 'buy'], maxlen=3)
0 99 50
RuntimeError: deque mutated during iteration
~~~

**Example 2 — a toy model of the block layout with 4-slot blocks** prints:

~~~text
empty             [. . . .] left=2 right=1 len=0
append 1, 2       [. . 1 2] left=2 right=3 len=2
append 3          [. . 1 2] <-> [3 . . .] left=2 right=0 len=3
appendleft 0..-2  [. . . -2] <-> [-1 0 1 2] <-> [3 . . .] left=3 right=0 len=6
popleft -> -2 -1
after 2 pops      [. 0 1 2] <-> [3 . . .] left=1 right=0 len=4
~~~

**What the output shows:**

- New blocks appear at the 33rd item, then every 64, from either side: the middle start (\`CENTER\`) and the 64-slot block size, seen from outside.
- Each block is 66 pointers wide: 64 data slots and 2 links.
- \`deque(range(1000))\` then popping everything freed 15 blocks. On our runs, building a deque from an iterable while it is empty filled its first block from slot 1 rather than the middle (63 items fit before a second block: \`deque(range(63))\` used one block and \`deque(range(64))\` two), so 1000 items needed 16 blocks; one always stays, so 15 were released.
- The toy model shows the same rules: indexes move, items do not, and blocks are linked or unlinked only at the ends.

## 8. Edge Cases

- **Empty pops.** \`pop()\` and \`popleft()\` on an empty deque raise \`IndexError\`, as \`list.pop()\` does.
- **\`maxlen=0\`** makes a deque that accepts and immediately discards everything.
- **Equality** compares items in order, and a deque is never equal to a list with the same items (\`deque([1]) == [1]\` is \`False\`).
- **\`copy.copy(d)\` / \`d.copy()\`** is a shallow copy that keeps \`maxlen\`.
- **Pickling and \`repr\`** both include \`maxlen\` when set, so a bounded deque round-trips as bounded.

## Common Pitfalls

- **Using a list as a FIFO queue.** \`list.pop(0)\` is O(n); on our run it was about 220 times slower than \`deque.popleft()\` at 100,000 items.
- **Indexing a deque like an array.** \`d[i]\` in a loop over the middle turns an O(n) loop into O(n²); use a list for random access.
- **Trying to slice.** \`d[1:3]\` raises \`TypeError\`; use \`itertools.islice(d, 1, 3)\` or convert to a list.
- **Forgetting that \`maxlen\` drops silently.** Nothing warns you when old items fall off; that is the feature, but not if you expected an error.
- **Mutating while iterating.** Appending inside \`for x in d\` raises \`RuntimeError\`; iterate over a copy or use a \`while d: d.popleft()\` loop.
- **Treating "thread-safe appends" as "a thread-safe queue".** Checking \`if d:\` and then \`d.popleft()\` from two threads is still a race; use \`queue.Queue\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Layout:</strong> <span style="color:#f0e2c8;">In CPython a deque is a doubly linked list of fixed-size blocks, each an array of 64 item pointers plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftlink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightlink</code>; the header keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftblock</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftindex</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightblock</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightindex</code> for the two ends.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why ends are O(1):</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> writes into the next free slot of the right block, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appendleft</code> into the previous slot of the left block; only when a block is full is a new one linked on, so no other item ever moves and nothing is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">realloc</code>ed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Versus list:</strong> <span style="color:#f0e2c8;">A list is one contiguous array: O(1) indexing anywhere and amortised O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(0, x)</code> shift every element, so they are O(n). On our run 100,000 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> calls on a 100,000-item list took about 220 times longer than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[i]</code> must walk block by block from the nearer end, so the ends are fast and the middle is O(n); there is no slicing, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del d[i]</code> in the middle are O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxlen</code> makes it a bounded buffer that evicts from the opposite end, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotate(k)</code> moves k items between ends, iteration detects mutation, and the docs call appends and pops from either side thread-safe.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why blocks of 64 instead of one linked-list node per item?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A node per item would need two link pointers for every one data pointer, about 200% overhead, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">malloc</code> per push. With 64 slots per block the links cost 2 pointers per 64 items and allocation happens once per 64 pushes. The power-of-two size also makes the index arithmetic in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[i]</code> cheap. These reasons are given in the comments of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Modules/_collectionsmodule.c</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deque[i]</code> O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is O(1) at either end and O(n) in general, because it has to follow block links from the nearer end. On our run, with a million items, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[10]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[-10]</code> took about 0.04 microseconds and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[500000]</code> about 16 microseconds. Use a list when you need random access.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">maxlen</code> do when the deque is full?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It discards from the opposite end: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> drops the leftmost item, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appendleft</code> drops the rightmost. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque(range(10), maxlen=3)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque([7, 8, 9], maxlen=3)</code>, which is the idiom for keeping the last N lines or a sliding window.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a deque thread-safe? Should I use it as a queue between threads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The documentation states that appends and pops from either side are thread-safe, so one thread can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> while another <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code>s. But a deque has no blocking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">task_done</code>; for producer and consumer threads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.Queue</code> (which is built on a deque plus locks and conditions) is the right tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still pick a list over a deque?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you index or slice by position, sort in place, or only push and pop at the end. A list is more compact, indexes anywhere in O(1), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.append</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop()</code> at the end are already amortised O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deque** | double-ended queue: a sequence with fast insertion and removal at both ends |
| **Block** | in CPython, a fixed array of 64 item slots plus left and right links |
| **BLOCKLEN** | the C constant for slots per block, 64 in CPython |
| **leftindex / rightindex** | positions of the first and last item inside the end blocks |
| **Contiguous array** | one unbroken run of memory, how \`list\` stores its item pointers |
| **Amortised O(1)** | constant on average over many operations, even if one occasionally costs more |
| **Bounded deque** | a deque with \`maxlen\`, which evicts from the far end when full |
| **Free list** | a cache of released blocks kept for reuse instead of returned to the allocator |

---
**Conclusion:** A CPython \`deque\` is a doubly linked list of 64-slot blocks with two cursors, \`leftindex\` and \`rightindex\`, into the end blocks. Pushing or popping at either end touches one slot and, once every 64 operations, links or unlinks one block, so both ends are O(1) and no item ever moves; the first block starts half full from the middle so either end has room. The price is that there is no arithmetic from a position to an address: indexing walks blocks from the nearer end, the middle is O(n), and there is no slicing. Use a deque for queues, BFS, sliding windows and \`maxlen\` buffers, and a list when you need random access.`,
    examples: [
      { label: `Block growth, O(1) ends, rotate, maxlen and mutation detection`, code: `import struct
import sys
from collections import deque

PTR = struct.calcsize("P")  # bytes per pointer: 8 on 64-bit, 4 on 32-bit


def growth(op, n=300):
    """Return the item counts at which the deque allocated a new block."""
    d = deque()
    last = sys.getsizeof(d)
    steps = []
    for i in range(1, n + 1):
        getattr(d, op)(i)
        size = sys.getsizeof(d)
        if size != last:
            steps.append(i)
            block_bytes = size - last
            last = size
    return steps, block_bytes


steps, block_bytes = growth("append")
print("append allocates a new block at item:", steps)
print("block size in pointers:", block_bytes // PTR, "= 64 item slots + 2 links")
steps_left, _ = growth("appendleft")
print("appendleft allocates at item:", steps_left)

# Popping everything gives the blocks back
d = deque(range(1000))
big = sys.getsizeof(d)
while d:
    d.pop()
print("size after popping all equals empty deque:", sys.getsizeof(d) == sys.getsizeof(deque()))
print("blocks freed:", (big - sys.getsizeof(d)) // block_bytes)

# Operations that are O(1) at the ends
d = deque("bcd")
d.appendleft("a")
d.append("e")
print(d)
print(d.popleft(), d.pop(), d)

# rotate(k) moves k items from one end to the other
d = deque(range(1, 8))
d.rotate(2)
print("rotate(2): ", list(d))
d.rotate(-3)
print("rotate(-3):", list(d))

# maxlen evicts from the opposite end
recent = deque(maxlen=3)
for event in ["login", "view", "click", "buy", "logout"]:
    recent.append(event)
print(recent)
recent.appendleft("start")
print(recent)

# Indexing works but walks block by block from the nearer end
d = deque(range(100))
print(d[0], d[-1], d[50])

# Mutating while iterating is detected
d = deque([1, 2, 3])
try:
    for x in d:
        d.append(x)
except RuntimeError as e:
    print("RuntimeError:", e)` },
      { label: `A toy model of the deque block layout with 4-slot blocks`, code: `# A toy model of the CPython deque layout, with blocks of 4 slots
# instead of 64 so the picture fits on one screen.
BLOCKLEN = 4
CENTER = (BLOCKLEN - 1) // 2


class Block:
    def __init__(self):
        self.data = [None] * BLOCKLEN
        self.left = None   # link to the previous block
        self.right = None  # link to the next block


class ToyDeque:
    def __init__(self):
        self.leftblock = self.rightblock = Block()
        # empty: leftindex sits one past rightindex, in the middle
        self.leftindex = CENTER + 1
        self.rightindex = CENTER
        self.size = 0

    def append(self, x):
        if self.rightindex == BLOCKLEN - 1:   # right block is full
            b = Block()
            b.left, self.rightblock.right = self.rightblock, b
            self.rightblock = b
            self.rightindex = -1
        self.rightindex += 1
        self.rightblock.data[self.rightindex] = x
        self.size += 1

    def appendleft(self, x):
        if self.leftindex == 0:               # left block is full
            b = Block()
            b.right, self.leftblock.left = self.leftblock, b
            self.leftblock = b
            self.leftindex = BLOCKLEN
        self.leftindex -= 1
        self.leftblock.data[self.leftindex] = x
        self.size += 1

    def popleft(self):
        x = self.leftblock.data[self.leftindex]
        self.leftblock.data[self.leftindex] = None
        self.leftindex += 1
        self.size -= 1
        if self.leftindex == BLOCKLEN and self.leftblock is not self.rightblock:
            self.leftblock = self.leftblock.right   # free the empty block
            self.leftblock.left = None
            self.leftindex = 0
        return x

    def show(self, label):
        blocks, b = [], self.leftblock
        while b:
            blocks.append("[" + " ".join("." if v is None else str(v) for v in b.data) + "]")
            b = b.right
        print(f"{label:<18}" + " <-> ".join(blocks),
              f"left={self.leftindex} right={self.rightindex} len={self.size}")


d = ToyDeque()
d.show("empty")
for x in (1, 2):
    d.append(x)
d.show("append 1, 2")
d.append(3)
d.show("append 3")
for x in (0, -1, -2):
    d.appendleft(x)
d.show("appendleft 0..-2")
print("popleft ->", d.popleft(), d.popleft())
d.show("after 2 pops")` },
    ],
  },
  {
    title: `How does heapq work in Python?`,
    difficulty: "medium",
    seoDescription: `How Python heapq works: a binary min-heap in a plain list, push and pop in O(log n), heapify in O(n), priority queues, top-k and max-heaps, verified.`,
    description: `**Question presented to candidate:**
"Python does not have a PriorityQueue class in the core containers, but it has \`heapq\`. How does it work? What data structure sits underneath, what do push and pop cost, and how would you use it to build a task scheduler or find the top k items?"

**What a strong answer should cover:**
- \`heapq\` is a set of functions over a plain \`list\` kept as a binary min-heap: \`heap[k] <= heap[2k+1]\` and \`heap[k] <= heap[2k+2]\`, so \`heap[0]\` is always the smallest. The list is not sorted.
- Costs: \`heappush\` and \`heappop\` are O(log n), \`heap[0]\` is O(1), \`heapify\` is O(n); \`heappushpop\` and \`heapreplace\` combine a push and a pop in one sift.
- Priority queues with \`(priority, counter, item)\` tuples: the counter breaks ties in FIFO order and stops Python from comparing the items; lazy deletion for cancelled entries.
- \`nsmallest\`, \`nlargest\` and \`merge\`: top-k in O(n log k) and lazy merging of sorted inputs; \`sorted()\` or \`min()\` are better when k is large or 1.
- Max-heaps: negate numeric keys on 3.11; Python 3.14 added public \`heappush_max\`, \`heappop_max\`, \`heapify_max\` and friends.
- CPython detail: the C module \`_heapq\` replaces the Python code, only \`<\` is used, and \`heappop\` uses a "sift to a leaf, then back up" variant that saves comparisons.

**Code / implementation expected:** Yes — push and pop a few values, show the list is a heap and not sorted, and build a small priority queue with a tie-breaker.`,
    answer: `**Target Audience:** Developers who have heard "use a heap for a priority queue" and want to know what \`heapq\` really does, up to candidates expected to explain the algorithm and its costs.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). The 3.14 max-heap functions are cited from the docs, not run.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a hospital emergency room. Patients do not get seen in the order they arrive; the most urgent goes next. The triage nurse does not keep the whole waiting room in perfect order, though — that would mean re-sorting everyone each time someone walks in. They only need to know one thing at any moment: **who is most urgent right now**. When that person goes in, the next most urgent must be found quickly.

That is a **priority queue**, and a heap is the trick that makes it cheap: it keeps the data only *partly* ordered, just enough that the most urgent item is always at the front, and both "someone arrives" and "next, please" cost about log₂(n) steps — 20 steps for a million patients. Python's \`heapq\` module gives you exactly that on top of an ordinary list. Schedulers, Dijkstra's shortest path, merging sorted files, "top 10 scores" and event simulations all run on it.

📌 **Interview term: Priority queue** — an abstract collection where you can insert items with a priority and always remove the item with the best (here: smallest) priority next.

## 2. The Data Structure: a Binary Min-Heap in a List

📌 **Interview term: Heap** — a tree in which every parent is ordered before its children. It says nothing about the order of siblings or cousins.

📌 **Interview term: Binary min-heap** — a heap where each node has at most two children and is less than or equal to both. The root is therefore the minimum.

\`heapq\` does not define a class. It stores the tree in a plain Python \`list\`, level by level, and provides functions that keep that list in heap order. Pushing 5, 3, 8, 1, 9, 2 in Example 1 gives the list \`[1, 3, 2, 5, 9, 8]\`, which is this tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="The heap list 1, 3, 2, 5, 9, 8 drawn as a binary tree with each node labelled by its list index">
  <path class="d-edge" d="M 332 68 L 208 152"/>
  <path class="d-edge" d="M 368 68 L 492 152"/>
  <path class="d-edge" d="M 176 190 L 122 272"/>
  <path class="d-edge" d="M 204 190 L 258 272"/>
  <path class="d-edge" d="M 496 190 L 442 272"/>
  <circle class="d-box-accent" cx="350" cy="50" r="26"/>
  <text class="d-text" x="350" y="55" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="386" y="38">i = 0</text>
  <circle class="d-box" cx="190" cy="170" r="26"/>
  <text class="d-text" x="190" y="175" text-anchor="middle">3</text>
  <text class="d-sub" x="226" y="160">i = 1</text>
  <circle class="d-box" cx="510" cy="170" r="26"/>
  <text class="d-text" x="510" y="175" text-anchor="middle">2</text>
  <text class="d-sub" x="546" y="160">i = 2</text>
  <circle class="d-box" cx="110" cy="290" r="26"/>
  <text class="d-text" x="110" y="295" text-anchor="middle">5</text>
  <text class="d-sub" x="146" y="280">i = 3</text>
  <circle class="d-box" cx="270" cy="290" r="26"/>
  <text class="d-text" x="270" y="295" text-anchor="middle">9</text>
  <text class="d-sub" x="306" y="280">i = 4</text>
  <circle class="d-box" cx="430" cy="290" r="26"/>
  <text class="d-text" x="430" y="295" text-anchor="middle">8</text>
  <text class="d-sub" x="466" y="280">i = 5</text>
</svg>

And the list behind it, with no pointers at all:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="The same heap stored as a plain Python list with indexes 0 to 5">
  <rect class="d-box-accent" x="20" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="61" y="60" text-anchor="middle">1</text>
  <text class="d-sub" x="61" y="122" text-anchor="middle">index 0</text>
  <rect class="d-box" x="122" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="163" y="60" text-anchor="middle">3</text>
  <text class="d-sub" x="163" y="122" text-anchor="middle">index 1</text>
  <rect class="d-box" x="224" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="265" y="60" text-anchor="middle">2</text>
  <text class="d-sub" x="265" y="122" text-anchor="middle">index 2</text>
  <rect class="d-box" x="326" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="367" y="60" text-anchor="middle">5</text>
  <text class="d-sub" x="367" y="122" text-anchor="middle">index 3</text>
  <rect class="d-box" x="428" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="469" y="60" text-anchor="middle">9</text>
  <text class="d-sub" x="469" y="122" text-anchor="middle">index 4</text>
  <rect class="d-box" x="530" y="24" width="82" height="60" rx="8"/>
  <text class="d-text" x="571" y="60" text-anchor="middle">8</text>
  <text class="d-sub" x="571" y="122" text-anchor="middle">index 5</text>
</svg>

📌 **Interview term: Complete binary tree** — a tree where every level is full except possibly the last, which fills from the left. Because the heap is always complete, it fits in a list with no gaps, and the links are arithmetic: the children of index \`k\` are \`2k + 1\` and \`2k + 2\`, and its parent is \`(k - 1) // 2\`.

📌 **Interview term: Heap invariant** — \`heap[k] <= heap[2k+1]\` and \`heap[k] <= heap[2k+2]\` for every \`k\` where those children exist. That is the definition at the top of CPython's \`Lib/heapq.py\`, and Example 1 checks it with an \`all(...)\` expression.

Note what the invariant does **not** say: \`[1, 3, 2, 5, 9, 8]\` is not sorted (3 comes before 2). Example 1 prints \`False\` for \`data == sorted(data)\` after a \`heapify\`. Only \`heap[0]\` is guaranteed to be the minimum. (The reverse is true, though: a sorted list is always a valid heap.)

## 3. Push and Pop: Sifting

📌 **Interview term: Sift up / sift down** — moving one item towards the root (up) or towards the leaves (down), swapping with a parent or a child until the invariant holds again. Beware that CPython's internal names are reversed from many textbooks: in \`heapq.py\`, \`_siftdown\` moves an item towards the root and \`_siftup\` moves it towards the leaves.

- **\`heappush(heap, x)\`** appends \`x\` at the end of the list (the next free leaf), then moves it up past every parent bigger than it. At most one comparison per level: O(log n).
- **\`heappop(heap)\`** returns \`heap[0]\`. To fill the hole, it takes the **last** item off the end, puts it at the root, and moves it down. CPython uses a variant here: it first pushes the hole all the way to a leaf by always promoting the smaller child (one comparison per level), drops the last item into that leaf, and then sifts it back up. The comment in \`heapq.py\` explains why: the item taken from the end is usually large, so comparing it at every level on the way down rarely stops early, and the leaf-first version needs fewer comparisons. Their measured example for 1000 random items is about 15,000 comparisons cut to about 8,680 for 1000 pops; Example 2 counted **8682** on our run.
- **\`heap[0]\`** peeks at the minimum in O(1) without removing it.

📌 **Interview term: heapify** — \`heapq.heapify(lst)\` rearranges an existing list into heap order **in place, in O(n)**. It sifts down every parent from the last one (\`n // 2 - 1\`) back to the root. That is cheaper than n pushes because most nodes are near the bottom and move very little. Example 2 counted 1628 comparisons for heapify of 1000 items versus 2260 for 1000 \`heappush\` calls (the \`heapq.py\` comment reports about 1,660 and about 2,200 on its own random runs).

### Every operation, with its cost

| Function | What it does | Cost |
| :--- | :--- | :--- |
| \`heappush(h, x)\` | add \`x\` | O(log n) |
| \`heappop(h)\` | remove and return the smallest | O(log n) |
| \`h[0]\` | peek at the smallest | O(1) |
| \`heapify(lst)\` | make a list a heap, in place | O(n) |
| \`heappushpop(h, x)\` | push \`x\`, then pop the smallest (may return \`x\` itself) | O(log n), one sift |
| \`heapreplace(h, x)\` | pop the smallest, then push \`x\` (heap must be non-empty) | O(log n), one sift |
| \`nsmallest(k, it)\` / \`nlargest(k, it)\` | the k smallest or largest, sorted | O(n log k) |
| \`merge(*sorted_its)\` | lazily merge sorted iterables | O(n log m) for m inputs |

## 4. Using It as a Priority Queue

Heap items are compared with \`<\`, and tuples compare element by element. So the usual entry is a tuple whose first field is the priority:

~~~python
import heapq
from itertools import count

tie = count()
pq = []
heapq.heappush(pq, (2, next(tie), {"job": "email"}))
heapq.heappush(pq, (1, next(tie), {"job": "backup"}))
prio, _, task = heapq.heappop(pq)      # (1, 1, {'job': 'backup'})
~~~

📌 **Interview term: Tie-breaker** — the middle field. Without it, two entries with the same priority fall through to comparing the third field. For dicts that fails: the last part of Example 1 raises \`TypeError: '<' not supported between instances of 'dict' and 'dict'\`. A monotonically increasing counter makes ties resolve in insertion (FIFO) order and guarantees the payloads are never compared. A heap on its own is **not stable**; the counter is what gives you stability.

📌 **Interview term: Lazy deletion** — \`heapq\` cannot remove or re-prioritise an item in the middle cheaply (finding it is O(n)). Instead, keep a reference to each entry (often in a dict), mark it dead when cancelled, and skip dead entries when they reach the top. Example 2 cancels task \`a\` this way in O(1). To change a priority: mark the old entry dead and push a new one.

If several threads share the queue, use \`queue.PriorityQueue\`, which wraps these same functions with a lock and blocking \`get()\`/\`put()\`.

## 5. Top-k and Merging

📌 **Interview term: Top-k** — finding the k largest or smallest items without sorting everything. \`heapq.nlargest(k, iterable, key=None)\` keeps a heap of only k items while scanning the input, so the cost is O(n log k) and memory is O(k): perfect for "top 10 of a million log lines". In CPython's \`heapq.py\`, \`nsmallest\` takes shortcuts: for \`k == 1\` it calls \`min()\`, and when \`k >= len(iterable)\` it just uses \`sorted()\`. Both functions accept a \`key=\` like \`sorted\` does (Example 1 finds the youngest person).

\`heapq.merge(*iterables, key=None, reverse=False)\` merges inputs that are **already sorted** into one sorted stream, lazily, holding one item per input in a small heap. It is the core of external merge sort: merge huge sorted files without loading them. If the inputs are not sorted, the result is not sorted either.

When the whole sorted order is needed, a heap is the wrong tool: Example 2 counted 8632 comparisons for \`sorted()\` of 1000 items, against 1628 + 8682 for heapify plus popping all of them. Python's sort is covered in [Timsort](/interview-question/how-does-timsort-make-python-s-sort-fast-and-stable) and [sorting with a key](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort).

## 6. Max-Heaps

\`heapq\` on 3.11 is min-only. The standard tricks:

- **Negate numeric keys:** push \`-x\`, read \`-heap[0]\`. Example 1 gets the largest value, 8, this way.
- **Negate the priority in a tuple:** \`(-score, counter, item)\`.
- **Wrap non-numeric items** in a class whose \`__lt__\` returns the reverse comparison.

CPython 3.11 also has private \`_heapify_max\`, \`_heappop_max\` and \`_heapreplace_max\`, used internally by \`nlargest\`. Being private, they are not a supported API. **Python 3.14** added public max-heap functions — \`heapify_max\`, \`heappush_max\`, \`heappop_max\`, \`heappushpop_max\` and \`heapreplace_max\` — according to the [heapq documentation](https://docs.python.org/3/library/heapq.html). We did not run them here (no 3.14 interpreter was available), and they are not in the page's 3.11 runtime.

## 7. What CPython Does

- **C accelerator.** \`Lib/heapq.py\` contains a full Python implementation, but at the end it runs \`from _heapq import *\`, replacing the functions with C versions. On our run \`heapq.heappush.__module__\` was \`'_heapq'\`. Both implementations follow the same algorithm, which is why our comparison counts line up with the numbers quoted in the Python file's comments.
- **Only \`<\` is used.** The docs state that, like \`list.sort\`, \`heapq\` compares with \`<\` only. Example 2's \`OnlyLess\` class defines nothing but \`__lt__\` and works.
- **No hidden state.** The heap is your list. \`heapq\` does not check the invariant; if you \`append\` to the list directly or edit an element, later pops can return wrong answers, until you call \`heapify\` again.

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical. The comparison counts in Example 2 are deterministic because \`random.seed(42)\` fixes the shuffle.

**Example 1 — the invariant, push/pop, heapify, top-k, merge, max-heap and priority queue** prints:

~~~text
[1, 3, 2, 5, 9, 8]
1
invariant holds: True
[1, 2, 3, 5, 8, 9]
[]
[1, 4, 2, 9, 8, 7, 6]
False
[99, 95, 88]
[54, 61]
[('bob', 25)]
[1, 2, 3, 4, 5, 9, 10]
1 [2, 5, 7]
2 [1, 5, 7]
largest: 8
1 backup
2 email
2 report
TypeError: '<' not supported between instances of 'dict' and 'dict'
~~~

**Example 2 — counting comparisons, \`__lt__\` only, and lazy deletion** prints:

~~~text
heapify of 1000 items: 1628 comparisons (under 2n: True)
1000 heappush calls:   2260 comparisons
pops sorted the data: True
popping 1000 items: 8682 comparisons
sorted() of 1000 items: 8632 comparisons
min via only __lt__: 1
run b priority 2
run c priority 3
~~~

**What the output shows:**

- After six pushes the list is \`[1, 3, 2, 5, 9, 8]\`: smallest first, but not sorted; popping everything yields sorted order, which is heapsort.
- \`heapify\` on \`[9, 4, 7, 1, 8, 2, 6]\` produced \`[1, 4, 2, 9, 8, 7, 6]\` in place.
- \`heappushpop(h1, 1)\` returned the pushed 1 immediately and left the heap unchanged; \`heapreplace(h2, 1)\` returned the old minimum 2.
- Equal priorities (two 2s) came out in insertion order thanks to the counter; without it, comparing dicts raised \`TypeError\`.
- heapify of 1000 items needed fewer than 2n comparisons, and fewer than 1000 pushes; popping all 1000 took 8682.

## 9. Edge Cases

- **Empty heap.** \`heappop([])\` raises \`IndexError: index out of range\`; check \`if heap:\` first. \`heapreplace\` on an empty heap raises too.
- **Calling \`heapq\` functions on a non-heap list** gives wrong results silently. \`heapify\` first.
- **\`heap.sort()\` keeps the invariant** (a sorted list is a heap), so sorting a heap in place does not break it.
- **Mixed types** such as \`int\` and \`str\` in one heap raise \`TypeError\` at the first comparison between them.
- **\`nlargest(k, xs)\` with \`k <= 0\`** returns \`[]\`.

## Common Pitfalls

- **Treating the heap list as sorted.** Only \`heap[0]\` is guaranteed; \`heap[1]\` is not the second smallest (in \`[1, 3, 2, ...]\` it is 3).
- **Pushing \`(priority, item)\` without a tie-breaker.** Equal priorities make Python compare the items, which raises \`TypeError\` for dicts or custom objects.
- **Modifying the list directly.** \`heap.append(x)\` or \`heap[i] = y\` breaks the invariant; use \`heappush\` or call \`heapify\` after bulk changes.
- **Searching the heap to delete or update.** That is O(n) and needs a re-heapify; use lazy deletion.
- **Sorting with a heap.** \`sorted()\` is simpler and made fewer comparisons in our run; use a heap when you need items incrementally or only the top k.
- **Using \`heapreplace\` when \`heappushpop\` was meant.** \`heapreplace\` always removes the current minimum, even if the new item is smaller.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is a module of functions that treat a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> as a binary min-heap: every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[k]</code> is less than or equal to its children <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[2k+1]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[2k+2]</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code> is the smallest item. The list is not sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Costs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappush</code> adds at the end and sifts up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappop</code> moves the last item to the root and sifts it down: both O(log n). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code> is O(1) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapify</code> turns any list into a heap in O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Priority queues:</strong> <span style="color:#f0e2c8;">Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(priority, counter, item)</code> tuples: the counter from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.count()</code> keeps equal priorities in insertion order and stops Python from comparing the items, which may not be comparable. Cancel entries lazily by marking them dead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Top-k and merge:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nlargest(k, xs)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nsmallest(k, xs)</code> keep a heap of size k, O(n log k); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merge()</code> lazily merges already-sorted iterables. For k of 1 use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, for k near n use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">It is min-only on 3.11, so negate numbers for a max-heap (3.14 added public <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_max</code> functions); only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> is used; the C module <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_heapq</code> replaces the Python code; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappop</code> sifts to a leaf and back up to save comparisons.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapify</code> O(n) and not O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sifts down from the last parent to the root. Half the nodes are leaves and need no work, a quarter move at most one level, an eighth at most two, and so on; the sum is bounded by a constant times n. Our run counted 1628 comparisons to heapify 1000 items, versus 2260 for 1000 separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappush</code> calls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a max-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On 3.11, push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code> and negate on the way out, or for non-numbers wrap items in a class whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__lt__</code> is reversed. Python 3.14 added public <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapify_max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappush_max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappop_max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappushpop_max</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapreplace_max</code>; earlier versions only have private <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_heapify_max</code>-style helpers, which you should not rely on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heappushpop</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapreplace</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappushpop(h, x)</code> pushes first, then pops, so if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is smaller than the root it comes straight back and the heap is untouched. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapreplace(h, x)</code> pops first, then pushes, so it always returns the old minimum even when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is smaller. Both do a single sift, which is faster than a separate push and pop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change the priority of an item already in the heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> has no decrease-key. The standard answer is lazy deletion: mark the old entry invalid (for example through a dict from item to entry), push a new entry with the new priority, and skip invalid entries when they are popped. The alternative, finding the item and re-heapifying, is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.PriorityQueue</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> for a single-threaded priority queue or top-k. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.PriorityQueue</code> wraps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> with locks and blocking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> for threads. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort</code> when you need everything in order once: our run counted 8632 comparisons for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code> on 1000 items versus 1628 + 8682 for heapify plus popping everything.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Heap** | a tree-shaped structure where every parent is ordered before its children |
| **Binary min-heap** | each node has up to two children and is less than or equal to both; the root is the minimum |
| **Heap invariant** | \`heap[k] <= heap[2k+1]\` and \`heap[k] <= heap[2k+2]\` for every valid k |
| **Complete binary tree** | every level is full except possibly the last, filled left to right; it maps onto a list with no gaps |
| **Sift up / sift down** | moving one item towards the root, or towards the leaves, until the invariant holds |
| **heapify** | rearranging a whole list into heap order in O(n) |
| **Priority queue** | a collection where you always remove the item with the best priority next |
| **Tie-breaker** | an extra tuple field, usually a counter, that decides order between equal priorities |
| **Lazy deletion** | marking an entry dead and skipping it at pop time, instead of removing it from the middle |
| **Top-k** | finding the k largest or smallest items without sorting everything |

---
**Conclusion:** \`heapq\` turns a plain Python list into a binary min-heap. The list stores a complete binary tree level by level, with children of index \`k\` at \`2k + 1\` and \`2k + 2\`, and the only promise is that every parent is less than or equal to its children, so \`heap[0]\` is the minimum. \`heappush\` and \`heappop\` restore that promise by sifting one item through at most log₂(n) levels, \`heapify\` builds a heap in O(n), and \`heappushpop\`/\`heapreplace\` combine the two. Wrap entries as \`(priority, counter, item)\` for a stable priority queue, use lazy deletion for cancellations, \`nlargest\`/\`nsmallest\`/\`merge\` for top-k and merging, and negation (or the 3.14 \`_max\` functions) for a max-heap.`,
    examples: [
      { label: `The heap invariant, push and pop, heapify, top-k, merge and a priority queue`, code: `import heapq

# A heap is a plain list kept in "heap order":
# h[k] <= h[2k+1] and h[k] <= h[2k+2] for every k
h = []
for x in [5, 3, 8, 1, 9, 2]:
    heapq.heappush(h, x)
print(h)
print(h[0])
ok = all(h[k] <= h[c] for k in range(len(h)) for c in (2 * k + 1, 2 * k + 2) if c < len(h))
print("invariant holds:", ok)

# heappop always returns the smallest; popping all gives sorted order
print([heapq.heappop(h) for _ in range(len(h))])
print(h)  # []

# heapify rearranges an existing list in place, in O(n)
data = [9, 4, 7, 1, 8, 2, 6]
heapq.heapify(data)
print(data)  # [1, 4, 2, 9, 8, 7, 6]

# The list is a heap, NOT a sorted list
print(data == sorted(data))  # False

# Top-k helpers
scores = [72, 95, 61, 88, 99, 54, 80]
print(heapq.nlargest(3, scores))  # [99, 95, 88]
print(heapq.nsmallest(2, scores))  # [54, 61]
people = [("ann", 31), ("bob", 25), ("cy", 40)]
print(heapq.nsmallest(1, people, key=lambda p: p[1]))  # [('bob', 25)]

# Merge already-sorted inputs lazily
print(list(heapq.merge([1, 4, 9], [2, 3, 10], [5])))  # [1, 2, 3, 4, 5, 9, 10]

# heappushpop: push then pop (can return the new item at once)
# heapreplace: pop then push (always removes the old minimum)
h1 = [2, 5, 7]
h2 = [2, 5, 7]
print(heapq.heappushpop(h1, 1), h1)
print(heapq.heapreplace(h2, 1), h2)

# Max-heap trick on 3.11: store negated keys
mx = []
for x in [5, 3, 8, 1]:
    heapq.heappush(mx, -x)
print("largest:", -mx[0])

# Priority queue: (priority, counter, item) keeps ties in FIFO
# order and never compares the items themselves
from itertools import count
tie = count()
pq = []
for prio, task in [(2, {"job": "email"}), (1, {"job": "backup"}), (2, {"job": "report"})]:
    heapq.heappush(pq, (prio, next(tie), task))
while pq:
    prio, _, task = heapq.heappop(pq)
    print(prio, task["job"])

# Without the counter, equal priorities fall through to comparing dicts
bad = []
heapq.heappush(bad, (1, {"job": "a"}))
try:
    heapq.heappush(bad, (1, {"job": "b"}))
except TypeError as e:
    print("TypeError:", e)` },
      { label: `Counting comparisons: heapify vs pushes vs sorted, plus lazy deletion`, code: `import heapq
import random


class Counted:
    """Wraps a number and counts every < comparison heapq makes."""
    calls = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Counted.calls += 1
        return self.v < other.v


def comparisons(fn):
    Counted.calls = 0
    fn()
    return Counted.calls


random.seed(42)
n = 1000
values = list(range(n))
random.shuffle(values)

# 1. heapify (bottom-up, O(n)) vs n separate pushes (O(n log n) worst case)
def by_heapify():
    heapq.heapify([Counted(v) for v in values])

def by_pushes():
    h = []
    for v in values:
        heapq.heappush(h, Counted(v))

hc = comparisons(by_heapify)
pc = comparisons(by_pushes)
print(f"heapify of {n} items: {hc} comparisons (under 2n: {hc < 2 * n})")
print(f"{n} heappush calls:   {pc} comparisons")

# 2. Popping all n items costs about n * log2(n) comparisons
heap = [Counted(v) for v in values]
heapq.heapify(heap)
Counted.calls = 0
out = [heapq.heappop(heap).v for _ in range(n)]
print("pops sorted the data:", out == sorted(values))
print(f"popping {n} items: {Counted.calls} comparisons")
sc = comparisons(lambda: sorted(Counted(v) for v in values))
print(f"sorted() of {n} items: {sc} comparisons")

# 3. heapq only ever calls <, never > or ==
class OnlyLess:
    def __init__(self, v):
        self.v = v
    def __lt__(self, other):
        return self.v < other.v

h = [OnlyLess(v) for v in [4, 1, 3]]
heapq.heapify(h)
print("min via only __lt__:", h[0].v)

# 4. Lazy deletion: mark entries dead instead of searching the list
pq, alive = [], {}
for prio, name in [(3, "c"), (1, "a"), (2, "b")]:
    entry = [prio, name, True]
    alive[name] = entry
    heapq.heappush(pq, entry)
alive["a"][2] = False          # cancel task a in O(1)
while pq:
    prio, name, valid = heapq.heappop(pq)
    if valid:
        print("run", name, "priority", prio)` },
    ],
  },
];

export default augments;
