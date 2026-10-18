/**
 * PYTHON ULTRA — batch 14: Decorators. Every example was run on python3.11 and
 * through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What are decorators in Python?`,
    difficulty: `medium`,
    seoDescription: `Python decorators from zero: @ as f = deco(f), wrappers and closures, when decorators run, stacking order, class decorators, with verified output.`,
    description: `**Question presented to candidate:**
"You see \`@something\` above function definitions all over Python code. What is a decorator, what does the \`@\` line actually do, and can you write one for me, say one that logs or changes what a function returns?"

**What a strong answer should cover:**
- A decorator is a callable that takes a function (or class) and returns a replacement; \`@deco\` above \`def f\` means \`f = deco(f)\`, applied once when the \`def\` statement runs.
- It works because functions are first-class objects and the inner wrapper is a closure that remembers the original function.
- The standard shape: an inner \`wrapper(*args, **kwargs)\` that calls the original, returns its result, and is decorated with \`functools.wraps\`.
- Stacking order: the decorator nearest the \`def\` is applied first, the top one wraps everything (so it runs first at call time).
- Real uses: logging, timing, caching (\`functools.lru_cache\`), access checks, retries, registration (web routes, plugins), \`property\` / \`classmethod\` / \`staticmethod\`, and class decorators such as \`dataclasses.dataclass\`.
- A version fact: function decorators came with PEP 318 (Python 2.4), class decorators with PEP 3129, and PEP 614 (Python 3.9) allows any expression after \`@\`.

**Code / implementation expected:** Yes — write a small decorator (logging, timing or a result transform) live, with \`*args, **kwargs\` and \`functools.wraps\`.`,
    answer: `**Target Audience:** Python beginners who have written functions, up to candidates preparing for mid-level interviews
**Difficulty:** Medium
**Python version:** behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime)

> **How to read this doc:** Every idea is first explained in plain words. When a term has a precise name an interviewer expects to hear, it is introduced as a 📌 **Interview term** callout. The Quick Glossary at the end lists all of them.

## 1. Why This Even Matters — A Story First

Imagine a gift shop. You bring in a present, and the shop wraps it: paper, ribbon, a card. You still hand over the *same* present, but whoever opens it first meets the wrapping. The shop did not change the present, and you did not have to learn how to wrap.

A decorator is that shop for functions. You write a normal function, put one line above it (\`@shout\`, \`@login_required\`, \`@lru_cache\`), and Python hands your function to the decorator, which gives back a *wrapped* version. Every caller now goes through the wrapping first: it can log the call, check a permission, look in a cache, or change the result, and then call your original code. Your function itself stays small and focused on its real job.

That is why decorators are everywhere in Python: web frameworks use them for routes, test frameworks for fixtures, the standard library for caching and properties. If you cannot read the \`@\` line, you cannot read most real Python code.

## 2. The Building Blocks: Functions Are Objects

A decorator only works because of two facts about Python functions.

**First, a function is an ordinary object.** \`def greet(): ...\` creates a function object and binds it to the name \`greet\`. You can pass that object to another function, return it, or store it in a dict, exactly like a number.

📌 **Interview term: First-class function** — a function that is a value like any other: it can be passed as an argument, returned from a function and assigned to a name. Python functions are first-class.

📌 **Interview term: Higher-order function** — a function that takes a function as an argument or returns one. Every decorator is a higher-order function.

**Second, an inner function remembers the variables of the function it was created in**, even after that outer function has returned. The inner \`wrapper\` below keeps using \`func\` long after \`shout\` finished. How that capture works (cells, late binding) has its own page: [how closures capture variables](/interview-question/how-do-closures-capture-variables-in-python).

📌 **Interview term: Closure** — an inner function together with the variables it captured from the enclosing function. A decorator wrapper is a closure over the original function.

## 3. What a Decorator Is

📌 **Interview term: Decorator** — a callable that takes a function (or a class) and returns a replacement for it. The \`@decorator\` line above a \`def\` is syntax for \`name = decorator(name)\`.

Here is the standard shape, from Example 1:

~~~python
import functools

def shout(func):                       # receives the original function
    @functools.wraps(func)             # copy name, docstring, ... onto wrapper
    def wrapper(*args, **kwargs):      # accepts any arguments
        return func(*args, **kwargs).upper()   # call the original, change result
    return wrapper                     # this object replaces the original

@shout
def greet(name):
    return "hello " + name

greet("ada")   # 'HELLO ADA'
~~~

The \`@shout\` line is shorthand. Example 1 writes the long form next to it and both print \`HELLO ADA\`:

~~~python
def plain(name):
    return "hello " + name
plain = shout(plain)        # exactly what @shout does
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="The decorator line passes the new function object to the decorator and binds the name to whatever the decorator returns">
  <defs>
    <marker id="py14q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="112" text-anchor="middle">function object</text>
  <text class="d-sub" x="110" y="138" text-anchor="middle">built by def greet</text>
  <path class="d-edge" d="M 200 120 L 280 120" marker-end="url(#py14q1-arrow)"/>
  <rect class="d-box-accent" x="290" y="80" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="380" y="112" text-anchor="middle">shout(func)</text>
  <text class="d-sub" x="380" y="138" text-anchor="middle">runs once, at def time</text>
  <path class="d-edge-accent" d="M 470 120 L 550 120" marker-end="url(#py14q1-arrow)"/>
  <rect class="d-box" x="560" y="80" width="180" height="80" rx="10"/>
  <text class="d-text" x="650" y="112" text-anchor="middle">wrapper</text>
  <text class="d-sub" x="650" y="138" text-anchor="middle">returned object</text>
  <rect class="d-box-muted" x="560" y="200" width="180" height="40" rx="8"/>
  <text class="d-sub" x="650" y="225" text-anchor="middle">name greet points here</text>
  <path class="d-edge-dashed" d="M 650 198 L 650 162" marker-end="url(#py14q1-arrow)"/>
  <text class="d-sub" x="110" y="50" text-anchor="middle">step 1</text>
  <text class="d-sub" x="380" y="50" text-anchor="middle">step 2</text>
  <text class="d-sub" x="650" y="50" text-anchor="middle">step 3</text>
</svg>

Read the diagram left to right: \`def\` builds a function object, Python passes it to the decorator, and the name is bound to whatever the decorator returns. The original function still exists, but only the wrapper can reach it now.

The three parts of the wrapper each have a reason:

- \`*args, **kwargs\` lets the wrapper accept any arguments and forward them unchanged, so one decorator fits every function. (See [*args and **kwargs](/interview-question/what-do-args-and-kwargs-mean).)
- \`return func(...)\` passes the result back. Forgetting this \`return\` is the classic beginner bug: the decorated function then returns \`None\`.
- \`@functools.wraps(func)\` copies the original name, docstring and signature information onto the wrapper. Without it, \`greet.__name__\` would be \`"wrapper"\`. The details are in [why use functools.wraps](/interview-question/why-use-functools-wraps-when-writing-decorators).

📌 **Interview term: Wrapper function** — the inner function a decorator returns. It runs code before and after calling the original.

### What CPython does with the @ line

The \`@\` form is not just a nicer spelling of \`f = deco(f)\`; it is compiled slightly differently. Disassembling \`@deco\` over \`def f(): pass\` on python3.11 gives (code-object address shortened):

~~~text
  1           2 LOAD_NAME                0 (deco)

  2           4 LOAD_CONST               0 (<code object f at 0x..., file "<demo>", line 1>)
              6 MAKE_FUNCTION            0

  1           8 PRECALL                  0
             12 CALL                     0

  2          22 STORE_NAME               1 (f)
~~~

The decorator is loaded *first*, then the function object is made and passed straight to it, and the name \`f\` is stored only once, with the result. The undecorated function is never bound to \`f\`, not even for a moment. With the manual form, \`f\` briefly points at the original.

## 4. When Does a Decorator Run?

**Once, when the \`def\` statement runs**, which for a module-level function means at import time. The wrapper, on the other hand, runs on every call. Example 1 records the order:

~~~text
['decorating task', 'def finished', 'task ran', 'task ran']
~~~

\`announce\` ran a single time, before the line after the \`def\`; calling \`task()\` twice did not run it again.

📌 **Interview term: Decoration time vs call time** — decoration time is the single moment the decorator is applied (when \`def\` executes); call time is every later call, when the wrapper runs. Code in the decorator body runs at decoration time; code in the wrapper runs at call time.

That is what makes **registration decorators** possible: the decorator does its work at import time (add the function to a dict) and returns the function unchanged, so calls cost nothing extra. Flask-style \`@app.route("/home")\` works this way. Example 1 builds a tiny router:

~~~python
ROUTES = {}
def route(path):
    def deco(func):
        ROUTES[path] = func     # side effect at decoration time
        return func             # no wrapper at all
    return deco

@route("/home")
def home():
    return "home page"
~~~

\`route("/home")\` is a decorator *with arguments*: a function that returns a decorator. That pattern has its own page: [decorator factories](/interview-question/what-is-a-decorator-factory-a-decorator-with-arguments).

## 5. Stacking Decorators

You can put several decorators on one function. They are applied **bottom-up**: the one nearest the \`def\` first, then the next one wraps that result.

~~~python
@tag("outer")
@tag("inner")
def word():
    return "x"
# same as: word = tag("outer")(tag("inner")(word))

word()    # 'outer(inner(x))'
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Two stacked decorators form nested layers: outer wraps inner wraps the original function">
  <rect class="d-box" x="20" y="20" width="600" height="220" rx="12"/>
  <text class="d-text" x="320" y="52" text-anchor="middle">tag outer  (top line, applied last)</text>
  <rect class="d-box-muted" x="80" y="80" width="480" height="140" rx="10"/>
  <text class="d-text" x="320" y="112" text-anchor="middle">tag inner  (nearest the def, applied first)</text>
  <rect class="d-box-accent" x="200" y="140" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="320" y="174" text-anchor="middle">word  (original)</text>
</svg>

The layers nest like boxes. At call time you enter from the outside, so the top decorator runs its "before" code first and its "after" code last.

This order matters in practice. A caching decorator placed above a logging decorator logs only cache misses; placed below it, every call is logged. With \`@app.route\` and \`@login_required\`, the route decorator must be on top, because it must register the *protected* function.

## 6. Decorators Do Not Have to Be Functions

Anything callable can be a decorator, and anything can be decorated that the decorator accepts. Example 2 shows three variations.

**A class as the decorator.** \`CountCalls(add)\` creates an instance that stores the function; its \`__call__\` method runs on every call, so instance attributes keep state such as a call counter:

~~~text
CountCalls add 2
~~~

\`add\` is now a \`CountCalls\` instance, not a function; \`functools.update_wrapper(self, func)\` copied the name, so \`add.__name__\` is still \`add\`.

**A decorator applied to a class.** A class decorator receives the class object after the class body has run, and returns a class (usually the same one, modified). \`@with_repr\` adds a \`__repr__\`, so \`print(Point(1, 2))\` shows \`Point(x=1, y=2)\`. The standard \`@dataclasses.dataclass\` is a class decorator that generates \`__init__\`, \`__repr__\` and \`__eq__\` for you: see [dataclasses](/interview-question/what-are-dataclasses).

📌 **Interview term: Class decorator** — a decorator applied to a \`class\` statement: \`@deco class C: ...\` means \`C = deco(C)\`.

**Any expression after @.** Since Python 3.9 the grammar accepts any expression after \`@\` ([PEP 614](https://peps.python.org/pep-0614/)); before that only a dotted name with an optional single call was allowed. Example 2 uses a dict lookup, \`@decorators["shout"]\`, which runs on 3.9 and newer.

Finally, Example 2 shows the closure at work: a wrapper written without \`wraps\` reports its own name (\`wrapper\`), its code object lists one free variable \`('func',)\`, and the cell behind it holds the original function, whose name is \`double\`. That cell is the "present inside the wrapping".

## 7. A Short History

| Change | Where it is specified |
| :--- | :--- |
| Function and method decorators added in Python 2.4 | [PEP 318](https://peps.python.org/pep-0318/) |
| Class decorators | [PEP 3129](https://peps.python.org/pep-3129/) (targets Python 3.0; PEP 318 notes it was also planned for 2.6) |
| Any expression allowed after \`@\`, Python 3.9 | [PEP 614](https://peps.python.org/pep-0614/) |

Before PEP 318 people wrote \`f = staticmethod(f)\` after the function body, which put the important information at the bottom; moving it to an \`@\` line on top was the main motivation.

## 8. Built-in Decorators You Already Use

| Decorator | What it does | Its own page |
| :--- | :--- | :--- |
| \`@property\` | turns a method into a managed attribute | [the @property decorator](/interview-question/what-is-the-property-decorator) |
| \`@classmethod\`, \`@staticmethod\` | change what the method receives as its first argument | [classmethod vs staticmethod](/interview-question/what-is-the-difference-between-classmethod-and-staticmethod) |
| \`@functools.lru_cache\`, \`@functools.cache\` | memoise results by arguments | [functools.lru_cache](/interview-question/how-does-functools-lru-cache-work) |
| \`@functools.wraps\` | copies metadata onto a wrapper | [functools.wraps](/interview-question/why-use-functools-wraps-when-writing-decorators) |
| \`@dataclasses.dataclass\` | generates methods for a class | [dataclasses](/interview-question/what-are-dataclasses) |
| \`@contextlib.contextmanager\` | turns a generator into a context manager | [context managers](/interview-question/what-is-a-context-manager) |

More of the \`functools\` toolbox is in [what the functools module offers](/interview-question/what-does-the-functools-module-offer).

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — the @ sugar, decoration time, stacking and registration** prints:

~~~text
HELLO ADA
HELLO ADA
['decorating task', 'def finished', 'task ran', 'task ran']
outer(inner(x))
['/home']
home page
~~~

**Example 2 — a class as decorator, a class decorator, PEP 614 and the closure cell** prints:

~~~text
CountCalls add 2
Point(x=1, y=2)
HI
wrapper
('func',)
double
~~~

**What the output shows:**

- The decorated \`greet\` and the manually reassigned \`plain\` behave the same: \`@\` is \`name = deco(name)\`.
- \`decorating task\` comes before \`def finished\`: the decorator ran once at definition time, the two calls ran only the function.
- \`outer(inner(x))\`: the decorator nearest the \`def\` wrapped first.
- \`co_freevars\` is \`('func',)\` and the cell holds \`double\`: the wrapper is a closure over the original function.

## 10. Edge Cases

- **Decorating methods.** A function wrapper works on methods without changes, because \`self\` simply arrives in \`*args\`. A *class-based* decorator like \`CountCalls\` does not bind to instances by itself (it has no \`__get__\`), so on a method it does not receive \`self\`: in our 3.11 run, \`A().m(1)\` with \`m\` decorated by \`CountCalls\` raised \`TypeError: A.m() missing 1 required positional argument: 'x'\`, because \`1\` landed in the \`self\` slot. Use a function wrapper there.
- **Decorators that return something else.** A decorator may return any object. \`@property\` returns a \`property\` object, \`@lru_cache\` returns a C-level \`_lru_cache_wrapper\`. Code that assumes "it is still a plain function" can break.
- **Async functions.** Wrapping \`async def\` needs an \`async def wrapper\` that \`await\`s the original; a plain wrapper would return the coroutine without awaiting it. We checked: a sync wrapper that records \`after\` around an \`async def\` that records \`work\` produced \`['after', 'work']\`.
- **Order with \`@classmethod\` / \`@staticmethod\`.** Put them on top (outermost), so your decorator wraps the plain function underneath.

## Common Pitfalls

- **Forgetting \`return func(*args, **kwargs)\`.** The wrapper calls the original but drops its result, so every decorated function returns \`None\`.
- **Calling the function in the decorator body.** \`func()\` in the decorator itself runs at import time, once, instead of on every call; work that belongs to each call goes inside the wrapper.
- **Leaving out \`functools.wraps\`.** Every decorated function is then named \`wrapper\` and loses its docstring, which breaks logging, debugging and anything keyed by name.
- **Hard-coding the signature.** \`def wrapper(x)\` only fits one-argument functions; use \`*args, **kwargs\` unless you deliberately restrict it.
- **Getting the stacking order wrong.** \`@cache\` above \`@log\` hides cached calls from the log; route-registration decorators must sit on top of the access-check decorators they protect.
- **Wrapping an \`async def\` with a sync wrapper.** The wrapper returns an un-awaited coroutine, so its "after" code runs before the real work happens.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A decorator is a callable that takes a function or class and returns a replacement. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@deco</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f = deco(f)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Functions are first-class objects, and the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper</code> is a closure that remembers the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Standard shape:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper(*args, **kwargs)</code> forwards the call, returns the result, and is decorated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.wraps(func)</code> to keep the name and docstring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Timing and order:</strong> <span style="color:#f0e2c8;">The decorator runs once when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> executes; the wrapper runs on every call. Stacked decorators apply bottom-up, so the top one runs first at call time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Uses:</strong> <span style="color:#f0e2c8;">Logging, timing, caching with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code>, auth checks, retries, route registration, plus built-ins like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod</code> and the class decorator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataclass</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@deco</code> exactly the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f = deco(f)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Behaviourally yes. In bytecode the decorator is loaded first and the new function is passed straight to it, so the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f</code> is never bound to the undecorated function, even briefly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the decorator body run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once, at decoration time: when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> statement executes, which for module-level code is import time. Only the wrapper runs on each call. That is why registration decorators can fill a dict at import time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order are stacked decorators applied?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bottom-up: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@a</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@b</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f = a(b(f))</code>. At call time the outer layer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> runs first and finishes last.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class be a decorator, and can you decorate a class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both. A class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__call__</code> can wrap a function and keep state in attributes (use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.update_wrapper(self, func)</code>). A class decorator receives the finished class and returns a class, which is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataclass</code> works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you decorate an async function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def wrapper(*args, **kwargs)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return await func(*args, **kwargs)</code>. A plain wrapper would hand back an un-awaited coroutine, so its after-code would run before the real work.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **First-class function** | A function that can be passed, returned and stored like any other value. |
| **Higher-order function** | A function that takes or returns a function; every decorator is one. |
| **Closure** | An inner function plus the variables it captured from its enclosing function. |
| **Decorator** | A callable that takes a function or class and returns a replacement; \`@d\` means \`f = d(f)\`. |
| **Wrapper function** | The inner function a decorator returns; it runs code around the original call. |
| **Decoration time vs call time** | The one moment the decorator is applied versus every later call of the wrapper. |
| **Class decorator** | A decorator applied to a class statement: \`C = deco(C)\`. |

---
**Conclusion:** A decorator is a callable that receives a function or class and returns a replacement, and \`@deco\` above a \`def\` simply means \`name = deco(name)\`, applied once when the definition runs. It works because functions are first-class objects and the inner wrapper is a closure that keeps the original function alive. The standard shape is a \`wrapper(*args, **kwargs)\` that forwards the call, returns the result and is marked with \`functools.wraps\`; stacked decorators apply from the bottom up. With that one idea you can read \`@property\`, \`@lru_cache\`, \`@dataclass\` and framework routes, and write your own logging, timing, retry or registration decorators.`,
    examples: [
      { label: `The @ sugar, decoration time, stacking order and a registration decorator`, code: `import functools

# A decorator is just a function that takes a function and returns one.
def shout(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs).upper()
    return wrapper

# 1. The @ line is shorthand for "greet = shout(greet)"
@shout
def greet(name):
    return "hello " + name

def plain(name):
    return "hello " + name
plain = shout(plain)

print(greet("ada"))  # HELLO ADA
print(plain("ada"))  # HELLO ADA

# 2. A decorator runs ONCE, when the def statement runs, not on every call
log = []
def announce(func):
    log.append("decorating " + func.__name__)
    return func

@announce
def task():
    log.append("task ran")

log.append("def finished")
task()
task()
print(log)

# 3. Stacking: the decorator nearest the def is applied first
def tag(label):
    def deco(func):
        @functools.wraps(func)
        def wrapper():
            return label + "(" + func() + ")"
        return wrapper
    return deco

@tag("outer")
@tag("inner")
def word():
    return "x"

print(word())  # outer(inner(x))

# 4. Registration decorator: returns the function unchanged
ROUTES = {}
def route(path):
    def deco(func):
        ROUTES[path] = func
        return func
    return deco

@route("/home")
def home():
    return "home page"

print(sorted(ROUTES))  # ['/home']
print(ROUTES["/home"]())  # home page` },
      { label: `A class as a decorator, a class decorator, PEP 614 and the closure cell`, code: `import functools

# A decorator can be any callable: here a class whose instances wrap the function
class CountCalls:
    def __init__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.func(*args, **kwargs)

@CountCalls
def add(a, b):
    return a + b

add(1, 2)
add(3, 4)
print(type(add).__name__, add.__name__, add.calls)

# A class decorator receives the class and returns a class
def with_repr(cls):
    def __repr__(self):
        fields = ", ".join(k + "=" + repr(v) for k, v in vars(self).items())
        return cls.__name__ + "(" + fields + ")"
    cls.__repr__ = __repr__
    return cls

@with_repr
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

print(Point(1, 2))  # Point(x=1, y=2)

# Since Python 3.9 any expression may follow @ (PEP 614)
decorators = {"shout": lambda f: lambda *a: f(*a).upper()}

@decorators["shout"]
def hi():
    return "hi"

print(hi())  # HI

# The wrapper is a closure: the original function lives in its cell
def trace(func):
    def wrapper(*args):
        return func(*args)
    return wrapper

@trace
def double(n):
    return n * 2

print(double.__name__)  # wrapper
print(double.__code__.co_freevars)  # ('func',)
print(double.__closure__[0].cell_contents.__name__)  # double` },
    ],
  },
  {
    title: `Why use functools.wraps when writing decorators?`,
    difficulty: `medium`,
    seoDescription: `Why every Python decorator needs functools.wraps: what it copies, __wrapped__, inspect.signature, pickling and name-keyed registries, with verified output.`,
    description: `**Question presented to candidate:**
"Most decorator examples put \`@functools.wraps(func)\` on the inner wrapper. What goes wrong if you leave it out, and what exactly does \`wraps\` do?"

**What a strong answer should cover:**
- Without it, the decorated name points at the wrapper, so \`__name__\`, \`__qualname__\`, \`__doc__\`, \`__module__\` and annotations describe the wrapper, not the original.
- What breaks: logs and tracebacks that print names, \`help()\` and docs, \`inspect.signature\`, registries keyed by \`__name__\`, and \`pickle\`, which finds functions by module and qualified name.
- What \`wraps\` does: it is \`functools.update_wrapper\` as a decorator; it copies \`WRAPPER_ASSIGNMENTS\`, merges \`WRAPPER_UPDATES\` (\`__dict__\`) and sets \`__wrapped__\` to the original.
- \`__wrapped__\` lets \`inspect.signature\` report the real signature and lets \`inspect.unwrap\` or tests reach the undecorated function.
- What it does not do: it does not change the wrapper code, defaults or behaviour; it only copies metadata. A version detail: 3.12 added \`__type_params__\` to the copied attributes.

**Code / implementation expected:** Yes — a decorator with and without \`wraps\`, printing \`__name__\`, \`__doc__\` and the signature.`,
    answer: `**Target Audience:** Developers who can write a basic decorator and want to know why the extra line matters
**Difficulty:** Medium
**Python version:** behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime); the 3.12 and 3.13 attribute list was printed on those interpreters

> **How to read this doc:** Every idea is first explained in plain words. When a term has a precise name an interviewer expects to hear, it is introduced as a 📌 **Interview term** callout. The Quick Glossary at the end lists all of them.

## 1. Why This Even Matters — A Story First

A hotel receptionist takes calls for every guest. If the receptionist answers the phone as "Reception" for everyone, callers reach the right person in the end, but the caller ID, the voicemail greeting and the phone directory all say "Reception". Nobody can tell who they actually reached.

A decorator without \`functools.wraps\` is that receptionist. After \`@log\`, the name \`area\` points at the decorator inner \`wrapper\` function, and Python reports *the wrapper* identity everywhere: its name is \`wrapper\`, its docstring is the wrapper docstring, its signature is \`(*args, **kwargs)\`. The function still works, but every tool that asks "who are you?" gets the wrong answer. \`@functools.wraps(func)\` is the receptionist saying "Good morning, this is Ms. Area's line": the wrapper takes on the original identity.

If you have not written a decorator before, start with [what decorators are](/interview-question/what-are-decorators-in-python); this page assumes the basic \`wrapper(*args, **kwargs)\` shape.

## 2. The Problem: The Name Now Points at the Wrapper

\`@no_wraps\` above \`def area\` means \`area = no_wraps(area)\`, and \`no_wraps\` returns its inner function. So \`area\` *is* that inner function now, and it carries the inner function attributes. From Example 1:

~~~text
--- without wraps ---
wrapper
no_wraps.<locals>.wrapper
Wrapper docstring.
(*args, **kwargs)
False
~~~

📌 **Interview term: Function metadata** — the descriptive attributes of a function object: \`__name__\`, \`__qualname__\` (the dotted path inside the module, for example \`Cls.method\` or \`outer.<locals>.inner\`), \`__doc__\`, \`__module__\`, \`__annotations__\` and its \`__dict__\` of custom attributes. Tools read these; the interpreter does not need them to run the code.

What reads that metadata, and therefore breaks:

| Reader | Without \`wraps\` |
| :--- | :--- |
| Logging, tracing, metrics that print \`func.__name__\` | every decorated function is logged as \`wrapper\` |
| \`help()\`, IDE tooltips, Sphinx docs | show the wrapper docstring and \`(*args, **kwargs)\` |
| \`inspect.signature\` (used by frameworks that inject arguments by parameter name) | reports \`(*args, **kwargs)\` |
| Registries keyed by \`__name__\` | different functions collide under \`wrapper\` |
| \`pickle\` (and so \`multiprocessing\`) | cannot find the function by its qualified name |
| Stacked decorators that read metadata | read the inner wrapper, not your function |

## 3. The Fix: functools.wraps

~~~python
import functools

def with_wraps(func):
    @functools.wraps(func)            # one line
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
~~~

With it, Example 1 prints the original identity, the real signature, and a link back:

~~~text
--- with wraps ---
volume
volume
Return w * h * d.
float
(w: float, h: float, d: float = 1.0) -> float
volume
False
~~~

The last line matters: \`volume is volume.__wrapped__\` is \`False\`. The object is still the wrapper; it has only *taken on* the metadata.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="functools.wraps copies name, qualname, doc, module and annotations from the original function onto the wrapper and adds a wrapped link back">
  <defs>
    <marker id="py14q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="220" height="220" rx="12"/>
  <text class="d-text" x="130" y="72" text-anchor="middle">original volume</text>
  <text class="d-sub" x="130" y="110" text-anchor="middle">__name__ volume</text>
  <text class="d-sub" x="130" y="140" text-anchor="middle">__doc__ Return w * h * d</text>
  <text class="d-sub" x="130" y="170" text-anchor="middle">__annotations__</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">__dict__ attributes</text>
  <rect class="d-box-accent" x="520" y="40" width="220" height="220" rx="12"/>
  <text class="d-text d-accent" x="630" y="72" text-anchor="middle">wrapper</text>
  <text class="d-sub" x="630" y="110" text-anchor="middle">__name__ volume</text>
  <text class="d-sub" x="630" y="140" text-anchor="middle">__doc__ Return w * h * d</text>
  <text class="d-sub" x="630" y="170" text-anchor="middle">__annotations__</text>
  <text class="d-sub" x="630" y="200" text-anchor="middle">__wrapped__</text>
  <text class="d-sub" x="630" y="230" text-anchor="middle">__code__ stays wrapper</text>
  <path class="d-edge-accent" d="M 240 120 L 510 120" marker-end="url(#py14q2-arrow)"/>
  <text class="d-sub" x="375" y="106" text-anchor="middle">copied by wraps</text>
  <path class="d-edge-dashed" d="M 520 200 L 250 200" marker-end="url(#py14q2-arrow)"/>
  <text class="d-sub" x="385" y="228" text-anchor="middle">points back</text>
</svg>

The solid arrow is the copy; the dashed arrow is the new \`__wrapped__\` attribute pointing back at the original. The code object is not touched.

📌 **Interview term: functools.wraps** — a decorator factory: \`wraps(func)\` returns a decorator that, applied to a wrapper, calls \`functools.update_wrapper(wrapper, func)\`.

📌 **Interview term: functools.update_wrapper** — the function doing the work: it copies each attribute named in \`WRAPPER_ASSIGNMENTS\` from the original to the wrapper, updates the wrapper attributes named in \`WRAPPER_UPDATES\` (by default merging \`__dict__\`), sets \`wrapper.__wrapped__ = func\`, and returns the wrapper. You call it directly when the wrapper is not a \`def\`, for example a class instance (\`functools.update_wrapper(self, func)\` in \`__init__\`).

### What gets copied, by version

We printed \`functools.WRAPPER_ASSIGNMENTS\` on three interpreters:

| Interpreter | \`WRAPPER_ASSIGNMENTS\` |
| :--- | :--- |
| python3.11 (and Pyodide 0.25.1) | \`('__module__', '__name__', '__qualname__', '__doc__', '__annotations__')\` |
| python3.12 | the same plus \`'__type_params__'\` |
| python3.13 | the same as 3.12 |

\`__type_params__\` holds the type parameters of the 3.12 generic syntax \`def f[T](x: T)\`, so a wrapped generic function keeps them. \`WRAPPER_UPDATES\` is \`('__dict__',)\` on all three: the original custom attributes are *merged into* the wrapper \`__dict__\`, which is why Example 2 can still read \`export.plugin_name\`.

📌 **Interview term: __wrapped__** — the attribute \`update_wrapper\` adds, pointing at the function that was wrapped. It forms a chain through stacked decorators.

### What wraps does not do

It copies descriptive attributes only. On our 3.11 run, after wrapping \`def v(w, h=2)\`, the wrapper still had \`__code__.co_name == 'wrapper'\` and \`__defaults__ is None\`; \`inspect.signature(v)\` printed \`(w, h=2)\` only because it follows \`__wrapped__\`, and \`inspect.signature(v, follow_wrapped=False)\` printed \`(*a, **k)\`. So \`wraps\` does not make the wrapper accept the original arguments or enforce them; it makes the wrapper *describe* itself as the original.

## 4. The Bugs It Prevents, Shown

Example 2 reproduces two real bugs and the escape hatch.

**A registry keyed by name.** A command registry stores functions under \`func.__name__\`. Without \`wraps\`, \`create_user\` and \`delete_user\` both register as \`wrapper\`, the second overwrites the first, and calling the "wrapper" command deletes a user:

~~~text
['wrapper']
user deleted
~~~

**Pickling.** \`pickle\` does not store a function code; it stores the module and qualified name and looks the function up again when loading. Without \`wraps\`, the qualified name is \`no_wraps.<locals>.wrapper\`, which cannot be looked up, so \`pickle.dumps(job_a)\` raised \`AttributeError\` on 3.11 (the message says it cannot pickle a local object). With \`wraps\`, the qualified name is \`job_b\`, the lookup finds the module-level name \`job_b\` (which *is* the wrapper), and the round trip works. Because \`multiprocessing\` pickles the function it sends to worker processes, this is how a missing \`wraps\` turns into a crash in a process pool.

**Reaching the original.** \`__wrapped__\` lets a test or a tool skip the decorators:

~~~python
@noisy
@noisy
def total(xs):
    return sum(xs)

total([1, 2, 3])                          # both noisy layers print
total.__wrapped__.__wrapped__([1, 2, 3])  # the bare function
inspect.unwrap(total)                     # follows the whole chain
~~~

📌 **Interview term: inspect.unwrap** — follows the \`__wrapped__\` chain until it reaches an object without one, and returns it. \`inspect.signature\` uses the same chain by default.

This is also how \`functools.lru_cache\` lets you bypass the cache: it sets \`__wrapped__\` too, so \`cached_func.__wrapped__(x)\` calls the uncached function (see [functools.lru_cache](/interview-question/how-does-functools-lru-cache-work)).

## 5. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — metadata with and without wraps** prints:

~~~text
--- without wraps ---
wrapper
no_wraps.<locals>.wrapper
Wrapper docstring.
(*args, **kwargs)
False
--- with wraps ---
volume
volume
Return w * h * d.
float
(w: float, h: float, d: float = 1.0) -> float
volume
False
('__module__', '__name__', '__qualname__', '__doc__', '__annotations__')
('__dict__',)
ping | Say pong.
~~~

**Example 2 — the registry bug, pickling, __wrapped__ and the merged __dict__** prints:

~~~text
['wrapper']
user deleted
job_a: AttributeError
job_b: b
  [noisy] calling total
  [noisy] calling total
6
6
9
True
csv-export
~~~

**What the output shows:**

- Without \`wraps\`, the decorated \`area\` reports the wrapper name, qualified name, docstring and \`(*args, **kwargs)\` signature, and has no \`__wrapped__\`.
- With \`wraps\`, \`volume\` reports its own name, docstring, annotations and full signature, yet \`volume is volume.__wrapped__\` is \`False\`.
- Two unwrapped functions collapsed into one registry key, and the survivor was \`delete_user\`.
- Only the wrapped function survived a \`pickle\` round trip.
- \`inspect.unwrap(total)\` is the same object as \`total.__wrapped__.__wrapped__\`, and it ran without the two \`[noisy]\` lines.

## 6. Edge Cases

- **Class-based decorators.** There is no inner \`def\` to decorate, so call \`functools.update_wrapper(self, func)\` in \`__init__\`.
- **Decorator factories.** \`wraps\` goes on the innermost wrapper, the one that is returned to replace the function; see [decorator factories](/interview-question/what-is-a-decorator-factory-a-decorator-with-arguments).
- **Wrapping a callable without some attributes.** \`update_wrapper\` skips attributes the original does not have instead of failing (a \`functools.partial\` object has no \`__name__\`, for example), so the wrapper keeps its own value for those: wrapping a \`partial\` with \`update_wrapper\` left \`w.__name__\` as \`w\` on our run.
- **Changing the signature on purpose.** If the wrapper really adds or removes parameters, copying the original signature would lie. Set \`wrapper.__signature__\` yourself, or document it; \`inspect.signature\` prefers an explicit \`__signature__\`.

## Common Pitfalls

- **Putting \`@wraps\` on the wrong function in a factory.** It must decorate the innermost wrapper; on the middle \`decorator\` function it does nothing useful.
- **Writing \`@functools.wraps\` without \`(func)\`.** \`wraps\` then receives the wrapper as *the original*, and the name becomes a \`functools.partial\` object. On our 3.11 run, calling the decorated \`f(1)\` raised \`AttributeError: 'int' object has no attribute '__module__'\`: a confusing error far from the real mistake.
- **Thinking \`wraps\` changes behaviour.** It copies metadata only; argument checking, defaults and the code object are still the wrapper.
- **Debugging a stack of decorators by \`__name__\` alone.** With \`wraps\` every layer reports the same name; use \`__wrapped__\` or \`inspect.unwrap\` to see what is underneath.
- **Forgetting it in class decorators that return a new function or object.** The same metadata loss happens with classes and callable instances; call \`update_wrapper\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A decorator rebinds the name to its wrapper, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__name__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__qualname__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__doc__</code> and the signature describe <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper</code>, not your function.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What breaks:</strong> <span style="color:#f0e2c8;">Logs and tracebacks, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">help()</code> and docs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.signature</code>, registries keyed by name, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle</code>, which looks functions up by module plus qualified name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What wraps does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wraps(func)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update_wrapper</code> as a decorator: it copies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WRAPPER_ASSIGNMENTS</code>, merges <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, and sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code> to the original.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why __wrapped__ matters:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.signature</code> follows it to show the real parameters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.unwrap</code> or a test can call the undecorated function.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What it does not do:</strong> <span style="color:#f0e2c8;">It copies metadata only: the wrapper code, defaults and behaviour are unchanged. It belongs on the innermost wrapper of every decorator.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which attributes does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">wraps</code> copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On 3.11: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__module__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__name__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__qualname__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__doc__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__annotations__</code>; 3.12 adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__type_params__</code>. It also merges the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> and adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does pickling fail without it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pickle stores functions by reference, module plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__qualname__</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wraps</code> the qualname is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deco.&lt;locals&gt;.wrapper</code>, which cannot be looked up. With it, the qualname is the module-level name, which now holds the wrapper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you call the original function behind a decorator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func.__wrapped__</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.unwrap(func)</code> to follow the whole chain through stacked decorators. Both rely on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wraps</code> having set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use it with a class-based decorator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.update_wrapper(self, func)</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wraps</code> is just that function packaged as a decorator for an inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the signature check arguments after <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">wraps</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The wrapper still accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args, **kwargs</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.signature</code> only reports the original parameters because it follows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code>. Bad arguments fail when the original is called.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Function metadata** | Descriptive attributes like \`__name__\`, \`__qualname__\`, \`__doc__\`, \`__module__\`, \`__annotations__\`. |
| **functools.wraps** | Decorator factory that applies \`update_wrapper\` to the wrapper it decorates. |
| **functools.update_wrapper** | Copies metadata from the original onto a wrapper, merges \`__dict__\` and sets \`__wrapped__\`. |
| **__wrapped__** | Attribute on a wrapper pointing at the function it wraps. |
| **inspect.unwrap** | Follows the \`__wrapped__\` chain to the innermost function. |

---
**Conclusion:** A decorator replaces your function with its wrapper, so without \`functools.wraps\` everything that inspects the function sees the wrapper: its name, its docstring, its \`(*args, **kwargs)\` signature. That silently breaks logging, documentation, \`inspect.signature\`, name-keyed registries and \`pickle\`. \`@functools.wraps(func)\` is \`update_wrapper\` packaged as a decorator: it copies \`__module__\`, \`__name__\`, \`__qualname__\`, \`__doc__\` and \`__annotations__\` (plus \`__type_params__\` from 3.12), merges \`__dict__\`, and adds \`__wrapped__\` so tools can reach the original. It costs one line and changes no behaviour, so it belongs in every decorator you write.`,
    examples: [
      { label: `Metadata, signature and __wrapped__ with and without functools.wraps`, code: `import functools
import inspect

def no_wraps(func):
    def wrapper(*args, **kwargs):
        """Wrapper docstring."""
        return func(*args, **kwargs)
    return wrapper

def with_wraps(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        """Wrapper docstring."""
        return func(*args, **kwargs)
    return wrapper

@no_wraps
def area(width: float, height: float = 1.0) -> float:
    """Return width times height."""
    return width * height

@with_wraps
def volume(w: float, h: float, d: float = 1.0) -> float:
    """Return w * h * d."""
    return w * h * d

print("--- without wraps ---")
print(area.__name__)  # wrapper
print(area.__qualname__)  # no_wraps.<locals>.wrapper
print(area.__doc__)  # Wrapper docstring.
print(inspect.signature(area))  # (*args, **kwargs)
print(hasattr(area, "__wrapped__"))  # False

print("--- with wraps ---")
print(volume.__name__)  # volume
print(volume.__qualname__)  # volume
print(volume.__doc__)  # Return w * h * d.
print(volume.__annotations__["return"].__name__)  # float
print(inspect.signature(volume))  # (w: float, h: float, d: float = 1.0) -> float
print(volume.__wrapped__.__name__)  # volume
print(volume is volume.__wrapped__)  # False

# What wraps copies on this interpreter, and what it merges
print(functools.WRAPPER_ASSIGNMENTS)
print(functools.WRAPPER_UPDATES)  # ('__dict__',)

# wraps is update_wrapper with the arguments pre-filled
def manual(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return functools.update_wrapper(wrapper, func)

@manual
def ping():
    """Say pong."""
    return "pong"

print(ping.__name__, "|", ping.__doc__)  # ping | Say pong.` },
      { label: `Real bugs: a name-keyed registry, pickling, and reaching the original`, code: `import functools
import inspect
import pickle

def no_wraps(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def with_wraps(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Bug 1: anything keyed by __name__ collides
registry = {}
def register(func):
    registry[func.__name__] = func
    return func

@register
@no_wraps
def create_user():
    return "user created"

@register
@no_wraps
def delete_user():
    return "user deleted"

print(sorted(registry))  # ['wrapper']
print(registry["wrapper"]())  # user deleted

# Bug 2: pickle stores functions by module + qualified name
@no_wraps
def job_a():
    return "a"

@with_wraps
def job_b():
    return "b"

try:
    pickle.dumps(job_a)
except (pickle.PicklingError, AttributeError) as err:
    print("job_a:", type(err).__name__)
print("job_b:", pickle.loads(pickle.dumps(job_b))())

# __wrapped__ lets tools (and tests) reach the original function
def noisy(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("  [noisy] calling", func.__name__)
        return func(*args, **kwargs)
    return wrapper

@noisy
@noisy
def total(xs):
    return sum(xs)

print(total([1, 2, 3]))
print(total.__wrapped__.__wrapped__([1, 2, 3]))
print(inspect.unwrap(total)([4, 5]))
print(inspect.unwrap(total) is total.__wrapped__.__wrapped__)  # True

# wraps also merges the original __dict__ (custom attributes survive)
def plugin(func):
    func.plugin_name = "csv-export"
    return func

@with_wraps
@plugin
def export():
    return "done"

print(export.plugin_name)  # csv-export` },
    ],
  },
  {
    title: `What is a decorator factory (a decorator with arguments)?`,
    difficulty: `medium`,
    seoDescription: `Python decorator factories explained: why @repeat(3) needs three nested functions, when each layer runs, optional-argument decorators, verified output.`,
    description: `**Question presented to candidate:**
"Writing \`@timer\` is easy. Now I want \`@retry(times=3)\` or \`@repeat(3)\`, where the decorator takes its own arguments. How do you write that, and what does Python actually do with the \`@repeat(3)\` line?"

**What a strong answer should cover:**
- \`@repeat(3)\` first calls \`repeat(3)\`, which must return a decorator; that decorator is then applied: \`f = repeat(3)(f)\`.
- Three layers: the factory takes the options, the decorator takes the function, the wrapper takes the call arguments; options live in closure cells.
- Timing: the factory and the decorator both run once at definition time; only the wrapper runs per call.
- \`functools.wraps(func)\` goes on the innermost wrapper.
- The classic bug of using a factory without parentheses (\`@repeat\`), and how to support both \`@deco\` and \`@deco(opt=...)\` with \`func=None\` plus keyword-only options.
- Alternatives: a class whose \`__init__\` takes the options and \`__call__\` takes the function; standard-library examples such as \`functools.lru_cache(maxsize=...)\`.

**Code / implementation expected:** Yes — a parameterised decorator such as \`repeat(n)\` or \`retry(times, exceptions)\`, written live.`,
    answer: `**Target Audience:** Developers who can write a plain decorator and want configurable ones
**Difficulty:** Medium
**Python version:** behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime)

> **How to read this doc:** Every idea is first explained in plain words. When a term has a precise name an interviewer expects to hear, it is introduced as a 📌 **Interview term** callout. The Quick Glossary at the end lists all of them.

## 1. Why This Even Matters — A Story First

A stamp shop sells one stamp that says "PAID". Useful, but you want "PAID 3 TIMES", "PAID IN EUR", "PAID BY CARD". The shop does not carve a new stamp by hand for every order; it has a **stamp-making machine**. You type the text, the machine produces a stamp, and then you use that stamp on your papers.

A plain decorator is the fixed stamp: \`@timer\`. A **decorator factory** is the machine: you give it settings, \`repeat(3)\` or \`retry(times=5, on=(ConnectionError,))\`, and it hands back a ready decorator, which is then stamped onto your function. Most decorators you meet in real code are factories: \`@app.route("/home")\`, \`@pytest.mark.parametrize(...)\`, \`@functools.lru_cache(maxsize=256)\`. Reading them requires knowing that the \`@\` line contains *two* calls.

This page builds on [what decorators are](/interview-question/what-are-decorators-in-python) and [functools.wraps](/interview-question/why-use-functools-wraps-when-writing-decorators).

## 2. What the @ Line Does With Arguments

The rule for any \`@expression\` line is: evaluate the expression, then call the result with the function. With \`@repeat(3)\`, the expression is the *call* \`repeat(3)\`:

~~~python
@repeat(3)
def roll(sides):
    return sides

# is the same as
roll = repeat(3)(roll)
#      ^^^^^^^^^        step 1: call the factory, get a decorator
#               ^^^^^^  step 2: call that decorator with the function
~~~

So \`repeat(3)\` must *return a decorator*: a function that accepts a function. Nothing about \`@\` is special-cased for arguments; it is just ordinary calls, which is why Example 1 can write \`bark = repeat(2)(bark)\` by hand and get the same result.

📌 **Interview term: Decorator factory** — a function that takes configuration arguments and returns a decorator. \`@factory(args)\` means \`f = factory(args)(f)\`. People also say "decorator with arguments" or "parameterised decorator".

## 3. The Three Layers

~~~python
import functools

def repeat(times):                     # layer 1: the options
    def decorator(func):               # layer 2: the function
        @functools.wraps(func)
        def wrapper(*args, **kwargs):  # layer 3: each call
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Three layers of a decorator factory: repeat takes the options and returns decorator, decorator takes the function and returns wrapper, wrapper takes the call arguments">
  <defs>
    <marker id="py14q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="70" width="190" height="90" rx="10"/>
  <text class="d-text d-accent" x="115" y="104" text-anchor="middle">repeat(times)</text>
  <text class="d-sub" x="115" y="132" text-anchor="middle">takes the options</text>
  <path class="d-edge-accent" d="M 210 115 L 290 115" marker-end="url(#py14q3-arrow)"/>
  <text class="d-sub" x="250" y="96" text-anchor="middle">returns</text>
  <rect class="d-box" x="295" y="70" width="190" height="90" rx="10"/>
  <text class="d-text" x="390" y="104" text-anchor="middle">decorator(func)</text>
  <text class="d-sub" x="390" y="132" text-anchor="middle">takes the function</text>
  <path class="d-edge" d="M 485 115 L 565 115" marker-end="url(#py14q3-arrow)"/>
  <text class="d-sub" x="525" y="96" text-anchor="middle">returns</text>
  <rect class="d-box" x="570" y="70" width="190" height="90" rx="10"/>
  <text class="d-text" x="665" y="104" text-anchor="middle">wrapper(*args)</text>
  <text class="d-sub" x="665" y="132" text-anchor="middle">takes the call</text>
  <rect class="d-box-muted" x="20" y="200" width="465" height="40" rx="8"/>
  <text class="d-sub" x="252" y="225" text-anchor="middle">run once, when the def statement runs</text>
  <rect class="d-box-muted" x="570" y="200" width="190" height="40" rx="8"/>
  <text class="d-sub" x="665" y="225" text-anchor="middle">runs on every call</text>
  <text class="d-sub" x="115" y="40" text-anchor="middle">layer 1</text>
  <text class="d-sub" x="390" y="40" text-anchor="middle">layer 2</text>
  <text class="d-sub" x="665" y="40" text-anchor="middle">layer 3</text>
</svg>

Each layer returns the next one. The first two layers do their work at definition time; only the wrapper runs each time you call the decorated function.

Example 1 prints from the first two layers, so you can see the timing:

~~~text
repeat() called with 3
decorator() wrapping roll
[6, 6, 6]
~~~

Both setup lines appear before the first call result. And when one factory call is reused, \`twice = repeat(2)\` then \`@twice\` on two functions, the factory line is printed once and the decorator line twice: the factory ran once, the decorator once per function.

### Where the options are stored

The wrapper does not receive \`times\` as an argument at call time. It reads it from the enclosing scope, as a **closure** (see [how closures capture variables](/interview-question/how-do-closures-capture-variables-in-python)). Example 1 shows the cells of the \`retry\` wrapper:

~~~text
('func', 'on', 'times')
~~~

📌 **Interview term: Free variable** — a name a function uses but does not define, taken from an enclosing function. \`wrapper.__code__.co_freevars\` lists them; their values live in \`wrapper.__closure__\`. A decorator factory options are free variables of the wrapper.

Every function decorated with \`@repeat(3)\` gets its own wrapper with its own cells, so \`@repeat(2)\` on one function and \`@repeat(5)\` on another never interfere.

## 4. A Realistic Factory: retry

~~~python
def retry(times, on=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except on as err:          # only the listed exception types
                    print("  attempt", attempt, "failed:", err)
            raise RuntimeError(func.__name__ + " failed " + str(times) + " times")
        return wrapper
    return decorator

@retry(times=3, on=(ConnectionError,))
def fetch(): ...
~~~

\`except on\` works because \`except\` accepts a tuple of exception classes. In Example 1, \`fetch\` fails twice with \`ConnectionError\` and then succeeds:

~~~text
  attempt 1 failed: timeout
  attempt 2 failed: timeout
fetch -> ok
~~~

A production retry would also wait between attempts (often with growing delays) and re-raise the last error, chained, instead of a new \`RuntimeError\`; the demo leaves out sleeping to stay fast and deterministic.

## 5. The Missing-Parentheses Bug

If you write \`@repeat\` instead of \`@repeat(3)\`, Python calls \`repeat(oops)\`: the *function* lands in the \`times\` parameter, and the name \`oops\` is bound to the inner \`decorator\`. Nothing fails at definition time. Example 2 shows what happens later:

~~~text
decorator
TypeError: repeat.<locals>.decorator() missing 1 required positional argument: 'func'
~~~

\`oops.__name__\` is \`decorator\`, and calling \`oops()\` calls the middle layer with no function. This is the most common decorator-factory bug in interviews and in code review.

## 6. Supporting Both @log and @log(prefix=...)

A friendlier design accepts both spellings. The trick: make the function the first, optional parameter, and make every option keyword-only.

~~~python
def log(func=None, *, prefix="LOG"):
    if func is None:
        # called as @log(prefix=...): return the real decorator
        return functools.partial(log, prefix=prefix)
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(prefix + ":", func.__name__, args)
        return func(*args, **kwargs)
    return wrapper
~~~

- \`@log\` calls \`log(add)\`: \`func\` is the function, so it wraps immediately.
- \`@log(prefix="AUDIT")\` calls \`log(prefix="AUDIT")\`: \`func\` is \`None\`, so it returns \`partial(log, prefix="AUDIT")\`, and the \`@\` line then calls that partial with the function.

📌 **Interview term: Keyword-only parameter** — a parameter after \`*\` in the signature; it can only be passed by name. Here it makes \`@log("AUDIT")\` impossible, so a string can never be mistaken for the function. More in [default, keyword-only and positional-only parameters](/interview-question/how-do-default-keyword-only-and-positional-only-parameters-work).

📌 **Interview term: functools.partial** — builds a new callable with some arguments of an existing one already filled in. \`partial(log, prefix="AUDIT")(f)\` is \`log(f, prefix="AUDIT")\`.

\`functools.lru_cache\` supports both forms too: \`@lru_cache\` and \`@lru_cache(maxsize=256)\`; the bare form was added in Python 3.8 according to the [functools documentation](https://docs.python.org/3/library/functools.html#functools.lru_cache) ("Added the user_function option").

## 7. A Class as the Factory

The layers can be a class instead of nested functions: \`__init__\` takes the options (layer 1) and \`__call__\` takes the function (layer 2) and returns the wrapper (layer 3).

~~~python
class Tag:
    def __init__(self, name):
        self.name = name

    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return "<" + self.name + ">" + func(*args, **kwargs) + "</" + self.name + ">"
        return wrapper
~~~

Stacked as \`@Tag("b")\` over \`@Tag("i")\`, it returns \`<b><i>hello</i></b>\`: the lower decorator wraps first. The class form is easier to read when there are many options or when you want helper methods; the function form is shorter for one or two options.

## 8. Function vs Class Factory

| | Nested functions | Class with \`__init__\` and \`__call__\` |
| :--- | :--- | :--- |
| Options stored in | closure cells | instance attributes |
| Lines of code | fewer | more |
| Easy to inspect or change options later | no | yes (\`deco.name\`) |
| Typical use | \`repeat(n)\`, \`retry(...)\` | configurable decorators with several options or shared helpers |

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — the three layers, their timing, reuse and a retry factory** prints:

~~~text
repeat() called with 3
decorator() wrapping roll
[6, 6, 6]
repeat() called with 2
decorator() wrapping bark
['woof', 'woof']
repeat() called with 2
decorator() wrapping a
decorator() wrapping b
['a', 'a'] ['b', 'b']
  attempt 1 failed: timeout
  attempt 2 failed: timeout
fetch -> ok
('func', 'on', 'times')
~~~

**Example 2 — the missing-parentheses bug, an optional-argument decorator, a class factory** prints:

~~~text
decorator
TypeError: repeat.<locals>.decorator() missing 1 required positional argument: 'func'
LOG: add (2, 3)
5
AUDIT: sub (9, 4)
5
<b><i>hello</i></b>
~~~

**What the output shows:**

- The factory line prints before the decorator line, and both before any call result: setup happens once at definition time.
- \`twice = repeat(2)\` reused for two functions printed the factory once and the decorator twice.
- The wrapper free variables are \`('func', 'on', 'times')\`: options are closure cells.
- \`@repeat\` without parentheses bound the name to \`decorator\` and failed only when called.
- \`@log\` and \`@log(prefix="AUDIT")\` both work through one function.

## Common Pitfalls

- **Forgetting the parentheses.** \`@repeat\` instead of \`@repeat()\` passes the function as the first option; nothing fails until the first call.
- **One layer too few.** Writing \`def repeat(times, func)\` cannot be used with \`@repeat(3)\`, because the \`@\` line calls the result of \`repeat(3)\` with the function.
- **\`@wraps\` on the wrong layer.** It belongs on the innermost wrapper, the object that replaces the function.
- **Mutable options shared across calls.** A list passed to the factory is captured by reference; mutating it in the wrapper changes it for every later call.
- **Assigning to an option inside the wrapper.** \`times -= 1\` in the wrapper makes \`times\` local and raises \`UnboundLocalError\`; declare it \`nonlocal\`, or better, use a local copy (see [global and nonlocal](/interview-question/what-do-the-global-and-nonlocal-keywords-do)).
- **Allowing positional options in a dual-use decorator.** Without the \`*\`, \`@log("AUDIT")\` passes a string as \`func\`; make the options keyword-only.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@repeat(3)</code> evaluates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repeat(3)</code> first, which must return a decorator, then applies it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f = repeat(3)(f)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three layers:</strong> <span style="color:#f0e2c8;">The factory takes the options, the decorator takes the function, the wrapper takes each call; options are closure variables of the wrapper.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">The factory and decorator run once, at definition time; only the wrapper runs per call, so setup work belongs in the outer layers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correctness:</strong> <span style="color:#f0e2c8;">Put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.wraps(func)</code> on the innermost wrapper. Using the factory without parentheses binds the name to the middle function and fails on the first call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Variants:</strong> <span style="color:#f0e2c8;">Support both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@log</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@log(prefix=...)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func=None</code> and keyword-only options, or use a class whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> takes options and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__call__</code> takes the function.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if someone writes <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@repeat</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@repeat(3)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repeat(func)</code>, so the function becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">times</code> and the name is bound to the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decorator</code>. It fails only when called, with a missing-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where are the decorator arguments stored?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In closure cells of the wrapper: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.__code__.co_freevars</code> lists them and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.__closure__</code> holds the values. Each decorated function has its own wrapper and cells.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a decorator work with and without arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signature <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def deco(func=None, *, opt=...)</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.partial(deco, opt=opt)</code>; otherwise wrap immediately. Keyword-only options stop a string being mistaken for the function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write the factory as a class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are several options, you want them inspectable as attributes, or you need helper methods. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> stores the options and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__call__(func)</code> returns the wrapper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give standard-library or framework examples.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.lru_cache(maxsize=128)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.wraps(func)</code> itself, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataclasses.dataclass(frozen=True)</code>, and web framework routes like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@app.route(path)</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Decorator factory** | A function that takes options and returns a decorator: \`f = factory(opts)(f)\`. |
| **Free variable** | A name a function uses from an enclosing scope; stored in closure cells. |
| **Keyword-only parameter** | A parameter after \`*\` that can only be passed by name. |
| **functools.partial** | A callable with some arguments of another callable pre-filled. |

---
**Conclusion:** A decorator factory is one more layer around a decorator: a function that takes the options and returns the real decorator, so \`@repeat(3)\` means \`f = repeat(3)(f)\`. The factory and the decorator run once, when the function is defined; the innermost wrapper runs on every call and reads the options from its closure. Put \`functools.wraps\` on that innermost wrapper, watch for the missing-parentheses bug, and use \`func=None\` with keyword-only options when you want one decorator to work both bare and with arguments. Classes with \`__init__\` and \`__call__\` are the same idea in a different shape.`,
    examples: [
      { label: `Three layers, when each runs, reuse, and a retry factory`, code: `import functools

# Layer 1 takes the options, layer 2 takes the function, layer 3 takes the call
def repeat(times):
    print("repeat() called with", times)
    def decorator(func):
        print("decorator() wrapping", func.__name__)
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(3)
def roll(sides):
    return sides

print(roll(6))  # [6, 6, 6]

# The @ line is exactly "factory call, then decorator call"
def bark():
    return "woof"
bark = repeat(2)(bark)
print(bark())  # ['woof', 'woof']

# One factory, many independently configured decorators
twice = repeat(2)
@twice
def a():
    return "a"
@twice
def b():
    return "b"
print(a(), b())

# A realistic factory: retry on chosen exceptions
def retry(times, on=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except on as err:
                    print("  attempt", attempt, "failed:", err)
            raise RuntimeError(func.__name__ + " failed " + str(times) + " times")
        return wrapper
    return decorator

replies = iter(["timeout", "timeout", "ok"])

@retry(times=3, on=(ConnectionError,))
def fetch():
    reply = next(replies)
    if reply != "ok":
        raise ConnectionError(reply)
    return reply

print("fetch ->", fetch())

# The configuration lives in the closure cells of the wrapper
print(fetch.__code__.co_freevars)  # ('func', 'on', 'times')` },
      { label: `The missing-parentheses bug, an optional-argument decorator and a class factory`, code: `import functools

# Classic mistake: using a factory without parentheses
def repeat(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return [func(*args, **kwargs) for _ in range(times)]
        return wrapper
    return decorator

@repeat
def oops():
    return "hi"

# oops is now the inner "decorator" function, and times is the function!
print(oops.__name__)  # decorator
try:
    oops()
except TypeError as err:
    print("TypeError:", err)

# Fix: support both @log and @log(prefix=...) with a keyword-only option
def log(func=None, *, prefix="LOG"):
    if func is None:
        # called as @log(prefix=...): return the real decorator
        return functools.partial(log, prefix=prefix)
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(prefix + ":", func.__name__, args)
        return func(*args, **kwargs)
    return wrapper

@log
def add(a, b):
    return a + b

@log(prefix="AUDIT")
def sub(a, b):
    return a - b

print(add(2, 3))
print(sub(9, 4))

# A class can be a decorator factory too: __init__ takes the options
class Tag:
    def __init__(self, name):
        self.name = name

    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return "<" + self.name + ">" + func(*args, **kwargs) + "</" + self.name + ">"
        return wrapper

@Tag("b")
@Tag("i")
def text():
    return "hello"

print(text())  # <b><i>hello</i></b>` },
    ],
  },
  {
    title: `What is the @property decorator?`,
    difficulty: `medium`,
    seoDescription: `Python @property from zero: computed and validated attributes, setter and deleter, the data descriptor behind it, and cached_property, verified output.`,
    description: `**Question presented to candidate:**
"In Java you would write \`getRadius()\` and \`setRadius()\`. In Python people write \`@property\`. What does it do, how do you add a setter, and what is actually happening when I read \`circle.radius\`?"

**What a strong answer should cover:**
- \`@property\` turns a method into a managed attribute: reading \`obj.area\` calls the getter, no parentheses; \`@area.setter\` and \`@area.deleter\` handle assignment and \`del\`.
- Why it exists: start with a plain public attribute and later add validation or computation without changing any calling code, so no Java-style getters are needed up front.
- A property without a setter is read-only; assigning raises \`AttributeError\` (on 3.11: "property 'area' of 'Circle' object has no setter").
- Under the hood: \`property\` is a class implementing the descriptor protocol; it is a data descriptor, so it wins over the instance \`__dict__\` in attribute lookup.
- \`.setter\` returns a new property object, which is why the setter function must reuse the same name; store the value under a different name such as \`_radius\`.
- Trade-offs: keep getters cheap and side-effect free; for an expensive value computed once, \`functools.cached_property\` (a non-data descriptor that stores into \`__dict__\`).

**Code / implementation expected:** Yes — a class with a validated property (getter plus setter) and a read-only computed property.`,
    answer: `**Target Audience:** Python beginners who know classes, up to candidates expected to explain descriptors
**Difficulty:** Medium
**Python version:** behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime); error messages also checked on 3.12 and 3.13

> **How to read this doc:** Every idea is first explained in plain words. When a term has a precise name an interviewer expects to hear, it is introduced as a 📌 **Interview term** callout. The Quick Glossary at the end lists all of them.

## 1. Why This Even Matters — A Story First

A thermostat on the wall shows "21 °C". You read it like a number. You can also turn it to 25, as if writing a number. But behind the display there is logic: the thermostat refuses 90 °C, it converts to Fahrenheit for an American visitor, it may check a sensor every time you look. You never call \`thermostat.get_temperature()\`; you just read the dial.

\`@property\` gives a class that kind of dial. Callers write \`circle.radius\` and \`circle.radius = 5\`, as with a plain attribute, while your methods quietly run to compute, validate or convert. The big payoff: you can start with a plain attribute (\`self.radius = radius\`) and, months later, when you need validation, turn it into a property **without changing a single caller**. That is why idiomatic Python does not write Java-style \`get_x()\` / \`set_x()\` methods up front.

## 2. A Read-Only Computed Attribute

The simplest property is a method with \`@property\` above it. Reading the attribute calls the method.

~~~python
import math

class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return round(math.pi * self._radius ** 2, 2)

c = Circle(2)
c.area        # 12.57  (no parentheses: the method runs)
~~~

📌 **Interview term: Property** — a class attribute, created with the built-in \`property\` (usually via \`@property\`), that runs a getter method when the attribute is read and optionally a setter on assignment and a deleter on \`del\`. To the caller it looks like a plain attribute.

📌 **Interview term: Computed attribute** — an attribute whose value is calculated from other state each time it is read, instead of being stored. \`area\` is computed from \`_radius\`, so it can never go out of date.

Because there is no setter, \`area\` is read-only. On python3.11 the assignment \`c.area = 100\` raised:

~~~text
AttributeError: property 'area' of 'Circle' object has no setter
~~~

We ran the same assignment on python3.12 and python3.13 and got the same message.

## 3. Getter, Setter, Deleter

To allow assignment, decorate a second method **with the same name** using \`@<name>.setter\`:

~~~python
class Circle:
    def __init__(self, radius):
        self.radius = radius            # goes through the setter, so it is validated

    @property
    def radius(self):
        """The radius, always a non-negative number."""
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("radius must be non-negative")
        self._radius = value

    @radius.deleter
    def radius(self):
        del self._radius
~~~

Three details make this work:

- **The value lives under another name**, \`_radius\`. If the setter wrote \`self.radius = value\`, it would call itself forever and hit \`RecursionError\`.
- **\`__init__\` uses the property too.** \`self.radius = radius\` runs the setter, so \`Circle(-3)\` is rejected at construction, which Example 1 shows (\`ValueError in __init__: radius must be non-negative\`).
- **The docstring of the getter becomes the property docstring**: \`Circle.radius.__doc__\` prints \`The radius, always a non-negative number.\`

📌 **Interview term: Encapsulation** — keeping an object internal state behind an interface that controls how it is read and changed. A property encapsulates \`_radius\` while still exposing the simple name \`radius\`. The leading underscore is only a convention meaning "internal"; Python does not enforce privacy.

The \`Temperature\` class in Example 1 shows the conversion use case: one stored value (\`celsius\`) and a property with getter and setter for \`fahrenheit\`. Setting \`t.fahrenheit = 32\` stores \`0.0\` in \`celsius\`.

## 4. What Is Actually Happening: property Is a Descriptor

\`property\` is a built-in class. \`@property\` over \`def area\` calls \`property(area)\` and stores the resulting **property object** in the class \`__dict__\` under the name \`area\`. Example 2 confirms it:

~~~text
property
True
True True
~~~

That is \`type(Box.__dict__["size"]).__name__\`, then \`Box.size is Box.__dict__["size"]\` (accessing a property on the *class* gives the property object itself), and then that the object has both \`__get__\` and \`__set__\`.

📌 **Interview term: Descriptor** — an object stored on a class that defines \`__get__\`, and optionally \`__set__\` or \`__delete__\`. When you access the attribute through an instance, Python calls those methods instead of returning the object. Functions, \`property\`, \`classmethod\` and \`staticmethod\` are all descriptors. The full protocol is on [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol).

📌 **Interview term: Data descriptor** — a descriptor that defines \`__set__\` or \`__delete__\`. Data descriptors on the class take priority over the instance \`__dict__\`. A descriptor with only \`__get__\` is a *non-data* descriptor, and the instance \`__dict__\` wins over it.

\`property\` always defines \`__set__\` (it raises \`AttributeError\` when there is no setter), so every property is a data descriptor. Example 2 proves the priority: it writes \`999\` straight into the instance \`__dict__\`, and \`b.size\` still returns \`10\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Reading c.radius: Python finds a property on the class, sees it is a data descriptor, and calls its getter before looking at the instance dict">
  <defs>
    <marker id="py14q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="150" text-anchor="middle">c.radius</text>
  <path class="d-edge" d="M 170 145 L 240 145" marker-end="url(#py14q4-arrow)"/>
  <rect class="d-box-accent" x="250" y="100" width="230" height="90" rx="10"/>
  <text class="d-text d-accent" x="365" y="134" text-anchor="middle">Circle.__dict__</text>
  <text class="d-sub" x="365" y="162" text-anchor="middle">radius is a property</text>
  <path class="d-edge-accent" d="M 480 145 L 560 145" marker-end="url(#py14q4-arrow)"/>
  <rect class="d-box" x="570" y="100" width="190" height="90" rx="10"/>
  <text class="d-text" x="665" y="134" text-anchor="middle">fget(c)</text>
  <text class="d-sub" x="665" y="162" text-anchor="middle">returns c._radius</text>
  <rect class="d-box-muted" x="250" y="230" width="230" height="50" rx="8"/>
  <text class="d-sub" x="365" y="260" text-anchor="middle">c.__dict__ not consulted</text>
  <path class="d-edge-dashed" d="M 365 192 L 365 226"/>
  <text class="d-sub" x="365" y="60" text-anchor="middle">data descriptor found first</text>
</svg>

When you read \`c.radius\`, Python looks at the class first, finds a data descriptor and calls its getter with the instance; the instance dictionary is never checked for that name. The complete lookup order is in [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object).

### Why the setter must have the same name

\`@radius.setter\` does **not** modify the existing property. It calls \`radius.setter(func)\`, which returns a *new* property object with the old getter and the new setter, and the \`def\` then binds that new object to the name \`radius\`. Example 2 checks it directly: \`p1.setter(set_x)\` returned an object that \`is not p1\`, \`p1.fset\` stayed \`None\`, and the new one had \`fset is set_x\`. If you named the setter function something else, the class would end up with two properties: a read-only \`radius\` and a second one under the other name.

The decorator form is just a convenient way to call the constructor: \`x = property(get_x, set_x, None, "an x value")\` builds the same thing (\`property(fget, fset, fdel, doc)\`).

## 5. property vs cached_property vs a Method

\`functools.cached_property\` looks similar but works differently: it is a **non-data** descriptor (only \`__get__\`). The first read runs the method and stores the result in the instance \`__dict__\` under the same name; every later read finds that entry first and never calls the method again. Example 2 shows one computation for two reads, the stored value in \`__dict__\`, and a recomputation after \`del r.summary\`.

| | \`@property\` | \`@functools.cached_property\` | plain method |
| :--- | :--- | :--- | :--- |
| Call syntax | \`obj.x\` | \`obj.x\` | \`obj.x()\` |
| Runs the function | on every read | on the first read only | on every call |
| Descriptor kind | data (has \`__set__\`) | non-data | non-data (functions are descriptors too) |
| Setter / validation | yes, with \`@x.setter\` | no; assignment simply overwrites the cache | not applicable |
| Needs an instance \`__dict__\` | no | yes (with \`__slots__\` alone it raises \`TypeError\`) | no |
| Good for | cheap derived values, validation | expensive values that do not change | work with arguments or visible cost |

The [functools documentation](https://docs.python.org/3/library/functools.html#functools.cached_property) notes a 3.12 change: \`cached_property\` no longer holds a lock while computing, so in threaded code two threads may compute the value at the same time. How \`__slots__\` removes the instance dict is covered in [what __slots__ does](/interview-question/what-does-slots-do).

## 6. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — getter, setter, deleter, read-only property and conversion** prints:

~~~text
2 12.57
5 78.54
{'_radius': 5}
ValueError: radius must be non-negative
ValueError in __init__: radius must be non-negative
AttributeError: property 'area' of 'Circle' object has no setter
  deleting radius
False
212.0
0.0
The radius, always a non-negative number.
~~~

**Example 2 — the descriptor underneath, setter copies, property() and cached_property** prints:

~~~text
property
True
True True
10
10
{'size': 999}
False True True
7 an x value
expensive summary expensive summary 1
{'summary': 'expensive summary'}
expensive summary 2
~~~

**What the output shows:**

- \`vars(c)\` is \`{'_radius': 5}\`: only the backing value is stored on the instance; \`radius\` and \`area\` live on the class.
- The setter rejected \`-1\` both on assignment and in \`__init__\`.
- \`del c.radius\` ran the deleter, so \`_radius\` is gone.
- An entry written into the instance \`__dict__\` did not shadow the property: data descriptors win.
- \`cached_property\` ran once for two reads (\`Report.runs\` was \`1\`), stored the value in \`__dict__\`, and ran again after \`del\`.

## 7. Edge Cases

- **Properties are per class, not per instance.** You cannot attach a property to one object; \`obj.x = property(...)\` just stores a property object as data.
- **Inheritance.** A subclass can override only the setter with \`@Base.x.setter\` inside the subclass, which builds a new property from the parent getter. On our run, a \`Sub\` that overrode only the setter to store \`v * 10\` returned \`20\` after \`s.x = 2\`.
- **Exceptions inside a getter.** If a getter raises \`AttributeError\` on a class that defines \`__getattr__\`, Python falls back to \`__getattr__\`, which can hide the real bug. On our run, a getter that raised \`AttributeError("real bug inside getter")\` on such a class silently returned \`__getattr__\`'s value \`fallback for val\`.
- **Abstract properties.** Stack \`@property\` over \`@abc.abstractmethod\` to force subclasses to provide the property.

## Common Pitfalls

- **Recursion in the setter.** Writing \`self.radius = value\` inside the \`radius\` setter calls the setter again until \`RecursionError\`; store the value in \`self._radius\`.
- **Naming the setter differently.** \`@radius.setter def set_radius(...)\` creates a second property and leaves \`radius\` read-only.
- **Expensive or side-effecting getters.** Attribute syntax promises a cheap read; a network call behind \`obj.total\` surprises callers. Use a method, or \`cached_property\` for one-time work.
- **Expecting \`cached_property\` to refresh.** It never recomputes on its own; \`del obj.attr\` clears it.
- **Writing getters and setters up front "just in case".** In Python a plain attribute can become a property later without breaking callers, so start simple.
- **Forgetting that \`__init__\` should go through the setter.** Assigning \`self._radius = radius\` in \`__init__\` skips the validation the setter was written for.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@property</code> turns a method into a managed attribute: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.area</code> runs the getter; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@area.setter</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@area.deleter</code> handle assignment and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">You can start with a plain public attribute and add validation or computation later without changing any caller, so Python avoids Java-style getters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">No setter means read-only (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> on assignment). Store the value as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_radius</code> to avoid recursion, and let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> go through the setter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mechanism:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code> is a data descriptor on the class: lookup finds it before the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fget</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.setter</code> returns a new property, hence the same name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-off:</strong> <span style="color:#f0e2c8;">Keep getters cheap and side-effect free. For an expensive value computed once, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.cached_property</code>, a non-data descriptor that caches in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do the getter and setter have the same name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@radius.setter</code> returns a new property combining the old getter with the new setter, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> binds it to that name. A different name would leave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radius</code> read-only and create a second property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a data descriptor and why does it matter here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An object on the class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__delete__</code>. Data descriptors beat the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, so you cannot bypass a property by writing to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__dict__</code> and reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cached_property</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">property</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs once and stores the result in the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>; being a non-data descriptor, that entry wins on later reads. No setter logic, needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, cleared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del obj.x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a read-only attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define only the getter. Assignment raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>; on 3.11 the message is: property name of class object has no setter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use getters and setters methods instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not up front. Expose a plain attribute; if validation is needed later, convert it to a property and callers keep working. Use a method when the operation is costly or takes arguments.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Property** | Class attribute that runs getter, setter or deleter methods behind plain attribute syntax. |
| **Computed attribute** | An attribute calculated from other state on each read instead of stored. |
| **Encapsulation** | Hiding internal state behind an interface that controls access. |
| **Descriptor** | An object on a class with \`__get__\` (and maybe \`__set__\`, \`__delete__\`) that controls attribute access. |
| **Data descriptor** | A descriptor with \`__set__\` or \`__delete__\`; it takes priority over the instance \`__dict__\`. |

---
**Conclusion:** \`@property\` makes a method look like an attribute: reading runs the getter, and \`@x.setter\` and \`@x.deleter\` handle assignment and \`del\`, so a class can compute, validate or convert values behind a plain \`obj.x\` interface. Its real value is evolution: a public attribute can turn into a property later without touching callers. Underneath, \`property\` is a data descriptor stored on the class, which is why it wins over the instance \`__dict__\` and why \`.setter\` returns a new property that must keep the same name. Keep getters cheap, store the value under a private name, and reach for \`functools.cached_property\` when a value is expensive and computed once.`,
    examples: [
      { label: `Getter, validating setter, deleter and a read-only computed property`, code: `import math

class Circle:
    def __init__(self, radius):
        # goes through the setter below, so it is validated too
        self.radius = radius

    @property
    def radius(self):
        """The radius, always a non-negative number."""
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("radius must be non-negative")
        self._radius = value

    @radius.deleter
    def radius(self):
        print("  deleting radius")
        del self._radius

    @property
    def area(self):
        # read-only and computed on every access
        return round(math.pi * self._radius ** 2, 2)

c = Circle(2)
print(c.radius, c.area)
c.radius = 5
print(c.radius, c.area)
print(vars(c))

try:
    c.radius = -1
except ValueError as err:
    print("ValueError:", err)

try:
    Circle(-3)
except ValueError as err:
    print("ValueError in __init__:", err)

try:
    c.area = 100
except AttributeError as err:
    print("AttributeError:", err)

del c.radius
print(hasattr(c, "_radius"))

# Same public API, upgraded later from a plain attribute to a property:
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def fahrenheit(self):
        return self.celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value):
        self.celsius = (value - 32) * 5 / 9

t = Temperature(100)
print(t.fahrenheit)
t.fahrenheit = 32
print(t.celsius)
print(Circle.radius.__doc__)` },
      { label: `Under the hood: the descriptor, setter copies, property() and cached_property`, code: `import functools

class Box:
    @property
    def size(self):
        return 10

# On the class, the attribute is a property object (a descriptor)
print(type(Box.__dict__["size"]).__name__)  # property
print(Box.size is Box.__dict__["size"])  # True
p = Box.__dict__["size"]
print(hasattr(p, "__get__"), hasattr(p, "__set__"))  # True True

# Box().size really calls property.__get__(instance, owner)
b = Box()
print(p.__get__(b, Box))  # 10

# A property is a DATA descriptor, so it beats the instance __dict__
b.__dict__["size"] = 999
print(b.size)  # 10
print(b.__dict__)  # {'size': 999}

# .setter does not mutate: it returns a NEW property with fset filled in
def get_x(self):
    return self._x
def set_x(self, value):
    self._x = value
p1 = property(get_x)
p2 = p1.setter(set_x)
print(p1 is p2, p1.fset is None, p2.fset is set_x)  # False True True

# The decorator form is the same as calling property() directly
class Manual:
    x = property(get_x, set_x, None, "an x value")

m = Manual()
m.x = 7
print(m.x, Manual.x.__doc__)  # 7 an x value

# Contrast: cached_property is a NON-data descriptor that stores its result
class Report:
    runs = 0

    @functools.cached_property
    def summary(self):
        Report.runs += 1
        return "expensive summary"

r = Report()
print(r.summary, r.summary, Report.runs)
print(r.__dict__)
del r.summary
print(r.summary, Report.runs)` },
    ],
  },
  {
    title: `How does functools.lru_cache work?`,
    difficulty: `medium`,
    seoDescription: `functools.lru_cache explained: memoisation, how the cache key is built, LRU eviction, typed, cache_info, method and mutability pitfalls, verified output.`,
    description: `**Question presented to candidate:**
"Here is a slow recursive Fibonacci. Make it fast with one line from the standard library, then tell me how \`functools.lru_cache\` actually works: what is the key, what happens when it is full, and when is it a bad idea?"

**What a strong answer should cover:**
- Memoisation: results are stored in a dict keyed by the call arguments, so a repeated call returns the stored result; recursive Fibonacci drops from exponential to linear calls.
- The key: built from positional and keyword arguments as passed (so \`f(1, b=2)\` and \`f(a=1, b=2)\` are separate entries); arguments must be hashable; \`typed=True\` separates \`3\` from \`3.0\`.
- LRU eviction: with \`maxsize\` entries (default 128) the least recently used one is dropped; \`maxsize=None\` or \`functools.cache\` (3.9+) never evicts.
- Introspection: \`cache_info()\` (hits, misses, maxsize, currsize), \`cache_clear()\`, \`cache_parameters()\`, and \`__wrapped__\` to bypass the cache.
- Pitfalls: only for pure functions; cached mutable results are shared; on methods \`self\` is part of the key and instances are kept alive.
- CPython detail: the wrapper is a C object (\`_lru_cache_wrapper\`), a hash table plus a doubly linked list, and the cache structure stays consistent under threads, though the function may run more than once.

**Clarifying questions expected:**
- Are the arguments hashable, and is the function pure (no time, I/O or global state)?
- How many distinct inputs are there, and how much memory can the cache use?

**Code / implementation expected:** Yes — decorate a recursive function and show \`cache_info()\`; optionally demonstrate eviction with a small \`maxsize\`.`,
    answer: `**Target Audience:** Python developers who know basic decorators, up to candidates asked about caching internals
**Difficulty:** Medium
**Python version:** behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime)

> **How to read this doc:** Every idea is first explained in plain words. When a term has a precise name an interviewer expects to hear, it is introduced as a 📌 **Interview term** callout. The Quick Glossary at the end lists all of them.

## 1. Why This Even Matters — A Story First

A maths teacher is asked "what is 17 times 23?" by a different student every few minutes. The first time, she works it out on paper: 391. Then she writes "17 x 23 = 391" on a sticky note on her desk. Every later student gets the answer instantly from the note. Her desk only has room for a few notes, so when it is full she throws away the note nobody has asked about for the longest time.

That is \`functools.lru_cache\`. Put \`@lru_cache\` above a function, and the first call with some arguments runs normally and the result is stored; every later call with the same arguments returns the stored result without running the function. When the cache is full, the **least recently used** entry is thrown away. One line can turn an unusably slow function into an instant one, which is why interviewers love it, and why they then ask when it goes wrong.

\`lru_cache\` is itself a decorator (with optional arguments, so a [decorator factory](/interview-question/what-is-a-decorator-factory-a-decorator-with-arguments)); see [what decorators are](/interview-question/what-are-decorators-in-python) if that word is new.

## 2. Memoisation in One Line

📌 **Interview term: Memoisation** — storing the result of a function call keyed by its arguments, and returning the stored result when the same arguments come again, instead of recomputing.

The textbook case is recursive Fibonacci, where \`fib(n)\` calls \`fib(n - 1)\` and \`fib(n - 2)\`, which call the same smaller values again and again. Example 1 counts the calls:

~~~text
uncached calls: 242785
75025
CacheInfo(hits=23, misses=26, maxsize=None, currsize=26)
~~~

The plain version made 242,785 calls to compute \`fib(25)\`. With \`@lru_cache(maxsize=None)\`, each \`n\` from 0 to 25 is computed exactly once (26 misses) and the remaining 23 calls are cache hits. Exponential work became linear, and \`fib(100)\` then returns \`354224848179261915075\` instantly.

📌 **Interview term: Cache hit / cache miss** — a hit is a call answered from the cache; a miss is a call that had to run the function (and then stored the result). \`cache_info()\` counts both.

## 3. How a Call Is Handled

<svg class="iq-diagram" width="100%" viewBox="0 0 780 330" role="img" aria-label="A call builds a key from the arguments; a hit returns the stored result and marks it most recent; a miss calls the function, stores the result, and evicts the least recent entry when full">
  <defs>
    <marker id="py14q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="130" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="160" text-anchor="middle">square(3)</text>
  <text class="d-sub" x="95" y="184" text-anchor="middle">key from args</text>
  <path class="d-edge" d="M 170 165 L 250 165" marker-end="url(#py14q5-arrow)"/>
  <rect class="d-box-accent" x="260" y="130" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="340" y="160" text-anchor="middle">key in table?</text>
  <text class="d-sub" x="340" y="184" text-anchor="middle">dict lookup</text>
  <path class="d-edge-accent" d="M 420 150 L 520 70" marker-end="url(#py14q5-arrow)"/>
  <text class="d-sub" x="450" y="92" text-anchor="middle">hit</text>
  <rect class="d-box" x="530" y="30" width="230" height="70" rx="10"/>
  <text class="d-text" x="645" y="60" text-anchor="middle">return stored result</text>
  <text class="d-sub" x="645" y="84" text-anchor="middle">move to most recent</text>
  <path class="d-edge" d="M 420 180 L 520 250" marker-end="url(#py14q5-arrow)"/>
  <text class="d-sub" x="450" y="244" text-anchor="middle">miss</text>
  <rect class="d-box" x="530" y="220" width="230" height="90" rx="10"/>
  <text class="d-text" x="645" y="250" text-anchor="middle">call the function</text>
  <text class="d-sub" x="645" y="274" text-anchor="middle">store as most recent</text>
  <text class="d-sub" x="645" y="296" text-anchor="middle">evict oldest if full</text>
</svg>

Every call takes one of the two paths. Building the key and the dictionary lookup are cheap compared with most function bodies, so a hit skips almost all of the work.

### What the key is made of

The key is built from the arguments **exactly as they were passed**. The pure-Python fallback in CPython \`Lib/functools.py\`, \`_make_key\`, shows the recipe: the positional arguments, then a unique marker object, then the keyword arguments as name, value pairs in the order given. On our 3.11 run, \`functools._make_key((3, 'a'), {'b': 1}, False)\` produced \`[3, 'a', <object object at 0x...>, 'b', 1]\`.

Two consequences, both shown in Example 1:

- **Spelling matters.** \`describe(1, 2)\`, \`describe(1, b=2)\`, \`describe(a=1, b=2)\` and \`describe(b=2, a=1)\` return the same value but create **4** cache entries. The source comment in \`_make_key\` says this is deliberate: not sorting keyword arguments is much faster.
- **Arguments must be hashable**, because the key goes into a dict. \`half([1, 2])\` raised \`TypeError: unhashable type: 'list'\` before the function ran. Pass a tuple instead of a list, or a \`frozenset\` instead of a set. (Why lists are unhashable: [the hash and eq contract](/interview-question/what-is-the-hash-and-eq-contract).)

📌 **Interview term: Hashable** — an object whose hash never changes and which compares with \`==\`; only hashable objects can be dict keys, so only hashable arguments can be cached.

### typed, and one quirk

Because \`3 == 3.0\` and they hash the same, \`scale(3, 2)\` and \`scale(3.0, 2)\` normally share one entry. \`typed=True\` adds the argument types to the key, giving 2 entries; Example 1 prints \`1 2\`.

The quirk: when a call has **exactly one argument and it is an \`int\` or a \`str\`**, \`_make_key\` returns that argument itself as the key (a speed-up, because those types cache their hash). Any other single argument is wrapped in a sequence object. So \`half(3)\` and \`half(3.0)\` became **2** entries even with \`typed=False\`. The [functools documentation](https://docs.python.org/3/library/functools.html#functools.lru_cache) warns about exactly this: some types such as \`str\` and \`int\` may be cached separately even when \`typed\` is false. Never rely on \`int\` and \`float\` sharing an entry.

## 4. LRU Eviction

📌 **Interview term: LRU (least recently used) eviction** — when a fixed-size cache is full, the entry that was used longest ago is removed to make room. A hit counts as a use, so frequently used entries stay.

With \`maxsize=2\`, Example 1 calls \`square\` with \`1, 2, 1, 3, 2, 1\`:

| Call | Result | Cache after (oldest first) | Why |
| :--- | :--- | :--- | :--- |
| \`square(1)\` | miss | 1 | empty cache |
| \`square(2)\` | miss | 1, 2 | room left |
| \`square(1)\` | **hit** | 2, 1 | 1 becomes most recent |
| \`square(3)\` | miss | 1, 3 | full: evict 2, the oldest |
| \`square(2)\` | miss | 3, 2 | 2 was evicted; evict 1 |
| \`square(1)\` | miss | 2, 1 | 1 was evicted; evict 3 |

The program printed \`computed: [1, 2, 3, 2, 1]\` and \`CacheInfo(hits=1, misses=5, maxsize=2, currsize=2)\`, matching the table. Note that the hit on \`1\` saved it from the first eviction.

The parameter options:

| Setting | Behaviour |
| :--- | :--- |
| \`@lru_cache\` or \`@lru_cache()\` | \`maxsize=128\` (we printed \`cache_parameters()\`: \`{'maxsize': 128, 'typed': False}\`) |
| \`@lru_cache(maxsize=N)\` | at most N entries, LRU eviction; the docs say it performs best when N is a power of two |
| \`@lru_cache(maxsize=None)\` | unbounded, no eviction, no recency bookkeeping |
| \`@functools.cache\` | the same as \`lru_cache(maxsize=None)\`, added in Python 3.9 per the [functools docs](https://docs.python.org/3/library/functools.html#functools.cache) |

Version notes from the same docs: \`lru_cache\` was added in 3.2, \`typed\` in 3.3, the bare \`@lru_cache\` form without parentheses in 3.8, and \`cache_parameters()\` in 3.9.

## 5. What CPython Does Under the Hood

\`type(fib).__name__\` is \`_lru_cache_wrapper\`: in CPython the wrapper is implemented in C (on our run \`functools._lru_cache_wrapper is _functools._lru_cache_wrapper\` was \`True\`: it comes from the C module \`_functools\`), with the pure-Python version in \`Lib/functools.py\` as a fallback for other implementations. Both use the same design:

- a **dict** from key to a link, for O(1) lookup;
- a **circular doubly linked list** of links ordered by recency (the Python source labels each link's fields \`PREV, NEXT, KEY, RESULT\`), so moving a hit to the "most recent" end and removing the oldest entry are both O(1).

Building that structure yourself (with a dict and a linked list, or \`collections.OrderedDict\`) is a classic interview task in its own right: [how an LRU cache works internally](/interview-question/how-does-an-lru-cache-work-internally).

📌 **Interview term: O(1)** — constant time: the cost does not grow with the number of entries. A cache hit, a miss with eviction and a recency update are all O(1).

**Thread safety.** The docs state the cache keeps its data structure coherent under concurrent updates, but the wrapped function may be called more than once if another thread calls it with the same arguments before the first call finishes and is cached. So \`lru_cache\` is safe to share, but it does not guarantee "computed exactly once".

**Introspection and control:** \`cache_info()\` returns a named tuple \`CacheInfo(hits, misses, maxsize, currsize)\`; \`cache_clear()\` empties the cache and resets the counters; \`cache_parameters()\` returns the settings as a dict; and like any well-written decorator it sets \`__wrapped__\` (see [functools.wraps](/interview-question/why-use-functools-wraps-when-writing-decorators)), so \`f.__wrapped__(x)\` calls the original without touching the cache.

## 6. When It Goes Wrong

Example 2 reproduces three problems.

**Shared mutable results.** The cache returns *the same object* every time. \`default_tags()\` returned a list; the caller appended to it, and every later call now returns \`['python', 'oops']\`. Return immutable values (a tuple) and copy when you need a list.

**Methods keep instances alive.** \`@lru_cache\` on a method caches on the *function*, which lives on the class, so \`self\` becomes part of every key. The cache holds a strong reference to each instance, which then never dies while its entry stays:

~~~text
alive after del: True
alive after cache_clear: False
~~~

A \`weakref\` to the \`Model\` instance was still alive after \`del m\`, and only \`Model.predict.cache_clear()\` released it. One fix is a per-instance cache created in \`__init__\`, \`self.predict = functools.lru_cache(maxsize=256)(self._predict)\`, which dies with the instance (note this creates a reference cycle, instance to cache to bound method to instance: on our run the weakref was still alive right after \`del\`, and dead after \`gc.collect()\`). Another is \`functools.cached_property\` when the method takes no arguments (see [the @property decorator](/interview-question/what-is-the-property-decorator)).

**Impure functions go stale.** \`now_label()\` reads a global clock. After the clock changed to 99, the cached call still said \`t=0\`; only \`now_label.__wrapped__()\` (bypassing the cache) saw \`t=99\`. Never cache functions that depend on time, randomness, I/O, or mutable global state, unless stale answers are acceptable and you clear the cache deliberately.

📌 **Interview term: Pure function** — a function whose result depends only on its arguments and which has no side effects. Only pure functions can be cached safely.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — memoised Fibonacci, eviction, key spelling, typed, hashability and the C wrapper** prints:

~~~text
uncached calls: 242785
75025
CacheInfo(hits=23, misses=26, maxsize=None, currsize=26)
354224848179261915075
computed: [1, 2, 3, 2, 1]
CacheInfo(hits=1, misses=5, maxsize=2, currsize=2)
same answer, entries: 4
1 2
2
TypeError: unhashable type: 'list'
{'maxsize': None, 'typed': False}
_lru_cache_wrapper
CacheInfo(hits=0, misses=0, maxsize=None, currsize=0)
~~~

**Example 2 — shared mutable results, methods keeping instances alive, stale results** prints:

~~~text
['python', 'oops']
('python',)
alive after del: True
alive after cache_clear: False
CacheInfo(hits=1, misses=1, maxsize=256, currsize=1)
t=0
t=0 (stale)
t=99
~~~

**What the output shows:**

- 242,785 uncached calls against 26 misses and 23 hits with the cache.
- The eviction order \`[1, 2, 3, 2, 1]\`: least recently used, not least recently added.
- Four entries for one logical call spelled four ways; \`typed\` adds a type split; a lone \`int\` or \`float\` already splits.
- \`cache_clear()\` reset the counters to zero; \`cache_parameters()\` reported the settings.
- A cached list mutated by one caller leaked into every later call; a cached method pinned its instance in memory.

## Common Pitfalls

- **Caching impure functions.** Anything that reads the clock, a file, the network or mutable globals returns stale data from the cache.
- **Returning mutable objects.** Every caller gets the same list or dict; one mutation changes the cached value for everyone.
- **\`@lru_cache\` on instance methods.** \`self\` is in the key, instances are kept alive, and the cache is shared across all instances; prefer a per-instance cache or \`cached_property\`.
- **Passing unhashable arguments.** Lists, dicts and sets raise \`TypeError\`; convert to tuples or frozensets at the call site.
- **Unbounded caches on unbounded inputs.** \`maxsize=None\` or \`@cache\` keyed on user IDs or request data grows forever; pick a \`maxsize\`.
- **Assuming one entry per logical call.** Keyword spelling and argument types create extra entries, so hit rates can be lower than expected; check \`cache_info()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> memoises: it stores results in a dict keyed by the call arguments and returns the stored result for a repeat call. Recursive Fibonacci goes from exponential to linear.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key:</strong> <span style="color:#f0e2c8;">Built from positional and keyword arguments as passed, so arguments must be hashable and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(1, b=2)</code> differs from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(a=1, b=2)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typed=True</code> splits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3.0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Eviction:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxsize</code> entries (default 128) the least recently used is dropped; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxsize=None</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.cache</code> (3.9+) is unbounded.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Internals:</strong> <span style="color:#f0e2c8;">In CPython a C <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_lru_cache_wrapper</code>: a hash table plus a doubly linked list, so everything is O(1). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_info()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_clear()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code> to bypass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When not to:</strong> <span style="color:#f0e2c8;">Only pure functions. Cached mutable results are shared; on methods <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is in the key and instances stay alive; unbounded caches can grow forever.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@lru_cache</code> on a method a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cache lives on the class function, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is part of every key: entries are not shared usefully, and the cache holds strong references that keep instances alive. Use a per-instance cache or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with unhashable arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Building the key fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type</code> before the function runs. Convert lists to tuples, or cache an inner function that takes hashable arguments.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache</code> thread safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its data structure stays consistent under threads, but the function can run more than once for the same arguments if two threads miss at the same time. It is not a once-only guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement it yourself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A dict from key to node plus a doubly linked list ordered by recency, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code>. Get, put and evict are all O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache(maxsize=None)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None in behaviour: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache</code> is the 3.9 shorthand for an unbounded <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code>. Unbounded caches skip the recency bookkeeping, so they are slightly faster but never shrink.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Memoisation** | Storing results keyed by arguments and reusing them for repeat calls. |
| **Cache hit / cache miss** | A call answered from the cache versus one that ran the function. |
| **Hashable** | Has a stable hash and \`==\`; required for dict keys and so for cached arguments. |
| **LRU (least recently used) eviction** | Removing the entry used longest ago when the cache is full. |
| **O(1)** | Constant time, independent of how many entries there are. |
| **Pure function** | Result depends only on the arguments, with no side effects; safe to cache. |

---
**Conclusion:** \`functools.lru_cache\` memoises a function: it builds a key from the arguments exactly as passed, looks it up in a hash table, and on a miss calls the function and stores the result, evicting the least recently used entry once \`maxsize\` (default 128) is reached. In CPython it is a C object combining a dict with a doubly linked list, so hits, misses and evictions are O(1), and \`cache_info()\`, \`cache_clear()\` and \`__wrapped__\` let you inspect and bypass it. It turns repeated or recursive work from exponential to linear, but only for pure functions with hashable arguments; watch for shared mutable results, methods that pin instances in memory, and unbounded growth.`,
    examples: [
      { label: `Memoised Fibonacci, LRU eviction, key spelling, typed and hashability`, code: `from functools import lru_cache, cache

# 1. Memoised recursion: exponential calls become linear
calls = 0
def fib_slow(n):
    global calls
    calls += 1
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

fib_slow(25)
print("uncached calls:", calls)

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(25))  # 75025
print(fib.cache_info())
print(fib(100))  # 354224848179261915075

# 2. LRU eviction with a tiny cache: watch which key gets dropped
computed = []
@lru_cache(maxsize=2)
def square(n):
    computed.append(n)
    return n * n

for n in [1, 2, 1, 3, 2, 1]:
    square(n)
print("computed:", computed)
print(square.cache_info())

# 3. The key is built from the arguments exactly as passed
@lru_cache(maxsize=128)
def describe(a, b=0):
    return a + b

describe(1, 2)
describe(1, b=2)
describe(a=1, b=2)
describe(b=2, a=1)
print("same answer, entries:", describe.cache_info().currsize)  # same answer, entries: 4

# 4. typed=True keeps 3 and 3.0 apart (they are equal, so normally one entry)
@lru_cache(maxsize=None)
def scale(x, factor):
    return x * factor

@lru_cache(maxsize=None, typed=True)
def scale_typed(x, factor):
    return x * factor

scale(3, 2); scale(3.0, 2)
scale_typed(3, 2); scale_typed(3.0, 2)
print(scale.cache_info().currsize, scale_typed.cache_info().currsize)  # 1 2

# Quirk: a lone int or str argument is used as the key itself (a fast path),
# so with ONE argument 3 and 3.0 get separate entries even when typed=False
@lru_cache(maxsize=None)
def half(x):
    return x / 2

half(3); half(3.0)
print(half.cache_info().currsize)  # 2

# 5. Arguments must be hashable
try:
    half([1, 2])
except TypeError as err:
    print("TypeError:", err)

# 6. cache is lru_cache(maxsize=None); the wrapper is a C object
@cache
def ident(x):
    return x
print(ident.cache_parameters())  # {'maxsize': None, 'typed': False}
print(type(ident).__name__)  # _lru_cache_wrapper
fib.cache_clear()
print(fib.cache_info())` },
      { label: `Pitfalls: shared mutable results, cached methods keeping instances alive, stale data`, code: `import functools
import weakref

# Pitfall 1: the cache returns the SAME object each time
@functools.lru_cache(maxsize=None)
def default_tags():
    return ["python"]

tags = default_tags()
tags.append("oops")
print(default_tags())  # ['python', 'oops']

# Fix: cache an immutable value (tuple) and copy when you need a list
@functools.lru_cache(maxsize=None)
def safe_tags():
    return ("python",)
mine = list(safe_tags())
mine.append("fine")
print(safe_tags())  # ('python',)

# Pitfall 2: caching a method keys on self and keeps every instance alive
class Model:
    def __init__(self, name):
        self.name = name

    @functools.lru_cache(maxsize=None)
    def predict(self, x):
        return x * 2

m = Model("m1")
alive = weakref.ref(m)
m.predict(21)
del m
print("alive after del:", alive() is not None)
Model.predict.cache_clear()
print("alive after cache_clear:", alive() is not None)

# One fix: cache per instance in __init__ (dies with the instance)
class Model2:
    def __init__(self, name):
        self.name = name
        self.predict = functools.lru_cache(maxsize=256)(self._predict)

    def _predict(self, x):
        return x * 2

m2 = Model2("m2")
m2.predict(5)
m2.predict(5)
print(m2.predict.cache_info())

# Pitfall 3: impure functions return stale answers
clock = [0]
@functools.lru_cache(maxsize=None)
def now_label():
    return "t=" + str(clock[0])

print(now_label())
clock[0] = 99
print(now_label(), "(stale)")

# __wrapped__ bypasses the cache for one fresh call
print(now_label.__wrapped__())  # t=99` },
    ],
  },
];

export default augments;
