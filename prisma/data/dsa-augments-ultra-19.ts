/**
 * DSA ULTRA — batch 19: heaps and priority queues — what a heap / priority queue is, the Kth
 * largest element (heap vs quickselect), top K frequent elements, k closest points to the origin,
 * and merging k sorted lists. One complete answer per language (Python, JavaScript, Java, C++).
 * Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "What is a heap / priority queue?",
    difficulty: "medium",
    seoDescription: "A heap is a tree in an array that hands back the smallest (or largest) item in O(log n). Push, pop, heapify in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a heap, and what is a priority queue? Explain how a binary heap is laid out, how push and pop work and what they cost, and show me how you would use one in Python — and how you would build one yourself if the library did not exist."

**What a strong answer should cover:**
- A priority queue is the abstract type (insert, peek best, remove best); a binary heap is the usual implementation: a complete binary tree stored in a list.
- The two rules (complete shape, parent ≤ child) and the index arithmetic: parent (i − 1) // 2, children 2i + 1 and 2i + 2.
- Push = append + sift up, pop = move last to root + sift down, both O(log n); peek O(1); bottom-up heapify O(n).
- A heap is only partly sorted: the root is the minimum, siblings are in no order, and popping everything gives heap sort.
- Python specifics: \`heapq\` is a set of functions on a plain list and is a min-heap only; negate keys for a max-heap (or use the \`_max\` functions added in Python 3.14); push \`(priority, counter, item)\` tuples so ties never compare the items.

**Code / implementation expected:** Optional — be ready to write push and pop with sift up / sift down on a Python list, and to use \`heapq\` fluently.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Python lists and loops; no tree knowledge assumed.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the waiting room of a hospital emergency department. Patients do not get seen in the order they walk in. A nurse gives each one a number for how urgent they are, and whenever a doctor becomes free, the **most urgent** patient goes next — even if they arrived five minutes ago and someone with a sprained wrist has been there for two hours. New patients keep arriving all the time, so the nurse cannot just sort the list once and be done.

That waiting room is a **priority queue**: a collection where you can keep adding items, and whenever you ask, you get back the item with the best priority. The nurse needs two things to be fast: "add a patient" and "who is next?". Sorting the whole room after every arrival would be slow. Scanning the whole room every time a doctor is free would also be slow. A **heap** is the clever arrangement that makes both of them cheap — about log₂(n) steps each, which is 17 steps for 100,000 patients.

Heaps show up everywhere in interviews: "the k largest", "the k most frequent", "the k closest", "merge k sorted lists", "the running median", and the shortest-path algorithm Dijkstra all use one. Learn this page well and a whole family of questions becomes the same trick.

## 2. Priority Queue vs Heap — Two Different Words

People often use the two words as if they were the same. They are not, and interviewers like candidates who can say the difference in one sentence.

📌 **Interview term: Priority queue** — an abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item. It says nothing about how it is built.

📌 **Interview term: Binary heap** — the most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children. Insert and remove-best cost O(log n); look-at-best costs O(1).

You could build a priority queue badly with an unsorted list (insert O(1), remove-best O(n)) or with a sorted list (remove-best O(1), insert O(n)). The heap sits in the sweet spot: both are O(log n). A [balanced binary search tree](/interview-question/what-is-a-binary-search-tree-bst) also gives O(log n), but it costs more memory and more pointer chasing; the heap is just an array.

📌 **Interview term: Min-heap / max-heap** — in a min-heap the smallest item sits at the top (the root); in a max-heap the largest does. A max-heap is a min-heap with the comparison flipped.

## 3. The Two Rules of a Heap

A binary heap obeys exactly two rules. Everything else follows from them.

**Rule 1 — the shape rule.** The tree is filled level by level, left to right, with no gaps. Only the last level may be partly filled, and it fills from the left.

📌 **Interview term: Complete binary tree** — a binary tree where every level is full except possibly the last, and the last level is filled from the left. Its height is about log₂(n), which is where the log n cost comes from.

**Rule 2 — the order rule.** Every parent is smaller than or equal to each of its children (in a min-heap). Nothing is promised between siblings or cousins: the heap is only *partly* sorted.

📌 **Interview term: Heap property** — the order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap). It guarantees the root is the minimum, and says nothing else about the order.

Here is the min-heap that our example 1 builds from the pushes 5, 3, 8, 1, 9, 2:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="A min-heap drawn as a tree. Root 1 at index 0, children 3 at index 1 and 2 at index 2, then 5, 9 and 8 at indexes 3, 4 and 5">
  <path class="d-edge" d="M 300 70 L 196 128"/>
  <path class="d-edge" d="M 340 70 L 444 128"/>
  <path class="d-edge" d="M 166 164 L 112 214"/>
  <path class="d-edge" d="M 194 164 L 248 214"/>
  <path class="d-edge" d="M 446 164 L 396 214"/>
  <circle class="d-box-accent" cx="320" cy="50" r="26"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">1</text>
  <text class="d-sub" x="372" y="40" text-anchor="middle">index 0</text>
  <circle class="d-box" cx="180" cy="145" r="26"/>
  <text class="d-text" x="180" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="110" y="140" text-anchor="middle">index 1</text>
  <circle class="d-box" cx="460" cy="145" r="26"/>
  <text class="d-text" x="460" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="530" y="140" text-anchor="middle">index 2</text>
  <circle class="d-box-muted" cx="100" cy="240" r="26"/>
  <text class="d-text" x="100" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="100" y="290" text-anchor="middle">index 3</text>
  <circle class="d-box-muted" cx="260" cy="240" r="26"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">9</text>
  <text class="d-sub" x="260" y="290" text-anchor="middle">index 4</text>
  <circle class="d-box-muted" cx="380" cy="240" r="26"/>
  <text class="d-text" x="380" y="245" text-anchor="middle">8</text>
  <text class="d-sub" x="380" y="290" text-anchor="middle">index 5</text>
</svg>

Every parent is smaller than its children (1 < 3, 1 < 2, 3 < 5, 3 < 9, 2 < 8), so 1 is the minimum. But the heap is not sorted: 8 sits below 2 while 5 and 9 sit below 3.

### Why it fits in a plain array

Because the tree has no gaps, you can number the nodes level by level (0 at the root, then 1 and 2, then 3, 4, 5, ...) and store node number i at array index i. No pointers are needed, because the family links are arithmetic:

| From node i | Index |
| :--- | :--- |
| parent | (i − 1) / 2, rounded down |
| left child | 2i + 1 |
| right child | 2i + 2 |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="The same heap as an array 1, 3, 2, 5, 9, 8. Index 1 holding 3 has children at index 3 and index 4">
  <defs>
    <marker id="b19q1-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="50" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="140" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="180" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="230" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="320" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="410" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="540" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="90" y="24" text-anchor="middle">0</text>
  <text class="d-sub" x="180" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="360" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="24" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 180 96 Q 270 160 352 98" marker-end="url(#b19q1-arr)"/>
  <path class="d-edge-accent" d="M 186 96 Q 320 182 444 98" marker-end="url(#b19q1-arr)"/>
  <text class="d-sub" x="250" y="160" text-anchor="middle">2i + 1</text>
  <text class="d-sub" x="420" y="160" text-anchor="middle">2i + 2</text>
</svg>

Node 3 lives at index 1, so its children are at 2·1 + 1 = 3 (value 5) and 2·1 + 2 = 4 (value 9), and its parent is at (1 − 1) / 2 = 0. Example 1 prints exactly this check.

## 4. The Three Operations

### Peek — O(1)

The best item is always at index 0. Reading it costs nothing.

### Push — add at the end, then sift up

1. Put the new item in the next free slot (the end of the array). The shape rule still holds.
2. The order rule may now be broken between the new item and its parent. If the new item is smaller than its parent, swap them. Repeat from the new position until the parent is smaller or you reach the root.

📌 **Interview term: Sift up (bubble up)** — moving an item towards the root by swapping it with its parent while it is smaller than the parent. At most one swap per level, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Push 2 into the heap 1, 3, 8, 5, 9. It lands at index 5 under 8, is smaller than 8 so they swap, then it is larger than 1 so it stops">
  <defs>
    <marker id="b19q1-up" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">append 2</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">1, 3, 8, 5, 9, 2</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">index 5, parent 8</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">2 below 8: swap</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">1, 3, 2, 5, 9, 8</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">now index 2, parent 1</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">2 above 1: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">heap property holds</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">one swap in total</text>
</svg>

This is the last push of example 1: the printed line is \`push 2 -> [1, 3, 2, 5, 9, 8]\`.

### Pop — move the last item to the root, then sift down

1. Remember the root (that is the answer).
2. Take the **last** item off the end of the array and put it at the root. The shape rule holds again (the array just got one shorter).
3. The new root is probably too big. Compare it with its two children; if the smaller child is smaller than it, swap with that child. Repeat until both children are bigger or you reach a leaf.

📌 **Interview term: Sift down (bubble down, heapify-down)** — moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger. One level per swap, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Pop from 1, 3, 2, 5, 9, 8. Remove 1, move the last item 8 to the root, swap 8 with its smaller child 2, and stop because 8 has no children left">
  <defs>
    <marker id="b19q1-down" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">take 1, move 8 up</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">8, 3, 2, 5, 9</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">children 3 and 2</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">swap with 2</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">2, 3, 8, 5, 9</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">8 is now at index 2</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">no children: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">indexes 5 and 6</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">are past the end</text>
</svg>

Example 1 prints this pop as \`pop 1 -> [2, 3, 8, 5, 9]\`. Why swap with the *smaller* child? Because that child becomes the parent of the other one, and only the smaller of the two can be a valid parent.

Popping everything, one at a time, hands the items back in sorted order — example 1 ends with \`pop order: [1, 2, 3, 5, 8, 9]\`. That is **heap sort** in a nutshell: O(n log n) and, when done inside the array itself, O(1) extra space. See [how common sorting algorithms compare](/interview-question/compare-common-sorting-algorithms).

## 5. Building a Heap From n Items: Heapify Is O(n)

If you already have all n items, you can push them one by one (O(n log n)), or you can use **bottom-up heapify**: treat the array as a tree as it stands, and sift down every parent node, starting from the last parent (index n/2 − 1) and walking back to the root.

📌 **Interview term: Heapify (bottom-up heap construction)** — turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root. It costs O(n), not O(n log n).

Why is it linear? Half of the nodes are leaves and need no work at all. A quarter sit one level up and can move down at most one level, an eighth can move at most two levels, and so on. The sum n/4·1 + n/8·2 + n/16·3 + ... is less than n. Only the single root can travel the full log n levels. Pushing one by one is the opposite: most items are added at the bottom and may climb all the way up.

Example 2 counts the comparisons on 100,000 items. On a descending input (the worst case for pushes, because every new item is the new minimum and climbs to the root) pushes make about 1.47 million comparisons and heapify about 200,000 — about 7 times fewer, and about 2n, as the sum predicts. On random input the gap is small (228k vs 188k), because a random new item usually stops after a step or two. Both methods produce valid heaps, but not necessarily the same array.

## 6. The Code in Python

### A heap from scratch

Interviewers sometimes say "do not use the library". Here is the whole thing on a Python list. The list *is* the tree; there is no node class.

~~~python
class MinHeap:
    """A binary min-heap stored in a plain Python list."""

    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)                     # 1. add at the end (next free slot)
        i = len(a) - 1
        while i > 0:                    # 2. sift up while smaller than the parent
            parent = (i - 1) // 2
            if a[i] >= a[parent]:
                break
            a[i], a[parent] = a[parent], a[i]
            i = parent

    def pop(self):
        a = self.a
        top = a[0]
        last = a.pop()                  # 1. take the last element off the end
        if a:
            a[0] = last                 # 2. move it to the root
            i, n = 0, len(a)
            while True:                 # 3. sift down: swap with the smaller child
                left, right = 2 * i + 1, 2 * i + 2
                smallest = i
                if left < n and a[left] < a[smallest]:
                    smallest = left
                if right < n and a[right] < a[smallest]:
                    smallest = right
                if smallest == i:
                    break
                a[i], a[smallest] = a[smallest], a[i]
                i = smallest
        return top

    def peek(self):
        return self.a[0]

    def size(self):
        return len(self.a)
~~~

**What to point out in this code:**

- \`(i - 1) // 2\` uses floor division. For \`i = 1\` and \`i = 2\` it gives the root, index 0. A plain \`/\` would give a float and break the indexing.
- \`a.pop()\` removes the **last** element in O(1). Never write \`a.pop(0)\` for a heap: that shifts every element left and costs O(n).
- \`a[i], a[parent] = a[parent], a[i]\` swaps two slots in one line using tuple unpacking.
- \`pop()\` on an empty heap raises \`IndexError\` at \`a[0]\`. That is what \`heapq.heappop([])\` does too (it raises \`IndexError: index out of range\` in our run). Check \`if h:\` first, or catch the error.

### The standard library: \`heapq\`

In real code and in most interviews you use \`heapq\`. It is not a class: it is a set of functions that keep an ordinary list arranged as a **min-heap**.

~~~python
import heapq

h = []
heapq.heappush(h, 5)          # O(log n)
heapq.heappush(h, 1)
smallest = h[0]               # peek, O(1): the list itself is the heap
x = heapq.heappop(h)          # remove and return the smallest, O(log n)

data = [5, 3, 8, 1, 9, 2]
heapq.heapify(data)           # in place, O(n)
heapq.heappushpop(data, 4)    # push then pop, in one sift: faster than two calls
heapq.heapreplace(data, 7)    # pop then push (the heap must not be empty)
heapq.nsmallest(3, data)      # the 3 smallest, as a sorted list
~~~

Things that trip people up:

- **There is no max-heap class.** The classic trick is to push \`-x\` and negate again when you pop; example 2 does this and prints \`[9, 8, 7]\`. Python 3.14 added public max-heap functions with a \`_max\` suffix (\`heappush_max\`, \`heappop_max\`, \`heapify_max\` and more), according to the [heapq documentation](https://docs.python.org/3/library/heapq.html). Our sandbox runs Python 3.13, so the examples use negation, which works on every version.
- **\`h[0]\` is the smallest, but \`h\` is not sorted.** After \`heapify\` on \`[5, 3, 8, 1, 9, 2]\` the list is \`[1, 3, 2, 5, 9, 8]\` in our run. Printing the list is not printing the queue in order.
- **Priorities with payloads.** Push tuples: \`heapq.heappush(h, (priority, item))\`. Tuples compare element by element, so equal priorities fall through to comparing the items — and if the items are dicts or custom objects, Python raises \`TypeError: '<' not supported between instances of 'dict' and 'dict'\` (we ran it). The standard fix is a tie-breaking counter: \`(priority, next(counter), item)\`, where \`counter = itertools.count()\`. The counter is unique, so the item is never compared, and equal priorities come out in insertion order.

📌 **Interview term: Tie-breaker** — an extra, always-distinct field (such as an insertion counter) placed after the priority in a tuple so that two equal priorities never fall through to comparing the payloads.

- **\`nlargest\` / \`nsmallest\` are smart.** In CPython 3.13 \`heapq.nlargest\` (we read its source with \`inspect.getsource\`) uses \`max()\` when n is 1, \`sorted()\` when n is at least the input length, and otherwise keeps a heap of size n. So \`heapq.nlargest(k, xs)\` is O(n log k) for small k.
- **\`queue.PriorityQueue\`** exists too, but it wraps \`heapq\` with locks for sharing between threads. In single-threaded interview code it is slower and has no peek; use \`heapq\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — a min-heap from scratch** prints the array after every push and pop:

~~~text
push 5 -> [5]
push 3 -> [3, 5]
push 8 -> [3, 5, 8]
push 1 -> [1, 3, 8, 5]
push 9 -> [1, 3, 8, 5, 9]
push 2 -> [1, 3, 2, 5, 9, 8]
peek -> 1
index 1: parent 0, children 3 and 4
pop 1 -> [2, 3, 8, 5, 9]
pop 2 -> [3, 5, 8, 9]
pop 3 -> [5, 9, 8]
pop 5 -> [8, 9]
pop 8 -> [9]
pop 9 -> []
pop order: [1, 2, 3, 5, 8, 9]
~~~

**Example 2 — n pushes vs bottom-up heapify, with comparisons counted, then \`heapq\`** prints:

~~~text
random n=100000: pushes 227688 comparisons, heapify 188071 comparisons
  both valid heaps: true
descending n=100000: pushes 1468946 comparisons, heapify 199978 comparisons
  both valid heaps: true
priority queue (min) pops: [1, 2, 3]
priority queue (max) pops: [9, 8, 7]
~~~

The descending input is where heapify shines: about 1.47 million comparisons for pushes against about 200,000 for heapify. The last two lines are \`heapq\` used as a min-heap and, with negated values, as a max-heap.

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`h[0]\` (peek) | O(1) | the minimum is always at index 0 |
| \`heappush\` | O(log n) | one sift up, at most one swap per level |
| \`heappop\` | O(log n) | one sift down, at most one swap per level |
| \`heapify\` | O(n) | most nodes are near the bottom and barely move (example 2) |
| n pushes | O(n log n) | each push may climb to the root |
| pop everything (heap sort) | O(n log n) | n pops of O(log n) |
| search for an arbitrary value | O(n) | the heap order does not help; you scan the list |
| Space | O(n) | the list itself; no pointers |

## 9. Where You Will Meet Heaps Next

Almost every heap interview question is one of three patterns:

- **Keep the k best items with a heap of size k.** The heap holds the current top k, and its root is the *worst* of them, so one comparison tells you whether a new item gets in. That is [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin).
- **Always take the smallest of several "fronts".** Keep one item per source in the heap and replace it with the next item from the same source: [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [the heap vs divide-and-conquer trade-off for it](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k), the news feed in [design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline), and [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work).
- **Two heaps facing each other.** A max-heap for the smaller half and a min-heap for the larger half give you the middle in O(1): [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream), [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing) and [the sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

## 10. Edge Cases

- **Empty heap** — \`h[0]\` and \`heappop(h)\` raise \`IndexError\`; guard with \`if h:\`.
- **Duplicates** — fine: the rule is parent ≤ child, so equal values can sit anywhere along a path.
- **One element** — push and pop do no swaps at all.
- **Mixed types** — \`heappush(h, 1); heappush(h, "a")\` raises \`TypeError\` because Python 3 does not order ints against strings. Keep one key type.
- **Mutating an item already in the heap** — the heap does not notice. Either push a new entry and skip stale ones when they come out ("lazy deletion"), or rebuild with \`heapify\`.

📌 **Interview term: Lazy deletion** — instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top.

## Common Pitfalls

- **Expecting a max-heap.** \`heapq\` always pops the smallest. For "largest first", negate numbers (or, on Python 3.14+, use the \`_max\` functions).
- **Treating the list as sorted.** Only \`h[0]\` is guaranteed. \`h[1]\` is not the second smallest; \`h[-1]\` is not the largest.
- **Tuples whose second field is not comparable.** \`(priority, obj)\` crashes on a tie. Insert a counter: \`(priority, count, obj)\`.
- **\`list.pop(0)\` in a hand-written heap.** It is O(n). Move the last element to the root instead.
- **Calling \`sorted()\` or \`min()\` inside a loop "because it is simpler".** That turns O(log n) per step into O(n log n) or O(n) per step — the whole point of the heap is lost.
- **Using \`queue.PriorityQueue\` in an algorithm question.** It is a thread-safe wrapper with locking overhead; \`heapq\` is the tool.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffffff;">priority queue</strong> gives back the best item first; a <strong style="color:#ffffff;">binary heap</strong> is how we build it: a complete binary tree stored in a list, with every parent ≤ its children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">Node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> has its parent at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i - 1) // 2</code> and children at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*i + 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*i + 2</code>, so no pointers are needed and the height is about log₂ n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operations:</strong> <span style="color:#f0e2c8;">Push = append + sift up; pop = move the last item to the root + sift down. Both O(log n); peek is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[0]</code>, O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Heapify:</strong> <span style="color:#f0e2c8;">Building from n items bottom-up is O(n), not O(n log n), because most nodes are near the leaves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is functions on a plain list and is a <strong style="color:#ffffff;">min-heap</strong>: negate for max, push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(priority, counter, item)</code> to break ties safely.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapify</code> O(n) when each sift down is O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half the nodes are leaves and do nothing, a quarter move at most one level, an eighth at most two. The sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n/4 + 2n/8 + 3n/16 + ...</code> stays below n. In our run on 100,000 descending values heapify used about 200,000 comparisons against about 1.47 million for pushes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a max-heap in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code> and negate on the way out. For tuples, negate the priority field only. Python 3.14 also added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.heappush_max</code> and friends, but negation works everywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change the priority of an item already in the heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> has no decrease-key. Push a new entry with the new priority and keep a dict of the current priority per item; when a popped entry does not match, skip it (lazy deletion). Dijkstra is usually written this way in Python.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap vs sorted list vs balanced BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sorted list makes insert O(n). A balanced BST gives O(log n) for everything and also supports "find any value" and in-order iteration, but it uses node objects. A heap only offers the best item, and in exchange it is a compact list with O(1) peek and O(n) build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq.heappushpop</code> save you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It pushes and pops in one sift instead of two, and if the new item is smaller than the root it returns it straight away without touching the heap. It is exactly the step of the "keep the k largest" pattern.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Priority queue** | An abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item |
| **Binary heap** | The most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children |
| **Min-heap / max-heap** | In a min-heap the smallest item sits at the top (the root); in a max-heap the largest does |
| **Complete binary tree** | A binary tree where every level is full except possibly the last, and the last level is filled from the left |
| **Heap property** | The order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap) |
| **Sift up (bubble up)** | Moving an item towards the root by swapping it with its parent while it is smaller than the parent |
| **Sift down (bubble down, heapify-down)** | Moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger |
| **Heapify (bottom-up heap construction)** | Turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root |
| **Tie-breaker** | An extra, always-distinct field (such as an insertion counter) placed after the priority in a tuple so that two equal priorities never fall through to comparing the payloads |
| **Lazy deletion** | Instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top |

---
**Conclusion:** A priority queue is the promise "give me the best item next"; a binary heap keeps that promise with a complete tree packed into a Python list, where parent ≤ child, the minimum sits at \`h[0]\`, and push and pop each fix one root-to-leaf path in O(log n). Building from scratch with heapify is O(n). In Python you reach for \`heapq\`, remembering that it is a min-heap of functions over a list: negate for a max-heap and add a counter to your tuples so ties never compare the payloads.`,
        examples: [
          {
            label: "A min-heap from scratch: push, sift up, pop, sift down",
            code: `class MinHeap:
    """A binary min-heap stored in a plain Python list."""

    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)                     # 1. add at the end (next free slot)
        i = len(a) - 1
        while i > 0:                    # 2. sift up while smaller than the parent
            parent = (i - 1) // 2
            if a[i] >= a[parent]:
                break
            a[i], a[parent] = a[parent], a[i]
            i = parent

    def pop(self):
        a = self.a
        top = a[0]
        last = a.pop()                  # 1. take the last element off the end
        if a:
            a[0] = last                 # 2. move it to the root
            i, n = 0, len(a)
            while True:                 # 3. sift down: swap with the smaller child
                left, right = 2 * i + 1, 2 * i + 2
                smallest = i
                if left < n and a[left] < a[smallest]:
                    smallest = left
                if right < n and a[right] < a[smallest]:
                    smallest = right
                if smallest == i:
                    break
                a[i], a[smallest] = a[smallest], a[i]
                i = smallest
        return top

    def peek(self):
        return self.a[0]

    def size(self):
        return len(self.a)


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


h = MinHeap()
for x in [5, 3, 8, 1, 9, 2]:
    h.push(x)
    print("push " + str(x) + " -> " + fmt(h.a))
print("peek -> " + str(h.peek()))
print("index 1: parent " + str((1 - 1) // 2) + ", children " + str(2 * 1 + 1) + " and " + str(2 * 1 + 2))
order = []
while h.size() > 0:
    order.append(h.pop())
    print("pop " + str(order[-1]) + " -> " + fmt(h.a))
print("pop order: " + fmt(order))`,
          },
          {
            label: "Heapify vs n pushes (comparisons counted) and the built-in priority queue",
            code: `import heapq


def build_by_pushes(values):
    """Push one value at a time and sift it up. Returns (heap, comparisons)."""
    a, comps = [], 0
    for x in values:
        a.append(x)
        i = len(a) - 1
        while i > 0:
            parent = (i - 1) // 2
            comps += 1
            if a[i] >= a[parent]:
                break
            a[i], a[parent] = a[parent], a[i]
            i = parent
    return a, comps


def heapify(values):
    """Bottom-up heapify: sift down every internal node, last one first."""
    a, comps = list(values), 0
    n = len(a)
    for start in range(n // 2 - 1, -1, -1):
        i = start
        while True:
            left, right, smallest = 2 * i + 1, 2 * i + 2, i
            if left < n:
                comps += 1
                if a[left] < a[smallest]:
                    smallest = left
            if right < n:
                comps += 1
                if a[right] < a[smallest]:
                    smallest = right
            if smallest == i:
                break
            a[i], a[smallest] = a[smallest], a[i]
            i = smallest
    return a, comps


def is_min_heap(a):
    return all(a[(i - 1) // 2] <= a[i] for i in range(1, len(a)))


def random_values(n, seed):
    out = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD, same in every language
        out.append(seed % 1000000)
    return out


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


n = 100000
for name, data in [("random", random_values(n, 42)), ("descending", list(range(n, 0, -1)))]:
    h1, c1 = build_by_pushes(data)
    h2, c2 = heapify(data)
    print(name + " n=" + str(n) + ": pushes " + str(c1) + " comparisons, heapify " + str(c2) + " comparisons")
    print("  both valid heaps: " + str(is_min_heap(h1) and is_min_heap(h2)).lower())

# The standard library priority queue: heapq works on a plain list and is a MIN-heap.
data = [5, 3, 8, 1, 9, 2, 7]
h = list(data)
heapq.heapify(h)
print("priority queue (min) pops: " + fmt([heapq.heappop(h) for _ in range(3)]))
mx = [-x for x in data]          # negate to get max-heap behaviour
heapq.heapify(mx)
print("priority queue (max) pops: " + fmt([-heapq.heappop(mx) for _ in range(3)]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a heap, and what is a priority queue? Explain how a binary heap is laid out, how push and pop work and what they cost. JavaScript has no built-in priority queue, so show me how you would write one in JavaScript."

**What a strong answer should cover:**
- A priority queue is the abstract type (insert, peek best, remove best); a binary heap is the usual implementation: a complete binary tree stored in an array.
- The two rules (complete shape, parent ≤ child) and the index arithmetic: parent \`Math.floor((i - 1) / 2)\`, children 2i + 1 and 2i + 2.
- Push = \`push\` + sift up, pop = move last to root + sift down, both O(log n); peek O(1); bottom-up heapify O(n).
- A heap is only partly sorted: the root is the minimum and popping everything gives heap sort.
- JavaScript specifics: no \`PriorityQueue\` in the language, so write a small class with a comparator \`(a, b) => a - b\`; use \`Array.prototype.pop\` (O(1)), never \`shift\` (O(n)); know that \`[10, 9, 1].sort()\` sorts as strings.

**Code / implementation expected:** Yes — a small heap class with \`push\`, \`pop\` and \`peek\` in JavaScript, ideally taking a comparator.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need JavaScript arrays, loops and classes; no tree knowledge assumed.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the waiting room of a hospital emergency department. Patients do not get seen in the order they walk in. A nurse gives each one a number for how urgent they are, and whenever a doctor becomes free, the **most urgent** patient goes next — even if they arrived five minutes ago and someone with a sprained wrist has been there for two hours. New patients keep arriving all the time, so the nurse cannot just sort the list once and be done.

That waiting room is a **priority queue**: a collection where you can keep adding items, and whenever you ask, you get back the item with the best priority. The nurse needs two things to be fast: "add a patient" and "who is next?". Sorting the whole room after every arrival would be slow. Scanning the whole room every time a doctor is free would also be slow. A **heap** is the clever arrangement that makes both of them cheap — about log₂(n) steps each, which is 17 steps for 100,000 patients.

Heaps show up everywhere in interviews: "the k largest", "the k most frequent", "the k closest", "merge k sorted lists", "the running median", and the shortest-path algorithm Dijkstra all use one. Learn this page well and a whole family of questions becomes the same trick.

## 2. Priority Queue vs Heap — Two Different Words

People often use the two words as if they were the same. They are not, and interviewers like candidates who can say the difference in one sentence.

📌 **Interview term: Priority queue** — an abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item. It says nothing about how it is built.

📌 **Interview term: Binary heap** — the most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children. Insert and remove-best cost O(log n); look-at-best costs O(1).

You could build a priority queue badly with an unsorted list (insert O(1), remove-best O(n)) or with a sorted list (remove-best O(1), insert O(n)). The heap sits in the sweet spot: both are O(log n). A [balanced binary search tree](/interview-question/what-is-a-binary-search-tree-bst) also gives O(log n), but it costs more memory and more pointer chasing; the heap is just an array.

📌 **Interview term: Min-heap / max-heap** — in a min-heap the smallest item sits at the top (the root); in a max-heap the largest does. A max-heap is a min-heap with the comparison flipped.

## 3. The Two Rules of a Heap

A binary heap obeys exactly two rules. Everything else follows from them.

**Rule 1 — the shape rule.** The tree is filled level by level, left to right, with no gaps. Only the last level may be partly filled, and it fills from the left.

📌 **Interview term: Complete binary tree** — a binary tree where every level is full except possibly the last, and the last level is filled from the left. Its height is about log₂(n), which is where the log n cost comes from.

**Rule 2 — the order rule.** Every parent is smaller than or equal to each of its children (in a min-heap). Nothing is promised between siblings or cousins: the heap is only *partly* sorted.

📌 **Interview term: Heap property** — the order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap). It guarantees the root is the minimum, and says nothing else about the order.

Here is the min-heap that our example 1 builds from the pushes 5, 3, 8, 1, 9, 2:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="A min-heap drawn as a tree. Root 1 at index 0, children 3 at index 1 and 2 at index 2, then 5, 9 and 8 at indexes 3, 4 and 5">
  <path class="d-edge" d="M 300 70 L 196 128"/>
  <path class="d-edge" d="M 340 70 L 444 128"/>
  <path class="d-edge" d="M 166 164 L 112 214"/>
  <path class="d-edge" d="M 194 164 L 248 214"/>
  <path class="d-edge" d="M 446 164 L 396 214"/>
  <circle class="d-box-accent" cx="320" cy="50" r="26"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">1</text>
  <text class="d-sub" x="372" y="40" text-anchor="middle">index 0</text>
  <circle class="d-box" cx="180" cy="145" r="26"/>
  <text class="d-text" x="180" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="110" y="140" text-anchor="middle">index 1</text>
  <circle class="d-box" cx="460" cy="145" r="26"/>
  <text class="d-text" x="460" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="530" y="140" text-anchor="middle">index 2</text>
  <circle class="d-box-muted" cx="100" cy="240" r="26"/>
  <text class="d-text" x="100" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="100" y="290" text-anchor="middle">index 3</text>
  <circle class="d-box-muted" cx="260" cy="240" r="26"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">9</text>
  <text class="d-sub" x="260" y="290" text-anchor="middle">index 4</text>
  <circle class="d-box-muted" cx="380" cy="240" r="26"/>
  <text class="d-text" x="380" y="245" text-anchor="middle">8</text>
  <text class="d-sub" x="380" y="290" text-anchor="middle">index 5</text>
</svg>

Every parent is smaller than its children (1 < 3, 1 < 2, 3 < 5, 3 < 9, 2 < 8), so 1 is the minimum. But the heap is not sorted: 8 sits below 2 while 5 and 9 sit below 3.

### Why it fits in a plain array

Because the tree has no gaps, you can number the nodes level by level (0 at the root, then 1 and 2, then 3, 4, 5, ...) and store node number i at array index i. No pointers are needed, because the family links are arithmetic:

| From node i | Index |
| :--- | :--- |
| parent | (i − 1) / 2, rounded down |
| left child | 2i + 1 |
| right child | 2i + 2 |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="The same heap as an array 1, 3, 2, 5, 9, 8. Index 1 holding 3 has children at index 3 and index 4">
  <defs>
    <marker id="b19q1-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="50" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="140" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="180" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="230" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="320" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="410" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="540" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="90" y="24" text-anchor="middle">0</text>
  <text class="d-sub" x="180" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="360" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="24" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 180 96 Q 270 160 352 98" marker-end="url(#b19q1-arr)"/>
  <path class="d-edge-accent" d="M 186 96 Q 320 182 444 98" marker-end="url(#b19q1-arr)"/>
  <text class="d-sub" x="250" y="160" text-anchor="middle">2i + 1</text>
  <text class="d-sub" x="420" y="160" text-anchor="middle">2i + 2</text>
</svg>

Node 3 lives at index 1, so its children are at 2·1 + 1 = 3 (value 5) and 2·1 + 2 = 4 (value 9), and its parent is at (1 − 1) / 2 = 0. Example 1 prints exactly this check.

## 4. The Three Operations

### Peek — O(1)

The best item is always at index 0. Reading it costs nothing.

### Push — add at the end, then sift up

1. Put the new item in the next free slot (the end of the array). The shape rule still holds.
2. The order rule may now be broken between the new item and its parent. If the new item is smaller than its parent, swap them. Repeat from the new position until the parent is smaller or you reach the root.

📌 **Interview term: Sift up (bubble up)** — moving an item towards the root by swapping it with its parent while it is smaller than the parent. At most one swap per level, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Push 2 into the heap 1, 3, 8, 5, 9. It lands at index 5 under 8, is smaller than 8 so they swap, then it is larger than 1 so it stops">
  <defs>
    <marker id="b19q1-up" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">append 2</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">1, 3, 8, 5, 9, 2</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">index 5, parent 8</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">2 below 8: swap</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">1, 3, 2, 5, 9, 8</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">now index 2, parent 1</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">2 above 1: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">heap property holds</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">one swap in total</text>
</svg>

This is the last push of example 1: the printed line is \`push 2 -> [1, 3, 2, 5, 9, 8]\`.

### Pop — move the last item to the root, then sift down

1. Remember the root (that is the answer).
2. Take the **last** item off the end of the array and put it at the root. The shape rule holds again (the array just got one shorter).
3. The new root is probably too big. Compare it with its two children; if the smaller child is smaller than it, swap with that child. Repeat until both children are bigger or you reach a leaf.

📌 **Interview term: Sift down (bubble down, heapify-down)** — moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger. One level per swap, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Pop from 1, 3, 2, 5, 9, 8. Remove 1, move the last item 8 to the root, swap 8 with its smaller child 2, and stop because 8 has no children left">
  <defs>
    <marker id="b19q1-down" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">take 1, move 8 up</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">8, 3, 2, 5, 9</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">children 3 and 2</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">swap with 2</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">2, 3, 8, 5, 9</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">8 is now at index 2</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">no children: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">indexes 5 and 6</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">are past the end</text>
</svg>

Example 1 prints this pop as \`pop 1 -> [2, 3, 8, 5, 9]\`. Why swap with the *smaller* child? Because that child becomes the parent of the other one, and only the smaller of the two can be a valid parent.

Popping everything, one at a time, hands the items back in sorted order — example 1 ends with \`pop order: [1, 2, 3, 5, 8, 9]\`. That is **heap sort** in a nutshell: O(n log n) and, when done inside the array itself, O(1) extra space. See [how common sorting algorithms compare](/interview-question/compare-common-sorting-algorithms).

## 5. Building a Heap From n Items: Heapify Is O(n)

If you already have all n items, you can push them one by one (O(n log n)), or you can use **bottom-up heapify**: treat the array as a tree as it stands, and sift down every parent node, starting from the last parent (index n/2 − 1) and walking back to the root.

📌 **Interview term: Heapify (bottom-up heap construction)** — turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root. It costs O(n), not O(n log n).

Why is it linear? Half of the nodes are leaves and need no work at all. A quarter sit one level up and can move down at most one level, an eighth can move at most two levels, and so on. The sum n/4·1 + n/8·2 + n/16·3 + ... is less than n. Only the single root can travel the full log n levels. Pushing one by one is the opposite: most items are added at the bottom and may climb all the way up.

Example 2 counts the comparisons on 100,000 items. On a descending input (the worst case for pushes, because every new item is the new minimum and climbs to the root) pushes make about 1.47 million comparisons and heapify about 200,000 — about 7 times fewer, and about 2n, as the sum predicts. On random input the gap is small (228k vs 188k), because a random new item usually stops after a step or two. Both methods produce valid heaps, but not necessarily the same array.

## 6. The Code in JavaScript

The ECMAScript standard library has arrays, \`Map\`, \`Set\` and sorting, but **no priority queue**. In an interview you are expected to write one — it is about 40 lines. (The repo also has a JavaScript coding exercise on [a priority queue built on a binary heap](/interview-question/priority-queue-binary-heap).)

### A min-heap of numbers

~~~javascript
// A binary min-heap stored in a plain JavaScript array.
class MinHeap {
  constructor() {
    this.a = [];
  }

  push(x) {
    const a = this.a;
    a.push(x);                          // 1. add at the end (next free slot)
    let i = a.length - 1;
    while (i > 0) {                     // 2. sift up while smaller than the parent
      const parent = Math.floor((i - 1) / 2);
      if (a[i] >= a[parent]) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();               // 1. take the last element off the end
    if (a.length > 0) {
      a[0] = last;                      // 2. move it to the root
      let i = 0;
      const n = a.length;
      while (true) {                    // 3. sift down: swap with the smaller child
        const left = 2 * i + 1, right = 2 * i + 2;
        let smallest = i;
        if (left < n && a[left] < a[smallest]) smallest = left;
        if (right < n && a[right] < a[smallest]) smallest = right;
        if (smallest === i) break;
        [a[i], a[smallest]] = [a[smallest], a[i]];
        i = smallest;
      }
    }
    return top;
  }

  peek() { return this.a[0]; }
  size() { return this.a.length; }
}
~~~

**What to point out in this code:**

- \`Math.floor((i - 1) / 2)\` is the parent index. JavaScript \`/\` always gives a floating-point result, so the floor is required. \`(i - 1) >> 1\` is a common shorter form and gives the same result for any array index you will meet (it works on 32-bit integers).
- \`a.pop()\` removes the **last** element in O(1). Never use \`a.shift()\` to remove the root: it moves every remaining element one slot left, which is O(n).
- \`[a[i], a[parent]] = [a[parent], a[i]]\` swaps with destructuring. It allocates a small temporary array; in a very hot loop a \`const t = a[i]\` swap is slightly faster, but both are correct.
- On an empty heap, \`a[0]\` is \`undefined\` and \`a.pop()\` returns \`undefined\` — no exception is thrown (we checked in Node 22). Decide what your \`pop()\` should do: return \`undefined\`, or throw. Silently getting \`undefined\` into a sum gives \`NaN\` later, far from the bug.

### A general priority queue with a comparator

Real questions push objects or pairs, not bare numbers. Take a comparator in the constructor, exactly like the one \`Array.prototype.sort\` uses: negative means "a comes first".

~~~javascript
// JavaScript has no built-in priority queue, so here is a small one with a comparator.
class PriorityQueue {
  constructor(compare) { this.a = []; this.cmp = compare; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let best = i;
        if (l < a.length && this.cmp(a[l], a[best]) < 0) best = l;
        if (r < a.length && this.cmp(a[r], a[best]) < 0) best = r;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return top;
  }
}
~~~

~~~javascript
const minPq = new PriorityQueue((x, y) => x - y);           // smallest first
const maxPq = new PriorityQueue((x, y) => y - x);           // largest first
const tasks = new PriorityQueue((x, y) => x.due - y.due);   // objects by a field
~~~

📌 **Interview term: Comparator** — a function \`(a, b)\` that returns a negative number if \`a\` should come first, a positive number if \`b\` should, and 0 if they tie. Swapping the arguments turns a min-heap into a max-heap.

Things that trip people up:

- **\`(x, y) => x - y\` needs finite numbers.** \`Infinity - Infinity\` is \`NaN\` (we ran it), and every comparison with \`NaN\` is false, so a sentinel of \`Infinity\` can quietly break the order. For non-numbers or possible infinities, write \`x < y ? -1 : x > y ? 1 : 0\`.
- **Do not sort instead.** \`arr.sort()\` with no comparator sorts as **strings**: \`[10, 9, 1, 2].sort()\` gives \`[1, 10, 2, 9]\` in our run. And re-sorting after every insert costs O(n log n) per insert instead of O(log n).
- **Ties are not stable.** A heap does not keep insertion order between equal priorities. If the order of ties matters, add a counter field and compare it second.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — a min-heap from scratch** prints the array after every push and pop:

~~~text
push 5 -> [5]
push 3 -> [3, 5]
push 8 -> [3, 5, 8]
push 1 -> [1, 3, 8, 5]
push 9 -> [1, 3, 8, 5, 9]
push 2 -> [1, 3, 2, 5, 9, 8]
peek -> 1
index 1: parent 0, children 3 and 4
pop 1 -> [2, 3, 8, 5, 9]
pop 2 -> [3, 5, 8, 9]
pop 3 -> [5, 9, 8]
pop 5 -> [8, 9]
pop 8 -> [9]
pop 9 -> []
pop order: [1, 2, 3, 5, 8, 9]
~~~

**Example 2 — n pushes vs bottom-up heapify, with comparisons counted, then the comparator-based \`PriorityQueue\`** prints:

~~~text
random n=100000: pushes 227688 comparisons, heapify 188071 comparisons
  both valid heaps: true
descending n=100000: pushes 1468946 comparisons, heapify 199978 comparisons
  both valid heaps: true
priority queue (min) pops: [1, 2, 3]
priority queue (max) pops: [9, 8, 7]
~~~

The descending input is where heapify shines: about 1.47 million comparisons for pushes against about 200,000 for heapify. The last two lines are the same \`PriorityQueue\` class with two different comparators.

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`peek()\` | O(1) | the minimum is always at index 0 |
| \`push(x)\` | O(log n) | one sift up, at most one swap per level |
| \`pop()\` | O(log n) | one sift down, at most one swap per level |
| bottom-up heapify | O(n) | most nodes are near the bottom and barely move (example 2) |
| n pushes | O(n log n) | each push may climb to the root |
| pop everything (heap sort) | O(n log n) | n pops of O(log n) |
| find an arbitrary value | O(n) | heap order does not help; scan the array |
| Space | O(n) | one array; no node objects |

## 9. Where You Will Meet Heaps Next

Almost every heap interview question is one of three patterns:

- **Keep the k best items with a heap of size k.** The heap holds the current top k, and its root is the *worst* of them, so one comparison tells you whether a new item gets in. That is [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin).
- **Always take the smallest of several "fronts".** Keep one item per source in the heap and replace it with the next item from the same source: [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [the heap vs divide-and-conquer trade-off for it](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k), the news feed in [design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline), and [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work).
- **Two heaps facing each other.** A max-heap for the smaller half and a min-heap for the larger half give you the middle in O(1): [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream), [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing) and [the sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

## 10. Edge Cases

- **Empty heap** — \`peek()\` and \`pop()\` return \`undefined\` in this implementation; check \`size\` before using the result.
- **Duplicates** — fine: the rule is parent ≤ child, so equal values can sit anywhere.
- **One element** — push and pop do no swaps; \`pop()\` takes the element via \`a.pop()\` and leaves \`a\` empty, which is why the code checks \`a.length > 0\` before writing \`a[0] = last\`.
- **Objects whose key changes after insertion** — the heap does not notice. Push a fresh entry and skip stale ones when they reach the top (lazy deletion), or rebuild.
- **Very large keys** — numbers are 64-bit floats; keys above \`Number.MAX_SAFE_INTEGER\` (2⁵³ − 1) lose precision, so two different keys may compare equal. Use \`BigInt\` keys (and a \`<\`-based comparator) if that can happen.

📌 **Interview term: Lazy deletion** — instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top.

## Common Pitfalls

- **Forgetting \`Math.floor\`.** \`(i - 1) / 2\` is 0.5 for \`i = 2\`; \`a[0.5]\` is \`undefined\`, and the comparison silently fails.
- **Removing the root with \`shift()\`.** O(n) per pop. Move the last element to the root instead.
- **Sorting the whole array per insert, or with the default \`sort()\`.** Slower by a factor of n, and string order for numbers.
- **A comparator that returns a boolean.** \`(a, b) => a > b\` returns \`true\`/\`false\`, which act as 1/0 — never negative — so "a comes first" can never be expressed. With the \`PriorityQueue\` class above, pushing 5, 3, 1 with \`(a, b) => a < b\` popped 5, 1, 3 in our run. Return a number.
- **Overwriting \`a[0]\` before popping the last element on a one-item heap.** Do \`const last = a.pop()\` first, then only write \`a[0] = last\` if the array is still non-empty.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffffff;">priority queue</strong> gives back the best item first; a <strong style="color:#ffffff;">binary heap</strong> is how we build it: a complete binary tree stored in an array, with every parent ≤ its children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">Node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> has its parent at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor((i - 1) / 2)</code> and children at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 2</code>; no pointers, height about log₂ n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operations:</strong> <span style="color:#f0e2c8;">Push = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.push(x)</code> + sift up; pop = move the last item to the root + sift down. Both O(log n); peek is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Heapify:</strong> <span style="color:#f0e2c8;">Building from n items bottom-up is O(n), not O(n log n), because most nodes are near the leaves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;">There is no built-in priority queue, so I write a small class that takes a comparator like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>, and I never use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> for the root.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does JavaScript not have a priority queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The language standard simply does not include one; you either write the 40-line class or use a package. In interviews you write it, and it is worth having one memorised with a comparator so every heap question starts from the same code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is bottom-up heapify O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half the nodes are leaves and do nothing, a quarter move at most one level, an eighth at most two. The sum stays below n. In our run on 100,000 descending values heapify used about 200,000 comparisons against about 1.47 million for pushes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it a max-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the reversed comparator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; b - a</code>. Nothing else in the class changes; that is the point of taking a comparator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap vs sorted array vs balanced BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sorted array makes insert O(n) because of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>. A balanced BST gives O(log n) for everything plus ordered iteration, but JavaScript has none built in and it needs node objects. A heap only offers the best item, and is a compact array with O(1) peek and O(n) build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change the priority of an item already inside?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from item to its index in the array and sift it up or down after the change (an indexed heap), or push a new entry and skip stale ones on pop (lazy deletion). The second is simpler and is how Dijkstra is usually written in interviews.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Priority queue** | An abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item |
| **Binary heap** | The most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children |
| **Min-heap / max-heap** | In a min-heap the smallest item sits at the top (the root); in a max-heap the largest does |
| **Complete binary tree** | A binary tree where every level is full except possibly the last, and the last level is filled from the left |
| **Heap property** | The order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap) |
| **Sift up (bubble up)** | Moving an item towards the root by swapping it with its parent while it is smaller than the parent |
| **Sift down (bubble down, heapify-down)** | Moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger |
| **Heapify (bottom-up heap construction)** | Turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root |
| **Comparator** | A function \`(a, b)\` that returns a negative number if \`a\` should come first, a positive number if \`b\` should, and 0 if they tie |
| **Lazy deletion** | Instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top |

---
**Conclusion:** A priority queue is the promise "give me the best item next"; a binary heap keeps that promise with a complete tree packed into an array, where parent ≤ child, the minimum sits at index 0, and push and pop each fix one root-to-leaf path in O(log n). Building from scratch with heapify is O(n). JavaScript has no built-in priority queue, so the practical skill is writing a small comparator-based class from memory — with \`Math.floor\` for the parent index, \`pop()\` instead of \`shift()\`, and a comparator that returns a number.`,
        examples: [
          {
            label: "A min-heap from scratch: push, sift up, pop, sift down",
            code: `// A binary min-heap stored in a plain JavaScript array.
class MinHeap {
  constructor() {
    this.a = [];
  }

  push(x) {
    const a = this.a;
    a.push(x);                          // 1. add at the end (next free slot)
    let i = a.length - 1;
    while (i > 0) {                     // 2. sift up while smaller than the parent
      const parent = Math.floor((i - 1) / 2);
      if (a[i] >= a[parent]) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();               // 1. take the last element off the end
    if (a.length > 0) {
      a[0] = last;                      // 2. move it to the root
      let i = 0;
      const n = a.length;
      while (true) {                    // 3. sift down: swap with the smaller child
        const left = 2 * i + 1, right = 2 * i + 2;
        let smallest = i;
        if (left < n && a[left] < a[smallest]) smallest = left;
        if (right < n && a[right] < a[smallest]) smallest = right;
        if (smallest === i) break;
        [a[i], a[smallest]] = [a[smallest], a[i]];
        i = smallest;
      }
    }
    return top;
  }

  peek() { return this.a[0]; }
  size() { return this.a.length; }
}

function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

const h = new MinHeap();
for (const x of [5, 3, 8, 1, 9, 2]) {
  h.push(x);
  console.log("push " + x + " -> " + fmt(h.a));
}
console.log("peek -> " + h.peek());
console.log("index 1: parent " + Math.floor((1 - 1) / 2) + ", children " + (2 * 1 + 1) + " and " + (2 * 1 + 2));
const order = [];
while (h.size() > 0) {
  order.push(h.pop());
  console.log("pop " + order[order.length - 1] + " -> " + fmt(h.a));
}
console.log("pop order: " + fmt(order));`,
          },
          {
            label: "Heapify vs n pushes (comparisons counted) and the built-in priority queue",
            code: `function buildByPushes(values) {
  // Push one value at a time and sift it up. Returns [heap, comparisons].
  const a = [];
  let comps = 0;
  for (const x of values) {
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      comps++;
      if (a[i] >= a[parent]) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }
  return [a, comps];
}

function heapify(values) {
  // Bottom-up heapify: sift down every internal node, last one first.
  const a = values.slice();
  const n = a.length;
  let comps = 0;
  for (let start = Math.floor(n / 2) - 1; start >= 0; start--) {
    let i = start;
    while (true) {
      const left = 2 * i + 1, right = 2 * i + 2;
      let smallest = i;
      if (left < n) { comps++; if (a[left] < a[smallest]) smallest = left; }
      if (right < n) { comps++; if (a[right] < a[smallest]) smallest = right; }
      if (smallest === i) break;
      [a[i], a[smallest]] = [a[smallest], a[i]];
      i = smallest;
    }
  }
  return [a, comps];
}

function isMinHeap(a) {
  for (let i = 1; i < a.length; i++) if (a[Math.floor((i - 1) / 2)] > a[i]) return false;
  return true;
}

function randomValues(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // MINSTD, same in every language
    out.push(seed % 1000000);
  }
  return out;
}

// JavaScript has no built-in priority queue, so here is a small one with a comparator.
class PriorityQueue {
  constructor(compare) { this.a = []; this.cmp = compare; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let best = i;
        if (l < a.length && this.cmp(a[l], a[best]) < 0) best = l;
        if (r < a.length && this.cmp(a[r], a[best]) < 0) best = r;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return top;
  }
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const n = 100000;
const descending = [];
for (let v = n; v >= 1; v--) descending.push(v);
for (const [name, data] of [["random", randomValues(n, 42)], ["descending", descending]]) {
  const [h1, c1] = buildByPushes(data);
  const [h2, c2] = heapify(data);
  console.log(name + " n=" + n + ": pushes " + c1 + " comparisons, heapify " + c2 + " comparisons");
  console.log("  both valid heaps: " + (isMinHeap(h1) && isMinHeap(h2)));
}

const data = [5, 3, 8, 1, 9, 2, 7];
const minPq = new PriorityQueue((x, y) => x - y);   // smaller first
const maxPq = new PriorityQueue((x, y) => y - x);   // larger first
for (const x of data) { minPq.push(x); maxPq.push(x); }
console.log("priority queue (min) pops: " + fmt([minPq.pop(), minPq.pop(), minPq.pop()]));
console.log("priority queue (max) pops: " + fmt([maxPq.pop(), maxPq.pop(), maxPq.pop()]));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a heap, and what is a priority queue? Explain how a binary heap is laid out, how push and pop work and what they cost, and show me how you use \`java.util.PriorityQueue\` — including how you would turn it into a max-heap. Code in Java."

**What a strong answer should cover:**
- A priority queue is the abstract type (insert, peek best, remove best); a binary heap is the usual implementation: a complete binary tree stored in an array.
- The two rules (complete shape, parent ≤ child) and the index arithmetic: parent (i − 1) / 2, children 2i + 1 and 2i + 2.
- Push = add at the end + sift up, pop = move last to root + sift down, both O(log n); peek O(1); bottom-up heapify O(n).
- A heap is only partly sorted: the root is the minimum; iterating or printing a \`PriorityQueue\` does not give sorted order.
- Java specifics: \`PriorityQueue\` is a min-heap by natural order; \`Collections.reverseOrder()\` or a \`Comparator\` for a max-heap; \`offer\`/\`poll\` O(log n) but \`remove(Object)\` and \`contains\` O(n); \`poll()\` returns \`null\` when empty; never write a comparator as \`a - b\` (int overflow) — use \`Integer.compare\`.

**Code / implementation expected:** Optional — be ready to write sift up / sift down on an \`int[]\`, and to use \`PriorityQueue\` with a comparator fluently.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Java arrays, loops and generics; no tree knowledge assumed.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the waiting room of a hospital emergency department. Patients do not get seen in the order they walk in. A nurse gives each one a number for how urgent they are, and whenever a doctor becomes free, the **most urgent** patient goes next — even if they arrived five minutes ago and someone with a sprained wrist has been there for two hours. New patients keep arriving all the time, so the nurse cannot just sort the list once and be done.

That waiting room is a **priority queue**: a collection where you can keep adding items, and whenever you ask, you get back the item with the best priority. The nurse needs two things to be fast: "add a patient" and "who is next?". Sorting the whole room after every arrival would be slow. Scanning the whole room every time a doctor is free would also be slow. A **heap** is the clever arrangement that makes both of them cheap — about log₂(n) steps each, which is 17 steps for 100,000 patients.

Heaps show up everywhere in interviews: "the k largest", "the k most frequent", "the k closest", "merge k sorted lists", "the running median", and the shortest-path algorithm Dijkstra all use one. Learn this page well and a whole family of questions becomes the same trick.

## 2. Priority Queue vs Heap — Two Different Words

People often use the two words as if they were the same. They are not, and interviewers like candidates who can say the difference in one sentence.

📌 **Interview term: Priority queue** — an abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item. It says nothing about how it is built.

📌 **Interview term: Binary heap** — the most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children. Insert and remove-best cost O(log n); look-at-best costs O(1).

You could build a priority queue badly with an unsorted list (insert O(1), remove-best O(n)) or with a sorted list (remove-best O(1), insert O(n)). The heap sits in the sweet spot: both are O(log n). A [balanced binary search tree](/interview-question/what-is-a-binary-search-tree-bst) also gives O(log n), but it costs more memory and more pointer chasing; the heap is just an array.

📌 **Interview term: Min-heap / max-heap** — in a min-heap the smallest item sits at the top (the root); in a max-heap the largest does. A max-heap is a min-heap with the comparison flipped.

## 3. The Two Rules of a Heap

A binary heap obeys exactly two rules. Everything else follows from them.

**Rule 1 — the shape rule.** The tree is filled level by level, left to right, with no gaps. Only the last level may be partly filled, and it fills from the left.

📌 **Interview term: Complete binary tree** — a binary tree where every level is full except possibly the last, and the last level is filled from the left. Its height is about log₂(n), which is where the log n cost comes from.

**Rule 2 — the order rule.** Every parent is smaller than or equal to each of its children (in a min-heap). Nothing is promised between siblings or cousins: the heap is only *partly* sorted.

📌 **Interview term: Heap property** — the order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap). It guarantees the root is the minimum, and says nothing else about the order.

Here is the min-heap that our example 1 builds from the pushes 5, 3, 8, 1, 9, 2:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="A min-heap drawn as a tree. Root 1 at index 0, children 3 at index 1 and 2 at index 2, then 5, 9 and 8 at indexes 3, 4 and 5">
  <path class="d-edge" d="M 300 70 L 196 128"/>
  <path class="d-edge" d="M 340 70 L 444 128"/>
  <path class="d-edge" d="M 166 164 L 112 214"/>
  <path class="d-edge" d="M 194 164 L 248 214"/>
  <path class="d-edge" d="M 446 164 L 396 214"/>
  <circle class="d-box-accent" cx="320" cy="50" r="26"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">1</text>
  <text class="d-sub" x="372" y="40" text-anchor="middle">index 0</text>
  <circle class="d-box" cx="180" cy="145" r="26"/>
  <text class="d-text" x="180" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="110" y="140" text-anchor="middle">index 1</text>
  <circle class="d-box" cx="460" cy="145" r="26"/>
  <text class="d-text" x="460" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="530" y="140" text-anchor="middle">index 2</text>
  <circle class="d-box-muted" cx="100" cy="240" r="26"/>
  <text class="d-text" x="100" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="100" y="290" text-anchor="middle">index 3</text>
  <circle class="d-box-muted" cx="260" cy="240" r="26"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">9</text>
  <text class="d-sub" x="260" y="290" text-anchor="middle">index 4</text>
  <circle class="d-box-muted" cx="380" cy="240" r="26"/>
  <text class="d-text" x="380" y="245" text-anchor="middle">8</text>
  <text class="d-sub" x="380" y="290" text-anchor="middle">index 5</text>
</svg>

Every parent is smaller than its children (1 < 3, 1 < 2, 3 < 5, 3 < 9, 2 < 8), so 1 is the minimum. But the heap is not sorted: 8 sits below 2 while 5 and 9 sit below 3.

### Why it fits in a plain array

Because the tree has no gaps, you can number the nodes level by level (0 at the root, then 1 and 2, then 3, 4, 5, ...) and store node number i at array index i. No pointers are needed, because the family links are arithmetic:

| From node i | Index |
| :--- | :--- |
| parent | (i − 1) / 2, rounded down |
| left child | 2i + 1 |
| right child | 2i + 2 |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="The same heap as an array 1, 3, 2, 5, 9, 8. Index 1 holding 3 has children at index 3 and index 4">
  <defs>
    <marker id="b19q1-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="50" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="140" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="180" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="230" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="320" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="410" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="540" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="90" y="24" text-anchor="middle">0</text>
  <text class="d-sub" x="180" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="360" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="24" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 180 96 Q 270 160 352 98" marker-end="url(#b19q1-arr)"/>
  <path class="d-edge-accent" d="M 186 96 Q 320 182 444 98" marker-end="url(#b19q1-arr)"/>
  <text class="d-sub" x="250" y="160" text-anchor="middle">2i + 1</text>
  <text class="d-sub" x="420" y="160" text-anchor="middle">2i + 2</text>
</svg>

Node 3 lives at index 1, so its children are at 2·1 + 1 = 3 (value 5) and 2·1 + 2 = 4 (value 9), and its parent is at (1 − 1) / 2 = 0. Example 1 prints exactly this check.

## 4. The Three Operations

### Peek — O(1)

The best item is always at index 0. Reading it costs nothing.

### Push — add at the end, then sift up

1. Put the new item in the next free slot (the end of the array). The shape rule still holds.
2. The order rule may now be broken between the new item and its parent. If the new item is smaller than its parent, swap them. Repeat from the new position until the parent is smaller or you reach the root.

📌 **Interview term: Sift up (bubble up)** — moving an item towards the root by swapping it with its parent while it is smaller than the parent. At most one swap per level, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Push 2 into the heap 1, 3, 8, 5, 9. It lands at index 5 under 8, is smaller than 8 so they swap, then it is larger than 1 so it stops">
  <defs>
    <marker id="b19q1-up" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">append 2</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">1, 3, 8, 5, 9, 2</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">index 5, parent 8</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">2 below 8: swap</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">1, 3, 2, 5, 9, 8</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">now index 2, parent 1</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">2 above 1: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">heap property holds</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">one swap in total</text>
</svg>

This is the last push of example 1: the printed line is \`push 2 -> [1, 3, 2, 5, 9, 8]\`.

### Pop — move the last item to the root, then sift down

1. Remember the root (that is the answer).
2. Take the **last** item off the end of the array and put it at the root. The shape rule holds again (the array just got one shorter).
3. The new root is probably too big. Compare it with its two children; if the smaller child is smaller than it, swap with that child. Repeat until both children are bigger or you reach a leaf.

📌 **Interview term: Sift down (bubble down, heapify-down)** — moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger. One level per swap, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Pop from 1, 3, 2, 5, 9, 8. Remove 1, move the last item 8 to the root, swap 8 with its smaller child 2, and stop because 8 has no children left">
  <defs>
    <marker id="b19q1-down" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">take 1, move 8 up</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">8, 3, 2, 5, 9</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">children 3 and 2</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">swap with 2</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">2, 3, 8, 5, 9</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">8 is now at index 2</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">no children: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">indexes 5 and 6</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">are past the end</text>
</svg>

Example 1 prints this pop as \`pop 1 -> [2, 3, 8, 5, 9]\`. Why swap with the *smaller* child? Because that child becomes the parent of the other one, and only the smaller of the two can be a valid parent.

Popping everything, one at a time, hands the items back in sorted order — example 1 ends with \`pop order: [1, 2, 3, 5, 8, 9]\`. That is **heap sort** in a nutshell: O(n log n) and, when done inside the array itself, O(1) extra space. See [how common sorting algorithms compare](/interview-question/compare-common-sorting-algorithms).

## 5. Building a Heap From n Items: Heapify Is O(n)

If you already have all n items, you can push them one by one (O(n log n)), or you can use **bottom-up heapify**: treat the array as a tree as it stands, and sift down every parent node, starting from the last parent (index n/2 − 1) and walking back to the root.

📌 **Interview term: Heapify (bottom-up heap construction)** — turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root. It costs O(n), not O(n log n).

Why is it linear? Half of the nodes are leaves and need no work at all. A quarter sit one level up and can move down at most one level, an eighth can move at most two levels, and so on. The sum n/4·1 + n/8·2 + n/16·3 + ... is less than n. Only the single root can travel the full log n levels. Pushing one by one is the opposite: most items are added at the bottom and may climb all the way up.

Example 2 counts the comparisons on 100,000 items. On a descending input (the worst case for pushes, because every new item is the new minimum and climbs to the root) pushes make about 1.47 million comparisons and heapify about 200,000 — about 7 times fewer, and about 2n, as the sum predicts. On random input the gap is small (228k vs 188k), because a random new item usually stops after a step or two. Both methods produce valid heaps, but not necessarily the same array.

## 6. The Code in Java

### A heap from scratch

Interviewers sometimes say "do not use the library". Here is the whole thing on an \`ArrayList<Integer>\`; the list *is* the tree.

~~~java
// A binary min-heap stored in an ArrayList<Integer>.
static class MinHeap {
    final List<Integer> a = new ArrayList<>();

    void push(int x) {
        a.add(x);                              // 1. add at the end (next free slot)
        int i = a.size() - 1;
        while (i > 0) {                        // 2. sift up while smaller than the parent
            int parent = (i - 1) / 2;
            if (a.get(i) >= a.get(parent)) break;
            swap(i, parent);
            i = parent;
        }
    }

    int pop() {
        int top = a.get(0);
        int last = a.remove(a.size() - 1);     // 1. take the last element off the end
        if (!a.isEmpty()) {
            a.set(0, last);                    // 2. move it to the root
            int i = 0, n = a.size();
            while (true) {                     // 3. sift down: swap with the smaller child
                int left = 2 * i + 1, right = 2 * i + 2, smallest = i;
                if (left < n && a.get(left) < a.get(smallest)) smallest = left;
                if (right < n && a.get(right) < a.get(smallest)) smallest = right;
                if (smallest == i) break;
                swap(i, smallest);
                i = smallest;
            }
        }
        return top;
    }

    int peek() { return a.get(0); }
    int size() { return a.size(); }

    void swap(int i, int j) {
        Integer t = a.get(i);
        a.set(i, a.get(j));
        a.set(j, t);
    }
}
~~~

**What to point out in this code:**

- \`(i - 1) / 2\` is integer division in Java, which truncates. For \`i ≥ 1\` it is the same as rounding down, so it gives the parent index directly.
- \`a.remove(a.size() - 1)\` removes the **last** element in O(1). Removing index 0 of an \`ArrayList\` shifts every element and costs O(n).
- \`a.remove(int index)\` and \`a.remove(Object o)\` are two different overloads. With a \`List<Integer>\`, \`a.remove(a.size() - 1)\` passes an \`int\`, so it removes by index — which is what we want.
- Example 2 uses a raw \`int[]\` instead. That avoids boxing every value into an \`Integer\` object, which matters when a heap holds millions of items.

### The standard library: \`java.util.PriorityQueue\`

~~~java
PriorityQueue<Integer> minPq = new PriorityQueue<>();                          // smallest first
PriorityQueue<Integer> maxPq = new PriorityQueue<>(Collections.reverseOrder()); // largest first
PriorityQueue<int[]> byFirst = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));

minPq.offer(5);              // insert, O(log n)  (add() does the same)
int smallest = minPq.peek(); // look, O(1); null when empty
int x = minPq.poll();        // remove the smallest, O(log n); null when empty
~~~

The [\`PriorityQueue\` Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html) states the costs as an implementation note: O(log n) for \`offer\`, \`poll\`, \`remove()\` and \`add\`; linear time for \`remove(Object)\` and \`contains(Object)\`; constant time for \`peek\`, \`element\` and \`size\`.

Things that trip people up:

- **It is a min-heap.** "Natural order" for \`Integer\` is ascending, so \`poll()\` returns the smallest. Pass \`Collections.reverseOrder()\` (or \`(a, b) -> Integer.compare(b, a)\`) for a max-heap; example 2 does both.
- **Printing or iterating is not sorted.** After offering 5, 3, 8, 1, 9, 2, \`System.out.println(pq)\` printed \`[1, 3, 2, 5, 9, 8]\` in our run: the internal array, in heap order. Only repeated \`poll()\` gives sorted order.
- **Never write \`(a, b) -> a - b\`.** The subtraction can overflow. With the values 1, \`Integer.MIN_VALUE\` and \`Integer.MAX_VALUE\`, a queue built with \`(x, y) -> x - y\` polled \`1 2147483647 -2147483648\` in our run — completely wrong — while \`Integer.compare\` polled \`-2147483648 1 2147483647\`.

📌 **Interview term: Comparator overflow** — the bug where a comparator computed as \`a - b\` on \`int\`s wraps around for values far apart, returns the wrong sign, and silently mis-orders the heap. \`Integer.compare(a, b)\` never overflows.

- **\`peek()\`/\`poll()\` return \`null\` when empty; \`element()\`/\`remove()\` throw.** Our run printed \`null null\` for \`poll()\` and \`peek()\` on an empty queue, and \`remove()\` threw \`java.util.NoSuchElementException\`. Unboxing that \`null\` into an \`int\` throws \`NullPointerException\`.
- **Comparing two \`Integer\`s with \`==\`.** \`a.peek() == b.peek()\` compares object references. In our run it was \`true\` for 100 and \`false\` for 1000, because Java caches small \`Integer\` objects (−128 to 127 by default). Use \`.equals\` or unbox to \`int\` first.

📌 **Interview term: Autoboxing** — Java automatically wraps an \`int\` into an \`Integer\` object (and back) when you put it into a collection. It costs an allocation per value and makes \`==\` compare references instead of values.

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — a min-heap from scratch** prints the array after every push and pop:

~~~text
push 5 -> [5]
push 3 -> [3, 5]
push 8 -> [3, 5, 8]
push 1 -> [1, 3, 8, 5]
push 9 -> [1, 3, 8, 5, 9]
push 2 -> [1, 3, 2, 5, 9, 8]
peek -> 1
index 1: parent 0, children 3 and 4
pop 1 -> [2, 3, 8, 5, 9]
pop 2 -> [3, 5, 8, 9]
pop 3 -> [5, 9, 8]
pop 5 -> [8, 9]
pop 8 -> [9]
pop 9 -> []
pop order: [1, 2, 3, 5, 8, 9]
~~~

**Example 2 — n pushes vs bottom-up heapify, with comparisons counted, then \`PriorityQueue\`** prints:

~~~text
random n=100000: pushes 227688 comparisons, heapify 188071 comparisons
  both valid heaps: true
descending n=100000: pushes 1468946 comparisons, heapify 199978 comparisons
  both valid heaps: true
priority queue (min) pops: [1, 2, 3]
priority queue (max) pops: [9, 8, 7]
~~~

The descending input is where heapify shines: about 1.47 million comparisons for pushes against about 200,000 for heapify. The last two lines are \`PriorityQueue\` with natural order and with \`Collections.reverseOrder()\`.

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`peek()\` | O(1) | the minimum is always at index 0 |
| \`offer(x)\` / \`add(x)\` | O(log n) | one sift up, at most one swap per level |
| \`poll()\` / \`remove()\` | O(log n) | one sift down, at most one swap per level |
| \`remove(Object)\` / \`contains(Object)\` | O(n) | the heap order does not help; it scans the array |
| bottom-up heapify | O(n) | most nodes are near the bottom and barely move (example 2) |
| n \`offer\` calls | O(n log n) | each one may climb to the root |
| Space | O(n) | one backing array, plus one \`Integer\` object per boxed value |

## 9. Where You Will Meet Heaps Next

Almost every heap interview question is one of three patterns:

- **Keep the k best items with a heap of size k.** The heap holds the current top k, and its root is the *worst* of them, so one comparison tells you whether a new item gets in. That is [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin).
- **Always take the smallest of several "fronts".** Keep one item per source in the heap and replace it with the next item from the same source: [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [the heap vs divide-and-conquer trade-off for it](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k), the news feed in [design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline), and [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work).
- **Two heaps facing each other.** A max-heap for the smaller half and a min-heap for the larger half give you the middle in O(1): [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream), [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing) and [the sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

## 10. Edge Cases

- **Empty heap** — \`poll()\`/\`peek()\` return \`null\`; \`int x = pq.poll()\` then throws \`NullPointerException\` on unboxing. Check \`isEmpty()\` first.
- **Duplicates** — fine: the rule is parent ≤ child, so equal values can sit anywhere.
- **Extreme values** — \`Integer.MIN_VALUE\` and \`Integer.MAX_VALUE\` together break any \`a - b\` comparator (see above).
- **Objects whose key changes after insertion** — \`PriorityQueue\` does not notice and the heap is silently corrupted. Remove and re-add (O(n) because of \`remove(Object)\`), or push a new entry and skip stale ones (lazy deletion).
- **\`null\` elements** — \`PriorityQueue\` does not permit them; \`offer(null)\` throws \`NullPointerException\`.

📌 **Interview term: Lazy deletion** — instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top.

## Common Pitfalls

- **Assuming \`PriorityQueue\` is a max-heap.** It pops the smallest by default.
- **\`(a, b) -> a - b\` comparators.** Overflow gives wrong orders on extreme values; use \`Integer.compare\` or \`Comparator.comparingInt\`.
- **Printing the queue to "see the order".** \`toString()\` and the iterator show the internal array, not sorted order.
- **\`pq.remove(x)\` inside a loop.** Each call is O(n); a loop of them is O(n²). Use lazy deletion.
- **\`==\` on boxed \`Integer\`s** pulled from the queue. It works for small numbers and fails for large ones.
- **Mutating a field that the comparator reads** while the object is inside the queue.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffffff;">priority queue</strong> gives back the best item first; a <strong style="color:#ffffff;">binary heap</strong> is how we build it: a complete binary tree stored in an array, with every parent ≤ its children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">Node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> has its parent at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i - 1) / 2</code> and children at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 2</code>, so no pointers are needed and the height is about log₂ n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operations:</strong> <span style="color:#f0e2c8;">Offer = add at the end + sift up; poll = move the last item to the root + sift down. Both O(log n); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> is O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Heapify:</strong> <span style="color:#f0e2c8;">Building from n items bottom-up is O(n), not O(n log n), because most nodes are near the leaves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> is a <strong style="color:#ffffff;">min-heap</strong>; for a max-heap I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code>, and I write comparators with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a - b</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is bottom-up heapify O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half the nodes are leaves and do nothing, a quarter move at most one level, an eighth at most two; the sum stays below n. In our run on 100,000 descending values heapify used about 200,000 comparisons against about 1.47 million for 100,000 offers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(a, b) -&gt; a - b</code> a bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> subtraction overflows when the values are far apart. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code>, 1 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> our queue polled them as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 2147483647 -2147483648</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(a, b)</code> returns the right sign for every pair.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">remove(Object)</code> cost and how do you avoid it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n), because it scans the backing array to find the object. Avoid it with lazy deletion: push the updated entry and skip entries that are stale when they are polled. That is how Dijkstra is usually written with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> / <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeSet</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A red-black tree gives O(log n) insert, delete of any key, floor/ceiling and sorted iteration, but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeSet</code> drops duplicates and every entry is a node object. A heap only offers the best item, and in exchange it is one array with O(1) peek and O(n) build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new PriorityQueue&lt;&gt;(collection)</code> push the items one by one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in our run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new PriorityQueue&lt;&gt;(List.of(6, 5, 4, 3, 2, 1))</code> printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 4, 3, 5, 6]</code>, which is exactly the bottom-up heapify result, while six <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> calls printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 2, 6, 4, 5]</code>. So prefer the constructor when you already have all the items.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Priority queue** | An abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item |
| **Binary heap** | The most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children |
| **Min-heap / max-heap** | In a min-heap the smallest item sits at the top (the root); in a max-heap the largest does |
| **Complete binary tree** | A binary tree where every level is full except possibly the last, and the last level is filled from the left |
| **Heap property** | The order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap) |
| **Sift up (bubble up)** | Moving an item towards the root by swapping it with its parent while it is smaller than the parent |
| **Sift down (bubble down, heapify-down)** | Moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger |
| **Heapify (bottom-up heap construction)** | Turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root |
| **Comparator overflow** | The bug where a comparator computed as \`a - b\` on \`int\`s wraps around for values far apart, returns the wrong sign, and silently mis-orders the heap. \`Integer.compare(a, b)\` never overflows |
| **Autoboxing** | Java automatically wraps an \`int\` into an \`Integer\` object (and back) when you put it into a collection |
| **Lazy deletion** | Instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top |

---
**Conclusion:** A priority queue is the promise "give me the best item next"; a binary heap keeps that promise with a complete tree packed into an array, where parent ≤ child, the minimum sits at index 0, and offer and poll each fix one root-to-leaf path in O(log n). Building with heapify is O(n). In Java you use \`PriorityQueue\`, remembering that it is a min-heap, that its printed form is not sorted, that \`remove(Object)\` is linear, and that comparators must use \`Integer.compare\` rather than subtraction.`,
        examples: [
          {
            label: "A min-heap from scratch: push, sift up, pop, sift down",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    // A binary min-heap stored in an ArrayList<Integer>.
    static class MinHeap {
        final List<Integer> a = new ArrayList<>();

        void push(int x) {
            a.add(x);                              // 1. add at the end (next free slot)
            int i = a.size() - 1;
            while (i > 0) {                        // 2. sift up while smaller than the parent
                int parent = (i - 1) / 2;
                if (a.get(i) >= a.get(parent)) break;
                swap(i, parent);
                i = parent;
            }
        }

        int pop() {
            int top = a.get(0);
            int last = a.remove(a.size() - 1);     // 1. take the last element off the end
            if (!a.isEmpty()) {
                a.set(0, last);                    // 2. move it to the root
                int i = 0, n = a.size();
                while (true) {                     // 3. sift down: swap with the smaller child
                    int left = 2 * i + 1, right = 2 * i + 2, smallest = i;
                    if (left < n && a.get(left) < a.get(smallest)) smallest = left;
                    if (right < n && a.get(right) < a.get(smallest)) smallest = right;
                    if (smallest == i) break;
                    swap(i, smallest);
                    i = smallest;
                }
            }
            return top;
        }

        int peek() { return a.get(0); }
        int size() { return a.size(); }

        void swap(int i, int j) {
            Integer t = a.get(i);
            a.set(i, a.get(j));
            a.set(j, t);
        }
    }

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs.get(i));
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        MinHeap h = new MinHeap();
        for (int x : new int[] {5, 3, 8, 1, 9, 2}) {
            h.push(x);
            System.out.println("push " + x + " -> " + fmt(h.a));
        }
        System.out.println("peek -> " + h.peek());
        System.out.println("index 1: parent " + (1 - 1) / 2 + ", children " + (2 * 1 + 1) + " and " + (2 * 1 + 2));
        List<Integer> order = new ArrayList<>();
        while (h.size() > 0) {
            order.add(h.pop());
            System.out.println("pop " + order.get(order.size() - 1) + " -> " + fmt(h.a));
        }
        System.out.println("pop order: " + fmt(order));
    }
}`,
          },
          {
            label: "Heapify vs n pushes (comparisons counted) and the built-in priority queue",
            code: `import java.util.Collections;
import java.util.PriorityQueue;

public class Main {
    static long comps;

    // Push one value at a time and sift it up.
    static int[] buildByPushes(int[] values) {
        int[] a = new int[values.length];
        int size = 0;
        comps = 0;
        for (int x : values) {
            a[size] = x;
            int i = size++;
            while (i > 0) {
                int parent = (i - 1) / 2;
                comps++;
                if (a[i] >= a[parent]) break;
                int t = a[i]; a[i] = a[parent]; a[parent] = t;
                i = parent;
            }
        }
        return a;
    }

    // Bottom-up heapify: sift down every internal node, last one first.
    static int[] heapify(int[] values) {
        int[] a = values.clone();
        int n = a.length;
        comps = 0;
        for (int start = n / 2 - 1; start >= 0; start--) {
            int i = start;
            while (true) {
                int left = 2 * i + 1, right = 2 * i + 2, smallest = i;
                if (left < n) { comps++; if (a[left] < a[smallest]) smallest = left; }
                if (right < n) { comps++; if (a[right] < a[smallest]) smallest = right; }
                if (smallest == i) break;
                int t = a[i]; a[i] = a[smallest]; a[smallest] = t;
                i = smallest;
            }
        }
        return a;
    }

    static boolean isMinHeap(int[] a) {
        for (int i = 1; i < a.length; i++) if (a[(i - 1) / 2] > a[i]) return false;
        return true;
    }

    static int[] randomValues(int n, long seed) {
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647L; // MINSTD, same in every language
            out[i] = (int) (seed % 1000000);
        }
        return out;
    }

    public static void main(String[] args) {
        int n = 100000;
        int[] descending = new int[n];
        for (int i = 0; i < n; i++) descending[i] = n - i;
        String[] names = {"random", "descending"};
        int[][] inputs = {randomValues(n, 42), descending};
        for (int k = 0; k < 2; k++) {
            int[] h1 = buildByPushes(inputs[k]);
            long c1 = comps;
            int[] h2 = heapify(inputs[k]);
            long c2 = comps;
            System.out.println(names[k] + " n=" + n + ": pushes " + c1 + " comparisons, heapify " + c2 + " comparisons");
            System.out.println("  both valid heaps: " + (isMinHeap(h1) && isMinHeap(h2)));
        }

        // java.util.PriorityQueue is a MIN-heap by natural order.
        int[] data = {5, 3, 8, 1, 9, 2, 7};
        PriorityQueue<Integer> minPq = new PriorityQueue<>();
        PriorityQueue<Integer> maxPq = new PriorityQueue<>(Collections.reverseOrder());
        for (int x : data) { minPq.offer(x); maxPq.offer(x); }
        System.out.println("priority queue (min) pops: [" + minPq.poll() + ", " + minPq.poll() + ", " + minPq.poll() + "]");
        System.out.println("priority queue (max) pops: [" + maxPq.poll() + ", " + maxPq.poll() + ", " + maxPq.poll() + "]");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a heap, and what is a priority queue? Explain how a binary heap is laid out, how push and pop work and what they cost, and show me how you use \`std::priority_queue\` in C++ — including how you get a min-heap out of it."

**What a strong answer should cover:**
- A priority queue is the abstract type (insert, peek best, remove best); a binary heap is the usual implementation: a complete binary tree stored in a contiguous array (\`std::vector\`).
- The two rules (complete shape, parent ≤ child for a min-heap) and the index arithmetic: parent (i − 1) / 2, children 2i + 1 and 2i + 2.
- Push = \`push_back\` + sift up, pop = move last to root + sift down, both O(log n); peek O(1); bottom-up heapify O(n).
- A heap is only partly sorted: the root is the best item, siblings are in no order.
- C++ specifics: \`std::priority_queue\` is a **max-heap** by default (\`std::less\`); use \`std::greater<T>\` or a custom comparator for a min-heap; \`top()\` reads and \`pop()\` returns \`void\`; \`top()\`/\`pop()\` on an empty queue is undefined behaviour; the \`<algorithm>\` functions \`make_heap\`, \`push_heap\`, \`pop_heap\` work on any vector.

**Code / implementation expected:** Optional — be ready to write sift up / sift down on a \`std::vector<int>\`, and to declare a min-heap \`priority_queue\` with a comparator.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need \`std::vector\`, loops and a little template syntax; no tree knowledge assumed.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the waiting room of a hospital emergency department. Patients do not get seen in the order they walk in. A nurse gives each one a number for how urgent they are, and whenever a doctor becomes free, the **most urgent** patient goes next — even if they arrived five minutes ago and someone with a sprained wrist has been there for two hours. New patients keep arriving all the time, so the nurse cannot just sort the list once and be done.

That waiting room is a **priority queue**: a collection where you can keep adding items, and whenever you ask, you get back the item with the best priority. The nurse needs two things to be fast: "add a patient" and "who is next?". Sorting the whole room after every arrival would be slow. Scanning the whole room every time a doctor is free would also be slow. A **heap** is the clever arrangement that makes both of them cheap — about log₂(n) steps each, which is 17 steps for 100,000 patients.

Heaps show up everywhere in interviews: "the k largest", "the k most frequent", "the k closest", "merge k sorted lists", "the running median", and the shortest-path algorithm Dijkstra all use one. Learn this page well and a whole family of questions becomes the same trick.

## 2. Priority Queue vs Heap — Two Different Words

People often use the two words as if they were the same. They are not, and interviewers like candidates who can say the difference in one sentence.

📌 **Interview term: Priority queue** — an abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item. It says nothing about how it is built.

📌 **Interview term: Binary heap** — the most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children. Insert and remove-best cost O(log n); look-at-best costs O(1).

You could build a priority queue badly with an unsorted list (insert O(1), remove-best O(n)) or with a sorted list (remove-best O(1), insert O(n)). The heap sits in the sweet spot: both are O(log n). A [balanced binary search tree](/interview-question/what-is-a-binary-search-tree-bst) also gives O(log n), but it costs more memory and more pointer chasing; the heap is just an array.

📌 **Interview term: Min-heap / max-heap** — in a min-heap the smallest item sits at the top (the root); in a max-heap the largest does. A max-heap is a min-heap with the comparison flipped.

## 3. The Two Rules of a Heap

A binary heap obeys exactly two rules. Everything else follows from them.

**Rule 1 — the shape rule.** The tree is filled level by level, left to right, with no gaps. Only the last level may be partly filled, and it fills from the left.

📌 **Interview term: Complete binary tree** — a binary tree where every level is full except possibly the last, and the last level is filled from the left. Its height is about log₂(n), which is where the log n cost comes from.

**Rule 2 — the order rule.** Every parent is smaller than or equal to each of its children (in a min-heap). Nothing is promised between siblings or cousins: the heap is only *partly* sorted.

📌 **Interview term: Heap property** — the order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap). It guarantees the root is the minimum, and says nothing else about the order.

Here is the min-heap that our example 1 builds from the pushes 5, 3, 8, 1, 9, 2:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="A min-heap drawn as a tree. Root 1 at index 0, children 3 at index 1 and 2 at index 2, then 5, 9 and 8 at indexes 3, 4 and 5">
  <path class="d-edge" d="M 300 70 L 196 128"/>
  <path class="d-edge" d="M 340 70 L 444 128"/>
  <path class="d-edge" d="M 166 164 L 112 214"/>
  <path class="d-edge" d="M 194 164 L 248 214"/>
  <path class="d-edge" d="M 446 164 L 396 214"/>
  <circle class="d-box-accent" cx="320" cy="50" r="26"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">1</text>
  <text class="d-sub" x="372" y="40" text-anchor="middle">index 0</text>
  <circle class="d-box" cx="180" cy="145" r="26"/>
  <text class="d-text" x="180" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="110" y="140" text-anchor="middle">index 1</text>
  <circle class="d-box" cx="460" cy="145" r="26"/>
  <text class="d-text" x="460" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="530" y="140" text-anchor="middle">index 2</text>
  <circle class="d-box-muted" cx="100" cy="240" r="26"/>
  <text class="d-text" x="100" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="100" y="290" text-anchor="middle">index 3</text>
  <circle class="d-box-muted" cx="260" cy="240" r="26"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">9</text>
  <text class="d-sub" x="260" y="290" text-anchor="middle">index 4</text>
  <circle class="d-box-muted" cx="380" cy="240" r="26"/>
  <text class="d-text" x="380" y="245" text-anchor="middle">8</text>
  <text class="d-sub" x="380" y="290" text-anchor="middle">index 5</text>
</svg>

Every parent is smaller than its children (1 < 3, 1 < 2, 3 < 5, 3 < 9, 2 < 8), so 1 is the minimum. But the heap is not sorted: 8 sits below 2 while 5 and 9 sit below 3.

### Why it fits in a plain array

Because the tree has no gaps, you can number the nodes level by level (0 at the root, then 1 and 2, then 3, 4, 5, ...) and store node number i at array index i. No pointers are needed, because the family links are arithmetic:

| From node i | Index |
| :--- | :--- |
| parent | (i − 1) / 2, rounded down |
| left child | 2i + 1 |
| right child | 2i + 2 |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="The same heap as an array 1, 3, 2, 5, 9, 8. Index 1 holding 3 has children at index 3 and index 4">
  <defs>
    <marker id="b19q1-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="50" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="140" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="180" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="230" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="320" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="410" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="500" y="40" width="80" height="50" rx="6"/>
  <text class="d-text" x="540" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="90" y="24" text-anchor="middle">0</text>
  <text class="d-sub" x="180" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="360" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="24" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 180 96 Q 270 160 352 98" marker-end="url(#b19q1-arr)"/>
  <path class="d-edge-accent" d="M 186 96 Q 320 182 444 98" marker-end="url(#b19q1-arr)"/>
  <text class="d-sub" x="250" y="160" text-anchor="middle">2i + 1</text>
  <text class="d-sub" x="420" y="160" text-anchor="middle">2i + 2</text>
</svg>

Node 3 lives at index 1, so its children are at 2·1 + 1 = 3 (value 5) and 2·1 + 2 = 4 (value 9), and its parent is at (1 − 1) / 2 = 0. Example 1 prints exactly this check.

## 4. The Three Operations

### Peek — O(1)

The best item is always at index 0. Reading it costs nothing.

### Push — add at the end, then sift up

1. Put the new item in the next free slot (the end of the array). The shape rule still holds.
2. The order rule may now be broken between the new item and its parent. If the new item is smaller than its parent, swap them. Repeat from the new position until the parent is smaller or you reach the root.

📌 **Interview term: Sift up (bubble up)** — moving an item towards the root by swapping it with its parent while it is smaller than the parent. At most one swap per level, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Push 2 into the heap 1, 3, 8, 5, 9. It lands at index 5 under 8, is smaller than 8 so they swap, then it is larger than 1 so it stops">
  <defs>
    <marker id="b19q1-up" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">append 2</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">1, 3, 8, 5, 9, 2</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">index 5, parent 8</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">2 below 8: swap</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">1, 3, 2, 5, 9, 8</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">now index 2, parent 1</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-up)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">2 above 1: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">heap property holds</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">one swap in total</text>
</svg>

This is the last push of example 1: the printed line is \`push 2 -> [1, 3, 2, 5, 9, 8]\`.

### Pop — move the last item to the root, then sift down

1. Remember the root (that is the answer).
2. Take the **last** item off the end of the array and put it at the root. The shape rule holds again (the array just got one shorter).
3. The new root is probably too big. Compare it with its two children; if the smaller child is smaller than it, swap with that child. Repeat until both children are bigger or you reach a leaf.

📌 **Interview term: Sift down (bubble down, heapify-down)** — moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger. One level per swap, so O(log n).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Pop from 1, 3, 2, 5, 9, 8. Remove 1, move the last item 8 to the root, swap 8 with its smaller child 2, and stop because 8 has no children left">
  <defs>
    <marker id="b19q1-down" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="92" text-anchor="middle">take 1, move 8 up</text>
  <text class="d-sub" x="105" y="116" text-anchor="middle">8, 3, 2, 5, 9</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">children 3 and 2</text>
  <path class="d-edge" d="M 194 105 L 240 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-accent" x="246" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="331" y="92" text-anchor="middle">swap with 2</text>
  <text class="d-sub" x="331" y="116" text-anchor="middle">2, 3, 8, 5, 9</text>
  <text class="d-sub" x="331" y="134" text-anchor="middle">8 is now at index 2</text>
  <path class="d-edge" d="M 420 105 L 466 105" marker-end="url(#b19q1-down)"/>
  <rect class="d-box-muted" x="472" y="60" width="170" height="90" rx="10"/>
  <text class="d-text" x="557" y="92" text-anchor="middle">no children: stop</text>
  <text class="d-sub" x="557" y="116" text-anchor="middle">indexes 5 and 6</text>
  <text class="d-sub" x="557" y="134" text-anchor="middle">are past the end</text>
</svg>

Example 1 prints this pop as \`pop 1 -> [2, 3, 8, 5, 9]\`. Why swap with the *smaller* child? Because that child becomes the parent of the other one, and only the smaller of the two can be a valid parent.

Popping everything, one at a time, hands the items back in sorted order — example 1 ends with \`pop order: [1, 2, 3, 5, 8, 9]\`. That is **heap sort** in a nutshell: O(n log n) and, when done inside the array itself, O(1) extra space. See [how common sorting algorithms compare](/interview-question/compare-common-sorting-algorithms).

## 5. Building a Heap From n Items: Heapify Is O(n)

If you already have all n items, you can push them one by one (O(n log n)), or you can use **bottom-up heapify**: treat the array as a tree as it stands, and sift down every parent node, starting from the last parent (index n/2 − 1) and walking back to the root.

📌 **Interview term: Heapify (bottom-up heap construction)** — turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root. It costs O(n), not O(n log n).

Why is it linear? Half of the nodes are leaves and need no work at all. A quarter sit one level up and can move down at most one level, an eighth can move at most two levels, and so on. The sum n/4·1 + n/8·2 + n/16·3 + ... is less than n. Only the single root can travel the full log n levels. Pushing one by one is the opposite: most items are added at the bottom and may climb all the way up.

Example 2 counts the comparisons on 100,000 items. On a descending input (the worst case for pushes, because every new item is the new minimum and climbs to the root) pushes make about 1.47 million comparisons and heapify about 200,000 — about 7 times fewer, and about 2n, as the sum predicts. On random input the gap is small (228k vs 188k), because a random new item usually stops after a step or two. Both methods produce valid heaps, but not necessarily the same array.

## 6. The Code in C++

### A heap from scratch

Interviewers sometimes say "do not use the library". Here is the whole thing on a \`std::vector<int>\`; the vector *is* the tree.

~~~cpp
// A binary min-heap stored in a std::vector<int>.
struct MinHeap {
    std::vector<int> a;

    void push(int x) {
        a.push_back(x);                         // 1. add at the end (next free slot)
        size_t i = a.size() - 1;
        while (i > 0) {                         // 2. sift up while smaller than the parent
            size_t parent = (i - 1) / 2;
            if (a[i] >= a[parent]) break;
            std::swap(a[i], a[parent]);
            i = parent;
        }
    }

    int pop() {
        int top = a[0];
        int last = a.back();                    // 1. take the last element off the end
        a.pop_back();
        if (!a.empty()) {
            a[0] = last;                        // 2. move it to the root
            size_t i = 0, n = a.size();
            while (true) {                      // 3. sift down: swap with the smaller child
                size_t left = 2 * i + 1, right = 2 * i + 2, smallest = i;
                if (left < n && a[left] < a[smallest]) smallest = left;
                if (right < n && a[right] < a[smallest]) smallest = right;
                if (smallest == i) break;
                std::swap(a[i], a[smallest]);
                i = smallest;
            }
        }
        return top;
    }

    int peek() const { return a[0]; }
    size_t size() const { return a.size(); }
};
~~~

**What to point out in this code:**

- Indexes are \`size_t\` (unsigned). \`(i - 1) / 2\` is only evaluated when \`i > 0\`, which matters: with an unsigned \`i == 0\`, \`i - 1\` wraps around to a huge number instead of −1. Example 2 uses \`long long\` indexes in \`heapify\` precisely so that the loop \`start >= 0\` can terminate.
- \`a.back()\` then \`a.pop_back()\` removes the last element in O(1). \`a.erase(a.begin())\` would shift every element: O(n).
- \`std::swap(a[i], a[parent])\` swaps two slots.
- \`pop()\` on an empty heap reads \`a[0]\` of an empty vector — undefined behaviour, not an exception. Check \`size()\` first.

📌 **Interview term: Undefined behaviour (UB)** — what C++ says about operations like reading past the end of a vector or calling \`top()\` on an empty \`priority_queue\`: the program may crash, return garbage or seem to work. Nothing is guaranteed, so guard against it.

### The standard library: \`std::priority_queue\`

~~~cpp
#include <queue>
#include <functional>   // std::greater

std::priority_queue<int> maxPq;                                        // LARGEST first (default)
std::priority_queue<int, std::vector<int>, std::greater<int>> minPq;  // smallest first

minPq.push(5);            // O(log n)
int smallest = minPq.top(); // O(1): read the best item
minPq.pop();              // O(log n): remove it; returns void
~~~

Things that trip people up:

- **The default is a max-heap.** [cppreference](https://en.cppreference.com/w/cpp/container/priority_queue) describes it as giving constant-time lookup of the *largest* element by default, with the comparator \`std::less\`; passing \`std::greater<T>\` makes the smallest element appear at \`top()\`. Example 2 uses both.
- **\`pop()\` returns nothing.** Read with \`top()\` first, then \`pop()\`. Writing \`int x = pq.pop();\` does not compile.
- **The comparator means "comes below".** For a custom type, \`comp(a, b)\` returning \`true\` means \`a\` has *lower* priority than \`b\`. So a min-heap on the first field of a pair is \`[](const auto& a, const auto& b) { return a.first > b.first; }\` — the \`>\` looks backwards, but in our run pushing \`{3,"c"}\`, \`{1,"a"}\`, \`{2,"b"}\` popped \`abc\`. Declare it as \`std::priority_queue<T, std::vector<T>, decltype(cmp)> pq(cmp);\`.
- **You cannot iterate it or change an item inside it.** It is a thin adaptor over a vector with no decrease-key. Push a new entry and skip stale ones (lazy deletion).
- **Construct from a range when you have all the items.** \`std::priority_queue<int> pq(v.begin(), v.end());\` builds the heap in one go; example 2 builds both of its queues this way.

### The heap algorithms in \`<algorithm>\`

The same machinery is available directly on a vector, which is handy when you also want to look at the array:

~~~cpp
std::vector<int> v = {5, 3, 8, 1, 9, 2};
std::make_heap(v.begin(), v.end());   // O(n) heapify: max-heap, v.front() is 9
std::pop_heap(v.begin(), v.end());    // moves the max to v.back() and fixes the rest
v.pop_back();                         // now actually remove it
v.push_back(7);
std::push_heap(v.begin(), v.end());   // sift the new last element up
~~~

In our run \`make_heap\` turned the vector into \`9 5 8 1 3 2\`, \`pop_heap\` left 9 at the back, and after pushing 7 the front was 8. \`std::is_heap\` returned true at the end. Pass \`std::greater<int>()\` as the last argument to every call for a min-heap — and it must be the same comparator on every call.

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — a min-heap from scratch** prints the array after every push and pop:

~~~text
push 5 -> [5]
push 3 -> [3, 5]
push 8 -> [3, 5, 8]
push 1 -> [1, 3, 8, 5]
push 9 -> [1, 3, 8, 5, 9]
push 2 -> [1, 3, 2, 5, 9, 8]
peek -> 1
index 1: parent 0, children 3 and 4
pop 1 -> [2, 3, 8, 5, 9]
pop 2 -> [3, 5, 8, 9]
pop 3 -> [5, 9, 8]
pop 5 -> [8, 9]
pop 8 -> [9]
pop 9 -> []
pop order: [1, 2, 3, 5, 8, 9]
~~~

**Example 2 — n pushes vs bottom-up heapify, with comparisons counted, then \`std::priority_queue\`** prints:

~~~text
random n=100000: pushes 227688 comparisons, heapify 188071 comparisons
  both valid heaps: true
descending n=100000: pushes 1468946 comparisons, heapify 199978 comparisons
  both valid heaps: true
priority queue (min) pops: [1, 2, 3]
priority queue (max) pops: [9, 8, 7]
~~~

The descending input is where heapify shines: about 1.47 million comparisons for pushes against about 200,000 for heapify. The last two lines are \`std::priority_queue\` with \`std::greater<int>\` (min) and with the default (max).

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`top()\` | O(1) | the best item is always at index 0 |
| \`push(x)\` / \`push_heap\` | O(log n) | one sift up, at most one swap per level |
| \`pop()\` / \`pop_heap\` | O(log n) | one sift down, at most one swap per level |
| \`make_heap\` / range constructor | O(n) | bottom-up heapify (example 2 counts it) |
| n \`push\` calls | O(n log n) | each push may climb to the root |
| find an arbitrary value | O(n) | not supported by the adaptor; scan the vector yourself |
| Space | O(n) | one contiguous vector, no node allocations |

## 9. Where You Will Meet Heaps Next

Almost every heap interview question is one of three patterns:

- **Keep the k best items with a heap of size k.** The heap holds the current top k, and its root is the *worst* of them, so one comparison tells you whether a new item gets in. That is [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin).
- **Always take the smallest of several "fronts".** Keep one item per source in the heap and replace it with the next item from the same source: [merge k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists), [the heap vs divide-and-conquer trade-off for it](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k), the news feed in [design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline), and [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work).
- **Two heaps facing each other.** A max-heap for the smaller half and a min-heap for the larger half give you the middle in O(1): [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream), [the two-heap invariant and rebalancing](/interview-question/find-median-from-data-stream-with-two-heaps-invariant-and-rebalancing) and [the sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl).

## 10. Edge Cases

- **Empty heap** — \`top()\` and \`pop()\` on an empty \`priority_queue\` are undefined behaviour. Always check \`empty()\`.
- **Duplicates** — fine: the rule is parent ≤ child, so equal values can sit anywhere.
- **Unsigned index underflow** — in a hand-written heap, \`size_t i = 0; i - 1\` is a huge number. Use a signed type or test \`i > 0\` first.
- **Comparator that is not a strict weak ordering** — writing \`>=\` instead of \`>\` breaks the rules the library relies on, which is undefined behaviour. Use strict \`<\` or \`>\`.
- **Large keys** — \`int\` holds up to 2,147,483,647. If priorities are sums or products, use \`long long\`; signed overflow is undefined behaviour in C++.

📌 **Interview term: Lazy deletion** — instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top.

📌 **Interview term: Strict weak ordering** — the rule a C++ comparator must follow: \`comp(a, a)\` is false, and it behaves like \`<\`. \`>=\` and \`<=\` break it.

## Common Pitfalls

- **Expecting a min-heap from \`std::priority_queue<int>\`.** It is a max-heap; add \`std::vector<int>, std::greater<int>\`.
- **Getting the custom comparator backwards.** \`true\` means "a goes below b". For a min-heap on \`.first\`, compare with \`>\`.
- **\`int x = pq.pop();\`** does not compile: read \`top()\`, then \`pop()\`.
- **Calling \`top()\` on an empty queue.** Undefined behaviour, often a garbage value rather than a crash.
- **Mixing comparators across \`make_heap\` / \`push_heap\` / \`pop_heap\`.** Every call on the same vector must use the same one.
- **\`size_t\` loop counters going below zero** in a hand-written heapify loop.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffffff;">priority queue</strong> gives back the best item first; a <strong style="color:#ffffff;">binary heap</strong> is how we build it: a complete binary tree stored in a vector, with every parent ≤ its children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layout:</strong> <span style="color:#f0e2c8;">Node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> has its parent at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i - 1) / 2</code> and children at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * i + 2</code>, so no pointers are needed and the height is about log₂ n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operations:</strong> <span style="color:#f0e2c8;">Push = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> + sift up; pop = move the last item to the root + sift down. Both O(log n); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> is O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Heapify:</strong> <span style="color:#f0e2c8;">Building from n items bottom-up is O(n), not O(n log n), because most nodes are near the leaves; that is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::make_heap</code> does.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> is a <strong style="color:#ffffff;">max-heap</strong>; for a min-heap I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt;</code>, and I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is bottom-up heapify O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half the nodes are leaves and do nothing, a quarter move at most one level, an eighth at most two; the sum stays below n. In our run on 100,000 descending values heapify used about 200,000 comparisons against about 1.47 million for 100,000 pushes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a min-heap comparator use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> puts the element that is "last" by the comparator on top. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.first &gt; b.first</code>, the smallest first field is the "last" one, so it surfaces. Our pair queue popped <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c</code> in priority order 1, 2, 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pop()</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The usual explanation is exception safety: returning the removed element by value needs a copy, and if that copy threw after the element was already removed, it would be lost. Splitting read (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>, a const reference) from remove (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>) avoids that. In practice: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int x = pq.top(); pq.pop();</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::set</code> / <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::multiset</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiset</code> is a red-black tree: O(log n) insert, erase of any element, and both the minimum and the maximum available. It is the right tool when you must delete arbitrary items, as in a sliding window. A heap only offers one end, but it is a contiguous vector with O(1) top and O(n) build, so it is faster when that is all you need.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decrease a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> cannot. Push the new (key, item) pair and, when a popped pair does not match the current best key stored in a separate array, skip it. That is the usual Dijkstra in C++.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Priority queue** | An abstract data type (a *promise* about behaviour, not a layout in memory) with three operations: insert an item, look at the item with the best priority, and remove that item |
| **Binary heap** | The most common way to build a priority queue: a complete binary tree stored in a plain array, where every parent is "better" (smaller, for a min-heap) than its children |
| **Min-heap / max-heap** | In a min-heap the smallest item sits at the top (the root); in a max-heap the largest does |
| **Complete binary tree** | A binary tree where every level is full except possibly the last, and the last level is filled from the left |
| **Heap property** | The order rule: parent ≤ child for every parent-child pair in a min-heap (parent ≥ child in a max-heap) |
| **Sift up (bubble up)** | Moving an item towards the root by swapping it with its parent while it is smaller than the parent |
| **Sift down (bubble down, heapify-down)** | Moving an item away from the root by swapping it with its smaller child (in a min-heap) until both children are larger |
| **Heapify (bottom-up heap construction)** | Turning an unordered array into a heap in place by sifting down each internal node from the last one back to the root |
| **Undefined behaviour (UB)** | What C++ says about operations like reading past the end of a vector or calling \`top()\` on an empty \`priority_queue\`: the program may crash, return garbage or seem to work |
| **Lazy deletion** | Instead of removing or updating an item inside the heap (O(n) to find it), mark it as stale and throw it away when it reaches the top |
| **Strict weak ordering** | The rule a C++ comparator must follow: \`comp(a, a)\` is false, and it behaves like \`<\`. \`>=\` and \`<=\` break it |

---
**Conclusion:** A priority queue is the promise "give me the best item next"; a binary heap keeps that promise with a complete tree packed into a vector, where parent ≤ child, the best item sits at index 0, and push and pop each fix one root-to-leaf path in O(log n). Building with heapify is O(n). In C++ remember the three surprises of \`std::priority_queue\`: it is a max-heap by default, its comparator means "goes below", and \`pop()\` returns \`void\` — read \`top()\` first, and never on an empty queue.`,
        examples: [
          {
            label: "A min-heap from scratch: push, sift up, pop, sift down",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// A binary min-heap stored in a std::vector<int>.
struct MinHeap {
    std::vector<int> a;

    void push(int x) {
        a.push_back(x);                         // 1. add at the end (next free slot)
        size_t i = a.size() - 1;
        while (i > 0) {                         // 2. sift up while smaller than the parent
            size_t parent = (i - 1) / 2;
            if (a[i] >= a[parent]) break;
            std::swap(a[i], a[parent]);
            i = parent;
        }
    }

    int pop() {
        int top = a[0];
        int last = a.back();                    // 1. take the last element off the end
        a.pop_back();
        if (!a.empty()) {
            a[0] = last;                        // 2. move it to the root
            size_t i = 0, n = a.size();
            while (true) {                      // 3. sift down: swap with the smaller child
                size_t left = 2 * i + 1, right = 2 * i + 2, smallest = i;
                if (left < n && a[left] < a[smallest]) smallest = left;
                if (right < n && a[right] < a[smallest]) smallest = right;
                if (smallest == i) break;
                std::swap(a[i], a[smallest]);
                i = smallest;
            }
        }
        return top;
    }

    int peek() const { return a[0]; }
    size_t size() const { return a.size(); }
};

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(xs[i]);
    }
    return s + "]";
}

int main() {
    MinHeap h;
    for (int x : {5, 3, 8, 1, 9, 2}) {
        h.push(x);
        std::cout << "push " << x << " -> " << fmt(h.a) << "\\n";
    }
    std::cout << "peek -> " << h.peek() << "\\n";
    std::cout << "index 1: parent " << (1 - 1) / 2 << ", children " << 2 * 1 + 1 << " and " << 2 * 1 + 2 << "\\n";
    std::vector<int> order;
    while (h.size() > 0) {
        order.push_back(h.pop());
        std::cout << "pop " << order.back() << " -> " << fmt(h.a) << "\\n";
    }
    std::cout << "pop order: " << fmt(order) << "\\n";
    return 0;
}`,
          },
          {
            label: "Heapify vs n pushes (comparisons counted) and the built-in priority queue",
            code: `#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

long long comps = 0;

// Push one value at a time and sift it up.
std::vector<int> buildByPushes(const std::vector<int>& values) {
    std::vector<int> a;
    comps = 0;
    for (int x : values) {
        a.push_back(x);
        size_t i = a.size() - 1;
        while (i > 0) {
            size_t parent = (i - 1) / 2;
            comps++;
            if (a[i] >= a[parent]) break;
            std::swap(a[i], a[parent]);
            i = parent;
        }
    }
    return a;
}

// Bottom-up heapify: sift down every internal node, last one first.
std::vector<int> heapify(std::vector<int> a) {
    long long n = (long long)a.size();
    comps = 0;
    for (long long start = n / 2 - 1; start >= 0; start--) {
        long long i = start;
        while (true) {
            long long left = 2 * i + 1, right = 2 * i + 2, smallest = i;
            if (left < n) { comps++; if (a[left] < a[smallest]) smallest = left; }
            if (right < n) { comps++; if (a[right] < a[smallest]) smallest = right; }
            if (smallest == i) break;
            std::swap(a[i], a[smallest]);
            i = smallest;
        }
    }
    return a;
}

bool isMinHeap(const std::vector<int>& a) {
    for (size_t i = 1; i < a.size(); i++) if (a[(i - 1) / 2] > a[i]) return false;
    return true;
}

std::vector<int> randomValues(int n, long long seed) {
    std::vector<int> out;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647LL; // MINSTD, same in every language
        out.push_back((int)(seed % 1000000));
    }
    return out;
}

int main() {
    const int n = 100000;
    std::vector<int> descending;
    for (int v = n; v >= 1; v--) descending.push_back(v);
    std::vector<std::pair<std::string, std::vector<int>>> inputs = {{"random", randomValues(n, 42)}, {"descending", descending}};
    for (const auto& [name, data] : inputs) {
        auto h1 = buildByPushes(data);
        long long c1 = comps;
        auto h2 = heapify(data);
        long long c2 = comps;
        std::cout << name << " n=" << n << ": pushes " << c1 << " comparisons, heapify " << c2 << " comparisons\\n";
        std::cout << "  both valid heaps: " << std::boolalpha << (isMinHeap(h1) && isMinHeap(h2)) << "\\n";
    }

    // std::priority_queue is a MAX-heap by default; std::greater<int> makes it a min-heap.
    std::vector<int> data = {5, 3, 8, 1, 9, 2, 7};
    std::priority_queue<int, std::vector<int>, std::greater<int>> minPq(data.begin(), data.end());
    std::priority_queue<int> maxPq(data.begin(), data.end());
    std::string mins, maxs;
    for (int k = 0; k < 3; k++) {
        mins += (k ? ", " : "") + std::to_string(minPq.top()); minPq.pop();   // top() reads, pop() returns void
        maxs += (k ? ", " : "") + std::to_string(maxPq.top()); maxPq.pop();
    }
    std::cout << "priority queue (min) pops: [" << mins << "]\\n";
    std::cout << "priority queue (max) pops: [" << maxs << "]\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the Kth largest element — heap vs quickselect, and when to choose which?",
    difficulty: "medium",
    seoDescription: "Kth largest element two ways: a size-k min-heap in O(n log k) or quickselect in average O(n). When to pick each, with verified code in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an unsorted list of integers and a number k, return the kth largest element — duplicates count, so it is the kth element in sorted descending order. Write it in Python. Then tell me: would you use a heap or quickselect, and when would you choose the other one?"

**What a strong answer should cover:**
- The baseline: sort and index \`a[n - k]\`, O(n log n).
- A min-heap of size k (the root is the gatekeeper): O(n log k) time, O(k) space, works on a stream and never modifies the input.
- Quickselect: partition, keep only the side holding index n − k; average O(n), worst case O(n²); random pivot, and a three-way partition for duplicates.
- The decision: quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.
- Python specifics: \`heapq\` is a min-heap, which is exactly what this needs; \`heapq.heapreplace\` / \`heappushpop\` do pop-and-push in one sift; \`heapq.nlargest(k, nums)[-1]\` is the one-liner; write quickselect iteratively because the default recursion limit is 1000.

**Clarifying questions expected:**
- Do duplicates count separately, and is k 1-based?
- Can I modify the input list, and does the data fit in memory?

**Code / implementation expected:** Yes — the size-k \`heapq\` solution, and quickselect with a random pivot in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Python lists and loops; heaps are explained from scratch on the linked page.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school runs a race with 100,000 runners and wants to give a medal to the runner who finished **10th fastest**. There are three ways to find them.

1. **Line everybody up by time** and count to the 10th. That works, but sorting 100,000 people is a lot of shuffling just to find one.
2. **Keep a podium of 10 places.** As each runner crosses the line, compare them with the *slowest* person currently on the podium. If the new runner is faster, the slowest steps down and the new runner steps up. At the end, the slowest person on the podium is the 10th fastest. You only ever look at 10 people, and you could do this while the race is still running.
3. **Pick a runner at random and split the crowd** into "faster than them" and "slower than them". If exactly 9 people are faster, the chosen runner *is* the answer. If 500 are faster, the answer is somewhere in that group — ignore everybody else and split again. Each split throws most of the crowd away.

Way 2 is the **heap** method and way 3 is **quickselect**. Both are much better than sorting, and the interesting part of this question — the part interviewers really ask about — is knowing *which one to use when*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k counted from 1, and do duplicates count separately? | In \`[3, 2, 3, 1]\` the 2nd largest is 3 if duplicates count (the usual version), 2 if you want distinct values. |
| Do all the numbers fit in memory, or do they arrive as a stream? | A stream (or data too big for memory) rules out quickselect; the size-k heap only needs k values at a time. |
| Is k small compared with n, or could it be close to n? | O(n log k) is almost linear for small k; for k near n, flip it and look for the (n − k + 1)th smallest instead. |
| Am I allowed to reorder the input array? | Quickselect rearranges the array in place; if not allowed, it must work on an O(n) copy. |
| Do you need the worst case guaranteed, or is the average fine? | Quickselect is O(n) on average but O(n²) in the worst case; the heap is O(n log k) every time. |
| Will you ask many different k on the same data? | Then sort once (O(n log n)) and answer each query in O(1). |

## 3. Three Ways to Do It

📌 **Interview term: Kth largest element** — the value that would sit at position k if you sorted the array from largest to smallest, counting duplicates. In ascending order it is at index n − k (0-based).

**Way 1 — sort.** Sort ascending and return \`a[n - k]\`. O(n log n) time. Simple, correct, and a fine first answer to *say*, but the interviewer will ask for better.

**Way 2 — a min-heap of size k.** Walk through the numbers and keep the k largest seen so far in a [min-heap](/interview-question/what-is-a-heap-priority-queue). The root of that heap is the *smallest* of the top k — the gatekeeper. A new number only gets in if it beats the gatekeeper, and then the gatekeeper is thrown out.

📌 **Interview term: Size-k heap (bounded heap)** — a heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored. Each step costs O(log k), so n items cost O(n log k).

Why a *min*-heap for the *largest* values? Because the question we keep asking is "is this new number bigger than the weakest member of the top k?", and the weakest member is the minimum. A max-heap would have to hold all n numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each new number is compared with the root of a min-heap holding the k largest so far. If it is larger, it replaces the root. Otherwise it is ignored">
  <defs>
    <marker id="b19q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="110" text-anchor="middle">next number x</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">one pass over n</text>
  <path class="d-edge" d="M 164 115 L 222 115" marker-end="url(#b19q2-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">x bigger than root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = smallest of top k</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q2-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q2-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">sift down, O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore x</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison, O(1)</text>
</svg>

When the pass ends, the heap holds exactly the k largest values, and its root is the kth largest. Most numbers take the cheap "ignore" branch: in example 2, out of 100,000 random numbers only 105 ever entered a heap of size 10.

**Way 3 — quickselect.** Borrow the partition step from quicksort. Pick a pivot, move everything smaller to its left and everything else to its right; now the pivot sits exactly where it would be in sorted order. If that position is n − k, you are done. Otherwise **keep only the side that contains position n − k** and repeat. Quicksort recurses into both sides; quickselect recurses into one, and that is the whole difference. The full walk-through has its own page: [how quickselect finds the kth smallest/largest element](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

📌 **Interview term: Partition** — rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right. One partition of m items costs m − 1 comparisons.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="After a partition the array has smaller values, then the pivot at its final index p, then larger values. If the target index is to the right of p, only the right part is searched next">
  <defs>
    <marker id="b19q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="270" height="56" rx="6"/>
  <text class="d-text" x="165" y="64" text-anchor="middle">smaller than pivot</text>
  <text class="d-sub" x="165" y="84" text-anchor="middle">thrown away</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="56" rx="6"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">pivot</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">index p</text>
  <rect class="d-box" x="390" y="40" width="260" height="56" rx="6"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">larger or equal</text>
  <text class="d-sub" x="520" y="84" text-anchor="middle">target n - k is here</text>
  <path class="d-edge-accent" d="M 520 102 L 520 146" marker-end="url(#b19q2-b)"/>
  <rect class="d-box" x="390" y="152" width="260" height="50" rx="6"/>
  <text class="d-text" x="520" y="182" text-anchor="middle">partition only this part next</text>
</svg>

If the pivot lands at index p and the target index n − k is greater than p, the answer must be in the right part, so the left part and the pivot are never looked at again. With a good pivot each round keeps about half, so the total work is about n + n/2 + n/4 + ... ≈ 2n comparisons.

📌 **Interview term: Expected (average) O(n)** — the running time averaged over the random pivot choices, for any input. A random pivot makes the bad case extremely unlikely, but it does not make it impossible.

## 4. The Catch: Quickselect Has a Worst Case

If every pivot happens to be the largest (or smallest) value in its range, each round throws away only one element: n − 1, then n − 2, then n − 3 comparisons... about n²/2 in total. Two inputs trigger this:

- **A sorted array with a fixed pivot rule** (always the last element). Example 2 runs this on 3,000 sorted numbers: **4,498,500** comparisons, exactly 3000 · 2999 / 2. The same input with a random pivot took **8,314**.
- **Many equal values with a two-way partition.** If every value equals the pivot, none is "smaller", so the pivot lands at the far left every time. On 3,000 copies of 5, example 2 counts **3,375,749** comparisons even with a random pivot. A **three-way partition** (smaller / equal / larger) finishes in one pass: **3,000** comparisons.

📌 **Interview term: Three-way partition (Dutch national flag)** — partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²).

There is a deterministic fix, too: the **median of medians** pivot rule guarantees O(n) in the worst case, but its constant factor is large and it is rarely written in interviews. Mention it by name; you will not be asked to code it.

📌 **Interview term: Median of medians** — a pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant.

## 5. When to Choose Which

| Situation | Pick | Why |
| :--- | :--- | :--- |
| One-off query, all data in memory, you may reorder it | Quickselect | Average O(n), O(1) extra space |
| Data arrives as a stream, or does not fit in memory | Size-k heap | Needs only k values at once; one pass |
| k is small (say k ≤ 100) and n is large | Size-k heap | O(n log k) is close to O(n), no worst case, no mutation |
| You need a guaranteed bound (latency-critical, adversarial input) | Size-k heap (or sort) | Quickselect can hit O(n²) |
| The input must not be modified | Size-k heap | Quickselect needs an O(n) copy |
| Many different k on the same data | Sort once | O(n log n) once, then O(1) per query |
| You also need the k values themselves, in order | Heap (then pop) or quickselect + sort the k | Both give the top k; only sorting orders them |

A good spoken answer: *"If I can reorder the array and want the fastest average, quickselect with a random pivot and three-way partition; if the data is streaming, huge, read-only, or I need a guaranteed bound, a size-k min-heap in O(n log k)."*

The same size-k heap answers [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin) — only the key changes. For a stream where the rank you want moves (the middle), you need two heaps instead: [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream).

## 6. The Code in Python

### The size-k heap

\`heapq\` is a **min-heap**, which is exactly the gatekeeper we want: \`heap[0]\` is the smallest of the k largest so far.

~~~python
def kth_largest_heap(nums, k):
    """Keep the k largest values seen so far in a min-heap of size k."""
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:              # bigger than the smallest of the top k
            heapq.heapreplace(heap, x)  # pop the root and push x in one sift
    return heap[0]                      # the smallest of the k largest
~~~

- \`heapq.heapreplace(heap, x)\` pops the root and pushes \`x\` with a single sift down — cheaper than \`heappop\` followed by \`heappush\`. It is only safe when the heap is non-empty, which the \`len(heap) < k\` branch guarantees.
- The \`elif x > heap[0]\` test is what keeps most numbers out at the cost of one comparison. Use \`>\`, not \`>=\`: an equal value would replace an equal value and change nothing.
- **The one-liner.** \`heapq.nlargest(k, nums)[-1]\` gives the same answer; in CPython 3.13 (we read its source with \`inspect.getsource\`) it keeps a heap of size k too, but switches to \`max()\` for k = 1 and to \`sorted()\` when k ≥ len(nums). In our run \`heapq.nlargest(4, [3, 2, 3, 1, 2, 4, 5, 5, 6])\` returned \`[6, 5, 5, 4]\`. Say you know it, then write the loop.

### Quickselect

~~~python
def kth_largest_quickselect(nums, k):
    """Iterative quickselect with a random pivot. Works on a copy."""
    a = list(nums)
    target = len(a) - k                 # kth largest = index n-k in sorted order
    lo, hi = 0, len(a) - 1
    while True:
        p = random.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]       # move the pivot to the end
        pivot, store = a[hi], lo
        for i in range(lo, hi):         # Lomuto partition: smaller values to the left
            if a[i] < pivot:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]  # pivot lands in its final position
        if store == target:
            return a[store]
        if store < target:
            lo = store + 1
        else:
            hi = store - 1
~~~

- **Iterative on purpose.** A recursive version recurses once per round. On the 3,000-element sorted worst case that is about 3,000 nested calls, and Python's default recursion limit is 1,000 (\`sys.getrecursionlimit()\` printed 1000 in our run); our recursive test version raised \`RecursionError: maximum recursion depth exceeded\`. A \`while True\` loop with \`lo\` / \`hi\` has no such limit.
- \`random.randint(lo, hi)\` includes both ends, unlike \`range\`. The random pivot is what makes the O(n²) case unlikely for *any* input.
- \`a = list(nums)\` makes a copy, so the caller's list is not reordered. If mutation is allowed, drop the copy and save O(n) memory.
- Example 2 adds a **three-way partition** version for inputs with many duplicates; its loop is the [Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) partition.

~~~python
def quickselect_3way(nums, k):
    """Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast."""
    a = list(nums)
    target, lo, hi, comps = len(a) - k, 0, len(a) - 1, 0
    while True:
        pivot = a[lo + rand_below(hi - lo + 1)]
        lt, i, gt = lo, lo, hi
        while i <= gt:
            comps += 1
            if a[i] < pivot:
                a[lt], a[i] = a[i], a[lt]
                lt += 1
                i += 1
            elif a[i] > pivot:
                a[i], a[gt] = a[gt], a[i]
                gt -= 1
            else:
                i += 1
        if target < lt:
            hi = lt - 1
        elif target > gt:
            lo = gt + 1
        else:
            return pivot, comps
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 uses a small deterministic random generator (MINSTD) for both the data and the pivots, so the counts are identical in every language.

**Example 1 — both methods on six inputs:**

~~~text
heap 5, quickselect 5
heap 4, quickselect 4
heap 1, quickselect 1
heap 7, quickselect 7
heap -5, quickselect -5
heap 2, quickselect 2
~~~

**Example 2 — counting the work, including the two worst cases:**

~~~text
random n=100000, k=10: answer 999939 (sorted: 999939)
  heap of size 10: 105 values entered the heap
  quickselect, random pivot: answer 999939, 167646 comparisons
sorted n=3000, k=3000, last-element pivot: answer 1, 4498500 comparisons
sorted n=3000, k=3000, random pivot:       answer 1, 8314 comparisons
all equal n=3000, two-way partition:       answer 5, 3375749 comparisons
all equal n=3000, three-way partition:     answer 5, 3000 comparisons
~~~

Reading the numbers: on 100,000 random values only 105 ever passed the gatekeeper of a size-10 heap (10 + about 10 · ln(100000 / 10) ≈ 102 is what theory predicts for random order), and quickselect needed 167,646 comparisons — under 2n. A sorted input with a last-element pivot costs exactly 3000 · 2999 / 2 = 4,498,500 comparisons, and all-equal values hurt the two-way partition even with a random pivot, while the three-way partition finishes in one pass.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`sorted(nums)[-k]\` | O(n log n) | O(n) | simplest; best if many k are asked |
| size-k \`heapq\` | O(n log k) | O(k) | streaming-friendly; input untouched |
| \`heapq.nlargest(k, nums)[-1]\` | O(n log k) | O(k) | same idea, in the standard library |
| quickselect, random pivot | O(n) average, O(n²) worst | O(n) for the copy, O(1) in place | iterative, so no recursion limit |
| quickselect, three-way partition | O(n) average | as above | handles many duplicates |

## 9. Edge Cases

- **k = 1** — the maximum. Both methods work; a single linear scan is simplest.
- **k = n** — the minimum. The heap holds all n values (O(n log n)); quickselect targets index 0. Example 1 runs \`[-1, -5, 3, 0]\` with k = 4 and gets −5.
- **Duplicates** — \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with k = 4 gives 4 (the sorted order is 6, 5, 5, 4, ...): duplicates count. All-equal input is the quickselect trap from section 4.
- **One element** — \`[1]\`, k = 1 returns 1; quickselect partitions a range of size one and stops.
- **Negative numbers** — nothing special for either method, as long as no code uses 0 or −1 as a "missing" marker.
- **Invalid k** (k < 1 or k > n) — not a valid question; ask the interviewer whether to raise an error or return a sentinel.

## Common Pitfalls

- **Using a max-heap of all n values.** Pushing everything (or negating everything into \`heapq\`) and popping k times is O(n + k log n) with O(n) memory — it works, but it is not the size-k idea, and it cannot handle a stream.
- **Returning \`heap[-1]\` instead of \`heap[0]\`.** Only \`heap[0]\` is guaranteed; the last list slot is just some leaf.
- **Recursive quickselect in Python.** Bad pivots on a few thousand items exceed the recursion limit; write the loop.
- **Fixed pivot (\`a[hi]\`) on sorted input.** O(n²) — 4,498,500 comparisons for n = 3,000 in example 2. Randomise.
- **Two-way partition on duplicate-heavy data.** Still O(n²) with a random pivot (3,375,749 comparisons on 3,000 equal values); use the three-way partition.
- **Off-by-one on the target.** The kth largest is index \`n - k\` in ascending order, not \`k\` and not \`k - 1\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Sorting and taking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(nums)[-k]</code> is O(n log n); both better methods beat it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> min-heap of size k; its root is the smallest of the top k, and a new value replaces it only if larger. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition around a random pivot and keep only the side that holds index n − k: O(n) on average, O(n²) worst case, and it reorders the list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choice:</strong> <span style="color:#f0e2c8;">Quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.heapreplace</code> for the swap step, mention <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nlargest(k, nums)[-1]</code>, and write quickselect as a loop because the recursion limit is 1,000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a min-heap to find the largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The only question we ask per element is "does it beat the weakest of the current top k?". The weakest is the minimum, so a min-heap puts it at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code> in O(1). A max-heap would need all n values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make quickselect safe against bad inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick the pivot at random so no fixed input is always bad, and use a three-way partition so duplicates do not degrade it. In our run a sorted input with a last-element pivot cost 4,498,500 comparisons; with a random pivot, 8,314.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make quickselect worst-case O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with the median-of-medians pivot rule. It guarantees a pivot near the middle, but the constant is large, so in practice people use a random pivot (C++ libraries typically use introselect for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code>, according to cppreference, a quickselect that switches to a safe fallback when the recursion gets too deep).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the numbers arrive one at a time and I can ask at any moment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k min-heap alive between arrivals. Each new number costs O(log k) and the answer is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code>. Quickselect cannot do this because it needs all the data at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is close to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Flip it: the kth largest is the (n − k + 1)th smallest, so keep a max-heap of size n − k + 1 (negated values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>). The heap stays small and the cost is O(n log(n − k)).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kth largest element** | The value that would sit at position k if you sorted the array from largest to smallest, counting duplicates |
| **Size-k heap (bounded heap)** | A heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored |
| **Partition** | Rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right |
| **Expected (average) O(n)** | The running time averaged over the random pivot choices, for any input |
| **Three-way partition (Dutch national flag)** | Partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²) |
| **Median of medians** | A pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant |

---
**Conclusion:** The Kth largest element has two good answers and the interview is really about choosing between them. A \`heapq\` min-heap of size k is O(n log k), uses O(k) memory, never touches the input and works on a stream; quickselect is O(n) on average and O(1) extra memory, but it reorders the list and has an O(n²) worst case that a random pivot and a three-way partition make unlikely. In Python, use \`heapreplace\` for the heap step, know \`heapq.nlargest\`, and write quickselect as a loop.`,
        examples: [
          {
            label: "Kth largest: size-k min-heap and random-pivot quickselect on six inputs",
            code: `import heapq
import random


def kth_largest_heap(nums, k):
    """Keep the k largest values seen so far in a min-heap of size k."""
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:              # bigger than the smallest of the top k
            heapq.heapreplace(heap, x)  # pop the root and push x in one sift
    return heap[0]                      # the smallest of the k largest


def kth_largest_quickselect(nums, k):
    """Iterative quickselect with a random pivot. Works on a copy."""
    a = list(nums)
    target = len(a) - k                 # kth largest = index n-k in sorted order
    lo, hi = 0, len(a) - 1
    while True:
        p = random.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]       # move the pivot to the end
        pivot, store = a[hi], lo
        for i in range(lo, hi):         # Lomuto partition: smaller values to the left
            if a[i] < pivot:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]  # pivot lands in its final position
        if store == target:
            return a[store]
        if store < target:
            lo = store + 1
        else:
            hi = store - 1


def both(nums, k):
    return "heap " + str(kth_largest_heap(nums, k)) + ", quickselect " + str(kth_largest_quickselect(nums, k))


print(both([3, 2, 1, 5, 6, 4], 2))  # heap 5, quickselect 5
print(both([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))  # heap 4, quickselect 4
print(both([1], 1))  # heap 1, quickselect 1
print(both([7, 7, 7, 7], 2))  # heap 7, quickselect 7
print(both([-1, -5, 3, 0], 4))  # heap -5, quickselect -5
print(both([2, 1], 1))  # heap 2, quickselect 2`,
          },
          {
            label: "Counting the work: heap entries, quickselect comparisons, worst cases",
            code: `import heapq

seed = 7


def rand_below(m):
    """MINSTD generator, the same in every language, so the counts match."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % m


def heap_entries(nums, k):
    """Kth largest with a size-k min-heap; also count how many values got in."""
    heap, entries = [], 0
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
            entries += 1
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
            entries += 1
    return heap[0], entries


def quickselect(nums, k, pivot_rule):
    """Lomuto quickselect; returns (answer, comparisons with the pivot)."""
    a = list(nums)
    target, lo, hi, comps = len(a) - k, 0, len(a) - 1, 0
    while True:
        p = hi if pivot_rule == "last" else lo + rand_below(hi - lo + 1)
        a[p], a[hi] = a[hi], a[p]
        pivot, store = a[hi], lo
        for i in range(lo, hi):
            comps += 1
            if a[i] < pivot:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            return a[store], comps
        if store < target:
            lo = store + 1
        else:
            hi = store - 1


def quickselect_3way(nums, k):
    """Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast."""
    a = list(nums)
    target, lo, hi, comps = len(a) - k, 0, len(a) - 1, 0
    while True:
        pivot = a[lo + rand_below(hi - lo + 1)]
        lt, i, gt = lo, lo, hi
        while i <= gt:
            comps += 1
            if a[i] < pivot:
                a[lt], a[i] = a[i], a[lt]
                lt += 1
                i += 1
            elif a[i] > pivot:
                a[i], a[gt] = a[gt], a[i]
                gt -= 1
            else:
                i += 1
        if target < lt:
            hi = lt - 1
        elif target > gt:
            lo = gt + 1
        else:
            return pivot, comps


n, k = 100000, 10
data = [rand_below(1000000) for _ in range(n)]
v, entries = heap_entries(data, k)
print("random n=100000, k=10: answer " + str(v) + " (sorted: " + str(sorted(data)[n - k]) + ")")
print("  heap of size 10: " + str(entries) + " values entered the heap")
v, c = quickselect(data, k, "random")
print("  quickselect, random pivot: answer " + str(v) + ", " + str(c) + " comparisons")

m = 3000
ascending = list(range(1, m + 1))
v, c = quickselect(ascending, m, "last")
print("sorted n=3000, k=3000, last-element pivot: answer " + str(v) + ", " + str(c) + " comparisons")
v, c = quickselect(ascending, m, "random")
print("sorted n=3000, k=3000, random pivot:       answer " + str(v) + ", " + str(c) + " comparisons")
same = [5] * m
v, c = quickselect(same, 1500, "random")
print("all equal n=3000, two-way partition:       answer " + str(v) + ", " + str(c) + " comparisons")
v, c = quickselect_3way(same, 1500)
print("all equal n=3000, three-way partition:     answer " + str(v) + ", " + str(c) + " comparisons")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an unsorted array of integers and a number k, return the kth largest element — duplicates count. Write it in JavaScript. Then tell me: would you use a heap or quickselect, and when would you choose the other one?"

**What a strong answer should cover:**
- The baseline: sort numerically and index \`a[n - k]\`, O(n log n).
- A min-heap of size k (the root is the gatekeeper): O(n log k) time, O(k) space, works on a stream and never modifies the input.
- Quickselect: partition, keep only the side holding index n − k; average O(n), worst case O(n²); random pivot, and a three-way partition for duplicates.
- The decision: quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.
- JavaScript specifics: there is no built-in heap, so write a small min-heap class with a \`replaceTop\`; \`arr.sort()\` without a comparator sorts as strings; \`Math.random()\` for the pivot; copy with \`slice()\` if the input must not change.

**Clarifying questions expected:**
- Do duplicates count separately, and is k 1-based?
- Can I modify the input array, and does the data fit in memory?

**Code / implementation expected:** Yes — a size-k min-heap (with a hand-written heap class) and quickselect with a random pivot in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need JavaScript arrays, loops and classes; heaps are explained from scratch on the linked page.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school runs a race with 100,000 runners and wants to give a medal to the runner who finished **10th fastest**. There are three ways to find them.

1. **Line everybody up by time** and count to the 10th. That works, but sorting 100,000 people is a lot of shuffling just to find one.
2. **Keep a podium of 10 places.** As each runner crosses the line, compare them with the *slowest* person currently on the podium. If the new runner is faster, the slowest steps down and the new runner steps up. At the end, the slowest person on the podium is the 10th fastest. You only ever look at 10 people, and you could do this while the race is still running.
3. **Pick a runner at random and split the crowd** into "faster than them" and "slower than them". If exactly 9 people are faster, the chosen runner *is* the answer. If 500 are faster, the answer is somewhere in that group — ignore everybody else and split again. Each split throws most of the crowd away.

Way 2 is the **heap** method and way 3 is **quickselect**. Both are much better than sorting, and the interesting part of this question — the part interviewers really ask about — is knowing *which one to use when*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k counted from 1, and do duplicates count separately? | In \`[3, 2, 3, 1]\` the 2nd largest is 3 if duplicates count (the usual version), 2 if you want distinct values. |
| Do all the numbers fit in memory, or do they arrive as a stream? | A stream (or data too big for memory) rules out quickselect; the size-k heap only needs k values at a time. |
| Is k small compared with n, or could it be close to n? | O(n log k) is almost linear for small k; for k near n, flip it and look for the (n − k + 1)th smallest instead. |
| Am I allowed to reorder the input array? | Quickselect rearranges the array in place; if not allowed, it must work on an O(n) copy. |
| Do you need the worst case guaranteed, or is the average fine? | Quickselect is O(n) on average but O(n²) in the worst case; the heap is O(n log k) every time. |
| Will you ask many different k on the same data? | Then sort once (O(n log n)) and answer each query in O(1). |

## 3. Three Ways to Do It

📌 **Interview term: Kth largest element** — the value that would sit at position k if you sorted the array from largest to smallest, counting duplicates. In ascending order it is at index n − k (0-based).

**Way 1 — sort.** Sort ascending and return \`a[n - k]\`. O(n log n) time. Simple, correct, and a fine first answer to *say*, but the interviewer will ask for better.

**Way 2 — a min-heap of size k.** Walk through the numbers and keep the k largest seen so far in a [min-heap](/interview-question/what-is-a-heap-priority-queue). The root of that heap is the *smallest* of the top k — the gatekeeper. A new number only gets in if it beats the gatekeeper, and then the gatekeeper is thrown out.

📌 **Interview term: Size-k heap (bounded heap)** — a heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored. Each step costs O(log k), so n items cost O(n log k).

Why a *min*-heap for the *largest* values? Because the question we keep asking is "is this new number bigger than the weakest member of the top k?", and the weakest member is the minimum. A max-heap would have to hold all n numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each new number is compared with the root of a min-heap holding the k largest so far. If it is larger, it replaces the root. Otherwise it is ignored">
  <defs>
    <marker id="b19q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="110" text-anchor="middle">next number x</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">one pass over n</text>
  <path class="d-edge" d="M 164 115 L 222 115" marker-end="url(#b19q2-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">x bigger than root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = smallest of top k</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q2-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q2-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">sift down, O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore x</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison, O(1)</text>
</svg>

When the pass ends, the heap holds exactly the k largest values, and its root is the kth largest. Most numbers take the cheap "ignore" branch: in example 2, out of 100,000 random numbers only 105 ever entered a heap of size 10.

**Way 3 — quickselect.** Borrow the partition step from quicksort. Pick a pivot, move everything smaller to its left and everything else to its right; now the pivot sits exactly where it would be in sorted order. If that position is n − k, you are done. Otherwise **keep only the side that contains position n − k** and repeat. Quicksort recurses into both sides; quickselect recurses into one, and that is the whole difference. The full walk-through has its own page: [how quickselect finds the kth smallest/largest element](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

📌 **Interview term: Partition** — rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right. One partition of m items costs m − 1 comparisons.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="After a partition the array has smaller values, then the pivot at its final index p, then larger values. If the target index is to the right of p, only the right part is searched next">
  <defs>
    <marker id="b19q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="270" height="56" rx="6"/>
  <text class="d-text" x="165" y="64" text-anchor="middle">smaller than pivot</text>
  <text class="d-sub" x="165" y="84" text-anchor="middle">thrown away</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="56" rx="6"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">pivot</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">index p</text>
  <rect class="d-box" x="390" y="40" width="260" height="56" rx="6"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">larger or equal</text>
  <text class="d-sub" x="520" y="84" text-anchor="middle">target n - k is here</text>
  <path class="d-edge-accent" d="M 520 102 L 520 146" marker-end="url(#b19q2-b)"/>
  <rect class="d-box" x="390" y="152" width="260" height="50" rx="6"/>
  <text class="d-text" x="520" y="182" text-anchor="middle">partition only this part next</text>
</svg>

If the pivot lands at index p and the target index n − k is greater than p, the answer must be in the right part, so the left part and the pivot are never looked at again. With a good pivot each round keeps about half, so the total work is about n + n/2 + n/4 + ... ≈ 2n comparisons.

📌 **Interview term: Expected (average) O(n)** — the running time averaged over the random pivot choices, for any input. A random pivot makes the bad case extremely unlikely, but it does not make it impossible.

## 4. The Catch: Quickselect Has a Worst Case

If every pivot happens to be the largest (or smallest) value in its range, each round throws away only one element: n − 1, then n − 2, then n − 3 comparisons... about n²/2 in total. Two inputs trigger this:

- **A sorted array with a fixed pivot rule** (always the last element). Example 2 runs this on 3,000 sorted numbers: **4,498,500** comparisons, exactly 3000 · 2999 / 2. The same input with a random pivot took **8,314**.
- **Many equal values with a two-way partition.** If every value equals the pivot, none is "smaller", so the pivot lands at the far left every time. On 3,000 copies of 5, example 2 counts **3,375,749** comparisons even with a random pivot. A **three-way partition** (smaller / equal / larger) finishes in one pass: **3,000** comparisons.

📌 **Interview term: Three-way partition (Dutch national flag)** — partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²).

There is a deterministic fix, too: the **median of medians** pivot rule guarantees O(n) in the worst case, but its constant factor is large and it is rarely written in interviews. Mention it by name; you will not be asked to code it.

📌 **Interview term: Median of medians** — a pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant.

## 5. When to Choose Which

| Situation | Pick | Why |
| :--- | :--- | :--- |
| One-off query, all data in memory, you may reorder it | Quickselect | Average O(n), O(1) extra space |
| Data arrives as a stream, or does not fit in memory | Size-k heap | Needs only k values at once; one pass |
| k is small (say k ≤ 100) and n is large | Size-k heap | O(n log k) is close to O(n), no worst case, no mutation |
| You need a guaranteed bound (latency-critical, adversarial input) | Size-k heap (or sort) | Quickselect can hit O(n²) |
| The input must not be modified | Size-k heap | Quickselect needs an O(n) copy |
| Many different k on the same data | Sort once | O(n log n) once, then O(1) per query |
| You also need the k values themselves, in order | Heap (then pop) or quickselect + sort the k | Both give the top k; only sorting orders them |

A good spoken answer: *"If I can reorder the array and want the fastest average, quickselect with a random pivot and three-way partition; if the data is streaming, huge, read-only, or I need a guaranteed bound, a size-k min-heap in O(n log k)."*

The same size-k heap answers [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin) — only the key changes. For a stream where the rank you want moves (the middle), you need two heaps instead: [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream).

## 6. The Code in JavaScript

### The size-k heap

JavaScript has no priority queue, so the example carries a minimal min-heap with just what this problem needs: \`push\`, \`peek\` and \`replaceTop\` (overwrite the root and sift down — the "pop then push" step in one go). The full explanation of the class is on [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue).

~~~javascript
// Minimal min-heap of numbers (JavaScript has no built-in priority queue).
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  replaceTop(x) {            // pop the root and push x with a single sift down
    const a = this.a;
    a[0] = x;
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[m], a[i]] = [a[i], a[m]];
      i = m;
    }
  }
}
~~~

~~~javascript
function kthLargestHeap(nums, k) {
  // Keep the k largest values seen so far in a min-heap of size k.
  const heap = new MinHeap();
  for (const x of nums) {
    if (heap.size < k) heap.push(x);
    else if (x > heap.peek()) heap.replaceTop(x); // bigger than the smallest of the top k
  }
  return heap.peek();                             // the smallest of the k largest
}
~~~

- \`replaceTop(x)\` writes \`x\` over the root and sifts it down: one O(log k) pass instead of a pop and a push. It is only called when the heap is full, so the root exists.
- \`x > heap.peek()\` keeps most numbers out with one comparison. Use \`>\`, not \`>=\`; an equal value would replace an equal value and change nothing.
- \`(i - 1) >> 1\` is the parent index as an integer shift; it is equivalent to \`Math.floor((i - 1) / 2)\` for array indexes.

### Quickselect

~~~javascript
function kthLargestQuickselect(nums, k) {
  // Iterative quickselect with a random pivot. Works on a copy.
  const a = nums.slice();
  const target = a.length - k;                    // kth largest = index n-k in sorted order
  let lo = 0, hi = a.length - 1;
  while (true) {
    const p = lo + Math.floor(Math.random() * (hi - lo + 1));
    [a[p], a[hi]] = [a[hi], a[p]];                // move the pivot to the end
    const pivot = a[hi];
    let store = lo;
    for (let i = lo; i < hi; i++) {               // Lomuto partition: smaller values to the left
      if (a[i] < pivot) {
        [a[i], a[store]] = [a[store], a[i]];
        store++;
      }
    }
    [a[store], a[hi]] = [a[hi], a[store]];        // pivot lands in its final position
    if (store === target) return a[store];
    if (store < target) lo = store + 1;
    else hi = store - 1;
  }
}
~~~

- \`Math.floor(Math.random() * (hi - lo + 1))\` gives a random integer from 0 to \`hi - lo\`; adding \`lo\` gives a random index in the range. A random pivot means no fixed input is always slow.
- \`nums.slice()\` copies the array so the caller's array keeps its order. If mutation is allowed, skip the copy.
- It is a \`while (true)\` loop rather than recursion. A recursive version also works in practice, but the loop has no call-stack depth to worry about in the worst case.
- Example 2 adds a **three-way partition** version (the [Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) loop) for inputs full of duplicates:

~~~javascript
function quickselect3way(nums, k) {
  // Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0, hi = a.length - 1, comps = 0;
  while (true) {
    const pivot = a[lo + randBelow(hi - lo + 1)];
    let lt = lo, i = lo, gt = hi;
    while (i <= gt) {
      comps++;
      if (a[i] < pivot) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }
      else if (a[i] > pivot) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;
    else if (target > gt) lo = gt + 1;
    else return [pivot, comps];
  }
}
~~~

### The sort baseline — and its trap

~~~javascript
const kth = nums.slice().sort((a, b) => a - b)[nums.length - k];
~~~

The comparator is not optional. \`[10, 9, 1, 2].sort()\` returns \`[1, 10, 2, 9]\` in our run, because the default compares the values as **strings**. Example 2 checks its answers against a numeric sort for exactly this reason.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 uses a small deterministic random generator (MINSTD) for both the data and the pivots, so the counts are identical in every language.

**Example 1 — both methods on six inputs:**

~~~text
heap 5, quickselect 5
heap 4, quickselect 4
heap 1, quickselect 1
heap 7, quickselect 7
heap -5, quickselect -5
heap 2, quickselect 2
~~~

**Example 2 — counting the work, including the two worst cases:**

~~~text
random n=100000, k=10: answer 999939 (sorted: 999939)
  heap of size 10: 105 values entered the heap
  quickselect, random pivot: answer 999939, 167646 comparisons
sorted n=3000, k=3000, last-element pivot: answer 1, 4498500 comparisons
sorted n=3000, k=3000, random pivot:       answer 1, 8314 comparisons
all equal n=3000, two-way partition:       answer 5, 3375749 comparisons
all equal n=3000, three-way partition:     answer 5, 3000 comparisons
~~~

Reading the numbers: on 100,000 random values only 105 ever passed the gatekeeper of a size-10 heap (10 + about 10 · ln(100000 / 10) ≈ 102 is what theory predicts for random order), and quickselect needed 167,646 comparisons — under 2n. A sorted input with a last-element pivot costs exactly 3000 · 2999 / 2 = 4,498,500 comparisons, and all-equal values hurt the two-way partition even with a random pivot, while the three-way partition finishes in one pass.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`slice().sort((a, b) => a - b)\` | O(n log n) | O(n) | simplest; best if many k are asked |
| size-k min-heap | O(n log k) | O(k) | streaming-friendly; input untouched |
| quickselect, random pivot | O(n) average, O(n²) worst | O(n) for the copy, O(1) in place | loop, no recursion |
| quickselect, three-way partition | O(n) average | as above | handles many duplicates |

## 9. Edge Cases

- **k = 1** — the maximum. Both methods work; a single linear scan is simplest.
- **k = n** — the minimum. The heap holds all n values (O(n log n)); quickselect targets index 0. Example 1 runs \`[-1, -5, 3, 0]\` with k = 4 and gets −5.
- **Duplicates** — \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with k = 4 gives 4 (the sorted order is 6, 5, 5, 4, ...): duplicates count. All-equal input is the quickselect trap from section 4.
- **One element** — \`[1]\`, k = 1 returns 1; quickselect partitions a range of size one and stops.
- **Negative numbers** — nothing special for either method, as long as no code uses 0 or −1 as a "missing" marker.
- **Invalid k** (k < 1 or k > n) — not a valid question; ask the interviewer whether to raise an error or return a sentinel.

## Common Pitfalls

- **\`sort()\` without a comparator.** String order: 10 sorts before 9. Always \`(a, b) => a - b\` for numbers.
- **Pushing all n values into a max-heap.** Works, but O(n) memory and no streaming; the point is a heap of size k.
- **Reading the wrong slot.** The answer is \`heap.peek()\` (index 0); the last array slot is just a leaf.
- **Fixed pivot on sorted input.** O(n²) — 4,498,500 comparisons for n = 3,000 in example 2. Randomise the pivot.
- **Two-way partition on duplicate-heavy data.** Still O(n²) with a random pivot; use the three-way partition.
- **Forgetting that quickselect reorders the array** — if the caller reuses \`nums\`, copy it with \`slice()\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.slice().sort((a, b) =&gt; a - b)[n - k]</code> is O(n log n) — and it needs the comparator, or numbers sort as strings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a min-heap of size k; its root is the smallest of the top k, and a new value replaces it only if larger. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition around a random pivot and keep only the side that holds index n − k: O(n) on average, O(n²) worst case, and it reorders the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choice:</strong> <span style="color:#f0e2c8;">Quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;">No built-in heap, so I write a small min-heap class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replaceTop</code>, and I copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code> before quickselect if the input must stay intact.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a min-heap to find the largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The only question per element is "does it beat the weakest of the current top k?". The weakest is the minimum, so a min-heap keeps it at index 0. A max-heap would need all n values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make quickselect safe against bad inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick the pivot with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random()</code> so no fixed input is always bad, and use a three-way partition so duplicates do not degrade it. In our run a sorted input with a last-element pivot cost 4,498,500 comparisons; with a random pivot, 8,314.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make quickselect worst-case O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with the median-of-medians pivot rule, which guarantees a pivot near the middle. Its constant factor is large, so it is named in interviews rather than written.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if numbers arrive over time, for example from a WebSocket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k heap alive between messages: each new number costs O(log k) and the current answer is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap.peek()</code>. Quickselect needs all the data at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.sort((a, b) =&gt; a - b)</code> safe for any numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For finite numbers yes. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> the comparator returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>, which is treated as "equal": in our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, NaN, 1, 2].sort((a, b) =&gt; a - b)</code> came back unchanged as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, NaN, 1, 2]</code>. Filter out <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> first; and values above <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code> may compare equal when they are not, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> there.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kth largest element** | The value that would sit at position k if you sorted the array from largest to smallest, counting duplicates |
| **Size-k heap (bounded heap)** | A heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored |
| **Partition** | Rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right |
| **Expected (average) O(n)** | The running time averaged over the random pivot choices, for any input |
| **Three-way partition (Dutch national flag)** | Partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²) |
| **Median of medians** | A pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant |

---
**Conclusion:** The Kth largest element has two good answers and the interview is really about choosing between them. A size-k min-heap is O(n log k), uses O(k) memory, never touches the input and works on a stream; quickselect is O(n) on average and O(1) extra memory, but it reorders the array and has an O(n²) worst case that a random pivot and a three-way partition make unlikely. In JavaScript you also bring your own heap class, and you never sort numbers without a comparator.`,
        examples: [
          {
            label: "Kth largest: size-k min-heap and random-pivot quickselect on six inputs",
            code: `// Minimal min-heap of numbers (JavaScript has no built-in priority queue).
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  replaceTop(x) {            // pop the root and push x with a single sift down
    const a = this.a;
    a[0] = x;
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[m], a[i]] = [a[i], a[m]];
      i = m;
    }
  }
}

function kthLargestHeap(nums, k) {
  // Keep the k largest values seen so far in a min-heap of size k.
  const heap = new MinHeap();
  for (const x of nums) {
    if (heap.size < k) heap.push(x);
    else if (x > heap.peek()) heap.replaceTop(x); // bigger than the smallest of the top k
  }
  return heap.peek();                             // the smallest of the k largest
}

function kthLargestQuickselect(nums, k) {
  // Iterative quickselect with a random pivot. Works on a copy.
  const a = nums.slice();
  const target = a.length - k;                    // kth largest = index n-k in sorted order
  let lo = 0, hi = a.length - 1;
  while (true) {
    const p = lo + Math.floor(Math.random() * (hi - lo + 1));
    [a[p], a[hi]] = [a[hi], a[p]];                // move the pivot to the end
    const pivot = a[hi];
    let store = lo;
    for (let i = lo; i < hi; i++) {               // Lomuto partition: smaller values to the left
      if (a[i] < pivot) {
        [a[i], a[store]] = [a[store], a[i]];
        store++;
      }
    }
    [a[store], a[hi]] = [a[hi], a[store]];        // pivot lands in its final position
    if (store === target) return a[store];
    if (store < target) lo = store + 1;
    else hi = store - 1;
  }
}

function both(nums, k) {
  return "heap " + kthLargestHeap(nums, k) + ", quickselect " + kthLargestQuickselect(nums, k);
}

console.log(both([3, 2, 1, 5, 6, 4], 2)); // heap 5, quickselect 5
console.log(both([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // heap 4, quickselect 4
console.log(both([1], 1)); // heap 1, quickselect 1
console.log(both([7, 7, 7, 7], 2)); // heap 7, quickselect 7
console.log(both([-1, -5, 3, 0], 4)); // heap -5, quickselect -5
console.log(both([2, 1], 1)); // heap 2, quickselect 2`,
          },
          {
            label: "Counting the work: heap entries, quickselect comparisons, worst cases",
            code: `// Minimal min-heap of numbers (JavaScript has no built-in priority queue).
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  replaceTop(x) {            // pop the root and push x with a single sift down
    const a = this.a;
    a[0] = x;
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[m], a[i]] = [a[i], a[m]];
      i = m;
    }
  }
}

let seed = 7;
function randBelow(m) {
  // MINSTD generator, the same in every language, so the counts match.
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

function heapEntries(nums, k) {
  // Kth largest with a size-k min-heap; also count how many values got in.
  const heap = new MinHeap();
  let entries = 0;
  for (const x of nums) {
    if (heap.size < k) { heap.push(x); entries++; }
    else if (x > heap.peek()) { heap.replaceTop(x); entries++; }
  }
  return [heap.peek(), entries];
}

function quickselect(nums, k, pivotRule) {
  // Lomuto quickselect; returns [answer, comparisons with the pivot].
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0, hi = a.length - 1, comps = 0;
  while (true) {
    const p = pivotRule === "last" ? hi : lo + randBelow(hi - lo + 1);
    [a[p], a[hi]] = [a[hi], a[p]];
    const pivot = a[hi];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      comps++;
      if (a[i] < pivot) { [a[i], a[store]] = [a[store], a[i]]; store++; }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    if (store === target) return [a[store], comps];
    if (store < target) lo = store + 1;
    else hi = store - 1;
  }
}

function quickselect3way(nums, k) {
  // Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0, hi = a.length - 1, comps = 0;
  while (true) {
    const pivot = a[lo + randBelow(hi - lo + 1)];
    let lt = lo, i = lo, gt = hi;
    while (i <= gt) {
      comps++;
      if (a[i] < pivot) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }
      else if (a[i] > pivot) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;
    else if (target > gt) lo = gt + 1;
    else return [pivot, comps];
  }
}

const n = 100000, k = 10;
const data = [];
for (let i = 0; i < n; i++) data.push(randBelow(1000000));
let [v, entries] = heapEntries(data, k);
const sorted = data.slice().sort((x, y) => x - y);   // numeric sort: the default sort compares strings
console.log("random n=100000, k=10: answer " + v + " (sorted: " + sorted[n - k] + ")");
console.log("  heap of size 10: " + entries + " values entered the heap");
let [v2, c] = quickselect(data, k, "random");
console.log("  quickselect, random pivot: answer " + v2 + ", " + c + " comparisons");

const m = 3000;
const ascending = [];
for (let i = 1; i <= m; i++) ascending.push(i);
[v2, c] = quickselect(ascending, m, "last");
console.log("sorted n=3000, k=3000, last-element pivot: answer " + v2 + ", " + c + " comparisons");
[v2, c] = quickselect(ascending, m, "random");
console.log("sorted n=3000, k=3000, random pivot:       answer " + v2 + ", " + c + " comparisons");
const same = new Array(m).fill(5);
[v2, c] = quickselect(same, 1500, "random");
console.log("all equal n=3000, two-way partition:       answer " + v2 + ", " + c + " comparisons");
[v2, c] = quickselect3way(same, 1500);
console.log("all equal n=3000, three-way partition:     answer " + v2 + ", " + c + " comparisons");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an unsorted \`int[]\` and a number k, return the kth largest element — duplicates count. Write it in Java. Then tell me: would you use a heap or quickselect, and when would you choose the other one?"

**What a strong answer should cover:**
- The baseline: \`Arrays.sort\` and index \`a[n - k]\`, O(n log n).
- A min-heap of size k (the root is the gatekeeper): O(n log k) time, O(k) space, works on a stream and never modifies the input.
- Quickselect: partition, keep only the side holding index n − k; average O(n), worst case O(n²); random pivot, and a three-way partition for duplicates.
- The decision: quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.
- Java specifics: \`PriorityQueue<Integer>\` is already a min-heap; it boxes every value (\`Integer\`), so for large n quickselect on the primitive \`int[]\` is much lighter; \`ThreadLocalRandom.current().nextInt(lo, hi + 1)\` for the pivot; \`nums.clone()\` if the input must not change.

**Clarifying questions expected:**
- Do duplicates count separately, and is k 1-based?
- Can I modify the input array, and does the data fit in memory?

**Code / implementation expected:** Yes — a size-k \`PriorityQueue\` and quickselect on an \`int[]\` in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Java arrays, loops and generics; heaps are explained from scratch on the linked page.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school runs a race with 100,000 runners and wants to give a medal to the runner who finished **10th fastest**. There are three ways to find them.

1. **Line everybody up by time** and count to the 10th. That works, but sorting 100,000 people is a lot of shuffling just to find one.
2. **Keep a podium of 10 places.** As each runner crosses the line, compare them with the *slowest* person currently on the podium. If the new runner is faster, the slowest steps down and the new runner steps up. At the end, the slowest person on the podium is the 10th fastest. You only ever look at 10 people, and you could do this while the race is still running.
3. **Pick a runner at random and split the crowd** into "faster than them" and "slower than them". If exactly 9 people are faster, the chosen runner *is* the answer. If 500 are faster, the answer is somewhere in that group — ignore everybody else and split again. Each split throws most of the crowd away.

Way 2 is the **heap** method and way 3 is **quickselect**. Both are much better than sorting, and the interesting part of this question — the part interviewers really ask about — is knowing *which one to use when*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k counted from 1, and do duplicates count separately? | In \`[3, 2, 3, 1]\` the 2nd largest is 3 if duplicates count (the usual version), 2 if you want distinct values. |
| Do all the numbers fit in memory, or do they arrive as a stream? | A stream (or data too big for memory) rules out quickselect; the size-k heap only needs k values at a time. |
| Is k small compared with n, or could it be close to n? | O(n log k) is almost linear for small k; for k near n, flip it and look for the (n − k + 1)th smallest instead. |
| Am I allowed to reorder the input array? | Quickselect rearranges the array in place; if not allowed, it must work on an O(n) copy. |
| Do you need the worst case guaranteed, or is the average fine? | Quickselect is O(n) on average but O(n²) in the worst case; the heap is O(n log k) every time. |
| Will you ask many different k on the same data? | Then sort once (O(n log n)) and answer each query in O(1). |

## 3. Three Ways to Do It

📌 **Interview term: Kth largest element** — the value that would sit at position k if you sorted the array from largest to smallest, counting duplicates. In ascending order it is at index n − k (0-based).

**Way 1 — sort.** Sort ascending and return \`a[n - k]\`. O(n log n) time. Simple, correct, and a fine first answer to *say*, but the interviewer will ask for better.

**Way 2 — a min-heap of size k.** Walk through the numbers and keep the k largest seen so far in a [min-heap](/interview-question/what-is-a-heap-priority-queue). The root of that heap is the *smallest* of the top k — the gatekeeper. A new number only gets in if it beats the gatekeeper, and then the gatekeeper is thrown out.

📌 **Interview term: Size-k heap (bounded heap)** — a heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored. Each step costs O(log k), so n items cost O(n log k).

Why a *min*-heap for the *largest* values? Because the question we keep asking is "is this new number bigger than the weakest member of the top k?", and the weakest member is the minimum. A max-heap would have to hold all n numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each new number is compared with the root of a min-heap holding the k largest so far. If it is larger, it replaces the root. Otherwise it is ignored">
  <defs>
    <marker id="b19q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="110" text-anchor="middle">next number x</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">one pass over n</text>
  <path class="d-edge" d="M 164 115 L 222 115" marker-end="url(#b19q2-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">x bigger than root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = smallest of top k</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q2-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q2-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">sift down, O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore x</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison, O(1)</text>
</svg>

When the pass ends, the heap holds exactly the k largest values, and its root is the kth largest. Most numbers take the cheap "ignore" branch: in example 2, out of 100,000 random numbers only 105 ever entered a heap of size 10.

**Way 3 — quickselect.** Borrow the partition step from quicksort. Pick a pivot, move everything smaller to its left and everything else to its right; now the pivot sits exactly where it would be in sorted order. If that position is n − k, you are done. Otherwise **keep only the side that contains position n − k** and repeat. Quicksort recurses into both sides; quickselect recurses into one, and that is the whole difference. The full walk-through has its own page: [how quickselect finds the kth smallest/largest element](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

📌 **Interview term: Partition** — rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right. One partition of m items costs m − 1 comparisons.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="After a partition the array has smaller values, then the pivot at its final index p, then larger values. If the target index is to the right of p, only the right part is searched next">
  <defs>
    <marker id="b19q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="270" height="56" rx="6"/>
  <text class="d-text" x="165" y="64" text-anchor="middle">smaller than pivot</text>
  <text class="d-sub" x="165" y="84" text-anchor="middle">thrown away</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="56" rx="6"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">pivot</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">index p</text>
  <rect class="d-box" x="390" y="40" width="260" height="56" rx="6"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">larger or equal</text>
  <text class="d-sub" x="520" y="84" text-anchor="middle">target n - k is here</text>
  <path class="d-edge-accent" d="M 520 102 L 520 146" marker-end="url(#b19q2-b)"/>
  <rect class="d-box" x="390" y="152" width="260" height="50" rx="6"/>
  <text class="d-text" x="520" y="182" text-anchor="middle">partition only this part next</text>
</svg>

If the pivot lands at index p and the target index n − k is greater than p, the answer must be in the right part, so the left part and the pivot are never looked at again. With a good pivot each round keeps about half, so the total work is about n + n/2 + n/4 + ... ≈ 2n comparisons.

📌 **Interview term: Expected (average) O(n)** — the running time averaged over the random pivot choices, for any input. A random pivot makes the bad case extremely unlikely, but it does not make it impossible.

## 4. The Catch: Quickselect Has a Worst Case

If every pivot happens to be the largest (or smallest) value in its range, each round throws away only one element: n − 1, then n − 2, then n − 3 comparisons... about n²/2 in total. Two inputs trigger this:

- **A sorted array with a fixed pivot rule** (always the last element). Example 2 runs this on 3,000 sorted numbers: **4,498,500** comparisons, exactly 3000 · 2999 / 2. The same input with a random pivot took **8,314**.
- **Many equal values with a two-way partition.** If every value equals the pivot, none is "smaller", so the pivot lands at the far left every time. On 3,000 copies of 5, example 2 counts **3,375,749** comparisons even with a random pivot. A **three-way partition** (smaller / equal / larger) finishes in one pass: **3,000** comparisons.

📌 **Interview term: Three-way partition (Dutch national flag)** — partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²).

There is a deterministic fix, too: the **median of medians** pivot rule guarantees O(n) in the worst case, but its constant factor is large and it is rarely written in interviews. Mention it by name; you will not be asked to code it.

📌 **Interview term: Median of medians** — a pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant.

## 5. When to Choose Which

| Situation | Pick | Why |
| :--- | :--- | :--- |
| One-off query, all data in memory, you may reorder it | Quickselect | Average O(n), O(1) extra space |
| Data arrives as a stream, or does not fit in memory | Size-k heap | Needs only k values at once; one pass |
| k is small (say k ≤ 100) and n is large | Size-k heap | O(n log k) is close to O(n), no worst case, no mutation |
| You need a guaranteed bound (latency-critical, adversarial input) | Size-k heap (or sort) | Quickselect can hit O(n²) |
| The input must not be modified | Size-k heap | Quickselect needs an O(n) copy |
| Many different k on the same data | Sort once | O(n log n) once, then O(1) per query |
| You also need the k values themselves, in order | Heap (then pop) or quickselect + sort the k | Both give the top k; only sorting orders them |

A good spoken answer: *"If I can reorder the array and want the fastest average, quickselect with a random pivot and three-way partition; if the data is streaming, huge, read-only, or I need a guaranteed bound, a size-k min-heap in O(n log k)."*

The same size-k heap answers [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin) — only the key changes. For a stream where the rank you want moves (the middle), you need two heaps instead: [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream).

## 6. The Code in Java

### The size-k heap

\`java.util.PriorityQueue\` is a **min-heap** by natural order, which is exactly the gatekeeper we want: \`heap.peek()\` is the smallest of the k largest so far. (More on the class itself in [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue).)

~~~java
// Keep the k largest values seen so far in a min-heap of size k.
static int kthLargestHeap(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>(k);   // min-heap by natural order
    for (int x : nums) {
        if (heap.size() < k) heap.offer(x);
        else if (x > heap.peek()) {          // bigger than the smallest of the top k
            heap.poll();
            heap.offer(x);
        }
    }
    return heap.peek();                       // the smallest of the k largest
}
~~~

- \`new PriorityQueue<>(k)\` only sets the initial capacity, so the backing array never has to grow; it is not a size limit. The \`heap.size() < k\` check is what bounds it.
- \`poll()\` then \`offer(x)\` is two O(log k) sifts. Java's \`PriorityQueue\` has no single "replace the top" call; that is fine, the cost is still O(log k).
- \`x > heap.peek()\` compares an \`int\` with an \`Integer\`, so Java unboxes \`peek()\` to an \`int\` and compares values. Between two \`Integer\`s, \`<\` and \`>\` also unbox and compare values; only \`==\` is the trap, because it compares object references.
- Every value that enters the heap is **boxed** into an \`Integer\` object. For k = 10 that is nothing; a max-heap of all n values would box all n.

### Quickselect on the primitive array

~~~java
// Iterative quickselect with a random pivot. Works on a copy.
static int kthLargestQuickselect(int[] nums, int k) {
    int[] a = nums.clone();
    int target = a.length - k;                // kth largest = index n-k in sorted order
    int lo = 0, hi = a.length - 1;
    while (true) {
        int p = ThreadLocalRandom.current().nextInt(lo, hi + 1);
        swap(a, p, hi);                       // move the pivot to the end
        int pivot = a[hi], store = lo;
        for (int i = lo; i < hi; i++) {       // Lomuto partition: smaller values to the left
            if (a[i] < pivot) swap(a, i, store++);
        }
        swap(a, store, hi);                   // pivot lands in its final position
        if (store == target) return a[store];
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
}
~~~

- \`ThreadLocalRandom.current().nextInt(lo, hi + 1)\` returns a random int from \`lo\` (inclusive) to \`hi + 1\` (exclusive) — note the \`+ 1\`. A random pivot means no fixed input is always slow.
- \`nums.clone()\` copies the \`int[]\` so the caller's array keeps its order. Drop it if mutation is allowed.
- It works on \`int[]\` with no boxing at all, which is why it is also the lighter choice in memory.
- It is a loop rather than recursion, so there is no stack depth to worry about in the worst case.
- Example 2 adds a **three-way partition** version (the [Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) loop) for inputs full of duplicates:

~~~java
// Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
static long[] quickselect3way(int[] nums, int k) {
    int[] a = nums.clone();
    int target = a.length - k, lo = 0, hi = a.length - 1;
    long comps = 0;
    while (true) {
        int pivot = a[lo + randBelow(hi - lo + 1)];
        int lt = lo, i = lo, gt = hi;
        while (i <= gt) {
            comps++;
            if (a[i] < pivot) swap(a, lt++, i++);
            else if (a[i] > pivot) swap(a, i, gt--);
            else i++;
        }
        if (target < lt) hi = lt - 1;
        else if (target > gt) lo = gt + 1;
        else return new long[] {pivot, comps};
    }
}
~~~

### The sort baseline

~~~java
int[] copy = nums.clone();
Arrays.sort(copy);
int kth = copy[copy.length - k];
~~~

For \`int[]\`, the [\`Arrays.sort\` Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html#sort(int%5B%5D)) describes the algorithm as a Dual-Pivot Quicksort with O(n log n) performance on many data sets. Java has no built-in selection (no equivalent of C++'s \`nth_element\`), so quickselect is written by hand.

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 uses a small deterministic random generator (MINSTD) for both the data and the pivots, so the counts are identical in every language.

**Example 1 — both methods on six inputs:**

~~~text
heap 5, quickselect 5
heap 4, quickselect 4
heap 1, quickselect 1
heap 7, quickselect 7
heap -5, quickselect -5
heap 2, quickselect 2
~~~

**Example 2 — counting the work, including the two worst cases:**

~~~text
random n=100000, k=10: answer 999939 (sorted: 999939)
  heap of size 10: 105 values entered the heap
  quickselect, random pivot: answer 999939, 167646 comparisons
sorted n=3000, k=3000, last-element pivot: answer 1, 4498500 comparisons
sorted n=3000, k=3000, random pivot:       answer 1, 8314 comparisons
all equal n=3000, two-way partition:       answer 5, 3375749 comparisons
all equal n=3000, three-way partition:     answer 5, 3000 comparisons
~~~

Reading the numbers: on 100,000 random values only 105 ever passed the gatekeeper of a size-10 heap (10 + about 10 · ln(100000 / 10) ≈ 102 is what theory predicts for random order), and quickselect needed 167,646 comparisons — under 2n. A sorted input with a last-element pivot costs exactly 3000 · 2999 / 2 = 4,498,500 comparisons, and all-equal values hurt the two-way partition even with a random pivot, while the three-way partition finishes in one pass. The comparison counters are \`long\`: the worst case grows like n²/2, which passes \`Integer.MAX_VALUE\` at around n = 65,536.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`Arrays.sort\` + index | O(n log n) | O(n) for the copy | simplest; best if many k are asked |
| size-k \`PriorityQueue\` | O(n log k) | O(k) boxed \`Integer\`s | streaming-friendly; input untouched |
| quickselect, random pivot | O(n) average, O(n²) worst | O(n) for the copy, O(1) in place | primitive \`int[]\`, no boxing |
| quickselect, three-way partition | O(n) average | as above | handles many duplicates |

## 9. Edge Cases

- **k = 1** — the maximum. Both methods work; a single linear scan is simplest.
- **k = n** — the minimum. The heap holds all n values (O(n log n)); quickselect targets index 0. Example 1 runs \`[-1, -5, 3, 0]\` with k = 4 and gets −5.
- **Duplicates** — \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with k = 4 gives 4 (the sorted order is 6, 5, 5, 4, ...): duplicates count. All-equal input is the quickselect trap from section 4.
- **One element** — \`[1]\`, k = 1 returns 1; quickselect partitions a range of size one and stops.
- **Negative numbers** — nothing special for either method, as long as no code uses 0 or −1 as a "missing" marker.
- **Invalid k** (k < 1 or k > n) — not a valid question; ask the interviewer whether to raise an error or return a sentinel.

## Common Pitfalls

- **A max-heap of all n values** (\`new PriorityQueue<>(Collections.reverseOrder())\` and poll k times). Works, but O(n) boxed objects and no streaming; the point is a heap of size k.
- **\`nextInt(lo, hi)\` instead of \`nextInt(lo, hi + 1)\`.** The upper bound is exclusive, so the last index is never picked as a pivot — and a range of size one throws \`IllegalArgumentException\` because origin equals bound.
- **An \`int\` comparison counter or an \`a - b\` comparator.** Counters overflow on large worst cases; comparators overflow on extreme values. Use \`long\` and \`Integer.compare\`.
- **Fixed pivot on sorted input.** O(n²) — 4,498,500 comparisons for n = 3,000 in example 2.
- **Two-way partition on duplicate-heavy data.** Still O(n²) with a random pivot; use the three-way partition.
- **Forgetting that quickselect reorders the array** — \`clone()\` it if the caller still needs the original order.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[n - k]</code> is O(n log n); both better methods beat it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;Integer&gt;</code> of size k — it is a min-heap, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> is the smallest of the top k, and a new value replaces it only if larger. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> around a random pivot and keep only the side that holds index n − k: O(n) on average, O(n²) worst case, and it reorders the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choice:</strong> <span style="color:#f0e2c8;">Quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;">The heap boxes values into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>; quickselect works on the primitive array. I pick the pivot with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ThreadLocalRandom.current().nextInt(lo, hi + 1)</code> and count work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a min-heap to find the largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The only question per element is "does it beat the weakest of the current top k?". The weakest is the minimum, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>'s natural min-heap order puts it at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code>. A max-heap would need all n values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make quickselect safe against bad inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A random pivot so no fixed input is always bad, and a three-way partition so duplicates do not degrade it. In our run a sorted input with a last-element pivot cost 4,498,500 comparisons; with a random pivot, 8,314.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.sort</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n log n) and perfectly fine to state first. But it does more work than needed for a single rank, and it needs all the data in memory; the heap is O(n log k) and streams, quickselect is O(n) on average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if numbers arrive one at a time, say from a Kafka consumer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> between messages; each new value costs O(log k) and the answer is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code>. Quickselect needs all the data at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is close to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Flip it: the kth largest is the (n − k + 1)th smallest, so keep a max-heap (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code>) of size n − k + 1. The heap stays small and the cost is O(n log(n − k)).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kth largest element** | The value that would sit at position k if you sorted the array from largest to smallest, counting duplicates |
| **Size-k heap (bounded heap)** | A heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored |
| **Partition** | Rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right |
| **Expected (average) O(n)** | The running time averaged over the random pivot choices, for any input |
| **Three-way partition (Dutch national flag)** | Partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²) |
| **Median of medians** | A pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant |

---
**Conclusion:** The Kth largest element has two good answers and the interview is really about choosing between them. A size-k \`PriorityQueue\` is O(n log k), uses O(k) memory, never touches the input and works on a stream; quickselect on the \`int[]\` is O(n) on average with no boxing, but it reorders the array and has an O(n²) worst case that a random pivot and a three-way partition make unlikely. In Java, watch the exclusive bound of \`nextInt\`, use \`long\` counters and \`Integer.compare\`, and remember that \`PriorityQueue\` is already the min-heap you need.`,
        examples: [
          {
            label: "Kth largest: size-k min-heap and random-pivot quickselect on six inputs",
            code: `import java.util.PriorityQueue;
import java.util.concurrent.ThreadLocalRandom;

public class Main {
    // Keep the k largest values seen so far in a min-heap of size k.
    static int kthLargestHeap(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(k);   // min-heap by natural order
        for (int x : nums) {
            if (heap.size() < k) heap.offer(x);
            else if (x > heap.peek()) {          // bigger than the smallest of the top k
                heap.poll();
                heap.offer(x);
            }
        }
        return heap.peek();                       // the smallest of the k largest
    }

    // Iterative quickselect with a random pivot. Works on a copy.
    static int kthLargestQuickselect(int[] nums, int k) {
        int[] a = nums.clone();
        int target = a.length - k;                // kth largest = index n-k in sorted order
        int lo = 0, hi = a.length - 1;
        while (true) {
            int p = ThreadLocalRandom.current().nextInt(lo, hi + 1);
            swap(a, p, hi);                       // move the pivot to the end
            int pivot = a[hi], store = lo;
            for (int i = lo; i < hi; i++) {       // Lomuto partition: smaller values to the left
                if (a[i] < pivot) swap(a, i, store++);
            }
            swap(a, store, hi);                   // pivot lands in its final position
            if (store == target) return a[store];
            if (store < target) lo = store + 1;
            else hi = store - 1;
        }
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static String both(int[] nums, int k) {
        return "heap " + kthLargestHeap(nums, k) + ", quickselect " + kthLargestQuickselect(nums, k);
    }

    public static void main(String[] args) {
        System.out.println(both(new int[] {3, 2, 1, 5, 6, 4}, 2));          // heap 5, quickselect 5
        System.out.println(both(new int[] {3, 2, 3, 1, 2, 4, 5, 5, 6}, 4)); // heap 4, quickselect 4
        System.out.println(both(new int[] {1}, 1));                         // heap 1, quickselect 1
        System.out.println(both(new int[] {7, 7, 7, 7}, 2));                // heap 7, quickselect 7
        System.out.println(both(new int[] {-1, -5, 3, 0}, 4));              // heap -5, quickselect -5
        System.out.println(both(new int[] {2, 1}, 1));                      // heap 2, quickselect 2
    }
}`,
          },
          {
            label: "Counting the work: heap entries, quickselect comparisons, worst cases",
            code: `import java.util.Arrays;
import java.util.PriorityQueue;

public class Main {
    static long seed = 7;

    // MINSTD generator, the same in every language, so the counts match.
    static int randBelow(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    // Kth largest with a size-k min-heap; also count how many values got in.
    static int[] heapEntries(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(k);
        int entries = 0;
        for (int x : nums) {
            if (heap.size() < k) { heap.offer(x); entries++; }
            else if (x > heap.peek()) { heap.poll(); heap.offer(x); entries++; }
        }
        return new int[] {heap.peek(), entries};
    }

    // Lomuto quickselect; returns {answer, comparisons with the pivot}.
    static long[] quickselect(int[] nums, int k, String pivotRule) {
        int[] a = nums.clone();
        int target = a.length - k, lo = 0, hi = a.length - 1;
        long comps = 0;
        while (true) {
            int p = pivotRule.equals("last") ? hi : lo + randBelow(hi - lo + 1);
            swap(a, p, hi);
            int pivot = a[hi], store = lo;
            for (int i = lo; i < hi; i++) {
                comps++;
                if (a[i] < pivot) swap(a, i, store++);
            }
            swap(a, store, hi);
            if (store == target) return new long[] {a[store], comps};
            if (store < target) lo = store + 1;
            else hi = store - 1;
        }
    }

    // Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
    static long[] quickselect3way(int[] nums, int k) {
        int[] a = nums.clone();
        int target = a.length - k, lo = 0, hi = a.length - 1;
        long comps = 0;
        while (true) {
            int pivot = a[lo + randBelow(hi - lo + 1)];
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                comps++;
                if (a[i] < pivot) swap(a, lt++, i++);
                else if (a[i] > pivot) swap(a, i, gt--);
                else i++;
            }
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else return new long[] {pivot, comps};
        }
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    public static void main(String[] args) {
        int n = 100000, k = 10;
        int[] data = new int[n];
        for (int i = 0; i < n; i++) data[i] = randBelow(1000000);
        int[] he = heapEntries(data, k);
        int[] sorted = data.clone();
        Arrays.sort(sorted);
        System.out.println("random n=100000, k=10: answer " + he[0] + " (sorted: " + sorted[n - k] + ")");
        System.out.println("  heap of size 10: " + he[1] + " values entered the heap");
        long[] r = quickselect(data, k, "random");
        System.out.println("  quickselect, random pivot: answer " + r[0] + ", " + r[1] + " comparisons");

        int m = 3000;
        int[] ascending = new int[m];
        for (int i = 0; i < m; i++) ascending[i] = i + 1;
        r = quickselect(ascending, m, "last");
        System.out.println("sorted n=3000, k=3000, last-element pivot: answer " + r[0] + ", " + r[1] + " comparisons");
        r = quickselect(ascending, m, "random");
        System.out.println("sorted n=3000, k=3000, random pivot:       answer " + r[0] + ", " + r[1] + " comparisons");
        int[] same = new int[m];
        Arrays.fill(same, 5);
        r = quickselect(same, 1500, "random");
        System.out.println("all equal n=3000, two-way partition:       answer " + r[0] + ", " + r[1] + " comparisons");
        r = quickselect3way(same, 1500);
        System.out.println("all equal n=3000, three-way partition:     answer " + r[0] + ", " + r[1] + " comparisons");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an unsorted \`std::vector<int>\` and a number k, return the kth largest element — duplicates count. Write it in C++. Then tell me: would you use a heap or quickselect, and when would you choose the other one? What does the standard library already give you?"

**What a strong answer should cover:**
- The baseline: \`std::sort\` and index \`a[n - k]\`, O(n log n).
- A min-heap of size k (the root is the gatekeeper): O(n log k) time, O(k) space, works on a stream and never modifies the input.
- Quickselect: partition, keep only the side holding index n − k; average O(n), worst case O(n²); random pivot, and a three-way partition for duplicates.
- The decision: quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.
- C++ specifics: \`std::priority_queue\` is a max-heap, so the size-k gatekeeper needs \`std::greater<int>\`; \`std::nth_element\` is the library quickselect (average linear); \`std::mt19937\` with \`uniform_int_distribution\` for the pivot rather than \`rand() % n\`; pass the vector by value if the caller must keep its order.

**Clarifying questions expected:**
- Do duplicates count separately, and is k 1-based?
- Can I modify the input, and does the data fit in memory?

**Code / implementation expected:** Yes — a size-k \`priority_queue\` with \`std::greater\`, and either a hand-written quickselect or \`std::nth_element\` in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need \`std::vector\`, loops and a little template syntax; heaps are explained from scratch on the linked page.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school runs a race with 100,000 runners and wants to give a medal to the runner who finished **10th fastest**. There are three ways to find them.

1. **Line everybody up by time** and count to the 10th. That works, but sorting 100,000 people is a lot of shuffling just to find one.
2. **Keep a podium of 10 places.** As each runner crosses the line, compare them with the *slowest* person currently on the podium. If the new runner is faster, the slowest steps down and the new runner steps up. At the end, the slowest person on the podium is the 10th fastest. You only ever look at 10 people, and you could do this while the race is still running.
3. **Pick a runner at random and split the crowd** into "faster than them" and "slower than them". If exactly 9 people are faster, the chosen runner *is* the answer. If 500 are faster, the answer is somewhere in that group — ignore everybody else and split again. Each split throws most of the crowd away.

Way 2 is the **heap** method and way 3 is **quickselect**. Both are much better than sorting, and the interesting part of this question — the part interviewers really ask about — is knowing *which one to use when*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k counted from 1, and do duplicates count separately? | In \`[3, 2, 3, 1]\` the 2nd largest is 3 if duplicates count (the usual version), 2 if you want distinct values. |
| Do all the numbers fit in memory, or do they arrive as a stream? | A stream (or data too big for memory) rules out quickselect; the size-k heap only needs k values at a time. |
| Is k small compared with n, or could it be close to n? | O(n log k) is almost linear for small k; for k near n, flip it and look for the (n − k + 1)th smallest instead. |
| Am I allowed to reorder the input array? | Quickselect rearranges the array in place; if not allowed, it must work on an O(n) copy. |
| Do you need the worst case guaranteed, or is the average fine? | Quickselect is O(n) on average but O(n²) in the worst case; the heap is O(n log k) every time. |
| Will you ask many different k on the same data? | Then sort once (O(n log n)) and answer each query in O(1). |

## 3. Three Ways to Do It

📌 **Interview term: Kth largest element** — the value that would sit at position k if you sorted the array from largest to smallest, counting duplicates. In ascending order it is at index n − k (0-based).

**Way 1 — sort.** Sort ascending and return \`a[n - k]\`. O(n log n) time. Simple, correct, and a fine first answer to *say*, but the interviewer will ask for better.

**Way 2 — a min-heap of size k.** Walk through the numbers and keep the k largest seen so far in a [min-heap](/interview-question/what-is-a-heap-priority-queue). The root of that heap is the *smallest* of the top k — the gatekeeper. A new number only gets in if it beats the gatekeeper, and then the gatekeeper is thrown out.

📌 **Interview term: Size-k heap (bounded heap)** — a heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored. Each step costs O(log k), so n items cost O(n log k).

Why a *min*-heap for the *largest* values? Because the question we keep asking is "is this new number bigger than the weakest member of the top k?", and the weakest member is the minimum. A max-heap would have to hold all n numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each new number is compared with the root of a min-heap holding the k largest so far. If it is larger, it replaces the root. Otherwise it is ignored">
  <defs>
    <marker id="b19q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="110" text-anchor="middle">next number x</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">one pass over n</text>
  <path class="d-edge" d="M 164 115 L 222 115" marker-end="url(#b19q2-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">x bigger than root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = smallest of top k</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q2-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q2-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">sift down, O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore x</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison, O(1)</text>
</svg>

When the pass ends, the heap holds exactly the k largest values, and its root is the kth largest. Most numbers take the cheap "ignore" branch: in example 2, out of 100,000 random numbers only 105 ever entered a heap of size 10.

**Way 3 — quickselect.** Borrow the partition step from quicksort. Pick a pivot, move everything smaller to its left and everything else to its right; now the pivot sits exactly where it would be in sorted order. If that position is n − k, you are done. Otherwise **keep only the side that contains position n − k** and repeat. Quicksort recurses into both sides; quickselect recurses into one, and that is the whole difference. The full walk-through has its own page: [how quickselect finds the kth smallest/largest element](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

📌 **Interview term: Partition** — rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right. One partition of m items costs m − 1 comparisons.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="After a partition the array has smaller values, then the pivot at its final index p, then larger values. If the target index is to the right of p, only the right part is searched next">
  <defs>
    <marker id="b19q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="270" height="56" rx="6"/>
  <text class="d-text" x="165" y="64" text-anchor="middle">smaller than pivot</text>
  <text class="d-sub" x="165" y="84" text-anchor="middle">thrown away</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="56" rx="6"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">pivot</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">index p</text>
  <rect class="d-box" x="390" y="40" width="260" height="56" rx="6"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">larger or equal</text>
  <text class="d-sub" x="520" y="84" text-anchor="middle">target n - k is here</text>
  <path class="d-edge-accent" d="M 520 102 L 520 146" marker-end="url(#b19q2-b)"/>
  <rect class="d-box" x="390" y="152" width="260" height="50" rx="6"/>
  <text class="d-text" x="520" y="182" text-anchor="middle">partition only this part next</text>
</svg>

If the pivot lands at index p and the target index n − k is greater than p, the answer must be in the right part, so the left part and the pivot are never looked at again. With a good pivot each round keeps about half, so the total work is about n + n/2 + n/4 + ... ≈ 2n comparisons.

📌 **Interview term: Expected (average) O(n)** — the running time averaged over the random pivot choices, for any input. A random pivot makes the bad case extremely unlikely, but it does not make it impossible.

## 4. The Catch: Quickselect Has a Worst Case

If every pivot happens to be the largest (or smallest) value in its range, each round throws away only one element: n − 1, then n − 2, then n − 3 comparisons... about n²/2 in total. Two inputs trigger this:

- **A sorted array with a fixed pivot rule** (always the last element). Example 2 runs this on 3,000 sorted numbers: **4,498,500** comparisons, exactly 3000 · 2999 / 2. The same input with a random pivot took **8,314**.
- **Many equal values with a two-way partition.** If every value equals the pivot, none is "smaller", so the pivot lands at the far left every time. On 3,000 copies of 5, example 2 counts **3,375,749** comparisons even with a random pivot. A **three-way partition** (smaller / equal / larger) finishes in one pass: **3,000** comparisons.

📌 **Interview term: Three-way partition (Dutch national flag)** — partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²).

There is a deterministic fix, too: the **median of medians** pivot rule guarantees O(n) in the worst case, but its constant factor is large and it is rarely written in interviews. Mention it by name; you will not be asked to code it.

📌 **Interview term: Median of medians** — a pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant.

## 5. When to Choose Which

| Situation | Pick | Why |
| :--- | :--- | :--- |
| One-off query, all data in memory, you may reorder it | Quickselect | Average O(n), O(1) extra space |
| Data arrives as a stream, or does not fit in memory | Size-k heap | Needs only k values at once; one pass |
| k is small (say k ≤ 100) and n is large | Size-k heap | O(n log k) is close to O(n), no worst case, no mutation |
| You need a guaranteed bound (latency-critical, adversarial input) | Size-k heap (or sort) | Quickselect can hit O(n²) |
| The input must not be modified | Size-k heap | Quickselect needs an O(n) copy |
| Many different k on the same data | Sort once | O(n log n) once, then O(1) per query |
| You also need the k values themselves, in order | Heap (then pop) or quickselect + sort the k | Both give the top k; only sorting orders them |

A good spoken answer: *"If I can reorder the array and want the fastest average, quickselect with a random pivot and three-way partition; if the data is streaming, huge, read-only, or I need a guaranteed bound, a size-k min-heap in O(n log k)."*

The same size-k heap answers [the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [the k closest points to the origin](/interview-question/how-do-you-find-the-k-closest-points-to-the-origin) — only the key changes. For a stream where the rank you want moves (the middle), you need two heaps instead: [the median of a data stream](/interview-question/how-do-you-find-the-median-from-a-data-stream).

## 6. The Code in C++

### The size-k heap

\`std::priority_queue<int>\` is a **max-heap** by default. The gatekeeper must be the *smallest* of the top k, so we declare a min-heap with \`std::greater<int>\`. (More on the adaptor in [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue).)

~~~cpp
// Keep the k largest values seen so far in a min-heap of size k.
int kthLargestHeap(const std::vector<int>& nums, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;   // min-heap
    for (int x : nums) {
        if ((int)heap.size() < k) heap.push(x);
        else if (x > heap.top()) {               // bigger than the smallest of the top k
            heap.pop();
            heap.push(x);
        }
    }
    return heap.top();                            // the smallest of the k largest
}
~~~

- \`heap.top()\` reads the root; \`heap.pop()\` removes it and returns \`void\`, so the replace step is \`pop()\` then \`push(x)\` — two O(log k) sifts.
- \`(int)heap.size() < k\` casts because \`size()\` is unsigned (\`size_t\`); comparing it with a signed \`int\` triggers a sign-compare warning and, for negative values, a wrong answer.
- Forgetting \`std::greater<int>\` is the classic bug: with the default max-heap the root is the *largest* of the kept values, the gatekeeper test is meaningless, and the function returns the wrong element.

### Quickselect by hand

~~~cpp
// Iterative quickselect with a random pivot. Takes a copy.
int kthLargestQuickselect(std::vector<int> a, int k) {
    static std::mt19937 rng(std::random_device{}());
    int target = (int)a.size() - k;               // kth largest = index n-k in sorted order
    int lo = 0, hi = (int)a.size() - 1;
    while (true) {
        int p = std::uniform_int_distribution<int>(lo, hi)(rng);
        std::swap(a[p], a[hi]);                   // move the pivot to the end
        int pivot = a[hi], store = lo;
        for (int i = lo; i < hi; i++) {           // Lomuto partition: smaller values to the left
            if (a[i] < pivot) std::swap(a[i], a[store++]);
        }
        std::swap(a[store], a[hi]);               // pivot lands in its final position
        if (store == target) return a[store];
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
}
~~~

- \`std::mt19937\` seeded from \`std::random_device\` with \`std::uniform_int_distribution<int>(lo, hi)\` gives an unbiased random index in \`[lo, hi]\` (both ends included). \`rand() % n\` is the old way: low quality and slightly biased.
- The vector is taken **by value**, so the function partitions its own copy and the caller's order is untouched. Take it by reference to save the copy when mutation is allowed.
- It is a loop, not recursion, so there is no stack depth to worry about in the worst case.
- Example 2 adds a **three-way partition** version (the [Dutch national flag](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) loop) for inputs full of duplicates:

~~~cpp
// Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
std::pair<int, long long> quickselect3way(std::vector<int> a, int k) {
    int target = (int)a.size() - k, lo = 0, hi = (int)a.size() - 1;
    long long comps = 0;
    while (true) {
        int pivot = a[lo + randBelow(hi - lo + 1)];
        int lt = lo, i = lo, gt = hi;
        while (i <= gt) {
            comps++;
            if (a[i] < pivot) std::swap(a[lt++], a[i++]);
            else if (a[i] > pivot) std::swap(a[i], a[gt--]);
            else i++;
        }
        if (target < lt) hi = lt - 1;
        else if (target > gt) lo = gt + 1;
        else return {pivot, comps};
    }
}
~~~

### The library quickselect: \`std::nth_element\`

~~~cpp
#include <algorithm>
#include <functional>

std::vector<int> v = {3, 2, 3, 1, 2, 4, 5, 5, 6};
int k = 4;
std::nth_element(v.begin(), v.begin() + (k - 1), v.end(), std::greater<int>());
int kth = v[k - 1];   // 4: everything before it is >= 4, everything after is <= 4
~~~

\`std::nth_element\` puts the element that would be at that position in sorted order exactly there, with smaller-or-equal elements on one side and the rest on the other. With \`std::greater<int>()\` the order is descending, so position \`k - 1\` is the kth largest; in our run this printed 4, and the ascending form \`nth_element(w.begin(), w.begin() + (n - 2), w.end())\` on \`{3, 2, 1, 5, 6, 4}\` gave 5. [cppreference](https://en.cppreference.com/w/cpp/algorithm/nth_element) gives its complexity as linear on average and says it is typically implemented with introselect — quickselect that switches to a safe fallback when the recursion gets too deep. In a real C++ codebase this one line is the right answer; in an interview, say it first and then write quickselect if asked.

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 uses a small deterministic random generator (MINSTD) for both the data and the pivots, so the counts are identical in every language.

**Example 1 — both methods on six inputs:**

~~~text
heap 5, quickselect 5
heap 4, quickselect 4
heap 1, quickselect 1
heap 7, quickselect 7
heap -5, quickselect -5
heap 2, quickselect 2
~~~

**Example 2 — counting the work, including the two worst cases:**

~~~text
random n=100000, k=10: answer 999939 (sorted: 999939)
  heap of size 10: 105 values entered the heap
  quickselect, random pivot: answer 999939, 167646 comparisons
sorted n=3000, k=3000, last-element pivot: answer 1, 4498500 comparisons
sorted n=3000, k=3000, random pivot:       answer 1, 8314 comparisons
all equal n=3000, two-way partition:       answer 5, 3375749 comparisons
all equal n=3000, three-way partition:     answer 5, 3000 comparisons
~~~

Reading the numbers: on 100,000 random values only 105 ever passed the gatekeeper of a size-10 heap (10 + about 10 · ln(100000 / 10) ≈ 102 is what theory predicts for random order), and quickselect needed 167,646 comparisons — under 2n. A sorted input with a last-element pivot costs exactly 3000 · 2999 / 2 = 4,498,500 comparisons, and all-equal values hurt the two-way partition even with a random pivot, while the three-way partition finishes in one pass. The counters are \`long long\` because the worst case grows like n²/2, which overflows a 32-bit \`int\` from about n = 65,536 — and signed overflow is undefined behaviour in C++.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`std::sort\` + index | O(n log n) | O(n) for a copy | simplest; best if many k are asked |
| size-k \`priority_queue\` with \`std::greater\` | O(n log k) | O(k) | streaming-friendly; input untouched |
| hand-written quickselect, random pivot | O(n) average, O(n²) worst | O(n) for the copy, O(1) in place | loop, no recursion |
| \`std::nth_element\` | linear on average | in place | the library version; reorders the range |
| \`std::partial_sort\` of the first k | O(n log k) | in place | when you also need the top k sorted |

## 9. Edge Cases

- **k = 1** — the maximum. Both methods work; a single linear scan is simplest.
- **k = n** — the minimum. The heap holds all n values (O(n log n)); quickselect targets index 0. Example 1 runs \`[-1, -5, 3, 0]\` with k = 4 and gets −5.
- **Duplicates** — \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with k = 4 gives 4 (the sorted order is 6, 5, 5, 4, ...): duplicates count. All-equal input is the quickselect trap from section 4.
- **One element** — \`[1]\`, k = 1 returns 1; quickselect partitions a range of size one and stops.
- **Negative numbers** — nothing special for either method, as long as no code uses 0 or −1 as a "missing" marker.
- **Invalid k** (k < 1 or k > n) — not a valid question; ask the interviewer whether to raise an error or return a sentinel.

## Common Pitfalls

- **Default \`std::priority_queue<int>\` as the gatekeeper.** It is a max-heap; the size-k trick needs \`std::greater<int>\`.
- **Off-by-one with \`nth_element\`.** Descending: position \`k - 1\`. Ascending: position \`n - k\`. Mixing the two returns the wrong rank.
- **\`rand() % (hi - lo + 1)\`** for the pivot — biased and low quality; use \`std::mt19937\` with \`uniform_int_distribution\`.
- **Signed/unsigned mix-ups.** \`heap.size() < k\` with a negative or \`int\` k, or \`size_t\` indexes that go below zero in a partition loop.
- **Fixed pivot on sorted input, or a two-way partition on duplicates.** O(n²) — example 2 counts 4,498,500 and 3,375,749 comparisons.
- **\`int\` counters on large inputs.** n²/2 overflows; signed overflow is undefined behaviour.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[n - k]</code> is O(n log n); both better methods beat it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code> of size k; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> is the smallest of the top k, and a new value replaces it only if larger. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition around a random pivot and keep only the side that holds index n − k: O(n) on average, O(n²) worst case, and it reorders the range.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choice:</strong> <span style="color:#f0e2c8;">Quickselect for a one-off in-memory query; the heap for streams, huge or read-only data, small k, or a guaranteed bound; sort once for many queries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;">The library already has it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element(v.begin(), v.begin() + k - 1, v.end(), std::greater&lt;int&gt;())</code>, linear on average. I would say that first, then hand-write quickselect if asked.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a min-heap to find the largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The only question per element is "does it beat the weakest of the current top k?". The weakest is the minimum, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code> heap keeps it at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>. The default max-heap would need all n values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make quickselect safe against bad inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A random pivot from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mt19937</code>, so no fixed input is always bad, and a three-way partition so duplicates do not degrade it. In our run a sorted input with a last-element pivot cost 4,498,500 comparisons; with a random pivot, 8,314.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::nth_element</code> guaranteed linear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">cppreference gives linear complexity <em style="color:#ffffff;">on average</em>. Implementations typically use introselect, which bounds the bad cases by switching strategy when recursion gets deep, but the documented guarantee is the average one, so do not promise worst-case O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if numbers arrive one at a time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> alive between arrivals; each new number costs O(log k) and the answer is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> needs the whole range at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::partial_sort</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need the k largest values themselves, in order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sort(v.begin(), v.begin() + k, v.end(), std::greater&lt;int&gt;())</code> sorts just the first k positions. For one value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> does less work.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kth largest element** | The value that would sit at position k if you sorted the array from largest to smallest, counting duplicates |
| **Size-k heap (bounded heap)** | A heap that is never allowed to grow past k items; when it is full, a new item either replaces the root or is ignored |
| **Partition** | Rearranging a range around a pivot value so that everything smaller is on the left, the pivot is in its final sorted position, and everything else is on the right |
| **Expected (average) O(n)** | The running time averaged over the random pivot choices, for any input |
| **Three-way partition (Dutch national flag)** | Partitioning into three groups, less than, equal to and greater than the pivot, so a range full of duplicates is settled in one pass instead of degrading to O(n²) |
| **Median of medians** | A pivot-selection rule (groups of 5, take each group median, recurse on those medians) that guarantees a pivot near the middle, making quickselect worst-case O(n) at the cost of a much larger constant |

---
**Conclusion:** The Kth largest element has two good answers and the interview is really about choosing between them. A size-k min-heap (\`std::greater\`, because \`priority_queue\` is a max-heap by default) is O(n log k), uses O(k) memory, never touches the input and works on a stream; quickselect — or the library's \`std::nth_element\` — is linear on average and in place, but reorders the range and has a bad worst case that a random pivot and a three-way partition guard against. In C++, name \`nth_element\` first, get its position right, and keep your counters and indexes in types that cannot overflow.`,
        examples: [
          {
            label: "Kth largest: size-k min-heap and random-pivot quickselect on six inputs",
            code: `#include <functional>
#include <iostream>
#include <queue>
#include <random>
#include <string>
#include <utility>
#include <vector>

// Keep the k largest values seen so far in a min-heap of size k.
int kthLargestHeap(const std::vector<int>& nums, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;   // min-heap
    for (int x : nums) {
        if ((int)heap.size() < k) heap.push(x);
        else if (x > heap.top()) {               // bigger than the smallest of the top k
            heap.pop();
            heap.push(x);
        }
    }
    return heap.top();                            // the smallest of the k largest
}

// Iterative quickselect with a random pivot. Takes a copy.
int kthLargestQuickselect(std::vector<int> a, int k) {
    static std::mt19937 rng(std::random_device{}());
    int target = (int)a.size() - k;               // kth largest = index n-k in sorted order
    int lo = 0, hi = (int)a.size() - 1;
    while (true) {
        int p = std::uniform_int_distribution<int>(lo, hi)(rng);
        std::swap(a[p], a[hi]);                   // move the pivot to the end
        int pivot = a[hi], store = lo;
        for (int i = lo; i < hi; i++) {           // Lomuto partition: smaller values to the left
            if (a[i] < pivot) std::swap(a[i], a[store++]);
        }
        std::swap(a[store], a[hi]);               // pivot lands in its final position
        if (store == target) return a[store];
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
}

std::string both(const std::vector<int>& nums, int k) {
    return "heap " + std::to_string(kthLargestHeap(nums, k)) + ", quickselect " + std::to_string(kthLargestQuickselect(nums, k));
}

int main() {
    std::cout << both({3, 2, 1, 5, 6, 4}, 2) << "\\n";          // heap 5, quickselect 5
    std::cout << both({3, 2, 3, 1, 2, 4, 5, 5, 6}, 4) << "\\n"; // heap 4, quickselect 4
    std::cout << both({1}, 1) << "\\n";                         // heap 1, quickselect 1
    std::cout << both({7, 7, 7, 7}, 2) << "\\n";                // heap 7, quickselect 7
    std::cout << both({-1, -5, 3, 0}, 4) << "\\n";              // heap -5, quickselect -5
    std::cout << both({2, 1}, 1) << "\\n";                      // heap 2, quickselect 2
    return 0;
}`,
          },
          {
            label: "Counting the work: heap entries, quickselect comparisons, worst cases",
            code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

long long seed = 7;

// MINSTD generator, the same in every language, so the counts match.
int randBelow(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

// Kth largest with a size-k min-heap; also count how many values got in.
std::pair<int, int> heapEntries(const std::vector<int>& nums, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
    int entries = 0;
    for (int x : nums) {
        if ((int)heap.size() < k) { heap.push(x); entries++; }
        else if (x > heap.top()) { heap.pop(); heap.push(x); entries++; }
    }
    return {heap.top(), entries};
}

// Lomuto quickselect; returns {answer, comparisons with the pivot}.
std::pair<int, long long> quickselect(std::vector<int> a, int k, const std::string& pivotRule) {
    int target = (int)a.size() - k, lo = 0, hi = (int)a.size() - 1;
    long long comps = 0;
    while (true) {
        int p = pivotRule == "last" ? hi : lo + randBelow(hi - lo + 1);
        std::swap(a[p], a[hi]);
        int pivot = a[hi], store = lo;
        for (int i = lo; i < hi; i++) {
            comps++;
            if (a[i] < pivot) std::swap(a[i], a[store++]);
        }
        std::swap(a[store], a[hi]);
        if (store == target) return {a[store], comps};
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
}

// Three-way partition (< pivot, == pivot, > pivot): duplicates finish fast.
std::pair<int, long long> quickselect3way(std::vector<int> a, int k) {
    int target = (int)a.size() - k, lo = 0, hi = (int)a.size() - 1;
    long long comps = 0;
    while (true) {
        int pivot = a[lo + randBelow(hi - lo + 1)];
        int lt = lo, i = lo, gt = hi;
        while (i <= gt) {
            comps++;
            if (a[i] < pivot) std::swap(a[lt++], a[i++]);
            else if (a[i] > pivot) std::swap(a[i], a[gt--]);
            else i++;
        }
        if (target < lt) hi = lt - 1;
        else if (target > gt) lo = gt + 1;
        else return {pivot, comps};
    }
}

int main() {
    const int n = 100000, k = 10;
    std::vector<int> data;
    for (int i = 0; i < n; i++) data.push_back(randBelow(1000000));
    auto [v, entries] = heapEntries(data, k);
    std::vector<int> sorted = data;
    std::sort(sorted.begin(), sorted.end());
    std::cout << "random n=100000, k=10: answer " << v << " (sorted: " << sorted[n - k] << ")\\n";
    std::cout << "  heap of size 10: " << entries << " values entered the heap\\n";
    auto r = quickselect(data, k, "random");
    std::cout << "  quickselect, random pivot: answer " << r.first << ", " << r.second << " comparisons\\n";

    const int m = 3000;
    std::vector<int> ascending;
    for (int i = 1; i <= m; i++) ascending.push_back(i);
    r = quickselect(ascending, m, "last");
    std::cout << "sorted n=3000, k=3000, last-element pivot: answer " << r.first << ", " << r.second << " comparisons\\n";
    r = quickselect(ascending, m, "random");
    std::cout << "sorted n=3000, k=3000, random pivot:       answer " << r.first << ", " << r.second << " comparisons\\n";
    std::vector<int> same(m, 5);
    r = quickselect(same, 1500, "random");
    std::cout << "all equal n=3000, two-way partition:       answer " << r.first << ", " << r.second << " comparisons\\n";
    r = quickselect3way(same, 1500);
    std::cout << "all equal n=3000, three-way partition:     answer " << r.first << ", " << r.second << " comparisons\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the top K frequent elements?",
    difficulty: "medium",
    seoDescription: "Top K frequent elements: count with a hash map, then a size-k min-heap (O(n log k)) or bucket sort (O(n)). Verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers and a number k, return the k values that appear most often. If two values appear the same number of times, put the smaller value first. Write it in Python and tell me the complexity."

**What a strong answer should cover:**
- Two steps: count with a hash map in O(n), then pick the k biggest counts.
- Three ways to pick: sort the m distinct values (O(m log m)), a size-k min-heap (O(m log k)), or bucket sort by count (O(n)) because a count is at most n.
- Ties: encode the rule in the key — here the heap key \`(count, -value)\` makes the weakest entry the lowest count, then the larger value.
- Edge cases: k equal to the number of distinct values, ties at the cut-off, negative numbers.
- Python specifics: \`collections.Counter\`, and that \`Counter.most_common(k)\` breaks ties by first appearance, not by value; \`heapq\` is a min-heap, so tuples \`(count, -value)\` give the right weakest-first order; \`heapq.nlargest(k, counts, key=...)\` as the one-liner.

**Clarifying questions expected:**
- How should ties be ordered, and must the result be sorted by frequency?
- Is k always at most the number of distinct values?

**Code / implementation expected:** Yes — \`Counter\` plus a size-k \`heapq\`, and the bucket-sort version if asked for O(n), in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Python lists, dicts and loops; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A music app wants to show "Your top 5 songs this year". It has a log of every play — one line per play, 200,000 lines for a keen listener. Answering the question takes two separate jobs:

1. **Tally.** Go through the log once and keep a running count per song, like tick marks on a sheet with one row per song.
2. **Pick the winners.** From that sheet of counts, pick the 5 rows with the most ticks.

Step 1 is always the same and always fast. Step 2 is where the interview lives: you can sort the whole sheet, you can keep a small "podium" of the 5 best rows seen so far (a heap), or you can use a trick that only works because counts are small whole numbers — put each song into a box labelled with its count, then read the boxes from the highest label down (bucket sort). The same two-step shape answers "most common words", "busiest IP addresses", "trending hashtags" and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If two values have the same count, which comes first — or does the order not matter? | The classic version accepts any order. If it matters, the tie rule must be built into the comparator; this page uses "smaller value first". |
| Must the result be ordered from most to least frequent? | A heap leaves the top k in heap order; you need one more sort or reverse step. |
| Is k always valid (1 ≤ k ≤ number of distinct values)? | If k can exceed the number of distinct values, return them all instead of crashing. |
| How large is n, and how many distinct values are there? | m distinct values decide the cost of step 2: O(m log k) for the heap, O(n) for buckets. |
| Is the data a stream, or too big for one machine? | Exact top-k over a stream needs all counts; at very large scale people use approximate sketches instead. |

## 3. Step 1 — Count With a Hash Map

📌 **Interview term: Frequency map (frequency table)** — a hash map from each distinct value to the number of times it appears. Building it is one pass: O(n) time and O(m) space, where m is the number of distinct values. How the hash map itself works is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).

After counting \`[1, 1, 1, 2, 2, 3]\` you have \`{1: 3, 2: 2, 3: 1}\`. From here on, the problem is "the k entries with the biggest counts" — which is exactly [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) problem with *count* as the key.

## 4. Step 2 — Three Ways to Pick the Top k

**Way 1 — sort the distinct values by count.** O(m log m). Simple and correct; often good enough because m can be much smaller than n.

**Way 2 — a min-heap of size k.** Push each (count, value) pair; whenever the heap grows to k + 1, pop the root, which is the weakest. At the end the heap holds the k strongest. O(m log k) time, O(k) extra space. The details of why a *min*-heap keeps the *largest* are on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Pipeline. The input array is counted into a frequency map, each count and value pair is pushed into a min-heap of size k, and the heap is read out in reverse to give the answer">
  <defs>
    <marker id="b19q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="16" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="86" y="92" text-anchor="middle">input</text>
  <text class="d-sub" x="86" y="116" text-anchor="middle">1, 1, 1, 2, 2, 3</text>
  <path class="d-edge" d="M 160 100 L 206 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-muted" x="212" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="282" y="92" text-anchor="middle">count, O(n)</text>
  <text class="d-sub" x="282" y="116" text-anchor="middle">1:3  2:2  3:1</text>
  <path class="d-edge" d="M 356 100 L 402 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-accent" x="408" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="478" y="92" text-anchor="middle">heap of size k</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">pop when k + 1</text>
  <path class="d-edge" d="M 552 100 L 598 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box" x="604" y="60" width="84" height="80" rx="10"/>
  <text class="d-text" x="646" y="92" text-anchor="middle">answer</text>
  <text class="d-sub" x="646" y="116" text-anchor="middle">[1, 2]</text>
</svg>

With k = 2, the pair (count 1, value 3) is pushed third, the heap grows to 3, and the root — the weakest pair, count 1 — is popped. What is left is value 1 (count 3) and value 2 (count 2).

**Way 3 — bucket sort by count.** A value can appear at most n times, so make n + 1 empty buckets numbered 0 to n and drop each distinct value into the bucket for its count. Then walk the buckets from n down to 1 and collect values until you have k. No comparisons between counts at all: O(n) time and O(n) space.

📌 **Interview term: Bucket sort (counting by frequency)** — sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Buckets indexed by count for the input 1, 1, 1, 2, 2, 3. Bucket 3 holds value 1, bucket 2 holds value 2, bucket 1 holds value 3. They are read from the highest count down">
  <defs>
    <marker id="b19q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="90" y="40" text-anchor="middle">count 0</text>
  <text class="d-text" x="90" y="90" text-anchor="middle">empty</text>
  <rect class="d-box" x="180" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="240" y="40" text-anchor="middle">count 1</text>
  <text class="d-text" x="240" y="90" text-anchor="middle">3</text>
  <rect class="d-box" x="330" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="390" y="40" text-anchor="middle">count 2</text>
  <text class="d-text" x="390" y="90" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="480" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="540" y="40" text-anchor="middle">count 3</text>
  <text class="d-text" x="540" y="90" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 590 150 L 200 150" marker-end="url(#b19q3-b)"/>
  <text class="d-sub" x="395" y="178" text-anchor="middle">read from the highest count down</text>
</svg>

Buckets 4, 5 and 6 also exist for this six-item input but are empty, and are not drawn. Reading from the top gives 1, then 2: the answer for k = 2. Example 2 prints exactly these buckets.

### Ties

When several values share a count, "the top k" is ambiguous. If the interviewer does not care, any order is accepted. If they do, encode the rule in the key. This page uses **most frequent first, and for equal counts the smaller value first**. For the heap, that means the *weakest* entry (the one at the root) is the one with the lowest count, and for equal counts the **larger** value. On \`[4, 4, 1, 1, 2, 2, 3]\` with k = 2, three values tie at count 2 and the rule picks \`[1, 2]\`.

📌 **Interview term: Tie-breaking rule** — a second sort key that decides the order of items whose main key is equal, making the output deterministic.

## 5. Which One Should You Use?

| Situation | Pick | Cost of step 2 |
| :--- | :--- | :--- |
| You want the simplest correct code | Sort the distinct values | O(m log m) |
| k is much smaller than m, or memory for the answer must stay small | Size-k min-heap | O(m log k) time, O(k) space |
| You want strictly linear time | Bucket sort by count | O(n) time, O(n) space |
| The data is a huge stream across many machines | Approximate (Count-Min sketch + heap) | beyond this page |

In an interview, say all three: count first, then "heap for O(n log k), and since counts are bounded by n I can bucket-sort for O(n)". Many interviewers treat the bucket idea as the "aha" answer.

📌 **Interview term: Count-Min sketch** — a small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory.

## 6. The Code in Python

### Counter + a size-k heap

~~~python
def top_k_frequent(nums, k):
    """Most frequent first; ties broken by the smaller value first."""
    counts = Counter(nums)                    # value -> how many times it appears
    heap = []                                 # min-heap of (count, -value): root = weakest
    for value, c in counts.items():
        heapq.heappush(heap, (c, -value))
        if len(heap) > k:
            heapq.heappop(heap)               # drop the weakest of k + 1
    result = []
    while heap:
        c, neg = heapq.heappop(heap)          # weakest first...
        result.append(-neg)
    result.reverse()                          # ...so reverse to get the strongest first
    return result
~~~

**What to point out in this code:**

- \`Counter(nums)\` is a \`dict\` subclass that counts in one pass. \`counts.items()\` yields \`(value, count)\` pairs.
- The heap holds tuples \`(count, -value)\`. Tuples compare element by element, and \`heapq\` is a **min-heap**, so the root is the lowest count and, among equal counts, the smallest \`-value\` — that is, the **largest** value. That is precisely the "weakest" entry under our tie rule, so it is the one that gets popped.
- Push first, then pop if the heap has k + 1 entries. \`heapq.heappushpop(heap, item)\` does both in one sift once the heap is full; the simple version above is easier to explain and has the same O(log k) cost.
- Popping everything gives weakest-first, so the list is reversed at the end.

### The one-liners — and their tie behaviour

~~~python
from collections import Counter
import heapq

counts = Counter(nums)
[v for v, c in counts.most_common(k)]                           # ties: first appearance wins
heapq.nlargest(k, counts, key=lambda v: (counts[v], -v))          # ties: smaller value wins
~~~

\`Counter.most_common(k)\` is perfect when ties do not matter. When they do, know what it does: in CPython 3.13 (we read the source) it calls \`heapq.nlargest(n, self.items(), key=itemgetter(1))\`, so equal counts keep their **first-appearance** order. In our run \`Counter([4, 4, 1, 1, 2, 2, 3]).most_common(2)\` returned \`[(4, 2), (1, 2)]\`, not \`[1, 2]\`. The \`nlargest\` line with the key \`(count, -value)\` applies our rule and also returns the strongest first.

### Bucket sort for O(n)

~~~python
def by_buckets(nums, k):
    """Bucket sort by frequency: buckets[c] holds the values seen exactly c times."""
    counts = count(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for v, c in counts.items():
        buckets[c].append(v)
    result = []
    for c in range(len(nums), 0, -1):          # highest count first
        for v in sorted(buckets[c]):           # sort only to apply the tie rule
            result.append(v)
            if len(result) == k:
                return result
    return result
~~~

- \`[[] for _ in range(len(nums) + 1)]\` creates n + 1 **separate** lists. Writing \`[[]] * (len(nums) + 1)\` would create n + 1 references to the *same* list, and every value would land in every bucket — in our run \`b = [[]] * 3; b[0].append(1)\` left \`b\` as \`[[1], [1], [1]]\`.
- \`sorted(buckets[c])\` is only there for the tie rule. Without a tie rule, drop it and the whole thing is O(n).

📌 **Interview term: Aliasing** — two names (or list slots) referring to the same object, so changing it through one changes it for all. \`[[]] * n\` is the classic Python example.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 200,000 values with a small deterministic random generator (MINSTD), skewed so that small values are more common.

**Example 1 — Counter + size-k heap on six inputs:**

~~~text
[1, 2]
[1]
[1, 2]
[5, -1]
[0]
[5, 6, 7]
~~~

**Example 2 — the buckets for \`[1, 1, 1, 2, 2, 3]\`, then sorting vs heap vs buckets on 200,000 values:**

~~~text
bucket 3: [1]
bucket 2: [2]
bucket 1: [3]
n = 200000, distinct values = 997
top 5 (value:count): 0:1599, 1:1416, 2:1376, 3:1248, 5:1166
sorting, heap and buckets agree: true
~~~

All three methods return the same five values in the same order, because all three apply the same tie rule.

## 8. Complexity

With n items and m distinct values (m ≤ n):

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count with \`Counter\` | O(n) | O(m) | one pass, O(1) average per dict update |
| + sort the distinct values | O(n + m log m) | O(m) | \`sorted\` over m keys |
| + size-k \`heapq\` | O(n + m log k) | O(m + k) | each of m pushes/pops costs O(log k) |
| + bucket sort | O(n) | O(n) | n + 1 buckets, each value placed once (plus bucket sorts if ties matter) |
| \`Counter.most_common(k)\` | O(n + m log k) | O(m + k) | \`heapq.nlargest\` inside |

## 9. Edge Cases

- **k equals the number of distinct values** — return all of them; \`[5, 6, 7]\` with k = 3 gives \`[5, 6, 7]\` (all counts are 1, so the tie rule orders them).
- **One element** — \`[1]\`, k = 1 gives \`[1]\`.
- **Ties at the cut-off** — \`[4, 4, 1, 1, 2, 2, 3]\`, k = 2: three values have count 2; the tie rule decides, giving \`[1, 2]\`.
- **Negative numbers and zero** — \`[-1, -1, 5, 5, 5, 0]\`, k = 2 gives \`[5, -1]\`. Make sure nothing uses 0 or −1 as a "missing" marker, and that negating values for a tie rule does not overflow (it cannot for counts, but it can for \`INT_MIN\` values in fixed-width languages).
- **All values equal** — one distinct value; the heap holds one entry and the bucket walk finds it in bucket n.
- **k larger than the number of distinct values** — not valid input in the classic version; returning everything is the friendly choice.

## Common Pitfalls

- **Assuming \`most_common\` breaks ties by value.** It keeps first-appearance order. Apply your own key if the order of ties matters.
- **Keying the heap on \`(count, value)\` instead of \`(count, -value)\`.** Then, among equal counts, the *smaller* value is popped first — the opposite of "smaller value wins".
- **\`[[]] * (n + 1)\` for the buckets.** All buckets alias one list.
- **A max-heap of all m entries** (negating counts and popping k times). It works, but uses O(m) heap space and is not the size-k idea interviewers want to hear.
- **Forgetting to reverse.** Popping a min-heap gives the weakest first.
- **Sorting \`nums\` itself** (O(n log n)) when only the distinct counts need ordering.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Two steps: count with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> in O(n), then pick the k largest counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(count, -value)</code> into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> min-heap and pop whenever it reaches k + 1; the root is always the weakest. O(n + m log k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Buckets:</strong> <span style="color:#f0e2c8;">A count is at most n, so bucket the values by count and read from n down: O(n) time and space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">I encode the tie rule in the key; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(count, -value)</code> makes the larger value weaker, so the smaller value wins a tie.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter.most_common(k)</code> is the library answer, but it breaks ties by first appearance; for a value-based rule I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nlargest(k, counts, key=lambda v: (counts[v], -v))</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sorting the m distinct values is O(m log m) and perfectly correct; the heap brings it to O(m log k), which matters when k is small and m is large, and the buckets bring it to O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the bucket method allowed to be linear when sorting needs n log n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Comparison sorting needs n log n comparisons in the worst case, but bucket sort does not compare counts at all — it uses each count as an array index. That only works because counts are integers between 1 and n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Counter.most_common</code> do with ties?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nlargest</code> keyed on the count, so equal counts keep the order in which the values were first counted. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 4, 1, 1, 2, 2, 3]</code> and k = 2 it returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> in our run, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the data is a stream too big to count exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then exact top-k is not possible in small memory. The standard answer is an approximate "heavy hitters" structure: a Count-Min sketch for estimated counts plus a size-k heap of the current leaders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(m) for the counts in every approach, plus O(k) for the heap or O(n) for the buckets.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frequency map (frequency table)** | A hash map from each distinct value to the number of times it appears |
| **Bucket sort (counting by frequency)** | Sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n |
| **Tie-breaking rule** | A second sort key that decides the order of items whose main key is equal, making the output deterministic |
| **Count-Min sketch** | A small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory |
| **Aliasing** | Two names (or list slots) referring to the same object, so changing it through one changes it for all. \`[[]] * n\` is the classic Python example |

---
**Conclusion:** Top K frequent is "count, then pick the k largest counts". In Python, \`Counter\` does the counting in O(n); a \`heapq\` min-heap of \`(count, -value)\` tuples picks the winners in O(m log k) and builds the tie rule into the key; and because counts are bounded by n, bucket sort gets the whole thing to O(n). Know that \`most_common\` breaks ties by first appearance, and that \`[[]] * n\` is not n buckets.`,
        examples: [
          {
            label: "Top K frequent with a hash map + size-k min-heap (ties: smaller value first)",
            code: `import heapq
from collections import Counter


def top_k_frequent(nums, k):
    """Most frequent first; ties broken by the smaller value first."""
    counts = Counter(nums)                    # value -> how many times it appears
    heap = []                                 # min-heap of (count, -value): root = weakest
    for value, c in counts.items():
        heapq.heappush(heap, (c, -value))
        if len(heap) > k:
            heapq.heappop(heap)               # drop the weakest of k + 1
    result = []
    while heap:
        c, neg = heapq.heappop(heap)          # weakest first...
        result.append(-neg)
    result.reverse()                          # ...so reverse to get the strongest first
    return result


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


print(fmt(top_k_frequent([1, 1, 1, 2, 2, 3], 2)))  # [1, 2]
print(fmt(top_k_frequent([1], 1)))  # [1]
print(fmt(top_k_frequent([4, 4, 1, 1, 2, 2, 3], 2)))  # [1, 2]
print(fmt(top_k_frequent([-1, -1, 5, 5, 5, 0], 2)))  # [5, -1]
print(fmt(top_k_frequent([3, 0, 1, 0], 1)))  # [0]
print(fmt(top_k_frequent([5, 6, 7], 3)))  # [5, 6, 7]`,
          },
          {
            label: "Sorting vs heap vs bucket sort on 200,000 skewed values",
            code: `import heapq

seed = 2024


def rand_below(m):
    """MINSTD generator, the same in every language."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % m


def count(nums):
    counts = {}
    for x in nums:
        counts[x] = counts.get(x, 0) + 1
    return counts


def by_sorting(nums, k):
    counts = count(nums)
    order = sorted(counts, key=lambda v: (-counts[v], v))   # count desc, value asc
    return order[:k]


def by_heap(nums, k):
    counts = count(nums)
    heap = []
    for v, c in counts.items():
        heapq.heappush(heap, (c, -v))
        if len(heap) > k:
            heapq.heappop(heap)
    return [-neg for c, neg in sorted(heap, reverse=True)]


def by_buckets(nums, k):
    """Bucket sort by frequency: buckets[c] holds the values seen exactly c times."""
    counts = count(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for v, c in counts.items():
        buckets[c].append(v)
    result = []
    for c in range(len(nums), 0, -1):          # highest count first
        for v in sorted(buckets[c]):           # sort only to apply the tie rule
            result.append(v)
            if len(result) == k:
                return result
    return result


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


small = [1, 1, 1, 2, 2, 3]
counts = count(small)
for c in range(3, 0, -1):
    print("bucket " + str(c) + ": " + fmt(sorted(v for v in counts if counts[v] == c)))

n, k = 200000, 5
data = [rand_below(1000) % (1 + rand_below(1000)) for _ in range(n)]   # skewed toward small values
counts = count(data)
top = by_heap(data, k)
print("n = " + str(n) + ", distinct values = " + str(len(counts)))
print("top 5 (value:count): " + ", ".join(str(v) + ":" + str(counts[v]) for v in top))
same = by_sorting(data, k) == top == by_buckets(data, k)
print("sorting, heap and buckets agree: " + str(same).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers and a number k, return the k values that appear most often. If two values appear the same number of times, put the smaller value first. Write it in JavaScript and tell me the complexity."

**What a strong answer should cover:**
- Two steps: count with a hash map in O(n), then pick the k biggest counts.
- Three ways to pick: sort the m distinct values (O(m log m)), a size-k min-heap (O(m log k)), or bucket sort by count (O(n)) because a count is at most n.
- Ties: encode the rule in the comparator — the weakest entry is the lowest count, then the larger value.
- Edge cases: k equal to the number of distinct values, ties at the cut-off, negative numbers.
- JavaScript specifics: use a \`Map\` (keys stay numbers and keep insertion order) rather than a plain object (keys become strings, and integer-like keys are reordered); \`counts.get(x) ?? 0\`; no built-in heap, so write a small one with a comparator; \`Array.from({ length }, () => [])\` for buckets, not \`fill([])\`.

**Clarifying questions expected:**
- How should ties be ordered, and must the result be sorted by frequency?
- Is k always at most the number of distinct values?

**Code / implementation expected:** Yes — a \`Map\` for counts plus a size-k heap (or the bucket-sort version) in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need JavaScript arrays, \`Map\` and loops; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A music app wants to show "Your top 5 songs this year". It has a log of every play — one line per play, 200,000 lines for a keen listener. Answering the question takes two separate jobs:

1. **Tally.** Go through the log once and keep a running count per song, like tick marks on a sheet with one row per song.
2. **Pick the winners.** From that sheet of counts, pick the 5 rows with the most ticks.

Step 1 is always the same and always fast. Step 2 is where the interview lives: you can sort the whole sheet, you can keep a small "podium" of the 5 best rows seen so far (a heap), or you can use a trick that only works because counts are small whole numbers — put each song into a box labelled with its count, then read the boxes from the highest label down (bucket sort). The same two-step shape answers "most common words", "busiest IP addresses", "trending hashtags" and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If two values have the same count, which comes first — or does the order not matter? | The classic version accepts any order. If it matters, the tie rule must be built into the comparator; this page uses "smaller value first". |
| Must the result be ordered from most to least frequent? | A heap leaves the top k in heap order; you need one more sort or reverse step. |
| Is k always valid (1 ≤ k ≤ number of distinct values)? | If k can exceed the number of distinct values, return them all instead of crashing. |
| How large is n, and how many distinct values are there? | m distinct values decide the cost of step 2: O(m log k) for the heap, O(n) for buckets. |
| Is the data a stream, or too big for one machine? | Exact top-k over a stream needs all counts; at very large scale people use approximate sketches instead. |

## 3. Step 1 — Count With a Hash Map

📌 **Interview term: Frequency map (frequency table)** — a hash map from each distinct value to the number of times it appears. Building it is one pass: O(n) time and O(m) space, where m is the number of distinct values. How the hash map itself works is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).

After counting \`[1, 1, 1, 2, 2, 3]\` you have \`{1: 3, 2: 2, 3: 1}\`. From here on, the problem is "the k entries with the biggest counts" — which is exactly [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) problem with *count* as the key.

## 4. Step 2 — Three Ways to Pick the Top k

**Way 1 — sort the distinct values by count.** O(m log m). Simple and correct; often good enough because m can be much smaller than n.

**Way 2 — a min-heap of size k.** Push each (count, value) pair; whenever the heap grows to k + 1, pop the root, which is the weakest. At the end the heap holds the k strongest. O(m log k) time, O(k) extra space. The details of why a *min*-heap keeps the *largest* are on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Pipeline. The input array is counted into a frequency map, each count and value pair is pushed into a min-heap of size k, and the heap is read out in reverse to give the answer">
  <defs>
    <marker id="b19q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="16" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="86" y="92" text-anchor="middle">input</text>
  <text class="d-sub" x="86" y="116" text-anchor="middle">1, 1, 1, 2, 2, 3</text>
  <path class="d-edge" d="M 160 100 L 206 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-muted" x="212" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="282" y="92" text-anchor="middle">count, O(n)</text>
  <text class="d-sub" x="282" y="116" text-anchor="middle">1:3  2:2  3:1</text>
  <path class="d-edge" d="M 356 100 L 402 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-accent" x="408" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="478" y="92" text-anchor="middle">heap of size k</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">pop when k + 1</text>
  <path class="d-edge" d="M 552 100 L 598 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box" x="604" y="60" width="84" height="80" rx="10"/>
  <text class="d-text" x="646" y="92" text-anchor="middle">answer</text>
  <text class="d-sub" x="646" y="116" text-anchor="middle">[1, 2]</text>
</svg>

With k = 2, the pair (count 1, value 3) is pushed third, the heap grows to 3, and the root — the weakest pair, count 1 — is popped. What is left is value 1 (count 3) and value 2 (count 2).

**Way 3 — bucket sort by count.** A value can appear at most n times, so make n + 1 empty buckets numbered 0 to n and drop each distinct value into the bucket for its count. Then walk the buckets from n down to 1 and collect values until you have k. No comparisons between counts at all: O(n) time and O(n) space.

📌 **Interview term: Bucket sort (counting by frequency)** — sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Buckets indexed by count for the input 1, 1, 1, 2, 2, 3. Bucket 3 holds value 1, bucket 2 holds value 2, bucket 1 holds value 3. They are read from the highest count down">
  <defs>
    <marker id="b19q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="90" y="40" text-anchor="middle">count 0</text>
  <text class="d-text" x="90" y="90" text-anchor="middle">empty</text>
  <rect class="d-box" x="180" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="240" y="40" text-anchor="middle">count 1</text>
  <text class="d-text" x="240" y="90" text-anchor="middle">3</text>
  <rect class="d-box" x="330" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="390" y="40" text-anchor="middle">count 2</text>
  <text class="d-text" x="390" y="90" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="480" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="540" y="40" text-anchor="middle">count 3</text>
  <text class="d-text" x="540" y="90" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 590 150 L 200 150" marker-end="url(#b19q3-b)"/>
  <text class="d-sub" x="395" y="178" text-anchor="middle">read from the highest count down</text>
</svg>

Buckets 4, 5 and 6 also exist for this six-item input but are empty, and are not drawn. Reading from the top gives 1, then 2: the answer for k = 2. Example 2 prints exactly these buckets.

### Ties

When several values share a count, "the top k" is ambiguous. If the interviewer does not care, any order is accepted. If they do, encode the rule in the key. This page uses **most frequent first, and for equal counts the smaller value first**. For the heap, that means the *weakest* entry (the one at the root) is the one with the lowest count, and for equal counts the **larger** value. On \`[4, 4, 1, 1, 2, 2, 3]\` with k = 2, three values tie at count 2 and the rule picks \`[1, 2]\`.

📌 **Interview term: Tie-breaking rule** — a second sort key that decides the order of items whose main key is equal, making the output deterministic.

## 5. Which One Should You Use?

| Situation | Pick | Cost of step 2 |
| :--- | :--- | :--- |
| You want the simplest correct code | Sort the distinct values | O(m log m) |
| k is much smaller than m, or memory for the answer must stay small | Size-k min-heap | O(m log k) time, O(k) space |
| You want strictly linear time | Bucket sort by count | O(n) time, O(n) space |
| The data is a huge stream across many machines | Approximate (Count-Min sketch + heap) | beyond this page |

In an interview, say all three: count first, then "heap for O(n log k), and since counts are bounded by n I can bucket-sort for O(n)". Many interviewers treat the bucket idea as the "aha" answer.

📌 **Interview term: Count-Min sketch** — a small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory.

## 6. The Code in JavaScript

### The heap class

JavaScript has no priority queue, so the examples carry a small binary heap that takes a \`less(x, y)\` function — "x belongs nearer the top". (It is the class from [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue), with a boolean comparator.)

~~~javascript
// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
~~~

### Map + a size-k heap

~~~javascript
// "Weaker" = lower count; for equal counts, the larger value is weaker.
const weaker = (x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] > y[1];

function topKFrequent(nums, k) {
  // Most frequent first; ties broken by the smaller value first.
  const counts = new Map();                     // value -> how many times it appears
  for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
  const heap = new Heap(weaker);                // root = weakest [count, value] pair
  for (const [value, c] of counts) {
    heap.push([c, value]);
    if (heap.size > k) heap.pop();              // drop the weakest of k + 1
  }
  const result = [];
  while (heap.size > 0) result.push(heap.pop()[1]);   // weakest first...
  return result.reverse();                      // ...so reverse to get the strongest first
}
~~~

**What to point out in this code:**

- **\`Map\`, not a plain object.** A \`Map\` keeps keys as numbers and iterates in insertion order. A plain object turns every key into a string, and orders integer-like keys numerically before the others: in our run, counting \`[5, -1, 3]\` into \`{}\` gave \`Object.keys\` = \`['3', '5', '-1']\`, while a \`Map\` gave \`[5, -1, 3]\`. With an object you would also have to convert keys back with \`Number(key)\`.
- \`counts.get(x) ?? 0\` — \`get\` returns \`undefined\` for a new key, and \`??\` replaces only \`null\`/\`undefined\`. (\`|| 0\` also works here because a count is never 0 when read, but \`??\` says what you mean.)
- \`weaker(x, y)\` is the tie rule: lower count is weaker; for equal counts the **larger** value is weaker, so the smaller value survives.
- Pop when the heap reaches k + 1, then reverse at the end: popping gives weakest first.

### Sorting with a two-key comparator

~~~javascript
const order = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a - b);
~~~

\`counts.get(b) - counts.get(a)\` sorts by count descending; when it is 0 (a tie), \`|| a - b\` falls through to the value, ascending. Since ES2019, \`Array.prototype.sort\` must be stable ([V8 blog](https://v8.dev/features/stable-sort)), so a single-key comparator would also keep ties in their \`Map\` insertion order — but an explicit second key is clearer than relying on that.

### Bucket sort for O(n)

~~~javascript
function byBuckets(nums, k) {
  // Bucket sort by frequency: buckets[c] holds the values seen exactly c times.
  const counts = count(nums);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [v, c] of counts) buckets[c].push(v);
  const result = [];
  for (let c = nums.length; c >= 1; c--) {           // highest count first
    for (const v of buckets[c].sort((a, b) => a - b)) {  // sort only to apply the tie rule
      result.push(v);
      if (result.length === k) return result;
    }
  }
  return result;
}
~~~

- \`Array.from({ length: n + 1 }, () => [])\` calls the arrow function once per slot, so every bucket is a **separate** array. \`new Array(n + 1).fill([])\` puts the *same* array in every slot: in our run, pushing into bucket 0 of a \`fill([])\` array of length 3 gave \`[[1],[1],[1]]\`.
- \`buckets[c].sort((a, b) => a - b)\` is only for the tie rule (and uses a numeric comparator — the default sort compares strings).

📌 **Interview term: Aliasing** — two names (or array slots) referring to the same object, so changing it through one changes it for all. \`new Array(n).fill([])\` is the classic JavaScript example.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 200,000 values with a small deterministic random generator (MINSTD), skewed so that small values are more common.

**Example 1 — Map + size-k heap on six inputs:**

~~~text
[1, 2]
[1]
[1, 2]
[5, -1]
[0]
[5, 6, 7]
~~~

**Example 2 — the buckets for \`[1, 1, 1, 2, 2, 3]\`, then sorting vs heap vs buckets on 200,000 values:**

~~~text
bucket 3: [1]
bucket 2: [2]
bucket 1: [3]
n = 200000, distinct values = 997
top 5 (value:count): 0:1599, 1:1416, 2:1376, 3:1248, 5:1166
sorting, heap and buckets agree: true
~~~

All three methods return the same five values in the same order, because all three apply the same tie rule.

## 8. Complexity

With n items and m distinct values (m ≤ n):

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count with a \`Map\` | O(n) | O(m) | one pass, O(1) average per \`get\`/\`set\` |
| + sort the distinct values | O(n + m log m) | O(m) | one \`sort\` over m keys |
| + size-k heap | O(n + m log k) | O(m + k) | each of m pushes/pops costs O(log k) |
| + bucket sort | O(n) | O(n) | n + 1 buckets, each value placed once (plus bucket sorts if ties matter) |

## 9. Edge Cases

- **k equals the number of distinct values** — return all of them; \`[5, 6, 7]\` with k = 3 gives \`[5, 6, 7]\` (all counts are 1, so the tie rule orders them).
- **One element** — \`[1]\`, k = 1 gives \`[1]\`.
- **Ties at the cut-off** — \`[4, 4, 1, 1, 2, 2, 3]\`, k = 2: three values have count 2; the tie rule decides, giving \`[1, 2]\`.
- **Negative numbers and zero** — \`[-1, -1, 5, 5, 5, 0]\`, k = 2 gives \`[5, -1]\`. Make sure nothing uses 0 or −1 as a "missing" marker, and that negating values for a tie rule does not overflow (it cannot for counts, but it can for \`INT_MIN\` values in fixed-width languages).
- **All values equal** — one distinct value; the heap holds one entry and the bucket walk finds it in bucket n.
- **k larger than the number of distinct values** — not valid input in the classic version; returning everything is the friendly choice.

## Common Pitfalls

- **Counting into a plain object.** Keys become strings and integer-like keys are reordered; use a \`Map\`.
- **\`fill([])\` for the buckets.** Every slot is the same array.
- **The default \`sort()\`** on numbers or a comparator that returns a boolean. Return a number: \`counts.get(b) - counts.get(a) || a - b\`.
- **The tie rule backwards in the heap.** For "smaller value wins", the *larger* value must be the weaker one.
- **Forgetting to reverse** the popped results — a min-heap pops the weakest first.
- **Building the heap from all m entries and popping k** — works, but O(m) heap space instead of O(k).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Two steps: count into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> in O(n), then pick the k largest counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[count, value]</code> pairs of size k, popping whenever it reaches k + 1; the root is always the weakest. O(n + m log k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Buckets:</strong> <span style="color:#f0e2c8;">A count is at most n, so bucket the values by count and read from n down: O(n) time and space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">The comparator encodes the rule: lower count is weaker, and for equal counts the larger value is weaker, so the smaller value wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> rather than an object (number keys, insertion order), my own small heap class, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length }, () =&gt; [])</code> for buckets.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> instead of an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys are strings, and integer-like keys are iterated in numeric order before the rest; counting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, -1, 3]</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> iterated as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'3', '5', '-1'</code> in our run. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps the original number keys and insertion order, and has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the bucket method allowed to be linear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It never compares counts; it uses each count as an array index. That works because counts are integers between 1 and n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort</code> in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...counts.keys()].sort(...)</code> is O(m log m), and m is often small. The heap matters when m is large and k is tiny, and buckets when you need a strict linear bound.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the data is a stream too big to count exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact top-k needs every count. In small memory you switch to an approximate "heavy hitters" structure: a Count-Min sketch for estimated counts plus a size-k heap of the current leaders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(m) for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> in every approach, plus O(k) for the heap or O(n) for the buckets.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frequency map (frequency table)** | A hash map from each distinct value to the number of times it appears |
| **Bucket sort (counting by frequency)** | Sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n |
| **Tie-breaking rule** | A second sort key that decides the order of items whose main key is equal, making the output deterministic |
| **Count-Min sketch** | A small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory |
| **Aliasing** | Two names (or array slots) referring to the same object, so changing it through one changes it for all. \`new Array(n).fill([])\` is the classic JavaScript example |

---
**Conclusion:** Top K frequent is "count, then pick the k largest counts". In JavaScript, a \`Map\` does the counting in O(n) with real number keys; a small hand-written min-heap of \`[count, value]\` pairs picks the winners in O(m log k) with the tie rule inside its comparator; and because counts are bounded by n, bucket sort reaches O(n) — as long as the buckets are created with \`Array.from\`, not \`fill([])\`.`,
        examples: [
          {
            label: "Top K frequent with a hash map + size-k min-heap (ties: smaller value first)",
            code: `// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// "Weaker" = lower count; for equal counts, the larger value is weaker.
const weaker = (x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] > y[1];

function topKFrequent(nums, k) {
  // Most frequent first; ties broken by the smaller value first.
  const counts = new Map();                     // value -> how many times it appears
  for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
  const heap = new Heap(weaker);                // root = weakest [count, value] pair
  for (const [value, c] of counts) {
    heap.push([c, value]);
    if (heap.size > k) heap.pop();              // drop the weakest of k + 1
  }
  const result = [];
  while (heap.size > 0) result.push(heap.pop()[1]);   // weakest first...
  return result.reverse();                      // ...so reverse to get the strongest first
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

console.log(fmt(topKFrequent([1, 1, 1, 2, 2, 3], 2))); // [1, 2]
console.log(fmt(topKFrequent([1], 1))); // [1]
console.log(fmt(topKFrequent([4, 4, 1, 1, 2, 2, 3], 2))); // [1, 2]
console.log(fmt(topKFrequent([-1, -1, 5, 5, 5, 0], 2))); // [5, -1]
console.log(fmt(topKFrequent([3, 0, 1, 0], 1))); // [0]
console.log(fmt(topKFrequent([5, 6, 7], 3))); // [5, 6, 7]`,
          },
          {
            label: "Sorting vs heap vs bucket sort on 200,000 skewed values",
            code: `// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

let seed = 2024;
function randBelow(m) {
  // MINSTD generator, the same in every language.
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

function count(nums) {
  const counts = new Map();
  for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
  return counts;
}

function bySorting(nums, k) {
  const counts = count(nums);
  const order = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a - b); // count desc, value asc
  return order.slice(0, k);
}

function byHeap(nums, k) {
  const counts = count(nums);
  const weaker = (x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] > y[1];
  const heap = new Heap(weaker);
  for (const [v, c] of counts) {
    heap.push([c, v]);
    if (heap.size > k) heap.pop();
  }
  const out = [];
  while (heap.size > 0) out.push(heap.pop()[1]);
  return out.reverse();
}

function byBuckets(nums, k) {
  // Bucket sort by frequency: buckets[c] holds the values seen exactly c times.
  const counts = count(nums);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [v, c] of counts) buckets[c].push(v);
  const result = [];
  for (let c = nums.length; c >= 1; c--) {           // highest count first
    for (const v of buckets[c].sort((a, b) => a - b)) {  // sort only to apply the tie rule
      result.push(v);
      if (result.length === k) return result;
    }
  }
  return result;
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const small = count([1, 1, 1, 2, 2, 3]);
for (let c = 3; c >= 1; c--) {
  const vs = [...small.keys()].filter((v) => small.get(v) === c).sort((a, b) => a - b);
  console.log("bucket " + c + ": " + fmt(vs));
}

const n = 200000, k = 5;
const data = [];
for (let i = 0; i < n; i++) {
  const a = randBelow(1000);
  const b = randBelow(1000);
  data.push(a % (1 + b));                           // skewed toward small values
}
const counts = count(data);
const top = byHeap(data, k);
console.log("n = " + n + ", distinct values = " + counts.size);
console.log("top 5 (value:count): " + top.map((v) => v + ":" + counts.get(v)).join(", "));
const same = fmt(bySorting(data, k)) === fmt(top) && fmt(byBuckets(data, k)) === fmt(top);
console.log("sorting, heap and buckets agree: " + same);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int[]\` and a number k, return the k values that appear most often. If two values appear the same number of times, put the smaller value first. Write it in Java and tell me the complexity."

**What a strong answer should cover:**
- Two steps: count with a hash map in O(n), then pick the k biggest counts.
- Three ways to pick: sort the m distinct values (O(m log m)), a size-k min-heap (O(m log k)), or bucket sort by count (O(n)) because a count is at most n.
- Ties: encode the rule in the comparator — the weakest entry is the lowest count, then the larger value.
- Edge cases: k equal to the number of distinct values, ties at the cut-off, negative numbers.
- Java specifics: \`HashMap<Integer, Integer>\` with \`merge(x, 1, Integer::sum)\`; a \`PriorityQueue<int[]>\` with an \`Integer.compare\` comparator; never compare two boxed counts with \`==\` (only small \`Integer\`s are cached); \`HashMap\` iteration order is unspecified, so the tie rule must not depend on it.

**Clarifying questions expected:**
- How should ties be ordered, and must the result be sorted by frequency?
- Is k always at most the number of distinct values?

**Code / implementation expected:** Yes — \`HashMap\` counts plus a size-k \`PriorityQueue\` (or the bucket-sort version) in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Java arrays, \`HashMap\` and lambdas; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A music app wants to show "Your top 5 songs this year". It has a log of every play — one line per play, 200,000 lines for a keen listener. Answering the question takes two separate jobs:

1. **Tally.** Go through the log once and keep a running count per song, like tick marks on a sheet with one row per song.
2. **Pick the winners.** From that sheet of counts, pick the 5 rows with the most ticks.

Step 1 is always the same and always fast. Step 2 is where the interview lives: you can sort the whole sheet, you can keep a small "podium" of the 5 best rows seen so far (a heap), or you can use a trick that only works because counts are small whole numbers — put each song into a box labelled with its count, then read the boxes from the highest label down (bucket sort). The same two-step shape answers "most common words", "busiest IP addresses", "trending hashtags" and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If two values have the same count, which comes first — or does the order not matter? | The classic version accepts any order. If it matters, the tie rule must be built into the comparator; this page uses "smaller value first". |
| Must the result be ordered from most to least frequent? | A heap leaves the top k in heap order; you need one more sort or reverse step. |
| Is k always valid (1 ≤ k ≤ number of distinct values)? | If k can exceed the number of distinct values, return them all instead of crashing. |
| How large is n, and how many distinct values are there? | m distinct values decide the cost of step 2: O(m log k) for the heap, O(n) for buckets. |
| Is the data a stream, or too big for one machine? | Exact top-k over a stream needs all counts; at very large scale people use approximate sketches instead. |

## 3. Step 1 — Count With a Hash Map

📌 **Interview term: Frequency map (frequency table)** — a hash map from each distinct value to the number of times it appears. Building it is one pass: O(n) time and O(m) space, where m is the number of distinct values. How the hash map itself works is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).

After counting \`[1, 1, 1, 2, 2, 3]\` you have \`{1: 3, 2: 2, 3: 1}\`. From here on, the problem is "the k entries with the biggest counts" — which is exactly [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) problem with *count* as the key.

## 4. Step 2 — Three Ways to Pick the Top k

**Way 1 — sort the distinct values by count.** O(m log m). Simple and correct; often good enough because m can be much smaller than n.

**Way 2 — a min-heap of size k.** Push each (count, value) pair; whenever the heap grows to k + 1, pop the root, which is the weakest. At the end the heap holds the k strongest. O(m log k) time, O(k) extra space. The details of why a *min*-heap keeps the *largest* are on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Pipeline. The input array is counted into a frequency map, each count and value pair is pushed into a min-heap of size k, and the heap is read out in reverse to give the answer">
  <defs>
    <marker id="b19q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="16" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="86" y="92" text-anchor="middle">input</text>
  <text class="d-sub" x="86" y="116" text-anchor="middle">1, 1, 1, 2, 2, 3</text>
  <path class="d-edge" d="M 160 100 L 206 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-muted" x="212" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="282" y="92" text-anchor="middle">count, O(n)</text>
  <text class="d-sub" x="282" y="116" text-anchor="middle">1:3  2:2  3:1</text>
  <path class="d-edge" d="M 356 100 L 402 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-accent" x="408" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="478" y="92" text-anchor="middle">heap of size k</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">pop when k + 1</text>
  <path class="d-edge" d="M 552 100 L 598 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box" x="604" y="60" width="84" height="80" rx="10"/>
  <text class="d-text" x="646" y="92" text-anchor="middle">answer</text>
  <text class="d-sub" x="646" y="116" text-anchor="middle">[1, 2]</text>
</svg>

With k = 2, the pair (count 1, value 3) is pushed third, the heap grows to 3, and the root — the weakest pair, count 1 — is popped. What is left is value 1 (count 3) and value 2 (count 2).

**Way 3 — bucket sort by count.** A value can appear at most n times, so make n + 1 empty buckets numbered 0 to n and drop each distinct value into the bucket for its count. Then walk the buckets from n down to 1 and collect values until you have k. No comparisons between counts at all: O(n) time and O(n) space.

📌 **Interview term: Bucket sort (counting by frequency)** — sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Buckets indexed by count for the input 1, 1, 1, 2, 2, 3. Bucket 3 holds value 1, bucket 2 holds value 2, bucket 1 holds value 3. They are read from the highest count down">
  <defs>
    <marker id="b19q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="90" y="40" text-anchor="middle">count 0</text>
  <text class="d-text" x="90" y="90" text-anchor="middle">empty</text>
  <rect class="d-box" x="180" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="240" y="40" text-anchor="middle">count 1</text>
  <text class="d-text" x="240" y="90" text-anchor="middle">3</text>
  <rect class="d-box" x="330" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="390" y="40" text-anchor="middle">count 2</text>
  <text class="d-text" x="390" y="90" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="480" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="540" y="40" text-anchor="middle">count 3</text>
  <text class="d-text" x="540" y="90" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 590 150 L 200 150" marker-end="url(#b19q3-b)"/>
  <text class="d-sub" x="395" y="178" text-anchor="middle">read from the highest count down</text>
</svg>

Buckets 4, 5 and 6 also exist for this six-item input but are empty, and are not drawn. Reading from the top gives 1, then 2: the answer for k = 2. Example 2 prints exactly these buckets.

### Ties

When several values share a count, "the top k" is ambiguous. If the interviewer does not care, any order is accepted. If they do, encode the rule in the key. This page uses **most frequent first, and for equal counts the smaller value first**. For the heap, that means the *weakest* entry (the one at the root) is the one with the lowest count, and for equal counts the **larger** value. On \`[4, 4, 1, 1, 2, 2, 3]\` with k = 2, three values tie at count 2 and the rule picks \`[1, 2]\`.

📌 **Interview term: Tie-breaking rule** — a second sort key that decides the order of items whose main key is equal, making the output deterministic.

## 5. Which One Should You Use?

| Situation | Pick | Cost of step 2 |
| :--- | :--- | :--- |
| You want the simplest correct code | Sort the distinct values | O(m log m) |
| k is much smaller than m, or memory for the answer must stay small | Size-k min-heap | O(m log k) time, O(k) space |
| You want strictly linear time | Bucket sort by count | O(n) time, O(n) space |
| The data is a huge stream across many machines | Approximate (Count-Min sketch + heap) | beyond this page |

In an interview, say all three: count first, then "heap for O(n log k), and since counts are bounded by n I can bucket-sort for O(n)". Many interviewers treat the bucket idea as the "aha" answer.

📌 **Interview term: Count-Min sketch** — a small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory.

## 6. The Code in Java

### HashMap + a size-k PriorityQueue

~~~java
// Most frequent first; ties broken by the smaller value first.
static List<Integer> topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> counts = new HashMap<>();          // value -> how many times it appears
    for (int x : nums) counts.merge(x, 1, Integer::sum);
    // Min-heap of {count, value}; root = weakest: lowest count, then the larger value.
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
            a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]));
    for (Map.Entry<Integer, Integer> e : counts.entrySet()) {
        heap.offer(new int[] {e.getValue(), e.getKey()});
        if (heap.size() > k) heap.poll();                   // drop the weakest of k + 1
    }
    List<Integer> result = new ArrayList<>();
    while (!heap.isEmpty()) result.add(heap.poll()[1]);     // weakest first...
    Collections.reverse(result);                            // ...so reverse to get the strongest first
    return result;
}
~~~

**What to point out in this code:**

- \`counts.merge(x, 1, Integer::sum)\` means "put 1 if \`x\` is new, otherwise add 1 to the old value" — one call instead of \`getOrDefault\` plus \`put\`.
- The heap stores \`int[] {count, value}\` pairs. An \`int[]\` has no natural order, so the comparator is mandatory; without it, even the very first \`offer\` threw \`ClassCastException\` (\`[I cannot be cast to class java.lang.Comparable\`) in our OpenJDK 21 run.
- The comparator is the tie rule: lower count first (weakest at the root); for equal counts, \`Integer.compare(b[1], a[1])\` puts the **larger** value nearer the root, so it is the one popped and the smaller value survives.
- \`Integer.compare\` instead of \`a[0] - b[0]\`: subtraction can overflow for extreme values. Counts are small, but the value comparison in the tie rule is not — \`Integer.MIN_VALUE\` is a legal input.
- \`Collections.reverse(result)\` at the end, because polling a min-heap gives the weakest first.

### Sorting with a two-key comparator — and the \`==\` trap

~~~java
static List<Integer> bySorting(int[] nums, int k) {
    Map<Integer, Integer> counts = count(nums);
    List<Integer> order = new ArrayList<>(counts.keySet());
    order.sort((a, b) -> !counts.get(a).equals(counts.get(b))
            ? Integer.compare(counts.get(b), counts.get(a))     // count desc
            : Integer.compare(a, b));                            // value asc
    return order.subList(0, Math.min(k, order.size()));
}
~~~

Look at \`!counts.get(a).equals(counts.get(b))\`. \`counts.get\` returns an \`Integer\` object, and \`==\` between two \`Integer\`s compares **references**. Java caches \`Integer\` objects only for small values (−128 to 127 by default), so \`==\` happens to work while counts are small and silently breaks once they are not — in example 2 the top counts are over 1,000. In an earlier run of ours, two \`Integer\`s holding 1000 compared \`==\` as \`false\`. Use \`.equals\`, or unbox to \`int\` first.

### Bucket sort for O(n)

~~~java
// Bucket sort by frequency: buckets.get(c) holds the values seen exactly c times.
static List<Integer> byBuckets(int[] nums, int k) {
    Map<Integer, Integer> counts = count(nums);
    List<List<Integer>> buckets = new ArrayList<>();
    for (int i = 0; i <= nums.length; i++) buckets.add(new ArrayList<>());
    for (Map.Entry<Integer, Integer> e : counts.entrySet()) buckets.get(e.getValue()).add(e.getKey());
    List<Integer> result = new ArrayList<>();
    for (int c = nums.length; c >= 1; c--) {                 // highest count first
        List<Integer> b = buckets.get(c);
        Collections.sort(b);                                  // sort only to apply the tie rule
        for (int v : b) {
            result.add(v);
            if (result.size() == k) return result;
        }
    }
    return result;
}
~~~

- \`new ArrayList<>()\` is created once per bucket inside the loop, so the buckets are independent lists.
- \`Collections.sort(b)\` is only for the tie rule. Without one, the whole thing is O(n).
- \`HashMap\` iteration order is unspecified, so the order in which values land in a bucket is arbitrary; that is exactly why a tie rule needs an explicit sort.

📌 **Interview term: Autoboxing** — Java automatically wrapping an \`int\` in an \`Integer\` object (and back) when it goes into a collection. It costs an allocation per value and makes \`==\` compare object identity instead of value.

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 200,000 values with a small deterministic random generator (MINSTD), skewed so that small values are more common.

**Example 1 — HashMap + size-k PriorityQueue on six inputs:**

~~~text
[1, 2]
[1]
[1, 2]
[5, -1]
[0]
[5, 6, 7]
~~~

**Example 2 — the buckets for \`[1, 1, 1, 2, 2, 3]\`, then sorting vs heap vs buckets on 200,000 values:**

~~~text
bucket 3: [1]
bucket 2: [2]
bucket 1: [3]
n = 200000, distinct values = 997
top 5 (value:count): 0:1599, 1:1416, 2:1376, 3:1248, 5:1166
sorting, heap and buckets agree: true
~~~

All three methods return the same five values in the same order, because all three apply the same tie rule. \`List.equals\` compares element by element (with \`equals\`), so the \`agree\` check is a value comparison.

## 8. Complexity

With n items and m distinct values (m ≤ n):

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count with \`HashMap.merge\` | O(n) | O(m) | one pass, O(1) average per update (plus boxing) |
| + sort the distinct values | O(n + m log m) | O(m) | \`List.sort\` over m keys |
| + size-k \`PriorityQueue\` | O(n + m log k) | O(m + k) | each of m offers/polls costs O(log k) |
| + bucket sort | O(n) | O(n) | n + 1 lists, each value placed once (plus bucket sorts if ties matter) |

## 9. Edge Cases

- **k equals the number of distinct values** — return all of them; \`[5, 6, 7]\` with k = 3 gives \`[5, 6, 7]\` (all counts are 1, so the tie rule orders them).
- **One element** — \`[1]\`, k = 1 gives \`[1]\`.
- **Ties at the cut-off** — \`[4, 4, 1, 1, 2, 2, 3]\`, k = 2: three values have count 2; the tie rule decides, giving \`[1, 2]\`.
- **Negative numbers and zero** — \`[-1, -1, 5, 5, 5, 0]\`, k = 2 gives \`[5, -1]\`. Make sure nothing uses 0 or −1 as a "missing" marker, and that negating values for a tie rule does not overflow (it cannot for counts, but it can for \`INT_MIN\` values in fixed-width languages).
- **All values equal** — one distinct value; the heap holds one entry and the bucket walk finds it in bucket n.
- **k larger than the number of distinct values** — not valid input in the classic version; returning everything is the friendly choice.

## Common Pitfalls

- **\`counts.get(a) == counts.get(b)\`.** Reference comparison on boxed \`Integer\`s; correct for small counts, wrong for large ones. Use \`.equals\` or \`int\` locals.
- **A \`PriorityQueue<int[]>\` without a comparator.** \`int[]\` is not \`Comparable\`; the first \`offer\` throws \`ClassCastException\`.
- **\`(a, b) -> a[1] - b[1]\` in the tie rule.** Overflows for values far apart; use \`Integer.compare\`.
- **Depending on \`HashMap\` iteration order** for ties. It is unspecified; sort explicitly.
- **Forgetting \`Collections.reverse\`** — polling gives the weakest first.
- **\`order.subList(0, k)\` when k is larger than the list** — throws \`IndexOutOfBoundsException\`; clamp with \`Math.min\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Two steps: count with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap.merge(x, 1, Integer::sum)</code> in O(n), then pick the k largest counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{count, value}</code> of size k, polling whenever it reaches k + 1; the root is always the weakest. O(n + m log k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Buckets:</strong> <span style="color:#f0e2c8;">A count is at most n, so bucket the values by count and read from n down: O(n) time and space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">The comparator encodes the rule: lower count is weaker, and for equal counts the larger value is weaker, so the smaller value wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;">Comparators use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code>, never subtraction, and boxed counts are compared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.equals</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> on two counts sometimes work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java caches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects for small values, so two boxed 100s are often the same object and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is true; two boxed 1000s are different objects and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is false. It compares identity, not value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the bucket method allowed to be linear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It never compares counts; it uses each count as a list index. That works because counts are integers between 1 and n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write this with streams?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts.entrySet().stream().sorted(comparator).limit(k).map(Map.Entry::getKey).toList()</code> — clear, but it sorts all m entries, so it is O(m log m), not O(m log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the data is a stream too big to count exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact top-k needs every count. In small memory you switch to an approximate "heavy hitters" structure: a Count-Min sketch for estimated counts plus a size-k heap of the current leaders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(m) for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> in every approach, plus O(k) for the heap or O(n) for the buckets — and every key and count is a boxed object.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frequency map (frequency table)** | A hash map from each distinct value to the number of times it appears |
| **Bucket sort (counting by frequency)** | Sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n |
| **Tie-breaking rule** | A second sort key that decides the order of items whose main key is equal, making the output deterministic |
| **Count-Min sketch** | A small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory |
| **Autoboxing** | Java automatically wrapping an \`int\` in an \`Integer\` object (and back) when it goes into a collection |

---
**Conclusion:** Top K frequent is "count, then pick the k largest counts". In Java, \`HashMap.merge\` counts in O(n); a size-k \`PriorityQueue<int[]>\` with an \`Integer.compare\` comparator picks the winners in O(m log k) and carries the tie rule; and because counts are bounded by n, bucket sort reaches O(n). The Java-specific traps are all about boxing: compare counts with \`.equals\`, and never write a comparator with subtraction.`,
        examples: [
          {
            label: "Top K frequent with a hash map + size-k min-heap (ties: smaller value first)",
            code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

public class Main {
    // Most frequent first; ties broken by the smaller value first.
    static List<Integer> topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();          // value -> how many times it appears
        for (int x : nums) counts.merge(x, 1, Integer::sum);
        // Min-heap of {count, value}; root = weakest: lowest count, then the larger value.
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
                a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]));
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) {
            heap.offer(new int[] {e.getValue(), e.getKey()});
            if (heap.size() > k) heap.poll();                   // drop the weakest of k + 1
        }
        List<Integer> result = new ArrayList<>();
        while (!heap.isEmpty()) result.add(heap.poll()[1]);     // weakest first...
        Collections.reverse(result);                            // ...so reverse to get the strongest first
        return result;
    }

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) sb.append(i > 0 ? ", " : "").append(xs.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(topKFrequent(new int[] {1, 1, 1, 2, 2, 3}, 2)));    // [1, 2]
        System.out.println(fmt(topKFrequent(new int[] {1}, 1)));                   // [1]
        System.out.println(fmt(topKFrequent(new int[] {4, 4, 1, 1, 2, 2, 3}, 2))); // [1, 2]
        System.out.println(fmt(topKFrequent(new int[] {-1, -1, 5, 5, 5, 0}, 2)));  // [5, -1]
        System.out.println(fmt(topKFrequent(new int[] {3, 0, 1, 0}, 1)));          // [0]
        System.out.println(fmt(topKFrequent(new int[] {5, 6, 7}, 3)));             // [5, 6, 7]
    }
}`,
          },
          {
            label: "Sorting vs heap vs bucket sort on 200,000 skewed values",
            code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

public class Main {
    static long seed = 2024;

    // MINSTD generator, the same in every language.
    static int randBelow(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    static Map<Integer, Integer> count(int[] nums) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int x : nums) counts.merge(x, 1, Integer::sum);
        return counts;
    }

    static List<Integer> bySorting(int[] nums, int k) {
        Map<Integer, Integer> counts = count(nums);
        List<Integer> order = new ArrayList<>(counts.keySet());
        order.sort((a, b) -> !counts.get(a).equals(counts.get(b))
                ? Integer.compare(counts.get(b), counts.get(a))     // count desc
                : Integer.compare(a, b));                            // value asc
        return order.subList(0, Math.min(k, order.size()));
    }

    static List<Integer> byHeap(int[] nums, int k) {
        Map<Integer, Integer> counts = count(nums);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
                a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]));
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) {
            heap.offer(new int[] {e.getValue(), e.getKey()});
            if (heap.size() > k) heap.poll();
        }
        List<Integer> out = new ArrayList<>();
        while (!heap.isEmpty()) out.add(heap.poll()[1]);
        Collections.reverse(out);
        return out;
    }

    // Bucket sort by frequency: buckets.get(c) holds the values seen exactly c times.
    static List<Integer> byBuckets(int[] nums, int k) {
        Map<Integer, Integer> counts = count(nums);
        List<List<Integer>> buckets = new ArrayList<>();
        for (int i = 0; i <= nums.length; i++) buckets.add(new ArrayList<>());
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) buckets.get(e.getValue()).add(e.getKey());
        List<Integer> result = new ArrayList<>();
        for (int c = nums.length; c >= 1; c--) {                 // highest count first
            List<Integer> b = buckets.get(c);
            Collections.sort(b);                                  // sort only to apply the tie rule
            for (int v : b) {
                result.add(v);
                if (result.size() == k) return result;
            }
        }
        return result;
    }

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) sb.append(i > 0 ? ", " : "").append(xs.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        Map<Integer, Integer> small = count(new int[] {1, 1, 1, 2, 2, 3});
        for (int c = 3; c >= 1; c--) {
            List<Integer> vs = new ArrayList<>();
            for (Map.Entry<Integer, Integer> e : small.entrySet()) if (e.getValue() == c) vs.add(e.getKey());
            Collections.sort(vs);
            System.out.println("bucket " + c + ": " + fmt(vs));
        }

        int n = 200000, k = 5;
        int[] data = new int[n];
        for (int i = 0; i < n; i++) {
            int a = randBelow(1000);
            int b = randBelow(1000);
            data[i] = a % (1 + b);                                // skewed toward small values
        }
        Map<Integer, Integer> counts = count(data);
        List<Integer> top = byHeap(data, k);
        System.out.println("n = " + n + ", distinct values = " + counts.size());
        StringBuilder sb = new StringBuilder();
        for (int v : top) sb.append(sb.length() > 0 ? ", " : "").append(v).append(":").append(counts.get(v));
        System.out.println("top 5 (value:count): " + sb);
        boolean same = bySorting(data, k).equals(top) && byBuckets(data, k).equals(top);
        System.out.println("sorting, heap and buckets agree: " + same);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<int>\` and a number k, return the k values that appear most often. If two values appear the same number of times, put the smaller value first. Write it in C++ and tell me the complexity."

**What a strong answer should cover:**
- Two steps: count with a hash map in O(n), then pick the k biggest counts.
- Three ways to pick: sort the m distinct values (O(m log m)), a size-k min-heap (O(m log k)), or bucket sort by count (O(n)) because a count is at most n.
- Ties: encode the rule in the key — \`std::pair<int, int>(count, -value)\` in a \`std::greater\` heap makes the weakest the lowest count, then the larger value.
- Edge cases: k equal to the number of distinct values, ties at the cut-off, negative numbers (and \`-INT_MIN\` overflow if you negate values).
- C++ specifics: \`std::unordered_map<int, int>\` with \`++counts[x]\` (operator[] value-initialises to 0); \`std::priority_queue\` is a max-heap, so add \`std::greater\`; \`unordered_map\` iteration order is unspecified; the evaluation order of operands like \`f() % g()\` is unspecified.

**Clarifying questions expected:**
- How should ties be ordered, and must the result be sorted by frequency?
- Is k always at most the number of distinct values?

**Code / implementation expected:** Yes — \`unordered_map\` counts plus a size-k \`priority_queue\` (or the bucket-sort version) in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need \`std::vector\`, \`std::unordered_map\` and a little template syntax; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A music app wants to show "Your top 5 songs this year". It has a log of every play — one line per play, 200,000 lines for a keen listener. Answering the question takes two separate jobs:

1. **Tally.** Go through the log once and keep a running count per song, like tick marks on a sheet with one row per song.
2. **Pick the winners.** From that sheet of counts, pick the 5 rows with the most ticks.

Step 1 is always the same and always fast. Step 2 is where the interview lives: you can sort the whole sheet, you can keep a small "podium" of the 5 best rows seen so far (a heap), or you can use a trick that only works because counts are small whole numbers — put each song into a box labelled with its count, then read the boxes from the highest label down (bucket sort). The same two-step shape answers "most common words", "busiest IP addresses", "trending hashtags" and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If two values have the same count, which comes first — or does the order not matter? | The classic version accepts any order. If it matters, the tie rule must be built into the comparator; this page uses "smaller value first". |
| Must the result be ordered from most to least frequent? | A heap leaves the top k in heap order; you need one more sort or reverse step. |
| Is k always valid (1 ≤ k ≤ number of distinct values)? | If k can exceed the number of distinct values, return them all instead of crashing. |
| How large is n, and how many distinct values are there? | m distinct values decide the cost of step 2: O(m log k) for the heap, O(n) for buckets. |
| Is the data a stream, or too big for one machine? | Exact top-k over a stream needs all counts; at very large scale people use approximate sketches instead. |

## 3. Step 1 — Count With a Hash Map

📌 **Interview term: Frequency map (frequency table)** — a hash map from each distinct value to the number of times it appears. Building it is one pass: O(n) time and O(m) space, where m is the number of distinct values. How the hash map itself works is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).

After counting \`[1, 1, 1, 2, 2, 3]\` you have \`{1: 3, 2: 2, 3: 1}\`. From here on, the problem is "the k entries with the biggest counts" — which is exactly [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) problem with *count* as the key.

## 4. Step 2 — Three Ways to Pick the Top k

**Way 1 — sort the distinct values by count.** O(m log m). Simple and correct; often good enough because m can be much smaller than n.

**Way 2 — a min-heap of size k.** Push each (count, value) pair; whenever the heap grows to k + 1, pop the root, which is the weakest. At the end the heap holds the k strongest. O(m log k) time, O(k) extra space. The details of why a *min*-heap keeps the *largest* are on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Pipeline. The input array is counted into a frequency map, each count and value pair is pushed into a min-heap of size k, and the heap is read out in reverse to give the answer">
  <defs>
    <marker id="b19q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="16" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="86" y="92" text-anchor="middle">input</text>
  <text class="d-sub" x="86" y="116" text-anchor="middle">1, 1, 1, 2, 2, 3</text>
  <path class="d-edge" d="M 160 100 L 206 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-muted" x="212" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="282" y="92" text-anchor="middle">count, O(n)</text>
  <text class="d-sub" x="282" y="116" text-anchor="middle">1:3  2:2  3:1</text>
  <path class="d-edge" d="M 356 100 L 402 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box-accent" x="408" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="478" y="92" text-anchor="middle">heap of size k</text>
  <text class="d-sub" x="478" y="116" text-anchor="middle">pop when k + 1</text>
  <path class="d-edge" d="M 552 100 L 598 100" marker-end="url(#b19q3-a)"/>
  <rect class="d-box" x="604" y="60" width="84" height="80" rx="10"/>
  <text class="d-text" x="646" y="92" text-anchor="middle">answer</text>
  <text class="d-sub" x="646" y="116" text-anchor="middle">[1, 2]</text>
</svg>

With k = 2, the pair (count 1, value 3) is pushed third, the heap grows to 3, and the root — the weakest pair, count 1 — is popped. What is left is value 1 (count 3) and value 2 (count 2).

**Way 3 — bucket sort by count.** A value can appear at most n times, so make n + 1 empty buckets numbered 0 to n and drop each distinct value into the bucket for its count. Then walk the buckets from n down to 1 and collect values until you have k. No comparisons between counts at all: O(n) time and O(n) space.

📌 **Interview term: Bucket sort (counting by frequency)** — sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Buckets indexed by count for the input 1, 1, 1, 2, 2, 3. Bucket 3 holds value 1, bucket 2 holds value 2, bucket 1 holds value 3. They are read from the highest count down">
  <defs>
    <marker id="b19q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="90" y="40" text-anchor="middle">count 0</text>
  <text class="d-text" x="90" y="90" text-anchor="middle">empty</text>
  <rect class="d-box" x="180" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="240" y="40" text-anchor="middle">count 1</text>
  <text class="d-text" x="240" y="90" text-anchor="middle">3</text>
  <rect class="d-box" x="330" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="390" y="40" text-anchor="middle">count 2</text>
  <text class="d-text" x="390" y="90" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="480" y="50" width="120" height="70" rx="8"/>
  <text class="d-sub" x="540" y="40" text-anchor="middle">count 3</text>
  <text class="d-text" x="540" y="90" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 590 150 L 200 150" marker-end="url(#b19q3-b)"/>
  <text class="d-sub" x="395" y="178" text-anchor="middle">read from the highest count down</text>
</svg>

Buckets 4, 5 and 6 also exist for this six-item input but are empty, and are not drawn. Reading from the top gives 1, then 2: the answer for k = 2. Example 2 prints exactly these buckets.

### Ties

When several values share a count, "the top k" is ambiguous. If the interviewer does not care, any order is accepted. If they do, encode the rule in the key. This page uses **most frequent first, and for equal counts the smaller value first**. For the heap, that means the *weakest* entry (the one at the root) is the one with the lowest count, and for equal counts the **larger** value. On \`[4, 4, 1, 1, 2, 2, 3]\` with k = 2, three values tie at count 2 and the rule picks \`[1, 2]\`.

📌 **Interview term: Tie-breaking rule** — a second sort key that decides the order of items whose main key is equal, making the output deterministic.

## 5. Which One Should You Use?

| Situation | Pick | Cost of step 2 |
| :--- | :--- | :--- |
| You want the simplest correct code | Sort the distinct values | O(m log m) |
| k is much smaller than m, or memory for the answer must stay small | Size-k min-heap | O(m log k) time, O(k) space |
| You want strictly linear time | Bucket sort by count | O(n) time, O(n) space |
| The data is a huge stream across many machines | Approximate (Count-Min sketch + heap) | beyond this page |

In an interview, say all three: count first, then "heap for O(n log k), and since counts are bounded by n I can bucket-sort for O(n)". Many interviewers treat the bucket idea as the "aha" answer.

📌 **Interview term: Count-Min sketch** — a small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory.

## 6. The Code in C++

### unordered_map + a size-k priority_queue

~~~cpp
// Most frequent first; ties broken by the smaller value first.
std::vector<int> topKFrequent(const std::vector<int>& nums, int k) {
    std::unordered_map<int, int> counts;              // value -> how many times it appears
    for (int x : nums) ++counts[x];                   // operator[] inserts 0 first, then ++
    // Min-heap of (count, -value): root = weakest (lowest count, then the larger value).
    using P = std::pair<int, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> heap;
    for (const auto& [value, c] : counts) {
        heap.push({c, -value});
        if ((int)heap.size() > k) heap.pop();         // drop the weakest of k + 1
    }
    std::vector<int> result;
    while (!heap.empty()) {
        result.push_back(-heap.top().second);         // weakest first...
        heap.pop();
    }
    std::reverse(result.begin(), result.end());       // ...so reverse to get the strongest first
    return result;
}
~~~

**What to point out in this code:**

- \`++counts[x]\` works because \`operator[]\` inserts a value-initialised \`int\` (0) for a missing key and returns a reference to it. The flip side: merely *reading* \`counts[y]\` for a key that is not there inserts it. Use \`counts.find(y)\` or \`counts.count(y)\` when you only want to look.
- \`std::pair\` compares lexicographically: first by \`.first\`, then by \`.second\`. With \`std::greater<P>\` the queue is a **min-heap** of pairs, so the top is the lowest count and, among equal counts, the smallest \`-value\` — the **largest** value. That is the weakest entry under our tie rule, so it is the one popped.
- Negating the value is a neat trick, but \`-INT_MIN\` overflows (signed overflow is undefined behaviour). If values can be \`INT_MIN\`, use a custom comparator lambda instead of negation.
- \`structured bindings\` (\`const auto& [value, c]\`) are C++17 and make the map loop readable.
- \`std::reverse\` at the end, because popping a min-heap gives the weakest first.

### Sorting with a two-key comparator

~~~cpp
std::vector<int> bySorting(const std::vector<int>& nums, int k) {
    auto counts = count(nums);
    std::vector<int> order;
    for (const auto& kv : counts) order.push_back(kv.first);
    std::sort(order.begin(), order.end(), [&](int a, int b) {
        if (counts[a] != counts[b]) return counts[a] > counts[b];   // count desc
        return a < b;                                               // value asc
    });
    order.resize(std::min<size_t>(k, order.size()));
    return order;
}
~~~

The lambda captures \`counts\` by reference (\`[&]\`) and returns a **strict** "a goes before b" test. \`std::sort\` needs a strict weak ordering: a comparator that returned \`true\` for equal elements (for example \`counts[a] >= counts[b]\`) is undefined behaviour and can crash or loop. Note also that \`counts[a]\` inside the comparator would insert missing keys — harmless here because every key is present, but \`counts.at(a)\` is the defensive choice.

### Bucket sort for O(n)

~~~cpp
// Bucket sort by frequency: buckets[c] holds the values seen exactly c times.
std::vector<int> byBuckets(const std::vector<int>& nums, int k) {
    auto counts = count(nums);
    std::vector<std::vector<int>> buckets(nums.size() + 1);
    for (const auto& [v, c] : counts) buckets[c].push_back(v);
    std::vector<int> result;
    for (int c = (int)nums.size(); c >= 1; c--) {                  // highest count first
        std::sort(buckets[c].begin(), buckets[c].end());           // sort only to apply the tie rule
        for (int v : buckets[c]) {
            result.push_back(v);
            if ((int)result.size() == k) return result;
        }
    }
    return result;
}
~~~

- \`std::vector<std::vector<int>> buckets(nums.size() + 1)\` creates n + 1 independent empty vectors.
- \`std::sort\` on each bucket is only for the tie rule; \`unordered_map\` iteration order is unspecified, so without it the order of tied values would be arbitrary (and could differ between compilers).

### A C++ trap in the data generator

Example 2 deliberately writes

~~~cpp
int a = randBelow(1000);
int b = randBelow(1000);
data.push_back(a % (1 + b));
~~~

instead of \`randBelow(1000) % (1 + randBelow(1000))\`. In C++ the order in which the two operands of \`%\` are evaluated is **unspecified**, so the one-line version could call the generator in either order and produce different data on different compilers. Python, JavaScript and Java all evaluate left to right, which is why their one-liners are safe.

📌 **Interview term: Unspecified evaluation order** — C++ leaves the order of evaluating most operands (such as both sides of \`%\`, \`+\`, or function arguments) to the compiler, so expressions whose parts have side effects must be split into separate statements.

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 200,000 values with a small deterministic random generator (MINSTD), skewed so that small values are more common.

**Example 1 — unordered_map + size-k priority_queue on six inputs:**

~~~text
[1, 2]
[1]
[1, 2]
[5, -1]
[0]
[5, 6, 7]
~~~

**Example 2 — the buckets for \`[1, 1, 1, 2, 2, 3]\`, then sorting vs heap vs buckets on 200,000 values:**

~~~text
bucket 3: [1]
bucket 2: [2]
bucket 1: [3]
n = 200000, distinct values = 997
top 5 (value:count): 0:1599, 1:1416, 2:1376, 3:1248, 5:1166
sorting, heap and buckets agree: true
~~~

All three methods return the same five values in the same order, because all three apply the same tie rule. \`std::vector\`'s \`==\` compares element by element.

## 8. Complexity

With n items and m distinct values (m ≤ n):

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count with \`unordered_map\` | O(n) average | O(m) | one pass, O(1) average per \`++counts[x]\` |
| + sort the distinct values | O(n + m log m) | O(m) | \`std::sort\` over m keys |
| + size-k \`priority_queue\` | O(n + m log k) | O(m + k) | each of m pushes/pops costs O(log k) |
| + bucket sort | O(n) | O(n) | n + 1 vectors, each value placed once (plus bucket sorts if ties matter) |

## 9. Edge Cases

- **k equals the number of distinct values** — return all of them; \`[5, 6, 7]\` with k = 3 gives \`[5, 6, 7]\` (all counts are 1, so the tie rule orders them).
- **One element** — \`[1]\`, k = 1 gives \`[1]\`.
- **Ties at the cut-off** — \`[4, 4, 1, 1, 2, 2, 3]\`, k = 2: three values have count 2; the tie rule decides, giving \`[1, 2]\`.
- **Negative numbers and zero** — \`[-1, -1, 5, 5, 5, 0]\`, k = 2 gives \`[5, -1]\`. Make sure nothing uses 0 or −1 as a "missing" marker, and that negating values for a tie rule does not overflow (it cannot for counts, but it can for \`INT_MIN\` values in fixed-width languages).
- **All values equal** — one distinct value; the heap holds one entry and the bucket walk finds it in bucket n.
- **k larger than the number of distinct values** — not valid input in the classic version; returning everything is the friendly choice.

## Common Pitfalls

- **Default \`std::priority_queue\` (a max-heap) for the size-k trick.** Add \`std::greater<P>\`, or the root is the strongest instead of the weakest.
- **Reading with \`counts[y]\` when you mean "look up".** It inserts the key.
- **A non-strict comparator** (\`>=\`) for \`std::sort\` — undefined behaviour.
- **Negating \`INT_MIN\`** for the tie trick — signed overflow is undefined behaviour; use a comparator.
- **Depending on \`unordered_map\` iteration order.** It is unspecified; sort explicitly when ties matter.
- **Side effects in one expression**, like \`f() % g()\` with a shared random generator — split them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Two steps: count with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">++counts[x]</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> in O(n), then pick the k largest counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(count, -value)</code> pairs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code>, popping whenever it reaches k + 1; the top is always the weakest. O(n + m log k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Buckets:</strong> <span style="color:#f0e2c8;">A count is at most n, so bucket the values by count and read from n down: O(n) time and space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">Pairs compare lexicographically, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(count, -value)</code> makes the larger value weaker on a tie and the smaller value wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;">I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code> because the default is a max-heap, keep comparators strict, and avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts[y]</code> for plain lookups because it inserts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-value</code> in the pair?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The heap pops the smallest pair. For equal counts I want the larger value to be popped first, and negating makes the larger value the smaller second field. If values can be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MIN</code>, I use a comparator lambda instead, because negating it overflows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the bucket method allowed to be linear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It never compares counts; it uses each count as a vector index. That works because counts are integers between 1 and n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code> make this slower than O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its operations are O(1) on average but O(n) in the worst case if many keys collide. With adversarial inputs you can reserve buckets, use a custom hash, or fall back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> for O(log m) guaranteed per operation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the data is a stream too big to count exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact top-k needs every count. In small memory you switch to an approximate "heavy hitters" structure: a Count-Min sketch for estimated counts plus a size-k heap of the current leaders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::nth_element</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: put the distinct values in a vector and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> with the count-and-tie comparator to move the k strongest to the front in average O(m), then sort only those k if the order matters.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frequency map (frequency table)** | A hash map from each distinct value to the number of times it appears |
| **Bucket sort (counting by frequency)** | Sorting by placing each item in a bucket indexed by its key, which works in linear time when the keys are small integers in a known range — here, counts between 1 and n |
| **Tie-breaking rule** | A second sort key that decides the order of items whose main key is equal, making the output deterministic |
| **Count-Min sketch** | A small, fixed-size table of counters that estimates how often each item appears in a stream, with a bounded over-count; used with a heap for approximate "heavy hitters" when exact counts would not fit in memory |
| **Unspecified evaluation order** | C++ leaves the order of evaluating most operands (such as both sides of \`%\`, \`+\`, or function arguments) to the compiler, so expressions whose parts have side effects must be split into separate statements |

---
**Conclusion:** Top K frequent is "count, then pick the k largest counts". In C++, \`++counts[x]\` on an \`unordered_map\` counts in O(n) on average; a size-k \`priority_queue\` of \`(count, -value)\` pairs with \`std::greater\` picks the winners in O(m log k) and carries the tie rule for free through pair ordering; and because counts are bounded by n, bucket sort reaches O(n). Watch the C++-only traps: the default max-heap, \`operator[]\` inserting on lookup, strict comparators, and unspecified evaluation order.`,
        examples: [
          {
            label: "Top K frequent with a hash map + size-k min-heap (ties: smaller value first)",
            code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

// Most frequent first; ties broken by the smaller value first.
std::vector<int> topKFrequent(const std::vector<int>& nums, int k) {
    std::unordered_map<int, int> counts;              // value -> how many times it appears
    for (int x : nums) ++counts[x];                   // operator[] inserts 0 first, then ++
    // Min-heap of (count, -value): root = weakest (lowest count, then the larger value).
    using P = std::pair<int, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> heap;
    for (const auto& [value, c] : counts) {
        heap.push({c, -value});
        if ((int)heap.size() > k) heap.pop();         // drop the weakest of k + 1
    }
    std::vector<int> result;
    while (!heap.empty()) {
        result.push_back(-heap.top().second);         // weakest first...
        heap.pop();
    }
    std::reverse(result.begin(), result.end());       // ...so reverse to get the strongest first
    return result;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::cout << fmt(topKFrequent({1, 1, 1, 2, 2, 3}, 2)) << "\\n";    // [1, 2]
    std::cout << fmt(topKFrequent({1}, 1)) << "\\n";                   // [1]
    std::cout << fmt(topKFrequent({4, 4, 1, 1, 2, 2, 3}, 2)) << "\\n"; // [1, 2]
    std::cout << fmt(topKFrequent({-1, -1, 5, 5, 5, 0}, 2)) << "\\n";  // [5, -1]
    std::cout << fmt(topKFrequent({3, 0, 1, 0}, 1)) << "\\n";          // [0]
    std::cout << fmt(topKFrequent({5, 6, 7}, 3)) << "\\n";             // [5, 6, 7]
    return 0;
}`,
          },
          {
            label: "Sorting vs heap vs bucket sort on 200,000 skewed values",
            code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

long long seed = 2024;

// MINSTD generator, the same in every language.
int randBelow(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

std::unordered_map<int, int> count(const std::vector<int>& nums) {
    std::unordered_map<int, int> counts;
    for (int x : nums) ++counts[x];
    return counts;
}

std::vector<int> bySorting(const std::vector<int>& nums, int k) {
    auto counts = count(nums);
    std::vector<int> order;
    for (const auto& kv : counts) order.push_back(kv.first);
    std::sort(order.begin(), order.end(), [&](int a, int b) {
        if (counts[a] != counts[b]) return counts[a] > counts[b];   // count desc
        return a < b;                                               // value asc
    });
    order.resize(std::min<size_t>(k, order.size()));
    return order;
}

std::vector<int> byHeap(const std::vector<int>& nums, int k) {
    auto counts = count(nums);
    using P = std::pair<int, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> heap;
    for (const auto& [v, c] : counts) {
        heap.push({c, -v});
        if ((int)heap.size() > k) heap.pop();
    }
    std::vector<int> out;
    while (!heap.empty()) { out.push_back(-heap.top().second); heap.pop(); }
    std::reverse(out.begin(), out.end());
    return out;
}

// Bucket sort by frequency: buckets[c] holds the values seen exactly c times.
std::vector<int> byBuckets(const std::vector<int>& nums, int k) {
    auto counts = count(nums);
    std::vector<std::vector<int>> buckets(nums.size() + 1);
    for (const auto& [v, c] : counts) buckets[c].push_back(v);
    std::vector<int> result;
    for (int c = (int)nums.size(); c >= 1; c--) {                  // highest count first
        std::sort(buckets[c].begin(), buckets[c].end());           // sort only to apply the tie rule
        for (int v : buckets[c]) {
            result.push_back(v);
            if ((int)result.size() == k) return result;
        }
    }
    return result;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    auto small = count({1, 1, 1, 2, 2, 3});
    for (int c = 3; c >= 1; c--) {
        std::vector<int> vs;
        for (const auto& [v, cnt] : small) if (cnt == c) vs.push_back(v);
        std::sort(vs.begin(), vs.end());
        std::cout << "bucket " << c << ": " << fmt(vs) << "\\n";
    }

    const int n = 200000, k = 5;
    std::vector<int> data;
    for (int i = 0; i < n; i++) {
        int a = randBelow(1000);      // two statements: in C++ the order in which the operands
        int b = randBelow(1000);      // of a % b are evaluated is unspecified
        data.push_back(a % (1 + b));  // skewed toward small values
    }
    auto counts = count(data);
    auto top = byHeap(data, k);
    std::cout << "n = " << n << ", distinct values = " << counts.size() << "\\n";
    std::string line;
    for (int v : top) line += (line.empty() ? "" : ", ") + std::to_string(v) + ":" + std::to_string(counts[v]);
    std::cout << "top 5 (value:count): " << line << "\\n";
    bool same = bySorting(data, k) == top && byBuckets(data, k) == top;
    std::cout << "sorting, heap and buckets agree: " << std::boolalpha << same << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the k closest points to the origin?",
    difficulty: "medium",
    seoDescription: "K closest points to the origin: squared distances, a size-k max-heap in O(n log k) or quickselect in average O(n), verified in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of points on a plane as \`[x, y]\` pairs and a number k. Return the k points closest to the origin (0, 0). Write it in Python and explain the complexity. Any order is fine, but tell me how you would make it deterministic."

**What a strong answer should cover:**
- Compare squared distances x² + y²: same order as the real distance, exact integers, no \`sqrt\`.
- A max-heap of size k (the root is the farthest kept point): O(n log k) time, O(k) space, one pass.
- Quickselect on the squared distance: average O(n), worst O(n²), reorders the list; sorting is the O(n log n) baseline.
- Ties: a composite key (distance, x, y) makes the output deterministic.
- Python specifics: \`heapq\` is a min-heap, so push negated keys \`(-d, -x, -y)\` for a max-heap; \`heapq.nsmallest(k, points, key=...)\` is the one-liner; Python integers never overflow, so large coordinates are safe; avoid \`math.sqrt\`/\`math.dist\` in the comparison.

**Clarifying questions expected:**
- How large can the coordinates be, and how should ties be ordered?
- Is k small compared with n, and may I reorder the input?

**Code / implementation expected:** Yes — a size-k heap with \`heapq\` (negated keys) in Python, plus the idea of quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Python lists, tuples and loops; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You open a food delivery app and it shows "the 3 restaurants nearest to you". Your phone is the **origin** of a map, point (0, 0), and every restaurant is a point (x, y) somewhere around it. The app does not need the whole city sorted by distance — it needs only the 3 nearest, and it needs them fast, because thousands of people are asking at the same time.

This is the same problem as [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) wearing a costume: "the k smallest distances" instead of "the k largest numbers". Two new details make it its own interview question: you have to compute a distance for each point (and there is a neat trick that avoids square roots), and the "worst kept item" is now the *farthest* one, so the heap flips from a min-heap to a **max-heap**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the distance the ordinary straight-line (Euclidean) distance? | Other distances (Manhattan: \\|x\\| + \\|y\\|) change the key, not the algorithm. |
| If two points are equally far, which comes first — and must the output be sorted? | The classic version accepts any order. This page sorts the answer by distance, then x, then y, so the output is deterministic. |
| How large can the coordinates be? | Squared distances of coordinates up to 10^4 fit in 32 bits, but 5 · 10^4 does not; fixed-width languages then need 64-bit integers. |
| Is k small compared with n, and can I reorder the input? | Same trade-off as Kth largest: heap for small k or read-only input, quickselect for the fastest average. |
| Will many queries come in for different origins? | Then you want a spatial index (k-d tree, grid), not a scan per query. |

## 3. The Distance, Without the Square Root

The straight-line distance from the origin to (x, y) is √(x² + y²). You do not need the square root at all: if one distance is smaller than another, its square is smaller too (for non-negative numbers, squaring keeps the order). So compare **x² + y²** directly.

📌 **Interview term: Euclidean distance** — the straight-line distance between two points; from the origin to (x, y) it is √(x² + y²).

📌 **Interview term: Squared distance** — x² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 330" role="img" aria-label="Three points around the origin. Point 3, 3 has squared distance 18 and point minus 2, 4 has 20, so they are the two closest. Point 5, minus 1 has 26 and is left out">
  <path class="d-edge-dashed" d="M 40 190 L 480 190"/>
  <path class="d-edge-dashed" d="M 240 20 L 240 310"/>
  <circle class="d-box-accent" cx="240" cy="190" r="7"/>
  <text class="d-sub" x="214" y="214" text-anchor="middle">origin</text>
  <path class="d-edge-accent" d="M 240 190 L 330 100"/>
  <path class="d-edge-accent" d="M 240 190 L 180 70"/>
  <path class="d-edge" d="M 240 190 L 390 220"/>
  <circle class="d-box-accent" cx="330" cy="100" r="9"/>
  <text class="d-text" x="380" y="88" text-anchor="middle">(3, 3)</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">squared 18</text>
  <circle class="d-box-accent" cx="180" cy="70" r="9"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">(-2, 4)</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">squared 20</text>
  <circle class="d-box-muted" cx="390" cy="220" r="9"/>
  <text class="d-text" x="440" y="254" text-anchor="middle">(5, -1)</text>
  <text class="d-sub" x="440" y="272" text-anchor="middle">squared 26</text>
</svg>

With k = 2, the answer is (3, 3) and (−2, 4). Their real distances are about 4.24 and 4.47, but the squared values 18 and 20 give the same order without a single square root. Example 1 runs exactly this input.

## 4. Three Ways to Pick the k Closest

**Way 1 — sort by squared distance** and take the first k. O(n log n). Fine as a first answer.

**Way 2 — a max-heap of size k.** Keep the k closest points seen so far. The one you would throw out first is the **farthest** of them, so it must sit at the root: that is a *max*-heap on squared distance. For each new point, if it is closer than the root, replace the root; otherwise ignore it. O(n log k) time, O(k) space, one pass, input untouched.

📌 **Interview term: Max-heap of size k** — for "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each point gets a squared distance and is compared with the root of a max-heap, which is the farthest of the k points kept. A closer point replaces the root, a farther one is ignored">
  <defs>
    <marker id="b19q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="110" text-anchor="middle">point (x, y)</text>
  <text class="d-sub" x="95" y="132" text-anchor="middle">key x*x + y*y</text>
  <path class="d-edge" d="M 174 115 L 222 115" marker-end="url(#b19q4-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">key below the root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = farthest kept</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q4-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q4-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore the point</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison</text>
</svg>

On 50,000 random points with k = 5 (example 2), only 52 points ever entered the heap; every other point was rejected with a single comparison against the root.

**Way 3 — quickselect on the key.** Partition the points around a random pivot's squared distance until the k closest occupy the first k slots. Average O(n), worst case O(n²), and it reorders the array. Unlike Kth largest, you keep the whole first part (the k points), not just one value. The trade-offs between the heap and quickselect are exactly those on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), and the partition step is explained on [how quickselect works](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

### Ties and output order

Several points can be exactly as far away: (1, 0), (0, 1), (−1, 0) and (0, −1) all have squared distance 1. If the interviewer does not care, any k of them are fine. To make the output deterministic, this page uses the key **(squared distance, x, y)** and returns the answer sorted by it — so for k = 2 the answer is (−1, 0), (0, −1).

📌 **Interview term: Composite key** — a key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next.

## 6. The Code in Python

### A max-heap of size k with \`heapq\`

\`heapq\` only offers a min-heap ([what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue) explains why that is the default). To keep the *farthest* kept point at the root, store **negated** keys: the largest \`(d, x, y)\` becomes the smallest \`(-d, -x, -y)\`.

~~~python
def k_closest(points, k):
    """Max-heap of size k keyed on (squared distance, x, y); the root is the farthest kept."""
    heap = []                                   # heapq is a min-heap, so store negated keys
    for x, y in points:
        d = x * x + y * y                       # squared distance: no sqrt, exact integers
        key = (-d, -x, -y)
        if len(heap) < k:
            heapq.heappush(heap, key)
        elif key > heap[0]:                     # closer than the farthest kept point
            heapq.heapreplace(heap, key)
    kept = [(-nd, -nx, -ny) for nd, nx, ny in heap]
    kept.sort()                                 # nearest first; ties by x, then y
    return [[x, y] for d, x, y in kept]
~~~

**What to point out in this code:**

- \`x * x + y * y\` is an exact Python \`int\` of any size — Python integers never overflow — so the large-coordinate trap of Java and C++ does not exist here.
- Negating **every** field of the tuple matters. If you negated only \`d\`, ties would be broken by the *smallest* x being the farthest, the opposite of the intended order.
- \`key > heap[0]\` in negated space means "the original key is smaller", i.e. the new point is closer than the farthest kept one.
- \`heapq.heapreplace\` pops the root and pushes the new key in one sift.
- The final \`kept.sort()\` is only for a deterministic output order; drop it if any order is accepted.

### The one-liner and the float trap

~~~python
import heapq
heapq.nsmallest(k, points, key=lambda p: (p[0] * p[0] + p[1] * p[1], p[0], p[1]))
~~~

\`heapq.nsmallest\` keeps a size-k heap internally (it is the mirror of the \`nlargest\` source we read on the Kth largest page), so it is also O(n log k) — a good thing to mention after writing the loop.

Avoid \`math.sqrt(x * x + y * y)\`, \`math.hypot(x, y)\` or \`math.dist(...)\` as the key. They are correct for ordering in most cases, but they cost a floating-point operation per point and turn exact integers into rounded floats; for very large coordinates, two different squared distances can round to the same float (in our run \`float(10**18 + 1) == float(10**18)\` was \`True\`). The integer key has neither problem.

### Quickselect on the key

~~~python
def by_quickselect(points, k):
    """Partition on the key until the k smallest keys occupy a[0..k-1]."""
    a = [list(p) for p in points]
    lo, hi, target = 0, len(a) - 1, k - 1
    while lo < hi:
        p = lo + rand_below(hi - lo + 1)
        a[p], a[hi] = a[hi], a[p]
        pivot, store = key(a[hi]), lo
        for i in range(lo, hi):
            if key(a[i]) < pivot:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            break
        if store < target:
            lo = store + 1
        else:
            hi = store - 1
    return sorted(a[:k], key=key)
~~~

This is the Kth-largest quickselect with the comparison done on \`key(point)\` and the target index k − 1: when it stops, \`a[0:k]\` holds the k closest points in some order. \`rand_below\` is the example's deterministic generator; in your own code use \`random.randint(lo, hi)\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 50,000 points with coordinates from −10,000 to 10,000 using a small deterministic random generator (MINSTD).

**Example 1 — the size-k max-heap on five inputs:**

~~~text
[[-2, 2]]
[[3, 3], [-2, 4]]
[[0, 0]]
[[-1, 0], [0, -1]]
[[1, 1], [-10000, -10000]]
~~~

**Example 2 — sorting vs heap vs quickselect on 50,000 points, and a large squared distance:**

~~~text
n = 50000 points, k = 5
closest: [[65, -8], [-50, 52], [-54, -48], [73, 14], [63, -51]]
squared distances: 4289, 5204, 5220, 5525, 6570
sorting, heap and quickselect agree: true
points that entered the size-5 heap: 52
squared distance of [50000, 50000]: 5000000000
~~~

All three methods return the same five points. Only 52 of the 50,000 points ever entered the heap. The last line is 5,000,000,000, which Python prints without any special care; in Java or C++ the same expression in 32-bit \`int\` overflows.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`sorted(points, key=...)[:k]\` | O(n log n) | O(n) | simplest |
| size-k heap (\`heapq\` with negated keys) | O(n log k) | O(k) | one pass, input untouched, works on a stream |
| \`heapq.nsmallest(k, points, key=...)\` | O(n log k) | O(k) | the library version |
| quickselect on the key | O(n) average, O(n²) worst | O(n) copy (or in place) | reorders the list |

## 9. Edge Cases

- **k = n** — return every point; the heap simply never rejects anything.
- **One point** — \`[[0, 0]]\`, k = 1 returns \`[[0, 0]]\`; a point at the origin has squared distance 0.
- **Ties** — four points at distance 1 in example 1; the composite key picks (−1, 0) and (0, −1).
- **Opposite points** — (10000, 10000) and (−10000, −10000) have the same squared distance, 200,000,000; with k = 2 example 1 keeps (1, 1) and the tie-break picks x = −10000.
- **Large coordinates** — squared distances can exceed 2³¹ − 1 = 2,147,483,647 once a coordinate passes about 46,340; example 2 prints 5,000,000,000 for (50000, 50000).
- **Duplicate points** — the same point listed twice counts twice; both copies can be in the answer.

## Common Pitfalls

- **Using a min-heap of all n points.** \`heapify\` everything and pop k is O(n + k log n) time but O(n) memory, and it cannot run on a stream. The size-k heap must be a *max*-heap — negated keys in \`heapq\`.
- **Negating only the distance** in a tuple key, which reverses the tie-break fields.
- **Pushing \`(d, [x, y])\` tuples.** On a distance tie Python compares the lists — that works for lists of ints, but if the payload is a dict or custom object it raises \`TypeError\`. Put plain comparable fields (or a counter) in the tuple.
- **\`math.sqrt\` per point** — slower and inexact for no benefit.
- **Returning heap order as if it were sorted.** The heap list is in heap order; sort it if the order matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key:</strong> <span style="color:#f0e2c8;">Compare squared distances <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x*x + y*y</code>: same order as the real distance, exact integers, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sqrt</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a max-heap of the k closest so far; its root is the farthest kept point, and a new point replaces it only if closer. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition on the squared distance until the first k slots hold the k closest: average O(n), worst O(n²), and it reorders the list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">A composite key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(d, x, y)</code> makes the result deterministic; I sort the k results by it at the end if order matters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is a min-heap, so I push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(-d, -x, -y)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nsmallest(k, points, key=...)</code> is the one-liner, and Python ints cannot overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a max-heap when we want the smallest distances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The decision per point is "is it closer than the worst point I am keeping?". The worst kept point is the farthest, the maximum, so a max-heap gives it in O(1) at the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to drop the square root?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. For non-negative numbers a &lt; b exactly when a² &lt; b², so sorting by x² + y² gives the same order as sorting by the distance — and with integers there is no rounding at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use quickselect instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a one-off query on data already in memory that I may reorder, when I want the best average time. For streaming points, a read-only list, or a guaranteed bound, the size-k heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the origin changes and many queries arrive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A linear scan per query is O(n). For many queries on fixed points, build a spatial index — a k-d tree or a grid of buckets — so each query only looks near the origin.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Manhattan distance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the key: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs(x) + abs(y)</code>. The heap and quickselect code stay the same.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Euclidean distance** | The straight-line distance between two points; from the origin to (x, y) it is √(x² + y²) |
| **Squared distance** | X² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point |
| **Max-heap of size k** | For "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root |
| **Composite key** | A key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next |

---
**Conclusion:** K closest points is the Kth-largest pattern with a distance key. Compare squared distances so everything stays an exact integer, keep a max-heap of size k (negated tuples in Python's min-heap \`heapq\`) for an O(n log k) one-pass answer, or quickselect on the key for an average O(n) answer that reorders the list. A composite key (distance, x, y) makes the output deterministic, and in Python you never have to worry about the squared distance overflowing.`,
        examples: [
          {
            label: "K closest points with a size-k max-heap on squared distance",
            code: `import heapq


def k_closest(points, k):
    """Max-heap of size k keyed on (squared distance, x, y); the root is the farthest kept."""
    heap = []                                   # heapq is a min-heap, so store negated keys
    for x, y in points:
        d = x * x + y * y                       # squared distance: no sqrt, exact integers
        key = (-d, -x, -y)
        if len(heap) < k:
            heapq.heappush(heap, key)
        elif key > heap[0]:                     # closer than the farthest kept point
            heapq.heapreplace(heap, key)
    kept = [(-nd, -nx, -ny) for nd, nx, ny in heap]
    kept.sort()                                 # nearest first; ties by x, then y
    return [[x, y] for d, x, y in kept]


def fmt(points):
    return "[" + ", ".join("[" + str(x) + ", " + str(y) + "]" for x, y in points) + "]"


print(fmt(k_closest([[1, 3], [-2, 2]], 1)))  # [[-2, 2]]
print(fmt(k_closest([[3, 3], [5, -1], [-2, 4]], 2)))  # [[3, 3], [-2, 4]]
print(fmt(k_closest([[0, 0]], 1)))  # [[0, 0]]
print(fmt(k_closest([[1, 0], [0, 1], [-1, 0], [0, -1], [2, 2]], 2)))  # [[-1, 0], [0, -1]]
print(fmt(k_closest([[10000, 10000], [-10000, -10000], [1, 1]], 2)))  # [[1, 1], [-10000, -10000]]`,
          },
          {
            label: "Sorting vs heap vs quickselect on 50,000 points, and 64-bit squared distances",
            code: `import heapq

seed = 99


def rand_below(m):
    """MINSTD generator, the same in every language."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % m


def key(p):
    return (p[0] * p[0] + p[1] * p[1], p[0], p[1])


def by_sorting(points, k):
    return sorted(points, key=key)[:k]


def by_heap(points, k):
    heap, entries = [], 0
    for p in points:
        d, x, y = key(p)
        neg = (-d, -x, -y)
        if len(heap) < k:
            heapq.heappush(heap, neg)
            entries += 1
        elif neg > heap[0]:
            heapq.heapreplace(heap, neg)
            entries += 1
    return sorted([[-nx, -ny] for nd, nx, ny in heap], key=key), entries


def by_quickselect(points, k):
    """Partition on the key until the k smallest keys occupy a[0..k-1]."""
    a = [list(p) for p in points]
    lo, hi, target = 0, len(a) - 1, k - 1
    while lo < hi:
        p = lo + rand_below(hi - lo + 1)
        a[p], a[hi] = a[hi], a[p]
        pivot, store = key(a[hi]), lo
        for i in range(lo, hi):
            if key(a[i]) < pivot:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            break
        if store < target:
            lo = store + 1
        else:
            hi = store - 1
    return sorted(a[:k], key=key)


def fmt(points):
    return "[" + ", ".join("[" + str(x) + ", " + str(y) + "]" for x, y in points) + "]"


n, k = 50000, 5
points = [[rand_below(20001) - 10000, rand_below(20001) - 10000] for _ in range(n)]
s = by_sorting(points, k)
h, entries = by_heap(points, k)
q = by_quickselect(points, k)
print("n = " + str(n) + " points, k = " + str(k))
print("closest: " + fmt(h))
print("squared distances: " + ", ".join(str(key(p)[0]) for p in h))
print("sorting, heap and quickselect agree: " + str(s == h == q).lower())
print("points that entered the size-5 heap: " + str(entries))
big = [50000, 50000]
print("squared distance of [50000, 50000]: " + str(big[0] * big[0] + big[1] * big[1]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of points \`[x, y]\` and a number k. Return the k points closest to the origin (0, 0). Write it in JavaScript and explain the complexity. Any order is fine, but tell me how you would make it deterministic."

**What a strong answer should cover:**
- Compare squared distances x² + y²: same order as the real distance, no \`Math.sqrt\`.
- A max-heap of size k (the root is the farthest kept point): O(n log k) time, O(k) space, one pass.
- Quickselect on the squared distance: average O(n), worst O(n²), reorders the array; sorting is the O(n log n) baseline.
- Ties: a composite key (distance, x, y), written as a comparator \`a[0] - b[0] || a[1] - b[1] || a[2] - b[2]\`.
- JavaScript specifics: no built-in heap, so a small class with a comparator; numbers are 64-bit floats, so x² + y² is exact only up to \`Number.MAX_SAFE_INTEGER\` (coordinates up to about 6.7 × 10⁷); \`sort\` needs a numeric comparator.

**Clarifying questions expected:**
- How large can the coordinates be, and how should ties be ordered?
- Is k small compared with n, and may I reorder the input?

**Code / implementation expected:** Yes — a size-k max-heap (hand-written heap class) in JavaScript, plus the idea of quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need JavaScript arrays, destructuring and classes; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You open a food delivery app and it shows "the 3 restaurants nearest to you". Your phone is the **origin** of a map, point (0, 0), and every restaurant is a point (x, y) somewhere around it. The app does not need the whole city sorted by distance — it needs only the 3 nearest, and it needs them fast, because thousands of people are asking at the same time.

This is the same problem as [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) wearing a costume: "the k smallest distances" instead of "the k largest numbers". Two new details make it its own interview question: you have to compute a distance for each point (and there is a neat trick that avoids square roots), and the "worst kept item" is now the *farthest* one, so the heap flips from a min-heap to a **max-heap**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the distance the ordinary straight-line (Euclidean) distance? | Other distances (Manhattan: \\|x\\| + \\|y\\|) change the key, not the algorithm. |
| If two points are equally far, which comes first — and must the output be sorted? | The classic version accepts any order. This page sorts the answer by distance, then x, then y, so the output is deterministic. |
| How large can the coordinates be? | Squared distances of coordinates up to 10^4 fit in 32 bits, but 5 · 10^4 does not; fixed-width languages then need 64-bit integers. |
| Is k small compared with n, and can I reorder the input? | Same trade-off as Kth largest: heap for small k or read-only input, quickselect for the fastest average. |
| Will many queries come in for different origins? | Then you want a spatial index (k-d tree, grid), not a scan per query. |

## 3. The Distance, Without the Square Root

The straight-line distance from the origin to (x, y) is √(x² + y²). You do not need the square root at all: if one distance is smaller than another, its square is smaller too (for non-negative numbers, squaring keeps the order). So compare **x² + y²** directly.

📌 **Interview term: Euclidean distance** — the straight-line distance between two points; from the origin to (x, y) it is √(x² + y²).

📌 **Interview term: Squared distance** — x² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 330" role="img" aria-label="Three points around the origin. Point 3, 3 has squared distance 18 and point minus 2, 4 has 20, so they are the two closest. Point 5, minus 1 has 26 and is left out">
  <path class="d-edge-dashed" d="M 40 190 L 480 190"/>
  <path class="d-edge-dashed" d="M 240 20 L 240 310"/>
  <circle class="d-box-accent" cx="240" cy="190" r="7"/>
  <text class="d-sub" x="214" y="214" text-anchor="middle">origin</text>
  <path class="d-edge-accent" d="M 240 190 L 330 100"/>
  <path class="d-edge-accent" d="M 240 190 L 180 70"/>
  <path class="d-edge" d="M 240 190 L 390 220"/>
  <circle class="d-box-accent" cx="330" cy="100" r="9"/>
  <text class="d-text" x="380" y="88" text-anchor="middle">(3, 3)</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">squared 18</text>
  <circle class="d-box-accent" cx="180" cy="70" r="9"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">(-2, 4)</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">squared 20</text>
  <circle class="d-box-muted" cx="390" cy="220" r="9"/>
  <text class="d-text" x="440" y="254" text-anchor="middle">(5, -1)</text>
  <text class="d-sub" x="440" y="272" text-anchor="middle">squared 26</text>
</svg>

With k = 2, the answer is (3, 3) and (−2, 4). Their real distances are about 4.24 and 4.47, but the squared values 18 and 20 give the same order without a single square root. Example 1 runs exactly this input.

## 4. Three Ways to Pick the k Closest

**Way 1 — sort by squared distance** and take the first k. O(n log n). Fine as a first answer.

**Way 2 — a max-heap of size k.** Keep the k closest points seen so far. The one you would throw out first is the **farthest** of them, so it must sit at the root: that is a *max*-heap on squared distance. For each new point, if it is closer than the root, replace the root; otherwise ignore it. O(n log k) time, O(k) space, one pass, input untouched.

📌 **Interview term: Max-heap of size k** — for "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each point gets a squared distance and is compared with the root of a max-heap, which is the farthest of the k points kept. A closer point replaces the root, a farther one is ignored">
  <defs>
    <marker id="b19q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="110" text-anchor="middle">point (x, y)</text>
  <text class="d-sub" x="95" y="132" text-anchor="middle">key x*x + y*y</text>
  <path class="d-edge" d="M 174 115 L 222 115" marker-end="url(#b19q4-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">key below the root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = farthest kept</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q4-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q4-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore the point</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison</text>
</svg>

On 50,000 random points with k = 5 (example 2), only 52 points ever entered the heap; every other point was rejected with a single comparison against the root.

**Way 3 — quickselect on the key.** Partition the points around a random pivot's squared distance until the k closest occupy the first k slots. Average O(n), worst case O(n²), and it reorders the array. Unlike Kth largest, you keep the whole first part (the k points), not just one value. The trade-offs between the heap and quickselect are exactly those on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), and the partition step is explained on [how quickselect works](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

### Ties and output order

Several points can be exactly as far away: (1, 0), (0, 1), (−1, 0) and (0, −1) all have squared distance 1. If the interviewer does not care, any k of them are fine. To make the output deterministic, this page uses the key **(squared distance, x, y)** and returns the answer sorted by it — so for k = 2 the answer is (−1, 0), (0, −1).

📌 **Interview term: Composite key** — a key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next.

## 6. The Code in JavaScript

### The heap class

JavaScript has no priority queue, so the examples carry a small binary heap that takes a \`less(x, y)\` function meaning "x belongs nearer the top" (the full walk-through is on [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue)). Passing "x is farther than y" turns it into the max-heap we need.

~~~javascript
// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
~~~

### A max-heap of size k

~~~javascript
// Compare two [d, x, y] keys: negative if a is closer (ties broken by x, then y).
const cmpKey = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function kClosest(points, k) {
  // Max-heap of size k keyed on [squared distance, x, y]; the root is the farthest kept.
  const heap = new Heap((a, b) => cmpKey(a, b) > 0);   // "farther" belongs nearer the top
  for (const [x, y] of points) {
    const key = [x * x + y * y, x, y];                 // squared distance: no sqrt
    if (heap.size < k) heap.push(key);
    else if (cmpKey(key, heap.peek()) < 0) {           // closer than the farthest kept point
      heap.pop();
      heap.push(key);
    }
  }
  const kept = heap.a.slice().sort(cmpKey);            // nearest first
  return kept.map(([d, x, y]) => [x, y]);
}
~~~

**What to point out in this code:**

- \`cmpKey\` is a three-field comparator. \`a[0] - b[0]\` is 0 on a distance tie, and \`||\` then falls through to \`a[1] - b[1]\`, then \`a[2] - b[2]\`. It returns a number, as \`sort\` requires.
- \`new Heap((a, b) => cmpKey(a, b) > 0)\` puts the **farther** key nearer the top: a max-heap.
- \`for (const [x, y] of points)\` destructures each pair. \`heap.a.slice().sort(cmpKey)\` copies the heap's array before sorting so the heap itself is not disturbed.
- \`x * x + y * y\` is a 64-bit float. It is exact while the result stays at or below \`Number.MAX_SAFE_INTEGER\` (2⁵³ − 1 = 9,007,199,254,740,991), which holds for coordinates up to about 67 million (√(2⁵³ / 2), computed in Node). Beyond that, use \`BigInt\`: \`BigInt(x) * BigInt(x) + BigInt(y) * BigInt(y)\` and a \`<\`-based comparator.

### Sorting — and why not \`Math.hypot\`

~~~javascript
const closest = points.slice().sort((p, q) => (p[0] ** 2 + p[1] ** 2) - (q[0] ** 2 + q[1] ** 2)).slice(0, k);
~~~

This is the O(n log n) baseline. Using \`Math.hypot(x, y)\` or \`Math.sqrt\` as the key gives the same order in normal cases but spends a floating-point call per comparison and rounds; the squared integer key is cheaper and exact.

### Quickselect on the key

~~~javascript
function byQuickselect(points, k) {
  // Partition on the key until the k smallest keys occupy a[0..k-1].
  const a = points.map((p) => p.slice());
  let lo = 0, hi = a.length - 1;
  const target = k - 1;
  while (lo < hi) {
    const p = lo + randBelow(hi - lo + 1);
    [a[p], a[hi]] = [a[hi], a[p]];
    const pivot = key(a[hi]);
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (cmpKey(key(a[i]), pivot) < 0) { [a[i], a[store]] = [a[store], a[i]]; store++; }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    if (store === target) break;
    if (store < target) lo = store + 1;
    else hi = store - 1;
  }
  return a.slice(0, k).sort(cmpPoint);
}
~~~

This is the Kth-largest quickselect with the comparison done on \`key(point)\` and the target index k − 1; when it stops, \`a.slice(0, k)\` holds the k closest points in some order. \`randBelow\` is the example's deterministic generator; in your own code \`lo + Math.floor(Math.random() * (hi - lo + 1))\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 50,000 points with coordinates from −10,000 to 10,000 using a small deterministic random generator (MINSTD).

**Example 1 — the size-k max-heap on five inputs:**

~~~text
[[-2, 2]]
[[3, 3], [-2, 4]]
[[0, 0]]
[[-1, 0], [0, -1]]
[[1, 1], [-10000, -10000]]
~~~

**Example 2 — sorting vs heap vs quickselect on 50,000 points, and a large squared distance:**

~~~text
n = 50000 points, k = 5
closest: [[65, -8], [-50, 52], [-54, -48], [73, 14], [63, -51]]
squared distances: 4289, 5204, 5220, 5525, 6570
sorting, heap and quickselect agree: true
points that entered the size-5 heap: 52
squared distance of [50000, 50000]: 5000000000
~~~

All three methods return the same five points. Only 52 of the 50,000 points ever entered the heap. The last line, 5,000,000,000, is far below \`Number.MAX_SAFE_INTEGER\`, so a plain number holds it exactly; in Java or C++ the same expression in 32-bit \`int\` overflows.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`slice().sort(cmp).slice(0, k)\` | O(n log n) | O(n) | simplest |
| size-k max-heap | O(n log k) | O(k) | one pass, input untouched, works on a stream |
| quickselect on the key | O(n) average, O(n²) worst | O(n) copy (or in place) | reorders the array |

## 9. Edge Cases

- **k = n** — return every point; the heap simply never rejects anything.
- **One point** — \`[[0, 0]]\`, k = 1 returns \`[[0, 0]]\`; a point at the origin has squared distance 0.
- **Ties** — four points at distance 1 in example 1; the composite key picks (−1, 0) and (0, −1).
- **Opposite points** — (10000, 10000) and (−10000, −10000) have the same squared distance, 200,000,000; with k = 2 example 1 keeps (1, 1) and the tie-break picks x = −10000.
- **Large coordinates** — squared distances can exceed 2³¹ − 1 = 2,147,483,647 once a coordinate passes about 46,340; example 2 prints 5,000,000,000 for (50000, 50000).
- **Duplicate points** — the same point listed twice counts twice; both copies can be in the answer.

## Common Pitfalls

- **A min-heap of all n points.** Push everything and pop k: O(n) memory and no streaming. The size-k heap is a *max*-heap.
- **A comparator that returns a boolean** (\`(a, b) => a[0] > b[0]\`). \`sort\` and the heap need a negative/zero/positive number.
- **\`sort()\` with no comparator** — it sorts arrays of numbers as strings, and arrays of pairs by their string form \`"3,3"\`.
- **Ignoring precision.** Coordinates above about 6.7 × 10⁷ make x² + y² exceed 2⁵³; use \`BigInt\`.
- **Returning the heap array as if sorted.** It is in heap order; sort it if the order matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key:</strong> <span style="color:#f0e2c8;">Compare squared distances <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x * x + y * y</code>: same order as the real distance, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.sqrt</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a max-heap of the k closest so far; its root is the farthest kept point, and a new point replaces it only if closer. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition on the squared distance until the first k slots hold the k closest: average O(n), worst O(n²), and it reorders the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">A composite key compared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0] - b[0] || a[1] - b[1] || a[2] - b[2]</code> makes the result deterministic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;">No built-in heap, so my small class takes a comparator; numbers are exact up to 2^53, so very large coordinates need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a max-heap when we want the smallest distances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The decision per point is "is it closer than the worst point I am keeping?". The worst kept point is the farthest, the maximum, so a max-heap gives it at the root in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to drop the square root?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. For non-negative numbers a &lt; b exactly when a² &lt; b², so x² + y² orders points exactly like the distance — and it avoids floating-point rounding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When could <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x * x + y * y</code> be wrong in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it exceeds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>, about 9 × 10^15, i.e. coordinates beyond roughly 67 million. Then nearby integers share one float and ties appear that are not real; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> arithmetic fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use quickselect instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a one-off query on an in-memory array I may reorder, when I want the best average time. For streaming points, a read-only array, or a guaranteed bound, the size-k heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if many queries arrive for different origins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A linear scan per query is O(n). For many queries on fixed points, build a spatial index — a k-d tree or a grid — so each query only looks near its origin.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Euclidean distance** | The straight-line distance between two points; from the origin to (x, y) it is √(x² + y²) |
| **Squared distance** | X² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point |
| **Max-heap of size k** | For "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root |
| **Composite key** | A key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next |

---
**Conclusion:** K closest points is the Kth-largest pattern with a distance key. Compare squared distances, keep a max-heap of size k (your own small class, since JavaScript has none) for an O(n log k) one-pass answer, or quickselect on the key for an average O(n) answer that reorders the array. A three-field comparator makes the output deterministic, and the only JavaScript-specific numeric risk — precision above 2⁵³ — starts far beyond typical interview coordinates.`,
        examples: [
          {
            label: "K closest points with a size-k max-heap on squared distance",
            code: `// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Compare two [d, x, y] keys: negative if a is closer (ties broken by x, then y).
const cmpKey = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function kClosest(points, k) {
  // Max-heap of size k keyed on [squared distance, x, y]; the root is the farthest kept.
  const heap = new Heap((a, b) => cmpKey(a, b) > 0);   // "farther" belongs nearer the top
  for (const [x, y] of points) {
    const key = [x * x + y * y, x, y];                 // squared distance: no sqrt
    if (heap.size < k) heap.push(key);
    else if (cmpKey(key, heap.peek()) < 0) {           // closer than the farthest kept point
      heap.pop();
      heap.push(key);
    }
  }
  const kept = heap.a.slice().sort(cmpKey);            // nearest first
  return kept.map(([d, x, y]) => [x, y]);
}

const fmt = (points) => "[" + points.map(([x, y]) => "[" + x + ", " + y + "]").join(", ") + "]";

console.log(fmt(kClosest([[1, 3], [-2, 2]], 1))); // [[-2, 2]]
console.log(fmt(kClosest([[3, 3], [5, -1], [-2, 4]], 2))); // [[3, 3], [-2, 4]]
console.log(fmt(kClosest([[0, 0]], 1))); // [[0, 0]]
console.log(fmt(kClosest([[1, 0], [0, 1], [-1, 0], [0, -1], [2, 2]], 2))); // [[-1, 0], [0, -1]]
console.log(fmt(kClosest([[10000, 10000], [-10000, -10000], [1, 1]], 2))); // [[1, 1], [-10000, -10000]]`,
          },
          {
            label: "Sorting vs heap vs quickselect on 50,000 points, and 64-bit squared distances",
            code: `// A small binary heap with a comparator (JavaScript has no built-in priority queue).
class Heap {
  constructor(less) { this.a = []; this.less = less; }   // less(x, y): x should be nearer the top
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

let seed = 99;
function randBelow(m) {
  // MINSTD generator, the same in every language.
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

const key = (p) => [p[0] * p[0] + p[1] * p[1], p[0], p[1]];
const cmpKey = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const cmpPoint = (p, q) => cmpKey(key(p), key(q));

function bySorting(points, k) {
  return points.slice().sort(cmpPoint).slice(0, k);
}

function byHeap(points, k) {
  const heap = new Heap((a, b) => cmpKey(a, b) > 0);  // max-heap on the key
  let entries = 0;
  for (const p of points) {
    const kk = key(p);
    if (heap.size < k) { heap.push(kk); entries++; }
    else if (cmpKey(kk, heap.peek()) < 0) { heap.pop(); heap.push(kk); entries++; }
  }
  return [heap.a.map(([d, x, y]) => [x, y]).sort(cmpPoint), entries];
}

function byQuickselect(points, k) {
  // Partition on the key until the k smallest keys occupy a[0..k-1].
  const a = points.map((p) => p.slice());
  let lo = 0, hi = a.length - 1;
  const target = k - 1;
  while (lo < hi) {
    const p = lo + randBelow(hi - lo + 1);
    [a[p], a[hi]] = [a[hi], a[p]];
    const pivot = key(a[hi]);
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (cmpKey(key(a[i]), pivot) < 0) { [a[i], a[store]] = [a[store], a[i]]; store++; }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    if (store === target) break;
    if (store < target) lo = store + 1;
    else hi = store - 1;
  }
  return a.slice(0, k).sort(cmpPoint);
}

const fmt = (points) => "[" + points.map(([x, y]) => "[" + x + ", " + y + "]").join(", ") + "]";

const n = 50000, k = 5;
const points = [];
for (let i = 0; i < n; i++) {
  const x = randBelow(20001) - 10000;
  const y = randBelow(20001) - 10000;
  points.push([x, y]);
}
const s = bySorting(points, k);
const [h, entries] = byHeap(points, k);
const q = byQuickselect(points, k);
console.log("n = " + n + " points, k = " + k);
console.log("closest: " + fmt(h));
console.log("squared distances: " + h.map((p) => key(p)[0]).join(", "));
console.log("sorting, heap and quickselect agree: " + (fmt(s) === fmt(h) && fmt(h) === fmt(q)));
console.log("points that entered the size-5 heap: " + entries);
const big = [50000, 50000];
console.log("squared distance of [50000, 50000]: " + (big[0] * big[0] + big[1] * big[1]));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an \`int[][] points\` where each row is \`{x, y}\`, and a number k. Return the k points closest to the origin (0, 0). Write it in Java and explain the complexity. Any order is fine, but tell me how you would make it deterministic."

**What a strong answer should cover:**
- Compare squared distances x² + y²: same order as the real distance, exact integers, no \`Math.sqrt\`.
- A max-heap of size k (the root is the farthest kept point): O(n log k) time, O(k) space, one pass.
- Quickselect on the squared distance: average O(n), worst O(n²), reorders the array; sorting is the O(n log n) baseline.
- Ties: a composite key (distance, x, y) built with \`Comparator.comparingLong(...).thenComparingInt(...)\`.
- Java specifics: \`PriorityQueue\` is a min-heap, so pass \`comparator.reversed()\` (or \`Collections.reverseOrder(cmp)\`); compute the squared distance in \`long\` — \`(long) x * x\`, not \`(long) (x * x)\` — because \`int\` overflows once a coordinate passes 46,340; never compare with \`a - b\`.

**Clarifying questions expected:**
- How large can the coordinates be, and how should ties be ordered?
- Is k small compared with n, and may I reorder the input?

**Code / implementation expected:** Yes — a size-k \`PriorityQueue\` with a reversed comparator in Java, plus the idea of quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need Java arrays, \`PriorityQueue\` and lambdas; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You open a food delivery app and it shows "the 3 restaurants nearest to you". Your phone is the **origin** of a map, point (0, 0), and every restaurant is a point (x, y) somewhere around it. The app does not need the whole city sorted by distance — it needs only the 3 nearest, and it needs them fast, because thousands of people are asking at the same time.

This is the same problem as [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) wearing a costume: "the k smallest distances" instead of "the k largest numbers". Two new details make it its own interview question: you have to compute a distance for each point (and there is a neat trick that avoids square roots), and the "worst kept item" is now the *farthest* one, so the heap flips from a min-heap to a **max-heap**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the distance the ordinary straight-line (Euclidean) distance? | Other distances (Manhattan: \\|x\\| + \\|y\\|) change the key, not the algorithm. |
| If two points are equally far, which comes first — and must the output be sorted? | The classic version accepts any order. This page sorts the answer by distance, then x, then y, so the output is deterministic. |
| How large can the coordinates be? | Squared distances of coordinates up to 10^4 fit in 32 bits, but 5 · 10^4 does not; fixed-width languages then need 64-bit integers. |
| Is k small compared with n, and can I reorder the input? | Same trade-off as Kth largest: heap for small k or read-only input, quickselect for the fastest average. |
| Will many queries come in for different origins? | Then you want a spatial index (k-d tree, grid), not a scan per query. |

## 3. The Distance, Without the Square Root

The straight-line distance from the origin to (x, y) is √(x² + y²). You do not need the square root at all: if one distance is smaller than another, its square is smaller too (for non-negative numbers, squaring keeps the order). So compare **x² + y²** directly.

📌 **Interview term: Euclidean distance** — the straight-line distance between two points; from the origin to (x, y) it is √(x² + y²).

📌 **Interview term: Squared distance** — x² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 330" role="img" aria-label="Three points around the origin. Point 3, 3 has squared distance 18 and point minus 2, 4 has 20, so they are the two closest. Point 5, minus 1 has 26 and is left out">
  <path class="d-edge-dashed" d="M 40 190 L 480 190"/>
  <path class="d-edge-dashed" d="M 240 20 L 240 310"/>
  <circle class="d-box-accent" cx="240" cy="190" r="7"/>
  <text class="d-sub" x="214" y="214" text-anchor="middle">origin</text>
  <path class="d-edge-accent" d="M 240 190 L 330 100"/>
  <path class="d-edge-accent" d="M 240 190 L 180 70"/>
  <path class="d-edge" d="M 240 190 L 390 220"/>
  <circle class="d-box-accent" cx="330" cy="100" r="9"/>
  <text class="d-text" x="380" y="88" text-anchor="middle">(3, 3)</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">squared 18</text>
  <circle class="d-box-accent" cx="180" cy="70" r="9"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">(-2, 4)</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">squared 20</text>
  <circle class="d-box-muted" cx="390" cy="220" r="9"/>
  <text class="d-text" x="440" y="254" text-anchor="middle">(5, -1)</text>
  <text class="d-sub" x="440" y="272" text-anchor="middle">squared 26</text>
</svg>

With k = 2, the answer is (3, 3) and (−2, 4). Their real distances are about 4.24 and 4.47, but the squared values 18 and 20 give the same order without a single square root. Example 1 runs exactly this input.

## 4. Three Ways to Pick the k Closest

**Way 1 — sort by squared distance** and take the first k. O(n log n). Fine as a first answer.

**Way 2 — a max-heap of size k.** Keep the k closest points seen so far. The one you would throw out first is the **farthest** of them, so it must sit at the root: that is a *max*-heap on squared distance. For each new point, if it is closer than the root, replace the root; otherwise ignore it. O(n log k) time, O(k) space, one pass, input untouched.

📌 **Interview term: Max-heap of size k** — for "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each point gets a squared distance and is compared with the root of a max-heap, which is the farthest of the k points kept. A closer point replaces the root, a farther one is ignored">
  <defs>
    <marker id="b19q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="110" text-anchor="middle">point (x, y)</text>
  <text class="d-sub" x="95" y="132" text-anchor="middle">key x*x + y*y</text>
  <path class="d-edge" d="M 174 115 L 222 115" marker-end="url(#b19q4-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">key below the root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = farthest kept</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q4-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q4-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore the point</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison</text>
</svg>

On 50,000 random points with k = 5 (example 2), only 52 points ever entered the heap; every other point was rejected with a single comparison against the root.

**Way 3 — quickselect on the key.** Partition the points around a random pivot's squared distance until the k closest occupy the first k slots. Average O(n), worst case O(n²), and it reorders the array. Unlike Kth largest, you keep the whole first part (the k points), not just one value. The trade-offs between the heap and quickselect are exactly those on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), and the partition step is explained on [how quickselect works](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

### Ties and output order

Several points can be exactly as far away: (1, 0), (0, 1), (−1, 0) and (0, −1) all have squared distance 1. If the interviewer does not care, any k of them are fine. To make the output deterministic, this page uses the key **(squared distance, x, y)** and returns the answer sorted by it — so for k = 2 the answer is (−1, 0), (0, −1).

📌 **Interview term: Composite key** — a key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next.

## 6. The Code in Java

### A max-heap of size k with \`PriorityQueue\`

\`PriorityQueue\` is a min-heap by its comparator ([what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue)), so we build a "nearer first" comparator and hand the queue its **reverse**: the farthest kept point sits at \`peek()\`.

~~~java
// Order keys {squared distance, x, y}: nearer first, ties by x, then y.
static final Comparator<long[]> NEARER = Comparator
        .<long[]>comparingLong(a -> a[0])
        .thenComparingLong(a -> a[1])
        .thenComparingLong(a -> a[2]);

// Max-heap of size k keyed on {squared distance, x, y}; the root is the farthest kept.
static List<int[]> kClosest(int[][] points, int k) {
    PriorityQueue<long[]> heap = new PriorityQueue<>(NEARER.reversed());   // farthest on top
    for (int[] p : points) {
        long d = (long) p[0] * p[0] + (long) p[1] * p[1];   // long: int would overflow past ~46,340
        long[] key = {d, p[0], p[1]};
        if (heap.size() < k) heap.offer(key);
        else if (NEARER.compare(key, heap.peek()) < 0) {   // closer than the farthest kept point
            heap.poll();
            heap.offer(key);
        }
    }
    List<long[]> kept = new ArrayList<>(heap);
    kept.sort(NEARER);                                       // nearest first
    List<int[]> result = new ArrayList<>();
    for (long[] key : kept) result.add(new int[] {(int) key[1], (int) key[2]});
    return result;
}
~~~

**What to point out in this code:**

- **\`(long) p[0] * p[0]\`** — the cast applies to \`p[0]\` *before* the multiplication, so the product is computed in 64 bits. In our run, with x = y = 50,000, \`x * x + y * y\` in \`int\` gave **705032704** (wrapped around), and \`(long) (x * x)\` — casting *after* the multiplication — gave **−1794967296**. Only \`(long) x * x + (long) y * y\` gave 5,000,000,000.
- \`Comparator.<long[]>comparingLong(a -> a[0]).thenComparingLong(a -> a[1]).thenComparingLong(a -> a[2])\` is the composite key, with no subtraction anywhere, so nothing can overflow inside the comparator.
- \`NEARER.reversed()\` turns it into "farther first" for the heap. \`Collections.reverseOrder(NEARER)\` does the same.
- \`new ArrayList<>(heap)\` copies the heap's elements **in heap order**, not sorted order — hence the \`kept.sort(NEARER)\`.

📌 **Interview term: Integer overflow** — when a result does not fit in the type (2,147,483,647 for Java \`int\`), the bits wrap around and you silently get a wrong, often negative, number. For squared distances, 46,341² already exceeds the \`int\` range.

### Sorting with the same comparator

~~~java
int[][] copy = points.clone();
Arrays.sort(copy, NEARER);                  // NEARER over int[] points, as in example 2
int[][] closest = Arrays.copyOf(copy, k);
~~~

\`Arrays.sort\` on objects (an \`int[][]\` is an array of \`int[]\` objects) uses the comparator; the O(n log n) baseline. Note \`points.clone()\` on a 2-D array is a **shallow** copy: the outer array is new, the inner \`int[]\` rows are shared. Reordering rows is safe; changing \`copy[i][0]\` would change the caller's point.

### Quickselect on the key

~~~java
// Partition on the key until the k smallest keys occupy a[0..k-1].
static List<int[]> byQuickselect(int[][] points, int k) {
    int[][] a = points.clone();
    int lo = 0, hi = a.length - 1, target = k - 1;
    while (lo < hi) {
        int p = lo + randBelow(hi - lo + 1);
        int[] t = a[p]; a[p] = a[hi]; a[hi] = t;
        int[] pivot = a[hi];
        int store = lo;
        for (int i = lo; i < hi; i++) {
            if (NEARER.compare(a[i], pivot) < 0) { t = a[i]; a[i] = a[store]; a[store] = t; store++; }
        }
        t = a[store]; a[store] = a[hi]; a[hi] = t;
        if (store == target) break;
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
    List<int[]> out = new ArrayList<>(Arrays.asList(a).subList(0, k));
    out.sort(NEARER);
    return out;
}
~~~

This is the Kth-largest quickselect with the comparison done by \`NEARER\` and the target index k − 1; when it stops, the first k rows hold the k closest points. \`randBelow\` is the example's deterministic generator; in your own code \`ThreadLocalRandom.current().nextInt(lo, hi + 1)\`.

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 50,000 points with coordinates from −10,000 to 10,000 using a small deterministic random generator (MINSTD).

**Example 1 — the size-k max-heap on five inputs:**

~~~text
[[-2, 2]]
[[3, 3], [-2, 4]]
[[0, 0]]
[[-1, 0], [0, -1]]
[[1, 1], [-10000, -10000]]
~~~

**Example 2 — sorting vs heap vs quickselect on 50,000 points, and a large squared distance:**

~~~text
n = 50000 points, k = 5
closest: [[65, -8], [-50, 52], [-54, -48], [73, 14], [63, -51]]
squared distances: 4289, 5204, 5220, 5525, 6570
sorting, heap and quickselect agree: true
points that entered the size-5 heap: 52
squared distance of [50000, 50000]: 5000000000
~~~

All three methods return the same five points. Only 52 of the 50,000 points ever entered the heap. The last line is the \`long\` computation; in \`int\` it would have printed 705032704.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`Arrays.sort(copy, NEARER)\` | O(n log n) | O(n) | simplest |
| size-k \`PriorityQueue\` (reversed comparator) | O(n log k) | O(k) | one pass, input untouched, works on a stream |
| quickselect on the key | O(n) average, O(n²) worst | O(n) shallow copy | reorders the copy |

## 9. Edge Cases

- **k = n** — return every point; the heap simply never rejects anything.
- **One point** — \`[[0, 0]]\`, k = 1 returns \`[[0, 0]]\`; a point at the origin has squared distance 0.
- **Ties** — four points at distance 1 in example 1; the composite key picks (−1, 0) and (0, −1).
- **Opposite points** — (10000, 10000) and (−10000, −10000) have the same squared distance, 200,000,000; with k = 2 example 1 keeps (1, 1) and the tie-break picks x = −10000.
- **Large coordinates** — squared distances can exceed 2³¹ − 1 = 2,147,483,647 once a coordinate passes about 46,340; example 2 prints 5,000,000,000 for (50000, 50000).
- **Duplicate points** — the same point listed twice counts twice; both copies can be in the answer.

## Common Pitfalls

- **\`int\` squared distances.** Wrong (often negative) results once a coordinate passes 46,340; and \`(long) (x * x)\` is still wrong — cast before multiplying.
- **\`(a, b) -> (a[0]*a[0] + a[1]*a[1]) - (b[0]*b[0] + b[1]*b[1])\`.** Two overflow risks in one line. Use \`Long.compare\` or \`Comparator.comparingLong\`.
- **Forgetting \`.reversed()\`** — a plain \`PriorityQueue\` is a min-heap, so the gatekeeper would be the *closest* point and the code would keep the k farthest.
- **Expecting \`new ArrayList<>(heap)\` or the iterator to be sorted.** It is heap order.
- **A min-heap of all n points**, polling k times: O(n) boxed or array objects held at once, and no streaming.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key:</strong> <span style="color:#f0e2c8;">Compare squared distances, computed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) x * x + (long) y * y</code> so they cannot overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEARER.reversed()</code> holds the k closest so far; its root is the farthest kept point, replaced only by a closer one. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quickselect:</strong> <span style="color:#f0e2c8;">Partition on the squared distance until the first k slots hold the k closest: average O(n), worst O(n²), and it reorders the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">The comparator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">comparingLong(dist).thenComparingInt(x).thenComparingInt(y)</code> makes the result deterministic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> is a min-heap, so the comparator is reversed; and I never write a comparator with subtraction.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a max-heap when we want the smallest distances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The decision per point is "is it closer than the worst point I am keeping?". The worst kept point is the farthest, so with a reversed comparator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> returns it in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where exactly does the overflow happen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x * x</code> when both operands are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>: for x = 50,000 the product 2,500,000,000 does not fit, wraps to −1,794,967,296, and casting that result to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> afterwards cannot undo it. Casting one operand first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) x * x</code>, makes the multiplication itself 64-bit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to drop the square root?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. For non-negative numbers a &lt; b exactly when a² &lt; b², so the squared distance orders points exactly like the distance — and it stays an exact integer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use quickselect instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a one-off query on an in-memory array I may reorder, when I want the best average time. For streaming points, read-only input, or a guaranteed bound, the size-k heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if many queries arrive for different origins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scan per query is O(n). For many queries on fixed points, build a spatial index — a k-d tree or a grid — so each query only looks near its origin.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Euclidean distance** | The straight-line distance between two points; from the origin to (x, y) it is √(x² + y²) |
| **Squared distance** | X² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point |
| **Max-heap of size k** | For "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root |
| **Composite key** | A key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next |
| **Integer overflow** | When a result does not fit in the type (2,147,483,647 for Java \`int\`), the bits wrap around and you silently get a wrong, often negative, number |

---
**Conclusion:** K closest points is the Kth-largest pattern with a distance key. In Java, compute squared distances in \`long\` with the cast *before* the multiply, keep a size-k \`PriorityQueue\` with a reversed composite comparator for an O(n log k) one-pass answer, or quickselect on the key for an average O(n) answer that reorders the array. Build comparators with \`comparingLong\` / \`thenComparingInt\` and the code has no overflow anywhere.`,
        examples: [
          {
            label: "K closest points with a size-k max-heap on squared distance",
            code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    // Order keys {squared distance, x, y}: nearer first, ties by x, then y.
    static final Comparator<long[]> NEARER = Comparator
            .<long[]>comparingLong(a -> a[0])
            .thenComparingLong(a -> a[1])
            .thenComparingLong(a -> a[2]);

    // Max-heap of size k keyed on {squared distance, x, y}; the root is the farthest kept.
    static List<int[]> kClosest(int[][] points, int k) {
        PriorityQueue<long[]> heap = new PriorityQueue<>(NEARER.reversed());   // farthest on top
        for (int[] p : points) {
            long d = (long) p[0] * p[0] + (long) p[1] * p[1];   // long: int would overflow past ~46,340
            long[] key = {d, p[0], p[1]};
            if (heap.size() < k) heap.offer(key);
            else if (NEARER.compare(key, heap.peek()) < 0) {   // closer than the farthest kept point
                heap.poll();
                heap.offer(key);
            }
        }
        List<long[]> kept = new ArrayList<>(heap);
        kept.sort(NEARER);                                       // nearest first
        List<int[]> result = new ArrayList<>();
        for (long[] key : kept) result.add(new int[] {(int) key[1], (int) key[2]});
        return result;
    }

    static String fmt(List<int[]> points) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < points.size(); i++)
            sb.append(i > 0 ? ", " : "").append("[").append(points.get(i)[0]).append(", ").append(points.get(i)[1]).append("]");
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(kClosest(new int[][] {{1, 3}, {-2, 2}}, 1)));                         // [[-2, 2]]
        System.out.println(fmt(kClosest(new int[][] {{3, 3}, {5, -1}, {-2, 4}}, 2)));                // [[3, 3], [-2, 4]]
        System.out.println(fmt(kClosest(new int[][] {{0, 0}}, 1)));                                  // [[0, 0]]
        System.out.println(fmt(kClosest(new int[][] {{1, 0}, {0, 1}, {-1, 0}, {0, -1}, {2, 2}}, 2))); // [[-1, 0], [0, -1]]
        System.out.println(fmt(kClosest(new int[][] {{10000, 10000}, {-10000, -10000}, {1, 1}}, 2))); // [[1, 1], [-10000, -10000]]
    }
}`,
          },
          {
            label: "Sorting vs heap vs quickselect on 50,000 points, and 64-bit squared distances",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    static long seed = 99;

    // MINSTD generator, the same in every language.
    static int randBelow(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    static long dist(int[] p) { return (long) p[0] * p[0] + (long) p[1] * p[1]; }

    static final Comparator<int[]> NEARER = Comparator
            .<int[]>comparingLong(Main::dist)
            .thenComparingInt(p -> p[0])
            .thenComparingInt(p -> p[1]);

    static List<int[]> bySorting(int[][] points, int k) {
        int[][] copy = points.clone();
        Arrays.sort(copy, NEARER);
        return new ArrayList<>(Arrays.asList(copy).subList(0, k));
    }

    static int entries;

    static List<int[]> byHeap(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(NEARER.reversed());
        entries = 0;
        for (int[] p : points) {
            if (heap.size() < k) { heap.offer(p); entries++; }
            else if (NEARER.compare(p, heap.peek()) < 0) { heap.poll(); heap.offer(p); entries++; }
        }
        List<int[]> out = new ArrayList<>(heap);
        out.sort(NEARER);
        return out;
    }

    // Partition on the key until the k smallest keys occupy a[0..k-1].
    static List<int[]> byQuickselect(int[][] points, int k) {
        int[][] a = points.clone();
        int lo = 0, hi = a.length - 1, target = k - 1;
        while (lo < hi) {
            int p = lo + randBelow(hi - lo + 1);
            int[] t = a[p]; a[p] = a[hi]; a[hi] = t;
            int[] pivot = a[hi];
            int store = lo;
            for (int i = lo; i < hi; i++) {
                if (NEARER.compare(a[i], pivot) < 0) { t = a[i]; a[i] = a[store]; a[store] = t; store++; }
            }
            t = a[store]; a[store] = a[hi]; a[hi] = t;
            if (store == target) break;
            if (store < target) lo = store + 1;
            else hi = store - 1;
        }
        List<int[]> out = new ArrayList<>(Arrays.asList(a).subList(0, k));
        out.sort(NEARER);
        return out;
    }

    static String fmt(List<int[]> points) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < points.size(); i++)
            sb.append(i > 0 ? ", " : "").append("[").append(points.get(i)[0]).append(", ").append(points.get(i)[1]).append("]");
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int n = 50000, k = 5;
        int[][] points = new int[n][];
        for (int i = 0; i < n; i++) {
            int x = randBelow(20001) - 10000;
            int y = randBelow(20001) - 10000;
            points[i] = new int[] {x, y};
        }
        List<int[]> s = bySorting(points, k), h = byHeap(points, k), q = byQuickselect(points, k);
        System.out.println("n = " + n + " points, k = " + k);
        System.out.println("closest: " + fmt(h));
        StringBuilder ds = new StringBuilder();
        for (int[] p : h) ds.append(ds.length() > 0 ? ", " : "").append(dist(p));
        System.out.println("squared distances: " + ds);
        System.out.println("sorting, heap and quickselect agree: " + (fmt(s).equals(fmt(h)) && fmt(h).equals(fmt(q))));
        System.out.println("points that entered the size-5 heap: " + entries);
        int[] big = {50000, 50000};
        System.out.println("squared distance of [50000, 50000]: " + dist(big));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a \`std::vector<std::vector<int>>\` of points \`{x, y}\` and a number k. Return the k points closest to the origin (0, 0). Write it in C++ and explain the complexity. Any order is fine, but tell me how you would make it deterministic."

**What a strong answer should cover:**
- Compare squared distances x² + y²: same order as the real distance, exact integers, no \`std::sqrt\`.
- A max-heap of size k (the root is the farthest kept point): O(n log k) time, O(k) space, one pass.
- Quickselect on the squared distance — or \`std::nth_element\` with a comparator: average O(n); sorting is the O(n log n) baseline.
- Ties: a composite key \`std::tuple<long long, int, int>\`, which compares lexicographically.
- C++ specifics: \`std::priority_queue\` is already a max-heap, so a tuple key needs no comparator at all; compute the square in \`long long\` (signed \`int\` overflow is undefined behaviour); \`std::nth_element(v.begin(), v.begin() + k, v.end(), cmp)\` is the library one-liner.

**Clarifying questions expected:**
- How large can the coordinates be, and how should ties be ordered?
- Is k small compared with n, and may I reorder the input?

**Code / implementation expected:** Yes — a size-k \`priority_queue\` of tuples (or \`nth_element\`) in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need \`std::vector\`, \`std::tuple\` and a little template syntax; heaps are explained on the linked page.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You open a food delivery app and it shows "the 3 restaurants nearest to you". Your phone is the **origin** of a map, point (0, 0), and every restaurant is a point (x, y) somewhere around it. The app does not need the whole city sorted by distance — it needs only the 3 nearest, and it needs them fast, because thousands of people are asking at the same time.

This is the same problem as [the Kth largest element](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w) wearing a costume: "the k smallest distances" instead of "the k largest numbers". Two new details make it its own interview question: you have to compute a distance for each point (and there is a neat trick that avoids square roots), and the "worst kept item" is now the *farthest* one, so the heap flips from a min-heap to a **max-heap**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the distance the ordinary straight-line (Euclidean) distance? | Other distances (Manhattan: \\|x\\| + \\|y\\|) change the key, not the algorithm. |
| If two points are equally far, which comes first — and must the output be sorted? | The classic version accepts any order. This page sorts the answer by distance, then x, then y, so the output is deterministic. |
| How large can the coordinates be? | Squared distances of coordinates up to 10^4 fit in 32 bits, but 5 · 10^4 does not; fixed-width languages then need 64-bit integers. |
| Is k small compared with n, and can I reorder the input? | Same trade-off as Kth largest: heap for small k or read-only input, quickselect for the fastest average. |
| Will many queries come in for different origins? | Then you want a spatial index (k-d tree, grid), not a scan per query. |

## 3. The Distance, Without the Square Root

The straight-line distance from the origin to (x, y) is √(x² + y²). You do not need the square root at all: if one distance is smaller than another, its square is smaller too (for non-negative numbers, squaring keeps the order). So compare **x² + y²** directly.

📌 **Interview term: Euclidean distance** — the straight-line distance between two points; from the origin to (x, y) it is √(x² + y²).

📌 **Interview term: Squared distance** — x² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 330" role="img" aria-label="Three points around the origin. Point 3, 3 has squared distance 18 and point minus 2, 4 has 20, so they are the two closest. Point 5, minus 1 has 26 and is left out">
  <path class="d-edge-dashed" d="M 40 190 L 480 190"/>
  <path class="d-edge-dashed" d="M 240 20 L 240 310"/>
  <circle class="d-box-accent" cx="240" cy="190" r="7"/>
  <text class="d-sub" x="214" y="214" text-anchor="middle">origin</text>
  <path class="d-edge-accent" d="M 240 190 L 330 100"/>
  <path class="d-edge-accent" d="M 240 190 L 180 70"/>
  <path class="d-edge" d="M 240 190 L 390 220"/>
  <circle class="d-box-accent" cx="330" cy="100" r="9"/>
  <text class="d-text" x="380" y="88" text-anchor="middle">(3, 3)</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">squared 18</text>
  <circle class="d-box-accent" cx="180" cy="70" r="9"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">(-2, 4)</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">squared 20</text>
  <circle class="d-box-muted" cx="390" cy="220" r="9"/>
  <text class="d-text" x="440" y="254" text-anchor="middle">(5, -1)</text>
  <text class="d-sub" x="440" y="272" text-anchor="middle">squared 26</text>
</svg>

With k = 2, the answer is (3, 3) and (−2, 4). Their real distances are about 4.24 and 4.47, but the squared values 18 and 20 give the same order without a single square root. Example 1 runs exactly this input.

## 4. Three Ways to Pick the k Closest

**Way 1 — sort by squared distance** and take the first k. O(n log n). Fine as a first answer.

**Way 2 — a max-heap of size k.** Keep the k closest points seen so far. The one you would throw out first is the **farthest** of them, so it must sit at the root: that is a *max*-heap on squared distance. For each new point, if it is closer than the root, replace the root; otherwise ignore it. O(n log k) time, O(k) space, one pass, input untouched.

📌 **Interview term: Max-heap of size k** — for "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Each point gets a squared distance and is compared with the root of a max-heap, which is the farthest of the k points kept. A closer point replaces the root, a farther one is ignored">
  <defs>
    <marker id="b19q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="110" text-anchor="middle">point (x, y)</text>
  <text class="d-sub" x="95" y="132" text-anchor="middle">key x*x + y*y</text>
  <path class="d-edge" d="M 174 115 L 222 115" marker-end="url(#b19q4-a)"/>
  <rect class="d-box-muted" x="228" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="323" y="110" text-anchor="middle">key below the root?</text>
  <text class="d-sub" x="323" y="132" text-anchor="middle">root = farthest kept</text>
  <path class="d-edge" d="M 422 100 L 474 52" marker-end="url(#b19q4-a)"/>
  <path class="d-edge" d="M 422 130 L 474 178" marker-end="url(#b19q4-a)"/>
  <text class="d-sub" x="438" y="64" text-anchor="middle">yes</text>
  <text class="d-sub" x="438" y="176" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="480" y="16" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="42" text-anchor="middle">replace the root</text>
  <text class="d-sub" x="570" y="62" text-anchor="middle">O(log k)</text>
  <rect class="d-box" x="480" y="152" width="180" height="62" rx="10"/>
  <text class="d-text" x="570" y="178" text-anchor="middle">ignore the point</text>
  <text class="d-sub" x="570" y="198" text-anchor="middle">one comparison</text>
</svg>

On 50,000 random points with k = 5 (example 2), only 52 points ever entered the heap; every other point was rejected with a single comparison against the root.

**Way 3 — quickselect on the key.** Partition the points around a random pivot's squared distance until the k closest occupy the first k slots. Average O(n), worst case O(n²), and it reorders the array. Unlike Kth largest, you keep the whole first part (the k points), not just one value. The trade-offs between the heap and quickselect are exactly those on [the Kth largest page](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w), and the partition step is explained on [how quickselect works](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

### Ties and output order

Several points can be exactly as far away: (1, 0), (0, 1), (−1, 0) and (0, −1) all have squared distance 1. If the interviewer does not care, any k of them are fine. To make the output deterministic, this page uses the key **(squared distance, x, y)** and returns the answer sorted by it — so for k = 2 the answer is (−1, 0), (0, −1).

📌 **Interview term: Composite key** — a key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next.

## 6. The Code in C++

### A max-heap of size k with \`std::priority_queue\`

Here C++ is friendlier than the other languages: \`std::priority_queue\` is a **max-heap** by default ([what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue)), and \`std::tuple\` compares lexicographically, so a \`priority_queue<std::tuple<long long, int, int>>\` keyed on (squared distance, x, y) puts the farthest kept point on top with no comparator at all.

~~~cpp
using Key = std::tuple<long long, int, int>;   // (squared distance, x, y)

// Max-heap of size k; std::priority_queue is a max-heap by default, so the top is the farthest kept.
std::vector<std::vector<int>> kClosest(const std::vector<std::vector<int>>& points, int k) {
    std::priority_queue<Key> heap;
    for (const auto& p : points) {
        long long x = p[0], y = p[1];
        Key key{x * x + y * y, p[0], p[1]};       // long long: x * x in int overflows past ~46,340
        if ((int)heap.size() < k) heap.push(key);
        else if (key < heap.top()) {              // closer than the farthest kept point
            heap.pop();
            heap.push(key);
        }
    }
    std::vector<Key> kept;
    while (!heap.empty()) { kept.push_back(heap.top()); heap.pop(); }
    std::sort(kept.begin(), kept.end());          // tuples compare lexicographically: nearest first
    std::vector<std::vector<int>> result;
    for (const auto& [d, x, y] : kept) result.push_back({x, y});
    return result;
}

// Max-heap of size k; std::priority_queue is a max-heap by default, so the top is the farthest kept.
std::vector<std::vector<int>> kClosest(const std::vector<std::vector<int>>& points, int k) {
    std::priority_queue<Key> heap;
    for (const auto& p : points) {
        long long x = p[0], y = p[1];
        Key key{x * x + y * y, p[0], p[1]};       // long long: x * x in int overflows past ~46,340
        if ((int)heap.size() < k) heap.push(key);
        else if (key < heap.top()) {              // closer than the farthest kept point
            heap.pop();
            heap.push(key);
        }
    }
    std::vector<Key> kept;
    while (!heap.empty()) { kept.push_back(heap.top()); heap.pop(); }
    std::sort(kept.begin(), kept.end());          // tuples compare lexicographically: nearest first
    std::vector<std::vector<int>> result;
    for (const auto& [d, x, y] : kept) result.push_back({x, y});
    return result;
}
~~~

**What to point out in this code:**

- \`long long x = p[0]\` widens **before** multiplying, so \`x * x + y * y\` is computed in 64 bits. With \`int\`, 50,000 · 50,000 = 2,500,000,000 does not fit in 32 bits, and signed overflow is **undefined behaviour** in C++ — the compiler may assume it never happens, so the result is not even reliably "wrapped". Writing \`(long long)(p[0] * p[0])\` is still wrong: the overflow has already happened inside the parentheses.
- \`Key key{x * x + y * y, p[0], p[1]}\` builds the tuple with brace initialisation.
- \`key < heap.top()\` uses tuple \`<\`: compare distance, then x, then y. "Smaller than the farthest kept" means closer.
- \`const auto& [d, x, y] : kept\` is a C++17 structured binding over the tuple.

📌 **Interview term: Undefined behaviour (UB)** — an operation the C++ standard gives no meaning to, such as signed integer overflow; the program may produce any result, so it must be prevented, not detected afterwards.

### The library one-liner: \`std::nth_element\`

~~~cpp
auto cmp = [](const std::vector<int>& a, const std::vector<int>& b) {
    return 1LL * a[0] * a[0] + 1LL * a[1] * a[1] < 1LL * b[0] * b[0] + 1LL * b[1] * b[1];
};
std::nth_element(pts.begin(), pts.begin() + k, pts.end(), cmp);   // if k == pts.size(), every point is an answer
pts.resize(k);   // the k closest, in no particular order
~~~

After the call, every element before position k is "not greater" than the element at k under \`cmp\`, so the first k are the k closest. [cppreference](https://en.cppreference.com/w/cpp/algorithm/nth_element) gives \`nth_element\` linear complexity on average. \`1LL * a[0] * a[0]\` is a common way to force 64-bit arithmetic. If k equals the number of points, every point is in the answer, so handle that case first rather than asking \`nth_element\` to place an element at \`end()\`.

### Quickselect by hand

~~~cpp
// Partition on the key until the k smallest keys occupy a[0..k-1].
std::vector<Point> byQuickselect(std::vector<Point> a, int k) {
    int lo = 0, hi = (int)a.size() - 1, target = k - 1;
    while (lo < hi) {
        int p = lo + randBelow(hi - lo + 1);
        std::swap(a[p], a[hi]);
        Key pivot = key(a[hi]);
        int store = lo;
        for (int i = lo; i < hi; i++)
            if (key(a[i]) < pivot) std::swap(a[i], a[store++]);
        std::swap(a[store], a[hi]);
        if (store == target) break;
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
    a.resize(k);
    std::sort(a.begin(), a.end(), nearer);
    return a;
}
~~~

This is the Kth-largest quickselect with the comparison done on \`key(point)\` and the target index k − 1; when it stops, the first k slots hold the k closest. The vector is taken **by value**, so the caller's order is untouched. \`randBelow\` is the example's deterministic generator; in your own code use \`std::mt19937\` with \`std::uniform_int_distribution\`.

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 generates 50,000 points with coordinates from −10,000 to 10,000 using a small deterministic random generator (MINSTD).

**Example 1 — the size-k max-heap on five inputs:**

~~~text
[[-2, 2]]
[[3, 3], [-2, 4]]
[[0, 0]]
[[-1, 0], [0, -1]]
[[1, 1], [-10000, -10000]]
~~~

**Example 2 — sorting vs heap vs quickselect on 50,000 points, and a large squared distance:**

~~~text
n = 50000 points, k = 5
closest: [[65, -8], [-50, 52], [-54, -48], [73, 14], [63, -51]]
squared distances: 4289, 5204, 5220, 5525, 6570
sorting, heap and quickselect agree: true
points that entered the size-5 heap: 52
squared distance of [50000, 50000]: 5000000000
~~~

All three methods return the same five points (\`std::vector\`'s \`==\` compares element by element). Only 52 of the 50,000 points ever entered the heap. The last line comes from the \`long long\` key; the same arithmetic in \`int\` would be undefined behaviour.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| \`std::sort\` with a key comparator | O(n log n) | O(1) extra (in place) | simplest |
| size-k \`priority_queue<Key>\` | O(n log k) | O(k) | one pass, input untouched, works on a stream |
| \`std::nth_element\` | linear on average | in place | the library selection; reorders |
| hand-written quickselect | O(n) average, O(n²) worst | O(n) copy (or in place) | reorders the copy |
| \`std::partial_sort\` of the first k | O(n log k) | in place | when the k results must also be sorted |

## 9. Edge Cases

- **k = n** — return every point; the heap simply never rejects anything.
- **One point** — \`[[0, 0]]\`, k = 1 returns \`[[0, 0]]\`; a point at the origin has squared distance 0.
- **Ties** — four points at distance 1 in example 1; the composite key picks (−1, 0) and (0, −1).
- **Opposite points** — (10000, 10000) and (−10000, −10000) have the same squared distance, 200,000,000; with k = 2 example 1 keeps (1, 1) and the tie-break picks x = −10000.
- **Large coordinates** — squared distances can exceed 2³¹ − 1 = 2,147,483,647 once a coordinate passes about 46,340; example 2 prints 5,000,000,000 for (50000, 50000).
- **Duplicate points** — the same point listed twice counts twice; both copies can be in the answer.

## Common Pitfalls

- **\`int\` squared distances** — undefined behaviour once a coordinate passes 46,340; widen to \`long long\` *before* multiplying.
- **Adding \`std::greater\` out of habit.** For the k *smallest* you want a max-heap, which is the default; \`std::greater\` would make the root the closest point and keep the k farthest.
- **Not handling k = n before \`nth_element\`** — every point is the answer; return them directly instead of passing \`end()\` as the nth position.
- **A comparator that is not strict** (\`<=\`) — undefined behaviour in \`std::sort\`, \`nth_element\` and \`priority_queue\`.
- **\`std::sqrt\` per point** — slower, inexact, and unnecessary for ordering.
- **Reading \`heap.top()\` after the loop as "the answer".** It is only the farthest of the k; pop all k (or copy the container) to get them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key:</strong> <span style="color:#f0e2c8;">Compare squared distances in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>: same order as the real distance, exact, and no overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue&lt;std::tuple&lt;long long, int, int&gt;&gt;</code> is a max-heap by default, so its top is the farthest kept point, replaced only by a closer one. O(n log k) time, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Selection:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code> with a distance comparator moves the k closest to the front in average linear time; a hand-written quickselect does the same.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">Tuples compare lexicographically, so (distance, x, y) breaks ties deterministically for free.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code> here — the default max-heap is right for "k smallest" — and I widen before multiplying because signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a max-heap when we want the smallest distances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The decision per point is "is it closer than the worst point I am keeping?". The worst kept point is the farthest, the maximum, which the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> keeps at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(long long)(x * x)</code> still wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The multiplication inside the parentheses is done in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so for x = 50,000 it overflows — undefined behaviour — before the cast runs. Widen an operand first: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long long)x * x</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1LL * x * x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nth_element</code> or a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> for a one-off query on a vector I may reorder: average linear and one line. The heap for streaming points, read-only input, or when I want a bound that does not depend on luck.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the k points sorted by distance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either pop the heap into a vector and reverse it, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sort(pts.begin(), pts.begin() + k, pts.end(), cmp)</code>, which sorts just the first k in O(n log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if many queries arrive for different origins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scan per query is O(n). For many queries on fixed points, build a spatial index — a k-d tree or a grid — so each query only looks near its origin.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Euclidean distance** | The straight-line distance between two points; from the origin to (x, y) it is √(x² + y²) |
| **Squared distance** | X² + y², which orders points exactly like the real distance but stays an exact integer: no floating-point rounding and no \`sqrt\` call per point |
| **Max-heap of size k** | For "the k smallest", keep a heap of the current k best with the *largest* of them at the root, so the gatekeeper test ("is this new item smaller than the worst one I kept?") is a single comparison with the root |
| **Composite key** | A key made of several fields compared in order (here distance, then x, then y), so that ties on the first field are broken by the next |
| **Undefined behaviour (UB)** | An operation the C++ standard gives no meaning to, such as signed integer overflow; the program may produce any result, so it must be prevented, not detected afterwards |

---
**Conclusion:** K closest points is the Kth-largest pattern with a distance key. In C++ it is unusually tidy: a \`std::priority_queue\` of \`(long long distance, x, y)\` tuples is already the max-heap you need, ties are broken by tuple ordering, and \`std::nth_element\` gives an average-linear one-liner when reordering is allowed. The one thing to get right is the arithmetic: widen to \`long long\` before multiplying, because signed overflow is undefined behaviour.`,
        examples: [
          {
            label: "K closest points with a size-k max-heap on squared distance",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <vector>

using Key = std::tuple<long long, int, int>;   // (squared distance, x, y)

// Max-heap of size k; std::priority_queue is a max-heap by default, so the top is the farthest kept.
std::vector<std::vector<int>> kClosest(const std::vector<std::vector<int>>& points, int k) {
    std::priority_queue<Key> heap;
    for (const auto& p : points) {
        long long x = p[0], y = p[1];
        Key key{x * x + y * y, p[0], p[1]};       // long long: x * x in int overflows past ~46,340
        if ((int)heap.size() < k) heap.push(key);
        else if (key < heap.top()) {              // closer than the farthest kept point
            heap.pop();
            heap.push(key);
        }
    }
    std::vector<Key> kept;
    while (!heap.empty()) { kept.push_back(heap.top()); heap.pop(); }
    std::sort(kept.begin(), kept.end());          // tuples compare lexicographically: nearest first
    std::vector<std::vector<int>> result;
    for (const auto& [d, x, y] : kept) result.push_back({x, y});
    return result;
}

std::string fmt(const std::vector<std::vector<int>>& points) {
    std::string s = "[";
    for (size_t i = 0; i < points.size(); i++)
        s += (i ? ", " : "") + std::string("[") + std::to_string(points[i][0]) + ", " + std::to_string(points[i][1]) + "]";
    return s + "]";
}

int main() {
    std::cout << fmt(kClosest({{1, 3}, {-2, 2}}, 1)) << "\\n";                         // [[-2, 2]]
    std::cout << fmt(kClosest({{3, 3}, {5, -1}, {-2, 4}}, 2)) << "\\n";                // [[3, 3], [-2, 4]]
    std::cout << fmt(kClosest({{0, 0}}, 1)) << "\\n";                                  // [[0, 0]]
    std::cout << fmt(kClosest({{1, 0}, {0, 1}, {-1, 0}, {0, -1}, {2, 2}}, 2)) << "\\n"; // [[-1, 0], [0, -1]]
    std::cout << fmt(kClosest({{10000, 10000}, {-10000, -10000}, {1, 1}}, 2)) << "\\n"; // [[1, 1], [-10000, -10000]]
    return 0;
}`,
          },
          {
            label: "Sorting vs heap vs quickselect on 50,000 points, and 64-bit squared distances",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

long long seed = 99;

// MINSTD generator, the same in every language.
int randBelow(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

using Point = std::pair<int, int>;
using Key = std::tuple<long long, int, int>;

Key key(const Point& p) {
    long long x = p.first, y = p.second;
    return {x * x + y * y, p.first, p.second};
}

bool nearer(const Point& a, const Point& b) { return key(a) < key(b); }

std::vector<Point> bySorting(std::vector<Point> points, int k) {
    std::sort(points.begin(), points.end(), nearer);
    points.resize(k);
    return points;
}

int entries = 0;

std::vector<Point> byHeap(const std::vector<Point>& points, int k) {
    std::priority_queue<Key> heap;                 // max-heap: farthest kept point on top
    for (const auto& p : points) {
        Key kk = key(p);
        if ((int)heap.size() < k) { heap.push(kk); entries++; }
        else if (kk < heap.top()) { heap.pop(); heap.push(kk); entries++; }
    }
    std::vector<Point> out;
    while (!heap.empty()) { out.push_back({std::get<1>(heap.top()), std::get<2>(heap.top())}); heap.pop(); }
    std::sort(out.begin(), out.end(), nearer);
    return out;
}

// Partition on the key until the k smallest keys occupy a[0..k-1].
std::vector<Point> byQuickselect(std::vector<Point> a, int k) {
    int lo = 0, hi = (int)a.size() - 1, target = k - 1;
    while (lo < hi) {
        int p = lo + randBelow(hi - lo + 1);
        std::swap(a[p], a[hi]);
        Key pivot = key(a[hi]);
        int store = lo;
        for (int i = lo; i < hi; i++)
            if (key(a[i]) < pivot) std::swap(a[i], a[store++]);
        std::swap(a[store], a[hi]);
        if (store == target) break;
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
    a.resize(k);
    std::sort(a.begin(), a.end(), nearer);
    return a;
}

std::string fmt(const std::vector<Point>& points) {
    std::string s = "[";
    for (size_t i = 0; i < points.size(); i++)
        s += (i ? ", " : "") + std::string("[") + std::to_string(points[i].first) + ", " + std::to_string(points[i].second) + "]";
    return s + "]";
}

int main() {
    const int n = 50000, k = 5;
    std::vector<Point> points;
    for (int i = 0; i < n; i++) {
        int x = randBelow(20001) - 10000;   // separate statements: x first, then y
        int y = randBelow(20001) - 10000;
        points.push_back({x, y});
    }
    auto s = bySorting(points, k);
    auto h = byHeap(points, k);
    auto q = byQuickselect(points, k);
    std::cout << "n = " << n << " points, k = " << k << "\\n";
    std::cout << "closest: " << fmt(h) << "\\n";
    std::string ds;
    for (const auto& p : h) ds += (ds.empty() ? "" : ", ") + std::to_string(std::get<0>(key(p)));
    std::cout << "squared distances: " << ds << "\\n";
    std::cout << "sorting, heap and quickselect agree: " << std::boolalpha << (s == h && h == q) << "\\n";
    std::cout << "points that entered the size-5 heap: " << entries << "\\n";
    Point big{50000, 50000};
    std::cout << "squared distance of [50000, 50000]: " << std::get<0>(key(big)) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you merge k sorted lists?",
    difficulty: "hard",
    seoDescription: "Merge k sorted linked lists with a min-heap of the list heads in O(N log k), vs one-by-one and divide-and-conquer merging. Verified in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given k sorted singly linked lists. Merge them into one sorted linked list and return its head. Write it in Python, and tell me the time and space complexity in terms of k and the total number of nodes N."

**What a strong answer should cover:**
- The baseline approaches and their costs: collect-and-sort O(N log N); merging one by one O(N·k).
- The min-heap of the k current heads: pop the smallest, append it, push its \`next\`; O(N log k) time, O(k) extra space, nodes re-linked rather than copied.
- Divide and conquer (pairwise merging in log k rounds) as the other O(N log k) answer, and when each is preferable.
- Edge cases: empty input, empty lists inside the input, duplicates, one list.
- Python specifics: \`heapq\` compares whole tuples, and \`ListNode\` objects are not comparable — push \`(node.val, i, node)\` with a unique tie-breaker \`i\`, or define \`__lt__\`; use a dummy head node.

**Clarifying questions expected:**
- May I re-use the existing nodes, and can lists be empty?
- How large are k and N, and are the lists in memory or streamed?

**Code / implementation expected:** Yes — a full \`heapq\`-based merge on a \`ListNode\` class in Python.`,
        answer: `**Target Audience:** Intermediate — you should know Python classes and how a singly linked list works; heaps are explained on the linked page.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three teachers have each marked a pile of exam papers, and each pile is already sorted by student number, smallest on top. The school office wants **one** pile, sorted by student number. Nobody wants to throw all the papers on the floor and sort them again from scratch — each pile is already in order, and that is valuable.

The natural method: look at the **top paper of every pile**, take the one with the smallest student number, and put it on the output pile. The pile you took it from now shows a new top paper. Repeat until every pile is empty. At every moment you only compare the k papers on top — never anything underneath.

With 3 piles you can eyeball the smallest top. With 1,000 piles you need help finding the smallest of 1,000 tops, again and again, while one of them changes each time. "Give me the smallest, and let me swap one item" is exactly what a [min-heap](/interview-question/what-is-a-heap-priority-queue) is for. This is the classic "k fronts" heap pattern, and it is how databases and big-data systems merge sorted runs on disk (external merge sort).

📌 **Interview term: K-way merge** — combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are these linked lists, and may I re-use (re-link) the existing nodes? | Re-linking needs O(1) extra space for the output; copying values into new nodes costs O(N). |
| Can some lists be empty, or the whole input be empty? | The code must skip empty lists when filling the heap and return an empty list (null) for no input. |
| Roughly how big are k and N (the total number of nodes)? | O(N log k) vs O(N·k) only matters when k is large; for k = 2 this is just [merging two sorted lists](/interview-question/how-do-you-merge-two-sorted-linked-lists). |
| Are duplicates allowed, and must equal values keep their list order? | Duplicates are fine for correctness; a stable order between lists needs a tie-breaker (the list index). |
| Do the lists fit in memory, or are they streams / files? | The heap approach only needs the k current heads, so it works on streams; divide-and-conquer needs random access to all lists. |

## 3. The Building Blocks

📌 **Interview term: Singly linked list** — a chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head. See [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Dummy (sentinel) head** — a throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\`.

Throughout this page N is the **total** number of nodes across all lists and k is the number of lists.

## 4. Four Approaches, From Worst to Best

**1. Collect and sort.** Walk every list, put every value in an array, sort it, build a new list. O(N log N) time, O(N) extra space. It ignores the fact that the lists are already sorted, and it allocates N new nodes.

**2. Merge one by one.** Merge list 1 with list 2, merge the result with list 3, and so on. Each step is the familiar two-list merge, but the running result keeps growing, so the early nodes are compared again and again. With k lists of equal length the total work is about N·k / 2. Example 2 counts **499,435** comparisons for k = 100, N = 10,000, and **4,546,772** for k = 1,000 — the cost grows with k.

**3. A min-heap of the k current heads.** Put the first node of every non-empty list into a min-heap ordered by value. Then repeat: pop the smallest node, append it to the output, and if it has a \`next\`, push that. The heap never holds more than k nodes, so each pop and push costs O(log k), and every node is pushed and popped exactly once: **O(N log k)** time and **O(k)** extra space.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Three sorted lists 1 4 5, 1 3 4 and 2 6. Their first nodes 1, 1 and 2 sit in a min-heap. The smallest is popped and appended to the output">
  <defs>
    <marker id="b19q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">min-heap</text>
  <text class="d-sub" x="110" y="112" text-anchor="middle">heads 1, 1, 2</text>
  <text class="d-sub" x="110" y="134" text-anchor="middle">at most k nodes</text>
  <rect class="d-box-accent" x="280" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="46" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="46" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="46" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="46" text-anchor="middle">list 0</text>
  <rect class="d-box-accent" x="280" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="116" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="116" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="116" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="116" text-anchor="middle">list 1</text>
  <rect class="d-box-accent" x="280" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="186" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="186" text-anchor="middle">6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">list 2</text>
  <path class="d-edge-dashed" d="M 276 41 L 196 92" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 111 L 196 111" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 181 L 196 130" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-accent" d="M 110 164 L 110 214" marker-end="url(#b19q5-a)"/>
  <rect class="d-box-accent" x="40" y="220" width="140" height="60" rx="10"/>
  <text class="d-text" x="110" y="246" text-anchor="middle">output</text>
  <text class="d-sub" x="110" y="266" text-anchor="middle">pop 1 first</text>
</svg>

The heap starts with the three heads. It never sees the nodes behind them until their predecessor has been taken.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="One step of the loop. Pop the smallest node from the heap, append it to the tail of the output, and push its next node if there is one">
  <defs>
    <marker id="b19q5-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="92" text-anchor="middle">pop smallest node</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">O(log k)</text>
  <path class="d-edge" d="M 204 100 L 250 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box-accent" x="256" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="346" y="92" text-anchor="middle">tail.next = node</text>
  <text class="d-sub" x="346" y="116" text-anchor="middle">re-link, no copy</text>
  <path class="d-edge" d="M 440 100 L 486 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box" x="492" y="60" width="170" height="80" rx="10"/>
  <text class="d-text" x="577" y="92" text-anchor="middle">push node.next</text>
  <text class="d-sub" x="577" y="116" text-anchor="middle">if it exists</text>
</svg>

Every node goes through this loop exactly once, which is where N log k comes from: N iterations, each with one pop and at most one push on a heap of at most k nodes.

📌 **Interview term: O(N log k)** — the cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes.

**4. Divide and conquer.** Merge the lists in pairs (1 with 2, 3 with 4, ...), then merge the results in pairs, and so on — like the merge step of merge sort. There are about log₂ k rounds and each round touches every node once, so it is also **O(N log k)**, with no heap at all and O(1) extra space besides the recursion or loop. Example 2 counts **68,601** comparisons for k = 100 (N log₂ k ≈ 66,439) and **97,921** for k = 1,000 (≈ 99,658). Which of the two O(N log k) methods wins in practice, and why, is the subject of its own page: [merge k sorted lists — heap vs divide-and-conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Divide and conquer** — solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

| Approach | Time | Extra space | Good when |
| :--- | :--- | :--- | :--- |
| Collect and sort | O(N log N) | O(N) | never the best, but a fine baseline to state |
| Merge one by one | O(N · k) | O(1) | k is tiny (2 or 3) |
| Min-heap of heads | O(N log k) | O(k) | lists are streams, or k is large and you want one simple loop |
| Divide and conquer | O(N log k) | O(1) iterative | all lists are in memory; no heap needed |

## 6. The Code in Python

~~~python
class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def merge_k_lists(lists):
    """Min-heap of (value, list index, node): always take the smallest current head."""
    heap = []
    for i, node in enumerate(lists):
        if node:                                   # skip empty lists
            heapq.heappush(heap, (node.val, i, node))
    dummy = ListNode(0)                            # placeholder in front of the answer
    tail = dummy
    while heap:
        val, i, node = heapq.heappop(heap)         # smallest head among all lists
        tail.next = node                           # re-use the node, no copying
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
~~~

**What to point out in this code:**

- **Why the tuple has three fields.** \`heapq\` compares the items you push. If you push \`(node.val, node)\` and two values are equal, Python goes on to compare the two \`ListNode\` objects — and they have no ordering. In our run, pushing two \`(1, ListNode(1))\` tuples raised \`TypeError: '<' not supported between instances of 'ListNode' and 'ListNode'\`. The list index \`i\` sits in the middle as a **tie-breaker**: at any moment each list has at most one node in the heap, so no two entries share an \`i\`, and the node is never compared.
- A side effect of using \`i\`: equal values come out in list order (list 0 before list 1), which makes the merge stable across lists.
- **The dummy head** removes the special case "is the output still empty?". \`tail\` always points at the last node of the output; the answer is \`dummy.next\`.
- **Nodes are re-linked, not copied.** \`tail.next = node\` re-uses the input node, so the only extra memory is the heap of at most k tuples. The input lists are consumed in the process.
- \`if node:\` skips empty lists (\`None\`) when filling the heap.

📌 **Interview term: Tie-breaker** — an extra, always-distinct field placed after the main key in a heap entry so that equal keys never fall through to comparing objects that cannot be compared.

**Alternative: make nodes comparable.** Adding \`def __lt__(self, other): return self.val < other.val\` to \`ListNode\` lets you push nodes directly. It works, but it changes a class you may not own (on LeetCode-style platforms the class is given), so the tuple version is the safer interview answer.

### Divide and conquer, for comparison

~~~python
def merge_two(a, b):
    """Standard two-list merge; counts value comparisons."""
    global comparisons
    dummy = ListNode(0)
    tail = dummy
    while a and b:
        comparisons += 1
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next

def divide_and_conquer(lists):
    lists = list(lists)
    step = 1
    while step < len(lists):                   # merge pairs: 1+2, 3+4, ... then pairs of pairs
        for i in range(0, len(lists) - step, 2 * step):
            lists[i] = merge_two(lists[i], lists[i + step])
        step *= 2
    return lists[0] if lists else None
~~~

\`range(0, len(lists) - step, 2 * step)\` pairs list \`i\` with list \`i + step\`; after each round the merged results sit at indexes 0, 2·step, 4·step, ..., and \`step\` doubles. It is a loop, so there is no recursion at all. The heap-vs-divide-and-conquer trade-off is discussed on [its own page](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds k sorted lists from a small deterministic random generator (MINSTD), so every language merges the same data.

**Example 1 — the heap merge on six inputs:**

~~~text
1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
(empty)
(empty)
1
1 -> 2 -> 3 -> 4 -> 4 -> 5
-3 -> -3 -> -2 -> 0 -> 10
~~~

**Example 2 — one by one vs divide and conquer vs heap, on N = 10,000 nodes:**

~~~text
k = 100 lists, N = 10000 nodes
  one by one:         499435 comparisons
  divide and conquer: 68601 comparisons
  heap:               10000 pops, heap size never above 100
  all three sorted correctly: true
k = 1000 lists, N = 10000 nodes
  one by one:         4546772 comparisons
  divide and conquer: 97921 comparisons
  heap:               10000 pops, heap size never above 1000
  all three sorted correctly: true
~~~

Reading the numbers: merging one by one costs about N·k / 2 comparisons (499,435 for k = 100; 4,546,772 for k = 1,000), while divide and conquer stays close to N·log₂ k (68,601 and 97,921). The heap does exactly N = 10,000 pops whatever k is, and it never holds more than k nodes; each pop costs O(log k) comparisons inside \`heapq\`.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Collect values + \`sorted\` | O(N log N) | O(N) | ignores the existing order and allocates N new nodes |
| Merge one by one | O(N·k) | O(1) | the growing result is re-scanned k times |
| \`heapq\` of heads | O(N log k) | O(k) | N pops and at most N pushes on a heap of at most k entries |
| Divide and conquer | O(N log k) | O(1) | about log₂ k rounds, each touching every node once |

## 9. Edge Cases

- **No lists at all** (\`[]\`) — return an empty list; example 1 prints \`(empty)\`.
- **Only empty lists** (\`[[]]\`, \`[[], [1], []]\`) — empty lists must be skipped when filling the heap; pushing a missing node crashes or compares nothing.
- **One list** — the heap holds one node at a time and the output is the input.
- **Duplicates across lists** — \`[[1, 4, 5], [1, 3, 4], [2, 6]]\` has two 1s and two 4s; both appear in the output.
- **Negative values** — \`[[-3, 0], [-3, -2, 10]]\` works unchanged; nothing assumes values are positive.
- **Very unequal lengths** — one long list and many short ones; the heap simply holds fewer nodes once the short lists run out.

## Common Pitfalls

- **Pushing \`(val, node)\` without a tie-breaker.** Works until two values are equal, then \`TypeError\`. Use \`(val, i, node)\`.
- **Using \`id(node)\` as the tie-breaker.** It avoids the error, but makes the order of equal values depend on memory addresses; the list index is deterministic and stable.
- **Pushing every node up front.** That makes the heap size N, so the cost becomes O(N log N) and O(N) memory — you lose the "only k fronts" idea.
- **Forgetting to push \`node.next\`.** The output then contains only the k original heads.
- **Not skipping empty lists.** \`heapq.heappush(heap, (node.val, i, node))\` with \`node = None\` raises \`AttributeError\`.
- **Building new nodes (\`ListNode(val)\`) for the output** when re-linking is allowed — O(N) extra memory for no reason.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Keep the current head of every list in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> min-heap; repeatedly pop the smallest, append it to the output, and push its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cost:</strong> <span style="color:#f0e2c8;">Every node is pushed and popped once on a heap of at most k entries: O(N log k) time and O(k) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Python detail:</strong> <span style="color:#f0e2c8;">I push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node.val, i, node)</code>: the list index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> breaks ties so Python never tries to compare two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Plumbing:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> pointer build the output, re-linking the existing nodes; empty lists are skipped when filling the heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Divide and conquer — merge lists in pairs for log₂ k rounds — is also O(N log k) with O(1) extra space; merging one by one is O(N·k).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not push <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(node.val, node)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On equal values Python compares the next tuple field, the nodes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> defines no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>. In our run that raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: '&lt;' not supported between instances of 'ListNode' and 'ListNode'</code>. A unique integer in between prevents the comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merging one by one O(N·k)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The merged result grows with every step, and each merge walks the whole result again. With k equal lists that is about N·k / 2 comparisons — 4,546,772 for k = 1,000 and N = 10,000 in our run, against 97,921 for divide and conquer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap or divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(N log k). The heap needs only the current heads, so it works when lists are streams or files, and it is one loop. Divide and conquer needs all lists in memory but no heap and O(1) extra space. Our counts for both are on the page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists are huge files on disk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the merge phase of an external merge sort: open k file readers, keep one buffered value per file in the heap, write the output as you pop. Memory stays O(k) plus the buffers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity, exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(k) for the heap. The output re-uses the input nodes, so no new nodes are allocated beyond the dummy.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **K-way merge** | Combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements |
| **Singly linked list** | A chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head |
| **Dummy (sentinel) head** | A throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\` |
| **O(N log k)** | The cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes |
| **Divide and conquer** | Solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like merge sort |
| **Tie-breaker** | An extra, always-distinct field placed after the main key in a heap entry so that equal keys never fall through to comparing objects that cannot be compared |

---
**Conclusion:** Merging k sorted lists is the "smallest of k fronts" heap pattern: keep one node per list in a min-heap, pop the smallest, append it, push its successor. Every node passes through a heap of at most k entries, so it costs O(N log k) time and O(k) space, far better than the O(N·k) of merging one by one, and level with divide and conquer. In Python the detail that trips people up is the heap entry: push \`(node.val, list_index, node)\` so equal values never make Python compare two \`ListNode\` objects.`,
        examples: [
          {
            label: "Merge k sorted linked lists with a min-heap of the current heads",
            code: `import heapq


class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def merge_k_lists(lists):
    """Min-heap of (value, list index, node): always take the smallest current head."""
    heap = []
    for i, node in enumerate(lists):
        if node:                                   # skip empty lists
            heapq.heappush(heap, (node.val, i, node))
    dummy = ListNode(0)                            # placeholder in front of the answer
    tail = dummy
    while heap:
        val, i, node = heapq.heappop(heap)         # smallest head among all lists
        tail.next = node                           # re-use the node, no copying
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def show(head):
    out = []
    while head:
        out.append(str(head.val))
        head = head.next
    return " -> ".join(out) if out else "(empty)"


def run(arrays):
    return show(merge_k_lists([build(a) for a in arrays]))


print(run([[1, 4, 5], [1, 3, 4], [2, 6]]))  # 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
print(run([]))  # (empty)
print(run([[]]))  # (empty)
print(run([[], [1], []]))  # 1
print(run([[5], [1, 2, 3], [4, 4]]))  # 1 -> 2 -> 3 -> 4 -> 4 -> 5
print(run([[-3, 0], [-3, -2, 10]]))  # -3 -> -3 -> -2 -> 0 -> 10`,
          },
          {
            label: "One by one vs divide and conquer vs heap: comparisons and heap size counted",
            code: `import heapq

seed = 5


def rand_below(m):
    """MINSTD generator, the same in every language."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % m


class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


comparisons = 0


def merge_two(a, b):
    """Standard two-list merge; counts value comparisons."""
    global comparisons
    dummy = ListNode(0)
    tail = dummy
    while a and b:
        comparisons += 1
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next


def one_by_one(lists):
    result = None
    for head in lists:
        result = merge_two(result, head)       # the result keeps growing
    return result


def divide_and_conquer(lists):
    lists = list(lists)
    step = 1
    while step < len(lists):                   # merge pairs: 1+2, 3+4, ... then pairs of pairs
        for i in range(0, len(lists) - step, 2 * step):
            lists[i] = merge_two(lists[i], lists[i + step])
        step *= 2
    return lists[0] if lists else None


def with_heap(lists):
    heap, pops, biggest = [], 0, 0
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = ListNode(0)
    tail = dummy
    while heap:
        biggest = max(biggest, len(heap))
        val, i, node = heapq.heappop(heap)
        pops += 1
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next, pops, biggest


def make_arrays(k, size):
    arrays = []
    for _ in range(k):
        arrays.append(sorted(rand_below(100000) for _ in range(size)))
    return arrays


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


for k, size in [(100, 100), (1000, 10)]:
    arrays = make_arrays(k, size)
    expected = sorted(v for a in arrays for v in a)
    print("k = " + str(k) + " lists, N = " + str(k * size) + " nodes")
    comparisons = 0
    r1 = to_list(one_by_one([build(a) for a in arrays]))
    print("  one by one:         " + str(comparisons) + " comparisons")
    comparisons = 0
    r2 = to_list(divide_and_conquer([build(a) for a in arrays]))
    print("  divide and conquer: " + str(comparisons) + " comparisons")
    head, pops, biggest = with_heap([build(a) for a in arrays])
    r3 = to_list(head)
    print("  heap:               " + str(pops) + " pops, heap size never above " + str(biggest))
    print("  all three sorted correctly: " + str(r1 == expected and r2 == expected and r3 == expected).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of k sorted singly linked lists (each element is the head node, or \`null\` for an empty list). Merge them into one sorted linked list and return its head. Write it in JavaScript, and give the complexity in terms of k and the total number of nodes N."

**What a strong answer should cover:**
- The baseline approaches and their costs: collect-and-sort O(N log N); merging one by one O(N·k).
- The min-heap of the k current heads: pop the smallest, append it, push its \`next\`; O(N log k) time, O(k) extra space, nodes re-linked rather than copied.
- Divide and conquer (pairwise merging in log k rounds) as the other O(N log k) answer, and when each is preferable.
- Edge cases: empty input array, \`null\` entries, duplicates, one list.
- JavaScript specifics: no built-in priority queue, so a small heap that compares \`node.val\`; check \`if (node)\` to skip \`null\`; prefer an iterative two-list merge — a recursive one overflows the call stack on long lists.

**Clarifying questions expected:**
- May I re-use the existing nodes, and can lists be empty?
- How large are k and N?

**Code / implementation expected:** Yes — a node min-heap class and the merge loop in JavaScript.`,
        answer: `**Target Audience:** Intermediate — you should know JavaScript classes and how a singly linked list works; heaps are explained on the linked page.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three teachers have each marked a pile of exam papers, and each pile is already sorted by student number, smallest on top. The school office wants **one** pile, sorted by student number. Nobody wants to throw all the papers on the floor and sort them again from scratch — each pile is already in order, and that is valuable.

The natural method: look at the **top paper of every pile**, take the one with the smallest student number, and put it on the output pile. The pile you took it from now shows a new top paper. Repeat until every pile is empty. At every moment you only compare the k papers on top — never anything underneath.

With 3 piles you can eyeball the smallest top. With 1,000 piles you need help finding the smallest of 1,000 tops, again and again, while one of them changes each time. "Give me the smallest, and let me swap one item" is exactly what a [min-heap](/interview-question/what-is-a-heap-priority-queue) is for. This is the classic "k fronts" heap pattern, and it is how databases and big-data systems merge sorted runs on disk (external merge sort).

📌 **Interview term: K-way merge** — combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are these linked lists, and may I re-use (re-link) the existing nodes? | Re-linking needs O(1) extra space for the output; copying values into new nodes costs O(N). |
| Can some lists be empty, or the whole input be empty? | The code must skip empty lists when filling the heap and return an empty list (null) for no input. |
| Roughly how big are k and N (the total number of nodes)? | O(N log k) vs O(N·k) only matters when k is large; for k = 2 this is just [merging two sorted lists](/interview-question/how-do-you-merge-two-sorted-linked-lists). |
| Are duplicates allowed, and must equal values keep their list order? | Duplicates are fine for correctness; a stable order between lists needs a tie-breaker (the list index). |
| Do the lists fit in memory, or are they streams / files? | The heap approach only needs the k current heads, so it works on streams; divide-and-conquer needs random access to all lists. |

## 3. The Building Blocks

📌 **Interview term: Singly linked list** — a chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head. See [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Dummy (sentinel) head** — a throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\`.

Throughout this page N is the **total** number of nodes across all lists and k is the number of lists.

## 4. Four Approaches, From Worst to Best

**1. Collect and sort.** Walk every list, put every value in an array, sort it, build a new list. O(N log N) time, O(N) extra space. It ignores the fact that the lists are already sorted, and it allocates N new nodes.

**2. Merge one by one.** Merge list 1 with list 2, merge the result with list 3, and so on. Each step is the familiar two-list merge, but the running result keeps growing, so the early nodes are compared again and again. With k lists of equal length the total work is about N·k / 2. Example 2 counts **499,435** comparisons for k = 100, N = 10,000, and **4,546,772** for k = 1,000 — the cost grows with k.

**3. A min-heap of the k current heads.** Put the first node of every non-empty list into a min-heap ordered by value. Then repeat: pop the smallest node, append it to the output, and if it has a \`next\`, push that. The heap never holds more than k nodes, so each pop and push costs O(log k), and every node is pushed and popped exactly once: **O(N log k)** time and **O(k)** extra space.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Three sorted lists 1 4 5, 1 3 4 and 2 6. Their first nodes 1, 1 and 2 sit in a min-heap. The smallest is popped and appended to the output">
  <defs>
    <marker id="b19q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">min-heap</text>
  <text class="d-sub" x="110" y="112" text-anchor="middle">heads 1, 1, 2</text>
  <text class="d-sub" x="110" y="134" text-anchor="middle">at most k nodes</text>
  <rect class="d-box-accent" x="280" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="46" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="46" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="46" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="46" text-anchor="middle">list 0</text>
  <rect class="d-box-accent" x="280" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="116" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="116" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="116" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="116" text-anchor="middle">list 1</text>
  <rect class="d-box-accent" x="280" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="186" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="186" text-anchor="middle">6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">list 2</text>
  <path class="d-edge-dashed" d="M 276 41 L 196 92" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 111 L 196 111" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 181 L 196 130" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-accent" d="M 110 164 L 110 214" marker-end="url(#b19q5-a)"/>
  <rect class="d-box-accent" x="40" y="220" width="140" height="60" rx="10"/>
  <text class="d-text" x="110" y="246" text-anchor="middle">output</text>
  <text class="d-sub" x="110" y="266" text-anchor="middle">pop 1 first</text>
</svg>

The heap starts with the three heads. It never sees the nodes behind them until their predecessor has been taken.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="One step of the loop. Pop the smallest node from the heap, append it to the tail of the output, and push its next node if there is one">
  <defs>
    <marker id="b19q5-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="92" text-anchor="middle">pop smallest node</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">O(log k)</text>
  <path class="d-edge" d="M 204 100 L 250 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box-accent" x="256" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="346" y="92" text-anchor="middle">tail.next = node</text>
  <text class="d-sub" x="346" y="116" text-anchor="middle">re-link, no copy</text>
  <path class="d-edge" d="M 440 100 L 486 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box" x="492" y="60" width="170" height="80" rx="10"/>
  <text class="d-text" x="577" y="92" text-anchor="middle">push node.next</text>
  <text class="d-sub" x="577" y="116" text-anchor="middle">if it exists</text>
</svg>

Every node goes through this loop exactly once, which is where N log k comes from: N iterations, each with one pop and at most one push on a heap of at most k nodes.

📌 **Interview term: O(N log k)** — the cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes.

**4. Divide and conquer.** Merge the lists in pairs (1 with 2, 3 with 4, ...), then merge the results in pairs, and so on — like the merge step of merge sort. There are about log₂ k rounds and each round touches every node once, so it is also **O(N log k)**, with no heap at all and O(1) extra space besides the recursion or loop. Example 2 counts **68,601** comparisons for k = 100 (N log₂ k ≈ 66,439) and **97,921** for k = 1,000 (≈ 99,658). Which of the two O(N log k) methods wins in practice, and why, is the subject of its own page: [merge k sorted lists — heap vs divide-and-conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Divide and conquer** — solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

| Approach | Time | Extra space | Good when |
| :--- | :--- | :--- | :--- |
| Collect and sort | O(N log N) | O(N) | never the best, but a fine baseline to state |
| Merge one by one | O(N · k) | O(1) | k is tiny (2 or 3) |
| Min-heap of heads | O(N log k) | O(k) | lists are streams, or k is large and you want one simple loop |
| Divide and conquer | O(N log k) | O(1) iterative | all lists are in memory; no heap needed |

## 6. The Code in JavaScript

### The node and the heap

JavaScript has no priority queue, so the example carries a small min-heap specialised for list nodes: it compares \`node.val\` and stores the node objects themselves. (The general version with a comparator is on [what a heap / priority queue is](/interview-question/what-is-a-heap-priority-queue).)

~~~javascript
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// A small binary min-heap of list nodes, ordered by node.val
// (JavaScript has no built-in priority queue).
class NodeHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].val <= a[i].val) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].val < a[m].val) m = l;
        if (r < a.length && a[r].val < a[m].val) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
~~~

### The merge

~~~javascript
function mergeKLists(lists) {
  // Min-heap of nodes: always take the smallest current head.
  const heap = new NodeHeap();
  for (const node of lists) if (node) heap.push(node);   // skip empty lists
  const dummy = new ListNode(0);                          // placeholder in front of the answer
  let tail = dummy;
  while (heap.size > 0) {
    const node = heap.pop();                              // smallest head among all lists
    tail.next = node;                                     // re-use the node, no copying
    tail = node;
    if (node.next) heap.push(node.next);
  }
  return dummy.next;
}
~~~

**What to point out in this code:**

- The heap stores **references** to node objects and compares \`a[p].val <= a[i].val\`. Nothing else about a node is ever compared, so there is no tie-breaking problem: equal values are simply in some order.
- \`if (node)\` skips both \`null\` and \`undefined\` entries. The input \`[[], [1], []]\` becomes \`[null, head, null]\` after \`build\`.
- **The dummy head** removes the "is the output still empty?" special case; the answer is \`dummy.next\`.
- **Nodes are re-linked, not copied:** \`tail.next = node\` re-uses the input node. The input lists are consumed.
- \`new ListNode(val, next = null)\` uses a default parameter, so \`new ListNode(5)\` has \`next === null\`.

### Divide and conquer, for comparison

~~~javascript
function mergeTwo(a, b) {
  // Standard two-list merge; counts value comparisons.
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    comparisons++;
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ? a : b;
  return dummy.next;
}

function divideAndConquer(lists) {
  lists = lists.slice();
  for (let step = 1; step < lists.length; step *= 2) {         // merge pairs, then pairs of pairs
    for (let i = 0; i + step < lists.length; i += 2 * step) {
      lists[i] = mergeTwo(lists[i], lists[i + step]);
    }
  }
  return lists.length ? lists[0] : null;
}
~~~

\`mergeTwo\` is written as a **loop**. The tempting recursive version (\`a.next = merge(a.next, b); return a;\`) uses one stack frame per node: in our Node 22 run it merged two 1,000-node lists fine and threw \`RangeError: Maximum call stack size exceeded\` on two 100,000-node lists. The heap-vs-divide-and-conquer trade-off is discussed on [its own page](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Stack overflow** — running out of call-stack space because recursion goes too deep; in JavaScript it surfaces as \`RangeError: Maximum call stack size exceeded\`, so long linked lists should be walked with loops.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds k sorted lists from a small deterministic random generator (MINSTD), so every language merges the same data.

**Example 1 — the heap merge on six inputs:**

~~~text
1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
(empty)
(empty)
1
1 -> 2 -> 3 -> 4 -> 4 -> 5
-3 -> -3 -> -2 -> 0 -> 10
~~~

**Example 2 — one by one vs divide and conquer vs heap, on N = 10,000 nodes:**

~~~text
k = 100 lists, N = 10000 nodes
  one by one:         499435 comparisons
  divide and conquer: 68601 comparisons
  heap:               10000 pops, heap size never above 100
  all three sorted correctly: true
k = 1000 lists, N = 10000 nodes
  one by one:         4546772 comparisons
  divide and conquer: 97921 comparisons
  heap:               10000 pops, heap size never above 1000
  all three sorted correctly: true
~~~

Reading the numbers: merging one by one costs about N·k / 2 comparisons (499,435 for k = 100; 4,546,772 for k = 1,000), while divide and conquer stays close to N·log₂ k (68,601 and 97,921). The heap does exactly N = 10,000 pops whatever k is, and it never holds more than k nodes; each pop costs O(log k) comparisons inside the heap.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Collect values + sort | O(N log N) | O(N) | ignores the existing order and allocates N new nodes |
| Merge one by one | O(N·k) | O(1) | the growing result is re-scanned k times |
| Node min-heap of heads | O(N log k) | O(k) | N pops and at most N pushes on a heap of at most k nodes |
| Divide and conquer (iterative) | O(N log k) | O(1) | about log₂ k rounds, each touching every node once |

## 9. Edge Cases

- **No lists at all** (\`[]\`) — return an empty list; example 1 prints \`(empty)\`.
- **Only empty lists** (\`[[]]\`, \`[[], [1], []]\`) — empty lists must be skipped when filling the heap; pushing a missing node crashes or compares nothing.
- **One list** — the heap holds one node at a time and the output is the input.
- **Duplicates across lists** — \`[[1, 4, 5], [1, 3, 4], [2, 6]]\` has two 1s and two 4s; both appear in the output.
- **Negative values** — \`[[-3, 0], [-3, -2, 10]]\` works unchanged; nothing assumes values are positive.
- **Very unequal lengths** — one long list and many short ones; the heap simply holds fewer nodes once the short lists run out.

## Common Pitfalls

- **Collecting values with \`flat()\` and \`sort()\`** — O(N log N), new nodes, and without a comparator \`sort()\` orders numbers as strings.
- **Recursive two-list merge** on long lists — \`RangeError\` from the call stack; write the loop.
- **Pushing every node into the heap up front** — heap size N, O(N log N); only the k heads belong in the heap.
- **Forgetting to push \`node.next\`** — the output stops after the k original heads.
- **Not skipping \`null\` lists** — \`heap.push(null)\` throws a \`TypeError\` as soon as the code reads \`null.val\` or \`null.next\`.
- **Using \`shift()\` on an array of heads instead of a heap** — finding the minimum by scanning k heads each time is O(N·k).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Keep the current head of every list in a min-heap keyed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val</code>; repeatedly pop the smallest, append it to the output, and push its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cost:</strong> <span style="color:#f0e2c8;">Every node is pushed and popped once on a heap of at most k nodes: O(N log k) time and O(k) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. JavaScript detail:</strong> <span style="color:#f0e2c8;">There is no built-in heap, so I write a small one that compares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val</code>; it stores node references, so there is nothing else to compare.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Plumbing:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> pointer build the output, re-linking the existing nodes; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (node)</code> skips empty lists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Divide and conquer — merge lists in pairs for log₂ k rounds — is also O(N log k) with O(1) extra space, as long as the two-list merge is a loop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just scan the k heads for the minimum each time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(k) per output node, O(N·k) in total — the same cost as merging one by one. The heap makes "find the minimum, replace one item" O(log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the recursive merge risky in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each recursive call handles one node, so the depth equals the list length. In our Node 22 run two 100,000-node lists overflowed the stack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>; the loop version has no depth at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap or divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(N log k). The heap only needs the current heads, so it works on streams and is one loop; divide and conquer needs all lists in memory but no heap class. Our counts: 97,921 comparisons for divide and conquer at k = 1,000, against 4,546,772 for one by one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists arrive as async streams?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The heap version adapts naturally: keep one pending value per stream in the heap, and after popping from a stream, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> that stream for its next value before pushing it. Memory stays O(k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity, exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(k) for the heap array; the output re-uses the input nodes, so no new nodes are allocated beyond the dummy.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **K-way merge** | Combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements |
| **Singly linked list** | A chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head |
| **Dummy (sentinel) head** | A throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\` |
| **O(N log k)** | The cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes |
| **Divide and conquer** | Solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like merge sort |
| **Stack overflow** | Running out of call-stack space because recursion goes too deep; in JavaScript it surfaces as \`RangeError: Maximum call stack size exceeded\`, so long linked lists should be walked with loops |

---
**Conclusion:** Merging k sorted lists is the "smallest of k fronts" heap pattern: keep one node per list in a min-heap, pop the smallest, append it, push its successor. Every node passes through a heap of at most k nodes, so it costs O(N log k) time and O(k) space, far better than the O(N·k) of merging one by one, and level with divide and conquer. In JavaScript you bring a tiny node heap of your own, skip \`null\` lists, and keep every list walk iterative so long inputs cannot overflow the call stack.`,
        examples: [
          {
            label: "Merge k sorted linked lists with a min-heap of the current heads",
            code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// A small binary min-heap of list nodes, ordered by node.val
// (JavaScript has no built-in priority queue).
class NodeHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].val <= a[i].val) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].val < a[m].val) m = l;
        if (r < a.length && a[r].val < a[m].val) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function mergeKLists(lists) {
  // Min-heap of nodes: always take the smallest current head.
  const heap = new NodeHeap();
  for (const node of lists) if (node) heap.push(node);   // skip empty lists
  const dummy = new ListNode(0);                          // placeholder in front of the answer
  let tail = dummy;
  while (heap.size > 0) {
    const node = heap.pop();                              // smallest head among all lists
    tail.next = node;                                     // re-use the node, no copying
    tail = node;
    if (node.next) heap.push(node.next);
  }
  return dummy.next;
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) { tail.next = new ListNode(v); tail = tail.next; }
  return dummy.next;
}

function show(head) {
  const out = [];
  for (let n = head; n; n = n.next) out.push(String(n.val));
  return out.length ? out.join(" -> ") : "(empty)";
}

const run = (arrays) => show(mergeKLists(arrays.map(build)));

console.log(run([[1, 4, 5], [1, 3, 4], [2, 6]])); // 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
console.log(run([])); // (empty)
console.log(run([[]])); // (empty)
console.log(run([[], [1], []])); // 1
console.log(run([[5], [1, 2, 3], [4, 4]])); // 1 -> 2 -> 3 -> 4 -> 4 -> 5
console.log(run([[-3, 0], [-3, -2, 10]])); // -3 -> -3 -> -2 -> 0 -> 10`,
          },
          {
            label: "One by one vs divide and conquer vs heap: comparisons and heap size counted",
            code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// A small binary min-heap of list nodes, ordered by node.val
// (JavaScript has no built-in priority queue).
class NodeHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].val <= a[i].val) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].val < a[m].val) m = l;
        if (r < a.length && a[r].val < a[m].val) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

let seed = 5;
function randBelow(m) {
  // MINSTD generator, the same in every language.
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

let comparisons = 0;

function mergeTwo(a, b) {
  // Standard two-list merge; counts value comparisons.
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    comparisons++;
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ? a : b;
  return dummy.next;
}

function oneByOne(lists) {
  let result = null;
  for (const head of lists) result = mergeTwo(result, head);   // the result keeps growing
  return result;
}

function divideAndConquer(lists) {
  lists = lists.slice();
  for (let step = 1; step < lists.length; step *= 2) {         // merge pairs, then pairs of pairs
    for (let i = 0; i + step < lists.length; i += 2 * step) {
      lists[i] = mergeTwo(lists[i], lists[i + step]);
    }
  }
  return lists.length ? lists[0] : null;
}

function withHeap(lists) {
  const heap = new NodeHeap();
  let pops = 0, biggest = 0;
  for (const node of lists) if (node) heap.push(node);
  const dummy = new ListNode(0);
  let tail = dummy;
  while (heap.size > 0) {
    biggest = Math.max(biggest, heap.size);
    const node = heap.pop();
    pops++;
    tail.next = node;
    tail = node;
    if (node.next) heap.push(node.next);
  }
  return [dummy.next, pops, biggest];
}

function makeArrays(k, size) {
  const arrays = [];
  for (let i = 0; i < k; i++) {
    const a = [];
    for (let j = 0; j < size; j++) a.push(randBelow(100000));
    arrays.push(a.sort((x, y) => x - y));
  }
  return arrays;
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) { tail.next = new ListNode(v); tail = tail.next; }
  return dummy.next;
}

function toList(head) {
  const out = [];
  for (let n = head; n; n = n.next) out.push(n.val);
  return out;
}

const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

for (const [k, size] of [[100, 100], [1000, 10]]) {
  const arrays = makeArrays(k, size);
  const expected = arrays.flat().sort((x, y) => x - y);
  console.log("k = " + k + " lists, N = " + k * size + " nodes");
  comparisons = 0;
  const r1 = toList(oneByOne(arrays.map(build)));
  console.log("  one by one:         " + comparisons + " comparisons");
  comparisons = 0;
  const r2 = toList(divideAndConquer(arrays.map(build)));
  console.log("  divide and conquer: " + comparisons + " comparisons");
  const [head, pops, biggest] = withHeap(arrays.map(build));
  const r3 = toList(head);
  console.log("  heap:               " + pops + " pops, heap size never above " + biggest);
  console.log("  all three sorted correctly: " + (same(r1, expected) && same(r2, expected) && same(r3, expected)));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an array of k sorted singly linked lists, \`ListNode[] lists\`, where an entry may be \`null\`. Merge them into one sorted linked list and return its head. Write it in Java, and give the complexity in terms of k and the total number of nodes N."

**What a strong answer should cover:**
- The baseline approaches and their costs: collect-and-sort O(N log N); merging one by one O(N·k).
- The min-heap of the k current heads: poll the smallest, append it, offer its \`next\`; O(N log k) time, O(k) extra space, nodes re-linked rather than copied.
- Divide and conquer (pairwise merging in log k rounds) as the other O(N log k) answer, and when each is preferable.
- Edge cases: empty array, \`null\` entries, duplicates, one list.
- Java specifics: \`ListNode\` is not \`Comparable\`, so \`PriorityQueue<ListNode>\` needs \`Comparator.comparingInt(n -> n.val)\` (without it the first \`offer\` throws \`ClassCastException\`); \`PriorityQueue\` rejects \`null\`; an iterative two-list merge avoids \`StackOverflowError\` on long lists.

**Clarifying questions expected:**
- May I re-use the existing nodes, and can entries be \`null\`?
- How large are k and N?

**Code / implementation expected:** Yes — a \`PriorityQueue<ListNode>\` with a comparator and the merge loop in Java.`,
        answer: `**Target Audience:** Intermediate — you should know Java classes, lambdas and how a singly linked list works; heaps are explained on the linked page.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three teachers have each marked a pile of exam papers, and each pile is already sorted by student number, smallest on top. The school office wants **one** pile, sorted by student number. Nobody wants to throw all the papers on the floor and sort them again from scratch — each pile is already in order, and that is valuable.

The natural method: look at the **top paper of every pile**, take the one with the smallest student number, and put it on the output pile. The pile you took it from now shows a new top paper. Repeat until every pile is empty. At every moment you only compare the k papers on top — never anything underneath.

With 3 piles you can eyeball the smallest top. With 1,000 piles you need help finding the smallest of 1,000 tops, again and again, while one of them changes each time. "Give me the smallest, and let me swap one item" is exactly what a [min-heap](/interview-question/what-is-a-heap-priority-queue) is for. This is the classic "k fronts" heap pattern, and it is how databases and big-data systems merge sorted runs on disk (external merge sort).

📌 **Interview term: K-way merge** — combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are these linked lists, and may I re-use (re-link) the existing nodes? | Re-linking needs O(1) extra space for the output; copying values into new nodes costs O(N). |
| Can some lists be empty, or the whole input be empty? | The code must skip empty lists when filling the heap and return an empty list (null) for no input. |
| Roughly how big are k and N (the total number of nodes)? | O(N log k) vs O(N·k) only matters when k is large; for k = 2 this is just [merging two sorted lists](/interview-question/how-do-you-merge-two-sorted-linked-lists). |
| Are duplicates allowed, and must equal values keep their list order? | Duplicates are fine for correctness; a stable order between lists needs a tie-breaker (the list index). |
| Do the lists fit in memory, or are they streams / files? | The heap approach only needs the k current heads, so it works on streams; divide-and-conquer needs random access to all lists. |

## 3. The Building Blocks

📌 **Interview term: Singly linked list** — a chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head. See [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Dummy (sentinel) head** — a throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\`.

Throughout this page N is the **total** number of nodes across all lists and k is the number of lists.

## 4. Four Approaches, From Worst to Best

**1. Collect and sort.** Walk every list, put every value in an array, sort it, build a new list. O(N log N) time, O(N) extra space. It ignores the fact that the lists are already sorted, and it allocates N new nodes.

**2. Merge one by one.** Merge list 1 with list 2, merge the result with list 3, and so on. Each step is the familiar two-list merge, but the running result keeps growing, so the early nodes are compared again and again. With k lists of equal length the total work is about N·k / 2. Example 2 counts **499,435** comparisons for k = 100, N = 10,000, and **4,546,772** for k = 1,000 — the cost grows with k.

**3. A min-heap of the k current heads.** Put the first node of every non-empty list into a min-heap ordered by value. Then repeat: pop the smallest node, append it to the output, and if it has a \`next\`, push that. The heap never holds more than k nodes, so each pop and push costs O(log k), and every node is pushed and popped exactly once: **O(N log k)** time and **O(k)** extra space.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Three sorted lists 1 4 5, 1 3 4 and 2 6. Their first nodes 1, 1 and 2 sit in a min-heap. The smallest is popped and appended to the output">
  <defs>
    <marker id="b19q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">min-heap</text>
  <text class="d-sub" x="110" y="112" text-anchor="middle">heads 1, 1, 2</text>
  <text class="d-sub" x="110" y="134" text-anchor="middle">at most k nodes</text>
  <rect class="d-box-accent" x="280" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="46" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="46" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="46" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="46" text-anchor="middle">list 0</text>
  <rect class="d-box-accent" x="280" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="116" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="116" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="116" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="116" text-anchor="middle">list 1</text>
  <rect class="d-box-accent" x="280" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="186" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="186" text-anchor="middle">6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">list 2</text>
  <path class="d-edge-dashed" d="M 276 41 L 196 92" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 111 L 196 111" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 181 L 196 130" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-accent" d="M 110 164 L 110 214" marker-end="url(#b19q5-a)"/>
  <rect class="d-box-accent" x="40" y="220" width="140" height="60" rx="10"/>
  <text class="d-text" x="110" y="246" text-anchor="middle">output</text>
  <text class="d-sub" x="110" y="266" text-anchor="middle">pop 1 first</text>
</svg>

The heap starts with the three heads. It never sees the nodes behind them until their predecessor has been taken.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="One step of the loop. Pop the smallest node from the heap, append it to the tail of the output, and push its next node if there is one">
  <defs>
    <marker id="b19q5-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="92" text-anchor="middle">pop smallest node</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">O(log k)</text>
  <path class="d-edge" d="M 204 100 L 250 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box-accent" x="256" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="346" y="92" text-anchor="middle">tail.next = node</text>
  <text class="d-sub" x="346" y="116" text-anchor="middle">re-link, no copy</text>
  <path class="d-edge" d="M 440 100 L 486 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box" x="492" y="60" width="170" height="80" rx="10"/>
  <text class="d-text" x="577" y="92" text-anchor="middle">push node.next</text>
  <text class="d-sub" x="577" y="116" text-anchor="middle">if it exists</text>
</svg>

Every node goes through this loop exactly once, which is where N log k comes from: N iterations, each with one pop and at most one push on a heap of at most k nodes.

📌 **Interview term: O(N log k)** — the cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes.

**4. Divide and conquer.** Merge the lists in pairs (1 with 2, 3 with 4, ...), then merge the results in pairs, and so on — like the merge step of merge sort. There are about log₂ k rounds and each round touches every node once, so it is also **O(N log k)**, with no heap at all and O(1) extra space besides the recursion or loop. Example 2 counts **68,601** comparisons for k = 100 (N log₂ k ≈ 66,439) and **97,921** for k = 1,000 (≈ 99,658). Which of the two O(N log k) methods wins in practice, and why, is the subject of its own page: [merge k sorted lists — heap vs divide-and-conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Divide and conquer** — solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

| Approach | Time | Extra space | Good when |
| :--- | :--- | :--- | :--- |
| Collect and sort | O(N log N) | O(N) | never the best, but a fine baseline to state |
| Merge one by one | O(N · k) | O(1) | k is tiny (2 or 3) |
| Min-heap of heads | O(N log k) | O(k) | lists are streams, or k is large and you want one simple loop |
| Divide and conquer | O(N log k) | O(1) iterative | all lists are in memory; no heap needed |

## 6. The Code in Java

~~~java
static class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

// Min-heap of nodes ordered by value: always take the smallest current head.
static ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt((ListNode n) -> n.val));
    for (ListNode node : lists) if (node != null) heap.offer(node);   // skip empty lists
    ListNode dummy = new ListNode(0);                                  // placeholder in front of the answer
    ListNode tail = dummy;
    while (!heap.isEmpty()) {
        ListNode node = heap.poll();                                   // smallest head among all lists
        tail.next = node;                                              // re-use the node, no copying
        tail = node;
        if (node.next != null) heap.offer(node.next);
    }
    return dummy.next;
}
~~~

**What to point out in this code:**

- **The comparator is required.** \`ListNode\` does not implement \`Comparable\`, so a plain \`new PriorityQueue<ListNode>()\` cannot order it; in our OpenJDK 21 run even the first \`offer\` threw \`java.lang.ClassCastException\`. \`Comparator.comparingInt((ListNode n) -> n.val)\` compares the \`int\` values without boxing and without the overflow risk of \`(a, b) -> a.val - b.val\`.
- The explicit lambda parameter type \`(ListNode n)\` helps the compiler infer the generic type when the comparator is passed straight into the constructor.
- **\`null\` entries must be skipped.** \`PriorityQueue\` does not permit \`null\` elements (\`offer(null)\` throws \`NullPointerException\`), hence \`if (node != null)\`.
- **The dummy head** removes the "is the output still empty?" special case; the answer is \`dummy.next\`.
- **Nodes are re-linked, not copied:** \`tail.next = node\`. The input lists are consumed.
- Equal values are fine: the heap holds node references, and the comparator only looks at \`val\`.

### Divide and conquer, for comparison

~~~java
// Standard two-list merge; counts value comparisons.
static ListNode mergeTwo(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        comparisons++;
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}

static ListNode divideAndConquer(ListNode[] input) {
    ListNode[] lists = input.clone();
    for (int step = 1; step < lists.length; step *= 2)              // merge pairs, then pairs of pairs
        for (int i = 0; i + step < lists.length; i += 2 * step)
            lists[i] = mergeTwo(lists[i], lists[i + step]);
    return lists.length > 0 ? lists[0] : null;
}
~~~

\`mergeTwo\` is a **loop**. A recursive two-list merge uses one stack frame per node: with the default thread stack, our run merged two 1,000-node lists fine and threw \`StackOverflowError\` on two 100,000-node lists. \`input.clone()\` copies the array of heads so the caller's array is not overwritten by intermediate results. The heap-vs-divide-and-conquer trade-off is discussed on [its own page](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Stack overflow** — running out of call-stack space because recursion goes too deep; in Java it is a \`StackOverflowError\`, so long linked lists should be walked with loops.

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds k sorted lists from a small deterministic random generator (MINSTD), so every language merges the same data.

**Example 1 — the heap merge on six inputs:**

~~~text
1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
(empty)
(empty)
1
1 -> 2 -> 3 -> 4 -> 4 -> 5
-3 -> -3 -> -2 -> 0 -> 10
~~~

**Example 2 — one by one vs divide and conquer vs heap, on N = 10,000 nodes:**

~~~text
k = 100 lists, N = 10000 nodes
  one by one:         499435 comparisons
  divide and conquer: 68601 comparisons
  heap:               10000 pops, heap size never above 100
  all three sorted correctly: true
k = 1000 lists, N = 10000 nodes
  one by one:         4546772 comparisons
  divide and conquer: 97921 comparisons
  heap:               10000 pops, heap size never above 1000
  all three sorted correctly: true
~~~

Reading the numbers: merging one by one costs about N·k / 2 comparisons (499,435 for k = 100; 4,546,772 for k = 1,000), while divide and conquer stays close to N·log₂ k (68,601 and 97,921). The heap does exactly N = 10,000 polls whatever k is, and it never holds more than k nodes; each poll costs O(log k) comparisons inside \`PriorityQueue\`. The counter is a \`long\`, because one-by-one merging on bigger inputs quickly passes \`Integer.MAX_VALUE\`.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Collect values + \`Collections.sort\` | O(N log N) | O(N) | ignores the existing order, boxes every value, allocates N new nodes |
| Merge one by one | O(N·k) | O(1) | the growing result is re-scanned k times |
| \`PriorityQueue<ListNode>\` of heads | O(N log k) | O(k) | N polls and at most N offers on a heap of at most k nodes |
| Divide and conquer (iterative) | O(N log k) | O(k) for the cloned array of heads | about log₂ k rounds, each touching every node once |

## 9. Edge Cases

- **No lists at all** (\`[]\`) — return an empty list; example 1 prints \`(empty)\`.
- **Only empty lists** (\`[[]]\`, \`[[], [1], []]\`) — empty lists must be skipped when filling the heap; pushing a missing node crashes or compares nothing.
- **One list** — the heap holds one node at a time and the output is the input.
- **Duplicates across lists** — \`[[1, 4, 5], [1, 3, 4], [2, 6]]\` has two 1s and two 4s; both appear in the output.
- **Negative values** — \`[[-3, 0], [-3, -2, 10]]\` works unchanged; nothing assumes values are positive.
- **Very unequal lengths** — one long list and many short ones; the heap simply holds fewer nodes once the short lists run out.

## Common Pitfalls

- **No comparator** — \`ClassCastException\`, because \`ListNode\` is not \`Comparable\`.
- **\`(a, b) -> a.val - b.val\`** — overflows when values are far apart (for example \`Integer.MIN_VALUE\` and a positive value); use \`Comparator.comparingInt\` or \`Integer.compare\`.
- **Offering \`null\`** — \`NullPointerException\`; skip empty lists.
- **Recursive two-list merge** on long lists — \`StackOverflowError\`; write the loop.
- **Offering every node up front** — heap size N, O(N log N); only the k heads belong in the heap.
- **Forgetting to offer \`node.next\`** — the output stops after the k original heads.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Keep the current head of every list in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;ListNode&gt;</code>; repeatedly poll the smallest, append it to the output, and offer its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cost:</strong> <span style="color:#f0e2c8;">Every node is offered and polled once on a heap of at most k nodes: O(N log k) time and O(k) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparable</code>, so I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator.comparingInt((ListNode n) -&gt; n.val)</code>, and I skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> lists because the queue rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Plumbing:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> pointer build the output, re-linking the existing nodes instead of allocating new ones.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Divide and conquer — merge lists in pairs for log₂ k rounds — is also O(N log k), with no heap; merging one by one is O(N·k).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens without the comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> casts elements to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparable</code> to order them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> is not one: in our run even the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClassCastException</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is merging one by one O(N·k)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The merged result grows with every step, and each merge walks the whole result again. With k equal lists that is about N·k / 2 comparisons — 4,546,772 for k = 1,000 and N = 10,000 in our run, against 97,921 for divide and conquer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap or divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(N log k). The heap only needs the current heads, so it works on streams and is one loop; divide and conquer needs all lists in memory but no heap and no comparator object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists are sorted files too large for memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the merge phase of an external merge sort: keep one buffered reader per file and one current value per reader in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>, write the output as you poll. Memory is O(k) plus buffers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity, exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(k) for the queue. The output re-uses the input nodes, so the only new node is the dummy.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **K-way merge** | Combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements |
| **Singly linked list** | A chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head |
| **Dummy (sentinel) head** | A throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\` |
| **O(N log k)** | The cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes |
| **Divide and conquer** | Solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like merge sort |
| **Stack overflow** | Running out of call-stack space because recursion goes too deep; in Java it is a \`StackOverflowError\`, so long linked lists should be walked with loops |

---
**Conclusion:** Merging k sorted lists is the "smallest of k fronts" heap pattern: keep one node per list in a min-heap, poll the smallest, append it, offer its successor. Every node passes through a heap of at most k nodes, so it costs O(N log k) time and O(k) space, far better than the O(N·k) of merging one by one, and level with divide and conquer. In Java, give \`PriorityQueue\` a \`comparingInt\` comparator because \`ListNode\` is not \`Comparable\`, skip \`null\` lists, and keep list walks iterative so long inputs cannot overflow the stack.`,
        examples: [
          {
            label: "Merge k sorted linked lists with a min-heap of the current heads",
            code: `import java.util.Comparator;
import java.util.PriorityQueue;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Min-heap of nodes ordered by value: always take the smallest current head.
    static ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt((ListNode n) -> n.val));
        for (ListNode node : lists) if (node != null) heap.offer(node);   // skip empty lists
        ListNode dummy = new ListNode(0);                                  // placeholder in front of the answer
        ListNode tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();                                   // smallest head among all lists
            tail.next = node;                                              // re-use the node, no copying
            tail = node;
            if (node.next != null) heap.offer(node.next);
        }
        return dummy.next;
    }

    static ListNode build(int[] values) {
        ListNode dummy = new ListNode(0), tail = dummy;
        for (int v : values) { tail.next = new ListNode(v); tail = tail.next; }
        return dummy.next;
    }

    static String show(ListNode head) {
        StringBuilder sb = new StringBuilder();
        for (ListNode n = head; n != null; n = n.next) sb.append(sb.length() > 0 ? " -> " : "").append(n.val);
        return sb.length() > 0 ? sb.toString() : "(empty)";
    }

    static String run(int[][] arrays) {
        ListNode[] lists = new ListNode[arrays.length];
        for (int i = 0; i < arrays.length; i++) lists[i] = build(arrays[i]);
        return show(mergeKLists(lists));
    }

    public static void main(String[] args) {
        System.out.println(run(new int[][] {{1, 4, 5}, {1, 3, 4}, {2, 6}}));   // 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
        System.out.println(run(new int[][] {}));                              // (empty)
        System.out.println(run(new int[][] {{}}));                            // (empty)
        System.out.println(run(new int[][] {{}, {1}, {}}));                   // 1
        System.out.println(run(new int[][] {{5}, {1, 2, 3}, {4, 4}}));        // 1 -> 2 -> 3 -> 4 -> 4 -> 5
        System.out.println(run(new int[][] {{-3, 0}, {-3, -2, 10}}));         // -3 -> -3 -> -2 -> 0 -> 10
    }
}`,
          },
          {
            label: "One by one vs divide and conquer vs heap: comparisons and heap size counted",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static long seed = 5;

    // MINSTD generator, the same in every language.
    static int randBelow(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    static long comparisons = 0;

    // Standard two-list merge; counts value comparisons.
    static ListNode mergeTwo(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (a != null && b != null) {
            comparisons++;
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }

    static ListNode oneByOne(ListNode[] lists) {
        ListNode result = null;
        for (ListNode head : lists) result = mergeTwo(result, head);     // the result keeps growing
        return result;
    }

    static ListNode divideAndConquer(ListNode[] input) {
        ListNode[] lists = input.clone();
        for (int step = 1; step < lists.length; step *= 2)              // merge pairs, then pairs of pairs
            for (int i = 0; i + step < lists.length; i += 2 * step)
                lists[i] = mergeTwo(lists[i], lists[i + step]);
        return lists.length > 0 ? lists[0] : null;
    }

    static int pops, biggest;

    static ListNode withHeap(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt((ListNode n) -> n.val));
        pops = 0;
        biggest = 0;
        for (ListNode node : lists) if (node != null) heap.offer(node);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!heap.isEmpty()) {
            biggest = Math.max(biggest, heap.size());
            ListNode node = heap.poll();
            pops++;
            tail.next = node;
            tail = node;
            if (node.next != null) heap.offer(node.next);
        }
        return dummy.next;
    }

    static ListNode[] buildAll(int[][] arrays) {
        ListNode[] lists = new ListNode[arrays.length];
        for (int i = 0; i < arrays.length; i++) {
            ListNode dummy = new ListNode(0), tail = dummy;
            for (int v : arrays[i]) { tail.next = new ListNode(v); tail = tail.next; }
            lists[i] = dummy.next;
        }
        return lists;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    public static void main(String[] args) {
        int[][] configs = {{100, 100}, {1000, 10}};
        for (int[] cfg : configs) {
            int k = cfg[0], size = cfg[1];
            int[][] arrays = new int[k][size];
            List<Integer> expected = new ArrayList<>();
            for (int i = 0; i < k; i++) {
                for (int j = 0; j < size; j++) arrays[i][j] = randBelow(100000);
                Arrays.sort(arrays[i]);
                for (int v : arrays[i]) expected.add(v);
            }
            expected.sort(null);
            System.out.println("k = " + k + " lists, N = " + (k * size) + " nodes");
            comparisons = 0;
            List<Integer> r1 = toList(oneByOne(buildAll(arrays)));
            System.out.println("  one by one:         " + comparisons + " comparisons");
            comparisons = 0;
            List<Integer> r2 = toList(divideAndConquer(buildAll(arrays)));
            System.out.println("  divide and conquer: " + comparisons + " comparisons");
            List<Integer> r3 = toList(withHeap(buildAll(arrays)));
            System.out.println("  heap:               " + pops + " pops, heap size never above " + biggest);
            System.out.println("  all three sorted correctly: " + (r1.equals(expected) && r2.equals(expected) && r3.equals(expected)));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a \`std::vector<ListNode*>\` of k sorted singly linked lists, where an entry may be \`nullptr\`. Merge them into one sorted linked list and return its head. Write it in C++, and give the complexity in terms of k and the total number of nodes N."

**What a strong answer should cover:**
- The baseline approaches and their costs: collect-and-sort O(N log N); merging one by one O(N·k).
- The min-heap of the k current heads: pop the smallest, append it, push its \`next\`; O(N log k) time, O(k) extra space, nodes re-linked rather than copied.
- Divide and conquer (pairwise merging in log k rounds) as the other O(N log k) answer, and when each is preferable.
- Edge cases: empty vector, \`nullptr\` entries, duplicates, one list.
- C++ specifics: \`std::priority_queue\` is a max-heap, and a \`priority_queue<ListNode*>\` with no comparator compiles but orders by **pointer address**; a comparator returning \`a->val > b->val\` makes it a min-heap by value; a stack-allocated dummy node; who owns (and frees) the nodes.

**Clarifying questions expected:**
- May I re-use the existing nodes, and who owns their memory?
- Can entries be \`nullptr\`, and how large are k and N?

**Code / implementation expected:** Yes — a \`priority_queue<ListNode*, vector<ListNode*>, Cmp>\` and the merge loop in C++.`,
        answer: `**Target Audience:** Intermediate — you should know C++ pointers, structs and how a singly linked list works; heaps are explained on the linked page.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three teachers have each marked a pile of exam papers, and each pile is already sorted by student number, smallest on top. The school office wants **one** pile, sorted by student number. Nobody wants to throw all the papers on the floor and sort them again from scratch — each pile is already in order, and that is valuable.

The natural method: look at the **top paper of every pile**, take the one with the smallest student number, and put it on the output pile. The pile you took it from now shows a new top paper. Repeat until every pile is empty. At every moment you only compare the k papers on top — never anything underneath.

With 3 piles you can eyeball the smallest top. With 1,000 piles you need help finding the smallest of 1,000 tops, again and again, while one of them changes each time. "Give me the smallest, and let me swap one item" is exactly what a [min-heap](/interview-question/what-is-a-heap-priority-queue) is for. This is the classic "k fronts" heap pattern, and it is how databases and big-data systems merge sorted runs on disk (external merge sort).

📌 **Interview term: K-way merge** — combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are these linked lists, and may I re-use (re-link) the existing nodes? | Re-linking needs O(1) extra space for the output; copying values into new nodes costs O(N). |
| Can some lists be empty, or the whole input be empty? | The code must skip empty lists when filling the heap and return an empty list (null) for no input. |
| Roughly how big are k and N (the total number of nodes)? | O(N log k) vs O(N·k) only matters when k is large; for k = 2 this is just [merging two sorted lists](/interview-question/how-do-you-merge-two-sorted-linked-lists). |
| Are duplicates allowed, and must equal values keep their list order? | Duplicates are fine for correctness; a stable order between lists needs a tie-breaker (the list index). |
| Do the lists fit in memory, or are they streams / files? | The heap approach only needs the k current heads, so it works on streams; divide-and-conquer needs random access to all lists. |

## 3. The Building Blocks

📌 **Interview term: Singly linked list** — a chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head. See [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Dummy (sentinel) head** — a throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\`.

Throughout this page N is the **total** number of nodes across all lists and k is the number of lists.

## 4. Four Approaches, From Worst to Best

**1. Collect and sort.** Walk every list, put every value in an array, sort it, build a new list. O(N log N) time, O(N) extra space. It ignores the fact that the lists are already sorted, and it allocates N new nodes.

**2. Merge one by one.** Merge list 1 with list 2, merge the result with list 3, and so on. Each step is the familiar two-list merge, but the running result keeps growing, so the early nodes are compared again and again. With k lists of equal length the total work is about N·k / 2. Example 2 counts **499,435** comparisons for k = 100, N = 10,000, and **4,546,772** for k = 1,000 — the cost grows with k.

**3. A min-heap of the k current heads.** Put the first node of every non-empty list into a min-heap ordered by value. Then repeat: pop the smallest node, append it to the output, and if it has a \`next\`, push that. The heap never holds more than k nodes, so each pop and push costs O(log k), and every node is pushed and popped exactly once: **O(N log k)** time and **O(k)** extra space.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Three sorted lists 1 4 5, 1 3 4 and 2 6. Their first nodes 1, 1 and 2 sit in a min-heap. The smallest is popped and appended to the output">
  <defs>
    <marker id="b19q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">min-heap</text>
  <text class="d-sub" x="110" y="112" text-anchor="middle">heads 1, 1, 2</text>
  <text class="d-sub" x="110" y="134" text-anchor="middle">at most k nodes</text>
  <rect class="d-box-accent" x="280" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="46" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="46" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="24" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="46" text-anchor="middle">5</text>
  <text class="d-sub" x="530" y="46" text-anchor="middle">list 0</text>
  <rect class="d-box-accent" x="280" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="116" text-anchor="middle">1</text>
  <rect class="d-box" x="350" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="116" text-anchor="middle">3</text>
  <rect class="d-box" x="420" y="94" width="50" height="34" rx="6"/>
  <text class="d-text" x="445" y="116" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="116" text-anchor="middle">list 1</text>
  <rect class="d-box-accent" x="280" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="305" y="186" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="164" width="50" height="34" rx="6"/>
  <text class="d-text" x="375" y="186" text-anchor="middle">6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">list 2</text>
  <path class="d-edge-dashed" d="M 276 41 L 196 92" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 111 L 196 111" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-dashed" d="M 276 181 L 196 130" marker-end="url(#b19q5-a)"/>
  <path class="d-edge-accent" d="M 110 164 L 110 214" marker-end="url(#b19q5-a)"/>
  <rect class="d-box-accent" x="40" y="220" width="140" height="60" rx="10"/>
  <text class="d-text" x="110" y="246" text-anchor="middle">output</text>
  <text class="d-sub" x="110" y="266" text-anchor="middle">pop 1 first</text>
</svg>

The heap starts with the three heads. It never sees the nodes behind them until their predecessor has been taken.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="One step of the loop. Pop the smallest node from the heap, append it to the tail of the output, and push its next node if there is one">
  <defs>
    <marker id="b19q5-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="92" text-anchor="middle">pop smallest node</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">O(log k)</text>
  <path class="d-edge" d="M 204 100 L 250 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box-accent" x="256" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="346" y="92" text-anchor="middle">tail.next = node</text>
  <text class="d-sub" x="346" y="116" text-anchor="middle">re-link, no copy</text>
  <path class="d-edge" d="M 440 100 L 486 100" marker-end="url(#b19q5-b)"/>
  <rect class="d-box" x="492" y="60" width="170" height="80" rx="10"/>
  <text class="d-text" x="577" y="92" text-anchor="middle">push node.next</text>
  <text class="d-sub" x="577" y="116" text-anchor="middle">if it exists</text>
</svg>

Every node goes through this loop exactly once, which is where N log k comes from: N iterations, each with one pop and at most one push on a heap of at most k nodes.

📌 **Interview term: O(N log k)** — the cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes.

**4. Divide and conquer.** Merge the lists in pairs (1 with 2, 3 with 4, ...), then merge the results in pairs, and so on — like the merge step of merge sort. There are about log₂ k rounds and each round touches every node once, so it is also **O(N log k)**, with no heap at all and O(1) extra space besides the recursion or loop. Example 2 counts **68,601** comparisons for k = 100 (N log₂ k ≈ 66,439) and **97,921** for k = 1,000 (≈ 99,658). Which of the two O(N log k) methods wins in practice, and why, is the subject of its own page: [merge k sorted lists — heap vs divide-and-conquer](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

📌 **Interview term: Divide and conquer** — solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

| Approach | Time | Extra space | Good when |
| :--- | :--- | :--- | :--- |
| Collect and sort | O(N log N) | O(N) | never the best, but a fine baseline to state |
| Merge one by one | O(N · k) | O(1) | k is tiny (2 or 3) |
| Min-heap of heads | O(N log k) | O(k) | lists are streams, or k is large and you want one simple loop |
| Divide and conquer | O(N log k) | O(1) iterative | all lists are in memory; no heap needed |

## 6. The Code in C++

~~~cpp
struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// "a comes after b": a greater value has lower priority, which makes the queue a min-heap.
struct ByValue {
    bool operator()(const ListNode* a, const ListNode* b) const { return a->val > b->val; }
};

ListNode* mergeKLists(const std::vector<ListNode*>& lists) {
    std::priority_queue<ListNode*, std::vector<ListNode*>, ByValue> heap;
    for (ListNode* node : lists) if (node) heap.push(node);   // skip empty lists
    ListNode dummy(0);                                         // placeholder in front of the answer
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        ListNode* node = heap.top();                           // smallest head among all lists
        heap.pop();
        tail->next = node;                                     // re-use the node, no copying
        tail = node;
        if (node->next) heap.push(node->next);
    }
    return dummy.next;
}
~~~

**What to point out in this code:**

- **The comparator is not optional, and leaving it out does not fail to compile.** \`std::priority_queue<ListNode*>\` happily compares the *pointers* with \`<\`, so it orders nodes by memory address. In our run, five nodes holding 1 to 5 popped as \`5 4 3 2 1\` from such a queue — sorted by address, which just happened to follow the allocation order. Always pass a comparator that looks at \`->val\`.
- \`ByValue\` returns \`a->val > b->val\`. In \`std::priority_queue\`, \`comp(a, b) == true\` means "a has lower priority than b", so the greatest value has the lowest priority and the **smallest** value is on top: a min-heap by value.
- \`ListNode dummy(0);\` lives on the stack; \`tail\` starts at \`&dummy\`, and the function returns \`dummy.next\`. No heap allocation, nothing to free.
- \`heap.top()\` then \`heap.pop()\`: \`pop()\` returns \`void\`.
- \`if (node)\` skips \`nullptr\` lists. Pushing a null pointer would make the comparator dereference it — undefined behaviour.

### Who owns the nodes?

The merge only re-links pointers; it never allocates or frees a node. In the examples every node lives in a \`std::deque<ListNode> pool\`, which owns them and frees them all at the end of the program. (A \`std::deque\` keeps element addresses stable when you \`push_back\`; a \`std::vector\` would move its elements when it grows and leave every \`next\` pointer dangling.) In interview code that uses \`new ListNode(v)\`, say who calls \`delete\` — usually "the caller owns the lists before and after, the merge just re-links them".

📌 **Interview term: Dangling pointer** — a pointer to memory that has been freed or moved, such as a pointer into a \`std::vector\` after it reallocated; dereferencing it is undefined behaviour.

### Divide and conquer, for comparison

~~~cpp
// Standard two-list merge; counts value comparisons.
ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (a && b) {
        comparisons++;
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}

ListNode* divideAndConquer(std::vector<ListNode*> lists) {
    for (size_t step = 1; step < lists.size(); step *= 2)          // merge pairs, then pairs of pairs
        for (size_t i = 0; i + step < lists.size(); i += 2 * step)
            lists[i] = mergeTwo(lists[i], lists[i + step]);
    return lists.empty() ? nullptr : lists[0];
}
~~~

\`mergeTwo\` is a loop with a stack dummy. A recursive two-list merge uses one stack frame per node, so very long lists risk a stack overflow (we measured this in Java and JavaScript but did not measure the C++ limit, which depends on the platform stack size). \`divideAndConquer\` takes the vector of heads **by value**, so the caller's vector is not overwritten by intermediate results. The heap-vs-divide-and-conquer trade-off is discussed on [its own page](/interview-question/merge-k-sorted-lists-heap-vs-divide-and-conquer-which-is-better-for-n-10k).

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds k sorted lists from a small deterministic random generator (MINSTD), so every language merges the same data.

**Example 1 — the heap merge on six inputs:**

~~~text
1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
(empty)
(empty)
1
1 -> 2 -> 3 -> 4 -> 4 -> 5
-3 -> -3 -> -2 -> 0 -> 10
~~~

**Example 2 — one by one vs divide and conquer vs heap, on N = 10,000 nodes:**

~~~text
k = 100 lists, N = 10000 nodes
  one by one:         499435 comparisons
  divide and conquer: 68601 comparisons
  heap:               10000 pops, heap size never above 100
  all three sorted correctly: true
k = 1000 lists, N = 10000 nodes
  one by one:         4546772 comparisons
  divide and conquer: 97921 comparisons
  heap:               10000 pops, heap size never above 1000
  all three sorted correctly: true
~~~

Reading the numbers: merging one by one costs about N·k / 2 comparisons (499,435 for k = 100; 4,546,772 for k = 1,000), while divide and conquer stays close to N·log₂ k (68,601 and 97,921). The heap does exactly N = 10,000 pops whatever k is, and it never holds more than k nodes; each pop costs O(log k) comparisons inside \`std::priority_queue\`.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Collect values + \`std::sort\` | O(N log N) | O(N) | ignores the existing order and allocates N new nodes |
| Merge one by one | O(N·k) | O(1) | the growing result is re-scanned k times |
| \`priority_queue\` of heads | O(N log k) | O(k) | N pops and at most N pushes on a heap of at most k pointers |
| Divide and conquer (iterative) | O(N log k) | O(k) for the copied vector of heads | about log₂ k rounds, each touching every node once |

## 9. Edge Cases

- **No lists at all** (\`[]\`) — return an empty list; example 1 prints \`(empty)\`.
- **Only empty lists** (\`[[]]\`, \`[[], [1], []]\`) — empty lists must be skipped when filling the heap; pushing a missing node crashes or compares nothing.
- **One list** — the heap holds one node at a time and the output is the input.
- **Duplicates across lists** — \`[[1, 4, 5], [1, 3, 4], [2, 6]]\` has two 1s and two 4s; both appear in the output.
- **Negative values** — \`[[-3, 0], [-3, -2, 10]]\` works unchanged; nothing assumes values are positive.
- **Very unequal lengths** — one long list and many short ones; the heap simply holds fewer nodes once the short lists run out.

## Common Pitfalls

- **\`std::priority_queue<ListNode*>\` without a comparator** — compiles, orders by address, returns garbage order.
- **A comparator with \`<\` on values** — that makes a max-heap by value, so the merge produces descending chunks. For a min-heap the comparator must say \`a->val > b->val\`.
- **Pushing \`nullptr\`** — the comparator dereferences it: undefined behaviour.
- **Storing nodes in a \`std::vector<ListNode>\` that grows** — reallocation moves the nodes and every \`next\` pointer dangles; use \`std::deque\`, reserve up front, or allocate nodes individually.
- **Allocating a new output node per value** — O(N) memory and N allocations, when re-linking is free.
- **Recursive two-list merge on long lists** — stack overflow risk; write the loop.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Keep the current head of every list in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code>; repeatedly take the smallest, append it to the output, and push its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cost:</strong> <span style="color:#f0e2c8;">Every node is pushed and popped once on a heap of at most k pointers: O(N log k) time and O(k) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. C++ detail:</strong> <span style="color:#f0e2c8;">The queue needs a comparator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a-&gt;val &gt; b-&gt;val</code> — without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;ListNode*&gt;</code> compiles and silently orders by pointer address.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Plumbing:</strong> <span style="color:#f0e2c8;">A stack-allocated dummy node and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> pointer build the output by re-linking; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> lists are skipped; the merge allocates and frees nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Divide and conquer — merge lists in pairs for log₂ k rounds — is also O(N log k), with no heap at all; merging one by one is O(N·k).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;</code> in the comparator when we want the smallest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> puts the element with the highest priority on top, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">comp(a, b) == true</code> means "a ranks below b". With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a-&gt;val &gt; b-&gt;val</code> larger values rank lower, so the smallest value is at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you forget the comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It still compiles: pointers have a built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, so the queue orders by address. In our test five nodes 1 to 5 came out as 5 4 3 2 1 — the order of their addresses, not their values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Heap or divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(N log k). The heap only needs the current heads, so it works on streams and is one loop; divide and conquer needs all lists in memory but no heap. Our counts: 97,921 comparisons for divide and conquer at k = 1,000 against 4,546,772 for one by one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who frees the nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nobody inside the merge — it only re-links. Whoever allocated the input lists owns the merged list afterwards; in production code that is often expressed with an arena or pool, as in the examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists are sorted files too large for memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the merge phase of an external merge sort: keep one buffered reader per file and one current value per reader in the heap, and write the output as you pop. Memory is O(k) plus buffers.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **K-way merge** | Combining k sorted sequences into one sorted sequence by repeatedly taking the smallest of the k current front elements |
| **Singly linked list** | A chain of nodes where each node holds a value and a pointer to the next node; the list is reached through its first node, the head |
| **Dummy (sentinel) head** | A throw-away node placed in front of the result list so that appending the first real node is no different from appending any other; the answer is \`dummy.next\` |
| **O(N log k)** | The cost of N operations on a structure of size k; here every one of the N nodes passes once through a heap that never holds more than k nodes |
| **Divide and conquer** | Solving a problem by splitting it into halves, solving each half, and combining the results; here, pairwise merging of lists in log₂ k rounds, exactly like merge sort |
| **Dangling pointer** | A pointer to memory that has been freed or moved, such as a pointer into a \`std::vector\` after it reallocated; dereferencing it is undefined behaviour |

---
**Conclusion:** Merging k sorted lists is the "smallest of k fronts" heap pattern: keep one node per list in a min-heap, pop the smallest, append it, push its successor. Every node passes through a heap of at most k pointers, so it costs O(N log k) time and O(k) space, far better than the O(N·k) of merging one by one, and level with divide and conquer. In C++ the decisive detail is the comparator: \`a->val > b->val\` makes \`std::priority_queue\` a min-heap by value, while no comparator at all silently orders nodes by address.`,
        examples: [
          {
            label: "Merge k sorted linked lists with a min-heap of the current heads",
            code: `#include <deque>
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// "a comes after b": a greater value has lower priority, which makes the queue a min-heap.
struct ByValue {
    bool operator()(const ListNode* a, const ListNode* b) const { return a->val > b->val; }
};

ListNode* mergeKLists(const std::vector<ListNode*>& lists) {
    std::priority_queue<ListNode*, std::vector<ListNode*>, ByValue> heap;
    for (ListNode* node : lists) if (node) heap.push(node);   // skip empty lists
    ListNode dummy(0);                                         // placeholder in front of the answer
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        ListNode* node = heap.top();                           // smallest head among all lists
        heap.pop();
        tail->next = node;                                     // re-use the node, no copying
        tail = node;
        if (node->next) heap.push(node->next);
    }
    return dummy.next;
}

std::deque<ListNode> pool;   // owns every node; a deque never moves its elements on push_back

ListNode* build(const std::vector<int>& values) {
    ListNode* head = nullptr;
    ListNode** link = &head;
    for (int v : values) {
        pool.emplace_back(v);
        *link = &pool.back();
        link = &(*link)->next;
    }
    return head;
}

std::string show(const ListNode* head) {
    std::string s;
    for (const ListNode* n = head; n; n = n->next) s += (s.empty() ? "" : " -> ") + std::to_string(n->val);
    return s.empty() ? "(empty)" : s;
}

std::string run(const std::vector<std::vector<int>>& arrays) {
    std::vector<ListNode*> lists;
    for (const auto& a : arrays) lists.push_back(build(a));
    return show(mergeKLists(lists));
}

int main() {
    std::cout << run({{1, 4, 5}, {1, 3, 4}, {2, 6}}) << "\\n";   // 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
    std::cout << run({}) << "\\n";                              // (empty)
    std::cout << run({{}}) << "\\n";                            // (empty)
    std::cout << run({{}, {1}, {}}) << "\\n";                   // 1
    std::cout << run({{5}, {1, 2, 3}, {4, 4}}) << "\\n";        // 1 -> 2 -> 3 -> 4 -> 4 -> 5
    std::cout << run({{-3, 0}, {-3, -2, 10}}) << "\\n";         // -3 -> -3 -> -2 -> 0 -> 10
    return 0;
}`,
          },
          {
            label: "One by one vs divide and conquer vs heap: comparisons and heap size counted",
            code: `#include <algorithm>
#include <deque>
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

long long seed = 5;

// MINSTD generator, the same in every language.
int randBelow(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

long long comparisons = 0;

// Standard two-list merge; counts value comparisons.
ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (a && b) {
        comparisons++;
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}

ListNode* oneByOne(const std::vector<ListNode*>& lists) {
    ListNode* result = nullptr;
    for (ListNode* head : lists) result = mergeTwo(result, head);   // the result keeps growing
    return result;
}

ListNode* divideAndConquer(std::vector<ListNode*> lists) {
    for (size_t step = 1; step < lists.size(); step *= 2)          // merge pairs, then pairs of pairs
        for (size_t i = 0; i + step < lists.size(); i += 2 * step)
            lists[i] = mergeTwo(lists[i], lists[i + step]);
    return lists.empty() ? nullptr : lists[0];
}

struct ByValue {
    bool operator()(const ListNode* a, const ListNode* b) const { return a->val > b->val; }
};

int pops = 0;
size_t biggest = 0;

ListNode* withHeap(const std::vector<ListNode*>& lists) {
    std::priority_queue<ListNode*, std::vector<ListNode*>, ByValue> heap;
    pops = 0;
    biggest = 0;
    for (ListNode* node : lists) if (node) heap.push(node);
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        biggest = std::max(biggest, heap.size());
        ListNode* node = heap.top();
        heap.pop();
        pops++;
        tail->next = node;
        tail = node;
        if (node->next) heap.push(node->next);
    }
    return dummy.next;
}

std::deque<ListNode> pool;   // owns every node; a deque never moves its elements on push_back

std::vector<ListNode*> buildAll(const std::vector<std::vector<int>>& arrays) {
    std::vector<ListNode*> lists;
    for (const auto& a : arrays) {
        ListNode* head = nullptr;
        ListNode** link = &head;
        for (int v : a) { pool.emplace_back(v); *link = &pool.back(); link = &(*link)->next; }
        lists.push_back(head);
    }
    return lists;
}

std::vector<int> toVector(const ListNode* head) {
    std::vector<int> out;
    for (const ListNode* n = head; n; n = n->next) out.push_back(n->val);
    return out;
}

int main() {
    std::vector<std::pair<int, int>> configs = {{100, 100}, {1000, 10}};
    for (auto [k, size] : configs) {
        std::vector<std::vector<int>> arrays(k);
        std::vector<int> expected;
        for (auto& a : arrays) {
            for (int j = 0; j < size; j++) a.push_back(randBelow(100000));
            std::sort(a.begin(), a.end());
            expected.insert(expected.end(), a.begin(), a.end());
        }
        std::sort(expected.begin(), expected.end());
        std::cout << "k = " << k << " lists, N = " << k * size << " nodes\\n";
        comparisons = 0;
        auto r1 = toVector(oneByOne(buildAll(arrays)));
        std::cout << "  one by one:         " << comparisons << " comparisons\\n";
        comparisons = 0;
        auto r2 = toVector(divideAndConquer(buildAll(arrays)));
        std::cout << "  divide and conquer: " << comparisons << " comparisons\\n";
        auto r3 = toVector(withHeap(buildAll(arrays)));
        std::cout << "  heap:               " << pops << " pops, heap size never above " << biggest << "\\n";
        std::cout << "  all three sorted correctly: " << std::boolalpha << (r1 == expected && r2 == expected && r3 == expected) << "\\n";
    }
    return 0;
}`,
          },
        ],
      },
    },
  },
];

export default augments;
