/**
 * DSA ULTRA — batch 20: heaps and priority queues, part 2 — merging k sorted lists (heap vs
 * divide and conquer), the median of a data stream, the two-heap invariant and rebalancing, the
 * sliding window median with lazy deletion, and a Twitter-style news feed built from a heap plus
 * hash maps. One complete answer per language (Python, JavaScript, Java, C++). Every example was
 * run with python3 / node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: `Merge k sorted lists: heap vs divide-and-conquer — which is better for n=10k?`,
    difficulty: "medium",
    seoDescription: `Heap vs divide-and-conquer for merging k sorted lists of 10,000 items: both O(N log k), with real comparison counts in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have k sorted Python lists holding about 10,000 numbers in total. Would you merge them with a heap or with divide and conquer? Code both, tell me their complexity, and tell me which one you would actually ship."

**What a strong answer should cover:**
- Both are O(N log k) time; sequential merging is O(N·k) and is the trap to avoid.
- Heap: O(k) extra memory, works on streams, can stop early; divide and conquer: fewer comparisons (one per item per level) and no heap at all.
- Clarifying what "n = 10k" means: total items N, or number of lists k.
- Python details: \`heapq\` is a min-heap on a plain list; entries must be tuples with a tie-breaker index so Python never compares the payload; \`heapq.merge\` already exists in the standard library.
- An honest measurement: at this size in CPython the C-implemented \`heapq\` beats a pure-Python merge loop, and \`sorted()\` beats both.

**Clarifying questions expected:**
- Is 10,000 the total item count or the number of lists?
- Arrays or linked lists; all in memory or streams?

**Code / implementation expected:** Yes — a \`heapq\`-based k-way merge and a recursive pairwise merge, in Python 3.`,
        answer: `**Target Audience:** Developers who know basic arrays and loops in Python and want to reason about algorithm trade-offs, not just Big-O.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has run the same exam in many classrooms. Each teacher hands in a stack of papers already sorted by score, lowest on top. The head teacher needs **one** sorted pile of every paper. There are two sensible ways to do it.

**The front desk.** Put every stack on a long desk. Look only at the *top* paper of each stack, take the lowest one, put it on the output pile, and look again. A clever assistant keeps the tops in a little "who is lowest" structure so she does not have to scan the whole desk each time. That assistant is a **heap**.

**The tournament.** Pair the stacks up: classroom 1 with 2, 3 with 4, and so on. Merge each pair into one sorted stack (easy: only two tops to compare). Now there are half as many stacks. Pair them up again. After a few rounds there is one stack. That is **divide and conquer**.

The interview question is: with about 10,000 papers in total, which way is better? The honest answer surprises people: **both do the same amount of work in Big-O terms, O(N log k), and at N = 10,000 both finish in about a millisecond.** What separates them is the constant factor, memory, and whether the data is all in memory or arriving as streams. This page measures all of that instead of guessing.

## 2. Questions to Ask Your Interviewer First

The phrase "n = 10k" is ambiguous, and the right answer depends on what it means.

| Question | Why it matters |
| :--- | :--- |
| Is 10,000 the total number of items N, or the number of lists k? | Both methods cost O(N log k). The log k part is what changes: 100 lists of 100 items is very different from 10,000 lists of 1 item. |
| Are these arrays or linked lists? | With linked lists, divide and conquer can relink nodes with O(1) extra memory; with arrays each level builds new arrays. |
| Is everything in memory, or are the lists streams (files, network)? | A heap can merge streams lazily, reading one item at a time. Divide and conquer wants whole lists up front. |
| Do you need the whole output, or only the first m items? | A heap can stop after m pops; divide and conquer must finish every level before the first item is final. |
| Do equal values need to keep a particular order? | A heap is not stable by itself; you add a tie-breaker such as the list index. |

## 3. The Shared Building Block, and the Trap

Both methods are built on one small skill: [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays) with two pointers. Compare the two front items, take the smaller, move that pointer. Two lists of total length m take at most m − 1 comparisons.

📌 **Interview term: k-way merge** — combining k sorted sequences into one sorted sequence. N is the total number of items across all k lists.

The tempting first idea is to merge list 1 into list 2, then that result into list 3, and so on. It is correct but slow: the growing result is re-read on every step. With k lists of n/k items each, the total work is about N·k / 2. At N = 10,000 and k = 100 that is roughly 500,000 comparisons (the run below measured 498,939).

📌 **Interview term: Sequential (one-by-one) merging** — merging the lists into a growing result one at a time. It costs O(N·k), because early items are copied again at every step.

## 4. Approach A — A Min-Heap of the k Front Items

Keep one entry per list in a [min-heap](/interview-question/what-is-a-heap-priority-queue): the list's current front item. Pop the smallest, write it to the output, and push the next item from *the same list*. The heap never holds more than k entries, so each push or pop costs O(log k), and every one of the N items is pushed and popped once.

📌 **Interview term: Min-heap** — a tree stored in an array where every parent is less than or equal to its children, so the smallest item is always at index 0. Push and pop cost O(log size).

📌 **Interview term: Tie-breaker** — an extra field (here the list index) compared when two values are equal, so the heap never has to compare the payload itself and the order of equal values is predictable.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Three sorted lists feed their first items into a min-heap; each pop goes to the output and the next item of the same list is pushed">
  <defs>
    <marker id="b20q1py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="57" text-anchor="middle">list 0: 1, 4, 5</text>
  <rect class="d-box" x="20" y="100" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="127" text-anchor="middle">list 1: 1, 3, 4</text>
  <rect class="d-box" x="20" y="170" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="197" text-anchor="middle">list 2: 2, 6</text>
  <path class="d-edge" d="M 192 52 L 264 100" marker-end="url(#b20q1py-a1)"/>
  <path class="d-edge" d="M 192 122 L 264 125" marker-end="url(#b20q1py-a1)"/>
  <path class="d-edge" d="M 192 192 L 264 150" marker-end="url(#b20q1py-a1)"/>
  <rect class="d-box-accent" x="270" y="70" width="180" height="110" rx="10"/>
  <text class="d-text" x="360" y="104" text-anchor="middle">min-heap of heads</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">at most k entries</text>
  <text class="d-sub" x="360" y="154" text-anchor="middle">top = smallest head</text>
  <path class="d-edge-accent" d="M 452 125 L 514 125" marker-end="url(#b20q1py-a1)"/>
  <text class="d-sub" x="483" y="112" text-anchor="middle">pop</text>
  <rect class="d-box-muted" x="520" y="95" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="120" text-anchor="middle">output</text>
  <text class="d-sub" x="600" y="142" text-anchor="middle">1, 1, 2, 3, 4</text>
  <path class="d-edge-dashed" d="M 600 157 L 600 228 L 360 228 L 360 186" marker-end="url(#b20q1py-a1)"/>
  <text class="d-sub" x="480" y="252" text-anchor="middle">push next item of same list</text>
</svg>

Each list sends only its current front item into the heap. When the heap gives up its smallest entry, the next item from that same list takes its place, so the heap size stays at most k.

## 5. Approach B — Divide and Conquer (Pairwise Merging)

Split the k lists into two halves, merge each half recursively, then merge the two results with the ordinary two-list merge. It is exactly the merge step of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), started from k sorted runs instead of N single items.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into smaller copies of itself, solving those, and combining the answers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Divide and conquer merges eight lists in three levels: four pair merges, then two, then one">
  <rect class="d-box-accent" x="210" y="20" width="260" height="36" rx="8"/>
  <text class="d-text" x="340" y="43" text-anchor="middle">all 8 lists merged</text>
  <rect class="d-box" x="80" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="180" y="119" text-anchor="middle">L0 to L3</text>
  <path class="d-edge" d="M 180 96 L 340 56"/>
  <rect class="d-box" x="400" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="500" y="119" text-anchor="middle">L4 to L7</text>
  <path class="d-edge" d="M 500 96 L 340 56"/>
  <rect class="d-box" x="40" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="100" y="195" text-anchor="middle">L0 + L1</text>
  <path class="d-edge" d="M 100 172 L 180 132"/>
  <rect class="d-box" x="200" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="260" y="195" text-anchor="middle">L2 + L3</text>
  <path class="d-edge" d="M 260 172 L 180 132"/>
  <rect class="d-box" x="360" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="420" y="195" text-anchor="middle">L4 + L5</text>
  <path class="d-edge" d="M 420 172 L 500 132"/>
  <rect class="d-box" x="520" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="580" y="195" text-anchor="middle">L6 + L7</text>
  <path class="d-edge" d="M 580 172 L 500 132"/>
  <rect class="d-box-muted" x="30" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="60" y="271" text-anchor="middle">L0</text>
  <path class="d-edge" d="M 60 248 L 100 208"/>
  <rect class="d-box-muted" x="110" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="140" y="271" text-anchor="middle">L1</text>
  <path class="d-edge" d="M 140 248 L 100 208"/>
  <rect class="d-box-muted" x="190" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="220" y="271" text-anchor="middle">L2</text>
  <path class="d-edge" d="M 220 248 L 260 208"/>
  <rect class="d-box-muted" x="270" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="300" y="271" text-anchor="middle">L3</text>
  <path class="d-edge" d="M 300 248 L 260 208"/>
  <rect class="d-box-muted" x="350" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="380" y="271" text-anchor="middle">L4</text>
  <path class="d-edge" d="M 380 248 L 420 208"/>
  <rect class="d-box-muted" x="430" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="460" y="271" text-anchor="middle">L5</text>
  <path class="d-edge" d="M 460 248 L 420 208"/>
  <rect class="d-box-muted" x="510" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="540" y="271" text-anchor="middle">L6</text>
  <path class="d-edge" d="M 540 248 L 580 208"/>
  <rect class="d-box-muted" x="590" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="620" y="271" text-anchor="middle">L7</text>
  <path class="d-edge" d="M 620 248 L 580 208"/>
</svg>

Eight lists need three levels of merging. At every level each item is copied exactly once, so one level costs about N, and there are ⌈log₂ k⌉ levels.

📌 **Interview term: Recursion depth** — how many calls are stacked up at once. Splitting k lists in half gives a depth of about log₂ k, which is 7 for k = 100 and 14 for k = 10,000: never a stack-overflow risk.

## 6. Why Both Are O(N log k) — and Where They Differ

- **Heap:** N pushes and N pops, each O(log k). Total O(N log k). Extra memory O(k) for the heap (plus the output).
- **Divide and conquer:** ⌈log₂ k⌉ levels, each touching all N items once. Total O(N log k). Extra memory O(N) per level for arrays (O(1) when relinking linked-list nodes), plus O(log k) stack.

Same Big-O, so the interviewer is really asking about **constant factors**. A heap pop is not one comparison: sifting the new top down compares it with *both* children at each level, so a pop costs up to about 2·log₂ k comparisons. A two-list merge spends **one** comparison per item per level. Counting them on the same data (example 2) makes this concrete:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Comparisons for N equal to 10000 and k equal to 100: sequential 498939, heap 126912, divide and conquer 66995">
  <text class="d-text" x="340" y="24" text-anchor="middle">Comparisons, N = 10000 numbers in k = 100 lists</text>
  <text class="d-text" x="20" y="72">sequential</text>
  <rect class="d-box-muted" x="140" y="50" width="420" height="34" rx="4"/>
  <text class="d-sub" x="572" y="72">498939</text>
  <text class="d-text" x="20" y="128">heap</text>
  <rect class="d-box" x="140" y="106" width="107" height="34" rx="4"/>
  <text class="d-sub" x="259" y="128">126912</text>
  <text class="d-text" x="20" y="184">divide</text>
  <rect class="d-box-accent" x="140" y="162" width="56" height="34" rx="4"/>
  <text class="d-sub" x="208" y="184">66995</text>
</svg>

At k = 100, divide and conquer used about half the comparisons of the heap, and both were far below sequential merging. The heap also moves entries around inside its array, while a two-list merge reads both inputs front to back, which is friendly to the CPU cache.

| k (N = 10,000) | sequential | heap | divide and conquer |
| :--- | :--- | :--- | :--- |
| 2 | 9,998 | 9,998 | 9,998 |
| 10 | 53,976 | 61,785 | 33,978 |
| 100 | 498,939 | 126,912 | 66,995 |
| 1,000 | 4,531,003 | 185,343 | 97,869 |

Two things in this table are worth saying out loud in an interview. At k = 10 the heap did *more* comparisons than even sequential merging, because sequential merging is cheap when k is tiny. And divide and conquer is very close to the ideal N·log₂ k (10,000 × log₂ 100 ≈ 66,439).

## 7. The Code in Python

**The heap version.** \`heapq\` turns an ordinary list into a binary min-heap: \`heapq.heappush\` and \`heapq.heappop\` keep \`heap[0]\` as the smallest entry (see [how heapq works](/interview-question/how-does-heapq-work-in-python)). Each entry is a tuple \`(value, list_index, position)\`. Tuples compare left to right, so equal values fall back to the list index, and Python never has to look further.

~~~python
def merge_heap(lists):
    """k-way merge with a min-heap of (value, list index, position)."""
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, j = heapq.heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
~~~

**What to point out in this code:**

- \`heapq.heapify(heap)\` builds the first heap in O(k) instead of k pushes at O(log k) each.
- The \`if lst\` filter in the comprehension skips empty lists when seeding; forgetting it raises \`IndexError\` on \`lst[0]\`.
- The middle field of the tuple matters most when the payload cannot be compared. With linked-list nodes, \`(node.val, node)\` crashes on the first tie. We ran it:

~~~text
TypeError: '<' not supported between instances of 'Node' and 'Node'
~~~

  \`(node.val, i, node)\` fixes it, because \`i\` is unique and the comparison stops there.

**The divide-and-conquer version.** \`merge_two\` is the standard two-pointer merge; \`merge_divide\` splits the range of lists in half and merges the halves.

~~~python
def merge_two(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out

def merge_divide(lists, lo=0, hi=None):
    """Split the lists in half, merge each half, then merge the two results."""
    if hi is None:
        hi = len(lists)
    if hi - lo == 0:
        return []
    if hi - lo == 1:
        return list(lists[lo])
    mid = (lo + hi) // 2
    return merge_two(merge_divide(lists, lo, mid), merge_divide(lists, mid, hi))
~~~

- \`out.extend(a[i:])\` copies the leftover tail in one C-level call. It is fine here because it runs once per merge, not once per item.
- The recursion depth is about log₂ k (7 for k = 100), far below Python's default limit of 1,000 frames.
- The standard library already has a lazy k-way merge: \`heapq.merge(*lists)\` returns an iterator and is the idiomatic answer when the lists are files or generators.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — both methods on six inputs, including empty lists and duplicates** prints:

~~~text
input  [[1, 4, 5], [1, 3, 4], [2, 6]]
heap   [1, 1, 2, 3, 4, 4, 5, 6]
divide [1, 1, 2, 3, 4, 4, 5, 6]
input  []
heap   []
divide []
input  [[]]
heap   []
divide []
input  [[], [0], [-3, 7]]
heap   [-3, 0, 7]
divide [-3, 0, 7]
input  [[5, 5], [5], [1, 9]]
heap   [1, 5, 5, 5, 9]
divide [1, 5, 5, 5, 9]
input  [[10], [9], [8], [7], [6]]
heap   [6, 7, 8, 9, 10]
divide [6, 7, 8, 9, 10]
~~~

**Example 2 — comparison counts for sequential, heap and divide and conquer, N = 10,000.** To make the counts identical in every language, this program uses the same hand-written binary heap everywhere (a library heap may compare in a slightly different order), and the same MINSTD number generator to build the lists. It prints:

~~~text
N = 10000 numbers in total, comparisons counted
k = 2: sequential 9998 heap 9998 divide 9998
k = 10: sequential 53976 heap 61785 divide 33978
k = 100: sequential 498939 heap 126912 divide 66995
k = 1000: sequential 4531003 heap 185343 divide 97869
~~~

## 9. What the Clock Says in CPython

Comparison counts are language-neutral; wall-clock time is not. On our sandbox (Python 3.13, best of 5 runs, N = 10,000, random sorted lists) the numbers were:

| k | \`heapq\` loop | pure-Python divide | \`heapq.merge\` | \`sorted()\` of everything |
| :--- | :--- | :--- | :--- | :--- |
| 10 | 2.71 ms | 3.78 ms | 1.92 ms | 0.49 ms |
| 100 | 3.34 ms | 7.32 ms | 2.74 ms | 0.83 ms |
| 1,000 | 4.37 ms | 10.61 ms | 4.22 ms | 1.10 ms |

So in Python the ranking **flips**: divide and conquer does half the comparisons, but every one of them runs as interpreted bytecode, while \`heapq\` does its sifting in C. And plain \`sorted()\` wins outright. CPython's sort is Timsort, which finds runs that are already in order and merges them ([CPython listsort.txt](https://github.com/python/cpython/blob/main/Objects/listsort.txt)), so it is effectively doing a k-way merge in C. These are one machine's timings, not a benchmark suite, but the order of the columns is the lesson: in Python, the best algorithm is often the one that runs inside a C function.

📌 **Interview term: Timsort** — the adaptive merge sort used by CPython's \`list.sort\` and \`sorted\`. It detects already-sorted runs, so already-sorted chunks sort in close to linear time.

## 10. So Which Is Better for N = 10,000?

For 10,000 items in memory, **either is fine, and the difference is a fraction of a millisecond.** Say that first, then show you know when each one wins:

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| All lists in memory, want the whole result | Divide and conquer (or just sort, see below) | Fewer comparisons, sequential memory access, no heap needed |
| Lists are streams, files or iterators | Heap | Holds only k items; reads each list one item at a time |
| Only the first m items are needed | Heap | Stop after m pops: O(k + m log k) |
| Linked lists, memory is tight | Divide and conquer | Relinks nodes in place: O(1) extra memory besides the stack |
| Lists keep arriving while merging | Heap | New lists just push their head into the heap |
| k is tiny (2 or 3) | Plain two-pointer merge | Nothing to gain from either structure |

📌 **Interview term: External merge** — merging sorted runs that live on disk (as in external sorting). It always uses a heap (or a tournament tree), because only one block of each run fits in memory.

📌 **Interview term: Constant factor** — the fixed multiplier that Big-O hides. Two O(N log k) algorithms can differ by 2× or more in real time because of comparisons per step and memory access patterns.

## 11. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sequential merging | O(N·k) | O(N) | the growing result is re-read k times |
| Min-heap of heads | O(N log k) | O(k) | N pushes + N pops on a heap of at most k entries |
| Divide and conquer | O(N log k) | O(N) arrays / O(1) linked lists, + O(log k) stack | log₂ k levels, each touching N items once |
| Concatenate and sort | O(N log N) | O(N) | ignores the existing order, but uses a highly tuned library sort |

## 12. Edge Cases

- **No lists at all** (\`[]\`) and **only empty lists** (\`[[]]\`): both methods return an empty result. The heap never receives an entry; divide and conquer hits the "zero lists" base case (example 1).
- **Some empty lists mixed in** (\`[[], [0], [-3, 7]]\`): the heap version must skip empty lists when seeding; the divide version handles them naturally because merging with an empty list copies the other one.
- **Duplicates across lists** (\`[[5, 5], [5], [1, 9]]\`): the heap needs a tie-breaker so equal values never force a comparison of anything else; the output keeps all three 5s.
- **Many single-item lists** (\`[[10], [9], [8], [7], [6]]\`): this is k = N, the worst case for both: log k becomes log N and the whole thing is effectively a sort.
- **Very uneven lengths** (one list of 9,900 and 100 lists of 1): the halving split still gives log₂ k levels, but the big list is copied at every level. A heap does not care about the shape. (Merging the smallest lists first, like Huffman coding, is the optimal order here.)

This page compares the two methods. For a full walk-through of the linked-list version of the problem itself, see [How do you merge k sorted lists?](/interview-question/how-do-you-merge-k-sorted-lists).

## Common Pitfalls

- **Heap entries without a tie-breaker.** \`(value, node)\` works until two values are equal, then raises \`TypeError\`. Always insert a unique integer second: \`(value, i, node)\`.
- **Merging into a growing result in a loop.** \`result = merge_two(result, lst)\` for every list is O(N·k): 498,939 comparisons at k = 100 instead of 66,995.
- **Using \`list.pop(0)\` to take the front item.** It shifts every remaining element, turning each merge step into O(n). Use indexes, or a \`collections.deque\` with \`popleft()\`.
- **Assuming fewer comparisons means faster Python.** The pure-Python divide version was about 2× slower than the \`heapq\` loop at k = 100, because \`heapq\` runs in C.
- **Re-implementing what the standard library has.** In production, \`heapq.merge(*lists)\` (lazy) or \`sorted(itertools.chain(*lists))\` (eager) is usually the right call; write the loop in the interview to show you understand it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both are O(N log k):</strong> <span style="color:#f0e2c8;">A heap of the k front items costs O(log k) per item; pairwise merging has log₂ k levels of O(N) work. Sequential merging is O(N·k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(value, list_index, position)</code> tuples; pop the smallest, push the next item from that list. O(k) extra memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split the lists in half, merge each half, then two-pointer merge the results. One comparison per item per level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. For N = 10,000:</strong> <span style="color:#f0e2c8;">Either finishes in milliseconds. Divide uses about half the comparisons (66,995 vs 126,912 at k = 100), but in CPython <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> runs in C and was faster.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">In real code I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.merge(*lists)</code> for streams, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> when everything is in memory: Timsort merges the existing runs in C.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you put the list index in the heap tuple?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So equal values compare by index instead of by the payload. With linked-list nodes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(val, node)</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> on the first tie.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick the heap even though it does more comparisons?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the lists are streams or files, when only the first m items are needed (stop after m pops), or when lists keep arriving. It holds only k items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq.merge</code> do differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is lazy: it returns an iterator and pulls one item at a time from each input, so it works on generators and huge files. Wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list()</code> to get everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted()</code> win in your timing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timsort detects the k sorted runs and merges them in C. O(N log N) on paper, but the runs make it close to a k-way merge, with no Python-level loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for linked lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer can relink nodes instead of building new lists, so extra memory drops to O(log k) for the recursion. The heap version needs a tie-breaker index because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> is not comparable.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **k-way merge** | Combining k sorted sequences into one; N is the total item count |
| **Sequential (one-by-one) merging** | Merging lists into a growing result one at a time; O(N·k) |
| **Min-heap** | Array-backed tree with the smallest item at the root; O(log n) push and pop |
| **Tie-breaker** | Extra field compared when values are equal, such as the list index |
| **Divide and conquer** | Split into smaller copies of the problem, solve them, combine |
| **Recursion depth** | How many calls are stacked at once; log₂ k for pairwise merging |
| **External merge** | Merging sorted runs stored on disk; always heap-based |
| **Constant factor** | The multiplier Big-O hides; it decides between two O(N log k) methods |
| **Timsort** | Adaptive merge sort used by Python; fast on data made of sorted runs |

---
**Conclusion:** Heap and divide and conquer are both O(N log k), and at N = 10,000 the choice is about constants and data shape, not Big-O. The heap holds only k items and handles streams and early stopping; divide and conquer does about half the comparisons and needs no heap. In Python the clock disagrees with the comparison count, because \`heapq\` and \`sorted()\` run in C. Say both facts, then pick: \`heapq.merge\` for streams, \`sorted()\` or a recursive merge for in-memory lists.`,
        examples: [
          {
            label: `Heap and divide-and-conquer merges on six inputs`,
            code: `import heapq


def merge_heap(lists):
    """k-way merge with a min-heap of (value, list index, position)."""
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, j = heapq.heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out


def merge_two(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out


def merge_divide(lists, lo=0, hi=None):
    """Split the lists in half, merge each half, then merge the two results."""
    if hi is None:
        hi = len(lists)
    if hi - lo == 0:
        return []
    if hi - lo == 1:
        return list(lists[lo])
    mid = (lo + hi) // 2
    return merge_two(merge_divide(lists, lo, mid), merge_divide(lists, mid, hi))


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


cases = [
    [[1, 4, 5], [1, 3, 4], [2, 6]],
    [],
    [[]],
    [[], [0], [-3, 7]],
    [[5, 5], [5], [1, 9]],
    [[10], [9], [8], [7], [6]],
]
for lists in cases:
    print("input  " + fmt([fmt(l) for l in lists]))
    print("heap   " + fmt(merge_heap(lists)))
    print("divide " + fmt(merge_divide(lists)))`,
          },
          {
            label: `Comparison counts: sequential vs heap vs divide, N = 10000`,
            code: `# Count comparisons for three ways to merge k sorted lists holding N = 10000 numbers.
comparisons = 0


def less(a, b):
    """Every comparison goes through here so we can count it."""
    global comparisons
    comparisons += 1
    return a < b


def merge_two(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if less(b[j], a[i]):
            out.append(b[j]); j += 1
        else:
            out.append(a[i]); i += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out


def merge_sequential(lists):
    result = []
    for lst in lists:
        result = merge_two(result, lst)  # the result keeps growing
    return result


def merge_divide(lists, lo, hi):
    if hi - lo == 1:
        return lists[lo]
    mid = (lo + hi) // 2
    return merge_two(merge_divide(lists, lo, mid), merge_divide(lists, mid, hi))


def merge_heap(lists):
    """Hand-written binary min-heap of (value, list index) so every language counts the same."""
    heap = []

    def push(item):
        heap.append(item)
        c = len(heap) - 1
        while c > 0:
            p = (c - 1) // 2
            if not less(heap[c], heap[p]):
                break
            heap[c], heap[p] = heap[p], heap[c]
            c = p

    def pop():
        top = heap[0]
        last = heap.pop()
        if heap:
            heap[0] = last
            p = 0
            while True:
                l, r, m = 2 * p + 1, 2 * p + 2, p
                if l < len(heap) and less(heap[l], heap[m]):
                    m = l
                if r < len(heap) and less(heap[r], heap[m]):
                    m = r
                if m == p:
                    break
                heap[p], heap[m] = heap[m], heap[p]
                p = m
        return top

    pos = [0] * len(lists)
    for i, lst in enumerate(lists):
        push((lst[0], i))
    out = []
    while heap:
        value, i = pop()
        out.append(value)
        pos[i] += 1
        if pos[i] < len(lists[i]):
            push((lists[i][pos[i]], i))
    return out


def make_lists(k, n, seed):
    lists = [[] for _ in range(k)]
    for x in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD, same numbers in every language
        lists[x % k].append(seed % 100000)
    for lst in lists:
        lst.sort()
    return lists


N = 10000
print("N = " + str(N) + " numbers in total, comparisons counted")
for k in [2, 10, 100, 1000]:
    lists = make_lists(k, N, 7)
    expected = sorted(x for lst in lists for x in lst)
    row = "k = " + str(k) + ":"
    for name, fn in [("sequential", merge_sequential),
                     ("heap", merge_heap),
                     ("divide", lambda ls: merge_divide(ls, 0, len(ls)))]:
        comparisons = 0
        ok = fn(lists) == expected
        row += " " + name + " " + str(comparisons) + ("" if ok else " WRONG")
    print(row)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have k sorted JavaScript arrays holding about 10,000 numbers in total. Would you merge them with a heap or with divide and conquer? Code both in JavaScript, give their complexity, and tell me which you would ship."

**What a strong answer should cover:**
- Both are O(N log k) time; sequential merging is O(N·k) and is the trap to avoid.
- Heap: O(k) extra memory, works on streams, can stop early; divide and conquer: fewer comparisons and no heap needed.
- Clarifying what "n = 10k" means: total items N, or number of lists k.
- JavaScript details: there is no built-in heap, so the heap version means writing one; \`Array.prototype.sort()\` sorts as strings unless you pass \`(a, b) => a - b\`; \`shift()\` is O(n), so merges use indexes.
- An honest measurement: in Node the simple divide-and-conquer merge was faster than a hand-written heap at this size.

**Clarifying questions expected:**
- Is 10,000 the total item count or the number of lists?
- Are the inputs arrays in memory, or async streams?

**Code / implementation expected:** Yes — a k-way merge with a small binary heap class and a recursive pairwise merge, in JavaScript.`,
        answer: `**Target Audience:** Developers who know basic arrays and loops in JavaScript and want to reason about algorithm trade-offs, not just Big-O.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has run the same exam in many classrooms. Each teacher hands in a stack of papers already sorted by score, lowest on top. The head teacher needs **one** sorted pile of every paper. There are two sensible ways to do it.

**The front desk.** Put every stack on a long desk. Look only at the *top* paper of each stack, take the lowest one, put it on the output pile, and look again. A clever assistant keeps the tops in a little "who is lowest" structure so she does not have to scan the whole desk each time. That assistant is a **heap**.

**The tournament.** Pair the stacks up: classroom 1 with 2, 3 with 4, and so on. Merge each pair into one sorted stack (easy: only two tops to compare). Now there are half as many stacks. Pair them up again. After a few rounds there is one stack. That is **divide and conquer**.

The interview question is: with about 10,000 papers in total, which way is better? The honest answer surprises people: **both do the same amount of work in Big-O terms, O(N log k), and at N = 10,000 both finish in about a millisecond.** What separates them is the constant factor, memory, and whether the data is all in memory or arriving as streams. This page measures all of that instead of guessing.

## 2. Questions to Ask Your Interviewer First

The phrase "n = 10k" is ambiguous, and the right answer depends on what it means.

| Question | Why it matters |
| :--- | :--- |
| Is 10,000 the total number of items N, or the number of lists k? | Both methods cost O(N log k). The log k part is what changes: 100 lists of 100 items is very different from 10,000 lists of 1 item. |
| Are these arrays or linked lists? | With linked lists, divide and conquer can relink nodes with O(1) extra memory; with arrays each level builds new arrays. |
| Is everything in memory, or are the lists streams (files, network)? | A heap can merge streams lazily, reading one item at a time. Divide and conquer wants whole lists up front. |
| Do you need the whole output, or only the first m items? | A heap can stop after m pops; divide and conquer must finish every level before the first item is final. |
| Do equal values need to keep a particular order? | A heap is not stable by itself; you add a tie-breaker such as the list index. |

## 3. The Shared Building Block, and the Trap

Both methods are built on one small skill: [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays) with two pointers. Compare the two front items, take the smaller, move that pointer. Two lists of total length m take at most m − 1 comparisons.

📌 **Interview term: k-way merge** — combining k sorted sequences into one sorted sequence. N is the total number of items across all k lists.

The tempting first idea is to merge list 1 into list 2, then that result into list 3, and so on. It is correct but slow: the growing result is re-read on every step. With k lists of n/k items each, the total work is about N·k / 2. At N = 10,000 and k = 100 that is roughly 500,000 comparisons (the run below measured 498,939).

📌 **Interview term: Sequential (one-by-one) merging** — merging the lists into a growing result one at a time. It costs O(N·k), because early items are copied again at every step.

## 4. Approach A — A Min-Heap of the k Front Items

Keep one entry per list in a [min-heap](/interview-question/what-is-a-heap-priority-queue): the list's current front item. Pop the smallest, write it to the output, and push the next item from *the same list*. The heap never holds more than k entries, so each push or pop costs O(log k), and every one of the N items is pushed and popped once.

📌 **Interview term: Min-heap** — a tree stored in an array where every parent is less than or equal to its children, so the smallest item is always at index 0. Push and pop cost O(log size).

📌 **Interview term: Tie-breaker** — an extra field (here the list index) compared when two values are equal, so the heap never has to compare the payload itself and the order of equal values is predictable.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Three sorted lists feed their first items into a min-heap; each pop goes to the output and the next item of the same list is pushed">
  <defs>
    <marker id="b20q1ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="57" text-anchor="middle">list 0: 1, 4, 5</text>
  <rect class="d-box" x="20" y="100" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="127" text-anchor="middle">list 1: 1, 3, 4</text>
  <rect class="d-box" x="20" y="170" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="197" text-anchor="middle">list 2: 2, 6</text>
  <path class="d-edge" d="M 192 52 L 264 100" marker-end="url(#b20q1ja-a1)"/>
  <path class="d-edge" d="M 192 122 L 264 125" marker-end="url(#b20q1ja-a1)"/>
  <path class="d-edge" d="M 192 192 L 264 150" marker-end="url(#b20q1ja-a1)"/>
  <rect class="d-box-accent" x="270" y="70" width="180" height="110" rx="10"/>
  <text class="d-text" x="360" y="104" text-anchor="middle">min-heap of heads</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">at most k entries</text>
  <text class="d-sub" x="360" y="154" text-anchor="middle">top = smallest head</text>
  <path class="d-edge-accent" d="M 452 125 L 514 125" marker-end="url(#b20q1ja-a1)"/>
  <text class="d-sub" x="483" y="112" text-anchor="middle">pop</text>
  <rect class="d-box-muted" x="520" y="95" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="120" text-anchor="middle">output</text>
  <text class="d-sub" x="600" y="142" text-anchor="middle">1, 1, 2, 3, 4</text>
  <path class="d-edge-dashed" d="M 600 157 L 600 228 L 360 228 L 360 186" marker-end="url(#b20q1ja-a1)"/>
  <text class="d-sub" x="480" y="252" text-anchor="middle">push next item of same list</text>
</svg>

Each list sends only its current front item into the heap. When the heap gives up its smallest entry, the next item from that same list takes its place, so the heap size stays at most k.

## 5. Approach B — Divide and Conquer (Pairwise Merging)

Split the k lists into two halves, merge each half recursively, then merge the two results with the ordinary two-list merge. It is exactly the merge step of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), started from k sorted runs instead of N single items.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into smaller copies of itself, solving those, and combining the answers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Divide and conquer merges eight lists in three levels: four pair merges, then two, then one">
  <rect class="d-box-accent" x="210" y="20" width="260" height="36" rx="8"/>
  <text class="d-text" x="340" y="43" text-anchor="middle">all 8 lists merged</text>
  <rect class="d-box" x="80" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="180" y="119" text-anchor="middle">L0 to L3</text>
  <path class="d-edge" d="M 180 96 L 340 56"/>
  <rect class="d-box" x="400" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="500" y="119" text-anchor="middle">L4 to L7</text>
  <path class="d-edge" d="M 500 96 L 340 56"/>
  <rect class="d-box" x="40" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="100" y="195" text-anchor="middle">L0 + L1</text>
  <path class="d-edge" d="M 100 172 L 180 132"/>
  <rect class="d-box" x="200" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="260" y="195" text-anchor="middle">L2 + L3</text>
  <path class="d-edge" d="M 260 172 L 180 132"/>
  <rect class="d-box" x="360" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="420" y="195" text-anchor="middle">L4 + L5</text>
  <path class="d-edge" d="M 420 172 L 500 132"/>
  <rect class="d-box" x="520" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="580" y="195" text-anchor="middle">L6 + L7</text>
  <path class="d-edge" d="M 580 172 L 500 132"/>
  <rect class="d-box-muted" x="30" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="60" y="271" text-anchor="middle">L0</text>
  <path class="d-edge" d="M 60 248 L 100 208"/>
  <rect class="d-box-muted" x="110" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="140" y="271" text-anchor="middle">L1</text>
  <path class="d-edge" d="M 140 248 L 100 208"/>
  <rect class="d-box-muted" x="190" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="220" y="271" text-anchor="middle">L2</text>
  <path class="d-edge" d="M 220 248 L 260 208"/>
  <rect class="d-box-muted" x="270" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="300" y="271" text-anchor="middle">L3</text>
  <path class="d-edge" d="M 300 248 L 260 208"/>
  <rect class="d-box-muted" x="350" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="380" y="271" text-anchor="middle">L4</text>
  <path class="d-edge" d="M 380 248 L 420 208"/>
  <rect class="d-box-muted" x="430" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="460" y="271" text-anchor="middle">L5</text>
  <path class="d-edge" d="M 460 248 L 420 208"/>
  <rect class="d-box-muted" x="510" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="540" y="271" text-anchor="middle">L6</text>
  <path class="d-edge" d="M 540 248 L 580 208"/>
  <rect class="d-box-muted" x="590" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="620" y="271" text-anchor="middle">L7</text>
  <path class="d-edge" d="M 620 248 L 580 208"/>
</svg>

Eight lists need three levels of merging. At every level each item is copied exactly once, so one level costs about N, and there are ⌈log₂ k⌉ levels.

📌 **Interview term: Recursion depth** — how many calls are stacked up at once. Splitting k lists in half gives a depth of about log₂ k, which is 7 for k = 100 and 14 for k = 10,000: never a stack-overflow risk.

## 6. Why Both Are O(N log k) — and Where They Differ

- **Heap:** N pushes and N pops, each O(log k). Total O(N log k). Extra memory O(k) for the heap (plus the output).
- **Divide and conquer:** ⌈log₂ k⌉ levels, each touching all N items once. Total O(N log k). Extra memory O(N) per level for arrays (O(1) when relinking linked-list nodes), plus O(log k) stack.

Same Big-O, so the interviewer is really asking about **constant factors**. A heap pop is not one comparison: sifting the new top down compares it with *both* children at each level, so a pop costs up to about 2·log₂ k comparisons. A two-list merge spends **one** comparison per item per level. Counting them on the same data (example 2) makes this concrete:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Comparisons for N equal to 10000 and k equal to 100: sequential 498939, heap 126912, divide and conquer 66995">
  <text class="d-text" x="340" y="24" text-anchor="middle">Comparisons, N = 10000 numbers in k = 100 lists</text>
  <text class="d-text" x="20" y="72">sequential</text>
  <rect class="d-box-muted" x="140" y="50" width="420" height="34" rx="4"/>
  <text class="d-sub" x="572" y="72">498939</text>
  <text class="d-text" x="20" y="128">heap</text>
  <rect class="d-box" x="140" y="106" width="107" height="34" rx="4"/>
  <text class="d-sub" x="259" y="128">126912</text>
  <text class="d-text" x="20" y="184">divide</text>
  <rect class="d-box-accent" x="140" y="162" width="56" height="34" rx="4"/>
  <text class="d-sub" x="208" y="184">66995</text>
</svg>

At k = 100, divide and conquer used about half the comparisons of the heap, and both were far below sequential merging. The heap also moves entries around inside its array, while a two-list merge reads both inputs front to back, which is friendly to the CPU cache.

| k (N = 10,000) | sequential | heap | divide and conquer |
| :--- | :--- | :--- | :--- |
| 2 | 9,998 | 9,998 | 9,998 |
| 10 | 53,976 | 61,785 | 33,978 |
| 100 | 498,939 | 126,912 | 66,995 |
| 1,000 | 4,531,003 | 185,343 | 97,869 |

Two things in this table are worth saying out loud in an interview. At k = 10 the heap did *more* comparisons than even sequential merging, because sequential merging is cheap when k is tiny. And divide and conquer is very close to the ideal N·log₂ k (10,000 × log₂ 100 ≈ 66,439).

## 7. The Code in JavaScript

**The heap version.** JavaScript has no priority queue in the language or the standard library, so the heap is a small class (a full walk-through is in [priority queue with a binary heap](/interview-question/priority-queue-binary-heap)). It takes a \`less(x, y)\` function so the same class serves for any entry shape.

~~~javascript
class MinHeap {
  constructor(less) { this.a = []; this.less = less; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.less(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}
~~~

Entries are small arrays \`[value, listIndex, position]\`. The comparator orders by value and breaks ties by list index:

~~~javascript
function mergeHeap(lists) {
  // Heap entries are [value, listIndex, position]; ties broken by list index.
  const heap = new MinHeap((x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]);
  lists.forEach((lst, i) => { if (lst.length > 0) heap.push([lst[0], i, 0]); });
  const out = [];
  while (heap.size > 0) {
    const [value, i, j] = heap.pop();
    out.push(value);
    if (j + 1 < lists[i].length) heap.push([lists[i][j + 1], i, j + 1]);
  }
  return out;
}
~~~

**What to point out in this code:**

- \`(c - 1) >> 1\` is integer division by 2 for non-negative indexes; it is a common idiom, but \`Math.floor((c - 1) / 2)\` is clearer if the interviewer prefers.
- The destructuring swap \`[a[c], a[p]] = [a[p], a[c]]\` is readable; in a very hot loop a plain temporary variable is the safer choice for speed, since it never depends on the engine optimising the temporary array away.
- Entries are compared with \`!==\` and \`<\`, never by subtracting, so there is no surprise with large or mixed numbers.

**The divide-and-conquer version** needs no heap at all, which is a real advantage in JavaScript:

~~~javascript
function mergeTwo(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

function mergeDivide(lists, lo = 0, hi = lists.length) {
  if (hi - lo === 0) return [];
  if (hi - lo === 1) return lists[lo].slice();
  const mid = (lo + hi) >> 1;
  return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}
~~~

- \`a[i++]\` reads the item and moves the pointer in one step. Never use \`a.shift()\` to take the front item: it re-indexes the whole array, so each merge becomes O(n²).
- Default parameters \`lo = 0, hi = lists.length\` let callers write \`mergeDivide(lists)\`.
- \`lists[lo].slice()\` copies the single list so callers never get back an alias of their input.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — both methods on six inputs, including empty lists and duplicates** prints:

~~~text
input  [[1, 4, 5], [1, 3, 4], [2, 6]]
heap   [1, 1, 2, 3, 4, 4, 5, 6]
divide [1, 1, 2, 3, 4, 4, 5, 6]
input  []
heap   []
divide []
input  [[]]
heap   []
divide []
input  [[], [0], [-3, 7]]
heap   [-3, 0, 7]
divide [-3, 0, 7]
input  [[5, 5], [5], [1, 9]]
heap   [1, 5, 5, 5, 9]
divide [1, 5, 5, 5, 9]
input  [[10], [9], [8], [7], [6]]
heap   [6, 7, 8, 9, 10]
divide [6, 7, 8, 9, 10]
~~~

**Example 2 — comparison counts for sequential, heap and divide and conquer, N = 10,000.** To make the counts identical in every language, this program uses the same hand-written binary heap everywhere (a library heap may compare in a slightly different order), and the same MINSTD number generator to build the lists. It prints:

~~~text
N = 10000 numbers in total, comparisons counted
k = 2: sequential 9998 heap 9998 divide 9998
k = 10: sequential 53976 heap 61785 divide 33978
k = 100: sequential 498939 heap 126912 divide 66995
k = 1000: sequential 4531003 heap 185343 divide 97869
~~~

## 9. What the Clock Says in Node.js

On our sandbox (Node.js 22, average of 200 runs after a warm-up, N = 10,000 random numbers):

| k | hand-written heap | divide and conquer | \`flat().sort((a, b) => a - b)\` |
| :--- | :--- | :--- | :--- |
| 10 | 1.15 ms | 0.39 ms | 0.86 ms |
| 100 | 2.04 ms | 0.74 ms | 1.34 ms |
| 1,000 | 3.13 ms | 1.03 ms | 2.19 ms |

In Node the comparison count and the clock agree: divide and conquer was about 3× faster than the heap. Its inner loop is two array reads and one comparison, which the JIT compiles to tight machine code, while the heap allocates a small array per entry and does twice the comparisons. Concatenating and sorting was in between. V8's \`Array.prototype.sort\` has been Timsort since V8 7.0 ([v8.dev/blog/array-sort](https://v8.dev/blog/array-sort)), so it also benefits from the existing runs. These are one machine's numbers, so quote the ratio, not the milliseconds.

📌 **Interview term: Comparator function** — the \`(a, b) => number\` function passed to \`sort\`; a negative result puts \`a\` first. Without one, JavaScript sorts numbers as strings: \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\` (we ran it).

## 10. So Which Is Better for N = 10,000?

For 10,000 items in memory, **either is fine, and the difference is a fraction of a millisecond.** Say that first, then show you know when each one wins:

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| All lists in memory, want the whole result | Divide and conquer (or just sort, see below) | Fewer comparisons, sequential memory access, no heap needed |
| Lists are streams, files or iterators | Heap | Holds only k items; reads each list one item at a time |
| Only the first m items are needed | Heap | Stop after m pops: O(k + m log k) |
| Linked lists, memory is tight | Divide and conquer | Relinks nodes in place: O(1) extra memory besides the stack |
| Lists keep arriving while merging | Heap | New lists just push their head into the heap |
| k is tiny (2 or 3) | Plain two-pointer merge | Nothing to gain from either structure |

📌 **Interview term: External merge** — merging sorted runs that live on disk (as in external sorting). It always uses a heap (or a tournament tree), because only one block of each run fits in memory.

📌 **Interview term: Constant factor** — the fixed multiplier that Big-O hides. Two O(N log k) algorithms can differ by 2× or more in real time because of comparisons per step and memory access patterns.

## 11. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sequential merging | O(N·k) | O(N) | the growing result is re-read k times |
| Min-heap of heads | O(N log k) | O(k) | N pushes + N pops on a heap of at most k entries |
| Divide and conquer | O(N log k) | O(N) arrays / O(1) linked lists, + O(log k) stack | log₂ k levels, each touching N items once |
| Concatenate and sort | O(N log N) | O(N) | ignores the existing order, but uses a highly tuned library sort |

## 12. Edge Cases

- **No lists at all** (\`[]\`) and **only empty lists** (\`[[]]\`): both methods return an empty result. The heap never receives an entry; divide and conquer hits the "zero lists" base case (example 1).
- **Some empty lists mixed in** (\`[[], [0], [-3, 7]]\`): the heap version must skip empty lists when seeding; the divide version handles them naturally because merging with an empty list copies the other one.
- **Duplicates across lists** (\`[[5, 5], [5], [1, 9]]\`): the heap needs a tie-breaker so equal values never force a comparison of anything else; the output keeps all three 5s.
- **Many single-item lists** (\`[[10], [9], [8], [7], [6]]\`): this is k = N, the worst case for both: log k becomes log N and the whole thing is effectively a sort.
- **Very uneven lengths** (one list of 9,900 and 100 lists of 1): the halving split still gives log₂ k levels, but the big list is copied at every level. A heap does not care about the shape. (Merging the smallest lists first, like Huffman coding, is the optimal order here.)

This page compares the two methods. For a full walk-through of the linked-list version of the problem itself, see [How do you merge k sorted lists?](/interview-question/how-do-you-merge-k-sorted-lists).

## Common Pitfalls

- **Calling \`sort()\` without a comparator.** It compares strings, so \`[10, 9, 1].sort()\` returns \`[1, 10, 9]\`. Always pass \`(a, b) => a - b\` for numbers.
- **Using \`shift()\` to pop the front of a list.** It is O(n) per call; a merge built on it becomes O(n²). Keep an index per list instead.
- **Picking the minimum with \`Math.min(...heads)\` every step.** That is O(k) per output item, O(N·k) in total, and spreading a very large array into arguments can throw \`RangeError\`.
- **Forgetting to skip empty lists when seeding the heap.** \`lst[0]\` is \`undefined\`, and \`undefined < 3\` is \`false\`, so the heap silently holds garbage instead of crashing.
- **Merging into a growing result in a loop.** \`result = mergeTwo(result, lst)\` for each list is O(N·k): 498,939 comparisons at k = 100 instead of 66,995.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both are O(N log k):</strong> <span style="color:#f0e2c8;">A heap of the k front items costs O(log k) per item; pairwise merging has log₂ k levels of O(N) work. Sequential merging is O(N·k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The heap:</strong> <span style="color:#f0e2c8;">JavaScript has no built-in one, so I write a small binary heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value, listIndex, position]</code> entries with a tie-breaking comparator.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split the lists in half, merge each half, then two-pointer merge with indexes, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. For N = 10,000:</strong> <span style="color:#f0e2c8;">Either finishes in about a millisecond. Divide used half the comparisons (66,995 vs 126,912 at k = 100) and was about 3× faster in Node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My pick:</strong> <span style="color:#f0e2c8;">Divide and conquer for arrays in memory; a heap when the inputs are streams, when I only need the first m items, or when lists keep arriving.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lists.flat().sort()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator it sorts as strings. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> it is correct and was competitive (1.34 ms at k = 100), because V8 uses Timsort, which exploits sorted runs. It is O(N log N) and does not work for streams.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the heap win?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With async streams or iterators (only k items in memory), when you need the first m items only (stop early), or when new lists join during the merge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big can the heap get?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most k entries: one front item per non-empty list. Memory is O(k), independent of N.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists are linked lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same algorithms. Divide and conquer relinks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointers, so it needs no new arrays; the heap holds node references and compares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it stable for equal values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Break ties by list index in the comparator, as the code does; in divide and conquer, take from the left list on ties (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **k-way merge** | Combining k sorted sequences into one; N is the total item count |
| **Sequential (one-by-one) merging** | Merging lists into a growing result one at a time; O(N·k) |
| **Min-heap** | Array-backed tree with the smallest item at the root; O(log n) push and pop |
| **Tie-breaker** | Extra field compared when values are equal, such as the list index |
| **Divide and conquer** | Split into smaller copies of the problem, solve them, combine |
| **Recursion depth** | How many calls are stacked at once; log₂ k for pairwise merging |
| **External merge** | Merging sorted runs stored on disk; always heap-based |
| **Constant factor** | The multiplier Big-O hides; it decides between two O(N log k) methods |
| **Comparator function** | The (a, b) => number function passed to sort; required for numeric order in JavaScript |

---
**Conclusion:** Heap and divide and conquer are both O(N log k), and at N = 10,000 the choice is about constants and data shape, not Big-O. In JavaScript divide and conquer is the natural default: no heap class to write, half the comparisons, and it measured about 3× faster in Node. Reach for a heap when the inputs are streams, when you only need the first few items, or when lists arrive while you merge. And never sort numbers without a comparator.`,
        examples: [
          {
            label: `Heap and divide-and-conquer merges on six inputs`,
            code: `// JavaScript has no built-in heap, so we write a small binary min-heap.
class MinHeap {
  constructor(less) { this.a = []; this.less = less; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.less(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

function mergeHeap(lists) {
  // Heap entries are [value, listIndex, position]; ties broken by list index.
  const heap = new MinHeap((x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]);
  lists.forEach((lst, i) => { if (lst.length > 0) heap.push([lst[0], i, 0]); });
  const out = [];
  while (heap.size > 0) {
    const [value, i, j] = heap.pop();
    out.push(value);
    if (j + 1 < lists[i].length) heap.push([lists[i][j + 1], i, j + 1]);
  }
  return out;
}

function mergeTwo(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

function mergeDivide(lists, lo = 0, hi = lists.length) {
  if (hi - lo === 0) return [];
  if (hi - lo === 1) return lists[lo].slice();
  const mid = (lo + hi) >> 1;
  return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}

const fmt = (xs) => '[' + xs.join(', ') + ']';

const cases = [
  [[1, 4, 5], [1, 3, 4], [2, 6]],
  [],
  [[]],
  [[], [0], [-3, 7]],
  [[5, 5], [5], [1, 9]],
  [[10], [9], [8], [7], [6]],
];
for (const lists of cases) {
  console.log('input  ' + fmt(lists.map(fmt)));
  console.log('heap   ' + fmt(mergeHeap(lists)));
  console.log('divide ' + fmt(mergeDivide(lists)));
}`,
          },
          {
            label: `Comparison counts: sequential vs heap vs divide, N = 10000`,
            code: `// Count comparisons for three ways to merge k sorted lists holding N = 10000 numbers.
let comparisons = 0;
function less(a, b) { comparisons++; return a < b; }
// heap entries are [value, listIndex]; one counted comparison per entry pair
function lessEntry(x, y) { comparisons++; return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }

function mergeTwo(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (less(b[j], a[i])) out.push(b[j++]);
    else out.push(a[i++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

function mergeSequential(lists) {
  let result = [];
  for (const lst of lists) result = mergeTwo(result, lst); // the result keeps growing
  return result;
}

function mergeDivide(lists, lo, hi) {
  if (hi - lo === 1) return lists[lo];
  const mid = (lo + hi) >> 1;
  return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}

function mergeHeap(lists) {
  const heap = [];
  const push = (item) => {
    heap.push(item);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!lessEntry(heap[c], heap[p])) break;
      [heap[c], heap[p]] = [heap[p], heap[c]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = 2 * p + 2;
        let m = p;
        if (l < heap.length && lessEntry(heap[l], heap[m])) m = l;
        if (r < heap.length && lessEntry(heap[r], heap[m])) m = r;
        if (m === p) break;
        [heap[p], heap[m]] = [heap[m], heap[p]];
        p = m;
      }
    }
    return top;
  };
  const pos = new Array(lists.length).fill(0);
  lists.forEach((lst, i) => push([lst[0], i]));
  const out = [];
  while (heap.length > 0) {
    const [value, i] = pop();
    out.push(value);
    pos[i]++;
    if (pos[i] < lists[i].length) push([lists[i][pos[i]], i]);
  }
  return out;
}

function makeLists(k, n, seed) {
  const lists = Array.from({ length: k }, () => []);
  for (let x = 0; x < n; x++) {
    seed = (seed * 48271) % 2147483647; // MINSTD; the product stays below 2^53, so it is exact
    lists[x % k].push(seed % 100000);
  }
  for (const lst of lists) lst.sort((a, b) => a - b); // numeric sort, not the default string sort
  return lists;
}

const N = 10000;
console.log('N = ' + N + ' numbers in total, comparisons counted');
for (const k of [2, 10, 100, 1000]) {
  const lists = makeLists(k, N, 7);
  const expected = lists.flat().sort((a, b) => a - b).join(',');
  let row = 'k = ' + k + ':';
  const methods = [['sequential', mergeSequential], ['heap', mergeHeap],
                   ['divide', (ls) => mergeDivide(ls, 0, ls.length)]];
  for (const [name, fn] of methods) {
    comparisons = 0;
    const ok = fn(lists).join(',') === expected;
    row += ' ' + name + ' ' + comparisons + (ok ? '' : ' WRONG');
  }
  console.log(row);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have k sorted lists in Java holding about 10,000 integers in total. Would you merge them with a \`PriorityQueue\` or with divide and conquer? Write both in Java, give the complexity, and tell me which you would ship."

**What a strong answer should cover:**
- Both are O(N log k) time; sequential merging is O(N·k) and is the trap to avoid.
- Heap: O(k) extra memory, works on iterators and streams, can stop early; divide and conquer: fewer comparisons and no heap needed.
- Clarifying what "n = 10k" means: total items N, or number of lists k.
- Java details: \`PriorityQueue\` is a min-heap by default; build the comparator with \`Integer.compare\`, not subtraction; \`List<Integer>\` boxing costs memory and time, and \`==\` on two \`Integer\` objects compares references.
- A measurement: in our run divide and conquer was somewhat faster, and \`Collections.sort\` (a Timsort) was competitive.

**Clarifying questions expected:**
- Is 10,000 the total item count or the number of lists?
- Lists of \`Integer\`, \`int[]\` arrays, or \`ListNode\` linked lists?

**Code / implementation expected:** Yes — a \`PriorityQueue<int[]>\` k-way merge and a recursive pairwise merge, in Java.`,
        answer: `**Target Audience:** Developers who know basic arrays and loops in Java and want to reason about algorithm trade-offs, not just Big-O.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has run the same exam in many classrooms. Each teacher hands in a stack of papers already sorted by score, lowest on top. The head teacher needs **one** sorted pile of every paper. There are two sensible ways to do it.

**The front desk.** Put every stack on a long desk. Look only at the *top* paper of each stack, take the lowest one, put it on the output pile, and look again. A clever assistant keeps the tops in a little "who is lowest" structure so she does not have to scan the whole desk each time. That assistant is a **heap**.

**The tournament.** Pair the stacks up: classroom 1 with 2, 3 with 4, and so on. Merge each pair into one sorted stack (easy: only two tops to compare). Now there are half as many stacks. Pair them up again. After a few rounds there is one stack. That is **divide and conquer**.

The interview question is: with about 10,000 papers in total, which way is better? The honest answer surprises people: **both do the same amount of work in Big-O terms, O(N log k), and at N = 10,000 both finish in about a millisecond.** What separates them is the constant factor, memory, and whether the data is all in memory or arriving as streams. This page measures all of that instead of guessing.

## 2. Questions to Ask Your Interviewer First

The phrase "n = 10k" is ambiguous, and the right answer depends on what it means.

| Question | Why it matters |
| :--- | :--- |
| Is 10,000 the total number of items N, or the number of lists k? | Both methods cost O(N log k). The log k part is what changes: 100 lists of 100 items is very different from 10,000 lists of 1 item. |
| Are these arrays or linked lists? | With linked lists, divide and conquer can relink nodes with O(1) extra memory; with arrays each level builds new arrays. |
| Is everything in memory, or are the lists streams (files, network)? | A heap can merge streams lazily, reading one item at a time. Divide and conquer wants whole lists up front. |
| Do you need the whole output, or only the first m items? | A heap can stop after m pops; divide and conquer must finish every level before the first item is final. |
| Do equal values need to keep a particular order? | A heap is not stable by itself; you add a tie-breaker such as the list index. |

## 3. The Shared Building Block, and the Trap

Both methods are built on one small skill: [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays) with two pointers. Compare the two front items, take the smaller, move that pointer. Two lists of total length m take at most m − 1 comparisons.

📌 **Interview term: k-way merge** — combining k sorted sequences into one sorted sequence. N is the total number of items across all k lists.

The tempting first idea is to merge list 1 into list 2, then that result into list 3, and so on. It is correct but slow: the growing result is re-read on every step. With k lists of n/k items each, the total work is about N·k / 2. At N = 10,000 and k = 100 that is roughly 500,000 comparisons (the run below measured 498,939).

📌 **Interview term: Sequential (one-by-one) merging** — merging the lists into a growing result one at a time. It costs O(N·k), because early items are copied again at every step.

## 4. Approach A — A Min-Heap of the k Front Items

Keep one entry per list in a [min-heap](/interview-question/what-is-a-heap-priority-queue): the list's current front item. Pop the smallest, write it to the output, and push the next item from *the same list*. The heap never holds more than k entries, so each push or pop costs O(log k), and every one of the N items is pushed and popped once.

📌 **Interview term: Min-heap** — a tree stored in an array where every parent is less than or equal to its children, so the smallest item is always at index 0. Push and pop cost O(log size).

📌 **Interview term: Tie-breaker** — an extra field (here the list index) compared when two values are equal, so the heap never has to compare the payload itself and the order of equal values is predictable.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Three sorted lists feed their first items into a min-heap; each pop goes to the output and the next item of the same list is pushed">
  <defs>
    <marker id="b20q1ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="57" text-anchor="middle">list 0: 1, 4, 5</text>
  <rect class="d-box" x="20" y="100" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="127" text-anchor="middle">list 1: 1, 3, 4</text>
  <rect class="d-box" x="20" y="170" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="197" text-anchor="middle">list 2: 2, 6</text>
  <path class="d-edge" d="M 192 52 L 264 100" marker-end="url(#b20q1ja-a1)"/>
  <path class="d-edge" d="M 192 122 L 264 125" marker-end="url(#b20q1ja-a1)"/>
  <path class="d-edge" d="M 192 192 L 264 150" marker-end="url(#b20q1ja-a1)"/>
  <rect class="d-box-accent" x="270" y="70" width="180" height="110" rx="10"/>
  <text class="d-text" x="360" y="104" text-anchor="middle">min-heap of heads</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">at most k entries</text>
  <text class="d-sub" x="360" y="154" text-anchor="middle">top = smallest head</text>
  <path class="d-edge-accent" d="M 452 125 L 514 125" marker-end="url(#b20q1ja-a1)"/>
  <text class="d-sub" x="483" y="112" text-anchor="middle">pop</text>
  <rect class="d-box-muted" x="520" y="95" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="120" text-anchor="middle">output</text>
  <text class="d-sub" x="600" y="142" text-anchor="middle">1, 1, 2, 3, 4</text>
  <path class="d-edge-dashed" d="M 600 157 L 600 228 L 360 228 L 360 186" marker-end="url(#b20q1ja-a1)"/>
  <text class="d-sub" x="480" y="252" text-anchor="middle">push next item of same list</text>
</svg>

Each list sends only its current front item into the heap. When the heap gives up its smallest entry, the next item from that same list takes its place, so the heap size stays at most k.

## 5. Approach B — Divide and Conquer (Pairwise Merging)

Split the k lists into two halves, merge each half recursively, then merge the two results with the ordinary two-list merge. It is exactly the merge step of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), started from k sorted runs instead of N single items.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into smaller copies of itself, solving those, and combining the answers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Divide and conquer merges eight lists in three levels: four pair merges, then two, then one">
  <rect class="d-box-accent" x="210" y="20" width="260" height="36" rx="8"/>
  <text class="d-text" x="340" y="43" text-anchor="middle">all 8 lists merged</text>
  <rect class="d-box" x="80" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="180" y="119" text-anchor="middle">L0 to L3</text>
  <path class="d-edge" d="M 180 96 L 340 56"/>
  <rect class="d-box" x="400" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="500" y="119" text-anchor="middle">L4 to L7</text>
  <path class="d-edge" d="M 500 96 L 340 56"/>
  <rect class="d-box" x="40" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="100" y="195" text-anchor="middle">L0 + L1</text>
  <path class="d-edge" d="M 100 172 L 180 132"/>
  <rect class="d-box" x="200" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="260" y="195" text-anchor="middle">L2 + L3</text>
  <path class="d-edge" d="M 260 172 L 180 132"/>
  <rect class="d-box" x="360" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="420" y="195" text-anchor="middle">L4 + L5</text>
  <path class="d-edge" d="M 420 172 L 500 132"/>
  <rect class="d-box" x="520" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="580" y="195" text-anchor="middle">L6 + L7</text>
  <path class="d-edge" d="M 580 172 L 500 132"/>
  <rect class="d-box-muted" x="30" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="60" y="271" text-anchor="middle">L0</text>
  <path class="d-edge" d="M 60 248 L 100 208"/>
  <rect class="d-box-muted" x="110" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="140" y="271" text-anchor="middle">L1</text>
  <path class="d-edge" d="M 140 248 L 100 208"/>
  <rect class="d-box-muted" x="190" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="220" y="271" text-anchor="middle">L2</text>
  <path class="d-edge" d="M 220 248 L 260 208"/>
  <rect class="d-box-muted" x="270" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="300" y="271" text-anchor="middle">L3</text>
  <path class="d-edge" d="M 300 248 L 260 208"/>
  <rect class="d-box-muted" x="350" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="380" y="271" text-anchor="middle">L4</text>
  <path class="d-edge" d="M 380 248 L 420 208"/>
  <rect class="d-box-muted" x="430" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="460" y="271" text-anchor="middle">L5</text>
  <path class="d-edge" d="M 460 248 L 420 208"/>
  <rect class="d-box-muted" x="510" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="540" y="271" text-anchor="middle">L6</text>
  <path class="d-edge" d="M 540 248 L 580 208"/>
  <rect class="d-box-muted" x="590" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="620" y="271" text-anchor="middle">L7</text>
  <path class="d-edge" d="M 620 248 L 580 208"/>
</svg>

Eight lists need three levels of merging. At every level each item is copied exactly once, so one level costs about N, and there are ⌈log₂ k⌉ levels.

📌 **Interview term: Recursion depth** — how many calls are stacked up at once. Splitting k lists in half gives a depth of about log₂ k, which is 7 for k = 100 and 14 for k = 10,000: never a stack-overflow risk.

## 6. Why Both Are O(N log k) — and Where They Differ

- **Heap:** N pushes and N pops, each O(log k). Total O(N log k). Extra memory O(k) for the heap (plus the output).
- **Divide and conquer:** ⌈log₂ k⌉ levels, each touching all N items once. Total O(N log k). Extra memory O(N) per level for arrays (O(1) when relinking linked-list nodes), plus O(log k) stack.

Same Big-O, so the interviewer is really asking about **constant factors**. A heap pop is not one comparison: sifting the new top down compares it with *both* children at each level, so a pop costs up to about 2·log₂ k comparisons. A two-list merge spends **one** comparison per item per level. Counting them on the same data (example 2) makes this concrete:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Comparisons for N equal to 10000 and k equal to 100: sequential 498939, heap 126912, divide and conquer 66995">
  <text class="d-text" x="340" y="24" text-anchor="middle">Comparisons, N = 10000 numbers in k = 100 lists</text>
  <text class="d-text" x="20" y="72">sequential</text>
  <rect class="d-box-muted" x="140" y="50" width="420" height="34" rx="4"/>
  <text class="d-sub" x="572" y="72">498939</text>
  <text class="d-text" x="20" y="128">heap</text>
  <rect class="d-box" x="140" y="106" width="107" height="34" rx="4"/>
  <text class="d-sub" x="259" y="128">126912</text>
  <text class="d-text" x="20" y="184">divide</text>
  <rect class="d-box-accent" x="140" y="162" width="56" height="34" rx="4"/>
  <text class="d-sub" x="208" y="184">66995</text>
</svg>

At k = 100, divide and conquer used about half the comparisons of the heap, and both were far below sequential merging. The heap also moves entries around inside its array, while a two-list merge reads both inputs front to back, which is friendly to the CPU cache.

| k (N = 10,000) | sequential | heap | divide and conquer |
| :--- | :--- | :--- | :--- |
| 2 | 9,998 | 9,998 | 9,998 |
| 10 | 53,976 | 61,785 | 33,978 |
| 100 | 498,939 | 126,912 | 66,995 |
| 1,000 | 4,531,003 | 185,343 | 97,869 |

Two things in this table are worth saying out loud in an interview. At k = 10 the heap did *more* comparisons than even sequential merging, because sequential merging is cheap when k is tiny. And divide and conquer is very close to the ideal N·log₂ k (10,000 × log₂ 100 ≈ 66,439).

## 7. The Code in Java

**The heap version.** \`java.util.PriorityQueue\` is a binary min-heap ordered by a \`Comparator\` (natural order by default). Each entry is an \`int[] {value, listIndex, position}\`; the comparator orders by value and breaks ties by list index.

~~~java
static List<Integer> mergeHeap(List<List<Integer>> lists) {
    PriorityQueue<int[]> heap = new PriorityQueue<>(
        (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1]));
    for (int i = 0; i < lists.size(); i++)
        if (!lists.get(i).isEmpty()) heap.offer(new int[]{lists.get(i).get(0), i, 0});
    List<Integer> out = new ArrayList<>();
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        out.add(top[0]);
        int i = top[1], j = top[2];
        if (j + 1 < lists.get(i).size()) heap.offer(new int[]{lists.get(i).get(j + 1), i, j + 1});
    }
    return out;
}
~~~

**What to point out in this code:**

- \`Integer.compare(x[0], y[0])\` is the safe comparator. The shortcut \`x[0] - y[0]\` overflows when the values are far apart (for example \`Integer.MIN_VALUE\` and 1) and silently orders them wrongly.
- \`offer\` and \`poll\` are O(log k); \`peek\` is O(1). The \`PriorityQueue\` Javadoc also notes that \`remove(Object)\` and \`contains\` are linear time, which matters in other heap problems ([JDK 21 PriorityQueue docs](https://cs-214.epfl.ch/jdk-21.0.9-docs/api/java.base/java/util/PriorityQueue.html)).
- An \`int[]\` entry avoids creating a small entry class, but it is still one object per push. That allocation is part of why the heap version is slower than its Big-O suggests.

**The divide-and-conquer version:**

~~~java
static List<Integer> mergeTwo(List<Integer> a, List<Integer> b) {
    List<Integer> out = new ArrayList<>(a.size() + b.size());
    int i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        // compare unboxed ints: a.get(i) <= b.get(j) unboxes both sides
        if (a.get(i) <= b.get(j)) out.add(a.get(i++));
        else out.add(b.get(j++));
    }
    while (i < a.size()) out.add(a.get(i++));
    while (j < b.size()) out.add(b.get(j++));
    return out;
}

static List<Integer> mergeDivide(List<List<Integer>> lists, int lo, int hi) {
    if (hi - lo == 0) return new ArrayList<>();
    if (hi - lo == 1) return new ArrayList<>(lists.get(lo));
    int mid = (lo + hi) >>> 1;
    return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}
~~~

- \`a.get(i) <= b.get(j)\` auto-unboxes both \`Integer\`s, so it compares values. Writing \`a.get(i) == b.get(j)\` would compare object references, which is only correct for small values that hit the \`Integer\` cache: \`Integer\` 1000 \`==\` 1000 printed \`false\` in our run, while \`equals\` printed \`true\`.
- \`(lo + hi) >>> 1\` is the overflow-safe midpoint. It cannot overflow here, but \`(lo + hi) / 2\` does overflow once indexes pass about 2^30, so it is a good habit.
- \`new ArrayList<>(a.size() + b.size())\` pre-sizes the output, so it never has to grow and copy.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK (javac + java)). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — both methods on six inputs, including empty lists and duplicates** prints:

~~~text
input  [[1, 4, 5], [1, 3, 4], [2, 6]]
heap   [1, 1, 2, 3, 4, 4, 5, 6]
divide [1, 1, 2, 3, 4, 4, 5, 6]
input  []
heap   []
divide []
input  [[]]
heap   []
divide []
input  [[], [0], [-3, 7]]
heap   [-3, 0, 7]
divide [-3, 0, 7]
input  [[5, 5], [5], [1, 9]]
heap   [1, 5, 5, 5, 9]
divide [1, 5, 5, 5, 9]
input  [[10], [9], [8], [7], [6]]
heap   [6, 7, 8, 9, 10]
divide [6, 7, 8, 9, 10]
~~~

**Example 2 — comparison counts for sequential, heap and divide and conquer, N = 10,000.** To make the counts identical in every language, this program uses the same hand-written binary heap everywhere (a library heap may compare in a slightly different order), and the same MINSTD number generator to build the lists. It prints:

~~~text
N = 10000 numbers in total, comparisons counted
k = 2: sequential 9998 heap 9998 divide 9998
k = 10: sequential 53976 heap 61785 divide 33978
k = 100: sequential 498939 heap 126912 divide 66995
k = 1000: sequential 4531003 heap 185343 divide 97869
~~~

## 9. What the Clock Says in Java

On our sandbox (OpenJDK, average of 300 runs after 300 warm-up runs, N = 10,000 random \`Integer\`s in \`ArrayList\`s):

| k | \`PriorityQueue\` | divide and conquer | \`addAll\` + \`Collections.sort\` |
| :--- | :--- | :--- | :--- |
| 10 | 0.60 ms | 0.52 ms | 0.35 ms |
| 100 | 1.12 ms | 0.84 ms | 0.70 ms |
| 1,000 | 1.51 ms | 1.27 ms | 1.22 ms |

Divide and conquer beat the \`PriorityQueue\` by about 15–25%, and simply sorting the concatenation was quickest. \`Collections.sort\` hands off to a Timsort (a stable, adaptive merge sort), whose documentation says it needs only about n comparisons on nearly sorted input ([OpenJDK Collections.java](https://code.yawk.at/java/7/java/util/Collections.java)), so it benefits from the k sorted runs. The gaps are smaller than in Python or JavaScript, because most of the time goes into boxed \`Integer\` traffic that all three versions share; with \`int[]\` arrays everything gets faster. Quote the ranking, not the exact milliseconds: they are one machine's numbers.

📌 **Interview term: Autoboxing** — Java automatically wrapping an \`int\` in an \`Integer\` object (and unwrapping it). Collections such as \`List\` and \`PriorityQueue\` can only hold objects, so every number becomes a heap allocation.

## 10. So Which Is Better for N = 10,000?

For 10,000 items in memory, **either is fine, and the difference is a fraction of a millisecond.** Say that first, then show you know when each one wins:

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| All lists in memory, want the whole result | Divide and conquer (or just sort, see below) | Fewer comparisons, sequential memory access, no heap needed |
| Lists are streams, files or iterators | Heap | Holds only k items; reads each list one item at a time |
| Only the first m items are needed | Heap | Stop after m pops: O(k + m log k) |
| Linked lists, memory is tight | Divide and conquer | Relinks nodes in place: O(1) extra memory besides the stack |
| Lists keep arriving while merging | Heap | New lists just push their head into the heap |
| k is tiny (2 or 3) | Plain two-pointer merge | Nothing to gain from either structure |

📌 **Interview term: External merge** — merging sorted runs that live on disk (as in external sorting). It always uses a heap (or a tournament tree), because only one block of each run fits in memory.

📌 **Interview term: Constant factor** — the fixed multiplier that Big-O hides. Two O(N log k) algorithms can differ by 2× or more in real time because of comparisons per step and memory access patterns.

## 11. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sequential merging | O(N·k) | O(N) | the growing result is re-read k times |
| Min-heap of heads | O(N log k) | O(k) | N pushes + N pops on a heap of at most k entries |
| Divide and conquer | O(N log k) | O(N) arrays / O(1) linked lists, + O(log k) stack | log₂ k levels, each touching N items once |
| Concatenate and sort | O(N log N) | O(N) | ignores the existing order, but uses a highly tuned library sort |

## 12. Edge Cases

- **No lists at all** (\`[]\`) and **only empty lists** (\`[[]]\`): both methods return an empty result. The heap never receives an entry; divide and conquer hits the "zero lists" base case (example 1).
- **Some empty lists mixed in** (\`[[], [0], [-3, 7]]\`): the heap version must skip empty lists when seeding; the divide version handles them naturally because merging with an empty list copies the other one.
- **Duplicates across lists** (\`[[5, 5], [5], [1, 9]]\`): the heap needs a tie-breaker so equal values never force a comparison of anything else; the output keeps all three 5s.
- **Many single-item lists** (\`[[10], [9], [8], [7], [6]]\`): this is k = N, the worst case for both: log k becomes log N and the whole thing is effectively a sort.
- **Very uneven lengths** (one list of 9,900 and 100 lists of 1): the halving split still gives log₂ k levels, but the big list is copied at every level. A heap does not care about the shape. (Merging the smallest lists first, like Huffman coding, is the optimal order here.)

This page compares the two methods. For a full walk-through of the linked-list version of the problem itself, see [How do you merge k sorted lists?](/interview-question/how-do-you-merge-k-sorted-lists).

## Common Pitfalls

- **Comparator by subtraction.** \`(x, y) -> x[0] - y[0]\` overflows for values far apart and breaks the heap order without any exception. Use \`Integer.compare\`.
- **Comparing \`Integer\`s with \`==\`.** It compares references; it happens to work for -128 to 127 (the cache) and fails above that. Use \`<=\`/\`<\` (which unbox) or \`equals\`.
- **Iterating a \`PriorityQueue\` to read it in order.** Its iterator walks the internal array, not sorted order. Only repeated \`poll()\` gives sorted output.
- **Forgetting to skip empty lists when seeding.** \`lists.get(i).get(0)\` throws \`IndexOutOfBoundsException\` on an empty list.
- **Merging into a growing result in a loop.** \`result = mergeTwo(result, lst)\` for every list is O(N·k): 498,939 comparisons at k = 100 instead of 66,995.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both are O(N log k):</strong> <span style="color:#f0e2c8;">A heap of the k front items costs O(log k) per item; pairwise merging has log₂ k levels of O(N) work. Sequential merging is O(N·k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{value, listIndex, position}</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code>, never subtraction. Poll the smallest, offer the next item of that list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Divide and conquer:</strong> <span style="color:#f0e2c8;">Recursively merge each half of the lists, then a two-pointer merge. One comparison per item per level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. For N = 10,000:</strong> <span style="color:#f0e2c8;">Both run in about a millisecond. Divide used half the comparisons (66,995 vs 126,912 at k = 100) and was 15–25% faster in our JVM run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My pick:</strong> <span style="color:#f0e2c8;">Divide and conquer (or just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.sort</code>) for in-memory lists; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> for iterators, streams, or when only the first m items are needed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.compare</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a - b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a - b</code> can overflow: for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> and 1 the result wraps around and the comparator lies. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code> never overflows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge k <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Iterator&lt;Integer&gt;</code> streams?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{value, iteratorIndex}</code> in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>; after polling, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> on that iterator if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasNext()</code>. Memory stays O(k) no matter how long the streams are.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ListNode</code> lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer relinks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointers, so no new nodes and O(log k) extra space. The heap stores nodes with a comparator on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val</code>, plus the list index as a tie-breaker if you need stability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PriorityQueue</code> thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Its Javadoc points to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityBlockingQueue</code> for concurrent use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Collections.sort</code> so fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a Timsort: it finds the k sorted runs and merges them, so on this input it behaves much like a k-way merge, with very tuned code.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **k-way merge** | Combining k sorted sequences into one; N is the total item count |
| **Sequential (one-by-one) merging** | Merging lists into a growing result one at a time; O(N·k) |
| **Min-heap** | Array-backed tree with the smallest item at the root; O(log n) push and pop |
| **Tie-breaker** | Extra field compared when values are equal, such as the list index |
| **Divide and conquer** | Split into smaller copies of the problem, solve them, combine |
| **Recursion depth** | How many calls are stacked at once; log₂ k for pairwise merging |
| **External merge** | Merging sorted runs stored on disk; always heap-based |
| **Constant factor** | The multiplier Big-O hides; it decides between two O(N log k) methods |
| **Autoboxing** | Java wrapping int in an Integer object so collections can hold it |

---
**Conclusion:** Heap and divide and conquer are both O(N log k), and at N = 10,000 the choice is about constants and data shape, not Big-O. Divide and conquer did half the comparisons and was a bit faster on the JVM; a \`PriorityQueue\` is the right tool when the inputs are iterators or streams, or when you only need the first few items. In Java the details that cost marks are the comparator (\`Integer.compare\`, never subtraction) and \`Integer\` identity (\`==\` is not value equality).`,
        examples: [
          {
            label: `Heap and divide-and-conquer merges on six inputs`,
            code: `import java.util.*;

public class Main {
    // k-way merge with java.util.PriorityQueue of int[]{value, listIndex, position}.
    static List<Integer> mergeHeap(List<List<Integer>> lists) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(
            (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1]));
        for (int i = 0; i < lists.size(); i++)
            if (!lists.get(i).isEmpty()) heap.offer(new int[]{lists.get(i).get(0), i, 0});
        List<Integer> out = new ArrayList<>();
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            out.add(top[0]);
            int i = top[1], j = top[2];
            if (j + 1 < lists.get(i).size()) heap.offer(new int[]{lists.get(i).get(j + 1), i, j + 1});
        }
        return out;
    }

    static List<Integer> mergeTwo(List<Integer> a, List<Integer> b) {
        List<Integer> out = new ArrayList<>(a.size() + b.size());
        int i = 0, j = 0;
        while (i < a.size() && j < b.size()) {
            // compare unboxed ints: a.get(i) <= b.get(j) unboxes both sides
            if (a.get(i) <= b.get(j)) out.add(a.get(i++));
            else out.add(b.get(j++));
        }
        while (i < a.size()) out.add(a.get(i++));
        while (j < b.size()) out.add(b.get(j++));
        return out;
    }

    static List<Integer> mergeDivide(List<List<Integer>> lists, int lo, int hi) {
        if (hi - lo == 0) return new ArrayList<>();
        if (hi - lo == 1) return new ArrayList<>(lists.get(lo));
        int mid = (lo + hi) >>> 1;
        return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
    }

    static String fmt(List<?> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(", ");
            Object x = xs.get(i);
            sb.append(x instanceof List ? fmt((List<?>) x) : String.valueOf(x));
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        List<List<List<Integer>>> cases = List.of(
            List.of(List.of(1, 4, 5), List.of(1, 3, 4), List.of(2, 6)),
            List.of(),
            List.of(List.of()),
            List.of(List.of(), List.of(0), List.of(-3, 7)),
            List.of(List.of(5, 5), List.of(5), List.of(1, 9)),
            List.of(List.of(10), List.of(9), List.of(8), List.of(7), List.of(6)));
        for (List<List<Integer>> lists : cases) {
            System.out.println("input  " + fmt(lists));
            System.out.println("heap   " + fmt(mergeHeap(lists)));
            System.out.println("divide " + fmt(mergeDivide(lists, 0, lists.size())));
        }
    }
}`,
          },
          {
            label: `Comparison counts: sequential vs heap vs divide, N = 10000`,
            code: `import java.util.*;

public class Main {
    // Count comparisons for three ways to merge k sorted lists holding N = 10000 numbers.
    static long comparisons = 0;

    static boolean less(int a, int b) { comparisons++; return a < b; }

    // heap entries are {value, listIndex}; one counted comparison per entry pair
    static boolean lessEntry(int[] x, int[] y) {
        comparisons++;
        return x[0] != y[0] ? x[0] < y[0] : x[1] < y[1];
    }

    static int[] mergeTwo(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        int i = 0, j = 0, o = 0;
        while (i < a.length && j < b.length) {
            if (less(b[j], a[i])) out[o++] = b[j++];
            else out[o++] = a[i++];
        }
        while (i < a.length) out[o++] = a[i++];
        while (j < b.length) out[o++] = b[j++];
        return out;
    }

    static int[] mergeSequential(int[][] lists) {
        int[] result = new int[0];
        for (int[] lst : lists) result = mergeTwo(result, lst); // the result keeps growing
        return result;
    }

    static int[] mergeDivide(int[][] lists, int lo, int hi) {
        if (hi - lo == 1) return lists[lo];
        int mid = (lo + hi) >>> 1;
        return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
    }

    // Hand-written binary heap (not PriorityQueue) so every language counts the same comparisons.
    static int[][] heap;
    static int size;

    static void push(int[] item) {
        heap[size] = item;
        int c = size++;
        while (c > 0) {
            int p = (c - 1) / 2;
            if (!lessEntry(heap[c], heap[p])) break;
            int[] t = heap[c]; heap[c] = heap[p]; heap[p] = t;
            c = p;
        }
    }

    static int[] pop() {
        int[] top = heap[0];
        heap[0] = heap[--size];
        int p = 0;
        while (true) {
            int l = 2 * p + 1, r = 2 * p + 2, m = p;
            if (l < size && lessEntry(heap[l], heap[m])) m = l;
            if (r < size && lessEntry(heap[r], heap[m])) m = r;
            if (m == p) break;
            int[] t = heap[p]; heap[p] = heap[m]; heap[m] = t;
            p = m;
        }
        return top;
    }

    static int[] mergeHeap(int[][] lists) {
        heap = new int[lists.length][];
        size = 0;
        int[] pos = new int[lists.length];
        int total = 0;
        for (int i = 0; i < lists.length; i++) { push(new int[]{lists[i][0], i}); total += lists[i].length; }
        int[] out = new int[total];
        int o = 0;
        while (size > 0) {
            int[] top = pop();
            out[o++] = top[0];
            int i = top[1];
            if (++pos[i] < lists[i].length) push(new int[]{lists[i][pos[i]], i});
        }
        return out;
    }

    static int[][] makeLists(int k, int n, long seed) {
        int[][] lists = new int[k][n / k];
        for (int x = 0; x < n; x++) {
            seed = seed * 48271 % 2147483647; // MINSTD; long, because the product overflows int
            lists[x % k][x / k] = (int) (seed % 100000);
        }
        for (int[] lst : lists) Arrays.sort(lst);
        return lists;
    }

    public static void main(String[] args) {
        int n = 10000;
        System.out.println("N = " + n + " numbers in total, comparisons counted");
        for (int k : new int[]{2, 10, 100, 1000}) {
            int[][] lists = makeLists(k, n, 7);
            int[] expected = Arrays.stream(lists).flatMapToInt(Arrays::stream).sorted().toArray();
            StringBuilder row = new StringBuilder("k = " + k + ":");
            String[] names = {"sequential", "heap", "divide"};
            for (int m = 0; m < 3; m++) {
                comparisons = 0;
                int[] got = m == 0 ? mergeSequential(lists) : m == 1 ? mergeHeap(lists) : mergeDivide(lists, 0, k);
                row.append(" ").append(names[m]).append(" ").append(comparisons)
                   .append(Arrays.equals(got, expected) ? "" : " WRONG");
            }
            System.out.println(row);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have k sorted \`std::vector<int>\`s holding about 10,000 numbers in total. Would you merge them with a \`std::priority_queue\` or with divide and conquer? Write both in C++, give the complexity, and tell me which you would ship."

**What a strong answer should cover:**
- Both are O(N log k) time; sequential merging is O(N·k) and is the trap to avoid.
- Heap: O(k) extra memory, works on streams, can stop early; divide and conquer: fewer comparisons and sequential memory access.
- Clarifying what "n = 10k" means: total items N, or number of lists k.
- C++ details: \`std::priority_queue\` is a max-heap by default, so a min-heap needs \`std::greater\`; \`std::tuple\` compares lexicographically; \`std::merge\` already does the two-list step; return vectors by value and let move semantics avoid copies.
- A measurement: divide and conquer was faster than the heap in our run, and \`std::sort\` of everything was close.

**Clarifying questions expected:**
- Is 10,000 the total item count or the number of lists?
- Vectors in memory, or linked lists / input streams?

**Code / implementation expected:** Yes — a \`priority_queue\` k-way merge and a recursive pairwise merge, in C++17.`,
        answer: `**Target Audience:** Developers who know basic arrays and loops in C++ and want to reason about algorithm trade-offs, not just Big-O.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has run the same exam in many classrooms. Each teacher hands in a stack of papers already sorted by score, lowest on top. The head teacher needs **one** sorted pile of every paper. There are two sensible ways to do it.

**The front desk.** Put every stack on a long desk. Look only at the *top* paper of each stack, take the lowest one, put it on the output pile, and look again. A clever assistant keeps the tops in a little "who is lowest" structure so she does not have to scan the whole desk each time. That assistant is a **heap**.

**The tournament.** Pair the stacks up: classroom 1 with 2, 3 with 4, and so on. Merge each pair into one sorted stack (easy: only two tops to compare). Now there are half as many stacks. Pair them up again. After a few rounds there is one stack. That is **divide and conquer**.

The interview question is: with about 10,000 papers in total, which way is better? The honest answer surprises people: **both do the same amount of work in Big-O terms, O(N log k), and at N = 10,000 both finish in about a millisecond.** What separates them is the constant factor, memory, and whether the data is all in memory or arriving as streams. This page measures all of that instead of guessing.

## 2. Questions to Ask Your Interviewer First

The phrase "n = 10k" is ambiguous, and the right answer depends on what it means.

| Question | Why it matters |
| :--- | :--- |
| Is 10,000 the total number of items N, or the number of lists k? | Both methods cost O(N log k). The log k part is what changes: 100 lists of 100 items is very different from 10,000 lists of 1 item. |
| Are these arrays or linked lists? | With linked lists, divide and conquer can relink nodes with O(1) extra memory; with arrays each level builds new arrays. |
| Is everything in memory, or are the lists streams (files, network)? | A heap can merge streams lazily, reading one item at a time. Divide and conquer wants whole lists up front. |
| Do you need the whole output, or only the first m items? | A heap can stop after m pops; divide and conquer must finish every level before the first item is final. |
| Do equal values need to keep a particular order? | A heap is not stable by itself; you add a tie-breaker such as the list index. |

## 3. The Shared Building Block, and the Trap

Both methods are built on one small skill: [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays) with two pointers. Compare the two front items, take the smaller, move that pointer. Two lists of total length m take at most m − 1 comparisons.

📌 **Interview term: k-way merge** — combining k sorted sequences into one sorted sequence. N is the total number of items across all k lists.

The tempting first idea is to merge list 1 into list 2, then that result into list 3, and so on. It is correct but slow: the growing result is re-read on every step. With k lists of n/k items each, the total work is about N·k / 2. At N = 10,000 and k = 100 that is roughly 500,000 comparisons (the run below measured 498,939).

📌 **Interview term: Sequential (one-by-one) merging** — merging the lists into a growing result one at a time. It costs O(N·k), because early items are copied again at every step.

## 4. Approach A — A Min-Heap of the k Front Items

Keep one entry per list in a [min-heap](/interview-question/what-is-a-heap-priority-queue): the list's current front item. Pop the smallest, write it to the output, and push the next item from *the same list*. The heap never holds more than k entries, so each push or pop costs O(log k), and every one of the N items is pushed and popped once.

📌 **Interview term: Min-heap** — a tree stored in an array where every parent is less than or equal to its children, so the smallest item is always at index 0. Push and pop cost O(log size).

📌 **Interview term: Tie-breaker** — an extra field (here the list index) compared when two values are equal, so the heap never has to compare the payload itself and the order of equal values is predictable.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Three sorted lists feed their first items into a min-heap; each pop goes to the output and the next item of the same list is pushed">
  <defs>
    <marker id="b20q1cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="57" text-anchor="middle">list 0: 1, 4, 5</text>
  <rect class="d-box" x="20" y="100" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="127" text-anchor="middle">list 1: 1, 3, 4</text>
  <rect class="d-box" x="20" y="170" width="170" height="44" rx="8"/>
  <text class="d-text" x="105" y="197" text-anchor="middle">list 2: 2, 6</text>
  <path class="d-edge" d="M 192 52 L 264 100" marker-end="url(#b20q1cp-a1)"/>
  <path class="d-edge" d="M 192 122 L 264 125" marker-end="url(#b20q1cp-a1)"/>
  <path class="d-edge" d="M 192 192 L 264 150" marker-end="url(#b20q1cp-a1)"/>
  <rect class="d-box-accent" x="270" y="70" width="180" height="110" rx="10"/>
  <text class="d-text" x="360" y="104" text-anchor="middle">min-heap of heads</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">at most k entries</text>
  <text class="d-sub" x="360" y="154" text-anchor="middle">top = smallest head</text>
  <path class="d-edge-accent" d="M 452 125 L 514 125" marker-end="url(#b20q1cp-a1)"/>
  <text class="d-sub" x="483" y="112" text-anchor="middle">pop</text>
  <rect class="d-box-muted" x="520" y="95" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="120" text-anchor="middle">output</text>
  <text class="d-sub" x="600" y="142" text-anchor="middle">1, 1, 2, 3, 4</text>
  <path class="d-edge-dashed" d="M 600 157 L 600 228 L 360 228 L 360 186" marker-end="url(#b20q1cp-a1)"/>
  <text class="d-sub" x="480" y="252" text-anchor="middle">push next item of same list</text>
</svg>

Each list sends only its current front item into the heap. When the heap gives up its smallest entry, the next item from that same list takes its place, so the heap size stays at most k.

## 5. Approach B — Divide and Conquer (Pairwise Merging)

Split the k lists into two halves, merge each half recursively, then merge the two results with the ordinary two-list merge. It is exactly the merge step of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), started from k sorted runs instead of N single items.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into smaller copies of itself, solving those, and combining the answers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Divide and conquer merges eight lists in three levels: four pair merges, then two, then one">
  <rect class="d-box-accent" x="210" y="20" width="260" height="36" rx="8"/>
  <text class="d-text" x="340" y="43" text-anchor="middle">all 8 lists merged</text>
  <rect class="d-box" x="80" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="180" y="119" text-anchor="middle">L0 to L3</text>
  <path class="d-edge" d="M 180 96 L 340 56"/>
  <rect class="d-box" x="400" y="96" width="200" height="36" rx="8"/>
  <text class="d-text" x="500" y="119" text-anchor="middle">L4 to L7</text>
  <path class="d-edge" d="M 500 96 L 340 56"/>
  <rect class="d-box" x="40" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="100" y="195" text-anchor="middle">L0 + L1</text>
  <path class="d-edge" d="M 100 172 L 180 132"/>
  <rect class="d-box" x="200" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="260" y="195" text-anchor="middle">L2 + L3</text>
  <path class="d-edge" d="M 260 172 L 180 132"/>
  <rect class="d-box" x="360" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="420" y="195" text-anchor="middle">L4 + L5</text>
  <path class="d-edge" d="M 420 172 L 500 132"/>
  <rect class="d-box" x="520" y="172" width="120" height="36" rx="8"/>
  <text class="d-text" x="580" y="195" text-anchor="middle">L6 + L7</text>
  <path class="d-edge" d="M 580 172 L 500 132"/>
  <rect class="d-box-muted" x="30" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="60" y="271" text-anchor="middle">L0</text>
  <path class="d-edge" d="M 60 248 L 100 208"/>
  <rect class="d-box-muted" x="110" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="140" y="271" text-anchor="middle">L1</text>
  <path class="d-edge" d="M 140 248 L 100 208"/>
  <rect class="d-box-muted" x="190" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="220" y="271" text-anchor="middle">L2</text>
  <path class="d-edge" d="M 220 248 L 260 208"/>
  <rect class="d-box-muted" x="270" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="300" y="271" text-anchor="middle">L3</text>
  <path class="d-edge" d="M 300 248 L 260 208"/>
  <rect class="d-box-muted" x="350" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="380" y="271" text-anchor="middle">L4</text>
  <path class="d-edge" d="M 380 248 L 420 208"/>
  <rect class="d-box-muted" x="430" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="460" y="271" text-anchor="middle">L5</text>
  <path class="d-edge" d="M 460 248 L 420 208"/>
  <rect class="d-box-muted" x="510" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="540" y="271" text-anchor="middle">L6</text>
  <path class="d-edge" d="M 540 248 L 580 208"/>
  <rect class="d-box-muted" x="590" y="248" width="60" height="36" rx="8"/>
  <text class="d-text" x="620" y="271" text-anchor="middle">L7</text>
  <path class="d-edge" d="M 620 248 L 580 208"/>
</svg>

Eight lists need three levels of merging. At every level each item is copied exactly once, so one level costs about N, and there are ⌈log₂ k⌉ levels.

📌 **Interview term: Recursion depth** — how many calls are stacked up at once. Splitting k lists in half gives a depth of about log₂ k, which is 7 for k = 100 and 14 for k = 10,000: never a stack-overflow risk.

## 6. Why Both Are O(N log k) — and Where They Differ

- **Heap:** N pushes and N pops, each O(log k). Total O(N log k). Extra memory O(k) for the heap (plus the output).
- **Divide and conquer:** ⌈log₂ k⌉ levels, each touching all N items once. Total O(N log k). Extra memory O(N) per level for arrays (O(1) when relinking linked-list nodes), plus O(log k) stack.

Same Big-O, so the interviewer is really asking about **constant factors**. A heap pop is not one comparison: sifting the new top down compares it with *both* children at each level, so a pop costs up to about 2·log₂ k comparisons. A two-list merge spends **one** comparison per item per level. Counting them on the same data (example 2) makes this concrete:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Comparisons for N equal to 10000 and k equal to 100: sequential 498939, heap 126912, divide and conquer 66995">
  <text class="d-text" x="340" y="24" text-anchor="middle">Comparisons, N = 10000 numbers in k = 100 lists</text>
  <text class="d-text" x="20" y="72">sequential</text>
  <rect class="d-box-muted" x="140" y="50" width="420" height="34" rx="4"/>
  <text class="d-sub" x="572" y="72">498939</text>
  <text class="d-text" x="20" y="128">heap</text>
  <rect class="d-box" x="140" y="106" width="107" height="34" rx="4"/>
  <text class="d-sub" x="259" y="128">126912</text>
  <text class="d-text" x="20" y="184">divide</text>
  <rect class="d-box-accent" x="140" y="162" width="56" height="34" rx="4"/>
  <text class="d-sub" x="208" y="184">66995</text>
</svg>

At k = 100, divide and conquer used about half the comparisons of the heap, and both were far below sequential merging. The heap also moves entries around inside its array, while a two-list merge reads both inputs front to back, which is friendly to the CPU cache.

| k (N = 10,000) | sequential | heap | divide and conquer |
| :--- | :--- | :--- | :--- |
| 2 | 9,998 | 9,998 | 9,998 |
| 10 | 53,976 | 61,785 | 33,978 |
| 100 | 498,939 | 126,912 | 66,995 |
| 1,000 | 4,531,003 | 185,343 | 97,869 |

Two things in this table are worth saying out loud in an interview. At k = 10 the heap did *more* comparisons than even sequential merging, because sequential merging is cheap when k is tiny. And divide and conquer is very close to the ideal N·log₂ k (10,000 × log₂ 100 ≈ 66,439).

## 7. The Code in C++

**The heap version.** \`std::priority_queue\` is a container adaptor over a \`std::vector\` that keeps the **largest** element on top by default (its comparator defaults to \`std::less\`). Passing \`std::greater\` flips it into a min-heap ([cppreference: priority_queue](https://www.fi.muni.cz/~xvaclav/cppreference/en/cpp/container/priority_queue.html)).

~~~cpp
vector<int> mergeHeap(const vector<vector<int>>& lists) {
    using Entry = tuple<int, int, int>;  // value, list index, position
    priority_queue<Entry, vector<Entry>, greater<Entry>> heap;
    for (int i = 0; i < (int)lists.size(); i++)
        if (!lists[i].empty()) heap.emplace(lists[i][0], i, 0);
    vector<int> out;
    while (!heap.empty()) {
        auto [value, i, j] = heap.top();
        heap.pop();
        out.push_back(value);
        if (j + 1 < (int)lists[i].size()) heap.emplace(lists[i][j + 1], i, j + 1);
    }
    return out;
}
~~~

**What to point out in this code:**

- \`std::tuple<int, int, int>\` compares lexicographically, so \`(value, list index, position)\` breaks ties by list index for free, and \`std::greater<Entry>\` works without a custom comparator.
- \`auto [value, i, j] = heap.top();\` is a C++17 structured binding. Copy before \`pop()\`: a reference to \`top()\` dangles after the pop.
- \`heap.emplace(...)\` constructs the tuple in place. \`top()\` is O(1); \`push\`/\`pop\` are O(log k).

**The divide-and-conquer version:**

~~~cpp
vector<int> mergeTwo(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) out.push_back(a[i++]);
        else out.push_back(b[j++]);
    }
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}

vector<int> mergeDivide(const vector<vector<int>>& lists, int lo, int hi) {
    if (hi - lo == 0) return {};
    if (hi - lo == 1) return lists[lo];
    int mid = lo + (hi - lo) / 2;
    return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}
~~~

- \`out.reserve(a.size() + b.size())\` allocates once instead of growing repeatedly. The standard library also has this exact step: \`std::merge(a.begin(), a.end(), b.begin(), b.end(), std::back_inserter(out))\`.
- Returning \`vector<int>\` by value is cheap: the result is moved (or the copy is elided), not deep-copied.
- \`lo + (hi - lo) / 2\` is the overflow-safe midpoint habit; with \`int\` indexes it matters once ranges approach 2^31.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — both methods on six inputs, including empty lists and duplicates** prints:

~~~text
input  [[1, 4, 5], [1, 3, 4], [2, 6]]
heap   [1, 1, 2, 3, 4, 4, 5, 6]
divide [1, 1, 2, 3, 4, 4, 5, 6]
input  []
heap   []
divide []
input  [[]]
heap   []
divide []
input  [[], [0], [-3, 7]]
heap   [-3, 0, 7]
divide [-3, 0, 7]
input  [[5, 5], [5], [1, 9]]
heap   [1, 5, 5, 5, 9]
divide [1, 5, 5, 5, 9]
input  [[10], [9], [8], [7], [6]]
heap   [6, 7, 8, 9, 10]
divide [6, 7, 8, 9, 10]
~~~

**Example 2 — comparison counts for sequential, heap and divide and conquer, N = 10,000.** To make the counts identical in every language, this program uses the same hand-written binary heap everywhere (a library heap may compare in a slightly different order), and the same MINSTD number generator to build the lists. It prints:

~~~text
N = 10000 numbers in total, comparisons counted
k = 2: sequential 9998 heap 9998 divide 9998
k = 10: sequential 53976 heap 61785 divide 33978
k = 100: sequential 498939 heap 126912 divide 66995
k = 1000: sequential 4531003 heap 185343 divide 97869
~~~

## 9. What the Clock Says in C++

On our sandbox (g++ 13 with -O2, average of 200 runs, N = 10,000 random ints):

| k | \`priority_queue\` | divide and conquer | concatenate + \`std::sort\` |
| :--- | :--- | :--- | :--- |
| 10 | 0.27 ms | 0.17 ms | 0.26 ms |
| 100 | 0.49 ms | 0.38 ms | 0.39 ms |
| 1,000 | 0.77 ms | 0.64 ms | 0.45 ms |

Divide and conquer beat the heap at every k, matching the comparison counts: its inner loop walks two vectors front to back, which is ideal for the CPU cache and the branch predictor. \`std::sort\` did not know about the sorted runs, yet it was competitive and won at k = 1,000, because sorting 10,000 ints is simply fast. These are one machine's numbers, so quote the ranking, not the microseconds.

📌 **Interview term: Cache locality** — how close together in memory consecutive accesses are. Reading two arrays front to back (a merge) is cache friendly; jumping between parent and child slots in a heap is less so.

## 10. So Which Is Better for N = 10,000?

For 10,000 items in memory, **either is fine, and the difference is a fraction of a millisecond.** Say that first, then show you know when each one wins:

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| All lists in memory, want the whole result | Divide and conquer (or just sort, see below) | Fewer comparisons, sequential memory access, no heap needed |
| Lists are streams, files or iterators | Heap | Holds only k items; reads each list one item at a time |
| Only the first m items are needed | Heap | Stop after m pops: O(k + m log k) |
| Linked lists, memory is tight | Divide and conquer | Relinks nodes in place: O(1) extra memory besides the stack |
| Lists keep arriving while merging | Heap | New lists just push their head into the heap |
| k is tiny (2 or 3) | Plain two-pointer merge | Nothing to gain from either structure |

📌 **Interview term: External merge** — merging sorted runs that live on disk (as in external sorting). It always uses a heap (or a tournament tree), because only one block of each run fits in memory.

📌 **Interview term: Constant factor** — the fixed multiplier that Big-O hides. Two O(N log k) algorithms can differ by 2× or more in real time because of comparisons per step and memory access patterns.

## 11. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sequential merging | O(N·k) | O(N) | the growing result is re-read k times |
| Min-heap of heads | O(N log k) | O(k) | N pushes + N pops on a heap of at most k entries |
| Divide and conquer | O(N log k) | O(N) arrays / O(1) linked lists, + O(log k) stack | log₂ k levels, each touching N items once |
| Concatenate and sort | O(N log N) | O(N) | ignores the existing order, but uses a highly tuned library sort |

## 12. Edge Cases

- **No lists at all** (\`[]\`) and **only empty lists** (\`[[]]\`): both methods return an empty result. The heap never receives an entry; divide and conquer hits the "zero lists" base case (example 1).
- **Some empty lists mixed in** (\`[[], [0], [-3, 7]]\`): the heap version must skip empty lists when seeding; the divide version handles them naturally because merging with an empty list copies the other one.
- **Duplicates across lists** (\`[[5, 5], [5], [1, 9]]\`): the heap needs a tie-breaker so equal values never force a comparison of anything else; the output keeps all three 5s.
- **Many single-item lists** (\`[[10], [9], [8], [7], [6]]\`): this is k = N, the worst case for both: log k becomes log N and the whole thing is effectively a sort.
- **Very uneven lengths** (one list of 9,900 and 100 lists of 1): the halving split still gives log₂ k levels, but the big list is copied at every level. A heap does not care about the shape. (Merging the smallest lists first, like Huffman coding, is the optimal order here.)

This page compares the two methods. For a full walk-through of the linked-list version of the problem itself, see [How do you merge k sorted lists?](/interview-question/how-do-you-merge-k-sorted-lists).

## Common Pitfalls

- **Forgetting that \`std::priority_queue\` is a max-heap.** Without \`std::greater\`, the merge outputs the largest items first. Declare \`priority_queue<T, vector<T>, greater<T>>\`.
- **Keeping a reference to \`top()\` across \`pop()\`.** \`const auto& t = heap.top(); heap.pop();\` leaves \`t\` dangling. Copy the entry first.
- **Mixing \`int\` and \`size_t\` in loop bounds.** \`j + 1 < lists[i].size()\` compares signed with unsigned; cast once (\`(int)lists[i].size()\`) or use \`size_t\` throughout to avoid warnings and negative-index bugs.
- **Passing vectors by value into the merge.** \`vector<int> mergeTwo(vector<int> a, vector<int> b)\` copies both inputs at every level. Take \`const vector<int>&\`.
- **Merging into a growing result in a loop.** \`result = mergeTwo(result, lst)\` for every list is O(N·k): 498,939 comparisons at k = 100 instead of 66,995.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both are O(N log k):</strong> <span style="color:#f0e2c8;">A heap of the k front items costs O(log k) per item; pairwise merging has log₂ k levels of O(N) work. Sequential merging is O(N·k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;tuple&lt;int,int,int&gt;, vector&lt;...&gt;, greater&lt;...&gt;&gt;</code>: it is a max-heap by default, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater</code> is required. Tuples break ties by list index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Divide and conquer:</strong> <span style="color:#f0e2c8;">Recursively merge each half of the lists, then a two-pointer merge or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code>. One comparison per item per level, cache-friendly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. For N = 10,000:</strong> <span style="color:#f0e2c8;">Both well under a millisecond. Divide used half the comparisons (66,995 vs 126,912 at k = 100) and was faster at every k we measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My pick:</strong> <span style="color:#f0e2c8;">Divide and conquer for vectors in memory; a heap for streams, for the first m items only, or when lists keep arriving.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you turn <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">priority_queue</code> into a min-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;T&gt;</code> as the third template argument: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code>. A custom lambda comparator also works, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decltype(cmp)</code> as the type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a library function for the two-list merge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;algorithm&gt;</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::inplace_merge</code> merges two adjacent sorted ranges of one vector, which gives an in-place bottom-up version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for linked lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer relinks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointers, so no allocations and O(log k) extra space. The heap stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode*</code> with a comparator on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;val</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the heap win?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::istream</code>s or iterators that cannot be loaded at once (only k items in memory), when you need the first m results only, or when new lists arrive mid-merge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code> win at k = 1,000?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 1,000 lists of 10 items the merge tree is 10 levels deep, close to sorting anyway, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> on contiguous ints is extremely tuned.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **k-way merge** | Combining k sorted sequences into one; N is the total item count |
| **Sequential (one-by-one) merging** | Merging lists into a growing result one at a time; O(N·k) |
| **Min-heap** | Array-backed tree with the smallest item at the root; O(log n) push and pop |
| **Tie-breaker** | Extra field compared when values are equal, such as the list index |
| **Divide and conquer** | Split into smaller copies of the problem, solve them, combine |
| **Recursion depth** | How many calls are stacked at once; log₂ k for pairwise merging |
| **External merge** | Merging sorted runs stored on disk; always heap-based |
| **Constant factor** | The multiplier Big-O hides; it decides between two O(N log k) methods |
| **Cache locality** | How close together consecutive memory accesses are; merges read memory front to back |

---
**Conclusion:** Heap and divide and conquer are both O(N log k), and at N = 10,000 the choice is about constants and data shape, not Big-O. In C++ divide and conquer did half the comparisons, walked memory front to back, and was faster at every k we measured; a \`priority_queue\` (remember \`std::greater\`, since it is a max-heap by default) is the right tool when the inputs are streams or you only need the first few items.`,
        examples: [
          {
            label: `Heap and divide-and-conquer merges on six inputs`,
            code: `#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <vector>
using namespace std;

// k-way merge: std::priority_queue is a max-heap by default, so std::greater makes it a min-heap.
vector<int> mergeHeap(const vector<vector<int>>& lists) {
    using Entry = tuple<int, int, int>;  // value, list index, position
    priority_queue<Entry, vector<Entry>, greater<Entry>> heap;
    for (int i = 0; i < (int)lists.size(); i++)
        if (!lists[i].empty()) heap.emplace(lists[i][0], i, 0);
    vector<int> out;
    while (!heap.empty()) {
        auto [value, i, j] = heap.top();
        heap.pop();
        out.push_back(value);
        if (j + 1 < (int)lists[i].size()) heap.emplace(lists[i][j + 1], i, j + 1);
    }
    return out;
}

vector<int> mergeTwo(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) out.push_back(a[i++]);
        else out.push_back(b[j++]);
    }
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}

vector<int> mergeDivide(const vector<vector<int>>& lists, int lo, int hi) {
    if (hi - lo == 0) return {};
    if (hi - lo == 1) return lists[lo];
    int mid = lo + (hi - lo) / 2;
    return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

string fmt(const vector<vector<int>>& xss) {
    string s = "[";
    for (size_t i = 0; i < xss.size(); i++) s += (i ? ", " : "") + fmt(xss[i]);
    return s + "]";
}

int main() {
    vector<vector<vector<int>>> cases = {
        {{1, 4, 5}, {1, 3, 4}, {2, 6}},
        {},
        {{}},
        {{}, {0}, {-3, 7}},
        {{5, 5}, {5}, {1, 9}},
        {{10}, {9}, {8}, {7}, {6}},
    };
    for (const auto& lists : cases) {
        cout << "input  " << fmt(lists) << "\\n";
        cout << "heap   " << fmt(mergeHeap(lists)) << "\\n";
        cout << "divide " << fmt(mergeDivide(lists, 0, (int)lists.size())) << "\\n";
    }
}`,
          },
          {
            label: `Comparison counts: sequential vs heap vs divide, N = 10000`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Count comparisons for three ways to merge k sorted lists holding N = 10000 numbers.
long long comparisons = 0;

bool lessThan(int a, int b) { comparisons++; return a < b; }

using Entry = pair<int, int>;  // value, list index
bool lessEntry(const Entry& x, const Entry& y) { comparisons++; return x < y; }

vector<int> mergeTwo(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (lessThan(b[j], a[i])) out.push_back(b[j++]);
        else out.push_back(a[i++]);
    }
    out.insert(out.end(), a.begin() + i, a.end());
    out.insert(out.end(), b.begin() + j, b.end());
    return out;
}

vector<int> mergeSequential(const vector<vector<int>>& lists) {
    vector<int> result;
    for (const auto& lst : lists) result = mergeTwo(result, lst);  // the result keeps growing
    return result;
}

vector<int> mergeDivide(const vector<vector<int>>& lists, int lo, int hi) {
    if (hi - lo == 1) return lists[lo];
    int mid = lo + (hi - lo) / 2;
    return mergeTwo(mergeDivide(lists, lo, mid), mergeDivide(lists, mid, hi));
}

// Hand-written binary heap (not std::priority_queue) so every language counts the same comparisons.
vector<int> mergeHeap(const vector<vector<int>>& lists) {
    vector<Entry> heap;
    auto push = [&](Entry item) {
        heap.push_back(item);
        size_t c = heap.size() - 1;
        while (c > 0) {
            size_t p = (c - 1) / 2;
            if (!lessEntry(heap[c], heap[p])) break;
            swap(heap[c], heap[p]);
            c = p;
        }
    };
    auto pop = [&]() {
        Entry top = heap[0];
        heap[0] = heap.back();
        heap.pop_back();
        size_t p = 0;
        while (true) {
            size_t l = 2 * p + 1, r = 2 * p + 2, m = p;
            if (l < heap.size() && lessEntry(heap[l], heap[m])) m = l;
            if (r < heap.size() && lessEntry(heap[r], heap[m])) m = r;
            if (m == p) break;
            swap(heap[p], heap[m]);
            p = m;
        }
        return top;
    };
    vector<size_t> pos(lists.size(), 0);
    for (int i = 0; i < (int)lists.size(); i++) push({lists[i][0], i});
    vector<int> out;
    while (!heap.empty()) {
        auto [value, i] = pop();
        out.push_back(value);
        if (++pos[i] < lists[i].size()) push({lists[i][pos[i]], i});
    }
    return out;
}

vector<vector<int>> makeLists(int k, int n, long long seed) {
    vector<vector<int>> lists(k);
    for (int x = 0; x < n; x++) {
        seed = seed * 48271 % 2147483647;  // MINSTD; long long, because the product overflows int
        lists[x % k].push_back((int)(seed % 100000));
    }
    for (auto& lst : lists) sort(lst.begin(), lst.end());
    return lists;
}

int main() {
    const int n = 10000;
    cout << "N = " << n << " numbers in total, comparisons counted\\n";
    for (int k : {2, 10, 100, 1000}) {
        auto lists = makeLists(k, n, 7);
        vector<int> expected;
        for (const auto& lst : lists) expected.insert(expected.end(), lst.begin(), lst.end());
        sort(expected.begin(), expected.end());
        string row = "k = " + to_string(k) + ":";
        const char* names[] = {"sequential", "heap", "divide"};
        for (int m = 0; m < 3; m++) {
            comparisons = 0;
            vector<int> got = m == 0 ? mergeSequential(lists) : m == 1 ? mergeHeap(lists) : mergeDivide(lists, 0, k);
            row += string(" ") + names[m] + " " + to_string(comparisons) + (got == expected ? "" : " WRONG");
        }
        cout << row << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: `How do you find the median from a data stream?`,
    difficulty: "hard",
    seoDescription: `Running median of a stream with two heaps: O(log n) add, O(1) median, compared with sorting and sorted insert, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Numbers arrive one at a time. Design a Python class with \`add_num(x)\` and \`find_median()\`, where \`find_median\` returns the median of everything added so far. Both calls happen many times, so tell me the cost of each."

**What a strong answer should cover:**
- Why sorting on every query (O(n log n)) and keeping a sorted list (O(n) per insert) are too slow for long streams.
- Two heaps: a max-heap for the lower half and a min-heap for the upper half; O(log n) add, O(1) median.
- The invariant: every number in the lower half ≤ every number in the upper half, and the sizes differ by at most one.
- Python details: \`heapq\` is a min-heap only, so the lower half stores negated values; use \`/ 2\` (true division) for the even case, not \`// 2\`.
- Follow-ups: values in a small range (counting buckets), removals (sliding window), percentiles other than 50%.

**Clarifying questions expected:**
- For an even count, average the two middle values or return the lower one?
- What range can the values take, and can they be removed?

**Code / implementation expected:** Yes — a \`MedianFinder\` class built on two \`heapq\` lists, in Python 3.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and basic classes in Python; heaps are explained as we go.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A radio quiz show reads out contestants' scores one at a time, and after every score the host asks the studio: "What is the middle score so far?" Nobody writes the scores down in order. If you kept every score on a scrap of paper and re-sorted the pile each time, you would be shuffling papers longer and longer as the night goes on.

A smarter assistant keeps **two piles**. The left pile holds the lower half of the scores and keeps its *highest* paper on top. The right pile holds the upper half and keeps its *lowest* paper on top. The middle score is always sitting on top of one pile (or halfway between the two tops). Each new score goes on one pile, and at most one paper moves across to keep the piles the same height.

That is the whole algorithm. The two piles are two [heaps](/interview-question/what-is-a-heap-priority-queue), and the reason interviewers love this question is that it rewards picking the right data structure over writing clever code. The same pattern shows up in latency dashboards ("p50 response time so far"), trading systems and sensor monitoring.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How often is the median asked for, compared with adds? | If the median is asked once at the end, just sort once. Two heaps pay off when you query after many adds. |
| What is the range of values? | If every value is in a small range (say 0 to 100), counting buckets beat heaps (section 10). |
| Can numbers be removed, or only added? | Removal needs lazy deletion or a balanced tree; that is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). |
| For an even count, return the average of the two middles, or the lower one? | Changes the return type (float vs int) and the formula. The classic version averages. |
| How large can values get? | Adding two 32-bit ints can overflow in Java and C++ before you divide. |
| Does it have to be exact? | At very large scale, approximate quantile sketches use a fixed amount of memory. |

## 3. What Exactly Are We Computing?

The **median** is the middle value after sorting. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. For \`[1, 3, 5, 8, 15]\` it is 5; for \`[1, 3, 5, 8]\` it is (3 + 5) / 2 = 4.

📌 **Interview term: Median** — the middle value of the sorted data (the average of the two middle values when the count is even). Unlike the mean, one huge outlier barely moves it.

📌 **Interview term: Online algorithm** — an algorithm that processes input piece by piece as it arrives and can answer at any time, without seeing the future. "Median from a data stream" asks for an online algorithm.

The hard part is not the definition but the cost. The stream can be millions of numbers long, and the question asks for the median *after every add*, so whatever we do per add is multiplied by n.

## 4. From Brute Force to Two Heaps

**Attempt 1 — sort every time.** Keep a list; on every query, sort it and take the middle. That costs O(n log n) per query, O(n² log n) for n queries.

**Attempt 2 — keep the list sorted.** Use [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) to find where the new number goes and insert it there. Finding the spot is O(log n), but inserting into an array shifts every later element: O(n) per add. The median is then an O(1) lookup. Over 3,000 numbers, example 2 counts **2,222,515** element shifts.

**Attempt 3 — two heaps.** We never need the whole order, only the one or two numbers in the middle. So split the numbers into a lower half and an upper half:

- \`low\` is a **max-heap** of the smaller half: its top is the largest of the small numbers.
- \`high\` is a **min-heap** of the larger half: its top is the smallest of the large numbers.

📌 **Interview term: Max-heap / min-heap** — a heap whose top is the largest (max-heap) or smallest (min-heap) element, readable in O(1) and removable in O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The numbers 1 3 5 sit in a max-heap called low and 8 15 sit in a min-heap called high; the median 5 is the top of low">
  <defs>
    <marker id="b20q2py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">low: smaller half</text>
  <text class="d-sub" x="175" y="50" text-anchor="middle">max-heap, top = largest</text>
  <rect class="d-box" x="40" y="70" width="270" height="70" rx="10"/>
  <text class="d-text" x="110" y="111" text-anchor="middle">1</text>
  <text class="d-text" x="170" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="222" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="254" y="111" text-anchor="middle">5</text>
  <text class="d-text" x="525" y="28" text-anchor="middle">high: larger half</text>
  <text class="d-sub" x="525" y="50" text-anchor="middle">min-heap, top = smallest</text>
  <rect class="d-box" x="390" y="70" width="270" height="70" rx="10"/>
  <rect class="d-box-accent" x="414" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="446" y="111" text-anchor="middle">8</text>
  <text class="d-text" x="540" y="111" text-anchor="middle">15</text>
  <path class="d-edge-accent" d="M 254 128 L 300 196" marker-end="url(#b20q2py-a1)"/>
  <path class="d-edge-dashed" d="M 446 128 L 400 196" marker-end="url(#b20q2py-a1)"/>
  <rect class="d-box-muted" x="250" y="200" width="200" height="40" rx="8"/>
  <text class="d-text" x="350" y="226" text-anchor="middle">median = 5 (odd count)</text>
</svg>

The two tops are the two numbers closest to the middle. With an odd count, \`low\` holds the extra number and its top is the median; with an even count, the median is the average of both tops.

Two rules, kept true after every add, make this work. Together they are the **invariant**; the full argument for why they are enough, and why at most one move is ever needed, is on its own page: [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

1. **Order rule:** every number in \`low\` is ≤ every number in \`high\`.
2. **Size rule:** \`len(low) == len(high)\` or \`len(low) == len(high) + 1\`.

📌 **Interview term: Invariant** — a condition that is true before and after every operation. You prove the algorithm correct by showing each operation preserves it.

Each add is three small steps:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Adding a number: route it by comparing with the top of low, rebalance by moving at most one top, then read the median from the tops">
  <defs>
    <marker id="b20q2py-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="92" text-anchor="middle">1. route x</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">x at most top(low): low</text>
  <path class="d-edge" d="M 212 100 L 262 100" marker-end="url(#b20q2py-a2)"/>
  <rect class="d-box" x="266" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="361" y="92" text-anchor="middle">2. rebalance</text>
  <text class="d-sub" x="361" y="116" text-anchor="middle">move one top if needed</text>
  <path class="d-edge" d="M 458 100 L 508 100" marker-end="url(#b20q2py-a2)"/>
  <rect class="d-box-accent" x="512" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="607" y="92" text-anchor="middle">3. read tops</text>
  <text class="d-sub" x="607" y="116" text-anchor="middle">O(1) median</text>
  <text class="d-sub" x="237" y="170" text-anchor="middle">O(log n)</text>
  <text class="d-sub" x="483" y="170" text-anchor="middle">O(log n)</text>
</svg>

Route the number by comparing it with the top of \`low\`, fix the sizes by moving at most one top across, and read the answer from the tops. Each heap push or pop is O(log n), so an add is O(log n) and a median query is O(1).

Here is the stream \`5, 15, 1, 3, 8\` step by step:

| Add | Goes to | Rebalance | low (max-heap) | high (min-heap) | Median |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | low (it is empty) | — | [5] | [] | 5.0 |
| 15 | high (15 > 5) | — | [5] | [15] | 10.0 |
| 1 | low (1 ≤ 5) | — | [1, 5] | [15] | 5.0 |
| 3 | low (3 ≤ 5) | low too big: 5 → high | [1, 3] | [5, 15] | 4.0 |
| 8 | high (8 > 3) | high too big: 5 → low | [1, 3, 5] | [8, 15] | 5.0 |

## 5. The Code in Python

Python's \`heapq\` module only provides a **min-heap** over a plain list: \`heap[0]\` is always the smallest item. To get a max-heap for the lower half, we store every number **negated**: the largest original number becomes the smallest key, so \`-low[0]\` is the largest number in the lower half.

📌 **Interview term: Negation trick** — storing \`-x\` in a min-heap to simulate a max-heap. Push \`-x\`, and negate again whenever you read or pop.

~~~python
class MedianFinder:
    """low = max-heap of the smaller half (stored negated), high = min-heap of the larger half."""

    def __init__(self):
        self.low = []   # negated values: -low[0] is the largest of the small half
        self.high = []  # high[0] is the smallest of the large half

    def add_num(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x)
        else:
            heapq.heappush(self.high, x)
        # rebalance so that len(low) == len(high) or len(low) == len(high) + 1
        if len(self.low) > len(self.high) + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
        elif len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def find_median(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
~~~

**What to point out in this code:**

- Every read of \`low\` is negated exactly once: \`-self.low[0]\` to peek, \`-heapq.heappop(self.low)\` to pop. Mixing up a sign is the most common bug in this solution.
- \`heapq.heappush(self.high, -heapq.heappop(self.low))\` moves the largest number of the lower half into the upper half in one line: pop (O(log n)), negate back, push (O(log n)).
- \`(-self.low[0] + self.high[0]) / 2\` uses \`/\`, which always returns a float in Python 3. \`//\` would floor: it would turn 7.5 into 7 and −1.5 into −2.
- Python integers never overflow, so the sum of the two tops is always exact.
- Python 3.14 added max-heap functions to \`heapq\` (\`heappush_max\`, \`heappop_max\` and friends) ([heapq docs](https://docs.python.org/3/library/heapq.html)). This page uses negation because it works on every Python 3 version, and our sandbox ran Python 3.13.
- For the sorted-list approach, \`bisect.insort(lst, x)\` finds the spot with binary search but still shifts elements, so it is O(n) per insert ([how the bisect module works](/interview-question/how-does-the-bisect-module-work)).

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the median after every add, on three streams** prints:

~~~text
stream  [5, 15, 1, 3, 8, 7, 9, 10, 20, 2]
medians [5.0, 10.0, 5.0, 4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 7.5]
stream  [-1, -2, -3, -4]
medians [-1.0, -1.5, -2.0, -2.5]
stream  [2, 2, 2, 2]
medians [2.0, 2.0, 2.0, 2.0]
~~~

The first stream matches the table in section 4 for its first five numbers.

**Example 2 — sort every time vs sorted insert vs two heaps vs counting buckets, on a 3,000-number stream.** Medians are kept as *twice the median* (an integer) so the comparison is exact; the "checksum" is the sum of those integers over all 3,000 adds. It prints:

~~~text
stream of 3000 numbers in 0..100
sort every time: last median 49.0, checksum 291958
sorted insert:   last median 49.0, checksum 291958, elements shifted 2222515
two heaps:       last median 49.0, checksum 291958, final sizes 1500 and 1500
all three agree after every add: true
101 buckets:     last median 49.0, agrees: true
~~~

All approaches agree after every single add. The sorted insert shifted over two million elements to get there, and the heaps ended with exactly 1,500 numbers each.

## 7. Scaling Up

At 3,000 numbers all three approaches are instant. The difference appears at scale. On our sandbox, with random numbers and a median read after every add:

| Stream length | \`bisect.insort\` (sorted list) | two heaps |
| :--- | :--- | :--- |
| 100,000 | 0.58 s | 0.05 s |
| 300,000 | 5.05 s | 0.19 s |

Tripling the stream made the sorted list about 9× slower (the O(n²) total shows), while the heaps grew roughly in proportion. \`insort\` shifts with a fast C memory move, which is why it survives at all at 100,000; it still loses badly.

## 8. Why Two Heaps Beat a Sorted List

A sorted list keeps *all* n numbers in order, and paying for that order is what costs O(n) per insert. Two heaps keep almost no order: only "everything on the left is smaller than everything on the right", plus a cheap way to reach the largest left number and the smallest right number. That is the least structure that still answers the question, and it is why each add drops to O(log n). The same idea, "keep only the order you need", is behind using a heap for the [Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

## 9. A Second Look at the Invariant

After every add, check two things: the top of \`low\` is ≤ the top of \`high\`, and the sizes are equal or \`low\` has one more. Because both heaps are valid heaps, checking the tops is enough to know every element of \`low\` is ≤ every element of \`high\`. Why routing by the top of \`low\` plus a single move always restores both rules is proved step by step on [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

## 10. The Classic Follow-Ups

**"All numbers are between 0 and 100."** Then a heap is overkill. Keep an array of 101 counters; an add is \`counts[x] += 1\` (O(1)), and the median is found by walking the counters until you pass the middle position (at most 101 steps, a constant). Example 2 does exactly this on the 3,000-number stream and gets the same final median, 49.0.

📌 **Interview term: Counting buckets (counting sort idea)** — when values come from a small known range, count how many times each value appears instead of storing the values. Space is the size of the range, not the size of the stream.

**"99% of numbers are between 0 and 100."** Keep the 101 buckets for the common case, plus two plain counters (or two small heaps) for values below 0 and above 100. The median almost always lands inside the buckets; when it does not, the small heaps answer it.

**"Numbers can also be removed"** or **"only the last k numbers count."** Heaps cannot delete an arbitrary element cheaply, so you add lazy deletion or switch to a balanced tree. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

**"Any percentile, not just the median."** The same trick works for the 90th percentile: keep \`low\` at 90% of the items and \`high\` at 10% by changing the size rule. For many different percentiles at huge scale, real systems use approximate quantile sketches that keep a fixed-size summary instead of every number.

**"The data is not a stream: two sorted arrays."** That is a different problem with a binary-search solution: [median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work).

## 11. Complexity

| Approach | Add | Median | Space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Sort on every query | O(1) | O(n log n) | O(n) | re-sorts everything each time |
| Sorted insert | O(n) | O(1) | O(n) | binary search is O(log n), but the shift is O(n) |
| Two heaps | O(log n) | O(1) | O(n) | at most three heap operations per add; the tops are the answer |
| Counting buckets (values in 0..R) | O(1) | O(R) | O(R) | one counter per possible value |
| Balanced BST / order-statistic tree | O(log n) | O(log n) | O(n) | also supports deletion |

## 12. Edge Cases

- **The first number.** \`low\` is empty, so the routing test must check for emptiness before peeking (\`not low\`, \`size === 0\`, \`isEmpty()\`, \`empty()\`).
- **Even count.** The median is the average of the two tops, so the result is a floating-point number: 10.0 after \`5, 15\`, 7.5 after ten numbers in example 1.
- **All numbers equal** (\`2, 2, 2, 2\`). The routing test uses ≤, so equal numbers go to \`low\` and the size rule moves one across; the median stays 2.0.
- **Negative numbers** (\`-1, -2, -3, -4\`). Nothing special for the algorithm, but in Python the negation trick turns them into positive keys; the code must negate back exactly once.
- **Median requested before any add.** Undefined; decide with the interviewer whether to throw an error or return a sentinel.
- **Huge values.** Two values near 2^31 overflow a 32-bit sum in Java and C++; widen before adding.

## Common Pitfalls

- **Forgetting a negation.** Pushing \`x\` instead of \`-x\` into \`low\`, or reading \`low[0]\` instead of \`-low[0]\`, gives wrong answers that still look plausible. Wrap the heap in two tiny helper methods if you are nervous.
- **Using \`//\` for the even case.** \`(3 + 4) // 2\` is 3, not 3.5, and \`(-1 + -2) // 2\` is -2. Use \`/ 2\`.
- **Peeking at an empty heap.** \`self.low[0]\` raises \`IndexError\` on the first add; test \`not self.low\` first, as the code does.
- **Sorting inside \`find_median\`.** \`sorted(self.nums)[len(self.nums) // 2]\` is correct but O(n log n) per query.
- **Assuming \`bisect.insort\` is O(log n).** Only the search is; the insert shifts elements. 2,222,515 shifts for 3,000 numbers in example 2.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two halves:</strong> <span style="color:#f0e2c8;">A max-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> for the smaller half and a min-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> for the larger half; the median is at the tops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Python max-heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is min-only, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> stores negated numbers: push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code>, peek <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-low[0]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Add:</strong> <span style="color:#f0e2c8;">Route by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-low[0]</code>, then move at most one top so that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(low)</code> equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(high)</code> or is one more. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Median:</strong> <span style="color:#f0e2c8;">Odd count: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-low[0]</code>. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(-low[0] + high[0]) / 2</code>, true division. O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not simpler:</strong> <span style="color:#f0e2c8;">Sorting per query is O(n log n) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect.insort</code> is O(n) per add; at 300,000 numbers insort took 5 s vs 0.19 s for heaps.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every number is between 0 and 100?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use 101 counters: add is O(1), and the median is a walk over at most 101 buckets. Example 2 shows it agrees with the heaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid the negation trick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On Python 3.14+ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.heappush_max</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.heappop_max</code> exist. On older versions, negation or a wrapper class with a reversed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__lt__</code> are the options; negation is simplest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support removing a number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Heaps cannot remove an arbitrary item cheaply. Use lazy deletion (a dict of pending removals, popped when they reach a top) or a sorted container. That is the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the sizes differ by at most one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the middle element (or the two middle elements) of the sorted order are exactly the tops. If one heap were two bigger, the median would be buried inside it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the 90th percentile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same structure, different size rule: keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> at 90% of the items. The tops still bracket the answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | The middle value of the sorted data; the average of the two middles for an even count |
| **Online algorithm** | Processes input as it arrives and can answer at any time |
| **Max-heap / min-heap** | A heap whose top is the largest / smallest element |
| **Invariant** | A condition that holds before and after every operation |
| **Counting buckets (counting sort idea)** | Count occurrences of each value when the value range is small |
| **Negation trick** | Store -x in a min-heap to simulate a max-heap |

---
**Conclusion:** A running median needs only the middle of the data, so two heaps that each hold half of it are enough: a max-heap for the lower half (negated values in Python's min-only \`heapq\`) and a min-heap for the upper half. Each add routes one number and moves at most one top, O(log n); the median is read from the tops in O(1). Know the alternatives and when they win, especially counting buckets for small ranges, and watch the two Python traps: a missing minus sign, and \`//\` where you meant \`/\`.`,
        examples: [
          {
            label: `MedianFinder: the median after every add (3 streams)`,
            code: `import heapq


class MedianFinder:
    """low = max-heap of the smaller half (stored negated), high = min-heap of the larger half."""

    def __init__(self):
        self.low = []   # negated values: -low[0] is the largest of the small half
        self.high = []  # high[0] is the smallest of the large half

    def add_num(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x)
        else:
            heapq.heappush(self.high, x)
        # rebalance so that len(low) == len(high) or len(low) == len(high) + 1
        if len(self.low) > len(self.high) + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
        elif len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def find_median(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2


for stream in [[5, 15, 1, 3, 8, 7, 9, 10, 20, 2], [-1, -2, -3, -4], [2, 2, 2, 2]]:
    mf = MedianFinder()
    medians = []
    for x in stream:
        mf.add_num(x)
        medians.append("%.1f" % mf.find_median())
    print("stream  [" + ", ".join(str(x) for x in stream) + "]")
    print("medians [" + ", ".join(medians) + "]")`,
          },
          {
            label: `Sort every time vs sorted insert vs two heaps vs buckets`,
            code: `import bisect
import heapq

# Three ways to answer "median so far" after every number of a 3000-number stream.


def stream(n, seed):
    out = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD, same numbers in every language
        out.append(seed % 101)            # values 0..100, so the bucket follow-up applies
    return out


nums = stream(3000, 11)

# 1. Sort everything again after each add: O(n log n) per add.
sorted_answers = []
seen = []
for x in nums:
    seen.append(x)
    s = sorted(seen)
    n = len(s)
    sorted_answers.append(s[n // 2] + s[(n - 1) // 2])  # twice the median, kept as an int

# 2. Keep one sorted list and insert in place: O(log n) search + O(n) shift.
insert_answers, shifted = [], 0
window = []
for x in nums:
    pos = bisect.bisect_right(window, x)
    shifted += len(window) - pos  # elements that move one slot right
    window.insert(pos, x)
    n = len(window)
    insert_answers.append(window[n // 2] + window[(n - 1) // 2])

# 3. Two heaps: O(log n) per add, O(1) per median.
low, high, heap_answers = [], [], []
for x in nums:
    if not low or x <= -low[0]:
        heapq.heappush(low, -x)
    else:
        heapq.heappush(high, x)
    if len(low) > len(high) + 1:
        heapq.heappush(high, -heapq.heappop(low))
    elif len(high) > len(low):
        heapq.heappush(low, -heapq.heappop(high))
    heap_answers.append(-low[0] * 2 if len(low) > len(high) else -low[0] + high[0])

# 4. Follow-up: every value is in 0..100, so count them in 101 buckets.
counts = [0] * 101
for x in nums:
    counts[x] += 1


def kth(k):
    """k-th smallest (0-based) by walking the buckets."""
    for v in range(101):
        if k < counts[v]:
            return v
        k -= counts[v]


n = len(nums)
bucket_twice = kth(n // 2) + kth((n - 1) // 2)

print("stream of " + str(n) + " numbers in 0..100")
print("sort every time: last median " + "%.1f" % (sorted_answers[-1] / 2) + ", checksum " + str(sum(sorted_answers)))
print("sorted insert:   last median " + "%.1f" % (insert_answers[-1] / 2) + ", checksum " + str(sum(insert_answers)) + ", elements shifted " + str(shifted))
print("two heaps:       last median " + "%.1f" % (heap_answers[-1] / 2) + ", checksum " + str(sum(heap_answers)) + ", final sizes " + str(len(low)) + " and " + str(len(high)))
print("all three agree after every add: " + str(sorted_answers == insert_answers == heap_answers).lower())
print("101 buckets:     last median " + "%.1f" % (bucket_twice / 2) + ", agrees: " + str(bucket_twice == heap_answers[-1]).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Numbers arrive one at a time. Design a JavaScript class with \`addNum(x)\` and \`findMedian()\`, where \`findMedian\` returns the median of everything added so far. Both are called many times, so tell me the cost of each."

**What a strong answer should cover:**
- Why sorting on every query (O(n log n)) and a sorted array with \`splice\` (O(n) per insert) are too slow for long streams.
- Two heaps: a max-heap for the lower half and a min-heap for the upper half; O(log n) add, O(1) median.
- The invariant: lower half ≤ upper half, and the sizes differ by at most one.
- JavaScript details: there is no built-in heap, so write a small one with a comparator; \`sort()\` without \`(a, b) => a - b\` sorts as strings; numbers are doubles, exact for integers up to 2^53.
- Follow-ups: values in a small range (counting buckets), removals (sliding window), percentiles other than 50%.

**Clarifying questions expected:**
- For an even count, average the two middle values or return the lower one?
- What range can the values take, and can they be removed?

**Code / implementation expected:** Yes — a \`MedianFinder\` class built on two instances of a small binary heap class, in JavaScript.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and basic classes in JavaScript; heaps are explained as we go.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A radio quiz show reads out contestants' scores one at a time, and after every score the host asks the studio: "What is the middle score so far?" Nobody writes the scores down in order. If you kept every score on a scrap of paper and re-sorted the pile each time, you would be shuffling papers longer and longer as the night goes on.

A smarter assistant keeps **two piles**. The left pile holds the lower half of the scores and keeps its *highest* paper on top. The right pile holds the upper half and keeps its *lowest* paper on top. The middle score is always sitting on top of one pile (or halfway between the two tops). Each new score goes on one pile, and at most one paper moves across to keep the piles the same height.

That is the whole algorithm. The two piles are two [heaps](/interview-question/what-is-a-heap-priority-queue), and the reason interviewers love this question is that it rewards picking the right data structure over writing clever code. The same pattern shows up in latency dashboards ("p50 response time so far"), trading systems and sensor monitoring.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How often is the median asked for, compared with adds? | If the median is asked once at the end, just sort once. Two heaps pay off when you query after many adds. |
| What is the range of values? | If every value is in a small range (say 0 to 100), counting buckets beat heaps (section 10). |
| Can numbers be removed, or only added? | Removal needs lazy deletion or a balanced tree; that is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). |
| For an even count, return the average of the two middles, or the lower one? | Changes the return type (float vs int) and the formula. The classic version averages. |
| How large can values get? | Adding two 32-bit ints can overflow in Java and C++ before you divide. |
| Does it have to be exact? | At very large scale, approximate quantile sketches use a fixed amount of memory. |

## 3. What Exactly Are We Computing?

The **median** is the middle value after sorting. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. For \`[1, 3, 5, 8, 15]\` it is 5; for \`[1, 3, 5, 8]\` it is (3 + 5) / 2 = 4.

📌 **Interview term: Median** — the middle value of the sorted data (the average of the two middle values when the count is even). Unlike the mean, one huge outlier barely moves it.

📌 **Interview term: Online algorithm** — an algorithm that processes input piece by piece as it arrives and can answer at any time, without seeing the future. "Median from a data stream" asks for an online algorithm.

The hard part is not the definition but the cost. The stream can be millions of numbers long, and the question asks for the median *after every add*, so whatever we do per add is multiplied by n.

## 4. From Brute Force to Two Heaps

**Attempt 1 — sort every time.** Keep a list; on every query, sort it and take the middle. That costs O(n log n) per query, O(n² log n) for n queries.

**Attempt 2 — keep the list sorted.** Use [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) to find where the new number goes and insert it there. Finding the spot is O(log n), but inserting into an array shifts every later element: O(n) per add. The median is then an O(1) lookup. Over 3,000 numbers, example 2 counts **2,222,515** element shifts.

**Attempt 3 — two heaps.** We never need the whole order, only the one or two numbers in the middle. So split the numbers into a lower half and an upper half:

- \`low\` is a **max-heap** of the smaller half: its top is the largest of the small numbers.
- \`high\` is a **min-heap** of the larger half: its top is the smallest of the large numbers.

📌 **Interview term: Max-heap / min-heap** — a heap whose top is the largest (max-heap) or smallest (min-heap) element, readable in O(1) and removable in O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The numbers 1 3 5 sit in a max-heap called low and 8 15 sit in a min-heap called high; the median 5 is the top of low">
  <defs>
    <marker id="b20q2ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">low: smaller half</text>
  <text class="d-sub" x="175" y="50" text-anchor="middle">max-heap, top = largest</text>
  <rect class="d-box" x="40" y="70" width="270" height="70" rx="10"/>
  <text class="d-text" x="110" y="111" text-anchor="middle">1</text>
  <text class="d-text" x="170" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="222" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="254" y="111" text-anchor="middle">5</text>
  <text class="d-text" x="525" y="28" text-anchor="middle">high: larger half</text>
  <text class="d-sub" x="525" y="50" text-anchor="middle">min-heap, top = smallest</text>
  <rect class="d-box" x="390" y="70" width="270" height="70" rx="10"/>
  <rect class="d-box-accent" x="414" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="446" y="111" text-anchor="middle">8</text>
  <text class="d-text" x="540" y="111" text-anchor="middle">15</text>
  <path class="d-edge-accent" d="M 254 128 L 300 196" marker-end="url(#b20q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 446 128 L 400 196" marker-end="url(#b20q2ja-a1)"/>
  <rect class="d-box-muted" x="250" y="200" width="200" height="40" rx="8"/>
  <text class="d-text" x="350" y="226" text-anchor="middle">median = 5 (odd count)</text>
</svg>

The two tops are the two numbers closest to the middle. With an odd count, \`low\` holds the extra number and its top is the median; with an even count, the median is the average of both tops.

Two rules, kept true after every add, make this work. Together they are the **invariant**; the full argument for why they are enough, and why at most one move is ever needed, is on its own page: [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

1. **Order rule:** every number in \`low\` is ≤ every number in \`high\`.
2. **Size rule:** \`len(low) == len(high)\` or \`len(low) == len(high) + 1\`.

📌 **Interview term: Invariant** — a condition that is true before and after every operation. You prove the algorithm correct by showing each operation preserves it.

Each add is three small steps:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Adding a number: route it by comparing with the top of low, rebalance by moving at most one top, then read the median from the tops">
  <defs>
    <marker id="b20q2ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="92" text-anchor="middle">1. route x</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">x at most top(low): low</text>
  <path class="d-edge" d="M 212 100 L 262 100" marker-end="url(#b20q2ja-a2)"/>
  <rect class="d-box" x="266" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="361" y="92" text-anchor="middle">2. rebalance</text>
  <text class="d-sub" x="361" y="116" text-anchor="middle">move one top if needed</text>
  <path class="d-edge" d="M 458 100 L 508 100" marker-end="url(#b20q2ja-a2)"/>
  <rect class="d-box-accent" x="512" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="607" y="92" text-anchor="middle">3. read tops</text>
  <text class="d-sub" x="607" y="116" text-anchor="middle">O(1) median</text>
  <text class="d-sub" x="237" y="170" text-anchor="middle">O(log n)</text>
  <text class="d-sub" x="483" y="170" text-anchor="middle">O(log n)</text>
</svg>

Route the number by comparing it with the top of \`low\`, fix the sizes by moving at most one top across, and read the answer from the tops. Each heap push or pop is O(log n), so an add is O(log n) and a median query is O(1).

Here is the stream \`5, 15, 1, 3, 8\` step by step:

| Add | Goes to | Rebalance | low (max-heap) | high (min-heap) | Median |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | low (it is empty) | — | [5] | [] | 5.0 |
| 15 | high (15 > 5) | — | [5] | [15] | 10.0 |
| 1 | low (1 ≤ 5) | — | [1, 5] | [15] | 5.0 |
| 3 | low (3 ≤ 5) | low too big: 5 → high | [1, 3] | [5, 15] | 4.0 |
| 8 | high (8 > 3) | high too big: 5 → low | [1, 3, 5] | [8, 15] | 5.0 |

## 5. The Code in JavaScript

JavaScript has no heap in the language or standard library, so we write one small class and parameterise it with a \`before(x, y)\` function: \`(x, y) => x > y\` gives a max-heap and \`(x, y) => x < y\` a min-heap. (A detailed walk-through of a binary heap is in [priority queue with a binary heap](/interview-question/priority-queue-binary-heap).)

~~~javascript
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}
~~~

With that, the median finder is short:

~~~javascript
class MedianFinder {
  constructor() {
    this.low = new Heap((x, y) => x > y);  // max-heap: the smaller half
    this.high = new Heap((x, y) => x < y); // min-heap: the larger half
  }
  addNum(x) {
    if (this.low.size === 0 || x <= this.low.peek()) this.low.push(x);
    else this.high.push(x);
    // rebalance so that low.size === high.size or low.size === high.size + 1
    if (this.low.size > this.high.size + 1) this.high.push(this.low.pop());
    else if (this.high.size > this.low.size) this.low.push(this.high.pop());
  }
  findMedian() {
    if (this.low.size > this.high.size) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}
~~~

**What to point out in this code:**

- One \`Heap\` class serves both halves: the comparator is the only difference. That is cleaner than the Python-style negation trick, and it also works for non-numbers.
- \`peek()\` on an empty heap returns \`undefined\`, and \`x <= undefined\` is \`false\`, so the routing test checks \`this.low.size === 0\` first instead of relying on the comparison.
- \`(this.low.peek() + this.high.peek()) / 2\` is ordinary floating-point division. JavaScript numbers are 64-bit doubles: the sum of two 32-bit integers is exact, and integers stay exact up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1).
- \`toFixed(1)\` is used only for printing. It returns a string, so keep the number for arithmetic and format at the end.
- The sorted-array alternative uses a binary search plus \`splice(pos, 0, x)\`, which shifts every later element: O(n) per insert.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the median after every add, on three streams** prints:

~~~text
stream  [5, 15, 1, 3, 8, 7, 9, 10, 20, 2]
medians [5.0, 10.0, 5.0, 4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 7.5]
stream  [-1, -2, -3, -4]
medians [-1.0, -1.5, -2.0, -2.5]
stream  [2, 2, 2, 2]
medians [2.0, 2.0, 2.0, 2.0]
~~~

The first stream matches the table in section 4 for its first five numbers.

**Example 2 — sort every time vs sorted insert vs two heaps vs counting buckets, on a 3,000-number stream.** Medians are kept as *twice the median* (an integer) so the comparison is exact; the "checksum" is the sum of those integers over all 3,000 adds. It prints:

~~~text
stream of 3000 numbers in 0..100
sort every time: last median 49.0, checksum 291958
sorted insert:   last median 49.0, checksum 291958, elements shifted 2222515
two heaps:       last median 49.0, checksum 291958, final sizes 1500 and 1500
all three agree after every add: true
101 buckets:     last median 49.0, agrees: true
~~~

All approaches agree after every single add. The sorted insert shifted over two million elements to get there, and the heaps ended with exactly 1,500 numbers each.

## 7. Scaling Up

At 3,000 numbers all three approaches are instant. The difference appears at scale. On our sandbox (Node.js 22), with random numbers:

| Stream length | sorted array + \`splice\` | two heaps |
| :--- | :--- | :--- |
| 100,000 | 0.44 s | 0.05 s |
| 300,000 | 4.02 s | 0.16 s |

Tripling the stream made the sorted array about 9× slower, which is what O(n²) total work looks like, while the heaps grew roughly in proportion.

## 8. Why Two Heaps Beat a Sorted List

A sorted list keeps *all* n numbers in order, and paying for that order is what costs O(n) per insert. Two heaps keep almost no order: only "everything on the left is smaller than everything on the right", plus a cheap way to reach the largest left number and the smallest right number. That is the least structure that still answers the question, and it is why each add drops to O(log n). The same idea, "keep only the order you need", is behind using a heap for the [Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

## 9. A Second Look at the Invariant

After every add, check two things: the top of \`low\` is ≤ the top of \`high\`, and the sizes are equal or \`low\` has one more. Because both heaps are valid heaps, checking the tops is enough to know every element of \`low\` is ≤ every element of \`high\`. Why routing by the top of \`low\` plus a single move always restores both rules is proved step by step on [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

## 10. The Classic Follow-Ups

**"All numbers are between 0 and 100."** Then a heap is overkill. Keep an array of 101 counters; an add is \`counts[x] += 1\` (O(1)), and the median is found by walking the counters until you pass the middle position (at most 101 steps, a constant). Example 2 does exactly this on the 3,000-number stream and gets the same final median, 49.0.

📌 **Interview term: Counting buckets (counting sort idea)** — when values come from a small known range, count how many times each value appears instead of storing the values. Space is the size of the range, not the size of the stream.

**"99% of numbers are between 0 and 100."** Keep the 101 buckets for the common case, plus two plain counters (or two small heaps) for values below 0 and above 100. The median almost always lands inside the buckets; when it does not, the small heaps answer it.

**"Numbers can also be removed"** or **"only the last k numbers count."** Heaps cannot delete an arbitrary element cheaply, so you add lazy deletion or switch to a balanced tree. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

**"Any percentile, not just the median."** The same trick works for the 90th percentile: keep \`low\` at 90% of the items and \`high\` at 10% by changing the size rule. For many different percentiles at huge scale, real systems use approximate quantile sketches that keep a fixed-size summary instead of every number.

**"The data is not a stream: two sorted arrays."** That is a different problem with a binary-search solution: [median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work).

## 11. Complexity

| Approach | Add | Median | Space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Sort on every query | O(1) | O(n log n) | O(n) | re-sorts everything each time |
| Sorted insert | O(n) | O(1) | O(n) | binary search is O(log n), but the shift is O(n) |
| Two heaps | O(log n) | O(1) | O(n) | at most three heap operations per add; the tops are the answer |
| Counting buckets (values in 0..R) | O(1) | O(R) | O(R) | one counter per possible value |
| Balanced BST / order-statistic tree | O(log n) | O(log n) | O(n) | also supports deletion |

## 12. Edge Cases

- **The first number.** \`low\` is empty, so the routing test must check for emptiness before peeking (\`not low\`, \`size === 0\`, \`isEmpty()\`, \`empty()\`).
- **Even count.** The median is the average of the two tops, so the result is a floating-point number: 10.0 after \`5, 15\`, 7.5 after ten numbers in example 1.
- **All numbers equal** (\`2, 2, 2, 2\`). The routing test uses ≤, so equal numbers go to \`low\` and the size rule moves one across; the median stays 2.0.
- **Negative numbers** (\`-1, -2, -3, -4\`). Nothing special for the algorithm, but in Python the negation trick turns them into positive keys; the code must negate back exactly once.
- **Median requested before any add.** Undefined; decide with the interviewer whether to throw an error or return a sentinel.
- **Huge values.** Two values near 2^31 overflow a 32-bit sum in Java and C++; widen before adding.

## Common Pitfalls

- **Sorting without a comparator.** \`seen.slice().sort()\` compares strings, so 100 sorts before 9. Always pass \`(a, b) => a - b\`.
- **Peeking at an empty heap.** \`undefined\` silently fails comparisons instead of throwing; check the size first.
- **Assuming \`splice\` insertion is cheap.** It is O(n) per call: 2,222,515 element shifts for 3,000 numbers in example 2.
- **Using \`Math.floor\` on the average.** \`Math.floor((3 + 4) / 2)\` is 3, not 3.5; keep the true average unless the interviewer asked for the lower median.
- **Rounding with \`toFixed\` and then computing.** \`toFixed\` returns a string, and \`'3.5' + 1\` is \`'3.51'\`. Format only for display.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two halves:</strong> <span style="color:#f0e2c8;">A max-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> for the smaller half and a min-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> for the larger half; the median is at the tops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. JavaScript heap:</strong> <span style="color:#f0e2c8;">No built-in heap, so one small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap</code> class with a comparator: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x, y) =&gt; x &gt; y</code> for low, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt; y</code> for high.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Add:</strong> <span style="color:#f0e2c8;">Route by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code>, then move at most one top so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.size</code> equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.size</code> or is one more. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Median:</strong> <span style="color:#f0e2c8;">Odd count: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code>. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(low.peek() + high.peek()) / 2</code>. O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not simpler:</strong> <span style="color:#f0e2c8;">Sorting per query is O(n log n); a sorted array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> is O(n) per add. At 300,000 numbers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> took 4 s vs 0.16 s for heaps.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every number is between 0 and 100?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(101).fill(0)</code> as counters: add is O(1), median is a walk over at most 101 buckets. Example 2 checks it against the heaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not count values in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> iterates in insertion order, not sorted order, so finding the middle would mean sorting its keys on every query. It only helps in the small-range case, and there a plain array of counters is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you lose precision when averaging?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for integers that fit in 32 bits: their sum fits easily in a double. Precision only becomes an issue past 2^53.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support removing a number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lazy deletion: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of pending removals, discarded when they reach a heap top. That is the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about any percentile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same structure with a different size rule: for p90 keep 90% of the items in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | The middle value of the sorted data; the average of the two middles for an even count |
| **Online algorithm** | Processes input as it arrives and can answer at any time |
| **Max-heap / min-heap** | A heap whose top is the largest / smallest element |
| **Invariant** | A condition that holds before and after every operation |
| **Counting buckets (counting sort idea)** | Count occurrences of each value when the value range is small |
| **Comparator function** | A (x, y) function that defines the heap order; it turns one heap class into a min- or max-heap |

---
**Conclusion:** A running median needs only the middle of the data, so two heaps that each hold half of it are enough. In JavaScript you write one small heap class and give it two comparators, one for the lower half (max-heap) and one for the upper half (min-heap). Each add routes one number and moves at most one top, O(log n); the median is read from the tops in O(1). Mention counting buckets for small ranges, and avoid the JavaScript traps: comparator-less \`sort\`, \`undefined\` from an empty heap, and formatting with \`toFixed\` too early.`,
        examples: [
          {
            label: `MedianFinder: the median after every add (3 streams)`,
            code: `// JavaScript has no built-in heap: a small binary heap ordered by a "before" function.
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

class MedianFinder {
  constructor() {
    this.low = new Heap((x, y) => x > y);  // max-heap: the smaller half
    this.high = new Heap((x, y) => x < y); // min-heap: the larger half
  }
  addNum(x) {
    if (this.low.size === 0 || x <= this.low.peek()) this.low.push(x);
    else this.high.push(x);
    // rebalance so that low.size === high.size or low.size === high.size + 1
    if (this.low.size > this.high.size + 1) this.high.push(this.low.pop());
    else if (this.high.size > this.low.size) this.low.push(this.high.pop());
  }
  findMedian() {
    if (this.low.size > this.high.size) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}

for (const stream of [[5, 15, 1, 3, 8, 7, 9, 10, 20, 2], [-1, -2, -3, -4], [2, 2, 2, 2]]) {
  const mf = new MedianFinder();
  const medians = [];
  for (const x of stream) {
    mf.addNum(x);
    medians.push(mf.findMedian().toFixed(1));
  }
  console.log('stream  [' + stream.join(', ') + ']');
  console.log('medians [' + medians.join(', ') + ']');
}`,
          },
          {
            label: `Sort every time vs sorted insert vs two heaps vs buckets`,
            code: `// Three ways to answer "median so far" after every number of a 3000-number stream.
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

function stream(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // MINSTD, same numbers in every language
    out.push(seed % 101);               // values 0..100, so the bucket follow-up applies
  }
  return out;
}

const nums = stream(3000, 11);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// 1. Sort everything again after each add: O(n log n) per add.
const sortedAnswers = [], seen = [];
for (const x of nums) {
  seen.push(x);
  const s = seen.slice().sort((a, b) => a - b); // numeric comparator: the default sorts as strings
  const n = s.length;
  sortedAnswers.push(s[n >> 1] + s[(n - 1) >> 1]); // twice the median, kept as an integer
}

// 2. Keep one sorted array and insert in place: O(log n) search + O(n) shift.
const insertAnswers = [], win = [];
let shifted = 0;
for (const x of nums) {
  let lo = 0, hi = win.length;           // binary search for the first element > x
  while (lo < hi) { const mid = (lo + hi) >> 1; if (win[mid] <= x) lo = mid + 1; else hi = mid; }
  shifted += win.length - lo;            // elements that move one slot right
  win.splice(lo, 0, x);
  const n = win.length;
  insertAnswers.push(win[n >> 1] + win[(n - 1) >> 1]);
}

// 3. Two heaps: O(log n) per add, O(1) per median.
const low = new Heap((a, b) => a > b), high = new Heap((a, b) => a < b), heapAnswers = [];
for (const x of nums) {
  if (low.size === 0 || x <= low.peek()) low.push(x); else high.push(x);
  if (low.size > high.size + 1) high.push(low.pop());
  else if (high.size > low.size) low.push(high.pop());
  heapAnswers.push(low.size > high.size ? low.peek() * 2 : low.peek() + high.peek());
}

// 4. Follow-up: every value is in 0..100, so count them in 101 buckets.
const counts = new Array(101).fill(0);
for (const x of nums) counts[x]++;
function kth(k) { // k-th smallest (0-based) by walking the buckets
  for (let v = 0; v <= 100; v++) { if (k < counts[v]) return v; k -= counts[v]; }
}
const n = nums.length;
const bucketTwice = kth(n >> 1) + kth((n - 1) >> 1);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

console.log('stream of ' + n + ' numbers in 0..100');
console.log('sort every time: last median ' + (sortedAnswers[n - 1] / 2).toFixed(1) + ', checksum ' + sum(sortedAnswers));
console.log('sorted insert:   last median ' + (insertAnswers[n - 1] / 2).toFixed(1) + ', checksum ' + sum(insertAnswers) + ', elements shifted ' + shifted);
console.log('two heaps:       last median ' + (heapAnswers[n - 1] / 2).toFixed(1) + ', checksum ' + sum(heapAnswers) + ', final sizes ' + low.size + ' and ' + high.size);
console.log('all three agree after every add: ' + (same(sortedAnswers, insertAnswers) && same(insertAnswers, heapAnswers)));
console.log('101 buckets:     last median ' + (bucketTwice / 2).toFixed(1) + ', agrees: ' + (bucketTwice === heapAnswers[n - 1]));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Numbers arrive one at a time. Design a Java class with \`void addNum(int x)\` and \`double findMedian()\`, returning the median of everything added so far. Both are called many times, so tell me the cost of each."

**What a strong answer should cover:**
- Why sorting on every query (O(n log n)) and a sorted \`ArrayList\` (O(n) per insert) are too slow for long streams.
- Two heaps: a max-heap for the lower half and a min-heap for the upper half; O(log n) add, O(1) median.
- The invariant: lower half ≤ upper half, and the sizes differ by at most one.
- Java details: \`PriorityQueue\` is a min-heap, so the lower half uses \`Collections.reverseOrder()\`; never \`(a, b) -> b - a\`; widen to \`long\` before adding two \`int\`s; \`peek()\` returns an \`Integer\` that can be \`null\`.
- Follow-ups: values in a small range (counting buckets), removals (sliding window), percentiles.

**Clarifying questions expected:**
- For an even count, average the two middle values or return the lower one?
- Can values be anywhere in the \`int\` range?

**Code / implementation expected:** Yes — a \`MedianFinder\` class with two \`PriorityQueue<Integer>\`s, in Java.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and basic classes in Java; heaps are explained as we go.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A radio quiz show reads out contestants' scores one at a time, and after every score the host asks the studio: "What is the middle score so far?" Nobody writes the scores down in order. If you kept every score on a scrap of paper and re-sorted the pile each time, you would be shuffling papers longer and longer as the night goes on.

A smarter assistant keeps **two piles**. The left pile holds the lower half of the scores and keeps its *highest* paper on top. The right pile holds the upper half and keeps its *lowest* paper on top. The middle score is always sitting on top of one pile (or halfway between the two tops). Each new score goes on one pile, and at most one paper moves across to keep the piles the same height.

That is the whole algorithm. The two piles are two [heaps](/interview-question/what-is-a-heap-priority-queue), and the reason interviewers love this question is that it rewards picking the right data structure over writing clever code. The same pattern shows up in latency dashboards ("p50 response time so far"), trading systems and sensor monitoring.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How often is the median asked for, compared with adds? | If the median is asked once at the end, just sort once. Two heaps pay off when you query after many adds. |
| What is the range of values? | If every value is in a small range (say 0 to 100), counting buckets beat heaps (section 10). |
| Can numbers be removed, or only added? | Removal needs lazy deletion or a balanced tree; that is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). |
| For an even count, return the average of the two middles, or the lower one? | Changes the return type (float vs int) and the formula. The classic version averages. |
| How large can values get? | Adding two 32-bit ints can overflow in Java and C++ before you divide. |
| Does it have to be exact? | At very large scale, approximate quantile sketches use a fixed amount of memory. |

## 3. What Exactly Are We Computing?

The **median** is the middle value after sorting. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. For \`[1, 3, 5, 8, 15]\` it is 5; for \`[1, 3, 5, 8]\` it is (3 + 5) / 2 = 4.

📌 **Interview term: Median** — the middle value of the sorted data (the average of the two middle values when the count is even). Unlike the mean, one huge outlier barely moves it.

📌 **Interview term: Online algorithm** — an algorithm that processes input piece by piece as it arrives and can answer at any time, without seeing the future. "Median from a data stream" asks for an online algorithm.

The hard part is not the definition but the cost. The stream can be millions of numbers long, and the question asks for the median *after every add*, so whatever we do per add is multiplied by n.

## 4. From Brute Force to Two Heaps

**Attempt 1 — sort every time.** Keep a list; on every query, sort it and take the middle. That costs O(n log n) per query, O(n² log n) for n queries.

**Attempt 2 — keep the list sorted.** Use [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) to find where the new number goes and insert it there. Finding the spot is O(log n), but inserting into an array shifts every later element: O(n) per add. The median is then an O(1) lookup. Over 3,000 numbers, example 2 counts **2,222,515** element shifts.

**Attempt 3 — two heaps.** We never need the whole order, only the one or two numbers in the middle. So split the numbers into a lower half and an upper half:

- \`low\` is a **max-heap** of the smaller half: its top is the largest of the small numbers.
- \`high\` is a **min-heap** of the larger half: its top is the smallest of the large numbers.

📌 **Interview term: Max-heap / min-heap** — a heap whose top is the largest (max-heap) or smallest (min-heap) element, readable in O(1) and removable in O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The numbers 1 3 5 sit in a max-heap called low and 8 15 sit in a min-heap called high; the median 5 is the top of low">
  <defs>
    <marker id="b20q2ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">low: smaller half</text>
  <text class="d-sub" x="175" y="50" text-anchor="middle">max-heap, top = largest</text>
  <rect class="d-box" x="40" y="70" width="270" height="70" rx="10"/>
  <text class="d-text" x="110" y="111" text-anchor="middle">1</text>
  <text class="d-text" x="170" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="222" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="254" y="111" text-anchor="middle">5</text>
  <text class="d-text" x="525" y="28" text-anchor="middle">high: larger half</text>
  <text class="d-sub" x="525" y="50" text-anchor="middle">min-heap, top = smallest</text>
  <rect class="d-box" x="390" y="70" width="270" height="70" rx="10"/>
  <rect class="d-box-accent" x="414" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="446" y="111" text-anchor="middle">8</text>
  <text class="d-text" x="540" y="111" text-anchor="middle">15</text>
  <path class="d-edge-accent" d="M 254 128 L 300 196" marker-end="url(#b20q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 446 128 L 400 196" marker-end="url(#b20q2ja-a1)"/>
  <rect class="d-box-muted" x="250" y="200" width="200" height="40" rx="8"/>
  <text class="d-text" x="350" y="226" text-anchor="middle">median = 5 (odd count)</text>
</svg>

The two tops are the two numbers closest to the middle. With an odd count, \`low\` holds the extra number and its top is the median; with an even count, the median is the average of both tops.

Two rules, kept true after every add, make this work. Together they are the **invariant**; the full argument for why they are enough, and why at most one move is ever needed, is on its own page: [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

1. **Order rule:** every number in \`low\` is ≤ every number in \`high\`.
2. **Size rule:** \`len(low) == len(high)\` or \`len(low) == len(high) + 1\`.

📌 **Interview term: Invariant** — a condition that is true before and after every operation. You prove the algorithm correct by showing each operation preserves it.

Each add is three small steps:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Adding a number: route it by comparing with the top of low, rebalance by moving at most one top, then read the median from the tops">
  <defs>
    <marker id="b20q2ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="92" text-anchor="middle">1. route x</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">x at most top(low): low</text>
  <path class="d-edge" d="M 212 100 L 262 100" marker-end="url(#b20q2ja-a2)"/>
  <rect class="d-box" x="266" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="361" y="92" text-anchor="middle">2. rebalance</text>
  <text class="d-sub" x="361" y="116" text-anchor="middle">move one top if needed</text>
  <path class="d-edge" d="M 458 100 L 508 100" marker-end="url(#b20q2ja-a2)"/>
  <rect class="d-box-accent" x="512" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="607" y="92" text-anchor="middle">3. read tops</text>
  <text class="d-sub" x="607" y="116" text-anchor="middle">O(1) median</text>
  <text class="d-sub" x="237" y="170" text-anchor="middle">O(log n)</text>
  <text class="d-sub" x="483" y="170" text-anchor="middle">O(log n)</text>
</svg>

Route the number by comparing it with the top of \`low\`, fix the sizes by moving at most one top across, and read the answer from the tops. Each heap push or pop is O(log n), so an add is O(log n) and a median query is O(1).

Here is the stream \`5, 15, 1, 3, 8\` step by step:

| Add | Goes to | Rebalance | low (max-heap) | high (min-heap) | Median |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | low (it is empty) | — | [5] | [] | 5.0 |
| 15 | high (15 > 5) | — | [5] | [15] | 10.0 |
| 1 | low (1 ≤ 5) | — | [1, 5] | [15] | 5.0 |
| 3 | low (3 ≤ 5) | low too big: 5 → high | [1, 3] | [5, 15] | 4.0 |
| 8 | high (8 > 3) | high too big: 5 → low | [1, 3, 5] | [8, 15] | 5.0 |

## 5. The Code in Java

\`java.util.PriorityQueue\` is a binary min-heap. For the lower half we need a max-heap, so we pass \`Collections.reverseOrder()\` as the comparator.

~~~java
static class MedianFinder {
    // low: max-heap of the smaller half; high: min-heap of the larger half
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    void addNum(int x) {
        if (low.isEmpty() || x <= low.peek()) low.offer(x);
        else high.offer(x);
        // rebalance so that low.size() == high.size() or low.size() == high.size() + 1
        if (low.size() > high.size() + 1) high.offer(low.poll());
        else if (high.size() > low.size()) low.offer(high.poll());
    }

    double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return ((long) low.peek() + high.peek()) / 2.0;  // long: two ints can overflow
    }
}
~~~

**What to point out in this code:**

- \`Collections.reverseOrder()\` is the safe way to get a max-heap of \`Integer\`. The popular lambda \`(a, b) -> b - a\` overflows: with \`Integer.MIN_VALUE\` in the heap, the subtraction wraps around and the heap order breaks silently (we show the run on the [invariant page](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing)).
- \`((long) low.peek() + high.peek()) / 2.0\` widens to \`long\` **before** adding. \`low.peek() + high.peek()\` with two values near \`Integer.MAX_VALUE\` overflows to a negative \`int\`; dividing by \`2.0\` afterwards is too late.
- \`peek()\` returns \`Integer\`, which auto-unboxes in \`x <= low.peek()\`. On an empty queue \`peek()\` returns \`null\`, and unboxing \`null\` throws \`NullPointerException\`, so the code checks \`low.isEmpty()\` first.
- \`offer\`/\`poll\` are O(log n) and \`peek\` is O(1), as the \`PriorityQueue\` Javadoc's implementation note states ([JDK 21 PriorityQueue docs](https://cs-214.epfl.ch/jdk-21.0.9-docs/api/java.base/java/util/PriorityQueue.html)).
- \`String.format("%.1f", median)\` prints \`7.5\`; plain string concatenation of a \`double\` would print \`7.5\` too, but switches to scientific notation such as \`2.147483647E9\` for large values.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK (javac + java)). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the median after every add, on three streams** prints:

~~~text
stream  [5, 15, 1, 3, 8, 7, 9, 10, 20, 2]
medians [5.0, 10.0, 5.0, 4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 7.5]
stream  [-1, -2, -3, -4]
medians [-1.0, -1.5, -2.0, -2.5]
stream  [2, 2, 2, 2]
medians [2.0, 2.0, 2.0, 2.0]
~~~

The first stream matches the table in section 4 for its first five numbers.

**Example 2 — sort every time vs sorted insert vs two heaps vs counting buckets, on a 3,000-number stream.** Medians are kept as *twice the median* (an integer) so the comparison is exact; the "checksum" is the sum of those integers over all 3,000 adds. It prints:

~~~text
stream of 3000 numbers in 0..100
sort every time: last median 49.0, checksum 291958
sorted insert:   last median 49.0, checksum 291958, elements shifted 2222515
two heaps:       last median 49.0, checksum 291958, final sizes 1500 and 1500
all three agree after every add: true
101 buckets:     last median 49.0, agrees: true
~~~

All approaches agree after every single add. The sorted insert shifted over two million elements to get there, and the heaps ended with exactly 1,500 numbers each.

## 7. Scaling Up

At 3,000 numbers all three approaches are instant. The difference appears at scale. On our sandbox (OpenJDK), with random \`int\`s:

| Stream length | sorted \`ArrayList\` + \`add(index, x)\` | two \`PriorityQueue\`s |
| :--- | :--- | :--- |
| 100,000 | 0.22 s | 0.03 s |
| 300,000 | 1.96 s | 0.04 s |

Tripling the stream made the sorted list about 9× slower (its total work is O(n²)), while the heaps barely moved. \`ArrayList.add(index, x)\` shifts with a fast native array copy, which hides the cost at small sizes, but not at large ones.

## 8. Why Two Heaps Beat a Sorted List

A sorted list keeps *all* n numbers in order, and paying for that order is what costs O(n) per insert. Two heaps keep almost no order: only "everything on the left is smaller than everything on the right", plus a cheap way to reach the largest left number and the smallest right number. That is the least structure that still answers the question, and it is why each add drops to O(log n). The same idea, "keep only the order you need", is behind using a heap for the [Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

## 9. A Second Look at the Invariant

After every add, check two things: the top of \`low\` is ≤ the top of \`high\`, and the sizes are equal or \`low\` has one more. Because both heaps are valid heaps, checking the tops is enough to know every element of \`low\` is ≤ every element of \`high\`. Why routing by the top of \`low\` plus a single move always restores both rules is proved step by step on [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

## 10. The Classic Follow-Ups

**"All numbers are between 0 and 100."** Then a heap is overkill. Keep an array of 101 counters; an add is \`counts[x] += 1\` (O(1)), and the median is found by walking the counters until you pass the middle position (at most 101 steps, a constant). Example 2 does exactly this on the 3,000-number stream and gets the same final median, 49.0.

📌 **Interview term: Counting buckets (counting sort idea)** — when values come from a small known range, count how many times each value appears instead of storing the values. Space is the size of the range, not the size of the stream.

**"99% of numbers are between 0 and 100."** Keep the 101 buckets for the common case, plus two plain counters (or two small heaps) for values below 0 and above 100. The median almost always lands inside the buckets; when it does not, the small heaps answer it.

**"Numbers can also be removed"** or **"only the last k numbers count."** Heaps cannot delete an arbitrary element cheaply, so you add lazy deletion or switch to a balanced tree. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

**"Any percentile, not just the median."** The same trick works for the 90th percentile: keep \`low\` at 90% of the items and \`high\` at 10% by changing the size rule. For many different percentiles at huge scale, real systems use approximate quantile sketches that keep a fixed-size summary instead of every number.

**"The data is not a stream: two sorted arrays."** That is a different problem with a binary-search solution: [median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work).

## 11. Complexity

| Approach | Add | Median | Space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Sort on every query | O(1) | O(n log n) | O(n) | re-sorts everything each time |
| Sorted insert | O(n) | O(1) | O(n) | binary search is O(log n), but the shift is O(n) |
| Two heaps | O(log n) | O(1) | O(n) | at most three heap operations per add; the tops are the answer |
| Counting buckets (values in 0..R) | O(1) | O(R) | O(R) | one counter per possible value |
| Balanced BST / order-statistic tree | O(log n) | O(log n) | O(n) | also supports deletion |

## 12. Edge Cases

- **The first number.** \`low\` is empty, so the routing test must check for emptiness before peeking (\`not low\`, \`size === 0\`, \`isEmpty()\`, \`empty()\`).
- **Even count.** The median is the average of the two tops, so the result is a floating-point number: 10.0 after \`5, 15\`, 7.5 after ten numbers in example 1.
- **All numbers equal** (\`2, 2, 2, 2\`). The routing test uses ≤, so equal numbers go to \`low\` and the size rule moves one across; the median stays 2.0.
- **Negative numbers** (\`-1, -2, -3, -4\`). Nothing special for the algorithm, but in Python the negation trick turns them into positive keys; the code must negate back exactly once.
- **Median requested before any add.** Undefined; decide with the interviewer whether to throw an error or return a sentinel.
- **Huge values.** Two values near 2^31 overflow a 32-bit sum in Java and C++; widen before adding.

## Common Pitfalls

- **\`(a, b) -> b - a\` as the max-heap comparator.** Overflows for extreme values and corrupts the heap order without an exception. Use \`Collections.reverseOrder()\` or \`(a, b) -> Integer.compare(b, a)\`.
- **Adding two \`int\` tops before widening.** \`(low.peek() + high.peek()) / 2.0\` gives -1.0 for two copies of \`Integer.MAX_VALUE\`. Cast one side to \`long\` first.
- **Unboxing a \`null\` peek.** \`x <= low.peek()\` on an empty queue throws \`NullPointerException\`; check \`isEmpty()\` first.
- **Comparing tops with \`==\`.** \`low.peek() == high.peek()\` compares \`Integer\` references and fails above 127; use \`equals\` or unbox to \`int\`.
- **Assuming \`ArrayList.add(index, x)\` is cheap.** It shifts every later element: 2,222,515 shifts for 3,000 numbers in example 2.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two halves:</strong> <span style="color:#f0e2c8;">A max-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> for the smaller half and a min-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> for the larger half; the median is at the tops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Java heaps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new PriorityQueue&lt;&gt;(Collections.reverseOrder())</code> for low and a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> for high. Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) -&gt; b - a</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Add:</strong> <span style="color:#f0e2c8;">Route by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code>, then move at most one top so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.size()</code> equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.size()</code> or is one more. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Median:</strong> <span style="color:#f0e2c8;">Odd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code>. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((long) low.peek() + high.peek()) / 2.0</code>; widen before adding. O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not simpler:</strong> <span style="color:#f0e2c8;">Sorting per query is O(n log n); a sorted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> is O(n) per add. At 300,000 numbers it took 1.96 s vs 0.04 s for heaps.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every number is between 0 and 100?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[101]</code> of counters: add is O(1), median is a walk over at most 101 buckets. Example 2 checks it against the heaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap&lt;Integer, Integer&gt;</code> of value counts supports add and remove in O(log n), but finding the middle needs either a walk or a tracked pointer that moves with each change. Two heaps are simpler when you only add.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your class thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> is not synchronized; wrap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addNum</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findMedian</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronized</code> or a lock, since an add touches both heaps and must look atomic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support removals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue.remove(Object)</code> works but is O(n). For many removals use lazy deletion with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> of pending removals; that is the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about any percentile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same two heaps with a different size rule: keep 90% of the items in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> for p90.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | The middle value of the sorted data; the average of the two middles for an even count |
| **Online algorithm** | Processes input as it arrives and can answer at any time |
| **Max-heap / min-heap** | A heap whose top is the largest / smallest element |
| **Invariant** | A condition that holds before and after every operation |
| **Counting buckets (counting sort idea)** | Count occurrences of each value when the value range is small |
| **Autoboxing** | Java wrapping int in Integer so collections can hold it; unboxing null throws |

---
**Conclusion:** A running median needs only the middle of the data, so two heaps that each hold half of it are enough: a \`PriorityQueue\` with \`Collections.reverseOrder()\` for the lower half and a plain \`PriorityQueue\` for the upper half. Each add routes one number and moves at most one top, O(log n); the median is read from the tops in O(1). The Java details that cost marks are the overflowing \`b - a\` comparator, adding two \`int\`s before widening to \`long\`, and unboxing a \`null\` from an empty queue.`,
        examples: [
          {
            label: `MedianFinder: the median after every add (3 streams)`,
            code: `import java.util.*;

public class Main {
    static class MedianFinder {
        // low: max-heap of the smaller half; high: min-heap of the larger half
        private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
        private final PriorityQueue<Integer> high = new PriorityQueue<>();

        void addNum(int x) {
            if (low.isEmpty() || x <= low.peek()) low.offer(x);
            else high.offer(x);
            // rebalance so that low.size() == high.size() or low.size() == high.size() + 1
            if (low.size() > high.size() + 1) high.offer(low.poll());
            else if (high.size() > low.size()) low.offer(high.poll());
        }

        double findMedian() {
            if (low.size() > high.size()) return low.peek();
            return ((long) low.peek() + high.peek()) / 2.0;  // long: two ints can overflow
        }
    }

    public static void main(String[] args) {
        int[][] streams = {{5, 15, 1, 3, 8, 7, 9, 10, 20, 2}, {-1, -2, -3, -4}, {2, 2, 2, 2}};
        for (int[] stream : streams) {
            MedianFinder mf = new MedianFinder();
            StringJoiner medians = new StringJoiner(", ", "[", "]");
            StringJoiner in = new StringJoiner(", ", "[", "]");
            for (int x : stream) {
                mf.addNum(x);
                medians.add(String.format("%.1f", mf.findMedian()));
                in.add(String.valueOf(x));
            }
            System.out.println("stream  " + in);
            System.out.println("medians " + medians);
        }
    }
}`,
          },
          {
            label: `Sort every time vs sorted insert vs two heaps vs buckets`,
            code: `import java.util.*;

public class Main {
    // Three ways to answer "median so far" after every number of a 3000-number stream.
    static int[] stream(int n, long seed) {
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647; // MINSTD; long, because the product overflows int
            out[i] = (int) (seed % 101);      // values 0..100, so the bucket follow-up applies
        }
        return out;
    }

    static int[] counts = new int[101];

    static int kth(int k) { // k-th smallest (0-based) by walking the buckets
        for (int v = 0; v <= 100; v++) { if (k < counts[v]) return v; k -= counts[v]; }
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = stream(3000, 11);
        int n = nums.length;

        // 1. Sort everything again after each add: O(n log n) per add.
        long[] sortedAnswers = new long[n];
        int[] seen = new int[n];
        for (int i = 0; i < n; i++) {
            seen[i] = nums[i];
            int[] s = Arrays.copyOf(seen, i + 1);
            Arrays.sort(s);
            int m = s.length;
            sortedAnswers[i] = s[m / 2] + s[(m - 1) / 2]; // twice the median, kept as an integer
        }

        // 2. Keep one sorted ArrayList and insert in place: O(log n) search + O(n) shift.
        long[] insertAnswers = new long[n];
        List<Integer> win = new ArrayList<>();
        long shifted = 0;
        for (int i = 0; i < n; i++) {
            int x = nums[i], lo = 0, hi = win.size(); // binary search for the first element > x
            while (lo < hi) { int mid = (lo + hi) >>> 1; if (win.get(mid) <= x) lo = mid + 1; else hi = mid; }
            shifted += win.size() - lo;               // elements that move one slot right
            win.add(lo, x);
            int m = win.size();
            insertAnswers[i] = win.get(m / 2) + win.get((m - 1) / 2);
        }

        // 3. Two heaps: O(log n) per add, O(1) per median.
        PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
        PriorityQueue<Integer> high = new PriorityQueue<>();
        long[] heapAnswers = new long[n];
        for (int i = 0; i < n; i++) {
            int x = nums[i];
            if (low.isEmpty() || x <= low.peek()) low.offer(x); else high.offer(x);
            if (low.size() > high.size() + 1) high.offer(low.poll());
            else if (high.size() > low.size()) low.offer(high.poll());
            heapAnswers[i] = low.size() > high.size() ? 2L * low.peek() : (long) low.peek() + high.peek();
        }

        // 4. Follow-up: every value is in 0..100, so count them in 101 buckets.
        for (int x : nums) counts[x]++;
        long bucketTwice = kth(n / 2) + kth((n - 1) / 2);

        System.out.println("stream of " + n + " numbers in 0..100");
        System.out.println("sort every time: last median " + String.format("%.1f", sortedAnswers[n - 1] / 2.0) + ", checksum " + Arrays.stream(sortedAnswers).sum());
        System.out.println("sorted insert:   last median " + String.format("%.1f", insertAnswers[n - 1] / 2.0) + ", checksum " + Arrays.stream(insertAnswers).sum() + ", elements shifted " + shifted);
        System.out.println("two heaps:       last median " + String.format("%.1f", heapAnswers[n - 1] / 2.0) + ", checksum " + Arrays.stream(heapAnswers).sum() + ", final sizes " + low.size() + " and " + high.size());
        System.out.println("all three agree after every add: " + (Arrays.equals(sortedAnswers, insertAnswers) && Arrays.equals(insertAnswers, heapAnswers)));
        System.out.println("101 buckets:     last median " + String.format("%.1f", bucketTwice / 2.0) + ", agrees: " + (bucketTwice == heapAnswers[n - 1]));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Numbers arrive one at a time. Design a C++ class with \`void addNum(int x)\` and \`double findMedian()\`, returning the median of everything added so far. Both are called many times, so tell me the cost of each."

**What a strong answer should cover:**
- Why sorting on every query (O(n log n)) and a sorted \`std::vector\` with \`insert\` (O(n) per insert) are too slow for long streams.
- Two heaps: a max-heap for the lower half and a min-heap for the upper half; O(log n) add, O(1) median.
- The invariant: lower half ≤ upper half, and the sizes differ by at most one.
- C++ details: \`std::priority_queue<int>\` is already a max-heap; the min-heap needs \`std::greater<int>\`; \`top()\` on an empty queue is undefined behaviour; widen to \`long long\` before adding two \`int\`s (signed overflow is undefined).
- Follow-ups: values in a small range (counting buckets), removals (\`std::multiset\`), percentiles.

**Clarifying questions expected:**
- For an even count, average the two middle values or return the lower one?
- Can values be anywhere in the \`int\` range?

**Code / implementation expected:** Yes — a \`MedianFinder\` class with two \`std::priority_queue\`s, in C++17.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and basic classes in C++; heaps are explained as we go.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A radio quiz show reads out contestants' scores one at a time, and after every score the host asks the studio: "What is the middle score so far?" Nobody writes the scores down in order. If you kept every score on a scrap of paper and re-sorted the pile each time, you would be shuffling papers longer and longer as the night goes on.

A smarter assistant keeps **two piles**. The left pile holds the lower half of the scores and keeps its *highest* paper on top. The right pile holds the upper half and keeps its *lowest* paper on top. The middle score is always sitting on top of one pile (or halfway between the two tops). Each new score goes on one pile, and at most one paper moves across to keep the piles the same height.

That is the whole algorithm. The two piles are two [heaps](/interview-question/what-is-a-heap-priority-queue), and the reason interviewers love this question is that it rewards picking the right data structure over writing clever code. The same pattern shows up in latency dashboards ("p50 response time so far"), trading systems and sensor monitoring.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How often is the median asked for, compared with adds? | If the median is asked once at the end, just sort once. Two heaps pay off when you query after many adds. |
| What is the range of values? | If every value is in a small range (say 0 to 100), counting buckets beat heaps (section 10). |
| Can numbers be removed, or only added? | Removal needs lazy deletion or a balanced tree; that is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). |
| For an even count, return the average of the two middles, or the lower one? | Changes the return type (float vs int) and the formula. The classic version averages. |
| How large can values get? | Adding two 32-bit ints can overflow in Java and C++ before you divide. |
| Does it have to be exact? | At very large scale, approximate quantile sketches use a fixed amount of memory. |

## 3. What Exactly Are We Computing?

The **median** is the middle value after sorting. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. For \`[1, 3, 5, 8, 15]\` it is 5; for \`[1, 3, 5, 8]\` it is (3 + 5) / 2 = 4.

📌 **Interview term: Median** — the middle value of the sorted data (the average of the two middle values when the count is even). Unlike the mean, one huge outlier barely moves it.

📌 **Interview term: Online algorithm** — an algorithm that processes input piece by piece as it arrives and can answer at any time, without seeing the future. "Median from a data stream" asks for an online algorithm.

The hard part is not the definition but the cost. The stream can be millions of numbers long, and the question asks for the median *after every add*, so whatever we do per add is multiplied by n.

## 4. From Brute Force to Two Heaps

**Attempt 1 — sort every time.** Keep a list; on every query, sort it and take the middle. That costs O(n log n) per query, O(n² log n) for n queries.

**Attempt 2 — keep the list sorted.** Use [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) to find where the new number goes and insert it there. Finding the spot is O(log n), but inserting into an array shifts every later element: O(n) per add. The median is then an O(1) lookup. Over 3,000 numbers, example 2 counts **2,222,515** element shifts.

**Attempt 3 — two heaps.** We never need the whole order, only the one or two numbers in the middle. So split the numbers into a lower half and an upper half:

- \`low\` is a **max-heap** of the smaller half: its top is the largest of the small numbers.
- \`high\` is a **min-heap** of the larger half: its top is the smallest of the large numbers.

📌 **Interview term: Max-heap / min-heap** — a heap whose top is the largest (max-heap) or smallest (min-heap) element, readable in O(1) and removable in O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The numbers 1 3 5 sit in a max-heap called low and 8 15 sit in a min-heap called high; the median 5 is the top of low">
  <defs>
    <marker id="b20q2cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">low: smaller half</text>
  <text class="d-sub" x="175" y="50" text-anchor="middle">max-heap, top = largest</text>
  <rect class="d-box" x="40" y="70" width="270" height="70" rx="10"/>
  <text class="d-text" x="110" y="111" text-anchor="middle">1</text>
  <text class="d-text" x="170" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="222" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="254" y="111" text-anchor="middle">5</text>
  <text class="d-text" x="525" y="28" text-anchor="middle">high: larger half</text>
  <text class="d-sub" x="525" y="50" text-anchor="middle">min-heap, top = smallest</text>
  <rect class="d-box" x="390" y="70" width="270" height="70" rx="10"/>
  <rect class="d-box-accent" x="414" y="84" width="64" height="42" rx="8"/>
  <text class="d-text" x="446" y="111" text-anchor="middle">8</text>
  <text class="d-text" x="540" y="111" text-anchor="middle">15</text>
  <path class="d-edge-accent" d="M 254 128 L 300 196" marker-end="url(#b20q2cp-a1)"/>
  <path class="d-edge-dashed" d="M 446 128 L 400 196" marker-end="url(#b20q2cp-a1)"/>
  <rect class="d-box-muted" x="250" y="200" width="200" height="40" rx="8"/>
  <text class="d-text" x="350" y="226" text-anchor="middle">median = 5 (odd count)</text>
</svg>

The two tops are the two numbers closest to the middle. With an odd count, \`low\` holds the extra number and its top is the median; with an even count, the median is the average of both tops.

Two rules, kept true after every add, make this work. Together they are the **invariant**; the full argument for why they are enough, and why at most one move is ever needed, is on its own page: [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

1. **Order rule:** every number in \`low\` is ≤ every number in \`high\`.
2. **Size rule:** \`len(low) == len(high)\` or \`len(low) == len(high) + 1\`.

📌 **Interview term: Invariant** — a condition that is true before and after every operation. You prove the algorithm correct by showing each operation preserves it.

Each add is three small steps:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Adding a number: route it by comparing with the top of low, rebalance by moving at most one top, then read the median from the tops">
  <defs>
    <marker id="b20q2cp-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="92" text-anchor="middle">1. route x</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">x at most top(low): low</text>
  <path class="d-edge" d="M 212 100 L 262 100" marker-end="url(#b20q2cp-a2)"/>
  <rect class="d-box" x="266" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="361" y="92" text-anchor="middle">2. rebalance</text>
  <text class="d-sub" x="361" y="116" text-anchor="middle">move one top if needed</text>
  <path class="d-edge" d="M 458 100 L 508 100" marker-end="url(#b20q2cp-a2)"/>
  <rect class="d-box-accent" x="512" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="607" y="92" text-anchor="middle">3. read tops</text>
  <text class="d-sub" x="607" y="116" text-anchor="middle">O(1) median</text>
  <text class="d-sub" x="237" y="170" text-anchor="middle">O(log n)</text>
  <text class="d-sub" x="483" y="170" text-anchor="middle">O(log n)</text>
</svg>

Route the number by comparing it with the top of \`low\`, fix the sizes by moving at most one top across, and read the answer from the tops. Each heap push or pop is O(log n), so an add is O(log n) and a median query is O(1).

Here is the stream \`5, 15, 1, 3, 8\` step by step:

| Add | Goes to | Rebalance | low (max-heap) | high (min-heap) | Median |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | low (it is empty) | — | [5] | [] | 5.0 |
| 15 | high (15 > 5) | — | [5] | [15] | 10.0 |
| 1 | low (1 ≤ 5) | — | [1, 5] | [15] | 5.0 |
| 3 | low (3 ≤ 5) | low too big: 5 → high | [1, 3] | [5, 15] | 4.0 |
| 8 | high (8 > 3) | high too big: 5 → low | [1, 3, 5] | [8, 15] | 5.0 |

## 5. The Code in C++

\`std::priority_queue\` keeps the **largest** element on top by default, which is exactly what the lower half needs. For the upper half we pass \`std::greater<int>\` to make it a min-heap ([cppreference: priority_queue](https://www.fi.muni.cz/~xvaclav/cppreference/en/cpp/container/priority_queue.html)).

~~~cpp
class MedianFinder {
    priority_queue<int> low;                              // max-heap (the default): smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: larger half

public:
    void addNum(int x) {
        if (low.empty() || x <= low.top()) low.push(x);
        else high.push(x);
        // rebalance so that low.size() == high.size() or low.size() == high.size() + 1
        if (low.size() > high.size() + 1) { high.push(low.top()); low.pop(); }
        else if (high.size() > low.size()) { low.push(high.top()); high.pop(); }
    }

    double findMedian() const {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // long long: two ints can overflow
    }
};
~~~

**What to point out in this code:**

- \`priority_queue<int>\` and \`priority_queue<int, vector<int>, greater<int>>\`: the first is a max-heap, the second a min-heap. In C++ it is the min-heap that needs the extra template arguments, the opposite of Java and Python.
- \`pop()\` returns \`void\`, so moving a number between heaps is always two calls: \`high.push(low.top()); low.pop();\`.
- \`((long long)low.top() + high.top()) / 2.0\` widens **before** adding. \`low.top() + high.top()\` with two values near \`INT_MAX\` is signed overflow, which is undefined behaviour; on our g++ -O2 build it printed -1.0 instead of 2147483647.0.
- \`top()\` on an empty queue is undefined behaviour (no exception), so the routing test checks \`low.empty()\` first.
- \`low.size() > high.size() + 1\` compares \`size_t\` values. That is safe here; writing it as \`low.size() - high.size() > 1\` would break, because unsigned subtraction wraps around when \`high\` is bigger.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the median after every add, on three streams** prints:

~~~text
stream  [5, 15, 1, 3, 8, 7, 9, 10, 20, 2]
medians [5.0, 10.0, 5.0, 4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 7.5]
stream  [-1, -2, -3, -4]
medians [-1.0, -1.5, -2.0, -2.5]
stream  [2, 2, 2, 2]
medians [2.0, 2.0, 2.0, 2.0]
~~~

The first stream matches the table in section 4 for its first five numbers.

**Example 2 — sort every time vs sorted insert vs two heaps vs counting buckets, on a 3,000-number stream.** Medians are kept as *twice the median* (an integer) so the comparison is exact; the "checksum" is the sum of those integers over all 3,000 adds. It prints:

~~~text
stream of 3000 numbers in 0..100
sort every time: last median 49.0, checksum 291958
sorted insert:   last median 49.0, checksum 291958, elements shifted 2222515
two heaps:       last median 49.0, checksum 291958, final sizes 1500 and 1500
all three agree after every add: true
101 buckets:     last median 49.0, agrees: true
~~~

All approaches agree after every single add. The sorted insert shifted over two million elements to get there, and the heaps ended with exactly 1,500 numbers each.

## 7. Scaling Up

At 3,000 numbers all three approaches are instant. The difference appears at scale. On our sandbox (g++ 13, -O2), with random \`int\`s:

| Stream length | sorted \`vector\` + \`insert\` | two \`priority_queue\`s |
| :--- | :--- | :--- |
| 100,000 | 0.191 s | 0.006 s |
| 300,000 | 1.766 s | 0.019 s |

Tripling the stream made the sorted vector about 9× slower (its total work is O(n²)), while the heaps grew roughly in proportion. \`vector::insert\` moves the tail with a fast memory move, and still loses by about 90× at 300,000.

## 8. Why Two Heaps Beat a Sorted List

A sorted list keeps *all* n numbers in order, and paying for that order is what costs O(n) per insert. Two heaps keep almost no order: only "everything on the left is smaller than everything on the right", plus a cheap way to reach the largest left number and the smallest right number. That is the least structure that still answers the question, and it is why each add drops to O(log n). The same idea, "keep only the order you need", is behind using a heap for the [Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

## 9. A Second Look at the Invariant

After every add, check two things: the top of \`low\` is ≤ the top of \`high\`, and the sizes are equal or \`low\` has one more. Because both heaps are valid heaps, checking the tops is enough to know every element of \`low\` is ≤ every element of \`high\`. Why routing by the top of \`low\` plus a single move always restores both rules is proved step by step on [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing).

## 10. The Classic Follow-Ups

**"All numbers are between 0 and 100."** Then a heap is overkill. Keep an array of 101 counters; an add is \`counts[x] += 1\` (O(1)), and the median is found by walking the counters until you pass the middle position (at most 101 steps, a constant). Example 2 does exactly this on the 3,000-number stream and gets the same final median, 49.0.

📌 **Interview term: Counting buckets (counting sort idea)** — when values come from a small known range, count how many times each value appears instead of storing the values. Space is the size of the range, not the size of the stream.

**"99% of numbers are between 0 and 100."** Keep the 101 buckets for the common case, plus two plain counters (or two small heaps) for values below 0 and above 100. The median almost always lands inside the buckets; when it does not, the small heaps answer it.

**"Numbers can also be removed"** or **"only the last k numbers count."** Heaps cannot delete an arbitrary element cheaply, so you add lazy deletion or switch to a balanced tree. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

**"Any percentile, not just the median."** The same trick works for the 90th percentile: keep \`low\` at 90% of the items and \`high\` at 10% by changing the size rule. For many different percentiles at huge scale, real systems use approximate quantile sketches that keep a fixed-size summary instead of every number.

**"The data is not a stream: two sorted arrays."** That is a different problem with a binary-search solution: [median of two sorted arrays](/interview-question/median-of-two-sorted-arrays-in-o-log-min-m-n-how-does-the-partition-trick-work).

## 11. Complexity

| Approach | Add | Median | Space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Sort on every query | O(1) | O(n log n) | O(n) | re-sorts everything each time |
| Sorted insert | O(n) | O(1) | O(n) | binary search is O(log n), but the shift is O(n) |
| Two heaps | O(log n) | O(1) | O(n) | at most three heap operations per add; the tops are the answer |
| Counting buckets (values in 0..R) | O(1) | O(R) | O(R) | one counter per possible value |
| Balanced BST / order-statistic tree | O(log n) | O(log n) | O(n) | also supports deletion |

## 12. Edge Cases

- **The first number.** \`low\` is empty, so the routing test must check for emptiness before peeking (\`not low\`, \`size === 0\`, \`isEmpty()\`, \`empty()\`).
- **Even count.** The median is the average of the two tops, so the result is a floating-point number: 10.0 after \`5, 15\`, 7.5 after ten numbers in example 1.
- **All numbers equal** (\`2, 2, 2, 2\`). The routing test uses ≤, so equal numbers go to \`low\` and the size rule moves one across; the median stays 2.0.
- **Negative numbers** (\`-1, -2, -3, -4\`). Nothing special for the algorithm, but in Python the negation trick turns them into positive keys; the code must negate back exactly once.
- **Median requested before any add.** Undefined; decide with the interviewer whether to throw an error or return a sentinel.
- **Huge values.** Two values near 2^31 overflow a 32-bit sum in Java and C++; widen before adding.

## Common Pitfalls

- **Using \`priority_queue<int>\` for both halves.** It is a max-heap; the upper half needs \`greater<int>\`. Getting this backwards puts the median deep inside a heap.
- **Signed overflow when averaging.** \`(low.top() + high.top()) / 2.0\` is undefined for large values; cast to \`long long\` first.
- **Calling \`top()\` on an empty queue.** Undefined behaviour, not an exception; it may return garbage. Check \`empty()\` first.
- **Unsigned subtraction in the size check.** \`low.size() - high.size() > 1\` wraps to a huge number when \`high\` is larger. Compare \`low.size() > high.size() + 1\`.
- **Assuming \`vector::insert\` in the middle is cheap.** It shifts every later element: 2,222,515 shifts for 3,000 numbers in example 2, and it invalidates iterators into the vector.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two halves:</strong> <span style="color:#f0e2c8;">A max-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> for the smaller half and a min-heap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> for the larger half; the median is at the tops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. C++ heaps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int&gt;</code> is already a max-heap; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code> is the min-heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Add:</strong> <span style="color:#f0e2c8;">Route by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.top()</code>, then move at most one top (push then pop, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns void). O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Median:</strong> <span style="color:#f0e2c8;">Odd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.top()</code>. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((long long)low.top() + high.top()) / 2.0</code>; widen first, signed overflow is UB. O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not simpler:</strong> <span style="color:#f0e2c8;">Sorting per query is O(n log n); a sorted vector is O(n) per add. At 300,000 numbers it took 1.77 s vs 0.019 s for heaps.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every number is between 0 and 100?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array&lt;int, 101&gt;</code> of counters: add is O(1), median is a walk over at most 101 buckets. Example 2 checks it against the heaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::multiset</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep one multiset and an iterator to the middle, moving it one step per insert. It is O(log n) per add and also supports deletion, which is how the sliding window version is often written in C++.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">top()</code> on an empty queue dangerous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> on the empty underlying vector, which is undefined behaviour; nothing throws, so the bug may go unnoticed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">double</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return twice the median as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, or return the two middle values; the caller divides. That keeps everything exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about any percentile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same two heaps with a different size rule: for p90 keep 90% of the items in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | The middle value of the sorted data; the average of the two middles for an even count |
| **Online algorithm** | Processes input as it arrives and can answer at any time |
| **Max-heap / min-heap** | A heap whose top is the largest / smallest element |
| **Invariant** | A condition that holds before and after every operation |
| **Counting buckets (counting sort idea)** | Count occurrences of each value when the value range is small |
| **Undefined behaviour** | C++ code whose result the standard does not define, such as signed overflow; it may silently print garbage |

---
**Conclusion:** A running median needs only the middle of the data, so two heaps that each hold half of it are enough. In C++ the lower half is a plain \`priority_queue<int>\` (a max-heap already) and the upper half a \`priority_queue\` with \`greater<int>\`. Each add routes one number and moves at most one top, O(log n); the median is read from the tops in O(1). The C++ traps are undefined behaviour, not exceptions: signed overflow when averaging, \`top()\` on an empty queue, and unsigned wrap-around in size arithmetic.`,
        examples: [
          {
            label: `MedianFinder: the median after every add (3 streams)`,
            code: `#include <cstdio>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

class MedianFinder {
    priority_queue<int> low;                              // max-heap (the default): smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: larger half

public:
    void addNum(int x) {
        if (low.empty() || x <= low.top()) low.push(x);
        else high.push(x);
        // rebalance so that low.size() == high.size() or low.size() == high.size() + 1
        if (low.size() > high.size() + 1) { high.push(low.top()); low.pop(); }
        else if (high.size() > low.size()) { low.push(high.top()); high.pop(); }
    }

    double findMedian() const {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // long long: two ints can overflow
    }
};

string fixed1(double v) {
    char buf[32];
    snprintf(buf, sizeof buf, "%.1f", v);
    return buf;
}

int main() {
    vector<vector<int>> streams = {{5, 15, 1, 3, 8, 7, 9, 10, 20, 2}, {-1, -2, -3, -4}, {2, 2, 2, 2}};
    for (const auto& stream : streams) {
        MedianFinder mf;
        string medians = "[", in = "[";
        for (size_t i = 0; i < stream.size(); i++) {
            mf.addNum(stream[i]);
            medians += (i ? ", " : "") + fixed1(mf.findMedian());
            in += (i ? ", " : "") + to_string(stream[i]);
        }
        cout << "stream  " << in << "]\\n";
        cout << "medians " << medians << "]\\n";
    }
}`,
          },
          {
            label: `Sort every time vs sorted insert vs two heaps vs buckets`,
            code: `#include <algorithm>
#include <cstdio>
#include <functional>
#include <iostream>
#include <numeric>
#include <queue>
#include <vector>
using namespace std;

// Three ways to answer "median so far" after every number of a 3000-number stream.
vector<int> makeStream(int n, long long seed) {
    vector<int> out;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647;  // MINSTD; long long, because the product overflows int
        out.push_back((int)(seed % 101));  // values 0..100, so the bucket follow-up applies
    }
    return out;
}

void line(const char* label, long long twice, long long checksum) {
    printf("%s last median %.1f, checksum %lld", label, twice / 2.0, checksum);
}

int main() {
    vector<int> nums = makeStream(3000, 11);
    int n = nums.size();

    // 1. Sort everything again after each add: O(n log n) per add.
    vector<long long> sortedAnswers;
    vector<int> seen;
    for (int x : nums) {
        seen.push_back(x);
        vector<int> s = seen;
        sort(s.begin(), s.end());
        int m = s.size();
        sortedAnswers.push_back(s[m / 2] + s[(m - 1) / 2]);  // twice the median, kept as an integer
    }

    // 2. Keep one sorted vector and insert in place: O(log n) search + O(n) shift.
    vector<long long> insertAnswers;
    vector<int> win;
    long long shifted = 0;
    for (int x : nums) {
        auto it = upper_bound(win.begin(), win.end(), x);  // first element > x
        shifted += win.end() - it;                          // elements that move one slot right
        win.insert(it, x);                                  // invalidates iterators into win
        int m = win.size();
        insertAnswers.push_back(win[m / 2] + win[(m - 1) / 2]);
    }

    // 3. Two heaps: O(log n) per add, O(1) per median.
    priority_queue<int> low;                              // max-heap
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap
    vector<long long> heapAnswers;
    for (int x : nums) {
        if (low.empty() || x <= low.top()) low.push(x); else high.push(x);
        if (low.size() > high.size() + 1) { high.push(low.top()); low.pop(); }
        else if (high.size() > low.size()) { low.push(high.top()); high.pop(); }
        heapAnswers.push_back(low.size() > high.size() ? 2LL * low.top() : (long long)low.top() + high.top());
    }

    // 4. Follow-up: every value is in 0..100, so count them in 101 buckets.
    vector<int> counts(101, 0);
    for (int x : nums) counts[x]++;
    auto kth = [&](int k) {  // k-th smallest (0-based) by walking the buckets
        for (int v = 0; v <= 100; v++) { if (k < counts[v]) return v; k -= counts[v]; }
        return -1;
    };
    long long bucketTwice = kth(n / 2) + kth((n - 1) / 2);
    auto total = [](const vector<long long>& v) { return accumulate(v.begin(), v.end(), 0LL); };

    printf("stream of %d numbers in 0..100\\n", n);
    line("sort every time:", sortedAnswers.back(), total(sortedAnswers));
    printf("\\n");
    line("sorted insert:  ", insertAnswers.back(), total(insertAnswers));
    printf(", elements shifted %lld\\n", shifted);
    line("two heaps:      ", heapAnswers.back(), total(heapAnswers));
    printf(", final sizes %zu and %zu\\n", low.size(), high.size());
    printf("all three agree after every add: %s\\n", sortedAnswers == insertAnswers && insertAnswers == heapAnswers ? "true" : "false");
    printf("101 buckets:     last median %.1f, agrees: %s\\n", bucketTwice / 2.0, bucketTwice == heapAnswers.back() ? "true" : "false");
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: `Find median from data stream with two heaps — invariant and rebalancing?`,
    difficulty: "medium",
    seoDescription: `The two-heap median invariant: why lower half ≤ upper half plus a size rule gives the median, and why one move rebalances. Python, JS, Java, C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are keeping a running median with two heaps in Python. State the invariant precisely, explain why it gives you the median, and show how \`add_num\` restores it after every insert. Why is one move between the heaps always enough?"

**What a strong answer should cover:**
- The order rule (max of the lower half ≤ min of the upper half) and the size rule (sizes equal, or the lower half has one more).
- Why the two rules together put the median at the tops: positions |low| and |low| + 1 in sorted order.
- The routing step and the case analysis showing one move restores the size rule; the order rule survives both routing and the move.
- The two common strategies (compare-first vs push-through) and their cost in heap operations.
- Python details: \`heapq\` is min-only, so the lower half stores negated values and every move must negate exactly once; \`/ 2\`, not \`// 2\`.

**Code / implementation expected:** Optional — an \`add\` method plus an \`invariant_ok\` check in Python 3.`,
        answer: `**Target Audience:** Developers who have seen the two-heap median solution in Python and want to explain why it is correct.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a seesaw in a playground with a line painted across the middle. Children arrive one by one. Smaller children sit on the left, bigger ones on the right, and a teacher keeps the two sides with the same number of children, or one extra on the left. The child closest to the middle line on the left side, together with the one closest to it on the right, tells you where the middle of the class is.

Two rules keep that picture honest. **Every child on the left is no bigger than every child on the right** (the order rule), and **the left side has the same number of children as the right, or one more** (the size rule). When a new child arrives and breaks a rule, the teacher fixes it by moving *one* child across: the biggest from the left, or the smallest from the right.

The two-heap median solution is exactly this seesaw. The main question, [How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream), shows the full solution and the alternatives. This page is the part interviewers probe hardest: **what the invariant is, why it is enough, and why one move always restores it.** Candidates who can only recite the code tend to get lost the moment the interviewer asks "why only one move?" or "what if I change the size rule?".

## 2. The Invariant, Stated Precisely

Keep the numbers seen so far in two heaps:

- \`low\` — a **max-heap** holding the smaller half. Its top is \`max(low)\`.
- \`high\` — a **min-heap** holding the larger half. Its top is \`min(high)\`.

📌 **Interview term: Invariant** — a condition that holds before and after every operation. Correctness proofs work by showing each operation keeps it true.

The invariant is two rules:

1. **Order rule:** \`max(low) ≤ min(high)\`. Because both are heaps, checking the two tops is the same as checking that every element of \`low\` is ≤ every element of \`high\`.
2. **Size rule:** \`|low| = |high|\` or \`|low| = |high| + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Order rule: the top of low is at most the top of high. Size rule: low has the same size as high or one more">
  <rect class="d-box" x="30" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="72" text-anchor="middle">low (max-heap)</text>
  <text class="d-sub" x="170" y="98" text-anchor="middle">5, 35, 41  top = 41</text>
  <rect class="d-box" x="390" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="72" text-anchor="middle">high (min-heap)</text>
  <text class="d-sub" x="530" y="98" text-anchor="middle">62, 97  top = 62</text>
  <text class="d-text d-accent" x="350" y="86" text-anchor="middle">41 &#8804; 62</text>
  <rect class="d-box-accent" x="30" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="180" y="191" text-anchor="middle">order: max(low) &#8804; min(high)</text>
  <rect class="d-box-accent" x="370" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="520" y="191" text-anchor="middle">size: |low| = |high| or +1</text>
</svg>

The order rule splits the data at a point; the size rule puts that point exactly in the middle.

📌 **Interview term: Partition** — a split of the data into two groups where everything in the first group is ≤ everything in the second. The order rule says \`low\` and \`high\` form a partition.

## 3. Why the Invariant Gives the Median

Suppose n numbers have been added. Sort them in your head: positions 1 to n.

- The order rule says \`low\` holds the |low| *smallest* numbers, so they occupy positions 1 to |low|, and \`max(low)\` is the number at position |low|. Likewise \`min(high)\` is at position |low| + 1.
- **n odd, n = 2m + 1.** The size rule forces |low| = m + 1. The median is at position m + 1, which is \`max(low)\`.
- **n even, n = 2m.** The size rule forces |low| = m. The two middle numbers are at positions m and m + 1: \`max(low)\` and \`min(high)\`. The median is their average.

So the median is always computed from the tops alone, in O(1). Neither rule alone is enough: without the order rule the tops are not adjacent in sorted order; without the size rule they are adjacent, but not in the middle.

📌 **Interview term: Order statistic** — the element at a given position in sorted order (the k-th smallest). The median is the middle order statistic, and the invariant keeps it at a heap top.

## 4. Adding a Number: Route, Then Rebalance

The standard ("compare-first") add has two steps.

**Step 1 — route.** If \`low\` is empty or \`x ≤ max(low)\`, push \`x\` into \`low\`; otherwise push it into \`high\`.

*Why the order rule survives:* if \`x ≤ max(low)\`, then \`x ≤ max(low) ≤ min(high)\`, so \`low\` still contains nothing bigger than \`min(high)\`. If \`x > max(low)\`, then \`x\` is bigger than everything in \`low\`, so \`high\` still contains nothing smaller than \`max(low)\`. Either way the partition is intact.

**Step 2 — rebalance.** Before the add the sizes were (s, s) or (s + 1, s). One push makes them one of (s + 1, s), (s, s + 1), (s + 2, s) or (s + 1, s + 1). Two of those already satisfy the size rule; the other two are off by exactly one element:

| Sizes after routing | Rule broken? | Fix |
| :--- | :--- | :--- |
| (s + 1, s) | no | — |
| (s + 1, s + 1) | no | — |
| (s + 2, s) | \`low\` too big | move \`max(low)\` into \`high\` |
| (s, s + 1) | \`high\` too big | move \`min(high)\` into \`low\` |

*Why the move keeps the order rule:* \`max(low)\` is ≤ every element of \`high\`, so when it moves it becomes the new \`min(high)\`, and the remaining \`low\` is still below it. Symmetrically, \`min(high)\` is ≥ everything in \`low\`, so it becomes the new \`max(low)\`.

*Why one move is always enough:* the sizes can only be off by one element after one push, and one move changes the difference by two, from +2 to 0, or from −1 to +1. So an \`if\`, not a \`while\`, is correct. Writing \`while\` is harmless but signals that you have not done the case analysis.

📌 **Interview term: Rebalancing** — restoring the size rule by moving a heap top from one heap to the other. Each move is one pop plus one push, O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="After adding 35, low holds 35 and 41 and high is empty, so the top 41 moves from low to high">
  <defs>
    <marker id="b20q3py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="24" text-anchor="middle">add 35: low has 2, high has 0</text>
  <rect class="d-box" x="40" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="160" y="92" text-anchor="middle">low</text>
  <text class="d-sub" x="160" y="118" text-anchor="middle">35, 41  (size 2)</text>
  <rect class="d-box" x="420" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">high</text>
  <text class="d-sub" x="540" y="118" text-anchor="middle">empty  (size 0)</text>
  <path class="d-edge-accent" d="M 284 100 L 414 100" marker-end="url(#b20q3py-a1)"/>
  <text class="d-sub" x="350" y="88" text-anchor="middle">move 41</text>
  <rect class="d-box-muted" x="200" y="160" width="300" height="40" rx="8"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">now 1 and 1, median 38.0</text>
</svg>

Adding 35 to the stream \`41\` routes it to \`low\` (35 ≤ 41), making the sizes (2, 0). One move of \`max(low)\` = 41 restores (1, 1), and the median becomes (35 + 41) / 2 = 38.0. Example 1 traces seven adds like this.

## 5. A Second Strategy: "Push Through" \`low\`

Many published solutions skip the comparison:

1. Push \`x\` into \`low\`.
2. Pop \`max(low)\` and push it into \`high\`. (This is always done.)
3. If \`|high| > |low|\`, pop \`min(high)\` and push it into \`low\`.

It is correct for the same reasons: step 2 hands the largest of \`low ∪ {x}\` to \`high\`, which keeps the partition, and step 3 is the same one-move rebalance. It is shorter to write and has no routing branch, but it **always** does at least one move. Example 2 counts both strategies on 5,000 numbers: compare-first moved 2,502 numbers between heaps, push-through moved 7,500 (one per add, plus a move back on half of them). Both give the same median after every add.

📌 **Interview term: Amortised vs worst-case cost** — here both strategies are O(log n) per add in the worst case; the difference is the constant number of heap operations (up to 2 vs up to 3, plus the extra moves).

## 6. The Code in Python

\`heapq\` only provides a min-heap, so \`low\` stores **negated** numbers: \`-low[0]\` is \`max(low)\`. Here is the add with both strategies, from example 2:

~~~python
def add(self, x):
    low, high = self.low, self.high
    if self.strategy == "compare-first":
        if not low or x <= -low[0]:
            heapq.heappush(low, -x)
        else:
            heapq.heappush(high, x)
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low)); self.moves += 1
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high)); self.moves += 1
    else:  # "push-through": always go through low, then hand its max to high
        heapq.heappush(low, -x)
        heapq.heappush(high, -heapq.heappop(low)); self.moves += 1
        if len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high)); self.moves += 1
~~~

And the invariant check, which example 2 runs after every one of 5,000 adds:

~~~python
def invariant_ok(self):
    sizes_ok = len(self.low) == len(self.high) or len(self.low) == len(self.high) + 1
    order_ok = not self.high or -self.low[0] <= self.high[0]
    return sizes_ok and order_ok
~~~

**What to point out in this code:**

- In compare-first, the move \`heapq.heappush(high, -heapq.heappop(low))\` negates exactly once on the way out of \`low\`, and \`heapq.heappush(low, -heapq.heappop(high))\` negates once on the way in. A missing minus sign does not crash; it silently breaks the order rule. We ran a version that forgot to negate when moving from \`low\` to \`high\`:

~~~text
correct: [5, 3.0, 3]
buggy:   [5, -2.0, 1]
~~~

  On the stream \`5, 1, 3\` the buggy version pushed −5 into \`high\`, so \`min(high)\` became −5 and the "median" went negative.
- \`invariant_ok\` checks only the tops and sizes. That is enough because \`heapq\` keeps each list a valid heap, so the tops really are the max and min.
- \`bisect.insort(reference, x)\` keeps a sorted copy as the trusted answer for the test; it is O(n) per insert, which is fine for a check but not for the solution.
- Python 3.14 added \`heapq.heappush_max\` and related functions ([heapq docs](https://docs.python.org/3/library/heapq.html)), which would remove the negation. Our sandbox ran Python 3.13, so the code negates.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — a trace of seven adds, printing the route, any rebalance, both heaps (sorted for display) and the median** prints:

~~~text
add 41 -> low
  low [41]  high []  median 41.0
add 35 -> low
  low too big: move 41 to high
  low [35]  high [41]  median 38.0
add 62 -> high
  high too big: move 41 to low
  low [35, 41]  high [62]  median 41.0
add 5 -> low
  low too big: move 41 to high
  low [5, 35]  high [41, 62]  median 38.0
add 97 -> high
  high too big: move 41 to low
  low [5, 35, 41]  high [62, 97]  median 41.0
add 108 -> high
  low [5, 35, 41]  high [62, 97, 108]  median 51.5
add 4 -> low
  low [4, 5, 35, 41]  high [62, 97, 108]  median 41.0
~~~

Read it against the case table in section 4: adds of 35, 62, 5 and 97 each needed exactly one move, and adds of 41, 108 and 4 needed none. The order rule holds on every line (\`max(low)\` is 41 or less, \`min(high)\` is 41 or more).

**Example 2 — both strategies on 5,000 random numbers, the invariant checked after every add, medians compared with a sorted reference, and two overflow-prone pairs** prints:

~~~text
adds: 5000, invariant held after every add: true
median mismatches against a sorted list: 0
compare-first moves: 2502
push-through moves:  7500
median of [2147483647, 2147483647] = 2147483647.0
median of [-2147483648, -2147483647] = -2147483647.5
~~~

## 8. Reading the Results

- "Invariant held after every add: true" for both strategies, and zero median mismatches against the sorted reference.
- Compare-first moved 2,502 numbers for 5,000 adds, about one every two adds, which is what the case table predicts for random input. Push-through moved 7,500: 5,000 unconditional moves plus 2,500 moves back.
- The last two lines use the extremes of the 32-bit range. The correct medians are 2147483647.0 and -2147483647.5; an implementation that adds two \`int\`s before widening gets them wrong in Java and C++.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Route (compare with \`max(low)\`, push) | O(log n) | one O(1) peek and one heap push |
| Rebalance | O(log n) | at most one pop and one push (the case table above) |
| Median | O(1) | read one or two tops |
| Check the invariant | O(1) | compare the two tops and the two sizes |
| Space | O(n) | every number lives in exactly one heap |

## 10. Changing the Rules (Common Follow-Ups)

- **"Let \`high\` hold the extra element instead."** Mirror everything: the size rule becomes \`|high| = |low|\` or \`|high| = |low| + 1\`, and the odd-count median is \`min(high)\`. Pick one convention and keep it everywhere; mixing them is a classic bug.
- **"The 90th percentile instead of the median."** Change only the size rule: keep \`|low| = ⌈0.9·n⌉\`. The order rule and the move logic stay the same, and \`max(low)\` is the answer.
- **"Numbers can also be removed."** A heap can only remove its top cheaply. Mark removed values in a hash map and discard them when they reach a top (lazy deletion), and keep separate counts of *live* elements for the size rule. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).
- **"Add many numbers at once."** Pushing them one by one keeps the invariant cheaply. Building both heaps from scratch would need a selection step first (quickselect to split around the median), then heapify each half.

## 11. Edge Cases

- **First add.** \`low\` is empty, so the routing must not peek; the number goes to \`low\` and no move is needed (sizes (1, 0)).
- **Equal numbers.** Routing uses ≤, so a number equal to \`max(low)\` goes to \`low\`; ties never break the order rule because ≤ allows equality.
- **A number between the two tops** (for example 50 when the tops are 41 and 62). It goes to \`high\` (50 > 41), and the order rule still holds: 41 ≤ 50.
- **Extreme values.** The rules are about comparisons only; the arithmetic danger is the average of the two tops, covered by example 2.
- **Median before any add.** Both heaps are empty; return an error or a sentinel, as agreed with the interviewer.

## Common Pitfalls

- **Negating twice or not at all when moving a top.** The code still runs; the medians are just wrong (\`[5, -2.0, 1]\` instead of \`[5, 3.0, 3]\` in our run).
- **Routing by comparing with \`high[0]\` when \`high\` is empty.** \`IndexError\` on the second add. Compare with the top of \`low\`, and check \`not low\` first.
- **Reading the odd-count median from the wrong heap.** With the size rule "low has the extra one", the answer is \`-low[0]\`, never \`high[0]\`.
- **Using \`// 2\` for the even case.** Floors the result: 38.5 would become 38.
- **Rebalancing before routing.** The sizes are checked against the old state, and the new number can leave a heap two larger than the other.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The invariant:</strong> <span style="color:#f0e2c8;">Order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(low) ≤ min(high)</code>. Size: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(low) == len(high)</code> or one more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it gives the median:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds the smallest |low| numbers, so its top is at sorted position |low| and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high[0]</code> at |low| + 1: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Route:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x ≤ -low[0]</code> goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (pushed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code>), else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. Either side keeps the order rule.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rebalance:</strong> <span style="color:#f0e2c8;">After one push the sizes are off by at most one element, so one move of a top fixes it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Every move negates exactly once; a missing minus sign silently breaks the order rule.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is checking the two tops enough to verify the order rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-low[0]</code> is the maximum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high[0]</code> the minimum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. If max ≤ min, every pair is in order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">low</code> were allowed to be two bigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 5 numbers split 4 and 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-low[0]</code> is at position 4, not 3; the median is buried inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> where you cannot reach it in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Compare-first or push-through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same correctness, same Big-O. Push-through is shorter but always moves at least once: 7,500 moves vs 2,502 for 5,000 adds in example 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run a random stream, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invariant_ok()</code> after every add, and compare against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect.insort</code> into a sorted list. Example 2 does both: zero mismatches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would deletions change the invariant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The size rule must count live elements only, because deleted numbers stay in the heap until they reach a top (lazy deletion).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invariant** | A condition true before and after every operation |
| **Partition** | A split where everything in the first group is ≤ everything in the second |
| **Order statistic** | The element at a given position in sorted order; the median is the middle one |
| **Rebalancing** | Moving one heap top to the other heap to restore the size rule |
| **Amortised vs worst-case cost** | Average cost per operation over a sequence vs the cost of the single worst operation |
| **Negation trick** | Storing -x in a min-heap to simulate a max-heap |

---
**Conclusion:** The two-heap median rests on two rules: the lower half never exceeds the upper half, and the lower half has the same size or one more. Together they pin the middle of the sorted order to the heap tops. Routing by the top of \`low\` keeps the order rule, and because one push unbalances the sizes by at most one element, a single move restores the size rule. In Python, the only extra discipline is the negation: every number entering or leaving \`low\` is negated exactly once.`,
        examples: [
          {
            label: `Trace: route, rebalance and median for seven adds`,
            code: `import heapq

# Trace the two-heap invariant: every number in low <= every number in high,
# and len(low) == len(high) or len(low) == len(high) + 1.
low = []   # max-heap of the smaller half, stored negated (heapq is a min-heap)
high = []  # min-heap of the larger half


def show(xs):
    return "[" + ", ".join(str(x) for x in sorted(xs)) + "]"


def median():
    if len(low) > len(high):
        return "%.1f" % -low[0]
    return "%.1f" % ((-low[0] + high[0]) / 2)


for x in [41, 35, 62, 5, 97, 108, 4]:
    # step 1: route by value, compared with the top of low
    if not low or x <= -low[0]:
        heapq.heappush(low, -x)
        side = "low"
    else:
        heapq.heappush(high, x)
        side = "high"
    print("add " + str(x) + " -> " + side)
    # step 2: restore the size rule with at most one move
    if len(low) > len(high) + 1:
        moved = -heapq.heappop(low)
        heapq.heappush(high, moved)
        print("  low too big: move " + str(moved) + " to high")
    elif len(high) > len(low):
        moved = heapq.heappop(high)
        heapq.heappush(low, -moved)
        print("  high too big: move " + str(moved) + " to low")
    print("  low " + show(-v for v in low) + "  high " + show(high) + "  median " + median())`,
          },
          {
            label: `Invariant check on 5000 adds, two strategies, overflow pairs`,
            code: `import bisect
import heapq

# Check the invariant after every add, and compare the two common add strategies.


class TwoHeaps:
    def __init__(self, strategy):
        self.low, self.high = [], []  # low stored negated (max-heap)
        self.strategy = strategy
        self.moves = 0                # numbers moved from one heap to the other

    def add(self, x):
        low, high = self.low, self.high
        if self.strategy == "compare-first":
            if not low or x <= -low[0]:
                heapq.heappush(low, -x)
            else:
                heapq.heappush(high, x)
            if len(low) > len(high) + 1:
                heapq.heappush(high, -heapq.heappop(low)); self.moves += 1
            elif len(high) > len(low):
                heapq.heappush(low, -heapq.heappop(high)); self.moves += 1
        else:  # "push-through": always go through low, then hand its max to high
            heapq.heappush(low, -x)
            heapq.heappush(high, -heapq.heappop(low)); self.moves += 1
            if len(high) > len(low):
                heapq.heappush(low, -heapq.heappop(high)); self.moves += 1

    def invariant_ok(self):
        sizes_ok = len(self.low) == len(self.high) or len(self.low) == len(self.high) + 1
        order_ok = not self.high or -self.low[0] <= self.high[0]
        return sizes_ok and order_ok

    def median(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2


def stream(n, seed):
    out = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD, same numbers in every language
        out.append(seed % 2001 - 1000)    # values -1000..1000
    return out


nums = stream(5000, 3)
a, b = TwoHeaps("compare-first"), TwoHeaps("push-through")
reference = []
held = mismatches = 0
for x in nums:
    a.add(x); b.add(x)
    bisect.insort(reference, x)
    n = len(reference)
    truth = (reference[n // 2] + reference[(n - 1) // 2]) / 2
    held += a.invariant_ok() and b.invariant_ok()
    mismatches += a.median() != truth or b.median() != truth
print("adds: " + str(len(nums)) + ", invariant held after every add: " + str(held == len(nums)).lower())
print("median mismatches against a sorted list: " + str(mismatches))
print("compare-first moves: " + str(a.moves))
print("push-through moves:  " + str(b.moves))

for pair in [[2147483647, 2147483647], [-2147483648, -2147483647]]:
    t = TwoHeaps("compare-first")
    for x in pair:
        t.add(x)
    print("median of [" + ", ".join(str(x) for x in pair) + "] = " + "%.1f" % t.median())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are keeping a running median with two heaps in JavaScript. State the invariant precisely, explain why it gives you the median, and show how \`addNum\` restores it after every insert. Why is one move between the heaps always enough?"

**What a strong answer should cover:**
- The order rule (max of the lower half ≤ min of the upper half) and the size rule (sizes equal, or the lower half has one more).
- Why the two rules together put the median at the tops: positions |low| and |low| + 1 in sorted order.
- The routing step and the case analysis showing one move restores the size rule; the order rule survives both routing and the move.
- The two common strategies (compare-first vs push-through) and their cost in heap operations.
- JavaScript details: no built-in heap, so one class with a comparator gives both a max-heap and a min-heap; \`peek()\` on an empty heap is \`undefined\`, which fails every comparison silently.

**Code / implementation expected:** Optional — an \`add\` method plus an \`invariantOk\` check in JavaScript.`,
        answer: `**Target Audience:** Developers who have seen the two-heap median solution in JavaScript and want to explain why it is correct.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a seesaw in a playground with a line painted across the middle. Children arrive one by one. Smaller children sit on the left, bigger ones on the right, and a teacher keeps the two sides with the same number of children, or one extra on the left. The child closest to the middle line on the left side, together with the one closest to it on the right, tells you where the middle of the class is.

Two rules keep that picture honest. **Every child on the left is no bigger than every child on the right** (the order rule), and **the left side has the same number of children as the right, or one more** (the size rule). When a new child arrives and breaks a rule, the teacher fixes it by moving *one* child across: the biggest from the left, or the smallest from the right.

The two-heap median solution is exactly this seesaw. The main question, [How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream), shows the full solution and the alternatives. This page is the part interviewers probe hardest: **what the invariant is, why it is enough, and why one move always restores it.** Candidates who can only recite the code tend to get lost the moment the interviewer asks "why only one move?" or "what if I change the size rule?".

## 2. The Invariant, Stated Precisely

Keep the numbers seen so far in two heaps:

- \`low\` — a **max-heap** holding the smaller half. Its top is \`max(low)\`.
- \`high\` — a **min-heap** holding the larger half. Its top is \`min(high)\`.

📌 **Interview term: Invariant** — a condition that holds before and after every operation. Correctness proofs work by showing each operation keeps it true.

The invariant is two rules:

1. **Order rule:** \`max(low) ≤ min(high)\`. Because both are heaps, checking the two tops is the same as checking that every element of \`low\` is ≤ every element of \`high\`.
2. **Size rule:** \`|low| = |high|\` or \`|low| = |high| + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Order rule: the top of low is at most the top of high. Size rule: low has the same size as high or one more">
  <rect class="d-box" x="30" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="72" text-anchor="middle">low (max-heap)</text>
  <text class="d-sub" x="170" y="98" text-anchor="middle">5, 35, 41  top = 41</text>
  <rect class="d-box" x="390" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="72" text-anchor="middle">high (min-heap)</text>
  <text class="d-sub" x="530" y="98" text-anchor="middle">62, 97  top = 62</text>
  <text class="d-text d-accent" x="350" y="86" text-anchor="middle">41 &#8804; 62</text>
  <rect class="d-box-accent" x="30" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="180" y="191" text-anchor="middle">order: max(low) &#8804; min(high)</text>
  <rect class="d-box-accent" x="370" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="520" y="191" text-anchor="middle">size: |low| = |high| or +1</text>
</svg>

The order rule splits the data at a point; the size rule puts that point exactly in the middle.

📌 **Interview term: Partition** — a split of the data into two groups where everything in the first group is ≤ everything in the second. The order rule says \`low\` and \`high\` form a partition.

## 3. Why the Invariant Gives the Median

Suppose n numbers have been added. Sort them in your head: positions 1 to n.

- The order rule says \`low\` holds the |low| *smallest* numbers, so they occupy positions 1 to |low|, and \`max(low)\` is the number at position |low|. Likewise \`min(high)\` is at position |low| + 1.
- **n odd, n = 2m + 1.** The size rule forces |low| = m + 1. The median is at position m + 1, which is \`max(low)\`.
- **n even, n = 2m.** The size rule forces |low| = m. The two middle numbers are at positions m and m + 1: \`max(low)\` and \`min(high)\`. The median is their average.

So the median is always computed from the tops alone, in O(1). Neither rule alone is enough: without the order rule the tops are not adjacent in sorted order; without the size rule they are adjacent, but not in the middle.

📌 **Interview term: Order statistic** — the element at a given position in sorted order (the k-th smallest). The median is the middle order statistic, and the invariant keeps it at a heap top.

## 4. Adding a Number: Route, Then Rebalance

The standard ("compare-first") add has two steps.

**Step 1 — route.** If \`low\` is empty or \`x ≤ max(low)\`, push \`x\` into \`low\`; otherwise push it into \`high\`.

*Why the order rule survives:* if \`x ≤ max(low)\`, then \`x ≤ max(low) ≤ min(high)\`, so \`low\` still contains nothing bigger than \`min(high)\`. If \`x > max(low)\`, then \`x\` is bigger than everything in \`low\`, so \`high\` still contains nothing smaller than \`max(low)\`. Either way the partition is intact.

**Step 2 — rebalance.** Before the add the sizes were (s, s) or (s + 1, s). One push makes them one of (s + 1, s), (s, s + 1), (s + 2, s) or (s + 1, s + 1). Two of those already satisfy the size rule; the other two are off by exactly one element:

| Sizes after routing | Rule broken? | Fix |
| :--- | :--- | :--- |
| (s + 1, s) | no | — |
| (s + 1, s + 1) | no | — |
| (s + 2, s) | \`low\` too big | move \`max(low)\` into \`high\` |
| (s, s + 1) | \`high\` too big | move \`min(high)\` into \`low\` |

*Why the move keeps the order rule:* \`max(low)\` is ≤ every element of \`high\`, so when it moves it becomes the new \`min(high)\`, and the remaining \`low\` is still below it. Symmetrically, \`min(high)\` is ≥ everything in \`low\`, so it becomes the new \`max(low)\`.

*Why one move is always enough:* the sizes can only be off by one element after one push, and one move changes the difference by two, from +2 to 0, or from −1 to +1. So an \`if\`, not a \`while\`, is correct. Writing \`while\` is harmless but signals that you have not done the case analysis.

📌 **Interview term: Rebalancing** — restoring the size rule by moving a heap top from one heap to the other. Each move is one pop plus one push, O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="After adding 35, low holds 35 and 41 and high is empty, so the top 41 moves from low to high">
  <defs>
    <marker id="b20q3ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="24" text-anchor="middle">add 35: low has 2, high has 0</text>
  <rect class="d-box" x="40" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="160" y="92" text-anchor="middle">low</text>
  <text class="d-sub" x="160" y="118" text-anchor="middle">35, 41  (size 2)</text>
  <rect class="d-box" x="420" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">high</text>
  <text class="d-sub" x="540" y="118" text-anchor="middle">empty  (size 0)</text>
  <path class="d-edge-accent" d="M 284 100 L 414 100" marker-end="url(#b20q3ja-a1)"/>
  <text class="d-sub" x="350" y="88" text-anchor="middle">move 41</text>
  <rect class="d-box-muted" x="200" y="160" width="300" height="40" rx="8"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">now 1 and 1, median 38.0</text>
</svg>

Adding 35 to the stream \`41\` routes it to \`low\` (35 ≤ 41), making the sizes (2, 0). One move of \`max(low)\` = 41 restores (1, 1), and the median becomes (35 + 41) / 2 = 38.0. Example 1 traces seven adds like this.

## 5. A Second Strategy: "Push Through" \`low\`

Many published solutions skip the comparison:

1. Push \`x\` into \`low\`.
2. Pop \`max(low)\` and push it into \`high\`. (This is always done.)
3. If \`|high| > |low|\`, pop \`min(high)\` and push it into \`low\`.

It is correct for the same reasons: step 2 hands the largest of \`low ∪ {x}\` to \`high\`, which keeps the partition, and step 3 is the same one-move rebalance. It is shorter to write and has no routing branch, but it **always** does at least one move. Example 2 counts both strategies on 5,000 numbers: compare-first moved 2,502 numbers between heaps, push-through moved 7,500 (one per add, plus a move back on half of them). Both give the same median after every add.

📌 **Interview term: Amortised vs worst-case cost** — here both strategies are O(log n) per add in the worst case; the difference is the constant number of heap operations (up to 2 vs up to 3, plus the extra moves).

## 6. The Code in JavaScript

JavaScript has no heap, so the examples use one small class parameterised by a \`before(x, y)\` comparator:

~~~javascript
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}
~~~

\`new Heap((a, b) => a > b)\` is a max-heap (\`low\`) and \`new Heap((a, b) => a < b)\` a min-heap (\`high\`). Here is the add with both strategies, from example 2:

~~~javascript
add(x) {
  const low = this.low, high = this.high;
  if (this.strategy === 'compare-first') {
    if (low.size === 0 || x <= low.peek()) low.push(x); else high.push(x);
    if (low.size > high.size + 1) { high.push(low.pop()); this.moves++; }
    else if (high.size > low.size) { low.push(high.pop()); this.moves++; }
  } else { // 'push-through': always go through low, then hand its max to high
    low.push(x);
    high.push(low.pop()); this.moves++;
    if (high.size > low.size) { low.push(high.pop()); this.moves++; }
  }
}
~~~

And the invariant check, which example 2 runs after every one of 5,000 adds:

~~~javascript
invariantOk() {
  const sizesOk = this.low.size === this.high.size || this.low.size === this.high.size + 1;
  const orderOk = this.high.size === 0 || this.low.peek() <= this.high.peek();
  return sizesOk && orderOk;
}
~~~

**What to point out in this code:**

- The routing test checks \`low.size === 0\` before comparing. \`peek()\` on an empty heap returns \`undefined\`, and both \`5 <= undefined\` and \`5 > undefined\` are \`false\` (we ran it), so a missing check fails silently instead of throwing.
- \`high.push(low.pop())\` is the whole move: the value leaves one heap and enters the other in one line, with no negation games.
- \`invariantOk\` checks only the tops and sizes. That is enough because each \`Heap\` keeps its array a valid heap, so \`peek()\` really is the max or min.
- The comparator returns a boolean. If you reuse a heap class written for \`sort\`-style comparators (\`(a, b) => a - b\`, returning a number), make sure it tests \`< 0\`; a negative number is truthy, so mixing the two styles silently reverses half the comparisons.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — a trace of seven adds, printing the route, any rebalance, both heaps (sorted for display) and the median** prints:

~~~text
add 41 -> low
  low [41]  high []  median 41.0
add 35 -> low
  low too big: move 41 to high
  low [35]  high [41]  median 38.0
add 62 -> high
  high too big: move 41 to low
  low [35, 41]  high [62]  median 41.0
add 5 -> low
  low too big: move 41 to high
  low [5, 35]  high [41, 62]  median 38.0
add 97 -> high
  high too big: move 41 to low
  low [5, 35, 41]  high [62, 97]  median 41.0
add 108 -> high
  low [5, 35, 41]  high [62, 97, 108]  median 51.5
add 4 -> low
  low [4, 5, 35, 41]  high [62, 97, 108]  median 41.0
~~~

Read it against the case table in section 4: adds of 35, 62, 5 and 97 each needed exactly one move, and adds of 41, 108 and 4 needed none. The order rule holds on every line (\`max(low)\` is 41 or less, \`min(high)\` is 41 or more).

**Example 2 — both strategies on 5,000 random numbers, the invariant checked after every add, medians compared with a sorted reference, and two overflow-prone pairs** prints:

~~~text
adds: 5000, invariant held after every add: true
median mismatches against a sorted list: 0
compare-first moves: 2502
push-through moves:  7500
median of [2147483647, 2147483647] = 2147483647.0
median of [-2147483648, -2147483647] = -2147483647.5
~~~

## 8. Reading the Results

- "Invariant held after every add: true" for both strategies, and zero median mismatches against the sorted reference.
- Compare-first moved 2,502 numbers for 5,000 adds, about one every two adds, which is what the case table predicts for random input. Push-through moved 7,500: 5,000 unconditional moves plus 2,500 moves back.
- The last two lines use the extremes of the 32-bit range. The correct medians are 2147483647.0 and -2147483647.5; an implementation that adds two \`int\`s before widening gets them wrong in Java and C++.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Route (compare with \`max(low)\`, push) | O(log n) | one O(1) peek and one heap push |
| Rebalance | O(log n) | at most one pop and one push (the case table above) |
| Median | O(1) | read one or two tops |
| Check the invariant | O(1) | compare the two tops and the two sizes |
| Space | O(n) | every number lives in exactly one heap |

## 10. Changing the Rules (Common Follow-Ups)

- **"Let \`high\` hold the extra element instead."** Mirror everything: the size rule becomes \`|high| = |low|\` or \`|high| = |low| + 1\`, and the odd-count median is \`min(high)\`. Pick one convention and keep it everywhere; mixing them is a classic bug.
- **"The 90th percentile instead of the median."** Change only the size rule: keep \`|low| = ⌈0.9·n⌉\`. The order rule and the move logic stay the same, and \`max(low)\` is the answer.
- **"Numbers can also be removed."** A heap can only remove its top cheaply. Mark removed values in a hash map and discard them when they reach a top (lazy deletion), and keep separate counts of *live* elements for the size rule. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).
- **"Add many numbers at once."** Pushing them one by one keeps the invariant cheaply. Building both heaps from scratch would need a selection step first (quickselect to split around the median), then heapify each half.

## 11. Edge Cases

- **First add.** \`low\` is empty, so the routing must not peek; the number goes to \`low\` and no move is needed (sizes (1, 0)).
- **Equal numbers.** Routing uses ≤, so a number equal to \`max(low)\` goes to \`low\`; ties never break the order rule because ≤ allows equality.
- **A number between the two tops** (for example 50 when the tops are 41 and 62). It goes to \`high\` (50 > 41), and the order rule still holds: 41 ≤ 50.
- **Extreme values.** The rules are about comparisons only; the arithmetic danger is the average of the two tops, covered by example 2.
- **Median before any add.** Both heaps are empty; return an error or a sentinel, as agreed with the interviewer.

## Common Pitfalls

- **Peeking at an empty heap.** \`undefined\` makes every comparison \`false\`; check \`size\` first.
- **Mixing boolean and numeric comparators.** A heap that expects \`before(a, b)\` to be \`true\`/\`false\` breaks when given \`(a, b) => a - b\`, because any non-zero number is truthy.
- **Reading the odd-count median from the wrong heap.** With "low has the extra one", the answer is \`low.peek()\`.
- **An off-by-one size test inside a \`while\`.** With \`low.size >= high.size + 1\` instead of \`>\`, a valid state (low one bigger) still triggers a move, the other branch moves it back, and a \`while\` loop ping-pongs forever. An \`if\` with the exact case table cannot loop.
- **Formatting too early.** \`toFixed(1)\` returns a string; keep numbers until printing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The invariant:</strong> <span style="color:#f0e2c8;">Order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek() &lt;= high.peek()</code>. Size: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.size === high.size</code> or one more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it gives the median:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds the smallest |low| numbers, so its top is at sorted position |low| and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.peek()</code> at |low| + 1: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Route:</strong> <span style="color:#f0e2c8;">Empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.peek()</code> goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. Either side keeps the order rule.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rebalance:</strong> <span style="color:#f0e2c8;">After one push the sizes are off by at most one element, so one move of a top fixes it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap</code> class with two comparators; check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> fails comparisons silently.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is checking the two tops enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code> is the maximum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.peek()</code> the minimum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. If max ≤ min, every pair is in order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">low</code> were allowed to be two bigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 5 numbers split 4 and 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code> is at sorted position 4, not 3; the median is buried inside the heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Compare-first or push-through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same correctness and Big-O. Push-through always moves at least once: 7,500 moves vs 2,502 for 5,000 adds in example 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Random stream, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invariantOk()</code> after every add, and compare with a sorted array kept by binary search + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>. Example 2: zero mismatches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are the averages exact?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for 32-bit integers: their sum fits in a double exactly. Example 2 prints -2147483647.5 for the two smallest ints.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invariant** | A condition true before and after every operation |
| **Partition** | A split where everything in the first group is ≤ everything in the second |
| **Order statistic** | The element at a given position in sorted order; the median is the middle one |
| **Rebalancing** | Moving one heap top to the other heap to restore the size rule |
| **Amortised vs worst-case cost** | Average cost per operation over a sequence vs the cost of the single worst operation |
| **Comparator function** | A function that defines the heap order; one heap class becomes a min- or max-heap |

---
**Conclusion:** The two-heap median rests on two rules: the lower half never exceeds the upper half, and the lower half has the same size or one more. Together they pin the middle of the sorted order to the heap tops. Routing by the top of \`low\` keeps the order rule, and because one push unbalances the sizes by at most one element, a single move restores the size rule. In JavaScript, one comparator-driven \`Heap\` class gives you both halves; just never compare against \`peek()\` of an empty heap.`,
        examples: [
          {
            label: `Trace: route, rebalance and median for seven adds`,
            code: `// Trace the two-heap invariant: every number in low <= every number in high,
// and low.size === high.size or low.size === high.size + 1.
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

const low = new Heap((a, b) => a > b);  // max-heap of the smaller half
const high = new Heap((a, b) => a < b); // min-heap of the larger half

const show = (h) => '[' + h.a.slice().sort((a, b) => a - b).join(', ') + ']';
function median() {
  if (low.size > high.size) return low.peek().toFixed(1);
  return ((low.peek() + high.peek()) / 2).toFixed(1);
}

for (const x of [41, 35, 62, 5, 97, 108, 4]) {
  // step 1: route by value, compared with the top of low
  let side;
  if (low.size === 0 || x <= low.peek()) { low.push(x); side = 'low'; }
  else { high.push(x); side = 'high'; }
  console.log('add ' + x + ' -> ' + side);
  // step 2: restore the size rule with at most one move
  if (low.size > high.size + 1) {
    const moved = low.pop();
    high.push(moved);
    console.log('  low too big: move ' + moved + ' to high');
  } else if (high.size > low.size) {
    const moved = high.pop();
    low.push(moved);
    console.log('  high too big: move ' + moved + ' to low');
  }
  console.log('  low ' + show(low) + '  high ' + show(high) + '  median ' + median());
}`,
          },
          {
            label: `Invariant check on 5000 adds, two strategies, overflow pairs`,
            code: `// Check the invariant after every add, and compare the two common add strategies.
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

class TwoHeaps {
  constructor(strategy) {
    this.low = new Heap((a, b) => a > b);  // max-heap
    this.high = new Heap((a, b) => a < b); // min-heap
    this.strategy = strategy;
    this.moves = 0;                        // numbers moved from one heap to the other
  }
  add(x) {
    const low = this.low, high = this.high;
    if (this.strategy === 'compare-first') {
      if (low.size === 0 || x <= low.peek()) low.push(x); else high.push(x);
      if (low.size > high.size + 1) { high.push(low.pop()); this.moves++; }
      else if (high.size > low.size) { low.push(high.pop()); this.moves++; }
    } else { // 'push-through': always go through low, then hand its max to high
      low.push(x);
      high.push(low.pop()); this.moves++;
      if (high.size > low.size) { low.push(high.pop()); this.moves++; }
    }
  }
  invariantOk() {
    const sizesOk = this.low.size === this.high.size || this.low.size === this.high.size + 1;
    const orderOk = this.high.size === 0 || this.low.peek() <= this.high.peek();
    return sizesOk && orderOk;
  }
  median() {
    if (this.low.size > this.high.size) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2; // doubles: exact for these magnitudes
  }
}

function stream(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // MINSTD, same numbers in every language
    out.push((seed % 2001) - 1000);     // values -1000..1000
  }
  return out;
}

const nums = stream(5000, 3);
const a = new TwoHeaps('compare-first'), b = new TwoHeaps('push-through');
const reference = [];
let held = 0, mismatches = 0;
for (const x of nums) {
  a.add(x); b.add(x);
  let lo = 0, hi = reference.length; // insert x into a sorted array as the reference answer
  while (lo < hi) { const mid = (lo + hi) >> 1; if (reference[mid] <= x) lo = mid + 1; else hi = mid; }
  reference.splice(lo, 0, x);
  const n = reference.length;
  const truth = (reference[n >> 1] + reference[(n - 1) >> 1]) / 2;
  if (a.invariantOk() && b.invariantOk()) held++;
  if (a.median() !== truth || b.median() !== truth) mismatches++;
}
console.log('adds: ' + nums.length + ', invariant held after every add: ' + (held === nums.length));
console.log('median mismatches against a sorted list: ' + mismatches);
console.log('compare-first moves: ' + a.moves);
console.log('push-through moves:  ' + b.moves);

for (const pair of [[2147483647, 2147483647], [-2147483648, -2147483647]]) {
  const t = new TwoHeaps('compare-first');
  for (const x of pair) t.add(x);
  console.log('median of [' + pair.join(', ') + '] = ' + t.median().toFixed(1));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are keeping a running median with two \`PriorityQueue\`s in Java. State the invariant precisely, explain why it gives you the median, and show how \`addNum\` restores it after every insert. Why is one move between the heaps always enough?"

**What a strong answer should cover:**
- The order rule (max of the lower half ≤ min of the upper half) and the size rule (sizes equal, or the lower half has one more).
- Why the two rules together put the median at the tops: positions |low| and |low| + 1 in sorted order.
- The routing step and the case analysis showing one move restores the size rule; the order rule survives both routing and the move.
- The two common strategies (compare-first vs push-through) and their cost in heap operations.
- Java details: the max-heap comparator must not be \`(a, b) -> b - a\` (overflow silently breaks the order rule); widen to \`long\` before averaging; \`Integer\` tops compared with \`==\` compare references.

**Code / implementation expected:** Optional — an \`add\` method plus an \`invariantOk\` check in Java.`,
        answer: `**Target Audience:** Developers who have seen the two-heap median solution in Java and want to explain why it is correct.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a seesaw in a playground with a line painted across the middle. Children arrive one by one. Smaller children sit on the left, bigger ones on the right, and a teacher keeps the two sides with the same number of children, or one extra on the left. The child closest to the middle line on the left side, together with the one closest to it on the right, tells you where the middle of the class is.

Two rules keep that picture honest. **Every child on the left is no bigger than every child on the right** (the order rule), and **the left side has the same number of children as the right, or one more** (the size rule). When a new child arrives and breaks a rule, the teacher fixes it by moving *one* child across: the biggest from the left, or the smallest from the right.

The two-heap median solution is exactly this seesaw. The main question, [How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream), shows the full solution and the alternatives. This page is the part interviewers probe hardest: **what the invariant is, why it is enough, and why one move always restores it.** Candidates who can only recite the code tend to get lost the moment the interviewer asks "why only one move?" or "what if I change the size rule?".

## 2. The Invariant, Stated Precisely

Keep the numbers seen so far in two heaps:

- \`low\` — a **max-heap** holding the smaller half. Its top is \`max(low)\`.
- \`high\` — a **min-heap** holding the larger half. Its top is \`min(high)\`.

📌 **Interview term: Invariant** — a condition that holds before and after every operation. Correctness proofs work by showing each operation keeps it true.

The invariant is two rules:

1. **Order rule:** \`max(low) ≤ min(high)\`. Because both are heaps, checking the two tops is the same as checking that every element of \`low\` is ≤ every element of \`high\`.
2. **Size rule:** \`|low| = |high|\` or \`|low| = |high| + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Order rule: the top of low is at most the top of high. Size rule: low has the same size as high or one more">
  <rect class="d-box" x="30" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="72" text-anchor="middle">low (max-heap)</text>
  <text class="d-sub" x="170" y="98" text-anchor="middle">5, 35, 41  top = 41</text>
  <rect class="d-box" x="390" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="72" text-anchor="middle">high (min-heap)</text>
  <text class="d-sub" x="530" y="98" text-anchor="middle">62, 97  top = 62</text>
  <text class="d-text d-accent" x="350" y="86" text-anchor="middle">41 &#8804; 62</text>
  <rect class="d-box-accent" x="30" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="180" y="191" text-anchor="middle">order: max(low) &#8804; min(high)</text>
  <rect class="d-box-accent" x="370" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="520" y="191" text-anchor="middle">size: |low| = |high| or +1</text>
</svg>

The order rule splits the data at a point; the size rule puts that point exactly in the middle.

📌 **Interview term: Partition** — a split of the data into two groups where everything in the first group is ≤ everything in the second. The order rule says \`low\` and \`high\` form a partition.

## 3. Why the Invariant Gives the Median

Suppose n numbers have been added. Sort them in your head: positions 1 to n.

- The order rule says \`low\` holds the |low| *smallest* numbers, so they occupy positions 1 to |low|, and \`max(low)\` is the number at position |low|. Likewise \`min(high)\` is at position |low| + 1.
- **n odd, n = 2m + 1.** The size rule forces |low| = m + 1. The median is at position m + 1, which is \`max(low)\`.
- **n even, n = 2m.** The size rule forces |low| = m. The two middle numbers are at positions m and m + 1: \`max(low)\` and \`min(high)\`. The median is their average.

So the median is always computed from the tops alone, in O(1). Neither rule alone is enough: without the order rule the tops are not adjacent in sorted order; without the size rule they are adjacent, but not in the middle.

📌 **Interview term: Order statistic** — the element at a given position in sorted order (the k-th smallest). The median is the middle order statistic, and the invariant keeps it at a heap top.

## 4. Adding a Number: Route, Then Rebalance

The standard ("compare-first") add has two steps.

**Step 1 — route.** If \`low\` is empty or \`x ≤ max(low)\`, push \`x\` into \`low\`; otherwise push it into \`high\`.

*Why the order rule survives:* if \`x ≤ max(low)\`, then \`x ≤ max(low) ≤ min(high)\`, so \`low\` still contains nothing bigger than \`min(high)\`. If \`x > max(low)\`, then \`x\` is bigger than everything in \`low\`, so \`high\` still contains nothing smaller than \`max(low)\`. Either way the partition is intact.

**Step 2 — rebalance.** Before the add the sizes were (s, s) or (s + 1, s). One push makes them one of (s + 1, s), (s, s + 1), (s + 2, s) or (s + 1, s + 1). Two of those already satisfy the size rule; the other two are off by exactly one element:

| Sizes after routing | Rule broken? | Fix |
| :--- | :--- | :--- |
| (s + 1, s) | no | — |
| (s + 1, s + 1) | no | — |
| (s + 2, s) | \`low\` too big | move \`max(low)\` into \`high\` |
| (s, s + 1) | \`high\` too big | move \`min(high)\` into \`low\` |

*Why the move keeps the order rule:* \`max(low)\` is ≤ every element of \`high\`, so when it moves it becomes the new \`min(high)\`, and the remaining \`low\` is still below it. Symmetrically, \`min(high)\` is ≥ everything in \`low\`, so it becomes the new \`max(low)\`.

*Why one move is always enough:* the sizes can only be off by one element after one push, and one move changes the difference by two, from +2 to 0, or from −1 to +1. So an \`if\`, not a \`while\`, is correct. Writing \`while\` is harmless but signals that you have not done the case analysis.

📌 **Interview term: Rebalancing** — restoring the size rule by moving a heap top from one heap to the other. Each move is one pop plus one push, O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="After adding 35, low holds 35 and 41 and high is empty, so the top 41 moves from low to high">
  <defs>
    <marker id="b20q3ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="24" text-anchor="middle">add 35: low has 2, high has 0</text>
  <rect class="d-box" x="40" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="160" y="92" text-anchor="middle">low</text>
  <text class="d-sub" x="160" y="118" text-anchor="middle">35, 41  (size 2)</text>
  <rect class="d-box" x="420" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">high</text>
  <text class="d-sub" x="540" y="118" text-anchor="middle">empty  (size 0)</text>
  <path class="d-edge-accent" d="M 284 100 L 414 100" marker-end="url(#b20q3ja-a1)"/>
  <text class="d-sub" x="350" y="88" text-anchor="middle">move 41</text>
  <rect class="d-box-muted" x="200" y="160" width="300" height="40" rx="8"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">now 1 and 1, median 38.0</text>
</svg>

Adding 35 to the stream \`41\` routes it to \`low\` (35 ≤ 41), making the sizes (2, 0). One move of \`max(low)\` = 41 restores (1, 1), and the median becomes (35 + 41) / 2 = 38.0. Example 1 traces seven adds like this.

## 5. A Second Strategy: "Push Through" \`low\`

Many published solutions skip the comparison:

1. Push \`x\` into \`low\`.
2. Pop \`max(low)\` and push it into \`high\`. (This is always done.)
3. If \`|high| > |low|\`, pop \`min(high)\` and push it into \`low\`.

It is correct for the same reasons: step 2 hands the largest of \`low ∪ {x}\` to \`high\`, which keeps the partition, and step 3 is the same one-move rebalance. It is shorter to write and has no routing branch, but it **always** does at least one move. Example 2 counts both strategies on 5,000 numbers: compare-first moved 2,502 numbers between heaps, push-through moved 7,500 (one per add, plus a move back on half of them). Both give the same median after every add.

📌 **Interview term: Amortised vs worst-case cost** — here both strategies are O(log n) per add in the worst case; the difference is the constant number of heap operations (up to 2 vs up to 3, plus the extra moves).

## 6. The Code in Java

\`low\` is \`new PriorityQueue<>(Collections.reverseOrder())\` (a max-heap) and \`high\` a plain \`PriorityQueue\` (a min-heap). Here is the add with both strategies, from example 2:

~~~java
void add(int x) {
    if (compareFirst) {
        if (low.isEmpty() || x <= low.peek()) low.offer(x); else high.offer(x);
        if (low.size() > high.size() + 1) { high.offer(low.poll()); moves++; }
        else if (high.size() > low.size()) { low.offer(high.poll()); moves++; }
    } else { // push-through: always go through low, then hand its max to high
        low.offer(x);
        high.offer(low.poll()); moves++;
        if (high.size() > low.size()) { low.offer(high.poll()); moves++; }
    }
}
~~~

And the invariant check, which example 2 runs after every one of 5,000 adds:

~~~java
boolean invariantOk() {
    boolean sizesOk = low.size() == high.size() || low.size() == high.size() + 1;
    // peek() returns Integer: compare with <=, which unboxes; == would compare references
    boolean orderOk = high.isEmpty() || low.peek() <= high.peek();
    return sizesOk && orderOk;
}
~~~

**What to point out in this code:**

- \`low.peek() <= high.peek()\` unboxes both \`Integer\`s and compares values. \`low.peek() == high.peek()\` would compare object references.
- \`high.offer(low.poll())\` moves one top: \`poll\` is O(log n) and so is \`offer\`.
- The order rule can be broken by the comparator itself. The well-known shortcut \`(a, b) -> b - a\` overflows when the values are far apart, so the "max-heap" stops returning the maximum. We ran it, together with the averaging overflow:

~~~java
import java.util.*;
public class Main {
    public static void main(String[] args) {
        PriorityQueue<Integer> bad = new PriorityQueue<>((a, b) -> b - a);
        PriorityQueue<Integer> good = new PriorityQueue<>(Collections.reverseOrder());
        for (int x : new int[]{Integer.MIN_VALUE, 1, 0}) { bad.offer(x); good.offer(x); }
        System.out.println("(a, b) -> b - a       top: " + bad.peek());
        System.out.println("reverseOrder()        top: " + good.peek());
        Integer lo = 2147483647, hi = 2147483647;
        System.out.println("(lo + hi) / 2.0        = " + (lo + hi) / 2.0);
        System.out.println("((long) lo + hi) / 2.0 = " + ((long) lo + hi) / 2.0);
        Integer p = 1000, q = 1000;
        System.out.println("Integer 1000 == 1000: " + (p == q) + ", equals: " + p.equals(q));
    }
}

~~~

~~~text
(a, b) -> b - a       top: 0
reverseOrder()        top: 1
(lo + hi) / 2.0        = -1.0
((long) lo + hi) / 2.0 = 2.147483647E9
Integer 1000 == 1000: false, equals: true
~~~

  With \`Integer.MIN_VALUE\`, 1 and 0 in the heap, the subtracting comparator put 0 on top instead of 1, so \`max(low)\` is wrong and the invariant is broken before any of our own logic runs. \`Collections.reverseOrder()\` got it right. The same run shows why \`findMedian\` widens to \`long\`, and why it prints with \`String.format("%.1f", ...)\` rather than string concatenation (which gives \`2.147483647E9\`).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK (javac + java)). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — a trace of seven adds, printing the route, any rebalance, both heaps (sorted for display) and the median** prints:

~~~text
add 41 -> low
  low [41]  high []  median 41.0
add 35 -> low
  low too big: move 41 to high
  low [35]  high [41]  median 38.0
add 62 -> high
  high too big: move 41 to low
  low [35, 41]  high [62]  median 41.0
add 5 -> low
  low too big: move 41 to high
  low [5, 35]  high [41, 62]  median 38.0
add 97 -> high
  high too big: move 41 to low
  low [5, 35, 41]  high [62, 97]  median 41.0
add 108 -> high
  low [5, 35, 41]  high [62, 97, 108]  median 51.5
add 4 -> low
  low [4, 5, 35, 41]  high [62, 97, 108]  median 41.0
~~~

Read it against the case table in section 4: adds of 35, 62, 5 and 97 each needed exactly one move, and adds of 41, 108 and 4 needed none. The order rule holds on every line (\`max(low)\` is 41 or less, \`min(high)\` is 41 or more).

**Example 2 — both strategies on 5,000 random numbers, the invariant checked after every add, medians compared with a sorted reference, and two overflow-prone pairs** prints:

~~~text
adds: 5000, invariant held after every add: true
median mismatches against a sorted list: 0
compare-first moves: 2502
push-through moves:  7500
median of [2147483647, 2147483647] = 2147483647.0
median of [-2147483648, -2147483647] = -2147483647.5
~~~

## 8. Reading the Results

- "Invariant held after every add: true" for both strategies, and zero median mismatches against the sorted reference.
- Compare-first moved 2,502 numbers for 5,000 adds, about one every two adds, which is what the case table predicts for random input. Push-through moved 7,500: 5,000 unconditional moves plus 2,500 moves back.
- The last two lines use the extremes of the 32-bit range. The correct medians are 2147483647.0 and -2147483647.5; an implementation that adds two \`int\`s before widening gets them wrong in Java and C++.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Route (compare with \`max(low)\`, push) | O(log n) | one O(1) peek and one heap push |
| Rebalance | O(log n) | at most one pop and one push (the case table above) |
| Median | O(1) | read one or two tops |
| Check the invariant | O(1) | compare the two tops and the two sizes |
| Space | O(n) | every number lives in exactly one heap |

## 10. Changing the Rules (Common Follow-Ups)

- **"Let \`high\` hold the extra element instead."** Mirror everything: the size rule becomes \`|high| = |low|\` or \`|high| = |low| + 1\`, and the odd-count median is \`min(high)\`. Pick one convention and keep it everywhere; mixing them is a classic bug.
- **"The 90th percentile instead of the median."** Change only the size rule: keep \`|low| = ⌈0.9·n⌉\`. The order rule and the move logic stay the same, and \`max(low)\` is the answer.
- **"Numbers can also be removed."** A heap can only remove its top cheaply. Mark removed values in a hash map and discard them when they reach a top (lazy deletion), and keep separate counts of *live* elements for the size rule. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).
- **"Add many numbers at once."** Pushing them one by one keeps the invariant cheaply. Building both heaps from scratch would need a selection step first (quickselect to split around the median), then heapify each half.

## 11. Edge Cases

- **First add.** \`low\` is empty, so the routing must not peek; the number goes to \`low\` and no move is needed (sizes (1, 0)).
- **Equal numbers.** Routing uses ≤, so a number equal to \`max(low)\` goes to \`low\`; ties never break the order rule because ≤ allows equality.
- **A number between the two tops** (for example 50 when the tops are 41 and 62). It goes to \`high\` (50 > 41), and the order rule still holds: 41 ≤ 50.
- **Extreme values.** The rules are about comparisons only; the arithmetic danger is the average of the two tops, covered by example 2.
- **Median before any add.** Both heaps are empty; return an error or a sentinel, as agreed with the interviewer.

## Common Pitfalls

- **\`(a, b) -> b - a\` for the max-heap.** Overflows for extreme values: the top was 0 instead of 1 in our run. Use \`Collections.reverseOrder()\` or \`(a, b) -> Integer.compare(b, a)\`.
- **Averaging two \`int\` tops without widening.** \`(lo + hi) / 2.0\` printed -1.0 for two copies of \`Integer.MAX_VALUE\`.
- **Comparing \`Integer\` tops with \`==\`.** Reference comparison; it fails above the -128..127 cache (\`1000 == 1000\` was \`false\`).
- **Unboxing an empty \`peek()\`.** \`x <= low.peek()\` on an empty queue throws \`NullPointerException\`.
- **Reading the odd-count median from the wrong heap.** With "low has the extra one", the answer is \`low.peek()\`, never \`high.peek()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The invariant:</strong> <span style="color:#f0e2c8;">Order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek() &lt;= high.peek()</code>. Size: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.size() == high.size()</code> or one more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it gives the median:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds the smallest |low| numbers, so its top is at sorted position |low| and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.peek()</code> at |low| + 1: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Route:</strong> <span style="color:#f0e2c8;">Empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.peek()</code> goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. Either side keeps the order rule.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rebalance:</strong> <span style="color:#f0e2c8;">After one offer the sizes are off by at most one element, so one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> fixes it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code> for the max-heap, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b - a</code>; widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> before averaging.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">b - a</code> dangerous here specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the comparator lies, the heap order is wrong, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> is not the max and the order rule fails before your code runs. In our run the top came out as 0 instead of 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">low</code> were allowed to be two bigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 5 numbers split 4 and 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.peek()</code> is at sorted position 4, not 3; the median is buried inside the heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Compare-first or push-through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same correctness and Big-O. Push-through always moves at least once: 7,500 moves vs 2,502 for 5,000 adds in example 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the invariant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Random stream, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invariantOk()</code> after every add, and a sorted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> reference kept with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.binarySearch</code>. Example 2: zero mismatches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would removals change it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue.remove(Object)</code> is O(n) per the Javadoc. For many removals, use lazy deletion and count live elements for the size rule.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invariant** | A condition true before and after every operation |
| **Partition** | A split where everything in the first group is ≤ everything in the second |
| **Order statistic** | The element at a given position in sorted order; the median is the middle one |
| **Rebalancing** | Moving one heap top to the other heap to restore the size rule |
| **Amortised vs worst-case cost** | Average cost per operation over a sequence vs the cost of the single worst operation |
| **Comparator overflow** | A comparator written as a - b wrapping around for far-apart ints and returning the wrong sign |

---
**Conclusion:** The two-heap median rests on two rules: the lower half never exceeds the upper half, and the lower half has the same size or one more. Together they pin the middle of the sorted order to the heap tops. Routing by the top of \`low\` keeps the order rule, and because one offer unbalances the sizes by at most one element, a single move restores the size rule. In Java, protect the invariant at its foundation: a correct max-heap comparator (\`Collections.reverseOrder()\`), \`long\` arithmetic for the average, and value comparisons on \`Integer\`s.`,
        examples: [
          {
            label: `Trace: route, rebalance and median for seven adds`,
            code: `import java.util.*;

public class Main {
    // Trace the two-heap invariant: every number in low <= every number in high,
    // and low.size() == high.size() or low.size() == high.size() + 1.
    static PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
    static PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap

    static String show(PriorityQueue<Integer> h) {
        List<Integer> xs = new ArrayList<>(h); // a PriorityQueue iterates in heap order, not sorted
        Collections.sort(xs);
        return xs.toString();
    }

    static String median() {
        if (low.size() > high.size()) return String.format("%.1f", (double) low.peek());
        return String.format("%.1f", ((long) low.peek() + high.peek()) / 2.0);
    }

    public static void main(String[] args) {
        for (int x : new int[]{41, 35, 62, 5, 97, 108, 4}) {
            // step 1: route by value, compared with the top of low
            String side;
            if (low.isEmpty() || x <= low.peek()) { low.offer(x); side = "low"; }
            else { high.offer(x); side = "high"; }
            System.out.println("add " + x + " -> " + side);
            // step 2: restore the size rule with at most one move
            if (low.size() > high.size() + 1) {
                int moved = low.poll();
                high.offer(moved);
                System.out.println("  low too big: move " + moved + " to high");
            } else if (high.size() > low.size()) {
                int moved = high.poll();
                low.offer(moved);
                System.out.println("  high too big: move " + moved + " to low");
            }
            System.out.println("  low " + show(low) + "  high " + show(high) + "  median " + median());
        }
    }
}`,
          },
          {
            label: `Invariant check on 5000 adds, two strategies, overflow pairs`,
            code: `import java.util.*;

public class Main {
    // Check the invariant after every add, and compare the two common add strategies.
    static class TwoHeaps {
        final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
        final PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap
        final boolean compareFirst;
        int moves = 0; // numbers moved from one heap to the other

        TwoHeaps(boolean compareFirst) { this.compareFirst = compareFirst; }

        void add(int x) {
            if (compareFirst) {
                if (low.isEmpty() || x <= low.peek()) low.offer(x); else high.offer(x);
                if (low.size() > high.size() + 1) { high.offer(low.poll()); moves++; }
                else if (high.size() > low.size()) { low.offer(high.poll()); moves++; }
            } else { // push-through: always go through low, then hand its max to high
                low.offer(x);
                high.offer(low.poll()); moves++;
                if (high.size() > low.size()) { low.offer(high.poll()); moves++; }
            }
        }

        boolean invariantOk() {
            boolean sizesOk = low.size() == high.size() || low.size() == high.size() + 1;
            // peek() returns Integer: compare with <=, which unboxes; == would compare references
            boolean orderOk = high.isEmpty() || low.peek() <= high.peek();
            return sizesOk && orderOk;
        }

        double median() {
            if (low.size() > high.size()) return low.peek();
            return ((long) low.peek() + high.peek()) / 2.0; // long first: int + int can overflow
        }
    }

    static int[] stream(int n, long seed) {
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647;    // MINSTD; long, because the product overflows int
            out[i] = (int) (seed % 2001) - 1000; // values -1000..1000
        }
        return out;
    }

    public static void main(String[] args) {
        int[] nums = stream(5000, 3);
        TwoHeaps a = new TwoHeaps(true), b = new TwoHeaps(false);
        List<Integer> reference = new ArrayList<>();
        int held = 0, mismatches = 0;
        for (int x : nums) {
            a.add(x); b.add(x);
            int pos = Collections.binarySearch(reference, x);
            reference.add(pos >= 0 ? pos : -pos - 1, x);
            int n = reference.size();
            double truth = ((long) reference.get(n / 2) + reference.get((n - 1) / 2)) / 2.0;
            if (a.invariantOk() && b.invariantOk()) held++;
            if (a.median() != truth || b.median() != truth) mismatches++;
        }
        System.out.println("adds: " + nums.length + ", invariant held after every add: " + (held == nums.length));
        System.out.println("median mismatches against a sorted list: " + mismatches);
        System.out.println("compare-first moves: " + a.moves);
        System.out.println("push-through moves:  " + b.moves);

        for (int[] pair : new int[][]{{2147483647, 2147483647}, {-2147483648, -2147483647}}) {
            TwoHeaps t = new TwoHeaps(true);
            for (int x : pair) t.add(x);
            System.out.println("median of [" + pair[0] + ", " + pair[1] + "] = " + String.format("%.1f", t.median()));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are keeping a running median with two \`std::priority_queue\`s in C++. State the invariant precisely, explain why it gives you the median, and show how \`addNum\` restores it after every insert. Why is one move between the heaps always enough?"

**What a strong answer should cover:**
- The order rule (max of the lower half ≤ min of the upper half) and the size rule (sizes equal, or the lower half has one more).
- Why the two rules together put the median at the tops: positions |low| and |low| + 1 in sorted order.
- The routing step and the case analysis showing one move restores the size rule; the order rule survives both routing and the move.
- The two common strategies (compare-first vs push-through) and their cost in heap operations.
- C++ details: \`priority_queue<int>\` is the max-heap and \`greater<int>\` gives the min-heap; \`pop()\` returns \`void\`, so a move is \`push(top())\` then \`pop()\`; \`size_t\` arithmetic and signed overflow are undefined-behaviour traps.

**Code / implementation expected:** Optional — an \`add\` method plus an \`invariantOk\` check in C++17.`,
        answer: `**Target Audience:** Developers who have seen the two-heap median solution in C++ and want to explain why it is correct.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a seesaw in a playground with a line painted across the middle. Children arrive one by one. Smaller children sit on the left, bigger ones on the right, and a teacher keeps the two sides with the same number of children, or one extra on the left. The child closest to the middle line on the left side, together with the one closest to it on the right, tells you where the middle of the class is.

Two rules keep that picture honest. **Every child on the left is no bigger than every child on the right** (the order rule), and **the left side has the same number of children as the right, or one more** (the size rule). When a new child arrives and breaks a rule, the teacher fixes it by moving *one* child across: the biggest from the left, or the smallest from the right.

The two-heap median solution is exactly this seesaw. The main question, [How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream), shows the full solution and the alternatives. This page is the part interviewers probe hardest: **what the invariant is, why it is enough, and why one move always restores it.** Candidates who can only recite the code tend to get lost the moment the interviewer asks "why only one move?" or "what if I change the size rule?".

## 2. The Invariant, Stated Precisely

Keep the numbers seen so far in two heaps:

- \`low\` — a **max-heap** holding the smaller half. Its top is \`max(low)\`.
- \`high\` — a **min-heap** holding the larger half. Its top is \`min(high)\`.

📌 **Interview term: Invariant** — a condition that holds before and after every operation. Correctness proofs work by showing each operation keeps it true.

The invariant is two rules:

1. **Order rule:** \`max(low) ≤ min(high)\`. Because both are heaps, checking the two tops is the same as checking that every element of \`low\` is ≤ every element of \`high\`.
2. **Size rule:** \`|low| = |high|\` or \`|low| = |high| + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Order rule: the top of low is at most the top of high. Size rule: low has the same size as high or one more">
  <rect class="d-box" x="30" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="72" text-anchor="middle">low (max-heap)</text>
  <text class="d-sub" x="170" y="98" text-anchor="middle">5, 35, 41  top = 41</text>
  <rect class="d-box" x="390" y="40" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="72" text-anchor="middle">high (min-heap)</text>
  <text class="d-sub" x="530" y="98" text-anchor="middle">62, 97  top = 62</text>
  <text class="d-text d-accent" x="350" y="86" text-anchor="middle">41 &#8804; 62</text>
  <rect class="d-box-accent" x="30" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="180" y="191" text-anchor="middle">order: max(low) &#8804; min(high)</text>
  <rect class="d-box-accent" x="370" y="160" width="300" height="50" rx="10"/>
  <text class="d-text" x="520" y="191" text-anchor="middle">size: |low| = |high| or +1</text>
</svg>

The order rule splits the data at a point; the size rule puts that point exactly in the middle.

📌 **Interview term: Partition** — a split of the data into two groups where everything in the first group is ≤ everything in the second. The order rule says \`low\` and \`high\` form a partition.

## 3. Why the Invariant Gives the Median

Suppose n numbers have been added. Sort them in your head: positions 1 to n.

- The order rule says \`low\` holds the |low| *smallest* numbers, so they occupy positions 1 to |low|, and \`max(low)\` is the number at position |low|. Likewise \`min(high)\` is at position |low| + 1.
- **n odd, n = 2m + 1.** The size rule forces |low| = m + 1. The median is at position m + 1, which is \`max(low)\`.
- **n even, n = 2m.** The size rule forces |low| = m. The two middle numbers are at positions m and m + 1: \`max(low)\` and \`min(high)\`. The median is their average.

So the median is always computed from the tops alone, in O(1). Neither rule alone is enough: without the order rule the tops are not adjacent in sorted order; without the size rule they are adjacent, but not in the middle.

📌 **Interview term: Order statistic** — the element at a given position in sorted order (the k-th smallest). The median is the middle order statistic, and the invariant keeps it at a heap top.

## 4. Adding a Number: Route, Then Rebalance

The standard ("compare-first") add has two steps.

**Step 1 — route.** If \`low\` is empty or \`x ≤ max(low)\`, push \`x\` into \`low\`; otherwise push it into \`high\`.

*Why the order rule survives:* if \`x ≤ max(low)\`, then \`x ≤ max(low) ≤ min(high)\`, so \`low\` still contains nothing bigger than \`min(high)\`. If \`x > max(low)\`, then \`x\` is bigger than everything in \`low\`, so \`high\` still contains nothing smaller than \`max(low)\`. Either way the partition is intact.

**Step 2 — rebalance.** Before the add the sizes were (s, s) or (s + 1, s). One push makes them one of (s + 1, s), (s, s + 1), (s + 2, s) or (s + 1, s + 1). Two of those already satisfy the size rule; the other two are off by exactly one element:

| Sizes after routing | Rule broken? | Fix |
| :--- | :--- | :--- |
| (s + 1, s) | no | — |
| (s + 1, s + 1) | no | — |
| (s + 2, s) | \`low\` too big | move \`max(low)\` into \`high\` |
| (s, s + 1) | \`high\` too big | move \`min(high)\` into \`low\` |

*Why the move keeps the order rule:* \`max(low)\` is ≤ every element of \`high\`, so when it moves it becomes the new \`min(high)\`, and the remaining \`low\` is still below it. Symmetrically, \`min(high)\` is ≥ everything in \`low\`, so it becomes the new \`max(low)\`.

*Why one move is always enough:* the sizes can only be off by one element after one push, and one move changes the difference by two, from +2 to 0, or from −1 to +1. So an \`if\`, not a \`while\`, is correct. Writing \`while\` is harmless but signals that you have not done the case analysis.

📌 **Interview term: Rebalancing** — restoring the size rule by moving a heap top from one heap to the other. Each move is one pop plus one push, O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="After adding 35, low holds 35 and 41 and high is empty, so the top 41 moves from low to high">
  <defs>
    <marker id="b20q3cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="24" text-anchor="middle">add 35: low has 2, high has 0</text>
  <rect class="d-box" x="40" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="160" y="92" text-anchor="middle">low</text>
  <text class="d-sub" x="160" y="118" text-anchor="middle">35, 41  (size 2)</text>
  <rect class="d-box" x="420" y="60" width="240" height="80" rx="10"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">high</text>
  <text class="d-sub" x="540" y="118" text-anchor="middle">empty  (size 0)</text>
  <path class="d-edge-accent" d="M 284 100 L 414 100" marker-end="url(#b20q3cp-a1)"/>
  <text class="d-sub" x="350" y="88" text-anchor="middle">move 41</text>
  <rect class="d-box-muted" x="200" y="160" width="300" height="40" rx="8"/>
  <text class="d-text" x="350" y="186" text-anchor="middle">now 1 and 1, median 38.0</text>
</svg>

Adding 35 to the stream \`41\` routes it to \`low\` (35 ≤ 41), making the sizes (2, 0). One move of \`max(low)\` = 41 restores (1, 1), and the median becomes (35 + 41) / 2 = 38.0. Example 1 traces seven adds like this.

## 5. A Second Strategy: "Push Through" \`low\`

Many published solutions skip the comparison:

1. Push \`x\` into \`low\`.
2. Pop \`max(low)\` and push it into \`high\`. (This is always done.)
3. If \`|high| > |low|\`, pop \`min(high)\` and push it into \`low\`.

It is correct for the same reasons: step 2 hands the largest of \`low ∪ {x}\` to \`high\`, which keeps the partition, and step 3 is the same one-move rebalance. It is shorter to write and has no routing branch, but it **always** does at least one move. Example 2 counts both strategies on 5,000 numbers: compare-first moved 2,502 numbers between heaps, push-through moved 7,500 (one per add, plus a move back on half of them). Both give the same median after every add.

📌 **Interview term: Amortised vs worst-case cost** — here both strategies are O(log n) per add in the worst case; the difference is the constant number of heap operations (up to 2 vs up to 3, plus the extra moves).

## 6. The Code in C++

\`low\` is \`priority_queue<int>\` (a max-heap by default) and \`high\` is \`priority_queue<int, vector<int>, greater<int>>\` (a min-heap). Moves are two small helpers, because \`pop()\` returns nothing:

~~~cpp
void lowToHigh() { high.push(low.top()); low.pop(); moves++; }
void highToLow() { low.push(high.top()); high.pop(); moves++; }
~~~

Here is the add with both strategies, from example 2:

~~~cpp
void add(int x) {
    if (compareFirst) {
        if (low.empty() || x <= low.top()) low.push(x); else high.push(x);
        if (low.size() > high.size() + 1) lowToHigh();
        else if (high.size() > low.size()) highToLow();
    } else {  // push-through: always go through low, then hand its max to high
        low.push(x);
        lowToHigh();
        if (high.size() > low.size()) highToLow();
    }
}
~~~

And the invariant check, which example 2 runs after every one of 5,000 adds:

~~~cpp
bool invariantOk() const {
    bool sizesOk = low.size() == high.size() || low.size() == high.size() + 1;
    bool orderOk = high.empty() || low.top() <= high.top();
    return sizesOk && orderOk;
}
~~~

**What to point out in this code:**

- The size checks are written \`low.size() > high.size() + 1\` and \`high.size() > low.size()\`, never \`low.size() - high.size() > 1\`. \`size()\` returns an unsigned \`size_t\`, so the subtraction wraps to a huge number whenever \`high\` is bigger, and the "rebalance" would fire at the wrong time.
- \`invariantOk\` checks only the tops and sizes. That is enough because \`priority_queue\` keeps its vector a valid heap, so \`top()\` really is the max or min.
- \`median()\` widens to \`long long\` before adding. We ran the narrow version separately with two copies of \`INT_MAX\`:

~~~text
(lo + hi) / 2.0 = -1.0
((long long)lo + hi) / 2.0 = 2147483647.0
~~~

  Signed overflow is undefined behaviour; this was one g++ -O2 result, and a different compiler or flag may print something else. Never rely on it.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — a trace of seven adds, printing the route, any rebalance, both heaps (sorted for display) and the median** prints:

~~~text
add 41 -> low
  low [41]  high []  median 41.0
add 35 -> low
  low too big: move 41 to high
  low [35]  high [41]  median 38.0
add 62 -> high
  high too big: move 41 to low
  low [35, 41]  high [62]  median 41.0
add 5 -> low
  low too big: move 41 to high
  low [5, 35]  high [41, 62]  median 38.0
add 97 -> high
  high too big: move 41 to low
  low [5, 35, 41]  high [62, 97]  median 41.0
add 108 -> high
  low [5, 35, 41]  high [62, 97, 108]  median 51.5
add 4 -> low
  low [4, 5, 35, 41]  high [62, 97, 108]  median 41.0
~~~

Read it against the case table in section 4: adds of 35, 62, 5 and 97 each needed exactly one move, and adds of 41, 108 and 4 needed none. The order rule holds on every line (\`max(low)\` is 41 or less, \`min(high)\` is 41 or more).

**Example 2 — both strategies on 5,000 random numbers, the invariant checked after every add, medians compared with a sorted reference, and two overflow-prone pairs** prints:

~~~text
adds: 5000, invariant held after every add: true
median mismatches against a sorted list: 0
compare-first moves: 2502
push-through moves:  7500
median of [2147483647, 2147483647] = 2147483647.0
median of [-2147483648, -2147483647] = -2147483647.5
~~~

## 8. Reading the Results

- "Invariant held after every add: true" for both strategies, and zero median mismatches against the sorted reference.
- Compare-first moved 2,502 numbers for 5,000 adds, about one every two adds, which is what the case table predicts for random input. Push-through moved 7,500: 5,000 unconditional moves plus 2,500 moves back.
- The last two lines use the extremes of the 32-bit range. The correct medians are 2147483647.0 and -2147483647.5; an implementation that adds two \`int\`s before widening gets them wrong in Java and C++.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Route (compare with \`max(low)\`, push) | O(log n) | one O(1) peek and one heap push |
| Rebalance | O(log n) | at most one pop and one push (the case table above) |
| Median | O(1) | read one or two tops |
| Check the invariant | O(1) | compare the two tops and the two sizes |
| Space | O(n) | every number lives in exactly one heap |

## 10. Changing the Rules (Common Follow-Ups)

- **"Let \`high\` hold the extra element instead."** Mirror everything: the size rule becomes \`|high| = |low|\` or \`|high| = |low| + 1\`, and the odd-count median is \`min(high)\`. Pick one convention and keep it everywhere; mixing them is a classic bug.
- **"The 90th percentile instead of the median."** Change only the size rule: keep \`|low| = ⌈0.9·n⌉\`. The order rule and the move logic stay the same, and \`max(low)\` is the answer.
- **"Numbers can also be removed."** A heap can only remove its top cheaply. Mark removed values in a hash map and discard them when they reach a top (lazy deletion), and keep separate counts of *live* elements for the size rule. That is the [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).
- **"Add many numbers at once."** Pushing them one by one keeps the invariant cheaply. Building both heaps from scratch would need a selection step first (quickselect to split around the median), then heapify each half.

## 11. Edge Cases

- **First add.** \`low\` is empty, so the routing must not peek; the number goes to \`low\` and no move is needed (sizes (1, 0)).
- **Equal numbers.** Routing uses ≤, so a number equal to \`max(low)\` goes to \`low\`; ties never break the order rule because ≤ allows equality.
- **A number between the two tops** (for example 50 when the tops are 41 and 62). It goes to \`high\` (50 > 41), and the order rule still holds: 41 ≤ 50.
- **Extreme values.** The rules are about comparisons only; the arithmetic danger is the average of the two tops, covered by example 2.
- **Median before any add.** Both heaps are empty; return an error or a sentinel, as agreed with the interviewer.

## Common Pitfalls

- **Unsigned subtraction in the size rule.** \`low.size() - high.size() > 1\` is true whenever \`high\` is bigger, because \`size_t\` wraps. Compare with \`+ 1\` on the other side.
- **Signed overflow when averaging.** \`(low.top() + high.top()) / 2.0\` printed -1.0 for two \`INT_MAX\`s in our build; it is undefined behaviour. Widen first.
- **\`top()\` on an empty queue.** Undefined behaviour, no exception. Check \`empty()\` before routing.
- **Swapping the heap types.** \`priority_queue<int>\` for \`high\` makes both halves max-heaps; the order rule then fails on the second add.
- **Reading the odd-count median from the wrong heap.** With "low has the extra one", the answer is \`low.top()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The invariant:</strong> <span style="color:#f0e2c8;">Order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.top() &lt;= high.top()</code>. Size: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.size() == high.size()</code> or one more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it gives the median:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds the smallest |low| numbers, so its top is at sorted position |low| and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.top()</code> at |low| + 1: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Route:</strong> <span style="color:#f0e2c8;">Empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.top()</code> goes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. Either side keeps the order rule.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Rebalance:</strong> <span style="color:#f0e2c8;">After one push the sizes are off by at most one element, so one move (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push(top())</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>) fixes it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int&gt;</code> is the max-heap, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;int&gt;</code> the min-heap; compare sizes without unsigned subtraction and widen before averaging.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is checking the two tops enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.top()</code> is the maximum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high.top()</code> the minimum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>. If max ≤ min, every pair is in order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">low</code> were allowed to be two bigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 5 numbers split 4 and 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low.top()</code> is at sorted position 4, not 3; the median is buried inside the heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Compare-first or push-through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same correctness and Big-O. Push-through always moves at least once: 7,500 moves vs 2,502 for 5,000 adds in example 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the invariant?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Random stream, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invariantOk()</code> after every add, and a sorted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> reference kept with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>. Example 2: zero mismatches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would removals change it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> cannot erase arbitrary elements. Either use lazy deletion with live counts, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::multiset</code> with an iterator at the median, which supports erase directly.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invariant** | A condition true before and after every operation |
| **Partition** | A split where everything in the first group is ≤ everything in the second |
| **Order statistic** | The element at a given position in sorted order; the median is the middle one |
| **Rebalancing** | Moving one heap top to the other heap to restore the size rule |
| **Amortised vs worst-case cost** | Average cost per operation over a sequence vs the cost of the single worst operation |
| **Undefined behaviour** | C++ code, such as signed overflow, whose result the standard does not define |

---
**Conclusion:** The two-heap median rests on two rules: the lower half never exceeds the upper half, and the lower half has the same size or one more. Together they pin the middle of the sorted order to the heap tops. Routing by the top of \`low\` keeps the order rule, and because one push unbalances the sizes by at most one element, a single move restores the size rule. In C++, the invariant's enemies are undefined behaviour and unsigned arithmetic: compare sizes without subtracting, widen before averaging, and never call \`top()\` on an empty queue.`,
        examples: [
          {
            label: `Trace: route, rebalance and median for seven adds`,
            code: `#include <algorithm>
#include <cstdio>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

// Trace the two-heap invariant: every number in low <= every number in high,
// and low.size() == high.size() or low.size() == high.size() + 1.
priority_queue<int> low;                              // max-heap (the default)
priority_queue<int, vector<int>, greater<int>> high;  // min-heap

template <class PQ>
string show(PQ h) {  // taken by value: popping the copy prints it in order
    vector<int> xs;
    while (!h.empty()) { xs.push_back(h.top()); h.pop(); }
    sort(xs.begin(), xs.end());
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

string median() {
    char buf[32];
    if (low.size() > high.size()) snprintf(buf, sizeof buf, "%.1f", (double)low.top());
    else snprintf(buf, sizeof buf, "%.1f", ((long long)low.top() + high.top()) / 2.0);
    return buf;
}

int main() {
    for (int x : {41, 35, 62, 5, 97, 108, 4}) {
        // step 1: route by value, compared with the top of low
        string side;
        if (low.empty() || x <= low.top()) { low.push(x); side = "low"; }
        else { high.push(x); side = "high"; }
        cout << "add " << x << " -> " << side << "\\n";
        // step 2: restore the size rule with at most one move
        if (low.size() > high.size() + 1) {
            int moved = low.top(); low.pop();
            high.push(moved);
            cout << "  low too big: move " << moved << " to high\\n";
        } else if (high.size() > low.size()) {
            int moved = high.top(); high.pop();
            low.push(moved);
            cout << "  high too big: move " << moved << " to low\\n";
        }
        cout << "  low " << show(low) << "  high " << show(high) << "  median " << median() << "\\n";
    }
}`,
          },
          {
            label: `Invariant check on 5000 adds, two strategies, overflow pairs`,
            code: `#include <algorithm>
#include <cstdio>
#include <functional>
#include <queue>
#include <vector>
using namespace std;

// Check the invariant after every add, and compare the two common add strategies.
struct TwoHeaps {
    priority_queue<int> low;                              // max-heap
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap
    bool compareFirst;
    int moves = 0;  // numbers moved from one heap to the other

    explicit TwoHeaps(bool cf) : compareFirst(cf) {}

    void lowToHigh() { high.push(low.top()); low.pop(); moves++; }
    void highToLow() { low.push(high.top()); high.pop(); moves++; }

    void add(int x) {
        if (compareFirst) {
            if (low.empty() || x <= low.top()) low.push(x); else high.push(x);
            if (low.size() > high.size() + 1) lowToHigh();
            else if (high.size() > low.size()) highToLow();
        } else {  // push-through: always go through low, then hand its max to high
            low.push(x);
            lowToHigh();
            if (high.size() > low.size()) highToLow();
        }
    }

    bool invariantOk() const {
        bool sizesOk = low.size() == high.size() || low.size() == high.size() + 1;
        bool orderOk = high.empty() || low.top() <= high.top();
        return sizesOk && orderOk;
    }

    double median() const {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // widen first: int + int can overflow (UB)
    }
};

vector<int> makeStream(int n, long long seed) {
    vector<int> out;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647;         // MINSTD; long long, the product overflows int
        out.push_back((int)(seed % 2001) - 1000);  // values -1000..1000
    }
    return out;
}

int main() {
    vector<int> nums = makeStream(5000, 3);
    TwoHeaps a(true), b(false);
    vector<int> reference;
    int held = 0, mismatches = 0;
    for (int x : nums) {
        a.add(x); b.add(x);
        reference.insert(upper_bound(reference.begin(), reference.end(), x), x);
        size_t n = reference.size();
        double truth = ((long long)reference[n / 2] + reference[(n - 1) / 2]) / 2.0;
        if (a.invariantOk() && b.invariantOk()) held++;
        if (a.median() != truth || b.median() != truth) mismatches++;
    }
    printf("adds: %zu, invariant held after every add: %s\\n", nums.size(), held == (int)nums.size() ? "true" : "false");
    printf("median mismatches against a sorted list: %d\\n", mismatches);
    printf("compare-first moves: %d\\n", a.moves);
    printf("push-through moves:  %d\\n", b.moves);

    vector<vector<int>> pairs = {{2147483647, 2147483647}, {-2147483647 - 1, -2147483647}};
    for (const auto& pair : pairs) {
        TwoHeaps t(true);
        for (int x : pair) t.add(x);
        printf("median of [%d, %d] = %.1f\\n", pair[0], pair[1], t.median());
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: `Sliding window median: how do you maintain median with two heaps as the window slides?`,
    difficulty: "hard",
    seoDescription: `Sliding window median with two heaps and lazy deletion, checked against brute force on 2,000 numbers, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list \`nums\` and a window size \`k\`, return the median of every window of k consecutive numbers as the window slides from left to right. Write it in Python, and do better than sorting every window."

**What a strong answer should cover:**
- Brute force (sort each window, O(n·k log k)) and the sorted-window improvement (O(n·k)).
- Two heaps as in the stream median, plus lazy deletion: a dict of pending removals, live sizes for balancing, and pruning stale tops.
- How to tell which heap the leaving number belongs to (compare with the top of the lower half), and why that is safe with duplicates.
- Honest complexity: O(n log n) time, O(n) worst-case space because stale entries can pile up.
- Python details: \`heapq\` is min-only (negate the lower half), \`collections.defaultdict(int)\` for counts, \`bisect\` for the sorted-window alternative.

**Clarifying questions expected:**
- For even k, average the two middle values?
- How large are n and k?

**Code / implementation expected:** Yes — a two-heap class with lazy deletion and a driver that slides the window, in Python 3.`,
        answer: `**Target Audience:** Developers who know the two-heap running median and want to extend it to a moving window in Python.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A weather station on a mountain takes a temperature reading every minute. One sensor glitches now and then and reports 900 °C. The display should show a smooth, glitch-proof number: **the median of the last 15 readings.** Every minute one new reading arrives and the oldest one is forgotten.

The median of a growing stream is a solved problem: two heaps, one for the smaller half and one for the larger half ([How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream)). The sliding window adds one nasty twist: **numbers must also leave.** And a heap is very good at removing its top, but bad at removing an arbitrary number somewhere in the middle.

This question tests whether you can adapt a known structure instead of reaching for a new one. The standard answer, *lazy deletion*, is a trick you will reuse in Dijkstra's algorithm, task schedulers and "top K with updates" problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big are n and k? | n = 10^5 with k = 10^4 rules out sorting each window (O(n·k log k)); small k makes a sorted window fine. |
| For even k, the average of the two middles? | Changes the formula and the return type (floating point). |
| What is the value range? | Two values near 2^31 overflow a 32-bit sum in Java and C++ before you divide. |
| Can values repeat? | Duplicates are what make "remove this value" ambiguous; lazy deletion must count copies, not just mark them. |
| Is k ≤ n guaranteed? | If k > n there are no windows at all; decide whether to return an empty result. |
| Output as floats, or exact halves? | Returning twice the median as an integer keeps everything exact. |

## 3. From Brute Force to Two Heaps

A window of size k slides one step at a time, so there are n − k + 1 windows. (The general pattern is the [sliding window technique](/interview-question/what-is-the-sliding-window-technique).)

📌 **Interview term: Sliding window** — a fixed-size range that moves across the array one step at a time; each step adds the element on the right and removes the one on the left.

**Brute force — sort every window.** Copy the k numbers, sort, take the middle. O(k log k) per window, O(n·k log k) total. Simple and a great reference for testing.

**Better — keep the window sorted.** Remove the leaving number (binary search, then delete) and insert the entering one (binary search, then insert). The search is O(log k), but deleting and inserting shift elements: O(k) per step, O(n·k) total.

**Two heaps.** Exactly as for a stream: \`low\` is a max-heap of the smaller half, \`high\` a min-heap of the larger half, with the order rule (max(low) ≤ min(high)) and the size rule (|low| = |high| or |high| + 1). Why those rules give the median is explained in [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing). Adding is the same as before. The new problem is removing.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The array 1 3 -1 -3 5 3 6 7 with a window of size 3 covering 5 3 6; -3 has just left and 6 has just entered">
  <defs>
    <marker id="b20q4py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="101" text-anchor="middle">1</text>
  <text class="d-sub" x="70" y="145" text-anchor="middle">0</text>
  <rect class="d-box" x="110" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="140" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="140" y="145" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="210" y="101" text-anchor="middle">-1</text>
  <text class="d-sub" x="210" y="145" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="280" y="101" text-anchor="middle">-3</text>
  <text class="d-sub" x="280" y="145" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="350" y="101" text-anchor="middle">5</text>
  <text class="d-sub" x="350" y="145" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="390" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="420" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="420" y="145" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="490" y="101" text-anchor="middle">6</text>
  <text class="d-sub" x="490" y="145" text-anchor="middle">6</text>
  <rect class="d-box" x="530" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="560" y="101" text-anchor="middle">7</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">7</text>
  <path class="d-edge-accent" d="M 320 56 L 520 56"/>
  <text class="d-text" x="420" y="40" text-anchor="middle">window k = 3, median 5</text>
  <path class="d-edge-dashed" d="M 280 198 L 280 158" marker-end="url(#b20q4py-a1)"/>
  <text class="d-sub" x="280" y="220" text-anchor="middle">-3 leaves</text>
  <path class="d-edge" d="M 490 198 L 490 158" marker-end="url(#b20q4py-a1)"/>
  <text class="d-sub" x="490" y="220" text-anchor="middle">6 enters</text>
</svg>

At index 6 the window is \`[5, 3, 6]\`: the number −3 (index 3) has just left and 6 (index 6) has just entered. Both heaps must reflect that before we read the median.

## 4. Lazy Deletion: Remove It Later

Most heap libraries cannot delete an arbitrary value efficiently (finding it alone is O(k)). So we do not delete it. We **write it down** in a [hash map](/interview-question/how-does-a-hash-table-work) \`delayed[value] += 1\` and leave it in the heap. It is physically there but logically gone.

📌 **Interview term: Lazy deletion** — marking an element as deleted instead of removing it, and discarding it later when it is cheap to do so. For a heap, "cheap" means when the element reaches the top.

Three details make it correct:

1. **Count live elements separately.** \`low_size\` and \`high_size\` count only numbers still in the window. The size rule uses these, never the physical heap lengths.
2. **Know which side the leaving number is on.** Because of the order rule, if \`x ≤ max(low)\` the number is counted in \`low\`; otherwise it is in \`high\`. Decrement that side's live size.
3. **Never let a stale number sit on top.** After any operation that could expose one (a removal of the top, or a move between heaps), pop tops while they appear in \`delayed\`. This "prune" step is the only place stale numbers are really removed.

📌 **Interview term: Live size vs physical size** — the number of elements that still belong to the window versus the number stored in the heap, including stale ones. Balancing must use the live size.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The low heap physically holds 5, 3 and a stale -3; the delayed map records -3 once; only 5 and 3 are live">
  <text class="d-text" x="170" y="26" text-anchor="middle">low heap (physical)</text>
  <rect class="d-box-accent" x="110" y="44" width="120" height="44" rx="8"/>
  <text class="d-text" x="170" y="71" text-anchor="middle">5  (top)</text>
  <rect class="d-box" x="40" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="95" y="157" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="190" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="245" y="157" text-anchor="middle">-3 stale</text>
  <path class="d-edge" d="M 150 88 L 105 130"/>
  <path class="d-edge" d="M 190 88 L 235 130"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">live size 2, physical size 3</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">delayed (hash map)</text>
  <rect class="d-box" x="430" y="44" width="200" height="60" rx="8"/>
  <text class="d-text" x="530" y="80" text-anchor="middle">-3 : 1</text>
  <rect class="d-box-muted" x="400" y="140" width="260" height="60" rx="8"/>
  <text class="d-text" x="530" y="166" text-anchor="middle">popped only when it</text>
  <text class="d-sub" x="530" y="188" text-anchor="middle">reaches the top of a heap</text>
</svg>

This is the real state at index 6 of the example: −3 has left the window but is buried below 5 and 3 in \`low\`. It does no harm there. If it ever rises to the top, the prune step will pop it and decrement its count.

📌 **Interview term: Stale entry** — an element still stored in a data structure after it has logically been removed. Lazy deletion tolerates stale entries anywhere except at a heap top.

## 5. One Slide, Step by Step

Each step adds \`nums[i]\`, then removes \`nums[i - k]\` once the window is full, and records the median. Both operations end with a rebalance that uses live sizes and a prune of the heap that just lost its top. Here is the run for \`[1, 3, -1, -3, 5, 3, 6, 7]\`, k = 3, printed by an instrumented copy of the code (heaps shown sorted, stale numbers included):

| i | In | Out | low (physical) | high (physical) | delayed | live sizes | Median |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | −1 | — | [−1, 1] | [3] | {} | 2, 1 | 1.0 |
| 3 | −3 | 1 | [−3, −1] | [3] | {} | 2, 1 | −1.0 |
| 4 | 5 | 3 | [−3, −1] | [5] | {} | 2, 1 | −1.0 |
| 5 | 3 | −1 | [−3, 3] | [5] | {} | 2, 1 | 3.0 |
| 6 | 6 | −3 | [−3, 3, 5] | [6] | {−3: 1} | 2, 1 | 5.0 |
| 7 | 7 | 5 | [−3, 3, 6] | [7] | {−3: 1} | 2, 1 | 6.0 |

In most steps the leaving number happened to be a top and was pruned at once. At i = 6, −3 left from the bottom of \`low\` and stayed there as a stale entry; the median (5) was still correct, because only the top matters.

## 6. The Code in Python

\`heapq\` is a min-heap, so \`low\` stores negated numbers (\`-low[0]\` is \`max(low)\`). The \`_prune\` helper takes a \`sign\` so the same code can clean either heap: it reads the real value as \`sign * heap[0]\`.

~~~python
class SlidingMedian:
    """Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
    low_size/high_size count only the live ones."""

    def __init__(self):
        self.low, self.high = [], []    # low stored negated (max-heap), high is a min-heap
        self.delayed = defaultdict(int)  # value -> how many stale copies still sit in a heap
        self.low_size = self.high_size = 0

    def _prune(self, heap, sign):
        # pop stale numbers while they sit on top; buried ones can wait
        while heap and self.delayed[sign * heap[0]] > 0:
            self.delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def _balance(self):
        if self.low_size > self.high_size + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
            self.low_size -= 1; self.high_size += 1
            self._prune(self.low, -1)
        elif self.low_size < self.high_size:
            heapq.heappush(self.low, -heapq.heappop(self.high))
            self.low_size += 1; self.high_size -= 1
            self._prune(self.high, 1)

    def add(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x); self.low_size += 1
        else:
            heapq.heappush(self.high, x); self.high_size += 1
        self._balance()

    def remove(self, x):
        self.delayed[x] += 1  # mark it; it is popped only when it reaches a top
        if x <= -self.low[0]:
            self.low_size -= 1
            if x == -self.low[0]:
                self._prune(self.low, -1)
        else:
            self.high_size -= 1
            if self.high and x == self.high[0]:
                self._prune(self.high, 1)
        self._balance()

    def median(self, k):
        if k % 2 == 1:
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
~~~

The driver adds the entering number, removes the leaving one once the window is full, and records the median:

~~~python
def median_sliding_window(nums, k):
    sm = SlidingMedian()
    out = []
    for i, x in enumerate(nums):
        sm.add(x)
        if i >= k:
            sm.remove(nums[i - k])  # the number that just left the window
        if i >= k - 1:
            out.append(sm.median(k))
    return out
~~~

**What to point out in this code:**

- \`defaultdict(int)\` makes \`self.delayed[x] += 1\` work for a new key without a check. Reading \`self.delayed[v]\` for an unseen value inserts a 0; that is harmless here, and \`.get(v, 0)\` avoids it if the interviewer cares.
- \`remove\` compares the leaving number with \`-self.low[0]\`. The order rule guarantees that anything ≤ \`max(low)\` is booked in \`low\`, so the live sizes stay correct even with duplicates.
- \`_balance\` moves one top and then prunes the heap it took from, because removing a top may expose a stale number underneath.
- The median uses \`/ 2\`, which is true division in Python 3, and Python integers cannot overflow, so \`[2147483647, 2147483647]\` needs no special care.
- \`median(k)\` decides odd/even from k, not from the heap lengths: the physical lengths include stale entries.

**The Python alternative: a sorted window with \`bisect\`.** For moderate k this is shorter and, in CPython, often fast, because \`del\` and \`insort\` shift elements with a C memory move ([how the bisect module works](/interview-question/how-does-the-bisect-module-work)):

~~~python
def sorted_window(nums, k):
    """Keep the window as a sorted list: bisect to find, O(k) to shift."""
    w = sorted(nums[:k])
    out = [w[k // 2] + w[(k - 1) // 2]]
    for i in range(k, len(nums)):
        del w[bisect.bisect_left(w, nums[i - k])]  # remove exactly one copy
        bisect.insort(w, nums[i])
        out.append(w[k // 2] + w[(k - 1) // 2])
    return out
~~~

\`del w[bisect.bisect_left(w, x)]\` removes exactly one copy of \`x\`. The third-party \`sortedcontainers.SortedList\` is a popular faster option, but it is not in the standard library, so it may not be available in an interview environment.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the two-heap solution on seven inputs (odd and even k, duplicates, k = 1, k = n, and the overflow case)** prints:

~~~text
[1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
[0.0, 1.0, 1.0, 4.0, 5.5]
[2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
[5.0, 5.0, 5.0, 5.0]
[2147483647.0]
[7.0]
[3.0]
~~~

The first line matches the step table in section 5.

**Example 2 — the heap solution against brute force (sort every window) and a sorted-window alternative, on 2,000 numbers with many duplicates, for five window sizes.** Medians are compared as *twice the median* (an integer), so the comparison is exact; "max heap entries" is the largest physical size of both heaps together, stale entries included. It prints:

~~~text
k = 1: windows 2000, heaps match brute force: true, sorted window matches: true, checksum 1984344, max heap entries 1
k = 2: windows 1999, heaps match brute force: true, sorted window matches: true, checksum 1983234, max heap entries 14
k = 50: windows 1951, heaps match brute force: true, sorted window matches: true, checksum 1920612, max heap entries 1307
k = 51: windows 1950, heaps match brute force: true, sorted window matches: true, checksum 1918390, max heap entries 1340
k = 2000: windows 1, heaps match brute force: true, sorted window matches: true, checksum 970, max heap entries 2000
~~~

Every window matched brute force for every k. The "sorted window" column is \`bisect\` on a Python list in this language; it matched too.

## 8. The Memory Catch

Stale entries are only removed when they reach a top. A number that is small enough to sink to the bottom of \`low\` may stay there for a long time. Example 2 tracks the largest physical size of the two heaps together: for k = 50 it reached **1,307** entries on a 2,000-number input, although the window never holds more than 50 live numbers. With k = 2,000 (the whole array) it is simply 2,000.

So the honest complexity is **O(n log n) time and O(n) extra space in the worst case**, not O(k) space. If memory matters, there are three standard fixes:

- **Rebuild when the heaps get too dirty**, for example when the physical size exceeds 2·k: filter out stale entries and heapify again (O(k)), which keeps space O(k) at an amortised O(1) extra cost per step.
- **Store indexes instead of values** in an ordered structure that supports real deletion (a balanced BST / ordered set), so nothing ever goes stale.
- **Keep a sorted window** when k is small: O(k) per step, but no stale data at all.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence. Each number is pushed once and popped at most once, so the heap work is O(log n) amortised per step even though a single prune may pop several entries.

## 9. Why Not Just Recompute?

It helps to put numbers on the three approaches for a typical interview limit, n = 10^5 and k = 10^4. Sorting every window costs about 9 × 10^4 windows × 10^4 × log₂(10^4) ≈ 1.2 × 10^10 comparisons: far too slow. A sorted window costs about 9 × 10^4 × 10^4 ≈ 9 × 10^8 element shifts: slow, though memory moves are fast. Two heaps cost about 2 × 10^5 pushes and pops at roughly log₂(10^5) ≈ 17 steps each, a few million operations. Those are estimates from the formulas, not measurements; example 2 measures correctness, not speed.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sort every window | O(n·k log k) | O(k) | one sort of k numbers per window |
| Sorted window | O(n·k) | O(k) | binary search is O(log k), but insert and delete shift O(k) elements |
| Two heaps + lazy deletion | O(n log n) | O(n) worst case | each number is pushed once and popped at most once; stale entries can pile up |
| Two heaps + rebuild at 2k | O(n log k) amortised | O(k) | rebuilding keeps both heaps small |
| Balanced BST / ordered multiset | O(n log k) | O(k) | real deletions, no stale entries |

## 11. Edge Cases

- **k = 1.** Every number is its own median; the window is one element and \`high\` stays empty. Example 2 checks it against brute force.
- **k = n.** One window, the median of the whole array (example 2: one window, checksum 970, so the median is 485.0).
- **Even k.** Average the two tops: \`[1, 3, -1, -3, 5, 3, 6, 7]\` with k = 4 gives \`[0.0, 1.0, 1.0, 4.0, 5.5]\` (example 1).
- **Duplicates.** \`[5, 5, 5, 5, 5]\` with k = 2: the leaving 5 may be removed from either heap, because all copies are interchangeable. \`delayed\` counts copies, so two stale 5s need two increments.
- **Overflow.** \`[2147483647, 2147483647]\` with k = 2 must give 2147483647.0; Java and C++ widen before adding.
- **A leaving number equal to \`max(low)\` that also exists in \`high\`.** The test \`x ≤ max(low)\` books it to \`low\`; that is consistent, because \`low\` really holds a copy of that value (its top).

## Common Pitfalls

- **Balancing with \`len(low)\` instead of the live size.** Physical lengths include stale entries, so the size rule drifts and the median comes from the wrong place.
- **Forgetting to prune after a move.** Popping the top of \`low\` may expose a stale number; the next \`-low[0]\` would then read a value that left the window.
- **Losing a minus sign.** \`_prune\` reads \`sign * heap[0]\`; checking \`delayed[heap[0]]\` on \`low\` looks up the negated value and never finds it.
- **Marking instead of counting.** A \`set\` of removed values breaks on duplicates (\`[5, 5, 5, 5, 5]\`): two stale 5s need a count of 2.
- **Using \`list.remove(x)\` on a heap list.** It finds and removes \`x\` in O(k), then the list is no longer a valid heap unless you call \`heapify\` again (O(k)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse the stream idea:</strong> <span style="color:#f0e2c8;">Two heaps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (negated values, max-heap) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> (min-heap), with the order and size rules from the stream median.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The new problem:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> cannot remove an arbitrary value, so I delete lazily: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed[x] += 1</code> and leave it in the heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Live sizes for the size rule; the leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is booked to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= -low[0]</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pruning:</strong> <span style="color:#f0e2c8;">After removing a top or moving one between heaps, pop tops while they are in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed</code>. Stale entries elsewhere are harmless.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) worst-case space from stale entries (1,307 entries for k = 50 in my run); a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> sorted window is the O(n·k) alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you tell which heap the leaving number is in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the order rule, everything ≤ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(low)</code> is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, except copies equal to the top, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> has such a copy itself. So booking it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> keeps the live counts right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">low.remove(-x)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapify</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(k) per step, the same as a sorted window, and more code. Lazy deletion keeps each step O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop stale entries from using O(n) memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild a heap when its physical size exceeds about twice its live size: filter out stale values and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapify</code>, O(k). Amortised that is O(1) per step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with brute force (sort each window) on random arrays with many duplicates and several k, including 1, 2, odd, even and n. Example 2 does that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the sorted-list version acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For k up to a few thousand, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insort</code> are C-speed shifts. Say it is O(n·k) and that heaps win as k grows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | A fixed-size range moving across an array one step at a time |
| **Lazy deletion** | Mark an element as deleted and discard it later, when it reaches a heap top |
| **Live size vs physical size** | Elements still in the window vs elements stored in the heap, stale ones included |
| **Stale entry** | An element still stored after it was logically removed |
| **Amortised cost** | Average cost per operation over a long sequence |
| **Negation trick** | Storing -x in a min-heap to simulate a max-heap |

---
**Conclusion:** The sliding window median is the stream median plus deletions. Keep the two heaps and their order and size rules, but delete lazily: count leaving numbers in a dict, track live sizes for balancing, and prune stale numbers only when they reach a top. In Python that means negated values in \`low\`, \`defaultdict(int)\` for the counts, and true division for the average. Be upfront that stale entries make the worst-case space O(n), and offer the \`bisect\` sorted window as the simpler O(n·k) alternative.`,
        examples: [
          {
            label: `Two heaps + lazy deletion on seven inputs`,
            code: `import heapq
from collections import defaultdict


class SlidingMedian:
    """Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
    low_size/high_size count only the live ones."""

    def __init__(self):
        self.low, self.high = [], []    # low stored negated (max-heap), high is a min-heap
        self.delayed = defaultdict(int)  # value -> how many stale copies still sit in a heap
        self.low_size = self.high_size = 0

    def _prune(self, heap, sign):
        # pop stale numbers while they sit on top; buried ones can wait
        while heap and self.delayed[sign * heap[0]] > 0:
            self.delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def _balance(self):
        if self.low_size > self.high_size + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
            self.low_size -= 1; self.high_size += 1
            self._prune(self.low, -1)
        elif self.low_size < self.high_size:
            heapq.heappush(self.low, -heapq.heappop(self.high))
            self.low_size += 1; self.high_size -= 1
            self._prune(self.high, 1)

    def add(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x); self.low_size += 1
        else:
            heapq.heappush(self.high, x); self.high_size += 1
        self._balance()

    def remove(self, x):
        self.delayed[x] += 1  # mark it; it is popped only when it reaches a top
        if x <= -self.low[0]:
            self.low_size -= 1
            if x == -self.low[0]:
                self._prune(self.low, -1)
        else:
            self.high_size -= 1
            if self.high and x == self.high[0]:
                self._prune(self.high, 1)
        self._balance()

    def median(self, k):
        if k % 2 == 1:
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2


def median_sliding_window(nums, k):
    sm = SlidingMedian()
    out = []
    for i, x in enumerate(nums):
        sm.add(x)
        if i >= k:
            sm.remove(nums[i - k])  # the number that just left the window
        if i >= k - 1:
            out.append(sm.median(k))
    return out


def fmt(xs):
    return "[" + ", ".join("%.1f" % x for x in xs) + "]"


print(fmt(median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)))  # [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
print(fmt(median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 4)))  # [0.0, 1.0, 1.0, 4.0, 5.5]
print(fmt(median_sliding_window([1, 2, 3, 4, 2, 3, 1, 4, 2], 3)))  # [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
print(fmt(median_sliding_window([5, 5, 5, 5, 5], 2)))  # [5.0, 5.0, 5.0, 5.0]
print(fmt(median_sliding_window([2147483647, 2147483647], 2)))  # [2147483647.0]
print(fmt(median_sliding_window([7], 1)))  # [7.0]
print(fmt(median_sliding_window([4, 1, 3], 3)))  # [3.0]`,
          },
          {
            label: `Heaps vs brute force vs sorted window, five window sizes`,
            code: `import heapq
from collections import defaultdict


class SlidingMedian:
    """Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
    low_size/high_size count only the live ones."""

    def __init__(self):
        self.low, self.high = [], []    # low stored negated (max-heap), high is a min-heap
        self.delayed = defaultdict(int)  # value -> how many stale copies still sit in a heap
        self.low_size = self.high_size = 0

    def _prune(self, heap, sign):
        # pop stale numbers while they sit on top; buried ones can wait
        while heap and self.delayed[sign * heap[0]] > 0:
            self.delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def _balance(self):
        if self.low_size > self.high_size + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
            self.low_size -= 1; self.high_size += 1
            self._prune(self.low, -1)
        elif self.low_size < self.high_size:
            heapq.heappush(self.low, -heapq.heappop(self.high))
            self.low_size += 1; self.high_size -= 1
            self._prune(self.high, 1)

    def add(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x); self.low_size += 1
        else:
            heapq.heappush(self.high, x); self.high_size += 1
        self._balance()

    def remove(self, x):
        self.delayed[x] += 1  # mark it; it is popped only when it reaches a top
        if x <= -self.low[0]:
            self.low_size -= 1
            if x == -self.low[0]:
                self._prune(self.low, -1)
        else:
            self.high_size -= 1
            if self.high and x == self.high[0]:
                self._prune(self.high, 1)
        self._balance()

    def median(self, k):
        if k % 2 == 1:
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2


import bisect


def heap_windows(nums, k):
    """Twice each window median (an int), plus the most entries the heaps ever held."""
    sm = SlidingMedian()
    out, most = [], 0
    for i, x in enumerate(nums):
        sm.add(x)
        if i >= k:
            sm.remove(nums[i - k])
        most = max(most, len(sm.low) + len(sm.high))
        if i >= k - 1:
            out.append(int(sm.median(k) * 2))
    return out, most


def brute_windows(nums, k):
    """Sort every window from scratch: O(k log k) per window."""
    out = []
    for i in range(len(nums) - k + 1):
        w = sorted(nums[i:i + k])
        out.append(w[k // 2] + w[(k - 1) // 2])
    return out


def sorted_window(nums, k):
    """Keep the window as a sorted list: bisect to find, O(k) to shift."""
    w = sorted(nums[:k])
    out = [w[k // 2] + w[(k - 1) // 2]]
    for i in range(k, len(nums)):
        del w[bisect.bisect_left(w, nums[i - k])]  # remove exactly one copy
        bisect.insort(w, nums[i])
        out.append(w[k // 2] + w[(k - 1) // 2])
    return out


def make(n, seed):
    out = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD, same numbers in every language
        out.append(seed % 1000)           # many duplicates on purpose
    return out


nums = make(2000, 5)
for k in [1, 2, 50, 51, 2000]:
    heaps, most = heap_windows(nums, k)
    brute = brute_windows(nums, k)
    print("k = " + str(k) + ": windows " + str(len(heaps)) + ", heaps match brute force: " + str(heaps == brute).lower()
          + ", sorted window matches: " + str(sorted_window(nums, k) == brute).lower()
          + ", checksum " + str(sum(heaps)) + ", max heap entries " + str(most))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array \`nums\` and a window size \`k\`, return the median of every window of k consecutive numbers as the window slides from left to right. Write it in JavaScript, and do better than sorting every window."

**What a strong answer should cover:**
- Brute force (sort each window, O(n·k log k)) and the sorted-window improvement (O(n·k)).
- Two heaps as in the stream median, plus lazy deletion: a \`Map\` of pending removals, live sizes for balancing, and pruning stale tops.
- How to tell which heap the leaving number belongs to (compare with the top of the lower half), and why that is safe with duplicates.
- Honest complexity: O(n log n) time, O(n) worst-case space because stale entries can pile up.
- JavaScript details: no built-in heap (write one with a comparator); use a \`Map\`, not a plain object, for counts keyed by number; sort windows with \`(a, b) => a - b\`.

**Clarifying questions expected:**
- For even k, average the two middle values?
- How large are n and k?

**Code / implementation expected:** Yes — a two-heap class with lazy deletion on top of a small binary heap, in JavaScript.`,
        answer: `**Target Audience:** Developers who know the two-heap running median and want to extend it to a moving window in JavaScript.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A weather station on a mountain takes a temperature reading every minute. One sensor glitches now and then and reports 900 °C. The display should show a smooth, glitch-proof number: **the median of the last 15 readings.** Every minute one new reading arrives and the oldest one is forgotten.

The median of a growing stream is a solved problem: two heaps, one for the smaller half and one for the larger half ([How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream)). The sliding window adds one nasty twist: **numbers must also leave.** And a heap is very good at removing its top, but bad at removing an arbitrary number somewhere in the middle.

This question tests whether you can adapt a known structure instead of reaching for a new one. The standard answer, *lazy deletion*, is a trick you will reuse in Dijkstra's algorithm, task schedulers and "top K with updates" problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big are n and k? | n = 10^5 with k = 10^4 rules out sorting each window (O(n·k log k)); small k makes a sorted window fine. |
| For even k, the average of the two middles? | Changes the formula and the return type (floating point). |
| What is the value range? | Two values near 2^31 overflow a 32-bit sum in Java and C++ before you divide. |
| Can values repeat? | Duplicates are what make "remove this value" ambiguous; lazy deletion must count copies, not just mark them. |
| Is k ≤ n guaranteed? | If k > n there are no windows at all; decide whether to return an empty result. |
| Output as floats, or exact halves? | Returning twice the median as an integer keeps everything exact. |

## 3. From Brute Force to Two Heaps

A window of size k slides one step at a time, so there are n − k + 1 windows. (The general pattern is the [sliding window technique](/interview-question/what-is-the-sliding-window-technique).)

📌 **Interview term: Sliding window** — a fixed-size range that moves across the array one step at a time; each step adds the element on the right and removes the one on the left.

**Brute force — sort every window.** Copy the k numbers, sort, take the middle. O(k log k) per window, O(n·k log k) total. Simple and a great reference for testing.

**Better — keep the window sorted.** Remove the leaving number (binary search, then delete) and insert the entering one (binary search, then insert). The search is O(log k), but deleting and inserting shift elements: O(k) per step, O(n·k) total.

**Two heaps.** Exactly as for a stream: \`low\` is a max-heap of the smaller half, \`high\` a min-heap of the larger half, with the order rule (max(low) ≤ min(high)) and the size rule (|low| = |high| or |high| + 1). Why those rules give the median is explained in [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing). Adding is the same as before. The new problem is removing.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The array 1 3 -1 -3 5 3 6 7 with a window of size 3 covering 5 3 6; -3 has just left and 6 has just entered">
  <defs>
    <marker id="b20q4ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="101" text-anchor="middle">1</text>
  <text class="d-sub" x="70" y="145" text-anchor="middle">0</text>
  <rect class="d-box" x="110" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="140" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="140" y="145" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="210" y="101" text-anchor="middle">-1</text>
  <text class="d-sub" x="210" y="145" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="280" y="101" text-anchor="middle">-3</text>
  <text class="d-sub" x="280" y="145" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="350" y="101" text-anchor="middle">5</text>
  <text class="d-sub" x="350" y="145" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="390" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="420" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="420" y="145" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="490" y="101" text-anchor="middle">6</text>
  <text class="d-sub" x="490" y="145" text-anchor="middle">6</text>
  <rect class="d-box" x="530" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="560" y="101" text-anchor="middle">7</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">7</text>
  <path class="d-edge-accent" d="M 320 56 L 520 56"/>
  <text class="d-text" x="420" y="40" text-anchor="middle">window k = 3, median 5</text>
  <path class="d-edge-dashed" d="M 280 198 L 280 158" marker-end="url(#b20q4ja-a1)"/>
  <text class="d-sub" x="280" y="220" text-anchor="middle">-3 leaves</text>
  <path class="d-edge" d="M 490 198 L 490 158" marker-end="url(#b20q4ja-a1)"/>
  <text class="d-sub" x="490" y="220" text-anchor="middle">6 enters</text>
</svg>

At index 6 the window is \`[5, 3, 6]\`: the number −3 (index 3) has just left and 6 (index 6) has just entered. Both heaps must reflect that before we read the median.

## 4. Lazy Deletion: Remove It Later

Most heap libraries cannot delete an arbitrary value efficiently (finding it alone is O(k)). So we do not delete it. We **write it down** in a [hash map](/interview-question/how-does-a-hash-table-work) \`delayed[value] += 1\` and leave it in the heap. It is physically there but logically gone.

📌 **Interview term: Lazy deletion** — marking an element as deleted instead of removing it, and discarding it later when it is cheap to do so. For a heap, "cheap" means when the element reaches the top.

Three details make it correct:

1. **Count live elements separately.** \`low_size\` and \`high_size\` count only numbers still in the window. The size rule uses these, never the physical heap lengths.
2. **Know which side the leaving number is on.** Because of the order rule, if \`x ≤ max(low)\` the number is counted in \`low\`; otherwise it is in \`high\`. Decrement that side's live size.
3. **Never let a stale number sit on top.** After any operation that could expose one (a removal of the top, or a move between heaps), pop tops while they appear in \`delayed\`. This "prune" step is the only place stale numbers are really removed.

📌 **Interview term: Live size vs physical size** — the number of elements that still belong to the window versus the number stored in the heap, including stale ones. Balancing must use the live size.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The low heap physically holds 5, 3 and a stale -3; the delayed map records -3 once; only 5 and 3 are live">
  <text class="d-text" x="170" y="26" text-anchor="middle">low heap (physical)</text>
  <rect class="d-box-accent" x="110" y="44" width="120" height="44" rx="8"/>
  <text class="d-text" x="170" y="71" text-anchor="middle">5  (top)</text>
  <rect class="d-box" x="40" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="95" y="157" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="190" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="245" y="157" text-anchor="middle">-3 stale</text>
  <path class="d-edge" d="M 150 88 L 105 130"/>
  <path class="d-edge" d="M 190 88 L 235 130"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">live size 2, physical size 3</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">delayed (hash map)</text>
  <rect class="d-box" x="430" y="44" width="200" height="60" rx="8"/>
  <text class="d-text" x="530" y="80" text-anchor="middle">-3 : 1</text>
  <rect class="d-box-muted" x="400" y="140" width="260" height="60" rx="8"/>
  <text class="d-text" x="530" y="166" text-anchor="middle">popped only when it</text>
  <text class="d-sub" x="530" y="188" text-anchor="middle">reaches the top of a heap</text>
</svg>

This is the real state at index 6 of the example: −3 has left the window but is buried below 5 and 3 in \`low\`. It does no harm there. If it ever rises to the top, the prune step will pop it and decrement its count.

📌 **Interview term: Stale entry** — an element still stored in a data structure after it has logically been removed. Lazy deletion tolerates stale entries anywhere except at a heap top.

## 5. One Slide, Step by Step

Each step adds \`nums[i]\`, then removes \`nums[i - k]\` once the window is full, and records the median. Both operations end with a rebalance that uses live sizes and a prune of the heap that just lost its top. Here is the run for \`[1, 3, -1, -3, 5, 3, 6, 7]\`, k = 3, printed by an instrumented copy of the code (heaps shown sorted, stale numbers included):

| i | In | Out | low (physical) | high (physical) | delayed | live sizes | Median |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | −1 | — | [−1, 1] | [3] | {} | 2, 1 | 1.0 |
| 3 | −3 | 1 | [−3, −1] | [3] | {} | 2, 1 | −1.0 |
| 4 | 5 | 3 | [−3, −1] | [5] | {} | 2, 1 | −1.0 |
| 5 | 3 | −1 | [−3, 3] | [5] | {} | 2, 1 | 3.0 |
| 6 | 6 | −3 | [−3, 3, 5] | [6] | {−3: 1} | 2, 1 | 5.0 |
| 7 | 7 | 5 | [−3, 3, 6] | [7] | {−3: 1} | 2, 1 | 6.0 |

In most steps the leaving number happened to be a top and was pruned at once. At i = 6, −3 left from the bottom of \`low\` and stayed there as a stale entry; the median (5) was still correct, because only the top matters.

## 6. The Code in JavaScript

The examples reuse the small comparator-driven \`Heap\` class from the stream median page (\`new Heap((a, b) => a > b)\` is a max-heap). On top of it:

~~~javascript
class SlidingMedian {
  constructor() {
    this.low = new Heap((a, b) => a > b);  // max-heap: smaller half
    this.high = new Heap((a, b) => a < b); // min-heap: larger half
    this.delayed = new Map();              // value -> stale copies still inside a heap
    this.lowSize = 0;
    this.highSize = 0;
  }
  prune(heap) { // pop stale numbers while they sit on top; buried ones can wait
    while (heap.size > 0 && (this.delayed.get(heap.peek()) || 0) > 0) {
      this.delayed.set(heap.peek(), this.delayed.get(heap.peek()) - 1);
      heap.pop();
    }
  }
  balance() {
    if (this.lowSize > this.highSize + 1) {
      this.high.push(this.low.pop());
      this.lowSize--; this.highSize++;
      this.prune(this.low);
    } else if (this.lowSize < this.highSize) {
      this.low.push(this.high.pop());
      this.lowSize++; this.highSize--;
      this.prune(this.high);
    }
  }
  add(x) {
    if (this.low.size === 0 || x <= this.low.peek()) { this.low.push(x); this.lowSize++; }
    else { this.high.push(x); this.highSize++; }
    this.balance();
  }
  remove(x) {
    this.delayed.set(x, (this.delayed.get(x) || 0) + 1); // mark it; popped when it reaches a top
    if (x <= this.low.peek()) {
      this.lowSize--;
      if (x === this.low.peek()) this.prune(this.low);
    } else {
      this.highSize--;
      if (this.high.size > 0 && x === this.high.peek()) this.prune(this.high);
    }
    this.balance();
  }
  median(k) {
    if (k % 2 === 1) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2; // a double holds 2 * 2^31 exactly
  }
}
~~~

The driver slides the window:

~~~javascript
function medianSlidingWindow(nums, k) {
  const sm = new SlidingMedian();
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    sm.add(nums[i]);
    if (i >= k) sm.remove(nums[i - k]); // the number that just left the window
    if (i >= k - 1) out.push(sm.median(k));
  }
  return out;
}
~~~

**What to point out in this code:**

- \`this.delayed\` is a \`Map\`, so numeric keys stay numbers. A plain object would convert every key to a string; it would still work for integers, but a \`Map\` says what you mean and has a cheap \`.size\`.
- \`this.delayed.get(x) || 0\` turns a missing key (\`undefined\`) into 0. That idiom is safe here because a stored count of 0 also means "nothing pending".
- \`remove\` compares the leaving number with \`this.low.peek()\`. The order rule guarantees that anything ≤ \`max(low)\` is booked in \`low\`, so the live sizes stay correct even with duplicates.
- \`balance\` moves one top and then prunes the heap it took from, because removing a top may expose a stale number.
- \`median(k)\` decides odd/even from k, not from \`heap.size\`, which includes stale entries. The average is a double; the sum of two 32-bit integers is exact in a double.

**The JavaScript alternative: a sorted array.** Short and fine for small k, but every \`splice\` shifts elements, so each step is O(k):

~~~javascript
function sortedWindow(nums, k) { // keep the window as a sorted array: binary search + splice
  const w = nums.slice(0, k).sort((a, b) => a - b);
  const out = [w[k >> 1] + w[(k - 1) >> 1]];
  for (let i = k; i < nums.length; i++) {
    w.splice(lowerBound(w, nums[i - k]), 1);   // remove exactly one copy
    w.splice(lowerBound(w, nums[i]), 0, nums[i]);
    out.push(w[k >> 1] + w[(k - 1) >> 1]);
  }
  return out;
}
~~~

\`lowerBound\` finds the first copy of the leaving value, so \`splice(pos, 1)\` removes exactly one copy. Sorting the first window uses \`(a, b) => a - b\`; the default \`sort()\` would compare strings.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the two-heap solution on seven inputs (odd and even k, duplicates, k = 1, k = n, and the overflow case)** prints:

~~~text
[1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
[0.0, 1.0, 1.0, 4.0, 5.5]
[2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
[5.0, 5.0, 5.0, 5.0]
[2147483647.0]
[7.0]
[3.0]
~~~

The first line matches the step table in section 5.

**Example 2 — the heap solution against brute force (sort every window) and a sorted-window alternative, on 2,000 numbers with many duplicates, for five window sizes.** Medians are compared as *twice the median* (an integer), so the comparison is exact; "max heap entries" is the largest physical size of both heaps together, stale entries included. It prints:

~~~text
k = 1: windows 2000, heaps match brute force: true, sorted window matches: true, checksum 1984344, max heap entries 1
k = 2: windows 1999, heaps match brute force: true, sorted window matches: true, checksum 1983234, max heap entries 14
k = 50: windows 1951, heaps match brute force: true, sorted window matches: true, checksum 1920612, max heap entries 1307
k = 51: windows 1950, heaps match brute force: true, sorted window matches: true, checksum 1918390, max heap entries 1340
k = 2000: windows 1, heaps match brute force: true, sorted window matches: true, checksum 970, max heap entries 2000
~~~

Every window matched brute force for every k. The "sorted window" column is a sorted array with binary search and \`splice\` in this language; it matched too.

## 8. The Memory Catch

Stale entries are only removed when they reach a top. A number that is small enough to sink to the bottom of \`low\` may stay there for a long time. Example 2 tracks the largest physical size of the two heaps together: for k = 50 it reached **1,307** entries on a 2,000-number input, although the window never holds more than 50 live numbers. With k = 2,000 (the whole array) it is simply 2,000.

So the honest complexity is **O(n log n) time and O(n) extra space in the worst case**, not O(k) space. If memory matters, there are three standard fixes:

- **Rebuild when the heaps get too dirty**, for example when the physical size exceeds 2·k: filter out stale entries and heapify again (O(k)), which keeps space O(k) at an amortised O(1) extra cost per step.
- **Store indexes instead of values** in an ordered structure that supports real deletion (a balanced BST / ordered set), so nothing ever goes stale.
- **Keep a sorted window** when k is small: O(k) per step, but no stale data at all.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence. Each number is pushed once and popped at most once, so the heap work is O(log n) amortised per step even though a single prune may pop several entries.

## 9. Why Not Just Recompute?

It helps to put numbers on the three approaches for a typical interview limit, n = 10^5 and k = 10^4. Sorting every window costs about 9 × 10^4 windows × 10^4 × log₂(10^4) ≈ 1.2 × 10^10 comparisons: far too slow. A sorted window costs about 9 × 10^4 × 10^4 ≈ 9 × 10^8 element shifts: slow, though memory moves are fast. Two heaps cost about 2 × 10^5 pushes and pops at roughly log₂(10^5) ≈ 17 steps each, a few million operations. Those are estimates from the formulas, not measurements; example 2 measures correctness, not speed.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sort every window | O(n·k log k) | O(k) | one sort of k numbers per window |
| Sorted window | O(n·k) | O(k) | binary search is O(log k), but insert and delete shift O(k) elements |
| Two heaps + lazy deletion | O(n log n) | O(n) worst case | each number is pushed once and popped at most once; stale entries can pile up |
| Two heaps + rebuild at 2k | O(n log k) amortised | O(k) | rebuilding keeps both heaps small |
| Balanced BST / ordered multiset | O(n log k) | O(k) | real deletions, no stale entries |

## 11. Edge Cases

- **k = 1.** Every number is its own median; the window is one element and \`high\` stays empty. Example 2 checks it against brute force.
- **k = n.** One window, the median of the whole array (example 2: one window, checksum 970, so the median is 485.0).
- **Even k.** Average the two tops: \`[1, 3, -1, -3, 5, 3, 6, 7]\` with k = 4 gives \`[0.0, 1.0, 1.0, 4.0, 5.5]\` (example 1).
- **Duplicates.** \`[5, 5, 5, 5, 5]\` with k = 2: the leaving 5 may be removed from either heap, because all copies are interchangeable. \`delayed\` counts copies, so two stale 5s need two increments.
- **Overflow.** \`[2147483647, 2147483647]\` with k = 2 must give 2147483647.0; Java and C++ widen before adding.
- **A leaving number equal to \`max(low)\` that also exists in \`high\`.** The test \`x ≤ max(low)\` books it to \`low\`; that is consistent, because \`low\` really holds a copy of that value (its top).

## Common Pitfalls

- **Balancing with \`heap.size\`.** The physical size includes stale entries; use the live counters.
- **Forgetting to prune after a move.** The next \`peek()\` may return a number that already left the window.
- **A \`Set\` of removed values.** Breaks on duplicates: two stale 5s need a count of 2. Use a \`Map\` of counts.
- **Sorting windows without a comparator.** \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`; the brute-force reference would be wrong and hide real bugs.
- **\`splice(indexOf(x), 1)\` when \`x\` is missing.** \`indexOf\` returns -1, and \`splice(-1, 1)\` deletes the *last* element instead of failing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse the stream idea:</strong> <span style="color:#f0e2c8;">Two heaps from one comparator-driven <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap</code> class: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> max-heap, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> min-heap, with the order and size rules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The new problem:</strong> <span style="color:#f0e2c8;">A heap cannot remove an arbitrary value cheaply, so I delete lazily: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed.set(x, count + 1)</code> and leave it in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Live sizes for the size rule; the leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is booked to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.peek()</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pruning:</strong> <span style="color:#f0e2c8;">After removing a top or moving one, pop tops while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed</code> has them. Stale entries further down are harmless.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) worst-case space from stale entries (1,307 for k = 50 in my run); a sorted array is the O(n·k) alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you tell which heap the leaving number is in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the order rule, everything ≤ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(low)</code> is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, except copies equal to the top, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> has such a copy itself. So booking it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> keeps the counts right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys become strings and objects carry prototype keys; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps number keys as numbers and has no surprises. Both are O(1) on average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop stale entries from growing memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild a heap when its physical size passes about twice its live size: filter stale values and re-heapify, O(k), amortised O(1) per step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with brute force on random arrays with many duplicates and several k (1, 2, odd, even, n). Example 2 does that with a numeric <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the sorted array good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For small k: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> is O(k) but very fast in practice. Say it is O(n·k) and that heaps win for large k.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | A fixed-size range moving across an array one step at a time |
| **Lazy deletion** | Mark an element as deleted and discard it later, when it reaches a heap top |
| **Live size vs physical size** | Elements still in the window vs elements stored in the heap, stale ones included |
| **Stale entry** | An element still stored after it was logically removed |
| **Amortised cost** | Average cost per operation over a long sequence |
| **Comparator function** | A function that defines heap or sort order; required for numeric sort in JavaScript |

---
**Conclusion:** The sliding window median is the stream median plus deletions. Keep the two heaps and their order and size rules, but delete lazily: count leaving numbers in a \`Map\`, track live sizes for balancing, and prune stale numbers only when they reach a top. In JavaScript you write the heap yourself, so keep it comparator-driven and reuse it for both halves. Be upfront that stale entries make the worst-case space O(n), and mention the sorted-array alternative for small k.`,
        examples: [
          {
            label: `Two heaps + lazy deletion on seven inputs`,
            code: `class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

// Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
// lowSize/highSize count only the live ones.
class SlidingMedian {
  constructor() {
    this.low = new Heap((a, b) => a > b);  // max-heap: smaller half
    this.high = new Heap((a, b) => a < b); // min-heap: larger half
    this.delayed = new Map();              // value -> stale copies still inside a heap
    this.lowSize = 0;
    this.highSize = 0;
  }
  prune(heap) { // pop stale numbers while they sit on top; buried ones can wait
    while (heap.size > 0 && (this.delayed.get(heap.peek()) || 0) > 0) {
      this.delayed.set(heap.peek(), this.delayed.get(heap.peek()) - 1);
      heap.pop();
    }
  }
  balance() {
    if (this.lowSize > this.highSize + 1) {
      this.high.push(this.low.pop());
      this.lowSize--; this.highSize++;
      this.prune(this.low);
    } else if (this.lowSize < this.highSize) {
      this.low.push(this.high.pop());
      this.lowSize++; this.highSize--;
      this.prune(this.high);
    }
  }
  add(x) {
    if (this.low.size === 0 || x <= this.low.peek()) { this.low.push(x); this.lowSize++; }
    else { this.high.push(x); this.highSize++; }
    this.balance();
  }
  remove(x) {
    this.delayed.set(x, (this.delayed.get(x) || 0) + 1); // mark it; popped when it reaches a top
    if (x <= this.low.peek()) {
      this.lowSize--;
      if (x === this.low.peek()) this.prune(this.low);
    } else {
      this.highSize--;
      if (this.high.size > 0 && x === this.high.peek()) this.prune(this.high);
    }
    this.balance();
  }
  median(k) {
    if (k % 2 === 1) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2; // a double holds 2 * 2^31 exactly
  }
}

function medianSlidingWindow(nums, k) {
  const sm = new SlidingMedian();
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    sm.add(nums[i]);
    if (i >= k) sm.remove(nums[i - k]); // the number that just left the window
    if (i >= k - 1) out.push(sm.median(k));
  }
  return out;
}

const fmt = (xs) => '[' + xs.map((x) => x.toFixed(1)).join(', ') + ']';

console.log(fmt(medianSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3))); // [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
console.log(fmt(medianSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 4))); // [0.0, 1.0, 1.0, 4.0, 5.5]
console.log(fmt(medianSlidingWindow([1, 2, 3, 4, 2, 3, 1, 4, 2], 3))); // [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
console.log(fmt(medianSlidingWindow([5, 5, 5, 5, 5], 2))); // [5.0, 5.0, 5.0, 5.0]
console.log(fmt(medianSlidingWindow([2147483647, 2147483647], 2))); // [2147483647.0]
console.log(fmt(medianSlidingWindow([7], 1))); // [7.0]
console.log(fmt(medianSlidingWindow([4, 1, 3], 3))); // [3.0]`,
          },
          {
            label: `Heaps vs brute force vs sorted window, five window sizes`,
            code: `class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

// Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
// lowSize/highSize count only the live ones.
class SlidingMedian {
  constructor() {
    this.low = new Heap((a, b) => a > b);  // max-heap: smaller half
    this.high = new Heap((a, b) => a < b); // min-heap: larger half
    this.delayed = new Map();              // value -> stale copies still inside a heap
    this.lowSize = 0;
    this.highSize = 0;
  }
  prune(heap) { // pop stale numbers while they sit on top; buried ones can wait
    while (heap.size > 0 && (this.delayed.get(heap.peek()) || 0) > 0) {
      this.delayed.set(heap.peek(), this.delayed.get(heap.peek()) - 1);
      heap.pop();
    }
  }
  balance() {
    if (this.lowSize > this.highSize + 1) {
      this.high.push(this.low.pop());
      this.lowSize--; this.highSize++;
      this.prune(this.low);
    } else if (this.lowSize < this.highSize) {
      this.low.push(this.high.pop());
      this.lowSize++; this.highSize--;
      this.prune(this.high);
    }
  }
  add(x) {
    if (this.low.size === 0 || x <= this.low.peek()) { this.low.push(x); this.lowSize++; }
    else { this.high.push(x); this.highSize++; }
    this.balance();
  }
  remove(x) {
    this.delayed.set(x, (this.delayed.get(x) || 0) + 1); // mark it; popped when it reaches a top
    if (x <= this.low.peek()) {
      this.lowSize--;
      if (x === this.low.peek()) this.prune(this.low);
    } else {
      this.highSize--;
      if (this.high.size > 0 && x === this.high.peek()) this.prune(this.high);
    }
    this.balance();
  }
  median(k) {
    if (k % 2 === 1) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2; // a double holds 2 * 2^31 exactly
  }
}

function heapWindows(nums, k) { // twice each window median, plus the most entries the heaps held
  const sm = new SlidingMedian();
  const out = [];
  let most = 0;
  for (let i = 0; i < nums.length; i++) {
    sm.add(nums[i]);
    if (i >= k) sm.remove(nums[i - k]);
    most = Math.max(most, sm.low.size + sm.high.size);
    if (i >= k - 1) out.push(sm.median(k) * 2);
  }
  return [out, most];
}

function bruteWindows(nums, k) { // sort every window from scratch: O(k log k) per window
  const out = [];
  for (let i = 0; i + k <= nums.length; i++) {
    const w = nums.slice(i, i + k).sort((a, b) => a - b); // numeric comparator, not the default
    out.push(w[k >> 1] + w[(k - 1) >> 1]);
  }
  return out;
}

function lowerBound(w, x) { let lo = 0, hi = w.length; while (lo < hi) { const m = (lo + hi) >> 1; if (w[m] < x) lo = m + 1; else hi = m; } return lo; }

function sortedWindow(nums, k) { // keep the window as a sorted array: binary search + splice
  const w = nums.slice(0, k).sort((a, b) => a - b);
  const out = [w[k >> 1] + w[(k - 1) >> 1]];
  for (let i = k; i < nums.length; i++) {
    w.splice(lowerBound(w, nums[i - k]), 1);   // remove exactly one copy
    w.splice(lowerBound(w, nums[i]), 0, nums[i]);
    out.push(w[k >> 1] + w[(k - 1) >> 1]);
  }
  return out;
}

function make(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // MINSTD, same numbers in every language
    out.push(seed % 1000);              // many duplicates on purpose
  }
  return out;
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const nums = make(2000, 5);
for (const k of [1, 2, 50, 51, 2000]) {
  const [heaps, most] = heapWindows(nums, k);
  const brute = bruteWindows(nums, k);
  console.log('k = ' + k + ': windows ' + heaps.length + ', heaps match brute force: ' + same(heaps, brute) +
    ', sorted window matches: ' + same(sortedWindow(nums, k), brute) +
    ', checksum ' + heaps.reduce((a, b) => a + b, 0) + ', max heap entries ' + most);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int[] nums\` and a window size \`k\`, return a \`double[]\` with the median of every window of k consecutive numbers. Write it in Java, and do better than sorting every window."

**What a strong answer should cover:**
- Brute force (sort each window, O(n·k log k)) and the simple \`PriorityQueue.remove(Object)\` version (O(k) per step).
- Two heaps plus lazy deletion: a \`HashMap\` of pending removals, live sizes for balancing, and pruning stale tops; O(n log n) time.
- How to tell which heap the leaving number belongs to (compare with the top of the lower half), and why that is safe with duplicates.
- Honest space: O(n) worst case because stale entries can pile up.
- Java details: \`Collections.reverseOrder()\` for the max-heap; widen to \`long\` before averaging (\`[2147483647, 2147483647]\`); \`List.remove(int)\` removes by index, not by value.

**Clarifying questions expected:**
- For even k, average the two middle values?
- Can values be anywhere in the \`int\` range?

**Code / implementation expected:** Yes — a two-\`PriorityQueue\` class with lazy deletion and a sliding driver, in Java.`,
        answer: `**Target Audience:** Developers who know the two-heap running median and want to extend it to a moving window in Java.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A weather station on a mountain takes a temperature reading every minute. One sensor glitches now and then and reports 900 °C. The display should show a smooth, glitch-proof number: **the median of the last 15 readings.** Every minute one new reading arrives and the oldest one is forgotten.

The median of a growing stream is a solved problem: two heaps, one for the smaller half and one for the larger half ([How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream)). The sliding window adds one nasty twist: **numbers must also leave.** And a heap is very good at removing its top, but bad at removing an arbitrary number somewhere in the middle.

This question tests whether you can adapt a known structure instead of reaching for a new one. The standard answer, *lazy deletion*, is a trick you will reuse in Dijkstra's algorithm, task schedulers and "top K with updates" problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big are n and k? | n = 10^5 with k = 10^4 rules out sorting each window (O(n·k log k)); small k makes a sorted window fine. |
| For even k, the average of the two middles? | Changes the formula and the return type (floating point). |
| What is the value range? | Two values near 2^31 overflow a 32-bit sum in Java and C++ before you divide. |
| Can values repeat? | Duplicates are what make "remove this value" ambiguous; lazy deletion must count copies, not just mark them. |
| Is k ≤ n guaranteed? | If k > n there are no windows at all; decide whether to return an empty result. |
| Output as floats, or exact halves? | Returning twice the median as an integer keeps everything exact. |

## 3. From Brute Force to Two Heaps

A window of size k slides one step at a time, so there are n − k + 1 windows. (The general pattern is the [sliding window technique](/interview-question/what-is-the-sliding-window-technique).)

📌 **Interview term: Sliding window** — a fixed-size range that moves across the array one step at a time; each step adds the element on the right and removes the one on the left.

**Brute force — sort every window.** Copy the k numbers, sort, take the middle. O(k log k) per window, O(n·k log k) total. Simple and a great reference for testing.

**Better — keep the window sorted.** Remove the leaving number (binary search, then delete) and insert the entering one (binary search, then insert). The search is O(log k), but deleting and inserting shift elements: O(k) per step, O(n·k) total.

**Two heaps.** Exactly as for a stream: \`low\` is a max-heap of the smaller half, \`high\` a min-heap of the larger half, with the order rule (max(low) ≤ min(high)) and the size rule (|low| = |high| or |high| + 1). Why those rules give the median is explained in [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing). Adding is the same as before. The new problem is removing.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The array 1 3 -1 -3 5 3 6 7 with a window of size 3 covering 5 3 6; -3 has just left and 6 has just entered">
  <defs>
    <marker id="b20q4ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="101" text-anchor="middle">1</text>
  <text class="d-sub" x="70" y="145" text-anchor="middle">0</text>
  <rect class="d-box" x="110" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="140" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="140" y="145" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="210" y="101" text-anchor="middle">-1</text>
  <text class="d-sub" x="210" y="145" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="280" y="101" text-anchor="middle">-3</text>
  <text class="d-sub" x="280" y="145" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="350" y="101" text-anchor="middle">5</text>
  <text class="d-sub" x="350" y="145" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="390" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="420" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="420" y="145" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="490" y="101" text-anchor="middle">6</text>
  <text class="d-sub" x="490" y="145" text-anchor="middle">6</text>
  <rect class="d-box" x="530" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="560" y="101" text-anchor="middle">7</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">7</text>
  <path class="d-edge-accent" d="M 320 56 L 520 56"/>
  <text class="d-text" x="420" y="40" text-anchor="middle">window k = 3, median 5</text>
  <path class="d-edge-dashed" d="M 280 198 L 280 158" marker-end="url(#b20q4ja-a1)"/>
  <text class="d-sub" x="280" y="220" text-anchor="middle">-3 leaves</text>
  <path class="d-edge" d="M 490 198 L 490 158" marker-end="url(#b20q4ja-a1)"/>
  <text class="d-sub" x="490" y="220" text-anchor="middle">6 enters</text>
</svg>

At index 6 the window is \`[5, 3, 6]\`: the number −3 (index 3) has just left and 6 (index 6) has just entered. Both heaps must reflect that before we read the median.

## 4. Lazy Deletion: Remove It Later

Most heap libraries cannot delete an arbitrary value efficiently (finding it alone is O(k)). So we do not delete it. We **write it down** in a [hash map](/interview-question/how-does-a-hash-table-work) \`delayed[value] += 1\` and leave it in the heap. It is physically there but logically gone.

📌 **Interview term: Lazy deletion** — marking an element as deleted instead of removing it, and discarding it later when it is cheap to do so. For a heap, "cheap" means when the element reaches the top.

Three details make it correct:

1. **Count live elements separately.** \`low_size\` and \`high_size\` count only numbers still in the window. The size rule uses these, never the physical heap lengths.
2. **Know which side the leaving number is on.** Because of the order rule, if \`x ≤ max(low)\` the number is counted in \`low\`; otherwise it is in \`high\`. Decrement that side's live size.
3. **Never let a stale number sit on top.** After any operation that could expose one (a removal of the top, or a move between heaps), pop tops while they appear in \`delayed\`. This "prune" step is the only place stale numbers are really removed.

📌 **Interview term: Live size vs physical size** — the number of elements that still belong to the window versus the number stored in the heap, including stale ones. Balancing must use the live size.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The low heap physically holds 5, 3 and a stale -3; the delayed map records -3 once; only 5 and 3 are live">
  <text class="d-text" x="170" y="26" text-anchor="middle">low heap (physical)</text>
  <rect class="d-box-accent" x="110" y="44" width="120" height="44" rx="8"/>
  <text class="d-text" x="170" y="71" text-anchor="middle">5  (top)</text>
  <rect class="d-box" x="40" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="95" y="157" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="190" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="245" y="157" text-anchor="middle">-3 stale</text>
  <path class="d-edge" d="M 150 88 L 105 130"/>
  <path class="d-edge" d="M 190 88 L 235 130"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">live size 2, physical size 3</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">delayed (hash map)</text>
  <rect class="d-box" x="430" y="44" width="200" height="60" rx="8"/>
  <text class="d-text" x="530" y="80" text-anchor="middle">-3 : 1</text>
  <rect class="d-box-muted" x="400" y="140" width="260" height="60" rx="8"/>
  <text class="d-text" x="530" y="166" text-anchor="middle">popped only when it</text>
  <text class="d-sub" x="530" y="188" text-anchor="middle">reaches the top of a heap</text>
</svg>

This is the real state at index 6 of the example: −3 has left the window but is buried below 5 and 3 in \`low\`. It does no harm there. If it ever rises to the top, the prune step will pop it and decrement its count.

📌 **Interview term: Stale entry** — an element still stored in a data structure after it has logically been removed. Lazy deletion tolerates stale entries anywhere except at a heap top.

## 5. One Slide, Step by Step

Each step adds \`nums[i]\`, then removes \`nums[i - k]\` once the window is full, and records the median. Both operations end with a rebalance that uses live sizes and a prune of the heap that just lost its top. Here is the run for \`[1, 3, -1, -3, 5, 3, 6, 7]\`, k = 3, printed by an instrumented copy of the code (heaps shown sorted, stale numbers included):

| i | In | Out | low (physical) | high (physical) | delayed | live sizes | Median |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | −1 | — | [−1, 1] | [3] | {} | 2, 1 | 1.0 |
| 3 | −3 | 1 | [−3, −1] | [3] | {} | 2, 1 | −1.0 |
| 4 | 5 | 3 | [−3, −1] | [5] | {} | 2, 1 | −1.0 |
| 5 | 3 | −1 | [−3, 3] | [5] | {} | 2, 1 | 3.0 |
| 6 | 6 | −3 | [−3, 3, 5] | [6] | {−3: 1} | 2, 1 | 5.0 |
| 7 | 7 | 5 | [−3, 3, 6] | [7] | {−3: 1} | 2, 1 | 6.0 |

In most steps the leaving number happened to be a top and was pruned at once. At i = 6, −3 left from the bottom of \`low\` and stayed there as a stale entry; the median (5) was still correct, because only the top matters.

## 6. The Code in Java

\`low\` uses \`Collections.reverseOrder()\` (a max-heap); \`high\` is a plain \`PriorityQueue\` (a min-heap). Pending removals live in a \`HashMap<Integer, Integer>\`.

~~~java
static class SlidingMedian {
    final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
    final PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap
    final Map<Integer, Integer> delayed = new HashMap<>(); // value -> stale copies in a heap
    int lowSize = 0, highSize = 0;

    void prune(PriorityQueue<Integer> heap) { // pop stale numbers while they sit on top
        while (!heap.isEmpty() && delayed.getOrDefault(heap.peek(), 0) > 0) {
            delayed.merge(heap.peek(), -1, Integer::sum);
            heap.poll();
        }
    }

    void balance() {
        if (lowSize > highSize + 1) {
            high.offer(low.poll());
            lowSize--; highSize++;
            prune(low);
        } else if (lowSize < highSize) {
            low.offer(high.poll());
            lowSize++; highSize--;
            prune(high);
        }
    }

    void add(int x) {
        if (low.isEmpty() || x <= low.peek()) { low.offer(x); lowSize++; }
        else { high.offer(x); highSize++; }
        balance();
    }

    void remove(int x) {
        delayed.merge(x, 1, Integer::sum); // mark it; popped when it reaches a top
        if (x <= low.peek()) {
            lowSize--;
            if (x == low.peek()) prune(low);   // int == Integer unboxes: a value compare
        } else {
            highSize--;
            if (!high.isEmpty() && x == high.peek()) prune(high);
        }
        balance();
    }

    double median(int k) {
        if (k % 2 == 1) return low.peek();
        return ((long) low.peek() + high.peek()) / 2.0; // long: int + int can overflow
    }
}
~~~

The driver slides the window:

~~~java
static double[] medianSlidingWindow(int[] nums, int k) {
    SlidingMedian sm = new SlidingMedian();
    double[] out = new double[nums.length - k + 1];
    for (int i = 0; i < nums.length; i++) {
        sm.add(nums[i]);
        if (i >= k) sm.remove(nums[i - k]); // the number that just left the window
        if (i >= k - 1) out[i - k + 1] = sm.median(k);
    }
    return out;
}
~~~

**What to point out in this code:**

- \`delayed.merge(x, 1, Integer::sum)\` adds 1 to the count, inserting it if missing; \`merge(v, -1, Integer::sum)\` decrements. \`getOrDefault(v, 0)\` reads without inserting.
- \`x == low.peek()\` compares an \`int\` with an \`Integer\`, so Java unboxes and compares values. Two \`Integer\`s compared with \`==\` would compare references instead.
- \`((long) low.peek() + high.peek()) / 2.0\` widens before adding; without the cast, \`[2147483647, 2147483647]\` would overflow (example 1 checks this case).
- \`median(k)\` decides odd/even from k, not from \`low.size()\`, which includes stale entries.

**The simple Java version, and why it is slower.** \`PriorityQueue\` has \`remove(Object)\`, so the obvious solution is \`low.remove(x)\` or \`high.remove(x)\` for the leaving number. It is correct and short, but the Javadoc's implementation note says \`remove(Object)\` takes linear time ([JDK 21 PriorityQueue docs](https://cs-214.epfl.ch/jdk-21.0.9-docs/api/java.base/java/util/PriorityQueue.html)), so each step is O(k), the same as a sorted list. Lazy deletion keeps each step O(log n).

**The sorted-list alternative**, used in example 2 as a cross-check:

~~~java
static long[] sortedWindow(int[] nums, int k) { // a sorted ArrayList: binary search + shift
    List<Integer> w = new ArrayList<>();
    for (int i = 0; i < k; i++) w.add(nums[i]);
    Collections.sort(w);
    long[] out = new long[nums.length - k + 1];
    out[0] = (long) w.get(k / 2) + w.get((k - 1) / 2);
    for (int i = k; i < nums.length; i++) {
        w.remove(Collections.binarySearch(w, nums[i - k])); // int index: removes ONE element by position
        int pos = Collections.binarySearch(w, nums[i]);
        w.add(pos >= 0 ? pos : -pos - 1, nums[i]);
        out[i - k + 1] = (long) w.get(k / 2) + w.get((k - 1) / 2);
    }
    return out;
}
~~~

\`w.remove(Collections.binarySearch(w, nums[i - k]))\` passes an \`int\`, so it calls \`remove(int index)\`, which removes exactly one element at that position. Calling \`w.remove(nums[i - k])\` with an \`int\` value would *also* call \`remove(int index)\` and delete the wrong element; to remove by value you must write \`w.remove(Integer.valueOf(x))\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK (javac + java)). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the two-heap solution on seven inputs (odd and even k, duplicates, k = 1, k = n, and the overflow case)** prints:

~~~text
[1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
[0.0, 1.0, 1.0, 4.0, 5.5]
[2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
[5.0, 5.0, 5.0, 5.0]
[2147483647.0]
[7.0]
[3.0]
~~~

The first line matches the step table in section 5.

**Example 2 — the heap solution against brute force (sort every window) and a sorted-window alternative, on 2,000 numbers with many duplicates, for five window sizes.** Medians are compared as *twice the median* (an integer), so the comparison is exact; "max heap entries" is the largest physical size of both heaps together, stale entries included. It prints:

~~~text
k = 1: windows 2000, heaps match brute force: true, sorted window matches: true, checksum 1984344, max heap entries 1
k = 2: windows 1999, heaps match brute force: true, sorted window matches: true, checksum 1983234, max heap entries 14
k = 50: windows 1951, heaps match brute force: true, sorted window matches: true, checksum 1920612, max heap entries 1307
k = 51: windows 1950, heaps match brute force: true, sorted window matches: true, checksum 1918390, max heap entries 1340
k = 2000: windows 1, heaps match brute force: true, sorted window matches: true, checksum 970, max heap entries 2000
~~~

Every window matched brute force for every k. The "sorted window" column is a sorted \`ArrayList\` with \`Collections.binarySearch\` in this language; it matched too.

## 8. The Memory Catch

Stale entries are only removed when they reach a top. A number that is small enough to sink to the bottom of \`low\` may stay there for a long time. Example 2 tracks the largest physical size of the two heaps together: for k = 50 it reached **1,307** entries on a 2,000-number input, although the window never holds more than 50 live numbers. With k = 2,000 (the whole array) it is simply 2,000.

So the honest complexity is **O(n log n) time and O(n) extra space in the worst case**, not O(k) space. If memory matters, there are three standard fixes:

- **Rebuild when the heaps get too dirty**, for example when the physical size exceeds 2·k: filter out stale entries and heapify again (O(k)), which keeps space O(k) at an amortised O(1) extra cost per step.
- **Store indexes instead of values** in an ordered structure that supports real deletion (a balanced BST / ordered set), so nothing ever goes stale.
- **Keep a sorted window** when k is small: O(k) per step, but no stale data at all.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence. Each number is pushed once and popped at most once, so the heap work is O(log n) amortised per step even though a single prune may pop several entries.

## 9. Why Not Just Recompute?

It helps to put numbers on the three approaches for a typical interview limit, n = 10^5 and k = 10^4. Sorting every window costs about 9 × 10^4 windows × 10^4 × log₂(10^4) ≈ 1.2 × 10^10 comparisons: far too slow. A sorted window costs about 9 × 10^4 × 10^4 ≈ 9 × 10^8 element shifts: slow, though memory moves are fast. Two heaps cost about 2 × 10^5 pushes and pops at roughly log₂(10^5) ≈ 17 steps each, a few million operations. Those are estimates from the formulas, not measurements; example 2 measures correctness, not speed.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sort every window | O(n·k log k) | O(k) | one sort of k numbers per window |
| Sorted window | O(n·k) | O(k) | binary search is O(log k), but insert and delete shift O(k) elements |
| Two heaps + lazy deletion | O(n log n) | O(n) worst case | each number is pushed once and popped at most once; stale entries can pile up |
| Two heaps + rebuild at 2k | O(n log k) amortised | O(k) | rebuilding keeps both heaps small |
| Balanced BST / ordered multiset | O(n log k) | O(k) | real deletions, no stale entries |

## 11. Edge Cases

- **k = 1.** Every number is its own median; the window is one element and \`high\` stays empty. Example 2 checks it against brute force.
- **k = n.** One window, the median of the whole array (example 2: one window, checksum 970, so the median is 485.0).
- **Even k.** Average the two tops: \`[1, 3, -1, -3, 5, 3, 6, 7]\` with k = 4 gives \`[0.0, 1.0, 1.0, 4.0, 5.5]\` (example 1).
- **Duplicates.** \`[5, 5, 5, 5, 5]\` with k = 2: the leaving 5 may be removed from either heap, because all copies are interchangeable. \`delayed\` counts copies, so two stale 5s need two increments.
- **Overflow.** \`[2147483647, 2147483647]\` with k = 2 must give 2147483647.0; Java and C++ widen before adding.
- **A leaving number equal to \`max(low)\` that also exists in \`high\`.** The test \`x ≤ max(low)\` books it to \`low\`; that is consistent, because \`low\` really holds a copy of that value (its top).

## Common Pitfalls

- **\`List.remove(x)\` with an \`int\` value.** It removes the element at index \`x\`, not the value \`x\`. Use \`remove(Integer.valueOf(x))\` or an index from \`binarySearch\`.
- **Averaging without widening.** \`(low.peek() + high.peek()) / 2.0\` overflows for \`[2147483647, 2147483647]\`; cast to \`long\` first.
- **Balancing with \`low.size()\`.** It includes stale entries; use the live counters.
- **Using \`(a, b) -> b - a\` for the max-heap.** It overflows for far-apart values and corrupts the order; \`Collections.reverseOrder()\` does not.
- **Forgetting to prune after a move.** The next \`peek()\` may return a value that has already left the window.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse the stream idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> = plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>, with the order and size rules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The new problem:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(Object)</code> is O(k), so I delete lazily: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed.merge(x, 1, Integer::sum)</code> and leave it in the heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Live sizes for the size rule; the leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is booked to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.peek()</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pruning:</strong> <span style="color:#f0e2c8;">After removing a top or moving one, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code> tops while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed</code> has them. Stale entries further down are harmless.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) worst-case space (1,307 heap entries for k = 50 in my run). Widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for the average.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PriorityQueue.remove(Object)</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct and many interviewers accept it, but it is O(k) per step (linear per the Javadoc), giving O(n·k). Lazy deletion is the O(n log n) answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you tell which heap the leaving number is in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the order rule, everything ≤ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(low)</code> is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, except copies equal to the top, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds such a copy itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeSet</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeSet&lt;Integer&gt;</code> of indexes ordered by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(nums[i], i)</code>, so duplicates stay distinct. Two such sets give real O(log k) removal and no stale entries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bound memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild a heap when its physical size exceeds about 2·k: filter stale values into a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>, O(k), amortised O(1) per step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with sorting each window (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> on a copy) for random arrays with duplicates and k = 1, 2, odd, even and n. Example 2 does that.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | A fixed-size range moving across an array one step at a time |
| **Lazy deletion** | Mark an element as deleted and discard it later, when it reaches a heap top |
| **Live size vs physical size** | Elements still in the window vs elements stored in the heap, stale ones included |
| **Stale entry** | An element still stored after it was logically removed |
| **Amortised cost** | Average cost per operation over a long sequence |
| **Autoboxing** | Java wrapping int in Integer; it decides whether remove(x) means index or value |

---
**Conclusion:** The sliding window median is the stream median plus deletions. Keep two \`PriorityQueue\`s and their order and size rules, but delete lazily: count leaving numbers in a \`HashMap\`, track live sizes for balancing, and \`poll\` stale numbers only when they reach a top. That beats the tempting \`remove(Object)\`, which is linear per call. Widen to \`long\` before averaging, and remember that \`List.remove(int)\` removes by index.`,
        examples: [
          {
            label: `Two heaps + lazy deletion on seven inputs`,
            code: `import java.util.*;

public class Main {
    // Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
    // lowSize/highSize count only the live ones.
    static class SlidingMedian {
        final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
        final PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap
        final Map<Integer, Integer> delayed = new HashMap<>(); // value -> stale copies in a heap
        int lowSize = 0, highSize = 0;

        void prune(PriorityQueue<Integer> heap) { // pop stale numbers while they sit on top
            while (!heap.isEmpty() && delayed.getOrDefault(heap.peek(), 0) > 0) {
                delayed.merge(heap.peek(), -1, Integer::sum);
                heap.poll();
            }
        }

        void balance() {
            if (lowSize > highSize + 1) {
                high.offer(low.poll());
                lowSize--; highSize++;
                prune(low);
            } else if (lowSize < highSize) {
                low.offer(high.poll());
                lowSize++; highSize--;
                prune(high);
            }
        }

        void add(int x) {
            if (low.isEmpty() || x <= low.peek()) { low.offer(x); lowSize++; }
            else { high.offer(x); highSize++; }
            balance();
        }

        void remove(int x) {
            delayed.merge(x, 1, Integer::sum); // mark it; popped when it reaches a top
            if (x <= low.peek()) {
                lowSize--;
                if (x == low.peek()) prune(low);   // int == Integer unboxes: a value compare
            } else {
                highSize--;
                if (!high.isEmpty() && x == high.peek()) prune(high);
            }
            balance();
        }

        double median(int k) {
            if (k % 2 == 1) return low.peek();
            return ((long) low.peek() + high.peek()) / 2.0; // long: int + int can overflow
        }
    }

    static double[] medianSlidingWindow(int[] nums, int k) {
        SlidingMedian sm = new SlidingMedian();
        double[] out = new double[nums.length - k + 1];
        for (int i = 0; i < nums.length; i++) {
            sm.add(nums[i]);
            if (i >= k) sm.remove(nums[i - k]); // the number that just left the window
            if (i >= k - 1) out[i - k + 1] = sm.median(k);
        }
        return out;
    }

    static String fmt(double[] xs) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (double x : xs) sj.add(String.format("%.1f", x)); // not "" + x, which prints 2.147483647E9
        return sj.toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(medianSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3))); // [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
        System.out.println(fmt(medianSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 4))); // [0.0, 1.0, 1.0, 4.0, 5.5]
        System.out.println(fmt(medianSlidingWindow(new int[]{1, 2, 3, 4, 2, 3, 1, 4, 2}, 3))); // [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
        System.out.println(fmt(medianSlidingWindow(new int[]{5, 5, 5, 5, 5}, 2))); // [5.0, 5.0, 5.0, 5.0]
        System.out.println(fmt(medianSlidingWindow(new int[]{2147483647, 2147483647}, 2))); // [2147483647.0]
        System.out.println(fmt(medianSlidingWindow(new int[]{7}, 1))); // [7.0]
        System.out.println(fmt(medianSlidingWindow(new int[]{4, 1, 3}, 3))); // [3.0]
    }
}`,
          },
          {
            label: `Heaps vs brute force vs sorted window, five window sizes`,
            code: `import java.util.*;

public class Main {
    // Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
    // lowSize/highSize count only the live ones.
    static class SlidingMedian {
        final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
        final PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap
        final Map<Integer, Integer> delayed = new HashMap<>(); // value -> stale copies in a heap
        int lowSize = 0, highSize = 0;

        void prune(PriorityQueue<Integer> heap) { // pop stale numbers while they sit on top
            while (!heap.isEmpty() && delayed.getOrDefault(heap.peek(), 0) > 0) {
                delayed.merge(heap.peek(), -1, Integer::sum);
                heap.poll();
            }
        }

        void balance() {
            if (lowSize > highSize + 1) {
                high.offer(low.poll());
                lowSize--; highSize++;
                prune(low);
            } else if (lowSize < highSize) {
                low.offer(high.poll());
                lowSize++; highSize--;
                prune(high);
            }
        }

        void add(int x) {
            if (low.isEmpty() || x <= low.peek()) { low.offer(x); lowSize++; }
            else { high.offer(x); highSize++; }
            balance();
        }

        void remove(int x) {
            delayed.merge(x, 1, Integer::sum); // mark it; popped when it reaches a top
            if (x <= low.peek()) {
                lowSize--;
                if (x == low.peek()) prune(low);   // int == Integer unboxes: a value compare
            } else {
                highSize--;
                if (!high.isEmpty() && x == high.peek()) prune(high);
            }
            balance();
        }

        double median(int k) {
            if (k % 2 == 1) return low.peek();
            return ((long) low.peek() + high.peek()) / 2.0; // long: int + int can overflow
        }
    }

    static int most; // the most entries the two heaps ever held, stale ones included

    static long[] heapWindows(int[] nums, int k) { // twice each window median
        SlidingMedian sm = new SlidingMedian();
        long[] out = new long[nums.length - k + 1];
        most = 0;
        for (int i = 0; i < nums.length; i++) {
            sm.add(nums[i]);
            if (i >= k) sm.remove(nums[i - k]);
            most = Math.max(most, sm.low.size() + sm.high.size());
            if (i >= k - 1) out[i - k + 1] = (long) (sm.median(k) * 2);
        }
        return out;
    }

    static long[] bruteWindows(int[] nums, int k) { // sort every window from scratch
        long[] out = new long[nums.length - k + 1];
        for (int i = 0; i + k <= nums.length; i++) {
            int[] w = Arrays.copyOfRange(nums, i, i + k);
            Arrays.sort(w);
            out[i] = (long) w[k / 2] + w[(k - 1) / 2];
        }
        return out;
    }

    static long[] sortedWindow(int[] nums, int k) { // a sorted ArrayList: binary search + shift
        List<Integer> w = new ArrayList<>();
        for (int i = 0; i < k; i++) w.add(nums[i]);
        Collections.sort(w);
        long[] out = new long[nums.length - k + 1];
        out[0] = (long) w.get(k / 2) + w.get((k - 1) / 2);
        for (int i = k; i < nums.length; i++) {
            w.remove(Collections.binarySearch(w, nums[i - k])); // int index: removes ONE element by position
            int pos = Collections.binarySearch(w, nums[i]);
            w.add(pos >= 0 ? pos : -pos - 1, nums[i]);
            out[i - k + 1] = (long) w.get(k / 2) + w.get((k - 1) / 2);
        }
        return out;
    }

    static int[] make(int n, long seed) {
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647; // MINSTD; long, because the product overflows int
            out[i] = (int) (seed % 1000);     // many duplicates on purpose
        }
        return out;
    }

    public static void main(String[] args) {
        int[] nums = make(2000, 5);
        for (int k : new int[]{1, 2, 50, 51, 2000}) {
            long[] heaps = heapWindows(nums, k);
            long[] brute = bruteWindows(nums, k);
            System.out.println("k = " + k + ": windows " + heaps.length + ", heaps match brute force: " + Arrays.equals(heaps, brute)
                + ", sorted window matches: " + Arrays.equals(sortedWindow(nums, k), brute)
                + ", checksum " + Arrays.stream(heaps).sum() + ", max heap entries " + most);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<int> nums\` and a window size \`k\`, return a \`std::vector<double>\` with the median of every window of k consecutive numbers. Write it in C++17, and do better than sorting every window."

**What a strong answer should cover:**
- Brute force (sort each window, O(n·k log k)) and why \`std::priority_queue\` cannot remove an arbitrary element.
- Two heaps plus lazy deletion: an \`unordered_map\` of pending removals, live sizes for balancing, and pruning stale tops; O(n log n) time.
- The C++ alternative: one \`std::multiset\` with an iterator kept on the median, O(log k) per step, with no stale entries.
- \`multiset::erase(value)\` removes every copy, while \`erase(iterator)\` removes one; widen to \`long long\` before averaging.
- Honest space for the heap version: O(n) worst case because stale entries can pile up.

**Clarifying questions expected:**
- For even k, average the two middle values?
- Can values be anywhere in the \`int\` range?

**Code / implementation expected:** Yes — a two-heap struct with lazy deletion, and ideally the \`multiset\` version, in C++17.`,
        answer: `**Target Audience:** Developers who know the two-heap running median and want to extend it to a moving window in C++.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A weather station on a mountain takes a temperature reading every minute. One sensor glitches now and then and reports 900 °C. The display should show a smooth, glitch-proof number: **the median of the last 15 readings.** Every minute one new reading arrives and the oldest one is forgotten.

The median of a growing stream is a solved problem: two heaps, one for the smaller half and one for the larger half ([How do you find the median from a data stream?](/interview-question/how-do-you-find-the-median-from-a-data-stream)). The sliding window adds one nasty twist: **numbers must also leave.** And a heap is very good at removing its top, but bad at removing an arbitrary number somewhere in the middle.

This question tests whether you can adapt a known structure instead of reaching for a new one. The standard answer, *lazy deletion*, is a trick you will reuse in Dijkstra's algorithm, task schedulers and "top K with updates" problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How big are n and k? | n = 10^5 with k = 10^4 rules out sorting each window (O(n·k log k)); small k makes a sorted window fine. |
| For even k, the average of the two middles? | Changes the formula and the return type (floating point). |
| What is the value range? | Two values near 2^31 overflow a 32-bit sum in Java and C++ before you divide. |
| Can values repeat? | Duplicates are what make "remove this value" ambiguous; lazy deletion must count copies, not just mark them. |
| Is k ≤ n guaranteed? | If k > n there are no windows at all; decide whether to return an empty result. |
| Output as floats, or exact halves? | Returning twice the median as an integer keeps everything exact. |

## 3. From Brute Force to Two Heaps

A window of size k slides one step at a time, so there are n − k + 1 windows. (The general pattern is the [sliding window technique](/interview-question/what-is-the-sliding-window-technique).)

📌 **Interview term: Sliding window** — a fixed-size range that moves across the array one step at a time; each step adds the element on the right and removes the one on the left.

**Brute force — sort every window.** Copy the k numbers, sort, take the middle. O(k log k) per window, O(n·k log k) total. Simple and a great reference for testing.

**Better — keep the window sorted.** Remove the leaving number (binary search, then delete) and insert the entering one (binary search, then insert). The search is O(log k), but deleting and inserting shift elements: O(k) per step, O(n·k) total.

**Two heaps.** Exactly as for a stream: \`low\` is a max-heap of the smaller half, \`high\` a min-heap of the larger half, with the order rule (max(low) ≤ min(high)) and the size rule (|low| = |high| or |high| + 1). Why those rules give the median is explained in [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing). Adding is the same as before. The new problem is removing.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="The array 1 3 -1 -3 5 3 6 7 with a window of size 3 covering 5 3 6; -3 has just left and 6 has just entered">
  <defs>
    <marker id="b20q4cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="101" text-anchor="middle">1</text>
  <text class="d-sub" x="70" y="145" text-anchor="middle">0</text>
  <rect class="d-box" x="110" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="140" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="140" y="145" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="210" y="101" text-anchor="middle">-1</text>
  <text class="d-sub" x="210" y="145" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="280" y="101" text-anchor="middle">-3</text>
  <text class="d-sub" x="280" y="145" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="350" y="101" text-anchor="middle">5</text>
  <text class="d-sub" x="350" y="145" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="390" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="420" y="101" text-anchor="middle">3</text>
  <text class="d-sub" x="420" y="145" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="490" y="101" text-anchor="middle">6</text>
  <text class="d-sub" x="490" y="145" text-anchor="middle">6</text>
  <rect class="d-box" x="530" y="70" width="60" height="50" rx="6"/>
  <text class="d-text" x="560" y="101" text-anchor="middle">7</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">7</text>
  <path class="d-edge-accent" d="M 320 56 L 520 56"/>
  <text class="d-text" x="420" y="40" text-anchor="middle">window k = 3, median 5</text>
  <path class="d-edge-dashed" d="M 280 198 L 280 158" marker-end="url(#b20q4cp-a1)"/>
  <text class="d-sub" x="280" y="220" text-anchor="middle">-3 leaves</text>
  <path class="d-edge" d="M 490 198 L 490 158" marker-end="url(#b20q4cp-a1)"/>
  <text class="d-sub" x="490" y="220" text-anchor="middle">6 enters</text>
</svg>

At index 6 the window is \`[5, 3, 6]\`: the number −3 (index 3) has just left and 6 (index 6) has just entered. Both heaps must reflect that before we read the median.

## 4. Lazy Deletion: Remove It Later

Most heap libraries cannot delete an arbitrary value efficiently (finding it alone is O(k)). So we do not delete it. We **write it down** in a [hash map](/interview-question/how-does-a-hash-table-work) \`delayed[value] += 1\` and leave it in the heap. It is physically there but logically gone.

📌 **Interview term: Lazy deletion** — marking an element as deleted instead of removing it, and discarding it later when it is cheap to do so. For a heap, "cheap" means when the element reaches the top.

Three details make it correct:

1. **Count live elements separately.** \`low_size\` and \`high_size\` count only numbers still in the window. The size rule uses these, never the physical heap lengths.
2. **Know which side the leaving number is on.** Because of the order rule, if \`x ≤ max(low)\` the number is counted in \`low\`; otherwise it is in \`high\`. Decrement that side's live size.
3. **Never let a stale number sit on top.** After any operation that could expose one (a removal of the top, or a move between heaps), pop tops while they appear in \`delayed\`. This "prune" step is the only place stale numbers are really removed.

📌 **Interview term: Live size vs physical size** — the number of elements that still belong to the window versus the number stored in the heap, including stale ones. Balancing must use the live size.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The low heap physically holds 5, 3 and a stale -3; the delayed map records -3 once; only 5 and 3 are live">
  <text class="d-text" x="170" y="26" text-anchor="middle">low heap (physical)</text>
  <rect class="d-box-accent" x="110" y="44" width="120" height="44" rx="8"/>
  <text class="d-text" x="170" y="71" text-anchor="middle">5  (top)</text>
  <rect class="d-box" x="40" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="95" y="157" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="190" y="130" width="110" height="44" rx="8"/>
  <text class="d-text" x="245" y="157" text-anchor="middle">-3 stale</text>
  <path class="d-edge" d="M 150 88 L 105 130"/>
  <path class="d-edge" d="M 190 88 L 235 130"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">live size 2, physical size 3</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">delayed (hash map)</text>
  <rect class="d-box" x="430" y="44" width="200" height="60" rx="8"/>
  <text class="d-text" x="530" y="80" text-anchor="middle">-3 : 1</text>
  <rect class="d-box-muted" x="400" y="140" width="260" height="60" rx="8"/>
  <text class="d-text" x="530" y="166" text-anchor="middle">popped only when it</text>
  <text class="d-sub" x="530" y="188" text-anchor="middle">reaches the top of a heap</text>
</svg>

This is the real state at index 6 of the example: −3 has left the window but is buried below 5 and 3 in \`low\`. It does no harm there. If it ever rises to the top, the prune step will pop it and decrement its count.

📌 **Interview term: Stale entry** — an element still stored in a data structure after it has logically been removed. Lazy deletion tolerates stale entries anywhere except at a heap top.

## 5. One Slide, Step by Step

Each step adds \`nums[i]\`, then removes \`nums[i - k]\` once the window is full, and records the median. Both operations end with a rebalance that uses live sizes and a prune of the heap that just lost its top. Here is the run for \`[1, 3, -1, -3, 5, 3, 6, 7]\`, k = 3, printed by an instrumented copy of the code (heaps shown sorted, stale numbers included):

| i | In | Out | low (physical) | high (physical) | delayed | live sizes | Median |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | −1 | — | [−1, 1] | [3] | {} | 2, 1 | 1.0 |
| 3 | −3 | 1 | [−3, −1] | [3] | {} | 2, 1 | −1.0 |
| 4 | 5 | 3 | [−3, −1] | [5] | {} | 2, 1 | −1.0 |
| 5 | 3 | −1 | [−3, 3] | [5] | {} | 2, 1 | 3.0 |
| 6 | 6 | −3 | [−3, 3, 5] | [6] | {−3: 1} | 2, 1 | 5.0 |
| 7 | 7 | 5 | [−3, 3, 6] | [7] | {−3: 1} | 2, 1 | 6.0 |

In most steps the leaving number happened to be a top and was pruned at once. At i = 6, −3 left from the bottom of \`low\` and stayed there as a stale entry; the median (5) was still correct, because only the top matters.

## 6. The Code in C++

\`low\` is \`priority_queue<int>\` (a max-heap by default) and \`high\` uses \`greater<int>\` (a min-heap). \`std::priority_queue\` has no erase at all, so lazy deletion is not just faster here, it is the only way to use it.

~~~cpp
struct SlidingMedian {
    priority_queue<int> low;                              // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: larger half
    unordered_map<int, int> delayed;                      // value -> stale copies in a heap
    int lowSize = 0, highSize = 0;

    template <class PQ>
    void prune(PQ& heap) {  // pop stale numbers while they sit on top
        while (!heap.empty()) {
            auto it = delayed.find(heap.top());  // find, not [], so we do not insert zeros
            if (it == delayed.end() || it->second == 0) break;
            it->second--;
            heap.pop();
        }
    }

    void balance() {
        if (lowSize > highSize + 1) {
            high.push(low.top()); low.pop();
            lowSize--; highSize++;
            prune(low);
        } else if (lowSize < highSize) {
            low.push(high.top()); high.pop();
            lowSize++; highSize--;
            prune(high);
        }
    }

    void add(int x) {
        if (low.empty() || x <= low.top()) { low.push(x); lowSize++; }
        else { high.push(x); highSize++; }
        balance();
    }

    void remove(int x) {
        delayed[x]++;  // mark it; popped when it reaches a top
        if (x <= low.top()) {
            lowSize--;
            if (x == low.top()) prune(low);
        } else {
            highSize--;
            if (!high.empty() && x == high.top()) prune(high);
        }
        balance();
    }

    double median(int k) const {
        if (k % 2 == 1) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // widen first: int + int can overflow (UB)
    }
};
~~~

The driver slides the window:

~~~cpp
vector<double> medianSlidingWindow(const vector<int>& nums, int k) {
    SlidingMedian sm;
    vector<double> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        sm.add(nums[i]);
        if (i >= k) sm.remove(nums[i - k]);  // the number that just left the window
        if (i >= k - 1) out.push_back(sm.median(k));
    }
    return out;
}
~~~

**What to point out in this code:**

- \`prune\` uses \`delayed.find(...)\`, not \`delayed[...]\`. \`operator[]\` on an \`unordered_map\` inserts a zero entry for every value it looks up, which quietly grows the map; \`find\` only reads.
- \`prune\` is a member template so the same code cleans both heap types (\`priority_queue<int>\` and the \`greater\` one), which are different types.
- \`remove\` compares the leaving number with \`low.top()\`; the order rule guarantees anything ≤ \`max(low)\` is booked in \`low\`, so the live counts stay right with duplicates.
- \`((long long)low.top() + high.top()) / 2.0\` widens before adding: signed overflow is undefined behaviour, and \`[2147483647, 2147483647]\` would hit it (example 1).

**The C++ favourite: one \`std::multiset\` and a median iterator.** A \`multiset\` keeps the window sorted with O(log k) insert and erase, and an iterator \`mid\` can be nudged one step per change instead of being searched for:

~~~cpp
vector<long long> multisetWindows(const vector<int>& nums, int k) {
    multiset<int> w(nums.begin(), nums.begin() + k);
    auto mid = next(w.begin(), k / 2);
    vector<long long> out;
    for (int i = k;; i++) {
        out.push_back((long long)*mid + *prev(mid, 1 - k % 2));  // odd k: mid twice; even: mid and its left
        if (i == (int)nums.size()) break;
        w.insert(nums[i]);                    // equal keys go after existing ones
        if (nums[i] < *mid) mid--;
        if (nums[i - k] <= *mid) mid++;
        w.erase(w.lower_bound(nums[i - k]));  // erase ONE copy; erase(value) would remove them all
    }
    return out;
}
~~~

- \`w.insert(x)\` places an equal key **after** the existing ones (it inserts at the upper bound of the equal range, per [cppreference: multiset::insert](https://cpp-ref.vnoi.info/cpp/container/multiset/insert.html)). That is why the code moves \`mid\` left only when \`nums[i] < *mid\`.
- \`w.erase(w.lower_bound(x))\` erases **one** copy. \`w.erase(x)\` erases **all** copies: on \`{5, 5, 5, 7}\` we ran \`erase(5)\` and 1 element remained, while \`erase(find(5))\` left 3.
- Inserting into a \`multiset\` never invalidates existing iterators, and erasing invalidates only the erased one. That is what makes keeping \`mid\` across steps legal, as long as \`mid\` is moved off the element before it is erased (the \`nums[i - k] <= *mid\` step does this).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the two-heap solution on seven inputs (odd and even k, duplicates, k = 1, k = n, and the overflow case)** prints:

~~~text
[1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
[0.0, 1.0, 1.0, 4.0, 5.5]
[2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
[5.0, 5.0, 5.0, 5.0]
[2147483647.0]
[7.0]
[3.0]
~~~

The first line matches the step table in section 5.

**Example 2 — the heap solution against brute force (sort every window) and a sorted-window alternative, on 2,000 numbers with many duplicates, for five window sizes.** Medians are compared as *twice the median* (an integer), so the comparison is exact; "max heap entries" is the largest physical size of both heaps together, stale entries included. It prints:

~~~text
k = 1: windows 2000, heaps match brute force: true, sorted window matches: true, checksum 1984344, max heap entries 1
k = 2: windows 1999, heaps match brute force: true, sorted window matches: true, checksum 1983234, max heap entries 14
k = 50: windows 1951, heaps match brute force: true, sorted window matches: true, checksum 1920612, max heap entries 1307
k = 51: windows 1950, heaps match brute force: true, sorted window matches: true, checksum 1918390, max heap entries 1340
k = 2000: windows 1, heaps match brute force: true, sorted window matches: true, checksum 970, max heap entries 2000
~~~

Every window matched brute force for every k. The "sorted window" column is the \`std::multiset\` with a median iterator in this language; it matched too.

## 8. The Memory Catch

Stale entries are only removed when they reach a top. A number that is small enough to sink to the bottom of \`low\` may stay there for a long time. Example 2 tracks the largest physical size of the two heaps together: for k = 50 it reached **1,307** entries on a 2,000-number input, although the window never holds more than 50 live numbers. With k = 2,000 (the whole array) it is simply 2,000.

So the honest complexity is **O(n log n) time and O(n) extra space in the worst case**, not O(k) space. If memory matters, there are three standard fixes:

- **Rebuild when the heaps get too dirty**, for example when the physical size exceeds 2·k: filter out stale entries and heapify again (O(k)), which keeps space O(k) at an amortised O(1) extra cost per step.
- **Store indexes instead of values** in an ordered structure that supports real deletion (a balanced BST / ordered set), so nothing ever goes stale.
- **Keep a sorted window** when k is small: O(k) per step, but no stale data at all.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence. Each number is pushed once and popped at most once, so the heap work is O(log n) amortised per step even though a single prune may pop several entries.

## 9. Why Not Just Recompute?

It helps to put numbers on the three approaches for a typical interview limit, n = 10^5 and k = 10^4. Sorting every window costs about 9 × 10^4 windows × 10^4 × log₂(10^4) ≈ 1.2 × 10^10 comparisons: far too slow. A sorted window costs about 9 × 10^4 × 10^4 ≈ 9 × 10^8 element shifts: slow, though memory moves are fast. Two heaps cost about 2 × 10^5 pushes and pops at roughly log₂(10^5) ≈ 17 steps each, a few million operations. Those are estimates from the formulas, not measurements; example 2 measures correctness, not speed.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Sort every window | O(n·k log k) | O(k) | one sort of k numbers per window |
| Sorted window | O(n·k) | O(k) | binary search is O(log k), but insert and delete shift O(k) elements |
| Two heaps + lazy deletion | O(n log n) | O(n) worst case | each number is pushed once and popped at most once; stale entries can pile up |
| Two heaps + rebuild at 2k | O(n log k) amortised | O(k) | rebuilding keeps both heaps small |
| Balanced BST / ordered multiset | O(n log k) | O(k) | real deletions, no stale entries |

## 11. Edge Cases

- **k = 1.** Every number is its own median; the window is one element and \`high\` stays empty. Example 2 checks it against brute force.
- **k = n.** One window, the median of the whole array (example 2: one window, checksum 970, so the median is 485.0).
- **Even k.** Average the two tops: \`[1, 3, -1, -3, 5, 3, 6, 7]\` with k = 4 gives \`[0.0, 1.0, 1.0, 4.0, 5.5]\` (example 1).
- **Duplicates.** \`[5, 5, 5, 5, 5]\` with k = 2: the leaving 5 may be removed from either heap, because all copies are interchangeable. \`delayed\` counts copies, so two stale 5s need two increments.
- **Overflow.** \`[2147483647, 2147483647]\` with k = 2 must give 2147483647.0; Java and C++ widen before adding.
- **A leaving number equal to \`max(low)\` that also exists in \`high\`.** The test \`x ≤ max(low)\` books it to \`low\`; that is consistent, because \`low\` really holds a copy of that value (its top).

## Common Pitfalls

- **\`multiset::erase(value)\` on duplicates.** It removes every copy: \`erase(5)\` on \`{5, 5, 5, 7}\` left 1 element. Erase one iterator: \`w.erase(w.find(x))\`.
- **\`delayed[x]\` in a read path.** \`operator[]\` inserts zero entries; use \`find\` when only reading.
- **Signed overflow when averaging.** Undefined behaviour for \`[2147483647, 2147483647]\`; cast to \`long long\` first.
- **Balancing with \`heap.size()\`.** It includes stale entries; use the live counters.
- **Dereferencing an erased iterator.** In the \`multiset\` version, moving \`mid\` after erasing the element it pointed to is undefined behaviour; adjust \`mid\` first, then erase.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reuse the stream idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int&gt;</code> (max-heap), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;int&gt;</code>, with the order and size rules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The new problem:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> cannot erase arbitrary elements, so I delete lazily: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed[x]++</code> and leave it in the heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Live sizes for the size rule; the leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is booked to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;= low.top()</code>, else to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pruning:</strong> <span style="color:#f0e2c8;">After removing a top or moving one, pop tops while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delayed</code> has them, reading with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ shortcut:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiset</code> plus a median iterator is O(log k) per step with no stale entries; erase one copy with an iterator, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase(value)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heaps or multiset in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiset</code> is shorter and O(n log k) with O(k) space, but it is a red-black tree with a node per element. The heaps are cache friendlier but leave stale entries (1,307 for k = 50 in my run). Either is a strong answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">multiset</code> iterator stay valid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiset</code> insertions invalidate no iterators and an erase invalidates only the erased one, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> survives as long as you move it off the element before erasing it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you tell which heap the leaving number is in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the order rule, everything ≤ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(low)</code> is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, except copies equal to the top, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> holds such a copy itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you bound the heap memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild a heap when its physical size passes about 2·k: copy the live values into a fresh vector and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">make_heap</code>, O(k), amortised O(1) per step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> of each window on random arrays with duplicates and k = 1, 2, odd, even and n. Example 2 checks the heaps and the multiset that way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | A fixed-size range moving across an array one step at a time |
| **Lazy deletion** | Mark an element as deleted and discard it later, when it reaches a heap top |
| **Live size vs physical size** | Elements still in the window vs elements stored in the heap, stale ones included |
| **Stale entry** | An element still stored after it was logically removed |
| **Amortised cost** | Average cost per operation over a long sequence |
| **Iterator invalidation** | When a container operation makes existing iterators unusable; multiset erase invalidates only the erased one |

---
**Conclusion:** The sliding window median is the stream median plus deletions. With heaps, delete lazily: count leaving numbers in an \`unordered_map\`, track live sizes, and pop stale numbers only when they reach a top, because \`std::priority_queue\` cannot erase anything else. In C++ the \`multiset\` with a median iterator is an equally good answer, and its traps are the classic ones: \`erase(value)\` removes every copy, and an iterator must be moved before the element it points to is erased.`,
        examples: [
          {
            label: `Two heaps + lazy deletion on seven inputs`,
            code: `#include <cstdio>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
// lowSize/highSize count only the live ones.
struct SlidingMedian {
    priority_queue<int> low;                              // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: larger half
    unordered_map<int, int> delayed;                      // value -> stale copies in a heap
    int lowSize = 0, highSize = 0;

    template <class PQ>
    void prune(PQ& heap) {  // pop stale numbers while they sit on top
        while (!heap.empty()) {
            auto it = delayed.find(heap.top());  // find, not [], so we do not insert zeros
            if (it == delayed.end() || it->second == 0) break;
            it->second--;
            heap.pop();
        }
    }

    void balance() {
        if (lowSize > highSize + 1) {
            high.push(low.top()); low.pop();
            lowSize--; highSize++;
            prune(low);
        } else if (lowSize < highSize) {
            low.push(high.top()); high.pop();
            lowSize++; highSize--;
            prune(high);
        }
    }

    void add(int x) {
        if (low.empty() || x <= low.top()) { low.push(x); lowSize++; }
        else { high.push(x); highSize++; }
        balance();
    }

    void remove(int x) {
        delayed[x]++;  // mark it; popped when it reaches a top
        if (x <= low.top()) {
            lowSize--;
            if (x == low.top()) prune(low);
        } else {
            highSize--;
            if (!high.empty() && x == high.top()) prune(high);
        }
        balance();
    }

    double median(int k) const {
        if (k % 2 == 1) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // widen first: int + int can overflow (UB)
    }
};

vector<double> medianSlidingWindow(const vector<int>& nums, int k) {
    SlidingMedian sm;
    vector<double> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        sm.add(nums[i]);
        if (i >= k) sm.remove(nums[i - k]);  // the number that just left the window
        if (i >= k - 1) out.push_back(sm.median(k));
    }
    return out;
}

string fmt(const vector<double>& xs) {
    string s = "[";
    char buf[32];
    for (size_t i = 0; i < xs.size(); i++) {
        snprintf(buf, sizeof buf, "%.1f", xs[i]);
        s += (i ? ", " : "") + string(buf);
    }
    return s + "]";
}

int main() {
    cout << fmt(medianSlidingWindow({1, 3, -1, -3, 5, 3, 6, 7}, 3)) << "\\n";  // [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
    cout << fmt(medianSlidingWindow({1, 3, -1, -3, 5, 3, 6, 7}, 4)) << "\\n";  // [0.0, 1.0, 1.0, 4.0, 5.5]
    cout << fmt(medianSlidingWindow({1, 2, 3, 4, 2, 3, 1, 4, 2}, 3)) << "\\n";  // [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]
    cout << fmt(medianSlidingWindow({5, 5, 5, 5, 5}, 2)) << "\\n";  // [5.0, 5.0, 5.0, 5.0]
    cout << fmt(medianSlidingWindow({2147483647, 2147483647}, 2)) << "\\n";  // [2147483647.0]
    cout << fmt(medianSlidingWindow({7}, 1)) << "\\n";  // [7.0]
    cout << fmt(medianSlidingWindow({4, 1, 3}, 3)) << "\\n";  // [3.0]
}`,
          },
          {
            label: `Heaps vs brute force vs sorted window, five window sizes`,
            code: `#include <algorithm>
#include <cstdio>
#include <functional>
#include <iterator>
#include <numeric>
#include <queue>
#include <set>
#include <unordered_map>
#include <vector>
using namespace std;

// Two heaps + lazy deletion. low/high may hold stale numbers that left the window;
// lowSize/highSize count only the live ones.
struct SlidingMedian {
    priority_queue<int> low;                              // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: larger half
    unordered_map<int, int> delayed;                      // value -> stale copies in a heap
    int lowSize = 0, highSize = 0;

    template <class PQ>
    void prune(PQ& heap) {  // pop stale numbers while they sit on top
        while (!heap.empty()) {
            auto it = delayed.find(heap.top());  // find, not [], so we do not insert zeros
            if (it == delayed.end() || it->second == 0) break;
            it->second--;
            heap.pop();
        }
    }

    void balance() {
        if (lowSize > highSize + 1) {
            high.push(low.top()); low.pop();
            lowSize--; highSize++;
            prune(low);
        } else if (lowSize < highSize) {
            low.push(high.top()); high.pop();
            lowSize++; highSize--;
            prune(high);
        }
    }

    void add(int x) {
        if (low.empty() || x <= low.top()) { low.push(x); lowSize++; }
        else { high.push(x); highSize++; }
        balance();
    }

    void remove(int x) {
        delayed[x]++;  // mark it; popped when it reaches a top
        if (x <= low.top()) {
            lowSize--;
            if (x == low.top()) prune(low);
        } else {
            highSize--;
            if (!high.empty() && x == high.top()) prune(high);
        }
        balance();
    }

    double median(int k) const {
        if (k % 2 == 1) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;  // widen first: int + int can overflow (UB)
    }
};

int most;  // the most entries the two heaps ever held, stale ones included

vector<long long> heapWindows(const vector<int>& nums, int k) {  // twice each window median
    SlidingMedian sm;
    vector<long long> out;
    most = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        sm.add(nums[i]);
        if (i >= k) sm.remove(nums[i - k]);
        most = max(most, (int)(sm.low.size() + sm.high.size()));
        if (i >= k - 1) out.push_back((long long)(sm.median(k) * 2));
    }
    return out;
}

vector<long long> bruteWindows(const vector<int>& nums, int k) {  // sort every window from scratch
    vector<long long> out;
    for (size_t i = 0; i + k <= nums.size(); i++) {
        vector<int> w(nums.begin() + i, nums.begin() + i + k);
        sort(w.begin(), w.end());
        out.push_back((long long)w[k / 2] + w[(k - 1) / 2]);
    }
    return out;
}

// The C++ favourite: one multiset plus an iterator that always points at the median.
vector<long long> multisetWindows(const vector<int>& nums, int k) {
    multiset<int> w(nums.begin(), nums.begin() + k);
    auto mid = next(w.begin(), k / 2);
    vector<long long> out;
    for (int i = k;; i++) {
        out.push_back((long long)*mid + *prev(mid, 1 - k % 2));  // odd k: mid twice; even: mid and its left
        if (i == (int)nums.size()) break;
        w.insert(nums[i]);                    // equal keys go after existing ones
        if (nums[i] < *mid) mid--;
        if (nums[i - k] <= *mid) mid++;
        w.erase(w.lower_bound(nums[i - k]));  // erase ONE copy; erase(value) would remove them all
    }
    return out;
}

vector<int> make(int n, long long seed) {
    vector<int> out;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647;  // MINSTD; long long, because the product overflows int
        out.push_back((int)(seed % 1000));  // many duplicates on purpose
    }
    return out;
}

int main() {
    vector<int> nums = make(2000, 5);
    for (int k : {1, 2, 50, 51, 2000}) {
        auto heaps = heapWindows(nums, k);
        auto brute = bruteWindows(nums, k);
        printf("k = %d: windows %zu, heaps match brute force: %s, sorted window matches: %s, checksum %lld, max heap entries %d\\n",
               k, heaps.size(), heaps == brute ? "true" : "false", multisetWindows(nums, k) == brute ? "true" : "false",
               accumulate(heaps.begin(), heaps.end(), 0LL), most);
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: `Design Twitter feed: how do you fan-out with heap + hash for timeline?`,
    difficulty: "hard",
    seoDescription: `Design Twitter: hash maps for follows and tweets, a heap to merge the newest 10, and fan-out on read vs write vs hybrid, in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Design a simplified Twitter in Python with \`post_tweet(user, tweet_id)\`, \`get_news_feed(user)\` returning the 10 most recent tweet ids from the user and everyone they follow, newest first, plus \`follow\` and \`unfollow\`. Then tell me how you would change the design if some users had millions of followers."

**What a strong answer should cover:**
- Hash maps: user → set of followees, user → list of \`(time, tweet_id)\`; a global counter as the timestamp.
- The feed as a k-way merge of sorted lists with a max-heap, stopping after 10: O(f + 10 log f).
- Fan-out on read vs fan-out on write, the celebrity problem, and the hybrid approach.
- Edge cases: own tweets included, self-follow ignored, unfollowing a stranger is a no-op, empty feeds.
- Python details: \`heapq\` is a min-heap, so push \`-time\`; \`collections.defaultdict\` creates entries on read unless you use \`.get()\`; \`set.discard\` vs \`set.remove\`.

**Clarifying questions expected:**
- Does the feed include the user's own tweets, and how many tweets?
- How skewed are follower counts, and what is the read/write ratio?

**Code / implementation expected:** Yes — a \`Twitter\` class with dicts, sets and \`heapq\`, in Python 3.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in Python.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a village where everyone writes short notes, and every morning each person wants to read the 10 newest notes from the friends they follow. There are two ways to deliver them.

**The reader goes collecting.** You walk to each friend's house, look at the newest notes pinned on their door, and pick the 10 newest overall. Posting is free (pin it on your own door), but reading means visiting every friend.

**The writer goes delivering.** Each time someone writes a note, they make a copy and drop it in the mailbox of every follower. Reading is instant: open your own mailbox. But a very popular villager with 10,000 followers spends the whole day making copies.

That is the entire design question. The coding version ("design Twitter" with \`postTweet\`, \`getNewsFeed\`, \`follow\`, \`unfollow\`) is solved with **hash maps** for who follows whom and who posted what, and a **heap** to pick the 10 newest tweets out of many sorted lists. The system-design follow-up is the choice between the two delivery strategies: **fan-out on read** and **fan-out on write**, and the hybrid real systems use for celebrities.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many tweets in a feed, and in what order? | The classic version is the 10 most recent, newest first. A fixed small limit is what makes the heap merge cheap. |
| Does a user see their own tweets? | Usually yes, so the user is added to their own source list. |
| Can a user follow themselves? Unfollow someone they do not follow? | Both should be harmless no-ops; decide now so the code does not throw. |
| How is "most recent" defined: a clock or a counter? | A global counter that increases on every post gives a strict order with no ties. |
| How many users, how many follows per user, how skewed? | Decides pull vs push. A few accounts with millions of followers break pure push. |
| What is the read/write ratio? | Feeds are usually read far more often than tweets are posted, which favours doing work at write time, except for celebrities. |

## 3. The Data Model: Hash Maps and a Clock

We need three pieces of state, and every operation except the feed is an O(1) hash-map operation (see [how a hash table works](/interview-question/how-does-a-hash-table-work)):

- \`following\`: user → **set** of users they follow. A set makes \`follow\` and \`unfollow\` O(1) and ignores duplicates.
- \`tweets\`: user → **list** of \`(time, tweetId)\` in the order posted. Appending keeps each list sorted by time for free.
- \`time\`: one global counter, incremented on every post. It gives every tweet a unique, strictly increasing timestamp, so "newest" never has ties.

📌 **Interview term: Monotonic counter** — a number that only ever increases. Used as a timestamp it gives a total order, unlike wall-clock time, which can repeat or jump backwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Three pieces of state: a hash map from user to the set of users they follow, a hash map from user to their tweets with timestamps, and one global clock">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">following: hash map</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">user 1 maps to set of 2, 7, 9</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">tweets: hash map</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">user 2 maps to (3, 101), (8, 105)</text>
  <rect class="d-box-accent" x="200" y="150" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="176" text-anchor="middle">clock: one global counter</text>
  <text class="d-sub" x="350" y="196" text-anchor="middle">time 1, 2, 3 on every post</text>
</svg>

\`following\` and \`tweets\` are separate maps keyed by user id; the clock is shared by everybody.

## 4. Building the Feed: Merge k Sorted Lists, Stop at 10

Each followed user's tweet list is already sorted by time. The feed is the 10 newest items across f + 1 sorted lists (f followees plus yourself). That is exactly [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), read from the newest end, with an early stop after 10:

1. Put the **newest** tweet of each source into a **max-heap** keyed by time.
2. Pop the top: it is the newest remaining tweet overall. Add its id to the feed.
3. Push the **next-newest** tweet of the same user (if any).
4. Repeat until the feed has 10 tweets or the heap is empty.

📌 **Interview term: Fan-out on read (pull model)** — the feed is computed when it is read, by pulling from every followed user. Posting is O(1); reading costs O(f) to seed the heap plus O(10 log f) to pop.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on read: when user 1 opens the feed, the newest tweet of each followed user goes into a max-heap and the ten newest are popped">
  <defs>
    <marker id="b20q5py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="47" text-anchor="middle">user 2 tweets</text>
  <rect class="d-box" x="20" y="100" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="127" text-anchor="middle">user 7 tweets</text>
  <rect class="d-box" x="20" y="180" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="207" text-anchor="middle">user 1 (self)</text>
  <path class="d-edge" d="M 202 42 L 266 100" marker-end="url(#b20q5py-a1)"/>
  <path class="d-edge" d="M 202 122 L 266 122" marker-end="url(#b20q5py-a1)"/>
  <path class="d-edge" d="M 202 202 L 266 146" marker-end="url(#b20q5py-a1)"/>
  <rect class="d-box-accent" x="272" y="72" width="180" height="100" rx="10"/>
  <text class="d-text" x="362" y="106" text-anchor="middle">max-heap by time</text>
  <text class="d-sub" x="362" y="132" text-anchor="middle">one entry per user</text>
  <text class="d-sub" x="362" y="154" text-anchor="middle">pop up to 10 times</text>
  <path class="d-edge-accent" d="M 454 122 L 514 122" marker-end="url(#b20q5py-a1)"/>
  <rect class="d-box-muted" x="520" y="92" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="118" text-anchor="middle">feed</text>
  <text class="d-sub" x="600" y="140" text-anchor="middle">10 newest ids</text>
</svg>

Each followed user contributes only their single newest tweet to the heap at first; a user's older tweets enter only when the newer one has been taken. So the heap never holds more than f + 1 entries, and at most 10 + f entries are ever pushed.

Why a heap rather than collecting everything and sorting? If each of 300 followees has 1,000 tweets, sorting all 300,000 to take 10 is absurd. The heap touches at most f + 10 tweets. (Comparing heap merges with pairwise merging in general is covered in [heap vs divide and conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k); with an early stop after 10, the heap is the clear winner.)

📌 **Interview term: Early termination** — stopping an algorithm as soon as the answer is known. A heap merge can stop after 10 pops; a full merge or sort cannot.

## 5. The Code in Python

~~~python
class Twitter:
    """Fan-out on read: each user keeps their own tweets; the feed is a k-way merge with a heap."""

    FEED_SIZE = 10

    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)    # user -> [(time, tweet_id), ...] oldest first
        self.following = defaultdict(set)  # user -> set of users they follow

    def post_tweet(self, user, tweet_id):
        self.time += 1                     # a global counter orders tweets across users
        self.tweets[user].append((self.time, tweet_id))

    def get_news_feed(self, user):
        heap = []
        # .get() instead of [] so that reading a feed never creates empty entries
        for u in self.following.get(user, set()) | {user}:  # you always see your own tweets
            if self.tweets.get(u):
                i = len(self.tweets[u]) - 1        # start from each user's newest tweet
                t, tid = self.tweets[u][i]
                heap.append((-t, tid, u, i))       # negate time: heapq is a min-heap
        heapq.heapify(heap)                         # O(f) for f followees
        feed = []
        while heap and len(feed) < self.FEED_SIZE:
            _, tid, u, i = heapq.heappop(heap)
            feed.append(tid)
            if i > 0:                               # that user's next-newest tweet
                t, nxt = self.tweets[u][i - 1]
                heapq.heappush(heap, (-t, nxt, u, i - 1))
        return feed

    def follow(self, follower, followee):
        if follower != followee:
            self.following[follower].add(followee)

    def unfollow(self, follower, followee):
        self.following[follower].discard(followee)  # discard: no error if absent
~~~

**What to point out in this code:**

- \`heapq\` is a min-heap, so the entry stores \`-t\`: the newest tweet has the most negative key and comes out first. The entry also carries \`u\` and \`i\` so we know where the next-newest tweet of that user is.
- Because every \`t\` is unique, tuple comparison never gets past the first field, so Python never compares the later fields. (Equal first fields with incomparable later fields would raise \`TypeError\`.)
- \`heapq.heapify(heap)\` builds the starting heap in O(f) instead of f separate pushes.
- \`defaultdict(list)\` and \`defaultdict(set)\` make \`post_tweet\` and \`follow\` one-liners, but **reading** \`self.tweets[u]\` for an unknown user would insert an empty list. The feed therefore uses \`.get(...)\`, so reading the feed of a stranger (user 42) leaves the maps unchanged.
- \`self.following.get(user, set()) | {user}\` builds a new set, so adding yourself never modifies the stored follow set.
- \`discard\` removes a member if present and does nothing otherwise; \`remove\` would raise \`KeyError\` when unfollowing a stranger.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the classic sequence (post, follow, post, unfollow), then 12 alternating tweets, a self-follow, an unfollow of a stranger, and a user who has never done anything** prints:

~~~text
[5]
[6, 5]
[5]
[112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
[111, 109, 107, 105, 103, 101]
[]
~~~

User 3 follows users 1 and 2, so the feed is the 10 newest of all 12 tweets (112 down to 103). User 1 follows nobody and sees only their own 6 tweets. User 42 gets an empty list.

**Example 2 — the same 3,000-operation workload under pull, push and hybrid, counting work and checking that every feed is identical** prints:

~~~text
users 300, posts 953, feed reads 2047, celebrities 1
biggest single fan-out (push): 300 timeline writes
pull: write work 953, read work 49082, total 50035
push: write work 62139, read work 20035, total 82174
hybrid: write work 4731, read work 43879, total 48610
all three designs return the same feeds: true
~~~

## 7. The Real Design Question: Fan-Out on Read vs Write

The coding version computes feeds on read. At scale, the interviewer will ask whether to do the work when tweets are **written** instead.

📌 **Interview term: Fan-out on write (push model)** — when a user posts, copy the tweet id into a stored timeline for every follower. Reading a feed is a lookup; posting costs one write per follower.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on write: when user 2 posts, the tweet is copied into the stored timeline of every follower; reading a feed is then a simple lookup">
  <defs>
    <marker id="b20q5py-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="98" width="170" height="54" rx="10"/>
  <text class="d-text" x="105" y="122" text-anchor="middle">user 2 posts</text>
  <text class="d-sub" x="105" y="142" text-anchor="middle">tweet 105</text>
  <path class="d-edge" d="M 192 112 L 300 46" marker-end="url(#b20q5py-a2)"/>
  <path class="d-edge" d="M 192 125 L 300 125" marker-end="url(#b20q5py-a2)"/>
  <path class="d-edge" d="M 192 138 L 300 204" marker-end="url(#b20q5py-a2)"/>
  <rect class="d-box" x="306" y="22" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="49" text-anchor="middle">timeline of user 1</text>
  <rect class="d-box" x="306" y="103" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="130" text-anchor="middle">timeline of user 5</text>
  <rect class="d-box" x="306" y="184" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="211" text-anchor="middle">timeline of user 2</text>
  <rect class="d-box-muted" x="570" y="103" width="110" height="44" rx="8"/>
  <text class="d-text" x="625" y="130" text-anchor="middle">read: O(1)</text>
  <path class="d-edge-dashed" d="M 528 125 L 566 125" marker-end="url(#b20q5py-a2)"/>
</svg>

Each follower keeps a short stored timeline (here the latest 10 ids), so reading never touches anyone else's data.

The problem with push is the **celebrity**: an account followed by everyone turns one post into millions of writes, and those writes are wasted for followers who never open the app.

📌 **Interview term: Celebrity (hot key) problem** — a few accounts with enormous follower counts dominate the cost of fan-out on write, and any single machine or key that holds them becomes a hotspot.

📌 **Interview term: Hybrid fan-out** — push tweets from normal accounts into their followers' timelines, but do not fan out celebrity tweets; at read time, merge the stored timeline with the few celebrities the reader follows, using the same heap merge.

To put numbers on it, example 2 simulates 300 users. Each follows 5 random users, and everybody also follows user 0, the celebrity (299 followers). Over 3,000 operations about 30% are posts (20% of them by the celebrity) and the rest are feed reads. "Write work" counts timeline insertions; "read work" counts heap entries pushed and popped (or timeline items read, for push). All three designs are checked to return identical feeds on every read.

| Design | Write work | Read work | Total |
| :--- | :--- | :--- | :--- |
| Pull (fan-out on read) | 953 | 49,082 | 50,035 |
| Push (fan-out on write) | 62,139 | 20,035 | 82,174 |
| Hybrid (no fan-out for the celebrity) | 4,731 | 43,879 | 48,610 |

Push made reads cheapest, but paid 62,139 writes, mostly because every one of the celebrity posts was copied 300 times (the biggest single fan-out). The hybrid cut writes by about 13× compared with push, and read work stayed close to pull, because each read merges only one stored timeline plus one celebrity list instead of up to seven tweet lists. In this toy workload pull and hybrid are close; the gap grows with follower counts and with how much more often feeds are read than written. The point to make in an interview is the *shape* of the trade-off, not these exact numbers.

## 8. How the Pieces Fit

Every part of this design is a pattern with its own page. The maps are plain [hash tables](/interview-question/how-does-a-hash-table-work). The feed is [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists) with an early stop. Keeping "the 10 best of many" with a heap is the same idea as [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements). Recognising those three patterns is what lets you write the class in 15 minutes and spend the rest of the interview on fan-out.

## 9. Complexity

With f = number of users someone follows, F = followers of the poster, and a feed size of 10:

| Operation | Pull model | Push model | Why |
| :--- | :--- | :--- | :--- |
| \`postTweet\` | O(1) | O(F) | append to own list vs copy into F timelines |
| \`getNewsFeed\` | O(f + 10 log f) | O(10) | seed a heap with f entries (heapify is O(f)), pop 10 vs read a stored list |
| \`follow\` / \`unfollow\` | O(1) | O(1) plus backfill or cleanup | set insert/remove; push must also add or remove tweets in the stored timeline |
| Space | O(users + follows + tweets) | plus 10 ids per user timeline | timelines are bounded copies |

## 10. Beyond One Machine (Briefly)

- **Cap what you scan.** A feed needs at most 10 tweets per followed user, so only each user's newest 10 tweets are ever touched. Old tweets can live in slower storage.
- **Shard by user id.** \`following\`, \`tweets\` and timelines are all keyed by user, so they split naturally across machines; the heap merge then pulls from several shards.
- **Cache feeds.** A freshly computed pull feed can be cached for a short time, like an [LRU cache](/interview-question/how-do-you-design-an-lru-cache); a push timeline already is a cache.
- **Unfollow in the push model** means removing that user's tweets from the stored timeline (or filtering at read time), which is why the coding version usually uses pull.

## 11. Edge Cases

- **A user with no tweets and no follows** (user 42 in example 1): the feed is empty, and reading it must not create empty entries in the maps.
- **Fewer than 10 tweets in total:** the heap empties before 10 pops; return what you have (user 1 sees 6 tweets in example 1).
- **Following yourself:** ignored by \`follow\`; your own tweets are always included anyway.
- **Unfollowing someone you do not follow:** a no-op, never an error.
- **Unfollow, then read:** the unfollowed user disappears from the feed immediately, because the pull model reads \`following\` at feed time (\`[6, 5]\` becomes \`[5]\` in example 1).
- **Two tweets posted "at the same time":** impossible with a global counter; with wall-clock timestamps you would need a tie-breaker such as the tweet id.

## Common Pitfalls

- **Pushing \`time\` instead of \`-time\` into \`heapq\`.** The feed comes out oldest first. \`heapq\` has no max-heap mode before Python 3.14.
- **Reading through a \`defaultdict\`.** \`self.tweets[u]\` on a read path creates an empty list for every stranger whose feed is requested; use \`.get(u)\`.
- **Adding yourself to your own follow set.** \`self.following[user].add(user)\` inside the feed would make the user follow themselves permanently; build a new set with \`|\`.
- **Using \`set.remove\` in \`unfollow\`.** Raises \`KeyError\` when the follow does not exist; \`discard\` is the safe call.
- **Sorting all tweets of all followees.** \`sorted(all_tweets)[:10]\` is O(T log T) for T tweets; the heap touches at most f + 10.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">Two dicts: user to set of followees, user to list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(time, tweet_id)</code>, plus one global counter as the timestamp.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Feed:</strong> <span style="color:#f0e2c8;">A k-way merge from the newest end: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(-time, id, user, index)</code>, pop up to 10, push that user's next-newest tweet.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Post, follow, unfollow are O(1). The feed is O(f) to heapify plus O(10 log f) to pop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">Negate time because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is a min-heap; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.get()</code> on read paths so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict</code> does not grow; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">discard</code> for unfollow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. At scale:</strong> <span style="color:#f0e2c8;">Pull is cheap to write, push is cheap to read; celebrities break push, so the hybrid fans out normal users and merges celebrities at read time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a heap and not sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">We need only 10 items from f sorted lists. The heap touches at most f + 10 tweets; sorting would touch every tweet of every followee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a global counter instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">time.time()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The counter is unique and strictly increasing, so there are no ties and no clock jumps; wall-clock time can repeat within a millisecond.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add delete-tweet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mark the id as deleted in a set and skip it while popping (pop one extra). That is lazy deletion, the same trick as in the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for fan-out on write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each user gets a stored timeline (say a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque(maxlen=...)</code>); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">post_tweet</code> appends to every follower. Follow and unfollow then need to backfill or clean that timeline.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the hybrid draw the line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a follower-count threshold. Below it, push; above it, pull at read time and merge with the stored timeline. In the simulation that cut writes from 62,139 to 4,731.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic counter** | A number that only increases; a tie-free timestamp |
| **Fan-out on read (pull model)** | Build the feed when it is read by merging the followees' tweets |
| **Early termination** | Stop as soon as the answer is known, here after 10 pops |
| **Fan-out on write (push model)** | Copy each new tweet into every follower's stored timeline |
| **Celebrity (hot key) problem** | A few huge accounts dominate fan-out cost and create hotspots |
| **Hybrid fan-out** | Push for normal accounts, pull for celebrities, merge at read time |
| **Negation trick** | Storing -time in Python heapq (a min-heap) so the newest item pops first |

---
**Conclusion:** Design Twitter is two hash maps, a clock and a heap. Follows and posts are O(1) dictionary and set operations; the feed is a k-way merge of each followed user's sorted tweets, run from the newest end with a max-heap and stopped after 10, so it costs O(f + 10 log f). In Python that heap is \`heapq\` with negated timestamps, and the maps should be read with \`.get()\`. Then lift it to system design: pull is cheap to write, push is cheap to read, and the hybrid that skips fan-out for celebrities gets most of both.`,
        examples: [
          {
            label: `Twitter class: post, follow, unfollow and the 10-tweet feed`,
            code: `import heapq
from collections import defaultdict


class Twitter:
    """Fan-out on read: each user keeps their own tweets; the feed is a k-way merge with a heap."""

    FEED_SIZE = 10

    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)    # user -> [(time, tweet_id), ...] oldest first
        self.following = defaultdict(set)  # user -> set of users they follow

    def post_tweet(self, user, tweet_id):
        self.time += 1                     # a global counter orders tweets across users
        self.tweets[user].append((self.time, tweet_id))

    def get_news_feed(self, user):
        heap = []
        # .get() instead of [] so that reading a feed never creates empty entries
        for u in self.following.get(user, set()) | {user}:  # you always see your own tweets
            if self.tweets.get(u):
                i = len(self.tweets[u]) - 1        # start from each user's newest tweet
                t, tid = self.tweets[u][i]
                heap.append((-t, tid, u, i))       # negate time: heapq is a min-heap
        heapq.heapify(heap)                         # O(f) for f followees
        feed = []
        while heap and len(feed) < self.FEED_SIZE:
            _, tid, u, i = heapq.heappop(heap)
            feed.append(tid)
            if i > 0:                               # that user's next-newest tweet
                t, nxt = self.tweets[u][i - 1]
                heapq.heappush(heap, (-t, nxt, u, i - 1))
        return feed

    def follow(self, follower, followee):
        if follower != followee:
            self.following[follower].add(followee)

    def unfollow(self, follower, followee):
        self.following[follower].discard(followee)  # discard: no error if absent


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


tw = Twitter()
tw.post_tweet(1, 5)
print(fmt(tw.get_news_feed(1)))
tw.follow(1, 2)
tw.post_tweet(2, 6)
print(fmt(tw.get_news_feed(1)))
tw.unfollow(1, 2)
print(fmt(tw.get_news_feed(1)))

tw = Twitter()
for i in range(1, 13):
    tw.post_tweet(1 if i % 2 else 2, 100 + i)  # users 1 and 2 alternate, 12 tweets
tw.follow(3, 1)
tw.follow(3, 2)
tw.follow(3, 3)    # following yourself is ignored
tw.unfollow(3, 9)  # unfollowing a stranger is a no-op
print(fmt(tw.get_news_feed(3)))  # [112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
print(fmt(tw.get_news_feed(1)))  # [111, 109, 107, 105, 103, 101]
print(fmt(tw.get_news_feed(42)))  # []`,
          },
          {
            label: `Fan-out on read vs write vs hybrid: work counts on 3000 operations`,
            code: `import heapq

# Simulate 300 users and 3000 operations under three feed designs and count the work.
U, FEED, CELEB_LIMIT = 300, 10, 50
seed = 2024


def rnd():
    global seed
    seed = seed * 48271 % 2147483647  # MINSTD, same numbers in every language
    return seed


following = [set() for _ in range(U)]
for u in range(1, U):
    following[u].add(0)  # everybody follows user 0, the celebrity
    while len(following[u]) < 6:
        v = rnd() % U
        if v != u:
            following[u].add(v)
followers = [[] for _ in range(U)]
for u in range(U):
    for v in following[u]:
        followers[v].append(u)
celeb = [len(followers[u]) > CELEB_LIMIT for u in range(U)]


def merge_newest(sources):
    """k-way merge of newest-first lists of (time, id); returns (feed, heap work)."""
    heap = [(-src[0][0], src[0][1], s, 0) for s, src in enumerate(sources) if src]
    heapq.heapify(heap)
    work, feed = len(heap), []
    while heap and len(feed) < FEED:
        _, tid, s, i = heapq.heappop(heap)
        work += 1
        feed.append(tid)
        if i + 1 < len(sources[s]):
            heapq.heappush(heap, (-sources[s][i + 1][0], sources[s][i + 1][1], s, i + 1))
            work += 1
    return feed, work


tweets = [[] for _ in range(U)]      # per author, newest first (pull and hybrid)
timeline = [[] for _ in range(U)]    # push model: precomputed feed, newest first
hybrid_tl = [[] for _ in range(U)]   # hybrid: fan-out only for non-celebrities
work = {"pull": [0, 0], "push": [0, 0], "hybrid": [0, 0]}  # [write work, read work]
posts = reads = biggest = 0
same = True


def deliver(tl, item):
    tl.insert(0, item)  # newest first; keep only FEED items
    del tl[FEED:]


for t in range(1, 3001):
    if rnd() % 10 < 3:
        a = rnd()
        author = 0 if a % 5 == 0 else a % U
        item = (t, t * 10 + author % 10)  # (time, tweet id)
        posts += 1
        tweets[author].insert(0, item)
        work["pull"][0] += 1
        fan = [author] + followers[author]
        for f in fan:
            deliver(timeline[f], item)
        work["push"][0] += len(fan)
        biggest = max(biggest, len(fan))
        if celeb[author]:
            work["hybrid"][0] += 1
        else:
            for f in fan:
                deliver(hybrid_tl[f], item)
            work["hybrid"][0] += len(fan)
    else:
        user = rnd() % U
        reads += 1
        pull_feed, w = merge_newest([tweets[v] for v in following[user] | {user}])
        work["pull"][1] += w
        push_feed = [tid for _, tid in timeline[user]]
        work["push"][1] += len(push_feed)
        celebs = [tweets[v] for v in following[user] | {user} if celeb[v]]
        hybrid_feed, w = merge_newest([hybrid_tl[user]] + celebs)
        work["hybrid"][1] += w
        same = same and pull_feed == push_feed == hybrid_feed

print("users " + str(U) + ", posts " + str(posts) + ", feed reads " + str(reads) + ", celebrities " + str(sum(celeb)))
print("biggest single fan-out (push): " + str(biggest) + " timeline writes")
for name in ["pull", "push", "hybrid"]:
    w, r = work[name]
    print(name + ": write work " + str(w) + ", read work " + str(r) + ", total " + str(w + r))
print("all three designs return the same feeds: " + str(same).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Design a simplified Twitter in JavaScript with \`postTweet(user, tweetId)\`, \`getNewsFeed(user)\` returning the 10 most recent tweet ids from the user and everyone they follow, newest first, plus \`follow\` and \`unfollow\`. Then tell me how you would change the design if some users had millions of followers."

**What a strong answer should cover:**
- \`Map\` of user → \`Set\` of followees, \`Map\` of user → array of \`[time, tweetId]\`; a global counter as the timestamp.
- The feed as a k-way merge of sorted lists with a max-heap, stopping after 10: O(f + 10 log f).
- Fan-out on read vs fan-out on write, the celebrity problem, and the hybrid approach.
- Edge cases: own tweets included, self-follow ignored, unfollowing a stranger is a no-op, empty feeds.
- JavaScript details: no built-in heap (write one with a comparator); \`Map\` and \`Set\` instead of plain objects; \`Set.prototype.delete\` is safe for missing members.

**Clarifying questions expected:**
- Does the feed include the user's own tweets, and how many tweets?
- How skewed are follower counts, and what is the read/write ratio?

**Code / implementation expected:** Yes — a \`Twitter\` class with \`Map\`, \`Set\` and a small binary heap, in JavaScript.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in JavaScript.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a village where everyone writes short notes, and every morning each person wants to read the 10 newest notes from the friends they follow. There are two ways to deliver them.

**The reader goes collecting.** You walk to each friend's house, look at the newest notes pinned on their door, and pick the 10 newest overall. Posting is free (pin it on your own door), but reading means visiting every friend.

**The writer goes delivering.** Each time someone writes a note, they make a copy and drop it in the mailbox of every follower. Reading is instant: open your own mailbox. But a very popular villager with 10,000 followers spends the whole day making copies.

That is the entire design question. The coding version ("design Twitter" with \`postTweet\`, \`getNewsFeed\`, \`follow\`, \`unfollow\`) is solved with **hash maps** for who follows whom and who posted what, and a **heap** to pick the 10 newest tweets out of many sorted lists. The system-design follow-up is the choice between the two delivery strategies: **fan-out on read** and **fan-out on write**, and the hybrid real systems use for celebrities.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many tweets in a feed, and in what order? | The classic version is the 10 most recent, newest first. A fixed small limit is what makes the heap merge cheap. |
| Does a user see their own tweets? | Usually yes, so the user is added to their own source list. |
| Can a user follow themselves? Unfollow someone they do not follow? | Both should be harmless no-ops; decide now so the code does not throw. |
| How is "most recent" defined: a clock or a counter? | A global counter that increases on every post gives a strict order with no ties. |
| How many users, how many follows per user, how skewed? | Decides pull vs push. A few accounts with millions of followers break pure push. |
| What is the read/write ratio? | Feeds are usually read far more often than tweets are posted, which favours doing work at write time, except for celebrities. |

## 3. The Data Model: Hash Maps and a Clock

We need three pieces of state, and every operation except the feed is an O(1) hash-map operation (see [how a hash table works](/interview-question/how-does-a-hash-table-work)):

- \`following\`: user → **set** of users they follow. A set makes \`follow\` and \`unfollow\` O(1) and ignores duplicates.
- \`tweets\`: user → **list** of \`(time, tweetId)\` in the order posted. Appending keeps each list sorted by time for free.
- \`time\`: one global counter, incremented on every post. It gives every tweet a unique, strictly increasing timestamp, so "newest" never has ties.

📌 **Interview term: Monotonic counter** — a number that only ever increases. Used as a timestamp it gives a total order, unlike wall-clock time, which can repeat or jump backwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Three pieces of state: a hash map from user to the set of users they follow, a hash map from user to their tweets with timestamps, and one global clock">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">following: hash map</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">user 1 maps to set of 2, 7, 9</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">tweets: hash map</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">user 2 maps to (3, 101), (8, 105)</text>
  <rect class="d-box-accent" x="200" y="150" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="176" text-anchor="middle">clock: one global counter</text>
  <text class="d-sub" x="350" y="196" text-anchor="middle">time 1, 2, 3 on every post</text>
</svg>

\`following\` and \`tweets\` are separate maps keyed by user id; the clock is shared by everybody.

## 4. Building the Feed: Merge k Sorted Lists, Stop at 10

Each followed user's tweet list is already sorted by time. The feed is the 10 newest items across f + 1 sorted lists (f followees plus yourself). That is exactly [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), read from the newest end, with an early stop after 10:

1. Put the **newest** tweet of each source into a **max-heap** keyed by time.
2. Pop the top: it is the newest remaining tweet overall. Add its id to the feed.
3. Push the **next-newest** tweet of the same user (if any).
4. Repeat until the feed has 10 tweets or the heap is empty.

📌 **Interview term: Fan-out on read (pull model)** — the feed is computed when it is read, by pulling from every followed user. Posting is O(1); reading costs O(f) to seed the heap plus O(10 log f) to pop.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on read: when user 1 opens the feed, the newest tweet of each followed user goes into a max-heap and the ten newest are popped">
  <defs>
    <marker id="b20q5ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="47" text-anchor="middle">user 2 tweets</text>
  <rect class="d-box" x="20" y="100" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="127" text-anchor="middle">user 7 tweets</text>
  <rect class="d-box" x="20" y="180" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="207" text-anchor="middle">user 1 (self)</text>
  <path class="d-edge" d="M 202 42 L 266 100" marker-end="url(#b20q5ja-a1)"/>
  <path class="d-edge" d="M 202 122 L 266 122" marker-end="url(#b20q5ja-a1)"/>
  <path class="d-edge" d="M 202 202 L 266 146" marker-end="url(#b20q5ja-a1)"/>
  <rect class="d-box-accent" x="272" y="72" width="180" height="100" rx="10"/>
  <text class="d-text" x="362" y="106" text-anchor="middle">max-heap by time</text>
  <text class="d-sub" x="362" y="132" text-anchor="middle">one entry per user</text>
  <text class="d-sub" x="362" y="154" text-anchor="middle">pop up to 10 times</text>
  <path class="d-edge-accent" d="M 454 122 L 514 122" marker-end="url(#b20q5ja-a1)"/>
  <rect class="d-box-muted" x="520" y="92" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="118" text-anchor="middle">feed</text>
  <text class="d-sub" x="600" y="140" text-anchor="middle">10 newest ids</text>
</svg>

Each followed user contributes only their single newest tweet to the heap at first; a user's older tweets enter only when the newer one has been taken. So the heap never holds more than f + 1 entries, and at most 10 + f entries are ever pushed.

Why a heap rather than collecting everything and sorting? If each of 300 followees has 1,000 tweets, sorting all 300,000 to take 10 is absurd. The heap touches at most f + 10 tweets. (Comparing heap merges with pairwise merging in general is covered in [heap vs divide and conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k); with an early stop after 10, the heap is the clear winner.)

📌 **Interview term: Early termination** — stopping an algorithm as soon as the answer is known. A heap merge can stop after 10 pops; a full merge or sort cannot.

## 5. The Code in JavaScript

JavaScript has no heap, so the example includes the same small comparator-driven class used on the median pages. \`new Heap((a, b) => a[0] > b[0])\` is a max-heap on the first array element, the time:

~~~javascript
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}
~~~

~~~javascript
class Twitter {
  constructor() {
    this.time = 0;
    this.tweets = new Map();    // user -> [[time, tweetId], ...] oldest first
    this.following = new Map(); // user -> Set of users they follow
  }
  postTweet(user, tweetId) {
    this.time++; // a global counter orders tweets across users
    if (!this.tweets.has(user)) this.tweets.set(user, []);
    this.tweets.get(user).push([this.time, tweetId]);
  }
  getNewsFeed(user) {
    const heap = new Heap((a, b) => a[0] > b[0]); // max-heap on time: newest first
    const sources = new Set(this.following.get(user) || []);
    sources.add(user); // you always see your own tweets
    for (const u of sources) {
      const list = this.tweets.get(u);
      if (list && list.length > 0) {
        const i = list.length - 1; // start from each user's newest tweet
        heap.push([list[i][0], list[i][1], u, i]);
      }
    }
    const feed = [];
    while (heap.size > 0 && feed.length < 10) {
      const [, tid, u, i] = heap.pop();
      feed.push(tid);
      if (i > 0) { // that user's next-newest tweet
        const [t, next] = this.tweets.get(u)[i - 1];
        heap.push([t, next, u, i - 1]);
      }
    }
    return feed;
  }
  follow(follower, followee) {
    if (follower === followee) return;
    if (!this.following.has(follower)) this.following.set(follower, new Set());
    this.following.get(follower).add(followee);
  }
  unfollow(follower, followee) {
    const s = this.following.get(follower);
    if (s) s.delete(followee); // no error if absent
  }
}
~~~

**What to point out in this code:**

- \`Map\` and \`Set\` are the right tools: keys keep their type (a plain object would turn user ids into strings), and \`.has\`, \`.get\`, \`.add\`, \`.delete\` are O(1) on average.
- \`new Set(this.following.get(user) || [])\` copies the follow set before adding the user, so the stored set is never modified by reading a feed. \`|| []\` handles users with no follows.
- The heap entry is \`[time, tweetId, user, index]\`; destructuring \`const [, tid, u, i] = heap.pop()\` skips the time with an empty slot.
- \`getNewsFeed\` never writes to the maps, so asking for the feed of user 42 creates nothing.
- \`s.delete(followee)\` returns \`false\` for a missing member instead of throwing, which makes \`unfollow\` a safe no-op.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the classic sequence (post, follow, post, unfollow), then 12 alternating tweets, a self-follow, an unfollow of a stranger, and a user who has never done anything** prints:

~~~text
[5]
[6, 5]
[5]
[112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
[111, 109, 107, 105, 103, 101]
[]
~~~

User 3 follows users 1 and 2, so the feed is the 10 newest of all 12 tweets (112 down to 103). User 1 follows nobody and sees only their own 6 tweets. User 42 gets an empty list.

**Example 2 — the same 3,000-operation workload under pull, push and hybrid, counting work and checking that every feed is identical** prints:

~~~text
users 300, posts 953, feed reads 2047, celebrities 1
biggest single fan-out (push): 300 timeline writes
pull: write work 953, read work 49082, total 50035
push: write work 62139, read work 20035, total 82174
hybrid: write work 4731, read work 43879, total 48610
all three designs return the same feeds: true
~~~

## 7. The Real Design Question: Fan-Out on Read vs Write

The coding version computes feeds on read. At scale, the interviewer will ask whether to do the work when tweets are **written** instead.

📌 **Interview term: Fan-out on write (push model)** — when a user posts, copy the tweet id into a stored timeline for every follower. Reading a feed is a lookup; posting costs one write per follower.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on write: when user 2 posts, the tweet is copied into the stored timeline of every follower; reading a feed is then a simple lookup">
  <defs>
    <marker id="b20q5ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="98" width="170" height="54" rx="10"/>
  <text class="d-text" x="105" y="122" text-anchor="middle">user 2 posts</text>
  <text class="d-sub" x="105" y="142" text-anchor="middle">tweet 105</text>
  <path class="d-edge" d="M 192 112 L 300 46" marker-end="url(#b20q5ja-a2)"/>
  <path class="d-edge" d="M 192 125 L 300 125" marker-end="url(#b20q5ja-a2)"/>
  <path class="d-edge" d="M 192 138 L 300 204" marker-end="url(#b20q5ja-a2)"/>
  <rect class="d-box" x="306" y="22" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="49" text-anchor="middle">timeline of user 1</text>
  <rect class="d-box" x="306" y="103" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="130" text-anchor="middle">timeline of user 5</text>
  <rect class="d-box" x="306" y="184" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="211" text-anchor="middle">timeline of user 2</text>
  <rect class="d-box-muted" x="570" y="103" width="110" height="44" rx="8"/>
  <text class="d-text" x="625" y="130" text-anchor="middle">read: O(1)</text>
  <path class="d-edge-dashed" d="M 528 125 L 566 125" marker-end="url(#b20q5ja-a2)"/>
</svg>

Each follower keeps a short stored timeline (here the latest 10 ids), so reading never touches anyone else's data.

The problem with push is the **celebrity**: an account followed by everyone turns one post into millions of writes, and those writes are wasted for followers who never open the app.

📌 **Interview term: Celebrity (hot key) problem** — a few accounts with enormous follower counts dominate the cost of fan-out on write, and any single machine or key that holds them becomes a hotspot.

📌 **Interview term: Hybrid fan-out** — push tweets from normal accounts into their followers' timelines, but do not fan out celebrity tweets; at read time, merge the stored timeline with the few celebrities the reader follows, using the same heap merge.

To put numbers on it, example 2 simulates 300 users. Each follows 5 random users, and everybody also follows user 0, the celebrity (299 followers). Over 3,000 operations about 30% are posts (20% of them by the celebrity) and the rest are feed reads. "Write work" counts timeline insertions; "read work" counts heap entries pushed and popped (or timeline items read, for push). All three designs are checked to return identical feeds on every read.

| Design | Write work | Read work | Total |
| :--- | :--- | :--- | :--- |
| Pull (fan-out on read) | 953 | 49,082 | 50,035 |
| Push (fan-out on write) | 62,139 | 20,035 | 82,174 |
| Hybrid (no fan-out for the celebrity) | 4,731 | 43,879 | 48,610 |

Push made reads cheapest, but paid 62,139 writes, mostly because every one of the celebrity posts was copied 300 times (the biggest single fan-out). The hybrid cut writes by about 13× compared with push, and read work stayed close to pull, because each read merges only one stored timeline plus one celebrity list instead of up to seven tweet lists. In this toy workload pull and hybrid are close; the gap grows with follower counts and with how much more often feeds are read than written. The point to make in an interview is the *shape* of the trade-off, not these exact numbers.

## 8. How the Pieces Fit

Every part of this design is a pattern with its own page. The maps are plain [hash tables](/interview-question/how-does-a-hash-table-work). The feed is [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists) with an early stop. Keeping "the 10 best of many" with a heap is the same idea as [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements). Recognising those three patterns is what lets you write the class in 15 minutes and spend the rest of the interview on fan-out.

## 9. Complexity

With f = number of users someone follows, F = followers of the poster, and a feed size of 10:

| Operation | Pull model | Push model | Why |
| :--- | :--- | :--- | :--- |
| \`postTweet\` | O(1) | O(F) | append to own list vs copy into F timelines |
| \`getNewsFeed\` | O(f + 10 log f) | O(10) | seed a heap with f entries (heapify is O(f)), pop 10 vs read a stored list |
| \`follow\` / \`unfollow\` | O(1) | O(1) plus backfill or cleanup | set insert/remove; push must also add or remove tweets in the stored timeline |
| Space | O(users + follows + tweets) | plus 10 ids per user timeline | timelines are bounded copies |

## 10. Beyond One Machine (Briefly)

- **Cap what you scan.** A feed needs at most 10 tweets per followed user, so only each user's newest 10 tweets are ever touched. Old tweets can live in slower storage.
- **Shard by user id.** \`following\`, \`tweets\` and timelines are all keyed by user, so they split naturally across machines; the heap merge then pulls from several shards.
- **Cache feeds.** A freshly computed pull feed can be cached for a short time, like an [LRU cache](/interview-question/how-do-you-design-an-lru-cache); a push timeline already is a cache.
- **Unfollow in the push model** means removing that user's tweets from the stored timeline (or filtering at read time), which is why the coding version usually uses pull.

## 11. Edge Cases

- **A user with no tweets and no follows** (user 42 in example 1): the feed is empty, and reading it must not create empty entries in the maps.
- **Fewer than 10 tweets in total:** the heap empties before 10 pops; return what you have (user 1 sees 6 tweets in example 1).
- **Following yourself:** ignored by \`follow\`; your own tweets are always included anyway.
- **Unfollowing someone you do not follow:** a no-op, never an error.
- **Unfollow, then read:** the unfollowed user disappears from the feed immediately, because the pull model reads \`following\` at feed time (\`[6, 5]\` becomes \`[5]\` in example 1).
- **Two tweets posted "at the same time":** impossible with a global counter; with wall-clock timestamps you would need a tie-breaker such as the tweet id.

## Common Pitfalls

- **Plain objects as maps.** \`following[1]\` and \`following['1']\` are the same key, and objects inherit keys like \`constructor\`; use \`Map\`.
- **Mutating the stored follow set.** \`this.following.get(user).add(user)\` inside the feed makes the user follow themselves forever; copy first.
- **Sorting every tweet of every followee.** \`allTweets.sort((a, b) => b[0] - a[0]).slice(0, 10)\` is O(T log T); the heap touches at most f + 10 tweets.
- **Forgetting the comparator direction.** \`(a, b) => a[0] < b[0]\` gives the oldest tweets first.
- **Using \`Date.now()\` as the timestamp.** Two posts in the same millisecond get the same time and an undefined relative order; use a counter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> user to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of followees, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> user to array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[time, tweetId]</code>, and one global counter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Feed:</strong> <span style="color:#f0e2c8;">A k-way merge from the newest end: a max-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[time, id, user, index]</code>, pop up to 10, push that user's next-newest tweet.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Post, follow, unfollow are O(1). The feed is O(f log f) to seed my simple heap (O(f) with heapify) plus O(10 log f) to pop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">No built-in heap, so a small comparator-driven class; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> instead of objects; copy the follow set before adding yourself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. At scale:</strong> <span style="color:#f0e2c8;">Pull is cheap to write, push is cheap to read; celebrities break push, so the hybrid fans out normal users and merges celebrities at read time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a heap and not sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">We need only 10 items from f sorted lists. The heap touches at most f + 10 tweets; sorting would touch every tweet of every followee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a counter instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Date.now()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now()</code> has millisecond resolution, so two posts can share a timestamp. The counter is unique and strictly increasing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add delete-tweet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of deleted ids and skip them while popping. That is lazy deletion, the same trick as in the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for fan-out on write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each user gets a stored timeline array capped at 10; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">postTweet</code> unshifts the id into every follower's timeline. Follow and unfollow then need to backfill or clean it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the hybrid draw the line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a follower-count threshold. Below it, push; above it, pull at read time and merge with the stored timeline. In the simulation that cut writes from 62,139 to 4,731.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic counter** | A number that only increases; a tie-free timestamp |
| **Fan-out on read (pull model)** | Build the feed when it is read by merging the followees' tweets |
| **Early termination** | Stop as soon as the answer is known, here after 10 pops |
| **Fan-out on write (push model)** | Copy each new tweet into every follower's stored timeline |
| **Celebrity (hot key) problem** | A few huge accounts dominate fan-out cost and create hotspots |
| **Hybrid fan-out** | Push for normal accounts, pull for celebrities, merge at read time |
| **Comparator function** | The function that orders heap entries; a > b on time gives newest first |

---
**Conclusion:** Design Twitter is two hash maps, a clock and a heap. Follows and posts are O(1) \`Map\` and \`Set\` operations; the feed is a k-way merge of each followed user's sorted tweets, run from the newest end with a max-heap and stopped after 10. In JavaScript you bring your own heap, so keep it small and comparator-driven, and never let a read path mutate the stored follow sets. Then lift it to system design: pull is cheap to write, push is cheap to read, and the hybrid that skips fan-out for celebrities gets most of both.`,
        examples: [
          {
            label: `Twitter class: post, follow, unfollow and the 10-tweet feed`,
            code: `class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

// Fan-out on read: each user keeps their own tweets; the feed is a k-way merge with a heap.
class Twitter {
  constructor() {
    this.time = 0;
    this.tweets = new Map();    // user -> [[time, tweetId], ...] oldest first
    this.following = new Map(); // user -> Set of users they follow
  }
  postTweet(user, tweetId) {
    this.time++; // a global counter orders tweets across users
    if (!this.tweets.has(user)) this.tweets.set(user, []);
    this.tweets.get(user).push([this.time, tweetId]);
  }
  getNewsFeed(user) {
    const heap = new Heap((a, b) => a[0] > b[0]); // max-heap on time: newest first
    const sources = new Set(this.following.get(user) || []);
    sources.add(user); // you always see your own tweets
    for (const u of sources) {
      const list = this.tweets.get(u);
      if (list && list.length > 0) {
        const i = list.length - 1; // start from each user's newest tweet
        heap.push([list[i][0], list[i][1], u, i]);
      }
    }
    const feed = [];
    while (heap.size > 0 && feed.length < 10) {
      const [, tid, u, i] = heap.pop();
      feed.push(tid);
      if (i > 0) { // that user's next-newest tweet
        const [t, next] = this.tweets.get(u)[i - 1];
        heap.push([t, next, u, i - 1]);
      }
    }
    return feed;
  }
  follow(follower, followee) {
    if (follower === followee) return;
    if (!this.following.has(follower)) this.following.set(follower, new Set());
    this.following.get(follower).add(followee);
  }
  unfollow(follower, followee) {
    const s = this.following.get(follower);
    if (s) s.delete(followee); // no error if absent
  }
}

const fmt = (xs) => '[' + xs.join(', ') + ']';

let tw = new Twitter();
tw.postTweet(1, 5);
console.log(fmt(tw.getNewsFeed(1))); // [5]
tw.follow(1, 2);
tw.postTweet(2, 6);
console.log(fmt(tw.getNewsFeed(1))); // [6, 5]
tw.unfollow(1, 2);
console.log(fmt(tw.getNewsFeed(1))); // [5]

tw = new Twitter();
for (let i = 1; i <= 12; i++) tw.postTweet(i % 2 ? 1 : 2, 100 + i); // users 1 and 2 alternate
tw.follow(3, 1);
tw.follow(3, 2);
tw.follow(3, 3);   // following yourself is ignored
tw.unfollow(3, 9); // unfollowing a stranger is a no-op
console.log(fmt(tw.getNewsFeed(3))); // [112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
console.log(fmt(tw.getNewsFeed(1))); // [111, 109, 107, 105, 103, 101]
console.log(fmt(tw.getNewsFeed(42))); // []`,
          },
          {
            label: `Fan-out on read vs write vs hybrid: work counts on 3000 operations`,
            code: `// Simulate 300 users and 3000 operations under three feed designs and count the work.
class Heap {
  constructor(before) { this.a = []; this.before = before; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(a[c], a[p])) break;
      [a[c], a[p]] = [a[p], a[c]];
      c = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      while (true) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

const U = 300, FEED = 10, CELEB_LIMIT = 50;
let seed = 2024;
const rnd = () => (seed = (seed * 48271) % 2147483647); // MINSTD, same numbers in every language

const following = Array.from({ length: U }, () => new Set());
for (let u = 1; u < U; u++) {
  following[u].add(0); // everybody follows user 0, the celebrity
  while (following[u].size < 6) {
    const v = rnd() % U;
    if (v !== u) following[u].add(v);
  }
}
const followers = Array.from({ length: U }, () => []);
for (let u = 0; u < U; u++) for (const v of following[u]) followers[v].push(u);
const celeb = followers.map((f) => f.length > CELEB_LIMIT);

// k-way merge of newest-first lists of [time, id]; returns [feed, heap work]
function mergeNewest(sources) {
  const heap = new Heap((a, b) => a[0] > b[0]);
  sources.forEach((src, s) => { if (src.length > 0) heap.push([src[0][0], src[0][1], s, 0]); });
  let work = heap.size;
  const feed = [];
  while (heap.size > 0 && feed.length < FEED) {
    const [, tid, s, i] = heap.pop();
    work++;
    feed.push(tid);
    if (i + 1 < sources[s].length) {
      heap.push([sources[s][i + 1][0], sources[s][i + 1][1], s, i + 1]);
      work++;
    }
  }
  return [feed, work];
}

const tweets = Array.from({ length: U }, () => []);    // per author, newest first
const timeline = Array.from({ length: U }, () => []);  // push model: precomputed feed
const hybridTl = Array.from({ length: U }, () => []);  // hybrid: fan-out only for non-celebrities
const work = { pull: [0, 0], push: [0, 0], hybrid: [0, 0] }; // [write work, read work]
let posts = 0, reads = 0, biggest = 0, same = true;

function deliver(tl, item) { // newest first; keep only FEED items
  tl.unshift(item);
  if (tl.length > FEED) tl.length = FEED;
}
const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

for (let t = 1; t <= 3000; t++) {
  if (rnd() % 10 < 3) {
    const a = rnd();
    const author = a % 5 === 0 ? 0 : a % U;
    const item = [t, t * 10 + (author % 10)]; // [time, tweet id]
    posts++;
    tweets[author].unshift(item);
    work.pull[0] += 1;
    const fan = [author, ...followers[author]];
    for (const f of fan) deliver(timeline[f], item);
    work.push[0] += fan.length;
    biggest = Math.max(biggest, fan.length);
    if (celeb[author]) work.hybrid[0] += 1;
    else {
      for (const f of fan) deliver(hybridTl[f], item);
      work.hybrid[0] += fan.length;
    }
  } else {
    const user = rnd() % U;
    reads++;
    const mine = new Set(following[user]).add(user);
    const [pullFeed, w1] = mergeNewest([...mine].map((v) => tweets[v]));
    work.pull[1] += w1;
    const pushFeed = timeline[user].map((it) => it[1]);
    work.push[1] += pushFeed.length;
    const celebs = [...mine].filter((v) => celeb[v]).map((v) => tweets[v]);
    const [hybridFeed, w2] = mergeNewest([hybridTl[user], ...celebs]);
    work.hybrid[1] += w2;
    same = same && sameArr(pullFeed, pushFeed) && sameArr(pushFeed, hybridFeed);
  }
}

console.log('users ' + U + ', posts ' + posts + ', feed reads ' + reads + ', celebrities ' + celeb.filter(Boolean).length);
console.log('biggest single fan-out (push): ' + biggest + ' timeline writes');
for (const name of ['pull', 'push', 'hybrid']) {
  const [w, r] = work[name];
  console.log(name + ': write work ' + w + ', read work ' + r + ', total ' + (w + r));
}
console.log('all three designs return the same feeds: ' + same);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Design a simplified Twitter in Java with \`postTweet(int userId, int tweetId)\`, \`List<Integer> getNewsFeed(int userId)\` returning the 10 most recent tweet ids from the user and everyone they follow, newest first, plus \`follow\` and \`unfollow\`. Then tell me how you would change the design if some users had millions of followers."

**What a strong answer should cover:**
- \`HashMap\` of user → \`HashSet\` of followees, \`HashMap\` of user → list of \`{time, tweetId}\`; a global counter as the timestamp.
- The feed as a k-way merge of sorted lists with a \`PriorityQueue\` ordered newest first, stopping after 10: O(f + 10 log f).
- Fan-out on read vs fan-out on write, the celebrity problem, and the hybrid approach.
- Edge cases: own tweets included, self-follow ignored, unfollowing a stranger is a no-op, empty feeds.
- Java details: \`computeIfAbsent\` and \`getOrDefault\`; comparator with \`Integer.compare(b[0], a[0])\`, not subtraction; \`List.remove(int)\` removes by index, so followees belong in a \`Set\`.

**Clarifying questions expected:**
- Does the feed include the user's own tweets, and how many tweets?
- How skewed are follower counts, and what is the read/write ratio?

**Code / implementation expected:** Yes — a \`Twitter\` class with \`HashMap\`, \`HashSet\` and \`PriorityQueue\`, in Java.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in Java.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a village where everyone writes short notes, and every morning each person wants to read the 10 newest notes from the friends they follow. There are two ways to deliver them.

**The reader goes collecting.** You walk to each friend's house, look at the newest notes pinned on their door, and pick the 10 newest overall. Posting is free (pin it on your own door), but reading means visiting every friend.

**The writer goes delivering.** Each time someone writes a note, they make a copy and drop it in the mailbox of every follower. Reading is instant: open your own mailbox. But a very popular villager with 10,000 followers spends the whole day making copies.

That is the entire design question. The coding version ("design Twitter" with \`postTweet\`, \`getNewsFeed\`, \`follow\`, \`unfollow\`) is solved with **hash maps** for who follows whom and who posted what, and a **heap** to pick the 10 newest tweets out of many sorted lists. The system-design follow-up is the choice between the two delivery strategies: **fan-out on read** and **fan-out on write**, and the hybrid real systems use for celebrities.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many tweets in a feed, and in what order? | The classic version is the 10 most recent, newest first. A fixed small limit is what makes the heap merge cheap. |
| Does a user see their own tweets? | Usually yes, so the user is added to their own source list. |
| Can a user follow themselves? Unfollow someone they do not follow? | Both should be harmless no-ops; decide now so the code does not throw. |
| How is "most recent" defined: a clock or a counter? | A global counter that increases on every post gives a strict order with no ties. |
| How many users, how many follows per user, how skewed? | Decides pull vs push. A few accounts with millions of followers break pure push. |
| What is the read/write ratio? | Feeds are usually read far more often than tweets are posted, which favours doing work at write time, except for celebrities. |

## 3. The Data Model: Hash Maps and a Clock

We need three pieces of state, and every operation except the feed is an O(1) hash-map operation (see [how a hash table works](/interview-question/how-does-a-hash-table-work)):

- \`following\`: user → **set** of users they follow. A set makes \`follow\` and \`unfollow\` O(1) and ignores duplicates.
- \`tweets\`: user → **list** of \`(time, tweetId)\` in the order posted. Appending keeps each list sorted by time for free.
- \`time\`: one global counter, incremented on every post. It gives every tweet a unique, strictly increasing timestamp, so "newest" never has ties.

📌 **Interview term: Monotonic counter** — a number that only ever increases. Used as a timestamp it gives a total order, unlike wall-clock time, which can repeat or jump backwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Three pieces of state: a hash map from user to the set of users they follow, a hash map from user to their tweets with timestamps, and one global clock">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">following: hash map</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">user 1 maps to set of 2, 7, 9</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">tweets: hash map</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">user 2 maps to (3, 101), (8, 105)</text>
  <rect class="d-box-accent" x="200" y="150" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="176" text-anchor="middle">clock: one global counter</text>
  <text class="d-sub" x="350" y="196" text-anchor="middle">time 1, 2, 3 on every post</text>
</svg>

\`following\` and \`tweets\` are separate maps keyed by user id; the clock is shared by everybody.

## 4. Building the Feed: Merge k Sorted Lists, Stop at 10

Each followed user's tweet list is already sorted by time. The feed is the 10 newest items across f + 1 sorted lists (f followees plus yourself). That is exactly [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), read from the newest end, with an early stop after 10:

1. Put the **newest** tweet of each source into a **max-heap** keyed by time.
2. Pop the top: it is the newest remaining tweet overall. Add its id to the feed.
3. Push the **next-newest** tweet of the same user (if any).
4. Repeat until the feed has 10 tweets or the heap is empty.

📌 **Interview term: Fan-out on read (pull model)** — the feed is computed when it is read, by pulling from every followed user. Posting is O(1); reading costs O(f) to seed the heap plus O(10 log f) to pop.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on read: when user 1 opens the feed, the newest tweet of each followed user goes into a max-heap and the ten newest are popped">
  <defs>
    <marker id="b20q5ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="47" text-anchor="middle">user 2 tweets</text>
  <rect class="d-box" x="20" y="100" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="127" text-anchor="middle">user 7 tweets</text>
  <rect class="d-box" x="20" y="180" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="207" text-anchor="middle">user 1 (self)</text>
  <path class="d-edge" d="M 202 42 L 266 100" marker-end="url(#b20q5ja-a1)"/>
  <path class="d-edge" d="M 202 122 L 266 122" marker-end="url(#b20q5ja-a1)"/>
  <path class="d-edge" d="M 202 202 L 266 146" marker-end="url(#b20q5ja-a1)"/>
  <rect class="d-box-accent" x="272" y="72" width="180" height="100" rx="10"/>
  <text class="d-text" x="362" y="106" text-anchor="middle">max-heap by time</text>
  <text class="d-sub" x="362" y="132" text-anchor="middle">one entry per user</text>
  <text class="d-sub" x="362" y="154" text-anchor="middle">pop up to 10 times</text>
  <path class="d-edge-accent" d="M 454 122 L 514 122" marker-end="url(#b20q5ja-a1)"/>
  <rect class="d-box-muted" x="520" y="92" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="118" text-anchor="middle">feed</text>
  <text class="d-sub" x="600" y="140" text-anchor="middle">10 newest ids</text>
</svg>

Each followed user contributes only their single newest tweet to the heap at first; a user's older tweets enter only when the newer one has been taken. So the heap never holds more than f + 1 entries, and at most 10 + f entries are ever pushed.

Why a heap rather than collecting everything and sorting? If each of 300 followees has 1,000 tweets, sorting all 300,000 to take 10 is absurd. The heap touches at most f + 10 tweets. (Comparing heap merges with pairwise merging in general is covered in [heap vs divide and conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k); with an early stop after 10, the heap is the clear winner.)

📌 **Interview term: Early termination** — stopping an algorithm as soon as the answer is known. A heap merge can stop after 10 pops; a full merge or sort cannot.

## 5. The Code in Java

~~~java
static class Twitter {
    static final int FEED_SIZE = 10;
    private int time = 0;
    private final Map<Integer, List<int[]>> tweets = new HashMap<>();     // user -> {time, id}, oldest first
    private final Map<Integer, Set<Integer>> following = new HashMap<>(); // user -> followees

    void postTweet(int user, int tweetId) {
        time++; // a global counter orders tweets across users
        tweets.computeIfAbsent(user, u -> new ArrayList<>()).add(new int[]{time, tweetId});
    }

    List<Integer> getNewsFeed(int user) {
        // entries {time, tweetId, user, index}; newest time first
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0]));
        Set<Integer> sources = new HashSet<>(following.getOrDefault(user, Set.of()));
        sources.add(user); // you always see your own tweets
        for (int u : sources) {
            List<int[]> list = tweets.get(u);
            if (list != null && !list.isEmpty()) {
                int i = list.size() - 1; // start from each user's newest tweet
                heap.offer(new int[]{list.get(i)[0], list.get(i)[1], u, i});
            }
        }
        List<Integer> feed = new ArrayList<>();
        while (!heap.isEmpty() && feed.size() < FEED_SIZE) {
            int[] top = heap.poll();
            feed.add(top[1]);
            int u = top[2], i = top[3];
            if (i > 0) { // that user's next-newest tweet
                int[] next = tweets.get(u).get(i - 1);
                heap.offer(new int[]{next[0], next[1], u, i - 1});
            }
        }
        return feed;
    }

    void follow(int follower, int followee) {
        if (follower != followee) following.computeIfAbsent(follower, u -> new HashSet<>()).add(followee);
    }

    void unfollow(int follower, int followee) {
        Set<Integer> s = following.get(follower);
        if (s != null) s.remove(followee); // Set.remove(Object): no error if absent
    }
}
~~~

**What to point out in this code:**

- \`tweets.computeIfAbsent(user, u -> new ArrayList<>())\` creates the list on first use; on read paths the code uses \`get\` and \`getOrDefault\`, which never insert.
- \`new HashSet<>(following.getOrDefault(user, Set.of()))\` copies the follow set before adding the user. \`Set.of()\` is an immutable empty set, fine as a default because it is only read.
- The comparator \`(a, b) -> Integer.compare(b[0], a[0])\` puts the newest time first. \`b[0] - a[0]\` would work for small counters but overflows for arbitrary ints, so it is a bad habit.
- \`System.out.println(tw.getNewsFeed(1))\` prints \`[6, 5]\` because \`ArrayList.toString\` formats as \`[a, b]\`.
- \`s.remove(followee)\` on a \`Set<Integer>\` removes by value. If followees were stored in a \`List<Integer>\`, \`list.remove(followee)\` with an \`int\` argument would call \`remove(int index)\` and delete the wrong element.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK (javac + java)). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the classic sequence (post, follow, post, unfollow), then 12 alternating tweets, a self-follow, an unfollow of a stranger, and a user who has never done anything** prints:

~~~text
[5]
[6, 5]
[5]
[112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
[111, 109, 107, 105, 103, 101]
[]
~~~

User 3 follows users 1 and 2, so the feed is the 10 newest of all 12 tweets (112 down to 103). User 1 follows nobody and sees only their own 6 tweets. User 42 gets an empty list.

**Example 2 — the same 3,000-operation workload under pull, push and hybrid, counting work and checking that every feed is identical** prints:

~~~text
users 300, posts 953, feed reads 2047, celebrities 1
biggest single fan-out (push): 300 timeline writes
pull: write work 953, read work 49082, total 50035
push: write work 62139, read work 20035, total 82174
hybrid: write work 4731, read work 43879, total 48610
all three designs return the same feeds: true
~~~

## 7. The Real Design Question: Fan-Out on Read vs Write

The coding version computes feeds on read. At scale, the interviewer will ask whether to do the work when tweets are **written** instead.

📌 **Interview term: Fan-out on write (push model)** — when a user posts, copy the tweet id into a stored timeline for every follower. Reading a feed is a lookup; posting costs one write per follower.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on write: when user 2 posts, the tweet is copied into the stored timeline of every follower; reading a feed is then a simple lookup">
  <defs>
    <marker id="b20q5ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="98" width="170" height="54" rx="10"/>
  <text class="d-text" x="105" y="122" text-anchor="middle">user 2 posts</text>
  <text class="d-sub" x="105" y="142" text-anchor="middle">tweet 105</text>
  <path class="d-edge" d="M 192 112 L 300 46" marker-end="url(#b20q5ja-a2)"/>
  <path class="d-edge" d="M 192 125 L 300 125" marker-end="url(#b20q5ja-a2)"/>
  <path class="d-edge" d="M 192 138 L 300 204" marker-end="url(#b20q5ja-a2)"/>
  <rect class="d-box" x="306" y="22" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="49" text-anchor="middle">timeline of user 1</text>
  <rect class="d-box" x="306" y="103" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="130" text-anchor="middle">timeline of user 5</text>
  <rect class="d-box" x="306" y="184" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="211" text-anchor="middle">timeline of user 2</text>
  <rect class="d-box-muted" x="570" y="103" width="110" height="44" rx="8"/>
  <text class="d-text" x="625" y="130" text-anchor="middle">read: O(1)</text>
  <path class="d-edge-dashed" d="M 528 125 L 566 125" marker-end="url(#b20q5ja-a2)"/>
</svg>

Each follower keeps a short stored timeline (here the latest 10 ids), so reading never touches anyone else's data.

The problem with push is the **celebrity**: an account followed by everyone turns one post into millions of writes, and those writes are wasted for followers who never open the app.

📌 **Interview term: Celebrity (hot key) problem** — a few accounts with enormous follower counts dominate the cost of fan-out on write, and any single machine or key that holds them becomes a hotspot.

📌 **Interview term: Hybrid fan-out** — push tweets from normal accounts into their followers' timelines, but do not fan out celebrity tweets; at read time, merge the stored timeline with the few celebrities the reader follows, using the same heap merge.

To put numbers on it, example 2 simulates 300 users. Each follows 5 random users, and everybody also follows user 0, the celebrity (299 followers). Over 3,000 operations about 30% are posts (20% of them by the celebrity) and the rest are feed reads. "Write work" counts timeline insertions; "read work" counts heap entries pushed and popped (or timeline items read, for push). All three designs are checked to return identical feeds on every read.

| Design | Write work | Read work | Total |
| :--- | :--- | :--- | :--- |
| Pull (fan-out on read) | 953 | 49,082 | 50,035 |
| Push (fan-out on write) | 62,139 | 20,035 | 82,174 |
| Hybrid (no fan-out for the celebrity) | 4,731 | 43,879 | 48,610 |

Push made reads cheapest, but paid 62,139 writes, mostly because every one of the celebrity posts was copied 300 times (the biggest single fan-out). The hybrid cut writes by about 13× compared with push, and read work stayed close to pull, because each read merges only one stored timeline plus one celebrity list instead of up to seven tweet lists. In this toy workload pull and hybrid are close; the gap grows with follower counts and with how much more often feeds are read than written. The point to make in an interview is the *shape* of the trade-off, not these exact numbers.

## 8. How the Pieces Fit

Every part of this design is a pattern with its own page. The maps are plain [hash tables](/interview-question/how-does-a-hash-table-work). The feed is [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists) with an early stop. Keeping "the 10 best of many" with a heap is the same idea as [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements). Recognising those three patterns is what lets you write the class in 15 minutes and spend the rest of the interview on fan-out.

## 9. Complexity

With f = number of users someone follows, F = followers of the poster, and a feed size of 10:

| Operation | Pull model | Push model | Why |
| :--- | :--- | :--- | :--- |
| \`postTweet\` | O(1) | O(F) | append to own list vs copy into F timelines |
| \`getNewsFeed\` | O(f + 10 log f) | O(10) | seed a heap with f entries (heapify is O(f)), pop 10 vs read a stored list |
| \`follow\` / \`unfollow\` | O(1) | O(1) plus backfill or cleanup | set insert/remove; push must also add or remove tweets in the stored timeline |
| Space | O(users + follows + tweets) | plus 10 ids per user timeline | timelines are bounded copies |

## 10. Beyond One Machine (Briefly)

- **Cap what you scan.** A feed needs at most 10 tweets per followed user, so only each user's newest 10 tweets are ever touched. Old tweets can live in slower storage.
- **Shard by user id.** \`following\`, \`tweets\` and timelines are all keyed by user, so they split naturally across machines; the heap merge then pulls from several shards.
- **Cache feeds.** A freshly computed pull feed can be cached for a short time, like an [LRU cache](/interview-question/how-do-you-design-an-lru-cache); a push timeline already is a cache.
- **Unfollow in the push model** means removing that user's tweets from the stored timeline (or filtering at read time), which is why the coding version usually uses pull.

## 11. Edge Cases

- **A user with no tweets and no follows** (user 42 in example 1): the feed is empty, and reading it must not create empty entries in the maps.
- **Fewer than 10 tweets in total:** the heap empties before 10 pops; return what you have (user 1 sees 6 tweets in example 1).
- **Following yourself:** ignored by \`follow\`; your own tweets are always included anyway.
- **Unfollowing someone you do not follow:** a no-op, never an error.
- **Unfollow, then read:** the unfollowed user disappears from the feed immediately, because the pull model reads \`following\` at feed time (\`[6, 5]\` becomes \`[5]\` in example 1).
- **Two tweets posted "at the same time":** impossible with a global counter; with wall-clock timestamps you would need a tie-breaker such as the tweet id.

## Common Pitfalls

- **Followees in a \`List<Integer>\`.** \`list.remove(2)\` removes the element at index 2, not user 2, and \`contains\` is O(n). Use a \`HashSet\`.
- **Comparator by subtraction.** \`(a, b) -> b[0] - a[0]\` overflows for large values; use \`Integer.compare(b[0], a[0])\`.
- **Mutating the stored follow set.** Adding the user to \`following.get(user)\` inside the feed makes them follow themselves forever; copy first.
- **\`NullPointerException\` for unknown users.** \`following.get(user).add(...)\` or \`tweets.get(u).size()\` fails for users never seen; use \`computeIfAbsent\` for writes and null checks or \`getOrDefault\` for reads.
- **Sorting every tweet of every followee.** O(T log T); the \`PriorityQueue\` touches at most f + 10 entries.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> user to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> of followees, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> user to list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{time, tweetId}</code>, and one global counter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Feed:</strong> <span style="color:#f0e2c8;">A k-way merge from the newest end: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> ordered by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(b[0], a[0])</code>, poll up to 10, offer that user's next-newest tweet.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Post, follow, unfollow are O(1). The feed is O(f log f) to offer the seeds plus O(10 log f) to poll.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeIfAbsent</code> for writes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault</code> for reads, followees in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.remove(int)</code> removes by index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. At scale:</strong> <span style="color:#f0e2c8;">Pull is cheap to write, push is cheap to read; celebrities break push, so the hybrid fans out normal users and merges celebrities at read time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a heap and not sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">We need only 10 items from f sorted lists. The heap touches at most f + 10 tweets; sorting would touch every tweet of every followee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> are not synchronized. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConcurrentHashMap</code> with concurrent sets, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AtomicInteger</code> for the clock, and build the heap locally per feed request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add delete-tweet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set&lt;Integer&gt;</code> of deleted ids and skip them while polling. That is lazy deletion, the same trick as in the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for fan-out on write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each user gets a stored timeline (an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> capped at 10); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">postTweet</code> adds the id to every follower's timeline. Follow and unfollow then need to backfill or clean it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the hybrid draw the line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a follower-count threshold. Below it, push; above it, pull at read time and merge with the stored timeline. In the simulation that cut writes from 62,139 to 4,731.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic counter** | A number that only increases; a tie-free timestamp |
| **Fan-out on read (pull model)** | Build the feed when it is read by merging the followees' tweets |
| **Early termination** | Stop as soon as the answer is known, here after 10 pops |
| **Fan-out on write (push model)** | Copy each new tweet into every follower's stored timeline |
| **Celebrity (hot key) problem** | A few huge accounts dominate fan-out cost and create hotspots |
| **Hybrid fan-out** | Push for normal accounts, pull for celebrities, merge at read time |
| **Autoboxing** | Java wrapping int in Integer; it is why list.remove(int) and remove(Object) differ |

---
**Conclusion:** Design Twitter is two hash maps, a clock and a heap. Follows and posts are O(1) \`HashMap\` and \`HashSet\` operations; the feed is a k-way merge of each followed user's sorted tweets, run from the newest end with a \`PriorityQueue\` and stopped after 10. In Java, keep followees in a \`Set\` (because \`List.remove(int)\` removes by index), build comparators with \`Integer.compare\`, and never let a read path mutate stored state. Then lift it to system design: pull is cheap to write, push is cheap to read, and the hybrid that skips fan-out for celebrities gets most of both.`,
        examples: [
          {
            label: `Twitter class: post, follow, unfollow and the 10-tweet feed`,
            code: `import java.util.*;

public class Main {
    // Fan-out on read: each user keeps their own tweets; the feed is a k-way merge with a heap.
    static class Twitter {
        static final int FEED_SIZE = 10;
        private int time = 0;
        private final Map<Integer, List<int[]>> tweets = new HashMap<>();     // user -> {time, id}, oldest first
        private final Map<Integer, Set<Integer>> following = new HashMap<>(); // user -> followees

        void postTweet(int user, int tweetId) {
            time++; // a global counter orders tweets across users
            tweets.computeIfAbsent(user, u -> new ArrayList<>()).add(new int[]{time, tweetId});
        }

        List<Integer> getNewsFeed(int user) {
            // entries {time, tweetId, user, index}; newest time first
            PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0]));
            Set<Integer> sources = new HashSet<>(following.getOrDefault(user, Set.of()));
            sources.add(user); // you always see your own tweets
            for (int u : sources) {
                List<int[]> list = tweets.get(u);
                if (list != null && !list.isEmpty()) {
                    int i = list.size() - 1; // start from each user's newest tweet
                    heap.offer(new int[]{list.get(i)[0], list.get(i)[1], u, i});
                }
            }
            List<Integer> feed = new ArrayList<>();
            while (!heap.isEmpty() && feed.size() < FEED_SIZE) {
                int[] top = heap.poll();
                feed.add(top[1]);
                int u = top[2], i = top[3];
                if (i > 0) { // that user's next-newest tweet
                    int[] next = tweets.get(u).get(i - 1);
                    heap.offer(new int[]{next[0], next[1], u, i - 1});
                }
            }
            return feed;
        }

        void follow(int follower, int followee) {
            if (follower != followee) following.computeIfAbsent(follower, u -> new HashSet<>()).add(followee);
        }

        void unfollow(int follower, int followee) {
            Set<Integer> s = following.get(follower);
            if (s != null) s.remove(followee); // Set.remove(Object): no error if absent
        }
    }

    public static void main(String[] args) {
        Twitter tw = new Twitter();
        tw.postTweet(1, 5);
        System.out.println(tw.getNewsFeed(1)); // [5]
        tw.follow(1, 2);
        tw.postTweet(2, 6);
        System.out.println(tw.getNewsFeed(1)); // [6, 5]
        tw.unfollow(1, 2);
        System.out.println(tw.getNewsFeed(1)); // [5]

        tw = new Twitter();
        for (int i = 1; i <= 12; i++) tw.postTweet(i % 2 == 1 ? 1 : 2, 100 + i); // users 1 and 2 alternate
        tw.follow(3, 1);
        tw.follow(3, 2);
        tw.follow(3, 3);   // following yourself is ignored
        tw.unfollow(3, 9); // unfollowing a stranger is a no-op
        System.out.println(tw.getNewsFeed(3)); // [112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
        System.out.println(tw.getNewsFeed(1)); // [111, 109, 107, 105, 103, 101]
        System.out.println(tw.getNewsFeed(42)); // []
    }
}`,
          },
          {
            label: `Fan-out on read vs write vs hybrid: work counts on 3000 operations`,
            code: `import java.util.*;

public class Main {
    // Simulate 300 users and 3000 operations under three feed designs and count the work.
    static final int U = 300, FEED = 10, CELEB_LIMIT = 50;
    static long seed = 2024;

    static int rnd() { // MINSTD, same numbers in every language; long because the product overflows int
        seed = seed * 48271 % 2147483647;
        return (int) seed;
    }

    static int heapWork; // set by mergeNewest

    // k-way merge of newest-first lists of {time, id}
    static List<Integer> mergeNewest(List<List<int[]>> sources) {
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0])); // newest first
        for (int s = 0; s < sources.size(); s++)
            if (!sources.get(s).isEmpty()) heap.offer(new int[]{sources.get(s).get(0)[0], sources.get(s).get(0)[1], s, 0});
        heapWork = heap.size();
        List<Integer> feed = new ArrayList<>();
        while (!heap.isEmpty() && feed.size() < FEED) {
            int[] top = heap.poll();
            heapWork++;
            feed.add(top[1]);
            int s = top[2], i = top[3];
            if (i + 1 < sources.get(s).size()) {
                int[] next = sources.get(s).get(i + 1);
                heap.offer(new int[]{next[0], next[1], s, i + 1});
                heapWork++;
            }
        }
        return feed;
    }

    static void deliver(LinkedList<int[]> tl, int[] item) { // newest first; keep only FEED items
        tl.addFirst(item);
        if (tl.size() > FEED) tl.removeLast();
    }

    public static void main(String[] args) {
        List<Set<Integer>> following = new ArrayList<>();
        for (int u = 0; u < U; u++) following.add(new HashSet<>());
        for (int u = 1; u < U; u++) {
            following.get(u).add(0); // everybody follows user 0, the celebrity
            while (following.get(u).size() < 6) {
                int v = rnd() % U;
                if (v != u) following.get(u).add(v);
            }
        }
        List<List<Integer>> followers = new ArrayList<>();
        for (int u = 0; u < U; u++) followers.add(new ArrayList<>());
        for (int u = 0; u < U; u++) for (int v : following.get(u)) followers.get(v).add(u);
        boolean[] celeb = new boolean[U];
        int celebs = 0;
        for (int u = 0; u < U; u++) if (celeb[u] = followers.get(u).size() > CELEB_LIMIT) celebs++;

        List<LinkedList<int[]>> tweets = new ArrayList<>(), timeline = new ArrayList<>(), hybridTl = new ArrayList<>();
        for (int u = 0; u < U; u++) { tweets.add(new LinkedList<>()); timeline.add(new LinkedList<>()); hybridTl.add(new LinkedList<>()); }
        long[][] work = new long[3][2]; // pull, push, hybrid x [write, read]
        int posts = 0, reads = 0, biggest = 0;
        boolean same = true;

        for (int t = 1; t <= 3000; t++) {
            if (rnd() % 10 < 3) {
                int a = rnd();
                int author = a % 5 == 0 ? 0 : a % U;
                int[] item = {t, t * 10 + author % 10}; // {time, tweet id}
                posts++;
                tweets.get(author).addFirst(item);
                work[0][0] += 1;
                List<Integer> fan = new ArrayList<>();
                fan.add(author);
                fan.addAll(followers.get(author));
                for (int f : fan) deliver(timeline.get(f), item);
                work[1][0] += fan.size();
                biggest = Math.max(biggest, fan.size());
                if (celeb[author]) work[2][0] += 1;
                else {
                    for (int f : fan) deliver(hybridTl.get(f), item);
                    work[2][0] += fan.size();
                }
            } else {
                int user = rnd() % U;
                reads++;
                Set<Integer> mine = new HashSet<>(following.get(user));
                mine.add(user);
                List<List<int[]>> all = new ArrayList<>(), hybridSources = new ArrayList<>();
                hybridSources.add(hybridTl.get(user));
                for (int v : mine) { all.add(tweets.get(v)); if (celeb[v]) hybridSources.add(tweets.get(v)); }
                List<Integer> pullFeed = mergeNewest(all);
                work[0][1] += heapWork;
                List<Integer> pushFeed = new ArrayList<>();
                for (int[] it : timeline.get(user)) pushFeed.add(it[1]);
                work[1][1] += pushFeed.size();
                List<Integer> hybridFeed = mergeNewest(hybridSources);
                work[2][1] += heapWork;
                same = same && pullFeed.equals(pushFeed) && pushFeed.equals(hybridFeed); // equals, not ==
            }
        }

        System.out.println("users " + U + ", posts " + posts + ", feed reads " + reads + ", celebrities " + celebs);
        System.out.println("biggest single fan-out (push): " + biggest + " timeline writes");
        String[] names = {"pull", "push", "hybrid"};
        for (int m = 0; m < 3; m++)
            System.out.println(names[m] + ": write work " + work[m][0] + ", read work " + work[m][1] + ", total " + (work[m][0] + work[m][1]));
        System.out.println("all three designs return the same feeds: " + same);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Design a simplified Twitter in C++ with \`postTweet(int userId, int tweetId)\`, \`std::vector<int> getNewsFeed(int userId)\` returning the 10 most recent tweet ids from the user and everyone they follow, newest first, plus \`follow\` and \`unfollow\`. Then tell me how you would change the design if some users had millions of followers."

**What a strong answer should cover:**
- \`unordered_map\` of user → \`unordered_set\` of followees, \`unordered_map\` of user → \`vector\` of \`(time, tweetId)\`; a global counter as the timestamp.
- The feed as a k-way merge of sorted lists with a \`std::priority_queue\`, stopping after 10: O(f + 10 log f).
- Fan-out on read vs fan-out on write, the celebrity problem, and the hybrid approach.
- Edge cases: own tweets included, self-follow ignored, unfollowing a stranger is a no-op, empty feeds.
- C++ details: \`priority_queue\` is a max-heap by default, which is exactly "newest first"; \`operator[]\` on an \`unordered_map\` inserts on read, so use \`find\`; \`tuple\` comparison is lexicographic.

**Clarifying questions expected:**
- Does the feed include the user's own tweets, and how many tweets?
- How skewed are follower counts, and what is the read/write ratio?

**Code / implementation expected:** Yes — a \`Twitter\` class with \`unordered_map\`, \`unordered_set\` and \`priority_queue\`, in C++17.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in C++.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a village where everyone writes short notes, and every morning each person wants to read the 10 newest notes from the friends they follow. There are two ways to deliver them.

**The reader goes collecting.** You walk to each friend's house, look at the newest notes pinned on their door, and pick the 10 newest overall. Posting is free (pin it on your own door), but reading means visiting every friend.

**The writer goes delivering.** Each time someone writes a note, they make a copy and drop it in the mailbox of every follower. Reading is instant: open your own mailbox. But a very popular villager with 10,000 followers spends the whole day making copies.

That is the entire design question. The coding version ("design Twitter" with \`postTweet\`, \`getNewsFeed\`, \`follow\`, \`unfollow\`) is solved with **hash maps** for who follows whom and who posted what, and a **heap** to pick the 10 newest tweets out of many sorted lists. The system-design follow-up is the choice between the two delivery strategies: **fan-out on read** and **fan-out on write**, and the hybrid real systems use for celebrities.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many tweets in a feed, and in what order? | The classic version is the 10 most recent, newest first. A fixed small limit is what makes the heap merge cheap. |
| Does a user see their own tweets? | Usually yes, so the user is added to their own source list. |
| Can a user follow themselves? Unfollow someone they do not follow? | Both should be harmless no-ops; decide now so the code does not throw. |
| How is "most recent" defined: a clock or a counter? | A global counter that increases on every post gives a strict order with no ties. |
| How many users, how many follows per user, how skewed? | Decides pull vs push. A few accounts with millions of followers break pure push. |
| What is the read/write ratio? | Feeds are usually read far more often than tweets are posted, which favours doing work at write time, except for celebrities. |

## 3. The Data Model: Hash Maps and a Clock

We need three pieces of state, and every operation except the feed is an O(1) hash-map operation (see [how a hash table works](/interview-question/how-does-a-hash-table-work)):

- \`following\`: user → **set** of users they follow. A set makes \`follow\` and \`unfollow\` O(1) and ignores duplicates.
- \`tweets\`: user → **list** of \`(time, tweetId)\` in the order posted. Appending keeps each list sorted by time for free.
- \`time\`: one global counter, incremented on every post. It gives every tweet a unique, strictly increasing timestamp, so "newest" never has ties.

📌 **Interview term: Monotonic counter** — a number that only ever increases. Used as a timestamp it gives a total order, unlike wall-clock time, which can repeat or jump backwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Three pieces of state: a hash map from user to the set of users they follow, a hash map from user to their tweets with timestamps, and one global clock">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">following: hash map</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">user 1 maps to set of 2, 7, 9</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">tweets: hash map</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">user 2 maps to (3, 101), (8, 105)</text>
  <rect class="d-box-accent" x="200" y="150" width="300" height="56" rx="10"/>
  <text class="d-text" x="350" y="176" text-anchor="middle">clock: one global counter</text>
  <text class="d-sub" x="350" y="196" text-anchor="middle">time 1, 2, 3 on every post</text>
</svg>

\`following\` and \`tweets\` are separate maps keyed by user id; the clock is shared by everybody.

## 4. Building the Feed: Merge k Sorted Lists, Stop at 10

Each followed user's tweet list is already sorted by time. The feed is the 10 newest items across f + 1 sorted lists (f followees plus yourself). That is exactly [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), read from the newest end, with an early stop after 10:

1. Put the **newest** tweet of each source into a **max-heap** keyed by time.
2. Pop the top: it is the newest remaining tweet overall. Add its id to the feed.
3. Push the **next-newest** tweet of the same user (if any).
4. Repeat until the feed has 10 tweets or the heap is empty.

📌 **Interview term: Fan-out on read (pull model)** — the feed is computed when it is read, by pulling from every followed user. Posting is O(1); reading costs O(f) to seed the heap plus O(10 log f) to pop.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on read: when user 1 opens the feed, the newest tweet of each followed user goes into a max-heap and the ten newest are popped">
  <defs>
    <marker id="b20q5cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="47" text-anchor="middle">user 2 tweets</text>
  <rect class="d-box" x="20" y="100" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="127" text-anchor="middle">user 7 tweets</text>
  <rect class="d-box" x="20" y="180" width="180" height="44" rx="8"/>
  <text class="d-text" x="110" y="207" text-anchor="middle">user 1 (self)</text>
  <path class="d-edge" d="M 202 42 L 266 100" marker-end="url(#b20q5cp-a1)"/>
  <path class="d-edge" d="M 202 122 L 266 122" marker-end="url(#b20q5cp-a1)"/>
  <path class="d-edge" d="M 202 202 L 266 146" marker-end="url(#b20q5cp-a1)"/>
  <rect class="d-box-accent" x="272" y="72" width="180" height="100" rx="10"/>
  <text class="d-text" x="362" y="106" text-anchor="middle">max-heap by time</text>
  <text class="d-sub" x="362" y="132" text-anchor="middle">one entry per user</text>
  <text class="d-sub" x="362" y="154" text-anchor="middle">pop up to 10 times</text>
  <path class="d-edge-accent" d="M 454 122 L 514 122" marker-end="url(#b20q5cp-a1)"/>
  <rect class="d-box-muted" x="520" y="92" width="160" height="60" rx="10"/>
  <text class="d-text" x="600" y="118" text-anchor="middle">feed</text>
  <text class="d-sub" x="600" y="140" text-anchor="middle">10 newest ids</text>
</svg>

Each followed user contributes only their single newest tweet to the heap at first; a user's older tweets enter only when the newer one has been taken. So the heap never holds more than f + 1 entries, and at most 10 + f entries are ever pushed.

Why a heap rather than collecting everything and sorting? If each of 300 followees has 1,000 tweets, sorting all 300,000 to take 10 is absurd. The heap touches at most f + 10 tweets. (Comparing heap merges with pairwise merging in general is covered in [heap vs divide and conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k); with an early stop after 10, the heap is the clear winner.)

📌 **Interview term: Early termination** — stopping an algorithm as soon as the answer is known. A heap merge can stop after 10 pops; a full merge or sort cannot.

## 5. The Code in C++

~~~cpp
class Twitter {
    static constexpr int FEED_SIZE = 10;
    int time = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;  // user -> (time, id), oldest first
    unordered_map<int, unordered_set<int>> following;   // user -> followees

public:
    void postTweet(int user, int tweetId) {
        tweets[user].push_back({++time, tweetId});  // a global counter orders tweets across users
    }

    vector<int> getNewsFeed(int user) {
        // (time, tweetId, user, index); std::priority_queue is a max-heap, so the newest is on top
        priority_queue<tuple<int, int, int, int>> heap;
        unordered_set<int> sources;
        auto f = following.find(user);  // find, not [], so a read never inserts an empty entry
        if (f != following.end()) sources = f->second;
        sources.insert(user);  // you always see your own tweets
        for (int u : sources) {
            auto it = tweets.find(u);
            if (it != tweets.end() && !it->second.empty()) {
                int i = (int)it->second.size() - 1;  // start from each user's newest tweet
                heap.emplace(it->second[i].first, it->second[i].second, u, i);
            }
        }
        vector<int> feed;
        while (!heap.empty() && (int)feed.size() < FEED_SIZE) {
            auto [t, tid, u, i] = heap.top();
            heap.pop();
            feed.push_back(tid);
            if (i > 0) {  // that user's next-newest tweet
                const auto& next = tweets[u][i - 1];
                heap.emplace(next.first, next.second, u, i - 1);
            }
        }
        return feed;
    }

    void follow(int follower, int followee) {
        if (follower != followee) following[follower].insert(followee);
    }

    void unfollow(int follower, int followee) {
        auto f = following.find(follower);
        if (f != following.end()) f->second.erase(followee);  // no error if absent
    }
};
~~~

**What to point out in this code:**

- \`std::priority_queue\` is a **max-heap** by default, which for once is exactly what we want: the tuple with the largest time is on top. No custom comparator needed, because \`std::tuple\` compares lexicographically.
- \`following.find(user)\` and \`tweets.find(u)\` read without inserting. \`following[user]\` on a read path would insert an empty set for every stranger whose feed is requested; \`operator[]\` is used only in \`postTweet\` and \`follow\`, where inserting is the point.
- \`sources = f->second\` copies the follow set before inserting the user, so reading a feed never makes anyone follow themselves.
- \`auto [t, tid, u, i] = heap.top();\` copies the entry (structured bindings, C++17) before \`pop()\`, so nothing dangles.
- \`f->second.erase(followee)\` on an \`unordered_set\` returns the number of erased elements (0 or 1) and never throws, so unfollowing a stranger is a no-op.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the classic sequence (post, follow, post, unfollow), then 12 alternating tweets, a self-follow, an unfollow of a stranger, and a user who has never done anything** prints:

~~~text
[5]
[6, 5]
[5]
[112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
[111, 109, 107, 105, 103, 101]
[]
~~~

User 3 follows users 1 and 2, so the feed is the 10 newest of all 12 tweets (112 down to 103). User 1 follows nobody and sees only their own 6 tweets. User 42 gets an empty list.

**Example 2 — the same 3,000-operation workload under pull, push and hybrid, counting work and checking that every feed is identical** prints:

~~~text
users 300, posts 953, feed reads 2047, celebrities 1
biggest single fan-out (push): 300 timeline writes
pull: write work 953, read work 49082, total 50035
push: write work 62139, read work 20035, total 82174
hybrid: write work 4731, read work 43879, total 48610
all three designs return the same feeds: true
~~~

## 7. The Real Design Question: Fan-Out on Read vs Write

The coding version computes feeds on read. At scale, the interviewer will ask whether to do the work when tweets are **written** instead.

📌 **Interview term: Fan-out on write (push model)** — when a user posts, copy the tweet id into a stored timeline for every follower. Reading a feed is a lookup; posting costs one write per follower.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Fan-out on write: when user 2 posts, the tweet is copied into the stored timeline of every follower; reading a feed is then a simple lookup">
  <defs>
    <marker id="b20q5cp-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="98" width="170" height="54" rx="10"/>
  <text class="d-text" x="105" y="122" text-anchor="middle">user 2 posts</text>
  <text class="d-sub" x="105" y="142" text-anchor="middle">tweet 105</text>
  <path class="d-edge" d="M 192 112 L 300 46" marker-end="url(#b20q5cp-a2)"/>
  <path class="d-edge" d="M 192 125 L 300 125" marker-end="url(#b20q5cp-a2)"/>
  <path class="d-edge" d="M 192 138 L 300 204" marker-end="url(#b20q5cp-a2)"/>
  <rect class="d-box" x="306" y="22" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="49" text-anchor="middle">timeline of user 1</text>
  <rect class="d-box" x="306" y="103" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="130" text-anchor="middle">timeline of user 5</text>
  <rect class="d-box" x="306" y="184" width="220" height="44" rx="8"/>
  <text class="d-text" x="416" y="211" text-anchor="middle">timeline of user 2</text>
  <rect class="d-box-muted" x="570" y="103" width="110" height="44" rx="8"/>
  <text class="d-text" x="625" y="130" text-anchor="middle">read: O(1)</text>
  <path class="d-edge-dashed" d="M 528 125 L 566 125" marker-end="url(#b20q5cp-a2)"/>
</svg>

Each follower keeps a short stored timeline (here the latest 10 ids), so reading never touches anyone else's data.

The problem with push is the **celebrity**: an account followed by everyone turns one post into millions of writes, and those writes are wasted for followers who never open the app.

📌 **Interview term: Celebrity (hot key) problem** — a few accounts with enormous follower counts dominate the cost of fan-out on write, and any single machine or key that holds them becomes a hotspot.

📌 **Interview term: Hybrid fan-out** — push tweets from normal accounts into their followers' timelines, but do not fan out celebrity tweets; at read time, merge the stored timeline with the few celebrities the reader follows, using the same heap merge.

To put numbers on it, example 2 simulates 300 users. Each follows 5 random users, and everybody also follows user 0, the celebrity (299 followers). Over 3,000 operations about 30% are posts (20% of them by the celebrity) and the rest are feed reads. "Write work" counts timeline insertions; "read work" counts heap entries pushed and popped (or timeline items read, for push). All three designs are checked to return identical feeds on every read.

| Design | Write work | Read work | Total |
| :--- | :--- | :--- | :--- |
| Pull (fan-out on read) | 953 | 49,082 | 50,035 |
| Push (fan-out on write) | 62,139 | 20,035 | 82,174 |
| Hybrid (no fan-out for the celebrity) | 4,731 | 43,879 | 48,610 |

Push made reads cheapest, but paid 62,139 writes, mostly because every one of the celebrity posts was copied 300 times (the biggest single fan-out). The hybrid cut writes by about 13× compared with push, and read work stayed close to pull, because each read merges only one stored timeline plus one celebrity list instead of up to seven tweet lists. In this toy workload pull and hybrid are close; the gap grows with follower counts and with how much more often feeds are read than written. The point to make in an interview is the *shape* of the trade-off, not these exact numbers.

## 8. How the Pieces Fit

Every part of this design is a pattern with its own page. The maps are plain [hash tables](/interview-question/how-does-a-hash-table-work). The feed is [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists) with an early stop. Keeping "the 10 best of many" with a heap is the same idea as [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements). Recognising those three patterns is what lets you write the class in 15 minutes and spend the rest of the interview on fan-out.

## 9. Complexity

With f = number of users someone follows, F = followers of the poster, and a feed size of 10:

| Operation | Pull model | Push model | Why |
| :--- | :--- | :--- | :--- |
| \`postTweet\` | O(1) | O(F) | append to own list vs copy into F timelines |
| \`getNewsFeed\` | O(f + 10 log f) | O(10) | seed a heap with f entries (heapify is O(f)), pop 10 vs read a stored list |
| \`follow\` / \`unfollow\` | O(1) | O(1) plus backfill or cleanup | set insert/remove; push must also add or remove tweets in the stored timeline |
| Space | O(users + follows + tweets) | plus 10 ids per user timeline | timelines are bounded copies |

## 10. Beyond One Machine (Briefly)

- **Cap what you scan.** A feed needs at most 10 tweets per followed user, so only each user's newest 10 tweets are ever touched. Old tweets can live in slower storage.
- **Shard by user id.** \`following\`, \`tweets\` and timelines are all keyed by user, so they split naturally across machines; the heap merge then pulls from several shards.
- **Cache feeds.** A freshly computed pull feed can be cached for a short time, like an [LRU cache](/interview-question/how-do-you-design-an-lru-cache); a push timeline already is a cache.
- **Unfollow in the push model** means removing that user's tweets from the stored timeline (or filtering at read time), which is why the coding version usually uses pull.

## 11. Edge Cases

- **A user with no tweets and no follows** (user 42 in example 1): the feed is empty, and reading it must not create empty entries in the maps.
- **Fewer than 10 tweets in total:** the heap empties before 10 pops; return what you have (user 1 sees 6 tweets in example 1).
- **Following yourself:** ignored by \`follow\`; your own tweets are always included anyway.
- **Unfollowing someone you do not follow:** a no-op, never an error.
- **Unfollow, then read:** the unfollowed user disappears from the feed immediately, because the pull model reads \`following\` at feed time (\`[6, 5]\` becomes \`[5]\` in example 1).
- **Two tweets posted "at the same time":** impossible with a global counter; with wall-clock timestamps you would need a tie-breaker such as the tweet id.

## Common Pitfalls

- **\`operator[]\` on read paths.** \`following[user]\` inserts an empty set for unknown users; use \`find\`.
- **Holding a reference to \`top()\` across \`pop()\`.** \`const auto& e = heap.top(); heap.pop();\` leaves \`e\` dangling. Copy first, as the structured binding does.
- **Adding a min-heap comparator by habit.** \`greater<>\` would put the oldest tweet on top; here the default max-heap is correct.
- **Mutating the stored follow set.** \`following[user].insert(user)\` inside the feed makes the user follow themselves forever; copy first.
- **Sorting every tweet of every followee.** O(T log T); the heap touches at most f + 10 entries.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> user to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code> of followees, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> user to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(time, tweetId)</code>, and one global counter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Feed:</strong> <span style="color:#f0e2c8;">A k-way merge from the newest end: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;tuple&lt;int,int,int,int&gt;&gt;</code>, a max-heap by default, pop up to 10, push that user's next-newest tweet.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Post, follow, unfollow are O(1) on average. The feed is O(f log f) to push the seeds plus O(10 log f) to pop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> on read paths; copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>; no comparator needed because the default max-heap is newest first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. At scale:</strong> <span style="color:#f0e2c8;">Pull is cheap to write, push is cheap to read; celebrities break push, so the hybrid fans out normal users and merges celebrities at read time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a heap and not sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">We need only 10 items from f sorted lists. The heap touches at most f + 10 tweets; sorting would touch every tweet of every followee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_set</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector</code> for followees?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Follow, unfollow and membership become O(1) on average and duplicates are ignored. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> needs a linear search for each.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add delete-tweet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;int&gt;</code> of deleted ids and skip them while popping. That is lazy deletion, the same trick as in the sliding window median.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for fan-out on write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each user gets a stored timeline (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> capped at 10); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">postTweet</code> pushes the id to the front of every follower's timeline. Follow and unfollow then need to backfill or clean it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the hybrid draw the line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a follower-count threshold. Below it, push; above it, pull at read time and merge with the stored timeline. In the simulation that cut writes from 62,139 to 4,731.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic counter** | A number that only increases; a tie-free timestamp |
| **Fan-out on read (pull model)** | Build the feed when it is read by merging the followees' tweets |
| **Early termination** | Stop as soon as the answer is known, here after 10 pops |
| **Fan-out on write (push model)** | Copy each new tweet into every follower's stored timeline |
| **Celebrity (hot key) problem** | A few huge accounts dominate fan-out cost and create hotspots |
| **Hybrid fan-out** | Push for normal accounts, pull for celebrities, merge at read time |
| **Structured binding** | C++17 syntax auto [a, b] = t that unpacks a tuple or pair into named variables |

---
**Conclusion:** Design Twitter is two hash maps, a clock and a heap. Follows and posts are O(1) average \`unordered_map\` and \`unordered_set\` operations; the feed is a k-way merge of each followed user's sorted tweets, run from the newest end with a \`priority_queue\` (already a max-heap) and stopped after 10. In C++, keep read paths free of \`operator[]\` and copy \`top()\` before popping. Then lift it to system design: pull is cheap to write, push is cheap to read, and the hybrid that skips fan-out for celebrities gets most of both.`,
        examples: [
          {
            label: `Twitter class: post, follow, unfollow and the 10-tweet feed`,
            code: `#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;

// Fan-out on read: each user keeps their own tweets; the feed is a k-way merge with a heap.
class Twitter {
    static constexpr int FEED_SIZE = 10;
    int time = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;  // user -> (time, id), oldest first
    unordered_map<int, unordered_set<int>> following;   // user -> followees

public:
    void postTweet(int user, int tweetId) {
        tweets[user].push_back({++time, tweetId});  // a global counter orders tweets across users
    }

    vector<int> getNewsFeed(int user) {
        // (time, tweetId, user, index); std::priority_queue is a max-heap, so the newest is on top
        priority_queue<tuple<int, int, int, int>> heap;
        unordered_set<int> sources;
        auto f = following.find(user);  // find, not [], so a read never inserts an empty entry
        if (f != following.end()) sources = f->second;
        sources.insert(user);  // you always see your own tweets
        for (int u : sources) {
            auto it = tweets.find(u);
            if (it != tweets.end() && !it->second.empty()) {
                int i = (int)it->second.size() - 1;  // start from each user's newest tweet
                heap.emplace(it->second[i].first, it->second[i].second, u, i);
            }
        }
        vector<int> feed;
        while (!heap.empty() && (int)feed.size() < FEED_SIZE) {
            auto [t, tid, u, i] = heap.top();
            heap.pop();
            feed.push_back(tid);
            if (i > 0) {  // that user's next-newest tweet
                const auto& next = tweets[u][i - 1];
                heap.emplace(next.first, next.second, u, i - 1);
            }
        }
        return feed;
    }

    void follow(int follower, int followee) {
        if (follower != followee) following[follower].insert(followee);
    }

    void unfollow(int follower, int followee) {
        auto f = following.find(follower);
        if (f != following.end()) f->second.erase(followee);  // no error if absent
    }
};

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    Twitter tw;
    tw.postTweet(1, 5);
    cout << fmt(tw.getNewsFeed(1)) << "\\n";  // [5]
    tw.follow(1, 2);
    tw.postTweet(2, 6);
    cout << fmt(tw.getNewsFeed(1)) << "\\n";  // [6, 5]
    tw.unfollow(1, 2);
    cout << fmt(tw.getNewsFeed(1)) << "\\n";  // [5]

    Twitter t2;
    for (int i = 1; i <= 12; i++) t2.postTweet(i % 2 ? 1 : 2, 100 + i);  // users 1 and 2 alternate
    t2.follow(3, 1);
    t2.follow(3, 2);
    t2.follow(3, 3);    // following yourself is ignored
    t2.unfollow(3, 9);  // unfollowing a stranger is a no-op
    cout << fmt(t2.getNewsFeed(3)) << "\\n";  // [112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
    cout << fmt(t2.getNewsFeed(1)) << "\\n";  // [111, 109, 107, 105, 103, 101]
    cout << fmt(t2.getNewsFeed(42)) << "\\n";  // []
}`,
          },
          {
            label: `Fan-out on read vs write vs hybrid: work counts on 3000 operations`,
            code: `#include <algorithm>
#include <cstdio>
#include <deque>
#include <queue>
#include <set>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;

// Simulate 300 users and 3000 operations under three feed designs and count the work.
const int U = 300, FEED = 10, CELEB_LIMIT = 50;
long long seed = 2024;

int rnd() {  // MINSTD, same numbers in every language; long long because the product overflows int
    seed = seed * 48271 % 2147483647;
    return (int)seed;
}

using Tweet = pair<int, int>;  // (time, id)
using List = deque<Tweet>;     // newest first

// k-way merge of newest-first lists; returns the feed and adds heap work to *work
vector<int> mergeNewest(const vector<const List*>& sources, long long* work) {
    priority_queue<tuple<int, int, int, int>> heap;  // max-heap on time: newest on top
    for (int s = 0; s < (int)sources.size(); s++)
        if (!sources[s]->empty()) heap.emplace((*sources[s])[0].first, (*sources[s])[0].second, s, 0);
    *work += heap.size();
    vector<int> feed;
    while (!heap.empty() && (int)feed.size() < FEED) {
        auto [t, tid, s, i] = heap.top();
        heap.pop();
        (*work)++;
        feed.push_back(tid);
        if (i + 1 < (int)sources[s]->size()) {
            const Tweet& next = (*sources[s])[i + 1];
            heap.emplace(next.first, next.second, s, i + 1);
            (*work)++;
        }
    }
    return feed;
}

void deliver(List& tl, Tweet item) {  // newest first; keep only FEED items
    tl.push_front(item);
    if ((int)tl.size() > FEED) tl.pop_back();
}

int main() {
    vector<set<int>> following(U);
    for (int u = 1; u < U; u++) {
        following[u].insert(0);  // everybody follows user 0, the celebrity
        while (following[u].size() < 6) {
            int v = rnd() % U;
            if (v != u) following[u].insert(v);
        }
    }
    vector<vector<int>> followers(U);
    for (int u = 0; u < U; u++) for (int v : following[u]) followers[v].push_back(u);
    vector<bool> celeb(U);
    int celebs = 0;
    for (int u = 0; u < U; u++) celebs += (celeb[u] = (int)followers[u].size() > CELEB_LIMIT);

    vector<List> tweets(U), timeline(U), hybridTl(U);
    long long work[3][2] = {};  // pull, push, hybrid x {write, read}
    int posts = 0, reads = 0, biggest = 0;
    bool same = true;

    for (int t = 1; t <= 3000; t++) {
        if (rnd() % 10 < 3) {
            int a = rnd();
            int author = a % 5 == 0 ? 0 : a % U;
            Tweet item{t, t * 10 + author % 10};
            posts++;
            tweets[author].push_front(item);
            work[0][0] += 1;
            vector<int> fan{author};
            fan.insert(fan.end(), followers[author].begin(), followers[author].end());
            for (int f : fan) deliver(timeline[f], item);
            work[1][0] += fan.size();
            biggest = max(biggest, (int)fan.size());
            if (celeb[author]) work[2][0] += 1;
            else {
                for (int f : fan) deliver(hybridTl[f], item);
                work[2][0] += fan.size();
            }
        } else {
            int user = rnd() % U;
            reads++;
            set<int> mine = following[user];
            mine.insert(user);
            vector<const List*> all, hybridSources{&hybridTl[user]};
            for (int v : mine) { all.push_back(&tweets[v]); if (celeb[v]) hybridSources.push_back(&tweets[v]); }
            vector<int> pullFeed = mergeNewest(all, &work[0][1]);
            vector<int> pushFeed;
            for (const Tweet& it : timeline[user]) pushFeed.push_back(it.second);
            work[1][1] += pushFeed.size();
            vector<int> hybridFeed = mergeNewest(hybridSources, &work[2][1]);
            same = same && pullFeed == pushFeed && pushFeed == hybridFeed;
        }
    }

    printf("users %d, posts %d, feed reads %d, celebrities %d\\n", U, posts, reads, celebs);
    printf("biggest single fan-out (push): %d timeline writes\\n", biggest);
    const char* names[] = {"pull", "push", "hybrid"};
    for (int m = 0; m < 3; m++)
        printf("%s: write work %lld, read work %lld, total %lld\\n", names[m], work[m][0], work[m][1], work[m][0] + work[m][1]);
    printf("all three designs return the same feeds: %s\\n", same ? "true" : "false");
}`,
          },
        ],
      },
    },
  },
];

export default augments;
