/**
 * PYTHON ULTRA — batch 16: Data structures internals. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `How are Python dictionaries implemented and ordered?`,
    difficulty: "easy",
    seoDescription: `How Python dicts work: hash table, open addressing, the compact indices + entries layout, why order is guaranteed since 3.7, with verified output.`,
    description: `**Question presented to candidate:**
"Dictionaries are everywhere in Python. How does a \`dict\` actually find a value by its key so fast, and why does it remember the order you inserted things in? Was that always the case?"

**What a strong answer should cover:**
- A \`dict\` is a hash table: \`hash(key)\` picks a starting slot, collisions are resolved by open addressing (probing other slots), and \`==\` confirms the match, giving average O(1) get, set and delete.
- Keys must be hashable; equal keys must hash alike, which is why \`1\`, \`1.0\` and \`True\` are one key.
- The compact layout (CPython 3.6+): a small sparse \`indices\` table pointing into a dense \`entries\` array of (hash, key, value) kept in insertion order. Iteration walks the dense array, which is where the order comes from.
- The version fact: insertion order was a CPython 3.6 implementation detail and became a language guarantee in 3.7; updating a value keeps the position, delete + re-insert moves the key to the end.
- Resizing keeps the table at most about two thirds full; worst case lookup is O(n) when many keys collide.

**Code / implementation expected:** Optional — a short demo of ordering rules, or a sketch of the indices + entries layout.`,
    answer: `**Target Audience:** Beginners who use dicts daily and want to know what happens underneath; anyone preparing for a Python interview.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a coat check at a theatre. You hand over your coat and get a ticket with a number. When you come back, the attendant does not search every coat on every rack; the ticket number tells them exactly which hook to walk to. If two guests somehow get sent to the same hook, the attendant has a simple rule: "try the next hook along until you find the right coat or an empty hook".

Now add a second notebook: every time a coat comes in, the attendant writes it on the next line, in arrival order. When the manager asks "list every coat you are holding", the attendant reads the notebook top to bottom instead of walking the hooks.

That is a Python \`dict\` almost exactly. The ticket number is the **hash**, the hooks are a small table of slots, the "try the next hook" rule is **probing**, and the notebook is a dense array of entries in insertion order. Interviewers ask about it because it explains three things at once: why lookups are fast, why keys must be hashable, and why dicts have remembered insertion order since Python 3.7.

## 2. The Core Idea: Hash, Slot, Compare

To store \`d[key] = value\`, Python:

1. calls \`hash(key)\` once and gets an integer;
2. keeps only the low bits of that integer (\`hash & (table_size - 1)\`) to choose a starting slot;
3. if that slot is free, stores the entry there; if it holds another key, compares keys and, on a mismatch, moves to another slot by a fixed rule.

Looking up a key repeats the same walk: same hash, same slots in the same order, stop at the matching key or at an empty slot (then it raises \`KeyError\`). Because the walk is usually one or two slots long, get, set and delete are O(1) on average, no matter how many keys the dict holds.

📌 **Interview term: Hash table** — an array plus a hash function that converts a key into an array position.

📌 **Interview term: Collision** — two different keys whose hashes point at the same starting slot.

📌 **Interview term: Open addressing** — resolving collisions by trying other slots of the same array (CPython dicts and sets do this), rather than hanging a linked list off each slot ("separate chaining", which Java \`HashMap\` uses).

The "move to another slot" rule in CPython is not simply "the next slot". It mixes in more bits of the hash as it goes:

~~~python
perturb = hash_value
i = hash_value & mask
while slot i is taken by a different key:
    perturb >>= 5
    i = (i * 5 + perturb + 1) & mask
~~~

📌 **Interview term: Probe sequence** — the order of slots tried for one key. The \`perturb\` term makes keys that share their low bits still split apart quickly, because their higher bits differ.

How does a slot decide a key "matches"? First by identity (\`stored is key\`, the cheapest check), then by comparing the stored hash, and only if the hashes are equal by calling \`==\`. That is why two rules hold for every key:

- it must be **hashable**: its hash must never change while it sits in a dict;
- objects that are \`==\` must have the same hash. \`1 == 1.0 == True\` and all three hash to 1, so they are one key.

📌 **Interview term: Hashable** — an object with a \`__hash__\` that stays fixed for its lifetime and agrees with \`__eq__\`. Built-in immutables (\`int\`, \`str\`, \`tuple\` of hashables, \`frozenset\`) are hashable; \`list\`, \`dict\` and \`set\` are not. The full contract has its own page: [the __hash__ and __eq__ contract](/interview-question/what-is-the-hash-and-eq-contract).

## 3. The Compact Layout: Where the Order Comes From

Before Python 3.6 the hash table itself held the (hash, key, value) entries, so iteration walked the table slot by slot and the order looked random. The [What's New in Python 3.6](https://docs.python.org/3/whatsnew/3.6.html) notes say the dict type was reimplemented "to use a more compact representation based on a proposal by Raymond Hettinger and similar to the PyPy dict implementation", and that this made dictionaries use "20% to 25% less memory" than 3.5.

The compact design splits the table in two:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Compact dict layout: a sparse indices table of eight slots points into a dense entries array that keeps insertion order">
  <defs>
    <marker id="py16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="190" y="30" text-anchor="middle">indices (sparse, 8 slots)</text>
  <rect class="d-box-muted" x="40" y="50" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="73" text-anchor="middle">slot 0: 2</text>
  <rect class="d-box-muted" x="40" y="86" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="109" text-anchor="middle">1: empty</text>
  <rect class="d-box-muted" x="40" y="122" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="145" text-anchor="middle">slot 2: 0</text>
  <rect class="d-box-muted" x="40" y="158" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="181" text-anchor="middle">slot 3: 1</text>
  <rect class="d-box-muted" x="40" y="194" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="217" text-anchor="middle">4: empty</text>
  <rect class="d-box-muted" x="40" y="230" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="253" text-anchor="middle">5: empty</text>
  <rect class="d-box-muted" x="40" y="266" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="289" text-anchor="middle">6: empty</text>
  <rect class="d-box-muted" x="40" y="302" width="70" height="36" rx="4"/>
  <text class="d-sub" x="75" y="325" text-anchor="middle">7: empty</text>
  <text class="d-text d-accent" x="560" y="30" text-anchor="middle">entries (dense, insertion order)</text>
  <rect class="d-box" x="400" y="110" width="320" height="44" rx="6"/>
  <text class="d-text" x="560" y="138" text-anchor="middle">0: hash 10, key 10, value ten</text>
  <rect class="d-box" x="400" y="174" width="320" height="44" rx="6"/>
  <text class="d-text" x="560" y="202" text-anchor="middle">1: hash 18, key 18, value eighteen</text>
  <rect class="d-box" x="400" y="238" width="320" height="44" rx="6"/>
  <text class="d-text" x="560" y="266" text-anchor="middle">2: hash 3, key 3, value three</text>
  <path class="d-edge-accent" d="M 110 140 L 396 132" marker-end="url(#py16q1-arrow)"/>
  <path class="d-edge" d="M 110 176 L 396 196" marker-end="url(#py16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 110 68 L 396 260" marker-end="url(#py16q1-arrow)"/>
</svg>

The left column is the dict built in Example 2 with keys 10, 18 and 3. The \`indices\` table is small and sparse: each slot holds only a small integer, the position of an entry, or "empty". The \`entries\` array is dense: entries are appended at the end as keys arrive. The dashed arrow shows key 3: its home slot 3 was already used by key 18, so it probed on and landed in slot 0, yet it is still entry 2 because it arrived third.

Two consequences fall out of this design:

- **Memory:** the big entries (three machine words each) are not padded out to the table size; only the tiny indices are.
- **Order:** \`for k in d\`, \`d.keys()\`, \`d.values()\` and \`d.items()\` simply walk the dense entries array, which is in insertion order.

📌 **Interview term: Compact dict** — the CPython 3.6+ layout of a sparse indices table plus a dense, insertion-ordered entries array.

**The version fact.** In CPython 3.6 the order was a side effect, an implementation detail you were told not to rely on. The Python 3.7 release notes declared "the insertion-order preservation nature of dict objects" an official part of the language spec, so every conforming Python implementation must keep it (discussed with the release-note quote on [discuss.python.org](https://discuss.python.org/t/can-i-rely-on-dict-insertion-order-as-stated-in-the-release-notes/87682)).

What happens on a delete? The entry is not removed from the middle of the dense array (that would be O(n)). Its slot in \`indices\` is marked as a "dummy" so that probe walks for other keys keep going past it, and the entry becomes a hole that is skipped by iteration and cleaned up at the next resize. That is why "delete then re-insert" sends a key to the end: it is appended as a brand-new entry.

## 4. Lookup, Step by Step

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Lookup steps: hash the key, take the low bits as a slot, compare the stored entry, probe the next slot on a mismatch">
  <defs>
    <marker id="py16q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="56" text-anchor="middle">h = hash(key)</text>
  <text class="d-sub" x="95" y="78" text-anchor="middle">one call</text>
  <rect class="d-box" x="220" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="295" y="56" text-anchor="middle">i = h and mask</text>
  <text class="d-sub" x="295" y="78" text-anchor="middle">low bits pick a slot</text>
  <rect class="d-box" x="420" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="495" y="56" text-anchor="middle">read slot i</text>
  <text class="d-sub" x="495" y="78" text-anchor="middle">entry index or empty</text>
  <rect class="d-box-muted" x="610" y="30" width="130" height="60" rx="10"/>
  <text class="d-text" x="675" y="56" text-anchor="middle">empty</text>
  <text class="d-sub" x="675" y="78" text-anchor="middle">KeyError</text>
  <rect class="d-box" x="420" y="160" width="150" height="60" rx="10"/>
  <text class="d-text" x="495" y="186" text-anchor="middle">same key?</text>
  <text class="d-sub" x="495" y="208" text-anchor="middle">is, then hash and ==</text>
  <rect class="d-box-accent" x="610" y="160" width="130" height="60" rx="10"/>
  <text class="d-text" x="675" y="186" text-anchor="middle">yes</text>
  <text class="d-sub" x="675" y="208" text-anchor="middle">return value</text>
  <rect class="d-box-muted" x="220" y="160" width="150" height="60" rx="10"/>
  <text class="d-text" x="295" y="186" text-anchor="middle">no: next slot</text>
  <text class="d-sub" x="295" y="208" text-anchor="middle">i = 5i + perturb + 1</text>
  <path class="d-edge" d="M 170 60 L 214 60" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge" d="M 370 60 L 414 60" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge" d="M 570 60 L 604 60" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge" d="M 495 90 L 495 154" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge-accent" d="M 570 190 L 604 190" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 420 190 L 376 190" marker-end="url(#py16q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 295 160 L 440 96" marker-end="url(#py16q1-arrow2)"/>
</svg>

The same walk serves \`d[k]\`, \`k in d\`, \`d.get(k)\` and \`d[k] = v\`. An empty slot ends the search, which is why the table must never fill up completely.

## 5. Resizing and Load Factor

If the table got full, a missing key would have to scan every slot before finding an empty one. CPython therefore resizes before the table is about two thirds full: it allocates a bigger table and re-inserts every live entry (skipping deleted holes).

📌 **Interview term: Load factor** — the fraction of slots in use. CPython dicts keep it below two thirds.

You can see the resizes from Python: Example 1 records the lengths at which \`sys.getsizeof(d)\` grows while inserting int keys. The output was \`[1, 6, 11, 22, 43, 86, 171]\`. The first jump is the first insert (a new empty dict points at a shared, static empty key table and gets its own 8-slot table on the first insert); after that a 6th key outgrows 8 slots (two thirds of 8 is 5.3), an 11th outgrows 16, a 22nd outgrows 32, and so on. In the CPython 3.11.3 source ([Objects/dictobject.c](https://github.com/python/cpython/blob/v3.11.3/Objects/dictobject.c)) the usable part of a table is \`USABLE_FRACTION(n) = (n << 1) / 3\` entries and the new size is chosen from \`GROWTH_RATE = used * 3\` (rounded up to a power of two), which is why the table doubled each time on this run, and each resize is O(n), but because they get rarer as the dict grows, inserts are **amortized O(1)**.

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but averages to constant time over a long run of operations.

The byte counts themselves depend on the machine (an empty dict reported 64 bytes on 64-bit python3.11 and 40 bytes in the 32-bit browser runtime on our runs), so the examples print only the jump points, which are the same on both.

## 6. The Code, Walked Through

### Example 1 — the ordering rules you are tested on

~~~python
# 1. Insertion order is part of the language (guaranteed since 3.7)
stock = {}
stock["pears"] = 4
stock["apples"] = 7
stock["figs"] = 2
first = list(stock)
print(first)  # ['pears', 'apples', 'figs']

# Overwriting a value keeps the key where it was
stock["pears"] = 10
after_update = list(stock)
print(after_update)  # ['pears', 'apples', 'figs']

# Delete and re-insert: the key moves to the end
del stock["pears"]
stock["pears"] = 1
print(list(stock))  # ['apples', 'figs', 'pears']

# 2. Keys are found by hash + equality: 1, 1.0 and True are ONE key
mixed = {1: "int"}
mixed[1.0] = "float"
mixed[True] = "bool"
print(mixed)  # {1: 'bool'}
print(hash(1) == hash(1.0) == hash(True))  # True

# 3. Only hashable objects can be keys
try:
    {[1, 2]: "list key"}
except TypeError as err:
    print("TypeError:", err)
print({(1, 2): "tuple key"})  # {(1, 2): 'tuple key'}

# 4. Plain dict equality ignores order; OrderedDict equality does not
from collections import OrderedDict
a = {"x": 1, "y": 2}
b = {"y": 2, "x": 1}
print(a == b)  # True
print(OrderedDict(a) == OrderedDict(b))  # False

# 5. Changing a dict while looping over it is refused
d = {1: "a", 2: "b"}
try:
    for k in d:
        d[k + 10] = "new"
except RuntimeError as err:
    print("RuntimeError:", err)

# 6. The table resizes as it fills: lengths at which getsizeof() grows
import sys
d = {}
prev = sys.getsizeof(d)
jumps = []
for i in range(200):
    d[i] = i
    size = sys.getsizeof(d)
    if size != prev:
        jumps.append(len(d))
        prev = size
print(jumps)
~~~

- Overwriting \`stock["pears"]\` changes only the value; the entry stays where it was.
- \`del\` plus re-insert creates a new entry at the end of the dense array.
- \`{1: "int"}\` followed by \`mixed[1.0] = ...\` and \`mixed[True] = ...\` keeps one key: the **original key object** \`1\` stays, only the value changes, so the dict prints \`{1: 'bool'}\`.
- Two plain dicts with the same items in a different order are \`==\`; two \`OrderedDict\`s are not, because \`OrderedDict\` equality is order-sensitive.
- Adding keys in a \`for k in d\` loop raises \`RuntimeError\`, because the entries array may be reallocated under the loop.

### Example 2 — a model of the compact layout

~~~python
# A tiny model of the CPython 3.6+ "compact dict" layout:
#   indices: a small sparse table of slot numbers (or None)
#   entries: a dense list of [hash, key, value] in insertion order
PERTURB_SHIFT = 5

class CompactDict:
    def __init__(self, size=8):
        self.indices = [None] * size
        self.entries = []

    def _probe(self, h):
        """Yield table slots in the order CPython visits them."""
        mask = len(self.indices) - 1
        perturb = h & 0xFFFFFFFFFFFFFFFF
        i = h & mask
        while True:
            yield i
            perturb >>= PERTURB_SHIFT
            i = (i * 5 + perturb + 1) & mask

    def __setitem__(self, key, value):
        h = hash(key)
        path = []
        for slot in self._probe(h):
            path.append(slot)
            idx = self.indices[slot]
            if idx is None:
                self.indices[slot] = len(self.entries)
                self.entries.append([h, key, value])
                break
            eh, ek, _ = self.entries[idx]
            if ek is key or (eh == h and ek == key):
                self.entries[idx][2] = value
                break
        print(f"set {key!r}: probed slots {path}")

    def __getitem__(self, key):
        h = hash(key)
        for slot in self._probe(h):
            idx = self.indices[slot]
            if idx is None:
                raise KeyError(key)
            eh, ek, ev = self.entries[idx]
            if ek is key or (eh == h and ek == key):
                return ev

d = CompactDict()
d[10] = "ten"
# 18 & 7 == 2, the same home slot as 10: a collision
d[18] = "eighteen"
d[3] = "three"
d[10] = "TEN"
print("indices:", d.indices)
for i, e in enumerate(d.entries):
    print("entry", i, e)
print(d[18], d[3], d[10])
try:
    d[26]
except KeyError as err:
    print("KeyError:", err)

# Iterating a real dict walks the dense entries array, so it follows insertion order
real = {10: "ten", 18: "eighteen", 3: "three"}
print(list(real) == [e[1] for e in d.entries])  # True
~~~

This is a teaching model, not CPython itself, but it uses the same two arrays and the same probe rule. Small integers hash to themselves, so their slots are predictable: \`10 & 7 == 2\`, \`18 & 7 == 2\` (a collision), \`3 & 7 == 3\`. The printed probe paths show 18 moving on to slot 3, and 3 then finding slot 3 taken and moving to slot 0. Looking up 26 (also home slot 2) walks slots 2, 3, 0, then hits empty slot 1 and raises \`KeyError\`. Re-setting key 10 only rewrites the value in entry 0.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page's Pyodide 0.25.1 harness; the outputs matched exactly.

Example 1 output:

~~~text
['pears', 'apples', 'figs']
['pears', 'apples', 'figs']
['apples', 'figs', 'pears']
{1: 'bool'}
True
TypeError: unhashable type: 'list'
{(1, 2): 'tuple key'}
True
False
RuntimeError: dictionary changed size during iteration
[1, 6, 11, 22, 43, 86, 171]
~~~

Example 2 output:

~~~text
set 10: probed slots [2]
set 18: probed slots [2, 3]
set 3: probed slots [3, 0]
set 10: probed slots [2]
indices: [2, None, 0, 1, None, None, None, None]
entry 0 [10, 10, 'TEN']
entry 1 [18, 18, 'eighteen']
entry 2 [3, 3, 'three']
eighteen three TEN
KeyError: 26
True
~~~

## 8. Complexity at a Glance

| Operation | Average | Worst case | Why |
| :--- | :--- | :--- | :--- |
| \`d[k]\`, \`k in d\`, \`d.get(k)\` | O(1) | O(n) | one short probe walk; worst case when many keys collide |
| \`d[k] = v\` | amortized O(1) | O(n) | an occasional resize re-inserts everything |
| \`del d[k]\` | O(1) | O(n) | marks a dummy slot, leaves a hole in entries |
| iterate \`d\` / \`d.items()\` | O(n) | O(n) | walks the dense entries array |
| \`d.copy()\`, \`dict(d)\` | O(n) | O(n) | copies every entry |

## 9. Edge Cases Worth Knowing

- **String hashes change between runs.** \`hash("abc")\` is randomised per process (controlled by \`PYTHONHASHSEED\`) to make collision attacks harder. Dict **order** is unaffected because it comes from insertion, not from hashes; set order, which does depend on hashes, can change between runs for strings. See [how a Python set finds items](/interview-question/how-does-a-python-set-find-items).
- **NaN keys.** \`float("nan") != float("nan")\`, so two separate NaN objects become two keys. The identity check means the same NaN object can still be found.
- **Instance \`__dict__\`s share keys.** [PEP 412](https://peps.python.org/pep-0412/) (Python 3.3) lets instances of one class share a single key table, storing only their values, which saves memory in object-heavy programs. [\`__slots__\`](/interview-question/what-does-slots-do) removes the per-instance dict altogether.
- **Mutable keys break lookups.** A custom object whose hash depends on a field you later change is stored under its old hash and can no longer be found.

## Common Pitfalls

- Saying "dicts are ordered by key". They are ordered by insertion; sorting needs \`sorted()\`.
- Saying "dicts have always been ordered" or "ordered since 3.6" without the nuance: 3.6 by accident in CPython, 3.7 by language guarantee.
- Using a \`list\` (or a \`dict\`) as a key and being surprised by \`TypeError: unhashable type\`. Convert to a \`tuple\` or \`frozenset\` first.
- Assuming \`{1: "a", True: "b"}\` has two entries. Equal keys that hash alike merge into one.
- Mutating a dict while iterating over it; iterate over \`list(d)\` or build a new dict.
- Claiming every lookup is O(1). It is O(1) on average; a flood of colliding keys degrades to O(n).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> is a hash table: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash(key)</code> chooses a starting slot, a mismatch probes other slots (open addressing), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> confirms the key. Average O(1) for get, set and delete.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The layout:</strong> <span style="color:#f0e2c8;">Since CPython 3.6 it is compact: a small sparse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indices</code> table of slot numbers points into a dense <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entries</code> array of (hash, key, value) in insertion order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is ordered:</strong> <span style="color:#f0e2c8;">Iteration walks the dense entries array, so it follows insertion order. CPython 3.6 did this as an implementation detail; 3.7 made it a language guarantee.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules:</strong> <span style="color:#f0e2c8;">Updating a value keeps the key in place, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del</code> then re-insert moves it to the end, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> between dicts ignores order. Keys must be hashable, and equal keys must hash alike.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Costs:</strong> <span style="color:#f0e2c8;">The table resizes before it is two thirds full, so each append-style insert is amortized O(1); many colliding hashes push one lookup to O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a dict ordered by key or by insertion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By insertion only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2: 0, 1: 0}</code> iterates 2 then 1. If you want sorted keys, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(d)</code> or build a new dict from sorted items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Then why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">collections.OrderedDict</code> still exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It has order-aware extras: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> between two OrderedDicts compares order, and it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code>, which make it a natural LRU cache building block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1.0</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">True</code> the same key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are equal (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 == 1.0 == True</code>) and the hash contract says equal objects must hash alike, so the second insert finds the first slot and only replaces the value. The original key object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> stays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you add keys while iterating?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CPython raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RuntimeError: dictionary changed size during iteration</code>. Loop over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(d)</code> instead, or build a new dict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a dict use more memory than a list of pairs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps spare empty slots so probing stays short (at most about two thirds full) and stores each hash beside its key. That spare room is the price of O(1) lookups.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash table** | a structure that turns a key into an array position with a hash function |
| **Hash** | the integer \`hash(key)\` returns; equal objects must have equal hashes |
| **Hashable** | has a hash that never changes during its lifetime, so it can be a key |
| **Collision** | two different keys that land on the same starting slot |
| **Open addressing** | resolving collisions by trying other slots in the same array, not by chaining lists |
| **Probe sequence** | the order of slots tried for one key; CPython uses \`i = 5*i + perturb + 1\` |
| **Compact dict** | the CPython 3.6+ layout with a sparse indices table and a dense entries array |
| **Load factor** | how full the table is; CPython resizes before two thirds |
| **Amortized O(1)** | occasional expensive resizes averaged over many cheap inserts |
| **Key-sharing dictionary** | instances of one class sharing a single key table (PEP 412) |

**Conclusion:** A Python dict is an open-addressing hash table: \`hash(key)\` picks a starting slot, a perturbed probe sequence handles collisions, and identity, hash and \`==\` confirm a match, so lookups are O(1) on average. Since CPython 3.6 the table is compact, a sparse indices table pointing into a dense entries array, and because iteration walks that dense array, dicts come out in insertion order; Python 3.7 turned that behaviour into a language guarantee. For everyday dict methods see [working with dictionaries](/interview-question/how-do-you-work-with-dictionaries-get-setdefault-items-merging), and for a dict-based cache design see [how an LRU cache works internally](/interview-question/how-does-an-lru-cache-work-internally).`,
    examples: [
      { label: `Dict ordering rules, key equality and resize points`, code: `# 1. Insertion order is part of the language (guaranteed since 3.7)
stock = {}
stock["pears"] = 4
stock["apples"] = 7
stock["figs"] = 2
first = list(stock)
print(first)  # ['pears', 'apples', 'figs']

# Overwriting a value keeps the key where it was
stock["pears"] = 10
after_update = list(stock)
print(after_update)  # ['pears', 'apples', 'figs']

# Delete and re-insert: the key moves to the end
del stock["pears"]
stock["pears"] = 1
print(list(stock))  # ['apples', 'figs', 'pears']

# 2. Keys are found by hash + equality: 1, 1.0 and True are ONE key
mixed = {1: "int"}
mixed[1.0] = "float"
mixed[True] = "bool"
print(mixed)  # {1: 'bool'}
print(hash(1) == hash(1.0) == hash(True))  # True

# 3. Only hashable objects can be keys
try:
    {[1, 2]: "list key"}
except TypeError as err:
    print("TypeError:", err)
print({(1, 2): "tuple key"})  # {(1, 2): 'tuple key'}

# 4. Plain dict equality ignores order; OrderedDict equality does not
from collections import OrderedDict
a = {"x": 1, "y": 2}
b = {"y": 2, "x": 1}
print(a == b)  # True
print(OrderedDict(a) == OrderedDict(b))  # False

# 5. Changing a dict while looping over it is refused
d = {1: "a", 2: "b"}
try:
    for k in d:
        d[k + 10] = "new"
except RuntimeError as err:
    print("RuntimeError:", err)

# 6. The table resizes as it fills: lengths at which getsizeof() grows
import sys
d = {}
prev = sys.getsizeof(d)
jumps = []
for i in range(200):
    d[i] = i
    size = sys.getsizeof(d)
    if size != prev:
        jumps.append(len(d))
        prev = size
print(jumps)` },
      { label: `A model of the compact dict: indices, entries and probing`, code: `# A tiny model of the CPython 3.6+ "compact dict" layout:
#   indices: a small sparse table of slot numbers (or None)
#   entries: a dense list of [hash, key, value] in insertion order
PERTURB_SHIFT = 5

class CompactDict:
    def __init__(self, size=8):
        self.indices = [None] * size
        self.entries = []

    def _probe(self, h):
        """Yield table slots in the order CPython visits them."""
        mask = len(self.indices) - 1
        perturb = h & 0xFFFFFFFFFFFFFFFF
        i = h & mask
        while True:
            yield i
            perturb >>= PERTURB_SHIFT
            i = (i * 5 + perturb + 1) & mask

    def __setitem__(self, key, value):
        h = hash(key)
        path = []
        for slot in self._probe(h):
            path.append(slot)
            idx = self.indices[slot]
            if idx is None:
                self.indices[slot] = len(self.entries)
                self.entries.append([h, key, value])
                break
            eh, ek, _ = self.entries[idx]
            if ek is key or (eh == h and ek == key):
                self.entries[idx][2] = value
                break
        print(f"set {key!r}: probed slots {path}")

    def __getitem__(self, key):
        h = hash(key)
        for slot in self._probe(h):
            idx = self.indices[slot]
            if idx is None:
                raise KeyError(key)
            eh, ek, ev = self.entries[idx]
            if ek is key or (eh == h and ek == key):
                return ev

d = CompactDict()
d[10] = "ten"
# 18 & 7 == 2, the same home slot as 10: a collision
d[18] = "eighteen"
d[3] = "three"
d[10] = "TEN"
print("indices:", d.indices)
for i, e in enumerate(d.entries):
    print("entry", i, e)
print(d[18], d[3], d[10])
try:
    d[26]
except KeyError as err:
    print("KeyError:", err)

# Iterating a real dict walks the dense entries array, so it follows insertion order
real = {10: "ten", 18: "eighteen", 3: "three"}
print(list(real) == [e[1] for e in d.entries])  # True` },
    ],
  },
  {
    title: `How does a Python list grow in memory?`,
    difficulty: "medium",
    seoDescription: `How a Python list grows: dynamic array of pointers, CPython over-allocation, amortized O(1) append, shrinking and slow front inserts, with verified output.`,
    description: `**Question presented to candidate:**
"A Python list can grow forever with \`append()\`, and yet \`append()\` is called O(1). What is a list in memory, what happens when it runs out of room, and which list operations are actually slow?"

**What a strong answer should cover:**
- A list is a dynamic array: a small header (\`ob_size\` = length, \`allocated\` = capacity) plus one contiguous array of pointers to the item objects, not the objects themselves.
- Over-allocation: when \`append()\` runs out of slots, CPython reallocates with extra room (about 12.5% plus a small constant, rounded to a multiple of 4), so resizes are rare and \`append()\` is amortized O(1).
- The observed growth sequence on CPython 3.11: capacities 4, 8, 16, 24, 32, 40, 52, 64, 76, 92, ... and shrinking only when fewer than half the slots are used.
- The costs: index and \`append()\`/\`pop()\` at the end are O(1); \`insert(0, x)\`, \`pop(0)\` and \`del a[0]\` shift every pointer, O(n); use \`collections.deque\` for a queue.
- \`sys.getsizeof()\` counts only the header and pointer array, never the items; how a list is built (\`[0] * n\`, \`list(range(n))\`, a comprehension) changes its spare capacity.

**Clarifying questions expected:**
- Do you mean CPython specifically? (The growth rule is an implementation detail, not part of the language.)

**Code / implementation expected:** Optional — a \`sys.getsizeof()\` experiment that reveals the capacity steps, or an amortized-cost argument.`,
    answer: `**Target Audience:** Developers who use lists every day and want the memory model an interviewer asks about; no C knowledge needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). The growth rule is a CPython implementation detail and has changed between versions.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine booking tables at a restaurant for a group whose size keeps growing. You start with a table for 4. When the fifth friend arrives, there is no way to bolt a chair onto the table, so the whole group moves to a table for 8. When the ninth arrives, everyone moves again, this time to a table for 16.

Moving is annoying (everyone picks up their plates), but because each new table is noticeably bigger than the last, moves get rarer as the group grows. Most arrivals just sit down in an empty seat that is already there.

A Python list works exactly like this. It keeps a block of seats (slots) in one piece of memory. Most \`append()\` calls drop into a spare seat. Occasionally the block is full, and Python moves everything to a bigger block. Understanding this explains why \`append()\` is fast, why \`insert(0, x)\` is slow, and why \`sys.getsizeof()\` jumps in steps.

## 2. What a List Is in Memory

A list object has a small fixed header and a separate block of memory holding **pointers**: addresses of the item objects. The items themselves live elsewhere on the heap.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="A list object header with length 5 and capacity 8 points to an array of eight pointer slots, five of which point to int objects">
  <defs>
    <marker id="py16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="180" height="120" rx="10"/>
  <text class="d-text" x="110" y="68" text-anchor="middle">list object</text>
  <text class="d-sub" x="110" y="96" text-anchor="middle">ob_size = 5</text>
  <text class="d-sub" x="110" y="120" text-anchor="middle">allocated = 8</text>
  <text class="d-sub" x="110" y="144" text-anchor="middle">ob_item pointer</text>
  <path class="d-edge-accent" d="M 200 100 L 262 100" marker-end="url(#py16q2-arrow)"/>
  <rect class="d-box" x="270" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="298" y="105" text-anchor="middle">[0]</text>
  <rect class="d-box" x="326" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="354" y="105" text-anchor="middle">[1]</text>
  <rect class="d-box" x="382" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="410" y="105" text-anchor="middle">[2]</text>
  <rect class="d-box" x="438" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="466" y="105" text-anchor="middle">[3]</text>
  <rect class="d-box" x="494" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="522" y="105" text-anchor="middle">[4]</text>
  <rect class="d-box-muted" x="550" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="578" y="105" text-anchor="middle">spare</text>
  <rect class="d-box-muted" x="606" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="634" y="105" text-anchor="middle">spare</text>
  <rect class="d-box-muted" x="662" y="76" width="56" height="48" rx="4"/>
  <text class="d-sub" x="690" y="105" text-anchor="middle">spare</text>
  <text class="d-sub d-accent" x="410" y="50" text-anchor="middle">pointer array: one machine word per slot</text>
  <path class="d-edge" d="M 298 124 L 298 224" marker-end="url(#py16q2-arrow)"/>
  <path class="d-edge" d="M 354 124 L 380 224" marker-end="url(#py16q2-arrow)"/>
  <path class="d-edge" d="M 410 124 L 462 224" marker-end="url(#py16q2-arrow)"/>
  <path class="d-edge" d="M 466 124 L 544 224" marker-end="url(#py16q2-arrow)"/>
  <path class="d-edge" d="M 522 124 L 626 224" marker-end="url(#py16q2-arrow)"/>
  <rect class="d-box" x="268" y="230" width="60" height="44" rx="22"/>
  <text class="d-sub" x="298" y="257" text-anchor="middle">int 10</text>
  <rect class="d-box" x="350" y="230" width="60" height="44" rx="22"/>
  <text class="d-sub" x="380" y="257" text-anchor="middle">str</text>
  <rect class="d-box" x="432" y="230" width="60" height="44" rx="22"/>
  <text class="d-sub" x="462" y="257" text-anchor="middle">list</text>
  <rect class="d-box" x="514" y="230" width="60" height="44" rx="22"/>
  <text class="d-sub" x="544" y="257" text-anchor="middle">None</text>
  <rect class="d-box" x="596" y="230" width="60" height="44" rx="22"/>
  <text class="d-sub" x="626" y="257" text-anchor="middle">float</text>
</svg>

The header records two numbers: how many slots are in use, and how many are reserved. In CPython's C source they are the fields \`ob_size\` (what \`len()\` returns) and \`allocated\`.

📌 **Interview term: Dynamic array** — a contiguous array that is replaced by a larger one when it fills up. Python's \`list\`, C++ \`std::vector\` and Java \`ArrayList\` are all dynamic arrays.

📌 **Interview term: Capacity** — the number of slots reserved (\`allocated\`), which is at least the length.

Because every slot is a pointer of the same size, indexing is a single address calculation: \`a[i]\` is O(1). It also means a list can hold any mix of types, and that one object can appear in many slots at once. For how names and references work in general, see [Python's name and object reference model](/interview-question/how-does-python-s-name-and-object-reference-model-work).

## 3. Over-Allocation: How the Block Grows

When \`append()\` finds \`ob_size == allocated\`, CPython's \`list_resize()\` picks a new capacity with a little room to spare. In the CPython 3.11.3 source ([Objects/listobject.c](https://github.com/python/cpython/blob/v3.11.3/Objects/listobject.c)) the rule is:

~~~python
new_allocated = (newsize + (newsize >> 3) + 6) & ~3
~~~

In words: the new size, plus one eighth of it (12.5%), plus 6, rounded down to a multiple of 4. The source comment beside it lists the growth pattern "0, 4, 8, 16, 24, 32, 40, 52, 64, 76, ...". One more branch matters for big jumps: if the requested size is closer to that over-allocated size than to the old size (for example \`extend()\` with many items at once), it allocates just \`newsize\` rounded up to a multiple of 4. Example 1 does not take this on trust: it watches the real capacity during 80 appends and checks it against this formula, and they match.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Appending a ninth item to a full block of eight: a new block of sixteen slots is allocated, the eight pointers are copied, the old block is freed">
  <defs>
    <marker id="py16q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="240" height="56" rx="8"/>
  <text class="d-text" x="150" y="64" text-anchor="middle">old block: 8 of 8 used</text>
  <text class="d-sub" x="150" y="86" text-anchor="middle">append item 9: no room</text>
  <path class="d-edge-accent" d="M 270 68 L 384 68" marker-end="url(#py16q2-arrow2)"/>
  <text class="d-sub" x="327" y="52" text-anchor="middle">realloc</text>
  <rect class="d-box-accent" x="390" y="40" width="340" height="56" rx="8"/>
  <text class="d-text" x="560" y="64" text-anchor="middle">new block: 16 slots</text>
  <text class="d-sub" x="560" y="86" text-anchor="middle">9 + 9 div 8 + 6 = 16, rounded down to a multiple of 4</text>
  <rect class="d-box" x="390" y="140" width="340" height="56" rx="8"/>
  <text class="d-text" x="560" y="164" text-anchor="middle">8 pointers copied, item 9 written</text>
  <text class="d-sub" x="560" y="186" text-anchor="middle">next 7 appends need no resize</text>
  <path class="d-edge" d="M 560 96 L 560 134" marker-end="url(#py16q2-arrow2)"/>
</svg>

The diagram shows the third resize: 9 items need room, \`9 + 1 + 6 = 16\`, already a multiple of 4.

📌 **Interview term: Over-allocation** — reserving more slots than currently needed so that the next several appends need no resize.

📌 **Interview term: Growth factor** — how much bigger each new block is. For CPython lists it tends towards about 1.125 for large lists; many other languages double (factor 2).

The capacities seen on 3.11 were 4, 8, 16, 24, 32, 40, 52, 64, 76, 92, and python3.12 and python3.13 printed the same sequence on our machine. Older CPython releases used a rule without the rounding to 4, whose source comment lists the sequence 0, 4, 8, 16, 25, 35, 46, 58, 72, 88; we did not pin down the exact release where it changed, so treat the numbers as "what 3.11 to 3.13 do", not as a language rule.

### Why that makes \`append()\` amortized O(1)

A resize copies every pointer, which is O(n). But after a resize to capacity about \`1.125 * n\`, the next \`0.125 * n\` appends are free. Spread the copy over those appends and each append pays a constant share. Example 2 counts this instead of timing it: even assuming every resize copies everything, the work stays at about 8 pointer copies per append, whether you append a thousand or a million items.

📌 **Interview term: Amortized O(1)** — an operation that is sometimes O(n) but averages to a constant over any long run of operations.

In practice it is cheaper still: CPython calls the C function \`realloc\`, which can often extend the block in place without copying.

### Shrinking

Lists shrink too, but lazily. \`list_resize()\` keeps the current block if the new size is still at least half the capacity. Example 1 pops a 100-slot list down: at 51 and 50 items the capacity is still 100; at 49 it drops to 60, which is the same formula applied to 49 (\`49 + 6 + 6 = 61\`, rounded down to 60). The half rule avoids "thrashing" when you alternately append and pop around a boundary.

## 4. What Is Fast and What Is Slow

| Operation | Cost | Why |
| :--- | :--- | :--- |
| \`a[i]\`, \`a[i] = x\`, \`len(a)\` | O(1) | one address calculation, length stored in the header |
| \`a.append(x)\` | amortized O(1) | spare slot at the end; rare resizes |
| \`a.pop()\` | O(1) amortized | removes the last slot; occasional shrink |
| \`a.insert(0, x)\`, \`a.pop(0)\`, \`del a[0]\` | O(n) | every later pointer shifts by one slot |
| \`x in a\`, \`a.index(x)\` | O(n) | linear scan with \`==\`; see [the in operator](/interview-question/how-does-the-in-operator-work-in-python) |
| \`a.extend(b)\` | O(len(b)) amortized | one resize to fit all of \`b\`, then copy |
| \`a[i:j]\` | O(j - i) | copies the slice into a new list |

Example 2 counts the pointer moves for 10,000 front inserts: 49,995,000, against zero for 10,000 appends. A queue that removes from the front should be a [\`collections.deque\`](/interview-question/how-does-collections-deque-work-internally), which is O(1) at both ends. For the API differences between the adding methods, see [append, extend and insert](/interview-question/what-is-the-difference-between-append-extend-and-insert-on-a-list).

## 5. The Code, Walked Through

### Example 1 — watching the real capacity

~~~python
import sys
import struct

# A list stores pointers. One pointer is 8 bytes on 64-bit CPython and
# 4 bytes in the browser (32-bit WebAssembly), so divide by the pointer size
# to get the number of slots, which is the same everywhere.
PTR = struct.calcsize("P")
EMPTY = sys.getsizeof([])

def capacity(lst):
    return (sys.getsizeof(lst) - EMPTY) // PTR

# 1. Watch the capacity jump while we append one item at a time
nums = []
seen = []
for i in range(80):
    nums.append(i)
    cap = capacity(nums)
    if not seen or seen[-1][1] != cap:
        seen.append((len(nums), cap))
print("len -> capacity:", seen)

# 2. The over-allocation rule from list_resize() in Objects/listobject.c
def grow(newsize):
    return (newsize + (newsize >> 3) + 6) & ~3

predicted = []
allocated = 0
for n in range(1, 81):
    if n > allocated:
        allocated = grow(n)
        predicted.append((n, allocated))
print("matches the formula:", predicted == seen)

# 3. Spare slots: len() counts items, capacity counts reserved slots
print(len(nums), capacity(nums))  # 80 92

# 4. Shrinking: pop() keeps the block until fewer than half the slots are used
big = list(range(100))
print(capacity(big))
for _ in range(49):
    big.pop()
print(len(big), capacity(big))
big.pop()
print(len(big), capacity(big))
big.pop()
print(len(big), capacity(big))

# 5. How you build a list changes its capacity
print(capacity([0] * 10))  # 10
print(capacity(list(range(10))))  # 10
print(capacity([x for x in range(10)]))  # 16

# 6. getsizeof counts the pointer array only, never the objects themselves
words = ["a" * 1000] * 3
print(capacity(words), words[0] is words[2])  # 3 True
~~~

- \`capacity()\` turns \`sys.getsizeof()\` into a slot count. The raw byte sizes differ by machine: an empty list reported 56 bytes on 64-bit python3.11 and 28 bytes in the 32-bit browser runtime on our runs, because a pointer is 8 or 4 bytes. Dividing by \`struct.calcsize("P")\` (the pointer size) gives a number that is the same everywhere.
- Section 2 rebuilds the capacity sequence from the formula and confirms \`True\`.
- Section 5 shows that construction matters: \`[0] * 10\` and \`list(range(10))\` know the length and allocate exactly 10 slots; a comprehension appends and ends at 16.
- Section 6 shows that \`getsizeof\` ignores the items: three references to one 1000-character string still cost 3 slots, and all three are the same object.

### Example 2 — counting the cost

~~~python
# Why append() is "amortized O(1)": count the work instead of timing it.

def grow(newsize):
    # CPython 3.11 over-allocation rule used by append()
    return (newsize + (newsize >> 3) + 6) & ~3

def simulate_appends(n):
    """Worst case: every resize copies every existing pointer to a new block."""
    allocated = 0
    copies = 0
    resizes = 0
    for size in range(1, n + 1):
        if size > allocated:
            copies += size - 1
            allocated = grow(size)
            resizes += 1
    return resizes, copies

for n in (1_000, 100_000, 1_000_000):
    resizes, copies = simulate_appends(n)
    print(f"{n:>9} appends: {resizes:>3} resizes, {copies / n:.2f} copies per append")

# Front operations shift every item: count the pointer moves.
def moves_for_insert_front(n):
    # insert(0, x) on a list of length k moves k pointers one slot right
    return sum(range(n))

n = 10_000
print("insert(0) x", n, "moves:", moves_for_insert_front(n))
# append() writes into a spare slot at the end: nothing moves
print("append    x", n, "moves:", 0)

# The real list agrees with the model about the result, of course:
front = []
for i in range(5):
    front.insert(0, i)
back = []
for i in range(5):
    back.append(i)
print(front, back[::-1] == front)  # [4, 3, 2, 1, 0] True

# For a queue, collections.deque gives O(1) at both ends
from collections import deque
q = deque([1, 2, 3])
q.appendleft(0)
q.append(4)
print(list(q))  # [0, 1, 2, 3, 4]
~~~

The model charges a full copy for every resize, which is the worst case. It needs only 86 resizes for a million appends, and the copying averages to roughly 8 copies per append (the limit is set by the 1/8 growth, since each copy is paid off over the next eighth). Front inserts are a different story: inserting at position 0 of a list of length \`k\` moves \`k\` pointers, so \`n\` of them move \`0 + 1 + ... + (n - 1)\` pointers in total.

## 6. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page's Pyodide 0.25.1 harness (a 32-bit build); the outputs matched exactly.

Example 1 output:

~~~text
len -> capacity: [(1, 4), (5, 8), (9, 16), (17, 24), (25, 32), (33, 40), (41, 52), (53, 64), (65, 76), (77, 92)]
matches the formula: True
80 92
100
51 100
50 100
49 60
10
10
16
3 True
~~~

Example 2 output:

~~~text
     1000 appends:  28 resizes, 7.56 copies per append
   100000 appends:  66 resizes, 7.98 copies per append
  1000000 appends:  86 resizes, 8.45 copies per append
insert(0) x 10000 moves: 49995000
append    x 10000 moves: 0
[4, 3, 2, 1, 0] True
[0, 1, 2, 3, 4]
~~~

## 7. Edge Cases Worth Knowing

- **Pre-sizing.** There is no \`reserve()\` method. \`[None] * n\` gives exactly \`n\` slots in one allocation; fill by index if you know the final size.
- **\`sys.getsizeof()\` is shallow.** It never includes the items. To estimate a whole structure you must walk it, and shared objects make the answer ambiguous; [how Python manages memory](/interview-question/how-does-python-manage-memory-and-garbage-collection) covers what really frees the objects.
- **Tuples do not over-allocate.** A tuple's length is fixed when it is created, so it stores its pointers inline with no spare room; see [list vs tuple](/interview-question/what-is-the-difference-between-a-list-and-a-tuple).
- **Mutation during iteration.** Appending to a list you are looping over keeps the loop going over the new items; removing items skips elements. Iterate over a copy.

## Common Pitfalls

- Saying "Python lists are linked lists". They are contiguous arrays of pointers; that is why indexing is O(1) and front insertion is O(n).
- Using \`list.pop(0)\` or \`insert(0, x)\` in a loop for a queue, turning an O(n) job into O(n²). Use \`deque\`.
- Quoting a doubling growth factor. CPython grows by roughly 1/8 plus a constant; the exact rule is an implementation detail.
- Reading \`sys.getsizeof(lst)\` as the memory of the list and its contents. It is only the header and pointer block.
- Expecting \`pop()\` to give memory back immediately. The block shrinks only below half full.
- Hard-coding byte sizes in tests. They differ between 64-bit and 32-bit builds and between versions; compute slot counts or compare relative sizes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What a list is:</strong> <span style="color:#f0e2c8;">A dynamic array: a header with the length (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ob_size</code>) and capacity (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allocated</code>) plus one contiguous block of pointers to the item objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it grows:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append()</code> finds no spare slot, CPython reallocates with about 12.5% extra plus a small constant, rounded to a multiple of 4: capacities 4, 8, 16, 24, 32, 40, 52, 64, 76, 92 on 3.11.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why append is O(1):</strong> <span style="color:#f0e2c8;">Resizes copy every pointer, but they get rarer as the list grows, so the copying averages to a constant per append: amortized O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What is slow:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(0, x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del a[0]</code> shift every pointer: O(n). Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> for queues.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Measuring it:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getsizeof()</code> shows header plus pointer block only, never the items, and it shrinks the block only when fewer than half the slots are used.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why grow by only about 12.5% and not double?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A smaller factor wastes less memory on big lists; the rare copies still average out to a constant per append. The constant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 6</code> makes small lists jump quickly (0, 4, 8, 16) so tiny lists do not resize on every append.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a resize always copy the data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not always: CPython calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">realloc</code>, which may extend the block in place if the memory after it is free. The O(n) copy is the worst case the amortized argument assumes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[x for x in range(10)]</code> bigger than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list(range(10))</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A comprehension appends one item at a time and ends with append-style spare room (16 slots for 10 items). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(range(10))</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0] * 10</code> know the final length up front and allocate exactly 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a list store its items inline like a C array of ints?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, only pointers, which is why a list can hold mixed types and why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[obj] * 3</code> gives three references to one object. For packed numbers use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array.array</code> or a NumPy array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you free the spare capacity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shrink_to_fit()</code>. Popping until fewer than half the slots are used shrinks it, or rebuild with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(old)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">old[:]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">old.copy()</code>: on 3.11 all three gave a 10-item comprehension list (16 slots) exactly 10 slots.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic array** | a contiguous array that is reallocated bigger when it runs out of room |
| **Capacity (\`allocated\`)** | the number of pointer slots reserved; at least the length |
| **Length (\`ob_size\`)** | the number of slots actually holding items |
| **Over-allocation** | reserving more slots than needed so the next appends need no resize |
| **Amortized O(1)** | constant time on average over a long sequence, despite occasional O(n) resizes |
| **\`realloc\`** | the C function that resizes a memory block, in place when possible |
| **Growth factor** | how much bigger each new block is; about 1.125 for CPython lists |
| **Pointer (machine word)** | an address of an object; 8 bytes on 64-bit, 4 bytes on 32-bit builds |

**Conclusion:** A Python list is a dynamic array: a header holding the length and capacity, and one contiguous block of pointers to the items. When \`append()\` finds no spare slot, CPython's \`list_resize()\` reallocates with about an eighth extra plus a small constant (capacities 4, 8, 16, 24, 32, 40, 52, ... on 3.11), so resizes are rare and append is amortized O(1), while anything that shifts the front of the list is O(n). Knowing the layout also explains why \`sys.getsizeof()\` jumps in steps and ignores the items, and why a \`deque\` is the right tool for a queue.`,
    examples: [
      { label: `Watch the real capacity grow and shrink`, code: `import sys
import struct

# A list stores pointers. One pointer is 8 bytes on 64-bit CPython and
# 4 bytes in the browser (32-bit WebAssembly), so divide by the pointer size
# to get the number of slots, which is the same everywhere.
PTR = struct.calcsize("P")
EMPTY = sys.getsizeof([])

def capacity(lst):
    return (sys.getsizeof(lst) - EMPTY) // PTR

# 1. Watch the capacity jump while we append one item at a time
nums = []
seen = []
for i in range(80):
    nums.append(i)
    cap = capacity(nums)
    if not seen or seen[-1][1] != cap:
        seen.append((len(nums), cap))
print("len -> capacity:", seen)

# 2. The over-allocation rule from list_resize() in Objects/listobject.c
def grow(newsize):
    return (newsize + (newsize >> 3) + 6) & ~3

predicted = []
allocated = 0
for n in range(1, 81):
    if n > allocated:
        allocated = grow(n)
        predicted.append((n, allocated))
print("matches the formula:", predicted == seen)

# 3. Spare slots: len() counts items, capacity counts reserved slots
print(len(nums), capacity(nums))  # 80 92

# 4. Shrinking: pop() keeps the block until fewer than half the slots are used
big = list(range(100))
print(capacity(big))
for _ in range(49):
    big.pop()
print(len(big), capacity(big))
big.pop()
print(len(big), capacity(big))
big.pop()
print(len(big), capacity(big))

# 5. How you build a list changes its capacity
print(capacity([0] * 10))  # 10
print(capacity(list(range(10))))  # 10
print(capacity([x for x in range(10)]))  # 16

# 6. getsizeof counts the pointer array only, never the objects themselves
words = ["a" * 1000] * 3
print(capacity(words), words[0] is words[2])  # 3 True` },
      { label: `Count the cost: amortized append vs front insert`, code: `# Why append() is "amortized O(1)": count the work instead of timing it.

def grow(newsize):
    # CPython 3.11 over-allocation rule used by append()
    return (newsize + (newsize >> 3) + 6) & ~3

def simulate_appends(n):
    """Worst case: every resize copies every existing pointer to a new block."""
    allocated = 0
    copies = 0
    resizes = 0
    for size in range(1, n + 1):
        if size > allocated:
            copies += size - 1
            allocated = grow(size)
            resizes += 1
    return resizes, copies

for n in (1_000, 100_000, 1_000_000):
    resizes, copies = simulate_appends(n)
    print(f"{n:>9} appends: {resizes:>3} resizes, {copies / n:.2f} copies per append")

# Front operations shift every item: count the pointer moves.
def moves_for_insert_front(n):
    # insert(0, x) on a list of length k moves k pointers one slot right
    return sum(range(n))

n = 10_000
print("insert(0) x", n, "moves:", moves_for_insert_front(n))
# append() writes into a spare slot at the end: nothing moves
print("append    x", n, "moves:", 0)

# The real list agrees with the model about the result, of course:
front = []
for i in range(5):
    front.insert(0, i)
back = []
for i in range(5):
    back.append(i)
print(front, back[::-1] == front)  # [4, 3, 2, 1, 0] True

# For a queue, collections.deque gives O(1) at both ends
from collections import deque
q = deque([1, 2, 3])
q.appendleft(0)
q.append(4)
print(list(q))  # [0, 1, 2, 3, 4]` },
    ],
  },
  {
    title: `How does a Python set find items?`,
    difficulty: "medium",
    seoDescription: `How a Python set finds items: hashing, slots, linear and perturbed probing, identity then __eq__, resizing and worst cases, with verified Python output.`,
    description: `**Question presented to candidate:**
"\`x in my_list\` is slow for a big list, but \`x in my_set\` is fast. What does a set actually do to find \`x\`, which of your object's methods does it call, and when does that speed break down?"

**What a strong answer should cover:**
- A set is a hash table of keys only: \`hash(x)\` picks a starting slot (\`hash & mask\`), and the search walks a probe sequence until it hits the key or an empty slot. Average O(1), worst case O(n).
- The match test, in order: equal stored hash, then identity (\`is\`), then \`__eq__\`. So \`__eq__\` runs only on a hash match, and the identity shortcut is why the same NaN object is found.
- The rules this imposes: members must be hashable, equal objects must hash alike (\`{1, 1.0, True}\` has one element), and mutating an object's hash after insertion loses it.
- A CPython detail: sets probe a few neighbouring slots linearly (\`LINEAR_PROBES\`, 9) before jumping with the perturbed \`5*i + 1 + perturb\` step, and resize at about 60% full, growing 4x.
- Order: iteration walks slots, so set order depends on hashes, is not insertion order, and can change between runs for strings (hash randomisation).

**Code / implementation expected:** Optional — instrumenting \`__hash__\` / \`__eq__\` to show which calls a lookup makes is a strong answer.`,
    answer: `**Target Audience:** Developers who know what a set is and want to explain how membership tests work; no prior hash-table knowledge needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). Probe constants are CPython implementation details.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a block of post office boxes. A clerk does not keep letters in one long pile and search through it. Each letter's postcode is turned into a box number by a fixed rule, so to check "is there a letter for Ana?" the clerk walks straight to one box. If someone else's letter is already in that box (a collision), the clerk follows a fixed rule to the next box to try, and an empty box means "no letter for Ana".

A Python \`set\` is that wall of boxes. Searching a list means looking at every item in turn, so a list of a million items can take a million comparisons. A set turns the item into a box number with \`hash()\` and usually looks in one or two boxes. That is the difference between O(n) and O(1), and it is why "use a set for membership tests" is one of the most common performance tips in Python.

## 2. The Core Idea: Hash to a Slot

A set is a **hash table** that stores keys only. Internally it is an array of slots; each slot holds either nothing, a key pointer together with that key's hash, or a "dummy" marker left by a deletion.

To look for \`x\`:

1. compute \`h = hash(x)\` once;
2. take the low bits: \`i = h & mask\`, where \`mask\` is the table size minus 1 (sizes are powers of two);
3. examine slot \`i\` and decide: empty means not found, a match means found, anything else means "probe another slot".

📌 **Interview term: Hash table** — an array whose positions are computed from a hash of the key.

📌 **Interview term: Mask** — \`table_size - 1\`. With 8 slots the mask is 7, so \`hash & 7\` keeps the 3 lowest bits.

Small ints are perfect for seeing this, because \`hash(n) == n\` for them. In a new 8-slot set, \`10 & 7 == 2\`, \`3 & 7 == 3\`, \`1 & 7 == 1\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="An eight slot set table holding 1 in slot 1, 10 in slot 2 and 3 in slot 3, so iteration prints 1, 10, 3">
  <text class="d-sub" x="380" y="26" text-anchor="middle">slot = hash and 7 for a new 8 slot table</text>
  <rect class="d-box-muted" x="40" y="50" width="80" height="60" rx="6"/>
  <text class="d-sub" x="80" y="85" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="125" y="50" width="80" height="60" rx="6"/>
  <text class="d-text" x="165" y="85" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="210" y="50" width="80" height="60" rx="6"/>
  <text class="d-text" x="250" y="85" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="295" y="50" width="80" height="60" rx="6"/>
  <text class="d-text" x="335" y="85" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="50" width="80" height="60" rx="6"/>
  <text class="d-sub" x="420" y="85" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="465" y="50" width="80" height="60" rx="6"/>
  <text class="d-sub" x="505" y="85" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="550" y="50" width="80" height="60" rx="6"/>
  <text class="d-sub" x="590" y="85" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="635" y="50" width="80" height="60" rx="6"/>
  <text class="d-sub" x="675" y="85" text-anchor="middle">7</text>
  <text class="d-sub" x="165" y="150" text-anchor="middle">1 and 7 = 1</text>
  <text class="d-sub" x="250" y="176" text-anchor="middle">10 and 7 = 2</text>
  <text class="d-sub" x="335" y="150" text-anchor="middle">3 and 7 = 3</text>
</svg>

Iteration simply walks the slots from 0 to 7, which is why \`{10, 3, 1}\` prints \`{1, 10, 3}\`. That is also the honest answer to "is a set ordered?": its order is slot order, a by-product of hashes and table size, never a promise.

## 3. How a Slot Decides "Match"

The comparison at each slot is cheap first, expensive last. This is the order in \`set_lookkey()\` in the CPython 3.11.3 source (\`Objects/setobject.c\`):

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="Set lookup: hash once, go to the slot, stop on empty; on an equal stored hash check identity, then eq; otherwise probe the next slot">
  <defs>
    <marker id="py16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="56" text-anchor="middle">h = hash(x)</text>
  <text class="d-sub" x="100" y="78" text-anchor="middle">called once</text>
  <rect class="d-box" x="240" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="325" y="56" text-anchor="middle">slot i = h and mask</text>
  <text class="d-sub" x="325" y="78" text-anchor="middle">read key and hash</text>
  <rect class="d-box-muted" x="470" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="545" y="56" text-anchor="middle">empty slot</text>
  <text class="d-sub" x="545" y="78" text-anchor="middle">not in set</text>
  <rect class="d-box" x="20" y="150" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="176" text-anchor="middle">same hash ?</text>
  <text class="d-sub" x="100" y="198" text-anchor="middle">two ints compared</text>
  <rect class="d-box" x="240" y="150" width="170" height="60" rx="10"/>
  <text class="d-text" x="325" y="176" text-anchor="middle">stored is x ?</text>
  <text class="d-sub" x="325" y="198" text-anchor="middle">identity, no call</text>
  <rect class="d-box" x="470" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="545" y="176" text-anchor="middle">stored == x ?</text>
  <text class="d-sub" x="545" y="198" text-anchor="middle">calls eq</text>
  <rect class="d-box-accent" x="470" y="264" width="150" height="56" rx="10"/>
  <text class="d-text" x="545" y="297" text-anchor="middle">found</text>
  <rect class="d-box-muted" x="20" y="264" width="160" height="56" rx="10"/>
  <text class="d-text" x="100" y="288" text-anchor="middle">no match</text>
  <text class="d-sub" x="100" y="308" text-anchor="middle">probe next slot</text>
  <path class="d-edge" d="M 180 60 L 234 60" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge" d="M 410 60 L 464 60" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge" d="M 300 90 L 120 144" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge" d="M 180 180 L 234 180" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge" d="M 410 180 L 464 180" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge-accent" d="M 380 210 L 500 258" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge-accent" d="M 545 210 L 545 258" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge-dashed" d="M 100 210 L 100 258" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge-dashed" d="M 620 190 L 690 190 L 690 330 L 186 300" marker-end="url(#py16q3-arrow)"/>
  <path class="d-edge-dashed" d="M 20 292 L 6 292 L 6 120 L 300 92" marker-end="url(#py16q3-arrow)"/>
</svg>

1. **Empty?** An empty slot ends the search: not found.
2. **Hash:** each slot stores its key's hash, so CPython first compares two integers. A different hash means "not this key", and nothing else runs.
3. **Identity:** on an equal hash, if the stored key \`is\` the object you are looking for, it is a match, with no Python method called. (Exact \`str\` objects also get a fast C comparison here.)
4. **Equality:** only then does it call \`__eq__\` on the stored key. A False answer, or any failed step above, moves on to the next slot in the probe sequence.

(Dicts do the identity check before the hash comparison; the result is the same, because an object always has the same hash as itself.)

Example 1 logs every call: looking up the exact stored object calls only \`__hash__\`; an equal but different object adds one \`__eq__\`; a colliding object with the same hash gets one \`__eq__\` that returns False; and an object whose hash matches nothing triggers no \`__eq__\` at all.

📌 **Interview term: Identity check** — the \`is\` test done before \`__eq__\`. It is a speed shortcut, and it explains a famous oddity: a NaN is never equal to itself, yet \`x in {x}\` is True for the same NaN object, while \`float("nan") in {float("nan")}\` is False.

This order is also why the hash contract matters: if \`a == b\`, then \`hash(a)\` must equal \`hash(b)\`, or the search would never reach the \`__eq__\` call. \`1\`, \`1.0\` and \`True\` are equal and hash alike, so \`{1, 1.0, True}\` is \`{1}\`. The rule is covered fully in [the __hash__ and __eq__ contract](/interview-question/what-is-the-hash-and-eq-contract).

## 4. Collisions: Linear Probes, Then Perturbed Jumps

When a slot holds a different key, CPython's \`Objects/setobject.c\` uses a hybrid strategy. Its source defines \`LINEAR_PROBES\` as 9 (it can be changed at build time) and describes the scheme as linear probing followed by randomised probing ([setobject.c at v3.11.3](https://github.com/python/cpython/blob/v3.11.3/Objects/setobject.c)):

- from the starting slot it checks up to 9 more **neighbouring** slots (when they fit before the end of the table), because adjacent memory is usually already in the CPU cache;
- then it jumps with \`perturb >>= 5; i = (i * 5 + 1 + perturb) & mask\`, the same recurrence dicts use. \`perturb\` starts as the full hash, so higher bits of the hash steer the jumps and keys sharing low bits split apart.

📌 **Interview term: Linear probing** — after a collision, try the next adjacent slots.

📌 **Interview term: Perturbation** — feeding higher bits of the hash into the next probe position so colliding keys spread over the table.

Example 2 shows the visible effect: \`8\` and \`16\` both want slot 0. Whichever arrives second probes onward, so \`list({8, 16})\` is \`[8, 16]\` and \`list({16, 8})\` is \`[16, 8]\`, even though the two sets are equal.

Deleting a member cannot just empty its slot, because a later key's probe chain may run through it. The slot gets a **dummy** marker instead: searches walk past it, inserts may reuse it.

📌 **Interview term: Dummy slot** — a deleted marker that keeps probe chains intact.

## 5. Resizing: Keeping the Table Sparse

A probe walk only ends at an empty slot or a match, so a nearly full table would make every miss slow. CPython resizes early. Example 2 counts slots after each \`add()\` and printed \`[(1, 8), (5, 32), (19, 128), (77, 512)]\`: the 5th member made an 8-slot table grow to 32, the 19th made 32 grow to 128, the 77th made 128 grow to 512. Those points match the rule in the 3.11.3 source: \`set_add_entry()\` resizes once \`fill * 5 >= mask * 3\` (filled-or-dummy slots reach about 60%: 5 of 8, 19 of 32, 77 of 128), and the new table is the next power of two above 4 times the member count (2 times above 50,000 members). It is an implementation detail, not a language rule.

📌 **Interview term: Load factor** — the fraction of slots in use. Sets keep it below about 60%, dicts below two thirds.

Each resize re-inserts every member (O(n)) but they get rarer as the set grows, so \`add()\` is amortized O(1).

## 6. When It Breaks Down

The O(1) average assumes hashes spread out. If every member returns the same hash, every member lands on the same probe chain and every insert compares against all earlier members. Example 2 measures exactly that with a constant \`__hash__\`: 100, 200 and 400 members took 6,496, 28,370 and 106,381 \`__eq__\` calls, roughly 4x more work for 2x more members. That is quadratic total work, O(n) per operation.

For \`str\` and \`bytes\`, Python defends against attackers who would craft colliding keys by randomising their hashes per process. Running \`hash("abc")\` with \`PYTHONHASHSEED=1\` and \`PYTHONHASHSEED=2\` gave different numbers on our machine, and \`list({"a", "b", "c", "d"})\` came out in a different order. Ints are not randomised, which is why every int output on this page is stable.

| Operation | Average | Worst case |
| :--- | :--- | :--- |
| \`x in s\`, \`s.add(x)\`, \`s.discard(x)\` | O(1) | O(n) |
| \`s.remove(x)\` | O(1) | O(n), \`KeyError\` if missing |
| iterate \`s\` | O(table size) | O(table size) |
| \`a & b\` (intersection) | O(min(len(a), len(b))) | O(len(a) * len(b)) |
| \`a \\| b\` (union) | O(len(a) + len(b)) | quadratic with collisions |

The set algebra itself has its own page: [what set operations Python supports](/interview-question/what-set-operations-does-python-support). How \`in\` dispatches for every container type is in [how the in operator works](/interview-question/how-does-the-in-operator-work-in-python).

## 7. The Code, Walked Through

### Example 1 — which methods does a lookup call?

~~~python
# Watch exactly which dunder methods a set calls while it searches.
class Key:
    log = []

    def __init__(self, name, h):
        self.name, self.h = name, h

    def __hash__(self):
        Key.log.append(f"hash({self.name})")
        return self.h

    def __eq__(self, other):
        Key.log.append(f"{self.name}=={other.name}")
        return isinstance(other, Key) and self.name == other.name

    def __repr__(self):
        return self.name

a, b, c = Key("a", 1), Key("b", 2), Key("c", 1)
s = {a, b}
Key.log.clear()

# 1. Same object: hash once, identity match, __eq__ never runs
print(a in s, Key.log)
Key.log.clear()

# 2. Equal value, different object: hash, then __eq__ on the hash match
print(Key("a", 1) in s, Key.log)
Key.log.clear()

# 3. Same hash, different value (a collision): __eq__ runs and says no
print(c in s, Key.log)
Key.log.clear()

# 4. A hash that matches nothing: no __eq__ at all
print(Key("z", 99) in s, Key.log)

# The identity shortcut is why NaN can be found by identity only
nan = float("nan")
print(nan == nan)  # False
print(nan in {nan})  # True
print(float("nan") in {float("nan")})  # False

# 1, 1.0 and True are equal and hash alike, so the set keeps one of them
print({1, 1.0, True})  # {1}

# Unhashable things cannot even be looked up
try:
    [1] in {1, 2}
except TypeError as err:
    print("TypeError:", err)
~~~

- \`Key\` logs \`__hash__\` and \`__eq__\`; \`a\` and \`c\` deliberately share hash 1.
- Case 3 logs \`a==c\`: CPython called the **stored** key's \`__eq__\` with your object as the argument.
- \`[1] in {1, 2}\` raises \`TypeError\` before any search starts, because the list cannot be hashed.

### Example 2 — slots, collisions, growth and a lost member

~~~python
# 1. Small ints hash to themselves, so their slot is easy to predict:
#    slot = hash & (table_size - 1), and a new set starts with 8 slots.
print(hash(3), hash(10), hash(-1))  # 3 10 -2
print({10, 3, 1})  # {1, 10, 3}
# 10 & 7 == 2 and 3 & 7 == 3, so iteration walks slots 1, 2, 3.

# 16 & 7 == 0 and 8 & 7 == 0: a collision. The later one probes onward,
# so insertion order changes the iteration order of these equal-looking sets.
print(list({8, 16}), list({16, 8}))  # [8, 16] [16, 8]
print({8, 16} == {16, 8})  # True

# 2. Worst case: every key has the same hash, so every insert compares
#    against all earlier keys. Count __eq__ calls instead of timing.
class Clash:
    eq_calls = 0

    def __init__(self, v):
        self.v = v

    def __hash__(self):
        return 42

    def __eq__(self, other):
        Clash.eq_calls += 1
        return self.v == other.v

previous = None
for n in (100, 200, 400):
    Clash.eq_calls = 0
    bad = set()
    for i in range(n):
        bad.add(Clash(i))
    growth = "" if previous is None else f"  (x{Clash.eq_calls / previous:.1f})"
    print(f"{n} keys -> {Clash.eq_calls} __eq__ calls{growth}")
    previous = Clash.eq_calls

# A normal int key: one hash, almost never an __eq__ call
fine = set(range(400))
print(399 in fine, 400 in fine)  # True False

# 3. The table grows before it gets crowded. Count slots from getsizeof:
#    each slot holds a key pointer and a hash (2 machine words).
import sys, struct
WORD = struct.calcsize("P")
BASE = sys.getsizeof(set())

def slots(st):
    extra = sys.getsizeof(st) - BASE
    return 8 if extra == 0 else extra // (2 * WORD)

grown, last = [], None
t = set()
for i in range(300):
    t.add(i)
    if slots(t) != last:
        last = slots(t)
        grown.append((len(t), last))
print("len -> slots:", grown)

# 4. Mutating an object after it went into a set loses it
class Box:
    def __init__(self, v):
        self.v = v

    def __hash__(self):
        return hash(self.v)

    def __eq__(self, other):
        return self.v == other.v

box = Box(1)
boxes = {box}
box.v = 2
print(box in boxes, Box(1) in boxes, len(boxes))  # False False 1
~~~

- \`hash(-1)\` is \`-2\`: in CPython's C API \`-1\` signals an error from a hash function, so the value -1 is never used as a hash.
- \`slots()\` divides the extra bytes by two machine words, because each slot stores a key pointer and a hash. This makes the count identical on 64-bit python3.11 and the 32-bit browser runtime.
- The last block mutates \`box.v\` after insertion. Its stored hash is still \`hash(1)\`, so searching with the new value looks in the wrong slot, and searching for \`Box(1)\` finds the slot but \`__eq__\` now fails. The member is unreachable but still counted.

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page's Pyodide 0.25.1 harness; the outputs matched exactly.

Example 1 output:

~~~text
True ['hash(a)']
True ['hash(a)', 'a==a']
False ['hash(c)', 'a==c']
False ['hash(z)']
False
True
False
{1}
TypeError: unhashable type: 'list'
~~~

Example 2 output:

~~~text
3 10 -2
{1, 10, 3}
[8, 16] [16, 8]
True
100 keys -> 6496 __eq__ calls
200 keys -> 28370 __eq__ calls  (x4.4)
400 keys -> 106381 __eq__ calls  (x3.7)
True False
len -> slots: [(1, 8), (5, 32), (19, 128), (77, 512)]
False False 1
~~~

## Common Pitfalls

- Writing \`__eq__\` without a matching \`__hash__\`. Defining \`__eq__\` sets \`__hash__\` to \`None\`, so the class becomes unhashable; define both from the same fields.
- Mutating a field that the hash depends on after putting the object in a set or dict: the member becomes unreachable.
- Relying on set iteration order, for example in tests or output. Sort it, or use a dict (\`dict.fromkeys(items)\`) when you need ordered uniqueness.
- Assuming an equal hash means "duplicate". It only triggers the \`__eq__\` call.
- Returning a constant or low-quality hash from a custom class. Correct but O(n) per lookup; hash a tuple of the identifying fields instead.
- Converting a list to a set just to test one membership. Building the set is O(n); it pays off only for repeated lookups.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The structure:</strong> <span style="color:#f0e2c8;">A set is a hash table of keys with no values: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash(x)</code> chooses a starting slot with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash &amp; mask</code>, and a probe sequence handles collisions (open addressing).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The match test:</strong> <span style="color:#f0e2c8;">An empty slot means not found. Otherwise CPython compares the stored hash, then identity, and only then calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> runs only on a hash match.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The probing:</strong> <span style="color:#f0e2c8;">CPython sets check up to 9 more neighbouring slots linearly (cache friendly), then jump with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = 5*i + 1 + perturb</code>, mixing in higher hash bits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it stays fast:</strong> <span style="color:#f0e2c8;">The table is resized at about 60% full, so probe walks stay short: O(1) average for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">discard</code>. If many keys share a hash it degrades to O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rules:</strong> <span style="color:#f0e2c8;">Members must be hashable, equal objects must hash alike (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 1.0, True}</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1}</code>), never mutate a member hash, and do not rely on set order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">float("nan") in {float("nan")}</code> False, but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x in {x}</code> True for one NaN <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NaN is not equal to itself, so two different NaN objects never match. The same object matches through the identity check, which comes before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If two objects have the same hash, are they treated as the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. An equal hash only gets you to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> call; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> decides. Equal hashes with unequal values are just a collision and cost an extra comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a set different from a dict internally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are open-addressing hash tables in C, but a set stores only (key, hash) per slot, has no separate dense entries array, and so does not keep insertion order. Sets also add linear probing before the perturbed jumps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{3, 1, 2}</code> print sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Small ints hash to themselves, so in a small table they sit in slots 1, 2, 3 and iteration walks the slots in order. Bigger or colliding values break the pattern: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{10, 3, 1}</code> prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 10, 3}</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a hash flood attack slow down a set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code> hashes are randomised per process (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PYTHONHASHSEED</code>). Custom classes with a weak <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> (for example, constant) still degrade to O(n) per operation.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash table** | array of slots indexed by a function of the hash |
| **Slot / bucket** | one position of the table; a set slot stores a key pointer and its hash |
| **Mask** | \`table_size - 1\`; \`hash & mask\` keeps the low bits as a slot number |
| **Collision** | two keys whose hashes lead to the same slot |
| **Linear probing** | trying the next adjacent slots after a collision |
| **Perturbation** | mixing higher hash bits into the next probe so colliding keys spread out |
| **Identity check** | the \`is\` comparison done before \`__eq__\`, which also lets the same NaN object be found |
| **Load factor** | fraction of slots in use; a set resizes at about 60% |
| **Dummy slot** | a deleted marker that keeps probe chains intact |
| **Hash randomisation** | per-process salting of \`str\`/\`bytes\` hashes, set by \`PYTHONHASHSEED\` |

**Conclusion:** A Python set finds an item by hashing it once, using the low bits of the hash as a starting slot and walking a short probe sequence (a few linear neighbours, then perturbed jumps) until it reaches the item or an empty slot. At each slot it checks the stored hash, then identity, and only then \`__eq__\`, which is why members must be hashable and equal objects must hash alike. Early resizing keeps the walk short and gives O(1) average membership tests, while collisions, whether from a bad \`__hash__\` or crafted input, are what push it back towards O(n). Dictionaries use the same machinery plus an ordered entries array; see [how dictionaries are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered).`,
    examples: [
      { label: `Which of your methods a set lookup calls`, code: `# Watch exactly which dunder methods a set calls while it searches.
class Key:
    log = []

    def __init__(self, name, h):
        self.name, self.h = name, h

    def __hash__(self):
        Key.log.append(f"hash({self.name})")
        return self.h

    def __eq__(self, other):
        Key.log.append(f"{self.name}=={other.name}")
        return isinstance(other, Key) and self.name == other.name

    def __repr__(self):
        return self.name

a, b, c = Key("a", 1), Key("b", 2), Key("c", 1)
s = {a, b}
Key.log.clear()

# 1. Same object: hash once, identity match, __eq__ never runs
print(a in s, Key.log)
Key.log.clear()

# 2. Equal value, different object: hash, then __eq__ on the hash match
print(Key("a", 1) in s, Key.log)
Key.log.clear()

# 3. Same hash, different value (a collision): __eq__ runs and says no
print(c in s, Key.log)
Key.log.clear()

# 4. A hash that matches nothing: no __eq__ at all
print(Key("z", 99) in s, Key.log)

# The identity shortcut is why NaN can be found by identity only
nan = float("nan")
print(nan == nan)  # False
print(nan in {nan})  # True
print(float("nan") in {float("nan")})  # False

# 1, 1.0 and True are equal and hash alike, so the set keeps one of them
print({1, 1.0, True})  # {1}

# Unhashable things cannot even be looked up
try:
    [1] in {1, 2}
except TypeError as err:
    print("TypeError:", err)` },
      { label: `Slots, collisions, growth and a lost member`, code: `# 1. Small ints hash to themselves, so their slot is easy to predict:
#    slot = hash & (table_size - 1), and a new set starts with 8 slots.
print(hash(3), hash(10), hash(-1))  # 3 10 -2
print({10, 3, 1})  # {1, 10, 3}
# 10 & 7 == 2 and 3 & 7 == 3, so iteration walks slots 1, 2, 3.

# 16 & 7 == 0 and 8 & 7 == 0: a collision. The later one probes onward,
# so insertion order changes the iteration order of these equal-looking sets.
print(list({8, 16}), list({16, 8}))  # [8, 16] [16, 8]
print({8, 16} == {16, 8})  # True

# 2. Worst case: every key has the same hash, so every insert compares
#    against all earlier keys. Count __eq__ calls instead of timing.
class Clash:
    eq_calls = 0

    def __init__(self, v):
        self.v = v

    def __hash__(self):
        return 42

    def __eq__(self, other):
        Clash.eq_calls += 1
        return self.v == other.v

previous = None
for n in (100, 200, 400):
    Clash.eq_calls = 0
    bad = set()
    for i in range(n):
        bad.add(Clash(i))
    growth = "" if previous is None else f"  (x{Clash.eq_calls / previous:.1f})"
    print(f"{n} keys -> {Clash.eq_calls} __eq__ calls{growth}")
    previous = Clash.eq_calls

# A normal int key: one hash, almost never an __eq__ call
fine = set(range(400))
print(399 in fine, 400 in fine)  # True False

# 3. The table grows before it gets crowded. Count slots from getsizeof:
#    each slot holds a key pointer and a hash (2 machine words).
import sys, struct
WORD = struct.calcsize("P")
BASE = sys.getsizeof(set())

def slots(st):
    extra = sys.getsizeof(st) - BASE
    return 8 if extra == 0 else extra // (2 * WORD)

grown, last = [], None
t = set()
for i in range(300):
    t.add(i)
    if slots(t) != last:
        last = slots(t)
        grown.append((len(t), last))
print("len -> slots:", grown)

# 4. Mutating an object after it went into a set loses it
class Box:
    def __init__(self, v):
        self.v = v

    def __hash__(self):
        return hash(self.v)

    def __eq__(self, other):
        return self.v == other.v

box = Box(1)
boxes = {box}
box.v = 2
print(box in boxes, Box(1) in boxes, len(boxes))  # False False 1` },
    ],
  },
  {
    title: `How does the bisect module work?`,
    difficulty: "medium",
    seoDescription: `How Python bisect works: binary search on sorted lists, bisect_left vs bisect_right, insort cost, key= since 3.10, written by hand and verified.`,
    description: `**Question presented to candidate:**
"Say you have a big sorted list and you need to find where a value belongs, or count how many values fall in a range. What does Python's \`bisect\` module do, how does it work, and when is it the wrong tool?"

**What a strong answer should cover:**
- \`bisect\` is binary search on an already sorted sequence: it halves a \`[lo, hi)\` window each step, so it needs about log2(n) comparisons (20 for a million items).
- \`bisect_left\` returns the first position where \`x\` could go (before equal items), \`bisect_right\` / \`bisect\` the position after equal items; \`right - left\` counts the copies of \`x\`.
- \`insort\` / \`insort_left\` / \`insort_right\` keep a list sorted, but the search is O(log n) while the list insert is O(n), so it does not beat a heap or a sorted container for many inserts.
- The \`key=\` argument (added in Python 3.10) is applied to the list items, not to \`x\`; \`lo\` and \`hi\` limit the window; only \`<\` is used for comparisons.
- Typical uses: membership in a sorted list, range counts, bucketing a score into a grade, and keeping a small sorted list up to date.

**Code / implementation expected:** Yes — either use \`bisect\` for a lookup/range task, or write \`bisect_left\` by hand.`,
    answer: `**Target Audience:** Beginners who know lists and sorting; candidates who want to write binary search confidently in an interview.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). \`key=\` needs Python 3.10 or newer.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of finding the word "otter" in a paper dictionary. Nobody reads from page one. You open it near the middle, see "lemon", know "otter" comes later, and throw away the first half. You open the middle of what is left, see "puzzle", throw away the later half, and keep going. Each glance halves what is left, so even a 1,000-page dictionary takes about 10 glances.

That trick is **binary search**, and Python ships it as the \`bisect\` module. It works only because the dictionary is sorted, and the same is true for \`bisect\`: give it a sorted list and it finds the position for any value in about log2(n) steps. A million items take 20 comparisons, a billion take 30. Interviewers like it because it tests whether you understand sortedness, off-by-one boundaries and the difference between finding a position and finding a value.

## 2. The Core Idea: An Insertion Point, Not a Search Result

\`bisect\` never answers "is \`x\` in the list?". It answers a slightly different question: **at which index could \`x\` be inserted so the list stays sorted?** That question always has an answer, even when \`x\` is not present.

📌 **Interview term: Insertion point** — the index where \`x\` would go to keep the list sorted.

When the list contains copies of \`x\`, there are several valid insertion points, so there are two functions:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="Sorted list 10 20 20 20 30 40 with bisect_left of 20 at index 1 and bisect_right of 20 at index 4">
  <defs>
    <marker id="py16q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="140" y="56" text-anchor="middle">0</text>
  <text class="d-sub" x="240" y="56" text-anchor="middle">1</text>
  <text class="d-sub" x="340" y="56" text-anchor="middle">2</text>
  <text class="d-sub" x="440" y="56" text-anchor="middle">3</text>
  <text class="d-sub" x="540" y="56" text-anchor="middle">4</text>
  <text class="d-sub" x="640" y="56" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="100" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="140" y="104" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="200" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="240" y="104" text-anchor="middle">20</text>
  <rect class="d-box-accent" x="300" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="340" y="104" text-anchor="middle">20</text>
  <rect class="d-box-accent" x="400" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="440" y="104" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="500" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="540" y="104" text-anchor="middle">30</text>
  <rect class="d-box-muted" x="600" y="70" width="80" height="56" rx="6"/>
  <text class="d-text" x="640" y="104" text-anchor="middle">40</text>
  <path class="d-edge-accent" d="M 190 196 L 190 134" marker-end="url(#py16q4-arrow)"/>
  <text class="d-text d-accent" x="190" y="220" text-anchor="middle">bisect_left = 1</text>
  <path class="d-edge-accent" d="M 490 196 L 490 134" marker-end="url(#py16q4-arrow)"/>
  <text class="d-text d-accent" x="490" y="220" text-anchor="middle">bisect_right = 4</text>
</svg>

- \`bisect_left(a, x)\` returns the leftmost one: everything before it is \`< x\`, so it lands on the first \`20\` (index 1).
- \`bisect_right(a, x)\` (and its alias \`bisect\`) returns the rightmost one: everything before it is \`<= x\`, so it lands after the last \`20\` (index 4).

The difference \`4 - 1 = 3\` is the number of 20s. For a value that is not there, such as 25, both return the same index.

📌 **Interview term: bisect_left / bisect_right** — the insertion point before, or after, any items equal to \`x\`.

## 3. How It Works: Halving a Window

Both functions keep a **half-open window** \`[lo, hi)\` that is known to contain the answer, starting with the whole list. Each step looks at the middle item and throws away the half that cannot hold the answer:

~~~python
def bisect_left(a, x, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:      # the answer is to the right of mid
            lo = mid + 1
        else:               # a[mid] >= x: mid itself might be the answer
            hi = mid
    return lo
~~~

📌 **Interview term: Half-open interval** — \`[lo, hi)\` includes \`lo\` and excludes \`hi\`. It makes the loop condition \`lo < hi\` and the empty window \`lo == hi\` fall out naturally.

📌 **Interview term: Loop invariant** — a statement true at every step. Here: every item before \`lo\` is \`< x\`, and every item from \`hi\` on is \`>= x\`. When the window is empty, \`lo\` is the boundary between the two, which is exactly the leftmost insertion point.

\`bisect_right\` is the same loop with the test flipped to \`if x < a[mid]: hi = mid else: lo = mid + 1\`, so equal items are skipped to the right. Example 2 writes both by hand and checks them against the module on 2,000 random cases.

Tracing the search for 23 in \`[0, 2, 4, ..., 30]\` (16 items):

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="Searching 23 in sixteen even numbers: the window shrinks from 16 items to 7, 3, 1 and finally 0, ending at index 12">
  <rect class="d-box" x="40" y="30" width="640" height="40" rx="6"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">lo 0 to hi 16: mid 8 holds 16, smaller than 23, go right</text>
  <rect class="d-box" x="340" y="95" width="340" height="40" rx="6"/>
  <text class="d-text" x="510" y="121" text-anchor="middle">lo 9 to 16: mid 12 holds 24, go left</text>
  <rect class="d-box" x="340" y="160" width="220" height="40" rx="6"/>
  <text class="d-text" x="450" y="186" text-anchor="middle">9 to 12: mid 10, go right</text>
  <rect class="d-box" x="400" y="225" width="160" height="40" rx="6"/>
  <text class="d-text" x="480" y="251" text-anchor="middle">11 to 12: mid 11</text>
  <rect class="d-box-accent" x="600" y="225" width="120" height="40" rx="6"/>
  <text class="d-text" x="660" y="251" text-anchor="middle">answer 12</text>
</svg>

Four comparisons reduce 16 candidates to one boundary: index 12, between 22 and 24. In general the window shrinks to half each step, so the number of comparisons is about log2(n). Example 2 counts them: 4 for 16 items, 10 for 1,024, 20 for a million and 30 for a billion.

Two CPython details worth knowing:

- In CPython the functions come from the C module \`_bisect\`: \`bisect.py\` defines Python versions, then replaces them with \`from _bisect import *\`. Example 1 prints \`bisect.bisect_left.__module__\` as \`_bisect\`.
- The only comparison used is \`<\`. Example 2 counts calls on a class that defines nothing but \`__lt__\`, and bisect works with it. Any object that supports \`__len__\` and \`__getitem__\` can be searched, even a "virtual" list computed on demand.

## 4. insort: Keeping a List Sorted

\`insort(a, x)\` (alias of \`insort_right\`) and \`insort_left\` find the insertion point and call \`a.insert(i, x)\`. The search is O(log n), but \`list.insert\` must shift every later pointer one slot to the right, which is O(n). The [bisect docs](https://docs.python.org/3/library/bisect.html) say the same: the O(log n) search is dominated by the O(n) insertion step.

So \`insort\` is good for keeping a small or rarely-updated list sorted. For many inserts plus "smallest item" queries, a heap is better ([how heapq works](/interview-question/how-does-heapq-work-in-python)); if you insert many items and only need sorted order at the end, append then sort once ([how Timsort works](/interview-question/how-does-timsort-make-python-s-sort-fast-and-stable)). Why the insert costs O(n) is explained in [how a Python list grows in memory](/interview-question/how-does-a-python-list-grow-in-memory).

## 5. key=, lo and hi

Since Python 3.10 every function in the module takes \`key=\` (the [bisect docs](https://docs.python.org/3/library/bisect.html) mark it "Changed in version 3.10: Added the key parameter"). The docs are explicit about an asymmetry that trips people up:

- In \`bisect_left\` / \`bisect_right\`, the key is applied to the **list items** but **not to \`x\`**. You pass \`x\` already as a key value: \`bisect_left(people, 31, key=age)\`.
- In \`insort\`, the key is used for the search, and \`x\` is a whole record that gets inserted, so \`insort(people, ("dee", 33), key=age)\`.

📌 **Interview term: Key function** — a function applied to each item to produce the value that is compared, as in \`sorted(..., key=...)\`.

\`lo\` and \`hi\` restrict the search window, which is useful when you already know part of the answer, or for searching a slice without copying it.

## 6. The Code, Walked Through

### Example 1 — using the module

~~~python
import bisect

scores = [10, 20, 20, 20, 30, 40]

# 1. left vs right: where would 20 go?
print(bisect.bisect_left(scores, 20))  # 1
print(bisect.bisect_right(scores, 20))  # 4
print(bisect.bisect(scores, 20))  # 4
# right - left = how many 20s there are
print(bisect.bisect_right(scores, 20) - bisect.bisect_left(scores, 20))  # 3

# A value that is not present: both agree
print(bisect.bisect_left(scores, 25), bisect.bisect_right(scores, 25))  # 4 4

# 2. Membership test in O(log n) on a sorted list
def contains(sorted_list, x):
    i = bisect.bisect_left(sorted_list, x)
    return i < len(sorted_list) and sorted_list[i] == x

print(contains(scores, 30), contains(scores, 35))  # True False

# 3. Count values in a range [lo, hi]
def count_between(sorted_list, lo, hi):
    return bisect.bisect_right(sorted_list, hi) - bisect.bisect_left(sorted_list, lo)

print(count_between(scores, 15, 30))  # 4

# 4. Map a number to a bucket (the classic grading example)
def grade(score, breakpoints=(60, 70, 80, 90), letters="FDCBA"):
    return letters[bisect.bisect(breakpoints, score)]

print([grade(s) for s in (33, 60, 77, 89, 90, 100)])  # ['F', 'D', 'C', 'B', 'A', 'A']

# 5. insort keeps the list sorted (search is O(log n), the insert is O(n))
live = [1, 4, 9]
for x in (5, 0, 9, 12):
    bisect.insort(live, x)
print(live)  # [0, 1, 4, 5, 9, 9, 12]

# 6. key= (Python 3.10+): search records by a field.
#    The key applies to list items, NOT to the value you search for.
people = [("ann", 25), ("bob", 31), ("cy", 40)]
ages_key = lambda person: person[1]
print(bisect.bisect_left(people, 31, key=ages_key))  # 1
bisect.insort(people, ("dee", 33), key=ages_key)
print(people)

# 7. lo and hi restrict the search window
print(bisect.bisect_left(scores, 20, lo=2))  # 2
print(bisect.bisect_left(scores, 20, hi=1))  # 1

# 8. bisect() and insort() are aliases of the _right versions,
#    and the functions come from the C accelerator module _bisect
print(bisect.bisect is bisect.bisect_right, bisect.insort is bisect.insort_right)  # True True
print(bisect.bisect_left.__module__)  # _bisect
~~~

- \`contains()\` is the standard "bisect then check" idiom for membership in a sorted list.
- \`count_between(scores, 15, 30)\` counts 20, 20, 20 and 30: \`bisect_right(.., 30) - bisect_left(.., 15)\`.
- \`grade()\` is the grading pattern shown in the bisect docs: \`bisect(breakpoints, score)\` returns how many breakpoints are \`<=\` the score, which indexes straight into \`"FDCBA"\`. Using \`bisect\` (right) makes a score of exactly 90 an A; \`bisect_left\` would make it a B.
- \`insort\` with \`key=\` inserted \`("dee", 33)\` between bob and cy.

### Example 2 — the algorithm by hand, and counting comparisons

~~~python
# The algorithm, written out, and checked against the real module.
import bisect
import random

def my_bisect_left(a, x, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

def my_bisect_right(a, x, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if x < a[mid]:
            hi = mid
        else:
            lo = mid + 1
    return lo

rng = random.Random(7)
ok = True
for _ in range(2000):
    data = sorted(rng.randint(0, 20) for _ in range(rng.randint(0, 15)))
    x = rng.randint(-2, 22)
    ok &= my_bisect_left(data, x) == bisect.bisect_left(data, x)
    ok &= my_bisect_right(data, x) == bisect.bisect_right(data, x)
print("matches bisect on 2000 random cases:", ok)

# Trace one search: the window [lo, hi) halves every step
def traced(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        go = "right" if a[mid] < x else "left"
        print(f"  lo={lo:<2} hi={hi:<2} mid={mid:<2} a[mid]={a[mid]:<3} go {go}")
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

evens = list(range(0, 32, 2))
print("search 23 in", evens)
print("insertion point:", traced(evens, 23))

# bisect only ever uses < (the __lt__ method); count the comparisons
class Num:
    calls = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Num.calls += 1
        return self.v < other.v

# bisect accepts any sequence with __len__ and __getitem__, so a lazy
# "virtual" sorted list of n items costs nothing to build
class Lazy:
    def __init__(self, n):
        self.n = n

    def __len__(self):
        return self.n

    def __getitem__(self, i):
        return Num(i)

for n in (16, 1024, 1_000_000, 1_000_000_000):
    Num.calls = 0
    pos = bisect.bisect_left(Lazy(n), Num(n // 3))
    print(f"n={n:<10} found at {pos:<9} after {Num.calls} comparisons")
~~~

- The random test uses a seeded \`random.Random(7)\`, so the cases are the same on every run.
- \`traced()\` prints the window at every step; it is \`bisect_left\` with logging.
- \`Lazy(n)\` pretends to be a sorted list of \`n\` items without storing them, which lets us count comparisons for a billion items. The counts grow by 10 each time \`n\` grows about 1,000 times: that is O(log n).

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page's Pyodide 0.25.1 harness; the outputs matched exactly.

Example 1 output:

~~~text
1
4
4
3
4 4
True False
4
['F', 'D', 'C', 'B', 'A', 'A']
[0, 1, 4, 5, 9, 9, 12]
1
[('ann', 25), ('bob', 31), ('dee', 33), ('cy', 40)]
2
1
True True
_bisect
~~~

Example 2 output:

~~~text
matches bisect on 2000 random cases: True
search 23 in [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]
  lo=0  hi=16 mid=8  a[mid]=16  go right
  lo=9  hi=16 mid=12 a[mid]=24  go left
  lo=9  hi=12 mid=10 a[mid]=20  go right
  lo=11 hi=12 mid=11 a[mid]=22  go right
insertion point: 12
n=16         found at 5         after 4 comparisons
n=1024       found at 341       after 10 comparisons
n=1000000    found at 333333    after 20 comparisons
n=1000000000 found at 333333333 after 30 comparisons
~~~

## 8. Costs at a Glance

| Task | With bisect | Alternative |
| :--- | :--- | :--- |
| Find insertion point | O(log n) | linear scan O(n) |
| Exact membership, many lookups | O(log n) | \`set\`: O(1) average, but no order |
| Count values in \`[lo, hi]\` | O(log n) | scan O(n) |
| Insert keeping sorted | O(n) (\`insort\`) | heap push O(log n), but only the minimum is cheap |
| Build sorted from scratch | n inserts: O(n²) | append all then \`sort()\`: O(n log n) |

## 9. Edge Cases

- **Unsorted input.** bisect does not check; the result is silently wrong.
- **Mixed types.** \`bisect_left([1, 2], "a")\` raises \`TypeError\` from the \`<\` comparison, just like sorting would.
- **Floats.** Searching for \`0.3\` in a list holding \`0.1 + 0.2\` will not find an exact match; search with a tolerance or for a range.
- **Descending lists.** Not supported directly; negate the key.

## Common Pitfalls

- Treating the return value as "found at index i". It is an insertion point; always check \`a[i] == x\` (and \`i < len(a)\`).
- Mixing up left and right at boundaries: for grading, \`bisect\` (right) puts a score equal to a breakpoint into the higher bucket; \`bisect_left\` puts it into the lower one.
- Applying the key to \`x\` yourself and also passing a record, or passing a record to \`bisect_left\` with \`key=\`. The value you search for must already be in key form.
- Using \`insort\` in a loop to build a large sorted list: that is O(n²). Append, then sort once.
- Writing your own binary search with \`mid = (lo + hi) // 2\` and \`hi = mid - 1\` on a half-open window; mixing interval styles is the classic off-by-one bug.
- Forgetting that the list must stay sorted by the same key you search with.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> is binary search on a list that is already sorted: it halves a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[lo, hi)</code> window each step, so a million items need about 20 comparisons.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Left vs right:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_left(a, x)</code> is the first index where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> could go, before any equal items; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right</code> (alias <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code>) is the index after them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left</code> counts copies of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inserting:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insort</code> finds the spot in O(log n) but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.insert</code> shifts the tail, so each insert is O(n). Fine for small lists; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> or a sorted container for many inserts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The details:</strong> <span style="color:#f0e2c8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> is used. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> restrict the window. Since Python 3.10 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=</code> is applied to the list items, not to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so you pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> already in key form.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where it fits:</strong> <span style="color:#f0e2c8;">Range counts, membership in a sorted list, mapping a score to a grade bucket, and finding a position in a time-ordered log.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect_left</code> not tell you whether <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x</code> is present?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns an insertion point, which exists for any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; len(a) and a[i] == x</code> afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the list is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error: bisect does not check. It returns a position that is consistent with its comparisons but meaningless for your data. Sort first, or keep the list sorted with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insort</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">With <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key=</code>, why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect_left(people, 31, key=age)</code> take 31 and not a record?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The docs say the key is applied to the items during the search but not to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> must already be a key value. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insort</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=</code> is different: it takes a whole record and applies the key to it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you search in descending order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">bisect only supports ascending order. Store negated keys, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=lambda v: -v</code> and pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code> as the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is bisect faster than a set or dict lookup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For exact membership no: a set is O(1) average. Bisect wins when you need order: nearest value, ranges, ranks, or the next item after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary search** | repeatedly halving a sorted search window until one position remains |
| **Insertion point** | the index where \`x\` would go to keep the list sorted |
| **\`bisect_left\`** | insertion point before any items equal to \`x\` |
| **\`bisect_right\` / \`bisect\`** | insertion point after any items equal to \`x\` |
| **\`insort\`** | find the insertion point, then \`list.insert\` there |
| **Half-open interval \`[lo, hi)\`** | includes \`lo\`, excludes \`hi\`; the search window |
| **Key function** | a function applied to each item to get the value compared |
| **Invariant** | a condition that stays true every loop step: items before \`lo\` are less than \`x\` |

**Conclusion:** The \`bisect\` module is binary search for sorted sequences: it halves a half-open \`[lo, hi)\` window using only \`<\` until one boundary remains, so it needs about log2(n) comparisons. \`bisect_left\` and \`bisect_right\` differ only in which side of equal items they land on, which makes counting duplicates and ranges a subtraction, while \`insort\` adds an O(n) list insert on top of the O(log n) search. Remember that it returns an insertion point rather than a match, that the list must already be sorted, and that \`key=\` (Python 3.10+) is applied to the items but not to the value you search for.`,
    examples: [
      { label: `bisect_left, bisect_right, insort and key= in practice`, code: `import bisect

scores = [10, 20, 20, 20, 30, 40]

# 1. left vs right: where would 20 go?
print(bisect.bisect_left(scores, 20))  # 1
print(bisect.bisect_right(scores, 20))  # 4
print(bisect.bisect(scores, 20))  # 4
# right - left = how many 20s there are
print(bisect.bisect_right(scores, 20) - bisect.bisect_left(scores, 20))  # 3

# A value that is not present: both agree
print(bisect.bisect_left(scores, 25), bisect.bisect_right(scores, 25))  # 4 4

# 2. Membership test in O(log n) on a sorted list
def contains(sorted_list, x):
    i = bisect.bisect_left(sorted_list, x)
    return i < len(sorted_list) and sorted_list[i] == x

print(contains(scores, 30), contains(scores, 35))  # True False

# 3. Count values in a range [lo, hi]
def count_between(sorted_list, lo, hi):
    return bisect.bisect_right(sorted_list, hi) - bisect.bisect_left(sorted_list, lo)

print(count_between(scores, 15, 30))  # 4

# 4. Map a number to a bucket (the classic grading example)
def grade(score, breakpoints=(60, 70, 80, 90), letters="FDCBA"):
    return letters[bisect.bisect(breakpoints, score)]

print([grade(s) for s in (33, 60, 77, 89, 90, 100)])  # ['F', 'D', 'C', 'B', 'A', 'A']

# 5. insort keeps the list sorted (search is O(log n), the insert is O(n))
live = [1, 4, 9]
for x in (5, 0, 9, 12):
    bisect.insort(live, x)
print(live)  # [0, 1, 4, 5, 9, 9, 12]

# 6. key= (Python 3.10+): search records by a field.
#    The key applies to list items, NOT to the value you search for.
people = [("ann", 25), ("bob", 31), ("cy", 40)]
ages_key = lambda person: person[1]
print(bisect.bisect_left(people, 31, key=ages_key))  # 1
bisect.insort(people, ("dee", 33), key=ages_key)
print(people)

# 7. lo and hi restrict the search window
print(bisect.bisect_left(scores, 20, lo=2))  # 2
print(bisect.bisect_left(scores, 20, hi=1))  # 1

# 8. bisect() and insort() are aliases of the _right versions,
#    and the functions come from the C accelerator module _bisect
print(bisect.bisect is bisect.bisect_right, bisect.insort is bisect.insort_right)  # True True
print(bisect.bisect_left.__module__)  # _bisect` },
      { label: `Binary search by hand, traced and counted`, code: `# The algorithm, written out, and checked against the real module.
import bisect
import random

def my_bisect_left(a, x, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

def my_bisect_right(a, x, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if x < a[mid]:
            hi = mid
        else:
            lo = mid + 1
    return lo

rng = random.Random(7)
ok = True
for _ in range(2000):
    data = sorted(rng.randint(0, 20) for _ in range(rng.randint(0, 15)))
    x = rng.randint(-2, 22)
    ok &= my_bisect_left(data, x) == bisect.bisect_left(data, x)
    ok &= my_bisect_right(data, x) == bisect.bisect_right(data, x)
print("matches bisect on 2000 random cases:", ok)

# Trace one search: the window [lo, hi) halves every step
def traced(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        go = "right" if a[mid] < x else "left"
        print(f"  lo={lo:<2} hi={hi:<2} mid={mid:<2} a[mid]={a[mid]:<3} go {go}")
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

evens = list(range(0, 32, 2))
print("search 23 in", evens)
print("insertion point:", traced(evens, 23))

# bisect only ever uses < (the __lt__ method); count the comparisons
class Num:
    calls = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Num.calls += 1
        return self.v < other.v

# bisect accepts any sequence with __len__ and __getitem__, so a lazy
# "virtual" sorted list of n items costs nothing to build
class Lazy:
    def __init__(self, n):
        self.n = n

    def __len__(self):
        return self.n

    def __getitem__(self, i):
        return Num(i)

for n in (16, 1024, 1_000_000, 1_000_000_000):
    Num.calls = 0
    pos = bisect.bisect_left(Lazy(n), Num(n // 3))
    print(f"n={n:<10} found at {pos:<9} after {Num.calls} comparisons")` },
    ],
  },
  {
    title: `How does an LRU cache work internally?`,
    difficulty: "medium",
    seoDescription: `How an LRU cache works: hash map plus doubly linked list for O(1) get and put, OrderedDict and dict versions, and how functools.lru_cache does it.`,
    description: `**Question presented to candidate:**
"Design a cache with a fixed capacity that throws away the least recently used item when it is full. Both \`get\` and \`put\` should be O(1). How does it work inside, and how does Python's own \`functools.lru_cache\` do it?"

**What a strong answer should cover:**
- The policy: every \`get\` hit or \`put\` marks a key as most recently used; when the cache is full, the least recently used key is evicted.
- The data structures: a hash map from key to node for O(1) lookup, plus a doubly linked list ordered by recency for O(1) move-to-front and evict-from-back; sentinel nodes remove edge cases.
- Why both are needed: a dict alone cannot cheaply find the oldest key after reorderings (unless you use its insertion order), a list alone cannot find a key in O(1).
- Python shortcuts: \`OrderedDict.move_to_end()\` and \`popitem(last=False)\`, or a plain dict with pop and re-insert, since dicts keep insertion order.
- How \`functools.lru_cache\` does it in CPython: a C type with a dict plus a circular doubly linked list around a root sentinel; arguments become the key (must be hashable); \`cache_info()\` reports hits and misses; \`maxsize=None\` skips the list entirely.

**Clarifying questions expected:**
- What is the capacity, and what should \`get\` return on a miss?
- Does \`put\` on an existing key count as a use? Is thread safety required?

**Code / implementation expected:** Yes — an O(1) LRU class, usually with a dict plus a hand-written doubly linked list, or with \`OrderedDict\` if allowed.`,
    answer: `**Target Audience:** Candidates facing the classic "design an LRU cache" question, and anyone who uses \`functools.lru_cache\` and wants to know what it does inside.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Your desk has room for exactly three books. The rest live on a shelf across the room. Every time you use a book you put it on top of the pile on your desk. When you need a fourth book, something has to go back to the shelf, and the sensible choice is the book at the bottom of the pile: the one you have not touched for the longest.

That is a **least recently used** cache. The desk is fast memory with a fixed size, the shelf is the slow source (a database, a network call, an expensive function), and the pile order is "recency". The interview question is never "what is LRU?" for long; it is "make both looking up a book and reshuffling the pile take constant time". That is a lovely little data-structure puzzle, and Python's standard library solves it the same way you are expected to.

📌 **Interview term: Cache** — fast storage that keeps results you expect to need again, so you can skip the slow work.

📌 **Interview term: Eviction policy** — the rule that decides which item leaves when the cache is full. LRU evicts the least recently used item.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the capacity, and is it in items or bytes? | Item counts give the classic design; byte limits need per-item sizes. |
| What should \`get\` return on a miss? | \`None\`, \`-1\` (common in coding tests) or raise \`KeyError\`. |
| Does \`put\` on an existing key count as a use? | Usually yes: update the value and move it to most recent. |
| Is it used from several threads? | If yes, every operation needs a lock, because reads also reorder. |
| Do entries also expire after a time? | Adds TTL checks on top of LRU. |

## 3. The Core Idea: Two Structures, Each Doing One Job

The cache needs three fast operations:

1. find the value for a key;
2. mark a key as the most recent;
3. find and remove the least recent key.

A dict does (1) in O(1) but has no idea which key is oldest after many reorderings. A list in recency order does (3) easily, but finding a key in it, (1) and (2), is O(n). So we combine them:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A dict maps keys A, C and D to nodes in a doubly linked list between a head sentinel on the least recent side and a tail sentinel on the most recent side">
  <defs>
    <marker id="py16q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="260" height="70" rx="10"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">dict: key to node</text>
  <text class="d-sub" x="380" y="72" text-anchor="middle">C, A, D</text>
  <rect class="d-box-muted" x="20" y="180" width="110" height="64" rx="10"/>
  <text class="d-text" x="75" y="208" text-anchor="middle">head</text>
  <text class="d-sub" x="75" y="230" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="190" y="180" width="110" height="64" rx="10"/>
  <text class="d-text" x="245" y="208" text-anchor="middle">C</text>
  <text class="d-sub" x="245" y="230" text-anchor="middle">oldest</text>
  <rect class="d-box" x="360" y="180" width="110" height="64" rx="10"/>
  <text class="d-text" x="415" y="208" text-anchor="middle">A</text>
  <rect class="d-box" x="530" y="180" width="110" height="64" rx="10"/>
  <text class="d-text" x="585" y="208" text-anchor="middle">D</text>
  <text class="d-sub" x="585" y="230" text-anchor="middle">newest</text>
  <rect class="d-box-muted" x="680" y="180" width="70" height="64" rx="10"/>
  <text class="d-text" x="715" y="208" text-anchor="middle">tail</text>
  <path class="d-edge" d="M 130 202 L 184 202" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 184 224 L 136 224" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 300 202 L 354 202" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 354 224 L 306 224" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 470 202 L 524 202" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 524 224 L 476 224" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 640 202 L 674 202" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge" d="M 674 224 L 646 224" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge-dashed" d="M 300 90 L 250 174" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge-dashed" d="M 390 90 L 412 174" marker-end="url(#py16q5-arrow)"/>
  <path class="d-edge-dashed" d="M 470 90 L 572 174" marker-end="url(#py16q5-arrow)"/>
</svg>

- The **dict** maps each key to a **node**.
- The nodes form a **doubly linked list** in recency order: oldest next to \`head\`, newest next to \`tail\`.

📌 **Interview term: Doubly linked list** — nodes that point to both their previous and next neighbour. Given a node, you can unlink it in O(1) by joining its neighbours together; a singly linked list would need to search for the previous node.

📌 **Interview term: Sentinel node** — a dummy node that is always present at an end of the list. With \`head\` and \`tail\` sentinels, "the list is empty" and "this is the first node" stop being special cases: every real node always has a real \`prev\` and \`next\`.

Every operation is now a dict lookup plus a few pointer changes:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Three constant time steps: a get hit unlinks the node and relinks it before the tail; a put on a full cache unlinks the node after the head and deletes its key from the dict">
  <rect class="d-box" x="20" y="30" width="220" height="190" rx="10"/>
  <text class="d-text" x="130" y="60" text-anchor="middle">get(key) hit</text>
  <text class="d-sub" x="130" y="96" text-anchor="middle">1. node = dict[key]</text>
  <text class="d-sub" x="130" y="126" text-anchor="middle">2. unlink node</text>
  <text class="d-sub" x="130" y="156" text-anchor="middle">3. relink before tail</text>
  <text class="d-sub" x="130" y="186" text-anchor="middle">4. return value</text>
  <rect class="d-box" x="270" y="30" width="220" height="190" rx="10"/>
  <text class="d-text" x="380" y="60" text-anchor="middle">put new key, full</text>
  <text class="d-sub" x="380" y="96" text-anchor="middle">1. oldest = head.next</text>
  <text class="d-sub" x="380" y="126" text-anchor="middle">2. unlink oldest</text>
  <text class="d-sub" x="380" y="156" text-anchor="middle">3. del dict[oldest.key]</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">4. add node before tail</text>
  <rect class="d-box-accent" x="520" y="30" width="220" height="190" rx="10"/>
  <text class="d-text" x="630" y="60" text-anchor="middle">cost of each step</text>
  <text class="d-sub" x="630" y="96" text-anchor="middle">dict lookup: O(1) average</text>
  <text class="d-sub" x="630" y="126" text-anchor="middle">unlink: change 2 pointers</text>
  <text class="d-sub" x="630" y="156" text-anchor="middle">relink: change 4 pointers</text>
  <text class="d-sub" x="630" y="186" text-anchor="middle">no loops, no shifting</text>
</svg>

The node stores its key as well as its value, because when you evict \`head.next\` you must also delete that key from the dict.

## 4. The Code, Walked Through

### Example 1 — an LRU cache from scratch

~~~python
# An LRU cache from scratch: a dict for O(1) lookup + a doubly linked list
# for O(1) "move to most recent" and "evict least recent".

class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}                  # key -> Node
        self.head = Node()             # sentinel: least recent side
        self.tail = Node()             # sentinel: most recent side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_recent(self, node):
        last = self.tail.prev
        last.next = node
        node.prev, node.next = last, self.tail
        self.tail.prev = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return None                # miss
        self._unlink(node)             # hit: move to the recent end
        self._push_recent(node)
        return node.value

    def put(self, key, value):
        if key in self.map:
            node = self.map[key]
            node.value = value
            self._unlink(node)
        else:
            if len(self.map) == self.capacity:
                oldest = self.head.next
                self._unlink(oldest)
                del self.map[oldest.key]
                print(f"  evict {oldest.key}")
            node = Node(key, value)
            self.map[key] = node
        self._push_recent(node)

    def order(self):
        out, node = [], self.head.next
        while node is not self.tail:
            out.append(node.key)
            node = node.next
        return out

cache = LRUCache(3)
for k in "ABC":
    cache.put(k, k.lower())
print("after A B C :", cache.order())
print("get A ->", cache.get("A"), cache.order())
print("put D")
cache.put("D", "d")
print("now         :", cache.order())
print("get B ->", cache.get("B"))
cache.put("C", "C2")
print("update C    :", cache.order())
print("put E")
cache.put("E", "e")
print("final       :", cache.order())
print(cache.get("C"), len(cache.map))  # C2 3
~~~

Reading the trace:

- After \`A B C\` the order is oldest to newest \`A, B, C\`.
- \`get("A")\` is a hit, so A moves to the newest end: \`B, C, A\`.
- \`put("D")\` on a full cache evicts the oldest, B.
- \`get("B")\` is now a miss and returns \`None\`.
- \`put("C", "C2")\` updates an existing key: no eviction, C becomes newest.
- \`put("E")\` evicts A, the oldest at that moment.

\`__slots__\` on \`Node\` is optional; it saves memory per node ([what __slots__ does](/interview-question/what-does-slots-do)).

### Example 2 — the Python shortcuts and functools.lru_cache

~~~python
from collections import OrderedDict
from functools import lru_cache

# 1. The same policy in a few lines with OrderedDict
class OrderedLRU:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return None
        self.data.move_to_end(key)          # O(1): relink the node
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            old, _ = self.data.popitem(last=False)   # O(1): drop the oldest
            print("  evict", old)

c = OrderedLRU(2)
c.put("a", 1)
c.put("b", 2)
c.get("a")
c.put("c", 3)
print(list(c.data))  # ['a', 'c']

# 1b. Even a plain dict works, because dicts keep insertion order (3.7+):
#     pop + re-insert moves a key to the end; the first key is the oldest.
recent = {}
for key in ["a", "b", "a", "c"]:
    recent[key] = recent.pop(key, None)
    if len(recent) > 2:
        oldest = next(iter(recent))
        del recent[oldest]
print(list(recent))  # ['a', 'c']

# 2. functools.lru_cache: the same idea, written in C, for function results
@lru_cache(maxsize=2)
def square(n):
    print(f"  computing {n}")
    return n * n

for n in (2, 3, 2, 4, 3):
    print(n, "->", square(n))
print(square.cache_info())

# The wrapper is a C type in CPython
print(type(square).__module__, type(square).__name__)  # functools _lru_cache_wrapper

# 3. Arguments become the key, so they must be hashable
try:
    square([1, 2])
except TypeError as err:
    print("TypeError:", err)

# 4. maxsize=None means no eviction (functools.cache is the same thing)
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))  # 23416728348467685
print(fib.cache_info())

# 5. typed=False merges equal arguments 3 and 3.0 into one key...
@lru_cache
def pair(x, y):
    return type(x).__name__

print(pair(3, 1), pair(3.0, 1))  # int int

# ...except a lone int or str argument, which CPython uses as the key
# itself (a fast path), so 3 and the tuple-wrapped 3.0 differ
@lru_cache
def single(x):
    return type(x).__name__

print(single(3), single(3.0))  # int float
~~~

- \`OrderedDict\` is literally "a dict plus a doubly linked list" in CPython, so \`move_to_end()\` and \`popitem(last=False)\` are the two LRU operations, both O(1).
- The plain-dict version relies on dicts keeping insertion order (guaranteed since 3.7, see [how dictionaries are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered)): \`pop\` + re-insert moves a key to the end, and \`next(iter(d))\` is the oldest. Pop and re-insert leave a deleted hole in the dict's entries array that the next resize cleans up, so this is amortized O(1), whereas \`OrderedDict\` relinks a node directly.
- \`square\` with \`maxsize=2\` shows the policy on function results: the second \`square(2)\` is a hit, \`square(4)\` evicts 3 (the least recent), so the last \`square(3)\` is computed again. \`cache_info()\` reports 1 hit and 4 misses.
- \`fib(80)\` with \`maxsize=None\` is computed with 81 misses and 78 hits, instead of the more than 10^16 calls the naive recursion would make.

## 5. How functools.lru_cache Does It in CPython

\`functools.lru_cache(maxsize=128, typed=False)\` wraps a function. In CPython the wrapper is a C type: Example 2 prints \`type(square).__module__\` and \`__name__\` as \`functools\` and \`_lru_cache_wrapper\`. Its design, which you can read in the [3.11.3 source of Modules/_functoolsmodule.c](https://github.com/python/cpython/blob/v3.11.3/Modules/_functoolsmodule.c) and in the pure-Python fallback inside \`Lib/functools.py\`, is exactly the one above:

- a **dict** from the call key to a link;
- a **circular doubly linked list** threaded through a single \`root\` sentinel (one sentinel serves as both head and tail because the list is circular). In the pure-Python fallback each link is a 4-item list \`[PREV, NEXT, KEY, RESULT]\`.
- On a full cache the fallback even recycles the old root: it writes the new key and result into the current root and makes the oldest link the new root, so an eviction allocates nothing.

📌 **Interview term: Hit / miss** — a hit finds the key already cached; a miss has to call the function.

Other details that interviewers like:

- **The key** is built from the positional and keyword arguments, so every argument must be hashable; \`square([1, 2])\` raises \`TypeError: unhashable type: 'list'\`. With \`typed=True\` the argument types are added, so \`f(3)\` and \`f(3.0)\` get separate entries. With the default \`typed=False\`, Example 2 shows \`pair(3, 1)\` and \`pair(3.0, 1)\` sharing one entry, while \`single(3)\` and \`single(3.0)\` do not: for a single argument of exact type \`int\` or \`str\`, CPython uses the argument itself as the key instead of a tuple (a speed shortcut in \`_make_key\`), and \`3\` is not equal to the tuple-wrapped \`(3.0,)\`. Do not rely on either behaviour; pass \`typed=True\` if the type matters.
- **\`maxsize=None\`** uses a plain dict with no linked list at all, because nothing is ever evicted; \`functools.cache\` is shorthand for it. \`maxsize=0\` disables caching but still counts misses.
- **Threads:** the pure-Python version holds an \`RLock\` around list updates but not around the user function call, so two threads can both miss and compute the same value; the cache stays consistent.
- **Methods:** decorating a method caches on \`self\` too, keeping every instance alive as long as the cache holds it.

The decorator itself (signature, \`cache_clear()\`, \`cache_parameters()\`, common uses) has its own page: [how functools.lru_cache works](/interview-question/how-does-functools-lru-cache-work). See also [what the functools module offers](/interview-question/what-does-the-functools-module-offer).

## 6. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page's Pyodide 0.25.1 harness; the outputs matched exactly.

Example 1 output:

~~~text
after A B C : ['A', 'B', 'C']
get A -> a ['B', 'C', 'A']
put D
  evict B
now         : ['C', 'A', 'D']
get B -> None
update C    : ['A', 'D', 'C']
put E
  evict A
final       : ['D', 'C', 'E']
C2 3
~~~

Example 2 output:

~~~text
  evict b
['a', 'c']
['a', 'c']
  computing 2
2 -> 4
  computing 3
3 -> 9
2 -> 4
  computing 4
4 -> 16
  computing 3
3 -> 9
CacheInfo(hits=1, misses=4, maxsize=2, currsize=2)
functools _lru_cache_wrapper
TypeError: unhashable type: 'list'
23416728348467685
CacheInfo(hits=78, misses=81, maxsize=None, currsize=81)
int int
int float
~~~

## 7. Comparing the Implementations

| Approach | get | put / evict | Notes |
| :--- | :--- | :--- | :--- |
| dict + hand-written doubly linked list | O(1) | O(1) | the interview answer; you show you understand the pointers |
| \`OrderedDict\` with \`move_to_end\` / \`popitem(last=False)\` | O(1) | O(1) | shortest correct version; may be "not allowed" in a coding test |
| plain dict, pop + re-insert | O(1) amortized | O(1) amortized | relies on insertion order (3.7+) |
| list for recency + dict | O(n) | O(n) | \`list.remove\` scans; the classic wrong answer |
| \`functools.lru_cache\` | O(1) | O(1) | for function results only, keyed by arguments |

## Common Pitfalls

- Forgetting to delete the evicted key from the dict, so the dict grows forever while the list stays bounded.
- Forgetting that a successful \`get\` must also move the node; without it the cache becomes FIFO, not LRU.
- Using a singly linked list, then needing an O(n) walk to find the previous node when unlinking.
- Evicting before checking whether the key already exists, which drops an item needlessly when \`put\` is only an update.
- Decorating a function with mutable or unhashable arguments with \`lru_cache\` (\`TypeError\`), or one with side effects you still need on every call.
- Assuming \`lru_cache\` on a method is per-instance and harmless: it holds strong references to every \`self\` it has seen.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The policy:</strong> <span style="color:#f0e2c8;">Every hit or write makes a key the most recent; when the cache is full, evict the least recently used key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two structures:</strong> <span style="color:#f0e2c8;">A dict maps key to a node for O(1) lookup; a doubly linked list orders nodes by recency, so moving a node or dropping the oldest is a few pointer changes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why doubly linked with sentinels:</strong> <span style="color:#f0e2c8;">Unlinking a node from the middle needs its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> pointer, and head/tail sentinels mean no special cases for an empty or one-item list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict</code> already is a dict plus a linked list: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end(key)</code> on a hit and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code> to evict. A plain dict works too: pop and re-insert, evict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(iter(d))</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. functools.lru_cache:</strong> <span style="color:#f0e2c8;">In CPython it is a C type with a dict plus a circular doubly linked list around a root sentinel; the arguments form the key, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_info()</code> reports hits and misses, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxsize=None</code> uses a plain dict with no list.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a list for the recency order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Finding a key in a list and removing it from the middle is O(n), so every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> becomes O(n). The linked list gives O(1) removal once the dict hands you the node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the node store its key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On eviction you only have the node (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next</code>), and you must also delete it from the dict, so the node has to know its own key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your LRU thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> changes the list, so two threads can corrupt the links. Guard each method with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.Lock</code>. The pure-Python fallback of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> holds an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RLock</code> around its list updates but releases it while the user function runs, so two threads can compute the same value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typed=True</code> do in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It adds the argument types to the key, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(3)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(3.0)</code> are always cached separately. With the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typed=False</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pair(3, 1)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pair(3.0, 1)</code> share one entry (equal tuples), but a lone <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> argument is used as the key directly, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">single(3)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">single(3.0)</code> happened to be separate entries on 3.11.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use LRU?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When recency does not predict reuse, for example a one-pass scan that flushes the useful items. LFU (least frequently used) or TTL-based expiry can fit better.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache** | fast storage of results you expect to need again |
| **Eviction policy** | the rule for which item to drop when the cache is full |
| **LRU (least recently used)** | evict the item untouched for the longest time |
| **Hit / miss** | the key was / was not already in the cache |
| **Doubly linked list** | nodes with \`prev\` and \`next\` pointers, so any node can be unlinked in O(1) |
| **Sentinel node** | a dummy node at an end of the list that removes empty-list special cases |
| **\`OrderedDict.move_to_end\`** | moves a key to one end of the order in O(1) |
| **\`cache_info()\`** | the \`lru_cache\` report of hits, misses, maxsize and current size |

**Conclusion:** An LRU cache keeps a fixed number of items and evicts the one unused for longest, and making every operation O(1) takes two structures working together: a hash map from key to node for lookups, and a doubly linked list in recency order with sentinels, so that moving a node to the newest end or dropping the oldest is just a handful of pointer changes. Python gives you the same machinery ready-made in \`OrderedDict\` and, thanks to ordered dicts, even in a plain dict, and CPython's \`functools.lru_cache\` is exactly this design in C: a dict plus a circular doubly linked list around a root sentinel, keyed by the call arguments.`,
    examples: [
      { label: `An O(1) LRU cache from scratch: dict + doubly linked list`, code: `# An LRU cache from scratch: a dict for O(1) lookup + a doubly linked list
# for O(1) "move to most recent" and "evict least recent".

class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}                  # key -> Node
        self.head = Node()             # sentinel: least recent side
        self.tail = Node()             # sentinel: most recent side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_recent(self, node):
        last = self.tail.prev
        last.next = node
        node.prev, node.next = last, self.tail
        self.tail.prev = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return None                # miss
        self._unlink(node)             # hit: move to the recent end
        self._push_recent(node)
        return node.value

    def put(self, key, value):
        if key in self.map:
            node = self.map[key]
            node.value = value
            self._unlink(node)
        else:
            if len(self.map) == self.capacity:
                oldest = self.head.next
                self._unlink(oldest)
                del self.map[oldest.key]
                print(f"  evict {oldest.key}")
            node = Node(key, value)
            self.map[key] = node
        self._push_recent(node)

    def order(self):
        out, node = [], self.head.next
        while node is not self.tail:
            out.append(node.key)
            node = node.next
        return out

cache = LRUCache(3)
for k in "ABC":
    cache.put(k, k.lower())
print("after A B C :", cache.order())
print("get A ->", cache.get("A"), cache.order())
print("put D")
cache.put("D", "d")
print("now         :", cache.order())
print("get B ->", cache.get("B"))
cache.put("C", "C2")
print("update C    :", cache.order())
print("put E")
cache.put("E", "e")
print("final       :", cache.order())
print(cache.get("C"), len(cache.map))  # C2 3` },
      { label: `OrderedDict, plain dict and functools.lru_cache versions`, code: `from collections import OrderedDict
from functools import lru_cache

# 1. The same policy in a few lines with OrderedDict
class OrderedLRU:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return None
        self.data.move_to_end(key)          # O(1): relink the node
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            old, _ = self.data.popitem(last=False)   # O(1): drop the oldest
            print("  evict", old)

c = OrderedLRU(2)
c.put("a", 1)
c.put("b", 2)
c.get("a")
c.put("c", 3)
print(list(c.data))  # ['a', 'c']

# 1b. Even a plain dict works, because dicts keep insertion order (3.7+):
#     pop + re-insert moves a key to the end; the first key is the oldest.
recent = {}
for key in ["a", "b", "a", "c"]:
    recent[key] = recent.pop(key, None)
    if len(recent) > 2:
        oldest = next(iter(recent))
        del recent[oldest]
print(list(recent))  # ['a', 'c']

# 2. functools.lru_cache: the same idea, written in C, for function results
@lru_cache(maxsize=2)
def square(n):
    print(f"  computing {n}")
    return n * n

for n in (2, 3, 2, 4, 3):
    print(n, "->", square(n))
print(square.cache_info())

# The wrapper is a C type in CPython
print(type(square).__module__, type(square).__name__)  # functools _lru_cache_wrapper

# 3. Arguments become the key, so they must be hashable
try:
    square([1, 2])
except TypeError as err:
    print("TypeError:", err)

# 4. maxsize=None means no eviction (functools.cache is the same thing)
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))  # 23416728348467685
print(fib.cache_info())

# 5. typed=False merges equal arguments 3 and 3.0 into one key...
@lru_cache
def pair(x, y):
    return type(x).__name__

print(pair(3, 1), pair(3.0, 1))  # int int

# ...except a lone int or str argument, which CPython uses as the key
# itself (a fast path), so 3 and the tuple-wrapped 3.0 differ
@lru_cache
def single(x):
    return type(x).__name__

print(single(3), single(3.0))  # int float` },
    ],
  },
];

export default augments;
