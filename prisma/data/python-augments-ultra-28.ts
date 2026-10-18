/**
 * PYTHON ULTRA — batch 28: Data ecosystem and copying (shallow vs deep copy,
 * Pydantic v2 TypeAdapter / strict mode / computed fields, Polars vs pandas,
 * Polars LazyFrame query optimization). Every in-page example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; the runnable: false examples (Pydantic,
 * pandas 3, copy.replace) were run on python3.13. Polars itself was not
 * installed in the verification environment: Polars snippets in the answers
 * are marked as not run. Quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the difference between shallow and deep copy?`,
    difficulty: "medium",
    seoDescription: `Assignment copies nothing, a shallow copy duplicates one level, a deep copy duplicates the whole object graph. Rules, memo, hooks and traps.`,
    description: `**Question presented to candidate:**
"If I have a list of lists and I write \`b = a\`, \`b = a[:]\` or \`b = copy.deepcopy(a)\`, what is different about \`b\` in each case? When does a shallow copy bite you, and why not just deep-copy everything?"

**What a strong answer should cover:**
- Assignment binds a second name to the **same** object; nothing is copied (\`b is a\` is \`True\`)
- A **shallow copy** (\`copy.copy\`, \`list(x)\`, \`x[:]\`, \`x.copy()\`, \`dict(x)\`, \`{**d}\`) builds a new outer container whose slots point at the **same** inner objects
- A **deep copy** (\`copy.deepcopy\`) recursively copies everything reachable, using a **memo** dict so shared references stay shared and cycles do not loop forever
- Consequence: mutating a nested object leaks through a shallow copy, but rebinding a top-level slot does not
- Costs and limits: deep copy is slower and uses more memory; immutable objects (tuples of immutables, ints, strings) come back as the same object; functions and classes are not duplicated; modules, locks and sockets cannot be copied; \`__copy__\` / \`__deepcopy__(memo)\` customise it
- Bonus: \`copy.replace()\` (Python 3.13) for a modified shallow copy, and the \`[[]] * 3\` trap

**Clarifying questions expected:**
- Is the structure nested, and does it contain mutable objects or resources (files, connections, locks)?
- Does the copy need to be independent, or is sharing the inner objects acceptable (or even desired)?

**Code / implementation expected:** Optional — a nested list showing a shallow copy leaking a nested mutation and a deep copy staying independent.`,
    answer: `**Target Audience:** Beginners who have been surprised by "I changed the copy and the original changed too", and anyone preparing for the classic interview follow-ups on \`copy\`.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3). \`copy.replace()\` needs 3.13.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You share a shopping list with a flatmate. There are three ways to "give them a copy":

1. **Tell them where the fridge note is.** You both read and write the *same* piece of paper. That is assignment: \`b = a\`.
2. **Photocopy the list, but the list says "see the blue notebook for party items".** Now there are two lists, but both point to the *same* blue notebook. If your flatmate adds crisps to the notebook, you see crisps too. That is a **shallow copy**.
3. **Photocopy the list and the blue notebook and anything it refers to.** Nothing is shared any more. That is a **deep copy**.

Most bugs come from case 2: people think they made an independent copy, but only the top sheet was duplicated.

## 2. First, What Assignment Really Does

A Python variable is a name tag tied to an object, not a box holding a value (see [How does Python's name and object reference model work?](/interview-question/how-does-python-s-name-and-object-reference-model-work)). \`b = a\` ties a second tag to the same object. No copy happens, so every change made through \`b\` is a change to the one object.

📌 **Interview term: aliasing** — two or more names referring to the same object. \`a is b\` is \`True\` (see [What is the difference between '==' and 'is'?](/interview-question/what-is-the-difference-between-and-is)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 170" role="img" aria-label="Assignment: names a and b both point to one list object">
  <defs>
    <marker id="py28q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="25" width="110" height="44" rx="8"/>
  <text class="d-text" x="85" y="52" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="30" y="105" width="110" height="44" rx="8"/>
  <text class="d-text" x="85" y="132" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="330" y="55" width="260" height="64" rx="10"/>
  <text class="d-text" x="460" y="83" text-anchor="middle">one list object</text>
  <text class="d-sub" x="460" y="104" text-anchor="middle">[[1, 2], [3, 4]]</text>
  <line class="d-edge" x1="140" y1="47" x2="325" y2="78" marker-end="url(#py28q1-arrow)"/>
  <line class="d-edge" x1="140" y1="127" x2="325" y2="98" marker-end="url(#py28q1-arrow)"/>
</svg>

Assignment: two names, one object.

## 3. Shallow Copy: A New Box, the Same Contents

A **shallow copy** creates a *new* outer container and fills it with the *same references* the original holds. For a list of numbers that is all you need: ints are immutable, so sharing them is harmless. For a list of lists, the two outer lists share their inner lists.

📌 **Interview term: shallow copy** — a new top-level object whose elements are references to the same child objects as the original. Made by \`copy.copy(x)\`, \`list(x)\`, \`x[:]\`, \`x.copy()\`, \`dict(d)\`, \`d.copy()\`, \`{**d}\`, \`set(s)\`, \`[*x]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Shallow copy: two outer lists whose slots point to the same two inner lists">
  <defs>
    <marker id="py28q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="170" height="54" rx="8"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">original</text>
  <rect class="d-box" x="30" y="146" width="170" height="54" rx="8"/>
  <text class="d-text" x="115" y="178" text-anchor="middle">shallow</text>
  <rect class="d-box-accent" x="420" y="30" width="180" height="54" rx="8"/>
  <text class="d-text" x="510" y="62" text-anchor="middle">inner [1, 2]</text>
  <rect class="d-box-accent" x="420" y="146" width="180" height="54" rx="8"/>
  <text class="d-text" x="510" y="178" text-anchor="middle">inner [3, 4]</text>
  <line class="d-edge" x1="200" y1="50" x2="415" y2="52" marker-end="url(#py28q1-arrow2)"/>
  <line class="d-edge" x1="200" y1="66" x2="415" y2="162" marker-end="url(#py28q1-arrow2)"/>
  <line class="d-edge-accent" x1="200" y1="166" x2="415" y2="72" marker-end="url(#py28q1-arrow2)"/>
  <line class="d-edge-accent" x1="200" y1="182" x2="415" y2="180" marker-end="url(#py28q1-arrow2)"/>
</svg>

Two outer lists, but only one copy of each inner list: \`original[0].append(99)\` shows up in \`shallow[0]\`.

The key distinction is **mutating** versus **rebinding**:

- \`original[0].append(99)\` *mutates* the shared inner list, so the shallow copy sees it.
- \`original[1] = "new"\` *rebinds* a slot of the original outer list. The shallow copy has its own outer list, so it does not see it.

## 4. Deep Copy: Copy Everything Reachable

\`copy.deepcopy(x)\` walks the whole object graph: it copies the container, then copies each element, then each element of those, and so on.

📌 **Interview term: deep copy** — a recursive copy of an object and every mutable object reachable from it, so the result shares no mutable state with the original.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Deep copy: each outer list points to its own inner lists">
  <defs>
    <marker id="py28q1-arrow3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="170" height="54" rx="8"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">original</text>
  <rect class="d-box" x="30" y="146" width="170" height="54" rx="8"/>
  <text class="d-text" x="115" y="178" text-anchor="middle">deep</text>
  <rect class="d-box-muted" x="330" y="20" width="120" height="44" rx="8"/>
  <text class="d-sub" x="390" y="47" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-muted" x="490" y="20" width="120" height="44" rx="8"/>
  <text class="d-sub" x="550" y="47" text-anchor="middle">[3, 4]</text>
  <rect class="d-box-accent" x="330" y="166" width="120" height="44" rx="8"/>
  <text class="d-sub" x="390" y="193" text-anchor="middle">[1, 2] copy</text>
  <rect class="d-box-accent" x="490" y="166" width="120" height="44" rx="8"/>
  <text class="d-sub" x="550" y="193" text-anchor="middle">[3, 4] copy</text>
  <line class="d-edge" x1="200" y1="50" x2="325" y2="42" marker-end="url(#py28q1-arrow3)"/>
  <line class="d-edge" x1="200" y1="62" x2="485" y2="50" marker-end="url(#py28q1-arrow3)"/>
  <line class="d-edge-accent" x1="200" y1="170" x2="325" y2="184" marker-end="url(#py28q1-arrow3)"/>
  <line class="d-edge-accent" x1="200" y1="184" x2="485" y2="196" marker-end="url(#py28q1-arrow3)"/>
</svg>

After a deep copy the two graphs are fully separate: nothing done to one can be seen through the other.

### How \`deepcopy\` works inside

CPython's \`copy\` module is plain Python (\`Lib/copy.py\`). For each object, \`deepcopy\`:

1. Looks up \`id(obj)\` in a **memo** dict. If the object was already copied in this call, it returns that copy. This is what keeps two references to one list pointing at one copied list, and what stops a cycle (\`node["self"] = node\`) from recursing forever.
2. Returns immutable atoms (ints, strings, \`None\`, functions, classes) **as they are**. There is nothing to protect by copying them.
3. Uses a type-specific copier for \`list\`, \`dict\`, \`tuple\` and friends. A tuple is only rebuilt if one of its elements changed during copying; otherwise you get the very same tuple back.
4. Calls the class \`__deepcopy__(memo)\` if it defines one.
5. Otherwise falls back to the pickle protocol (\`__reduce_ex__(4)\`): for a normal instance that means "make an empty object of the same class, then deep-copy its \`__dict__\` into it". This is why \`deepcopy\` of a module raises \`TypeError: cannot pickle 'module' object\`, and why locks, open files and sockets fail too (see [What is pickling and what are its risks?](/interview-question/what-is-pickling-and-what-are-its-risks)).

📌 **Interview term: memo dictionary** — the \`{id(original): copy}\` map \`deepcopy\` threads through every recursive call. It preserves shared structure and handles cycles. A custom \`__deepcopy__\` must register its result in it.

📌 **Interview term: \`__copy__\` / \`__deepcopy__\`** — hooks a class defines to control \`copy.copy\` and \`copy.deepcopy\`. Typical use: share an expensive or live resource (a connection pool) instead of duplicating it, or reset a cache.

## 5. Working Example: The Three Kinds Side by Side

~~~python
import copy

original = [[1, 2], [3, 4]]
alias = original
shallow = copy.copy(original)
deep = copy.deepcopy(original)

original[0].append(99)     # mutate a nested list
original[1] = "new"        # rebind a top-level slot
~~~

| After the two changes | \`alias\` | \`shallow\` | \`deep\` |
| :--- | :--- | :--- | :--- |
| sees \`original[0].append(99)\` | yes | **yes** | no |
| sees \`original[1] = "new"\` | yes | no | no |
| \`x is original\` | \`True\` | \`False\` | \`False\` |
| \`x[0] is original[0]\` | \`True\` | \`True\` | \`False\` |

The first example below proves every cell of that table, then checks that all the common shallow-copy spellings (\`dict(src)\`, \`src.copy()\`, \`{**src}\`, \`copy.copy(src)\`, \`lst[:]\`, \`list(lst)\`, \`[*lst]\`) share the inner objects, and that copying an immutable tuple returns the same object. The second example covers the memo, cycles, a class with \`__deepcopy__\`, the module error and the \`[[]] * 3\` trap.

## 6. Verified: Running the Code

**Example 1** (Python 3.11, also in the page):

~~~text
True
False
True
False
original: [[1, 2, 99], [3, 4]]
alias   : [[1, 2, 99], [3, 4]]
shallow : [[1, 2, 99], [3, 4]]
deep    : [[1, 2], [3, 4]]
after original[1] = 'new'
alias   : [[1, 2, 99], 'new']
shallow : [[1, 2, 99], [3, 4]]
[False, False, False, False]
[True, True, True, True]
[True, True, True, True]
True True
False
~~~

**Example 2** (Python 3.11, also in the page):

~~~text
True False
True False
['pen', 'ink'] ['pen']
False True
  __deepcopy__ called
sqlite:// {} False
True True
TypeError: cannot pickle 'module' object
[['x'], ['x'], ['x']]
[['x'], [], []]
~~~

Read line by line:

- \`True False\`: \`deepcopy\` kept the two references to \`shared\` pointing at *one* new list, not two. That is the memo at work.
- \`True False\` (second line): the copied dict refers to itself, not to the original. Cycles are safe.
- \`['pen', 'ink'] ['pen']\`: the shallow copy of \`Cart\` shares its \`items\` list; the deep copy does not. \`c2.__dict__ is c1.__dict__\` is \`False\` because \`copy.copy\` gives the new object its own \`__dict__\`, but the values inside are the same objects.
- \`__deepcopy__ called\` and \`{}\`: the custom hook ran, built a fresh connection with an empty cache, and the rest of the dict was still deep-copied (\`False\`).
- \`cannot pickle 'module' object\`: there is no generic way to duplicate a module, so \`deepcopy\` gives up.

**Example 3** (needs Python 3.13, not in the page; run with \`python3.13\`):

~~~text
True
Order(id=1, status='paid', lines=['pen'])
True
Point(x=1, y=5)
2026-01-01
TypeError: replace() does not support Plain objects
~~~

\`copy.replace()\` arrived in Python 3.13 (see the [3.13 "What's New" text](https://docs.python.org/3/whatsnew/3.13.html)). It works on dataclasses, named tuples, \`datetime\` objects and any class that defines \`__replace__\`. It is a **shallow** operation: \`o2.lines is o1.lines\` is \`True\`.

## 7. Choosing the Right Copy

| You have | Use | Why |
| :--- | :--- | :--- |
| A flat list / dict of immutables (\`[1, 2, 3]\`, \`{"a": "x"}\`) | shallow (\`list(x)\`, \`d.copy()\`) | nothing nested to share |
| Nested mutable data you will change (config dicts, grids) | \`copy.deepcopy\` | independent at every level |
| A frozen dataclass / named tuple you want "with one field changed" | \`dataclasses.replace\` or \`copy.replace\` (3.13+) | clearer than copy then set |
| Huge data, performance-sensitive | rebuild only what you change (\`{**d, "k": v}\`, comprehensions) | \`deepcopy\` visits every object |
| Objects holding connections, locks, files | define \`__deepcopy__\` or copy the data, not the object | these cannot be copied generically |

Cost: \`deepcopy\` is pure-Python recursion over every reachable object plus a dict lookup per object, so it is far slower than a shallow copy, and it duplicates memory for everything mutable. For JSON-like data people sometimes use \`json.loads(json.dumps(x))\`; that only works for JSON types and turns tuples into lists, so it is not a general replacement.

## 8. Edge Cases Worth Knowing

- **Tuples are not deep-frozen.** \`(1, [2])\` can still be changed through the list. \`deepcopy\` of it returns a *new* tuple (last line of example 1), while \`deepcopy((1, 2, 3))\` returns the original.
- **Slicing a list is shallow**, even \`x[:]\` and \`x[::-1]\`. So is \`list.copy()\`.
- **Mutable default arguments** are one shared object, so a copy does not help unless you take it inside the function: [Why is using a mutable default argument dangerous?](/interview-question/why-is-using-a-mutable-default-argument-dangerous)
- **Passing to a function does not copy**: the function receives a reference ([Is Python pass-by-value or pass-by-reference?](/interview-question/is-python-pass-by-value-or-pass-by-reference)).
- **\`[[]] * 3\`** is three references to one list; use \`[[] for _ in range(3)]\`.
- **NumPy and pandas** have their own rules: a NumPy slice is a *view*, \`arr.copy()\` is a copy, and pandas 3 uses Copy-on-Write (see [Polars vs pandas: when should you switch in 2025-26?](/interview-question/polars-vs-pandas-when-should-you-switch-in-2025-26)).

## Common Pitfalls

- **Thinking \`b = a[:]\` (or \`list(a)\`, \`dict(d)\`) makes an independent copy of nested data.** Only the outer level is new; the inner lists and dicts are shared.
- **Writing a \`__deepcopy__\` that forgets the memo.** Without \`memo[id(self)] = new\`, shared references to the object get copied more than once and cycles through it recurse.
- **Deep-copying "just to be safe" on hot paths.** It visits every object; in a loop over large structures it dominates the run time. Copy what you change.
- **Deep-copying objects that hold resources.** Locks, sockets, file handles and modules fail with \`TypeError\`; even when copying succeeds, two objects that think they own one connection is a bug.
- **Building a grid with \`[[0] * n] * m\`.** All rows are the same list; set one cell and the whole column changes.
- **Assuming \`copy.replace()\` exists everywhere.** It is 3.13+; on older versions use \`dataclasses.replace\` or \`namedtuple._replace\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Assignment first:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b = a</code> copies nothing: it is a second name for the same object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b is a</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> and every change is shared.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shallow copy:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.copy</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x[:]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d.copy()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{**d}</code> build a <strong style="color:#ffca28;">new outer container</strong> whose slots hold the <strong style="color:#ffca28;">same references</strong>. Fine for flat data of immutables.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trap:</strong> <span style="color:#f0e2c8;">With nested data, mutating an inner object (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0].append(9)</code>) shows through the shallow copy, while rebinding a top-level slot (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[1] = x</code>) does not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Deep copy:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.deepcopy</code> recursively copies everything reachable, using a <strong style="color:#ffca28;">memo</strong> dict keyed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id()</code> so shared references stay shared and cycles terminate. Immutables, functions and classes come back as-is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and control:</strong> <span style="color:#f0e2c8;">It is slower and doubles memory, and fails on modules, locks and sockets. Classes can define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__copy__</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__deepcopy__(memo)</code>; Python 3.13 adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.replace()</code> for a modified shallow copy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deepcopy</code> need a memo dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two reasons. If the same list appears twice, the memo makes both slots point at <strong style="color:#ffca28;">one</strong> copy, preserving the shape of the graph. And for a cycle like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node['self'] = node</code>, the memo returns the copy in progress instead of recursing forever.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">copy.deepcopy((1, 2, 3))</code> create a new tuple?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Our run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True True</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.copy(t) is t, copy.deepcopy(t) is t</code>. A tuple is rebuilt only if one of its elements changed during copying, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepcopy((1, [2]))</code> does return a new tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you customise copying for a class that holds a database connection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__deepcopy__(self, memo)</code>: create the new object, register it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo[id(self)] = new</code>, deep-copy the data fields with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.deepcopy(value, memo)</code> and either share or recreate the connection. Without a hook, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepcopy</code> falls back to the pickle protocol and fails on most live resources.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">json.loads(json.dumps(x))</code> a good deep copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for pure JSON data. It loses tuples (they become lists), sets, dates and custom classes, and turns non-string dict keys into strings. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepcopy</code> keeps types; rebuilding only the changed part is usually faster than both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">copy.replace</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dataclasses.replace</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both return a new object with some fields changed and both are shallow. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.replace</code> (Python 3.13+) is generic: it works for dataclasses, named tuples, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime</code> and any class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__replace__</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Aliasing | Two names bound to the same object; \`a is b\` is \`True\` |
| Shallow copy | New outer container, same element references |
| Deep copy | Recursive copy of every reachable mutable object |
| Memo dictionary | \`{id(obj): copy}\` map that keeps shared references shared and cycles finite |
| \`__copy__\` / \`__deepcopy__\` | Class hooks that control \`copy.copy\` / \`copy.deepcopy\` |
| \`copy.replace()\` | Python 3.13+ function returning a modified shallow copy |

**Conclusion:** Assignment never copies; it only adds a name. A shallow copy gives you a new container that still points at the old contents, which is exactly right for flat data and exactly wrong when you mutate something nested. A deep copy recursively duplicates every reachable mutable object, keeping shared references shared and cycles finite through its memo dict, at a real cost in time and memory and with hard limits around resources. Pick the shallowest copy that keeps the parts you will change independent, and reach for \`__deepcopy__\` or \`copy.replace()\` when a class needs to control what "a copy" means.`,
    examples: [
      {
        label: `Assignment vs shallow vs deep copy on a nested list`,
        code: `import copy

# Three ways to "copy" a nested list
original = [[1, 2], [3, 4]]
alias = original              # assignment: no copy at all
shallow = copy.copy(original) # new outer list, same inner lists
deep = copy.deepcopy(original)  # new outer list AND new inner lists

print(alias is original)  # True
print(shallow is original)  # False
print(shallow[0] is original[0])  # True
print(deep[0] is original[0])  # False

# Mutate a NESTED object: visible through alias and shallow
original[0].append(99)
print("original:", original)
print("alias   :", alias)
print("shallow :", shallow)
print("deep    :", deep)

# Rebind a TOP-LEVEL slot: only the alias sees it
original[1] = "new"
print("after original[1] = 'new'")
print("alias   :", alias)
print("shallow :", shallow)

# Every common shallow copy gives the same result
src = {"tags": ["a"], "n": 1}
copies = [dict(src), src.copy(), {**src}, copy.copy(src)]
print([c is src for c in copies])
print([c["tags"] is src["tags"] for c in copies])

lst = [[0]]
print([c[0] is lst[0] for c in (lst[:], list(lst), lst.copy(), [*lst])])

# Immutable objects: copy hands back the same object
t = (1, 2, 3)
print(copy.copy(t) is t, copy.deepcopy(t) is t)
# ...unless the tuple holds something mutable
t2 = (1, [2])
print(copy.deepcopy(t2) is t2)  # False`,
      },
      {
        label: `deepcopy internals: shared references, cycles, custom hooks, what cannot be copied`,
        code: `import copy

# 1. deepcopy keeps shared references shared (the memo dict)
shared = [0]
pair = [shared, shared]
d = copy.deepcopy(pair)
print(d[0] is d[1], d[0] is shared)

# 2. deepcopy survives cycles
node = {"name": "a"}
node["self"] = node
clone = copy.deepcopy(node)
print(clone["self"] is clone, clone is node)

# 3. Custom classes: copy works through __reduce_ex__ and __dict__
class Cart:
    def __init__(self, owner):
        self.owner = owner
        self.items = []

c1 = Cart("ana")
c1.items.append("pen")
c2 = copy.copy(c1)
c3 = copy.deepcopy(c1)
c1.items.append("ink")
print(c2.items, c3.items)
print(c2.__dict__ is c1.__dict__, c2.items is c1.items)

# 4. Your own hooks: __copy__ and __deepcopy__(memo)
class Conn:
    """Holds a live resource that must never be duplicated."""
    def __init__(self, url):
        self.url = url
        self.cache = {}
    def __deepcopy__(self, memo):
        print("  __deepcopy__ called")
        new = Conn(self.url)              # fresh, empty cache
        memo[id(self)] = new
        return new

conf = {"db": Conn("sqlite://"), "retries": [1, 2]}
conf["db"].cache["k"] = "v"
conf2 = copy.deepcopy(conf)
print(conf2["db"].url, conf2["db"].cache, conf2["retries"] is conf["retries"])

# 5. Functions and classes are returned as-is; a module cannot be copied
print(copy.deepcopy(len) is len, copy.deepcopy(Cart) is Cart)
try:
    copy.deepcopy({"mod": copy})
except TypeError as e:
    print("TypeError:", e)

# 6. The classic look-alike bug: [[]] * 3 is three references, not a copy
grid = [[]] * 3
grid[0].append("x")
print(grid)
fixed = [[] for _ in range(3)]
fixed[0].append("x")
print(fixed)`,
      },
      {
        label: `Python 3.13 copy.replace(): a modified shallow copy`,
        code: `# Python 3.13+: copy.replace() makes a modified shallow copy
import copy
import sys
from dataclasses import dataclass, field
from datetime import date
from typing import NamedTuple

print(sys.version_info[:2] >= (3, 13))

@dataclass(frozen=True)
class Order:
    id: int
    status: str
    lines: list = field(default_factory=list)

o1 = Order(1, "new", ["pen"])
o2 = copy.replace(o1, status="paid")
print(o2)
# replace is SHALLOW: the list is shared
print(o2.lines is o1.lines)

class Point(NamedTuple):
    x: int
    y: int

print(copy.replace(Point(1, 2), y=5))
print(copy.replace(date(2026, 1, 31), day=1))

# A plain class does not support it
class Plain:
    pass
try:
    copy.replace(Plain())
except TypeError as e:
    print("TypeError:", e)`,
        runnable: false,
        python: "3.13",
      },
    ],
  },
  {
    title: `How do TypeAdapter, strict mode, and computed fields work in Pydantic v2?`,
    difficulty: "hard",
    seoDescription: `Pydantic v2 beyond BaseModel: TypeAdapter validates any type, strict mode stops coercion at three levels, computed fields serialize derived values.`,
    description: `**Question presented to candidate:**
"In Pydantic v2, how would you validate a plain \`list[int]\` or a TypedDict that is not a \`BaseModel\`? What does strict mode change, and where can you turn it on? And how do you get a derived value like \`total\` into \`model_dump()\` output?"

**What a strong answer should cover:**
- \`TypeAdapter(T)\` builds a pydantic-core validator and serializer for **any** type (\`list[int]\`, TypedDict, unions, \`Annotated\` constraints, dataclasses): \`validate_python\`, \`validate_json\`, \`dump_python\` / \`dump_json\`, \`json_schema\`; build it **once** and reuse it because building is the expensive part
- **Lax** mode (default) coerces sensible inputs (\`"3"\` to \`3\`, \`3.0\` to \`3\`) but still refuses lossy ones (\`2.9\` for an int); **strict** mode accepts only the exact type for Python input
- Strict at three levels: \`ConfigDict(strict=True)\` on the model, \`Field(strict=True)\` / \`StrictInt\` per field, \`strict=True\` per validation call; JSON input is looser even in strict mode (a JSON string can be a \`date\`)
- \`@computed_field\` on a \`@property\` (or \`cached_property\`) puts a derived value into \`model_dump\`, \`model_dump_json\` and the **serialization** JSON schema, but not into validation input
- Trade-offs: strict mode is for trusted typed producers (internal services); lax for human / HTTP input; computed fields run on every dump unless cached

**Clarifying questions expected:**
- Is the data coming from JSON (an HTTP body, a queue) or from Python objects in the same process?
- Should a string like \`"42"\` be accepted for an integer field, or is that a bug in the producer we want to catch?

**Code / implementation expected:** Yes — a reused \`TypeAdapter\`, one strict and one lax validation of the same input, and a model with a \`@computed_field\` shown in \`model_dump()\`.`,
    answer: `**Target Audience:** Developers who know basic Pydantic \`BaseModel\` usage and want the v2 features interviewers ask about next.
**Difficulty:** Hard
**Python version:** Pydantic examples run on CPython 3.13 with **pydantic 2.13.5** (pydantic-core 2.46.5). Pydantic is a third-party package, so those examples cannot run in the page; the first example is standard library only and runs in the page (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

If you are new to Pydantic, start with [How does Pydantic v2 validation work (BaseModel, field_validator, mode)?](/interview-question/how-does-pydantic-v2-validation-work-basemodel-field-validator-mode). This page builds on it.

## 1. Why This Even Matters — A Story First

Picture a parcel depot. Every parcel passes an inspection desk.

- Some parcels are not in the company box (a \`BaseModel\`): they are a plain bag of items, a \`list[int]\` from a query string. You still want them inspected. That is **\`TypeAdapter\`**: an inspection desk for any shape of parcel, no special box required.
- The inspector can be **relaxed** ("the label says 3 in words, I will write 3") or **strict** ("the label must be a number, send it back"). Relaxed is friendly to humans filling forms; strict catches a sloppy sender before their mistake spreads. That is **lax versus strict mode**.
- When the parcel leaves, the depot stamps a **total weight** on it, worked out from the items. Nobody sends the total in; it is computed and printed on the way out. That is a **computed field**.

## 2. The Problem in Plain Python

Before Pydantic, Python itself is the inspector, and it is inconsistent: \`int("3")\` happily converts, \`int(2.9)\` silently truncates to \`2\`, and \`bool\` is a subclass of \`int\`, so \`isinstance(True, int)\` is \`True\` and a naive check lets \`True\` in as a quantity. A dataclass \`@property\` such as \`total\` is also invisible to \`dataclasses.asdict()\`, so derived values vanish from your JSON unless you add them by hand on every class. The first example (it runs in the page) shows all of this.

## 3. \`TypeAdapter\`: Validation Without a Model

\`BaseModel\` is great for objects with named fields. But APIs also receive a bare list of IDs, a \`dict[str, float]\`, a \`TypedDict\` from another team, or a union of event types. \`TypeAdapter\` wraps **any** type annotation and gives it the same machinery a model has.

📌 **Interview term: \`TypeAdapter\`** — \`TypeAdapter(T)\` compiles a validator and serializer for the type \`T\` in pydantic-core (the Rust engine). Its methods: \`validate_python(obj)\`, \`validate_json(text)\`, \`validate_strings(...)\`, \`dump_python(obj, mode=...)\`, \`dump_json(obj)\` and \`json_schema()\`.

~~~python
from pydantic import TypeAdapter

ints = TypeAdapter(list[int])          # build once, at import time
ints.validate_python(["1", 2, 3.0])    # [1, 2, 3]
ints.validate_json('[4, "5"]')         # [4, 5]  (parsed and validated in one pass)
ints.json_schema()                     # {'items': {'type': 'integer'}, 'type': 'array'}
~~~

How it works: on construction Pydantic turns the annotation into a **core schema** (a nested description such as "list of int with lax rules") and hands it to pydantic-core, which builds a \`SchemaValidator\` and a \`SchemaSerializer\`. Each validate call is then a call into compiled Rust code. \`validate_json\` parses and validates in one step, which is faster than \`json.loads\` followed by \`validate_python\`.

📌 **Interview term: core schema** — the intermediate, language-neutral description of a type that Pydantic generates from your annotations and pydantic-core compiles into a validator. \`BaseModel\` classes build one at class-creation time; \`TypeAdapter\` builds one when you instantiate it.

**Build it once.** Constructing the adapter is the expensive step. On our run, building \`TypeAdapter(list[dict[str, int]])\` took around 100 times longer than one \`validate_python\` call on a small input. So create adapters at module level, not inside a request handler.

Errors are structured: \`ValidationError.errors()\` returns one dict per problem with \`loc\` (the path, such as \`(0, 'score')\`), \`type\` (a stable machine code such as \`int_parsing\` or \`less_than_equal\`), \`msg\` and \`input\`. All problems are collected in one pass, not just the first.

## 4. Lax Mode vs Strict Mode

By default Pydantic is **lax**: it converts input to the declared type when the conversion is unambiguous and not lossy. **Strict** mode turns conversion off for Python input: the value must already be the right type.

📌 **Interview term: lax mode** — the default validation mode. \`"3"\` becomes \`3\`, \`3.0\` becomes \`3\`, \`"yes"\` becomes \`True\`, a tuple becomes a list. Lossy input (\`2.9\` for \`int\`) is still an error.

📌 **Interview term: strict mode** — validation that accepts only instances of the declared type (for Python input). \`"3"\` for an \`int\` is an \`int_type\` error, and so is \`True\`, even though \`bool\` is a subclass of \`int\`.

This table comes from running \`TypeAdapter(tp).validate_python(value, strict=...)\` for each case on pydantic 2.13.5:

~~~python
from datetime import date
from pydantic import TypeAdapter, ValidationError

cases = [(int, True), (int, 3.0), (int, 2.9), (int, "3"), (str, 1), (str, b"ab"),
         (float, "9.5"), (float, 3), (bool, "yes"), (bool, 2), (date, "2026-01-31"), (list[int], (1, 2))]
for tp, value in cases:
    row = []
    for strict in (False, True):
        try:
            row.append(repr(TypeAdapter(tp).validate_python(value, strict=strict)))
        except ValidationError as e:
            row.append("error " + e.errors()[0]["type"])
    name = getattr(tp, "__name__", str(tp))
    print(f"{name:9} {value!r:14} lax: {row[0]:28} strict: {row[1]}")
~~~

~~~text
int       True           lax: 1                            strict: error int_type
int       3.0            lax: 3                            strict: error int_type
int       2.9            lax: error int_from_float         strict: error int_type
int       '3'            lax: 3                            strict: error int_type
str       1              lax: error string_type            strict: error string_type
str       b'ab'          lax: 'ab'                         strict: error string_type
float     '9.5'          lax: 9.5                          strict: error float_type
float     3              lax: 3.0                          strict: 3.0
bool      'yes'          lax: True                         strict: error bool_type
bool      2              lax: error bool_parsing           strict: error bool_type
date      '2026-01-31'   lax: datetime.date(2026, 1, 31)   strict: error date_type
list      (1, 2)         lax: [1, 2]                       strict: error list_type
~~~

Three things in that table surprise people:

- **Lax is not "anything goes".** \`2.9\` for an \`int\` fails (\`int_from_float\`), \`1\` for a \`str\` fails, and \`2\` for a \`bool\` fails. Lax only accepts conversions that lose nothing.
- **Strict \`float\` still accepts an \`int\`.** \`3\` becomes \`3.0\` in strict mode too, because every int is a valid float.
- **Strict \`bool\` is not an \`int\`.** Strict \`int\` rejects \`True\`, which plain \`isinstance\` would not.

### The JSON exception

JSON has no \`date\` type, no tuples and no bytes. So in strict mode, **JSON input** is allowed the representations JSON has: a JSON string is accepted for a \`date\`, a JSON array for a tuple. Example 3 shows \`Strict.model_validate_json('{"qty": 3, "day": "2026-01-31"}')\` succeeding while the same values as Python objects fail. A JSON string \`"3"\` for an \`int\` field still fails in strict mode.

### Where to switch it on

| Level | How | Scope |
| :--- | :--- | :--- |
| Model | \`model_config = ConfigDict(strict=True)\` | every field of that model |
| Field | \`Field(strict=True)\`, or a type like \`StrictInt\`, \`StrictStr\`, \`Annotated[int, Strict()]\` | one field; \`Field(strict=False)\` opts a field back out of a strict model |
| Call | \`Model.model_validate(data, strict=True)\`, \`adapter.validate_python(x, strict=True)\` | one validation |

When to use which: lax at the **edge** where humans and HTML forms produce strings; strict between **internal services** whose producers should already send the right types, so a regression ("someone started sending IDs as strings") fails loudly instead of being silently fixed.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="The string 3 enters a validator; lax mode outputs the integer 3, strict mode raises int_type">
  <defs>
    <marker id="py28q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="126" text-anchor="middle">input "3"</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">a str</text>
  <rect class="d-box" x="240" y="100" width="170" height="60" rx="10"/>
  <text class="d-text" x="325" y="126" text-anchor="middle">validator</text>
  <text class="d-sub" x="325" y="146" text-anchor="middle">field qty: int</text>
  <rect class="d-box-accent" x="490" y="30" width="190" height="60" rx="10"/>
  <text class="d-text" x="585" y="56" text-anchor="middle">lax: 3</text>
  <text class="d-sub" x="585" y="76" text-anchor="middle">coerced to int</text>
  <rect class="d-box" x="490" y="170" width="190" height="60" rx="10"/>
  <text class="d-text" x="585" y="196" text-anchor="middle">strict: error</text>
  <text class="d-sub" x="585" y="216" text-anchor="middle">type int_type</text>
  <line class="d-edge" x1="170" y1="130" x2="235" y2="130" marker-end="url(#py28q2-arrow)"/>
  <line class="d-edge-accent" x1="410" y1="118" x2="485" y2="66" marker-end="url(#py28q2-arrow)"/>
  <line class="d-edge-dashed" x1="410" y1="142" x2="485" y2="194" marker-end="url(#py28q2-arrow)"/>
</svg>

Same input, same field, two policies: lax converts a lossless string, strict refuses anything that is not already an \`int\`.

## 5. Computed Fields: Derived Values in the Output

A computed field is a value **calculated from other fields** that should appear when the model is **serialized**, but is never accepted as input.

📌 **Interview term: \`@computed_field\`** — a decorator placed above \`@property\` (or \`@functools.cached_property\`) on a model. The property is included in \`model_dump()\`, \`model_dump_json()\` and the JSON schema generated in \`mode="serialization"\`. It is listed in \`Model.model_computed_fields\`, not \`Model.model_fields\`.

~~~python
from pydantic import BaseModel, computed_field

class Line(BaseModel):
    unit_price: float
    qty: int

    @computed_field
    @property
    def total(self) -> float:
        return round(self.unit_price * self.qty, 2)
~~~

What our run shows (example 3):

- \`model_dump()\` gives \`{'unit_price': 2.5, 'qty': 4, 'total': 10.0, ...}\`: the derived value is in the output.
- The **serialization** schema lists \`total\`, the **validation** schema does not: documentation generated from the output schema shows it, but it is not an input field.
- Passing \`total=999\` to the constructor is simply ignored (the default \`extra='ignore'\` drops unknown input), and \`.total\` is still computed from the real fields.
- With \`cached_property\` the body ran once (\`(label computed)\` printed once although \`label\` was read twice and dumped twice). Use this when the computation is expensive and the model is not mutated afterwards; a plain \`property\` is recomputed on every access and every dump.
- Annotate the return type (\`-> float\`). Pydantic uses it to serialize the value and to build the schema.

📌 **Interview term: serialization schema vs validation schema** — \`model_json_schema(mode="validation")\` describes what the model **accepts**; \`mode="serialization"\` describes what it **produces**. Computed fields only appear in the second.

## 6. Putting It Together

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Input flows through validation in lax or strict mode into a model instance, then serialization adds computed fields to the output">
  <defs>
    <marker id="py28q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="96" text-anchor="middle">raw input</text>
  <text class="d-sub" x="85" y="116" text-anchor="middle">JSON or dict</text>
  <rect class="d-box" x="210" y="70" width="140" height="60" rx="10"/>
  <text class="d-text" x="280" y="96" text-anchor="middle">validate</text>
  <text class="d-sub" x="280" y="116" text-anchor="middle">lax or strict</text>
  <rect class="d-box-accent" x="410" y="70" width="120" height="60" rx="10"/>
  <text class="d-text" x="470" y="96" text-anchor="middle">instance</text>
  <text class="d-sub" x="470" y="116" text-anchor="middle">typed fields</text>
  <rect class="d-box" x="590" y="70" width="115" height="60" rx="10"/>
  <text class="d-text" x="647" y="96" text-anchor="middle">dump</text>
  <text class="d-sub" x="647" y="116" text-anchor="middle">+ computed</text>
  <line class="d-edge" x1="150" y1="100" x2="205" y2="100" marker-end="url(#py28q2-arrow2)"/>
  <line class="d-edge" x1="350" y1="100" x2="405" y2="100" marker-end="url(#py28q2-arrow2)"/>
  <line class="d-edge" x1="530" y1="100" x2="585" y2="100" marker-end="url(#py28q2-arrow2)"/>
</svg>

Strict mode lives on the way **in**; computed fields live on the way **out**. \`TypeAdapter\` gives both directions to types that are not models.

| Feature | Direction | Turn on with | Typical use |
| :--- | :--- | :--- | :--- |
| \`TypeAdapter\` | in and out | \`TypeAdapter(T)\` | bare lists, TypedDicts, unions, query params, settings values |
| Lax mode | in | default | forms, query strings, CSV |
| Strict mode | in | \`ConfigDict(strict=True)\`, \`Field(strict=True)\`, \`strict=True\` | service-to-service contracts, catching producer bugs |
| \`@computed_field\` | out | decorator on a property | totals, display names, URLs derived from IDs |

## 7. Verified: Running the Code

**Example 1** (standard library, Python 3.11, also in the page):

~~~text
3
2
True
2
True
ok 3
rejected: qty must be int, got bool
rejected: qty must be int, got str
rejected: qty must be int, got float
10.0
{'unit_price': 2.5, 'qty': 4}
{"unit_price": 2.5, "qty": 4}
{'unit_price': 2.5, 'qty': 4, 'total': 10.0}
~~~

**Example 2** (\`TypeAdapter\`, python3.13 with pydantic 2.13.5, not in the page):

~~~text
[1, 2, 3]
[4, 5]
b'[1,2]'
{'items': {'type': 'integer'}, 'type': 'array'}
2 errors
  (1,) int_from_float
  (2,) int_parsing
[{'kind': 'click', 'at': datetime.date(2026, 1, 31), 'score': 7}]
  (0, 'kind') literal_error
  (0, 'at') date_from_datetime_parsing
  (0, 'score') less_than_equal
[{'kind': 'view', 'at': '2026-03-01', 'score': 1}]
~~~

Note \`(0, 'at') date_from_datetime_parsing\` for \`"2026-02-30"\`: the error codes are precise enough to map straight to API error responses. \`dump_python(..., mode="json")\` turned the \`date\` back into the string \`'2026-03-01'\`.

**Example 3** (strict mode and computed fields, python3.13 with pydantic 2.13.5, not in the page):

~~~text
lax model
  ok: qty=3 day=datetime.date(2026, 1, 31)
strict model, Python input
  error: ['int_type', 'date_type']
  error: ['int_type']
strict model, JSON input
  ok: qty=3 day=datetime.date(2026, 1, 31)
  error: ['int_type']
strict fields
  ok: qty=3 price=9.5 code='A1'
  error: ['int_type', 'string_type']
strict per call
  error: ['int_type', 'date_type']
  (label computed)
10.0 4 x 2.5 4 x 2.5
{'unit_price': 2.5, 'qty': 4, 'total': 10.0, 'label': '4 x 2.5'}
{"unit_price":2.5,"qty":4,"total":10.0,"label":"4 x 2.5"}
['label', 'qty', 'total', 'unit_price']
['qty', 'unit_price']
['unit_price', 'qty'] ['total', 'label']
1.0
~~~

The strict model rejected both the \`"3"\` string and \`True\` for \`qty\`, accepted \`"2026-01-31"\` for a \`date\` only when it arrived as JSON, and the per-call \`strict=True\` made the lax model behave strictly for that one call.

Version note: everything here is Pydantic **v2** API (\`ConfigDict\`, \`model_dump\`, \`computed_field\`, \`TypeAdapter\`); v1 used \`parse_obj_as\` for the job \`TypeAdapter\` does; in 2.13.5 \`parse_obj_as\` still works but emits \`PydanticDeprecatedSince20\` telling you to use \`TypeAdapter.validate_python\`. The behaviour shown was checked only on 2.13.5; error \`type\` codes are documented as stable, but check the exact message text on your version.

## Common Pitfalls

- **Creating a \`TypeAdapter\` inside a hot function.** Construction builds the core schema and is about two orders of magnitude slower than a validation on our run. Create it once at module level.
- **Assuming strict mode rejects JSON strings for dates.** For JSON input, strict mode accepts JSON-native representations (a string for a \`date\`). It only bans cross-type conversion such as \`"3"\` for an \`int\`.
- **Assuming lax mode accepts anything.** \`2.9\` for \`int\`, \`1\` for \`str\` and \`2\` for \`bool\` all fail in lax mode. If you need truncation, do it explicitly in a \`field_validator\`.
- **Forgetting \`@property\` under \`@computed_field\`, or the return annotation.** Without the return type Pydantic serializes the value as \`Any\` and the schema loses its type.
- **Expensive work in a plain-property computed field.** It runs on every access and every dump; use \`cached_property\` for immutable data, or a real field set in a \`model_validator\`.
- **Expecting a computed field to be validated input.** It is output only; a client sending \`total\` has it ignored (or rejected with \`extra='forbid'\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. TypeAdapter:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAdapter(T)</code> compiles a pydantic-core validator and serializer for <strong style="color:#ffca28;">any</strong> type: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list[int]</code>, a TypedDict, a union. It has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate_python</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate_json</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dump_json</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json_schema</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Build once:</strong> <span style="color:#f0e2c8;">Construction builds the core schema and is the expensive part; on my run about 100 times one small validation. So adapters live at module level and are reused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lax vs strict:</strong> <span style="color:#f0e2c8;">Lax (default) converts lossless input like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'3'</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> but rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2.9</code>; strict accepts only the exact type for Python input, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'3'</code> and even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> fail for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Three levels:</strong> <span style="color:#f0e2c8;">Strict can be set with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConfigDict(strict=True)</code>, per field with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Field(strict=True)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StrictInt</code>, or per call with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=True</code>. JSON input stays looser: a JSON string still validates as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Computed fields:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@computed_field</code> on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@property</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code> adds a derived value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_dump()</code> and the serialization schema; it is never accepted as input.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TypeAdapter</code> instead of wrapping the list in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BaseModel</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A wrapper model changes the data shape (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{'items': [...]}</code>) and adds a class just for validation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAdapter(list[Item])</code> validates the bare list, produces the same structured errors and a JSON schema, and works for types you do not own such as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypedDict</code> from another module.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">validate_json(text)</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">validate_python(json.loads(text))</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate_json</code> parses and validates in one pass in Rust, which is faster and avoids building intermediate Python objects. It also applies the JSON rules in strict mode, so a JSON string is accepted for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In strict mode, why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">True</code> rejected for an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strict mode checks for the exact type, and Pydantic treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> as distinct from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> there, even though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> subclasses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> in Python. Our run gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int_type</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=True</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> in lax mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cached_property</code> safe for a computed field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the inputs do not change after construction, for example a frozen model. Our run showed the body executing once across several reads and dumps. On a mutable model with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate_assignment</code>, the cached value goes stale after a field update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do computed fields appear in the JSON schema?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only in the <strong style="color:#ffca28;">serialization</strong> schema. Our run of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_json_schema(mode='serialization')</code> listed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">label</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">qty</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unit_price</code>, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mode='validation'</code> listed only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">qty</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unit_price</code>. So API docs built from output schemas show them, and input schemas do not.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`TypeAdapter\` | Validator and serializer for any type, built from its annotation |
| Core schema | Intermediate description of a type that pydantic-core compiles |
| Lax mode | Default validation that performs lossless type conversion |
| Strict mode | Validation that accepts only the declared type for Python input |
| \`@computed_field\` | Property included in dumps and the serialization schema |
| Serialization vs validation schema | What a model produces versus what it accepts |

**Conclusion:** Pydantic v2 splits the job into a Rust core that validates and serializes compiled schemas, and a Python layer that builds them. \`TypeAdapter\` exposes that core for any type, not just models, and should be built once and reused. Strict mode is a per-model, per-field or per-call switch that turns off cross-type coercion for Python input while still accepting JSON-native forms, and lax mode is more careful than its name suggests. Computed fields are the output-side counterpart: derived properties that appear in dumps and the serialization schema but never in the input. Knowing which direction each feature acts on is the clearest way to explain all three.`,
    examples: [
      {
        label: `The problems these features solve, in plain Python (runs in the page)`,
        code: `# The problems Pydantic's strict mode and computed fields solve,
# shown with the standard library only (runs in the page).
import json
from dataclasses import asdict, dataclass

# 1. Plain Python conversion is either too loose or silently lossy
print(int("3"))  # 3
print(int(2.9))  # 2
print(isinstance(True, int))  # True
print(True + True)  # 2

# A naive "is it an int?" check lets bool through
def naive_qty(value):
    if not isinstance(value, int):
        raise TypeError("qty must be int")
    return value

print(naive_qty(True))  # True

# A strict check has to rule out the subclass explicitly
def strict_qty(value):
    if type(value) is not int:
        raise TypeError(f"qty must be int, got {type(value).__name__}")
    return value

for v in (3, True, "3", 3.0):
    try:
        print("ok", strict_qty(v))
    except TypeError as e:
        print("rejected:", e)

# 2. Derived values vanish when you serialize a dataclass
@dataclass
class Line:
    unit_price: float
    qty: int

    @property
    def total(self):
        return round(self.unit_price * self.qty, 2)

line = Line(2.5, 4)
print(line.total)  # 10.0
print(asdict(line))  # {'unit_price': 2.5, 'qty': 4}
print(json.dumps(asdict(line)))  # {"unit_price": 2.5, "qty": 4}

# The hand-written fix you would repeat on every class:
def dump(obj, computed=("total",)):
    data = asdict(obj)
    for name in computed:
        data[name] = getattr(obj, name)
    return data

print(dump(line))  # {'unit_price': 2.5, 'qty': 4, 'total': 10.0}`,
      },
      {
        label: `TypeAdapter: validate, parse JSON, dump and get a schema for any type`,
        code: `# Pydantic v2 TypeAdapter: validate any type, no BaseModel needed
# (needs: pip install pydantic; verified with pydantic 2.13.5)
from datetime import date
from typing import Annotated, Literal, TypedDict

from pydantic import Field, TypeAdapter, ValidationError

# 1. Build the adapter ONCE (it compiles a validator), reuse it many times
ints = TypeAdapter(list[int])
print(ints.validate_python(["1", 2, 3.0]))
print(ints.validate_json('[4, "5"]'))
print(ints.dump_json([1, 2]))
print(ints.json_schema())

# 2. Errors come back as structured data, one per bad item
try:
    ints.validate_python(["1", 2.5, "x"])
except ValidationError as e:
    print(e.error_count(), "errors")
    for err in e.errors(include_url=False):
        print(" ", err["loc"], err["type"])

# 3. Works for TypedDicts, unions and constrained types too
class Event(TypedDict):
    kind: Literal["click", "view"]
    at: date
    score: Annotated[int, Field(ge=0, le=100)]

events = TypeAdapter(list[Event])
print(events.validate_json('[{"kind": "click", "at": "2026-01-31", "score": "7"}]'))
try:
    events.validate_python([{"kind": "buy", "at": "2026-02-30", "score": 101}])
except ValidationError as e:
    for err in e.errors(include_url=False):
        print(" ", err["loc"], err["type"])

# 4. Dump goes the other way: Python objects -> JSON-safe data
print(events.dump_python([{"kind": "view", "at": date(2026, 3, 1), "score": 1}], mode="json"))`,
        runnable: false,
        python: "3.13",
      },
      {
        label: `Strict mode at model, field and call level, plus computed fields`,
        code: `# Pydantic v2 strict mode (three levels) and computed fields
# (needs: pip install pydantic; verified with pydantic 2.13.5)
from datetime import date
from functools import cached_property

from pydantic import BaseModel, ConfigDict, Field, StrictInt, ValidationError, computed_field

def check(fn):
    try:
        print("  ok:", fn())
    except ValidationError as e:
        print("  error:", [err["type"] for err in e.errors(include_url=False)])

# Lax (the default) coerces; strict refuses
class Lax(BaseModel):
    qty: int
    day: date

print("lax model")
check(lambda: Lax(qty="3", day="2026-01-31"))

# Level 1: the whole model is strict
class Strict(BaseModel):
    model_config = ConfigDict(strict=True)
    qty: int
    day: date

print("strict model, Python input")
check(lambda: Strict(qty="3", day="2026-01-31"))
check(lambda: Strict(qty=True, day=date(2026, 1, 31)))
print("strict model, JSON input")
check(lambda: Strict.model_validate_json('{"qty": 3, "day": "2026-01-31"}'))
check(lambda: Strict.model_validate_json('{"qty": "3", "day": "2026-01-31"}'))

# Level 2: one strict field
class Mixed(BaseModel):
    qty: StrictInt
    price: float = Field(strict=False)
    code: str = Field(strict=True)

print("strict fields")
check(lambda: Mixed(qty=3, price="9.5", code="A1"))
check(lambda: Mixed(qty="3", price="9.5", code=1))

# Level 3: per call
print("strict per call")
check(lambda: Lax.model_validate({"qty": "3", "day": "2026-01-31"}, strict=True))

# Computed fields: derived values that are serialized
class Line(BaseModel):
    unit_price: float
    qty: int

    @computed_field
    @property
    def total(self) -> float:
        return round(self.unit_price * self.qty, 2)

    @computed_field
    @cached_property
    def label(self) -> str:
        print("  (label computed)")
        return f"{self.qty} x {self.unit_price}"

line = Line(unit_price=2.5, qty=4)
print(line.total, line.label, line.label)
print(line.model_dump())
print(line.model_dump_json())
print(sorted(Line.model_json_schema(mode="serialization")["properties"]))
print(sorted(Line.model_json_schema(mode="validation")["properties"]))
print(list(Line.model_fields), list(Line.model_computed_fields))
# Input for a computed field is ignored, not validated
print(Line(unit_price=1, qty=1, total=999).total)`,
        runnable: false,
        python: "3.13",
      },
    ],
  },
  {
    title: `Polars vs pandas: when should you switch in 2025-26?`,
    difficulty: "medium",
    seoDescription: `Polars vs pandas in 2025-26: columnar Rust engine and lazy optimizer vs the pandas 3 ecosystem, Copy-on-Write and index. When switching pays off.`,
    description: `**Question presented to candidate:**
"Our team does most of its data work in pandas. People keep saying we should move to Polars. What actually differs between the two, and how would you decide whether a given project should switch?"

**What a strong answer should cover:**
- Engine: Polars is a Rust, multi-threaded, columnar (Apache Arrow memory) DataFrame library with an **expression** API and a **lazy** query optimizer; pandas is eager, mostly NumPy-backed, single-threaded for most operations
- API model: Polars has no row index and no in-place mutation; pandas has the index (label alignment), a huge API and the widest ecosystem (scikit-learn, statsmodels, plotting, notebooks)
- pandas 3.0 (January 2026) narrowed some gaps: Copy-on-Write is the only mode, text columns default to a \`str\` dtype, and \`pd.col\` expressions exist, but execution is still eager
- When switching pays: large files (GBs), heavy group-by / join pipelines, ETL jobs where run time and memory cost money, new code without deep pandas dependencies; when it does not: small data, notebooks tied to pandas-only libraries, code that leans on the index
- Migration strategy: switch at the pipeline boundary, convert with \`to_pandas()\` / \`from_pandas\` for the last step, benchmark on your real data, check Polars version changes (1.0 in July 2024; 2.0 makes streaming the default engine)

**Clarifying questions expected:**
- How big is the data, and is the pain run time, memory, or code complexity?
- Which downstream libraries consume the DataFrames, and do they require pandas?
- Is this a new pipeline or a large existing codebase with tests?

**Code / implementation expected:** Optional — the same filter / group-by in both libraries, or a short argument with numbers from a benchmark on your own data.`,
    answer: `**Target Audience:** Python developers who use pandas and are deciding whether a project should move to Polars, and candidates asked "pandas or Polars?" in a data-engineering interview.
**Difficulty:** Medium
**Python version:** The pandas example ran on CPython 3.13 with **pandas 3.0.5**. The toy model runs in the page (Pyodide 0.25.1, CPython 3.11.3). **Polars was not installed in our verification environment**, so the Polars snippets on this page were not executed: they are shown for the API shape, and every Polars behaviour claim below is cited to Polars documentation or release posts rather than to our own run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Two kitchens get the same order: "the total sales for Oslo".

The **pandas kitchen** works one instruction at a time. "Filter to Oslo" — a cook goes to the store room, brings back every Oslo row with *all* of its columns and lays them out on a bench. "Keep only sales" — a second cook takes that bench and copies the sales column to another bench. "Sum it." Each step is finished and plated before anyone reads the next instruction.

The **Polars kitchen** (in lazy mode) reads the **whole order first**. The head chef sees that only \`city\` and \`sales\` are needed, that only Oslo rows matter, and that the answer is one number. One cook fetches just those two columns, filters while reading, and several cooks sum their share in parallel.

Neither kitchen is "wrong". The first is flexible and familiar; the second does less work. The interview question is really: **when is the second kitchen worth retraining your staff?**

## 2. What Actually Differs

📌 **Interview term: eager execution** — every operation runs immediately and returns a finished result. pandas is eager, and so is a Polars \`DataFrame\`.

📌 **Interview term: lazy execution** — operations build a **query plan**; nothing runs until you call \`.collect()\`. The engine can then optimise the whole plan (Polars \`LazyFrame\`; details in [How does Polars LazyFrame query optimization work?](/interview-question/how-does-polars-lazyframe-query-optimization-work)).

📌 **Interview term: columnar memory (Apache Arrow)** — each column is stored as one contiguous buffer of a single type, plus a validity bitmap for nulls. Reading one column does not drag the other columns through memory, and the CPU can process a column with tight vectorised loops.

📌 **Interview term: expression API** — computations are written as expressions such as \`pl.col("sales").sum()\` that the engine can inspect, reorder and run in parallel, instead of opaque Python functions passed to \`apply\`.

| | pandas 3.x | Polars 1.x / 2.x |
| :--- | :--- | :--- |
| Core | Python/C/Cython over NumPy (Arrow optional) | Rust, Arrow-style columnar memory |
| Execution | eager | eager \`DataFrame\` **and** lazy \`LazyFrame\` with an optimizer |
| Parallelism | mostly single-threaded per operation | multi-threaded by default |
| Row index | yes: labels, alignment, \`MultiIndex\` | no index; rows are positional |
| Missing values | \`NaN\` / \`None\` / \`pd.NA\` depending on dtype; NumPy ints upcast to float | one \`null\` per type, distinct from float \`NaN\` |
| Mutation | allowed via \`.loc\` (Copy-on-Write protects other objects) | immutable style: new frames from expressions |
| Larger than RAM | not built in (chunked reading by hand) | streaming engine; per secondary reports on the 2.0 release, the default for \`collect()\` in 2.0 |
| Ecosystem | the default input of scikit-learn, statsmodels, seaborn, most tutorials | growing; converts with \`to_pandas()\` / \`pl.from_pandas()\` |
| API stability | very mature, large surface | 1.0 declared the API stable in July 2024; renames happened before that |

Sources for the version facts: the [Polars 1.0 announcement](https://pola.rs/posts/announcing-polars-1/) (July 1, 2024); the [pandas 3.0 release post](https://pandas.pydata.org/community/blog/pandas-3.0.html) (pandas 3.0.0 shipped January 21, 2026, with Copy-on-Write as the only mode and a default \`str\` dtype); and press coverage of Polars 2.0 such as [RuntimeWire](https://runtimewire.com/article/polars-2-ritchie-vink-streaming-out-of-core), which reports the streaming engine becoming the default for \`collect()\` and row order no longer being guaranteed for joins and group-bys unless you ask for it with \`maintain_order=True\`. We could not reach the official 2.0 post, so treat the 2.0 details as reported, and check the upgrade guide for your version.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Eager pipeline materialises a full table after each step; lazy pipeline optimises the whole plan and reads only needed columns">
  <defs>
    <marker id="py28q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="30">eager, step by step</text>
  <rect class="d-box-muted" x="20" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="90" y="83" text-anchor="middle">read all</text>
  <rect class="d-box-muted" x="210" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="280" y="83" text-anchor="middle">filter table</text>
  <rect class="d-box-muted" x="400" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="470" y="83" text-anchor="middle">select cols</text>
  <rect class="d-box-muted" x="590" y="50" width="110" height="56" rx="8"/>
  <text class="d-text" x="645" y="83" text-anchor="middle">sum</text>
  <line class="d-edge" x1="160" y1="78" x2="205" y2="78" marker-end="url(#py28q3-arrow)"/>
  <line class="d-edge" x1="350" y1="78" x2="395" y2="78" marker-end="url(#py28q3-arrow)"/>
  <line class="d-edge" x1="540" y1="78" x2="585" y2="78" marker-end="url(#py28q3-arrow)"/>
  <text class="d-sub" x="20" y="180">lazy, whole plan</text>
  <rect class="d-box" x="20" y="200" width="200" height="60" rx="8"/>
  <text class="d-text" x="120" y="227" text-anchor="middle">build plan</text>
  <text class="d-sub" x="120" y="247" text-anchor="middle">nothing runs yet</text>
  <rect class="d-box-accent" x="280" y="200" width="200" height="60" rx="8"/>
  <text class="d-text" x="380" y="227" text-anchor="middle">optimize</text>
  <text class="d-sub" x="380" y="247" text-anchor="middle">push filter and columns</text>
  <rect class="d-box" x="540" y="200" width="160" height="60" rx="8"/>
  <text class="d-text" x="620" y="227" text-anchor="middle">collect</text>
  <text class="d-sub" x="620" y="247" text-anchor="middle">parallel scan</text>
  <line class="d-edge" x1="220" y1="230" x2="275" y2="230" marker-end="url(#py28q3-arrow)"/>
  <line class="d-edge-accent" x1="480" y1="230" x2="535" y2="230" marker-end="url(#py28q3-arrow)"/>
</svg>

Top: each eager step produces a full intermediate result before the next starts. Bottom: the lazy engine sees the whole query, rewrites it, then executes once.

## 3. The Same Query in Both

pandas (this is the style the pandas example below runs):

~~~python
import pandas as pd

df = pd.read_parquet("sales.parquet")                # reads every column
oslo = df[df["city"] == "Oslo"]                       # full intermediate frame
result = oslo.groupby("product")["sales"].sum()
~~~

Polars, lazy (**not run here** — Polars was not installed in our sandbox; method names follow the Polars API docs, where \`group_by\` replaced \`groupby\` in 0.19):

~~~python
import polars as pl

result = (
    pl.scan_parquet("sales.parquet")                  # LazyFrame: nothing read yet
      .filter(pl.col("city") == "Oslo")
      .group_by("product")
      .agg(pl.col("sales").sum())
      .collect()                                      # optimise, then run
)
~~~

With \`scan_parquet\`, the [Polars docs](https://docs.pola.rs/api/python/version/1/reference/api/polars.scan_parquet.html) say the optimizer can push the filter and the column list down into the file scan, so only \`city\`, \`product\` and \`sales\` are read and non-Oslo rows are dropped while reading.

The first example below is a standard-library **toy model** of exactly this difference. It counts "cells touched" for an eager filter-then-select-then-sum versus a fused lazy pass over the same 1,000-row, 6-column table: 3,000 versus 1,250, with the same answer. The numbers are about the toy, not a Polars benchmark; the point is *where* the savings come from (no full intermediate table, no unused columns).

## 4. pandas 3.0 Changed the Comparison

Many "pandas vs Polars" articles were written against pandas 1.x and 2.x. pandas 3.0 removed several of the classic complaints. The second example (python3.13, pandas 3.0.5) shows:

- **Text columns are a real string dtype.** \`df["city"].dtype\` printed \`str\`, not \`object\`. (It is backed by PyArrow when PyArrow is installed; our environment had no PyArrow, so pandas used its Python fallback.)
- **Copy-on-Write is the only mode.** Chained assignment \`df[mask]["sales"] = 0\` raised a \`ChainedAssignmentError\` warning and left \`df\` unchanged; writing to a filtered \`sub\` or to \`col = df["sales"]\` did not touch \`df\` either. The supported in-place update is a single \`df.loc[mask, "sales"] = 0\`. (Copy semantics in general: [What is the difference between shallow and deep copy?](/interview-question/what-is-the-difference-between-shallow-and-deep-copy))
- **\`pd.col\` expressions exist** (\`df.assign(double=pd.col("sales") * 2)\`), which look like Polars expressions. They are still evaluated eagerly; there is no query optimizer behind them.

And two things that did **not** change, and that matter when porting:

- **Index alignment**: \`a + b\` on two Series aligned by label and produced \`[nan, 12.0, 23.0, nan]\`. Polars has no index, so code that silently relies on alignment must be rewritten explicitly (usually as a join).
- **Missing ints**: \`pd.Series([1, None, 3])\` is \`float64\`; the nullable \`Int64\` dtype keeps integers and shows \`<NA>\`. Polars keeps an integer column integer with nulls.

📌 **Interview term: Copy-on-Write (CoW)** — any DataFrame or Series derived from another behaves as an independent copy; the actual data copy is delayed until one of them is written to. pandas 3 makes it the only behaviour.

📌 **Interview term: index alignment** — pandas matches rows by index label, not position, in arithmetic and assignment. Powerful for time series, surprising in ETL.

## 5. So, When Should You Switch?

| Situation | Lean towards | Why |
| :--- | :--- | :--- |
| New ETL / batch pipeline on GB-scale Parquet or CSV | **Polars (lazy)** | pushdown into the scan, multi-threading, lower peak memory |
| Data bigger than RAM on one machine | **Polars streaming**, or DuckDB | pandas has no out-of-core engine |
| Heavy group-by / join workloads where job time costs money | **Polars** | benchmark first on your data, but this is where the gains concentrate |
| Notebook exploration on a few hundred MB | either; **pandas** if the team knows it | speed rarely matters at that size |
| Model training input for scikit-learn / statsmodels, plotting with seaborn | **pandas** at the edge | the ecosystem expects pandas (convert at the last step) |
| Time series that rely on the index (\`resample\`, alignment, \`MultiIndex\`) | **pandas** | Polars has equivalents, but porting index-based logic is real work |
| Large existing pandas codebase with good tests and no performance pain | **stay** | migration cost with no benefit |

A pragmatic migration path:

1. **Measure first.** Profile the slow step on real data ([How do you measure and profile Python performance?](/interview-question/how-do-you-measure-and-profile-python-performance)). If the time is in I/O or in a Python loop, fix that before changing libraries.
2. **Switch at a boundary.** Rewrite one pipeline stage in Polars lazy, end with \`.collect()\`, and call \`.to_pandas()\` only where a pandas-only library needs it (the [\`to_pandas\` reference](https://docs.pola.rs/api/python/dev/reference/dataframe/api/polars.DataFrame.to_pandas.html) says it needs both pandas and PyArrow installed, and that it copies the data unless \`use_pyarrow_extension_array=True\`).
3. **Rewrite, do not transliterate.** \`apply\` with a Python lambda is slow in both; express it with native expressions. Replace index-based logic with explicit joins and sorts.
4. **Pin versions and read upgrade guides.** Polars moved fast before 1.0, and 2.0 changes the default engine and row-order guarantees.

## 6. Verified: Running the Code

**Example 1** (toy model, Python 3.11, also in the page):

~~~text
same answer: True 6000
cells touched eager: 3000
cells touched lazy : 1250
ratio: 2.4
True
~~~

**Example 2** (pandas 3.0.5 on python3.13, not in the page because pandas is a third-party package; the warning is captured with \`warnings.catch_warnings\` so the run is clean):

~~~text
pandas 3.x
city dtype: str
warning: ['ChainedAssignmentError']
after chained assignment: [10, 20, 30]
after writing to sub and col: [10, 20, 30]
after df.loc[...] = 0: [0, 20, 0]
a + b: [nan, 12.0, 23.0, nan]
dtype with a None: float64
nullable Int64: [1, <NA>, 3]
[0, 40, 0]
~~~

What we did **not** verify: any Polars timing or memory number, and Polars output formats. If you quote a speed-up in an interview, quote one you measured on your own data.

## Common Pitfalls

- **Switching for a benchmark, not for your workload.** Published speed-ups use large, synthetic data; on a 50 MB CSV the difference may be invisible next to I/O and plotting.
- **Using Polars eagerly and calling it a migration.** \`pl.read_csv(...).filter(...)\` runs step by step like pandas; most of the optimizer benefit needs \`scan_*\` plus \`.collect()\`.
- **Porting \`apply(lambda ...)\` one-to-one.** Python callbacks (\`map_elements\` in Polars) run row by row in Python and hide intent from the optimizer; use native expressions.
- **Relying on the pandas index after the port.** Polars has no index, so silent label alignment disappears; make joins and sort orders explicit, and do not depend on row order after joins or group-bys in Polars 2.0.
- **Still writing chained assignment in pandas 3.** \`df[mask]["col"] = v\` never updates \`df\` under Copy-on-Write; use one \`df.loc[mask, "col"] = v\`.
- **Converting back and forth in a loop.** \`to_pandas()\` / \`from_pandas()\` costs a conversion each time; convert once at the edge.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The real difference:</strong> <span style="color:#f0e2c8;">Polars is a Rust, multi-threaded, columnar engine with an <strong style="color:#ffca28;">expression</strong> API and a <strong style="color:#ffca28;">lazy</strong> optimizer; pandas is eager, mostly NumPy-backed and largely single-threaded per operation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why Polars is fast:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scan_parquet(...).filter(...).collect()</code> the optimizer sees the whole query, pushes the filter and the column list into the scan, and runs in parallel, so it reads and copies less.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. pandas 3 closed gaps:</strong> <span style="color:#f0e2c8;">pandas 3.0 (January 2026) made Copy-on-Write the only mode, made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> the default text dtype and added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pd.col</code>, but it is still eager and keeps the index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to switch:</strong> <span style="color:#f0e2c8;">GB-scale ETL, heavy joins and group-bys, larger-than-RAM data, or new pipelines: Polars. Small data, notebooks feeding scikit-learn or seaborn, index-heavy time series: pandas.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How to switch:</strong> <span style="color:#f0e2c8;">Profile first, migrate one stage at a time with lazy native expressions, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">to_pandas()</code> only at the edge, pin versions and read the 2.0 notes on streaming and row order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Polars often faster even in eager mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its kernels are Rust over columnar buffers and many operations use all cores, while most pandas operations run on one thread. Lazy mode adds the larger win: the optimizer avoids reading unused columns and rows at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks when you port pandas code that uses the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label alignment. In pandas <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> aligned on labels and gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[nan, 12.0, 23.0, nan]</code> in our run. Polars has no index, so that becomes an explicit join on a key column, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set_index</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loc</code> logic has to be rewritten with filters and joins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Copy-on-Write in pandas 3 make chained assignment work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the opposite. Our run of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">df[mask]['sales'] = 0</code> raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChainedAssignmentError</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">df</code> was unchanged. The only in-place form is a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">df.loc[mask, 'sales'] = 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose DuckDB instead of either?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the team thinks in SQL, when data sits in Parquet files you want to query in place, or when you need joins across files larger than memory. It is a reasonable third option to benchmark alongside the two DataFrame libraries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes in Polars 2.0 that a migration should plan for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As reported for the 2.0 release, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collect()</code> uses the streaming engine by default and joins and group-bys no longer guarantee row order unless you pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maintain_order=True</code> or sort. Tests that compare frames row by row need an explicit sort.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Eager execution | Each operation runs at once and returns a finished result |
| Lazy execution | Operations build a query plan that runs on \`.collect()\` |
| Columnar memory (Apache Arrow) | Each column stored as one typed buffer plus a null bitmap |
| Expression API | Computations as inspectable expressions like \`pl.col('x').sum()\` |
| Copy-on-Write (CoW) | Derived frames act as copies; the data copy happens on first write |
| Index alignment | pandas matches rows by label, not position, in arithmetic |

**Conclusion:** pandas and Polars are no longer "old slow tool versus new fast tool". pandas 3 fixed long-standing pain points with Copy-on-Write, a real string dtype and \`pd.col\`, and it remains the lingua franca of the Python data ecosystem. Polars wins on the engine: columnar Rust, multi-threading, a lazy optimizer that pushes filters and column choices into the scan, and a streaming engine for data larger than memory. Switch when your workload is large, pipeline-shaped and costly to run, write it lazily with native expressions, convert to pandas only at the edges, and justify the move with numbers measured on your own data.`,
    examples: [
      {
        label: `Why a lazy, whole-query engine touches less data (toy model, runs in the page)`,
        code: `# A toy model of why "eager, step by step" (pandas style) does more work
# than "describe the whole query, then run it" (Polars lazy style).
# Standard library only: we count the cells each approach touches.
from array import array

N = 1000
COLS = ["id", "city", "sales", "cost", "notes", "ts"]
cities = ["Oslo", "Lima", "Pune", "Kyiv"]
table = {
    "id": array("q", range(N)),
    "city": [cities[i % 4] for i in range(N)],
    "sales": array("q", (i % 50 for i in range(N))),
    "cost": array("q", (i % 7 for i in range(N))),
    "notes": ["n" * 5 for _ in range(N)],
    "ts": array("q", range(N)),
}
touched = {"eager": 0, "lazy": 0}

# Eager: every step builds a complete new table before the next step runs
def eager_filter(t, col, pred):
    keep = [i for i, v in enumerate(t[col]) if pred(v)]
    out = {c: [t[c][i] for i in keep] for c in t}   # copies ALL columns
    touched["eager"] += len(t[col]) + len(keep) * len(t)
    return out

def eager_select(t, cols):
    out = {c: list(t[c]) for c in cols}
    touched["eager"] += sum(len(t[c]) for c in cols)
    return out

step1 = eager_filter(table, "city", lambda c: c == "Oslo")
step2 = eager_select(step1, ["city", "sales"])
eager_total = sum(step2["sales"])

# Lazy: the engine sees filter + select + sum together, so it reads
# only the two columns it needs and never builds the intermediate table
def lazy_run(t):
    total = 0
    for city, sales in zip(t["city"], t["sales"]):
        touched["lazy"] += 1            # read city
        if city == "Oslo":
            touched["lazy"] += 1        # read sales only for kept rows
            total += sales
    return total

lazy_total = lazy_run(table)

print("same answer:", eager_total == lazy_total, eager_total)
print("cells touched eager:", touched["eager"])
print("cells touched lazy :", touched["lazy"])
print("ratio:", round(touched["eager"] / touched["lazy"], 1))
print(eager_total == lazy_total)  # True`,
      },
      {
        label: `pandas 3.0 behaviours to weigh before switching: str dtype, Copy-on-Write, index alignment`,
        code: `# pandas 3.0 behaviours that matter when you compare it with Polars
# (needs: pip install "pandas>=3"; verified with pandas 3.0.5)
import warnings

import pandas as pd

print("pandas", pd.__version__.split(".")[0] + ".x")
df = pd.DataFrame({"city": ["Oslo", "Lima", "Oslo"], "sales": [10, 20, 30]})

# 1. Text columns are the new str dtype, not object
print("city dtype:", df["city"].dtype)

# 2. Copy-on-Write: chained assignment never writes to df
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    df[df["city"] == "Oslo"]["sales"] = 0
print("warning:", [type(w.message).__name__ for w in caught])
print("after chained assignment:", df["sales"].tolist())

# A derived object is its own copy as far as writes go
sub = df[df["city"] == "Oslo"]
sub.loc[:, "sales"] = 1
col = df["sales"]
col.iloc[0] = 999
print("after writing to sub and col:", df["sales"].tolist())

# The one supported way to update in place: a single .loc call
df.loc[df["city"] == "Oslo", "sales"] = 0
print("after df.loc[...] = 0:", df["sales"].tolist())

# 3. The index: arithmetic aligns on labels, not positions
a = pd.Series([1, 2, 3], index=[0, 1, 2])
b = pd.Series([10, 20, 30], index=[1, 2, 3])
print("a + b:", (a + b).tolist())

# 4. Missing values in a NumPy int column upcast it to float
print("dtype with a None:", pd.Series([1, None, 3]).dtype)
print("nullable Int64:", pd.Series([1, None, 3], dtype="Int64").tolist())

# 5. pandas 3 also has pd.col expressions (Polars-like syntax, still eager)
print(df.assign(double=pd.col("sales") * 2)["double"].tolist())`,
        runnable: false,
        python: "3.13",
      },
    ],
  },
  {
    title: `How does Polars LazyFrame query optimization work?`,
    difficulty: "medium",
    seoDescription: `A Polars LazyFrame is a query plan, not data: how the optimizer pushes filters, columns and row limits into the scan, and how to read explain().`,
    description: `**Question presented to candidate:**
"In Polars, if I write \`pl.scan_parquet(path).filter(...).select(...).head(10).collect()\`, what actually happens between building that chain and getting a DataFrame back? Which optimizations does Polars apply, and how would you check that they happened?"

**What a strong answer should cover:**
- A \`LazyFrame\` holds a **logical query plan**, not data; methods add nodes; \`.collect()\` optimizes the plan and then executes it (\`scan_*\` functions start a lazy plan from a file)
- **Predicate pushdown** (filters applied as early as possible, at the scan), **projection pushdown** (only needed columns are read), **slice pushdown** (only the needed rows)
- Expression and plan rewrites: **expression simplification** / constant folding, **common subplan elimination** (cache repeated subtrees, for example in self-joins), plus type coercion, join ordering and cardinality estimation listed in the Polars user guide
- How to inspect: \`lf.explain()\` (optimized plan) vs \`lf.explain(optimized=False)\`; read \`PROJECT n/m COLUMNS\` and \`SELECTION\` on the scan line
- What defeats it: Python UDFs (\`map_elements\`) the optimizer cannot see into, reading eagerly with \`read_csv\` before going lazy, collecting in the middle of a pipeline

**Code / implementation expected:** Optional — a lazy query and its \`explain()\` output, or a sketch of how a filter moves below a projection into the scan.`,
    answer: `**Target Audience:** Developers who have used Polars (or pandas) and want to explain what the lazy API does under the hood.
**Difficulty:** Medium
**Python version:** The two examples are standard-library toy engines that run in the page (Pyodide 0.25.1, CPython 3.11.3) and were checked on CPython 3.11. **Polars itself was not installed in our verification environment**, so Polars snippets here were not run; Polars behaviour is described from the Polars user guide and API reference, cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

For the "should we use Polars at all" question, see [Polars vs pandas: when should you switch in 2025-26?](/interview-question/polars-vs-pandas-when-should-you-switch-in-2025-26). This page is about the optimizer.

## 1. Why This Even Matters — A Story First

You hand a librarian a note: "Bring me every book in the building. Then keep only the cookbooks. Then tear out the title pages. Then give me the first three."

A literal librarian does exactly that and needs a forklift. A smart librarian reads the **whole note** first and goes to the cookery shelf, copies three title pages, and is back in a minute. Same result, a tiny fraction of the work.

A Polars \`LazyFrame\` turns you into the person writing a note, and the optimizer into the smart librarian. Because nothing runs until \`.collect()\`, Polars sees the entire request and can rewrite it into a cheaper one that gives the same answer.

## 2. A LazyFrame Is a Plan, Not Data

📌 **Interview term: LazyFrame** — a Polars object that represents a query: a tree of operations (scan, filter, select, join, group-by...) that has not been executed. \`pl.scan_csv\`, \`pl.scan_parquet\` and \`df.lazy()\` create one; \`.collect()\` runs it and returns a \`DataFrame\`.

📌 **Interview term: logical plan** — the tree of *what* to compute, independent of *how*. The optimizer rewrites the logical plan; the engine then turns it into a physical plan of concrete operators and executes it.

The life of a lazy query:

1. **Build.** Each method call wraps the previous plan in a new node. \`filter\` adds a filter node above the scan, \`select\` adds a projection node above that, and so on. Nothing is read.
2. **Optimize** (on \`.collect()\` or \`.explain()\`). Rule-based passes rewrite the tree. The [Polars optimizations guide](https://docs.pola.rs/user-guide/lazy/optimizations/) lists predicate pushdown, projection pushdown, slice pushdown, common subplan elimination, expression simplification, join ordering, type coercion and cardinality estimation, and notes how often each runs (some once, some repeatedly until the plan stops changing).
3. **Execute.** The optimized plan runs on the in-memory engine or the streaming engine (which, according to reports on the Polars 2.0 release, became the default for \`collect()\` in 2.0).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Method calls build a logical plan, collect optimizes it, then the engine executes it into a DataFrame">
  <defs>
    <marker id="py28q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="140" height="64" rx="10"/>
  <text class="d-text" x="90" y="97" text-anchor="middle">method calls</text>
  <text class="d-sub" x="90" y="118" text-anchor="middle">filter, select</text>
  <rect class="d-box" x="210" y="70" width="140" height="64" rx="10"/>
  <text class="d-text" x="280" y="97" text-anchor="middle">logical plan</text>
  <text class="d-sub" x="280" y="118" text-anchor="middle">a tree, no data</text>
  <rect class="d-box-accent" x="400" y="70" width="140" height="64" rx="10"/>
  <text class="d-text" x="470" y="97" text-anchor="middle">optimizer</text>
  <text class="d-sub" x="470" y="118" text-anchor="middle">rewrite rules</text>
  <rect class="d-box" x="590" y="70" width="115" height="64" rx="10"/>
  <text class="d-text" x="647" y="97" text-anchor="middle">execute</text>
  <text class="d-sub" x="647" y="118" text-anchor="middle">DataFrame</text>
  <line class="d-edge" x1="160" y1="102" x2="205" y2="102" marker-end="url(#py28q4-arrow)"/>
  <line class="d-edge" x1="350" y1="102" x2="395" y2="102" marker-end="url(#py28q4-arrow)"/>
  <line class="d-edge-accent" x1="540" y1="102" x2="585" y2="102" marker-end="url(#py28q4-arrow)"/>
</svg>

Building is free; all the cost is paid after the optimizer has rewritten the plan.

## 3. The Three Pushdowns

"Pushdown" means moving work **down** the tree, towards the data source, so that less data flows up through the plan.

📌 **Interview term: predicate pushdown** — moving a filter (a *predicate*, a true/false condition) as close to the source as possible, ideally into the scan itself, so rows that fail it are never materialised.

📌 **Interview term: projection pushdown** — working out which columns the whole query needs (selected columns **plus** any column used by a filter, join key or expression) and telling the scan to read only those. On a columnar format like Parquet, unread columns are never even decoded.

📌 **Interview term: slice pushdown** — pushing a \`head(n)\` / \`slice\` down so the source stops after enough rows. It can only pass a filter if the filter moved into the scan first, because a filter changes which rows are "the first n".

The first example builds this exact query in a small standard-library engine:

~~~python
q = Filter(Scan(), 'col("city") == "Oslo"', ...)   # like .filter(pl.col("city") == "Oslo")
q = Select(q, ["id", "sales"])                      # like .select("id", "sales")
q = Head(q, 3)                                      # like .head(3)
~~~

and prints the plan before and after its \`optimize()\` pass:

~~~text
NAIVE PLAN
SLICE first 3
  SELECT ['id', 'sales']
    FILTER col("city") == "Oslo"
      SCAN file; PROJECT */5 COLUMNS; SELECTION: None
~~~

~~~text
OPTIMIZED PLAN
SELECT ['id', 'sales']
  SCAN file; PROJECT 3/5 COLUMNS; SELECTION: col("city") == "Oslo"; LIMIT 3
~~~

The filter moved into the scan, the scan reads 3 of 5 columns (\`id\`, \`city\`, \`sales\` — \`city\` is needed by the filter even though it is not selected), and the scan stops after 3 matching rows. The naive plan read 10,000 rows of 5 columns; the optimized one read 9 rows of 3 columns, and the result is identical (\`True\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Before: slice, select, filter, scan stacked; after: select above a scan that holds the filter, the column list and the limit">
  <defs>
    <marker id="py28q4-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="24">before</text>
  <rect class="d-box-muted" x="40" y="40" width="230" height="44" rx="8"/>
  <text class="d-text" x="155" y="67" text-anchor="middle">slice first 3</text>
  <rect class="d-box-muted" x="40" y="110" width="230" height="44" rx="8"/>
  <text class="d-text" x="155" y="137" text-anchor="middle">select id, sales</text>
  <rect class="d-box-muted" x="40" y="180" width="230" height="44" rx="8"/>
  <text class="d-text" x="155" y="207" text-anchor="middle">filter city == Oslo</text>
  <rect class="d-box-muted" x="40" y="250" width="230" height="56" rx="8"/>
  <text class="d-text" x="155" y="274" text-anchor="middle">scan</text>
  <text class="d-sub" x="155" y="294" text-anchor="middle">all rows, 5 of 5 columns</text>
  <line class="d-edge" x1="155" y1="110" x2="155" y2="88" marker-end="url(#py28q4-arrow2)"/>
  <line class="d-edge" x1="155" y1="180" x2="155" y2="158" marker-end="url(#py28q4-arrow2)"/>
  <line class="d-edge" x1="155" y1="250" x2="155" y2="228" marker-end="url(#py28q4-arrow2)"/>
  <text class="d-sub" x="430" y="24">after</text>
  <rect class="d-box" x="430" y="110" width="250" height="44" rx="8"/>
  <text class="d-text" x="555" y="137" text-anchor="middle">select id, sales</text>
  <rect class="d-box-accent" x="430" y="200" width="250" height="106" rx="8"/>
  <text class="d-text" x="555" y="228" text-anchor="middle">scan</text>
  <text class="d-sub" x="555" y="252" text-anchor="middle">3 of 5 columns</text>
  <text class="d-sub" x="555" y="274" text-anchor="middle">filter city == Oslo</text>
  <text class="d-sub" x="555" y="296" text-anchor="middle">stop after 3 rows</text>
  <line class="d-edge-accent" x1="555" y1="200" x2="555" y2="158" marker-end="url(#py28q4-arrow2)"/>
</svg>

Data flows upward. Before: everything is read and then whittled down. After: the scan itself does the filtering, the column choice and the early stop.

## 4. Expression-Level Rewrites

Polars plans contain **expressions** (\`pl.col("price") * 1.2 > 100\`), and because these are data structures rather than Python functions, the optimizer can rewrite them too.

📌 **Interview term: expression simplification (constant folding)** — evaluating parts of an expression that involve only literals once, at plan time: \`col("price") * (1 + 0.2) > 10 * 10\` becomes \`col("price") * 1.2 > 100\`. The Polars guide also lists replacing expensive operations with cheaper equivalents under this heading.

📌 **Interview term: common subexpression elimination (CSE)** — when the same expression appears several times (\`price * qty\` used in three output columns), compute it once and reuse the result.

📌 **Interview term: common subplan elimination** — the plan-level version: when the same subtree (for example the same file scan) appears in several branches, such as a self-join or a union of two filters of one source, execute it once and cache it. The guide describes it as caching subtrees or file scans used in several places.

The second example implements folding and CSE on a tiny expression tree. Our run printed the folded expression, the three outputs, and \`times price*qty computed: 1\`.

### Why a Python function blocks the optimizer

The same example ends with the most important practical lesson. To push a projection down, the engine must know **which columns an expression reads**. A native expression can answer (\`{'price', 'qty'}\`); a Python lambda cannot, because it is opaque code. Our toy then has to read every column:

~~~text
native expr reads: ['price', 'qty']
python UDF reads : ['id', 'price', 'qty', 'notes', 'ts']
~~~

📌 **Interview term: UDF (user-defined function)** — a Python callable passed to the engine, in Polars for example \`map_elements\`. It runs Python code (and holds the GIL — see [What is the Global Interpreter Lock (GIL)?](/interview-question/what-is-the-global-interpreter-lock-gil)), and the optimizer cannot inspect, reorder or parallelise it as it can a native expression. Our toy shows the consequence for column pruning; the exact set of optimizations Polars skips around a UDF depends on the version, so check \`explain()\`.

## 5. Checking It in Real Polars

**Not run here** — Polars was not installed in our sandbox. Method and parameter names follow the [\`LazyFrame.explain\` reference](https://docs.pola.rs/py-polars/html/reference/lazyframe/api/polars.LazyFrame.explain.html):

~~~python
import polars as pl

lf = (
    pl.scan_parquet("sales.parquet")
      .filter(pl.col("city") == "Oslo")
      .select("id", "sales")
      .head(3)
)
print(lf.explain(optimized=False))   # the plan as you wrote it
print(lf.explain())                  # the plan the optimizer will run
df = lf.collect()                    # optimize + execute
~~~

What to look for, per the [query plan guide](https://docs.pola.rs/user-guide/lazy/query-plan): in the unoptimized plan the scan line says \`PROJECT */N COLUMNS\` (all columns) and the filter is a separate node; in the optimized plan the scan line shows a smaller \`PROJECT k/N COLUMNS\` and a \`SELECTION:\` holding the pushed-down predicate. The guide also says to read the graphical plan from **bottom to top**, and uses σ for selection (filter) and π for projection. Exact formatting differs between Polars versions, so learn the shape rather than the text.

Optimizations are on by default; the \`collect\` docs describe flags to switch individual ones off when debugging (recent versions also expose a \`QueryOptFlags\` object for this, which the docs flag as unstable).

## 6. Verified: Running the Code

**Example 1** (toy pushdown engine, Python 3.11, also in the page):

~~~text
NAIVE PLAN
SLICE first 3
  SELECT ['id', 'sales']
    FILTER col("city") == "Oslo"
      SCAN file; PROJECT */5 COLUMNS; SELECTION: None
[{'id': 0, 'sales': 0}, {'id': 4, 'sales': 4}, {'id': 8, 'sales': 8}] {'rows_read': 10000, 'cols_read': 5}
OPTIMIZED PLAN
SELECT ['id', 'sales']
  SCAN file; PROJECT 3/5 COLUMNS; SELECTION: col("city") == "Oslo"; LIMIT 3
[{'id': 0, 'sales': 0}, {'id': 4, 'sales': 4}, {'id': 8, 'sales': 8}] {'rows_read': 9, 'cols_read': 3}
True
~~~

**Example 2** (toy expression rewrites, Python 3.11, also in the page):

~~~text
before: ((col("price") * (1 + 0.2)) > (10 * 10))
after : ((col("price") * 1.2) > 100)
{'gross': 120, 'taxed': 150.0, 'big': True}
times price*qty computed: 1
native expr reads: ['price', 'qty']
python UDF reads : ['id', 'price', 'qty', 'notes', 'ts']
~~~

These are teaching models written for this page, not Polars internals: Polars runs its rules in Rust over a richer plan representation. What they do prove is the logic of each rule — the optimized plans give the same rows as the naive plans while reading far less.

## 7. What Helps and What Hurts the Optimizer

| Pattern | Effect |
| :--- | :--- |
| Start from \`pl.scan_parquet\` / \`scan_csv\` | pushdowns reach the file reader |
| \`pl.read_csv(...)\` then \`.lazy()\` | the file was already fully read, so there is no scan to push into |
| Native expressions (\`pl.col\`, \`.str\`, \`.dt\`, \`when/then\`) | visible to every rule, run in parallel in Rust |
| \`map_elements(lambda ...)\` | opaque Python, row by row; optimizer cannot see the columns it needs |
| One \`.collect()\` at the end | whole query optimized together |
| \`.collect()\` in the middle, then \`.lazy()\` again | splits the plan in two; nothing is pushed across the break |
| Parquet input | columnar file: unread columns need not be decoded; CSV must still be parsed line by line |

## Common Pitfalls

- **Calling it lazy while starting with \`read_csv\`.** The expensive full read already happened; use \`scan_csv\` / \`scan_parquet\` so pushdown reaches the file.
- **Hiding logic in \`map_elements\`.** A Python lambda is a black box to the optimizer and runs in Python; rewrite it with native expressions.
- **Collecting in the middle "to check".** Each \`.collect()\` executes a plan; break-and-resume pipelines lose cross-step optimization. Use \`explain()\` or \`head()\` on the lazy plan instead.
- **Expecting a slice to pass a filter.** \`head(3)\` after a filter cannot be applied before the filter; it is only pushed into the scan along with it.
- **Assuming row order.** Optimized and streaming execution, and reportedly the 2.0 defaults, do not promise row order after joins and group-bys; sort explicitly.
- **Reading \`explain()\` top-down only.** The source is at the bottom; follow the data upward and look at the scan line first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. A plan, not data:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LazyFrame</code> is a logical query plan; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">select</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join</code> add nodes and nothing runs until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.collect()</code>, which optimizes and then executes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pushdowns:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Predicate pushdown</strong> moves filters into the scan, <strong style="color:#ffca28;">projection pushdown</strong> reads only the columns used anywhere in the query, <strong style="color:#ffca28;">slice pushdown</strong> stops reading after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head(n)</code> rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Expression rewrites:</strong> <span style="color:#f0e2c8;">It folds constants, computes repeated expressions once (CSE), caches repeated subplans such as a self-join source, and also does type coercion and join ordering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to check:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lf.explain(optimized=False)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lf.explain()</code>: the optimized scan line shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PROJECT k/N COLUMNS</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECTION</code> with the pushed filter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What defeats it:</strong> <span style="color:#f0e2c8;">Starting with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read_csv</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scan_csv</code>, Python UDFs via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map_elements</code> that the optimizer cannot inspect, and collecting halfway through the pipeline.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does projection pushdown need to look at filters, not just the final select?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a filter can use a column that is not selected. In our toy, selecting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id, sales</code> with a filter on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">city</code> read 3 of 5 columns: the scan must still read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">city</code> to evaluate the predicate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">head(10)</code> always be pushed into the scan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A slice can only move below operations that do not change which rows come first. It cannot jump over a filter, a sort or a group-by, unless the filter is itself executed inside the scan, as in our toy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between common subexpression and common subplan elimination?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subexpression elimination works inside expressions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">price * qty</code> used three times is computed once. Subplan elimination works on the plan tree: the same scan or subquery appearing in two branches, for example in a self-join, is executed once and cached.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">map_elements</code> slow even on many cores?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It calls a Python function per element, so it runs Python bytecode and is subject to the GIL, and the optimizer cannot see what columns it reads or reorder it. Native expressions run in Rust and can be parallelised and pushed down.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you prove to a reviewer that a filter is pushed down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Print <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lf.explain()</code> and show the predicate in the scan node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECTION</code>, next to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">explain(optimized=False)</code> where it is a separate filter above a scan reading all columns. Then measure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collect()</code> time and memory on real data.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| LazyFrame | Polars object that holds an unexecuted query plan |
| Logical plan | Tree of what to compute; the optimizer rewrites it |
| Predicate pushdown | Apply filters as early as possible, ideally in the scan |
| Projection pushdown | Read only the columns the whole query uses |
| Slice pushdown | Push a row limit down so the source stops early |
| Expression simplification (constant folding) | Precompute literal-only parts of expressions at plan time |
| Common subexpression elimination (CSE) | Compute a repeated expression once |
| Common subplan elimination | Execute a repeated plan subtree once and cache it |
| UDF (user-defined function) | Opaque Python callable such as \`map_elements\` |

**Conclusion:** A Polars \`LazyFrame\` is a description of a query, and that is the whole trick: because nothing executes until \`.collect()\`, the optimizer sees the entire plan and can push filters, column choices and row limits down into the scan, fold constants, reuse repeated expressions and subplans, and pick join orders before any data moves. You make that possible by starting from a \`scan_*\` source, writing native expressions instead of Python callbacks and collecting once, and you confirm it by comparing \`explain(optimized=False)\` with \`explain()\` and reading the scan line.`,
    examples: [
      {
        label: `A toy lazy engine: predicate, projection and slice pushdown with before and after plans`,
        code: `# A tiny lazy query engine: build a plan, optimize it, then run it.
# It mimics three Polars rewrites: predicate, projection and slice pushdown.
COLUMNS = ["id", "city", "sales", "cost", "notes"]
CITIES = ["Oslo", "Lima", "Pune", "Kyiv"]
FILE = [dict(zip(COLUMNS, (i, CITIES[i % 4], i % 50, i % 7, "x" * 20))) for i in range(10_000)]
stats = {}

class Scan:
    def __init__(self, cols=None, pred=None, limit=None):
        self.cols, self.pred, self.limit = cols, pred, limit
    def run(self):
        cols = self.cols or COLUMNS
        out, read = [], 0
        for row in FILE:
            read += 1
            row = {c: row[c] for c in cols}     # only these columns are read
            if self.pred and not self.pred[1](row):
                continue
            out.append(row)
            if self.limit is not None and len(out) == self.limit:
                break
        stats.update(rows_read=read, cols_read=len(cols))
        return out
    def show(self, d):
        proj = f"{len(self.cols)}/{len(COLUMNS)}" if self.cols else f"*/{len(COLUMNS)}"
        sel = self.pred[0] if self.pred else "None"
        lim = "" if self.limit is None else f"; LIMIT {self.limit}"
        return f"{'  ' * d}SCAN file; PROJECT {proj} COLUMNS; SELECTION: {sel}{lim}"

class Filter:
    def __init__(self, child, text, fn, uses):
        self.child, self.text, self.fn, self.uses = child, text, fn, uses
    def run(self):
        return [r for r in self.child.run() if self.fn(r)]
    def show(self, d):
        return f"{'  ' * d}FILTER {self.text}\\n" + self.child.show(d + 1)

class Select:
    def __init__(self, child, cols):
        self.child, self.cols = child, cols
    def run(self):
        return [{c: r[c] for c in self.cols} for r in self.child.run()]
    def show(self, d):
        return f"{'  ' * d}SELECT {self.cols}\\n" + self.child.show(d + 1)

class Head:
    def __init__(self, child, n):
        self.child, self.n = child, n
    def run(self):
        return self.child.run()[: self.n]
    def show(self, d):
        return f"{'  ' * d}SLICE first {self.n}\\n" + self.child.show(d + 1)

def optimize(plan, needed=None, limit=None):
    """Rewrite top-down, carrying the columns and row limit the parents need."""
    if isinstance(plan, Head):                  # slice pushdown: remember n
        return optimize(plan.child, needed, plan.n)
    if isinstance(plan, Select):                # projection pushdown
        return Select(optimize(plan.child, list(plan.cols), limit), plan.cols)
    if isinstance(plan, Filter):                # predicate pushdown
        need = None if needed is None else needed + [c for c in plan.uses if c not in needed]
        child = optimize(plan.child, need)      # a limit cannot pass a filter...
        if isinstance(child, Scan) and child.pred is None:
            child.pred = (plan.text, plan.fn)   # ...unless the filter moves into the scan
            child.limit = limit
            return child
        out = Filter(child, plan.text, plan.fn, plan.uses)
        return out if limit is None else Head(out, limit)
    if isinstance(plan, Scan):
        cols = None if needed is None else [c for c in COLUMNS if c in needed]
        return Scan(cols, plan.pred, limit)
    return plan

def build():
    q = Filter(Scan(), 'col("city") == "Oslo"', lambda r: r["city"] == "Oslo", ["city"])
    q = Select(q, ["id", "sales"])
    return Head(q, 3)

naive = build()
print("NAIVE PLAN\\n" + naive.show(0))
slow = naive.run()
print(slow, stats)

best = optimize(build())
print("OPTIMIZED PLAN\\n" + best.show(0))
fast = best.run()
print(fast, stats)
print(fast == slow)  # True`,
      },
      {
        label: `Expression rewrites: constant folding, common subexpressions, and why a Python UDF blocks pushdown`,
        code: `# Expression-level optimizations in a toy engine: constant folding,
# common subexpression elimination, and why an opaque Python function
# (a UDF) blocks projection pushdown.
from collections import Counter

class Expr:
    def __mul__(self, o): return Op("*", self, wrap(o))
    def __add__(self, o): return Op("+", self, wrap(o))
    def __gt__(self, o): return Op(">", self, wrap(o))

class Col(Expr):
    def __init__(self, name): self.name = name
    def __repr__(self): return f'col("{self.name}")'
    def cols(self): return {self.name}

class Lit(Expr):
    def __init__(self, v): self.v = v
    def __repr__(self): return repr(self.v)
    def cols(self): return set()

class Op(Expr):
    def __init__(self, op, a, b): self.op, self.a, self.b = op, a, b
    def __repr__(self): return f"({self.a!r} {self.op} {self.b!r})"
    def cols(self): return self.a.cols() | self.b.cols()

class UDF(Expr):
    """A Python callable: the engine cannot look inside it."""
    def __init__(self, fn): self.fn = fn
    def __repr__(self): return "python_udf(row)"
    def cols(self): return None          # unknown: needs every column

def wrap(v): return v if isinstance(v, Expr) else Lit(v)
OPS = {"*": lambda x, y: x * y, "+": lambda x, y: x + y, ">": lambda x, y: x > y}

def fold(e):
    """Constant folding: compute literal-only sub-expressions once, at plan time."""
    if isinstance(e, Op):
        a, b = fold(e.a), fold(e.b)
        if isinstance(a, Lit) and isinstance(b, Lit):
            return Lit(OPS[e.op](a.v, b.v))
        return Op(e.op, a, b)
    return e

e = Col("price") * (Lit(1) + 0.2) > Lit(10) * 10
print("before:", e)
print("after :", fold(e))

# Common subexpression elimination: same expression text, computed once
evals = Counter()
def evaluate(e, row, cache):
    key = repr(e)
    if key in cache:
        return cache[key]
    evals[key] += 1
    if isinstance(e, Col): v = row[e.name]
    elif isinstance(e, Lit): v = e.v
    else: v = OPS[e.op](evaluate(e.a, row, cache), evaluate(e.b, row, cache))
    cache[key] = v
    return v

gross = Col("price") * Col("qty")
outputs = {"gross": gross, "taxed": gross * 1.25, "big": gross > 100}
row = {"price": 30, "qty": 4}
cache = {}
print({name: evaluate(x, row, cache) for name, x in outputs.items()})
print("times price*qty computed:", evals[repr(gross)])

# Projection pushdown needs to know which columns an expression reads
SCHEMA = ["id", "price", "qty", "notes", "ts"]
def columns_to_read(exprs):
    need = set()
    for x in exprs:
        c = x.cols()
        if c is None:
            return SCHEMA                 # opaque: read everything
        need |= c
    return [c for c in SCHEMA if c in need]

print("native expr reads:", columns_to_read([Col("price") * Col("qty") > 100]))
print("python UDF reads :", columns_to_read([UDF(lambda r: r["price"] * r["qty"] > 100)]))`,
      },
    ],
  },
];

export default augments;
