/**
 * PYTHON ULTRA — batch 03: Basics III, strings and collections — string methods, slicing,
 * list append/extend/insert, dictionary methods and merging, set operations. Every example was
 * run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are common useful string methods?",
    difficulty: "easy",
    seoDescription: "Python string methods explained: strip, split, join, find vs index, casefold, removeprefix and the strip trap, with verified output.",
    description: `**Question presented to candidate:**
"You get messy text from a CSV export or a user form. Which string methods do you reach for to clean it, split it, search it and put it back together, and what are the traps in them?"

**What a strong answer should cover:**
- Strings are immutable: every method returns a new string, so you must use the return value (\`s.strip()\` alone does nothing to \`s\`).
- The cleaning and splitting core: \`strip\`/\`lstrip\`/\`rstrip\`, \`split\` (with and without an argument, \`maxsplit\`), \`rsplit\`, \`partition\`, \`splitlines\`, and \`sep.join(iterable)\` as the inverse of \`split\`.
- Searching and testing: \`in\`, \`find\` (returns -1) versus \`index\` (raises \`ValueError\`), \`count\`, \`startswith\`/\`endswith\` with a tuple, and the \`isdecimal\`/\`isdigit\`/\`isnumeric\` differences.
- The \`strip(chars)\` trap — the argument is a set of characters — and \`removeprefix\`/\`removesuffix\` (Python 3.9, PEP 616) as the fix.
- Case handling: \`lower\` versus \`casefold\` for caseless comparison; \`title()\` surprises; padding with \`zfill\`, \`center\`, \`ljust\`, \`rjust\`; \`translate\` for many single-character replacements.
- Building strings with \`"".join(parts)\` rather than \`+=\` in a loop, and why (CPython has an in-place shortcut, but it is not guaranteed).

**Code / implementation expected:** Optional — a short cleaning snippet (strip, split, join) is enough; bonus for showing the \`rstrip(".txt")\` trap.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior knowledge assumed beyond what a variable is.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 and on the page runner (Pyodide 0.25.1 = CPython 3.11.3). \`removeprefix\`/\`removesuffix\` need 3.9 or newer.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` — the precise word an interviewer expects you to use. Every output shown was produced by actually running the code on CPython 3.11 and in the page runner (Pyodide 0.25.1, which is CPython 3.11.3); the **Verified** section quotes that run exactly.

## 1. Why This Even Matters — A Story First

Imagine a sign-up form. People type \`"  Alice "\` with spaces, \`"BOB@MAIL.COM"\` in capitals, or paste a whole list of names separated by commas. Before your program can compare, store or search that text, it has to be tidied: trim the edges, cut it into pieces, fix the case, check whether it looks like a number. Python ships with about forty methods on every string to do exactly this, so you almost never need to write a character-by-character loop. Interviewers ask this question because it shows quickly whether you have actually written everyday Python — and whether you know the handful of methods that do something surprising.

## 2. The One Rule Behind Every Method: Strings Never Change

📌 **Interview term: Immutable** — an object whose value cannot change after it is created. Python strings are immutable.

So a string method never edits the string in place; it **returns a new string**. If you write \`name.strip()\` on its own line, Python builds the trimmed string and then throws it away. You must keep the result: \`name = name.strip()\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="Calling upper on s creates a new string object, s still points to the old one">
  <defs>
    <marker id="py03q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="40" width="90" height="44" rx="8"/>
  <text class="d-text" x="85" y="67" text-anchor="middle">s</text>
  <rect class="d-box-muted" x="40" y="130" width="90" height="44" rx="8"/>
  <text class="d-text" x="85" y="157" text-anchor="middle">t</text>
  <rect class="d-box" x="260" y="34" width="190" height="56" rx="10"/>
  <text class="d-text" x="355" y="60" text-anchor="middle">"hello"</text>
  <text class="d-sub" x="355" y="80" text-anchor="middle">unchanged</text>
  <rect class="d-box-accent" x="260" y="124" width="190" height="56" rx="10"/>
  <text class="d-text" x="355" y="150" text-anchor="middle">"HELLO"</text>
  <text class="d-sub" x="355" y="170" text-anchor="middle">new object</text>
  <path class="d-edge" d="M 134 62 L 254 62" marker-end="url(#py03q1-arrow2)"/>
  <path class="d-edge-accent" d="M 134 152 L 254 152" marker-end="url(#py03q1-arrow2)"/>
  <rect class="d-box-muted" x="520" y="80" width="150" height="56" rx="10"/>
  <text class="d-text" x="595" y="106" text-anchor="middle">t = s.upper()</text>
  <text class="d-sub" x="595" y="126" text-anchor="middle">returns a copy</text>
</svg>

In the code, \`s = "hello"\` then \`t = s.upper()\` leaves \`s\` as \`hello\` and gives \`t\` the value \`HELLO\` — two separate objects. The same rule is why strings can be dictionary keys: their value, and therefore their hash, can never change. More on this in [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python).

## 3. Cleaning: strip, and the Trap Inside It

\`strip()\` removes whitespace (spaces, tabs, newlines) from **both ends**, never from the middle. \`lstrip()\` does only the left end, \`rstrip()\` only the right.

~~~python
raw = "  alice, bob ,  carol  \\n"
print(repr(raw.strip()))  # 'alice, bob ,  carol'
~~~

You can pass characters to remove, and this is where people get burned:

📌 **Interview term: Character set argument** — \`strip(chars)\`, \`lstrip(chars)\` and \`rstrip(chars)\` treat \`chars\` as a **set of single characters** to peel off, in any order, as long as they keep matching. It is not a prefix or suffix.

~~~python
print("report.txt".rstrip(".txt"))  # repor
print("www.wow.com".lstrip("w."))  # ow.com
~~~

\`rstrip(".txt")\` keeps removing any of \`.\`, \`t\`, \`x\` from the right: \`t\`, \`x\`, \`t\`, \`.\`, and then the \`t\` of \`report\` too. The fix arrived in Python 3.9 ([PEP 616](https://peps.python.org/pep-0616/), whose stated motivation is exactly this confusion):

📌 **Interview term: removeprefix / removesuffix** — remove one exact substring from the start or end if it is there; otherwise return the string unchanged.

~~~python
print("report.txt".removesuffix(".txt"))  # report
print("www.wow.com".removeprefix("www."))  # wow.com
~~~

## 4. Splitting and Joining

📌 **Interview term: Separator** — the text that \`split\` cuts on and \`join\` puts between the pieces.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="split turns one string into a list of strings and join turns the list back into one string">
  <defs>
    <marker id="py03q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="250" height="60" rx="10"/>
  <text class="d-text" x="155" y="68" text-anchor="middle">one str</text>
  <text class="d-sub" x="155" y="88" text-anchor="middle">"ant,bee,cow"</text>
  <rect class="d-box-accent" x="420" y="40" width="250" height="60" rx="10"/>
  <text class="d-text" x="545" y="68" text-anchor="middle">list of str</text>
  <text class="d-sub" x="545" y="88" text-anchor="middle">["ant", "bee", "cow"]</text>
  <path class="d-edge-accent" d="M 284 60 L 414 60" marker-end="url(#py03q1-arrow)"/>
  <text class="d-sub d-accent" x="349" y="48" text-anchor="middle">s.split(",")</text>
  <path class="d-edge" d="M 414 84 L 284 84" marker-end="url(#py03q1-arrow)"/>
  <text class="d-sub" x="349" y="122" text-anchor="middle">",".join(parts)</text>
  <rect class="d-box-muted" x="30" y="160" width="640" height="60" rx="10"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">join is called on the separator, not on the list</text>
  <text class="d-sub" x="350" y="206" text-anchor="middle">every item must already be a str</text>
</svg>

\`split\` and \`join\` are inverses. Note that \`join\` is a method of the **separator**, and every item you join must already be a string (\`",".join([1, 2])\` raises \`TypeError\`; convert first with \`str\`).

The two forms of \`split\` behave differently, and interviewers like to ask about it:

| Call | Separator | Empty pieces? | Example result |
| :--- | :--- | :--- | :--- |
| \`s.split()\` | any run of whitespace | dropped, ends ignored | \`"a  b\\tc\\n".split()\` is \`['a', 'b', 'c']\` |
| \`s.split(" ")\` | exactly one space | kept | \`"a  b".split(" ")\` is \`['a', '', 'b']\` |
| \`s.split("=", 1)\` | first \`=\` only | — | \`"k=v=w".split("=", 1)\` is \`['k', 'v=w']\` |
| \`s.rsplit("=", 1)\` | last \`=\` only | — | \`['k=v', 'w']\` |
| \`s.partition(":")\` | first \`:\` | always a 3-tuple | \`"host".partition(":")\` is \`('host', '', '')\` |
| \`s.splitlines()\` | \`\\n\`, \`\\r\\n\` and other line breaks | no trailing empty item | \`['one', 'two', 'three']\` |

📌 **Interview term: maxsplit** — the second argument of \`split\`/\`rsplit\`, the maximum number of cuts. \`rsplit("=", 1)\` is the idiom for "split off the last part" (a file extension, a port number).

\`partition\` is handy when you want to unpack safely: \`head, sep, tail = s.partition(":")\` never raises, and \`sep\` is empty when the separator was missing.

## 5. Searching and Testing

~~~python
s = "banana"
print(s.find("na"))  # 2
print(s.rfind("na"))  # 4
print(s.find("x"))  # -1
print(s.count("an"))  # 2
print("nan" in s)  # True
~~~

- \`in\` is the plain yes/no substring test — use it unless you need the position.
- \`find\` returns the index of the first match, or **-1** if there is none. \`index\` does the same but **raises \`ValueError\`** when missing. Careful: \`-1\` is a valid index in Python, so \`s[s.find(x)]\` on a missing \`x\` silently gives you the last character.
- \`count\` counts **non-overlapping** matches: \`"aaaa".count("aa")\` is 2, not 3.
- \`startswith\` and \`endswith\` accept a **tuple** of options: \`path.lower().endswith((".jpg", ".png"))\`.

### The three digit tests

They look interchangeable and they are not. From the run (columns: \`isdecimal\`, \`isdigit\`, \`isnumeric\`):

| Character | isdecimal | isdigit | isnumeric |
| :--- | :--- | :--- | :--- |
| \`7\` | True | True | True |
| \`²\` (superscript two) | False | True | True |
| \`½\` (vulgar fraction one half) | False | False | True |
| \`٣\` (Arabic-Indic three) | True | True | True |

\`int()\` accepts what \`isdecimal\` accepts — \`int("٣٤")\` is \`34\` in the run — so \`isdecimal\` is the right pre-check for "can this become an int", and for ASCII-only input add \`s.isascii()\`.

## 6. Case, Padding and Bulk Replacement

📌 **Interview term: Case folding** — \`casefold()\`, a stronger version of \`lower()\` meant for comparing text without caring about case.

~~~python
a, b = "Stra\\u00dfe", "STRASSE"
print(a.lower() == b.lower())  # False
print(a.casefold() == b.casefold())  # True
~~~

\`title()\` capitalises the letter after **every** non-letter, so \`"it's o'neil".title()\` gave \`It'S O'Neil\` in the run — fine for headings, wrong for names.

Padding: \`"7".zfill(3)\` is \`007\` and \`zfill\` keeps a sign in front (\`-007\`); \`center\`, \`ljust\` and \`rjust\` pad to a width with any fill character. For anything more than this, use [f-strings](/interview-question/what-are-f-strings) with format specs (\`f"{n:>5}"\`).

📌 **Interview term: Translation table** — a mapping built by \`str.maketrans\` that \`translate\` applies in a single pass; mapping a character to \`None\` deletes it.

~~~python
table = str.maketrans({"a": "4", "e": "3", "o": None})
print("hello avocado".translate(table))  # h3ll 4vc4d
~~~

For pattern-based work (any digit, word boundaries), move to [regular expressions](/interview-question/how-do-you-use-regular-expressions-in-python).

## 7. Building Strings: join, Not += — and What CPython Really Does

Because strings are immutable, \`s += "x"\` has to produce a new string. In general that copies everything built so far, so a loop of n additions is O(n²). The standard advice is to collect pieces in a list and call \`"".join(parts)\` once, which is O(total length).

There is a subtlety a strong candidate can mention. CPython has an optimisation: when the left-hand string has **only one reference**, \`+=\` resizes it in place instead of copying. On our run (CPython 3.11, timing a loop of single-character \`+=\`):

| Appends | Plain loop | Same loop, with one extra reference kept to the string |
| :--- | :--- | :--- |
| 100,000 | 0.0033 s | 0.128 s |
| 200,000 | 0.0062 s | 0.498 s |
| 400,000 | 0.0133 s | 2.61 s |

The plain loop doubles with n (linear, thanks to the shortcut); once a second reference exists, doubling n roughly quadruples the time (quadratic). The shortcut is a CPython implementation detail, not a language guarantee, so \`join\` remains the answer to give. Timings vary by machine; the shape is the point.

## 8. Verified: Running the Code

Both examples below were run on python3.11 and in the page runner; every \`# comment\` after a \`print\` in them is a test that passed.

**Example 1 — cleaning, splitting and joining:**

~~~python
# Cleaning, splitting and joining text
raw = "  alice, bob ,  carol  \\n"

# strip() removes whitespace from both ends only
print(repr(raw.strip()))  # 'alice, bob ,  carol'

# split(",") keeps the spaces; strip each piece afterwards
names = [part.strip() for part in raw.split(",")]
print(names)  # ['alice', 'bob', 'carol']

# join is the inverse of split
print(" | ".join(names))  # alice | bob | carol

# split() with no argument splits on runs of whitespace and drops empties
print("a  b\\tc\\n".split())  # ['a', 'b', 'c']
print("a  b".split(" "))  # ['a', '', 'b']

# maxsplit limits the number of cuts; rsplit cuts from the right
print("k=v=w".split("=", 1))  # ['k', 'v=w']
print("k=v=w".rsplit("=", 1))  # ['k=v', 'w']

# partition always returns a 3-tuple, even when the separator is missing
print("host:8080".partition(":"))  # ('host', ':', '8080')
print("host".partition(":"))  # ('host', '', '')

# splitlines handles \\n and \\r\\n without leaving empty last items
print("one\\r\\ntwo\\nthree\\n".splitlines())  # ['one', 'two', 'three']

# The strip trap: the argument is a SET of characters, not a prefix
print("report.txt".rstrip(".txt"))  # repor
print("report.txt".removesuffix(".txt"))  # report
print("www.wow.com".lstrip("w."))  # ow.com
print("www.wow.com".removeprefix("www."))  # wow.com

# replace swaps every occurrence unless you pass a count
print("a-b-c-d".replace("-", "+"))  # a+b+c+d
print("a-b-c-d".replace("-", "+", 2))  # a+b+c-d

# Strings are immutable: methods return NEW strings
s = "hello"
t = s.upper()
print(s, t)  # hello HELLO
~~~

~~~text
'alice, bob ,  carol'
['alice', 'bob', 'carol']
alice | bob | carol
['a', 'b', 'c']
['a', '', 'b']
['k', 'v=w']
['k=v', 'w']
('host', ':', '8080')
('host', '', '')
['one', 'two', 'three']
repor
report
ow.com
wow.com
a+b+c+d
a+b+c-d
hello HELLO
~~~

**Example 2 — searching, testing, case and padding:**

~~~python
# Searching, testing, case and padding
s = "banana"

# find returns -1 when missing; index raises ValueError
print(s.find("na"))  # 2
print(s.rfind("na"))  # 4
print(s.find("x"))  # -1
try:
    s.index("x")
except ValueError as e:
    print("index:", e)

# count counts non-overlapping matches
print(s.count("an"))  # 2
print("aaaa".count("aa"))  # 2

# startswith / endswith accept a tuple of options
path = "photo.JPG"
print(path.lower().endswith((".jpg", ".png")))  # True

# The "in" operator is the simple substring test
print("nan" in s)  # True

# Digit tests are not the same thing
for ch in ["7", "²", "½", "٣"]:
    print(repr(ch), ch.isdecimal(), ch.isdigit(), ch.isnumeric())

# int() accepts what isdecimal accepts, including Arabic-Indic digits
print(int("٣٤"))  # 34

# casefold is the right tool for caseless comparison
a, b = "Straße", "STRASSE"
print(a.lower() == b.lower())  # False
print(a.casefold() == b.casefold())  # True

# title() capitalises after every non-letter, including apostrophes
print("it's o'neil".title())

# Padding and alignment
print("7".zfill(3))  # 007
print("-7".zfill(4))  # -007
print("[" + "hi".center(8, "*") + "]")  # [***hi***]
print("[" + "hi".ljust(5) + "]" + "[" + "hi".rjust(5) + "]")

# translate maps or deletes many characters in one pass
table = str.maketrans({"a": "4", "e": "3", "o": None})
print("hello avocado".translate(table))  # h3ll 4vc4d

# Building strings: join a list instead of += in a loop
parts = []
for i in range(5):
    parts.append(str(i * i))
print(",".join(parts))  # 0,1,4,9,16
~~~

~~~text
2
4
-1
index: substring not found
2
2
True
True
'7' True True True
'²' False True True
'½' False False True
'٣' True True True
34
False
True
It'S O'Neil
007
-007
[***hi***]
[hi   ][   hi]
h3ll 4vc4d
0,1,4,9,16
~~~

## 9. Quick Reference

| Need | Method | Note |
| :--- | :--- | :--- |
| Trim ends | \`strip\`, \`lstrip\`, \`rstrip\` | argument is a character set |
| Remove exact prefix/suffix | \`removeprefix\`, \`removesuffix\` | 3.9+ |
| Cut into pieces | \`split\`, \`rsplit\`, \`partition\`, \`splitlines\` | \`split()\` vs \`split(" ")\` differ |
| Glue pieces | \`sep.join(iterable)\` | items must be \`str\` |
| Find | \`in\`, \`find\`, \`rfind\`, \`index\`, \`count\` | \`find\` gives -1, \`index\` raises |
| Prefix/suffix test | \`startswith\`, \`endswith\` | accept a tuple |
| Character class | \`isdecimal\`, \`isdigit\`, \`isnumeric\`, \`isalpha\`, \`isalnum\`, \`isspace\` | \`isdecimal\` matches \`int()\` |
| Case | \`lower\`, \`upper\`, \`casefold\`, \`title\`, \`capitalize\`, \`swapcase\` | \`casefold\` for comparisons |
| Pad | \`zfill\`, \`center\`, \`ljust\`, \`rjust\` | or f-string format specs |
| Replace | \`replace(old, new, count)\`, \`translate\` | \`translate\` for many single chars |

Strings and bytes have nearly the same method set; the difference between the two types is covered in [bytes vs str](/interview-question/what-is-the-difference-between-bytes-and-str).

## Common Pitfalls

- **Discarding the result.** \`line.strip()\` on its own does nothing; strings are immutable, so assign the result.
- **Using \`rstrip(".txt")\` to remove an extension.** It strips a character set and can eat into the name (\`repor\`). Use \`removesuffix\`, or \`os.path.splitext\`/\`pathlib.Path.suffix\` for paths.
- **Trusting \`find\` in an index expression.** A miss returns -1, which is a valid index — it quietly selects the last character instead of failing.
- **\`split(" ")\` on human input.** Double spaces and tabs give empty strings; \`split()\` without an argument is almost always what you want for words.
- **Validating numbers with \`isdigit\`.** It accepts \`²\`, which \`int()\` rejects. Prefer \`isdecimal\` (plus \`isascii\` if you need ASCII) or just try the conversion.
- **Comparing user text with \`lower()\`.** Use \`casefold()\` for caseless comparison of non-English text.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core fact:</strong> <span style="color:#f0e2c8;">Strings are immutable, so every method returns a <strong style="color:#ffca28;">new</strong> string; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.strip()</code> on its own line does nothing — write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s = s.strip()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clean and split:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strip()</code> trims both ends; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split()</code> with no argument splits on runs of whitespace and drops empties, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split(",")</code> keeps empty fields; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partition</code> always gives a 3-tuple.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Join back:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">", ".join(parts)</code> is the inverse of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split</code> and the way to build strings from pieces — linear time, guaranteed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Search and test:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> for a yes/no check, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> returns -1 but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startswith</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endswith</code> take a tuple, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isdecimal</code> is the strictest digit test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strip</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lstrip</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rstrip</code> take a <strong style="color:#ffca28;">set of characters</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"report.txt".rstrip(".txt")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repor</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removesuffix</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeprefix</code> (3.9+).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">+=</code> in a loop said to be slow, if it ran fast when you tried it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> must make a new string, which is quadratic in general. CPython has a shortcut: when the string has only one reference it resizes it in place, so a simple loop looks linear. Keep a second reference and it becomes quadratic again. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"".join(parts)</code> is linear without relying on that shortcut.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lower()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">casefold()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">casefold()</code> is a more aggressive mapping meant for caseless matching. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"Straße".lower()</code> keeps the ß, so it does not equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"STRASSE".lower()</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">casefold()</code> turns ß into ss and the two compare equal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">split()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">split(" ")</code> give different results?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With no argument, runs of any whitespace count as one separator and leading or trailing whitespace is ignored. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">" "</code>, each single space is a separator, so two spaces produce an empty string between them: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a  b".split(" ")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">['a', '', 'b']</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isdigit()</code> returned True but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int()</code> failed. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isdigit()</code> is true for characters like superscript two (²), which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int()</code> does not accept. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isdecimal()</code> matches what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int()</code> accepts, including non-ASCII decimal digits such as Arabic-Indic digits. For validating user input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isdecimal()</code> or simply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try: int(s)</code> is safer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you replace many different characters at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a table with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.maketrans({"a": "4", "o": None})</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.translate(table)</code>. It does one pass over the string; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> deletes the character. For patterns, use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re</code> module instead.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Immutable** | Cannot be changed after creation; methods return new strings |
| **Separator** | The text \`split\` cuts on and \`join\` inserts |
| **maxsplit** | Argument that limits how many cuts \`split\`/\`rsplit\` make |
| **Character set argument** | What \`strip(chars)\` takes: any of these characters, in any order |
| **removeprefix / removesuffix** | Remove an exact substring at one end, if present (3.9+) |
| **Case folding** | \`casefold()\`: aggressive lowercasing for caseless comparison |
| **Translation table** | Mapping from \`str.maketrans\` used by \`translate\` |

---
**Conclusion:** Python string methods all follow one rule — strings are immutable, so every method hands back a new string that you must keep. Around that rule sit a small set of tools worth knowing cold: \`strip\` to trim, \`split\`/\`partition\`/\`splitlines\` to cut and \`join\` to glue back, \`in\`/\`find\`/\`index\`/\`count\` to search, \`casefold\` to compare, and \`translate\` for bulk replacement. The strong answer adds the traps that real code hits — \`strip\` takes a character set (use \`removeprefix\`/\`removesuffix\`), \`find\` returns a valid-looking -1, \`split()\` and \`split(" ")\` differ, and \`isdigit\` is looser than \`int()\` — and knows that \`join\` beats \`+=\` even though CPython sometimes hides the cost.`,
    examples: [
      {
        label: "Cleaning, splitting and joining (plus the strip trap)",
        code: `# Cleaning, splitting and joining text
raw = "  alice, bob ,  carol  \\n"

# strip() removes whitespace from both ends only
print(repr(raw.strip()))  # 'alice, bob ,  carol'

# split(",") keeps the spaces; strip each piece afterwards
names = [part.strip() for part in raw.split(",")]
print(names)  # ['alice', 'bob', 'carol']

# join is the inverse of split
print(" | ".join(names))  # alice | bob | carol

# split() with no argument splits on runs of whitespace and drops empties
print("a  b\\tc\\n".split())  # ['a', 'b', 'c']
print("a  b".split(" "))  # ['a', '', 'b']

# maxsplit limits the number of cuts; rsplit cuts from the right
print("k=v=w".split("=", 1))  # ['k', 'v=w']
print("k=v=w".rsplit("=", 1))  # ['k=v', 'w']

# partition always returns a 3-tuple, even when the separator is missing
print("host:8080".partition(":"))  # ('host', ':', '8080')
print("host".partition(":"))  # ('host', '', '')

# splitlines handles \\n and \\r\\n without leaving empty last items
print("one\\r\\ntwo\\nthree\\n".splitlines())  # ['one', 'two', 'three']

# The strip trap: the argument is a SET of characters, not a prefix
print("report.txt".rstrip(".txt"))  # repor
print("report.txt".removesuffix(".txt"))  # report
print("www.wow.com".lstrip("w."))  # ow.com
print("www.wow.com".removeprefix("www."))  # wow.com

# replace swaps every occurrence unless you pass a count
print("a-b-c-d".replace("-", "+"))  # a+b+c+d
print("a-b-c-d".replace("-", "+", 2))  # a+b+c-d

# Strings are immutable: methods return NEW strings
s = "hello"
t = s.upper()
print(s, t)  # hello HELLO`,
      },
      {
        label: "Searching, digit tests, casefold, padding and translate",
        code: `# Searching, testing, case and padding
s = "banana"

# find returns -1 when missing; index raises ValueError
print(s.find("na"))  # 2
print(s.rfind("na"))  # 4
print(s.find("x"))  # -1
try:
    s.index("x")
except ValueError as e:
    print("index:", e)

# count counts non-overlapping matches
print(s.count("an"))  # 2
print("aaaa".count("aa"))  # 2

# startswith / endswith accept a tuple of options
path = "photo.JPG"
print(path.lower().endswith((".jpg", ".png")))  # True

# The "in" operator is the simple substring test
print("nan" in s)  # True

# Digit tests are not the same thing
for ch in ["7", "²", "½", "٣"]:
    print(repr(ch), ch.isdecimal(), ch.isdigit(), ch.isnumeric())

# int() accepts what isdecimal accepts, including Arabic-Indic digits
print(int("٣٤"))  # 34

# casefold is the right tool for caseless comparison
a, b = "Straße", "STRASSE"
print(a.lower() == b.lower())  # False
print(a.casefold() == b.casefold())  # True

# title() capitalises after every non-letter, including apostrophes
print("it's o'neil".title())

# Padding and alignment
print("7".zfill(3))  # 007
print("-7".zfill(4))  # -007
print("[" + "hi".center(8, "*") + "]")  # [***hi***]
print("[" + "hi".ljust(5) + "]" + "[" + "hi".rjust(5) + "]")

# translate maps or deletes many characters in one pass
table = str.maketrans({"a": "4", "e": "3", "o": None})
print("hello avocado".translate(table))  # h3ll 4vc4d

# Building strings: join a list instead of += in a loop
parts = []
for i in range(5):
    parts.append(str(i * i))
print(",".join(parts))  # 0,1,4,9,16`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does slicing with start:stop:step work?",
    difficulty: "easy",
    seoDescription: "Python slicing seq[start:stop:step] explained: half-open ranges, negative indices and steps, clamping, slice assignment and slice objects.",
    description: `**Question presented to candidate:**
"Explain how \`seq[start:stop:step]\` works in Python. What do \`s[::-1]\`, \`s[-3:]\` and \`s[4:1:-1]\` give you, and what happens when you assign to a slice?"

**What a strong answer should cover:**
- The range is half-open: \`start\` is included, \`stop\` is excluded, so \`s[:k] + s[k:] == s\` and \`len(s[a:b]) == b - a\` for in-range bounds.
- Omitted parts have defaults, negative indices count from the end, and a negative \`step\` walks backwards with the defaults flipped (\`s[::-1]\` reverses).
- Slicing clamps out-of-range bounds instead of raising \`IndexError\`; only a step of 0 is an error (\`ValueError\`).
- On lists a slice is a new, **shallow** copy (\`a[:]\`), and slice assignment / \`del a[i:j]\` can replace, insert or remove regions; extended slices (\`step != 1\`) require an equal-size replacement.
- \`a[i:j:k]\` is sugar for \`a[slice(i, j, k)]\`; your own \`__getitem__\` receives the \`slice\` object, and \`slice.indices(n)\` shows the clamped values.

**Code / implementation expected:** Optional — predicting the output of a few slices on a short string or list is the usual check.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — you only need to know what a list and a string are.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 and the page runner (Pyodide 0.25.1 = CPython 3.11.3); the bytecode comparison was also run on CPython 3.12.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` — the precise word an interviewer expects you to use. Every output shown was produced by actually running the code on CPython 3.11 and in the page runner (Pyodide 0.25.1, which is CPython 3.11.3); the **Verified** section quotes that run exactly.

## 1. Why This Even Matters — A Story First

Think of a loaf of bread on a cutting board with marks between the slices: mark 0 before the first slice, mark 1 after it, and so on. To take "slices 2 to 4" you put the knife at mark 1 and at mark 4 and lift what is between. You never ask "is the knife at mark 4 included?" — knives cut between slices. Python slicing works exactly like this, and once you see the numbers as **cut marks between items** rather than as the items themselves, every slicing rule falls out naturally. Slicing is everywhere in real code — taking the first n results, dropping a header line, reversing, copying a list — which is why interviewers use it as a quick fluency check.

## 2. The Core Idea: Cut Points and a Half-Open Range

📌 **Interview term: Half-open range** — a range that includes its start and excludes its end, written \`[start, stop)\`. Python slices, \`range()\` and most of the standard library use it.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Slice positions sit between the items. PYTHON with positions 0 to 6 above and minus 6 to minus 1 below, the slice 1 to 4 selects Y T H">
  <text class="d-sub" x="60" y="50" text-anchor="middle">positions</text>
  <text class="d-sub" x="60" y="172" text-anchor="middle">negative</text>
  <rect class="d-box" x="120" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="155" y="111" text-anchor="middle">P</text>
  <rect class="d-box-accent" x="190" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="225" y="111" text-anchor="middle">Y</text>
  <rect class="d-box-accent" x="260" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="295" y="111" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="330" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="365" y="111" text-anchor="middle">H</text>
  <rect class="d-box" x="400" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="111" text-anchor="middle">O</text>
  <rect class="d-box" x="470" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="505" y="111" text-anchor="middle">N</text>
  <path class="d-edge-dashed" d="M 120 62 L 120 148"/>
  <text class="d-sub" x="120" y="50" text-anchor="middle">0</text>
  <text class="d-sub" x="120" y="172" text-anchor="middle">-6</text>
  <path class="d-edge-dashed" d="M 190 62 L 190 148"/>
  <text class="d-sub" x="190" y="50" text-anchor="middle">1</text>
  <text class="d-sub" x="190" y="172" text-anchor="middle">-5</text>
  <path class="d-edge-dashed" d="M 260 62 L 260 148"/>
  <text class="d-sub" x="260" y="50" text-anchor="middle">2</text>
  <text class="d-sub" x="260" y="172" text-anchor="middle">-4</text>
  <path class="d-edge-dashed" d="M 330 62 L 330 148"/>
  <text class="d-sub" x="330" y="50" text-anchor="middle">3</text>
  <text class="d-sub" x="330" y="172" text-anchor="middle">-3</text>
  <path class="d-edge-dashed" d="M 400 62 L 400 148"/>
  <text class="d-sub" x="400" y="50" text-anchor="middle">4</text>
  <text class="d-sub" x="400" y="172" text-anchor="middle">-2</text>
  <path class="d-edge-dashed" d="M 470 62 L 470 148"/>
  <text class="d-sub" x="470" y="50" text-anchor="middle">5</text>
  <text class="d-sub" x="470" y="172" text-anchor="middle">-1</text>
  <path class="d-edge-dashed" d="M 540 62 L 540 148"/>
  <text class="d-sub" x="540" y="50" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 190 200 L 400 200"/>
  <path class="d-edge-accent" d="M 190 192 L 190 208"/>
  <path class="d-edge-accent" d="M 400 192 L 400 208"/>
  <rect class="d-box-muted" x="180" y="220" width="230" height="44" rx="8"/>
  <text class="d-text d-accent" x="295" y="247" text-anchor="middle">s[1:4] is YTH</text>
</svg>

The numbers above are the cut marks. \`s[1:4]\` cuts at mark 1 and mark 4, giving \`YTH\`. Below are the same marks counted from the end.

📌 **Interview term: Negative index** — an index counted from the end of the sequence: \`-1\` is the last item, \`-2\` the one before. In a slice, \`-3\` means "cut at three from the end".

~~~python
s = "PYTHON"
print(s[1:4])  # YTH
print(s[:2])  # PY
print(s[2:])  # THON
print(s[:2] + s[2:] == s)  # True
print(s[-3:])  # HON
print(s[:-1])  # PYTHO
~~~

Two consequences make the half-open rule worth it: \`len(s[a:b]) == b - a\`, and \`s[:k] + s[k:]\` always rebuilds \`s\` with nothing lost and nothing doubled.

## 3. The Step, and Walking Backwards

📌 **Interview term: Step** — the third slice number: take every \`step\`-th item. It defaults to 1; a negative step walks from right to left.

~~~python
nums = [0, 10, 20, 30, 40, 50]
print(nums[::2])  # [0, 20, 40]
print(nums[1::2])  # [10, 30, 50]
print(s[::-1])  # NOHTYP
print(s[4:1:-1])  # OHT
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="With a negative step the slice starts at index 4 and walks left, stopping before index 1, giving O H T">
  <defs>
    <marker id="py03q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="120" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="155" y="71" text-anchor="middle">P</text>
  <rect class="d-box-muted" x="190" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="225" y="71" text-anchor="middle">Y</text>
  <rect class="d-box-accent" x="260" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="295" y="71" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="330" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="365" y="71" text-anchor="middle">H</text>
  <rect class="d-box-accent" x="400" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="71" text-anchor="middle">O</text>
  <rect class="d-box" x="470" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="505" y="71" text-anchor="middle">N</text>
  <path class="d-edge-accent" d="M 435 120 L 305 120" marker-end="url(#py03q2-arrow)"/>
  <text class="d-sub" x="435" y="145" text-anchor="middle">start 4</text>
  <text class="d-sub" x="225" y="145" text-anchor="middle">stop 1, excluded</text>
  <rect class="d-box-muted" x="200" y="170" width="260" height="44" rx="8"/>
  <text class="d-text d-accent" x="330" y="197" text-anchor="middle">s[4:1:-1] is OHT</text>
</svg>

With a negative step, \`start\` should be to the **right** of \`stop\`. The defaults flip too: a missing start means "the last item", a missing stop means "past the first item". That is why \`s[::-1]\` reverses the whole thing, and why \`s[1:4:-1]\` is empty — you cannot walk left from 1 and reach 4.

| Expression | Result | Reads as |
| :--- | :--- | :--- |
| \`s[:3]\` | first three | from the start to cut 3 |
| \`s[-3:]\` | last three | from three before the end to the end |
| \`s[:-1]\` | all but the last | |
| \`s[::2]\` | every other item | |
| \`s[::-1]\` | reversed copy | |
| \`s[:]\` | full (shallow) copy | |

## 4. Slices Never Go Out of Range

📌 **Interview term: Clamping** — when a slice bound is beyond the sequence, Python silently cuts it to the nearest valid position.

Indexing a single item past the end raises \`IndexError\`, but slicing does not: \`nums[2:100]\` gives \`[20, 30, 40, 50]\` and \`nums[100:]\` gives \`[]\`. That makes \`items[:10]\` safe on a list of three items. The one slice error is a zero step: \`nums[::0]\` raises \`ValueError: slice step cannot be zero\`.

## 5. What a Slice Actually Is

📌 **Interview term: slice object** — the built-in \`slice(start, stop, step)\` value. Writing \`a[1:4]\` is shorthand for \`a[slice(1, 4)]\`; missing parts are \`None\`.

You can name a slice and reuse it, and \`slice.indices(length)\` tells you the clamped, positive \`(start, stop, step)\` Python will use:

~~~python
print(slice(-3, None).indices(len(nums)))  # (3, 6, 1)
print(slice(None, None, -1).indices(6))  # (5, -1, -1)
~~~

Your own classes get slicing by implementing \`__getitem__\`: the second example shows a \`Week\` class receiving \`slice(5, None, None)\` for \`w[5:]\` (more on that in [dunder methods](/interview-question/what-are-dunder-magic-methods)).

### What CPython does with it

On 3.11, \`dis\` shows the slice object being built and passed to the normal subscript operation. On 3.12, a simple two-part slice gets its own instruction, while a three-part slice still builds a slice object. From our run of \`dis.dis(compile("s[1:4]", "<x>", "eval"))\` (and the same for \`s[::2]\`):

~~~text
== 3.11, s[1:4]
  LOAD_NAME                0 (s)
  LOAD_CONST               0 (1)
  LOAD_CONST               1 (4)
  BUILD_SLICE              2
  BINARY_SUBSCR
== 3.12, s[1:4]
  LOAD_NAME                0 (s)
  LOAD_CONST               0 (1)
  LOAD_CONST               1 (4)
  BINARY_SLICE
== 3.12, s[::2]
  LOAD_NAME                0 (s)
  LOAD_CONST               0 (None)
  LOAD_CONST               0 (None)
  LOAD_CONST               1 (2)
  BUILD_SLICE              3
  BINARY_SUBSCR
~~~

(Offsets and the \`RESUME\`/\`RETURN_VALUE\` lines are trimmed.) The behaviour is the same either way; 3.12 just avoids creating a temporary slice object in the common case.

## 6. Slices of Lists: Copies, Assignment and Deletion

📌 **Interview term: Shallow copy** — a new container that holds references to the same inner objects as the original.

\`grid[:]\` is a new list (\`copy is grid\` is \`False\`), but its items are the same objects, so \`copy[0].append(99)\` also shows up in \`grid\`. See [shallow vs deep copy](/interview-question/what-is-the-difference-between-shallow-and-deep-copy).

📌 **Interview term: Slice assignment** — \`a[i:j] = iterable\` replaces the region \`i:j\` of a mutable sequence with the new items; the list can grow or shrink.

~~~python
grow = [0, 1, 2, 3, 4, 5]
grow[1:3] = ["a", "b", "c", "d"]
print(grow)  # [0, 'a', 'b', 'c', 'd', 3, 4, 5]
ins = [0, 1, 2]
ins[1:1] = [10, 11]
print(ins)  # [0, 10, 11, 1, 2]
~~~

An empty slice like \`ins[1:1]\` is a pure insertion point, and \`del odds[::2]\` removes every other item.

📌 **Interview term: Extended slice** — a slice with a step other than 1. Assigning to one must supply **exactly** as many items as it selects; otherwise you get \`ValueError: attempt to assign sequence of size 2 to extended slice of size 3\`.

Strings and tuples are immutable, so they support reading slices only; assignment raises \`TypeError\`. Lists versus tuples in general are covered in [list vs tuple](/interview-question/what-is-the-difference-between-a-list-and-a-tuple).

## 7. Verified: Running the Code

Both examples ran on python3.11 and in the page runner with the same output; every \`# comment\` after a \`print\` is an in-page test that passed.

**Example 1 — reading slices:**

~~~python
# Reading slices: start is included, stop is excluded
s = "PYTHON"
nums = [0, 10, 20, 30, 40, 50]

print(s[1:4])  # YTH
print(nums[1:4])  # [10, 20, 30]

# Omitted parts take defaults
print(s[:2])  # PY
print(s[2:])  # THON
print(s[:2] + s[2:] == s)  # True

# Negative numbers count from the end
print(s[-1])  # N
print(s[-3:])  # HON
print(s[:-1])  # PYTHO

# The step picks every n-th item
print(nums[::2])  # [0, 20, 40]
print(nums[1::2])  # [10, 30, 50]

# A negative step walks backwards; defaults flip to "from the end"
print(s[::-1])  # NOHTYP
print(s[4:1:-1])  # OHT
print(s[1:4:-1] == "")  # True

# Out-of-range bounds clamp instead of raising
print(nums[2:100])  # [20, 30, 40, 50]
print(nums[100:])  # []
try:
    nums[100]
except IndexError as e:
    print("index:", e)

# A step of zero is the one slice error
try:
    nums[::0]
except ValueError as e:
    print("step 0:", e)

# s[a:b] is sugar for s[slice(a, b)]; indices() shows the clamped values
last_three = slice(-3, None)
print(s[last_three], nums[last_three])
print(slice(-3, None).indices(len(nums)))  # (3, 6, 1)
print(slice(None, None, -1).indices(6))  # (5, -1, -1)
~~~

~~~text
YTH
[10, 20, 30]
PY
THON
True
N
HON
PYTHO
[0, 20, 40]
[10, 30, 50]
NOHTYP
OHT
True
[20, 30, 40, 50]
[]
index: list index out of range
step 0: slice step cannot be zero
HON [30, 40, 50]
(3, 6, 1)
(5, -1, -1)
~~~

**Example 2 — copies, assignment, deletion and a custom class:**

~~~python
# Slices of lists are new lists, but the copy is shallow
grid = [[1, 2], [3, 4]]
copy = grid[:]
print(copy == grid, copy is grid)  # True False
copy[0].append(99)
print(grid)  # [[1, 2, 99], [3, 4]]

# Slice assignment replaces a region and can change the length
grow = [0, 1, 2, 3, 4, 5]
grow[1:3] = ["a", "b", "c", "d"]
print(grow)  # [0, 'a', 'b', 'c', 'd', 3, 4, 5]

# An empty slice is an insertion point
ins = [0, 1, 2]
ins[1:1] = [10, 11]
print(ins)  # [0, 10, 11, 1, 2]

# del with a slice removes a region; s[::2] removes every other item
odds = list(range(10))
del odds[::2]
print(odds)  # [1, 3, 5, 7, 9]

# With a step other than 1 the sizes must match exactly
ext = list(range(6))
ext[::2] = ["x", "y", "z"]
print(ext)  # ['x', 1, 'y', 3, 'z', 5]
try:
    ext[::2] = ["only", "two"]
except ValueError as e:
    print("ValueError:", e)

# a[:] = ... changes the list in place, so every alias sees it
a = [1, 2, 3]
alias = a
a[:] = [7, 8]
print(alias)  # [7, 8]

# Strings and tuples are immutable: no slice assignment
try:
    "hello"[0:1] = "J"
except TypeError as e:
    print("TypeError:", e)

# Your own class receives a slice object in __getitem__
class Week:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    def __getitem__(self, key):
        if isinstance(key, slice):
            print("got", key)
            return self.days[key]
        return self.days[key]

w = Week()
print(w[5:])
print(w[-1])
~~~

~~~text
True False
[[1, 2, 99], [3, 4]]
[0, 'a', 'b', 'c', 'd', 3, 4, 5]
[0, 10, 11, 1, 2]
[1, 3, 5, 7, 9]
['x', 1, 'y', 3, 'z', 5]
ValueError: attempt to assign sequence of size 2 to extended slice of size 3
[7, 8]
TypeError: 'str' object does not support item assignment
got slice(5, None, None)
['Sat', 'Sun']
Sun
~~~

## 8. Cost

| Operation | Time | Notes |
| :--- | :--- | :--- |
| \`s[i]\` | O(1) | single item |
| \`s[i:j]\`, \`s[::k]\` | O(k) for k items taken | builds a new object |
| \`a[i:j] = items\` | O(n) worst case | the tail after \`j\` may have to move |
| \`del a[i:j]\` | O(n) worst case | same reason |

Because a slice copies, slicing in a loop (\`while s: s = s[1:]\`) is quadratic. Walk an index instead, or use \`itertools.islice\` on iterators, which cannot be sliced with brackets at all.

## Common Pitfalls

- **Off-by-one on \`stop\`.** \`s[2:5]\` has three items (2, 3, 4), not four. Think "cut marks", not "items".
- **Expecting \`s[1:4:-1]\` to reverse the middle.** With a negative step, start must be the right-hand end: use \`s[3:0:-1]\` or \`s[1:4][::-1]\`.
- **Assuming \`a[:]\` is a deep copy.** Nested lists are still shared.
- **Relying on slices to raise.** Slices clamp silently, so a wrong bound gives a short or empty result instead of an error — check lengths where it matters.
- **Mismatched extended-slice assignment.** \`a[::2] = ...\` needs exactly the right number of items.
- **Slicing an iterator or generator.** \`gen[:5]\` raises \`TypeError\`; use \`itertools.islice(gen, 5)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seq[start:stop:step]</code> takes items from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> up to but <strong style="color:#ffca28;">not including</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop</code>, every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code>-th one — a half-open range, the same as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Defaults and negatives:</strong> <span style="color:#f0e2c8;">Missing start/stop mean the ends; negative indices count from the end, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[-3:]</code> is the last three and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[:-1]</code> drops the last item.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Negative step:</strong> <span style="color:#f0e2c8;">A negative step walks backwards and flips the defaults: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[::-1]</code> reverses, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[4:1:-1]</code> gives items 4, 3, 2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Forgiving bounds:</strong> <span style="color:#f0e2c8;">Slices clamp out-of-range bounds (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[2:100]</code> is fine, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[100:]</code> is empty); only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step=0</code> raises.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Lists:</strong> <span style="color:#f0e2c8;">A list slice is a new <strong style="color:#ffca28;">shallow</strong> copy; assigning to a slice or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del a[i:j]</code> edits a region in place, and extended slices need an exact-size replacement.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the stop index excluded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes the arithmetic clean: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(s[a:b])</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b - a</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[:k] + s[k:]</code> rebuilds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> exactly with no overlap. Positions are best pictured as lying between items, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is a cut point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[:]</code> copy nested lists too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a shallow copy: a new outer list holding the same inner objects. Appending to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy[0]</code> changes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid[0]</code> as well. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.deepcopy</code> when the nested objects must be independent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a = [7, 8]</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[:] = [7, 8]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first rebinds the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> to a new list; other names that pointed at the old list still see the old contents. The second replaces the contents of the existing list in place, so every alias sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[7, 8]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would your own class support slicing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[5:]</code> Python passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice(5, None, None)</code>; check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(key, slice)</code> and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key.indices(len(self))</code> to get clamped <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(start, stop, step)</code> values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is slicing O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. For lists, strings and tuples it copies the selected items, so it costs O(k) time and memory for k items. If you need a view without copying, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memoryview</code> on bytes-like data or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.islice</code> for iterators.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Half-open range** | Includes \`start\`, excludes \`stop\` |
| **Negative index** | Counts from the end: -1 is the last item |
| **Step** | Distance between picked items; negative walks backwards |
| **Clamping** | Out-of-range slice bounds are cut to the valid range instead of raising |
| **Shallow copy** | New container, same inner objects |
| **Slice assignment** | \`a[i:j] = iterable\` replaces a region of a mutable sequence |
| **Extended slice** | A slice with a step other than 1 |
| **slice object** | The \`slice(start, stop, step)\` value that \`a[i:j:k]\` creates |

---
**Conclusion:** Slicing is easiest to reason about if you treat the numbers as cut marks between items: \`seq[start:stop:step]\` takes everything between two cuts, every \`step\`-th item, with \`stop\` excluded. Defaults fill in the ends, negative numbers count from the end, a negative step walks backwards with the defaults flipped, and out-of-range bounds clamp instead of raising. On lists, a slice is a shallow copy and the left-hand side of an assignment can replace, insert or delete whole regions, while under the hood \`a[i:j:k]\` is just \`a[slice(i, j, k)]\` passed to \`__getitem__\`.`,
    examples: [
      {
        label: "Half-open ranges, negative indices, steps, clamping and slice objects",
        code: `# Reading slices: start is included, stop is excluded
s = "PYTHON"
nums = [0, 10, 20, 30, 40, 50]

print(s[1:4])  # YTH
print(nums[1:4])  # [10, 20, 30]

# Omitted parts take defaults
print(s[:2])  # PY
print(s[2:])  # THON
print(s[:2] + s[2:] == s)  # True

# Negative numbers count from the end
print(s[-1])  # N
print(s[-3:])  # HON
print(s[:-1])  # PYTHO

# The step picks every n-th item
print(nums[::2])  # [0, 20, 40]
print(nums[1::2])  # [10, 30, 50]

# A negative step walks backwards; defaults flip to "from the end"
print(s[::-1])  # NOHTYP
print(s[4:1:-1])  # OHT
print(s[1:4:-1] == "")  # True

# Out-of-range bounds clamp instead of raising
print(nums[2:100])  # [20, 30, 40, 50]
print(nums[100:])  # []
try:
    nums[100]
except IndexError as e:
    print("index:", e)

# A step of zero is the one slice error
try:
    nums[::0]
except ValueError as e:
    print("step 0:", e)

# s[a:b] is sugar for s[slice(a, b)]; indices() shows the clamped values
last_three = slice(-3, None)
print(s[last_three], nums[last_three])
print(slice(-3, None).indices(len(nums)))  # (3, 6, 1)
print(slice(None, None, -1).indices(6))  # (5, -1, -1)`,
      },
      {
        label: "Shallow copies, slice assignment, del and a custom __getitem__",
        code: `# Slices of lists are new lists, but the copy is shallow
grid = [[1, 2], [3, 4]]
copy = grid[:]
print(copy == grid, copy is grid)  # True False
copy[0].append(99)
print(grid)  # [[1, 2, 99], [3, 4]]

# Slice assignment replaces a region and can change the length
grow = [0, 1, 2, 3, 4, 5]
grow[1:3] = ["a", "b", "c", "d"]
print(grow)  # [0, 'a', 'b', 'c', 'd', 3, 4, 5]

# An empty slice is an insertion point
ins = [0, 1, 2]
ins[1:1] = [10, 11]
print(ins)  # [0, 10, 11, 1, 2]

# del with a slice removes a region; s[::2] removes every other item
odds = list(range(10))
del odds[::2]
print(odds)  # [1, 3, 5, 7, 9]

# With a step other than 1 the sizes must match exactly
ext = list(range(6))
ext[::2] = ["x", "y", "z"]
print(ext)  # ['x', 1, 'y', 3, 'z', 5]
try:
    ext[::2] = ["only", "two"]
except ValueError as e:
    print("ValueError:", e)

# a[:] = ... changes the list in place, so every alias sees it
a = [1, 2, 3]
alias = a
a[:] = [7, 8]
print(alias)  # [7, 8]

# Strings and tuples are immutable: no slice assignment
try:
    "hello"[0:1] = "J"
except TypeError as e:
    print("TypeError:", e)

# Your own class receives a slice object in __getitem__
class Week:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    def __getitem__(self, key):
        if isinstance(key, slice):
            print("got", key)
            return self.days[key]
        return self.days[key]

w = Week()
print(w[5:])
print(w[-1])`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between append, extend and insert on a list?",
    difficulty: "easy",
    seoDescription: "Python list append vs extend vs insert: one item vs many, positions, += vs +, return None, and the O(1) vs O(n) costs, with verified output.",
    description: `**Question presented to candidate:**
"What is the difference between \`append\`, \`extend\` and \`insert\` on a Python list? If I call \`a.append([3, 4])\` and \`a.extend([3, 4])\`, what does \`a\` look like in each case, and which of these is slow on a big list?"

**What a strong answer should cover:**
- \`append(x)\` adds exactly one item at the end, whatever \`x\` is (a list becomes one nested element); \`extend(iterable)\` adds each item of any iterable (a string adds its characters); \`insert(i, x)\` puts one item before position \`i\`.
- All three mutate the list in place and return \`None\`, so \`a = a.append(x)\` destroys the list.
- \`insert\` clamps out-of-range positions and accepts negative ones; \`a += iterable\` is \`extend\` (in place, any iterable) while \`a + b\` builds a new list and requires a list.
- Costs: \`append\` is amortised O(1) thanks to over-allocation, \`extend\` is O(k), \`insert(0, x)\` is O(n) because every item shifts — use \`collections.deque\` for frequent front inserts.
- A CPython detail: a list is an array of pointers, so appending a big object copies one pointer, not the object.

**Code / implementation expected:** Optional — a few lines showing the \`append\` versus \`extend\` result is the usual check.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — you need to know what a list is; nothing more.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 (64-bit Linux) and the page runner (Pyodide 0.25.1 = CPython 3.11.3, a 32-bit WebAssembly build).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` — the precise word an interviewer expects you to use. Every output shown was produced by actually running the code on CPython 3.11 and in the page runner (Pyodide 0.25.1, which is CPython 3.11.3); the **Verified** section quotes that run exactly.

## 1. Why This Even Matters — A Story First

Picture a queue of people at a ticket desk. A new person walks up and joins the end: that is \`append\`. A coach party arrives and its ten passengers join the end one after another: that is \`extend\`. Someone pushes in at the front: that is \`insert(0, ...)\`, and **everyone** in the queue has to shuffle back one place. The first two are quick; the last one gets slower the longer the queue is. Lists in Python behave exactly like this, and the question checks two things: do you know which method produces which shape of list, and do you know what each one costs.

## 2. The Three Methods Side by Side

📌 **Interview term: In-place mutation** — changing an existing object rather than creating a new one. \`append\`, \`extend\` and \`insert\` all mutate the list in place.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Starting from 1 2, append of the list 3 4 adds one nested item, extend adds two separate items">
  <text class="d-sub" x="20" y="50">start</text>
  <rect class="d-box" x="190" y="20" width="60" height="46" rx="6"/>
  <text class="d-text" x="220" y="49" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="20" width="60" height="46" rx="6"/>
  <text class="d-text" x="292" y="49" text-anchor="middle">2</text>
  <text class="d-sub" x="20" y="130">append([3, 4])</text>
  <rect class="d-box" x="190" y="100" width="60" height="46" rx="6"/>
  <text class="d-text" x="220" y="129" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="100" width="60" height="46" rx="6"/>
  <text class="d-text" x="292" y="129" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="334" y="100" width="110" height="46" rx="6"/>
  <text class="d-text" x="389" y="129" text-anchor="middle">[3, 4]</text>
  <text class="d-sub" x="20" y="210">extend([3, 4])</text>
  <rect class="d-box" x="190" y="180" width="60" height="46" rx="6"/>
  <text class="d-text" x="220" y="209" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="180" width="60" height="46" rx="6"/>
  <text class="d-text" x="292" y="209" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="334" y="180" width="60" height="46" rx="6"/>
  <text class="d-text" x="364" y="209" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="406" y="180" width="60" height="46" rx="6"/>
  <text class="d-text" x="436" y="209" text-anchor="middle">4</text>
</svg>

~~~python
a = [1, 2]
a.append([3, 4])
print(a)  # [1, 2, [3, 4]]
print(len(a))  # 3

b = [1, 2]
b.extend([3, 4])
print(b)  # [1, 2, 3, 4]
~~~

\`append\` takes **one object** and adds it as one element — a list you pass becomes a nested list. \`extend\` takes an **iterable** and adds each element it yields.

📌 **Interview term: Iterable** — any object you can loop over with \`for\`: lists, tuples, strings, ranges, sets, dicts (their keys), generators. See [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator).

Because a string is an iterable of characters, \`c.extend("hi")\` adds \`'h'\` and \`'i'\` separately — a common surprise. \`extend(range(2))\` adds \`0\` and \`1\`.

\`insert(i, x)\` puts **one** item before position \`i\`:

| Call on \`[1, 2, 3]\` | Result | Why |
| :--- | :--- | :--- |
| \`insert(0, "x")\` | \`['x', 1, 2, 3]\` | before the first item |
| \`insert(1, "x")\` | \`[1, 'x', 2, 3]\` | before index 1 |
| \`insert(100, "x")\` | \`[1, 2, 3, 'x']\` | position clamped to the end |
| \`insert(-1, "x")\` | \`[1, 2, 'x', 3]\` | before the last item |

In the run, \`e = [1, 2, 3]\` followed by \`insert(100, "end")\` and \`insert(-1, "before-last")\` gave \`[1, 2, 3, 'before-last', 'end']\`: the clamped item went at the end, then the negative position put the next one just before it.

### All three return None

\`result = f.append(2)\` leaves \`result\` as \`None\`. This follows a Python convention — built-in methods that mutate in place return \`None\`, so you cannot confuse them with methods that return a new object — and it is why \`a = a.append(x)\` replaces your list with \`None\`. Compare \`sorted(a)\` (new list) with \`a.sort()\` (in place, returns \`None\`) in [sorted vs sort](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort).

## 3. They Are All Slice Assignments in Disguise

Each method is equivalent to a [slice assignment](/interview-question/how-does-slicing-with-start-stop-step-work):

| Method | Same as |
| :--- | :--- |
| \`a.append(x)\` | \`a[len(a):] = [x]\` |
| \`a.extend(it)\` | \`a[len(a):] = it\` |
| \`a.insert(i, x)\` | \`a[i:i] = [x]\` |

The first example checks all three equivalences and they all print \`True\`. The slice form is useful when you want to insert **several** items in the middle in one move: \`a[i:i] = items\`.

## 4. \`+=\` Versus \`+\`

📌 **Interview term: Augmented assignment** — an operator like \`+=\`. For lists, \`a += b\` calls \`a.extend(b)\` and keeps the same list object.

📌 **Interview term: Aliasing** — two names referring to the same object, so a change through one name is visible through the other.

~~~python
g = [1, 2]
alias = g
g += (3, 4)
print(alias)  # [1, 2, 3, 4]
h = [1, 2]
alias_h = h
h = h + [3]
print(alias_h, h)  # [1, 2] [1, 2, 3]
~~~

\`+=\` changed the list that \`alias\` also points to, and it accepted a tuple. \`h + [3]\` built a **new** list and rebound only \`h\`; \`h + (4, 5)\` raises \`TypeError: can only concatenate list (not "tuple") to list\`. The name-versus-object model behind this is in [names and references](/interview-question/how-does-python-s-name-and-object-reference-model-work).

The famous edge case: \`t = ([1],)\` then \`t[0] += [2]\`. The list inside is extended first, **then** Python tries to store the result back into the tuple, which fails. You get a \`TypeError\` **and** the tuple now prints as \`([1, 2],)\` — both are in the verified output.

## 5. What It Costs, and What CPython Does Underneath

A CPython list is a resizable array of **pointers** to objects. Appending a huge object writes one pointer; it never copies the object (the run checks that \`["alpha"] * 3\` holds the same object three times).

📌 **Interview term: Over-allocation** — when the array is full, CPython allocates more slots than needed right now, so the next several appends need no resize.

The second example measures the slot count with \`sys.getsizeof\` (header size subtracted, divided by the pointer size, so it works on both 64-bit and 32-bit builds):

~~~text
len  1 -> 4 slots
len  5 -> 8 slots
len  9 -> 16 slots
len 17 -> 24 slots
len 25 -> 32 slots
len 33 -> 40 slots
~~~

Forty appends, six resizes. On our 64-bit run, \`sys.getsizeof([])\` was 56 bytes and each slot was 8 bytes. The full story of the growth formula is in [how a list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).

📌 **Interview term: Amortised O(1)** — an operation that is occasionally expensive (a resize copies all pointers) but constant-time on average over a long run of operations.

\`insert(0, x)\` is different. There is no spare room at the **front**, so every existing pointer must move one slot right:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="insert at position 0 shifts every existing item one slot to the right before writing the new item">
  <defs>
    <marker id="py03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="50">before</text>
  <rect class="d-box" x="190" y="20" width="70" height="46" rx="6"/>
  <text class="d-text" x="225" y="49" text-anchor="middle">a</text>
  <rect class="d-box" x="270" y="20" width="70" height="46" rx="6"/>
  <text class="d-text" x="305" y="49" text-anchor="middle">b</text>
  <rect class="d-box" x="350" y="20" width="70" height="46" rx="6"/>
  <text class="d-text" x="385" y="49" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="430" y="20" width="70" height="46" rx="6"/>
  <text class="d-sub" x="465" y="49" text-anchor="middle">spare</text>
  <path class="d-edge-dashed" d="M 225 72 L 290 146" marker-end="url(#py03q3-arrow)"/>
  <path class="d-edge-dashed" d="M 305 72 L 370 146" marker-end="url(#py03q3-arrow)"/>
  <path class="d-edge-dashed" d="M 385 72 L 450 146" marker-end="url(#py03q3-arrow)"/>
  <text class="d-sub" x="20" y="180">insert(0, z)</text>
  <rect class="d-box-accent" x="190" y="150" width="70" height="46" rx="6"/>
  <text class="d-text" x="225" y="179" text-anchor="middle">z</text>
  <rect class="d-box" x="270" y="150" width="70" height="46" rx="6"/>
  <text class="d-text" x="305" y="179" text-anchor="middle">a</text>
  <rect class="d-box" x="350" y="150" width="70" height="46" rx="6"/>
  <text class="d-text" x="385" y="179" text-anchor="middle">b</text>
  <rect class="d-box" x="430" y="150" width="70" height="46" rx="6"/>
  <text class="d-text" x="465" y="179" text-anchor="middle">c</text>
  <text class="d-sub" x="570" y="110" text-anchor="middle">n moves</text>
</svg>

On our run (CPython 3.11, timing n operations on an empty list):

| n | n appends | n \`insert(0, x)\` |
| :--- | :--- | :--- |
| 50,000 | 0.0019 s | 0.47 s |
| 100,000 | 0.0037 s | 2.07 s |
| 200,000 | 0.0079 s | 7.22 s |

Appends scale linearly; front inserts roughly quadruple when n doubles — quadratic in total, because each insert is O(n). Timings depend on the machine; the example program instead counts the item moves, which are exact: 499,500 for 1,000 front inserts and 7,998,000 for 4,000.

| Operation | Cost | Note |
| :--- | :--- | :--- |
| \`append(x)\` | amortised O(1) | |
| \`extend(it)\` | O(k) for k new items | a sized iterable reserves room once (capacity 40 after \`extend(range(40))\`) |
| \`insert(i, x)\` | O(n - i) | O(n) at the front, O(1) at the end |
| \`a + b\` | O(len(a) + len(b)) | new list |

For a queue or anything that adds at the front, use \`collections.deque\`, whose \`appendleft\` is O(1) — see [how deque works](/interview-question/how-does-collections-deque-work-internally).

## 6. Verified: Running the Code

Both programs ran on python3.11 and in the page runner with identical output; the \`# comment\` after each \`print\` is an in-page test that passed.

**Example 1 — append, extend, insert, \`+=\` and the tuple gotcha:**

~~~python
# append adds ONE item: whatever you pass becomes the last element
a = [1, 2]
a.append([3, 4])
print(a)  # [1, 2, [3, 4]]
print(len(a))  # 3

# extend adds EACH item of an iterable
b = [1, 2]
b.extend([3, 4])
print(b)  # [1, 2, 3, 4]

# extend takes any iterable: a string adds its characters
c = ["x"]
c.extend("hi")
print(c)
c.extend(range(2))
print(c)  # ['x', 'h', 'i', 0, 1]

# insert(i, x) puts x BEFORE position i
d = ["a", "c"]
d.insert(1, "b")
print(d)
d.insert(0, "start")
print(d)  # ['start', 'a', 'b', 'c']

# Out-of-range positions clamp; negative positions count from the end
e = [1, 2, 3]
e.insert(100, "end")
e.insert(-1, "before-last")
print(e)  # [1, 2, 3, 'before-last', 'end']

# All three mutate in place and return None
f = [1]
result = f.append(2)
print(result)  # None

# += on a list is extend (in place); + builds a new list
g = [1, 2]
alias = g
g += (3, 4)
print(alias)  # [1, 2, 3, 4]
h = [1, 2]
alias_h = h
h = h + [3]
print(alias_h, h)  # [1, 2] [1, 2, 3]
try:
    h = h + (4, 5)
except TypeError as err:
    print("TypeError:", err)

# Each method is shorthand for a slice assignment
p, q, r = [1, 2], [1, 2], [1, 2]
p.append(9); q[len(q):] = [9]
print(p == q)  # True
p.extend("ab"); q[len(q):] = "ab"
print(p == q)  # True
p.insert(1, 0); q[1:1] = [0]
print(p, p == q)  # [1, 0, 2, 9, 'a', 'b'] True

# Gotcha: += on a list stored in a tuple mutates, THEN raises
t = ([1],)
try:
    t[0] += [2]
except TypeError as err:
    print("TypeError:", err)
print(t)  # ([1, 2],)
~~~

~~~text
[1, 2, [3, 4]]
3
[1, 2, 3, 4]
['x', 'h', 'i']
['x', 'h', 'i', 0, 1]
['a', 'b', 'c']
['start', 'a', 'b', 'c']
[1, 2, 3, 'before-last', 'end']
None
[1, 2, 3, 4]
[1, 2] [1, 2, 3]
TypeError: can only concatenate list (not "tuple") to list
True
True
[1, 0, 2, 9, 'a', 'b'] True
TypeError: 'tuple' object does not support item assignment
([1, 2],)
~~~

**Example 2 — over-allocation and the cost of front inserts:**

~~~python
# How CPython grows a list: it over-allocates so most appends are cheap
import struct
import sys

PTR = struct.calcsize("P")       # bytes per slot (8 on 64-bit, 4 on wasm32)
EMPTY = sys.getsizeof([])        # the list header without any slots

def capacity(lst):
    """Number of slots CPython has allocated for this list."""
    return (sys.getsizeof(lst) - EMPTY) // PTR

lst = []
history = []
for i in range(40):
    lst.append(i)
    cap = capacity(lst)
    if not history or history[-1][1] != cap:
        history.append((len(lst), cap))

print("len -> capacity when a resize happened:")
for length, cap in history:
    print(f"  len {length:2d} -> {cap} slots")
print("resizes for 40 appends:", len(history))

# extend with a sized iterable reserves room in one step
e = []
e.extend(range(40))
print("capacity after extend(range(40)):", capacity(e))

# A list of n pointers, not n objects: the items live elsewhere
words = ["alpha"] * 3
print(all(w is words[0] for w in words))  # True

# insert(0, x) has to shift every existing slot one place right.
# Count the shifts a naive pure-Python insert would perform:
def shifts_for_front_inserts(n):
    moves = 0
    size = 0
    for _ in range(n):
        moves += size       # every current item moves one slot
        size += 1
    return moves

for n in (1_000, 2_000, 4_000):
    print(f"{n} front inserts -> {shifts_for_front_inserts(n):,} item moves")
print("appends need 0 moves; deque.appendleft is the O(1) front insert")
~~~

~~~text
len -> capacity when a resize happened:
  len  1 -> 4 slots
  len  5 -> 8 slots
  len  9 -> 16 slots
  len 17 -> 24 slots
  len 25 -> 32 slots
  len 33 -> 40 slots
resizes for 40 appends: 6
capacity after extend(range(40)): 40
True
1000 front inserts -> 499,500 item moves
2000 front inserts -> 1,999,000 item moves
4000 front inserts -> 7,998,000 item moves
appends need 0 moves; deque.appendleft is the O(1) front insert
~~~

## Common Pitfalls

- **\`append\` when you meant \`extend\`.** You get a nested list and a length off by many; \`len\` and loops then behave strangely.
- **\`extend\` with a string.** \`names.extend("bob")\` adds \`'b'\`, \`'o'\`, \`'b'\`.
- **Assigning the return value.** \`a = a.append(x)\` sets \`a\` to \`None\`.
- **Using a list as a queue.** \`insert(0, x)\` and \`pop(0)\` are O(n); a \`deque\` makes both ends O(1).
- **Surprised aliases after \`+=\`.** \`+=\` mutates in place, so a list passed into a function or shared between names changes for everyone; use \`a = a + b\` if you need a new list.
- **Inserting in a loop to build a reversed list.** Append, then call \`reverse()\` once (or slice \`[::-1]\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One item vs many:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append(x)</code> adds <strong style="color:#ffca28;">one</strong> item, whatever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend(iterable)</code> adds <strong style="color:#ffca28;">each</strong> item of the iterable; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(i, x)</code> adds one item before position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic example:</strong> <span style="color:#f0e2c8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append([3, 4])</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, [3, 4]]</code> (length 3); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend([3, 4])</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. They return None:</strong> <span style="color:#f0e2c8;">All three change the list in place and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, so never write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = a.append(x)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. += and +:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a += b</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend</code>: in place, any iterable, aliases see it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> makes a new list and needs another list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> is amortised O(1) because CPython over-allocates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(0, x)</code> is O(n) since every item shifts — use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.appendleft</code> for a queue.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a.extend("hi")</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A string is an iterable of characters, so it adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'h'</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'i'</code> as two items. If you meant to add the word, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append("hi")</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend(["hi"])</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">append</code> O(1) if the list sometimes has to grow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CPython allocates spare slots. In our run, 40 appends to an empty list resized only 6 times (capacities 4, 8, 16, 24, 32, 40). Most appends just fill a spare slot; the occasional copy is spread over many cheap appends, which is what <strong style="color:#ffca28;">amortised</strong> O(1) means.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a.insert(100, x)</code> on a 3-item list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing breaks: the position is clamped, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> goes at the end. Negative positions count from the end, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(-1, x)</code> puts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> just before the last item.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a += b</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a = a + b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend</code> and mutates the existing list, so every other name pointing to it sees the change. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = a + b</code> builds a new list and rebinds only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> also accepts any iterable, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> for a tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add many items at the front or in the middle efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use slice assignment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i:i] = items</code> to shift once instead of k times, or switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> if items are added at both ends repeatedly.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-place mutation** | Changing an existing object instead of making a new one |
| **Iterable** | Anything you can loop over: list, tuple, string, range, generator, dict |
| **Over-allocation** | Reserving spare slots so future appends need no resize |
| **Amortised O(1)** | Constant cost on average over many operations, despite rare expensive ones |
| **Augmented assignment** | \`a += b\`: for lists it calls \`extend\` in place |
| **Aliasing** | Two names referring to the same object |

---
**Conclusion:** \`append\` adds one object, \`extend\` adds every item of an iterable, and \`insert\` adds one object at a chosen position; all three edit the list in place and return \`None\`. \`a += b\` is \`extend\` in disguise (in place, any iterable), while \`a + b\` builds a new list. The costs follow from CPython storing a list as an over-allocated array of pointers: appending at the end is amortised O(1) — 40 appends needed only 6 resizes in our run — while inserting at the front shifts every item, which is why front-heavy code should use \`collections.deque\`.`,
    examples: [
      {
        label: "append vs extend vs insert, += vs +, and the tuple += gotcha",
        code: `# append adds ONE item: whatever you pass becomes the last element
a = [1, 2]
a.append([3, 4])
print(a)  # [1, 2, [3, 4]]
print(len(a))  # 3

# extend adds EACH item of an iterable
b = [1, 2]
b.extend([3, 4])
print(b)  # [1, 2, 3, 4]

# extend takes any iterable: a string adds its characters
c = ["x"]
c.extend("hi")
print(c)
c.extend(range(2))
print(c)  # ['x', 'h', 'i', 0, 1]

# insert(i, x) puts x BEFORE position i
d = ["a", "c"]
d.insert(1, "b")
print(d)
d.insert(0, "start")
print(d)  # ['start', 'a', 'b', 'c']

# Out-of-range positions clamp; negative positions count from the end
e = [1, 2, 3]
e.insert(100, "end")
e.insert(-1, "before-last")
print(e)  # [1, 2, 3, 'before-last', 'end']

# All three mutate in place and return None
f = [1]
result = f.append(2)
print(result)  # None

# += on a list is extend (in place); + builds a new list
g = [1, 2]
alias = g
g += (3, 4)
print(alias)  # [1, 2, 3, 4]
h = [1, 2]
alias_h = h
h = h + [3]
print(alias_h, h)  # [1, 2] [1, 2, 3]
try:
    h = h + (4, 5)
except TypeError as err:
    print("TypeError:", err)

# Each method is shorthand for a slice assignment
p, q, r = [1, 2], [1, 2], [1, 2]
p.append(9); q[len(q):] = [9]
print(p == q)  # True
p.extend("ab"); q[len(q):] = "ab"
print(p == q)  # True
p.insert(1, 0); q[1:1] = [0]
print(p, p == q)  # [1, 0, 2, 9, 'a', 'b'] True

# Gotcha: += on a list stored in a tuple mutates, THEN raises
t = ([1],)
try:
    t[0] += [2]
except TypeError as err:
    print("TypeError:", err)
print(t)  # ([1, 2],)`,
      },
      {
        label: "Measuring over-allocation and the cost of front inserts",
        code: `# How CPython grows a list: it over-allocates so most appends are cheap
import struct
import sys

PTR = struct.calcsize("P")       # bytes per slot (8 on 64-bit, 4 on wasm32)
EMPTY = sys.getsizeof([])        # the list header without any slots

def capacity(lst):
    """Number of slots CPython has allocated for this list."""
    return (sys.getsizeof(lst) - EMPTY) // PTR

lst = []
history = []
for i in range(40):
    lst.append(i)
    cap = capacity(lst)
    if not history or history[-1][1] != cap:
        history.append((len(lst), cap))

print("len -> capacity when a resize happened:")
for length, cap in history:
    print(f"  len {length:2d} -> {cap} slots")
print("resizes for 40 appends:", len(history))

# extend with a sized iterable reserves room in one step
e = []
e.extend(range(40))
print("capacity after extend(range(40)):", capacity(e))

# A list of n pointers, not n objects: the items live elsewhere
words = ["alpha"] * 3
print(all(w is words[0] for w in words))  # True

# insert(0, x) has to shift every existing slot one place right.
# Count the shifts a naive pure-Python insert would perform:
def shifts_for_front_inserts(n):
    moves = 0
    size = 0
    for _ in range(n):
        moves += size       # every current item moves one slot
        size += 1
    return moves

for n in (1_000, 2_000, 4_000):
    print(f"{n} front inserts -> {shifts_for_front_inserts(n):,} item moves")
print("appends need 0 moves; deque.appendleft is the O(1) front insert")`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you work with dictionaries (get, setdefault, items, merging)?",
    difficulty: "easy",
    seoDescription: "Python dict methods explained: get vs [], setdefault vs defaultdict, items and live views, and merging with |, update and ** unpacking.",
    description: `**Question presented to candidate:**
"Walk me through the everyday dictionary toolkit in Python. How do you read a key that might be missing, group items into lists, loop over keys and values, and merge two dictionaries — and which of those have traps?"

**What a strong answer should cover:**
- \`d[key]\` raises \`KeyError\`; \`d.get(key, default)\` returns a default instead, and \`d.get(k) or x\` is wrong when the stored value is falsy. \`in\` tests keys, not values.
- \`setdefault(key, default)\` returns the value and inserts the default first if the key is missing — the classic grouping idiom — but the default expression is evaluated on every call; \`collections.defaultdict\` calls its factory only for missing keys.
- \`keys()\`, \`values()\` and \`items()\` return live **views**; \`items()\` is how you loop over key/value pairs; key views support set operations; deleting while iterating raises \`RuntimeError\`.
- Merging: \`{**a, **b}\`, \`a | b\` (Python 3.9, PEP 584), \`a |= b\` and \`update()\` — the right-hand side wins, merging is shallow, and \`|\` needs a mapping on the right while \`|=\`/\`update\` also take an iterable of key/value pairs.
- Dicts keep insertion order (a language guarantee since 3.7); overwriting a key keeps its position, \`popitem\` removes the last item, \`dict.fromkeys\` shares one value object.

**Code / implementation expected:** Yes — a word-grouping or counting snippet, and a config merge with defaults overridden by user values.`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — no prior knowledge assumed beyond variables and lists.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 and the page runner (Pyodide 0.25.1 = CPython 3.11.3). The \`|\` and \`|=\` operators need Python 3.9 or newer.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` — the precise word an interviewer expects you to use. Every output shown was produced by actually running the code on CPython 3.11 and in the page runner (Pyodide 0.25.1, which is CPython 3.11.3); the **Verified** section quotes that run exactly.

## 1. Why This Even Matters — A Story First

A dictionary is a cloakroom. You hand in your coat and get a ticket number; later you show the ticket and get exactly your coat back, instantly, without anyone searching the racks. The ticket is the **key**, the coat is the **value**. Real programs are full of cloakrooms: settings by name, users by id, word counts, cached results. The interesting questions are the awkward cases — what happens when someone shows a ticket that does not exist, how you collect several coats under one ticket, and how you combine two cloakrooms when both used ticket 7. That is what this question is about.

📌 **Interview term: Key / value** — a dict maps each **hashable** key to one value. Keys are unique; looking one up is O(1) on average because a dict is a hash table — the internals are in [how dicts are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered).

## 2. Reading a Key That Might Be Missing

📌 **Interview term: KeyError** — the exception \`d[key]\` raises when the key is not present.

~~~python
stock = {"apple": 3, "pear": 0}
print(stock["apple"])  # 3
print(stock.get("kiwi"))  # None
print(stock.get("kiwi", 0))  # 0
~~~

\`get(key, default)\` never raises; with no default it returns \`None\`. Choose by intent: if a missing key is a **bug**, \`d[key]\` and its \`KeyError\` tell you so loudly; if it is normal, use \`get\`. (This is the EAFP versus LBYL choice in [its own question](/interview-question/what-is-eafp-vs-lbyl-in-python).)

The trap is the \`or\` shortcut:

~~~python
print(stock.get("pear") or 99)  # 99
print(stock.get("pear", 99))  # 0
~~~

\`pear\` **is** in stock with value \`0\`, but \`0\` is falsy, so \`or\` throws it away. Pass the default to \`get\` instead. Which values count as falsy is covered in [falsy values](/interview-question/what-values-are-falsy-in-python).

\`in\` checks **keys**: \`"pear" in stock\` is \`True\`, \`3 in stock\` is \`False\` even though 3 is a value. Use \`3 in stock.values()\` for values (that one is a linear scan).

## 3. setdefault and defaultdict: Grouping Values

📌 **Interview term: Default value** — the fallback object used for a missing key: returned by \`get\`, stored and returned by \`setdefault\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="setdefault checks whether the key exists, if not it stores the default, then it always returns the stored value">
  <defs>
    <marker id="py03q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="170" height="56" rx="10"/>
  <text class="d-text" x="105" y="106" text-anchor="middle">setdefault(k, v)</text>
  <text class="d-sub" x="105" y="126" text-anchor="middle">v already built</text>
  <rect class="d-box" x="260" y="80" width="150" height="56" rx="10"/>
  <text class="d-text" x="335" y="113" text-anchor="middle">k in d ?</text>
  <rect class="d-box" x="260" y="0" width="150" height="50" rx="10"/>
  <text class="d-sub" x="335" y="30" text-anchor="middle">no: d[k] = v</text>
  <rect class="d-box-accent" x="490" y="80" width="190" height="56" rx="10"/>
  <text class="d-text" x="585" y="106" text-anchor="middle">return d[k]</text>
  <text class="d-sub" x="585" y="126" text-anchor="middle">the stored object</text>
  <path class="d-edge" d="M 194 108 L 254 108" marker-end="url(#py03q4-arrow2)"/>
  <path class="d-edge-dashed" d="M 335 76 L 335 56" marker-end="url(#py03q4-arrow2)"/>
  <path class="d-edge-dashed" d="M 414 25 L 585 25 L 585 74" marker-end="url(#py03q4-arrow2)"/>
  <path class="d-edge-accent" d="M 414 108 L 484 108" marker-end="url(#py03q4-arrow2)"/>
  <text class="d-sub" x="450" y="96" text-anchor="middle">yes</text>
</svg>

\`setdefault(k, v)\` returns the value for \`k\`; if \`k\` is missing it first stores \`v\`. Because it returns the **stored** object, you can mutate it in the same expression:

~~~python
groups = {}
for word in ["ant", "bee", "asp", "bat", "cow"]:
    groups.setdefault(word[0], []).append(word)
print(groups)  # {'a': ['ant', 'asp'], 'b': ['bee', 'bat'], 'c': ['cow']}
~~~

The cost hidden in that line: Python evaluates the arguments **before** calling \`setdefault\`, so the default object is built on every call, even when the key already exists. The first example passes a counting factory and reports \`factory ran 3 times\` for a key that was present all along. For an empty list that is cheap; for an expensive object it is waste.

📌 **Interview term: defaultdict** — a \`dict\` subclass from \`collections\` that calls a factory (like \`list\` or \`int\`) to create a value only when a missing key is read.

~~~python
from collections import defaultdict
dd = defaultdict(list)
dd["x"].append(1)
print(dict(dd))  # {'x': [1]}
~~~

\`defaultdict(int)\` is the counting version; for counting, \`collections.Counter\` is even more direct. All three tools are compared in [the collections module](/interview-question/what-useful-types-does-the-collections-module-provide).

## 4. items(), keys(), values(): Views, Not Copies

📌 **Interview term: Dictionary view** — the object returned by \`keys()\`, \`values()\` or \`items()\`: a live window onto the dict that reflects later changes.

~~~python
prices = {"tea": 2, "cake": 5}
view = prices.items()
prices["jam"] = 4
print(list(view))  # [('tea', 2), ('cake', 5), ('jam', 4)]
~~~

The view was created before \`jam\` was added and still shows it. Loop over key/value pairs with \`for name, price in prices.items():\` — that uses [iterable unpacking](/interview-question/how-does-iterable-unpacking-work) on each pair.

Key views behave like sets: \`a.keys() & b.keys()\` gives the common keys (\`['y']\` in the run, sorted for a stable print) and \`a.keys() - b.keys()\` the keys only in \`a\`.

You may change **values** while looping, but not add or remove keys: the run shows \`RuntimeError: dictionary changed size during iteration\`. Loop over \`list(d)\` (a snapshot of the keys) or build a new dict with a [comprehension](/interview-question/what-are-list-dict-set-comprehensions): \`{k: v for k, v in d.items() if v}\`.

## 5. Merging Dictionaries

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Merging defaults with user settings, keys from the right side replace values from the left side and order follows the left dict">
  <defs>
    <marker id="py03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="130" y="30" text-anchor="middle">defaults</text>
  <rect class="d-box" x="30" y="44" width="200" height="40" rx="6"/>
  <text class="d-sub" x="130" y="69" text-anchor="middle">host: localhost</text>
  <rect class="d-box" x="30" y="94" width="200" height="40" rx="6"/>
  <text class="d-sub" x="130" y="119" text-anchor="middle">port: 80</text>
  <rect class="d-box" x="30" y="144" width="200" height="40" rx="6"/>
  <text class="d-sub" x="130" y="169" text-anchor="middle">debug: False</text>
  <text class="d-text" x="130" y="224" text-anchor="middle">user</text>
  <rect class="d-box-accent" x="30" y="238" width="95" height="40" rx="6"/>
  <text class="d-sub" x="77" y="263" text-anchor="middle">port: 8080</text>
  <rect class="d-box-accent" x="135" y="238" width="95" height="40" rx="6"/>
  <text class="d-sub" x="182" y="263" text-anchor="middle">debug: True</text>
  <path class="d-edge" d="M 240 114 L 420 114" marker-end="url(#py03q4-arrow)"/>
  <path class="d-edge-accent" d="M 240 258 L 330 258 L 330 150 L 420 150" marker-end="url(#py03q4-arrow)"/>
  <text class="d-sub" x="560" y="30" text-anchor="middle">defaults | user</text>
  <rect class="d-box" x="440" y="44" width="240" height="40" rx="6"/>
  <text class="d-sub" x="560" y="69" text-anchor="middle">host: localhost</text>
  <rect class="d-box-accent" x="440" y="94" width="240" height="40" rx="6"/>
  <text class="d-sub" x="560" y="119" text-anchor="middle">port: 8080</text>
  <rect class="d-box-accent" x="440" y="144" width="240" height="40" rx="6"/>
  <text class="d-sub" x="560" y="169" text-anchor="middle">debug: True</text>
</svg>

Four spellings, one rule: **the right-hand side wins** on keys both sides have.

| Spelling | New dict or in place? | Right-hand side may be | Since |
| :--- | :--- | :--- | :--- |
| \`{**a, **b}\` | new | any mapping | 3.5 (unpacking in displays) |
| \`a \\| b\` | new | a mapping, not a list of pairs | 3.9 |
| \`a \\|= b\` | in place | mapping or iterable of pairs | 3.9 |
| \`a.update(b, key=value)\` | in place | mapping, iterable of pairs, keywords | always |

The \`|\` and \`|=\` operators were added in Python 3.9 by [PEP 584](https://peps.python.org/pep-0584/) (listed in the [3.9 What's New](https://docs.python.org/3/whatsnew/3.9.html)). \`**\` unpacking inside a dict display came earlier, in Python 3.5 with [PEP 448](https://peps.python.org/pep-0448/), which also states that later values override earlier ones.

From the run: \`defaults | user\` gives \`{'host': 'localhost', 'port': 8080, 'debug': True}\`, while \`user | defaults\` gives \`{'port': 80, 'debug': False, 'host': 'localhost'}\` — the winner changes, **and** the key order follows whichever dict came first. \`defaults | [("port", 1)]\` raises \`TypeError: unsupported operand type(s) for |: 'dict' and 'list'\`, but \`cfg2 |= [("port", 9000)]\` works.

📌 **Interview term: Shallow merge** — only top-level keys are combined. If both sides have a nested dict under the same key, the right one **replaces** the left one entirely: \`base | override\` turned \`{'db': {'user': 'app', 'pool': 5}}\` into \`{'db': {'pool': 20}}\`. The second example shows a ten-line recursive \`deep_merge\` that gives \`{'db': {'user': 'app', 'pool': 20}}\`.

## 6. Order and the Smaller Methods

📌 **Interview term: Insertion order** — dicts iterate in the order keys were first inserted. The [3.7 What's New](https://docs.python.org/3/whatsnew/3.7.html) declares this "an official part of the Python language spec".

- Overwriting a key keeps its original position: after \`order["b"] = 99\`, \`list(order)\` is still \`['b', 'a', 'c']\`.
- \`pop(key, default)\` removes and returns a value without raising if you pass a default.
- \`popitem()\` removes the **last** inserted pair — \`('z', 3)\` in the run.

📌 **Interview term: LIFO** — last in, first out; the order in which \`popitem\` hands items back.

- \`dict.fromkeys(keys, value)\` uses the **same** value object for every key. With a list that means \`{'a': [1], 'b': [1]}\` after appending to one; use a comprehension to get separate lists.
- Equality ignores order: \`{"a": 1, "b": 2} == {"b": 2, "a": 1}\` is \`True\` (use \`collections.OrderedDict\` if order must matter in comparisons).

## 7. Verified: Running the Code

Both programs ran on python3.11 and in the page runner with identical output; every \`# comment\` after a \`print\` is an in-page test that passed.

**Example 1 — get, setdefault, defaultdict, views and safe deletion:**

~~~python
# Reading safely: [] raises, get returns a default
stock = {"apple": 3, "pear": 0}
print(stock["apple"])  # 3
try:
    stock["kiwi"]
except KeyError as e:
    print("KeyError:", e)
print(stock.get("kiwi"))  # None
print(stock.get("kiwi", 0))  # 0

# get(...) or default is a trap when the stored value is falsy
print(stock.get("pear") or 99)  # 99
print(stock.get("pear", 99))  # 0

# "in" checks keys, not values
print("pear" in stock, 3 in stock)  # True False

# setdefault: return the value, inserting the default first if missing
groups = {}
for word in ["ant", "bee", "asp", "bat", "cow"]:
    groups.setdefault(word[0], []).append(word)
print(groups)  # {'a': ['ant', 'asp'], 'b': ['bee', 'bat'], 'c': ['cow']}

# The default argument is built on EVERY call, even when the key exists
calls = 0
def fresh():
    global calls
    calls += 1
    return []
cache = {"k": [1]}
for _ in range(3):
    cache.setdefault("k", fresh())
print("factory ran", calls, "times")

# defaultdict calls its factory only for missing keys
from collections import defaultdict
dd = defaultdict(list)
dd["x"].append(1)
print(dict(dd))  # {'x': [1]}

# items(), keys() and values() are live views, not copies
prices = {"tea": 2, "cake": 5}
view = prices.items()
prices["jam"] = 4
print(list(view))  # [('tea', 2), ('cake', 5), ('jam', 4)]

# Iterate with items() to get key and value together
for name, price in prices.items():
    print(f"{name:>5}: {price}")

# keys() views support set operations
a = {"x": 1, "y": 2}
b = {"y": 20, "z": 30}
print(sorted(a.keys() & b.keys()))  # ['y']
print(sorted(a.keys() - b.keys()))  # ['x']

# Changing the size while iterating is an error; iterate over a copy
d = {"a": 1, "b": 0, "c": 0}
try:
    for k in d:
        if d[k] == 0:
            del d[k]
except RuntimeError as e:
    print("RuntimeError:", e)
d2 = {"a": 1, "b": 0, "c": 0}
for k in list(d2):
    if d2[k] == 0:
        del d2[k]
print(d2)  # {'a': 1}
~~~

~~~text
3
KeyError: 'kiwi'
None
0
99
0
True False
{'a': ['ant', 'asp'], 'b': ['bee', 'bat'], 'c': ['cow']}
factory ran 3 times
{'x': [1]}
[('tea', 2), ('cake', 5), ('jam', 4)]
  tea: 2
 cake: 5
  jam: 4
['y']
['x']
RuntimeError: dictionary changed size during iteration
{'a': 1}
~~~

**Example 2 — merging, deep merge, order, pop/popitem and fromkeys:**

~~~python
# Four ways to merge; in every one the right-hand side wins on conflicts
defaults = {"host": "localhost", "port": 80, "debug": False}
user = {"port": 8080, "debug": True}

print({**defaults, **user})  # {'host': 'localhost', 'port': 8080, 'debug': True}
print(defaults | user)  # {'host': 'localhost', 'port': 8080, 'debug': True}
print(user | defaults)  # {'port': 80, 'debug': False, 'host': 'localhost'}

# update and |= change the left dict in place
cfg = dict(defaults)
cfg.update(user, timeout=5)
print(cfg)  # {'host': 'localhost', 'port': 8080, 'debug': True, 'timeout': 5}
cfg2 = dict(defaults)
cfg2 |= [("port", 9000)]
print(cfg2)  # {'host': 'localhost', 'port': 9000, 'debug': False}

# | needs a dict on both sides; |= and update accept key/value pairs
try:
    defaults | [("port", 1)]
except TypeError as e:
    print("TypeError:", e)

# Merging is shallow: nested dicts are shared, not merged
base = {"db": {"user": "app", "pool": 5}}
override = {"db": {"pool": 20}}
print(base | override)  # {'db': {'pool': 20}}

def deep_merge(left, right):
    out = dict(left)
    for key, value in right.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out
print(deep_merge(base, override))  # {'db': {'user': 'app', 'pool': 20}}

# Order: insertion order is kept; overwriting a key keeps its old position
order = {"b": 1, "a": 2}
order["b"] = 99
order["c"] = 3
print(list(order))  # ['b', 'a', 'c']

# pop with a default never raises; popitem removes the LAST item (LIFO)
inv = {"x": 1, "y": 2, "z": 3}
print(inv.pop("missing", "n/a"))
print(inv.popitem())
print(inv)

# fromkeys shares ONE value object between all keys
shared = dict.fromkeys(["a", "b"], [])
shared["a"].append(1)
print(shared)  # {'a': [1], 'b': [1]}
separate = {k: [] for k in ["a", "b"]}
separate["a"].append(1)
print(separate)  # {'a': [1], 'b': []}

# Equality ignores order for dict, unlike for lists
print({"a": 1, "b": 2} == {"b": 2, "a": 1})  # True
~~~

~~~text
{'host': 'localhost', 'port': 8080, 'debug': True}
{'host': 'localhost', 'port': 8080, 'debug': True}
{'port': 80, 'debug': False, 'host': 'localhost'}
{'host': 'localhost', 'port': 8080, 'debug': True, 'timeout': 5}
{'host': 'localhost', 'port': 9000, 'debug': False}
TypeError: unsupported operand type(s) for |: 'dict' and 'list'
{'db': {'pool': 20}}
{'db': {'user': 'app', 'pool': 20}}
['b', 'a', 'c']
n/a
('z', 3)
{'x': 1, 'y': 2}
{'a': [1], 'b': [1]}
{'a': [1], 'b': []}
True
~~~

## 8. Cost Table

| Operation | Average cost |
| :--- | :--- |
| \`d[k]\`, \`d.get(k)\`, \`k in d\`, \`d[k] = v\`, \`del d[k]\` | O(1) |
| \`v in d.values()\` | O(n) |
| \`a \\| b\`, \`{**a, **b}\` | O(len(a) + len(b)) — copies both |
| \`a.update(b)\`, \`a \\|= b\` | O(len(b)) |
| iterating \`items()\` | O(n) |

## Common Pitfalls

- **\`d.get(k) or default\`.** Drops legitimate falsy values like \`0\`, \`""\` or \`[]\`; use \`d.get(k, default)\`.
- **Expensive defaults in \`setdefault\`.** The default is built on every call; use \`defaultdict\` or an \`if k not in d\` check.
- **\`defaultdict\` reads that insert.** \`if dd["missing"]:\` adds \`"missing"\` to the dict; use \`"missing" in dd\` or \`dd.get("missing")\` to test.
- **Thinking \`|\` deep-merges.** Nested dicts are replaced, not combined.
- **Changing size while iterating.** Iterate over \`list(d)\` or build a new dict.
- **\`dict.fromkeys(keys, [])\`.** Every key shares one list.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reading:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[k]</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyError</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d.get(k, default)</code> returns a default. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get(k, x)</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get(k) or x</code>, because a stored <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code> is falsy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Grouping:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d.setdefault(k, []).append(v)</code> inserts the list only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is missing — but builds the default on every call; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code> builds it only when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Looping:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for k, v in d.items()</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keys()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items()</code> are live <strong style="color:#ffca28;">views</strong>, key views support <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-</code>, and you must not add or delete keys while iterating.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Merging:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a | b</code> (3.9+), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{**a, **b}</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.update(b)</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a |= b</code>: the right side wins, the merge is shallow, and order follows first insertion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Order:</strong> <span style="color:#f0e2c8;">Dicts keep insertion order as a language guarantee since 3.7; overwriting a value keeps the key in place and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem()</code> removes the last item.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setdefault</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defaultdict</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setdefault</code> works on any plain dict and keeps it a plain dict, which is handy for one-off grouping or for dicts you return to callers. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict</code> is cleaner for heavy use and avoids building a throwaway default each call, but reading a missing key <strong style="color:#ffca28;">inserts</strong> it, which can surprise callers — convert with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict(dd)</code> before returning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a | b</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a.update(b)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a | b</code> returns a <strong style="color:#ffca28;">new</strong> dict and needs a mapping on the right; a list of pairs raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|=</code> change <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> in place and also accept an iterable of key/value pairs or keyword arguments. In all of them the right-hand values win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you merge nested dictionaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None of the built-ins merge recursively: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">base | override</code> replaces the whole <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">db</code> sub-dict. Write a small recursive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deep_merge</code> that descends when both sides hold dicts, as in the second example.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does deleting keys inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for k in d</code> fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dict detects that its size changed during iteration and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError: dictionary changed size during iteration</code>. Iterate over a snapshot with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(d)</code> or build a new dict with a comprehension.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are dict views copies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A view reflects the dict at the moment you use it: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items()</code> view taken before adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jam</code> still listed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jam</code> afterwards. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(d.items())</code> when you need a snapshot.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **KeyError** | Raised by \`d[k]\` when \`k\` is not a key |
| **Default value** | The fallback \`get\` returns or \`setdefault\` stores for a missing key |
| **defaultdict** | Dict subclass that calls a factory to create missing values |
| **Dictionary view** | Live, read-only window onto keys, values or items |
| **Shallow merge** | Top-level keys combined; nested values replaced, not merged |
| **Insertion order** | Iteration follows the order keys were first added |
| **LIFO** | Last in, first out: the order \`popitem\` removes items |
| **Key / value** | A dict maps each unique, hashable key to one value |

---
**Conclusion:** Day-to-day dictionary work is a handful of decisions. Read with \`d[k]\` when a missing key is a bug and \`d.get(k, default)\` when it is normal; group with \`setdefault\` on a plain dict or \`defaultdict\` when you do it a lot; loop with \`items()\` and remember that views are live and that keys cannot be added or removed mid-loop. Merge with \`a | b\` for a new dict or \`update\`/\`|=\` in place — the right-hand side wins, nested dicts are replaced rather than merged, and the result keeps insertion order, which the language has guaranteed since 3.7.`,
    examples: [
      {
        label: "get vs [], setdefault vs defaultdict, live views and safe deletion",
        code: `# Reading safely: [] raises, get returns a default
stock = {"apple": 3, "pear": 0}
print(stock["apple"])  # 3
try:
    stock["kiwi"]
except KeyError as e:
    print("KeyError:", e)
print(stock.get("kiwi"))  # None
print(stock.get("kiwi", 0))  # 0

# get(...) or default is a trap when the stored value is falsy
print(stock.get("pear") or 99)  # 99
print(stock.get("pear", 99))  # 0

# "in" checks keys, not values
print("pear" in stock, 3 in stock)  # True False

# setdefault: return the value, inserting the default first if missing
groups = {}
for word in ["ant", "bee", "asp", "bat", "cow"]:
    groups.setdefault(word[0], []).append(word)
print(groups)  # {'a': ['ant', 'asp'], 'b': ['bee', 'bat'], 'c': ['cow']}

# The default argument is built on EVERY call, even when the key exists
calls = 0
def fresh():
    global calls
    calls += 1
    return []
cache = {"k": [1]}
for _ in range(3):
    cache.setdefault("k", fresh())
print("factory ran", calls, "times")

# defaultdict calls its factory only for missing keys
from collections import defaultdict
dd = defaultdict(list)
dd["x"].append(1)
print(dict(dd))  # {'x': [1]}

# items(), keys() and values() are live views, not copies
prices = {"tea": 2, "cake": 5}
view = prices.items()
prices["jam"] = 4
print(list(view))  # [('tea', 2), ('cake', 5), ('jam', 4)]

# Iterate with items() to get key and value together
for name, price in prices.items():
    print(f"{name:>5}: {price}")

# keys() views support set operations
a = {"x": 1, "y": 2}
b = {"y": 20, "z": 30}
print(sorted(a.keys() & b.keys()))  # ['y']
print(sorted(a.keys() - b.keys()))  # ['x']

# Changing the size while iterating is an error; iterate over a copy
d = {"a": 1, "b": 0, "c": 0}
try:
    for k in d:
        if d[k] == 0:
            del d[k]
except RuntimeError as e:
    print("RuntimeError:", e)
d2 = {"a": 1, "b": 0, "c": 0}
for k in list(d2):
    if d2[k] == 0:
        del d2[k]
print(d2)  # {'a': 1}`,
      },
      {
        label: "Merging with |, |=, update and **, deep merge, order and fromkeys",
        code: `# Four ways to merge; in every one the right-hand side wins on conflicts
defaults = {"host": "localhost", "port": 80, "debug": False}
user = {"port": 8080, "debug": True}

print({**defaults, **user})  # {'host': 'localhost', 'port': 8080, 'debug': True}
print(defaults | user)  # {'host': 'localhost', 'port': 8080, 'debug': True}
print(user | defaults)  # {'port': 80, 'debug': False, 'host': 'localhost'}

# update and |= change the left dict in place
cfg = dict(defaults)
cfg.update(user, timeout=5)
print(cfg)  # {'host': 'localhost', 'port': 8080, 'debug': True, 'timeout': 5}
cfg2 = dict(defaults)
cfg2 |= [("port", 9000)]
print(cfg2)  # {'host': 'localhost', 'port': 9000, 'debug': False}

# | needs a dict on both sides; |= and update accept key/value pairs
try:
    defaults | [("port", 1)]
except TypeError as e:
    print("TypeError:", e)

# Merging is shallow: nested dicts are shared, not merged
base = {"db": {"user": "app", "pool": 5}}
override = {"db": {"pool": 20}}
print(base | override)  # {'db': {'pool': 20}}

def deep_merge(left, right):
    out = dict(left)
    for key, value in right.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out
print(deep_merge(base, override))  # {'db': {'user': 'app', 'pool': 20}}

# Order: insertion order is kept; overwriting a key keeps its old position
order = {"b": 1, "a": 2}
order["b"] = 99
order["c"] = 3
print(list(order))  # ['b', 'a', 'c']

# pop with a default never raises; popitem removes the LAST item (LIFO)
inv = {"x": 1, "y": 2, "z": 3}
print(inv.pop("missing", "n/a"))
print(inv.popitem())
print(inv)

# fromkeys shares ONE value object between all keys
shared = dict.fromkeys(["a", "b"], [])
shared["a"].append(1)
print(shared)  # {'a': [1], 'b': [1]}
separate = {k: [] for k in ["a", "b"]}
separate["a"].append(1)
print(separate)  # {'a': [1], 'b': []}

# Equality ignores order for dict, unlike for lists
print({"a": 1, "b": 2} == {"b": 2, "a": 1})  # True`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What set operations does Python support?",
    difficulty: "easy",
    seoDescription: "Python set operations: union, intersection, difference, symmetric difference, subset tests, in-place updates and frozenset, with verified output.",
    description: `**Question presented to candidate:**
"What operations does a Python set support? Show me how you would find what two collections have in common, what is missing from one of them, and explain when a set is the right data structure in the first place."

**What a strong answer should cover:**
- A set is an unordered collection of unique, hashable items backed by a hash table, so \`x in s\` is O(1) on average versus O(n) for a list.
- The four operations with their operators and methods: union \`|\`, intersection \`&\`, difference \`-\`, symmetric difference \`^\`; the methods accept any iterable (and several of them), the operators need sets.
- Comparisons are containment tests: \`<=\` subset, \`<\` proper subset, \`>=\`/\`>\` superset, \`isdisjoint\` — sets are only partially ordered, so \`a < b\` and \`b < a\` can both be False.
- In-place forms (\`|=\`, \`&=\`, \`-=\`, \`^=\`, \`update\`, \`intersection_update\`, ...) and single-item \`add\`, \`remove\` (raises \`KeyError\`) versus \`discard\` (silent).
- \`frozenset\` is the immutable, hashable variant (usable as a dict key or set element); \`{}\` is an empty dict; \`1\`, \`1.0\` and \`True\` count as one element; dedup with \`set()\` loses order, \`dict.fromkeys\` keeps it.

**Code / implementation expected:** Yes — a short snippet comparing two collections (common, missing, extra items).`,
    answer: `**Target Audience:** Beginners preparing for Python interviews — you need to know what a list is; school-level Venn diagrams help.
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 and the page runner (Pyodide 0.25.1 = CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` — the precise word an interviewer expects you to use. Every output shown was produced by actually running the code on CPython 3.11 and in the page runner (Pyodide 0.25.1, which is CPython 3.11.3); the **Verified** section quotes that run exactly.

## 1. Why This Even Matters — A Story First

Two friends plan a party and each writes a guest list. Who is invited by both? Who did only one of them think of? Is everyone on Ana's list also on Ben's? You could compare the lists name by name, or you could draw two overlapping circles and read the answers off the diagram. A Python set **is** those circles: it holds each item once, it does not care about order, and it answers "in both", "only here" and "is this inside that" in one short expression. It also answers "is this name on the list?" almost instantly however long the list is — the reason sets turn up in performance questions too.

📌 **Interview term: Set** — an unordered collection of unique items. Written \`{1, 2, 3}\` or built with \`set(iterable)\`.

📌 **Interview term: Hashable** — an object with a hash value that never changes during its lifetime and that can be compared with \`==\`. Numbers, strings, tuples of hashables and \`frozenset\` are hashable; lists, dicts and sets are not. The rules are in [the hash and eq contract](/interview-question/what-is-the-hash-and-eq-contract).

## 2. The Four Core Operations

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Two overlapping sets A and B. Only in A is 1 and 2, in both is 3 and 4, only in B is 5 and 6">
  <circle class="d-box" cx="270" cy="150" r="120"/>
  <circle class="d-box-accent" cx="430" cy="150" r="120" opacity="0.55"/>
  <text class="d-text" x="200" y="50" text-anchor="middle">A</text>
  <text class="d-text" x="500" y="50" text-anchor="middle">B</text>
  <text class="d-text" x="210" y="150" text-anchor="middle">1, 2</text>
  <text class="d-sub" x="210" y="176" text-anchor="middle">A - B</text>
  <text class="d-text" x="350" y="150" text-anchor="middle">3, 4</text>
  <text class="d-sub" x="350" y="176" text-anchor="middle">A and B</text>
  <text class="d-text" x="490" y="150" text-anchor="middle">5, 6</text>
  <text class="d-sub" x="490" y="176" text-anchor="middle">B - A</text>
</svg>

With \`a = {1, 2, 3, 4}\` and \`b = {3, 4, 5, 6}\`:

| Operation | Operator | Method | Result (sorted) | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| 📌 **Union** | \`a \\| b\` | \`a.union(b)\` | \`[1, 2, 3, 4, 5, 6]\` | in either |
| 📌 **Intersection** | \`a & b\` | \`a.intersection(b)\` | \`[3, 4]\` | in both |
| 📌 **Difference** | \`a - b\` | \`a.difference(b)\` | \`[1, 2]\` | in \`a\`, not in \`b\` |
| | \`b - a\` | \`b.difference(a)\` | \`[5, 6]\` | order matters |
| 📌 **Symmetric difference** | \`a ^ b\` | \`a.symmetric_difference(b)\` | \`[1, 2, 5, 6]\` | in exactly one |

The examples print \`sorted(...)\` because set iteration order is not something to rely on; for small integers CPython happens to print them in order, but for strings the order changes between runs because string hashes are randomised per process.

### Operators versus methods

The method forms take **any iterable**, and several of them: \`a.union([9, 8], range(2))\` gave \`[0, 1, 2, 3, 4, 8, 9]\`. The operators insist on sets (or frozensets) on both sides: \`a | [9, 8]\` raises \`TypeError: unsupported operand type(s) for |: 'set' and 'list'\`. That strictness is deliberate — it catches bugs where a list sneaks in — so use operators for set-with-set code and methods when the other side is a list or generator.

## 3. Comparisons Are Containment Tests

📌 **Interview term: Proper subset** — \`a < b\` is True when every item of \`a\` is in \`b\` and \`b\` has at least one more.

| Test | Operator | Method |
| :--- | :--- | :--- |
| subset | \`a <= b\` | \`a.issubset(b)\` |
| proper subset | \`a < b\` | — |
| superset | \`a >= b\` | \`a.issuperset(b)\` |
| proper superset | \`a > b\` | — |
| equal | \`a == b\` | — |
| no common items | — | \`a.isdisjoint(b)\` |

📌 **Interview term: Disjoint** — two sets with no items in common.

Sets are only **partially ordered**: for \`{1, 2}\` and \`{2, 3}\`, \`<\`, \`>\` and \`==\` are all \`False\`. So sorting a list of sets with \`sorted()\` gives an order that means nothing — do not do it.

## 4. Changing a Set

- In place: \`s |= t\`, \`s &= t\`, \`s -= t\`, \`s ^= t\`, or the method versions \`update\`, \`intersection_update\`, \`difference_update\`, \`symmetric_difference_update\` (the methods again take any iterables).
- One item: \`add(x)\`; \`discard(x)\` removes it if present and is silent otherwise; \`remove(x)\` raises \`KeyError\` when it is missing; \`pop()\` removes an arbitrary item; \`clear()\` empties the set.

In the run, \`s = {1, 2, 3}\` went through \`|= {4}\`, \`&= {1, 2, 4}\`, \`-= {1}\` and \`^= {2, 9}\` and ended as \`[4, 9]\`.

## 5. Why Membership Is Fast

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Membership in a list scans item by item, membership in a set hashes the value and jumps to one bucket">
  <defs>
    <marker id="py03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="50">list: x in L</text>
  <rect class="d-box" x="190" y="25" width="60" height="40" rx="6"/>
  <rect class="d-box" x="260" y="25" width="60" height="40" rx="6"/>
  <rect class="d-box" x="330" y="25" width="60" height="40" rx="6"/>
  <rect class="d-box" x="400" y="25" width="60" height="40" rx="6"/>
  <rect class="d-box-accent" x="470" y="25" width="60" height="40" rx="6"/>
  <text class="d-sub" x="620" y="50" text-anchor="middle">checks n items</text>
  <text class="d-sub" x="20" y="150">set: x in S</text>
  <rect class="d-box-muted" x="190" y="125" width="110" height="40" rx="6"/>
  <text class="d-sub" x="245" y="150" text-anchor="middle">hash(x)</text>
  <path class="d-edge-accent" d="M 304 145 L 404 145" marker-end="url(#py03q5-arrow)"/>
  <rect class="d-box-accent" x="410" y="125" width="120" height="40" rx="6"/>
  <text class="d-sub" x="470" y="150" text-anchor="middle">one bucket</text>
  <text class="d-sub" x="620" y="150" text-anchor="middle">O(1) average</text>
</svg>

A set stores each item in a slot chosen from its hash, so \`x in s\` computes \`hash(x)\`, jumps to that slot and compares only the few items that landed there. A list has to compare item by item. On our run (CPython 3.11, 1,000 lookups of the last element in 100,000 items) the list took about 0.51 s and the set about 0.00004 s. That gap is why "convert to a set before many \`in\` checks" is a classic optimisation. Collisions, probing and resizing are covered in [how a set finds items](/interview-question/how-does-a-python-set-find-items), and the general \`in\` protocol in [how \`in\` works](/interview-question/how-does-the-in-operator-work-in-python).

| Operation | Average cost |
| :--- | :--- |
| \`x in s\`, \`add\`, \`discard\`, \`remove\` | O(1) |
| \`a \\| b\` | O(len(a) + len(b)) |
| \`a & b\` | O(min(len(a), len(b))) |
| \`a - b\` | O(len(a)) |
| \`a <= b\` | O(len(a)) |

(Average-case costs for a hash table: each item on the smaller or left side is hashed and looked up once. A pathological set of colliding hashes can degrade them.)

## 6. frozenset and the Gotchas

📌 **Interview term: frozenset** — an immutable set. Because it can never change it is hashable, so it can be a dict key or an element of another set.

An undirected edge \`A–B\` is the same as \`B–A\`, so \`frozenset({"A", "B"})\` is a natural key: the run looks up \`edges[frozenset({"B", "A"})]\` and gets \`5\`. An operator result keeps the type of the **left** operand: \`frozenset | set\` is a \`frozenset\`, \`set | frozenset\` is a \`set\`.

Gotchas the second example demonstrates:

- \`{}\` is an empty **dict**; an empty set is \`set()\`.
- \`{1, 1.0, True}\` is \`{1}\`, and \`len({0, False, 0.0, "0"})\` is \`2\`: equal values with equal hashes are the same element, whatever their type.
- \`{[1, 2], [3]}\` raises \`TypeError: unhashable type: 'list'\`.
- \`set(emails)\` dedups but forgets the order; \`list(dict.fromkeys(emails))\` keeps the first-seen order. The same trick is in [the dictionaries question](/interview-question/how-do-you-work-with-dictionaries-get-setdefault-items-merging).

Set comprehensions (\`{w.lower() for w in words}\`) build a set in one expression — see [comprehensions](/interview-question/what-are-list-dict-set-comprehensions).

## 7. Verified: Running the Code

Both programs ran on python3.11 and in the page runner with identical output; every \`# comment\` after a \`print\` is an in-page test that passed.

**Example 1 — the operations, operators versus methods, comparisons and updates:**

~~~python
# The four core operations, as operators and as methods
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(sorted(a | b))  # [1, 2, 3, 4, 5, 6]
print(sorted(a & b))  # [3, 4]
print(sorted(a - b))  # [1, 2]
print(sorted(b - a))  # [5, 6]
print(sorted(a ^ b))  # [1, 2, 5, 6]

print(a.union(b) == a | b)  # True
print(a.intersection(b) == a & b)  # True
print(a.difference(b) == a - b)  # True
print(a.symmetric_difference(b) == a ^ b)  # True

# Methods accept any iterable (and several of them); operators need sets
print(sorted(a.union([9, 8], range(2))))  # [0, 1, 2, 3, 4, 8, 9]
try:
    a | [9, 8]
except TypeError as e:
    print("TypeError:", e)

# Comparisons test containment
small = {1, 2}
print(small <= a, small < a)  # True True
print(a <= a, a < a)  # True False
print(a >= small, a.issuperset([1, 2]))  # True True
print(a.isdisjoint({7, 8}))  # True

# Sets are only partially ordered: neither side contains the other
print({1, 2} < {2, 3}, {1, 2} > {2, 3}, {1, 2} == {2, 3})  # False False False

# In-place versions mutate the left set
s = {1, 2, 3}
s |= {4}
s &= {1, 2, 4}
s -= {1}
s ^= {2, 9}
print(sorted(s))  # [4, 9]
t = {1, 2}
t.update([3], (4,))
t.difference_update({1})
print(sorted(t))  # [2, 3, 4]

# Adding and removing single items
u = {1, 2}
u.add(3)
u.discard(99)
try:
    u.remove(99)
except KeyError as e:
    print("KeyError:", e)
print(sorted(u))  # [1, 2, 3]
~~~

~~~text
[1, 2, 3, 4, 5, 6]
[3, 4]
[1, 2]
[5, 6]
[1, 2, 5, 6]
True
True
True
True
[0, 1, 2, 3, 4, 8, 9]
TypeError: unsupported operand type(s) for |: 'set' and 'list'
True True
True False
True True
True
False False False
[4, 9]
[2, 3, 4]
KeyError: 99
[1, 2, 3]
~~~

**Example 2 — real uses and gotchas:**

~~~python
# Real uses, and the gotchas that come with them

# 1. De-duplicate. set() loses order; dict.fromkeys keeps first-seen order
emails = ["b@x.io", "a@x.io", "b@x.io", "c@x.io", "a@x.io"]
print(len(set(emails)))  # 3
print(list(dict.fromkeys(emails)))  # ['b@x.io', 'a@x.io', 'c@x.io']

# 2. Compare two collections in one line each
required = {"read", "write", "admin"}
granted = {"read", "write", "audit"}
print("missing:", sorted(required - granted))
print("extra:  ", sorted(granted - required))
print("ok?     ", required <= granted)

# 3. Fast membership: a set lookup hashes once instead of scanning
banned = set(range(0, 100_000, 7))
print(49 in banned, 50 in banned)  # True False

# Gotcha: {} is an empty DICT; use set() for an empty set
print(type({}).__name__, type(set()).__name__)  # dict set

# Gotcha: equal values are the same element, across types
print({1, 1.0, True})  # {1}
print(len({0, False, 0.0, "0"}))  # 2

# Gotcha: items must be hashable
try:
    {[1, 2], [3]}
except TypeError as e:
    print("TypeError:", e)

# frozenset is the immutable, hashable set: usable as a key or element
edges = {frozenset({"A", "B"}): 5, frozenset({"B", "C"}): 2}
print(edges[frozenset({"B", "A"})])  # 5
nested = {frozenset({1, 2}), frozenset({2, 1})}
print(len(nested))  # 1

# Operators keep the type of the LEFT operand
fs = frozenset({1, 2})
print(type(fs | {3}).__name__)  # frozenset
print(type({3} | fs).__name__)  # set

# Set comprehension
print(sorted({w.lower() for w in ["Apple", "apple", "APPLE", "Pear"]}))  # ['apple', 'pear']

# Several sets at once: intersection of many, union of many
logs = [{"u1", "u2", "u3"}, {"u2", "u3"}, {"u3", "u2", "u9"}]
print(sorted(set.intersection(*logs)))  # ['u2', 'u3']
print(sorted(set().union(*logs)))  # ['u1', 'u2', 'u3', 'u9']
~~~

~~~text
3
['b@x.io', 'a@x.io', 'c@x.io']
missing: ['admin']
extra:   ['audit']
ok?      False
True False
dict set
{1}
2
TypeError: unhashable type: 'list'
5
1
frozenset
set
['apple', 'pear']
['u2', 'u3']
['u1', 'u2', 'u3', 'u9']
~~~

## Common Pitfalls

- **Writing \`{}\` for an empty set.** It is a dict; use \`set()\`.
- **Relying on set order.** Print or return \`sorted(s)\` when order matters; string sets reorder between runs.
- **\`remove\` on a maybe-missing item.** It raises \`KeyError\`; use \`discard\`.
- **Operators with lists.** \`a | some_list\` raises \`TypeError\`; use \`a.union(some_list)\`.
- **Mixing \`1\`, \`1.0\` and \`True\`.** They collapse to one element.
- **Using \`set()\` to dedup when order matters.** Use \`dict.fromkeys\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What a set is:</strong> <span style="color:#f0e2c8;">An unordered collection of <strong style="color:#ffca28;">unique, hashable</strong> items stored in a hash table, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x in s</code> is O(1) on average instead of a list scan.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The four operations:</strong> <span style="color:#f0e2c8;">Union <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a | b</code>, intersection <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a &amp; b</code>, difference <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a - b</code>, symmetric difference <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code> — each also a method like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.union(b)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operators vs methods:</strong> <span style="color:#f0e2c8;">Methods accept any iterables, even several at once (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.union(xs, ys)</code>); operators need sets on both sides and raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> for a list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Comparisons:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> is subset, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> proper subset, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;</code> superset, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isdisjoint</code>; sets are only partially ordered.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The extras:</strong> <span style="color:#f0e2c8;">In-place <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-=</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^=</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">discard</code> is silent while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> raises; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code> is the hashable version; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> is a dict, so write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you remove duplicates but keep the original order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(dict.fromkeys(items))</code>. Dict keys are unique like a set, but dicts keep insertion order, so the first occurrence of each item wins. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(set(items))</code> loses the order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a set not contain a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set membership is based on the hash of each item, and a list is mutable, so its hash could change after insertion. Lists are unhashable (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type: 'list'</code>); use a tuple, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozenset</code> for a set of sets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{1, 1.0, True}</code> give?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1}</code>. The three are equal (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 == 1.0 == True</code>) and hash the same, so the set keeps the first one inserted. Mixing numeric types and bools in one set can silently merge items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a - b</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a ^ b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a - b</code> is what is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>; it is not symmetric. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code> is what is in exactly one of the two: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a - b) | (b - a)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you intersect a list of sets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set.intersection(*sets)</code> (needs at least one set), and for the union <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set().union(*sets)</code>, which also works on an empty list.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Set** | Unordered collection of unique, hashable items |
| **Hashable** | Has a hash that never changes and supports \`==\`; immutable built-ins are |
| **Union** | Items in either set: \`a | b\` |
| **Intersection** | Items in both sets: \`a & b\` |
| **Difference** | Items in \`a\` but not in \`b\`: \`a - b\` |
| **Symmetric difference** | Items in exactly one set: \`a ^ b\` |
| **Proper subset** | \`a < b\`: every item of \`a\` is in \`b\`, and \`b\` has more |
| **Disjoint** | No items in common: \`a.isdisjoint(b)\` |
| **frozenset** | Immutable, hashable set |

---
**Conclusion:** Python sets give you the Venn-diagram algebra directly — union \`|\`, intersection \`&\`, difference \`-\` and symmetric difference \`^\` — plus containment tests (\`<=\`, \`<\`, \`>=\`, \`isdisjoint\`) and in-place versions of everything. The method forms accept any iterables while the operators insist on sets, \`discard\` is the forgiving \`remove\`, and \`frozenset\` is the hashable variant for keys and sets of sets. Under it all is a hash table, which is why membership is O(1) on average, why items must be hashable, why order is not something to rely on, and why \`1\`, \`1.0\` and \`True\` count as the same element.`,
    examples: [
      {
        label: "Union, intersection, difference, comparisons and in-place updates",
        code: `# The four core operations, as operators and as methods
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(sorted(a | b))  # [1, 2, 3, 4, 5, 6]
print(sorted(a & b))  # [3, 4]
print(sorted(a - b))  # [1, 2]
print(sorted(b - a))  # [5, 6]
print(sorted(a ^ b))  # [1, 2, 5, 6]

print(a.union(b) == a | b)  # True
print(a.intersection(b) == a & b)  # True
print(a.difference(b) == a - b)  # True
print(a.symmetric_difference(b) == a ^ b)  # True

# Methods accept any iterable (and several of them); operators need sets
print(sorted(a.union([9, 8], range(2))))  # [0, 1, 2, 3, 4, 8, 9]
try:
    a | [9, 8]
except TypeError as e:
    print("TypeError:", e)

# Comparisons test containment
small = {1, 2}
print(small <= a, small < a)  # True True
print(a <= a, a < a)  # True False
print(a >= small, a.issuperset([1, 2]))  # True True
print(a.isdisjoint({7, 8}))  # True

# Sets are only partially ordered: neither side contains the other
print({1, 2} < {2, 3}, {1, 2} > {2, 3}, {1, 2} == {2, 3})  # False False False

# In-place versions mutate the left set
s = {1, 2, 3}
s |= {4}
s &= {1, 2, 4}
s -= {1}
s ^= {2, 9}
print(sorted(s))  # [4, 9]
t = {1, 2}
t.update([3], (4,))
t.difference_update({1})
print(sorted(t))  # [2, 3, 4]

# Adding and removing single items
u = {1, 2}
u.add(3)
u.discard(99)
try:
    u.remove(99)
except KeyError as e:
    print("KeyError:", e)
print(sorted(u))  # [1, 2, 3]`,
      },
      {
        label: "Dedup, comparing collections, frozenset and the common gotchas",
        code: `# Real uses, and the gotchas that come with them

# 1. De-duplicate. set() loses order; dict.fromkeys keeps first-seen order
emails = ["b@x.io", "a@x.io", "b@x.io", "c@x.io", "a@x.io"]
print(len(set(emails)))  # 3
print(list(dict.fromkeys(emails)))  # ['b@x.io', 'a@x.io', 'c@x.io']

# 2. Compare two collections in one line each
required = {"read", "write", "admin"}
granted = {"read", "write", "audit"}
print("missing:", sorted(required - granted))
print("extra:  ", sorted(granted - required))
print("ok?     ", required <= granted)

# 3. Fast membership: a set lookup hashes once instead of scanning
banned = set(range(0, 100_000, 7))
print(49 in banned, 50 in banned)  # True False

# Gotcha: {} is an empty DICT; use set() for an empty set
print(type({}).__name__, type(set()).__name__)  # dict set

# Gotcha: equal values are the same element, across types
print({1, 1.0, True})  # {1}
print(len({0, False, 0.0, "0"}))  # 2

# Gotcha: items must be hashable
try:
    {[1, 2], [3]}
except TypeError as e:
    print("TypeError:", e)

# frozenset is the immutable, hashable set: usable as a key or element
edges = {frozenset({"A", "B"}): 5, frozenset({"B", "C"}): 2}
print(edges[frozenset({"B", "A"})])  # 5
nested = {frozenset({1, 2}), frozenset({2, 1})}
print(len(nested))  # 1

# Operators keep the type of the LEFT operand
fs = frozenset({1, 2})
print(type(fs | {3}).__name__)  # frozenset
print(type({3} | fs).__name__)  # set

# Set comprehension
print(sorted({w.lower() for w in ["Apple", "apple", "APPLE", "Pear"]}))  # ['apple', 'pear']

# Several sets at once: intersection of many, union of many
logs = [{"u1", "u2", "u3"}, {"u2", "u3"}, {"u3", "u2", "u9"}]
print(sorted(set.intersection(*logs)))  # ['u2', 'u3']
print(sorted(set().union(*logs)))  # ['u1', 'u2', 'u3', 'u9']`,
      },
    ],
  },
];

export default augments;
