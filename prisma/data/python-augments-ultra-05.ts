/**
 * PYTHON ULTRA — batch 05: Functions I (*args/**kwargs, parameter kinds,
 * argument passing, mutable defaults, lambda/map/filter/reduce). Every example
 * was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What do *args and **kwargs mean?`,
    difficulty: "easy",
    seoDescription: `In a def, *args packs extra positional arguments into a tuple and **kwargs packs extra keywords into a dict; in a call the stars unpack.`,
    description: `**Question presented to candidate:**
"You see \`def handler(*args, **kwargs)\` all over a codebase. What do the single and double star actually do, what types do \`args\` and \`kwargs\` end up as, and how is that different from putting a star in front of something when you call a function?"

**What a strong answer should cover:**
- In a definition, \`*args\` collects any extra positional arguments into a **tuple** and \`**kwargs\` collects any extra keyword arguments into a **dict**; the names are convention, the stars are the syntax
- At a call site the stars do the reverse: \`f(*seq)\` spreads an iterable into positional arguments and \`f(**mapping)\` spreads a mapping into keyword arguments (string keys only)
- Parameter order: regular parameters, then \`*args\`, then keyword-only parameters, then \`**kwargs\`; anything after \`*args\` can only be passed by keyword
- The forwarding pattern \`def wrapper(*args, **kwargs): return func(*args, **kwargs)\` used by decorators, and the cost: a vaguer signature for callers and type checkers
- Details: each call gets a fresh tuple and dict, \`kwargs\` keeps the caller order (guaranteed since Python 3.6, PEP 468), and filling the same parameter twice raises \`TypeError\`

**Code / implementation expected:** Optional — a few lines showing packing in a \`def\` and unpacking in a call, ideally a small forwarding wrapper.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — you know how to write a basic \`def\` and call it.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a coat check at a theatre. The attendant has one hook with your name on it — that is a normal parameter. But some guests arrive with extra bags. The attendant does not refuse them: unlabelled bags go into one numbered bin, in the order they were handed over, and bags with a name tag go into a labelled cabinet where each tag is the key.

\`*args\` is the numbered bin. \`**kwargs\` is the labelled cabinet. A function that declares them can accept **any number** of extra things without knowing in advance how many will arrive. That is why you see them in logging helpers, decorators, framework hooks and anything that "passes things through" to another function.

There is a second half to the story: the stars also work in reverse. If you already *have* a bin of bags (a list) or a cabinet (a dict), a star at the **call site** empties it back out into separate arguments.

## 2. The Core Idea: Pack in a \`def\`, Unpack in a Call

The star means opposite things depending on where it appears:

| Where the star is | \`*\` does | \`**\` does |
| :--- | :--- | :--- |
| In a \`def\` (parameter list) | **packs** extra positional arguments into a \`tuple\` | **packs** extra keyword arguments into a \`dict\` |
| In a call (argument list) | **unpacks** any iterable into positional arguments | **unpacks** a mapping into keyword arguments |
| In a list / tuple / set / dict display | spreads an iterable into the new container | spreads a mapping into the new dict |

📌 **Interview term: variadic parameter** — a parameter that accepts a variable number of arguments. \`*args\` is the *var-positional* parameter and \`**kwargs\` is the *var-keyword* parameter; \`inspect\` calls them \`VAR_POSITIONAL\` and \`VAR_KEYWORD\`.

📌 **Interview term: argument packing / unpacking** — packing is collecting many arguments into one tuple or dict (in a \`def\`); unpacking is spreading one iterable or mapping into many arguments (in a call). Interviewers sometimes say *splat* for the star.

The names \`args\` and \`kwargs\` are only a convention. \`def tally(*items, **options)\` works exactly the same; the stars do all the work.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="A call with extra arguments is split into a named parameter, an args tuple and a kwargs dict">
  <defs>
    <marker id="py05q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="26" text-anchor="middle">collect(1, 2, 3, sep="+", colour="red", size=9)</text>
  <rect class="d-box-muted" x="30" y="60" width="200" height="80" rx="10"/>
  <text class="d-text" x="130" y="94" text-anchor="middle">positional</text>
  <text class="d-sub" x="130" y="120" text-anchor="middle">1, 2, 3</text>
  <rect class="d-box-muted" x="30" y="200" width="200" height="80" rx="10"/>
  <text class="d-text" x="130" y="234" text-anchor="middle">keyword</text>
  <text class="d-sub" x="130" y="260" text-anchor="middle">sep, colour, size</text>
  <rect class="d-box" x="470" y="50" width="220" height="56" rx="10"/>
  <text class="d-text" x="580" y="84" text-anchor="middle">first = 1</text>
  <rect class="d-box-accent" x="470" y="124" width="220" height="56" rx="10"/>
  <text class="d-text" x="580" y="158" text-anchor="middle">args = (2, 3)  tuple</text>
  <rect class="d-box" x="470" y="198" width="220" height="56" rx="10"/>
  <text class="d-text" x="580" y="232" text-anchor="middle">sep = "+"</text>
  <rect class="d-box-accent" x="470" y="272" width="220" height="50" rx="10"/>
  <text class="d-text" x="580" y="302" text-anchor="middle">kwargs = dict of 2</text>
  <path class="d-edge" d="M 234 90 L 464 78" marker-end="url(#py05q1-arrow)"/>
  <path class="d-edge-accent" d="M 234 115 L 464 152" marker-end="url(#py05q1-arrow)"/>
  <path class="d-edge" d="M 234 230 L 464 226" marker-end="url(#py05q1-arrow)"/>
  <path class="d-edge-accent" d="M 234 255 L 464 296" marker-end="url(#py05q1-arrow)"/>
</svg>

Python fills the named parameters first, then whatever positional arguments are left go into \`args\` and whatever keyword arguments matched no name go into \`kwargs\`.

## 3. Packing, Step by Step

~~~python
def collect(first, *args, sep="-", **kwargs):
    print("first :", first)
    print("args  :", args, type(args).__name__)
    print("sep   :", sep)
    print("kwargs:", kwargs, type(kwargs).__name__)

collect(1, 2, 3, sep="+", colour="red", size=9)
collect("only")
~~~

~~~text
first : 1
args  : (2, 3) tuple
sep   : +
kwargs: {'colour': 'red', 'size': 9} dict
first : only
args  : () tuple
sep   : -
kwargs: {} dict
~~~

What to notice:

- \`args\` is always a **tuple** (immutable, so nobody can accidentally append to it) and \`kwargs\` is always a **dict**. When nothing extra is passed they are simply empty: \`()\` and \`{}\`.
- \`sep\` comes **after** \`*args\`, so it can only be given by name. \`*args\` swallows every remaining positional argument, which leaves no position for \`sep\`. That makes \`sep\` a keyword-only parameter.
- Order in \`kwargs\` follows the order the caller typed. That is guaranteed since Python 3.6 by [PEP 468](https://peps.python.org/pep-0468/); the example shows \`order(z=1, a=2, m=3)\` giving \`['z', 'a', 'm']\`.

📌 **Interview term: keyword-only parameter** — a parameter that appears after \`*args\` (or after a bare \`*\`) and therefore can only be passed as \`name=value\`. Introduced in Python 3.0 by [PEP 3102](https://peps.python.org/pep-3102/). The full story of \`*\`, \`/\` and defaults is in [How do default, keyword-only and positional-only parameters work?](/interview-question/how-do-default-keyword-only-and-positional-only-parameters-work)

### What CPython records

When \`def\` runs, CPython compiles the body into a code object and marks the variadic parameters with flags. You can see them:

~~~python
import inspect
kinds = [p.kind.name for p in inspect.signature(collect).parameters.values()]
print(kinds)
flags = collect.__code__.co_flags
print(bool(flags & inspect.CO_VARARGS), bool(flags & inspect.CO_VARKEYWORDS))
print(collect.__code__.co_argcount, collect.__code__.co_kwonlyargcount)
~~~

~~~text
['POSITIONAL_OR_KEYWORD', 'VAR_POSITIONAL', 'KEYWORD_ONLY', 'VAR_KEYWORD']
True True
1 1
~~~

\`co_argcount\` is 1 (only \`first\` can be filled by position) and \`co_kwonlyargcount\` is 1 (\`sep\`); \`args\` and \`kwargs\` are not counted, they are signalled by the \`CO_VARARGS\` and \`CO_VARKEYWORDS\` flags. On every call the interpreter builds a **new** tuple and a **new** dict for them — the example checks \`first_call[1] is second_call[1]\` and gets \`False\`.

## 4. The Parameter Order Rule

A full signature can mix every kind, but only in this order:

~~~python
def f(pos_only, /, normal, *args, kw_only, **kwargs):
    ...
~~~

1. positional-only parameters, then \`/\` (Python 3.8+)
2. normal positional-or-keyword parameters
3. \`*args\` (or a bare \`*\` if you want keyword-only parameters but no \`*args\`)
4. keyword-only parameters
5. \`**kwargs\`, always last

There can be at most one \`*args\` and one \`**kwargs\`. Putting \`**kwargs\` anywhere but last is a \`SyntaxError\`.

## 5. Unpacking at the Call Site

~~~python
def area(width, height, unit="cm"):
    return f"{width * height} {unit}^2"

size = (3, 4)
opts = {"unit": "m"}
print(area(*size))                         # same as area(3, 4)
print(area(*size, **opts))                 # same as area(3, 4, unit="m")
print(area(**{"width": 2, "height": 5}))   # dict keys become parameter names
~~~

Since Python 3.5 ([PEP 448](https://peps.python.org/pep-0448/)) you can use several unpackings in one call and inside container displays, which is the idiomatic way to merge:

~~~python
print([*a, *b, 4])       # [1, 2, 3, 4]
print({**d1, **d2})      # later keys win: {'x': 9, 'y': 2}
~~~

📌 **Interview term: argument forwarding** — accepting \`*args, **kwargs\` and passing them on unchanged with \`func(*args, **kwargs)\`. It is the backbone of every general-purpose decorator:

~~~python
def logged(func):
    def wrapper(*args, **kwargs):
        print("calling", func.__name__, args, kwargs)
        return func(*args, **kwargs)
    return wrapper
~~~

The wrapper does not need to know the wrapped function's signature at all. See [What are decorators in Python?](/interview-question/what-are-decorators-in-python) and [Why use functools.wraps when writing decorators?](/interview-question/why-use-functools-wraps-when-writing-decorators) for the rest of that pattern.

## 6. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner. Example 1, packing:

~~~text
first : 1
args  : (2, 3) tuple
sep   : +
kwargs: {'colour': 'red', 'size': 9} dict
---
first : only
args  : () tuple
sep   : -
kwargs: {} dict
---
(3, ['a', 'b'])
(0, [])
['z', 'a', 'm']
True False
['POSITIONAL_OR_KEYWORD', 'VAR_POSITIONAL', 'KEYWORD_ONLY', 'VAR_KEYWORD']
True True
1 1
~~~

Example 2, unpacking, forwarding and the three \`TypeError\` cases:

~~~text
12 cm^2
12 m^2
10 cm^2
[1, 2, 3, 4]
{'x': 9, 'y': 2}
calling area (2, 3) {'unit': 'mm'}
6 mm^2
{'debug': False, 'added': True} {'debug': False}
TypeError: area() got multiple values for argument 'width'
TypeError: keywords must be strings
TypeError: area() missing 1 required positional argument: 'height'
~~~

Three things the run proves rather than asserts:

- \`**kwargs\` inside the function is a **new** dict. \`tweak(**settings)\` added a key to its own \`kw\`, and the caller's \`settings\` stayed \`{'debug': False}\`. (The *values* are still shared objects — a list inside it would be the same list. See [Is Python pass-by-value or pass-by-reference?](/interview-question/is-python-pass-by-value-or-pass-by-reference))
- \`area(*size, **{"width": 1})\` fails with \`got multiple values for argument 'width'\`: the tuple already filled \`width\` by position.
- \`area(**{1: "x"})\` fails with \`keywords must be strings\`: parameter names are identifiers, so the mapping must have string keys.

## 7. When to Use Them — and When Not To

| Use \`*args\` / \`**kwargs\` when | Prefer explicit parameters when |
| :--- | :--- |
| Writing a decorator or proxy that forwards to another callable | The function has a fixed, known set of inputs |
| The function is naturally variadic, like \`print(*objects)\` or \`max(a, b, c)\` | You want \`help()\`, IDE autocomplete and type checkers to show real names |
| A subclass passes options up with \`super().__init__(**kwargs)\` | A typo like \`colour=\` vs \`color=\` should fail loudly instead of disappearing into \`kwargs\` |

That last row is the real cost: a function that takes \`**kwargs\` and ignores unknown keys silently accepts misspelled options. For typing, \`*args: int\` means *each* positional argument is an \`int\`, and \`**kwargs: str\` means each value is a \`str\`; to type each keyword separately use \`Unpack[TypedDict]\` — see [How do Unpack and TypedDict enable type-safe **kwargs?](/interview-question/how-do-unpack-and-typeddict-enable-type-safe-kwargs)

## Edge Cases Worth Knowing

- \`f(*"abc")\` passes \`'a', 'b', 'c'\` — any iterable unpacks, including strings, generators and dict keys.
- \`f(**d)\` where \`d\` has a key that is not a parameter (and \`f\` has no \`**kwargs\`) raises \`TypeError: ... got an unexpected keyword argument\`.
- The same name cannot be both in the explicit keywords and in an unpacked dict: \`f(x=1, **{"x": 2})\` raises \`TypeError\`.
- Lambdas accept the same syntax: \`lambda *a, **k: (a, k)\`.

## Common Pitfalls

- **Thinking \`args\` is a list.** It is a tuple; \`args.append(...)\` raises \`AttributeError\`. Convert with \`list(args)\` if you need to change it.
- **Swallowing typos.** \`def connect(**kwargs)\` that reads \`kwargs.get("timeout")\` will silently ignore \`timout=5\`. Name the parameters you actually use.
- **Forgetting the stars when forwarding.** \`func(args, kwargs)\` passes one tuple and one dict as two positional arguments; you need \`func(*args, **kwargs)\`.
- **Putting a parameter after \`*args\` and expecting it to be positional.** In \`def f(*args, flag=False)\`, \`flag\` is keyword-only; \`f(1, 2, True)\` puts \`True\` into \`args\`.
- **Duplicate values when unpacking.** Mixing \`*seq\` with \`**mapping\` that names an already-filled parameter raises \`got multiple values for argument\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition side:</strong> <span style="color:#f0e2c8;">In a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args</code> collects extra positional arguments into a <strong style="color:#ffca28;">tuple</strong> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code> collects extra keyword arguments into a <strong style="color:#ffca28;">dict</strong>. The names are convention; the stars are the syntax.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Call side:</strong> <span style="color:#f0e2c8;">At a call site the stars reverse: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(*seq)</code> spreads an iterable into positional arguments and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(**d)</code> spreads a string-keyed mapping into keyword arguments.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Normal parameters, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args</code>, then keyword-only parameters, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code> last. Anything after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args</code> can only be passed by name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Main use:</strong> <span style="color:#f0e2c8;">Forwarding: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def wrapper(*args, **kwargs): return func(*args, **kwargs)</code> is how decorators wrap any function without knowing its signature.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">Each call gets a fresh tuple and dict, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kwargs</code> keeps caller order since 3.6 (PEP 468), and the trade-off is a vaguer signature that can swallow typos.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">args</code> a tuple and not a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a fresh, fixed snapshot of what the caller passed. A tuple is immutable, and nothing in the function should need to grow it. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(args)</code> if you do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I change <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">kwargs</code> inside the function, does the caller see it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not the dict itself: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code> is a new dict on every call, so adding or removing keys is local. The values are the same objects, though, so mutating a list stored in it is visible to the caller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f(1, **{"a": 2})</code> when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f</code> is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">def f(a, b)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: f() got multiple values for argument 'a'</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> already filled <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> by position, then the dict tried to fill it again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type-hint <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*args</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">**kwargs</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args: int</code> means every positional argument is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs: str</code> means every value is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>. For per-key types use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs: Unpack[SomeTypedDict]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">**kwargs</code> ordered?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Since Python 3.6 (PEP 468) the dict preserves the order the keywords were written in the call, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> itself is insertion-ordered from 3.7 as a language guarantee.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Variadic parameter | A parameter that accepts any number of arguments: \`*args\` (var-positional) or \`**kwargs\` (var-keyword) |
| Argument packing / unpacking | Collecting many arguments into one tuple or dict in a \`def\`; spreading an iterable or mapping into many arguments in a call |
| Keyword-only parameter | A parameter after \`*args\` or a bare \`*\`; it can only be passed as \`name=value\` |
| Argument forwarding | Passing \`*args, **kwargs\` on unchanged to another callable, as decorators do |

**Conclusion:** The star is one piece of syntax with two directions. In a \`def\`, \`*args\` packs leftover positional arguments into a tuple and \`**kwargs\` packs leftover keyword arguments into an ordered dict, built fresh for every call. In a call, \`*\` and \`**\` unpack an iterable or a string-keyed mapping back into separate arguments. Together they make forwarding wrappers trivial, and the trade-off to mention is that they hide the real signature, so use them where a function is genuinely variadic or a pass-through, and explicit parameters everywhere else.`,
    examples: [
      {
        label: `Packing: what *args and **kwargs receive`,
        code: `# *args collects extra positional arguments into a tuple,
# **kwargs collects extra keyword arguments into a dict.
def collect(first, *args, sep="-", **kwargs):
    print("first :", first)
    print("args  :", args, type(args).__name__)
    print("sep   :", sep)
    print("kwargs:", kwargs, type(kwargs).__name__)

collect(1, 2, 3, sep="+", colour="red", size=9)
print("---")
collect("only")
print("---")

# The names are only a convention: the stars do the work.
def tally(*items, **options):
    return len(items), sorted(options)

print(tally(1, 2, 3, b=1, a=2))  # (3, ['a', 'b'])
print(tally())  # (0, [])

# kwargs keeps the order the caller wrote (guaranteed since 3.6, PEP 468).
def order(**kwargs):
    return list(kwargs)

print(order(z=1, a=2, m=3))  # ['z', 'a', 'm']

# Each call gets a brand-new tuple and dict.
def grab(*args, **kwargs):
    return args, kwargs

first_call = grab(1, k=1)
second_call = grab(1, k=1)
print(first_call == second_call, first_call[1] is second_call[1])  # True False

# What CPython recorded about the signature.
import inspect
kinds = [p.kind.name for p in inspect.signature(collect).parameters.values()]
print(kinds)
flags = collect.__code__.co_flags
print(bool(flags & inspect.CO_VARARGS), bool(flags & inspect.CO_VARKEYWORDS))  # True True
print(collect.__code__.co_argcount, collect.__code__.co_kwonlyargcount)  # 1 1`,
      },
      {
        label: `Unpacking at the call site, forwarding and the TypeError gotchas`,
        code: `# At a CALL site the stars do the opposite: they unpack.
def area(width, height, unit="cm"):
    return f"{width * height} {unit}^2"

size = (3, 4)
opts = {"unit": "m"}
print(area(*size))  # 12 cm^2
print(area(*size, **opts))  # 12 m^2
print(area(**{"width": 2, "height": 5}))  # 10 cm^2

# Several unpackings in one call or display (PEP 448, Python 3.5).
a = [1, 2]
b = (3,)
print([*a, *b, 4])  # [1, 2, 3, 4]
d1 = {"x": 1}
d2 = {"x": 9, "y": 2}
print({**d1, **d2})  # {'x': 9, 'y': 2}

# Forwarding: a wrapper that passes every argument through unchanged.
def logged(func):
    def wrapper(*args, **kwargs):
        print("calling", func.__name__, args, kwargs)
        return func(*args, **kwargs)
    return wrapper

logged_area = logged(area)
print(logged_area(2, 3, unit="mm"))

# **kwargs is a NEW dict: changing it does not change the caller's dict.
def tweak(**kw):
    kw["added"] = True
    return kw

settings = {"debug": False}
print(tweak(**settings), settings)  # {'debug': False, 'added': True} {'debug': False}

# Gotcha 1: the same parameter filled twice.
try:
    area(*size, **{"width": 1})
except TypeError as e:
    print("TypeError:", e)

# Gotcha 2: keyword names must be strings.
try:
    area(**{1: "x"})
except TypeError as e:
    print("TypeError:", e)

# Gotcha 3: a too-short tuple.
try:
    area(*[7])
except TypeError as e:
    print("TypeError:", e)`,
      },
    ],
  },
  {
    title: `How do default, keyword-only and positional-only parameters work?`,
    difficulty: "medium",
    seoDescription: `Python parameters can have defaults, be keyword-only after * or positional-only before /. Rules, error messages and CPython internals, verified.`,
    description: `**Question presented to candidate:**
"Walk me through this signature: \`def connect(host, port=5432, /, timeout=10, *, retries=3)\`. What do the slash and the star mean, how are the defaults stored, and why would an API designer choose positional-only or keyword-only parameters?"

**What a strong answer should cover:**
- The five parameter kinds: positional-only (before \`/\`, Python 3.8+, PEP 570), positional-or-keyword, \`*args\`, keyword-only (after \`*\` or \`*args\`, Python 3.0+, PEP 3102), \`**kwargs\`
- Defaults are evaluated **once** when \`def\` runs and stored on the function (\`__defaults__\`, \`__kwdefaults__\`); that is why mutable defaults are shared
- Ordering rules: a parameter without a default cannot follow one with a default among positional parameters, but keyword-only parameters can be required (no default) in any order
- Why keyword-only: readable call sites for flags and options (\`retries=3\` instead of a mystery \`3\`); why positional-only: the name is not part of the API, so it can be renamed, and the name stays free for \`**kwargs\`, matching builtins like \`len()\` and \`divmod()\`
- The exact \`TypeError\` messages for each misuse, and that \`inspect.signature\` / \`Signature.bind\` show how Python maps arguments to parameters

**Code / implementation expected:** Yes — write a signature that uses \`/\` and \`*\`, and show which calls succeed and which raise \`TypeError\`.`,
    answer: `**Target Audience:** Beginners to intermediate — you can write functions and have seen \`*args\`.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the \`SyntaxError\` wording was also checked on 3.12.3 and 3.13.16.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a paper form at a bank. A few boxes at the top have no labels: "first box is your account number, second box is the branch". You fill them by **position** — nobody cares what the bank internally calls them. Further down the form there are boxes that must be ticked **by label**: "Send paper statements? ☐ yes". Nobody wants to fill that one by counting boxes. And many boxes come **pre-filled** with a sensible value you only change if you need to.

A Python signature can express all three: boxes that must be filled by position (positional-only), boxes that must be filled by label (keyword-only), and pre-filled boxes (defaults). Getting this right is how you design a function that is hard to call wrongly and easy to change later.

## 2. The Five Kinds of Parameter

📌 **Interview term: parameter vs argument** — a *parameter* is the name in the \`def\`; an *argument* is the value passed in the call. "Positional argument" means passed by position (\`f(1)\`); "keyword argument" means passed by name (\`f(x=1)\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A signature split by the slash and the star into positional only, positional or keyword, and keyword only zones">
  <text class="d-text" x="380" y="30" text-anchor="middle">def connect(host, port=5432, /, timeout=10, *, retries=3, verbose=False)</text>
  <rect class="d-box-accent" x="20" y="70" width="210" height="110" rx="10"/>
  <text class="d-text" x="125" y="104" text-anchor="middle">positional only</text>
  <text class="d-sub" x="125" y="132" text-anchor="middle">host, port</text>
  <text class="d-sub" x="125" y="158" text-anchor="middle">left of the slash</text>
  <rect class="d-box" x="275" y="70" width="210" height="110" rx="10"/>
  <text class="d-text" x="380" y="104" text-anchor="middle">positional or keyword</text>
  <text class="d-sub" x="380" y="132" text-anchor="middle">timeout</text>
  <text class="d-sub" x="380" y="158" text-anchor="middle">between them</text>
  <rect class="d-box-accent" x="530" y="70" width="210" height="110" rx="10"/>
  <text class="d-text" x="635" y="104" text-anchor="middle">keyword only</text>
  <text class="d-sub" x="635" y="132" text-anchor="middle">retries, verbose</text>
  <text class="d-sub" x="635" y="158" text-anchor="middle">right of the star</text>
  <text class="d-sub" x="125" y="220" text-anchor="middle">connect("db", 6000)</text>
  <text class="d-sub" x="380" y="220" text-anchor="middle">timeout=5 or a 3rd value</text>
  <text class="d-sub" x="635" y="220" text-anchor="middle">retries=0 only</text>
</svg>

The bottom row shows how each zone may be filled. The marker \`/\` and the marker \`*\` are not parameters themselves; they only split the list into zones.

| Kind | How it is written | How callers pass it | \`inspect\` name |
| :--- | :--- | :--- | :--- |
| Positional-only | before \`/\` | by position only | \`POSITIONAL_ONLY\` |
| Positional-or-keyword | the default kind | either way | \`POSITIONAL_OR_KEYWORD\` |
| Var-positional | \`*args\` | extra positionals collected into a tuple | \`VAR_POSITIONAL\` |
| Keyword-only | after \`*\` or \`*args\` | by name only | \`KEYWORD_ONLY\` |
| Var-keyword | \`**kwargs\` | extra keywords collected into a dict | \`VAR_KEYWORD\` |

📌 **Interview term: positional-only parameter** — a parameter before \`/\`; passing it by name raises \`TypeError\`. Added for pure-Python functions in Python 3.8 by [PEP 570](https://peps.python.org/pep-0570/); before that only C builtins had it.

📌 **Interview term: keyword-only parameter** — a parameter after a bare \`*\` or after \`*args\`; it can only be passed as \`name=value\`. Added in Python 3.0 by [PEP 3102](https://peps.python.org/pep-3102/). For the variadic \`*args\` / \`**kwargs\` part see [What do *args and **kwargs mean?](/interview-question/what-do-args-and-kwargs-mean)

## 3. Watching Each Rule Fire

~~~python
def connect(host, port=5432, /, timeout=10, *, retries=3, verbose=False):
    return f"{host}:{port} timeout={timeout} retries={retries} verbose={verbose}"

connect("db")                       # fine: everything else defaults
connect("db", 6000, 5)              # fine: timeout can be positional
connect("db", timeout=1, retries=0) # fine
connect(host="db")                  # TypeError
connect("db", 1, 2, 3)              # TypeError
~~~

The messages CPython 3.11 gives are precise enough to quote in an interview:

~~~text
host by name -> connect() got some positional-only arguments passed as keyword arguments: 'host'
retries by position -> connect() takes from 1 to 3 positional arguments but 4 were given
unknown keyword -> connect() got an unexpected keyword argument 'retry'
missing keyword-only -> transfer() missing 1 required keyword-only argument: 'currency'
~~~

"From 1 to 3 positional arguments" is the interpreter counting: \`host\` is required, \`port\` and \`timeout\` are optional, and nothing after the \`*\` can take a position.

## 4. Defaults: Evaluated Once, Stored on the Function

📌 **Interview term: default argument value** — the value after \`=\` in a parameter. The expression is evaluated **once, when the \`def\` statement runs**, and the resulting object is stored on the function object. Positional defaults go in the tuple \`__defaults__\`; keyword-only defaults go in the dict \`__kwdefaults__\`.

~~~python
print(connect.__defaults__)    # (5432, 10)
print(connect.__kwdefaults__)  # {'retries': 3, 'verbose': False}
~~~

\`__defaults__\` lines up with the **last** N positional parameters: \`(5432, 10)\` belongs to \`port\` and \`timeout\`. Because the object is created once and reused on every call, a mutable default like \`[]\` is shared between calls — the full story is [Why is using a mutable default argument dangerous?](/interview-question/why-is-using-a-mutable-default-argument-dangerous)

### The ordering rules

- Among positional parameters (before the \`*\`), once one has a default, every later one needs a default too. Otherwise Python could not tell which value goes where.
- After the \`*\`, there is no position to confuse, so required and defaulted keyword-only parameters can come in any order: \`def ok(a=1, *, b, c=3)\` is legal and \`b\` is required.

The error message for breaking the first rule changed wording between versions (checked by compiling \`def bad(a=1, b): pass\` on each interpreter):

| Interpreter | \`SyntaxError\` message |
| :--- | :--- |
| 3.11.17 | \`non-default argument follows default argument\` |
| 3.12.3 and 3.13.16 | \`parameter without a default follows parameter with a default\` |

## 5. What CPython Stores in the Code Object

~~~python
code = connect.__code__
print(code.co_posonlyargcount, code.co_argcount, code.co_kwonlyargcount)
print(code.co_varnames)
~~~

~~~text
2 3 2
('host', 'port', 'timeout', 'retries', 'verbose')
~~~

A detail interviewers like: \`co_argcount\` is **3**, not 1. It counts every parameter that can be filled by position — the positional-only ones *plus* the positional-or-keyword ones. \`co_posonlyargcount\` (2) then says how many of those are positional-only, and \`co_kwonlyargcount\` (2) counts the keyword-only ones. Local names are laid out in that same order in \`co_varnames\`.

📌 **Interview term: signature binding** — the step at call time where Python maps arguments onto parameters: fill positional slots left to right, then match keywords by name, then apply defaults, then raise \`TypeError\` for anything missing, duplicated or unexpected. \`inspect.signature(f).bind(...)\` runs the same algorithm without calling the function:

~~~text
{'host': 'db', 'port': 1, 'timeout': 10, 'retries': 9, 'verbose': False}
~~~

## 6. Why Would You Choose Each Kind?

| Choose | When | Example |
| :--- | :--- | :--- |
| Keyword-only | Boolean flags, options, anything whose meaning is unclear from a bare value | \`sorted(xs, reverse=True)\`, \`connect(..., retries=3)\` |
| Positional-only | The parameter name means nothing to callers, you want to rename it later, or you need that name free for \`**kwargs\` | \`len(obj)\`, \`divmod(x, y)\`, \`def render(template, /, **fields)\` |
| Required keyword-only | A value must always be given and must be named at the call site | \`transfer(10, currency="EUR")\` |
| Default | There is a sensible value most callers want | \`timeout=10\` |

The \`render(template, /, **fields)\` case is shown in the example: because \`template\` is positional-only, a caller can still pass a field literally called \`template=\` and it lands in \`fields\` instead of colliding.

Builtins written in C have long been positional-only. \`inspect.signature(divmod)\` prints \`(x, y, /)\`, and \`len(obj=[1, 2])\` raises \`TypeError: len() takes no keyword arguments\`.

## 7. Verified: Running the Code

Example 1, the slash and the star:

~~~text
db:5432 timeout=10 retries=3 verbose=False
db:6000 timeout=5 retries=3 verbose=False
db:5432 timeout=1 retries=0 verbose=False
host by name -> connect() got some positional-only arguments passed as keyword arguments: 'host'
retries by position -> connect() takes from 1 to 3 positional arguments but 4 were given
unknown keyword -> connect() got an unexpected keyword argument 'retry'
10 EUR
missing keyword-only -> transfer() missing 1 required keyword-only argument: 'currency'
('hi', {'template': 'also allowed'})
SyntaxError: non-default argument follows default argument
(1, 2, 3)
~~~

Example 2, defaults, code object and \`inspect\`:

~~~text
(5432, 10)
{'retries': 3, 'verbose': False}
2 3 2
('host', 'port', 'timeout', 'retries', 'verbose')
host     POSITIONAL_ONLY        required
port     POSITIONAL_ONLY        5432
timeout  POSITIONAL_OR_KEYWORD  10
retries  KEYWORD_ONLY           3
verbose  KEYWORD_ONLY           False
(x, y, /)
TypeError: len() takes no keyword arguments
{'host': 'db', 'port': 1, 'timeout': 10, 'retries': 9, 'verbose': False}
~~~

## Common Pitfalls

- **Reading \`co_argcount\` as "positional-only count".** It includes positional-or-keyword parameters too; use \`co_posonlyargcount\` for the slash zone.
- **Adding a new positional parameter in the middle of a public function.** Every caller that passed later arguments by position silently shifts. New options belong after \`*\` as keyword-only so existing calls cannot change meaning.
- **Using a mutable or time-dependent default** like \`[]\`, \`{}\` or \`datetime.now()\`: it is evaluated once at \`def\` time, not per call.
- **Expecting a bare \`*\` to accept extra positionals.** \`def f(a, *, b)\` takes exactly one positional; \`f(1, 2)\` is a \`TypeError\`. Use \`*args\` if you want both.
- **Forgetting that positional-only names are not part of the API.** Callers cannot write \`connect(host="db")\`, which is the point — but it surprises people porting keyword-style calls.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three zones:</strong> <span style="color:#f0e2c8;">Parameters before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> are positional-only, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args</code>) are keyword-only, and the ones in between can be passed either way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Versions:</strong> <span style="color:#f0e2c8;">Keyword-only parameters arrived in Python 3.0 (PEP 3102); the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> marker for pure-Python functions arrived in 3.8 (PEP 570).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Defaults:</strong> <span style="color:#f0e2c8;">A default is evaluated once when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> runs and stored on the function: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__defaults__</code> for positional ones, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__kwdefaults__</code> for keyword-only ones. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> as a default is shared.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;">Among positional parameters a non-default cannot follow a default, but keyword-only parameters can be required with no default, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f(*, currency)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Design reason:</strong> <span style="color:#f0e2c8;">Keyword-only makes flags readable and lets you add options safely; positional-only lets you rename a parameter and keeps the name free for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">divmod()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">def f(a, *, b)</code> accept?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly one positional argument for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and a required keyword argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(1, b=2)</code> works; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(1, 2)</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: f() takes 1 positional argument but 2 were given</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Python add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">/</code> in 3.8 if builtins already had it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pure-Python functions could not express it before, so libraries could not match builtin signatures or rename parameters safely. PEP 570 gave them the syntax.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does Python keep keyword-only defaults?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the dict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func.__kwdefaults__</code>, separate from the tuple <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func.__defaults__</code> used for positional defaults. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__defaults__</code> aligns with the last N positional parameters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a positional-only parameter and a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">**kwargs</code> key share a name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def render(template, /, **fields)</code>, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render("hi", template="x")</code> binds the first value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template</code> and puts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">template="x"</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fields</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a new option to a widely used function without breaking callers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add it after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> as a keyword-only parameter with a default. No existing positional call can shift meaning, and every new use is self-documenting at the call site.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Parameter vs argument | The name in the \`def\` vs the value passed in the call |
| Positional-only parameter | Declared before \`/\` (3.8+, PEP 570); cannot be passed by name |
| Keyword-only parameter | Declared after \`*\` or \`*args\` (3.0+, PEP 3102); must be passed by name |
| Default argument value | Evaluated once at \`def\` time, stored in \`__defaults__\` or \`__kwdefaults__\` |
| Signature binding | The call-time mapping of arguments onto parameters; \`inspect.Signature.bind\` reproduces it |

**Conclusion:** A Python signature is split into zones by two markers: everything before \`/\` must be passed by position, everything after \`*\` must be passed by name, and the middle can go either way. Defaults are ordinary objects evaluated once when \`def\` runs and kept on the function in \`__defaults__\` and \`__kwdefaults__\`. Designers use keyword-only parameters to make call sites self-explanatory and safe to extend, and positional-only parameters to keep names out of the public contract, exactly as CPython builtins have always done.`,
    examples: [
      {
        label: `The slash and the star: which calls work and which raise`,
        code: `# Left of /  : positional-only     (Python 3.8+, PEP 570)
# Between    : positional or keyword (the normal kind)
# Right of * : keyword-only        (Python 3.0+, PEP 3102)
def connect(host, port=5432, /, timeout=10, *, retries=3, verbose=False):
    return f"{host}:{port} timeout={timeout} retries={retries} verbose={verbose}"

print(connect("db"))  # db:5432 timeout=10 retries=3 verbose=False
print(connect("db", 6000, 5))  # db:6000 timeout=5 retries=3 verbose=False
print(connect("db", timeout=1, retries=0))  # db:5432 timeout=1 retries=0 verbose=False

def attempt(label, call):
    try:
        call()
    except TypeError as e:
        print(label, "->", e)

attempt("host by name", lambda: connect(host="db"))
attempt("retries by position", lambda: connect("db", 1, 2, 3))
attempt("unknown keyword", lambda: connect("db", retry=5))

# A keyword-only parameter can be REQUIRED: no default after the *.
def transfer(amount, *, currency):
    return f"{amount} {currency}"

print(transfer(10, currency="EUR"))  # 10 EUR
attempt("missing keyword-only", lambda: transfer(10))

# A positional-only name stays free for **kwargs.
def render(template, /, **fields):
    return template, fields

print(render("hi", template="also allowed"))  # ('hi', {'template': 'also allowed'})

# Order rule: a parameter without a default cannot follow one with a default...
try:
    compile("def bad(a=1, b): pass", "<demo>", "exec")
except SyntaxError as e:
    print("SyntaxError:", e.msg)

# ...except after *, where any order is fine.
def ok(a=1, *, b, c=3):
    return a, b, c

print(ok(b=2))  # (1, 2, 3)`,
      },
      {
        label: `Where defaults live: __defaults__, __kwdefaults__, the code object and inspect`,
        code: `import inspect

def connect(host, port=5432, /, timeout=10, *, retries=3, verbose=False):
    return host, port, timeout, retries, verbose

# Defaults live on the function object, built once at def time.
print(connect.__defaults__)  # (5432, 10)
print(connect.__kwdefaults__)  # {'retries': 3, 'verbose': False}

# The code object counts each kind of parameter.
code = connect.__code__
# co_argcount counts positional-only AND positional-or-keyword.
print(code.co_posonlyargcount, code.co_argcount, code.co_kwonlyargcount)  # 2 3 2
print(code.co_varnames)

# inspect shows the five parameter kinds.
for name, p in inspect.signature(connect).parameters.items():
    default = "required" if p.default is p.empty else repr(p.default)
    print(f"{name:8} {p.kind.name:22} {default}")

# Many builtins are positional-only, and help() shows the slash.
print(inspect.signature(divmod))  # (x, y, /)
try:
    len(obj=[1, 2])
except TypeError as e:
    print("TypeError:", e)

# bind() is what Python does at call time: map arguments to parameters.
bound = inspect.signature(connect).bind("db", 1, retries=9)
bound.apply_defaults()
print(dict(bound.arguments))`,
      },
    ],
  },
  {
    title: `Is Python pass-by-value or pass-by-reference?`,
    difficulty: "easy",
    seoDescription: `Python is neither: it passes object references by value (call by sharing). Mutating a passed object is visible; rebinding the parameter is not.`,
    description: `**Question presented to candidate:**
"If I pass a list into a function and the function changes it, the caller sees the change. If I pass an integer and the function changes it, the caller does not. So is Python pass-by-value or pass-by-reference?"

**What a strong answer should cover:**
- Neither in the classic sense: the function receives a **reference to the same object**, and that reference is copied into a new local name — called *call by sharing*, *pass by object reference*, or, in the Python FAQ, *pass by assignment*
- **Mutating** the object through the parameter (\`items.append(x)\`) is visible to the caller; **rebinding** the parameter (\`items = ...\`) only changes the local name
- Why immutable arguments (int, str, tuple) look like pass-by-value: nothing can change them, so every "change" is a rebinding
- Proof points: \`param is original\` is \`True\` inside the function, and a \`swap(a, b)\` function cannot work, which it could with true pass-by-reference
- The \`+=\` subtlety (in place for a list, a new object for an int or tuple) and the defensive-copy fix, including why a shallow copy may not be enough

**Code / implementation expected:** Optional — a short function that mutates vs one that rebinds, showing the caller's object afterwards.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — especially if you learned C, C++ or Java first and want to map the terms.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You lend a friend the address of your house written on a sticky note. They now hold **their own note** with the **same address**.

- If they go to the house and paint the door red, you will see a red door when you get home. There is only one house.
- If they cross out the address on their note and write a different one, nothing happens to your note or your house.

That is exactly what Python does with function arguments. The "house" is the object, the "sticky note" is a name. Calling a function gives the parameter a **new note with the same address**. Painting the door is *mutating* the object; rewriting the note is *rebinding* the name.

The confusion comes from trying to force Python into one of two boxes invented for other languages. It fits neither box, and saying why is the real interview answer.

## 2. Names, Objects, and What a Call Does

In Python every value is an object living somewhere in memory, and a variable is just a **name bound to an object**. (The full model is in [How does Python's name and object reference model work?](/interview-question/how-does-python-s-name-and-object-reference-model-work)) A function call binds each parameter name to the object the caller passed — the same operation as an \`=\` assignment.

📌 **Interview term: call by sharing** (also *pass by object reference*) — the caller and the callee share the same object; the reference to it is copied into the parameter. The official Python FAQ phrases it as "arguments are passed by assignment" ([Programming FAQ](https://docs.python.org/3/faq/programming.html#how-do-i-write-a-function-with-output-parameters-call-by-reference)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="During a call the caller name nums and the parameter name items both point to one list object">
  <defs>
    <marker id="py05q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Inside mutate(nums)</text>
  <rect class="d-box-muted" x="40" y="60" width="170" height="54" rx="10"/>
  <text class="d-text" x="125" y="93" text-anchor="middle">caller: nums</text>
  <rect class="d-box-muted" x="40" y="146" width="170" height="54" rx="10"/>
  <text class="d-text" x="125" y="179" text-anchor="middle">local: items</text>
  <rect class="d-box-accent" x="400" y="96" width="200" height="70" rx="10"/>
  <text class="d-text" x="500" y="126" text-anchor="middle">list object</text>
  <text class="d-sub" x="500" y="150" text-anchor="middle">[1, 2, 99]</text>
  <path class="d-edge" d="M 214 87 L 394 120" marker-end="url(#py05q3-arrow)"/>
  <path class="d-edge" d="M 214 173 L 394 144" marker-end="url(#py05q3-arrow)"/>
</svg>

Two names, one object. \`items.append(99)\` changes that one object, so \`nums\` sees it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After rebinding, items points to a new list while nums still points to the original list">
  <defs>
    <marker id="py05q3b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Inside rebind(nums) after items = items + [99]</text>
  <rect class="d-box-muted" x="40" y="66" width="170" height="54" rx="10"/>
  <text class="d-text" x="125" y="99" text-anchor="middle">caller: nums</text>
  <rect class="d-box-muted" x="40" y="176" width="170" height="54" rx="10"/>
  <text class="d-text" x="125" y="209" text-anchor="middle">local: items</text>
  <rect class="d-box" x="400" y="58" width="200" height="70" rx="10"/>
  <text class="d-text" x="500" y="88" text-anchor="middle">original list</text>
  <text class="d-sub" x="500" y="112" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-accent" x="400" y="168" width="200" height="70" rx="10"/>
  <text class="d-text" x="500" y="198" text-anchor="middle">new list</text>
  <text class="d-sub" x="500" y="222" text-anchor="middle">[1, 2, 99]</text>
  <path class="d-edge" d="M 214 93 L 394 93" marker-end="url(#py05q3b-arrow)"/>
  <path class="d-edge-accent" d="M 214 203 L 394 203" marker-end="url(#py05q3b-arrow)"/>
</svg>

Rebinding moved only the local note. The caller still points at the original \`[1, 2]\`, and the new list exists only as the function's return value.

## 3. Mutate vs Rebind in Code

~~~python
def rebind(items):
    items = items + [99]   # builds a NEW list, binds the local name to it
    return items

def mutate(items):
    items.append(99)       # changes the shared object

nums = [1, 2]
result = rebind(nums)
print("after rebind :", nums, result)

nums2 = [1, 2]
mutate(nums2)
print("after mutate :", nums2)
~~~

~~~text
after rebind : [1, 2] [1, 2, 99]
after mutate : [1, 2, 99]
~~~

📌 **Interview term: rebinding vs mutation** — *rebinding* makes a name refer to a different object (\`x = ...\`); *mutation* changes the contents of an existing object (\`x.append\`, \`x[0] = ...\`, \`x.attr = ...\`). Only mutation is visible through other names for the same object.

The bytecode shows the difference. On CPython 3.11.17, \`dis.dis(rebind)\` ends its assignment with \`STORE_FAST\` — writing into the function's own local slot — while \`mutate\` never stores to \`items\` at all; it loads it and calls a method:

~~~text
 14           2 LOAD_FAST                0 (items)
              4 LOAD_CONST               1 (99)
              6 BUILD_LIST               1
              8 BINARY_OP                0 (+)
             12 STORE_FAST               0 (items)
~~~

~~~text
 11           2 LOAD_FAST                0 (items)
              4 LOAD_METHOD              0 (append)
             26 LOAD_CONST               1 (99)
             28 PRECALL                  1
             32 CALL                     1
~~~

(Bytecode is version-specific; 3.12 and later print different opcodes for the same idea.)

## 4. Why Neither Classic Label Fits

| Model | What the function gets | Can the callee change the caller's object? | Can the callee make the caller's variable point elsewhere? |
| :--- | :--- | :--- | :--- |
| Pass-by-value (C \`int\`) | a copy of the value | No | No |
| Pass-by-reference (C++ \`int&\`) | an alias of the caller's variable | Yes | **Yes** |
| Python: call by sharing | a copy of the reference to the same object | **Yes**, if the object is mutable | No |

The cleanest proof that Python is not pass-by-reference is a swap function:

~~~python
def swap(x, y):
    x, y = y, x

p, q = "left", "right"
swap(p, q)
print("after swap   :", p, q)   # after swap   : left right
~~~

With real references this would swap the caller's variables. In Python it only swaps two local names. The idiomatic version is \`p, q = q, p\` at the call site, or a function that **returns** the new values.

The cleanest proof that Python is not pass-by-value is that no copy is made: \`def same_object(param, original): return param is original\` returns \`True\` for \`same_object(data, data)\`. Passing a million-element list is as cheap as passing an integer.

## 5. Immutable Arguments Look Like Pass-by-Value

An \`int\`, \`str\`, \`tuple\` or \`frozenset\` cannot be changed, so every operation that looks like a change creates a new object and rebinds the local name. The caller is never affected — which is why people conclude "numbers are passed by value". The mechanism is identical; only the type's behaviour differs. See [What are mutable and immutable types in Python?](/interview-question/what-are-mutable-and-immutable-types-in-python)

The \`+=\` operator is where this bites. For a list it calls \`__iadd__\`, which extends the list **in place**; for an int or tuple there is no in-place version, so it builds a new object:

~~~python
def add_in_place(x, extra):
    x += extra
    return x

a_list, a_tuple, an_int = [5], (5,), 5
add_in_place(a_list, [0])
add_in_place(a_tuple, (0,))
add_in_place(an_int, 1)
print("+= results   :", a_list, a_tuple, an_int)
~~~

~~~text
+= results   : [5, 0] (5,) 5
~~~

Same function, same line, and only the list argument changed for the caller.

## 6. When You Need Value-Like Behaviour

Copy the object yourself before changing it. Be careful about depth: a shallow copy duplicates the outer container but **shares** everything inside it.

~~~python
def add_tag_shallow(record, tag):
    record = dict(record)          # new outer dict...
    record["tags"].append(tag)     # ...but the SAME inner list
    return record
~~~

The example shows that this leaks \`'oops'\` into the caller's record, while \`copy.deepcopy\` does not. Details in [What is the difference between shallow and deep copy?](/interview-question/what-is-the-difference-between-shallow-and-deep-copy) The same trap applies to tuples: a tuple holding a list is immutable only one level deep, and a function can still append to the list inside it.

## 7. Verified: Running the Code

Example 1, mutate vs rebind:

~~~text
True
after rebind : [1, 2] [1, 2, 99]
after mutate : [1, 2, 99]
+= results   : [5, 0] (5,) 5
after swap   : left right
real swap    : right left
shout        : HI hi
~~~

Example 2, copies and returns:

~~~text
original: {'name': 'Ada', 'tags': ['admin']}
updated : {'name': 'Ada', 'tags': ['admin', 'ops']}
leaked  : {'name': 'Ada', 'tags': ['admin', 'oops']}
tuple   : (['inner', 'changed'], 'label')
1 9
['x'] True
~~~

## Common Pitfalls

- **Saying "Python is pass-by-reference".** It breaks the moment the interviewer asks you to write \`swap\`. Say *call by sharing* or *pass by object reference*, then explain mutate vs rebind.
- **Saying "ints are passed by value, lists by reference".** There is one mechanism for every type; immutability is what makes ints look different.
- **Mutating an argument without saying so.** A function that sorts or appends to its input surprises callers. Either document it (like \`list.sort()\` returning \`None\`) or work on a copy and return it (like \`sorted()\`).
- **Trusting a shallow copy with nested data.** \`dict(record)\` or \`list(items)\` still shares inner lists and dicts.
- **Using a mutable default argument.** The default object is shared across calls for the same reason — see [Why is using a mutable default argument dangerous?](/interview-question/why-is-using-a-mutable-default-argument-dangerous)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Short answer:</strong> <span style="color:#f0e2c8;">Neither. Python passes a <strong style="color:#ffca28;">reference to the object</strong>, and that reference is copied into the parameter. The terms are call by sharing or pass by object reference; the Python FAQ says pass by assignment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Mutation is visible:</strong> <span style="color:#f0e2c8;">If the function mutates the object, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items.append(x)</code>, the caller sees it because both names point to one object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rebinding is not:</strong> <span style="color:#f0e2c8;">If the function rebinds the parameter, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items = items + [x]</code>, only the local name moves. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap(a, b)</code> cannot work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Immutables:</strong> <span style="color:#f0e2c8;">Ints, strings and tuples cannot be mutated, so every change is a rebinding and they behave like pass-by-value. Same mechanism, different type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical rule:</strong> <span style="color:#f0e2c8;">Do not mutate inputs unless that is the documented purpose; copy first (deep copy for nested data) or return a new value, the way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> does.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you prove no copy is made?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the function, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">param is original</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, and mutating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">param</code> shows up in the caller. A copy would have a different identity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x += [1]</code> change the caller's list but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x += 1</code> does not change the caller's int?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">List <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iadd__</code>, which extends the same list in place. An int has no in-place add, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> builds a new int and rebinds only the local name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return several values, like an out-parameter in C?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a tuple and unpack it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low, high = min_max(values)</code>. Python has no out-parameters; mutating a passed-in container is possible but less clear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Java the same as Python here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Very close for objects: Java passes references by value, so mutating an object is visible and reassigning the parameter is not. Java primitives are true values; Python has no primitives, everything is an object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does passing a large list cost memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No extra copy is made, only one more reference to the same list, so passing is constant time regardless of size.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Call by sharing | The parameter receives a copy of the reference, so caller and callee share one object; also called pass by object reference or pass by assignment |
| Rebinding vs mutation | Pointing a name at a different object vs changing the contents of the object it already points at |

**Conclusion:** Python passes every argument the same way: the parameter becomes a new local name bound to the very object the caller passed. Because the object is shared, mutating it is visible to the caller; because only the reference is copied, rebinding the parameter never is. Immutable types simply have no way to be mutated, which is why they look like pass-by-value. Name the model (call by sharing), show mutate vs rebind, mention that \`swap\` cannot work, and you have answered the question better than either classic label could.`,
    examples: [
      {
        label: `Mutate vs rebind: what the caller sees`,
        code: `# Python passes a reference to the object, by value: "call by sharing".
def same_object(param, original):
    return param is original

data = [1, 2]
print(same_object(data, data))  # True

# 1) Rebinding the parameter name never touches the caller.
def rebind(items):
    items = items + [99]
    return items

nums = [1, 2]
result = rebind(nums)
print("after rebind :", nums, result)

# 2) Mutating the shared object IS visible to the caller.
def mutate(items):
    items.append(99)

nums2 = [1, 2]
mutate(nums2)
print("after mutate :", nums2)

# 3) += depends on the type: lists mutate in place, ints and tuples rebind.
def add_in_place(x, extra):
    x += extra
    return x

a_list, a_tuple, an_int = [5], (5,), 5
add_in_place(a_list, [0])
add_in_place(a_tuple, (0,))
add_in_place(an_int, 1)
print("+= results   :", a_list, a_tuple, an_int)

# 4) A swap function cannot work: it only swaps its own local names.
def swap(x, y):
    x, y = y, x

p, q = "left", "right"
swap(p, q)
print("after swap   :", p, q)
# The Pythonic swap is a return value (or just p, q = q, p).
p, q = q, p
print("real swap    :", p, q)

# 5) Immutable objects behave LIKE pass-by-value, because nothing can change them.
def shout(s):
    s = s.upper()
    return s

word = "hi"
print("shout        :", shout(word), word)`,
      },
      {
        label: `Defensive copies, tuples holding lists, and returning instead of out-parameters`,
        code: `import copy

# A defensive copy gives value-like behaviour when you need it.
def add_tag_safely(record, tag):
    record = copy.deepcopy(record)
    record["tags"].append(tag)
    return record

original = {"name": "Ada", "tags": ["admin"]}
updated = add_tag_safely(original, "ops")
print("original:", original)
print("updated :", updated)

# A shallow copy is NOT enough when the dict holds a list.
def add_tag_shallow(record, tag):
    record = dict(record)
    record["tags"].append(tag)
    return record

add_tag_shallow(original, "oops")
print("leaked  :", original)

# An immutable container does not protect the mutable things inside it.
def poke(t):
    t[0].append("changed")

frozen_outside = (["inner"], "label")
poke(frozen_outside)
print("tuple   :", frozen_outside)

# Out-parameters the Python way: return a tuple.
def min_max(values):
    return min(values), max(values)

low, high = min_max([4, 9, 1])
print(low, high)  # 1 9

# Every name bound to one object sees the same changes.
shared = []
alias = shared
alias.append("x")
print(shared, alias is shared)  # ['x'] True`,
      },
    ],
  },
  {
    title: `Why is using a mutable default argument dangerous?`,
    difficulty: "medium",
    seoDescription: `A default like [] is built once when def runs and stored in __defaults__, so every call shares it. Why it happens, how to see it, and the None fix.`,
    description: `**Question presented to candidate:**
"Here is \`def add_item(item, bucket=[]): bucket.append(item); return bucket\`. Call it twice without a bucket. What do you get, why, and how would you fix it?"

**What a strong answer should cover:**
- Default expressions are evaluated **once, when the \`def\` statement executes**, not on every call; the resulting object is stored on the function in \`__defaults__\` (or \`__kwdefaults__\`)
- So a mutable default (\`[]\`, \`{}\`, \`set()\`, a custom object) is **one shared object**; mutations from one call leak into every later call that relies on the default
- The fix: \`None\` as a sentinel and create the object inside the body; a private \`object()\` sentinel when \`None\` is a valid input; \`field(default_factory=list)\` in dataclasses
- The same "evaluated once" rule explains \`def f(ts=datetime.now())\` freezing a timestamp, and the class-attribute version of the bug
- Linters catch it (Ruff / flake8-bugbear \`B006\`, Pylint \`W0102 dangerous-default-value\`), and the deliberate exception: a default dict used as a cache, usually better done with \`functools.lru_cache\`

**Code / implementation expected:** Yes — reproduce the bug, show \`__defaults__\` changing, then write the \`None\`-sentinel version.`,
    answer: `**Target Audience:** Beginners to intermediate — you can write functions with default values.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3); the dataclass error message was also checked on 3.12.3.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A hotel puts a guest book on the reception desk. The idea is "if a guest does not bring their own notebook, give them the desk one". Sounds harmless — until you notice the hotel bought **one** desk notebook on opening day. Every guest without a notebook writes into the same book, and the third guest finds the first two guests' notes already in it.

A mutable default argument is that desk notebook. Python creates the default object **once**, when the function is defined, and hands the very same object to every call that does not pass its own. If the function writes into it, the writing stays there for the next caller.

This bug is famous because the code *looks* like it creates a fresh empty list each time. It passes a quick test with a single call and then corrupts data in production, where the function is called thousands of times in one long-running process.

## 2. The Mechanism: Defaults Are Evaluated at \`def\` Time

\`def\` is an executable statement. When Python runs it, it evaluates every default expression, builds the function object, and stores the results on it.

📌 **Interview term: definition-time evaluation** — default values are computed once, when the \`def\` statement executes, and the same objects are reused by every call. The language reference states it directly: the expression is evaluated once, when the function is defined, and that same "pre-computed" value is used for each call ([Function definitions](https://docs.python.org/3/reference/compound_stmts.html#function-definitions)).

📌 **Interview term: \`__defaults__\`** — the tuple on a function object holding the default values of its positional parameters (keyword-only defaults live in the dict \`__kwdefaults__\`). You can watch the shared object change through it.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two calls to add_item both use the single list stored in the function defaults tuple">
  <defs>
    <marker id="py05q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="250" height="90" rx="10"/>
  <text class="d-text" x="155" y="76" text-anchor="middle">function add_item</text>
  <text class="d-sub" x="155" y="104" text-anchor="middle">built once by def</text>
  <rect class="d-box-accent" x="420" y="40" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="76" text-anchor="middle">__defaults__[0]</text>
  <text class="d-sub" x="545" y="104" text-anchor="middle">one list: [a, b]</text>
  <path class="d-edge" d="M 284 85 L 414 85" marker-end="url(#py05q4-arrow)"/>
  <rect class="d-box-muted" x="300" y="200" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="236" text-anchor="middle">call 1 adds a</text>
  <rect class="d-box-muted" x="510" y="200" width="160" height="60" rx="10"/>
  <text class="d-text" x="590" y="236" text-anchor="middle">call 2 adds b</text>
  <path class="d-edge-dashed" d="M 380 196 L 500 136" marker-end="url(#py05q4-arrow)"/>
  <path class="d-edge-dashed" d="M 590 196 L 570 136" marker-end="url(#py05q4-arrow)"/>
</svg>

Both calls append to the single list hanging off the function object, so the second call returns \`['a', 'b']\`.

## 3. Reproducing It

~~~python
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print("defaults at def time:", add_item.__defaults__)
first = add_item("a")
second = add_item("b")
print(first, second)
print(first is second, first is add_item.__defaults__[0])
print("defaults now        :", add_item.__defaults__)
~~~

~~~text
defaults at def time: ([],)
['a', 'b'] ['a', 'b']
True True
defaults now        : (['a', 'b'],)
~~~

\`first is second\` is \`True\`: two calls returned **the same list object**, and it is the object stored in \`__defaults__[0]\`. Passing a list explicitly (\`add_item("x", [])\`) bypasses the default and behaves correctly — which is why tests that always pass the argument never catch the bug.

The cause is not the list itself; it is **mutation of a shared object**. \`def f(n=0): n += 1\` is fine because \`+=\` on an int rebinds the local name instead of changing the stored \`0\`. That is the same mutate-vs-rebind rule explained in [Is Python pass-by-value or pass-by-reference?](/interview-question/is-python-pass-by-value-or-pass-by-reference)

## 4. The Fix: a Sentinel

📌 **Interview term: sentinel value** — a special placeholder default that means "no argument was given". The body checks for it and builds a fresh object **at call time**.

~~~python
def add_item_fixed(item, bucket=None):
    if bucket is None:
        bucket = []          # runs on every call: a new list each time
    bucket.append(item)
    return bucket
~~~

Use \`is None\`, not \`if not bucket:\` — the second form would also replace an empty list the caller deliberately passed in, breaking a caller who wants the function to fill *their* list.

When \`None\` is a legitimate value for callers to pass, use a private sentinel object that no caller can produce by accident:

~~~python
_MISSING = object()

def lookup(mapping, key, default=_MISSING):
    if key in mapping:
        return mapping[key]
    if default is _MISSING:
        raise KeyError(key)
    return default
~~~

\`lookup(d, "zzz", None)\` returns \`None\`, while \`lookup(d, "zzz")\` raises — the two cases stay distinguishable.

## 5. The Same Rule in Other Places

**Any expression, not just mutable ones.** The rule is about *when* the default is evaluated. \`def stamp(n=next(counter))\` calls \`next\` exactly once, so \`stamp(), stamp(), stamp()\` prints \`1 1 1\`. The same thing happens with \`def log(msg, at=datetime.now())\`: every call gets the timestamp from when the module was imported.

**Dicts and sets.** \`def count_words(text, seen={})\` keeps counting across calls; the example shows the second call returning \`{'a': 2, 'b': 1}\`.

**Class attributes.** \`class Team: members = []\` creates one list on the class, shared by every instance that appends through \`self.members\`. Create it in \`__init__\` instead. See [What is the difference between class variables and instance variables?](/interview-question/what-is-the-difference-between-class-variables-and-instance-variables)

**Dataclasses refuse it.** The \`dataclass\` decorator raises at class-creation time for a \`list\`, \`dict\` or \`set\` default:

~~~text
ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory
~~~

📌 **Interview term: default factory** — a zero-argument callable run on each construction to build a fresh default, as in \`items: list = field(default_factory=list)\`. More in [What are dataclasses?](/interview-question/what-are-dataclasses)

## 6. Is It Ever Deliberate?

Occasionally a shared default is used on purpose as a cache that survives between calls:

~~~python
def fib(n, _memo={0: 0, 1: 1}):
    if n not in _memo:
        _memo[n] = fib(n - 1) + fib(n - 2)
    return _memo[n]
~~~

It works (\`fib(80)\` gives \`23416728348467685\` and the memo holds 81 entries afterwards), but it exposes the cache as a parameter that any caller could override, and readers will assume it is the bug. \`functools.lru_cache\` or \`functools.cache\` says what you mean — see [How does functools.lru_cache work?](/interview-question/how-does-functools-lru-cache-work)

## 7. Verified: Running the Code

Example 1, the bug and the sentinel fixes:

~~~text
defaults at def time: ([],)
['a', 'b'] ['a', 'b']
True True
defaults now        : (['a', 'b'],)
explicit list       : ['x']
third call          : ['a', 'b', 'c']
['a'] ['b'] False
None
KeyError: 'zzz'
~~~

Example 2, the same rule elsewhere:

~~~text
1 1 1
{'a': 2, 'b': 1}
['Ana']
ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory
Good(items=[1]) Good(items=[])
23416728348467685
81
~~~

## 8. Tooling and the Future

- Linters flag it: Ruff and flake8-bugbear report [\`B006\` mutable-argument-default](https://docs.astral.sh/ruff/rules/mutable-argument-default/), and Pylint reports [\`W0102 dangerous-default-value\`](https://pylint.pycqa.org/en/stable/user_guide/messages/warning/dangerous-default-value.html). Both suggest the \`None\` rewrite.
- [PEP 671](https://peps.python.org/pep-0671/) proposes late-bound defaults with \`=>\` syntax (\`def f(bucket=>[])\`) evaluated at call time. At the time of writing it is still a **Draft**, so no released Python has it; the sentinel pattern remains the answer.

## Common Pitfalls

- **Believing \`[]\` in the signature means "a new empty list per call".** It is one list, created when \`def\` runs.
- **Writing \`bucket = bucket or []\`.** It also discards an empty list the caller passed on purpose; test \`is None\`.
- **Fixing the function but not the class.** A list class attribute shared by all instances is the same bug in another place.
- **Freezing time or config at import.** \`at=datetime.now()\` or \`cfg=load_config()\` in a signature runs once; move it into the body.
- **Assuming tests would catch it.** A test that calls the function once, or always passes the argument, never sees the shared state.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What happens:</strong> <span style="color:#f0e2c8;">Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add_item("a")</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add_item("b")</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">['a', 'b']</code> both times: the two calls share one list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">Defaults are evaluated <strong style="color:#ffca28;">once</strong>, when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> statement runs, and stored on the function in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__defaults__</code>. Every call that uses the default gets that same object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The real cause:</strong> <span style="color:#f0e2c8;">It is mutation of a shared object. An int default is fine because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n += 1</code> rebinds the local name instead of changing the stored value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fix:</strong> <span style="color:#f0e2c8;">Default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if bucket is None: bucket = []</code> inside the body. Use a private <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object()</code> sentinel if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> is a valid input, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field(default_factory=list)</code> in dataclasses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Same rule elsewhere:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f(at=datetime.now())</code> freezes the time at import, and a list class attribute is shared by all instances. Ruff <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B006</code> and Pylint <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">W0102</code> flag the pattern.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can you see the shared state without calling the function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add_item.__defaults__</code>. It starts as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">([],)</code> and after two calls is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(['a', 'b'],)</code>, which shows the stored object itself was mutated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bucket = bucket or []</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because an empty list is falsy, so a caller who passes their own empty list to be filled gets a different list back. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is None</code> only replaces the missing-argument case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a tuple default safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A tuple of immutables is safe because it cannot be mutated. A tuple that contains a list is not: the inner list is still one shared object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this happen with keyword-only defaults too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. They are evaluated at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> time just the same and stored in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__kwdefaults__</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f(*, cache={})</code> shares one dict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Will Python ever change this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PEP 671 proposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=&gt;</code> for call-time defaults, but it is still a Draft and not in any released version, so changing the default behaviour would also break code that relies on it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Definition-time evaluation | Default expressions run once when \`def\` executes; every call reuses those objects |
| \`__defaults__\` | Tuple of positional default values on a function object (\`__kwdefaults__\` for keyword-only) |
| Sentinel value | A placeholder default such as \`None\` or a private \`object()\` that means "argument not given" |
| Default factory | A callable that builds a fresh default per instance, e.g. \`field(default_factory=list)\` |

**Conclusion:** A mutable default is dangerous because Python evaluates default expressions once, when the function is defined, and keeps the resulting object in \`__defaults__\`. Every call that relies on the default receives that same object, so mutating it leaks state from one call into the next. Use \`None\` (or a private sentinel) and build the object in the body, use \`default_factory\` in dataclasses, and remember that the same definition-time rule also freezes values like \`datetime.now()\`.`,
    examples: [
      {
        label: `The shared default list, seen through __defaults__, and the sentinel fixes`,
        code: `# The default list is created ONCE, when def runs, and stored on the function.
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print("defaults at def time:", add_item.__defaults__)
first = add_item("a")
second = add_item("b")
# Two calls, one list: both results are the same object.
print(first, second)
print(first is second, first is add_item.__defaults__[0])  # True True
print("defaults now        :", add_item.__defaults__)

# Passing a list explicitly bypasses the shared default.
print("explicit list       :", add_item("x", []))
third = add_item("c")
print("third call          :", third)

# THE FIX: None as a sentinel, build the list inside the body (per call).
def add_item_fixed(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

r1 = add_item_fixed("a")
r2 = add_item_fixed("b")
print(r1, r2, r1 is r2)  # ['a'] ['b'] False

# When None is a meaningful value, use a private sentinel object instead.
_MISSING = object()

def lookup(mapping, key, default=_MISSING):
    if key in mapping:
        return mapping[key]
    if default is _MISSING:
        raise KeyError(key)
    return default

print(lookup({"a": 1}, "zzz", None))  # None
try:
    lookup({"a": 1}, "zzz")
except KeyError as e:
    print("KeyError:", e)`,
      },
      {
        label: `Same rule elsewhere: def-time evaluation, dicts, class attributes, dataclasses, a deliberate cache`,
        code: `import itertools
from dataclasses import dataclass, field

# Default expressions run once at def time: the counter advances only once.
counter = itertools.count(1)

def stamp(n=next(counter)):
    return n

print(stamp(), stamp(), stamp())  # 1 1 1

# The same trap with a dict default.
def count_words(text, seen={}):
    for w in text.split():
        seen[w] = seen.get(w, 0) + 1
    return seen

count_words("a b")
print(count_words("a"))

# The class-attribute version of the same bug.
class Team:
    members = []

    def __init__(self, name):
        self.name = name

    def join(self, person):
        self.members.append(person)

red, blue = Team("red"), Team("blue")
red.join("Ana")
print(blue.members)  # ['Ana']

# dataclasses refuse a bare list default and point to default_factory.
try:
    @dataclass
    class Bad:
        items: list = []
except ValueError as e:
    print("ValueError:", e)

@dataclass
class Good:
    items: list = field(default_factory=list)

g1, g2 = Good(), Good()
g1.items.append(1)
print(g1, g2)  # Good(items=[1]) Good(items=[])

# The one deliberate use: a cache that persists between calls.
def fib(n, _memo={0: 0, 1: 1}):
    if n not in _memo:
        _memo[n] = fib(n - 1) + fib(n - 2)
    return _memo[n]

print(fib(80))  # 23416728348467685
print(len(fib.__defaults__[0]))  # 81`,
      },
    ],
  },
  {
    title: `What are lambda functions and map/filter/reduce?`,
    difficulty: "medium",
    seoDescription: `A lambda is an anonymous one-expression function; map and filter return lazy iterators and functools.reduce folds a sequence. When comprehensions win.`,
    description: `**Question presented to candidate:**
"What is a lambda in Python and what are its limits? Then show me \`map\`, \`filter\` and \`reduce\` on a list of numbers — and tell me when you would use a list comprehension instead."

**What a strong answer should cover:**
- A lambda is an **expression** that creates an ordinary function object with one expression as its body (no statements, no annotations); its \`__name__\` is \`<lambda>\` and it compiles to the same bytecode as the equivalent \`def\`
- Best use: a short throwaway callback, especially \`key=\` for \`sorted\`, \`min\`, \`max\`; PEP 8 says to use \`def\` instead of assigning a lambda to a name
- In Python 3, \`map\` and \`filter\` return **lazy, single-use iterators**, not lists; \`map\` with several iterables stops at the shortest; \`filter(None, xs)\` keeps truthy items
- \`reduce\` lives in \`functools\` since Python 3.0 and folds left to right, \`f(f(f(a, b), c), d)\`; without an initializer an empty input raises \`TypeError\`
- Trade-offs: comprehensions and built-ins (\`sum\`, \`max\`, \`any\`, \`math.prod\`) are usually clearer; the \`operator\` module avoids trivial lambdas; lambdas in loops capture variables late

**Code / implementation expected:** Yes — a sort with a lambda key, a \`map\`/\`filter\`/\`reduce\` pipeline, and the comprehension equivalent.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — you know lists, loops and basic functions.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a juice bar with a conveyor belt of fruit. At the first station a machine **does the same thing to every fruit** — peels it. At the second station a worker **lets some fruit through and drops the rest** — only ripe ones pass. At the end, a blender **combines everything into one cup**.

Those three stations are \`map\` (transform each item), \`filter\` (keep some items) and \`reduce\` (combine all items into one value). The tiny instruction cards you hand each station — "peel it", "is it ripe?" — are often written on the spot as **lambdas**: little functions with no name, used once and thrown away.

This is the vocabulary of *functional programming*, and Python supports it, but Python also has a more popular way to write the same pipeline: comprehensions. Knowing both, and when each one reads better, is what the interviewer is checking.

## 2. Lambda: an Expression That Builds a Function

📌 **Interview term: lambda (anonymous function)** — \`lambda params: expression\` is an **expression** whose value is a new function object. The body is a single expression whose value is returned automatically.

~~~python
square = lambda x: x * x

def square_def(x):
    return x * x

print(square(7), square_def(7))                                 # 49 49
print(square.__name__, square_def.__name__)                     # <lambda> square_def
print(type(square) is type(square_def))                         # True
print(square.__code__.co_code == square_def.__code__.co_code)   # True
~~~

The last line is the key CPython fact: a lambda and the equivalent \`def\` compile to **identical bytecode**. There is no "lambda type" and no speed difference. On 3.11.17, \`dis.dis(square)\` shows the whole body:

~~~text
  2           0 RESUME                   0
              2 LOAD_FAST                0 (x)
              4 LOAD_FAST                0 (x)
              6 BINARY_OP                5 (*)
             10 RETURN_VALUE
~~~

The only differences are what the syntax allows:

| | \`lambda\` | \`def\` |
| :--- | :--- | :--- |
| Is it | an expression (can sit inside a call) | a statement |
| Body | exactly one expression | any statements |
| Name | \`<lambda>\` in tracebacks and \`repr\` | the real name |
| Annotations, docstring, decorators | not possible | yes |
| Default args, \`*args\`, \`**kwargs\` | yes | yes |

A \`return\`, an assignment, a \`for\` loop or a \`try\` inside a lambda is a \`SyntaxError\`. A conditional **expression** is fine: \`lambda n: "neg" if n < 0 else "pos"\`.

### Where lambdas shine

As a short \`key=\` function:

~~~python
people = [("Ravi", 31), ("Ana", 25), ("Lee", 31)]
print(sorted(people, key=lambda p: p[1]))
~~~

~~~text
[('Ana', 25), ('Ravi', 31), ('Lee', 31)]
~~~

Notice \`Ravi\` stays before \`Lee\`: Python sorting is stable. For more on keys see [How do you sort with a custom key, and how does sorted differ from sort?](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort)

PEP 8 recommends a \`def\` instead of assigning a lambda to a name (\`f = lambda x: ...\`), because the \`def\` gives the function a real name for tracebacks and the assignment throws away the lambda's only advantage of being usable inline ([PEP 8, Programming Recommendations](https://peps.python.org/pep-0008/#programming-recommendations); linters report it as \`E731\`).

### The late-binding trap

A lambda that uses a loop variable looks it up **when it is called**, not when it is created:

~~~python
late = [lambda: i for i in range(3)]
bound = [lambda i=i: i for i in range(3)]
print([f() for f in late], [f() for f in bound])   # [2, 2, 2] [0, 1, 2]
~~~

The \`i=i\` default captures the value at creation time (defaults are evaluated when the function is made). The full explanation is in [What is the late-binding closure pitfall in loops?](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops)

## 3. map, filter and reduce

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Numbers flow through map, then filter, then reduce to produce one value">
  <defs>
    <marker id="py05q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="60" width="130" height="80" rx="10"/>
  <text class="d-text" x="75" y="94" text-anchor="middle">1 2 3 4</text>
  <text class="d-sub" x="75" y="120" text-anchor="middle">input</text>
  <rect class="d-box" x="200" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="270" y="94" text-anchor="middle">map x*10</text>
  <text class="d-sub" x="270" y="120" text-anchor="middle">10 20 30 40</text>
  <rect class="d-box" x="400" y="60" width="150" height="80" rx="10"/>
  <text class="d-text" x="475" y="94" text-anchor="middle">filter x&gt;15</text>
  <text class="d-sub" x="475" y="120" text-anchor="middle">20 30 40</text>
  <rect class="d-box-accent" x="610" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="680" y="94" text-anchor="middle">reduce add</text>
  <text class="d-sub" x="680" y="120" text-anchor="middle">90</text>
  <path class="d-edge" d="M 144 100 L 194 100" marker-end="url(#py05q5-arrow)"/>
  <path class="d-edge" d="M 344 100 L 394 100" marker-end="url(#py05q5-arrow)"/>
  <path class="d-edge" d="M 554 100 L 604 100" marker-end="url(#py05q5-arrow)"/>
</svg>

\`map\` keeps the number of items, \`filter\` keeps some of them unchanged, and \`reduce\` collapses them to one value.

📌 **Interview term: higher-order function** — a function that takes another function as an argument (or returns one). \`map\`, \`filter\`, \`reduce\`, \`sorted(key=...)\` and decorators are all higher-order functions.

### map and filter are lazy

📌 **Interview term: lazy iterator** — an object that produces items one at a time, only when asked, and can be consumed only once. In Python 3, \`map()\` and \`filter()\` return iterators like this rather than lists.

~~~python
doubled = map(lambda x: x * 2, nums)
print(type(doubled).__name__, list(doubled))
print(list(doubled))      # second pass: already used up
~~~

~~~text
map [2, 4, 6, 8, 10, 12]
[]
~~~

Laziness means \`map\` over a huge file or an infinite generator uses constant memory, and nothing is computed until you iterate. It also means a \`map\` object that you iterate twice silently gives nothing the second time. See [What is the difference between an iterable and an iterator?](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator)

Two behaviours worth knowing from the run:

- \`map(operator.add, [1, 2, 3], [10, 20])\` takes one item from each iterable per step and **stops at the shortest**: \`[11, 22]\`.
- \`filter(None, xs)\` uses each item's own truthiness: \`[0, "", "a", [], [1], None, 3]\` becomes \`['a', [1], 3]\`. See [What values are falsy in Python?](/interview-question/what-values-are-falsy-in-python)

### reduce folds left to right

📌 **Interview term: fold (reduce)** — combine a sequence into one value by repeatedly applying a two-argument function to an accumulator and the next item. \`reduce(f, [a, b, c, d])\` computes \`f(f(f(a, b), c), d)\`.

\`reduce\` was a builtin in Python 2. In Python 3.0 it moved to \`functools\`, and the 3.0 release notes suggest an explicit loop is usually more readable ([What's New in Python 3.0](https://docs.python.org/3/whatsnew/3.0.html)). A traced run makes the folding visible:

~~~text
  acc= 1 x=2
  acc= 3 x=3
  acc= 6 x=4
sum: 10
~~~

With no initializer the first item becomes the starting accumulator, so an empty input has nothing to start from and raises \`TypeError: reduce() of empty iterable with no initial value\`. Passing an initializer, \`reduce(operator.add, [], 0)\`, returns \`0\`. The deeper treatment is in [How does functools.reduce fold a sequence?](/interview-question/how-does-functools-reduce-fold-a-sequence)

## 4. Which One Should You Write?

| Task | Functional style | Usually preferred |
| :--- | :--- | :--- |
| Transform each item | \`list(map(lambda x: x * 2, nums))\` | \`[x * 2 for x in nums]\` |
| Keep some items | \`list(filter(lambda x: x % 2 == 0, nums))\` | \`[x for x in nums if x % 2 == 0]\` |
| Transform with an existing function | \`list(map(str.upper, words))\` | either — \`map\` is fine with no lambda |
| Sum / product / max | \`reduce(operator.add, nums)\` | \`sum(nums)\`, \`math.prod(nums)\`, \`max(nums)\` |
| A genuine custom fold | \`reduce(merge, dicts, {})\` | \`reduce\`, or a plain loop if it gets complex |

The rule of thumb: if you need a lambda just to call \`map\` or \`filter\`, a comprehension is clearer. If the function already exists (\`str.upper\`, \`int\`, \`operator.itemgetter(1)\`), \`map\` reads well. See [What are list/dict/set comprehensions?](/interview-question/what-are-list-dict-set-comprehensions)

The \`operator\` module provides ready-made functions for the operators — \`operator.add\`, \`operator.mul\`, \`operator.itemgetter\`, \`operator.attrgetter\` — so you rarely need \`lambda a, b: a + b\`. The wider toolbox is in [What does the functools module offer?](/interview-question/what-does-the-functools-module-offer)

## 5. Verified: Running the Code

Example 1, lambdas:

~~~text
49 49
<lambda> square_def
True
True
[('Ana', 25), ('Ravi', 31), ('Lee', 31)]
('Ravi', 31)
SyntaxError: invalid syntax
['neg', 'zero', 'pos']
('hi', 'Ana', (), {})
[2, 2, 2] [0, 1, 2]
~~~

Example 2, map, filter and reduce:

~~~text
map [2, 4, 6, 8, 10, 12]
[]
[2, 4, 6]
[2, 4, 6, 8, 10, 12]
[2, 4, 6]
[11, 22]
['a', [1], 3]
['A', 'B']
  acc= 1 x=2
  acc= 3 x=3
  acc= 6 x=4
sum: 10
720
TypeError: reduce() of empty iterable with no initial value
0
21 720 6
~~~

## Common Pitfalls

- **Printing a map object.** \`print(map(f, xs))\` prints \`<map object at ...>\`; wrap it in \`list()\` or iterate it.
- **Reusing an exhausted iterator.** A \`map\` or \`filter\` object is empty after one pass, as the run shows.
- **Calling \`reduce\` on possibly empty data without an initializer.** It raises \`TypeError\`; always pass the identity value (\`0\` for addition, \`1\` for multiplication).
- **Lambdas created in a loop.** They all see the loop variable's final value; bind it with a default (\`lambda i=i: ...\`) or \`functools.partial\`.
- **Cramming logic into a lambda.** Nested conditional expressions in a lambda are hard to read and debug; a named \`def\` is clearer and shows a real name in tracebacks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lambda:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lambda x: x * 2</code> is an <strong style="color:#ffca28;">expression</strong> that creates an ordinary function object with one expression as its body; no statements, no annotations, and its name is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;lambda&gt;</code>. It compiles to the same bytecode as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Best use:</strong> <span style="color:#f0e2c8;">Short throwaway callbacks, above all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(people, key=lambda p: p[1])</code>. PEP 8 says use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def</code> rather than assigning a lambda to a name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. map and filter:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map(f, xs)</code> transforms each item and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter(pred, xs)</code> keeps the items where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pred</code> is truthy. In Python 3 both return lazy, single-use iterators, so you often wrap them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. reduce:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.reduce(f, xs, init)</code> folds left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(f(init, x0), x1)...</code>. It moved to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools</code> in Python 3.0, and without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">init</code> an empty input raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Pythonic choice:</strong> <span style="color:#f0e2c8;">Prefer comprehensions over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> with a lambda, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.prod</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code>. Watch out for lambdas in loops capturing the variable late.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a lambda faster than a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">def</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Both create the same kind of function object, and the example shows their <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__code__.co_code</code> is identical. The difference is only syntax and the name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">print(map(str, [1, 2]))</code> not show a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> returns a lazy iterator in Python 3. Nothing is computed until you iterate it, for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(...)</code>, and it can only be consumed once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reduce</code> do with an empty list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without an initializer it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: reduce() of empty iterable with no initial value</code>. With one, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(add, [], 0)</code>, it returns the initializer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid a lambda for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lambda p: p[1]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator.itemgetter(1)</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator.attrgetter("age")</code> for attributes. They are clearer about intent and work as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=</code> functions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[lambda: i for i in range(3)]</code> all return 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The lambdas close over the variable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, not its value, and look it up when called, after the loop has finished. Bind it at creation with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lambda i=i: i</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Lambda (anonymous function) | An expression \`lambda params: expr\` that creates a normal function object named \`<lambda>\` |
| Higher-order function | A function that takes or returns another function, like \`map\`, \`filter\`, \`sorted(key=...)\` |
| Lazy iterator | Produces items on demand and only once; what \`map\` and \`filter\` return in Python 3 |
| Fold (reduce) | Combining a sequence into one value by repeatedly applying a two-argument function |

**Conclusion:** A lambda is not a special kind of function, just a compact expression that builds an ordinary one with a single-expression body, ideal for short \`key=\` callbacks. \`map\` and \`filter\` apply a function lazily and return single-use iterators, and \`functools.reduce\` folds a sequence left to right into one value, needing an initializer for empty input. In everyday Python, comprehensions and built-ins like \`sum\` and \`max\` usually say the same thing more clearly; the strong answer shows both styles and explains that choice.`,
    examples: [
      {
        label: `Lambdas: what they are, what they cannot do, and late binding`,
        code: `# A lambda is an expression that builds a function object.
square = lambda x: x * x

def square_def(x):
    return x * x

print(square(7), square_def(7))  # 49 49
print(square.__name__, square_def.__name__)  # <lambda> square_def
print(type(square) is type(square_def))  # True
# Same bytecode: a lambda is just a def without a name or statements.
print(square.__code__.co_code == square_def.__code__.co_code)  # True

# Its best everyday use: a throwaway key function.
people = [("Ravi", 31), ("Ana", 25), ("Lee", 31)]
print(sorted(people, key=lambda p: p[1]))
print(max(people, key=lambda p: (p[1], p[0])))  # ('Ravi', 31)

# A lambda body must be ONE expression: no statements, no annotations.
try:
    compile("f = lambda x: return x", "<demo>", "exec")
except SyntaxError as e:
    print("SyntaxError:", e.msg)

# A conditional EXPRESSION is fine.
sign = lambda n: "neg" if n < 0 else "zero" if n == 0 else "pos"
print([sign(n) for n in (-2, 0, 5)])  # ['neg', 'zero', 'pos']

# Default arguments, *args and **kwargs all work in lambdas.
greet = lambda name, greeting="hi", *rest, **opts: (greeting, name, rest, opts)
print(greet("Ana"))  # ('hi', 'Ana', (), {})

# Late binding: each lambda looks up i when CALLED, not when created.
late = [lambda: i for i in range(3)]
bound = [lambda i=i: i for i in range(3)]
print([f() for f in late], [f() for f in bound])  # [2, 2, 2] [0, 1, 2]`,
      },
      {
        label: `map, filter and reduce: laziness, edge cases and the comprehension equivalents`,
        code: `from functools import reduce
import operator

nums = [1, 2, 3, 4, 5, 6]

# map and filter return lazy iterators in Python 3, not lists.
doubled = map(lambda x: x * 2, nums)
print(type(doubled).__name__, list(doubled))
# An iterator is single-use: the second pass is empty.
print(list(doubled))

evens = filter(lambda x: x % 2 == 0, nums)
print(list(evens))

# The comprehension equivalents, usually preferred for readability.
print([x * 2 for x in nums])  # [2, 4, 6, 8, 10, 12]
print([x for x in nums if x % 2 == 0])  # [2, 4, 6]

# map with several iterables stops at the shortest one.
print(list(map(operator.add, [1, 2, 3], [10, 20])))  # [11, 22]
# filter(None, ...) keeps only truthy items.
print(list(filter(None, [0, "", "a", [], [1], None, 3])))  # ['a', [1], 3]
# With a named function no lambda is needed at all.
print(list(map(str.upper, ["a", "b"])))  # ['A', 'B']

# reduce folds left to right: f(f(f(1, 2), 3), 4) ...
def traced_add(acc, x):
    print(f"  acc={acc:>2} x={x}")
    return acc + x

print("sum:", reduce(traced_add, [1, 2, 3, 4]))
print(reduce(operator.mul, nums, 1))  # 720

# Empty input: an error without an initializer, the initializer with one.
try:
    reduce(operator.add, [])
except TypeError as e:
    print("TypeError:", e)
print(reduce(operator.add, [], 0))  # 0

# Built-ins usually beat reduce.
import math
print(sum(nums), math.prod(nums), max(nums))  # 21 720 6`,
      },
    ],
  },
];

export default augments;
