/**
 * PYTHON ULTRA — batch 12: iterators and generators I. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the one runnable: false example on
 * python3.13); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the difference between an iterable and an iterator?`,
    difficulty: "medium",
    seoDescription: `Iterable vs iterator in Python: __iter__ and __next__, why iter() hands out fresh iterators, StopIteration, single-pass gotchas and how to test.`,
    description: `**Question presented to candidate:**
"People use 'iterable' and 'iterator' as if they meant the same thing. What exactly is the difference in Python? If I give you a list and a generator, which is which, and why can I loop over the list twice but not the generator?"

**What a strong answer should cover:**
- An **iterable** is anything \`iter()\` can turn into an iterator: it defines \`__iter__\` (or the older \`__getitem__\` sequence protocol). An **iterator** is the object that actually produces values: it defines \`__next__\`, plus an \`__iter__\` that returns itself
- \`next()\` on an exhausted iterator raises \`StopIteration\`; iterators are single-pass and never rewind
- A container such as a list hands out a **new, independent** iterator on every \`iter()\` call, so it can be looped over many times; a generator, \`map\`, \`zip\`, \`enumerate\` or a file object is its own iterator, so it is consumed once
- Every iterator is iterable, but not every iterable is an iterator (\`isinstance(x, Iterator)\` vs \`Iterable\`, and why \`iter(x) is x\` is the quick test)
- Practical consequences: \`in\`, \`any()\`, \`sum()\` partially or fully consume an iterator; the right design is an iterable class whose \`__iter__\` returns a fresh iterator (often a generator)
- The reliable "is it iterable?" check is calling \`iter()\` and catching \`TypeError\`, because \`collections.abc.Iterable\` misses \`__getitem__\`-only classes

**Code / implementation expected:** Optional — a small class pair (container plus iterator) or a demonstration that \`list(gen)\` is empty the second time.`,
    answer: `**Target Audience:** Python developers who loop over things every day and want the precise model behind it
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); the protocol is the same on 3.12 and 3.13

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a book and a bookmark. The **book** holds all the pages. It does not know which page you are on; it just has pages. A **bookmark** knows exactly one thing: where you are. You can move it forward one page at a time, and when it falls off the last page, you are done.

Two friends can read the same book at the same time, each with their own bookmark, and neither disturbs the other. But a bookmark cannot be shared: if your friend moves yours forward three pages, you have lost your place. And a bookmark never goes backwards.

In Python, the book is an **iterable** (a list, a string, a dict). The bookmark is an **iterator**. \`iter(book)\` hands you a new bookmark. \`next(bookmark)\` reads the next page. Falling off the end is \`StopIteration\`. Almost every "my loop ran zero times the second time" bug is someone holding a bookmark and thinking it is the book.

## 2. The Two Roles

**An iterable** is anything you can ask for an iterator. In Python that means it has an \`__iter__\` method that returns an iterator. Lists, tuples, strings, dicts, sets, \`range\` objects and files are all iterable.

**An iterator** is the object that hands out values one at a time. It has a \`__next__\` method: each call returns the next value, and when there are no more, it raises \`StopIteration\`. An iterator also has an \`__iter__\` method that simply returns **itself**, so an iterator can be used anywhere an iterable is expected (for example in a \`for\` loop).

📌 **Interview term: Iterable** — an object whose \`__iter__\` returns an iterator (or, the older way, an object with a \`__getitem__\` that accepts 0, 1, 2 ...). Formally checked with \`collections.abc.Iterable\`.

📌 **Interview term: Iterator** — an object with \`__next__\` (returns the next item or raises \`StopIteration\`) and an \`__iter__\` that returns \`self\`. Checked with \`collections.abc.Iterator\`.

📌 **Interview term: Iterator protocol** — the pair of methods \`__iter__\` and \`__next__\`, and the rule that the end is signalled by raising \`StopIteration\`. The built-ins \`iter()\` and \`next()\` call them.

📌 **Interview term: \`StopIteration\`** — the exception \`__next__\` raises to say "no more items". It is a normal control signal, not an error: \`for\` loops, \`list()\` and \`sum()\` catch it silently.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="One list in the middle-left; two calls to iter produce two separate list iterators, each with its own position">
  <defs>
    <marker id="ii1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="110" width="200" height="80" rx="10"/>
  <text class="d-text" x="130" y="144" text-anchor="middle">nums = [10, 20, 30]</text>
  <text class="d-sub" x="130" y="168" text-anchor="middle">iterable: holds the data</text>
  <rect class="d-box" x="420" y="30" width="230" height="80" rx="10"/>
  <text class="d-text" x="535" y="64" text-anchor="middle">iterator a</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">position: index 2</text>
  <rect class="d-box" x="420" y="190" width="230" height="80" rx="10"/>
  <text class="d-text" x="535" y="224" text-anchor="middle">iterator b</text>
  <text class="d-sub" x="535" y="248" text-anchor="middle">position: index 1</text>
  <path class="d-edge-accent" d="M 230 135 L 414 75" marker-end="url(#ii1-arrow)"/>
  <path class="d-edge-accent" d="M 230 165 L 414 225" marker-end="url(#ii1-arrow)"/>
  <text class="d-sub" x="320" y="88" text-anchor="middle">iter(nums)</text>
  <text class="d-sub" x="320" y="226" text-anchor="middle">iter(nums)</text>
</svg>

A list never runs out because it never moves. Each \`iter(nums)\` call creates a brand new \`list_iterator\` that holds a reference to the list plus its own index. That is why Example 1 can pull two items from \`a\` and still get \`10\` from \`b\`.

## 3. Walking Through Example 1

~~~python
nums = [10, 20, 30]
print(isinstance(nums, Iterable))   # True
print(isinstance(nums, Iterator))   # False: no __next__

it = iter(nums)                      # a list_iterator
next(it), next(it)                   # 10, 20
iter(it) is it                       # True: an iterator returns itself
list(it)                             # [30]  (only what was left)
list(it)                             # []    (exhausted, forever)
~~~

The key line is \`iter(it) is it\`. When a \`for\` loop or \`list()\` receives something, it calls \`iter()\` on it first. For a list that produces a fresh iterator starting at index 0. For an iterator it returns the very same object, already part-way through. So \`list(it)\` continues from wherever \`it\` was, and once it is empty it stays empty.

The second half of the example writes both roles by hand:

~~~python
class Countdown:                       # the iterable (the book)
    def __init__(self, start):
        self.start = start
    def __iter__(self):
        return CountdownIterator(self.start)   # a NEW bookmark each time

class CountdownIterator:               # the iterator (the bookmark)
    def __init__(self, current):
        self.current = current
    def __iter__(self):
        return self
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1
~~~

\`list(Countdown(3))\` gives \`[3, 2, 1]\` every time. The class \`OnePass\`, which puts the position on the container itself and returns \`self\` from \`__iter__\`, gives \`[3, 2, 1]\` once and then \`[]\`. That is the most common design bug with custom iterables: the container is acting as its own bookmark.

In practice you rarely write the iterator class by hand. Make \`__iter__\` a generator function and Python builds the iterator for you (see [what generators are and why to use them](/interview-question/what-are-generators-and-why-use-them)).

📌 **Interview term: Exhaustion** — the state of an iterator after it has raised \`StopIteration\`. By convention it must keep raising \`StopIteration\` on every later \`next()\`; it never restarts.

## 4. How the Built-ins Split

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Two groups: containers such as list, tuple, dict, str and range return a new iterator from iter; map, zip, enumerate, generators and files return themselves">
  <rect class="d-box-accent" x="30" y="30" width="290" height="170" rx="10"/>
  <text class="d-text" x="175" y="64" text-anchor="middle">Iterable only</text>
  <text class="d-sub" x="175" y="96" text-anchor="middle">list, tuple, dict, set, str</text>
  <text class="d-sub" x="175" y="124" text-anchor="middle">range, bytes</text>
  <text class="d-sub" x="175" y="164" text-anchor="middle">iter(x) is a new object</text>
  <rect class="d-box" x="360" y="30" width="290" height="170" rx="10"/>
  <text class="d-text" x="505" y="64" text-anchor="middle">Iterator (and iterable)</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">map, filter, zip, enumerate</text>
  <text class="d-sub" x="505" y="124" text-anchor="middle">generators, file objects</text>
  <text class="d-sub" x="505" y="164" text-anchor="middle">iter(x) is x</text>
</svg>

Example 2 prints this split for nine common objects using the \`iter(obj) is obj\` test. Note that \`range\` is in the left group: it is lazy (it never builds a list), but it is a re-usable iterable, not an iterator. Laziness and being an iterator are different properties.

| | Iterable | Iterator |
| :--- | :--- | :--- |
| Required method | \`__iter__\` (or \`__getitem__\`) | \`__next__\` and \`__iter__\` returning \`self\` |
| What it knows | the data (or how to make it) | the current position |
| \`iter(x)\` returns | a new iterator | \`x\` itself |
| Loop over it twice | works both times | second loop gets nothing |
| \`len()\`, indexing | often (lists, strings) | no |
| Examples | \`list\`, \`str\`, \`dict\`, \`range\` | generator, \`map\`, \`zip\`, file |

## 5. The Edges of the Protocol

**The old sequence protocol.** If a class has no \`__iter__\` but has a \`__getitem__\`, \`iter()\` still works: it builds an iterator that calls \`obj[0]\`, \`obj[1]\`, ... until \`IndexError\`. Example 2's \`Squares\` class loops fine, yet \`isinstance(sq, Iterable)\` is \`False\`, because the ABC only checks for \`__iter__\`. The honest test for "can I loop over this?" is:

~~~python
def is_iterable(obj):
    try:
        iter(obj)
    except TypeError:
        return False
    return True
~~~

This is [duck typing](/interview-question/what-is-duck-typing-in-python) in its purest form: ask, do not check the type. More on the ABCs in [abstract base classes and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols).

📌 **Interview term: Sequence protocol (\`__getitem__\` fallback)** — the pre-iterator way to be iterable: integer indexing from 0 until \`IndexError\`. \`iter()\` still honours it.

**\`iter(callable, sentinel)\`.** The two-argument form calls a function repeatedly until it returns the sentinel value. \`iter(lambda: f.read(3), "")\` reads a file in fixed-size chunks and stops at end-of-file (Example 2, part 2).

**Consuming operations.** \`x in iterator\` advances the iterator until it finds \`x\`, so the items before and including it are gone (Example 2 shows \`3 in it\` leaving \`[4, 5]\`). \`sum()\`, \`max()\`, \`list()\`, \`sorted()\` and unpacking consume everything. See [how the in operator works](/interview-question/how-does-the-in-operator-work-in-python).

**Sharing one iterator on purpose.** \`zip(it, it)\` with the same iterator twice pulls alternate items into pairs: \`[('a', 'b'), ('c', 'd'), ('e', 'f')]\`. It is a neat trick precisely because an iterator is shared state. See [enumerate and zip](/interview-question/what-do-enumerate-and-zip-do).

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — a list, its iterator, and writing both roles yourself** prints:

~~~text
True
False
False
list_iterator
True
first next: 10
second next: 20
True
rest of it: [30]
after exhaustion: []
next() on an empty iterator raises StopIteration
a: 10 20 b: 10
the list is still full: [10, 20, 30]
pass 1: [3, 2, 1]
pass 2: [3, 2, 1]
one pass 1: [3, 2, 1]
one pass 2: []
~~~

**Example 2 — \`__getitem__\` fallback, \`iter(callable, sentinel)\` and single-pass traps** prints:

~~~text
for over __getitem__: [0, 1, 4, 9]
iter() works: iterator
False
True False
chunks: ['abc', 'def', 'gh']
3 in it: True
left after the in test: [4, 5]
sum: 30 second sum: 0
file is its own iterator: True
first line: line 1
for loop picks up where next() stopped: ['line 2', 'line 3']
pairs: [('a', 'b'), ('c', 'd'), ('e', 'f')]
list            iterable
tuple           iterable
dict            iterable
str             iterable
range           iterable
list_iterator   iterator
map             iterator
zip             iterator
enumerate       iterator
~~~

**What the output shows:** the list is iterable but has no \`__next__\`; its iterator returns itself from \`iter()\`, empties once and stays empty, while two separate iterators over the same list do not affect each other. \`Countdown\` gives the full sequence on every pass and \`OnePass\` only once. A \`__getitem__\`-only class loops fine but fails the ABC check; \`in\` and \`sum\` consume iterators; and of the nine built-ins, only the containers produce a new object from \`iter()\`.

## Common Pitfalls

- **Passing an iterator to code that loops twice.** A function that does \`total = sum(xs)\` then \`count = len(list(xs))\` silently gets \`0\` for the second pass when \`xs\` is a generator. Accept an iterable and call \`list()\` once if you need two passes, or document that you need a sequence.
- **Making the container its own iterator.** Storing the position on the object and returning \`self\` from \`__iter__\` gives a one-shot container. Return a new iterator (or use a generator) from \`__iter__\`.
- **Testing with \`hasattr(x, "__iter__")\` or \`isinstance(x, Iterable)\`.** Both miss \`__getitem__\`-only classes. Call \`iter(x)\` and catch \`TypeError\`. And remember \`str\` is iterable, which surprises code that expects "a list of strings".
- **Forgetting that \`in\` consumes.** \`if item in gen:\` followed by a loop over \`gen\` starts after \`item\`.
- **Thinking lazy means iterator.** \`range\`, \`dict.keys()\` and other views are lazy but re-iterable; \`map\` and generators are lazy and one-shot.
- **Raising the wrong thing at the end.** \`__next__\` must raise \`StopIteration\`, not return \`None\`; returning \`None\` makes an infinite loop of \`None\` values.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The split:</strong> <span style="color:#f0e2c8;">An iterable can produce an iterator: it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code>. An iterator produces the values: it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;next&#95;&#95;</code>, which raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> at the end, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> that returns itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The analogy:</strong> <span style="color:#f0e2c8;">The iterable is the book, the iterator is the bookmark. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code> gives a new bookmark; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> turns a page; bookmarks never go back.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why lists loop twice:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(list)</code> creates a fresh <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list&#95;iterator</code> every time. A generator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> or file is its own iterator, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(gen) is gen</code> and the second loop gets nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Every iterator is iterable:</strong> <span style="color:#f0e2c8;">Because its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>, it can go straight into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop, but not every iterable is an iterator.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Design rule:</strong> <span style="color:#f0e2c8;">For a re-usable custom collection, make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> return a new iterator, usually by writing it as a generator; test iterability with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(x)</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/except TypeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">range</code> an iterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a lazy iterable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(range(3))</code> returns a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range&#95;iterator</code>, so you can loop over the same range many times. It also supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> and indexing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check whether an object is iterable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(obj)</code> and catch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(obj, collections.abc.Iterable)</code> only looks for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> and misses classes that use the old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;getitem&#95;&#95;</code> protocol.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does an iterator need an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> method at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So it can be used wherever an iterable is expected. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip()</code> call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code> on their argument first; an iterator answers with itself and carries on from its current position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next()</code> on an exhausted iterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> again, every time. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(it, default)</code> returns the default instead of raising.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">zip(it, it)</code> do with a single iterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both slots pull from the same iterator, so items are taken alternately and you get consecutive pairs. It works only because an iterator is shared, single-pass state.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Iterable** | something \`iter()\` can turn into an iterator (the book) |
| **Iterator** | the object with \`__next__\` that hands out values and remembers the position (the bookmark) |
| **Iterator protocol** | \`__iter__\` plus \`__next__\`, ending with \`StopIteration\` |
| **\`StopIteration\`** | the "no more items" signal \`__next__\` raises |
| **Exhaustion** | an iterator that has finished and will keep raising \`StopIteration\` |
| **Sequence protocol** | the older \`__getitem__(0, 1, 2 ...)\` way to be iterable |

---
**Conclusion:** An iterable is a source of iterators and an iterator is a single, forward-only position over some values. Containers like lists and dicts are iterables that hand out a new iterator on every \`iter()\` call, which is why they can be looped over again and again; generators, \`map\`, \`zip\` and files are their own iterators, so \`iter(x) is x\` and they are consumed once. Keeping the two roles separate (the book and the bookmark) explains the "empty second loop" bug, guides how to write a custom collection, and is the foundation for [how a for loop works under the hood](/interview-question/how-does-a-for-loop-work-under-the-hood).
`,
    examples: [
      { label: `A list, its iterator, and writing both roles yourself`, code: `from collections.abc import Iterable, Iterator

# 1. A list is iterable, but it is not an iterator.
nums = [10, 20, 30]
print(isinstance(nums, Iterable))  # True
print(isinstance(nums, Iterator))  # False
print(hasattr(nums, "__next__"))  # False

# 2. iter() asks the list for a fresh iterator object.
it = iter(nums)
print(type(it).__name__)  # list_iterator
print(isinstance(it, Iterator))  # True
print("first next:", next(it))
print("second next:", next(it))

# 3. An iterator returns itself from iter(), so it is also iterable.
print(iter(it) is it)  # True
print("rest of it:", list(it))
print("after exhaustion:", list(it))
try:
    next(it)
except StopIteration:
    print("next() on an empty iterator raises StopIteration")

# 4. Every iter(list) call is independent; the list never runs out.
a, b = iter(nums), iter(nums)
print("a:", next(a), next(a), "b:", next(b))
print("the list is still full:", nums)

# 5. Writing both roles yourself.
class Countdown:
    """Iterable: holds the data, hands out a new iterator each time."""
    def __init__(self, start):
        self.start = start
    def __iter__(self):
        return CountdownIterator(self.start)

class CountdownIterator:
    """Iterator: holds the position, single pass."""
    def __init__(self, current):
        self.current = current
    def __iter__(self):
        return self
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

c = Countdown(3)
print("pass 1:", list(c))
print("pass 2:", list(c))

# 6. The same class written as its own iterator: only one pass.
class OnePass:
    def __init__(self, start):
        self.current = start
    def __iter__(self):
        return self
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

o = OnePass(3)
print("one pass 1:", list(o))
print("one pass 2:", list(o))` },
      { label: `__getitem__ fallback, iter(callable, sentinel), and single-pass traps`, code: `from collections.abc import Iterable
import io

# 1. The old sequence protocol: __getitem__ with 0, 1, 2 ... until IndexError.
class Squares:
    def __getitem__(self, i):
        if i >= 4:
            raise IndexError(i)
        return i * i

sq = Squares()
print("for over __getitem__:", [x for x in sq])
print("iter() works:", type(iter(sq)).__name__)
# The ABC only looks for __iter__, so it says False.
print(isinstance(sq, Iterable))  # False
# The reliable test is to call iter() and catch TypeError.
def is_iterable(obj):
    try:
        iter(obj)
    except TypeError:
        return False
    return True
print(is_iterable(sq), is_iterable(42))  # True False

# 2. iter(callable, sentinel): call until the sentinel comes back.
stream = io.StringIO("abcdefgh")
chunks = list(iter(lambda: stream.read(3), ""))
print("chunks:", chunks)

# 3. Iterators are single-pass: in, any() and max() consume them.
it = iter([1, 2, 3, 4, 5])
print("3 in it:", 3 in it)
print("left after the in test:", list(it))

gen = (n * n for n in range(5))
print("sum:", sum(gen), "second sum:", sum(gen))

# 4. A file object is its own iterator.
f = io.StringIO("line 1\\nline 2\\nline 3\\n")
print("file is its own iterator:", iter(f) is f)
print("first line:", next(f).strip())
print("for loop picks up where next() stopped:", [line.strip() for line in f])

# 5. One iterator shared by zip: the pairing trick.
letters = iter("abcdef")
print("pairs:", list(zip(letters, letters)))

# 6. Iterable vs iterator for common built-ins.
for obj in ([1], (1,), {1: 2}, "ab", range(2), iter([1]), map(str, [1]), zip([1], [2]), enumerate([1])):
    kind = "iterator" if iter(obj) is obj else "iterable"
    print(f"{type(obj).__name__:15} {kind}")` },
    ],
  },
  {
    title: `How does a for loop work under the hood?`,
    difficulty: "medium",
    seoDescription: `What a Python for loop really does: iter(), repeated next(), StopIteration, the GET_ITER and FOR_ITER bytecode, for-else and mutation traps.`,
    description: `**Question presented to candidate:**
"Forget the syntax for a second. When Python runs \`for x in something:\`, what actually happens, step by step? What does the interpreter call, how does it know when to stop, and what does that explain about bugs like modifying a list while you loop over it?"

**What a strong answer should cover:**
- The loop calls \`iter(something)\` once (which uses \`type(something).__iter__\`, or the \`__getitem__\` fallback), then calls \`next()\` on the result before every pass, assigning the value to the loop target
- The loop ends when \`__next__\` raises \`StopIteration\`; the loop catches it, so the user never sees it, and then the \`else\` clause runs if there was no \`break\`
- It is equivalent to a \`while True\` loop with \`try: x = next(it) except StopIteration: break\`; CPython compiles it to \`GET_ITER\` plus a \`FOR_ITER\` / \`JUMP_BACKWARD\` loop (\`END_FOR\` added in 3.12)
- The loop target is an ordinary assignment: it can unpack, it keeps its last value after the loop, and rebinding it in the body does not affect the next item
- Consequences: a list iterator is just an index, so removing items while looping skips elements; dicts and sets raise \`RuntimeError\` if their size changes; a generator can only be looped once
- \`for\` works on any iterable, not only sequences: no indexes are involved, which is why it works on files, generators and infinite streams

**Code / implementation expected:** Optional — rewriting a \`for\` loop as the equivalent \`while\` loop with \`iter()\`, \`next()\` and \`StopIteration\`.`,
    answer: `**Target Audience:** Python developers who write \`for\` loops all day and want to know exactly what the interpreter does for one
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); bytecode also compared with CPython 3.12

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

At a deli counter you take a ticket and wait. The person behind the counter does not look at the whole queue; they only ever say one thing: "Next!" Someone steps forward, gets served, and again: "Next!" When nobody steps forward, the server puts up a "closed" sign and goes home.

A Python \`for\` loop is that server. It does not count, it does not use indexes, and it has no idea how long the queue is. It asks for a **ticket machine** once (\`iter()\`), then shouts "next!" (\`next()\`) until the machine says "nobody left" (\`StopIteration\`). Once you see the loop this way, three things become obvious: why it works on files and endless streams, why changing a list while looping over it misbehaves, and why a generator can only be looped over once.

## 2. The Loop, Step by Step

For \`for x in obj: body\`, Python does this:

1. Evaluate \`obj\` once.
2. Call \`iter(obj)\` once, getting an **iterator**. (That uses \`type(obj).__iter__\`; if there is none it falls back to \`__getitem__\` with 0, 1, 2 ...; otherwise \`TypeError: 'int' object is not iterable\`.)
3. Call \`next(iterator)\`.
4. If that returned a value, assign it to \`x\` and run the body. Go back to step 3.
5. If it raised \`StopIteration\`, stop looping quietly, run the \`else:\` block if there is one, and continue after the loop.

A \`break\` leaves at step 4 and skips the \`else\` block. A \`continue\` jumps straight back to step 3.

📌 **Interview term: Iterator protocol** — \`__iter__\` (give me an iterator) and \`__next__\` (give me the next item, or raise \`StopIteration\`). The loop only ever talks to the object through these two methods. The difference between the two roles is covered in [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Flow of a for loop: iter called once, then next in a loop; a value goes to the body and back to next; StopIteration leads to the else block and the end">
  <defs>
    <marker id="fl1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="180" height="60" rx="8"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">it = iter(obj)</text>
  <rect class="d-box-accent" x="270" y="30" width="180" height="60" rx="8"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">next(it)</text>
  <rect class="d-box" x="510" y="30" width="160" height="60" rx="8"/>
  <text class="d-text" x="590" y="56" text-anchor="middle">x = value</text>
  <text class="d-sub" x="590" y="76" text-anchor="middle">run the body</text>
  <rect class="d-box" x="270" y="230" width="180" height="60" rx="8"/>
  <text class="d-text" x="360" y="256" text-anchor="middle">StopIteration</text>
  <text class="d-sub" x="360" y="276" text-anchor="middle">caught by the loop</text>
  <rect class="d-box-muted" x="510" y="230" width="160" height="60" rx="8"/>
  <text class="d-text" x="590" y="256" text-anchor="middle">else block</text>
  <text class="d-sub" x="590" y="276" text-anchor="middle">then the loop ends</text>
  <path class="d-edge" d="M 210 60 L 264 60" marker-end="url(#fl1-arrow)"/>
  <path class="d-edge-accent" d="M 450 50 L 504 50" marker-end="url(#fl1-arrow)"/>
  <path class="d-edge-accent" d="M 590 90 L 590 140 L 400 140 L 400 96" marker-end="url(#fl1-arrow)"/>
  <text class="d-sub" x="500" y="164" text-anchor="middle">loop again</text>
  <path class="d-edge-dashed" d="M 330 90 L 330 224" marker-end="url(#fl1-arrow)"/>
  <text class="d-sub" x="318" y="170" text-anchor="end">no more items</text>
  <path class="d-edge" d="M 450 260 L 504 260" marker-end="url(#fl1-arrow)"/>
</svg>

\`iter()\` is called exactly once per loop; \`next()\` is called once per item plus one final time that raises \`StopIteration\`. Example 1 proves the counts by printing every call.

## 3. The Same Loop, Written by Hand

Example 1 runs a loop over a class that announces each protocol call, then runs this hand-written version over the same data and gets an identical trace:

~~~python
_it = iter(Loud(["red", "green"]))
while True:
    try:
        word = next(_it)
    except StopIteration:
        break
    print("  body got", word)
~~~

The trace, for both versions:

~~~text
  __iter__ called once
  __next__ -> 'red'
  body got red
  __next__ -> 'green'
  body got green
  __next__ -> StopIteration
~~~

One subtle difference: the real loop only treats a \`StopIteration\` coming from **its own \`next()\` call** as the end. A \`StopIteration\` raised inside the body is an ordinary exception and escapes the loop (Example 1, part 5). The hand-written version above behaves the same way, because the \`try\` only wraps the \`next()\` call.

📌 **Interview term: \`StopIteration\`** — the exception that signals "no more items". The \`for\` statement, \`list()\`, \`sum()\`, unpacking and comprehensions catch it for you.

📌 **Interview term: \`for ... else\`** — the \`else\` block of a loop runs when the loop finished because the iterator was exhausted, and is skipped when the loop was left with \`break\`. Think "no break". More in [break, continue, pass and loop else](/interview-question/how-do-break-continue-pass-and-loop-else-work).

## 4. What CPython Compiles It To

\`dis\` shows the bytecode CPython 3.11 generates for a small summing function:

~~~python
def total(xs):
    s = 0
    for x in xs:
        s += x
    return s
~~~

~~~text
  4           6 LOAD_FAST                0 (xs)
              8 GET_ITER
        >>   10 FOR_ITER                 7 (to 26)
             12 STORE_FAST               2 (x)

  5          14 LOAD_FAST                1 (s)
             16 LOAD_FAST                2 (x)
             18 BINARY_OP               13 (+=)
             22 STORE_FAST               1 (s)
             24 JUMP_BACKWARD            8 (to 10)

  6     >>   26 LOAD_FAST                1 (s)
             28 RETURN_VALUE
~~~

- \`GET_ITER\` is the one call to \`iter(xs)\`; the iterator stays on the value stack for the whole loop.
- \`FOR_ITER\` calls \`next()\` on it. If a value comes back it is pushed, and \`STORE_FAST\` assigns it to \`x\`. If the iterator is exhausted, \`FOR_ITER\` jumps past the loop (to offset 26).
- \`JUMP_BACKWARD\` goes back to \`FOR_ITER\` for the next item.

On CPython 3.12 the same function compiles to the same shape, with one extra instruction, \`END_FOR\`, at the jump target where the exhausted loop lands. Both listings come from \`python3.11 -c\` and \`python3.12 -c\` runs of \`dis.dis(total)\`; Example 2 checks the opcode names programmatically. How bytecode is executed in general is the topic of [how CPython executes your code](/interview-question/how-does-cpython-execute-your-code).

📌 **Interview term: \`GET_ITER\` / \`FOR_ITER\`** — the two bytecode instructions behind every \`for\` loop: one call to \`iter()\` before the loop, one \`next()\` per pass, with a jump out when the iterator is exhausted.

## 5. The Loop Target Is Just an Assignment

\`for x in ...\` assigns to \`x\` exactly like \`x = value\` would. That explains three things Example 1 prints:

- After the loop, \`x\` still holds the **last value** (\`n after the loop: 2\`). If the loop ran zero times, the name is never assigned at all.
- Rebinding \`x\` inside the body (\`n = 100\`) changes nothing about the next pass; the next \`next()\` simply assigns the next value.
- The target can be any assignment target, including an unpacking pattern: \`for letter, number in pairs\`. See [iterable unpacking](/interview-question/how-does-iterable-unpacking-work).

## 6. Why Mutating While Looping Goes Wrong

A list iterator is not a snapshot. It is a reference to the list plus an index. Each \`next()\` returns \`lst[index]\` and adds one. So if you remove an item, everything after it shifts left by one, and the iterator steps over the item that slid into the current slot.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Before removal the iterator index points at slot 2 of 1 2 2 3 4; after removing a 2 the list is 1 2 3 4 and the same index now points at 3, so the second 2 is skipped">
  <text class="d-sub" x="40" y="58">before</text>
  <rect class="d-box" x="120" y="30" width="80" height="50" rx="6"/>
  <text class="d-text" x="160" y="61" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="30" width="80" height="50" rx="6"/>
  <text class="d-text" x="260" y="61" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="320" y="30" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="61" text-anchor="middle">2</text>
  <rect class="d-box" x="420" y="30" width="80" height="50" rx="6"/>
  <text class="d-text" x="460" y="61" text-anchor="middle">3</text>
  <rect class="d-box" x="520" y="30" width="80" height="50" rx="6"/>
  <text class="d-text" x="560" y="61" text-anchor="middle">4</text>
  <text class="d-sub" x="40" y="178">after</text>
  <rect class="d-box" x="120" y="150" width="80" height="50" rx="6"/>
  <text class="d-text" x="160" y="181" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="150" width="80" height="50" rx="6"/>
  <text class="d-text" x="260" y="181" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="320" y="150" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="181" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="150" width="80" height="50" rx="6"/>
  <text class="d-text" x="460" y="181" text-anchor="middle">4</text>
  <text class="d-sub" x="360" y="118" text-anchor="middle">index 2 in both rows</text>
  <path class="d-edge-dashed" d="M 360 84 L 360 100"/>
  <path class="d-edge-dashed" d="M 360 128 L 360 146"/>
</svg>

The highlighted slot is the iterator position, index 2, before and after \`remove(2)\`. Before the removal it was about to hand out the second \`2\`; afterwards the same index holds \`3\`, so that \`2\` is never seen. That is why Example 2 ends up with \`[1, 2, 3, 4]\` instead of \`[1, 3, 4]\`.

The fixes are to loop over a copy (\`for n in nums[:]\`) or, better, build a new list with a comprehension. The opposite case, **appending** while looping, keeps the loop going because the iterator checks the current length on every \`next()\`; Example 2 uses that deliberately as a simple work queue (and it is an infinite loop if the appends never stop).

Dicts and sets are stricter: their iterators remember the size at the start and raise \`RuntimeError: dictionary changed size during iteration\` if it changes. Loop over \`list(d)\` when you need to add or remove keys.

## 7. Two Lookup Details Interviewers Like

\`for\` looks up \`__iter__\` on the **type**, not on the instance, like every special method. Assigning \`obj.__iter__ = ...\` on an instance has no effect. And whatever \`__iter__\` returns must itself be an iterator. On a \`python3.11\` run:

~~~text
'A' object is not iterable
iter() returned non-iterator of type 'list'
'int' object is not iterable
~~~

The first line is a class whose **instance** was given an \`__iter__\` attribute; the second is a class whose \`__iter__\` returns a list instead of \`iter(list)\`; the third is \`for x in 5\`. See [dunder methods](/interview-question/what-are-dunder-magic-methods) for why special methods are looked up on the type.

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — every protocol call a for loop makes, and the while-loop it equals** prints:

~~~text
1. a for loop:
  __iter__ called once
  __next__ -> 'red'
  body got red
  __next__ -> 'green'
  body got green
  __next__ -> StopIteration
2. the hand-written equivalent:
  __iter__ called once
  __next__ -> 'red'
  body got red
  __next__ -> 'green'
  body got green
  __next__ -> StopIteration
3. for/else:
  found 8 at 1
  16 not found
4. n after the loop: 2
   values seen: [0, 1, 2]
   unpacked a 1
   unpacked b 2
5. StopIteration from the body:
   escaped the loop: not from the iterator
~~~

**Example 2 — the bytecode, mutating while looping, dicts, generators and range** prints:

~~~text
1. loop opcodes: ['GET_ITER', 'FOR_ITER', 'STORE_FAST'] ... JUMP_BACKWARD
2. after removing 2s in the loop: [1, 2, 3, 4]
   next() after the shift: 3
   loop over a copy: [1, 3, 4]
   comprehension: [1, 3, 4]
3. dictionary changed size during iteration
   over list(d): ['a', 'aa', 'b', 'bb']
4. a list used as a work queue: [1, 2, 3, 4]
5. first loop: [0, 1, 4, 9]
   second loop: []
6. broke out at 3 and len(range) is 1000000000
~~~

**What the output shows:** \`__iter__\` ran once per loop and \`__next__\` once per item plus a final \`StopIteration\`, and the hand-written \`while\` loop produced the same trace. \`else\` ran only when nothing was found, the loop variable kept its last value, and a \`StopIteration\` from the body escaped instead of ending the loop quietly. The compiled loop uses \`GET_ITER\` and \`FOR_ITER\`; removing during iteration skipped an element, appending extended the loop, a dict refused to change size, a generator was empty on the second loop, and breaking out of \`range(10**9)\` after four items never built a billion numbers.

## Common Pitfalls

- **Removing from the list you are looping over.** Items get skipped silently. Build a new list (\`[x for x in xs if keep(x)]\`) or loop over a copy.
- **Adding or deleting dict keys inside \`for k in d\`.** \`RuntimeError\`. Loop over \`list(d)\` or collect the changes and apply them afterwards. Changing the **values** of existing keys is fine.
- **Looping twice over a generator or \`map\`.** The second loop runs zero times without any error, because the iterator is exhausted.
- **Relying on the loop variable after a loop that might not run.** If the iterable was empty, the name was never assigned and you get \`NameError\` (or a stale value from earlier code).
- **Expecting \`for x in obj\` to use \`len()\` and indexes.** It uses only \`iter()\` and \`next()\`; an object with \`__len__\` and no iteration support is not loopable.
- **Using \`for i in range(len(xs))\` out of habit.** Loop over the items directly, and use \`enumerate\` when you need the index ([enumerate and zip](/interview-question/what-do-enumerate-and-zip-do)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One iter, many next:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code> on the object once, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> on that iterator before every pass, assigning each value to the loop target.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it stops:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;next&#95;&#95;</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code>, the loop catches it, runs the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else</code> block if there was no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, and continues after the loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The equivalent:</strong> <span style="color:#f0e2c8;">It is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while True:</code> loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x = next(it)</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/except StopIteration: break</code>. CPython compiles it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET&#95;ITER</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR&#95;ITER</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JUMP&#95;BACKWARD</code> loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. No indexes:</strong> <span style="color:#f0e2c8;">The loop never uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> or indexing, which is why it works on files, generators and infinite streams, and why a generator can be looped only once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">A list iterator is an index, so removing items while looping skips elements; a dict or set raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError</code> on a size change. Loop over a copy or build a new collection.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> returns a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: iter() returned non-iterator of type 'list'</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> must return an object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;next&#95;&#95;</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(self.items)</code> or write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> as a generator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I make a single object loopable by assigning <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.&#95;&#95;iter&#95;&#95;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Special methods are looked up on the type, so the loop ignores the instance attribute and reports that the object is not iterable. Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> on the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What value does the loop variable have after the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last value assigned, because it is an ordinary variable in the enclosing scope. If the loop body never ran, it was never assigned.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code> loop's <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">else</code> block run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the loop ends because the iterator is exhausted. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> skips it. An exception escaping the loop skips it too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does appending to a list inside its own loop not stop the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The list iterator compares its index with the current length on every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>, so items appended during the loop are reached as well. It works as a work queue but loops forever if you always append.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Iterator protocol** | \`__iter__\` gives an iterator, \`__next__\` gives the next item or raises \`StopIteration\` |
| **\`StopIteration\`** | the "no more items" signal the loop catches |
| **\`for ... else\`** | the block that runs when the loop was not left with \`break\` |
| **\`GET_ITER\` / \`FOR_ITER\`** | the bytecode for "call \`iter()\` once" and "call \`next()\` or jump out" |

---
**Conclusion:** A \`for\` loop is a small, fixed protocol: one \`iter()\` call, then \`next()\` until \`StopIteration\`, with each value assigned to the loop target exactly as an ordinary assignment would. CPython compiles it to \`GET_ITER\` and a \`FOR_ITER\` loop, and nothing in it uses lengths or indexes. That one picture explains why \`for\` works on anything iterable, why the loop variable survives the loop, why removing items during the loop skips some, why dicts refuse to change size mid-loop, and why the [generators](/interview-question/what-are-generators-and-why-use-them) you loop over are used up after one pass.
`,
    examples: [
      { label: `Every protocol call a for loop makes, and the while-loop it equals`, code: `# A container that reports every protocol call the for loop makes.
class Loud:
    def __init__(self, items):
        self.items = items
    def __iter__(self):
        print("  __iter__ called once")
        return LoudIterator(self.items)

class LoudIterator:
    def __init__(self, items):
        self.items, self.i = items, 0
    def __iter__(self):
        return self
    def __next__(self):
        if self.i == len(self.items):
            print("  __next__ -> StopIteration")
            raise StopIteration
        value = self.items[self.i]
        self.i += 1
        print(f"  __next__ -> {value!r}")
        return value

print("1. a for loop:")
for word in Loud(["red", "green"]):
    print("  body got", word)

# 2. The same loop written by hand.
print("2. the hand-written equivalent:")
_it = iter(Loud(["red", "green"]))
while True:
    try:
        word = next(_it)
    except StopIteration:
        break
    print("  body got", word)

# 3. for ... else: else runs only when the loop was not broken.
def find(items, target):
    for i, x in enumerate(items):
        if x == target:
            print(f"  found {target} at {i}")
            break
    else:
        print(f"  {target} not found")

print("3. for/else:")
find([4, 8, 15], 8)
find([4, 8, 15], 16)

# 4. The loop variable is an ordinary assignment.
for n in range(3):
    pass
print("4. n after the loop:", n)

# Rebinding it inside the body does not change the next value.
seen = []
for n in range(3):
    seen.append(n)
    n = 100
print("   values seen:", seen)

# The target can be any assignment target, even an unpacking pattern.
pairs = [("a", 1), ("b", 2)]
for letter, number in pairs:
    print("   unpacked", letter, number)

# 5. A StopIteration raised inside the body is not the loop ending.
print("5. StopIteration from the body:")
try:
    for x in [1, 2]:
        raise StopIteration("not from the iterator")
except StopIteration as e:
    print("   escaped the loop:", e)` },
      { label: `The bytecode, mutating while looping, dicts, generators and range`, code: `import dis

# 1. What the compiler emits for a for loop (CPython 3.11).
def total(xs):
    s = 0
    for x in xs:
        s += x
    return s

ops = [ins.opname for ins in dis.get_instructions(total)]
start = ops.index("GET_ITER")
print("1. loop opcodes:", ops[start:start + 3], "...", ops[ops.index("JUMP_BACKWARD")])

# 2. Removing items while looping over the same list skips elements.
nums = [1, 2, 2, 3, 4]
for n in nums:
    if n == 2:
        nums.remove(n)
print("2. after removing 2s in the loop:", nums)

# The list iterator only keeps an index, so it never sees the shift.
nums = [1, 2, 2, 3, 4]
it = iter(nums)
next(it); next(it)
nums.remove(2)
print("   next() after the shift:", next(it))

# Fixes: loop over a copy, or build a new list.
nums = [1, 2, 2, 3, 4]
for n in nums[:]:
    if n == 2:
        nums.remove(n)
print("   loop over a copy:", nums)
nums = [n for n in [1, 2, 2, 3, 4] if n != 2]
print("   comprehension:", nums)

# 3. Dicts and sets check their size on every step.
d = {"a": 1, "b": 2}
try:
    for k in d:
        d["c"] = 3
except RuntimeError as e:
    print("3.", e)
d = {"a": 1, "b": 2}
for k in list(d):
    d[k + k] = 0
print("   over list(d):", sorted(d))

# 4. Appending to a list you are looping over keeps the loop going.
queue = [1]
for job in queue:
    if job < 4:
        queue.append(job + 1)
print("4. a list used as a work queue:", queue)

# 5. A for loop over a generator consumes it; a second loop gets nothing.
squares = (n * n for n in range(4))
print("5. first loop:", [s for s in squares])
print("   second loop:", [s for s in squares])

# 6. range is iterable but lazy: no list of a billion numbers is made.
big = range(10**9)
for i in big:
    if i == 3:
        break
print("6. broke out at", i, "and len(range) is", len(big))` },
    ],
  },
  {
    title: `What are generators and why use them?`,
    difficulty: "medium",
    seoDescription: `Python generators explained: yield pauses a function, lazy evaluation, constant memory, infinite sequences, pipelines and single-pass trade-offs.`,
    description: `**Question presented to candidate:**
"What is a generator in Python, how is it different from a normal function that returns a list, and when would you actually choose one? Give me a case where it matters."

**What a strong answer should cover:**
- A function containing \`yield\` is a **generator function**: calling it runs none of the body and returns a generator object; each \`next()\` runs the body up to the next \`yield\`, hands out that value and **pauses** with all local state kept
- A generator is an iterator (it has \`__iter__\` returning itself and \`__next__\`), so \`for\`, \`list()\`, \`sum()\` and \`itertools\` accept it; it ends with \`StopIteration\` when the function returns
- **Lazy evaluation:** values are produced only when asked for, so memory stays constant regardless of input size, the first result arrives immediately, work stops when the consumer stops (\`any()\`, \`break\`, \`islice\`), and infinite sequences become possible
- Generators replace a hand-written iterator class (no \`__next__\`, no position bookkeeping) and compose into streaming pipelines (read, filter, transform) where each item flows through every stage before the next is read
- Trade-offs: single pass, no \`len()\` or indexing, errors surface when consumed, and for small data a list can be just as fast or faster
- Generator expressions \`(x for x in ...)\` are the one-line form; \`yield from\`, \`send()\` and coroutines build on the same machinery

**Code / implementation expected:** Yes — a small generator function, ideally an infinite one cut with \`itertools.islice\`, or a two-stage pipeline.`,
    answer: `**Target Audience:** Python developers who have seen \`yield\` and want to know what it really does and when it pays off
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two bakeries take an order for 10,000 cookies. The first bakes all 10,000, fills a warehouse with them, and only then opens the door. The customer waits hours, the bakery needs a warehouse, and if the customer only wanted to taste three, 9,997 cookies were baked for nothing.

The second bakery bakes **one cookie when you ask for one**. You ask, a cookie comes out warm; you ask again, another one. The baker remembers exactly where they were in the recipe between requests. There is no warehouse, the first cookie arrives immediately, and when you say "that is enough", nobody bakes another.

A function that builds and returns a list is the first bakery. A **generator** is the second. It is a function that can pause in the middle, hand you one value, and pick up exactly where it left off the next time you ask.

## 2. What a Generator Is

Any function whose body contains \`yield\` is a **generator function**. Calling it does **not** run the body. It returns a **generator object** straight away. Each time you call \`next()\` on that object, the body runs until it reaches a \`yield\`; the yielded value is handed back to you and the function **freezes**, keeping all its local variables and its place in the code. The next \`next()\` resumes right after that \`yield\`. When the function reaches its end (or a \`return\`), the generator raises \`StopIteration\`, and it is finished for good.

📌 **Interview term: Generator function** — a \`def\` whose body contains \`yield\`. Calling it returns a generator object instead of running the body. CPython marks such functions with the \`CO_GENERATOR\` code flag, and their bytecode starts with \`RETURN_GENERATOR\` (seen with \`dis\` on 3.11).

📌 **Interview term: Generator (generator object)** — the paused function itself: an iterator that runs the function body step by step, one \`yield\` per \`next()\`. Introduced by [PEP 255](https://peps.python.org/pep-0255/).

📌 **Interview term: \`yield\`** — "hand this value out and pause here". Unlike \`return\`, the function is not over; its frame (locals, current position) is kept alive inside the generator.

Example 1 makes the pausing visible:

~~~python
def countdown(n):
    print("  body starts")
    while n > 0:
        print(f"  about to yield {n}")
        yield n
        print(f"  resumed after {n}")
        n -= 1
    print("  body ends")

g = countdown(2)     # prints nothing at all
next(g)              # runs up to the first yield -> 2
next(g)              # resumes, loops, yields again -> 1
next(g)              # resumes, loop ends, body ends -> StopIteration
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Caller and generator take turns: the caller calls next, the generator runs to yield 2 and pauses, the caller resumes, calls next again, the generator resumes and yields 1">
  <defs>
    <marker id="gw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="140" y="34" text-anchor="middle">caller</text>
  <text class="d-text" x="560" y="34" text-anchor="middle">generator body</text>
  <rect class="d-box" x="40" y="60" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="91" text-anchor="middle">g = countdown(2)</text>
  <rect class="d-box-accent" x="40" y="150" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="181" text-anchor="middle">next(g)</text>
  <rect class="d-box" x="460" y="150" width="200" height="50" rx="8"/>
  <text class="d-text" x="560" y="181" text-anchor="middle">run to yield 2</text>
  <rect class="d-box-accent" x="40" y="270" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="301" text-anchor="middle">next(g)</text>
  <rect class="d-box" x="460" y="270" width="200" height="50" rx="8"/>
  <text class="d-text" x="560" y="301" text-anchor="middle">resume, yield 1</text>
  <path class="d-edge" d="M 140 110 L 140 144" marker-end="url(#gw1-arrow)"/>
  <path class="d-edge-accent" d="M 240 165 L 454 165" marker-end="url(#gw1-arrow)"/>
  <path class="d-edge-dashed" d="M 460 188 L 246 188" marker-end="url(#gw1-arrow)"/>
  <text class="d-sub" x="350" y="216" text-anchor="middle">value 2, then paused</text>
  <path class="d-edge" d="M 140 200 L 140 264" marker-end="url(#gw1-arrow)"/>
  <path class="d-edge-accent" d="M 240 285 L 454 285" marker-end="url(#gw1-arrow)"/>
  <path class="d-edge-dashed" d="M 460 308 L 246 308" marker-end="url(#gw1-arrow)"/>
  <text class="d-sub" x="350" y="342" text-anchor="middle">value 1, then paused</text>
</svg>

Only one side runs at a time. Creating the generator runs nothing; each \`next()\` hands control to the body until the next \`yield\`, and the value travels back to the caller. The exact interleaving of the prints is in the Verified section.

A generator is an **iterator**: \`iter(gen) is gen\`, and it has \`__next__\`. So everything that accepts an iterable accepts a generator: \`for\`, \`list()\`, \`sum()\`, \`sorted()\`, \`zip()\`, \`itertools\`. (See [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator) and [how a for loop works](/interview-question/how-does-a-for-loop-work-under-the-hood).) What happens in each phase, including \`send()\`, \`throw()\` and \`close()\`, is the topic of [a generator's lifecycle](/interview-question/what-is-a-generator-s-lifecycle).

## 3. Why Use Them

### 3.1 Less code than an iterator class

Example 2 writes the same "squares" iterator three ways. The class needs \`__init__\`, \`__iter__\`, \`__next__\`, a position counter and a manual \`raise StopIteration\`. The generator function is three lines, and the generator expression is one:

~~~python
def squares_gen(n):
    for i in range(n):
        yield i ** 2

squares_expr = lambda n: (i ** 2 for i in range(n))
~~~

All three give \`[0, 1, 4, 9, 16]\`. The generator keeps its position automatically, because its position *is* the paused line of code.

📌 **Interview term: Generator expression** — \`(expr for x in iterable if cond)\`: a generator written inline, the lazy sibling of a list comprehension. Its memory behaviour is compared in [list comprehension vs generator expression memory](/interview-question/what-is-the-memory-difference-between-a-list-comprehension-and-a-generator-expre).

### 3.2 Constant memory

Example 2 sums a million squares twice and measures peak memory with \`tracemalloc\`. Building the list first peaked at **about 40 MB** on our 64-bit CPython 3.11 run (40,448,208 bytes); streaming the same values from a generator peaked at **336 bytes**. The printed checks (\`list peak above 10 MB: True\`, \`generator peak below 10 KB: True\`) hold on any build, including this page.

The list version has to keep every value alive at once. The generator only ever holds the current value and its own paused frame, so its memory does not grow with the input.

📌 **Interview term: Lazy evaluation** — computing a value only at the moment it is requested, instead of computing everything up front (eager evaluation).

### 3.3 Early exit and infinite sequences

Because nothing is computed until asked for, a consumer that stops early saves all the remaining work. In Example 2, \`any(x > 2 for x in checked(range(1000)))\` produced only \`[0, 1, 2, 3]\` before \`any()\` had its answer; the other 996 items were never computed.

The same property makes **infinite** sequences safe. Example 1's \`fibonacci()\` is a \`while True\` loop; \`itertools.islice(fibonacci(), 10)\` takes ten items and stops, and \`next(f for f in fibonacci() if f > 1000)\` finds \`1597\`. A list version of "all Fibonacci numbers" cannot exist. See [the itertools module](/interview-question/what-is-the-itertools-module-used-for).

### 3.4 Pipelines

Generators chain: each stage takes an iterable and yields results. Example 1 reads a log, keeps the errors and extracts the message:

~~~python
for msg in messages(only_errors(read_lines(log))):
    print("  -> handled:", msg)
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="Pipeline of four boxes: read_lines feeds only_errors feeds messages feeds the for loop, one line at a time">
  <defs>
    <marker id="gw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="45" width="140" height="60" rx="8"/>
  <text class="d-text" x="90" y="81" text-anchor="middle">read_lines</text>
  <rect class="d-box" x="210" y="45" width="140" height="60" rx="8"/>
  <text class="d-text" x="280" y="81" text-anchor="middle">only_errors</text>
  <rect class="d-box" x="400" y="45" width="140" height="60" rx="8"/>
  <text class="d-text" x="470" y="81" text-anchor="middle">messages</text>
  <rect class="d-box-accent" x="590" y="45" width="110" height="60" rx="8"/>
  <text class="d-text" x="645" y="81" text-anchor="middle">for loop</text>
  <path class="d-edge-accent" d="M 160 75 L 204 75" marker-end="url(#gw2-arrow)"/>
  <path class="d-edge-accent" d="M 350 75 L 394 75" marker-end="url(#gw2-arrow)"/>
  <path class="d-edge-accent" d="M 540 75 L 584 75" marker-end="url(#gw2-arrow)"/>
</svg>

The loop at the end pulls; the pull travels backwards through each stage to \`read_lines\`, which reads exactly one line. The output proves it: \`read: ERROR disk full\` is immediately followed by \`-> handled: disk full\`, **before** the next line is read. Only one line is in flight at a time, whatever the size of the file. Building such pipelines is covered in depth in [generator pipelines](/interview-question/how-do-generator-pipelines-stream-data-lazily), and delegating to sub-generators in [yield from](/interview-question/how-does-yield-from-delegation-work).

## 4. The Trade-offs

| | Function returning a list | Generator |
| :--- | :--- | :--- |
| Work done when called | all of it | none |
| Memory | grows with the number of items | constant (one paused frame) |
| First result available | after the last is computed | immediately |
| Consumer stops early | all work already done | remaining work skipped |
| Infinite sequences | impossible | natural |
| Loop over it again | yes | no: single pass |
| \`len()\`, indexing, slicing | yes | no (\`TypeError\`) |
| When errors appear | during the call | while being consumed |

Example 2, part 4 shows the single-pass rule (\`second pass: []\`) and the \`TypeError\`s for \`len(g)\` and \`g[0]\`. When you need several passes over lazily produced data, wrap the generator in a class whose \`__iter__\` is a generator function (part 5): each \`for\` gets a fresh generator, and you can even add \`__len__\`.

Speed is not a reason on its own. On our CPython 3.11 run, \`sum()\` over a million squares was somewhat faster with the generator expression (about 37 ms vs 48 ms for the list version), but for 100 items the list comprehension was slightly faster (2.8 µs vs 3.0 µs). Resuming a generator has a small per-item cost; allocating a large list has a big one. Choose generators for memory, latency to first result and early exit, and measure if speed matters.

## 5. Where Generators Lead

The same pause-and-resume machinery powers more than iteration. \`yield\` can also *receive* a value (\`value = yield\`, via \`send()\`), which turned generators into the original coroutines, and \`async def\` coroutines are built on the same idea. See [generator vs coroutine](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine) and [async iterators](/interview-question/what-is-an-async-iterator-and-async-for). \`contextlib.contextmanager\` turns a one-\`yield\` generator into a [context manager](/interview-question/what-is-a-context-manager).

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — yield pausing a function, infinite sequences and a lazy pipeline** prints:

~~~text
1. calling countdown(2):
  got a generator and nothing ran yet
  body starts
  about to yield 2
  next -> 2
  resumed after 2
  about to yield 1
  next -> 1
  resumed after 1
  body ends
  StopIteration: the generator is finished
2. [0, 2, 4, 6, 8] 20
True
3. first ten: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
   first above 1000: 1597
4. pipeline:
  read: INFO start
  read: ERROR disk full
  -> handled: disk full
  read: INFO ok
  read: ERROR timeout
  -> handled: timeout
5. ['disk full', 'timeout']
~~~

**Example 2 — generator vs iterator class, memory measured, and the single-pass trade-off** prints:

~~~text
[0, 1, 4, 9, 16]
[0, 1, 4, 9, 16]
[0, 1, 4, 9, 16]
2. same total: True
   list peak above 10 MB: True
   generator peak below 10 KB: True
3. any() stops at the first hit: True
   items actually produced: [0, 1, 2, 3]
4. first pass: [0, 1, 4] second pass: []
   len(g) -> object of type 'generator' has no len()
   g[0] -> 'generator' object is not subscriptable
5. [0, 1, 4] [0, 1, 4] 3
~~~

**What the output shows:** calling \`countdown(2)\` printed nothing; each \`next()\` ran the body only up to the next \`yield\`, and the third raised \`StopIteration\`. The infinite Fibonacci generator was cut safely, and the pipeline handled each error line before reading the next. The class, the generator function and the generator expression produced the same values; the list version peaked above 10 MB while the generator stayed under 10 KB; \`any()\` stopped after four items; a second pass over a generator was empty; and a class with a generator \`__iter__\` could be looped twice.

## Common Pitfalls

- **Expecting the body to run when you call the function.** \`g = countdown(3)\` runs nothing, so a generator that validates its arguments raises the error only on the first \`next()\`. Validate in a normal wrapper function that then returns the generator.
- **Iterating a generator twice.** The second loop silently does nothing. Convert to a list once if you need several passes, or use an iterable class.
- **Calling \`len()\` on a generator or indexing it.** It has neither. \`sum(1 for _ in gen)\` counts but consumes it.
- **Expecting results to be cached.** A generator stores nothing it has produced: two generators over the same source do all the work twice. Keep a list if several consumers need the same results.
- **Using a generator when the caller needs the whole result anyway.** \`sorted(gen)\` and \`list(gen)\` build the full list regardless, so there is no memory win; just return a list.
- **Leaving resources open.** A generator paused inside \`with open(...)\` keeps the file open until it is finished, closed or garbage collected; see [a generator's lifecycle](/interview-question/what-is-a-generator-s-lifecycle).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A generator function is any function with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>. Calling it runs nothing and returns a generator object; each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> runs the body to the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>, hands out that value and pauses with its local state intact.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. It is an iterator:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter(g) is g</code>, it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;next&#95;&#95;</code>, and it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> when the function returns, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools</code> all work with it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why: memory:</strong> <span style="color:#f0e2c8;">Values are produced lazily, one at a time, so memory stays constant: on our run, summing a million squares peaked around 40 MB with a list and a few hundred bytes with a generator.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why: control flow:</strong> <span style="color:#f0e2c8;">The first result is available immediately, work stops when the consumer stops, infinite sequences are possible, and stages compose into streaming pipelines.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">Single pass, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> or indexing, errors appear only when consumed, and for small data a list is just as good. Use a list when you need to reuse or index the result.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> ends the function and discards its frame. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> hands out a value and pauses, keeping the frame so the function can resume. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return value</code> inside a generator ends it and puts the value on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration.value</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you take the first N items of an infinite generator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.islice(gen, n)</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> in a loop. Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(gen)</code>, which never finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a generator faster than a list comprehension?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not reliably. It avoids allocating a big list, which helps for large inputs, but each item costs a resume. For small inputs a list comprehension is often slightly faster. The reliable wins are memory and early exit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a lazily computed sequence that can be iterated more than once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a class whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> is a generator function. Each loop calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;iter&#95;&#95;</code> and gets a fresh generator over the same source.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any()</code> do with a generator expression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It pulls items only until one is truthy, then stops. The rest of the generator is never computed, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any(cond(x) for x in xs)</code> is better than building a list first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Generator function** | a \`def\` containing \`yield\`; calling it returns a generator |
| **Generator (object)** | a paused function that is also an iterator |
| **\`yield\`** | hand out a value and pause, keeping all local state |
| **Generator expression** | \`(expr for x in xs)\`, a one-line generator |
| **Lazy evaluation** | computing each value only when it is asked for |

---
**Conclusion:** A generator is a function that can pause. Calling it creates a paused generator object; each \`next()\` runs it to the next \`yield\` and freezes it again, and returning ends it with \`StopIteration\`. Because it is a ready-made iterator that produces values only on demand, it replaces hand-written iterator classes, keeps memory flat regardless of input size, delivers the first result at once, stops working the moment the consumer stops, and makes infinite sequences and streaming pipelines natural. The price is a single pass with no length or indexing, so return a list when the caller needs to keep the data, and a generator when it only needs to walk through it.
`,
    examples: [
      { label: `yield pausing a function, infinite sequences and a lazy pipeline`, code: `from itertools import islice
import io

# 1. Calling a generator function runs none of its body.
def countdown(n):
    print("  body starts")
    while n > 0:
        print(f"  about to yield {n}")
        yield n
        print(f"  resumed after {n}")
        n -= 1
    print("  body ends")

print("1. calling countdown(2):")
g = countdown(2)
print("  got a", type(g).__name__, "and nothing ran yet")
print("  next ->", next(g))
print("  next ->", next(g))
try:
    next(g)
except StopIteration:
    print("  StopIteration: the generator is finished")

# 2. A generator is an iterator, so for, list(), sum() all accept it.
def evens(limit):
    for n in range(0, limit, 2):
        yield n
print("2.", list(evens(10)), sum(evens(10)))
gen = evens(4)
print(iter(gen) is gen)  # True

# 3. Infinite sequences are fine: only the items you pull are computed.
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
print("3. first ten:", list(islice(fibonacci(), 10)))
print("   first above 1000:", next(f for f in fibonacci() if f > 1000))

# 4. A lazy pipeline over a "file": each line flows through every stage
#    before the next line is read.
log = io.StringIO("INFO start\\nERROR disk full\\nINFO ok\\nERROR timeout\\n")

def read_lines(f):
    for line in f:
        print("  read:", line.strip())
        yield line.strip()

def only_errors(lines):
    for line in lines:
        if line.startswith("ERROR"):
            yield line

def messages(lines):
    for line in lines:
        yield line.split(" ", 1)[1]

print("4. pipeline:")
for msg in messages(only_errors(read_lines(log))):
    print("  -> handled:", msg)

# 5. The same pipeline with generator expressions.
log.seek(0)
stripped = (line.strip() for line in log)
errors = (line for line in stripped if line.startswith("ERROR"))
print("5.", [line.split(" ", 1)[1] for line in errors])` },
      { label: `Generator vs iterator class, memory measured, and the single-pass trade-off`, code: `import tracemalloc

# 1. The same iterator three ways. The generator needs no class,
#    no __next__ and no StopIteration bookkeeping.
class SquaresIterator:
    def __init__(self, n):
        self.i, self.n = 0, n
    def __iter__(self):
        return self
    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        self.i += 1
        return (self.i - 1) ** 2

def squares_gen(n):
    for i in range(n):
        yield i ** 2

squares_expr = lambda n: (i ** 2 for i in range(n))

print(list(SquaresIterator(5)))  # [0, 1, 4, 9, 16]
print(list(squares_gen(5)))  # [0, 1, 4, 9, 16]
print(list(squares_expr(5)))  # [0, 1, 4, 9, 16]

# 2. Memory: build a list of a million squares, or stream them.
def squares_list(n):
    out = []
    for i in range(n):
        out.append(i ** 2)
    return out

def peak_bytes(fn):
    tracemalloc.start()
    fn()
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    return peak

N = 1_000_000
list_peak = peak_bytes(lambda: sum(squares_list(N)))
gen_peak = peak_bytes(lambda: sum(squares_gen(N)))
print("2. same total:", sum(squares_list(N)) == sum(squares_gen(N)))
print("   list peak above 10 MB:", list_peak > 10_000_000)
print("   generator peak below 10 KB:", gen_peak < 10_000)

# 3. Early exit: a generator does no work for items nobody asks for.
work = []
def checked(items):
    for x in items:
        work.append(x)
        yield x
print("3. any() stops at the first hit:", any(x > 2 for x in checked(range(1000))))
print("   items actually produced:", work)

# 4. The trade-off: single pass, no len(), no indexing.
g = squares_gen(3)
print("4. first pass:", list(g), "second pass:", list(g))
for attempt in ("len(g)", "g[0]"):
    try:
        eval(attempt)
    except TypeError as e:
        print("  ", attempt, "->", e)

# 5. Want several passes? Make an iterable whose __iter__ is a generator.
class Squares:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        for i in range(self.n):
            yield i ** 2
    def __len__(self):
        return self.n

s = Squares(3)
print("5.", list(s), list(s), len(s))` },
    ],
  },
  {
    title: `What is a generator's lifecycle?`,
    difficulty: "medium",
    seoDescription: `The four generator states in Python (created, running, suspended, closed), send, throw, close, GeneratorExit, finally and PEP 479.`,
    description: `**Question presented to candidate:**
"A generator object goes through several states between the moment you call the function and the moment it is gone. Walk me through them. What moves it from one state to the next, and what happens to code in a \`finally\` block if the consumer stops early?"

**What a strong answer should cover:**
- The four states reported by \`inspect.getgeneratorstate\`: \`GEN_CREATED\` (body not started), \`GEN_RUNNING\` (executing right now), \`GEN_SUSPENDED\` (paused at a \`yield\`), \`GEN_CLOSED\` (finished); a generator never comes back from closed
- What moves it: \`next()\` / \`send(value)\` resume it (and \`send\` must be \`None\` on a just-created generator); \`yield\` suspends it; \`return\` or an uncaught exception closes it, with the return value carried on \`StopIteration.value\`
- \`throw(exc)\` raises an exception at the paused \`yield\`; \`close()\` raises \`GeneratorExit\` there, so \`finally\` blocks and \`with\` exits run; a generator that yields again after \`GeneratorExit\` gets \`RuntimeError\`
- Dropping the last reference to a suspended generator closes it as well (in CPython this happens immediately through reference counting); \`break\` out of a \`for\` loop leaves it suspended, not closed
- PEP 479 (default since 3.7): a \`StopIteration\` escaping the body is turned into \`RuntimeError\`; version details such as the three-argument \`throw()\` being deprecated in 3.12, \`gi_suspended\` (3.11) and \`close()\` returning a value (3.13)
- Introspection: \`gi_frame\` (None once closed), \`gi_running\`, \`gi_frame.f_locals\`

**Code / implementation expected:** Optional — a generator with a \`try/finally\`, printing \`inspect.getgeneratorstate\` before, during and after, and calling \`close()\`.`,
    answer: `**Target Audience:** Python developers who use generators and want to know exactly what state one is in, and what happens to its clean-up code
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); the version-specific example on CPython 3.13, with 3.12 compared

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A video game has a save point. You buy the game: it is in the box, nothing has happened yet. You start playing: the game is running. You hit pause: everything freezes exactly where it is, every enemy and every item, and you can come back tomorrow and carry on. Eventually you either finish the game or quit; either way, that playthrough is over and cannot be resumed.

A generator lives through the same four moments: **created** (in the box), **running** (playing), **suspended** (paused), **closed** (over). The interesting questions are the ones about quitting: if you stop playing in the middle, does the game get a chance to save and tidy up? For generators the answer is yes, but only if you know which operations trigger it. That is where resource leaks and "my \`finally\` never printed" surprises come from.

## 2. The Four States

📌 **Interview term: Generator states** — \`inspect.getgeneratorstate(gen)\` returns one of four strings:

| State | Meaning | \`gi_frame\` |
| :--- | :--- | :--- |
| \`GEN_CREATED\` | the object exists, no line of the body has run | a frame, at the \`def\` line |
| \`GEN_RUNNING\` | the body is executing right now | a frame |
| \`GEN_SUSPENDED\` | paused at a \`yield\`, waiting to be resumed | a frame with the current locals |
| \`GEN_CLOSED\` | finished: returned, raised or closed | \`None\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 400" role="img" aria-label="State machine: created goes to running on next; running goes to suspended on yield; suspended goes back to running on next, send, throw or close; running goes to closed on return or an uncaught exception; created goes straight to closed on close">
  <defs>
    <marker id="gl1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="180" height="64" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">GEN_CREATED</text>
  <text class="d-sub" x="110" y="108" text-anchor="middle">body not started</text>
  <rect class="d-box-accent" x="270" y="60" width="180" height="64" rx="10"/>
  <text class="d-text" x="360" y="88" text-anchor="middle">GEN_RUNNING</text>
  <text class="d-sub" x="360" y="108" text-anchor="middle">executing</text>
  <rect class="d-box" x="520" y="60" width="180" height="64" rx="10"/>
  <text class="d-text" x="610" y="88" text-anchor="middle">GEN_SUSPENDED</text>
  <text class="d-sub" x="610" y="108" text-anchor="middle">paused at yield</text>
  <rect class="d-box-muted" x="270" y="310" width="180" height="64" rx="10"/>
  <text class="d-text" x="360" y="338" text-anchor="middle">GEN_CLOSED</text>
  <text class="d-sub" x="360" y="358" text-anchor="middle">frame released</text>
  <path class="d-edge-accent" d="M 200 80 L 264 80" marker-end="url(#gl1-arrow)"/>
  <text class="d-sub" x="235" y="40" text-anchor="middle">next()</text>
  <path class="d-edge-accent" d="M 450 80 L 514 80" marker-end="url(#gl1-arrow)"/>
  <text class="d-sub" x="485" y="40" text-anchor="middle">yield</text>
  <path class="d-edge" d="M 520 108 L 456 108" marker-end="url(#gl1-arrow)"/>
  <text class="d-sub" x="485" y="170" text-anchor="middle">next, send</text>
  <text class="d-sub" x="485" y="192" text-anchor="middle">throw, close</text>
  <path class="d-edge" d="M 360 124 L 360 304" marker-end="url(#gl1-arrow)"/>
  <text class="d-sub" x="372" y="250">return or exception</text>
  <path class="d-edge-dashed" d="M 110 124 L 110 342 L 264 342" marker-end="url(#gl1-arrow)"/>
  <text class="d-sub" x="122" y="250">close()</text>
</svg>

Every arrow back into \`GEN_RUNNING\` is something the caller does; the arrows out of it are what the body does. There is no arrow out of \`GEN_CLOSED\`: a finished generator cannot be restarted. Call the generator function again for a new one.

You can only observe \`GEN_RUNNING\` from **inside** the body, because while the generator runs, the caller is not running. Example 1 prints it from the body's first line.

## 3. Walking Through the Normal Life (Example 1)

~~~python
def worker():
    print("  [gen] started, state inside:", getgeneratorstate(g))
    received = yield "first"
    print("  [gen] got", repr(received))
    received = yield "second"
    print("  [gen] got", repr(received))
    return "done"
~~~

1. **\`g = worker()\`** — \`GEN_CREATED\`. The frame exists (it sits at the \`def\` line) but nothing ran. \`g.send("too early")\` is refused with \`TypeError: can't send non-None value to a just-started generator\`: there is no \`yield\` waiting to receive the value yet.
2. **\`next(g)\`** — the body runs, prints \`GEN_RUNNING\`, reaches \`yield "first"\`, hands out \`"first"\` and pauses. Now \`GEN_SUSPENDED\`, \`g.gi_suspended\` is \`True\` and \`g.gi_running\` is \`False\`. \`g.gi_frame.f_locals\` is \`{}\`: the assignment to \`received\` has not happened yet, because the \`yield\` expression has not produced its value.
3. **\`g.send("hello")\`** — resumes; the paused \`yield\` evaluates to \`"hello"\`, which is assigned to \`received\`. It runs to the next \`yield\` and hands out \`"second"\`. The locals now show \`{'received': 'hello'}\`.
4. **\`g.send("bye")\`** — resumes, prints, reaches \`return "done"\`. The generator is now \`GEN_CLOSED\`, \`gi_frame\` is \`None\`, and the caller receives \`StopIteration\` whose \`.value\` is \`'done'\`.
5. **After that**, \`next(g, "<exhausted>")\` returns the default, and \`close()\` on a closed generator does nothing.

📌 **Interview term: \`send(value)\`** — resume the generator and make the paused \`yield\` expression evaluate to \`value\`. \`next(g)\` is exactly \`g.send(None)\`. Defined, together with \`throw()\` and \`close()\`, by [PEP 342](https://peps.python.org/pep-0342/).

📌 **Interview term: \`StopIteration.value\`** — where a generator return value goes. A \`for\` loop discards it; \`yield from\` passes it back to the delegating generator (see [yield from delegation](/interview-question/how-does-yield-from-delegation-work)).

📌 **Interview term: \`gi_frame\`, \`gi_running\`, \`gi_suspended\`** — introspection attributes on the generator: the paused frame (or \`None\` once closed), whether it is executing right now, and whether it is paused at a \`yield\`. \`gi_suspended\` was added in Python 3.11, according to the [inspect module docs](https://docs.python.org/3/library/inspect.html).

One last rule in Example 1: a generator cannot resume itself. \`next(me)\` from inside \`me\` raises \`ValueError: generator already executing\`, because the generator is \`GEN_RUNNING\` and there is no paused \`yield\` to resume.

## 4. Ending Early: \`close()\`, \`throw()\` and Garbage Collection

This is the part that matters for real code: a generator holding a file, a lock or a database cursor needs its clean-up to run even when the consumer stops before the end.

📌 **Interview term: \`close()\`** — raises \`GeneratorExit\` inside the generator, at the paused \`yield\`. If the generator lets it propagate (or simply has a \`finally\`), it ends cleanly and \`close()\` returns. If it was never started, nothing runs at all.

📌 **Interview term: \`GeneratorExit\`** — the exception \`close()\` injects. It inherits from \`BaseException\`, not \`Exception\`, so a broad \`except Exception:\` inside the generator does not swallow it.

📌 **Interview term: \`throw(exc)\`** — raises \`exc\` inside the generator at the paused \`yield\`. If the generator handles it and yields again, \`throw()\` returns that value; if not, the exception comes back out of the \`throw()\` call and the generator is closed.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Caller calls close; GeneratorExit is raised at the paused yield; the finally block runs; the generator ends as closed">
  <defs>
    <marker id="gl2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">g.close()</text>
  <rect class="d-box" x="230" y="40" width="200" height="60" rx="8"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">GeneratorExit</text>
  <text class="d-sub" x="330" y="86" text-anchor="middle">raised at the yield</text>
  <rect class="d-box" x="490" y="40" width="190" height="60" rx="8"/>
  <text class="d-text" x="585" y="66" text-anchor="middle">finally runs</text>
  <text class="d-sub" x="585" y="86" text-anchor="middle">release the resource</text>
  <rect class="d-box-muted" x="490" y="170" width="190" height="60" rx="8"/>
  <text class="d-text" x="585" y="206" text-anchor="middle">GEN_CLOSED</text>
  <rect class="d-box-muted" x="230" y="170" width="200" height="60" rx="8"/>
  <text class="d-text" x="330" y="196" text-anchor="middle">yields again</text>
  <text class="d-sub" x="330" y="216" text-anchor="middle">RuntimeError</text>
  <path class="d-edge-accent" d="M 170 70 L 224 70" marker-end="url(#gl2-arrow)"/>
  <path class="d-edge-accent" d="M 430 70 L 484 70" marker-end="url(#gl2-arrow)"/>
  <path class="d-edge-accent" d="M 585 100 L 585 164" marker-end="url(#gl2-arrow)"/>
  <path class="d-edge-dashed" d="M 330 100 L 330 164" marker-end="url(#gl2-arrow)"/>
</svg>

The solid path is the normal one. The dashed path is a bug: a generator that catches \`GeneratorExit\` and yields another value makes \`close()\` raise \`RuntimeError: generator ignored GeneratorExit\` (Example 2, part 6).

Example 2 checks every way a generator can end early, using a generator wrapped in \`try/except GeneratorExit/finally\`:

| What the caller does | What happens inside | State afterwards |
| :--- | :--- | :--- |
| \`g.close()\` while suspended | \`GeneratorExit\` at the \`yield\`, \`finally\` runs | \`GEN_CLOSED\` |
| \`g.close()\` before the first \`next()\` | nothing: the body never started, \`finally\` does not run | \`GEN_CLOSED\` |
| \`del g\` (last reference) while suspended | CPython closes it at once: \`finally\` runs | gone |
| \`break\` out of \`for x in g\` | nothing yet | \`GEN_SUSPENDED\` (still holding its resources) |
| \`g.throw(ValueError(...))\`, handled | the \`except\` runs, the next \`yield\` value is returned | \`GEN_SUSPENDED\` |
| \`g.throw(KeyError(...))\`, not handled | the exception comes back out of \`throw()\` | \`GEN_CLOSED\` |

The \`break\` row surprises people. Leaving a loop does not close the generator; the \`for\` statement just stops calling \`next()\`. In Example 2 the \`finally\` only printed when the code called \`g.close()\` explicitly. In CPython, reference counting closes the generator as soon as its last reference disappears (the \`del\` row), but a generator kept in a variable, a list or a reference cycle stays suspended. When the clean-up must happen at a known point, call \`close()\` yourself or use \`contextlib.closing(gen)\`. See [del, __del__ and garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection) for how that finalisation works, and [context managers](/interview-question/what-is-a-context-manager).

## 5. Exceptions Inside the Body, and PEP 479

An uncaught exception raised in the body propagates out of the \`next()\`, \`send()\` or \`throw()\` call that resumed it, and the generator is closed (see [exception propagation](/interview-question/how-does-exception-propagation-work-up-the-call-stack)).

One exception is special: \`StopIteration\`. Before PEP 479, a stray \`next(it)\` inside a generator that hit the end of \`it\` would raise \`StopIteration\`, which looked exactly like the generator itself finishing, so bugs were silently swallowed. [PEP 479](https://peps.python.org/pep-0479/) changed this: a \`StopIteration\` that escapes a generator body is replaced by \`RuntimeError("generator raised StopIteration")\`, with the original as \`__cause__\`. It was opt-in through \`from __future__ import generator_stop\` first and became the default behaviour in Python 3.7 ([InfoWorld, What is new in Python 3.7](https://www.infoworld.com/article/2263095/whats-new-in-python-37.html)). Example 2, part 7 shows the \`RuntimeError\`. The fix is to \`return\` instead, or to use \`next(it, default)\` or \`for x in it\`.

📌 **Interview term: PEP 479** — "Change StopIteration handling inside generators": a \`StopIteration\` leaking out of a generator body becomes \`RuntimeError\`. End a generator with \`return\`, never with \`raise StopIteration\`.

## 6. Version Details (Example 3)

Two lifecycle details changed recently. Example 3 shows both; it is shown as code because it needs CPython 3.13, while this page runs 3.11.

- **Three-argument \`throw()\` is deprecated.** \`g.throw(ValueError, ValueError("x"), None)\` still works but emits a \`DeprecationWarning\` on 3.12 and later; the single-argument form \`g.throw(ValueError("x"))\` is the one to use. Example 3 captures the warning on 3.13; on our 3.11 run the same call printed no warning.
- **\`close()\` can return a value.** On 3.13, if the generator catches \`GeneratorExit\` and \`return\`s a value, \`close()\` returns it: Example 3 sums \`5 + 10 + 20\` and \`close()\` returns \`35\`. The same program on our 3.12 run printed \`close() returned: None\`. The change is [gh-104770](https://discuss.python.org/t/let-generator-close-return-stopiteration-value/24786), discussed on the Python forum.

## 7. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output. Example 3 was run with \`python3.13 main.py\`.

**Example 1 — the four states, send(), return values and gi_frame** prints:

~~~text
1. GEN_CREATED | frame line: True
   send() before starting: can't send non-None value to a just-started generator
  [gen] started, state inside: GEN_RUNNING
2. next -> first
   GEN_SUSPENDED | gi_suspended: True | gi_running: False
   locals while paused: {}
  [gen] got 'hello'
3. send -> second
   locals while paused: {'received': 'hello'}
  [gen] got 'bye'
4. StopIteration.value = 'done'
   GEN_CLOSED | frame: None
5. next on a closed generator: <exhausted>
   close() again is harmless: GEN_CLOSED
6. generator already executing
   echo got None
   echo got 42
7. still GEN_SUSPENDED
~~~

**Example 2 — close(), del, throw(), GeneratorExit and PEP 479** prints:

~~~text
1. close() on a paused generator:
  [gen] open
   next -> 0
  [gen] GeneratorExit received
  [gen] finally: release
   GEN_CLOSED
2. close() before the first next():
   GEN_CLOSED - no open, no finally
3. del on a paused generator:
  [gen] open
  [gen] GeneratorExit received
  [gen] finally: release
   after del
4. break out of a loop:
  [gen] open
   GEN_SUSPENDED
  [gen] GeneratorExit received
  [gen] finally: release
   [gen] handled ValueError('bad item')
5. throw -> recovered
   KeyError came back out: 'unhandled' | state: GEN_CLOSED
6. generator ignored GeneratorExit
7. generator raised StopIteration | cause: StopIteration
~~~

**Example 3 — deprecated three-argument throw() and close() returning a value (CPython 3.13)** prints:

~~~text
Python (3, 13)
one-arg throw -> caught boom
three-arg throw -> caught old style
DeprecationWarning: the (type, exc, tb) signature of throw() is deprecated, use the single-arg signature instead.
close() returned: 35
~~~

**What the output shows:** the generator was \`GEN_CREATED\` with nothing printed, reported \`GEN_RUNNING\` from inside, was \`GEN_SUSPENDED\` with growing locals between \`send()\` calls, and ended \`GEN_CLOSED\` with its return value on \`StopIteration.value\` and its frame released. \`close()\` and \`del\` both delivered \`GeneratorExit\` and ran \`finally\`; closing a never-started generator ran nothing; a \`break\` left it suspended. A handled \`throw()\` returned the next value and an unhandled one came back out and closed it. Yielding after \`GeneratorExit\` and leaking \`StopIteration\` both became \`RuntimeError\`. On 3.13 the three-argument \`throw()\` warned and \`close()\` returned \`35\`.

## Common Pitfalls

- **Assuming \`break\` cleans up.** It leaves the generator suspended with its file or lock still held until it is garbage collected. Close it, or wrap it in \`contextlib.closing\`.
- **Catching \`GeneratorExit\` and yielding.** \`close()\` then raises \`RuntimeError: generator ignored GeneratorExit\`. Catch it only to clean up, then re-raise or return.
- **Sending a value into a fresh generator.** \`send(x)\` with \`x\` not \`None\` on a \`GEN_CREATED\` generator is a \`TypeError\`. Prime it with \`next(g)\` (or \`send(None)\`) first.
- **Ending a generator with \`raise StopIteration\`.** Since PEP 479 that is a \`RuntimeError\`. Use \`return\`.
- **Relying on garbage collection for clean-up.** Immediate closing on \`del\` is a CPython reference-counting detail, not a language guarantee. A suspended generator caught in a reference cycle is only closed when the cycle collector runs: on our 3.11 run its \`finally\` printed during \`gc.collect()\`, not at \`del\`.
- **Using the three-argument \`throw(type, value, tb)\`.** Deprecated since 3.12; pass a single exception instance.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Four states:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.getgeneratorstate</code> reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEN&#95;CREATED</code> (nothing ran), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEN&#95;RUNNING</code> (executing, visible only from inside), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEN&#95;SUSPENDED</code> (paused at a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEN&#95;CLOSED</code> (finished, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gi&#95;frame</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Moving between them:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send()</code> resume it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> suspends it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> or an uncaught exception closes it. The return value rides on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration.value</code>. A closed generator never restarts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Ending early:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GeneratorExit</code> at the paused <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> exits run; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw(exc)</code> raises any exception there. Yielding after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GeneratorExit</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> out of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop does not close the generator; it stays suspended until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> or garbage collection (immediate on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del</code> in CPython thanks to reference counting).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versions:</strong> <span style="color:#f0e2c8;">PEP 479 (default since 3.7) turns a leaked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError</code>; 3.11 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gi&#95;suspended</code>; 3.12 deprecated the three-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw()</code>; 3.13 lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> return the generator return value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">send()</code> a value into a brand-new generator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> is waiting to receive it: the body has not started. Prime it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(g)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">g.send(None)</code>, which runs it to the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code> block in a generator always run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs when the generator finishes, raises, is closed or is garbage collected while suspended. It does not run if the generator was never started, and it is delayed if the suspended generator stays referenced somewhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">GeneratorExit</code> and why does it inherit from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BaseException</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> raises inside the generator. Inheriting from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseException</code> keeps ordinary <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except Exception:</code> handlers from swallowing it and accidentally keeping the generator alive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does PEP 479 change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> escaping the generator body is converted to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError</code>, so a bug such as an unguarded <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> on an empty iterator no longer silently ends the generator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can a consumer find out a generator return value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> and read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, or let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> return it to a delegating generator. On 3.13, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code> also returns it if the generator returns after catching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GeneratorExit</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Generator states** | \`GEN_CREATED\`, \`GEN_RUNNING\`, \`GEN_SUSPENDED\`, \`GEN_CLOSED\` |
| **\`send(value)\`** | resume and make the paused \`yield\` evaluate to \`value\` |
| **\`StopIteration.value\`** | where the generator return value travels |
| **\`gi_frame\` / \`gi_running\` / \`gi_suspended\`** | introspection: the paused frame, running now, paused now |
| **\`close()\`** | raise \`GeneratorExit\` inside so clean-up runs, then finish |
| **\`GeneratorExit\`** | the \`BaseException\` subclass \`close()\` injects |
| **\`throw(exc)\`** | raise an exception inside at the paused \`yield\` |
| **PEP 479** | a leaked \`StopIteration\` becomes \`RuntimeError\` |

---
**Conclusion:** A generator is created paused before its first line, runs only while someone calls \`next()\`, \`send()\` or \`throw()\`, pauses at each \`yield\` with its locals kept in \`gi_frame\`, and closes for good when it returns, raises or is closed. The early-exit paths are what matter in production: \`close()\` and garbage collection deliver \`GeneratorExit\` so \`finally\` blocks run, a \`break\` does not, and a generator must never yield after \`GeneratorExit\` or let \`StopIteration\` escape (PEP 479). Know the four states, the three methods that drive them and the \`break\` trap, and you can reason about any generator, including the coroutines in [generator vs coroutine](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine).
`,
    examples: [
      { label: `The four states, send(), return values and gi_frame`, code: `from inspect import getgeneratorstate

def worker():
    print("  [gen] started, state inside:", getgeneratorstate(g))
    received = yield "first"
    print("  [gen] got", repr(received))
    received = yield "second"
    print("  [gen] got", repr(received))
    return "done"

# 1. Created: the object exists, its frame exists, no line has run.
g = worker()
print("1.", getgeneratorstate(g), "| frame line:", g.gi_frame.f_lineno == worker.__code__.co_firstlineno)
try:
    g.send("too early")
except TypeError as e:
    print("   send() before starting:", e)

# 2. Running, then suspended at the first yield.
print("2. next ->", next(g))
print("  ", getgeneratorstate(g), "| gi_suspended:", g.gi_suspended, "| gi_running:", g.gi_running)
print("   locals while paused:", g.gi_frame.f_locals)

# 3. send() resumes and becomes the value of the yield expression.
print("3. send ->", g.send("hello"))
print("   locals while paused:", g.gi_frame.f_locals)

# 4. Returning ends it: the value rides on StopIteration.value.
try:
    g.send("bye")
except StopIteration as stop:
    print("4. StopIteration.value =", repr(stop.value))
print("  ", getgeneratorstate(g), "| frame:", g.gi_frame)

# 5. A closed generator stays closed.
print("5. next on a closed generator:", next(g, "<exhausted>"))
g.close()
print("   close() again is harmless:", getgeneratorstate(g))

# 6. A generator cannot resume itself while it is running.
def selfish():
    yield next(me)
me = selfish()
try:
    next(me)
except ValueError as e:
    print("6.", e)

# 7. next(g) is the same as g.send(None).
def echo():
    while True:
        value = yield
        print("   echo got", repr(value))
e = echo()
next(e)
e.send(None)
e.send(42)
print("7. still", getgeneratorstate(e))` },
      { label: `close(), del, throw(), GeneratorExit and PEP 479`, code: `from inspect import getgeneratorstate

def resource():
    print("  [gen] open")
    try:
        for i in range(10):
            yield i
    except GeneratorExit:
        print("  [gen] GeneratorExit received")
        raise
    finally:
        print("  [gen] finally: release")

# 1. close() raises GeneratorExit at the paused yield; finally runs.
print("1. close() on a paused generator:")
g = resource()
print("   next ->", next(g))
g.close()
print("  ", getgeneratorstate(g))

# 2. close() on a generator that never started runs nothing at all.
print("2. close() before the first next():")
g = resource()
g.close()
print("  ", getgeneratorstate(g), "- no open, no finally")

# 3. Dropping the last reference closes it too (CPython refcounting).
print("3. del on a paused generator:")
g = resource()
next(g)
del g
print("   after del")

# 4. Breaking out of a for loop leaves the generator paused, not closed.
print("4. break out of a loop:")
g = resource()
for x in g:
    if x == 1:
        break
print("  ", getgeneratorstate(g))
g.close()

# 5. throw() raises inside the generator at the paused yield.
def tolerant():
    while True:
        try:
            yield "working"
        except ValueError as e:
            print("   [gen] handled", repr(e))
            yield "recovered"

t = tolerant()
next(t)
print("5. throw ->", t.throw(ValueError("bad item")))
try:
    t.throw(KeyError("unhandled"))
except KeyError as e:
    print("   KeyError came back out:", e, "| state:", getgeneratorstate(t))

# 6. A generator must not yield after GeneratorExit.
def stubborn():
    try:
        yield 1
    except GeneratorExit:
        yield 2

s = stubborn()
next(s)
try:
    s.close()
except RuntimeError as e:
    print("6.", e)

# 7. PEP 479: a StopIteration leaking out of the body becomes RuntimeError.
def leaky(it):
    while True:
        yield next(it)

try:
    print(list(leaky(iter([1, 2]))))
except RuntimeError as e:
    print("7.", e, "| cause:", type(e.__cause__).__name__)` },
      { label: `Deprecated three-argument throw() and close() returning a value (Python 3.13)`, runnable: false, python: "3.13", code: `import sys
import warnings

print("Python", sys.version_info[:2])

def gen():
    try:
        yield 1
    except ValueError as e:
        yield f"caught {e}"

# The one-argument form: pass an exception instance.
g = gen()
next(g)
print("one-arg throw ->", g.throw(ValueError("boom")))

# The old three-argument form still works but warns on 3.12+.
g = gen()
next(g)
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    result = g.throw(ValueError, ValueError("old style"), None)
print("three-arg throw ->", result)
for w in caught:
    print(w.category.__name__ + ":", w.message)

# Since 3.13, close() returns the value a generator returns
# after catching GeneratorExit (on 3.12 and earlier it returns None).
def summer():
    total = 0
    try:
        while True:
            total += yield
    except GeneratorExit:
        return total

s = summer()
next(s)
for n in (5, 10, 20):
    s.send(n)
print("close() returned:", s.close())` },
    ],
  },
  {
    title: `What is the memory difference between a list comprehension and a generator expression?`,
    difficulty: "medium",
    seoDescription: `List comprehension vs generator expression memory in Python: getsizeof, tracemalloc peaks, when the saving vanishes, and eager vs lazy behaviour.`,
    description: `**Question presented to candidate:**
"\`[x * x for x in range(n)]\` and \`(x * x for x in range(n))\` differ by one pair of brackets. What is the actual memory difference between them, how would you measure it, and are there cases where the generator expression saves nothing?"

**What a strong answer should cover:**
- A list comprehension runs to completion immediately and stores every result: a pointer array of about 8 bytes per item on 64-bit CPython (plus over-allocation) **and** every element object it points to; memory is O(n)
- A generator expression creates a small generator object (about 200 bytes on 64-bit CPython 3.11) holding a paused frame and the source iterator; items are produced one at a time and memory is O(1) in n
- Measurement: \`sys.getsizeof\` is shallow (counts the list pointer array, not the ints), so use \`tracemalloc\` peak memory, or add up element sizes, to see the real cost
- The saving disappears when the consumer materialises anyway: \`sorted()\`, \`list()\`, and \`str.join()\` (which builds a sequence internally) peak the same either way; it only pays off with streaming consumers like \`sum\`, \`any\`, \`max\`, \`for\`
- Behavioural differences that come with it: the generator is lazy (only the first iterable is evaluated at creation), single-pass, has no \`len()\` or indexing, and raises errors at consumption time; speed is roughly similar and depends on size
- CPython detail: both get their own code object on 3.11; PEP 709 inlined list, dict and set comprehensions in 3.12, but generator expressions still create a generator

**Code / implementation expected:** Optional — measuring both with \`sys.getsizeof\` and \`tracemalloc\`, and noting why \`getsizeof\` alone under-reports.`,
    answer: `**Target Audience:** Python developers who know both syntaxes and want to be able to quantify and explain the difference
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); bytecode compared with CPython 3.12. Byte counts are from 64-bit CPython; Pyodide is a 32-bit build, so the examples print comparisons, not raw numbers

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You need to know the total weight of a million parcels. One way: have all million delivered to your office, stack them up, then weigh them one by one. You need a warehouse. Another way: have them arrive on a conveyor belt, weigh each one as it passes, add it to a running total, and let it go. You need a table and a scale.

Both give the same total. The difference is that the first approach keeps **everything** around at once, and the second keeps **one** item around at a time. \`sum([x * x for x in range(n)])\` is the warehouse; \`sum(x * x for x in range(n))\` is the conveyor belt. The brackets look like a style choice, but on our run the warehouse version peaked at about 40 MB and the conveyor belt at under 500 bytes.

## 2. What Each One Builds

**A list comprehension** \`[expr for x in it]\` runs the whole loop right now and returns a \`list\` holding every result. The list itself is a header plus an array of pointers, one per item. Each pointer leads to a separate object (here, an \`int\`) that also lives in memory.

**A generator expression** \`(expr for x in it)\` runs nothing yet. It returns a **generator object**: a small, fixed-size object holding a paused frame, which in turn holds a reference to the source iterator and the current loop variable. Each time the consumer asks, it computes one value and hands it over. Once the consumer is done with that value, it can be freed.

📌 **Interview term: List comprehension** — \`[expr for x in it if cond]\`: builds and returns a complete list immediately (eager). Covered in [comprehensions](/interview-question/what-are-list-dict-set-comprehensions).

📌 **Interview term: Generator expression** — \`(expr for x in it if cond)\`: returns a generator that computes the items one at a time on demand (lazy). It is the inline form of a [generator](/interview-question/what-are-generators-and-why-use-them).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="A list object with header and a pointer array, each pointer leading to its own int object">
  <defs>
    <marker id="mc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="90" width="150" height="70" rx="8"/>
  <text class="d-text" x="95" y="120" text-anchor="middle">list header</text>
  <text class="d-sub" x="95" y="142" text-anchor="middle">56 bytes</text>
  <rect class="d-box" x="230" y="40" width="160" height="170" rx="8"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">pointer array</text>
  <text class="d-sub" x="310" y="104" text-anchor="middle">8 bytes per slot</text>
  <text class="d-sub" x="310" y="128" text-anchor="middle">plus spare slots</text>
  <rect class="d-box-muted" x="470" y="30" width="200" height="50" rx="8"/>
  <text class="d-text" x="570" y="61" text-anchor="middle">int 0</text>
  <rect class="d-box-muted" x="470" y="105" width="200" height="50" rx="8"/>
  <text class="d-text" x="570" y="136" text-anchor="middle">int 1</text>
  <rect class="d-box-muted" x="470" y="180" width="200" height="50" rx="8"/>
  <text class="d-text" x="570" y="211" text-anchor="middle">int 4 and so on</text>
  <path class="d-edge" d="M 170 125 L 224 125" marker-end="url(#mc1-arrow)"/>
  <path class="d-edge" d="M 390 70 L 464 55" marker-end="url(#mc1-arrow)"/>
  <path class="d-edge" d="M 390 125 L 464 130" marker-end="url(#mc1-arrow)"/>
  <path class="d-edge" d="M 390 180 L 464 205" marker-end="url(#mc1-arrow)"/>
</svg>

Everything in this picture grows with n: one pointer slot and one element object per item. \`sys.getsizeof(list)\` only counts the left two boxes.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="A generator object pointing to its paused frame, which points to the range iterator and holds the current x">
  <defs>
    <marker id="mc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="50" width="180" height="70" rx="8"/>
  <text class="d-text" x="110" y="80" text-anchor="middle">generator</text>
  <text class="d-sub" x="110" y="102" text-anchor="middle">about 200 bytes</text>
  <rect class="d-box" x="260" y="50" width="180" height="70" rx="8"/>
  <text class="d-text" x="350" y="80" text-anchor="middle">paused frame</text>
  <text class="d-sub" x="350" y="102" text-anchor="middle">current x only</text>
  <rect class="d-box-muted" x="500" y="50" width="180" height="70" rx="8"/>
  <text class="d-text" x="590" y="80" text-anchor="middle">range iterator</text>
  <text class="d-sub" x="590" y="102" text-anchor="middle">a counter</text>
  <path class="d-edge" d="M 200 85 L 254 85" marker-end="url(#mc2-arrow)"/>
  <path class="d-edge" d="M 440 85 L 494 85" marker-end="url(#mc2-arrow)"/>
</svg>

Nothing in this picture depends on n. Whether the range has ten items or a billion, the generator holds the same three small objects.

## 3. Measuring It, Part 1: \`sys.getsizeof\`

On our 64-bit CPython 3.11 run:

| n | \`getsizeof\` of the list comprehension | \`getsizeof\` of the generator expression |
| :--- | ---: | ---: |
| 10 | 184 bytes | 200 bytes |
| 1,000 | 8,856 bytes | 200 bytes |
| 1,000,000 | 8,448,728 bytes | 200 bytes |

(On CPython 3.12 the generator was 192 bytes; the list sizes were identical.) For tiny inputs the list is actually smaller. For a million items the list's own allocation is 8.4 MB: 56 bytes of header plus 8 bytes for each of 1,056,084 pointer slots. That is more than a million because a list built by appending over-allocates spare slots as it grows; \`list(range(10**6))\`, whose size is known in advance, is exactly 8,000,056 bytes. Why lists over-allocate is covered in [how a Python list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).

📌 **Interview term: \`sys.getsizeof\`** — the size in bytes of **one object's own allocation**. It is shallow: for a container it does not include the objects the container refers to.

The shallow part matters. Example 1 builds a list of 1,000 ints that are not cached small integers: \`getsizeof\` says 8,856 bytes, but adding each element's own 28 bytes gives 36,856 bytes on our run, more than four times as much. The real cost of a list comprehension is the pointer array **plus** every element it keeps alive.

📌 **Interview term: Shallow vs deep size** — shallow size is what \`getsizeof\` reports for the object itself; deep size also counts everything reachable from it. Python has no built-in deep-size function.

## 4. Measuring It, Part 2: \`tracemalloc\` Peak

The honest measurement is the **peak** memory allocated while the work runs, which \`tracemalloc\` tracks for every Python allocation.

~~~python
def peak(fn):
    tracemalloc.start()
    fn()
    p = tracemalloc.get_traced_memory()[1]   # (current, peak)
    tracemalloc.stop()
    return p

peak(lambda: sum([x * x for x in range(N)]))   # list comprehension
peak(lambda: sum(x * x for x in range(N)))     # generator expression
~~~

For N = 1,000,000 on our 64-bit CPython 3.11 run: **40,448,360 bytes** for the list comprehension (the 8.4 MB pointer array plus a million int objects of about 32 bytes each, counting allocator overhead) versus **472 bytes** for the generator expression. Example 1 prints the comparisons (\`over 10 MB: True\`, \`under 10 KB: True\`), which also hold on the 32-bit build this page runs.

📌 **Interview term: \`tracemalloc\`** — the standard-library module that traces memory blocks allocated by Python; \`get_traced_memory()\` returns the current and peak traced size in bytes.

📌 **Interview term: Peak memory** — the highest amount of memory in use at any one moment during a computation. It is what decides whether a job fits in RAM.

## 5. When the Saving Disappears

A generator expression only saves memory when the **consumer** streams. If the consumer needs every item at once, it builds the list itself:

| Consumer | Streams? | Memory with a generator expression |
| :--- | :--- | :--- |
| \`sum\`, \`min\`, \`max\`, \`any\`, \`all\` | yes | constant |
| \`for\` loop, writing to a file | yes | constant |
| \`sorted(genexpr)\`, \`list(genexpr)\` | no: needs all items | same as the list |
| \`",".join(genexpr)\` | no: CPython collects the items into a sequence first | same as the list |
| \`set(genexpr)\`, \`dict(...)\` | builds the result anyway | the result, but no intermediate list |

Example 1 measures two of these: \`",".join(...)\` over 100,000 strings peaked within 1% either way (6,778,756 vs 6,778,972 bytes on our run), and \`sorted()\` of a million-item generator expression still peaked above 10 MB. So \`"".join([...])\` with brackets is fine, and in CPython it is not worse.

## 6. The Behaviour That Comes With the Memory

Laziness changes more than memory. Example 2 shows each point:

- **When work happens.** The list comprehension printed \`computing 0\`, \`computing 1\` while it was being built; the generator expression printed nothing until \`list(gen)\` consumed it.
- **What is bound when.** Only the **first** \`for\` clause's iterable is evaluated when the generator expression is created; every other name (conditions, later clauses) is looked up while it runs. In Example 2, rebinding \`items\` afterwards had no effect (the generator still walked \`[1, 2, 3]\`), but changing \`limit\` did (all three passed \`x <= 3\`). This is the same late lookup described in [the late-binding closure pitfall](/interview-question/what-is-the-late-binding-closure-pitfall-in-loops).
- **When errors appear.** \`[int(s) for s in data]\` raised at once; the generator version yielded \`1\` successfully and raised only when the bad item was reached.
- **Reuse.** The list could be summed and then \`max\`ed; the generator's second consumer got nothing (\`default="empty"\`).
- **Scope.** Neither leaks its loop variable: \`x\` was still \`"outer"\` afterwards.
- **Syntax.** A generator expression that is the only argument needs no extra parentheses: \`sum(n for n in range(5))\`. With a second argument it must be parenthesised: \`sorted((n % 3 for n in range(5)), reverse=True)\`.

**Speed** is close and depends on size. On our CPython 3.11 run, \`sum()\` over a million squares took about 37 ms with the generator expression and 48 ms with the list comprehension (the list version pays for allocating and freeing a million-slot list), while for 100 items the list comprehension was slightly faster, 2.8 µs vs 3.0 µs (resuming a generator for each item has a small fixed cost). Do not pick either for speed without measuring.

## 7. What CPython Compiles Them To

On CPython 3.11, both forms compile to a separate hidden function: the disassembly shows a \`<code object <listcomp>>\` for the list comprehension, made with \`MAKE_FUNCTION\` and called immediately, and a \`<code object <genexpr>>\` for the generator expression, whose body starts with \`RETURN_GENERATOR\`. The list version's inner loop uses \`LIST_APPEND\` to add each value to the list being built.

On CPython 3.12, [PEP 709](https://peps.python.org/pep-0709/) **inlined** list, dict and set comprehensions into the surrounding function: the 3.12 disassembly has no \`<listcomp>\` code object, just \`BUILD_LIST\`, \`FOR_ITER\` and \`LIST_APPEND\` in place. Generator expressions are not inlined; on 3.12 they still compile to a \`<code object <genexpr>>\` with \`RETURN_GENERATOR\`, because a generator needs its own frame to pause. The PEP reports up to 2x faster comprehensions in a micro-benchmark; it does not change how much memory the resulting list uses. (Both disassemblies are from our \`python3.11\` and \`python3.12\` runs.) For bytecode in general, see [how CPython executes your code](/interview-question/how-does-cpython-execute-your-code).

📌 **Interview term: PEP 709 (comprehension inlining)** — since Python 3.12, list, dict and set comprehensions run inline in the enclosing function instead of in a hidden nested function; the loop variable is still isolated. Generator expressions are unchanged.

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — getsizeof, deep size and tracemalloc peaks** prints:

~~~text
1. generator size is the same for every n: True
   list of 1,000,000 is over 500x the list of 1,000: True
   list of 1,000,000 is over 10,000x the generator: True
2. deep size is more than 3x the shallow size: True
3. list comprehension peak over 10 MB: True
   generator expression peak under 10 KB: True
4. str.join peaks within 1% either way: True
   sorted(genexpr) still peaks over 10 MB: True
285 285
~~~

**Example 2 — eager vs lazy: evaluation time, binding, errors and reuse** prints:

~~~text
1. list comprehension:
    computing 0
    computing 1
   built: [0, 10]
   generator expression:
   created, nothing computed yet
    computing 0
    computing 1
   consumed: [0, 10]
2. bound to the old list, but sees the new limit: [1, 2, 3]
3. list comprehension raised immediately: invalid literal for int() with base 10: 'x'
   generator created fine; first item: 1
   failed later, while consuming: invalid literal for int() with base 10: 'x'
4. list twice: 14 9
   generator twice: 14 empty
outer
6. 10 [2, 1, 1, 0, 0]
7. 4 [1, 4] generator
~~~

**What the output shows:** the generator object had the same size for every n while the list grew in proportion; the deep size of a list of ints was several times its \`getsizeof\`; summing a million squares peaked above 10 MB through a list and under 10 KB through a generator; \`str.join\` and \`sorted\` peaked the same either way. The second program shows the list computing at once and the generator on demand, early binding of only the first iterable, deferred errors, a one-shot generator against a reusable list, no leaked loop variable, and the parenthesis rule.

## Common Pitfalls

- **Trusting \`sys.getsizeof\` for a list.** It leaves out the elements; a list of a million distinct ints costs several times what it reports. Use \`tracemalloc\` for real numbers.
- **Expecting savings from \`sorted(...)\`, \`list(...)\` or \`"".join(...)\`.** They materialise every item anyway; the brackets make no difference to the peak.
- **Iterating a generator expression twice.** The second pass is silently empty. If two consumers need the data, build a list, or create two generator expressions.
- **Expecting a generator expression to see a reassigned source.** The first iterable is captured when it is created, but everything else is looked up late. Pass values in explicitly if they might change.
- **Converting every comprehension "for memory".** For a few hundred items the list is small, reusable, indexable and often faster. Use the generator expression when the data is large, unbounded or consumed once by a streaming function.
- **Debugging with \`print(genexpr)\`.** It shows \`<generator object <genexpr> at ...>\`, not the values, and calling \`list()\` on it to look consumes it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A list comprehension computes everything now and stores it; a generator expression returns a small generator that computes one item at a time when asked. Memory is O(n) versus O(1) in the number of items.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The numbers:</strong> <span style="color:#f0e2c8;">On 64-bit CPython 3.11, a million-item list comprehension is an 8.4 MB pointer array plus a million int objects, about 40 MB peak with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code>; the generator object is about 200 bytes whatever n is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to measure:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getsizeof</code> is shallow: it counts the pointer array but not the elements. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code> peak memory, or add the element sizes, for the real cost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When it saves nothing:</strong> <span style="color:#f0e2c8;">Only streaming consumers benefit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.join()</code> build the full sequence anyway, so the peak is the same.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What comes with laziness:</strong> <span style="color:#f0e2c8;">Single pass, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> or indexing, errors raised while consuming, only the first iterable bound at creation. Speed is similar and size-dependent, so choose on memory and usage, not speed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.getsizeof</code> say a generator of a billion items is about 200 bytes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it really is: the generator holds a paused frame and a reference to the source iterator, not the items. Nothing is computed until it is consumed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"".join(x for x in items)</code> more memory-efficient than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"".join([x for x in items])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. CPython join collects the items into a sequence before joining, so both peak the same; on our run the difference was well under 1%. The bracketed form is fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did Python 3.12 change this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PEP 709 inlined list, dict and set comprehensions into the enclosing function, which removes the hidden function call and makes them faster, but the list they build is the same size. Generator expressions still create a generator object with its own frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still choose the list comprehension?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the result is small, needed more than once, indexed, measured with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code>, or passed to something that would build a list anyway. Laziness adds no value there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What variables does a generator expression capture?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The iterable of its first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> clause is evaluated immediately; every other name is looked up when the generator runs, so later reassignments of those names are seen.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **List comprehension** | \`[expr for x in it]\`: builds the whole list now |
| **Generator expression** | \`(expr for x in it)\`: a generator that computes items on demand |
| **\`sys.getsizeof\`** | bytes used by one object itself, not what it refers to |
| **Shallow vs deep size** | the object alone vs the object plus everything it keeps alive |
| **\`tracemalloc\`** | stdlib module that tracks Python memory allocations and their peak |
| **Peak memory** | the most memory in use at any one moment during the work |
| **PEP 709** | 3.12 inlining of list, dict and set comprehensions |

---
**Conclusion:** The memory difference is the difference between storing every result and producing one at a time. A list comprehension holds a pointer array of about 8 bytes per item plus every element object, so a million squares cost about 40 MB at peak on our run; a generator expression is a fixed-size object of about 200 bytes holding a paused frame. Measure with \`tracemalloc\`, not just the shallow \`sys.getsizeof\`, and remember that the saving is real only when the consumer streams: \`sum\` and \`for\` benefit, while \`sorted\`, \`list\` and \`join\` build the full sequence anyway. Pick the generator expression for large, unbounded or single-use data, and the list when you need to keep, index or reuse the results; for whole streaming designs see [generator pipelines](/interview-question/how-do-generator-pipelines-stream-data-lazily).
`,
    examples: [
      { label: `Measuring it: getsizeof, deep size and tracemalloc peaks`, code: `import sys
import tracemalloc

# 1. sys.getsizeof: the list grows with n, the generator object does not.
sizes = {}
for n in (10, 1_000, 1_000_000):
    lst = [x for x in range(n)]
    gen = (x for x in range(n))
    sizes[n] = (sys.getsizeof(lst), sys.getsizeof(gen))
print("1. generator size is the same for every n:", len({g for _, g in sizes.values()}) == 1)
print("   list of 1,000,000 is over 500x the list of 1,000:", sizes[1_000_000][0] > 500 * sizes[1_000][0])
print("   list of 1,000,000 is over 10,000x the generator:", sizes[1_000_000][0] > 10_000 * sizes[1_000_000][1])

# 2. getsizeof is shallow: it counts the list's pointer array,
#    not the int objects the pointers lead to.
big_ints = [x * 1000 for x in range(1000)]
deep = sys.getsizeof(big_ints) + sum(sys.getsizeof(i) for i in big_ints)
print("2. deep size is more than 3x the shallow size:", deep > 3 * sys.getsizeof(big_ints))

# 3. Peak memory while summing a million squares, measured with tracemalloc.
def peak(fn):
    tracemalloc.start()
    fn()
    p = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    return p

N = 1_000_000
list_peak = peak(lambda: sum([x * x for x in range(N)]))
gen_peak = peak(lambda: sum(x * x for x in range(N)))
print("3. list comprehension peak over 10 MB:", list_peak > 10_000_000)
print("   generator expression peak under 10 KB:", gen_peak < 10_000)

# 4. The memory saving disappears if the consumer builds a list anyway.
join_list = peak(lambda: ",".join([str(x) for x in range(100_000)]))
join_gen = peak(lambda: ",".join(str(x) for x in range(100_000)))
print("4. str.join peaks within 1% either way:", abs(join_list - join_gen) < join_list / 100)
sorted_gen = peak(lambda: sorted(x for x in range(N)))
print("   sorted(genexpr) still peaks over 10 MB:", sorted_gen > 10_000_000)

# 5. The same work, and the same answer.
print(sum([x * x for x in range(10)]), sum(x * x for x in range(10)))  # 285 285` },
      { label: `Eager vs lazy: evaluation time, binding, errors and reuse`, code: `# 1. A list comprehension runs now; a generator expression runs later.
def loud(x):
    print("    computing", x)
    return x * 10

print("1. list comprehension:")
lst = [loud(x) for x in range(2)]
print("   built:", lst)
print("   generator expression:")
gen = (loud(x) for x in range(2))
print("   created, nothing computed yet")
print("   consumed:", list(gen))

# 2. Only the first iterable is evaluated immediately.
#    Everything else (conditions, later names) is looked up at consumption.
limit = 2
items = [1, 2, 3]
gen = (x for x in items if x <= limit)
items = [100]
limit = 3
print("2. bound to the old list, but sees the new limit:", list(gen))

# 3. Errors move too: a list comprehension fails at once,
#    a generator expression fails when someone pulls the bad item.
data = ["1", "2", "x"]
try:
    nums = [int(s) for s in data]
except ValueError as e:
    print("3. list comprehension raised immediately:", e)
nums = (int(s) for s in data)
print("   generator created fine; first item:", next(nums))
try:
    list(nums)
except ValueError as e:
    print("   failed later, while consuming:", e)

# 4. A generator expression is one pass; the list can be reused.
squares_list = [x * x for x in range(4)]
squares_gen = (x * x for x in range(4))
print("4. list twice:", sum(squares_list), max(squares_list))
print("   generator twice:", sum(squares_gen), max(squares_gen, default="empty"))

# 5. Neither leaks its loop variable.
x = "outer"
_ = [x for x in range(3)]
_ = list(x for x in range(3))
print(x)  # outer

# 6. Syntax: a lone argument needs no extra parentheses; two arguments do.
print("6.", sum(n for n in range(5)), sorted((n % 3 for n in range(5)), reverse=True))

# 7. A list comprehension supports len, indexing and slicing; a generator does not.
print("7.", len(squares_list), squares_list[1:3], type(squares_gen).__name__)` },
    ],
  },
];

export default augments;
