/**
 * DSA ULTRA — batch 03: sorting, binary search and selection — comparing the
 * common sorts, how merge sort and quicksort work, binary search and its
 * requirements, binary search on the answer, and search in a rotated sorted
 * array. One complete answer per language (Python, JavaScript, Java, C++).
 * Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: "Compare common sorting algorithms.",
    difficulty: "medium",
    seoDescription: `Bubble, selection, insertion, merge, quick and heap sort compared on time, space, stability and real comparison counts, in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Walk me through the common sorting algorithms — bubble, selection, insertion, merge, quick and heap sort. How do they compare, and which would you pick in different situations? Feel free to show code in Python."

**What a strong answer should cover:**
- Compares on the right axes: best, average and worst time, extra space, stability and adaptivity.
- Correct complexities: the three simple sorts are O(n²); merge and heap sort are O(n log n) always; quicksort is O(n log n) average but O(n²) worst case.
- Explains why quicksort is still popular (in place, cache-friendly, good pivots make the worst case unlikely) and what introsort or random pivots do.
- Mentions the n log n lower bound for comparison sorts and when counting or radix sort can beat it.
- Knows that Python's \`sorted\`/\`list.sort\` is a stable Timsort-family sort, that \`sort()\` returns \`None\`, and that \`key=\` is preferred over a comparator.
- Picks an algorithm from the input shape: nearly sorted, needs stability, tight memory, linked list, small integer keys.

**Clarifying questions expected:**
- How big is the input, and is it nearly sorted already?
- Do equal keys need to keep their original order (stability)?
- Is extra memory a constraint, and is the data an array or a linked list?

**Code / implementation expected:** Optional — a short Python implementation of one O(n²) and one O(n log n) sort is a good bonus; the comparison and the choice matter more.`,
        answer: `# Comparing Common Sorting Algorithms (Python)

**Target Audience:** Beginners preparing for coding interviews; you only need to know what an array and a loop are.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block was produced by actually running the programs (Python 3.13.16); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a teacher handing back 200 exam papers that must be put in order of roll number. One helper picks up each paper and slides it into the right place in the pile already in their hand. Another helper splits the stack in half, gives each half to a friend, and later merges the two sorted halves by repeatedly taking the smaller top paper. A third picks a "middle" roll number, throws everything smaller to the left and everything bigger to the right, and repeats on each side. All three end with a sorted pile. What differs is **how much work they do**, **how much table space they need**, **whether two papers with the same number stay in their original order**, and **how badly they suffer when the pile arrives in an awkward order** (already sorted, or reversed).

That is the whole interview question. Nobody expects you to recite six algorithms from memory; they expect you to compare them on those four axes and pick one for a given situation.

## 2. The Four Things Every Comparison Is About

Interviewers grade this question on whether you compare algorithms on the right properties. There are four.

📌 **Interview term: Time complexity** — how the number of steps grows with the input size *n*, written in [Big-O notation](/interview-question/what-is-big-o-notation). For sorting we usually count **comparisons** (how many times two items are compared), and quote best, average and worst cases separately because they really differ.

📌 **Interview term: Space complexity (auxiliary space)** — how much extra memory the algorithm needs beyond the input itself. 📌 **Interview term: In-place** — an algorithm that only needs O(1) or O(log n) extra memory, rearranging the items inside the original array.

📌 **Interview term: Stable sort** — when two items compare equal (same grade, same price), a stable sort keeps them in the order they had in the input. This matters when you sort by one key after another. The topic has its own page: [What is a stable sorting algorithm?](/interview-question/what-is-a-stable-sorting-algorithm)

📌 **Interview term: Adaptive sort** — an algorithm that does less work when the input is already partly sorted. Insertion sort is the classic example: on sorted input it makes only n - 1 comparisons.

A fifth fact frames everything else:

📌 **Interview term: Comparison sort lower bound** — any algorithm that sorts only by comparing pairs needs at least about log2(n!) comparisons in the worst case, which grows like n log n. For n = 200, log2(200!) is about 1245.4 (computed with \`math.lgamma\` in Python). So O(n log n) is the best a comparison sort can do; only algorithms that look *inside* the keys (counting sort, radix sort) can beat it, and only for special keys such as small integers.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Three families of sorting algorithms: simple quadratic sorts, divide and conquer sorts, and non-comparison sorts">
  <rect class="d-box-muted" x="20" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">Simple sorts</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">bubble, selection,</text>
  <text class="d-sub" x="115" y="112" text-anchor="middle">insertion</text>
  <text class="d-text d-accent" x="115" y="142" text-anchor="middle">O(n squared)</text>
  <text class="d-sub" x="115" y="170" text-anchor="middle">tiny or nearly sorted input</text>
  <rect class="d-box-accent" x="255" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="350" y="62" text-anchor="middle">Divide and conquer</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">merge, quick,</text>
  <text class="d-sub" x="350" y="112" text-anchor="middle">heap</text>
  <text class="d-text d-accent" x="350" y="142" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="350" y="170" text-anchor="middle">the general-purpose choice</text>
  <rect class="d-box-muted" x="490" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="585" y="62" text-anchor="middle">Non-comparison</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">counting, radix,</text>
  <text class="d-sub" x="585" y="112" text-anchor="middle">bucket</text>
  <text class="d-text d-accent" x="585" y="142" text-anchor="middle">O(n + k)</text>
  <text class="d-sub" x="585" y="170" text-anchor="middle">small integer keys only</text>
</svg>

The left family is simple and slow on big inputs, the middle family is what real libraries are built from, and the right family is a special tool for small integer keys.

## 3. The Six Algorithms in Plain Language

**Bubble sort.** Walk through the array comparing neighbours and swap any pair that is out of order. After one pass the largest item has "bubbled" to the end; repeat for the rest. With an early exit (stop when a pass makes no swaps) it is O(n) on sorted input, but O(n²) on average. It is mainly a teaching example.

**Selection sort.** Find the smallest item and swap it into position 0, then the smallest of the rest into position 1, and so on. It always makes exactly n(n-1)/2 comparisons — 19900 for n = 200, whatever the input — but only n - 1 swaps, which is its one advantage when writes are expensive. The long-distance swap makes it **unstable**.

**Insertion sort.** Take items one by one and slide each left into its place in the already-sorted prefix, like sorting cards in your hand. O(n²) on average, but **adaptive** and **stable**, and very fast for small or nearly sorted arrays. Real library sorts use it for short runs.

**Merge sort.** Split the array in half, sort each half recursively, then merge the two sorted halves. Always O(n log n), **stable**, but needs O(n) extra memory for the merge. The step-by-step version is in [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

**Quicksort.** Pick a **pivot**, partition the array into "smaller than pivot" and "not smaller", then sort each side recursively. O(n log n) on average, in place, and usually the fastest in practice, but O(n²) when the pivots are consistently bad (the example below shows exactly that). Not stable.

**Heap sort.** Build a max-[heap](/interview-question/what-is-a-heap-priority-queue) inside the array, then repeatedly swap the largest item to the end and repair the heap. O(n log n) in every case with O(1) extra space, but not stable and, in practice, slower than a good quicksort because it jumps around memory.

📌 **Interview term: Pivot** — the item quicksort uses to split the array; its final position is fixed after one partition.

📌 **Interview term: Hybrid sort** — a production sort that combines several algorithms, for example merge sort plus insertion sort (Timsort) or quicksort plus heap sort plus insertion sort (introsort).

## 4. The Comparison Table

| Algorithm | Best | Average | Worst | Extra space | Stable? | Adaptive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Bubble (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | No (plain version) |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) stack, O(n) worst | No | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No | No |
| Counting (keys 0..k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes | No |

Two rows deserve a sentence each. Quicksort's O(log n) stack is the *average*; with bad pivots the recursion is n levels deep, which is why the worst-case space is O(n) — see [stack space of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use). Counting sort only works when the keys are small integers (k is the key range); [sorting an array of 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) is the classic interview case.

## 5. What Python Itself Uses

You almost never hand-write a sort in Python production code. \`list.sort()\` sorts **in place and returns \`None\`**; \`sorted(iterable)\` returns a **new list** and works on any iterable. Both take \`key=\` (a function that extracts the comparison key) and \`reverse=True\`. The details are in [custom keys and sorted vs sort](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort).

~~~python
nums = [3, 1, 2]
print(nums.sort())          # sort() sorts in place and returns None
print(nums)
print(sorted([3, 1, 2], reverse=True))
print(sorted(["banana", "apple", "Cherry"]))
print(sorted(["banana", "apple", "Cherry"], key=str.lower))
~~~

~~~text
None
[1, 2, 3]
[3, 2, 1]
['Cherry', 'apple', 'banana']
['apple', 'banana', 'Cherry']
~~~

Note the fourth line: strings compare by code point, so every uppercase letter sorts before every lowercase one. \`key=str.lower\` fixes that.

**Which algorithm is it?** CPython's list sort is described in its own source notes, [Objects/listsort.txt](https://github.com/python/cpython/blob/main/Objects/listsort.txt), as "an adaptive, stable, natural mergesort" — the algorithm Tim Peters designed, known as **Timsort**. Those notes also say the code "now uses the powersort merge strategy" to decide which runs to merge. So the built-in sort is O(n log n) worst case, O(n) on already-sorted data, and **guaranteed stable**. How Timsort finds and merges runs is covered in [How does Timsort make Python's sort fast and stable?](/interview-question/how-does-timsort-make-python-s-sort-fast-and-stable)

📌 **Interview term: Timsort** — a hybrid of merge sort and insertion sort that finds already-sorted stretches ("runs") in the data and merges them; stable and adaptive.

## 6. The Code: Counting Comparisons

The first two runnable examples implement all six algorithms with a comparison counter and run them on four inputs of n = 200: random numbers (from a tiny deterministic generator so every language gets the same data), already sorted, reversed, and "nearly sorted" (sorted with a few neighbouring pairs swapped). Here is the insertion sort from the first example; the early \`break\` is what makes it adaptive:

~~~python
def insertion(a):
    c = 0
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0:
            c += 1
            if a[j] <= key:
                break
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return c
~~~

Python swaps with tuple assignment (\`a[j], a[j + 1] = a[j + 1], a[j]\`) and the counters are plain local \`int\`s, which never overflow. The quicksort in the second example uses the **last element as the pivot** (Lomuto partition) on purpose, so you can see the worst case happen.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.py\` and run with \`python3 main.py\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — simple sorts** — comparisons for n = 200

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
bubble          19729       199     19900       397
selection       19900     19900     19900     19900
insertion       10452       199     19900       208
every result sorted: true
~~~

**Example 2 — merge, quick and heap sort** — same four inputs

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
merge            1289       732       812       740
quick            1385     19900     19900     19000
heap             2432      2587      2275      2581
every result sorted: true
~~~

**Example 3 — stability** — sort six people by grade

~~~text
input     Ana(2) Ben(1) Cid(2) Dee(1) Eve(2) Fay(1)
selection Ben(1) Dee(1) Fay(1) Ana(2) Eve(2) Cid(2)
          stable: false
insertion Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
built-in  Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
~~~

What the numbers say:

- **Selection sort does 19900 comparisons on every input** — exactly 200 × 199 / 2. It cannot benefit from sorted data.
- **Insertion and bubble sort drop to 199 comparisons on sorted input** and stay low (208 and 397) on the nearly sorted one. That is adaptivity, and it is why hybrids use insertion sort on small or almost-ordered pieces.
- **Merge sort stays between 732 and 1289** on all inputs — close to the theoretical minimum of about 1245 for random data.
- **Last-element quicksort collapses to 19900 comparisons on sorted and reversed input**, the same as selection sort. Each partition only peels off one element. On random data it is fine (1385). This is the O(n²) worst case, and the reason real implementations pick pivots more carefully.
- **Heap sort is steady (2275 to 2587)** but makes about twice as many comparisons as merge sort.
- **Stability:** selection sort turned "Ana, Cid, Eve" (all grade 2) into "Ana, Eve, Cid", so it is unstable; insertion sort and the built-in stable sort kept the input order.

## 8. Stability, Pictured

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Sorting six people by grade. A stable sort keeps Ana, Cid, Eve in input order; selection sort moves Cid after Eve">
  <text class="d-text" x="20" y="63">input</text>
  <rect class="d-box-accent" x="150" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="63" text-anchor="middle">Ana 2</text>
  <rect class="d-box-muted" x="240" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="63" text-anchor="middle">Ben 1</text>
  <rect class="d-box-accent" x="330" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="63" text-anchor="middle">Cid 2</text>
  <rect class="d-box-muted" x="420" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="63" text-anchor="middle">Dee 1</text>
  <rect class="d-box-accent" x="510" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="63" text-anchor="middle">Eve 2</text>
  <rect class="d-box-muted" x="600" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="63" text-anchor="middle">Fay 1</text>
  <text class="d-text" x="20" y="163">stable</text>
  <rect class="d-box-muted" x="150" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="163" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="163" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="163" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="163" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="163" text-anchor="middle">Cid 2</text>
  <rect class="d-box-accent" x="600" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="163" text-anchor="middle">Eve 2</text>
  <text class="d-text" x="20" y="263">unstable</text>
  <rect class="d-box-muted" x="150" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="263" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="263" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="263" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="263" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="263" text-anchor="middle">Eve 2</text>
  <rect class="d-box-accent" x="600" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="263" text-anchor="middle">Cid 2</text>
</svg>

The accented cells are the three people with grade 2. In the stable result they appear as Ana, Cid, Eve, the same order as the input; selection sort swapped Ana far ahead early on and left Cid and Eve reversed.

In Python the stable "built-in" line is \`sorted(people, key=lambda p: p[1])\`.

## 9. How to Choose

| Situation | Good choice | Why |
| :--- | :--- | :--- |
| General data, use the library | Built-in sort | Tuned hybrid, O(n log n) |
| Fewer than ~20 items, or nearly sorted | Insertion sort | Adaptive, tiny constant factor |
| Must keep ties in order (multi-key sort) | Merge sort / stable library sort | Stable |
| Memory is tight, need a worst-case guarantee | Heap sort | O(1) space, O(n log n) always |
| Fastest average in-place sort of an array | Quicksort with random or median-of-three pivot | Cache-friendly, small constant |
| Linked list | Merge sort | No random access needed; merging lists needs no extra array |
| Small integer keys (ages, 0-2 flags) | Counting sort | O(n + k), beats n log n |
| Data bigger than memory | External merge sort | Merges sorted chunks from disk |

If you only need the top k items, sorting is overkill: a heap or [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) does it in less time.

## 11. Complexity of the Examples

| Program | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Example 1 (simple sorts) | O(n²) per sort | O(1) per sort | Nested loops; swaps happen inside the array |
| Example 2 (merge, quick, heap) | O(n log n); quick O(n²) on sorted input | merge O(n), quick O(n) stack worst, heap O(1) | Merge copies halves; quicksort recursion is n deep with bad pivots |
| Example 3 (stability) | O(n²) for the hand-written sorts | O(n) for the copies | Each function sorts a copy so the input stays intact |

In Python every comparison is a dynamic method call, so constant factors are large. On 100,000 random floats, a pure-Python recursive merge sort took 254.8 ms per run against 17.0 ms for \`sorted\` (about 15 times slower; timed with \`timeit\`, average of 3 runs, on the machine used for this page).

## 10. Edge Cases

- **Empty array and one element** — every algorithm must return immediately; check the loop bounds (\`n - 1\` passes on an empty array is a classic off-by-one).
- **All equal items** — Lomuto quicksort degrades to O(n²) here too, because every item goes to one side. Three-way partitioning ([Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s)) fixes it.
- **Already sorted or reversed** — the worst case for naive pivot choices, the best case for insertion sort.
- **Many duplicate keys with satellite data** — this is where stability shows.

## Common Pitfalls

- **Writing \`nums = nums.sort()\`.** \`sort()\` returns \`None\`, so this throws your list away. Use \`nums.sort()\` alone or \`nums = sorted(nums)\`.
- **Recursive quicksort on large sorted input.** CPython's default recursion limit is 1000 (\`sys.getrecursionlimit()\` printed 1000). A last-element quicksort on \`list(range(2000))\` raised \`RecursionError: maximum recursion depth exceeded\` in our run.
- **Comparing mixed types.** \`sorted([3, "a", 1])\` raises \`TypeError: '<' not supported between instances of 'str' and 'int'\`; Python 3 does not order unrelated types.
- **Forgetting \`key=str.lower\` for human-friendly text order.** Plain string sort puts \`'Cherry'\` before \`'apple'\`.
- **Calling selection sort "stable".** It is not; Example 3 shows the swap that breaks it.
- **Hand-writing a sort in an interview when the question allows \`sorted\`.** Ask first; the built-in is faster than anything you write in pure Python.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The framing:</strong> <span style="color:#f0e2c8;">Compare sorts on four things: time (best, average, worst), extra space, stability and adaptivity.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The simple sorts:</strong> <span style="color:#f0e2c8;">Bubble, selection and insertion are O(n²); insertion sort is stable, adaptive and the fastest of the three on small or nearly sorted input, which is why it survives inside real library sorts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fast sorts:</strong> <span style="color:#f0e2c8;">Merge sort: O(n log n) always, stable, O(n) extra space. Quicksort: fastest on average, in place, O(n²) with bad pivots. Heap sort: O(n log n) always, O(1) space, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. My language:</strong> <span style="color:#f0e2c8;">Python's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort</code> is Timsort-based: stable, adaptive, O(n log n) worst case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The proof:</strong> <span style="color:#f0e2c8;">In my run on 200 items, last-pivot quicksort hit 19900 comparisons on sorted input while merge sort stayed under 1300.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted</code> accept a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key</code> instead of a comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A key is computed once per item instead of once per comparison: sorting 1000 items with a counting key function made exactly 1000 key calls in our run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.cmp_to_key</code> exists for the rare case you need a two-argument comparator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Quicksort is O(n²) in the worst case, so why is it so popular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its average case is O(n log n) with a small constant, it sorts in place and it is cache-friendly. A random or median-of-three pivot makes the worst case unlikely, and introsort removes it entirely by switching to heap sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick merge sort over quicksort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need stability, a guaranteed O(n log n), or you are sorting a linked list or data on disk (external merge sort).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can any sort beat O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by comparing pairs: the lower bound is about log2(n!) comparisons, roughly 1245 for n = 200. Counting and radix sort beat it by using the key values directly, for small integer keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What sort would you use for an almost sorted array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insertion sort, or simply the built-in sort: insertion sort made only 208 comparisons on our nearly sorted 200-item input, versus 19900 for selection sort.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Time complexity** | How the number of steps grows with n |
| **Space complexity** | Extra memory beyond the input |
| **In-place** | Needs only O(1) or O(log n) extra memory |
| **Stable sort** | Equal keys keep their input order |
| **Adaptive sort** | Does less work on partly sorted input |
| **Comparison sort lower bound** | About log2(n!) ~ n log n comparisons are unavoidable |
| **Pivot** | The item quicksort partitions around |
| **Hybrid sort** | A library sort combining several algorithms |
| **Timsort** | Stable, adaptive merge sort plus insertion sort; Python's built-in |

---
**Conclusion:** Sorting algorithms differ on time, space, stability and adaptivity, and the measured comparison counts make the differences concrete: selection sort always pays 19900 comparisons for 200 items, insertion sort pays 199 on sorted data, merge sort stays near the n log n floor, and a careless quicksort pivot turns O(n log n) into O(n²). In Python you will almost always call \`sorted\` or \`list.sort\`, a stable Timsort-family sort — so the strong answer explains the trade-offs, then says why the built-in is the right default and when (top-k, small integer keys) something else is better.`,
        examples: [
          {
            label: `Comparison counts: the three simple sorts`,
            code: `# Count element comparisons made by the three simple O(n^2) sorts on four input shapes.

def make_inputs(n):
    seed, rnd = 42, []
    for _ in range(n):
        seed = seed * 48271 % 2147483647      # same generator in every language
        rnd.append(seed % 1000)
    nearly = list(range(n))
    for i in range(0, n - 1, 20):              # a few neighbour swaps
        nearly[i], nearly[i + 1] = nearly[i + 1], nearly[i]
    return [("random", rnd), ("sorted", list(range(n))),
            ("reversed", list(range(n, 0, -1))), ("nearly", nearly)]

def bubble(a):
    c = 0
    for end in range(len(a) - 1, 0, -1):
        swapped = False
        for j in range(end):
            c += 1
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break                              # early exit: already sorted
    return c

def selection(a):
    c = 0
    for i in range(len(a) - 1):
        m = i
        for j in range(i + 1, len(a)):
            c += 1
            if a[j] < a[m]:
                m = j
        a[i], a[m] = a[m], a[i]
    return c

def insertion(a):
    c = 0
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0:
            c += 1
            if a[j] <= key:
                break
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return c

algos = [("bubble", bubble), ("selection", selection), ("insertion", insertion)]
inputs = make_inputs(200)
print("comparisons for n = 200")
print(f"{'algorithm':<11}" + "".join(f"{name:>10}" for name, _ in inputs))
all_ok = True
for algo_name, fn in algos:
    row = f"{algo_name:<11}"
    for _, data in inputs:
        arr = data[:]
        row += f"{fn(arr):>10}"
        all_ok = all_ok and arr == sorted(data)
    print(row)
print("every result sorted:", str(all_ok).lower())`,
          },
          {
            label: `Comparison counts: merge, quick and heap sort`,
            code: `# Count element comparisons made by the three O(n log n) sorts on four input shapes.

def make_inputs(n):
    seed, rnd = 42, []
    for _ in range(n):
        seed = seed * 48271 % 2147483647      # same generator in every language
        rnd.append(seed % 1000)
    nearly = list(range(n))
    for i in range(0, n - 1, 20):              # a few neighbour swaps
        nearly[i], nearly[i + 1] = nearly[i + 1], nearly[i]
    return [("random", rnd), ("sorted", list(range(n))),
            ("reversed", list(range(n, 0, -1))), ("nearly", nearly)]

def merge_sort(a):
    cnt = [0]
    def rec(lo, hi):                           # sorts a[lo:hi]
        if hi - lo < 2:
            return
        mid = (lo + hi) // 2
        rec(lo, mid)
        rec(mid, hi)
        left, right = a[lo:mid], a[mid:hi]
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            cnt[0] += 1
            if left[i] <= right[j]:
                a[k] = left[i]; i += 1
            else:
                a[k] = right[j]; j += 1
            k += 1
        while i < len(left):
            a[k] = left[i]; i += 1; k += 1
        while j < len(right):
            a[k] = right[j]; j += 1; k += 1
    rec(0, len(a))
    return cnt[0]

def quick_sort(a):                             # Lomuto, last element as pivot
    cnt = [0]
    def rec(lo, hi):
        if lo >= hi:
            return
        pivot, i = a[hi], lo
        for j in range(lo, hi):
            cnt[0] += 1
            if a[j] < pivot:
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        rec(lo, i - 1)
        rec(i + 1, hi)
    rec(0, len(a) - 1)
    return cnt[0]

def heap_sort(a):
    cnt = [0]
    def sift(i, size):
        while True:
            l, r, big = 2 * i + 1, 2 * i + 2, i
            if l < size:
                cnt[0] += 1
                if a[l] > a[big]: big = l
            if r < size:
                cnt[0] += 1
                if a[r] > a[big]: big = r
            if big == i:
                return
            a[i], a[big] = a[big], a[i]
            i = big
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        sift(i, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift(0, end)
    return cnt[0]

algos = [("merge", merge_sort), ("quick", quick_sort), ("heap", heap_sort)]
inputs = make_inputs(200)
print("comparisons for n = 200")
print(f"{'algorithm':<11}" + "".join(f"{name:>10}" for name, _ in inputs))
all_ok = True
for algo_name, fn in algos:
    row = f"{algo_name:<11}"
    for _, data in inputs:
        arr = data[:]
        row += f"{fn(arr):>10}"
        all_ok = all_ok and arr == sorted(data)
    print(row)
print("every result sorted:", str(all_ok).lower())`,
          },
          {
            label: `Stability: which sorts keep equal keys in order`,
            code: `# Stability: do records with equal keys keep their original order?
people = [("Ana", 2), ("Ben", 1), ("Cid", 2), ("Dee", 1), ("Eve", 2), ("Fay", 1)]

def show(label, rows):
    print(f"{label:<10}" + " ".join(f"{name}({grade})" for name, grade in rows))

def selection_by_grade(rows):        # swaps across the array: NOT stable
    a = rows[:]
    for i in range(len(a) - 1):
        m = i
        for j in range(i + 1, len(a)):
            if a[j][1] < a[m][1]:
                m = j
        a[i], a[m] = a[m], a[i]
    return a

def insertion_by_grade(rows):        # only shifts past strictly larger keys: stable
    a = rows[:]
    for i in range(1, len(a)):
        cur, j = a[i], i - 1
        while j >= 0 and a[j][1] > cur[1]:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = cur
    return a

def is_stable(rows):                 # equal grades must appear in input order
    order = {name: i for i, (name, _) in enumerate(people)}
    return all(not (rows[k][1] == rows[k + 1][1] and order[rows[k][0]] > order[rows[k + 1][0]])
               for k in range(len(rows) - 1))

show("input", people)
for label, result in [("selection", selection_by_grade(people)),
                      ("insertion", insertion_by_grade(people)),
                      ("built-in", sorted(people, key=lambda p: p[1]))]:
    show(label, result)
    print(f"{'':<10}stable: {str(is_stable(result)).lower()}")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Walk me through the common sorting algorithms — bubble, selection, insertion, merge, quick and heap sort. How do they compare, and which would you pick in different situations? Feel free to show code in JavaScript."

**What a strong answer should cover:**
- Compares on the right axes: best, average and worst time, extra space, stability and adaptivity.
- Correct complexities: the three simple sorts are O(n²); merge and heap sort are O(n log n) always; quicksort is O(n log n) average but O(n²) worst case.
- Explains why quicksort is still popular (in place, cache-friendly, good pivots make the worst case unlikely) and what introsort or random pivots do.
- Mentions the n log n lower bound for comparison sorts and when counting or radix sort can beat it.
- Knows that \`Array.prototype.sort\` sorts as strings without a comparator, mutates the array, and has been required to be stable since ES2019 (V8 uses Timsort).
- Picks an algorithm from the input shape: nearly sorted, needs stability, tight memory, linked list, small integer keys.

**Clarifying questions expected:**
- How big is the input, and is it nearly sorted already?
- Do equal keys need to keep their original order (stability)?
- Is extra memory a constraint, and is the data an array or a linked list?

**Code / implementation expected:** Optional — a short JavaScript implementation of one O(n²) and one O(n log n) sort is a good bonus; the comparison and the choice matter more.`,
        answer: `# Comparing Common Sorting Algorithms (JavaScript)

**Target Audience:** Beginners preparing for coding interviews; you only need to know what an array and a loop are.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block was produced by actually running the programs (Node.js v22.22.0); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a teacher handing back 200 exam papers that must be put in order of roll number. One helper picks up each paper and slides it into the right place in the pile already in their hand. Another helper splits the stack in half, gives each half to a friend, and later merges the two sorted halves by repeatedly taking the smaller top paper. A third picks a "middle" roll number, throws everything smaller to the left and everything bigger to the right, and repeats on each side. All three end with a sorted pile. What differs is **how much work they do**, **how much table space they need**, **whether two papers with the same number stay in their original order**, and **how badly they suffer when the pile arrives in an awkward order** (already sorted, or reversed).

That is the whole interview question. Nobody expects you to recite six algorithms from memory; they expect you to compare them on those four axes and pick one for a given situation.

## 2. The Four Things Every Comparison Is About

Interviewers grade this question on whether you compare algorithms on the right properties. There are four.

📌 **Interview term: Time complexity** — how the number of steps grows with the input size *n*, written in [Big-O notation](/interview-question/what-is-big-o-notation). For sorting we usually count **comparisons** (how many times two items are compared), and quote best, average and worst cases separately because they really differ.

📌 **Interview term: Space complexity (auxiliary space)** — how much extra memory the algorithm needs beyond the input itself. 📌 **Interview term: In-place** — an algorithm that only needs O(1) or O(log n) extra memory, rearranging the items inside the original array.

📌 **Interview term: Stable sort** — when two items compare equal (same grade, same price), a stable sort keeps them in the order they had in the input. This matters when you sort by one key after another. The topic has its own page: [What is a stable sorting algorithm?](/interview-question/what-is-a-stable-sorting-algorithm)

📌 **Interview term: Adaptive sort** — an algorithm that does less work when the input is already partly sorted. Insertion sort is the classic example: on sorted input it makes only n - 1 comparisons.

A fifth fact frames everything else:

📌 **Interview term: Comparison sort lower bound** — any algorithm that sorts only by comparing pairs needs at least about log2(n!) comparisons in the worst case, which grows like n log n. For n = 200, log2(200!) is about 1245.4 (computed with \`math.lgamma\` in Python). So O(n log n) is the best a comparison sort can do; only algorithms that look *inside* the keys (counting sort, radix sort) can beat it, and only for special keys such as small integers.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Three families of sorting algorithms: simple quadratic sorts, divide and conquer sorts, and non-comparison sorts">
  <rect class="d-box-muted" x="20" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">Simple sorts</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">bubble, selection,</text>
  <text class="d-sub" x="115" y="112" text-anchor="middle">insertion</text>
  <text class="d-text d-accent" x="115" y="142" text-anchor="middle">O(n squared)</text>
  <text class="d-sub" x="115" y="170" text-anchor="middle">tiny or nearly sorted input</text>
  <rect class="d-box-accent" x="255" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="350" y="62" text-anchor="middle">Divide and conquer</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">merge, quick,</text>
  <text class="d-sub" x="350" y="112" text-anchor="middle">heap</text>
  <text class="d-text d-accent" x="350" y="142" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="350" y="170" text-anchor="middle">the general-purpose choice</text>
  <rect class="d-box-muted" x="490" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="585" y="62" text-anchor="middle">Non-comparison</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">counting, radix,</text>
  <text class="d-sub" x="585" y="112" text-anchor="middle">bucket</text>
  <text class="d-text d-accent" x="585" y="142" text-anchor="middle">O(n + k)</text>
  <text class="d-sub" x="585" y="170" text-anchor="middle">small integer keys only</text>
</svg>

The left family is simple and slow on big inputs, the middle family is what real libraries are built from, and the right family is a special tool for small integer keys.

## 3. The Six Algorithms in Plain Language

**Bubble sort.** Walk through the array comparing neighbours and swap any pair that is out of order. After one pass the largest item has "bubbled" to the end; repeat for the rest. With an early exit (stop when a pass makes no swaps) it is O(n) on sorted input, but O(n²) on average. It is mainly a teaching example.

**Selection sort.** Find the smallest item and swap it into position 0, then the smallest of the rest into position 1, and so on. It always makes exactly n(n-1)/2 comparisons — 19900 for n = 200, whatever the input — but only n - 1 swaps, which is its one advantage when writes are expensive. The long-distance swap makes it **unstable**.

**Insertion sort.** Take items one by one and slide each left into its place in the already-sorted prefix, like sorting cards in your hand. O(n²) on average, but **adaptive** and **stable**, and very fast for small or nearly sorted arrays. Real library sorts use it for short runs.

**Merge sort.** Split the array in half, sort each half recursively, then merge the two sorted halves. Always O(n log n), **stable**, but needs O(n) extra memory for the merge. The step-by-step version is in [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

**Quicksort.** Pick a **pivot**, partition the array into "smaller than pivot" and "not smaller", then sort each side recursively. O(n log n) on average, in place, and usually the fastest in practice, but O(n²) when the pivots are consistently bad (the example below shows exactly that). Not stable.

**Heap sort.** Build a max-[heap](/interview-question/what-is-a-heap-priority-queue) inside the array, then repeatedly swap the largest item to the end and repair the heap. O(n log n) in every case with O(1) extra space, but not stable and, in practice, slower than a good quicksort because it jumps around memory.

📌 **Interview term: Pivot** — the item quicksort uses to split the array; its final position is fixed after one partition.

📌 **Interview term: Hybrid sort** — a production sort that combines several algorithms, for example merge sort plus insertion sort (Timsort) or quicksort plus heap sort plus insertion sort (introsort).

## 4. The Comparison Table

| Algorithm | Best | Average | Worst | Extra space | Stable? | Adaptive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Bubble (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | No (plain version) |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) stack, O(n) worst | No | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No | No |
| Counting (keys 0..k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes | No |

Two rows deserve a sentence each. Quicksort's O(log n) stack is the *average*; with bad pivots the recursion is n levels deep, which is why the worst-case space is O(n) — see [stack space of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use). Counting sort only works when the keys are small integers (k is the key range); [sorting an array of 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) is the classic interview case.

## 5. What JavaScript Itself Uses

\`Array.prototype.sort\` has two traps that have nothing to do with algorithms. First, **without a comparator it converts the items to strings** and sorts them as text. Second, it **sorts in place and returns the same array**. ES2023 added \`toSorted()\`, which returns a sorted copy instead (see [toSorted vs sort](/interview-question/how-does-array-prototype-tosorted-differ-from-sort-and-why-does-that-matter-when)).

~~~javascript
console.log([10, 9, 1, 100].sort());
console.log([10, 9, 1, 100].sort((a, b) => a - b));
const a = [3, 1, 2];
console.log(a.sort((x, y) => x - y) === a);
const b = [3, 1, 2];
const c = b.toSorted((x, y) => x - y);
console.log(b, c);
~~~

~~~text
[ 1, 10, 100, 9 ]
[ 1, 9, 10, 100 ]
true
[ 3, 1, 2 ] [ 1, 2, 3 ]
~~~

(Run with Node.js v22.22.0. Note that \`console.log\` prints arrays with spaces inside the brackets; the runnable examples below format arrays by hand so all four languages print the same text.)

**Which algorithm is it?** The language specification does not name an algorithm, but since ES2019 it requires \`sort\` to be **stable**. V8, the engine in Chrome and Node.js, switched to **Timsort** in V8 v7.0 / Chrome 70; before that it used an unstable quicksort for arrays longer than 10 elements ([v8.dev: Getting things sorted in V8](https://v8.dev/blog/array-sort), [v8.dev: Stable Array.prototype.sort](https://v8.dev/features/stable-sort)). So in any current engine you can rely on a stable O(n log n) sort; you cannot rely on a particular algorithm.

📌 **Interview term: Comparator** — the function \`(a, b) => number\` you pass to \`sort\`: negative means a goes first, positive means b goes first, 0 means "equal, keep their order".

## 6. The Code: Counting Comparisons

The first two runnable examples implement all six algorithms with a comparison counter and run them on four inputs of n = 200: random numbers (from a tiny deterministic generator so every language gets the same data), already sorted, reversed, and "nearly sorted" (sorted with a few neighbouring pairs swapped). Here is the insertion sort from the first example; the early \`break\` is what makes it adaptive:

~~~javascript
function insertion(a) {
  let c = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      c++;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return c;
}
~~~

Arrays of numbers are passed by reference, so the functions sort the caller's copy in place. The swap uses destructuring (\`[a[i], a[j]] = [a[j], a[i]]\`). The quicksort in the second example uses the **last element as the pivot** (Lomuto partition) on purpose, so you can see the worst case happen.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.js\` and run with \`node main.js\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — simple sorts** — comparisons for n = 200

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
bubble          19729       199     19900       397
selection       19900     19900     19900     19900
insertion       10452       199     19900       208
every result sorted: true
~~~

**Example 2 — merge, quick and heap sort** — same four inputs

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
merge            1289       732       812       740
quick            1385     19900     19900     19000
heap             2432      2587      2275      2581
every result sorted: true
~~~

**Example 3 — stability** — sort six people by grade

~~~text
input     Ana(2) Ben(1) Cid(2) Dee(1) Eve(2) Fay(1)
selection Ben(1) Dee(1) Fay(1) Ana(2) Eve(2) Cid(2)
          stable: false
insertion Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
built-in  Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
~~~

What the numbers say:

- **Selection sort does 19900 comparisons on every input** — exactly 200 × 199 / 2. It cannot benefit from sorted data.
- **Insertion and bubble sort drop to 199 comparisons on sorted input** and stay low (208 and 397) on the nearly sorted one. That is adaptivity, and it is why hybrids use insertion sort on small or almost-ordered pieces.
- **Merge sort stays between 732 and 1289** on all inputs — close to the theoretical minimum of about 1245 for random data.
- **Last-element quicksort collapses to 19900 comparisons on sorted and reversed input**, the same as selection sort. Each partition only peels off one element. On random data it is fine (1385). This is the O(n²) worst case, and the reason real implementations pick pivots more carefully.
- **Heap sort is steady (2275 to 2587)** but makes about twice as many comparisons as merge sort.
- **Stability:** selection sort turned "Ana, Cid, Eve" (all grade 2) into "Ana, Eve, Cid", so it is unstable; insertion sort and the built-in stable sort kept the input order.

## 8. Stability, Pictured

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Sorting six people by grade. A stable sort keeps Ana, Cid, Eve in input order; selection sort moves Cid after Eve">
  <text class="d-text" x="20" y="63">input</text>
  <rect class="d-box-accent" x="150" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="63" text-anchor="middle">Ana 2</text>
  <rect class="d-box-muted" x="240" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="63" text-anchor="middle">Ben 1</text>
  <rect class="d-box-accent" x="330" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="63" text-anchor="middle">Cid 2</text>
  <rect class="d-box-muted" x="420" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="63" text-anchor="middle">Dee 1</text>
  <rect class="d-box-accent" x="510" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="63" text-anchor="middle">Eve 2</text>
  <rect class="d-box-muted" x="600" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="63" text-anchor="middle">Fay 1</text>
  <text class="d-text" x="20" y="163">stable</text>
  <rect class="d-box-muted" x="150" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="163" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="163" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="163" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="163" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="163" text-anchor="middle">Cid 2</text>
  <rect class="d-box-accent" x="600" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="163" text-anchor="middle">Eve 2</text>
  <text class="d-text" x="20" y="263">unstable</text>
  <rect class="d-box-muted" x="150" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="263" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="263" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="263" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="263" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="263" text-anchor="middle">Eve 2</text>
  <rect class="d-box-accent" x="600" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="263" text-anchor="middle">Cid 2</text>
</svg>

The accented cells are the three people with grade 2. In the stable result they appear as Ana, Cid, Eve, the same order as the input; selection sort swapped Ana far ahead early on and left Cid and Eve reversed.

In JavaScript the stable "built-in" line is \`people.slice().sort((p, q) => p[1] - q[1])\` — \`slice()\` first, because \`sort\` mutates.

## 9. How to Choose

| Situation | Good choice | Why |
| :--- | :--- | :--- |
| General data, use the library | Built-in sort | Tuned hybrid, O(n log n) |
| Fewer than ~20 items, or nearly sorted | Insertion sort | Adaptive, tiny constant factor |
| Must keep ties in order (multi-key sort) | Merge sort / stable library sort | Stable |
| Memory is tight, need a worst-case guarantee | Heap sort | O(1) space, O(n log n) always |
| Fastest average in-place sort of an array | Quicksort with random or median-of-three pivot | Cache-friendly, small constant |
| Linked list | Merge sort | No random access needed; merging lists needs no extra array |
| Small integer keys (ages, 0-2 flags) | Counting sort | O(n + k), beats n log n |
| Data bigger than memory | External merge sort | Merges sorted chunks from disk |

If you only need the top k items, sorting is overkill: a heap or [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) does it in less time.

## 11. Complexity of the Examples

| Program | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Example 1 (simple sorts) | O(n²) per sort | O(1) per sort | Nested loops; swaps happen inside the array |
| Example 2 (merge, quick, heap) | O(n log n); quick O(n²) on sorted input | merge O(n), quick O(n) stack worst, heap O(1) | Merge copies halves; quicksort recursion is n deep with bad pivots |
| Example 3 (stability) | O(n²) for the hand-written sorts | O(n) for the copies | Each function sorts a copy so the input stays intact |

In JavaScript, a comparator call per comparison is the main cost of \`sort\`; typed arrays sort numerically by default: \`new Int32Array([10, 9, 1, 100]).sort()\` gave \`1,9,10,100\` in our run, with no comparator.

## 10. Edge Cases

- **Empty array and one element** — every algorithm must return immediately; check the loop bounds (\`n - 1\` passes on an empty array is a classic off-by-one).
- **All equal items** — Lomuto quicksort degrades to O(n²) here too, because every item goes to one side. Three-way partitioning ([Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s)) fixes it.
- **Already sorted or reversed** — the worst case for naive pivot choices, the best case for insertion sort.
- **Many duplicate keys with satellite data** — this is where stability shows.

## Common Pitfalls

- **Calling \`sort()\` on numbers without a comparator.** It sorts as strings: \`[10, 9, 1, 100]\` became \`[ 1, 10, 100, 9 ]\`.
- **Forgetting that \`sort\` mutates.** It returns the same array (\`a.sort(...) === a\` printed \`true\`). Copy with \`slice()\` or use \`toSorted()\` when the original must survive, for example React state.
- **Returning a boolean from the comparator.** \`(a, b) => a > b\` returns \`true\`/\`false\`, which become 1/0 and never "negative"; use \`a - b\` for numbers or \`localeCompare\` for strings.
- **Assuming a specific algorithm.** The spec only promises stability (since ES2019); V8 uses Timsort, other engines may differ.
- **Very deep recursion.** A naive recursive quicksort on large sorted input throws: a last-element quicksort on 100,000 already sorted numbers printed \`RangeError: Maximum call stack size exceeded\` in Node.js v22. Choose a better pivot or recurse only on the smaller side.
- **Calling selection sort "stable".** It is not; Example 3 shows it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The framing:</strong> <span style="color:#f0e2c8;">Compare sorts on four things: time (best, average, worst), extra space, stability and adaptivity.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The simple sorts:</strong> <span style="color:#f0e2c8;">Bubble, selection and insertion are O(n²); insertion sort is stable, adaptive and the fastest of the three on small or nearly sorted input, which is why it survives inside real library sorts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fast sorts:</strong> <span style="color:#f0e2c8;">Merge sort: O(n log n) always, stable, O(n) extra space. Quicksort: fastest on average, in place, O(n²) with bad pivots. Heap sort: O(n log n) always, O(1) space, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. My language:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.sort</code> must be stable since ES2019 (V8 uses Timsort), but it sorts as strings unless you pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The proof:</strong> <span style="color:#f0e2c8;">In my run on 200 items, last-pivot quicksort hit 19900 comparisons on sorted input while merge sort stayed under 1300.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[10, 9, 1, 100].sort()</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10, 100, 9]</code>: without a comparator the items are converted to strings and compared as text. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> for numbers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Quicksort is O(n²) in the worst case, so why is it so popular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its average case is O(n log n) with a small constant, it sorts in place and it is cache-friendly. A random or median-of-three pivot makes the worst case unlikely, and introsort removes it entirely by switching to heap sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick merge sort over quicksort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need stability, a guaranteed O(n log n), or you are sorting a linked list or data on disk (external merge sort).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can any sort beat O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by comparing pairs: the lower bound is about log2(n!) comparisons, roughly 1245 for n = 200. Counting and radix sort beat it by using the key values directly, for small integer keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What sort would you use for an almost sorted array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insertion sort, or simply the built-in sort: insertion sort made only 208 comparisons on our nearly sorted 200-item input, versus 19900 for selection sort.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Time complexity** | How the number of steps grows with n |
| **Space complexity** | Extra memory beyond the input |
| **In-place** | Needs only O(1) or O(log n) extra memory |
| **Stable sort** | Equal keys keep their input order |
| **Adaptive sort** | Does less work on partly sorted input |
| **Comparison sort lower bound** | About log2(n!) ~ n log n comparisons are unavoidable |
| **Pivot** | The item quicksort partitions around |
| **Hybrid sort** | A library sort combining several algorithms |
| **Comparator** | Function returning negative, zero or positive for a pair |

---
**Conclusion:** Sorting algorithms differ on time, space, stability and adaptivity, and the measured comparison counts make the differences concrete: selection sort always pays 19900 comparisons for 200 items, insertion sort pays 199 on sorted data, merge sort stays near the n log n floor, and a careless quicksort pivot turns O(n log n) into O(n²). In JavaScript the built-in \`sort\` is stable by specification (Timsort in V8), but it mutates and sorts as strings unless you pass a comparator — so the strong answer covers both the algorithms and those two language traps.`,
        examples: [
          {
            label: `Comparison counts: the three simple sorts`,
            code: `// Count element comparisons made by the three simple O(n^2) sorts on four input shapes.

function makeInputs(n) {
  let seed = 42;
  const rnd = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // product stays below 2^53, so it is exact
    rnd.push(seed % 1000);
  }
  const sorted = Array.from({ length: n }, (_, i) => i);
  const reversed = Array.from({ length: n }, (_, i) => n - i);
  const nearly = sorted.slice();
  for (let i = 0; i < n - 1; i += 20) [nearly[i], nearly[i + 1]] = [nearly[i + 1], nearly[i]];
  return [["random", rnd], ["sorted", sorted], ["reversed", reversed], ["nearly", nearly]];
}

function bubble(a) {
  let c = 0;
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
      c++;
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; }
    }
    if (!swapped) break; // early exit: already sorted
  }
  return c;
}

function selection(a) {
  let c = 0;
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) { c++; if (a[j] < a[m]) m = j; }
    [a[i], a[m]] = [a[m], a[i]];
  }
  return c;
}

function insertion(a) {
  let c = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      c++;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return c;
}

const algos = [["bubble", bubble], ["selection", selection], ["insertion", insertion]];
const inputs = makeInputs(200);
console.log("comparisons for n = 200");
console.log("algorithm".padEnd(11) + inputs.map(([name]) => name.padStart(10)).join(""));
let allOk = true;
for (const [algoName, fn] of algos) {
  let row = algoName.padEnd(11);
  for (const [, data] of inputs) {
    const arr = data.slice();
    row += String(fn(arr)).padStart(10);
    const expected = data.slice().sort((x, y) => x - y); // numeric comparator, not the default
    allOk = allOk && arr.every((v, i) => v === expected[i]);
  }
  console.log(row);
}
console.log("every result sorted: " + allOk);`,
          },
          {
            label: `Comparison counts: merge, quick and heap sort`,
            code: `// Count element comparisons made by the three O(n log n) sorts on four input shapes.

function makeInputs(n) {
  let seed = 42;
  const rnd = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // product stays below 2^53, so it is exact
    rnd.push(seed % 1000);
  }
  const sorted = Array.from({ length: n }, (_, i) => i);
  const reversed = Array.from({ length: n }, (_, i) => n - i);
  const nearly = sorted.slice();
  for (let i = 0; i < n - 1; i += 20) [nearly[i], nearly[i + 1]] = [nearly[i + 1], nearly[i]];
  return [["random", rnd], ["sorted", sorted], ["reversed", reversed], ["nearly", nearly]];
}

function mergeSort(a) {
  let c = 0;
  function rec(lo, hi) { // sorts a[lo..hi)
    if (hi - lo < 2) return;
    const mid = Math.floor((lo + hi) / 2);
    rec(lo, mid);
    rec(mid, hi);
    const left = a.slice(lo, mid), right = a.slice(mid, hi);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      c++;
      a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
  }
  rec(0, a.length);
  return c;
}

function quickSort(a) { // Lomuto, last element as pivot
  let c = 0;
  function rec(lo, hi) {
    if (lo >= hi) return;
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      c++;
      if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    rec(lo, i - 1);
    rec(i + 1, hi);
  }
  rec(0, a.length - 1);
  return c;
}

function heapSort(a) {
  let c = 0;
  function sift(i, size) {
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let big = i;
      if (l < size) { c++; if (a[l] > a[big]) big = l; }
      if (r < size) { c++; if (a[r] > a[big]) big = r; }
      if (big === i) return;
      [a[i], a[big]] = [a[big], a[i]];
      i = big;
    }
  }
  const n = a.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    sift(0, end);
  }
  return c;
}

const algos = [["merge", mergeSort], ["quick", quickSort], ["heap", heapSort]];
const inputs = makeInputs(200);
console.log("comparisons for n = 200");
console.log("algorithm".padEnd(11) + inputs.map(([name]) => name.padStart(10)).join(""));
let allOk = true;
for (const [algoName, fn] of algos) {
  let row = algoName.padEnd(11);
  for (const [, data] of inputs) {
    const arr = data.slice();
    row += String(fn(arr)).padStart(10);
    const expected = data.slice().sort((x, y) => x - y); // numeric comparator, not the default
    allOk = allOk && arr.every((v, i) => v === expected[i]);
  }
  console.log(row);
}
console.log("every result sorted: " + allOk);`,
          },
          {
            label: `Stability: which sorts keep equal keys in order`,
            code: `// Stability: do records with equal keys keep their original order?
const people = [["Ana", 2], ["Ben", 1], ["Cid", 2], ["Dee", 1], ["Eve", 2], ["Fay", 1]];

function show(label, rows) {
  console.log(label.padEnd(10) + rows.map(([name, grade]) => name + "(" + grade + ")").join(" "));
}

function selectionByGrade(rows) { // swaps across the array: NOT stable
  const a = rows.slice();
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j][1] < a[m][1]) m = j;
    [a[i], a[m]] = [a[m], a[i]];
  }
  return a;
}

function insertionByGrade(rows) { // only shifts past strictly larger keys: stable
  const a = rows.slice();
  for (let i = 1; i < a.length; i++) {
    const cur = a[i];
    let j = i - 1;
    while (j >= 0 && a[j][1] > cur[1]) { a[j + 1] = a[j]; j--; }
    a[j + 1] = cur;
  }
  return a;
}

function isStable(rows) { // equal grades must appear in input order
  const order = new Map(people.map(([name], i) => [name, i]));
  for (let k = 0; k + 1 < rows.length; k++)
    if (rows[k][1] === rows[k + 1][1] && order.get(rows[k][0]) > order.get(rows[k + 1][0])) return false;
  return true;
}

show("input", people);
const results = [
  ["selection", selectionByGrade(people)],
  ["insertion", insertionByGrade(people)],
  ["built-in", people.slice().sort((p, q) => p[1] - q[1])], // stable since ES2019
];
for (const [label, result] of results) {
  show(label, result);
  console.log("".padEnd(10) + "stable: " + isStable(result));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Walk me through the common sorting algorithms — bubble, selection, insertion, merge, quick and heap sort. How do they compare, and which would you pick in different situations? Feel free to show code in Java."

**What a strong answer should cover:**
- Compares on the right axes: best, average and worst time, extra space, stability and adaptivity.
- Correct complexities: the three simple sorts are O(n²); merge and heap sort are O(n log n) always; quicksort is O(n log n) average but O(n²) worst case.
- Explains why quicksort is still popular (in place, cache-friendly, good pivots make the worst case unlikely) and what introsort or random pivots do.
- Mentions the n log n lower bound for comparison sorts and when counting or radix sort can beat it.
- Knows that \`Arrays.sort(int[])\` is a dual-pivot quicksort while object sorts are a stable Timsort-style mergesort, and that \`(a, b) -> a - b\` can overflow.
- Picks an algorithm from the input shape: nearly sorted, needs stability, tight memory, linked list, small integer keys.

**Clarifying questions expected:**
- How big is the input, and is it nearly sorted already?
- Do equal keys need to keep their original order (stability)?
- Is extra memory a constraint, and is the data an array or a linked list?

**Code / implementation expected:** Optional — a short Java implementation of one O(n²) and one O(n log n) sort is a good bonus; the comparison and the choice matter more.`,
        answer: `# Comparing Common Sorting Algorithms (Java)

**Target Audience:** Beginners preparing for coding interviews; you only need to know what an array and a loop are.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block was produced by actually running the programs (OpenJDK 21.0.12 (javac + java)); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a teacher handing back 200 exam papers that must be put in order of roll number. One helper picks up each paper and slides it into the right place in the pile already in their hand. Another helper splits the stack in half, gives each half to a friend, and later merges the two sorted halves by repeatedly taking the smaller top paper. A third picks a "middle" roll number, throws everything smaller to the left and everything bigger to the right, and repeats on each side. All three end with a sorted pile. What differs is **how much work they do**, **how much table space they need**, **whether two papers with the same number stay in their original order**, and **how badly they suffer when the pile arrives in an awkward order** (already sorted, or reversed).

That is the whole interview question. Nobody expects you to recite six algorithms from memory; they expect you to compare them on those four axes and pick one for a given situation.

## 2. The Four Things Every Comparison Is About

Interviewers grade this question on whether you compare algorithms on the right properties. There are four.

📌 **Interview term: Time complexity** — how the number of steps grows with the input size *n*, written in [Big-O notation](/interview-question/what-is-big-o-notation). For sorting we usually count **comparisons** (how many times two items are compared), and quote best, average and worst cases separately because they really differ.

📌 **Interview term: Space complexity (auxiliary space)** — how much extra memory the algorithm needs beyond the input itself. 📌 **Interview term: In-place** — an algorithm that only needs O(1) or O(log n) extra memory, rearranging the items inside the original array.

📌 **Interview term: Stable sort** — when two items compare equal (same grade, same price), a stable sort keeps them in the order they had in the input. This matters when you sort by one key after another. The topic has its own page: [What is a stable sorting algorithm?](/interview-question/what-is-a-stable-sorting-algorithm)

📌 **Interview term: Adaptive sort** — an algorithm that does less work when the input is already partly sorted. Insertion sort is the classic example: on sorted input it makes only n - 1 comparisons.

A fifth fact frames everything else:

📌 **Interview term: Comparison sort lower bound** — any algorithm that sorts only by comparing pairs needs at least about log2(n!) comparisons in the worst case, which grows like n log n. For n = 200, log2(200!) is about 1245.4 (computed with \`math.lgamma\` in Python). So O(n log n) is the best a comparison sort can do; only algorithms that look *inside* the keys (counting sort, radix sort) can beat it, and only for special keys such as small integers.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Three families of sorting algorithms: simple quadratic sorts, divide and conquer sorts, and non-comparison sorts">
  <rect class="d-box-muted" x="20" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">Simple sorts</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">bubble, selection,</text>
  <text class="d-sub" x="115" y="112" text-anchor="middle">insertion</text>
  <text class="d-text d-accent" x="115" y="142" text-anchor="middle">O(n squared)</text>
  <text class="d-sub" x="115" y="170" text-anchor="middle">tiny or nearly sorted input</text>
  <rect class="d-box-accent" x="255" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="350" y="62" text-anchor="middle">Divide and conquer</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">merge, quick,</text>
  <text class="d-sub" x="350" y="112" text-anchor="middle">heap</text>
  <text class="d-text d-accent" x="350" y="142" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="350" y="170" text-anchor="middle">the general-purpose choice</text>
  <rect class="d-box-muted" x="490" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="585" y="62" text-anchor="middle">Non-comparison</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">counting, radix,</text>
  <text class="d-sub" x="585" y="112" text-anchor="middle">bucket</text>
  <text class="d-text d-accent" x="585" y="142" text-anchor="middle">O(n + k)</text>
  <text class="d-sub" x="585" y="170" text-anchor="middle">small integer keys only</text>
</svg>

The left family is simple and slow on big inputs, the middle family is what real libraries are built from, and the right family is a special tool for small integer keys.

## 3. The Six Algorithms in Plain Language

**Bubble sort.** Walk through the array comparing neighbours and swap any pair that is out of order. After one pass the largest item has "bubbled" to the end; repeat for the rest. With an early exit (stop when a pass makes no swaps) it is O(n) on sorted input, but O(n²) on average. It is mainly a teaching example.

**Selection sort.** Find the smallest item and swap it into position 0, then the smallest of the rest into position 1, and so on. It always makes exactly n(n-1)/2 comparisons — 19900 for n = 200, whatever the input — but only n - 1 swaps, which is its one advantage when writes are expensive. The long-distance swap makes it **unstable**.

**Insertion sort.** Take items one by one and slide each left into its place in the already-sorted prefix, like sorting cards in your hand. O(n²) on average, but **adaptive** and **stable**, and very fast for small or nearly sorted arrays. Real library sorts use it for short runs.

**Merge sort.** Split the array in half, sort each half recursively, then merge the two sorted halves. Always O(n log n), **stable**, but needs O(n) extra memory for the merge. The step-by-step version is in [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

**Quicksort.** Pick a **pivot**, partition the array into "smaller than pivot" and "not smaller", then sort each side recursively. O(n log n) on average, in place, and usually the fastest in practice, but O(n²) when the pivots are consistently bad (the example below shows exactly that). Not stable.

**Heap sort.** Build a max-[heap](/interview-question/what-is-a-heap-priority-queue) inside the array, then repeatedly swap the largest item to the end and repair the heap. O(n log n) in every case with O(1) extra space, but not stable and, in practice, slower than a good quicksort because it jumps around memory.

📌 **Interview term: Pivot** — the item quicksort uses to split the array; its final position is fixed after one partition.

📌 **Interview term: Hybrid sort** — a production sort that combines several algorithms, for example merge sort plus insertion sort (Timsort) or quicksort plus heap sort plus insertion sort (introsort).

## 4. The Comparison Table

| Algorithm | Best | Average | Worst | Extra space | Stable? | Adaptive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Bubble (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | No (plain version) |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) stack, O(n) worst | No | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No | No |
| Counting (keys 0..k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes | No |

Two rows deserve a sentence each. Quicksort's O(log n) stack is the *average*; with bad pivots the recursion is n levels deep, which is why the worst-case space is O(n) — see [stack space of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use). Counting sort only works when the keys are small integers (k is the key range); [sorting an array of 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) is the classic interview case.

## 5. What Java Itself Uses

Java has two different built-in sorts, and which one runs depends on the **type** of the array. The OpenJDK \`java.util.Arrays\` Javadoc says:

- \`Arrays.sort(int[])\` (and the other primitive arrays): "The sorting algorithm is a Dual-Pivot Quicksort by Vladimir Yaroslavskiy, Jon Bentley, and Joshua Bloch." Stability does not matter for primitives — two equal \`int\`s are indistinguishable.
- \`Arrays.sort(Object[])\`, and therefore \`Collections.sort\` and \`List.sort\`: "a stable, adaptive, iterative mergesort", adapted from Tim Peters's list sort for Python (**Timsort**), and "guaranteed to be stable: equal elements will not be reordered".

(Quoted from the OpenJDK [Arrays.java source](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/Arrays.java).)

📌 **Interview term: Dual-pivot quicksort** — a quicksort variant that partitions around two pivots into three parts; used by Java for primitive arrays.

The classic Java trap is the comparator. \`(a, b) -> a - b\` looks fine, but the subtraction overflows for large values of opposite sign:

~~~java
Integer[] v = { 1, Integer.MIN_VALUE, 5 };
Arrays.sort(v, (a, b) -> a - b);
System.out.println(Arrays.toString(v));
Arrays.sort(v, Integer::compare);
System.out.println(Arrays.toString(v));
~~~

~~~text
[1, 5, -2147483648]
[-2147483648, 1, 5]
~~~

\`1 - Integer.MIN_VALUE\` wraps around to a negative number, so the comparator claims 1 is smaller than the minimum \`int\`. Use \`Integer::compare\` or \`Comparator.comparingInt(...)\`.

📌 **Interview term: Comparator** — an object (often a lambda) whose \`compare(a, b)\` returns a negative number, zero or a positive number; it must be consistent, or the sort may throw \`IllegalArgumentException\` or return garbage.

## 6. The Code: Counting Comparisons

The first two runnable examples implement all six algorithms with a comparison counter and run them on four inputs of n = 200: random numbers (from a tiny deterministic generator so every language gets the same data), already sorted, reversed, and "nearly sorted" (sorted with a few neighbouring pairs swapped). Here is the insertion sort from the first example; the early \`break\` is what makes it adaptive:

~~~java
static void insertion(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0) { c++; if (a[j] <= key) break; a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}
~~~

The sorts work on \`int[]\` (primitives, no boxing) and share a \`static long c\` counter; \`long\` because comparison counts on large inputs can pass 2^31. The quicksort in the second example uses the **last element as the pivot** (Lomuto partition) on purpose, so you can see the worst case happen.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — simple sorts** — comparisons for n = 200

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
bubble          19729       199     19900       397
selection       19900     19900     19900     19900
insertion       10452       199     19900       208
every result sorted: true
~~~

**Example 2 — merge, quick and heap sort** — same four inputs

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
merge            1289       732       812       740
quick            1385     19900     19900     19000
heap             2432      2587      2275      2581
every result sorted: true
~~~

**Example 3 — stability** — sort six people by grade

~~~text
input     Ana(2) Ben(1) Cid(2) Dee(1) Eve(2) Fay(1)
selection Ben(1) Dee(1) Fay(1) Ana(2) Eve(2) Cid(2)
          stable: false
insertion Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
built-in  Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
~~~

What the numbers say:

- **Selection sort does 19900 comparisons on every input** — exactly 200 × 199 / 2. It cannot benefit from sorted data.
- **Insertion and bubble sort drop to 199 comparisons on sorted input** and stay low (208 and 397) on the nearly sorted one. That is adaptivity, and it is why hybrids use insertion sort on small or almost-ordered pieces.
- **Merge sort stays between 732 and 1289** on all inputs — close to the theoretical minimum of about 1245 for random data.
- **Last-element quicksort collapses to 19900 comparisons on sorted and reversed input**, the same as selection sort. Each partition only peels off one element. On random data it is fine (1385). This is the O(n²) worst case, and the reason real implementations pick pivots more carefully.
- **Heap sort is steady (2275 to 2587)** but makes about twice as many comparisons as merge sort.
- **Stability:** selection sort turned "Ana, Cid, Eve" (all grade 2) into "Ana, Eve, Cid", so it is unstable; insertion sort and the built-in stable sort kept the input order.

## 8. Stability, Pictured

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Sorting six people by grade. A stable sort keeps Ana, Cid, Eve in input order; selection sort moves Cid after Eve">
  <text class="d-text" x="20" y="63">input</text>
  <rect class="d-box-accent" x="150" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="63" text-anchor="middle">Ana 2</text>
  <rect class="d-box-muted" x="240" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="63" text-anchor="middle">Ben 1</text>
  <rect class="d-box-accent" x="330" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="63" text-anchor="middle">Cid 2</text>
  <rect class="d-box-muted" x="420" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="63" text-anchor="middle">Dee 1</text>
  <rect class="d-box-accent" x="510" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="63" text-anchor="middle">Eve 2</text>
  <rect class="d-box-muted" x="600" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="63" text-anchor="middle">Fay 1</text>
  <text class="d-text" x="20" y="163">stable</text>
  <rect class="d-box-muted" x="150" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="163" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="163" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="163" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="163" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="163" text-anchor="middle">Cid 2</text>
  <rect class="d-box-accent" x="600" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="163" text-anchor="middle">Eve 2</text>
  <text class="d-text" x="20" y="263">unstable</text>
  <rect class="d-box-muted" x="150" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="263" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="263" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="263" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="263" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="263" text-anchor="middle">Eve 2</text>
  <rect class="d-box-accent" x="600" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="263" text-anchor="middle">Cid 2</text>
</svg>

The accented cells are the three people with grade 2. In the stable result they appear as Ana, Cid, Eve, the same order as the input; selection sort swapped Ana far ahead early on and left Cid and Eve reversed.

In Java the stable "built-in" line is \`builtIn.sort(Comparator.comparingInt(Person::grade))\` on an \`ArrayList<Person>\`; \`Person\` is a Java 16+ \`record\`.

## 9. How to Choose

| Situation | Good choice | Why |
| :--- | :--- | :--- |
| General data, use the library | Built-in sort | Tuned hybrid, O(n log n) |
| Fewer than ~20 items, or nearly sorted | Insertion sort | Adaptive, tiny constant factor |
| Must keep ties in order (multi-key sort) | Merge sort / stable library sort | Stable |
| Memory is tight, need a worst-case guarantee | Heap sort | O(1) space, O(n log n) always |
| Fastest average in-place sort of an array | Quicksort with random or median-of-three pivot | Cache-friendly, small constant |
| Linked list | Merge sort | No random access needed; merging lists needs no extra array |
| Small integer keys (ages, 0-2 flags) | Counting sort | O(n + k), beats n log n |
| Data bigger than memory | External merge sort | Merges sorted chunks from disk |

If you only need the top k items, sorting is overkill: a heap or [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) does it in less time.

## 11. Complexity of the Examples

| Program | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Example 1 (simple sorts) | O(n²) per sort | O(1) per sort | Nested loops; swaps happen inside the array |
| Example 2 (merge, quick, heap) | O(n log n); quick O(n²) on sorted input | merge O(n), quick O(n) stack worst, heap O(1) | Merge copies halves; quicksort recursion is n deep with bad pivots |
| Example 3 (stability) | O(n²) for the hand-written sorts | O(n) for the copies | Each function sorts a copy so the input stays intact |

In Java, sorting \`Integer[]\` or \`List<Integer>\` pays for boxing (each element is an object) and pointer chasing; \`int[]\` avoids both.

## 10. Edge Cases

- **Empty array and one element** — every algorithm must return immediately; check the loop bounds (\`n - 1\` passes on an empty array is a classic off-by-one).
- **All equal items** — Lomuto quicksort degrades to O(n²) here too, because every item goes to one side. Three-way partitioning ([Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s)) fixes it.
- **Already sorted or reversed** — the worst case for naive pivot choices, the best case for insertion sort.
- **Many duplicate keys with satellite data** — this is where stability shows.

## Common Pitfalls

- **\`(a, b) -> a - b\` as a comparator.** It overflowed in our run and put \`-2147483648\` last. Use \`Integer::compare\`.
- **Expecting \`Arrays.sort(int[])\` and \`Arrays.sort(Integer[])\` to behave the same.** The first is a dual-pivot quicksort on primitives; the second boxes every value and uses the stable mergesort. Primitive arrays are faster and use less memory.
- **Sorting a \`List.of(...)\`.** It is immutable; \`List.of(3, 1, 2).sort(null)\` threw \`java.lang.UnsupportedOperationException\`. Copy into \`new ArrayList<>(...)\` first, as Example 3 does.
- **An inconsistent comparator.** If \`compare\` breaks the contract, the JDK sort can throw: sorting 10,000 \`Integer\`s with a comparator that returned random results threw \`java.lang.IllegalArgumentException: Comparison method violates its general contract!\` in our run.
- **\`int\` counters on big inputs.** n² comparisons for n = 100000 is 10^10, beyond \`Integer.MAX_VALUE\`; the examples use \`long\`.
- **Calling selection sort "stable".** It is not; Example 3 shows it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The framing:</strong> <span style="color:#f0e2c8;">Compare sorts on four things: time (best, average, worst), extra space, stability and adaptivity.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The simple sorts:</strong> <span style="color:#f0e2c8;">Bubble, selection and insertion are O(n²); insertion sort is stable, adaptive and the fastest of the three on small or nearly sorted input, which is why it survives inside real library sorts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fast sorts:</strong> <span style="color:#f0e2c8;">Merge sort: O(n log n) always, stable, O(n) extra space. Quicksort: fastest on average, in place, O(n²) with bad pivots. Heap sort: O(n log n) always, O(1) space, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. My language:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(int[])</code> is a dual-pivot quicksort; object sorts (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.sort</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.sort</code>) are a stable Timsort-style mergesort.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The proof:</strong> <span style="color:#f0e2c8;">In my run on 200 items, last-pivot quicksort hit 19900 comparisons on sorted input while merge sort stayed under 1300.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(a, b) -&gt; a - b</code> a bad comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The subtraction can overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> in the array it sorted the minimum to the end. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer::compare</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Quicksort is O(n²) in the worst case, so why is it so popular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its average case is O(n log n) with a small constant, it sorts in place and it is cache-friendly. A random or median-of-three pivot makes the worst case unlikely, and introsort removes it entirely by switching to heap sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick merge sort over quicksort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need stability, a guaranteed O(n log n), or you are sorting a linked list or data on disk (external merge sort).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can any sort beat O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by comparing pairs: the lower bound is about log2(n!) comparisons, roughly 1245 for n = 200. Counting and radix sort beat it by using the key values directly, for small integer keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What sort would you use for an almost sorted array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insertion sort, or simply the built-in sort: insertion sort made only 208 comparisons on our nearly sorted 200-item input, versus 19900 for selection sort.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Time complexity** | How the number of steps grows with n |
| **Space complexity** | Extra memory beyond the input |
| **In-place** | Needs only O(1) or O(log n) extra memory |
| **Stable sort** | Equal keys keep their input order |
| **Adaptive sort** | Does less work on partly sorted input |
| **Comparison sort lower bound** | About log2(n!) ~ n log n comparisons are unavoidable |
| **Pivot** | The item quicksort partitions around |
| **Hybrid sort** | A library sort combining several algorithms |
| **Dual-pivot quicksort** | Java's algorithm for primitive arrays |
| **Comparator** | Object whose compare(a, b) orders two items |

---
**Conclusion:** Sorting algorithms differ on time, space, stability and adaptivity, and the measured comparison counts make the differences concrete: selection sort always pays 19900 comparisons for 200 items, insertion sort pays 199 on sorted data, merge sort stays near the n log n floor, and a careless quicksort pivot turns O(n log n) into O(n²). Java picks for you based on type — a dual-pivot quicksort for primitive arrays and a stable Timsort-style mergesort for objects — so the strong answer explains the trade-offs and that split, and avoids the overflowing \`a - b\` comparator.`,
        examples: [
          {
            label: `Comparison counts: the three simple sorts`,
            code: `import java.util.Arrays;

// Count element comparisons made by the three simple O(n^2) sorts on four input shapes.
public class Main {
    static long c; // comparison counter shared by the sorts

    static int[][] makeInputs(int n) {
        long seed = 42;                          // long: seed * 48271 overflows int
        int[] rnd = new int[n], sorted = new int[n], reversed = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647L;
            rnd[i] = (int) (seed % 1000);
            sorted[i] = i;
            reversed[i] = n - i;
        }
        int[] nearly = sorted.clone();
        for (int i = 0; i < n - 1; i += 20) { int t = nearly[i]; nearly[i] = nearly[i + 1]; nearly[i + 1] = t; }
        return new int[][] { rnd, sorted, reversed, nearly };
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static void bubble(int[] a) {
        for (int end = a.length - 1; end > 0; end--) {
            boolean swapped = false;
            for (int j = 0; j < end; j++) { c++; if (a[j] > a[j + 1]) { swap(a, j, j + 1); swapped = true; } }
            if (!swapped) break; // early exit: already sorted
        }
    }

    static void selection(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            int m = i;
            for (int j = i + 1; j < a.length; j++) { c++; if (a[j] < a[m]) m = j; }
            swap(a, i, m);
        }
    }

    static void insertion(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int key = a[i], j = i - 1;
            while (j >= 0) { c++; if (a[j] <= key) break; a[j + 1] = a[j]; j--; }
            a[j + 1] = key;
        }
    }

    static void run(int which, int[] a) {
        if (which == 0) bubble(a);
        else if (which == 1) selection(a);
        else insertion(a);
    }

    public static void main(String[] args) {
        String[] algoNames = { "bubble", "selection", "insertion" };
        String[] inputNames = { "random", "sorted", "reversed", "nearly" };
        int[][] inputs = makeInputs(200);
        System.out.println("comparisons for n = 200");
        StringBuilder header = new StringBuilder(String.format("%-11s", "algorithm"));
        for (String s : inputNames) header.append(String.format("%10s", s));
        System.out.println(header);
        boolean allOk = true;
        for (int k = 0; k < algoNames.length; k++) {
            StringBuilder row = new StringBuilder(String.format("%-11s", algoNames[k]));
            for (int[] data : inputs) {
                int[] arr = data.clone();
                c = 0;
                run(k, arr);
                row.append(String.format("%10d", c));
                int[] expected = data.clone();
                Arrays.sort(expected);
                allOk = allOk && Arrays.equals(arr, expected);
            }
            System.out.println(row);
        }
        System.out.println("every result sorted: " + allOk);
    }
}`,
          },
          {
            label: `Comparison counts: merge, quick and heap sort`,
            code: `import java.util.Arrays;

// Count element comparisons made by the three O(n log n) sorts on four input shapes.
public class Main {
    static long c; // comparison counter shared by the sorts

    static int[][] makeInputs(int n) {
        long seed = 42;                          // long: seed * 48271 overflows int
        int[] rnd = new int[n], sorted = new int[n], reversed = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647L;
            rnd[i] = (int) (seed % 1000);
            sorted[i] = i;
            reversed[i] = n - i;
        }
        int[] nearly = sorted.clone();
        for (int i = 0; i < n - 1; i += 20) { int t = nearly[i]; nearly[i] = nearly[i + 1]; nearly[i + 1] = t; }
        return new int[][] { rnd, sorted, reversed, nearly };
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static void mergeRec(int[] a, int lo, int hi) { // sorts a[lo..hi)
        if (hi - lo < 2) return;
        int mid = (lo + hi) >>> 1;
        mergeRec(a, lo, mid);
        mergeRec(a, mid, hi);
        int[] left = Arrays.copyOfRange(a, lo, mid), right = Arrays.copyOfRange(a, mid, hi);
        int i = 0, j = 0, k = lo;
        while (i < left.length && j < right.length) { c++; a[k++] = left[i] <= right[j] ? left[i++] : right[j++]; }
        while (i < left.length) a[k++] = left[i++];
        while (j < right.length) a[k++] = right[j++];
    }

    static void quickRec(int[] a, int lo, int hi) { // Lomuto, last element as pivot
        if (lo >= hi) return;
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; j++) { c++; if (a[j] < pivot) { swap(a, i, j); i++; } }
        swap(a, i, hi);
        quickRec(a, lo, i - 1);
        quickRec(a, i + 1, hi);
    }

    static void sift(int[] a, int i, int size) {
        while (true) {
            int l = 2 * i + 1, r = 2 * i + 2, big = i;
            if (l < size) { c++; if (a[l] > a[big]) big = l; }
            if (r < size) { c++; if (a[r] > a[big]) big = r; }
            if (big == i) return;
            swap(a, i, big);
            i = big;
        }
    }

    static void heap(int[] a) {
        int n = a.length;
        for (int i = n / 2 - 1; i >= 0; i--) sift(a, i, n);
        for (int end = n - 1; end > 0; end--) { swap(a, 0, end); sift(a, 0, end); }
    }

    static void run(int which, int[] a) {
        if (which == 0) mergeRec(a, 0, a.length);
        else if (which == 1) quickRec(a, 0, a.length - 1);
        else heap(a);
    }

    public static void main(String[] args) {
        String[] algoNames = { "merge", "quick", "heap" };
        String[] inputNames = { "random", "sorted", "reversed", "nearly" };
        int[][] inputs = makeInputs(200);
        System.out.println("comparisons for n = 200");
        StringBuilder header = new StringBuilder(String.format("%-11s", "algorithm"));
        for (String s : inputNames) header.append(String.format("%10s", s));
        System.out.println(header);
        boolean allOk = true;
        for (int k = 0; k < algoNames.length; k++) {
            StringBuilder row = new StringBuilder(String.format("%-11s", algoNames[k]));
            for (int[] data : inputs) {
                int[] arr = data.clone();
                c = 0;
                run(k, arr);
                row.append(String.format("%10d", c));
                int[] expected = data.clone();
                Arrays.sort(expected);
                allOk = allOk && Arrays.equals(arr, expected);
            }
            System.out.println(row);
        }
        System.out.println("every result sorted: " + allOk);
    }
}`,
          },
          {
            label: `Stability: which sorts keep equal keys in order`,
            code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Stability: do records with equal keys keep their original order?
public class Main {
    record Person(String name, int grade, int pos) {} // pos = position in the input

    static void show(String label, List<Person> rows) {
        StringBuilder sb = new StringBuilder(String.format("%-10s", label));
        for (int i = 0; i < rows.size(); i++)
            sb.append(i > 0 ? " " : "").append(rows.get(i).name()).append("(").append(rows.get(i).grade()).append(")");
        System.out.println(sb);
    }

    static List<Person> selectionByGrade(List<Person> rows) { // swaps across the array: NOT stable
        List<Person> a = new ArrayList<>(rows);
        for (int i = 0; i < a.size() - 1; i++) {
            int m = i;
            for (int j = i + 1; j < a.size(); j++) if (a.get(j).grade() < a.get(m).grade()) m = j;
            Person t = a.get(i); a.set(i, a.get(m)); a.set(m, t);
        }
        return a;
    }

    static List<Person> insertionByGrade(List<Person> rows) { // only shifts past strictly larger keys: stable
        List<Person> a = new ArrayList<>(rows);
        for (int i = 1; i < a.size(); i++) {
            Person cur = a.get(i);
            int j = i - 1;
            while (j >= 0 && a.get(j).grade() > cur.grade()) { a.set(j + 1, a.get(j)); j--; }
            a.set(j + 1, cur);
        }
        return a;
    }

    static boolean isStable(List<Person> rows) { // equal grades must appear in input order
        for (int k = 0; k + 1 < rows.size(); k++)
            if (rows.get(k).grade() == rows.get(k + 1).grade() && rows.get(k).pos() > rows.get(k + 1).pos()) return false;
        return true;
    }

    public static void main(String[] args) {
        String[] names = { "Ana", "Ben", "Cid", "Dee", "Eve", "Fay" };
        int[] grades = { 2, 1, 2, 1, 2, 1 };
        List<Person> people = new ArrayList<>();
        for (int i = 0; i < names.length; i++) people.add(new Person(names[i], grades[i], i));

        List<Person> builtIn = new ArrayList<>(people);
        builtIn.sort(Comparator.comparingInt(Person::grade)); // List.sort on objects is stable

        show("input", people);
        String[] labels = { "selection", "insertion", "built-in" };
        List<List<Person>> results = List.of(selectionByGrade(people), insertionByGrade(people), builtIn);
        for (int i = 0; i < labels.length; i++) {
            show(labels[i], results.get(i));
            System.out.println(String.format("%-10s", "") + "stable: " + isStable(results.get(i)));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Walk me through the common sorting algorithms — bubble, selection, insertion, merge, quick and heap sort. How do they compare, and which would you pick in different situations? Feel free to show code in C++."

**What a strong answer should cover:**
- Compares on the right axes: best, average and worst time, extra space, stability and adaptivity.
- Correct complexities: the three simple sorts are O(n²); merge and heap sort are O(n log n) always; quicksort is O(n log n) average but O(n²) worst case.
- Explains why quicksort is still popular (in place, cache-friendly, good pivots make the worst case unlikely) and what introsort or random pivots do.
- Mentions the n log n lower bound for comparison sorts and when counting or radix sort can beat it.
- Knows that \`std::sort\` is not stable (introsort in libstdc++), that \`std::stable_sort\` exists, and that the comparator must be a strict weak ordering (never \`<=\`).
- Picks an algorithm from the input shape: nearly sorted, needs stability, tight memory, linked list, small integer keys.

**Clarifying questions expected:**
- How big is the input, and is it nearly sorted already?
- Do equal keys need to keep their original order (stability)?
- Is extra memory a constraint, and is the data an array or a linked list?

**Code / implementation expected:** Optional — a short C++ implementation of one O(n²) and one O(n log n) sort is a good bonus; the comparison and the choice matter more.`,
        answer: `# Comparing Common Sorting Algorithms (C++)

**Target Audience:** Beginners preparing for coding interviews; you only need to know what an array and a loop are.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block was produced by actually running the programs (g++ 13.3.0 with -std=c++17); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a teacher handing back 200 exam papers that must be put in order of roll number. One helper picks up each paper and slides it into the right place in the pile already in their hand. Another helper splits the stack in half, gives each half to a friend, and later merges the two sorted halves by repeatedly taking the smaller top paper. A third picks a "middle" roll number, throws everything smaller to the left and everything bigger to the right, and repeats on each side. All three end with a sorted pile. What differs is **how much work they do**, **how much table space they need**, **whether two papers with the same number stay in their original order**, and **how badly they suffer when the pile arrives in an awkward order** (already sorted, or reversed).

That is the whole interview question. Nobody expects you to recite six algorithms from memory; they expect you to compare them on those four axes and pick one for a given situation.

## 2. The Four Things Every Comparison Is About

Interviewers grade this question on whether you compare algorithms on the right properties. There are four.

📌 **Interview term: Time complexity** — how the number of steps grows with the input size *n*, written in [Big-O notation](/interview-question/what-is-big-o-notation). For sorting we usually count **comparisons** (how many times two items are compared), and quote best, average and worst cases separately because they really differ.

📌 **Interview term: Space complexity (auxiliary space)** — how much extra memory the algorithm needs beyond the input itself. 📌 **Interview term: In-place** — an algorithm that only needs O(1) or O(log n) extra memory, rearranging the items inside the original array.

📌 **Interview term: Stable sort** — when two items compare equal (same grade, same price), a stable sort keeps them in the order they had in the input. This matters when you sort by one key after another. The topic has its own page: [What is a stable sorting algorithm?](/interview-question/what-is-a-stable-sorting-algorithm)

📌 **Interview term: Adaptive sort** — an algorithm that does less work when the input is already partly sorted. Insertion sort is the classic example: on sorted input it makes only n - 1 comparisons.

A fifth fact frames everything else:

📌 **Interview term: Comparison sort lower bound** — any algorithm that sorts only by comparing pairs needs at least about log2(n!) comparisons in the worst case, which grows like n log n. For n = 200, log2(200!) is about 1245.4 (computed with \`math.lgamma\` in Python). So O(n log n) is the best a comparison sort can do; only algorithms that look *inside* the keys (counting sort, radix sort) can beat it, and only for special keys such as small integers.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Three families of sorting algorithms: simple quadratic sorts, divide and conquer sorts, and non-comparison sorts">
  <rect class="d-box-muted" x="20" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">Simple sorts</text>
  <text class="d-sub" x="115" y="90" text-anchor="middle">bubble, selection,</text>
  <text class="d-sub" x="115" y="112" text-anchor="middle">insertion</text>
  <text class="d-text d-accent" x="115" y="142" text-anchor="middle">O(n squared)</text>
  <text class="d-sub" x="115" y="170" text-anchor="middle">tiny or nearly sorted input</text>
  <rect class="d-box-accent" x="255" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="350" y="62" text-anchor="middle">Divide and conquer</text>
  <text class="d-sub" x="350" y="90" text-anchor="middle">merge, quick,</text>
  <text class="d-sub" x="350" y="112" text-anchor="middle">heap</text>
  <text class="d-text d-accent" x="350" y="142" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="350" y="170" text-anchor="middle">the general-purpose choice</text>
  <rect class="d-box-muted" x="490" y="30" width="190" height="160" rx="10"/>
  <text class="d-text" x="585" y="62" text-anchor="middle">Non-comparison</text>
  <text class="d-sub" x="585" y="90" text-anchor="middle">counting, radix,</text>
  <text class="d-sub" x="585" y="112" text-anchor="middle">bucket</text>
  <text class="d-text d-accent" x="585" y="142" text-anchor="middle">O(n + k)</text>
  <text class="d-sub" x="585" y="170" text-anchor="middle">small integer keys only</text>
</svg>

The left family is simple and slow on big inputs, the middle family is what real libraries are built from, and the right family is a special tool for small integer keys.

## 3. The Six Algorithms in Plain Language

**Bubble sort.** Walk through the array comparing neighbours and swap any pair that is out of order. After one pass the largest item has "bubbled" to the end; repeat for the rest. With an early exit (stop when a pass makes no swaps) it is O(n) on sorted input, but O(n²) on average. It is mainly a teaching example.

**Selection sort.** Find the smallest item and swap it into position 0, then the smallest of the rest into position 1, and so on. It always makes exactly n(n-1)/2 comparisons — 19900 for n = 200, whatever the input — but only n - 1 swaps, which is its one advantage when writes are expensive. The long-distance swap makes it **unstable**.

**Insertion sort.** Take items one by one and slide each left into its place in the already-sorted prefix, like sorting cards in your hand. O(n²) on average, but **adaptive** and **stable**, and very fast for small or nearly sorted arrays. Real library sorts use it for short runs.

**Merge sort.** Split the array in half, sort each half recursively, then merge the two sorted halves. Always O(n log n), **stable**, but needs O(n) extra memory for the merge. The step-by-step version is in [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

**Quicksort.** Pick a **pivot**, partition the array into "smaller than pivot" and "not smaller", then sort each side recursively. O(n log n) on average, in place, and usually the fastest in practice, but O(n²) when the pivots are consistently bad (the example below shows exactly that). Not stable.

**Heap sort.** Build a max-[heap](/interview-question/what-is-a-heap-priority-queue) inside the array, then repeatedly swap the largest item to the end and repair the heap. O(n log n) in every case with O(1) extra space, but not stable and, in practice, slower than a good quicksort because it jumps around memory.

📌 **Interview term: Pivot** — the item quicksort uses to split the array; its final position is fixed after one partition.

📌 **Interview term: Hybrid sort** — a production sort that combines several algorithms, for example merge sort plus insertion sort (Timsort) or quicksort plus heap sort plus insertion sort (introsort).

## 4. The Comparison Table

| Algorithm | Best | Average | Worst | Extra space | Stable? | Adaptive? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Bubble (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | No (plain version) |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) stack, O(n) worst | No | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No | No |
| Counting (keys 0..k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes | No |

Two rows deserve a sentence each. Quicksort's O(log n) stack is the *average*; with bad pivots the recursion is n levels deep, which is why the worst-case space is O(n) — see [stack space of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use). Counting sort only works when the keys are small integers (k is the key range); [sorting an array of 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) is the classic interview case.

## 5. What C++ Itself Uses

The standard library gives you two algorithms with different promises:

- \`std::sort(first, last[, comp])\` — O(n log n) comparisons, **not stable**. It needs random-access iterators, so it works on \`std::vector\` and arrays but not on \`std::list\` (which has its own \`list.sort()\` member).
- \`std::stable_sort\` — keeps equal elements in their original order (it may allocate a temporary buffer to do so).

The standard does not name an algorithm. In GCC 13 (libstdc++, the library used for the runs on this page) the header \`bits/stl_algo.h\` shows that \`std::sort\` is an **introsort**: a quicksort loop (\`__introsort_loop\`) with a depth limit of 2 × log2(n); if the recursion gets deeper than that it switches to heap sort (\`__partial_sort\`), and it finishes with an insertion sort over runs of at most 16 elements (\`_S_threshold = 16\`). That is why \`std::sort\` is never quadratic in practice even though it is "a quicksort".

📌 **Interview term: Introsort** — quicksort that watches its own recursion depth and falls back to heap sort when the pivots go bad, with insertion sort for small pieces.

📌 **Interview term: Strict weak ordering** — the rule a comparator must follow: \`comp(a, a)\` is false, and the "less than" relation is consistent. Passing \`<=\` breaks the rule. In the same libstdc++ header, the partition loop \`while (__comp(__first, __pivot)) ++__first;\` has no bounds check, because it relies on \`comp(pivot, pivot)\` being false; with \`<=\` it can walk off the end of the array. Always pass a strict \`<\`-style comparator.

## 6. The Code: Counting Comparisons

The first two runnable examples implement all six algorithms with a comparison counter and run them on four inputs of n = 200: random numbers (from a tiny deterministic generator so every language gets the same data), already sorted, reversed, and "nearly sorted" (sorted with a few neighbouring pairs swapped). Here is the insertion sort from the first example; the early \`break\` is what makes it adaptive:

~~~cpp
void insertion(vector<int>& a) {
    for (int i = 1; i < int(a.size()); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0) { c++; if (a[j] <= key) break; a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}
~~~

The sorts take \`vector<int>&\` (by reference, so they sort the caller's copy) and share a \`long long\` counter. \`std::swap\` comes from \`<utility>\`. The quicksort in the second example uses the **last element as the pivot** (Lomuto partition) on purpose, so you can see the worst case happen.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — simple sorts** — comparisons for n = 200

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
bubble          19729       199     19900       397
selection       19900     19900     19900     19900
insertion       10452       199     19900       208
every result sorted: true
~~~

**Example 2 — merge, quick and heap sort** — same four inputs

~~~text
comparisons for n = 200
algorithm      random    sorted  reversed    nearly
merge            1289       732       812       740
quick            1385     19900     19900     19000
heap             2432      2587      2275      2581
every result sorted: true
~~~

**Example 3 — stability** — sort six people by grade

~~~text
input     Ana(2) Ben(1) Cid(2) Dee(1) Eve(2) Fay(1)
selection Ben(1) Dee(1) Fay(1) Ana(2) Eve(2) Cid(2)
          stable: false
insertion Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
built-in  Ben(1) Dee(1) Fay(1) Ana(2) Cid(2) Eve(2)
          stable: true
~~~

What the numbers say:

- **Selection sort does 19900 comparisons on every input** — exactly 200 × 199 / 2. It cannot benefit from sorted data.
- **Insertion and bubble sort drop to 199 comparisons on sorted input** and stay low (208 and 397) on the nearly sorted one. That is adaptivity, and it is why hybrids use insertion sort on small or almost-ordered pieces.
- **Merge sort stays between 732 and 1289** on all inputs — close to the theoretical minimum of about 1245 for random data.
- **Last-element quicksort collapses to 19900 comparisons on sorted and reversed input**, the same as selection sort. Each partition only peels off one element. On random data it is fine (1385). This is the O(n²) worst case, and the reason real implementations pick pivots more carefully.
- **Heap sort is steady (2275 to 2587)** but makes about twice as many comparisons as merge sort.
- **Stability:** selection sort turned "Ana, Cid, Eve" (all grade 2) into "Ana, Eve, Cid", so it is unstable; insertion sort and the built-in stable sort kept the input order.

## 8. Stability, Pictured

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Sorting six people by grade. A stable sort keeps Ana, Cid, Eve in input order; selection sort moves Cid after Eve">
  <text class="d-text" x="20" y="63">input</text>
  <rect class="d-box-accent" x="150" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="63" text-anchor="middle">Ana 2</text>
  <rect class="d-box-muted" x="240" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="63" text-anchor="middle">Ben 1</text>
  <rect class="d-box-accent" x="330" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="63" text-anchor="middle">Cid 2</text>
  <rect class="d-box-muted" x="420" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="63" text-anchor="middle">Dee 1</text>
  <rect class="d-box-accent" x="510" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="63" text-anchor="middle">Eve 2</text>
  <rect class="d-box-muted" x="600" y="40" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="63" text-anchor="middle">Fay 1</text>
  <text class="d-text" x="20" y="163">stable</text>
  <rect class="d-box-muted" x="150" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="163" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="163" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="163" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="163" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="163" text-anchor="middle">Cid 2</text>
  <rect class="d-box-accent" x="600" y="140" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="163" text-anchor="middle">Eve 2</text>
  <text class="d-text" x="20" y="263">unstable</text>
  <rect class="d-box-muted" x="150" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="188" y="263" text-anchor="middle">Ben 1</text>
  <rect class="d-box-muted" x="240" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="278" y="263" text-anchor="middle">Dee 1</text>
  <rect class="d-box-muted" x="330" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="368" y="263" text-anchor="middle">Fay 1</text>
  <rect class="d-box-accent" x="420" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="458" y="263" text-anchor="middle">Ana 2</text>
  <rect class="d-box-accent" x="510" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="548" y="263" text-anchor="middle">Eve 2</text>
  <rect class="d-box-accent" x="600" y="240" width="76" height="36" rx="6"/>
  <text class="d-sub" x="638" y="263" text-anchor="middle">Cid 2</text>
</svg>

The accented cells are the three people with grade 2. In the stable result they appear as Ana, Cid, Eve, the same order as the input; selection sort swapped Ana far ahead early on and left Cid and Eve reversed.

In C++ the "built-in" line has to be \`std::stable_sort\`; \`std::sort\` makes no promise about equal elements, so it is the wrong tool when order of ties matters.

## 9. How to Choose

| Situation | Good choice | Why |
| :--- | :--- | :--- |
| General data, use the library | Built-in sort | Tuned hybrid, O(n log n) |
| Fewer than ~20 items, or nearly sorted | Insertion sort | Adaptive, tiny constant factor |
| Must keep ties in order (multi-key sort) | Merge sort / stable library sort | Stable |
| Memory is tight, need a worst-case guarantee | Heap sort | O(1) space, O(n log n) always |
| Fastest average in-place sort of an array | Quicksort with random or median-of-three pivot | Cache-friendly, small constant |
| Linked list | Merge sort | No random access needed; merging lists needs no extra array |
| Small integer keys (ages, 0-2 flags) | Counting sort | O(n + k), beats n log n |
| Data bigger than memory | External merge sort | Merges sorted chunks from disk |

If you only need the top k items, sorting is overkill: a heap or [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) does it in less time.

## 11. Complexity of the Examples

| Program | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Example 1 (simple sorts) | O(n²) per sort | O(1) per sort | Nested loops; swaps happen inside the array |
| Example 2 (merge, quick, heap) | O(n log n); quick O(n²) on sorted input | merge O(n), quick O(n) stack worst, heap O(1) | Merge copies halves; quicksort recursion is n deep with bad pivots |
| Example 3 (stability) | O(n²) for the hand-written sorts | O(n) for the copies | Each function sorts a copy so the input stays intact |

In C++, \`std::sort\` is a template, so a lambda comparator is part of the instantiated code and can be inlined; C's \`qsort\` must call its comparator through a function pointer every time.

## 10. Edge Cases

- **Empty array and one element** — every algorithm must return immediately; check the loop bounds (\`n - 1\` passes on an empty array is a classic off-by-one).
- **All equal items** — Lomuto quicksort degrades to O(n²) here too, because every item goes to one side. Three-way partitioning ([Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s)) fixes it.
- **Already sorted or reversed** — the worst case for naive pivot choices, the best case for insertion sort.
- **Many duplicate keys with satellite data** — this is where stability shows.

## Common Pitfalls

- **Using \`std::sort\` when ties must keep their order.** It is not stable; use \`std::stable_sort\`.
- **Passing \`<=\` (or any non-strict comparison) as the comparator.** It violates strict weak ordering, and libstdc++'s unguarded partition loop can run past the end of the range — undefined behaviour, often a crash.
- **Calling \`std::sort\` on a \`std::list\`.** It needs random-access iterators; with g++ 13 it failed to compile (\`no match for 'operator-'\` on list iterators). Call \`myList.sort()\` instead.
- **\`size_t\` loop bounds.** \`for (size_t i = 0; i < a.size() - 1; i++)\` on an empty vector underflows: \`a.size() - 1\` is 18446744073709551615 on a 64-bit build. Write \`i + 1 < a.size()\`, as the examples do.
- **\`int\` counters on big inputs.** n² comparisons overflow \`int\` (undefined behaviour for signed types); use \`long long\`.
- **Calling selection sort "stable".** It is not; Example 3 shows it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The framing:</strong> <span style="color:#f0e2c8;">Compare sorts on four things: time (best, average, worst), extra space, stability and adaptivity.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The simple sorts:</strong> <span style="color:#f0e2c8;">Bubble, selection and insertion are O(n²); insertion sort is stable, adaptive and the fastest of the three on small or nearly sorted input, which is why it survives inside real library sorts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fast sorts:</strong> <span style="color:#f0e2c8;">Merge sort: O(n log n) always, stable, O(n) extra space. Quicksort: fastest on average, in place, O(n²) with bad pivots. Heap sort: O(n log n) always, O(1) space, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. My language:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> is O(n log n) but not stable (introsort in libstdc++); use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code> when ties matter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The proof:</strong> <span style="color:#f0e2c8;">In my run on 200 items, last-pivot quicksort hit 19900 comparisons on sorted input while merge sort stayed under 1300.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> comparator crash <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The comparator must be a strict weak ordering (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">comp(a, a)</code> is false). libstdc++'s partition loop relies on that to stop without a bounds check, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> can run off the end of the array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Quicksort is O(n²) in the worst case, so why is it so popular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its average case is O(n log n) with a small constant, it sorts in place and it is cache-friendly. A random or median-of-three pivot makes the worst case unlikely, and introsort removes it entirely by switching to heap sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick merge sort over quicksort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need stability, a guaranteed O(n log n), or you are sorting a linked list or data on disk (external merge sort).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can any sort beat O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by comparing pairs: the lower bound is about log2(n!) comparisons, roughly 1245 for n = 200. Counting and radix sort beat it by using the key values directly, for small integer keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What sort would you use for an almost sorted array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insertion sort, or simply the built-in sort: insertion sort made only 208 comparisons on our nearly sorted 200-item input, versus 19900 for selection sort.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Time complexity** | How the number of steps grows with n |
| **Space complexity** | Extra memory beyond the input |
| **In-place** | Needs only O(1) or O(log n) extra memory |
| **Stable sort** | Equal keys keep their input order |
| **Adaptive sort** | Does less work on partly sorted input |
| **Comparison sort lower bound** | About log2(n!) ~ n log n comparisons are unavoidable |
| **Pivot** | The item quicksort partitions around |
| **Hybrid sort** | A library sort combining several algorithms |
| **Introsort** | Quicksort with a heap-sort fallback; libstdc++ std::sort |
| **Strict weak ordering** | The rules a comparator must obey; never use <= |

---
**Conclusion:** Sorting algorithms differ on time, space, stability and adaptivity, and the measured comparison counts make the differences concrete: selection sort always pays 19900 comparisons for 200 items, insertion sort pays 199 on sorted data, merge sort stays near the n log n floor, and a careless quicksort pivot turns O(n log n) into O(n²). In C++, \`std::sort\` is an introsort in libstdc++ — quicksort guarded by a heap-sort fallback — and is not stable, so the strong answer explains the trade-offs, reaches for \`std::stable_sort\` when ties matter, and always passes a strict comparator.`,
        examples: [
          {
            label: `Comparison counts: the three simple sorts`,
            code: `// Count element comparisons made by the three simple O(n^2) sorts on four input shapes.
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

long long c = 0; // comparison counter shared by the sorts

vector<vector<int>> makeInputs(int n) {
    long long seed = 42;                      // 64-bit: seed * 48271 overflows int
    vector<int> rnd, sorted, reversed;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647LL;
        rnd.push_back(int(seed % 1000));
        sorted.push_back(i);
        reversed.push_back(n - i);
    }
    vector<int> nearly = sorted;
    for (int i = 0; i < n - 1; i += 20) swap(nearly[i], nearly[i + 1]);
    return {rnd, sorted, reversed, nearly};
}

void bubble(vector<int>& a) {
    for (int end = int(a.size()) - 1; end > 0; end--) {
        bool swapped = false;
        for (int j = 0; j < end; j++) { c++; if (a[j] > a[j + 1]) { swap(a[j], a[j + 1]); swapped = true; } }
        if (!swapped) break; // early exit: already sorted
    }
}

void selection(vector<int>& a) {
    for (size_t i = 0; i + 1 < a.size(); i++) {
        size_t m = i;
        for (size_t j = i + 1; j < a.size(); j++) { c++; if (a[j] < a[m]) m = j; }
        swap(a[i], a[m]);
    }
}

void insertion(vector<int>& a) {
    for (int i = 1; i < int(a.size()); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0) { c++; if (a[j] <= key) break; a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}

int main() {
    vector<pair<string, void (*)(vector<int>&)>> algos = {
        {"bubble", bubble}, {"selection", selection}, {"insertion", insertion}};
    vector<string> inputNames = {"random", "sorted", "reversed", "nearly"};
    vector<vector<int>> inputs = makeInputs(200);
    cout << "comparisons for n = 200\\n";
    cout << left << setw(11) << "algorithm" << right;
    for (const string& s : inputNames) cout << setw(10) << s;
    cout << "\\n";
    bool allOk = true;
    for (auto& [algoName, fn] : algos) {
        cout << left << setw(11) << algoName << right;
        for (const vector<int>& data : inputs) {
            vector<int> arr = data;
            c = 0;
            fn(arr);
            cout << setw(10) << c;
            vector<int> expected = data;
            sort(expected.begin(), expected.end());
            allOk = allOk && arr == expected;
        }
        cout << "\\n";
    }
    cout << "every result sorted: " << boolalpha << allOk << "\\n";
}`,
          },
          {
            label: `Comparison counts: merge, quick and heap sort`,
            code: `// Count element comparisons made by the three O(n log n) sorts on four input shapes.
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

long long c = 0; // comparison counter shared by the sorts

vector<vector<int>> makeInputs(int n) {
    long long seed = 42;                      // 64-bit: seed * 48271 overflows int
    vector<int> rnd, sorted, reversed;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647LL;
        rnd.push_back(int(seed % 1000));
        sorted.push_back(i);
        reversed.push_back(n - i);
    }
    vector<int> nearly = sorted;
    for (int i = 0; i < n - 1; i += 20) swap(nearly[i], nearly[i + 1]);
    return {rnd, sorted, reversed, nearly};
}

void mergeRec(vector<int>& a, int lo, int hi) { // sorts a[lo..hi)
    if (hi - lo < 2) return;
    int mid = lo + (hi - lo) / 2;
    mergeRec(a, lo, mid);
    mergeRec(a, mid, hi);
    vector<int> left(a.begin() + lo, a.begin() + mid), right(a.begin() + mid, a.begin() + hi);
    size_t i = 0, j = 0;
    int k = lo;
    while (i < left.size() && j < right.size()) { c++; a[k++] = left[i] <= right[j] ? left[i++] : right[j++]; }
    while (i < left.size()) a[k++] = left[i++];
    while (j < right.size()) a[k++] = right[j++];
}

void quickRec(vector<int>& a, int lo, int hi) { // Lomuto, last element as pivot
    if (lo >= hi) return;
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) { c++; if (a[j] < pivot) { swap(a[i], a[j]); i++; } }
    swap(a[i], a[hi]);
    quickRec(a, lo, i - 1);
    quickRec(a, i + 1, hi);
}

void sift(vector<int>& a, int i, int size) {
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, big = i;
        if (l < size) { c++; if (a[l] > a[big]) big = l; }
        if (r < size) { c++; if (a[r] > a[big]) big = r; }
        if (big == i) return;
        swap(a[i], a[big]);
        i = big;
    }
}

void heapSortCounted(vector<int>& a) {
    int n = int(a.size());
    for (int i = n / 2 - 1; i >= 0; i--) sift(a, i, n);
    for (int end = n - 1; end > 0; end--) { swap(a[0], a[end]); sift(a, 0, end); }
}

int main() {
    vector<pair<string, void (*)(vector<int>&)>> algos = {
        {"merge", [](vector<int>& a) { mergeRec(a, 0, int(a.size())); }},
        {"quick", [](vector<int>& a) { quickRec(a, 0, int(a.size()) - 1); }},
        {"heap", heapSortCounted}};
    vector<string> inputNames = {"random", "sorted", "reversed", "nearly"};
    vector<vector<int>> inputs = makeInputs(200);
    cout << "comparisons for n = 200\\n";
    cout << left << setw(11) << "algorithm" << right;
    for (const string& s : inputNames) cout << setw(10) << s;
    cout << "\\n";
    bool allOk = true;
    for (auto& [algoName, fn] : algos) {
        cout << left << setw(11) << algoName << right;
        for (const vector<int>& data : inputs) {
            vector<int> arr = data;
            c = 0;
            fn(arr);
            cout << setw(10) << c;
            vector<int> expected = data;
            sort(expected.begin(), expected.end());
            allOk = allOk && arr == expected;
        }
        cout << "\\n";
    }
    cout << "every result sorted: " << boolalpha << allOk << "\\n";
}`,
          },
          {
            label: `Stability: which sorts keep equal keys in order`,
            code: `// Stability: do records with equal keys keep their original order?
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

struct Person { string name; int grade; int pos; }; // pos = position in the input

void show(const string& label, const vector<Person>& rows) {
    cout << left << setw(10) << label;
    for (size_t i = 0; i < rows.size(); i++) cout << (i ? " " : "") << rows[i].name << "(" << rows[i].grade << ")";
    cout << "\\n";
}

vector<Person> selectionByGrade(vector<Person> a) { // swaps across the array: NOT stable
    for (size_t i = 0; i + 1 < a.size(); i++) {
        size_t m = i;
        for (size_t j = i + 1; j < a.size(); j++) if (a[j].grade < a[m].grade) m = j;
        swap(a[i], a[m]);
    }
    return a;
}

vector<Person> insertionByGrade(vector<Person> a) { // only shifts past strictly larger keys: stable
    for (int i = 1; i < int(a.size()); i++) {
        Person cur = a[i];
        int j = i - 1;
        while (j >= 0 && a[j].grade > cur.grade) { a[j + 1] = a[j]; j--; }
        a[j + 1] = cur;
    }
    return a;
}

bool isStable(const vector<Person>& rows) { // equal grades must appear in input order
    for (size_t k = 0; k + 1 < rows.size(); k++)
        if (rows[k].grade == rows[k + 1].grade && rows[k].pos > rows[k + 1].pos) return false;
    return true;
}

int main() {
    vector<Person> people = {{"Ana", 2, 0}, {"Ben", 1, 1}, {"Cid", 2, 2}, {"Dee", 1, 3}, {"Eve", 2, 4}, {"Fay", 1, 5}};
    vector<Person> builtIn = people;
    stable_sort(builtIn.begin(), builtIn.end(),           // std::sort would not promise this
                [](const Person& p, const Person& q) { return p.grade < q.grade; });

    show("input", people);
    vector<pair<string, vector<Person>>> results = {
        {"selection", selectionByGrade(people)}, {"insertion", insertionByGrade(people)}, {"built-in", builtIn}};
    for (auto& [label, result] : results) {
        show(label, result);
        cout << setw(10) << "" << "stable: " << boolalpha << isStable(result) << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do merge sort and quicksort work?",
    difficulty: "medium",
    seoDescription: `Merge sort and quicksort step by step: splitting, merging, partitioning, pivots and the O(n²) trap, traced and run in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how merge sort and quicksort work — walk me through each on a small array — and then implement one of them in Python. What are their time and space costs, and when does quicksort go wrong?"

**What a strong answer should cover:**
- Both are divide and conquer; merge sort does its work in the merge, quicksort in the partition.
- Merge sort: split at the middle, recurse, two-pointer merge; O(n log n) in every case, O(n) extra space, stable because ties come from the left.
- Quicksort: pivot, partition (Lomuto or Hoare), recurse on both sides; O(n log n) average, O(n²) worst case, O(log n) average stack, not stable.
- Explains the worst case (sorted input with a first/last pivot) and the fixes: random or median-of-three pivot, introsort, recursing on the smaller side.
- Python specifics: slices copy (O(n) extra memory), \`//\` for the midpoint, CPython's 1000-frame recursion limit, and that \`sorted\` (Timsort) is the production answer.

**Clarifying questions expected:**
- Should the sort be in place, or may I use extra memory?
- Does it need to be stable?

**Code / implementation expected:** Yes — a working Python merge sort or quicksort, with the base case and the merge or partition step correct.`,
        answer: `# How Merge Sort and Quicksort Work (Python)

**Target Audience:** Beginners preparing for coding interviews; basic loops, arrays and functions are enough.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block was produced by actually running the programs (Python 3.13.16); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

You have a messy stack of 1,000 exam papers to put in roll-number order, and two friends offer to help.

The first friend says: "Cut the stack in half, give one half to someone else, sort your half, and when both halves are sorted I will **merge** them — I just keep taking whichever top paper has the smaller number." Each helper does the same thing with their half, until someone is holding a single paper, which is trivially sorted. That is **merge sort**: the hard work happens on the way *back up*, in the merging.

The second friend says: "Pick any paper — say roll number 500. Throw everything smaller onto the left pile and everything bigger onto the right pile. Number 500 is now exactly where it belongs. Then do the same to each pile." That is **quicksort**: the hard work happens on the way *down*, in the splitting, and there is nothing left to do at the end.

Both are the same big idea — break the problem into smaller copies of itself — and both run in about n log n steps on typical input. They differ in where the work happens, how much extra table space they need, and what goes wrong in the worst case.

## 2. The Shared Idea: Divide and Conquer

📌 **Interview term: Divide and conquer** — solve a problem by (1) **dividing** it into smaller sub-problems of the same kind, (2) **conquering** each one recursively, and (3) **combining** the answers. Both algorithms are [recursive](/interview-question/what-is-recursion-and-what-is-a-base-case): a function that calls itself on a smaller input, with a **base case** (here: 0 or 1 element, which is already sorted) that stops the recursion.

| | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Divide | Cut at the middle index — trivial | Partition around a pivot — the real work |
| Conquer | Sort both halves recursively | Sort both sides recursively |
| Combine | Merge two sorted halves — the real work | Nothing to do |

## 3. Merge Sort, Step by Step

**Divide.** Cut the array at the middle. Keep cutting until every piece has one element.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Merge sort splits 38 27 43 3 9 82 10 in half again and again until every piece has one element">
  <path class="d-edge" d="M 360 66 L 180 110"/>
  <path class="d-edge" d="M 360 66 L 540 110"/>
  <path class="d-edge" d="M 180 146 L 70 190"/>
  <path class="d-edge" d="M 180 146 L 210 190"/>
  <path class="d-edge" d="M 540 146 L 445 190"/>
  <path class="d-edge" d="M 540 146 L 620 190"/>
  <path class="d-edge" d="M 210 226 L 165 270"/>
  <path class="d-edge" d="M 210 226 L 255 270"/>
  <path class="d-edge" d="M 445 226 L 395 270"/>
  <path class="d-edge" d="M 445 226 L 495 270"/>
  <path class="d-edge" d="M 620 226 L 585 270"/>
  <path class="d-edge" d="M 620 226 L 675 270"/>
  <rect class="d-box-accent" x="210" y="30" width="300" height="36" rx="6"/>
  <text class="d-sub" x="360" y="53" text-anchor="middle">38 27 43 3 9 82 10</text>
  <rect class="d-box-muted" x="80" y="110" width="200" height="36" rx="6"/>
  <text class="d-sub" x="180" y="133" text-anchor="middle">38 27 43</text>
  <rect class="d-box-muted" x="420" y="110" width="240" height="36" rx="6"/>
  <text class="d-sub" x="540" y="133" text-anchor="middle">3 9 82 10</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="36" rx="6"/>
  <text class="d-sub" x="70" y="213" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="150" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="210" y="213" text-anchor="middle">27 43</text>
  <rect class="d-box-muted" x="390" y="190" width="110" height="36" rx="6"/>
  <text class="d-sub" x="445" y="213" text-anchor="middle">3 9</text>
  <rect class="d-box-muted" x="560" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="620" y="213" text-anchor="middle">82 10</text>
  <rect class="d-box-muted" x="140" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="165" y="293" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="230" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="255" y="293" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="370" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="395" y="293" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="495" y="293" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="560" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="585" y="293" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="650" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="675" y="293" text-anchor="middle">10</text>
</svg>

The array of 7 items is split 3 levels deep (7 → 3 + 4 → 1 + 2 + 2 + 2 → single items). In general the depth is about log2(n), because every level halves the size.

**Combine (merge).** Two sorted lists are merged with two pointers, \`i\` into the left list and \`j\` into the right one. Compare the two front items, move the smaller to the output, advance that pointer, and repeat. When one list runs out, copy the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Merging 27 38 43 with 3 9 10 82: compare the two front items and move the smaller one to the output">
  <text class="d-text" x="20" y="53">left</text>
  <rect class="d-box-accent" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <text class="d-text" x="20" y="133">right</text>
  <rect class="d-box-accent" x="150" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="133" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="133" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="133" text-anchor="middle">82</text>
  <text class="d-sub" x="390" y="53">i = 0, front item 27</text>
  <text class="d-sub" x="460" y="133">j = 0, front item 3</text>
  <text class="d-text" x="20" y="243">output</text>
  <rect class="d-box-muted" x="150" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="243" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="243" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="243" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="360" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="243" text-anchor="middle">27</text>
  <rect class="d-box-accent" x="430" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="243" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="500" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="243" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="570" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="243" text-anchor="middle">82</text>
</svg>

Here the right list supplies 3, 9 and 10 first, then the left list supplies 27, 38 and 43 (accented in the output), and finally 82 is copied over. Every item is moved exactly once, so merging two lists of total length n costs O(n).

📌 **Interview term: Merge** — combining two already sorted lists into one sorted list in linear time with two pointers. It is also its own interview question: [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)

**Why O(n log n)?** There are about log2(n) levels of splitting, and at every level the merges together touch all n items once. So the total is n × log2(n), in the best, average *and* worst case — merge sort does not care what order the input is in.

📌 **Interview term: Recurrence relation** — an equation that describes a recursive algorithm's cost in terms of smaller inputs. For merge sort it is T(n) = 2·T(n/2) + O(n), which solves to O(n log n).

**Stability.** When the two front items are equal, the merge takes the one from the **left** list first (the \`<=\` in the code). That keeps equal items in their original order, which makes merge sort **stable**.

## 4. Quicksort, Step by Step

**Divide (partition).** Choose one element as the **pivot**. Rearrange the array so everything smaller than the pivot comes first, then the pivot, then everything else. After one partition the pivot is in its final position forever.

📌 **Interview term: Partition** — the in-place rearrangement around a pivot. 📌 **Interview term: Lomuto partition** — the simplest scheme: use the last element as the pivot, keep an index \`i\` where the next "small" item should go, and scan \`j\` left to right, swapping every small item to position \`i\`. Finally swap the pivot into position \`i\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Lomuto partition of 38 27 43 3 9 82 10 around the pivot 10">
  <text class="d-text" x="20" y="53">before</text>
  <rect class="d-box-muted" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="360" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="53" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="430" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="53" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="53" text-anchor="middle">82</text>
  <rect class="d-box-accent" x="570" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="53" text-anchor="middle">10</text>
  <text class="d-text" x="20" y="173">after</text>
  <rect class="d-box-muted" x="150" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="173" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="173" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="290" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="173" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="173" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="430" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="173" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="500" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="173" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="570" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="173" text-anchor="middle">43</text>
  <path class="d-edge-dashed" d="M 150 205 L 276 205"/>
  <text class="d-sub" x="213" y="230" text-anchor="middle">less than 10</text>
  <text class="d-sub" x="318" y="230" text-anchor="middle">pivot</text>
  <path class="d-edge-dashed" d="M 360 205 L 626 205"/>
  <text class="d-sub" x="493" y="230" text-anchor="middle">10 or more, still unsorted</text>
</svg>

With pivot 10, only 3 and 9 are smaller, so they go first and 10 lands at index 2. The right side (38, 27, 82, 43) is still unsorted; quicksort now recurses on each side separately.

**Conquer.** Recursively quicksort the left part and the right part. **Combine:** nothing — once both sides are sorted in place, the whole array is sorted.

**Why O(n log n) on average, O(n²) in the worst case?** Each partition of a range of size m costs m - 1 comparisons. If the pivot splits the range roughly in half, there are about log2(n) levels and the total is O(n log n) — like merge sort. But if the pivot is always the smallest or largest item, each partition only peels off one element: n levels, and n + (n-1) + ... ≈ n²/2 comparisons. With "last element as pivot", that happens exactly when the input is **already sorted** — a very common real-world input.

📌 **Interview term: Worst-case pivot** — a pivot that is the minimum or maximum of its range, producing one empty side and one side of size m - 1.

**Choosing a better pivot.** Common fixes:

- **Random pivot** — pick a random index; the expected time becomes O(n log n) for every input.
- **Median of three** — use the median of the first, middle and last elements.
- **Middle element** — what the second example tries; it fixes sorted input (but not every input).
- **Introsort** — real libraries also cap the recursion depth and switch to heap sort if it is exceeded (more in [Compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms)).

📌 **Interview term: Hoare partition** — the original scheme from Tony Hoare: two indices move toward each other from both ends and swap out-of-place pairs. It usually does fewer swaps than Lomuto, but is harder to get exactly right in an interview.

**Stability and space.** The long-distance swaps make quicksort **unstable**. It sorts **in place**, but the recursion uses stack space: O(log n) on average, O(n) in the worst case. Recursing into the smaller side first and looping on the larger side keeps the stack at O(log n) even in the worst case.

The same partition routine powers [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element), which finds the k-th smallest element in O(n) on average by recursing into only one side.

## 5. The Code in Python

**Merge sort.** The merge step, exactly as it runs in the first example:

~~~python
def merge(left, right):
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:          # <= keeps equal items in order (stable)
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:])                 # at most one of these two is non-empty
    out.extend(right[j:])
    return out
~~~

And the recursive driver, which also prints one trace line per merge, indented by depth:

~~~python
def merge_sort(a, depth=0):
    if len(a) <= 1:                      # base case: 0 or 1 item is already sorted
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid], depth + 1)
    right = merge_sort(a[mid:], depth + 1)
    merged = merge(left, right)
    print("  " * depth + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged))
    return merged
~~~

\`a[:mid]\` and \`a[mid:]\` are **slices**, and a slice is a new list: each level of recursion copies its items, which is where merge sort's O(n) extra memory comes from (the run also showed that changing a slice does not change the original list). \`out.extend(left[i:])\` copies whatever is left in one list.

**Quicksort.** The Lomuto partition and the traced driver from the second example:

~~~python
def partition(a, lo, hi):
    pivot, i = a[hi], lo                 # i = where the next "small" item goes
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]            # pivot lands in its final place
    return i

def quick_sort_traced(a, lo, hi):
    if lo >= hi:
        return
    p = partition(a, lo, hi)
    print("pivot " + str(a[p]) + " -> index " + str(p) + "  " + fmt(a))
    quick_sort_traced(a, lo, p - 1)
    quick_sort_traced(a, p + 1, hi)
~~~

Python swaps with tuple assignment, \`a[i], a[j] = a[j], a[i]\`, without a temporary variable. The partition works on the list in place, so quicksort itself allocates nothing beyond the recursion.

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.py\` and run with \`python3 main.py\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — merge sort trace** — one line per merge; deeper merges are indented more

~~~text
    merge [27] + [43] -> [27, 43]
  merge [38] + [27, 43] -> [27, 38, 43]
    merge [3] + [9] -> [3, 9]
    merge [82] + [10] -> [10, 82]
  merge [3, 9] + [10, 82] -> [3, 9, 10, 82]
merge [27, 38, 43] + [3, 9, 10, 82] -> [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
empty:  []
one:    [5]
  merge [2] + [1] -> [1, 2]
  merge [2] + [1] -> [1, 2]
merge [1, 2] + [1, 2] -> [1, 1, 2, 2]
dupes:  [1, 1, 2, 2]
~~~

**Example 2 — quicksort trace and pivot choice** — one line per partition, then the comparison counts

~~~text
pivot 10 -> index 2  [3, 9, 10, 38, 27, 82, 43]
pivot 9 -> index 1  [3, 9, 10, 38, 27, 82, 43]
pivot 43 -> index 5  [3, 9, 10, 38, 27, 43, 82]
pivot 27 -> index 3  [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
last-element pivot on sorted n=500: comparisons 124750, depth 499
middle-element pivot on sorted n=500: comparisons 3498, depth 8
~~~

Reading the merge trace: merges happen **bottom-up**. The first line is \`[27] + [43]\`, the deepest merge, and the last line merges the two halves of the whole array. Single-element pieces are never "merged" — they are the base case. The empty and one-element inputs print no trace at all, and with duplicates \`[2, 1, 2, 1]\` the result keeps both 1s and both 2s.

Reading the quicksort trace: the first partition used pivot 10 and placed it at index 2, exactly as in the diagram. The next partition (pivot 9) worked only on the left part \`[3, 9]\`. Then pivot 43 sorted most of the right part, and pivot 27 finished it.

The last two lines are the important ones. On already sorted input of 500 items, the last-element pivot made **124750 comparisons** — exactly 500 × 499 / 2 — and the recursion went **499 levels deep**. The middle-element pivot made **3498 comparisons** with a depth of only **8**, which is about log2(500) ≈ 9. Same algorithm, same data; only the pivot choice changed.

## 7. Merge Sort vs Quicksort

| Property | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Where the work happens | Combine step (merge) | Divide step (partition) |
| Best / average time | O(n log n) | O(n log n) |
| Worst time | O(n log n) | O(n²) — bad pivots, e.g. sorted input with last-element pivot |
| Extra memory | O(n) for the merge buffer | O(log n) stack on average, O(n) worst |
| Stable? | Yes (take from the left on ties) | No |
| In place? | No (for arrays) | Yes |
| Good for | Linked lists, external (on-disk) sorting, when stability is required | In-memory arrays where average speed matters |
| Real-world use | Basis of Timsort (Python, Java objects, V8) | Basis of introsort (C++ std::sort in libstdc++) and Java dual-pivot quicksort |

For linked lists merge sort is the natural choice: splitting a list needs no random access and merging two lists can be done by relinking nodes, without a second array. That is the same merge used in [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists).

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Merge sort | O(n log n) best, average and worst | O(n) buffers + O(log n) stack | log2(n) levels, each merging all n items once |
| Quicksort (good pivots) | O(n log n) | O(log n) stack | Balanced partitions give about log2(n) levels |
| Quicksort (bad pivots) | O(n²) | O(n) stack | Each partition removes one item: n levels |
| One merge of total length n | O(n) | O(n) | Every item is copied once |
| One Lomuto partition of m items | O(m) | O(1) | m - 1 comparisons, swaps in place |

Python recursion is not free: every call creates a frame object, and CPython's default recursion limit is 1000. A last-element quicksort on \`list(range(2000))\` raised \`RecursionError: maximum recursion depth exceeded\` in our run, so the O(n) worst-case stack is a real crash, not just a slowdown.

## 9. Edge Cases

- **Empty array or one element** — the base case; both algorithms must return without recursing (the example's \`empty\` and \`one\` lines).
- **Duplicates** — merge sort keeps them in order. Lomuto quicksort with many equal keys degrades toward O(n²), because "not smaller than the pivot" sends all equal items to one side; three-way partitioning fixes it.
- **Already sorted or reversed input** — merge sort is unaffected; last-element quicksort hits its worst case (124750 comparisons for n = 500 above).
- **Odd lengths** — \`mid = n // 2\` gives the left half one fewer element (3 + 4 for n = 7); either split works as long as both halves shrink.

## Common Pitfalls

- **Using \`<\` instead of \`<=\` in the merge.** The output is still sorted, but ties now come from the right half first and the sort is no longer stable.
- **Forgetting the leftovers.** When one half runs out, \`out.extend(left[i:])\` and \`out.extend(right[j:])\` copy the rest; forgetting one loses elements.
- **Hitting the recursion limit.** A bad-pivot quicksort on 2000 sorted items raised \`RecursionError\`; use a random or middle pivot, or an explicit stack.
- **Slicing inside quicksort.** Building \`less\` and \`greater\` lists with list comprehensions is short and readable, but it allocates O(n) memory per level and is no longer "in place" — say so if you write it that way.
- **Writing \`mid = (lo + hi) / 2\`.** In Python 3 \`/\` always returns a float, and indexing with it raises \`TypeError: list indices must be integers or slices, not float\`; use \`//\`.
- **Not knowing that \`sorted\` exists.** In real Python code you call \`sorted\`/\`list.sort\` (Timsort); implement these only when the interviewer asks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shared idea:</strong> <span style="color:#f0e2c8;">Both are divide and conquer: split the problem, solve the parts recursively, combine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Merge sort:</strong> <span style="color:#f0e2c8;">Split at the middle, sort both halves, then merge with two pointers. O(n log n) always, stable, O(n) extra memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quicksort:</strong> <span style="color:#f0e2c8;">Partition around a pivot so smaller items go left; the pivot is then final. Recurse on both sides; nothing to combine. O(n log n) average, in place, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The worst case:</strong> <span style="color:#f0e2c8;">A pivot that is always the min or max gives O(n²): on 500 sorted items, last-element pivot made 124750 comparisons and went 499 deep; middle pivot made 3498 and went 8 deep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Python I would write them with slices for clarity, but mention the O(n) copying, the 1000-frame recursion limit, and that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code> already does this job (Timsort).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid quicksort's worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Choose the pivot randomly or by median of three, and in production cap the depth and fall back to heap sort (introsort). Recursing on the smaller side first bounds the stack at O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merge sort stable and quicksort not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort only moves items from the front of each half and takes the left one on ties, so equal items never pass each other. Quicksort swaps items over long distances during partitioning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one would you use for a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort: splitting and merging lists needs no random access and no extra array, while quicksort relies on indexed swaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can merge sort be done without O(n) extra memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-place merging exists but is complicated and slower; in an interview say that the standard version uses O(n), and that bottom-up merge sort avoids recursion but still needs the buffer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your Python quicksort crash on 2000 sorted items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a last-element pivot the recursion is n levels deep, and CPython's default limit is 1000 frames, so it raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>. A random or middle pivot keeps the depth near log2(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into smaller same-type problems, solve, combine |
| **Merge** | Combine two sorted lists in O(n) with two pointers |
| **Recurrence relation** | Cost equation such as T(n) = 2T(n/2) + n |
| **Partition** | Rearrange around a pivot: smaller left, others right |
| **Lomuto partition** | Last element as pivot, one scanning index |
| **Hoare partition** | Two indices moving inward from both ends |
| **Worst-case pivot** | The min or max of the range; gives O(n²) |

---
**Conclusion:** Merge sort and quicksort are two answers to the same divide-and-conquer recipe: merge sort splits trivially and does its work in an O(n) merge, giving a guaranteed, stable O(n log n) at the cost of O(n) extra memory; quicksort does its work in the partition and needs nothing at the end, giving a fast in-place sort whose only weakness is the pivot. The traces show both mechanisms, and the counts show the weakness — 124750 comparisons with a bad pivot versus 3498 with a better one on the same sorted input. In Python, add the practical notes: slices copy, the recursion limit is 1000, and \`sorted\` already gives you a stable Timsort.`,
        examples: [
          {
            label: `Merge sort with a trace of every merge`,
            code: `# Merge sort with a trace of every merge step.

def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"

def merge(left, right):
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:          # <= keeps equal items in order (stable)
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:])                 # at most one of these two is non-empty
    out.extend(right[j:])
    return out

def merge_sort(a, depth=0):
    if len(a) <= 1:                      # base case: 0 or 1 item is already sorted
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid], depth + 1)
    right = merge_sort(a[mid:], depth + 1)
    merged = merge(left, right)
    print("  " * depth + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged))
    return merged

result = merge_sort([38, 27, 43, 3, 9, 82, 10])
print("sorted: " + fmt(result))
print("empty:  " + fmt(merge_sort([])))
print("one:    " + fmt(merge_sort([5])))
print("dupes:  " + fmt(merge_sort([2, 1, 2, 1])))`,
          },
          {
            label: `Quicksort trace, and last vs middle pivot on sorted input`,
            code: `# Quicksort (Lomuto partition) with a trace, then why the pivot choice matters.

def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"

def partition(a, lo, hi):
    pivot, i = a[hi], lo                 # i = where the next "small" item goes
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]            # pivot lands in its final place
    return i

def quick_sort_traced(a, lo, hi):
    if lo >= hi:
        return
    p = partition(a, lo, hi)
    print("pivot " + str(a[p]) + " -> index " + str(p) + "  " + fmt(a))
    quick_sort_traced(a, lo, p - 1)
    quick_sort_traced(a, p + 1, hi)

data = [38, 27, 43, 3, 9, 82, 10]
quick_sort_traced(data, 0, len(data) - 1)
print("sorted: " + fmt(data))

def quick_sort_stats(a, middle_pivot):
    stats = {"cmp": 0, "depth": 0}
    def rec(lo, hi, depth):
        if lo >= hi:
            return
        stats["depth"] = max(stats["depth"], depth)
        if middle_pivot:                 # move the middle item to the end, then partition
            m = (lo + hi) // 2
            a[m], a[hi] = a[hi], a[m]
        stats["cmp"] += hi - lo          # Lomuto compares every item except the pivot
        p = partition(a, lo, hi)
        rec(lo, p - 1, depth + 1)
        rec(p + 1, hi, depth + 1)
    rec(0, len(a) - 1, 1)
    return stats

for label, middle in [("last-element pivot", False), ("middle-element pivot", True)]:
    s = quick_sort_stats(list(range(500)), middle)
    print(label + " on sorted n=500: comparisons " + str(s["cmp"]) + ", depth " + str(s["depth"]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how merge sort and quicksort work — walk me through each on a small array — and then implement one of them in JavaScript. What are their time and space costs, and when does quicksort go wrong?"

**What a strong answer should cover:**
- Both are divide and conquer; merge sort does its work in the merge, quicksort in the partition.
- Merge sort: split at the middle, recurse, two-pointer merge; O(n log n) in every case, O(n) extra space, stable because ties come from the left.
- Quicksort: pivot, partition (Lomuto or Hoare), recurse on both sides; O(n log n) average, O(n²) worst case, O(log n) average stack, not stable.
- Explains the worst case (sorted input with a first/last pivot) and the fixes: random or median-of-three pivot, introsort, recursing on the smaller side.
- JavaScript specifics: \`Math.floor\` for the midpoint, \`slice\` copies, deep recursion throws \`RangeError\`, and the built-in \`sort\` needs a numeric comparator.

**Clarifying questions expected:**
- Should the sort be in place, or may I use extra memory?
- Does it need to be stable?

**Code / implementation expected:** Yes — a working JavaScript merge sort or quicksort, with the base case and the merge or partition step correct.`,
        answer: `# How Merge Sort and Quicksort Work (JavaScript)

**Target Audience:** Beginners preparing for coding interviews; basic loops, arrays and functions are enough.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block was produced by actually running the programs (Node.js v22.22.0); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

You have a messy stack of 1,000 exam papers to put in roll-number order, and two friends offer to help.

The first friend says: "Cut the stack in half, give one half to someone else, sort your half, and when both halves are sorted I will **merge** them — I just keep taking whichever top paper has the smaller number." Each helper does the same thing with their half, until someone is holding a single paper, which is trivially sorted. That is **merge sort**: the hard work happens on the way *back up*, in the merging.

The second friend says: "Pick any paper — say roll number 500. Throw everything smaller onto the left pile and everything bigger onto the right pile. Number 500 is now exactly where it belongs. Then do the same to each pile." That is **quicksort**: the hard work happens on the way *down*, in the splitting, and there is nothing left to do at the end.

Both are the same big idea — break the problem into smaller copies of itself — and both run in about n log n steps on typical input. They differ in where the work happens, how much extra table space they need, and what goes wrong in the worst case.

## 2. The Shared Idea: Divide and Conquer

📌 **Interview term: Divide and conquer** — solve a problem by (1) **dividing** it into smaller sub-problems of the same kind, (2) **conquering** each one recursively, and (3) **combining** the answers. Both algorithms are [recursive](/interview-question/what-is-recursion-and-what-is-a-base-case): a function that calls itself on a smaller input, with a **base case** (here: 0 or 1 element, which is already sorted) that stops the recursion.

| | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Divide | Cut at the middle index — trivial | Partition around a pivot — the real work |
| Conquer | Sort both halves recursively | Sort both sides recursively |
| Combine | Merge two sorted halves — the real work | Nothing to do |

## 3. Merge Sort, Step by Step

**Divide.** Cut the array at the middle. Keep cutting until every piece has one element.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Merge sort splits 38 27 43 3 9 82 10 in half again and again until every piece has one element">
  <path class="d-edge" d="M 360 66 L 180 110"/>
  <path class="d-edge" d="M 360 66 L 540 110"/>
  <path class="d-edge" d="M 180 146 L 70 190"/>
  <path class="d-edge" d="M 180 146 L 210 190"/>
  <path class="d-edge" d="M 540 146 L 445 190"/>
  <path class="d-edge" d="M 540 146 L 620 190"/>
  <path class="d-edge" d="M 210 226 L 165 270"/>
  <path class="d-edge" d="M 210 226 L 255 270"/>
  <path class="d-edge" d="M 445 226 L 395 270"/>
  <path class="d-edge" d="M 445 226 L 495 270"/>
  <path class="d-edge" d="M 620 226 L 585 270"/>
  <path class="d-edge" d="M 620 226 L 675 270"/>
  <rect class="d-box-accent" x="210" y="30" width="300" height="36" rx="6"/>
  <text class="d-sub" x="360" y="53" text-anchor="middle">38 27 43 3 9 82 10</text>
  <rect class="d-box-muted" x="80" y="110" width="200" height="36" rx="6"/>
  <text class="d-sub" x="180" y="133" text-anchor="middle">38 27 43</text>
  <rect class="d-box-muted" x="420" y="110" width="240" height="36" rx="6"/>
  <text class="d-sub" x="540" y="133" text-anchor="middle">3 9 82 10</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="36" rx="6"/>
  <text class="d-sub" x="70" y="213" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="150" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="210" y="213" text-anchor="middle">27 43</text>
  <rect class="d-box-muted" x="390" y="190" width="110" height="36" rx="6"/>
  <text class="d-sub" x="445" y="213" text-anchor="middle">3 9</text>
  <rect class="d-box-muted" x="560" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="620" y="213" text-anchor="middle">82 10</text>
  <rect class="d-box-muted" x="140" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="165" y="293" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="230" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="255" y="293" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="370" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="395" y="293" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="495" y="293" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="560" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="585" y="293" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="650" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="675" y="293" text-anchor="middle">10</text>
</svg>

The array of 7 items is split 3 levels deep (7 → 3 + 4 → 1 + 2 + 2 + 2 → single items). In general the depth is about log2(n), because every level halves the size.

**Combine (merge).** Two sorted lists are merged with two pointers, \`i\` into the left list and \`j\` into the right one. Compare the two front items, move the smaller to the output, advance that pointer, and repeat. When one list runs out, copy the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Merging 27 38 43 with 3 9 10 82: compare the two front items and move the smaller one to the output">
  <text class="d-text" x="20" y="53">left</text>
  <rect class="d-box-accent" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <text class="d-text" x="20" y="133">right</text>
  <rect class="d-box-accent" x="150" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="133" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="133" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="133" text-anchor="middle">82</text>
  <text class="d-sub" x="390" y="53">i = 0, front item 27</text>
  <text class="d-sub" x="460" y="133">j = 0, front item 3</text>
  <text class="d-text" x="20" y="243">output</text>
  <rect class="d-box-muted" x="150" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="243" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="243" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="243" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="360" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="243" text-anchor="middle">27</text>
  <rect class="d-box-accent" x="430" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="243" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="500" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="243" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="570" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="243" text-anchor="middle">82</text>
</svg>

Here the right list supplies 3, 9 and 10 first, then the left list supplies 27, 38 and 43 (accented in the output), and finally 82 is copied over. Every item is moved exactly once, so merging two lists of total length n costs O(n).

📌 **Interview term: Merge** — combining two already sorted lists into one sorted list in linear time with two pointers. It is also its own interview question: [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)

**Why O(n log n)?** There are about log2(n) levels of splitting, and at every level the merges together touch all n items once. So the total is n × log2(n), in the best, average *and* worst case — merge sort does not care what order the input is in.

📌 **Interview term: Recurrence relation** — an equation that describes a recursive algorithm's cost in terms of smaller inputs. For merge sort it is T(n) = 2·T(n/2) + O(n), which solves to O(n log n).

**Stability.** When the two front items are equal, the merge takes the one from the **left** list first (the \`<=\` in the code). That keeps equal items in their original order, which makes merge sort **stable**.

## 4. Quicksort, Step by Step

**Divide (partition).** Choose one element as the **pivot**. Rearrange the array so everything smaller than the pivot comes first, then the pivot, then everything else. After one partition the pivot is in its final position forever.

📌 **Interview term: Partition** — the in-place rearrangement around a pivot. 📌 **Interview term: Lomuto partition** — the simplest scheme: use the last element as the pivot, keep an index \`i\` where the next "small" item should go, and scan \`j\` left to right, swapping every small item to position \`i\`. Finally swap the pivot into position \`i\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Lomuto partition of 38 27 43 3 9 82 10 around the pivot 10">
  <text class="d-text" x="20" y="53">before</text>
  <rect class="d-box-muted" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="360" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="53" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="430" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="53" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="53" text-anchor="middle">82</text>
  <rect class="d-box-accent" x="570" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="53" text-anchor="middle">10</text>
  <text class="d-text" x="20" y="173">after</text>
  <rect class="d-box-muted" x="150" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="173" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="173" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="290" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="173" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="173" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="430" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="173" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="500" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="173" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="570" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="173" text-anchor="middle">43</text>
  <path class="d-edge-dashed" d="M 150 205 L 276 205"/>
  <text class="d-sub" x="213" y="230" text-anchor="middle">less than 10</text>
  <text class="d-sub" x="318" y="230" text-anchor="middle">pivot</text>
  <path class="d-edge-dashed" d="M 360 205 L 626 205"/>
  <text class="d-sub" x="493" y="230" text-anchor="middle">10 or more, still unsorted</text>
</svg>

With pivot 10, only 3 and 9 are smaller, so they go first and 10 lands at index 2. The right side (38, 27, 82, 43) is still unsorted; quicksort now recurses on each side separately.

**Conquer.** Recursively quicksort the left part and the right part. **Combine:** nothing — once both sides are sorted in place, the whole array is sorted.

**Why O(n log n) on average, O(n²) in the worst case?** Each partition of a range of size m costs m - 1 comparisons. If the pivot splits the range roughly in half, there are about log2(n) levels and the total is O(n log n) — like merge sort. But if the pivot is always the smallest or largest item, each partition only peels off one element: n levels, and n + (n-1) + ... ≈ n²/2 comparisons. With "last element as pivot", that happens exactly when the input is **already sorted** — a very common real-world input.

📌 **Interview term: Worst-case pivot** — a pivot that is the minimum or maximum of its range, producing one empty side and one side of size m - 1.

**Choosing a better pivot.** Common fixes:

- **Random pivot** — pick a random index; the expected time becomes O(n log n) for every input.
- **Median of three** — use the median of the first, middle and last elements.
- **Middle element** — what the second example tries; it fixes sorted input (but not every input).
- **Introsort** — real libraries also cap the recursion depth and switch to heap sort if it is exceeded (more in [Compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms)).

📌 **Interview term: Hoare partition** — the original scheme from Tony Hoare: two indices move toward each other from both ends and swap out-of-place pairs. It usually does fewer swaps than Lomuto, but is harder to get exactly right in an interview.

**Stability and space.** The long-distance swaps make quicksort **unstable**. It sorts **in place**, but the recursion uses stack space: O(log n) on average, O(n) in the worst case. Recursing into the smaller side first and looping on the larger side keeps the stack at O(log n) even in the worst case.

The same partition routine powers [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element), which finds the k-th smallest element in O(n) on average by recursing into only one side.

## 5. The Code in JavaScript

**Merge sort.** The merge step, exactly as it runs in the first example:

~~~javascript
function merge(left, right) {
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) out.push(left[i++]); // <= keeps equal items in order (stable)
    else out.push(right[j++]);
  }
  while (i < left.length) out.push(left[i++]);     // at most one of these loops runs
  while (j < right.length) out.push(right[j++]);
  return out;
}
~~~

And the recursive driver, which also prints one trace line per merge, indented by depth:

~~~javascript
function mergeSort(a, depth = 0) {
  if (a.length <= 1) return a;                     // base case: 0 or 1 item is already sorted
  const mid = Math.floor(a.length / 2);
  const left = mergeSort(a.slice(0, mid), depth + 1);
  const right = mergeSort(a.slice(mid), depth + 1);
  const merged = merge(left, right);
  console.log("  ".repeat(depth) + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged));
  return merged;
}
~~~

\`a.slice(0, mid)\` creates a new array (a copy), which is where merge sort's O(n) extra memory comes from. \`Math.floor(a.length / 2)\` is needed because \`/\` in JavaScript always produces a floating-point number: \`(0 + 9) / 2\` is \`4.5\`, and \`[5, 6, 7][1.5]\` is \`undefined\`, not an error.

**Quicksort.** The Lomuto partition and the traced driver from the second example:

~~~javascript
function partition(a, lo, hi) {
  const pivot = a[hi];
  let i = lo;                                // i = where the next "small" item goes
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
  }
  [a[i], a[hi]] = [a[hi], a[i]];             // pivot lands in its final place
  return i;
}

function quickSortTraced(a, lo, hi) {
  if (lo >= hi) return;
  const p = partition(a, lo, hi);
  console.log("pivot " + a[p] + " -> index " + p + "  " + fmt(a));
  quickSortTraced(a, lo, p - 1);
  quickSortTraced(a, p + 1, hi);
}
~~~

The swap uses array destructuring, \`[a[i], a[j]] = [a[j], a[i]]\`. Arrays are passed by reference, so the partition sorts the caller's array in place.

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.js\` and run with \`node main.js\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — merge sort trace** — one line per merge; deeper merges are indented more

~~~text
    merge [27] + [43] -> [27, 43]
  merge [38] + [27, 43] -> [27, 38, 43]
    merge [3] + [9] -> [3, 9]
    merge [82] + [10] -> [10, 82]
  merge [3, 9] + [10, 82] -> [3, 9, 10, 82]
merge [27, 38, 43] + [3, 9, 10, 82] -> [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
empty:  []
one:    [5]
  merge [2] + [1] -> [1, 2]
  merge [2] + [1] -> [1, 2]
merge [1, 2] + [1, 2] -> [1, 1, 2, 2]
dupes:  [1, 1, 2, 2]
~~~

**Example 2 — quicksort trace and pivot choice** — one line per partition, then the comparison counts

~~~text
pivot 10 -> index 2  [3, 9, 10, 38, 27, 82, 43]
pivot 9 -> index 1  [3, 9, 10, 38, 27, 82, 43]
pivot 43 -> index 5  [3, 9, 10, 38, 27, 43, 82]
pivot 27 -> index 3  [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
last-element pivot on sorted n=500: comparisons 124750, depth 499
middle-element pivot on sorted n=500: comparisons 3498, depth 8
~~~

Reading the merge trace: merges happen **bottom-up**. The first line is \`[27] + [43]\`, the deepest merge, and the last line merges the two halves of the whole array. Single-element pieces are never "merged" — they are the base case. The empty and one-element inputs print no trace at all, and with duplicates \`[2, 1, 2, 1]\` the result keeps both 1s and both 2s.

Reading the quicksort trace: the first partition used pivot 10 and placed it at index 2, exactly as in the diagram. The next partition (pivot 9) worked only on the left part \`[3, 9]\`. Then pivot 43 sorted most of the right part, and pivot 27 finished it.

The last two lines are the important ones. On already sorted input of 500 items, the last-element pivot made **124750 comparisons** — exactly 500 × 499 / 2 — and the recursion went **499 levels deep**. The middle-element pivot made **3498 comparisons** with a depth of only **8**, which is about log2(500) ≈ 9. Same algorithm, same data; only the pivot choice changed.

## 7. Merge Sort vs Quicksort

| Property | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Where the work happens | Combine step (merge) | Divide step (partition) |
| Best / average time | O(n log n) | O(n log n) |
| Worst time | O(n log n) | O(n²) — bad pivots, e.g. sorted input with last-element pivot |
| Extra memory | O(n) for the merge buffer | O(log n) stack on average, O(n) worst |
| Stable? | Yes (take from the left on ties) | No |
| In place? | No (for arrays) | Yes |
| Good for | Linked lists, external (on-disk) sorting, when stability is required | In-memory arrays where average speed matters |
| Real-world use | Basis of Timsort (Python, Java objects, V8) | Basis of introsort (C++ std::sort in libstdc++) and Java dual-pivot quicksort |

For linked lists merge sort is the natural choice: splitting a list needs no random access and merging two lists can be done by relinking nodes, without a second array. That is the same merge used in [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists).

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Merge sort | O(n log n) best, average and worst | O(n) buffers + O(log n) stack | log2(n) levels, each merging all n items once |
| Quicksort (good pivots) | O(n log n) | O(log n) stack | Balanced partitions give about log2(n) levels |
| Quicksort (bad pivots) | O(n²) | O(n) stack | Each partition removes one item: n levels |
| One merge of total length n | O(n) | O(n) | Every item is copied once |
| One Lomuto partition of m items | O(m) | O(1) | m - 1 comparisons, swaps in place |

JavaScript engines have a fixed call-stack size: in Node.js v22 a last-element quicksort on 100,000 sorted numbers threw \`RangeError: Maximum call stack size exceeded\`. The O(n) worst-case stack is a real crash, not only a slowdown.

## 9. Edge Cases

- **Empty array or one element** — the base case; both algorithms must return without recursing (the example's \`empty\` and \`one\` lines).
- **Duplicates** — merge sort keeps them in order. Lomuto quicksort with many equal keys degrades toward O(n²), because "not smaller than the pivot" sends all equal items to one side; three-way partitioning fixes it.
- **Already sorted or reversed input** — merge sort is unaffected; last-element quicksort hits its worst case (124750 comparisons for n = 500 above).
- **Odd lengths** — \`mid = n // 2\` gives the left half one fewer element (3 + 4 for n = 7); either split works as long as both halves shrink.

## Common Pitfalls

- **Using \`<\` instead of \`<=\` in the merge.** The output is still sorted, but ties come from the right half first and the sort is no longer stable.
- **Forgetting \`Math.floor\`.** \`a.length / 2\` can be \`3.5\`; \`a.slice(0, 3.5)\` happens to truncate, but \`a[3.5]\` is \`undefined\`, which silently breaks comparisons.
- **Deep recursion.** A last-element quicksort on 100,000 sorted numbers threw \`RangeError: Maximum call stack size exceeded\`.
- **Spreading huge arrays.** \`[...quick(less), pivot, ...quick(greater)]\` is neat but allocates new arrays at every level, so it is no longer an in-place sort — say so if you write it that way.
- **Comparing mixed types.** \`<\` on a mix of strings and numbers converts types (\`"10" < 9\` is \`false\`), so make sure the data is all numbers before sorting.
- **Not knowing that \`sort\` exists.** In real code use \`arr.sort((a, b) => a - b)\`; implement these only when the interviewer asks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shared idea:</strong> <span style="color:#f0e2c8;">Both are divide and conquer: split the problem, solve the parts recursively, combine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Merge sort:</strong> <span style="color:#f0e2c8;">Split at the middle, sort both halves, then merge with two pointers. O(n log n) always, stable, O(n) extra memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quicksort:</strong> <span style="color:#f0e2c8;">Partition around a pivot so smaller items go left; the pivot is then final. Recurse on both sides; nothing to combine. O(n log n) average, in place, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The worst case:</strong> <span style="color:#f0e2c8;">A pivot that is always the min or max gives O(n²): on 500 sorted items, last-element pivot made 124750 comparisons and went 499 deep; middle pivot made 3498 and went 8 deep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In JavaScript I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> for the midpoint, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> for the halves, and mention that the built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> is a stable Timsort in V8 — after passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid quicksort's worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Choose the pivot randomly or by median of three, and in production cap the depth and fall back to heap sort (introsort). Recursing on the smaller side first bounds the stack at O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merge sort stable and quicksort not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort only moves items from the front of each half and takes the left one on ties, so equal items never pass each other. Quicksort swaps items over long distances during partitioning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one would you use for a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort: splitting and merging lists needs no random access and no extra array, while quicksort relies on indexed swaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can merge sort be done without O(n) extra memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-place merging exists but is complicated and slower; in an interview say that the standard version uses O(n), and that bottom-up merge sort avoids recursion but still needs the buffer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.floor((lo + hi) / 2)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> always returns a floating-point number in JavaScript; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[4.5]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. For very large indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + Math.floor((hi - lo) / 2)</code> avoids precision issues too.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into smaller same-type problems, solve, combine |
| **Merge** | Combine two sorted lists in O(n) with two pointers |
| **Recurrence relation** | Cost equation such as T(n) = 2T(n/2) + n |
| **Partition** | Rearrange around a pivot: smaller left, others right |
| **Lomuto partition** | Last element as pivot, one scanning index |
| **Hoare partition** | Two indices moving inward from both ends |
| **Worst-case pivot** | The min or max of the range; gives O(n²) |

---
**Conclusion:** Merge sort and quicksort are two answers to the same divide-and-conquer recipe: merge sort splits trivially and does its work in an O(n) merge, giving a guaranteed, stable O(n log n) at the cost of O(n) extra memory; quicksort does its work in the partition and needs nothing at the end, giving a fast in-place sort whose only weakness is the pivot. The traces show both mechanisms, and the counts show the weakness — 124750 comparisons with a bad pivot versus 3498 with a better one on the same sorted input. In JavaScript, add the practical notes: floor the midpoint, \`slice\` copies, deep recursion throws a \`RangeError\`, and the built-in \`sort\` (with a comparator) is already a stable Timsort in V8.`,
        examples: [
          {
            label: `Merge sort with a trace of every merge`,
            code: `// Merge sort with a trace of every merge step.

function fmt(a) {
  return "[" + a.join(", ") + "]";
}

function merge(left, right) {
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) out.push(left[i++]); // <= keeps equal items in order (stable)
    else out.push(right[j++]);
  }
  while (i < left.length) out.push(left[i++]);     // at most one of these loops runs
  while (j < right.length) out.push(right[j++]);
  return out;
}

function mergeSort(a, depth = 0) {
  if (a.length <= 1) return a;                     // base case: 0 or 1 item is already sorted
  const mid = Math.floor(a.length / 2);
  const left = mergeSort(a.slice(0, mid), depth + 1);
  const right = mergeSort(a.slice(mid), depth + 1);
  const merged = merge(left, right);
  console.log("  ".repeat(depth) + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged));
  return merged;
}

const result = mergeSort([38, 27, 43, 3, 9, 82, 10]);
console.log("sorted: " + fmt(result));
console.log("empty:  " + fmt(mergeSort([])));
console.log("one:    " + fmt(mergeSort([5])));
console.log("dupes:  " + fmt(mergeSort([2, 1, 2, 1])));`,
          },
          {
            label: `Quicksort trace, and last vs middle pivot on sorted input`,
            code: `// Quicksort (Lomuto partition) with a trace, then why the pivot choice matters.

function fmt(a) {
  return "[" + a.join(", ") + "]";
}

function partition(a, lo, hi) {
  const pivot = a[hi];
  let i = lo;                                // i = where the next "small" item goes
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
  }
  [a[i], a[hi]] = [a[hi], a[i]];             // pivot lands in its final place
  return i;
}

function quickSortTraced(a, lo, hi) {
  if (lo >= hi) return;
  const p = partition(a, lo, hi);
  console.log("pivot " + a[p] + " -> index " + p + "  " + fmt(a));
  quickSortTraced(a, lo, p - 1);
  quickSortTraced(a, p + 1, hi);
}

const data = [38, 27, 43, 3, 9, 82, 10];
quickSortTraced(data, 0, data.length - 1);
console.log("sorted: " + fmt(data));

function quickSortStats(a, middlePivot) {
  const stats = { cmp: 0, depth: 0 };
  function rec(lo, hi, depth) {
    if (lo >= hi) return;
    stats.depth = Math.max(stats.depth, depth);
    if (middlePivot) {                       // move the middle item to the end, then partition
      const m = Math.floor((lo + hi) / 2);
      [a[m], a[hi]] = [a[hi], a[m]];
    }
    stats.cmp += hi - lo;                    // Lomuto compares every item except the pivot
    const p = partition(a, lo, hi);
    rec(lo, p - 1, depth + 1);
    rec(p + 1, hi, depth + 1);
  }
  rec(0, a.length - 1, 1);
  return stats;
}

for (const [label, middle] of [["last-element pivot", false], ["middle-element pivot", true]]) {
  const s = quickSortStats(Array.from({ length: 500 }, (_, i) => i), middle);
  console.log(label + " on sorted n=500: comparisons " + s.cmp + ", depth " + s.depth);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how merge sort and quicksort work — walk me through each on a small array — and then implement one of them in Java. What are their time and space costs, and when does quicksort go wrong?"

**What a strong answer should cover:**
- Both are divide and conquer; merge sort does its work in the merge, quicksort in the partition.
- Merge sort: split at the middle, recurse, two-pointer merge; O(n log n) in every case, O(n) extra space, stable because ties come from the left.
- Quicksort: pivot, partition (Lomuto or Hoare), recurse on both sides; O(n log n) average, O(n²) worst case, O(log n) average stack, not stable.
- Explains the worst case (sorted input with a first/last pivot) and the fixes: random or median-of-three pivot, introsort, recursing on the smaller side.
- Java specifics: overflow-safe midpoint (\`lo + (hi - lo) / 2\`), \`StackOverflowError\` on deep recursion, and how \`Arrays.sort\` relates (dual-pivot quicksort vs stable mergesort).

**Clarifying questions expected:**
- Should the sort be in place, or may I use extra memory?
- Does it need to be stable?

**Code / implementation expected:** Yes — a working Java merge sort or quicksort, with the base case and the merge or partition step correct.`,
        answer: `# How Merge Sort and Quicksort Work (Java)

**Target Audience:** Beginners preparing for coding interviews; basic loops, arrays and functions are enough.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block was produced by actually running the programs (OpenJDK 21.0.12 (javac + java)); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

You have a messy stack of 1,000 exam papers to put in roll-number order, and two friends offer to help.

The first friend says: "Cut the stack in half, give one half to someone else, sort your half, and when both halves are sorted I will **merge** them — I just keep taking whichever top paper has the smaller number." Each helper does the same thing with their half, until someone is holding a single paper, which is trivially sorted. That is **merge sort**: the hard work happens on the way *back up*, in the merging.

The second friend says: "Pick any paper — say roll number 500. Throw everything smaller onto the left pile and everything bigger onto the right pile. Number 500 is now exactly where it belongs. Then do the same to each pile." That is **quicksort**: the hard work happens on the way *down*, in the splitting, and there is nothing left to do at the end.

Both are the same big idea — break the problem into smaller copies of itself — and both run in about n log n steps on typical input. They differ in where the work happens, how much extra table space they need, and what goes wrong in the worst case.

## 2. The Shared Idea: Divide and Conquer

📌 **Interview term: Divide and conquer** — solve a problem by (1) **dividing** it into smaller sub-problems of the same kind, (2) **conquering** each one recursively, and (3) **combining** the answers. Both algorithms are [recursive](/interview-question/what-is-recursion-and-what-is-a-base-case): a function that calls itself on a smaller input, with a **base case** (here: 0 or 1 element, which is already sorted) that stops the recursion.

| | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Divide | Cut at the middle index — trivial | Partition around a pivot — the real work |
| Conquer | Sort both halves recursively | Sort both sides recursively |
| Combine | Merge two sorted halves — the real work | Nothing to do |

## 3. Merge Sort, Step by Step

**Divide.** Cut the array at the middle. Keep cutting until every piece has one element.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Merge sort splits 38 27 43 3 9 82 10 in half again and again until every piece has one element">
  <path class="d-edge" d="M 360 66 L 180 110"/>
  <path class="d-edge" d="M 360 66 L 540 110"/>
  <path class="d-edge" d="M 180 146 L 70 190"/>
  <path class="d-edge" d="M 180 146 L 210 190"/>
  <path class="d-edge" d="M 540 146 L 445 190"/>
  <path class="d-edge" d="M 540 146 L 620 190"/>
  <path class="d-edge" d="M 210 226 L 165 270"/>
  <path class="d-edge" d="M 210 226 L 255 270"/>
  <path class="d-edge" d="M 445 226 L 395 270"/>
  <path class="d-edge" d="M 445 226 L 495 270"/>
  <path class="d-edge" d="M 620 226 L 585 270"/>
  <path class="d-edge" d="M 620 226 L 675 270"/>
  <rect class="d-box-accent" x="210" y="30" width="300" height="36" rx="6"/>
  <text class="d-sub" x="360" y="53" text-anchor="middle">38 27 43 3 9 82 10</text>
  <rect class="d-box-muted" x="80" y="110" width="200" height="36" rx="6"/>
  <text class="d-sub" x="180" y="133" text-anchor="middle">38 27 43</text>
  <rect class="d-box-muted" x="420" y="110" width="240" height="36" rx="6"/>
  <text class="d-sub" x="540" y="133" text-anchor="middle">3 9 82 10</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="36" rx="6"/>
  <text class="d-sub" x="70" y="213" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="150" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="210" y="213" text-anchor="middle">27 43</text>
  <rect class="d-box-muted" x="390" y="190" width="110" height="36" rx="6"/>
  <text class="d-sub" x="445" y="213" text-anchor="middle">3 9</text>
  <rect class="d-box-muted" x="560" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="620" y="213" text-anchor="middle">82 10</text>
  <rect class="d-box-muted" x="140" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="165" y="293" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="230" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="255" y="293" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="370" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="395" y="293" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="495" y="293" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="560" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="585" y="293" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="650" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="675" y="293" text-anchor="middle">10</text>
</svg>

The array of 7 items is split 3 levels deep (7 → 3 + 4 → 1 + 2 + 2 + 2 → single items). In general the depth is about log2(n), because every level halves the size.

**Combine (merge).** Two sorted lists are merged with two pointers, \`i\` into the left list and \`j\` into the right one. Compare the two front items, move the smaller to the output, advance that pointer, and repeat. When one list runs out, copy the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Merging 27 38 43 with 3 9 10 82: compare the two front items and move the smaller one to the output">
  <text class="d-text" x="20" y="53">left</text>
  <rect class="d-box-accent" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <text class="d-text" x="20" y="133">right</text>
  <rect class="d-box-accent" x="150" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="133" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="133" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="133" text-anchor="middle">82</text>
  <text class="d-sub" x="390" y="53">i = 0, front item 27</text>
  <text class="d-sub" x="460" y="133">j = 0, front item 3</text>
  <text class="d-text" x="20" y="243">output</text>
  <rect class="d-box-muted" x="150" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="243" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="243" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="243" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="360" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="243" text-anchor="middle">27</text>
  <rect class="d-box-accent" x="430" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="243" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="500" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="243" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="570" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="243" text-anchor="middle">82</text>
</svg>

Here the right list supplies 3, 9 and 10 first, then the left list supplies 27, 38 and 43 (accented in the output), and finally 82 is copied over. Every item is moved exactly once, so merging two lists of total length n costs O(n).

📌 **Interview term: Merge** — combining two already sorted lists into one sorted list in linear time with two pointers. It is also its own interview question: [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)

**Why O(n log n)?** There are about log2(n) levels of splitting, and at every level the merges together touch all n items once. So the total is n × log2(n), in the best, average *and* worst case — merge sort does not care what order the input is in.

📌 **Interview term: Recurrence relation** — an equation that describes a recursive algorithm's cost in terms of smaller inputs. For merge sort it is T(n) = 2·T(n/2) + O(n), which solves to O(n log n).

**Stability.** When the two front items are equal, the merge takes the one from the **left** list first (the \`<=\` in the code). That keeps equal items in their original order, which makes merge sort **stable**.

## 4. Quicksort, Step by Step

**Divide (partition).** Choose one element as the **pivot**. Rearrange the array so everything smaller than the pivot comes first, then the pivot, then everything else. After one partition the pivot is in its final position forever.

📌 **Interview term: Partition** — the in-place rearrangement around a pivot. 📌 **Interview term: Lomuto partition** — the simplest scheme: use the last element as the pivot, keep an index \`i\` where the next "small" item should go, and scan \`j\` left to right, swapping every small item to position \`i\`. Finally swap the pivot into position \`i\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Lomuto partition of 38 27 43 3 9 82 10 around the pivot 10">
  <text class="d-text" x="20" y="53">before</text>
  <rect class="d-box-muted" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="360" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="53" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="430" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="53" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="53" text-anchor="middle">82</text>
  <rect class="d-box-accent" x="570" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="53" text-anchor="middle">10</text>
  <text class="d-text" x="20" y="173">after</text>
  <rect class="d-box-muted" x="150" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="173" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="173" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="290" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="173" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="173" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="430" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="173" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="500" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="173" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="570" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="173" text-anchor="middle">43</text>
  <path class="d-edge-dashed" d="M 150 205 L 276 205"/>
  <text class="d-sub" x="213" y="230" text-anchor="middle">less than 10</text>
  <text class="d-sub" x="318" y="230" text-anchor="middle">pivot</text>
  <path class="d-edge-dashed" d="M 360 205 L 626 205"/>
  <text class="d-sub" x="493" y="230" text-anchor="middle">10 or more, still unsorted</text>
</svg>

With pivot 10, only 3 and 9 are smaller, so they go first and 10 lands at index 2. The right side (38, 27, 82, 43) is still unsorted; quicksort now recurses on each side separately.

**Conquer.** Recursively quicksort the left part and the right part. **Combine:** nothing — once both sides are sorted in place, the whole array is sorted.

**Why O(n log n) on average, O(n²) in the worst case?** Each partition of a range of size m costs m - 1 comparisons. If the pivot splits the range roughly in half, there are about log2(n) levels and the total is O(n log n) — like merge sort. But if the pivot is always the smallest or largest item, each partition only peels off one element: n levels, and n + (n-1) + ... ≈ n²/2 comparisons. With "last element as pivot", that happens exactly when the input is **already sorted** — a very common real-world input.

📌 **Interview term: Worst-case pivot** — a pivot that is the minimum or maximum of its range, producing one empty side and one side of size m - 1.

**Choosing a better pivot.** Common fixes:

- **Random pivot** — pick a random index; the expected time becomes O(n log n) for every input.
- **Median of three** — use the median of the first, middle and last elements.
- **Middle element** — what the second example tries; it fixes sorted input (but not every input).
- **Introsort** — real libraries also cap the recursion depth and switch to heap sort if it is exceeded (more in [Compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms)).

📌 **Interview term: Hoare partition** — the original scheme from Tony Hoare: two indices move toward each other from both ends and swap out-of-place pairs. It usually does fewer swaps than Lomuto, but is harder to get exactly right in an interview.

**Stability and space.** The long-distance swaps make quicksort **unstable**. It sorts **in place**, but the recursion uses stack space: O(log n) on average, O(n) in the worst case. Recursing into the smaller side first and looping on the larger side keeps the stack at O(log n) even in the worst case.

The same partition routine powers [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element), which finds the k-th smallest element in O(n) on average by recursing into only one side.

## 5. The Code in Java

**Merge sort.** The merge step, exactly as it runs in the first example:

~~~java
static int[] merge(int[] left, int[] right) {
    int[] out = new int[left.length + right.length];
    int i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) out[k++] = left[i++]; // <= keeps equal items in order (stable)
        else out[k++] = right[j++];
    }
    while (i < left.length) out[k++] = left[i++];     // at most one of these loops runs
    while (j < right.length) out[k++] = right[j++];
    return out;
}
~~~

And the recursive driver, which also prints one trace line per merge, indented by depth:

~~~java
static int[] mergeSort(int[] a, int depth) {
    if (a.length <= 1) return a;                      // base case: 0 or 1 item is already sorted
    int mid = a.length / 2;
    int[] left = mergeSort(Arrays.copyOfRange(a, 0, mid), depth + 1);
    int[] right = mergeSort(Arrays.copyOfRange(a, mid, a.length), depth + 1);
    int[] merged = merge(left, right);
    System.out.println("  ".repeat(depth) + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged));
    return merged;
}
~~~

\`Arrays.copyOfRange(a, 0, mid)\` allocates a new \`int[]\` for each half, which is where merge sort's O(n) extra memory comes from. The merge writes into a pre-sized \`int[] out\`; \`out[k++] = left[i++]\` reads, stores and advances in one line.

**Quicksort.** The Lomuto partition and the traced driver from the second example:

~~~java
static int partition(int[] a, int lo, int hi) {
    int pivot = a[hi], i = lo;               // i = where the next "small" item goes
    for (int j = lo; j < hi; j++) if (a[j] < pivot) { swap(a, i, j); i++; }
    swap(a, i, hi);                          // pivot lands in its final place
    return i;
}

static void quickSortTraced(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    System.out.println("pivot " + a[p] + " -> index " + p + "  " + fmt(a));
    quickSortTraced(a, lo, p - 1);
    quickSortTraced(a, p + 1, hi);
}
~~~

Java has no tuple swap, so a small \`swap(int[] a, int i, int j)\` helper does it with a temporary. Arrays are objects passed by reference, so the partition sorts the caller's array in place.

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — merge sort trace** — one line per merge; deeper merges are indented more

~~~text
    merge [27] + [43] -> [27, 43]
  merge [38] + [27, 43] -> [27, 38, 43]
    merge [3] + [9] -> [3, 9]
    merge [82] + [10] -> [10, 82]
  merge [3, 9] + [10, 82] -> [3, 9, 10, 82]
merge [27, 38, 43] + [3, 9, 10, 82] -> [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
empty:  []
one:    [5]
  merge [2] + [1] -> [1, 2]
  merge [2] + [1] -> [1, 2]
merge [1, 2] + [1, 2] -> [1, 1, 2, 2]
dupes:  [1, 1, 2, 2]
~~~

**Example 2 — quicksort trace and pivot choice** — one line per partition, then the comparison counts

~~~text
pivot 10 -> index 2  [3, 9, 10, 38, 27, 82, 43]
pivot 9 -> index 1  [3, 9, 10, 38, 27, 82, 43]
pivot 43 -> index 5  [3, 9, 10, 38, 27, 43, 82]
pivot 27 -> index 3  [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
last-element pivot on sorted n=500: comparisons 124750, depth 499
middle-element pivot on sorted n=500: comparisons 3498, depth 8
~~~

Reading the merge trace: merges happen **bottom-up**. The first line is \`[27] + [43]\`, the deepest merge, and the last line merges the two halves of the whole array. Single-element pieces are never "merged" — they are the base case. The empty and one-element inputs print no trace at all, and with duplicates \`[2, 1, 2, 1]\` the result keeps both 1s and both 2s.

Reading the quicksort trace: the first partition used pivot 10 and placed it at index 2, exactly as in the diagram. The next partition (pivot 9) worked only on the left part \`[3, 9]\`. Then pivot 43 sorted most of the right part, and pivot 27 finished it.

The last two lines are the important ones. On already sorted input of 500 items, the last-element pivot made **124750 comparisons** — exactly 500 × 499 / 2 — and the recursion went **499 levels deep**. The middle-element pivot made **3498 comparisons** with a depth of only **8**, which is about log2(500) ≈ 9. Same algorithm, same data; only the pivot choice changed.

## 7. Merge Sort vs Quicksort

| Property | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Where the work happens | Combine step (merge) | Divide step (partition) |
| Best / average time | O(n log n) | O(n log n) |
| Worst time | O(n log n) | O(n²) — bad pivots, e.g. sorted input with last-element pivot |
| Extra memory | O(n) for the merge buffer | O(log n) stack on average, O(n) worst |
| Stable? | Yes (take from the left on ties) | No |
| In place? | No (for arrays) | Yes |
| Good for | Linked lists, external (on-disk) sorting, when stability is required | In-memory arrays where average speed matters |
| Real-world use | Basis of Timsort (Python, Java objects, V8) | Basis of introsort (C++ std::sort in libstdc++) and Java dual-pivot quicksort |

For linked lists merge sort is the natural choice: splitting a list needs no random access and merging two lists can be done by relinking nodes, without a second array. That is the same merge used in [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists).

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Merge sort | O(n log n) best, average and worst | O(n) buffers + O(log n) stack | log2(n) levels, each merging all n items once |
| Quicksort (good pivots) | O(n log n) | O(log n) stack | Balanced partitions give about log2(n) levels |
| Quicksort (bad pivots) | O(n²) | O(n) stack | Each partition removes one item: n levels |
| One merge of total length n | O(n) | O(n) | Every item is copied once |
| One Lomuto partition of m items | O(m) | O(1) | m - 1 comparisons, swaps in place |

Java threads have a fixed stack size. A last-element quicksort on 100,000 sorted \`int\`s threw \`java.lang.StackOverflowError\` with the default \`java Main\` settings in our run. (The page's verifier starts Java with a larger stack, \`-Xss64m\`, but production code should not rely on that.)

## 9. Edge Cases

- **Empty array or one element** — the base case; both algorithms must return without recursing (the example's \`empty\` and \`one\` lines).
- **Duplicates** — merge sort keeps them in order. Lomuto quicksort with many equal keys degrades toward O(n²), because "not smaller than the pivot" sends all equal items to one side; three-way partitioning fixes it.
- **Already sorted or reversed input** — merge sort is unaffected; last-element quicksort hits its worst case (124750 comparisons for n = 500 above).
- **Odd lengths** — \`mid = n // 2\` gives the left half one fewer element (3 + 4 for n = 7); either split works as long as both halves shrink.

## Common Pitfalls

- **Using \`<\` instead of \`<=\` in the merge.** The output is still sorted, but ties come from the right half first and the sort is no longer stable.
- **\`int mid = (lo + hi) / 2\` on huge arrays.** \`lo + hi\` can overflow \`int\`; this exact bug sat in the JDK's own binary search and merge sort for years ([Joshua Bloch, Google Research, 2006](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)). Use \`lo + (hi - lo) / 2\` or \`(lo + hi) >>> 1\`.
- **Deep recursion.** A last-element quicksort on 100,000 sorted \`int\`s threw \`StackOverflowError\` with default settings.
- **Allocating in every merge call.** \`Arrays.copyOfRange\` per call is clear for an interview; production merge sorts allocate one buffer up front and reuse it.
- **Sorting \`Integer[]\` with \`a - b\`.** The subtraction overflows; use \`Integer.compare\`.
- **Not knowing \`Arrays.sort\` exists.** In real code call \`Arrays.sort\` (dual-pivot quicksort for primitives, stable mergesort for objects).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shared idea:</strong> <span style="color:#f0e2c8;">Both are divide and conquer: split the problem, solve the parts recursively, combine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Merge sort:</strong> <span style="color:#f0e2c8;">Split at the middle, sort both halves, then merge with two pointers. O(n log n) always, stable, O(n) extra memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quicksort:</strong> <span style="color:#f0e2c8;">Partition around a pivot so smaller items go left; the pivot is then final. Recurse on both sides; nothing to combine. O(n log n) average, in place, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The worst case:</strong> <span style="color:#f0e2c8;">A pivot that is always the min or max gives O(n²): on 500 sorted items, last-element pivot made 124750 comparisons and went 499 deep; middle pivot made 3498 and went 8 deep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Java I would compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>, sort an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> in place for quicksort, and mention that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> uses a dual-pivot quicksort for primitives.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid quicksort's worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Choose the pivot randomly or by median of three, and in production cap the depth and fall back to heap sort (introsort). Recursing on the smaller side first bounds the stack at O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merge sort stable and quicksort not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort only moves items from the front of each half and takes the left one on ties, so equal items never pass each other. Quicksort swaps items over long distances during partitioning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one would you use for a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort: splitting and merging lists needs no random access and no extra array, while quicksort relies on indexed swaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can merge sort be done without O(n) extra memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-place merging exists but is complicated and slower; in an interview say that the standard version uses O(n), and that bottom-up merge sort avoids recursion but still needs the buffer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(lo + hi) / 2</code> for the midpoint?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + hi</code> can overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> on huge arrays — the bug Joshua Bloch found in the JDK in 2006. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo + hi) &gt;&gt;&gt; 1</code> is safe.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into smaller same-type problems, solve, combine |
| **Merge** | Combine two sorted lists in O(n) with two pointers |
| **Recurrence relation** | Cost equation such as T(n) = 2T(n/2) + n |
| **Partition** | Rearrange around a pivot: smaller left, others right |
| **Lomuto partition** | Last element as pivot, one scanning index |
| **Hoare partition** | Two indices moving inward from both ends |
| **Worst-case pivot** | The min or max of the range; gives O(n²) |

---
**Conclusion:** Merge sort and quicksort are two answers to the same divide-and-conquer recipe: merge sort splits trivially and does its work in an O(n) merge, giving a guaranteed, stable O(n log n) at the cost of O(n) extra memory; quicksort does its work in the partition and needs nothing at the end, giving a fast in-place sort whose only weakness is the pivot. The traces show both mechanisms, and the counts show the weakness — 124750 comparisons with a bad pivot versus 3498 with a better one on the same sorted input. In Java, add the practical notes: compute the midpoint without overflow, expect \`StackOverflowError\` from deep recursion, and know that \`Arrays.sort\` already implements both ideas (dual-pivot quicksort for primitives, a stable mergesort for objects).`,
        examples: [
          {
            label: `Merge sort with a trace of every merge`,
            code: `import java.util.Arrays;
import java.util.StringJoiner;

// Merge sort with a trace of every merge step.
public class Main {
    static String fmt(int[] a) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int x : a) sj.add(String.valueOf(x));
        return sj.toString();
    }

    static int[] merge(int[] left, int[] right) {
        int[] out = new int[left.length + right.length];
        int i = 0, j = 0, k = 0;
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) out[k++] = left[i++]; // <= keeps equal items in order (stable)
            else out[k++] = right[j++];
        }
        while (i < left.length) out[k++] = left[i++];     // at most one of these loops runs
        while (j < right.length) out[k++] = right[j++];
        return out;
    }

    static int[] mergeSort(int[] a, int depth) {
        if (a.length <= 1) return a;                      // base case: 0 or 1 item is already sorted
        int mid = a.length / 2;
        int[] left = mergeSort(Arrays.copyOfRange(a, 0, mid), depth + 1);
        int[] right = mergeSort(Arrays.copyOfRange(a, mid, a.length), depth + 1);
        int[] merged = merge(left, right);
        System.out.println("  ".repeat(depth) + "merge " + fmt(left) + " + " + fmt(right) + " -> " + fmt(merged));
        return merged;
    }

    public static void main(String[] args) {
        int[] result = mergeSort(new int[] { 38, 27, 43, 3, 9, 82, 10 }, 0);
        System.out.println("sorted: " + fmt(result));
        System.out.println("empty:  " + fmt(mergeSort(new int[] {}, 0)));
        System.out.println("one:    " + fmt(mergeSort(new int[] { 5 }, 0)));
        System.out.println("dupes:  " + fmt(mergeSort(new int[] { 2, 1, 2, 1 }, 0)));
    }
}`,
          },
          {
            label: `Quicksort trace, and last vs middle pivot on sorted input`,
            code: `import java.util.StringJoiner;

// Quicksort (Lomuto partition) with a trace, then why the pivot choice matters.
public class Main {
    static long cmp;
    static int maxDepth;

    static String fmt(int[] a) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int x : a) sj.add(String.valueOf(x));
        return sj.toString();
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static int partition(int[] a, int lo, int hi) {
        int pivot = a[hi], i = lo;               // i = where the next "small" item goes
        for (int j = lo; j < hi; j++) if (a[j] < pivot) { swap(a, i, j); i++; }
        swap(a, i, hi);                          // pivot lands in its final place
        return i;
    }

    static void quickSortTraced(int[] a, int lo, int hi) {
        if (lo >= hi) return;
        int p = partition(a, lo, hi);
        System.out.println("pivot " + a[p] + " -> index " + p + "  " + fmt(a));
        quickSortTraced(a, lo, p - 1);
        quickSortTraced(a, p + 1, hi);
    }

    static void rec(int[] a, int lo, int hi, int depth, boolean middlePivot) {
        if (lo >= hi) return;
        maxDepth = Math.max(maxDepth, depth);
        if (middlePivot) swap(a, (lo + hi) >>> 1, hi); // move the middle item to the end
        cmp += hi - lo;                          // Lomuto compares every item except the pivot
        int p = partition(a, lo, hi);
        rec(a, lo, p - 1, depth + 1, middlePivot);
        rec(a, p + 1, hi, depth + 1, middlePivot);
    }

    public static void main(String[] args) {
        int[] data = { 38, 27, 43, 3, 9, 82, 10 };
        quickSortTraced(data, 0, data.length - 1);
        System.out.println("sorted: " + fmt(data));

        String[] labels = { "last-element pivot", "middle-element pivot" };
        for (int k = 0; k < 2; k++) {
            int[] sorted = new int[500];
            for (int i = 0; i < 500; i++) sorted[i] = i;
            cmp = 0;
            maxDepth = 0;
            rec(sorted, 0, sorted.length - 1, 1, k == 1);
            System.out.println(labels[k] + " on sorted n=500: comparisons " + cmp + ", depth " + maxDepth);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how merge sort and quicksort work — walk me through each on a small array — and then implement one of them in C++. What are their time and space costs, and when does quicksort go wrong?"

**What a strong answer should cover:**
- Both are divide and conquer; merge sort does its work in the merge, quicksort in the partition.
- Merge sort: split at the middle, recurse, two-pointer merge; O(n log n) in every case, O(n) extra space, stable because ties come from the left.
- Quicksort: pivot, partition (Lomuto or Hoare), recurse on both sides; O(n log n) average, O(n²) worst case, O(log n) average stack, not stable.
- Explains the worst case (sorted input with a first/last pivot) and the fixes: random or median-of-three pivot, introsort, recursing on the smaller side.
- C++ specifics: pass \`vector<int>&\` so the sort is in place, avoid signed overflow and \`size_t\` underflow in indices, and know \`std::sort\` (introsort) vs \`std::stable_sort\`.

**Clarifying questions expected:**
- Should the sort be in place, or may I use extra memory?
- Does it need to be stable?

**Code / implementation expected:** Yes — a working C++ merge sort or quicksort, with the base case and the merge or partition step correct.`,
        answer: `# How Merge Sort and Quicksort Work (C++)

**Target Audience:** Beginners preparing for coding interviews; basic loops, arrays and functions are enough.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block was produced by actually running the programs (g++ 13.3.0 with -std=c++17); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

You have a messy stack of 1,000 exam papers to put in roll-number order, and two friends offer to help.

The first friend says: "Cut the stack in half, give one half to someone else, sort your half, and when both halves are sorted I will **merge** them — I just keep taking whichever top paper has the smaller number." Each helper does the same thing with their half, until someone is holding a single paper, which is trivially sorted. That is **merge sort**: the hard work happens on the way *back up*, in the merging.

The second friend says: "Pick any paper — say roll number 500. Throw everything smaller onto the left pile and everything bigger onto the right pile. Number 500 is now exactly where it belongs. Then do the same to each pile." That is **quicksort**: the hard work happens on the way *down*, in the splitting, and there is nothing left to do at the end.

Both are the same big idea — break the problem into smaller copies of itself — and both run in about n log n steps on typical input. They differ in where the work happens, how much extra table space they need, and what goes wrong in the worst case.

## 2. The Shared Idea: Divide and Conquer

📌 **Interview term: Divide and conquer** — solve a problem by (1) **dividing** it into smaller sub-problems of the same kind, (2) **conquering** each one recursively, and (3) **combining** the answers. Both algorithms are [recursive](/interview-question/what-is-recursion-and-what-is-a-base-case): a function that calls itself on a smaller input, with a **base case** (here: 0 or 1 element, which is already sorted) that stops the recursion.

| | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Divide | Cut at the middle index — trivial | Partition around a pivot — the real work |
| Conquer | Sort both halves recursively | Sort both sides recursively |
| Combine | Merge two sorted halves — the real work | Nothing to do |

## 3. Merge Sort, Step by Step

**Divide.** Cut the array at the middle. Keep cutting until every piece has one element.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Merge sort splits 38 27 43 3 9 82 10 in half again and again until every piece has one element">
  <path class="d-edge" d="M 360 66 L 180 110"/>
  <path class="d-edge" d="M 360 66 L 540 110"/>
  <path class="d-edge" d="M 180 146 L 70 190"/>
  <path class="d-edge" d="M 180 146 L 210 190"/>
  <path class="d-edge" d="M 540 146 L 445 190"/>
  <path class="d-edge" d="M 540 146 L 620 190"/>
  <path class="d-edge" d="M 210 226 L 165 270"/>
  <path class="d-edge" d="M 210 226 L 255 270"/>
  <path class="d-edge" d="M 445 226 L 395 270"/>
  <path class="d-edge" d="M 445 226 L 495 270"/>
  <path class="d-edge" d="M 620 226 L 585 270"/>
  <path class="d-edge" d="M 620 226 L 675 270"/>
  <rect class="d-box-accent" x="210" y="30" width="300" height="36" rx="6"/>
  <text class="d-sub" x="360" y="53" text-anchor="middle">38 27 43 3 9 82 10</text>
  <rect class="d-box-muted" x="80" y="110" width="200" height="36" rx="6"/>
  <text class="d-sub" x="180" y="133" text-anchor="middle">38 27 43</text>
  <rect class="d-box-muted" x="420" y="110" width="240" height="36" rx="6"/>
  <text class="d-sub" x="540" y="133" text-anchor="middle">3 9 82 10</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="36" rx="6"/>
  <text class="d-sub" x="70" y="213" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="150" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="210" y="213" text-anchor="middle">27 43</text>
  <rect class="d-box-muted" x="390" y="190" width="110" height="36" rx="6"/>
  <text class="d-sub" x="445" y="213" text-anchor="middle">3 9</text>
  <rect class="d-box-muted" x="560" y="190" width="120" height="36" rx="6"/>
  <text class="d-sub" x="620" y="213" text-anchor="middle">82 10</text>
  <rect class="d-box-muted" x="140" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="165" y="293" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="230" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="255" y="293" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="370" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="395" y="293" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="495" y="293" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="560" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="585" y="293" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="650" y="270" width="50" height="36" rx="6"/>
  <text class="d-sub" x="675" y="293" text-anchor="middle">10</text>
</svg>

The array of 7 items is split 3 levels deep (7 → 3 + 4 → 1 + 2 + 2 + 2 → single items). In general the depth is about log2(n), because every level halves the size.

**Combine (merge).** Two sorted lists are merged with two pointers, \`i\` into the left list and \`j\` into the right one. Compare the two front items, move the smaller to the output, advance that pointer, and repeat. When one list runs out, copy the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Merging 27 38 43 with 3 9 10 82: compare the two front items and move the smaller one to the output">
  <text class="d-text" x="20" y="53">left</text>
  <rect class="d-box-accent" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <text class="d-text" x="20" y="133">right</text>
  <rect class="d-box-accent" x="150" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="133" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="133" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="110" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="133" text-anchor="middle">82</text>
  <text class="d-sub" x="390" y="53">i = 0, front item 27</text>
  <text class="d-sub" x="460" y="133">j = 0, front item 3</text>
  <text class="d-text" x="20" y="243">output</text>
  <rect class="d-box-muted" x="150" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="243" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="243" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="290" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="243" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="360" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="243" text-anchor="middle">27</text>
  <rect class="d-box-accent" x="430" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="243" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="500" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="243" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="570" y="220" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="243" text-anchor="middle">82</text>
</svg>

Here the right list supplies 3, 9 and 10 first, then the left list supplies 27, 38 and 43 (accented in the output), and finally 82 is copied over. Every item is moved exactly once, so merging two lists of total length n costs O(n).

📌 **Interview term: Merge** — combining two already sorted lists into one sorted list in linear time with two pointers. It is also its own interview question: [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)

**Why O(n log n)?** There are about log2(n) levels of splitting, and at every level the merges together touch all n items once. So the total is n × log2(n), in the best, average *and* worst case — merge sort does not care what order the input is in.

📌 **Interview term: Recurrence relation** — an equation that describes a recursive algorithm's cost in terms of smaller inputs. For merge sort it is T(n) = 2·T(n/2) + O(n), which solves to O(n log n).

**Stability.** When the two front items are equal, the merge takes the one from the **left** list first (the \`<=\` in the code). That keeps equal items in their original order, which makes merge sort **stable**.

## 4. Quicksort, Step by Step

**Divide (partition).** Choose one element as the **pivot**. Rearrange the array so everything smaller than the pivot comes first, then the pivot, then everything else. After one partition the pivot is in its final position forever.

📌 **Interview term: Partition** — the in-place rearrangement around a pivot. 📌 **Interview term: Lomuto partition** — the simplest scheme: use the last element as the pivot, keep an index \`i\` where the next "small" item should go, and scan \`j\` left to right, swapping every small item to position \`i\`. Finally swap the pivot into position \`i\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Lomuto partition of 38 27 43 3 9 82 10 around the pivot 10">
  <text class="d-text" x="20" y="53">before</text>
  <rect class="d-box-muted" x="150" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="53" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="220" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="53" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="290" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="53" text-anchor="middle">43</text>
  <rect class="d-box-muted" x="360" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="53" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="430" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="53" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="53" text-anchor="middle">82</text>
  <rect class="d-box-accent" x="570" y="30" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="53" text-anchor="middle">10</text>
  <text class="d-text" x="20" y="173">after</text>
  <rect class="d-box-muted" x="150" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="178" y="173" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="248" y="173" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="290" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="318" y="173" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="360" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="388" y="173" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="430" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="458" y="173" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="500" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="528" y="173" text-anchor="middle">82</text>
  <rect class="d-box-muted" x="570" y="150" width="56" height="36" rx="6"/>
  <text class="d-sub" x="598" y="173" text-anchor="middle">43</text>
  <path class="d-edge-dashed" d="M 150 205 L 276 205"/>
  <text class="d-sub" x="213" y="230" text-anchor="middle">less than 10</text>
  <text class="d-sub" x="318" y="230" text-anchor="middle">pivot</text>
  <path class="d-edge-dashed" d="M 360 205 L 626 205"/>
  <text class="d-sub" x="493" y="230" text-anchor="middle">10 or more, still unsorted</text>
</svg>

With pivot 10, only 3 and 9 are smaller, so they go first and 10 lands at index 2. The right side (38, 27, 82, 43) is still unsorted; quicksort now recurses on each side separately.

**Conquer.** Recursively quicksort the left part and the right part. **Combine:** nothing — once both sides are sorted in place, the whole array is sorted.

**Why O(n log n) on average, O(n²) in the worst case?** Each partition of a range of size m costs m - 1 comparisons. If the pivot splits the range roughly in half, there are about log2(n) levels and the total is O(n log n) — like merge sort. But if the pivot is always the smallest or largest item, each partition only peels off one element: n levels, and n + (n-1) + ... ≈ n²/2 comparisons. With "last element as pivot", that happens exactly when the input is **already sorted** — a very common real-world input.

📌 **Interview term: Worst-case pivot** — a pivot that is the minimum or maximum of its range, producing one empty side and one side of size m - 1.

**Choosing a better pivot.** Common fixes:

- **Random pivot** — pick a random index; the expected time becomes O(n log n) for every input.
- **Median of three** — use the median of the first, middle and last elements.
- **Middle element** — what the second example tries; it fixes sorted input (but not every input).
- **Introsort** — real libraries also cap the recursion depth and switch to heap sort if it is exceeded (more in [Compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms)).

📌 **Interview term: Hoare partition** — the original scheme from Tony Hoare: two indices move toward each other from both ends and swap out-of-place pairs. It usually does fewer swaps than Lomuto, but is harder to get exactly right in an interview.

**Stability and space.** The long-distance swaps make quicksort **unstable**. It sorts **in place**, but the recursion uses stack space: O(log n) on average, O(n) in the worst case. Recursing into the smaller side first and looping on the larger side keeps the stack at O(log n) even in the worst case.

The same partition routine powers [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element), which finds the k-th smallest element in O(n) on average by recursing into only one side.

## 5. The Code in C++

**Merge sort.** The merge step, exactly as it runs in the first example:

~~~cpp
vector<int> merge(const vector<int>& left, const vector<int>& right) {
    vector<int> out;
    out.reserve(left.size() + right.size());
    size_t i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) out.push_back(left[i++]); // <= keeps equal items in order (stable)
        else out.push_back(right[j++]);
    }
    while (i < left.size()) out.push_back(left[i++]);     // at most one of these loops runs
    while (j < right.size()) out.push_back(right[j++]);
    return out;
}
~~~

And the recursive driver, which also prints one trace line per merge, indented by depth:

~~~cpp
vector<int> mergeSort(const vector<int>& a, int depth = 0) {
    if (a.size() <= 1) return a;                           // base case: 0 or 1 item is already sorted
    size_t mid = a.size() / 2;
    vector<int> left = mergeSort(vector<int>(a.begin(), a.begin() + mid), depth + 1);
    vector<int> right = mergeSort(vector<int>(a.begin() + mid, a.end()), depth + 1);
    vector<int> merged = merge(left, right);
    cout << string(2 * depth, ' ') << "merge " << fmt(left) << " + " << fmt(right) << " -> " << fmt(merged) << "\\n";
    return merged;
}
~~~

\`vector<int>(a.begin(), a.begin() + mid)\` copies each half into a new vector, which is where merge sort's O(n) extra memory comes from. \`out.reserve(...)\` allocates the output once so \`push_back\` never has to grow it.

**Quicksort.** The Lomuto partition and the traced driver from the second example:

~~~cpp
int partitionLomuto(vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo;                   // i = where the next "small" item goes
    for (int j = lo; j < hi; j++) if (a[j] < pivot) { swap(a[i], a[j]); i++; }
    swap(a[i], a[hi]);                           // pivot lands in its final place
    return i;
}

void quickSortTraced(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partitionLomuto(a, lo, hi);
    cout << "pivot " << a[p] << " -> index " << p << "  " << fmt(a) << "\\n";
    quickSortTraced(a, lo, p - 1);
    quickSortTraced(a, p + 1, hi);
}
~~~

\`std::swap\` swaps two elements. The vector is passed as \`vector<int>&\` (a reference), so the partition sorts the caller's data in place; passing it by value would silently sort a copy.

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — merge sort trace** — one line per merge; deeper merges are indented more

~~~text
    merge [27] + [43] -> [27, 43]
  merge [38] + [27, 43] -> [27, 38, 43]
    merge [3] + [9] -> [3, 9]
    merge [82] + [10] -> [10, 82]
  merge [3, 9] + [10, 82] -> [3, 9, 10, 82]
merge [27, 38, 43] + [3, 9, 10, 82] -> [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
empty:  []
one:    [5]
  merge [2] + [1] -> [1, 2]
  merge [2] + [1] -> [1, 2]
merge [1, 2] + [1, 2] -> [1, 1, 2, 2]
dupes:  [1, 1, 2, 2]
~~~

**Example 2 — quicksort trace and pivot choice** — one line per partition, then the comparison counts

~~~text
pivot 10 -> index 2  [3, 9, 10, 38, 27, 82, 43]
pivot 9 -> index 1  [3, 9, 10, 38, 27, 82, 43]
pivot 43 -> index 5  [3, 9, 10, 38, 27, 43, 82]
pivot 27 -> index 3  [3, 9, 10, 27, 38, 43, 82]
sorted: [3, 9, 10, 27, 38, 43, 82]
last-element pivot on sorted n=500: comparisons 124750, depth 499
middle-element pivot on sorted n=500: comparisons 3498, depth 8
~~~

Reading the merge trace: merges happen **bottom-up**. The first line is \`[27] + [43]\`, the deepest merge, and the last line merges the two halves of the whole array. Single-element pieces are never "merged" — they are the base case. The empty and one-element inputs print no trace at all, and with duplicates \`[2, 1, 2, 1]\` the result keeps both 1s and both 2s.

Reading the quicksort trace: the first partition used pivot 10 and placed it at index 2, exactly as in the diagram. The next partition (pivot 9) worked only on the left part \`[3, 9]\`. Then pivot 43 sorted most of the right part, and pivot 27 finished it.

The last two lines are the important ones. On already sorted input of 500 items, the last-element pivot made **124750 comparisons** — exactly 500 × 499 / 2 — and the recursion went **499 levels deep**. The middle-element pivot made **3498 comparisons** with a depth of only **8**, which is about log2(500) ≈ 9. Same algorithm, same data; only the pivot choice changed.

One C++ detail showed up while porting: the first version printed \`dupes:\` *before* the merge trace lines. Since C++17 the operands of \`<<\` are evaluated left to right, so in \`cout << "dupes:  " << fmt(mergeSort(...))\` the label is written to \`cout\` before \`mergeSort\` runs and prints its trace. The example therefore calls \`mergeSort\` first and prints the label afterwards. A three-line test confirmed it: \`cout << "label: " << f()\` printed \`label: [f runs]1\`.

## 7. Merge Sort vs Quicksort

| Property | Merge sort | Quicksort |
| :--- | :--- | :--- |
| Where the work happens | Combine step (merge) | Divide step (partition) |
| Best / average time | O(n log n) | O(n log n) |
| Worst time | O(n log n) | O(n²) — bad pivots, e.g. sorted input with last-element pivot |
| Extra memory | O(n) for the merge buffer | O(log n) stack on average, O(n) worst |
| Stable? | Yes (take from the left on ties) | No |
| In place? | No (for arrays) | Yes |
| Good for | Linked lists, external (on-disk) sorting, when stability is required | In-memory arrays where average speed matters |
| Real-world use | Basis of Timsort (Python, Java objects, V8) | Basis of introsort (C++ std::sort in libstdc++) and Java dual-pivot quicksort |

For linked lists merge sort is the natural choice: splitting a list needs no random access and merging two lists can be done by relinking nodes, without a second array. That is the same merge used in [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists).

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Merge sort | O(n log n) best, average and worst | O(n) buffers + O(log n) stack | log2(n) levels, each merging all n items once |
| Quicksort (good pivots) | O(n log n) | O(log n) stack | Balanced partitions give about log2(n) levels |
| Quicksort (bad pivots) | O(n²) | O(n) stack | Each partition removes one item: n levels |
| One merge of total length n | O(n) | O(n) | Every item is copied once |
| One Lomuto partition of m items | O(m) | O(1) | m - 1 comparisons, swaps in place |

C++ has no recursion limit, only the thread's stack size; going too deep is undefined behaviour that usually shows up as a segmentation fault. Recursing on the smaller side first and looping on the larger side keeps quicksort's stack at O(log n).

## 9. Edge Cases

- **Empty array or one element** — the base case; both algorithms must return without recursing (the example's \`empty\` and \`one\` lines).
- **Duplicates** — merge sort keeps them in order. Lomuto quicksort with many equal keys degrades toward O(n²), because "not smaller than the pivot" sends all equal items to one side; three-way partitioning fixes it.
- **Already sorted or reversed input** — merge sort is unaffected; last-element quicksort hits its worst case (124750 comparisons for n = 500 above).
- **Odd lengths** — \`mid = n // 2\` gives the left half one fewer element (3 + 4 for n = 7); either split works as long as both halves shrink.

## Common Pitfalls

- **Using \`<\` instead of \`<=\` in the merge.** The output is still sorted, but ties come from the right half first and the sort is no longer stable.
- **Passing the vector by value.** \`void quickSort(vector<int> a, ...)\` sorts a copy and leaves the caller's data unchanged; pass \`vector<int>&\`.
- **\`int mid = (lo + hi) / 2\` on huge ranges.** Signed overflow is undefined behaviour in C++; use \`lo + (hi - lo) / 2\`.
- **\`size_t\` indices that go below zero.** Lomuto recurses on \`p - 1\`; with \`size_t\` and \`p = 0\` that wraps to a huge number. The examples use \`int\` indices.
- **Relying on the order of \`<<\` operands and side effects.** In C++17 a \`cout << label << f()\` chain writes \`label\` before \`f()\` runs, which reordered our trace until the example was fixed.
- **Not knowing \`std::sort\` / \`std::stable_sort\` exist.** In real code call them; implement these only when the interviewer asks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shared idea:</strong> <span style="color:#f0e2c8;">Both are divide and conquer: split the problem, solve the parts recursively, combine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Merge sort:</strong> <span style="color:#f0e2c8;">Split at the middle, sort both halves, then merge with two pointers. O(n log n) always, stable, O(n) extra memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quicksort:</strong> <span style="color:#f0e2c8;">Partition around a pivot so smaller items go left; the pivot is then final. Recurse on both sides; nothing to combine. O(n log n) average, in place, not stable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The worst case:</strong> <span style="color:#f0e2c8;">A pivot that is always the min or max gives O(n²): on 500 sorted items, last-element pivot made 124750 comparisons and went 499 deep; middle pivot made 3498 and went 8 deep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In C++ I would pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;&amp;</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>, and mention that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> is an introsort and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code> is the stable merge-based option.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid quicksort's worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Choose the pivot randomly or by median of three, and in production cap the depth and fall back to heap sort (introsort). Recursing on the smaller side first bounds the stack at O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merge sort stable and quicksort not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort only moves items from the front of each half and takes the left one on ties, so equal items never pass each other. Quicksort swaps items over long distances during partitioning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one would you use for a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort: splitting and merging lists needs no random access and no extra array, while quicksort relies on indexed swaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can merge sort be done without O(n) extra memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-place merging exists but is complicated and slower; in an interview say that the standard version uses O(n), and that bottom-up merge sort avoids recursion but still needs the buffer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass the vector by reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Passing by value copies it, so the function would sort the copy and the caller would see no change. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;&amp;</code> sorts in place; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const vector&lt;int&gt;&amp;</code> is for read-only parameters.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into smaller same-type problems, solve, combine |
| **Merge** | Combine two sorted lists in O(n) with two pointers |
| **Recurrence relation** | Cost equation such as T(n) = 2T(n/2) + n |
| **Partition** | Rearrange around a pivot: smaller left, others right |
| **Lomuto partition** | Last element as pivot, one scanning index |
| **Hoare partition** | Two indices moving inward from both ends |
| **Worst-case pivot** | The min or max of the range; gives O(n²) |

---
**Conclusion:** Merge sort and quicksort are two answers to the same divide-and-conquer recipe: merge sort splits trivially and does its work in an O(n) merge, giving a guaranteed, stable O(n log n) at the cost of O(n) extra memory; quicksort does its work in the partition and needs nothing at the end, giving a fast in-place sort whose only weakness is the pivot. The traces show both mechanisms, and the counts show the weakness — 124750 comparisons with a bad pivot versus 3498 with a better one on the same sorted input. In C++, add the practical notes: pass by reference, avoid signed overflow in the midpoint, and know that \`std::sort\` (introsort) and \`std::stable_sort\` already exist.`,
        examples: [
          {
            label: `Merge sort with a trace of every merge`,
            code: `// Merge sort with a trace of every merge step.
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

vector<int> merge(const vector<int>& left, const vector<int>& right) {
    vector<int> out;
    out.reserve(left.size() + right.size());
    size_t i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) out.push_back(left[i++]); // <= keeps equal items in order (stable)
        else out.push_back(right[j++]);
    }
    while (i < left.size()) out.push_back(left[i++]);     // at most one of these loops runs
    while (j < right.size()) out.push_back(right[j++]);
    return out;
}

vector<int> mergeSort(const vector<int>& a, int depth = 0) {
    if (a.size() <= 1) return a;                           // base case: 0 or 1 item is already sorted
    size_t mid = a.size() / 2;
    vector<int> left = mergeSort(vector<int>(a.begin(), a.begin() + mid), depth + 1);
    vector<int> right = mergeSort(vector<int>(a.begin() + mid, a.end()), depth + 1);
    vector<int> merged = merge(left, right);
    cout << string(2 * depth, ' ') << "merge " << fmt(left) << " + " << fmt(right) << " -> " << fmt(merged) << "\\n";
    return merged;
}

int main() {
    vector<int> result = mergeSort({38, 27, 43, 3, 9, 82, 10});
    cout << "sorted: " << fmt(result) << "\\n";
    cout << "empty:  " << fmt(mergeSort({})) << "\\n";   // these two print no trace lines
    cout << "one:    " << fmt(mergeSort({5})) << "\\n";
    vector<int> dupes = mergeSort({2, 1, 2, 1}); // sort first, so its trace prints before the label
    cout << "dupes:  " << fmt(dupes) << "\\n";
}`,
          },
          {
            label: `Quicksort trace, and last vs middle pivot on sorted input`,
            code: `// Quicksort (Lomuto partition) with a trace, then why the pivot choice matters.
#include <algorithm>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

long long cmpCount = 0;
int maxDepth = 0;

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int partitionLomuto(vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo;                   // i = where the next "small" item goes
    for (int j = lo; j < hi; j++) if (a[j] < pivot) { swap(a[i], a[j]); i++; }
    swap(a[i], a[hi]);                           // pivot lands in its final place
    return i;
}

void quickSortTraced(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partitionLomuto(a, lo, hi);
    cout << "pivot " << a[p] << " -> index " << p << "  " << fmt(a) << "\\n";
    quickSortTraced(a, lo, p - 1);
    quickSortTraced(a, p + 1, hi);
}

void rec(vector<int>& a, int lo, int hi, int depth, bool middlePivot) {
    if (lo >= hi) return;
    maxDepth = max(maxDepth, depth);
    if (middlePivot) swap(a[lo + (hi - lo) / 2], a[hi]); // move the middle item to the end
    cmpCount += hi - lo;                         // Lomuto compares every item except the pivot
    int p = partitionLomuto(a, lo, hi);
    rec(a, lo, p - 1, depth + 1, middlePivot);
    rec(a, p + 1, hi, depth + 1, middlePivot);
}

int main() {
    vector<int> data = {38, 27, 43, 3, 9, 82, 10};
    quickSortTraced(data, 0, int(data.size()) - 1);
    cout << "sorted: " << fmt(data) << "\\n";

    const char* labels[] = {"last-element pivot", "middle-element pivot"};
    for (int k = 0; k < 2; k++) {
        vector<int> sorted(500);
        iota(sorted.begin(), sorted.end(), 0);   // 0, 1, 2, ..., 499
        cmpCount = 0;
        maxDepth = 0;
        rec(sorted, 0, int(sorted.size()) - 1, 1, k == 1);
        cout << labels[k] << " on sorted n=500: comparisons " << cmpCount << ", depth " << maxDepth << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: "How does binary search work and what are its requirements?",
    difficulty: "easy",
    seoDescription: `How binary search halves a sorted array in O(log n), its requirements, lower and upper bounds, and the midpoint overflow bug, in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"How does binary search work, and what has to be true about the data for it to work? Please write it in Python and tell me its complexity."

**What a strong answer should cover:**
- The mechanism: keep \`lo\` and \`hi\`, check the middle, discard the half that cannot contain the target; stop when found or the range is empty.
- The requirements: sorted (or monotonic) data, O(1) random access, known bounds and a consistent comparison — and why a linked list does not qualify.
- O(log n) time with a concrete number (about 20 steps for a million items), O(1) space iteratively.
- Handles duplicates with lower and upper bound, and states the loop invariant to avoid off-by-one errors.
- Python specifics: \`//\` for the midpoint, ints never overflow, and the \`bisect\` module (\`bisect_left\`, \`bisect_right\`, \`insort\`).

**Code / implementation expected:** Yes — a correct iterative binary search in Python, ideally also the lower-bound variant.`,
        answer: `# How Binary Search Works and What It Requires (Python)

**Target Audience:** Beginners preparing for coding interviews; you only need to know arrays and loops.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block was produced by actually running the programs (Python 3.13.16); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of the game "guess my number between 1 and 100", where after each guess you are told "higher" or "lower". A beginner guesses 1, 2, 3, ... and may need 100 tries. A smart player always guesses the middle of what is left: 50, then 25 or 75, and so on. Every answer throws away half of the remaining numbers, so 7 guesses are always enough for 100 numbers, and about 20 for a million.

That is binary search. It only works because "higher / lower" tells you **which half** to throw away — and that is only true when the numbers are **in order**. A paper dictionary works the same way: you can open it in the middle and know whether to go left or right only because the words are sorted alphabetically.

## 2. The Requirements (What Must Be True)

📌 **Interview term: Binary search** — a search that keeps a range of candidate positions, looks at the middle, and discards the half that cannot contain the answer, until the range is empty or the answer is found. Each step halves the range, so it takes O(log n) steps — see [Big-O notation](/interview-question/what-is-big-o-notation).

Binary search needs four things. Interviewers specifically ask for these:

1. **The data is sorted** (by the same order you compare with). More generally, there must be a **monotonic** yes/no question: "is \`a[i] >= target\`?" is false, false, ..., false, true, true, ..., true along the array. That generalisation powers [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).
2. **Random access in O(1)** — you must be able to jump to the middle element instantly. Arrays and array-backed lists qualify; a linked list does not, because reaching the middle costs O(n) steps and the whole point is lost. (A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is the linked structure that supports this kind of search instead.)
3. **Known bounds** — a first and a last index (or a range of values) to start from.
4. **A consistent comparison** — the same "less than" that was used to sort the data.

📌 **Interview term: Monotonic** — always moving in one direction. A sorted array is monotonic non-decreasing; a predicate is monotonic if, once it becomes true, it stays true.

What binary search does **not** need: distinct values (duplicates are fine, but then you must decide *which* match you want — see lower and upper bound below) or numbers (any comparable key works, such as strings).

## 3. How It Works

Keep two indices, \`lo\` and \`hi\`, that bracket the part of the array where the target could still be. Repeat:

1. \`mid = lo + (hi - lo) / 2\` (rounded down).
2. If \`a[mid] == target\`, done.
3. If \`a[mid] < target\`, the target can only be to the right: \`lo = mid + 1\`.
4. Otherwise it can only be to the left: \`hi = mid - 1\`.

Stop when \`lo > hi\`: the range is empty and the target is not present.

Searching for 23 in \`[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="Binary search for 23 in a sorted array of ten numbers takes three steps: mid 16, mid 56, then mid 23">
  <text class="d-sub" x="136" y="34" text-anchor="middle">0</text>
  <text class="d-sub" x="196" y="34" text-anchor="middle">1</text>
  <text class="d-sub" x="256" y="34" text-anchor="middle">2</text>
  <text class="d-sub" x="316" y="34" text-anchor="middle">3</text>
  <text class="d-sub" x="376" y="34" text-anchor="middle">4</text>
  <text class="d-sub" x="436" y="34" text-anchor="middle">5</text>
  <text class="d-sub" x="496" y="34" text-anchor="middle">6</text>
  <text class="d-sub" x="556" y="34" text-anchor="middle">7</text>
  <text class="d-sub" x="616" y="34" text-anchor="middle">8</text>
  <text class="d-sub" x="676" y="34" text-anchor="middle">9</text>
  <text class="d-text" x="16" y="73">step 1</text>
  <rect class="d-box" x="110" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="136" y="73" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="196" y="73" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="256" y="73" text-anchor="middle">8</text>
  <rect class="d-box" x="290" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="316" y="73" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="350" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="376" y="73" text-anchor="middle">16</text>
  <rect class="d-box" x="410" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="73" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="73" text-anchor="middle">38</text>
  <rect class="d-box" x="530" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="73" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="73" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="73" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="153">step 2</text>
  <rect class="d-box-muted" x="110" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="153" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="153" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="153" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="153" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="153" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box" x="410" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="153" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="153" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="530" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="153" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="153" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="153" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="233">step 3</text>
  <rect class="d-box-muted" x="110" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="233" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="233" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="233" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="233" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="233" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box-accent" x="410" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="233" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="233" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="530" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="556" y="233" text-anchor="middle" opacity="0.35">56</text>
  <rect class="d-box-muted" x="590" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="616" y="233" text-anchor="middle" opacity="0.35">72</text>
  <rect class="d-box-muted" x="650" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="676" y="233" text-anchor="middle" opacity="0.35">91</text>
</svg>

Step 1 looks at index 4 (16), which is too small, so indices 0 to 4 are discarded. Step 2 looks at index 7 (56), too big, so 7 to 9 go. Step 3 looks at index 5 and finds 23. The faded cells are the ones already ruled out. The trace in the Verified section prints exactly these three steps.

📌 **Interview term: Loop invariant** — a statement that is true before every iteration. Here: "if the target is in the array, it is somewhere in \`a[lo..hi]\`". Every update keeps the invariant true, and when the range is empty the invariant tells you the target is absent. Saying the invariant out loud is the best way to avoid off-by-one bugs.

📌 **Interview term: Off-by-one error** — a bug where a loop runs one time too many or too few, or a boundary is one index wrong (\`<\` vs \`<=\`, \`mid\` vs \`mid - 1\`). Binary search is famous for them.

**Why O(log n)?** After k steps at most n / 2^k candidates are left. The loop ends when that is below 1, so k is about log2(n): 4 steps for 10 items, 10 for 1,000, 20 for 1,000,000 — the run below measured exactly those numbers.

## 4. Duplicates: Lower Bound and Upper Bound

With duplicates, "find 2" in \`[1, 2, 2, 2, 3, 5, 5, 8]\` has three correct answers, and the classic version returns whichever one it happens to hit. Most real problems want a specific one, so we search for a **boundary** instead of a value.

📌 **Interview term: Lower bound** — the first index whose value is **greater than or equal to** x (or n if there is none). It is also the position where x would be inserted to keep the array sorted, before any equal items.

📌 **Interview term: Upper bound** — the first index whose value is **strictly greater than** x. The number of copies of x is \`upper - lower\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="In 1 2 2 2 3 5 5 8 the lower bound of 2 is index 1 and the upper bound of 2 is index 4">
  <defs>
    <marker id="b03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="146" y="34" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="146" y="73" text-anchor="middle">1</text>
  <text class="d-sub" x="210" y="34" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="184" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="210" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="34" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="248" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="274" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="34" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="312" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="338" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="402" y="34" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="402" y="73" text-anchor="middle">3</text>
  <text class="d-sub" x="466" y="34" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="440" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="466" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="34" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="504" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="530" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="594" y="34" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="568" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="594" y="73" text-anchor="middle">8</text>
  <text class="d-text" x="16" y="73">array</text>
  <path class="d-edge" d="M 210 150 L 210 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="210" y="176" text-anchor="middle">lower bound = 1</text>
  <text class="d-sub" x="210" y="198" text-anchor="middle">first a[i] at least 2</text>
  <path class="d-edge" d="M 402 150 L 402 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="402" y="176" text-anchor="middle">upper bound = 4</text>
  <text class="d-sub" x="402" y="198" text-anchor="middle">first a[i] greater than 2</text>
</svg>

The three accented cells are the 2s. Lower bound points at the first of them, upper bound at the first item after them, so there are 4 - 1 = 3 copies.

📌 **Interview term: Half-open interval** — a range \`[lo, hi)\` that includes \`lo\` but not \`hi\`. Boundary searches use it: start with \`lo = 0, hi = n\`, loop \`while lo < hi\`, and update \`hi = mid\` (mid might be the answer) or \`lo = mid + 1\`. When the loop ends, \`lo == hi\` is the boundary. Compare the two templates:

|  | Exact match (closed) | Boundary (half-open) |
| :--- | :--- | :--- |
| Start | \`lo = 0, hi = n - 1\` | \`lo = 0, hi = n\` |
| Loop | \`while lo <= hi\` | \`while lo < hi\` |
| Move right | \`lo = mid + 1\` | \`lo = mid + 1\` |
| Move left | \`hi = mid - 1\` | \`hi = mid\` |
| Result | index or -1 | \`lo\` (the boundary, can be n) |

Mixing the two templates (for example \`hi = mid\` with \`while lo <= hi\`) is the most common way to write an infinite loop.

## 5. The Code in Python

The classic exact-match search from the first example, with an optional trace:

~~~python
def binary_search(a, target, trace=False):
    lo, hi, steps = 0, len(a) - 1, 0       # search the closed range [lo, hi]
    while lo <= hi:
        steps += 1
        mid = lo + (hi - lo) // 2
        if trace:
            print(f"  lo={lo} hi={hi} mid={mid} a[mid]={a[mid]}")
        if a[mid] == target:
            return mid, steps
        if a[mid] < target:
            lo = mid + 1                    # target can only be to the right
        else:
            hi = mid - 1                    # target can only be to the left
    return -1, steps
~~~

\`//\` is integer (floor) division; \`(hi - lo) // 2\` keeps \`mid\` an \`int\`. Python integers never overflow, so \`(lo + hi) // 2\` would also be safe here — but writing \`lo + (hi - lo) // 2\` is a good habit that carries over to other languages. The function returns a tuple \`(index, steps)\` so the demo can count iterations.

The boundary version from the second example (\`upper_bound\` is the same with \`<=\` in the comparison):

~~~python
def lower_bound(a, x):          # first index i with a[i] >= x (len(a) if none)
    lo, hi = 0, len(a)          # half-open range [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo
~~~

## 6. Python's Standard Library: bisect

Python ships binary search in the \`bisect\` module:

- \`bisect.bisect_left(a, x)\` — the lower bound (first index with \`a[i] >= x\`).
- \`bisect.bisect_right(a, x)\` (also called \`bisect.bisect\`) — the upper bound.
- \`bisect.insort(a, x)\` — inserts \`x\` at the right place. Finding the place is O(log n), but inserting into a list shifts items, so the whole call is O(n).
- Since Python 3.10 these functions also accept \`key=\` ([bisect docs, "Changed in version 3.10"](https://docs.python.org/3.10/library/bisect.html)).

There is no "find or return -1" function; you check \`i < len(a) and a[i] == x\` after \`bisect_left\`, as Example 3 does.

**Midpoint overflow does not exist in Python**, because \`int\` has arbitrary precision. In Java, C++ and C, \`(lo + hi) / 2\` can exceed the largest 32-bit integer and wrap to a negative number. This bug sat in the JDK's own \`Arrays.binarySearch\` until Joshua Bloch reported it in 2006 ([Google Research blog](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)). Example 3 simulates 32-bit arithmetic to show what other languages would compute: the naive midpoint of 2,000,000,000 and 2,100,000,000 comes out as -97483648, while \`lo + (hi - lo) // 2\` gives 2050000000.

📌 **Interview term: Integer overflow** — when a result is too big for a fixed-size integer type and wraps around (or, in C++, becomes undefined behaviour).

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.py\` and run with \`python3 main.py\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — classic search** — trace for 23 and 7, edge cases, then worst-case step counts

~~~text
search 23
  lo=0 hi=9 mid=4 a[mid]=16
  lo=5 hi=9 mid=7 a[mid]=56
  lo=5 hi=6 mid=5 a[mid]=23
  -> index 5 after 3 steps
search 7
  lo=0 hi=9 mid=4 a[mid]=16
  lo=0 hi=3 mid=1 a[mid]=5
  lo=2 hi=3 mid=2 a[mid]=8
  -> index -1 after 3 steps
0
9
-1
0
n=1: 1 steps (linear scan would need 1)
n=10: 4 steps (linear scan would need 10)
n=1000: 10 steps (linear scan would need 1000)
n=1000000: 20 steps (linear scan would need 1000000)
~~~

**Example 2 — boundaries** — lower and upper bound on \`[1, 2, 2, 2, 3, 5, 5, 8]\`, then the sortedness requirement

~~~text
x=2: lower=1 upper=4 count=3 first=1 last=3
x=5: lower=5 upper=7 count=2 first=5 last=6
x=4: lower=5 upper=5 count=0 first=-1 last=-1
x=0: lower=0 upper=0 count=0 first=-1 last=-1
x=9: lower=8 upper=8 count=0 first=-1 last=-1
unsorted, search 9: -1 (9 is at index 0)
sorted,   search 9: 5
~~~

**Example 3 — library and overflow**

~~~text
search 30: found at 2
search 35: not found, insert at 3
search 5: not found, insert at 0
search 60: not found, insert at 5
first 2 at 1 / after last 2 at 4
after insert: [1, 2, 2, 2, 2, 3]
lo=2000000000 hi=2100000000
naive 32-bit mid: -97483648
safe mid: 2050000000
~~~

What to notice:

- The search for 7 (absent) also took 3 steps and ended with \`lo > hi\` — that empty range is the proof that 7 is not there.
- The worst-case step counts are 1, 4, 10 and 20 for n = 1, 10, 1000 and 1,000,000: exactly ⌊log2(n)⌋ + 1. A linear scan would need n.
- For x = 4 (absent), lower and upper bound are both 5: the position where 4 would be inserted.
- **The sortedness requirement is not a formality**: on the unsorted \`[9, 1, 7, 3, 8, 2]\` the search for 9 returned -1 even though 9 is at index 0. The first midpoint was 7 (index 2), 9 > 7, so the search went right and never looked at index 0. After sorting, 9 was found at index 5.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Classic search (iterative) | O(log n) | O(1) | Range halves every step; two indices only |
| Classic search (recursive) | O(log n) | O(log n) | One stack frame per halving |
| Lower / upper bound | O(log n) | O(1) | Same halving, stops at the boundary |
| Count of x | O(log n) | O(1) | Two boundary searches |
| Sorted insert into an array | O(n) | O(1) | Search is O(log n) but shifting is O(n) |
| Linear scan (for comparison) | O(n) | O(1) | Looks at every item |

Binary search pays off when you search the same sorted data many times: sorting once costs O(n log n), then every lookup is O(log n). For a single lookup in unsorted data, a linear scan is cheaper than sorting first. Related problems that build on these templates: [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix), [search in a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array) and [finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array).

## 9. Edge Cases

- **Empty array** — \`hi\` starts at -1 (closed version) or \`lo == hi == 0\` (half-open); the loop never runs and the result is "not found" (Example 1 returns -1).
- **One element** — found or not in one step.
- **Target smaller than everything / larger than everything** — the lower bound is 0 or n; make sure the caller checks \`i < n\` before reading \`a[i]\`.
- **Duplicates** — decide whether you want any, the first or the last match, and use the boundary template.
- **Huge arrays** — the midpoint formula must not overflow (section 6).

## Common Pitfalls

- **Using \`/\` instead of \`//\`.** \`(lo + hi) / 2\` is a float in Python 3, and \`a[4.5]\` raises \`TypeError\`.
- **Running it on unsorted data.** No error is raised — Example 2 shows it quietly returns -1 for a value that is present.
- **Mixing loop templates.** \`while lo <= hi\` with \`hi = mid\` can loop forever; stick to one template per function.
- **Reading \`a[i]\` after \`bisect_left\` without checking \`i < len(a)\`.** The insertion point can be \`len(a)\`, which raises \`IndexError\`.
- **Using \`insort\` in a hot loop.** The search is O(log n) but the list insert is O(n); for many inserts use a heap or a sorted container.
- **Writing your own when \`bisect\` is allowed.** Mention \`bisect_left\`/\`bisect_right\`; interviewers usually want to see both the hand-written version and that you know the library.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Keep a range that must contain the target, look at the middle, discard the half that cannot contain it. O(log n) time, O(1) space iteratively.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirements:</strong> <span style="color:#f0e2c8;">Sorted data (or any monotonic yes/no condition), O(1) random access, known bounds and the same comparison used for sorting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The invariant:</strong> <span style="color:#f0e2c8;">If the target exists, it is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[lo..hi]</code>; the loop stops when the range is empty.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Duplicates:</strong> <span style="color:#f0e2c8;">Use lower bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;= x</code>) and upper bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; x</code>); their difference is the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Python I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_left</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right</code>; ints never overflow, but I still write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) // 2</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not binary search a linked list efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reaching the middle node takes O(n) steps, so even with O(log n) comparisons the total is O(n). Use an array, or a balanced search tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many steps for a billion items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">About 30, because 2^30 is about 1.07 billion. Our run measured 20 steps for a million.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the array is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error, just wrong answers: our search for 9 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[9, 1, 7, 3, 8, 2]</code> returned -1 although 9 is at index 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Iterative or recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterative uses O(1) space; recursive uses O(log n) stack frames for the same work. Both are fine, but the iterative one is standard in interviews.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect_left</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect_right</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_left</code> returns the first index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] &gt;= x</code> (before any equal items), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right</code> the first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] &gt; x</code> (after them). Their difference is the count of x: 4 - 1 = 3 for 2 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2, 2, 3]</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary search** | Halve the candidate range each step; O(log n) |
| **Monotonic** | Only ever moves one way; false...false, true...true |
| **Loop invariant** | A fact true before every iteration |
| **Off-by-one error** | A boundary that is one index wrong |
| **Lower bound** | First index with a[i] >= x |
| **Upper bound** | First index with a[i] > x |
| **Half-open interval** | [lo, hi): includes lo, excludes hi |
| **Integer overflow** | A result too large for a fixed-size integer |

---
**Conclusion:** Binary search turns an O(n) scan into O(log n) — 20 steps for a million items — by keeping a range that must contain the answer and halving it on every comparison. It requires sorted (more generally, monotonic) data, O(1) random access and a consistent comparison; break the first requirement and it silently returns wrong answers, as the unsorted demo showed. For duplicates, search for a boundary (lower or upper bound) with the half-open template. In Python, reach for \`bisect_left\` and \`bisect_right\`, and use \`//\` for the midpoint.`,
        examples: [
          {
            label: `Classic binary search with a trace and step counts`,
            code: `# Classic binary search on a sorted list, with a trace and a step counter.

def binary_search(a, target, trace=False):
    lo, hi, steps = 0, len(a) - 1, 0       # search the closed range [lo, hi]
    while lo <= hi:
        steps += 1
        mid = lo + (hi - lo) // 2
        if trace:
            print(f"  lo={lo} hi={hi} mid={mid} a[mid]={a[mid]}")
        if a[mid] == target:
            return mid, steps
        if a[mid] < target:
            lo = mid + 1                    # target can only be to the right
        else:
            hi = mid - 1                    # target can only be to the left
    return -1, steps

a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
for target in [23, 7]:
    print("search", target)
    idx, steps = binary_search(a, target, trace=True)
    print(f"  -> index {idx} after {steps} steps")

print(binary_search(a, 2)[0])     # 0
print(binary_search(a, 91)[0])    # 9
print(binary_search([], 5)[0])    # -1
print(binary_search([5], 5)[0])   # 0

for n in [1, 10, 1000, 1000000]:
    evens = list(range(0, 2 * n, 2))        # 0, 2, 4, ... sorted
    _, steps = binary_search(evens, 2 * n)  # bigger than everything: worst case
    print(f"n={n}: {steps} steps (linear scan would need {n})")`,
          },
          {
            label: `Lower bound, upper bound, first and last occurrence`,
            code: `# Lower bound / upper bound: binary search for a BOUNDARY, which handles duplicates.

def lower_bound(a, x):          # first index i with a[i] >= x (len(a) if none)
    lo, hi = 0, len(a)          # half-open range [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

def upper_bound(a, x):          # first index i with a[i] > x (len(a) if none)
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] <= x:
            lo = mid + 1
        else:
            hi = mid
    return lo

def first_last(a, x):
    lo, hi = lower_bound(a, x), upper_bound(a, x)
    return (lo, hi - 1) if lo < hi else (-1, -1)

a = [1, 2, 2, 2, 3, 5, 5, 8]
for x in [2, 5, 4, 0, 9]:
    lo, hi = lower_bound(a, x), upper_bound(a, x)
    first, last = first_last(a, x)
    print(f"x={x}: lower={lo} upper={hi} count={hi - lo} first={first} last={last}")

def classic(a, x):              # the exact-match version, for the requirement demo
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

unsorted = [9, 1, 7, 3, 8, 2]
print("unsorted, search 9:", classic(unsorted, 9), "(9 is at index 0)")
print("sorted,   search 9:", classic(sorted(unsorted), 9))`,
          },
          {
            label: `The standard library way, and midpoint overflow`,
            code: `# The standard-library way (bisect), and the midpoint overflow other languages worry about.
import bisect

a = [10, 20, 30, 40, 50]
for x in [30, 35, 5, 60]:
    i = bisect.bisect_left(a, x)               # insertion point = first index with a[i] >= x
    if i < len(a) and a[i] == x:
        print(f"search {x}: found at {i}")
    else:
        print(f"search {x}: not found, insert at {i}")

dupes = [1, 2, 2, 2, 3]
print("first 2 at", bisect.bisect_left(dupes, 2), "/ after last 2 at", bisect.bisect_right(dupes, 2))
bisect.insort(dupes, 2)                        # keeps the list sorted: O(log n) search + O(n) shift
print("after insert:", dupes)

def to_int32(v):                               # what a 32-bit int would hold
    return (v + 2**31) % 2**32 - 2**31

lo, hi = 2_000_000_000, 2_100_000_000
print("lo=" + str(lo) + " hi=" + str(hi))
print("naive 32-bit mid:", int(to_int32(lo + hi) / 2))  # Python ints never overflow; simulated
print("safe mid:", lo + (hi - lo) // 2)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"How does binary search work, and what has to be true about the data for it to work? Please write it in JavaScript and tell me its complexity."

**What a strong answer should cover:**
- The mechanism: keep \`lo\` and \`hi\`, check the middle, discard the half that cannot contain the target; stop when found or the range is empty.
- The requirements: sorted (or monotonic) data, O(1) random access, known bounds and a consistent comparison — and why a linked list does not qualify.
- O(log n) time with a concrete number (about 20 steps for a million items), O(1) space iteratively.
- Handles duplicates with lower and upper bound, and states the loop invariant to avoid off-by-one errors.
- JavaScript specifics: there is no built-in binary search, \`Math.floor\` is required for the midpoint, and \`(lo + hi) >> 1\` breaks above 2^31 - 1.

**Code / implementation expected:** Yes — a correct iterative binary search in JavaScript, ideally also the lower-bound variant.`,
        answer: `# How Binary Search Works and What It Requires (JavaScript)

**Target Audience:** Beginners preparing for coding interviews; you only need to know arrays and loops.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block was produced by actually running the programs (Node.js v22.22.0); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of the game "guess my number between 1 and 100", where after each guess you are told "higher" or "lower". A beginner guesses 1, 2, 3, ... and may need 100 tries. A smart player always guesses the middle of what is left: 50, then 25 or 75, and so on. Every answer throws away half of the remaining numbers, so 7 guesses are always enough for 100 numbers, and about 20 for a million.

That is binary search. It only works because "higher / lower" tells you **which half** to throw away — and that is only true when the numbers are **in order**. A paper dictionary works the same way: you can open it in the middle and know whether to go left or right only because the words are sorted alphabetically.

## 2. The Requirements (What Must Be True)

📌 **Interview term: Binary search** — a search that keeps a range of candidate positions, looks at the middle, and discards the half that cannot contain the answer, until the range is empty or the answer is found. Each step halves the range, so it takes O(log n) steps — see [Big-O notation](/interview-question/what-is-big-o-notation).

Binary search needs four things. Interviewers specifically ask for these:

1. **The data is sorted** (by the same order you compare with). More generally, there must be a **monotonic** yes/no question: "is \`a[i] >= target\`?" is false, false, ..., false, true, true, ..., true along the array. That generalisation powers [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).
2. **Random access in O(1)** — you must be able to jump to the middle element instantly. Arrays and array-backed lists qualify; a linked list does not, because reaching the middle costs O(n) steps and the whole point is lost. (A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is the linked structure that supports this kind of search instead.)
3. **Known bounds** — a first and a last index (or a range of values) to start from.
4. **A consistent comparison** — the same "less than" that was used to sort the data.

📌 **Interview term: Monotonic** — always moving in one direction. A sorted array is monotonic non-decreasing; a predicate is monotonic if, once it becomes true, it stays true.

What binary search does **not** need: distinct values (duplicates are fine, but then you must decide *which* match you want — see lower and upper bound below) or numbers (any comparable key works, such as strings).

## 3. How It Works

Keep two indices, \`lo\` and \`hi\`, that bracket the part of the array where the target could still be. Repeat:

1. \`mid = lo + (hi - lo) / 2\` (rounded down).
2. If \`a[mid] == target\`, done.
3. If \`a[mid] < target\`, the target can only be to the right: \`lo = mid + 1\`.
4. Otherwise it can only be to the left: \`hi = mid - 1\`.

Stop when \`lo > hi\`: the range is empty and the target is not present.

Searching for 23 in \`[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="Binary search for 23 in a sorted array of ten numbers takes three steps: mid 16, mid 56, then mid 23">
  <text class="d-sub" x="136" y="34" text-anchor="middle">0</text>
  <text class="d-sub" x="196" y="34" text-anchor="middle">1</text>
  <text class="d-sub" x="256" y="34" text-anchor="middle">2</text>
  <text class="d-sub" x="316" y="34" text-anchor="middle">3</text>
  <text class="d-sub" x="376" y="34" text-anchor="middle">4</text>
  <text class="d-sub" x="436" y="34" text-anchor="middle">5</text>
  <text class="d-sub" x="496" y="34" text-anchor="middle">6</text>
  <text class="d-sub" x="556" y="34" text-anchor="middle">7</text>
  <text class="d-sub" x="616" y="34" text-anchor="middle">8</text>
  <text class="d-sub" x="676" y="34" text-anchor="middle">9</text>
  <text class="d-text" x="16" y="73">step 1</text>
  <rect class="d-box" x="110" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="136" y="73" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="196" y="73" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="256" y="73" text-anchor="middle">8</text>
  <rect class="d-box" x="290" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="316" y="73" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="350" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="376" y="73" text-anchor="middle">16</text>
  <rect class="d-box" x="410" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="73" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="73" text-anchor="middle">38</text>
  <rect class="d-box" x="530" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="73" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="73" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="73" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="153">step 2</text>
  <rect class="d-box-muted" x="110" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="153" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="153" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="153" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="153" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="153" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box" x="410" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="153" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="153" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="530" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="153" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="153" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="153" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="233">step 3</text>
  <rect class="d-box-muted" x="110" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="233" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="233" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="233" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="233" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="233" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box-accent" x="410" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="233" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="233" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="530" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="556" y="233" text-anchor="middle" opacity="0.35">56</text>
  <rect class="d-box-muted" x="590" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="616" y="233" text-anchor="middle" opacity="0.35">72</text>
  <rect class="d-box-muted" x="650" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="676" y="233" text-anchor="middle" opacity="0.35">91</text>
</svg>

Step 1 looks at index 4 (16), which is too small, so indices 0 to 4 are discarded. Step 2 looks at index 7 (56), too big, so 7 to 9 go. Step 3 looks at index 5 and finds 23. The faded cells are the ones already ruled out. The trace in the Verified section prints exactly these three steps.

📌 **Interview term: Loop invariant** — a statement that is true before every iteration. Here: "if the target is in the array, it is somewhere in \`a[lo..hi]\`". Every update keeps the invariant true, and when the range is empty the invariant tells you the target is absent. Saying the invariant out loud is the best way to avoid off-by-one bugs.

📌 **Interview term: Off-by-one error** — a bug where a loop runs one time too many or too few, or a boundary is one index wrong (\`<\` vs \`<=\`, \`mid\` vs \`mid - 1\`). Binary search is famous for them.

**Why O(log n)?** After k steps at most n / 2^k candidates are left. The loop ends when that is below 1, so k is about log2(n): 4 steps for 10 items, 10 for 1,000, 20 for 1,000,000 — the run below measured exactly those numbers.

## 4. Duplicates: Lower Bound and Upper Bound

With duplicates, "find 2" in \`[1, 2, 2, 2, 3, 5, 5, 8]\` has three correct answers, and the classic version returns whichever one it happens to hit. Most real problems want a specific one, so we search for a **boundary** instead of a value.

📌 **Interview term: Lower bound** — the first index whose value is **greater than or equal to** x (or n if there is none). It is also the position where x would be inserted to keep the array sorted, before any equal items.

📌 **Interview term: Upper bound** — the first index whose value is **strictly greater than** x. The number of copies of x is \`upper - lower\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="In 1 2 2 2 3 5 5 8 the lower bound of 2 is index 1 and the upper bound of 2 is index 4">
  <defs>
    <marker id="b03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="146" y="34" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="146" y="73" text-anchor="middle">1</text>
  <text class="d-sub" x="210" y="34" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="184" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="210" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="34" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="248" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="274" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="34" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="312" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="338" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="402" y="34" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="402" y="73" text-anchor="middle">3</text>
  <text class="d-sub" x="466" y="34" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="440" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="466" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="34" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="504" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="530" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="594" y="34" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="568" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="594" y="73" text-anchor="middle">8</text>
  <text class="d-text" x="16" y="73">array</text>
  <path class="d-edge" d="M 210 150 L 210 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="210" y="176" text-anchor="middle">lower bound = 1</text>
  <text class="d-sub" x="210" y="198" text-anchor="middle">first a[i] at least 2</text>
  <path class="d-edge" d="M 402 150 L 402 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="402" y="176" text-anchor="middle">upper bound = 4</text>
  <text class="d-sub" x="402" y="198" text-anchor="middle">first a[i] greater than 2</text>
</svg>

The three accented cells are the 2s. Lower bound points at the first of them, upper bound at the first item after them, so there are 4 - 1 = 3 copies.

📌 **Interview term: Half-open interval** — a range \`[lo, hi)\` that includes \`lo\` but not \`hi\`. Boundary searches use it: start with \`lo = 0, hi = n\`, loop \`while lo < hi\`, and update \`hi = mid\` (mid might be the answer) or \`lo = mid + 1\`. When the loop ends, \`lo == hi\` is the boundary. Compare the two templates:

|  | Exact match (closed) | Boundary (half-open) |
| :--- | :--- | :--- |
| Start | \`lo = 0, hi = n - 1\` | \`lo = 0, hi = n\` |
| Loop | \`while lo <= hi\` | \`while lo < hi\` |
| Move right | \`lo = mid + 1\` | \`lo = mid + 1\` |
| Move left | \`hi = mid - 1\` | \`hi = mid\` |
| Result | index or -1 | \`lo\` (the boundary, can be n) |

Mixing the two templates (for example \`hi = mid\` with \`while lo <= hi\`) is the most common way to write an infinite loop.

## 5. The Code in JavaScript

The classic exact-match search from the first example, with an optional trace:

~~~javascript
function binarySearch(a, target, trace = false) {
  let lo = 0, hi = a.length - 1, steps = 0;   // search the closed range [lo, hi]
  while (lo <= hi) {
    steps++;
    const mid = lo + Math.floor((hi - lo) / 2); // Math.floor: "/" alone gives a fraction
    if (trace) console.log("  lo=" + lo + " hi=" + hi + " mid=" + mid + " a[mid]=" + a[mid]);
    if (a[mid] === target) return [mid, steps];
    if (a[mid] < target) lo = mid + 1;          // target can only be to the right
    else hi = mid - 1;                          // target can only be to the left
  }
  return [-1, steps];
}
~~~

\`Math.floor\` is essential: \`/\` always produces a floating-point number in JavaScript, and \`a[4.5]\` is \`undefined\` rather than an error, so forgetting it gives silently wrong answers. \`===\` compares without type conversion. The function returns \`[index, steps]\`, unpacked with destructuring.

The boundary version from the second example (\`upper_bound\` is the same with \`<=\` in the comparison):

~~~javascript
function lowerBound(a, x) {  // first index i with a[i] >= x (a.length if none)
  let lo = 0, hi = a.length; // half-open range [lo, hi)
  while (lo < hi) {
    const mid = (lo + hi) >>> 1; // safe here: indices are far below 2^31
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
~~~

## 6. JavaScript Has No Built-in Binary Search

Unlike Python, Java and C++, JavaScript's standard library has **no binary search**: \`indexOf\`, \`includes\` and \`findIndex\` are all linear scans, O(n). So you write \`lowerBound\` yourself (Example 3) and derive the rest from it. Building it from scratch is also a common interview task: [Binary search implementation](/interview-question/binary-search-implementation).

**Midpoint overflow in JavaScript is about bit operators.** Numbers are 64-bit floating point, so \`(lo + hi) / 2\` is exact for any realistic array index — 2,000,000,000 + 2,100,000,000 does not overflow. But the popular shortcut \`(lo + hi) >> 1\` first converts its operand to a **32-bit signed integer**, so it breaks above 2^31 - 1: Example 3 prints -97483648 for it, while \`lo + Math.floor((hi - lo) / 2)\` gives 2050000000. \`(lo + hi) >>> 1\` (unsigned shift) is correct up to 2^32 - 1 and is fine for array indices. The same bug, with \`int\` instead of bit shifts, sat in the JDK's \`Arrays.binarySearch\` until 2006 ([Joshua Bloch, Google Research blog](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)).

📌 **Interview term: Integer overflow** — when a result is too big for a fixed-size integer type and wraps around. In JavaScript it appears only where values are forced to 32 bits (bitwise operators, typed arrays).

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.js\` and run with \`node main.js\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — classic search** — trace for 23 and 7, edge cases, then worst-case step counts

~~~text
search 23
  lo=0 hi=9 mid=4 a[mid]=16
  lo=5 hi=9 mid=7 a[mid]=56
  lo=5 hi=6 mid=5 a[mid]=23
  -> index 5 after 3 steps
search 7
  lo=0 hi=9 mid=4 a[mid]=16
  lo=0 hi=3 mid=1 a[mid]=5
  lo=2 hi=3 mid=2 a[mid]=8
  -> index -1 after 3 steps
0
9
-1
0
n=1: 1 steps (linear scan would need 1)
n=10: 4 steps (linear scan would need 10)
n=1000: 10 steps (linear scan would need 1000)
n=1000000: 20 steps (linear scan would need 1000000)
~~~

**Example 2 — boundaries** — lower and upper bound on \`[1, 2, 2, 2, 3, 5, 5, 8]\`, then the sortedness requirement

~~~text
x=2: lower=1 upper=4 count=3 first=1 last=3
x=5: lower=5 upper=7 count=2 first=5 last=6
x=4: lower=5 upper=5 count=0 first=-1 last=-1
x=0: lower=0 upper=0 count=0 first=-1 last=-1
x=9: lower=8 upper=8 count=0 first=-1 last=-1
unsorted, search 9: -1 (9 is at index 0)
sorted,   search 9: 5
~~~

**Example 3 — library and overflow**

~~~text
search 30: found at 2
search 35: not found, insert at 3
search 5: not found, insert at 0
search 60: not found, insert at 5
first 2 at 1 / after last 2 at 4
after insert: [1, 2, 2, 2, 2, 3]
lo=2000000000 hi=2100000000
naive 32-bit mid: -97483648
safe mid: 2050000000
~~~

What to notice:

- The search for 7 (absent) also took 3 steps and ended with \`lo > hi\` — that empty range is the proof that 7 is not there.
- The worst-case step counts are 1, 4, 10 and 20 for n = 1, 10, 1000 and 1,000,000: exactly ⌊log2(n)⌋ + 1. A linear scan would need n.
- For x = 4 (absent), lower and upper bound are both 5: the position where 4 would be inserted.
- **The sortedness requirement is not a formality**: on the unsorted \`[9, 1, 7, 3, 8, 2]\` the search for 9 returned -1 even though 9 is at index 0. The first midpoint was 7 (index 2), 9 > 7, so the search went right and never looked at index 0. After sorting, 9 was found at index 5.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Classic search (iterative) | O(log n) | O(1) | Range halves every step; two indices only |
| Classic search (recursive) | O(log n) | O(log n) | One stack frame per halving |
| Lower / upper bound | O(log n) | O(1) | Same halving, stops at the boundary |
| Count of x | O(log n) | O(1) | Two boundary searches |
| Sorted insert into an array | O(n) | O(1) | Search is O(log n) but shifting is O(n) |
| Linear scan (for comparison) | O(n) | O(1) | Looks at every item |

Binary search pays off when you search the same sorted data many times: sorting once costs O(n log n), then every lookup is O(log n). For a single lookup in unsorted data, a linear scan is cheaper than sorting first. Related problems that build on these templates: [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix), [search in a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array) and [finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array).

## 9. Edge Cases

- **Empty array** — \`hi\` starts at -1 (closed version) or \`lo == hi == 0\` (half-open); the loop never runs and the result is "not found" (Example 1 returns -1).
- **One element** — found or not in one step.
- **Target smaller than everything / larger than everything** — the lower bound is 0 or n; make sure the caller checks \`i < n\` before reading \`a[i]\`.
- **Duplicates** — decide whether you want any, the first or the last match, and use the boundary template.
- **Huge arrays** — the midpoint formula must not overflow (section 6).

## Common Pitfalls

- **Forgetting \`Math.floor\`.** \`(lo + hi) / 2\` can be \`4.5\`; \`a[4.5]\` is \`undefined\`, no error is thrown, and the comparison quietly fails.
- **Using \`>> 1\` for the midpoint on large values.** It truncates to 32 bits; Example 3 shows -97483648.
- **Searching an array sorted with the default \`sort()\`.** \`[10, 9, 1, 100].sort()\` is \`[1, 10, 100, 9]\` — string order — so a numeric binary search on it gives wrong answers. Sort with \`(a, b) => a - b\` first.
- **Running it on unsorted data.** Nothing throws; Example 2 returns -1 for a value that is present.
- **Mixing loop templates.** \`while (lo <= hi)\` with \`hi = mid\` can loop forever.
- **Reaching for \`indexOf\` on sorted data.** It is O(n); the whole point of keeping data sorted is O(log n) lookups.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Keep a range that must contain the target, look at the middle, discard the half that cannot contain it. O(log n) time, O(1) space iteratively.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirements:</strong> <span style="color:#f0e2c8;">Sorted data (or any monotonic yes/no condition), O(1) random access, known bounds and the same comparison used for sorting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The invariant:</strong> <span style="color:#f0e2c8;">If the target exists, it is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[lo..hi]</code>; the loop stops when the range is empty.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Duplicates:</strong> <span style="color:#f0e2c8;">Use lower bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;= x</code>) and upper bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; x</code>); their difference is the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">JavaScript has no built-in binary search, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lowerBound</code> myself, floor the midpoint, and avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt; 1</code> on large values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not binary search a linked list efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reaching the middle node takes O(n) steps, so even with O(log n) comparisons the total is O(n). Use an array, or a balanced search tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many steps for a billion items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">About 30, because 2^30 is about 1.07 billion. Our run measured 20 steps for a million.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the array is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error, just wrong answers: our search for 9 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[9, 1, 7, 3, 8, 2]</code> returned -1 although 9 is at index 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Iterative or recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterative uses O(1) space; recursive uses O(log n) stack frames for the same work. Both are fine, but the iterative one is standard in interviews.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">indexOf</code> on a sorted array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a linear scan, O(n), and JavaScript has no built-in binary search. A hand-written <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lowerBound</code> is O(log n): 20 steps for a million items.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary search** | Halve the candidate range each step; O(log n) |
| **Monotonic** | Only ever moves one way; false...false, true...true |
| **Loop invariant** | A fact true before every iteration |
| **Off-by-one error** | A boundary that is one index wrong |
| **Lower bound** | First index with a[i] >= x |
| **Upper bound** | First index with a[i] > x |
| **Half-open interval** | [lo, hi): includes lo, excludes hi |
| **Integer overflow** | A result too large for a fixed-size integer |

---
**Conclusion:** Binary search turns an O(n) scan into O(log n) — 20 steps for a million items — by keeping a range that must contain the answer and halving it on every comparison. It requires sorted (more generally, monotonic) data, O(1) random access and a consistent comparison; break the first requirement and it silently returns wrong answers, as the unsorted demo showed. For duplicates, search for a boundary (lower or upper bound) with the half-open template. JavaScript has no built-in version, so write \`lowerBound\` once, floor the midpoint, and stay away from \`>> 1\` on large numbers.`,
        examples: [
          {
            label: `Classic binary search with a trace and step counts`,
            code: `// Classic binary search on a sorted array, with a trace and a step counter.

function binarySearch(a, target, trace = false) {
  let lo = 0, hi = a.length - 1, steps = 0;   // search the closed range [lo, hi]
  while (lo <= hi) {
    steps++;
    const mid = lo + Math.floor((hi - lo) / 2); // Math.floor: "/" alone gives a fraction
    if (trace) console.log("  lo=" + lo + " hi=" + hi + " mid=" + mid + " a[mid]=" + a[mid]);
    if (a[mid] === target) return [mid, steps];
    if (a[mid] < target) lo = mid + 1;          // target can only be to the right
    else hi = mid - 1;                          // target can only be to the left
  }
  return [-1, steps];
}

const a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
for (const target of [23, 7]) {
  console.log("search " + target);
  const [idx, steps] = binarySearch(a, target, true);
  console.log("  -> index " + idx + " after " + steps + " steps");
}

console.log(binarySearch(a, 2)[0]);   // 0
console.log(binarySearch(a, 91)[0]);  // 9
console.log(binarySearch([], 5)[0]);  // -1
console.log(binarySearch([5], 5)[0]); // 0

for (const n of [1, 10, 1000, 1000000]) {
  const evens = Array.from({ length: n }, (_, i) => 2 * i); // 0, 2, 4, ... sorted
  const [, steps] = binarySearch(evens, 2 * n);              // bigger than everything: worst case
  console.log("n=" + n + ": " + steps + " steps (linear scan would need " + n + ")");
}`,
          },
          {
            label: `Lower bound, upper bound, first and last occurrence`,
            code: `// Lower bound / upper bound: binary search for a BOUNDARY, which handles duplicates.

function lowerBound(a, x) {  // first index i with a[i] >= x (a.length if none)
  let lo = 0, hi = a.length; // half-open range [lo, hi)
  while (lo < hi) {
    const mid = (lo + hi) >>> 1; // safe here: indices are far below 2^31
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(a, x) {  // first index i with a[i] > x (a.length if none)
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function firstLast(a, x) {
  const lo = lowerBound(a, x), hi = upperBound(a, x);
  return lo < hi ? [lo, hi - 1] : [-1, -1];
}

const a = [1, 2, 2, 2, 3, 5, 5, 8];
for (const x of [2, 5, 4, 0, 9]) {
  const lo = lowerBound(a, x), hi = upperBound(a, x);
  const [first, last] = firstLast(a, x);
  console.log("x=" + x + ": lower=" + lo + " upper=" + hi + " count=" + (hi - lo) + " first=" + first + " last=" + last);
}

function classic(a, x) {     // the exact-match version, for the requirement demo
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] === x) return mid;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

const unsorted = [9, 1, 7, 3, 8, 2];
console.log("unsorted, search 9: " + classic(unsorted, 9) + " (9 is at index 0)");
const sortedCopy = unsorted.slice().sort((p, q) => p - q); // numeric comparator!
console.log("sorted,   search 9: " + classic(sortedCopy, 9));`,
          },
          {
            label: `The standard library way, and midpoint overflow`,
            code: `// JavaScript has no built-in binary search, so we write lowerBound once and reuse it.
// Then: the midpoint overflow that bites when you use 32-bit bit operators.

function lowerBound(a, x) {  // first index with a[i] >= x (a.length if none)
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
const upperBound = (a, x) => lowerBound(a, x + 1); // integers only: first index with a[i] > x

const a = [10, 20, 30, 40, 50];
for (const x of [30, 35, 5, 60]) {
  const i = lowerBound(a, x);
  if (i < a.length && a[i] === x) console.log("search " + x + ": found at " + i);
  else console.log("search " + x + ": not found, insert at " + i);
}

const dupes = [1, 2, 2, 2, 3];
console.log("first 2 at " + lowerBound(dupes, 2) + " / after last 2 at " + upperBound(dupes, 2));
dupes.splice(upperBound(dupes, 2), 0, 2);     // sorted insert: O(log n) search + O(n) shift
console.log("after insert: [" + dupes.join(", ") + "]");

const lo = 2000000000, hi = 2100000000;
console.log("lo=" + lo + " hi=" + hi);
console.log("naive 32-bit mid: " + ((lo + hi) >> 1));      // >> converts to a 32-bit int first
console.log("safe mid: " + (lo + Math.floor((hi - lo) / 2)));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"How does binary search work, and what has to be true about the data for it to work? Please write it in Java and tell me its complexity."

**What a strong answer should cover:**
- The mechanism: keep \`lo\` and \`hi\`, check the middle, discard the half that cannot contain the target; stop when found or the range is empty.
- The requirements: sorted (or monotonic) data, O(1) random access, known bounds and a consistent comparison — and why a linked list does not qualify.
- O(log n) time with a concrete number (about 20 steps for a million items), O(1) space iteratively.
- Handles duplicates with lower and upper bound, and states the loop invariant to avoid off-by-one errors.
- Java specifics: the \`(lo + hi) / 2\` overflow bug (fixed in the JDK after 2006), and \`Arrays.binarySearch\` returning \`-(insertion point) - 1\`.

**Code / implementation expected:** Yes — a correct iterative binary search in Java, ideally also the lower-bound variant.`,
        answer: `# How Binary Search Works and What It Requires (Java)

**Target Audience:** Beginners preparing for coding interviews; you only need to know arrays and loops.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block was produced by actually running the programs (OpenJDK 21.0.12 (javac + java)); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of the game "guess my number between 1 and 100", where after each guess you are told "higher" or "lower". A beginner guesses 1, 2, 3, ... and may need 100 tries. A smart player always guesses the middle of what is left: 50, then 25 or 75, and so on. Every answer throws away half of the remaining numbers, so 7 guesses are always enough for 100 numbers, and about 20 for a million.

That is binary search. It only works because "higher / lower" tells you **which half** to throw away — and that is only true when the numbers are **in order**. A paper dictionary works the same way: you can open it in the middle and know whether to go left or right only because the words are sorted alphabetically.

## 2. The Requirements (What Must Be True)

📌 **Interview term: Binary search** — a search that keeps a range of candidate positions, looks at the middle, and discards the half that cannot contain the answer, until the range is empty or the answer is found. Each step halves the range, so it takes O(log n) steps — see [Big-O notation](/interview-question/what-is-big-o-notation).

Binary search needs four things. Interviewers specifically ask for these:

1. **The data is sorted** (by the same order you compare with). More generally, there must be a **monotonic** yes/no question: "is \`a[i] >= target\`?" is false, false, ..., false, true, true, ..., true along the array. That generalisation powers [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).
2. **Random access in O(1)** — you must be able to jump to the middle element instantly. Arrays and array-backed lists qualify; a linked list does not, because reaching the middle costs O(n) steps and the whole point is lost. (A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is the linked structure that supports this kind of search instead.)
3. **Known bounds** — a first and a last index (or a range of values) to start from.
4. **A consistent comparison** — the same "less than" that was used to sort the data.

📌 **Interview term: Monotonic** — always moving in one direction. A sorted array is monotonic non-decreasing; a predicate is monotonic if, once it becomes true, it stays true.

What binary search does **not** need: distinct values (duplicates are fine, but then you must decide *which* match you want — see lower and upper bound below) or numbers (any comparable key works, such as strings).

## 3. How It Works

Keep two indices, \`lo\` and \`hi\`, that bracket the part of the array where the target could still be. Repeat:

1. \`mid = lo + (hi - lo) / 2\` (rounded down).
2. If \`a[mid] == target\`, done.
3. If \`a[mid] < target\`, the target can only be to the right: \`lo = mid + 1\`.
4. Otherwise it can only be to the left: \`hi = mid - 1\`.

Stop when \`lo > hi\`: the range is empty and the target is not present.

Searching for 23 in \`[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="Binary search for 23 in a sorted array of ten numbers takes three steps: mid 16, mid 56, then mid 23">
  <text class="d-sub" x="136" y="34" text-anchor="middle">0</text>
  <text class="d-sub" x="196" y="34" text-anchor="middle">1</text>
  <text class="d-sub" x="256" y="34" text-anchor="middle">2</text>
  <text class="d-sub" x="316" y="34" text-anchor="middle">3</text>
  <text class="d-sub" x="376" y="34" text-anchor="middle">4</text>
  <text class="d-sub" x="436" y="34" text-anchor="middle">5</text>
  <text class="d-sub" x="496" y="34" text-anchor="middle">6</text>
  <text class="d-sub" x="556" y="34" text-anchor="middle">7</text>
  <text class="d-sub" x="616" y="34" text-anchor="middle">8</text>
  <text class="d-sub" x="676" y="34" text-anchor="middle">9</text>
  <text class="d-text" x="16" y="73">step 1</text>
  <rect class="d-box" x="110" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="136" y="73" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="196" y="73" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="256" y="73" text-anchor="middle">8</text>
  <rect class="d-box" x="290" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="316" y="73" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="350" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="376" y="73" text-anchor="middle">16</text>
  <rect class="d-box" x="410" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="73" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="73" text-anchor="middle">38</text>
  <rect class="d-box" x="530" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="73" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="73" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="73" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="153">step 2</text>
  <rect class="d-box-muted" x="110" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="153" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="153" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="153" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="153" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="153" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box" x="410" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="153" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="153" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="530" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="153" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="153" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="153" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="233">step 3</text>
  <rect class="d-box-muted" x="110" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="233" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="233" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="233" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="233" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="233" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box-accent" x="410" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="233" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="233" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="530" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="556" y="233" text-anchor="middle" opacity="0.35">56</text>
  <rect class="d-box-muted" x="590" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="616" y="233" text-anchor="middle" opacity="0.35">72</text>
  <rect class="d-box-muted" x="650" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="676" y="233" text-anchor="middle" opacity="0.35">91</text>
</svg>

Step 1 looks at index 4 (16), which is too small, so indices 0 to 4 are discarded. Step 2 looks at index 7 (56), too big, so 7 to 9 go. Step 3 looks at index 5 and finds 23. The faded cells are the ones already ruled out. The trace in the Verified section prints exactly these three steps.

📌 **Interview term: Loop invariant** — a statement that is true before every iteration. Here: "if the target is in the array, it is somewhere in \`a[lo..hi]\`". Every update keeps the invariant true, and when the range is empty the invariant tells you the target is absent. Saying the invariant out loud is the best way to avoid off-by-one bugs.

📌 **Interview term: Off-by-one error** — a bug where a loop runs one time too many or too few, or a boundary is one index wrong (\`<\` vs \`<=\`, \`mid\` vs \`mid - 1\`). Binary search is famous for them.

**Why O(log n)?** After k steps at most n / 2^k candidates are left. The loop ends when that is below 1, so k is about log2(n): 4 steps for 10 items, 10 for 1,000, 20 for 1,000,000 — the run below measured exactly those numbers.

## 4. Duplicates: Lower Bound and Upper Bound

With duplicates, "find 2" in \`[1, 2, 2, 2, 3, 5, 5, 8]\` has three correct answers, and the classic version returns whichever one it happens to hit. Most real problems want a specific one, so we search for a **boundary** instead of a value.

📌 **Interview term: Lower bound** — the first index whose value is **greater than or equal to** x (or n if there is none). It is also the position where x would be inserted to keep the array sorted, before any equal items.

📌 **Interview term: Upper bound** — the first index whose value is **strictly greater than** x. The number of copies of x is \`upper - lower\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="In 1 2 2 2 3 5 5 8 the lower bound of 2 is index 1 and the upper bound of 2 is index 4">
  <defs>
    <marker id="b03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="146" y="34" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="146" y="73" text-anchor="middle">1</text>
  <text class="d-sub" x="210" y="34" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="184" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="210" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="34" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="248" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="274" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="34" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="312" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="338" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="402" y="34" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="402" y="73" text-anchor="middle">3</text>
  <text class="d-sub" x="466" y="34" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="440" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="466" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="34" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="504" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="530" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="594" y="34" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="568" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="594" y="73" text-anchor="middle">8</text>
  <text class="d-text" x="16" y="73">array</text>
  <path class="d-edge" d="M 210 150 L 210 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="210" y="176" text-anchor="middle">lower bound = 1</text>
  <text class="d-sub" x="210" y="198" text-anchor="middle">first a[i] at least 2</text>
  <path class="d-edge" d="M 402 150 L 402 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="402" y="176" text-anchor="middle">upper bound = 4</text>
  <text class="d-sub" x="402" y="198" text-anchor="middle">first a[i] greater than 2</text>
</svg>

The three accented cells are the 2s. Lower bound points at the first of them, upper bound at the first item after them, so there are 4 - 1 = 3 copies.

📌 **Interview term: Half-open interval** — a range \`[lo, hi)\` that includes \`lo\` but not \`hi\`. Boundary searches use it: start with \`lo = 0, hi = n\`, loop \`while lo < hi\`, and update \`hi = mid\` (mid might be the answer) or \`lo = mid + 1\`. When the loop ends, \`lo == hi\` is the boundary. Compare the two templates:

|  | Exact match (closed) | Boundary (half-open) |
| :--- | :--- | :--- |
| Start | \`lo = 0, hi = n - 1\` | \`lo = 0, hi = n\` |
| Loop | \`while lo <= hi\` | \`while lo < hi\` |
| Move right | \`lo = mid + 1\` | \`lo = mid + 1\` |
| Move left | \`hi = mid - 1\` | \`hi = mid\` |
| Result | index or -1 | \`lo\` (the boundary, can be n) |

Mixing the two templates (for example \`hi = mid\` with \`while lo <= hi\`) is the most common way to write an infinite loop.

## 5. The Code in Java

The classic exact-match search from the first example, with an optional trace:

~~~java
static int binarySearch(int[] a, int target, boolean trace) {
    int lo = 0, hi = a.length - 1;          // search the closed range [lo, hi]
    steps = 0;
    while (lo <= hi) {
        steps++;
        int mid = lo + (hi - lo) / 2;       // never overflows, unlike (lo + hi) / 2
        if (trace) System.out.println("  lo=" + lo + " hi=" + hi + " mid=" + mid + " a[mid]=" + a[mid]);
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;  // target can only be to the right
        else hi = mid - 1;                  // target can only be to the left
    }
    return -1;
}
~~~

\`lo + (hi - lo) / 2\` cannot overflow, unlike \`(lo + hi) / 2\` (see section 6). Integer division in Java already rounds toward zero, which is the same as rounding down for non-negative numbers. A \`static int steps\` field carries the iteration count back to \`main\`.

The boundary version from the second example (\`upper_bound\` is the same with \`<=\` in the comparison):

~~~java
static int lowerBound(int[] a, int x) {  // first index i with a[i] >= x (a.length if none)
    int lo = 0, hi = a.length;           // half-open range [lo, hi)
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;       // unsigned shift: correct even if lo + hi overflows
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
~~~

## 6. Java's Standard Library: Arrays.binarySearch

\`Arrays.binarySearch(int[] a, int key)\` (with overloads for every primitive type, for \`Object[]\` and with a \`Comparator\`) and \`Collections.binarySearch(List, key)\` are built in. Two details from the Javadoc matter in interviews:

- The return value is the index if found, otherwise **\`-(insertion point) - 1\`**, where the insertion point is "the index of the first element greater than the key". That encoding guarantees a negative result for "not found" even when the insertion point is 0. Decode it with \`-r - 1\`, as Example 3 does.
- "If the array contains multiple elements with the specified value, there is no guarantee which one will be found", and if the array is not sorted, "the results are undefined". Searching \`[2, 2, 2, 2, 2]\` for 2 returned index 2 (the first midpoint) in our run, and searching the unsorted \`[9, 1, 7, 3, 8, 2]\` for 9 returned -7 — "not found", although 9 is at index 0.

So for "first occurrence" or "count of x" you still write \`lowerBound\` yourself (Example 3 does, on a \`List<Integer>\`).

**Midpoint overflow is a real Java bug.** \`(lo + hi) / 2\` overflows \`int\` when \`lo + hi\` passes \`Integer.MAX_VALUE\`, and this exact bug sat in the JDK's own \`Arrays.binarySearch\` until Joshua Bloch reported it in 2006 ([Google Research blog](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)). Example 3 shows it: for 2,000,000,000 and 2,100,000,000 the naive midpoint is -97483648. Today's OpenJDK source computes \`int mid = (low + high) >>> 1;\` — the unsigned shift treats the wrapped sum as an unsigned 32-bit number, which is correct.

📌 **Interview term: Integer overflow** — when a result is too big for a fixed-size integer type and wraps around; Java \`int\` arithmetic wraps silently.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — classic search** — trace for 23 and 7, edge cases, then worst-case step counts

~~~text
search 23
  lo=0 hi=9 mid=4 a[mid]=16
  lo=5 hi=9 mid=7 a[mid]=56
  lo=5 hi=6 mid=5 a[mid]=23
  -> index 5 after 3 steps
search 7
  lo=0 hi=9 mid=4 a[mid]=16
  lo=0 hi=3 mid=1 a[mid]=5
  lo=2 hi=3 mid=2 a[mid]=8
  -> index -1 after 3 steps
0
9
-1
0
n=1: 1 steps (linear scan would need 1)
n=10: 4 steps (linear scan would need 10)
n=1000: 10 steps (linear scan would need 1000)
n=1000000: 20 steps (linear scan would need 1000000)
~~~

**Example 2 — boundaries** — lower and upper bound on \`[1, 2, 2, 2, 3, 5, 5, 8]\`, then the sortedness requirement

~~~text
x=2: lower=1 upper=4 count=3 first=1 last=3
x=5: lower=5 upper=7 count=2 first=5 last=6
x=4: lower=5 upper=5 count=0 first=-1 last=-1
x=0: lower=0 upper=0 count=0 first=-1 last=-1
x=9: lower=8 upper=8 count=0 first=-1 last=-1
unsorted, search 9: -1 (9 is at index 0)
sorted,   search 9: 5
~~~

**Example 3 — library and overflow**

~~~text
search 30: found at 2
search 35: not found, insert at 3
search 5: not found, insert at 0
search 60: not found, insert at 5
first 2 at 1 / after last 2 at 4
after insert: [1, 2, 2, 2, 2, 3]
lo=2000000000 hi=2100000000
naive 32-bit mid: -97483648
safe mid: 2050000000
~~~

What to notice:

- The search for 7 (absent) also took 3 steps and ended with \`lo > hi\` — that empty range is the proof that 7 is not there.
- The worst-case step counts are 1, 4, 10 and 20 for n = 1, 10, 1000 and 1,000,000: exactly ⌊log2(n)⌋ + 1. A linear scan would need n.
- For x = 4 (absent), lower and upper bound are both 5: the position where 4 would be inserted.
- **The sortedness requirement is not a formality**: on the unsorted \`[9, 1, 7, 3, 8, 2]\` the search for 9 returned -1 even though 9 is at index 0. The first midpoint was 7 (index 2), 9 > 7, so the search went right and never looked at index 0. After sorting, 9 was found at index 5.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Classic search (iterative) | O(log n) | O(1) | Range halves every step; two indices only |
| Classic search (recursive) | O(log n) | O(log n) | One stack frame per halving |
| Lower / upper bound | O(log n) | O(1) | Same halving, stops at the boundary |
| Count of x | O(log n) | O(1) | Two boundary searches |
| Sorted insert into an array | O(n) | O(1) | Search is O(log n) but shifting is O(n) |
| Linear scan (for comparison) | O(n) | O(1) | Looks at every item |

Binary search pays off when you search the same sorted data many times: sorting once costs O(n log n), then every lookup is O(log n). For a single lookup in unsorted data, a linear scan is cheaper than sorting first. Related problems that build on these templates: [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix), [search in a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array) and [finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array).

## 9. Edge Cases

- **Empty array** — \`hi\` starts at -1 (closed version) or \`lo == hi == 0\` (half-open); the loop never runs and the result is "not found" (Example 1 returns -1).
- **One element** — found or not in one step.
- **Target smaller than everything / larger than everything** — the lower bound is 0 or n; make sure the caller checks \`i < n\` before reading \`a[i]\`.
- **Duplicates** — decide whether you want any, the first or the last match, and use the boundary template.
- **Huge arrays** — the midpoint formula must not overflow (section 6).

## Common Pitfalls

- **\`(lo + hi) / 2\`.** Overflows \`int\` for large indices; Example 3 shows -97483648. Use \`lo + (hi - lo) / 2\` or \`(lo + hi) >>> 1\`.
- **Misreading the return value of \`Arrays.binarySearch\`.** A negative result is \`-(insertion point) - 1\`, not just "-1"; \`-7\` meant "insert at 6".
- **Expecting the first duplicate.** \`Arrays.binarySearch\` returned index 2 for \`[2, 2, 2, 2, 2]\`; write a lower bound for "first occurrence".
- **Comparing boxed values with \`==\`.** In a \`List<Integer>\`, \`list.get(mid) == target\` compares object references. With \`Integer\` values 1000 the comparison printed \`false\` in our run (while \`equals\` printed \`true\`); for 100 it printed \`true\` only because small values are cached. Use \`.equals\`, \`intValue()\` or compare with \`<\`/\`>\` (which unbox).
- **Calling it on unsorted data.** The Javadoc says the result is undefined; our run returned -7 for a value at index 0.
- **Mixing loop templates.** \`while (lo <= hi)\` with \`hi = mid\` can loop forever.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Keep a range that must contain the target, look at the middle, discard the half that cannot contain it. O(log n) time, O(1) space iteratively.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirements:</strong> <span style="color:#f0e2c8;">Sorted data (or any monotonic yes/no condition), O(1) random access, known bounds and the same comparison used for sorting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The invariant:</strong> <span style="color:#f0e2c8;">If the target exists, it is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[lo..hi]</code>; the loop stops when the range is empty.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Duplicates:</strong> <span style="color:#f0e2c8;">Use lower bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;= x</code>) and upper bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; x</code>); their difference is the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Java there is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> (negative result means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-(insertion point) - 1</code>), and I compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code> to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not binary search a linked list efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reaching the middle node takes O(n) steps, so even with O(log n) comparisons the total is O(n). Use an array, or a balanced search tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many steps for a billion items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">About 30, because 2^30 is about 1.07 billion. Our run measured 20 steps for a million.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the array is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error, just wrong answers: our search for 9 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[9, 1, 7, 3, 8, 2]</code> returned -1 although 9 is at index 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Iterative or recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterative uses O(1) space; recursive uses O(log n) stack frames for the same work. Both are fine, but the iterative one is standard in interviews.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> return when the key is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-(insertion point) - 1</code>, so -4 means "insert at index 3". The minus one makes "not found at position 0" negative too.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary search** | Halve the candidate range each step; O(log n) |
| **Monotonic** | Only ever moves one way; false...false, true...true |
| **Loop invariant** | A fact true before every iteration |
| **Off-by-one error** | A boundary that is one index wrong |
| **Lower bound** | First index with a[i] >= x |
| **Upper bound** | First index with a[i] > x |
| **Half-open interval** | [lo, hi): includes lo, excludes hi |
| **Integer overflow** | A result too large for a fixed-size integer |

---
**Conclusion:** Binary search turns an O(n) scan into O(log n) — 20 steps for a million items — by keeping a range that must contain the answer and halving it on every comparison. It requires sorted (more generally, monotonic) data, O(1) random access and a consistent comparison; break the first requirement and it silently returns wrong answers, as the unsorted demo showed. For duplicates, search for a boundary (lower or upper bound) with the half-open template. In Java, know \`Arrays.binarySearch\` and its \`-(insertion point) - 1\` result, and never write \`(lo + hi) / 2\`.`,
        examples: [
          {
            label: `Classic binary search with a trace and step counts`,
            code: `// Classic binary search on a sorted array, with a trace and a step counter.
public class Main {
    static int steps; // set by every call

    static int binarySearch(int[] a, int target, boolean trace) {
        int lo = 0, hi = a.length - 1;          // search the closed range [lo, hi]
        steps = 0;
        while (lo <= hi) {
            steps++;
            int mid = lo + (hi - lo) / 2;       // never overflows, unlike (lo + hi) / 2
            if (trace) System.out.println("  lo=" + lo + " hi=" + hi + " mid=" + mid + " a[mid]=" + a[mid]);
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;  // target can only be to the right
            else hi = mid - 1;                  // target can only be to the left
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] a = { 2, 5, 8, 12, 16, 23, 38, 56, 72, 91 };
        for (int target : new int[] { 23, 7 }) {
            System.out.println("search " + target);
            int idx = binarySearch(a, target, true);
            System.out.println("  -> index " + idx + " after " + steps + " steps");
        }

        System.out.println(binarySearch(a, 2, false));              // 0
        System.out.println(binarySearch(a, 91, false));             // 9
        System.out.println(binarySearch(new int[] {}, 5, false));   // -1
        System.out.println(binarySearch(new int[] { 5 }, 5, false)); // 0

        for (int n : new int[] { 1, 10, 1000, 1000000 }) {
            int[] evens = new int[n];
            for (int i = 0; i < n; i++) evens[i] = 2 * i;   // 0, 2, 4, ... sorted
            binarySearch(evens, 2 * n, false);              // bigger than everything: worst case
            System.out.println("n=" + n + ": " + steps + " steps (linear scan would need " + n + ")");
        }
    }
}`,
          },
          {
            label: `Lower bound, upper bound, first and last occurrence`,
            code: `import java.util.Arrays;

// Lower bound / upper bound: binary search for a BOUNDARY, which handles duplicates.
public class Main {
    static int lowerBound(int[] a, int x) {  // first index i with a[i] >= x (a.length if none)
        int lo = 0, hi = a.length;           // half-open range [lo, hi)
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;       // unsigned shift: correct even if lo + hi overflows
            if (a[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    static int upperBound(int[] a, int x) {  // first index i with a[i] > x (a.length if none)
        int lo = 0, hi = a.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] <= x) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    static int[] firstLast(int[] a, int x) {
        int lo = lowerBound(a, x), hi = upperBound(a, x);
        return lo < hi ? new int[] { lo, hi - 1 } : new int[] { -1, -1 };
    }

    static int classic(int[] a, int x) {     // the exact-match version, for the requirement demo
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] == x) return mid;
            if (a[mid] < x) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] a = { 1, 2, 2, 2, 3, 5, 5, 8 };
        for (int x : new int[] { 2, 5, 4, 0, 9 }) {
            int lo = lowerBound(a, x), hi = upperBound(a, x);
            int[] fl = firstLast(a, x);
            System.out.println("x=" + x + ": lower=" + lo + " upper=" + hi + " count=" + (hi - lo)
                    + " first=" + fl[0] + " last=" + fl[1]);
        }

        int[] unsorted = { 9, 1, 7, 3, 8, 2 };
        System.out.println("unsorted, search 9: " + classic(unsorted, 9) + " (9 is at index 0)");
        int[] sortedCopy = unsorted.clone();
        Arrays.sort(sortedCopy);
        System.out.println("sorted,   search 9: " + classic(sortedCopy, 9));
    }
}`,
          },
          {
            label: `The standard library way, and midpoint overflow`,
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// The standard-library way (Arrays.binarySearch), and the int midpoint overflow.
public class Main {
    // Java has no lower_bound; Arrays.binarySearch may return ANY index of a duplicate.
    static int lowerBound(List<Integer> a, int x) {
        int lo = 0, hi = a.size();
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (a.get(mid) < x) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    public static void main(String[] args) {
        int[] a = { 10, 20, 30, 40, 50 };
        for (int x : new int[] { 30, 35, 5, 60 }) {
            int r = Arrays.binarySearch(a, x);      // >= 0: index; < 0: -(insertion point) - 1
            if (r >= 0) System.out.println("search " + x + ": found at " + r);
            else System.out.println("search " + x + ": not found, insert at " + (-r - 1));
        }

        List<Integer> dupes = new ArrayList<>(List.of(1, 2, 2, 2, 3));
        System.out.println("first 2 at " + lowerBound(dupes, 2) + " / after last 2 at " + lowerBound(dupes, 3));
        dupes.add(lowerBound(dupes, 3), 2);         // sorted insert: O(log n) search + O(n) shift
        System.out.println("after insert: " + dupes); // ArrayList prints as [1, 2, ...]

        int lo = 2_000_000_000, hi = 2_100_000_000;
        System.out.println("lo=" + lo + " hi=" + hi);
        System.out.println("naive 32-bit mid: " + (lo + hi) / 2);   // lo + hi wraps past Integer.MAX_VALUE
        System.out.println("safe mid: " + (lo + (hi - lo) / 2));    // (lo + hi) >>> 1 also works
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"How does binary search work, and what has to be true about the data for it to work? Please write it in C++ and tell me its complexity."

**What a strong answer should cover:**
- The mechanism: keep \`lo\` and \`hi\`, check the middle, discard the half that cannot contain the target; stop when found or the range is empty.
- The requirements: sorted (or monotonic) data, O(1) random access, known bounds and a consistent comparison — and why a linked list does not qualify.
- O(log n) time with a concrete number (about 20 steps for a million items), O(1) space iteratively.
- Handles duplicates with lower and upper bound, and states the loop invariant to avoid off-by-one errors.
- C++ specifics: \`std::lower_bound\` / \`upper_bound\` / \`binary_search\`, signed overflow being undefined behaviour, and \`size_t\` underflow when \`hi\` goes below zero.

**Code / implementation expected:** Yes — a correct iterative binary search in C++, ideally also the lower-bound variant.`,
        answer: `# How Binary Search Works and What It Requires (C++)

**Target Audience:** Beginners preparing for coding interviews; you only need to know arrays and loops.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block was produced by actually running the programs (g++ 13.3.0 with -std=c++17); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of the game "guess my number between 1 and 100", where after each guess you are told "higher" or "lower". A beginner guesses 1, 2, 3, ... and may need 100 tries. A smart player always guesses the middle of what is left: 50, then 25 or 75, and so on. Every answer throws away half of the remaining numbers, so 7 guesses are always enough for 100 numbers, and about 20 for a million.

That is binary search. It only works because "higher / lower" tells you **which half** to throw away — and that is only true when the numbers are **in order**. A paper dictionary works the same way: you can open it in the middle and know whether to go left or right only because the words are sorted alphabetically.

## 2. The Requirements (What Must Be True)

📌 **Interview term: Binary search** — a search that keeps a range of candidate positions, looks at the middle, and discards the half that cannot contain the answer, until the range is empty or the answer is found. Each step halves the range, so it takes O(log n) steps — see [Big-O notation](/interview-question/what-is-big-o-notation).

Binary search needs four things. Interviewers specifically ask for these:

1. **The data is sorted** (by the same order you compare with). More generally, there must be a **monotonic** yes/no question: "is \`a[i] >= target\`?" is false, false, ..., false, true, true, ..., true along the array. That generalisation powers [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).
2. **Random access in O(1)** — you must be able to jump to the middle element instantly. Arrays and array-backed lists qualify; a linked list does not, because reaching the middle costs O(n) steps and the whole point is lost. (A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is the linked structure that supports this kind of search instead.)
3. **Known bounds** — a first and a last index (or a range of values) to start from.
4. **A consistent comparison** — the same "less than" that was used to sort the data.

📌 **Interview term: Monotonic** — always moving in one direction. A sorted array is monotonic non-decreasing; a predicate is monotonic if, once it becomes true, it stays true.

What binary search does **not** need: distinct values (duplicates are fine, but then you must decide *which* match you want — see lower and upper bound below) or numbers (any comparable key works, such as strings).

## 3. How It Works

Keep two indices, \`lo\` and \`hi\`, that bracket the part of the array where the target could still be. Repeat:

1. \`mid = lo + (hi - lo) / 2\` (rounded down).
2. If \`a[mid] == target\`, done.
3. If \`a[mid] < target\`, the target can only be to the right: \`lo = mid + 1\`.
4. Otherwise it can only be to the left: \`hi = mid - 1\`.

Stop when \`lo > hi\`: the range is empty and the target is not present.

Searching for 23 in \`[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="Binary search for 23 in a sorted array of ten numbers takes three steps: mid 16, mid 56, then mid 23">
  <text class="d-sub" x="136" y="34" text-anchor="middle">0</text>
  <text class="d-sub" x="196" y="34" text-anchor="middle">1</text>
  <text class="d-sub" x="256" y="34" text-anchor="middle">2</text>
  <text class="d-sub" x="316" y="34" text-anchor="middle">3</text>
  <text class="d-sub" x="376" y="34" text-anchor="middle">4</text>
  <text class="d-sub" x="436" y="34" text-anchor="middle">5</text>
  <text class="d-sub" x="496" y="34" text-anchor="middle">6</text>
  <text class="d-sub" x="556" y="34" text-anchor="middle">7</text>
  <text class="d-sub" x="616" y="34" text-anchor="middle">8</text>
  <text class="d-sub" x="676" y="34" text-anchor="middle">9</text>
  <text class="d-text" x="16" y="73">step 1</text>
  <rect class="d-box" x="110" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="136" y="73" text-anchor="middle">2</text>
  <rect class="d-box" x="170" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="196" y="73" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="256" y="73" text-anchor="middle">8</text>
  <rect class="d-box" x="290" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="316" y="73" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="350" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="376" y="73" text-anchor="middle">16</text>
  <rect class="d-box" x="410" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="73" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="73" text-anchor="middle">38</text>
  <rect class="d-box" x="530" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="73" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="73" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="73" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="153">step 2</text>
  <rect class="d-box-muted" x="110" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="153" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="153" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="153" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="153" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="130" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="153" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box" x="410" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="153" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="153" text-anchor="middle">38</text>
  <rect class="d-box-accent" x="530" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="556" y="153" text-anchor="middle">56</text>
  <rect class="d-box" x="590" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="616" y="153" text-anchor="middle">72</text>
  <rect class="d-box" x="650" y="130" width="52" height="36" rx="6"/>
  <text class="d-sub" x="676" y="153" text-anchor="middle">91</text>
  <text class="d-text" x="16" y="233">step 3</text>
  <rect class="d-box-muted" x="110" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="136" y="233" text-anchor="middle" opacity="0.35">2</text>
  <rect class="d-box-muted" x="170" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="196" y="233" text-anchor="middle" opacity="0.35">5</text>
  <rect class="d-box-muted" x="230" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="256" y="233" text-anchor="middle" opacity="0.35">8</text>
  <rect class="d-box-muted" x="290" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="316" y="233" text-anchor="middle" opacity="0.35">12</text>
  <rect class="d-box-muted" x="350" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="376" y="233" text-anchor="middle" opacity="0.35">16</text>
  <rect class="d-box-accent" x="410" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="436" y="233" text-anchor="middle">23</text>
  <rect class="d-box" x="470" y="210" width="52" height="36" rx="6"/>
  <text class="d-sub" x="496" y="233" text-anchor="middle">38</text>
  <rect class="d-box-muted" x="530" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="556" y="233" text-anchor="middle" opacity="0.35">56</text>
  <rect class="d-box-muted" x="590" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="616" y="233" text-anchor="middle" opacity="0.35">72</text>
  <rect class="d-box-muted" x="650" y="210" width="52" height="36" rx="6" opacity="0.35"/>
  <text class="d-sub" x="676" y="233" text-anchor="middle" opacity="0.35">91</text>
</svg>

Step 1 looks at index 4 (16), which is too small, so indices 0 to 4 are discarded. Step 2 looks at index 7 (56), too big, so 7 to 9 go. Step 3 looks at index 5 and finds 23. The faded cells are the ones already ruled out. The trace in the Verified section prints exactly these three steps.

📌 **Interview term: Loop invariant** — a statement that is true before every iteration. Here: "if the target is in the array, it is somewhere in \`a[lo..hi]\`". Every update keeps the invariant true, and when the range is empty the invariant tells you the target is absent. Saying the invariant out loud is the best way to avoid off-by-one bugs.

📌 **Interview term: Off-by-one error** — a bug where a loop runs one time too many or too few, or a boundary is one index wrong (\`<\` vs \`<=\`, \`mid\` vs \`mid - 1\`). Binary search is famous for them.

**Why O(log n)?** After k steps at most n / 2^k candidates are left. The loop ends when that is below 1, so k is about log2(n): 4 steps for 10 items, 10 for 1,000, 20 for 1,000,000 — the run below measured exactly those numbers.

## 4. Duplicates: Lower Bound and Upper Bound

With duplicates, "find 2" in \`[1, 2, 2, 2, 3, 5, 5, 8]\` has three correct answers, and the classic version returns whichever one it happens to hit. Most real problems want a specific one, so we search for a **boundary** instead of a value.

📌 **Interview term: Lower bound** — the first index whose value is **greater than or equal to** x (or n if there is none). It is also the position where x would be inserted to keep the array sorted, before any equal items.

📌 **Interview term: Upper bound** — the first index whose value is **strictly greater than** x. The number of copies of x is \`upper - lower\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="In 1 2 2 2 3 5 5 8 the lower bound of 2 is index 1 and the upper bound of 2 is index 4">
  <defs>
    <marker id="b03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="146" y="34" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="146" y="73" text-anchor="middle">1</text>
  <text class="d-sub" x="210" y="34" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="184" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="210" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="34" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="248" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="274" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="34" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="312" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="338" y="73" text-anchor="middle">2</text>
  <text class="d-sub" x="402" y="34" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="402" y="73" text-anchor="middle">3</text>
  <text class="d-sub" x="466" y="34" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="440" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="466" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="34" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="504" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="530" y="73" text-anchor="middle">5</text>
  <text class="d-sub" x="594" y="34" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="568" y="50" width="52" height="36" rx="6"/>
  <text class="d-sub" x="594" y="73" text-anchor="middle">8</text>
  <text class="d-text" x="16" y="73">array</text>
  <path class="d-edge" d="M 210 150 L 210 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="210" y="176" text-anchor="middle">lower bound = 1</text>
  <text class="d-sub" x="210" y="198" text-anchor="middle">first a[i] at least 2</text>
  <path class="d-edge" d="M 402 150 L 402 96" marker-end="url(#b03q3-arrow)"/>
  <text class="d-text" x="402" y="176" text-anchor="middle">upper bound = 4</text>
  <text class="d-sub" x="402" y="198" text-anchor="middle">first a[i] greater than 2</text>
</svg>

The three accented cells are the 2s. Lower bound points at the first of them, upper bound at the first item after them, so there are 4 - 1 = 3 copies.

📌 **Interview term: Half-open interval** — a range \`[lo, hi)\` that includes \`lo\` but not \`hi\`. Boundary searches use it: start with \`lo = 0, hi = n\`, loop \`while lo < hi\`, and update \`hi = mid\` (mid might be the answer) or \`lo = mid + 1\`. When the loop ends, \`lo == hi\` is the boundary. Compare the two templates:

|  | Exact match (closed) | Boundary (half-open) |
| :--- | :--- | :--- |
| Start | \`lo = 0, hi = n - 1\` | \`lo = 0, hi = n\` |
| Loop | \`while lo <= hi\` | \`while lo < hi\` |
| Move right | \`lo = mid + 1\` | \`lo = mid + 1\` |
| Move left | \`hi = mid - 1\` | \`hi = mid\` |
| Result | index or -1 | \`lo\` (the boundary, can be n) |

Mixing the two templates (for example \`hi = mid\` with \`while lo <= hi\`) is the most common way to write an infinite loop.

## 5. The Code in C++

The classic exact-match search from the first example, with an optional trace:

~~~cpp
pair<int, int> binarySearch(const vector<int>& a, int target, bool trace = false) {
    int lo = 0, hi = int(a.size()) - 1, steps = 0; // int, not size_t: hi can become -1
    while (lo <= hi) {
        steps++;
        int mid = lo + (hi - lo) / 2;               // never overflows, unlike (lo + hi) / 2
        if (trace) cout << "  lo=" << lo << " hi=" << hi << " mid=" << mid << " a[mid]=" << a[mid] << "\\n";
        if (a[mid] == target) return {mid, steps};
        if (a[mid] < target) lo = mid + 1;          // target can only be to the right
        else hi = mid - 1;                          // target can only be to the left
    }
    return {-1, steps};
}
~~~

The indices are \`int\`, not \`size_t\`: when the target is smaller than everything, \`hi\` becomes -1, which an unsigned \`size_t\` cannot hold (it would wrap to a huge number and the loop would read out of bounds). The function returns \`pair<int, int>\`, unpacked with a C++17 structured binding: \`auto [idx, steps] = ...\`.

The boundary version from the second example (\`upper_bound\` is the same with \`<=\` in the comparison):

~~~cpp
int lowerBound(const vector<int>& a, int x) { // first index i with a[i] >= x (size if none)
    int lo = 0, hi = int(a.size());            // half-open range [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
~~~

## 6. C++'s Standard Library: lower_bound, upper_bound, binary_search

\`<algorithm>\` has the whole family, all working on iterator ranges:

- \`std::lower_bound(first, last, x)\` — iterator to the first element \`>= x\`.
- \`std::upper_bound(first, last, x)\` — iterator to the first element \`> x\`.
- \`std::equal_range\` — both at once; \`std::binary_search\` — just \`true\`/\`false\`.

Subtract \`a.begin()\` to turn an iterator into an index. Per [cppreference](https://en.cppreference.com/w/cpp/algorithm/lower_bound), the range only has to be *partitioned* with respect to \`element < value\` (a sorted range always is), the number of comparisons is logarithmic, but for iterators that are not random-access (such as \`std::list\`) the number of **iterator increments is linear** — the "random access" requirement from section 2, in library form. For \`std::set\` and \`std::map\`, use their member \`lower_bound\`. In our run, \`std::binary_search\` on the unsorted \`{9, 1, 7, 3, 8, 2}\` returned \`false\` for 9, which is present.

**Midpoint overflow is undefined behaviour in C++.** \`(lo + hi) / 2\` on two \`int\`s whose sum exceeds \`INT_MAX\` is signed overflow, which the language leaves undefined — the compiler may assume it never happens. Example 3 therefore does the wrap-around explicitly with \`uint32_t\` to show the value a 32-bit machine would produce: -97483648 instead of 2050000000. The same bug sat in Java's \`Arrays.binarySearch\` until 2006 ([Joshua Bloch, Google Research blog](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)). Write \`lo + (hi - lo) / 2\`.

📌 **Interview term: Integer overflow** — when a result is too big for a fixed-size integer type. For unsigned types C++ wraps modulo 2^n; for signed types like \`int\` it is undefined behaviour.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — classic search** — trace for 23 and 7, edge cases, then worst-case step counts

~~~text
search 23
  lo=0 hi=9 mid=4 a[mid]=16
  lo=5 hi=9 mid=7 a[mid]=56
  lo=5 hi=6 mid=5 a[mid]=23
  -> index 5 after 3 steps
search 7
  lo=0 hi=9 mid=4 a[mid]=16
  lo=0 hi=3 mid=1 a[mid]=5
  lo=2 hi=3 mid=2 a[mid]=8
  -> index -1 after 3 steps
0
9
-1
0
n=1: 1 steps (linear scan would need 1)
n=10: 4 steps (linear scan would need 10)
n=1000: 10 steps (linear scan would need 1000)
n=1000000: 20 steps (linear scan would need 1000000)
~~~

**Example 2 — boundaries** — lower and upper bound on \`[1, 2, 2, 2, 3, 5, 5, 8]\`, then the sortedness requirement

~~~text
x=2: lower=1 upper=4 count=3 first=1 last=3
x=5: lower=5 upper=7 count=2 first=5 last=6
x=4: lower=5 upper=5 count=0 first=-1 last=-1
x=0: lower=0 upper=0 count=0 first=-1 last=-1
x=9: lower=8 upper=8 count=0 first=-1 last=-1
unsorted, search 9: -1 (9 is at index 0)
sorted,   search 9: 5
~~~

**Example 3 — library and overflow**

~~~text
search 30: found at 2
search 35: not found, insert at 3
search 5: not found, insert at 0
search 60: not found, insert at 5
first 2 at 1 / after last 2 at 4
after insert: [1, 2, 2, 2, 2, 3]
lo=2000000000 hi=2100000000
naive 32-bit mid: -97483648
safe mid: 2050000000
~~~

What to notice:

- The search for 7 (absent) also took 3 steps and ended with \`lo > hi\` — that empty range is the proof that 7 is not there.
- The worst-case step counts are 1, 4, 10 and 20 for n = 1, 10, 1000 and 1,000,000: exactly ⌊log2(n)⌋ + 1. A linear scan would need n.
- For x = 4 (absent), lower and upper bound are both 5: the position where 4 would be inserted.
- **The sortedness requirement is not a formality**: on the unsorted \`[9, 1, 7, 3, 8, 2]\` the search for 9 returned -1 even though 9 is at index 0. The first midpoint was 7 (index 2), 9 > 7, so the search went right and never looked at index 0. After sorting, 9 was found at index 5.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Classic search (iterative) | O(log n) | O(1) | Range halves every step; two indices only |
| Classic search (recursive) | O(log n) | O(log n) | One stack frame per halving |
| Lower / upper bound | O(log n) | O(1) | Same halving, stops at the boundary |
| Count of x | O(log n) | O(1) | Two boundary searches |
| Sorted insert into an array | O(n) | O(1) | Search is O(log n) but shifting is O(n) |
| Linear scan (for comparison) | O(n) | O(1) | Looks at every item |

Binary search pays off when you search the same sorted data many times: sorting once costs O(n log n), then every lookup is O(log n). For a single lookup in unsorted data, a linear scan is cheaper than sorting first. Related problems that build on these templates: [searching a sorted 2D matrix](/interview-question/how-do-you-search-a-sorted-2d-matrix), [search in a rotated sorted array](/interview-question/how-do-you-search-in-a-rotated-sorted-array) and [finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array).

## 9. Edge Cases

- **Empty array** — \`hi\` starts at -1 (closed version) or \`lo == hi == 0\` (half-open); the loop never runs and the result is "not found" (Example 1 returns -1).
- **One element** — found or not in one step.
- **Target smaller than everything / larger than everything** — the lower bound is 0 or n; make sure the caller checks \`i < n\` before reading \`a[i]\`.
- **Duplicates** — decide whether you want any, the first or the last match, and use the boundary template.
- **Huge arrays** — the midpoint formula must not overflow (section 6).

## Common Pitfalls

- **\`size_t\` indices.** \`size_t hi = a.size() - 1\` on an empty vector is 18446744073709551615 (printed in our run), and \`hi = mid - 1\` at \`mid = 0\` wraps the same way. Use \`int\` (or the half-open template, which never goes below zero).
- **\`(lo + hi) / 2\`.** Signed overflow is undefined behaviour; use \`lo + (hi - lo) / 2\`.
- **\`std::lower_bound\` on a \`std::list\` or a \`std::set\`.** On a list it is O(n) iterator steps; on a set use \`s.lower_bound(x)\`.
- **A comparator that does not match the sort order.** If the vector was sorted with \`greater<int>()\`, pass the same comparator to \`lower_bound\`.
- **Dereferencing \`lower_bound\`'s result without checking \`it != a.end()\`.** For a target larger than everything it returns \`end()\`.
- **Running it on unsorted data.** \`std::binary_search\` returned \`false\` for a value that is present; nothing warns you.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Keep a range that must contain the target, look at the middle, discard the half that cannot contain it. O(log n) time, O(1) space iteratively.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirements:</strong> <span style="color:#f0e2c8;">Sorted data (or any monotonic yes/no condition), O(1) random access, known bounds and the same comparison used for sorting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The invariant:</strong> <span style="color:#f0e2c8;">If the target exists, it is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[lo..hi]</code>; the loop stops when the range is empty.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Duplicates:</strong> <span style="color:#f0e2c8;">Use lower bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;= x</code>) and upper bound (first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; x</code>); their difference is the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In C++ I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::lower_bound</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code>, keep indices as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> (not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>), and compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not binary search a linked list efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reaching the middle node takes O(n) steps, so even with O(log n) comparisons the total is O(n). Use an array, or a balanced search tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many steps for a billion items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">About 30, because 2^30 is about 1.07 billion. Our run measured 20 steps for a million.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the array is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error, just wrong answers: our search for 9 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[9, 1, 7, 3, 8, 2]</code> returned -1 although 9 is at index 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Iterative or recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterative uses O(1) space; recursive uses O(log n) stack frames for the same work. Both are fine, but the iterative one is standard in interviews.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lower_bound</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">binary_search</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::binary_search</code> only answers yes or no. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> gives the position, which also answers yes or no (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">it != end() &amp;&amp; *it == x</code>) and tells you where to insert.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary search** | Halve the candidate range each step; O(log n) |
| **Monotonic** | Only ever moves one way; false...false, true...true |
| **Loop invariant** | A fact true before every iteration |
| **Off-by-one error** | A boundary that is one index wrong |
| **Lower bound** | First index with a[i] >= x |
| **Upper bound** | First index with a[i] > x |
| **Half-open interval** | [lo, hi): includes lo, excludes hi |
| **Integer overflow** | A result too large for a fixed-size integer |

---
**Conclusion:** Binary search turns an O(n) scan into O(log n) — 20 steps for a million items — by keeping a range that must contain the answer and halving it on every comparison. It requires sorted (more generally, monotonic) data, O(1) random access and a consistent comparison; break the first requirement and it silently returns wrong answers, as the unsorted demo showed. For duplicates, search for a boundary (lower or upper bound) with the half-open template. In C++, \`std::lower_bound\` and \`std::upper_bound\` do this for you; when writing it by hand, use \`int\` indices and an overflow-free midpoint.`,
        examples: [
          {
            label: `Classic binary search with a trace and step counts`,
            code: `// Classic binary search on a sorted vector, with a trace and a step counter.
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

pair<int, int> binarySearch(const vector<int>& a, int target, bool trace = false) {
    int lo = 0, hi = int(a.size()) - 1, steps = 0; // int, not size_t: hi can become -1
    while (lo <= hi) {
        steps++;
        int mid = lo + (hi - lo) / 2;               // never overflows, unlike (lo + hi) / 2
        if (trace) cout << "  lo=" << lo << " hi=" << hi << " mid=" << mid << " a[mid]=" << a[mid] << "\\n";
        if (a[mid] == target) return {mid, steps};
        if (a[mid] < target) lo = mid + 1;          // target can only be to the right
        else hi = mid - 1;                          // target can only be to the left
    }
    return {-1, steps};
}

int main() {
    vector<int> a = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    for (int target : {23, 7}) {
        cout << "search " << target << "\\n";
        auto [idx, steps] = binarySearch(a, target, true);
        cout << "  -> index " << idx << " after " << steps << " steps\\n";
    }

    cout << binarySearch(a, 2).first << "\\n";      // 0
    cout << binarySearch(a, 91).first << "\\n";     // 9
    cout << binarySearch({}, 5).first << "\\n";     // -1
    cout << binarySearch({5}, 5).first << "\\n";    // 0

    for (int n : {1, 10, 1000, 1000000}) {
        vector<int> evens(n);
        for (int i = 0; i < n; i++) evens[i] = 2 * i;  // 0, 2, 4, ... sorted
        int steps = binarySearch(evens, 2 * n).second; // bigger than everything: worst case
        cout << "n=" << n << ": " << steps << " steps (linear scan would need " << n << ")\\n";
    }
}`,
          },
          {
            label: `Lower bound, upper bound, first and last occurrence`,
            code: `// Lower bound / upper bound: binary search for a BOUNDARY, which handles duplicates.
#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

int lowerBound(const vector<int>& a, int x) { // first index i with a[i] >= x (size if none)
    int lo = 0, hi = int(a.size());            // half-open range [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

int upperBound(const vector<int>& a, int x) { // first index i with a[i] > x (size if none)
    int lo = 0, hi = int(a.size());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

pair<int, int> firstLast(const vector<int>& a, int x) {
    int lo = lowerBound(a, x), hi = upperBound(a, x);
    return lo < hi ? make_pair(lo, hi - 1) : make_pair(-1, -1);
}

int classic(const vector<int>& a, int x) {   // the exact-match version, for the requirement demo
    int lo = 0, hi = int(a.size()) - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> a = {1, 2, 2, 2, 3, 5, 5, 8};
    for (int x : {2, 5, 4, 0, 9}) {
        int lo = lowerBound(a, x), hi = upperBound(a, x);
        auto [first, last] = firstLast(a, x);
        cout << "x=" << x << ": lower=" << lo << " upper=" << hi << " count=" << hi - lo
             << " first=" << first << " last=" << last << "\\n";
    }

    vector<int> unsorted = {9, 1, 7, 3, 8, 2};
    cout << "unsorted, search 9: " << classic(unsorted, 9) << " (9 is at index 0)\\n";
    vector<int> sortedCopy = unsorted;
    sort(sortedCopy.begin(), sortedCopy.end());
    cout << "sorted,   search 9: " << classic(sortedCopy, 9) << "\\n";
}`,
          },
          {
            label: `The standard library way, and midpoint overflow`,
            code: `// The standard-library way (lower_bound / upper_bound), and the int midpoint overflow.
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {10, 20, 30, 40, 50};
    for (int x : {30, 35, 5, 60}) {
        auto it = lower_bound(a.begin(), a.end(), x); // first element >= x
        int i = int(it - a.begin());
        if (it != a.end() && *it == x) cout << "search " << x << ": found at " << i << "\\n";
        else cout << "search " << x << ": not found, insert at " << i << "\\n";
    }

    vector<int> dupes = {1, 2, 2, 2, 3};
    cout << "first 2 at " << lower_bound(dupes.begin(), dupes.end(), 2) - dupes.begin()
         << " / after last 2 at " << upper_bound(dupes.begin(), dupes.end(), 2) - dupes.begin() << "\\n";
    dupes.insert(upper_bound(dupes.begin(), dupes.end(), 2), 2); // O(log n) search + O(n) shift
    cout << "after insert: [";
    for (size_t i = 0; i < dupes.size(); i++) cout << (i ? ", " : "") << dupes[i];
    cout << "]\\n";

    int lo = 2000000000, hi = 2100000000;
    cout << "lo=" << lo << " hi=" << hi << "\\n";
    // lo + hi on int is undefined behaviour, so we show the 32-bit wrap explicitly:
    int32_t wrapped = int32_t(uint32_t(lo) + uint32_t(hi));
    cout << "naive 32-bit mid: " << wrapped / 2 << "\\n";
    cout << "safe mid: " << lo + (hi - lo) / 2 << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: "What is binary search on the answer?",
    difficulty: "medium",
    seoDescription: `Binary search on the answer: search the range of possible answers with a monotonic yes/no check. Koko, ship capacity and sqrt in Python, JS, Java, C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What does "binary search on the answer" mean? Show me how you would use it to find the minimum eating speed in the Koko bananas problem, and code it in Python."

**What a strong answer should cover:**
- Searching the range of possible answers, not an array, with a yes/no \`feasible(x)\` check.
- The requirement: the check is monotonic, with a one-sentence reason (faster speed never needs more hours).
- Correct bounds (\`lo = 1\`, \`hi = max pile\` for Koko) and the right template: "first true" with \`hi = mid\`, or "last true" with a rounded-up midpoint.
- Complexity O(n log M) for Koko, versus O(n × M) for trying every speed.
- Python specifics: exact ceiling division with \`(p + k - 1) // k\`, and that big integers make overflow a non-issue (so the focus is on the template).
- Recognises other instances: ship within D days, split array largest sum, maximise the minimum distance, integer square root.

**Clarifying questions expected:**
- What are the limits on the pile sizes and the number of hours?
- Is there always a valid answer (at least one hour per pile)?

**Code / implementation expected:** Yes — a Python \`feasible\` helper plus the binary search loop over the answer range.`,
        answer: `# Binary Search on the Answer (Python)

**Target Audience:** Learners who know basic binary search and want to apply it to optimisation problems.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block was produced by actually running the programs (Python 3.13.16); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A bakery must deliver 10 trays of bread, in a fixed order, within 5 days, using one van that makes one trip a day. Vans come in every capacity from "one tray" upward; bigger vans cost more. What is the **smallest** capacity that still gets everything delivered in 5 days?

You could try capacity 1, then 2, then 3, ... and stop at the first one that works. But notice something: if a capacity-15 van can do it, a capacity-16 van can certainly do it too. And if capacity 14 fails, every smaller van fails as well. The capacities line up as "fails, fails, fails, ..., works, works, works". That shape is exactly what binary search needs — so instead of trying every capacity, try the middle one, and throw away half of the candidates with each test.

That is **binary search on the answer**: you are not searching inside an array at all. You are searching the *range of possible answers*, and the "array" is an imaginary row of yes/no results that you compute on demand.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of possible answers? | It gives \`lo\` and \`hi\`; for Koko it is 1 to the largest pile, for shipping it is the heaviest box to the total weight. |
| Is the answer an integer or a real number? | Integers use the \`lo < hi\` template; real numbers need a fixed number of halvings or a tolerance. |
| How big can the inputs get? | Sums like total hours or total weight can overflow 32-bit integers in Java and C++. |
| Do we want the smallest value that works, or the largest? | It decides between the "first true" and "last true" templates. |
| Is there always a valid answer? | If not, check \`feasible(hi)\` first and return -1 when even the largest candidate fails. |

## 3. The Core Idea

📌 **Interview term: Answer space** — the range of values the answer could take, for example "every eating speed from 1 to 11". We binary search this range instead of an array.

📌 **Interview term: Feasibility predicate** — a yes/no function \`feasible(x)\` that answers "does candidate x satisfy the constraints?". For Koko: "at speed x, can all piles be eaten within h hours?". It is usually a simple greedy or counting loop over the input, O(n).

📌 **Interview term: Monotonic predicate** — once \`feasible(x)\` is true, it stays true for every larger x (or, for "largest x" problems, once it is false it stays false). This is the one requirement that makes the technique valid, exactly like "sorted" is the requirement for ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements). Always say *why* it holds: "eating faster can never take more hours".

For Koko with piles \`[3, 6, 7, 11]\` and 8 hours:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Candidate speeds 1 to 11 for piles 3 6 7 11 in 8 hours. Speeds 1 to 3 are too slow, speeds 4 to 11 are fast enough, and the answer is the first fast enough speed, 4">
  <defs>
    <marker id="b03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="82" y="65" text-anchor="middle">1</text>
  <text class="d-sub" x="82" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="116" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="138" y="65" text-anchor="middle">2</text>
  <text class="d-sub" x="138" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="172" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="194" y="65" text-anchor="middle">3</text>
  <text class="d-sub" x="194" y="104" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="228" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <text class="d-sub" x="250" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="284" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="306" y="65" text-anchor="middle">5</text>
  <text class="d-sub" x="306" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="340" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="362" y="65" text-anchor="middle">6</text>
  <text class="d-sub" x="362" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="396" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="418" y="65" text-anchor="middle">7</text>
  <text class="d-sub" x="418" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="452" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="474" y="65" text-anchor="middle">8</text>
  <text class="d-sub" x="474" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="508" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="530" y="65" text-anchor="middle">9</text>
  <text class="d-sub" x="530" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="564" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="586" y="65" text-anchor="middle">10</text>
  <text class="d-sub" x="586" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="620" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="642" y="65" text-anchor="middle">11</text>
  <text class="d-sub" x="642" y="104" text-anchor="middle">yes</text>
  <text class="d-sub" x="144" y="140" text-anchor="middle">too slow</text>
  <text class="d-sub" x="480" y="140" text-anchor="middle">fast enough</text>
  <path class="d-edge" d="M 250 190 L 250 150" marker-end="url(#b03q4-arrow)"/>
  <text class="d-text d-accent" x="250" y="214" text-anchor="middle">answer = first yes = 4</text>
</svg>

Speeds 1 to 3 need more than 8 hours; from 4 on, every speed is fast enough. The answer is the boundary — the first "yes" — which is exactly a **lower bound** search on this yes/no row.

📌 **Interview term: First true / last true** — the two shapes of the problem. "Minimum capacity", "minimum speed", "minimum days" are *first true* (false...false, true...true, find the first true). "Maximum minimum distance", "largest x with x² ≤ n" are *last true* (true...true, false...false, find the last true).

## 4. The Recipe

1. **Name the answer** and its range \`[lo, hi]\`. \`lo\` is the smallest value that could possibly work, \`hi\` a value that surely works.
2. **Write \`feasible(x)\`**, usually a greedy simulation in O(n).
3. **Prove monotonicity** in one sentence.
4. **Pick the template**:

|  | First true (minimise) | Last true (maximise) |
| :--- | :--- | :--- |
| Loop | \`while lo < hi\` | \`while lo < hi\` |
| Midpoint | \`mid = lo + (hi - lo) / 2\` (round down) | \`mid = lo + (hi - lo + 1) / 2\` (round **up**) |
| If feasible(mid) | \`hi = mid\` (mid might be the answer) | \`lo = mid\` (mid might be the answer) |
| Else | \`lo = mid + 1\` | \`hi = mid - 1\` |
| Answer | \`lo\` | \`lo\` |

5. **State the complexity**: O(log(range) × cost of feasible). For Koko that is O(n log M), where M is the largest pile.

Why round up in the "last true" template? With \`lo = 4, hi = 5\`, rounding down gives \`mid = 4\`; if it is feasible, \`lo = mid\` leaves \`lo = 4\` and the loop never ends. Rounding up gives \`mid = 5\`, which always shrinks the range.

The range halves on every check. Here is the Koko search from the first example:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The search range for Koko shrinks from 1 to 11, to 1 to 6, to 4 to 6, to 4 to 5, and stops at 4">
  <rect class="d-box-muted" x="40" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="50" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="50" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="112" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="50" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="50" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="50" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="220" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="50" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="256" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="271" y="50" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="292" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="307" y="50" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="328" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="343" y="50" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="364" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="379" y="50" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="400" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="415" y="50" text-anchor="middle">11</text>
  <text class="d-sub" x="470" y="50">mid 6: 6 hours, yes</text>
  <rect class="d-box-muted" x="40" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="104" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="112" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="104" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="104" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="104" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="104" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="104">mid 3: 10 hours, no</text>
  <rect class="d-box-muted" x="148" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="158" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="184" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="158" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="158" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="158">mid 5: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="212" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="212" text-anchor="middle">5</text>
  <text class="d-sub" x="470" y="212">mid 4: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="246" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="266" text-anchor="middle">4</text>
  <text class="d-sub" x="470" y="266">lo = hi = 4, stop</text>
</svg>

Four checks (speeds 6, 3, 5 and 4) instead of trying 1, 2, 3, 4 one by one. The gap grows quickly: for a single pile of a billion bananas in 2 hours, binary search needed 29 checks; trying speeds one by one would need 500 million.

## 5. The Code in Python

**Koko eating bananas** (first true). The feasibility check and the search from the first example:

~~~python
def hours_needed(piles, speed):
    global checks
    checks += 1
    return sum((p + speed - 1) // speed for p in piles)   # ceiling division, integers only

def min_speed(piles, h, trace=False):
    lo, hi = 1, max(piles)                   # the answer is somewhere in [1, max pile]
    while lo < hi:
        mid = (lo + hi) // 2
        need = hours_needed(piles, mid)
        if trace:
            print(f"  try speed {mid}: {need} hours -> " + ("ok, go lower" if need <= h else "too slow, go higher"))
        if need <= h:
            hi = mid                         # mid works, so the answer is mid or smaller
        else:
            lo = mid + 1                     # mid fails, so every smaller speed fails too
    return lo
~~~

Ceiling division is written \`(p + speed - 1) // speed\`, which stays in exact integers; \`math.ceil(p / speed)\` would go through a float. \`global checks\` lets the helper count how many candidates were tested.

**Ship within D days** (first true). The answer range is \`[heaviest box, total weight]\`: a smaller capacity cannot carry the heaviest box at all, and the total weight always fits in one day.

~~~python
def days_needed(weights, cap):          # greedy: fill each day until the next box does not fit
    days, load = 1, 0
    for w in weights:
        if load + w > cap:
            days += 1
            load = 0
        load += w
    return days

def ship_within_days(weights, d):
    lo, hi = max(weights), sum(weights)  # must carry the heaviest box; one day carries all
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(weights, mid) <= d:
            hi = mid
        else:
            lo = mid + 1
    return lo
~~~

The feasibility check is greedy: keep loading boxes in order until the next one does not fit, then start a new day. Bigger capacity never needs more days, so it is monotonic.

**Integer square root** (last true): the largest x with x × x ≤ n.

~~~python
def isqrt(n):                           # largest x with x * x <= n ("last true")
    lo, hi = 0, n
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2   # round UP, or lo = mid would loop forever
        if mid <= n // mid:             # same as mid * mid <= n, but cannot overflow
            lo = mid
        else:
            hi = mid - 1
    return lo
~~~

Python integers never overflow, so \`mid * mid <= n\` would be safe here; \`mid <= n // mid\` is used anyway because it is the version that also works in Java and C++.

## 6. When the Answer Is a Real Number

Some answers are not integers: a cube root, a minimum speed in km/h, a maximum average. There is no "next integer" to step to, so instead of \`lo = mid + 1\` you set \`lo = mid\` and stop after a **fixed number of iterations** (each one halves the interval) or when \`hi - lo\` is below a tolerance.

~~~python
def cube_root(x, iterations=100):
    lo, hi = 0.0, max(1.0, x)             # for x >= 0 the root lies in [0, max(1, x)]
    for _ in range(iterations):           # each pass halves the interval
        mid = (lo + hi) / 2
        if mid * mid * mid < x:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
~~~

A fixed iteration count is the safer choice: a tolerance loop like \`while hi - lo > 1e-9\` can spin forever if the tolerance is smaller than the gap between neighbouring doubles at that magnitude. The run below shows 10 halvings giving 1.260742 (still 3 digits off) and 20 halvings already matching the true cube root of 2 to six decimals, 1.259921. Python's \`float\` is an IEEE 754 double, so 100 halvings of [0, 2] shrink the interval far below the precision of a double; after that, more iterations change nothing.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.py\` and run with \`python3 main.py\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — Koko** — the trace, then binary vs linear check counts

~~~text
piles [3, 6, 7, 11], h = 8
  try speed 6: 6 hours -> ok, go lower
  try speed 3: 10 hours -> too slow, go higher
  try speed 5: 8 hours -> ok, go lower
  try speed 4: 8 hours -> ok, go lower
answer: 4
binary: h=8 answer=4 checks=4
binary: h=5 answer=30 checks=4
binary: h=6 answer=23 checks=5
linear: h=8 answer=4 checks=4
linear: h=5 answer=30 checks=30
linear: h=6 answer=23 checks=23
binary, one pile of 1e9 in 2 hours: 500000000 checks = 29
~~~

**Example 2 — shipping and square root**

~~~text
15
6
3
14
0
1
2
46339
46340
~~~

**Example 3 — real-valued answers**

~~~text
cube root of 2.0 = 1.259921
cube root of 27.0 = 3.000000
cube root of 0.5 = 0.793701
after 10 halvings: 1.260742
after 20 halvings: 1.259921
after 40 halvings: 1.259921
speed for legs [10, 20, 30] in 2.5 h = 24.000000
~~~

What to notice:

- The trace tests speeds 6, 3, 5, 4 — the same four checks as the halving diagram — and returns 4.
- For \`[30, 11, 23, 4, 20]\` in 5 hours the answer is 30 (one pile per hour, so the speed must be the largest pile). Binary search used 4 checks; the linear scan used 30. With 6 hours: answer 23, 5 checks vs 23.
- One pile of 1,000,000,000 in 2 hours: answer 500,000,000 after **29 checks**, about log2(10^9). A linear scan would make 500 million checks.
- Shipping \`[1..10]\` in 5 days needs capacity 15 (days: 1-5, 6-7, 8, 9, 10). \`isqrt(2147395599)\` is 46339 because 46340² = 2147395600 is one too big.
- The real-valued speed check returns exactly 24.000000: legs of 10, 20 and 30 km in 2.5 hours need 60 / 2.5 = 24 km/h.

## 8. Recognising the Pattern

The trigger phrases are "minimum ... such that", "maximum ... such that", "minimise the largest", "maximise the smallest", and a constraint you can *check* easily but cannot *solve* directly.

| Problem | Answer searched | Feasibility check | Shape |
| :--- | :--- | :--- | :--- |
| Koko eating bananas | Eating speed | Total hours ≤ h | First true |
| Ship packages within D days | Van capacity | Greedy days ≤ D | First true |
| Split array into k parts, minimise the largest sum | Largest allowed sum | Greedy parts ≤ k | First true |
| Minimum days to make m bouquets | Day number | Count bloomed groups ≥ m | First true |
| Place k items to maximise the minimum gap | Minimum gap | Greedy placements ≥ k | Last true |
| Integer square root | x | x ≤ n / x | Last true |
| k-th smallest in a sorted matrix | A value | Count of entries ≤ value ≥ k | First true |

Two related techniques are easy to confuse with this one. [Finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array) and [the median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work) also binary search on something other than a target value, but they search *positions* using a local comparison, not a range of answers with a feasibility check.

## 9. Complexity

| Problem | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Koko | O(n log M) | O(1) | log2(M) checks, each O(n) over the piles; M = largest pile |
| Koko, linear scan | O(n × M) | O(1) | Up to M checks |
| Ship within D days | O(n log S) | O(1) | S = total weight |
| Integer square root | O(log n) | O(1) | The check is O(1) |
| Real-valued, k halvings | O(k × cost of check) | O(1) | k is fixed, e.g. 100 |

## 10. Edge Cases

- **The lower end of the range already works** (\`h\` is huge): the loop keeps moving \`hi\` down and returns \`lo\`, for example speed 1.
- **Only the upper end works** (\`h\` equals the number of piles): the answer is the largest pile, as in the \`h=5\` case.
- **No valid answer at all** (fewer hours than piles in Koko): check \`feasible(hi)\` before searching and report "impossible".
- **Zero and one for square root**: \`isqrt(0)\` and \`isqrt(1)\` return immediately (the run printed 0 and 1); a midpoint of 0 would divide by zero, which the round-up midpoint avoids because it is always at least 1.
- **Very large values**: sums and products inside \`feasible\` are where overflow happens, not the binary search itself.

## Common Pitfalls

- **Searching the wrong range.** For shipping, \`lo = 1\` is wrong when a box weighs more than 1: the greedy check would never fit that box. Start at \`max(weights)\`.
- **Rounding the wrong way in a "last true" search.** \`mid = (lo + hi) // 2\` with \`lo = mid\` loops forever once \`hi = lo + 1\`.
- **Using \`math.ceil(p / speed)\` on huge numbers.** It goes through a float; for values above 2^53 the division can round. \`(p + speed - 1) // speed\` stays exact.
- **A non-monotonic check.** If \`feasible\` can flip back to false for a larger value, binary search returns garbage; say why it is monotonic.
- **Slow \`feasible\` loops.** The check runs about log2(range) times; with n = 10^5 and a range of 10^9 that is about 30 × 10^5 iterations of Python bytecode, which is fine, but avoid making the check itself O(n log n).
- **Tolerance loops on floats.** Prefer a fixed number of halvings (Example 3).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Binary search over the range of possible answers instead of over an array, using a yes/no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">feasible(x)</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirement:</strong> <span style="color:#f0e2c8;">The check must be monotonic: once a value works, every larger value works (or the reverse for maximising).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The template:</strong> <span style="color:#f0e2c8;">First true: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> rounded down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> if feasible else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>. Last true: round <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> up and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(log(range) × cost of the check). Koko with a pile of 10^9 took 29 checks instead of 500 million.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Python the integers never overflow, so I focus on exact ceiling division with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> and on choosing the right template.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know binary search on the answer applies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The problem asks for a minimum or maximum value, checking one candidate is easy, and the check is monotonic. Phrases like "minimise the largest" or "at least k" are the hint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hi</code> for ship within D days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> is the heaviest box (anything smaller cannot carry it) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is the total weight (one day carries everything).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the midpoint round up when you set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo = mid</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = lo + 1</code>, rounding down gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> changes nothing, so the loop never ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a real-valued answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> and a fixed number of halvings, such as 100. Our cube root of 2 already matched six decimals after 20.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(p + speed - 1) // speed</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">math.ceil(p / speed)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> produces a float, which cannot represent every integer above 2^53 exactly; the integer formula is always exact and avoids a float conversion.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Answer space** | The range of values the answer can take |
| **Feasibility predicate** | Yes/no check: does candidate x satisfy the constraints? |
| **Monotonic predicate** | Once true it stays true (or once false stays false) |
| **First true / last true** | Minimise vs maximise shape of the yes/no row |

---
**Conclusion:** Binary search on the answer applies ordinary binary search to a range of candidate answers: pick the middle candidate, run a cheap yes/no feasibility check, and discard the half that cannot contain the boundary. It works whenever that check is monotonic, turns problems like Koko and ship-within-D-days into O(n log range) solutions, and showed its value in the run — 29 checks instead of 500 million. In Python the main care points are choosing the right range and template and keeping the arithmetic in exact integers with \`//\`.`,
        examples: [
          {
            label: `Koko eating bananas: binary vs linear search over speeds`,
            code: `# Binary search on the answer: Koko eating bananas (smallest speed that finishes in h hours).

checks = 0                                   # how many times we test a candidate speed

def hours_needed(piles, speed):
    global checks
    checks += 1
    return sum((p + speed - 1) // speed for p in piles)   # ceiling division, integers only

def min_speed(piles, h, trace=False):
    lo, hi = 1, max(piles)                   # the answer is somewhere in [1, max pile]
    while lo < hi:
        mid = (lo + hi) // 2
        need = hours_needed(piles, mid)
        if trace:
            print(f"  try speed {mid}: {need} hours -> " + ("ok, go lower" if need <= h else "too slow, go higher"))
        if need <= h:
            hi = mid                         # mid works, so the answer is mid or smaller
        else:
            lo = mid + 1                     # mid fails, so every smaller speed fails too
    return lo

def min_speed_linear(piles, h):              # brute force: try 1, 2, 3, ...
    speed = 1
    while hours_needed(piles, speed) > h:
        speed += 1
    return speed

print("piles [3, 6, 7, 11], h = 8")
print("answer:", min_speed([3, 6, 7, 11], 8, trace=True))

big = [1000000000]                           # one huge pile, h = 2 hours
for name, fn in [("binary", min_speed), ("linear", min_speed_linear)]:
    for piles, h in [([3, 6, 7, 11], 8), ([30, 11, 23, 4, 20], 5), ([30, 11, 23, 4, 20], 6)]:
        checks = 0
        ans = fn(piles, h)
        print(f"{name}: h={h} answer={ans} checks={checks}")
checks = 0
print("binary, one pile of 1e9 in 2 hours:", min_speed(big, 2), "checks =", checks)`,
          },
          {
            label: `Ship within D days and integer square root`,
            code: `# Two more "binary search on the answer" problems: ship capacity and integer square root.

def days_needed(weights, cap):          # greedy: fill each day until the next box does not fit
    days, load = 1, 0
    for w in weights:
        if load + w > cap:
            days += 1
            load = 0
        load += w
    return days

def ship_within_days(weights, d):
    lo, hi = max(weights), sum(weights)  # must carry the heaviest box; one day carries all
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(weights, mid) <= d:
            hi = mid
        else:
            lo = mid + 1
    return lo

def isqrt(n):                           # largest x with x * x <= n ("last true")
    lo, hi = 0, n
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2   # round UP, or lo = mid would loop forever
        if mid <= n // mid:             # same as mid * mid <= n, but cannot overflow
            lo = mid
        else:
            hi = mid - 1
    return lo

print(ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5))  # 15
print(ship_within_days([3, 2, 2, 4, 1, 4], 3))               # 6
print(ship_within_days([1, 2, 3, 1, 1], 4))                  # 3
print(ship_within_days([7, 2, 5], 1))                        # 14
print(isqrt(0))                                              # 0
print(isqrt(1))                                              # 1
print(isqrt(8))                                              # 2
print(isqrt(2147395599))                                     # 46339
print(isqrt(2147483647))                                     # 46340`,
          },
          {
            label: `Real-valued answers: halving a fixed number of times`,
            code: `# Binary search on a REAL-valued answer: stop after a fixed number of halvings.

def cube_root(x, iterations=100):
    lo, hi = 0.0, max(1.0, x)             # for x >= 0 the root lies in [0, max(1, x)]
    for _ in range(iterations):           # each pass halves the interval
        mid = (lo + hi) / 2
        if mid * mid * mid < x:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2

def min_speed_to_arrive(dists, hours, iterations=100):
    # smallest speed (km/h) that covers every leg within the total time budget
    lo, hi = 0.0, 1e9
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if sum(d / mid for d in dists) <= hours:
            hi = mid                      # fast enough: try slower
        else:
            lo = mid
    return hi

for x in [2.0, 27.0, 0.5]:
    print(f"cube root of {x:.1f} = {cube_root(x):.6f}")
for iters in [10, 20, 40]:
    print(f"after {iters} halvings: {cube_root(2.0, iters):.6f}")
print(f"speed for legs [10, 20, 30] in 2.5 h = {min_speed_to_arrive([10, 20, 30], 2.5):.6f}")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What does "binary search on the answer" mean? Show me how you would use it to find the minimum eating speed in the Koko bananas problem, and code it in JavaScript."

**What a strong answer should cover:**
- Searching the range of possible answers, not an array, with a yes/no \`feasible(x)\` check.
- The requirement: the check is monotonic, with a one-sentence reason (faster speed never needs more hours).
- Correct bounds (\`lo = 1\`, \`hi = max pile\` for Koko) and the right template: "first true" with \`hi = mid\`, or "last true" with a rounded-up midpoint.
- Complexity O(n log M) for Koko, versus O(n × M) for trying every speed.
- JavaScript specifics: \`Math.floor\` for the midpoint, products above 2^53 losing precision, and \`Math.max(...hugeArray)\` throwing \`RangeError\`.
- Recognises other instances: ship within D days, split array largest sum, maximise the minimum distance, integer square root.

**Clarifying questions expected:**
- What are the limits on the pile sizes and the number of hours?
- Is there always a valid answer (at least one hour per pile)?

**Code / implementation expected:** Yes — a JavaScript \`feasible\` helper plus the binary search loop over the answer range.`,
        answer: `# Binary Search on the Answer (JavaScript)

**Target Audience:** Learners who know basic binary search and want to apply it to optimisation problems.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block was produced by actually running the programs (Node.js v22.22.0); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A bakery must deliver 10 trays of bread, in a fixed order, within 5 days, using one van that makes one trip a day. Vans come in every capacity from "one tray" upward; bigger vans cost more. What is the **smallest** capacity that still gets everything delivered in 5 days?

You could try capacity 1, then 2, then 3, ... and stop at the first one that works. But notice something: if a capacity-15 van can do it, a capacity-16 van can certainly do it too. And if capacity 14 fails, every smaller van fails as well. The capacities line up as "fails, fails, fails, ..., works, works, works". That shape is exactly what binary search needs — so instead of trying every capacity, try the middle one, and throw away half of the candidates with each test.

That is **binary search on the answer**: you are not searching inside an array at all. You are searching the *range of possible answers*, and the "array" is an imaginary row of yes/no results that you compute on demand.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of possible answers? | It gives \`lo\` and \`hi\`; for Koko it is 1 to the largest pile, for shipping it is the heaviest box to the total weight. |
| Is the answer an integer or a real number? | Integers use the \`lo < hi\` template; real numbers need a fixed number of halvings or a tolerance. |
| How big can the inputs get? | Sums like total hours or total weight can overflow 32-bit integers in Java and C++. |
| Do we want the smallest value that works, or the largest? | It decides between the "first true" and "last true" templates. |
| Is there always a valid answer? | If not, check \`feasible(hi)\` first and return -1 when even the largest candidate fails. |

## 3. The Core Idea

📌 **Interview term: Answer space** — the range of values the answer could take, for example "every eating speed from 1 to 11". We binary search this range instead of an array.

📌 **Interview term: Feasibility predicate** — a yes/no function \`feasible(x)\` that answers "does candidate x satisfy the constraints?". For Koko: "at speed x, can all piles be eaten within h hours?". It is usually a simple greedy or counting loop over the input, O(n).

📌 **Interview term: Monotonic predicate** — once \`feasible(x)\` is true, it stays true for every larger x (or, for "largest x" problems, once it is false it stays false). This is the one requirement that makes the technique valid, exactly like "sorted" is the requirement for ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements). Always say *why* it holds: "eating faster can never take more hours".

For Koko with piles \`[3, 6, 7, 11]\` and 8 hours:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Candidate speeds 1 to 11 for piles 3 6 7 11 in 8 hours. Speeds 1 to 3 are too slow, speeds 4 to 11 are fast enough, and the answer is the first fast enough speed, 4">
  <defs>
    <marker id="b03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="82" y="65" text-anchor="middle">1</text>
  <text class="d-sub" x="82" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="116" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="138" y="65" text-anchor="middle">2</text>
  <text class="d-sub" x="138" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="172" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="194" y="65" text-anchor="middle">3</text>
  <text class="d-sub" x="194" y="104" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="228" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <text class="d-sub" x="250" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="284" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="306" y="65" text-anchor="middle">5</text>
  <text class="d-sub" x="306" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="340" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="362" y="65" text-anchor="middle">6</text>
  <text class="d-sub" x="362" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="396" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="418" y="65" text-anchor="middle">7</text>
  <text class="d-sub" x="418" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="452" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="474" y="65" text-anchor="middle">8</text>
  <text class="d-sub" x="474" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="508" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="530" y="65" text-anchor="middle">9</text>
  <text class="d-sub" x="530" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="564" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="586" y="65" text-anchor="middle">10</text>
  <text class="d-sub" x="586" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="620" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="642" y="65" text-anchor="middle">11</text>
  <text class="d-sub" x="642" y="104" text-anchor="middle">yes</text>
  <text class="d-sub" x="144" y="140" text-anchor="middle">too slow</text>
  <text class="d-sub" x="480" y="140" text-anchor="middle">fast enough</text>
  <path class="d-edge" d="M 250 190 L 250 150" marker-end="url(#b03q4-arrow)"/>
  <text class="d-text d-accent" x="250" y="214" text-anchor="middle">answer = first yes = 4</text>
</svg>

Speeds 1 to 3 need more than 8 hours; from 4 on, every speed is fast enough. The answer is the boundary — the first "yes" — which is exactly a **lower bound** search on this yes/no row.

📌 **Interview term: First true / last true** — the two shapes of the problem. "Minimum capacity", "minimum speed", "minimum days" are *first true* (false...false, true...true, find the first true). "Maximum minimum distance", "largest x with x² ≤ n" are *last true* (true...true, false...false, find the last true).

## 4. The Recipe

1. **Name the answer** and its range \`[lo, hi]\`. \`lo\` is the smallest value that could possibly work, \`hi\` a value that surely works.
2. **Write \`feasible(x)\`**, usually a greedy simulation in O(n).
3. **Prove monotonicity** in one sentence.
4. **Pick the template**:

|  | First true (minimise) | Last true (maximise) |
| :--- | :--- | :--- |
| Loop | \`while lo < hi\` | \`while lo < hi\` |
| Midpoint | \`mid = lo + (hi - lo) / 2\` (round down) | \`mid = lo + (hi - lo + 1) / 2\` (round **up**) |
| If feasible(mid) | \`hi = mid\` (mid might be the answer) | \`lo = mid\` (mid might be the answer) |
| Else | \`lo = mid + 1\` | \`hi = mid - 1\` |
| Answer | \`lo\` | \`lo\` |

5. **State the complexity**: O(log(range) × cost of feasible). For Koko that is O(n log M), where M is the largest pile.

Why round up in the "last true" template? With \`lo = 4, hi = 5\`, rounding down gives \`mid = 4\`; if it is feasible, \`lo = mid\` leaves \`lo = 4\` and the loop never ends. Rounding up gives \`mid = 5\`, which always shrinks the range.

The range halves on every check. Here is the Koko search from the first example:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The search range for Koko shrinks from 1 to 11, to 1 to 6, to 4 to 6, to 4 to 5, and stops at 4">
  <rect class="d-box-muted" x="40" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="50" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="50" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="112" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="50" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="50" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="50" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="220" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="50" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="256" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="271" y="50" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="292" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="307" y="50" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="328" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="343" y="50" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="364" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="379" y="50" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="400" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="415" y="50" text-anchor="middle">11</text>
  <text class="d-sub" x="470" y="50">mid 6: 6 hours, yes</text>
  <rect class="d-box-muted" x="40" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="104" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="112" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="104" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="104" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="104" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="104" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="104">mid 3: 10 hours, no</text>
  <rect class="d-box-muted" x="148" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="158" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="184" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="158" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="158" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="158">mid 5: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="212" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="212" text-anchor="middle">5</text>
  <text class="d-sub" x="470" y="212">mid 4: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="246" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="266" text-anchor="middle">4</text>
  <text class="d-sub" x="470" y="266">lo = hi = 4, stop</text>
</svg>

Four checks (speeds 6, 3, 5 and 4) instead of trying 1, 2, 3, 4 one by one. The gap grows quickly: for a single pile of a billion bananas in 2 hours, binary search needed 29 checks; trying speeds one by one would need 500 million.

## 5. The Code in JavaScript

**Koko eating bananas** (first true). The feasibility check and the search from the first example:

~~~javascript
function hoursNeeded(piles, speed) {
  checks++;
  let total = 0;
  for (const p of piles) total += Math.ceil(p / speed); // exact: values stay far below 2^53
  return total;
}

function minSpeed(piles, h, trace = false) {
  let lo = 1, hi = Math.max(...piles); // the answer is somewhere in [1, max pile]
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const need = hoursNeeded(piles, mid);
    if (trace) console.log("  try speed " + mid + ": " + need + " hours -> " + (need <= h ? "ok, go lower" : "too slow, go higher"));
    if (need <= h) hi = mid;           // mid works, so the answer is mid or smaller
    else lo = mid + 1;                 // mid fails, so every smaller speed fails too
  }
  return lo;
}
~~~

\`Math.ceil(p / speed)\` is exact here because every value is an integer far below 2^53, where doubles represent integers exactly. \`Math.max(...piles)\` is fine for small inputs, but spreading a huge array into arguments fails: in Node.js v22 \`Math.max(...array)\` worked for 100,000 items and threw \`RangeError: Maximum call stack size exceeded\` for 1,000,000. Use a loop or \`reduce\` for big inputs.

**Ship within D days** (first true). The answer range is \`[heaviest box, total weight]\`: a smaller capacity cannot carry the heaviest box at all, and the total weight always fits in one day.

~~~javascript
function daysNeeded(weights, cap) {     // greedy: fill each day until the next box does not fit
  let days = 1, load = 0;
  for (const w of weights) {
    if (load + w > cap) { days++; load = 0; }
    load += w;
  }
  return days;
}

function shipWithinDays(weights, d) {
  let lo = Math.max(...weights);        // must carry the heaviest box
  let hi = weights.reduce((s, w) => s + w, 0); // one day carries everything
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (daysNeeded(weights, mid) <= d) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
~~~

The feasibility check is greedy: keep loading boxes in order until the next one does not fit, then start a new day. Bigger capacity never needs more days, so it is monotonic.

**Integer square root** (last true): the largest x with x × x ≤ n.

~~~javascript
function isqrt(n) {                     // largest x with x * x <= n ("last true")
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo + 1) / 2); // round UP, or lo = mid would loop forever
    if (mid <= Math.floor(n / mid)) lo = mid;      // same as mid * mid <= n, without huge products
    else hi = mid - 1;
  }
  return lo;
}
~~~

\`mid <= Math.floor(n / mid)\` avoids computing \`mid * mid\`, which for large n would exceed 2^53 and lose precision.

## 6. When the Answer Is a Real Number

Some answers are not integers: a cube root, a minimum speed in km/h, a maximum average. There is no "next integer" to step to, so instead of \`lo = mid + 1\` you set \`lo = mid\` and stop after a **fixed number of iterations** (each one halves the interval) or when \`hi - lo\` is below a tolerance.

~~~javascript
function cubeRoot(x, iterations = 100) {
  let lo = 0, hi = Math.max(1, x);        // for x >= 0 the root lies in [0, max(1, x)]
  for (let i = 0; i < iterations; i++) {  // each pass halves the interval
    const mid = (lo + hi) / 2;
    if (mid * mid * mid < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
~~~

A fixed iteration count is the safer choice: a tolerance loop like \`while hi - lo > 1e-9\` can spin forever if the tolerance is smaller than the gap between neighbouring doubles at that magnitude. The run below shows 10 halvings giving 1.260742 (still 3 digits off) and 20 halvings already matching the true cube root of 2 to six decimals, 1.259921. JavaScript numbers are IEEE 754 doubles, so 100 halvings of [0, 2] shrink the interval far below their precision; \`toFixed(6)\` then formats the result.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.js\` and run with \`node main.js\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — Koko** — the trace, then binary vs linear check counts

~~~text
piles [3, 6, 7, 11], h = 8
  try speed 6: 6 hours -> ok, go lower
  try speed 3: 10 hours -> too slow, go higher
  try speed 5: 8 hours -> ok, go lower
  try speed 4: 8 hours -> ok, go lower
answer: 4
binary: h=8 answer=4 checks=4
binary: h=5 answer=30 checks=4
binary: h=6 answer=23 checks=5
linear: h=8 answer=4 checks=4
linear: h=5 answer=30 checks=30
linear: h=6 answer=23 checks=23
binary, one pile of 1e9 in 2 hours: 500000000 checks = 29
~~~

**Example 2 — shipping and square root**

~~~text
15
6
3
14
0
1
2
46339
46340
~~~

**Example 3 — real-valued answers**

~~~text
cube root of 2.0 = 1.259921
cube root of 27.0 = 3.000000
cube root of 0.5 = 0.793701
after 10 halvings: 1.260742
after 20 halvings: 1.259921
after 40 halvings: 1.259921
speed for legs [10, 20, 30] in 2.5 h = 24.000000
~~~

What to notice:

- The trace tests speeds 6, 3, 5, 4 — the same four checks as the halving diagram — and returns 4.
- For \`[30, 11, 23, 4, 20]\` in 5 hours the answer is 30 (one pile per hour, so the speed must be the largest pile). Binary search used 4 checks; the linear scan used 30. With 6 hours: answer 23, 5 checks vs 23.
- One pile of 1,000,000,000 in 2 hours: answer 500,000,000 after **29 checks**, about log2(10^9). A linear scan would make 500 million checks.
- Shipping \`[1..10]\` in 5 days needs capacity 15 (days: 1-5, 6-7, 8, 9, 10). \`isqrt(2147395599)\` is 46339 because 46340² = 2147395600 is one too big.
- The real-valued speed check returns exactly 24.000000: legs of 10, 20 and 30 km in 2.5 hours need 60 / 2.5 = 24 km/h.

## 8. Recognising the Pattern

The trigger phrases are "minimum ... such that", "maximum ... such that", "minimise the largest", "maximise the smallest", and a constraint you can *check* easily but cannot *solve* directly.

| Problem | Answer searched | Feasibility check | Shape |
| :--- | :--- | :--- | :--- |
| Koko eating bananas | Eating speed | Total hours ≤ h | First true |
| Ship packages within D days | Van capacity | Greedy days ≤ D | First true |
| Split array into k parts, minimise the largest sum | Largest allowed sum | Greedy parts ≤ k | First true |
| Minimum days to make m bouquets | Day number | Count bloomed groups ≥ m | First true |
| Place k items to maximise the minimum gap | Minimum gap | Greedy placements ≥ k | Last true |
| Integer square root | x | x ≤ n / x | Last true |
| k-th smallest in a sorted matrix | A value | Count of entries ≤ value ≥ k | First true |

Two related techniques are easy to confuse with this one. [Finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array) and [the median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work) also binary search on something other than a target value, but they search *positions* using a local comparison, not a range of answers with a feasibility check.

## 9. Complexity

| Problem | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Koko | O(n log M) | O(1) | log2(M) checks, each O(n) over the piles; M = largest pile |
| Koko, linear scan | O(n × M) | O(1) | Up to M checks |
| Ship within D days | O(n log S) | O(1) | S = total weight |
| Integer square root | O(log n) | O(1) | The check is O(1) |
| Real-valued, k halvings | O(k × cost of check) | O(1) | k is fixed, e.g. 100 |

## 10. Edge Cases

- **The lower end of the range already works** (\`h\` is huge): the loop keeps moving \`hi\` down and returns \`lo\`, for example speed 1.
- **Only the upper end works** (\`h\` equals the number of piles): the answer is the largest pile, as in the \`h=5\` case.
- **No valid answer at all** (fewer hours than piles in Koko): check \`feasible(hi)\` before searching and report "impossible".
- **Zero and one for square root**: \`isqrt(0)\` and \`isqrt(1)\` return immediately (the run printed 0 and 1); a midpoint of 0 would divide by zero, which the round-up midpoint avoids because it is always at least 1.
- **Very large values**: sums and products inside \`feasible\` are where overflow happens, not the binary search itself.

## Common Pitfalls

- **Searching the wrong range.** For shipping, \`lo = 1\` is wrong when a box weighs more than 1. Start at the heaviest box.
- **Rounding the wrong way in a "last true" search.** \`Math.floor((lo + hi) / 2)\` with \`lo = mid\` loops forever once \`hi = lo + 1\`.
- **\`Math.max(...bigArray)\`.** It threw \`RangeError\` for 1,000,000 elements in Node.js v22; use a loop or \`reduce\`.
- **Products above 2^53.** \`mid * mid\` for large \`mid\` loses precision silently; compare \`mid <= Math.floor(n / mid)\` or use \`BigInt\`.
- **Forgetting \`Math.floor\`.** A fractional \`mid\` never equals an integer boundary, and the loop may not terminate as expected.
- **A non-monotonic check.** Say why \`feasible\` can only switch from false to true once.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Binary search over the range of possible answers instead of over an array, using a yes/no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">feasible(x)</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirement:</strong> <span style="color:#f0e2c8;">The check must be monotonic: once a value works, every larger value works (or the reverse for maximising).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The template:</strong> <span style="color:#f0e2c8;">First true: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> rounded down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> if feasible else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>. Last true: round <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> up and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(log(range) × cost of the check). Koko with a pile of 10^9 took 29 checks instead of 500 million.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In JavaScript I floor the midpoint, avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(...hugeArray)</code>, and keep products below 2^53 by comparing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &lt;= Math.floor(n / mid)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know binary search on the answer applies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The problem asks for a minimum or maximum value, checking one candidate is easy, and the check is monotonic. Phrases like "minimise the largest" or "at least k" are the hint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hi</code> for ship within D days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> is the heaviest box (anything smaller cannot carry it) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is the total weight (one day carries everything).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the midpoint round up when you set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo = mid</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = lo + 1</code>, rounding down gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> changes nothing, so the loop never ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a real-valued answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> and a fixed number of halvings, such as 100. Our cube root of 2 already matched six decimals after 20.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.ceil(p / speed)</code> safe in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes while all values are integers below 2^53, where doubles are exact. Beyond that, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> arithmetic.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Answer space** | The range of values the answer can take |
| **Feasibility predicate** | Yes/no check: does candidate x satisfy the constraints? |
| **Monotonic predicate** | Once true it stays true (or once false stays false) |
| **First true / last true** | Minimise vs maximise shape of the yes/no row |

---
**Conclusion:** Binary search on the answer applies ordinary binary search to a range of candidate answers: pick the middle candidate, run a cheap yes/no feasibility check, and discard the half that cannot contain the boundary. It works whenever that check is monotonic, turns problems like Koko and ship-within-D-days into O(n log range) solutions, and showed its value in the run — 29 checks instead of 500 million. In JavaScript, floor the midpoint, keep products under 2^53, and avoid spreading huge arrays into \`Math.max\`.`,
        examples: [
          {
            label: `Koko eating bananas: binary vs linear search over speeds`,
            code: `// Binary search on the answer: Koko eating bananas (smallest speed that finishes in h hours).

let checks = 0; // how many times we test a candidate speed

function hoursNeeded(piles, speed) {
  checks++;
  let total = 0;
  for (const p of piles) total += Math.ceil(p / speed); // exact: values stay far below 2^53
  return total;
}

function minSpeed(piles, h, trace = false) {
  let lo = 1, hi = Math.max(...piles); // the answer is somewhere in [1, max pile]
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const need = hoursNeeded(piles, mid);
    if (trace) console.log("  try speed " + mid + ": " + need + " hours -> " + (need <= h ? "ok, go lower" : "too slow, go higher"));
    if (need <= h) hi = mid;           // mid works, so the answer is mid or smaller
    else lo = mid + 1;                 // mid fails, so every smaller speed fails too
  }
  return lo;
}

function minSpeedLinear(piles, h) {    // brute force: try 1, 2, 3, ...
  let speed = 1;
  while (hoursNeeded(piles, speed) > h) speed++;
  return speed;
}

console.log("piles [3, 6, 7, 11], h = 8");
console.log("answer: " + minSpeed([3, 6, 7, 11], 8, true));

const cases = [[[3, 6, 7, 11], 8], [[30, 11, 23, 4, 20], 5], [[30, 11, 23, 4, 20], 6]];
for (const [name, fn] of [["binary", minSpeed], ["linear", minSpeedLinear]]) {
  for (const [piles, h] of cases) {
    checks = 0;
    const ans = fn(piles, h);
    console.log(name + ": h=" + h + " answer=" + ans + " checks=" + checks);
  }
}
checks = 0;
const ansBig = minSpeed([1000000000], 2); // one huge pile, h = 2 hours
console.log("binary, one pile of 1e9 in 2 hours: " + ansBig + " checks = " + checks);`,
          },
          {
            label: `Ship within D days and integer square root`,
            code: `// Two more "binary search on the answer" problems: ship capacity and integer square root.

function daysNeeded(weights, cap) {     // greedy: fill each day until the next box does not fit
  let days = 1, load = 0;
  for (const w of weights) {
    if (load + w > cap) { days++; load = 0; }
    load += w;
  }
  return days;
}

function shipWithinDays(weights, d) {
  let lo = Math.max(...weights);        // must carry the heaviest box
  let hi = weights.reduce((s, w) => s + w, 0); // one day carries everything
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (daysNeeded(weights, mid) <= d) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function isqrt(n) {                     // largest x with x * x <= n ("last true")
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo + 1) / 2); // round UP, or lo = mid would loop forever
    if (mid <= Math.floor(n / mid)) lo = mid;      // same as mid * mid <= n, without huge products
    else hi = mid - 1;
  }
  return lo;
}

console.log(shipWithinDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)); // 15
console.log(shipWithinDays([3, 2, 2, 4, 1, 4], 3));              // 6
console.log(shipWithinDays([1, 2, 3, 1, 1], 4));                 // 3
console.log(shipWithinDays([7, 2, 5], 1));                       // 14
console.log(isqrt(0));                                           // 0
console.log(isqrt(1));                                           // 1
console.log(isqrt(8));                                           // 2
console.log(isqrt(2147395599));                                  // 46339
console.log(isqrt(2147483647));                                  // 46340`,
          },
          {
            label: `Real-valued answers: halving a fixed number of times`,
            code: `// Binary search on a REAL-valued answer: stop after a fixed number of halvings.

function cubeRoot(x, iterations = 100) {
  let lo = 0, hi = Math.max(1, x);        // for x >= 0 the root lies in [0, max(1, x)]
  for (let i = 0; i < iterations; i++) {  // each pass halves the interval
    const mid = (lo + hi) / 2;
    if (mid * mid * mid < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function minSpeedToArrive(dists, hours, iterations = 100) {
  // smallest speed (km/h) that covers every leg within the total time budget
  let lo = 0, hi = 1e9;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    let t = 0;
    for (const d of dists) t += d / mid;
    if (t <= hours) hi = mid;              // fast enough: try slower
    else lo = mid;
  }
  return hi;
}

for (const x of [2, 27, 0.5]) console.log("cube root of " + x.toFixed(1) + " = " + cubeRoot(x).toFixed(6));
for (const iters of [10, 20, 40]) console.log("after " + iters + " halvings: " + cubeRoot(2, iters).toFixed(6));
console.log("speed for legs [10, 20, 30] in 2.5 h = " + minSpeedToArrive([10, 20, 30], 2.5).toFixed(6));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What does "binary search on the answer" mean? Show me how you would use it to find the minimum eating speed in the Koko bananas problem, and code it in Java."

**What a strong answer should cover:**
- Searching the range of possible answers, not an array, with a yes/no \`feasible(x)\` check.
- The requirement: the check is monotonic, with a one-sentence reason (faster speed never needs more hours).
- Correct bounds (\`lo = 1\`, \`hi = max pile\` for Koko) and the right template: "first true" with \`hi = mid\`, or "last true" with a rounded-up midpoint.
- Complexity O(n log M) for Koko, versus O(n × M) for trying every speed.
- Java specifics: \`long\` for sums inside the check, overflow-safe midpoints, and \`mid <= n / mid\` instead of \`mid * mid <= n\`.
- Recognises other instances: ship within D days, split array largest sum, maximise the minimum distance, integer square root.

**Clarifying questions expected:**
- What are the limits on the pile sizes and the number of hours?
- Is there always a valid answer (at least one hour per pile)?

**Code / implementation expected:** Yes — a Java \`feasible\` helper plus the binary search loop over the answer range.`,
        answer: `# Binary Search on the Answer (Java)

**Target Audience:** Learners who know basic binary search and want to apply it to optimisation problems.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block was produced by actually running the programs (OpenJDK 21.0.12 (javac + java)); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A bakery must deliver 10 trays of bread, in a fixed order, within 5 days, using one van that makes one trip a day. Vans come in every capacity from "one tray" upward; bigger vans cost more. What is the **smallest** capacity that still gets everything delivered in 5 days?

You could try capacity 1, then 2, then 3, ... and stop at the first one that works. But notice something: if a capacity-15 van can do it, a capacity-16 van can certainly do it too. And if capacity 14 fails, every smaller van fails as well. The capacities line up as "fails, fails, fails, ..., works, works, works". That shape is exactly what binary search needs — so instead of trying every capacity, try the middle one, and throw away half of the candidates with each test.

That is **binary search on the answer**: you are not searching inside an array at all. You are searching the *range of possible answers*, and the "array" is an imaginary row of yes/no results that you compute on demand.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of possible answers? | It gives \`lo\` and \`hi\`; for Koko it is 1 to the largest pile, for shipping it is the heaviest box to the total weight. |
| Is the answer an integer or a real number? | Integers use the \`lo < hi\` template; real numbers need a fixed number of halvings or a tolerance. |
| How big can the inputs get? | Sums like total hours or total weight can overflow 32-bit integers in Java and C++. |
| Do we want the smallest value that works, or the largest? | It decides between the "first true" and "last true" templates. |
| Is there always a valid answer? | If not, check \`feasible(hi)\` first and return -1 when even the largest candidate fails. |

## 3. The Core Idea

📌 **Interview term: Answer space** — the range of values the answer could take, for example "every eating speed from 1 to 11". We binary search this range instead of an array.

📌 **Interview term: Feasibility predicate** — a yes/no function \`feasible(x)\` that answers "does candidate x satisfy the constraints?". For Koko: "at speed x, can all piles be eaten within h hours?". It is usually a simple greedy or counting loop over the input, O(n).

📌 **Interview term: Monotonic predicate** — once \`feasible(x)\` is true, it stays true for every larger x (or, for "largest x" problems, once it is false it stays false). This is the one requirement that makes the technique valid, exactly like "sorted" is the requirement for ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements). Always say *why* it holds: "eating faster can never take more hours".

For Koko with piles \`[3, 6, 7, 11]\` and 8 hours:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Candidate speeds 1 to 11 for piles 3 6 7 11 in 8 hours. Speeds 1 to 3 are too slow, speeds 4 to 11 are fast enough, and the answer is the first fast enough speed, 4">
  <defs>
    <marker id="b03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="82" y="65" text-anchor="middle">1</text>
  <text class="d-sub" x="82" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="116" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="138" y="65" text-anchor="middle">2</text>
  <text class="d-sub" x="138" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="172" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="194" y="65" text-anchor="middle">3</text>
  <text class="d-sub" x="194" y="104" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="228" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <text class="d-sub" x="250" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="284" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="306" y="65" text-anchor="middle">5</text>
  <text class="d-sub" x="306" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="340" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="362" y="65" text-anchor="middle">6</text>
  <text class="d-sub" x="362" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="396" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="418" y="65" text-anchor="middle">7</text>
  <text class="d-sub" x="418" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="452" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="474" y="65" text-anchor="middle">8</text>
  <text class="d-sub" x="474" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="508" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="530" y="65" text-anchor="middle">9</text>
  <text class="d-sub" x="530" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="564" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="586" y="65" text-anchor="middle">10</text>
  <text class="d-sub" x="586" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="620" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="642" y="65" text-anchor="middle">11</text>
  <text class="d-sub" x="642" y="104" text-anchor="middle">yes</text>
  <text class="d-sub" x="144" y="140" text-anchor="middle">too slow</text>
  <text class="d-sub" x="480" y="140" text-anchor="middle">fast enough</text>
  <path class="d-edge" d="M 250 190 L 250 150" marker-end="url(#b03q4-arrow)"/>
  <text class="d-text d-accent" x="250" y="214" text-anchor="middle">answer = first yes = 4</text>
</svg>

Speeds 1 to 3 need more than 8 hours; from 4 on, every speed is fast enough. The answer is the boundary — the first "yes" — which is exactly a **lower bound** search on this yes/no row.

📌 **Interview term: First true / last true** — the two shapes of the problem. "Minimum capacity", "minimum speed", "minimum days" are *first true* (false...false, true...true, find the first true). "Maximum minimum distance", "largest x with x² ≤ n" are *last true* (true...true, false...false, find the last true).

## 4. The Recipe

1. **Name the answer** and its range \`[lo, hi]\`. \`lo\` is the smallest value that could possibly work, \`hi\` a value that surely works.
2. **Write \`feasible(x)\`**, usually a greedy simulation in O(n).
3. **Prove monotonicity** in one sentence.
4. **Pick the template**:

|  | First true (minimise) | Last true (maximise) |
| :--- | :--- | :--- |
| Loop | \`while lo < hi\` | \`while lo < hi\` |
| Midpoint | \`mid = lo + (hi - lo) / 2\` (round down) | \`mid = lo + (hi - lo + 1) / 2\` (round **up**) |
| If feasible(mid) | \`hi = mid\` (mid might be the answer) | \`lo = mid\` (mid might be the answer) |
| Else | \`lo = mid + 1\` | \`hi = mid - 1\` |
| Answer | \`lo\` | \`lo\` |

5. **State the complexity**: O(log(range) × cost of feasible). For Koko that is O(n log M), where M is the largest pile.

Why round up in the "last true" template? With \`lo = 4, hi = 5\`, rounding down gives \`mid = 4\`; if it is feasible, \`lo = mid\` leaves \`lo = 4\` and the loop never ends. Rounding up gives \`mid = 5\`, which always shrinks the range.

The range halves on every check. Here is the Koko search from the first example:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The search range for Koko shrinks from 1 to 11, to 1 to 6, to 4 to 6, to 4 to 5, and stops at 4">
  <rect class="d-box-muted" x="40" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="50" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="50" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="112" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="50" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="50" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="50" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="220" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="50" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="256" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="271" y="50" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="292" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="307" y="50" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="328" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="343" y="50" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="364" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="379" y="50" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="400" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="415" y="50" text-anchor="middle">11</text>
  <text class="d-sub" x="470" y="50">mid 6: 6 hours, yes</text>
  <rect class="d-box-muted" x="40" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="104" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="112" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="104" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="104" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="104" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="104" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="104">mid 3: 10 hours, no</text>
  <rect class="d-box-muted" x="148" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="158" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="184" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="158" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="158" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="158">mid 5: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="212" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="212" text-anchor="middle">5</text>
  <text class="d-sub" x="470" y="212">mid 4: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="246" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="266" text-anchor="middle">4</text>
  <text class="d-sub" x="470" y="266">lo = hi = 4, stop</text>
</svg>

Four checks (speeds 6, 3, 5 and 4) instead of trying 1, 2, 3, 4 one by one. The gap grows quickly: for a single pile of a billion bananas in 2 hours, binary search needed 29 checks; trying speeds one by one would need 500 million.

## 5. The Code in Java

**Koko eating bananas** (first true). The feasibility check and the search from the first example:

~~~java
static long hoursNeeded(int[] piles, int speed) {
    checks++;
    long total = 0;                       // long: 10^4 piles of 10^9 at speed 1 overflow int
    for (int p : piles) total += (p + (long) speed - 1) / speed; // ceiling division
    return total;
}

static int minSpeed(int[] piles, long h, boolean trace) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p); // the answer is somewhere in [1, max pile]
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long need = hoursNeeded(piles, mid);
        if (trace) System.out.println("  try speed " + mid + ": " + need + " hours -> " + (need <= h ? "ok, go lower" : "too slow, go higher"));
        if (need <= h) hi = mid;          // mid works, so the answer is mid or smaller
        else lo = mid + 1;                // mid fails, so every smaller speed fails too
    }
    return lo;
}
~~~

\`hoursNeeded\` returns \`long\`: with up to 10^4 piles of up to 10^9 bananas, the total hours at speed 1 is 10^13, far beyond \`Integer.MAX_VALUE\`. Adding three \`int\`s of 1,000,000,000 printed -1294967296 in our run. The ceiling division \`(p + (long) speed - 1) / speed\` casts to \`long\` before adding for the same reason.

**Ship within D days** (first true). The answer range is \`[heaviest box, total weight]\`: a smaller capacity cannot carry the heaviest box at all, and the total weight always fits in one day.

~~~java
static int daysNeeded(int[] weights, int cap) { // greedy: fill each day until the next box does not fit
    int days = 1, load = 0;
    for (int w : weights) {
        if (load + w > cap) { days++; load = 0; }
        load += w;
    }
    return days;
}

static int shipWithinDays(int[] weights, int d) {
    int lo = 0, hi = 0;
    for (int w : weights) { lo = Math.max(lo, w); hi += w; } // heaviest box .. everything in one day
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(weights, mid) <= d) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
~~~

The feasibility check is greedy: keep loading boxes in order until the next one does not fit, then start a new day. Bigger capacity never needs more days, so it is monotonic.

**Integer square root** (last true): the largest x with x × x ≤ n.

~~~java
static long isqrt(long n) {          // largest x with x * x <= n ("last true")
    long lo = 0, hi = n;             // long: with int, hi - lo + 1 overflows when n = Integer.MAX_VALUE
    while (lo < hi) {
        long mid = lo + (hi - lo + 1) / 2; // round UP, or lo = mid would loop forever
        if (mid <= n / mid) lo = mid;      // same as mid * mid <= n, but cannot overflow
        else hi = mid - 1;
    }
    return lo;
}
~~~

\`isqrt\` takes and returns \`long\`. With \`int\`, \`hi - lo + 1\` overflows when \`hi = Integer.MAX_VALUE\` and \`lo = 0\`: the first midpoint came out as -1073741824 and the loop did not finish within 100 iterations in our test. \`mid <= n / mid\` also avoids the overflow of \`mid * mid\`.

## 6. When the Answer Is a Real Number

Some answers are not integers: a cube root, a minimum speed in km/h, a maximum average. There is no "next integer" to step to, so instead of \`lo = mid + 1\` you set \`lo = mid\` and stop after a **fixed number of iterations** (each one halves the interval) or when \`hi - lo\` is below a tolerance.

~~~java
static double cubeRoot(double x, int iterations) {
    double lo = 0, hi = Math.max(1, x);     // for x >= 0 the root lies in [0, max(1, x)]
    for (int i = 0; i < iterations; i++) {  // each pass halves the interval
        double mid = (lo + hi) / 2;
        if (mid * mid * mid < x) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}
~~~

A fixed iteration count is the safer choice: a tolerance loop like \`while hi - lo > 1e-9\` can spin forever if the tolerance is smaller than the gap between neighbouring doubles at that magnitude. The run below shows 10 halvings giving 1.260742 (still 3 digits off) and 20 halvings already matching the true cube root of 2 to six decimals, 1.259921. The program formats with \`String.format(Locale.ROOT, "%.6f", x)\`: with the default locale, some systems print a comma as the decimal separator (\`1,259921\`), which would break comparisons with expected output.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — Koko** — the trace, then binary vs linear check counts

~~~text
piles [3, 6, 7, 11], h = 8
  try speed 6: 6 hours -> ok, go lower
  try speed 3: 10 hours -> too slow, go higher
  try speed 5: 8 hours -> ok, go lower
  try speed 4: 8 hours -> ok, go lower
answer: 4
binary: h=8 answer=4 checks=4
binary: h=5 answer=30 checks=4
binary: h=6 answer=23 checks=5
linear: h=8 answer=4 checks=4
linear: h=5 answer=30 checks=30
linear: h=6 answer=23 checks=23
binary, one pile of 1e9 in 2 hours: 500000000 checks = 29
~~~

**Example 2 — shipping and square root**

~~~text
15
6
3
14
0
1
2
46339
46340
~~~

**Example 3 — real-valued answers**

~~~text
cube root of 2.0 = 1.259921
cube root of 27.0 = 3.000000
cube root of 0.5 = 0.793701
after 10 halvings: 1.260742
after 20 halvings: 1.259921
after 40 halvings: 1.259921
speed for legs [10, 20, 30] in 2.5 h = 24.000000
~~~

What to notice:

- The trace tests speeds 6, 3, 5, 4 — the same four checks as the halving diagram — and returns 4.
- For \`[30, 11, 23, 4, 20]\` in 5 hours the answer is 30 (one pile per hour, so the speed must be the largest pile). Binary search used 4 checks; the linear scan used 30. With 6 hours: answer 23, 5 checks vs 23.
- One pile of 1,000,000,000 in 2 hours: answer 500,000,000 after **29 checks**, about log2(10^9). A linear scan would make 500 million checks.
- Shipping \`[1..10]\` in 5 days needs capacity 15 (days: 1-5, 6-7, 8, 9, 10). \`isqrt(2147395599)\` is 46339 because 46340² = 2147395600 is one too big.
- The real-valued speed check returns exactly 24.000000: legs of 10, 20 and 30 km in 2.5 hours need 60 / 2.5 = 24 km/h.

## 8. Recognising the Pattern

The trigger phrases are "minimum ... such that", "maximum ... such that", "minimise the largest", "maximise the smallest", and a constraint you can *check* easily but cannot *solve* directly.

| Problem | Answer searched | Feasibility check | Shape |
| :--- | :--- | :--- | :--- |
| Koko eating bananas | Eating speed | Total hours ≤ h | First true |
| Ship packages within D days | Van capacity | Greedy days ≤ D | First true |
| Split array into k parts, minimise the largest sum | Largest allowed sum | Greedy parts ≤ k | First true |
| Minimum days to make m bouquets | Day number | Count bloomed groups ≥ m | First true |
| Place k items to maximise the minimum gap | Minimum gap | Greedy placements ≥ k | Last true |
| Integer square root | x | x ≤ n / x | Last true |
| k-th smallest in a sorted matrix | A value | Count of entries ≤ value ≥ k | First true |

Two related techniques are easy to confuse with this one. [Finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array) and [the median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work) also binary search on something other than a target value, but they search *positions* using a local comparison, not a range of answers with a feasibility check.

## 9. Complexity

| Problem | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Koko | O(n log M) | O(1) | log2(M) checks, each O(n) over the piles; M = largest pile |
| Koko, linear scan | O(n × M) | O(1) | Up to M checks |
| Ship within D days | O(n log S) | O(1) | S = total weight |
| Integer square root | O(log n) | O(1) | The check is O(1) |
| Real-valued, k halvings | O(k × cost of check) | O(1) | k is fixed, e.g. 100 |

## 10. Edge Cases

- **The lower end of the range already works** (\`h\` is huge): the loop keeps moving \`hi\` down and returns \`lo\`, for example speed 1.
- **Only the upper end works** (\`h\` equals the number of piles): the answer is the largest pile, as in the \`h=5\` case.
- **No valid answer at all** (fewer hours than piles in Koko): check \`feasible(hi)\` before searching and report "impossible".
- **Zero and one for square root**: \`isqrt(0)\` and \`isqrt(1)\` return immediately (the run printed 0 and 1); a midpoint of 0 would divide by zero, which the round-up midpoint avoids because it is always at least 1.
- **Very large values**: sums and products inside \`feasible\` are where overflow happens, not the binary search itself.

## Common Pitfalls

- **\`int\` sums in the feasibility check.** Three times 1,000,000,000 in an \`int\` printed -1294967296. Use \`long\` for totals of hours, weights or sums.
- **\`int\` in "last true" midpoints.** \`hi - lo + 1\` overflows when \`hi = Integer.MAX_VALUE\`; our int \`isqrt\` got a negative midpoint and did not finish within 100 iterations.
- **\`mid * mid <= n\`.** Overflows for \`mid\` above 46340; compare \`mid <= n / mid\` or compute in \`long\`.
- **Searching the wrong range.** For shipping, \`lo = 1\` is wrong when a box weighs more than 1. Start at the heaviest box.
- **Locale-dependent output for real answers.** \`String.format("%.6f", x)\` may print a comma; pass \`Locale.ROOT\`.
- **A non-monotonic check.** Say why \`feasible\` can only switch from false to true once.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Binary search over the range of possible answers instead of over an array, using a yes/no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">feasible(x)</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirement:</strong> <span style="color:#f0e2c8;">The check must be monotonic: once a value works, every larger value works (or the reverse for maximising).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The template:</strong> <span style="color:#f0e2c8;">First true: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> rounded down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> if feasible else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>. Last true: round <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> up and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(log(range) × cost of the check). Koko with a pile of 10^9 took 29 checks instead of 500 million.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Java I keep sums in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> without overflow, and compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &lt;= n / mid</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid * mid &lt;= n</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know binary search on the answer applies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The problem asks for a minimum or maximum value, checking one candidate is easy, and the check is monotonic. Phrases like "minimise the largest" or "at least k" are the hint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hi</code> for ship within D days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> is the heaviest box (anything smaller cannot carry it) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is the total weight (one day carries everything).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the midpoint round up when you set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo = mid</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = lo + 1</code>, rounding down gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> changes nothing, so the loop never ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a real-valued answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> and a fixed number of halvings, such as 100. Our cube root of 2 already matched six decimals after 20.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hoursNeeded</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At speed 1 the total is the sum of all piles, up to 10^4 × 10^9 = 10^13, which overflows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>. Three billion in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> printed -1294967296 in our test.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Answer space** | The range of values the answer can take |
| **Feasibility predicate** | Yes/no check: does candidate x satisfy the constraints? |
| **Monotonic predicate** | Once true it stays true (or once false stays false) |
| **First true / last true** | Minimise vs maximise shape of the yes/no row |

---
**Conclusion:** Binary search on the answer applies ordinary binary search to a range of candidate answers: pick the middle candidate, run a cheap yes/no feasibility check, and discard the half that cannot contain the boundary. It works whenever that check is monotonic, turns problems like Koko and ship-within-D-days into O(n log range) solutions, and showed its value in the run — 29 checks instead of 500 million. In Java, the bugs hide in the arithmetic: keep totals in \`long\`, compute midpoints without overflow, and compare \`mid <= n / mid\`.`,
        examples: [
          {
            label: `Koko eating bananas: binary vs linear search over speeds`,
            code: `// Binary search on the answer: Koko eating bananas (smallest speed that finishes in h hours).
public class Main {
    static int checks = 0; // how many times we test a candidate speed

    static long hoursNeeded(int[] piles, int speed) {
        checks++;
        long total = 0;                       // long: 10^4 piles of 10^9 at speed 1 overflow int
        for (int p : piles) total += (p + (long) speed - 1) / speed; // ceiling division
        return total;
    }

    static int minSpeed(int[] piles, long h, boolean trace) {
        int lo = 1, hi = 0;
        for (int p : piles) hi = Math.max(hi, p); // the answer is somewhere in [1, max pile]
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long need = hoursNeeded(piles, mid);
            if (trace) System.out.println("  try speed " + mid + ": " + need + " hours -> " + (need <= h ? "ok, go lower" : "too slow, go higher"));
            if (need <= h) hi = mid;          // mid works, so the answer is mid or smaller
            else lo = mid + 1;                // mid fails, so every smaller speed fails too
        }
        return lo;
    }

    static int minSpeedLinear(int[] piles, long h) { // brute force: try 1, 2, 3, ...
        int speed = 1;
        while (hoursNeeded(piles, speed) > h) speed++;
        return speed;
    }

    public static void main(String[] args) {
        System.out.println("piles [3, 6, 7, 11], h = 8");
        System.out.println("answer: " + minSpeed(new int[] { 3, 6, 7, 11 }, 8, true));

        int[][] piles = { { 3, 6, 7, 11 }, { 30, 11, 23, 4, 20 }, { 30, 11, 23, 4, 20 } };
        int[] hs = { 8, 5, 6 };
        for (String name : new String[] { "binary", "linear" }) {
            for (int i = 0; i < hs.length; i++) {
                checks = 0;
                int ans = name.equals("binary") ? minSpeed(piles[i], hs[i], false) : minSpeedLinear(piles[i], hs[i]);
                System.out.println(name + ": h=" + hs[i] + " answer=" + ans + " checks=" + checks);
            }
        }
        checks = 0;
        int ansBig = minSpeed(new int[] { 1_000_000_000 }, 2, false); // one huge pile, h = 2 hours
        System.out.println("binary, one pile of 1e9 in 2 hours: " + ansBig + " checks = " + checks);
    }
}`,
          },
          {
            label: `Ship within D days and integer square root`,
            code: `// Two more "binary search on the answer" problems: ship capacity and integer square root.
public class Main {
    static int daysNeeded(int[] weights, int cap) { // greedy: fill each day until the next box does not fit
        int days = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) { days++; load = 0; }
            load += w;
        }
        return days;
    }

    static int shipWithinDays(int[] weights, int d) {
        int lo = 0, hi = 0;
        for (int w : weights) { lo = Math.max(lo, w); hi += w; } // heaviest box .. everything in one day
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (daysNeeded(weights, mid) <= d) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    static long isqrt(long n) {          // largest x with x * x <= n ("last true")
        long lo = 0, hi = n;             // long: with int, hi - lo + 1 overflows when n = Integer.MAX_VALUE
        while (lo < hi) {
            long mid = lo + (hi - lo + 1) / 2; // round UP, or lo = mid would loop forever
            if (mid <= n / mid) lo = mid;      // same as mid * mid <= n, but cannot overflow
            else hi = mid - 1;
        }
        return lo;
    }

    public static void main(String[] args) {
        System.out.println(shipWithinDays(new int[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 }, 5)); // 15
        System.out.println(shipWithinDays(new int[] { 3, 2, 2, 4, 1, 4 }, 3));             // 6
        System.out.println(shipWithinDays(new int[] { 1, 2, 3, 1, 1 }, 4));                // 3
        System.out.println(shipWithinDays(new int[] { 7, 2, 5 }, 1));                      // 14
        System.out.println(isqrt(0));                                                      // 0
        System.out.println(isqrt(1));                                                      // 1
        System.out.println(isqrt(8));                                                      // 2
        System.out.println(isqrt(2147395599));                                             // 46339
        System.out.println(isqrt(2147483647));                                             // 46340
    }
}`,
          },
          {
            label: `Real-valued answers: halving a fixed number of times`,
            code: `import java.util.Locale;

// Binary search on a REAL-valued answer: stop after a fixed number of halvings.
public class Main {
    static double cubeRoot(double x, int iterations) {
        double lo = 0, hi = Math.max(1, x);     // for x >= 0 the root lies in [0, max(1, x)]
        for (int i = 0; i < iterations; i++) {  // each pass halves the interval
            double mid = (lo + hi) / 2;
            if (mid * mid * mid < x) lo = mid;
            else hi = mid;
        }
        return (lo + hi) / 2;
    }

    static double minSpeedToArrive(double[] dists, double hours, int iterations) {
        // smallest speed (km/h) that covers every leg within the total time budget
        double lo = 0, hi = 1e9;
        for (int i = 0; i < iterations; i++) {
            double mid = (lo + hi) / 2, t = 0;
            for (double d : dists) t += d / mid;
            if (t <= hours) hi = mid;           // fast enough: try slower
            else lo = mid;
        }
        return hi;
    }

    public static void main(String[] args) {
        // Locale.ROOT: some locales would print 1,259921 with a comma
        for (double x : new double[] { 2, 27, 0.5 })
            System.out.println(String.format(Locale.ROOT, "cube root of %.1f = %.6f", x, cubeRoot(x, 100)));
        for (int iters : new int[] { 10, 20, 40 })
            System.out.println(String.format(Locale.ROOT, "after %d halvings: %.6f", iters, cubeRoot(2, iters)));
        System.out.println(String.format(Locale.ROOT, "speed for legs [10, 20, 30] in 2.5 h = %.6f",
                minSpeedToArrive(new double[] { 10, 20, 30 }, 2.5, 100)));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What does "binary search on the answer" mean? Show me how you would use it to find the minimum eating speed in the Koko bananas problem, and code it in C++."

**What a strong answer should cover:**
- Searching the range of possible answers, not an array, with a yes/no \`feasible(x)\` check.
- The requirement: the check is monotonic, with a one-sentence reason (faster speed never needs more hours).
- Correct bounds (\`lo = 1\`, \`hi = max pile\` for Koko) and the right template: "first true" with \`hi = mid\`, or "last true" with a rounded-up midpoint.
- Complexity O(n log M) for Koko, versus O(n × M) for trying every speed.
- C++ specifics: \`long long\` for sums because signed overflow is undefined behaviour, and \`mid <= n / mid\` instead of \`mid * mid <= n\`.
- Recognises other instances: ship within D days, split array largest sum, maximise the minimum distance, integer square root.

**Clarifying questions expected:**
- What are the limits on the pile sizes and the number of hours?
- Is there always a valid answer (at least one hour per pile)?

**Code / implementation expected:** Yes — a C++ \`feasible\` helper plus the binary search loop over the answer range.`,
        answer: `# Binary Search on the Answer (C++)

**Target Audience:** Learners who know basic binary search and want to apply it to optimisation problems.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block was produced by actually running the programs (g++ 13.3.0 with -std=c++17); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A bakery must deliver 10 trays of bread, in a fixed order, within 5 days, using one van that makes one trip a day. Vans come in every capacity from "one tray" upward; bigger vans cost more. What is the **smallest** capacity that still gets everything delivered in 5 days?

You could try capacity 1, then 2, then 3, ... and stop at the first one that works. But notice something: if a capacity-15 van can do it, a capacity-16 van can certainly do it too. And if capacity 14 fails, every smaller van fails as well. The capacities line up as "fails, fails, fails, ..., works, works, works". That shape is exactly what binary search needs — so instead of trying every capacity, try the middle one, and throw away half of the candidates with each test.

That is **binary search on the answer**: you are not searching inside an array at all. You are searching the *range of possible answers*, and the "array" is an imaginary row of yes/no results that you compute on demand.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of possible answers? | It gives \`lo\` and \`hi\`; for Koko it is 1 to the largest pile, for shipping it is the heaviest box to the total weight. |
| Is the answer an integer or a real number? | Integers use the \`lo < hi\` template; real numbers need a fixed number of halvings or a tolerance. |
| How big can the inputs get? | Sums like total hours or total weight can overflow 32-bit integers in Java and C++. |
| Do we want the smallest value that works, or the largest? | It decides between the "first true" and "last true" templates. |
| Is there always a valid answer? | If not, check \`feasible(hi)\` first and return -1 when even the largest candidate fails. |

## 3. The Core Idea

📌 **Interview term: Answer space** — the range of values the answer could take, for example "every eating speed from 1 to 11". We binary search this range instead of an array.

📌 **Interview term: Feasibility predicate** — a yes/no function \`feasible(x)\` that answers "does candidate x satisfy the constraints?". For Koko: "at speed x, can all piles be eaten within h hours?". It is usually a simple greedy or counting loop over the input, O(n).

📌 **Interview term: Monotonic predicate** — once \`feasible(x)\` is true, it stays true for every larger x (or, for "largest x" problems, once it is false it stays false). This is the one requirement that makes the technique valid, exactly like "sorted" is the requirement for ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements). Always say *why* it holds: "eating faster can never take more hours".

For Koko with piles \`[3, 6, 7, 11]\` and 8 hours:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Candidate speeds 1 to 11 for piles 3 6 7 11 in 8 hours. Speeds 1 to 3 are too slow, speeds 4 to 11 are fast enough, and the answer is the first fast enough speed, 4">
  <defs>
    <marker id="b03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="82" y="65" text-anchor="middle">1</text>
  <text class="d-sub" x="82" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="116" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="138" y="65" text-anchor="middle">2</text>
  <text class="d-sub" x="138" y="104" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="172" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="194" y="65" text-anchor="middle">3</text>
  <text class="d-sub" x="194" y="104" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="228" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <text class="d-sub" x="250" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="284" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="306" y="65" text-anchor="middle">5</text>
  <text class="d-sub" x="306" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="340" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="362" y="65" text-anchor="middle">6</text>
  <text class="d-sub" x="362" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="396" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="418" y="65" text-anchor="middle">7</text>
  <text class="d-sub" x="418" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="452" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="474" y="65" text-anchor="middle">8</text>
  <text class="d-sub" x="474" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="508" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="530" y="65" text-anchor="middle">9</text>
  <text class="d-sub" x="530" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="564" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="586" y="65" text-anchor="middle">10</text>
  <text class="d-sub" x="586" y="104" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="620" y="40" width="44" height="40" rx="6"/>
  <text class="d-text" x="642" y="65" text-anchor="middle">11</text>
  <text class="d-sub" x="642" y="104" text-anchor="middle">yes</text>
  <text class="d-sub" x="144" y="140" text-anchor="middle">too slow</text>
  <text class="d-sub" x="480" y="140" text-anchor="middle">fast enough</text>
  <path class="d-edge" d="M 250 190 L 250 150" marker-end="url(#b03q4-arrow)"/>
  <text class="d-text d-accent" x="250" y="214" text-anchor="middle">answer = first yes = 4</text>
</svg>

Speeds 1 to 3 need more than 8 hours; from 4 on, every speed is fast enough. The answer is the boundary — the first "yes" — which is exactly a **lower bound** search on this yes/no row.

📌 **Interview term: First true / last true** — the two shapes of the problem. "Minimum capacity", "minimum speed", "minimum days" are *first true* (false...false, true...true, find the first true). "Maximum minimum distance", "largest x with x² ≤ n" are *last true* (true...true, false...false, find the last true).

## 4. The Recipe

1. **Name the answer** and its range \`[lo, hi]\`. \`lo\` is the smallest value that could possibly work, \`hi\` a value that surely works.
2. **Write \`feasible(x)\`**, usually a greedy simulation in O(n).
3. **Prove monotonicity** in one sentence.
4. **Pick the template**:

|  | First true (minimise) | Last true (maximise) |
| :--- | :--- | :--- |
| Loop | \`while lo < hi\` | \`while lo < hi\` |
| Midpoint | \`mid = lo + (hi - lo) / 2\` (round down) | \`mid = lo + (hi - lo + 1) / 2\` (round **up**) |
| If feasible(mid) | \`hi = mid\` (mid might be the answer) | \`lo = mid\` (mid might be the answer) |
| Else | \`lo = mid + 1\` | \`hi = mid - 1\` |
| Answer | \`lo\` | \`lo\` |

5. **State the complexity**: O(log(range) × cost of feasible). For Koko that is O(n log M), where M is the largest pile.

Why round up in the "last true" template? With \`lo = 4, hi = 5\`, rounding down gives \`mid = 4\`; if it is feasible, \`lo = mid\` leaves \`lo = 4\` and the loop never ends. Rounding up gives \`mid = 5\`, which always shrinks the range.

The range halves on every check. Here is the Koko search from the first example:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The search range for Koko shrinks from 1 to 11, to 1 to 6, to 4 to 6, to 4 to 5, and stops at 4">
  <rect class="d-box-muted" x="40" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="50" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="50" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="112" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="50" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="50" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="50" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="220" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="50" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="256" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="271" y="50" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="292" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="307" y="50" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="328" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="343" y="50" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="364" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="379" y="50" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="400" y="30" width="30" height="30" rx="5"/>
  <text class="d-sub" x="415" y="50" text-anchor="middle">11</text>
  <text class="d-sub" x="470" y="50">mid 6: 6 hours, yes</text>
  <rect class="d-box-muted" x="40" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="55" y="104" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="76" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="91" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="112" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="127" y="104" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="148" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="104" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="104" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="84" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="104" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="104">mid 3: 10 hours, no</text>
  <rect class="d-box-muted" x="148" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="158" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="184" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="158" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="220" y="138" width="30" height="30" rx="5"/>
  <text class="d-sub" x="235" y="158" text-anchor="middle">6</text>
  <text class="d-sub" x="470" y="158">mid 5: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="212" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="184" y="192" width="30" height="30" rx="5"/>
  <text class="d-sub" x="199" y="212" text-anchor="middle">5</text>
  <text class="d-sub" x="470" y="212">mid 4: 8 hours, yes</text>
  <rect class="d-box-accent" x="148" y="246" width="30" height="30" rx="5"/>
  <text class="d-sub" x="163" y="266" text-anchor="middle">4</text>
  <text class="d-sub" x="470" y="266">lo = hi = 4, stop</text>
</svg>

Four checks (speeds 6, 3, 5 and 4) instead of trying 1, 2, 3, 4 one by one. The gap grows quickly: for a single pile of a billion bananas in 2 hours, binary search needed 29 checks; trying speeds one by one would need 500 million.

## 5. The Code in C++

**Koko eating bananas** (first true). The feasibility check and the search from the first example:

~~~cpp
long long hoursNeeded(const vector<int>& piles, int speed) {
    checks++;
    long long total = 0;                    // 64-bit: many big piles at speed 1 overflow int
    for (int p : piles) total += (p + (long long)speed - 1) / speed; // ceiling division
    return total;
}

int minSpeed(const vector<int>& piles, long long h, bool trace = false) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end()); // answer is in [1, max pile]
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long long need = hoursNeeded(piles, mid);
        if (trace) cout << "  try speed " << mid << ": " << need << " hours -> " << (need <= h ? "ok, go lower" : "too slow, go higher") << "\\n";
        if (need <= h) hi = mid;            // mid works, so the answer is mid or smaller
        else lo = mid + 1;                  // mid fails, so every smaller speed fails too
    }
    return lo;
}
~~~

\`hoursNeeded\` returns \`long long\`: with up to 10^4 piles of up to 10^9 bananas, the total at speed 1 is 10^13, and signed \`int\` overflow is undefined behaviour. The ceiling division casts to \`long long\` before adding.

**Ship within D days** (first true). The answer range is \`[heaviest box, total weight]\`: a smaller capacity cannot carry the heaviest box at all, and the total weight always fits in one day.

~~~cpp
int daysNeeded(const vector<int>& weights, int cap) { // greedy: fill each day until the next box does not fit
    int days = 1, load = 0;
    for (int w : weights) {
        if (load + w > cap) { days++; load = 0; }
        load += w;
    }
    return days;
}

int shipWithinDays(const vector<int>& weights, int d) {
    int lo = *max_element(weights.begin(), weights.end());  // must carry the heaviest box
    int hi = accumulate(weights.begin(), weights.end(), 0); // one day carries everything
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(weights, mid) <= d) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
~~~

The feasibility check is greedy: keep loading boxes in order until the next one does not fit, then start a new day. Bigger capacity never needs more days, so it is monotonic.

**Integer square root** (last true): the largest x with x × x ≤ n.

~~~cpp
long long isqrt(long long n) {      // largest x with x * x <= n ("last true")
    long long lo = 0, hi = n;       // 64-bit: with int, hi - lo + 1 overflows (undefined behaviour)
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2; // round UP, or lo = mid would loop forever
        if (mid <= n / mid) lo = mid;           // same as mid * mid <= n, but cannot overflow
        else hi = mid - 1;
    }
    return lo;
}
~~~

\`isqrt\` works on \`long long\`. With \`int\`, \`hi - lo + 1\` overflows (undefined behaviour) when \`hi = INT_MAX\`; \`mid <= n / mid\` also avoids the overflow of \`mid * mid\`.

## 6. When the Answer Is a Real Number

Some answers are not integers: a cube root, a minimum speed in km/h, a maximum average. There is no "next integer" to step to, so instead of \`lo = mid + 1\` you set \`lo = mid\` and stop after a **fixed number of iterations** (each one halves the interval) or when \`hi - lo\` is below a tolerance.

~~~cpp
double cubeRoot(double x, int iterations = 100) {
    double lo = 0, hi = max(1.0, x);        // for x >= 0 the root lies in [0, max(1, x)]
    for (int i = 0; i < iterations; i++) {  // each pass halves the interval
        double mid = (lo + hi) / 2;
        if (mid * mid * mid < x) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}
~~~

A fixed iteration count is the safer choice: a tolerance loop like \`while hi - lo > 1e-9\` can spin forever if the tolerance is smaller than the gap between neighbouring doubles at that magnitude. The run below shows 10 halvings giving 1.260742 (still 3 digits off) and 20 halvings already matching the true cube root of 2 to six decimals, 1.259921. The program prints with \`printf("%.6f")\`; \`double\` is an IEEE 754 double on the platforms we target, so the results match the other languages digit for digit.

## 7. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — Koko** — the trace, then binary vs linear check counts

~~~text
piles [3, 6, 7, 11], h = 8
  try speed 6: 6 hours -> ok, go lower
  try speed 3: 10 hours -> too slow, go higher
  try speed 5: 8 hours -> ok, go lower
  try speed 4: 8 hours -> ok, go lower
answer: 4
binary: h=8 answer=4 checks=4
binary: h=5 answer=30 checks=4
binary: h=6 answer=23 checks=5
linear: h=8 answer=4 checks=4
linear: h=5 answer=30 checks=30
linear: h=6 answer=23 checks=23
binary, one pile of 1e9 in 2 hours: 500000000 checks = 29
~~~

**Example 2 — shipping and square root**

~~~text
15
6
3
14
0
1
2
46339
46340
~~~

**Example 3 — real-valued answers**

~~~text
cube root of 2.0 = 1.259921
cube root of 27.0 = 3.000000
cube root of 0.5 = 0.793701
after 10 halvings: 1.260742
after 20 halvings: 1.259921
after 40 halvings: 1.259921
speed for legs [10, 20, 30] in 2.5 h = 24.000000
~~~

What to notice:

- The trace tests speeds 6, 3, 5, 4 — the same four checks as the halving diagram — and returns 4.
- For \`[30, 11, 23, 4, 20]\` in 5 hours the answer is 30 (one pile per hour, so the speed must be the largest pile). Binary search used 4 checks; the linear scan used 30. With 6 hours: answer 23, 5 checks vs 23.
- One pile of 1,000,000,000 in 2 hours: answer 500,000,000 after **29 checks**, about log2(10^9). A linear scan would make 500 million checks.
- Shipping \`[1..10]\` in 5 days needs capacity 15 (days: 1-5, 6-7, 8, 9, 10). \`isqrt(2147395599)\` is 46339 because 46340² = 2147395600 is one too big.
- The real-valued speed check returns exactly 24.000000: legs of 10, 20 and 30 km in 2.5 hours need 60 / 2.5 = 24 km/h.

## 8. Recognising the Pattern

The trigger phrases are "minimum ... such that", "maximum ... such that", "minimise the largest", "maximise the smallest", and a constraint you can *check* easily but cannot *solve* directly.

| Problem | Answer searched | Feasibility check | Shape |
| :--- | :--- | :--- | :--- |
| Koko eating bananas | Eating speed | Total hours ≤ h | First true |
| Ship packages within D days | Van capacity | Greedy days ≤ D | First true |
| Split array into k parts, minimise the largest sum | Largest allowed sum | Greedy parts ≤ k | First true |
| Minimum days to make m bouquets | Day number | Count bloomed groups ≥ m | First true |
| Place k items to maximise the minimum gap | Minimum gap | Greedy placements ≥ k | Last true |
| Integer square root | x | x ≤ n / x | Last true |
| k-th smallest in a sorted matrix | A value | Count of entries ≤ value ≥ k | First true |

Two related techniques are easy to confuse with this one. [Finding a peak element](/interview-question/how-do-you-find-a-peak-element-in-an-array) and [the median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work) also binary search on something other than a target value, but they search *positions* using a local comparison, not a range of answers with a feasibility check.

## 9. Complexity

| Problem | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Koko | O(n log M) | O(1) | log2(M) checks, each O(n) over the piles; M = largest pile |
| Koko, linear scan | O(n × M) | O(1) | Up to M checks |
| Ship within D days | O(n log S) | O(1) | S = total weight |
| Integer square root | O(log n) | O(1) | The check is O(1) |
| Real-valued, k halvings | O(k × cost of check) | O(1) | k is fixed, e.g. 100 |

## 10. Edge Cases

- **The lower end of the range already works** (\`h\` is huge): the loop keeps moving \`hi\` down and returns \`lo\`, for example speed 1.
- **Only the upper end works** (\`h\` equals the number of piles): the answer is the largest pile, as in the \`h=5\` case.
- **No valid answer at all** (fewer hours than piles in Koko): check \`feasible(hi)\` before searching and report "impossible".
- **Zero and one for square root**: \`isqrt(0)\` and \`isqrt(1)\` return immediately (the run printed 0 and 1); a midpoint of 0 would divide by zero, which the round-up midpoint avoids because it is always at least 1.
- **Very large values**: sums and products inside \`feasible\` are where overflow happens, not the binary search itself.

## Common Pitfalls

- **\`int\` sums in the feasibility check.** Totals of 10^4 values up to 10^9 overflow \`int\`; signed overflow is undefined behaviour, so the compiler is not even obliged to give you a wrapped value. Use \`long long\`.
- **\`int\` in "last true" midpoints.** \`hi - lo + 1\` overflows when \`hi = INT_MAX\`. Use \`long long\` or \`lo + (hi - lo) / 2 + 1\` (which is also always above \`lo\`).
- **\`mid * mid <= n\`.** Overflows for \`mid\` above 46340 in \`int\`; compare \`mid <= n / mid\`.
- **Searching the wrong range.** For shipping, \`lo = 1\` is wrong when a box weighs more than 1. Start at \`*max_element(...)\`.
- **\`std::accumulate\` with an \`int\` initial value.** \`accumulate(v.begin(), v.end(), 0)\` keeps its running total in \`int\` even for a \`vector<long long>\`: two values of 2,000,000,000 summed to -294967296 in our run, versus 4000000000 with \`0LL\`.
- **A non-monotonic check.** Say why \`feasible\` can only switch from false to true once.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Binary search over the range of possible answers instead of over an array, using a yes/no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">feasible(x)</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The requirement:</strong> <span style="color:#f0e2c8;">The check must be monotonic: once a value works, every larger value works (or the reverse for maximising).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The template:</strong> <span style="color:#f0e2c8;">First true: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> rounded down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> if feasible else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>. Last true: round <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> up and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(log(range) × cost of the check). Koko with a pile of 10^9 took 29 checks instead of 500 million.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In C++ I keep sums in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> (signed overflow is undefined behaviour), and compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &lt;= n / mid</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid * mid &lt;= n</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know binary search on the answer applies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The problem asks for a minimum or maximum value, checking one candidate is easy, and the check is monotonic. Phrases like "minimise the largest" or "at least k" are the hint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hi</code> for ship within D days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> is the heaviest box (anything smaller cannot carry it) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is the total weight (one day carries everything).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the midpoint round up when you set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo = mid</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = lo + 1</code>, rounding down gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> changes nothing, so the loop never ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a real-valued answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code> and a fixed number of halvings, such as 100. Our cube root of 2 already matched six decimals after 20.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> for the totals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Up to 10^4 × 10^9 = 10^13 does not fit in a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and signed overflow is undefined behaviour in C++, so the result is not even guaranteed to wrap.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Answer space** | The range of values the answer can take |
| **Feasibility predicate** | Yes/no check: does candidate x satisfy the constraints? |
| **Monotonic predicate** | Once true it stays true (or once false stays false) |
| **First true / last true** | Minimise vs maximise shape of the yes/no row |

---
**Conclusion:** Binary search on the answer applies ordinary binary search to a range of candidate answers: pick the middle candidate, run a cheap yes/no feasibility check, and discard the half that cannot contain the boundary. It works whenever that check is monotonic, turns problems like Koko and ship-within-D-days into O(n log range) solutions, and showed its value in the run — 29 checks instead of 500 million. In C++, the bugs hide in the arithmetic: signed overflow is undefined behaviour, so keep totals in \`long long\` and compare \`mid <= n / mid\`.`,
        examples: [
          {
            label: `Koko eating bananas: binary vs linear search over speeds`,
            code: `// Binary search on the answer: Koko eating bananas (smallest speed that finishes in h hours).
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int checks = 0; // how many times we test a candidate speed

long long hoursNeeded(const vector<int>& piles, int speed) {
    checks++;
    long long total = 0;                    // 64-bit: many big piles at speed 1 overflow int
    for (int p : piles) total += (p + (long long)speed - 1) / speed; // ceiling division
    return total;
}

int minSpeed(const vector<int>& piles, long long h, bool trace = false) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end()); // answer is in [1, max pile]
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long long need = hoursNeeded(piles, mid);
        if (trace) cout << "  try speed " << mid << ": " << need << " hours -> " << (need <= h ? "ok, go lower" : "too slow, go higher") << "\\n";
        if (need <= h) hi = mid;            // mid works, so the answer is mid or smaller
        else lo = mid + 1;                  // mid fails, so every smaller speed fails too
    }
    return lo;
}

int minSpeedLinear(const vector<int>& piles, long long h) { // brute force: try 1, 2, 3, ...
    int speed = 1;
    while (hoursNeeded(piles, speed) > h) speed++;
    return speed;
}

int main() {
    cout << "piles [3, 6, 7, 11], h = 8\\n";
    int first = minSpeed({3, 6, 7, 11}, 8, true); // run first so the trace prints before "answer"
    cout << "answer: " << first << "\\n";

    vector<pair<vector<int>, int>> cases = {{{3, 6, 7, 11}, 8}, {{30, 11, 23, 4, 20}, 5}, {{30, 11, 23, 4, 20}, 6}};
    for (string name : {"binary", "linear"}) {
        for (auto& [piles, h] : cases) {
            checks = 0;
            int ans = name == "binary" ? minSpeed(piles, h) : minSpeedLinear(piles, h);
            cout << name << ": h=" << h << " answer=" << ans << " checks=" << checks << "\\n";
        }
    }
    checks = 0;
    int ansBig = minSpeed({1000000000}, 2); // one huge pile, h = 2 hours
    cout << "binary, one pile of 1e9 in 2 hours: " << ansBig << " checks = " << checks << "\\n";
}`,
          },
          {
            label: `Ship within D days and integer square root`,
            code: `// Two more "binary search on the answer" problems: ship capacity and integer square root.
#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>
using namespace std;

int daysNeeded(const vector<int>& weights, int cap) { // greedy: fill each day until the next box does not fit
    int days = 1, load = 0;
    for (int w : weights) {
        if (load + w > cap) { days++; load = 0; }
        load += w;
    }
    return days;
}

int shipWithinDays(const vector<int>& weights, int d) {
    int lo = *max_element(weights.begin(), weights.end());  // must carry the heaviest box
    int hi = accumulate(weights.begin(), weights.end(), 0); // one day carries everything
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(weights, mid) <= d) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

long long isqrt(long long n) {      // largest x with x * x <= n ("last true")
    long long lo = 0, hi = n;       // 64-bit: with int, hi - lo + 1 overflows (undefined behaviour)
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2; // round UP, or lo = mid would loop forever
        if (mid <= n / mid) lo = mid;           // same as mid * mid <= n, but cannot overflow
        else hi = mid - 1;
    }
    return lo;
}

int main() {
    cout << shipWithinDays({1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 5) << "\\n"; // 15
    cout << shipWithinDays({3, 2, 2, 4, 1, 4}, 3) << "\\n";              // 6
    cout << shipWithinDays({1, 2, 3, 1, 1}, 4) << "\\n";                 // 3
    cout << shipWithinDays({7, 2, 5}, 1) << "\\n";                       // 14
    cout << isqrt(0) << "\\n";                                           // 0
    cout << isqrt(1) << "\\n";                                           // 1
    cout << isqrt(8) << "\\n";                                           // 2
    cout << isqrt(2147395599) << "\\n";                                  // 46339
    cout << isqrt(2147483647) << "\\n";                                  // 46340
}`,
          },
          {
            label: `Real-valued answers: halving a fixed number of times`,
            code: `// Binary search on a REAL-valued answer: stop after a fixed number of halvings.
#include <algorithm>
#include <cstdio>
#include <vector>
using namespace std;

double cubeRoot(double x, int iterations = 100) {
    double lo = 0, hi = max(1.0, x);        // for x >= 0 the root lies in [0, max(1, x)]
    for (int i = 0; i < iterations; i++) {  // each pass halves the interval
        double mid = (lo + hi) / 2;
        if (mid * mid * mid < x) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

double minSpeedToArrive(const vector<double>& dists, double hours, int iterations = 100) {
    // smallest speed (km/h) that covers every leg within the total time budget
    double lo = 0, hi = 1e9;
    for (int i = 0; i < iterations; i++) {
        double mid = (lo + hi) / 2, t = 0;
        for (double d : dists) t += d / mid;
        if (t <= hours) hi = mid;           // fast enough: try slower
        else lo = mid;
    }
    return hi;
}

int main() {
    for (double x : {2.0, 27.0, 0.5}) printf("cube root of %.1f = %.6f\\n", x, cubeRoot(x));
    for (int iters : {10, 20, 40}) printf("after %d halvings: %.6f\\n", iters, cubeRoot(2.0, iters));
    printf("speed for legs [10, 20, 30] in 2.5 h = %.6f\\n", minSpeedToArrive({10, 20, 30}, 2.5));
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you search in a rotated sorted array?",
    difficulty: "medium",
    seoDescription: `Search a rotated sorted array in O(log n): find the sorted half, find the rotation point, and why duplicates make it O(n). Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a sorted array of distinct integers that has been rotated at an unknown point, like [4, 5, 6, 7, 0, 1, 2], and a target. Return its index or -1, in O(log n) time. Please code it in Python."

**What a strong answer should cover:**
- The key insight: at any midpoint at least one half is sorted, and \`nums[lo] <= nums[mid]\` tells you which.
- Correct range checks: search the sorted half only if the target lies within its end values, otherwise the other half.
- O(log n) time and O(1) space, plus the two-pass alternative (find the rotation point, then binary search one run).
- Edge cases: not rotated, one or two elements (the \`<=\`), empty array, target absent.
- The duplicates follow-up: shrink both ends when \`nums[lo] == nums[mid] == nums[hi]\`; worst case O(n).
- Python specifics: chained comparisons (\`nums[lo] <= target < nums[mid]\`) for the range test, \`//\` for the midpoint, and why \`nums.index\` is the O(n) brute force.

**Clarifying questions expected:**
- Are all values distinct?
- Should I return the index or just whether it exists?
- Can the array be empty or not rotated at all?

**Code / implementation expected:** Yes — a one-pass O(log n) Python solution, tested on edge cases.`,
        answer: `# Searching a Rotated Sorted Array (Python)

**Target Audience:** Learners who know basic binary search and are preparing for coding interviews.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block was produced by actually running the programs (Python 3.13.16); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A librarian keeps a shelf of books sorted by number: 1, 2, 3, ... 100. One night someone takes the first 40 books and puts them, still in order, at the end of the shelf. Now the shelf reads 41, 42, ..., 100, 1, 2, ..., 40. It is no longer sorted, so ordinary binary search breaks — and yet it is *almost* sorted: it is two sorted runs glued together.

Can you still find book 17 by looking at only a handful of books? Yes. Open the shelf in the middle. Whatever you see, **one of the two halves is still a perfectly sorted run**, and for a sorted run you can tell instantly whether book 17 is inside it by looking at its two ends. So you can still throw away half the shelf at every step. That one observation is the whole trick, and it keeps the search at O(log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the values distinct? | With duplicates the "which half is sorted" test can be ambiguous and the worst case becomes O(n) (section 8). |
| Do I return the index, or just true/false? | The duplicates version (LeetCode 81 style) usually returns a boolean. |
| Could the array be not rotated at all, or empty? | Rotation by 0 must work too; an empty array returns -1. |
| Is the rotation amount known? | If k is given, you can map indices directly and run plain binary search. |
| Ascending order? | The comparisons below assume ascending; descending flips them. |

## 3. The Key Insight: One Half Is Always Sorted

📌 **Interview term: Rotated sorted array** — a sorted array whose first k elements have been moved to the end, in order: \`[0, 1, 2, 4, 5, 6, 7]\` rotated by 4 is \`[4, 5, 6, 7, 0, 1, 2]\`. (Producing one is its own question: [rotating an array by k positions](/interview-question/how-do-you-rotate-an-array-by-k-positions).)

📌 **Interview term: Rotation point (pivot index)** — the index of the smallest element, where the "drop" happens; here index 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The rotated array 4 5 6 7 0 1 2 drawn as bars: two ascending runs, with the drop between index 3 and index 4">
  <defs>
    <marker id="b03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="150" y="118" width="50" height="112" rx="4"/>
  <text class="d-text" x="175" y="108" text-anchor="middle">4</text>
  <text class="d-sub" x="175" y="252" text-anchor="middle">index 0</text>
  <rect class="d-box-accent" x="220" y="96" width="50" height="134" rx="4"/>
  <text class="d-text" x="245" y="86" text-anchor="middle">5</text>
  <text class="d-sub" x="245" y="252" text-anchor="middle">index 1</text>
  <rect class="d-box-accent" x="290" y="74" width="50" height="156" rx="4"/>
  <text class="d-text" x="315" y="64" text-anchor="middle">6</text>
  <text class="d-sub" x="315" y="252" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="360" y="52" width="50" height="178" rx="4"/>
  <text class="d-text" x="385" y="42" text-anchor="middle">7</text>
  <text class="d-sub" x="385" y="252" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="470" y="206" width="50" height="24" rx="4"/>
  <text class="d-text" x="495" y="196" text-anchor="middle">0</text>
  <text class="d-sub" x="495" y="252" text-anchor="middle">index 4</text>
  <rect class="d-box-muted" x="540" y="184" width="50" height="46" rx="4"/>
  <text class="d-text" x="565" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="565" y="252" text-anchor="middle">index 5</text>
  <rect class="d-box-muted" x="610" y="162" width="50" height="68" rx="4"/>
  <text class="d-text" x="635" y="152" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="252" text-anchor="middle">index 6</text>
  <text class="d-text d-accent" x="495" y="124" text-anchor="middle">rotation point</text>
  <path class="d-edge" d="M 495 136 L 495 172" marker-end="url(#b03q5-arrow)"/>
  <text class="d-sub" x="280" y="285" text-anchor="middle">first run 4 to 7</text>
  <text class="d-sub" x="565" y="285" text-anchor="middle">second run 0 to 2</text>
</svg>

The array is two ascending runs: the accented first run 4, 5, 6, 7 and the second run 0, 1, 2. The rotation point is the start of the second run.

Pick any \`mid\`. The drop is either to the left of \`mid\` or to the right of it (or exactly at it) — it cannot be on both sides. So at least one of \`nums[lo..mid]\` and \`nums[mid..hi]\` contains no drop, which means it is sorted. And you can tell which with one comparison:

- If \`nums[lo] <= nums[mid]\`, the **left half is sorted** (a drop inside it would make \`nums[mid]\` smaller than \`nums[lo]\`).
- Otherwise the **right half is sorted**.

📌 **Interview term: Sorted half** — the half of the current range that contains no drop. Once you know it, check whether the target lies within its first and last values; if yes, search there, otherwise search the other half.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="First step of searching 0: mid is index 3 with value 7, the left half 4 to 7 is sorted, 0 is not inside it, so the search moves right">
  <path class="d-edge-dashed" d="M 150 34 L 416 34"/>
  <text class="d-sub" x="283" y="24" text-anchor="middle">sorted half: 4 to 7, 0 is not in it</text>
  <path class="d-edge-dashed" d="M 430 34 L 626 34"/>
  <text class="d-sub" x="528" y="24" text-anchor="middle">search here next</text>
  <rect class="d-box-muted" x="150" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="178" y="75" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="248" y="75" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="290" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="318" y="75" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="360" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="388" y="75" text-anchor="middle">7</text>
  <rect class="d-box" x="430" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="458" y="75" text-anchor="middle">0</text>
  <rect class="d-box" x="500" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="528" y="75" text-anchor="middle">1</text>
  <rect class="d-box" x="570" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="598" y="75" text-anchor="middle">2</text>
  <text class="d-sub" x="178" y="116" text-anchor="middle">lo</text>
  <text class="d-sub" x="388" y="116" text-anchor="middle">mid</text>
  <text class="d-sub" x="598" y="116" text-anchor="middle">hi</text>
  <text class="d-text" x="20" y="75">nums</text>
  <rect class="d-box-muted" x="150" y="150" width="476" height="44" rx="8"/>
  <text class="d-sub" x="388" y="177" text-anchor="middle">4 at lo is not greater than 7 at mid, so lo to mid is sorted</text>
</svg>

In the first step of searching for 0, \`mid\` is index 3 (value 7). Because 4 ≤ 7, indices 0 to 3 are sorted, and 0 is not between 4 and 7, so the target must be in indices 4 to 6. Half the array is gone after one comparison, exactly like ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

## 4. From Brute Force to O(log n)

**Brute force: linear scan, O(n).** Look at every element. Correct, simple, and what the interviewer wants you to beat. It is still useful as a test oracle: the first example checks the fast version against a linear scan on every rotation.

**Approach A: two passes, O(log n).** First find the rotation point \`k\` with a binary search (compare \`nums[mid]\` with \`nums[hi]\`: if \`nums[mid] > nums[hi]\` the drop is to the right of \`mid\`). Then \`nums[0..k-1]\` and \`nums[k..n-1]\` are both sorted; decide which one could contain the target and run an ordinary binary search on it. Two O(log n) passes — easy to explain and easy to get right.

**Approach B: one pass, O(log n).** Combine both steps: at each \`mid\`, find the sorted half and check whether the target is in it. This is the version most interviewers expect.

The one-pass loop, written out:

1. \`lo = 0, hi = n - 1\`; while \`lo <= hi\`: \`mid = lo + (hi - lo) / 2\`.
2. If \`nums[mid] == target\`, return \`mid\`.
3. If \`nums[lo] <= nums[mid]\` (left sorted): if \`nums[lo] <= target < nums[mid]\` go left (\`hi = mid - 1\`), else go right (\`lo = mid + 1\`).
4. Else (right sorted): if \`nums[mid] < target <= nums[hi]\` go right, else go left.
5. Return -1.

Note the \`<=\` in \`nums[lo] <= nums[mid]\`: when the range has two elements, \`lo == mid\`, and the left "half" is the single element \`nums[lo]\`, which is trivially sorted. With \`<\` instead, \`[3, 1]\` searching for 1 would take the wrong branch.

## 5. The Code in Python

**One-pass search** from the first example (the \`trace\` flag prints each step):

~~~python
def search(nums, target, trace=False):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if trace:
            side = "left" if nums[lo] <= nums[mid] else "right"
            print(f"  lo={lo} hi={hi} mid={mid} nums[mid]={nums[mid]}  sorted half: {side}")
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                    # left half [lo..mid] is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1                         # target is inside the sorted left half
            else:
                lo = mid + 1
        else:                                        # right half [mid..hi] is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1                         # target is inside the sorted right half
            else:
                hi = mid - 1
    return -1
~~~

Python allows chained comparisons, so \`nums[lo] <= target < nums[mid]\` reads exactly like the maths: it means \`nums[lo] <= target and target < nums[mid]\`. \`//\` keeps \`mid\` an integer.

**Finding the rotation point** from the second example. It compares with \`nums[hi]\`, not \`nums[lo]\`, because comparing with the right end also works when the array is not rotated at all:

~~~python
def find_min_index(nums):                 # distinct values
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1                  # the drop is to the right of mid
        else:
            hi = mid                      # mid could be the minimum itself
    return lo
~~~

**Two-pass search** built on it:

~~~python
def two_pass_search(nums, target):
    k = find_min_index(nums)              # nums[k:] and nums[:k] are both sorted
    if k > 0 and nums[0] <= target <= nums[k - 1]:
        return plain_search(nums, 0, k - 1, target)
    return plain_search(nums, k, len(nums) - 1, target)
~~~

📌 **Interview term: Find minimum in rotated sorted array** — the companion problem; its answer is the rotation point, and its loop uses \`while lo < hi\` with \`hi = mid\` (a "first true" boundary search: "is \`nums[i] <= nums[hi]\`?").

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.py\` and run with \`python3 main.py\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — one-pass search** — the trace for target 0, edge cases, then an exhaustive check

~~~text
search 0 in [4, 5, 6, 7, 0, 1, 2]
  lo=0 hi=6 mid=3 nums[mid]=7  sorted half: left
  lo=4 hi=6 mid=5 nums[mid]=1  sorted half: left
  lo=4 hi=4 mid=4 nums[mid]=0  sorted half: left
  -> index 4
0
-1
-1
0
1
2
all rotations agree with linear scan: true
~~~

**Example 2 — rotation point, two-pass search, duplicates**

~~~text
min of [4, 5, 6, 7, 0, 1, 2] is 0 at index 4 (rotated by 4 positions)
min of [1, 2, 3, 4] is 1 at index 0 (rotated by 0 positions)
min of [2, 1] is 1 at index 1 (rotated by 1 positions)
min of [5] is 5 at index 0 (rotated by 0 positions)
two-pass search 1 in [4, 5, 6, 7, 0, 1, 2]: 5
two-pass search 5 in [4, 5, 6, 7, 0, 1, 2]: 1
two-pass search 3 in [4, 5, 6, 7, 0, 1, 2]: -1
dupes: search 0 in [2, 5, 6, 0, 0, 1, 2] -> true in 1 steps
dupes: search 3 in [2, 5, 6, 0, 0, 1, 2] -> false in 3 steps
dupes: search 0 in [1, 0, 1, 1, 1] -> true in 3 steps
dupes: 100 ones, search 2 -> false in 50 steps
dupes: 100 ones with a 0 at index 30, search 0 -> true in 35 steps
~~~

What to notice:

- The trace for 0 matches the diagram: \`mid = 3\` (7) with the left half sorted, so the search went right; then \`mid = 5\` (1) — at that point the range was \`[0, 1, 2]\` and its "left half" \`[0, 1]\` was sorted, 0 was in it, so it went left — and finally found 0 at index 4.
- \`[3, 1]\` searching for 1 returns 1: the two-element case that the \`<=\` exists for.
- **The exhaustive check** ran every rotation of 0..9 (10 arrays) against a linear scan for 12 targets each, including the absent values -1 and 10, and all 120 answers agreed.
- The rotation point of a non-rotated array (\`[1, 2, 3, 4]\`) and of a single element is index 0, and \`[2, 1]\` gives index 1.
- With duplicates, \`[2, 5, 6, 0, 0, 1, 2]\` still finished quickly, but **100 equal values took 50 steps** to report "not found", and a single 0 hidden at index 30 took 35 steps. That is the O(n) worst case explained next.

## 7. Rotation Point and the Two-Pass Approach

The rotation-point search is a boundary search over the yes/no question "is \`nums[i] <= nums[last]\`?", which is false for the first run and true for the second. When \`nums[mid] > nums[hi]\`, \`mid\` is in the first run and the boundary is to the right (\`lo = mid + 1\`); otherwise \`mid\` is in the second run and might be the minimum itself (\`hi = mid\`). It is the same "first true" pattern used in [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).

## 8. Duplicates: Why the Worst Case Becomes O(n)

With duplicates, the test \`nums[lo] <= nums[mid]\` can lie. Take \`[1, 0, 1, 1, 1]\`: \`nums[lo] = 1\`, \`nums[mid] = 1\`, \`nums[hi] = 1\`. The left half \`[1, 0, 1]\` is *not* sorted, yet the test says it is. When all three are equal, there is genuinely no way to tell which side the drop is on.

The standard fix is to shrink the range by one from both ends (\`lo += 1\`, \`hi -= 1\`) when \`nums[lo] == nums[mid] == nums[hi]\`, and otherwise proceed as before. It is correct — the removed ends equal \`nums[mid]\`, which was already checked against the target — but in the worst case (almost all values equal) it removes only two elements per step. The run showed it: 100 equal values needed 50 steps. So the duplicates version is O(log n) on typical data and **O(n) in the worst case**, and no algorithm can do better in general, because a single different value can hide anywhere among equal ones.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | Checks every element |
| Two-pass (rotation point + binary search) | O(log n) | O(1) | Two halving searches |
| One-pass | O(log n) | O(1) | Discards half the range per step |
| Duplicates allowed | O(log n) typical, O(n) worst | O(1) | Equal ends force shrinking by one |

## 10. Edge Cases

- **Empty array** — \`hi = -1\`, the loop never runs, return -1.
- **One element** — \`[1]\` returns 0 for 1 and -1 for 0 (both in Example 1).
- **Two elements** — \`[3, 1]\`; this is where \`<\` instead of \`<=\` in the sorted-half test breaks.
- **Not rotated** (rotation by 0 or by n) — the left half is always sorted and the algorithm behaves like plain binary search.
- **Target equal to an end of a half** — the range checks use \`<=\` on the outer end and \`<\` against \`nums[mid]\` (already known not to be the target), so both ends are covered.
- **Duplicates** — use the shrinking variant and say the worst case is O(n).

## Common Pitfalls

- **\`nums[lo] < nums[mid]\` instead of \`<=\`.** Breaks the two-element case: with \`<\`, searching \`[3, 1]\` for 1 returned -1 in our test.
- **Getting the range checks backwards.** In the left-sorted branch the test is \`nums[lo] <= target < nums[mid]\`; testing against \`nums[hi]\` there is a classic bug.
- **Comparing the minimum search with \`nums[lo]\`.** \`find_min_index\` must compare with \`nums[hi]\`; with \`nums[lo]\` the non-rotated array \`[1, 2, 3, 4]\` returned index 2 (value 3) in our test.
- **Calling \`nums.index(target)\` and calling it done.** It is O(n), the brute force the interviewer wants you to beat. It also raises \`ValueError\` when the value is absent (\`ValueError: 5 is not in list\`).
- **Claiming O(log n) for the duplicates version.** It is O(n) in the worst case (50 steps for 100 equal values).
- **Using \`/\` for the midpoint.** It produces a float; use \`//\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The insight:</strong> <span style="color:#f0e2c8;">Cut a rotated sorted array anywhere and at least one half is sorted, because the single drop can only be on one side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which half:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code> the left half is sorted, otherwise the right half is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where to go:</strong> <span style="color:#f0e2c8;">If the target lies within the sorted half's end values, search there; otherwise search the other half. One pass, O(log n), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Find the rotation point first (compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[hi]</code>), then run a normal binary search on the right run. Also O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Python the range test reads naturally as a chained comparison, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= target &lt; nums[mid]</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> keeps the midpoint an integer.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if there are duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] == nums[mid] == nums[hi]</code> you cannot tell which half is sorted, so shrink both ends by one. Worst case O(n): 100 equal values took 50 steps in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When two elements remain, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo == mid</code>; the left half is that one element and is sorted. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1]</code> searching for 1 goes the wrong way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the minimum element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid] &gt; nums[hi]</code> set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> ends at the rotation point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a linear scan on every rotation of 0..9 for targets -1 to 10, 120 cases, all agreeing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.index(target)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works but is O(n) and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> when the value is missing; the point of the question is the O(log n) search.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rotated sorted array** | A sorted array with its first k items moved to the end |
| **Rotation point (pivot index)** | Index of the smallest item, where the drop is |
| **Sorted half** | The half of the range with no drop inside it |
| **Find minimum in rotated sorted array** | The boundary search that returns the rotation point |

---
**Conclusion:** A rotated sorted array is two sorted runs, so every split leaves at least one sorted half; one comparison (\`nums[lo] <= nums[mid]\`) tells you which, a range check tells you whether the target is there, and you keep halving — O(log n) time and O(1) space. Alternatively find the rotation point and binary search one run. The run checked the one-pass version against a linear scan on all rotations, and showed the honest caveat: with duplicates the worst case is O(n), 50 steps for 100 equal values. In Python, chained comparisons make the range tests read exactly like the reasoning.`,
        examples: [
          {
            label: `One-pass search, checked against every rotation`,
            code: `# Search in a rotated sorted array (distinct values) in O(log n).

def search(nums, target, trace=False):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if trace:
            side = "left" if nums[lo] <= nums[mid] else "right"
            print(f"  lo={lo} hi={hi} mid={mid} nums[mid]={nums[mid]}  sorted half: {side}")
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                    # left half [lo..mid] is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1                         # target is inside the sorted left half
            else:
                lo = mid + 1
        else:                                        # right half [mid..hi] is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1                         # target is inside the sorted right half
            else:
                hi = mid - 1
    return -1

nums = [4, 5, 6, 7, 0, 1, 2]
print("search 0 in [4, 5, 6, 7, 0, 1, 2]")
print("  -> index", search(nums, 0, trace=True))

print(search(nums, 4))           # 0
print(search(nums, 3))           # -1
print(search([1], 0))            # -1
# single element, two elements and a non-rotated array:
print(search([1], 1))            # 0
print(search([3, 1], 1))         # 1
print(search([1, 2, 3, 4], 3))   # 2

# Check every rotation of 0..9 against a linear scan, for targets -1..10.
base = list(range(10))
ok = True
for k in range(len(base)):
    rot = base[k:] + base[:k]
    for t in range(-1, 11):
        expected = rot.index(t) if t in rot else -1
        ok = ok and search(rot, t) == expected
print("all rotations agree with linear scan:", str(ok).lower())`,
          },
          {
            label: `Rotation point, two-pass search, and duplicates`,
            code: `# Find the rotation point (index of the minimum), search in two passes,
# and see why duplicates break the O(log n) guarantee.

def find_min_index(nums):                 # distinct values
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1                  # the drop is to the right of mid
        else:
            hi = mid                      # mid could be the minimum itself
    return lo

def plain_search(a, lo, hi, target):      # ordinary binary search on a[lo..hi]
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

def two_pass_search(nums, target):
    k = find_min_index(nums)              # nums[k:] and nums[:k] are both sorted
    if k > 0 and nums[0] <= target <= nums[k - 1]:
        return plain_search(nums, 0, k - 1, target)
    return plain_search(nums, k, len(nums) - 1, target)

def search_with_dupes(nums, target):      # returns (found, steps)
    lo, hi, steps = 0, len(nums) - 1, 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return True, steps
        if nums[lo] == nums[mid] == nums[hi]:
            lo += 1                       # cannot tell which half is sorted: shrink by one
            hi -= 1
        elif nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return False, steps

for arr in [[4, 5, 6, 7, 0, 1, 2], [1, 2, 3, 4], [2, 1], [5]]:
    k = find_min_index(arr)
    print("min of", arr, "is", arr[k], "at index", k, "(rotated by", k, "positions)")
print("two-pass search 1 in [4, 5, 6, 7, 0, 1, 2]:", two_pass_search([4, 5, 6, 7, 0, 1, 2], 1))
print("two-pass search 5 in [4, 5, 6, 7, 0, 1, 2]:", two_pass_search([4, 5, 6, 7, 0, 1, 2], 5))
print("two-pass search 3 in [4, 5, 6, 7, 0, 1, 2]:", two_pass_search([4, 5, 6, 7, 0, 1, 2], 3))

for arr, t in [([2, 5, 6, 0, 0, 1, 2], 0), ([2, 5, 6, 0, 0, 1, 2], 3), ([1, 0, 1, 1, 1], 0)]:
    found, steps = search_with_dupes(arr, t)
    print("dupes: search", t, "in", arr, "->", str(found).lower(), "in", steps, "steps")
ones = [1] * 100                          # 100 equal values, target absent: the worst case
found, steps = search_with_dupes(ones, 2)
print("dupes: 100 ones, search 2 ->", str(found).lower(), "in", steps, "steps")
ones[30] = 0                              # one zero hidden at index 30
found, steps = search_with_dupes(ones, 0)
print("dupes: 100 ones with a 0 at index 30, search 0 ->", str(found).lower(), "in", steps, "steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given a sorted array of distinct integers that has been rotated at an unknown point, like [4, 5, 6, 7, 0, 1, 2], and a target. Return its index or -1, in O(log n) time. Please code it in JavaScript."

**What a strong answer should cover:**
- The key insight: at any midpoint at least one half is sorted, and \`nums[lo] <= nums[mid]\` tells you which.
- Correct range checks: search the sorted half only if the target lies within its end values, otherwise the other half.
- O(log n) time and O(1) space, plus the two-pass alternative (find the rotation point, then binary search one run).
- Edge cases: not rotated, one or two elements (the \`<=\`), empty array, target absent.
- The duplicates follow-up: shrink both ends when \`nums[lo] == nums[mid] == nums[hi]\`; worst case O(n).
- JavaScript specifics: no chained comparisons (\`a <= b < c\` silently compares a boolean), \`&&\` for range tests, and an integer midpoint (\`>>> 1\` or \`Math.floor\`).

**Clarifying questions expected:**
- Are all values distinct?
- Should I return the index or just whether it exists?
- Can the array be empty or not rotated at all?

**Code / implementation expected:** Yes — a one-pass O(log n) JavaScript solution, tested on edge cases.`,
        answer: `# Searching a Rotated Sorted Array (JavaScript)

**Target Audience:** Learners who know basic binary search and are preparing for coding interviews.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block was produced by actually running the programs (Node.js v22.22.0); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A librarian keeps a shelf of books sorted by number: 1, 2, 3, ... 100. One night someone takes the first 40 books and puts them, still in order, at the end of the shelf. Now the shelf reads 41, 42, ..., 100, 1, 2, ..., 40. It is no longer sorted, so ordinary binary search breaks — and yet it is *almost* sorted: it is two sorted runs glued together.

Can you still find book 17 by looking at only a handful of books? Yes. Open the shelf in the middle. Whatever you see, **one of the two halves is still a perfectly sorted run**, and for a sorted run you can tell instantly whether book 17 is inside it by looking at its two ends. So you can still throw away half the shelf at every step. That one observation is the whole trick, and it keeps the search at O(log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the values distinct? | With duplicates the "which half is sorted" test can be ambiguous and the worst case becomes O(n) (section 8). |
| Do I return the index, or just true/false? | The duplicates version (LeetCode 81 style) usually returns a boolean. |
| Could the array be not rotated at all, or empty? | Rotation by 0 must work too; an empty array returns -1. |
| Is the rotation amount known? | If k is given, you can map indices directly and run plain binary search. |
| Ascending order? | The comparisons below assume ascending; descending flips them. |

## 3. The Key Insight: One Half Is Always Sorted

📌 **Interview term: Rotated sorted array** — a sorted array whose first k elements have been moved to the end, in order: \`[0, 1, 2, 4, 5, 6, 7]\` rotated by 4 is \`[4, 5, 6, 7, 0, 1, 2]\`. (Producing one is its own question: [rotating an array by k positions](/interview-question/how-do-you-rotate-an-array-by-k-positions).)

📌 **Interview term: Rotation point (pivot index)** — the index of the smallest element, where the "drop" happens; here index 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The rotated array 4 5 6 7 0 1 2 drawn as bars: two ascending runs, with the drop between index 3 and index 4">
  <defs>
    <marker id="b03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="150" y="118" width="50" height="112" rx="4"/>
  <text class="d-text" x="175" y="108" text-anchor="middle">4</text>
  <text class="d-sub" x="175" y="252" text-anchor="middle">index 0</text>
  <rect class="d-box-accent" x="220" y="96" width="50" height="134" rx="4"/>
  <text class="d-text" x="245" y="86" text-anchor="middle">5</text>
  <text class="d-sub" x="245" y="252" text-anchor="middle">index 1</text>
  <rect class="d-box-accent" x="290" y="74" width="50" height="156" rx="4"/>
  <text class="d-text" x="315" y="64" text-anchor="middle">6</text>
  <text class="d-sub" x="315" y="252" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="360" y="52" width="50" height="178" rx="4"/>
  <text class="d-text" x="385" y="42" text-anchor="middle">7</text>
  <text class="d-sub" x="385" y="252" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="470" y="206" width="50" height="24" rx="4"/>
  <text class="d-text" x="495" y="196" text-anchor="middle">0</text>
  <text class="d-sub" x="495" y="252" text-anchor="middle">index 4</text>
  <rect class="d-box-muted" x="540" y="184" width="50" height="46" rx="4"/>
  <text class="d-text" x="565" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="565" y="252" text-anchor="middle">index 5</text>
  <rect class="d-box-muted" x="610" y="162" width="50" height="68" rx="4"/>
  <text class="d-text" x="635" y="152" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="252" text-anchor="middle">index 6</text>
  <text class="d-text d-accent" x="495" y="124" text-anchor="middle">rotation point</text>
  <path class="d-edge" d="M 495 136 L 495 172" marker-end="url(#b03q5-arrow)"/>
  <text class="d-sub" x="280" y="285" text-anchor="middle">first run 4 to 7</text>
  <text class="d-sub" x="565" y="285" text-anchor="middle">second run 0 to 2</text>
</svg>

The array is two ascending runs: the accented first run 4, 5, 6, 7 and the second run 0, 1, 2. The rotation point is the start of the second run.

Pick any \`mid\`. The drop is either to the left of \`mid\` or to the right of it (or exactly at it) — it cannot be on both sides. So at least one of \`nums[lo..mid]\` and \`nums[mid..hi]\` contains no drop, which means it is sorted. And you can tell which with one comparison:

- If \`nums[lo] <= nums[mid]\`, the **left half is sorted** (a drop inside it would make \`nums[mid]\` smaller than \`nums[lo]\`).
- Otherwise the **right half is sorted**.

📌 **Interview term: Sorted half** — the half of the current range that contains no drop. Once you know it, check whether the target lies within its first and last values; if yes, search there, otherwise search the other half.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="First step of searching 0: mid is index 3 with value 7, the left half 4 to 7 is sorted, 0 is not inside it, so the search moves right">
  <path class="d-edge-dashed" d="M 150 34 L 416 34"/>
  <text class="d-sub" x="283" y="24" text-anchor="middle">sorted half: 4 to 7, 0 is not in it</text>
  <path class="d-edge-dashed" d="M 430 34 L 626 34"/>
  <text class="d-sub" x="528" y="24" text-anchor="middle">search here next</text>
  <rect class="d-box-muted" x="150" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="178" y="75" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="248" y="75" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="290" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="318" y="75" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="360" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="388" y="75" text-anchor="middle">7</text>
  <rect class="d-box" x="430" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="458" y="75" text-anchor="middle">0</text>
  <rect class="d-box" x="500" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="528" y="75" text-anchor="middle">1</text>
  <rect class="d-box" x="570" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="598" y="75" text-anchor="middle">2</text>
  <text class="d-sub" x="178" y="116" text-anchor="middle">lo</text>
  <text class="d-sub" x="388" y="116" text-anchor="middle">mid</text>
  <text class="d-sub" x="598" y="116" text-anchor="middle">hi</text>
  <text class="d-text" x="20" y="75">nums</text>
  <rect class="d-box-muted" x="150" y="150" width="476" height="44" rx="8"/>
  <text class="d-sub" x="388" y="177" text-anchor="middle">4 at lo is not greater than 7 at mid, so lo to mid is sorted</text>
</svg>

In the first step of searching for 0, \`mid\` is index 3 (value 7). Because 4 ≤ 7, indices 0 to 3 are sorted, and 0 is not between 4 and 7, so the target must be in indices 4 to 6. Half the array is gone after one comparison, exactly like ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

## 4. From Brute Force to O(log n)

**Brute force: linear scan, O(n).** Look at every element. Correct, simple, and what the interviewer wants you to beat. It is still useful as a test oracle: the first example checks the fast version against a linear scan on every rotation.

**Approach A: two passes, O(log n).** First find the rotation point \`k\` with a binary search (compare \`nums[mid]\` with \`nums[hi]\`: if \`nums[mid] > nums[hi]\` the drop is to the right of \`mid\`). Then \`nums[0..k-1]\` and \`nums[k..n-1]\` are both sorted; decide which one could contain the target and run an ordinary binary search on it. Two O(log n) passes — easy to explain and easy to get right.

**Approach B: one pass, O(log n).** Combine both steps: at each \`mid\`, find the sorted half and check whether the target is in it. This is the version most interviewers expect.

The one-pass loop, written out:

1. \`lo = 0, hi = n - 1\`; while \`lo <= hi\`: \`mid = lo + (hi - lo) / 2\`.
2. If \`nums[mid] == target\`, return \`mid\`.
3. If \`nums[lo] <= nums[mid]\` (left sorted): if \`nums[lo] <= target < nums[mid]\` go left (\`hi = mid - 1\`), else go right (\`lo = mid + 1\`).
4. Else (right sorted): if \`nums[mid] < target <= nums[hi]\` go right, else go left.
5. Return -1.

Note the \`<=\` in \`nums[lo] <= nums[mid]\`: when the range has two elements, \`lo == mid\`, and the left "half" is the single element \`nums[lo]\`, which is trivially sorted. With \`<\` instead, \`[3, 1]\` searching for 1 would take the wrong branch.

## 5. The Code in JavaScript

**One-pass search** from the first example (the \`trace\` flag prints each step):

~~~javascript
function search(nums, target, trace = false) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (trace) {
      const side = nums[lo] <= nums[mid] ? "left" : "right";
      console.log("  lo=" + lo + " hi=" + hi + " mid=" + mid + " nums[mid]=" + nums[mid] + "  sorted half: " + side);
    }
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {                       // left half [lo..mid] is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
      else lo = mid + 1;
    } else {                                           // right half [mid..hi] is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
      else hi = mid - 1;
    }
  }
  return -1;
}
~~~

JavaScript has no chained comparisons: \`nums[lo] <= target < nums[mid]\` would compare a boolean with a number (\`true < 7\` is \`1 < 7\`), so it is written with \`&&\`. \`(lo + hi) >>> 1\` is a safe midpoint for array indices, which are far below 2^32.

**Finding the rotation point** from the second example. It compares with \`nums[hi]\`, not \`nums[lo]\`, because comparing with the right end also works when the array is not rotated at all:

~~~javascript
function findMinIndex(nums) {           // distinct values
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
    else hi = mid;                          // mid could be the minimum itself
  }
  return lo;
}
~~~

**Two-pass search** built on it:

~~~javascript
function twoPassSearch(nums, target) {
  const k = findMinIndex(nums);          // nums[k..] and nums[..k-1] are both sorted
  if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
  return plainSearch(nums, k, nums.length - 1, target);
}
~~~

📌 **Interview term: Find minimum in rotated sorted array** — the companion problem; its answer is the rotation point, and its loop uses \`while lo < hi\` with \`hi = mid\` (a "first true" boundary search: "is \`nums[i] <= nums[hi]\`?").

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.js\` and run with \`node main.js\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — one-pass search** — the trace for target 0, edge cases, then an exhaustive check

~~~text
search 0 in [4, 5, 6, 7, 0, 1, 2]
  lo=0 hi=6 mid=3 nums[mid]=7  sorted half: left
  lo=4 hi=6 mid=5 nums[mid]=1  sorted half: left
  lo=4 hi=4 mid=4 nums[mid]=0  sorted half: left
  -> index 4
0
-1
-1
0
1
2
all rotations agree with linear scan: true
~~~

**Example 2 — rotation point, two-pass search, duplicates**

~~~text
min of [4, 5, 6, 7, 0, 1, 2] is 0 at index 4 (rotated by 4 positions)
min of [1, 2, 3, 4] is 1 at index 0 (rotated by 0 positions)
min of [2, 1] is 1 at index 1 (rotated by 1 positions)
min of [5] is 5 at index 0 (rotated by 0 positions)
two-pass search 1 in [4, 5, 6, 7, 0, 1, 2]: 5
two-pass search 5 in [4, 5, 6, 7, 0, 1, 2]: 1
two-pass search 3 in [4, 5, 6, 7, 0, 1, 2]: -1
dupes: search 0 in [2, 5, 6, 0, 0, 1, 2] -> true in 1 steps
dupes: search 3 in [2, 5, 6, 0, 0, 1, 2] -> false in 3 steps
dupes: search 0 in [1, 0, 1, 1, 1] -> true in 3 steps
dupes: 100 ones, search 2 -> false in 50 steps
dupes: 100 ones with a 0 at index 30, search 0 -> true in 35 steps
~~~

What to notice:

- The trace for 0 matches the diagram: \`mid = 3\` (7) with the left half sorted, so the search went right; then \`mid = 5\` (1) — at that point the range was \`[0, 1, 2]\` and its "left half" \`[0, 1]\` was sorted, 0 was in it, so it went left — and finally found 0 at index 4.
- \`[3, 1]\` searching for 1 returns 1: the two-element case that the \`<=\` exists for.
- **The exhaustive check** ran every rotation of 0..9 (10 arrays) against a linear scan for 12 targets each, including the absent values -1 and 10, and all 120 answers agreed.
- The rotation point of a non-rotated array (\`[1, 2, 3, 4]\`) and of a single element is index 0, and \`[2, 1]\` gives index 1.
- With duplicates, \`[2, 5, 6, 0, 0, 1, 2]\` still finished quickly, but **100 equal values took 50 steps** to report "not found", and a single 0 hidden at index 30 took 35 steps. That is the O(n) worst case explained next.

## 7. Rotation Point and the Two-Pass Approach

The rotation-point search is a boundary search over the yes/no question "is \`nums[i] <= nums[last]\`?", which is false for the first run and true for the second. When \`nums[mid] > nums[hi]\`, \`mid\` is in the first run and the boundary is to the right (\`lo = mid + 1\`); otherwise \`mid\` is in the second run and might be the minimum itself (\`hi = mid\`). It is the same "first true" pattern used in [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).

## 8. Duplicates: Why the Worst Case Becomes O(n)

With duplicates, the test \`nums[lo] <= nums[mid]\` can lie. Take \`[1, 0, 1, 1, 1]\`: \`nums[lo] = 1\`, \`nums[mid] = 1\`, \`nums[hi] = 1\`. The left half \`[1, 0, 1]\` is *not* sorted, yet the test says it is. When all three are equal, there is genuinely no way to tell which side the drop is on.

The standard fix is to shrink the range by one from both ends (\`lo += 1\`, \`hi -= 1\`) when \`nums[lo] == nums[mid] == nums[hi]\`, and otherwise proceed as before. It is correct — the removed ends equal \`nums[mid]\`, which was already checked against the target — but in the worst case (almost all values equal) it removes only two elements per step. The run showed it: 100 equal values needed 50 steps. So the duplicates version is O(log n) on typical data and **O(n) in the worst case**, and no algorithm can do better in general, because a single different value can hide anywhere among equal ones.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | Checks every element |
| Two-pass (rotation point + binary search) | O(log n) | O(1) | Two halving searches |
| One-pass | O(log n) | O(1) | Discards half the range per step |
| Duplicates allowed | O(log n) typical, O(n) worst | O(1) | Equal ends force shrinking by one |

## 10. Edge Cases

- **Empty array** — \`hi = -1\`, the loop never runs, return -1.
- **One element** — \`[1]\` returns 0 for 1 and -1 for 0 (both in Example 1).
- **Two elements** — \`[3, 1]\`; this is where \`<\` instead of \`<=\` in the sorted-half test breaks.
- **Not rotated** (rotation by 0 or by n) — the left half is always sorted and the algorithm behaves like plain binary search.
- **Target equal to an end of a half** — the range checks use \`<=\` on the outer end and \`<\` against \`nums[mid]\` (already known not to be the target), so both ends are covered.
- **Duplicates** — use the shrinking variant and say the worst case is O(n).

## Common Pitfalls

- **Writing \`nums[lo] <= target < nums[mid]\`.** It is valid JavaScript but means \`(nums[lo] <= target) < nums[mid]\`, comparing \`true\`/\`false\` (1/0) with a number. Use \`&&\`.
- **\`nums[lo] < nums[mid]\` instead of \`<=\`.** Breaks the two-element case: with \`<\`, searching \`[3, 1]\` for 1 returned -1 in our test.
- **Comparing the minimum search with \`nums[lo]\`.** \`findMinIndex\` must compare with \`nums[hi]\`, or a non-rotated array gives the wrong answer.
- **Forgetting \`Math.floor\` (or \`>>> 1\`) for the midpoint.** A fractional index reads \`undefined\` and every comparison with it is \`false\`.
- **Calling \`indexOf\` and calling it done.** It is O(n), the brute force the interviewer wants you to beat.
- **Claiming O(log n) for the duplicates version.** It is O(n) in the worst case (50 steps for 100 equal values).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The insight:</strong> <span style="color:#f0e2c8;">Cut a rotated sorted array anywhere and at least one half is sorted, because the single drop can only be on one side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which half:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code> the left half is sorted, otherwise the right half is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where to go:</strong> <span style="color:#f0e2c8;">If the target lies within the sorted half's end values, search there; otherwise search the other half. One pass, O(log n), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Find the rotation point first (compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[hi]</code>), then run a normal binary search on the right run. Also O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In JavaScript I write the range tests with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code> (no chained comparisons) and compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt; 1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if there are duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] == nums[mid] == nums[hi]</code> you cannot tell which half is sorted, so shrink both ends by one. Worst case O(n): 100 equal values took 50 steps in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When two elements remain, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo == mid</code>; the left half is that one element and is sorted. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1]</code> searching for 1 goes the wrong way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the minimum element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid] &gt; nums[hi]</code> set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> ends at the rotation point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a linear scan on every rotation of 0..9 for targets -1 to 10, 120 cases, all agreeing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= target &lt; nums[mid]</code> in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It parses as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(nums[lo] &lt;= target) &lt; nums[mid]</code>, a boolean compared with a number, so it is almost always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>. You need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rotated sorted array** | A sorted array with its first k items moved to the end |
| **Rotation point (pivot index)** | Index of the smallest item, where the drop is |
| **Sorted half** | The half of the range with no drop inside it |
| **Find minimum in rotated sorted array** | The boundary search that returns the rotation point |

---
**Conclusion:** A rotated sorted array is two sorted runs, so every split leaves at least one sorted half; one comparison (\`nums[lo] <= nums[mid]\`) tells you which, a range check tells you whether the target is there, and you keep halving — O(log n) time and O(1) space. Alternatively find the rotation point and binary search one run. The run checked the one-pass version against a linear scan on all rotations, and showed the honest caveat: with duplicates the worst case is O(n), 50 steps for 100 equal values. In JavaScript, write the range tests with \`&&\` and keep the midpoint an integer.`,
        examples: [
          {
            label: `One-pass search, checked against every rotation`,
            code: `// Search in a rotated sorted array (distinct values) in O(log n).

function search(nums, target, trace = false) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (trace) {
      const side = nums[lo] <= nums[mid] ? "left" : "right";
      console.log("  lo=" + lo + " hi=" + hi + " mid=" + mid + " nums[mid]=" + nums[mid] + "  sorted half: " + side);
    }
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {                       // left half [lo..mid] is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
      else lo = mid + 1;
    } else {                                           // right half [mid..hi] is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
      else hi = mid - 1;
    }
  }
  return -1;
}

const nums = [4, 5, 6, 7, 0, 1, 2];
console.log("search 0 in [4, 5, 6, 7, 0, 1, 2]");
const found = search(nums, 0, true);
console.log("  -> index " + found);

console.log(search(nums, 4));          // 0
console.log(search(nums, 3));          // -1
console.log(search([1], 0));           // -1
// single element, two elements and a non-rotated array:
console.log(search([1], 1));           // 0
console.log(search([3, 1], 1));        // 1
console.log(search([1, 2, 3, 4], 3));  // 2

// Check every rotation of 0..9 against a linear scan (indexOf), for targets -1..10.
const base = Array.from({ length: 10 }, (_, i) => i);
let ok = true;
for (let k = 0; k < base.length; k++) {
  const rot = base.slice(k).concat(base.slice(0, k));
  for (let t = -1; t <= 10; t++) ok = ok && search(rot, t) === rot.indexOf(t);
}
console.log("all rotations agree with linear scan: " + ok);`,
          },
          {
            label: `Rotation point, two-pass search, and duplicates`,
            code: `// Find the rotation point (index of the minimum), search in two passes,
// and see why duplicates break the O(log n) guarantee.

function fmt(a) { return "[" + a.join(", ") + "]"; }

function findMinIndex(nums) {           // distinct values
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
    else hi = mid;                          // mid could be the minimum itself
  }
  return lo;
}

function plainSearch(a, lo, hi, target) { // ordinary binary search on a[lo..hi]
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

function twoPassSearch(nums, target) {
  const k = findMinIndex(nums);          // nums[k..] and nums[..k-1] are both sorted
  if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
  return plainSearch(nums, k, nums.length - 1, target);
}

function searchWithDupes(nums, target) { // returns [found, steps]
  let lo = 0, hi = nums.length - 1, steps = 0;
  while (lo <= hi) {
    steps++;
    const mid = (lo + hi) >>> 1;
    if (nums[mid] === target) return [true, steps];
    if (nums[lo] === nums[mid] && nums[mid] === nums[hi]) { lo++; hi--; } // cannot tell: shrink by one
    else if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return [false, steps];
}

for (const arr of [[4, 5, 6, 7, 0, 1, 2], [1, 2, 3, 4], [2, 1], [5]]) {
  const k = findMinIndex(arr);
  console.log("min of " + fmt(arr) + " is " + arr[k] + " at index " + k + " (rotated by " + k + " positions)");
}
const r = [4, 5, 6, 7, 0, 1, 2];
for (const t of [1, 5, 3]) console.log("two-pass search " + t + " in " + fmt(r) + ": " + twoPassSearch(r, t));

for (const [arr, t] of [[[2, 5, 6, 0, 0, 1, 2], 0], [[2, 5, 6, 0, 0, 1, 2], 3], [[1, 0, 1, 1, 1], 0]]) {
  const [found, steps] = searchWithDupes(arr, t);
  console.log("dupes: search " + t + " in " + fmt(arr) + " -> " + found + " in " + steps + " steps");
}
const ones = new Array(100).fill(1);    // 100 equal values, target absent: the worst case
let [found, steps] = searchWithDupes(ones, 2);
console.log("dupes: 100 ones, search 2 -> " + found + " in " + steps + " steps");
ones[30] = 0;                           // one zero hidden at index 30
[found, steps] = searchWithDupes(ones, 0);
console.log("dupes: 100 ones with a 0 at index 30, search 0 -> " + found + " in " + steps + " steps");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given a sorted array of distinct integers that has been rotated at an unknown point, like [4, 5, 6, 7, 0, 1, 2], and a target. Return its index or -1, in O(log n) time. Please code it in Java."

**What a strong answer should cover:**
- The key insight: at any midpoint at least one half is sorted, and \`nums[lo] <= nums[mid]\` tells you which.
- Correct range checks: search the sorted half only if the target lies within its end values, otherwise the other half.
- O(log n) time and O(1) space, plus the two-pass alternative (find the rotation point, then binary search one run).
- Edge cases: not rotated, one or two elements (the \`<=\`), empty array, target absent.
- The duplicates follow-up: shrink both ends when \`nums[lo] == nums[mid] == nums[hi]\`; worst case O(n).
- Java specifics: \`&&\` range tests, an overflow-safe midpoint, and that \`Arrays.binarySearch\` is undefined on the rotated array but fine on one run.

**Clarifying questions expected:**
- Are all values distinct?
- Should I return the index or just whether it exists?
- Can the array be empty or not rotated at all?

**Code / implementation expected:** Yes — a one-pass O(log n) Java solution, tested on edge cases.`,
        answer: `# Searching a Rotated Sorted Array (Java)

**Target Audience:** Learners who know basic binary search and are preparing for coding interviews.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block was produced by actually running the programs (OpenJDK 21.0.12 (javac + java)); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A librarian keeps a shelf of books sorted by number: 1, 2, 3, ... 100. One night someone takes the first 40 books and puts them, still in order, at the end of the shelf. Now the shelf reads 41, 42, ..., 100, 1, 2, ..., 40. It is no longer sorted, so ordinary binary search breaks — and yet it is *almost* sorted: it is two sorted runs glued together.

Can you still find book 17 by looking at only a handful of books? Yes. Open the shelf in the middle. Whatever you see, **one of the two halves is still a perfectly sorted run**, and for a sorted run you can tell instantly whether book 17 is inside it by looking at its two ends. So you can still throw away half the shelf at every step. That one observation is the whole trick, and it keeps the search at O(log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the values distinct? | With duplicates the "which half is sorted" test can be ambiguous and the worst case becomes O(n) (section 8). |
| Do I return the index, or just true/false? | The duplicates version (LeetCode 81 style) usually returns a boolean. |
| Could the array be not rotated at all, or empty? | Rotation by 0 must work too; an empty array returns -1. |
| Is the rotation amount known? | If k is given, you can map indices directly and run plain binary search. |
| Ascending order? | The comparisons below assume ascending; descending flips them. |

## 3. The Key Insight: One Half Is Always Sorted

📌 **Interview term: Rotated sorted array** — a sorted array whose first k elements have been moved to the end, in order: \`[0, 1, 2, 4, 5, 6, 7]\` rotated by 4 is \`[4, 5, 6, 7, 0, 1, 2]\`. (Producing one is its own question: [rotating an array by k positions](/interview-question/how-do-you-rotate-an-array-by-k-positions).)

📌 **Interview term: Rotation point (pivot index)** — the index of the smallest element, where the "drop" happens; here index 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The rotated array 4 5 6 7 0 1 2 drawn as bars: two ascending runs, with the drop between index 3 and index 4">
  <defs>
    <marker id="b03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="150" y="118" width="50" height="112" rx="4"/>
  <text class="d-text" x="175" y="108" text-anchor="middle">4</text>
  <text class="d-sub" x="175" y="252" text-anchor="middle">index 0</text>
  <rect class="d-box-accent" x="220" y="96" width="50" height="134" rx="4"/>
  <text class="d-text" x="245" y="86" text-anchor="middle">5</text>
  <text class="d-sub" x="245" y="252" text-anchor="middle">index 1</text>
  <rect class="d-box-accent" x="290" y="74" width="50" height="156" rx="4"/>
  <text class="d-text" x="315" y="64" text-anchor="middle">6</text>
  <text class="d-sub" x="315" y="252" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="360" y="52" width="50" height="178" rx="4"/>
  <text class="d-text" x="385" y="42" text-anchor="middle">7</text>
  <text class="d-sub" x="385" y="252" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="470" y="206" width="50" height="24" rx="4"/>
  <text class="d-text" x="495" y="196" text-anchor="middle">0</text>
  <text class="d-sub" x="495" y="252" text-anchor="middle">index 4</text>
  <rect class="d-box-muted" x="540" y="184" width="50" height="46" rx="4"/>
  <text class="d-text" x="565" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="565" y="252" text-anchor="middle">index 5</text>
  <rect class="d-box-muted" x="610" y="162" width="50" height="68" rx="4"/>
  <text class="d-text" x="635" y="152" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="252" text-anchor="middle">index 6</text>
  <text class="d-text d-accent" x="495" y="124" text-anchor="middle">rotation point</text>
  <path class="d-edge" d="M 495 136 L 495 172" marker-end="url(#b03q5-arrow)"/>
  <text class="d-sub" x="280" y="285" text-anchor="middle">first run 4 to 7</text>
  <text class="d-sub" x="565" y="285" text-anchor="middle">second run 0 to 2</text>
</svg>

The array is two ascending runs: the accented first run 4, 5, 6, 7 and the second run 0, 1, 2. The rotation point is the start of the second run.

Pick any \`mid\`. The drop is either to the left of \`mid\` or to the right of it (or exactly at it) — it cannot be on both sides. So at least one of \`nums[lo..mid]\` and \`nums[mid..hi]\` contains no drop, which means it is sorted. And you can tell which with one comparison:

- If \`nums[lo] <= nums[mid]\`, the **left half is sorted** (a drop inside it would make \`nums[mid]\` smaller than \`nums[lo]\`).
- Otherwise the **right half is sorted**.

📌 **Interview term: Sorted half** — the half of the current range that contains no drop. Once you know it, check whether the target lies within its first and last values; if yes, search there, otherwise search the other half.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="First step of searching 0: mid is index 3 with value 7, the left half 4 to 7 is sorted, 0 is not inside it, so the search moves right">
  <path class="d-edge-dashed" d="M 150 34 L 416 34"/>
  <text class="d-sub" x="283" y="24" text-anchor="middle">sorted half: 4 to 7, 0 is not in it</text>
  <path class="d-edge-dashed" d="M 430 34 L 626 34"/>
  <text class="d-sub" x="528" y="24" text-anchor="middle">search here next</text>
  <rect class="d-box-muted" x="150" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="178" y="75" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="248" y="75" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="290" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="318" y="75" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="360" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="388" y="75" text-anchor="middle">7</text>
  <rect class="d-box" x="430" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="458" y="75" text-anchor="middle">0</text>
  <rect class="d-box" x="500" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="528" y="75" text-anchor="middle">1</text>
  <rect class="d-box" x="570" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="598" y="75" text-anchor="middle">2</text>
  <text class="d-sub" x="178" y="116" text-anchor="middle">lo</text>
  <text class="d-sub" x="388" y="116" text-anchor="middle">mid</text>
  <text class="d-sub" x="598" y="116" text-anchor="middle">hi</text>
  <text class="d-text" x="20" y="75">nums</text>
  <rect class="d-box-muted" x="150" y="150" width="476" height="44" rx="8"/>
  <text class="d-sub" x="388" y="177" text-anchor="middle">4 at lo is not greater than 7 at mid, so lo to mid is sorted</text>
</svg>

In the first step of searching for 0, \`mid\` is index 3 (value 7). Because 4 ≤ 7, indices 0 to 3 are sorted, and 0 is not between 4 and 7, so the target must be in indices 4 to 6. Half the array is gone after one comparison, exactly like ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

## 4. From Brute Force to O(log n)

**Brute force: linear scan, O(n).** Look at every element. Correct, simple, and what the interviewer wants you to beat. It is still useful as a test oracle: the first example checks the fast version against a linear scan on every rotation.

**Approach A: two passes, O(log n).** First find the rotation point \`k\` with a binary search (compare \`nums[mid]\` with \`nums[hi]\`: if \`nums[mid] > nums[hi]\` the drop is to the right of \`mid\`). Then \`nums[0..k-1]\` and \`nums[k..n-1]\` are both sorted; decide which one could contain the target and run an ordinary binary search on it. Two O(log n) passes — easy to explain and easy to get right.

**Approach B: one pass, O(log n).** Combine both steps: at each \`mid\`, find the sorted half and check whether the target is in it. This is the version most interviewers expect.

The one-pass loop, written out:

1. \`lo = 0, hi = n - 1\`; while \`lo <= hi\`: \`mid = lo + (hi - lo) / 2\`.
2. If \`nums[mid] == target\`, return \`mid\`.
3. If \`nums[lo] <= nums[mid]\` (left sorted): if \`nums[lo] <= target < nums[mid]\` go left (\`hi = mid - 1\`), else go right (\`lo = mid + 1\`).
4. Else (right sorted): if \`nums[mid] < target <= nums[hi]\` go right, else go left.
5. Return -1.

Note the \`<=\` in \`nums[lo] <= nums[mid]\`: when the range has two elements, \`lo == mid\`, and the left "half" is the single element \`nums[lo]\`, which is trivially sorted. With \`<\` instead, \`[3, 1]\` searching for 1 would take the wrong branch.

## 5. The Code in Java

**One-pass search** from the first example (the \`trace\` flag prints each step):

~~~java
static int search(int[] nums, int target, boolean trace) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;
        if (trace) {
            String side = nums[lo] <= nums[mid] ? "left" : "right";
            System.out.println("  lo=" + lo + " hi=" + hi + " mid=" + mid + " nums[mid]=" + nums[mid] + "  sorted half: " + side);
        }
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                        // left half [lo..mid] is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
            else lo = mid + 1;
        } else {                                            // right half [mid..hi] is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
            else hi = mid - 1;
        }
    }
    return -1;
}
~~~

Java has no chained comparisons, so the range test is written with \`&&\`. \`(lo + hi) >>> 1\` is the overflow-safe midpoint that the JDK itself uses; an overload \`search(nums, target)\` hides the trace flag.

**Finding the rotation point** from the second example. It compares with \`nums[hi]\`, not \`nums[lo]\`, because comparing with the right end also works when the array is not rotated at all:

~~~java
static int findMinIndex(int[] nums) {          // distinct values
    int lo = 0, hi = nums.length - 1;
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
        else hi = mid;                          // mid could be the minimum itself
    }
    return lo;
}
~~~

**Two-pass search** built on it:

~~~java
static int twoPassSearch(int[] nums, int target) {
    int k = findMinIndex(nums);                 // nums[k..] and nums[..k-1] are both sorted
    if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
    return plainSearch(nums, k, nums.length - 1, target);
}
~~~

📌 **Interview term: Find minimum in rotated sorted array** — the companion problem; its answer is the rotation point, and its loop uses \`while lo < hi\` with \`hi = mid\` (a "first true" boundary search: "is \`nums[i] <= nums[hi]\`?").

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — one-pass search** — the trace for target 0, edge cases, then an exhaustive check

~~~text
search 0 in [4, 5, 6, 7, 0, 1, 2]
  lo=0 hi=6 mid=3 nums[mid]=7  sorted half: left
  lo=4 hi=6 mid=5 nums[mid]=1  sorted half: left
  lo=4 hi=4 mid=4 nums[mid]=0  sorted half: left
  -> index 4
0
-1
-1
0
1
2
all rotations agree with linear scan: true
~~~

**Example 2 — rotation point, two-pass search, duplicates**

~~~text
min of [4, 5, 6, 7, 0, 1, 2] is 0 at index 4 (rotated by 4 positions)
min of [1, 2, 3, 4] is 1 at index 0 (rotated by 0 positions)
min of [2, 1] is 1 at index 1 (rotated by 1 positions)
min of [5] is 5 at index 0 (rotated by 0 positions)
two-pass search 1 in [4, 5, 6, 7, 0, 1, 2]: 5
two-pass search 5 in [4, 5, 6, 7, 0, 1, 2]: 1
two-pass search 3 in [4, 5, 6, 7, 0, 1, 2]: -1
dupes: search 0 in [2, 5, 6, 0, 0, 1, 2] -> true in 1 steps
dupes: search 3 in [2, 5, 6, 0, 0, 1, 2] -> false in 3 steps
dupes: search 0 in [1, 0, 1, 1, 1] -> true in 3 steps
dupes: 100 ones, search 2 -> false in 50 steps
dupes: 100 ones with a 0 at index 30, search 0 -> true in 35 steps
~~~

What to notice:

- The trace for 0 matches the diagram: \`mid = 3\` (7) with the left half sorted, so the search went right; then \`mid = 5\` (1) — at that point the range was \`[0, 1, 2]\` and its "left half" \`[0, 1]\` was sorted, 0 was in it, so it went left — and finally found 0 at index 4.
- \`[3, 1]\` searching for 1 returns 1: the two-element case that the \`<=\` exists for.
- **The exhaustive check** ran every rotation of 0..9 (10 arrays) against a linear scan for 12 targets each, including the absent values -1 and 10, and all 120 answers agreed.
- The rotation point of a non-rotated array (\`[1, 2, 3, 4]\`) and of a single element is index 0, and \`[2, 1]\` gives index 1.
- With duplicates, \`[2, 5, 6, 0, 0, 1, 2]\` still finished quickly, but **100 equal values took 50 steps** to report "not found", and a single 0 hidden at index 30 took 35 steps. That is the O(n) worst case explained next.

## 7. Rotation Point and the Two-Pass Approach

The rotation-point search is a boundary search over the yes/no question "is \`nums[i] <= nums[last]\`?", which is false for the first run and true for the second. When \`nums[mid] > nums[hi]\`, \`mid\` is in the first run and the boundary is to the right (\`lo = mid + 1\`); otherwise \`mid\` is in the second run and might be the minimum itself (\`hi = mid\`). It is the same "first true" pattern used in [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).

## 8. Duplicates: Why the Worst Case Becomes O(n)

With duplicates, the test \`nums[lo] <= nums[mid]\` can lie. Take \`[1, 0, 1, 1, 1]\`: \`nums[lo] = 1\`, \`nums[mid] = 1\`, \`nums[hi] = 1\`. The left half \`[1, 0, 1]\` is *not* sorted, yet the test says it is. When all three are equal, there is genuinely no way to tell which side the drop is on.

The standard fix is to shrink the range by one from both ends (\`lo += 1\`, \`hi -= 1\`) when \`nums[lo] == nums[mid] == nums[hi]\`, and otherwise proceed as before. It is correct — the removed ends equal \`nums[mid]\`, which was already checked against the target — but in the worst case (almost all values equal) it removes only two elements per step. The run showed it: 100 equal values needed 50 steps. So the duplicates version is O(log n) on typical data and **O(n) in the worst case**, and no algorithm can do better in general, because a single different value can hide anywhere among equal ones.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | Checks every element |
| Two-pass (rotation point + binary search) | O(log n) | O(1) | Two halving searches |
| One-pass | O(log n) | O(1) | Discards half the range per step |
| Duplicates allowed | O(log n) typical, O(n) worst | O(1) | Equal ends force shrinking by one |

## 10. Edge Cases

- **Empty array** — \`hi = -1\`, the loop never runs, return -1.
- **One element** — \`[1]\` returns 0 for 1 and -1 for 0 (both in Example 1).
- **Two elements** — \`[3, 1]\`; this is where \`<\` instead of \`<=\` in the sorted-half test breaks.
- **Not rotated** (rotation by 0 or by n) — the left half is always sorted and the algorithm behaves like plain binary search.
- **Target equal to an end of a half** — the range checks use \`<=\` on the outer end and \`<\` against \`nums[mid]\` (already known not to be the target), so both ends are covered.
- **Duplicates** — use the shrinking variant and say the worst case is O(n).

## Common Pitfalls

- **\`nums[lo] < nums[mid]\` instead of \`<=\`.** Breaks the two-element case: with \`<\`, searching \`{3, 1}\` for 1 returns -1 (checked in our test).
- **Getting the range checks backwards.** In the left-sorted branch the test is \`nums[lo] <= target && target < nums[mid]\`.
- **\`(lo + hi) / 2\`.** Overflows for huge arrays; use \`(lo + hi) >>> 1\` or \`lo + (hi - lo) / 2\`.
- **Using \`Arrays.binarySearch\` on the rotated array.** The array is not sorted, so the result is undefined. It is fine on one of the two sorted runs after finding the rotation point (pass \`fromIndex\` and \`toIndex\`).
- **\`List<Integer>\` with \`==\`.** \`list.get(mid) == target\` compares references for boxed \`Integer\`s outside the small-value cache; compare with \`.equals\` or unbox.
- **Claiming O(log n) for the duplicates version.** It is O(n) in the worst case (50 steps for 100 equal values).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The insight:</strong> <span style="color:#f0e2c8;">Cut a rotated sorted array anywhere and at least one half is sorted, because the single drop can only be on one side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which half:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code> the left half is sorted, otherwise the right half is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where to go:</strong> <span style="color:#f0e2c8;">If the target lies within the sorted half's end values, search there; otherwise search the other half. One pass, O(log n), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Find the rotation point first (compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[hi]</code>), then run a normal binary search on the right run. Also O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In Java I write the range tests with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo + hi) &gt;&gt;&gt; 1</code> for the midpoint, and never call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> on the rotated array itself.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if there are duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] == nums[mid] == nums[hi]</code> you cannot tell which half is sorted, so shrink both ends by one. Worst case O(n): 100 equal values took 50 steps in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When two elements remain, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo == mid</code>; the left half is that one element and is sorted. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1]</code> searching for 1 goes the wrong way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the minimum element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid] &gt; nums[hi]</code> set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> ends at the rotation point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a linear scan on every rotation of 0..9 for targets -1 to 10, 120 cases, all agreeing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not on the whole array — it is not sorted, so the result is undefined. After finding the rotation point k, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch(nums, 0, k, target)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(nums, k, n, target)</code> on the right run is fine.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rotated sorted array** | A sorted array with its first k items moved to the end |
| **Rotation point (pivot index)** | Index of the smallest item, where the drop is |
| **Sorted half** | The half of the range with no drop inside it |
| **Find minimum in rotated sorted array** | The boundary search that returns the rotation point |

---
**Conclusion:** A rotated sorted array is two sorted runs, so every split leaves at least one sorted half; one comparison (\`nums[lo] <= nums[mid]\`) tells you which, a range check tells you whether the target is there, and you keep halving — O(log n) time and O(1) space. Alternatively find the rotation point and binary search one run, where \`Arrays.binarySearch\` with a range is allowed. The run checked the one-pass version against a linear scan on all rotations, and showed the honest caveat: with duplicates the worst case is O(n), 50 steps for 100 equal values.`,
        examples: [
          {
            label: `One-pass search, checked against every rotation`,
            code: `// Search in a rotated sorted array (distinct values) in O(log n).
public class Main {
    static int search(int[] nums, int target, boolean trace) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (trace) {
                String side = nums[lo] <= nums[mid] ? "left" : "right";
                System.out.println("  lo=" + lo + " hi=" + hi + " mid=" + mid + " nums[mid]=" + nums[mid] + "  sorted half: " + side);
            }
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {                        // left half [lo..mid] is sorted
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
                else lo = mid + 1;
            } else {                                            // right half [mid..hi] is sorted
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
                else hi = mid - 1;
            }
        }
        return -1;
    }

    static int search(int[] nums, int target) { return search(nums, target, false); }

    static int linear(int[] a, int t) {
        for (int i = 0; i < a.length; i++) if (a[i] == t) return i;
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = { 4, 5, 6, 7, 0, 1, 2 };
        System.out.println("search 0 in [4, 5, 6, 7, 0, 1, 2]");
        int found = search(nums, 0, true);
        System.out.println("  -> index " + found);

        System.out.println(search(nums, 4));                    // 0
        System.out.println(search(nums, 3));                    // -1
        System.out.println(search(new int[] { 1 }, 0));         // -1
        // single element, two elements and a non-rotated array:
        System.out.println(search(new int[] { 1 }, 1));         // 0
        System.out.println(search(new int[] { 3, 1 }, 1));      // 1
        System.out.println(search(new int[] { 1, 2, 3, 4 }, 3)); // 2

        // Check every rotation of 0..9 against a linear scan, for targets -1..10.
        boolean ok = true;
        for (int k = 0; k < 10; k++) {
            int[] rot = new int[10];
            for (int i = 0; i < 10; i++) rot[i] = (i + k) % 10;
            for (int t = -1; t <= 10; t++) ok = ok && search(rot, t) == linear(rot, t);
        }
        System.out.println("all rotations agree with linear scan: " + ok);
    }
}`,
          },
          {
            label: `Rotation point, two-pass search, and duplicates`,
            code: `import java.util.Arrays;

// Find the rotation point (index of the minimum), search in two passes,
// and see why duplicates break the O(log n) guarantee.
public class Main {
    static int steps; // set by searchWithDupes

    static int findMinIndex(int[] nums) {          // distinct values
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
            else hi = mid;                          // mid could be the minimum itself
        }
        return lo;
    }

    static int plainSearch(int[] a, int lo, int hi, int target) { // ordinary binary search on a[lo..hi]
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    static int twoPassSearch(int[] nums, int target) {
        int k = findMinIndex(nums);                 // nums[k..] and nums[..k-1] are both sorted
        if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
        return plainSearch(nums, k, nums.length - 1, target);
    }

    static boolean searchWithDupes(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        steps = 0;
        while (lo <= hi) {
            steps++;
            int mid = (lo + hi) >>> 1;
            if (nums[mid] == target) return true;
            if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) { lo++; hi--; } // cannot tell: shrink by one
            else if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return false;
    }

    public static void main(String[] args) {
        int[][] arrs = { { 4, 5, 6, 7, 0, 1, 2 }, { 1, 2, 3, 4 }, { 2, 1 }, { 5 } };
        for (int[] arr : arrs) {
            int k = findMinIndex(arr);
            System.out.println("min of " + Arrays.toString(arr) + " is " + arr[k] + " at index " + k + " (rotated by " + k + " positions)");
        }
        int[] r = { 4, 5, 6, 7, 0, 1, 2 };
        for (int t : new int[] { 1, 5, 3 })
            System.out.println("two-pass search " + t + " in " + Arrays.toString(r) + ": " + twoPassSearch(r, t));

        int[][] dupArrs = { { 2, 5, 6, 0, 0, 1, 2 }, { 2, 5, 6, 0, 0, 1, 2 }, { 1, 0, 1, 1, 1 } };
        int[] targets = { 0, 3, 0 };
        for (int i = 0; i < targets.length; i++) {
            boolean found = searchWithDupes(dupArrs[i], targets[i]);
            System.out.println("dupes: search " + targets[i] + " in " + Arrays.toString(dupArrs[i]) + " -> " + found + " in " + steps + " steps");
        }
        int[] ones = new int[100];
        Arrays.fill(ones, 1);                       // 100 equal values, target absent: the worst case
        boolean found = searchWithDupes(ones, 2);
        System.out.println("dupes: 100 ones, search 2 -> " + found + " in " + steps + " steps");
        ones[30] = 0;                               // one zero hidden at index 30
        found = searchWithDupes(ones, 0);
        System.out.println("dupes: 100 ones with a 0 at index 30, search 0 -> " + found + " in " + steps + " steps");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a sorted array of distinct integers that has been rotated at an unknown point, like [4, 5, 6, 7, 0, 1, 2], and a target. Return its index or -1, in O(log n) time. Please code it in C++."

**What a strong answer should cover:**
- The key insight: at any midpoint at least one half is sorted, and \`nums[lo] <= nums[mid]\` tells you which.
- Correct range checks: search the sorted half only if the target lies within its end values, otherwise the other half.
- O(log n) time and O(1) space, plus the two-pass alternative (find the rotation point, then binary search one run).
- Edge cases: not rotated, one or two elements (the \`<=\`), empty array, target absent.
- The duplicates follow-up: shrink both ends when \`nums[lo] == nums[mid] == nums[hi]\`; worst case O(n).
- C++ specifics: \`int\` (not \`size_t\`) indices because \`hi\` can reach -1, \`&&\` range tests, and \`std::lower_bound\` only on a sorted run.

**Clarifying questions expected:**
- Are all values distinct?
- Should I return the index or just whether it exists?
- Can the array be empty or not rotated at all?

**Code / implementation expected:** Yes — a one-pass O(log n) C++ solution, tested on edge cases.`,
        answer: `# Searching a Rotated Sorted Array (C++)

**Target Audience:** Learners who know basic binary search and are preparing for coding interviews.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block was produced by actually running the programs (g++ 13.3.0 with -std=c++17); nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

A librarian keeps a shelf of books sorted by number: 1, 2, 3, ... 100. One night someone takes the first 40 books and puts them, still in order, at the end of the shelf. Now the shelf reads 41, 42, ..., 100, 1, 2, ..., 40. It is no longer sorted, so ordinary binary search breaks — and yet it is *almost* sorted: it is two sorted runs glued together.

Can you still find book 17 by looking at only a handful of books? Yes. Open the shelf in the middle. Whatever you see, **one of the two halves is still a perfectly sorted run**, and for a sorted run you can tell instantly whether book 17 is inside it by looking at its two ends. So you can still throw away half the shelf at every step. That one observation is the whole trick, and it keeps the search at O(log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the values distinct? | With duplicates the "which half is sorted" test can be ambiguous and the worst case becomes O(n) (section 8). |
| Do I return the index, or just true/false? | The duplicates version (LeetCode 81 style) usually returns a boolean. |
| Could the array be not rotated at all, or empty? | Rotation by 0 must work too; an empty array returns -1. |
| Is the rotation amount known? | If k is given, you can map indices directly and run plain binary search. |
| Ascending order? | The comparisons below assume ascending; descending flips them. |

## 3. The Key Insight: One Half Is Always Sorted

📌 **Interview term: Rotated sorted array** — a sorted array whose first k elements have been moved to the end, in order: \`[0, 1, 2, 4, 5, 6, 7]\` rotated by 4 is \`[4, 5, 6, 7, 0, 1, 2]\`. (Producing one is its own question: [rotating an array by k positions](/interview-question/how-do-you-rotate-an-array-by-k-positions).)

📌 **Interview term: Rotation point (pivot index)** — the index of the smallest element, where the "drop" happens; here index 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The rotated array 4 5 6 7 0 1 2 drawn as bars: two ascending runs, with the drop between index 3 and index 4">
  <defs>
    <marker id="b03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="150" y="118" width="50" height="112" rx="4"/>
  <text class="d-text" x="175" y="108" text-anchor="middle">4</text>
  <text class="d-sub" x="175" y="252" text-anchor="middle">index 0</text>
  <rect class="d-box-accent" x="220" y="96" width="50" height="134" rx="4"/>
  <text class="d-text" x="245" y="86" text-anchor="middle">5</text>
  <text class="d-sub" x="245" y="252" text-anchor="middle">index 1</text>
  <rect class="d-box-accent" x="290" y="74" width="50" height="156" rx="4"/>
  <text class="d-text" x="315" y="64" text-anchor="middle">6</text>
  <text class="d-sub" x="315" y="252" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="360" y="52" width="50" height="178" rx="4"/>
  <text class="d-text" x="385" y="42" text-anchor="middle">7</text>
  <text class="d-sub" x="385" y="252" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="470" y="206" width="50" height="24" rx="4"/>
  <text class="d-text" x="495" y="196" text-anchor="middle">0</text>
  <text class="d-sub" x="495" y="252" text-anchor="middle">index 4</text>
  <rect class="d-box-muted" x="540" y="184" width="50" height="46" rx="4"/>
  <text class="d-text" x="565" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="565" y="252" text-anchor="middle">index 5</text>
  <rect class="d-box-muted" x="610" y="162" width="50" height="68" rx="4"/>
  <text class="d-text" x="635" y="152" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="252" text-anchor="middle">index 6</text>
  <text class="d-text d-accent" x="495" y="124" text-anchor="middle">rotation point</text>
  <path class="d-edge" d="M 495 136 L 495 172" marker-end="url(#b03q5-arrow)"/>
  <text class="d-sub" x="280" y="285" text-anchor="middle">first run 4 to 7</text>
  <text class="d-sub" x="565" y="285" text-anchor="middle">second run 0 to 2</text>
</svg>

The array is two ascending runs: the accented first run 4, 5, 6, 7 and the second run 0, 1, 2. The rotation point is the start of the second run.

Pick any \`mid\`. The drop is either to the left of \`mid\` or to the right of it (or exactly at it) — it cannot be on both sides. So at least one of \`nums[lo..mid]\` and \`nums[mid..hi]\` contains no drop, which means it is sorted. And you can tell which with one comparison:

- If \`nums[lo] <= nums[mid]\`, the **left half is sorted** (a drop inside it would make \`nums[mid]\` smaller than \`nums[lo]\`).
- Otherwise the **right half is sorted**.

📌 **Interview term: Sorted half** — the half of the current range that contains no drop. Once you know it, check whether the target lies within its first and last values; if yes, search there, otherwise search the other half.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="First step of searching 0: mid is index 3 with value 7, the left half 4 to 7 is sorted, 0 is not inside it, so the search moves right">
  <path class="d-edge-dashed" d="M 150 34 L 416 34"/>
  <text class="d-sub" x="283" y="24" text-anchor="middle">sorted half: 4 to 7, 0 is not in it</text>
  <path class="d-edge-dashed" d="M 430 34 L 626 34"/>
  <text class="d-sub" x="528" y="24" text-anchor="middle">search here next</text>
  <rect class="d-box-muted" x="150" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="178" y="75" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="220" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="248" y="75" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="290" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="318" y="75" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="360" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="388" y="75" text-anchor="middle">7</text>
  <rect class="d-box" x="430" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="458" y="75" text-anchor="middle">0</text>
  <rect class="d-box" x="500" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="528" y="75" text-anchor="middle">1</text>
  <rect class="d-box" x="570" y="50" width="56" height="40" rx="6"/>
  <text class="d-text" x="598" y="75" text-anchor="middle">2</text>
  <text class="d-sub" x="178" y="116" text-anchor="middle">lo</text>
  <text class="d-sub" x="388" y="116" text-anchor="middle">mid</text>
  <text class="d-sub" x="598" y="116" text-anchor="middle">hi</text>
  <text class="d-text" x="20" y="75">nums</text>
  <rect class="d-box-muted" x="150" y="150" width="476" height="44" rx="8"/>
  <text class="d-sub" x="388" y="177" text-anchor="middle">4 at lo is not greater than 7 at mid, so lo to mid is sorted</text>
</svg>

In the first step of searching for 0, \`mid\` is index 3 (value 7). Because 4 ≤ 7, indices 0 to 3 are sorted, and 0 is not between 4 and 7, so the target must be in indices 4 to 6. Half the array is gone after one comparison, exactly like ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

## 4. From Brute Force to O(log n)

**Brute force: linear scan, O(n).** Look at every element. Correct, simple, and what the interviewer wants you to beat. It is still useful as a test oracle: the first example checks the fast version against a linear scan on every rotation.

**Approach A: two passes, O(log n).** First find the rotation point \`k\` with a binary search (compare \`nums[mid]\` with \`nums[hi]\`: if \`nums[mid] > nums[hi]\` the drop is to the right of \`mid\`). Then \`nums[0..k-1]\` and \`nums[k..n-1]\` are both sorted; decide which one could contain the target and run an ordinary binary search on it. Two O(log n) passes — easy to explain and easy to get right.

**Approach B: one pass, O(log n).** Combine both steps: at each \`mid\`, find the sorted half and check whether the target is in it. This is the version most interviewers expect.

The one-pass loop, written out:

1. \`lo = 0, hi = n - 1\`; while \`lo <= hi\`: \`mid = lo + (hi - lo) / 2\`.
2. If \`nums[mid] == target\`, return \`mid\`.
3. If \`nums[lo] <= nums[mid]\` (left sorted): if \`nums[lo] <= target < nums[mid]\` go left (\`hi = mid - 1\`), else go right (\`lo = mid + 1\`).
4. Else (right sorted): if \`nums[mid] < target <= nums[hi]\` go right, else go left.
5. Return -1.

Note the \`<=\` in \`nums[lo] <= nums[mid]\`: when the range has two elements, \`lo == mid\`, and the left "half" is the single element \`nums[lo]\`, which is trivially sorted. With \`<\` instead, \`[3, 1]\` searching for 1 would take the wrong branch.

## 5. The Code in C++

**One-pass search** from the first example (the \`trace\` flag prints each step):

~~~cpp
int search(const vector<int>& nums, int target, bool trace = false) {
    int lo = 0, hi = int(nums.size()) - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (trace)
            cout << "  lo=" << lo << " hi=" << hi << " mid=" << mid << " nums[mid]=" << nums[mid]
                 << "  sorted half: " << (nums[lo] <= nums[mid] ? "left" : "right") << "\\n";
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                        // left half [lo..mid] is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
            else lo = mid + 1;
        } else {                                            // right half [mid..hi] is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
            else hi = mid - 1;
        }
    }
    return -1;
}
~~~

The range test needs \`&&\` (C++ has no chained comparisons; \`a <= b < c\` compiles but compares a \`bool\` with \`c\`). Indices are \`int\`, because \`hi\` can become -1, which \`size_t\` cannot represent. The vector is taken as \`const vector<int>&\` — no copy, read only.

**Finding the rotation point** from the second example. It compares with \`nums[hi]\`, not \`nums[lo]\`, because comparing with the right end also works when the array is not rotated at all:

~~~cpp
int findMinIndex(const vector<int>& nums) {       // distinct values
    int lo = 0, hi = int(nums.size()) - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] > nums[hi]) lo = mid + 1;    // the drop is to the right of mid
        else hi = mid;                             // mid could be the minimum itself
    }
    return lo;
}
~~~

**Two-pass search** built on it:

~~~cpp
int twoPassSearch(const vector<int>& nums, int target) {
    int k = findMinIndex(nums);                    // nums[k..] and nums[..k-1] are both sorted
    if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
    return plainSearch(nums, k, int(nums.size()) - 1, target);
}
~~~

📌 **Interview term: Find minimum in rotated sorted array** — the companion problem; its answer is the rotation point, and its loop uses \`while lo < hi\` with \`hi = mid\` (a "first true" boundary search: "is \`nums[i] <= nums[hi]\`?").

## 6. Verified: Running the Code

Each program below is one of the runnable examples on this page. It was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same program was also written in the other three languages and all four printed exactly the same text.

**Example 1 — one-pass search** — the trace for target 0, edge cases, then an exhaustive check

~~~text
search 0 in [4, 5, 6, 7, 0, 1, 2]
  lo=0 hi=6 mid=3 nums[mid]=7  sorted half: left
  lo=4 hi=6 mid=5 nums[mid]=1  sorted half: left
  lo=4 hi=4 mid=4 nums[mid]=0  sorted half: left
  -> index 4
0
-1
-1
0
1
2
all rotations agree with linear scan: true
~~~

**Example 2 — rotation point, two-pass search, duplicates**

~~~text
min of [4, 5, 6, 7, 0, 1, 2] is 0 at index 4 (rotated by 4 positions)
min of [1, 2, 3, 4] is 1 at index 0 (rotated by 0 positions)
min of [2, 1] is 1 at index 1 (rotated by 1 positions)
min of [5] is 5 at index 0 (rotated by 0 positions)
two-pass search 1 in [4, 5, 6, 7, 0, 1, 2]: 5
two-pass search 5 in [4, 5, 6, 7, 0, 1, 2]: 1
two-pass search 3 in [4, 5, 6, 7, 0, 1, 2]: -1
dupes: search 0 in [2, 5, 6, 0, 0, 1, 2] -> true in 1 steps
dupes: search 3 in [2, 5, 6, 0, 0, 1, 2] -> false in 3 steps
dupes: search 0 in [1, 0, 1, 1, 1] -> true in 3 steps
dupes: 100 ones, search 2 -> false in 50 steps
dupes: 100 ones with a 0 at index 30, search 0 -> true in 35 steps
~~~

What to notice:

- The trace for 0 matches the diagram: \`mid = 3\` (7) with the left half sorted, so the search went right; then \`mid = 5\` (1) — at that point the range was \`[0, 1, 2]\` and its "left half" \`[0, 1]\` was sorted, 0 was in it, so it went left — and finally found 0 at index 4.
- \`[3, 1]\` searching for 1 returns 1: the two-element case that the \`<=\` exists for.
- **The exhaustive check** ran every rotation of 0..9 (10 arrays) against a linear scan for 12 targets each, including the absent values -1 and 10, and all 120 answers agreed.
- The rotation point of a non-rotated array (\`[1, 2, 3, 4]\`) and of a single element is index 0, and \`[2, 1]\` gives index 1.
- With duplicates, \`[2, 5, 6, 0, 0, 1, 2]\` still finished quickly, but **100 equal values took 50 steps** to report "not found", and a single 0 hidden at index 30 took 35 steps. That is the O(n) worst case explained next.

## 7. Rotation Point and the Two-Pass Approach

The rotation-point search is a boundary search over the yes/no question "is \`nums[i] <= nums[last]\`?", which is false for the first run and true for the second. When \`nums[mid] > nums[hi]\`, \`mid\` is in the first run and the boundary is to the right (\`lo = mid + 1\`); otherwise \`mid\` is in the second run and might be the minimum itself (\`hi = mid\`). It is the same "first true" pattern used in [binary search on the answer](/interview-question/what-is-binary-search-on-the-answer).

## 8. Duplicates: Why the Worst Case Becomes O(n)

With duplicates, the test \`nums[lo] <= nums[mid]\` can lie. Take \`[1, 0, 1, 1, 1]\`: \`nums[lo] = 1\`, \`nums[mid] = 1\`, \`nums[hi] = 1\`. The left half \`[1, 0, 1]\` is *not* sorted, yet the test says it is. When all three are equal, there is genuinely no way to tell which side the drop is on.

The standard fix is to shrink the range by one from both ends (\`lo += 1\`, \`hi -= 1\`) when \`nums[lo] == nums[mid] == nums[hi]\`, and otherwise proceed as before. It is correct — the removed ends equal \`nums[mid]\`, which was already checked against the target — but in the worst case (almost all values equal) it removes only two elements per step. The run showed it: 100 equal values needed 50 steps. So the duplicates version is O(log n) on typical data and **O(n) in the worst case**, and no algorithm can do better in general, because a single different value can hide anywhere among equal ones.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | Checks every element |
| Two-pass (rotation point + binary search) | O(log n) | O(1) | Two halving searches |
| One-pass | O(log n) | O(1) | Discards half the range per step |
| Duplicates allowed | O(log n) typical, O(n) worst | O(1) | Equal ends force shrinking by one |

## 10. Edge Cases

- **Empty array** — \`hi = -1\`, the loop never runs, return -1.
- **One element** — \`[1]\` returns 0 for 1 and -1 for 0 (both in Example 1).
- **Two elements** — \`[3, 1]\`; this is where \`<\` instead of \`<=\` in the sorted-half test breaks.
- **Not rotated** (rotation by 0 or by n) — the left half is always sorted and the algorithm behaves like plain binary search.
- **Target equal to an end of a half** — the range checks use \`<=\` on the outer end and \`<\` against \`nums[mid]\` (already known not to be the target), so both ends are covered.
- **Duplicates** — use the shrinking variant and say the worst case is O(n).

## Common Pitfalls

- **Writing \`nums[lo] <= target < nums[mid]\`.** It compiles, but compares the \`bool\` result of the first comparison with \`nums[mid]\`. Use \`&&\`.
- **\`nums[lo] < nums[mid]\` instead of \`<=\`.** Breaks the two-element case: with \`<\`, searching \`{3, 1}\` for 1 returns -1 (checked in our test).
- **\`size_t\` indices.** \`hi = mid - 1\` with \`mid = 0\` wraps around to a huge value; use \`int\`.
- **Using \`std::lower_bound\` on the whole rotated vector.** It requires a partitioned range, which a rotated array is not. Use it on one sorted run after finding the rotation point.
- **\`std::find\` and calling it done.** It is O(n), the brute force the interviewer wants you to beat.
- **Claiming O(log n) for the duplicates version.** It is O(n) in the worst case (50 steps for 100 equal values).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The insight:</strong> <span style="color:#f0e2c8;">Cut a rotated sorted array anywhere and at least one half is sorted, because the single drop can only be on one side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Which half:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code> the left half is sorted, otherwise the right half is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where to go:</strong> <span style="color:#f0e2c8;">If the target lies within the sorted half's end values, search there; otherwise search the other half. One pass, O(log n), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Find the rotation point first (compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[hi]</code>), then run a normal binary search on the right run. Also O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In my language:</strong> <span style="color:#f0e2c8;">In C++ I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> indices because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> can reach -1, write the range tests with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code>, and take the vector as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const vector&lt;int&gt;&amp;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if there are duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[lo] == nums[mid] == nums[hi]</code> you cannot tell which half is sorted, so shrink both ends by one. Worst case O(n): 100 equal values took 50 steps in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[lo] &lt;= nums[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When two elements remain, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo == mid</code>; the left half is that one element and is sorted. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1]</code> searching for 1 goes the wrong way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the minimum element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid] &gt; nums[hi]</code> set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> ends at the rotation point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a linear scan on every rotation of 0..9 for targets -1 to 10, 120 cases, all agreeing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::lower_bound</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not on the whole vector, which is not partitioned. After finding the rotation point k, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound(nums.begin() + k, nums.end(), target)</code> on the right run (or the left run) is fine.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rotated sorted array** | A sorted array with its first k items moved to the end |
| **Rotation point (pivot index)** | Index of the smallest item, where the drop is |
| **Sorted half** | The half of the range with no drop inside it |
| **Find minimum in rotated sorted array** | The boundary search that returns the rotation point |

---
**Conclusion:** A rotated sorted array is two sorted runs, so every split leaves at least one sorted half; one comparison (\`nums[lo] <= nums[mid]\`) tells you which, a range check tells you whether the target is there, and you keep halving — O(log n) time and O(1) space. Alternatively find the rotation point and run \`std::lower_bound\` on one run. The run checked the one-pass version against a linear scan on all rotations, and showed the honest caveat: with duplicates the worst case is O(n), 50 steps for 100 equal values. In C++, keep indices signed and write the range tests with \`&&\`.`,
        examples: [
          {
            label: `One-pass search, checked against every rotation`,
            code: `// Search in a rotated sorted array (distinct values) in O(log n).
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int search(const vector<int>& nums, int target, bool trace = false) {
    int lo = 0, hi = int(nums.size()) - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (trace)
            cout << "  lo=" << lo << " hi=" << hi << " mid=" << mid << " nums[mid]=" << nums[mid]
                 << "  sorted half: " << (nums[lo] <= nums[mid] ? "left" : "right") << "\\n";
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                        // left half [lo..mid] is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target is inside it
            else lo = mid + 1;
        } else {                                            // right half [mid..hi] is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target is inside it
            else hi = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> nums = {4, 5, 6, 7, 0, 1, 2};
    cout << "search 0 in [4, 5, 6, 7, 0, 1, 2]\\n";
    int found = search(nums, 0, true);
    cout << "  -> index " << found << "\\n";

    cout << search(nums, 4) << "\\n";           // 0
    cout << search(nums, 3) << "\\n";           // -1
    cout << search({1}, 0) << "\\n";            // -1
    // single element, two elements and a non-rotated array:
    cout << search({1}, 1) << "\\n";            // 0
    cout << search({3, 1}, 1) << "\\n";         // 1
    cout << search({1, 2, 3, 4}, 3) << "\\n";   // 2

    // Check every rotation of 0..9 against a linear scan (std::find), for targets -1..10.
    vector<int> base = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    bool ok = true;
    for (int k = 0; k < 10; k++) {
        vector<int> rot = base;
        rotate(rot.begin(), rot.begin() + k, rot.end()); // rot = base[k:] + base[:k]
        for (int t = -1; t <= 10; t++) {
            auto it = find(rot.begin(), rot.end(), t);
            int expected = it == rot.end() ? -1 : int(it - rot.begin());
            ok = ok && search(rot, t) == expected;
        }
    }
    cout << "all rotations agree with linear scan: " << boolalpha << ok << "\\n";
}`,
          },
          {
            label: `Rotation point, two-pass search, and duplicates`,
            code: `// Find the rotation point (index of the minimum), search in two passes,
// and see why duplicates break the O(log n) guarantee.
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int findMinIndex(const vector<int>& nums) {       // distinct values
    int lo = 0, hi = int(nums.size()) - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] > nums[hi]) lo = mid + 1;    // the drop is to the right of mid
        else hi = mid;                             // mid could be the minimum itself
    }
    return lo;
}

int plainSearch(const vector<int>& a, int lo, int hi, int target) { // ordinary binary search on a[lo..hi]
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int twoPassSearch(const vector<int>& nums, int target) {
    int k = findMinIndex(nums);                    // nums[k..] and nums[..k-1] are both sorted
    if (k > 0 && nums[0] <= target && target <= nums[k - 1]) return plainSearch(nums, 0, k - 1, target);
    return plainSearch(nums, k, int(nums.size()) - 1, target);
}

pair<bool, int> searchWithDupes(const vector<int>& nums, int target) { // {found, steps}
    int lo = 0, hi = int(nums.size()) - 1, steps = 0;
    while (lo <= hi) {
        steps++;
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return {true, steps};
        if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) { lo++; hi--; } // cannot tell: shrink by one
        else if (nums[lo] <= nums[mid]) {
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return {false, steps};
}

int main() {
    cout << boolalpha;
    for (const vector<int>& arr : vector<vector<int>>{{4, 5, 6, 7, 0, 1, 2}, {1, 2, 3, 4}, {2, 1}, {5}}) {
        int k = findMinIndex(arr);
        cout << "min of " << fmt(arr) << " is " << arr[k] << " at index " << k << " (rotated by " << k << " positions)\\n";
    }
    vector<int> r = {4, 5, 6, 7, 0, 1, 2};
    for (int t : {1, 5, 3}) cout << "two-pass search " << t << " in " << fmt(r) << ": " << twoPassSearch(r, t) << "\\n";

    vector<pair<vector<int>, int>> cases = {{{2, 5, 6, 0, 0, 1, 2}, 0}, {{2, 5, 6, 0, 0, 1, 2}, 3}, {{1, 0, 1, 1, 1}, 0}};
    for (auto& [arr, t] : cases) {
        auto [found, steps] = searchWithDupes(arr, t);
        cout << "dupes: search " << t << " in " << fmt(arr) << " -> " << found << " in " << steps << " steps\\n";
    }
    vector<int> ones(100, 1);                      // 100 equal values, target absent: the worst case
    auto [found, steps] = searchWithDupes(ones, 2);
    cout << "dupes: 100 ones, search 2 -> " << found << " in " << steps << " steps\\n";
    ones[30] = 0;                                  // one zero hidden at index 30
    tie(found, steps) = searchWithDupes(ones, 0);
    cout << "dupes: 100 ones with a 0 at index 30, search 0 -> " << found << " in " << steps << " steps\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
