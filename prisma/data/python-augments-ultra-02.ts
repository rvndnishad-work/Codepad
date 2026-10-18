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
    title: `How do break, continue, pass and loop else work?`,
    difficulty: "easy",
    seoDescription: `How break, continue, pass and the for/while else clause work in Python, with verified examples, nested-loop exits and interview follow-ups.`,
    description: `**Question presented to candidate:**
"Walk me through \`break\`, \`continue\` and \`pass\`. Then tell me: Python loops can have an \`else\` clause — when does it run, and when would you actually use it?"

**What a strong answer should cover:**
- \`break\` leaves the innermost loop immediately; \`continue\` skips the rest of the current iteration and goes back for the next item (or re-tests the \`while\` condition).
- \`pass\` does nothing at run time; it only fills a place where the grammar needs a statement (empty function, class, or branch).
- The loop \`else\` runs when the loop finishes without \`break\` — including a loop that runs zero times — and is skipped by \`break\`, \`return\` or an exception.
- The idiomatic use: a search loop, where \`else\` means "not found", instead of a separate flag variable.
- \`break\` only exits one loop level; to stop nested loops use a function with \`return\`, a flag, or the for-else-continue idiom. \`finally\` still runs when \`break\` leaves a \`try\`.

**Code / implementation expected:** Optional — a short search loop with \`for ... else\`, or a nested-loop exit.`,
    answer: `**Target Audience:** Beginners learning Python control flow; also a quick refresher before an interview.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the \`finally\` note was also checked against the 3.14 release notes.

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` — that is the exact vocabulary an interviewer expects to hear. Every output shown was printed by a real run; the **Verified** section quotes it.

## 1. Why This Even Matters — A Story First

You are checking a pile of parcels for one with a red sticker. When you see an empty box, you put it aside and pick up the next one — that is \`continue\`. When you find the red sticker, you stop checking the rest of the pile — that is \`break\`. And if you get to the bottom of the pile without ever finding a red sticker, you write "not found" in the log book — that last step is the loop's \`else\`. \`pass\` is the note "nothing to do here yet" that keeps a gap in the plan from being a mistake.

These four keywords are small, but interviewers like them because the \`else\` part surprises many people who have written Python for years, and because nested-loop exits come up in real code all the time.

## 2. The Loop, Step by Step

A \`for\` loop repeatedly asks its iterator for the next item and runs the body with it (the details are in [how a for loop works under the hood](/interview-question/how-does-a-for-loop-work-under-the-hood)). A \`while\` loop re-checks its condition before each pass. The keywords decide where control goes next:

📌 **Interview term: break** — a statement that ends the innermost enclosing \`for\` or \`while\` loop immediately. The rest of the body, the remaining items and the loop's \`else\` are all skipped.

📌 **Interview term: continue** — a statement that ends the current iteration only. A \`for\` loop goes on with the next item; a \`while\` loop goes back to its condition.

📌 **Interview term: pass** — a statement that does nothing. Python's grammar requires at least one statement in a block, so \`pass\` is a placeholder for "intentionally empty".

📌 **Interview term: loop else clause** — an \`else:\` block attached to a \`for\` or \`while\` loop. It runs once when the loop ends *normally*: the \`for\` ran out of items or the \`while\` condition became false. It does not run when the loop was left by \`break\`, \`return\` or an exception.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 320" role="img" aria-label="How a for loop moves between getting the next item, the loop body, the else block and the code after the loop">
  <defs>
    <marker id="py02q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="125" y="66" text-anchor="middle">Get next item</text>
  <text class="d-sub" x="125" y="88" text-anchor="middle">calls next on the iterator</text>
  <rect class="d-box" x="300" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="385" y="66" text-anchor="middle">Loop body</text>
  <text class="d-sub" x="385" y="88" text-anchor="middle">your statements</text>
  <rect class="d-box-accent" x="560" y="40" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="635" y="76" text-anchor="middle">After the loop</text>
  <rect class="d-box-muted" x="40" y="230" width="170" height="60" rx="10"/>
  <text class="d-text" x="125" y="256" text-anchor="middle">else block</text>
  <text class="d-sub" x="125" y="278" text-anchor="middle">only on this path</text>
  <path class="d-edge" d="M 210 70 L 296 70" marker-end="url(#py02q1-arrow)"/>
  <text class="d-sub" x="253" y="58" text-anchor="middle">item</text>
  <path class="d-edge-accent" d="M 470 70 L 556 70" marker-end="url(#py02q1-arrow)"/>
  <text class="d-sub d-accent" x="513" y="58" text-anchor="middle">break</text>
  <path class="d-edge-dashed" d="M 385 100 L 385 160 L 170 160 L 170 104" marker-end="url(#py02q1-arrow)"/>
  <text class="d-sub" x="300" y="186" text-anchor="middle">continue, or end of body</text>
  <path class="d-edge" d="M 80 100 L 80 226" marker-end="url(#py02q1-arrow)"/>
  <text class="d-sub" x="90" y="214">no items left</text>
  <path class="d-edge" d="M 210 260 L 635 260 L 635 104" marker-end="url(#py02q1-arrow)"/>
  <text class="d-sub" x="430" y="248" text-anchor="middle">then</text>
</svg>

Read the diagram like this: \`continue\` and the end of the body both lead back to "get next item"; only the path through "no items left" visits the \`else\` block; \`break\` jumps straight past it.

A helpful way to remember the \`else\`: think of it as **"no break"**. Some people wish it had been called \`nobreak\`, because the word \`else\` suggests "if the loop did not run", which is not what it means.

## 3. break, continue and pass in Code

~~~python
readings = [3, 0, 7, -2, 5]
kept = []
first_negative = None

for n in readings:
    if n == 0:
        continue          # skip zeros, go to the next reading
    if n < 0:
        first_negative = n
        break             # stop at the first negative; 5 is never read
    kept.append(n)

print(kept)            # [3, 7]
print(first_negative)  # -2
print(n)               # -2  (the loop variable keeps its last value)
~~~

Two details worth saying out loud in an interview:

- The loop variable \`n\` still exists after the loop and holds the last value it was given. A \`for\` loop does not create its own scope.
- In a \`while\` loop, put the counter update *before* \`continue\`. If \`continue\` jumps over \`i += 1\`, the loop re-tests the same value forever.

\`pass\` versus the alternatives for an empty block:

| You write | What it means | Typical place |
| :--- | :--- | :--- |
| \`pass\` | "Intentionally empty" | Empty \`except\` branch you have thought about, a stub class |
| \`...\` (Ellipsis) | An expression that is evaluated and thrown away; also valid as a body | Type stubs, abstract methods, "fill in later" |
| A docstring | A string expression; counts as the body | A function that exists only to be documented or overridden |
| \`continue\` | Not empty — it changes control flow | Only inside loops |

📌 **Interview term: placeholder statement** — a statement whose only job is to make a block syntactically complete (\`pass\`, \`...\`, or a docstring).

## 4. The Loop else Clause in Code

~~~python
def find(items, target):
    for index, item in enumerate(items):
        if item == target:
            print(f"found {target!r} at index {index}")
            break
    else:
        print(f"{target!r} not found")

find(["a", "b", "c"], "b")   # found 'b' at index 1
find(["a", "b", "c"], "z")   # 'z' not found
find([], "a")                # 'a' not found   <- zero iterations, else still runs
~~~

Without \`else\`, the same function needs a \`found = False\` flag set inside the loop and checked after it. The \`else\` version says the same thing with less state.

The rules, all confirmed in Example 2:

| How the loop ended | Does \`else\` run? |
| :--- | :--- |
| \`for\` ran out of items | Yes |
| \`for\` over an empty iterable (zero passes) | Yes |
| \`while\` condition became false | Yes |
| \`continue\` on the last item | Yes — \`continue\` is not \`break\` |
| \`break\` | No |
| \`return\` from inside the loop | No — the function is left |
| An exception escaped the loop | No |

📌 **Interview term: search loop idiom** — \`for ... break ... else\`, where \`break\` means "found it" and \`else\` means "looked at everything, not found". The prime test in Example 2 (\`else: return True\`) is the textbook case.

## 5. Leaving Nested Loops

\`break\` leaves only the loop it is written in. In a grid search, the outer loop keeps going:

~~~text
break alone: [1, 2, 3, 4, 7, 8, 9]
with a flag: [1, 2, 3, 4]
~~~

The options, from cleanest to most clever:

1. **Move the loops into a function and \`return\`.** \`return\` leaves every loop at once and gives the result back. This is what most reviewers want to see.
2. **A flag** checked after the inner loop. Works everywhere, but adds a variable.
3. **The for-else-continue idiom:** the inner loop's \`else: continue\` skips the outer \`break\` unless the inner loop broke. Correct, but many readers have to stop and think, so use it sparingly.
4. Raising and catching an exception also works, but it hides normal control flow inside error handling; see [how exception handling works](/interview-question/how-does-exception-handling-work-in-python).

Python has no labelled \`break\` like Java or JavaScript.

📌 **Interview term: innermost enclosing loop** — the nearest \`for\` or \`while\` that contains the \`break\` or \`continue\`; those statements never affect an outer loop.

### break and finally

When \`break\` leaves a \`try\` block, the \`finally\` block still runs first (Example 3 prints \`finally ran for attempt 1\` and then stops). The opposite direction is a trap: a \`break\`, \`continue\` or \`return\` *inside* \`finally\` silently throws away any exception that was in flight. Python 3.14 now emits a \`SyntaxWarning\` for those statements in a \`finally\` block ([PEP 765](https://peps.python.org/pep-0765/); the Steering Council confirmed it is a warning only, [discussion](https://discuss.python.org/t/pep-765-disallow-return-break-continue-that-exit-a-finally-block/71348/192)). We did not run 3.14 here, so that warning is quoted from the PEP, not from our run.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3.11 main.py\`, and again through the page runner (Pyodide 0.25.1); both printed exactly the same lines, and every \`print(...)  # expected\` line passed as an in-page test.

**Example 1 — break, continue and pass:**

~~~text
[3, 7]
-2
-2
None
Placeholder
[1, 3, 5, 7]
~~~

**Example 2 — the loop else clause:**

~~~text
found 'b' at index 1
'z' not found
'a' not found
for-else ran after a continue on the last item
while-else ran, n = 1
4
no even number
[2, 3, 5, 7, 11, 13, 17, 19]
~~~

**Example 3 — leaving nested loops, and break with finally:**

~~~text
break alone: [1, 2, 3, 4, 7, 8, 9]
with a flag: [1, 2, 3, 4]
(1, 1)
None
for-else idiom: [1, 2, 3, 4]
finally ran for attempt 0
finally ran for attempt 1
~~~

## 7. Edge Cases

- **\`break\` and \`continue\` outside a loop** are a \`SyntaxError\` at compile time (\`'break' outside loop\`, \`'continue' not properly in loop\` on 3.11), not a run-time error.
- **\`else\` after \`while True:\`** can only be reached if the condition becomes false, which \`True\` never does — so the \`else\` is dead code; leave it out.
- **Generators:** a \`break\` in a \`for\` over a generator leaves the generator suspended; it is closed (its \`finally\` runs) when the last reference to it goes away (checked with \`inspect.getgeneratorstate\`: \`GEN_SUSPENDED\` after the \`break\`; see [the generator lifecycle](/interview-question/what-is-a-generator-s-lifecycle)).
- **Comprehensions** cannot contain \`break\` or \`continue\`; filter with \`if\`, or write a normal loop, or use \`itertools.takewhile\`.
- **The loop variable after zero iterations** does not exist: \`for x in []: pass\` then \`print(x)\` raises \`NameError\` if \`x\` was never assigned before.

## Common Pitfalls

- **Reading \`else\` as "if the loop did not run".** It means "if the loop did not \`break\`". A loop that runs ten times without breaking also runs its \`else\`.
- **Indenting \`else\` under the \`if\`.** \`if ...: break\` / \`else:\` inside the loop is an ordinary \`if/else\` that runs on every iteration. The loop \`else\` lines up with the \`for\`.
- **Expecting \`break\` to leave all loops.** It leaves one. Refactor into a function and \`return\`.
- **Skipping the counter update with \`continue\`** in a \`while\` loop, giving an infinite loop.
- **Using \`pass\` to silence errors:** \`except Exception: pass\` hides real bugs. If you must ignore an error, catch the narrowest type, or use \`contextlib.suppress(SpecificError)\` so the intent is visible.
- **Putting \`return\`/\`break\` in \`finally\`**, which swallows exceptions (a \`SyntaxWarning\` from 3.14).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> leaves the nearest loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> skips to the next iteration, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pass</code> does nothing and only fills an empty block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop else:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> runs when the loop ends without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> — read it as "no break". It also runs after zero iterations.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it exists:</strong> <span style="color:#f0e2c8;">It is the clean "not found" branch of a search loop: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for ... if match: break ... else: not found</code>, with no flag variable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope of break:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> exits only the innermost loop. For nested loops, put them in a function and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> still runs when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> leaves a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;">Indenting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> under the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> instead of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, forgetting the counter before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except: pass</code> hiding bugs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">else</code> run if the loop body never executes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. An empty iterable or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> condition that is false at the start means no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> happened, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> runs. Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find([], "a")</code> printing not found.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">continue</code> on the last item stop the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">else</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> or an exception skip it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> just ends that iteration; the loop then runs out of items normally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you break out of two nested loops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Best: move them into a function and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>. Alternatives are a flag checked by the outer loop, or the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else: continue</code> followed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>. Python has no labelled break.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pass</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">...</code> in a body?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both make a block valid. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pass</code> is a statement meaning intentionally empty; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">...</code> is the Ellipsis object evaluated as an expression, common in stubs and abstract methods. Run-time effect is the same: nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">break</code> inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try/finally</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> block runs, then the loop ends. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> block itself would swallow any active exception, which is why Python 3.14 warns about it (PEP 765).</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **break** | Leave the innermost loop now; its \`else\` is skipped |
| **continue** | Skip the rest of this iteration and go on with the next |
| **pass** | A statement that does nothing; fills an empty block |
| **loop else clause** | Runs when a loop ends without \`break\` (also after zero iterations) |
| **placeholder statement** | \`pass\`, \`...\` or a docstring, used only to complete a block |
| **search loop idiom** | \`for ... break ... else\` meaning found / not found |
| **innermost enclosing loop** | The nearest loop around a \`break\` or \`continue\`; the only one they affect |

---
**Conclusion:** \`break\` ends the nearest loop, \`continue\` ends the current pass through it, and \`pass\` is an empty statement that keeps the grammar happy. The loop \`else\` is best read as "no break": it runs whenever the loop finishes on its own — even after zero iterations or a final \`continue\` — and is skipped by \`break\`, \`return\` and exceptions, which makes it the natural "not found" branch of a search loop. A strong answer adds the practical parts: \`break\` leaves only one level (use a function and \`return\` for nested loops), \`finally\` still runs on \`break\`, and \`pass\` should never be used to swallow exceptions.`,
    examples: [
      {
        label: `break, continue and pass in one loop`,
        code: `# break, continue and pass in one small program.
readings = [3, 0, 7, -2, 5]
kept = []
first_negative = None

for n in readings:
    if n == 0:
        # continue: skip the rest of THIS iteration, go to the next item
        continue
    if n < 0:
        # break: leave the loop right now; 5 is never looked at
        first_negative = n
        break
    kept.append(n)

print(kept)  # [3, 7]
print(first_negative)  # -2

# The loop variable keeps its last value after the loop ends.
print(n)  # -2

# pass does nothing. It only fills a place where Python needs a statement.
def not_written_yet():
    pass

class Placeholder:
    pass

print(not_written_yet())  # None
print(Placeholder.__name__)  # Placeholder

# continue inside a while loop: be sure the counter moves BEFORE continue,
# otherwise the loop spins forever on the same value.
i = 0
odds = []
while i < 7:
    i += 1
    if i % 2 == 0:
        continue
    odds.append(i)
print(odds)  # [1, 3, 5, 7]`,
      },
      {
        label: `The loop else clause: search, empty loops, while-else, primes`,
        code: `# The loop else clause runs only when the loop was NOT ended by break.
def find(items, target):
    for index, item in enumerate(items):
        if item == target:
            print(f"found {target!r} at index {index}")
            break
    else:
        print(f"{target!r} not found")

find(["a", "b", "c"], "b")
find(["a", "b", "c"], "z")

# An empty loop never runs its body, so nothing can break: else runs.
find([], "a")

# continue on the last item does not count as break: else still runs.
for k in range(3):
    if k == 2:
        continue
else:
    print("for-else ran after a continue on the last item")

# while ... else: else runs when the condition becomes false.
n = 10
while n > 1:
    n //= 3
else:
    print("while-else ran, n =", n)

# return inside the loop also skips else (the function is left entirely).
def first_even(nums):
    for x in nums:
        if x % 2 == 0:
            return x
    else:
        return "no even number"

print(first_even([1, 3, 4]))  # 4
print(first_even([1, 3, 5]))  # no even number

# A classic use: is n prime? else means "no divisor was found".
def is_prime(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            break
    else:
        return True
    return False

print([p for p in range(20) if is_prime(p)])  # [2, 3, 5, 7, 11, 13, 17, 19]`,
      },
      {
        label: `Leaving nested loops, and break with finally`,
        code: `# break only leaves the INNERMOST loop. Three ways to stop two loops.
grid = [
    [1, 2, 3],
    [4, 99, 6],
    [7, 8, 9],
]

# 1) break alone: the outer loop keeps going.
visited = []
for row in grid:
    for value in row:
        if value == 99:
            break
        visited.append(value)
print("break alone:", visited)

# 2) A flag variable checked by the outer loop.
visited = []
found = False
for row in grid:
    for value in row:
        if value == 99:
            found = True
            break
        visited.append(value)
    if found:
        break
print("with a flag:", visited)

# 3) Put the loops in a function and return: the cleanest option.
def find_position(grid, target):
    for r, row in enumerate(grid):
        for c, value in enumerate(row):
            if value == target:
                return (r, c)
    return None

print(find_position(grid, 99))  # (1, 1)
print(find_position(grid, 0))  # None

# 4) The for-else-continue idiom: inner else continues the outer loop,
#    the break after it runs only when the inner loop broke.
visited = []
for row in grid:
    for value in row:
        if value == 99:
            break
        visited.append(value)
    else:
        continue
    break
print("for-else idiom:", visited)

# break inside try/finally: finally still runs before the loop is left.
for attempt in range(3):
    try:
        if attempt == 1:
            break
    finally:
        print("finally ran for attempt", attempt)`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What does if __name__ == "__main__" do?`,
    difficulty: "easy",
    seoDescription: `What if __name__ == "__main__" checks, what runs on import vs on run, python -m, __main__.py, multiprocessing and the main() idiom, with verified output.`,
    description: `**Question presented to candidate:**
"You see \`if __name__ == "__main__":\` at the bottom of almost every Python script. What does that line actually check, and what would break if you deleted it?"

**What a strong answer should cover:**
- Every module has a global \`__name__\`. The interpreter sets it to \`"__main__"\` for the module it was started with (\`python file.py\`, \`python -m pkg.mod\`, \`python -c\`), and to the module's import name (for example \`"greet"\`) when the file is imported.
- So the guard runs its block only when the file is executed as the program, not when another module imports it; the rest of the file (functions, classes, constants) still runs on import.
- Why it matters: importing a module should have no side effects — tests, tools and other modules can import the functions without starting the script.
- Practical cases: \`multiprocessing\` with the spawn or forkserver start methods re-imports the main module in each child, so unguarded start-up code runs again; a script that imports itself runs twice as two modules.
- The idiomatic shape: put the work in \`def main(argv=None) -> int\`, and end with \`if __name__ == "__main__": raise SystemExit(main())\`; a package uses \`__main__.py\` for \`python -m pkg\`.

**Code / implementation expected:** Optional — a module with a \`main()\` function and the guard, and what prints on import versus on run.`,
    answer: `**Target Audience:** Beginners writing their first scripts and modules; anyone who has copied the line without knowing why.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11.17, 3.12.3 and 3.13.16 (identical output) and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Ideas come in plain words first, then a \`📌 Interview term:\` callout with the precise name an interviewer uses. Every output below is copied from a real run; the **Verified** section has the full output of each example.

## 1. Why This Even Matters — A Story First

Think of a recipe card that also has a line at the bottom: "now cook this for dinner". If you are the cook who picked up the card, you follow the whole card, including the last line. But if a cookbook editor copies the card into a collection, they want the ingredients and steps — they do not want dinner to start cooking at the printing press.

A Python file is in the same position. Sometimes it is **the program you ran**; sometimes it is **a library someone imported** to reuse its functions. \`if __name__ == "__main__":\` is the line that asks "am I the program, or am I being borrowed?", and only does the "cook dinner now" part in the first case.

## 2. The Core Idea

📌 **Interview term: module** — any \`.py\` file, once Python loads it. Loading a module runs its top-level code from top to bottom, once, and keeps the result in \`sys.modules\`. (The difference from a package is covered in [modules vs packages](/interview-question/what-is-the-difference-between-a-module-and-a-package).)

📌 **Interview term: \`__name__\`** — a global variable Python creates in every module before running it. It holds the module's name: \`"greet"\` for \`greet.py\` when imported, \`"pkg.tools"\` for \`pkg/tools.py\`.

📌 **Interview term: \`__main__\`** — the special name given to the module the interpreter started with, called the top-level code environment. \`python greet.py\`, \`python -m greet\` and the code in \`python -c "..."\` all run as \`__main__\`. There is exactly one \`__main__\` module per process, and \`sys.modules["__main__"]\` is it.

So the guard is an ordinary \`if\` comparing two strings:

~~~python
def add(a, b):
    return a + b

print("top level of greet.py runs, __name__ =", repr(__name__))

if __name__ == "__main__":
    print("guard is True: running the demo", add(2, 3))
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 740 270" role="img" aria-label="The same file greet.py loaded two ways. Run as a program its name is main and the guarded block runs. Imported its name is greet and the guarded block is skipped">
  <defs>
    <marker id="py02q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="64" rx="10"/>
  <text class="d-text" x="115" y="68" text-anchor="middle">python greet.py</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">run as the program</text>
  <rect class="d-box" x="275" y="40" width="200" height="64" rx="10"/>
  <text class="d-text" x="375" y="68" text-anchor="middle">__name__ is __main__</text>
  <text class="d-sub" x="375" y="90" text-anchor="middle">top level runs</text>
  <rect class="d-box-accent" x="540" y="40" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="630" y="68" text-anchor="middle">guard is True</text>
  <text class="d-sub" x="630" y="90" text-anchor="middle">main block runs</text>
  <path class="d-edge" d="M 210 72 L 271 72" marker-end="url(#py02q2-arrow)"/>
  <path class="d-edge-accent" d="M 475 72 L 536 72" marker-end="url(#py02q2-arrow)"/>
  <rect class="d-box" x="20" y="170" width="190" height="64" rx="10"/>
  <text class="d-text" x="115" y="198" text-anchor="middle">import greet</text>
  <text class="d-sub" x="115" y="220" text-anchor="middle">from another module</text>
  <rect class="d-box" x="275" y="170" width="200" height="64" rx="10"/>
  <text class="d-text" x="375" y="198" text-anchor="middle">__name__ is greet</text>
  <text class="d-sub" x="375" y="220" text-anchor="middle">top level runs once</text>
  <rect class="d-box-muted" x="540" y="170" width="180" height="64" rx="10"/>
  <text class="d-text" x="630" y="198" text-anchor="middle">guard is False</text>
  <text class="d-sub" x="630" y="220" text-anchor="middle">main block skipped</text>
  <path class="d-edge" d="M 210 202 L 271 202" marker-end="url(#py02q2-arrow)"/>
  <path class="d-edge-dashed" d="M 475 202 L 536 202" marker-end="url(#py02q2-arrow)"/>
</svg>

Both paths run the whole top level of the file — the \`def\`, the \`print\`, everything. The only difference is the value of \`__name__\`, and therefore whether the guarded block runs.

📌 **Interview term: import-time side effect** — anything a module does just by being imported, beyond defining names: printing, opening files, starting servers, parsing \`sys.argv\`. Good modules keep these to a minimum, and the guard is how a script keeps them out of the import path.

## 3. What Happens on Import vs on Run

Example 1 writes \`greet.py\` to a temporary folder, imports it, imports it again, and then runs it the way \`python greet.py\` would (with \`runpy.run_path(..., run_name="__main__")\`, which is what the interpreter itself uses for \`-m\`). The output:

~~~text
1) import greet
top level of greet.py runs, __name__ = 'greet'
2) import greet again (cached in sys.modules, nothing runs)
3) run the file as a script, the way python greet.py does
top level of greet.py runs, __name__ = '__main__'
guard is True: running the demo 5
~~~

Three things to notice:

- **On import, the top level ran but the guarded block did not.** \`__name__\` was \`'greet'\`.
- **The second import printed nothing.** A module runs once per process; later imports get the cached object from \`sys.modules\` (see [how the import system works](/interview-question/how-does-the-python-import-system-work)).
- **Run as the program, \`__name__\` was \`'__main__'\`,** so the demo ran.

## 4. Every Way to Start a Program

Example 2 cannot run in the browser (it starts real Python processes with \`subprocess\`), so it was run on CPython 3.12 — and 3.11 and 3.13 printed the same thing:

~~~text
$ python tool.py --verbose
tool: __name__ = __main__ | spec = None
tool: argv[1:] = ['--verbose']
$ python -m tool x
tool: __name__ = __main__ | spec = tool
tool: argv[1:] = ['x']
$ python -c import tool
tool: __name__ = tool | spec = tool
$ python selfimport.py
running as __main__
running as selfimport
$ python -m app
app/__init__.py runs, __name__ = app
app/__main__.py runs, __name__ = __main__
~~~

| Command | \`__name__\` of that file | \`__spec__\` |
| :--- | :--- | :--- |
| \`python tool.py\` | \`"__main__"\` | \`None\` (run from a path, not found by the import system) |
| \`python -m tool\` | \`"__main__"\` | a spec named \`"tool"\` — so the module knows its real name |
| \`python -c "import tool"\` | \`"tool"\` | spec \`"tool"\`; the \`-c\` code itself is \`__main__\` |
| \`python -m app\` (a package) | \`app/__init__.py\` gets \`"app"\`, then \`app/__main__.py\` gets \`"__main__"\` | |

📌 **Interview term: \`python -m\`** — run a module or package found on \`sys.path\` by its import name instead of its file path. For a package it runs the package's \`__main__.py\`.

📌 **Interview term: \`__main__.py\`** — the file Python runs for \`python -m package\` (and for a zip file or folder given to \`python\`). Since that file exists only to be run, it usually just calls a \`main()\` function from the package.

### The double-import trap

\`selfimport.py\` printed two lines: \`running as __main__\`, then \`running as selfimport\`. When a file imports **itself** (or two modules import each other and one of them is the script), the file is loaded twice, as two separate module objects with two separate sets of globals. A class defined in it exists twice too, so \`isinstance\` checks between the two copies fail. The fix is to keep the script thin and import the real code from a separate module.

## 5. Why It Matters in Practice

- **Testing.** A test file does \`from greet import add\` and calls it. Without the guard, importing would also run the script part — reading \`sys.argv\`, printing, maybe hitting a network.
- **Reuse.** Another module, a notebook or the REPL can import your functions without side effects.
- **\`multiprocessing\`.** With the *spawn* start method each child process starts a fresh interpreter and imports your main module; start-up code that is not guarded runs again in every child, and code that starts processes at import time would start processes again inside each child. Python stops that with an error: on our 3.12 run, an unguarded script that started one process with \`get_context("spawn")\` printed its top-level line twice (parent and child), and the child raised \`RuntimeError: An attempt has been made to start a new process before the current process has finished its bootstrapping phase.\` Spawn has been the default on Windows and, since Python 3.8, on macOS; Python 3.14 moved Linux from fork to *forkserver*, which also needs the guard ([multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html), [Python 3.14 What's New](https://docs.python.org/3.14/whatsnew/3.14.html)). We did not run 3.14 here; those defaults are quoted from the docs. More in [threading vs multiprocessing vs asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio).
- **Tools that import to inspect.** Documentation generators, test collectors and type checkers import or analyse modules; a guarded script stays inert.

## 6. The Idiomatic Shape

~~~python
import argparse

def greet(name, shout=False):
    message = f"Hello, {name}!"
    return message.upper() if shout else message

def main(argv=None):
    parser = argparse.ArgumentParser(prog="greet")
    parser.add_argument("name")
    parser.add_argument("--shout", action="store_true")
    args = parser.parse_args(argv)
    print(greet(args.name, args.shout))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
~~~

Why this shape is the one reviewers like:

- **The guard body is one line.** All logic is in functions, so nothing important lives at module level where tests cannot reach it.
- **\`main(argv=None)\`** — \`argparse\` reads \`sys.argv[1:]\` when \`argv\` is \`None\`, but a test can pass a list: \`main(["Ada", "--shout"])\`. Example 3 does exactly this so it can run in the page.
- **\`raise SystemExit(main())\`** turns the returned integer into the process exit code (0 is success). \`sys.exit(main())\` does the same.
- **Local variables stay local.** Code written directly under the guard creates *global* variables in the module; inside \`main()\` they are locals that other functions cannot accidentally depend on.
- **Packaging entry points.** A \`[project.scripts]\` entry in \`pyproject.toml\` such as \`greet = "greet:main"\` makes an installed command that imports the module and calls \`main()\` — the guard is not involved, which is another reason to keep the logic in \`main()\`.

📌 **Interview term: entry point** — the function that starts a program; by convention \`main()\`, called from the guard or from an installed console script.

## 7. Verified: Running the Code

Examples 1 and 3 were run with \`python3.11 main.py\` and through the page runner (Pyodide 0.25.1): same output, and every \`print(...)  # expected\` line passed as an in-page test — including \`print(__name__)  # __main__\`, which shows the page also runs your code as \`__main__\`. Example 2 was run with \`python3.12 main.py\` (it needs real processes).

**Example 1 — import vs run, in one program:**

~~~text
1) import greet
top level of greet.py runs, __name__ = 'greet'
2) import greet again (cached in sys.modules, nothing runs)
3) run the file as a script, the way python greet.py does
top level of greet.py runs, __name__ = '__main__'
guard is True: running the demo 5
4) the functions are usable either way
15
2
__main__
True
~~~

**Example 2 — real command lines (python 3.12):**

~~~text
$ python tool.py --verbose
tool: __name__ = __main__ | spec = None
tool: argv[1:] = ['--verbose']
$ python -m tool x
tool: __name__ = __main__ | spec = tool
tool: argv[1:] = ['x']
$ python -c import tool
tool: __name__ = tool | spec = tool
$ python selfimport.py
running as __main__
running as selfimport
$ python -m app
app/__init__.py runs, __name__ = app
app/__main__.py runs, __name__ = __main__
~~~

**Example 3 — the main() pattern:**

~~~text
Hello, Ada!
exit code: 0
HELLO, GRACE!
Hello, Linus!
HELLO, LINUS!
~~~

## 8. Edge Cases

- **Code above the guard always runs**, on import and on run. Only the guarded block is conditional.
- **Several guards** in one file are legal (it is just an \`if\`), but confusing; use one at the bottom.
- **The guard does not make a module private.** Anyone can still import it and call \`main()\`.
- **Interactive sessions:** in the REPL and in Jupyter, \`__name__\` is \`"__main__"\`, so pasted guarded code runs.
- **\`__name__\` of a module in a package** is the full dotted name, \`"pkg.sub.mod"\`; this is what \`logging.getLogger(__name__)\` relies on.

## Common Pitfalls

- **Putting the logic directly under the guard.** It works, but those names become module globals and cannot be tested without running the script; call \`main()\` instead.
- **Thinking the guard stops the file from running on import.** Everything above it still runs — a slow computation or a network call at top level still happens on import.
- **Forgetting the guard with \`multiprocessing\`** on Windows/macOS (spawn) or 3.14+ Linux (forkserver): children re-import the main module and repeat the start-up code.
- **Importing your own script** (or a circular import through it), which loads the file twice as two different modules.
- **Misspelling it** as \`if __name__ == "main":\` or \`if __name__ == __main__:\` — the first is always False, the second is a \`NameError\`.
- **Using \`exit()\` instead of \`sys.exit()\` / \`SystemExit\`** in scripts: \`exit\` is a helper added by the \`site\` module for the interactive prompt and may be missing (for example with \`python -S\`).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Every module has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__name__</code>. It is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"__main__"</code> for the file you ran and the import name for a file that was imported, so the guard runs its block only when the file is the program.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What still runs:</strong> <span style="color:#f0e2c8;">The whole top level of the file runs on import too — defs, classes, constants, prints. Only the guarded block is skipped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Imports should have no side effects: tests and other modules can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> the functions without starting the script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The real-world must:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiprocessing</code> with spawn (Windows, macOS) or forkserver (Linux since 3.14) re-imports the main module in each child, so unguarded start-up code runs again.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The idiom:</strong> <span style="color:#f0e2c8;">Put the work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def main(argv=None)</code> and end with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if __name__ == "__main__": raise SystemExit(main())</code>; for a package, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__main__.py</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -m pkg</code> work.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__name__</code> when you run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">python -m pkg.tool</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"__main__"</code>. The real name is kept in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__spec__.name</code>, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"pkg.tool"</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python tool.py</code> the spec is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I import a module twice, does its top level run twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The first import caches it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.modules</code>, the second just returns the cached module. The exception is a script importing itself: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__main__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool</code> are two different modules, so the file runs twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">multiprocessing</code> need the guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With spawn or forkserver, each child is a new interpreter that imports your main module to find the target function. Unguarded code that starts processes would run again in the child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">main()</code> instead of writing the code under the guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code under the guard creates module globals and cannot be called from a test. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">main(argv=None)</code> function can be tested with a list of arguments and returns an exit code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need the guard in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__main__.py</code> or for a console-script entry point?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not really: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__main__.py</code> only exists to be run, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project.scripts]</code> entry imports the module and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">main()</code> directly. The guard matters for files that are both imported and run.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **module** | A loaded \`.py\` file; its top level runs once and is cached in \`sys.modules\` |
| **\`__name__\`** | Global holding the module name, or \`"__main__"\` for the program itself |
| **\`__main__\`** | Name of the module the interpreter was started with |
| **import-time side effect** | Work a module does just by being imported |
| **\`python -m\`** | Run a module or package by import name |
| **\`__main__.py\`** | The file run by \`python -m package\` |
| **entry point** | The function that starts the program, usually \`main()\` |

---
**Conclusion:** \`if __name__ == "__main__":\` is a plain string comparison. Python sets \`__name__\` to \`"__main__"\` only for the module it was started with, and to the import name everywhere else, so the guarded block runs when the file is the program and is skipped when the file is imported — while everything above it runs in both cases. That single line is what lets one file be both a script and a reusable, testable module; it is required in practice for \`multiprocessing\` under spawn and forkserver, and the clean way to use it is a one-line guard that calls \`main()\` and turns its return value into the exit code.`,
    examples: [
      {
        label: `Import vs run: the same file, two values of __name__`,
        code: `# The same file, loaded two ways: imported, and run as the main program.
import os
import runpy
import sys
import tempfile

SOURCE = '''
def add(a, b):
    return a + b

print("top level of greet.py runs, __name__ =", repr(__name__))

if __name__ == "__main__":
    print("guard is True: running the demo", add(2, 3))
'''

folder = tempfile.mkdtemp()
with open(os.path.join(folder, "greet.py"), "w") as f:
    f.write(SOURCE)
sys.path.insert(0, folder)

print("1) import greet")
import greet

print("2) import greet again (cached in sys.modules, nothing runs)")
import greet

print("3) run the file as a script, the way python greet.py does")
namespace = runpy.run_path(os.path.join(folder, "greet.py"), run_name="__main__")

print("4) the functions are usable either way")
print(greet.add(10, 5))  # 15
print(namespace["add"](1, 1))  # 2

# This program is itself the main module.
print(__name__)  # __main__
print("greet" in sys.modules)  # True`,
      },
      {
        label: `Real command lines: python file.py, python -m, a package, a self-import`,
        runnable: false,
        python: "3.12",
        code: `# Real interpreters, real command lines: python file.py, python -m, a package.
import os
import subprocess
import sys
import tempfile

root = tempfile.mkdtemp()

def write(rel, text):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)

def run(*args):
    out = subprocess.run([sys.executable, *args], cwd=root,
                         capture_output=True, text=True, check=True)
    print("$ python", " ".join(args))
    print(out.stdout, end="")

write("tool.py", '''
import sys
print("tool: __name__ =", __name__, "| spec =", None if __spec__ is None else __spec__.name)
if __name__ == "__main__":
    print("tool: argv[1:] =", sys.argv[1:])
''')

# A script that imports ITSELF: the file runs twice, as two modules.
write("selfimport.py", '''
print("running as", __name__)
import selfimport
''')

# A package with __main__.py, so python -m app works.
write("app/__init__.py", 'print("app/__init__.py runs, __name__ =", __name__)\\n')
write("app/__main__.py", 'print("app/__main__.py runs, __name__ =", __name__)\\n')

run("tool.py", "--verbose")
run("-m", "tool", "x")
run("-c", "import tool")
run("selfimport.py")
run("-m", "app")`,
      },
      {
        label: `The idiomatic main() pattern, testable without a subprocess`,
        code: `# The idiomatic shape of a script that is also an importable module.
import argparse

def greet(name, shout=False):
    """Library code: importable, testable, no side effects."""
    message = f"Hello, {name}!"
    return message.upper() if shout else message

def main(argv=None):
    """Script code: parse arguments, do the work, return an exit code."""
    parser = argparse.ArgumentParser(prog="greet")
    parser.add_argument("name")
    parser.add_argument("--shout", action="store_true")
    args = parser.parse_args(argv)
    print(greet(args.name, args.shout))
    return 0

if __name__ == "__main__":
    # In a real file this line would be:  raise SystemExit(main())
    # Here we pass the arguments by hand so the example runs in the page.
    code = main(["Ada"])
    print("exit code:", code)
    main(["Grace", "--shout"])

# A test (or another module) calls the functions directly, no subprocess needed.
print(greet("Linus"))  # Hello, Linus!
print(greet("Linus", shout=True))  # HELLO, LINUS!`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does comparison chaining (a < b < c) work?`,
    difficulty: "easy",
    seoDescription: `How Python comparison chaining like a < b < c works: the and expansion, single evaluation, short-circuit, bytecode and gotchas, with verified output.`,
    description: `**Question presented to candidate:**
"In Python you can write \`0 <= x < 10\`. What does the interpreter actually do with that, and why is \`3 > 2 > 1\` True while \`(3 > 2) > 1\` is False?"

**What a strong answer should cover:**
- \`a < b < c\` means \`(a < b) and (b < c)\`, not \`(a < b) < c\`; every comparison operator chains this way, including \`==\`, \`!=\`, \`is\`, \`is not\`, \`in\` and \`not in\`.
- The middle operand is evaluated once, operands are evaluated left to right, and the chain short-circuits: \`c\` is never evaluated when \`a < b\` is false.
- A chain only compares neighbours: \`1 < 3 > 2\` is legal and True, and says nothing about how \`1\` and \`2\` relate.
- Gotchas from mixing operators: \`1 in [1, 2] == True\` is False, \`False == False in [False]\` is True.
- CPython detail: the chain keeps the middle value on the stack (\`SWAP\`/\`COPY\` in \`dis\`) and calls \`bool()\` on each intermediate result, which is why NumPy arrays raise "truth value is ambiguous" in a chain.

**Code / implementation expected:** Optional — a range check, plus a side-effect function showing each operand is evaluated once.`,
    answer: `**Target Audience:** Beginners who have seen \`0 <= x < 10\` and want to know exactly what it means; candidates who want the CPython detail.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); bytecode also shown from 3.13.16.

> **How to read this doc:** Plain words first, then a \`📌 Interview term:\` callout with the exact term. All outputs are from real runs; the **Verified** section quotes them in full.

## 1. Why This Even Matters — A Story First

A bouncer checks two things: you must be at least 18, and your ticket must be for tonight. In maths class you would write the age rule as 18 ≤ age, and a range as 0 ≤ x < 10, read as "x is between 0 and 10". Most programming languages do not understand that second form: in C or JavaScript, \`0 <= x < 10\` first computes \`0 <= x\` (true or false), then compares *that boolean* with 10 — which is almost always true, and almost always a bug.

Python decided to read it the way a person does. That makes range checks short and correct — but it also means some strange-looking expressions are legal and mean something you might not expect. Interviewers ask about chaining to see whether you know both halves.

## 2. The Rule

📌 **Interview term: comparison chaining** — Python's rule that \`a op1 b op2 c\` means \`(a op1 b) and (b op2 c)\`, with \`b\` evaluated only once. It extends to any length: \`a < b <= c < d\` is three comparisons joined by \`and\`.

📌 **Interview term: comparison operators** — the ten operators that chain, all with the same precedence: \`<\`, \`>\`, \`<=\`, \`>=\`, \`==\`, \`!=\`, plus the identity tests \`is\` / \`is not\` and the membership tests \`in\` / \`not in\` (see [\`==\` vs \`is\`](/interview-question/what-is-the-difference-between-and-is) and [how \`in\` works](/interview-question/how-does-the-in-operator-work-in-python)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The chain a less than b less than c is split into two comparisons, a less than b and b less than c, joined by and">
  <defs>
    <marker id="py02q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="210" y="24" width="220" height="64" rx="10"/>
  <text class="d-text d-accent" x="320" y="52" text-anchor="middle">a &lt; b &lt; c</text>
  <text class="d-sub" x="320" y="74" text-anchor="middle">b is evaluated once</text>
  <rect class="d-box" x="40" y="150" width="210" height="64" rx="10"/>
  <text class="d-text" x="145" y="178" text-anchor="middle">a &lt; b</text>
  <text class="d-sub" x="145" y="200" text-anchor="middle">checked first</text>
  <rect class="d-box" x="390" y="150" width="210" height="64" rx="10"/>
  <text class="d-text" x="495" y="178" text-anchor="middle">b &lt; c</text>
  <text class="d-sub" x="495" y="200" text-anchor="middle">only if the first is true</text>
  <text class="d-text d-accent" x="320" y="188" text-anchor="middle">and</text>
  <path class="d-edge" d="M 270 88 L 175 146" marker-end="url(#py02q3-arrow)"/>
  <path class="d-edge" d="M 370 88 L 465 146" marker-end="url(#py02q3-arrow)"/>
</svg>

The language reference states it this way: \`x < y <= z\` is equivalent to \`x < y and y <= z\`, except that \`y\` is evaluated only once, and \`z\` is not evaluated at all when \`x < y\` is false ([Python reference, Comparisons](https://docs.python.org/3/reference/expressions.html#comparisons)).

~~~python
x = 5
print(1 < x < 10)     # True
print(3 > 2 > 1)      # True  : (3 > 2) and (2 > 1)
print((3 > 2) > 1)    # False : True > 1 is 1 > 1
~~~

The parentheses version is the C/JavaScript reading: \`(3 > 2)\` is \`True\`, \`True\` behaves as the integer 1, and \`1 > 1\` is False. Parentheses **break** a chain into an ordinary nested comparison.

📌 **Interview term: short-circuit evaluation** — stopping as soon as the answer is known. A chain stops at the first comparison that is false, exactly like \`and\`, so later operands are never computed.

## 3. Evaluated Once, Left to Right, Stops Early

Example 2 logs each operand as it is evaluated:

~~~text
True
evaluated: [1, 2, 3]
False
evaluated: [5, 2]
True
evaluated: [1, 2, 2, 3]
~~~

- \`v(1) < v(2) < v(3)\`: three evaluations — the middle one is **reused**, not recomputed.
- \`v(5) < v(2) < v(3)\`: \`5 < 2\` is false, so \`v(3)\` is **never called**.
- The hand-written \`v(1) < v(2) and v(2) < v(3)\` calls \`v(2)\` **twice**. So a chain is not just shorter — if \`b\` is an expensive call or has side effects, it behaves differently from the expanded form.

### What the chain returns

Like \`and\`, a chain returns the **actual result** of the first comparison that is falsy, or of the last comparison — not necessarily \`True\`/\`False\`. With normal numbers the results are booleans anyway, but Example 2 uses a class whose \`__lt__\` returns a string, and the whole chain evaluates to the last string, \`'<b lt c>'\`.

### Why NumPy arrays break in a chain

To decide whether to continue, the chain calls \`bool()\` on each intermediate result. A NumPy comparison returns an array of booleans, and \`bool(array)\` raises \`ValueError: The truth value of an array with more than one element is ambiguous\`. Example 2 reproduces the mechanism without NumPy: a \`__lt__\` that returns an object whose \`__bool__\` raises. A single comparison is fine; the chain fails. For arrays, write \`(lo < arr) & (arr < hi)\` instead. (NumPy is not installed in the page runner, so its exact message is quoted from its well-known error text, not from our run.)

📌 **Interview term: rich comparison methods** — \`__lt__\`, \`__le__\`, \`__eq__\`, \`__ne__\`, \`__gt__\`, \`__ge__\`. Each operator in the chain calls one of them, and they may return any object; the reflected fallback (\`b.__gt__(a)\` when \`a.__lt__(b)\` returns \`NotImplemented\`) is covered in [how \`a + b\` dispatches](/interview-question/how-does-a-b-dispatch-in-python).

## 4. What CPython Actually Runs

\`dis\` shows the "evaluate once" trick. For \`return a < b < c\` on 3.11.17:

~~~text
  3           2 LOAD_FAST                0 (a)
              4 LOAD_FAST                1 (b)
              6 SWAP                     2
              8 COPY                     2
             10 COMPARE_OP               0 (<)
             16 JUMP_IF_FALSE_OR_POP     5 (to 28)
             18 LOAD_FAST                2 (c)
             20 COMPARE_OP               0 (<)
             26 JUMP_FORWARD             2 (to 32)
        >>   28 SWAP                     2
             30 POP_TOP
        >>   32 RETURN_VALUE
~~~

\`b\` is loaded once; \`SWAP\`/\`COPY\` keep a second reference to it on the stack for the next comparison, and \`JUMP_IF_FALSE_OR_POP\` is the short circuit. On 3.13.16 the same function compiles to \`COPY 1\`, \`TO_BOOL\`, \`POP_JUMP_IF_FALSE\` — the \`bool()\` call on the intermediate result is a visible instruction there:

~~~text
  3           LOAD_FAST_LOAD_FAST      1 (a, b)
              SWAP                     2
              COPY                     2
              COMPARE_OP               2 (<)
              COPY                     1
              TO_BOOL
              POP_JUMP_IF_FALSE        5 (to L1)
              POP_TOP
              LOAD_FAST                2 (c)
              COMPARE_OP               2 (<)
              RETURN_VALUE
      L1:     SWAP                     2
              POP_TOP
              RETURN_VALUE
~~~

Exact opcodes change between versions; the behaviour (one evaluation of \`b\`, short circuit, truth test of each step) does not.

## 5. Legal but Surprising Chains

Because all comparison operators chain, mixing them gives results that look wrong until you expand them:

| Expression | Expands to | Result |
| :--- | :--- | :--- |
| \`1 < 3 > 2\` | \`1 < 3 and 3 > 2\` | \`True\` (nothing is said about 1 vs 2) |
| \`1 == 1.0 == True\` | \`1 == 1.0 and 1.0 == True\` | \`True\` (\`True == 1\`) |
| \`1 < 2 != 2\` | \`1 < 2 and 2 != 2\` | \`False\` |
| \`1 in [1, 2] == True\` | \`1 in [1, 2] and [1, 2] == True\` | \`False\` |
| \`False == False in [False]\` | \`False == False and False in [False]\` | \`True\` |
| \`a == b == c\` | \`a == b and b == c\` | all three equal |
| \`a != b != c\` | \`a != b and b != c\` | \`a\` and \`c\` **may be equal** |

📌 **Interview term: non-transitive chain** — a chain whose links do not imply anything about the ends. \`a != b != c\` is the classic example: \`1 != 2 != 1\` is True. To check "all different", use \`len({a, b, c}) == 3\`.

The \`in ... == True\` row is a real bug pattern: someone writes \`if x in items == True:\` meaning \`(x in items) == True\`, and gets the chain instead. Do not compare to \`True\` at all; write \`if x in items:\`.

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runner (Pyodide 0.25.1): identical output, and all 11 \`print(...)  # expected\` lines of Example 1 passed as in-page tests. The \`dis\` listings in section 4 were printed by \`dis.dis\` on python3.11.17 and python3.13.16 (header line \`RESUME\` omitted).

**Example 1 — the rule, the trap, mixed operators:**

~~~text
True
True
True
False
True
True
False
True
False
True
[False, True, True, True, False]
~~~

**Example 2 — evaluated once, short circuit, bool() of each step:**

~~~text
True
evaluated: [1, 2, 3]
False
evaluated: [5, 2]
True
evaluated: [1, 2, 2, 3]
  __lt__ returned '<a lt b>'
  __lt__ returned '<b lt c>'
chain value: '<b lt c>'
TypeError: truth value of this object is ambiguous
a single comparison is fine: NoBool
~~~

## 7. Edge Cases

- **Comparing different types:** \`1 < "a"\` raises \`TypeError\` in Python 3, so a chain with mixed types fails at the first bad link — and not at all if an earlier link was already false.
- **\`is\` in a chain:** \`a is b is None\` means \`a is b and b is None\` — legal, rarely clearer than writing it out.
- **NaN:** \`float("nan")\` makes every ordering comparison false, so \`0 <= nan <= 1\` is False — a cheap NaN rejection, but say so in a comment.
- **Chains inside \`if\` with \`not\`:** \`not a < b < c\` negates the whole chain (\`not\` binds more loosely than comparisons).

## Common Pitfalls

- **Adding parentheses "for clarity":** \`(a < b) < c\` is a different expression that compares a boolean with \`c\`.
- **Assuming transitivity:** \`a < b > c\` and \`a != b != c\` say nothing about \`a\` versus \`c\`.
- **Writing \`x in items == True\`**, which chains into \`x in items and items == True\`.
- **Expecting the expanded and chained forms to behave the same** when the middle operand has side effects or is expensive — the chain evaluates it once, the expansion twice.
- **Chaining NumPy or pandas comparisons**, which calls \`bool()\` on an array; combine element-wise masks with \`&\` instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a &lt; b &lt; c</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a &lt; b) and (b &lt; c)</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> evaluated only once. It is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a &lt; b) &lt; c</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which operators:</strong> <span style="color:#f0e2c8;">All comparison operators chain: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt; &gt; &lt;= &gt;= == !=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is not</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not in</code> — they share one precedence level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Evaluation order:</strong> <span style="color:#f0e2c8;">Left to right, each operand at most once, and it short-circuits like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a &lt; b</code> is false, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c</code> is never evaluated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Only neighbours:</strong> <span style="color:#f0e2c8;">Each link compares adjacent operands, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt; 3 &gt; 2</code> is legal and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a != b != c</code> allows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a == c</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(3 &gt; 2) &gt; 1</code> is False, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 in [1, 2] == True</code> is False, and a chain calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool()</code> on each step, which fails for NumPy arrays.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(3 &gt; 2) &gt; 1</code> False when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">3 &gt; 2 &gt; 1</code> is True?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Parentheses stop the chain. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(3 &gt; 2)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, which equals 1, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &gt; 1</code> is False. The chain instead checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 &gt; 2 and 2 &gt; 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a &lt; b &lt; c</code> exactly the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a &lt; b and b &lt; c</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same truth value, but not the same evaluation: the chain evaluates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> once, the expansion twice. With a function call in the middle you see the difference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 in [1, 2] == True</code> evaluate to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">False. It chains to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 in [1, 2] and [1, 2] == True</code>, and a list is not equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. Never compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">== True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a chain return when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__lt__</code> returns non-booleans?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and</code>, it returns the first falsy link result or the last one, and it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool()</code> on each intermediate result to decide whether to continue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do a range check on a NumPy array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a chain — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool()</code> of an array is ambiguous. Use element-wise operators: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo &lt;= arr) &amp; (arr &lt; hi)</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **comparison chaining** | \`a op b op c\` means \`(a op b) and (b op c)\`, \`b\` evaluated once |
| **comparison operators** | \`< > <= >= == !=\`, \`is\`, \`is not\`, \`in\`, \`not in\` — all chain |
| **short-circuit evaluation** | Stop at the first false link; later operands are not evaluated |
| **rich comparison methods** | \`__lt__\`, \`__eq__\` and friends, called by each link |
| **non-transitive chain** | A chain whose links imply nothing about its two ends |

---
**Conclusion:** A comparison chain is shorthand for comparisons joined by \`and\`: \`a < b < c\` is \`(a < b) and (b < c)\`, with \`b\` evaluated only once, left-to-right order, and a short circuit at the first false link. That is why \`0 <= x < 10\` reads like maths and works, and why \`(3 > 2) > 1\` — which is no longer a chain — is False. The same rule applies to \`==\`, \`!=\`, \`is\` and \`in\`, which produces legal but surprising results like \`1 in [1, 2] == True\` being False, and because each link is truth-tested, chaining array comparisons raises an error. A strong answer states the expansion, the evaluate-once and short-circuit details, and one gotcha.`,
    examples: [
      {
        label: `Chaining rules, the parentheses trap and mixed operators`,
        code: `# a < b < c means (a < b) and (b < c), NOT (a < b) < c.
x = 5
print(1 < x < 10)  # True
print(10 > x > 1)  # True

# The trap: grouping by hand changes the meaning.
print(3 > 2 > 1)  # True
print((3 > 2) > 1)  # False
# (3 > 2) is True, and True > 1 is 1 > 1, which is False.

# Any comparison operators can be mixed in one chain.
print(1 < 3 > 2)  # True
print(1 == 1.0 == True)  # True
print(1 < 2 != 2)  # False
print(0 <= x < 10 <= 10)  # True

# in, not in, is and is not are comparison operators too, so they chain.
print(1 in [1, 2] == True)  # False
# It means (1 in [1, 2]) and ([1, 2] == True); the list is not equal to True.
print(False == False in [False])  # True
# It means (False == False) and (False in [False]).

# A range check that reads like maths, versus the long form.
def in_range(v, low=0, high=100):
    return low <= v <= high

print([in_range(v) for v in (-1, 0, 50, 100, 101)])  # [False, True, True, True, False]`,
      },
      {
        label: `Evaluated once, short-circuit, and bool() on each step`,
        code: `# Each operand is evaluated at most once, left to right, and the chain
# stops at the first comparison that is false (short-circuit, like and).
calls = []

def v(n):
    calls.append(n)
    return n

calls.clear()
print(v(1) < v(2) < v(3))
print("evaluated:", calls)

calls.clear()
print(v(5) < v(2) < v(3))
print("evaluated:", calls)

# The hand-written and version evaluates the middle operand twice.
calls.clear()
print(v(1) < v(2) and v(2) < v(3))
print("evaluated:", calls)

# Like and, a chain returns the first falsy result, or the last result.
class Loud:
    def __init__(self, name):
        self.name = name
    def __lt__(self, other):
        result = f"<{self.name} lt {other.name}>"
        print("  __lt__ returned", repr(result))
        return result

a, b, c = Loud("a"), Loud("b"), Loud("c")
print("chain value:", repr(a < b < c))

# The chain calls bool() on every intermediate result. This is why
# NumPy arrays raise "truth value is ambiguous" in a chain.
class NoBool:
    def __bool__(self):
        raise TypeError("truth value of this object is ambiguous")

class Grid:
    def __lt__(self, other):
        return NoBool()

try:
    Grid() < Grid() < Grid()
except TypeError as e:
    print("TypeError:", e)

r = Grid() < Grid()
print("a single comparison is fine:", type(r).__name__)`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the walrus operator?`,
    difficulty: "easy",
    seoDescription: `The Python walrus operator := explained: assignment expressions from PEP 572, where they help, precedence, comprehension scope and syntax rules.`,
    description: `**Question presented to candidate:**
"What is the walrus operator, \`:=\`? Show me one place where it makes code genuinely better, and one place where you would not use it."

**What a strong answer should cover:**
- \`:=\` is an assignment expression (PEP 572, Python 3.8): it binds a name **and** evaluates to the value, so it can sit inside \`if\`, \`while\`, comprehensions and calls, where a normal \`=\` statement cannot.
- The good uses: a read loop \`while (chunk := f.read(n)):\`, keeping a regex match you just tested, and computing a value once in a comprehension that both filters on it and keeps it.
- Precedence: it binds more loosely than comparisons, so \`if n := len(a) > 3\` stores a boolean; parenthesise \`(n := len(a)) > 3\`.
- Scope: inside a comprehension the target binds in the enclosing function or module scope (the loop variable does not leak, the walrus target does).
- Restrictions: not a bare statement, only plain names as targets (no attributes or subscripts), cannot rebind a comprehension iteration variable, not inside a comprehension in a class body.

**Code / implementation expected:** Yes — a short before/after, for example a comprehension that calls an expensive function once instead of twice.`,
    answer: `**Target Audience:** Beginners who have seen \`:=\` and want to know when it helps; candidates who want the scope and syntax rules.
**Difficulty:** Easy
**Python version:** Available since Python 3.8. Behaviour checked on CPython 3.11.17 (and 3.13.16, same output) and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain words, then tagged \`📌 Interview term:\` with the name an interviewer expects. All output is from real runs, collected in the **Verified** section.

## 1. Why This Even Matters — A Story First

You are at a coffee shop counter. The barista calls out "large oat latte!" and, in the same moment, writes your name on the cup. One action, two results: the order is announced *and* recorded. Before the walrus operator, Python could only do the recording as a separate step — write the name on the cup, then hold it up and call it out — which meant either an extra line or doing the work twice.

\`:=\` is "call it out and write it down" in one move. Its nickname comes from the symbol: the Python 3.8 release notes say it is known as "the walrus operator" because of its resemblance to the eyes and tusks of a walrus ([What's New in Python 3.8](https://docs.python.org/3/whatsnew/3.8.html)). It was also the most argued-about feature in Python's history: after accepting PEP 572, Guido van Rossum stepped down as Python's "BDFL", writing that he did not want to fight that hard for a PEP again ([LWN, July 2018](https://lwn.net/Articles/759756/)).

## 2. The Core Idea

📌 **Interview term: statement vs expression** — an *expression* produces a value and can be placed inside other code (\`len(x) + 1\`). A *statement* is a complete instruction that produces no value (\`x = 5\`, \`import os\`). Normal assignment is a statement, so it cannot appear inside an \`if\` condition.

📌 **Interview term: assignment expression** — the \`NAME := value\` form from [PEP 572](https://peps.python.org/pep-0572/), added in Python 3.8. It assigns \`value\` to \`NAME\` **and** the whole expression evaluates to that same value.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 240" role="img" aria-label="An assignment expression does two things. It binds the name y in the enclosing scope, and the same value flows on into the surrounding if, while or filter">
  <defs>
    <marker id="py02q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="88" width="210" height="64" rx="10"/>
  <text class="d-text d-accent" x="135" y="116" text-anchor="middle">(y := f(x))</text>
  <text class="d-sub" x="135" y="138" text-anchor="middle">assignment expression</text>
  <rect class="d-box" x="440" y="24" width="230" height="64" rx="10"/>
  <text class="d-text" x="555" y="52" text-anchor="middle">1. name y is bound</text>
  <text class="d-sub" x="555" y="74" text-anchor="middle">in the enclosing scope</text>
  <rect class="d-box" x="440" y="152" width="230" height="64" rx="10"/>
  <text class="d-text" x="555" y="180" text-anchor="middle">2. the value flows on</text>
  <text class="d-sub" x="555" y="202" text-anchor="middle">into if, while or a filter</text>
  <path class="d-edge" d="M 240 106 L 436 58" marker-end="url(#py02q4-arrow)"/>
  <path class="d-edge-accent" d="M 240 134 L 436 182" marker-end="url(#py02q4-arrow)"/>
</svg>

Both results happen at once: after \`(y := f(x))\` the name \`y\` exists in the surrounding scope, and the surrounding \`if\`, \`while\` or comprehension filter receives the value to test.

~~~python
data = [4, 8, 15, 16, 23, 42]
if (n := len(data)) > 5:
    print(f"list is too long ({n} elements, expected <= 5)")
# list is too long (6 elements, expected <= 5)
~~~

Without \`:=\` you write \`n = len(data)\` on the line above. That is often fine — the walrus is worth it when the separate line would have to be duplicated or would force the value to be computed twice.

## 3. Where It Genuinely Helps

**1. Loops that read until empty.** The classic: assign and test in the \`while\` condition, so there is only one \`read\` call.

~~~python
stream = io.StringIO("abcdefghij")
chunks = []
while (chunk := stream.read(4)):
    chunks.append(chunk)
print(chunks)   # ['abcd', 'efgh', 'ij']
~~~

The old way needs either \`while True: ... if not chunk: break\` or a read before the loop *and* at the end of the body. The loop stops when \`read\` returns \`""\`, which is falsy (see [falsy values](/interview-question/what-values-are-falsy-in-python)).

**2. Keeping the result of a test.** \`re.search\` returns a match object or \`None\`; the walrus tests it and keeps it:

~~~python
if (m := re.search(r"order=(\\d+)", line)) is not None:
    print("order id:", m.group(1))     # order id: 1042
~~~

**3. Compute once in a comprehension.** Filtering on \`f(x)\` and also keeping \`f(x)\` normally calls \`f\` twice per kept item:

~~~text
[9, 16, 25] calls: 9
[9, 16, 25] calls: 6
~~~

The first line is \`[slow_square(x) for x in range(6) if slow_square(x) > 5]\` (6 calls in the filter + 3 for the kept values); the second is \`[y for x in range(6) if (y := slow_square(x)) > 5]\` — one call per item. (More on comprehension syntax in [list/dict/set comprehensions](/interview-question/what-are-list-dict-set-comprehensions).)

**4. Capturing a witness from \`any()\`.** \`any()\` stops at the first true item; a walrus inside the generator remembers which one it was: \`any(len(w := word) > 5 for word in words)\` leaves \`w == "banana"\`.

📌 **Interview term: witness** — the specific element that made an \`any()\` true (or an \`all()\` false). Without the walrus, \`any()\` only tells you *that* one exists.

## 4. Precedence and Scope Rules

### Precedence: it binds loosely

\`:=\` has lower precedence than comparisons and arithmetic, so it grabs everything to its right:

~~~text
without parentheses n is True
with parentheses n is 4
~~~

\`if n := len(data) > 3:\` means \`n := (len(data) > 3)\`, so \`n\` is \`True\`. Always parenthesise the walrus when it is part of a larger condition. The same looseness with commas: \`pair = (first := 1, 2)\` builds the tuple \`(1, 2)\` and sets \`first\` to \`1\`, not to the tuple.

### Scope: comprehensions bind outward

📌 **Interview term: enclosing scope binding** — a walrus inside a comprehension assigns to the scope that *contains* the comprehension (the function, or the module), not to the comprehension itself. This is the opposite of the loop variable, which stays private (see [the LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution)).

~~~python
totals = [running := x * 10 for x in range(1, 4)]
print(totals)              # [10, 20, 30]
print(running)             # 30     <- the walrus target leaked out, on purpose
print("x" in globals())    # False  <- the loop variable did not
~~~

PEP 572 chose this on purpose so that the witness pattern (\`any(... (w := ...) ...)\`) works. A gotcha that follows from it: the assignment runs for **every** item the walrus is evaluated on, including items the filter then rejects — \`[hit for n in nums if (hit := n) > 0]\` on \`[3, -1, 7, -2]\` keeps \`[3, 7]\` but leaves \`hit == -2\`.

## 5. Where It Is Not Allowed

Example 2 hands each form to \`compile()\` and prints the \`SyntaxError\` message from CPython 3.11:

| Code | Why | Message on 3.11 |
| :--- | :--- | :--- |
| \`x := 5\` | Not allowed as a bare statement — use \`=\` | \`invalid syntax\` |
| \`obj.attr := 5\` | Target must be a plain name | \`cannot use assignment expressions with attribute\` |
| \`items[0] := 5\` | Target must be a plain name | \`cannot use assignment expressions with subscript\` |
| \`[i := 0 for i in range(3)]\` | Would rebind the loop variable | \`assignment expression cannot rebind comprehension iteration variable 'i'\` |
| \`def f(a := 1): pass\` | Unparenthesised in a default | \`invalid syntax\` |
| Comprehension with \`:=\` inside a \`class\` body | No enclosing function scope to bind in | \`assignment expression within a comprehension cannot be used in a class body\` |

Wrapped in parentheses, \`(x := 5)\` and \`def f(a=(b := 1)): pass\` compile — and \`print(y := 5)\` is fine as a call argument. That a bare \`x := 5\` is rejected is deliberate: there should be one obvious way to write an ordinary assignment.

📌 **Interview term: unparenthesized assignment expression** — the forms PEP 572 forbids at statement level and in a few other places, so that \`:=\` and \`=\` are never interchangeable.

## 6. When Not to Use It

- **When a normal line is clearer.** \`n = len(data)\` above the \`if\` is easy to read; reach for \`:=\` when the separate line would be duplicated or the value computed twice.
- **Several walruses in one expression** — each one hides an assignment inside a condition; reviewers miss them.
- **Code that must run on Python 3.7 or older** — it is a \`SyntaxError\` there.
- **To "save a line" in a simple loop** where \`for line in f:\` already does the job.

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runner (Pyodide 0.25.1): identical output, with every \`print(...)  # expected\` line passing as an in-page test. Example 2 also printed the same on python3.13.16.

**Example 1 — the good uses:**

~~~text
['abcd', 'efgh', 'ij']
order id: 1042
list is too long (6 elements, expected <= 5)
[9, 16, 25] calls: 9
[9, 16, 25] calls: 6
first long word: banana
~~~

**Example 2 — scope, precedence and the syntax rules:**

~~~text
[10, 20, 30]
30
False
([3, 7], -2)
without parentheses n is True
with parentheses n is 4
(1, 2) 1
SyntaxError  'x := 5' -> invalid syntax
SyntaxError  'obj.attr := 5' -> cannot use assignment expressions with attribute
SyntaxError  'items[0] := 5' -> cannot use assignment expressions with subscript
SyntaxError  '[i := 0 for i in range(3)]' -> assignment expression cannot rebind comprehension iteration variable 'i'
SyntaxError  'def f(a := 1): pass' -> invalid syntax
SyntaxError  'class C:\\n    [y := 1 for _ in range(2)]' -> assignment expression within a comprehension cannot be used in a class body
OK           '(x := 5)'
OK           'print(y := 5)'
OK           'def f(a=(b := 1)): pass'
~~~

## Common Pitfalls

- **Forgetting parentheses with a comparison:** \`if n := len(a) > 3\` stores \`True\`, not the length.
- **Expecting the walrus to stay inside a comprehension.** It binds in the enclosing scope, and overwrites any existing name there.
- **Assuming it only assigns for kept items.** In \`[... if (y := f(x)) > 0]\` the assignment runs for every item, so \`y\` ends as the value for the *last* item, not the last kept one.
- **Trying \`self.x := ...\` or \`d[k] := ...\`.** Only plain names are allowed targets.
- **Using it as a statement** (\`x := 5\`) — a \`SyntaxError\`; use \`=\`.
- **Overusing it** in long one-liners, which hides assignments inside conditions.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:=</code> is an assignment expression from PEP 572 (Python 3.8): it assigns a name and evaluates to the value, so it can sit inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> or comprehension.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The best uses:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (chunk := f.read(n)):</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (m := re.search(...)):</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[y for x in xs if (y := f(x)) &gt; 0]</code>, which calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> once per item instead of twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Precedence:</strong> <span style="color:#f0e2c8;">It binds more loosely than comparisons: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if n := len(a) &gt; 3</code> stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(n := len(a)) &gt; 3</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope:</strong> <span style="color:#f0e2c8;">In a comprehension the target binds in the enclosing scope, unlike the loop variable; that is what lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any(... (w := x) ...)</code> keep the witness.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Restrictions:</strong> <span style="color:#f0e2c8;">Not a bare statement, plain names only (no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.attr</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[k]</code>), cannot rebind a comprehension loop variable, and not in a comprehension inside a class body.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x := 5</code> on its own a SyntaxError?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PEP 572 forbids an unparenthesised assignment expression at statement level so that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> stays the one obvious way to assign. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x := 5)</code> is legal but pointless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">=</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> is a statement: no value, can unpack and assign to attributes or items. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:=</code> is an expression: it has a value, but only targets a single plain name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">After <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[y := f(x) for x in data]</code>, does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">y</code> exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in the enclosing scope, holding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> of the last item. The loop variable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> does not leak; the walrus target is designed to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the walrus faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It avoids repeated work — the comprehension example drops from 9 calls to 6 — but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:=</code> itself is not faster than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code>. The gain is calling the expensive thing once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n = ...</code> line above the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> is just as clear, when the code must run on 3.7 or older, or when several walruses would hide assignments inside one condition.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **statement vs expression** | An expression has a value and can be nested; a statement cannot |
| **assignment expression** | \`NAME := value\`: assigns and returns the value (PEP 572, 3.8) |
| **witness** | The element that made \`any()\` true, kept with \`:=\` |
| **enclosing scope binding** | A walrus in a comprehension binds in the surrounding scope |
| **unparenthesized assignment expression** | The forms that are \`SyntaxError\`s without parentheses |

---
**Conclusion:** The walrus operator \`:=\` is an assignment you can use as a value: it binds a name and returns what it bound, which lets one expression both test and keep a result. Its real wins are a single-\`read\` \`while\` loop, keeping a regex match object, calling an expensive function once in a comprehension, and capturing the witness of \`any()\`. The rules to know are its low precedence (parenthesise it), its outward binding from comprehensions, and its restrictions — plain names only, never a bare statement, not over a comprehension loop variable or in a class body. Use it to remove genuine duplication, and prefer a plain \`=\` line whenever that reads just as well.`,
    examples: [
      {
        label: `The good uses: read loops, regex matches, compute-once comprehensions, any() witness`,
        code: `# := assigns a value AND gives that value back, so it fits inside an expression.
import io
import re

# 1) Read-until-empty loop: assign and test in one place.
stream = io.StringIO("abcdefghij")
chunks = []
while (chunk := stream.read(4)):
    chunks.append(chunk)
print(chunks)  # ['abcd', 'efgh', 'ij']

# 2) Keep a regex match object that you just tested.
line = "order=1042 status=shipped"
if (m := re.search(r"order=(\\d+)", line)) is not None:
    print("order id:", m.group(1))

# 3) Reuse a computed value in the if body.
data = [4, 8, 15, 16, 23, 42]
if (n := len(data)) > 5:
    print(f"list is too long ({n} elements, expected <= 5)")

# 4) Compute once in a comprehension: filter on f(x) and keep f(x).
calls = 0
def slow_square(x):
    global calls
    calls += 1
    return x * x

calls = 0
twice = [slow_square(x) for x in range(6) if slow_square(x) > 5]
print(twice, "calls:", calls)

calls = 0
once = [y for x in range(6) if (y := slow_square(x)) > 5]
print(once, "calls:", calls)

# 5) any() stops at the first hit; the walrus keeps that hit (a witness).
words = ["apple", "kiwi", "banana", "fig"]
if any(len(w := word) > 5 for word in words):
    print("first long word:", w)`,
      },
      {
        label: `Scope, precedence and where := is a SyntaxError`,
        code: `# Scope rules and the places where := is not allowed.

# 1) In a comprehension, := binds in the ENCLOSING scope.
#    The comprehension loop variable itself does not leak.
totals = [running := x * 10 for x in range(1, 4)]
print(totals)  # [10, 20, 30]
print(running)  # 30
print("x" in globals())  # False

# Inside a function, the target becomes a local of that function.
# Gotcha: the assignment runs for EVERY item, also the ones the filter drops.
def last_assigned(nums):
    positives = [hit for n in nums if (hit := n) > 0]
    return positives, hit

print(last_assigned([3, -1, 7, -2]))  # ([3, 7], -2)

# 2) Precedence: := binds more loosely than comparison operators.
data = [1, 2, 3, 4]
if n := len(data) > 3:
    print("without parentheses n is", n)
if (n := len(data)) > 3:
    print("with parentheses n is", n)

# 3) Precedence with commas: only the first item is assigned.
pair = (first := 1, 2)
print(pair, first)

# 4) Things the compiler rejects (compile() lets us show the error).
snippets = [
    "x := 5",
    "obj.attr := 5",
    "items[0] := 5",
    "[i := 0 for i in range(3)]",
    "def f(a := 1): pass",
    "class C:\\n    [y := 1 for _ in range(2)]",
]
for src in snippets:
    try:
        compile(src, "<demo>", "exec")
        print("OK          ", repr(src))
    except SyntaxError as e:
        print("SyntaxError ", repr(src), "->", e.msg)

# 5) The parenthesised forms are fine.
for src in ["(x := 5)", "print(y := 5)", "def f(a=(b := 1)): pass"]:
    compile(src, "<demo>", "exec")
    print("OK          ", repr(src))`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What are f-strings?`,
    difficulty: "easy",
    seoDescription: `Python f-strings explained: replacement fields, the format mini-language, !r and = debugging, __format__, eager evaluation, PEP 701 and t-strings.`,
    description: `**Question presented to candidate:**
"What are f-strings, and why do most Python teams prefer them over \`%\` formatting and \`str.format\`? Show me a few format specs you use day to day — and tell me one place where you would *not* use an f-string."

**What a strong answer should cover:**
- An f-string (formatted string literal, PEP 498, Python 3.6) is a string literal with an \`f\` prefix whose \`{...}\` fields hold Python expressions, evaluated at run time where the literal is written.
- Field anatomy: \`{expression!conversion:format_spec}\` — \`!r\`/\`!s\`/\`!a\` pick \`repr\`/\`str\`/\`ascii\`, the spec after \`:\` is the format mini-language (\`.2f\`, \`,\`, \`>10\`, \`08b\`, \`%\`), and \`=\` (3.8) prints the expression text for debugging.
- Each field calls \`format(value, spec)\`, i.e. \`type(value).__format__\`, so types like \`datetime\` and your own classes define their own specs; braces are escaped by doubling.
- f-strings are eager: evaluated once, immediately — not a reusable template, and wasted work in \`logging\` calls that are filtered out (use \`%s\` arguments there).
- Version facts: PEP 701 (3.12) allows reusing the same quotes, backslashes and comments inside the braces; t-strings (PEP 750, 3.14) are the template version. Never build SQL or shell commands with f-strings.

**Code / implementation expected:** Yes — a few lines showing expressions, a numeric spec, \`!r\` and the \`=\` debug form.`,
    answer: `**Target Audience:** Beginners formatting their first output; candidates who want the format mini-language, the CPython detail and the version history.
**Difficulty:** Easy
**Python version:** f-strings exist since Python 3.6. Examples 1 and 2 checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); Example 3 needs 3.12+ and was checked on 3.12.3 and 3.13.16.

> **How to read this doc:** Every idea is explained in plain words first, then tagged \`📌 Interview term:\` with the precise name. All output is from real runs and is quoted in full in the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of a form letter: "Dear ____, your order of ____ items will arrive on ____." Older Python made you write the letter with blanks, then hand over the values in a separate list, in the right order: \`"Dear %s, your order of %d items" % (name, qty)\`. Mix up the order and the letter is wrong.

An f-string writes the values *into the blanks themselves*: \`f"Dear {name}, your order of {qty} items"\`. You read the sentence and see exactly what goes where. Because almost every program formats text — log lines, error messages, reports — this is one of the most-used features of the language, and interviewers use it to see whether you know the formatting rules beyond "put a variable in braces".

## 2. The Core Idea

📌 **Interview term: f-string (formatted string literal)** — a string literal prefixed with \`f\` or \`F\` whose \`{...}\` parts contain Python expressions. They were introduced by [PEP 498](https://peps.python.org/pep-0498/) in Python 3.6. The \`f\` can be combined with \`r\` (raw) but not with \`b\` (bytes).

📌 **Interview term: replacement field** — one \`{...}\` part. Its full form is \`{expression!conversion:format_spec}\`; only the expression is required.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="The parts of an f-string: the f prefix, literal text, and a replacement field made of an expression, a conversion and a format spec">
  <rect class="d-box-muted" x="20" y="40" width="70" height="60" rx="10"/>
  <text class="d-text" x="55" y="76" text-anchor="middle">f</text>
  <rect class="d-box" x="110" y="40" width="150" height="60" rx="10"/>
  <text class="d-text" x="185" y="76" text-anchor="middle">User:</text>
  <rect class="d-box-accent" x="280" y="40" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="76" text-anchor="middle">{ name</text>
  <rect class="d-box-accent" x="460" y="40" width="90" height="60" rx="10"/>
  <text class="d-text d-accent" x="505" y="76" text-anchor="middle">!r</text>
  <rect class="d-box-accent" x="570" y="40" width="130" height="60" rx="10"/>
  <text class="d-text d-accent" x="635" y="76" text-anchor="middle">:&gt;12 }</text>
  <text class="d-sub" x="55" y="134" text-anchor="middle">prefix</text>
  <text class="d-sub" x="185" y="134" text-anchor="middle">literal text</text>
  <text class="d-sub" x="360" y="134" text-anchor="middle">expression</text>
  <text class="d-sub" x="505" y="134" text-anchor="middle">conversion</text>
  <text class="d-sub" x="635" y="134" text-anchor="middle">format spec</text>
  <path class="d-edge-dashed" d="M 280 166 L 700 166"/>
  <text class="d-sub" x="490" y="192" text-anchor="middle">one replacement field</text>
</svg>

So \`f"User: {name!r:>12}"\` means: evaluate \`name\`, take its \`repr()\`, right-align it in 12 characters, and put it after the literal text \`User: \`.

~~~python
name, qty, price = "widget", 7, 1234.5
print(f"{name} x{qty} = {qty * price}")           # widget x7 = 8641.5
print(f"{name.upper()} has {len(name)} letters")  # WIDGET has 6 letters
~~~

Any expression works inside the braces: arithmetic, method calls, indexing, function calls, conditional expressions.

## 3. The Format Mini-Language

📌 **Interview term: format specification mini-language** — the small language after the \`:\` in a field (the same one used by \`format()\` and \`str.format\`). Its general shape is \`[[fill]align][sign][#][0][width][,][.precision][type]\`.

The specs you will actually use, all from Example 1:

| Field | Output | What it does |
| :--- | :--- | :--- |
| \`{price:.2f}\` | \`1234.50\` | Fixed point, 2 decimals |
| \`{price:,.2f}\` | \`1,234.50\` | Thousands separator |
| \`{qty:+d}\` | \`+7\` | Always show the sign |
| \`{0.4567:.1%}\` | \`45.7%\` | Multiply by 100, add \`%\` |
| \`{42:05d}\` | \`00042\` | Zero-pad to width 5 |
| \`{255:x}\` / \`{255:#x}\` | \`ff\` / \`0xff\` | Hex, with \`#\` adding the prefix |
| \`{5:08b}\` | \`00000101\` | Binary, zero-padded to 8 |
| \`{name:<10}\` / \`{name:>10}\` / \`{name:^10}\` | \`widget    \` / \`    widget\` / \`  widget  \` | Left / right / centre in 10 |
| \`{name:*^12}\` | \`***widget***\` | Centre with a custom fill character |
| \`{3.14159:{width}.{digits}f}\` | \`     3.142\` | Nested fields: the spec comes from variables |
| \`{d:%Y-%m-%d}\` | \`2026-10-17\` | A \`date\` passes the spec to \`strftime\` |

### Conversions and the debug form

📌 **Interview term: conversion flag** — \`!s\`, \`!r\` or \`!a\` after the expression: apply \`str()\`, \`repr()\` or \`ascii()\` before formatting. \`!r\` is the one to use in error messages, because it shows quotes and escapes (see [\`__repr__\` vs \`__str__\`](/interview-question/what-is-the-difference-between-repr-and-str)).

~~~text
café 'café' 'caf\\xe9'
~~~

📌 **Interview term: self-documenting expression (\`=\` specifier)** — \`f"{expr=}"\` prints the expression's source text, an \`=\` and the value's \`repr()\`. Added in Python 3.8 ([What's New in 3.8](https://docs.python.org/3/whatsnew/3.8.html), bpo-36817). Spaces around \`=\` are kept, and a spec can follow:

~~~text
total=8641.5
qty * price = 8,641.5
~~~

Literal braces are written doubled: \`f"{{name}}"\` prints \`{name}\`.

## 4. What CPython Does With an f-string

An f-string is not a string that gets "parsed later". The compiler turns it into ordinary bytecode at compile time. Example 2 compiles \`f"{a}-{b!r:>5}"\` and lists the opcodes. On CPython 3.11 (and 3.12, same list on our run):

~~~text
['LOAD_NAME', 'FORMAT_VALUE', 'LOAD_CONST', 'LOAD_NAME', 'LOAD_CONST', 'FORMAT_VALUE', 'BUILD_STRING', 'RETURN_VALUE']
~~~

Each field becomes "load the value, \`FORMAT_VALUE\` it", the literal pieces become constants, and \`BUILD_STRING\` joins them in one step. On 3.13.16 the same f-string compiles to \`FORMAT_SIMPLE\`, \`CONVERT_VALUE\` and \`FORMAT_WITH_SPEC\` instead of \`FORMAT_VALUE\` — the opcodes are an implementation detail, the idea is the same: no method lookup on a template string, no argument tuple.

That is why f-strings are usually the fastest formatting option. With \`timeit\` on our machine, formatting \`"widget x7"\` took about 73 ns as an f-string, 115 ns with \`str.format\` and 110 ns with \`%\` on CPython 3.11 (66, 110 and 96 ns on 3.13). Treat those as one machine's numbers; the ranking is what matters.

### Every field calls \`__format__\`

📌 **Interview term: \`__format__\`** — the method \`format(value, spec)\` calls. Each field in an f-string calls it with the text after the colon (an empty string when there is none). \`int\`, \`float\`, \`str\`, \`datetime\` and \`Decimal\` each understand their own spec, and your classes can define one. Example 2's \`Money\` class accepts a custom \`eur\` spec:

~~~text
EUR 1,234.56 | 1234.6 | Money(123456)
~~~

(More dunders in [dunder methods](/interview-question/what-are-dunder-magic-methods).)

## 5. Eager Evaluation, and Where That Hurts

📌 **Interview term: eager evaluation** — the f-string is evaluated immediately, once, where it is written. It is a string *value*, not a template you can fill in later:

~~~python
count = 1
msg = f"count is {count}"
count = 2
print(msg)                                   # count is 1
print("count is {count}".format(count=count))  # count is 2
~~~

When you need a reusable template — a message defined once and filled many times, or text loaded from a translation file — use \`str.format\` (or \`string.Template\`).

**Logging.** \`log.debug(f"state: {item}")\` builds the string even when debug logging is off, because the f-string is evaluated before \`debug()\` is called. With \`log.debug("state: %s", item)\` the logging module formats only if the record is actually emitted. Example 2 counts calls to an expensive \`__str__\`: the f-string version called it, the \`%s\` version did not (the count stayed at 1). See [how the logging module works](/interview-question/how-does-the-logging-module-work).

**Security.** An f-string is code you wrote, so it cannot be "injected" — but building SQL queries or shell commands with it is the classic injection bug, because the *values* can contain anything. Use query parameters and argument lists instead; see [common Python security pitfalls](/interview-question/what-are-common-python-security-pitfalls). The reverse also matters: never call \`.format()\` on a format string a user supplied — fields like \`{0.__class__}\` read attributes of the arguments.

## 6. Version History in One Table

| Version | Change | Source |
| :--- | :--- | :--- |
| 3.6 | f-strings introduced | [PEP 498](https://peps.python.org/pep-0498/) |
| 3.8 | \`=\` self-documenting expressions | [What's New 3.8](https://docs.python.org/3/whatsnew/3.8.html) |
| 3.12 | Formal grammar: same quotes inside braces, backslashes, multi-line expressions with comments, unlimited nesting | [PEP 701](https://peps.python.org/pep-0701/) |
| 3.14 | t-strings: \`t"..."\` produces a \`string.templatelib.Template\` instead of a \`str\`, so a library can process the values (for example escape them) before combining | [PEP 750](https://peps.python.org/pep-0750/) |

The 3.12 change is easy to see. On 3.11, Example 2 shows both forms rejected:

~~~text
SyntaxError f"{"nested same quotes"}" -> f-string: expecting '}'
SyntaxError f'{"\\n".join(["a", "b"])}' -> f-string expression part cannot include a backslash
~~~

Example 3 is marked not runnable in the page (the page runs 3.11) and was run on 3.12.3 and 3.13.16, where all four PEP 701 forms work. t-strings were not run here: no 3.14 interpreter was available, so that row is quoted from the PEP.

## 7. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and through the page runner (Pyodide 0.25.1): identical output, and every \`print(...)  # expected\` line passed as an in-page test. Example 3 was run with \`python3.12 main.py\` (and printed the same on 3.13).

**Example 1 — expressions, specs, conversions, \`=\`, nesting:**

~~~text
widget x7 = 8641.5
WIDGET has 6 letters
1234.50
1,234.50
+7
45.7%
00042
ff 0xff 101 00000101 10
|widget    |    widget|  widget  |
|***widget***|
café 'café' 'caf\\xe9'
total=8641.5
qty * price = 8,641.5
[     3.142]
2026-10-17 is a Saturday
{name} is written as widget
~~~

**Example 2 — eager evaluation, bytecode, \`__format__\`, logging, 3.11 limits:**

~~~text
count is 1
count is 2
['LOAD_NAME', 'FORMAT_VALUE', 'LOAD_CONST', 'LOAD_NAME', 'LOAD_CONST', 'FORMAT_VALUE', 'BUILD_STRING', 'RETURN_VALUE']
EUR 1,234.56 | 1234.6 | Money(123456)
True
after f-string debug(): 1
after %s-style debug(): 1
SyntaxError f"{"nested same quotes"}" -> f-string: expecting '}'
SyntaxError f'{"\\n".join(["a", "b"])}' -> f-string expression part cannot include a backslash
~~~

**Example 3 — PEP 701 forms (python 3.12):**

~~~text
Hello Ada, you know Python, Go
Playlist:
  - Take Me Back
  - Rain
  - Lucy
9 minutes
2
~~~

## 8. f-string vs the Alternatives

| | f-string | \`str.format\` | \`%\` formatting | \`string.Template\` |
| :--- | :--- | :--- | :--- | :--- |
| Syntax | \`f"{x:.2f}"\` | \`"{:.2f}".format(x)\` | \`"%.2f" % x\` | \`Template("$x").substitute(x=x)\` |
| When values are bound | Immediately, at the literal | When \`.format\` is called | When \`%\` runs | When \`substitute\` is called |
| Reusable template | No | Yes | Yes | Yes |
| Expressions inside | Any expression | Attribute and index lookups only | No | No |
| Typical use | Almost everything | Templates, i18n strings | \`logging\` calls, legacy code | Simple user-editable templates |

## Common Pitfalls

- **f-strings in \`logging\` calls** do the formatting work even when the message is filtered out; pass \`%s\` arguments instead.
- **Building SQL, HTML or shell commands** with f-strings — injection risk. Use parameters, escaping libraries, or argument lists.
- **Expecting an f-string to update** when the variables change later. It was evaluated once.
- **Writing 3.12-only f-strings** (same quotes inside, backslashes in braces) in code that must run on 3.11 or older.
- **Forgetting to double braces** for literal \`{\` \`}\` — common in f-strings that produce JSON or CSS text.
- **Leaving \`f"{x=}"\` debug prints** in committed code — handy while debugging, noise in production.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">An f-string is a string literal with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> prefix whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> fields are Python expressions, evaluated at run time where the literal is written (PEP 498, Python 3.6).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The field:</strong> <span style="color:#f0e2c8;">Each field is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{expression!conversion:format_spec}</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!r</code> for repr, then the mini-language — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.2f</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">,</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;10</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">08b</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> — and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{x=}</code> (3.8) for quick debugging.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it works:</strong> <span style="color:#f0e2c8;">The compiler turns it into bytecode that formats each field and joins the pieces; each field calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format(value, spec)</code>, i.e. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__format__</code>, so dates and custom classes define their own specs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why prefer it:</strong> <span style="color:#f0e2c8;">The values sit where they appear in the text, any expression is allowed, and it is usually faster than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.format</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When not to:</strong> <span style="color:#f0e2c8;">It is eager: not a reusable template, wasted work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">log.debug(...)</code> (use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%s</code> args), and never for SQL or shell commands. PEP 701 (3.12) relaxed quotes and backslashes; t-strings (3.14) are the template form.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f"{value!r}"</code> do differently from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f"{value}"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!r</code> applies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr()</code> before formatting, so strings show their quotes and escapes; the default uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format(value, "")</code>, which for most types equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str()</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!r</code> in error messages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">%s</code> arguments in logging instead of an f-string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The f-string is built before the logging call, even if the level filters the message out. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">log.debug("x=%s", x)</code> the formatting happens only when a handler actually emits the record.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make your own class work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f"{obj:spec}"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__format__(self, spec)</code> and return a string. The text after the colon arrives as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spec</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format(self.value, spec)</code> to reuse the built-in specs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you nest the same quotes inside an f-string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From Python 3.12 yes, thanks to PEP 701: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f"{d["key"]}"</code> works, and so do backslashes and comments inside the braces. On 3.11 and older it is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code>; use the other quote type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are t-strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python 3.14 template strings (PEP 750): <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t"..."</code> returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Template</code> object with the literal parts and values kept separate, so a library can escape the values (for SQL or HTML) before building the final string.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **f-string (formatted string literal)** | \`f"..."\` literal whose \`{}\` fields are Python expressions (3.6+) |
| **replacement field** | One \`{expression!conversion:format_spec}\` part |
| **format specification mini-language** | The spec after \`:\`, such as \`.2f\`, \`,\`, \`>10\`, \`08b\` |
| **conversion flag** | \`!s\`, \`!r\`, \`!a\`: apply \`str\`, \`repr\` or \`ascii\` first |
| **self-documenting expression** | \`f"{x=}"\` prints \`x=\` and the repr (3.8+) |
| **\`__format__\`** | The method each field calls with its spec |
| **eager evaluation** | Evaluated immediately where written; not a template |

---
**Conclusion:** An f-string is a string literal whose \`{}\` fields are real Python expressions, compiled into bytecode and evaluated immediately where the literal appears. Each field can add a conversion (\`!r\`) and a format spec from the mini-language (\`.2f\`, \`,\`, \`>10\`, \`#x\`), and every field ends up calling the value's \`__format__\`, which is how dates and your own classes get custom specs. f-strings are the most readable and usually the fastest option, and the \`=\` form makes debugging quick. A strong answer also knows their limits: they are eager, so they are the wrong tool for reusable templates and for \`logging\` calls; they must never be used to assemble SQL or shell commands; PEP 701 in 3.12 relaxed the quoting rules; and t-strings in 3.14 add the template-shaped version.`,
    examples: [
      {
        label: `Expressions, format specs, conversions, the = debug form and nested fields`,
        code: `# f-strings: any expression in {}, then an optional !conversion and :format_spec.
from datetime import date

name, qty, price = "widget", 7, 1234.5
print(f"{name} x{qty} = {qty * price}")  # widget x7 = 8641.5
print(f"{name.upper()} has {len(name)} letters")  # WIDGET has 6 letters

# Numbers: decimals, thousands separators, sign, percent, zero padding.
print(f"{price:.2f}")  # 1234.50
print(f"{price:,.2f}")  # 1,234.50
print(f"{qty:+d}")  # +7
print(f"{0.4567:.1%}")  # 45.7%
print(f"{42:05d}")  # 00042

# Bases: hex, binary, octal, with and without the prefix.
print(f"{255:x} {255:#x} {5:b} {5:08b} {8:o}")

# Alignment inside a fixed width: < left, > right, ^ centre, any fill char.
print(f"|{name:<10}|{name:>10}|{name:^10}|")
print(f"|{name:*^12}|")

# Conversions: !s is str(), !r is repr(), !a is ascii().
word = "café"
print(f"{word!s} {word!r} {word!a}")

# The = specifier prints the expression text too (debugging).
total = qty * price
print(f"{total=}")
print(f"{qty * price = :,.1f}")

# Nested replacement fields: the spec itself can come from variables.
width, digits = 10, 3
print(f"[{3.14159:{width}.{digits}f}]")

# Objects choose their own spec through __format__ (dates use strftime codes).
d = date(2026, 10, 17)
print(f"{d:%Y-%m-%d} is a {d:%A}")

# Literal braces are doubled.
print(f"{{name}} is written as {name}")`,
      },
      {
        label: `Eager evaluation, bytecode, __format__, logging cost and the 3.11 limits`,
        code: `# What an f-string really is: code that runs right now, where it is written.
import dis
import logging

# 1) Evaluated immediately, once. It is not a reusable template.
count = 1
msg = f"count is {count}"
count = 2
print(msg)  # count is 1
template = "count is {count}"
print(template.format(count=count))  # count is 2

# 2) The compiler turns an f-string into ordinary bytecode.
ops = [i.opname for i in dis.get_instructions(compile('f"{a}-{b!r:>5}"', "<f>", "eval"))]
print([op for op in ops if op != "RESUME"])

# 3) Each field calls format(value, spec), which calls type(value).__format__.
class Money:
    def __init__(self, cents):
        self.cents = cents
    def __format__(self, spec):
        amount = self.cents / 100
        return f"EUR {amount:,.2f}" if spec == "eur" else f"{amount:{spec}}"
    def __repr__(self):
        return f"Money({self.cents})"

m = Money(123456)
print(f"{m:eur} | {m:.1f} | {m!r}")
print(format(m, "eur") == f"{m:eur}")  # True

# 4) Eager evaluation costs work even when nobody reads the result.
class Expensive:
    renders = 0
    def __str__(self):
        Expensive.renders += 1
        return "big report"

log = logging.getLogger("demo")
log.setLevel(logging.WARNING)
item = Expensive()
log.debug(f"state: {item}")
print("after f-string debug():", Expensive.renders)
log.debug("state: %s", item)
print("after %s-style debug():", Expensive.renders)

# 5) Before Python 3.12 these are SyntaxErrors (this runs on 3.11).
snippets = [
    'f"{"nested same quotes"}"',
    r"""f'{"\\n".join(["a", "b"])}'""",
]
for src in snippets:
    try:
        compile(src, "<f>", "eval")
        print("OK         ", src)
    except SyntaxError as e:
        print("SyntaxError", src, "->", e.msg)`,
      },
      {
        label: `Python 3.12+ f-strings (PEP 701): same quotes, backslashes, comments`,
        runnable: false,
        python: "3.12",
        code: `# Python 3.12+ only (PEP 701). On 3.11 this whole file is a SyntaxError.
songs = ["Take Me Back", "Rain", "Lucy"]
user = {"name": "Ada", "langs": ["Python", "Go"]}

# 1) Reuse the same quote character inside the braces.
print(f"Hello {user["name"]}, you know {", ".join(user["langs"])}")

# 2) Backslashes are allowed in the expression part.
print(f"Playlist:\\n{"\\n".join(f"  - {s}" for s in songs)}")

# 3) An expression may span lines and hold comments.
total = f"{
    len(songs)  # how many songs
    * 3         # minutes each
} minutes"
print(total)

# 4) Nesting depth is no longer limited by the four quote styles.
print(f"{f"{f"{f"{f"{1 + 1}"}"}"}"}")`,
      },
    ],
  },
];

export default augments;
