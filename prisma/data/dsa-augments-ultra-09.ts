/**
 * DSA ULTRA — batch 09: array manipulation and matrices — merging two sorted
 * arrays, rotating an array by k, rotating an N×N matrix in place, spiral
 * traversal, and plus-one on a digit array. One complete answer per language
 * (Python, JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you merge two sorted arrays?",
    difficulty: "easy",
    seoDescription: "Merge two sorted arrays in O(m + n) with two pointers, plus the in-place merge from the back, in Python, JavaScript, Java and C++, with verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given two lists of integers, each already sorted in ascending order. Write a Python function that returns one sorted list containing every element of both. Then tell me how you would do it if the first list had empty slots at the end and I wanted the merge done in place."

**What a strong answer should cover:**
- The two-pointer merge: compare the fronts, append the smaller, advance that pointer, then add the leftovers of whichever list is not used up.
- O(m + n) time and O(m + n) output space, compared with O((m + n) log(m + n)) for re-sorting from scratch.
- Using \`<=\` so equal items from the first list come first (a stable merge), and why that matters for records.
- The in-place variant (LeetCode 88): fill \`nums1\` from the back so nothing unread is overwritten; O(1) extra space.
- Python specifics: \`result.extend(a[i:])\` copies the tail (slicing makes a copy), \`heapq.merge\` exists and returns a lazy generator, and \`sorted(a + b)\` is correct but does more work than needed.

**Clarifying questions expected:**
- "New list, or merge into the first list in place?"
- "Can either list be empty, and can there be duplicates?"

**Code / implementation expected:** Yes — a Python \`merge(a, b)\` with two indices, and ideally the from-the-back in-place version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know Python lists and loops.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`python3\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their own pile of exam papers by score, lowest on top. The head teacher wants **one** pile, also sorted. You could throw both piles on the floor and sort all the papers again from scratch, but that ignores the work the teachers already did.

The smarter way: put the two piles side by side, look only at the **top paper of each pile**, take the lower one and put it on the new pile, and repeat. You never need to look deeper than the top of each pile, because everything underneath is already bigger. When one pile runs out, the rest of the other pile goes on as one block. Every paper is touched exactly once.

That "look at the two fronts, take the smaller, step forward" move is the **merge step** of merge sort, it is how databases join sorted data, and it is the core of half a dozen other interview problems ([merge two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists), [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [merge overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals)). Interviewers ask it because it is short enough to code perfectly and it shows whether you can handle indices and "leftover" elements without bugs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return a new array, or merge into the first array in place? | The classic LeetCode 88 version gives you \`nums1\` with free slots at the end; that changes the algorithm (fill from the back). |
| Are both inputs sorted ascending? | If one is descending you must walk it from the other end. |
| Can there be duplicates, and does the order of equal items matter? | Equal items from the first array should come first if the merge must be **stable** (it matters when items carry extra data). |
| Can either array be empty? | Empty inputs are the most common source of index bugs. |
| How big can the arrays be? | Tells you whether an O(m + n) extra array is acceptable or memory is tight. |

## 3. The Core Idea: Two Pointers

Keep one index into each array. Each index points at the smallest item of that array that has **not been used yet**.

📌 **Interview term: Two pointers** — a technique where two indices move through data (here, one per array) and each step moves one of them forward, so the whole scan is linear.

At every step compare \`a[i]\` and \`b[j]\`, copy the smaller one to the output, and move only that index forward. When one array is used up, nothing in the other array needs comparing any more: everything left is already sorted and at least as large as everything output so far, so you copy the leftovers as a block.

📌 **Interview term: Merge step** — the linear-time procedure that combines two sorted sequences into one sorted sequence; it is the "conquer" half of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Two pointer merge of a equals 1 3 5 7 and b equals 2 4 6. After taking 1 and 2, i points at 3 and j points at 4. 3 is not bigger than 4, so 3 goes to the output and i moves right">
  <defs>
    <marker id="b09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="76" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="70" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="134" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="76" text-anchor="middle">3</text>
  <rect class="d-box" x="198" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="76" text-anchor="middle">5</text>
  <rect class="d-box" x="262" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="287" y="76" text-anchor="middle">7</text>
  <text class="d-sub" x="159" y="114" text-anchor="middle">i = 1</text>

  <text class="d-text" x="40" y="166" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="70" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="166" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="134" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="166" text-anchor="middle">4</text>
  <rect class="d-box" x="198" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="166" text-anchor="middle">6</text>
  <text class="d-sub" x="159" y="204" text-anchor="middle">j = 1</text>

  <rect class="d-box-accent" x="400" y="80" width="220" height="90" rx="10"/>
  <text class="d-text" x="510" y="110" text-anchor="middle">compare a[i] with b[j]</text>
  <text class="d-sub" x="510" y="134" text-anchor="middle">3 is not bigger than 4</text>
  <text class="d-sub" x="510" y="154" text-anchor="middle">so take 3 and move i</text>
  <path class="d-edge" d="M 330 125 L 392 125" marker-end="url(#b09q1-arrow)"/>

  <text class="d-text" x="40" y="276" text-anchor="middle">out</text>
  <rect class="d-box-muted" x="70" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="276" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="134" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="276" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="198" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="276" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 510 178 L 510 270 L 262 270" marker-end="url(#b09q1-arrow)"/>
</svg>

Grey boxes are already used, the highlighted boxes are what the pointers see now. The output only ever grows at its right end, and each comparison places exactly one item.

### Why "take from a on ties" matters

📌 **Interview term: Stable merge** — when two items compare equal, the one from the first array is placed first. With numbers you cannot see the difference, but when you sort records by one field (orders by price, students by grade), stability keeps their earlier order. Comparing with \`<=\` (take from \`a\` when equal) makes the merge stable; comparing with \`<\` does not. Example 3 below prints both orders. More background: [what is a stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

## 4. Brute Force First, Then the Python Two-Pointer Code

The brute force is one line: \`sorted(a + b)\`. It is correct, and in a real Python codebase it is often what you would write. In an interview, though, it hides the point of the question: it treats the inputs as if they were unsorted, which costs O((m + n) log(m + n)) in general instead of O(m + n).

Python's sort is smart about already-sorted stretches ("runs"), so on two sorted halves it does far fewer comparisons than a general sort. We counted the comparisons on two interleaved lists of 1000 items each by giving every item a \`__lt__\` method that increments a counter:

~~~python
import heapq

class Counted:
    calls = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):          # sorted() and heapq only use <
        Counted.calls += 1
        return self.v < other.v

evens = [Counted(x) for x in range(0, 2000, 2)]
odds = [Counted(x) for x in range(1, 2000, 2)]

Counted.calls = 0
s = sorted(evens + odds)
print("sorted(a + b) comparisons:", Counted.calls)

Counted.calls = 0
m = list(heapq.merge(evens, odds))
print("heapq.merge   comparisons:", Counted.calls)
print("same result:", [c.v for c in s] == [c.v for c in m])
print("heapq.merge returns:", type(heapq.merge([1], [2])).__name__)
~~~

~~~text
sorted(a + b) comparisons: 3999
heapq.merge   comparisons: 1999
same result: True
heapq.merge returns: generator
~~~

So \`sorted()\` needed about two comparisons per item here (it still has to find the runs and then merge them), \`heapq.merge\` about one, and a hand-written two-pointer merge needs at most \`m + n - 1\` (Example 3 prints 1999). \`heapq.merge\` is the standard-library merge: its docstring says it is "similar to \`sorted(itertools.chain(*iterables))\` but returns a generator" and "assumes that each of the input streams is already sorted". It accepts any number of inputs, which is how you would [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists).

📌 **Interview term: Generator** — a lazy Python iterator that produces values one at a time when asked. \`heapq.merge\` returns one, so you wrap it in \`list(...)\` when you need a list.

Interviewers usually want the merge written by hand. Here it is:

~~~python
def merge(a, b):
    result = []
    i, j = 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= keeps equal items from a first (stable)
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])          # at most one of these two adds anything
    result.extend(b[j:])
    return result
~~~

Line by line:

- \`i\` and \`j\` are the positions of the next unused item in \`a\` and \`b\`. Using plain integer indices (not \`pop(0)\`) matters: \`list.pop(0)\` shifts every remaining element left, so popping from the front in a loop makes the merge O(n²).
- The \`while\` runs only while **both** lists still have items, so \`a[i]\` and \`b[j]\` are always valid indices.
- \`a[i] <= b[j]\` takes from \`a\` on ties. That is what makes the merge stable.
- After the loop, one list is used up. \`result.extend(a[i:])\` adds whatever is left. When \`i == len(a)\`, \`a[i:]\` is simply \`[]\`, so you do not need an \`if\`. Slicing copies the tail, which is fine here because those items have to be copied into \`result\` anyway.

## 5. The In-Place Variant: Fill From the Back

The most common interview version (LeetCode 88) says: \`nums1\` has length \`m + n\`. Its first \`m\` slots hold sorted values and the last \`n\` slots are empty (zeros). Merge \`nums2\` (length \`n\`) into \`nums1\` without a second array.

If you merge from the front, writing \`nums2[0]\` into \`nums1[0]\` overwrites a value you still need. The trick is to **write from the back**: the largest remaining value of either array belongs in the last empty slot, and that slot is free, so nothing is overwritten.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="In place merge from the back. nums1 is 1 2 3 then three free slots, nums2 is 2 5 6. The write pointer starts at the last slot. 6 is bigger than 3, so 6 is written into the last slot">
  <defs>
    <marker id="b09q1b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="50" y="76" text-anchor="middle">nums1</text>
  <rect class="d-box" x="100" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="76" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="76" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="240" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="310" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="338" y="76" text-anchor="middle">free</text>
  <rect class="d-box-muted" x="380" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="408" y="76" text-anchor="middle">free</text>
  <rect class="d-box-accent" x="450" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="76" text-anchor="middle">free</text>
  <text class="d-sub" x="268" y="116" text-anchor="middle">i = m - 1</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">write = m + n - 1</text>

  <text class="d-text" x="50" y="196" text-anchor="middle">nums2</text>
  <rect class="d-box" x="100" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="196" text-anchor="middle">6</text>
  <text class="d-sub" x="268" y="236" text-anchor="middle">j = n - 1</text>
  <path class="d-edge-accent" d="M 300 190 L 478 190 L 478 124" marker-end="url(#b09q1b-arrow)"/>
  <text class="d-sub" x="560" y="176" text-anchor="middle">6 is bigger than 3</text>
  <text class="d-sub" x="560" y="196" text-anchor="middle">so 6 goes last</text>
</svg>

After writing 6 the write index and \`j\` both move one step left, and the comparison repeats (5 vs 3, then 3 vs 2, ...). The loop only needs to run **while \`nums2\` still has items**: when \`j\` drops below 0, the values left in \`nums1\` are already in their correct places.

📌 **Interview term: In place** — the algorithm uses only O(1) extra memory beyond the input; here the output is written into the input array itself.

In Python:

~~~python
def merge_in_place(nums1, m, nums2, n):
    i, j, write = m - 1, n - 1, m + n - 1
    while j >= 0:                          # once nums2 is used up, nums1 is already in place
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[write] = nums1[i]
            i -= 1
        else:
            nums1[write] = nums2[j]
            j -= 1
        write -= 1
~~~

- Python lists are passed by reference, so \`nums1[write] = ...\` changes the caller's list. The function returns \`None\`, which is the Python convention for functions that mutate their argument (the same as \`list.sort()\`).
- The condition \`i >= 0 and nums1[i] > nums2[j]\` must check \`i >= 0\` first. In Python \`nums1[-1]\` is **not** an error: it silently reads the last element. If you forgot the \`i >= 0\` check, the code would compare against the wrong value instead of crashing, which is a much harder bug to spot.
- A tempting shortcut is \`nums1[m:] = nums2; nums1.sort()\`. It is correct, but it is a sort, not the O(m + n) merge the question asks for.

## 6. Verified: Running the Code

All three examples were saved as \`main.py\` and run with \`python3 main.py\`.

**Example 1 — two-pointer merge into a new list:**

~~~text
[1, 2, 3, 4, 5, 6, 7]
[1, 2, 2, 2, 3]
[4, 5]
[]
[-6, -5, 0, 10, 20]
[1, 2, 3, 10, 20]
~~~

**Example 2 — in-place merge into \`nums1\` from the back:**

~~~text
[1, 2, 2, 3, 5, 6]
[1, 2, 3, 4, 5, 6]
[1]
[1]
[2, 2, 2, 2]
~~~

**Example 3 — stability and the number of comparisons:**

~~~python
def merge_by_key(a, b, stable=True):
    out, i, j, comparisons = [], 0, 0, 0
    while i < len(a) and j < len(b):
        comparisons += 1
        take_a = a[i][0] <= b[j][0] if stable else a[i][0] < b[j][0]
        if take_a:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out, comparisons
~~~

~~~text
with <= : a1 a2 b1 a3 b2 b3
with <  : a1 b1 a2 b2 a3 b3
interleaved 1000 + 1000 comparisons: 1999
disjoint    1000 + 1000 comparisons: 1000
~~~

With \`<=\` the two items with key 3 come out as \`a2 b1\` (first list first) and the key-5 items as \`a3 b2\`. With \`<\` the order flips to \`b1 a2\` and \`b2 a3\`: the merge is no longer stable. The comparison counts show the two extremes: interleaved inputs need \`m + n - 1 = 1999\` comparisons, while inputs where every item of \`a\` is smaller than every item of \`b\` need only \`m = 1000\`, because once \`a\` runs out the rest of \`b\` is copied without comparing.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`sorted(a + b)\` | O((m + n) log(m + n)) in general | O(m + n) | A general sort; it is faster on sorted runs but you should not rely on that in an interview answer. |
| Two-pointer merge into a new list | O(m + n) | O(m + n) for the result | Each comparison appends exactly one item; leftovers are copied once. |
| In-place merge from the back | O(m + n) | O(1) | Writes into the free slots of \`nums1\`; only three integer indices. |
| \`heapq.merge(a, b)\` | O(m + n) for two inputs | O(1) besides the output | Lazy generator; for k inputs it is O(N log k). |

For what O(...) means, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One or both lists empty:** the main loop does not run; the leftovers step copies the other list. Example 1 prints \`[4, 5]\` and \`[]\`.
- **Duplicates, inside and across the lists:** \`[1, 2, 2] + [2, 3]\` gives \`[1, 2, 2, 2, 3]\`.
- **Negative numbers:** no special handling; comparisons work the same.
- **No overlap at all:** \`[1, 2, 3] + [10, 20]\` — the loop ends after 3 comparisons and the rest of \`b\` is copied.
- **In place with \`m = 0\`:** \`nums1 = [0]\`, \`nums2 = [1]\` — every value comes from \`nums2\`. Note the \`0\` in \`nums1\` is a free slot, not a real value.
- **In place with \`n = 0\`:** the loop never runs and \`nums1\` is unchanged.

## Common Pitfalls

- **Using \`pop(0)\` to take the front item.** It looks natural, but each \`pop(0)\` is O(n) on a Python list, so the "linear" merge becomes quadratic. Use indices, or \`collections.deque.popleft()\` if you really want to pop.
- **Forgetting the leftovers.** Stopping when one list runs out drops the tail of the other one. \`extend(a[i:])\` and \`extend(b[j:])\` fix it with no extra \`if\`.
- **Negative indexes hiding bugs.** In the in-place version, \`nums1[i]\` with \`i = -1\` silently reads the last element instead of raising \`IndexError\`. Always guard with \`i >= 0\` before indexing.
- **Merging from the front in place.** Writing into \`nums1[0]\` destroys a value you have not read yet. Fill from the back.
- **Rebinding instead of mutating.** Inside the function, \`nums1 = sorted(nums1[:m] + nums2)\` creates a new local list and the caller sees no change. If you must replace the contents, use \`nums1[:] = ...\`.
- **Using \`<\` and losing stability.** Fine for plain numbers, wrong when equal keys carry different data.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two pointers, one per list: compare the fronts, append the smaller, advance that pointer, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extend</code> with whatever is left. O(m + n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not sort:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(a + b)</code> works but ignores that the inputs are already sorted; the merge uses at most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 1</code> comparisons.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stability:</strong> <span style="color:#f0e2c8;">I compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> so equal items from the first list stay first; that matters when merging records by a key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The in-place version:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> free slots at the end, I fill from the back with three indices so nothing unread is overwritten; O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python traps:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> in the loop (it is O(n) each time), and guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1[-1]</code> silently reads the last element.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a standard-library way to do this in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.merge(a, b)</code> returns a lazy generator over the merged items and takes any number of sorted inputs; wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code> for a list. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(a + b)</code> also works but is a full sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge k sorted lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the first item of each list into a min-heap (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>) together with its list index, pop the smallest, push the next item from that list. That is O(N log k) for N total items, which is exactly what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.merge(*lists)</code> does for you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you fill from the back in the in-place version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The free slots are at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code>, and the largest remaining value always belongs in the last free slot. Writing there never overwrites a value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> that I still need to read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When can you stop the in-place loop early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As soon as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums2</code> is used up (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &lt; 0</code>). The remaining values of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> are already in their final positions, so there is nothing left to move.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the inputs are huge files that do not fit in memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same merge works on streams: read one item from each file at a time. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.merge</code> is lazy, so it can merge two file iterators while holding only a few items in memory. That is the merge phase of an external sort.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Two pointers | Two indices that move through the data; each step advances one, so the scan is linear. |
| Merge step | Combining two sorted sequences into one sorted sequence in linear time; the second half of merge sort. |
| Stable merge | Equal items keep their original relative order (items from the first input first). |
| In place | Uses O(1) extra memory beyond the input; the result is written into the input array. |
| Generator | A lazy Python iterator; \`heapq.merge\` returns one. |

**Conclusion:** Merging two sorted lists is the "look at both fronts, take the smaller, step forward" loop: O(m + n) time, at most \`m + n - 1\` comparisons, stable when ties go to the first list. In Python, write it with indices rather than \`pop(0)\`, use \`extend\` for the leftovers, know that \`heapq.merge\` exists, and for the in-place version fill \`nums1\` from the back while guarding against Python's silent negative indexing.`,
        examples: [
          {
            label: "Two-pointer merge into a new array (several inputs, including empty ones)",
            code: `# Merge two sorted lists into a new sorted list with two pointers.
def merge(a, b):
    result = []
    i, j = 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= keeps equal items from a first (stable)
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])          # at most one of these two adds anything
    result.extend(b[j:])
    return result

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

print(fmt(merge([1, 3, 5, 7], [2, 4, 6])))  # [1, 2, 3, 4, 5, 6, 7]
print(fmt(merge([1, 2, 2], [2, 3])))  # [1, 2, 2, 2, 3]
print(fmt(merge([], [4, 5])))  # [4, 5]
print(fmt(merge([], [])))  # []
print(fmt(merge([-5, 0, 10], [-6, 20])))  # [-6, -5, 0, 10, 20]
print(fmt(merge([1, 2, 3], [10, 20])))  # [1, 2, 3, 10, 20]
`,
          },
          {
            label: "In-place merge into nums1 by filling from the back",
            code: `# In-place merge: nums1 has m real values followed by n free slots (zeros),
# nums2 has n values. Fill nums1 from the back so nothing is overwritten.
def merge_in_place(nums1, m, nums2, n):
    i, j, write = m - 1, n - 1, m + n - 1
    while j >= 0:                          # once nums2 is used up, nums1 is already in place
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[write] = nums1[i]
            i -= 1
        else:
            nums1[write] = nums2[j]
            j -= 1
        write -= 1

def run_case(nums1, m, nums2, n):
    merge_in_place(nums1, m, nums2, n)     # mutates nums1, returns None
    return "[" + ", ".join(str(x) for x in nums1) + "]"

print(run_case([1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3))  # [1, 2, 2, 3, 5, 6]
print(run_case([4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3))  # [1, 2, 3, 4, 5, 6]
print(run_case([1], 1, [], 0))  # [1]
print(run_case([0], 0, [1], 1))  # [1]
print(run_case([2, 2, 0, 0], 2, [2, 2], 2))  # [2, 2, 2, 2]
`,
          },
          {
            label: "Stability (<= vs <) and counting comparisons",
            code: `# Two things the two-pointer merge guarantees: stability (with <=) and at most
# len(a) + len(b) - 1 comparisons.
def merge_by_key(a, b, stable=True):
    out, i, j, comparisons = [], 0, 0, 0
    while i < len(a) and j < len(b):
        comparisons += 1
        take_a = a[i][0] <= b[j][0] if stable else a[i][0] < b[j][0]
        if take_a:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out, comparisons

def names(pairs):
    return " ".join(name for _, name in pairs)

a = [(1, "a1"), (3, "a2"), (5, "a3")]
b = [(3, "b1"), (5, "b2"), (6, "b3")]
merged, _ = merge_by_key(a, b, True)
print("with <= :", names(merged))
merged, _ = merge_by_key(a, b, False)
print("with <  :", names(merged))

evens = [(x, "") for x in range(0, 2000, 2)]     # 1000 items
odds = [(x, "") for x in range(1, 2000, 2)]      # 1000 items, interleaved
low = [(x, "") for x in range(1000)]             # all smaller than high
high = [(x, "") for x in range(1000, 2000)]
print("interleaved 1000 + 1000 comparisons:", merge_by_key(evens, odds)[1])
print("disjoint    1000 + 1000 comparisons:", merge_by_key(low, high)[1])
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get two arrays of numbers, each sorted in ascending order. Write a JavaScript function that returns a single sorted array with all the elements. Then: what changes if the first array already has empty slots at the end and I want the merge done in place?"

**What a strong answer should cover:**
- The two-pointer merge: compare \`a[i]\` and \`b[j]\`, push the smaller, advance that index, then copy the leftovers.
- O(m + n) time and O(m + n) output space, versus O((m + n) log(m + n)) for \`[...a, ...b].sort(...)\`.
- \`<=\` keeps equal items from the first array first (a stable merge).
- The in-place variant (LeetCode 88): fill \`nums1\` from the back with three indices; O(1) extra space.
- JavaScript specifics: \`sort()\` without a comparator sorts numbers as strings, \`shift()\` is O(n) so it does not belong in the loop, and reading past the end gives \`undefined\` instead of an error.

**Clarifying questions expected:**
- "Return a new array, or mutate the first one in place?"
- "Can either array be empty, and can values repeat?"

**Code / implementation expected:** Yes — a JavaScript \`merge(a, b)\` with two indices, and the from-the-back in-place version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know JavaScript arrays and loops.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`node\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their own pile of exam papers by score, lowest on top. The head teacher wants **one** pile, also sorted. You could throw both piles on the floor and sort all the papers again from scratch, but that ignores the work the teachers already did.

The smarter way: put the two piles side by side, look only at the **top paper of each pile**, take the lower one and put it on the new pile, and repeat. You never need to look deeper than the top of each pile, because everything underneath is already bigger. When one pile runs out, the rest of the other pile goes on as one block. Every paper is touched exactly once.

That "look at the two fronts, take the smaller, step forward" move is the **merge step** of merge sort, it is how databases join sorted data, and it is the core of half a dozen other interview problems ([merge two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists), [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [merge overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals)). Interviewers ask it because it is short enough to code perfectly and it shows whether you can handle indices and "leftover" elements without bugs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return a new array, or merge into the first array in place? | The classic LeetCode 88 version gives you \`nums1\` with free slots at the end; that changes the algorithm (fill from the back). |
| Are both inputs sorted ascending? | If one is descending you must walk it from the other end. |
| Can there be duplicates, and does the order of equal items matter? | Equal items from the first array should come first if the merge must be **stable** (it matters when items carry extra data). |
| Can either array be empty? | Empty inputs are the most common source of index bugs. |
| How big can the arrays be? | Tells you whether an O(m + n) extra array is acceptable or memory is tight. |

## 3. The Core Idea: Two Pointers

Keep one index into each array. Each index points at the smallest item of that array that has **not been used yet**.

📌 **Interview term: Two pointers** — a technique where two indices move through data (here, one per array) and each step moves one of them forward, so the whole scan is linear.

At every step compare \`a[i]\` and \`b[j]\`, copy the smaller one to the output, and move only that index forward. When one array is used up, nothing in the other array needs comparing any more: everything left is already sorted and at least as large as everything output so far, so you copy the leftovers as a block.

📌 **Interview term: Merge step** — the linear-time procedure that combines two sorted sequences into one sorted sequence; it is the "conquer" half of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Two pointer merge of a equals 1 3 5 7 and b equals 2 4 6. After taking 1 and 2, i points at 3 and j points at 4. 3 is not bigger than 4, so 3 goes to the output and i moves right">
  <defs>
    <marker id="b09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="76" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="70" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="134" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="76" text-anchor="middle">3</text>
  <rect class="d-box" x="198" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="76" text-anchor="middle">5</text>
  <rect class="d-box" x="262" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="287" y="76" text-anchor="middle">7</text>
  <text class="d-sub" x="159" y="114" text-anchor="middle">i = 1</text>

  <text class="d-text" x="40" y="166" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="70" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="166" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="134" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="166" text-anchor="middle">4</text>
  <rect class="d-box" x="198" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="166" text-anchor="middle">6</text>
  <text class="d-sub" x="159" y="204" text-anchor="middle">j = 1</text>

  <rect class="d-box-accent" x="400" y="80" width="220" height="90" rx="10"/>
  <text class="d-text" x="510" y="110" text-anchor="middle">compare a[i] with b[j]</text>
  <text class="d-sub" x="510" y="134" text-anchor="middle">3 is not bigger than 4</text>
  <text class="d-sub" x="510" y="154" text-anchor="middle">so take 3 and move i</text>
  <path class="d-edge" d="M 330 125 L 392 125" marker-end="url(#b09q1-arrow)"/>

  <text class="d-text" x="40" y="276" text-anchor="middle">out</text>
  <rect class="d-box-muted" x="70" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="276" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="134" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="276" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="198" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="276" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 510 178 L 510 270 L 262 270" marker-end="url(#b09q1-arrow)"/>
</svg>

Grey boxes are already used, the highlighted boxes are what the pointers see now. The output only ever grows at its right end, and each comparison places exactly one item.

### Why "take from a on ties" matters

📌 **Interview term: Stable merge** — when two items compare equal, the one from the first array is placed first. With numbers you cannot see the difference, but when you sort records by one field (orders by price, students by grade), stability keeps their earlier order. Comparing with \`<=\` (take from \`a\` when equal) makes the merge stable; comparing with \`<\` does not. Example 3 below prints both orders. More background: [what is a stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

## 4. Brute Force First, Then the JavaScript Two-Pointer Code

The brute force is \`a.concat(b).sort((x, y) => x - y)\`. It is correct but it throws away the fact that the inputs are sorted, so in general it costs O((m + n) log(m + n)). It also has a famous JavaScript trap: **without a comparator, \`sort()\` converts the values to strings** and compares them as text. We ran this:

~~~javascript
const evens = [], odds = [];
for (let x = 0; x < 2000; x += 2) { evens.push(x); odds.push(x + 1); }

let calls = 0;
const sorted = evens.concat(odds).sort(function (x, y) { calls++; return x - y; });
console.log('concat + sort comparisons: ' + calls);

console.log('default sort of [10, 9, 1]: ' + [10, 9, 1].sort().join(', '));
console.log('numeric sort of [10, 9, 1]: ' + [10, 9, 1].sort(function (x, y) { return x - y; }).join(', '));
console.log('sorted length: ' + sorted.length);
~~~

~~~text
concat + sort comparisons: 3998
default sort of [10, 9, 1]: 1, 10, 9
numeric sort of [10, 9, 1]: 1, 9, 10
sorted length: 2000
~~~

\`[10, 9, 1].sort()\` gives \`1, 10, 9\` because the string \`"10"\` comes before \`"9"\`. With the comparator \`(x, y) => x - y\` the order is numeric. The comparison count (3998 for 2000 items) is far below the roughly 22,000 that n log2 n would suggest, because V8's sort takes advantage of already-sorted stretches: V8 switched \`Array.prototype.sort\` to TimSort, a stable merge-based sort that detects sorted runs, in V8 v7.0 / Chrome 70 ([V8 blog: Getting things sorted in V8](https://v8.dev/blog/array-sort)), and ES2019 made stability a requirement for all engines ([v8.dev: stable sort](https://v8.dev/features/stable-sort)). Even so, the hand-written merge needs at most \`m + n - 1 = 1999\` comparisons, and it is what the interviewer wants to see.

📌 **Interview term: Comparator** — a function \`(x, y) => number\` that tells \`sort\` the order: negative means x first, positive means y first, zero means equal.

Note that \`sort()\` also **mutates** the array it is called on; \`concat\` makes a new array first so the inputs survive. In ES2023 there is also \`toSorted()\`, which returns a sorted copy ([toSorted vs sort](/interview-question/how-does-array-prototype-tosorted-differ-from-sort-and-why-does-that-matter-when)).

The hand-written merge:

~~~javascript
function merge(a, b) {
  const result = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {           // <= keeps equal items from a first (stable)
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  while (i < a.length) result.push(a[i++]);   // at most one of these loops runs
  while (j < b.length) result.push(b[j++]);
  return result;
}
~~~

Line by line:

- \`i\` and \`j\` are the next unused positions in \`a\` and \`b\`. Do not use \`a.shift()\` to take the front item: \`shift()\` moves every remaining element one slot left, so a loop of shifts is O(n²).
- \`result.push(a[i++])\` pushes \`a[i]\` and **then** increments \`i\` (post-increment). It is compact, but say it out loud in an interview so the reader does not have to think about it.
- The main loop runs only while both arrays have items. This is more important in JavaScript than in most languages, because reading past the end does not throw. It returns \`undefined\`, and comparisons with \`undefined\` are always \`false\`:

~~~javascript
const nums1 = [5, 0];
console.log('nums1[-1] is ' + nums1[-1]);
console.log('undefined > 3 is ' + (undefined > 3));
console.log('undefined <= 3 is ' + (undefined <= 3));
~~~

~~~text
nums1[-1] is undefined
undefined > 3 is false
undefined <= 3 is false
~~~

  If you wrote a single loop \`while (result.length < a.length + b.length)\` with \`if (a[i] <= b[j])\`, then once \`b\` ran out, \`a[i] <= undefined\` would be \`false\` and the code would push \`undefined\` from \`b\` instead of the rest of \`a\`. Keeping the "both have items" loop and two leftover loops avoids this entirely.

## 5. The In-Place Variant: Fill From the Back

The most common interview version (LeetCode 88) says: \`nums1\` has length \`m + n\`. Its first \`m\` slots hold sorted values and the last \`n\` slots are empty (zeros). Merge \`nums2\` (length \`n\`) into \`nums1\` without a second array.

If you merge from the front, writing \`nums2[0]\` into \`nums1[0]\` overwrites a value you still need. The trick is to **write from the back**: the largest remaining value of either array belongs in the last empty slot, and that slot is free, so nothing is overwritten.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="In place merge from the back. nums1 is 1 2 3 then three free slots, nums2 is 2 5 6. The write pointer starts at the last slot. 6 is bigger than 3, so 6 is written into the last slot">
  <defs>
    <marker id="b09q1b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="50" y="76" text-anchor="middle">nums1</text>
  <rect class="d-box" x="100" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="76" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="76" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="240" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="310" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="338" y="76" text-anchor="middle">free</text>
  <rect class="d-box-muted" x="380" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="408" y="76" text-anchor="middle">free</text>
  <rect class="d-box-accent" x="450" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="76" text-anchor="middle">free</text>
  <text class="d-sub" x="268" y="116" text-anchor="middle">i = m - 1</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">write = m + n - 1</text>

  <text class="d-text" x="50" y="196" text-anchor="middle">nums2</text>
  <rect class="d-box" x="100" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="196" text-anchor="middle">6</text>
  <text class="d-sub" x="268" y="236" text-anchor="middle">j = n - 1</text>
  <path class="d-edge-accent" d="M 300 190 L 478 190 L 478 124" marker-end="url(#b09q1b-arrow)"/>
  <text class="d-sub" x="560" y="176" text-anchor="middle">6 is bigger than 3</text>
  <text class="d-sub" x="560" y="196" text-anchor="middle">so 6 goes last</text>
</svg>

After writing 6 the write index and \`j\` both move one step left, and the comparison repeats (5 vs 3, then 3 vs 2, ...). The loop only needs to run **while \`nums2\` still has items**: when \`j\` drops below 0, the values left in \`nums1\` are already in their correct places.

📌 **Interview term: In place** — the algorithm uses only O(1) extra memory beyond the input; here the output is written into the input array itself.

In JavaScript:

~~~javascript
function mergeInPlace(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, write = m + n - 1;
  while (j >= 0) {                     // once nums2 is used up, nums1 is already in place
    if (i >= 0 && nums1[i] > nums2[j]) {
      nums1[write--] = nums1[i--];
    } else {
      nums1[write--] = nums2[j--];
    }
  }
}
~~~

- Arrays are objects, so the function receives a reference to the caller's array and \`nums1[write--] = ...\` changes it. Returning nothing (\`undefined\`) signals that the function works by mutation.
- The guard \`i >= 0\` is essential: \`nums1[-1]\` is \`undefined\`, not an error. Here \`undefined > nums2[j]\` happens to be \`false\`, so the code would still take from \`nums2\`, but relying on that is fragile and confuses anyone reading the code. Write the guard.
- A shortcut like \`nums1.splice(m, n, ...nums2); nums1.sort((x, y) => x - y)\` works, but it is a sort, not the O(m + n) merge.

## 6. Verified: Running the Code

All three examples were saved as \`main.js\` and run with \`node main.js\`.

**Example 1 — two-pointer merge into a new array:**

~~~text
[1, 2, 3, 4, 5, 6, 7]
[1, 2, 2, 2, 3]
[4, 5]
[]
[-6, -5, 0, 10, 20]
[1, 2, 3, 10, 20]
~~~

**Example 2 — in-place merge into \`nums1\` from the back:**

~~~text
[1, 2, 2, 3, 5, 6]
[1, 2, 3, 4, 5, 6]
[1]
[1]
[2, 2, 2, 2]
~~~

**Example 3 — stability and the number of comparisons:**

~~~javascript
function mergeByKey(a, b, stable) {
  const out = [];
  let i = 0, j = 0, comparisons = 0;
  while (i < a.length && j < b.length) {
    comparisons++;
    const takeA = stable ? a[i][0] <= b[j][0] : a[i][0] < b[j][0];
    if (takeA) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return { out: out, comparisons: comparisons };
}
~~~

~~~text
with <= : a1 a2 b1 a3 b2 b3
with <  : a1 b1 a2 b2 a3 b3
interleaved 1000 + 1000 comparisons: 1999
disjoint    1000 + 1000 comparisons: 1000
~~~

With \`<=\` the two key-3 items come out as \`a2 b1\` (first array first) and the key-5 items as \`a3 b2\`. With \`<\` they flip to \`b1 a2\` and \`b2 a3\`: the merge is no longer stable. Interleaved inputs need \`m + n - 1 = 1999\` comparisons; when every item of \`a\` is smaller than every item of \`b\`, only \`m = 1000\` comparisons happen, because the rest of \`b\` is copied without comparing.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`a.concat(b).sort((x, y) => x - y)\` | O((m + n) log(m + n)) in general | O(m + n) | A general sort; faster on sorted runs, but it is not the answer the question is after. |
| Two-pointer merge into a new array | O(m + n) | O(m + n) for the result | One comparison places one item; leftovers are copied once. |
| In-place merge from the back | O(m + n) | O(1) | Three integer indices; writes into the free slots of \`nums1\`. |

For what O(...) means, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One or both arrays empty:** the main loop does not run; a leftover loop copies the other array. Example 1 prints \`[4, 5]\` and \`[]\`.
- **Duplicates:** \`[1, 2, 2]\` and \`[2, 3]\` give \`[1, 2, 2, 2, 3]\`.
- **Negative numbers:** handled by the numeric comparison. (With \`sort()\` and no comparator, \`[-1, -2]\` would be ordered as strings — another reason to pass one.)
- **No overlap:** \`[1, 2, 3]\` and \`[10, 20]\` — 3 comparisons, then \`b\` is copied.
- **In place with \`m = 0\` or \`n = 0\`:** Example 2 covers both: with \`m = 0\` all values come from \`nums2\`; with \`n = 0\` the loop never runs.

## Common Pitfalls

- **\`sort()\` without a comparator.** It sorts numbers as strings: \`[10, 9, 1]\` becomes \`[1, 10, 9]\`. Always pass \`(x, y) => x - y\` for numbers.
- **\`shift()\` in the loop.** Each \`shift()\` is O(n), so the merge becomes O(n²). Use indices.
- **Silent \`undefined\` past the end.** JavaScript never throws on an out-of-range read; a loop that does not check both bounds pushes \`undefined\` into the result.
- **Forgetting the leftovers.** The main loop stops when either array runs out; without the two leftover loops you lose the tail of the other array.
- **Reassigning instead of mutating.** \`nums1 = [...]\` inside the function only rebinds the local variable; the caller still sees the old array. Write into \`nums1[k]\`.
- **Merging from the front in place.** It overwrites values of \`nums1\` that have not been read yet.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two indices, one per array: compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b[j]</code>, push the smaller, advance that index, then copy the leftovers. O(m + n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not sort:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.concat(b).sort((x, y) =&gt; x - y)</code> ignores that the inputs are sorted, and without the comparator it would even sort the numbers as strings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stability:</strong> <span style="color:#f0e2c8;">I compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, so equal values from the first array come first; that matters when the items are objects merged by a key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The in-place version:</strong> <span style="color:#f0e2c8;">With free slots at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code>, I fill from the back: the largest remaining value goes in the last free slot, so nothing unread is overwritten. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript traps:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> in the loop (O(n) each), and both bounds must be checked because an out-of-range read returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of throwing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[10, 9, 1].sort()</code> wrong for numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> converts the values to strings and compares them as text, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"10"</code> comes before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"9"</code>. We ran it: the result is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1, 10, 9</code>. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x, y) =&gt; x - y</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Array.prototype.sort</code> stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, since ES2019 the specification requires it, and V8 has used a stable TimSort since v7.0. My merge with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> is stable too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge k sorted arrays in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript has no built-in heap, so either write a small binary min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value, arrayIndex, position]</code> entries for O(N log k), or merge the arrays in pairs (divide and conquer), which is also O(N log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the in-place loop only run while <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">j &gt;= 0</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once all of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums2</code> has been placed, the remaining values of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> are already in their final positions at the front, so there is nothing left to move.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your merge allocates a new array. Can you avoid that?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the space is already there, as in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> with free slots version. For two separate arrays the output has to live somewhere, so O(m + n) space for the result is unavoidable; the algorithm itself only needs two indices.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Two pointers | Two indices that move through the data; each step advances one, so the scan is linear. |
| Merge step | Combining two sorted sequences into one sorted sequence in linear time; the second half of merge sort. |
| Stable merge | Equal items keep their original relative order (items from the first input first). |
| In place | Uses O(1) extra memory beyond the input; the result is written into the input array. |
| Comparator | The \`(x, y) => number\` function passed to \`sort\` to define the order. |

**Conclusion:** Merging two sorted arrays is a loop over two indices: compare the fronts, take the smaller, step forward, then copy the leftovers. It is O(m + n), stable with \`<=\`, and the in-place version fills \`nums1\` from the back. In JavaScript, keep the bounds checks explicit (out-of-range reads give \`undefined\`, not errors), avoid \`shift()\` in the loop, and if you do use \`sort\`, always pass a numeric comparator.`,
        examples: [
          {
            label: "Two-pointer merge into a new array (several inputs, including empty ones)",
            code: `// Merge two sorted arrays into a new sorted array with two pointers.
function merge(a, b) {
  const result = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {           // <= keeps equal items from a first (stable)
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  while (i < a.length) result.push(a[i++]);   // at most one of these loops runs
  while (j < b.length) result.push(b[j++]);
  return result;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(fmt(merge([1, 3, 5, 7], [2, 4, 6]))); // [1, 2, 3, 4, 5, 6, 7]
console.log(fmt(merge([1, 2, 2], [2, 3]))); // [1, 2, 2, 2, 3]
console.log(fmt(merge([], [4, 5]))); // [4, 5]
console.log(fmt(merge([], []))); // []
console.log(fmt(merge([-5, 0, 10], [-6, 20]))); // [-6, -5, 0, 10, 20]
console.log(fmt(merge([1, 2, 3], [10, 20]))); // [1, 2, 3, 10, 20]
`,
          },
          {
            label: "In-place merge into nums1 by filling from the back",
            code: `// In-place merge: nums1 has m real values followed by n free slots (zeros),
// nums2 has n values. Fill nums1 from the back so nothing is overwritten.
function mergeInPlace(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, write = m + n - 1;
  while (j >= 0) {                     // once nums2 is used up, nums1 is already in place
    if (i >= 0 && nums1[i] > nums2[j]) {
      nums1[write--] = nums1[i--];
    } else {
      nums1[write--] = nums2[j--];
    }
  }
}

function runCase(nums1, m, nums2, n) {
  mergeInPlace(nums1, m, nums2, n);    // mutates nums1, returns undefined
  return '[' + nums1.join(', ') + ']';
}

console.log(runCase([1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3)); // [1, 2, 2, 3, 5, 6]
console.log(runCase([4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3)); // [1, 2, 3, 4, 5, 6]
console.log(runCase([1], 1, [], 0)); // [1]
console.log(runCase([0], 0, [1], 1)); // [1]
console.log(runCase([2, 2, 0, 0], 2, [2, 2], 2)); // [2, 2, 2, 2]
`,
          },
          {
            label: "Stability (<= vs <) and counting comparisons",
            code: `// Two things the two-pointer merge guarantees: stability (with <=) and at most
// a.length + b.length - 1 comparisons.
function mergeByKey(a, b, stable) {
  const out = [];
  let i = 0, j = 0, comparisons = 0;
  while (i < a.length && j < b.length) {
    comparisons++;
    const takeA = stable ? a[i][0] <= b[j][0] : a[i][0] < b[j][0];
    if (takeA) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return { out: out, comparisons: comparisons };
}

function names(pairs) {
  return pairs.map(function (p) { return p[1]; }).join(' ');
}
function range(start, stop, step) {
  const xs = [];
  for (let x = start; x < stop; x += step) xs.push([x, '']);
  return xs;
}

const a = [[1, 'a1'], [3, 'a2'], [5, 'a3']];
const b = [[3, 'b1'], [5, 'b2'], [6, 'b3']];
console.log('with <= : ' + names(mergeByKey(a, b, true).out));
console.log('with <  : ' + names(mergeByKey(a, b, false).out));

console.log('interleaved 1000 + 1000 comparisons: ' + mergeByKey(range(0, 2000, 2), range(1, 2000, 2), true).comparisons);
console.log('disjoint    1000 + 1000 comparisons: ' + mergeByKey(range(0, 1000, 1), range(1000, 2000, 1), true).comparisons);
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have two int arrays, each sorted in ascending order. Write a Java method that returns a new int array containing all the elements in sorted order. Then: how would you do it in place if the first array were already sized m + n with the extra slots at the end?"

**What a strong answer should cover:**
- The two-pointer merge: compare \`a[i]\` and \`b[j]\`, copy the smaller, advance that index, then copy the leftovers.
- O(m + n) time; the result array is allocated once with \`new int[a.length + b.length]\`.
- \`<=\` keeps equal elements from the first array first (a stable merge).
- The in-place variant (LeetCode 88): fill \`nums1\` from the back with three indices; O(1) extra space.
- Java specifics: use \`int[]\`, not \`List<Integer>\`, to avoid boxing; never compare \`Integer\` objects with \`==\`; \`Arrays.toString\` for printing; an out-of-range index throws \`ArrayIndexOutOfBoundsException\`.

**Clarifying questions expected:**
- "Return a new array, or merge into nums1 in place?"
- "Can either array be empty, and can there be duplicates?"

**Code / implementation expected:** Yes — a static \`int[] merge(int[] a, int[] b)\` and the from-the-back in-place version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know Java arrays and loops.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`javac\` and run with \`java\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their own pile of exam papers by score, lowest on top. The head teacher wants **one** pile, also sorted. You could throw both piles on the floor and sort all the papers again from scratch, but that ignores the work the teachers already did.

The smarter way: put the two piles side by side, look only at the **top paper of each pile**, take the lower one and put it on the new pile, and repeat. You never need to look deeper than the top of each pile, because everything underneath is already bigger. When one pile runs out, the rest of the other pile goes on as one block. Every paper is touched exactly once.

That "look at the two fronts, take the smaller, step forward" move is the **merge step** of merge sort, it is how databases join sorted data, and it is the core of half a dozen other interview problems ([merge two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists), [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [merge overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals)). Interviewers ask it because it is short enough to code perfectly and it shows whether you can handle indices and "leftover" elements without bugs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return a new array, or merge into the first array in place? | The classic LeetCode 88 version gives you \`nums1\` with free slots at the end; that changes the algorithm (fill from the back). |
| Are both inputs sorted ascending? | If one is descending you must walk it from the other end. |
| Can there be duplicates, and does the order of equal items matter? | Equal items from the first array should come first if the merge must be **stable** (it matters when items carry extra data). |
| Can either array be empty? | Empty inputs are the most common source of index bugs. |
| How big can the arrays be? | Tells you whether an O(m + n) extra array is acceptable or memory is tight. |

## 3. The Core Idea: Two Pointers

Keep one index into each array. Each index points at the smallest item of that array that has **not been used yet**.

📌 **Interview term: Two pointers** — a technique where two indices move through data (here, one per array) and each step moves one of them forward, so the whole scan is linear.

At every step compare \`a[i]\` and \`b[j]\`, copy the smaller one to the output, and move only that index forward. When one array is used up, nothing in the other array needs comparing any more: everything left is already sorted and at least as large as everything output so far, so you copy the leftovers as a block.

📌 **Interview term: Merge step** — the linear-time procedure that combines two sorted sequences into one sorted sequence; it is the "conquer" half of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Two pointer merge of a equals 1 3 5 7 and b equals 2 4 6. After taking 1 and 2, i points at 3 and j points at 4. 3 is not bigger than 4, so 3 goes to the output and i moves right">
  <defs>
    <marker id="b09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="76" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="70" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="134" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="76" text-anchor="middle">3</text>
  <rect class="d-box" x="198" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="76" text-anchor="middle">5</text>
  <rect class="d-box" x="262" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="287" y="76" text-anchor="middle">7</text>
  <text class="d-sub" x="159" y="114" text-anchor="middle">i = 1</text>

  <text class="d-text" x="40" y="166" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="70" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="166" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="134" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="166" text-anchor="middle">4</text>
  <rect class="d-box" x="198" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="166" text-anchor="middle">6</text>
  <text class="d-sub" x="159" y="204" text-anchor="middle">j = 1</text>

  <rect class="d-box-accent" x="400" y="80" width="220" height="90" rx="10"/>
  <text class="d-text" x="510" y="110" text-anchor="middle">compare a[i] with b[j]</text>
  <text class="d-sub" x="510" y="134" text-anchor="middle">3 is not bigger than 4</text>
  <text class="d-sub" x="510" y="154" text-anchor="middle">so take 3 and move i</text>
  <path class="d-edge" d="M 330 125 L 392 125" marker-end="url(#b09q1-arrow)"/>

  <text class="d-text" x="40" y="276" text-anchor="middle">out</text>
  <rect class="d-box-muted" x="70" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="276" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="134" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="276" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="198" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="276" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 510 178 L 510 270 L 262 270" marker-end="url(#b09q1-arrow)"/>
</svg>

Grey boxes are already used, the highlighted boxes are what the pointers see now. The output only ever grows at its right end, and each comparison places exactly one item.

### Why "take from a on ties" matters

📌 **Interview term: Stable merge** — when two items compare equal, the one from the first array is placed first. With numbers you cannot see the difference, but when you sort records by one field (orders by price, students by grade), stability keeps their earlier order. Comparing with \`<=\` (take from \`a\` when equal) makes the merge stable; comparing with \`<\` does not. Example 3 below prints both orders. More background: [what is a stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

## 4. Brute Force First, Then the Java Two-Pointer Code

The brute force copies both arrays into one and sorts it: \`int[] c = new int[m + n]; System.arraycopy(...); Arrays.sort(c);\`. It is correct but costs O((m + n) log(m + n)) in general, ignoring that the inputs are already sorted. To see how many comparisons a library sort really does on this input, we sorted two interleaved runs of 1000 values each as an \`Integer[]\` with a counting \`Comparator\`:

~~~java
import java.util.Arrays;
import java.util.Comparator;

public class Main {
    static int calls = 0;

    public static void main(String[] args) {
        Integer[] both = new Integer[2000];
        for (int k = 0; k < 1000; k++) { both[k] = 2 * k; both[1000 + k] = 2 * k + 1; }
        Comparator<Integer> counting = (x, y) -> { calls++; return Integer.compare(x, y); };
        Arrays.sort(both, counting);
        System.out.println("Arrays.sort(Integer[], cmp) comparisons: " + calls);

        Integer x = 1000, y = 1000;
        System.out.println("Integer 1000 == 1000: " + (x == y));
        System.out.println("Integer 1000 equals 1000: " + x.equals(y));
        System.out.println("Integer.compare(1000, 1000) <= 0: " + (Integer.compare(x, y) <= 0));
    }
}
~~~

~~~text
Arrays.sort(Integer[], cmp) comparisons: 3998
Integer 1000 == 1000: false
Integer 1000 equals 1000: true
Integer.compare(1000, 1000) <= 0: true
~~~

Two things to take from this run:

1. The object sort did 3998 comparisons for 2000 values, well under the roughly 22,000 that n log2 n would suggest, because the sort for object arrays is an adaptive merge sort that detects already-sorted runs (the class comment of OpenJDK's \`java.util.TimSort\` describes it as "a stable, adaptive, iterative mergesort that requires far fewer than n lg(n) comparisons when running on partially sorted arrays"; see the [JDK 11 copy of TimSort.java](https://gee.cs.oswego.edu/dl/jsr166/src/jdk11/java/util/TimSort.java) and [JDK-6804124](https://bugs.openjdk.org/browse/JDK-6804124), which replaced the older merge sort in \`Arrays.sort\` with it). The hand-written merge needs at most \`m + n - 1 = 1999\`.
2. \`Integer x = 1000, y = 1000; x == y\` printed **false**. \`==\` on two \`Integer\` objects compares references, not values. It only "works" for small values because Java caches \`Integer\` objects for -128 to 127. If you write the merge over \`List<Integer>\`, compare with \`<=\` (which unboxes both sides to \`int\`) or \`Integer.compare\`, never with \`==\` for equality.

📌 **Interview term: Autoboxing** — Java automatically wrapping an \`int\` in an \`Integer\` object (and unwrapping it again). It costs memory and time, and \`==\` on the wrapped values compares object identity.

The hand-written merge on plain \`int[]\`:

~~~java
    static int[] merge(int[] a, int[] b) {
        int[] result = new int[a.length + b.length];   // size is known up front
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) {            // <= keeps equal items from a first (stable)
                result[k++] = a[i++];
            } else {
                result[k++] = b[j++];
            }
        }
        while (i < a.length) result[k++] = a[i++];   // at most one of these loops runs
        while (j < b.length) result[k++] = b[j++];
        return result;
    }
~~~

Line by line:

- Java arrays have a fixed length, so the result is allocated once with the exact size \`a.length + b.length\`, and a third index \`k\` tracks the next free slot. No resizing is needed (unlike an \`ArrayList\`).
- \`result[k++] = a[i++]\` copies and then advances both indices (post-increment).
- The main loop runs only while both arrays have items. If you got an index wrong, Java throws \`ArrayIndexOutOfBoundsException\` immediately — a loud failure, which is much easier to debug than reading garbage.
- The two leftover loops copy the tail of whichever array is not used up. \`System.arraycopy(a, i, result, k, a.length - i)\` would do the same in one call.

## 5. The In-Place Variant: Fill From the Back

The most common interview version (LeetCode 88) says: \`nums1\` has length \`m + n\`. Its first \`m\` slots hold sorted values and the last \`n\` slots are empty (zeros). Merge \`nums2\` (length \`n\`) into \`nums1\` without a second array.

If you merge from the front, writing \`nums2[0]\` into \`nums1[0]\` overwrites a value you still need. The trick is to **write from the back**: the largest remaining value of either array belongs in the last empty slot, and that slot is free, so nothing is overwritten.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="In place merge from the back. nums1 is 1 2 3 then three free slots, nums2 is 2 5 6. The write pointer starts at the last slot. 6 is bigger than 3, so 6 is written into the last slot">
  <defs>
    <marker id="b09q1b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="50" y="76" text-anchor="middle">nums1</text>
  <rect class="d-box" x="100" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="76" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="76" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="240" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="310" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="338" y="76" text-anchor="middle">free</text>
  <rect class="d-box-muted" x="380" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="408" y="76" text-anchor="middle">free</text>
  <rect class="d-box-accent" x="450" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="76" text-anchor="middle">free</text>
  <text class="d-sub" x="268" y="116" text-anchor="middle">i = m - 1</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">write = m + n - 1</text>

  <text class="d-text" x="50" y="196" text-anchor="middle">nums2</text>
  <rect class="d-box" x="100" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="196" text-anchor="middle">6</text>
  <text class="d-sub" x="268" y="236" text-anchor="middle">j = n - 1</text>
  <path class="d-edge-accent" d="M 300 190 L 478 190 L 478 124" marker-end="url(#b09q1b-arrow)"/>
  <text class="d-sub" x="560" y="176" text-anchor="middle">6 is bigger than 3</text>
  <text class="d-sub" x="560" y="196" text-anchor="middle">so 6 goes last</text>
</svg>

After writing 6 the write index and \`j\` both move one step left, and the comparison repeats (5 vs 3, then 3 vs 2, ...). The loop only needs to run **while \`nums2\` still has items**: when \`j\` drops below 0, the values left in \`nums1\` are already in their correct places.

📌 **Interview term: In place** — the algorithm uses only O(1) extra memory beyond the input; here the output is written into the input array itself.

In Java:

~~~java
    static void mergeInPlace(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, write = m + n - 1;
        while (j >= 0) {                  // once nums2 is used up, nums1 is already in place
            if (i >= 0 && nums1[i] > nums2[j]) {
                nums1[write--] = nums1[i--];
            } else {
                nums1[write--] = nums2[j--];
            }
        }
    }
~~~

- Java passes the array reference by value, so the method can change the caller's array contents (but assigning \`nums1 = new int[...]\` inside the method would not affect the caller).
- \`i >= 0 && nums1[i] > nums2[j]\` relies on \`&&\` short-circuiting: when \`i\` is -1, the right side is never evaluated, so there is no \`ArrayIndexOutOfBoundsException\`.
- The three indices are \`int\`. With array lengths limited to \`Integer.MAX_VALUE\`, \`m + n - 1\` cannot overflow for any valid input here because \`nums1.length == m + n\` already fits in an \`int\`.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\`.

**Example 1 — two-pointer merge into a new array:**

~~~text
[1, 2, 3, 4, 5, 6, 7]
[1, 2, 2, 2, 3]
[4, 5]
[]
[-6, -5, 0, 10, 20]
[1, 2, 3, 10, 20]
~~~

**Example 2 — in-place merge into \`nums1\` from the back:**

~~~text
[1, 2, 2, 3, 5, 6]
[1, 2, 3, 4, 5, 6]
[1]
[1]
[2, 2, 2, 2]
~~~

**Example 3 — stability and the number of comparisons** (the items are a small \`record Item(int key, String name)\`; records need Java 16+):

~~~java
    static List<Item> mergeByKey(List<Item> a, List<Item> b, boolean stable) {
        List<Item> out = new ArrayList<>(a.size() + b.size());
        int i = 0, j = 0;
        comparisons = 0;
        while (i < a.size() && j < b.size()) {
            comparisons++;
            int ka = a.get(i).key(), kb = b.get(j).key();
            boolean takeA = stable ? ka <= kb : ka < kb;
            out.add(takeA ? a.get(i++) : b.get(j++));
        }
        while (i < a.size()) out.add(a.get(i++));
        while (j < b.size()) out.add(b.get(j++));
        return out;
    }
~~~

~~~text
with <= : a1 a2 b1 a3 b2 b3
with <  : a1 b1 a2 b2 a3 b3
interleaved 1000 + 1000 comparisons: 1999
disjoint    1000 + 1000 comparisons: 1000
~~~

With \`<=\` the two key-3 items come out as \`a2 b1\` (first list first) and the key-5 items as \`a3 b2\`. With \`<\` they flip to \`b1 a2\` and \`b2 a3\`: no longer stable. Interleaved inputs need \`m + n - 1 = 1999\` comparisons; when every item of \`a\` is smaller than every item of \`b\`, only \`m = 1000\`.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy + \`Arrays.sort\` | O((m + n) log(m + n)) in general | O(m + n) | A general sort; it does not use the fact that the inputs are sorted. |
| Two-pointer merge into a new \`int[]\` | O(m + n) | O(m + n) for the result | One comparison places one element; leftovers are copied once. |
| In-place merge from the back | O(m + n) | O(1) | Three \`int\` indices; writes into the free slots of \`nums1\`. |
| Same merge over \`List<Integer>\` | O(m + n) | O(m + n) plus boxing overhead | Each element is an object; slower in practice, same Big-O. |

For what O(...) means, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One or both arrays empty:** \`new int[]{}\` is a valid zero-length array; the main loop does not run. Example 1 prints \`[4, 5]\` and \`[]\`.
- **Duplicates:** \`{1, 2, 2}\` and \`{2, 3}\` give \`[1, 2, 2, 2, 3]\`.
- **Negative values:** handled by the normal \`<=\` on \`int\`.
- **No overlap:** \`{1, 2, 3}\` and \`{10, 20}\` — 3 comparisons, then the rest of \`b\` is copied.
- **In place with \`m = 0\` or \`n = 0\`:** Example 2 covers both.
- **\`null\` arrays:** not handled here; if the interviewer allows \`null\`, check for it up front and treat it as empty.

## Common Pitfalls

- **\`==\` on \`Integer\`.** With \`List<Integer>\`, \`a.get(i) == b.get(j)\` compares references; it printed \`false\` for two \`Integer\` objects holding 1000. Use \`<=\` (which unboxes) or \`.equals\`.
- **Using \`List<Integer>\` when \`int[]\` would do.** Boxing every value costs memory and time; interviewers notice.
- **Forgetting the leftovers.** The main loop stops when either array runs out; without the two leftover loops (or \`System.arraycopy\`) the result ends with zeros, because a new \`int[]\` is filled with 0.
- **Merging from the front in place.** It overwrites values of \`nums1\` that have not been read yet.
- **Reassigning the parameter.** \`nums1 = merged;\` inside the method changes only the local reference; the caller still sees the old array. Copy the values into \`nums1\` instead.
- **Using \`<\` and losing stability** when the elements are objects compared by a key.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two indices, one per array: compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b[j]</code>, copy the smaller into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[k++]</code>, advance that index, then copy the leftovers. O(m + n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not sort:</strong> <span style="color:#f0e2c8;">Copying into one array and calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> is O((m + n) log(m + n)) in general and ignores that the inputs are sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stability:</strong> <span style="color:#f0e2c8;">I compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, so equal elements from the first array come first; that matters when merging objects by a key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The in-place version:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> sized m + n, I fill from the back with three indices; the largest remaining value goes in the last free slot, so nothing unread is overwritten. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java details:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> to avoid boxing, allocate the result once at the exact size, and if I ever compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects I never use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer x = 1000, y = 1000; x == y</code> print false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on objects compares references. Java caches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects only for -128 to 127, so 1000 gives two different objects. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x.equals(y)</code> or compare the unboxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a library method that merges two sorted arrays in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for arrays directly. You can concatenate and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code>, or use streams, but both sort. For k sorted inputs you would use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> of (value, source index) entries, which is O(N log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the in-place loop only run while <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">j &gt;= 0</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once every element of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums2</code> is placed, the remaining elements of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> are already in their final positions, so nothing else needs moving.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you get an index wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException</code> at the bad access, which is why I keep the main loop condition as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; a.length &amp;&amp; j &lt; b.length</code> and rely on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code> short-circuiting for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> guard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to merge sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is merge sort's merge step. Merge sort splits the array in half, sorts each half recursively and then runs exactly this merge, giving O(n log n) overall.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Two pointers | Two indices that move through the data; each step advances one, so the scan is linear. |
| Merge step | Combining two sorted sequences into one sorted sequence in linear time; the second half of merge sort. |
| Stable merge | Equal items keep their original relative order (items from the first input first). |
| In place | Uses O(1) extra memory beyond the input; the result is written into the input array. |
| Autoboxing | Java wrapping an \`int\` in an \`Integer\` object automatically; \`==\` then compares references. |

**Conclusion:** Merging two sorted arrays is a loop over two indices that copies the smaller front each time, then the leftovers: O(m + n) time, stable with \`<=\`, and O(1) extra space in the from-the-back in-place version. In Java, work on \`int[]\` with a result allocated once at the right size, let \`&&\` short-circuiting protect the \`i >= 0\` check, and keep \`Integer\` objects away from \`==\`.`,
        examples: [
          {
            label: "Two-pointer merge into a new array (several inputs, including empty ones)",
            code: `// Merge two sorted int arrays into a new sorted array with two pointers.
public class Main {
    static int[] merge(int[] a, int[] b) {
        int[] result = new int[a.length + b.length];   // size is known up front
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) {            // <= keeps equal items from a first (stable)
                result[k++] = a[i++];
            } else {
                result[k++] = b[j++];
            }
        }
        while (i < a.length) result[k++] = a[i++];   // at most one of these loops runs
        while (j < b.length) result[k++] = b[j++];
        return result;
    }

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs[i]);
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(merge(new int[]{1, 3, 5, 7}, new int[]{2, 4, 6}))); // [1, 2, 3, 4, 5, 6, 7]
        System.out.println(fmt(merge(new int[]{1, 2, 2}, new int[]{2, 3})));       // [1, 2, 2, 2, 3]
        System.out.println(fmt(merge(new int[]{}, new int[]{4, 5})));              // [4, 5]
        System.out.println(fmt(merge(new int[]{}, new int[]{})));                  // []
        System.out.println(fmt(merge(new int[]{-5, 0, 10}, new int[]{-6, 20})));   // [-6, -5, 0, 10, 20]
        System.out.println(fmt(merge(new int[]{1, 2, 3}, new int[]{10, 20})));     // [1, 2, 3, 10, 20]
    }
}
`,
          },
          {
            label: "In-place merge into nums1 by filling from the back",
            code: `// In-place merge: nums1 has m real values followed by n free slots (zeros),
// nums2 has n values. Fill nums1 from the back so nothing is overwritten.
public class Main {
    static void mergeInPlace(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, write = m + n - 1;
        while (j >= 0) {                  // once nums2 is used up, nums1 is already in place
            if (i >= 0 && nums1[i] > nums2[j]) {
                nums1[write--] = nums1[i--];
            } else {
                nums1[write--] = nums2[j--];
            }
        }
    }

    static String runCase(int[] nums1, int m, int[] nums2, int n) {
        mergeInPlace(nums1, m, nums2, n); // mutates nums1 (arrays are passed by reference value)
        return java.util.Arrays.toString(nums1);
    }

    public static void main(String[] args) {
        System.out.println(runCase(new int[]{1, 2, 3, 0, 0, 0}, 3, new int[]{2, 5, 6}, 3)); // [1, 2, 2, 3, 5, 6]
        System.out.println(runCase(new int[]{4, 5, 6, 0, 0, 0}, 3, new int[]{1, 2, 3}, 3)); // [1, 2, 3, 4, 5, 6]
        System.out.println(runCase(new int[]{1}, 1, new int[]{}, 0));                      // [1]
        System.out.println(runCase(new int[]{0}, 0, new int[]{1}, 1));                     // [1]
        System.out.println(runCase(new int[]{2, 2, 0, 0}, 2, new int[]{2, 2}, 2));         // [2, 2, 2, 2]
    }
}
`,
          },
          {
            label: "Stability (<= vs <) and counting comparisons",
            code: `// Two things the two-pointer merge guarantees: stability (with <=) and at most
// a.length + b.length - 1 comparisons.
import java.util.ArrayList;
import java.util.List;

public class Main {
    record Item(int key, String name) {}

    static int comparisons;

    static List<Item> mergeByKey(List<Item> a, List<Item> b, boolean stable) {
        List<Item> out = new ArrayList<>(a.size() + b.size());
        int i = 0, j = 0;
        comparisons = 0;
        while (i < a.size() && j < b.size()) {
            comparisons++;
            int ka = a.get(i).key(), kb = b.get(j).key();
            boolean takeA = stable ? ka <= kb : ka < kb;
            out.add(takeA ? a.get(i++) : b.get(j++));
        }
        while (i < a.size()) out.add(a.get(i++));
        while (j < b.size()) out.add(b.get(j++));
        return out;
    }

    static String names(List<Item> xs) {
        StringBuilder sb = new StringBuilder();
        for (Item it : xs) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(it.name());
        }
        return sb.toString();
    }

    static List<Item> range(int start, int stop, int step) {
        List<Item> xs = new ArrayList<>();
        for (int x = start; x < stop; x += step) xs.add(new Item(x, ""));
        return xs;
    }

    public static void main(String[] args) {
        List<Item> a = List.of(new Item(1, "a1"), new Item(3, "a2"), new Item(5, "a3"));
        List<Item> b = List.of(new Item(3, "b1"), new Item(5, "b2"), new Item(6, "b3"));
        System.out.println("with <= : " + names(mergeByKey(a, b, true)));
        System.out.println("with <  : " + names(mergeByKey(a, b, false)));

        mergeByKey(range(0, 2000, 2), range(1, 2000, 2), true);
        System.out.println("interleaved 1000 + 1000 comparisons: " + comparisons);
        mergeByKey(range(0, 1000, 1), range(1000, 2000, 1), true);
        System.out.println("disjoint    1000 + 1000 comparisons: " + comparisons);
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given two vectors of ints that are each sorted in ascending order, write a C++ function that returns one sorted vector containing every element. Then: how would you merge in place if the first vector already has room for both at the end?"

**What a strong answer should cover:**
- The two-pointer merge: compare \`a[i]\` and \`b[j]\`, push the smaller, advance that index, then copy the leftovers.
- O(m + n) time; \`reserve(a.size() + b.size())\` so the result vector allocates once.
- \`<=\` keeps equal elements from the first vector first (a stable merge), the same guarantee \`std::merge\` gives.
- The in-place variant (LeetCode 88): fill \`nums1\` from the back; O(1) extra space.
- C++ specifics: \`std::merge\` / \`std::inplace_merge\` exist in \`<algorithm>\`; descending indices must be signed (\`int\`), because a \`size_t\` that goes below 0 wraps to a huge number; \`operator[]\` does no bounds check.

**Clarifying questions expected:**
- "Return a new vector, or merge into nums1 in place?"
- "Can either vector be empty, and can there be duplicates?"

**Code / implementation expected:** Yes — a hand-written two-pointer merge and the from-the-back version; mentioning \`std::merge\` is a plus.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know \`std::vector\` and loops.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`g++ -std=c++17\` and run, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their own pile of exam papers by score, lowest on top. The head teacher wants **one** pile, also sorted. You could throw both piles on the floor and sort all the papers again from scratch, but that ignores the work the teachers already did.

The smarter way: put the two piles side by side, look only at the **top paper of each pile**, take the lower one and put it on the new pile, and repeat. You never need to look deeper than the top of each pile, because everything underneath is already bigger. When one pile runs out, the rest of the other pile goes on as one block. Every paper is touched exactly once.

That "look at the two fronts, take the smaller, step forward" move is the **merge step** of merge sort, it is how databases join sorted data, and it is the core of half a dozen other interview problems ([merge two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists), [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [merge overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals)). Interviewers ask it because it is short enough to code perfectly and it shows whether you can handle indices and "leftover" elements without bugs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return a new array, or merge into the first array in place? | The classic LeetCode 88 version gives you \`nums1\` with free slots at the end; that changes the algorithm (fill from the back). |
| Are both inputs sorted ascending? | If one is descending you must walk it from the other end. |
| Can there be duplicates, and does the order of equal items matter? | Equal items from the first array should come first if the merge must be **stable** (it matters when items carry extra data). |
| Can either array be empty? | Empty inputs are the most common source of index bugs. |
| How big can the arrays be? | Tells you whether an O(m + n) extra array is acceptable or memory is tight. |

## 3. The Core Idea: Two Pointers

Keep one index into each array. Each index points at the smallest item of that array that has **not been used yet**.

📌 **Interview term: Two pointers** — a technique where two indices move through data (here, one per array) and each step moves one of them forward, so the whole scan is linear.

At every step compare \`a[i]\` and \`b[j]\`, copy the smaller one to the output, and move only that index forward. When one array is used up, nothing in the other array needs comparing any more: everything left is already sorted and at least as large as everything output so far, so you copy the leftovers as a block.

📌 **Interview term: Merge step** — the linear-time procedure that combines two sorted sequences into one sorted sequence; it is the "conquer" half of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Two pointer merge of a equals 1 3 5 7 and b equals 2 4 6. After taking 1 and 2, i points at 3 and j points at 4. 3 is not bigger than 4, so 3 goes to the output and i moves right">
  <defs>
    <marker id="b09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="76" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="70" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="134" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="76" text-anchor="middle">3</text>
  <rect class="d-box" x="198" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="76" text-anchor="middle">5</text>
  <rect class="d-box" x="262" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="287" y="76" text-anchor="middle">7</text>
  <text class="d-sub" x="159" y="114" text-anchor="middle">i = 1</text>

  <text class="d-text" x="40" y="166" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="70" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="166" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="134" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="166" text-anchor="middle">4</text>
  <rect class="d-box" x="198" y="140" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="166" text-anchor="middle">6</text>
  <text class="d-sub" x="159" y="204" text-anchor="middle">j = 1</text>

  <rect class="d-box-accent" x="400" y="80" width="220" height="90" rx="10"/>
  <text class="d-text" x="510" y="110" text-anchor="middle">compare a[i] with b[j]</text>
  <text class="d-sub" x="510" y="134" text-anchor="middle">3 is not bigger than 4</text>
  <text class="d-sub" x="510" y="154" text-anchor="middle">so take 3 and move i</text>
  <path class="d-edge" d="M 330 125 L 392 125" marker-end="url(#b09q1-arrow)"/>

  <text class="d-text" x="40" y="276" text-anchor="middle">out</text>
  <rect class="d-box-muted" x="70" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="95" y="276" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="134" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="159" y="276" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="198" y="250" width="50" height="40" rx="6"/>
  <text class="d-text" x="223" y="276" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 510 178 L 510 270 L 262 270" marker-end="url(#b09q1-arrow)"/>
</svg>

Grey boxes are already used, the highlighted boxes are what the pointers see now. The output only ever grows at its right end, and each comparison places exactly one item.

### Why "take from a on ties" matters

📌 **Interview term: Stable merge** — when two items compare equal, the one from the first array is placed first. With numbers you cannot see the difference, but when you sort records by one field (orders by price, students by grade), stability keeps their earlier order. Comparing with \`<=\` (take from \`a\` when equal) makes the merge stable; comparing with \`<\` does not. Example 3 below prints both orders. More background: [what is a stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

## 4. Brute Force First, Then the C++ Two-Pointer Code

The brute force appends \`b\` to \`a\` and calls \`std::sort\`. It is correct, but it is a general O((m + n) log(m + n)) sort that ignores the fact that the inputs are already sorted. The standard library also has the real thing: \`std::merge\` in \`<algorithm>\` merges two sorted ranges into an output iterator. We counted the comparisons of both on two interleaved runs of 1000 values:

~~~cpp
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>
using namespace std;

int main() {
    vector<int> evens, odds;
    for (int x = 0; x < 2000; x += 2) { evens.push_back(x); odds.push_back(x + 1); }

    long calls = 0;
    auto counting = [&calls](int x, int y) { calls++; return x < y; };

    vector<int> both(evens);
    both.insert(both.end(), odds.begin(), odds.end());
    sort(both.begin(), both.end(), counting);
    cout << "std::sort comparisons:  " << calls << "\\n";

    calls = 0;
    vector<int> merged;
    merged.reserve(evens.size() + odds.size());
    merge(evens.begin(), evens.end(), odds.begin(), odds.end(), back_inserter(merged), counting);
    cout << "std::merge comparisons: " << calls << "\\n";
    cout << "same result: " << boolalpha << (merged == both) << "\\n";
    return 0;
}
~~~

~~~text
std::sort comparisons:  44731
std::merge comparisons: 1999
same result: true
~~~

\`std::merge\` did exactly \`m + n - 1 = 1999\` comparisons, while \`std::sort\` did many more, because it does not know the two halves are sorted. \`std::merge\` is also stable: for equal elements, the ones from the first range come first. (\`std::sort\` is **not** stable; \`std::stable_sort\` is.)

📌 **Interview term: Output iterator** — an object you can write values through, one after another. \`std::back_inserter(v)\` is one: each write calls \`v.push_back(...)\`.

In an interview you will usually be asked to write the merge yourself:

~~~cpp
vector<int> mergeSorted(const vector<int>& a, const vector<int>& b) {
    vector<int> result;
    result.reserve(a.size() + b.size());   // one allocation, no regrowth
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) {                 // <= keeps equal items from a first (stable)
            result.push_back(a[i++]);
        } else {
            result.push_back(b[j++]);
        }
    }
    while (i < a.size()) result.push_back(a[i++]);   // at most one of these loops runs
    while (j < b.size()) result.push_back(b[j++]);
    return result;
}
~~~

Line by line:

- The inputs are \`const vector<int>&\`: passed by reference (no copy) and read-only.
- \`result.reserve(a.size() + b.size())\` allocates the final capacity once, so \`push_back\` never has to reallocate and copy.
- \`i\` and \`j\` are \`size_t\` because they only go **up** from 0 and are compared with \`size()\`, which is also \`size_t\`. (Mixing \`int\` and \`size_t\` in a comparison triggers a sign-compare warning.)
- The main loop runs only while both vectors have items. \`a[i]\` uses \`operator[]\`, which does **no bounds checking**: reading past the end is undefined behaviour, not an exception. \`a.at(i)\` checks and throws \`std::out_of_range\`, at a small cost.

## 5. The In-Place Variant: Fill From the Back

The most common interview version (LeetCode 88) says: \`nums1\` has length \`m + n\`. Its first \`m\` slots hold sorted values and the last \`n\` slots are empty (zeros). Merge \`nums2\` (length \`n\`) into \`nums1\` without a second array.

If you merge from the front, writing \`nums2[0]\` into \`nums1[0]\` overwrites a value you still need. The trick is to **write from the back**: the largest remaining value of either array belongs in the last empty slot, and that slot is free, so nothing is overwritten.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="In place merge from the back. nums1 is 1 2 3 then three free slots, nums2 is 2 5 6. The write pointer starts at the last slot. 6 is bigger than 3, so 6 is written into the last slot">
  <defs>
    <marker id="b09q1b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="50" y="76" text-anchor="middle">nums1</text>
  <rect class="d-box" x="100" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="76" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="76" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="240" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="310" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="338" y="76" text-anchor="middle">free</text>
  <rect class="d-box-muted" x="380" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="408" y="76" text-anchor="middle">free</text>
  <rect class="d-box-accent" x="450" y="50" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="76" text-anchor="middle">free</text>
  <text class="d-sub" x="268" y="116" text-anchor="middle">i = m - 1</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">write = m + n - 1</text>

  <text class="d-text" x="50" y="196" text-anchor="middle">nums2</text>
  <rect class="d-box" x="100" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="128" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="198" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="170" width="56" height="40" rx="6"/>
  <text class="d-text" x="268" y="196" text-anchor="middle">6</text>
  <text class="d-sub" x="268" y="236" text-anchor="middle">j = n - 1</text>
  <path class="d-edge-accent" d="M 300 190 L 478 190 L 478 124" marker-end="url(#b09q1b-arrow)"/>
  <text class="d-sub" x="560" y="176" text-anchor="middle">6 is bigger than 3</text>
  <text class="d-sub" x="560" y="196" text-anchor="middle">so 6 goes last</text>
</svg>

After writing 6 the write index and \`j\` both move one step left, and the comparison repeats (5 vs 3, then 3 vs 2, ...). The loop only needs to run **while \`nums2\` still has items**: when \`j\` drops below 0, the values left in \`nums1\` are already in their correct places.

📌 **Interview term: In place** — the algorithm uses only O(1) extra memory beyond the input; here the output is written into the input array itself.

In C++:

~~~cpp
void mergeInPlace(vector<int>& nums1, int m, const vector<int>& nums2, int n) {
    int i = m - 1, j = n - 1, write = m + n - 1;   // int, not size_t: these go to -1
    while (j >= 0) {                               // once nums2 is used up, nums1 is already in place
        if (i >= 0 && nums1[i] > nums2[j]) {
            nums1[write--] = nums1[i--];
        } else {
            nums1[write--] = nums2[j--];
        }
    }
}
~~~

- \`nums1\` is taken by non-const reference (\`vector<int>&\`), so the function modifies the caller's vector.
- Here the indices go **down** to -1, so they must be a signed type. With \`size_t\` the loop would never end correctly, because an unsigned value cannot be negative. We ran this:

~~~cpp
#include <cstddef>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums1 = {7};
    std::size_t i = 0;
    i--;                       // what a "size_t i = m - 1" loop does when it passes 0
    std::cout << "size_t 0 minus 1 = " << i << "\\n";
    std::cout << "i >= 0 is always " << std::boolalpha << (i >= 0) << "\\n";
    return 0;
}
~~~

~~~text
size_t 0 minus 1 = 18446744073709551615
i >= 0 is always true
~~~

  \`0 - 1\` on a 64-bit \`size_t\` wraps around to 18446744073709551615, and \`i >= 0\` is always true for an unsigned type (g++ warns about it with \`-Wextra\`). Use \`int\` (or \`long\`) for indices that count down.
- The standard library has an in-place version too: if the two sorted parts sit next to each other in one container, \`std::inplace_merge(v.begin(), v.begin() + m, v.end())\` merges them. It may allocate a temporary buffer to be fast, so it is not a guaranteed O(1)-space answer.

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — two-pointer merge into a new vector:**

~~~text
[1, 2, 3, 4, 5, 6, 7]
[1, 2, 2, 2, 3]
[4, 5]
[]
[-6, -5, 0, 10, 20]
[1, 2, 3, 10, 20]
~~~

**Example 2 — in-place merge into \`nums1\` from the back:**

~~~text
[1, 2, 2, 3, 5, 6]
[1, 2, 3, 4, 5, 6]
[1]
[1]
[2, 2, 2, 2]
~~~

**Example 3 — stability and the number of comparisons:**

~~~cpp
vector<Item> mergeByKey(const vector<Item>& a, const vector<Item>& b, bool stable, int& comparisons) {
    vector<Item> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    comparisons = 0;
    while (i < a.size() && j < b.size()) {
        comparisons++;
        bool takeA = stable ? a[i].first <= b[j].first : a[i].first < b[j].first;
        out.push_back(takeA ? a[i++] : b[j++]);
    }
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}
~~~

~~~text
with <= : a1 a2 b1 a3 b2 b3
with <  : a1 b1 a2 b2 a3 b3
interleaved 1000 + 1000 comparisons: 1999
disjoint    1000 + 1000 comparisons: 1000
~~~

With \`<=\` the two key-3 items come out as \`a2 b1\` (first range first) and the key-5 items as \`a3 b2\`. With \`<\` they flip to \`b1 a2\` and \`b2 a3\`: no longer stable. Interleaved inputs need \`m + n - 1 = 1999\` comparisons; when every item of \`a\` is smaller than every item of \`b\`, only \`m = 1000\`.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Append + \`std::sort\` | O((m + n) log(m + n)) | O(m + n) | A general sort; ignores that the inputs are sorted. |
| Two-pointer merge / \`std::merge\` | O(m + n) | O(m + n) for the result | One comparison places one element; at most \`m + n - 1\` comparisons. |
| In-place merge from the back | O(m + n) | O(1) | Three \`int\` indices; writes into the free slots of \`nums1\`. |
| \`std::inplace_merge\` | O(m + n) with a buffer, more without | Uses a buffer if it can get one | Convenient, but not the O(1)-space answer the question asks for. |

For what O(...) means, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One or both vectors empty:** \`{}\` constructs an empty vector; the main loop does not run. Example 1 prints \`[4, 5]\` and \`[]\`.
- **Duplicates:** \`{1, 2, 2}\` and \`{2, 3}\` give \`[1, 2, 2, 2, 3]\`.
- **Negative values:** normal \`int\` comparison.
- **No overlap:** \`{1, 2, 3}\` and \`{10, 20}\` — 3 comparisons, then the rest is copied.
- **In place with \`m = 0\` or \`n = 0\`:** with \`n = 0\`, \`j\` starts at -1 and the loop never runs; Example 2 covers both.

## Common Pitfalls

- **Unsigned indices counting down.** \`size_t i = m - 1\` with \`m = 0\` is already 18446744073709551615, and \`i >= 0\` is always true. Use \`int\` for descending indices.
- **No bounds checks with \`operator[]\`.** A wrong loop condition reads past the end silently (undefined behaviour). Keep the "both have items" condition, or use \`.at()\` while debugging.
- **Not reserving.** \`push_back\` without \`reserve\` may reallocate several times as the vector grows; \`reserve(m + n)\` makes it one allocation.
- **Forgetting the leftovers.** The main loop stops when either side runs out; the tail of the other one must be copied.
- **Passing by value by accident.** \`void mergeInPlace(vector<int> nums1, ...)\` (no \`&\`) merges into a copy and the caller sees nothing change.
- **Assuming \`std::sort\` is stable.** It is not; use \`std::stable_sort\` or a \`<=\` merge when the order of equal elements matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two indices, one per vector: compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b[j]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> the smaller, advance that index, then copy the leftovers. O(m + n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The library:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge(a.begin(), a.end(), b.begin(), b.end(), back_inserter(out))</code> does the same thing; it made exactly 1999 comparisons for 1000 + 1000 values in our run, and it is stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stability:</strong> <span style="color:#f0e2c8;">My loop uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, so equal elements from the first vector come first, matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The in-place version:</strong> <span style="color:#f0e2c8;">With room at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code>, I fill from the back with three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> indices, so nothing unread is overwritten. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ traps:</strong> <span style="color:#f0e2c8;">Descending indices must be signed (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> below 0 wraps to a huge number), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> has no bounds check, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> avoids reallocations.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the indices in the in-place version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They go down to -1. An unsigned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> wraps to 18446744073709551615 instead, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> is always true, so the loop never stops correctly. We printed both values in the Verified section.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::inplace_merge</code> do, and why not just use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It merges two consecutive sorted ranges of one container. It tries to allocate a buffer to run in linear time, so it does not satisfy a strict O(1)-space requirement; the from-the-back loop does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code> stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Equal elements may be reordered. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code> keep equal elements in their original relative order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge k sorted vectors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> of (value, vector index, position) with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code> so it behaves as a min-heap (the default is a max-heap). Pop the smallest, push the next element from the same vector: O(N log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write this with iterators instead of indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and that is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code> is written: two input iterator pairs and one output iterator. It then works for any container with forward iterators, not just vectors.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Two pointers | Two indices that move through the data; each step advances one, so the scan is linear. |
| Merge step | Combining two sorted sequences into one sorted sequence in linear time; the second half of merge sort. |
| Stable merge | Equal items keep their original relative order (items from the first input first). |
| In place | Uses O(1) extra memory beyond the input; the result is written into the input array. |
| Output iterator | Something you write values through one by one, such as \`std::back_inserter(v)\`. |

**Conclusion:** Merging two sorted vectors is a loop over two indices that pushes the smaller front each time and then the leftovers: O(m + n) time, at most \`m + n - 1\` comparisons, stable with \`<=\`, and O(1) extra space in the from-the-back in-place version. In C++, \`std::merge\` is the library equivalent, \`reserve\` avoids reallocations, and any index that counts down must be signed.`,
        examples: [
          {
            label: "Two-pointer merge into a new array (several inputs, including empty ones)",
            code: `// Merge two sorted vectors into a new sorted vector with two pointers.
#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<int> mergeSorted(const vector<int>& a, const vector<int>& b) {
    vector<int> result;
    result.reserve(a.size() + b.size());   // one allocation, no regrowth
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) {                 // <= keeps equal items from a first (stable)
            result.push_back(a[i++]);
        } else {
            result.push_back(b[j++]);
        }
    }
    while (i < a.size()) result.push_back(a[i++]);   // at most one of these loops runs
    while (j < b.size()) result.push_back(b[j++]);
    return result;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) s += ", ";
        s += to_string(xs[i]);
    }
    return s + "]";
}

int main() {
    cout << fmt(mergeSorted({1, 3, 5, 7}, {2, 4, 6})) << "\\n";  // [1, 2, 3, 4, 5, 6, 7]
    cout << fmt(mergeSorted({1, 2, 2}, {2, 3})) << "\\n";        // [1, 2, 2, 2, 3]
    cout << fmt(mergeSorted({}, {4, 5})) << "\\n";               // [4, 5]
    cout << fmt(mergeSorted({}, {})) << "\\n";                   // []
    cout << fmt(mergeSorted({-5, 0, 10}, {-6, 20})) << "\\n";    // [-6, -5, 0, 10, 20]
    cout << fmt(mergeSorted({1, 2, 3}, {10, 20})) << "\\n";      // [1, 2, 3, 10, 20]
    return 0;
}
`,
          },
          {
            label: "In-place merge into nums1 by filling from the back",
            code: `// In-place merge: nums1 has m real values followed by n free slots (zeros),
// nums2 has n values. Fill nums1 from the back so nothing is overwritten.
#include <iostream>
#include <string>
#include <vector>
using namespace std;

void mergeInPlace(vector<int>& nums1, int m, const vector<int>& nums2, int n) {
    int i = m - 1, j = n - 1, write = m + n - 1;   // int, not size_t: these go to -1
    while (j >= 0) {                               // once nums2 is used up, nums1 is already in place
        if (i >= 0 && nums1[i] > nums2[j]) {
            nums1[write--] = nums1[i--];
        } else {
            nums1[write--] = nums2[j--];
        }
    }
}

string runCase(vector<int> nums1, int m, const vector<int>& nums2, int n) {
    mergeInPlace(nums1, m, nums2, n);
    string s = "[";
    for (size_t k = 0; k < nums1.size(); k++) s += (k ? ", " : "") + to_string(nums1[k]);
    return s + "]";
}

int main() {
    cout << runCase({1, 2, 3, 0, 0, 0}, 3, {2, 5, 6}, 3) << "\\n";  // [1, 2, 2, 3, 5, 6]
    cout << runCase({4, 5, 6, 0, 0, 0}, 3, {1, 2, 3}, 3) << "\\n";  // [1, 2, 3, 4, 5, 6]
    cout << runCase({1}, 1, {}, 0) << "\\n";                        // [1]
    cout << runCase({0}, 0, {1}, 1) << "\\n";                       // [1]
    cout << runCase({2, 2, 0, 0}, 2, {2, 2}, 2) << "\\n";           // [2, 2, 2, 2]
    return 0;
}
`,
          },
          {
            label: "Stability (<= vs <) and counting comparisons",
            code: `// Two things the two-pointer merge guarantees: stability (with <=) and at most
// a.size() + b.size() - 1 comparisons.
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Item = pair<int, string>;

vector<Item> mergeByKey(const vector<Item>& a, const vector<Item>& b, bool stable, int& comparisons) {
    vector<Item> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    comparisons = 0;
    while (i < a.size() && j < b.size()) {
        comparisons++;
        bool takeA = stable ? a[i].first <= b[j].first : a[i].first < b[j].first;
        out.push_back(takeA ? a[i++] : b[j++]);
    }
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}

string names(const vector<Item>& xs) {
    string s;
    for (const auto& it : xs) s += (s.empty() ? "" : " ") + it.second;
    return s;
}

vector<Item> range(int start, int stop, int step) {
    vector<Item> xs;
    for (int x = start; x < stop; x += step) xs.push_back({x, ""});
    return xs;
}

int main() {
    vector<Item> a = {{1, "a1"}, {3, "a2"}, {5, "a3"}};
    vector<Item> b = {{3, "b1"}, {5, "b2"}, {6, "b3"}};
    int c = 0;
    cout << "with <= : " << names(mergeByKey(a, b, true, c)) << "\\n";
    cout << "with <  : " << names(mergeByKey(a, b, false, c)) << "\\n";

    mergeByKey(range(0, 2000, 2), range(1, 2000, 2), true, c);
    cout << "interleaved 1000 + 1000 comparisons: " << c << "\\n";
    mergeByKey(range(0, 1000, 1), range(1000, 2000, 1), true, c);
    cout << "disjoint    1000 + 1000 comparisons: " << c << "\\n";
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you rotate an array by k positions?",
    difficulty: "medium",
    seoDescription: "Rotate an array right by k in O(n) time and O(1) space with three reversals, plus k % n, negative k and left rotation, in Python, JS, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a Python list \`nums\` and a non-negative integer \`k\`, rotate the list to the right by \`k\` steps, in place. For example \`[1, 2, 3, 4, 5, 6, 7]\` with \`k = 3\` becomes \`[5, 6, 7, 1, 2, 3, 4]\`. Can you do it with O(1) extra space?"

**What a strong answer should cover:**
- Reduce \`k %= n\` first (k can exceed n) and guard the empty list.
- The brute force (rotate by one, k times, O(n·k)) and the extra-array version (O(n) space), then the three-reversal algorithm: O(n) time, O(1) space.
- Why the reversals work: \`A B\` → \`rev(B) rev(A)\` → \`B A\`.
- Optionally cyclic replacements, and why they may need \`gcd(n, k)\` separate cycles.
- Python specifics: \`nums[:] = nums[-k:] + nums[:-k]\` mutates the caller's list but uses O(n) extra space, plain \`nums = ...\` only rebinds a local name, \`collections.deque.rotate(k)\` exists, and Python's \`%\` is never negative for a positive n.

**Clarifying questions expected:**
- "Right or left rotation, and can k be larger than n or negative?"
- "Must it be in place, or may I return a new list?"

**Code / implementation expected:** Yes — a Python function that rotates \`nums\` in place with three reversals.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Python lists, loops and the \`%\` operator.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`python3\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Seven friends sit around a round table, each in a numbered chair. The host says: "everybody move three chairs to the right." Nobody leaves the table and nobody new arrives; everyone just ends up three seats further on, and the three people at the "end" wrap around to the first chairs.

That is exactly what rotating an array does. The array is a row of chairs, and "rotate right by k" means every value moves k positions to the right, with the last k values wrapping round to the front. Two things fall out of the story straight away:

- Moving everyone 7 chairs at a 7-seat table changes nothing, so rotating by k is the same as rotating by **k mod n**.
- You could ask people to move one chair at a time, three times over (slow), or tell each person their final chair directly (fast).

Rotation shows up in circular buffers, in "shift the schedule by k days", and as a building block for [searching a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array). Interviewers like it because the naive answer is easy, and the O(1)-extra-space answer needs one genuinely clever idea.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Rotate to the right or to the left? | The classic LeetCode 189 is to the right. Left by k is the same as right by n - k. |
| In place, or may I return a new array? | Returning a new array is a one-liner; in place with O(1) extra space is the interesting version. |
| Can k be larger than n, zero, or negative? | k larger than n needs \`k % n\`; negative k needs a modulo that works for negatives. |
| Can the array be empty? | \`k % 0\` is a division by zero; guard \`n == 0\` first. |
| How large are n and k? | k up to 10^9 makes the "rotate one step k times" brute force hopeless. |

## 3. The Core Idea

📌 **Interview term: Rotation (right by k)** — every element moves from index \`i\` to index \`(i + k) % n\`; the last k elements wrap around to the front. \`[1, 2, 3, 4, 5, 6, 7]\` rotated right by 3 is \`[5, 6, 7, 1, 2, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Right rotation by 3 of 1 to 7. The last three items 5 6 7 move to the front and the first four items 1 2 3 4 shift right, giving 5 6 7 1 2 3 4">
  <defs>
    <marker id="b09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="291" y="36" text-anchor="middle">A: first n - k items</text>
  <text class="d-sub" x="515" y="36" text-anchor="middle">B: last k items</text>
  <text class="d-text" x="16" y="76">before</text>
  <rect class="d-box-muted" x="170" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="76" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="234" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="76" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="298" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="362" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="76" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="76" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="76" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="554" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="76" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="216">after</text>
  <rect class="d-box-accent" x="170" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="216" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="216" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="216" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="362" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="216" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="426" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="216" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="490" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="216" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="554" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 515 98 L 262 182" marker-end="url(#b09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 291 98 L 480 182" marker-end="url(#b09q2-arrow)"/>
</svg>

Look at the result as two blocks. Call the first \`n - k\` items **A** and the last \`k\` items **B**. The array is \`A B\`, and the rotated array is \`B A\`: the blocks swap places, while the order *inside* each block stays the same.

📌 **Interview term: Modular arithmetic (k mod n)** — after n steps every item is back where it started, so only the remainder \`k % n\` matters. Always reduce k first; it also handles k larger than n.

### Four approaches, from slow to clever

1. **Brute force — rotate by one, k times.** Save the last item, shift everything else one place right, put the saved item at index 0; repeat k times. O(n·k) time, O(1) space. With n = 1000 and k = 999 that is 999,000 writes (Example 2 counts them).
2. **Extra array.** Write each \`nums[i]\` into \`tmp[(i + k) % n]\`, then copy \`tmp\` back. O(n) time but O(n) extra space.
3. **Three reversals.** O(n) time, O(1) space. The trick below.
4. **Cyclic replacements.** Pick up \`nums[0]\`, put it at its final index \`k\`, pick up what was there, put it at \`2k\`, and so on, until you come back to the start; then start a new cycle at index 1 if needed. Every element is written exactly once, O(1) space, but the loop is easy to get wrong.

### Why three reversals work

Reversing a block reverses the order inside it. Reverse the whole array \`A B\` and you get \`rev(B) rev(A)\`: the blocks are now in the right places (B first), but each one is backwards. Reverse each block again and the inside order is restored: \`B A\`. Done, using only swaps.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Three reversals for k equals 3. Start 1 to 7. Reverse all gives 7 6 5 4 3 2 1. Reverse the first 3 gives 5 6 7 4 3 2 1. Reverse the rest gives 5 6 7 1 2 3 4">
  <text class="d-text" x="16" y="56">start</text>
  <rect class="d-box" x="170" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="56" text-anchor="middle">1</text>
  <rect class="d-box" x="234" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="56" text-anchor="middle">2</text>
  <rect class="d-box" x="298" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="56" text-anchor="middle">3</text>
  <rect class="d-box" x="362" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="56" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="56" text-anchor="middle">6</text>
  <rect class="d-box" x="554" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="126">reverse all</text>
  <rect class="d-box-accent" x="170" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="126" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="234" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="126" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="126" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="362" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="126" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="126" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="490" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="554" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="126" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="196">reverse first k</text>
  <rect class="d-box-accent" x="170" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="196" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="196" text-anchor="middle">7</text>
  <rect class="d-box" x="362" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="196" text-anchor="middle">3</text>
  <rect class="d-box" x="490" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="554" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="266">reverse the rest</text>
  <rect class="d-box" x="170" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="266" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="266" text-anchor="middle">6</text>
  <rect class="d-box" x="298" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="266" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="362" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="266" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="426" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="266" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="490" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="266" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="554" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="266" text-anchor="middle">4</text>
</svg>

The highlighted boxes are the part reversed in that step. Reversing the first k items turns \`7 6 5\` back into \`5 6 7\`; reversing the remaining \`n - k\` items turns \`4 3 2 1\` back into \`1 2 3 4\`.

📌 **Interview term: Reversal algorithm** — rotating an array by reversing all of it, then reversing the first k and the last n - k elements. About n swaps in total, O(1) extra space.

📌 **Interview term: In place** — the algorithm changes the input array directly and uses only O(1) extra memory (a few variables), no second array.

### Why cyclic replacements need several starts

Following \`i → (i + k) % n\` from index 0 visits only every \`gcd(n, k)\`-th index before it returns to 0. With n = 6 and k = 4 (gcd 2) the cycle from 0 is 0 → 4 → 2 → 0, which misses the odd indices, so a second cycle has to start at index 1. The code counts how many items it has moved and stops at n, which handles this without computing the gcd.

## 4. The Pythonic One-Liners (and Their Traps)

Python makes the "extra array" approach a one-liner with slicing, and the standard library even has a rotating container. We ran these:

~~~python
from collections import deque

print("-1 % 7 =", -1 % 7)

nums = [1, 2, 3, 4, 5, 6, 7]
k = 3
print("slicing, k=3:     ", nums[-k:] + nums[:-k])
k = 10                                   # forgot k %= n
print("slicing, k=10:    ", nums[-k:] + nums[:-k])
k = 10 % len(nums)
print("slicing, k=10 % n:", nums[-k:] + nums[:-k])

d = deque([1, 2, 3, 4, 5, 6, 7])
d.rotate(3)                              # positive = to the right
print("deque.rotate(3):  ", list(d))
d.rotate(-3)                             # negative = to the left
print("deque.rotate(-3): ", list(d))

def rotate_rebind(nums, k):
    nums = nums[-k:] + nums[:-k]         # rebinds the local name only

def rotate_slice_assign(nums, k):
    nums[:] = nums[-k:] + nums[:-k]      # replaces the contents of the caller's list

a = [1, 2, 3, 4, 5, 6, 7]
rotate_rebind(a, 3)
print("after nums = ...:   ", a)
rotate_slice_assign(a, 3)
print("after nums[:] = ...:", a)
~~~

~~~text
-1 % 7 = 6
slicing, k=3:      [5, 6, 7, 1, 2, 3, 4]
slicing, k=10:     [1, 2, 3, 4, 5, 6, 7]
slicing, k=10 % n: [5, 6, 7, 1, 2, 3, 4]
deque.rotate(3):   [5, 6, 7, 1, 2, 3, 4]
deque.rotate(-3):  [1, 2, 3, 4, 5, 6, 7]
after nums = ...:    [1, 2, 3, 4, 5, 6, 7]
after nums[:] = ...: [5, 6, 7, 1, 2, 3, 4]
~~~

What this shows:

- **Python's \`%\` is never negative** when the divisor is positive: \`-1 % 7\` is \`6\`. That is different from JavaScript, Java and C++, and it means \`k % n\` already turns a negative k into the equivalent right rotation.
- **Slicing without \`k %= n\` is silently wrong.** With \`k = 10\` on 7 items, \`nums[-10:]\` is the whole list and \`nums[:-10]\` is empty, so the "rotation" returns the list unchanged instead of rotating by 3. No error, just a wrong answer.
- **\`collections.deque.rotate(k)\`** rotates right for positive k and left for negative k. If the data structure is yours to choose, a deque is the natural fit for repeated rotations.
- **Rebinding vs mutating.** \`nums = nums[-k:] + nums[:-k]\` inside a function creates a new list and points the local name at it; the caller sees nothing change. \`nums[:] = ...\` replaces the contents of the original list object, which is what "in place" requires from the caller's point of view. But note that the right-hand side still builds a new list, so it uses O(n) extra memory: it is in place for the caller, not O(1) space.

📌 **Interview term: Slice assignment** — \`nums[:] = other\` replaces every element of the existing list object with the elements of \`other\`, instead of making the name \`nums\` point at a new list.

## 5. The O(1)-Space Answer in Python

~~~python
def reverse(nums, lo, hi):
    while lo < hi:
        nums[lo], nums[hi] = nums[hi], nums[lo]
        lo += 1
        hi -= 1


def rotate(nums, k):
    n = len(nums)
    if n == 0:
        return                     # avoid k % 0
    k %= n                         # rotating by n is a full circle
    reverse(nums, 0, n - 1)        # 1. reverse everything
    reverse(nums, 0, k - 1)        # 2. reverse the first k
    reverse(nums, k, n - 1)        # 3. reverse the rest
~~~

Walk-through:

- \`if n == 0: return\` comes first, because \`k %= 0\` raises \`ZeroDivisionError\`.
- \`k %= n\` handles k larger than n (rotating 7 items by 10 is the same as by 3), and k equal to n becomes 0.
- \`nums[lo], nums[hi] = nums[hi], nums[lo]\` is Python's tuple swap: the right side is evaluated first into a tuple, then unpacked, so no temporary variable is needed.
- When \`k == 0\`, the second call is \`reverse(nums, 0, -1)\`. Its loop condition \`lo < hi\` is \`0 < -1\`, false, so it does nothing; Python's negative indexing never comes into play because the loop never reads \`nums[-1]\`.
- The function returns \`None\`, the Python convention for "I mutated my argument", just like \`list.reverse()\` and \`list.sort()\`.

You could also use \`nums[lo:hi + 1] = reversed(nums[lo:hi + 1])\` or \`nums.reverse()\` for the full reversal, but each slice makes a copy, so they are not O(1) extra space.

The cyclic-replacement version, for completeness:

~~~python
def cyclic(nums, k):               # follow each cycle of moves: every item written once
    global writes
    n = len(nums)
    k %= n
    moved, start = 0, 0
    while moved < n:
        current, value = start, nums[start]
        while True:
            nxt = (current + k) % n
            nums[nxt], value = value, nums[nxt]
            writes += 1
            moved += 1
            current = nxt
            if current == start:
                break
        start += 1
~~~

\`nums[nxt], value = value, nums[nxt]\` writes the carried value into its final slot and picks up the value that was there, in one tuple swap.

## 6. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3 main.py\`.

**Example 1 — three reversals on several inputs (k > n, k = 0, k = n, one item, empty list):**

~~~text
[5, 6, 7, 1, 2, 3, 4]
[3, 99, -1, -100]
[2, 1]
[1, 2, 3]
[1, 2, 3]
[42]
[]
~~~

**Example 2 — the four approaches on the same inputs, counting every write into the list:**

~~~text
n=10 k=3 brute force      30 writes, same
n=10 k=3 extra array      20 writes, same
n=10 k=3 reversal         18 writes, same
n=10 k=3 cyclic           10 writes, same
  first five after rotating: [7, 8, 9, 0, 1]
n=6 k=4 brute force      24 writes, same
n=6 k=4 extra array      12 writes, same
n=6 k=4 reversal         12 writes, same
n=6 k=4 cyclic            6 writes, same
  first five after rotating: [2, 3, 4, 5, 0]
n=1000 k=999 brute force  999000 writes, same
n=1000 k=999 extra array    2000 writes, same
n=1000 k=999 reversal       1998 writes, same
n=1000 k=999 cyclic         1000 writes, same
  first five after rotating: [1, 2, 3, 4, 5]
~~~

All four approaches agree ("same"). The counts make the costs concrete: for n = 1000, k = 999 the brute force does 999,000 writes, the extra array 2,000 (n into the temporary list, n back), the reversals 1,998 (two writes per swap, about n swaps), and cyclic replacements exactly 1,000, one per element. For n = 6, k = 4 the cyclic version needed two cycles (gcd(6, 4) = 2) and still wrote each element once.

**Example 3 — left rotation and negative k:**

~~~python
def normalise(k, n):
    return ((k % n) + n) % n       # in Python k % n is already >= 0; this form works in every language


def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k = normalise(k, n)
    reverse(nums, 0, n - 1)
    reverse(nums, 0, k - 1)
    reverse(nums, k, n - 1)
    return nums


def rotate_left(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    return rotate_right(nums, n - normalise(k, n))   # left by k == right by n - k
~~~

~~~text
6
4
3
[2, 3, 4, 5, 6, 7, 1]
[3, 4, 5, 6, 7, 1, 2]
[3, 4, 5, 6, 7, 1, 2]
[4, 5, 6, 7, 1, 2, 3]
[]
~~~

\`((k % n) + n) % n\` is more than Python needs (here \`k % n\` alone is already non-negative), but writing it this way makes the code safe to port to the other languages. A left rotation by k is a right rotation by \`n - k\`.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rotate by one, k times | O(n·k) | O(1) | Each of the k passes shifts n - 1 elements. |
| Extra list / slicing | O(n) | O(n) | Builds a second list of n items. |
| \`deque(nums)\` + \`rotate(k)\` | O(n) to build the deque | O(n) | Building the deque copies the list; only worth it if you keep working with the deque. |
| Three reversals | O(n) | O(1) | About n swaps in total, a few integer variables. |
| Cyclic replacements | O(n) | O(1) | Every element is written exactly once. |

For background on these notations see [Big-O notation](/interview-question/what-is-big-o-notation) and [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Edge Cases

- **Empty list:** return before \`k %= n\` (Example 1 prints \`[]\`).
- **k = 0 and k = n:** both reduce to 0, nothing moves.
- **k > n:** \`[1, 2]\` with k = 5 is rotation by 1: \`[2, 1]\`.
- **One element:** any k gives the same list.
- **Negative k:** in Python, \`-1 % 7 == 6\`, so a right rotation by -1 is correctly a left rotation by 1.
- **Very large k (10^9):** \`%\` makes it free; only the brute force would care.

## Common Pitfalls

- **Forgetting \`k %= n\`.** With slicing it silently returns the wrong list; with the reversal it reverses out-of-range indices.
- **Rebinding instead of mutating.** \`nums = nums[-k:] + nums[:-k]\` inside the function leaves the caller's list unchanged; use \`nums[:] = ...\` (or the reversal).
- **Calling slicing "O(1) space".** \`nums[:] = ...\` and \`reversed(nums[a:b])\` copy; only the index-based swap loop is truly O(1) extra space.
- **Dividing by zero on an empty list.** \`k % 0\` raises \`ZeroDivisionError\`; check \`n == 0\` first.
- **Off-by-one in the second reversal.** It is \`reverse(0, k - 1)\` and \`reverse(k, n - 1)\`, inclusive ends. Swapping the two calls' boundaries gives a wrong rotation that still "looks" rotated.
- **Using \`list.insert(0, x)\` / \`pop()\` in a loop.** \`insert(0, ...)\` is O(n), so k of them is the O(n·k) brute force in disguise.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Reduce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code>, then reverse the whole list, reverse the first k items, and reverse the rest. O(n) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">The list is two blocks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A B</code> and the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B A</code>; reversing everything gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rev(B) rev(A)</code>, and reversing each block restores their inside order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The baselines:</strong> <span style="color:#f0e2c8;">Rotating one step k times is O(n·k); writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i + k) % n</code> in a new list is O(n) time but O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The Python idioms:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[:] = nums[-k:] + nums[:-k]</code> is the readable version but copies the list; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.rotate(k)</code> exists; tuple swaps need no temp variable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;">Guard the empty list before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k % n</code>, never skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code> with slicing (k = 10 on 7 items silently does nothing), and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums = ...</code> does not change the caller's list.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rotate to the left instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Left by k is right by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k % n</code>. Or swap the order of the reversals: reverse the first k, reverse the rest, then reverse everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Python do with a negative k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> takes the sign of the divisor, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1 % 7</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code> already turns "right by -1" into "right by 6", which is left by 1. In Java, JavaScript or C++ I would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((k % n) + n) % n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with each element written only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, cyclic replacements: carry <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[start]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(start + k) % n</code>, pick up the value there, and keep going until the cycle returns to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>. There are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(n, k)</code> cycles, so I count moved elements and stop at n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[:] = nums[-k:] + nums[:-k]</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct and Pythonic, and it mutates the caller's list, so I would mention it. But the right-hand side builds two slices and a new list, so it is O(n) extra space; the reversal is the O(1)-space answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does rotation show up in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Circular buffers and round-robin scheduling, where a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotate</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxlen</code> is usually the right tool, and in problems like searching a rotated sorted array.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation (right by k) | Each element moves from index i to (i + k) % n; the last k wrap to the front. |
| Modular arithmetic (k mod n) | Only the remainder of k divided by n matters, because n steps is a full circle. |
| Reversal algorithm | Reverse all, then the first k, then the last n - k: rotation with O(1) extra space. |
| In place | Changing the input directly, using only O(1) extra memory. |
| Slice assignment | \`nums[:] = other\` replaces the contents of the existing list object. |

**Conclusion:** Rotating by k means the last k items move to the front, which is the block swap \`A B\` → \`B A\`. Reduce k with \`k %= n\`, then three reversals do it in O(n) time and O(1) extra space. In Python, know the readable slicing version and its cost, the \`deque.rotate\` alternative, the difference between \`nums = ...\` and \`nums[:] = ...\`, and that Python's \`%\` is never negative for a positive n.`,
        examples: [
          {
            label: "Rotate right by k with three reversals (k > n, k = 0, empty array)",
            code: `# Rotate a list to the right by k positions, in place, with three reversals.
def reverse(nums, lo, hi):
    while lo < hi:
        nums[lo], nums[hi] = nums[hi], nums[lo]
        lo += 1
        hi -= 1

def rotate(nums, k):
    n = len(nums)
    if n == 0:
        return                     # avoid k % 0
    k %= n                         # rotating by n is a full circle
    reverse(nums, 0, n - 1)        # 1. reverse everything
    reverse(nums, 0, k - 1)        # 2. reverse the first k
    reverse(nums, k, n - 1)        # 3. reverse the rest

def run_case(nums, k):
    rotate(nums, k)
    return "[" + ", ".join(str(x) for x in nums) + "]"

print(run_case([1, 2, 3, 4, 5, 6, 7], 3))  # [5, 6, 7, 1, 2, 3, 4]
print(run_case([-1, -100, 3, 99], 2))  # [3, 99, -1, -100]
print(run_case([1, 2], 5))  # [2, 1]
print(run_case([1, 2, 3], 0))  # [1, 2, 3]
print(run_case([1, 2, 3], 3))  # [1, 2, 3]
print(run_case([42], 100))  # [42]
print(run_case([], 3))  # []
`,
          },
          {
            label: "Brute force vs extra array vs reversal vs cyclic replacements, counting writes",
            code: `# Four ways to rotate right by k, with a count of array writes for each.
writes = 0

def brute_force(nums, k):          # rotate by one, k times: O(n * k)
    global writes
    n = len(nums)
    for _ in range(k % n):
        last = nums[n - 1]
        for i in range(n - 1, 0, -1):
            nums[i] = nums[i - 1]
            writes += 1
        nums[0] = last
        writes += 1

def extra_array(nums, k):          # copy each item to (i + k) % n: O(n) time, O(n) space
    global writes
    n = len(nums)
    tmp = [0] * n
    for i in range(n):
        tmp[(i + k) % n] = nums[i]
        writes += 1
    for i in range(n):
        nums[i] = tmp[i]
        writes += 1

def reversal(nums, k):             # three reversals: O(n) time, O(1) space
    global writes
    n = len(nums)
    k %= n
    for lo, hi in ((0, n - 1), (0, k - 1), (k, n - 1)):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            writes += 2
            lo += 1
            hi -= 1

def cyclic(nums, k):               # follow each cycle of moves: every item written once
    global writes
    n = len(nums)
    k %= n
    moved, start = 0, 0
    while moved < n:
        current, value = start, nums[start]
        while True:
            nxt = (current + k) % n
            nums[nxt], value = value, nums[nxt]
            writes += 1
            moved += 1
            current = nxt
            if current == start:
                break
        start += 1

for n, k in ((10, 3), (6, 4), (1000, 999)):
    expected = None
    for name, fn in (("brute force", brute_force), ("extra array", extra_array),
                     ("reversal", reversal), ("cyclic", cyclic)):
        nums = list(range(n))
        writes = 0
        fn(nums, k)
        if expected is None:
            expected = nums
        same = "same" if nums == expected else "DIFFERENT"
        print("n=" + str(n) + " k=" + str(k) + " " + name.ljust(12) + str(writes).rjust(7) + " writes, " + same)
    print("  first five after rotating: " + str(expected[:5]))
`,
          },
          {
            label: "Left rotation and negative k by normalising k",
            code: `# Left rotation and negative k: normalise k once, then reuse the right rotation.
def reverse(nums, lo, hi):
    while lo < hi:
        nums[lo], nums[hi] = nums[hi], nums[lo]
        lo += 1
        hi -= 1

def normalise(k, n):
    return ((k % n) + n) % n       # in Python k % n is already >= 0; this form works in every language

def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k = normalise(k, n)
    reverse(nums, 0, n - 1)
    reverse(nums, 0, k - 1)
    reverse(nums, k, n - 1)
    return nums

def rotate_left(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    return rotate_right(nums, n - normalise(k, n))   # left by k == right by n - k

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

print(normalise(-1, 7))  # 6
print(normalise(-10, 7))  # 4
print(normalise(10, 7))  # 3
print(fmt(rotate_right([1, 2, 3, 4, 5, 6, 7], -1)))  # [2, 3, 4, 5, 6, 7, 1]
print(fmt(rotate_left([1, 2, 3, 4, 5, 6, 7], 2)))  # [3, 4, 5, 6, 7, 1, 2]
print(fmt(rotate_left([1, 2, 3, 4, 5, 6, 7], 9)))  # [3, 4, 5, 6, 7, 1, 2]
print(fmt(rotate_right([1, 2, 3, 4, 5, 6, 7], -10)))  # [4, 5, 6, 7, 1, 2, 3]
print(fmt(rotate_left([], 4)))  # []
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a JavaScript array \`nums\` and a non-negative integer \`k\`, rotate the array to the right by \`k\` steps, in place. \`[1, 2, 3, 4, 5, 6, 7]\` with \`k = 3\` becomes \`[5, 6, 7, 1, 2, 3, 4]\`. Can you do it with O(1) extra space?"

**What a strong answer should cover:**
- Reduce \`k %= n\` first and guard the empty array (in JS \`k % 0\` is \`NaN\`, not an error).
- Brute force (rotate by one, k times, O(n·k)) and the extra-array version, then three reversals: O(n) time, O(1) space.
- Why the reversals work: \`A B\` → \`rev(B) rev(A)\` → \`B A\`.
- Optionally cyclic replacements and the \`gcd(n, k)\` cycles.
- JavaScript specifics: \`%\` keeps the sign of the left operand (\`-1 % 7\` is \`-1\`), \`nums.unshift(...nums.splice(-k))\` works for small arrays but spreading a huge array throws a \`RangeError\`, and \`Array.prototype.reverse()\` reverses the whole array only.

**Clarifying questions expected:**
- "Right or left, and can k be larger than n or negative?"
- "In place, or may I return a new array?"

**Code / implementation expected:** Yes — a JavaScript function that rotates \`nums\` in place with three reversals.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need JavaScript arrays, loops and the \`%\` operator.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`node\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Seven friends sit around a round table, each in a numbered chair. The host says: "everybody move three chairs to the right." Nobody leaves the table and nobody new arrives; everyone just ends up three seats further on, and the three people at the "end" wrap around to the first chairs.

That is exactly what rotating an array does. The array is a row of chairs, and "rotate right by k" means every value moves k positions to the right, with the last k values wrapping round to the front. Two things fall out of the story straight away:

- Moving everyone 7 chairs at a 7-seat table changes nothing, so rotating by k is the same as rotating by **k mod n**.
- You could ask people to move one chair at a time, three times over (slow), or tell each person their final chair directly (fast).

Rotation shows up in circular buffers, in "shift the schedule by k days", and as a building block for [searching a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array). Interviewers like it because the naive answer is easy, and the O(1)-extra-space answer needs one genuinely clever idea.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Rotate to the right or to the left? | The classic LeetCode 189 is to the right. Left by k is the same as right by n - k. |
| In place, or may I return a new array? | Returning a new array is a one-liner; in place with O(1) extra space is the interesting version. |
| Can k be larger than n, zero, or negative? | k larger than n needs \`k % n\`; negative k needs a modulo that works for negatives. |
| Can the array be empty? | \`k % 0\` is a division by zero; guard \`n == 0\` first. |
| How large are n and k? | k up to 10^9 makes the "rotate one step k times" brute force hopeless. |

## 3. The Core Idea

📌 **Interview term: Rotation (right by k)** — every element moves from index \`i\` to index \`(i + k) % n\`; the last k elements wrap around to the front. \`[1, 2, 3, 4, 5, 6, 7]\` rotated right by 3 is \`[5, 6, 7, 1, 2, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Right rotation by 3 of 1 to 7. The last three items 5 6 7 move to the front and the first four items 1 2 3 4 shift right, giving 5 6 7 1 2 3 4">
  <defs>
    <marker id="b09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="291" y="36" text-anchor="middle">A: first n - k items</text>
  <text class="d-sub" x="515" y="36" text-anchor="middle">B: last k items</text>
  <text class="d-text" x="16" y="76">before</text>
  <rect class="d-box-muted" x="170" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="76" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="234" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="76" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="298" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="362" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="76" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="76" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="76" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="554" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="76" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="216">after</text>
  <rect class="d-box-accent" x="170" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="216" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="216" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="216" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="362" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="216" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="426" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="216" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="490" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="216" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="554" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 515 98 L 262 182" marker-end="url(#b09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 291 98 L 480 182" marker-end="url(#b09q2-arrow)"/>
</svg>

Look at the result as two blocks. Call the first \`n - k\` items **A** and the last \`k\` items **B**. The array is \`A B\`, and the rotated array is \`B A\`: the blocks swap places, while the order *inside* each block stays the same.

📌 **Interview term: Modular arithmetic (k mod n)** — after n steps every item is back where it started, so only the remainder \`k % n\` matters. Always reduce k first; it also handles k larger than n.

### Four approaches, from slow to clever

1. **Brute force — rotate by one, k times.** Save the last item, shift everything else one place right, put the saved item at index 0; repeat k times. O(n·k) time, O(1) space. With n = 1000 and k = 999 that is 999,000 writes (Example 2 counts them).
2. **Extra array.** Write each \`nums[i]\` into \`tmp[(i + k) % n]\`, then copy \`tmp\` back. O(n) time but O(n) extra space.
3. **Three reversals.** O(n) time, O(1) space. The trick below.
4. **Cyclic replacements.** Pick up \`nums[0]\`, put it at its final index \`k\`, pick up what was there, put it at \`2k\`, and so on, until you come back to the start; then start a new cycle at index 1 if needed. Every element is written exactly once, O(1) space, but the loop is easy to get wrong.

### Why three reversals work

Reversing a block reverses the order inside it. Reverse the whole array \`A B\` and you get \`rev(B) rev(A)\`: the blocks are now in the right places (B first), but each one is backwards. Reverse each block again and the inside order is restored: \`B A\`. Done, using only swaps.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Three reversals for k equals 3. Start 1 to 7. Reverse all gives 7 6 5 4 3 2 1. Reverse the first 3 gives 5 6 7 4 3 2 1. Reverse the rest gives 5 6 7 1 2 3 4">
  <text class="d-text" x="16" y="56">start</text>
  <rect class="d-box" x="170" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="56" text-anchor="middle">1</text>
  <rect class="d-box" x="234" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="56" text-anchor="middle">2</text>
  <rect class="d-box" x="298" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="56" text-anchor="middle">3</text>
  <rect class="d-box" x="362" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="56" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="56" text-anchor="middle">6</text>
  <rect class="d-box" x="554" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="126">reverse all</text>
  <rect class="d-box-accent" x="170" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="126" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="234" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="126" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="126" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="362" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="126" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="126" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="490" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="554" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="126" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="196">reverse first k</text>
  <rect class="d-box-accent" x="170" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="196" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="196" text-anchor="middle">7</text>
  <rect class="d-box" x="362" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="196" text-anchor="middle">3</text>
  <rect class="d-box" x="490" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="554" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="266">reverse the rest</text>
  <rect class="d-box" x="170" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="266" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="266" text-anchor="middle">6</text>
  <rect class="d-box" x="298" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="266" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="362" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="266" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="426" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="266" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="490" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="266" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="554" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="266" text-anchor="middle">4</text>
</svg>

The highlighted boxes are the part reversed in that step. Reversing the first k items turns \`7 6 5\` back into \`5 6 7\`; reversing the remaining \`n - k\` items turns \`4 3 2 1\` back into \`1 2 3 4\`.

📌 **Interview term: Reversal algorithm** — rotating an array by reversing all of it, then reversing the first k and the last n - k elements. About n swaps in total, O(1) extra space.

📌 **Interview term: In place** — the algorithm changes the input array directly and uses only O(1) extra memory (a few variables), no second array.

### Why cyclic replacements need several starts

Following \`i → (i + k) % n\` from index 0 visits only every \`gcd(n, k)\`-th index before it returns to 0. With n = 6 and k = 4 (gcd 2) the cycle from 0 is 0 → 4 → 2 → 0, which misses the odd indices, so a second cycle has to start at index 1. The code counts how many items it has moved and stops at n, which handles this without computing the gcd.

## 4. The Built-In Shortcut (and Why It Is Not the Answer)

JavaScript has no \`rotate\` method, but \`splice\` and \`unshift\` can fake one. We ran this, together with two \`%\` facts that matter for rotation:

~~~javascript
console.log('-1 % 7 = ' + (-1 % 7));
console.log('5 % 0 = ' + (5 % 0));

const a = [1, 2, 3, 4, 5, 6, 7];
a.unshift(...a.splice(-3));              // remove the last 3, put them at the front
console.log('splice + unshift, k=3: [' + a.join(', ') + ']');

const b = [1, 2, 3, 4, 5, 6, 7];
b.unshift(...b.splice(-0));              // k = 0: splice(-0) is splice(0), which takes everything
console.log('splice + unshift, k=0: [' + b.join(', ') + ']');

const big = Array.from({ length: 1000000 }, (_, i) => i);
try {
  big.unshift(...big.splice(-500000));
  console.log('spread of 500000 items worked');
} catch (e) {
  console.log('spread of 500000 items threw ' + e.name + ': ' + e.message);
}
~~~

~~~text
-1 % 7 = -1
5 % 0 = NaN
splice + unshift, k=3: [5, 6, 7, 1, 2, 3, 4]
splice + unshift, k=0: [1, 2, 3, 4, 5, 6, 7]
spread of 500000 items threw RangeError: Maximum call stack size exceeded
~~~

What this shows:

- **\`%\` in JavaScript keeps the sign of the left operand:** \`-1 % 7\` is \`-1\`, not \`6\`. For a negative k you need \`((k % n) + n) % n\` (Example 3).
- **\`k % 0\` is \`NaN\`**, not an exception. If you forget the empty-array guard, \`NaN\` flows into your index arithmetic and loops quietly do nothing.
- **\`nums.unshift(...nums.splice(-k))\`** removes the last k items and puts them back at the front. It is correct for small inputs (even k = 0 happens to work: \`splice(-0)\` is \`splice(0)\`, which takes everything, and \`unshift\` puts it all back). But it copies k elements and shifts the rest, so it is O(n) extra work and memory, and **spread syntax passes every element as a separate function argument**: with 500,000 items Node threw \`RangeError: Maximum call stack size exceeded\`.

📌 **Interview term: Spread arguments** — \`f(...arr)\` calls \`f\` with each element of \`arr\` as its own argument. Engines limit how many arguments a call can take, so spreading a very large array can throw.

## 5. The O(1)-Space Answer in JavaScript

~~~javascript
function reverse(nums, lo, hi) {
  while (lo < hi) {
    const t = nums[lo];
    nums[lo] = nums[hi];
    nums[hi] = t;
    lo++;
    hi--;
  }
}

function rotate(nums, k) {
  const n = nums.length;
  if (n === 0) return;             // k % 0 would be NaN
  k %= n;                          // rotating by n is a full circle
  reverse(nums, 0, n - 1);         // 1. reverse everything
  reverse(nums, 0, k - 1);         // 2. reverse the first k
  reverse(nums, k, n - 1);         // 3. reverse the rest
}
~~~

Walk-through:

- \`if (n === 0) return;\` comes first, because \`k % 0\` would be \`NaN\`.
- \`k %= n\` handles k larger than n, and k equal to n becomes 0.
- The swap uses a temporary \`t\`. Destructuring \`[nums[lo], nums[hi]] = [nums[hi], nums[lo]]\` also works and reads nicely, but it creates a small temporary array on each swap; in a hot loop the three-line swap is the safer choice.
- With \`k === 0\` the second call is \`reverse(nums, 0, -1)\`; the loop condition \`0 < -1\` is false, so it does nothing.
- \`Array.prototype.reverse()\` cannot help with steps 2 and 3, because it always reverses the whole array. That is why we write a \`reverse(nums, lo, hi)\` helper.

The cyclic-replacement version:

~~~javascript
function cyclic(nums, k) {         // follow each cycle of moves: every item written once
  const n = nums.length;
  k %= n;
  let moved = 0;
  for (let start = 0; moved < n; start++) {
    let current = start, value = nums[start];
    do {
      const next = (current + k) % n;
      const t = nums[next]; nums[next] = value; value = t;
      writes++;
      moved++;
      current = next;
    } while (current !== start);
  }
}
~~~

The \`do ... while\` loop is a natural fit: each cycle must make at least one move before checking whether it is back at \`start\`.

## 6. Verified: Running the Code

Each example was saved as \`main.js\` and run with \`node main.js\`.

**Example 1 — three reversals on several inputs (k > n, k = 0, k = n, one item, empty array):**

~~~text
[5, 6, 7, 1, 2, 3, 4]
[3, 99, -1, -100]
[2, 1]
[1, 2, 3]
[1, 2, 3]
[42]
[]
~~~

**Example 2 — the four approaches on the same inputs, counting every write into the array:**

~~~text
n=10 k=3 brute force      30 writes, same
n=10 k=3 extra array      20 writes, same
n=10 k=3 reversal         18 writes, same
n=10 k=3 cyclic           10 writes, same
  first five after rotating: [7, 8, 9, 0, 1]
n=6 k=4 brute force      24 writes, same
n=6 k=4 extra array      12 writes, same
n=6 k=4 reversal         12 writes, same
n=6 k=4 cyclic            6 writes, same
  first five after rotating: [2, 3, 4, 5, 0]
n=1000 k=999 brute force  999000 writes, same
n=1000 k=999 extra array    2000 writes, same
n=1000 k=999 reversal       1998 writes, same
n=1000 k=999 cyclic         1000 writes, same
  first five after rotating: [1, 2, 3, 4, 5]
~~~

All four agree. For n = 1000, k = 999 the brute force does 999,000 writes, the extra array 2,000, the reversals 1,998 (two per swap) and cyclic replacements exactly 1,000. For n = 6, k = 4 the cyclic version used two cycles (gcd(6, 4) = 2) and still wrote each element once.

**Example 3 — left rotation and negative k:**

~~~javascript
function normalise(k, n) {
  return ((k % n) + n) % n;        // JS % keeps the sign of k: -1 % 7 is -1
}

function rotateRight(nums, k) {
  const n = nums.length;
  if (n === 0) return nums;
  k = normalise(k, n);
  reverse(nums, 0, n - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, n - 1);
  return nums;
}

function rotateLeft(nums, k) {
  const n = nums.length;
  if (n === 0) return nums;
  return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
}
~~~

~~~text
6
4
3
[2, 3, 4, 5, 6, 7, 1]
[3, 4, 5, 6, 7, 1, 2]
[3, 4, 5, 6, 7, 1, 2]
[4, 5, 6, 7, 1, 2, 3]
[]
~~~

Adding n before the second \`%\` turns JavaScript's negative remainder into the right non-negative shift. A left rotation by k is a right rotation by \`n - k\`.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rotate by one, k times | O(n·k) | O(1) | Each of the k passes shifts n - 1 elements. |
| Extra array | O(n) | O(n) | A second array of n items. |
| \`unshift(...splice(-k))\` | O(n) | O(k) | Copies k items, shifts the rest; spread fails for very large k. |
| Three reversals | O(n) | O(1) | About n swaps, a few variables. |
| Cyclic replacements | O(n) | O(1) | Every element is written exactly once. |

Background: [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty array:** return before \`k %= n\` (Example 1 prints \`[]\`).
- **k = 0 and k = n:** both reduce to 0.
- **k > n:** \`[1, 2]\` with k = 5 is rotation by 1.
- **Negative k:** normalise with \`((k % n) + n) % n\`.
- **k that is not an integer** (for example \`2.5\`): \`%\` happily returns a fraction and indices like \`nums[2.5]\` read \`undefined\`. Validate with \`Number.isInteger(k)\` if the input is not trusted.
- **Sparse arrays or holes:** not covered here; the swaps would turn holes into \`undefined\` values.

## Common Pitfalls

- **Assuming \`%\` is a modulo.** In JavaScript it is a remainder that keeps the sign: \`-1 % 7 === -1\`. Normalise negative k.
- **\`k % 0\` is \`NaN\`, silently.** Guard the empty array; nothing will throw to warn you.
- **Spreading huge arrays.** \`unshift(...bigArray)\` threw \`RangeError\` at 500,000 items in our run. Use loops for large inputs.
- **Using \`nums.reverse()\` for the partial reversals.** It reverses the whole array; you need a range helper.
- **Returning a new array when the caller expects mutation.** \`return [...nums.slice(-k), ...nums.slice(0, -k)]\` does not change \`nums\`; LeetCode-style callers check the original array.
- **\`slice(-k)\` with k = 0.** \`nums.slice(-0)\` is the whole array, so \`[...nums.slice(-0), ...nums.slice(0, -0)]\` is correct only by accident; always reduce k first and handle 0 explicitly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n === 0</code>, reduce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code>, then reverse the whole array, reverse the first k, and reverse the rest. O(n) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">The array is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A B</code> and the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B A</code>; reversing everything gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rev(B) rev(A)</code>, and reversing each block restores their order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The baselines:</strong> <span style="color:#f0e2c8;">Rotating one step k times is O(n·k); writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i + k) % n</code> in a new array is O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The JavaScript shortcut:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.unshift(...nums.splice(-k))</code> is fine for small arrays, but it copies, and spreading 500,000 items threw a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> in Node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> keeps the sign, so normalise negative k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((k % n) + n) % n</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k % 0</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>, not an error; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code> only reverses the whole array.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rotate to the left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Left by k is right by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k % n</code>. Or reverse the first k, reverse the rest, then reverse the whole array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return [...nums.slice(-k), ...nums.slice(0, -k)]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n) extra space and returns a new array instead of mutating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums</code>. It also needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code> first, and k = 0 only works because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice(-0)</code> happens to be the whole array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write each element exactly once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with cyclic replacements: carry a value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i + k) % n</code>, pick up the one there, and continue until the cycle closes. There are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(n, k)</code> cycles, so I count moves and stop at n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-1 % 7</code> give in JavaScript, and why does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>. JavaScript's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> is a remainder with the sign of the dividend. A negative k would produce negative indices, which read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of throwing, so the bug is silent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is destructuring swap <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[a[i], a[j]] = [a[j], a[i]]</code> OK?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct and readable. It builds a temporary two-element array per swap, so for a tight O(n) loop on a large array I prefer the explicit temp variable.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation (right by k) | Each element moves from index i to (i + k) % n; the last k wrap to the front. |
| Modular arithmetic (k mod n) | Only the remainder of k divided by n matters, because n steps is a full circle. |
| Reversal algorithm | Reverse all, then the first k, then the last n - k: rotation with O(1) extra space. |
| In place | Changing the input directly, using only O(1) extra memory. |
| Spread arguments | \`f(...arr)\` passes each element as a separate argument; very large arrays can throw. |

**Conclusion:** Rotating right by k is the block swap \`A B\` → \`B A\`. Guard the empty array, reduce \`k %= n\`, and three reversals do it in O(n) time and O(1) extra space. In JavaScript, remember that \`%\` keeps the sign and \`k % 0\` is a silent \`NaN\`, write your own range-reverse helper because \`reverse()\` only does whole arrays, and keep \`splice\`/spread tricks for small inputs only.`,
        examples: [
          {
            label: "Rotate right by k with three reversals (k > n, k = 0, empty array)",
            code: `// Rotate an array to the right by k positions, in place, with three reversals.
function reverse(nums, lo, hi) {
  while (lo < hi) {
    const t = nums[lo];
    nums[lo] = nums[hi];
    nums[hi] = t;
    lo++;
    hi--;
  }
}

function rotate(nums, k) {
  const n = nums.length;
  if (n === 0) return;             // k % 0 would be NaN
  k %= n;                          // rotating by n is a full circle
  reverse(nums, 0, n - 1);         // 1. reverse everything
  reverse(nums, 0, k - 1);         // 2. reverse the first k
  reverse(nums, k, n - 1);         // 3. reverse the rest
}

function runCase(nums, k) {
  rotate(nums, k);
  return '[' + nums.join(', ') + ']';
}

console.log(runCase([1, 2, 3, 4, 5, 6, 7], 3)); // [5, 6, 7, 1, 2, 3, 4]
console.log(runCase([-1, -100, 3, 99], 2)); // [3, 99, -1, -100]
console.log(runCase([1, 2], 5)); // [2, 1]
console.log(runCase([1, 2, 3], 0)); // [1, 2, 3]
console.log(runCase([1, 2, 3], 3)); // [1, 2, 3]
console.log(runCase([42], 100)); // [42]
console.log(runCase([], 3)); // []
`,
          },
          {
            label: "Brute force vs extra array vs reversal vs cyclic replacements, counting writes",
            code: `// Four ways to rotate right by k, with a count of array writes for each.
let writes = 0;

function bruteForce(nums, k) {     // rotate by one, k times: O(n * k)
  const n = nums.length;
  for (let r = 0; r < k % n; r++) {
    const last = nums[n - 1];
    for (let i = n - 1; i > 0; i--) { nums[i] = nums[i - 1]; writes++; }
    nums[0] = last;
    writes++;
  }
}

function extraArray(nums, k) {     // copy each item to (i + k) % n: O(n) time, O(n) space
  const n = nums.length;
  const tmp = new Array(n).fill(0);
  for (let i = 0; i < n; i++) { tmp[(i + k) % n] = nums[i]; writes++; }
  for (let i = 0; i < n; i++) { nums[i] = tmp[i]; writes++; }
}

function reversal(nums, k) {       // three reversals: O(n) time, O(1) space
  const n = nums.length;
  k %= n;
  for (const [a, b] of [[0, n - 1], [0, k - 1], [k, n - 1]]) {
    let lo = a, hi = b;
    while (lo < hi) {
      const t = nums[lo]; nums[lo] = nums[hi]; nums[hi] = t;
      writes += 2;
      lo++; hi--;
    }
  }
}

function cyclic(nums, k) {         // follow each cycle of moves: every item written once
  const n = nums.length;
  k %= n;
  let moved = 0;
  for (let start = 0; moved < n; start++) {
    let current = start, value = nums[start];
    do {
      const next = (current + k) % n;
      const t = nums[next]; nums[next] = value; value = t;
      writes++;
      moved++;
      current = next;
    } while (current !== start);
  }
}

function pad(s, w, left) {
  s = String(s);
  while (s.length < w) s = left ? ' ' + s : s + ' ';
  return s;
}

for (const [n, k] of [[10, 3], [6, 4], [1000, 999]]) {
  let expected = null;
  for (const [name, fn] of [['brute force', bruteForce], ['extra array', extraArray], ['reversal', reversal], ['cyclic', cyclic]]) {
    const nums = Array.from({ length: n }, (_, i) => i);
    writes = 0;
    fn(nums, k);
    if (expected === null) expected = nums;
    const same = nums.join(',') === expected.join(',') ? 'same' : 'DIFFERENT';
    console.log('n=' + n + ' k=' + k + ' ' + pad(name, 12, false) + pad(writes, 7, true) + ' writes, ' + same);
  }
  console.log('  first five after rotating: [' + expected.slice(0, 5).join(', ') + ']');
}
`,
          },
          {
            label: "Left rotation and negative k by normalising k",
            code: `// Left rotation and negative k: normalise k once, then reuse the right rotation.
function reverse(nums, lo, hi) {
  while (lo < hi) {
    const t = nums[lo]; nums[lo] = nums[hi]; nums[hi] = t;
    lo++; hi--;
  }
}

function normalise(k, n) {
  return ((k % n) + n) % n;        // JS % keeps the sign of k: -1 % 7 is -1
}

function rotateRight(nums, k) {
  const n = nums.length;
  if (n === 0) return nums;
  k = normalise(k, n);
  reverse(nums, 0, n - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, n - 1);
  return nums;
}

function rotateLeft(nums, k) {
  const n = nums.length;
  if (n === 0) return nums;
  return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(normalise(-1, 7)); // 6
console.log(normalise(-10, 7)); // 4
console.log(normalise(10, 7)); // 3
console.log(fmt(rotateRight([1, 2, 3, 4, 5, 6, 7], -1))); // [2, 3, 4, 5, 6, 7, 1]
console.log(fmt(rotateLeft([1, 2, 3, 4, 5, 6, 7], 2))); // [3, 4, 5, 6, 7, 1, 2]
console.log(fmt(rotateLeft([1, 2, 3, 4, 5, 6, 7], 9))); // [3, 4, 5, 6, 7, 1, 2]
console.log(fmt(rotateRight([1, 2, 3, 4, 5, 6, 7], -10))); // [4, 5, 6, 7, 1, 2, 3]
console.log(fmt(rotateLeft([], 4))); // []
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int[] nums\` and a non-negative \`int k\`, rotate the array to the right by \`k\` steps, in place, in Java. \`{1, 2, 3, 4, 5, 6, 7}\` with \`k = 3\` becomes \`{5, 6, 7, 1, 2, 3, 4}\`. Can you do it with O(1) extra space?"

**What a strong answer should cover:**
- Reduce \`k %= n\` first and guard \`n == 0\` (\`k % 0\` throws \`ArithmeticException\`).
- Brute force (rotate by one, k times, O(n·k)) and the extra-array version, then three reversals: O(n) time, O(1) space.
- Why the reversals work: \`A B\` → \`rev(B) rev(A)\` → \`B A\`.
- Optionally cyclic replacements and the \`gcd(n, k)\` cycles.
- Java specifics: \`%\` keeps the sign (\`-1 % 7 == -1\`, use \`Math.floorMod\`), \`Collections.rotate(list, k)\` exists but only for \`List\`, and \`Arrays.asList(intArray)\` gives a one-element \`List<int[]>\`, not a list of numbers.

**Clarifying questions expected:**
- "Right or left, and can k be larger than n or negative?"
- "In place on the int array, or may I return a new array?"

**Code / implementation expected:** Yes — a static \`void rotate(int[] nums, int k)\` using three reversals.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Java arrays, loops and the \`%\` operator.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`javac\` and run with \`java\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Seven friends sit around a round table, each in a numbered chair. The host says: "everybody move three chairs to the right." Nobody leaves the table and nobody new arrives; everyone just ends up three seats further on, and the three people at the "end" wrap around to the first chairs.

That is exactly what rotating an array does. The array is a row of chairs, and "rotate right by k" means every value moves k positions to the right, with the last k values wrapping round to the front. Two things fall out of the story straight away:

- Moving everyone 7 chairs at a 7-seat table changes nothing, so rotating by k is the same as rotating by **k mod n**.
- You could ask people to move one chair at a time, three times over (slow), or tell each person their final chair directly (fast).

Rotation shows up in circular buffers, in "shift the schedule by k days", and as a building block for [searching a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array). Interviewers like it because the naive answer is easy, and the O(1)-extra-space answer needs one genuinely clever idea.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Rotate to the right or to the left? | The classic LeetCode 189 is to the right. Left by k is the same as right by n - k. |
| In place, or may I return a new array? | Returning a new array is a one-liner; in place with O(1) extra space is the interesting version. |
| Can k be larger than n, zero, or negative? | k larger than n needs \`k % n\`; negative k needs a modulo that works for negatives. |
| Can the array be empty? | \`k % 0\` is a division by zero; guard \`n == 0\` first. |
| How large are n and k? | k up to 10^9 makes the "rotate one step k times" brute force hopeless. |

## 3. The Core Idea

📌 **Interview term: Rotation (right by k)** — every element moves from index \`i\` to index \`(i + k) % n\`; the last k elements wrap around to the front. \`[1, 2, 3, 4, 5, 6, 7]\` rotated right by 3 is \`[5, 6, 7, 1, 2, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Right rotation by 3 of 1 to 7. The last three items 5 6 7 move to the front and the first four items 1 2 3 4 shift right, giving 5 6 7 1 2 3 4">
  <defs>
    <marker id="b09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="291" y="36" text-anchor="middle">A: first n - k items</text>
  <text class="d-sub" x="515" y="36" text-anchor="middle">B: last k items</text>
  <text class="d-text" x="16" y="76">before</text>
  <rect class="d-box-muted" x="170" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="76" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="234" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="76" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="298" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="362" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="76" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="76" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="76" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="554" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="76" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="216">after</text>
  <rect class="d-box-accent" x="170" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="216" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="216" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="216" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="362" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="216" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="426" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="216" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="490" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="216" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="554" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 515 98 L 262 182" marker-end="url(#b09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 291 98 L 480 182" marker-end="url(#b09q2-arrow)"/>
</svg>

Look at the result as two blocks. Call the first \`n - k\` items **A** and the last \`k\` items **B**. The array is \`A B\`, and the rotated array is \`B A\`: the blocks swap places, while the order *inside* each block stays the same.

📌 **Interview term: Modular arithmetic (k mod n)** — after n steps every item is back where it started, so only the remainder \`k % n\` matters. Always reduce k first; it also handles k larger than n.

### Four approaches, from slow to clever

1. **Brute force — rotate by one, k times.** Save the last item, shift everything else one place right, put the saved item at index 0; repeat k times. O(n·k) time, O(1) space. With n = 1000 and k = 999 that is 999,000 writes (Example 2 counts them).
2. **Extra array.** Write each \`nums[i]\` into \`tmp[(i + k) % n]\`, then copy \`tmp\` back. O(n) time but O(n) extra space.
3. **Three reversals.** O(n) time, O(1) space. The trick below.
4. **Cyclic replacements.** Pick up \`nums[0]\`, put it at its final index \`k\`, pick up what was there, put it at \`2k\`, and so on, until you come back to the start; then start a new cycle at index 1 if needed. Every element is written exactly once, O(1) space, but the loop is easy to get wrong.

### Why three reversals work

Reversing a block reverses the order inside it. Reverse the whole array \`A B\` and you get \`rev(B) rev(A)\`: the blocks are now in the right places (B first), but each one is backwards. Reverse each block again and the inside order is restored: \`B A\`. Done, using only swaps.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Three reversals for k equals 3. Start 1 to 7. Reverse all gives 7 6 5 4 3 2 1. Reverse the first 3 gives 5 6 7 4 3 2 1. Reverse the rest gives 5 6 7 1 2 3 4">
  <text class="d-text" x="16" y="56">start</text>
  <rect class="d-box" x="170" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="56" text-anchor="middle">1</text>
  <rect class="d-box" x="234" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="56" text-anchor="middle">2</text>
  <rect class="d-box" x="298" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="56" text-anchor="middle">3</text>
  <rect class="d-box" x="362" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="56" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="56" text-anchor="middle">6</text>
  <rect class="d-box" x="554" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="126">reverse all</text>
  <rect class="d-box-accent" x="170" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="126" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="234" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="126" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="126" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="362" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="126" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="126" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="490" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="554" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="126" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="196">reverse first k</text>
  <rect class="d-box-accent" x="170" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="196" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="196" text-anchor="middle">7</text>
  <rect class="d-box" x="362" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="196" text-anchor="middle">3</text>
  <rect class="d-box" x="490" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="554" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="266">reverse the rest</text>
  <rect class="d-box" x="170" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="266" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="266" text-anchor="middle">6</text>
  <rect class="d-box" x="298" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="266" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="362" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="266" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="426" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="266" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="490" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="266" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="554" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="266" text-anchor="middle">4</text>
</svg>

The highlighted boxes are the part reversed in that step. Reversing the first k items turns \`7 6 5\` back into \`5 6 7\`; reversing the remaining \`n - k\` items turns \`4 3 2 1\` back into \`1 2 3 4\`.

📌 **Interview term: Reversal algorithm** — rotating an array by reversing all of it, then reversing the first k and the last n - k elements. About n swaps in total, O(1) extra space.

📌 **Interview term: In place** — the algorithm changes the input array directly and uses only O(1) extra memory (a few variables), no second array.

### Why cyclic replacements need several starts

Following \`i → (i + k) % n\` from index 0 visits only every \`gcd(n, k)\`-th index before it returns to 0. With n = 6 and k = 4 (gcd 2) the cycle from 0 is 0 → 4 → 2 → 0, which misses the odd indices, so a second cycle has to start at index 1. The code counts how many items it has moved and stops at n, which handles this without computing the gcd.

## 4. What the Java Library Gives You

\`java.util.Collections\` has a \`rotate\` method, but it works on a \`List\`, not on an \`int[]\`. We ran it together with the arithmetic facts that rotation depends on:

~~~java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        System.out.println("-1 % 7 = " + (-1 % 7));
        System.out.println("Math.floorMod(-1, 7) = " + Math.floorMod(-1, 7));

        List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6, 7));
        Collections.rotate(list, 3);              // positive distance = to the right
        System.out.println("Collections.rotate(list, 3):  " + list);
        Collections.rotate(list, -3);
        System.out.println("Collections.rotate(list, -3): " + list);

        int[] prim = {1, 2, 3, 4, 5, 6, 7};
        System.out.println("Arrays.asList(int[]).size() = " + Arrays.asList(prim).size());

        try {
            int k = 3, n = 0;
            System.out.println(k % n);
        } catch (ArithmeticException e) {
            System.out.println("3 % 0 threw ArithmeticException: " + e.getMessage());
        }
    }
}
~~~

~~~text
-1 % 7 = -1
Math.floorMod(-1, 7) = 6
Collections.rotate(list, 3):  [5, 6, 7, 1, 2, 3, 4]
Collections.rotate(list, -3): [1, 2, 3, 4, 5, 6, 7]
Arrays.asList(int[]).size() = 1
3 % 0 threw ArithmeticException: / by zero
~~~

What this shows:

- **\`Collections.rotate(list, distance)\`** rotates right for a positive distance and left for a negative one. It is the right tool if your data is already a \`List<Integer>\`. Converting an \`int[]\` to a list just to rotate it costs O(n) extra memory and boxes every value.
- **\`Arrays.asList(int[])\` is a trap.** It does not give you a list of seven \`Integer\`s; it gives a list with **one** element, the \`int[]\` itself (\`size() = 1\`). \`Arrays.asList\` takes objects, and an \`int[]\` is a single object. Rotating that list does nothing useful.
- **\`%\` keeps the sign of the left operand**: \`-1 % 7\` is \`-1\`. \`Math.floorMod(-1, 7)\` returns \`6\`, the mathematical modulo, and is the cleanest way to normalise a negative k.
- **\`k % 0\` throws** \`ArithmeticException: / by zero\`, so the empty-array guard is mandatory.

📌 **Interview term: Autoboxing** — Java automatically wrapping an \`int\` in an \`Integer\` object. A \`List<Integer>\` stores objects, so it is slower and bigger than an \`int[]\` for the same numbers.

## 5. The O(1)-Space Answer in Java

~~~java
    static void reverse(int[] nums, int lo, int hi) {
        while (lo < hi) {
            int t = nums[lo];
            nums[lo++] = nums[hi];
            nums[hi--] = t;
        }
    }

    static void rotate(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return;              // k % 0 throws ArithmeticException
        k %= n;                          // rotating by n is a full circle
        reverse(nums, 0, n - 1);         // 1. reverse everything
        reverse(nums, 0, k - 1);         // 2. reverse the first k
        reverse(nums, k, n - 1);         // 3. reverse the rest
    }
~~~

Walk-through:

- \`if (n == 0) return;\` must come before \`k %= n\`, or the method throws \`ArithmeticException\`.
- \`k %= n\` handles k larger than n and turns k = n into 0.
- Java has no swap function for array elements, so the swap uses a temporary \`t\`. \`nums[lo++] = nums[hi]\` writes and then advances \`lo\`; \`nums[hi--] = t\` writes and then moves \`hi\` back.
- With \`k == 0\` the second call is \`reverse(nums, 0, -1)\`; its loop condition \`0 < -1\` is false, so no index -1 is ever touched (which would throw \`ArrayIndexOutOfBoundsException\`).
- The method is \`void\`: arrays are objects, the method gets a copy of the reference, and changes through it are visible to the caller.

The cyclic-replacement version:

~~~java
    static void cyclic(int[] nums, int k) {         // follow each cycle of moves: every item written once
        int n = nums.length;
        k %= n;
        int moved = 0;
        for (int start = 0; moved < n; start++) {
            int current = start, value = nums[start];
            do {
                int next = (current + k) % n;
                int t = nums[next]; nums[next] = value; value = t;
                writes++;
                moved++;
                current = next;
            } while (current != start);
        }
    }
~~~

The \`do { ... } while (current != start)\` loop guarantees at least one move per cycle, and the outer loop starts a new cycle at the next index until \`moved == n\`.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\`.

**Example 1 — three reversals on several inputs (k > n, k = 0, k = n, one item, empty array):**

~~~text
[5, 6, 7, 1, 2, 3, 4]
[3, 99, -1, -100]
[2, 1]
[1, 2, 3]
[1, 2, 3]
[42]
[]
~~~

**Example 2 — the four approaches on the same inputs, counting every write into the array:**

~~~text
n=10 k=3 brute force      30 writes, same
n=10 k=3 extra array      20 writes, same
n=10 k=3 reversal         18 writes, same
n=10 k=3 cyclic           10 writes, same
  first five after rotating: [7, 8, 9, 0, 1]
n=6 k=4 brute force      24 writes, same
n=6 k=4 extra array      12 writes, same
n=6 k=4 reversal         12 writes, same
n=6 k=4 cyclic            6 writes, same
  first five after rotating: [2, 3, 4, 5, 0]
n=1000 k=999 brute force  999000 writes, same
n=1000 k=999 extra array    2000 writes, same
n=1000 k=999 reversal       1998 writes, same
n=1000 k=999 cyclic         1000 writes, same
  first five after rotating: [1, 2, 3, 4, 5]
~~~

All four agree. For n = 1000, k = 999 the brute force does 999,000 writes, the extra array 2,000, the reversals 1,998 (two per swap) and cyclic replacements exactly 1,000. For n = 6, k = 4 the cyclic version used two cycles (gcd(6, 4) = 2). Note that \`writes\` is a \`long\`: for large n and k, n·k overflows an \`int\` (2^31 - 1 is about 2.1 billion).

**Example 3 — left rotation and negative k:**

~~~java
    static int normalise(int k, int n) {
        return ((k % n) + n) % n;        // Java % keeps the sign of k: -1 % 7 is -1
    }                                    // (Math.floorMod(k, n) does the same in one call)

    static int[] rotateRight(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return nums;
        k = normalise(k, n);
        reverse(nums, 0, n - 1);
        reverse(nums, 0, k - 1);
        reverse(nums, k, n - 1);
        return nums;
    }

    static int[] rotateLeft(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return nums;
        return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
    }
~~~

~~~text
6
4
3
[2, 3, 4, 5, 6, 7, 1]
[3, 4, 5, 6, 7, 1, 2]
[3, 4, 5, 6, 7, 1, 2]
[4, 5, 6, 7, 1, 2, 3]
[]
~~~

\`((k % n) + n) % n\` and \`Math.floorMod(k, n)\` give the same result; \`floorMod\` reads better in production code, the explicit form is easier to explain on a whiteboard.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rotate by one, k times | O(n·k) | O(1) | Each of the k passes shifts n - 1 elements. |
| Extra array | O(n) | O(n) | A second \`int[]\` of n items. |
| \`Collections.rotate\` on a \`List<Integer>\` | O(n) | O(n) if you have to build the list | Boxed values; fine when the data is already a list. |
| Three reversals | O(n) | O(1) | About n swaps, a few \`int\` variables. |
| Cyclic replacements | O(n) | O(1) | Every element is written exactly once. |

Background: [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty array:** return before \`k %= n\` (Example 1 prints \`[]\`).
- **k = 0 and k = n:** both reduce to 0.
- **k > n:** \`{1, 2}\` with k = 5 is rotation by 1.
- **Negative k:** \`Math.floorMod(k, n)\` or \`((k % n) + n) % n\`.
- **k = Integer.MAX_VALUE:** \`k % n\` is safe, but an expression like \`k + n\` before the \`%\` could overflow; reduce first, then add.
- **null array:** throws \`NullPointerException\` on \`nums.length\`; check it if the contract allows null.

## Common Pitfalls

- **\`Arrays.asList(intArray)\`.** It wraps the whole \`int[]\` as one element; \`Collections.rotate\` on it changes nothing. Use \`Integer[]\` or a loop.
- **Negative remainders.** \`-1 % 7 == -1\` in Java. Use \`Math.floorMod\`.
- **Division by zero on an empty array.** \`k % 0\` throws \`ArithmeticException\`.
- **Overflow in counters or index math.** \`n * k\` for the brute-force cost overflows an \`int\` quickly; the reversal itself only uses indices below n, so it is safe.
- **Assigning a new array to the parameter.** \`nums = tmp;\` changes only the local reference. Copy back with \`System.arraycopy(tmp, 0, nums, 0, n)\`.
- **Off-by-one in the partial reversals.** It is \`reverse(0, k - 1)\` and \`reverse(k, n - 1)\`, both inclusive.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n == 0</code>, reduce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code>, then reverse the whole array, reverse the first k, and reverse the rest. O(n) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">The array is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A B</code> and the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B A</code>; reversing everything gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rev(B) rev(A)</code>, and reversing each block restores their order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The baselines:</strong> <span style="color:#f0e2c8;">Rotating one step k times is O(n·k); copying <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tmp[(i + k) % n]</code> is O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The library:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.rotate(list, k)</code> does it for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List</code>, but for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> I write the reversal; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.asList(intArray)</code> would give a one-element list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> keeps the sign, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floorMod</code> for negative k; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k % 0</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code>; reassigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums</code> inside the method does not affect the caller.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rotate to the left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Left by k equals right by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k % n</code>, or reverse the first k, reverse the rest, then reverse the whole array. With a list, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.rotate(list, -k)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.floorMod</code> do differently from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">%</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> truncates toward zero, so the result has the sign of the dividend: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1 % 7</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floorMod(-1, 7)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code>, which is the index shift you actually want.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can each element be written only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, cyclic replacements: carry <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[start]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(start + k) % n</code>, pick up what was there, and continue until the cycle closes; there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(n, k)</code> cycles, so I count moves up to n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not convert to a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code> and call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Collections.rotate</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct, but it allocates n <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects (outside the small-value cache) plus the list, so it is O(n) extra space, and I would still have to copy the values back into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your solution thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It mutates the array in several steps, so another thread could see a half-rotated array. If the array is shared, rotate under a lock or rotate a copy and publish it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation (right by k) | Each element moves from index i to (i + k) % n; the last k wrap to the front. |
| Modular arithmetic (k mod n) | Only the remainder of k divided by n matters, because n steps is a full circle. |
| Reversal algorithm | Reverse all, then the first k, then the last n - k: rotation with O(1) extra space. |
| In place | Changing the input directly, using only O(1) extra memory. |
| Autoboxing | Wrapping an \`int\` in an \`Integer\` object automatically; lists of numbers store boxed values. |

**Conclusion:** Rotating right by k is the block swap \`A B\` → \`B A\`. Guard the empty array, reduce \`k %= n\`, and three reversals do it in O(n) time and O(1) extra space on an \`int[]\`. In Java, use \`Math.floorMod\` for negative k, keep \`Collections.rotate\` for real \`List\`s, and never pass an \`int[]\` to \`Arrays.asList\` expecting a list of numbers.`,
        examples: [
          {
            label: "Rotate right by k with three reversals (k > n, k = 0, empty array)",
            code: `// Rotate an int array to the right by k positions, in place, with three reversals.
import java.util.Arrays;

public class Main {
    static void reverse(int[] nums, int lo, int hi) {
        while (lo < hi) {
            int t = nums[lo];
            nums[lo++] = nums[hi];
            nums[hi--] = t;
        }
    }

    static void rotate(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return;              // k % 0 throws ArithmeticException
        k %= n;                          // rotating by n is a full circle
        reverse(nums, 0, n - 1);         // 1. reverse everything
        reverse(nums, 0, k - 1);         // 2. reverse the first k
        reverse(nums, k, n - 1);         // 3. reverse the rest
    }

    static String runCase(int[] nums, int k) {
        rotate(nums, k);
        return Arrays.toString(nums);
    }

    public static void main(String[] args) {
        System.out.println(runCase(new int[]{1, 2, 3, 4, 5, 6, 7}, 3)); // [5, 6, 7, 1, 2, 3, 4]
        System.out.println(runCase(new int[]{-1, -100, 3, 99}, 2));     // [3, 99, -1, -100]
        System.out.println(runCase(new int[]{1, 2}, 5));                // [2, 1]
        System.out.println(runCase(new int[]{1, 2, 3}, 0));             // [1, 2, 3]
        System.out.println(runCase(new int[]{1, 2, 3}, 3));             // [1, 2, 3]
        System.out.println(runCase(new int[]{42}, 100));                // [42]
        System.out.println(runCase(new int[]{}, 3));                    // []
    }
}
`,
          },
          {
            label: "Brute force vs extra array vs reversal vs cyclic replacements, counting writes",
            code: `// Four ways to rotate right by k, with a count of array writes for each.
import java.util.Arrays;

public class Main {
    interface Rotation { void apply(int[] nums, int k); }

    static long writes = 0;

    static void bruteForce(int[] nums, int k) {     // rotate by one, k times: O(n * k)
        int n = nums.length;
        for (int r = 0; r < k % n; r++) {
            int last = nums[n - 1];
            for (int i = n - 1; i > 0; i--) { nums[i] = nums[i - 1]; writes++; }
            nums[0] = last;
            writes++;
        }
    }

    static void extraArray(int[] nums, int k) {     // copy each item to (i + k) % n: O(n) time, O(n) space
        int n = nums.length;
        int[] tmp = new int[n];
        for (int i = 0; i < n; i++) { tmp[(i + k) % n] = nums[i]; writes++; }
        for (int i = 0; i < n; i++) { nums[i] = tmp[i]; writes++; }
    }

    static void reversal(int[] nums, int k) {       // three reversals: O(n) time, O(1) space
        int n = nums.length;
        k %= n;
        int[][] ranges = {{0, n - 1}, {0, k - 1}, {k, n - 1}};
        for (int[] r : ranges) {
            int lo = r[0], hi = r[1];
            while (lo < hi) {
                int t = nums[lo]; nums[lo] = nums[hi]; nums[hi] = t;
                writes += 2;
                lo++; hi--;
            }
        }
    }

    static void cyclic(int[] nums, int k) {         // follow each cycle of moves: every item written once
        int n = nums.length;
        k %= n;
        int moved = 0;
        for (int start = 0; moved < n; start++) {
            int current = start, value = nums[start];
            do {
                int next = (current + k) % n;
                int t = nums[next]; nums[next] = value; value = t;
                writes++;
                moved++;
                current = next;
            } while (current != start);
        }
    }

    public static void main(String[] args) {
        int[][] cases = {{10, 3}, {6, 4}, {1000, 999}};
        String[] names = {"brute force", "extra array", "reversal", "cyclic"};
        Rotation[] fns = {Main::bruteForce, Main::extraArray, Main::reversal, Main::cyclic};
        for (int[] c : cases) {
            int n = c[0], k = c[1];
            int[] expected = null;
            for (int f = 0; f < fns.length; f++) {
                int[] nums = new int[n];
                for (int i = 0; i < n; i++) nums[i] = i;
                writes = 0;
                fns[f].apply(nums, k);
                if (expected == null) expected = nums;
                String same = Arrays.equals(nums, expected) ? "same" : "DIFFERENT";
                System.out.println("n=" + n + " k=" + k + " " + String.format("%-12s%7d", names[f], writes) + " writes, " + same);
            }
            System.out.println("  first five after rotating: " + Arrays.toString(Arrays.copyOf(expected, 5)));
        }
    }
}
`,
          },
          {
            label: "Left rotation and negative k by normalising k",
            code: `// Left rotation and negative k: normalise k once, then reuse the right rotation.
import java.util.Arrays;

public class Main {
    static void reverse(int[] nums, int lo, int hi) {
        while (lo < hi) {
            int t = nums[lo];
            nums[lo++] = nums[hi];
            nums[hi--] = t;
        }
    }

    static int normalise(int k, int n) {
        return ((k % n) + n) % n;        // Java % keeps the sign of k: -1 % 7 is -1
    }                                    // (Math.floorMod(k, n) does the same in one call)

    static int[] rotateRight(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return nums;
        k = normalise(k, n);
        reverse(nums, 0, n - 1);
        reverse(nums, 0, k - 1);
        reverse(nums, k, n - 1);
        return nums;
    }

    static int[] rotateLeft(int[] nums, int k) {
        int n = nums.length;
        if (n == 0) return nums;
        return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
    }

    public static void main(String[] args) {
        System.out.println(normalise(-1, 7));   // 6
        System.out.println(normalise(-10, 7));  // 4
        System.out.println(normalise(10, 7));   // 3
        System.out.println(Arrays.toString(rotateRight(new int[]{1, 2, 3, 4, 5, 6, 7}, -1)));  // [2, 3, 4, 5, 6, 7, 1]
        System.out.println(Arrays.toString(rotateLeft(new int[]{1, 2, 3, 4, 5, 6, 7}, 2)));    // [3, 4, 5, 6, 7, 1, 2]
        System.out.println(Arrays.toString(rotateLeft(new int[]{1, 2, 3, 4, 5, 6, 7}, 9)));    // [3, 4, 5, 6, 7, 1, 2]
        System.out.println(Arrays.toString(rotateRight(new int[]{1, 2, 3, 4, 5, 6, 7}, -10))); // [4, 5, 6, 7, 1, 2, 3]
        System.out.println(Arrays.toString(rotateLeft(new int[]{}, 4)));                       // []
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a vector of ints \`nums\` and a non-negative \`k\`, rotate it to the right by \`k\` steps, in place, in C++. \`{1, 2, 3, 4, 5, 6, 7}\` with \`k = 3\` becomes \`{5, 6, 7, 1, 2, 3, 4}\`. Can you do it with O(1) extra space, and how does \`std::rotate\` fit in?"

**What a strong answer should cover:**
- Reduce \`k %= n\` first and guard \`n == 0\` (integer division by zero is undefined behaviour).
- Brute force (rotate by one, k times, O(n·k)) and the extra-array version, then three reversals: O(n) time, O(1) space.
- Why the reversals work: \`A B\` → \`rev(B) rev(A)\` → \`B A\`.
- \`std::rotate(first, middle, last)\` is a **left** rotation that makes \`middle\` the new first element; a right rotation by k is \`std::rotate(v.begin(), v.begin() + (n - k), v.end())\`.
- C++ specifics: \`%\` truncates toward zero (\`-1 % 7 == -1\`), \`size()\` is unsigned so \`n - k\` with k > n wraps around, and \`std::reverse\` takes an iterator range so it handles the partial reversals.

**Clarifying questions expected:**
- "Right or left, and can k be larger than n or negative?"
- "May I use the standard library, or should I write it by hand?"

**Code / implementation expected:** Yes — a hand-written three-reversal rotation, plus the \`std::rotate\` one-liner.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need \`std::vector\`, loops and the \`%\` operator.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`g++ -std=c++17\` and run, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Seven friends sit around a round table, each in a numbered chair. The host says: "everybody move three chairs to the right." Nobody leaves the table and nobody new arrives; everyone just ends up three seats further on, and the three people at the "end" wrap around to the first chairs.

That is exactly what rotating an array does. The array is a row of chairs, and "rotate right by k" means every value moves k positions to the right, with the last k values wrapping round to the front. Two things fall out of the story straight away:

- Moving everyone 7 chairs at a 7-seat table changes nothing, so rotating by k is the same as rotating by **k mod n**.
- You could ask people to move one chair at a time, three times over (slow), or tell each person their final chair directly (fast).

Rotation shows up in circular buffers, in "shift the schedule by k days", and as a building block for [searching a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array). Interviewers like it because the naive answer is easy, and the O(1)-extra-space answer needs one genuinely clever idea.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Rotate to the right or to the left? | The classic LeetCode 189 is to the right. Left by k is the same as right by n - k. |
| In place, or may I return a new array? | Returning a new array is a one-liner; in place with O(1) extra space is the interesting version. |
| Can k be larger than n, zero, or negative? | k larger than n needs \`k % n\`; negative k needs a modulo that works for negatives. |
| Can the array be empty? | \`k % 0\` is a division by zero; guard \`n == 0\` first. |
| How large are n and k? | k up to 10^9 makes the "rotate one step k times" brute force hopeless. |

## 3. The Core Idea

📌 **Interview term: Rotation (right by k)** — every element moves from index \`i\` to index \`(i + k) % n\`; the last k elements wrap around to the front. \`[1, 2, 3, 4, 5, 6, 7]\` rotated right by 3 is \`[5, 6, 7, 1, 2, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Right rotation by 3 of 1 to 7. The last three items 5 6 7 move to the front and the first four items 1 2 3 4 shift right, giving 5 6 7 1 2 3 4">
  <defs>
    <marker id="b09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="291" y="36" text-anchor="middle">A: first n - k items</text>
  <text class="d-sub" x="515" y="36" text-anchor="middle">B: last k items</text>
  <text class="d-text" x="16" y="76">before</text>
  <rect class="d-box-muted" x="170" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="76" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="234" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="76" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="298" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="362" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="76" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="76" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="76" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="554" y="50" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="76" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="216">after</text>
  <rect class="d-box-accent" x="170" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="216" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="216" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="216" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="362" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="216" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="426" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="216" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="490" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="216" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="554" y="190" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 515 98 L 262 182" marker-end="url(#b09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 291 98 L 480 182" marker-end="url(#b09q2-arrow)"/>
</svg>

Look at the result as two blocks. Call the first \`n - k\` items **A** and the last \`k\` items **B**. The array is \`A B\`, and the rotated array is \`B A\`: the blocks swap places, while the order *inside* each block stays the same.

📌 **Interview term: Modular arithmetic (k mod n)** — after n steps every item is back where it started, so only the remainder \`k % n\` matters. Always reduce k first; it also handles k larger than n.

### Four approaches, from slow to clever

1. **Brute force — rotate by one, k times.** Save the last item, shift everything else one place right, put the saved item at index 0; repeat k times. O(n·k) time, O(1) space. With n = 1000 and k = 999 that is 999,000 writes (Example 2 counts them).
2. **Extra array.** Write each \`nums[i]\` into \`tmp[(i + k) % n]\`, then copy \`tmp\` back. O(n) time but O(n) extra space.
3. **Three reversals.** O(n) time, O(1) space. The trick below.
4. **Cyclic replacements.** Pick up \`nums[0]\`, put it at its final index \`k\`, pick up what was there, put it at \`2k\`, and so on, until you come back to the start; then start a new cycle at index 1 if needed. Every element is written exactly once, O(1) space, but the loop is easy to get wrong.

### Why three reversals work

Reversing a block reverses the order inside it. Reverse the whole array \`A B\` and you get \`rev(B) rev(A)\`: the blocks are now in the right places (B first), but each one is backwards. Reverse each block again and the inside order is restored: \`B A\`. Done, using only swaps.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Three reversals for k equals 3. Start 1 to 7. Reverse all gives 7 6 5 4 3 2 1. Reverse the first 3 gives 5 6 7 4 3 2 1. Reverse the rest gives 5 6 7 1 2 3 4">
  <text class="d-text" x="16" y="56">start</text>
  <rect class="d-box" x="170" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="56" text-anchor="middle">1</text>
  <rect class="d-box" x="234" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="56" text-anchor="middle">2</text>
  <rect class="d-box" x="298" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="56" text-anchor="middle">3</text>
  <rect class="d-box" x="362" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="56" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="56" text-anchor="middle">6</text>
  <rect class="d-box" x="554" y="30" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="16" y="126">reverse all</text>
  <rect class="d-box-accent" x="170" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="126" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="234" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="126" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="126" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="362" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="126" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="426" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="126" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="490" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="554" y="100" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="126" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="196">reverse first k</text>
  <rect class="d-box-accent" x="170" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="196" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="234" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="196" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="298" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="196" text-anchor="middle">7</text>
  <rect class="d-box" x="362" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="426" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="196" text-anchor="middle">3</text>
  <rect class="d-box" x="490" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="554" y="170" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="16" y="266">reverse the rest</text>
  <rect class="d-box" x="170" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="195" y="266" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="259" y="266" text-anchor="middle">6</text>
  <rect class="d-box" x="298" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="323" y="266" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="362" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="387" y="266" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="426" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="451" y="266" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="490" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="515" y="266" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="554" y="240" width="50" height="40" rx="6"/>
  <text class="d-text" x="579" y="266" text-anchor="middle">4</text>
</svg>

The highlighted boxes are the part reversed in that step. Reversing the first k items turns \`7 6 5\` back into \`5 6 7\`; reversing the remaining \`n - k\` items turns \`4 3 2 1\` back into \`1 2 3 4\`.

📌 **Interview term: Reversal algorithm** — rotating an array by reversing all of it, then reversing the first k and the last n - k elements. About n swaps in total, O(1) extra space.

📌 **Interview term: In place** — the algorithm changes the input array directly and uses only O(1) extra memory (a few variables), no second array.

### Why cyclic replacements need several starts

Following \`i → (i + k) % n\` from index 0 visits only every \`gcd(n, k)\`-th index before it returns to 0. With n = 6 and k = 4 (gcd 2) the cycle from 0 is 0 → 4 → 2 → 0, which misses the odd indices, so a second cycle has to start at index 1. The code counts how many items it has moved and stops at n, which handles this without computing the gcd.

## 4. What the Standard Library Gives You: std::rotate

C++ is the one language of the four with a rotation algorithm built in: \`std::rotate\` in \`<algorithm>\`. Its argument order surprises people, so we ran it three ways:

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    cout << "-1 % 7 = " << (-1 % 7) << "\\n";

    vector<int> v = {1, 2, 3, 4, 5, 6, 7};
    int n = v.size(), k = 3;
    auto it = rotate(v.begin(), v.begin() + k, v.end());       // the element at begin()+k becomes first
    cout << "rotate(begin, begin + 3, end):     " << fmt(v) << "  old first is now at index " << (it - v.begin()) << "\\n";

    v = {1, 2, 3, 4, 5, 6, 7};
    rotate(v.begin(), v.begin() + (n - k), v.end());           // right rotation by k
    cout << "rotate(begin, begin + n - 3, end): " << fmt(v) << "\\n";

    v = {1, 2, 3, 4, 5, 6, 7};
    rotate(v.rbegin(), v.rbegin() + k, v.rend());              // right rotation, via reverse iterators
    cout << "rotate(rbegin, rbegin + 3, rend):  " << fmt(v) << "\\n";
    return 0;
}
~~~

~~~text
-1 % 7 = -1
rotate(begin, begin + 3, end):     [4, 5, 6, 7, 1, 2, 3]  old first is now at index 4
rotate(begin, begin + n - 3, end): [5, 6, 7, 1, 2, 3, 4]
rotate(rbegin, rbegin + 3, rend):  [5, 6, 7, 1, 2, 3, 4]
~~~

What this shows:

- **\`std::rotate(first, middle, last)\` rotates left**: the element at \`middle\` becomes the new first element. With \`middle = begin() + 3\` the result is \`[4, 5, 6, 7, 1, 2, 3]\`, a left rotation by 3.
- **A right rotation by k** is \`std::rotate(v.begin(), v.begin() + (n - k), v.end())\`, or, equivalently, the same call on **reverse iterators**: \`std::rotate(v.rbegin(), v.rbegin() + k, v.rend())\`. Both printed \`[5, 6, 7, 1, 2, 3, 4]\`.
- \`std::rotate\` returns an iterator to where the old first element ended up (index 4 here). It runs in linear time and needs no extra array.
- **\`%\` truncates toward zero** in C++ (guaranteed since C++11): \`-1 % 7\` is \`-1\`.

📌 **Interview term: Iterator range** — a pair \`[first, last)\` of iterators marking a half-open span of a container; almost every \`<algorithm>\` function, including \`std::rotate\` and \`std::reverse\`, works on one.

📌 **Interview term: Reverse iterator** — \`rbegin()\` / \`rend()\` walk the container backwards; running a left-rotation algorithm on reverse iterators produces a right rotation.

In an interview, mention \`std::rotate\`, then write the algorithm yourself, because that is what is being tested.

## 5. The O(1)-Space Answer in C++

~~~cpp
void reverseRange(vector<int>& nums, int lo, int hi) {
    while (lo < hi) swap(nums[lo++], nums[hi--]);
}

void rotate(vector<int>& nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return;              // k % 0 is undefined behaviour
    k %= n;                          // rotating by n is a full circle
    reverseRange(nums, 0, n - 1);    // 1. reverse everything
    reverseRange(nums, 0, k - 1);    // 2. reverse the first k
    reverseRange(nums, k, n - 1);    // 3. reverse the rest
}
~~~

Walk-through:

- \`n\` is converted to \`int\` once with \`static_cast<int>(nums.size())\`. \`size()\` returns an unsigned \`size_t\`; doing index arithmetic like \`k - 1\` or \`n - k\` in unsigned types wraps around instead of going negative (with k = 0, \`k - 1\` would be 18446744073709551615 on a 64-bit \`size_t\`).
- \`if (n == 0) return;\` comes first: \`k % 0\` is undefined behaviour in C++, which may crash or do anything.
- \`std::swap(nums[lo++], nums[hi--])\` swaps and then moves both indices in one line.
- With \`k == 0\`, the second call is \`reverseRange(nums, 0, -1)\`; the loop condition is false immediately, so \`nums[-1]\` is never touched (that would be undefined behaviour, not an exception).
- With the standard library, the same three steps are \`std::reverse(v.begin(), v.end()); std::reverse(v.begin(), v.begin() + k); std::reverse(v.begin() + k, v.end());\`.

The cyclic-replacement version:

~~~cpp
void cyclic(vector<int>& nums, int k) {         // follow each cycle of moves: every item written once
    int n = nums.size();
    k %= n;
    int moved = 0;
    for (int start = 0; moved < n; start++) {
        int current = start, value = nums[start];
        do {
            int next = (current + k) % n;
            swap(nums[next], value);            // write value, pick up the old one
            writes++;
            moved++;
            current = next;
        } while (current != start);
    }
}
~~~

\`swap(nums[next], value)\` writes the carried value into its final slot and picks up the old one in a single call.

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — three reversals on several inputs (k > n, k = 0, k = n, one item, empty vector):**

~~~text
[5, 6, 7, 1, 2, 3, 4]
[3, 99, -1, -100]
[2, 1]
[1, 2, 3]
[1, 2, 3]
[42]
[]
~~~

**Example 2 — the four approaches on the same inputs, counting every write into the vector:**

~~~text
n=10 k=3 brute force      30 writes, same
n=10 k=3 extra array      20 writes, same
n=10 k=3 reversal         18 writes, same
n=10 k=3 cyclic           10 writes, same
  first five after rotating: [7, 8, 9, 0, 1]
n=6 k=4 brute force      24 writes, same
n=6 k=4 extra array      12 writes, same
n=6 k=4 reversal         12 writes, same
n=6 k=4 cyclic            6 writes, same
  first five after rotating: [2, 3, 4, 5, 0]
n=1000 k=999 brute force  999000 writes, same
n=1000 k=999 extra array    2000 writes, same
n=1000 k=999 reversal       1998 writes, same
n=1000 k=999 cyclic         1000 writes, same
  first five after rotating: [1, 2, 3, 4, 5]
~~~

All four agree. For n = 1000, k = 999 the brute force does 999,000 writes, the extra array 2,000, the reversals 1,998 (two per swap) and cyclic replacements exactly 1,000. For n = 6, k = 4 the cyclic version used two cycles (gcd(6, 4) = 2).

**Example 3 — left rotation and negative k:**

~~~cpp
int normalise(int k, int n) {
    return ((k % n) + n) % n;        // C++ % truncates toward zero: -1 % 7 is -1
}

vector<int> rotateRight(vector<int> nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return nums;
    k = normalise(k, n);
    reverseRange(nums, 0, n - 1);
    reverseRange(nums, 0, k - 1);
    reverseRange(nums, k, n - 1);
    return nums;
}

vector<int> rotateLeft(vector<int> nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return nums;
    return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
}
~~~

~~~text
6
4
3
[2, 3, 4, 5, 6, 7, 1]
[3, 4, 5, 6, 7, 1, 2]
[3, 4, 5, 6, 7, 1, 2]
[4, 5, 6, 7, 1, 2, 3]
[]
~~~

Here the functions take the vector **by value** and return the rotated copy, which keeps the demo short; the in-place versions take \`vector<int>&\`.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rotate by one, k times | O(n·k) | O(1) | Each of the k passes shifts n - 1 elements. |
| Extra array | O(n) | O(n) | A second vector of n items. |
| \`std::rotate\` | O(n) | O(1) | Linear in the range length; no extra vector. |
| Three reversals / \`std::reverse\` | O(n) | O(1) | About n swaps. |
| Cyclic replacements | O(n) | O(1) | Every element is written exactly once. |

Background: [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty vector:** return before \`k %= n\` (Example 1 prints \`[]\`).
- **k = 0 and k = n:** both reduce to 0; \`std::rotate\` with \`middle == first\` or \`middle == last\` is also a no-op.
- **k > n:** reduce first; \`v.begin() + (n - k)\` with k > n would point before the beginning (undefined behaviour).
- **Negative k:** \`((k % n) + n) % n\`.
- **k as \`size_t\`:** if the interface uses \`size_t k\`, then \`n - k\` with k > n wraps to a huge value instead of going negative. Reduce k before any subtraction.

## Common Pitfalls

- **Reading \`std::rotate\` as a right rotation.** It is left: \`middle\` becomes the first element. For right by k pass \`begin() + (n - k)\` or use reverse iterators.
- **Unsigned arithmetic.** Mixing \`size_t\` from \`size()\` with subtraction wraps around; convert to \`int\` once or reduce k before subtracting.
- **Division by zero is undefined behaviour.** \`k % n\` with an empty vector does not throw; it may crash or silently misbehave.
- **Negative remainders.** \`-1 % 7 == -1\` in C++; normalise before using k as an offset.
- **Taking the vector by value by accident.** \`void rotate(vector<int> nums, int k)\` rotates a copy; the caller's vector is unchanged.
- **Off-by-one with iterator ranges.** \`std::reverse(v.begin(), v.begin() + k)\` excludes \`begin() + k\`; with index-based helpers the ends are inclusive (\`0\` to \`k - 1\`). Mixing the two styles is a classic bug.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n == 0</code>, reduce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k %= n</code>, then reverse the whole vector, reverse the first k, and reverse the rest. O(n) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">The vector is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A B</code> and the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B A</code>; reversing everything gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rev(B) rev(A)</code>, and reversing each block restores their order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The library:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::rotate(v.begin(), v.begin() + (n - k), v.end())</code> is the one-liner; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::rotate</code> is a left rotation that makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">middle</code> the new first element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The baselines:</strong> <span style="color:#f0e2c8;">Rotating one step k times is O(n·k); writing to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i + k) % n</code> in a second vector is O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k % 0</code> is undefined behaviour, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1 % 7</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> arithmetic like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code> wraps around instead of going negative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::rotate(first, middle, last)</code> actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It rotates the range left so that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*middle</code> becomes the first element, and returns an iterator to the new position of the old first element. In our run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">middle = begin() + 3</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 6, 7, 1, 2, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a right rotation from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::rotate</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin() + (n - k)</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">middle</code>, or call it on reverse iterators: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::rotate(v.rbegin(), v.rbegin() + k, v.rend())</code>. Both printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 6, 7, 1, 2, 3, 4]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can each element be written only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, cyclic replacements: carry a value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i + k) % n</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap</code> it with what is there until the cycle closes; there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(n, k)</code> cycles, so I count moves up to n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did you convert <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The reversal helpers use indices like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - 1</code>, which is -1 when k is 0. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> that would wrap to the maximum value and index far out of bounds. Signed indices make the empty-range case safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this work on a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::list</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index-based version would not, because a list has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::rotate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> only need forward or bidirectional iterators, so they work on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code> also has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> to move a block of nodes in O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation (right by k) | Each element moves from index i to (i + k) % n; the last k wrap to the front. |
| Modular arithmetic (k mod n) | Only the remainder of k divided by n matters, because n steps is a full circle. |
| Reversal algorithm | Reverse all, then the first k, then the last n - k: rotation with O(1) extra space. |
| In place | Changing the input directly, using only O(1) extra memory. |
| Iterator range | A half-open \`[first, last)\` pair of iterators that \`<algorithm>\` functions work on. |
| Reverse iterator | \`rbegin()\` / \`rend()\`, which walk a container backwards. |

**Conclusion:** Rotating right by k is the block swap \`A B\` → \`B A\`. Guard the empty vector, reduce \`k %= n\`, and three reversals do it in O(n) time and O(1) extra space; \`std::rotate\` does the same in one call once you remember it rotates left around \`middle\`. In C++, the real dangers are undefined behaviour (division by zero, out-of-range indices) and unsigned \`size_t\` arithmetic, so keep indices signed and reduce k before subtracting.`,
        examples: [
          {
            label: "Rotate right by k with three reversals (k > n, k = 0, empty array)",
            code: `// Rotate a vector to the right by k positions, in place, with three reversals.
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

void reverseRange(vector<int>& nums, int lo, int hi) {
    while (lo < hi) swap(nums[lo++], nums[hi--]);
}

void rotate(vector<int>& nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return;              // k % 0 is undefined behaviour
    k %= n;                          // rotating by n is a full circle
    reverseRange(nums, 0, n - 1);    // 1. reverse everything
    reverseRange(nums, 0, k - 1);    // 2. reverse the first k
    reverseRange(nums, k, n - 1);    // 3. reverse the rest
}

string runCase(vector<int> nums, int k) {
    rotate(nums, k);
    string s = "[";
    for (size_t i = 0; i < nums.size(); i++) s += (i ? ", " : "") + to_string(nums[i]);
    return s + "]";
}

int main() {
    cout << runCase({1, 2, 3, 4, 5, 6, 7}, 3) << "\\n";  // [5, 6, 7, 1, 2, 3, 4]
    cout << runCase({-1, -100, 3, 99}, 2) << "\\n";      // [3, 99, -1, -100]
    cout << runCase({1, 2}, 5) << "\\n";                 // [2, 1]
    cout << runCase({1, 2, 3}, 0) << "\\n";              // [1, 2, 3]
    cout << runCase({1, 2, 3}, 3) << "\\n";              // [1, 2, 3]
    cout << runCase({42}, 100) << "\\n";                 // [42]
    cout << runCase({}, 3) << "\\n";                     // []
    return 0;
}
`,
          },
          {
            label: "Brute force vs extra array vs reversal vs cyclic replacements, counting writes",
            code: `// Four ways to rotate right by k, with a count of array writes for each.
#include <cstdio>
#include <string>
#include <utility>
#include <vector>
using namespace std;

long writes = 0;

void bruteForce(vector<int>& nums, int k) {     // rotate by one, k times: O(n * k)
    int n = nums.size();
    for (int r = 0; r < k % n; r++) {
        int last = nums[n - 1];
        for (int i = n - 1; i > 0; i--) { nums[i] = nums[i - 1]; writes++; }
        nums[0] = last;
        writes++;
    }
}

void extraArray(vector<int>& nums, int k) {     // copy each item to (i + k) % n: O(n) time, O(n) space
    int n = nums.size();
    vector<int> tmp(n);
    for (int i = 0; i < n; i++) { tmp[(i + k) % n] = nums[i]; writes++; }
    for (int i = 0; i < n; i++) { nums[i] = tmp[i]; writes++; }
}

void reversal(vector<int>& nums, int k) {       // three reversals: O(n) time, O(1) space
    int n = nums.size();
    k %= n;
    pair<int, int> ranges[] = {{0, n - 1}, {0, k - 1}, {k, n - 1}};
    for (auto [lo, hi] : ranges) {
        while (lo < hi) { swap(nums[lo++], nums[hi--]); writes += 2; }
    }
}

void cyclic(vector<int>& nums, int k) {         // follow each cycle of moves: every item written once
    int n = nums.size();
    k %= n;
    int moved = 0;
    for (int start = 0; moved < n; start++) {
        int current = start, value = nums[start];
        do {
            int next = (current + k) % n;
            swap(nums[next], value);            // write value, pick up the old one
            writes++;
            moved++;
            current = next;
        } while (current != start);
    }
}

int main() {
    pair<int, int> cases[] = {{10, 3}, {6, 4}, {1000, 999}};
    const char* names[] = {"brute force", "extra array", "reversal", "cyclic"};
    void (*fns[])(vector<int>&, int) = {bruteForce, extraArray, reversal, cyclic};
    for (auto [n, k] : cases) {
        vector<int> expected;
        for (int f = 0; f < 4; f++) {
            vector<int> nums(n);
            for (int i = 0; i < n; i++) nums[i] = i;
            writes = 0;
            fns[f](nums, k);
            if (f == 0) expected = nums;
            printf("n=%d k=%d %-12s%7ld writes, %s\\n", n, k, names[f], writes, nums == expected ? "same" : "DIFFERENT");
        }
        printf("  first five after rotating: [%d, %d, %d, %d, %d]\\n", expected[0], expected[1], expected[2], expected[3], expected[4]);
    }
    return 0;
}
`,
          },
          {
            label: "Left rotation and negative k by normalising k",
            code: `// Left rotation and negative k: normalise k once, then reuse the right rotation.
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

void reverseRange(vector<int>& nums, int lo, int hi) {
    while (lo < hi) swap(nums[lo++], nums[hi--]);
}

int normalise(int k, int n) {
    return ((k % n) + n) % n;        // C++ % truncates toward zero: -1 % 7 is -1
}

vector<int> rotateRight(vector<int> nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return nums;
    k = normalise(k, n);
    reverseRange(nums, 0, n - 1);
    reverseRange(nums, 0, k - 1);
    reverseRange(nums, k, n - 1);
    return nums;
}

vector<int> rotateLeft(vector<int> nums, int k) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return nums;
    return rotateRight(nums, n - normalise(k, n));   // left by k == right by n - k
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    cout << normalise(-1, 7) << "\\n";                               // 6
    cout << normalise(-10, 7) << "\\n";                              // 4
    cout << normalise(10, 7) << "\\n";                               // 3
    cout << fmt(rotateRight({1, 2, 3, 4, 5, 6, 7}, -1)) << "\\n";    // [2, 3, 4, 5, 6, 7, 1]
    cout << fmt(rotateLeft({1, 2, 3, 4, 5, 6, 7}, 2)) << "\\n";      // [3, 4, 5, 6, 7, 1, 2]
    cout << fmt(rotateLeft({1, 2, 3, 4, 5, 6, 7}, 9)) << "\\n";      // [3, 4, 5, 6, 7, 1, 2]
    cout << fmt(rotateRight({1, 2, 3, 4, 5, 6, 7}, -10)) << "\\n";   // [4, 5, 6, 7, 1, 2, 3]
    cout << fmt(rotateLeft({}, 4)) << "\\n";                         // []
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you rotate an N×N matrix by 90 degrees in place?",
    difficulty: "medium",
    seoDescription: "Rotate an N×N matrix 90° clockwise in place with transpose + reverse or a four-way layer swap, in Python, JavaScript, Java and C++, with verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given an n by n matrix as a Python list of lists, for example an image. Rotate it 90 degrees clockwise, in place: modify the given lists rather than returning a new matrix."

**What a strong answer should cover:**
- The mapping: cell \`(r, c)\` goes to \`(c, n - 1 - r)\`; a copy-based version is easy but O(n²) extra space.
- Transpose (swap \`m[i][j]\` with \`m[j][i]\` for \`j > i\` only), then reverse each row; O(n²) time, O(1) extra space.
- The alternative four-way swap per layer, and the counter-clockwise variant (transpose, then reverse the row order).
- Only square matrices can be rotated in place; R×C becomes C×R.
- Python specifics: \`list(zip(*m[::-1]))\` is a neat one-liner but builds new tuples, \`row.reverse()\` is in place while \`row = row[::-1]\` only rebinds a name, and \`[[0] * n] * n\` creates n references to the same row.

**Clarifying questions expected:**
- "Clockwise or counter-clockwise, and is it always square?"
- "Is a new matrix acceptable, or must it be in place?"

**Code / implementation expected:** Yes — a Python \`rotate(matrix)\` that transposes and reverses rows in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Python lists of lists and nested loops.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`python3\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are holding a printed photo and you turn it a quarter turn to the right. The top edge of the picture is now on the right side, the left edge is now the top, and the person who was standing upright is now lying on their side. Every point of the photo moved, but nothing was added or lost.

A digital image is a grid of pixels, and turning it is exactly this question: rotate an N×N matrix by 90 degrees. The interview twist is **in place**: you may not make a second grid. Picture rearranging tiles on a square floor where there is no spare space to put tiles down; you can only swap tiles that are already on the floor.

There is a neat trick (flip along the diagonal, then mirror) and a more "mechanical" one (move four tiles at a time around each ring). Knowing both, and being able to explain why they are the same rotation, is what the interviewer is checking. The same index reasoning comes back in [spiral order traversal](/interview-question/how-do-you-traverse-a-matrix-in-spiral-order) and [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clockwise or counter-clockwise? | The two use different second steps (reverse rows vs reverse the row order). |
| Is the matrix always square? | Only a square matrix can be rotated in its own storage: an R×C matrix becomes C×R. |
| Must it be in place, or may I return a new matrix? | A copy is trivial (\`out[c][n-1-r] = m[r][c]\`); in place with O(1) extra space is the real question. |
| Can it be empty or 1×1? | Both should simply return without doing anything. |
| What are the element types? | Irrelevant to the algorithm, but tells you whether swaps are cheap (numbers) or move big objects. |

## 3. The Core Idea

First, where does each cell go? Turning the grid a quarter turn clockwise sends the **top row to the right column**, the second row to the second-from-right column, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Rotating a 3 by 3 matrix clockwise. The top row 1 2 3 becomes the right column, read from top to bottom">
  <defs>
    <marker id="b09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="137" y="30" text-anchor="middle">before</text>
  <text class="d-text" x="463" y="30" text-anchor="middle">after 90 degrees clockwise</text>
  <rect class="d-box-accent" x="64" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="114" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="77" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="164" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="64" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="127" text-anchor="middle">4</text>
  <rect class="d-box" x="114" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="164" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="64" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="114" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="177" text-anchor="middle">8</text>
  <rect class="d-box" x="164" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="390" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="440" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="77" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="490" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="440" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="127" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="440" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="490" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="177" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 125 L 350 125" marker-end="url(#b09q3-arrow)"/>
  <text class="d-sub" x="295" y="108" text-anchor="middle">row r</text>
  <text class="d-sub" x="295" y="150" text-anchor="middle">to column</text>
  <text class="d-sub" x="295" y="168" text-anchor="middle">n - 1 - r</text>
</svg>

In index terms, with rows and columns numbered from 0:

📌 **Interview term: Rotation mapping** — for a 90-degree clockwise turn, the cell at row \`r\`, column \`c\` moves to row \`c\`, column \`n - 1 - r\`. Counter-clockwise, it moves to row \`n - 1 - c\`, column \`r\`.

If you had a spare grid, that formula is the whole solution: \`out[c][n - 1 - r] = m[r][c]\` for every cell. That costs O(n²) extra memory. The question asks for O(1) extra memory, so we need ways to reach the same result with swaps only.

### Approach 1: transpose, then reverse each row

📌 **Interview term: Transpose** — flipping a matrix across its main diagonal (top-left to bottom-right): cell \`(r, c)\` swaps with cell \`(c, r)\`. The diagonal cells stay where they are.

Transposing sends \`(r, c)\` to \`(c, r)\`. Reversing each row then sends column \`x\` to column \`n - 1 - x\`, so \`(c, r)\` goes to \`(c, n - 1 - r)\`. That is exactly the rotation mapping.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Two steps. Start 1 to 9. Transpose swaps across the diagonal, giving 1 4 7, 2 5 8, 3 6 9. Reversing each row gives 7 4 1, 8 5 2, 9 6 3">
  <defs>
    <marker id="b09q3b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="102" y="30" text-anchor="middle">start</text>
  <text class="d-text" x="340" y="30" text-anchor="middle">1. transpose</text>
  <text class="d-text" x="578" y="30" text-anchor="middle">2. reverse each row</text>
  <rect class="d-box-accent" x="30" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="80" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="77" text-anchor="middle">2</text>
  <rect class="d-box" x="130" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="30" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="127" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="80" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="130" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="30" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="80" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="177" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="130" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="177" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="268" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="318" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="368" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="268" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="127" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="318" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="368" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="268" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="177" text-anchor="middle">3</text>
  <rect class="d-box" x="318" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="368" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="506" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="556" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="606" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="506" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="556" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="606" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="506" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="556" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="177" text-anchor="middle">6</text>
  <rect class="d-box" x="606" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="177" text-anchor="middle">3</text>
  <path class="d-edge" d="M 186 125 L 256 125" marker-end="url(#b09q3b-arrow)"/>
  <path class="d-edge" d="M 424 125 L 494 125" marker-end="url(#b09q3b-arrow)"/>
  <text class="d-sub" x="340" y="228" text-anchor="middle">diagonal stays put</text>
</svg>

The highlighted cells are the main diagonal: the transpose leaves them alone. Only the pairs **above** the diagonal are swapped with their mirror below it, so the inner loop starts at \`j = i + 1\`. Starting at \`j = 0\` would swap every pair twice and undo the transpose.

### Approach 2: four-way swaps, ring by ring

📌 **Interview term: Layer (ring)** — the cells at the same distance from the edge. A 4×4 matrix has 2 layers (the outer border and the inner 2×2); an n×n matrix has \`n / 2\` layers (rounded down; the centre cell of an odd n never moves).

Within one layer, each cell belongs to a group of four that rotate into each other: top → right → bottom → left → top. Save the top one in a temporary variable, then move left → top, bottom → left, right → bottom, and the saved top → right. One temporary variable, four writes, and four cells are in their final places.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="Four way swap on the outer layer of a 4 by 4 matrix. The four corners 1 4 16 13 move one corner clockwise each: 1 to top right, 4 to bottom right, 16 to bottom left, 13 to top left">
  <defs>
    <marker id="b09q3c-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="87" text-anchor="middle">1</text>
  <rect class="d-box" x="250" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="87" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="87" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="350" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="87" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="137" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="250" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="137" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="300" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="137" text-anchor="middle">7</text>
  <rect class="d-box" x="350" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="137" text-anchor="middle">8</text>
  <rect class="d-box" x="200" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="187" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="250" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="187" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="300" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="187" text-anchor="middle">11</text>
  <rect class="d-box" x="350" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="187" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="200" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="237" text-anchor="middle">13</text>
  <rect class="d-box" x="250" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="237" text-anchor="middle">14</text>
  <rect class="d-box" x="300" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="237" text-anchor="middle">15</text>
  <rect class="d-box-accent" x="350" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="237" text-anchor="middle">16</text>
  <path class="d-edge-accent" d="M 222 48 Q 296 10 370 48" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 410 82 Q 450 156 410 230" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 370 270 Q 296 308 222 270" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 188 230 Q 148 156 188 82" marker-end="url(#b09q3c-arrow)"/>
  <text class="d-sub" x="500" y="150" text-anchor="middle">top to right</text>
  <text class="d-sub" x="500" y="170" text-anchor="middle">right to bottom</text>
  <text class="d-sub" x="90" y="150" text-anchor="middle">bottom to left</text>
  <text class="d-sub" x="90" y="170" text-anchor="middle">left to top</text>
</svg>

The four corners of the outer layer form one group; the next group is the cells one step along each side (2, 8, 15, 9), and so on. The inner grey 2×2 is the next layer and is handled the same way.

### Which approach to present

Transpose + reverse is easier to get right on a whiteboard and easy to explain. The four-way swap does fewer writes (each cell is written once, Example 2 counts them) but its index expressions are easy to get wrong. A good answer gives the first, and mentions the second.

## 4. Python Idioms and Traps for Matrices

Python has a famous one-liner for rotation, and two traps that bite people working with lists of lists. We ran all three:

~~~python
m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print("zip(*m[::-1]):", list(zip(*m[::-1])))            # tuples, and a brand-new object
m[:] = [list(row) for row in zip(*m[::-1])]             # one-liner rotation, O(n^2) extra space
print("one-liner rotate:", m)

bad = [[0] * 3] * 3                                     # three references to ONE row
bad[0][0] = 99
print("[[0] * 3] * 3 after bad[0][0] = 99:", bad)
good = [[0] * 3 for _ in range(3)]
good[0][0] = 99
print("list comprehension after good[0][0] = 99:", good)

m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
for row in m:
    row = row[::-1]                                     # rebinds the loop variable only
print("after row = row[::-1]:", m)
~~~

~~~text
zip(*m[::-1]): [(7, 4, 1), (8, 5, 2), (9, 6, 3)]
one-liner rotate: [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
[[0] * 3] * 3 after bad[0][0] = 99: [[99, 0, 0], [99, 0, 0], [99, 0, 0]]
list comprehension after good[0][0] = 99: [[99, 0, 0], [0, 0, 0], [0, 0, 0]]
after row = row[::-1]: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
~~~

What this shows:

- **\`zip(*m[::-1])\`** reverses the row order and then zips the rows together column by column, which is a clockwise rotation. It is elegant, but it builds a reversed copy, then tuples, then new lists: O(n²) extra memory. \`m[:] = ...\` makes it look in place to the caller, but it is not O(1) space. Mention it, then write the real thing.
- **\`[[0] * 3] * 3\` is three references to one list.** Changing \`bad[0][0]\` changed all three rows. Always build a matrix with a comprehension: \`[[0] * n for _ in range(n)]\`.
- **\`row = row[::-1]\` does nothing to the matrix.** The slice creates a reversed copy and binds the loop variable to it; \`m\` still holds the old row. \`row.reverse()\` (or \`row[:] = row[::-1]\`) changes the actual row object.

📌 **Interview term: Aliasing** — two names (or two slots of a list) referring to the same object, so a change through one is visible through the other.

## 5. The In-Place Code in Python

~~~python
def rotate(matrix):
    n = len(matrix)
    for i in range(n):                     # 1. transpose: swap across the main diagonal
        for j in range(i + 1, n):          #    j starts at i + 1, so each pair is swapped once
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:                     # 2. reverse every row
        row.reverse()                      #    row is the same list object, so this is in place
~~~

Walk-through:

- \`n = len(matrix)\` — for a square matrix the row count is also the column count.
- The double loop visits only the cells **above** the diagonal (\`j\` from \`i + 1\`), and the tuple swap exchanges \`matrix[i][j]\` and \`matrix[j][i]\` without a temporary variable.
- \`for row in matrix: row.reverse()\` — \`row\` is the inner list itself (not a copy), and \`list.reverse()\` reverses it in place and returns \`None\`.
- An empty matrix (\`[]\`) or a 1×1 matrix passes through both loops without doing anything.

The four-way swap version, one group of four cells at a time:

~~~python
def rotate_layers(m):
    global writes
    n = len(m)
    for layer in range(n // 2):
        first, last = layer, n - 1 - layer
        for i in range(first, last):
            offset = i - first
            top = m[first][i]                                  # save top
            m[first][i] = m[last - offset][first]              # left   -> top
            m[last - offset][first] = m[last][last - offset]   # bottom -> left
            m[last][last - offset] = m[i][last]                # right  -> bottom
            m[i][last] = top                                   # top    -> right
            writes += 4
~~~

Here \`first\` and \`last\` are the boundaries of the current layer, \`i\` walks along its top edge (excluding the last corner, which belongs to the next group), and \`offset\` is how far \`i\` is from the start of the layer. Python's tuple assignment could do the four-way move in one line, \`a, b, c, d = d, a, b, c\`, but with these long index expressions the explicit \`top\` temporary is far easier to check.

## 6. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3 main.py\`.

**Example 1 — transpose + reverse on 1×1 to 4×4:**

~~~text
1x1 before:
  [1]
1x1 after:
  [1]
2x2 before:
  [1, 2]
  [3, 4]
2x2 after:
  [3, 1]
  [4, 2]
3x3 before:
  [1, 2, 3]
  [4, 5, 6]
  [7, 8, 9]
3x3 after:
  [7, 4, 1]
  [8, 5, 2]
  [9, 6, 3]
4x4 before:
  [1, 2, 3, 4]
  [5, 6, 7, 8]
  [9, 10, 11, 12]
  [13, 14, 15, 16]
4x4 after:
  [13, 9, 5, 1]
  [14, 10, 6, 2]
  [15, 11, 7, 3]
  [16, 12, 8, 4]
~~~

The first row of each "before" grid always ends up as the last column of the "after" grid, read top to bottom: for 4×4, \`1, 2, 3, 4\` is now the right-hand column.

**Example 2 — the three approaches compared, counting every write into a matrix cell:**

~~~text
n=3 four-way swap        8 writes
n=3 transpose+reverse   12 writes
n=3 copy                18 writes
  all three equal: true
  first row after: [7, 4, 1]
n=4 four-way swap       16 writes
n=4 transpose+reverse   28 writes
n=4 copy                32 writes
  all three equal: true
  first row after: [13, 9, 5, 1]
n=5 four-way swap       24 writes
n=5 transpose+reverse   40 writes
n=5 copy                50 writes
  all three equal: true
  first row after: [21, 16, 11, 6, 1]
~~~

All three produce the same matrix. The four-way swap writes each moving cell exactly once (\`n² - 1\` cells move for odd n, since the centre stays: 8 for n = 3, 24 for n = 5; all 16 for n = 4). Transpose + reverse writes most cells twice (28 for n = 4). The copy writes n² cells into the new grid and n² back (32 for n = 4) and needs a whole second matrix.

**Example 3 — counter-clockwise, 180 degrees, round trips, and a rectangle:**

~~~python
def rotate_ccw(m):
    transpose(m)
    m.reverse()                  # reverse the ORDER of the rows (swaps row references)


def rotate_180(m):
    m.reverse()                  # flip upside down
    for row in m:
        row.reverse()            # then mirror left-right


def rotate_rect_cw(m):           # R x C -> C x R, so it cannot be done in the same storage
    rows, cols = len(m), len(m[0])
    return [[m[rows - 1 - r][c] for r in range(rows)] for c in range(cols)]
~~~

~~~text
counter-clockwise: 3 6 9 | 2 5 8 | 1 4 7
180 degrees:       9 8 7 | 6 5 4 | 3 2 1
four clockwise turns give the original: true
clockwise then counter-clockwise is a no-op: true
2x3 rotated clockwise: 4 1 | 5 2 | 6 3
~~~

\`m.reverse()\` on the outer list reverses the **order of the rows**; it moves references to row lists, not the numbers inside them, so it is cheap. A 2×3 matrix rotated clockwise becomes 3×2, which is why only square matrices can be rotated in their own storage.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy into a new matrix | O(n²) | O(n²) | Every cell is copied to its new position in a second grid. |
| \`zip(*m[::-1])\` one-liner | O(n²) | O(n²) | Builds a reversed copy, tuples, then new lists. |
| Transpose + reverse rows | O(n²) | O(1) | Each pair above the diagonal is swapped once, each row reversed once. |
| Four-way layer swap | O(n²) | O(1) | Each moving cell is written once; one temporary variable. |

O(n²) is optimal: every cell (except possibly the centre) has to move. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty matrix \`[]\`:** both loops are empty; nothing happens.
- **1×1:** nothing moves (Example 1).
- **2×2:** a single group of four in the four-way version; one swap in the transpose.
- **Odd n:** the centre cell never moves; the layer loop runs \`n // 2\` times and skips it.
- **Non-square input:** the in-place algorithm is wrong for it. Check \`all(len(row) == n for row in matrix)\` if the input is not guaranteed square, and fall back to building a new matrix.

## Common Pitfalls

- **Transposing the whole square.** \`for j in range(n)\` (instead of \`range(i + 1, n)\`) swaps every pair twice, which puts everything back where it started.
- **\`row = row[::-1]\` in the loop.** It rebinds the loop variable and leaves the matrix unchanged; use \`row.reverse()\`.
- **Building test matrices with \`[[0] * n] * n\`.** All rows are the same list, so the rotation produces nonsense. Use a comprehension.
- **Calling the \`zip\` one-liner "in place".** It is O(n²) extra space, even with \`m[:] =\`.
- **Reversing the wrong thing.** Reversing the row order (\`m.reverse()\`) after a transpose gives the counter-clockwise rotation, not clockwise.
- **Off-by-one in the four-way swap.** The inner loop is \`range(first, last)\` (not \`last + 1\`); the last corner belongs to the group that starts at \`first\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Transpose (swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[i][j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[j][i]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &gt; i</code>), then reverse every row with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row.reverse()</code>. O(n²) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">A clockwise turn sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, n - 1 - r)</code>; the transpose does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, r)</code>, and reversing a row does column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1 - x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The alternative:</strong> <span style="color:#f0e2c8;">Ring by ring, rotate groups of four cells with one temporary: left to top, bottom to left, right to bottom, saved top to right. Each cell is written once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The Pythonic shortcut:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[:] = [list(r) for r in zip(*matrix[::-1])]</code> is a correct one-liner, but it builds new lists, so it is O(n²) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> must start at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row = row[::-1]</code> does not change the matrix, and in-place rotation only works for square matrices.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rotate counter-clockwise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transpose, then reverse the order of the rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix.reverse()</code>. Or reverse each row first and then transpose. Example 3 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 6 9 | 2 5 8 | 1 4 7</code> for the 3×3 grid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rotate by 180 degrees?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reverse the row order and then reverse each row; no transpose needed. Two clockwise rotations give the same result but do more work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the matrix is not square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An R×C matrix becomes C×R, so it cannot live in the same list of lists without changing its shape. I would build a new matrix with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[m[R - 1 - r][c] for r in range(R)] for c in range(C)]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the time O(n²) and not O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n is the side length, and there are n² cells; almost every one of them has to move, so no algorithm can do better than O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would NumPy help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numpy.rot90</code> exists for real image work, but it is not part of the standard library and interviewers want the index reasoning, so I would mention it and still write the loops.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation mapping | Clockwise: \`(r, c)\` goes to \`(c, n - 1 - r)\`. |
| Transpose | Swapping \`(r, c)\` with \`(c, r)\`: a flip across the main diagonal. |
| Layer (ring) | All cells at the same distance from the border; an n×n matrix has \`n // 2\` of them. |
| Aliasing | Two references to the same object, so a change through one shows through the other. |

**Conclusion:** A 90-degree clockwise rotation sends \`(r, c)\` to \`(c, n - 1 - r)\`, and you can get there in place either by transposing and reversing each row or by rotating groups of four cells ring by ring. Both are O(n²) time and O(1) extra space. In Python, mutate the inner lists (\`row.reverse()\`) rather than rebinding names, build matrices with comprehensions to avoid aliased rows, and treat the \`zip(*m[::-1])\` one-liner as a nice aside rather than the in-place answer.`,
        examples: [
          {
            label: "Transpose, then reverse each row (1x1 to 4x4)",
            code: `# Rotate an N x N matrix 90 degrees clockwise in place: transpose, then reverse each row.
def rotate(matrix):
    n = len(matrix)
    for i in range(n):                     # 1. transpose: swap across the main diagonal
        for j in range(i + 1, n):          #    j starts at i + 1, so each pair is swapped once
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:                     # 2. reverse every row
        row.reverse()                      #    row is the same list object, so this is in place

def show(title, matrix):
    print(title)
    for row in matrix:
        print("  [" + ", ".join(str(x) for x in row) + "]")

def make(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]

for n in (1, 2, 3, 4):
    m = make(n)
    show(str(n) + "x" + str(n) + " before:", m)
    rotate(m)
    show(str(n) + "x" + str(n) + " after:", m)
`,
          },
          {
            label: "Four-way layer swap vs transpose + reverse vs copying, counting writes",
            code: `# Layer-by-layer four-way swap vs transpose + reverse vs copying, with write counts.
writes = 0

def rotate_layers(m):
    global writes
    n = len(m)
    for layer in range(n // 2):
        first, last = layer, n - 1 - layer
        for i in range(first, last):
            offset = i - first
            top = m[first][i]                                  # save top
            m[first][i] = m[last - offset][first]              # left   -> top
            m[last - offset][first] = m[last][last - offset]   # bottom -> left
            m[last][last - offset] = m[i][last]                # right  -> bottom
            m[i][last] = top                                   # top    -> right
            writes += 4

def rotate_transpose(m):
    global writes
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):
            m[i][j], m[j][i] = m[j][i], m[i][j]
            writes += 2
    for row in m:
        for lo in range(n // 2):
            hi = n - 1 - lo
            row[lo], row[hi] = row[hi], row[lo]
            writes += 2

def rotate_copy(m):
    global writes
    n = len(m)
    out = [[0] * n for _ in range(n)]
    for r in range(n):
        for c in range(n):
            out[c][n - 1 - r] = m[r][c]                        # (r, c) goes to (c, n - 1 - r)
            writes += 1
    for r in range(n):
        for c in range(n):
            m[r][c] = out[r][c]
            writes += 1

def make(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]

for n in (3, 4, 5):
    results = []
    for name, fn in (("four-way swap", rotate_layers), ("transpose+reverse", rotate_transpose), ("copy", rotate_copy)):
        m = make(n)
        writes = 0
        fn(m)
        results.append(m)
        print("n=" + str(n) + " " + name.ljust(18) + str(writes).rjust(4) + " writes")
    print("  all three equal: " + str(results[0] == results[1] == results[2]).lower())
    print("  first row after: [" + ", ".join(str(x) for x in results[0][0]) + "]")
`,
          },
          {
            label: "Counter-clockwise, 180 degrees, four turns, and a non-square matrix",
            code: `# Counter-clockwise, 180 degrees, four turns, and a non-square matrix (needs a new matrix).
def transpose(m):
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):
            m[i][j], m[j][i] = m[j][i], m[i][j]

def rotate_cw(m):
    transpose(m)
    for row in m:
        row.reverse()

def rotate_ccw(m):
    transpose(m)
    m.reverse()                  # reverse the ORDER of the rows (swaps row references)

def rotate_180(m):
    m.reverse()                  # flip upside down
    for row in m:
        row.reverse()            # then mirror left-right

def rotate_rect_cw(m):           # R x C -> C x R, so it cannot be done in the same storage
    rows, cols = len(m), len(m[0])
    return [[m[rows - 1 - r][c] for r in range(rows)] for c in range(cols)]

def show(title, m):
    print(title + " " + " | ".join(" ".join(str(x) for x in row) for row in m))

def make(n):
    return [[r * n + c + 1 for c in range(n)] for r in range(n)]

m = make(3); rotate_ccw(m); show("counter-clockwise:", m)
m = make(3); rotate_180(m); show("180 degrees:      ", m)
m = make(3)
for _ in range(4):
    rotate_cw(m)
print("four clockwise turns give the original: " + str(m == make(3)).lower())
m = make(3); rotate_cw(m); rotate_ccw(m)
print("clockwise then counter-clockwise is a no-op: " + str(m == make(3)).lower())
show("2x3 rotated clockwise:", rotate_rect_cw([[1, 2, 3], [4, 5, 6]]))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get an n by n matrix as a JavaScript array of arrays, for example pixel values of an image. Rotate it 90 degrees clockwise in place: change the given arrays rather than returning a new matrix."

**What a strong answer should cover:**
- The mapping: cell \`(r, c)\` goes to \`(c, n - 1 - r)\`; a copy is easy but O(n²) extra space.
- Transpose (swap \`m[i][j]\` and \`m[j][i]\` for \`j > i\` only), then reverse each row; O(n²) time, O(1) extra space.
- The alternative four-way swap per layer, and counter-clockwise (transpose, then reverse the row order).
- Only square matrices can be rotated in place.
- JavaScript specifics: \`Array.prototype.reverse()\` mutates (while ES2023 \`toReversed()\` copies), \`m[0].map((_, c) => m.map(r => r[c]).reverse())\` builds a new matrix, and \`new Array(n).fill(new Array(n).fill(0))\` puts the same row object in every slot.

**Clarifying questions expected:**
- "Clockwise or counter-clockwise, and is it always square?"
- "Must I mutate the input, or may I return a new matrix?"

**Code / implementation expected:** Yes — a JavaScript \`rotate(matrix)\` that transposes and reverses each row in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need JavaScript arrays of arrays and nested loops.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`node\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are holding a printed photo and you turn it a quarter turn to the right. The top edge of the picture is now on the right side, the left edge is now the top, and the person who was standing upright is now lying on their side. Every point of the photo moved, but nothing was added or lost.

A digital image is a grid of pixels, and turning it is exactly this question: rotate an N×N matrix by 90 degrees. The interview twist is **in place**: you may not make a second grid. Picture rearranging tiles on a square floor where there is no spare space to put tiles down; you can only swap tiles that are already on the floor.

There is a neat trick (flip along the diagonal, then mirror) and a more "mechanical" one (move four tiles at a time around each ring). Knowing both, and being able to explain why they are the same rotation, is what the interviewer is checking. The same index reasoning comes back in [spiral order traversal](/interview-question/how-do-you-traverse-a-matrix-in-spiral-order) and [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clockwise or counter-clockwise? | The two use different second steps (reverse rows vs reverse the row order). |
| Is the matrix always square? | Only a square matrix can be rotated in its own storage: an R×C matrix becomes C×R. |
| Must it be in place, or may I return a new matrix? | A copy is trivial (\`out[c][n-1-r] = m[r][c]\`); in place with O(1) extra space is the real question. |
| Can it be empty or 1×1? | Both should simply return without doing anything. |
| What are the element types? | Irrelevant to the algorithm, but tells you whether swaps are cheap (numbers) or move big objects. |

## 3. The Core Idea

First, where does each cell go? Turning the grid a quarter turn clockwise sends the **top row to the right column**, the second row to the second-from-right column, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Rotating a 3 by 3 matrix clockwise. The top row 1 2 3 becomes the right column, read from top to bottom">
  <defs>
    <marker id="b09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="137" y="30" text-anchor="middle">before</text>
  <text class="d-text" x="463" y="30" text-anchor="middle">after 90 degrees clockwise</text>
  <rect class="d-box-accent" x="64" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="114" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="77" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="164" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="64" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="127" text-anchor="middle">4</text>
  <rect class="d-box" x="114" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="164" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="64" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="114" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="177" text-anchor="middle">8</text>
  <rect class="d-box" x="164" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="390" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="440" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="77" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="490" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="440" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="127" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="440" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="490" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="177" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 125 L 350 125" marker-end="url(#b09q3-arrow)"/>
  <text class="d-sub" x="295" y="108" text-anchor="middle">row r</text>
  <text class="d-sub" x="295" y="150" text-anchor="middle">to column</text>
  <text class="d-sub" x="295" y="168" text-anchor="middle">n - 1 - r</text>
</svg>

In index terms, with rows and columns numbered from 0:

📌 **Interview term: Rotation mapping** — for a 90-degree clockwise turn, the cell at row \`r\`, column \`c\` moves to row \`c\`, column \`n - 1 - r\`. Counter-clockwise, it moves to row \`n - 1 - c\`, column \`r\`.

If you had a spare grid, that formula is the whole solution: \`out[c][n - 1 - r] = m[r][c]\` for every cell. That costs O(n²) extra memory. The question asks for O(1) extra memory, so we need ways to reach the same result with swaps only.

### Approach 1: transpose, then reverse each row

📌 **Interview term: Transpose** — flipping a matrix across its main diagonal (top-left to bottom-right): cell \`(r, c)\` swaps with cell \`(c, r)\`. The diagonal cells stay where they are.

Transposing sends \`(r, c)\` to \`(c, r)\`. Reversing each row then sends column \`x\` to column \`n - 1 - x\`, so \`(c, r)\` goes to \`(c, n - 1 - r)\`. That is exactly the rotation mapping.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Two steps. Start 1 to 9. Transpose swaps across the diagonal, giving 1 4 7, 2 5 8, 3 6 9. Reversing each row gives 7 4 1, 8 5 2, 9 6 3">
  <defs>
    <marker id="b09q3b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="102" y="30" text-anchor="middle">start</text>
  <text class="d-text" x="340" y="30" text-anchor="middle">1. transpose</text>
  <text class="d-text" x="578" y="30" text-anchor="middle">2. reverse each row</text>
  <rect class="d-box-accent" x="30" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="80" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="77" text-anchor="middle">2</text>
  <rect class="d-box" x="130" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="30" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="127" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="80" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="130" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="30" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="80" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="177" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="130" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="177" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="268" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="318" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="368" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="268" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="127" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="318" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="368" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="268" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="177" text-anchor="middle">3</text>
  <rect class="d-box" x="318" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="368" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="506" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="556" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="606" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="506" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="556" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="606" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="506" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="556" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="177" text-anchor="middle">6</text>
  <rect class="d-box" x="606" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="177" text-anchor="middle">3</text>
  <path class="d-edge" d="M 186 125 L 256 125" marker-end="url(#b09q3b-arrow)"/>
  <path class="d-edge" d="M 424 125 L 494 125" marker-end="url(#b09q3b-arrow)"/>
  <text class="d-sub" x="340" y="228" text-anchor="middle">diagonal stays put</text>
</svg>

The highlighted cells are the main diagonal: the transpose leaves them alone. Only the pairs **above** the diagonal are swapped with their mirror below it, so the inner loop starts at \`j = i + 1\`. Starting at \`j = 0\` would swap every pair twice and undo the transpose.

### Approach 2: four-way swaps, ring by ring

📌 **Interview term: Layer (ring)** — the cells at the same distance from the edge. A 4×4 matrix has 2 layers (the outer border and the inner 2×2); an n×n matrix has \`n / 2\` layers (rounded down; the centre cell of an odd n never moves).

Within one layer, each cell belongs to a group of four that rotate into each other: top → right → bottom → left → top. Save the top one in a temporary variable, then move left → top, bottom → left, right → bottom, and the saved top → right. One temporary variable, four writes, and four cells are in their final places.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="Four way swap on the outer layer of a 4 by 4 matrix. The four corners 1 4 16 13 move one corner clockwise each: 1 to top right, 4 to bottom right, 16 to bottom left, 13 to top left">
  <defs>
    <marker id="b09q3c-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="87" text-anchor="middle">1</text>
  <rect class="d-box" x="250" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="87" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="87" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="350" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="87" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="137" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="250" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="137" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="300" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="137" text-anchor="middle">7</text>
  <rect class="d-box" x="350" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="137" text-anchor="middle">8</text>
  <rect class="d-box" x="200" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="187" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="250" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="187" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="300" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="187" text-anchor="middle">11</text>
  <rect class="d-box" x="350" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="187" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="200" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="237" text-anchor="middle">13</text>
  <rect class="d-box" x="250" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="237" text-anchor="middle">14</text>
  <rect class="d-box" x="300" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="237" text-anchor="middle">15</text>
  <rect class="d-box-accent" x="350" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="237" text-anchor="middle">16</text>
  <path class="d-edge-accent" d="M 222 48 Q 296 10 370 48" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 410 82 Q 450 156 410 230" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 370 270 Q 296 308 222 270" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 188 230 Q 148 156 188 82" marker-end="url(#b09q3c-arrow)"/>
  <text class="d-sub" x="500" y="150" text-anchor="middle">top to right</text>
  <text class="d-sub" x="500" y="170" text-anchor="middle">right to bottom</text>
  <text class="d-sub" x="90" y="150" text-anchor="middle">bottom to left</text>
  <text class="d-sub" x="90" y="170" text-anchor="middle">left to top</text>
</svg>

The four corners of the outer layer form one group; the next group is the cells one step along each side (2, 8, 15, 9), and so on. The inner grey 2×2 is the next layer and is handled the same way.

### Which approach to present

Transpose + reverse is easier to get right on a whiteboard and easy to explain. The four-way swap does fewer writes (each cell is written once, Example 2 counts them) but its index expressions are easy to get wrong. A good answer gives the first, and mentions the second.

## 4. JavaScript Idioms and Traps for Matrices

We ran the common one-liner and the two traps that most often break matrix code in JavaScript:

~~~javascript
const m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const rotated = m[0].map((_, c) => m.map((row) => row[c]).reverse());   // new matrix
console.log('map one-liner: ' + JSON.stringify(rotated) + ', original unchanged: ' + JSON.stringify(m));

const bad = new Array(3).fill(new Array(3).fill(0));   // fill() puts the SAME row object in every slot
bad[0][0] = 99;
console.log('fill(new Array(3)) after bad[0][0] = 99: ' + JSON.stringify(bad));
const good = Array.from({ length: 3 }, () => new Array(3).fill(0));
good[0][0] = 99;
console.log('Array.from after good[0][0] = 99: ' + JSON.stringify(good));

const r = [1, 2, 3];
const copy = r.toReversed();                           // ES2023: returns a reversed copy
console.log('toReversed: ' + JSON.stringify(copy) + ', original: ' + JSON.stringify(r));
~~~

~~~text
map one-liner: [[7,4,1],[8,5,2],[9,6,3]], original unchanged: [[1,2,3],[4,5,6],[7,8,9]]
fill(new Array(3)) after bad[0][0] = 99: [[99,0,0],[99,0,0],[99,0,0]]
Array.from after good[0][0] = 99: [[99,0,0],[0,0,0],[0,0,0]]
toReversed: [3,2,1], original: [1,2,3]
~~~

What this shows:

- **The \`map\` one-liner** builds column \`c\` of the old matrix as a new row and reverses it. It is correct and leaves the input unchanged, which is exactly why it is not the in-place answer: it allocates a whole new n×n matrix.
- **\`new Array(3).fill(new Array(3).fill(0))\` is one row, three times.** \`fill\` evaluates its argument once and puts that same array object in every slot, so writing \`bad[0][0]\` changed every row. Build matrices with \`Array.from({ length: n }, () => new Array(n).fill(0))\`, which calls the factory function once per row.
- **\`reverse()\` mutates, \`toReversed()\` copies.** For in-place rotation you want \`row.reverse()\`. \`toReversed()\` (ES2023, see [toReversed](/interview-question/how-does-array-prototype-toreversed-avoid-the-classic-bug-of-accidentally-mutati)) returns a new array and leaves the row as it was.

📌 **Interview term: Aliasing** — two references to the same object, so a change through one is visible through the other.

## 5. The In-Place Code in JavaScript

~~~javascript
function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {            // 1. transpose: swap across the main diagonal
    for (let j = i + 1; j < n; j++) {      //    j starts at i + 1, so each pair is swapped once
      const t = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = t;
    }
  }
  for (const row of matrix) row.reverse(); // 2. reverse every row (Array.prototype.reverse is in place)
}
~~~

Walk-through:

- The double loop only visits cells above the diagonal (\`j\` starts at \`i + 1\`), and swaps each with its mirror using a temporary \`t\`.
- \`for (const row of matrix) row.reverse();\` — \`row\` is a reference to the inner array, so \`reverse()\` changes the matrix itself. \`const\` only means the loop variable is not reassigned; the array it points to can still be mutated.
- An empty matrix or a 1×1 matrix goes through both loops untouched.

The four-way swap version:

~~~javascript
function rotateLayers(m) {
  const n = m.length;
  for (let layer = 0; layer < Math.floor(n / 2); layer++) {
    const first = layer, last = n - 1 - layer;
    for (let i = first; i < last; i++) {
      const offset = i - first;
      const top = m[first][i];                                 // save top
      m[first][i] = m[last - offset][first];                   // left   -> top
      m[last - offset][first] = m[last][last - offset];        // bottom -> left
      m[last][last - offset] = m[i][last];                     // right  -> bottom
      m[i][last] = top;                                        // top    -> right
      writes += 4;
    }
  }
}
~~~

\`first\` and \`last\` bound the current layer, \`i\` walks along its top edge (stopping before the last corner), and \`offset\` is the distance from the start of the layer. \`Math.floor(n / 2)\` is needed because \`/\` in JavaScript is floating-point division: \`5 / 2\` is \`2.5\`, and while \`layer < 2.5\` would happen to work here, being explicit avoids surprises.

## 6. Verified: Running the Code

Each example was saved as \`main.js\` and run with \`node main.js\`.

**Example 1 — transpose + reverse on 1×1 to 4×4:**

~~~text
1x1 before:
  [1]
1x1 after:
  [1]
2x2 before:
  [1, 2]
  [3, 4]
2x2 after:
  [3, 1]
  [4, 2]
3x3 before:
  [1, 2, 3]
  [4, 5, 6]
  [7, 8, 9]
3x3 after:
  [7, 4, 1]
  [8, 5, 2]
  [9, 6, 3]
4x4 before:
  [1, 2, 3, 4]
  [5, 6, 7, 8]
  [9, 10, 11, 12]
  [13, 14, 15, 16]
4x4 after:
  [13, 9, 5, 1]
  [14, 10, 6, 2]
  [15, 11, 7, 3]
  [16, 12, 8, 4]
~~~

The first row of every "before" grid ends up as the last column of the "after" grid.

**Example 2 — the three approaches compared, counting every write into a matrix cell:**

~~~text
n=3 four-way swap        8 writes
n=3 transpose+reverse   12 writes
n=3 copy                18 writes
  all three equal: true
  first row after: [7, 4, 1]
n=4 four-way swap       16 writes
n=4 transpose+reverse   28 writes
n=4 copy                32 writes
  all three equal: true
  first row after: [13, 9, 5, 1]
n=5 four-way swap       24 writes
n=5 transpose+reverse   40 writes
n=5 copy                50 writes
  all three equal: true
  first row after: [21, 16, 11, 6, 1]
~~~

All three agree. The four-way swap writes each moving cell once (8 for n = 3, 16 for n = 4, 24 for n = 5; the centre of an odd matrix never moves). Transpose + reverse writes most cells twice (28 for n = 4). The copy writes n² cells into a new grid and n² back, and needs a second matrix.

**Example 3 — counter-clockwise, 180 degrees, round trips, and a rectangle:**

~~~javascript
function rotateCcw(m) {
  transpose(m);
  m.reverse();                   // reverse the ORDER of the rows (moves row references)
}

function rotate180(m) {
  m.reverse();                   // flip upside down
  for (const row of m) row.reverse();   // then mirror left-right
}

function rotateRectCw(m) {       // R x C -> C x R, so it cannot be done in the same storage
  const rows = m.length, cols = m[0].length;
  return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => m[rows - 1 - r][c]));
}
~~~

~~~text
counter-clockwise: 3 6 9 | 2 5 8 | 1 4 7
180 degrees:       9 8 7 | 6 5 4 | 3 2 1
four clockwise turns give the original: true
clockwise then counter-clockwise is a no-op: true
2x3 rotated clockwise: 4 1 | 5 2 | 6 3
~~~

\`m.reverse()\` on the outer array reverses the order of the rows by moving references, not numbers. The 2×3 input became 3×2, so a non-square matrix always needs a new array.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy into a new matrix / \`map\` one-liner | O(n²) | O(n²) | A second grid of n² cells. |
| Transpose + reverse rows | O(n²) | O(1) | Each pair above the diagonal is swapped once; each row reversed once. |
| Four-way layer swap | O(n²) | O(1) | Each moving cell is written once; one temporary. |

O(n²) is optimal because almost every cell has to move. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty matrix \`[]\`:** both loops are empty.
- **1×1:** nothing moves.
- **Odd n:** the centre cell stays; \`Math.floor(n / 2)\` layers.
- **Non-square or ragged input:** check \`matrix.every(row => row.length === n)\` if it is not guaranteed; otherwise reading past a short row returns \`undefined\` and the swap silently writes \`undefined\` into the grid.
- **Typed arrays (\`Uint8Array\` rows for pixels):** the same code works; \`reverse()\` exists on typed arrays too.

## Common Pitfalls

- **Transposing the whole square.** Starting \`j\` at 0 swaps every pair twice and undoes the transpose.
- **\`fill\` with an array.** \`new Array(n).fill(new Array(n).fill(0))\` shares one row; use \`Array.from\` with a factory.
- **Using \`toReversed()\` or \`[...row].reverse()\` and forgetting to store the result.** Both return a new array; the matrix is unchanged.
- **Returning a new matrix when the caller checks the input.** The \`map\` one-liner is correct but not in place.
- **Silent \`undefined\`.** A wrong index never throws in JavaScript; an off-by-one writes \`undefined\` into the matrix. Test with a 4×4 and a 5×5.
- **Reversing the row order instead of each row.** After a transpose, \`matrix.reverse()\` gives the counter-clockwise rotation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Transpose (swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[i][j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[j][i]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &gt; i</code>), then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row.reverse()</code> on every row. O(n²) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Clockwise sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, n - 1 - r)</code>; the transpose does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, r)</code>, and reversing a row does column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1 - x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The alternative:</strong> <span style="color:#f0e2c8;">Ring by ring, rotate groups of four cells with one temporary: left to top, bottom to left, right to bottom, saved top to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The JavaScript shortcut:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[0].map((_, c) =&gt; m.map(r =&gt; r[c]).reverse())</code> is a correct one-liner, but it builds a new matrix, so it is not in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code> mutates but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toReversed()</code> copies; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill(new Array(n))</code> shares one row between all slots.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rotate counter-clockwise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transpose, then reverse the order of the rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix.reverse()</code>. For the 3×3 grid our run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 6 9 | 2 5 8 | 1 4 7</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your test matrix rotate incorrectly when you built it with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fill</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> puts the same array object in every slot, so all rows are one row. Every swap changes "all rows" at once. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n }, () =&gt; ...)</code> creates a fresh row each time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the matrix is not square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An R×C matrix becomes C×R, so it cannot be done in the same arrays. I would return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: C }, (_, c) =&gt; Array.from({ length: R }, (_, r) =&gt; m[R - 1 - r][c]))</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rotate an image stored as one flat array of pixels?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the same mapping on flat indices: pixel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * n + c</code> goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c * n + (n - 1 - r)</code>. The four-way swap works directly on the flat array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const row</code> a problem when you reverse it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> stops the variable from being reassigned, not the array from being mutated, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row.reverse()</code> is fine.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation mapping | Clockwise: \`(r, c)\` goes to \`(c, n - 1 - r)\`. |
| Transpose | Swapping \`(r, c)\` with \`(c, r)\`: a flip across the main diagonal. |
| Layer (ring) | All cells at the same distance from the border; an n×n matrix has \`Math.floor(n / 2)\` of them. |
| Aliasing | Two references to the same object, so a change through one shows through the other. |

**Conclusion:** A 90-degree clockwise rotation sends \`(r, c)\` to \`(c, n - 1 - r)\`, and you reach it in place by transposing and reversing each row, or by rotating groups of four cells ring by ring. Both are O(n²) time and O(1) extra space. In JavaScript, rely on \`reverse()\` mutating, keep \`toReversed()\` and the \`map\` one-liner for when a copy is wanted, and never build a matrix with \`fill(new Array(...))\`.`,
        examples: [
          {
            label: "Transpose, then reverse each row (1x1 to 4x4)",
            code: `// Rotate an N x N matrix 90 degrees clockwise in place: transpose, then reverse each row.
function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {            // 1. transpose: swap across the main diagonal
    for (let j = i + 1; j < n; j++) {      //    j starts at i + 1, so each pair is swapped once
      const t = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = t;
    }
  }
  for (const row of matrix) row.reverse(); // 2. reverse every row (Array.prototype.reverse is in place)
}

function show(title, matrix) {
  console.log(title);
  for (const row of matrix) console.log('  [' + row.join(', ') + ']');
}

function make(n) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c + 1));
}

for (const n of [1, 2, 3, 4]) {
  const m = make(n);
  show(n + 'x' + n + ' before:', m);
  rotate(m);
  show(n + 'x' + n + ' after:', m);
}
`,
          },
          {
            label: "Four-way layer swap vs transpose + reverse vs copying, counting writes",
            code: `// Layer-by-layer four-way swap vs transpose + reverse vs copying, with write counts.
let writes = 0;

function rotateLayers(m) {
  const n = m.length;
  for (let layer = 0; layer < Math.floor(n / 2); layer++) {
    const first = layer, last = n - 1 - layer;
    for (let i = first; i < last; i++) {
      const offset = i - first;
      const top = m[first][i];                                 // save top
      m[first][i] = m[last - offset][first];                   // left   -> top
      m[last - offset][first] = m[last][last - offset];        // bottom -> left
      m[last][last - offset] = m[i][last];                     // right  -> bottom
      m[i][last] = top;                                        // top    -> right
      writes += 4;
    }
  }
}

function rotateTranspose(m) {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
      writes += 2;
    }
  }
  for (const row of m) {
    for (let lo = 0; lo < Math.floor(n / 2); lo++) {
      const hi = n - 1 - lo;
      const t = row[lo]; row[lo] = row[hi]; row[hi] = t;
      writes += 2;
    }
  }
}

function rotateCopy(m) {
  const n = m.length;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) { out[c][n - 1 - r] = m[r][c]; writes++; }   // (r, c) goes to (c, n - 1 - r)
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) { m[r][c] = out[r][c]; writes++; }
  }
}

function make(n) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c + 1));
}

function pad(s, w, left) {
  s = String(s);
  while (s.length < w) s = left ? ' ' + s : s + ' ';
  return s;
}

for (const n of [3, 4, 5]) {
  const results = [];
  for (const [name, fn] of [['four-way swap', rotateLayers], ['transpose+reverse', rotateTranspose], ['copy', rotateCopy]]) {
    const m = make(n);
    writes = 0;
    fn(m);
    results.push(m);
    console.log('n=' + n + ' ' + pad(name, 18, false) + pad(writes, 4, true) + ' writes');
  }
  const key = (m) => m.map((row) => row.join(',')).join(';');
  console.log('  all three equal: ' + (key(results[0]) === key(results[1]) && key(results[1]) === key(results[2])));
  console.log('  first row after: [' + results[0][0].join(', ') + ']');
}
`,
          },
          {
            label: "Counter-clockwise, 180 degrees, four turns, and a non-square matrix",
            code: `// Counter-clockwise, 180 degrees, four turns, and a non-square matrix (needs a new matrix).
function transpose(m) {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
    }
  }
}

function rotateCw(m) {
  transpose(m);
  for (const row of m) row.reverse();
}

function rotateCcw(m) {
  transpose(m);
  m.reverse();                   // reverse the ORDER of the rows (moves row references)
}

function rotate180(m) {
  m.reverse();                   // flip upside down
  for (const row of m) row.reverse();   // then mirror left-right
}

function rotateRectCw(m) {       // R x C -> C x R, so it cannot be done in the same storage
  const rows = m.length, cols = m[0].length;
  return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => m[rows - 1 - r][c]));
}

function show(title, m) {
  console.log(title + ' ' + m.map((row) => row.join(' ')).join(' | '));
}
function make(n) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c + 1));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let m = make(3); rotateCcw(m); show('counter-clockwise:', m);
m = make(3); rotate180(m); show('180 degrees:      ', m);
m = make(3);
for (let t = 0; t < 4; t++) rotateCw(m);
console.log('four clockwise turns give the original: ' + same(m, make(3)));
m = make(3); rotateCw(m); rotateCcw(m);
console.log('clockwise then counter-clockwise is a no-op: ' + same(m, make(3)));
show('2x3 rotated clockwise:', rotateRectCw([[1, 2, 3], [4, 5, 6]]));
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an n by n \`int[][]\` matrix. In Java, rotate it 90 degrees clockwise in place, without allocating another matrix."

**What a strong answer should cover:**
- The mapping: cell \`(r, c)\` goes to \`(c, n - 1 - r)\`; a copy is easy but O(n²) extra space.
- Transpose (swap \`m[i][j]\` and \`m[j][i]\` for \`j > i\`), then reverse each row; O(n²) time, O(1) extra space.
- The four-way swap per layer, and counter-clockwise (transpose, then reverse the row order).
- Only square matrices can be rotated in place.
- Java specifics: an \`int[][]\` is an array of row arrays (rows can even have different lengths), so reversing the row order is just swapping row references; there is no built-in reverse for \`int[]\`; print with \`Arrays.deepToString\`; in \`for (int[] row : m)\` the row is a reference, but in \`for (int x : row)\` x is a copy.

**Clarifying questions expected:**
- "Clockwise or counter-clockwise, and is it guaranteed square?"
- "Must it be in place?"

**Code / implementation expected:** Yes — a static \`void rotate(int[][] matrix)\` with transpose and row reversal.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Java 2D arrays and nested loops.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`javac\` and run with \`java\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are holding a printed photo and you turn it a quarter turn to the right. The top edge of the picture is now on the right side, the left edge is now the top, and the person who was standing upright is now lying on their side. Every point of the photo moved, but nothing was added or lost.

A digital image is a grid of pixels, and turning it is exactly this question: rotate an N×N matrix by 90 degrees. The interview twist is **in place**: you may not make a second grid. Picture rearranging tiles on a square floor where there is no spare space to put tiles down; you can only swap tiles that are already on the floor.

There is a neat trick (flip along the diagonal, then mirror) and a more "mechanical" one (move four tiles at a time around each ring). Knowing both, and being able to explain why they are the same rotation, is what the interviewer is checking. The same index reasoning comes back in [spiral order traversal](/interview-question/how-do-you-traverse-a-matrix-in-spiral-order) and [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clockwise or counter-clockwise? | The two use different second steps (reverse rows vs reverse the row order). |
| Is the matrix always square? | Only a square matrix can be rotated in its own storage: an R×C matrix becomes C×R. |
| Must it be in place, or may I return a new matrix? | A copy is trivial (\`out[c][n-1-r] = m[r][c]\`); in place with O(1) extra space is the real question. |
| Can it be empty or 1×1? | Both should simply return without doing anything. |
| What are the element types? | Irrelevant to the algorithm, but tells you whether swaps are cheap (numbers) or move big objects. |

## 3. The Core Idea

First, where does each cell go? Turning the grid a quarter turn clockwise sends the **top row to the right column**, the second row to the second-from-right column, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Rotating a 3 by 3 matrix clockwise. The top row 1 2 3 becomes the right column, read from top to bottom">
  <defs>
    <marker id="b09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="137" y="30" text-anchor="middle">before</text>
  <text class="d-text" x="463" y="30" text-anchor="middle">after 90 degrees clockwise</text>
  <rect class="d-box-accent" x="64" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="114" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="77" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="164" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="64" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="127" text-anchor="middle">4</text>
  <rect class="d-box" x="114" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="164" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="64" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="114" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="177" text-anchor="middle">8</text>
  <rect class="d-box" x="164" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="390" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="440" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="77" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="490" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="440" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="127" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="440" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="490" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="177" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 125 L 350 125" marker-end="url(#b09q3-arrow)"/>
  <text class="d-sub" x="295" y="108" text-anchor="middle">row r</text>
  <text class="d-sub" x="295" y="150" text-anchor="middle">to column</text>
  <text class="d-sub" x="295" y="168" text-anchor="middle">n - 1 - r</text>
</svg>

In index terms, with rows and columns numbered from 0:

📌 **Interview term: Rotation mapping** — for a 90-degree clockwise turn, the cell at row \`r\`, column \`c\` moves to row \`c\`, column \`n - 1 - r\`. Counter-clockwise, it moves to row \`n - 1 - c\`, column \`r\`.

If you had a spare grid, that formula is the whole solution: \`out[c][n - 1 - r] = m[r][c]\` for every cell. That costs O(n²) extra memory. The question asks for O(1) extra memory, so we need ways to reach the same result with swaps only.

### Approach 1: transpose, then reverse each row

📌 **Interview term: Transpose** — flipping a matrix across its main diagonal (top-left to bottom-right): cell \`(r, c)\` swaps with cell \`(c, r)\`. The diagonal cells stay where they are.

Transposing sends \`(r, c)\` to \`(c, r)\`. Reversing each row then sends column \`x\` to column \`n - 1 - x\`, so \`(c, r)\` goes to \`(c, n - 1 - r)\`. That is exactly the rotation mapping.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Two steps. Start 1 to 9. Transpose swaps across the diagonal, giving 1 4 7, 2 5 8, 3 6 9. Reversing each row gives 7 4 1, 8 5 2, 9 6 3">
  <defs>
    <marker id="b09q3b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="102" y="30" text-anchor="middle">start</text>
  <text class="d-text" x="340" y="30" text-anchor="middle">1. transpose</text>
  <text class="d-text" x="578" y="30" text-anchor="middle">2. reverse each row</text>
  <rect class="d-box-accent" x="30" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="80" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="77" text-anchor="middle">2</text>
  <rect class="d-box" x="130" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="30" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="127" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="80" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="130" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="30" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="80" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="177" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="130" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="177" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="268" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="318" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="368" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="268" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="127" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="318" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="368" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="268" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="177" text-anchor="middle">3</text>
  <rect class="d-box" x="318" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="368" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="506" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="556" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="606" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="506" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="556" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="606" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="506" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="556" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="177" text-anchor="middle">6</text>
  <rect class="d-box" x="606" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="177" text-anchor="middle">3</text>
  <path class="d-edge" d="M 186 125 L 256 125" marker-end="url(#b09q3b-arrow)"/>
  <path class="d-edge" d="M 424 125 L 494 125" marker-end="url(#b09q3b-arrow)"/>
  <text class="d-sub" x="340" y="228" text-anchor="middle">diagonal stays put</text>
</svg>

The highlighted cells are the main diagonal: the transpose leaves them alone. Only the pairs **above** the diagonal are swapped with their mirror below it, so the inner loop starts at \`j = i + 1\`. Starting at \`j = 0\` would swap every pair twice and undo the transpose.

### Approach 2: four-way swaps, ring by ring

📌 **Interview term: Layer (ring)** — the cells at the same distance from the edge. A 4×4 matrix has 2 layers (the outer border and the inner 2×2); an n×n matrix has \`n / 2\` layers (rounded down; the centre cell of an odd n never moves).

Within one layer, each cell belongs to a group of four that rotate into each other: top → right → bottom → left → top. Save the top one in a temporary variable, then move left → top, bottom → left, right → bottom, and the saved top → right. One temporary variable, four writes, and four cells are in their final places.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="Four way swap on the outer layer of a 4 by 4 matrix. The four corners 1 4 16 13 move one corner clockwise each: 1 to top right, 4 to bottom right, 16 to bottom left, 13 to top left">
  <defs>
    <marker id="b09q3c-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="87" text-anchor="middle">1</text>
  <rect class="d-box" x="250" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="87" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="87" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="350" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="87" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="137" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="250" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="137" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="300" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="137" text-anchor="middle">7</text>
  <rect class="d-box" x="350" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="137" text-anchor="middle">8</text>
  <rect class="d-box" x="200" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="187" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="250" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="187" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="300" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="187" text-anchor="middle">11</text>
  <rect class="d-box" x="350" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="187" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="200" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="237" text-anchor="middle">13</text>
  <rect class="d-box" x="250" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="237" text-anchor="middle">14</text>
  <rect class="d-box" x="300" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="237" text-anchor="middle">15</text>
  <rect class="d-box-accent" x="350" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="237" text-anchor="middle">16</text>
  <path class="d-edge-accent" d="M 222 48 Q 296 10 370 48" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 410 82 Q 450 156 410 230" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 370 270 Q 296 308 222 270" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 188 230 Q 148 156 188 82" marker-end="url(#b09q3c-arrow)"/>
  <text class="d-sub" x="500" y="150" text-anchor="middle">top to right</text>
  <text class="d-sub" x="500" y="170" text-anchor="middle">right to bottom</text>
  <text class="d-sub" x="90" y="150" text-anchor="middle">bottom to left</text>
  <text class="d-sub" x="90" y="170" text-anchor="middle">left to top</text>
</svg>

The four corners of the outer layer form one group; the next group is the cells one step along each side (2, 8, 15, 9), and so on. The inner grey 2×2 is the next layer and is handled the same way.

### Which approach to present

Transpose + reverse is easier to get right on a whiteboard and easy to explain. The four-way swap does fewer writes (each cell is written once, Example 2 counts them) but its index expressions are easy to get wrong. A good answer gives the first, and mentions the second.

## 4. How Java Stores a 2D Array

Java has no true two-dimensional array. An \`int[][]\` is an array whose elements are references to separate \`int[]\` rows. That has consequences for this problem, so we ran a few checks:

~~~java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[][] m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        System.out.println("deepToString: " + Arrays.deepToString(m));
        System.out.println("toString starts with: " + Arrays.toString(m).substring(0, 3));

        int[][] jagged = {{1, 2, 3}, {4, 5}, {6}};          // legal in Java: rows are separate arrays
        System.out.println("jagged row lengths: " + jagged[0].length + " " + jagged[1].length + " " + jagged[2].length);

        for (int[] row : m) row[0] = 0;                     // row is a reference: this changes m
        System.out.println("after for (int[] row : m) row[0] = 0: " + Arrays.deepToString(m));
        for (int[] row : m) for (int x : row) x = 7;        // x is a copy of the int: no effect
        System.out.println("after for (int x : row) x = 7:      " + Arrays.deepToString(m));
    }
}
~~~

~~~text
deepToString: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
toString starts with: [[I
jagged row lengths: 3 2 1
after for (int[] row : m) row[0] = 0: [[0, 2, 3], [0, 5, 6], [0, 8, 9]]
after for (int x : row) x = 7:      [[0, 2, 3], [0, 5, 6], [0, 8, 9]]
~~~

What this shows:

- **Printing:** \`Arrays.toString(m)\` does not print the numbers: it printed text starting with \`[[I\`, which is how Java names an \`int[]\` type, followed by object hash codes. Use \`Arrays.deepToString(m)\`.
- **Rows are separate arrays,** so a "jagged" array with rows of length 3, 2 and 1 is legal. The rotation code assumes every row has length n; if the input is not guaranteed square, check it.
- **\`for (int[] row : m)\` gives you the row itself** (a copy of the reference), so \`row[0] = 0\` changed the matrix. **\`for (int x : row)\` gives you a copy of each number**, so \`x = 7\` changed nothing.
- Because rows are references, **reversing the order of the rows** (needed for counter-clockwise rotation) is just swapping n/2 references, not moving n² numbers.

📌 **Interview term: Jagged array** — an array of arrays whose inner arrays can have different lengths; Java's \`int[][]\` is one.

## 5. The In-Place Code in Java

~~~java
    static void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++) {              // 1. transpose: swap across the main diagonal
            for (int j = i + 1; j < n; j++) {      //    j starts at i + 1, so each pair is swapped once
                int t = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = t;
            }
        }
        for (int[] row : matrix) {                 // 2. reverse every row (row is a reference, not a copy)
            for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                int t = row[lo];
                row[lo] = row[hi];
                row[hi] = t;
            }
        }
    }
~~~

Walk-through:

- The transpose loop visits only cells above the diagonal (\`j\` from \`i + 1\`) and swaps through a temporary \`t\`.
- Java has no \`reverse\` for primitive arrays (\`Collections.reverse\` needs a \`List\`), so the row reversal is a two-index loop: \`lo\` from the left, \`hi\` from the right, swap and move inward until they meet.
- \`for (int[] row : matrix)\` works because \`row\` refers to the actual row array.
- An empty matrix (\`new int[0][0]\`) or 1×1 matrix passes through without any swaps.

The four-way swap version:

~~~java
    static void rotateLayers(int[][] m) {
        int n = m.length;
        for (int layer = 0; layer < n / 2; layer++) {
            int first = layer, last = n - 1 - layer;
            for (int i = first; i < last; i++) {
                int offset = i - first;
                int top = m[first][i];                                 // save top
                m[first][i] = m[last - offset][first];                 // left   -> top
                m[last - offset][first] = m[last][last - offset];      // bottom -> left
                m[last][last - offset] = m[i][last];                   // right  -> bottom
                m[i][last] = top;                                      // top    -> right
                writes += 4;
            }
        }
    }
~~~

\`first\` and \`last\` bound the current layer and \`offset\` is how far \`i\` is along its top edge. \`n / 2\` is integer division in Java, so for n = 5 there are 2 layers and the centre cell is skipped.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\`.

**Example 1 — transpose + reverse on 1×1 to 4×4:**

~~~text
1x1 before:
  [1]
1x1 after:
  [1]
2x2 before:
  [1, 2]
  [3, 4]
2x2 after:
  [3, 1]
  [4, 2]
3x3 before:
  [1, 2, 3]
  [4, 5, 6]
  [7, 8, 9]
3x3 after:
  [7, 4, 1]
  [8, 5, 2]
  [9, 6, 3]
4x4 before:
  [1, 2, 3, 4]
  [5, 6, 7, 8]
  [9, 10, 11, 12]
  [13, 14, 15, 16]
4x4 after:
  [13, 9, 5, 1]
  [14, 10, 6, 2]
  [15, 11, 7, 3]
  [16, 12, 8, 4]
~~~

The first row of every "before" grid ends up as the last column of the "after" grid.

**Example 2 — the three approaches compared, counting every write into a matrix cell:**

~~~text
n=3 four-way swap        8 writes
n=3 transpose+reverse   12 writes
n=3 copy                18 writes
  all three equal: true
  first row after: [7, 4, 1]
n=4 four-way swap       16 writes
n=4 transpose+reverse   28 writes
n=4 copy                32 writes
  all three equal: true
  first row after: [13, 9, 5, 1]
n=5 four-way swap       24 writes
n=5 transpose+reverse   40 writes
n=5 copy                50 writes
  all three equal: true
  first row after: [21, 16, 11, 6, 1]
~~~

All three agree (\`Arrays.deepEquals\` compares the contents of nested arrays; \`equals\` on arrays would compare references). The four-way swap writes each moving cell once (8, 16, 24 for n = 3, 4, 5). Transpose + reverse writes most cells twice. The copy writes n² cells twice and allocates a second matrix.

**Example 3 — counter-clockwise, 180 degrees, round trips, and a rectangle:**

~~~java
    static void reverseRowOrder(int[][] m) {      // swaps row references, not the numbers
        for (int lo = 0, hi = m.length - 1; lo < hi; lo++, hi--) { int[] t = m[lo]; m[lo] = m[hi]; m[hi] = t; }
    }

    static void rotateCcw(int[][] m) {
        transpose(m);
        reverseRowOrder(m);
    }

    static void rotate180(int[][] m) {
        reverseRowOrder(m);                       // flip upside down
        for (int[] row : m) reverseRow(row);      // then mirror left-right
    }

    static int[][] rotateRectCw(int[][] m) {      // R x C -> C x R, so it cannot be done in the same storage
        int rows = m.length, cols = m[0].length;
        int[][] out = new int[cols][rows];
        for (int c = 0; c < cols; c++)
            for (int r = 0; r < rows; r++) out[c][r] = m[rows - 1 - r][c];
        return out;
    }
~~~

~~~text
counter-clockwise: 3 6 9 | 2 5 8 | 1 4 7
180 degrees:       9 8 7 | 6 5 4 | 3 2 1
four clockwise turns give the original: true
clockwise then counter-clockwise is a no-op: true
2x3 rotated clockwise: 4 1 | 5 2 | 6 3
~~~

\`reverseRowOrder\` swaps \`int[]\` references, so flipping the matrix upside down costs O(n), not O(n²). The 2×3 input became a new 3×2 array, which is why non-square matrices cannot be rotated in place.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy into a new \`int[n][n]\` | O(n²) | O(n²) | A second grid of n² cells. |
| Transpose + reverse rows | O(n²) | O(1) | Each pair above the diagonal is swapped once; each row reversed once. |
| Four-way layer swap | O(n²) | O(1) | Each moving cell is written once; one temporary \`int\`. |
| Reverse the row order (for counter-clockwise) | O(n) | O(1) | Swaps row references only. |

O(n²) is optimal because almost every cell has to move. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty matrix:** \`matrix.length == 0\`; loops do nothing.
- **1×1:** nothing moves.
- **Odd n:** the centre cell stays; \`n / 2\` layers.
- **Jagged or non-square input:** \`matrix[j][i]\` may throw \`ArrayIndexOutOfBoundsException\`. Validate \`row.length == n\` for every row if the input is untrusted.
- **\`null\` rows:** a \`NullPointerException\` on \`row.length\`; out of scope unless the interviewer says otherwise.

## Common Pitfalls

- **Transposing the whole square.** \`j\` must start at \`i + 1\`; starting at 0 swaps every pair back.
- **Printing with \`Arrays.toString\` on a 2D array.** It prints references like \`[[I@...\`; use \`Arrays.deepToString\`.
- **Comparing matrices with \`equals\` or \`Arrays.equals\`.** Both compare the row references; use \`Arrays.deepEquals\`.
- **Mutating through \`for (int x : row)\`.** \`x\` is a copy; assign through \`row[c]\` instead.
- **Assuming rectangular storage.** Java allows jagged arrays, so a non-square input is possible and breaks the in-place algorithm.
- **Reversing the row order instead of each row** after a transpose: that is the counter-clockwise rotation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Transpose (swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[i][j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[j][i]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &gt; i</code>), then reverse each row with a two-index loop. O(n²) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Clockwise sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, n - 1 - r)</code>; the transpose does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, r)</code>, and reversing a row does column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1 - x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The alternative:</strong> <span style="color:#f0e2c8;">Ring by ring, rotate groups of four cells with one temporary <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>: left to top, bottom to left, right to bottom, saved top to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The Java details:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> is an array of row references, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int[] row : m)</code> mutates the real rows and reversing the row order only swaps references; there is no built-in reverse for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.deepToString</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.deepEquals</code> for 2D arrays, and in-place rotation only works when every row has length n.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rotate counter-clockwise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transpose, then reverse the order of the rows by swapping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> references. Our 3×3 run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 6 9 | 2 5 8 | 1 4 7</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Collections.reverse</code> for the rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not on an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>; it needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.asList(intArray)</code> would give a one-element list holding the array. For the outer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> it would work via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.asList(matrix)</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> is an object, but a manual loop is clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the matrix is not square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">R×C becomes C×R, so I allocate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[C][R]</code> and fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out[c][r] = m[R - 1 - r][c]</code>. In-place is impossible because the shape changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n²) and not O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n is the side length and there are n² cells; nearly every cell moves, so O(n²) is the lower bound.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the transpose cache-friendly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not perfectly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[j][i]</code> jumps to a different row array on every step, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[i][j]</code> walks along one row. For interview sizes it does not matter; for huge images, blocked (tiled) transposes are used.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation mapping | Clockwise: \`(r, c)\` goes to \`(c, n - 1 - r)\`. |
| Transpose | Swapping \`(r, c)\` with \`(c, r)\`: a flip across the main diagonal. |
| Layer (ring) | All cells at the same distance from the border; an n×n matrix has \`n / 2\` of them. |
| Jagged array | An array of arrays whose rows can have different lengths, like Java's \`int[][]\`. |

**Conclusion:** A 90-degree clockwise rotation sends \`(r, c)\` to \`(c, n - 1 - r)\`; transpose plus row reversal, or four-way swaps ring by ring, do it in place in O(n²) time and O(1) extra space. In Java, remember that an \`int[][]\` is an array of row references: that makes reversing the row order cheap, means \`for (int[] row : m)\` mutates the real rows, and means you need \`deepToString\` and \`deepEquals\` to print and compare matrices.`,
        examples: [
          {
            label: "Transpose, then reverse each row (1x1 to 4x4)",
            code: `// Rotate an N x N matrix 90 degrees clockwise in place: transpose, then reverse each row.
public class Main {
    static void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++) {              // 1. transpose: swap across the main diagonal
            for (int j = i + 1; j < n; j++) {      //    j starts at i + 1, so each pair is swapped once
                int t = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = t;
            }
        }
        for (int[] row : matrix) {                 // 2. reverse every row (row is a reference, not a copy)
            for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                int t = row[lo];
                row[lo] = row[hi];
                row[hi] = t;
            }
        }
    }

    static void show(String title, int[][] matrix) {
        System.out.println(title);
        for (int[] row : matrix) {
            StringBuilder sb = new StringBuilder("  [");
            for (int c = 0; c < row.length; c++) sb.append(c > 0 ? ", " : "").append(row[c]);
            System.out.println(sb.append("]"));
        }
    }

    static int[][] make(int n) {
        int[][] m = new int[n][n];
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
        return m;
    }

    public static void main(String[] args) {
        for (int n = 1; n <= 4; n++) {
            int[][] m = make(n);
            show(n + "x" + n + " before:", m);
            rotate(m);
            show(n + "x" + n + " after:", m);
        }
    }
}
`,
          },
          {
            label: "Four-way layer swap vs transpose + reverse vs copying, counting writes",
            code: `// Layer-by-layer four-way swap vs transpose + reverse vs copying, with write counts.
import java.util.Arrays;

public class Main {
    interface Rotation { void apply(int[][] m); }

    static int writes = 0;

    static void rotateLayers(int[][] m) {
        int n = m.length;
        for (int layer = 0; layer < n / 2; layer++) {
            int first = layer, last = n - 1 - layer;
            for (int i = first; i < last; i++) {
                int offset = i - first;
                int top = m[first][i];                                 // save top
                m[first][i] = m[last - offset][first];                 // left   -> top
                m[last - offset][first] = m[last][last - offset];      // bottom -> left
                m[last][last - offset] = m[i][last];                   // right  -> bottom
                m[i][last] = top;                                      // top    -> right
                writes += 4;
            }
        }
    }

    static void rotateTranspose(int[][] m) {
        int n = m.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
                writes += 2;
            }
        for (int[] row : m)
            for (int lo = 0; lo < n / 2; lo++) {
                int hi = n - 1 - lo;
                int t = row[lo]; row[lo] = row[hi]; row[hi] = t;
                writes += 2;
            }
    }

    static void rotateCopy(int[][] m) {
        int n = m.length;
        int[][] out = new int[n][n];
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++) { out[c][n - 1 - r] = m[r][c]; writes++; }   // (r, c) goes to (c, n - 1 - r)
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++) { m[r][c] = out[r][c]; writes++; }
    }

    static int[][] make(int n) {
        int[][] m = new int[n][n];
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
        return m;
    }

    public static void main(String[] args) {
        String[] names = {"four-way swap", "transpose+reverse", "copy"};
        Rotation[] fns = {Main::rotateLayers, Main::rotateTranspose, Main::rotateCopy};
        for (int n : new int[]{3, 4, 5}) {
            int[][][] results = new int[3][][];
            for (int f = 0; f < 3; f++) {
                int[][] m = make(n);
                writes = 0;
                fns[f].apply(m);
                results[f] = m;
                System.out.println("n=" + n + " " + String.format("%-18s%4d", names[f], writes) + " writes");
            }
            boolean equal = Arrays.deepEquals(results[0], results[1]) && Arrays.deepEquals(results[1], results[2]);
            System.out.println("  all three equal: " + equal);
            System.out.println("  first row after: " + Arrays.toString(results[0][0]));
        }
    }
}
`,
          },
          {
            label: "Counter-clockwise, 180 degrees, four turns, and a non-square matrix",
            code: `// Counter-clockwise, 180 degrees, four turns, and a non-square matrix (needs a new matrix).
import java.util.Arrays;

public class Main {
    static void transpose(int[][] m) {
        int n = m.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }
    }

    static void reverseRow(int[] row) {
        for (int lo = 0, hi = row.length - 1; lo < hi; lo++, hi--) { int t = row[lo]; row[lo] = row[hi]; row[hi] = t; }
    }

    static void rotateCw(int[][] m) {
        transpose(m);
        for (int[] row : m) reverseRow(row);
    }

    static void reverseRowOrder(int[][] m) {      // swaps row references, not the numbers
        for (int lo = 0, hi = m.length - 1; lo < hi; lo++, hi--) { int[] t = m[lo]; m[lo] = m[hi]; m[hi] = t; }
    }

    static void rotateCcw(int[][] m) {
        transpose(m);
        reverseRowOrder(m);
    }

    static void rotate180(int[][] m) {
        reverseRowOrder(m);                       // flip upside down
        for (int[] row : m) reverseRow(row);      // then mirror left-right
    }

    static int[][] rotateRectCw(int[][] m) {      // R x C -> C x R, so it cannot be done in the same storage
        int rows = m.length, cols = m[0].length;
        int[][] out = new int[cols][rows];
        for (int c = 0; c < cols; c++)
            for (int r = 0; r < rows; r++) out[c][r] = m[rows - 1 - r][c];
        return out;
    }

    static void show(String title, int[][] m) {
        StringBuilder sb = new StringBuilder(title);
        for (int r = 0; r < m.length; r++) {
            sb.append(r == 0 ? " " : " | ");
            for (int c = 0; c < m[r].length; c++) sb.append(c > 0 ? " " : "").append(m[r][c]);
        }
        System.out.println(sb);
    }

    static int[][] make(int n) {
        int[][] m = new int[n][n];
        for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
        return m;
    }

    public static void main(String[] args) {
        int[][] m = make(3); rotateCcw(m); show("counter-clockwise:", m);
        m = make(3); rotate180(m); show("180 degrees:      ", m);
        m = make(3);
        for (int t = 0; t < 4; t++) rotateCw(m);
        System.out.println("four clockwise turns give the original: " + Arrays.deepEquals(m, make(3)));
        m = make(3); rotateCw(m); rotateCcw(m);
        System.out.println("clockwise then counter-clockwise is a no-op: " + Arrays.deepEquals(m, make(3)));
        show("2x3 rotated clockwise:", rotateRectCw(new int[][]{{1, 2, 3}, {4, 5, 6}}));
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given an n by n matrix as a vector of vectors of ints. In C++, rotate it 90 degrees clockwise in place, without allocating another matrix."

**What a strong answer should cover:**
- The mapping: cell \`(r, c)\` goes to \`(c, n - 1 - r)\`; a copy is easy but O(n²) extra space.
- Transpose (\`std::swap(m[i][j], m[j][i])\` for \`j > i\`), then \`std::reverse\` each row; O(n²) time, O(1) extra space.
- The four-way swap per layer, and counter-clockwise (transpose, then \`std::reverse(m.begin(), m.end())\` on the row order).
- Only square matrices can be rotated in place.
- C++ specifics: \`for (auto row : m)\` copies each row (use \`auto&\`), swapping two \`std::vector\` rows is O(1) because only their internal pointers move, and \`operator[]\` has no bounds checking.

**Clarifying questions expected:**
- "Clockwise or counter-clockwise, and is it always square?"
- "Is the matrix a vector of vectors or one flat buffer?"

**Code / implementation expected:** Yes — \`void rotate(vector<vector<int>>& matrix)\` using \`std::swap\` and \`std::reverse\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need \`std::vector\` and nested loops.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`g++ -std=c++17\` and run, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are holding a printed photo and you turn it a quarter turn to the right. The top edge of the picture is now on the right side, the left edge is now the top, and the person who was standing upright is now lying on their side. Every point of the photo moved, but nothing was added or lost.

A digital image is a grid of pixels, and turning it is exactly this question: rotate an N×N matrix by 90 degrees. The interview twist is **in place**: you may not make a second grid. Picture rearranging tiles on a square floor where there is no spare space to put tiles down; you can only swap tiles that are already on the floor.

There is a neat trick (flip along the diagonal, then mirror) and a more "mechanical" one (move four tiles at a time around each ring). Knowing both, and being able to explain why they are the same rotation, is what the interviewer is checking. The same index reasoning comes back in [spiral order traversal](/interview-question/how-do-you-traverse-a-matrix-in-spiral-order) and [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clockwise or counter-clockwise? | The two use different second steps (reverse rows vs reverse the row order). |
| Is the matrix always square? | Only a square matrix can be rotated in its own storage: an R×C matrix becomes C×R. |
| Must it be in place, or may I return a new matrix? | A copy is trivial (\`out[c][n-1-r] = m[r][c]\`); in place with O(1) extra space is the real question. |
| Can it be empty or 1×1? | Both should simply return without doing anything. |
| What are the element types? | Irrelevant to the algorithm, but tells you whether swaps are cheap (numbers) or move big objects. |

## 3. The Core Idea

First, where does each cell go? Turning the grid a quarter turn clockwise sends the **top row to the right column**, the second row to the second-from-right column, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Rotating a 3 by 3 matrix clockwise. The top row 1 2 3 becomes the right column, read from top to bottom">
  <defs>
    <marker id="b09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="137" y="30" text-anchor="middle">before</text>
  <text class="d-text" x="463" y="30" text-anchor="middle">after 90 degrees clockwise</text>
  <rect class="d-box-accent" x="64" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="114" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="77" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="164" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="64" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="127" text-anchor="middle">4</text>
  <rect class="d-box" x="114" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="164" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="64" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="86" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="114" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="136" y="177" text-anchor="middle">8</text>
  <rect class="d-box" x="164" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="186" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="390" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="440" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="77" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="490" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="440" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="127" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="490" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="412" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="440" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="462" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="490" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="512" y="177" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 125 L 350 125" marker-end="url(#b09q3-arrow)"/>
  <text class="d-sub" x="295" y="108" text-anchor="middle">row r</text>
  <text class="d-sub" x="295" y="150" text-anchor="middle">to column</text>
  <text class="d-sub" x="295" y="168" text-anchor="middle">n - 1 - r</text>
</svg>

In index terms, with rows and columns numbered from 0:

📌 **Interview term: Rotation mapping** — for a 90-degree clockwise turn, the cell at row \`r\`, column \`c\` moves to row \`c\`, column \`n - 1 - r\`. Counter-clockwise, it moves to row \`n - 1 - c\`, column \`r\`.

If you had a spare grid, that formula is the whole solution: \`out[c][n - 1 - r] = m[r][c]\` for every cell. That costs O(n²) extra memory. The question asks for O(1) extra memory, so we need ways to reach the same result with swaps only.

### Approach 1: transpose, then reverse each row

📌 **Interview term: Transpose** — flipping a matrix across its main diagonal (top-left to bottom-right): cell \`(r, c)\` swaps with cell \`(c, r)\`. The diagonal cells stay where they are.

Transposing sends \`(r, c)\` to \`(c, r)\`. Reversing each row then sends column \`x\` to column \`n - 1 - x\`, so \`(c, r)\` goes to \`(c, n - 1 - r)\`. That is exactly the rotation mapping.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Two steps. Start 1 to 9. Transpose swaps across the diagonal, giving 1 4 7, 2 5 8, 3 6 9. Reversing each row gives 7 4 1, 8 5 2, 9 6 3">
  <defs>
    <marker id="b09q3b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="102" y="30" text-anchor="middle">start</text>
  <text class="d-text" x="340" y="30" text-anchor="middle">1. transpose</text>
  <text class="d-text" x="578" y="30" text-anchor="middle">2. reverse each row</text>
  <rect class="d-box-accent" x="30" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="80" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="77" text-anchor="middle">2</text>
  <rect class="d-box" x="130" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="30" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="127" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="80" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="130" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="127" text-anchor="middle">6</text>
  <rect class="d-box" x="30" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="52" y="177" text-anchor="middle">7</text>
  <rect class="d-box" x="80" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="102" y="177" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="130" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="152" y="177" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="268" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="318" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="368" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="268" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="127" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="318" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="368" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="268" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="290" y="177" text-anchor="middle">3</text>
  <rect class="d-box" x="318" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="340" y="177" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="368" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="390" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="506" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="77" text-anchor="middle">7</text>
  <rect class="d-box" x="556" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="606" y="50" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="77" text-anchor="middle">1</text>
  <rect class="d-box" x="506" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="127" text-anchor="middle">8</text>
  <rect class="d-box" x="556" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="127" text-anchor="middle">5</text>
  <rect class="d-box" x="606" y="100" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="506" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="528" y="177" text-anchor="middle">9</text>
  <rect class="d-box" x="556" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="578" y="177" text-anchor="middle">6</text>
  <rect class="d-box" x="606" y="150" width="44" height="44" rx="6"/>
  <text class="d-text" x="628" y="177" text-anchor="middle">3</text>
  <path class="d-edge" d="M 186 125 L 256 125" marker-end="url(#b09q3b-arrow)"/>
  <path class="d-edge" d="M 424 125 L 494 125" marker-end="url(#b09q3b-arrow)"/>
  <text class="d-sub" x="340" y="228" text-anchor="middle">diagonal stays put</text>
</svg>

The highlighted cells are the main diagonal: the transpose leaves them alone. Only the pairs **above** the diagonal are swapped with their mirror below it, so the inner loop starts at \`j = i + 1\`. Starting at \`j = 0\` would swap every pair twice and undo the transpose.

### Approach 2: four-way swaps, ring by ring

📌 **Interview term: Layer (ring)** — the cells at the same distance from the edge. A 4×4 matrix has 2 layers (the outer border and the inner 2×2); an n×n matrix has \`n / 2\` layers (rounded down; the centre cell of an odd n never moves).

Within one layer, each cell belongs to a group of four that rotate into each other: top → right → bottom → left → top. Save the top one in a temporary variable, then move left → top, bottom → left, right → bottom, and the saved top → right. One temporary variable, four writes, and four cells are in their final places.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="Four way swap on the outer layer of a 4 by 4 matrix. The four corners 1 4 16 13 move one corner clockwise each: 1 to top right, 4 to bottom right, 16 to bottom left, 13 to top left">
  <defs>
    <marker id="b09q3c-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="87" text-anchor="middle">1</text>
  <rect class="d-box" x="250" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="87" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="87" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="350" y="60" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="87" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="137" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="250" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="137" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="300" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="137" text-anchor="middle">7</text>
  <rect class="d-box" x="350" y="110" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="137" text-anchor="middle">8</text>
  <rect class="d-box" x="200" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="187" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="250" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="187" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="300" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="187" text-anchor="middle">11</text>
  <rect class="d-box" x="350" y="160" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="187" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="200" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="222" y="237" text-anchor="middle">13</text>
  <rect class="d-box" x="250" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="272" y="237" text-anchor="middle">14</text>
  <rect class="d-box" x="300" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="322" y="237" text-anchor="middle">15</text>
  <rect class="d-box-accent" x="350" y="210" width="44" height="44" rx="6"/>
  <text class="d-text" x="372" y="237" text-anchor="middle">16</text>
  <path class="d-edge-accent" d="M 222 48 Q 296 10 370 48" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 410 82 Q 450 156 410 230" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 370 270 Q 296 308 222 270" marker-end="url(#b09q3c-arrow)"/>
  <path class="d-edge-accent" d="M 188 230 Q 148 156 188 82" marker-end="url(#b09q3c-arrow)"/>
  <text class="d-sub" x="500" y="150" text-anchor="middle">top to right</text>
  <text class="d-sub" x="500" y="170" text-anchor="middle">right to bottom</text>
  <text class="d-sub" x="90" y="150" text-anchor="middle">bottom to left</text>
  <text class="d-sub" x="90" y="170" text-anchor="middle">left to top</text>
</svg>

The four corners of the outer layer form one group; the next group is the cells one step along each side (2, 8, 15, 9), and so on. The inner grey 2×2 is the next layer and is handled the same way.

### Which approach to present

Transpose + reverse is easier to get right on a whiteboard and easy to explain. The four-way swap does fewer writes (each cell is written once, Example 2 counts them) but its index expressions are easy to get wrong. A good answer gives the first, and mentions the second.

## 4. Two C++ Facts That Matter Here

A \`vector<vector<int>>\` is a vector of separate row vectors. Two consequences decide whether your rotation is in place and correct, so we checked them:

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<vector<int>>& m) {
    string s = "[";
    for (size_t r = 0; r < m.size(); r++) {
        s += r ? ", [" : "[";
        for (size_t c = 0; c < m[r].size(); c++) s += (c ? ", " : "") + to_string(m[r][c]);
        s += "]";
    }
    return s + "]";
}

int main() {
    vector<vector<int>> m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    for (auto row : m) reverse(row.begin(), row.end());     // auto = a COPY of each row
    cout << "after for (auto row : m) reverse:  " << fmt(m) << "\\n";
    for (auto& row : m) reverse(row.begin(), row.end());    // auto& = the row itself
    cout << "after for (auto& row : m) reverse: " << fmt(m) << "\\n";

    vector<vector<int>> a = {{1, 2}, {3, 4}};
    auto rowAddress = a[0].data();
    swap(a[0], a[1]);                                       // swaps the vectors' internals, no element copies
    cout << "row buffer moved with the swap: " << boolalpha << (a[1].data() == rowAddress) << "\\n";
    return 0;
}
~~~

~~~text
after for (auto row : m) reverse:  [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
after for (auto& row : m) reverse: [[3, 2, 1], [6, 5, 4], [9, 8, 7]]
row buffer moved with the swap: true
~~~

What this shows:

- **\`for (auto row : m)\` copies every row.** The reversal happened on the copies and the matrix was unchanged. **\`for (auto& row : m)\`** binds a reference to the real row, and the reversal stuck. This is the single most common C++ bug in matrix problems.
- **Swapping two rows moves no elements.** After \`swap(a[0], a[1])\`, the buffer that used to belong to row 0 now belongs to row 1 (same \`data()\` pointer): \`std::vector::swap\` exchanges the internal pointers in O(1). So \`std::reverse(m.begin(), m.end())\`, which reverses the order of the rows, costs O(n) swaps of pointers, not O(n²) element copies.

📌 **Interview term: Range-based for loop** — \`for (auto& x : container)\`; with \`auto\` each \`x\` is a copy, with \`auto&\` it is a reference to the element, with \`const auto&\` a read-only reference.

## 5. The In-Place Code in C++

~~~cpp
void rotate(vector<vector<int>>& matrix) {
    int n = static_cast<int>(matrix.size());
    for (int i = 0; i < n; i++)                 // 1. transpose: swap across the main diagonal
        for (int j = i + 1; j < n; j++)         //    j starts at i + 1, so each pair is swapped once
            swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix)                    // 2. reverse every row; auto& = no copy
        reverse(row.begin(), row.end());
}
~~~

Walk-through:

- The matrix is taken by non-const reference (\`vector<vector<int>>&\`), so changes are visible to the caller.
- \`n\` is converted to \`int\` once to avoid mixing signed loop indices with the unsigned \`size()\`.
- \`swap(matrix[i][j], matrix[j][i])\` for \`j > i\` performs the transpose; the diagonal is untouched.
- \`std::reverse(row.begin(), row.end())\` reverses a row in place; \`auto&\` makes \`row\` the real row.
- \`operator[]\` does no bounds checking. If the matrix were not square, \`matrix[j][i]\` could read outside a row: undefined behaviour, not an exception.

The four-way swap version:

~~~cpp
void rotateLayers(Matrix& m) {
    int n = static_cast<int>(m.size());
    for (int layer = 0; layer < n / 2; layer++) {
        int first = layer, last = n - 1 - layer;
        for (int i = first; i < last; i++) {
            int offset = i - first;
            int top = m[first][i];                                 // save top
            m[first][i] = m[last - offset][first];                 // left   -> top
            m[last - offset][first] = m[last][last - offset];      // bottom -> left
            m[last][last - offset] = m[i][last];                   // right  -> bottom
            m[i][last] = top;                                      // top    -> right
            writes += 4;
        }
    }
}
~~~

\`first\` and \`last\` bound the current layer and \`offset\` is the distance along its top edge. \`n / 2\` is integer division, so an odd matrix has its centre cell skipped automatically.

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — transpose + reverse on 1×1 to 4×4:**

~~~text
1x1 before:
  [1]
1x1 after:
  [1]
2x2 before:
  [1, 2]
  [3, 4]
2x2 after:
  [3, 1]
  [4, 2]
3x3 before:
  [1, 2, 3]
  [4, 5, 6]
  [7, 8, 9]
3x3 after:
  [7, 4, 1]
  [8, 5, 2]
  [9, 6, 3]
4x4 before:
  [1, 2, 3, 4]
  [5, 6, 7, 8]
  [9, 10, 11, 12]
  [13, 14, 15, 16]
4x4 after:
  [13, 9, 5, 1]
  [14, 10, 6, 2]
  [15, 11, 7, 3]
  [16, 12, 8, 4]
~~~

The first row of every "before" grid ends up as the last column of the "after" grid.

**Example 2 — the three approaches compared, counting every write into a matrix cell:**

~~~text
n=3 four-way swap        8 writes
n=3 transpose+reverse   12 writes
n=3 copy                18 writes
  all three equal: true
  first row after: [7, 4, 1]
n=4 four-way swap       16 writes
n=4 transpose+reverse   28 writes
n=4 copy                32 writes
  all three equal: true
  first row after: [13, 9, 5, 1]
n=5 four-way swap       24 writes
n=5 transpose+reverse   40 writes
n=5 copy                50 writes
  all three equal: true
  first row after: [21, 16, 11, 6, 1]
~~~

All three agree (\`==\` on vectors compares contents element by element). The four-way swap writes each moving cell once (8, 16, 24 for n = 3, 4, 5). Transpose + reverse writes most cells twice. The copy writes n² cells twice and allocates a second matrix.

**Example 3 — counter-clockwise, 180 degrees, round trips, and a rectangle:**

~~~cpp
void rotateCcw(Matrix& m) {
    transpose(m);
    reverse(m.begin(), m.end());          // reverse the ORDER of the rows (vector swaps are O(1))
}

void rotate180(Matrix& m) {
    reverse(m.begin(), m.end());          // flip upside down
    for (auto& row : m) reverse(row.begin(), row.end());   // then mirror left-right
}

Matrix rotateRectCw(const Matrix& m) {    // R x C -> C x R, so it cannot be done in the same storage
    int rows = static_cast<int>(m.size()), cols = static_cast<int>(m[0].size());
    Matrix out(cols, vector<int>(rows));
    for (int c = 0; c < cols; c++)
        for (int r = 0; r < rows; r++) out[c][r] = m[rows - 1 - r][c];
    return out;
}
~~~

~~~text
counter-clockwise: 3 6 9 | 2 5 8 | 1 4 7
180 degrees:       9 8 7 | 6 5 4 | 3 2 1
four clockwise turns give the original: true
clockwise then counter-clockwise is a no-op: true
2x3 rotated clockwise: 4 1 | 5 2 | 6 3
~~~

\`std::reverse(m.begin(), m.end())\` flips the matrix upside down by swapping row vectors, which is O(1) per swap. The 2×3 input became a new 3×2 matrix, so non-square input always needs new storage.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy into a new matrix | O(n²) | O(n²) | A second grid of n² cells. |
| Transpose + \`std::reverse\` each row | O(n²) | O(1) | Each pair above the diagonal swapped once; each row reversed once. |
| Four-way layer swap | O(n²) | O(1) | Each moving cell is written once; one temporary \`int\`. |
| Reverse the row order | O(n) | O(1) | Swapping two vectors only exchanges their internals. |

O(n²) is optimal because almost every cell has to move. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty matrix:** \`n == 0\`; loops do nothing.
- **1×1:** nothing moves.
- **Odd n:** the centre cell stays; \`n / 2\` layers.
- **Non-square input:** undefined behaviour with \`operator[]\`; validate \`row.size() == n\` first, or use \`.at()\` while debugging.
- **Flat storage** (\`vector<int>\` of size n·n, common for images): use index \`r * n + c\`; the cell moves to \`c * n + (n - 1 - r)\` and the four-way swap works the same way.

## Common Pitfalls

- **\`for (auto row : m)\`.** Copies each row; your reversal disappears. Use \`auto&\`.
- **Transposing the whole square.** \`j\` must start at \`i + 1\`; starting at 0 swaps every pair back.
- **Passing the matrix by value.** \`void rotate(vector<vector<int>> m)\` rotates a copy.
- **Assuming a vector of vectors is one contiguous block.** Each row is its own allocation; code that does pointer arithmetic across rows is wrong. Use a flat vector if you need contiguity.
- **Out-of-bounds with \`operator[]\`.** No exception, just undefined behaviour; an off-by-one in the four-way indices may "work" on one input and corrupt memory on another.
- **Reversing the row order instead of each row** after a transpose: that is the counter-clockwise rotation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Transpose with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap(m[i][j], m[j][i])</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &gt; i</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> every row. O(n²) time, O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Clockwise sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, n - 1 - r)</code>; the transpose does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(c, r)</code>, and reversing a row does column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1 - x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The alternative:</strong> <span style="color:#f0e2c8;">Ring by ring, rotate groups of four cells with one temporary <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>: left to top, bottom to left, right to bottom, saved top to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The C++ details:</strong> <span style="color:#f0e2c8;">Loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (auto&amp; row : m)</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code> alone copies the row; swapping two row vectors is O(1), so reversing the row order is cheap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, pass the matrix by reference, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> has no bounds check if the input is not square.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rotate counter-clockwise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transpose, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse(m.begin(), m.end())</code> to reverse the order of the rows. Our 3×3 run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 6 9 | 2 5 8 | 1 4 7</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is swapping rows cheap but swapping columns expensive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each row is its own vector, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector::swap</code> just exchanges internal pointers, which our run confirmed through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data()</code>. A column is spread over n different rows, so swapping two columns means n element swaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the matrix is not square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">R×C becomes C×R, so I return a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt;(C, vector&lt;int&gt;(R))</code> filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out[c][r] = m[R - 1 - r][c]</code>. The shape changes, so it cannot be in place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you store an image as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. A flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> of n·n with index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * n + c</code> is one allocation and cache-friendly. The rotation mapping becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * n + c</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c * n + (n - 1 - r)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your solution exception-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> elements nothing can throw: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> on ints never throw and nothing is allocated. With element types whose swap can throw, a failure midway would leave a partly rotated matrix.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rotation mapping | Clockwise: \`(r, c)\` goes to \`(c, n - 1 - r)\`. |
| Transpose | Swapping \`(r, c)\` with \`(c, r)\`: a flip across the main diagonal. |
| Layer (ring) | All cells at the same distance from the border; an n×n matrix has \`n / 2\` of them. |
| Range-based for loop | \`for (auto& x : c)\`; \`auto\` copies each element, \`auto&\` refers to it. |

**Conclusion:** A 90-degree clockwise rotation sends \`(r, c)\` to \`(c, n - 1 - r)\`; transpose plus \`std::reverse\` on each row, or four-way swaps ring by ring, do it in place in O(n²) time and O(1) extra space. In C++, the bugs are rarely in the algorithm: they are \`auto\` instead of \`auto&\`, passing by value, and out-of-range \`operator[]\` on non-square input. Swapping whole rows is O(1), which makes the counter-clockwise and 180-degree variants cheap.`,
        examples: [
          {
            label: "Transpose, then reverse each row (1x1 to 4x4)",
            code: `// Rotate an N x N matrix 90 degrees clockwise in place: transpose, then reverse each row.
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

void rotate(vector<vector<int>>& matrix) {
    int n = static_cast<int>(matrix.size());
    for (int i = 0; i < n; i++)                 // 1. transpose: swap across the main diagonal
        for (int j = i + 1; j < n; j++)         //    j starts at i + 1, so each pair is swapped once
            swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix)                    // 2. reverse every row; auto& = no copy
        reverse(row.begin(), row.end());
}

void show(const string& title, const vector<vector<int>>& matrix) {
    cout << title << "\\n";
    for (const auto& row : matrix) {
        string s = "  [";
        for (size_t c = 0; c < row.size(); c++) s += (c ? ", " : "") + to_string(row[c]);
        cout << s << "]\\n";
    }
}

vector<vector<int>> make(int n) {
    vector<vector<int>> m(n, vector<int>(n));
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
    return m;
}

int main() {
    for (int n = 1; n <= 4; n++) {
        auto m = make(n);
        string tag = to_string(n) + "x" + to_string(n);
        show(tag + " before:", m);
        rotate(m);
        show(tag + " after:", m);
    }
    return 0;
}
`,
          },
          {
            label: "Four-way layer swap vs transpose + reverse vs copying, counting writes",
            code: `// Layer-by-layer four-way swap vs transpose + reverse vs copying, with write counts.
#include <cstdio>
#include <string>
#include <utility>
#include <vector>
using namespace std;
using Matrix = vector<vector<int>>;

int writes = 0;

void rotateLayers(Matrix& m) {
    int n = static_cast<int>(m.size());
    for (int layer = 0; layer < n / 2; layer++) {
        int first = layer, last = n - 1 - layer;
        for (int i = first; i < last; i++) {
            int offset = i - first;
            int top = m[first][i];                                 // save top
            m[first][i] = m[last - offset][first];                 // left   -> top
            m[last - offset][first] = m[last][last - offset];      // bottom -> left
            m[last][last - offset] = m[i][last];                   // right  -> bottom
            m[i][last] = top;                                      // top    -> right
            writes += 4;
        }
    }
}

void rotateTranspose(Matrix& m) {
    int n = static_cast<int>(m.size());
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) { swap(m[i][j], m[j][i]); writes += 2; }
    for (auto& row : m)
        for (int lo = 0; lo < n / 2; lo++) { swap(row[lo], row[n - 1 - lo]); writes += 2; }
}

void rotateCopy(Matrix& m) {
    int n = static_cast<int>(m.size());
    Matrix out(n, vector<int>(n));
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++) { out[c][n - 1 - r] = m[r][c]; writes++; }   // (r, c) goes to (c, n - 1 - r)
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++) { m[r][c] = out[r][c]; writes++; }
}

Matrix make(int n) {
    Matrix m(n, vector<int>(n));
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
    return m;
}

int main() {
    const char* names[] = {"four-way swap", "transpose+reverse", "copy"};
    void (*fns[])(Matrix&) = {rotateLayers, rotateTranspose, rotateCopy};
    for (int n : {3, 4, 5}) {
        Matrix results[3];
        for (int f = 0; f < 3; f++) {
            Matrix m = make(n);
            writes = 0;
            fns[f](m);
            results[f] = m;
            printf("n=%d %-18s%4d writes\\n", n, names[f], writes);
        }
        printf("  all three equal: %s\\n", (results[0] == results[1] && results[1] == results[2]) ? "true" : "false");
        string row = "[";
        for (size_t c = 0; c < results[0][0].size(); c++) row += (c ? ", " : "") + to_string(results[0][0][c]);
        printf("  first row after: %s]\\n", row.c_str());
    }
    return 0;
}
`,
          },
          {
            label: "Counter-clockwise, 180 degrees, four turns, and a non-square matrix",
            code: `// Counter-clockwise, 180 degrees, four turns, and a non-square matrix (needs a new matrix).
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;
using Matrix = vector<vector<int>>;

void transpose(Matrix& m) {
    int n = static_cast<int>(m.size());
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) swap(m[i][j], m[j][i]);
}

void rotateCw(Matrix& m) {
    transpose(m);
    for (auto& row : m) reverse(row.begin(), row.end());
}

void rotateCcw(Matrix& m) {
    transpose(m);
    reverse(m.begin(), m.end());          // reverse the ORDER of the rows (vector swaps are O(1))
}

void rotate180(Matrix& m) {
    reverse(m.begin(), m.end());          // flip upside down
    for (auto& row : m) reverse(row.begin(), row.end());   // then mirror left-right
}

Matrix rotateRectCw(const Matrix& m) {    // R x C -> C x R, so it cannot be done in the same storage
    int rows = static_cast<int>(m.size()), cols = static_cast<int>(m[0].size());
    Matrix out(cols, vector<int>(rows));
    for (int c = 0; c < cols; c++)
        for (int r = 0; r < rows; r++) out[c][r] = m[rows - 1 - r][c];
    return out;
}

void show(const string& title, const Matrix& m) {
    string s = title;
    for (size_t r = 0; r < m.size(); r++) {
        s += r == 0 ? " " : " | ";
        for (size_t c = 0; c < m[r].size(); c++) s += (c ? " " : "") + to_string(m[r][c]);
    }
    cout << s << "\\n";
}

Matrix make(int n) {
    Matrix m(n, vector<int>(n));
    for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) m[r][c] = r * n + c + 1;
    return m;
}

int main() {
    cout << boolalpha;
    Matrix m = make(3); rotateCcw(m); show("counter-clockwise:", m);
    m = make(3); rotate180(m); show("180 degrees:      ", m);
    m = make(3);
    for (int t = 0; t < 4; t++) rotateCw(m);
    cout << "four clockwise turns give the original: " << (m == make(3)) << "\\n";
    m = make(3); rotateCw(m); rotateCcw(m);
    cout << "clockwise then counter-clockwise is a no-op: " << (m == make(3)) << "\\n";
    show("2x3 rotated clockwise:", rotateRectCw({{1, 2, 3}, {4, 5, 6}}));
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you traverse a matrix in spiral order?",
    difficulty: "medium",
    seoDescription: "Traverse a matrix in spiral order with four shrinking boundaries in O(m·n), handling single rows and columns, in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an m by n matrix as a Python list of lists, return all of its elements in spiral order: start at the top-left, go right along the top, down the right side, left along the bottom, up the left side, and keep going inward."

**What a strong answer should cover:**
- Four boundaries (\`top\`, \`bottom\`, \`left\`, \`right\`) that shrink after each side is walked; loop while \`top <= bottom and left <= right\`.
- The two guards before the bottom row and the left column, which stop a single remaining row or column from being read twice.
- O(m·n) time, O(1) extra space besides the output list.
- The direction-vector alternative (turn right when blocked) and its O(m·n) visited grid.
- Python specifics: check \`not matrix or not matrix[0]\` before reading \`matrix[0]\`, \`range(right, left - 1, -1)\` for walking backwards, negative indices silently read from the end instead of raising, and the \`matrix.pop(0)\` + \`zip\` one-liner destroys the input.

**Clarifying questions expected:**
- "Can the matrix be non-square or empty?"
- "May I modify the input?"

**Code / implementation expected:** Yes — a Python \`spiral_order(matrix)\` using four boundaries.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Python lists of lists, \`range\` and \`while\` loops.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`python3\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of mowing a rectangular lawn the way many people do: start at one corner, drive along the edge, turn right at each corner, and keep going round and round, each lap a little further inside, until you reach the middle. You never cross a strip you have already cut, and you never miss one.

Reading a matrix in spiral order is that lawn mower. Start at the top-left, go right along the top row, down the right column, left along the bottom row, up the left column, and then repeat one ring further in. The question is simple to state, but it is a favourite because the last lap is where people slip: when only a single row or a single column is left, a careless loop walks back over cells it has already visited.

The same "shrinking boundaries" idea is used for [rotating a matrix in place](/interview-question/how-do-you-rotate-an-n-n-matrix-by-90-degrees-in-place) (which also works ring by ring) and for printing or filling grids in games and image processing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the matrix always square, or can it be m×n? | Non-square shapes are where the single-row / single-column edge case appears. |
| Clockwise starting at the top-left? | Other starting points or counter-clockwise only change the order of the four sides. |
| Can the matrix be empty, or have rows of length 0? | You must check before reading \`matrix[0]\`. |
| Should I return a list, or print as I go? | Usually return a list of m·n values. |
| May I modify the input? | Some short solutions destroy the matrix; the boundary method does not. |

## 3. The Core Idea: Four Shrinking Boundaries

Keep four numbers that describe the part of the matrix you have **not** visited yet: the first unvisited row \`top\`, the last unvisited row \`bottom\`, the first unvisited column \`left\` and the last unvisited column \`right\`.

📌 **Interview term: Boundary pointers** — four indices (\`top\`, \`bottom\`, \`left\`, \`right\`) that mark the edges of the unvisited rectangle. Each side you walk moves one of them inward by one.

One lap has four legs:

1. Walk the **top row** from \`left\` to \`right\`, then \`top += 1\` (that row is done).
2. Walk the **right column** from \`top\` to \`bottom\`, then \`right -= 1\`.
3. If a row is still left (\`top <= bottom\`), walk the **bottom row** from \`right\` back to \`left\`, then \`bottom -= 1\`.
4. If a column is still left (\`left <= right\`), walk the **left column** from \`bottom\` back up to \`top\`, then \`left += 1\`.

Repeat while \`top <= bottom and left <= right\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Spiral order of a 3 by 4 matrix: 1 2 3 4 along the top, 8 12 down the right, 11 10 9 along the bottom, 5 up the left, then 6 7 in the middle">
  <defs>
    <marker id="b09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="64" text-anchor="middle">1</text>
  <rect class="d-box" x="124" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="64" text-anchor="middle">2</text>
  <rect class="d-box" x="188" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="64" text-anchor="middle">3</text>
  <rect class="d-box" x="252" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">4</text>
  <rect class="d-box" x="60" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="128" text-anchor="middle">5</text>
  <rect class="d-box" x="124" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="128" text-anchor="middle">6</text>
  <rect class="d-box" x="188" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="128" text-anchor="middle">7</text>
  <rect class="d-box" x="252" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="128" text-anchor="middle">8</text>
  <rect class="d-box" x="60" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="192" text-anchor="middle">9</text>
  <rect class="d-box" x="124" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="192" text-anchor="middle">10</text>
  <rect class="d-box" x="188" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="192" text-anchor="middle">11</text>
  <rect class="d-box" x="252" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="192" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 100 82 L 292 82 L 292 210 L 100 210 L 100 146 L 228 146" marker-end="url(#b09q4-arrow)"/>
  <text class="d-sub" x="390" y="70">1. top row: left to right</text>
  <text class="d-sub" x="390" y="102">2. right column: downwards</text>
  <text class="d-sub" x="390" y="134">3. bottom row: right to left</text>
  <text class="d-sub" x="390" y="166">4. left column: upwards</text>
  <text class="d-sub" x="390" y="198">then repeat one ring inside</text>
</svg>

The accent line is the reading order for a 3×4 matrix: \`1 2 3 4 8 12 11 10 9 5 6 7\`. After the outer ring, the boundaries have moved in by one on every side:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Boundaries after one lap of a 3 by 4 matrix. The outer ring is done. top and bottom are both 1, left is 1 and right is 2, so only 6 and 7 remain">
  <rect class="d-box-muted" x="220" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="93" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="284" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="93" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="348" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="93" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="412" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="93" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="157" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="284" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="157" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="348" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="157" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="412" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="157" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="220" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="221" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="284" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="221" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="348" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="221" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="412" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="221" text-anchor="middle">12</text>
  <text class="d-sub" x="196" y="157" text-anchor="end">top = bottom = 1</text>
  <text class="d-sub" x="312" y="44" text-anchor="middle">left = 1</text>
  <text class="d-sub" x="376" y="44" text-anchor="middle">right = 2</text>
  <text class="d-sub" x="196" y="93" text-anchor="end">done</text>
  <text class="d-sub" x="196" y="221" text-anchor="end">done</text>
</svg>

Now \`top == bottom == 1\`: only one row is left. Leg 1 reads \`6, 7\` and moves \`top\` to 2. Leg 2 reads nothing (\`top > bottom\`). And here is the trap: without the check in leg 3, the loop would walk "the bottom row" — which is the same row 1 it just read — backwards and output 6 again. The two \`if\` checks in legs 3 and 4 exist exactly for the last lap of non-square matrices. Example 3 prints the buggy output.

📌 **Interview term: Simulation** — solving a problem by literally carrying out the process step by step (here: walking the spiral) rather than computing the answer with a formula.

### The alternative: direction vectors

Instead of four loops, walk one cell at a time with a current direction (right, down, left, up) stored as \`(dr, dc)\` pairs, and turn right whenever the next cell is outside the matrix or already visited. It is shorter to reason about, but it needs an m×n "visited" grid (O(m·n) extra space) unless you overwrite the input with a sentinel value.

📌 **Interview term: Direction vectors** — arrays like \`DR = [0, 1, 0, -1]\`, \`DC = [1, 0, -1, 0]\` that encode moving right, down, left and up, so turning is just \`d = (d + 1) % 4\`.

## 4. The Python Code

~~~python
def spiral_order(matrix):
    if not matrix or not matrix[0]:
        return []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1):          # 1. top row, left to right
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):          # 2. right column, top to bottom
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:                         # 3. bottom row, right to left (if a row is left)
            for c in range(right, left - 1, -1):
                out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:                         # 4. left column, bottom to top (if a column is left)
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1
    return out
~~~

Walk-through:

- \`if not matrix or not matrix[0]\` handles both \`[]\` and \`[[]]\`. The order matters: \`not matrix\` is checked first, so \`matrix[0]\` is never evaluated on an empty list (Python's \`or\` short-circuits).
- \`range(left, right + 1)\` includes \`right\`, because \`range\` stops **before** its end.
- \`range(right, left - 1, -1)\` walks backwards from \`right\` down to \`left\` inclusive. Getting this stop value wrong is the most common Python off-by-one here.
- The guards \`if top <= bottom\` and \`if left <= right\` protect legs 3 and 4 on the last lap.
- Why the guards matter even more in Python: in JavaScript or Java a bad index tends to produce \`undefined\` or an exception, but in Python \`matrix[-1]\` is simply **the last row**. A boundary that drifts to -1 reads real data from the wrong place and never complains.

### The famous Python one-liner

There is a short recursive solution that peels off the first row and rotates the rest. We ran it:

~~~python
def spiral_pop(m):
    # take the first row, then rotate what is left counter-clockwise and repeat
    return m and [*m.pop(0)] + spiral_pop([*zip(*m)][::-1])

grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print("one-liner result:", spiral_pop(grid))
print("input afterwards:", grid)
print("empty input:", spiral_pop([]))
~~~

~~~text
one-liner result: [1, 2, 3, 6, 9, 8, 7, 4, 5]
input afterwards: [[4, 5, 6], [7, 8, 9]]
empty input: []
~~~

It is correct, and fun to show, but note two things. First, \`m.pop(0)\` **mutated the caller's matrix**: the first row is gone. Second, every peel rebuilds everything that is left with \`zip\`, so cells are copied many times over and the total work is worse than the O(m·n) of the boundary method. Mention it as a curiosity; write the boundary version.

### The direction-vector version

~~~python
DR = [0, 1, 0, -1]                     # right, down, left, up
DC = [1, 0, -1, 0]


def spiral_directions(matrix):
    rows, cols = len(matrix), len(matrix[0])
    seen = [[False] * cols for _ in range(rows)]
    r = c = d = 0
    out = []
    for _ in range(rows * cols):
        out.append(matrix[r][c])
        seen[r][c] = True
        nr, nc = r + DR[d], c + DC[d]
        if not (0 <= nr < rows and 0 <= nc < cols) or seen[nr][nc]:
            d = (d + 1) % 4            # blocked: turn right
            nr, nc = r + DR[d], c + DC[d]
        r, c = nr, nc
    return out
~~~

\`0 <= nr < rows\` is Python's chained comparison, the same as \`0 <= nr and nr < rows\`. The \`seen\` grid is built with a comprehension; \`[[False] * cols] * rows\` would create one shared row (every \`seen[r][c] = True\` would mark the whole column in all rows).

## 5. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3 main.py\`.

**Example 1 — the boundary method on many shapes:**

~~~text
[1, 2, 3, 6, 9, 8, 7, 4, 5]
[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
[1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
[1, 2, 3, 4]
[1, 2, 3, 4]
[1, 2, 4, 3]
[1]
[]
~~~

Square (3×3), wide (3×4), tall (4×3), a single row, a single column, 2×2, 1×1 and empty all come out right; each list has exactly m·n values.

**Example 2 — direction vectors vs boundaries on every shape from 1×1 to 6×6, and the reverse problem:**

~~~python
def generate_spiral(n):
    m = [[0] * n for _ in range(n)]
    top, bottom, left, right = 0, n - 1, 0, n - 1
    k = 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            m[top][c] = k
            k += 1
        top += 1
        for r in range(top, bottom + 1):
            m[r][right] = k
            k += 1
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                m[bottom][c] = k
                k += 1
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                m[r][left] = k
                k += 1
            left += 1
    return m
~~~

~~~text
shapes where both methods agree: 36 of 36
spiral matrix for n = 4:
   1  2  3  4
  12 13 14  5
  11 16 15  6
  10  9  8  7
~~~

Both methods agree on all 36 shapes. Generating an n×n spiral (LeetCode 59, "Spiral Matrix II") is the same loop with writes instead of reads.

**Example 3 — what happens without the two guards:**

~~~text
3x3 buggy: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
3x3 fixed: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
1x4 buggy: [1, 2, 3, 4, 3, 2, 1] (7 items)
1x4 fixed: [1, 2, 3, 4] (4 items)
3x4 buggy: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6] (13 items)
3x4 fixed: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] (12 items)
3x1 buggy: [1, 2, 3, 2] (4 items)
3x1 fixed: [1, 2, 3] (3 items)
~~~

The 3×3 case hides the bug completely: its last lap is a single cell, which the guards do not affect. A single row (1×4) is read forwards and then backwards; the 3×4 matrix repeats \`6\`; the single column (3×1) repeats \`2\`. This is why you should always test a non-square matrix.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Four boundaries | O(m·n) | O(1) besides the output | Each cell is appended exactly once. |
| Direction vectors + \`seen\` grid | O(m·n) | O(m·n) | The visited grid has one flag per cell. |
| \`pop(0)\` + \`zip\` one-liner | Worse than O(m·n) | O(m·n) | Rebuilds the remaining matrix every time a row is removed; also destroys the input. |

The output itself is m·n values, so O(m·n) time is optimal. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **Empty \`[]\` and \`[[]]\`:** return \`[]\` before touching \`matrix[0]\`.
- **Single row or single column:** the guards stop the second pass; Example 1 shows \`[1, 2, 3, 4]\` for both.
- **1×1:** one value.
- **Wide vs tall:** 3×4 and 4×3 finish their last lap differently (a leftover row vs a leftover column); test both.
- **Ragged rows:** not a valid matrix; the code assumes every row has \`len(matrix[0])\` items.

## Common Pitfalls

- **Missing the two inner guards.** Non-square inputs then produce duplicates (Example 3).
- **\`range\` stop values.** \`range(left, right)\` misses the last column; \`range(right, left, -1)\` misses the first. Ends are exclusive.
- **Silent negative indexing.** A boundary at -1 reads the last row or column instead of raising \`IndexError\`, so the bug hides.
- **Checking \`matrix[0]\` before \`matrix\`.** \`[][0]\` raises \`IndexError\`; test \`not matrix\` first.
- **Destroying the input with \`pop(0)\`.** The one-liner empties the caller's matrix.
- **\`[[False] * cols] * rows\` for the visited grid.** All rows are the same list.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep four boundaries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bottom</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>; walk the top row, right column, bottom row and left column, shrinking one boundary after each, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom and left &lt;= right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key detail:</strong> <span style="color:#f0e2c8;">Before the bottom row I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom</code>, and before the left column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt;= right</code>, so a single leftover row or column is not read twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Every cell is appended once: O(m·n) time and O(1) extra space besides the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Direction vectors with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen</code> grid: move, and turn right when blocked. Simpler logic, but O(m·n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range</code> ends are exclusive (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(right, left - 1, -1)</code> for backwards), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[-1]</code> silently reads the last row, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> one-liner destroys the input.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your 3×3 test not catch the missing-guard bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd square the last lap is a single cell, so legs 3 and 4 have nothing to repeat. A 3×4 or 1×4 matrix shows it: the buggy version printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code> twice for 3×4 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4, 3, 2, 1]</code> for 1×4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without the four loops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with direction vectors <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DR = [0, 1, 0, -1]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DC = [1, 0, -1, 0]</code>: take m·n steps and turn with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d = (d + 1) % 4</code> when the next cell is outside or already seen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generate an n×n matrix filled 1 to n² in spiral order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same boundary loop, but writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> and incrementing it instead of reading. Example 2 printed the 4×4 result, with 13 to 16 forming the inner 2×2 ring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about counter-clockwise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap the order of the legs: left column down, bottom row right, right column up, top row left, with the same two guards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Python one-liner with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">zip</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct, but it pops rows out of the caller's matrix and rebuilds the rest after every peel, so it copies cells many times. I would mention it and present the boundary loop.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Boundary pointers | \`top\`, \`bottom\`, \`left\`, \`right\`: the edges of the part not yet visited. |
| Simulation | Solving by carrying out the process step by step. |
| Direction vectors | \`(dr, dc)\` arrays for right, down, left, up; turning is \`d = (d + 1) % 4\`. |

**Conclusion:** Spiral order is four loops around a shrinking rectangle: top row, right column, bottom row, left column, moving one boundary inward after each. The only subtle part is the two guards before the bottom row and the left column, which matter only for non-square matrices, so always test a wide and a tall one. In Python, watch the exclusive \`range\` ends, remember that negative indices hide boundary bugs, and keep the \`zip\` one-liner as a side note.`,
        examples: [
          {
            label: "Boundary method on square, wide, tall, single-row, single-column and empty matrices",
            code: `# Spiral order with four shrinking boundaries: top, bottom, left, right.
def spiral_order(matrix):
    if not matrix or not matrix[0]:
        return []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1):          # 1. top row, left to right
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):          # 2. right column, top to bottom
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:                         # 3. bottom row, right to left (if a row is left)
            for c in range(right, left - 1, -1):
                out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:                         # 4. left column, bottom to top (if a column is left)
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1
    return out

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

def grid(rows, cols):
    return [[r * cols + c + 1 for c in range(cols)] for r in range(rows)]

print(fmt(spiral_order(grid(3, 3))))  # [1, 2, 3, 6, 9, 8, 7, 4, 5]
print(fmt(spiral_order(grid(3, 4))))  # [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
print(fmt(spiral_order(grid(4, 3))))  # [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
print(fmt(spiral_order(grid(1, 4))))  # [1, 2, 3, 4]
print(fmt(spiral_order(grid(4, 1))))  # [1, 2, 3, 4]
print(fmt(spiral_order(grid(2, 2))))  # [1, 2, 4, 3]
print(fmt(spiral_order(grid(1, 1))))  # [1]
print(fmt(spiral_order([])))  # []
`,
          },
          {
            label: "Direction-vector simulation checked on all 36 shapes, plus generating a spiral matrix",
            code: `# Direction-vector simulation, checked against the boundary method on every shape
# from 1x1 to 6x6, plus generating an n x n spiral matrix (the reverse problem).
def spiral_bounds(matrix):
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        out.extend(matrix[top][c] for c in range(left, right + 1)); top += 1
        out.extend(matrix[r][right] for r in range(top, bottom + 1)); right -= 1
        if top <= bottom:
            out.extend(matrix[bottom][c] for c in range(right, left - 1, -1)); bottom -= 1
        if left <= right:
            out.extend(matrix[r][left] for r in range(bottom, top - 1, -1)); left += 1
    return out

DR = [0, 1, 0, -1]                     # right, down, left, up
DC = [1, 0, -1, 0]

def spiral_directions(matrix):
    rows, cols = len(matrix), len(matrix[0])
    seen = [[False] * cols for _ in range(rows)]
    r = c = d = 0
    out = []
    for _ in range(rows * cols):
        out.append(matrix[r][c])
        seen[r][c] = True
        nr, nc = r + DR[d], c + DC[d]
        if not (0 <= nr < rows and 0 <= nc < cols) or seen[nr][nc]:
            d = (d + 1) % 4            # blocked: turn right
            nr, nc = r + DR[d], c + DC[d]
        r, c = nr, nc
    return out

def generate_spiral(n):
    m = [[0] * n for _ in range(n)]
    top, bottom, left, right = 0, n - 1, 0, n - 1
    k = 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            m[top][c] = k
            k += 1
        top += 1
        for r in range(top, bottom + 1):
            m[r][right] = k
            k += 1
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                m[bottom][c] = k
                k += 1
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                m[r][left] = k
                k += 1
            left += 1
    return m

agree = 0
for rows in range(1, 7):
    for cols in range(1, 7):
        m = [[r * cols + c for c in range(cols)] for r in range(rows)]
        if spiral_bounds(m) == spiral_directions(m):
            agree += 1
print("shapes where both methods agree: " + str(agree) + " of 36")
print("spiral matrix for n = 4:")
for row in generate_spiral(4):
    print("  " + " ".join(str(x).rjust(2) for x in row))
`,
          },
          {
            label: "The classic bug: missing the two inner guards, buggy vs fixed",
            code: `# The classic bug: forgetting the two "is there still a row / column?" checks.
def spiral_buggy(matrix):
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(matrix[r][right])
        right -= 1
        for c in range(right, left - 1, -1):      # BUG: runs even when no row is left
            out.append(matrix[bottom][c])
        bottom -= 1
        for r in range(bottom, top - 1, -1):      # BUG: runs even when no column is left
            out.append(matrix[r][left])
        left += 1
    return out

def spiral_fixed(matrix):
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1
    return out

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

def grid(rows, cols):
    return [[r * cols + c + 1 for c in range(cols)] for r in range(rows)]

for rows, cols in ((3, 3), (1, 4), (3, 4), (3, 1)):
    m = grid(rows, cols)
    b, f = spiral_buggy(m), spiral_fixed(m)
    print(str(rows) + "x" + str(cols) + " buggy: " + fmt(b) + " (" + str(len(b)) + " items)")
    print(str(rows) + "x" + str(cols) + " fixed: " + fmt(f) + " (" + str(len(f)) + " items)")
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an m by n matrix as a JavaScript array of arrays, return an array of all its elements in spiral order: right along the top, down the right side, left along the bottom, up the left side, and so on inward."

**What a strong answer should cover:**
- Four boundaries (\`top\`, \`bottom\`, \`left\`, \`right\`) that shrink after each side; loop while \`top <= bottom && left <= right\`.
- The two guards before the bottom row and the left column, so a leftover single row or column is not read twice.
- O(m·n) time, O(1) extra space besides the output array.
- The direction-vector alternative and its O(m·n) visited grid.
- JavaScript specifics: \`matrix[0].length\` on \`[]\` throws a \`TypeError\`, reading past the edge returns \`undefined\` silently (and \`push\` happily stores it), and the visited grid must be built with \`Array.from\`, not \`fill\` with an array.

**Clarifying questions expected:**
- "Can the matrix be non-square or empty?"
- "Should I return a new array?"

**Code / implementation expected:** Yes — a JavaScript \`spiralOrder(matrix)\` using four boundaries.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need JavaScript arrays of arrays and \`for\` loops.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`node\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of mowing a rectangular lawn the way many people do: start at one corner, drive along the edge, turn right at each corner, and keep going round and round, each lap a little further inside, until you reach the middle. You never cross a strip you have already cut, and you never miss one.

Reading a matrix in spiral order is that lawn mower. Start at the top-left, go right along the top row, down the right column, left along the bottom row, up the left column, and then repeat one ring further in. The question is simple to state, but it is a favourite because the last lap is where people slip: when only a single row or a single column is left, a careless loop walks back over cells it has already visited.

The same "shrinking boundaries" idea is used for [rotating a matrix in place](/interview-question/how-do-you-rotate-an-n-n-matrix-by-90-degrees-in-place) (which also works ring by ring) and for printing or filling grids in games and image processing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the matrix always square, or can it be m×n? | Non-square shapes are where the single-row / single-column edge case appears. |
| Clockwise starting at the top-left? | Other starting points or counter-clockwise only change the order of the four sides. |
| Can the matrix be empty, or have rows of length 0? | You must check before reading \`matrix[0]\`. |
| Should I return a list, or print as I go? | Usually return a list of m·n values. |
| May I modify the input? | Some short solutions destroy the matrix; the boundary method does not. |

## 3. The Core Idea: Four Shrinking Boundaries

Keep four numbers that describe the part of the matrix you have **not** visited yet: the first unvisited row \`top\`, the last unvisited row \`bottom\`, the first unvisited column \`left\` and the last unvisited column \`right\`.

📌 **Interview term: Boundary pointers** — four indices (\`top\`, \`bottom\`, \`left\`, \`right\`) that mark the edges of the unvisited rectangle. Each side you walk moves one of them inward by one.

One lap has four legs:

1. Walk the **top row** from \`left\` to \`right\`, then \`top += 1\` (that row is done).
2. Walk the **right column** from \`top\` to \`bottom\`, then \`right -= 1\`.
3. If a row is still left (\`top <= bottom\`), walk the **bottom row** from \`right\` back to \`left\`, then \`bottom -= 1\`.
4. If a column is still left (\`left <= right\`), walk the **left column** from \`bottom\` back up to \`top\`, then \`left += 1\`.

Repeat while \`top <= bottom and left <= right\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Spiral order of a 3 by 4 matrix: 1 2 3 4 along the top, 8 12 down the right, 11 10 9 along the bottom, 5 up the left, then 6 7 in the middle">
  <defs>
    <marker id="b09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="64" text-anchor="middle">1</text>
  <rect class="d-box" x="124" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="64" text-anchor="middle">2</text>
  <rect class="d-box" x="188" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="64" text-anchor="middle">3</text>
  <rect class="d-box" x="252" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">4</text>
  <rect class="d-box" x="60" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="128" text-anchor="middle">5</text>
  <rect class="d-box" x="124" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="128" text-anchor="middle">6</text>
  <rect class="d-box" x="188" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="128" text-anchor="middle">7</text>
  <rect class="d-box" x="252" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="128" text-anchor="middle">8</text>
  <rect class="d-box" x="60" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="192" text-anchor="middle">9</text>
  <rect class="d-box" x="124" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="192" text-anchor="middle">10</text>
  <rect class="d-box" x="188" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="192" text-anchor="middle">11</text>
  <rect class="d-box" x="252" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="192" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 100 82 L 292 82 L 292 210 L 100 210 L 100 146 L 228 146" marker-end="url(#b09q4-arrow)"/>
  <text class="d-sub" x="390" y="70">1. top row: left to right</text>
  <text class="d-sub" x="390" y="102">2. right column: downwards</text>
  <text class="d-sub" x="390" y="134">3. bottom row: right to left</text>
  <text class="d-sub" x="390" y="166">4. left column: upwards</text>
  <text class="d-sub" x="390" y="198">then repeat one ring inside</text>
</svg>

The accent line is the reading order for a 3×4 matrix: \`1 2 3 4 8 12 11 10 9 5 6 7\`. After the outer ring, the boundaries have moved in by one on every side:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Boundaries after one lap of a 3 by 4 matrix. The outer ring is done. top and bottom are both 1, left is 1 and right is 2, so only 6 and 7 remain">
  <rect class="d-box-muted" x="220" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="93" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="284" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="93" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="348" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="93" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="412" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="93" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="157" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="284" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="157" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="348" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="157" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="412" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="157" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="220" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="221" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="284" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="221" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="348" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="221" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="412" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="221" text-anchor="middle">12</text>
  <text class="d-sub" x="196" y="157" text-anchor="end">top = bottom = 1</text>
  <text class="d-sub" x="312" y="44" text-anchor="middle">left = 1</text>
  <text class="d-sub" x="376" y="44" text-anchor="middle">right = 2</text>
  <text class="d-sub" x="196" y="93" text-anchor="end">done</text>
  <text class="d-sub" x="196" y="221" text-anchor="end">done</text>
</svg>

Now \`top == bottom == 1\`: only one row is left. Leg 1 reads \`6, 7\` and moves \`top\` to 2. Leg 2 reads nothing (\`top > bottom\`). And here is the trap: without the check in leg 3, the loop would walk "the bottom row" — which is the same row 1 it just read — backwards and output 6 again. The two \`if\` checks in legs 3 and 4 exist exactly for the last lap of non-square matrices. Example 3 prints the buggy output.

📌 **Interview term: Simulation** — solving a problem by literally carrying out the process step by step (here: walking the spiral) rather than computing the answer with a formula.

### The alternative: direction vectors

Instead of four loops, walk one cell at a time with a current direction (right, down, left, up) stored as \`(dr, dc)\` pairs, and turn right whenever the next cell is outside the matrix or already visited. It is shorter to reason about, but it needs an m×n "visited" grid (O(m·n) extra space) unless you overwrite the input with a sentinel value.

📌 **Interview term: Direction vectors** — arrays like \`DR = [0, 1, 0, -1]\`, \`DC = [1, 0, -1, 0]\` that encode moving right, down, left and up, so turning is just \`d = (d + 1) % 4\`.

## 4. The JavaScript Code

~~~javascript
function spiralOrder(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  const out = [];
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);     // 1. top row, left to right
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);   // 2. right column, top to bottom
    right--;
    if (top <= bottom) {                                              // 3. bottom row, right to left
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {                                              // 4. left column, bottom to top
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}
~~~

Walk-through:

- The first line returns \`[]\` for both \`[]\` and \`[[]]\`. \`matrix.length === 0\` must be tested before \`matrix[0].length\`; \`||\` short-circuits, so the second test never runs on an empty array.
- The \`for\` loops use inclusive bounds (\`c <= right\`, \`c >= left\`), which keeps the code close to the description.
- The guards \`if (top <= bottom)\` and \`if (left <= right)\` protect the last lap of non-square matrices.
- The function never modifies \`matrix\`; it only reads from it.

Why the emptiness check and the guards matter in JavaScript specifically:

~~~javascript
function unsafeWidth(matrix) {
  return matrix[0].length - 1;          // no emptiness check
}
try {
  unsafeWidth([]);
} catch (e) {
  console.log('[] threw ' + e.name + ': ' + e.message);
}
console.log('[[]] width - 1 = ' + unsafeWidth([[]]) + ' (a while (left <= right) loop then never runs)');
console.log('reading past the edge: ' + [[1, 2], [3, 4]][5]);
~~~

~~~text
[] threw TypeError: Cannot read properties of undefined (reading 'length')
[[]] width - 1 = -1 (a while (left <= right) loop then never runs)
reading past the edge: undefined
~~~

On \`[]\`, \`matrix[0]\` is \`undefined\` and reading \`.length\` from it throws a \`TypeError\`. On \`[[]]\` the width is -1 and the main loop simply does not run, which is correct. And reading a row that does not exist gives \`undefined\` rather than an error: if a boundary drifts out of range, \`out.push(matrix[r][c])\` may throw (when the row is missing) or quietly store \`undefined\` (when only the column is out of range). Neither tells you which boundary was wrong.

### The direction-vector version

~~~javascript
const DR = [0, 1, 0, -1];              // right, down, left, up
const DC = [1, 0, -1, 0];

function spiralDirections(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  let r = 0, c = 0, d = 0;
  const out = [];
  for (let step = 0; step < rows * cols; step++) {
    out.push(matrix[r][c]);
    seen[r][c] = true;
    let nr = r + DR[d], nc = c + DC[d];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
      d = (d + 1) % 4;                 // blocked: turn right
      nr = r + DR[d];
      nc = c + DC[d];
    }
    r = nr;
    c = nc;
  }
  return out;
}
~~~

The \`seen\` grid is built with \`Array.from({ length: rows }, () => new Array(cols).fill(false))\`, which creates a new row for each index. \`new Array(rows).fill(new Array(cols).fill(false))\` would put one shared row in every slot, so marking one cell would mark that column in every row.

## 5. Verified: Running the Code

Each example was saved as \`main.js\` and run with \`node main.js\`.

**Example 1 — the boundary method on many shapes:**

~~~text
[1, 2, 3, 6, 9, 8, 7, 4, 5]
[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
[1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
[1, 2, 3, 4]
[1, 2, 3, 4]
[1, 2, 4, 3]
[1]
[]
~~~

Square, wide, tall, single row, single column, 2×2, 1×1 and empty all come out right; each result has exactly m·n values.

**Example 2 — direction vectors vs boundaries on all shapes from 1×1 to 6×6, and the reverse problem:**

~~~javascript
function generateSpiral(n) {
  const m = Array.from({ length: n }, () => new Array(n).fill(0));
  let top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) m[top][c] = k++;
    top++;
    for (let r = top; r <= bottom; r++) m[r][right] = k++;
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) m[bottom][c] = k++;
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) m[r][left] = k++;
      left++;
    }
  }
  return m;
}
~~~

~~~text
shapes where both methods agree: 36 of 36
spiral matrix for n = 4:
   1  2  3  4
  12 13 14  5
  11 16 15  6
  10  9  8  7
~~~

Both methods agree on all 36 shapes. \`m[top][c] = k++\` stores \`k\` and then increments it, which keeps the generator loop compact. \`String(x).padStart(2)\` right-aligns the numbers in the printout.

**Example 3 — what happens without the two guards:**

~~~text
3x3 buggy: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
3x3 fixed: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
1x4 buggy: [1, 2, 3, 4, 3, 2, 1] (7 items)
1x4 fixed: [1, 2, 3, 4] (4 items)
3x4 buggy: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6] (13 items)
3x4 fixed: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] (12 items)
3x1 buggy: [1, 2, 3, 2] (4 items)
3x1 fixed: [1, 2, 3] (3 items)
~~~

The 3×3 case hides the bug (its last lap is one cell). The single row 1×4 is read forwards and backwards, 3×4 repeats \`6\`, and the single column 3×1 repeats \`2\`. Always test a non-square matrix.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Four boundaries | O(m·n) | O(1) besides the output | Each cell is pushed exactly once. |
| Direction vectors + \`seen\` grid | O(m·n) | O(m·n) | One boolean per cell. |

The output has m·n values, so O(m·n) time is optimal. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **\`[]\` and \`[[]]\`:** return \`[]\`; check \`matrix.length\` before \`matrix[0].length\`.
- **Single row or single column:** the guards stop the second pass (Example 1).
- **1×1:** one value.
- **Wide vs tall:** 3×4 and 4×3 end their last lap differently; test both.
- **Ragged rows:** an out-of-range column read returns \`undefined\` and ends up in the output; validate row lengths if the input is untrusted.

## Common Pitfalls

- **Missing the two inner guards.** Non-square inputs produce duplicates (Example 3).
- **Reading \`matrix[0].length\` on \`[]\`.** It throws \`TypeError: Cannot read properties of undefined\`.
- **Silent \`undefined\`.** Out-of-range reads do not throw, so a boundary bug can put \`undefined\` into the result.
- **\`fill\` with an array for the visited grid.** All rows become the same object.
- **Off-by-one in loop bounds.** Mixing \`c < right\` and \`c <= right\` styles between legs misses or repeats corners.
- **Using \`shift()\` on the matrix rows to "peel" the top row.** It works, but it mutates the input and each \`shift\` is O(length of the array).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep four boundaries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bottom</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>; walk the top row, right column, bottom row and left column, shrinking one boundary after each, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom &amp;&amp; left &lt;= right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key detail:</strong> <span style="color:#f0e2c8;">Before the bottom row I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom</code>, and before the left column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt;= right</code>, so a single leftover row or column is not read twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Every cell is pushed once: O(m·n) time and O(1) extra space besides the result array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Direction vectors with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen</code> grid: move, and turn right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d = (d + 1) % 4</code> when blocked. O(m·n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript traps:</strong> <span style="color:#f0e2c8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix.length</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0].length</code> (it throws on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>), and remember out-of-range reads give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> silently.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a 3×3 test not catch the missing-guard bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd square the last lap is one cell, so legs 3 and 4 have nothing to repeat. On 3×4 the buggy version printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code> twice, and on 1×4 it printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4, 3, 2, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid the extra <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen</code> grid in the direction version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by overwriting visited cells with a sentinel such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, but that mutates the input. The boundary method needs neither.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generate an n×n spiral matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same boundary loop with writes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[top][c] = k++</code> and so on. Example 2 printed the 4×4 matrix with 1 to 12 around the edge and 13 to 16 in the middle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input is a jagged array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is not a matrix: rows have different lengths and the boundary logic reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. I would validate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix.every(row =&gt; row.length === matrix[0].length)</code> first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return it lazily for a huge matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write it as a generator function (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function*</code>) that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>s each value in the same loops; the caller can stop early without building the whole array.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Boundary pointers | \`top\`, \`bottom\`, \`left\`, \`right\`: the edges of the part not yet visited. |
| Simulation | Solving by carrying out the process step by step. |
| Direction vectors | \`(dr, dc)\` arrays for right, down, left, up; turning is \`d = (d + 1) % 4\`. |

**Conclusion:** Spiral order is four loops around a shrinking rectangle, moving one boundary inward after each side. The two guards before the bottom row and the left column are the whole difficulty, and only non-square inputs exercise them. In JavaScript, check for an empty matrix before touching \`matrix[0]\`, build helper grids with \`Array.from\`, and remember that out-of-range reads return \`undefined\` instead of failing loudly.`,
        examples: [
          {
            label: "Boundary method on square, wide, tall, single-row, single-column and empty matrices",
            code: `// Spiral order with four shrinking boundaries: top, bottom, left, right.
function spiralOrder(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  const out = [];
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);     // 1. top row, left to right
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);   // 2. right column, top to bottom
    right--;
    if (top <= bottom) {                                              // 3. bottom row, right to left
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {                                              // 4. left column, bottom to top
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function grid(rows, cols) {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c + 1));
}

console.log(fmt(spiralOrder(grid(3, 3)))); // [1, 2, 3, 6, 9, 8, 7, 4, 5]
console.log(fmt(spiralOrder(grid(3, 4)))); // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
console.log(fmt(spiralOrder(grid(4, 3)))); // [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
console.log(fmt(spiralOrder(grid(1, 4)))); // [1, 2, 3, 4]
console.log(fmt(spiralOrder(grid(4, 1)))); // [1, 2, 3, 4]
console.log(fmt(spiralOrder(grid(2, 2)))); // [1, 2, 4, 3]
console.log(fmt(spiralOrder(grid(1, 1)))); // [1]
console.log(fmt(spiralOrder([]))); // []
`,
          },
          {
            label: "Direction-vector simulation checked on all 36 shapes, plus generating a spiral matrix",
            code: `// Direction-vector simulation, checked against the boundary method on every shape
// from 1x1 to 6x6, plus generating an n x n spiral matrix (the reverse problem).
function spiralBounds(matrix) {
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  const out = [];
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) out.push(matrix[bottom][c]); bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) out.push(matrix[r][left]); left++; }
  }
  return out;
}

const DR = [0, 1, 0, -1];              // right, down, left, up
const DC = [1, 0, -1, 0];

function spiralDirections(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  let r = 0, c = 0, d = 0;
  const out = [];
  for (let step = 0; step < rows * cols; step++) {
    out.push(matrix[r][c]);
    seen[r][c] = true;
    let nr = r + DR[d], nc = c + DC[d];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
      d = (d + 1) % 4;                 // blocked: turn right
      nr = r + DR[d];
      nc = c + DC[d];
    }
    r = nr;
    c = nc;
  }
  return out;
}

function generateSpiral(n) {
  const m = Array.from({ length: n }, () => new Array(n).fill(0));
  let top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) m[top][c] = k++;
    top++;
    for (let r = top; r <= bottom; r++) m[r][right] = k++;
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) m[bottom][c] = k++;
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) m[r][left] = k++;
      left++;
    }
  }
  return m;
}

let agree = 0;
for (let rows = 1; rows <= 6; rows++) {
  for (let cols = 1; cols <= 6; cols++) {
    const m = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c));
    if (spiralBounds(m).join(',') === spiralDirections(m).join(',')) agree++;
  }
}
console.log('shapes where both methods agree: ' + agree + ' of 36');
console.log('spiral matrix for n = 4:');
for (const row of generateSpiral(4)) console.log('  ' + row.map((x) => String(x).padStart(2)).join(' '));
`,
          },
          {
            label: "The classic bug: missing the two inner guards, buggy vs fixed",
            code: `// The classic bug: forgetting the two "is there still a row / column?" checks.
function spiral(matrix, guarded) {
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  const out = [];
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (!guarded || top <= bottom) {             // without the guard: runs even when no row is left
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (!guarded || left <= right) {             // without the guard: runs even when no column is left
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function grid(rows, cols) {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c + 1));
}

for (const [rows, cols] of [[3, 3], [1, 4], [3, 4], [3, 1]]) {
  const m = grid(rows, cols);
  const b = spiral(m, false), f = spiral(m, true);
  console.log(rows + 'x' + cols + ' buggy: ' + fmt(b) + ' (' + b.length + ' items)');
  console.log(rows + 'x' + cols + ' fixed: ' + fmt(f) + ' (' + f.length + ' items)');
}
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an m by n \`int[][]\` matrix, write a Java method that returns a \`List<Integer>\` with all its elements in spiral order: right along the top, down the right side, left along the bottom, up the left side, and so on inward."

**What a strong answer should cover:**
- Four boundaries (\`top\`, \`bottom\`, \`left\`, \`right\`) that shrink after each side; loop while \`top <= bottom && left <= right\`.
- The two guards before the bottom row and the left column, so a leftover single row or column is not read twice.
- O(m·n) time, O(1) extra space besides the output list.
- The direction-vector alternative with a \`boolean[][]\` visited grid.
- Java specifics: \`matrix[0].length\` on an empty \`int[0][0]\` throws \`ArrayIndexOutOfBoundsException\`, \`new int[3][0]\` is a valid matrix with no columns, \`List<Integer>\` boxes every value (convert with \`stream().mapToInt(...)\` if an \`int[]\` is needed), and \`boolean[][]\` starts out all \`false\`.

**Clarifying questions expected:**
- "Can the matrix be non-square or empty?"
- "Return a \`List<Integer>\` or an \`int[]\`?"

**Code / implementation expected:** Yes — a static \`List<Integer> spiralOrder(int[][] matrix)\` using four boundaries.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Java 2D arrays, \`ArrayList\` and \`for\` loops.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`javac\` and run with \`java\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of mowing a rectangular lawn the way many people do: start at one corner, drive along the edge, turn right at each corner, and keep going round and round, each lap a little further inside, until you reach the middle. You never cross a strip you have already cut, and you never miss one.

Reading a matrix in spiral order is that lawn mower. Start at the top-left, go right along the top row, down the right column, left along the bottom row, up the left column, and then repeat one ring further in. The question is simple to state, but it is a favourite because the last lap is where people slip: when only a single row or a single column is left, a careless loop walks back over cells it has already visited.

The same "shrinking boundaries" idea is used for [rotating a matrix in place](/interview-question/how-do-you-rotate-an-n-n-matrix-by-90-degrees-in-place) (which also works ring by ring) and for printing or filling grids in games and image processing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the matrix always square, or can it be m×n? | Non-square shapes are where the single-row / single-column edge case appears. |
| Clockwise starting at the top-left? | Other starting points or counter-clockwise only change the order of the four sides. |
| Can the matrix be empty, or have rows of length 0? | You must check before reading \`matrix[0]\`. |
| Should I return a list, or print as I go? | Usually return a list of m·n values. |
| May I modify the input? | Some short solutions destroy the matrix; the boundary method does not. |

## 3. The Core Idea: Four Shrinking Boundaries

Keep four numbers that describe the part of the matrix you have **not** visited yet: the first unvisited row \`top\`, the last unvisited row \`bottom\`, the first unvisited column \`left\` and the last unvisited column \`right\`.

📌 **Interview term: Boundary pointers** — four indices (\`top\`, \`bottom\`, \`left\`, \`right\`) that mark the edges of the unvisited rectangle. Each side you walk moves one of them inward by one.

One lap has four legs:

1. Walk the **top row** from \`left\` to \`right\`, then \`top += 1\` (that row is done).
2. Walk the **right column** from \`top\` to \`bottom\`, then \`right -= 1\`.
3. If a row is still left (\`top <= bottom\`), walk the **bottom row** from \`right\` back to \`left\`, then \`bottom -= 1\`.
4. If a column is still left (\`left <= right\`), walk the **left column** from \`bottom\` back up to \`top\`, then \`left += 1\`.

Repeat while \`top <= bottom and left <= right\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Spiral order of a 3 by 4 matrix: 1 2 3 4 along the top, 8 12 down the right, 11 10 9 along the bottom, 5 up the left, then 6 7 in the middle">
  <defs>
    <marker id="b09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="64" text-anchor="middle">1</text>
  <rect class="d-box" x="124" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="64" text-anchor="middle">2</text>
  <rect class="d-box" x="188" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="64" text-anchor="middle">3</text>
  <rect class="d-box" x="252" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">4</text>
  <rect class="d-box" x="60" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="128" text-anchor="middle">5</text>
  <rect class="d-box" x="124" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="128" text-anchor="middle">6</text>
  <rect class="d-box" x="188" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="128" text-anchor="middle">7</text>
  <rect class="d-box" x="252" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="128" text-anchor="middle">8</text>
  <rect class="d-box" x="60" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="192" text-anchor="middle">9</text>
  <rect class="d-box" x="124" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="192" text-anchor="middle">10</text>
  <rect class="d-box" x="188" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="192" text-anchor="middle">11</text>
  <rect class="d-box" x="252" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="192" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 100 82 L 292 82 L 292 210 L 100 210 L 100 146 L 228 146" marker-end="url(#b09q4-arrow)"/>
  <text class="d-sub" x="390" y="70">1. top row: left to right</text>
  <text class="d-sub" x="390" y="102">2. right column: downwards</text>
  <text class="d-sub" x="390" y="134">3. bottom row: right to left</text>
  <text class="d-sub" x="390" y="166">4. left column: upwards</text>
  <text class="d-sub" x="390" y="198">then repeat one ring inside</text>
</svg>

The accent line is the reading order for a 3×4 matrix: \`1 2 3 4 8 12 11 10 9 5 6 7\`. After the outer ring, the boundaries have moved in by one on every side:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Boundaries after one lap of a 3 by 4 matrix. The outer ring is done. top and bottom are both 1, left is 1 and right is 2, so only 6 and 7 remain">
  <rect class="d-box-muted" x="220" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="93" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="284" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="93" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="348" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="93" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="412" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="93" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="157" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="284" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="157" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="348" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="157" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="412" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="157" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="220" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="221" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="284" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="221" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="348" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="221" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="412" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="221" text-anchor="middle">12</text>
  <text class="d-sub" x="196" y="157" text-anchor="end">top = bottom = 1</text>
  <text class="d-sub" x="312" y="44" text-anchor="middle">left = 1</text>
  <text class="d-sub" x="376" y="44" text-anchor="middle">right = 2</text>
  <text class="d-sub" x="196" y="93" text-anchor="end">done</text>
  <text class="d-sub" x="196" y="221" text-anchor="end">done</text>
</svg>

Now \`top == bottom == 1\`: only one row is left. Leg 1 reads \`6, 7\` and moves \`top\` to 2. Leg 2 reads nothing (\`top > bottom\`). And here is the trap: without the check in leg 3, the loop would walk "the bottom row" — which is the same row 1 it just read — backwards and output 6 again. The two \`if\` checks in legs 3 and 4 exist exactly for the last lap of non-square matrices. Example 3 prints the buggy output.

📌 **Interview term: Simulation** — solving a problem by literally carrying out the process step by step (here: walking the spiral) rather than computing the answer with a formula.

### The alternative: direction vectors

Instead of four loops, walk one cell at a time with a current direction (right, down, left, up) stored as \`(dr, dc)\` pairs, and turn right whenever the next cell is outside the matrix or already visited. It is shorter to reason about, but it needs an m×n "visited" grid (O(m·n) extra space) unless you overwrite the input with a sentinel value.

📌 **Interview term: Direction vectors** — arrays like \`DR = [0, 1, 0, -1]\`, \`DC = [1, 0, -1, 0]\` that encode moving right, down, left and up, so turning is just \`d = (d + 1) % 4\`.

## 4. The Java Code

~~~java
    static List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        if (matrix.length == 0 || matrix[0].length == 0) return out;
        int top = 0, bottom = matrix.length - 1;
        int left = 0, right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);     // 1. top row, left to right
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);   // 2. right column, top to bottom
            right--;
            if (top <= bottom) {                                             // 3. bottom row, right to left
                for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {                                             // 4. left column, bottom to top
                for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
                left++;
            }
        }
        return out;
    }
~~~

Walk-through:

- The result is a \`List<Integer>\`, the usual signature for this problem. \`out.add(matrix[top][c])\` autoboxes each \`int\` into an \`Integer\`.
- \`matrix.length == 0 || matrix[0].length == 0\` returns an empty list for both \`new int[0][0]\` and \`new int[3][0]\`; \`||\` short-circuits, so \`matrix[0]\` is never read on an empty array.
- The four \`for\` loops use inclusive bounds, matching the boundary definitions.
- The two \`if\` guards protect the last lap of non-square matrices.
- \`System.out.println(list)\` prints \`[1, 2, 3]\` because \`ArrayList.toString\` formats the elements; that is why the output needs no helper.

Why the emptiness check matters in Java, and what an empty matrix can look like:

~~~java
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        int[][] empty = new int[0][0];
        try {
            System.out.println(empty[0].length);
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("empty[0] threw ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
        int[][] noColumns = new int[3][0];
        System.out.println("new int[3][0]: rows = " + noColumns.length + ", cols = " + noColumns[0].length);

        List<Integer> out = new ArrayList<>(List.of(1, 2, 3));
        int[] asArray = out.stream().mapToInt(Integer::intValue).toArray();
        System.out.println("List prints as " + out + ", int[] has length " + asArray.length);
    }
}
~~~

~~~text
empty[0] threw ArrayIndexOutOfBoundsException: Index 0 out of bounds for length 0
new int[3][0]: rows = 3, cols = 0
List prints as [1, 2, 3], int[] has length 3
~~~

\`empty[0]\` on a zero-length array throws \`ArrayIndexOutOfBoundsException\`, so the order of the two checks matters. \`new int[3][0]\` has three rows and zero columns, and must also return an empty list. If the caller needs an \`int[]\`, \`out.stream().mapToInt(Integer::intValue).toArray()\` converts the list (or allocate \`new int[m * n]\` and fill it with an index, which avoids boxing altogether).

📌 **Interview term: Autoboxing** — Java wrapping each \`int\` in an \`Integer\` object when it goes into a \`List<Integer>\`; convenient, but it costs memory and time per element.

### The direction-vector version

~~~java
    static final int[] DR = {0, 1, 0, -1};   // right, down, left, up
    static final int[] DC = {1, 0, -1, 0};

    static List<Integer> spiralDirections(int[][] matrix) {
        int rows = matrix.length, cols = matrix[0].length;
        boolean[][] seen = new boolean[rows][cols];   // Java initialises booleans to false
        int r = 0, c = 0, d = 0;
        List<Integer> out = new ArrayList<>(rows * cols);
        for (int step = 0; step < rows * cols; step++) {
            out.add(matrix[r][c]);
            seen[r][c] = true;
            int nr = r + DR[d], nc = c + DC[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
                d = (d + 1) % 4;                      // blocked: turn right
                nr = r + DR[d];
                nc = c + DC[d];
            }
            r = nr;
            c = nc;
        }
        return out;
    }
~~~

\`new boolean[rows][cols]\` starts with every element \`false\`, so no initialisation loop is needed. \`new ArrayList<>(rows * cols)\` pre-sizes the list so it never has to grow.

## 5. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\`.

**Example 1 — the boundary method on many shapes:**

~~~text
[1, 2, 3, 6, 9, 8, 7, 4, 5]
[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
[1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
[1, 2, 3, 4]
[1, 2, 3, 4]
[1, 2, 4, 3]
[1]
[]
~~~

Square, wide, tall, single row, single column, 2×2, 1×1 and empty all come out right; each list has exactly m·n values.

**Example 2 — direction vectors vs boundaries on all shapes from 1×1 to 6×6, and the reverse problem:**

~~~java
    static int[][] generateSpiral(int n) {
        int[][] m = new int[n][n];
        int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) m[top][c] = k++;
            top++;
            for (int r = top; r <= bottom; r++) m[r][right] = k++;
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) m[bottom][c] = k++;
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) m[r][left] = k++;
                left++;
            }
        }
        return m;
    }
~~~

~~~text
shapes where both methods agree: 36 of 36
spiral matrix for n = 4:
   1  2  3  4
  12 13 14  5
  11 16 15  6
  10  9  8  7
~~~

Both methods agree on all 36 shapes; \`List.equals\` compares the lists element by element (with \`Integer.equals\`, so the boxing does not cause \`==\` problems here). Generating the spiral matrix is the same loop with \`m[top][c] = k++\`.

**Example 3 — what happens without the two guards:**

~~~text
3x3 buggy: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
3x3 fixed: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
1x4 buggy: [1, 2, 3, 4, 3, 2, 1] (7 items)
1x4 fixed: [1, 2, 3, 4] (4 items)
3x4 buggy: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6] (13 items)
3x4 fixed: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] (12 items)
3x1 buggy: [1, 2, 3, 2] (4 items)
3x1 fixed: [1, 2, 3] (3 items)
~~~

The 3×3 case hides the bug. The single row 1×4 is read forwards and backwards, 3×4 repeats \`6\`, and the single column 3×1 repeats \`2\`.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Four boundaries | O(m·n) | O(1) besides the output | Each cell is added exactly once. |
| Direction vectors + \`boolean[][]\` | O(m·n) | O(m·n) | One flag per cell. |

The output has m·n values, so O(m·n) time is optimal. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **\`new int[0][0]\` and \`new int[3][0]\`:** return an empty list; check \`matrix.length\` before \`matrix[0].length\`.
- **Single row or single column:** the guards stop the second pass.
- **1×1:** one value.
- **Wide vs tall:** 3×4 and 4×3 end their last lap differently; test both.
- **Jagged arrays:** Java allows rows of different lengths; this code would throw \`ArrayIndexOutOfBoundsException\` on a short row. Validate if the input is not a proper matrix.
- **\`null\` matrix:** throws \`NullPointerException\`; check for it if the contract allows null.

## Common Pitfalls

- **Missing the two inner guards.** Non-square inputs produce duplicates (Example 3).
- **Reading \`matrix[0]\` on an empty array.** \`ArrayIndexOutOfBoundsException\`; check \`matrix.length == 0\` first.
- **Forgetting \`new int[m][0]\`.** \`matrix.length > 0\` but there are no columns; \`right\` becomes -1 and the loop must not run.
- **Comparing \`Integer\`s from the list with \`==\`.** It compares references; values above 127 may be different objects. Use \`equals\` or unbox.
- **Off-by-one between legs.** If leg 2 starts at \`top\` before \`top++\`, the top-right corner is added twice.
- **Returning \`int[]\` built from an un-sized \`ArrayList\`.** Fine, but pre-sizing (\`new ArrayList<>(m * n)\`) or filling an \`int[]\` directly avoids repeated growth.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep four boundaries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bottom</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>; walk the top row, right column, bottom row and left column, shrinking one boundary after each, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom &amp;&amp; left &lt;= right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key detail:</strong> <span style="color:#f0e2c8;">Before the bottom row I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom</code>, and before the left column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt;= right</code>, so a single leftover row or column is not read twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Every cell is added once: O(m·n) time and O(1) extra space besides the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Direction vectors with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[][] seen</code>, turning right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d = (d + 1) % 4</code> when blocked. O(m·n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java details:</strong> <span style="color:#f0e2c8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix.length == 0</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0].length</code>, handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[m][0]</code>, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code> boxes every value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a 3×3 test not catch the missing-guard bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd square the last lap is one cell. On 3×4 the buggy version printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code> twice, and on 1×4 it printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4, 3, 2, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Allocate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[m * n]</code> and write with an index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idx++</code> in the same loops; that avoids boxing entirely. Converting the list with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stream().mapToInt(Integer::intValue).toArray()</code> also works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generate an n×n spiral matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same boundary loop with writes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[top][c] = k++</code>. Example 2 printed the 4×4 matrix with 13 to 16 in the middle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen</code> array in the direction version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by overwriting visited cells with a sentinel such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code>, which mutates the input and fails if that value can appear in the data. The boundary method needs neither.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rows have different lengths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java allows jagged arrays, but then it is not a matrix. I would validate that every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row.length</code> equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0].length</code> and throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IllegalArgumentException</code> otherwise.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Boundary pointers | \`top\`, \`bottom\`, \`left\`, \`right\`: the edges of the part not yet visited. |
| Simulation | Solving by carrying out the process step by step. |
| Direction vectors | \`(dr, dc)\` arrays for right, down, left, up; turning is \`d = (d + 1) % 4\`. |
| Autoboxing | Java wrapping each \`int\` in an \`Integer\` when it goes into a \`List<Integer>\`. |

**Conclusion:** Spiral order is four loops around a shrinking rectangle, moving one boundary inward after each side, with two guards that only matter for non-square matrices. In Java, check \`matrix.length\` before \`matrix[0].length\`, remember that \`new int[m][0]\` is a legal empty matrix, and be aware that the usual \`List<Integer>\` return type boxes every element; an \`int[]\` filled by index avoids that.`,
        examples: [
          {
            label: "Boundary method on square, wide, tall, single-row, single-column and empty matrices",
            code: `// Spiral order with four shrinking boundaries: top, bottom, left, right.
import java.util.ArrayList;
import java.util.List;

public class Main {
    static List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        if (matrix.length == 0 || matrix[0].length == 0) return out;
        int top = 0, bottom = matrix.length - 1;
        int left = 0, right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);     // 1. top row, left to right
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);   // 2. right column, top to bottom
            right--;
            if (top <= bottom) {                                             // 3. bottom row, right to left
                for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {                                             // 4. left column, bottom to top
                for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
                left++;
            }
        }
        return out;
    }

    static int[][] grid(int rows, int cols) {
        int[][] m = new int[rows][cols];
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) m[r][c] = r * cols + c + 1;
        return m;
    }

    public static void main(String[] args) {
        System.out.println(spiralOrder(grid(3, 3)));   // [1, 2, 3, 6, 9, 8, 7, 4, 5]
        System.out.println(spiralOrder(grid(3, 4)));   // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
        System.out.println(spiralOrder(grid(4, 3)));   // [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
        System.out.println(spiralOrder(grid(1, 4)));   // [1, 2, 3, 4]
        System.out.println(spiralOrder(grid(4, 1)));   // [1, 2, 3, 4]
        System.out.println(spiralOrder(grid(2, 2)));   // [1, 2, 4, 3]
        System.out.println(spiralOrder(grid(1, 1)));   // [1]
        System.out.println(spiralOrder(new int[0][0])); // []
    }
}
`,
          },
          {
            label: "Direction-vector simulation checked on all 36 shapes, plus generating a spiral matrix",
            code: `// Direction-vector simulation, checked against the boundary method on every shape
// from 1x1 to 6x6, plus generating an n x n spiral matrix (the reverse problem).
import java.util.ArrayList;
import java.util.List;

public class Main {
    static List<Integer> spiralBounds(int[][] matrix) {
        int top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
        List<Integer> out = new ArrayList<>();
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
            right--;
            if (top <= bottom) { for (int c = right; c >= left; c--) out.add(matrix[bottom][c]); bottom--; }
            if (left <= right) { for (int r = bottom; r >= top; r--) out.add(matrix[r][left]); left++; }
        }
        return out;
    }

    static final int[] DR = {0, 1, 0, -1};   // right, down, left, up
    static final int[] DC = {1, 0, -1, 0};

    static List<Integer> spiralDirections(int[][] matrix) {
        int rows = matrix.length, cols = matrix[0].length;
        boolean[][] seen = new boolean[rows][cols];   // Java initialises booleans to false
        int r = 0, c = 0, d = 0;
        List<Integer> out = new ArrayList<>(rows * cols);
        for (int step = 0; step < rows * cols; step++) {
            out.add(matrix[r][c]);
            seen[r][c] = true;
            int nr = r + DR[d], nc = c + DC[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
                d = (d + 1) % 4;                      // blocked: turn right
                nr = r + DR[d];
                nc = c + DC[d];
            }
            r = nr;
            c = nc;
        }
        return out;
    }

    static int[][] generateSpiral(int n) {
        int[][] m = new int[n][n];
        int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) m[top][c] = k++;
            top++;
            for (int r = top; r <= bottom; r++) m[r][right] = k++;
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) m[bottom][c] = k++;
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) m[r][left] = k++;
                left++;
            }
        }
        return m;
    }

    public static void main(String[] args) {
        int agree = 0;
        for (int rows = 1; rows <= 6; rows++) {
            for (int cols = 1; cols <= 6; cols++) {
                int[][] m = new int[rows][cols];
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) m[r][c] = r * cols + c;
                if (spiralBounds(m).equals(spiralDirections(m))) agree++;   // List.equals compares elements
            }
        }
        System.out.println("shapes where both methods agree: " + agree + " of 36");
        System.out.println("spiral matrix for n = 4:");
        for (int[] row : generateSpiral(4)) {
            StringBuilder sb = new StringBuilder(" ");
            for (int x : row) sb.append(String.format(" %2d", x));
            System.out.println(sb);
        }
    }
}
`,
          },
          {
            label: "The classic bug: missing the two inner guards, buggy vs fixed",
            code: `// The classic bug: forgetting the two "is there still a row / column?" checks.
import java.util.ArrayList;
import java.util.List;

public class Main {
    static List<Integer> spiral(int[][] matrix, boolean guarded) {
        int top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
        List<Integer> out = new ArrayList<>();
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
            right--;
            if (!guarded || top <= bottom) {         // without the guard: runs even when no row is left
                for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
                bottom--;
            }
            if (!guarded || left <= right) {         // without the guard: runs even when no column is left
                for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
                left++;
            }
        }
        return out;
    }

    static int[][] grid(int rows, int cols) {
        int[][] m = new int[rows][cols];
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) m[r][c] = r * cols + c + 1;
        return m;
    }

    public static void main(String[] args) {
        int[][] shapes = {{3, 3}, {1, 4}, {3, 4}, {3, 1}};
        for (int[] s : shapes) {
            int[][] m = grid(s[0], s[1]);
            List<Integer> b = spiral(m, false), f = spiral(m, true);
            System.out.println(s[0] + "x" + s[1] + " buggy: " + b + " (" + b.size() + " items)");
            System.out.println(s[0] + "x" + s[1] + " fixed: " + f + " (" + f.size() + " items)");
        }
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an m by n matrix as a vector of vectors of ints, write a C++ function that returns a vector with all its elements in spiral order: right along the top, down the right side, left along the bottom, up the left side, and so on inward."

**What a strong answer should cover:**
- Four boundaries (\`top\`, \`bottom\`, \`left\`, \`right\`) that shrink after each side; loop while \`top <= bottom && left <= right\`.
- The two guards before the bottom row and the left column, so a leftover single row or column is not read twice.
- O(m·n) time, O(1) extra space besides the output; \`reserve(m * n)\` for the result.
- The direction-vector alternative with a visited grid.
- C++ specifics: the boundaries must be signed \`int\` (\`size() - 1\` on an empty row wraps to a huge unsigned value), \`matrix[0]\` on an empty vector is undefined behaviour (\`.at(0)\` throws instead), and the matrix should be taken by \`const&\`.

**Clarifying questions expected:**
- "Can the matrix be non-square or empty?"
- "May I assume all rows have the same length?"

**Code / implementation expected:** Yes — \`vector<int> spiralOrder(const vector<vector<int>>& matrix)\` using four boundaries.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need \`std::vector\` and \`for\` loops.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`g++ -std=c++17\` and run, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of mowing a rectangular lawn the way many people do: start at one corner, drive along the edge, turn right at each corner, and keep going round and round, each lap a little further inside, until you reach the middle. You never cross a strip you have already cut, and you never miss one.

Reading a matrix in spiral order is that lawn mower. Start at the top-left, go right along the top row, down the right column, left along the bottom row, up the left column, and then repeat one ring further in. The question is simple to state, but it is a favourite because the last lap is where people slip: when only a single row or a single column is left, a careless loop walks back over cells it has already visited.

The same "shrinking boundaries" idea is used for [rotating a matrix in place](/interview-question/how-do-you-rotate-an-n-n-matrix-by-90-degrees-in-place) (which also works ring by ring) and for printing or filling grids in games and image processing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the matrix always square, or can it be m×n? | Non-square shapes are where the single-row / single-column edge case appears. |
| Clockwise starting at the top-left? | Other starting points or counter-clockwise only change the order of the four sides. |
| Can the matrix be empty, or have rows of length 0? | You must check before reading \`matrix[0]\`. |
| Should I return a list, or print as I go? | Usually return a list of m·n values. |
| May I modify the input? | Some short solutions destroy the matrix; the boundary method does not. |

## 3. The Core Idea: Four Shrinking Boundaries

Keep four numbers that describe the part of the matrix you have **not** visited yet: the first unvisited row \`top\`, the last unvisited row \`bottom\`, the first unvisited column \`left\` and the last unvisited column \`right\`.

📌 **Interview term: Boundary pointers** — four indices (\`top\`, \`bottom\`, \`left\`, \`right\`) that mark the edges of the unvisited rectangle. Each side you walk moves one of them inward by one.

One lap has four legs:

1. Walk the **top row** from \`left\` to \`right\`, then \`top += 1\` (that row is done).
2. Walk the **right column** from \`top\` to \`bottom\`, then \`right -= 1\`.
3. If a row is still left (\`top <= bottom\`), walk the **bottom row** from \`right\` back to \`left\`, then \`bottom -= 1\`.
4. If a column is still left (\`left <= right\`), walk the **left column** from \`bottom\` back up to \`top\`, then \`left += 1\`.

Repeat while \`top <= bottom and left <= right\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Spiral order of a 3 by 4 matrix: 1 2 3 4 along the top, 8 12 down the right, 11 10 9 along the bottom, 5 up the left, then 6 7 in the middle">
  <defs>
    <marker id="b09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="64" text-anchor="middle">1</text>
  <rect class="d-box" x="124" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="64" text-anchor="middle">2</text>
  <rect class="d-box" x="188" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="64" text-anchor="middle">3</text>
  <rect class="d-box" x="252" y="40" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">4</text>
  <rect class="d-box" x="60" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="128" text-anchor="middle">5</text>
  <rect class="d-box" x="124" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="128" text-anchor="middle">6</text>
  <rect class="d-box" x="188" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="128" text-anchor="middle">7</text>
  <rect class="d-box" x="252" y="104" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="128" text-anchor="middle">8</text>
  <rect class="d-box" x="60" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="78" y="192" text-anchor="middle">9</text>
  <rect class="d-box" x="124" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="142" y="192" text-anchor="middle">10</text>
  <rect class="d-box" x="188" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="206" y="192" text-anchor="middle">11</text>
  <rect class="d-box" x="252" y="168" width="56" height="56" rx="6"/>
  <text class="d-text" x="270" y="192" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 100 82 L 292 82 L 292 210 L 100 210 L 100 146 L 228 146" marker-end="url(#b09q4-arrow)"/>
  <text class="d-sub" x="390" y="70">1. top row: left to right</text>
  <text class="d-sub" x="390" y="102">2. right column: downwards</text>
  <text class="d-sub" x="390" y="134">3. bottom row: right to left</text>
  <text class="d-sub" x="390" y="166">4. left column: upwards</text>
  <text class="d-sub" x="390" y="198">then repeat one ring inside</text>
</svg>

The accent line is the reading order for a 3×4 matrix: \`1 2 3 4 8 12 11 10 9 5 6 7\`. After the outer ring, the boundaries have moved in by one on every side:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Boundaries after one lap of a 3 by 4 matrix. The outer ring is done. top and bottom are both 1, left is 1 and right is 2, so only 6 and 7 remain">
  <rect class="d-box-muted" x="220" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="93" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="284" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="93" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="348" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="93" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="412" y="60" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="93" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="157" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="284" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="157" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="348" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="157" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="412" y="124" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="157" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="220" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="248" y="221" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="284" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="312" y="221" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="348" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="376" y="221" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="412" y="188" width="56" height="56" rx="6"/>
  <text class="d-text" x="440" y="221" text-anchor="middle">12</text>
  <text class="d-sub" x="196" y="157" text-anchor="end">top = bottom = 1</text>
  <text class="d-sub" x="312" y="44" text-anchor="middle">left = 1</text>
  <text class="d-sub" x="376" y="44" text-anchor="middle">right = 2</text>
  <text class="d-sub" x="196" y="93" text-anchor="end">done</text>
  <text class="d-sub" x="196" y="221" text-anchor="end">done</text>
</svg>

Now \`top == bottom == 1\`: only one row is left. Leg 1 reads \`6, 7\` and moves \`top\` to 2. Leg 2 reads nothing (\`top > bottom\`). And here is the trap: without the check in leg 3, the loop would walk "the bottom row" — which is the same row 1 it just read — backwards and output 6 again. The two \`if\` checks in legs 3 and 4 exist exactly for the last lap of non-square matrices. Example 3 prints the buggy output.

📌 **Interview term: Simulation** — solving a problem by literally carrying out the process step by step (here: walking the spiral) rather than computing the answer with a formula.

### The alternative: direction vectors

Instead of four loops, walk one cell at a time with a current direction (right, down, left, up) stored as \`(dr, dc)\` pairs, and turn right whenever the next cell is outside the matrix or already visited. It is shorter to reason about, but it needs an m×n "visited" grid (O(m·n) extra space) unless you overwrite the input with a sentinel value.

📌 **Interview term: Direction vectors** — arrays like \`DR = [0, 1, 0, -1]\`, \`DC = [1, 0, -1, 0]\` that encode moving right, down, left and up, so turning is just \`d = (d + 1) % 4\`.

## 4. The C++ Code

~~~cpp
vector<int> spiralOrder(const vector<vector<int>>& matrix) {
    vector<int> out;
    if (matrix.empty() || matrix[0].empty()) return out;     // check before touching matrix[0]
    int top = 0, bottom = static_cast<int>(matrix.size()) - 1;
    int left = 0, right = static_cast<int>(matrix[0].size()) - 1;
    out.reserve(matrix.size() * matrix[0].size());
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);     // 1. top row, left to right
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);   // 2. right column, top to bottom
        right--;
        if (top <= bottom) {                                                   // 3. bottom row, right to left
            for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {                                                   // 4. left column, bottom to top
            for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
            left++;
        }
    }
    return out;
}
~~~

Walk-through:

- The matrix is a \`const vector<vector<int>>&\`: no copy, and the function promises not to modify it.
- \`matrix.empty() || matrix[0].empty()\` comes first. \`||\` short-circuits, so \`matrix[0]\` is only read when the outer vector has at least one row.
- The boundaries are \`int\`, converted once from \`size()\`. This is not style: \`right\` must be able to become -1.
- \`out.reserve(matrix.size() * matrix[0].size())\` allocates the result once.
- The two \`if\` guards protect the last lap of non-square matrices.

Why the signed boundaries and the emptiness check matter in C++:

~~~cpp
#include <iostream>
#include <stdexcept>
#include <vector>
using namespace std;

int main() {
    vector<vector<int>> empty;
    try {
        cout << empty.at(0).size() << "\\n";            // .at() checks the index
    } catch (const out_of_range&) {
        cout << "empty.at(0) threw std::out_of_range\\n";
    }
    vector<vector<int>> noColumns(3);                  // 3 rows, each empty
    auto right = noColumns[0].size() - 1;              // size_t arithmetic
    cout << "noColumns[0].size() - 1 = " << right << "\\n";
    int safeRight = static_cast<int>(noColumns[0].size()) - 1;
    cout << "as int: " << safeRight << "\\n";
    return 0;
}
~~~

~~~text
empty.at(0) threw std::out_of_range
noColumns[0].size() - 1 = 18446744073709551615
as int: -1
~~~

\`matrix[0]\` on an empty vector is undefined behaviour: it may crash, or read garbage, or appear to work. \`.at(0)\` checks and throws \`std::out_of_range\`, which is useful while debugging. And for a matrix with three empty rows, \`noColumns[0].size() - 1\` is computed in unsigned \`size_t\` arithmetic and wraps around to 18446744073709551615; a \`for (c = left; c <= right; ...)\` loop with that \`right\` would run off the end of memory. Converted to \`int\` first, it is -1 and the loop correctly does nothing.

📌 **Interview term: Undefined behaviour** — code the C++ standard places no requirements on (such as out-of-range \`operator[]\`); the program may crash, misbehave or seem fine, so it must be avoided rather than tested for.

### The direction-vector version

~~~cpp
const int DR[] = {0, 1, 0, -1};   // right, down, left, up
const int DC[] = {1, 0, -1, 0};

vector<int> spiralDirections(const Matrix& matrix) {
    int rows = static_cast<int>(matrix.size()), cols = static_cast<int>(matrix[0].size());
    vector<vector<bool>> seen(rows, vector<bool>(cols, false));
    int r = 0, c = 0, d = 0;
    vector<int> out;
    out.reserve(rows * cols);
    for (int step = 0; step < rows * cols; step++) {
        out.push_back(matrix[r][c]);
        seen[r][c] = true;
        int nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
            d = (d + 1) % 4;                  // blocked: turn right
            nr = r + DR[d];
            nc = c + DC[d];
        }
        r = nr;
        c = nc;
    }
    return out;
}
~~~

\`vector<vector<bool>>\` works for the visited grid, but note that \`vector<bool>\` is a special space-saving specialisation that packs bits, so \`seen[r][c]\` returns a proxy object rather than a real \`bool&\`. For this code it does not matter; a \`vector<char>\` or a flat \`vector<unsigned char>\` is a common alternative when it does.

## 5. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the boundary method on many shapes:**

~~~text
[1, 2, 3, 6, 9, 8, 7, 4, 5]
[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
[1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
[1, 2, 3, 4]
[1, 2, 3, 4]
[1, 2, 4, 3]
[1]
[]
~~~

Square, wide, tall, single row, single column, 2×2, 1×1 and empty all come out right; each result has exactly m·n values.

**Example 2 — direction vectors vs boundaries on all shapes from 1×1 to 6×6, and the reverse problem:**

~~~cpp
Matrix generateSpiral(int n) {
    Matrix m(n, vector<int>(n, 0));
    int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) m[top][c] = k++;
        top++;
        for (int r = top; r <= bottom; r++) m[r][right] = k++;
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) m[bottom][c] = k++;
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) m[r][left] = k++;
            left++;
        }
    }
    return m;
}
~~~

~~~text
shapes where both methods agree: 36 of 36
spiral matrix for n = 4:
   1  2  3  4
  12 13 14  5
  11 16 15  6
  10  9  8  7
~~~

Both methods agree on all 36 shapes (\`==\` on two \`vector<int>\` compares sizes and elements). Generating the spiral matrix is the same loop with \`m[top][c] = k++\`.

**Example 3 — what happens without the two guards:**

~~~text
3x3 buggy: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
3x3 fixed: [1, 2, 3, 6, 9, 8, 7, 4, 5] (9 items)
1x4 buggy: [1, 2, 3, 4, 3, 2, 1] (7 items)
1x4 fixed: [1, 2, 3, 4] (4 items)
3x4 buggy: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6] (13 items)
3x4 fixed: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] (12 items)
3x1 buggy: [1, 2, 3, 2] (4 items)
3x1 fixed: [1, 2, 3] (3 items)
~~~

The 3×3 case hides the bug. The single row 1×4 is read forwards and backwards, 3×4 repeats \`6\`, and the single column 3×1 repeats \`2\`. In C++ a boundary bug can be worse than a duplicate: if an index goes out of range, \`operator[]\` reads memory it does not own.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Four boundaries | O(m·n) | O(1) besides the output | Each cell is pushed exactly once; \`reserve\` avoids regrowth. |
| Direction vectors + visited grid | O(m·n) | O(m·n) | One flag per cell (bits, with \`vector<bool>\`). |

The output has m·n values, so O(m·n) time is optimal. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **\`{}\` and a matrix of empty rows:** return an empty vector; check \`matrix.empty()\` before \`matrix[0]\`.
- **Single row or single column:** the guards stop the second pass.
- **1×1:** one value.
- **Wide vs tall:** 3×4 and 4×3 end their last lap differently; test both.
- **Rows of different lengths:** undefined behaviour with \`operator[]\`; validate first if the input is not guaranteed rectangular.

## Common Pitfalls

- **Missing the two inner guards.** Non-square inputs produce duplicates (Example 3).
- **Unsigned boundaries.** \`size_t right = row.size() - 1\` wraps to a huge value for an empty row, and \`right -= 1\` past 0 wraps too. Use \`int\`.
- **\`matrix[0]\` on an empty matrix.** Undefined behaviour, not an exception.
- **Taking the matrix by value.** \`vector<int> spiralOrder(vector<vector<int>> matrix)\` copies all m·n elements on every call.
- **Not reserving the output.** \`push_back\` may reallocate several times; \`reserve(m * n)\` makes it one allocation.
- **Off-by-one between legs.** Starting leg 2 at \`top\` before incrementing it adds the top-right corner twice.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep four <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> boundaries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bottom</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>; walk the top row, right column, bottom row and left column, shrinking one boundary after each, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom &amp;&amp; left &lt;= right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key detail:</strong> <span style="color:#f0e2c8;">Before the bottom row I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top &lt;= bottom</code>, and before the left column <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt;= right</code>, so a single leftover row or column is not read twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Every cell is pushed once: O(m·n) time, O(1) extra space besides the result, which I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> up front.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Direction vectors with a visited grid, turning right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d = (d + 1) % 4</code> when blocked. O(m·n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ traps:</strong> <span style="color:#f0e2c8;">Boundaries must be signed, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> on an empty row wraps to 18446744073709551615, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0]</code> on an empty matrix is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a 3×3 test not catch the missing-guard bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd square the last lap is one cell. On 3×4 the buggy version printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6</code> twice, and on 1×4 it printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4, 3, 2, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the boundaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bottom</code> move down and can become -1. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> they wrap around to a huge number, so the loops would index far outside the matrix instead of stopping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generate an n×n spiral matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same boundary loop with writes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m[top][c] = k++</code>. Example 2 printed the 4×4 matrix with 13 to 16 in the middle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;bool&gt;&gt;</code> a good visited grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> is a bit-packed specialisation whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> returns a proxy, not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool&amp;</code>. A flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;char&gt;</code> of size m·n is simpler and faster to index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store the matrix for performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As one flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> of size m·n with index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code>: one allocation and better cache behaviour. The boundary logic stays the same, only the indexing changes.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Boundary pointers | \`top\`, \`bottom\`, \`left\`, \`right\`: the edges of the part not yet visited. |
| Simulation | Solving by carrying out the process step by step. |
| Direction vectors | \`(dr, dc)\` arrays for right, down, left, up; turning is \`d = (d + 1) % 4\`. |
| Undefined behaviour | Code with no guaranteed result in C++, such as out-of-range \`operator[]\`. |

**Conclusion:** Spiral order is four loops around a shrinking rectangle, moving one boundary inward after each side, with two guards that only matter for non-square matrices. In C++, the boundaries must be signed, the emptiness check must come before \`matrix[0]\`, and the matrix should be passed by \`const&\` with the output reserved up front.`,
        examples: [
          {
            label: "Boundary method on square, wide, tall, single-row, single-column and empty matrices",
            code: `// Spiral order with four shrinking boundaries: top, bottom, left, right.
#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<int> spiralOrder(const vector<vector<int>>& matrix) {
    vector<int> out;
    if (matrix.empty() || matrix[0].empty()) return out;     // check before touching matrix[0]
    int top = 0, bottom = static_cast<int>(matrix.size()) - 1;
    int left = 0, right = static_cast<int>(matrix[0].size()) - 1;
    out.reserve(matrix.size() * matrix[0].size());
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);     // 1. top row, left to right
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);   // 2. right column, top to bottom
        right--;
        if (top <= bottom) {                                                   // 3. bottom row, right to left
            for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {                                                   // 4. left column, bottom to top
            for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
            left++;
        }
    }
    return out;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

vector<vector<int>> grid(int rows, int cols) {
    vector<vector<int>> m(rows, vector<int>(cols));
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) m[r][c] = r * cols + c + 1;
    return m;
}

int main() {
    cout << fmt(spiralOrder(grid(3, 3))) << "\\n";   // [1, 2, 3, 6, 9, 8, 7, 4, 5]
    cout << fmt(spiralOrder(grid(3, 4))) << "\\n";   // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
    cout << fmt(spiralOrder(grid(4, 3))) << "\\n";   // [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
    cout << fmt(spiralOrder(grid(1, 4))) << "\\n";   // [1, 2, 3, 4]
    cout << fmt(spiralOrder(grid(4, 1))) << "\\n";   // [1, 2, 3, 4]
    cout << fmt(spiralOrder(grid(2, 2))) << "\\n";   // [1, 2, 4, 3]
    cout << fmt(spiralOrder(grid(1, 1))) << "\\n";   // [1]
    cout << fmt(spiralOrder({})) << "\\n";           // []
    return 0;
}
`,
          },
          {
            label: "Direction-vector simulation checked on all 36 shapes, plus generating a spiral matrix",
            code: `// Direction-vector simulation, checked against the boundary method on every shape
// from 1x1 to 6x6, plus generating an n x n spiral matrix (the reverse problem).
#include <cstdio>
#include <vector>
using namespace std;
using Matrix = vector<vector<int>>;

vector<int> spiralBounds(const Matrix& matrix) {
    int top = 0, bottom = static_cast<int>(matrix.size()) - 1;
    int left = 0, right = static_cast<int>(matrix[0].size()) - 1;
    vector<int> out;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
        right--;
        if (top <= bottom) { for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]); bottom--; }
        if (left <= right) { for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]); left++; }
    }
    return out;
}

const int DR[] = {0, 1, 0, -1};   // right, down, left, up
const int DC[] = {1, 0, -1, 0};

vector<int> spiralDirections(const Matrix& matrix) {
    int rows = static_cast<int>(matrix.size()), cols = static_cast<int>(matrix[0].size());
    vector<vector<bool>> seen(rows, vector<bool>(cols, false));
    int r = 0, c = 0, d = 0;
    vector<int> out;
    out.reserve(rows * cols);
    for (int step = 0; step < rows * cols; step++) {
        out.push_back(matrix[r][c]);
        seen[r][c] = true;
        int nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
            d = (d + 1) % 4;                  // blocked: turn right
            nr = r + DR[d];
            nc = c + DC[d];
        }
        r = nr;
        c = nc;
    }
    return out;
}

Matrix generateSpiral(int n) {
    Matrix m(n, vector<int>(n, 0));
    int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) m[top][c] = k++;
        top++;
        for (int r = top; r <= bottom; r++) m[r][right] = k++;
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) m[bottom][c] = k++;
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) m[r][left] = k++;
            left++;
        }
    }
    return m;
}

int main() {
    int agree = 0;
    for (int rows = 1; rows <= 6; rows++) {
        for (int cols = 1; cols <= 6; cols++) {
            Matrix m(rows, vector<int>(cols));
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) m[r][c] = r * cols + c;
            if (spiralBounds(m) == spiralDirections(m)) agree++;
        }
    }
    printf("shapes where both methods agree: %d of 36\\n", agree);
    printf("spiral matrix for n = 4:\\n");
    for (const auto& row : generateSpiral(4)) {
        printf(" ");
        for (int x : row) printf(" %2d", x);
        printf("\\n");
    }
    return 0;
}
`,
          },
          {
            label: "The classic bug: missing the two inner guards, buggy vs fixed",
            code: `// The classic bug: forgetting the two "is there still a row / column?" checks.
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

vector<int> spiral(const vector<vector<int>>& matrix, bool guarded) {
    int top = 0, bottom = static_cast<int>(matrix.size()) - 1;
    int left = 0, right = static_cast<int>(matrix[0].size()) - 1;
    vector<int> out;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
        right--;
        if (!guarded || top <= bottom) {         // without the guard: runs even when no row is left
            for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
            bottom--;
        }
        if (!guarded || left <= right) {         // without the guard: runs even when no column is left
            for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
            left++;
        }
    }
    return out;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

vector<vector<int>> grid(int rows, int cols) {
    vector<vector<int>> m(rows, vector<int>(cols));
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) m[r][c] = r * cols + c + 1;
    return m;
}

int main() {
    pair<int, int> shapes[] = {{3, 3}, {1, 4}, {3, 4}, {3, 1}};
    for (auto [rows, cols] : shapes) {
        auto m = grid(rows, cols);
        auto b = spiral(m, false), f = spiral(m, true);
        string tag = to_string(rows) + "x" + to_string(cols);
        cout << tag << " buggy: " << fmt(b) << " (" << b.size() << " items)\\n";
        cout << tag << " fixed: " << fmt(f) << " (" << f.size() << " items)\\n";
    }
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you add one to a number represented as a digit array?",
    difficulty: "easy",
    seoDescription: "Add one to a number stored as a digit array: walk from the last digit, turn 9s into 0s, stop at the first non-9. Python, JS, Java and C++, verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"A non-negative integer is stored as a Python list of its digits, most significant digit first, so \`[1, 2, 9]\` means 129. Write a function that returns the digits of the number plus one."

**What a strong answer should cover:**
- Walk from the last digit: a digit below 9 is incremented and the function returns; a 9 becomes 0 and the carry moves left.
- If every digit was 9, return \`[1]\` followed by the zeros (one digit longer).
- O(n) worst case, and only one digit touched for most inputs (early exit); O(1) extra space except the all-9s case.
- Python specifics: \`int("".join(map(str, digits))) + 1\` works because Python integers have no fixed size, but it is O(n) both ways and Python 3 refuses to convert strings of more than 4300 digits by default; \`range(len(digits) - 1, -1, -1)\` walks backwards; \`[1] + digits\` builds a new list.

**Clarifying questions expected:**
- "Most significant digit first, and no leading zeros?"
- "May I modify the input list?"

**Code / implementation expected:** Yes — a Python \`plus_one(digits)\` with a backwards loop and the all-9s case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Python lists and loops.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`python3\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture an old car odometer with rolling number wheels: \`0 1 2 9\`. You drive one more kilometre. The rightmost wheel rolls from 9 to 0, and as it passes 9 it nudges the wheel to its left one step, from 2 to 3. That wheel was not at 9, so nothing further happens: the odometer now reads \`0 1 3 0\`. Only when every wheel shows 9 does the nudge travel all the way to the left end, and a real odometer would need one more wheel.

That is the whole problem. The number is stored as an array of digits, most significant first (\`[1, 2, 9]\` means 129), and you add one by doing exactly what the odometer does: start at the right, turn 9s into 0s while carrying, and stop at the first digit that is not 9.

Why would anyone store a number like this? Because some numbers are far too big for the computer's built-in integer types (a 64-bit integer holds about 19 digits), and digit arrays are how "big number" arithmetic works underneath. Interviewers use this warm-up to see whether you handle the carry and the all-9s case cleanly, and whether you know why "just convert it to a number" is not a safe answer.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the most significant digit first? | \`[1, 2, 3]\` meaning 123 (the usual form) means you walk from the end; least-significant-first would mean walking from the start. |
| Can there be leading zeros, or is the input empty? | \`[0]\` is valid; \`[0, 0, 1]\` or \`[]\` usually are not, but ask. |
| May I modify the input array? | Mutating in place avoids a copy except in the all-9s case. |
| How long can the array be? | Hundreds of digits rule out converting to a built-in integer. |

## 3. The Core Idea: Carry From the Right

📌 **Interview term: Carry** — when a digit position overflows (9 + 1 = 10), you keep the last digit (0) in that position and add 1 to the next position to the left.

Walk from the **last** digit to the first:

- If the digit is **less than 9**, add 1 to it and **stop**: there is no carry, every digit to the left stays the same.
- If the digit is **9**, set it to 0 and keep going left: the carry moves one position.
- If you get past the first digit, every digit was 9 (like 999). The answer is a 1 followed by all those zeros, which is **one digit longer** than the input.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 1 2 9. The last digit 9 becomes 0 and carries 1 to the left. The middle digit 2 becomes 3 and the loop stops. Result 1 3 0">
  <defs>
    <marker id="b09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">1</text>
  <rect class="d-box" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <text class="d-sub" x="372" y="124" text-anchor="middle">9 + 1 = 10</text>
  <path class="d-edge-accent" d="M 362 136 Q 336 166 310 136" marker-end="url(#b09q5-arrow)"/>
  <text class="d-sub" x="336" y="184" text-anchor="middle">carry 1</text>
  <text class="d-text" x="40" y="233">result</text>
  <rect class="d-box" x="200" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="233" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="272" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="233" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="344" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="233" text-anchor="middle">0</text>
  <text class="d-sub" x="228" y="124" text-anchor="middle">untouched</text>
</svg>

For \`[1, 2, 9]\` the loop touches two digits and stops; the leading \`1\` is never even looked at.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 9 9 9. Every digit becomes 0 and the carry runs off the left end, so a new array 1 0 0 0 with one more digit is needed">
  <defs>
    <marker id="b09q5b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box-accent" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 362 104 Q 336 130 310 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 290 104 Q 264 130 238 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 218 104 Q 182 130 166 104" marker-end="url(#b09q5b-arrow)"/>
  <text class="d-sub" x="168" y="152" text-anchor="middle">carry left over</text>
  <text class="d-text" x="40" y="223">result</text>
  <rect class="d-box-accent" x="128" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="156" y="223" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="272" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="344" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="223" text-anchor="middle">0</text>
</svg>

For \`[9, 9, 9]\` every digit becomes 0 and the carry falls off the left end, so the result needs a new array \`[1, 0, 0, 0]\`. This is the only case where the output is longer than the input, and the only case where the function cannot just modify the input array in place (in languages where arrays have a fixed size).

📌 **Interview term: Early exit** — stopping a loop as soon as the answer is known. Here the loop stops at the first non-9 digit, so most inputs only touch one digit.

### Why not convert to a number, add one, and convert back?

It is the obvious first idea, and in a language with arbitrary-size integers it even works. But the input may have hundreds of digits, which does not fit in a 32-bit or 64-bit integer, and converting is O(n) work in both directions anyway. The digit-by-digit loop works for any length and is just as short. Section 4 shows exactly what goes wrong in this language.

📌 **Interview term: Integer overflow** — when a value is too large for its integer type; depending on the language it wraps around, throws, or loses precision.

📌 **Interview term: Big-number (arbitrary-precision) arithmetic** — storing a number as a sequence of digits (or larger "limbs") so it can be any size; schoolbook addition with carries, exactly like this problem, is its simplest operation.

## 4. Converting to an int in Python: It Works, With Limits

Python integers have no fixed size, so the conversion shortcut does not overflow. We ran it on a 19-digit input and on a 5000-digit one:

~~~python
digits = [6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3]
n = int("".join(map(str, digits))) + 1          # Python ints have no fixed size
print("via int():", [int(ch) for ch in str(n)][-3:], "(last three digits)")
print("bit length of that number:", n.bit_length())

huge = "9" * 5000
try:
    int(huge)
except ValueError as e:
    print("int() of 5000 digits:", str(e).split(";")[0])
~~~

~~~text
via int(): [5, 4, 4] (last three digits)
bit length of that number: 63
int() of 5000 digits: Exceeds the limit (4300 digits) for integer string conversion: value has 5000 digits
~~~

The 19-digit number needs 63 bits, right at the edge of a 64-bit integer, and Python handles it fine. But converting a 5000-digit string raised \`ValueError: Exceeds the limit (4300 digits) for integer string conversion\`. That limit was added to CPython as a denial-of-service protection in the September 2022 security releases (for example 3.10.7; see [LWN: Python and integer-to-string conversion](https://lwn.net/Articles/907572)); the default is 4300 digits and \`sys.set_int_max_str_digits()\` changes it. So even in Python, "convert, add, convert back" is O(n) work, depends on a configurable limit, and hides the carry logic the interviewer wants to see.

## 5. The Python Code

~~~python
def plus_one(digits):
    for i in range(len(digits) - 1, -1, -1):   # from the last digit to the first
        if digits[i] < 9:
            digits[i] += 1                     # no carry: done
            return digits
        digits[i] = 0                          # 9 + 1 = 10: write 0, carry 1 to the left
    return [1] + digits                        # every digit was 9: one more digit is needed
~~~

Walk-through:

- \`range(len(digits) - 1, -1, -1)\` counts down from the last index to 0. The stop value is \`-1\` because \`range\` stops **before** it. (\`reversed(range(len(digits)))\` is an equivalent, arguably clearer spelling.)
- \`if digits[i] < 9:\` — the common case. Increment, return immediately. Nothing to the left changes.
- \`digits[i] = 0\` — the digit was 9, so it becomes 0 and the loop moves left, carrying 1.
- After the loop, every digit is 0. \`[1] + digits\` builds a new list that is one longer. \`digits.insert(0, 1)\` would do the same in place, at O(n) cost, which is fine because it happens at most once.
- The function modifies the caller's list (lists are passed by reference). If the caller must keep the original, start with \`digits = digits[:]\`.

## 6. Verified: Running the Code

Each example was saved as \`main.py\` and run with \`python3 main.py\`.

**Example 1 — ordinary inputs, trailing 9s and all 9s:**

~~~text
[1, 2, 4]
[4, 3, 2, 2]
[2, 0, 0]
[9, 0, 0, 0]
[1, 0]
[1, 0, 0, 0]
[1]
~~~

**Example 2 — how many digits are touched, and numbers too big for 64 bits:**

~~~text
123 + 1 = 124  (digits touched: 1)
129 + 1 = 130  (digits touched: 2)
199 + 1 = 200  (digits touched: 3)
999 + 1 = 1000  (digits touched: 3)
5999999999 + 1 = 6000000000  (digits touched: 10)
19 digits: 6145390195186705544
25 nines + 1 has 26 digits
average digits touched over 1000..9999: 1.1110
~~~

The number of digits touched is the number of trailing 9s plus one (capped at the length): 1 for 123, 2 for 129, 3 for 199 and for 999, 10 for 5999999999. Averaged over every four-digit number from 1000 to 9999 it is 1.1110, because only one number in ten ends in 9. So the worst case is O(n), but the typical case is constant. The 19-digit and 25-digit inputs need no special handling at all.

**Example 3 — the general version: add any k:**

~~~python
def add_to_digits(digits, k):
    out = []
    i = len(digits) - 1
    carry = k                              # treat k as one big carry coming in from the right
    while i >= 0 or carry > 0:
        if i >= 0:
            carry += digits[i]
            i -= 1
        out.append(carry % 10)             # lowest digit of the running sum
        carry //= 10                       # the rest moves one place to the left
    out.reverse()                          # built least significant first
    return out
~~~

~~~text
[1, 2, 3, 4]
[4, 5, 5]
[1, 0, 2, 1]
[1, 0, 0, 0, 0]
[1, 0, 0, 0]
[1, 2, 3]
~~~

Treating k as the initial carry turns plus-one into "add to array form" (LeetCode 989). \`carry % 10\` is the digit to write and \`carry //= 10\` moves the rest left; \`//\` is Python's floor division, which matters because \`/\` would produce a float.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backwards loop with early exit | O(n) worst case, O(1) typical | O(1), or O(n) when all digits are 9 | Stops at the first non-9; only 999...9 needs a new list. |
| \`int(...)\` + 1 + \`str(...)\` | O(n) or worse | O(n) | Converts the whole number twice; limited to 4300 digits by default. |
| Add k (Example 3) | O(max(n, digits of k)) | O(n) for the output | One pass with a running carry. |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **\`[0]\`** → \`[1]\`.
- **\`[9]\`** → \`[1, 0]\`: the smallest all-9s case.
- **Trailing 9s** (\`[1, 9, 9]\` → \`[2, 0, 0]\`): several zeros, then one increment.
- **All 9s, any length**: one digit longer; 25 nines became 26 digits.
- **Very long inputs**: the loop does not care about the length; no integer type is involved.
- **Invalid input** (\`[]\`, digits outside 0-9, leading zeros): out of scope unless the interviewer says so; \`plus_one([])\` here returns \`[1]\`.

## Common Pitfalls

- **Forgetting the all-9s case.** Returning \`digits\` after the loop gives \`[0, 0, 0]\` for 999.
- **Not stopping early.** Without the \`return\` inside the \`if\`, the loop keeps adding to digits that should not change.
- **Wrong \`range\` for walking backwards.** \`range(len(digits) - 1, 0, -1)\` skips index 0, so \`[9]\` and \`[1, 9]\` go wrong.
- **Assuming conversion is free.** \`int(''.join(...))\` is O(n) and refuses more than 4300 digits by default.
- **Surprising the caller by mutating.** The function changes the list it was given; copy first if that is not wanted.
- **\`/\` instead of \`//\` in the general version.** \`/\` gives a float (\`12 / 10 == 1.2\`), which then breaks \`% 10\` and the list of digits.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Walk from the last digit: if it is below 9, add 1 and return; if it is 9, set it to 0 and move left. If the loop finishes, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1] + digits</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">It is the odometer: a carry only continues through 9s, so the first non-9 from the right absorbs it and nothing to its left changes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) in the worst case (all 9s), but usually one digit; O(1) extra space except when a new, longer list is needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not convert:</strong> <span style="color:#f0e2c8;">Python ints never overflow, but conversion is O(n) both ways and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int()</code> refuses strings over 4300 digits by default; the loop has no limits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(len(digits) - 1, -1, -1)</code> walks backwards, the function mutates the caller's list, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1] + digits</code> builds the longer result.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an arbitrary number k instead of 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use k as the starting carry: add the current digit, write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry % 10</code>, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry //= 10</code>, move left, and continue while digits or carry remain. Example 3 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 5]</code> for 274 + 181.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the digits were stored least significant first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the carry walks forward from index 0, and the all-9s case is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append(1)</code>, which is O(1) amortised. That is why many big-number libraries store digits in that order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add two digit arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two indices from the right and one carry, exactly like Example 3 but adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] + b[j] + carry</code> at each step; the result can be one digit longer than the longer input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this be done in O(1) in the worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with this representation: 999...9 + 1 changes every digit, so any algorithm must write n digits. The early exit makes the average constant, though: 1.111 digits over all four-digit numbers in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you mutate the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an interview function that returns the result, I mention that it mutates and offer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">digits = digits[:]</code> at the top if the caller needs the original unchanged.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Carry | The 1 moved to the next position to the left when a digit reaches 10. |
| Early exit | Stopping the loop as soon as the answer is known (at the first non-9 from the right). |
| Integer overflow | A value too large for its integer type; it wraps, throws or loses precision depending on the language. |
| Big-number (arbitrary-precision) arithmetic | Storing numbers as digit sequences so they can be any size. |

**Conclusion:** Adding one to a digit array is the odometer: walk from the right, turn 9s into 0s, and stop at the first digit that is not 9, adding a new leading 1 only when every digit was 9. It is O(n) in the worst case, about one digit on average, and needs no integer type at all. In Python the conversion shortcut is tempting because ints do not overflow, but it is O(n), capped at 4300 digits by default, and skips the reasoning the question is testing.`,
        examples: [
          {
            label: "Plus one on ordinary inputs, trailing 9s and all 9s",
            code: `# Add one to a number stored as a list of digits, most significant digit first.
def plus_one(digits):
    for i in range(len(digits) - 1, -1, -1):   # from the last digit to the first
        if digits[i] < 9:
            digits[i] += 1                     # no carry: done
            return digits
        digits[i] = 0                          # 9 + 1 = 10: write 0, carry 1 to the left
    return [1] + digits                        # every digit was 9: one more digit is needed

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

print(fmt(plus_one([1, 2, 3])))  # [1, 2, 4]
print(fmt(plus_one([4, 3, 2, 1])))  # [4, 3, 2, 2]
print(fmt(plus_one([1, 9, 9])))  # [2, 0, 0]
print(fmt(plus_one([8, 9, 9, 9])))  # [9, 0, 0, 0]
print(fmt(plus_one([9])))  # [1, 0]
print(fmt(plus_one([9, 9, 9])))  # [1, 0, 0, 0]
print(fmt(plus_one([0])))  # [1]
`,
          },
          {
            label: "How many digits are touched, and numbers too big for 64-bit integers",
            code: `# How many digits does plus-one actually touch? And numbers far too big for 64 bits.
touched = 0

def plus_one(digits):
    global touched
    for i in range(len(digits) - 1, -1, -1):
        touched += 1
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits

cases = [[1, 2, 3], [1, 2, 9], [1, 9, 9], [9, 9, 9], [5] + [9] * 9]
for digits in cases:
    before = "".join(str(d) for d in digits)
    touched = 0
    after = "".join(str(d) for d in plus_one(digits))
    print(before + " + 1 = " + after + "  (digits touched: " + str(touched) + ")")

big = [6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3]
print("19 digits: " + "".join(str(d) for d in plus_one(big)))
nines = [9] * 25
print("25 nines + 1 has " + str(len(plus_one(nines))) + " digits")

# Average over every 4-digit number 1000..9999: about 1.11 digits touched.
total = 0
for n in range(1000, 10000):
    touched = 0
    plus_one([int(ch) for ch in str(n)])
    total += touched
print("average digits touched over 1000..9999: " + format(total / 9000, ".4f"))
`,
          },
          {
            label: "Generalisation: add any integer k to a digit array",
            code: `# Generalisation: add any non-negative integer k to a digit array (plus-one is k = 1).
def add_to_digits(digits, k):
    out = []
    i = len(digits) - 1
    carry = k                              # treat k as one big carry coming in from the right
    while i >= 0 or carry > 0:
        if i >= 0:
            carry += digits[i]
            i -= 1
        out.append(carry % 10)             # lowest digit of the running sum
        carry //= 10                       # the rest moves one place to the left
    out.reverse()                          # built least significant first
    return out

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"

print(fmt(add_to_digits([1, 2, 0, 0], 34)))  # [1, 2, 3, 4]
print(fmt(add_to_digits([2, 7, 4], 181)))  # [4, 5, 5]
print(fmt(add_to_digits([2, 1, 5], 806)))  # [1, 0, 2, 1]
print(fmt(add_to_digits([0], 10000)))  # [1, 0, 0, 0, 0]
print(fmt(add_to_digits([9, 9, 9], 1)))  # [1, 0, 0, 0]
print(fmt(add_to_digits([1, 2, 3], 0)))  # [1, 2, 3]
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"A non-negative integer is stored as a JavaScript array of its digits, most significant first, so \`[1, 2, 9]\` means 129. Write a function that returns the digits of that number plus one. The array can be long, longer than any built-in number type can hold."

**What a strong answer should cover:**
- Walk from the last digit: below 9, increment and return; a 9 becomes 0 and the carry moves left.
- If every digit was 9, return \`[1, ...digits]\` (one digit longer).
- O(n) worst case, usually one digit touched (early exit); O(1) extra space except the all-9s case.
- JavaScript specifics: \`Number(digits.join('')) + 1\` silently loses precision above \`Number.MAX_SAFE_INTEGER\` (2^53 - 1), \`BigInt\` would be exact but is still an O(n) conversion, and \`/\` is floating-point division (use \`Math.floor\` for the carry in the general version).

**Clarifying questions expected:**
- "Most significant digit first, no leading zeros?"
- "May I modify the input array?"

**Code / implementation expected:** Yes — a JavaScript \`plusOne(digits)\` with a backwards loop and the all-9s case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need JavaScript arrays and loops.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was run with \`node\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture an old car odometer with rolling number wheels: \`0 1 2 9\`. You drive one more kilometre. The rightmost wheel rolls from 9 to 0, and as it passes 9 it nudges the wheel to its left one step, from 2 to 3. That wheel was not at 9, so nothing further happens: the odometer now reads \`0 1 3 0\`. Only when every wheel shows 9 does the nudge travel all the way to the left end, and a real odometer would need one more wheel.

That is the whole problem. The number is stored as an array of digits, most significant first (\`[1, 2, 9]\` means 129), and you add one by doing exactly what the odometer does: start at the right, turn 9s into 0s while carrying, and stop at the first digit that is not 9.

Why would anyone store a number like this? Because some numbers are far too big for the computer's built-in integer types (a 64-bit integer holds about 19 digits), and digit arrays are how "big number" arithmetic works underneath. Interviewers use this warm-up to see whether you handle the carry and the all-9s case cleanly, and whether you know why "just convert it to a number" is not a safe answer.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the most significant digit first? | \`[1, 2, 3]\` meaning 123 (the usual form) means you walk from the end; least-significant-first would mean walking from the start. |
| Can there be leading zeros, or is the input empty? | \`[0]\` is valid; \`[0, 0, 1]\` or \`[]\` usually are not, but ask. |
| May I modify the input array? | Mutating in place avoids a copy except in the all-9s case. |
| How long can the array be? | Hundreds of digits rule out converting to a built-in integer. |

## 3. The Core Idea: Carry From the Right

📌 **Interview term: Carry** — when a digit position overflows (9 + 1 = 10), you keep the last digit (0) in that position and add 1 to the next position to the left.

Walk from the **last** digit to the first:

- If the digit is **less than 9**, add 1 to it and **stop**: there is no carry, every digit to the left stays the same.
- If the digit is **9**, set it to 0 and keep going left: the carry moves one position.
- If you get past the first digit, every digit was 9 (like 999). The answer is a 1 followed by all those zeros, which is **one digit longer** than the input.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 1 2 9. The last digit 9 becomes 0 and carries 1 to the left. The middle digit 2 becomes 3 and the loop stops. Result 1 3 0">
  <defs>
    <marker id="b09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">1</text>
  <rect class="d-box" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <text class="d-sub" x="372" y="124" text-anchor="middle">9 + 1 = 10</text>
  <path class="d-edge-accent" d="M 362 136 Q 336 166 310 136" marker-end="url(#b09q5-arrow)"/>
  <text class="d-sub" x="336" y="184" text-anchor="middle">carry 1</text>
  <text class="d-text" x="40" y="233">result</text>
  <rect class="d-box" x="200" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="233" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="272" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="233" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="344" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="233" text-anchor="middle">0</text>
  <text class="d-sub" x="228" y="124" text-anchor="middle">untouched</text>
</svg>

For \`[1, 2, 9]\` the loop touches two digits and stops; the leading \`1\` is never even looked at.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 9 9 9. Every digit becomes 0 and the carry runs off the left end, so a new array 1 0 0 0 with one more digit is needed">
  <defs>
    <marker id="b09q5b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box-accent" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 362 104 Q 336 130 310 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 290 104 Q 264 130 238 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 218 104 Q 182 130 166 104" marker-end="url(#b09q5b-arrow)"/>
  <text class="d-sub" x="168" y="152" text-anchor="middle">carry left over</text>
  <text class="d-text" x="40" y="223">result</text>
  <rect class="d-box-accent" x="128" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="156" y="223" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="272" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="344" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="223" text-anchor="middle">0</text>
</svg>

For \`[9, 9, 9]\` every digit becomes 0 and the carry falls off the left end, so the result needs a new array \`[1, 0, 0, 0]\`. This is the only case where the output is longer than the input, and the only case where the function cannot just modify the input array in place (in languages where arrays have a fixed size).

📌 **Interview term: Early exit** — stopping a loop as soon as the answer is known. Here the loop stops at the first non-9 digit, so most inputs only touch one digit.

### Why not convert to a number, add one, and convert back?

It is the obvious first idea, and in a language with arbitrary-size integers it even works. But the input may have hundreds of digits, which does not fit in a 32-bit or 64-bit integer, and converting is O(n) work in both directions anyway. The digit-by-digit loop works for any length and is just as short. Section 4 shows exactly what goes wrong in this language.

📌 **Interview term: Integer overflow** — when a value is too large for its integer type; depending on the language it wraps around, throws, or loses precision.

📌 **Interview term: Big-number (arbitrary-precision) arithmetic** — storing a number as a sequence of digits (or larger "limbs") so it can be any size; schoolbook addition with carries, exactly like this problem, is its simplest operation.

## 4. Converting to a Number in JavaScript: Silently Wrong

JavaScript's \`Number\` is a 64-bit floating-point value. It represents every integer exactly only up to \`Number.MAX_SAFE_INTEGER\`. We ran the conversion shortcut on a 19-digit input:

~~~javascript
const digits = [6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3];
const asNumber = Number(digits.join('')) + 1;
console.log('Number:  ' + String(asNumber));
console.log('BigInt:  ' + String(BigInt(digits.join('')) + 1n));
console.log('MAX_SAFE_INTEGER: ' + Number.MAX_SAFE_INTEGER);
console.log('is the Number result safe? ' + Number.isSafeInteger(asNumber));
console.log('9007199254740992 + 1 = ' + (9007199254740992 + 1));
~~~

~~~text
Number:  6145390195186705000
BigInt:  6145390195186705544
MAX_SAFE_INTEGER: 9007199254740991
is the Number result safe? false
9007199254740992 + 1 = 9007199254740992
~~~

The \`Number\` version printed \`6145390195186705000\`: the last digits are simply gone, and there was no error. The correct answer, \`6145390195186705544\`, came from \`BigInt\`. The last line shows the root cause: above 2^53, \`9007199254740992 + 1\` is still \`9007199254740992\`, because the next integer cannot be represented.

📌 **Interview term: Safe integer** — an integer that a JavaScript \`Number\` represents exactly, from -(2^53 - 1) to 2^53 - 1 (\`Number.MAX_SAFE_INTEGER\` = 9007199254740991). \`Number.isSafeInteger\` checks it.

\`BigInt\` (the \`n\` suffix, ES2020) fixes the precision, but it is still an O(n) conversion in each direction and it skips the carry logic the interviewer asked for. Mention it; write the loop.

## 5. The JavaScript Code

~~~javascript
function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {   // from the last digit to the first
    if (digits[i] < 9) {
      digits[i]++;                                  // no carry: done
      return digits;
    }
    digits[i] = 0;                                  // 9 + 1 = 10: write 0, carry 1 to the left
  }
  return [1, ...digits];                            // every digit was 9: one more digit is needed
}
~~~

Walk-through:

- \`for (let i = digits.length - 1; i >= 0; i--)\` walks from the last index down to 0.
- \`if (digits[i] < 9)\` — the common case: \`digits[i]++\` and return at once.
- \`digits[i] = 0\` — the digit was 9; continue left with the carry.
- \`return [1, ...digits];\` — only reached when every digit was 9. Spread builds a new array one longer; \`digits.unshift(1)\` would do it in place.
- The function mutates the caller's array. If that is not allowed, start with \`digits = digits.slice()\`.

## 6. Verified: Running the Code

Each example was saved as \`main.js\` and run with \`node main.js\`.

**Example 1 — ordinary inputs, trailing 9s and all 9s:**

~~~text
[1, 2, 4]
[4, 3, 2, 2]
[2, 0, 0]
[9, 0, 0, 0]
[1, 0]
[1, 0, 0, 0]
[1]
~~~

**Example 2 — how many digits are touched, and numbers too big for 64 bits:**

~~~text
123 + 1 = 124  (digits touched: 1)
129 + 1 = 130  (digits touched: 2)
199 + 1 = 200  (digits touched: 3)
999 + 1 = 1000  (digits touched: 3)
5999999999 + 1 = 6000000000  (digits touched: 10)
19 digits: 6145390195186705544
25 nines + 1 has 26 digits
average digits touched over 1000..9999: 1.1110
~~~

The number of digits touched is the number of trailing 9s plus one: 1 for 123, 2 for 129, 3 for 199 and 999, 10 for 5999999999. Averaged over every four-digit number it is 1.1110. The 19-digit input that \`Number\` got wrong in section 4 comes out exactly right here, because no conversion happens.

**Example 3 — the general version: add any k:**

~~~javascript
function addToDigits(digits, k) {
  const out = [];
  let i = digits.length - 1;
  let carry = k;                         // treat k as one big carry coming in from the right
  while (i >= 0 || carry > 0) {
    if (i >= 0) carry += digits[i--];
    out.push(carry % 10);                // lowest digit of the running sum
    carry = Math.floor(carry / 10);      // the rest moves one place to the left (/ is not integer division)
  }
  return out.reverse();                  // built least significant first
}
~~~

~~~text
[1, 2, 3, 4]
[4, 5, 5]
[1, 0, 2, 1]
[1, 0, 0, 0, 0]
[1, 0, 0, 0]
[1, 2, 3]
~~~

k is used as the initial carry ("add to array form", LeetCode 989). \`Math.floor(carry / 10)\` is required because \`/\` is floating-point division in JavaScript: \`12 / 10\` is \`1.2\`. (\`carry\` stays far below 2^53 here, because it is at most k plus 9; for k near the safe-integer limit you would switch to \`BigInt\` or process k digit by digit.)

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backwards loop with early exit | O(n) worst case, O(1) typical | O(1), or O(n) when all digits are 9 | Stops at the first non-9. |
| \`Number(join) + 1\` | O(n) | O(n) | Wrong above 2^53 - 1. |
| \`BigInt(join) + 1n\` | O(n) or worse | O(n) | Exact, but converts twice. |
| Add k (Example 3) | O(max(n, digits of k)) | O(n) for the output | One pass with a running carry. |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **\`[0]\`** → \`[1]\`.
- **\`[9]\`** → \`[1, 0]\`.
- **Trailing 9s** (\`[1, 9, 9]\` → \`[2, 0, 0]\`).
- **All 9s, any length:** one digit longer; 25 nines gave 26 digits.
- **Digits as strings** (from \`'129'.split('')\`): the comparisons \`'9' < 9\` convert to numbers and the algorithm still runs, but the result mixes types, \`["1",3,0]\` in our run, and string digits break other code (\`'1' + 1\` is \`'11'\`). Convert with \`.map(Number)\` first.
- **Very long inputs:** no limit; no number type is involved.

## Common Pitfalls

- **Converting to \`Number\`.** Silent precision loss above 2^53 - 1: our 19-digit input lost its last three digits.
- **Forgetting the all-9s case.** Returning \`digits\` after the loop gives \`[0, 0, 0]\` for 999.
- **Not returning early.** Without the \`return\`, the loop keeps changing digits that should stay.
- **\`/\` without \`Math.floor\` in the general version.** It produces fractions and the digits become decimals.
- **Mutating an array the caller still needs.** Copy with \`slice()\` first if required.
- **String digits.** Arrays from \`split('')\` contain strings; \`'1' + 1\` is \`'11'\`. Convert with \`.map(Number)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Walk from the last digit: if it is below 9, increment and return; if it is 9, set it to 0 and move left. If the loop finishes, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, ...digits]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">It is an odometer: the carry only continues through 9s, so the first non-9 from the right absorbs it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) worst case (all 9s), usually one digit touched; O(1) extra space except when a longer array is needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not convert:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number(digits.join(''))</code> loses precision above <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>: our 19-digit input came back ending in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">000</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> is exact but still converts twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript details:</strong> <span style="color:#f0e2c8;">The function mutates its input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> is floating-point (use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> for carries), and digits from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split('')</code> are strings until mapped with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Number</code> give the wrong answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> is a double with a 53-bit mantissa, so integers above 2^53 - 1 cannot all be represented. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">9007199254740992 + 1</code> printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">9007199254740992</code>, and the 19-digit input lost its last digits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an arbitrary k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry = k</code>, add each digit from the right, push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry % 10</code>, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry = Math.floor(carry / 10)</code>, and reverse at the end. Example 3 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 5]</code> for 274 + 181.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add two digit arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two indices from the right and one carry; at each step <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum = (a[i] ?? 0) + (b[j] ?? 0) + carry</code>. The result can be one digit longer than the longer input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unshift(1)</code> better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[1, ...digits]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unshift</code> mutates in place, the spread builds a new array; both are O(n), and it happens at most once (only for all 9s), so either is fine. I would match whatever the rest of the function does: here it mutates, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unshift</code> is consistent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n) in the worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: 999...9 + 1 changes every digit, so n writes are unavoidable. On average it is constant: 1.111 digits over all four-digit numbers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Carry | The 1 moved to the next position to the left when a digit reaches 10. |
| Early exit | Stopping the loop as soon as the answer is known (at the first non-9 from the right). |
| Integer overflow | A value too large for its integer type; it wraps, throws or loses precision depending on the language. |
| Big-number (arbitrary-precision) arithmetic | Storing numbers as digit sequences so they can be any size. |
| Safe integer | An integer a JavaScript \`Number\` represents exactly, up to 2^53 - 1. |

**Conclusion:** Adding one to a digit array is the odometer: walk from the right, turn 9s into 0s, and stop at the first digit that is not 9, adding a leading 1 only when every digit was 9. It is O(n) at worst and about one digit on average. In JavaScript the conversion shortcut is actively dangerous, because \`Number\` silently loses precision above 2^53 - 1; the digit loop has no such limit and is what the interviewer wants to see.`,
        examples: [
          {
            label: "Plus one on ordinary inputs, trailing 9s and all 9s",
            code: `// Add one to a number stored as an array of digits, most significant digit first.
function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {   // from the last digit to the first
    if (digits[i] < 9) {
      digits[i]++;                                  // no carry: done
      return digits;
    }
    digits[i] = 0;                                  // 9 + 1 = 10: write 0, carry 1 to the left
  }
  return [1, ...digits];                            // every digit was 9: one more digit is needed
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(fmt(plusOne([1, 2, 3]))); // [1, 2, 4]
console.log(fmt(plusOne([4, 3, 2, 1]))); // [4, 3, 2, 2]
console.log(fmt(plusOne([1, 9, 9]))); // [2, 0, 0]
console.log(fmt(plusOne([8, 9, 9, 9]))); // [9, 0, 0, 0]
console.log(fmt(plusOne([9]))); // [1, 0]
console.log(fmt(plusOne([9, 9, 9]))); // [1, 0, 0, 0]
console.log(fmt(plusOne([0]))); // [1]
`,
          },
          {
            label: "How many digits are touched, and numbers too big for 64-bit integers",
            code: `// How many digits does plus-one actually touch? And numbers far too big for 64 bits.
let touched = 0;

function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    touched++;
    if (digits[i] < 9) {
      digits[i]++;
      return digits;
    }
    digits[i] = 0;
  }
  return [1, ...digits];
}

const cases = [[1, 2, 3], [1, 2, 9], [1, 9, 9], [9, 9, 9], [5].concat(new Array(9).fill(9))];
for (const digits of cases) {
  const before = digits.join('');
  touched = 0;
  const after = plusOne(digits).join('');
  console.log(before + ' + 1 = ' + after + '  (digits touched: ' + touched + ')');
}

const big = [6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3];
console.log('19 digits: ' + plusOne(big).join(''));
const nines = new Array(25).fill(9);
console.log('25 nines + 1 has ' + plusOne(nines).length + ' digits');

// Average over every 4-digit number 1000..9999: about 1.11 digits touched.
let total = 0;
for (let n = 1000; n < 10000; n++) {
  touched = 0;
  plusOne(String(n).split('').map(Number));
  total += touched;
}
console.log('average digits touched over 1000..9999: ' + (total / 9000).toFixed(4));
`,
          },
          {
            label: "Generalisation: add any integer k to a digit array",
            code: `// Generalisation: add any non-negative integer k to a digit array (plus-one is k = 1).
function addToDigits(digits, k) {
  const out = [];
  let i = digits.length - 1;
  let carry = k;                         // treat k as one big carry coming in from the right
  while (i >= 0 || carry > 0) {
    if (i >= 0) carry += digits[i--];
    out.push(carry % 10);                // lowest digit of the running sum
    carry = Math.floor(carry / 10);      // the rest moves one place to the left (/ is not integer division)
  }
  return out.reverse();                  // built least significant first
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(fmt(addToDigits([1, 2, 0, 0], 34))); // [1, 2, 3, 4]
console.log(fmt(addToDigits([2, 7, 4], 181))); // [4, 5, 5]
console.log(fmt(addToDigits([2, 1, 5], 806))); // [1, 0, 2, 1]
console.log(fmt(addToDigits([0], 10000))); // [1, 0, 0, 0, 0]
console.log(fmt(addToDigits([9, 9, 9], 1))); // [1, 0, 0, 0]
console.log(fmt(addToDigits([1, 2, 3], 0))); // [1, 2, 3]
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"A non-negative integer is stored as an \`int[]\` of its digits, most significant first, so \`{1, 2, 9}\` means 129. In Java, write a method that returns the digits of that number plus one. The array may be longer than any primitive type can hold."

**What a strong answer should cover:**
- Walk from the last digit: below 9, increment and return; a 9 becomes 0 and the carry moves left.
- If every digit was 9, allocate \`new int[n + 1]\`, set index 0 to 1, and rely on Java zero-filling the rest.
- O(n) worst case, usually one digit touched (early exit); O(1) extra space except the all-9s case.
- Java specifics: arrays have a fixed size, so the all-9s case must allocate; \`Long.parseLong\` handles at most 19 digits and \`Long.MAX_VALUE + 1\` wraps silently to a negative number; \`BigInteger\` is exact but is a conversion, not the algorithm.

**Clarifying questions expected:**
- "Most significant digit first, no leading zeros?"
- "May I modify the input array?"

**Code / implementation expected:** Yes — a static \`int[] plusOne(int[] digits)\` with the all-9s allocation.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need Java arrays and loops.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`javac\` and run with \`java\`, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture an old car odometer with rolling number wheels: \`0 1 2 9\`. You drive one more kilometre. The rightmost wheel rolls from 9 to 0, and as it passes 9 it nudges the wheel to its left one step, from 2 to 3. That wheel was not at 9, so nothing further happens: the odometer now reads \`0 1 3 0\`. Only when every wheel shows 9 does the nudge travel all the way to the left end, and a real odometer would need one more wheel.

That is the whole problem. The number is stored as an array of digits, most significant first (\`[1, 2, 9]\` means 129), and you add one by doing exactly what the odometer does: start at the right, turn 9s into 0s while carrying, and stop at the first digit that is not 9.

Why would anyone store a number like this? Because some numbers are far too big for the computer's built-in integer types (a 64-bit integer holds about 19 digits), and digit arrays are how "big number" arithmetic works underneath. Interviewers use this warm-up to see whether you handle the carry and the all-9s case cleanly, and whether you know why "just convert it to a number" is not a safe answer.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the most significant digit first? | \`[1, 2, 3]\` meaning 123 (the usual form) means you walk from the end; least-significant-first would mean walking from the start. |
| Can there be leading zeros, or is the input empty? | \`[0]\` is valid; \`[0, 0, 1]\` or \`[]\` usually are not, but ask. |
| May I modify the input array? | Mutating in place avoids a copy except in the all-9s case. |
| How long can the array be? | Hundreds of digits rule out converting to a built-in integer. |

## 3. The Core Idea: Carry From the Right

📌 **Interview term: Carry** — when a digit position overflows (9 + 1 = 10), you keep the last digit (0) in that position and add 1 to the next position to the left.

Walk from the **last** digit to the first:

- If the digit is **less than 9**, add 1 to it and **stop**: there is no carry, every digit to the left stays the same.
- If the digit is **9**, set it to 0 and keep going left: the carry moves one position.
- If you get past the first digit, every digit was 9 (like 999). The answer is a 1 followed by all those zeros, which is **one digit longer** than the input.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 1 2 9. The last digit 9 becomes 0 and carries 1 to the left. The middle digit 2 becomes 3 and the loop stops. Result 1 3 0">
  <defs>
    <marker id="b09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">1</text>
  <rect class="d-box" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <text class="d-sub" x="372" y="124" text-anchor="middle">9 + 1 = 10</text>
  <path class="d-edge-accent" d="M 362 136 Q 336 166 310 136" marker-end="url(#b09q5-arrow)"/>
  <text class="d-sub" x="336" y="184" text-anchor="middle">carry 1</text>
  <text class="d-text" x="40" y="233">result</text>
  <rect class="d-box" x="200" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="233" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="272" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="233" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="344" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="233" text-anchor="middle">0</text>
  <text class="d-sub" x="228" y="124" text-anchor="middle">untouched</text>
</svg>

For \`[1, 2, 9]\` the loop touches two digits and stops; the leading \`1\` is never even looked at.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 9 9 9. Every digit becomes 0 and the carry runs off the left end, so a new array 1 0 0 0 with one more digit is needed">
  <defs>
    <marker id="b09q5b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box-accent" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 362 104 Q 336 130 310 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 290 104 Q 264 130 238 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 218 104 Q 182 130 166 104" marker-end="url(#b09q5b-arrow)"/>
  <text class="d-sub" x="168" y="152" text-anchor="middle">carry left over</text>
  <text class="d-text" x="40" y="223">result</text>
  <rect class="d-box-accent" x="128" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="156" y="223" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="272" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="344" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="223" text-anchor="middle">0</text>
</svg>

For \`[9, 9, 9]\` every digit becomes 0 and the carry falls off the left end, so the result needs a new array \`[1, 0, 0, 0]\`. This is the only case where the output is longer than the input, and the only case where the function cannot just modify the input array in place (in languages where arrays have a fixed size).

📌 **Interview term: Early exit** — stopping a loop as soon as the answer is known. Here the loop stops at the first non-9 digit, so most inputs only touch one digit.

### Why not convert to a number, add one, and convert back?

It is the obvious first idea, and in a language with arbitrary-size integers it even works. But the input may have hundreds of digits, which does not fit in a 32-bit or 64-bit integer, and converting is O(n) work in both directions anyway. The digit-by-digit loop works for any length and is just as short. Section 4 shows exactly what goes wrong in this language.

📌 **Interview term: Integer overflow** — when a value is too large for its integer type; depending on the language it wraps around, throws, or loses precision.

📌 **Interview term: Big-number (arbitrary-precision) arithmetic** — storing a number as a sequence of digits (or larger "limbs") so it can be any size; schoolbook addition with carries, exactly like this problem, is its simplest operation.

## 4. Converting to a long in Java: Limited and Dangerous

A Java \`long\` is 64 bits, so it holds at most 19 decimal digits. We ran the conversion shortcut at that boundary:

~~~java
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        String nineteen = "6145390195186705543";
        System.out.println("Long.parseLong(19 digits) + 1 = " + (Long.parseLong(nineteen) + 1));
        System.out.println("Long.MAX_VALUE = " + Long.MAX_VALUE);
        try {
            Long.parseLong("99999999999999999999");             // 20 digits
        } catch (NumberFormatException e) {
            System.out.println("Long.parseLong(20 nines) threw NumberFormatException");
        }
        System.out.println("Long.MAX_VALUE + 1 = " + (Long.MAX_VALUE + 1));   // wraps silently
        System.out.println("BigInteger: " + new BigInteger("99999999999999999999").add(BigInteger.ONE));
    }
}
~~~

~~~text
Long.parseLong(19 digits) + 1 = 6145390195186705544
Long.MAX_VALUE = 9223372036854775807
Long.parseLong(20 nines) threw NumberFormatException
Long.MAX_VALUE + 1 = -9223372036854775808
BigInteger: 100000000000000000000
~~~

The 19-digit value still fits (it is below \`Long.MAX_VALUE\` = 9223372036854775807), so \`parseLong(...) + 1\` worked. One more digit and \`Long.parseLong\` throws \`NumberFormatException\`. Worse, arithmetic overflow does **not** throw: \`Long.MAX_VALUE + 1\` printed \`-9223372036854775808\`, because Java integer arithmetic wraps around silently. \`BigInteger\` gives the exact answer for any size, but it is a conversion in both directions and skips the logic the question is about.

📌 **Interview term: Two's-complement wraparound** — how Java \`int\` and \`long\` overflow: the value wraps from the largest positive number to the most negative one, without an exception. (\`Math.addExact\` throws \`ArithmeticException\` instead, if you want overflow to be loud.)

## 5. The Java Code

~~~java
    static int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {   // from the last digit to the first
            if (digits[i] < 9) {
                digits[i]++;                              // no carry: done
                return digits;
            }
            digits[i] = 0;                                // 9 + 1 = 10: write 0, carry 1 to the left
        }
        int[] result = new int[digits.length + 1];        // every digit was 9: one more digit
        result[0] = 1;                                    // the rest are already 0 (Java zero-fills)
        return result;
    }
~~~

Walk-through:

- \`for (int i = digits.length - 1; i >= 0; i--)\` walks from the last digit down to the first.
- \`if (digits[i] < 9)\` — the common case: increment and return the same array.
- \`digits[i] = 0\` — the digit was 9; continue left with the carry.
- After the loop every digit is 0, so the answer is 1 followed by n zeros. Java arrays cannot grow, so the method allocates \`new int[digits.length + 1]\`. Java guarantees that a new \`int[]\` is filled with 0, so only \`result[0] = 1\` needs writing; no copying of the old zeros is required.
- In the common case the method returns the **same** array it was given, modified. In the all-9s case it returns a **new** one. Callers must use the return value, not assume the input was updated.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\`.

**Example 1 — ordinary inputs, trailing 9s and all 9s:**

~~~text
[1, 2, 4]
[4, 3, 2, 2]
[2, 0, 0]
[9, 0, 0, 0]
[1, 0]
[1, 0, 0, 0]
[1]
~~~

**Example 2 — how many digits are touched, and numbers too big for 64 bits:**

~~~text
123 + 1 = 124  (digits touched: 1)
129 + 1 = 130  (digits touched: 2)
199 + 1 = 200  (digits touched: 3)
999 + 1 = 1000  (digits touched: 3)
5999999999 + 1 = 6000000000  (digits touched: 10)
19 digits: 6145390195186705544
25 nines + 1 has 26 digits
average digits touched over 1000..9999: 1.1110
~~~

The number of digits touched is the number of trailing 9s plus one: 1 for 123, 2 for 129, 3 for 199 and 999, 10 for 5999999999. Averaged over every four-digit number it is 1.1110. The 25-digit input, which no \`long\` could hold, needs no special handling.

**Example 3 — the general version: add any k:**

~~~java
    static List<Integer> addToDigits(int[] digits, int k) {
        List<Integer> out = new ArrayList<>();
        int i = digits.length - 1;
        long carry = k;                        // long: k + a digit must not overflow when k is near Integer.MAX_VALUE
        while (i >= 0 || carry > 0) {
            if (i >= 0) carry += digits[i--];
            out.add((int) (carry % 10));       // lowest digit of the running sum
            carry /= 10;                       // integer division: the rest moves one place left
        }
        Collections.reverse(out);              // built least significant first
        return out;
    }
~~~

~~~text
[1, 2, 3, 4]
[4, 5, 5]
[1, 0, 2, 1]
[1, 0, 0, 0, 0]
[1, 0, 0, 0]
[1, 2, 3]
~~~

k is used as the initial carry ("add to array form", LeetCode 989). The carry is a \`long\` so that \`k + 9\` cannot overflow when k is close to \`Integer.MAX_VALUE\`. \`Collections.reverse\` flips the list, which was built least significant digit first.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backwards loop with early exit | O(n) worst case, O(1) typical | O(1), or O(n) when all digits are 9 | Stops at the first non-9; only 999...9 allocates. |
| \`Long.parseLong\` + 1 | O(n) | O(n) for the string | Fails beyond 19 digits. |
| \`BigInteger\` | O(n) or worse | O(n) | Exact, but converts twice. |
| Add k (Example 3) | O(max(n, digits of k)) | O(n) for the output | One pass with a running carry. |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **\`{0}\`** → \`[1]\`.
- **\`{9}\`** → \`[1, 0]\`.
- **Trailing 9s** (\`{1, 9, 9}\` → \`[2, 0, 0]\`).
- **All 9s, any length:** a new array one longer; 25 nines gave 26 digits.
- **Empty array:** the loop does not run and the method returns \`[1]\`; reject it if the contract requires at least one digit.
- **\`null\`:** \`NullPointerException\` on \`digits.length\`.

## Common Pitfalls

- **Converting to \`long\`.** Works up to 19 digits, then \`NumberFormatException\`; and \`+ 1\` on \`Long.MAX_VALUE\` silently wraps to a negative number.
- **Forgetting the all-9s case.** Returning \`digits\` after the loop gives \`[0, 0, 0]\` for 999.
- **Ignoring the return value.** In the all-9s case the input array is all zeros and the real answer is a new array.
- **Copying the zeros by hand.** Unnecessary: \`new int[n + 1]\` is already zero-filled.
- **Using \`List<Integer>\` for the digits.** Boxing every digit wastes memory; \`int[]\` is the natural type.
- **\`int\` carry in the general version.** \`carry = k + digit\` can overflow when k is near \`Integer.MAX_VALUE\`; use \`long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Walk from the last digit: if it is below 9, increment and return; if it is 9, set it to 0 and move left. If the loop finishes, return a new array of length n + 1 with a leading 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">It is an odometer: a carry only continues through 9s, so the first non-9 from the right absorbs it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) worst case (all 9s), usually one digit; O(1) extra space except for the one allocation in the all-9s case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not convert:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> stops at 9223372036854775807 (19 digits); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parseLong</code> throws on any 20-digit input, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE + 1</code> wraps silently to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-9223372036854775808</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> works but converts twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n + 1]</code> is zero-filled, so only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[0] = 1</code> is needed; the method sometimes returns the input array and sometimes a new one, so callers must use the return value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE + 1</code> not throw?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java integer arithmetic uses two's-complement wraparound by design. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.addExact</code> if you want an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code> on overflow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an arbitrary k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long carry = k</code>, add digits from the right, append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry % 10</code>, divide the carry by 10, and reverse at the end. Example 3 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 5]</code> for 274 + 181.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add two digit arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two indices from the right and one carry; when one array runs out, treat its digits as 0. The result can be one digit longer than the longer input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BigInteger</code> be acceptable in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if the number is used as a number elsewhere. But the interview is about the carry logic, and converting a digit array to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> and back is O(n) each way just to add 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can it be O(1) in the worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: 999...9 + 1 changes every digit, so n writes are unavoidable. On average it is constant: 1.111 digits over all four-digit numbers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Carry | The 1 moved to the next position to the left when a digit reaches 10. |
| Early exit | Stopping the loop as soon as the answer is known (at the first non-9 from the right). |
| Integer overflow | A value too large for its integer type; it wraps, throws or loses precision depending on the language. |
| Big-number (arbitrary-precision) arithmetic | Storing numbers as digit sequences so they can be any size. |
| Two's-complement wraparound | How Java \`int\`/\`long\` overflow: silently from the largest to the most negative value. |

**Conclusion:** Adding one to a digit array is the odometer: walk from the right, turn 9s into 0s, and stop at the first digit that is not 9; only when every digit was 9 do you need a new, longer array. In Java that array comes zero-filled, so you only set its first element. Converting to \`long\` is limited to 19 digits and overflows silently, which is exactly why the digit loop is the right answer.`,
        examples: [
          {
            label: "Plus one on ordinary inputs, trailing 9s and all 9s",
            code: `// Add one to a number stored as an array of digits, most significant digit first.
import java.util.Arrays;

public class Main {
    static int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {   // from the last digit to the first
            if (digits[i] < 9) {
                digits[i]++;                              // no carry: done
                return digits;
            }
            digits[i] = 0;                                // 9 + 1 = 10: write 0, carry 1 to the left
        }
        int[] result = new int[digits.length + 1];        // every digit was 9: one more digit
        result[0] = 1;                                    // the rest are already 0 (Java zero-fills)
        return result;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(plusOne(new int[]{1, 2, 3})));     // [1, 2, 4]
        System.out.println(Arrays.toString(plusOne(new int[]{4, 3, 2, 1})));  // [4, 3, 2, 2]
        System.out.println(Arrays.toString(plusOne(new int[]{1, 9, 9})));    // [2, 0, 0]
        System.out.println(Arrays.toString(plusOne(new int[]{8, 9, 9, 9})));  // [9, 0, 0, 0]
        System.out.println(Arrays.toString(plusOne(new int[]{9})));           // [1, 0]
        System.out.println(Arrays.toString(plusOne(new int[]{9, 9, 9})));     // [1, 0, 0, 0]
        System.out.println(Arrays.toString(plusOne(new int[]{0})));           // [1]
    }
}
`,
          },
          {
            label: "How many digits are touched, and numbers too big for 64-bit integers",
            code: `// How many digits does plus-one actually touch? And numbers far too big for 64 bits.
public class Main {
    static int touched = 0;

    static int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            touched++;
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        int[] result = new int[digits.length + 1];
        result[0] = 1;
        return result;
    }

    static String join(int[] digits) {
        StringBuilder sb = new StringBuilder();
        for (int d : digits) sb.append(d);
        return sb.toString();
    }

    public static void main(String[] args) {
        int[][] cases = {{1, 2, 3}, {1, 2, 9}, {1, 9, 9}, {9, 9, 9}, {5, 9, 9, 9, 9, 9, 9, 9, 9, 9}};
        for (int[] digits : cases) {
            String before = join(digits);
            touched = 0;
            String after = join(plusOne(digits));
            System.out.println(before + " + 1 = " + after + "  (digits touched: " + touched + ")");
        }

        int[] big = {6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3};
        System.out.println("19 digits: " + join(plusOne(big)));
        int[] nines = new int[25];
        java.util.Arrays.fill(nines, 9);
        System.out.println("25 nines + 1 has " + plusOne(nines).length + " digits");

        // Average over every 4-digit number 1000..9999: about 1.11 digits touched.
        long total = 0;
        for (int n = 1000; n < 10000; n++) {
            String s = Integer.toString(n);
            int[] d = new int[s.length()];
            for (int i = 0; i < s.length(); i++) d[i] = s.charAt(i) - '0';
            touched = 0;
            plusOne(d);
            total += touched;
        }
        System.out.println("average digits touched over 1000..9999: " + String.format("%.4f", total / 9000.0));
    }
}
`,
          },
          {
            label: "Generalisation: add any integer k to a digit array",
            code: `// Generalisation: add any non-negative integer k to a digit array (plus-one is k = 1).
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Main {
    static List<Integer> addToDigits(int[] digits, int k) {
        List<Integer> out = new ArrayList<>();
        int i = digits.length - 1;
        long carry = k;                        // long: k + a digit must not overflow when k is near Integer.MAX_VALUE
        while (i >= 0 || carry > 0) {
            if (i >= 0) carry += digits[i--];
            out.add((int) (carry % 10));       // lowest digit of the running sum
            carry /= 10;                       // integer division: the rest moves one place left
        }
        Collections.reverse(out);              // built least significant first
        return out;
    }

    public static void main(String[] args) {
        System.out.println(addToDigits(new int[]{1, 2, 0, 0}, 34));   // [1, 2, 3, 4]
        System.out.println(addToDigits(new int[]{2, 7, 4}, 181));     // [4, 5, 5]
        System.out.println(addToDigits(new int[]{2, 1, 5}, 806));     // [1, 0, 2, 1]
        System.out.println(addToDigits(new int[]{0}, 10000));         // [1, 0, 0, 0, 0]
        System.out.println(addToDigits(new int[]{9, 9, 9}, 1));       // [1, 0, 0, 0]
        System.out.println(addToDigits(new int[]{1, 2, 3}, 0));       // [1, 2, 3]
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"A non-negative integer is stored as a vector of its digits, most significant first, so \`{1, 2, 9}\` means 129. In C++, write a function that returns the digits of that number plus one. The vector may be longer than any built-in integer type can hold."

**What a strong answer should cover:**
- Walk from the last digit: below 9, increment and return; a 9 becomes 0 and the carry moves left.
- If every digit was 9, insert a 1 at the front (\`digits.insert(digits.begin(), 1)\`), the only case that grows the vector.
- O(n) worst case, usually one digit touched (early exit); O(1) extra space except the all-9s case.
- C++ specifics: the loop index must be signed (it reaches -1), \`stoll\` throws \`std::out_of_range\` beyond about 19 digits, signed overflow such as \`LLONG_MAX + 1\` is undefined behaviour, and taking the vector by value versus by reference is a deliberate choice.

**Clarifying questions expected:**
- "Most significant digit first, no leading zeros?"
- "Should I modify the caller's vector or return a new one?"

**Code / implementation expected:** Yes — \`vector<int> plusOne(vector<int> digits)\` with a backwards loop and the all-9s insert.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need \`std::vector\` and loops.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the word an interviewer expects. Every program here was compiled with \`g++ -std=c++17\` and run, and the output shown in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture an old car odometer with rolling number wheels: \`0 1 2 9\`. You drive one more kilometre. The rightmost wheel rolls from 9 to 0, and as it passes 9 it nudges the wheel to its left one step, from 2 to 3. That wheel was not at 9, so nothing further happens: the odometer now reads \`0 1 3 0\`. Only when every wheel shows 9 does the nudge travel all the way to the left end, and a real odometer would need one more wheel.

That is the whole problem. The number is stored as an array of digits, most significant first (\`[1, 2, 9]\` means 129), and you add one by doing exactly what the odometer does: start at the right, turn 9s into 0s while carrying, and stop at the first digit that is not 9.

Why would anyone store a number like this? Because some numbers are far too big for the computer's built-in integer types (a 64-bit integer holds about 19 digits), and digit arrays are how "big number" arithmetic works underneath. Interviewers use this warm-up to see whether you handle the carry and the all-9s case cleanly, and whether you know why "just convert it to a number" is not a safe answer.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the most significant digit first? | \`[1, 2, 3]\` meaning 123 (the usual form) means you walk from the end; least-significant-first would mean walking from the start. |
| Can there be leading zeros, or is the input empty? | \`[0]\` is valid; \`[0, 0, 1]\` or \`[]\` usually are not, but ask. |
| May I modify the input array? | Mutating in place avoids a copy except in the all-9s case. |
| How long can the array be? | Hundreds of digits rule out converting to a built-in integer. |

## 3. The Core Idea: Carry From the Right

📌 **Interview term: Carry** — when a digit position overflows (9 + 1 = 10), you keep the last digit (0) in that position and add 1 to the next position to the left.

Walk from the **last** digit to the first:

- If the digit is **less than 9**, add 1 to it and **stop**: there is no carry, every digit to the left stays the same.
- If the digit is **9**, set it to 0 and keep going left: the carry moves one position.
- If you get past the first digit, every digit was 9 (like 999). The answer is a 1 followed by all those zeros, which is **one digit longer** than the input.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 1 2 9. The last digit 9 becomes 0 and carries 1 to the left. The middle digit 2 becomes 3 and the loop stops. Result 1 3 0">
  <defs>
    <marker id="b09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">1</text>
  <rect class="d-box" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <text class="d-sub" x="372" y="124" text-anchor="middle">9 + 1 = 10</text>
  <path class="d-edge-accent" d="M 362 136 Q 336 166 310 136" marker-end="url(#b09q5-arrow)"/>
  <text class="d-sub" x="336" y="184" text-anchor="middle">carry 1</text>
  <text class="d-text" x="40" y="233">result</text>
  <rect class="d-box" x="200" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="233" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="272" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="233" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="344" y="200" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="233" text-anchor="middle">0</text>
  <text class="d-sub" x="228" y="124" text-anchor="middle">untouched</text>
</svg>

For \`[1, 2, 9]\` the loop touches two digits and stops; the leading \`1\` is never even looked at.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 280" role="img" aria-label="Adding one to 9 9 9. Every digit becomes 0 and the carry runs off the left end, so a new array 1 0 0 0 with one more digit is needed">
  <defs>
    <marker id="b09q5b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="73">digits</text>
  <rect class="d-box-accent" x="200" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="272" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="73" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="344" y="40" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="73" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 362 104 Q 336 130 310 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 290 104 Q 264 130 238 104" marker-end="url(#b09q5b-arrow)"/>
  <path class="d-edge-accent" d="M 218 104 Q 182 130 166 104" marker-end="url(#b09q5b-arrow)"/>
  <text class="d-sub" x="168" y="152" text-anchor="middle">carry left over</text>
  <text class="d-text" x="40" y="223">result</text>
  <rect class="d-box-accent" x="128" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="156" y="223" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="228" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="272" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="300" y="223" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="344" y="190" width="56" height="56" rx="8"/>
  <text class="d-text" x="372" y="223" text-anchor="middle">0</text>
</svg>

For \`[9, 9, 9]\` every digit becomes 0 and the carry falls off the left end, so the result needs a new array \`[1, 0, 0, 0]\`. This is the only case where the output is longer than the input, and the only case where the function cannot just modify the input array in place (in languages where arrays have a fixed size).

📌 **Interview term: Early exit** — stopping a loop as soon as the answer is known. Here the loop stops at the first non-9 digit, so most inputs only touch one digit.

### Why not convert to a number, add one, and convert back?

It is the obvious first idea, and in a language with arbitrary-size integers it even works. But the input may have hundreds of digits, which does not fit in a 32-bit or 64-bit integer, and converting is O(n) work in both directions anyway. The digit-by-digit loop works for any length and is just as short. Section 4 shows exactly what goes wrong in this language.

📌 **Interview term: Integer overflow** — when a value is too large for its integer type; depending on the language it wraps around, throws, or loses precision.

📌 **Interview term: Big-number (arbitrary-precision) arithmetic** — storing a number as a sequence of digits (or larger "limbs") so it can be any size; schoolbook addition with carries, exactly like this problem, is its simplest operation.

## 4. Converting to an Integer in C++: Limited, and Overflow Is Undefined

The widest standard integer types are 64 bits. We ran the conversion shortcut at the 19-digit boundary:

~~~cpp
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
using namespace std;

int main() {
    cout << "stoll(19 digits) + 1 = " << stoll("6145390195186705543") + 1 << "\\n";
    cout << "long long max = " << numeric_limits<long long>::max() << "\\n";
    try {
        stoll("99999999999999999999");                          // 20 digits
    } catch (const out_of_range&) {
        cout << "stoll(20 nines) threw std::out_of_range\\n";
    }
    cout << "unsigned long long max = " << numeric_limits<unsigned long long>::max() << "\\n";
    int d = 7;
    char c = static_cast<char>('0' + d);
    cout << "'0' + 7 as a char: " << c << ", and '7' - '0' = " << ('7' - '0') << "\\n";
    return 0;
}
~~~

~~~text
stoll(19 digits) + 1 = 6145390195186705544
long long max = 9223372036854775807
stoll(20 nines) threw std::out_of_range
unsigned long long max = 18446744073709551615
'0' + 7 as a char: 7, and '7' - '0' = 7
~~~

The 19-digit value fits in a \`long long\` (max 9223372036854775807), so \`stoll(...) + 1\` worked. A 20-digit string makes \`stoll\` throw \`std::out_of_range\`. Even \`unsigned long long\` stops at 18446744073709551615, 20 digits. And unlike Java, overflowing a **signed** integer in C++ (for example \`LLONG_MAX + 1\`) is **undefined behaviour**: the compiler may assume it never happens, so the program cannot be relied on, which is why we did not run it. There is no big-integer type in the standard library, so for long numbers the digit loop is not just the interview answer, it is the only standard answer.

📌 **Interview term: Undefined behaviour** — an operation the C++ standard places no requirements on, such as signed integer overflow or out-of-range \`operator[]\`; the program may do anything, including appearing to work.

The last line of the run shows the character arithmetic you need when digits arrive as text: \`'0' + 7\` is the character \`'7'\` and \`'7' - '0'\` is the number 7, because the digit characters are consecutive.

## 5. The C++ Code

~~~cpp
vector<int> plusOne(vector<int> digits) {
    for (int i = static_cast<int>(digits.size()) - 1; i >= 0; i--) {   // last digit to first
        if (digits[i] < 9) {
            digits[i]++;                                   // no carry: done
            return digits;
        }
        digits[i] = 0;                                     // 9 + 1 = 10: write 0, carry 1 to the left
    }
    digits.insert(digits.begin(), 1);                      // every digit was 9: one more digit
    return digits;
}
~~~

Walk-through:

- The vector is taken **by value**, so the function works on its own copy and the caller's vector is unchanged; it also lets the call site pass a braced list like \`plusOne({1, 2, 9})\`. If you want to avoid the copy and mutate the caller's vector, take \`vector<int>&\` instead.
- The index is \`int\`, converted from \`size()\`, because the loop ends when \`i\` becomes -1. With \`size_t i\`, \`i >= 0\` is always true and \`i--\` past 0 wraps to a huge number.
- \`if (digits[i] < 9)\` — the common case: increment and return.
- \`digits[i] = 0\` — the digit was 9; continue left with the carry.
- \`digits.insert(digits.begin(), 1)\` — only for all 9s. Inserting at the front shifts every element, O(n), but it happens at most once. \`std::vector\` reallocates if needed.

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — ordinary inputs, trailing 9s and all 9s:**

~~~text
[1, 2, 4]
[4, 3, 2, 2]
[2, 0, 0]
[9, 0, 0, 0]
[1, 0]
[1, 0, 0, 0]
[1]
~~~

**Example 2 — how many digits are touched, and numbers too big for 64 bits:**

~~~text
123 + 1 = 124  (digits touched: 1)
129 + 1 = 130  (digits touched: 2)
199 + 1 = 200  (digits touched: 3)
999 + 1 = 1000  (digits touched: 3)
5999999999 + 1 = 6000000000  (digits touched: 10)
19 digits: 6145390195186705544
25 nines + 1 has 26 digits
average digits touched over 1000..9999: 1.1110
~~~

The number of digits touched is the number of trailing 9s plus one: 1 for 123, 2 for 129, 3 for 199 and 999, 10 for 5999999999. Averaged over every four-digit number it is 1.1110. The 25-digit input needs no special handling.

**Example 3 — the general version: add any k:**

~~~cpp
vector<int> addToDigits(const vector<int>& digits, int k) {
    vector<int> out;
    int i = static_cast<int>(digits.size()) - 1;
    long long carry = k;                     // wider type: k + a digit must not overflow an int
    while (i >= 0 || carry > 0) {
        if (i >= 0) carry += digits[i--];
        out.push_back(static_cast<int>(carry % 10));   // lowest digit of the running sum
        carry /= 10;                                   // integer division
    }
    reverse(out.begin(), out.end());         // built least significant first
    return out;
}
~~~

~~~text
[1, 2, 3, 4]
[4, 5, 5]
[1, 0, 2, 1]
[1, 0, 0, 0, 0]
[1, 0, 0, 0]
[1, 2, 3]
~~~

k is used as the initial carry ("add to array form", LeetCode 989). The carry is a \`long long\` so that \`k + 9\` cannot overflow an \`int\` (which would be undefined behaviour). \`/\` on integers truncates in C++, so \`carry /= 10\` is exactly the "move the rest left" step.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backwards loop with early exit | O(n) worst case, O(1) typical | O(1) beyond the copy, or one insert when all digits are 9 | Stops at the first non-9. |
| \`stoll\` + 1 + \`to_string\` | O(n) | O(n) | Throws beyond 19 digits; no standard big-integer type exists. |
| Add k (Example 3) | O(max(n, digits of k)) | O(n) for the output | One pass with a running carry. |

Taking the vector by value adds an O(n) copy per call; by reference avoids it. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **\`{0}\`** → \`[1]\`.
- **\`{9}\`** → \`[1, 0]\`.
- **Trailing 9s** (\`{1, 9, 9}\` → \`[2, 0, 0]\`).
- **All 9s, any length:** one digit longer; 25 nines gave 26 digits.
- **Empty vector:** the loop does not run and the function returns \`[1]\`; reject it if at least one digit is required.
- **Digits as characters** (\`std::string\`): the same loop works with \`'9'\` instead of \`9\` and \`'0'\` instead of \`0\`.

## Common Pitfalls

- **\`size_t\` loop index.** \`for (size_t i = n - 1; i >= 0; i--)\` never ends correctly; use \`int\`.
- **Converting to \`long long\`.** Limited to 19 digits, and signed overflow is undefined behaviour, not an error.
- **Forgetting the all-9s case.** Returning after the loop without the insert gives \`[0, 0, 0]\` for 999.
- **\`push_back(1)\` instead of inserting at the front.** That gives \`[0, 0, 0, 1]\`: the new 1 belongs at the most significant end.
- **Copying when you meant to mutate (or the reverse).** By value returns a modified copy; by reference changes the caller's vector. Pick one and say which.
- **\`int\` carry in the general version.** \`k + 9\` can overflow when k is near \`INT_MAX\`; use \`long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Walk from the last digit: if it is below 9, increment and return; if it is 9, set it to 0 and move left. If the loop finishes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> a 1 at the front.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">It is an odometer: a carry only continues through 9s, so the first non-9 from the right absorbs it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) worst case (all 9s), usually one digit; the front insert is O(n) but happens at most once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not convert:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stoll</code> throws for anything above <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LLONG_MAX</code> (9223372036854775807, 19 digits), signed overflow is undefined behaviour, and the standard library has no big-integer type, so the digit loop is the real solution.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ details:</strong> <span style="color:#f0e2c8;">The loop index is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> because it reaches -1, and I take the vector by value so the caller keeps the original; by reference if mutation is wanted.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop must stop when the index goes below 0. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> cannot be negative: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 - 1</code> wraps to 18446744073709551615 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> is always true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an arbitrary k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long carry = k</code>, add digits from the right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back(carry % 10)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry /= 10</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code>. Example 3 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 5]</code> for 274 + 181.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the all-9s insert at the front acceptable when it is O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only happens when every digit was 9, and then the loop already did n writes, so the total stays O(n). If it mattered, storing digits least significant first would turn it into an amortised O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LLONG_MAX + 1</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undefined behaviour. Unlike Java, C++ does not promise wraparound for signed types; only unsigned arithmetic is defined to wrap. That is one more reason not to convert.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add two digit vectors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two indices from the right and one carry; when one runs out, treat its digits as 0; append the final carry; reverse. The result can be one digit longer than the longer input.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Carry | The 1 moved to the next position to the left when a digit reaches 10. |
| Early exit | Stopping the loop as soon as the answer is known (at the first non-9 from the right). |
| Integer overflow | A value too large for its integer type; it wraps, throws or loses precision depending on the language. |
| Big-number (arbitrary-precision) arithmetic | Storing numbers as digit sequences so they can be any size. |
| Undefined behaviour | An operation with no guaranteed result in C++, such as signed overflow. |

**Conclusion:** Adding one to a digit array is the odometer: walk from the right, turn 9s into 0s, and stop at the first digit that is not 9, inserting a leading 1 only when every digit was 9. In C++ the loop index must be signed, the by-value or by-reference choice should be deliberate, and converting to a built-in integer is both limited to about 19 digits and, on overflow, undefined behaviour, so the digit loop is the correct answer, not just the interview one.`,
        examples: [
          {
            label: "Plus one on ordinary inputs, trailing 9s and all 9s",
            code: `// Add one to a number stored as a vector of digits, most significant digit first.
#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<int> plusOne(vector<int> digits) {
    for (int i = static_cast<int>(digits.size()) - 1; i >= 0; i--) {   // last digit to first
        if (digits[i] < 9) {
            digits[i]++;                                   // no carry: done
            return digits;
        }
        digits[i] = 0;                                     // 9 + 1 = 10: write 0, carry 1 to the left
    }
    digits.insert(digits.begin(), 1);                      // every digit was 9: one more digit
    return digits;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    cout << fmt(plusOne({1, 2, 3})) << "\\n";     // [1, 2, 4]
    cout << fmt(plusOne({4, 3, 2, 1})) << "\\n";  // [4, 3, 2, 2]
    cout << fmt(plusOne({1, 9, 9})) << "\\n";     // [2, 0, 0]
    cout << fmt(plusOne({8, 9, 9, 9})) << "\\n";  // [9, 0, 0, 0]
    cout << fmt(plusOne({9})) << "\\n";           // [1, 0]
    cout << fmt(plusOne({9, 9, 9})) << "\\n";     // [1, 0, 0, 0]
    cout << fmt(plusOne({0})) << "\\n";           // [1]
    return 0;
}
`,
          },
          {
            label: "How many digits are touched, and numbers too big for 64-bit integers",
            code: `// How many digits does plus-one actually touch? And numbers far too big for 64 bits.
#include <cstdio>
#include <string>
#include <vector>
using namespace std;

int touched = 0;

vector<int> plusOne(vector<int> digits) {
    for (int i = static_cast<int>(digits.size()) - 1; i >= 0; i--) {
        touched++;
        if (digits[i] < 9) {
            digits[i]++;
            return digits;
        }
        digits[i] = 0;
    }
    digits.insert(digits.begin(), 1);
    return digits;
}

string join(const vector<int>& digits) {
    string s;
    for (int d : digits) s += static_cast<char>('0' + d);
    return s;
}

int main() {
    vector<vector<int>> cases = {{1, 2, 3}, {1, 2, 9}, {1, 9, 9}, {9, 9, 9}, {5, 9, 9, 9, 9, 9, 9, 9, 9, 9}};
    for (const auto& digits : cases) {
        touched = 0;
        string after = join(plusOne(digits));
        printf("%s + 1 = %s  (digits touched: %d)\\n", join(digits).c_str(), after.c_str(), touched);
    }

    vector<int> big = {6, 1, 4, 5, 3, 9, 0, 1, 9, 5, 1, 8, 6, 7, 0, 5, 5, 4, 3};
    printf("19 digits: %s\\n", join(plusOne(big)).c_str());
    vector<int> nines(25, 9);
    printf("25 nines + 1 has %zu digits\\n", plusOne(nines).size());

    // Average over every 4-digit number 1000..9999: about 1.11 digits touched.
    long total = 0;
    for (int n = 1000; n < 10000; n++) {
        string s = to_string(n);
        vector<int> d;
        for (char ch : s) d.push_back(ch - '0');
        touched = 0;
        plusOne(d);
        total += touched;
    }
    printf("average digits touched over 1000..9999: %.4f\\n", total / 9000.0);
    return 0;
}
`,
          },
          {
            label: "Generalisation: add any integer k to a digit array",
            code: `// Generalisation: add any non-negative integer k to a digit array (plus-one is k = 1).
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<int> addToDigits(const vector<int>& digits, int k) {
    vector<int> out;
    int i = static_cast<int>(digits.size()) - 1;
    long long carry = k;                     // wider type: k + a digit must not overflow an int
    while (i >= 0 || carry > 0) {
        if (i >= 0) carry += digits[i--];
        out.push_back(static_cast<int>(carry % 10));   // lowest digit of the running sum
        carry /= 10;                                   // integer division
    }
    reverse(out.begin(), out.end());         // built least significant first
    return out;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    cout << fmt(addToDigits({1, 2, 0, 0}, 34)) << "\\n";   // [1, 2, 3, 4]
    cout << fmt(addToDigits({2, 7, 4}, 181)) << "\\n";     // [4, 5, 5]
    cout << fmt(addToDigits({2, 1, 5}, 806)) << "\\n";     // [1, 0, 2, 1]
    cout << fmt(addToDigits({0}, 10000)) << "\\n";         // [1, 0, 0, 0, 0]
    cout << fmt(addToDigits({9, 9, 9}, 1)) << "\\n";       // [1, 0, 0, 0]
    cout << fmt(addToDigits({1, 2, 3}, 0)) << "\\n";       // [1, 2, 3]
    return 0;
}
`,
          },
        ],
      },
    },
  },
];

export default augments;
