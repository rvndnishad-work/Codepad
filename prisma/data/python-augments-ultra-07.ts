/**
 * PYTHON ULTRA — batch 07: errors and exceptions. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the two runnable: false examples on
 * python3.12); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `How does exception handling work in Python?`,
    difficulty: "easy",
    seoDescription: `How Python try, except, else and finally work, the exception class hierarchy, re-raising, and what CPython 3.11 compiles them to.`,
    description: `**Question presented to candidate:**
"Walk me through how exception handling works in Python. What do try, except, else and finally each do, in what order do they run, and how does Python decide which except clause handles an error?"

**What a strong answer should cover:**
- An exception is an object (an instance of a class derived from \`BaseException\`) that stops normal execution and travels up the call stack until a matching \`except\` clause handles it
- The four clauses: \`try\` holds the risky code, \`except\` handles matching errors, \`else\` runs only when \`try\` raised nothing, \`finally\` runs on every way out (normal end, \`return\`, or an error passing through)
- Matching is by \`isinstance\`, clauses are tested top to bottom, the first match wins, so specific classes go before their base classes; a tuple catches several types
- Catch \`Exception\`, not a bare \`except:\` (which also catches \`KeyboardInterrupt\` and \`SystemExit\`); keep the \`try\` block small; use bare \`raise\` to re-raise unchanged
- The \`as e\` name is deleted when the \`except\` block ends, and a \`return\` inside \`finally\` silently discards an in-flight exception
- CPython detail: since 3.11 a \`try\` costs almost nothing when no exception is raised ("zero-cost" exceptions, via an exception table instead of setup instructions)

**Code / implementation expected:** Optional — a short try/except/else/finally function showing which clauses run for success and for failure.`,
    answer: `**Target Audience:** Beginners learning Python, and anyone preparing for a Python interview
**Difficulty:** Easy
**Python version:** Every example was run on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You ask a friend to pick up a parcel from the post office. Most days it just works. But sometimes the office is closed, sometimes the parcel is not there yet, and sometimes your friend gets a flat tyre on the way. A good friend does not silently give up, and does not pretend the parcel was collected. They come back and tell you **what went wrong**, so that you can decide what to do: try tomorrow, send someone else, or give up. And whatever happens, they return your car keys.

Python code works the same way. Most lines succeed. When one cannot do its job (a file is missing, a number is divided by zero, a dictionary has no such key), Python stops running that code and hands back a description of the problem. Your program can **handle** that report where it knows what to do about it, and it can make sure the clean-up work (the car keys: closing files, releasing locks) always happens.

Without this, every function would have to return special "it failed" values and every caller would have to check them. With it, the happy path stays readable and the error path is explicit.

## 2. What an Exception Is

When a line of Python cannot do what it was asked, it **raises** an exception: it creates an object that describes the problem and stops executing the current code.

📌 **Interview term: Exception** — an object, an instance of a class that inherits from \`BaseException\`, that describes an error. Raising it stops normal execution until some code handles it.

📌 **Interview term: Raise** — the act of signalling an error, either by Python itself (\`1 / 0\` raises \`ZeroDivisionError\`) or by your code with the \`raise\` statement, for example \`raise ValueError("age must be positive")\`.

If nothing handles the exception, it moves up to the function that called the current one, then to its caller, and so on. If it reaches the top of the program, Python prints a **traceback** (the list of calls that led to the error) and the program stops. How that journey works frame by frame has its own page: [how exception propagation works up the call stack](/interview-question/how-does-exception-propagation-work-up-the-call-stack).

📌 **Interview term: Traceback** — the report Python prints for an unhandled exception: the chain of function calls, innermost last, with the file and line of each, followed by the exception type and message.

## 3. The Four Clauses: try, except, else, finally

~~~python
try:
    result = a / b                # code that might fail
except ZeroDivisionError as e:    # runs only if that error happened in try
    result = None
else:                             # runs only if try raised nothing
    print("division worked")
finally:                          # runs no matter what
    print("done")
~~~

- **\`try\`** wraps the code that might raise.
- **\`except SomeError as e\`** handles an exception of that type (or a subclass). \`e\` is the exception object. You can have several \`except\` clauses.
- **\`else\`** runs only when the \`try\` block finished without raising. It is the place for code that should run on success but whose own errors you do **not** want the \`except\` above to catch.
- **\`finally\`** runs on every way out of the statement: normal completion, a \`return\`, a \`break\`, or an exception that is passing through. It is for clean-up.

📌 **Interview term: Exception handler** — an \`except\` clause; the code that runs when a matching exception is raised in its \`try\` block.

📌 **Interview term: Clean-up clause** — \`finally\`: code that is guaranteed to run when control leaves the \`try\` statement, whether or not an exception happened.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 350" role="img" aria-label="Flow of a try statement: from try, no error goes to else, a matching error goes to except, an unmatched error goes on, and every path runs finally">
  <defs>
    <marker id="eh1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">try</text>
  <text class="d-sub" x="340" y="66" text-anchor="middle">run the risky code</text>
  <rect class="d-box" x="30" y="150" width="180" height="60" rx="10"/>
  <text class="d-text" x="120" y="175" text-anchor="middle">else</text>
  <text class="d-sub" x="120" y="196" text-anchor="middle">nothing was raised</text>
  <rect class="d-box" x="250" y="150" width="180" height="60" rx="10"/>
  <text class="d-text" x="340" y="175" text-anchor="middle">except E</text>
  <text class="d-sub" x="340" y="196" text-anchor="middle">raised error is an E</text>
  <rect class="d-box-muted" x="470" y="150" width="180" height="60" rx="10"/>
  <text class="d-text" x="560" y="175" text-anchor="middle">no clause matches</text>
  <text class="d-sub" x="560" y="196" text-anchor="middle">error keeps going</text>
  <rect class="d-box-accent" x="250" y="270" width="180" height="60" rx="10"/>
  <text class="d-text" x="340" y="295" text-anchor="middle">finally</text>
  <text class="d-sub" x="340" y="316" text-anchor="middle">runs on every path</text>
  <path class="d-edge" d="M 290 80 L 150 146" marker-end="url(#eh1-arrow)"/>
  <path class="d-edge" d="M 340 80 L 340 146" marker-end="url(#eh1-arrow)"/>
  <path class="d-edge-dashed" d="M 390 80 L 530 146" marker-end="url(#eh1-arrow)"/>
  <path class="d-edge" d="M 150 210 L 290 266" marker-end="url(#eh1-arrow)"/>
  <path class="d-edge" d="M 340 210 L 340 266" marker-end="url(#eh1-arrow)"/>
  <path class="d-edge-dashed" d="M 530 210 L 390 266" marker-end="url(#eh1-arrow)"/>
</svg>

Every path from \`try\` passes through \`finally\`. After \`finally\`, the else and except paths continue with the next statement; on the dashed path the exception carries on to the caller once \`finally\` is done.

Example 1 on this page logs which clauses run. For \`divide(10, 4)\` the log is \`['try', 'else', 'finally']\`; for \`divide(1, 0)\` it is \`['try', 'except: ZeroDivisionError', 'finally']\`; and for \`divide("ten", 2)\`, which raises a \`TypeError\` that no clause matches, it is \`['try', 'finally']\` and the caller receives the \`TypeError\`.

Notice also that \`return result\` inside \`else\` and \`return None\` inside \`except\` still let \`finally\` run first. A \`return\` does not skip \`finally\`.

## 4. How Python Picks the Handler

Exceptions are ordinary classes arranged in a hierarchy. \`except SomeError\` matches when \`isinstance(raised_exception, SomeError)\` is true, so a clause for a base class also catches all of its subclasses. The **method resolution order** of \`ZeroDivisionError\` printed in Example 2 shows its ancestors:

~~~text
['ZeroDivisionError', 'ArithmeticError', 'Exception', 'BaseException', 'object']
~~~

So \`except ArithmeticError\` and \`except Exception\` both catch a division by zero.

📌 **Interview term: Exception hierarchy** — the tree of built-in exception classes rooted at \`BaseException\`. Almost everything you catch derives from \`Exception\`; \`KeyboardInterrupt\`, \`SystemExit\` and \`GeneratorExit\` derive directly from \`BaseException\` so that a normal \`except Exception\` does not stop Ctrl+C or \`sys.exit()\`.

The rules for choosing:

1. The \`except\` clauses are tested **top to bottom**, and the **first** one that matches runs. Only one handler runs.
2. So put **specific classes first**. In Example 2, \`except LookupError\` comes before \`except KeyError\`; since \`KeyError\` is a subclass of \`LookupError\`, the second clause can never run.
3. A **tuple** catches several unrelated types with one clause: \`except (TypeError, ValueError) as e:\`.
4. If no clause matches, the exception continues upward after \`finally\` runs.

On CPython 3.11 the direct subclasses of \`BaseException\` are (from \`BaseException.__subclasses__()\` on our run):

~~~text
['BaseExceptionGroup', 'Exception', 'GeneratorExit', 'KeyboardInterrupt', 'SystemExit']
~~~

\`BaseExceptionGroup\` belongs to the 3.11 feature that raises several exceptions at once; see [except* and ExceptionGroup](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11).

📌 **Interview term: Bare except** — \`except:\` with no class. It catches everything derived from \`BaseException\`, including \`KeyboardInterrupt\` and \`SystemExit\`, which is why style guides say to write \`except Exception:\` instead.

## 5. Raising and Re-raising

You raise with \`raise\` followed by an exception instance (or a class, which Python instantiates for you):

~~~python
def set_age(age):
    if age < 0:
        raise ValueError("age must be positive, got " + str(age))
~~~

Inside an \`except\` block, a **bare \`raise\`** re-raises the exception currently being handled, with its original traceback. This is the standard way to log an error and still let the caller deal with it. Example 2 shows the caller receiving the very same \`IndexError\`.

📌 **Interview term: Re-raise** — a bare \`raise\` inside a handler, which sends the current exception on up the stack unchanged.

When you want to turn a low-level error into your own error type, use \`raise NewError(...) from e\`. That is called exception chaining and has its own page: [creating and chaining custom exceptions](/interview-question/how-do-you-create-and-chain-custom-exceptions).

## 6. Two Details That Surprise People

**The \`as\` name is deleted.** After \`except KeyError as err:\` finishes, Python runs \`del err\`. Example 2 prints \`"err" in globals()\` after the block and gets \`False\`. CPython does this because the exception holds its traceback, the traceback holds the frame, and the frame holds \`err\`: keeping the name would create a reference cycle that keeps every local variable of the frame alive. If you need the exception later, assign it to another name inside the block.

**\`return\` in \`finally\` wins.** A \`return\` in \`finally\` replaces whatever was going on, including an exception in flight. Example 2 raises \`ValueError\` in \`try\` and returns \`"finally won"\` from \`finally\`: the caller gets the string and the \`ValueError\` is gone without a trace. PEP 765 makes CPython 3.14 emit a \`SyntaxWarning\` for \`return\`, \`break\` and \`continue\` that leave a \`finally\` block ([PEP 765](https://peps.python.org/pep-0765/)); 3.11 to 3.13 accept it silently, which we confirmed on 3.12 and on 3.13 with \`-W error\`.

## 7. What CPython Does Under the Hood

Since Python 3.11, CPython uses **"zero-cost" exceptions**: the What's New page says the cost of \`try\` statements is almost eliminated when no exception is raised (bpo-40222, by Mark Shannon; [What's New in Python 3.11](https://docs.python.org/3/whatsnew/3.11.html)). Instead of pushing a "block" when entering \`try\`, the compiler writes an **exception table** that maps ranges of bytecode to the handler to jump to. You can see it with \`dis\`:

~~~python
import dis
def f(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None
dis.dis(f)
~~~

On our python3.11 run the \`try:\` line compiles to a single \`NOP\`, and the handler lives in the table at the end:

~~~text
  2           0 RESUME                   0

  3           2 NOP

  4           4 LOAD_FAST                0 (a)
              6 LOAD_FAST                1 (b)
              8 BINARY_OP               11 (/)
             12 RETURN_VALUE
        >>   14 PUSH_EXC_INFO

  5          16 LOAD_GLOBAL              0 (ZeroDivisionError)
             28 CHECK_EXC_MATCH
             30 POP_JUMP_FORWARD_IF_FALSE     4 (to 40)
             32 POP_TOP

  6          34 POP_EXCEPT
             36 LOAD_CONST               0 (None)
             38 RETURN_VALUE

  5     >>   40 RERAISE                  0
        >>   42 COPY                     3
             44 POP_EXCEPT
             46 RERAISE                  1
ExceptionTable:
  4 to 10 -> 14 [0]
  14 to 32 -> 42 [1] lasti
  40 to 40 -> 42 [1] lasti
~~~

Read the first table row as "if anything between offsets 4 and 10 raises, jump to 14". \`CHECK_EXC_MATCH\` is the \`isinstance\` test of the \`except\` clause, and \`RERAISE\` sends an unmatched exception on. The exact bytecode changes between versions; the idea (no cost on the happy path, a table lookup when something is raised) does not.

📌 **Interview term: Zero-cost exceptions** — CPython 3.11+ implementation where entering a \`try\` block executes no extra instructions; the cost is paid only when an exception is actually raised.

The flip side: **raising and catching** an exception is far slower than an \`if\` check. That matters when failure is common; see [EAFP vs LBYL](/interview-question/what-is-eafp-vs-lbyl-in-python) for measured numbers.

## 8. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical.

**Example 1 — which clause runs when** prints:

~~~text
2.5
['try', 'else', 'finally']
None
['try', 'except: ZeroDivisionError', 'finally']
caught outside: unsupported operand type(s) for /: 'str' and 'int'
['try', 'finally']
42
bad input: ValueError
bad input: TypeError
~~~

**Example 2 — hierarchy, clause order, the deleted name, re-raise and finally** prints:

~~~text
['ZeroDivisionError', 'ArithmeticError', 'Exception', 'BaseException', 'object']
True
False
LookupError clause
inside: KeyError('missing')
False
logging it, then re-raising
caller got: IndexError - list index out of range
finally still ran
from try
finally won
~~~

**What the output shows:** \`else\` ran only on success, the \`except\` ran only for the matching type, and \`finally\` ran in all three calls, including the one where the \`TypeError\` escaped to the caller. \`KeyboardInterrupt\` is not an \`Exception\`, the broad \`LookupError\` clause shadowed the \`KeyError\` clause, \`err\` no longer exists after its block, and a \`return\` in \`finally\` threw the \`ValueError\` away.

## 9. Which Clause for Which Job

| Clause | Runs when | Use it for | Avoid |
| :--- | :--- | :--- | :--- |
| \`try\` | always (first) | the one or two lines that can fail | wrapping a whole function |
| \`except E as e\` | an \`E\` (or subclass) was raised in \`try\` | recovering, translating, logging and re-raising | \`except:\` or \`except Exception: pass\` |
| \`else\` | \`try\` raised nothing | follow-up work whose errors should not be caught above | putting it all in \`try\` instead |
| \`finally\` | always (last) | closing, releasing, restoring state | \`return\` / \`break\` inside it |

For resources (files, locks, connections), a \`with\` statement is usually cleaner than \`try/finally\`: the [context manager](/interview-question/what-is-a-context-manager) runs the clean-up for you.

## 10. Edge Cases

- **An exception inside \`except\` or \`finally\`** replaces the one being handled; Python keeps the old one as \`__context__\` and prints both ("During handling of the above exception, another exception occurred").
- **\`sys.exit()\`** raises \`SystemExit\`; it is an exception, so \`finally\` blocks still run, and a bare \`except:\` would swallow it.
- **\`sys.exception()\`** (added in 3.11, per the 3.11 docs) returns the exception currently being handled, or \`None\` outside a handler; older code uses \`sys.exc_info()\`.
- **Several exceptions at once** (from concurrent tasks) arrive as an \`ExceptionGroup\` and are handled with \`except*\`; see the [except* page](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11).
- **\`assert\`** raises \`AssertionError\`, but asserts are removed when Python runs with \`-O\`, so never use them to validate user input.

## Common Pitfalls

- **\`except Exception: pass\`.** It hides real bugs (a typo raising \`NameError\` is swallowed too). Catch the specific error you expect and at least log the rest.
- **A huge \`try\` block.** If ten lines are inside \`try\`, you cannot tell which one raised the \`KeyError\` you caught. Keep only the failing line inside and move the rest to \`else\`.
- **Specific clause after a general one.** \`except Exception\` above \`except ValueError\` means the \`ValueError\` branch never runs.
- **\`raise e\` instead of \`raise\`.** It works, but adds the current line to the traceback; bare \`raise\` is the idiom for "pass it on unchanged".
- **Using \`e\` after the block.** The \`as\` name is deleted at the end of the handler; you get a \`NameError\`.
- **\`return\` in \`finally\`.** It silently discards an in-flight exception.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The model:</strong> <span style="color:#f0e2c8;">An exception is an object of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseException</code> subclass. Raising it stops the current code and it travels up the call stack until an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> clause matches it, or the program prints a traceback and exits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The clauses:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> holds the risky lines, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> handles matching errors, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> runs only if nothing was raised, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> runs on every exit, even a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Matching:</strong> <span style="color:#f0e2c8;">It is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> check, top to bottom, first match wins, so specific classes go first; a tuple catches several types; only one handler runs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Good practice:</strong> <span style="color:#f0e2c8;">Catch the narrowest class you can handle, never a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except:</code>, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> small, use bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise</code> to log and re-raise, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> for clean-up.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. CPython detail:</strong> <span style="color:#f0e2c8;">Since 3.11 exceptions are "zero-cost": <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> compiles to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOP</code> plus an exception table, so the happy path is free but raising is expensive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a bare <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except:</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It catches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseException</code>, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyboardInterrupt</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SystemExit</code>, so Ctrl+C and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.exit()</code> stop working. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except Exception:</code> leaves those alone, and a specific class is better still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the point of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">else</code> if I can put the code in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> is not protected by the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> clauses, so an unexpected error there is not mistaken for the error you meant to handle. It also documents which line is expected to fail.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code> run if the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try</code> block returns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> runs before the function actually returns. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> itself returns, its value wins and any in-flight exception is discarded, which is why 3.14 warns about it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">e</code> after the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except</code> block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CPython deletes the name at the end of the handler. The exception references its traceback, which references the frame, which references <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e</code>; deleting it breaks that cycle so the frame can be freed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are exceptions slow in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Entering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> is almost free since 3.11. Raising and catching costs far more than an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, so for a failure that happens on most calls, a check or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.get</code> is faster.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Exception** | an object describing an error; an instance of a \`BaseException\` subclass |
| **Raise** | signal an error, by Python or with the \`raise\` statement |
| **Traceback** | the printed chain of calls that led to an unhandled exception |
| **Exception handler** | an \`except\` clause that runs for a matching exception |
| **Clean-up clause** | \`finally\`, which runs on every exit from the \`try\` statement |
| **Exception hierarchy** | the class tree rooted at \`BaseException\`; \`except\` matches subclasses too |
| **Bare except** | \`except:\` with no class; catches everything, including Ctrl+C |
| **Re-raise** | bare \`raise\` inside a handler, passing the same exception on |
| **Zero-cost exceptions** | CPython 3.11+: no cost to enter \`try\`, cost only when raising |

---
**Conclusion:** Python exception handling is a small set of rules. An exception is an object that interrupts the current code and climbs the call stack; \`except\` clauses are \`isinstance\` checks tried top to bottom; \`else\` is the success path that is deliberately not protected; and \`finally\` always runs, even past a \`return\`. Write narrow handlers around the line that can fail, re-raise with a bare \`raise\`, never use a bare \`except:\` or a \`return\` inside \`finally\`, and remember that in CPython 3.11+ the \`try\` itself is free while raising is what costs.
`,
    examples: [
      { label: `try / except / else / finally: which clause runs when`, code: `# The four clauses of try, and the order they run in.
log = []

def divide(a, b):
    log.clear()
    try:
        log.append("try")
        result = a / b
    except ZeroDivisionError as e:
        log.append("except: " + type(e).__name__)
        return None
    else:
        # Runs only when the try block raised nothing.
        log.append("else")
        return result
    finally:
        # Runs on every way out: normal, return, or an exception passing through.
        log.append("finally")

print(divide(10, 4))  # 2.5
print(log)
print(divide(1, 0))  # None
print(log)

try:
    divide("ten", 2)
except TypeError as e:
    print("caught outside:", e)
print(log)

# Clauses are tested top to bottom; the first match wins.
def classify(value):
    try:
        return int(value)
    except (TypeError, ValueError) as e:
        return "bad input: " + type(e).__name__

print(classify("42"))  # 42
print(classify("4x2"))  # bad input: ValueError
print(classify(None))  # bad input: TypeError` },
      { label: `The hierarchy, clause order, the deleted as-name, bare raise and finally traps`, code: `# Exceptions are classes, and except matches with isinstance.
print([c.__name__ for c in ZeroDivisionError.__mro__])
print(issubclass(KeyError, LookupError))  # True
print(issubclass(KeyboardInterrupt, Exception))  # False

# A broad clause first hides the specific one below it.
def lookup(d, key):
    try:
        return d[key]
    except LookupError:
        return "LookupError clause"
    except KeyError:
        return "KeyError clause (never reached)"

print(lookup({}, "x"))  # LookupError clause

# The name bound by "as" is deleted when the except block ends.
try:
    {}["missing"]
except KeyError as err:
    print("inside:", repr(err))
print("err" in globals())  # False

# A bare raise re-raises the exception being handled, unchanged.
def reraise():
    try:
        [][0]
    except IndexError:
        print("logging it, then re-raising")
        raise

try:
    reraise()
except IndexError as e:
    print("caller got:", type(e).__name__, "-", e)

# finally runs even when the try block returns.
def early():
    try:
        return "from try"
    finally:
        print("finally still ran")

print(early())

# Trap: a return inside finally replaces the exception, which is lost.
def swallow():
    try:
        raise ValueError("this error disappears")
    finally:
        return "finally won"

print(swallow())  # finally won` },
    ],
  },
  {
    title: `How do you create and chain custom exceptions?`,
    difficulty: "medium",
    seoDescription: `Design a custom exception hierarchy in Python, chain errors with raise from, hide context with from None, add notes and keep them picklable.`,
    description: `**Question presented to candidate:**
"Say you are writing a payments library. How would you design its exceptions, and when one of your functions catches a low-level error like a ValueError, how do you raise your own error without losing the original one?"

**What a strong answer should cover:**
- Subclass \`Exception\` (not \`BaseException\`), give the library one base class so callers can catch everything with one clause, and add specific subclasses for errors callers handle differently
- Extra data goes in attributes set in \`__init__\`, with every argument passed on to \`super().__init__\` so \`args\`, \`str()\` and pickling keep working; override \`__str__\` only for the message
- \`raise New(...) from original\` sets \`__cause__\` (explicit chaining); raising inside an \`except\` block sets \`__context__\` automatically (implicit chaining); the traceback wording differs
- \`raise New(...) from None\` sets \`__suppress_context__\` so the internal error is hidden from the traceback but still kept on \`__context__\`
- \`add_note()\` (3.11+, PEP 678) attaches extra context to an exception after it was raised
- Chaining dates from PEP 3134 (Python 3.0) and \`from None\` from PEP 415 (3.3)

**Clarifying questions expected:**
- Who catches these errors: application code, an HTTP layer that maps them to status codes, or both?
- Do the errors need to cross process boundaries (multiprocessing, task queues), which requires pickling?

**Code / implementation expected:** Yes — a small hierarchy with one attribute-carrying subclass, and a function that translates a built-in error with \`raise ... from e\`.`,
    answer: `**Target Audience:** Python developers who know try/except and want to design errors for a library or service
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); \`add_note\` needs 3.11+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A customer calls a support line: "my payment failed". The first-line agent looks it up and sees a cryptic message from the bank's computer: \`invalid literal for int() with base 10: '12,50'\`. That message is true, but useless to the customer and to the agent. What the agent needs is a clear category ("the price was formatted wrongly") **and** the original technical message attached to the ticket, so the engineer who picks it up later can see exactly what broke.

Custom exceptions are the clear category. Exception chaining is the "attach the original message to the ticket" part. Together they let a library speak its own language ("card declined", "gateway timed out") to the people calling it, without destroying the evidence of what went wrong underneath.

If you need a refresher on \`try\`/\`except\` itself, start with [how exception handling works in Python](/interview-question/how-does-exception-handling-work-in-python).

## 2. Creating a Custom Exception

A custom exception is just a class that inherits from \`Exception\`:

~~~python
class PaymentError(Exception):
    """Base class: callers can catch every payment failure with one clause."""
~~~

That is enough: it can be raised, caught, and it prints its message. Inherit from \`Exception\`, not \`BaseException\`; the latter is reserved for things like \`KeyboardInterrupt\` that ordinary \`except Exception:\` handlers should not catch.

📌 **Interview term: Custom exception** — a class derived from \`Exception\` that names an error specific to your code, so callers can catch it by type instead of parsing messages.

### Design a small hierarchy

Give your package **one base class**, then subclasses for errors a caller would handle differently:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 300" role="img" aria-label="Class tree: Exception at the top, PaymentError below it, and CardDeclined and GatewayTimeout below PaymentError">
  <defs>
    <marker id="ce1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="220" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="310" y="44" text-anchor="middle">Exception</text>
  <text class="d-sub" x="310" y="64" text-anchor="middle">built in</text>
  <rect class="d-box-accent" x="220" y="120" width="180" height="56" rx="10"/>
  <text class="d-text" x="310" y="144" text-anchor="middle">PaymentError</text>
  <text class="d-sub" x="310" y="164" text-anchor="middle">package base class</text>
  <rect class="d-box" x="60" y="224" width="200" height="56" rx="10"/>
  <text class="d-text" x="160" y="248" text-anchor="middle">CardDeclined</text>
  <text class="d-sub" x="160" y="268" text-anchor="middle">card_last4, reason</text>
  <rect class="d-box" x="360" y="224" width="200" height="56" rx="10"/>
  <text class="d-text" x="460" y="248" text-anchor="middle">GatewayTimeout</text>
  <text class="d-sub" x="460" y="268" text-anchor="middle">retry later</text>
  <path class="d-edge" d="M 310 120 L 310 80" marker-end="url(#ce1-arrow)"/>
  <path class="d-edge" d="M 160 224 L 280 180" marker-end="url(#ce1-arrow)"/>
  <path class="d-edge" d="M 460 224 L 340 180" marker-end="url(#ce1-arrow)"/>
</svg>

Arrows point from a subclass to its parent. A caller that only wants "did the payment fail?" writes \`except PaymentError\`; a caller that retries timeouts writes \`except GatewayTimeout\` first.

📌 **Interview term: Base exception for a package** — one class (often named after the package, like \`requests.RequestException\`) that every error from the package inherits from, so one \`except\` clause covers the whole API.

### Carry data as attributes

~~~python
class CardDeclined(PaymentError):
    def __init__(self, card_last4, reason):
        super().__init__(card_last4, reason)   # keeps .args complete
        self.card_last4 = card_last4
        self.reason = reason

    def __str__(self):
        return "card ending " + self.card_last4 + " declined: " + self.reason
~~~

Three choices worth explaining in an interview:

1. **Attributes, not a parsed message.** Callers read \`e.reason\`; they never split strings.
2. **Pass every argument to \`super().__init__\`.** \`BaseException\` stores them in \`e.args\`. That tuple is what \`repr()\` shows and, importantly, what \`pickle\` uses to rebuild the exception (Section 6).
3. **Override \`__str__\`** for a readable message instead of formatting it into \`args\`.

Example 1 prints \`CardDeclined | card ending 4242 declined: insufficient funds | ('4242', 'insufficient funds')\`: the custom message, then the complete \`args\`. Its MRO, \`['CardDeclined', 'PaymentError', 'Exception', 'BaseException', 'object']\`, is why \`except PaymentError\` catches it.

A \`@dataclass\` also works for exceptions with many fields, but the same rule about \`args\` and pickling applies; see [dataclasses](/interview-question/what-are-dataclasses).

## 3. Chaining: Keeping the Original Error

Inside an \`except\` block you often turn a low-level error into one of yours. There are three ways to do it, and each sets different attributes on the new exception.

### Explicit: \`raise ... from e\`

~~~python
def load_price(raw):
    try:
        return int(raw)
    except ValueError as e:
        raise PaymentError("bad price " + repr(raw)) from e
~~~

\`from e\` stores the original on the new exception's \`__cause__\`. The traceback prints the original first, then **"The above exception was the direct cause of the following exception:"**, then yours.

📌 **Interview term: Explicit chaining** — \`raise NewError(...) from original\`, which sets \`NewError.__cause__ = original\` and says "this error was caused by that one".

### Implicit: raising inside an \`except\` block

If you raise any exception while another one is being handled, Python links them for you, through \`__context__\`. It does this even if you did not mean to (a bug in your handler). The traceback wording is **"During handling of the above exception, another exception occurred:"**, which reads like "something went wrong while handling it".

📌 **Interview term: Implicit chaining** — automatic linking: an exception raised while another is being handled gets the first one as its \`__context__\`.

### Suppressed: \`raise ... from None\`

When the original error is an internal detail that would only confuse the reader, \`from None\` hides it from the traceback. It sets \`__suppress_context__ = True\`. The original is still stored on \`__context__\` for debugging tools; it just is not printed.

📌 **Interview term: Context suppression** — \`raise NewError(...) from None\`; sets \`__suppress_context__\` so the traceback shows only the new error.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="A ConfigError pointing to the ValueError it wraps, through cause for raise from and through context for any raise inside an except block">
  <defs>
    <marker id="ce2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="70" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="100" text-anchor="middle">ConfigError</text>
  <text class="d-sub" x="130" y="122" text-anchor="middle">what the caller sees</text>
  <rect class="d-box" x="410" y="70" width="200" height="70" rx="10"/>
  <text class="d-text" x="510" y="100" text-anchor="middle">ValueError</text>
  <text class="d-sub" x="510" y="122" text-anchor="middle">the original problem</text>
  <path class="d-edge-accent" d="M 230 90 L 406 90" marker-end="url(#ce2-arrow)"/>
  <text class="d-text d-accent" x="318" y="40" text-anchor="middle">__cause__</text>
  <text class="d-sub" x="318" y="62" text-anchor="middle">set by raise from</text>
  <path class="d-edge-dashed" d="M 230 122 L 406 122" marker-end="url(#ce2-arrow)"/>
  <text class="d-text" x="318" y="172" text-anchor="middle">__context__</text>
  <text class="d-sub" x="318" y="194" text-anchor="middle">set automatically</text>
</svg>

After \`raise ConfigError(...) from e\`, both arrows point at the same \`ValueError\`: Example 1 prints \`context is cause: True\`. With a plain \`raise\` inside \`except\`, only the dashed \`__context__\` link exists and \`__cause__\` is \`None\`.

### What each form sets

From Example 1 (run on 3.11):

| How you raise | \`__cause__\` | \`__context__\` | \`__suppress_context__\` | Traceback says |
| :--- | :--- | :--- | :--- | :--- |
| \`raise New() from e\` | \`e\` | \`e\` | \`True\` | "The above exception was the direct cause..." |
| \`raise New()\` inside \`except\` | \`None\` | the handled error | \`False\` | "During handling of the above exception..." |
| \`raise New() from None\` | \`None\` | the handled error | \`True\` | only \`New\` |

The traceback printer shows \`__cause__\` if it is set, otherwise \`__context__\` unless \`__suppress_context__\` is true. That one rule explains all three rows.

History, checked against the PEPs: \`__cause__\`, \`__context__\` and \`raise ... from\` come from [PEP 3134](https://peps.python.org/pep-3134/) (Python 3.0); \`from None\` and \`__suppress_context__\` from [PEP 415](https://peps.python.org/pep-0415/) (Python 3.3), which replaced the mechanism first proposed in PEP 409.

## 4. What the Traceback Looks Like

The real traceback for the explicit form, from \`python3.11 main.py\` (the file path shortened to \`main.py\`):

~~~text
Traceback (most recent call last):
  File "main.py", line 6, in read_port
    return int(raw)
           ^^^^^^^^
ValueError: invalid literal for int() with base 10: 'eighty'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "main.py", line 10, in <module>
    read_port("eighty")
  File "main.py", line 8, in read_port
    raise ConfigError("PORT must be a number") from e
ConfigError: PORT must be a number
~~~

Example 2 prints the same report for all three forms, with the \`File\` lines removed (they contain machine paths). You can see the two different sentences, and that \`from None\` leaves only one traceback.

## 5. Notes: Adding Context Later (3.11+)

Sometimes the useful context ("which config file? which row?") is known only by a caller higher up, not where the error was raised. Wrapping in yet another exception just to add a sentence is clumsy. Since Python 3.11, \`BaseException.add_note(text)\` appends a string to \`e.__notes__\`, and the traceback prints the notes after the message ([PEP 678](https://peps.python.org/pep-0678/)).

~~~python
try:
    read_port("x")
except ConfigError as e:
    e.add_note("while loading settings.toml, section [server]")
    raise
~~~

📌 **Interview term: Exception note** — a string added with \`add_note()\` (3.11+), stored in \`__notes__\` and printed under the exception message; it adds context without changing the exception type.

## 6. The Pickling Trap

Exceptions are pickled whenever they cross a process boundary: \`multiprocessing\`, \`concurrent.futures.ProcessPoolExecutor\`, task queues. \`pickle\` rebuilds an exception by calling \`cls(*e.args)\`. If your \`__init__\` takes two arguments but passes only one to \`super().__init__\`, then \`args\` holds one value and the rebuild fails. Example 2 shows it:

~~~text
BadError fails to unpickle: BadError.__init__() missing 1 required positional argument: 'message'
GoodError round-trips: 404 (404, 'not found')
~~~

The fix is the rule from Section 2: pass every constructor argument to \`super().__init__\`, or define \`__reduce__\`.

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — a hierarchy, and the three ways to chain** prints:

~~~text
charged
CardDeclined | card ending 4242 declined: insufficient funds | ('4242', 'insufficient funds')
GatewayTimeout | no reply after 30 s | ('no reply after 30 s',)
['CardDeclined', 'PaymentError', 'Exception', 'BaseException', 'object']
cause: ValueError("invalid literal for int() with base 10: '12,50'")
context is cause: True
suppress_context: True
cause: None | context: KeyError('rate')
cause: None | context kept: KeyError('rate') | suppress: True
~~~

**Example 2 — what the traceback says, notes, and pickling** prints:

~~~text
-- read_port
Traceback (most recent call last):
ValueError: invalid literal for int() with base 10: 'eighty'
The above exception was the direct cause of the following exception:
Traceback (most recent call last):
ConfigError: PORT must be a number
-- read_port_implicit
Traceback (most recent call last):
ValueError: invalid literal for int() with base 10: 'eighty'
During handling of the above exception, another exception occurred:
Traceback (most recent call last):
ConfigError: PORT must be a number
-- read_port_hidden
Traceback (most recent call last):
ConfigError: PORT must be a number
-- notes: ['while loading settings.toml, section [server]']
['ConfigError: PORT must be a number', 'while loading settings.toml, section [server]']
BadError fails to unpickle: BadError.__init__() missing 1 required positional argument: 'message'
GoodError round-trips: 404 (404, 'not found')
~~~

**What the output shows:** one \`except PaymentError\` caught both subclasses and the success path; \`from e\` set \`__cause__\`, \`__context__\` and \`__suppress_context__\`; a plain raise inside \`except\` set only \`__context__\`; \`from None\` kept \`__context__\` but suppressed it. In the tracebacks, the two chaining sentences differ, \`from None\` printed one traceback, and the note appeared under the message.

## 8. Edge Cases

- **Re-raising the same exception** with bare \`raise\` is not chaining: nothing new is created, so no \`__cause__\` or \`__context__\` is added.
- **\`raise New() from e\` outside an \`except\` block** is allowed; \`__cause__\` is set but \`__context__\` stays \`None\` because nothing was being handled.
- **Chains can be long.** Each exception points to the previous one; logging tools follow \`__cause__\` / \`__context__\` until they hit \`None\`.
- **Several errors at once** (for example from parallel tasks) are not a chain but a group: see [except* and ExceptionGroup](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11).
- **Name your classes with an \`Error\` suffix** (PEP 8 recommends it for exceptions that are errors), and keep each in the module that raises it, re-exported from the package root.

## Common Pitfalls

- **Subclassing \`BaseException\`.** Your error then slips past every \`except Exception:\` handler, like Ctrl+C does.
- **Not passing all arguments to \`super().__init__\`.** \`args\` is incomplete, \`repr()\` misleads, and the exception cannot be unpickled in another process.
- **Losing the original.** \`except ValueError: raise ConfigError("bad")\` keeps it only as implicit context with the misleading "during handling" wording; use \`from e\` when one error causes the other.
- **Using \`from None\` everywhere.** It hides the information the next engineer needs; keep it for cases where the inner error is a pure implementation detail.
- **One exception class per message.** Too many classes nobody catches separately is noise; add a subclass only when some caller would handle it differently.
- **Encoding data in the message string.** Callers end up parsing text; put it in attributes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Creating one:</strong> <span style="color:#f0e2c8;">Subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exception</code>, give the package one base class like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PaymentError</code>, and add subclasses only where callers handle errors differently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Carrying data:</strong> <span style="color:#f0e2c8;">Store fields as attributes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code>, pass every argument to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().&#95;&#95;init&#95;&#95;</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">args</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> and pickling work, and override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;str&#95;&#95;</code> for the message.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explicit chaining:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise PaymentError(...) from e</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;cause&#95;&#95;</code>; the traceback says "The above exception was the direct cause of the following exception".</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Implicit and suppressed:</strong> <span style="color:#f0e2c8;">Raising inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;context&#95;&#95;</code> automatically ("During handling..."); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from None</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;suppress&#95;context&#95;&#95;</code> to hide it, though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;context&#95;&#95;</code> is still kept.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;">Since 3.11, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.add&#95;note(...)</code> adds context later without wrapping; chaining itself dates from PEP 3134 in Python 3.0.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;cause&#95;&#95;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;context&#95;&#95;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;cause&#95;&#95;</code> is set only by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise ... from x</code> and means "caused by". <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;context&#95;&#95;</code> is set automatically whenever you raise while handling another exception, intended or not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">raise ... from None</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the inner error is an implementation detail, like a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyError</code> from an internal lookup behind a public <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnknownCurrency</code> error. It shortens the traceback; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;context&#95;&#95;</code> still holds the original.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your custom exception fail in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The worker pickles it and the parent rebuilds it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls(&#42;args)</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code> needs more arguments than were passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().&#95;&#95;init&#95;&#95;</code>, the rebuild raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. Pass them all, or define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;reduce&#95;&#95;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you inherit from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Exception</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BaseException</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exception</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseException</code> subclasses (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyboardInterrupt</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SystemExit</code>) are meant to get past normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except Exception:</code> handlers; a library error should not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add context to an error you did not raise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In 3.11+, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.add&#95;note("...")</code> and re-raise with bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise</code>. Before 3.11, wrap it in your own exception with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise ... from e</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Custom exception** | your own \`Exception\` subclass that names a specific error |
| **Base exception for a package** | one class every error from the package inherits from |
| **Explicit chaining** | \`raise New from e\`; sets \`__cause__\` |
| **Implicit chaining** | raising inside \`except\`; Python sets \`__context__\` automatically |
| **Context suppression** | \`raise New from None\`; sets \`__suppress_context__\` to hide the context |
| **Exception note** | text added with \`add_note()\` (3.11+), printed under the message |

---
**Conclusion:** A good exception design is a small tree: one base class per package, a few subclasses that callers actually distinguish, and data in attributes with every constructor argument passed to \`super().__init__\`. When you translate an error, chain it: \`from e\` records the cause, an accidental raise in a handler records context, and \`from None\` hides an internal detail while keeping it on the object. Add notes in 3.11+ for context that is known only higher up, and remember that exceptions are rebuilt from \`args\` whenever they cross a process.
`,
    examples: [
      { label: `A custom hierarchy, and __cause__ / __context__ for the three ways to chain`, code: `# A small exception hierarchy for one library.
class PaymentError(Exception):
    """Base class: callers can catch every payment failure with one clause."""

class CardDeclined(PaymentError):
    def __init__(self, card_last4, reason):
        super().__init__(card_last4, reason)   # keeps .args complete
        self.card_last4 = card_last4
        self.reason = reason

    def __str__(self):
        return "card ending " + self.card_last4 + " declined: " + self.reason

class GatewayTimeout(PaymentError):
    pass

def charge(kind):
    if kind == "declined":
        raise CardDeclined("4242", "insufficient funds")
    if kind == "timeout":
        raise GatewayTimeout("no reply after 30 s")
    return "charged"

for kind in ["ok", "declined", "timeout"]:
    try:
        print(charge(kind))
    except PaymentError as e:
        print(type(e).__name__, "|", e, "|", e.args)

print([c.__name__ for c in CardDeclined.__mro__])

# Explicit chaining: raise ... from ...
def load_price(raw):
    try:
        return int(raw)
    except ValueError as e:
        raise PaymentError("bad price " + repr(raw)) from e

try:
    load_price("12,50")
except PaymentError as e:
    print("cause:", repr(e.__cause__))
    print("context is cause:", e.__context__ is e.__cause__)
    print("suppress_context:", e.__suppress_context__)

# Implicit chaining: a new error raised inside an except block.
try:
    try:
        {}["rate"]
    except KeyError:
        raise RuntimeError("fallback also failed")
except RuntimeError as e:
    print("cause:", e.__cause__, "| context:", repr(e.__context__))

# from None: hide the internal error from the traceback.
try:
    try:
        {}["rate"]
    except KeyError:
        raise LookupError("unknown currency") from None
except LookupError as e:
    print("cause:", e.__cause__, "| context kept:", repr(e.__context__), "| suppress:", e.__suppress_context__)` },
      { label: `What the traceback says for each chain, add_note, and the pickling trap`, code: `import pickle
import traceback

def headline_lines(exc):
    """The traceback text without the File lines (they hold machine paths)."""
    text = "".join(traceback.format_exception(exc))
    return [line for line in text.splitlines() if line and not line.startswith(" ")]

class ConfigError(Exception):
    pass

def read_port(raw):
    try:
        return int(raw)
    except ValueError as e:
        raise ConfigError("PORT must be a number") from e

def read_port_implicit(raw):
    try:
        return int(raw)
    except ValueError:
        raise ConfigError("PORT must be a number")

def read_port_hidden(raw):
    try:
        return int(raw)
    except ValueError:
        raise ConfigError("PORT must be a number") from None

for fn in [read_port, read_port_implicit, read_port_hidden]:
    try:
        fn("eighty")
    except ConfigError as e:
        print("--", fn.__name__)
        for line in headline_lines(e):
            print(line)

# Notes (3.11+): add context after the exception was raised.
try:
    try:
        read_port("x")
    except ConfigError as e:
        e.add_note("while loading settings.toml, section [server]")
        raise
except ConfigError as e:
    print("-- notes:", e.__notes__)
    print(headline_lines(e)[-2:])

# Pickle pitfall: extra __init__ arguments that are not passed to super().
class BadError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code

class GoodError(Exception):
    def __init__(self, code, message):
        super().__init__(code, message)
        self.code = code

for cls in [BadError, GoodError]:
    try:
        copy = pickle.loads(pickle.dumps(cls(404, "not found")))
        print(cls.__name__, "round-trips:", copy.code, copy.args)
    except TypeError as err:
        print(cls.__name__, "fails to unpickle:", err)` },
    ],
  },
  {
    title: `How does exception propagation work up the call stack?`,
    difficulty: "medium",
    seoDescription: `How a Python exception unwinds the call stack frame by frame, runs finally blocks, builds the traceback, and where propagation stops.`,
    description: `**Question presented to candidate:**
"A function four calls deep raises a ValueError, and only the top-level function has a try/except. Walk me through exactly what Python does between the raise and the handler. What runs on the way up, and where can the exception get stopped or lost?"

**What a strong answer should cover:**
- Raising stops the current frame; Python looks for a matching handler in that frame, and if there is none the frame is discarded and the search continues in the caller, frame by frame (stack unwinding)
- On the way up every \`finally\` block and every \`with\` block exit (\`__exit__\`) runs; \`except\` clauses that do not match are skipped
- The traceback is built as the exception passes each frame: a linked list of traceback objects (\`tb_frame\`, \`tb_lineno\`, \`tb_next\`) on \`e.__traceback__\`, outermost frame first
- Propagation stops at a matching \`except\`, at a context manager whose \`__exit__\` returns true (for example \`contextlib.suppress\`), or at the top level, where the interpreter prints the traceback and exits with status 1
- Bare \`raise\` keeps the traceback unchanged while \`raise e\` adds the current line; raising inside a handler replaces the exception (keeping it as \`__context__\`)
- Exceptions do not cross thread boundaries on their own: an uncaught error in a thread goes to \`threading.excepthook\`; \`Future.result()\` re-raises it in the caller

**Clarifying questions expected:**
- Is any of this running in a thread, a generator or an async task? (Each changes who receives the exception.)

**Code / implementation expected:** Optional — a chain of three or four functions with \`finally\` blocks and one handler at the top, printing the order of events.`,
    answer: `**Target Audience:** Python developers who can write try/except and want to know exactly what happens between a raise and its handler
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); the thread and process example on CPython 3.12

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A big company has a chain of command: an intern reports to a team lead, who reports to a manager, who reports to the director. The intern finds a problem they cannot fix. They do not fix it, they do not hide it: they pass it to the team lead. The team lead checks: "is this the kind of problem I deal with?" If not, they tidy their desk (finish what must always be finished) and pass it to the manager. This continues until someone says "yes, this one is mine" and deals with it. If it reaches the director and they cannot deal with it either, the whole project stops and a report is written up explaining who passed it to whom.

That is exception propagation. The intern is the function that raised. The chain of command is the **call stack**. "Is this mine?" is an \`except\` clause. Tidying the desk is \`finally\`. The report is the **traceback**.

## 2. The Call Stack in One Paragraph

Every time a function is called, Python creates a **frame**: a record holding that call's local variables and the line it is currently executing. Frames are stacked: the caller's frame stays alive, paused, while the callee runs on top of it. When a function returns normally, its frame is removed and the caller resumes. The [call stack and the heap](/interview-question/what-is-the-difference-between-the-call-stack-and-the-heap-in-python) page explains frames in depth.

📌 **Interview term: Frame (stack frame)** — the record CPython creates for one function call: its local variables, the code being run and the current instruction. In Python it is visible as a \`frame\` object (\`tb.tb_frame\`, \`sys._getframe()\`).

📌 **Interview term: Call stack** — the chain of frames that are currently active, from the module level at the bottom to the running function at the top.

## 3. What Happens When an Exception Is Raised

1. The current frame stops executing at the line that raised.
2. Python checks whether that line is inside a \`try\` block **in the current frame** whose \`except\` clauses match the exception (an \`isinstance\` test, top to bottom).
3. If one matches, that handler runs and propagation is over. Execution continues after the \`try\` statement.
4. If none matches, any \`finally\` block (or \`with\` exit) for that \`try\` runs, then the frame is **discarded** and the exception is re-raised at the call site in the caller's frame. Go back to step 2 with the caller.
5. If the exception leaves the bottom frame (module level), the interpreter prints the traceback to stderr and the process exits with status 1.

📌 **Interview term: Stack unwinding** — removing frames from the call stack one after another, running their clean-up code, while an exception searches for a handler.

📌 **Interview term: Propagation** — the exception moving from the frame that raised it to its caller, then that caller, until it is handled or reaches the top.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 400" role="img" aria-label="Four stacked frames, parse_id on top raising ValueError, load_user running finally, handle_request skipping except KeyError, and main catching ValueError">
  <defs>
    <marker id="pr1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="20" width="240" height="56" rx="8"/>
  <text class="d-text" x="160" y="53" text-anchor="middle">parse_id</text>
  <rect class="d-box" x="40" y="116" width="240" height="56" rx="8"/>
  <text class="d-text" x="160" y="149" text-anchor="middle">load_user</text>
  <rect class="d-box" x="40" y="212" width="240" height="56" rx="8"/>
  <text class="d-text" x="160" y="245" text-anchor="middle">handle_request</text>
  <rect class="d-box-accent" x="40" y="308" width="240" height="56" rx="8"/>
  <text class="d-text" x="160" y="341" text-anchor="middle">main</text>
  <path class="d-edge-accent" d="M 160 76 L 160 112" marker-end="url(#pr1-arrow)"/>
  <path class="d-edge-accent" d="M 160 172 L 160 208" marker-end="url(#pr1-arrow)"/>
  <path class="d-edge-accent" d="M 160 268 L 160 304" marker-end="url(#pr1-arrow)"/>
  <rect class="d-box-muted" x="350" y="20" width="270" height="56" rx="8"/>
  <text class="d-text" x="485" y="44" text-anchor="middle">int raises ValueError</text>
  <text class="d-sub" x="485" y="64" text-anchor="middle">no try here, frame discarded</text>
  <rect class="d-box-muted" x="350" y="116" width="270" height="56" rx="8"/>
  <text class="d-text" x="485" y="140" text-anchor="middle">finally block runs</text>
  <text class="d-sub" x="485" y="160" text-anchor="middle">then frame discarded</text>
  <rect class="d-box-muted" x="350" y="212" width="270" height="56" rx="8"/>
  <text class="d-text" x="485" y="236" text-anchor="middle">except KeyError</text>
  <text class="d-sub" x="485" y="256" text-anchor="middle">no match, skipped</text>
  <rect class="d-box-accent" x="350" y="308" width="270" height="56" rx="8"/>
  <text class="d-text" x="485" y="332" text-anchor="middle">except ValueError</text>
  <text class="d-sub" x="485" y="352" text-anchor="middle">match, propagation ends</text>
  <path class="d-edge-dashed" d="M 346 48 L 284 48"/>
  <path class="d-edge-dashed" d="M 346 144 L 284 144"/>
  <path class="d-edge-dashed" d="M 346 240 L 284 240"/>
  <path class="d-edge-dashed" d="M 346 336 L 284 336"/>
</svg>

The diagram is Example 1. The newest frame is drawn at the top; the exception travels downwards through the older frames, and each frame gets one chance to handle it.

## 4. Walking Through Example 1

~~~python
def parse_id(text):
    print("  parse_id: about to call int()")
    value = int(text)
    print("  parse_id: int() worked")
    return value

def load_user(text):
    try:
        return {"id": parse_id(text)}
    finally:
        print("  load_user: finally runs while the error passes through")

def handle_request(text):
    try:
        return load_user(text)
    except KeyError:
        print("  handle_request: wrong type, this clause is skipped")

def main(text):
    try:
        return handle_request(text)
    except ValueError as e:
        print("  main: caught", type(e).__name__)
        return e
~~~

For \`main("seven")\`:

- \`int("seven")\` raises \`ValueError\` inside \`parse_id\`. The next \`print\` never runs. \`parse_id\` has no \`try\`, so its frame is discarded.
- In \`load_user\` the call is inside a \`try\` with only a \`finally\`. No handler, so the \`finally\` prints its line and the frame is discarded.
- In \`handle_request\`, \`except KeyError\` is tested and does not match (a \`ValueError\` is not a \`KeyError\`); the clause is skipped and the frame is discarded. Notice its \`print\` never appears.
- In \`main\`, \`except ValueError\` matches. Propagation ends; \`main\` returns normally.

The output order (Section 7) is exactly that: the \`finally\` line, then \`main: caught ValueError\`.

## 5. The Traceback Is Built on the Way Up

As the exception leaves each frame, CPython adds a **traceback object** for that frame to the front of a linked list stored on \`e.__traceback__\`. Each node has \`tb_frame\` (the frame), \`tb_lineno\` (the line that was executing) and \`tb_next\` (the next, deeper node).

<svg class="iq-diagram" width="100%" viewBox="0 0 800 150" role="img" aria-label="Traceback linked list from main to handle_request to load_user to parse_id, then None, connected by tb_next">
  <defs>
    <marker id="pr2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="85" y="66" text-anchor="middle">main</text>
  <text class="d-sub" x="85" y="86" text-anchor="middle">e.__traceback__</text>
  <rect class="d-box" x="200" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="265" y="76" text-anchor="middle">handle_request</text>
  <rect class="d-box" x="380" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="445" y="76" text-anchor="middle">load_user</text>
  <rect class="d-box" x="560" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="625" y="76" text-anchor="middle">parse_id</text>
  <text class="d-sub" x="765" y="76" text-anchor="middle">None</text>
  <path class="d-edge" d="M 150 70 L 196 70" marker-end="url(#pr2-arrow)"/>
  <path class="d-edge" d="M 330 70 L 376 70" marker-end="url(#pr2-arrow)"/>
  <path class="d-edge" d="M 510 70 L 556 70" marker-end="url(#pr2-arrow)"/>
  <path class="d-edge-dashed" d="M 690 70 L 736 70" marker-end="url(#pr2-arrow)"/>
</svg>

Each arrow is a \`tb_next\` link. The head of the list is the frame where the exception was caught, and the tail is where it was raised.

Example 1 walks this list and prints \`['main', 'handle_request', 'load_user', 'parse_id']\`. That is the same order the printed traceback uses, which is why its header says "most recent call last". The real traceback for an uncaught version of the same chain, from \`python3.11 main.py\` (path shortened):

~~~text
Traceback (most recent call last):
  File "main.py", line 10, in <module>
    handle_request("seven")
  File "main.py", line 8, in handle_request
    return load_user(text)
           ^^^^^^^^^^^^^^^
  File "main.py", line 5, in load_user
    return {"id": parse_id(text)}
                  ^^^^^^^^^^^^^^
  File "main.py", line 2, in parse_id
    return int(text)
           ^^^^^^^^^
ValueError: invalid literal for int() with base 10: 'seven'
~~~

📌 **Interview term: Traceback object** — one node per frame the exception passed through (\`tb_frame\`, \`tb_lineno\`, \`tb_next\`); the list hangs off \`exception.__traceback__\` and is what \`traceback.print_exc()\` formats.

### Bare \`raise\` vs \`raise e\`

Example 1 ends by comparing the two ways of re-raising. A bare \`raise\` continues the existing traceback; \`raise e\` raises the object again from the current line, so that line is added in front:

~~~text
bare ['bare line +2', 'parse_id']
named ['named line +4', 'named line +2', 'parse_id']
~~~

With \`raise e\` the handler frame shows up twice (line +4 is the \`raise e\`, line +2 the original call), which makes tracebacks noisier. Use bare \`raise\` to pass an exception on.

One more consequence of the traceback holding frames: a caught exception kept in a variable keeps **every frame and every local variable along its path** alive. That is why CPython deletes the \`except ... as e\` name at the end of the handler (see [how exception handling works](/interview-question/how-does-exception-handling-work-in-python)).

## 6. Where Propagation Stops, Changes Course, or Does Not Reach

Example 2 and Example 3 cover the cases interviewers like to probe.

- **Through C code.** An error in your \`key=\` function passes straight up through the built-in \`sorted()\`. C functions propagate exceptions just like Python frames.
- **Generators.** An exception raised inside a generator comes out of the \`next()\` call (or the \`for\` loop) that resumed it, in the caller's frame. The generator is then finished: \`list(gen)\` afterwards gives \`[]\`. See [a generator's lifecycle](/interview-question/what-is-a-generator-s-lifecycle).
- **Context managers.** When an exception passes through a \`with\` block, \`__exit__(exc_type, exc, tb)\` is called. If it returns a true value, the exception is **swallowed** and propagation stops right there; \`contextlib.suppress(FileNotFoundError)\` is built on this. See [what is a context manager](/interview-question/what-is-a-context-manager).
- **Raising in a handler.** If an \`except\` or \`finally\` block raises, the new exception replaces the old one and carries on upward; the old one is kept as \`__context__\` (more on chaining in [creating and chaining custom exceptions](/interview-question/how-do-you-create-and-chain-custom-exceptions)).
- **Top level.** Nothing caught it: the interpreter calls \`sys.excepthook\`, which prints the traceback to stderr, and the process exits with status 1. Example 3 runs a child interpreter and shows \`exit code: 1\`, empty stdout, and the traceback on stderr.
- **Threads.** Each thread has its own call stack. An exception that escapes a thread function does **not** propagate into the thread that started it; it is passed to \`threading.excepthook\` and the thread ends. The main thread carries on. To get the error back, use \`concurrent.futures\`: \`future.result()\` re-raises the worker exception in the caller. Example 3 shows both.
- **asyncio.** An exception in a task is stored on the task and re-raised where it is awaited; with \`asyncio.TaskGroup\`, failures from several tasks arrive together as an \`ExceptionGroup\`. See [TaskGroup and ExceptionGroup](/interview-question/how-does-taskgroup-handle-cancellation-and-exceptiongroup).

📌 **Interview term: \`sys.excepthook\`** — the function the interpreter calls with an exception that reached the top of the main thread; the default prints the traceback to stderr. \`threading.excepthook\` is the equivalent for other threads.

Example 3 uses \`subprocess\` and real threads, which the in-browser runner does not have, so it is shown as code and was verified on CPython 3.12.

### A note on deep recursion

Propagation through thousands of frames is normal. A \`RecursionError\` (raised when the depth passes \`sys.getrecursionlimit()\`, 1000 by default on our 3.11 run) unwinds every one of those frames on the way out, running each one's \`finally\` blocks, exactly as above.

## 7. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output. Example 3 was run with \`python3.12 main.py\`.

**Example 1 — unwinding four frames** prints:

~~~text
  parse_id: about to call int()
  parse_id: int() worked
  load_user: finally runs while the error passes through
good input: {'id': 7}
bad input:
  parse_id: about to call int()
  load_user: finally runs while the error passes through
  main: caught ValueError
['main', 'handle_request', 'load_user', 'parse_id']
4
  parse_id: about to call int()
bare ['bare line +2', 'parse_id']
  parse_id: about to call int()
named ['named line +4', 'named line +2', 'parse_id']
~~~

**Example 2 — through sorted(), generators and context managers** prints:

~~~text
from inside sorted(): empty word
1
next() raised: source broke
[]
__exit__ saw KeyError
after the with block: KeyError was swallowed
__exit__ saw IndexError
IndexError kept going: __exit__ returned False
contextlib.suppress did the same for FileNotFoundError
caller sees OSError with context ValueError('original problem')
~~~

**Example 3 — uncaught, threads and futures (CPython 3.12)** prints:

~~~text
exit code: 1
stdout: ''
last stderr line: ZeroDivisionError: division by zero
traceback header: Traceback (most recent call last):
main thread still running; hook saw: [('loader', 'ValueError', 'bad row 17')]
re-raised in main by future.result(): bad row 17
~~~

**What the output shows:** on bad input the line after \`int()\` never printed, the \`finally\` in \`load_user\` ran before \`main\` caught the error, and the \`KeyError\` handler in between stayed silent. The traceback list has one node per frame, outermost first. The second program shows the exception surfacing from \`sorted()\` and from \`next()\`, a \`with\` block swallowing a \`KeyError\` but not an \`IndexError\`, and a handler that raised replacing the original. The third shows exit status 1 at the top level, a thread error going to the hook instead of the main thread, and \`future.result()\` bringing it back.

## 8. Propagation at a Glance

| Situation | Who receives the exception | Does unwinding run clean-up? |
| :--- | :--- | :--- |
| No handler in the current frame | the caller, at the call site | yes: \`finally\` and \`__exit__\` in each frame |
| Matching \`except\` | that handler; propagation ends | yes, for the frames above it |
| \`__exit__\` returns true | nobody: it is swallowed | yes |
| Raised inside \`except\` / \`finally\` | the caller; old one kept as \`__context__\` | yes |
| Reaches module level | \`sys.excepthook\`; exit status 1 | yes |
| Escapes a thread function | \`threading.excepthook\`; the starting thread is not affected | yes, within that thread |
| Inside a generator | the code that called \`next()\` | yes; the generator is finished |

## Common Pitfalls

- **Catching too early.** A low-level function that catches and returns \`None\` stops propagation and leaves callers with a value they did not expect. Handle an error at the level that knows what to do about it, often near the top.
- **\`raise e\` instead of \`raise\`.** It adds the current line again; bare \`raise\` keeps the original traceback intact.
- **Assuming threads report errors.** A worker thread that raises just dies; unless you use futures, join and check, or set \`threading.excepthook\`, nobody notices.
- **An \`__exit__\` that returns something truthy by accident.** Returning a non-\`None\` value (for example from a helper call) swallows every exception in the \`with\` block.
- **Storing exceptions long-term.** \`e.__traceback__\` keeps every frame on the path, with all its locals, alive. Keep \`str(e)\` or the formatted traceback instead if you only need the text.
- **Raising in \`finally\`.** It replaces the exception that was propagating, which is then visible only as \`__context__\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The search:</strong> <span style="color:#f0e2c8;">Raising stops the current frame; Python looks for a matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> in that frame, and if there is none it discards the frame and repeats the search in the caller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. On the way up:</strong> <span style="color:#f0e2c8;">Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> block and every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> exit runs, non-matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> clauses are skipped, and a traceback node is added per frame.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where it stops:</strong> <span style="color:#f0e2c8;">At a matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code>, at an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;exit&#95;&#95;</code> that returns true (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.suppress</code>), or at the top, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.excepthook</code> prints the traceback and the process exits with 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The traceback:</strong> <span style="color:#f0e2c8;">It is a linked list on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.&#95;&#95;traceback&#95;&#95;</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tb&#95;frame</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tb&#95;lineno</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tb&#95;next</code>), outermost first, which is why the printout says "most recent call last".</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Boundaries:</strong> <span style="color:#f0e2c8;">Exceptions do not cross threads; they go to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.excepthook</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Future.result()</code> re-raises them in the caller. Generators raise into whoever called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">raise</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">raise e</code> inside an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except</code> block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise</code> re-raises the current exception with its traceback untouched. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise e</code> raises it again from this line, so the handler frame is added once more to the traceback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code> run when the exception is not caught anywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Unwinding runs every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;exit&#95;&#95;</code> on the way up before the interpreter reports the error and exits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a thread raises, does the main thread get the exception?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each thread has its own stack. The error goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.excepthook</code> and the thread ends. Submit work through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ThreadPoolExecutor</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">future.result()</code> to get it re-raised where you need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a context manager stop an exception?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;exit&#95;&#95;</code> returns a true value the exception is suppressed; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.suppress</code> does exactly that for the types you give it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can keeping a caught exception cause a memory leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;traceback&#95;&#95;</code> references every frame it passed through, and those frames reference all their local variables, so nothing on that path can be freed while you hold it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frame (stack frame)** | the record for one function call: locals, code, current line |
| **Call stack** | the chain of active frames, module level at the bottom |
| **Stack unwinding** | discarding frames one by one, running their clean-up, while looking for a handler |
| **Propagation** | the exception moving from callee to caller until handled |
| **Traceback object** | one linked-list node per frame on \`e.__traceback__\` |
| **\`sys.excepthook\`** | what the interpreter calls for an exception nobody caught |

---
**Conclusion:** Exception propagation is a search down the call stack: the frame that raised gets the first chance, then its caller, and so on, with every \`finally\` and \`with\` exit running as each frame is discarded and a traceback node recorded for each. It stops at a matching \`except\`, at an \`__exit__\` that returns true, or at the top, where the traceback is printed and the process exits with status 1. Knowing where it does not go is just as important: not across threads (use futures), and out of a generator only to whoever resumed it.
`,
    examples: [
      { label: `Unwinding four frames: finally, skipped clauses and the traceback chain`, code: `# main -> handle_request -> load_user -> parse_id, and parse_id raises.
def parse_id(text):
    print("  parse_id: about to call int()")
    value = int(text)
    print("  parse_id: int() worked")
    return value

def load_user(text):
    try:
        return {"id": parse_id(text)}
    finally:
        print("  load_user: finally runs while the error passes through")

def handle_request(text):
    try:
        return load_user(text)
    except KeyError:
        print("  handle_request: wrong type, this clause is skipped")

def main(text):
    try:
        return handle_request(text)
    except ValueError as e:
        print("  main: caught", type(e).__name__)
        return e

print("good input:", main("7"))
print("bad input:")
err = main("seven")

# The traceback is a linked list of frames, outermost first.
names = []
tb = err.__traceback__
while tb is not None:
    names.append(tb.tb_frame.f_code.co_name)
    tb = tb.tb_next
print(names)
print(len(names))  # 4

# A bare raise keeps the original traceback; "raise e" adds the current line.
def bare():
    try:
        parse_id("x")
    except ValueError:
        raise

def named():
    try:
        parse_id("x")
    except ValueError as e:
        raise e

for fn in [bare, named]:
    try:
        fn()
    except ValueError as e:
        frames = []
        t = e.__traceback__
        while t is not None:
            name = t.tb_frame.f_code.co_name
            if name == fn.__name__:
                # line number relative to the def line of fn
                frames.append(name + " line +" + str(t.tb_lineno - fn.__code__.co_firstlineno))
            else:
                frames.append(name)
            t = t.tb_next
        print(fn.__name__, frames[1:])` },
      { label: `Propagation through sorted(), generators and context managers`, code: `import contextlib

# 1. An error raised in your callback passes straight through C code (sorted).
def strict_key(word):
    if not word:
        raise ValueError("empty word")
    return len(word)

try:
    sorted(["pear", "", "fig"], key=strict_key)
except ValueError as e:
    print("from inside sorted():", e)

# 2. A generator raises into whoever called next(), and is then finished.
def numbers():
    yield 1
    raise RuntimeError("source broke")
    yield 2

gen = numbers()
print(next(gen))
try:
    next(gen)
except RuntimeError as e:
    print("next() raised:", e)
print(list(gen))  # []

# 3. A context manager can stop propagation: __exit__ returning True swallows it.
class Swallow:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        print("__exit__ saw", exc_type.__name__ if exc_type else None)
        return exc_type is KeyError

with Swallow():
    {}["missing"]
print("after the with block: KeyError was swallowed")

try:
    with Swallow():
        [][0]
except IndexError:
    print("IndexError kept going: __exit__ returned False")

with contextlib.suppress(FileNotFoundError):
    open("/no/such/file.txt")
print("contextlib.suppress did the same for FileNotFoundError")

# 4. An exception raised in an except block replaces the one being handled.
def cleanup_fails():
    try:
        raise ValueError("original problem")
    except ValueError:
        raise OSError("cleanup failed too")

try:
    cleanup_fails()
except OSError as e:
    print("caller sees", type(e).__name__, "with context", repr(e.__context__))` },
      { label: `Uncaught errors, threads and futures (needs real processes and threads)`, runnable: false, python: "3.12", code: `import subprocess
import sys
import threading

# 1. Nobody catches it: the interpreter prints the traceback and exits with 1.
child = subprocess.run(
    [sys.executable, "-c", "def f():\\n    1 / 0\\nf()\\nprint('never')"],
    capture_output=True,
    text=True,
)
print("exit code:", child.returncode)
print("stdout:", repr(child.stdout))
print("last stderr line:", child.stderr.strip().splitlines()[-1])
print("traceback header:", child.stderr.splitlines()[0])

# 2. Exceptions do not cross threads: the worker dies, main carries on.
seen = []

def hook(args):
    seen.append((args.thread.name, args.exc_type.__name__, str(args.exc_value)))

threading.excepthook = hook

def worker():
    raise ValueError("bad row 17")

t = threading.Thread(target=worker, name="loader")
t.start()
t.join()
print("main thread still running; hook saw:", seen)

# 3. To get it back in the caller, a Future re-raises it on .result().
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=1) as pool:
    future = pool.submit(worker)
    try:
        future.result()
    except ValueError as e:
        print("re-raised in main by future.result():", e)` },
    ],
  },
  {
    title: `What is EAFP vs LBYL in Python?`,
    difficulty: "medium",
    seoDescription: `EAFP (try it, catch the error) vs LBYL (check first) in Python: correctness, race conditions, cost of exceptions, and when each is right.`,
    description: `**Question presented to candidate:**
"People say Python prefers 'easier to ask forgiveness than permission'. What do EAFP and LBYL mean, why is EAFP considered Pythonic, and are there cases where you would still check first?"

**What a strong answer should cover:**
- LBYL ("look before you leap") tests preconditions with \`if\` before acting; EAFP ("easier to ask for forgiveness than permission") just performs the operation and handles the specific exception with \`try\`/\`except\`
- Correctness: a check and the operation can disagree (\`"²".isdigit()\` is true but \`int("²")\` fails), and between a check and the use the world can change (time-of-check to time-of-use races on files, or dict keys across threads, as the Python glossary notes)
- EAFP fits duck typing: try the operation instead of testing the type; \`hasattr\` itself works by calling \`getattr\` and catching \`AttributeError\`
- Cost: entering \`try\` is nearly free in CPython 3.11+, but raising and catching is several times slower than an \`if\`, so LBYL (or \`dict.get\`) wins when failure is the common case
- When LBYL is right: validating all user input up front, avoiding partial side effects, and conditions that are cheap and cannot change; keep EAFP \`try\` blocks to the single failing line

**Code / implementation expected:** Optional — the same lookup or file read written both ways, with the race or the edge case that breaks the LBYL version.`,
    answer: `**Target Audience:** Python developers who know try/except and want to know when to check first and when to just try
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You want to borrow a colleague's stapler. One way: walk to their desk, check whether the stapler is there, walk back, ask them by email whether you may borrow it, wait, walk back to the desk... and find that someone else took it while you were waiting. The other way: walk over, pick it up, and if it is not there, deal with that ("never mind, I will use the one at reception").

The first style checks every condition in advance and still fails, because the world changed between the check and the action. The second style just does the thing and has a plan for when it does not work. Python code faces the same choice every time it reads a file, looks up a key, converts a string or calls a method, and the language community has names for both styles.

## 2. The Two Styles

📌 **Interview term: LBYL (Look Before You Leap)** — test the preconditions explicitly with \`if\` before performing the operation. The Python glossary defines it this way and notes that it is characterised by many \`if\` statements.

📌 **Interview term: EAFP (Easier to Ask for Forgiveness than Permission)** — assume the operation will work, perform it, and catch the specific exception if it does not. The Python glossary calls this "common Python coding style", characterised by many \`try\` and \`except\` statements.

The same lookup in both styles:

~~~python
prices = {"apple": 3}

def price_lbyl(item):
    if item in prices:          # one hash lookup here...
        return prices[item]     # ...and a second one here
    return 0

def price_eafp(item):
    try:
        return prices[item]     # one lookup on the happy path
    except KeyError:
        return 0
~~~

And for this particular case, the most Pythonic answer is neither: \`prices.get(item, 0)\` does it in one call. Knowing that a built-in already handles the "missing" case is part of a good answer; see [working with dictionaries](/interview-question/how-do-you-work-with-dictionaries-get-setdefault-items-merging).

## 3. Why Python Leans Towards EAFP

### Reason 1: the check and the operation can disagree

A check is a second, separate rule that is supposed to predict whether the operation will work. Often it predicts badly. Example 1 converts strings to integers with an \`isdigit()\` check (LBYL) and with \`try: int(text)\` (EAFP):

~~~text
'42'      LBYL: 42     EAFP: 42
'-5'      LBYL: None   EAFP: -5
' 7 '     LBYL: None   EAFP: 7
'3.0'     LBYL: None   EAFP: None
'\\xb2'    LBYL: CRASH  EAFP: None
'٣'  LBYL: 3      EAFP: 3
~~~

\`isdigit()\` rejects \`"-5"\` and \`" 7 "\`, which \`int()\` accepts. Worse, the superscript two \`"²"\` (U+00B2) **passes** \`isdigit()\` but \`int()\` refuses it, so the "safe" LBYL version crashed with \`ValueError\`. The EAFP version asks the only authority that matters, \`int()\` itself, so it is right by construction.

### Reason 2: the world can change between the check and the use

📌 **Interview term: TOCTOU (time of check to time of use)** — a race condition where the thing you checked changes before you act on it: the file you saw is deleted, the key you found is removed by another thread.

The Python glossary entry for LBYL describes exactly this: in multi-threaded code, \`if key in mapping: return mapping[key]\` can fail if another thread removes the key after the test, and it says the fix is a lock or the EAFP approach.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Timeline: LBYL checks that the file exists, another process deletes it, then open fails; EAFP has a single open step that either succeeds or raises an error it handles">
  <defs>
    <marker id="ea1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="20" y="74">LBYL</text>
  <rect class="d-box" x="90" y="40" width="160" height="60" rx="8"/>
  <text class="d-text" x="170" y="65" text-anchor="middle">exists(path)</text>
  <text class="d-sub" x="170" y="86" text-anchor="middle">True</text>
  <rect class="d-box-muted" x="300" y="40" width="160" height="60" rx="8"/>
  <text class="d-text" x="380" y="65" text-anchor="middle">file deleted</text>
  <text class="d-sub" x="380" y="86" text-anchor="middle">by someone else</text>
  <rect class="d-box" x="510" y="40" width="160" height="60" rx="8"/>
  <text class="d-text" x="590" y="65" text-anchor="middle">open(path)</text>
  <text class="d-sub" x="590" y="86" text-anchor="middle">FileNotFoundError</text>
  <path class="d-edge" d="M 250 70 L 296 70" marker-end="url(#ea1-arrow)"/>
  <path class="d-edge" d="M 460 70 L 506 70" marker-end="url(#ea1-arrow)"/>
  <text class="d-text d-accent" x="20" y="194">EAFP</text>
  <rect class="d-box-accent" x="90" y="160" width="370" height="60" rx="8"/>
  <text class="d-text" x="275" y="185" text-anchor="middle">try open(path)</text>
  <text class="d-sub" x="275" y="206" text-anchor="middle">one step, nothing can happen in between</text>
  <rect class="d-box" x="510" y="160" width="160" height="60" rx="8"/>
  <text class="d-text" x="590" y="185" text-anchor="middle">except</text>
  <text class="d-sub" x="590" y="206" text-anchor="middle">FileNotFoundError</text>
  <path class="d-edge" d="M 460 190 L 506 190" marker-end="url(#ea1-arrow)"/>
</svg>

In the LBYL row the gap between the first and third box is where the race lives. In the EAFP row there is no gap: the operating system answers the question and performs the action in one call.

Example 2 reproduces this deterministically: a \`gap\` callback deletes the file between \`os.path.exists()\` and \`open()\`. The LBYL reader crashes with \`FileNotFoundError\` even though it "checked". The EAFP reader returns \`"no report"\`.

The same idea gives you **atomic** operations. \`open(path, "x")\` creates a file only if it does not exist, and raises \`FileExistsError\` otherwise. Checking \`os.path.exists()\` first and then opening with \`"w"\` is a race; \`"x"\` plus \`except FileExistsError\` is not.

### Reason 3: it is duck typing

📌 **Interview term: Duck typing** — caring about what an object can do rather than what class it is: "if it has a \`read\` method, I can read from it". EAFP is how you write that: try the method and handle \`AttributeError\`. See [duck typing in Python](/interview-question/what-is-duck-typing-in-python).

~~~python
def read_all(sources):
    out = []
    for src in sources:
        try:
            read = src.read
        except AttributeError:
            out.append("skip " + type(src).__name__)
            continue
        out.append(read())   # outside the try: errors inside read() are not hidden
    return out
~~~

Note how only the **attribute lookup** is inside \`try\`. If \`read()\` itself has a bug that raises \`AttributeError\`, it is not mistaken for "this object has no \`read\`".

Even \`hasattr\`, the classic LBYL tool, is EAFP inside: the built-ins documentation says it is implemented by calling \`getattr(obj, name)\` and seeing whether it raises \`AttributeError\`. That has a surprising consequence, shown in Example 1: a property whose body has a bug raising \`AttributeError\` makes \`hasattr(Account(), "balance")\` return \`False\`, hiding the bug.

## 4. The Cost Question

Entering a \`try\` block is nearly free in CPython 3.11+ ("zero-cost" exceptions; see [how exception handling works](/interview-question/how-does-exception-handling-work-in-python)). Actually **raising** and catching an exception is not: Python creates an exception object, a traceback, and unwinds to the handler.

We timed the two \`dict\` lookups with \`timeit\`, 2 million iterations each on python3.11. The numbers depend on the machine, so they are not part of the page examples; these are from two runs on ours:

| Case | LBYL (\`if key in d\`) | EAFP (\`try d[key]\`) |
| :--- | :--- | :--- |
| key present (success) | about 28 to 37 ns | about 17 ns |
| key missing (failure) | about 18 ns | about 96 to 111 ns |

So EAFP is faster when the operation usually succeeds (one lookup instead of two) and roughly 5 times slower when it usually fails. The rule of thumb: **use exceptions for exceptional cases**. If the "missing" branch is the common one, check first or use \`dict.get\`.

## 5. When LBYL Is the Right Choice

EAFP is the default, not a law. Check first when:

- **You must report every problem, not the first one.** Form or config validation should collect all errors (\`["email is required", "qty must be positive"]\` in Example 2) before doing anything.
- **The action has side effects you cannot undo halfway.** Check that all five files exist before deleting any of them, rather than deleting two and failing on the third.
- **Failure is the common case** (Section 4) or raising is expensive in a hot loop.
- **The condition cannot change under you and is cheap**, like \`if not items:\` or \`if x is None:\`. Nobody writes \`try: items[0]\` to test for an empty list.
- **The check is the operation.** \`isinstance\` checks in \`match\`/\`case\` or a type-dispatch function are not LBYL anti-patterns; they are the logic.

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — parsing, dict lookups, duck typing and hasattr** prints:

~~~text
'42'      LBYL: 42     EAFP: 42
'-5'      LBYL: None   EAFP: -5
' 7 '     LBYL: None   EAFP: 7
'3.0'     LBYL: None   EAFP: None
'\\xb2'    LBYL: CRASH  EAFP: None
'\\u0663'  LBYL: 3      EAFP: 3
True
None
3 3 3
0 0 0
[21.5, 'skip int', 21.5]
False
~~~

**Example 2 — the check-then-use race, atomic create, and a too-wide try** prints:

~~~text
LBYL, no gap: total=42
LBYL, file deleted after the check: FileNotFoundError
EAFP, file deleted first: no report
created / already there
content: first
['email is required', 'qty must be positive']
[]
wide try hides the bug: 0
narrow version reports it: KeyError('qty')
~~~

**What the output shows:** the \`isdigit()\` check rejected valid input and let \`"²"\` through to crash; all three dict lookups agree; duck typing skipped the \`int\`; and \`hasattr\` reported \`False\` because of a bug inside the property. In the second program the LBYL reader crashed after its own check passed, the EAFP reader did not, \`"x"\` mode created the file once, and the too-wide \`try\` returned \`0\` for a cart with a missing \`qty\`, while the narrow version surfaced the \`KeyError('qty')\`.

## 7. Side by Side

| | LBYL | EAFP |
| :--- | :--- | :--- |
| Shape | \`if can_do: do()\` | \`try: do() except Error: ...\` |
| Correct when the check and the operation disagree | no | yes |
| Safe against races (files, threads) | no | yes, when the operation is atomic |
| Cost on success | check + operation | operation only |
| Cost on failure | check only (cheap) | exception raised and caught (expensive) |
| Hides bugs | rarely | yes, if the \`try\` block is too wide |
| Best for | validation, side effects, common failures | lookups, I/O, conversions, duck typing |

## Common Pitfalls

- **A \`try\` block around many lines.** \`except KeyError\` around a whole loop body catches a \`KeyError\` from a bug as well as the one you meant (the \`total_wide\` function in Example 2 returned \`0\`). Put only the one expected-to-fail line inside.
- **Catching \`Exception\` in EAFP code.** EAFP means "catch the specific error this operation raises", not "ignore everything".
- **Trusting string checks.** \`isdigit()\`, \`isnumeric()\` and \`isdecimal()\` follow Unicode rules that do not match what \`int()\` and \`float()\` accept.
- **\`os.path.exists()\` then \`open()\`.** Classic TOCTOU; open directly and catch \`FileNotFoundError\`, or use mode \`"x"\` for create-if-missing.
- **\`hasattr\` on properties.** A property that raises \`AttributeError\` internally reads as "no such attribute".
- **EAFP for frequent failures.** If most lookups miss, the exception cost dominates; use \`dict.get\` or check first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definitions:</strong> <span style="color:#f0e2c8;">LBYL checks preconditions with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> before acting; EAFP performs the operation and catches the specific exception. Python style and its glossary favour EAFP.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Correctness:</strong> <span style="color:#f0e2c8;">The check and the operation can disagree: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"²".isdigit()</code> is true but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int("²")</code> fails. With EAFP the operation itself decides, so it is right by construction.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Races:</strong> <span style="color:#f0e2c8;">Between <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os.path.exists()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open()</code> the file can disappear (TOCTOU); open directly and catch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FileNotFoundError</code>, or use mode <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"x"</code> to create atomically.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Entering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> is nearly free since 3.11, but raising is several times slower than an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, so EAFP wins when failure is rare and LBYL or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.get</code> when it is common.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When LBYL:</strong> <span style="color:#f0e2c8;">Validating all input up front, avoiding half-done side effects, and cheap conditions that cannot change; and always keep the EAFP <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> to one line.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hasattr</code> LBYL or EAFP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It looks like LBYL but is EAFP inside: it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getattr</code> and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>. So a property that raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> by mistake makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasattr</code> say the attribute does not exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does EAFP help with threads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In LBYL another thread can change the state between the check and the action. With EAFP there is one operation; if it is atomic, like a single dict lookup under the GIL, there is no gap to race in. For multi-step updates you still need a lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is EAFP always faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. On success it saves the extra check, but each raised exception costs much more than an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>. On our 3.11 run a missing-key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> took about 100 ns against about 18 ns for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep EAFP from hiding bugs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch the narrowest exception, keep only the line that can fail inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, and put the follow-up work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> or after the block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the most Pythonic way to read a key that might be missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d.get(key, default)</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.defaultdict</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setdefault</code> when you want to insert. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except KeyError</code> when the missing case needs real handling.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LBYL (Look Before You Leap)** | check preconditions with \`if\`, then act |
| **EAFP (Easier to Ask for Forgiveness than Permission)** | act, and catch the specific exception if it fails |
| **TOCTOU (time of check to time of use)** | the state changes between the check and the action |
| **Duck typing** | use an object by what it can do, not by its class |

---
**Conclusion:** EAFP and LBYL are two answers to "what if this fails?". Python favours EAFP because the operation itself is the most accurate check, because it closes the gap that races live in, and because it is how duck typing is written. LBYL still wins for validation, for side effects you cannot roll back, and for failures that are the common case, since raising an exception costs several times more than an \`if\`. Whichever you use, keep the \`try\` to the one line that can fail and catch only the exception you expect.
`,
    examples: [
      { label: `Parsing, dict lookups, duck typing and hasattr: EAFP vs LBYL`, code: `# LBYL: check first, then act.
def to_int_lbyl(text):
    if text.isdigit():
        return int(text)
    return None

# EAFP: just try it, and handle the failure you expect.
def to_int_eafp(text):
    try:
        return int(text)
    except ValueError:
        return None

def safely(fn, text):
    try:
        return str(fn(text))
    except ValueError:
        return "CRASH"

samples = ["42", "-5", " 7 ", "3.0", "\\u00b2", "\\u0663"]
for s in samples:
    print(ascii(s).ljust(9), "LBYL:", safely(to_int_lbyl, s).ljust(6), "EAFP:", safely(to_int_eafp, s))

# The check and the real operation follow different rules.
# U+00B2 is a superscript two: isdigit() says yes, int() says no.
print("\\u00b2".isdigit())  # True
print(to_int_eafp("\\u00b2"))  # None

# Dictionaries: three equivalent lookups.
prices = {"apple": 3}

def price_lbyl(item):
    if item in prices:          # one hash lookup here...
        return prices[item]     # ...and a second one here
    return 0

def price_eafp(item):
    try:
        return prices[item]     # one lookup on the happy path
    except KeyError:
        return 0

print(price_lbyl("apple"), price_eafp("apple"), prices.get("apple", 0))
print(price_lbyl("kiwi"), price_eafp("kiwi"), prices.get("kiwi", 0))

# Duck typing: ask the object to do it instead of checking its type.
class Sensor:
    def read(self):
        return 21.5

def read_all(sources):
    out = []
    for src in sources:
        try:
            read = src.read
        except AttributeError:
            out.append("skip " + type(src).__name__)
            continue
        out.append(read())   # outside the try: errors inside read() are not hidden
    return out

print(read_all([Sensor(), 17, Sensor()]))

# hasattr is EAFP under the hood: it calls getattr and catches AttributeError.
class Account:
    @property
    def balance(self):
        return self._cents / 100   # bug: _cents was never set

print(hasattr(Account(), "balance"))  # False` },
      { label: `Check-then-use races with files, atomic create, and a too-wide try`, code: `import os
import tempfile

folder = tempfile.mkdtemp()
path = os.path.join(folder, "report.txt")

def write_report():
    with open(path, "w") as f:
        f.write("total=42")

def another_process_deletes_it():
    # Stands in for anything that runs between the check and the use:
    # another process, another thread, a cleanup cron job.
    os.remove(path)

# LBYL: the answer to "does it exist?" can be stale a moment later.
def read_lbyl(gap=None):
    if os.path.exists(path):
        if gap:
            gap()
        with open(path) as f:
            return f.read()
    return "no report"

# EAFP: one operation, and the error it raises is the truth.
def read_eafp(gap=None):
    if gap:
        gap()
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return "no report"

write_report()
print("LBYL, no gap:", read_lbyl())
try:
    read_lbyl(gap=another_process_deletes_it)
except FileNotFoundError as e:
    print("LBYL, file deleted after the check:", type(e).__name__)

write_report()
print("EAFP, file deleted first:", read_eafp(gap=another_process_deletes_it))

# Create-if-missing, atomically: mode "x" fails if the file already exists.
def create_once(text):
    try:
        with open(path, "x") as f:
            f.write(text)
        return "created"
    except FileExistsError:
        return "already there"

print(create_once("first"), "/", create_once("second"))
with open(path) as f:
    print("content:", f.read())

# Where LBYL wins: validate everything before doing anything with side effects.
def validate(order):
    problems = []
    if not order.get("email"):
        problems.append("email is required")
    if order.get("qty", 0) <= 0:
        problems.append("qty must be positive")
    return problems

print(validate({"qty": 0}))
print(validate({"email": "a@b.c", "qty": 2}))  # []

# A too-wide EAFP block hides real bugs.
def total_wide(cart):
    try:
        return sum(item["price"] * item["qty"] for item in cart)
    except KeyError:
        return 0

def total_narrow(cart):
    total = 0
    for item in cart:
        price = item.get("price")
        if price is None:
            continue
        total += price * item["qty"]   # a missing qty is a bug: let it raise
    return total

cart = [{"price": 5, "qty": 2}, {"price": 3}]
print("wide try hides the bug:", total_wide(cart))
try:
    total_narrow(cart)
except KeyError as e:
    print("narrow version reports it:", repr(e))` },
    ],
  },
  {
    title: `What is except* and ExceptionGroup in Python 3.11+?`,
    difficulty: "medium",
    seoDescription: `ExceptionGroup and except* in Python 3.11+: raising several errors at once, how handlers split a group, nesting, and the syntax rules.`,
    description: `**Question presented to candidate:**
"Python 3.11 added ExceptionGroup and a new except* syntax. What problem do they solve, and how does except* behave differently from a normal except when a group contains several different errors?"

**What a strong answer should cover:**
- The problem: concurrent tasks or bulk validation can fail in several unrelated ways at once, and a normal exception can only report one; \`ExceptionGroup(message, [exc, ...])\` carries them all (PEP 654, Python 3.11)
- \`except* T\` matches the leaves of the group by type, at any nesting depth, and binds a new group holding only the matching leaves; several \`except*\` clauses can run for one group
- Leaves that no clause matches are re-raised as a group, preserving the nesting; a plain exception caught by \`except*\` arrives wrapped in a group
- Rules: you cannot mix \`except\` and \`except*\` on one \`try\`; \`break\`, \`continue\` and \`return\` are not allowed inside \`except*\`; \`except* ExceptionGroup\` is a \`TypeError\`
- \`ExceptionGroup\` is an \`Exception\`; \`BaseExceptionGroup\` is used when a leaf is a \`BaseException\` such as \`KeyboardInterrupt\`
- Where groups come from in practice: \`asyncio.TaskGroup\` (3.11), and the \`exceptiongroup\` backport for older Pythons

**Code / implementation expected:** Yes — raise a group of two or three different errors and handle them with separate \`except*\` clauses, showing what each handler receives.`,
    answer: `**Target Audience:** Python developers who know try/except and are meeting exception groups for the first time
**Difficulty:** Medium
**Python version:** \`ExceptionGroup\` and \`except*\` need Python 3.11+; checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3), the asyncio example on CPython 3.12

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You send three friends to three shops for party supplies. One comes back saying the bakery was closed. Another says the drinks shop had no ice. The third got everything. If each friend could only report "something went wrong", you would hear one problem and never learn about the other. What you actually want is a single report with **both** problems listed, so that you can deal with the bakery one way and the ice another way.

Before Python 3.11, an exception was always **one** error. That is fine for ordinary sequential code: the first failure stops everything. But when several things run at the same time (network requests in parallel, a batch of rows validated together), several of them can fail independently, and "raise the first one, drop the rest" loses information. Libraries invented their own containers for this (Trio's \`MultiError\` is the one the PEP cites as its motivation), but \`try\`/\`except\` had no way to handle "some of these errors, but not others".

[PEP 654](https://peps.python.org/pep-0654/) (Final, Python 3.11) added two things: a built-in exception type that holds several exceptions, and a new \`except*\` clause for handling them by type.

## 2. ExceptionGroup: Several Errors in One Object

~~~python
raise ExceptionGroup("row is invalid", [
    ValueError("name is empty"),
    TypeError("age must be an int"),
])
~~~

An \`ExceptionGroup\` takes a message and a non-empty list of exception instances. It is itself an exception (\`issubclass(ExceptionGroup, Exception)\` is \`True\`), so it can be raised and caught like any other. Its contents are in \`eg.exceptions\` (a tuple), and the contents can include more groups.

📌 **Interview term: ExceptionGroup** — a built-in \`Exception\` subclass (3.11+) that wraps a message and a sequence of exceptions, so several unrelated failures can be raised together.

📌 **Interview term: Leaf exception** — an exception inside a group that is not itself a group. Groups form a tree; the leaves are the real errors.

The default traceback shows the tree. From \`python3.11 main.py\` (path shortened):

~~~text
  + Exception Group Traceback (most recent call last):
  |   File "main.py", line 1, in <module>
  |     raise ExceptionGroup("row is invalid", [ValueError("name is empty"), TypeError("age must be an int")])
  | ExceptionGroup: row is invalid (2 sub-exceptions)
  +-+---------------- 1 ----------------
    | ValueError: name is empty
    +---------------- 2 ----------------
    | TypeError: age must be an int
    +------------------------------------
~~~

### ExceptionGroup vs BaseExceptionGroup

\`ExceptionGroup\` may only contain \`Exception\` subclasses. If a leaf is a \`BaseException\` like \`KeyboardInterrupt\`, you need \`BaseExceptionGroup\`. On our 3.11 run, \`ExceptionGroup("x", [KeyboardInterrupt()])\` raised \`TypeError: Cannot nest BaseExceptions in an ExceptionGroup\`, while \`BaseExceptionGroup("x", [ValueError()])\` quietly returned an \`ExceptionGroup\`: the constructor picks the narrower type when it can. \`BaseExceptionGroup\` is not an \`Exception\`, so \`except Exception\` does not catch a group holding a Ctrl+C.

## 3. except*: Handling a Group by Type

A normal \`except ValueError\` does not match an \`ExceptionGroup\`, even one full of \`ValueError\`s, because the group is not a \`ValueError\`. You could catch \`ExceptionGroup\` and loop over \`eg.exceptions\` yourself, but then you must handle nesting and re-raise whatever you did not handle. \`except*\` does all of that.

~~~python
try:
    validate({"name": "", "age": "41"})
except* ValueError as eg:
    print("value handler:", [str(e) for e in eg.exceptions])
except* TypeError as eg:
    print("type handler: ", [str(e) for e in eg.exceptions])
except* KeyError as eg:
    print("key handler:  ", [repr(e) for e in eg.exceptions])
~~~

📌 **Interview term: except\\* clause** — a handler (3.11+) that matches the leaves of an exception group by type; it binds a new group containing only the matching leaves, and leaves no clause matches are re-raised.

How it behaves, every point shown in the examples:

1. **Each \`except*\` clause can run.** Unlike \`except\`, where at most one handler runs, here the \`ValueError\` handler and the \`TypeError\` handler and the \`KeyError\` handler all ran for one group.
2. **The name is bound to a group, not to the leaf.** \`eg\` is an \`ExceptionGroup\` holding only the matching leaves. Loop over \`eg.exceptions\` to reach them.
3. **Matching is \`isinstance\`** on each leaf, so \`except* OSError\` catches a \`FileNotFoundError\` and a \`PermissionError\`; tuples of types work too.
4. **Each leaf is handled by the first clause that matches it.** With \`except* FileNotFoundError\` first and \`except* OSError\` second, the \`FileNotFoundError\` goes to the first and only the \`PermissionError\` is left for the second.
5. **Unmatched leaves keep propagating**, re-raised as a group with the same message and nesting: handling only \`ValueError\` left \`ExceptionGroup('row is invalid', [TypeError(...), KeyError('id')])\` for the outer \`try\`.
6. **Nesting is searched and preserved.** The handler for a nested group receives a copy of the tree with only the matching leaves: \`ExceptionGroup('batch', [ValueError('row 1'), ExceptionGroup('row 2', [ValueError('email')])])\`.
7. **A plain exception is wrapped.** If the \`try\` raised a lone \`ValueError\`, \`except* ValueError\` still binds a group: \`ExceptionGroup('', (ValueError('lonely'),))\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="An exception group with ValueError, TypeError and KeyError leaves; except star ValueError receives the ValueError, except star TypeError receives the TypeError, and the KeyError is re-raised in a new group">
  <defs>
    <marker id="eg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="280" height="56" rx="10"/>
  <text class="d-text" x="340" y="44" text-anchor="middle">ExceptionGroup</text>
  <text class="d-sub" x="340" y="64" text-anchor="middle">row is invalid</text>
  <rect class="d-box" x="30" y="130" width="180" height="50" rx="8"/>
  <text class="d-text" x="120" y="160" text-anchor="middle">ValueError</text>
  <rect class="d-box" x="250" y="130" width="180" height="50" rx="8"/>
  <text class="d-text" x="340" y="160" text-anchor="middle">TypeError</text>
  <rect class="d-box" x="470" y="130" width="180" height="50" rx="8"/>
  <text class="d-text" x="560" y="160" text-anchor="middle">KeyError</text>
  <path class="d-edge" d="M 260 76 L 140 126" marker-end="url(#eg1-arrow)"/>
  <path class="d-edge" d="M 340 76 L 340 126" marker-end="url(#eg1-arrow)"/>
  <path class="d-edge" d="M 420 76 L 540 126" marker-end="url(#eg1-arrow)"/>
  <rect class="d-box-accent" x="30" y="240" width="180" height="60" rx="8"/>
  <text class="d-text" x="120" y="265" text-anchor="middle">except&#42; ValueError</text>
  <text class="d-sub" x="120" y="286" text-anchor="middle">gets a group of 1</text>
  <rect class="d-box-accent" x="250" y="240" width="180" height="60" rx="8"/>
  <text class="d-text" x="340" y="265" text-anchor="middle">except&#42; TypeError</text>
  <text class="d-sub" x="340" y="286" text-anchor="middle">gets a group of 1</text>
  <rect class="d-box-muted" x="470" y="240" width="180" height="60" rx="8"/>
  <text class="d-text" x="560" y="265" text-anchor="middle">no clause matches</text>
  <text class="d-sub" x="560" y="286" text-anchor="middle">re-raised as a group</text>
  <path class="d-edge-accent" d="M 120 180 L 120 236" marker-end="url(#eg1-arrow)"/>
  <path class="d-edge-accent" d="M 340 180 L 340 236" marker-end="url(#eg1-arrow)"/>
  <path class="d-edge-dashed" d="M 560 180 L 560 236" marker-end="url(#eg1-arrow)"/>
</svg>

The group is split leaf by leaf. Both handlers run, and the \`KeyError\` that nobody claimed leaves the \`try\` statement inside a new group with the original message.

## 4. The Rules the Compiler Enforces

From Example 2, with the exact messages CPython 3.11 gives:

| Rule | What happens |
| :--- | :--- |
| \`except\` and \`except*\` on the same \`try\` | \`SyntaxError: cannot have both 'except' and 'except*' on the same 'try'\` |
| \`return\`, \`break\` or \`continue\` in an \`except*\` block | \`SyntaxError: 'break', 'continue' and 'return' cannot appear in an except* block\` |
| \`except*:\` with no type | \`SyntaxError: expected one or more exception types\` |
| \`except* ExceptionGroup\` | \`TypeError\` at run time: "catching ExceptionGroup with except* is not allowed. Use except instead." |
| A handler raises a new exception | the new error and the unhandled leaves are combined into a new group for the caller |

The \`return\` ban makes sense once you remember that several \`except*\` clauses can run: a \`return\` in the first would silently skip the others.

The last row is in Example 2: the \`ValueError\` handler raised \`RuntimeError("handler failed")\` while a \`KeyError\` was still unhandled, and the outer code received \`ExceptionGroup('', [RuntimeError('handler failed'), ExceptionGroup('g', [KeyError('k')])])\`.

\`else\` and \`finally\` work with \`except*\` exactly as with \`except\`. Since Python 3.14 the parentheses around several types may be dropped when there is no \`as\`, in both \`except\` and \`except*\` ([PEP 758](https://peps.python.org/pep-0758/)); on 3.11 to 3.13 write \`except* (A, B):\`.

## 5. Where Groups Come From in Real Code

You rarely build groups by hand. The main producer is \`asyncio.TaskGroup\`, also new in 3.11: if one or more child tasks fail, the \`async with\` block raises an \`ExceptionGroup\` of their errors (after cancelling the rest). Example 3 starts three tasks, two of which fail, and handles network and parse errors separately:

~~~python
async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            t1 = tg.create_task(fetch("users", 0.01))
            tg.create_task(fetch("orders", 0.02, ValueError("orders: bad JSON")))
            tg.create_task(fetch("stock", 0.02, ConnectionError("stock: refused")))
        print("not reached")
    except* ValueError as eg:
        print("parse errors:", [str(e) for e in eg.exceptions])
    except* ConnectionError as eg:
        print("network errors:", [str(e) for e in eg.exceptions])
    print("users task finished first:", t1.result())
~~~

It needs \`asyncio.run()\`, which the in-browser runner cannot call (the page already runs inside an event loop), so it is shown as code and was verified on CPython 3.12. How cancellation interacts with this is covered in [how TaskGroup handles cancellation and ExceptionGroup](/interview-question/how-does-taskgroup-handle-cancellation-and-exceptiongroup), and why \`TaskGroup\` replaces \`gather\` in [asyncio.TaskGroup vs gather](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather).

Other producers: bulk validation that wants to report every bad field (Example 1), and retry or clean-up code that collects several failures. The methods for building and taking groups apart yourself (\`split()\`, \`subgroup()\`, \`derive()\`) have their own page: [raising and splitting ExceptionGroups manually](/interview-question/how-do-you-raise-and-split-exceptiongroups-manually).

📌 **Interview term: asyncio.TaskGroup** — an async context manager (3.11+) that runs child tasks, cancels the rest when one fails, and raises all the failures together as an \`ExceptionGroup\`.

Code that must also run on Python 3.10 or earlier cannot use the \`except*\` syntax at all (it is a \`SyntaxError\` there). The \`exceptiongroup\` package on PyPI backports the classes and offers a \`catch()\` helper as a substitute for the syntax.

## 6. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output. Example 3 was run with \`python3.12 main.py\`.

**Example 1 — raising a group and splitting it with except\\*** prints:

~~~text
value handler: ExceptionGroup ['name is empty']
type handler:  ExceptionGroup ['age must be an int']
key handler:   ["KeyError('id')"]
handled only the ValueError
still raised: ExceptionGroup('row is invalid', [TypeError('age must be an int'), KeyError('id')])
ValueErrors keep their shape: ExceptionGroup('batch', [ValueError('row 1'), ExceptionGroup('row 2', [ValueError('email')])])
TypeErrors: ExceptionGroup('batch', [ExceptionGroup('row 2', [TypeError('age')])])
naked error wrapped: ExceptionGroup('', (ValueError('lonely'),))
OSError handler got 2 errors
True
False
~~~

**Example 2 — the syntax rules and handler behaviour** prints:

~~~text
mix except and except* -> SyntaxError: cannot have both 'except' and 'except*' on the same 'try'
return inside except* -> SyntaxError: 'break', 'continue' and 'return' cannot appear in an except* block
bare except* -> SyntaxError: expected one or more exception types
except* ExceptionGroup -> TypeError: catching ExceptionGroup with except* is not allowed. Use except instead.
FileNotFoundError clause: ['a.txt']
OSError clause gets the rest: ['b.txt']
outer sees: ExceptionGroup('', [RuntimeError('handler failed'), ExceptionGroup('g', [KeyError('k')])])
~~~

**Example 3 — asyncio.TaskGroup (CPython 3.12)** prints:

~~~text
parse errors: ['orders: bad JSON']
network errors: ['stock: refused']
users task finished first: users ok
~~~

**What the output shows:** three handlers ran for one group, each receiving a group of its own leaves; the unmatched leaves came back out as a group; nesting was kept; a lone \`ValueError\` was wrapped; and a base class clause collected both \`OSError\` subclasses. The rules table comes straight from the second run, and the third shows \`TaskGroup\` turning two failed tasks into a group that \`except*\` sorted by type, while the successful task still has its result.

## 7. except vs except\\*

| | \`except T as e\` | \`except* T as eg\` |
| :--- | :--- | :--- |
| Matches | the raised exception itself | each leaf of a group (a lone exception is wrapped first) |
| Bound name | the exception | a new group of the matching leaves |
| Handlers that run | at most one | every clause with a match |
| Unhandled part | the whole exception propagates if nothing matched | the unmatched leaves propagate as a group |
| \`return\` / \`break\` / \`continue\` inside | allowed | \`SyntaxError\` |
| Available since | always | Python 3.11 |

## Common Pitfalls

- **Writing \`except ValueError\` for a group.** It does not match: the group is an \`ExceptionGroup\`, not a \`ValueError\`. Use \`except* ValueError\`, or \`except ExceptionGroup\` and inspect it.
- **Treating \`eg\` as the error.** In \`except* ValueError as eg\`, \`eg\` is a group; \`str(eg)\` is the group message. Loop over \`eg.exceptions\` for the actual errors.
- **Expecting one handler.** Several \`except*\` clauses can run for one group, so do not put "only one of these happens" logic in them.
- **Trying to \`return\` from an \`except*\` block.** Not allowed; set a variable and return after the \`try\` statement.
- **Forgetting the leftovers.** Whatever no \`except*\` matches is re-raised; if you want to stop everything, add a final \`except* Exception\` clause.
- **Using it on 3.10 or older.** The syntax does not parse; use the \`exceptiongroup\` backport.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Concurrent tasks or bulk validation can fail in several unrelated ways at once, and a normal exception reports only one. PEP 654 in Python 3.11 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup</code> to carry them all.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The group:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup(msg, [errors])</code> is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exception</code>; its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exceptions</code> tuple can contain nested groups; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseExceptionGroup</code> is used when a leaf is something like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyboardInterrupt</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. except&#42;:</strong> <span style="color:#f0e2c8;">It matches the leaves by type at any depth, binds a new group of just the matching leaves, can run several clauses for one group, and re-raises the leaves nobody matched.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules:</strong> <span style="color:#f0e2c8;">No mixing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code> on one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42; ExceptionGroup</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.TaskGroup</code> raises these when child tasks fail, so async code handles network and parse errors with separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code> clauses.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just catch <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ExceptionGroup</code> and loop over it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, but you must then walk nested groups, decide what you handled, and rebuild and re-raise a group for the rest. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code> does the splitting, nesting and re-raising correctly for you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except&#42; ValueError</code> bind if a plain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ValueError</code> was raised?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup</code> with an empty message containing that one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>. Handler code can therefore always loop over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eg.exceptions</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return</code> banned inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except&#42;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code> clauses may need to run for one group. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> in one would skip the others and silently drop their errors, so the compiler forbids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a leaf matches two clauses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is handled by the first matching clause only. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42; FileNotFoundError</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42; OSError</code>, the second clause only sees the remaining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OSError</code> leaves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you support Python 3.10 too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except&#42;</code> syntax cannot be used there. Install the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exceptiongroup</code> backport and use its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catch()</code> helper, or catch the group with plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split()</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ExceptionGroup** | an exception (3.11+) that wraps several exceptions |
| **Leaf exception** | a real error inside a group, as opposed to a nested group |
| **except\\* clause** | a handler that takes the matching leaves of a group, 3.11+ |
| **asyncio.TaskGroup** | runs child tasks and raises their failures as an \`ExceptionGroup\` |

---
**Conclusion:** \`ExceptionGroup\` and \`except*\` (PEP 654, Python 3.11) exist because concurrent and batch code can fail in several ways at once. A group carries all the errors as a tree, and \`except*\` handles it by type: each clause receives a group of just its matching leaves, several clauses may run, and whatever nobody matched propagates as a smaller group. Remember the three rules (no mixing with \`except\`, no \`return\` inside, no \`except* ExceptionGroup\`) and that in everyday code the group usually comes from \`asyncio.TaskGroup\`.
`,
    examples: [
      { label: `Raising a group and splitting it with except*`, code: `# Three unrelated failures, reported together.
def validate(row):
    errors = []
    if not row.get("name"):
        errors.append(ValueError("name is empty"))
    if not isinstance(row.get("age"), int):
        errors.append(TypeError("age must be an int"))
    if "id" not in row:
        errors.append(KeyError("id"))
    if errors:
        raise ExceptionGroup("row is invalid", errors)

try:
    validate({"name": "", "age": "41"})
except* ValueError as eg:
    # eg is an ExceptionGroup holding only the ValueErrors.
    print("value handler:", type(eg).__name__, [str(e) for e in eg.exceptions])
except* TypeError as eg:
    print("type handler: ", type(eg).__name__, [str(e) for e in eg.exceptions])
except* KeyError as eg:
    print("key handler:  ", [repr(e) for e in eg.exceptions])

# Unmatched leaves keep propagating, still wrapped in a group.
try:
    try:
        validate({"name": "", "age": "41"})
    except* ValueError:
        print("handled only the ValueError")
except ExceptionGroup as rest:
    print("still raised:", repr(rest))

# Nested groups: except* looks at every leaf, at any depth.
nested = ExceptionGroup("batch", [
    ValueError("row 1"),
    ExceptionGroup("row 2", [TypeError("age"), ValueError("email")]),
])
try:
    raise nested
except* ValueError as eg:
    print("ValueErrors keep their shape:", repr(eg))
except* TypeError as eg:
    print("TypeErrors:", repr(eg))

# A plain exception caught by except* arrives wrapped in a group.
try:
    raise ValueError("lonely")
except* ValueError as eg:
    print("naked error wrapped:", repr(eg))

# Matching uses isinstance, so a base class catches its subclasses.
try:
    raise ExceptionGroup("io", [FileNotFoundError("a.txt"), PermissionError("b.txt")])
except* OSError as eg:
    print("OSError handler got", len(eg.exceptions), "errors")

print(issubclass(ExceptionGroup, Exception))  # True
print(issubclass(BaseExceptionGroup, Exception))  # False` },
      { label: `The rules: no mixing, no return, first match per leaf, errors raised in a handler`, code: `# Rules the compiler enforces.
bad_snippets = {
    "mix except and except*": "try:\\n    pass\\nexcept ValueError:\\n    pass\\nexcept* TypeError:\\n    pass\\n",
    "return inside except*": "def f():\\n    try:\\n        pass\\n    except* ValueError:\\n        return 1\\n",
    "bare except*": "try:\\n    pass\\nexcept*:\\n    pass\\n",
}
for label, src in bad_snippets.items():
    try:
        compile(src, "<snippet>", "exec")
        print(label, "-> compiles")
    except SyntaxError as e:
        print(label, "-> SyntaxError:", e.msg)

# Matching ExceptionGroup itself is refused at run time.
try:
    try:
        raise ExceptionGroup("g", [ValueError("x")])
    except* ExceptionGroup:
        pass
except TypeError as e:
    print("except* ExceptionGroup -> TypeError:", e)

# Each leaf goes to the first clause that matches it, then is done.
try:
    raise ExceptionGroup("io", [FileNotFoundError("a.txt"), PermissionError("b.txt")])
except* FileNotFoundError as eg:
    print("FileNotFoundError clause:", [str(e) for e in eg.exceptions])
except* OSError as eg:
    print("OSError clause gets the rest:", [str(e) for e in eg.exceptions])

# A new error raised inside an except* handler joins the result group.
try:
    try:
        raise ExceptionGroup("g", [ValueError("v"), KeyError("k")])
    except* ValueError:
        raise RuntimeError("handler failed")
except ExceptionGroup as eg:
    print("outer sees:", repr(eg))` },
      { label: `asyncio.TaskGroup raising an ExceptionGroup (needs a real event loop)`, runnable: false, python: "3.12", code: `import asyncio

# Real-world source of groups: asyncio.TaskGroup (3.11+).
async def fetch(name, delay, fail_with=None):
    await asyncio.sleep(delay)
    if fail_with:
        raise fail_with
    return name + " ok"

async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            t1 = tg.create_task(fetch("users", 0.01))
            tg.create_task(fetch("orders", 0.02, ValueError("orders: bad JSON")))
            tg.create_task(fetch("stock", 0.02, ConnectionError("stock: refused")))
        print("not reached")
    except* ValueError as eg:
        print("parse errors:", [str(e) for e in eg.exceptions])
    except* ConnectionError as eg:
        print("network errors:", [str(e) for e in eg.exceptions])
    print("users task finished first:", t1.result())

asyncio.run(main())` },
    ],
  },
];

export default augments;
