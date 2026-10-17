/**
 * PYTHON ULTRA — batch 04: Basics IV, iteration helpers — enumerate and zip, iterable unpacking,
 * list/dict/set comprehensions, sorted() vs list.sort() with key functions, and the in operator.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What do enumerate and zip do?`,
    difficulty: "easy",
    seoDescription: `Learn how Python enumerate and zip work: lazy iterators, start=, zip stopping at the shortest, strict=True, zip_longest and the transpose trick.`,
    description: `**Question presented to candidate:**
"I often see loops like \`for i in range(len(items))\`. What do \`enumerate\` and \`zip\` do, how would you use them to clean that up, and is there anything surprising about how they behave?"

**What a strong answer should cover:**
- \`enumerate(iterable, start=0)\` yields \`(index, item)\` pairs, so you never index back into the list; \`start=\` sets the first number.
- \`zip(a, b, ...)\` yields tuples that take one item from each input, and stops as soon as the shortest input runs out.
- Both return lazy, single-use iterators (\`iter(e) is e\`), not lists; they work on any iterable, including generators and infinite ones.
- \`zip(..., strict=True)\` (Python 3.10, PEP 618) raises \`ValueError\` on a length mismatch; \`itertools.zip_longest\` pads instead.
- Idioms: \`dict(zip(keys, values))\`, \`zip(*rows)\` to transpose or unzip, \`enumerate(zip(a, b))\` for index plus pairs.
- The lost-item gotcha: zip pulls from the left input first, so an iterator passed on the left loses one item when a later input runs out.

**Code / implementation expected:** Yes — rewrite an index loop with \`enumerate\`, walk two lists with \`zip\`, and show \`zip(*rows)\` or \`dict(zip(...))\`.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers preparing for interviews — you only need to know what a list and a \`for\` loop are.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (and 3.12 where noted); every example also runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

Picture a school sports day. The teacher has a list of runners and wants to read them out with their lane numbers: "Lane 1, Ann. Lane 2, Bob." Then she has a second sheet with each runner's time and wants to read name and time together: "Ann, 12.1 seconds. Bob, 12.4 seconds."

You can do both jobs with a counter you keep in your head: "position 0 on sheet one, position 0 on sheet two, now position 1 ..." It works, but it is easy to lose count or read the wrong line. \`enumerate\` is a helper who stands next to you and calls out the lane number for you. \`zip\` is a helper who holds both sheets side by side and hands you one line from each at the same time. Python code with them is shorter, and a whole class of "off by one" and "wrong index" bugs disappears.

Interviewers ask this because \`for i in range(len(xs)): ... xs[i]\` is the classic sign of someone who learned another language first. Replacing it with \`enumerate\` or \`zip\`, and knowing the two or three traps, is the expected answer.

## 2. enumerate: a counter that comes with the item

📌 **Interview term: Iterable** — anything you can loop over with \`for\`: lists, tuples, strings, dicts, files, generators. Formally, an object whose \`iter()\` gives you an iterator. See [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator).

📌 **Interview term: Iterator** — an object that produces items one at a time with \`next()\` and remembers where it is. Once it has handed out every item it is exhausted and stays empty.

\`enumerate(iterable, start=0)\` wraps an iterable and produces pairs \`(count, item)\`:

~~~python
names = ["Ann", "Bob", "Cy"]

# The "other language" way: count by hand and index back in
for i in range(len(names)):
    print(i + 1, names[i])

# The Python way
for rank, name in enumerate(names, start=1):
    print(rank, name)
~~~

The pair is unpacked straight into \`rank, name\` in the loop header (that is [iterable unpacking](/interview-question/how-does-iterable-unpacking-work)). The \`start=\` argument only changes the first number; it does not skip items.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="enumerate with start 1 pairs a running count with each item of the list">
  <defs>
    <marker id="py04q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="26" text-anchor="middle">enumerate(names, start=1)</text>
  <rect class="d-box-muted" x="40" y="56" width="130" height="44" rx="8"/>
  <text class="d-text" x="105" y="84" text-anchor="middle">"Ann"</text>
  <rect class="d-box-muted" x="255" y="56" width="130" height="44" rx="8"/>
  <text class="d-text" x="320" y="84" text-anchor="middle">"Bob"</text>
  <rect class="d-box-muted" x="470" y="56" width="130" height="44" rx="8"/>
  <text class="d-text" x="535" y="84" text-anchor="middle">"Cy"</text>
  <path class="d-edge" d="M 105 102 L 105 150" marker-end="url(#py04q1-arrow)"/>
  <path class="d-edge" d="M 320 102 L 320 150" marker-end="url(#py04q1-arrow)"/>
  <path class="d-edge" d="M 535 102 L 535 150" marker-end="url(#py04q1-arrow)"/>
  <rect class="d-box-accent" x="40" y="156" width="130" height="44" rx="8"/>
  <text class="d-text" x="105" y="184" text-anchor="middle">(1, "Ann")</text>
  <rect class="d-box-accent" x="255" y="156" width="130" height="44" rx="8"/>
  <text class="d-text" x="320" y="184" text-anchor="middle">(2, "Bob")</text>
  <rect class="d-box-accent" x="470" y="156" width="130" height="44" rx="8"/>
  <text class="d-text" x="535" y="184" text-anchor="middle">(3, "Cy")</text>
</svg>

Each item is paired with the next count; the count starts at \`start\` and goes up by one.

You can picture \`enumerate\` as this small generator (the real one is written in C inside CPython, but it behaves the same):

~~~python
def my_enumerate(iterable, start=0):
    n = start
    for item in iterable:
        yield n, item
        n += 1
~~~

## 3. zip: walking several iterables in lockstep

\`zip(a, b, ...)\` takes one item from each input and gives you a tuple of them, again and again, until **any** input runs out.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="zip pairs items by position and stops at the shortest input, so the extra item is dropped">
  <defs>
    <marker id="py04q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="72" text-anchor="middle">names</text>
  <rect class="d-box" x="130" y="44" width="110" height="44" rx="8"/>
  <text class="d-text" x="185" y="72" text-anchor="middle">"Ann"</text>
  <rect class="d-box" x="300" y="44" width="110" height="44" rx="8"/>
  <text class="d-text" x="355" y="72" text-anchor="middle">"Bob"</text>
  <rect class="d-box-muted" x="470" y="44" width="110" height="44" rx="8"/>
  <text class="d-sub" x="525" y="72" text-anchor="middle">"Cy" dropped</text>
  <text class="d-sub" x="70" y="152" text-anchor="middle">scores</text>
  <rect class="d-box" x="130" y="124" width="110" height="44" rx="8"/>
  <text class="d-text" x="185" y="152" text-anchor="middle">91</text>
  <rect class="d-box" x="300" y="124" width="110" height="44" rx="8"/>
  <text class="d-text" x="355" y="152" text-anchor="middle">85</text>
  <rect class="d-box-muted" x="470" y="124" width="110" height="44" rx="8"/>
  <text class="d-sub" x="525" y="152" text-anchor="middle">nothing left</text>
  <path class="d-edge" d="M 185 170 L 185 218" marker-end="url(#py04q1-arrow2)"/>
  <path class="d-edge" d="M 355 170 L 355 218" marker-end="url(#py04q1-arrow2)"/>
  <rect class="d-box-accent" x="120" y="224" width="130" height="44" rx="8"/>
  <text class="d-text" x="185" y="252" text-anchor="middle">("Ann", 91)</text>
  <rect class="d-box-accent" x="290" y="224" width="130" height="44" rx="8"/>
  <text class="d-text" x="355" y="252" text-anchor="middle">("Bob", 85)</text>
  <rect class="d-box-muted" x="460" y="224" width="130" height="44" rx="8"/>
  <text class="d-sub" x="525" y="252" text-anchor="middle">zip stops here</text>
</svg>

With \`names = ["Ann", "Bob", "Cy"]\` and only two scores, \`zip\` produces two tuples and quietly drops \`"Cy"\`. That silence is the most important thing to know about \`zip\`.

📌 **Interview term: Lazy evaluation** — computing each value only when it is asked for. \`enumerate\` and \`zip\` build nothing up front; they make the next tuple when the loop calls \`next()\`. That is why they work on huge files and even infinite generators.

📌 **Interview term: Lockstep iteration** — advancing several sequences together, one position at a time. \`zip\` is Python's tool for it.

Three idioms come up in nearly every codebase:

| Idiom | What it does | Result |
| :--- | :--- | :--- |
| \`dict(zip(keys, values))\` | Build a dict from two parallel lists | \`{'Ann': 91, ...}\` |
| \`list(zip(*rows))\` | Transpose a matrix (rows become columns) | \`[(1, 4), (2, 5), (3, 6)]\` |
| \`a, b = zip(*pairs)\` | "Unzip" a list of pairs into two tuples | \`('a', 'b', 'c')\` and \`(1, 2, 3)\` |

\`zip(*rows)\` works because \`*rows\` spreads the rows as separate arguments: \`zip(*[(1, 2, 3), (4, 5, 6)])\` is the same call as \`zip((1, 2, 3), (4, 5, 6))\`.

## 4. When the lengths differ: three choices

| You want | Use | On \`["a", "b", "c"]\` and \`[1, 2]\` |
| :--- | :--- | :--- |
| Stop at the shortest (the default) | \`zip(a, b)\` | \`[('a', 1), ('b', 2)]\` |
| An error, because unequal length is a bug | \`zip(a, b, strict=True)\` | \`ValueError: zip() argument 2 is shorter than argument 1\` |
| Keep everything, pad the gaps | \`itertools.zip_longest(a, b, fillvalue=0)\` | \`[('a', 1), ('b', 2), ('c', 0)]\` |

📌 **Interview term: strict=True** — the keyword argument that makes \`zip\` raise \`ValueError\` when its inputs have different lengths. It was added in Python 3.10 by [PEP 618](https://peps.python.org/pep-0618/). It checks only when the shortest input is exhausted, so the error comes at the end of the loop, after earlier tuples have already been processed.

Use \`strict=True\` whenever the lists are supposed to match (column names and row values, file names and their checksums). Silent truncation hides data loss.

## 5. The gotchas

**Single use.** A \`zip\` or \`enumerate\` object is an iterator: \`iter(z) is z\` is \`True\`, and after one full pass it is empty. If you need to loop twice, call \`zip(...)\` again or store \`list(zip(...))\`.

**The lost item.** \`zip\` asks its inputs for an item from left to right. When it asks the first input and gets an item, then finds the second input empty, the item it already took is thrown away. If the first input is a shared iterator, you lose that item for good:

~~~python
it = iter([1, 2, 3, 4])
print(list(zip(it, ["x", "y"])))   # [(1, 'x'), (2, 'y')]
print(list(it))                    # [4]  -- 3 was taken and dropped
~~~

Put the shorter, known-length input first, or use \`strict=True\`, or pull items with \`itertools.islice\` yourself.

**Chunking with the same iterator.** \`zip(*[iter(data)] * 3)\` passes the *same* iterator three times, so each tuple takes three consecutive items: \`(0, 1, 2), (3, 4, 5)\`. The leftover \`6\` is dropped (default truncation again). On 3.12+ \`itertools.batched\` does this more clearly, but it is not available on 3.11, which this page runs.

## 6. Verified: Running the Code

Both examples below run in the page. Example 1, the everyday uses, printed:

~~~text
1. Ann
2. Bob
3. Cy
Ann scored 91
Bob scored 85
Cy scored 78
enumerate
zip
[(0, 'a'), (1, 'b')]
{'Ann': 91, 'Bob': 85, 'Cy': 78}
[(1, 'a'), (2, 'b')]
[(1, 4), (2, 5), (3, 6)]
('a', 'b', 'c') (1, 2, 3)
0 Ann 91
1 Bob 85
2 Cy 78
~~~

Example 2, the gotchas, printed:

~~~text
[('a', 1), ('b', 2), ('c', 3)]
[]
ValueError: zip() argument 2 is shorter than argument 1
[('a', 1), ('b', 2), ('c', 0)]
[(1, 'x'), (2, 'y')]
left in it: [4]
[('x', 1), ('y', 2)]
left in it: [3, 4]
[(0, 1, 2), (3, 4, 5)]
0 a
1 b
2 c
~~~

What the output proves:

- \`type(enumerate(names)).__name__\` is \`enumerate\` and \`type(zip(...)).__name__\` is \`zip\`: neither is a list.
- The second \`list(pairs)\` is \`[]\`: the zip object was used up by the first pass.
- With \`it\` on the left, \`left in it: [4]\` — the \`3\` was consumed and dropped. With \`it\` on the right, \`[3, 4]\` remain, nothing is lost.
- The \`strict=True\` message names the argument that ran out: \`zip() argument 2 is shorter than argument 1\`.
- \`enumerate\` over an infinite generator works fine, because both are lazy; the loop decides when to stop.

## 7. Common Pitfalls

- **Writing \`for i in range(len(xs))\` just to get the index.** Use \`enumerate(xs)\`; if you need two lists, use \`zip\` (or \`enumerate(zip(a, b))\` for both).
- **Forgetting that \`zip\` truncates silently.** Mismatched lengths lose data with no error. Use \`strict=True\` (3.10+) when the lengths must match.
- **Looping over the same \`zip\`/\`enumerate\` object twice.** The second loop does nothing. Recreate it or store a list.
- **Passing a shared iterator as the left argument of \`zip\`.** One item is consumed and lost when a later input runs out.
- **Thinking \`start=\` skips items.** \`enumerate(xs, start=1)\` still yields every item; only the numbers shift.
- **Calling \`len()\` on a zip object.** It is an iterator and has no length; use \`len(list(...))\` or compute it from the inputs.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate</code> adds a running index to any iterable, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> walks several iterables in lockstep, yielding one tuple per position.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. enumerate details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate(xs, start=0)</code> yields <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i, item)</code> pairs, so you unpack them in the loop header instead of indexing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xs[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. zip details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip(a, b)</code> stops at the <strong style="color:#ffca28;">shortest</strong> input; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=True</code> (3.10+) raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> instead, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.zip_longest</code> pads.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Both are lazy:</strong> <span style="color:#f0e2c8;">They return single-use iterators, not lists, so they work on files and infinite generators and are empty after one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Idioms to name:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict(zip(keys, values))</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip(*rows)</code> to transpose or unzip, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate(zip(a, b))</code> for an index plus pairs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">zip()</code> with no arguments return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An empty iterator: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(zip())</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>. With one argument it yields one-element tuples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you transpose a matrix in one line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(zip(*matrix))</code>. The star spreads the rows as separate arguments, and zip groups the first items, then the second items, and so on. Rows of unequal length are cut to the shortest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can zip lose an item from an iterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It pulls from the inputs left to right. If the first input gives an item and a later input is empty, the item already taken is discarded. Put the shorter input first or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">enumerate</code> slower than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">range(len(xs))</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in a way that matters; it avoids a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xs[i]</code> lookup per step and works on iterables that cannot be indexed at all, such as generators and files. Readability is the real reason to use it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you iterate over a dict with an index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for i, (key, value) in enumerate(d.items()):</code> — enumerate gives the index and the nested tuple target unpacks the key and value.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Iterable** | Anything a \`for\` loop can walk over |
| **Iterator** | The object that hands out items one by one with \`next()\` and can be used up |
| **Lazy evaluation** | Producing each value only when it is asked for |
| **Lockstep iteration** | Advancing several sequences together, one position at a time |
| **strict=True** | \`zip\` option (3.10+) that raises \`ValueError\` on unequal lengths |

---
**Conclusion:** \`enumerate\` and \`zip\` are the two small built-ins that make Python loops read like the task: "for each runner and their number", "for each name and its score". \`enumerate\` attaches a counter, \`zip\` pairs items by position, and both are lazy, single-use iterators that work on any iterable. The strong answer adds the behaviour at the edges: \`zip\` stops at the shortest input unless you ask for \`strict=True\` or use \`zip_longest\`, an iterator passed on the left can lose an item, and \`zip(*rows)\` both transposes and unzips. For the wider family of iteration tools see [the itertools module](/interview-question/what-is-the-itertools-module-used-for).`,
    examples: [
      {
        label: `enumerate, zip, dict(zip(...)), transpose and unzip`,
        code: `names = ["Ann", "Bob", "Cy"]
scores = [91, 85, 78]

# enumerate: a running counter without range(len(...))
for rank, name in enumerate(names, start=1):
    print(f"{rank}. {name}")

# zip: walk two lists in lockstep
for name, score in zip(names, scores):
    print(f"{name} scored {score}")

# Both return lazy iterator objects, not lists
print(type(enumerate(names)).__name__)  # enumerate
print(type(zip(names, scores)).__name__)  # zip
print(list(enumerate("ab")))  # [(0, 'a'), (1, 'b')]

# Build a dict from two parallel lists
print(dict(zip(names, scores)))  # {'Ann': 91, 'Bob': 85, 'Cy': 78}

# zip stops at the shortest input
print(list(zip([1, 2, 3], "ab")))  # [(1, 'a'), (2, 'b')]

# zip(*rows) transposes rows into columns
matrix = [(1, 2, 3), (4, 5, 6)]
print(list(zip(*matrix)))  # [(1, 4), (2, 5), (3, 6)]

# zip(*pairs) "unzips" pairs back into separate tuples
pairs = [("a", 1), ("b", 2), ("c", 3)]
letters, numbers = zip(*pairs)
print(letters, numbers)  # ('a', 'b', 'c') (1, 2, 3)

# enumerate + zip together: index, and one item from each list
for i, (name, score) in enumerate(zip(names, scores)):
    print(i, name, score)`,
      },
      {
        label: `Gotchas: single use, strict=True, zip_longest, the lost item, chunking`,
        code: `from itertools import zip_longest

# 1. Single use: a zip (or enumerate) object is empty after one pass
pairs = zip("abc", [1, 2, 3])
print(list(pairs))
print(list(pairs))

# 2. strict=True (Python 3.10+) turns silent truncation into an error
try:
    list(zip(["a", "b", "c"], [1, 2], strict=True))
except ValueError as err:
    print("ValueError:", err)

# 3. zip_longest pads the shorter input instead of dropping data
print(list(zip_longest("abc", [1, 2], fillvalue=0)))  # [('a', 1), ('b', 2), ('c', 0)]

# 4. The lost item: zip pulls from the left input first
it = iter([1, 2, 3, 4])
print(list(zip(it, ["x", "y"])))
print("left in it:", list(it))
it = iter([1, 2, 3, 4])
print(list(zip(["x", "y"], it)))
print("left in it:", list(it))

# 5. Chunking: the same iterator passed three times gives groups of three
data = list(range(7))
print(list(zip(*[iter(data)] * 3)))  # [(0, 1, 2), (3, 4, 5)]

# 6. enumerate works on any iterable, even an infinite one
def letters():
    code = ord("a")
    while True:
        yield chr(code)
        code += 1

for i, ch in enumerate(letters()):
    if i == 3:
        break
    print(i, ch)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does iterable unpacking work?`,
    difficulty: "easy",
    seoDescription: `Python iterable unpacking explained: a, b = pair, starred targets, swaps, nested targets, * and ** in calls, the error messages and assignment order.`,
    description: `**Question presented to candidate:**
"Explain what happens in a line like \`first, *rest = items\` or \`a, b = b, a\`. How does iterable unpacking work in Python, what are the rules, and where else do you see the star syntax?"

**What a strong answer should cover:**
- The right side is evaluated completely first, then its items are assigned to the targets on the left, from left to right; any iterable works (list, tuple, string, generator, dict keys).
- The count must match, otherwise \`ValueError: too many values to unpack\` or \`not enough values to unpack\`.
- One starred target (PEP 3132) collects the leftovers into a **list**, possibly empty; two stars are a \`SyntaxError\`.
- Nested targets mirror nested data: \`name, (lat, lng) = record\`; it is used in \`for\` headers, \`enumerate\`, \`dict.items()\`.
- The other direction (PEP 448, Python 3.5): \`[*a, *b]\`, \`{**d1, **d2}\`, \`f(*args, **kwargs)\`.
- A CPython detail: \`a, b = b, a\` compiles to a \`SWAP\` instruction on 3.11, no tuple is built; longer targets use \`UNPACK_SEQUENCE\` / \`UNPACK_EX\`.

**Code / implementation expected:** Yes — a few short assignments showing a starred target, a swap, a nested target and the error case.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers — you should know what a list and a tuple are.
**Difficulty:** Easy
**Python version:** Behaviour and \`dis\` output checked on CPython 3.11 (3.12 where noted); the examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot, then listed again in the Quick Glossary. All output shown is from real runs.

## 1. Why This Even Matters — A Story First

You come home with a bag of shopping: milk, bread, eggs. You do not carry the bag to the fridge and then reach into it three times, saying "item number 0 goes on the top shelf, item number 1 ...". You open the bag and put each thing straight where it belongs, in one movement.

Iterable unpacking is that movement in code. Instead of

~~~python
point = (3, 4)
x = point[0]
y = point[1]
~~~

you write \`x, y = point\`. Python opens the "bag" on the right and puts each item into the name waiting for it on the left. It is shorter, it states the shape you expect ("exactly two things"), and Python checks that shape for you: if the bag holds three things, you get an error instead of a silent bug.

## 2. The Core Rule

📌 **Interview term: Iterable unpacking** — assigning the items of any iterable to several targets in one statement: \`a, b, c = iterable\`. Also called *destructuring* in other languages.

📌 **Interview term: Target list** — the comma-separated names (or attributes, or index expressions like \`items[0]\`) on the left of \`=\` that receive the values.

Two steps, always in this order:

1. **The right side is evaluated completely.** If it is \`b, a\`, Python reads both values first.
2. **The items are assigned to the targets from left to right.** Python pulls items from the right side one by one and stores them in the first target, the second, and so on, then checks that the counts matched.

The right side can be any iterable, not only a tuple:

| Right side | Example | Result |
| :--- | :--- | :--- |
| list / tuple | \`x, y, z = [10, 20, 30]\` | \`10 20 30\` |
| string | \`c1, c2, c3 = "abc"\` | \`a b c\` |
| generator | \`sq0, sq1 = (n * n for n in range(2))\` | \`0 1\` |
| dict | \`k1, k2 = {"left": 1, "right": 2}\` | the **keys**: \`left right\` |
| set | \`lo, hi = {30, 10}\` | some order, not guaranteed: use \`sorted()\` first |

📌 **Interview term: Tuple packing** — the comma on the right of \`p, q = 1, 2\` creates a tuple \`(1, 2)\`. It is the comma that makes a tuple, not the parentheses. Packing on the right plus unpacking on the left is what makes \`a, b = b, a\` a swap.

## 3. Starred Targets: "and the rest"

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="first, star middle, last = range 6 gives first 0, middle as a list of 1 to 4, and last 5">
  <defs>
    <marker id="py04q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="26" text-anchor="middle">first, *middle, last = range(6)</text>
  <rect class="d-box-muted" x="40" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="80" y="82" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="150" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="190" y="82" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="250" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="290" y="82" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="350" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="390" y="82" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="450" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="490" y="82" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="560" y="54" width="80" height="44" rx="8"/>
  <text class="d-text" x="600" y="82" text-anchor="middle">5</text>
  <path class="d-edge" d="M 80 100 L 80 162" marker-end="url(#py04q2-arrow)"/>
  <path class="d-edge-accent" d="M 340 100 L 340 162" marker-end="url(#py04q2-arrow)"/>
  <path class="d-edge" d="M 600 100 L 600 162" marker-end="url(#py04q2-arrow)"/>
  <rect class="d-box" x="20" y="168" width="120" height="60" rx="8"/>
  <text class="d-text" x="80" y="194" text-anchor="middle">first</text>
  <text class="d-sub" x="80" y="216" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="210" y="168" width="260" height="60" rx="8"/>
  <text class="d-text d-accent" x="340" y="194" text-anchor="middle">*middle</text>
  <text class="d-sub" x="340" y="216" text-anchor="middle">[1, 2, 3, 4] always a list</text>
  <rect class="d-box" x="540" y="168" width="120" height="60" rx="8"/>
  <text class="d-text" x="600" y="194" text-anchor="middle">last</text>
  <text class="d-sub" x="600" y="216" text-anchor="middle">5</text>
</svg>

The mandatory targets (\`first\`, \`last\`) are filled from the two ends, and the starred target takes whatever is left in the middle.

📌 **Interview term: Starred assignment (extended unpacking)** — a target written \`*name\` that collects all items not taken by the other targets, as a list. It came with Python 3.0 through [PEP 3132](https://peps.python.org/pep-3132/).

The rules, all visible in the examples below:

- At most **one** star per target list. \`a, *b, *c = range(5)\` is rejected at compile time with \`SyntaxError: multiple starred expressions in assignment\` — Python could not know where to split.
- The starred name is **always a list**, even when the right side is a tuple or a string (\`*chars, end = "hey"\` gives \`['h', 'e']\`), and it may be **empty** (\`only, *nothing = [99]\` gives \`[]\`).
- The mandatory targets must still be filled: \`first, *rest, last = [1]\` raises \`not enough values to unpack (expected at least 2, got 1)\`.
- A star cannot stand alone: \`*rest = items\` is a \`SyntaxError: starred assignment target must be in a list or tuple\`; write \`*rest, = items\` (with the comma) or just \`rest = list(items)\`.

## 4. Nesting, Loops and the Underscore

Targets can be nested to match nested data. The shape on the left mirrors the shape on the right:

~~~python
name, (lat, lng) = ("HQ", (51.5, -0.12))
for i, (key, value) in enumerate({"a": 1}.items()):
    ...
~~~

Every \`for\` loop header is an assignment target too, which is why \`for key, value in d.items():\` and \`for i, item in enumerate(xs):\` work (see [enumerate and zip](/interview-question/what-do-enumerate-and-zip-do)).

📌 **Interview term: Throwaway variable \`_\`** — a normal variable name that, by convention, means "I do not care about this value": \`_, year, _ = date.split("-")\`. Python gives it no special meaning in assignment (it is reused, so it ends up holding the last ignored value).

## 5. The Other Direction: * and ** Spread Values

The star also works on the **right** side, in calls and in literal displays, to spread an iterable out:

| Where | Example | Result |
| :--- | :--- | :--- |
| list / tuple / set display | \`[*range(3), *"ab"]\` | \`[0, 1, 2, 'a', 'b']\` |
| dict display | \`{**{"a": 1, "b": 2}, **{"b": 20}}\` | \`{'a': 1, 'b': 20}\` — the later key wins |
| function call | \`print(*[1, 2], *[3])\` | prints \`1 2 3\` |
| function call | \`f(**{"x": 1})\` | same as \`f(x=1)\`; keys must be strings |

📌 **Interview term: Unpacking generalizations (PEP 448)** — the Python 3.5 change ([PEP 448](https://peps.python.org/pep-0448/)) that allowed any number of \`*\` and \`**\` unpackings in a call and allowed them inside list, tuple, set and dict displays. Before it, merging two lists into a new one needed \`a + b\` or \`itertools.chain\`.

How the matching \`def f(*args, **kwargs)\` side collects arguments is its own topic: [*args and **kwargs](/interview-question/what-do-args-and-kwargs-mean).

## 6. What CPython Actually Does

\`dis\` shows the bytecode the compiler produced. On CPython 3.11, a two-name swap does not build a tuple at all:

~~~text
>>> dis.dis("a, b = b, a")
  1           2 LOAD_NAME                0 (b)
              4 LOAD_NAME                1 (a)
              6 SWAP                     2
              8 STORE_NAME               1 (a)
             10 STORE_NAME               0 (b)
~~~

Both values are pushed onto the stack first (the right side is fully evaluated), the top two are swapped, and then they are stored. Two and three targets are optimised like this; with four names the compiler falls back to the general form:

~~~text
>>> dis.dis("a, b, c, d = d, c, b, a")
  1           2 LOAD_NAME                0 (d)
              4 LOAD_NAME                1 (c)
              6 LOAD_NAME                2 (b)
              8 LOAD_NAME                3 (a)
             10 BUILD_TUPLE              4
             12 UNPACK_SEQUENCE          4
             16 STORE_NAME               3 (a)
~~~

and a starred target compiles to a different instruction, \`UNPACK_EX\`:

~~~text
>>> dis.dis("first, *rest = xs")
  1           2 LOAD_NAME                0 (xs)
              4 UNPACK_EX                1
              6 STORE_NAME               1 (first)
              8 STORE_NAME               2 (rest)
~~~

(Trimmed to the interesting lines; the \`RESUME\` and \`RETURN_VALUE\` lines are left out. 3.12 printed the same \`SWAP\` and \`UNPACK_SEQUENCE\` instructions in our run.)

📌 **Interview term: UNPACK_SEQUENCE** — the bytecode instruction that pops one iterable and pushes exactly N items, raising \`ValueError\` if the count is wrong. \`UNPACK_EX\` is its variant for starred targets.

## 7. The Evaluation-Order Gotcha

Because targets are assigned left to right, a later target can see an earlier one already changed:

~~~python
items = [0, 0, 0]
i = 0
i, items[i] = 1, 9
print(i, items)   # 1 [0, 9, 0]  -- items[1] was set, not items[0]
~~~

The right side \`(1, 9)\` was built first; then \`i = 1\`; then \`items[i] = 9\` used the **new** \`i\`. This is legal but confusing — avoid targets that depend on each other.

## 8. Verified: Running the Code

Example 1, the everyday forms, printed:

~~~text
10 20 30
a b c
0 1
left right
1 [2, 3, 4]
0 [1, 2, 3, 4] 5
99 []
2 1
HQ 51.5 -0.12
a -> 1
b -> 2
10
[0, 1, 2, 'a', 'b']
{'a': 1, 'b': 20}
1 2 3
~~~

Example 2, errors and gotchas, printed:

~~~text
ValueError: too many values to unpack (expected 2)
ValueError: not enough values to unpack (expected 2, got 1)
ValueError: not enough values to unpack (expected at least 2, got 1)
SyntaxError: multiple starred expressions in assignment
1 [0, 9, 0]
only
also
ValueError: too many values to unpack (expected 2)
[]
10 30
['h', 'e'] y
~~~

What to notice:

- The two count errors differ in wording: \`too many values to unpack (expected 2)\` and \`not enough values to unpack (expected 2, got 1)\`. With a star the message says \`expected at least 2\`.
- The failed \`x, y = it\` still drained the iterator: \`list(it)\` is \`[]\` afterwards, because Python had to pull a third item to discover there were too many.
- \`*chars\` came out as \`['h', 'e']\` — a list, although the source was a string.

## 9. Common Pitfalls

- **Unpacking a set or dict and expecting an order you did not control.** Sets have no defined order; dicts unpack their keys in insertion order. Sort a set first.
- **Expecting a tuple from a starred target.** \`head, *tail = (1, 2, 3)\` makes \`tail\` a list \`[2, 3]\`.
- **Forgetting the trailing comma for one item.** \`value, = ["x"]\` unpacks; \`value = ["x"]\` just stores the list.
- **Writing dependent targets.** \`i, items[i] = ...\` uses the newly assigned \`i\`. Keep targets independent.
- **Unpacking a generator you still need.** Unpacking consumes it — even when the unpack fails with \`ValueError\`.
- **Using \`**\` with non-string keys in a call.** \`f(**{1: "a"})\` fails; keys must be valid keyword names. In a dict display \`{**d}\` any hashable key is fine.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Unpacking assigns the items of any iterable to several targets in one statement: the right side is evaluated first, then items are assigned left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The checks:</strong> <span style="color:#f0e2c8;">The counts must match, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> (too many / not enough values to unpack). One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*name</code> target collects the rest as a <strong style="color:#ffca28;">list</strong>, possibly empty.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where you see it:</strong> <span style="color:#f0e2c8;">Swaps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a, b = b, a</code>, nested targets like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name, (lat, lng) = rec</code>, and loop headers like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for k, v in d.items()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The other direction:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**</code> spread values: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[*a, *b]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{**d1, **d2}</code> (later keys win), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(*args, **kwargs)</code> — PEP 448, Python 3.5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A CPython detail:</strong> <span style="color:#f0e2c8;">On 3.11 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a, b = b, a</code> compiles to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SWAP</code> instruction with no tuple built; general unpacking uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNPACK_SEQUENCE</code>, starred uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNPACK_EX</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a, b = b, a</code> work without a temporary variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The whole right side is evaluated before any assignment, so both old values are already on the stack. CPython then just swaps them and stores them into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use two starred targets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a, *b, *c = xs</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError: multiple starred expressions in assignment</code>, because the split point would be ambiguous. Nested targets may each have their own star.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What type is the starred variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Always a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, whatever the source type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*chars, end = "hey"</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">['h', 'e']</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to an iterator when unpacking fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is still consumed. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x, y = iter([1, 2, 3])</code> Python pulls the third item to detect the error, so the iterator is empty afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i, items[i] = 1, 9</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = 1</code> first and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items[1] = 9</code>, because targets are assigned left to right using the updated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Iterable unpacking** | Assigning an iterable's items to several targets at once |
| **Target list** | The names or slots on the left of \`=\` that receive values |
| **Tuple packing** | The comma on the right building a tuple |
| **Starred assignment** | \`*name\` target that collects leftover items into a list (PEP 3132) |
| **Throwaway variable \`_\`** | Convention for a value you ignore |
| **Unpacking generalizations** | \`*\`/\`**\` inside calls and displays, any number of times (PEP 448) |
| **UNPACK_SEQUENCE** | Bytecode that splits one iterable into exactly N stack items |

---
**Conclusion:** Iterable unpacking is one rule applied everywhere: evaluate the right side, then hand its items to the targets on the left in order, checking that the shape matches. A single starred target relaxes the count and always produces a list, nesting matches nested data, and the same star syntax on the right side spreads iterables into calls and literals. The strong answer adds the precise errors, the left-to-right assignment order, and the fact that CPython turns the classic swap into a single \`SWAP\` instruction.`,
    examples: [
      {
        label: `Unpacking forms: basic, starred, swap, nested, loops and spreading`,
        code: `# One target per item
x, y, z = [10, 20, 30]
print(x, y, z)  # 10 20 30

# Works on ANY iterable: strings, generators, dict keys
c1, c2, c3 = "abc"
print(c1, c2, c3)  # a b c
sq0, sq1 = (n * n for n in range(2))
print(sq0, sq1)  # 0 1
k1, k2 = {"left": 1, "right": 2}
print(k1, k2)  # left right

# A starred target collects the rest into a LIST
head, *tail = (1, 2, 3, 4)
print(head, tail)  # 1 [2, 3, 4]
first, *middle, last = range(6)
print(first, middle, last)  # 0 [1, 2, 3, 4] 5
only, *nothing = [99]
print(only, nothing)  # 99 []

# Swap: the right side is built first, then assigned
p, q = 1, 2
p, q = q, p
print(p, q)  # 2 1

# Nested targets mirror the shape of the data
name, (lat, lng) = ("HQ", (51.5, -0.12))
print(name, lat, lng)  # HQ 51.5 -0.12

# In a for loop header
for key, value in {"a": 1, "b": 2}.items():
    print(key, "->", value)

# Ignore parts you do not need with _ (just a normal name)
_, year, _ = "17-10-2026".split("-")
print(year)  # 10

# The other direction: * and ** spread values into displays and calls
print([*range(3), *"ab"])  # [0, 1, 2, 'a', 'b']
print({**{"a": 1, "b": 2}, **{"b": 20}})  # {'a': 1, 'b': 20}
print(*[1, 2], *[3])  # 1 2 3`,
      },
      {
        label: `Errors and gotchas: count mismatch, two stars, assignment order, trailing comma`,
        code: `# 1. A count mismatch is a ValueError with a precise message
for source in ([1, 2, 3], [1]):
    try:
        a, b = source
    except ValueError as err:
        print("ValueError:", err)

# 2. Starred still needs every mandatory target filled
try:
    first, *rest, last = [1]
except ValueError as err:
    print("ValueError:", err)

# 3. Two starred targets cannot be split unambiguously: SyntaxError
try:
    compile("a, *b, *c = range(5)", "<demo>", "exec")
except SyntaxError as err:
    print("SyntaxError:", err.msg)

# 4. Targets are assigned LEFT TO RIGHT after the right side is built
items = [0, 0, 0]
i = 0
i, items[i] = 1, 9
print(i, items)  # 1 [0, 9, 0]

# 5. A one-element target needs the trailing comma
(single,) = ["only"]
print(single)  # only
value, = ["also"]
print(value)  # also

# 6. A failed unpack still consumes the iterator
it = iter([1, 2, 3])
try:
    x, y = it
except ValueError as err:
    print("ValueError:", err)
print(list(it))  # []

# 7. Sets have no reliable order: sort before unpacking
lo, hi = sorted({30, 10})
print(lo, hi)  # 10 30

# 8. The starred part is always a list, even from a tuple or a string
*chars, end = "hey"
print(chars, end)  # ['h', 'e'] y`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What are list/dict/set comprehensions?`,
    difficulty: "easy",
    seoDescription: `Python list, dict and set comprehensions from zero: syntax, filters vs conditional expressions, nested loops, scope rules and when a loop is better.`,
    description: `**Question presented to candidate:**
"What are list, dict and set comprehensions in Python? Write a couple, tell me how they relate to a normal \`for\` loop, and when you would not use one."

**What a strong answer should cover:**
- The shape \`[expression for item in iterable if condition]\`; \`[]\` builds a list, \`{}\` with \`key: value\` a dict, \`{}\` with single values a set; \`()\` gives a lazy generator expression, not a "tuple comprehension".
- A trailing \`if\` **filters** items; \`x if cond else y\` in front **transforms** every item — different positions, different jobs.
- Several \`for\` clauses read left to right like nested loops; a comprehension inside a comprehension builds a nested result.
- Scope: the loop variable does not leak, but a walrus \`:=\` binds in the enclosing scope; in a class body only the first iterable sees class names.
- CPython detail: up to 3.11 a comprehension runs as a hidden nested function (\`<listcomp>\`); PEP 709 inlined list, dict and set comprehensions in 3.12.
- When not to: side effects, deeply nested or multi-condition logic, or huge data where a generator expression avoids building the whole list.

**Code / implementation expected:** Yes — one list, one dict and one set comprehension, plus the equivalent loop for one of them.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers — you should be comfortable with \`for\` loops and lists.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11, with the scope and bytecode differences also run on 3.12 and 3.13; the examples run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then the precise word an interviewer expects is tagged \`📌 Interview term:\` and defined. The Quick Glossary at the end collects them. Output and bytecode shown come from real runs.

## 1. Why This Even Matters — A Story First

You ask a friend at a market: "Get me the ripe ones from this crate, peeled." There are two ways to describe that job. The step-by-step way: "Take an empty bag. Pick up each fruit. If it is ripe, peel it and put it in the bag. When the crate is empty, give me the bag." The declarative way: "The peeled versions of the ripe fruits in this crate."

The second sentence says *what* you want, not *how* to collect it. A comprehension is that second sentence in Python:

~~~python
# step by step
bag = []
for fruit in crate:
    if fruit.ripe:
        bag.append(fruit.peeled())

# comprehension
bag = [fruit.peeled() for fruit in crate if fruit.ripe]
~~~

Same result, one line, and the reader sees immediately that the only purpose of the code is to *build a list*.

## 2. The Anatomy

📌 **Interview term: Comprehension** — an expression that builds a new collection from an iterable in one step: an output expression, one or more \`for\` clauses and optional \`if\` filters, inside brackets that decide the result type.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="The three parts of a list comprehension and the loop they stand for">
  <defs>
    <marker id="py04q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="170" height="70" rx="10"/>
  <text class="d-text d-accent" x="115" y="60" text-anchor="middle">n * n</text>
  <text class="d-sub" x="115" y="84" text-anchor="middle">1. what to produce</text>
  <rect class="d-box" x="260" y="30" width="190" height="70" rx="10"/>
  <text class="d-text" x="355" y="60" text-anchor="middle">for n in nums</text>
  <text class="d-sub" x="355" y="84" text-anchor="middle">2. where items come from</text>
  <rect class="d-box-muted" x="510" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="590" y="60" text-anchor="middle">if n &gt; 0</text>
  <text class="d-sub" x="590" y="84" text-anchor="middle">3. optional filter</text>
  <path class="d-edge-dashed" d="M 355 102 L 355 150" marker-end="url(#py04q3-arrow)"/>
  <path class="d-edge-dashed" d="M 590 102 L 590 196" marker-end="url(#py04q3-arrow)"/>
  <path class="d-edge-dashed" d="M 115 102 L 115 242" marker-end="url(#py04q3-arrow)"/>
  <rect class="d-box-muted" x="230" y="156" width="250" height="34" rx="8"/>
  <text class="d-sub" x="355" y="178" text-anchor="middle">for n in nums:</text>
  <rect class="d-box-muted" x="470" y="202" width="210" height="34" rx="8"/>
  <text class="d-sub" x="575" y="224" text-anchor="middle">if n &gt; 0:</text>
  <rect class="d-box-muted" x="30" y="248" width="300" height="34" rx="8"/>
  <text class="d-sub" x="180" y="270" text-anchor="middle">result.append(n * n)</text>
</svg>

The expression is written first but runs last, inside the loop and the filter — exactly like the \`append\` line at the bottom of the equivalent loop.

The brackets choose the type:

| Write | You get | Example | Result |
| :--- | :--- | :--- | :--- |
| \`[expr for x in it]\` | list | \`[n * n for n in nums if n > 0]\` | \`[9, 16, 25, 81, 36]\` |
| \`{expr for x in it}\` | set (duplicates collapse) | \`{abs(n) for n in nums}\` | the distinct values |
| \`{k: v for x in it}\` | dict (a repeated key keeps the last value) | \`{w[0]: w for w in words}\` | \`{'a': 'avocado', ...}\` |
| \`(expr for x in it)\` | generator expression (lazy) | \`sum(n for n in nums if n > 0)\` | \`27\` |

📌 **Interview term: Generator expression** — the round-bracket form. It builds nothing up front; it yields one value at a time. There is no "tuple comprehension": for a tuple write \`tuple(x for x in it)\`. The memory difference is its own question: [list comprehension vs generator expression](/interview-question/what-is-the-memory-difference-between-a-list-comprehension-and-a-generator-expre).

Note that \`{}\` alone is an empty **dict**; an empty set is \`set()\`.

## 3. Filter vs Conditional Expression

This trips up many beginners because both use \`if\`:

~~~python
[n for n in nums if n > 0]           # FILTER: drops items, result can be shorter
[n if n > 0 else 0 for n in nums]    # TRANSFORM: keeps every item, result has the same length
~~~

📌 **Interview term: Conditional expression** — \`a if condition else b\`, Python's inline "ternary". In a comprehension it belongs in the output expression, before \`for\`, and it must have an \`else\`. A trailing \`if\` (with no \`else\`) is a filter.

## 4. Several for Clauses and Nested Comprehensions

Multiple \`for\` clauses read **left to right**, in the same order as nested loops:

~~~python
[x for row in grid for x in row]
# is the same as
out = []
for row in grid:
    for x in row:
        out.append(x)
~~~

A comprehension *inside* the expression of another builds a nested result: \`[[row[c] for row in grid] for c in range(3)]\` transposes a 2 by 3 grid into a 3 by 2 one. If you need more than two levels, or two filters plus a conditional expression, a plain loop is usually easier to read.

## 5. Scope Rules (the Interesting Part)

📌 **Interview term: Comprehension scope** — the loop variables of a comprehension are local to it; they do not overwrite or leak into the surrounding code.

Three behaviours, all checked by running Example 2:

1. **No leak.** With \`x = "outer"\`, after \`[x * x for x in range(4)]\` the name \`x\` is still \`"outer"\` — on 3.11, 3.12 and 3.13.
2. **Walrus does leak, on purpose.** \`[y for v in values if (y := v * 2) > 40]\` binds \`y\` in the *enclosing* scope; afterwards \`y\` is \`84\`, the last value computed. See [the walrus operator](/interview-question/what-is-the-walrus-operator).
3. **Class bodies.** Inside a \`class\` block, only the **first** iterable (\`range(size)\`) is evaluated in the class scope. Any other use of a class-level name inside the comprehension fails: \`[size for i in range(2)]\` raised \`NameError: name 'size' is not defined\` on 3.11, 3.12 and 3.13 in our runs. Class bodies are not enclosing scopes for nested code (the same reason methods must write \`self.size\`); see [the LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution).

## 6. What CPython Actually Does

On CPython 3.11, a list comprehension is compiled into a separate code object called \`<listcomp>\`, wrapped in a function and called immediately with the iterator as its only argument (named \`.0\`):

~~~text
>>> dis.dis("[x*x for x in data]")     # Python 3.11, trimmed
  1           2 LOAD_CONST               0 (<code object <listcomp> at 0x..., file "<dis>", line 1>)
              4 MAKE_FUNCTION            0
              6 LOAD_NAME                0 (data)
              8 GET_ITER
             10 PRECALL                  0
             14 CALL                     0

Disassembly of <code object <listcomp> ...>:
              2 BUILD_LIST               0
              4 LOAD_FAST                0 (.0)
        >>    6 FOR_ITER                 7 (to 22)
              8 STORE_FAST               1 (x)
             10 LOAD_FAST                1 (x)
             12 LOAD_FAST                1 (x)
             14 BINARY_OP                5 (*)
             18 LIST_APPEND              2
             20 JUMP_BACKWARD            8 (to 6)
~~~

That hidden function is why the loop variable cannot leak: it is a local of another function. It also explains the speed advantage over a \`for\` + \`.append()\` loop: \`LIST_APPEND\` is a single instruction, while \`result.append(x)\` has to look up the method and call it every time. On our run with 100,000 items, \`[x*2 for x in data]\` took 2.38 ms and the equivalent append loop 2.68 ms on 3.11 (best of 5 with \`timeit\`; your numbers will differ, and the gap is modest).

📌 **Interview term: Inlined comprehensions (PEP 709)** — since Python 3.12, list, dict and set comprehensions are compiled *inline* in the surrounding code instead of as a nested function ([PEP 709](https://peps.python.org/pep-0709/)). The isolation is kept by saving and restoring the loop variable. On 3.12 the same \`dis\` call shows no \`<listcomp>\` code object, and instead instructions such as \`LOAD_FAST_AND_CLEAR 0 (x)\` that save the outer \`x\`. Generator expressions are still separate code objects.

Example 2 prints \`['<listcomp>']\` because the page runs 3.11; on 3.12 the same lines print \`[]\`.

## 7. Verified: Running the Code

Example 1, the forms side by side, printed:

~~~text
[9, 16, 25, 81, 36]
[3, 0, 4, 0, 5, 9, 0, 6]
[1, 2, 3, 4, 5, 6, 9]
{'a': 'avocado', 'b': 'blueberry', 'c': 'cherry'}
{'avocado': 7, 'blueberry': 9}
{3: 'tea', 5: 'cake'}
[1, 2, 3, 4, 5, 6]
[(0, 1), (0, 2), (1, 0), (1, 2)]
[[1, 4], [2, 5], [3, 6]]
dict set
27
~~~

Example 2, scope and evaluation, printed:

~~~text
outer
[46, 84] 84
[0, 1, 2]
NameError: name 'size' is not defined
['<listcomp>']
  computing 0
  computing 1
list built: [0, 1]
generator created, nothing computed yet
  computing 0
first value: 0
~~~

What the output proves:

- The dict comprehension \`{w[0]: w for w in words}\` kept \`'avocado'\` and \`'blueberry'\`: when a key repeats, the last value wins.
- \`outer\` is unchanged, while \`y\` is \`84\` — no leak for loop variables, deliberate leak for \`:=\`.
- The class-body comprehension that used \`size\` outside the first iterable raised \`NameError\`.
- The list comprehension printed both \`computing\` lines **before** \`list built\`; the generator computed nothing until \`next(lazy)\` asked for a value.

## 8. Common Pitfalls

- **Using a comprehension for side effects.** \`[print(x) for x in xs]\` builds a useless list of \`None\`s. Use a \`for\` loop when you are *doing* something rather than *building* something.
- **Putting \`else\` on a filter.** \`[x for x in xs if x > 0 else 0]\` is a \`SyntaxError\`; move the conditional expression to the front.
- **Reading nested \`for\` clauses in the wrong order.** They run left to right, outermost first, like nested loops.
- **Building a giant list just to iterate once.** \`sum([x * x for x in big])\` materialises the whole list; \`sum(x * x for x in big)\` does not.
- **Writing \`{}\` and expecting an empty set.** It is an empty dict; use \`set()\`.
- **Expecting class attributes inside a comprehension in a class body.** Only the first iterable sees them; compute the value outside or pass it in.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A comprehension builds a list, set or dict from an iterable in one expression: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[expr for x in it if cond]</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">()</code> gives a lazy generator expression.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The brackets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> list, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{x}</code> set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{k: v}</code> dict; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> alone is an empty dict, and there is no tuple comprehension.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Filter vs transform:</strong> <span style="color:#f0e2c8;">A trailing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> <strong style="color:#ffca28;">filters</strong>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a if cond else b</code> in front <strong style="color:#ffca28;">transforms</strong> every item. Several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> clauses read left to right like nested loops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope:</strong> <span style="color:#f0e2c8;">The loop variable does not leak, a walrus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:=</code> does, and in a class body only the first iterable sees class names.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. CPython detail:</strong> <span style="color:#f0e2c8;">Up to 3.11 it runs as a hidden <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;listcomp&gt;</code> function using a fast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIST_APPEND</code>; PEP 709 inlined list, dict and set comprehensions in 3.12.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a comprehension faster than a loop with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">append</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually a little, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIST_APPEND</code> is one bytecode instruction while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.append()</code> is a method lookup and call each time. In our 3.11 run on 100,000 items it was 2.38 ms vs 2.68 ms; readability is the main reason to choose it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[size for i in range(2)]</code> fail inside a class body?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Class scopes are not visible to nested scopes. Only the first iterable is evaluated in the class scope; the rest of the comprehension runs in its own scope and cannot see <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>. It still failed on 3.12 and 3.13.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[x for x in it]</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list(x for x in it)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same result. The first is the dedicated list comprehension; the second builds a generator expression and passes it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code>, which costs a generator resume per item: on our 3.11 run with 100,000 items it took 2.04 ms against 0.89 ms for the comprehension.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you flatten a list of lists with a comprehension?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x for row in grid for x in row]</code> — outer loop first, inner loop second, the same order as the nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> statements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a comprehension?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For side effects, for logic with several conditions or more than two levels of nesting, and when you only need to iterate once over huge data, where a generator expression saves memory.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Comprehension** | An expression that builds a collection from an iterable in one step |
| **Generator expression** | The lazy \`( ... for ... )\` form that yields values one at a time |
| **Conditional expression** | \`a if cond else b\`, the inline ternary |
| **Comprehension scope** | Loop variables are local to the comprehension and do not leak |
| **Inlined comprehensions (PEP 709)** | 3.12 change that compiles comprehensions inline instead of as a nested function |

---
**Conclusion:** A comprehension is a compact, declarative way to say "build this collection from that iterable": an output expression, \`for\` clauses read left to right, and optional filters, with the brackets choosing list, set or dict and round brackets giving a lazy generator. It keeps its loop variables to itself (a walrus being the deliberate exception), it is usually a little faster than an append loop because of a dedicated bytecode, and since 3.12 it is compiled inline. The strong answer shows all three kinds, the filter-versus-transform distinction, and the judgement to fall back to a plain loop when the logic stops fitting on one readable line.`,
    examples: [
      {
        label: `List, set, dict and generator comprehensions side by side`,
        code: `nums = [3, -1, 4, -1, 5, 9, -2, 6]

# List: transform + filter
print([n * n for n in nums if n > 0])  # [9, 16, 25, 81, 36]

# A conditional EXPRESSION goes in front; a FILTER goes at the end
print([n if n > 0 else 0 for n in nums])  # [3, 0, 4, 0, 5, 9, 0, 6]

# Set: duplicates collapse (sorted here so the order is fixed)
print(sorted({abs(n) for n in nums}))  # [1, 2, 3, 4, 5, 6, 9]

# Dict: key: value pairs; a repeated key keeps the LAST value
words = ["apple", "avocado", "banana", "blueberry", "cherry"]
print({w[0]: w for w in words})  # {'a': 'avocado', 'b': 'blueberry', 'c': 'cherry'}
print({w: len(w) for w in words if len(w) > 6})  # {'avocado': 7, 'blueberry': 9}

# Invert a dict
prices = {"tea": 3, "cake": 5}
print({v: k for k, v in prices.items()})  # {3: 'tea', 5: 'cake'}

# Several for clauses read left to right, like nested for statements
grid = [[1, 2, 3], [4, 5, 6]]
print([x for row in grid for x in row])  # [1, 2, 3, 4, 5, 6]
print([(r, c) for r in range(2) for c in range(3) if r != c])  # [(0, 1), (0, 2), (1, 0), (1, 2)]

# A comprehension INSIDE a comprehension builds a nested result
print([[row[c] for row in grid] for c in range(3)])  # [[1, 4], [2, 5], [3, 6]]

# Empty braces are a dict; the empty set is set()
print(type({}).__name__, type(set()).__name__)  # dict set

# Generator expression: same syntax in (), lazy, no list built
print(sum(n for n in nums if n > 0))  # 27`,
      },
      {
        label: `Scope rules: no leaking, walrus, class bodies, eager vs lazy`,
        code: `# 1. The loop variable does not leak into the surrounding scope
x = "outer"
squares = [x * x for x in range(4)]
print(x)  # outer

# 2. A walrus (:=) inside a comprehension DOES bind outside it
values = [4, 8, 15, 16, 23, 42]
big = [y for v in values if (y := v * 2) > 40]
print(big, y)  # [46, 84] 84

# 3. Class bodies: only the FIRST iterable can see class-level names
class Config:
    size = 3
    ok = [i for i in range(size)]
    try:
        bad = [size for i in range(2)]
    except NameError as err:
        bad = "NameError: " + str(err)

print(Config.ok)  # [0, 1, 2]
print(Config.bad)

# 4. On CPython 3.11 a comprehension compiles to a hidden function
code = compile("[n * 2 for n in data]", "<demo>", "eval")
nested = [c.co_name for c in code.co_consts if hasattr(c, "co_name")]
print(nested)  # ['<listcomp>']

# 5. A list comprehension runs everything now; a generator waits
def noisy(n):
    print("  computing", n)
    return n

eager = [noisy(n) for n in range(2)]
print("list built:", eager)
lazy = (noisy(n) for n in range(2))
print("generator created, nothing computed yet")
print("first value:", next(lazy))`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you sort with a custom key, and how does sorted differ from sort?`,
    difficulty: "easy",
    seoDescription: `sorted() vs list.sort() in Python: new list vs in place, key functions, reverse, tuple keys, stability, cmp_to_key and common sorting errors.`,
    description: `**Question presented to candidate:**
"Say you have a list of employee records and need them ordered by team, and then by salary from highest to lowest. How would you sort that in Python? And while you are at it — what is the difference between \`sorted()\` and \`list.sort()\`?"

**What a strong answer should cover:**
- \`sorted(iterable)\` returns a **new list** from any iterable; \`list.sort()\` sorts the list **in place**, exists only on lists and returns \`None\`.
- \`key=\` takes a one-argument function, called **once per element**; the elements are ordered by those key values (\`key=len\`, \`key=str.lower\`, \`operator.itemgetter\`, \`lambda\`).
- Tuple keys for multi-level ordering, negating numbers for a descending part, or several passes from the least to the most important key.
- Both are **stable** (equal keys keep their original order), and \`reverse=True\` keeps that stability, unlike reversing the result afterwards.
- Edge cases: mixed types raise \`TypeError\` in Python 3, \`None\` values need a key, old comparison functions go through \`functools.cmp_to_key\`.
- Cost: O(n log n) comparisons in general, about n - 1 on already-ordered input (Timsort finds existing runs).

**Clarifying questions expected:**
- "Do we need to keep the original order of the list?" — decides between \`sorted()\` and \`.sort()\`.
- "How should ties and missing values be ordered?" — decides the key and whether stability matters.

**Code / implementation expected:** Yes — a \`sorted(..., key=...)\` with a tuple key, and a demonstration that \`.sort()\` returns \`None\`.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers — you should know lists, tuples and simple functions.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11; the examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea comes in plain language first. Words an interviewer expects you to know are tagged \`📌 Interview term:\` and defined on the spot; the Quick Glossary at the end lists them all. Every output and comparison count shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A teacher has a pile of exam papers. She can do two different things with it:

1. **Photocopy the pile and arrange the copy** by score. The original pile on her desk stays in the order the students handed in their papers.
2. **Rearrange the pile itself.** No copy, no extra paper, but the hand-in order is gone for good.

That is the whole difference between \`sorted()\` (option 1, a new list) and \`list.sort()\` (option 2, in place). And whichever she picks, she has to decide *what to sort by*: the score, the surname, the class and then the score. That decision is the \`key\`.

## 2. sorted() vs list.sort()

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="sorted builds a new list and leaves the original unchanged">
  <defs>
    <marker id="py04q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">new = sorted(scores)</text>
  <rect class="d-box" x="30" y="70" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="98" text-anchor="middle">scores</text>
  <text class="d-sub" x="130" y="118" text-anchor="middle">[3, 1, 2]</text>
  <path class="d-edge-accent" d="M 234 100 L 424 100" marker-end="url(#py04q4-arrow)"/>
  <text class="d-sub" x="329" y="86" text-anchor="middle">copy, then sort</text>
  <rect class="d-box-accent" x="430" y="70" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="530" y="98" text-anchor="middle">new list</text>
  <text class="d-sub" x="530" y="118" text-anchor="middle">[1, 2, 3]</text>
  <rect class="d-box-muted" x="30" y="170" width="200" height="50" rx="10"/>
  <text class="d-sub" x="130" y="200" text-anchor="middle">scores is still [3, 1, 2]</text>
  <path class="d-edge-dashed" d="M 130 132 L 130 164" marker-end="url(#py04q4-arrow)"/>
</svg>

\`sorted()\` works on any iterable and always hands back a brand-new list.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="list sort rearranges the same list object and returns None">
  <defs>
    <marker id="py04q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="26" text-anchor="middle">result = scores.sort()</text>
  <rect class="d-box" x="30" y="70" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="98" text-anchor="middle">scores before</text>
  <text class="d-sub" x="130" y="118" text-anchor="middle">[3, 1, 2]</text>
  <path class="d-edge-accent" d="M 234 100 L 424 100" marker-end="url(#py04q4-arrow2)"/>
  <text class="d-sub" x="329" y="86" text-anchor="middle">same object</text>
  <rect class="d-box-accent" x="430" y="70" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="530" y="98" text-anchor="middle">scores after</text>
  <text class="d-sub" x="530" y="118" text-anchor="middle">[1, 2, 3]</text>
  <rect class="d-box-muted" x="430" y="170" width="200" height="50" rx="10"/>
  <text class="d-sub" x="530" y="200" text-anchor="middle">result is None</text>
  <path class="d-edge-dashed" d="M 530 132 L 530 164" marker-end="url(#py04q4-arrow2)"/>
</svg>

\`list.sort()\` changes the list you already have and deliberately returns \`None\`, so you cannot mistake it for a copy.

| | \`sorted(iterable)\` | \`list.sort()\` |
| :--- | :--- | :--- |
| Works on | any iterable: list, tuple, string, dict (keys), set, generator | lists only |
| Returns | a **new list** | \`None\` |
| Original | unchanged | reordered in place |
| Extra memory | a new list of n references | no new list (the sort itself may use temporary space) |
| Arguments | \`key=\`, \`reverse=\` (keyword-only) | the same |
| Typical use | you need the original order too, or the input is not a list | you own the list and only need it sorted |

📌 **Interview term: In-place operation** — an operation that changes the object it is called on instead of building a new one. Python's convention is that in-place mutators such as \`list.sort()\`, \`list.append()\` and \`list.reverse()\` return \`None\`.

The classic bug: \`scores = scores.sort()\` — now \`scores\` is \`None\`.

## 3. The key Function

📌 **Interview term: Key function** — a function of one argument passed as \`key=\`. Python calls it once for every element and sorts the elements by the values it returns. The elements themselves are not changed.

Common keys:

| Goal | Key |
| :--- | :--- |
| By length | \`key=len\` |
| Case-insensitive text | \`key=str.lower\` (or \`str.casefold\` for full Unicode folding) |
| By a field of a tuple or a dict | \`key=itemgetter(1)\`, \`key=lambda d: d["age"]\` |
| By an attribute | \`key=attrgetter("salary")\` |
| A dict by its values | \`sorted(d.items(), key=lambda kv: kv[1])\` |
| Numbers stored as strings | \`key=int\` |

📌 **Interview term: Decorate-sort-undecorate** — the old technique of pairing each item with its sort value, sorting the pairs, then stripping the values off. \`key=\` does exactly this internally, which is why the key runs only n times (Example 2 counts it: 5 calls for 5 words) instead of once per comparison.

\`min()\`, \`max()\`, \`heapq.nsmallest\` and \`itertools.groupby\` accept the same kind of \`key\`.

## 4. Sorting by Several Fields

Back to the interview question: team ascending, salary descending.

**Option A — a tuple key.** Tuples compare item by item, so \`(team, -salary)\` sorts by team first and by negative salary (largest salary first) within a team:

~~~python
sorted(staff, key=lambda p: (p[0], -p[1]))
# [('eng', 120), ('eng', 90), ('ops', 95), ('ops', 80)]
~~~

**Option B — several passes, least important key first.** This works even when you cannot negate the field (strings, dates):

~~~python
step1 = sorted(people, key=lambda p: p[0], reverse=True)   # name, descending
step2 = sorted(step1, key=lambda p: p[1])                  # team, ascending
~~~

Option B is only correct because the sort is stable.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order. Python guarantees stability for both \`sorted()\` and \`list.sort()\`. In the second pass above, everyone in \`eng\` is equal on the key, so they keep the name order from the first pass.

\`reverse=True\` is stable too: it reverses the comparison, not the result. Example 2 shows the difference — \`reverse=True\` keeps \`('c', 2)\` before \`('d', 2)\`, while \`sorted(...)[::-1]\` flips the tied items to \`('d', 2)\` first.

## 5. What CPython Does Underneath

CPython sorts with an adaptive merge sort known as Timsort, which looks for **runs** that are already in order (or strictly descending, which it reverses) and merges them. Two consequences you can measure:

- **Only \`<\` is used.** The sort never calls \`>\`, \`==\` or \`<=\` on your objects; a class that defines only \`__lt__\` can be sorted (Example 2's \`Counted\` class).
- **Ordered input is cheap.** For 100 objects Example 2 counted **99** comparisons for ascending input, **99** for strictly descending input, and **539** for a shuffled order (100 log2 100 is about 664). Fully random data costs O(n log n) comparisons; already-ordered data about n - 1.

How the runs are found and merged, and why that gives stability for free, is covered in [how Timsort makes Python's sort fast and stable](/interview-question/how-does-timsort-make-python-s-sort-fast-and-stable).

## 6. Verified: Running the Code

Example 1, everyday sorting, printed:

~~~text
['Cherry', 'Date', 'apple', 'banana']
['banana', 'Cherry', 'apple', 'Date']
['apple', 'banana', 'Cherry', 'Date']
['Date', 'apple', 'banana', 'Cherry']
['banana', 'Cherry', 'apple', 'Date']
None
[1, 2, 3]
['e', 'h', 'l', 'l', 'o']
['a', 'b']
[1, 2, 3]
[4, 3, 2, 1, 0]
[('ink', 3), ('pens', 12), ('paper', 40)]
{'paper': 40, 'pens': 12, 'ink': 3}
[('eng', 120), ('eng', 90), ('ops', 95), ('ops', 80)]
[('ops', 80), ('eng', 90), ('ops', 95), ('eng', 120)]
('eng', 120)
~~~

Example 2, key calls, stability and comparison counts, printed:

~~~text
['fig', 'pear', 'kiwi', 'date', 'apple']
key calls: 5
[('c', 2), ('d', 2), ('b', 1), ('a', 1)]
[('d', 2), ('c', 2), ('a', 1), ('b', 1)]
[('Dee', 'eng'), ('Ann', 'eng'), ('Cy', 'ops'), ('Bob', 'ops')]
ascending input : 99
descending input: 99
mixed input     : 539
~~~

Example 3, the error cases and \`cmp_to_key\`, printed:

~~~text
TypeError: '<' not supported between instances of 'str' and 'int'
[1, 3, '10']
[60, 70, 85, None, None]
9534330
ValueError: list modified during sort
fig banana
~~~

What the output proves:

- \`print(result)\` is \`None\` and \`stack\` is \`[1, 2, 3]\`: \`.sort()\` changed the list and returned nothing.
- \`key calls: 5\` for five words: the key runs once per element, not once per comparison.
- \`['fig', 'pear', 'kiwi', 'date', 'apple']\`: the three 4-letter words kept their input order (stability).
- Sorting \`[3, "10", 1]\` raised \`TypeError: '<' not supported between instances of 'str' and 'int'\`, and \`key=int\` fixed it while keeping the original values in the output (\`[1, 3, '10']\`).
- Changing the list from inside the key made \`list.sort()\` raise \`ValueError: list modified during sort\`. During the sort CPython temporarily empties the list so it can detect this.

## 7. Edge Cases Worth Knowing

- **\`None\` among numbers.** \`None < 1\` is a \`TypeError\`. Push missing values to the end with a tuple key: \`key=lambda s: (s is None, s or 0)\` gives \`[60, 70, 85, None, None]\`.
- **Old comparison functions.** Python 3 dropped the \`cmp=\` argument. Wrap a two-argument comparison function with \`functools.cmp_to_key\`. Example 3 uses it for the "largest number from these parts" puzzle and prints \`9534330\`.
- **Case.** Default string order compares code points, so every uppercase letter comes before every lowercase one (\`'Cherry'\` before \`'apple'\`). Use \`key=str.lower\` or \`str.casefold\`.
- **Sorting a dict.** \`sorted(d)\` returns the sorted **keys** as a list. \`dict(sorted(d.items(), key=...))\` builds a new dict in that order, since dicts keep insertion order.

## 8. Common Pitfalls

- **\`xs = xs.sort()\`** — \`.sort()\` returns \`None\`, so the list is lost. Call \`xs.sort()\` on its own line, or use \`xs = sorted(xs)\`.
- **Calling \`.sort()\` on a tuple, string or dict.** Only lists have it; use \`sorted()\`.
- **Reversing afterwards instead of \`reverse=True\`.** \`sorted(...)[::-1]\` also reverses the order of tied items; \`reverse=True\` keeps them stable.
- **Sorting mixed types.** Python 3 does not order \`int\` against \`str\` or \`None\`; convert in the key.
- **Doing expensive work in a lambda that you could precompute.** The key already runs only once per item, so do not sort with a \`cmp_to_key\` wrapper when a plain key would do: it calls your function on every comparison.
- **Expecting multi-pass sorting to work in the wrong order.** Sort by the least important key first and the most important last.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(iterable)</code> returns a new list from any iterable; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code> reorders the list in place and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=</code> is a one-argument function called <strong style="color:#ffca28;">once per element</strong>; items are ordered by its result, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=str.lower</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=itemgetter(1)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Several fields:</strong> <span style="color:#f0e2c8;">Use a tuple key such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(team, -salary)</code>, or sort in several passes from the least to the most important key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Stability:</strong> <span style="color:#f0e2c8;">Both sorts are stable, so equal keys keep their order; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse=True</code> stays stable, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[::-1]</code> on the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Underneath:</strong> <span style="color:#f0e2c8;">CPython uses Timsort with only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> comparisons: O(n log n) in general, about n - 1 comparisons on already-ordered input.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort descending by a string field but ascending by a number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot negate a string, so use two stable passes: first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(xs, key=number)</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(..., key=text, reverse=True)</code>. The second pass keeps the number order inside equal strings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.sort()</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the Python convention for in-place mutators, so that nobody mistakes the call for one that returns a sorted copy. Chaining like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xs.sort().append(1)</code> fails loudly instead of working on a hidden copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort with an old-style comparison function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(xs, key=functools.cmp_to_key(compare))</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compare(a, b)</code> returns a negative number, zero or a positive number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many times is the key function called?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly once per element. In our run, sorting 5 words with a counting key recorded 5 calls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the list contains <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Comparing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> with a number raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. Use a key such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lambda s: (s is None, s or 0)</code> to put the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> values last.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-place operation** | Changes the existing object instead of creating a new one |
| **Key function** | One-argument function whose result decides the order |
| **Decorate-sort-undecorate** | Pair items with their key, sort, strip the keys; what \`key=\` does |
| **Stable sort** | Equal keys keep their original relative order |

---
**Conclusion:** Use \`sorted()\` when you need a new list or have an iterable that is not a list, and \`list.sort()\` when you want to reorder a list you own; the second returns \`None\` on purpose. Everything else is about the \`key\`: a one-argument function computed once per element, tuple keys for multi-field orders, and stable multiple passes when a field cannot be negated. Knowing that both sorts are stable, that \`reverse=True\` keeps that stability, that Python 3 will not compare mixed types, and that Timsort makes already-ordered data almost free is what turns a correct answer into a strong one.`,
    examples: [
      {
        label: `sorted vs sort, key functions, dict by value, tuple keys`,
        code: `fruits = ["banana", "Cherry", "apple", "Date"]

# sorted(): a NEW list; the original is untouched
print(sorted(fruits))  # ['Cherry', 'Date', 'apple', 'banana']
print(fruits)  # ['banana', 'Cherry', 'apple', 'Date']

# Uppercase letters sort before lowercase; key=str.lower compares case-blind
print(sorted(fruits, key=str.lower))  # ['apple', 'banana', 'Cherry', 'Date']

# key=len, and reverse=True for descending
print(sorted(fruits, key=len))  # ['Date', 'apple', 'banana', 'Cherry']
print(sorted(fruits, key=len, reverse=True))  # ['banana', 'Cherry', 'apple', 'Date']

# list.sort(): sorts IN PLACE and returns None
stack = [3, 1, 2]
result = stack.sort()
print(result)  # None
print(stack)  # [1, 2, 3]

# sorted() takes any iterable and always returns a list
print(sorted("hello"))  # ['e', 'h', 'l', 'l', 'o']
print(sorted({"b": 2, "a": 1}))  # ['a', 'b']
print(sorted((3, 1, 2)))  # [1, 2, 3]
print(sorted(range(5), reverse=True))  # [4, 3, 2, 1, 0]

# Sort a dict by its values
stock = {"pens": 12, "ink": 3, "paper": 40}
print(sorted(stock.items(), key=lambda kv: kv[1]))  # [('ink', 3), ('pens', 12), ('paper', 40)]
print(dict(sorted(stock.items(), key=lambda kv: kv[1], reverse=True)))  # {'paper': 40, 'pens': 12, 'ink': 3}

# Tuple key: team ascending, then salary descending (negate the number)
staff = [("ops", 80), ("eng", 90), ("ops", 95), ("eng", 120)]
print(sorted(staff, key=lambda p: (p[0], -p[1])))  # [('eng', 120), ('eng', 90), ('ops', 95), ('ops', 80)]

# operator.itemgetter is a fast, readable key for "field number N"
from operator import itemgetter
print(sorted(staff, key=itemgetter(1)))  # [('ops', 80), ('eng', 90), ('ops', 95), ('eng', 120)]
print(max(staff, key=itemgetter(1)))  # ('eng', 120)`,
      },
      {
        label: `Key calls, stability, reverse=True and comparison counts`,
        code: `# 1. The key function runs exactly once per element
calls = []

def key_len(word):
    calls.append(word)
    return len(word)

words = ["pear", "fig", "apple", "kiwi", "date"]
print(sorted(words, key=key_len))
print("key calls:", len(calls))

# 2. Stable: pear, kiwi and date all have length 4 and keep their order

# 3. reverse=True stays stable; reversing the result afterwards does not
orders = [("b", 1), ("a", 1), ("c", 2), ("d", 2)]
print(sorted(orders, key=lambda o: o[1], reverse=True))
print(sorted(orders, key=lambda o: o[1])[::-1])

# 4. Multi-pass sorting relies on stability: secondary key FIRST
people = [("Cy", "ops"), ("Ann", "eng"), ("Bob", "ops"), ("Dee", "eng")]
step1 = sorted(people, key=lambda p: p[0], reverse=True)
step2 = sorted(step1, key=lambda p: p[1])
print(step2)

# 5. Count comparisons: already-ordered input is the cheap case
class Counted:
    comparisons = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Counted.comparisons += 1
        return self.v < other.v

def count_for(values):
    Counted.comparisons = 0
    sorted(Counted(v) for v in values)
    return Counted.comparisons

n = 100
print("ascending input :", count_for(range(n)))
print("descending input:", count_for(range(n, 0, -1)))
print("mixed input     :", count_for([(i * 37) % n for i in range(n)]))`,
      },
      {
        label: `Mixed types, None values, cmp_to_key and the modified-list error`,
        code: `from functools import cmp_to_key

# 1. Mixed types cannot be ordered in Python 3
try:
    sorted([3, "10", 1])
except TypeError as err:
    print("TypeError:", err)

# Convert inside the key instead
print(sorted([3, "10", 1], key=int))  # [1, 3, '10']

# 2. None in the data: push it to the end with a tuple key
scores = [70, None, 85, None, 60]
print(sorted(scores, key=lambda s: (s is None, s or 0)))  # [60, 70, 85, None, None]

# 3. Old-style comparison functions: wrap them with cmp_to_key
# Classic puzzle: arrange numbers to form the biggest number
def compare(a, b):
    if a + b > b + a:
        return -1
    if a + b < b + a:
        return 1
    return 0

parts = ["3", "30", "34", "5", "9"]
print("".join(sorted(parts, key=cmp_to_key(compare))))  # 9534330

# 4. list.sort() notices if the list is changed while it sorts
data = [3, 1, 2]

def sneaky(item):
    data.append(0)
    return item

try:
    data.sort(key=sneaky)
except ValueError as err:
    print("ValueError:", err)

# 5. min and max take the same key= argument
words = ["kiwi", "fig", "banana"]
print(min(words, key=len), max(words, key=len))  # fig banana`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does the in operator work in Python?`,
    difficulty: "easy",
    seoDescription: `How Python in works: __contains__, then __iter__, then __getitem__; identity before ==; O(1) for sets and dicts, O(n) for lists; the gotchas.`,
    description: `**Question presented to candidate:**
"When you write \`x in something\`, what does Python actually do? Does it cost the same for a list, a set and a string, and how would you make your own class support \`in\`?"

**What a strong answer should cover:**
- \`x in y\` calls \`type(y).__contains__(y, x)\` when it exists; otherwise Python iterates \`y\` with \`__iter__\`; otherwise it tries the old \`__getitem__\` protocol with indexes 0, 1, 2 ... until \`IndexError\`; otherwise \`TypeError\`.
- The result is always a \`bool\` (whatever \`__contains__\` returns is converted), and \`not in\` is the exact negation; in bytecode both are one \`CONTAINS_OP\` instruction.
- Cost depends on the container: hash lookup, O(1) on average, for \`set\`, \`frozenset\`, \`dict\` and dict key views; a linear O(n) scan for \`list\`, \`tuple\`, \`dict.values()\` and iterators; substring search for \`str\` and \`bytes\`; arithmetic for an \`int\` in a \`range\`.
- Sequences test identity before equality (\`x is e or x == e\`), which is why \`nan in [nan]\` is \`True\`.
- Gotchas: \`in\` on a dict checks keys only; sets need a hashable left operand; \`in\` on an iterator consumes it; a float in a \`range\` falls back to a scan.

**Code / implementation expected:** Optional — a class with \`__contains__\`, or a demonstration of set vs list membership cost.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers — you should know lists, dicts and sets, and roughly what a class is.
**Difficulty:** Easy
**Python version:** Behaviour, error messages and bytecode checked on CPython 3.11; the examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary. Every output, error message and count shown here was printed by a real run.

## 1. Why This Even Matters — A Story First

Two ways to answer "is Priya invited to the party?":

- **The guest list on paper.** You read it from the top until you find Priya or reach the end. Ten guests, fine. Ten thousand guests, slow — and you read the whole list every time someone asks about a person who is not invited.
- **The door with a numbered locker per name.** A rule turns any name into a locker number. To check Priya you open one locker. Ten guests or ten thousand, it is one look.

Python's \`in\` is the question "is it in there?", and the answer to "how fast?" is "it depends which of these two the container is". A list is the paper list; a set or dict is the lockers. Interviewers ask this because turning a list into a set before many membership checks is one of the most common, cheapest performance fixes in real code.

## 2. The Protocol: Who Answers the Question

📌 **Interview term: Membership test** — the expression \`x in y\` (and its negation \`x not in y\`), which returns \`True\` or \`False\`.

📌 **Interview term: \`__contains__\`** — the special method a container defines to answer membership itself: \`y.__contains__(x)\`. It is looked up on the **type**, like other dunder methods (see [dunder methods](/interview-question/what-are-dunder-magic-methods)).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 420" role="img" aria-label="How x in y is answered. First contains, then iter, then getitem with indexes, then TypeError">
  <defs>
    <marker id="py04q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="200" height="44" rx="10"/>
  <text class="d-text" x="350" y="48" text-anchor="middle">x in y</text>
  <path class="d-edge" d="M 350 66 L 350 100" marker-end="url(#py04q5-arrow)"/>
  <rect class="d-box-accent" x="200" y="106" width="300" height="56" rx="10"/>
  <text class="d-text d-accent" x="350" y="130" text-anchor="middle">1. type(y) has __contains__</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">set, dict, str, list, range</text>
  <path class="d-edge" d="M 350 164 L 350 198" marker-end="url(#py04q5-arrow)"/>
  <text class="d-sub" x="400" y="186" text-anchor="middle">no</text>
  <rect class="d-box" x="200" y="204" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="228" text-anchor="middle">2. y has __iter__</text>
  <text class="d-sub" x="350" y="248" text-anchor="middle">scan: item is x or item == x</text>
  <path class="d-edge" d="M 350 262 L 350 296" marker-end="url(#py04q5-arrow)"/>
  <text class="d-sub" x="400" y="284" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="200" y="302" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="326" text-anchor="middle">3. y has __getitem__</text>
  <text class="d-sub" x="350" y="346" text-anchor="middle">try y[0], y[1] ... until IndexError</text>
  <path class="d-edge-dashed" d="M 350 360 L 350 384" marker-end="url(#py04q5-arrow)"/>
  <rect class="d-box-muted" x="250" y="388" width="200" height="28" rx="8"/>
  <text class="d-sub" x="350" y="407" text-anchor="middle">else TypeError</text>
  <rect class="d-box-accent" x="560" y="106" width="120" height="56" rx="10"/>
  <text class="d-text" x="620" y="139" text-anchor="middle">bool(result)</text>
  <path class="d-edge-accent" d="M 502 134 L 554 134" marker-end="url(#py04q5-arrow)"/>
</svg>

Python stops at the first rule that applies. Most built-in containers take the first path. Two common ones do not: \`dict.values()\` and generators define no \`__contains__\` (checked with \`dir()\` on 3.11), so they take the iteration path — which is exactly why they are O(n).

The details, each confirmed in Example 2:

1. If \`type(y)\` defines \`__contains__\`, Python calls it and converts the result with \`bool()\`. A \`__contains__\` returning the string \`"a non-empty string"\` still makes \`in\` give \`True\`.
2. Otherwise, if \`y\` is iterable, Python loops over it and stops at the first item that **is** \`x\` or **equals** \`x\`.
3. Otherwise, if \`y\` has \`__getitem__\`, Python tries \`y[0]\`, \`y[1]\`, ... until \`IndexError\`. In the run, \`OnlyGetitem\` printed \`__getitem__ 0\`, \`1\`, \`2\` and found \`20\` at index 2.
4. Otherwise: \`TypeError: argument of type 'int' is not iterable\` (for \`1 in 5\`).

Setting \`__contains__ = None\` in a class explicitly opts out: \`1 in NotAContainer()\` raised \`TypeError: 'NotAContainer' object is not a container\` although the class could be iterated.

In bytecode, both forms compile to one instruction. CPython 3.11:

~~~text
>>> dis.dis("x in y")
  1           2 LOAD_NAME                0 (x)
              4 LOAD_NAME                1 (y)
              6 CONTAINS_OP              0
>>> dis.dis("x not in y")
  1           2 LOAD_NAME                0 (x)
              4 LOAD_NAME                1 (y)
              6 CONTAINS_OP              1
~~~

The argument \`1\` means "negate", so \`not in\` is not a separate lookup followed by \`not\`; it is the same test with the answer flipped.

## 3. Identity Before Equality

📌 **Interview term: Identity check** — \`a is b\`, "are these the same object?" (see [== vs is](/interview-question/what-is-the-difference-between-and-is)). For lists, tuples and the iteration fallback, membership is defined as \`any(x is e or x == e for e in y)\`.

That explains a famous oddity. \`float("nan")\` is not equal to itself, yet:

~~~python
nan = float("nan")
nan == nan              # False
nan in [nan]            # True  -- same object, identity matches
float("nan") in [nan]   # False -- a different NaN object, and == is False
~~~

It also saves work: in Example 3, looking for an object that is already in the list stopped at position 500 with 500 \`__eq__\` calls, not 501 — the match itself was found by identity.

## 4. What It Costs, Container by Container

| Container | How \`in\` is answered | Average cost |
| :--- | :--- | :--- |
| \`set\`, \`frozenset\` | hash \`x\`, look in that slot, compare a few candidates | O(1) |
| \`dict\`, \`d.keys()\`, \`d.items()\` | hash lookup on the key (\`items()\` then compares the value) | O(1) |
| \`list\`, \`tuple\`, \`collections.deque\` | scan from the start, \`is\` or \`==\` per item | O(n) |
| \`d.values()\` | no \`__contains__\`: the iteration fallback scans all values | O(n) |
| \`str\`, \`bytes\` | **substring** search, not item search | about O(n) for typical text |
| \`range\` with an \`int\` | arithmetic: bounds and step check | O(1) |
| \`range\` with anything else | falls back to scanning every number | O(n) |
| generator or other iterator | scan, **consuming** items | O(n), single use |

📌 **Interview term: Hash table lookup** — sets and dicts store each item in a slot chosen from its hash, so finding it means computing the hash and checking that slot, not walking the whole collection. How the slots and collisions work is in [how a Python set finds items](/interview-question/how-does-a-python-set-find-items). This is also why the left operand must be hashable: \`[1] in {1, 2}\` raised \`TypeError: unhashable type: 'list'\`, while \`[1] in [[1], [2]]\` is fine.

Measured on our run (CPython 3.11, \`timeit\`, best of 5; your numbers will differ):

| Test | Time per check |
| :--- | :--- |
| \`99_999 in\` a 100,000-item list (last item) | 495 µs |
| \`99_999 in\` a 100,000-item set | 19.6 ns |
| \`99_999 in d\` (dict with 100,000 keys) | 23 ns |
| \`99_999 in d.values()\` | 1.02 ms |
| \`10**7 - 1 in range(10**7)\` | 107 ns |
| \`float(10**7 - 1) in range(10**7)\` | 237 ms — the float forces a scan |

Example 3 shows the same thing without a clock, by counting \`__eq__\` calls: finding the last of 1000 items cost **1000** comparisons in the list and **1** in the set; a missing item cost 1000 in the list and **0** in the set (its slot was empty).

## 5. Strings Are Different

📌 **Interview term: Substring test** — for \`str\` (and \`bytes\`), \`in\` asks "does this text appear anywhere inside?", not "is this one of the items?". So \`"ell" in "hello"\` is \`True\`, the empty string is in every string (\`"" in "abc"\` is \`True\`), and a non-string on the left is an error: \`TypeError: 'in <string>' requires string as left operand, not int\`.

## 6. Making Your Own Class Support in

Define \`__contains__\` when you can answer faster or more meaningfully than a scan, for example a geometric range:

~~~python
class Rect:
    def __init__(self, w, h):
        self.w, self.h = w, h

    def __contains__(self, point):
        x, y = point
        return 0 <= x < self.w and 0 <= y < self.h

(3, 4) in Rect(10, 10)    # True, no iteration at all
~~~

If you only define \`__iter__\`, \`in\` still works, but as a linear scan. Inheriting from \`collections.abc.Container\` or \`Collection\` documents the intent (see [abstract base classes and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols)).

## 7. Verified: Running the Code

Example 1, built-in containers, printed:

~~~text
True
True
True
True
True
False
True
True
True
False
True
False
False
True
False
TypeError: unhashable type: 'list'
True
TypeError: 'in <string>' requires string as left operand, not int
~~~

Example 2, the protocol and its fallbacks, printed:

~~~text
WithContains
  __contains__ asked about 20
  result: False
OnlyIter
  __iter__ started
  result: False
OnlyGetitem
  __getitem__ 0
  __getitem__ 1
  __getitem__ 2
  result: True
True
TypeError: 'NotAContainer' object is not a container
TypeError: argument of type 'int' is not iterable
True
[4, 5]
~~~

Example 3, counting \`__eq__\` calls, printed:

~~~text
list, last item : (True, 1000)
list, missing   : (False, 1000)
set, last item  : (True, 1)
set, missing    : (False, 0)
list, same obj  : (True, 500)
set, same obj   : (True, 0)
['read', 'admin', 'write']
~~~

What the output proves:

- \`3 in inventory\` is \`False\` while \`3 in inventory.values()\` is \`True\`: on a dict, \`in\` checks keys only.
- \`10**18 in range(10**19)\` answered instantly — a scan of 10^18 numbers would never finish — while \`5.0 in range(10)\` is \`True\` (by scanning) and \`"5" in range(10)\` is \`False\`.
- \`OnlyIter\` printed \`__iter__ started\` and scanned to the end without finding \`20\`; \`OnlyGetitem\` was probed with indexes 0, 1, 2.
- \`3 in gen\` was \`True\`, and afterwards \`list(gen)\` held only \`[4, 5]\`: the generator lost 0, 1, 2 and 3 to the search.
- \`list, same obj : (True, 500)\` and \`set, same obj : (True, 0)\`: identity matched without calling \`__eq__\`.

## 8. Common Pitfalls

- **Repeated \`in\` on a big list inside a loop.** That is O(n) per check and O(n·m) overall. Build a \`set\` once and test against it.
- **Expecting \`in\` on a dict to look at values.** It checks keys; use \`value in d.values()\` (a scan) or keep a reverse index.
- **Testing membership on a generator you still need.** The search consumes items up to and including the match.
- **Putting unhashable values on the left of a set test.** Lists and dicts raise \`TypeError\`; convert to a tuple or \`frozenset\` if the data allows it.
- **Using floats with \`range\`.** \`5.0 in range(10)\` works, but by scanning; convert to \`int\` first when the value is integral.
- **Defining \`__eq__\` that disagrees with identity.** Lists will still say an object is in them because \`is\` is checked first — the NaN effect, but for your own class.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x in y</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">y.__contains__(x)</code>; if there is none, Python iterates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">y</code>, then tries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__</code> with 0, 1, 2 ..., and otherwise raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cost:</strong> <span style="color:#f0e2c8;">Sets, dicts and dict key views use a hash lookup, O(1) on average; lists, tuples and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.values()</code> scan, O(n); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> does a substring search.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The comparison:</strong> <span style="color:#f0e2c8;">Sequences test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e is x or e == x</code>, identity first, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nan in [nan]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> even though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nan != nan</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The details:</strong> <span style="color:#f0e2c8;">The result is always converted to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not in</code> is the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONTAINS_OP</code> instruction with a negate flag.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> on a dict checks keys, sets need hashable values, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> on a generator consumes it up to the match.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you speed up a loop that checks <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if item in big_list</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Convert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">big_list</code> to a set once before the loop. Each check goes from a scan to a hash lookup; in our count, finding the last of 1000 objects went from 1000 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> calls to 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">float("nan") in [float("nan")]</code> False but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nan in [nan]</code> True?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lists check identity before equality. The second test finds the very same object; the first compares two different NaN objects, and NaN is never equal to anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x in range(n)</code> slow for a large <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code> computes the answer from start, stop and step. For a float or other type it falls back to scanning, which took 237 ms for 10 million numbers in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if my class defines <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__iter__</code> but not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__contains__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> still works by iterating and comparing each item, so it is O(n). Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__contains__</code> when you can answer faster, or set it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> to forbid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"" in "abc"</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. For strings <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> is a substring test, and the empty string is a substring of every string.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Membership test** | \`x in y\` / \`x not in y\`, always returning a bool |
| **\`__contains__\`** | The method a container defines to answer \`in\` itself |
| **Identity check** | \`a is b\`: the same object, tested before \`==\` in sequences |
| **Hash table lookup** | Finding an item by its hash slot instead of scanning |
| **Substring test** | What \`in\` means for \`str\` and \`bytes\` |

---
**Conclusion:** \`in\` is a single protocol with a fixed order — \`__contains__\`, then iteration, then indexed access — and the container decides how much work that is. Sets and dicts answer with a hash lookup, lists and tuples scan item by item using identity first and then \`==\`, strings search for substrings, and integer ranges just do arithmetic. The strong answer names the protocol, the O(1)-versus-O(n) difference and the habit of converting to a set before repeated checks, and adds the traps: dicts check keys, set members must be hashable, and an iterator is consumed by the search.`,
    examples: [
      {
        label: `in on lists, strings, dicts, ranges and sets`,
        code: `# Each container answers "in" in its own way
print(3 in [1, 2, 3])  # True
print(4 not in (1, 2, 3))  # True
print("ell" in "hello")  # True
print("" in "abc")  # True

# dict: "in" checks KEYS; use .values() or .items() for the rest
inventory = {"apple": 3}
print("apple" in inventory)  # True
print(3 in inventory)  # False
print(3 in inventory.values())  # True
print(("apple", 3) in inventory.items())  # True

# range answers integer membership with arithmetic, not a scan
print(10**18 in range(10**19))  # True
print(10**18 + 1 in range(0, 10**19, 2))  # False
print(5.0 in range(10))  # True
print("5" in range(10))  # False

# Lists and tuples check identity FIRST, then ==
nan = float("nan")
print(nan == nan)  # False
print(nan in [nan])  # True
print(float("nan") in [nan])  # False

# Sets and dict keys need a hashable left operand
try:
    [1] in {1, 2}
except TypeError as err:
    print("TypeError:", err)
print([1] in [[1], [2]])  # True

# str requires a str on the left
try:
    1 in "123"
except TypeError as err:
    print("TypeError:", err)`,
      },
      {
        label: `The protocol: __contains__, __iter__, __getitem__ fallbacks`,
        code: `# How Python looks for an answer: __contains__, then __iter__, then __getitem__
class WithContains:
    def __contains__(self, item):
        print("  __contains__ asked about", item)
        return item == 2

class OnlyIter:
    def __iter__(self):
        print("  __iter__ started")
        yield from [1, 2, 3]

class OnlyGetitem:
    def __getitem__(self, index):
        print("  __getitem__", index)
        if index >= 3:
            raise IndexError(index)
        return index * 10

for box in (WithContains(), OnlyIter(), OnlyGetitem()):
    print(type(box).__name__)
    found = 20 in box
    print("  result:", found)

# Whatever __contains__ returns is converted to bool
class Loose:
    def __contains__(self, item):
        return "a non-empty string"

print(1 in Loose())  # True

# __contains__ = None opts out, even if iteration would work
class NotAContainer:
    __contains__ = None

    def __iter__(self):
        return iter([1])

try:
    1 in NotAContainer()
except TypeError as err:
    print("TypeError:", err)

# No protocol at all
try:
    1 in 5
except TypeError as err:
    print("TypeError:", err)

# An iterator is consumed up to (and including) the match
gen = (n for n in range(6))
print(3 in gen)
print(list(gen))`,
      },
      {
        label: `Counting == calls: list scan vs set lookup`,
        code: `# Count the == calls each container makes to answer "in"
class Key:
    eq_calls = 0

    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        Key.eq_calls += 1
        return isinstance(other, Key) and self.v == other.v

    def __hash__(self):
        return hash(self.v)

keys = [Key(i) for i in range(1000)]
key_set = set(keys)

def eq_calls_for(needle, container):
    Key.eq_calls = 0
    found = needle in container
    return found, Key.eq_calls

# An equal but different object: the list compares item by item
print("list, last item :", eq_calls_for(Key(999), keys))
print("list, missing   :", eq_calls_for(Key(5000), keys))
# The set jumps to the hash bucket and compares once
print("set, last item  :", eq_calls_for(Key(999), key_set))
print("set, missing    :", eq_calls_for(Key(5000), key_set))

# The SAME object: identity short-circuits, so __eq__ is skipped at the match
same = keys[500]
print("list, same obj  :", eq_calls_for(same, keys))
print("set, same obj   :", eq_calls_for(same, key_set))

# The practical rule: build a set once, then test many times
allowed = ["read", "write", "admin"]
allowed_set = set(allowed)
requests = ["read", "delete", "admin", "write", "root"]
print([r for r in requests if r in allowed_set])  # ['read', 'admin', 'write']`,
      },
    ],
  },
];

export default augments;
