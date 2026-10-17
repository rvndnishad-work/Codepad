/**
 * PYTHON ULTRA — batch 01: Basics I, types and values. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What are Python's built-in data types?`,
    difficulty: "easy",
    seoDescription: `Python built-in data types explained from zero: numbers, str, list, tuple, dict, set, None, mutability, hashability, with verified Python 3.11 output.`,
    description: `**Question presented to candidate:**
"Python is dynamically typed, but every value still has a type. Walk me through the built-in data types you use day to day, how you would group them, and which of them can change after they are created."

**What a strong answer should cover:**
- The groups: numbers (\`int\`, \`float\`, \`complex\`, \`bool\`), text and binary (\`str\`, \`bytes\`, \`bytearray\`), sequences (\`list\`, \`tuple\`, \`range\`), the mapping \`dict\`, sets (\`set\`, \`frozenset\`) and \`None\` (type \`NoneType\`).
- Which are mutable (\`list\`, \`dict\`, \`set\`, \`bytearray\`) and which are immutable, and why that decides what can be a dict key (hashability).
- Precise behaviour: \`int\` has arbitrary precision, \`float\` is a 64-bit IEEE 754 double (so \`0.1 + 0.2\` is not \`0.3\`), \`bool\` is a subclass of \`int\`, \`/\` always returns a float.
- Dynamic but strong typing: names have no type, objects do, and \`1 + "1"\` raises \`TypeError\` instead of converting.
- A CPython or version detail: \`dict\` keeps insertion order as a language guarantee since 3.7, \`type()\` vs \`isinstance()\`, or the 4300-digit int/str conversion limit.

**Code / implementation expected:** Optional — a few \`type()\` / \`isinstance()\` calls or a short table of literals is enough.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior Python knowledge assumed.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a well-organised kitchen. Flour goes in a jar, eggs in a carton, spices in a rack of small labelled tins, and leftovers in a box with a lid you can open and refill. Each container is good at one job: the egg carton keeps things in a fixed order, the spice rack lets you find "cumin" by its label, and the leftovers box can be emptied and refilled. Try storing soup in the egg carton and you get a mess.

Python's built-in data types are those containers. A number, a piece of text, an ordered list of items, a label-to-value lookup, a bag of unique things, and "nothing at all" each have their own type, each with rules about what you can do with it. Picking the right one is most of what makes Python code short and correct, and interviewers ask this first because every later question (mutability, hashing, \`==\` vs \`is\`, dictionaries) builds on it.

## 2. The Core Idea: Every Value Has a Type

In Python, every value is an **object**: a chunk of memory that knows its own type. You never write the type of a variable; you just assign, and the object carries its type with it.

~~~python
age = 30          # an int object
age = "thirty"    # now the name points at a str object; that is allowed
~~~

📌 **Interview term: Dynamic typing** — a name (variable) has no declared type; it is just a label stuck on an object, and the same name can later point at an object of another type. The type lives on the object, and \`type(obj)\` tells you which one.

📌 **Interview term: Strong typing** — Python refuses to quietly mix unrelated types. \`1 + "1"\` is a \`TypeError\`, not \`2\` and not \`"11"\`. Dynamic and strong are separate axes; Python is both.

📌 **Interview term: Built-in type** — a type that comes with the interpreter and needs no import: \`int\`, \`str\`, \`list\`, \`dict\` and friends. You create most of them with a **literal**.

📌 **Interview term: Literal** — syntax that produces a value directly in your code: \`42\`, \`3.14\`, \`"hi"\`, \`[1, 2]\`, \`(1, 2)\`, \`{"a": 1}\`, \`{1, 2}\`, \`None\`.

The built-ins fall into five families. All of them, like everything in Python, inherit from \`object\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 310" role="img" aria-label="Built-in types grouped into five families under object: numbers, sequences, mapping, sets and the null type">
  <defs>
    <marker id="py01q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="300" y="16" width="160" height="46" rx="10"/>
  <text class="d-text d-accent" x="380" y="45" text-anchor="middle">object</text>
  <path class="d-edge" d="M 380 62 L 80 116" marker-end="url(#py01q1-arrow)"/>
  <path class="d-edge" d="M 380 62 L 230 116" marker-end="url(#py01q1-arrow)"/>
  <path class="d-edge" d="M 380 62 L 380 116" marker-end="url(#py01q1-arrow)"/>
  <path class="d-edge" d="M 380 62 L 530 116" marker-end="url(#py01q1-arrow)"/>
  <path class="d-edge" d="M 380 62 L 680 116" marker-end="url(#py01q1-arrow)"/>
  <rect class="d-box" x="18" y="120" width="124" height="172" rx="10"/>
  <text class="d-text" x="80" y="148" text-anchor="middle">Numbers</text>
  <text class="d-sub" x="80" y="180" text-anchor="middle">int</text>
  <text class="d-sub" x="80" y="206" text-anchor="middle">float</text>
  <text class="d-sub" x="80" y="232" text-anchor="middle">complex</text>
  <text class="d-sub" x="80" y="258" text-anchor="middle">bool</text>
  <rect class="d-box" x="168" y="120" width="124" height="172" rx="10"/>
  <text class="d-text" x="230" y="148" text-anchor="middle">Sequences</text>
  <text class="d-sub" x="230" y="176" text-anchor="middle">str, bytes</text>
  <text class="d-sub d-accent" x="230" y="202" text-anchor="middle">list</text>
  <text class="d-sub" x="230" y="228" text-anchor="middle">tuple, range</text>
  <text class="d-sub d-accent" x="230" y="254" text-anchor="middle">bytearray</text>
  <rect class="d-box" x="318" y="120" width="124" height="172" rx="10"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">Mapping</text>
  <text class="d-sub d-accent" x="380" y="180" text-anchor="middle">dict</text>
  <rect class="d-box" x="468" y="120" width="124" height="172" rx="10"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">Sets</text>
  <text class="d-sub d-accent" x="530" y="180" text-anchor="middle">set</text>
  <text class="d-sub" x="530" y="206" text-anchor="middle">frozenset</text>
  <rect class="d-box-muted" x="618" y="120" width="124" height="172" rx="10"/>
  <text class="d-text" x="680" y="148" text-anchor="middle">Null</text>
  <text class="d-sub" x="680" y="180" text-anchor="middle">NoneType</text>
  <text class="d-sub" x="680" y="206" text-anchor="middle">one value:</text>
  <text class="d-sub" x="680" y="230" text-anchor="middle">None</text>
</svg>

The names drawn in the accent colour (\`list\`, \`bytearray\`, \`dict\`, \`set\`) are the mutable built-ins; every other type in the diagram is immutable.

## 3. The Types, One Family at a Time

| Type | Literal / example | What it holds | Mutable? | Hashable (dict key)? |
| :--- | :--- | :--- | :--- | :--- |
| \`int\` | \`42\`, \`-7\`, \`0xff\` | whole numbers of any size | No | Yes |
| \`float\` | \`3.14\`, \`1e-9\`, \`float("inf")\` | 64-bit binary floating point | No | Yes |
| \`complex\` | \`2 + 3j\` | a real and an imaginary float | No | Yes |
| \`bool\` | \`True\`, \`False\` | the two truth values (a subclass of \`int\`) | No | Yes |
| \`str\` | \`"hi"\`, \`'hi'\` | Unicode text | No | Yes |
| \`bytes\` | \`b"hi"\` | raw bytes, each 0 to 255 | No | Yes |
| \`bytearray\` | \`bytearray(b"hi")\` | raw bytes you can edit | **Yes** | No |
| \`list\` | \`[1, 2]\` | ordered items you can change | **Yes** | No |
| \`tuple\` | \`(1, 2)\`, \`1, 2\` | ordered items, fixed once made | No | Yes, if its items are |
| \`range\` | \`range(3)\` | a lazy sequence of integers | No | Yes |
| \`dict\` | \`{"a": 1}\` | key to value pairs, insertion-ordered | **Yes** | No |
| \`set\` | \`{1, 2}\` | unique hashable items, no order | **Yes** | No |
| \`frozenset\` | \`frozenset({1})\` | a set that cannot change | No | Yes |
| \`NoneType\` | \`None\` | the single "no value" object | No | Yes |

\`{}\` is an empty **dict**, not an empty set; write \`set()\` for that.

### Numbers

- **\`int\`** never overflows. \`2 ** 100\` prints all 31 digits, because CPython stores large integers as a variable-length array of digits.

📌 **Interview term: Arbitrary-precision integer** — an integer type with no fixed bit width; it grows until you run out of memory. Python's \`int\` is one, unlike the 32-bit or 64-bit \`int\` in C or Java.

  There is one modern catch: converting a gigantic \`int\` to or from a *decimal string* is capped at 4300 digits by default, as the fix for the denial-of-service bug CVE-2020-10735 ([LWN](https://lwn.net/Articles/907572/)). Example 1 shows the \`ValueError\` it raises on 3.11. Arithmetic is not limited, only the string conversion, and \`sys.set_int_max_str_digits()\` changes the cap.

- **\`float\`** is a 64-bit binary floating-point number. That is why \`0.1 + 0.2\` prints \`0.30000000000000004\`: neither 0.1 nor 0.2 has an exact binary form. The full story, and when to reach for \`Decimal\` or \`Fraction\`, is in [why 0.1 + 0.2 != 0.3](/interview-question/why-does-0-1-0-2-0-3-in-python-and-when-do-you-use-decimal-or-fraction).

📌 **Interview term: IEEE 754 double** — the standard 64-bit floating-point format used by \`float\`: about 15 to 17 significant decimal digits (\`sys.float_info.dig\` is 15) and a maximum near \`1.8e308\`.

- **\`/\` vs \`//\`**: \`7 / 2\` is \`3.5\` (true division always returns a \`float\`), \`7 // 2\` is \`3\`, and \`-7 // 2\` is \`-4\`, because floor division rounds towards minus infinity, not towards zero.
- **\`bool\`** is a subclass of \`int\`. Its method resolution order, printed in Example 1, is \`(bool, int, object)\`. So \`True + True == 2\` and \`sum([True, False, True])\` counts the True values. What makes a value count as true or false in an \`if\` is its own topic: [falsy values in Python](/interview-question/what-values-are-falsy-in-python).

### Text and binary

- **\`str\`** is an immutable sequence of Unicode code points. There is no separate \`char\` type: \`"hi"[0]\` is the string \`"h"\`.
- **\`bytes\`** is an immutable sequence of small integers (0 to 255): what you read from a file opened in \`"rb"\` mode or a network socket. \`bytearray\` is its mutable twin. The difference between text and bytes, and encoding between them, is covered in [bytes vs str](/interview-question/what-is-the-difference-between-bytes-and-str).

### Sequences

📌 **Interview term: Sequence** — an ordered collection you index by position (\`x[0]\`), slice (\`x[1:3]\`) and measure (\`len(x)\`). \`str\`, \`bytes\`, \`list\`, \`tuple\` and \`range\` are sequences.

- **\`list\`** is the general-purpose, growable array. It stores references to objects, so items may have any types. How it grows is in [how a list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).
- **\`tuple\`** is a fixed-length sequence; it cannot be changed after creation. When to use which: [list vs tuple](/interview-question/what-is-the-difference-between-a-list-and-a-tuple).
- **\`range\`** does not store its numbers; it computes them on demand, so \`range(10**12)\` takes the same small amount of memory as \`range(3)\`.

### Mapping

📌 **Interview term: Mapping** — a collection that looks values up by key instead of by position. \`dict\` is the built-in one.

\`dict\` keeps keys in insertion order. That was formally made part of the language specification in Python 3.7 ([What's New In Python 3.7](https://docs.python.org/3/whatsnew/3.7.html)). How it works under the hood is in [how dictionaries are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered), and the everyday methods in [working with dictionaries](/interview-question/how-do-you-work-with-dictionaries-get-setdefault-items-merging).

### Sets

\`set\` holds unique, hashable items with fast membership tests (\`x in s\`); \`frozenset\` is the immutable version, which can itself be a dict key or live inside another set. See [set operations](/interview-question/what-set-operations-does-python-support).

📌 **Interview term: Hashable** — an object whose hash value never changes during its lifetime and which can be compared with \`==\`. Only hashable objects can be dict keys or set members, because the hash decides where they are stored. The rules a class must follow are in [the hash and eq contract](/interview-question/what-is-the-hash-and-eq-contract).

### None

\`None\` is the one and only instance of \`NoneType\`, used for "no value": a function without \`return\` gives back \`None\`.

📌 **Interview term: Singleton** — a type with exactly one instance. Because there is only ever one \`None\`, you test for it with \`is None\` (see [== vs is](/interview-question/what-is-the-difference-between-and-is)).

## 4. Mutable vs Immutable in One Paragraph

📌 **Interview term: Mutable / immutable** — a mutable object can be changed in place (append to a list, add a key to a dict); an immutable object cannot, so every "change" builds a new object. Among the built-ins, only \`list\`, \`dict\`, \`set\` and \`bytearray\` are mutable. This single property explains aliasing bugs, which types can be dict keys, and why default arguments bite. It has its own page: [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python).

## 5. What CPython Does: Types Are Objects Too

\`type(42)\` returns the class \`int\`, and \`type(int)\` returns \`type\`: classes are themselves objects, created by the metaclass \`type\`. This is why you can pass \`int\` around like any other value (\`map(int, ["1", "2"])\`) and why \`isinstance(x, (int, float))\` works with a tuple of classes.

\`type(x) is int\` checks the exact class; \`isinstance(x, int)\` also accepts subclasses. Since \`bool\` subclasses \`int\`, Example 1 prints \`True\` for \`isinstance(True, int)\` and \`False\` for \`type(True) is int\`.

Two size facts from our 64-bit python3.11 run (they differ on 32-bit builds such as the in-page runtime, which is why they are not in an example): \`sys.getsizeof(1)\` was 28 bytes and \`sys.getsizeof(2 ** 100)\` was 40 bytes. Even a small int is a full object with a reference count, a type pointer and a size field, not a bare machine word.

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — every type, bool as int, big ints, floats, strong typing** prints:

~~~text
int       42
float     3.14
complex   (2+3j)
bool      True
str       'hi'
bytes     b'hi'
list      [1, 2]
tuple     (1, 2)
range     range(0, 3)
dict      {'a': 1}
set       {1, 2}
frozenset frozenset({1})
NoneType  None
(<class 'bool'>, <class 'int'>, <class 'object'>)
True
False
2
1267650600228229401496703205376
1.7976931348623157e+308
0.30000000000000004
3.5 3 -4
TypeError: unsupported operand type(s) for +: 'int' and 'str'
ValueError: Exceeds the limit (4300 digits) for integer string conversion
~~~

**Example 2 — families, hashability and dict keys** prints:

~~~text
str       Sequence hashable
bytes     Sequence hashable
list      Sequence unhashable
tuple     Sequence hashable
range     Sequence hashable
dict      Mapping  unhashable
set       Set      unhashable
frozenset Set      hashable
TypeError: unhashable type: 'list'
{(1, 2): 'tuple key'}
{1: 'bool'}
['b', 'a', 'c']
<class 'type'> <class 'type'>
NoneType
~~~

**What the output shows:**

- \`bool.__mro__\` is \`(bool, int, object)\`, so a bool is an int.
- \`1 + "1"\` raised \`TypeError\` instead of guessing: strong typing.
- The \`collections.abc\` check sorts the containers into Sequence, Mapping and Set, and only the mutable ones (\`list\`, \`dict\`, \`set\`) are unhashable.
- \`{1: "int", 1.0: "float", True: "bool"}\` came out as \`{1: 'bool'}\`: three equal, equally hashed keys are one key. The first key object (\`1\`) is kept, and the last value (\`'bool'\`) wins.

## 7. Edge Cases

- \`{}\` is an empty dict. An empty set is \`set()\`.
- \`(1)\` is just the int \`1\`; a one-item tuple needs a comma: \`(1,)\`.
- \`int("3.5")\` raises \`ValueError\`; convert through \`float\` first, or use \`round\`, depending on what you mean.
- \`round(2.5)\` is \`2\` and \`round(3.5)\` is \`4\` (we ran both): Python rounds halves to the even neighbour, "banker's rounding".
- \`float("nan")\` is a float that is not equal to itself.

## Common Pitfalls

- **Writing \`{}\` for an empty set.** It is a dict, and \`.add()\` then fails with \`AttributeError\`.
- **Using \`type(x) == int\` for type checks.** It rejects subclasses; \`isinstance(x, int)\` is the idiomatic check (and remember it accepts \`True\`).
- **Expecting exact decimal results from \`float\`.** Compare with a tolerance (\`math.isclose\`) or use \`Decimal\` for money.
- **Assuming \`-7 // 2\` is \`-3\`.** Floor division rounds down, so it is \`-4\`; \`int(-7 / 2)\` truncates to \`-3\`.
- **Mixing \`1\`, \`1.0\` and \`True\` as dict keys.** They are the same key, and later values silently overwrite earlier ones.
- **Treating \`str\` and \`bytes\` as interchangeable.** \`"a" == b"a"\` is \`False\` (we ran it); decode or encode explicitly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The groups:</strong> <span style="color:#f0e2c8;">Numbers (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complex</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code>), sequences (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code>), the mapping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, sets (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code>) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Mutability:</strong> <span style="color:#f0e2c8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray</code> change in place; the rest are immutable, which is why only those can be dict keys or set members.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Number details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> has arbitrary precision, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code> is a 64-bit IEEE 754 double so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1 + 0.2</code> prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.30000000000000004</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> is a subclass of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typing model:</strong> <span style="color:#f0e2c8;">Dynamic but strong: names have no type, objects do, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + "1"</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> rather than converting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A detail that impresses:</strong> <span style="color:#f0e2c8;">dicts keep insertion order as a language rule since 3.7, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> collide as one dict key because they are equal and hash the same.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isinstance(True, int)</code> return True?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> subclasses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool.__mro__</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(bool, int, object)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> behave as 1 and 0 in arithmetic, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(flags)</code> counts the True values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(x) is bool</code> if you must tell them apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a maximum int in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No fixed one: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 ** 100</code> prints all 31 digits. The only cap in 3.11 is a safety limit on converting huge ints to and from decimal strings (4300 digits by default, adjustable with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.set_int_max_str_digits()</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type(x) == int</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isinstance(x, int)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type()</code> gives the exact class, so it ignores subclasses; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance()</code> accepts subclasses and tuples of types. Prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance()</code> unless the exact type truly matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a string a sequence of characters, and is there a char type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no char type: indexing a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> gives another <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> of length 1. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> is an immutable sequence of Unicode code points; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code> is the immutable sequence of integers 0 to 255.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which types can be dict keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hashable ones: all the immutable built-ins, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code> only if everything inside is hashable too. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Built-in type** | a type that ships with the interpreter, usable without importing anything |
| **Literal** | syntax that creates a value directly, such as \`42\`, \`"hi"\` or \`[1, 2]\` |
| **Dynamic typing** | names have no declared type; the type belongs to the object |
| **Strong typing** | Python does not silently convert between unrelated types |
| **Arbitrary-precision integer** | an \`int\` that grows to any size memory allows |
| **IEEE 754 double** | the 64-bit binary floating-point format behind \`float\` |
| **Sequence** | ordered collection indexed by position: \`str\`, \`list\`, \`tuple\`, \`range\`, \`bytes\` |
| **Mapping** | collection of key to value pairs: \`dict\` |
| **Hashable** | has a fixed hash value, so it can be a dict key or set member |
| **Mutable / immutable** | can or cannot change in place after creation |
| **Singleton** | a type with exactly one instance, such as \`None\` |

---
**Conclusion:** Python's built-in types come in five families: numbers (\`int\`, \`float\`, \`complex\`, \`bool\`), sequences (\`str\`, \`bytes\`, \`list\`, \`tuple\`, \`range\`), the mapping \`dict\`, sets (\`set\`, \`frozenset\`) and \`None\`. Every value is an object that carries its own type, names carry none, and Python never silently mixes unrelated types. The strong answer adds the details that show real use: only \`list\`, \`dict\`, \`set\` and \`bytearray\` are mutable, which decides what can be a dict key; \`int\` never overflows; \`float\` is an IEEE 754 double; \`bool\` is an \`int\`; and dicts keep insertion order as a language guarantee since 3.7.`,
    examples: [
      { label: `Every built-in type, bool as int, big ints, floats and strong typing`, code: `# Every value has a type; type() tells you which one.
samples = [42, 3.14, 2 + 3j, True, "hi", b"hi", [1, 2], (1, 2),
           range(3), {"a": 1}, {1, 2}, frozenset({1}), None]
for value in samples:
    print(type(value).__name__.ljust(9), repr(value))

# bool is a subclass of int, so True behaves like 1 in arithmetic
print(bool.__mro__)
print(isinstance(True, int))  # True
print(type(True) is int)  # False
print(True + True)  # 2

# int has no fixed size: it grows as big as memory allows
print(2 ** 100)  # 1267650600228229401496703205376

# float is a 64-bit IEEE 754 double, so it has a maximum and rounding error
import sys
print(sys.float_info.max)  # 1.7976931348623157e+308
print(0.1 + 0.2)  # 0.30000000000000004

# / always gives a float, // floors (towards minus infinity)
print(7 / 2, 7 // 2, -7 // 2)  # 3.5 3 -4

# Python is strongly typed: no silent int + str
try:
    1 + "1"
except TypeError as err:
    print("TypeError:", err)

# 3.11 safety limit on decimal int <-> str conversion
try:
    int("9" * 5000)
except ValueError as err:
    print("ValueError:", str(err).split(":")[0])` },
      { label: `Container families, hashability and the 1 / 1.0 / True dict key`, code: `from collections.abc import Hashable, Mapping, Sequence, Set

# Which abstract "family" does each built-in container belong to?
for t in (str, bytes, list, tuple, range, dict, set, frozenset):
    family = ("Sequence" if issubclass(t, Sequence) else
              "Mapping" if issubclass(t, Mapping) else
              "Set" if issubclass(t, Set) else "?")
    print(t.__name__.ljust(9), family.ljust(8), "hashable" if issubclass(t, Hashable) else "unhashable")

# Only hashable values can be dict keys or set members
try:
    {[1, 2]: "list key"}
except TypeError as err:
    print("TypeError:", err)
print({(1, 2): "tuple key"})  # {(1, 2): 'tuple key'}

# 1, 1.0 and True are equal and hash the same, so they are ONE key
keys = {1: "int", 1.0: "float", True: "bool"}
print(keys)  # {1: 'bool'}

# dicts remember insertion order (a language guarantee since 3.7)
d = {"b": 2, "a": 1}
d["c"] = 3
print(list(d))  # ['b', 'a', 'c']

# Types are objects too, and their own type is "type"
print(type(int), type(type))
print(type(None).__name__)  # NoneType` },
    ],
  },
  {
    title: `What are mutable and immutable types in Python?`,
    difficulty: "easy",
    seoDescription: `Mutable vs immutable types in Python explained from zero: aliasing, rebinding vs mutation, += on list vs tuple, hashability, with verified output.`,
    description: `**Question presented to candidate:**
"Python talks a lot about mutable and immutable objects. What does that actually mean, which built-in types fall on each side, and where does the difference cause real bugs?"

**What a strong answer should cover:**
- Mutable objects can change in place (\`list\`, \`dict\`, \`set\`, \`bytearray\`, most class instances); immutable ones cannot (\`int\`, \`float\`, \`bool\`, \`complex\`, \`str\`, \`bytes\`, \`tuple\`, \`frozenset\`, \`range\`, \`None\`), so every "change" builds a new object.
- Assignment binds a name to an object and never copies, so two names can alias one mutable object; rebinding a name is not mutating an object.
- \`+=\` mutates a list in place but rebinds a name for a tuple or int; \`id()\` / \`is\` prove which happened.
- Immutability is shallow: a tuple can hold a list, and is then unhashable; the \`t[0] += [x]\` gotcha both mutates and raises.
- Consequences: hashability and dict keys, functions changing the caller argument, the mutable default argument bug, thread-safety and caching benefits of immutables.

**Code / implementation expected:** Optional — a short snippet showing aliasing and \`+=\` on a list vs a tuple is a strong addition.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior Python knowledge assumed.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a shared whiteboard and a printed poster in an office. Anyone can walk up to the whiteboard and add a line; everyone who looks at it afterwards sees that line, including people who never knew someone edited it. The poster cannot be edited at all. If you want a different poster, you print a new one and hang it in place of the old one, and anyone still holding the old poster sees the old text.

Python objects are either whiteboards (**mutable**) or posters (**immutable**). The surprises people hit in Python — "I changed one list and another one changed too", "my function changed my data", "why can I not use a list as a dict key" — all come from not knowing which kind of object they were holding.

## 2. The Core Idea

📌 **Interview term: Mutable object** — an object whose contents can change after it is created, while it stays the same object. \`list\`, \`dict\`, \`set\`, \`bytearray\` and, by default, instances of your own classes are mutable.

📌 **Interview term: Immutable object** — an object that can never change after creation. Any operation that looks like a change returns a new object instead. \`int\`, \`float\`, \`complex\`, \`bool\`, \`str\`, \`bytes\`, \`tuple\`, \`frozenset\`, \`range\` and \`None\` are immutable.

To see the difference you need one more idea: in Python a variable is a **name** pointing at an object, not a box that holds a value.

📌 **Interview term: Name binding** — \`x = something\` attaches the name \`x\` to an object. It never copies the object. The full model is covered in [Python names and object references](/interview-question/how-does-python-s-name-and-object-reference-model-work).

📌 **Interview term: Identity** — which object a name points at. \`id(x)\` returns a number unique to that object while it is alive, and \`a is b\` is true when both names point at the same object. See [== vs is](/interview-question/what-is-the-difference-between-and-is).

### Mutation: two names, one object

📌 **Interview term: Aliasing** — two or more names pointing at the same object. With a mutable object, a change through one name is visible through every other name.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 200" role="img" aria-label="Aliasing: the names a and b both point at one list object, so b.append(3) is visible through a">
  <defs>
    <marker id="py01q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="100" height="46" rx="10"/>
  <text class="d-text" x="80" y="58" text-anchor="middle">name a</text>
  <rect class="d-box-muted" x="30" y="124" width="100" height="46" rx="10"/>
  <text class="d-text" x="80" y="152" text-anchor="middle">name b</text>
  <path class="d-edge" d="M 130 53 L 336 88" marker-end="url(#py01q2-arrow)"/>
  <path class="d-edge" d="M 130 147 L 336 114" marker-end="url(#py01q2-arrow)"/>
  <rect class="d-box-accent" x="340" y="62" width="230" height="76" rx="10"/>
  <text class="d-text d-accent" x="455" y="94" text-anchor="middle">list object</text>
  <text class="d-sub" x="455" y="120" text-anchor="middle">[1, 2, 3]</text>
</svg>

After \`b = a\`, there is still only one list. \`b.append(3)\` changes that list, so printing \`a\` shows \`[1, 2, 3]\`, and \`a is b\` is \`True\`.

### Rebinding: the name moves, the object stays

📌 **Interview term: Rebinding** — pointing a name at a different object. It never changes the old object, and other names that pointed at the old object keep pointing at it.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 220" role="img" aria-label="Rebinding: y += 1 creates a new int 6 and moves the name y to it, while x still points at the unchanged int 5">
  <defs>
    <marker id="py01q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="100" height="46" rx="10"/>
  <text class="d-text" x="80" y="58" text-anchor="middle">name x</text>
  <rect class="d-box-muted" x="30" y="144" width="100" height="46" rx="10"/>
  <text class="d-text" x="80" y="172" text-anchor="middle">name y</text>
  <rect class="d-box" x="360" y="20" width="200" height="66" rx="10"/>
  <text class="d-text" x="460" y="48" text-anchor="middle">int 5</text>
  <text class="d-sub" x="460" y="72" text-anchor="middle">never changes</text>
  <rect class="d-box-accent" x="360" y="134" width="200" height="66" rx="10"/>
  <text class="d-text d-accent" x="460" y="162" text-anchor="middle">int 6</text>
  <text class="d-sub" x="460" y="186" text-anchor="middle">new object</text>
  <path class="d-edge" d="M 130 53 L 356 53" marker-end="url(#py01q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 130 160 L 356 74"/>
  <path class="d-edge-accent" d="M 130 175 L 356 168" marker-end="url(#py01q2-arrow2)"/>
</svg>

With \`x = 5; y = x; y += 1\`, the int 5 cannot change, so Python builds a new int 6 and moves \`y\` to it (solid accent arrow); the dashed line is where \`y\` pointed before. \`x\` still prints \`5\`.

## 3. The Same Operator Means Two Things

📌 **Interview term: In-place operator** — \`+=\`, \`-=\`, \`|=\` and friends. Python first tries the type's in-place method (\`__iadd__\` for \`+=\`). A list has one, so \`lst += [3]\` extends the same list. An int, str or tuple has none, so Python falls back to \`a = a + b\`: build a new object and rebind.

| Code | Type | What happens | \`old is new\` afterwards |
| :--- | :--- | :--- | :--- |
| \`nums += [3]\` | list | extends the same list in place | \`True\` |
| \`pair += (3,)\` | tuple | builds a new tuple, rebinds \`pair\` | \`False\` |
| \`y += 1\` | int | builds a new int, rebinds \`y\` | \`False\` |
| \`new = new + [3]\` | list | \`+\` always builds a new list | \`False\` |

The last row is the subtle one: for a list, \`a += b\` and \`a = a + b\` are **not** the same thing. Example 1 prints all four cases.

## 4. Immutability Is Shallow

A tuple stores references to other objects. The tuple itself cannot change — you cannot replace an item — but if an item is a mutable list, that list can still change.

📌 **Interview term: Shallow immutability** — the container is fixed, but the objects it refers to may still be mutable. \`(1, [2, 3])\` is a fixed tuple holding a changeable list.

Two consequences, both in Example 2:

1. **Hashability.** A tuple's hash is computed from its items, so a tuple holding a list is unhashable: \`hash((1, [2, 3]))\` raises \`TypeError: unhashable type: 'list'\`.
2. **The \`+=\` gotcha.** \`trap[1] += [4]\` on \`trap = (1, [2, 3])\` raises \`TypeError: 'tuple' object does not support item assignment\` **and** leaves \`trap\` as \`(1, [2, 3, 4])\`. The bytecode explains why. \`dis.dis("t[1] += [4]")\` on python3.11 shows (non-instruction lines trimmed):

~~~text
  1           2 LOAD_NAME                0 (t)
              4 LOAD_CONST               0 (1)
              6 COPY                     2
              8 COPY                     2
             10 BINARY_SUBSCR
             20 LOAD_CONST               1 (4)
             22 BUILD_LIST               1
             24 BINARY_OP               13 (+=)
             28 SWAP                     3
             30 SWAP                     2
             32 STORE_SUBSCR
~~~

\`BINARY_SUBSCR\` fetches the list, \`BINARY_OP 13 (+=)\` calls \`list.__iadd__\` and the list grows in place; only then does \`STORE_SUBSCR\` try to write the result back into the tuple and fail.

📌 **Interview term: Hashable** — an object whose hash value never changes while it is alive. Dicts and sets locate items by hash, so their keys must be hashable. That is the practical reason immutable types matter: you can only key a dict by a value that will not change under it. The rules for your own classes are in [the hash and eq contract](/interview-question/what-is-the-hash-and-eq-contract).

## 5. The Full List, With the Mutable Twin of Each

| Immutable | Mutable counterpart | Notes |
| :--- | :--- | :--- |
| \`tuple\` | \`list\` | see [list vs tuple](/interview-question/what-is-the-difference-between-a-list-and-a-tuple) |
| \`frozenset\` | \`set\` | a \`frozenset\` can be a dict key |
| \`bytes\` | \`bytearray\` | \`b"cat"[0] = 98\` fails, \`bytearray\` allows it |
| \`str\` | none built in | build pieces in a list, then \`"".join(parts)\` |
| \`int\`, \`float\`, \`complex\`, \`bool\` | none | numbers never change; arithmetic returns new numbers |
| \`types.MappingProxyType(d)\` | \`dict\` | a read-only view of a dict (we ran it: assigning raises \`TypeError\`) |
| \`@dataclass(frozen=True)\` instance | normal class instance | assigning a field raises \`FrozenInstanceError\` |

## 6. Where It Bites in Real Code

- **Function arguments.** A function receives a reference to the caller's object. \`seq.append(...)\` inside it changes the caller's list; \`seq = [...]\` only rebinds the local name. The whole story is in [is Python pass-by-value or pass-by-reference?](/interview-question/is-python-pass-by-value-or-pass-by-reference).
- **Default arguments.** \`def f(items=[])\` creates one list when the function is defined and shares it between calls — see [mutable default arguments](/interview-question/why-is-using-a-mutable-default-argument-dangerous).
- **Copies.** \`b = a\` is not a copy. \`a.copy()\`, \`list(a)\` or \`a[:]\` make a shallow copy; nested data needs \`copy.deepcopy\`. See [shallow vs deep copy](/interview-question/what-is-the-difference-between-shallow-and-deep-copy).
- **\`[[0] * 3] * 3\`** builds three references to the same inner list, so setting one cell changes a whole column (we ran it: \`grid[0][0] = 1\` gave \`[[1, 0, 0], [1, 0, 0], [1, 0, 0]]\`). Use \`[[0] * 3 for _ in range(3)]\`.

Immutable objects pay off in return: they are safe to share between functions and threads without copying, they can be cached and reused (CPython does this for small ints, see [why Python caches small integers](/interview-question/why-does-python-cache-small-integers)), and they can be dict keys.

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — aliasing, rebinding and \`+=\` on list vs tuple** prints:

~~~text
[1, 2, 3]
True
5 6
cat CAT
TypeError: 'str' object does not support item assignment
[1, 2, 3] True
(1, 2) False
[1, 2] [1, 2, 3] False
~~~

**Example 2 — shallow immutability, the \`+=\` gotcha, mutable twins, function arguments** prints:

~~~text
(1, [2, 3, 4])
TypeError: unhashable type: 'list'
True
TypeError: 'tuple' object does not support item assignment
(1, [2, 3, 4])
frozenset is a valid key
bytearray(b'bat')
TypeError: 'bytes' object does not support item assignment
[1, 'added']
~~~

**What the output shows:** \`nums_alias is nums\` stayed \`True\` after \`+=\` (in-place), \`pair_alias is pair\` became \`False\` (rebound), and the tuple gotcha printed the \`TypeError\` and then the already-extended \`(1, [2, 3, 4])\`. The last line, \`[1, 'added']\`, shows the function's \`append\` reached the caller while its \`seq = ["rebound"]\` did not.

## Common Pitfalls

- **Thinking \`b = a\` copies.** It creates an alias; mutate through either name and both see it.
- **Assuming \`a += b\` equals \`a = a + b\` for lists.** The first mutates the shared list, the second builds a new one, and aliases notice the difference.
- **Believing a tuple is "deeply" frozen.** It can hold mutable items, and then it is unhashable and can change in content.
- **Building strings with \`+=\` in a long loop.** Each step makes a new string; \`"".join(parts)\` is the standard fix.
- **Mutating a list while iterating over it.** Removing items during a \`for\` loop over the same list skips elements; iterate over a copy or build a new list.
- **Using \`[[0] * n] * m\` for a grid.** All rows are one list object.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A mutable object can change in place; an immutable one cannot, so every "change" builds a new object and rebinds the name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which is which:</strong> <span style="color:#f0e2c8;">Mutable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray</code>, most class instances. Immutable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Names vs objects:</strong> <span style="color:#f0e2c8;">Assignment never copies; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b = a</code> makes an alias, so mutating through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> shows up in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>, while rebinding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> alone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Same operator, two meanings:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> mutates a list in place (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> stays True) but rebinds for a tuple or int (a new object).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">Only immutables are hashable dict keys; immutability is shallow (a tuple holding a list is unhashable); mutable defaults and shared arguments cause the classic bugs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If strings are immutable, how does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s += "x"</code> work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It builds a new string and rebinds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>; the old string is untouched. In a loop that is quadratic in the worst case, so collect parts in a list and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"".join(parts)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">t = (1, [2]); t[1] += [3]</code> both raise and change <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">t</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> first calls the list method <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iadd__</code>, which extends the list in place, then tries to store the result back into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t[1]</code>, and a tuple refuses item assignment. The mutation already happened.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a tuple always hashable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if every item is hashable. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash((1, [2]))</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type: list</code>. Use nested tuples or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code> for keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are instances of my own class mutable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes by default: you can set attributes at any time. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass(frozen=True)</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> when you want an immutable record; a frozen dataclass also gets a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> and can be a dict key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Python pass mutable objects by reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It passes a reference to the object for every type. A function can mutate a mutable argument the caller sees, but rebinding the parameter name never affects the caller.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Mutable object** | can be changed in place after it is created |
| **Immutable object** | cannot change; operations return new objects |
| **Identity** | which object a name points at; \`id(x)\`, compared with \`is\` |
| **Name binding** | assignment attaches a name to an object, never copies it |
| **Aliasing** | two names pointing at the same object |
| **Rebinding** | pointing a name at a different object |
| **In-place operator** | \`+=\` and friends, which mutate when the type supports \`__iadd__\` |
| **Shallow immutability** | the container is fixed, the objects inside may still change |
| **Hashable** | hash never changes, so usable as dict key or set member |

---
**Conclusion:** A mutable object (\`list\`, \`dict\`, \`set\`, \`bytearray\`, ordinary class instances) changes in place and stays the same object; an immutable one (\`int\`, \`float\`, \`bool\`, \`str\`, \`bytes\`, \`tuple\`, \`frozenset\`, \`range\`, \`None\`) never changes, so every apparent change builds a new object and rebinds a name. Because assignment binds names and never copies, mutation is visible through every alias, while rebinding affects only one name. The strong answer then names the consequences: \`+=\` behaves differently for lists and tuples, only hashable (immutable all the way down) values can be dict keys, tuple immutability is shallow, and shared mutable objects are behind the default-argument and function-argument bugs.`,
    examples: [
      { label: `Aliasing vs rebinding, and += on a list vs a tuple`, code: `# Mutable: the object changes, every name pointing at it sees the change
a = [1, 2]
b = a              # b is a second name for the SAME list (an alias)
b.append(3)
print(a)  # [1, 2, 3]
print(a is b)  # True

# Immutable: "changing" it really makes a new object and rebinds the name
x = 5
y = x
y += 1             # builds a new int 6, points y at it; 5 is untouched
print(x, y)  # 5 6

s = "cat"
t = s.upper()      # str methods return NEW strings
print(s, t)  # cat CAT
try:
    s[0] = "b"
except TypeError as err:
    print("TypeError:", err)

# Same operator, different meaning: += mutates a list, rebinds a tuple
nums = [1, 2]
nums_alias = nums
nums += [3]
print(nums_alias, nums_alias is nums)  # [1, 2, 3] True

pair = (1, 2)
pair_alias = pair
pair += (3,)
print(pair_alias, pair_alias is pair)  # (1, 2) False

# But lst = lst + [...] builds a new list even for a mutable type
old = [1, 2]
new = old
new = new + [3]
print(old, new, old is new)  # [1, 2] [1, 2, 3] False` },
      { label: `Shallow immutability, the tuple += gotcha and function arguments`, code: `# Immutable containers hold references; the referenced objects may be mutable
box = (1, [2, 3])
box[1].append(4)          # allowed: we mutate the list, not the tuple
print(box)  # (1, [2, 3, 4])

try:
    hash(box)             # a tuple is only hashable if everything inside is
except TypeError as err:
    print("TypeError:", err)
print(hash((1, 2)) == hash((1, 2)))  # True

# The famous gotcha: += on a list inside a tuple mutates AND raises
trap = (1, [2, 3])
try:
    trap[1] += [4]
except TypeError as err:
    print("TypeError:", err)
print(trap)  # (1, [2, 3, 4])

# Mutable vs immutable twins
fs = frozenset({1, 2})
print({fs: "frozenset is a valid key"}[fs])  # frozenset is a valid key
buf = bytearray(b"cat")
buf[0] = ord("b")
print(buf)  # bytearray(b'bat')
try:
    b"cat"[0] = 98
except TypeError as err:
    print("TypeError:", err)

# Functions get a reference: mutating is visible, rebinding is not
def add_item(seq):
    seq.append("added")   # changes the caller object
    seq = ["rebound"]     # only changes the local name

data = [1]
add_item(data)
print(data)  # [1, 'added']` },
    ],
  },
  {
    title: `What is the difference between a list and a tuple?`,
    difficulty: "easy",
    seoDescription: `List vs tuple in Python explained from zero: mutability, hashability, memory layout, constant folding, namedtuple and when to use each.`,
    description: `**Question presented to candidate:**
"Lists and tuples both hold an ordered sequence of items. What is actually different between them, and how do you decide which one to use?"

**What a strong answer should cover:**
- The core distinction: a \`list\` is mutable (append, insert, remove, assign by index), a \`tuple\` is immutable once created.
- Consequences: a tuple is hashable when its items are, so it can be a dict key or set member; a list never can. Tuple immutability is shallow.
- Intent: a list is a variable-length collection of similar items; a tuple is a fixed-size record whose positions mean something (coordinates, a row, a function returning several values), and \`namedtuple\` names those positions.
- Syntax traps: the comma makes a tuple, so \`(1)\` is an int and \`(1,)\` is a tuple; packing and unpacking.
- CPython detail: a tuple stores its items inline with no spare capacity (smaller), the compiler folds a tuple of constants into one constant, and a list over-allocates so \`append\` is amortised O(1).

**Code / implementation expected:** Optional — a few lines showing mutation, a tuple as a dict key and \`(1,)\` vs \`(1)\`.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior Python knowledge assumed.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). Bytecode names are those of 3.11.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A shopping list on your fridge and the address on an envelope both hold a few items in order. The shopping list changes all week: you add milk, cross off eggs, add bread twice. Nobody cares how long it is. The address is different: it has exactly a house number, a street, a city and a postcode, each position means something specific, and once the letter is posted it must not change. Swapping two lines of an address breaks it.

A \`list\` is the shopping list. A \`tuple\` is the address. Python could have given you one type for both, but making the address unchangeable buys you something real: you can use it as a label to look things up (a dict key), share it without fear that someone edits it, and the interpreter can store it more compactly.

## 2. The Core Difference

📌 **Interview term: list** — an ordered, **mutable** sequence written with square brackets: \`[1, 2, 3]\`. You can append, insert, remove, sort in place and assign by index.

📌 **Interview term: tuple** — an ordered, **immutable** sequence written with commas, usually inside parentheses: \`(1, 2, 3)\` or just \`1, 2, 3\`. Once created, its length and its items (the references it holds) are fixed.

Everything else follows from that one difference. Their public APIs make it plain: a tuple has exactly two methods, \`count\` and \`index\`, while a list has eleven (\`append\`, \`clear\`, \`copy\`, \`count\`, \`extend\`, \`index\`, \`insert\`, \`pop\`, \`remove\`, \`reverse\`, \`sort\`). Example 1 prints both lists. For what each list method does, see [append vs extend vs insert](/interview-question/what-is-the-difference-between-append-extend-and-insert-on-a-list).

| | \`list\` | \`tuple\` |
| :--- | :--- | :--- |
| Syntax | \`[1, 2]\`, \`list(iterable)\` | \`(1, 2)\`, \`1, 2\`, \`(1,)\`, \`tuple(iterable)\` |
| Mutable | Yes | No |
| Hashable (dict key, set member) | Never | Yes, if every item is hashable |
| Public methods | 11 | 2 (\`count\`, \`index\`) |
| Typical meaning | many items of the same kind, count varies | fixed number of fields, each position has a meaning |
| Memory (our 64-bit run, 3 small ints) | 88 bytes | 64 bytes |
| Literal of constants | built at run time (\`BUILD_LIST\`) | one stored constant (\`LOAD_CONST\`) |
| Growing | \`append\` is amortised O(1) | cannot grow; \`t + (x,)\` builds a new tuple, O(n) |

## 3. Consequence 1: Hashability

📌 **Interview term: Hashable** — an object whose hash value never changes while it is alive, which is what dicts and sets need to find keys. A list could change after you used it as a key, so lists are not hashable at all. A tuple is hashable when all its items are.

~~~python
distance = {(0, 0): 0, (3, 4): 5}    # tuple keys: fine
grid_cells = {(row, col) for row in range(2) for col in range(2)}
{["a"]: 1}                          # TypeError: unhashable type: 'list'
~~~

That is the most practical reason to choose a tuple: coordinates, composite keys such as \`(user_id, date)\`, and memoisation keys are tuples.

The immutability is **shallow**: \`(1, [2, 3])\` is a valid tuple whose list can still be appended to, and such a tuple is not hashable. The details, and the famous \`t[1] += [4]\` gotcha, are in [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python).

## 4. Consequence 2: Meaning — Collections vs Records

The idiomatic split is not "small vs large" but "how many and what do positions mean":

- **List:** a variable number of items of the same kind, where position is just order. \`scores = [91, 78, 85]\`, \`names = []\` then \`names.append(...)\` in a loop.
- **Tuple:** a fixed number of fields where position carries meaning. \`point = (3, 4)\`, \`rgb = (255, 128, 0)\`, a database row, or several return values.

📌 **Interview term: Tuple packing and unpacking** — \`t = 1, 2, 3\` packs values into a tuple; \`a, b, c = t\` unpacks it. A function that "returns two values" returns one tuple: \`return total, count\`. More forms (\`a, *rest = ...\`) are in [iterable unpacking](/interview-question/how-does-iterable-unpacking-work).

📌 **Interview term: namedtuple** — \`collections.namedtuple("Point", "x y")\` creates a tuple subclass whose positions also have names, so \`p.x\` and \`p[0]\` are the same item. It is still a tuple: immutable, hashable, unpackable. See [the collections module](/interview-question/what-useful-types-does-the-collections-module-provide) and, for a mutable or richer record, [dataclasses](/interview-question/what-are-dataclasses).

## 5. The Syntax Trap: The Comma Makes the Tuple

Parentheses only group; the **comma** creates a tuple. So \`(1)\` is the int \`1\`, \`(1,)\` is a one-item tuple, and \`()\` is the empty tuple (the one case where parentheses alone are enough). Example 1 prints \`int tuple tuple\` for \`type((1))\`, \`type((1,))\` and \`type(())\`. A stray trailing comma, as in \`x = 5,\`, silently gives you a tuple.

## 6. What CPython Does Differently

### Memory layout

A tuple is one object: a header (reference count, type pointer, size) followed directly by the item slots.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="A tuple of three items is one object: a header followed by three item slots stored inline, with no spare room">
  <rect class="d-box-muted" x="30" y="40" width="200" height="74" rx="8"/>
  <text class="d-text" x="130" y="70" text-anchor="middle">tuple header</text>
  <text class="d-sub" x="130" y="96" text-anchor="middle">refcount, type, size 3</text>
  <rect class="d-box-accent" x="250" y="40" width="110" height="74" rx="8"/>
  <text class="d-text" x="305" y="82" text-anchor="middle">item 0</text>
  <rect class="d-box-accent" x="380" y="40" width="110" height="74" rx="8"/>
  <text class="d-text" x="435" y="82" text-anchor="middle">item 1</text>
  <rect class="d-box-accent" x="510" y="40" width="110" height="74" rx="8"/>
  <text class="d-text" x="565" y="82" text-anchor="middle">item 2</text>
</svg>

A list is a header holding its size, its allocated capacity and a pointer to a separate array of item slots. The array usually has spare room at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="A list is a header object that points to a separate array of item slots, with a spare slot left for future appends">
  <defs>
    <marker id="py01q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="80" rx="8"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">list header</text>
  <text class="d-sub" x="180" y="90" text-anchor="middle">size 3, allocated 4, pointer</text>
  <path class="d-edge" d="M 180 110 L 180 172" marker-end="url(#py01q3-arrow)"/>
  <rect class="d-box-accent" x="30" y="176" width="130" height="64" rx="8"/>
  <text class="d-text" x="95" y="214" text-anchor="middle">item 0</text>
  <rect class="d-box-accent" x="180" y="176" width="130" height="64" rx="8"/>
  <text class="d-text" x="245" y="214" text-anchor="middle">item 1</text>
  <rect class="d-box-accent" x="330" y="176" width="130" height="64" rx="8"/>
  <text class="d-text" x="395" y="214" text-anchor="middle">item 2</text>
  <rect class="d-box-muted" x="480" y="176" width="130" height="64" rx="8"/>
  <text class="d-sub" x="545" y="214" text-anchor="middle">spare slot</text>
</svg>

📌 **Interview term: Over-allocation** — when a list's array is full, CPython allocates a bigger one with extra spare slots, so most \`append\` calls just fill a spare slot. On our 64-bit run, \`sys.getsizeof([1, 2, 3])\` was 88 bytes: the 56 an empty list reports plus 4 slots of 8 bytes, so one slot was spare. \`sys.getsizeof((1, 2, 3))\` was 64 bytes: the 40 an empty tuple reports plus exactly 3 slots. The resize pattern is covered in [how a list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).

📌 **Interview term: Amortised O(1)** — an operation that is occasionally slow (a resize copies the array) but constant time on average over many calls. \`list.append\` is amortised O(1). A tuple cannot grow; \`t + (x,)\` copies everything into a new tuple, O(n).

Both store **references** (8-byte pointers on a 64-bit build), not the items themselves, so a list or tuple can hold any mix of types.

### Constant folding

📌 **Interview term: Constant folding** — the compiler evaluates an expression made only of constants once, at compile time, and stores the result. A tuple of constants is folded into a single ready-made tuple constant; a list cannot be, because each evaluation must produce a new, independently mutable list.

Python 3.11 \`dis.dis\` output (the \`RESUME\` line trimmed):

~~~text
  1           2 LOAD_CONST               0 ((1, 2, 3))
              4 RETURN_VALUE
~~~

for \`(1, 2, 3)\`, and for \`[1, 2, 3]\`:

~~~text
  1           2 BUILD_LIST               0
              4 LOAD_CONST               0 ((1, 2, 3))
              6 LIST_EXTEND              1
              8 RETURN_VALUE
~~~

The list literal is built from the folded tuple each time it runs. That is why, in Example 2, \`make_tuple() is make_tuple()\` is \`True\` (the same stored constant comes back) and \`make_list() is make_list()\` is \`False\`. On our machine, \`timeit\` measured 0.058 s to evaluate \`(1,2,3,4,5)\` ten million times and 0.32 s for \`[1,2,3,4,5]\`; the absolute numbers vary by machine, the gap is the constant folding. Accessing items is the same speed for both, so this is a bonus, not a reason to choose.

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — mutability, methods, the comma, dict keys, size** prints:

~~~text
['Python', 'go', 'rust']
TypeError: 'tuple' object does not support item assignment
['count', 'index']
11
int tuple tuple
(1, 2, 3)
5
TypeError: unhashable type: 'list'
True
False
True
TypeError: can only concatenate list (not "tuple") to list
~~~

**Example 2 — constant folding, conversions, namedtuple** prints:

~~~text
['RESUME', 'LOAD_CONST', 'RETURN_VALUE']
['RESUME', 'BUILD_LIST', 'LOAD_CONST', 'LIST_EXTEND', 'RETURN_VALUE']
True
False
True False
Point(x=3, y=4) 3 4
Point(x=10, y=4)
7
~~~

**What the output shows:** the tuple has only \`count\` and \`index\`; \`(1)\` is an int; a tuple key works and a list key raises \`unhashable type: 'list'\`; a list and a tuple with equal items are not \`==\` (different types) and cannot be concatenated with \`+\`. In Example 2 the opcode lists show \`LOAD_CONST\` alone for the tuple and \`BUILD_LIST\` plus \`LIST_EXTEND\` for the list.

## 8. Edge Cases

- \`[1, 2] == (1, 2)\` is \`False\`: sequences of different types are never equal.
- \`(1, 2) < (1, 3)\` is \`True\`: tuples (and lists) compare item by item, which makes tuples handy sort keys.
- \`tuple(t) is t\` is \`True\` for a tuple — no copy is needed for an immutable object — while \`list(l) is l\` is \`False\`.
- \`t * 3\` and \`t + t\` work on tuples; they build new tuples.
- An empty tuple is falsy, like an empty list.

## Common Pitfalls

- **Forgetting the comma in a one-item tuple.** \`("admin")\` is a string; \`for role in ("admin")\` loops over its letters. Write \`("admin",)\`.
- **A stray trailing comma.** \`total = price * qty,\` makes \`total\` a tuple and breaks later arithmetic.
- **Choosing a tuple "for speed" and then rebuilding it in a loop.** \`t = t + (x,)\` is O(n) per step; use a list and convert once at the end.
- **Assuming a tuple is deeply frozen.** A tuple holding a list can change in content and is unhashable.
- **Using a list as a dict key or set member.** Convert to \`tuple(lst)\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The headline:</strong> <span style="color:#f0e2c8;">Both are ordered sequences; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> is mutable, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code> is immutable once created.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why that matters:</strong> <span style="color:#f0e2c8;">A tuple of hashable items is hashable, so it can be a dict key or set member; a list never can. Tuple immutability is shallow, though.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Intent:</strong> <span style="color:#f0e2c8;">A list is a growing collection of similar things; a tuple is a fixed record whose positions mean something, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x, y)</code> or several return values. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> names the positions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Syntax trap:</strong> <span style="color:#f0e2c8;">The comma makes the tuple: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1)</code> is an int, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1,)</code> is a tuple, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1, 2</code> alone is a tuple.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. CPython detail:</strong> <span style="color:#f0e2c8;">A tuple stores items inline with no spare room, so it is smaller, and a tuple of constants is folded into one constant at compile time; a list over-allocates so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> is amortised O(1).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a tuple faster than a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Creating a tuple of constants is much faster because the compiler stores it as a ready-made constant (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_CONST</code>), while a list literal is built each time (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BUILD_LIST</code>). Indexing and iterating are about the same speed; choose by meaning, not speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a tuple ever change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tuple cannot: no item can be replaced. But an item that is itself mutable, like a list inside it, can change, and such a tuple is unhashable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return several values from a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a tuple, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return total, count</code>, and unpack it at the call site: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total, count = stats(data)</code>. For more than two or three fields, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">namedtuple</code> or dataclass reads better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you convert between them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple(items)</code> to freeze a list before using it as a dict key or sharing it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(t)</code> to get an editable copy. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple(t)</code> on a tuple returns the very same object, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(l)</code> always copies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a list use more memory for the same items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps its items in a separate array plus a size and an allocated count, and it over-allocates spare slots so appends do not resize every time. On our 64-bit run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1, 2, 3)</code> was 64 bytes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code> was 88.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **list** | mutable, ordered, growable sequence: \`[1, 2]\` |
| **tuple** | immutable, ordered, fixed-size sequence: \`(1, 2)\` or \`1, 2\` |
| **Hashable** | hash never changes, so usable as a dict key or set member |
| **Tuple packing / unpacking** | \`t = 1, 2\` builds a tuple; \`a, b = t\` takes it apart |
| **Over-allocation** | a list reserves spare slots so most appends need no resize |
| **Amortised O(1)** | occasionally slow, but constant time on average over many operations |
| **Constant folding** | the compiler computes a constant expression once and stores the result |
| **namedtuple** | a tuple subclass whose positions also have attribute names |
| **Shallow immutability** | the container is fixed, objects inside may still change |

---
**Conclusion:** A list and a tuple are both ordered sequences of references; the list is mutable and growable, the tuple is fixed once created. That one difference makes tuples hashable (when their items are), so they can be dict keys and set members, lets the compiler fold tuple literals into constants, and lets CPython store them inline with no spare capacity, while lists over-allocate so \`append\` stays amortised O(1). Choose by meaning: a list for a varying collection of similar items, a tuple (or \`namedtuple\`) for a fixed record whose positions mean something — and remember that the comma, not the parentheses, makes the tuple.`,
    examples: [
      { label: `Mutability, the two tuple methods, the comma, dict keys and size`, code: `import sys

langs = ["python", "go"]          # list: square brackets, mutable
point = (3, 4)                    # tuple: parentheses (really, the comma)

langs.append("rust")
langs[0] = "Python"
print(langs)  # ['Python', 'go', 'rust']

try:
    point[0] = 99
except TypeError as err:
    print("TypeError:", err)

# The public API says it all: tuple has only two methods
print([m for m in dir(tuple) if not m.startswith("_")])  # ['count', 'index']
print(len([m for m in dir(list) if not m.startswith("_")]))  # 11

# The comma makes the tuple, not the parentheses
print(type((1)).__name__, type((1,)).__name__, type(()).__name__)  # int tuple tuple
packed = 1, 2, 3
print(packed)  # (1, 2, 3)

# Hashable, so a tuple can be a dict key; a list cannot
distance = {(0, 0): 0, (3, 4): 5}
print(distance[point])  # 5
try:
    {["a"]: 1}
except TypeError as err:
    print("TypeError:", err)

# A tuple is smaller: no spare capacity, items stored inline
print(sys.getsizeof((1, 2, 3)) < sys.getsizeof([1, 2, 3]))  # True

# Both compare and concatenate, but only with their own kind
print([1, 2] == (1, 2))  # False
print((1, 2) < (1, 3))  # True
try:
    [1, 2] + (3,)
except TypeError as err:
    print("TypeError:", err)` },
      { label: `Constant folding with dis, conversions and namedtuple`, code: `import dis
from collections import namedtuple

# The compiler folds a tuple of constants into ONE ready-made constant;
# a list literal must be built fresh every time the line runs.
print([i.opname for i in dis.get_instructions("(1, 2, 3)")])
print([i.opname for i in dis.get_instructions("[1, 2, 3]")])

def make_tuple():
    return (1, 2, 3)

def make_list():
    return [1, 2, 3]

print(make_tuple() is make_tuple())  # True
print(make_list() is make_list())  # False

# tuple(t) of a tuple returns the same object; list(l) always copies
t = (1, 2, 3)
l = [1, 2, 3]
print(tuple(t) is t, list(l) is l)  # True False

# namedtuple: a tuple whose positions also have names (a light record)
Point = namedtuple("Point", "x y")
p = Point(3, 4)
print(p, p.x, p[1])  # Point(x=3, y=4) 3 4
print(p._replace(x=10))  # Point(x=10, y=4)
x, y = p                 # unpacking works like any tuple
print(x + y)  # 7` },
    ],
  },
  {
    title: `What values are falsy in Python?`,
    difficulty: "easy",
    seoDescription: `Falsy values in Python explained: None, False, zeros, empty containers, the __bool__ and __len__ protocol, and/or return values, with verified output.`,
    description: `**Question presented to candidate:**
"When you write \`if something:\` in Python, which values count as false? And how does Python decide that for an object of your own class?"

**What a strong answer should cover:**
- The built-in falsy set: \`None\`, \`False\`, numeric zero of any type (\`0\`, \`0.0\`, \`-0.0\`, \`0j\`, \`Decimal(0)\`, \`Fraction(0)\`), and empty containers (\`""\`, \`b""\`, \`()\`, \`[]\`, \`{}\`, \`set()\`, \`frozenset()\`, \`range(0)\`, \`bytearray()\`); everything else is truthy.
- The protocol: \`bool(x)\` calls \`__bool__\` if defined (it must return a real \`bool\`), otherwise \`__len__\` (falsy when it is 0), otherwise the object is truthy.
- Truthy surprises: \`"0"\`, \`"False"\`, \`" "\`, \`[0]\`, \`[[]]\` and \`float("nan")\` are all truthy.
- \`and\` / \`or\` short-circuit and return one of their operands, not \`True\`/\`False\`, which powers \`x or default\`.
- The classic bug: \`if not x:\` treats a legitimate \`0\` or \`""\` as missing; use \`if x is None:\` when absence and emptiness differ.

**Code / implementation expected:** Optional — a quick \`bool()\` table or a small class with \`__bool__\` / \`__len__\`.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior Python knowledge assumed.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); one version-dependent case was checked on 3.12 and 3.13 as noted.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A doorman at a club checks one thing: is the guest list empty or not? He does not care whether it is a printed list, a notebook or a phone screen. An empty notebook means "nobody's coming", a notebook with even one name means "open the door". He also refuses entry to the word "nobody" written on a page — the page is not empty, so to him it is a name.

Python's \`if\` works like that doorman. You can write \`if items:\`, \`if name:\` or \`if count:\` with almost anything, and Python asks the object "are you empty or zero, or not?". That makes code short and readable, but it hides decisions: a stock count of \`0\` and a missing stock count look the same to the doorman, and that is where real bugs come from.

## 2. The Core Idea

📌 **Interview term: Truth value testing** — the rule Python uses to treat any object as true or false. It happens automatically in a **boolean context**.

📌 **Interview term: Boolean context** — anywhere Python needs a yes/no answer: \`if\`, \`elif\`, \`while\`, the operators \`not\`, \`and\`, \`or\`, the conditional expression \`a if cond else b\`, and an explicit \`bool(x)\`.

📌 **Interview term: Truthy / falsy** — a value that behaves like \`True\` (truthy) or like \`False\` (falsy) in a boolean context. Falsy values are not equal to \`False\`; \`None == False\` is \`False\` (we ran it). They just *act* false.

### The complete built-in falsy list

| Group | Falsy values |
| :--- | :--- |
| Constants | \`None\`, \`False\` |
| Zero of any numeric type | \`0\`, \`0.0\`, \`-0.0\`, \`0j\`, \`Decimal(0)\` (also \`Decimal("0.00")\`), \`Fraction(0)\` |
| Empty sequences | \`""\`, \`b""\`, \`()\`, \`[]\`, \`range(0)\` (any empty range, such as \`range(5, 5)\`), \`bytearray()\` |
| Empty collections | \`{}\`, \`set()\`, \`frozenset()\` |

**Everything else is truthy**: every non-zero number, every non-empty container, functions, classes, modules, and instances of your own classes unless they say otherwise. Example 1 checks all 17 values in the table with \`all(not v for v in falsy)\` and gets \`True\`.

### Looks false, is truthy

| Value | Truthy? | Why |
| :--- | :--- | :--- |
| \`"0"\`, \`"False"\`, \`" "\` | Yes | non-empty strings |
| \`[0]\`, \`[[]]\`, \`(None,)\` | Yes | non-empty containers, whatever is inside |
| \`{0: 0}\` | Yes | a dict with one key |
| \`float("nan")\` | Yes | NaN is a non-zero float |
| \`datetime.time(0, 0)\` (midnight) | Yes | since Python 3.5; before that, midnight was falsy ([bpo-13936, via the pylint docs](https://pylint.readthedocs.io/en/v3.3.9/_sources/user_guide/messages/warning/boolean-datetime.rst.txt)) |

## 3. How Python Decides: \`__bool__\`, Then \`__len__\`

For any object, \`bool(x)\` follows the same three-step rule, and the built-in types simply implement it: numbers define \`__bool__\` as "not zero", containers define \`__len__\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 360" role="img" aria-label="How bool of x is decided: use __bool__ if the type defines it, else use __len__ compared with zero, else the object is true">
  <defs>
    <marker id="py01q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="20" width="240" height="46" rx="10"/>
  <text class="d-text" x="160" y="48" text-anchor="middle">if x  or  bool(x)</text>
  <path class="d-edge" d="M 160 66 L 160 102" marker-end="url(#py01q4-arrow)"/>
  <rect class="d-box" x="40" y="106" width="240" height="56" rx="10"/>
  <text class="d-text" x="160" y="139" text-anchor="middle">type defines __bool__ ?</text>
  <path class="d-edge-accent" d="M 280 134 L 396 134" marker-end="url(#py01q4-arrow)"/>
  <text class="d-sub" x="338" y="118" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="400" y="106" width="240" height="56" rx="10"/>
  <text class="d-text" x="520" y="130" text-anchor="middle">use its result</text>
  <text class="d-sub" x="520" y="152" text-anchor="middle">must be True or False</text>
  <path class="d-edge" d="M 160 162 L 160 198" marker-end="url(#py01q4-arrow)"/>
  <text class="d-sub" x="182" y="186" text-anchor="middle">no</text>
  <rect class="d-box" x="40" y="202" width="240" height="56" rx="10"/>
  <text class="d-text" x="160" y="235" text-anchor="middle">type defines __len__ ?</text>
  <path class="d-edge-accent" d="M 280 230 L 396 230" marker-end="url(#py01q4-arrow)"/>
  <text class="d-sub" x="338" y="214" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="400" y="202" width="240" height="56" rx="10"/>
  <text class="d-text" x="520" y="226" text-anchor="middle">falsy if len is 0</text>
  <text class="d-sub" x="520" y="248" text-anchor="middle">len must be 0 or more</text>
  <path class="d-edge" d="M 160 258 L 160 294" marker-end="url(#py01q4-arrow)"/>
  <text class="d-sub" x="182" y="282" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="40" y="298" width="240" height="46" rx="10"/>
  <text class="d-text" x="160" y="326" text-anchor="middle">always truthy</text>
</svg>

The accent arrows are the two methods a class can define; an object whose type defines neither ends up in the bottom box.

📌 **Interview term: \`__bool__\`** — the special (dunder) method Python calls first. It must return exactly \`True\` or \`False\`; returning \`1\` raises \`TypeError: __bool__ should return bool, returned int\`.

📌 **Interview term: \`__len__\`** — the fallback. If there is no \`__bool__\`, the object is falsy when \`len(x)\` is 0. It must return an int that is 0 or more; \`-1\` raises \`ValueError: __len__() should return >= 0\`.

If both are defined, \`__bool__\` wins: Example 2 has an \`Account\` whose \`__len__\` returns 99 but whose \`__bool__\` says \`False\` for a zero balance, and \`bool(Account(0))\` is \`False\`. For more on dunder methods in general, see [dunder (magic) methods](/interview-question/what-are-dunder-magic-methods).

At the bytecode level an \`if\` does not call \`bool()\` by name. On python3.11, \`dis.dis("if x: pass")\` shows \`LOAD_NAME x\` followed by \`POP_JUMP_FORWARD_IF_FALSE\`, and the interpreter performs the truth test inside that jump instruction.

A version note: \`NotImplemented\` (the value comparison methods return to say "I do not know") still counts as true on 3.11, but our 3.11, 3.12 and 3.13 runs all printed \`DeprecationWarning: NotImplemented should not be used in a boolean context\`; it was deprecated in 3.9 and becomes a \`TypeError\` in 3.14 ([Python docs, built-in constants](https://docs.python.org/ko/3.14/builtins/constants.html)).

## 4. \`and\` and \`or\` Return Operands

📌 **Interview term: Short-circuit evaluation** — \`a or b\` stops at the first truthy operand and \`a and b\` stops at the first falsy one; the rest is never evaluated. Crucially, the result is that **operand itself**, not \`True\` or \`False\`.

| Expression | Result | Why |
| :--- | :--- | :--- |
| \`0 or "default"\` | \`'default'\` | \`0\` is falsy, so the second operand is returned |
| \`"" or [] or None\` | \`None\` | all falsy: the last operand is returned |
| \`3 and 4\` | \`4\` | \`3\` is truthy, so the second operand is returned |
| \`[] and 1 / 0\` | \`[]\` | \`[]\` is falsy, so \`1 / 0\` never runs |

That is why \`name = user_input or "anonymous"\` works, and also why it is dangerous: an input of \`0\` or \`""\` gets replaced too.

## 5. The Bug Interviewers Want You to Mention

📌 **Interview term: Sentinel** — a special value, usually \`None\`, that means "nothing was given", distinct from every real value.

~~~python
def label(count=None):
    if not count:          # BUG: 0 is a real count, but it is falsy
        return "unknown"
    return str(count) + " items"
~~~

\`label(0)\` returns \`"unknown"\`. The fix is to test for the sentinel itself: \`if count is None:\`. Use truthiness when "empty" and "missing" mean the same thing (\`if not errors:\`), and an explicit \`is None\` check when zero, an empty string or an empty list is a valid value. Why \`is None\` rather than \`== None\` is explained in [== vs is](/interview-question/what-is-the-difference-between-and-is). The same trap appears with mutable defaults: [mutable default arguments](/interview-question/why-is-using-a-mutable-default-argument-dangerous).

📌 **Interview term: Vacuous truth** — \`all([])\` is \`True\` and \`any([])\` is \`False\`, because "every item is true" holds trivially when there are no items. Guard for empty input when that matters, for example \`if scores and all(s >= 50 for s in scores)\`.

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — the falsy family, truthy look-alikes, and / or** prints:

~~~text
True
17
'0'          True
'False'      True
' '          True
[0]          True
[[]]         True
(None,)      True
{0: 0}       True
nan          True
False False
default
None
4
[]
False True
~~~

**Example 2 — the \`__bool__\` / \`__len__\` protocol and the 0-vs-None bug** prints:

~~~text
False True
False True
True
TypeError: __bool__ should return bool, returned int
ValueError: __len__() should return >= 0
unknown | 0 items | unknown
~~~

**What the output shows:** all 17 falsy values tested false; every look-alike (\`'0'\`, \`'False'\`, \`' '\`, \`[0]\`, \`[[]]\`, \`(None,)\`, \`{0: 0}\`, \`nan\`) printed \`True\`; \`Decimal("0.00")\` and \`range(5, 5)\` are falsy even though they look non-zero. In Example 2, \`__bool__\` beat \`__len__\`, a class with neither was truthy, both protocol violations raised, and the last line puts the buggy and fixed versions side by side: \`unknown | 0 items | unknown\`.

## Common Pitfalls

- **\`if not value:\` when 0 or \`""\` is valid.** Use \`if value is None:\` for "missing".
- **\`x or default\` with valid falsy input.** \`port = config_port or 8080\` silently replaces a configured \`0\`; use \`8080 if config_port is None else config_port\`.
- **Expecting \`"False"\` or \`"0"\` to be falsy.** Strings are falsy only when empty; parse text explicitly.
- **Writing \`if x == True:\` or \`if len(items) == 0:\`.** Write \`if x:\` and \`if not items:\`; PEP 8 recommends using the fact that empty sequences are false ([as quoted by LWN](https://lwn.net/Articles/868490/)).
- **Returning a non-bool from \`__bool__\`.** It raises \`TypeError\`; wrap the expression in \`bool(...)\`.
- **Assuming \`and\` / \`or\` return booleans.** They return an operand; wrap in \`bool()\` if you need a real bool, for example in JSON output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">Every object has a truth value. Falsy: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>, numeric zeros, and empty containers. Everything else is truthy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The full list:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0.0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0j</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal(0)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Fraction(0)</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b""</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(0)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The protocol:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool(x)</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__bool__</code> (must return a bool), else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code> (falsy at 0), else the object is truthy, which is why plain instances are truthy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. and / or:</strong> <span style="color:#f0e2c8;">They short-circuit and return an operand: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 or "default"</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"default"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 and 4</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The bug to mention:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if not count:</code> treats a valid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> as missing; write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if count is None:</code> when zero or empty is a real value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the string <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"False"</code> falsy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only the empty string is falsy; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"False"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">" "</code> are non-empty, so truthy. Parse user input explicitly, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value.lower() in ("false", "0", "no")</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__bool__</code> returns 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: __bool__ should return bool, returned int</code>. It must be exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>. A negative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">any([])</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">all([])</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any([])</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> (no item is true) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all([])</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> (no item is false), the vacuous truth rule. Guard for empty input if that matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if items:</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if len(items) &gt; 0:</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PEP 8 recommends relying on empty sequences being false, it works for any container, and it avoids a function call. Use the explicit form only when the type might be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> and you need to tell the cases apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">float("nan")</code> falsy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, NaN is a non-zero float, so it is truthy, even though it is not equal to anything. Check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.isnan</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Truth value testing** | how Python turns any object into True or False in \`if\`, \`while\`, \`and\`, \`or\`, \`not\` |
| **Truthy / falsy** | an object that acts as True / False in a boolean context |
| **Boolean context** | a place that needs a truth value: \`if\`, \`while\`, \`not\`, \`and\`, \`or\`, \`bool()\` |
| **\`__bool__\`** | dunder method returning the truth value; must return a bool |
| **\`__len__\`** | dunder method used as the fallback: falsy when it returns 0 |
| **Short-circuit evaluation** | \`and\` / \`or\` stop as soon as the result is known |
| **Sentinel** | a special value such as \`None\` that means "no value given" |
| **Vacuous truth** | \`all([])\` is True because no item is false |

---
**Conclusion:** In a boolean context Python treats \`None\`, \`False\`, every numeric zero and every empty container as falsy, and everything else as truthy. The rule behind it is a protocol: \`__bool__\` if the type defines it, otherwise \`__len__\` compared with zero, otherwise true — which is how your own classes join in. \`and\` and \`or\` short-circuit and return an operand, giving the \`x or default\` idiom. The strong answer ends with the trap: truthiness cannot tell a legitimate \`0\`, \`""\` or \`[]\` from a missing value, so test \`is None\` whenever those cases differ.`,
    examples: [
      { label: `The falsy family, truthy look-alikes, and and/or return values`, code: `from decimal import Decimal
from fractions import Fraction

# The complete built-in falsy family: constants, zeros, empties
falsy = [None, False, 0, 0.0, -0.0, 0j, Decimal(0), Fraction(0),
         "", b"", (), [], {}, set(), frozenset(), range(0), bytearray()]
print(all(not v for v in falsy))  # True
print(len(falsy))  # 17

# Things that LOOK empty or false but are truthy
looks_false = ["0", "False", " ", [0], [[]], (None,), {0: 0}, float("nan")]
for v in looks_false:
    print(repr(v).ljust(12), bool(v))

# Things that look non-zero but are falsy
print(bool(Decimal("0.00")), bool(range(5, 5)))  # False False

# and / or return one of their OPERANDS, not True/False
print(0 or "default")  # default
print("" or [] or None)  # None
print(3 and 4)  # 4
print([] and 1 / 0)  # []

# Empty input edge case of any() and all()
print(any([]), all([]))  # False True` },
      { label: `The __bool__ / __len__ protocol and the 0-vs-None bug`, code: `# How bool(x) decides: __bool__ first, then __len__, else True.
class Basket:
    def __init__(self, items):
        self.items = items
    def __len__(self):
        return len(self.items)

print(bool(Basket([])), bool(Basket(["egg"])))  # False True

class Account:
    def __init__(self, balance):
        self.balance = balance
    def __bool__(self):              # wins over __len__ if both exist
        return self.balance > 0
    def __len__(self):
        return 99

print(bool(Account(0)), bool(Account(10)))  # False True

class Plain:
    pass

print(bool(Plain()))  # True

# __bool__ must return a real bool, __len__ a non-negative int
class BadBool:
    def __bool__(self):
        return 1
try:
    bool(BadBool())
except TypeError as err:
    print("TypeError:", err)

class BadLen:
    def __len__(self):
        return -1
try:
    bool(BadLen())
except ValueError as err:
    print("ValueError:", err)

# The classic bug: treating a valid 0 as "missing"
def label_buggy(count=None):
    if not count:
        return "unknown"
    return str(count) + " items"

def label_fixed(count=None):
    if count is None:
        return "unknown"
    return str(count) + " items"

print(label_buggy(0), "|", label_fixed(0), "|", label_fixed())  # unknown | 0 items | unknown` },
    ],
  },
  {
    title: `What is the difference between '==' and 'is'?`,
    difficulty: "easy",
    seoDescription: `== vs is in Python explained: value equality vs identity, __eq__, why is None, small-int caching, interning, NaN in containers, with verified output.`,
    description: `**Question presented to candidate:**
"In Python you can compare two things with \`==\` or with \`is\`. What is the difference, when do you use each, and why does \`is\` sometimes seem to work for numbers and strings?"

**What a strong answer should cover:**
- \`==\` tests value equality by calling \`__eq__\` (so a class can define it); \`is\` tests identity, whether both names point at the same object, and cannot be overridden.
- The rule: use \`==\` for values and \`is\` only for singletons and sentinels, above all \`x is None\` (also \`is True\` / \`is False\` in rare cases, \`is NotImplemented\`, custom sentinels).
- Why \`is\` "works" by accident: CPython caches small ints (-5 to 256), interns some strings and shares equal constants within one compiled unit, so results depend on how the value was made. Python 3.8+ warns with \`SyntaxWarning\` for \`is\` against a literal.
- Equality protocol details: \`__eq__\` can return \`NotImplemented\` and Python then tries the other operand, falling back to identity; without \`__eq__\`, \`==\` is identity.
- The NaN edge case: \`nan == nan\` is False, but \`[nan] == [nan]\` and \`nan in [nan]\` are True because containers check identity first.

**Code / implementation expected:** Optional — two equal lists showing \`==\` True and \`is\` False, and \`x is None\`.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior Python knowledge assumed.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); the warning text was also checked on 3.12.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two people walk into a café wearing the same jacket: same brand, same size, same colour. Are they wearing "the same jacket"? In one sense yes — the jackets are equal. In another sense no — there are two jackets, and if one person spills coffee on theirs, the other jacket stays clean.

Python gives you a separate operator for each meaning. \`==\` asks "are these jackets alike?" and \`is\` asks "is this literally one jacket?". Mixing them up gives code that passes every test on your laptop and then fails on a number one larger, or on a string read from a file — which is exactly why interviewers ask.

## 2. The Core Idea

📌 **Interview term: Value equality** — two objects represent the same value. Tested with \`==\` (and \`!=\`). What "the same value" means is decided by the type, through its \`__eq__\` method.

📌 **Interview term: Identity** — two names refer to the very same object in memory. Tested with \`is\` (and \`is not\`). It cannot be customised: no dunder method exists for it.

📌 **Interview term: \`id()\`** — returns an integer that is unique to an object while it is alive (in CPython, its memory address). \`a is b\` is the same question as \`id(a) == id(b)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Names a and c point at one list object, name b points at a second list with equal contents, so a == b is true but a is b is false">
  <defs>
    <marker id="py01q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="24" width="100" height="44" rx="10"/>
  <text class="d-text" x="80" y="51" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="30" y="108" width="100" height="44" rx="10"/>
  <text class="d-text" x="80" y="135" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="30" y="200" width="100" height="44" rx="10"/>
  <text class="d-text" x="80" y="227" text-anchor="middle">b</text>
  <path class="d-edge-accent" d="M 130 46 L 376 70" marker-end="url(#py01q5-arrow)"/>
  <path class="d-edge-accent" d="M 130 130 L 376 98" marker-end="url(#py01q5-arrow)"/>
  <path class="d-edge" d="M 130 222 L 376 222" marker-end="url(#py01q5-arrow)"/>
  <rect class="d-box-accent" x="380" y="40" width="230" height="80" rx="10"/>
  <text class="d-text d-accent" x="495" y="74" text-anchor="middle">list [1, 2, 3]</text>
  <text class="d-sub" x="495" y="100" text-anchor="middle">object one</text>
  <rect class="d-box" x="380" y="186" width="230" height="72" rx="10"/>
  <text class="d-text" x="495" y="216" text-anchor="middle">list [1, 2, 3]</text>
  <text class="d-sub" x="495" y="240" text-anchor="middle">object two</text>
</svg>

\`a\` and \`c\` are two names for object one (accent arrows), so \`a is c\` is \`True\`. \`b\` names object two, a separate list with equal contents, so \`a == b\` is \`True\` but \`a is b\` is \`False\`. How names attach to objects in general is in [Python names and object references](/interview-question/how-does-python-s-name-and-object-reference-model-work).

| | \`==\` | \`is\` |
| :--- | :--- | :--- |
| Question it asks | same value? | same object? |
| Customisable | yes, via \`__eq__\` (and \`__ne__\` for \`!=\`) | no |
| Can run your code | yes, \`__eq__\` is a normal method | no, it is a pointer comparison |
| Python 3.11 bytecode | \`COMPARE_OP\` (\`==\`) | \`IS_OP\` (\`IS_OP 1\` for \`is not\`) |
| Use it for | numbers, strings, lists, dicts, any value | \`None\`, other singletons, sentinels |

## 3. How \`==\` Actually Works

📌 **Interview term: \`__eq__\`** — the method \`a == b\` calls. It returns \`True\`, \`False\`, or the special value \`NotImplemented\` meaning "I do not know how to compare with that type".

The steps, which we confirmed with two classes that print when their \`__eq__\` runs:

1. Python calls \`a.__eq__(b)\` (if \`b\`'s type is a subclass of \`a\`'s, its method is tried first).
2. If that returns \`NotImplemented\`, Python tries the reflected \`b.__eq__(a)\`.
3. If both return \`NotImplemented\`, Python falls back to identity: \`a is b\`.

📌 **Interview term: Reflected operation** — the retry with the operands swapped. In our run, \`A() == B()\` printed \`A.__eq__\`, then \`B.__eq__\`, then \`True\`.

Two consequences:

- A class with no \`__eq__\` inherits \`object.__eq__\`, which is identity: \`Plain() == Plain()\` is \`False\` and \`p == p\` is \`True\` (Example 1).
- \`!=\` calls \`__ne__\`, and by default \`__ne__\` inverts the result of \`__eq__\`, so defining \`__eq__\` alone is enough. Defining \`__eq__\` also has a hashing side effect (the class becomes unhashable unless you define \`__hash__\`), covered in [the hash and eq contract](/interview-question/what-is-the-hash-and-eq-contract).

## 4. When to Use \`is\`

📌 **Interview term: Singleton** — a type with exactly one instance. \`None\`, \`NotImplemented\` and \`Ellipsis\` are singletons, and \`True\` and \`False\` are the only two \`bool\` objects. For these, identity *is* the question.

📌 **Interview term: Sentinel** — a unique object that means "no value was given", used when \`None\` is itself a valid value: \`_MISSING = object()\`, then \`if arg is _MISSING:\`.

- \`x is None\` / \`x is not None\` — always, never \`== None\`. Example 1 has a class whose \`__eq__\` returns \`True\` for everything: \`weird == None\` is \`True\`, \`weird is None\` is \`False\`. The same advice is in the falsy-values page, because \`if not x:\` is the other common wrong way to test for \`None\`: [falsy values in Python](/interview-question/what-values-are-falsy-in-python).
- \`result is NotImplemented\` inside operator methods.
- \`x is True\` only when you must reject \`1\` and other truthy values; usually plain \`if x:\` is right.

Write \`x is not y\`, not \`not x is y\`. Both compile to the same thing, but \`is not\` is one operator and reads correctly.

## 5. Why \`is\` Seems to Work for Numbers and Strings

This is the trap. Equal immutable values are *sometimes* the same object, for reasons that are CPython implementation details:

📌 **Interview term: Small-integer cache** — CPython creates one object for each int from -5 to 256 at start-up and reuses it. \`int("256") is int("256")\` is \`True\`; \`int("257") is int("257")\` is \`False\` (Example 2). In our run, \`int("-5") is int("-5")\` was \`True\` and \`int("-6") is int("-6")\` was \`False\`, confirming the range. The why is in [why Python caches small integers](/interview-question/why-does-python-cache-small-integers).

**Constant sharing.** When the compiler compiles one unit (a file, a function, or one REPL entry), equal constants are stored once. So in a script, \`p = 257; q = 257; p is q\` is \`True\`, while two separate REPL lines give \`False\`. Example 2 reproduces this with \`exec\`: two separately compiled statements gave \`False\`; one compiled block gave \`True\`.

📌 **Interview term: Interning** — reusing one object for equal strings. The compiler interns many identifier-like string constants, and \`sys.intern()\` does it on request, but a string built at run time (\`"".join(["hel", "lo"])\`) is a new object: \`==\` is \`True\`, \`is\` is \`False\`. See [string interning](/interview-question/what-is-string-interning-in-python).

Because the result depends on how a value was created, \`is\` on numbers or strings is a latent bug. Since Python 3.8, the compiler warns about it when one side is a literal ([Adam Johnson on the 3.8 change](https://adamj.eu/tech/2020/01/21/why-does-python-3-8-syntaxwarning-for-is-literal/)). Our runs of a file containing \`print(x is 1000)\` wrote this to stderr:

~~~text
SyntaxWarning: "is" with a literal. Did you mean "=="?
~~~

on python3.11, and \`SyntaxWarning: "is" with 'int' literal. Did you mean "=="?\` on python3.12. (The examples on this page avoid literal \`is\` comparisons so they run without warnings.)

## 6. The NaN Edge Case: Containers Check Identity First

\`float("nan")\` is not equal to anything, including itself: \`nan == nan\` is \`False\`. Yet:

- \`[nan] == [nan]\` is \`True\` when both lists hold the **same** NaN object,
- \`nan in [nan]\` is \`True\`,
- \`[float("nan")] == [float("nan")]\` is \`False\` (two different NaN objects).

List comparison and the \`in\` operator compare each pair with "\`x is y\` or \`x == y\`": identity first, then equality. That shortcut is faster and also means a container always treats an object as equal to itself. The full \`in\` story is in [how the in operator works](/interview-question/how-does-the-in-operator-work-in-python).

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — value vs identity, \`__eq__\`, \`is None\`, NaN** prints:

~~~text
True False
True True
True
True
False
False
True False
True False
True True
False
True True
False
~~~

**Example 2 — int caching, constant sharing, interning, singletons, bytecode** prints:

~~~text
True
True False
False
True
True False
True
True
True
IS_OP
COMPARE_OP
~~~

**What the output shows:** two equal lists are \`==\` but not \`is\`; \`Money(500) == Money(500)\` is \`True\` through \`__eq__\` while \`Money(500) == 500\` falls back to identity and is \`False\`; an always-equal object fools \`== None\` but not \`is None\`; and the NaN lines show the identity shortcut. In Example 2, 256 is cached and 257 is not, the two \`exec\` runs show constant sharing, and the opcode names confirm \`is\` compiles to \`IS_OP\` and \`==\` to \`COMPARE_OP\`.

## Common Pitfalls

- **Comparing numbers or strings with \`is\`.** It passes for small values or constants in one file and fails for values computed at run time.
- **Writing \`x == None\`.** A custom \`__eq__\` can make it lie; use \`x is None\`.
- **Using \`if not x:\` to mean "x is None".** It also catches \`0\`, \`""\` and \`[]\`.
- **Expecting \`nan == nan\`.** Use \`math.isnan(x)\`; and know that containers holding the same NaN object still compare equal.
- **Defining \`__eq__\` without thinking about \`__hash__\`.** The class becomes unhashable; define \`__hash__\` from the same fields if instances are immutable.
- **Comparing types with \`==\` when you mean the exact class.** \`type(x) is int\` is the identity check; usually \`isinstance\` is better.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Value vs identity:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> asks "do these have the same value?" and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> asks "are these the same object?" and cannot be overridden.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Example:</strong> <span style="color:#f0e2c8;">Two separately built lists <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code> are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>; after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c = a</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a is c</code> is True.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rule:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> for values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> for singletons and sentinels: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x is None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x is not None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result is NotImplemented</code>, a private sentinel object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why is lies for numbers:</strong> <span style="color:#f0e2c8;">CPython caches ints from -5 to 256 and shares equal constants within one compiled unit, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> on numbers or strings depends on how they were created; 3.8+ even warns with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxWarning</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The edge case:</strong> <span style="color:#f0e2c8;">NaN is not equal to itself, yet <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[nan] == [nan]</code> is True because list comparison and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> check identity before calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x is None</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x == None</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> is a singleton, so identity is the exact question. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>, which a class can override to return True for anything; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> cannot be fooled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a = 256; b = 256; a is b</code> give True but 257 sometimes does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CPython keeps one cached object for each int from -5 to 256. Larger ints made at run time, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int("257")</code>, are separate objects. Typed on one line or in one file, the compiler may share the constant and make it True again, so never rely on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> do when a class has no <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__eq__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It inherits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__eq__</code>, which compares identity, so two instances are equal only if they are the same object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__eq__</code> returns <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NotImplemented</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python tries the reflected <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> of the other operand; if that also returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code>, it falls back to identity. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Money(500) == 500</code> is simply False instead of an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">is</code> faster than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a pointer comparison and never calls Python code, so it is cheap, but that is not a reason to use it for values; correctness decides. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> only when you mean identity.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Value equality** | two objects represent the same value; tested with \`==\` |
| **Identity** | two names refer to the very same object; tested with \`is\` |
| **\`id()\`** | an integer unique to an object for its lifetime |
| **\`__eq__\`** | the method \`==\` calls; may return \`NotImplemented\` |
| **Reflected operation** | Python retrying \`b.__eq__(a)\` after \`a.__eq__(b)\` gives \`NotImplemented\` |
| **Singleton** | a type with one instance: \`None\`, \`NotImplemented\`, \`Ellipsis\`; True and False are the only two bools |
| **Sentinel** | a unique object used to mean "no value given", compared with \`is\` |
| **Small-integer cache** | CPython pre-made int objects for -5 to 256 |
| **Interning** | reusing one object for equal strings, by the compiler or \`sys.intern\` |

---
**Conclusion:** \`==\` compares values by calling \`__eq__\`, with a reflected retry and an identity fallback; \`is\` compares identity, cannot be overridden and never runs your code. Use \`==\` for every value comparison and keep \`is\` for singletons and sentinels, above all \`x is None\`. The interview-winning detail is why \`is\` sometimes appears to work for numbers and strings — the small-integer cache, constant sharing within one compiled unit, and string interning — and why that makes it a bug, which Python 3.8+ flags with a \`SyntaxWarning\`. Finish with the NaN case to show you know containers check identity before equality.`,
    examples: [
      { label: `Value vs identity, __eq__, why is None, and NaN in containers`, code: `# == asks "same value?", is asks "same object?"
a = [1, 2, 3]
b = [1, 2, 3]          # an equal but separate list
c = a                  # a second name for the first list
print(a == b, a is b)  # True False
print(a == c, a is c)  # True True
print(id(a) == id(c))  # True

# == runs __eq__, so a class decides what "equal" means
class Money:
    def __init__(self, cents):
        self.cents = cents
    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.cents == other.cents

print(Money(500) == Money(500))  # True
print(Money(500) is Money(500))  # False
print(Money(500) == 500)  # False

# Without __eq__, == falls back to identity
class Plain:
    pass
p = Plain()
print(p == p, Plain() == Plain())  # True False

# Why "is None" and not "== None": __eq__ can lie, is cannot
class AlwaysEqual:
    def __eq__(self, other):
        return True
weird = AlwaysEqual()
print(weird == None, weird is None)  # True False

# Equal values of different types are still different objects
print(1 == 1.0, True == 1)  # True True

# NaN is not equal to itself, but containers check identity first
nan = float("nan")
print(nan == nan)  # False
print([nan] == [nan], nan in [nan])  # True True
print([float("nan")] == [float("nan")])  # False` },
      { label: `Small-int cache, constant sharing, interning and the bytecode`, code: `# Integers made at run time: CPython caches -5..256, so is "works" there
small_1 = int("256")
small_2 = int("256")
print(small_1 is small_2)  # True

big_1 = int("257")
big_2 = int("257")
print(big_1 == big_2, big_1 is big_2)  # True False

# Two separately compiled statements (like two lines typed in the REPL)
ns = {}
exec("r1 = 1000", ns)
exec("r2 = 1000", ns)
print(ns["r1"] is ns["r2"])  # False

# One compiled unit: the compiler shares the equal constant, so is is True
exec("s1 = 1000\\ns2 = 1000", ns)
print(ns["s1"] is ns["s2"])  # True

# Strings: equal text, but built at run time it is a different object
import sys
word = "hello"
built = "".join(["hel", "lo"])
print(word == built, word is built)  # True False
print(sys.intern(built) is word)  # True

# Singletons: there is exactly one None, True, False, Ellipsis
print(type(None)() is None)  # True
print(bool(1) is True)  # True

# is compiles to its own opcode, == to a comparison
import dis
print([i.opname for i in dis.get_instructions("x is y")][-2])  # IS_OP
print([i.opname for i in dis.get_instructions("x == y")][-2])  # COMPARE_OP` },
    ],
  },
];

export default augments;
