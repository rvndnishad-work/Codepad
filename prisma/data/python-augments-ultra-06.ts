/**
 * PYTHON ULTRA — batch 06: Functions II — scope and closures. Every example was
 * run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the LEGB rule for scope resolution?`,
    difficulty: "medium",
    seoDescription: `Python's LEGB rule explained: how a name is looked up in Local, Enclosing, Global and Built-in scopes, and why the compiler decides it.`,
    description: `**Question presented to candidate:**
"When Python meets a name like \`total\` inside a function, how does it decide which variable you mean? Walk me through the LEGB rule and the cases where it surprises people."

**What a strong answer should cover:**
- The search order Local, Enclosing function, Global (module), Built-in; the first match wins and a miss raises \`NameError\`.
- Scope is decided at compile time: an assignment anywhere in a function makes the name local for the whole body, which is why reading it first raises \`UnboundLocalError\`.
- Only modules, functions, lambdas, comprehensions and class bodies create scopes; \`if\`, \`for\`, \`with\` and \`try\` blocks do not.
- Class bodies are skipped: a method cannot see class attributes as bare names, it must use \`self.x\` or \`ClassName.x\`.
- Reading follows LEGB, but rebinding an outer name needs \`global\` or \`nonlocal\`; shadowing a built-in such as \`list\` or \`len\` hides it.
- A CPython detail: the compiler emits \`LOAD_FAST\`, \`LOAD_DEREF\` or \`LOAD_GLOBAL\`, and \`LOAD_GLOBAL\` checks the module dict first and the builtins second.

**Code / implementation expected:** Optional — predict the output of a nested-function snippet, or explain the \`UnboundLocalError\` case.`,
    answer: `**Target Audience:** Python beginners and intermediate developers preparing for interviews — you only need to know what a function is.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

You walk into a big office block and shout "Sam!". First the people in your own room look up — if there is a Sam in the room, that is the Sam you meant. If not, the people on your floor answer. If there is no Sam on your floor either, the whole building is asked, and as a last resort you check the city phone book of well-known Sams. You stop at the **first** Sam you find, even if a "better" Sam exists further out. If nobody anywhere is called Sam, you get a blank stare.

Python does exactly this every time your code uses a name. Your room is the current function, the floor is any function wrapped around it, the building is the module (the \`.py\` file), and the city phone book is the set of built-in names like \`len\` and \`print\`. Almost every "why does Python see the wrong variable?" bug — \`UnboundLocalError\`, a shadowed \`list\`, a method that cannot see a class attribute — comes from not knowing this order, which is why interviewers ask it.

## 2. The Core Idea: Names, Namespaces and Scopes

A **name** is a label you attach to an object: \`total = 0\` attaches the label \`total\` to the integer object \`0\`.

📌 **Interview term: Name binding** — attaching a name to an object. Assignment, \`def\`, \`class\`, \`import\`, a \`for\` target and \`except ... as\` all bind names. (The full model is in [the name and object reference model](/interview-question/how-does-python-s-name-and-object-reference-model-work).)

📌 **Interview term: Namespace** — a mapping from names to objects. A module namespace is literally a dict you can look at with \`globals()\`.

📌 **Interview term: Scope** — the region of code where a namespace can be used directly, without a prefix like \`module.name\`.

📌 **Interview term: LEGB rule** — the order in which Python searches scopes to resolve a name it reads: **L**ocal, **E**nclosing, **G**lobal, **B**uilt-in.

| Letter | Scope | What lives there | Example |
| :--- | :--- | :--- | :--- |
| **L** | Local | Names bound inside the current function (including parameters) | \`x = "local x"\` inside \`local_wins()\` |
| **E** | Enclosing | Locals of any function that wraps the current one, innermost first | \`x = "enclosing x"\` in \`outer()\` |
| **G** | Global | Names bound at the top level of the module | \`x = "global x"\` |
| **B** | Built-in | Names from the \`builtins\` module, always available | \`len\`, \`print\`, \`range\`, \`ValueError\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Nested scopes: Local inside Enclosing inside Global inside Built-in">
  <rect class="d-box-muted" x="20" y="20" width="600" height="290" rx="14"/>
  <text class="d-text" x="44" y="50">B  Built-in</text>
  <text class="d-sub" x="200" y="50">len, print, range, ValueError</text>
  <rect class="d-box" x="70" y="72" width="500" height="220" rx="12"/>
  <text class="d-text" x="94" y="102">G  Global (the module)</text>
  <text class="d-sub" x="320" y="102">x = global x</text>
  <rect class="d-box-muted" x="120" y="124" width="400" height="150" rx="10"/>
  <text class="d-text" x="144" y="154">E  Enclosing: outer()</text>
  <text class="d-sub" x="360" y="154">x = enclosing x</text>
  <rect class="d-box-accent" x="170" y="176" width="300" height="80" rx="10"/>
  <text class="d-text d-accent" x="320" y="208" text-anchor="middle">L  Local: local_wins()</text>
  <text class="d-sub" x="320" y="236" text-anchor="middle">x = local x</text>
</svg>

Each box is a scope sitting inside the next one. A lookup starts in the innermost box (Local) and moves outwards, box by box, stopping at the first box that has the name.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Lookup order for a name that is read: Local, then Enclosing, then Global, then Built-in, else NameError">
  <defs>
    <marker id="py06-legb-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="110" height="80" rx="10"/>
  <text class="d-text" x="75" y="74" text-anchor="middle">Local</text>
  <text class="d-sub" x="75" y="98" text-anchor="middle">LOAD_FAST</text>
  <path class="d-edge" d="M 134 80 L 170 80" marker-end="url(#py06-legb-ar)"/>
  <rect class="d-box" x="174" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="239" y="74" text-anchor="middle">Enclosing</text>
  <text class="d-sub" x="239" y="98" text-anchor="middle">LOAD_DEREF</text>
  <path class="d-edge" d="M 308 80 L 344 80" marker-end="url(#py06-legb-ar)"/>
  <rect class="d-box" x="348" y="40" width="120" height="80" rx="10"/>
  <text class="d-text" x="408" y="74" text-anchor="middle">Global</text>
  <text class="d-sub" x="408" y="98" text-anchor="middle">module dict</text>
  <path class="d-edge" d="M 472 80 L 508 80" marker-end="url(#py06-legb-ar)"/>
  <rect class="d-box" x="512" y="40" width="110" height="80" rx="10"/>
  <text class="d-text" x="567" y="74" text-anchor="middle">Built-in</text>
  <text class="d-sub" x="567" y="98" text-anchor="middle">builtins</text>
  <path class="d-edge-dashed" d="M 626 80 L 662 80" marker-end="url(#py06-legb-ar)"/>
  <rect class="d-box-muted" x="666" y="40" width="80" height="80" rx="10"/>
  <text class="d-text" x="706" y="86" text-anchor="middle">NameError</text>
</svg>

The labels under each box are the CPython bytecode instructions that do the lookup; section 3 shows them from a real run.

## 3. The Big Surprise: Scope Is Decided Before the Code Runs

Python compiles each function to bytecode before running it. While compiling, it scans the whole function body: **if a name is bound anywhere in the function, it is local for the entire function** — even on the lines before the assignment.

📌 **Interview term: Compile-time scoping (static or lexical scoping)** — which scope a name belongs to is fixed by where it is written in the source, not by what happens while the code runs.

So this function fails even though a global \`counter\` exists:

~~~python
counter = 0

def read_then_assign():
    value = counter + 1   # counter is LOCAL here, and still empty
    counter = value
    return counter
~~~

The real run (example 2) prints:

~~~text
UnboundLocalError: cannot access local variable 'counter' where it is not associated with a value
is it a NameError? True
~~~

📌 **Interview term: UnboundLocalError** — raised when code reads a local variable before it has been given a value. It is a subclass of \`NameError\`. Python never "falls back" to the global; the compiler already decided.

You can see the decision in the bytecode with the \`dis\` module. On our 3.11 run, \`read_only\` used \`LOAD_GLOBAL\` for \`counter\`, while \`read_then_assign\` used \`LOAD_FAST\` — the instruction for a local slot:

~~~text
read_only: [('LOAD_GLOBAL', 'counter')]
read_then_assign: [('LOAD_FAST', 'counter'), ('LOAD_FAST', 'value'), ('LOAD_FAST', 'counter')]
~~~

On 3.12 and 3.13 the same first read of \`counter\` compiled to \`LOAD_FAST_CHECK\` instead — a variant the compiler uses when it cannot prove the local already has a value, which is exactly the check that raises the error. Either way the name is local, never global.

| Classification | Bytecode for a read (3.11) | Where the value comes from |
| :--- | :--- | :--- |
| Local | \`LOAD_FAST\` | A fixed slot in the running frame — fastest |
| Enclosing (free variable) | \`LOAD_DEREF\` | A **cell** shared with the outer function (see [closures](/interview-question/how-do-closures-capture-variables-in-python)) |
| Global or built-in | \`LOAD_GLOBAL\` | Module dict first, then the \`builtins\` module |

📌 **Interview term: Free variable** — a name used in a function but bound in an enclosing function. The \`symtable\` module reports it as free; in example 2, \`b\` in \`inner()\` is free, \`c\` is local, and \`a\` and \`len\` are "global or builtin".

Note that the compiler cannot tell a global from a built-in — both become \`LOAD_GLOBAL\`, and the G-then-B decision happens at run time by checking two dicts. How bytecode is executed is covered in [how CPython executes your code](/interview-question/how-does-cpython-execute-your-code).

## 4. What Creates a Scope — and What Does Not

People coming from C, Java or JavaScript \`let\` expect every \`{ }\` block to be a scope. In Python, **only these create a new scope**: the module, a \`def\` function, a \`lambda\`, a comprehension or generator expression, and a class body.

\`if\`, \`for\`, \`while\`, \`with\` and \`try\` do **not**. So a \`for\` loop variable is still bound after the loop (example 1 prints \`loop_var after the loop: 2\`), while the variable of a [comprehension](/interview-question/what-are-list-dict-set-comprehensions) does not leak (\`comp_var defined? False\`).

One deliberate exception: the name bound by \`except SomeError as err\` is deleted when the \`except\` block ends, so \`err\` is gone afterwards (\`err defined? False\`). Python does this so the exception, which holds its traceback and every frame in it, is not kept alive by accident.

## 5. The Class-Body Exception

A class body runs once, top to bottom, in its own namespace. But that namespace is **not an Enclosing scope** for functions defined inside it. So a method that says \`scale\` skips the class and looks in the module:

~~~text
method: NameError: name 'scale' is not defined
~~~

Write \`self.scale\` or \`Config.scale\` instead. The same rule hits comprehensions in a class body: the **outermost** iterable (\`range(scale)\`) is evaluated in the class body and works, but the comprehension body runs in its own scope and cannot see \`scale\`:

~~~text
comprehension body in a class: NameError: name 'scale' is not defined
~~~

Python 3.12 changed how list, dict and set comprehensions are compiled — they are now inlined into the surrounding code instead of being separate functions ([PEP 709](https://peps.python.org/pep-0709/)). We ran example 2 on 3.12 and 3.13 as well: the class-body comprehension still raised the same \`NameError\`, so the visible scoping rule did not change.

## 6. Built-ins and Shadowing

The B scope is the \`builtins\` module. Assigning a module-level name with the same spelling **shadows** it for the whole module:

📌 **Interview term: Shadowing** — a name in an inner scope hides the same name in an outer scope. The outer object still exists, it is just no longer reachable by that bare name.

Example 1 sets \`len = lambda obj: "shadowed"\`, gets \`shadowed len: shadowed\`, then runs \`del len\` — which removes the module-level name — and the built-in is visible again (\`after del: 3\`). The classic real bug is \`list = [1, 2, 3]\` at the top of a script, after which \`list("abc")\` raises \`TypeError: 'list' object is not callable\`.

## 7. Reading vs Rebinding

LEGB describes how a name is **read**. Writing is different: an assignment always binds in the **local** scope unless the function declares otherwise.

| You want to... | Inside a function, write | Needs a keyword? |
| :--- | :--- | :--- |
| Read a global or enclosing name | \`print(total)\` | No |
| Mutate the object an outer name points to | \`items.append(1)\` | No |
| Rebind a module-level name | \`global total\` then \`total = 5\` | Yes, \`global\` |
| Rebind a name in the enclosing function | \`nonlocal count\` then \`count += 1\` | Yes, \`nonlocal\` |

Both keywords have their own page: [what global and nonlocal do](/interview-question/what-do-the-global-and-nonlocal-keywords-do).

## 8. History in One Paragraph

The E in LEGB did not always exist. Early Python had only three namespaces (local, global, built-in), so a nested function could not see its outer function variables. [PEP 227](https://legacy.python.org/dev/peps/pep-0227/) added statically nested scopes: opt-in with \`from __future__ import nested_scopes\` in Python 2.1 and the default from 2.2. Rebinding an enclosing name had to wait for the \`nonlocal\` keyword in Python 3.0 ([PEP 3104](https://peps.python.org/pep-3104/)).

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page Pyodide 0.25.1 harness; the output was identical. We also ran them on 3.12 and 3.13: example 1 and the scoping results of example 2 matched; only the exact bytecode list can differ between versions.

**Example 1 — LEGB in action:**

~~~text
('local x', 'enclosing x')
global x
3
True
NameError: name 'not_defined_anywhere' is not defined
shadowed len: shadowed
after del: 3
loop_var after the loop: 2
comp_var defined? False
err defined? False
~~~

**Example 2 — compile time decides:**

~~~text
1
UnboundLocalError: cannot access local variable 'counter' where it is not associated with a value
is it a NameError? True
read_only: [('LOAD_GLOBAL', 'counter')]
read_then_assign: [('LOAD_FAST', 'counter'), ('LOAD_FAST', 'value'), ('LOAD_FAST', 'counter')]
   a -> global or builtin
   b -> free (from the enclosing function)
   c -> local
 len -> global or builtin
method: NameError: name 'scale' is not defined
[0, 1, 2]
comprehension body in a class: NameError: name 'scale' is not defined
~~~

## 10. Common Pitfalls

- **Reading a global, then assigning to it in the same function.** The assignment makes it local everywhere in the function, so the earlier read raises \`UnboundLocalError\`. Use a parameter and a return value, or \`global\` if you really must.
- **\`x += 1\` counts as an assignment.** Augmented assignment rebinds, so it also makes \`x\` local — the most common way people hit \`UnboundLocalError\` with counters.
- **Bare class attributes inside methods.** \`scale\` inside a method is looked up in L, E, G, B — never in the class body. Use \`self.scale\`.
- **Shadowing built-ins.** Variables named \`list\`, \`dict\`, \`id\`, \`type\`, \`input\`, \`sum\` or \`len\` break later calls in that module. Linters flag this; pick \`items\`, \`user_id\` and so on.
- **Expecting block scope.** A variable assigned in an \`if\` or \`for\` block is a normal local of the function; if the branch did not run, reading it later raises \`UnboundLocalError\` (inside a function) or \`NameError\` (at module level).
- **Forgetting the late-binding consequence.** Enclosing variables are read when the inner function runs, not when it is created — the root of the [late-binding loop pitfall](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops).

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">When code reads a name, Python looks in <strong style="color:#ffca28;">L</strong>ocal, then <strong style="color:#ffca28;">E</strong>nclosing functions, then <strong style="color:#ffca28;">G</strong>lobal (the module), then <strong style="color:#ffca28;">B</strong>uilt-ins, and uses the first match; a miss is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NameError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Decided at compile time:</strong> <span style="color:#f0e2c8;">Any assignment in a function (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except as</code>) makes that name local for the whole body, so reading it before the assignment raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnboundLocalError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What makes a scope:</strong> <span style="color:#f0e2c8;">Modules, functions, lambdas, comprehensions and class bodies. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> blocks do not, so a loop variable is still there after the loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The class exception:</strong> <span style="color:#f0e2c8;">Methods skip the class body: inside a method, write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.scale</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Config.scale</code>, never a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scale</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reading vs writing:</strong> <span style="color:#f0e2c8;">LEGB is the read path. To rebind an outer name you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code>; and do not shadow built-ins like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">print(x)</code> fail if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x = 1</code> comes later in the same function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler sees the assignment and marks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> local for the whole function; it emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_FAST</code>, finds the slot empty and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnboundLocalError</code>, a subclass of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NameError</code>. It never falls back to the global.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Python tell a global from a built-in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not decide at compile time: both compile to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code>. At run time that opcode checks the module dict first, then the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">builtins</code> module. That is why a module-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len = ...</code> hides the built-in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a method see a class attribute without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">self</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The class body runs once as its own namespace, but functions defined in it do not treat it as an enclosing scope. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.attr</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClassName.attr</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code> loop variable leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop variable stays bound after the loop because loops are not scopes. A comprehension variable does not leak, because a comprehension has its own scope.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can you see how a name was classified?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dis</code> to look at the opcodes (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_FAST</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_DEREF</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code>) or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">symtable</code> module, which reports whether each symbol is local, free or global.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Name binding** | Attaching a name to an object (assignment, \`def\`, \`import\`, \`for\`, \`except as\`) |
| **Namespace** | A mapping of names to objects, such as the module dict \`globals()\` |
| **Scope** | The region of code where a namespace is used directly |
| **LEGB rule** | Read lookup order: Local, Enclosing, Global, Built-in |
| **Compile-time scoping** | The compiler fixes each name as local, free or global before the code runs |
| **UnboundLocalError** | Reading a local before it has a value; subclass of \`NameError\` |
| **Free variable** | A name used in a function but bound in an enclosing function |
| **Shadowing** | An inner name hiding an outer one with the same spelling |

---
**Conclusion:** When Python reads a name it searches Local, Enclosing, Global and Built-in scopes in that order and takes the first match. The part that trips people up is that the compiler decides which scope a name belongs to by scanning the whole function: one assignment anywhere makes the name local everywhere in that function, which is exactly what \`UnboundLocalError\` reports. Add the two exceptions — blocks are not scopes, and class bodies are skipped by methods — and you can predict any scoping puzzle an interviewer writes on the board, then move on to rebinding with [global and nonlocal](/interview-question/what-do-the-global-and-nonlocal-keywords-do) and to [closures](/interview-question/how-do-closures-capture-variables-in-python).`,
    examples: [
      {
        label: `LEGB in action: the four scopes, shadowing, and what is not a scope`,
        code: `import builtins

x = "global x"

def outer():
    x = "enclosing x"

    def local_wins():
        x = "local x"
        return x

    def enclosing_wins():
        return x

    return local_wins(), enclosing_wins()

def global_wins():
    return x

print(outer())
print(global_wins())  # global x
print(len("abc"))  # 3
print(builtins.len is len)  # True

# Not found in L, E, G or B
def missing():
    return not_defined_anywhere

try:
    missing()
except NameError as e:
    print("NameError:", e)

# A module-level name shadows the built-in for the whole module
len = lambda obj: "shadowed"
print("shadowed len:", len("abc"))
del len
print("after del:", len("abc"))

# Blocks are not scopes: the for-loop variable survives the loop,
# but a comprehension has its own scope
for loop_var in range(3):
    pass
squares = [comp_var * comp_var for comp_var in range(3)]
print("loop_var after the loop:", loop_var)
print("comp_var defined?", "comp_var" in globals())

# The name bound by "except ... as err" is deleted when the block ends
try:
    1 / 0
except ZeroDivisionError as err:
    pass
print("err defined?", "err" in globals())
`,
      },
      {
        label: `Compile time decides: UnboundLocalError, dis, symtable and class bodies`,
        code: `import dis
import symtable

counter = 0

def read_only():
    return counter + 1

def read_then_assign():
    value = counter + 1   # the compiler already made counter LOCAL
    counter = value
    return counter

print(read_only())  # 1
try:
    read_then_assign()
except UnboundLocalError as e:
    print("UnboundLocalError:", e)
    print("is it a NameError?", isinstance(e, NameError))

def loads(func):
    wanted = ("LOAD_FAST", "LOAD_DEREF", "LOAD_GLOBAL")
    return [(i.opname, i.argval) for i in dis.get_instructions(func) if i.opname in wanted]

print("read_only:", loads(read_only))
print("read_then_assign:", loads(read_then_assign))

# Ask the compiler how it classified every name in inner()
source = """
a = 1
def outer():
    b = 2
    def inner():
        c = 3
        return a + b + c + len("x")
    return inner
"""
table = symtable.symtable(source, "<demo>", "exec")
inner = table.get_children()[0].get_children()[0]
for sym in sorted(inner.get_symbols(), key=lambda s: s.get_name()):
    if sym.is_local():
        kind = "local"
    elif sym.is_free():
        kind = "free (from the enclosing function)"
    else:
        kind = "global or builtin"
    print(f"{sym.get_name():>4} -> {kind}")

# Class bodies are not an enclosing scope for the code inside them
class Config:
    scale = 10

    def method(self):
        try:
            return scale
        except NameError as e:
            return "method: NameError: " + str(e)

    # the OUTERMOST iterable is evaluated in the class body, so this works
    first = [k for k in range(scale)][:3]

print(Config().method())
print(Config.first)  # [0, 1, 2]
try:
    class Broken:
        scale = 10
        values = [scale * k for k in range(3)]
except NameError as e:
    print("comprehension body in a class: NameError:", e)
`,
      },
    ],
  },
  {
    title: `What do the global and nonlocal keywords do?`,
    difficulty: "medium",
    seoDescription: `What Python's global and nonlocal keywords do: rebinding module and enclosing names, mutation vs rebinding, and the SyntaxErrors they raise.`,
    description: `**Question presented to candidate:**
"Inside a function, how do you change a variable that was defined outside it? Explain what \`global\` and \`nonlocal\` do and when you would — or would not — use them."

**What a strong answer should cover:**
- Assignment inside a function binds a local name by default; \`global x\` makes assignments rebind the module-level \`x\`, and \`nonlocal x\` rebinds \`x\` in the nearest enclosing function.
- The difference between rebinding a name (needs a keyword) and mutating the object it points to (\`items.append(1)\` needs none); \`x += 1\` is a rebinding.
- \`nonlocal\` requires an existing binding in an enclosing function (never the module) and is checked at compile time; \`global\` can even create a new module name.
- They are declarations for the whole function body: using the name before the declaration is a \`SyntaxError\`, and a parameter cannot also be declared global or nonlocal.
- Design trade-offs: \`global\` hides shared state and is not thread safe on its own; prefer parameters and return values, a class, or a closure with \`nonlocal\` for private state.

**Code / implementation expected:** Optional — a counter with \`nonlocal\`, or spotting the \`UnboundLocalError\` in a function that does \`total += n\`.`,
    answer: `**Target Audience:** Python beginners and intermediate developers preparing for interviews — you should know what a function and a nested function are.
**Difficulty:** Medium
**Python version:** Behaviour and error messages checked on CPython 3.11, 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

Picture a shared office whiteboard in the hallway and a small notepad on your own desk. When you are at your desk and write "meeting at 3", it goes on **your notepad** by default — you do not walk out and scribble on the hallway board just because it also has a "meeting" line. You can still **read** the hallway board any time. If you really want to change the hallway board, you have to say so on purpose: "I am going to the hallway board."

A Python function works the same way. Reading an outside variable just works ([the LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution)). But writing \`total = 5\` inside a function writes on the function's own notepad — a new **local** variable. \`global\` and \`nonlocal\` are how you say "I mean the board outside".

## 2. The Default: Assignment Is Local

📌 **Interview term: Rebinding** — making an existing name point at a different object (\`total = total + 5\`). Any assignment, augmented assignment (\`+=\`), \`for\` target, \`import\` or \`def\` rebinds.

📌 **Interview term: Mutation** — changing the object itself, in place, without touching which object the name points to (\`log.append("a")\`, \`config["debug"] = True\`).

Python decides at compile time that any name **rebound** inside a function is local to that function. That is why example 1 shows:

~~~text
after reset_wrong: ['a', 'b']
~~~

\`reset_wrong\` did \`log = []\`, which created a brand-new local \`log\` and threw it away; the global list was never touched. Meanwhile \`record\` could call \`log.append(msg)\` with no keyword at all, because appending is mutation, not rebinding.

## 3. global — Rebind a Module-Level Name

📌 **Interview term: global statement** — a declaration, \`global name\`, that makes every use of \`name\` in the current function refer to the module namespace, so assignments rebind the module-level name.

~~~python
total = 0

def add_global(n):
    global total
    total += n
~~~

After \`add_global(5)\` and \`add_global(10)\` the module \`total\` is \`15\`. Three details worth saying out loud:

- \`global\` can **create** a module name that did not exist yet (\`created_inside\` in example 1).
- \`global\` always means the **module**, no matter how deeply the function is nested (\`to_module()\` in example 1 skips two enclosing functions).
- In the bytecode, the reads and writes become \`LOAD_GLOBAL\` and \`STORE_GLOBAL\` (example 2).

## 4. nonlocal — Rebind a Name in the Enclosing Function

📌 **Interview term: nonlocal statement** — a declaration, \`nonlocal name\`, that makes \`name\` refer to the binding in the nearest enclosing **function** scope, so assignments rebind that variable instead of creating a local.

~~~python
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment
~~~

Each call of \`make_counter()\` creates a new \`count\`, and the returned function keeps updating its own copy — the run printed \`tick: 1 2 3\` and then \`a fresh counter starts again at: 1\`. The variable lives in a **cell** shared by the two functions; how that works is in [how closures capture variables](/interview-question/how-do-closures-capture-variables-in-python). In bytecode, \`nonlocal\` turns the accesses into \`LOAD_DEREF\` and \`STORE_DEREF\`.

\`nonlocal\` was added in Python 3.0 by [PEP 3104](https://peps.python.org/pep-3104/); before that, Python code could read names in enclosing scopes but could only rebind local or module-global names.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="Where assignments go: a plain assignment stays local, nonlocal goes to the enclosing function, global goes to the module">
  <defs>
    <marker id="py06-gn-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="80" rx="10"/>
  <text class="d-text" x="145" y="52" text-anchor="middle">module namespace</text>
  <text class="d-sub" x="145" y="78" text-anchor="middle">x = module</text>
  <rect class="d-box" x="20" y="140" width="250" height="80" rx="10"/>
  <text class="d-text" x="145" y="172" text-anchor="middle">enclosing function</text>
  <text class="d-sub" x="145" y="198" text-anchor="middle">x = level2</text>
  <rect class="d-box-accent" x="20" y="260" width="250" height="64" rx="10"/>
  <text class="d-text" x="145" y="298" text-anchor="middle">inner function locals</text>
  <rect class="d-box" x="440" y="20" width="260" height="80" rx="10"/>
  <text class="d-text" x="570" y="52" text-anchor="middle">global x</text>
  <text class="d-sub" x="570" y="78" text-anchor="middle">STORE_GLOBAL</text>
  <rect class="d-box" x="440" y="140" width="260" height="80" rx="10"/>
  <text class="d-text" x="570" y="172" text-anchor="middle">nonlocal x</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">STORE_DEREF</text>
  <rect class="d-box" x="440" y="260" width="260" height="64" rx="10"/>
  <text class="d-text" x="570" y="286" text-anchor="middle">no declaration</text>
  <text class="d-sub" x="570" y="310" text-anchor="middle">STORE_FAST</text>
  <path class="d-edge-accent" d="M 436 60 L 276 60" marker-end="url(#py06-gn-ar)"/>
  <path class="d-edge-accent" d="M 436 180 L 276 180" marker-end="url(#py06-gn-ar)"/>
  <path class="d-edge" d="M 436 292 L 276 292" marker-end="url(#py06-gn-ar)"/>
</svg>

Read each row from the right: the declaration inside the inner function decides which namespace an assignment \`x = ...\` writes to, and which bytecode instruction does the write.

## 5. The Rules the Compiler Enforces

Both keywords are **declarations**, not run-time statements: they apply to the whole function body and are checked when the code is compiled. Example 2 compiles a set of broken snippets and prints the exact \`SyntaxError\` messages:

| Mistake | Message on 3.11, 3.12 and 3.13 |
| :--- | :--- |
| \`nonlocal\` at module level | \`nonlocal declaration not allowed at module level\` |
| \`nonlocal x\` with no \`x\` in an enclosing function | \`no binding for nonlocal 'x' found\` |
| \`nonlocal x\` when \`x\` only exists as a module global | \`no binding for nonlocal 'x' found\` |
| \`nonlocal y\` where \`y\` is a class attribute | \`no binding for nonlocal 'y' found\` (class bodies are not enclosing scopes) |
| Using \`x\` before \`global x\` | \`name 'x' is used prior to global declaration\` |
| Parameter \`x\` declared \`global x\` | \`name 'x' is parameter and global\` |
| Both \`global x\` and \`nonlocal x\` | \`name 'x' is nonlocal and global\` |

Because the check happens at compile time, the whole module fails to import — you cannot "catch" these at run time in the same file.

## 6. Comparison: global vs nonlocal

| | \`global x\` | \`nonlocal x\` |
| :--- | :--- | :--- |
| Rebinds \`x\` in | The module namespace | The nearest enclosing function |
| Name must already exist? | No — it can create it | Yes — checked at compile time |
| Allowed at module level? | Yes, but it does nothing useful | No, \`SyntaxError\` |
| Bytecode for reads and writes | \`LOAD_GLOBAL\` / \`STORE_GLOBAL\` | \`LOAD_DEREF\` / \`STORE_DEREF\` |
| Typical good use | Rare: module-level caches or settings in small scripts | Private closure state: counters, decorators |
| Needed to mutate a list or dict? | No | No |

## 7. When Not to Use Them

\`global\` makes a function depend on, and change, state that anything in the module can also change. That makes the function harder to test and reason about. Better options, roughly in order:

- **Pass values in and return values out** — \`total = add(total, 5)\`.
- **Use a class** when several functions share the state — \`self.total += n\`.
- **Use a closure with \`nonlocal\`** when one function owns small private state. For anything bigger, the class is easier to read.

Shared state is also where threads collide: example 2 shows that \`hits += 1\` under \`global\` is several separate instructions (\`LOAD_GLOBAL\`, then \`STORE_GLOBAL\`), so two threads can interleave between the load and the store. Protect it with a lock — see [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it).

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output; the \`SyntaxError\` messages and the keyword behaviour were the same on 3.12 and 3.13.

**Example 1 — global vs nonlocal:**

~~~text
15
tick: 1 2 3
a fresh counter starts again at: 1
after reset_wrong: ['a', 'b']
after reset_right: []
UnboundLocalError: cannot access local variable 'log' where it is not associated with a value
made in a function
('set by nonlocal', 'level1')
set by global
~~~

**Example 2 — compile-time rules and bytecode (3.11):**

~~~text
nonlocal at module level         -> SyntaxError: nonlocal declaration not allowed at module level
nonlocal with no outer binding   -> SyntaxError: no binding for nonlocal 'x' found
nonlocal to a module global      -> SyntaxError: no binding for nonlocal 'x' found
nonlocal to a class attribute    -> SyntaxError: no binding for nonlocal 'y' found
used before global               -> SyntaxError: name 'x' is used prior to global declaration
parameter declared global        -> SyntaxError: name 'x' is parameter and global
both nonlocal and global         -> SyntaxError: name 'x' is nonlocal and global
valid nonlocal                   -> compiles fine
global   : ['LOAD_GLOBAL', 'STORE_GLOBAL']
nonlocal : ['LOAD_DEREF', 'STORE_DEREF']
~~~

## 9. Common Pitfalls

- **Thinking \`+=\` is mutation for every type.** For a list, \`log += ["x"]\` does extend in place, but it is still an assignment to the name, so without \`global\` the function raises \`UnboundLocalError\` before anything happens.
- **Using \`global\` to "fix" \`UnboundLocalError\` everywhere.** It silences the error by making the function edit shared state; usually the real fix is a parameter and a return value.
- **Expecting \`nonlocal\` to reach the module.** It only searches enclosing functions. Module names need \`global\`.
- **Declaring after use.** \`global x\` or \`nonlocal x\` must come before any use of \`x\` in that function, or the module fails to compile.
- **Forgetting that \`global\` creates names.** A typo like \`global totl\` followed by \`totl = 1\` quietly creates a new module variable instead of failing.
- **Reaching for \`nonlocal\` to fix the [late-binding loop bug](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops).** That bug is about *when* a captured variable is read, not about rebinding it; \`nonlocal\` does not help.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The default:</strong> <span style="color:#f0e2c8;">Assigning to a name inside a function creates a <strong style="color:#ffca28;">local</strong> name, even if the same name exists outside. Reading falls back through LEGB; writing does not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. global:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global total</code> tells the compiler that every assignment to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> in this function rebinds the <strong style="color:#ffca28;">module-level</strong> name. It can even create it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. nonlocal:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal count</code> rebinds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> in the <strong style="color:#ffca28;">nearest enclosing function</strong>. The name must already exist there (not in the module, not in a class body), checked at compile time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rebind vs mutate:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items.append(x)</code> mutates the object and needs no keyword. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items = []</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items += [x]</code> rebinds the name and does.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The judgement:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global</code> is a smell for shared mutable state; prefer parameters and return values or a class. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code> is the normal tool for private state in a closure, like a counter or a decorator.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">total += n</code> raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UnboundLocalError</code> without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">global</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> is an assignment, so the compiler makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> local for the whole function. The read half of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> then finds the local empty. Declaring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global total</code> fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nonlocal</code> to reach a module variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The module scope does not count; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal x</code> with only a global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError: no binding for nonlocal 'x' found</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global</code> for module names.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">global counter; counter += 1</code> thread safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. It compiles to separate load, add and store steps (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code> ... <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STORE_GLOBAL</code>), so two threads can interleave between them. Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.Lock</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nonlocal</code> the right answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a closure owns small private state: a counter, a running total, a decorator that counts calls. If the state grows, or several functions share it, a small class is clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">global</code> inside a nested function refer to the enclosing function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global</code> always means the module namespace, even three functions deep. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code> targets enclosing functions.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rebinding** | Pointing a name at a different object (\`=\`, \`+=\`, \`for\`, \`import\`, \`def\`) |
| **Mutation** | Changing an object in place (\`append\`, item assignment) |
| **global statement** | Declares that a name in this function means the module-level name |
| **nonlocal statement** | Declares that a name in this function means the binding in the nearest enclosing function |

---
**Conclusion:** By default, a name you assign inside a function is local to it; that is a compile-time decision, and it is why \`total += n\` fails with \`UnboundLocalError\` when \`total\` is a global. \`global\` redirects assignments to the module namespace and \`nonlocal\` redirects them to the nearest enclosing function, which must already have the name. Neither keyword is needed to mutate an object, only to rebind a name. In an interview, show that you know the mechanism, the compile-time rules and the design judgement: \`nonlocal\` is the normal tool for closure state, while \`global\` is usually a sign that a parameter, a return value or a class would be cleaner.`,
    examples: [
      {
        label: `global vs nonlocal, and mutation vs rebinding`,
        code: `total = 0

def add_global(n):
    global total
    total += n

add_global(5)
add_global(10)
print(total)  # 15

def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

tick = make_counter()
print("tick:", tick(), tick(), tick())
other = make_counter()
print("a fresh counter starts again at:", other())

# Mutating the object needs no keyword; rebinding the name does
log = []
def record(msg):
    log.append(msg)
def reset_wrong():
    log = []          # creates a NEW local; the global is untouched
def reset_right():
    global log
    log = []

record("a")
record("b")
reset_wrong()
print("after reset_wrong:", log)
reset_right()
print("after reset_right:", log)

# += is a rebinding, even on a list
def extend_wrong():
    log += ["x"]
try:
    extend_wrong()
except UnboundLocalError as e:
    print("UnboundLocalError:", e)

# global can create a module-level name from inside a function
def create():
    global created_inside
    created_inside = "made in a function"
create()
print(created_inside)  # made in a function

# nonlocal picks the NEAREST enclosing function; global jumps to the module
x = "module"
def level1():
    x = "level1"
    def level2():
        x = "level2"
        def to_nearest():
            nonlocal x
            x = "set by nonlocal"
        def to_module():
            global x
            x = "set by global"
        to_nearest()
        to_module()
        return x
    return level2(), x

print(level1())
print(x)  # set by global
`,
      },
      {
        label: `The compile-time rules, and the bytecode each keyword produces`,
        code: `import dis

cases = {
    "nonlocal at module level": "nonlocal x\\n",
    "nonlocal with no outer binding": "def f():\\n    def g():\\n        nonlocal x\\n",
    "nonlocal to a module global": "x = 1\\ndef f():\\n    nonlocal x\\n",
    "nonlocal to a class attribute": (
        "def f():\\n    class C:\\n        y = 1\\n"
        "        def m(self):\\n            nonlocal y\\n"
    ),
    "used before global": "def f():\\n    print(x)\\n    global x\\n",
    "parameter declared global": "def f(x):\\n    global x\\n",
    "both nonlocal and global": (
        "def o():\\n    x = 1\\n    def f():\\n        global x\\n        nonlocal x\\n"
    ),
    "valid nonlocal": "def o():\\n    x = 1\\n    def f():\\n        nonlocal x\\n        x = 2\\n",
}
for label, source in cases.items():
    try:
        compile(source, "<demo>", "exec")
        print(f"{label:32} -> compiles fine")
    except SyntaxError as e:
        print(f"{label:32} -> SyntaxError: {e.msg}")

# What the keywords change in the bytecode
hits = 0
def bump_global():
    global hits
    hits += 1

def outer():
    hits = 0
    def bump_enclosing():
        nonlocal hits
        hits += 1
    return bump_enclosing

def names(func):
    keep = ("LOAD_GLOBAL", "STORE_GLOBAL", "LOAD_DEREF", "STORE_DEREF", "LOAD_FAST", "STORE_FAST")
    return [i.opname for i in dis.get_instructions(func) if i.opname in keep]

print("global   :", names(bump_global))
print("nonlocal :", names(outer()))
`,
      },
    ],
  },
  {
    title: `How do closures capture variables in Python?`,
    difficulty: "medium",
    seoDescription: `How Python closures capture variables through shared cell objects: __closure__, co_freevars, nonlocal, late binding and real uses.`,
    description: `**Question presented to candidate:**
"What is a closure in Python, and what exactly does the inner function capture — the value of the outer variable, or something else? Show me how you would prove it."

**What a strong answer should cover:**
- A closure is a function that keeps access to variables of the enclosing function after that function has returned.
- Python captures the **variable**, not a snapshot of its value: the variable lives in a **cell** object shared by the outer function and every inner function that uses it.
- The inspection points: \`outer.__code__.co_cellvars\`, \`inner.__code__.co_freevars\`, \`inner.__closure__\` and \`cell.cell_contents\`; a function with no free variables has \`__closure__\` of \`None\`.
- Reading a captured variable needs nothing; rebinding it needs \`nonlocal\`. Each call of the outer function makes new cells.
- Globals are not captured at all, and late binding means the value is read when the inner function runs — the source of the loop pitfall.
- Real uses: function factories, decorators, callbacks and small private state; the closure keeps the captured objects alive.

**Code / implementation expected:** Yes — a factory or counter closure, ideally with \`__closure__\` inspected to show the shared cell.`,
    answer: `**Target Audience:** Python beginners and intermediate developers preparing for interviews — you should know what a nested function is.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

A bakery owner hires a new delivery driver and, before going home, hands over a backpack containing the shop key and a note: "today's discount: 10%". The owner leaves; the driver keeps working all evening, using the key and the note from the backpack. Now the twist: the backpack is shared. If the owner phones in and changes the note to "20%", the driver sees 20% at the next delivery — the driver did not get a photocopy of the note, they got access to the **same** note.

A Python closure is that driver. The outer function is the owner who returns and goes home; the inner function keeps working with the outer variables, which travel with it in a shared "backpack". Understanding that the backpack holds the **variable itself**, not a photocopy of its value, explains decorators, function factories, the \`nonlocal\` keyword and one of Python's most famous bugs.

## 2. The Core Idea

📌 **Interview term: Closure** — a function object together with the variables it uses from the enclosing function, kept alive after that enclosing function has returned.

~~~python
def make_multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
double(5)   # 10 -- make_multiplier has long returned, yet factor is still there
~~~

📌 **Interview term: Free variable** — a name used in a function but bound in an enclosing function (\`factor\` inside \`multiply\`). The [LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution) calls this the E scope.

📌 **Interview term: Cell variable** — the same variable seen from the outer side: a local of \`make_multiplier\` that some inner function uses, so the compiler stores it in a cell instead of an ordinary local slot.

## 3. The Mechanism: Cells

A normal local variable lives in a slot inside the running function's frame and disappears when the function returns. When the compiler sees that an inner function uses a local, it stores that variable in a small separate object instead.

📌 **Interview term: Cell object** — a tiny CPython object with one field, \`cell_contents\`, that holds a reference to the current value. The outer function and every inner function that uses the variable share the **same** cell.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="get and bump both hold the same cell, and the cell points to the current value of count">
  <defs>
    <marker id="py06-cl-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="210" height="90" rx="10"/>
  <text class="d-text" x="125" y="64" text-anchor="middle">get</text>
  <text class="d-sub" x="125" y="92" text-anchor="middle">__closure__[0]</text>
  <rect class="d-box" x="20" y="180" width="210" height="90" rx="10"/>
  <text class="d-text" x="125" y="214" text-anchor="middle">bump</text>
  <text class="d-sub" x="125" y="242" text-anchor="middle">__closure__[0]</text>
  <rect class="d-box-accent" x="320" y="105" width="160" height="90" rx="10"/>
  <text class="d-text d-accent" x="400" y="140" text-anchor="middle">cell</text>
  <text class="d-sub" x="400" y="168" text-anchor="middle">cell_contents</text>
  <rect class="d-box-muted" x="570" y="115" width="130" height="70" rx="10"/>
  <text class="d-text" x="635" y="156" text-anchor="middle">int 3</text>
  <path class="d-edge-accent" d="M 234 80 L 316 132" marker-end="url(#py06-cl-ar)"/>
  <path class="d-edge-accent" d="M 234 222 L 316 170" marker-end="url(#py06-cl-ar)"/>
  <path class="d-edge" d="M 484 150 L 566 150" marker-end="url(#py06-cl-ar)"/>
</svg>

Both inner functions point at one cell, and the cell points at whatever object \`count\` is bound to right now. \`bump\` rebinds \`count\` by replacing what the cell points to, so \`get\` sees the new value on its next call.

Example 1 makes every part visible:

| What you inspect | Result on our run | Meaning |
| :--- | :--- | :--- |
| \`make_counter.__code__.co_cellvars\` | \`('count',)\` | The outer function stores \`count\` in a cell |
| \`get.__code__.co_freevars\` | \`('count',)\` | \`get\` uses \`count\` from outside |
| \`type(get.__closure__[0]).__name__\` | \`cell\` | The closure is a tuple of cell objects |
| \`get.__closure__[0] is bump.__closure__[0]\` | \`True\` | Both inner functions share one cell |
| \`c1_get.__closure__[0] is c2_get.__closure__[0]\` | \`False\` | Each call of \`make_counter()\` creates fresh cells |

The bytecode tells the same story. On our 3.11 run the outer function starts with \`MAKE_CELL\` and passes the cells on with \`LOAD_CLOSURE\`; the inner function starts with \`COPY_FREE_VARS\` and reads and writes the value with \`LOAD_DEREF\` and \`STORE_DEREF\`:

~~~text
make_counter: ['MAKE_CELL', 'STORE_DEREF', 'LOAD_CLOSURE', 'LOAD_CLOSURE']
get: ['COPY_FREE_VARS', 'LOAD_DEREF']
bump: ['COPY_FREE_VARS', 'LOAD_DEREF', 'STORE_DEREF']
~~~

On 3.13 the \`LOAD_CLOSURE\` instructions no longer appear in that list (our 3.13 run showed \`make_counter: ['MAKE_CELL', 'STORE_DEREF']\`), so treat exact opcode lists as a version detail; the cell objects and attributes are the same on 3.11, 3.12 and 3.13.

## 4. Captured Variable, Not Captured Value

Because the inner function reads through the cell **when it runs**, it sees the variable's latest value:

~~~python
def make_greeter():
    greeting = "hello"
    def greet(name):
        return greeting + ", " + name
    greeting = "goodbye"     # rebinding after the def
    return greet
~~~

\`make_greeter()("Ada")\` returns \`goodbye, Ada\`. 📌 **Interview term: Late binding** — the value of a free variable is looked up at call time, not at definition time. This is exactly why lambdas created in a loop all see the loop variable's final value: see [the late-binding closure pitfall in loops](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops).

The flip side: if the inner function runs before the outer function has assigned the variable, the cell is still empty, and you get the run-time error shown at the end of example 2:

~~~text
NameError: cannot access free variable 'message' where it is not associated with a value in enclosing scope
~~~

## 5. Reading, Mutating and Rebinding a Captured Variable

- **Reading** (\`return count\`) — needs nothing.
- **Mutating** the captured object (\`cache[n] = value\`, \`items.append(x)\`) — needs nothing; the memoize decorator in example 2 does this.
- **Rebinding** the name (\`count += 1\`) — needs \`nonlocal count\`; without it the assignment makes \`count\` a new local of the inner function and the read part fails with \`UnboundLocalError\`. Details in [global and nonlocal](/interview-question/what-do-the-global-and-nonlocal-keywords-do).

## 6. What Is Not Captured

- **Globals.** \`reads_global\` uses the module name \`SITE\`; its \`__closure__\` is \`None\` and changing \`SITE\` later changes what it returns (\`v2\`). Globals are looked up by name in the module dict on each call.
- **Values of default arguments.** A default like \`def f(x=factor)\` is evaluated once when the \`def\` runs and stored on the function (\`f.__defaults__\`) — that is not a closure, and it is the standard fix for late binding.
- **Class attributes.** Class bodies are not enclosing scopes, so a method never closes over a class attribute.

## 7. Where Closures Show Up in Real Code

| Use | What the closure holds | Example |
| :--- | :--- | :--- |
| Function factory | Configuration | \`make_multiplier(3)\` |
| Decorator | The wrapped function and private state | \`memoize\`, [decorators](/interview-question/what-are-decorators-in-python), [decorator factories](/interview-question/what-is-a-decorator-factory-a-decorator-with-arguments) |
| Callback | Context for later, such as an id or a label | GUI button handlers, \`sorted(key=...)\` built from a parameter |
| Small private state | A counter or a running total | \`make_counter()\` with \`nonlocal\` |

Closure vs class: a closure is a lightweight object with exactly one behaviour. The cell plays the role of an instance attribute. When you need several methods, a readable \`repr\`, or more than a couple of fields, write a class instead.

## 8. Lifetime: Closures Keep Objects Alive

The cell holds a normal strong reference. In example 2, a \`Resource\` created inside \`holder()\` is still alive after \`holder()\` returns, because \`use\` captured it. Only when \`use\` is deleted do the function, its closure tuple and the cell go away, and the \`Resource\` with them (CPython frees it immediately when its reference count reaches zero; a [weak reference](/interview-question/what-is-a-weak-reference-in-python) lets us watch this without keeping it alive):

~~~text
alive after holder() returned? True
closure still works: Resource
alive after the closure is deleted? False
~~~

So a long-lived callback that captured a large object keeps that object in memory — a common source of "leaks" in event-driven code.

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output. On 3.12 and 3.13 everything matched except the opcode lists noted in section 3.

**Example 1 — inside a closure:**

~~~text
('count',)
('count',)
cell
True
3
3
goodbye, Ada
None None
v2
independent counters: 1 0
False
make_counter: ['MAKE_CELL', 'STORE_DEREF', 'LOAD_CLOSURE', 'LOAD_CLOSURE']
get: ['COPY_FREE_VARS', 'LOAD_DEREF']
bump: ['COPY_FREE_VARS', 'LOAD_DEREF', 'STORE_DEREF']
~~~

**Example 2 — closures at work:**

~~~text
10 15
2
[9, 9, 16, 9]
real calls: [3, 4]
closure holds: ('cache', 'func')
alive after holder() returned? True
closure still works: Resource
alive after the closure is deleted? False
NameError: cannot access free variable 'message' where it is not associated with a value in enclosing scope
set later
~~~

## 10. Common Pitfalls

- **Believing closures copy values.** They share the variable through a cell; later rebindings in the outer function are visible inside.
- **Building closures in a loop and expecting each to remember its own loop value.** They share one cell and all see the last value — the late-binding pitfall.
- **Forgetting \`nonlocal\` for \`count += 1\`.** Without it the inner function gets an \`UnboundLocalError\`.
- **Expecting \`__closure__\` to show globals.** Module names are never captured; changing the global changes the function behaviour.
- **Capturing heavy objects in long-lived callbacks.** The closure keeps them alive; capture only what you need, such as an id instead of a whole request.
- **Using a closure where a class is clearer.** Three or more pieces of state or several operations on them deserve a class.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A closure is an inner function that keeps using variables of its enclosing function after that function has returned, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">make_multiplier(2)</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiply</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What is captured:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">variable</strong>, not its value. CPython moves it into a <strong style="color:#ffca28;">cell</strong> object; the outer function and every inner function that uses it share that one cell.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to prove it:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outer.__code__.co_cellvars</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inner.__code__.co_freevars</code> list the names, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inner.__closure__[0].cell_contents</code> shows the live value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rules:</strong> <span style="color:#f0e2c8;">Reading a captured name needs nothing; rebinding it needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code>. Each call of the outer function creates new cells, and globals are never captured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">Values are read when the inner function runs, which causes the late-binding loop bug; and captured objects stay alive as long as the closure does.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the outer variable changes after the inner function is created, which value does the inner function see?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The latest one. Both functions share the cell, so the inner function reads whatever the cell holds at call time. A rebinding after the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> is visible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__closure__</code> on a function that captures nothing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>. Only functions with free variables get a tuple of cells. A function that reads a module global also has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, because globals are looked up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code> at call time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a closure different from a class with one method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea, different syntax: the cell plays the role of the instance attribute. A closure is lighter for one behaviour and a little private state; a class is better when you need several methods, introspection or many fields.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a closure cause a memory leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can keep large objects alive. The cell holds a strong reference, so a long-lived callback that captured a big list or a request object keeps it in memory until the callback itself is dropped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you change a captured value without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nonlocal</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can <strong style="color:#ffca28;">mutate</strong> the captured object (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache[n] = ...</code>) without it. Rebinding the name needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code>. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cell_contents</code> directly also works but is only for debugging tools.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Closure** | A function plus the enclosing-function variables it keeps using |
| **Free variable** | A name used in a function but bound in an enclosing function |
| **Cell variable** | An outer local that inner functions use, stored in a cell |
| **Cell object** | CPython object holding one reference (\`cell_contents\`), shared by outer and inner functions |
| **Late binding** | A free variable is read when the inner function runs, not when it is defined |

---
**Conclusion:** A Python closure is an inner function that carries a tuple of cell objects in \`__closure__\`, one per free variable, and those cells are shared with the outer function and with every other inner function that uses the same variable. That single fact explains everything an interviewer will probe: the inner function sees the latest value (late binding), rebinding needs \`nonlocal\`, mutation does not, each factory call gets fresh cells, globals are not captured, and captured objects live as long as the closure. Prove it with \`co_freevars\`, \`__closure__\` and \`cell_contents\`, and you have shown you understand the mechanism rather than a memorised definition.`,
    examples: [
      {
        label: `Look inside a closure: cells, co_freevars and __closure__`,
        code: `import dis

def make_counter():
    count = 0
    def get():
        return count
    def bump():
        nonlocal count
        count += 1
    return get, bump

get, bump = make_counter()
print(make_counter.__code__.co_cellvars)  # ('count',)
print(get.__code__.co_freevars)  # ('count',)
print(type(get.__closure__[0]).__name__)  # cell
print(get.__closure__[0] is bump.__closure__[0])  # True

bump()
bump()
bump()
print(get())  # 3
print(get.__closure__[0].cell_contents)  # 3

# Captured: the VARIABLE. A rebinding after the def is visible.
def make_greeter():
    greeting = "hello"
    def greet(name):
        return greeting + ", " + name
    greeting = "goodbye"
    return greet

print(make_greeter()("Ada"))  # goodbye, Ada

# No free variables means no closure; globals are never captured
SITE = "v1"
def plain():
    return 42
def reads_global():
    return SITE
print(plain.__closure__, reads_global.__closure__)
SITE = "v2"
print(reads_global())  # v2

# Every call of the factory creates fresh cells
c1_get, c1_bump = make_counter()
c2_get, c2_bump = make_counter()
c1_bump()
print("independent counters:", c1_get(), c2_get())
print(c1_get.__closure__[0] is c2_get.__closure__[0])  # False

def cell_ops(func):
    keep = {"MAKE_CELL", "COPY_FREE_VARS", "LOAD_CLOSURE", "LOAD_DEREF", "STORE_DEREF"}
    return [i.opname for i in dis.get_instructions(func) if i.opname in keep]

print("make_counter:", cell_ops(make_counter))
print("get:", cell_ops(get))
print("bump:", cell_ops(bump))
`,
      },
      {
        label: `Closures at work: factories, a memoizing decorator, lifetime`,
        code: `import weakref

# 1. Function factory: configuration baked into the function
def make_multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5), triple(5))
print(double.__closure__[0].cell_contents)  # 2

# 2. Decorator: the wrapper closes over func and a private cache
def memoize(func):
    cache = {}
    def wrapper(n):
        if n not in cache:
            cache[n] = func(n)
        return cache[n]
    return wrapper

calls = []

@memoize
def slow_square(n):
    calls.append(n)
    return n * n

print([slow_square(n) for n in (3, 3, 4, 3)])
print("real calls:", calls)
print("closure holds:", slow_square.__code__.co_freevars)

# 3. A closure keeps captured objects alive after the outer call returns
class Resource:
    pass

def holder():
    res = Resource()
    probe = weakref.ref(res)
    def use():
        return type(res).__name__
    return use, probe

use, probe = holder()
print("alive after holder() returned?", probe() is not None)
print("closure still works:", use())
del use
print("alive after the closure is deleted?", probe() is not None)

# 4. An empty cell: the inner function runs before the variable is set
def too_early():
    def show():
        return message
    try:
        show()
    except NameError as e:
        print(type(e).__name__ + ":", e)
    message = "set later"
    return show()

print(too_early())
`,
      },
    ],
  },
  {
    title: `What is the late-binding closure pitfall in loops?`,
    difficulty: "medium",
    seoDescription: `Why lambdas made in a Python loop all return the last value, proof that they share one cell, and the fixes: default args, factories, partial.`,
    description: `**Question presented to candidate:**
"What does \`[f() for f in [lambda: i for i in range(3)]]\` return, and why? How would you fix it?"

**What a strong answer should cover:**
- The output is \`[2, 2, 2]\`: each lambda captures the variable \`i\`, not its value, and reads it when called, after the loop has finished.
- The mechanism: all the functions share one cell for \`i\` (provable with \`__closure__\`); at module level there is no cell at all, they read the global \`i\`.
- It affects any function created in a loop (\`def\` handlers, callbacks), not only lambdas and comprehensions.
- Fixes: a default argument \`lambda i=i: i\`, a factory function that takes \`i\` as a parameter, or \`functools.partial\`; trade-offs of each (a default can be overridden by callers).
- A default argument snapshots the object, not its contents: capturing a mutable list still shares it.

**Code / implementation expected:** Yes — predict the output, then show at least one fix and explain why it works.`,
    answer: `**Target Audience:** Python beginners and intermediate developers preparing for interviews — you should know what a lambda and a list comprehension are.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

A teacher hands three pupils a sticky note each that says "your number is whatever is on the board". She writes 0 on the board while giving out the first note, 1 for the second and 2 for the third. At the end of the day each pupil reads their note, looks at the board — and all three see 2. Nobody got the number that was on the board when they received the note; they all got **instructions to look at the board later**.

That is the late-binding pitfall. A function created in a loop does not remember the loop value of that moment; it remembers where to look, and it looks when it is called. It is one of the most common Python interview puzzles because it tests whether you really understand [how closures capture variables](/interview-question/how-do-closures-capture-variables-in-python).

## 2. The Puzzle

~~~python
fns = [lambda: i for i in range(3)]
print([f() for f in fns])
~~~

Most people expect \`[0, 1, 2]\`. The real output:

~~~text
[2, 2, 2]
~~~

📌 **Interview term: Late binding** — a free variable in a function is looked up when the function **runs**, not when it is **defined**. Python closures are late binding.

📌 **Interview term: Early binding** — the value is fixed when the function is created. Python only does this for default argument values.

## 3. Why It Happens: One Shared Cell

The lambdas use \`i\`, which belongs to the enclosing scope (the function \`build()\` in example 1, or the comprehension in the one-liner above). The compiler stores that \`i\` in a single **cell object**, and every lambda created in the loop gets a reference to that **same** cell. The loop keeps rebinding the cell: 0, then 1, then 2. When you finally call the lambdas, they all read the cell and find 2.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Three lambdas all point to one shared cell for i, which holds 2 after the loop">
  <defs>
    <marker id="py06-lb-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="58" text-anchor="middle">fns[0]</text>
  <rect class="d-box" x="20" y="118" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="156" text-anchor="middle">fns[1]</text>
  <rect class="d-box" x="20" y="216" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="254" text-anchor="middle">fns[2]</text>
  <rect class="d-box-accent" x="310" y="105" width="150" height="90" rx="10"/>
  <text class="d-text d-accent" x="385" y="142" text-anchor="middle">one cell: i</text>
  <text class="d-sub" x="385" y="170" text-anchor="middle">rebound 0, 1, 2</text>
  <rect class="d-box-muted" x="560" y="115" width="120" height="70" rx="10"/>
  <text class="d-text" x="620" y="156" text-anchor="middle">int 2</text>
  <path class="d-edge-accent" d="M 194 52 L 306 128" marker-end="url(#py06-lb-ar)"/>
  <path class="d-edge-accent" d="M 194 150 L 306 150" marker-end="url(#py06-lb-ar)"/>
  <path class="d-edge-accent" d="M 194 248 L 306 172" marker-end="url(#py06-lb-ar)"/>
  <path class="d-edge" d="M 464 150 L 556 150" marker-end="url(#py06-lb-ar)"/>
</svg>

Three function objects, one cell. By the time any of them is called, the cell points at the last value the loop assigned.

Example 1 proves it: \`fns[0].__closure__[0] is fns[2].__closure__[0]\` prints \`True\`, and the shared cell \`cell_contents\` is \`2\`.

### At module level there is not even a cell

If the loop runs at the top of a module, the loop variable is a **global**. The lambdas have no closure at all (\`__closure__\` is \`None\`); they look up the global name on every call. So after the loop, rebinding that global changes every result:

~~~text
None
before k changes: [2, 2, 2]
[99, 99, 99]
~~~

Same bug, slightly different mechanism — and a reminder that "it captures the variable" is the right mental model in both cases.

## 4. It Is Not About Lambdas

The same thing happens with \`def\` inside a loop, which is how this usually shows up in real code — handlers or callbacks registered in a loop:

~~~python
handlers = {}
for name in ["save", "load"]:
    def handler():
        return "handling " + name
    handlers[name] = handler

handlers["save"]()   # 'handling load'
~~~

GUI button callbacks, event listeners, \`asyncio\` callbacks scheduled in a loop and a dict of command handlers all hit it.

## 5. The Generator Expression That Seems to Work

~~~text
[0, 1, 2]
[2, 2, 2]
~~~

The first line comes from \`[f() for f in (lambda: m for m in range(3))]\`. A generator expression is lazy: it creates one lambda, the outer comprehension calls it **immediately**, and only then does the generator advance \`m\`. So each lambda reads \`m\` while it still holds "its" value. The second line wraps the generator in \`list(...)\`, which creates all three lambdas first — and the bug is back. The lesson: the result depends on **when** the function is called, which is the definition of late binding. (Laziness itself is covered in [generators](/interview-question/what-are-generators-and-why-use-them).)

## 6. The Fixes

Every fix does the same thing: give each function its **own** binding, fixed at creation time.

📌 **Interview term: Function factory** — a function whose job is to build and return another function; each call has a fresh scope, so each returned closure gets its own cell.

📌 **Interview term: functools.partial** — wraps a function together with some arguments already filled in, stored on the partial object as \`.args\` and \`.keywords\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="With a default argument each lambda stores its own value 0, 1 and 2">
  <defs>
    <marker id="py06-lb-ar2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="230" height="64" rx="10"/>
  <text class="d-text" x="135" y="58" text-anchor="middle">lambda i=i  (first)</text>
  <rect class="d-box" x="20" y="118" width="230" height="64" rx="10"/>
  <text class="d-text" x="135" y="156" text-anchor="middle">lambda i=i  (second)</text>
  <rect class="d-box" x="20" y="216" width="230" height="64" rx="10"/>
  <text class="d-text" x="135" y="254" text-anchor="middle">lambda i=i  (third)</text>
  <rect class="d-box-accent" x="380" y="20" width="300" height="64" rx="10"/>
  <text class="d-text" x="530" y="58" text-anchor="middle">__defaults__ = (0,)</text>
  <rect class="d-box-accent" x="380" y="118" width="300" height="64" rx="10"/>
  <text class="d-text" x="530" y="156" text-anchor="middle">__defaults__ = (1,)</text>
  <rect class="d-box-accent" x="380" y="216" width="300" height="64" rx="10"/>
  <text class="d-text" x="530" y="254" text-anchor="middle">__defaults__ = (2,)</text>
  <path class="d-edge-accent" d="M 254 52 L 376 52" marker-end="url(#py06-lb-ar2)"/>
  <path class="d-edge-accent" d="M 254 150 L 376 150" marker-end="url(#py06-lb-ar2)"/>
  <path class="d-edge-accent" d="M 254 248 L 376 248" marker-end="url(#py06-lb-ar2)"/>
</svg>

With \`i=i\`, the right-hand \`i\` is evaluated when each lambda is created, and the value is stored on that function object. There is nothing shared left to go stale.

| Fix | Code | Why it works | Trade-off |
| :--- | :--- | :--- | :--- |
| Default argument | \`lambda i=i: i\` | Defaults are evaluated once, at creation, into \`__defaults__\` | The function signature changes: a caller can pass \`f(42)\` and override it |
| Keyword-only default | \`lambda *, i=i: i\` | Same, but it cannot be overridden by position | Still visible in the signature |
| Factory function | \`def make(i): return lambda: i\` | Each \`make()\` call has its own scope and its own cell | One extra helper function |
| \`functools.partial\` | \`partial(show, i)\` | The argument is stored on the partial object (\`.args\`) | Needs a named function to wrap |

Example 2 runs all four. The default-argument fix printed \`caller can override it: 42\` — harmless for a private helper, a real bug risk for a public callback API. In an interview, name the default-argument trick (everyone expects it) and then mention the factory or \`partial\` as the cleaner option.

### The snapshot gotcha

A default argument stores a reference to an **object**, evaluated once — the same rule that makes [mutable default arguments dangerous](/interview-question/why-is-using-a-mutable-default-argument-dangerous). If that object is a list that keeps changing, every function still sees the changes:

~~~text
[['a', 'b'], ['a', 'b']]
[('a',), ('a', 'b')]
~~~

The first line used \`lambda s=seen: list(s)\` and both callbacks share the one \`seen\` list. The second used \`lambda s=tuple(seen): s\`, which takes an immutable copy at creation time.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output, and gave the same output on 3.12 and 3.13.

**Example 1 — the bug:**

~~~text
[2, 2, 2]
True
2
[2, 2, 2]
handling load
None
before k changes: [2, 2, 2]
[99, 99, 99]
[0, 1, 2]
[2, 2, 2]
~~~

**Example 2 — the fixes:**

~~~text
[0, 1, 2]
caller can override it: 42
[0, 1, 2]
False
[0, 1, 2]
(1,)
[0, 1, 2]
positional override rejected
[['a', 'b'], ['a', 'b']]
[('a',), ('a', 'b')]
~~~

## 8. Common Pitfalls

- **Thinking it is a lambda quirk.** Any function created in a loop and called later has the problem, including \`def\` handlers and methods bound in a loop.
- **"Fixing" it with \`nonlocal\` or \`global\`.** Those control rebinding, not when a value is read; they do not give each function its own value.
- **Testing with a generator expression and concluding there is no bug.** A lazy loop that calls each function immediately hides it; the bug appears as soon as the functions are collected first.
- **Leaving \`i=i\` in a public API.** Callers can pass an argument and silently override the captured value; use a keyword-only default, a factory or \`partial\`.
- **Snapshotting a mutable object.** \`lambda s=items:\` still shares the list; copy it (\`tuple(items)\`) if you need the contents at that moment.
- **Confusing it with comprehension scope.** A comprehension variable does not leak into the enclosing scope, but closures created inside a comprehension still share its one variable.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The output:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[lambda: i for i in range(3)]</code> called afterwards gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1, 2]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">A closure captures the <strong style="color:#ffca28;">variable</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, not its value. The lambdas read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> when they are called, and by then the loop has finished with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i == 2</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The proof:</strong> <span style="color:#f0e2c8;">All three functions share one cell: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fns[0].__closure__[0] is fns[2].__closure__[0]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. At module level there is no cell; they read the global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fixes:</strong> <span style="color:#f0e2c8;">Bind the value at creation time: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lambda i=i: i</code>, a factory <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">make(i)</code> that returns the lambda, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.partial(show, i)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">A default argument can be overridden by a caller and only snapshots the object; a factory or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> is cleaner for public callbacks, and a tuple copy is needed for mutable data.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the generator expression version print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[0, 1, 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each lambda is created and called before the generator advances, so it reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m</code> while it still has that value. Wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(...)</code> first and you get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code> again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this only a lambda problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> inside a loop behaves the same way; the example registers handlers for save and load and both report <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handling load</code>. Any function created in a loop and called later is affected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i=i</code> trick work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Default values are evaluated once, when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lambda</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> expression runs, and stored in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__defaults__</code>. Each iteration creates a new function with its own stored value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nonlocal</code> fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code> is about rebinding a captured variable, but the problem is that all functions read the same variable. You need a separate binding per function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does this bite in real code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Callbacks registered in a loop: GUI button handlers, event listeners, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code> callbacks, or a dict of command handlers. Every callback ends up using the last item.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Late binding** | A free variable is looked up when the function runs |
| **Early binding** | The value is fixed when the function is created (Python: default arguments) |
| **Function factory** | A function that builds and returns a new function, one fresh scope per call |
| **functools.partial** | A function with some arguments pre-filled and stored on the object |

---
**Conclusion:** Functions created in a loop all return the last value because a Python closure captures the loop **variable** — one shared cell, or a global at module level — and reads it when the function is called, long after the loop has finished. Proving it with \`__closure__\` shows you understand the mechanism. The fix is always to give each function its own binding at creation time: a default argument (\`i=i\`, ideally keyword-only), a factory function, or \`functools.partial\`, remembering that a default only snapshots the object, so mutable data needs a copy.`,
    examples: [
      {
        label: `The bug, and proof that every closure shares one cell`,
        code: `def build():
    fns = []
    for i in range(3):
        fns.append(lambda: i)
    return fns

fns = build()
print([f() for f in fns])  # [2, 2, 2]
# All three lambdas hold the SAME cell, and it ends at 2
print(fns[0].__closure__[0] is fns[2].__closure__[0])  # True
print(fns[0].__closure__[0].cell_contents)  # 2

# Same bug in a comprehension
comp = [lambda: n for n in range(3)]
print([f() for f in comp])  # [2, 2, 2]

# Same bug with def, not only lambda
handlers = {}
for name in ["save", "load"]:
    def handler():
        return "handling " + name
    handlers[name] = handler
print(handlers["save"]())  # handling load

# At module level the loop variable is a GLOBAL: no cell at all
module_fns = []
for k in range(3):
    module_fns.append(lambda: k)
print(module_fns[0].__closure__)  # None
print("before k changes:", [f() for f in module_fns])
k = 99
print([f() for f in module_fns])  # [99, 99, 99]

# A generator expression HIDES the bug: each lambda is called before the loop moves on
print([f() for f in (lambda: m for m in range(3))])  # [0, 1, 2]
# Collect the same lambdas first and the bug is back
print([f() for f in list(lambda: m for m in range(3))])  # [2, 2, 2]
`,
      },
      {
        label: `Four fixes and the trade-offs of each`,
        code: `from functools import partial

# Fix 1: default argument, evaluated once when each lambda is created
default_arg = [lambda i=i: i for i in range(3)]
print([f() for f in default_arg])  # [0, 1, 2]
print("caller can override it:", default_arg[0](42))

# Fix 2: a factory function, each call has its own scope and cell
def make(i):
    return lambda: i

factory = [make(i) for i in range(3)]
print([f() for f in factory])  # [0, 1, 2]
print(factory[0].__closure__[0] is factory[1].__closure__[0])  # False

# Fix 3: functools.partial stores the argument on the partial object
def show(i):
    return i

partials = [partial(show, i) for i in range(3)]
print([f() for f in partials])  # [0, 1, 2]
print(partials[1].args)  # (1,)

# Fix 1b: keyword-only default, so it cannot be overridden by position
kwonly = [lambda *, i=i: i for i in range(3)]
print([f() for f in kwonly])  # [0, 1, 2]
try:
    kwonly[0](5)
except TypeError:
    print("positional override rejected")

# Gotcha: a default snapshots the OBJECT, not its contents
snapshots = []
seen = []
for word in ["a", "b"]:
    seen.append(word)
    snapshots.append(lambda s=seen: list(s))
print([f() for f in snapshots])  # [['a', 'b'], ['a', 'b']]

frozen = []
seen = []
for word in ["a", "b"]:
    seen.append(word)
    frozen.append(lambda s=tuple(seen): s)
print([f() for f in frozen])  # [('a',), ('a', 'b')]
`,
      },
    ],
  },
  {
    title: `How does Python's name and object reference model work?`,
    difficulty: "medium",
    seoDescription: `Python names are labels bound to objects: assignment never copies, aliasing, rebinding vs mutation, += on lists and ints, refcounts and del.`,
    description: `**Question presented to candidate:**
"People say Python has no variables, only names. What does that mean? Explain what happens in memory when you write \`a = [1, 2]\` and then \`b = a\`."

**What a strong answer should cover:**
- Every value is an object with an identity, a type and a value; a name is a label in a namespace that refers to an object. Assignment binds a name and never copies.
- Aliasing: two names can refer to one object, so a mutation through one is visible through the other; \`is\` and \`id()\` compare identity.
- Rebinding a name (\`a = a + [3]\`) vs mutating the object (\`a.append(3)\`); \`+=\` mutates lists in place but rebinds for immutable types like \`int\` and \`tuple\`.
- Function calls bind parameters to the caller's objects ("call by sharing"), so mutation is visible to the caller and rebinding is not.
- \`del\` removes a name, not an object; CPython frees the object when its reference count reaches zero, and \`sys.getrefcount\` shows the count (with caveats such as immortal objects in 3.12+).
- Classic traps: \`[[0] * 3] * 2\` shares rows, and \`t[0] += [x]\` on a tuple both mutates the list and raises \`TypeError\`.

**Code / implementation expected:** Optional — predict output of an aliasing snippet, using \`is\` or \`id()\` to explain it.`,
    answer: `**Target Audience:** Python beginners and intermediate developers preparing for interviews — you only need to know basic assignment and lists.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

In many languages a variable is a **box**: \`x = 5\` puts the number 5 into a box called \`x\`, and \`y = x\` copies the 5 into a second box. Python does not work like that. In Python, values are **balloons** floating around, and names are **luggage tags on strings** tied to balloons. \`a = [1, 2]\` creates a balloon and ties a tag \`a\` to it. \`b = a\` does not make a new balloon; it ties a second tag, \`b\`, to the **same** balloon. Pop or paint the balloon through either tag and both tags see the change. Move the \`a\` tag to another balloon, and \`b\` is unaffected.

Nearly every surprising Python bug about "my list changed by itself" — [mutable default arguments](/interview-question/why-is-using-a-mutable-default-argument-dangerous), shared grid rows, functions that change their caller's data — is this model in disguise. Get the model right and those bugs become predictable.

## 2. Objects

📌 **Interview term: Object** — every value in Python (numbers, strings, lists, functions, classes, modules) is an object with three things:

| Part | What it is | How to see it | Can it change? |
| :--- | :--- | :--- | :--- |
| **Identity** | Which object it is; in CPython its memory address | \`id(obj)\`, compared with \`is\` | Never, for the object lifetime |
| **Type** | What it is and what it can do | \`type(obj)\` | No (in practice) |
| **Value** | Its contents | \`repr(obj)\`, compared with \`==\` | Only for mutable types |

Whether the value can change is the split between [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python). Even functions and classes are objects: example 1 shows \`say = greet\` makes a second name for the same function object (\`say is greet\` is \`True\`, and it still reports \`__name__\` as \`greet\`).

## 3. Names and Binding

📌 **Interview term: Name** — an identifier such as \`first\` or \`data\`. A name has no type and holds no value itself; it refers to an object.

📌 **Interview term: Binding** — the link from a name to an object, stored in a namespace. The global namespace of a module is a real dict: example 1 shows \`globals()["data"] is data\` is \`True\`. Where names are looked up is the [LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution).

📌 **Interview term: Assignment binds, never copies** — \`b = a\` evaluates the right side to an object and binds \`b\` to that same object. Copying only happens when you ask for it (\`list(a)\`, \`a.copy()\`, \`copy.deepcopy(a)\` — see [shallow vs deep copy](/interview-question/what-is-the-difference-between-shallow-and-deep-copy)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="After alias equals first, two names refer to one list object">
  <defs>
    <marker id="py06-nm-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="66" text-anchor="middle">first</text>
  <rect class="d-box" x="20" y="140" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="176" text-anchor="middle">alias</text>
  <rect class="d-box-accent" x="360" y="70" width="250" height="90" rx="10"/>
  <text class="d-text d-accent" x="485" y="106" text-anchor="middle">list object</text>
  <text class="d-sub" x="485" y="134" text-anchor="middle">[1, 2, 3, 4]</text>
  <path class="d-edge-accent" d="M 164 60 L 356 100" marker-end="url(#py06-nm-ar)"/>
  <path class="d-edge-accent" d="M 164 170 L 356 130" marker-end="url(#py06-nm-ar)"/>
</svg>

Two names, one object. \`alias.append(4)\` changed the object, so \`first\` shows the 4 as well.

## 4. Rebinding vs Mutation

This distinction is the whole game.

📌 **Interview term: Mutation** — changing an object in place (\`append\`, \`extend\`, item or attribute assignment). Every name bound to that object sees it.

📌 **Interview term: Rebinding** — pointing a name at a different object (\`first = first + [5]\`). Only that one name moves; other names and the old object are untouched.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After first equals first plus five, first points to a new list while alias keeps the old one">
  <defs>
    <marker id="py06-nm-ar2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="66" text-anchor="middle">first</text>
  <rect class="d-box" x="20" y="170" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="206" text-anchor="middle">alias</text>
  <rect class="d-box-accent" x="360" y="20" width="250" height="80" rx="10"/>
  <text class="d-text d-accent" x="485" y="52" text-anchor="middle">new list object</text>
  <text class="d-sub" x="485" y="80" text-anchor="middle">[1, 2, 3, 4, 5]</text>
  <rect class="d-box-muted" x="360" y="160" width="250" height="80" rx="10"/>
  <text class="d-text" x="485" y="192" text-anchor="middle">original list object</text>
  <text class="d-sub" x="485" y="220" text-anchor="middle">[1, 2, 3, 4]</text>
  <path class="d-edge-accent" d="M 164 60 L 356 60" marker-end="url(#py06-nm-ar2)"/>
  <path class="d-edge" d="M 164 200 L 356 200" marker-end="url(#py06-nm-ar2)"/>
</svg>

\`first + [5]\` built a brand-new list, and the assignment moved only the \`first\` tag. The run printed \`still the same object? False\`.

### The += twist

\`x += y\` calls \`x.__iadd__(y)\` if the type has it, and then **always rebinds** \`x\` to the result. Lists implement \`__iadd__\` by extending themselves and returning themselves, so the name ends up on the same object — an in-place mutation that every alias sees. Ints, strings and tuples have no in-place version, so \`+=\` creates a new object and rebinds:

~~~text
[1, 2] True
11 10
~~~

That "mutate, then rebind" order is also why \`t[0] += [3]\` on a tuple first extends the list and **then** raises \`TypeError\` when it tries to store the result back into the tuple (example 2).

## 5. Function Calls Use the Same Rule

Calling \`mutate(data)\` binds the parameter name \`param\` to the caller's object. Mutating through \`param\` is visible to the caller (\`after mutate(): ['orig', 'mutated']\`); rebinding \`param\` inside the function is not (\`after rebind(): ['orig']\`).

📌 **Interview term: Call by sharing (call by object reference)** — arguments are passed by binding parameters to the same objects; neither "pass by value" nor "pass by reference" in the C++ sense. The full discussion is in [is Python pass-by-value or pass-by-reference?](/interview-question/is-python-pass-by-value-or-pass-by-reference)

## 6. Identity: is and id()

📌 **Interview term: Identity** — whether two names refer to the very same object, tested with \`is\`. In CPython \`id()\` returns the memory address, so two live objects never share an \`id\`.

\`==\` asks a different question — "are the values equal?" — and the difference is its own question: [\`==\` vs \`is\`](/interview-question/what-is-the-difference-between-and-is). Do not use \`is\` to compare numbers or strings: whether two equal small values are the same object depends on CPython caching, covered in [small integer caching](/interview-question/why-does-python-cache-small-integers) and [string interning](/interview-question/what-is-string-interning-in-python).

## 7. Lifetime: del and Reference Counting

📌 **Interview term: Reference count** — CPython keeps a counter on every object of how many references point to it. When it drops to zero, the object is freed immediately.

\`del name\` removes a **name** from its namespace and drops one reference; it does not destroy the object if anything else still refers to it. Example 2 uses a \`weakref\` (a reference that does not count) to watch a \`Node\` survive \`del node\` because \`other_name\` still points at it, and disappear the moment \`other_name\` is rebound:

~~~text
alive with one name left? True
alive after the last name is rebound? False
~~~

\`sys.getrefcount(obj)\` shows the count, but the call itself adds a temporary reference, so compare before and after (the run printed \`refcount went up by 1\`). Absolute numbers are not stable across versions: on 3.11 \`sys.getrefcount(None)\` printed a real, changing count (3729 in our one-line run), while on 3.12 and 3.13 it printed 4294967295, because \`None\` became an **immortal object** whose count is fixed and never changes ([PEP 683](https://peps.python.org/pep-0683/)). Reference cycles, which never reach zero on their own, are cleaned up by the cycle collector — see [memory management and garbage collection](/interview-question/how-does-python-manage-memory-and-garbage-collection) and [del, \`__del__\` and garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection).

## 8. The Classic Traps

| Code | What people expect | What happens | Why |
| :--- | :--- | :--- | :--- |
| \`grid = [[0] * 3] * 2; grid[0][0] = 9\` | One cell changes | \`[[9, 0, 0], [9, 0, 0]]\` | \`* 2\` repeats a reference to one inner list |
| \`a = b = []; a.append("x")\` | \`b\` stays empty | \`b\` is \`['x']\` | Chained assignment binds both names to one object |
| \`t = ([1, 2],); t[0] += [3]\` | Either works or fails cleanly | Raises \`TypeError\` **and** the list is \`[1, 2, 3]\` | \`+=\` mutates the list, then the tuple store fails |
| \`def f(items): items = []\` | Caller list is cleared | Caller list unchanged | Rebinding a parameter is local |
| \`def f(x=[])\` | Fresh list each call | One list shared by every call | The default object is created once |

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output, and gave the same output on 3.12 and 3.13. The \`sys.getrefcount(None)\` numbers in section 7 were printed by a separate one-line run on each interpreter and are not part of an example, because they differ by version.

**Example 1 — names, objects and aliasing:**

~~~text
same object? True
first sees it: [1, 2, 3, 4]
after rebinding: [1, 2, 3, 4, 5] [1, 2, 3, 4]
still the same object? False
[1, 2] True
11 10
after rebind(): ['orig']
after mutate(): ['orig', 'mutated']
True
dict
data still a name? False
object still alive via keep: ['orig', 'mutated']
hi True greet
True True
~~~

**Example 2 — traps and lifetime:**

~~~text
[[9, 0, 0], [9, 0, 0]]
True
[[9, 0, 0], [0, 0, 0]]
TypeError: 'tuple' object does not support item assignment
but the list changed anyway: ([1, 2, 3],)
['x']
refcount went up by 1
alive with one name left? True
alive after the last name is rebound? False
~~~

## 10. Common Pitfalls

- **Thinking \`b = a\` copies.** It never does; use \`a.copy()\`, \`list(a)\` or \`copy.deepcopy(a)\` when you need an independent object.
- **Assuming \`+=\` behaves the same for every type.** It mutates lists, sets and dicts (\`|=\`) in place but rebinds ints, strings and tuples — so aliases behave differently.
- **Building nested lists with \`*\`.** \`[[0] * n] * m\` shares the rows; use a comprehension.
- **Using \`is\` for value comparison.** \`x is 1000\` or \`s is "text"\` depends on implementation caching; use \`==\`. Keep \`is\` for \`None\` and sentinels.
- **Expecting \`del\` to free memory.** It removes a name; the object lives on while any other reference exists, including ones held by closures, caches or lists.
- **Reading meaning into absolute \`sys.getrefcount\` values.** They include temporary references and, from 3.12, immortal objects report a fixed huge count.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Core statement:</strong> <span style="color:#f0e2c8;">Python has objects and names. An object has an identity, a type and a value; a name is a label in a namespace that refers to an object. Assignment binds a name and <strong style="color:#ffca28;">never copies</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Aliasing:</strong> <span style="color:#f0e2c8;">After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b = a</code>, both names refer to one object (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a is b</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b.append(4)</code> is visible through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rebind vs mutate:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = a + [5]</code> makes a new object and moves only the label <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.append(5)</code> changes the shared object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> mutates lists but rebinds ints, strings and tuples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Functions:</strong> <span style="color:#f0e2c8;">Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(data)</code> binds the parameter to the same object (call by sharing): mutation is visible to the caller, rebinding the parameter is not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Lifetime:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del name</code> removes the label. CPython frees an object when its reference count reaches zero; the cycle collector handles reference cycles.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[[0] * 3] * 2</code> give rows that change together?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> repeats references, not objects, so both rows are the same inner list (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid[0] is grid[1]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>). Build rows with a comprehension: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[0] * 3 for _ in range(2)]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">t = ([1, 2],); t[0] += [3]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both: the list is extended in place by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iadd__</code>, then the store back into the tuple raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> because tuples do not support item assignment. The tuple ends up as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">([1, 2, 3],)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a is b</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a == b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> compares identity (the same object), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares values via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>. Two equal lists are usually different objects. See the separate question on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> vs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">del x</code> delete the object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it removes the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> from its namespace and drops one reference. The object is freed only when no references are left, which a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref</code> probe can show.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you trust <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.getrefcount</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only as a relative measure. It counts its own argument, and since Python 3.12 objects like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> are immortal with a fixed, very large count. Compare before and after instead of reading the absolute number.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Object** | A value with an identity, a type and a value |
| **Name** | An identifier that refers to an object; has no type itself |
| **Binding** | The name-to-object link stored in a namespace |
| **Assignment binds, never copies** | \`b = a\` makes \`b\` refer to the same object |
| **Mutation** | Changing an object in place; all aliases see it |
| **Rebinding** | Pointing one name at a different object |
| **Call by sharing** | Parameters are bound to the caller objects |
| **Identity** | Same object or not, tested with \`is\` and \`id()\` |
| **Reference count** | CPython counter of references; object freed at zero |

---
**Conclusion:** Python separates objects, which have identity, type and value, from names, which are just labels in a namespace bound to those objects. Assignment and argument passing only bind labels, so aliasing is normal, a mutation is visible through every alias, and rebinding a name moves only that label. The \`+=\` operator mutates mutable objects in place but rebinds immutable ones, \`del\` removes a name rather than an object, and CPython frees an object when its reference count reaches zero. With that model you can explain shared grid rows, the tuple \`+=\` puzzle, mutable default arguments and "pass by reference" questions from first principles.`,
    examples: [
      {
        label: `Names, objects and aliasing: rebinding vs mutation`,
        code: `first = [1, 2, 3]
alias = first                       # bind a second name, no copy
print("same object?", first is alias)
# mutate through one name, and it is visible through the other
alias.append(4)
print("first sees it:", first)

first = first + [5]                 # builds a NEW list, rebinds first
print("after rebinding:", first, alias)
print("still the same object?", first is alias)

# += mutates a list in place, but rebinds an int
nums = [1]
nums_alias = nums
nums += [2]
print(nums_alias, nums is nums_alias)  # [1, 2] True

count = 10
count_alias = count
count += 1
print(count, count_alias)  # 11 10

# Parameters are just new names for the caller objects
def rebind(param):
    param = ["new list"]

def mutate(param):
    param.append("mutated")

data = ["orig"]
rebind(data)
print("after rebind():", data)
mutate(data)
print("after mutate():", data)

# Names live in a namespace, which is a real dict
print(globals()["data"] is data)
print(type(globals()).__name__)  # dict

# del removes the NAME, not the object
keep = data
del data
print("data still a name?", "data" in globals())
print("object still alive via keep:", keep)

# Functions and classes are objects too, and names can alias them
def greet():
    return "hi"
say = greet
print(say(), say is greet, say.__name__)  # hi True greet
print(isinstance(greet, object), isinstance(int, object))  # True True
`,
      },
      {
        label: `The classic traps, reference counts and when objects die`,
        code: `import sys
import weakref

# Trap 1: * repeats REFERENCES, so the rows are one shared list
grid = [[0] * 3] * 2
grid[0][0] = 9
print(grid)  # [[9, 0, 0], [9, 0, 0]]
print(grid[0] is grid[1])  # True

safe = [[0] * 3 for _ in range(2)]
safe[0][0] = 9
print(safe)  # [[9, 0, 0], [0, 0, 0]]

# Trap 2: += on a list inside a tuple mutates, THEN fails to rebind
t = ([1, 2],)
try:
    t[0] += [3]
except TypeError as e:
    print("TypeError:", e)
print("but the list changed anyway:", t)

# Trap 3: a = b = [] is one list with two names
a = b = []
a.append("x")
print(b)  # ['x']

# Reference counting: one more name, one more reference
obj = []
before = sys.getrefcount(obj)
second_name = obj
print("refcount went up by", sys.getrefcount(obj) - before)

# The object is freed when the LAST reference goes away
class Node:
    pass

node = Node()
probe = weakref.ref(node)
other_name = node
del node
print("alive with one name left?", probe() is not None)
other_name = None
print("alive after the last name is rebound?", probe() is not None)
`,
      },
    ],
  },
];

export default augments;
