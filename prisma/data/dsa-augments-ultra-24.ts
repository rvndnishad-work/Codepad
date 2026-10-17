/**
 * DSA ULTRA — batch 24: Graphs II — union-find, minimum spanning trees,
 * strongly connected components and longest increasing path. One complete
 * answer per language (Python, JavaScript, Java, C++). Every example was run
 * with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `What is the Union-Find (Disjoint Set) data structure?`,
    difficulty: "medium",
    seoDescription: `Union-Find (disjoint set) in Python, JavaScript, Java and C++: find, union, path compression, union by size, and why it runs in near O(1).`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Can you explain what a Union-Find, or disjoint set, data structure is, implement it in Python, and tell me how fast its operations are and why?"

**What a strong answer should cover:**
- What it stores: a partition of elements into non-overlapping sets, each set represented by one root; the whole thing is a forest kept in a \`parent\` array.
- The two operations: \`find(x)\` walks parent pointers to the root; \`union(a, b)\` links one root under the other and reports whether a merge happened.
- The two optimisations and what each fixes: path compression flattens paths during \`find\`; union by size or rank keeps trees shallow (height at most log2 n). Together: amortised O(α(n)) per operation, effectively constant.
- Where it is used: connected components, cycle detection in an undirected graph, Kruskal's minimum spanning tree, grouping problems; and what it cannot do (split a set, or answer questions on directed graphs).
- Python specifics: store \`parent\` and \`size\` as plain lists for integer elements (or a dict with \`setdefault\` for arbitrary hashable keys), and write \`find\` iteratively, because a recursive \`find\` on a long chain hits the default recursion limit of 1000 and raises \`RecursionError\`.

**Code / implementation expected:** Yes — a \`DSU\` class in Python with \`find\`, \`union\` returning a bool, and a set count.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array is; everything else is explained
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a school on the first day of term. Every student starts alone. During the day, pairs of students become friends, and friendship spreads: if Ana is friends with Ben and Ben is friends with Chloe, all three are now one friend group. At any moment a teacher may ask: "are Ana and Dev in the same group?"

You could keep a list of every group and, on every new friendship, copy one whole list into the other. That works, but merging big groups means moving a lot of names around.

Here is a lazier and much faster scheme. Every group picks a **captain**. Every student remembers just one name: the person they report to. The captain reports to themselves. To find your group, keep asking "who do you report to?" until you reach someone who reports to themselves; that is your captain. Two students are in the same group exactly when they reach the same captain. And when two groups become friends, nobody moves: one captain simply starts reporting to the other captain. One name changes.

That is the whole Union-Find data structure. The rest of this page is about two small habits that stop the chains of "who do you report to?" from getting long, and why those two habits make every question almost free.

## 2. The Core Idea

📌 **Interview term: Disjoint sets (a partition)** — a collection of sets where no element belongs to two sets at once. Every element is in exactly one group.

📌 **Interview term: Union-Find / Disjoint Set Union (DSU)** — a data structure that maintains a partition under two operations: **find** (which set is this element in?) and **union** (merge the sets of two elements).

The structure is a **forest**: a group is a tree, and every element points to its parent in that tree. All of it lives in one array:

📌 **Interview term: Parent array** — \`parent[x]\` is the element that \`x\` points to. A root points to itself: \`parent[r] == r\`. Initially every element is its own root, so there are n sets of size 1.

📌 **Interview term: Representative (root)** — the root of a tree, used as the name of the whole set. \`find(x)\` returns it, so \`find(a) == find(b)\` means "a and b are in the same set".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Forest for the sets 0 1 2 3, then 4 alone, 5 and 6, and 7 alone. Root 0 has children 1 and 2, and 2 has child 3. Root 5 has child 6.">
  <defs>
    <marker id="uf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="110" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="138" y="56" text-anchor="middle">0</text>
  <rect class="d-box" x="40" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="68" y="146" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="146" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="190" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="216" text-anchor="middle">3</text>
  <path class="d-edge" d="M 72 118 L 126 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 204 118 L 152 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 208 188 L 208 166" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="320" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="348" y="56" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="440" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="440" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="146" text-anchor="middle">6</text>
  <path class="d-edge" d="M 468 118 L 468 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="560" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="588" y="56" text-anchor="middle">7</text>
</svg>

The highlighted boxes are roots. Every arrow is one \`parent\` entry pointing up: the array for this picture is \`parent = [0, 0, 0, 2, 4, 5, 5, 7]\`, read as "1 reports to 0, 2 reports to 0, 3 reports to 2", and so on. There are four sets: {0, 1, 2, 3}, {4}, {5, 6} and {7}.

### The two operations

- **find(x):** follow \`parent\` from \`x\` until you reach an element that is its own parent. Return it.
- **union(a, b):** \`ra = find(a)\`, \`rb = find(b)\`. If they are equal, \`a\` and \`b\` are already together: return false. Otherwise make one root the parent of the other (\`parent[rb] = ra\`), decrement the set count, and return true.

That boolean return value is worth keeping: "union returned false" is exactly the signal for "this edge closes a cycle", which several classic problems need.

## 3. Why the Naive Version Is Slow, and the Two Fixes

If \`union\` always hangs the first root under the second, a bad sequence of unions builds a **chain**: 0 points to 1, 1 points to 2, and so on. Then \`find(0)\` walks the whole chain, n - 1 steps, and doing that repeatedly costs O(n) per operation, O(n²) in total. Example 2 below measures exactly this: for n = 1000 the naive version follows 498 501 parent pointers just during the unions.

### Fix 1: union by size (or by rank)

📌 **Interview term: Union by size** — when merging, hang the root of the **smaller** tree under the root of the larger one, and add the sizes. An element only gets one level deeper when its set at least doubles in size, so no tree is taller than log2 n.

📌 **Interview term: Union by rank** — the same idea using an upper bound on tree height ("rank") instead of the element count. Both give the same guarantees; size is handy because it also answers "how big is this group?".

### Fix 2: path compression

📌 **Interview term: Path compression** — after \`find(x)\` has located the root, point every node it walked through **directly at the root**. The next \`find\` on any of them takes one step.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Before path compression the chain is 3 to 2 to 1 to root 0. After find of 3 every node on the path points straight at root 0.">
  <defs>
    <marker id="uf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="24" text-anchor="middle">before find(3)</text>
  <rect class="d-box-accent" x="92" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="92" y="112" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="137" text-anchor="middle">1</text>
  <rect class="d-box" x="92" y="184" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">2</text>
  <rect class="d-box" x="92" y="256" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="281" text-anchor="middle">3</text>
  <path class="d-edge" d="M 120 110 L 120 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 182 L 120 156" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 254 L 120 228" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-dashed" d="M 250 160 L 330 160" fill="none" marker-end="url(#uf2-arrow)"/>
  <text class="d-sub" x="500" y="24" text-anchor="middle">after find(3)</text>
  <rect class="d-box-accent" x="472" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="380" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="408" y="195" text-anchor="middle">1</text>
  <rect class="d-box" x="472" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="195" text-anchor="middle">2</text>
  <rect class="d-box" x="564" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="592" y="195" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 414 168 L 488 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 500 168 L 500 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 586 168 L 512 84" fill="none" marker-end="url(#uf2-arrow)"/>
</svg>

On the left, \`find(3)\` takes three steps. While returning, it rewires 3 and 2 to point at 0 (1 already did), so the tree on the right is flat and every later \`find\` on these elements is one step.

📌 **Interview term: Path halving** — a one-pass variant: while walking up, set \`parent[x] = parent[parent[x]]\` (skip to the grandparent). It gives the same asymptotic bound and is a popular one-liner; the [Kruskal vs Prim page](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) uses it.

### How fast is it with both fixes?

📌 **Interview term: Amortised cost** — the average cost per operation over a whole sequence of operations, even if one particular operation is occasionally slower.

📌 **Interview term: Inverse Ackermann function α(n)** — a function that grows so slowly that it is at most 4 for any input size you could ever store. With both optimisations, m operations on n elements take O(m α(n)) time: effectively constant per operation.

That bound is a real theorem, not folklore: it was proved by Robert Tarjan in "Efficiency of a Good But Not Linear Set Union Algorithm", *Journal of the ACM* 22(2), 1975, which also showed it cannot be improved for this algorithm. In an interview, "amortised O(α(n)), which is effectively O(1)" is the expected phrase. With only one of the two fixes the bound is O(log n) per operation.

## 4. The Solution in Python

~~~python
class DSU:
    """Union-Find with path compression and union by size."""

    def __init__(self, n):
        self.parent = list(range(n))   # every element starts as its own root
        self.size = [1] * n            # size[r] is only meaningful when r is a root
        self.count = n                 # number of disjoint sets

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:  # path compression: point the whole path at the root
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False               # already in the same set
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra            # hang the smaller tree under the bigger one
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)
~~~

**Why each line is there:**

- \`self.parent = list(range(n))\` makes every element its own root: \`[0, 1, 2, ...]\`. \`self.size = [1] * n\` is safe here because the list holds immutable ints (the \`[[]] * n\` aliasing trap only bites with mutable items).
- \`find\` runs **two loops**: the first walks up to the root, the second walks the same path again and points every node at the root. It is iterative on purpose: a recursive \`find\` on a 5000-long chain raised \`RecursionError: maximum recursion depth exceeded\` in a test run, because \`sys.getrecursionlimit()\` is 1000 by default.
- The three-line body of the compression loop saves \`nxt\` before overwriting \`self.parent[x]\`. Writing \`self.parent[x], x = root, self.parent[x]\` also works (the right side is evaluated first), but the explicit version is easier to defend at a whiteboard.
- \`union\` swaps with \`ra, rb = rb, ra\` so that \`ra\` is always the bigger root, then does the link and the size update in two lines.
- Returning \`False\` when the roots match is what lets callers detect cycles and redundant edges.

**Elements that are not integers.** Use dictionaries and create entries on first sight:

~~~python
parent, size = {}, {}

def find(x):
    if x not in parent:
        parent[x], size[x] = x, 1
    root = x
    while parent[root] != root:
        root = parent[root]
    while parent[x] != root:
        parent[x], x = root, parent[x]
    return root
~~~

Any hashable value works as a key: strings, tuples like \`(row, col)\`, frozensets.

## 5. Verified: Running the Code

Each example on this page was saved as \`main.py\` and run with \`python3 main.py\`. The same three programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Union-Find with path compression and union by size** prints:

~~~text
start: 8 elements, 8 sets
union(0, 1): merged, sets = 7
union(2, 3): merged, sets = 6
union(1, 3): merged, sets = 5
union(0, 2): already together, sets = 5
union(5, 6): merged, sets = 4
union(6, 5): already together, sets = 4
connected(0, 3) = true
connected(0, 5) = false
size of the set holding 3 = 4
groups: [[0, 1, 2, 3], [4], [5, 6], [7]]
parent array after the finds: [0, 0, 0, 0, 4, 5, 5, 7]
~~~

Reading it: \`union(0, 2)\` returns false because 0 and 2 were already joined through \`1-3\`; the set count only drops on a real merge. The last line is the parent array after \`groups\` called \`find\` on every element: every node of the big set points straight at root 0, which is path compression at work.

**Example 2 — counting parent hops for four variants** prints:

~~~text
star workload, n = 1000:
  naive              union hops   498501 | tallest tree  999 | hops for n finds   499500
  compression only   union hops     1995 | tallest tree  998 | hops for n finds     1997
  size only          union hops        0 | tallest tree    1 | hops for n finds      999
  size + compression union hops        0 | tallest tree    1 | hops for n finds      999
star workload, n = 3000:
  naive              union hops  4495501 | tallest tree 2999 | hops for n finds  4498500
  compression only   union hops     5995 | tallest tree 2998 | hops for n finds     5997
  size only          union hops        0 | tallest tree    1 | hops for n finds     2999
  size + compression union hops        0 | tallest tree    1 | hops for n finds     2999
rounds workload, n = 1024:
  naive              union hops     2026 | tallest tree   10 | hops for n finds     5120
  compression only   union hops     1532 | tallest tree    9 | hops for n finds     2028
  size only          union hops        0 | tallest tree   10 | hops for n finds     5120
  size + compression union hops        0 | tallest tree   10 | hops for n finds     2036
rounds workload, n = 4096:
  naive              union hops     8166 | tallest tree   12 | hops for n finds    24576
  compression only   union hops     6140 | tallest tree   11 | hops for n finds     8168
  size only          union hops        0 | tallest tree   12 | hops for n finds    24576
  size + compression union hops        0 | tallest tree   12 | hops for n finds     8178
~~~

Reading it: on the star workload the naive version is quadratic (498 501 hops for n = 1000, 4 495 501 for n = 3000, about nine times more for three times the input). Union by size keeps the star flat: tallest tree 1. On the rounds workload union by size still lets trees grow, but only to log2 n (10 for 1024, 12 for 4096), and adding compression cuts the cost of the final finds from 24 576 hops to 8 178.

**Example 3 — three classic problems** prints:

~~~text
2
5
1
[2, 3]
[1, 4]
20
-1
~~~

Each line matches the comment next to it in the code. The redundant edge \`[1, 4]\` is the first edge whose two ends already had the same root. The connection log becomes fully connected at time 20, not 40, once the events are sorted by time.

## 6. Complexity

| Variant | find / union | Space | Why |
| :--- | :--- | :--- | :--- |
| Naive linking, no compression | O(n) worst case | O(n) | a bad union order builds a chain of height n - 1 (Example 2: tallest tree 999 for n = 1000) |
| Union by size only | O(log n) | O(n) | a node gets deeper only when its set doubles, so height is at most log2 n (Example 2: 10 for n = 1024) |
| Path compression only | O(log n) amortised | O(n) | each long walk flattens the path it used |
| Size + compression | O(α(n)) amortised, effectively O(1) | O(n) | Tarjan, JACM 1975 |
| Building it | O(n) | O(n) | one parent entry and one size entry per element |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table. Example 2 shows the gap concretely: on the "star" workload with n = 3000 the naive version follows 4 495 501 parent pointers during the unions alone; with union by size it follows none.

## 7. Where Union-Find Is the Right Tool (and Where It Is Not)

Union-Find shines when the edges arrive **one at a time** and you keep asking "are these two connected yet?":

- **Counting connected components** in an undirected graph: start with n sets, union every edge, read the count. Compare it with DFS and BFS on [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and on [number of islands: DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Cycle detection in an undirected graph**: an edge whose two ends already share a root closes a cycle. That is the "redundant connection" problem in Example 3.
- **Kruskal's minimum spanning tree**: take edges cheapest first, keep an edge only when \`union\` returns true. See [Kruskal vs Prim](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms).
- **Dynamic connectivity over time**: "at what moment did everyone become connected?" Sort the events by time and stop when the count reaches 1 (also in Example 3).
- **Grouping by equivalence**: accounts that share an email, synonyms, pixels of the same colour region.

What it **cannot** do:

- **Split** a set or delete an edge. Unions are one-way. (Offline tricks exist, such as processing deletions in reverse as additions, but plain DSU has no "un-union".)
- **Directed graphs.** Union-Find ignores direction, so it cannot detect a directed cycle or find strongly connected components. For those, use DFS: see [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) and [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Paths.** It answers "connected or not", not "how" or "how far". For a route, use [BFS or DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

## 8. Edge Cases

- **union(x, x):** \`find\` returns the same root twice, so it returns false and the count does not change.
- **Repeating a union** (\`union(5, 6)\` then \`union(6, 5)\`): the second call returns false. Example 1 shows it.
- **n = 0 or no unions at all:** the count is n; every element is its own set.
- **Elements that are not 0..n-1** (strings, coordinates, huge ids): map them to indices first, or use a hash map for \`parent\` and create entries lazily.
- **Grid cells:** use the index \`r * cols + c\`, as in [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).
- **The size array is only valid at roots:** \`size[find(x)]\` is the size of x's set; \`size[x]\` for a non-root is stale.

## Common Pitfalls

- **Recursive \`find\` on deep trees.** Without union by size a chain can be thousands long and a recursive \`find\` raises \`RecursionError\` (default limit 1000). Write it iteratively, as above, or always use union by size so depth stays at most log2 n.
- **Comparing \`x\` instead of \`find(x)\`.** \`parent[a] == parent[b]\` is not "same set"; two elements of one set can have different parents. Always compare roots.
- **Updating \`size\` on the wrong root.** After the swap, the root that stays a root (\`ra\`) gets \`size[ra] += size[rb]\`. Reading \`size[x]\` for a non-root returns a stale number.
- **Forgetting to decrement \`count\`** on a successful union, or decrementing it when the roots were already equal.
- **\`[[0] * n] * m\` for a grid DSU.** That creates m references to the same row. Use a flat list indexed by \`r * cols + c\`.
- **Treating Union-Find as a directed structure.** It cannot find a cycle like a -> b -> c -> a in a directed graph; it would also report a "cycle" for a -> b, a -> c, b -> c, which has none.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A forest in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> list: each set is a tree, its root names the set. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> climbs to the root; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code> links one root under another and returns whether it merged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fix 1:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Union by size</strong>: hang the smaller tree under the bigger root, so no tree is taller than log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fix 2:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Path compression</strong>: after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, point every visited node at the root, so the next lookup is one step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">With both, amortised O(α(n)) per operation (Tarjan 1975), effectively O(1); O(n) space for two lists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> iteratively because a recursive one hits the 1000-frame recursion limit on a long chain, and I use a dict with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setdefault</code> when elements are strings or tuples.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count the groups?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count = n</code> and decrement it on every union that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>; it is O(1) to read at any time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a cycle in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each edge, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> before the union, that edge closes a cycle. It does not work for directed graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete an edge or split a set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a plain DSU: unions are permanent. If deletions are known in advance, process the timeline backwards so they become unions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use BFS for connectivity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS answers one query on a fixed graph in O(V + E). When edges keep arriving and you ask after each one, DSU answers each in near O(1) instead of re-running BFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rank or size?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same bounds. I prefer size because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size[find(x)]</code> also answers how big a group is.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Disjoint sets** | groups with no shared elements; each element is in exactly one |
| **Union-Find / DSU** | structure supporting find (which set?) and union (merge two sets) |
| **Parent array** | \`parent[x]\` is the element x points to; a root points to itself |
| **Representative (root)** | the element that names a set; \`find\` returns it |
| **Union by size** | hang the smaller tree under the larger root; height stays at most log2 n |
| **Union by rank** | the same idea using a height bound instead of a count |
| **Path compression** | after a find, point every visited node straight at the root |
| **Path halving** | while walking up, skip each node to its grandparent |
| **Amortised cost** | average cost per operation over a whole sequence |
| **Inverse Ackermann α(n)** | an incredibly slow-growing function, at most 4 in practice |
| **\`sys.getrecursionlimit()\`** | the maximum Python call depth, 1000 by default; why \`find\` is iterative |

---
**Conclusion:** Union-Find keeps a partition as a forest in one parent array: \`find\` climbs to the root that names a set, and union links two roots. On its own that can degrade into long chains, but union by size keeps trees at most log2 n tall and path compression flattens every path it walks, and together they make each operation amortised O(α(n)), effectively constant. That is why it is the standard tool for connectivity that grows edge by edge: components, undirected cycle detection, Kruskal's algorithm and grouping problems. In Python the practical marks are an iterative \`find\` (the recursion limit is 1000), plain lists for integer elements and a dict for anything else.
`,
        examples: [
          { label: `Union-Find with path compression and union by size`, code: `class DSU:
    """Union-Find with path compression and union by size."""

    def __init__(self, n):
        self.parent = list(range(n))   # every element starts as its own root
        self.size = [1] * n            # size[r] is only meaningful when r is a root
        self.count = n                 # number of disjoint sets

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:  # path compression: point the whole path at the root
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False               # already in the same set
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra            # hang the smaller tree under the bigger one
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


def fmt(xs):
    return "[" + ", ".join(fmt(x) if isinstance(x, list) else str(x) for x in xs) + "]"


def groups(d, n):
    by_root = {}
    for x in range(n):
        by_root.setdefault(d.find(x), []).append(x)
    return sorted(by_root.values(), key=lambda g: g[0])


n = 8
d = DSU(n)
print("start: " + str(n) + " elements, " + str(d.count) + " sets")
for a, b in [(0, 1), (2, 3), (1, 3), (0, 2), (5, 6), (6, 5)]:
    merged = d.union(a, b)
    print("union(" + str(a) + ", " + str(b) + "): " + ("merged" if merged else "already together") + ", sets = " + str(d.count))
print("connected(0, 3) = " + str(d.connected(0, 3)).lower())
print("connected(0, 5) = " + str(d.connected(0, 5)).lower())
print("size of the set holding 3 = " + str(d.size[d.find(3)]))
print("groups: " + fmt(groups(d, n)))
print("parent array after the finds: " + fmt(d.parent))
` },
          { label: `Counting parent hops: naive vs compression vs union by size`, code: `# Count parent-pointer hops for four Union-Find variants on the same workloads.

class CountingDSU:
    def __init__(self, n, compress, by_size):
        self.parent = list(range(n))
        self.size = [1] * n
        self.compress = compress
        self.by_size = by_size
        self.hops = 0

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
            self.hops += 1
        if self.compress:
            while self.parent[x] != root:
                nxt = self.parent[x]
                self.parent[x] = root
                x = nxt
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.by_size and self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        if self.by_size:            # smaller tree goes under the bigger root
            self.parent[rb] = ra
            self.size[ra] += self.size[rb]
        else:                       # naive: always hang a's root under b's root
            self.parent[ra] = rb

    def height(self):
        best = 0
        for x in range(len(self.parent)):
            depth = 0
            while self.parent[x] != x:
                x = self.parent[x]
                depth += 1
            best = max(best, depth)
        return best


def star(n):                        # union(0, i) for i = 1 .. n-1
    return [(0, i) for i in range(1, n)]


def rounds(n):                      # merge pairs, then pairs of pairs, ...
    ops, step = [], 1
    while step < n:
        for i in range(0, n - step, 2 * step):
            ops.append((i, i + step))
        step *= 2
    return ops


VARIANTS = [("naive", False, False), ("compression only", True, False),
            ("size only", False, True), ("size + compression", True, True)]

for label, make, n in [("star", star, 1000), ("star", star, 3000), ("rounds", rounds, 1024), ("rounds", rounds, 4096)]:
    print(label + " workload, n = " + str(n) + ":")
    for name, compress, by_size in VARIANTS:
        d = CountingDSU(n, compress, by_size)
        for a, b in make(n):
            d.union(a, b)
        union_hops, tallest = d.hops, d.height()
        d.hops = 0
        for x in range(n):
            d.find(x)
        print("  " + name.ljust(19) + "union hops " + str(union_hops).rjust(8) +
              " | tallest tree " + str(tallest).rjust(4) + " | hops for n finds " + str(d.hops).rjust(8))
` },
          { label: `Three classic problems: components, redundant edge, earliest connection`, code: `# Three classic Union-Find interview problems on one small DSU.

class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.count = n

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def count_components(n, edges):
    d = DSU(n)
    for a, b in edges:
        d.union(a, b)
    return d.count


def redundant_edge(edges):
    # vertices are 1..n; the edge that closes a cycle is the answer
    d = DSU(len(edges) + 1)
    for a, b in edges:
        if not d.union(a, b):
            return [a, b]
    return []


def earliest_all_connected(n, logs):
    d = DSU(n)
    for t, a, b in sorted(logs):
        d.union(a, b)
        if d.count == 1:
            return t
    return -1


print(count_components(5, [[0, 1], [1, 2], [3, 4]]))  # 2
print(count_components(5, []))  # 5
print(count_components(4, [[0, 1], [1, 2], [2, 0], [2, 3]]))  # 1
print(fmt(redundant_edge([[1, 2], [1, 3], [2, 3]])))  # [2, 3]
print(fmt(redundant_edge([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]])))  # [1, 4]
print(earliest_all_connected(4, [[20, 0, 1], [5, 2, 3], [9, 1, 2], [40, 0, 3]]))  # 20
print(earliest_all_connected(4, [[1, 0, 1], [2, 2, 3]]))  # -1
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Can you explain what a Union-Find, or disjoint set, data structure is, implement it in JavaScript, and tell me how fast its operations are and why?"

**What a strong answer should cover:**
- What it stores: a partition of elements into non-overlapping sets, each set represented by one root; the whole thing is a forest kept in a \`parent\` array.
- The two operations: \`find(x)\` walks parent pointers to the root; \`union(a, b)\` links one root under the other and reports whether a merge happened.
- The two optimisations and what each fixes: path compression flattens paths during \`find\`; union by size or rank keeps trees shallow (height at most log2 n). Together: amortised O(α(n)) per operation, effectively constant.
- Where it is used: connected components, cycle detection in an undirected graph, Kruskal's minimum spanning tree, grouping problems; and what it cannot do (split a set, or answer questions on directed graphs).
- JavaScript specifics: \`parent\` as an \`Array\` or \`Int32Array\` for integer ids, a \`Map\` for string keys (never a plain object, whose keys are coerced to strings), an iterative \`find\` (a deep recursive one throws \`RangeError\`), and a numeric comparator when sorting edges, because the default \`sort\` compares as strings.

**Code / implementation expected:** Yes — a \`DSU\` class in JavaScript with \`find\`, \`union\` returning a boolean, and a set count.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array is; everything else is explained
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a school on the first day of term. Every student starts alone. During the day, pairs of students become friends, and friendship spreads: if Ana is friends with Ben and Ben is friends with Chloe, all three are now one friend group. At any moment a teacher may ask: "are Ana and Dev in the same group?"

You could keep a list of every group and, on every new friendship, copy one whole list into the other. That works, but merging big groups means moving a lot of names around.

Here is a lazier and much faster scheme. Every group picks a **captain**. Every student remembers just one name: the person they report to. The captain reports to themselves. To find your group, keep asking "who do you report to?" until you reach someone who reports to themselves; that is your captain. Two students are in the same group exactly when they reach the same captain. And when two groups become friends, nobody moves: one captain simply starts reporting to the other captain. One name changes.

That is the whole Union-Find data structure. The rest of this page is about two small habits that stop the chains of "who do you report to?" from getting long, and why those two habits make every question almost free.

## 2. The Core Idea

📌 **Interview term: Disjoint sets (a partition)** — a collection of sets where no element belongs to two sets at once. Every element is in exactly one group.

📌 **Interview term: Union-Find / Disjoint Set Union (DSU)** — a data structure that maintains a partition under two operations: **find** (which set is this element in?) and **union** (merge the sets of two elements).

The structure is a **forest**: a group is a tree, and every element points to its parent in that tree. All of it lives in one array:

📌 **Interview term: Parent array** — \`parent[x]\` is the element that \`x\` points to. A root points to itself: \`parent[r] == r\`. Initially every element is its own root, so there are n sets of size 1.

📌 **Interview term: Representative (root)** — the root of a tree, used as the name of the whole set. \`find(x)\` returns it, so \`find(a) == find(b)\` means "a and b are in the same set".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Forest for the sets 0 1 2 3, then 4 alone, 5 and 6, and 7 alone. Root 0 has children 1 and 2, and 2 has child 3. Root 5 has child 6.">
  <defs>
    <marker id="uf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="110" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="138" y="56" text-anchor="middle">0</text>
  <rect class="d-box" x="40" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="68" y="146" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="146" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="190" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="216" text-anchor="middle">3</text>
  <path class="d-edge" d="M 72 118 L 126 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 204 118 L 152 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 208 188 L 208 166" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="320" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="348" y="56" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="440" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="440" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="146" text-anchor="middle">6</text>
  <path class="d-edge" d="M 468 118 L 468 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="560" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="588" y="56" text-anchor="middle">7</text>
</svg>

The highlighted boxes are roots. Every arrow is one \`parent\` entry pointing up: the array for this picture is \`parent = [0, 0, 0, 2, 4, 5, 5, 7]\`, read as "1 reports to 0, 2 reports to 0, 3 reports to 2", and so on. There are four sets: {0, 1, 2, 3}, {4}, {5, 6} and {7}.

### The two operations

- **find(x):** follow \`parent\` from \`x\` until you reach an element that is its own parent. Return it.
- **union(a, b):** \`ra = find(a)\`, \`rb = find(b)\`. If they are equal, \`a\` and \`b\` are already together: return false. Otherwise make one root the parent of the other (\`parent[rb] = ra\`), decrement the set count, and return true.

That boolean return value is worth keeping: "union returned false" is exactly the signal for "this edge closes a cycle", which several classic problems need.

## 3. Why the Naive Version Is Slow, and the Two Fixes

If \`union\` always hangs the first root under the second, a bad sequence of unions builds a **chain**: 0 points to 1, 1 points to 2, and so on. Then \`find(0)\` walks the whole chain, n - 1 steps, and doing that repeatedly costs O(n) per operation, O(n²) in total. Example 2 below measures exactly this: for n = 1000 the naive version follows 498 501 parent pointers just during the unions.

### Fix 1: union by size (or by rank)

📌 **Interview term: Union by size** — when merging, hang the root of the **smaller** tree under the root of the larger one, and add the sizes. An element only gets one level deeper when its set at least doubles in size, so no tree is taller than log2 n.

📌 **Interview term: Union by rank** — the same idea using an upper bound on tree height ("rank") instead of the element count. Both give the same guarantees; size is handy because it also answers "how big is this group?".

### Fix 2: path compression

📌 **Interview term: Path compression** — after \`find(x)\` has located the root, point every node it walked through **directly at the root**. The next \`find\` on any of them takes one step.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Before path compression the chain is 3 to 2 to 1 to root 0. After find of 3 every node on the path points straight at root 0.">
  <defs>
    <marker id="uf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="24" text-anchor="middle">before find(3)</text>
  <rect class="d-box-accent" x="92" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="92" y="112" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="137" text-anchor="middle">1</text>
  <rect class="d-box" x="92" y="184" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">2</text>
  <rect class="d-box" x="92" y="256" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="281" text-anchor="middle">3</text>
  <path class="d-edge" d="M 120 110 L 120 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 182 L 120 156" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 254 L 120 228" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-dashed" d="M 250 160 L 330 160" fill="none" marker-end="url(#uf2-arrow)"/>
  <text class="d-sub" x="500" y="24" text-anchor="middle">after find(3)</text>
  <rect class="d-box-accent" x="472" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="380" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="408" y="195" text-anchor="middle">1</text>
  <rect class="d-box" x="472" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="195" text-anchor="middle">2</text>
  <rect class="d-box" x="564" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="592" y="195" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 414 168 L 488 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 500 168 L 500 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 586 168 L 512 84" fill="none" marker-end="url(#uf2-arrow)"/>
</svg>

On the left, \`find(3)\` takes three steps. While returning, it rewires 3 and 2 to point at 0 (1 already did), so the tree on the right is flat and every later \`find\` on these elements is one step.

📌 **Interview term: Path halving** — a one-pass variant: while walking up, set \`parent[x] = parent[parent[x]]\` (skip to the grandparent). It gives the same asymptotic bound and is a popular one-liner; the [Kruskal vs Prim page](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) uses it.

### How fast is it with both fixes?

📌 **Interview term: Amortised cost** — the average cost per operation over a whole sequence of operations, even if one particular operation is occasionally slower.

📌 **Interview term: Inverse Ackermann function α(n)** — a function that grows so slowly that it is at most 4 for any input size you could ever store. With both optimisations, m operations on n elements take O(m α(n)) time: effectively constant per operation.

That bound is a real theorem, not folklore: it was proved by Robert Tarjan in "Efficiency of a Good But Not Linear Set Union Algorithm", *Journal of the ACM* 22(2), 1975, which also showed it cannot be improved for this algorithm. In an interview, "amortised O(α(n)), which is effectively O(1)" is the expected phrase. With only one of the two fixes the bound is O(log n) per operation.

## 4. The Solution in JavaScript

~~~javascript
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // every element starts as its own root
    this.size = new Array(n).fill(1);                      // size[r] is only meaningful when r is a root
    this.count = n;                                        // number of disjoint sets
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {   // path compression: point the whole path at the root
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;        // already in the same set
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra]; // smaller tree under the bigger one
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}
~~~


**Why each line is there:**

- \`Array.from({ length: n }, (_, i) => i)\` builds \`[0, 1, ..., n-1]\`, so every element is its own root. For large n an \`Int32Array\` uses less memory and is filled with zeros, so you would still set \`parent[i] = i\` in a loop.
- \`find\` is two loops: walk up to the root, then walk the path again pointing every node at it. It is iterative on purpose: a recursive version on a 200 000-long chain threw \`RangeError: Maximum call stack size exceeded\` in Node 22.
- \`[ra, rb] = [rb, ra]\` is destructuring swap: it keeps \`ra\` as the larger root. It allocates a tiny temporary array; in a hot loop a \`const t = ra; ra = rb; rb = t;\` swap avoids that.
- \`union\` is a perfectly legal method name in JavaScript (it is not a reserved word), and \`===\` compares numbers without type coercion.
- Returning \`false\` when the roots match lets callers detect cycles and redundant edges.

**Elements that are strings.** Use a \`Map\`, not a plain object: object keys are always converted to strings, so \`1\` and \`"1"\` would collide, and a key such as \`"__proto__"\` is special.

~~~javascript
const parent = new Map();
function find(x) {
  if (!parent.has(x)) parent.set(x, x);
  let root = x;
  while (parent.get(root) !== root) root = parent.get(root);
  while (parent.get(x) !== root) {
    const next = parent.get(x);
    parent.set(x, root);
    x = next;
  }
  return root;
}
~~~

## 5. Verified: Running the Code

Each example on this page was saved as \`main.js\` and run with \`node main.js\` (the same code runs unchanged in the page, it only uses \`console.log\`). The same three programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Union-Find with path compression and union by size** prints:

~~~text
start: 8 elements, 8 sets
union(0, 1): merged, sets = 7
union(2, 3): merged, sets = 6
union(1, 3): merged, sets = 5
union(0, 2): already together, sets = 5
union(5, 6): merged, sets = 4
union(6, 5): already together, sets = 4
connected(0, 3) = true
connected(0, 5) = false
size of the set holding 3 = 4
groups: [[0, 1, 2, 3], [4], [5, 6], [7]]
parent array after the finds: [0, 0, 0, 0, 4, 5, 5, 7]
~~~

Reading it: \`union(0, 2)\` returns false because 0 and 2 were already joined through \`1-3\`; the set count only drops on a real merge. The last line is the parent array after \`groups\` called \`find\` on every element: every node of the big set points straight at root 0, which is path compression at work.

**Example 2 — counting parent hops for four variants** prints:

~~~text
star workload, n = 1000:
  naive              union hops   498501 | tallest tree  999 | hops for n finds   499500
  compression only   union hops     1995 | tallest tree  998 | hops for n finds     1997
  size only          union hops        0 | tallest tree    1 | hops for n finds      999
  size + compression union hops        0 | tallest tree    1 | hops for n finds      999
star workload, n = 3000:
  naive              union hops  4495501 | tallest tree 2999 | hops for n finds  4498500
  compression only   union hops     5995 | tallest tree 2998 | hops for n finds     5997
  size only          union hops        0 | tallest tree    1 | hops for n finds     2999
  size + compression union hops        0 | tallest tree    1 | hops for n finds     2999
rounds workload, n = 1024:
  naive              union hops     2026 | tallest tree   10 | hops for n finds     5120
  compression only   union hops     1532 | tallest tree    9 | hops for n finds     2028
  size only          union hops        0 | tallest tree   10 | hops for n finds     5120
  size + compression union hops        0 | tallest tree   10 | hops for n finds     2036
rounds workload, n = 4096:
  naive              union hops     8166 | tallest tree   12 | hops for n finds    24576
  compression only   union hops     6140 | tallest tree   11 | hops for n finds     8168
  size only          union hops        0 | tallest tree   12 | hops for n finds    24576
  size + compression union hops        0 | tallest tree   12 | hops for n finds     8178
~~~

Reading it: on the star workload the naive version is quadratic (498 501 hops for n = 1000, 4 495 501 for n = 3000, about nine times more for three times the input). Union by size keeps the star flat: tallest tree 1. On the rounds workload union by size still lets trees grow, but only to log2 n (10 for 1024, 12 for 4096), and adding compression cuts the cost of the final finds from 24 576 hops to 8 178.

**Example 3 — three classic problems** prints:

~~~text
2
5
1
[2, 3]
[1, 4]
20
-1
~~~

Each line matches the comment next to it in the code. The redundant edge \`[1, 4]\` is the first edge whose two ends already had the same root. The connection log becomes fully connected at time 20, not 40, once the events are sorted by time.

## 6. Complexity

| Variant | find / union | Space | Why |
| :--- | :--- | :--- | :--- |
| Naive linking, no compression | O(n) worst case | O(n) | a bad union order builds a chain of height n - 1 (Example 2: tallest tree 999 for n = 1000) |
| Union by size only | O(log n) | O(n) | a node gets deeper only when its set doubles, so height is at most log2 n (Example 2: 10 for n = 1024) |
| Path compression only | O(log n) amortised | O(n) | each long walk flattens the path it used |
| Size + compression | O(α(n)) amortised, effectively O(1) | O(n) | Tarjan, JACM 1975 |
| Building it | O(n) | O(n) | one parent entry and one size entry per element |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table. Example 2 shows the gap concretely: on the "star" workload with n = 3000 the naive version follows 4 495 501 parent pointers during the unions alone; with union by size it follows none.

## 7. Where Union-Find Is the Right Tool (and Where It Is Not)

Union-Find shines when the edges arrive **one at a time** and you keep asking "are these two connected yet?":

- **Counting connected components** in an undirected graph: start with n sets, union every edge, read the count. Compare it with DFS and BFS on [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and on [number of islands: DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Cycle detection in an undirected graph**: an edge whose two ends already share a root closes a cycle. That is the "redundant connection" problem in Example 3.
- **Kruskal's minimum spanning tree**: take edges cheapest first, keep an edge only when \`union\` returns true. See [Kruskal vs Prim](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms).
- **Dynamic connectivity over time**: "at what moment did everyone become connected?" Sort the events by time and stop when the count reaches 1 (also in Example 3).
- **Grouping by equivalence**: accounts that share an email, synonyms, pixels of the same colour region.

What it **cannot** do:

- **Split** a set or delete an edge. Unions are one-way. (Offline tricks exist, such as processing deletions in reverse as additions, but plain DSU has no "un-union".)
- **Directed graphs.** Union-Find ignores direction, so it cannot detect a directed cycle or find strongly connected components. For those, use DFS: see [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) and [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Paths.** It answers "connected or not", not "how" or "how far". For a route, use [BFS or DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

## 8. Edge Cases

- **union(x, x):** \`find\` returns the same root twice, so it returns false and the count does not change.
- **Repeating a union** (\`union(5, 6)\` then \`union(6, 5)\`): the second call returns false. Example 1 shows it.
- **n = 0 or no unions at all:** the count is n; every element is its own set.
- **Elements that are not 0..n-1** (strings, coordinates, huge ids): map them to indices first, or use a hash map for \`parent\` and create entries lazily.
- **Grid cells:** use the index \`r * cols + c\`, as in [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).
- **The size array is only valid at roots:** \`size[find(x)]\` is the size of x's set; \`size[x]\` for a non-root is stale.

## Common Pitfalls

- **Recursive \`find\` on deep trees.** Without union by size a chain can grow to n, and a recursive \`find\` throws \`RangeError: Maximum call stack size exceeded\` (it did at depth 200 000 in Node 22). Use the iterative two-loop version.
- **Plain objects as the parent map.** \`parent[1]\` and \`parent["1"]\` are the same slot, and inherited keys such as \`"constructor"\` exist on every object. Use a \`Map\` (or \`Object.create(null)\` if you must).
- **Sorting edges with the default \`sort()\`.** It compares as strings: \`[10, 9, 1].sort()\` gave \`[ 1, 10, 9 ]\` in a test. Pass \`(a, b) => a[0] - b[0]\`, as Example 3 does for the connection log.
- **Comparing parents instead of roots.** \`parent[a] === parent[b]\` is not "same set"; compare \`find(a) === find(b)\`.
- **Forgetting to decrement \`count\`** on a successful union, or doing it when the roots were already equal.
- **Treating Union-Find as a directed structure.** It ignores direction, so it cannot detect a directed cycle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A forest in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> array: each set is a tree, its root names the set. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> climbs to the root; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code> links one root under another and returns whether it merged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fix 1:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Union by size</strong>: hang the smaller tree under the bigger root, so no tree is taller than log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fix 2:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Path compression</strong>: after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, point every visited node at the root, so the next lookup is one step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">With both, amortised O(α(n)) per operation (Tarjan 1975), effectively O(1); O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS detail:</strong> <span style="color:#f0e2c8;">Iterative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> (deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>), a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> rather than an object for string keys, and a numeric comparator whenever I sort edges.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count the groups?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count = n</code> and decrement on every union that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a cycle in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) === find(v)</code> before the union, the edge closes a cycle. Not valid for directed graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a typed array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For millions of integer elements, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code> stores 4 bytes per entry. Remember it starts filled with zeros, so set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[i] = i</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete an edge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a plain DSU. If deletions are known in advance, replay the timeline backwards so they become unions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS is O(V + E) per query on a fixed graph. With edges arriving over time and a query after each, DSU is near O(1) per operation.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Disjoint sets** | groups with no shared elements; each element is in exactly one |
| **Union-Find / DSU** | structure supporting find (which set?) and union (merge two sets) |
| **Parent array** | \`parent[x]\` is the element x points to; a root points to itself |
| **Representative (root)** | the element that names a set; \`find\` returns it |
| **Union by size** | hang the smaller tree under the larger root; height stays at most log2 n |
| **Union by rank** | the same idea using a height bound instead of a count |
| **Path compression** | after a find, point every visited node straight at the root |
| **Path halving** | while walking up, skip each node to its grandparent |
| **Amortised cost** | average cost per operation over a whole sequence |
| **Inverse Ackermann α(n)** | an incredibly slow-growing function, at most 4 in practice |
| **\`Map\`** | a hash map with keys of any type, unlike object keys which become strings |

---
**Conclusion:** Union-Find keeps a partition as a forest in one parent array: \`find\` climbs to the root that names a set, and union links two roots. On its own that can degrade into long chains, but union by size keeps trees at most log2 n tall and path compression flattens every path it walks, and together they make each operation amortised O(α(n)), effectively constant. That is why it is the standard tool for connectivity that grows edge by edge: components, undirected cycle detection, Kruskal's algorithm and grouping problems. In JavaScript the practical marks are an iterative \`find\`, a \`Map\` for non-integer keys, and never sorting numbers with the default \`sort()\`.
`,
        examples: [
          { label: `Union-Find with path compression and union by size`, code: `// Union-Find with path compression and union by size.
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // every element starts as its own root
    this.size = new Array(n).fill(1);                      // size[r] is only meaningful when r is a root
    this.count = n;                                        // number of disjoint sets
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {   // path compression: point the whole path at the root
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;        // already in the same set
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra]; // smaller tree under the bigger one
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

function fmt(xs) {
  return '[' + xs.map((x) => (Array.isArray(x) ? fmt(x) : String(x))).join(', ') + ']';
}

function groups(d, n) {
  const byRoot = new Map();
  for (let x = 0; x < n; x++) {
    const r = d.find(x);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(x);
  }
  return [...byRoot.values()].sort((g, h) => g[0] - h[0]);
}

const n = 8;
const d = new DSU(n);
console.log('start: ' + n + ' elements, ' + d.count + ' sets');
for (const [a, b] of [[0, 1], [2, 3], [1, 3], [0, 2], [5, 6], [6, 5]]) {
  const merged = d.union(a, b);
  console.log('union(' + a + ', ' + b + '): ' + (merged ? 'merged' : 'already together') + ', sets = ' + d.count);
}
console.log('connected(0, 3) = ' + d.connected(0, 3));
console.log('connected(0, 5) = ' + d.connected(0, 5));
console.log('size of the set holding 3 = ' + d.size[d.find(3)]);
console.log('groups: ' + fmt(groups(d, n)));
console.log('parent array after the finds: ' + fmt(d.parent));
` },
          { label: `Counting parent hops: naive vs compression vs union by size`, code: `// Count parent-pointer hops for four Union-Find variants on the same workloads.
class CountingDSU {
  constructor(n, compress, bySize) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.compress = compress;
    this.bySize = bySize;
    this.hops = 0;
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
      this.hops++;
    }
    if (this.compress) {
      while (this.parent[x] !== root) {
        const next = this.parent[x];
        this.parent[x] = root;
        x = next;
      }
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    if (this.bySize && this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    if (this.bySize) {          // smaller tree goes under the bigger root
      this.parent[rb] = ra;
      this.size[ra] += this.size[rb];
    } else {                    // naive: always hang a's root under b's root
      this.parent[ra] = rb;
    }
  }

  height() {
    let best = 0;
    for (let x = 0; x < this.parent.length; x++) {
      let depth = 0, y = x;
      while (this.parent[y] !== y) { y = this.parent[y]; depth++; }
      best = Math.max(best, depth);
    }
    return best;
  }
}

function star(n) {              // union(0, i) for i = 1 .. n-1
  const ops = [];
  for (let i = 1; i < n; i++) ops.push([0, i]);
  return ops;
}

function rounds(n) {            // merge pairs, then pairs of pairs, ...
  const ops = [];
  for (let step = 1; step < n; step *= 2) {
    for (let i = 0; i < n - step; i += 2 * step) ops.push([i, i + step]);
  }
  return ops;
}

const VARIANTS = [['naive', false, false], ['compression only', true, false],
  ['size only', false, true], ['size + compression', true, true]];

for (const [label, make, n] of [['star', star, 1000], ['star', star, 3000], ['rounds', rounds, 1024], ['rounds', rounds, 4096]]) {
  console.log(label + ' workload, n = ' + n + ':');
  for (const [name, compress, bySize] of VARIANTS) {
    const d = new CountingDSU(n, compress, bySize);
    for (const [a, b] of make(n)) d.union(a, b);
    const unionHops = d.hops, tallest = d.height();
    d.hops = 0;
    for (let x = 0; x < n; x++) d.find(x);
    console.log('  ' + name.padEnd(19) + 'union hops ' + String(unionHops).padStart(8) +
      ' | tallest tree ' + String(tallest).padStart(4) + ' | hops for n finds ' + String(d.hops).padStart(8));
  }
}
` },
          { label: `Three classic problems: components, redundant edge, earliest connection`, code: `// Three classic Union-Find interview problems on one small DSU.
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.count = n;
  }

  find(x) {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function countComponents(n, edges) {
  const d = new DSU(n);
  for (const [a, b] of edges) d.union(a, b);
  return d.count;
}

function redundantEdge(edges) {
  // vertices are 1..n; the edge that closes a cycle is the answer
  const d = new DSU(edges.length + 1);
  for (const [a, b] of edges) if (!d.union(a, b)) return [a, b];
  return [];
}

function earliestAllConnected(n, logs) {
  const d = new DSU(n);
  const sorted = [...logs].sort((x, y) => x[0] - y[0]); // numeric compare: default sort is by string
  for (const [t, a, b] of sorted) {
    d.union(a, b);
    if (d.count === 1) return t;
  }
  return -1;
}

console.log(countComponents(5, [[0, 1], [1, 2], [3, 4]])); // 2
console.log(countComponents(5, [])); // 5
console.log(countComponents(4, [[0, 1], [1, 2], [2, 0], [2, 3]])); // 1
console.log(fmt(redundantEdge([[1, 2], [1, 3], [2, 3]]))); // [2, 3]
console.log(fmt(redundantEdge([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]))); // [1, 4]
console.log(earliestAllConnected(4, [[20, 0, 1], [5, 2, 3], [9, 1, 2], [40, 0, 3]])); // 20
console.log(earliestAllConnected(4, [[1, 0, 1], [2, 2, 3]])); // -1
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Can you explain what a Union-Find, or disjoint set, data structure is, implement it in Java, and tell me how fast its operations are and why?"

**What a strong answer should cover:**
- What it stores: a partition of elements into non-overlapping sets, each set represented by one root; the whole thing is a forest kept in a \`parent\` array.
- The two operations: \`find(x)\` walks parent pointers to the root; \`union(a, b)\` links one root under the other and reports whether a merge happened.
- The two optimisations and what each fixes: path compression flattens paths during \`find\`; union by size or rank keeps trees shallow (height at most log2 n). Together: amortised O(α(n)) per operation, effectively constant.
- Where it is used: connected components, cycle detection in an undirected graph, Kruskal's minimum spanning tree, grouping problems; and what it cannot do (split a set, or answer questions on directed graphs).
- Java specifics: primitive \`int[]\` arrays for \`parent\` and \`size\` (no \`Integer\` boxing), an iterative \`find\` to avoid \`StackOverflowError\` on long chains with the default thread stack, and a \`HashMap<String, String>\` variant when the elements are not small integers.

**Code / implementation expected:** Yes — a static nested \`DSU\` class in Java over \`int[]\` arrays with \`find\`, \`union\` returning \`boolean\`, and a set count.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array is; everything else is explained
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a school on the first day of term. Every student starts alone. During the day, pairs of students become friends, and friendship spreads: if Ana is friends with Ben and Ben is friends with Chloe, all three are now one friend group. At any moment a teacher may ask: "are Ana and Dev in the same group?"

You could keep a list of every group and, on every new friendship, copy one whole list into the other. That works, but merging big groups means moving a lot of names around.

Here is a lazier and much faster scheme. Every group picks a **captain**. Every student remembers just one name: the person they report to. The captain reports to themselves. To find your group, keep asking "who do you report to?" until you reach someone who reports to themselves; that is your captain. Two students are in the same group exactly when they reach the same captain. And when two groups become friends, nobody moves: one captain simply starts reporting to the other captain. One name changes.

That is the whole Union-Find data structure. The rest of this page is about two small habits that stop the chains of "who do you report to?" from getting long, and why those two habits make every question almost free.

## 2. The Core Idea

📌 **Interview term: Disjoint sets (a partition)** — a collection of sets where no element belongs to two sets at once. Every element is in exactly one group.

📌 **Interview term: Union-Find / Disjoint Set Union (DSU)** — a data structure that maintains a partition under two operations: **find** (which set is this element in?) and **union** (merge the sets of two elements).

The structure is a **forest**: a group is a tree, and every element points to its parent in that tree. All of it lives in one array:

📌 **Interview term: Parent array** — \`parent[x]\` is the element that \`x\` points to. A root points to itself: \`parent[r] == r\`. Initially every element is its own root, so there are n sets of size 1.

📌 **Interview term: Representative (root)** — the root of a tree, used as the name of the whole set. \`find(x)\` returns it, so \`find(a) == find(b)\` means "a and b are in the same set".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Forest for the sets 0 1 2 3, then 4 alone, 5 and 6, and 7 alone. Root 0 has children 1 and 2, and 2 has child 3. Root 5 has child 6.">
  <defs>
    <marker id="uf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="110" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="138" y="56" text-anchor="middle">0</text>
  <rect class="d-box" x="40" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="68" y="146" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="146" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="190" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="216" text-anchor="middle">3</text>
  <path class="d-edge" d="M 72 118 L 126 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 204 118 L 152 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 208 188 L 208 166" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="320" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="348" y="56" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="440" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="440" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="146" text-anchor="middle">6</text>
  <path class="d-edge" d="M 468 118 L 468 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="560" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="588" y="56" text-anchor="middle">7</text>
</svg>

The highlighted boxes are roots. Every arrow is one \`parent\` entry pointing up: the array for this picture is \`parent = [0, 0, 0, 2, 4, 5, 5, 7]\`, read as "1 reports to 0, 2 reports to 0, 3 reports to 2", and so on. There are four sets: {0, 1, 2, 3}, {4}, {5, 6} and {7}.

### The two operations

- **find(x):** follow \`parent\` from \`x\` until you reach an element that is its own parent. Return it.
- **union(a, b):** \`ra = find(a)\`, \`rb = find(b)\`. If they are equal, \`a\` and \`b\` are already together: return false. Otherwise make one root the parent of the other (\`parent[rb] = ra\`), decrement the set count, and return true.

That boolean return value is worth keeping: "union returned false" is exactly the signal for "this edge closes a cycle", which several classic problems need.

## 3. Why the Naive Version Is Slow, and the Two Fixes

If \`union\` always hangs the first root under the second, a bad sequence of unions builds a **chain**: 0 points to 1, 1 points to 2, and so on. Then \`find(0)\` walks the whole chain, n - 1 steps, and doing that repeatedly costs O(n) per operation, O(n²) in total. Example 2 below measures exactly this: for n = 1000 the naive version follows 498 501 parent pointers just during the unions.

### Fix 1: union by size (or by rank)

📌 **Interview term: Union by size** — when merging, hang the root of the **smaller** tree under the root of the larger one, and add the sizes. An element only gets one level deeper when its set at least doubles in size, so no tree is taller than log2 n.

📌 **Interview term: Union by rank** — the same idea using an upper bound on tree height ("rank") instead of the element count. Both give the same guarantees; size is handy because it also answers "how big is this group?".

### Fix 2: path compression

📌 **Interview term: Path compression** — after \`find(x)\` has located the root, point every node it walked through **directly at the root**. The next \`find\` on any of them takes one step.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Before path compression the chain is 3 to 2 to 1 to root 0. After find of 3 every node on the path points straight at root 0.">
  <defs>
    <marker id="uf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="24" text-anchor="middle">before find(3)</text>
  <rect class="d-box-accent" x="92" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="92" y="112" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="137" text-anchor="middle">1</text>
  <rect class="d-box" x="92" y="184" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">2</text>
  <rect class="d-box" x="92" y="256" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="281" text-anchor="middle">3</text>
  <path class="d-edge" d="M 120 110 L 120 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 182 L 120 156" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 254 L 120 228" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-dashed" d="M 250 160 L 330 160" fill="none" marker-end="url(#uf2-arrow)"/>
  <text class="d-sub" x="500" y="24" text-anchor="middle">after find(3)</text>
  <rect class="d-box-accent" x="472" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="380" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="408" y="195" text-anchor="middle">1</text>
  <rect class="d-box" x="472" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="195" text-anchor="middle">2</text>
  <rect class="d-box" x="564" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="592" y="195" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 414 168 L 488 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 500 168 L 500 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 586 168 L 512 84" fill="none" marker-end="url(#uf2-arrow)"/>
</svg>

On the left, \`find(3)\` takes three steps. While returning, it rewires 3 and 2 to point at 0 (1 already did), so the tree on the right is flat and every later \`find\` on these elements is one step.

📌 **Interview term: Path halving** — a one-pass variant: while walking up, set \`parent[x] = parent[parent[x]]\` (skip to the grandparent). It gives the same asymptotic bound and is a popular one-liner; the [Kruskal vs Prim page](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) uses it.

### How fast is it with both fixes?

📌 **Interview term: Amortised cost** — the average cost per operation over a whole sequence of operations, even if one particular operation is occasionally slower.

📌 **Interview term: Inverse Ackermann function α(n)** — a function that grows so slowly that it is at most 4 for any input size you could ever store. With both optimisations, m operations on n elements take O(m α(n)) time: effectively constant per operation.

That bound is a real theorem, not folklore: it was proved by Robert Tarjan in "Efficiency of a Good But Not Linear Set Union Algorithm", *Journal of the ACM* 22(2), 1975, which also showed it cannot be improved for this algorithm. In an interview, "amortised O(α(n)), which is effectively O(1)" is the expected phrase. With only one of the two fixes the bound is O(log n) per operation.

## 4. The Solution in Java

~~~java
static class DSU {
    final int[] parent, size;
    int count;

    DSU(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; } // every element is its own root
        count = n;                                                   // number of disjoint sets
    }

    int find(int x) {
        int root = x;
        while (parent[root] != root) root = parent[root];
        while (parent[x] != root) {      // path compression: point the whole path at the root
            int next = parent[x];
            parent[x] = root;
            x = next;
        }
        return root;
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;      // already in the same set
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; } // smaller tree under the bigger one
        parent[rb] = ra;
        size[ra] += size[rb];
        count--;
        return true;
    }

    boolean connected(int a, int b) { return find(a) == find(b); }
}
~~~


**Why each line is there:**

- \`int[] parent, size\` are primitive arrays: 4 bytes per entry and no boxing. A \`List<Integer>\` would store a pointer to an \`Integer\` object per element and would make \`==\` on two values dangerous (it compares references outside the small-integer cache).
- \`find\` is two loops: walk up to the root, then walk the path again pointing every node at it. It is iterative on purpose: a recursive version on a 200 000-long chain threw \`StackOverflowError\` with the default thread stack in a test run.
- \`union\` swaps through a temporary \`int t\` so that \`ra\` is always the bigger root. \`union\` is not a Java keyword, so the name is fine.
- \`count--\` keeps the number of sets in O(1), so "how many groups are there?" never needs a scan.
- Returning \`false\` when the roots match lets callers detect cycles and redundant edges.

**Elements that are strings.** Use a \`HashMap<String, String>\` and create entries lazily:

~~~java
Map<String, String> parent = new HashMap<>();
String find(String x) {
    parent.putIfAbsent(x, x);
    String root = x;
    while (!parent.get(root).equals(root)) root = parent.get(root);
    while (!parent.get(x).equals(root)) {
        String next = parent.get(x);
        parent.put(x, root);
        x = next;
    }
    return root;
}
~~~

Note \`equals\`, not \`==\`, to compare the strings.

## 5. Verified: Running the Code

Each example on this page was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same three programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Union-Find with path compression and union by size** prints:

~~~text
start: 8 elements, 8 sets
union(0, 1): merged, sets = 7
union(2, 3): merged, sets = 6
union(1, 3): merged, sets = 5
union(0, 2): already together, sets = 5
union(5, 6): merged, sets = 4
union(6, 5): already together, sets = 4
connected(0, 3) = true
connected(0, 5) = false
size of the set holding 3 = 4
groups: [[0, 1, 2, 3], [4], [5, 6], [7]]
parent array after the finds: [0, 0, 0, 0, 4, 5, 5, 7]
~~~

Reading it: \`union(0, 2)\` returns false because 0 and 2 were already joined through \`1-3\`; the set count only drops on a real merge. The last line is the parent array after \`groups\` called \`find\` on every element: every node of the big set points straight at root 0, which is path compression at work.

**Example 2 — counting parent hops for four variants** prints:

~~~text
star workload, n = 1000:
  naive              union hops   498501 | tallest tree  999 | hops for n finds   499500
  compression only   union hops     1995 | tallest tree  998 | hops for n finds     1997
  size only          union hops        0 | tallest tree    1 | hops for n finds      999
  size + compression union hops        0 | tallest tree    1 | hops for n finds      999
star workload, n = 3000:
  naive              union hops  4495501 | tallest tree 2999 | hops for n finds  4498500
  compression only   union hops     5995 | tallest tree 2998 | hops for n finds     5997
  size only          union hops        0 | tallest tree    1 | hops for n finds     2999
  size + compression union hops        0 | tallest tree    1 | hops for n finds     2999
rounds workload, n = 1024:
  naive              union hops     2026 | tallest tree   10 | hops for n finds     5120
  compression only   union hops     1532 | tallest tree    9 | hops for n finds     2028
  size only          union hops        0 | tallest tree   10 | hops for n finds     5120
  size + compression union hops        0 | tallest tree   10 | hops for n finds     2036
rounds workload, n = 4096:
  naive              union hops     8166 | tallest tree   12 | hops for n finds    24576
  compression only   union hops     6140 | tallest tree   11 | hops for n finds     8168
  size only          union hops        0 | tallest tree   12 | hops for n finds    24576
  size + compression union hops        0 | tallest tree   12 | hops for n finds     8178
~~~

Reading it: on the star workload the naive version is quadratic (498 501 hops for n = 1000, 4 495 501 for n = 3000, about nine times more for three times the input). Union by size keeps the star flat: tallest tree 1. On the rounds workload union by size still lets trees grow, but only to log2 n (10 for 1024, 12 for 4096), and adding compression cuts the cost of the final finds from 24 576 hops to 8 178.

**Example 3 — three classic problems** prints:

~~~text
2
5
1
[2, 3]
[1, 4]
20
-1
~~~

Each line matches the comment next to it in the code. The redundant edge \`[1, 4]\` is the first edge whose two ends already had the same root. The connection log becomes fully connected at time 20, not 40, once the events are sorted by time.

## 6. Complexity

| Variant | find / union | Space | Why |
| :--- | :--- | :--- | :--- |
| Naive linking, no compression | O(n) worst case | O(n) | a bad union order builds a chain of height n - 1 (Example 2: tallest tree 999 for n = 1000) |
| Union by size only | O(log n) | O(n) | a node gets deeper only when its set doubles, so height is at most log2 n (Example 2: 10 for n = 1024) |
| Path compression only | O(log n) amortised | O(n) | each long walk flattens the path it used |
| Size + compression | O(α(n)) amortised, effectively O(1) | O(n) | Tarjan, JACM 1975 |
| Building it | O(n) | O(n) | one parent entry and one size entry per element |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table. Example 2 shows the gap concretely: on the "star" workload with n = 3000 the naive version follows 4 495 501 parent pointers during the unions alone; with union by size it follows none.

## 7. Where Union-Find Is the Right Tool (and Where It Is Not)

Union-Find shines when the edges arrive **one at a time** and you keep asking "are these two connected yet?":

- **Counting connected components** in an undirected graph: start with n sets, union every edge, read the count. Compare it with DFS and BFS on [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and on [number of islands: DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Cycle detection in an undirected graph**: an edge whose two ends already share a root closes a cycle. That is the "redundant connection" problem in Example 3.
- **Kruskal's minimum spanning tree**: take edges cheapest first, keep an edge only when \`union\` returns true. See [Kruskal vs Prim](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms).
- **Dynamic connectivity over time**: "at what moment did everyone become connected?" Sort the events by time and stop when the count reaches 1 (also in Example 3).
- **Grouping by equivalence**: accounts that share an email, synonyms, pixels of the same colour region.

What it **cannot** do:

- **Split** a set or delete an edge. Unions are one-way. (Offline tricks exist, such as processing deletions in reverse as additions, but plain DSU has no "un-union".)
- **Directed graphs.** Union-Find ignores direction, so it cannot detect a directed cycle or find strongly connected components. For those, use DFS: see [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) and [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Paths.** It answers "connected or not", not "how" or "how far". For a route, use [BFS or DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

## 8. Edge Cases

- **union(x, x):** \`find\` returns the same root twice, so it returns false and the count does not change.
- **Repeating a union** (\`union(5, 6)\` then \`union(6, 5)\`): the second call returns false. Example 1 shows it.
- **n = 0 or no unions at all:** the count is n; every element is its own set.
- **Elements that are not 0..n-1** (strings, coordinates, huge ids): map them to indices first, or use a hash map for \`parent\` and create entries lazily.
- **Grid cells:** use the index \`r * cols + c\`, as in [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).
- **The size array is only valid at roots:** \`size[find(x)]\` is the size of x's set; \`size[x]\` for a non-root is stale.

## Common Pitfalls

- **Recursive \`find\` without union by size.** A chain of 200 000 threw \`StackOverflowError\` with the default stack in a test. Write \`find\` iteratively or keep trees shallow with union by size.
- **\`List<Integer>\` for the parent array with \`==\`.** \`Integer\` objects compare by reference outside the small cached range, so \`parent.get(a) == parent.get(b)\` can be false for equal values. Use \`int[]\`, or \`.equals\`.
- **\`==\` on \`String\` keys** in a map-based DSU. Use \`.equals\`; two equal strings are not always the same object.
- **Comparing parents instead of roots.** \`parent[a] == parent[b]\` is not "same set"; compare \`find(a) == find(b)\`.
- **Updating \`size\` on the wrong root** after the swap, or reading \`size[x]\` for a non-root.
- **Treating Union-Find as a directed structure.** It ignores direction, so it cannot detect a directed cycle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A forest in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code>: each set is a tree, its root names the set. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> climbs to the root; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code> links one root under another and returns whether it merged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fix 1:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Union by size</strong>: hang the smaller tree under the bigger root, so no tree is taller than log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fix 2:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Path compression</strong>: after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, point every visited node at the root, so the next lookup is one step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">With both, amortised O(α(n)) per operation (Tarjan 1975), effectively O(1); two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays of size n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Primitive arrays, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> boxing; iterative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> so a long chain cannot throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.equals</code> when elements are strings.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count the groups?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int count = n</code> and decrement on every union that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a cycle in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> before the union, the edge closes a cycle. Not valid for directed graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Less memory, no boxing, and no reference-comparison trap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete an edge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a plain DSU. If deletions are known in advance, replay the timeline backwards so they become unions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> writes (path compression), so concurrent finds race. Synchronise, or give each thread its own structure.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Disjoint sets** | groups with no shared elements; each element is in exactly one |
| **Union-Find / DSU** | structure supporting find (which set?) and union (merge two sets) |
| **Parent array** | \`parent[x]\` is the element x points to; a root points to itself |
| **Representative (root)** | the element that names a set; \`find\` returns it |
| **Union by size** | hang the smaller tree under the larger root; height stays at most log2 n |
| **Union by rank** | the same idea using a height bound instead of a count |
| **Path compression** | after a find, point every visited node straight at the root |
| **Path halving** | while walking up, skip each node to its grandparent |
| **Amortised cost** | average cost per operation over a whole sequence |
| **Inverse Ackermann α(n)** | an incredibly slow-growing function, at most 4 in practice |
| **Boxing** | wrapping an \`int\` in an \`Integer\` object; avoided by \`int[]\` arrays |

---
**Conclusion:** Union-Find keeps a partition as a forest in one parent array: \`find\` climbs to the root that names a set, and union links two roots. On its own that can degrade into long chains, but union by size keeps trees at most log2 n tall and path compression flattens every path it walks, and together they make each operation amortised O(α(n)), effectively constant. That is why it is the standard tool for connectivity that grows edge by edge: components, undirected cycle detection, Kruskal's algorithm and grouping problems. In Java the practical marks are primitive \`int[]\` arrays, an iterative \`find\`, and \`.equals\` when the elements are objects.
`,
        examples: [
          { label: `Union-Find with path compression and union by size`, code: `import java.util.*;

public class Main {
    // Union-Find with path compression and union by size.
    static class DSU {
        final int[] parent, size;
        int count;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; } // every element is its own root
            count = n;                                                   // number of disjoint sets
        }

        int find(int x) {
            int root = x;
            while (parent[root] != root) root = parent[root];
            while (parent[x] != root) {      // path compression: point the whole path at the root
                int next = parent[x];
                parent[x] = root;
                x = next;
            }
            return root;
        }

        boolean union(int a, int b) {
            int ra = find(a), rb = find(b);
            if (ra == rb) return false;      // already in the same set
            if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; } // smaller tree under the bigger one
            parent[rb] = ra;
            size[ra] += size[rb];
            count--;
            return true;
        }

        boolean connected(int a, int b) { return find(a) == find(b); }
    }

    static List<List<Integer>> groups(DSU d, int n) {
        Map<Integer, List<Integer>> byRoot = new TreeMap<>();
        for (int x = 0; x < n; x++) byRoot.computeIfAbsent(d.find(x), k -> new ArrayList<>()).add(x);
        List<List<Integer>> out = new ArrayList<>(byRoot.values());
        out.sort(Comparator.comparingInt(g -> g.get(0)));
        return out;
    }

    public static void main(String[] args) {
        int n = 8;
        DSU d = new DSU(n);
        System.out.println("start: " + n + " elements, " + d.count + " sets");
        int[][] ops = {{0, 1}, {2, 3}, {1, 3}, {0, 2}, {5, 6}, {6, 5}};
        for (int[] op : ops) {
            boolean merged = d.union(op[0], op[1]);
            System.out.println("union(" + op[0] + ", " + op[1] + "): " + (merged ? "merged" : "already together") + ", sets = " + d.count);
        }
        System.out.println("connected(0, 3) = " + d.connected(0, 3));
        System.out.println("connected(0, 5) = " + d.connected(0, 5));
        System.out.println("size of the set holding 3 = " + d.size[d.find(3)]);
        System.out.println("groups: " + groups(d, n));
        System.out.println("parent array after the finds: " + Arrays.toString(d.parent));
    }
}
` },
          { label: `Counting parent hops: naive vs compression vs union by size`, code: `import java.util.*;

public class Main {
    // Count parent-pointer hops for four Union-Find variants on the same workloads.
    static class CountingDSU {
        final int[] parent, size;
        final boolean compress, bySize;
        long hops = 0;

        CountingDSU(int n, boolean compress, boolean bySize) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
            this.compress = compress;
            this.bySize = bySize;
        }

        int find(int x) {
            int root = x;
            while (parent[root] != root) { root = parent[root]; hops++; }
            if (compress) {
                while (parent[x] != root) { int next = parent[x]; parent[x] = root; x = next; }
            }
            return root;
        }

        void union(int a, int b) {
            int ra = find(a), rb = find(b);
            if (ra == rb) return;
            if (bySize && size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
            if (bySize) {           // smaller tree goes under the bigger root
                parent[rb] = ra;
                size[ra] += size[rb];
            } else {                // naive: always hang a's root under b's root
                parent[ra] = rb;
            }
        }

        int height() {
            int best = 0;
            for (int x = 0; x < parent.length; x++) {
                int depth = 0, y = x;
                while (parent[y] != y) { y = parent[y]; depth++; }
                best = Math.max(best, depth);
            }
            return best;
        }
    }

    static List<int[]> star(int n) {        // union(0, i) for i = 1 .. n-1
        List<int[]> ops = new ArrayList<>();
        for (int i = 1; i < n; i++) ops.add(new int[]{0, i});
        return ops;
    }

    static List<int[]> rounds(int n) {      // merge pairs, then pairs of pairs, ...
        List<int[]> ops = new ArrayList<>();
        for (int step = 1; step < n; step *= 2)
            for (int i = 0; i < n - step; i += 2 * step) ops.add(new int[]{i, i + step});
        return ops;
    }

    public static void main(String[] args) {
        String[] names = {"naive", "compression only", "size only", "size + compression"};
        boolean[][] flags = {{false, false}, {true, false}, {false, true}, {true, true}};
        String[] labels = {"star", "star", "rounds", "rounds"};
        int[] sizes = {1000, 3000, 1024, 4096};
        for (int w = 0; w < 4; w++) {
            int n = sizes[w];
            System.out.println(labels[w] + " workload, n = " + n + ":");
            List<int[]> ops = labels[w].equals("star") ? star(n) : rounds(n);
            for (int v = 0; v < 4; v++) {
                CountingDSU d = new CountingDSU(n, flags[v][0], flags[v][1]);
                for (int[] op : ops) d.union(op[0], op[1]);
                long unionHops = d.hops;
                int tallest = d.height();
                d.hops = 0;
                for (int x = 0; x < n; x++) d.find(x);
                System.out.println("  " + String.format("%-19s", names[v]) + "union hops " + String.format("%8d", unionHops)
                    + " | tallest tree " + String.format("%4d", tallest) + " | hops for n finds " + String.format("%8d", d.hops));
            }
        }
    }
}
` },
          { label: `Three classic problems: components, redundant edge, earliest connection`, code: `import java.util.*;

public class Main {
    // Three classic Union-Find interview problems on one small DSU.
    static class DSU {
        final int[] parent, size;
        int count;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
            count = n;
        }

        int find(int x) {
            int root = x;
            while (parent[root] != root) root = parent[root];
            while (parent[x] != root) { int next = parent[x]; parent[x] = root; x = next; }
            return root;
        }

        boolean union(int a, int b) {
            int ra = find(a), rb = find(b);
            if (ra == rb) return false;
            if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
            parent[rb] = ra;
            size[ra] += size[rb];
            count--;
            return true;
        }
    }

    static int countComponents(int n, int[][] edges) {
        DSU d = new DSU(n);
        for (int[] e : edges) d.union(e[0], e[1]);
        return d.count;
    }

    static int[] redundantEdge(int[][] edges) {
        // vertices are 1..n; the edge that closes a cycle is the answer
        DSU d = new DSU(edges.length + 1);
        for (int[] e : edges) if (!d.union(e[0], e[1])) return e;
        return new int[0];
    }

    static int earliestAllConnected(int n, int[][] logs) {
        DSU d = new DSU(n);
        int[][] sorted = logs.clone();
        Arrays.sort(sorted, Comparator.comparingInt(l -> l[0]));
        for (int[] l : sorted) {
            d.union(l[1], l[2]);
            if (d.count == 1) return l[0];
        }
        return -1;
    }

    public static void main(String[] args) {
        System.out.println(countComponents(5, new int[][]{{0, 1}, {1, 2}, {3, 4}})); // 2
        System.out.println(countComponents(5, new int[][]{})); // 5
        System.out.println(countComponents(4, new int[][]{{0, 1}, {1, 2}, {2, 0}, {2, 3}})); // 1
        System.out.println(Arrays.toString(redundantEdge(new int[][]{{1, 2}, {1, 3}, {2, 3}}))); // [2, 3]
        System.out.println(Arrays.toString(redundantEdge(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}}))); // [1, 4]
        System.out.println(earliestAllConnected(4, new int[][]{{20, 0, 1}, {5, 2, 3}, {9, 1, 2}, {40, 0, 3}})); // 20
        System.out.println(earliestAllConnected(4, new int[][]{{1, 0, 1}, {2, 2, 3}})); // -1
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Can you explain what a Union-Find, or disjoint set, data structure is, implement it in C++, and tell me how fast its operations are and why?"

**What a strong answer should cover:**
- What it stores: a partition of elements into non-overlapping sets, each set represented by one root; the whole thing is a forest kept in a \`parent\` array.
- The two operations: \`find(x)\` walks parent pointers to the root; \`union(a, b)\` links one root under the other and reports whether a merge happened.
- The two optimisations and what each fixes: path compression flattens paths during \`find\`; union by size or rank keeps trees shallow (height at most log2 n). Together: amortised O(α(n)) per operation, effectively constant.
- Where it is used: connected components, cycle detection in an undirected graph, Kruskal's minimum spanning tree, grouping problems; and what it cannot do (split a set, or answer questions on directed graphs).
- C++ specifics: \`union\` is a reserved keyword, so the method is usually called \`unite\`; \`std::vector<int>\` with \`std::iota\` to initialise the parents; \`std::swap\` for union by size; and \`std::unordered_map\` when the elements are not dense integers.

**Code / implementation expected:** Yes — a \`struct DSU\` in C++ over \`std::vector<int>\` with \`find\`, \`unite\` returning \`bool\`, and a set count.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array is; everything else is explained
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a school on the first day of term. Every student starts alone. During the day, pairs of students become friends, and friendship spreads: if Ana is friends with Ben and Ben is friends with Chloe, all three are now one friend group. At any moment a teacher may ask: "are Ana and Dev in the same group?"

You could keep a list of every group and, on every new friendship, copy one whole list into the other. That works, but merging big groups means moving a lot of names around.

Here is a lazier and much faster scheme. Every group picks a **captain**. Every student remembers just one name: the person they report to. The captain reports to themselves. To find your group, keep asking "who do you report to?" until you reach someone who reports to themselves; that is your captain. Two students are in the same group exactly when they reach the same captain. And when two groups become friends, nobody moves: one captain simply starts reporting to the other captain. One name changes.

That is the whole Union-Find data structure. The rest of this page is about two small habits that stop the chains of "who do you report to?" from getting long, and why those two habits make every question almost free.

## 2. The Core Idea

📌 **Interview term: Disjoint sets (a partition)** — a collection of sets where no element belongs to two sets at once. Every element is in exactly one group.

📌 **Interview term: Union-Find / Disjoint Set Union (DSU)** — a data structure that maintains a partition under two operations: **find** (which set is this element in?) and **union** (merge the sets of two elements).

The structure is a **forest**: a group is a tree, and every element points to its parent in that tree. All of it lives in one array:

📌 **Interview term: Parent array** — \`parent[x]\` is the element that \`x\` points to. A root points to itself: \`parent[r] == r\`. Initially every element is its own root, so there are n sets of size 1.

📌 **Interview term: Representative (root)** — the root of a tree, used as the name of the whole set. \`find(x)\` returns it, so \`find(a) == find(b)\` means "a and b are in the same set".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Forest for the sets 0 1 2 3, then 4 alone, 5 and 6, and 7 alone. Root 0 has children 1 and 2, and 2 has child 3. Root 5 has child 6.">
  <defs>
    <marker id="uf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="110" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="138" y="56" text-anchor="middle">0</text>
  <rect class="d-box" x="40" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="68" y="146" text-anchor="middle">1</text>
  <rect class="d-box" x="180" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="146" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="190" width="56" height="40" rx="8"/>
  <text class="d-text" x="208" y="216" text-anchor="middle">3</text>
  <path class="d-edge" d="M 72 118 L 126 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 204 118 L 152 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <path class="d-edge" d="M 208 188 L 208 166" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="320" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="348" y="56" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="440" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="56" text-anchor="middle">5</text>
  <rect class="d-box" x="440" y="120" width="56" height="40" rx="8"/>
  <text class="d-text" x="468" y="146" text-anchor="middle">6</text>
  <path class="d-edge" d="M 468 118 L 468 76" fill="none" marker-end="url(#uf1-arrow)"/>
  <rect class="d-box-accent" x="560" y="30" width="56" height="40" rx="8"/>
  <text class="d-text" x="588" y="56" text-anchor="middle">7</text>
</svg>

The highlighted boxes are roots. Every arrow is one \`parent\` entry pointing up: the array for this picture is \`parent = [0, 0, 0, 2, 4, 5, 5, 7]\`, read as "1 reports to 0, 2 reports to 0, 3 reports to 2", and so on. There are four sets: {0, 1, 2, 3}, {4}, {5, 6} and {7}.

### The two operations

- **find(x):** follow \`parent\` from \`x\` until you reach an element that is its own parent. Return it.
- **union(a, b):** \`ra = find(a)\`, \`rb = find(b)\`. If they are equal, \`a\` and \`b\` are already together: return false. Otherwise make one root the parent of the other (\`parent[rb] = ra\`), decrement the set count, and return true.

That boolean return value is worth keeping: "union returned false" is exactly the signal for "this edge closes a cycle", which several classic problems need.

## 3. Why the Naive Version Is Slow, and the Two Fixes

If \`union\` always hangs the first root under the second, a bad sequence of unions builds a **chain**: 0 points to 1, 1 points to 2, and so on. Then \`find(0)\` walks the whole chain, n - 1 steps, and doing that repeatedly costs O(n) per operation, O(n²) in total. Example 2 below measures exactly this: for n = 1000 the naive version follows 498 501 parent pointers just during the unions.

### Fix 1: union by size (or by rank)

📌 **Interview term: Union by size** — when merging, hang the root of the **smaller** tree under the root of the larger one, and add the sizes. An element only gets one level deeper when its set at least doubles in size, so no tree is taller than log2 n.

📌 **Interview term: Union by rank** — the same idea using an upper bound on tree height ("rank") instead of the element count. Both give the same guarantees; size is handy because it also answers "how big is this group?".

### Fix 2: path compression

📌 **Interview term: Path compression** — after \`find(x)\` has located the root, point every node it walked through **directly at the root**. The next \`find\` on any of them takes one step.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Before path compression the chain is 3 to 2 to 1 to root 0. After find of 3 every node on the path points straight at root 0.">
  <defs>
    <marker id="uf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="24" text-anchor="middle">before find(3)</text>
  <rect class="d-box-accent" x="92" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="92" y="112" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="137" text-anchor="middle">1</text>
  <rect class="d-box" x="92" y="184" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">2</text>
  <rect class="d-box" x="92" y="256" width="56" height="38" rx="8"/>
  <text class="d-text" x="120" y="281" text-anchor="middle">3</text>
  <path class="d-edge" d="M 120 110 L 120 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 182 L 120 156" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge" d="M 120 254 L 120 228" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-dashed" d="M 250 160 L 330 160" fill="none" marker-end="url(#uf2-arrow)"/>
  <text class="d-sub" x="500" y="24" text-anchor="middle">after find(3)</text>
  <rect class="d-box-accent" x="472" y="40" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="65" text-anchor="middle">0</text>
  <rect class="d-box" x="380" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="408" y="195" text-anchor="middle">1</text>
  <rect class="d-box" x="472" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="500" y="195" text-anchor="middle">2</text>
  <rect class="d-box" x="564" y="170" width="56" height="38" rx="8"/>
  <text class="d-text" x="592" y="195" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 414 168 L 488 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 500 168 L 500 84" fill="none" marker-end="url(#uf2-arrow)"/>
  <path class="d-edge-accent" d="M 586 168 L 512 84" fill="none" marker-end="url(#uf2-arrow)"/>
</svg>

On the left, \`find(3)\` takes three steps. While returning, it rewires 3 and 2 to point at 0 (1 already did), so the tree on the right is flat and every later \`find\` on these elements is one step.

📌 **Interview term: Path halving** — a one-pass variant: while walking up, set \`parent[x] = parent[parent[x]]\` (skip to the grandparent). It gives the same asymptotic bound and is a popular one-liner; the [Kruskal vs Prim page](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) uses it.

### How fast is it with both fixes?

📌 **Interview term: Amortised cost** — the average cost per operation over a whole sequence of operations, even if one particular operation is occasionally slower.

📌 **Interview term: Inverse Ackermann function α(n)** — a function that grows so slowly that it is at most 4 for any input size you could ever store. With both optimisations, m operations on n elements take O(m α(n)) time: effectively constant per operation.

That bound is a real theorem, not folklore: it was proved by Robert Tarjan in "Efficiency of a Good But Not Linear Set Union Algorithm", *Journal of the ACM* 22(2), 1975, which also showed it cannot be improved for this algorithm. In an interview, "amortised O(α(n)), which is effectively O(1)" is the expected phrase. With only one of the two fixes the bound is O(log n) per operation.

## 4. The Solution in C++

~~~cpp
struct DSU {
    vector<int> parent, size;
    int count;

    explicit DSU(int n) : parent(n), size(n, 1), count(n) {
        iota(parent.begin(), parent.end(), 0);   // every element starts as its own root
    }

    int find(int x) {
        int root = x;
        while (parent[root] != root) root = parent[root];
        while (parent[x] != root) {   // path compression: point the whole path at the root
            int next = parent[x];
            parent[x] = root;
            x = next;
        }
        return root;
    }

    bool unite(int a, int b) {        // "union" is a C++ keyword, so the method is unite
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;   // already in the same set
        if (size[ra] < size[rb]) swap(ra, rb); // smaller tree under the bigger one
        parent[rb] = ra;
        size[ra] += size[rb];
        --count;
        return true;
    }

    bool connected(int a, int b) { return find(a) == find(b); }
};
~~~

**Why each line is there:**

- \`union\` is a reserved word in C++ (it declares a union type), so the method is called \`unite\`. Trying to name a member function \`union\` is a compile error: g++ reported "expected identifier before '(' token" in a test.
- \`parent(n), size(n, 1)\` in the member initialiser list sizes the vectors; \`std::iota(parent.begin(), parent.end(), 0)\` from \`<numeric>\` fills \`0, 1, 2, ...\` so every element is its own root.
- \`find\` is two loops: walk up to the root, then walk the path again pointing every node at it. Iterative code has no recursion-depth concern at all; a recursive version is common in competitive code and usually fine, but depends on the stack size of the process.
- \`std::swap(ra, rb)\` keeps \`ra\` as the larger root. \`explicit\` on the constructor stops an \`int\` from silently converting into a \`DSU\`.
- Indices are \`int\`; mixing them with \`parent.size()\` (a \`size_t\`) in comparisons triggers sign-compare warnings, which is why loops cast with \`(int)parent.size()\`.

**Elements that are not dense integers.** Map them to indices with \`std::unordered_map<std::string, int>\` first and keep the vectors, which is faster than hashing on every \`find\`:

~~~cpp
unordered_map<string, int> id;
auto idOf = [&](const string& s) {
    auto it = id.find(s);
    if (it != id.end()) return it->second;
    int k = (int)id.size();
    id.emplace(s, k);
    return k;
};
~~~

## 5. Verified: Running the Code

Each example on this page was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same three programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Union-Find with path compression and union by size** prints:

~~~text
start: 8 elements, 8 sets
union(0, 1): merged, sets = 7
union(2, 3): merged, sets = 6
union(1, 3): merged, sets = 5
union(0, 2): already together, sets = 5
union(5, 6): merged, sets = 4
union(6, 5): already together, sets = 4
connected(0, 3) = true
connected(0, 5) = false
size of the set holding 3 = 4
groups: [[0, 1, 2, 3], [4], [5, 6], [7]]
parent array after the finds: [0, 0, 0, 0, 4, 5, 5, 7]
~~~

Reading it: \`union(0, 2)\` returns false because 0 and 2 were already joined through \`1-3\`; the set count only drops on a real merge. The last line is the parent array after \`groups\` called \`find\` on every element: every node of the big set points straight at root 0, which is path compression at work.

**Example 2 — counting parent hops for four variants** prints:

~~~text
star workload, n = 1000:
  naive              union hops   498501 | tallest tree  999 | hops for n finds   499500
  compression only   union hops     1995 | tallest tree  998 | hops for n finds     1997
  size only          union hops        0 | tallest tree    1 | hops for n finds      999
  size + compression union hops        0 | tallest tree    1 | hops for n finds      999
star workload, n = 3000:
  naive              union hops  4495501 | tallest tree 2999 | hops for n finds  4498500
  compression only   union hops     5995 | tallest tree 2998 | hops for n finds     5997
  size only          union hops        0 | tallest tree    1 | hops for n finds     2999
  size + compression union hops        0 | tallest tree    1 | hops for n finds     2999
rounds workload, n = 1024:
  naive              union hops     2026 | tallest tree   10 | hops for n finds     5120
  compression only   union hops     1532 | tallest tree    9 | hops for n finds     2028
  size only          union hops        0 | tallest tree   10 | hops for n finds     5120
  size + compression union hops        0 | tallest tree   10 | hops for n finds     2036
rounds workload, n = 4096:
  naive              union hops     8166 | tallest tree   12 | hops for n finds    24576
  compression only   union hops     6140 | tallest tree   11 | hops for n finds     8168
  size only          union hops        0 | tallest tree   12 | hops for n finds    24576
  size + compression union hops        0 | tallest tree   12 | hops for n finds     8178
~~~

Reading it: on the star workload the naive version is quadratic (498 501 hops for n = 1000, 4 495 501 for n = 3000, about nine times more for three times the input). Union by size keeps the star flat: tallest tree 1. On the rounds workload union by size still lets trees grow, but only to log2 n (10 for 1024, 12 for 4096), and adding compression cuts the cost of the final finds from 24 576 hops to 8 178.

**Example 3 — three classic problems** prints:

~~~text
2
5
1
[2, 3]
[1, 4]
20
-1
~~~

Each line matches the comment next to it in the code. The redundant edge \`[1, 4]\` is the first edge whose two ends already had the same root. The connection log becomes fully connected at time 20, not 40, once the events are sorted by time.

## 6. Complexity

| Variant | find / union | Space | Why |
| :--- | :--- | :--- | :--- |
| Naive linking, no compression | O(n) worst case | O(n) | a bad union order builds a chain of height n - 1 (Example 2: tallest tree 999 for n = 1000) |
| Union by size only | O(log n) | O(n) | a node gets deeper only when its set doubles, so height is at most log2 n (Example 2: 10 for n = 1024) |
| Path compression only | O(log n) amortised | O(n) | each long walk flattens the path it used |
| Size + compression | O(α(n)) amortised, effectively O(1) | O(n) | Tarjan, JACM 1975 |
| Building it | O(n) | O(n) | one parent entry and one size entry per element |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table. Example 2 shows the gap concretely: on the "star" workload with n = 3000 the naive version follows 4 495 501 parent pointers during the unions alone; with union by size it follows none.

## 7. Where Union-Find Is the Right Tool (and Where It Is Not)

Union-Find shines when the edges arrive **one at a time** and you keep asking "are these two connected yet?":

- **Counting connected components** in an undirected graph: start with n sets, union every edge, read the count. Compare it with DFS and BFS on [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and on [number of islands: DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Cycle detection in an undirected graph**: an edge whose two ends already share a root closes a cycle. That is the "redundant connection" problem in Example 3.
- **Kruskal's minimum spanning tree**: take edges cheapest first, keep an edge only when \`union\` returns true. See [Kruskal vs Prim](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms).
- **Dynamic connectivity over time**: "at what moment did everyone become connected?" Sort the events by time and stop when the count reaches 1 (also in Example 3).
- **Grouping by equivalence**: accounts that share an email, synonyms, pixels of the same colour region.

What it **cannot** do:

- **Split** a set or delete an edge. Unions are one-way. (Offline tricks exist, such as processing deletions in reverse as additions, but plain DSU has no "un-union".)
- **Directed graphs.** Union-Find ignores direction, so it cannot detect a directed cycle or find strongly connected components. For those, use DFS: see [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) and [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Paths.** It answers "connected or not", not "how" or "how far". For a route, use [BFS or DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

## 8. Edge Cases

- **union(x, x):** \`find\` returns the same root twice, so it returns false and the count does not change.
- **Repeating a union** (\`union(5, 6)\` then \`union(6, 5)\`): the second call returns false. Example 1 shows it.
- **n = 0 or no unions at all:** the count is n; every element is its own set.
- **Elements that are not 0..n-1** (strings, coordinates, huge ids): map them to indices first, or use a hash map for \`parent\` and create entries lazily.
- **Grid cells:** use the index \`r * cols + c\`, as in [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).
- **The size array is only valid at roots:** \`size[find(x)]\` is the size of x's set; \`size[x]\` for a non-root is stale.

## Common Pitfalls

- **Naming the method \`union\`.** It is a keyword; the code will not compile. \`unite\` or \`merge\` are the usual names.
- **Recursive \`find\` without union by size.** Fine on shallow trees, but a long chain recurses n deep; whether that crashes depends on the stack limit of the process. The iterative version has no such dependence.
- **\`std::vector<int> parent(n)\` without initialising it.** It is all zeros, so every element "belongs" to element 0. Call \`std::iota\` (or loop) to make each element its own root.
- **Comparing parents instead of roots.** \`parent[a] == parent[b]\` is not "same set"; compare \`find(a) == find(b)\`.
- **Signed / unsigned mix-ups.** \`parent.size()\` is \`size_t\`; comparing it with an \`int\` index warns, and \`size() - 1\` on an empty vector wraps around to a huge number.
- **Treating Union-Find as a directed structure.** It ignores direction, so it cannot detect a directed cycle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A forest in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt; parent</code>: each set is a tree, its root names the set. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> climbs to the root; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unite</code> links one root under another and returns whether it merged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fix 1:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Union by size</strong>: hang the smaller tree under the bigger root, so no tree is taller than log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fix 2:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Path compression</strong>: after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, point every visited node at the root, so the next lookup is one step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">With both, amortised O(α(n)) per operation (Tarjan 1975), effectively O(1); two vectors of size n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code> is a keyword so the method is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unite</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::iota</code> initialises the parents; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap</code> for union by size; map other key types to indices with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count the groups?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int count = n</code> and decrement on every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unite</code> that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a cycle in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> before uniting, the edge closes a cycle. Not valid for directed graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">find</code> be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with path compression, because it writes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code>. Some code marks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mutable</code> to allow a logically const <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete an edge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a plain DSU. If deletions are known in advance, replay the timeline backwards so they become unions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS is O(V + E) per query on a fixed graph; with a query after each new edge, DSU is near O(1) per operation.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Disjoint sets** | groups with no shared elements; each element is in exactly one |
| **Union-Find / DSU** | structure supporting find (which set?) and union (merge two sets) |
| **Parent array** | \`parent[x]\` is the element x points to; a root points to itself |
| **Representative (root)** | the element that names a set; \`find\` returns it |
| **Union by size** | hang the smaller tree under the larger root; height stays at most log2 n |
| **Union by rank** | the same idea using a height bound instead of a count |
| **Path compression** | after a find, point every visited node straight at the root |
| **Path halving** | while walking up, skip each node to its grandparent |
| **Amortised cost** | average cost per operation over a whole sequence |
| **Inverse Ackermann α(n)** | an incredibly slow-growing function, at most 4 in practice |
| **\`std::iota\`** | fills a range with 0, 1, 2, ...; used to make every element its own root |

---
**Conclusion:** Union-Find keeps a partition as a forest in one parent array: \`find\` climbs to the root that names a set, and union links two roots. On its own that can degrade into long chains, but union by size keeps trees at most log2 n tall and path compression flattens every path it walks, and together they make each operation amortised O(α(n)), effectively constant. That is why it is the standard tool for connectivity that grows edge by edge: components, undirected cycle detection, Kruskal's algorithm and grouping problems. In C++ the practical marks are calling the method \`unite\` (since \`union\` is a keyword), initialising parents with \`std::iota\`, and keeping indices as \`int\` consistently.
`,
        examples: [
          { label: `Union-Find with path compression and union by size`, code: `#include <algorithm>
#include <iostream>
#include <map>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

// Union-Find with path compression and union by size.
struct DSU {
    vector<int> parent, size;
    int count;

    explicit DSU(int n) : parent(n), size(n, 1), count(n) {
        iota(parent.begin(), parent.end(), 0);   // every element starts as its own root
    }

    int find(int x) {
        int root = x;
        while (parent[root] != root) root = parent[root];
        while (parent[x] != root) {   // path compression: point the whole path at the root
            int next = parent[x];
            parent[x] = root;
            x = next;
        }
        return root;
    }

    bool unite(int a, int b) {        // "union" is a C++ keyword, so the method is unite
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;   // already in the same set
        if (size[ra] < size[rb]) swap(ra, rb); // smaller tree under the bigger one
        parent[rb] = ra;
        size[ra] += size[rb];
        --count;
        return true;
    }

    bool connected(int a, int b) { return find(a) == find(b); }
};

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

string fmt(const vector<vector<int>>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + fmt(v[i]);
    return s + "]";
}

int main() {
    int n = 8;
    DSU d(n);
    cout << boolalpha;
    cout << "start: " << n << " elements, " << d.count << " sets\\n";
    vector<pair<int, int>> ops = {{0, 1}, {2, 3}, {1, 3}, {0, 2}, {5, 6}, {6, 5}};
    for (auto [a, b] : ops) {
        bool merged = d.unite(a, b);
        cout << "union(" << a << ", " << b << "): " << (merged ? "merged" : "already together") << ", sets = " << d.count << "\\n";
    }
    cout << "connected(0, 3) = " << d.connected(0, 3) << "\\n";
    cout << "connected(0, 5) = " << d.connected(0, 5) << "\\n";
    cout << "size of the set holding 3 = " << d.size[d.find(3)] << "\\n";
    map<int, vector<int>> byRoot;
    for (int x = 0; x < n; ++x) byRoot[d.find(x)].push_back(x);
    vector<vector<int>> groups;
    for (auto& kv : byRoot) groups.push_back(kv.second);
    sort(groups.begin(), groups.end(), [](const vector<int>& g, const vector<int>& h) { return g[0] < h[0]; });
    cout << "groups: " << fmt(groups) << "\\n";
    cout << "parent array after the finds: " << fmt(d.parent) << "\\n";
}
` },
          { label: `Counting parent hops: naive vs compression vs union by size`, code: `#include <cstdio>
#include <iostream>
#include <numeric>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Count parent-pointer hops for four Union-Find variants on the same workloads.
struct CountingDSU {
    vector<int> parent, size;
    bool compress, bySize;
    long long hops = 0;

    CountingDSU(int n, bool compress, bool bySize) : parent(n), size(n, 1), compress(compress), bySize(bySize) {
        iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        int root = x;
        while (parent[root] != root) { root = parent[root]; ++hops; }
        if (compress) {
            while (parent[x] != root) { int next = parent[x]; parent[x] = root; x = next; }
        }
        return root;
    }

    void unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (bySize && size[ra] < size[rb]) swap(ra, rb);
        if (bySize) {               // smaller tree goes under the bigger root
            parent[rb] = ra;
            size[ra] += size[rb];
        } else {                    // naive: always hang a's root under b's root
            parent[ra] = rb;
        }
    }

    int height() const {
        int best = 0;
        for (int x = 0; x < (int)parent.size(); ++x) {
            int depth = 0, y = x;
            while (parent[y] != y) { y = parent[y]; ++depth; }
            best = max(best, depth);
        }
        return best;
    }
};

vector<pair<int, int>> star(int n) {      // union(0, i) for i = 1 .. n-1
    vector<pair<int, int>> ops;
    for (int i = 1; i < n; ++i) ops.push_back({0, i});
    return ops;
}

vector<pair<int, int>> rounds(int n) {    // merge pairs, then pairs of pairs, ...
    vector<pair<int, int>> ops;
    for (int step = 1; step < n; step *= 2)
        for (int i = 0; i < n - step; i += 2 * step) ops.push_back({i, i + step});
    return ops;
}

int main() {
    const char* names[] = {"naive", "compression only", "size only", "size + compression"};
    bool flags[4][2] = {{false, false}, {true, false}, {false, true}, {true, true}};
    string labels[] = {"star", "star", "rounds", "rounds"};
    int sizes[] = {1000, 3000, 1024, 4096};
    for (int w = 0; w < 4; ++w) {
        int n = sizes[w];
        cout << labels[w] << " workload, n = " << n << ":\\n";
        auto ops = labels[w] == "star" ? star(n) : rounds(n);
        for (int v = 0; v < 4; ++v) {
            CountingDSU d(n, flags[v][0], flags[v][1]);
            for (auto [a, b] : ops) d.unite(a, b);
            long long unionHops = d.hops;
            int tallest = d.height();
            d.hops = 0;
            for (int x = 0; x < n; ++x) d.find(x);
            printf("  %-19sunion hops %8lld | tallest tree %4d | hops for n finds %8lld\\n", names[v], unionHops, tallest, d.hops);
        }
    }
}
` },
          { label: `Three classic problems: components, redundant edge, earliest connection`, code: `#include <algorithm>
#include <array>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

// Three classic Union-Find interview problems on one small DSU.
struct DSU {
    vector<int> parent, size;
    int count;

    explicit DSU(int n) : parent(n), size(n, 1), count(n) { iota(parent.begin(), parent.end(), 0); }

    int find(int x) {
        int root = x;
        while (parent[root] != root) root = parent[root];
        while (parent[x] != root) { int next = parent[x]; parent[x] = root; x = next; }
        return root;
    }

    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (size[ra] < size[rb]) swap(ra, rb);
        parent[rb] = ra;
        size[ra] += size[rb];
        --count;
        return true;
    }
};

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

int countComponents(int n, const vector<array<int, 2>>& edges) {
    DSU d(n);
    for (auto [a, b] : edges) d.unite(a, b);
    return d.count;
}

vector<int> redundantEdge(const vector<array<int, 2>>& edges) {
    // vertices are 1..n; the edge that closes a cycle is the answer
    DSU d((int)edges.size() + 1);
    for (auto [a, b] : edges) if (!d.unite(a, b)) return {a, b};
    return {};
}

int earliestAllConnected(int n, vector<array<int, 3>> logs) {   // by value: we sort a copy
    DSU d(n);
    sort(logs.begin(), logs.end());
    for (auto [t, a, b] : logs) {
        d.unite(a, b);
        if (d.count == 1) return t;
    }
    return -1;
}

int main() {
    cout << countComponents(5, {{0, 1}, {1, 2}, {3, 4}}) << "\\n"; // 2
    cout << countComponents(5, {}) << "\\n"; // 5
    cout << countComponents(4, {{0, 1}, {1, 2}, {2, 0}, {2, 3}}) << "\\n"; // 1
    cout << fmt(redundantEdge({{1, 2}, {1, 3}, {2, 3}})) << "\\n"; // [2, 3]
    cout << fmt(redundantEdge({{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}})) << "\\n"; // [1, 4]
    cout << earliestAllConnected(4, {{20, 0, 1}, {5, 2, 3}, {9, 1, 2}, {40, 0, 3}}) << "\\n"; // 20
    cout << earliestAllConnected(4, {{1, 0, 1}, {2, 2, 3}}) << "\\n"; // -1
}
` },
        ],
      },
    },
  },
  {
    title: `What is the difference between Kruskal's and Prim's MST algorithms?`,
    difficulty: "hard",
    seoDescription: `Kruskal vs Prim for minimum spanning trees in Python, JavaScript, Java and C++: edge-first vs vertex-first, cut property, sparse vs dense costs.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Both Kruskal's and Prim's algorithms find a minimum spanning tree. How does each one work, why are both correct, and which would you pick for a given graph? Please implement both in Python."

**What a strong answer should cover:**
- The goal: a minimum spanning tree connects all V vertices with V - 1 edges of minimum total weight, for a connected, undirected, weighted graph.
- Kruskal is edge-first: sort all edges, take each one that joins two different components (checked with union-find), O(E log E).
- Prim is vertex-first: grow one tree from a start vertex, always adding the cheapest edge that leaves it, using a min-heap, O(E log V); an O(V²) array version suits dense graphs.
- Why both are correct: the cut property (the cheapest edge across any cut is safe); and the practical differences: sparse vs dense, edge list vs adjacency list, a spanning forest for disconnected graphs (Kruskal) vs one component (Prim).
- Python specifics: \`sorted(edges, key=...)\` for Kruskal, \`heapq\` (a min-heap) of \`(weight, vertex, from)\` tuples for Prim, and the tie trap: tuples compare element by element, so a non-comparable payload in a tuple raises \`TypeError\` on equal weights.

**Clarifying questions expected:**
- "Is the graph connected, and if not, do you want a spanning forest?"
- "How is the graph given: an edge list or an adjacency list? Roughly how many edges per vertex?"

**Code / implementation expected:** Yes — both in Python: Kruskal with a small union-find, and lazy Prim with \`heapq\`.`,
        answer: `**Target Audience:** Interview candidates who know what a graph and a heap are; minimum spanning trees are explained from scratch
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Six villages want to be connected by roads so that anyone can drive from any village to any other. A contractor has quoted a price for every possible road. Building all of them is wasteful: you only need enough roads that everything is connected, and you want the cheapest such set.

Two planners attack it differently.

**Planner K** spreads every quote on a big table and sorts them from cheapest to most expensive. Going down the list, she approves a road unless the two villages it joins are already connected by roads she has approved; that road would be redundant. She stops once every village is connected.

**Planner P** starts at the town hall's village. She looks at every road that leaves "the villages we have connected so far" and builds the cheapest one. That pulls a new village into the network, which opens up new roads to look at. She repeats until every village is in.

Both planners end with the same total cost. That is not luck; there is a short proof behind it, and knowing *how* they differ (global sort versus growing outward) is exactly what interviewers probe when they ask "Kruskal or Prim?".

## 2. What a Minimum Spanning Tree Is

📌 **Interview term: Spanning tree** — a subset of a graph's edges that connects all V vertices and has no cycle. It always has exactly V - 1 edges.

📌 **Interview term: Minimum spanning tree (MST)** — a spanning tree whose total edge weight is as small as possible. It is defined for **undirected**, weighted, connected graphs. (The directed version, a minimum arborescence, needs a different algorithm.)

📌 **Interview term: Minimum spanning forest** — for a disconnected graph, one minimum spanning tree per connected component.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Six vertices with weighted edges. The minimum spanning tree edges 1 to 2 weight 1, 1 to 3 weight 2, 3 to 4 weight 2, 0 to 2 weight 3 and 3 to 5 weight 5 are highlighted, total 13.">
  <rect class="d-box" x="40" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="70" y="157" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="57" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="267" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="420" y="157" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="267" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="57" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 96 136 L 212 66" fill="none"/>
  <text class="d-sub" x="140" y="88" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 96 168 L 212 248" fill="none"/>
  <text class="d-text d-accent" x="140" y="228" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 76 L 240 238" fill="none"/>
  <text class="d-text d-accent" x="256" y="162" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 268 66 L 392 140" fill="none"/>
  <text class="d-text d-accent" x="330" y="88" text-anchor="middle">2</text>
  <path class="d-edge-dashed" d="M 268 250 L 392 166" fill="none"/>
  <text class="d-sub" x="340" y="226" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 448 166 L 562 250" fill="none"/>
  <text class="d-text d-accent" x="500" y="226" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 448 140 L 562 64" fill="none"/>
  <text class="d-text d-accent" x="500" y="88" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 590 76 L 590 238" fill="none"/>
  <text class="d-sub" x="608" y="162" text-anchor="middle">6</text>
  <path class="d-edge-dashed" d="M 272 268 L 556 266" fill="none"/>
  <text class="d-sub" x="414" y="290" text-anchor="middle">7</text>
</svg>

This is the graph used in Example 1. The highlighted edges (weights 1, 2, 2, 3 and 5) are its minimum spanning tree, total 13. The dashed edges (4, 4, 6 and 7) are left out: each one would join two vertices that the highlighted edges already connect.

## 3. Why Greedy Works: the Cut Property

Both algorithms are **greedy**: they commit to the locally cheapest choice and never undo it. That is only safe because of one fact.

📌 **Interview term: Cut** — a split of the vertices into two non-empty groups. An edge **crosses** the cut if its two ends are in different groups.

📌 **Interview term: Cut property** — for any cut, the cheapest edge crossing it belongs to some minimum spanning tree. (If the cheapest crossing edge is unique, it belongs to every MST.) Proof sketch: take an MST without that edge, add it, and you get a cycle; that cycle must cross the cut a second time through a more expensive edge; swap them and the total does not go up.

📌 **Interview term: Cycle property** — the most expensive edge on any cycle is not needed (with distinct weights, it is in no MST). This is why skipping an edge that would close a cycle is safe.

- **Prim** applies the cut property literally: the cut is "the tree so far" versus "everything else", and it takes the cheapest crossing edge.
- **Kruskal** applies it implicitly: when it accepts edge (u, v), u and v are in different components; cut u's component from the rest, and since edges are taken in weight order, nothing cheaper crosses that cut.

📌 **Interview term: Greedy algorithm** — builds a solution step by step, always taking the best-looking option now. Greedy is correct only when a property like the cut property guarantees it.

## 4. The Two Algorithms Side by Side

### Kruskal: edges first, globally

1. Sort all edges by weight.
2. Start with every vertex in its own component ([Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure)).
3. For each edge (u, v) in order: if \`find(u) != find(v)\`, take it and \`union(u, v)\`; otherwise skip it (it would close a cycle).
4. Stop after V - 1 edges, or when the list runs out (then you have a spanning forest).

📌 **Interview term: Kruskal's algorithm** — the sorted-edges method above, published by Joseph Kruskal in "On the shortest spanning subtree of a graph and the traveling salesman problem", *Proceedings of the AMS* 7(1), 1956.

### Prim: one tree, growing outward

1. Mark a start vertex as "in the tree" and push every edge leaving it into a min-heap keyed by weight.
2. Pop the cheapest edge. If its far end is already in the tree, discard it. Otherwise add that vertex, add the weight, and push the vertex's edges to vertices not yet in the tree.
3. Repeat until the heap is empty.

📌 **Interview term: Prim's algorithm** — the grow-one-tree method above. It was described by Vojtěch Jarník in 1930 and independently by Robert Prim in the *Bell System Technical Journal* in 1957 (and again by Dijkstra in 1959), which is why it is also called the Jarník–Prim or DJP algorithm.

📌 **Interview term: Lazy deletion (stale entries)** — instead of updating a heap entry when a cheaper edge to the same vertex appears, push a new entry and **skip** old ones when they are popped. Simple, and the heap holds at most E entries. The eager alternative uses a decrease-key operation, which most standard library heaps do not offer.

Prim's loop looks almost identical to [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work). The one difference: Dijkstra keys the heap by **distance from the source** (\`dist[u] + w\`), Prim keys it by **the edge weight alone** (\`w\`). Mixing them up is a classic bug.

| | Kruskal | Prim (binary heap) |
| :--- | :--- | :--- |
| Grows | a forest of components that merge | a single tree from a start vertex |
| Main data structure | sorted edge list + union-find | adjacency list + min-heap |
| Picks next | the globally cheapest remaining edge | the cheapest edge leaving the tree |
| Time | O(E log E), which equals O(E log V) | O(E log V) |
| Best when | the graph is sparse, or given as an edge list | the graph is dense or given as adjacency lists |
| Disconnected graph | returns a minimum spanning forest | spans only the start vertex component |
| Can stop early | after V - 1 accepted edges | after V vertices are in the tree |

For **dense** graphs (E close to V²), the heap-free Prim that scans an array of "cheapest known edge to each vertex" runs in O(V²), which beats both heap-based versions there. Example 2 runs all three.

## 5. Both Algorithms in Python

### Kruskal

~~~python
def find(parent, x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path halving: skip to the grandparent
        x = parent[x]
    return x
~~~

~~~python
def kruskal(n, edges):
    parent = list(range(n))
    total, taken = 0, []
    for u, v, w in sorted(edges, key=lambda e: (e[2], e[0], e[1])):
        ru, rv = find(parent, u), find(parent, v)
        if ru == rv:
            print("  skip " + str(u) + "-" + str(v) + " (w=" + str(w) + "): both ends already connected")
            continue
        parent[ru] = rv
        total += w
        taken.append((u, v))
        print("  take " + str(u) + "-" + str(v) + " (w=" + str(w) + ")")
        if len(taken) == n - 1:
            break                        # a spanning tree has exactly n - 1 edges
    return total, len(taken)
~~~

- \`sorted(edges, key=lambda e: (e[2], e[0], e[1]))\` sorts by weight and breaks ties by the endpoints, so the trace is reproducible. \`sorted\` returns a new list and leaves the input alone; \`edges.sort(...)\` would sort in place.
- \`find\` uses **path halving** (\`parent[x] = parent[parent[x]]\`), a one-loop form of path compression. Kruskal does not need union by size to be fast in practice, because the sort already costs O(E log E).
- The early \`break\` at n - 1 accepted edges skips the rest of the list: the trace stops before ever looking at the edges of weight 6 and 7.

### Prim (lazy, with heapq)

~~~python
def prim(n, edges, start):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    seen = [False] * n
    seen[start] = True
    heap = [(w, v, start) for v, w in adj[start]]
    heapq.heapify(heap)                  # heapq is a min-heap: smallest tuple first
    total, count = 0, 0
    while heap:
        w, v, frm = heapq.heappop(heap)
        if seen[v]:
            print("  stale " + str(frm) + "-" + str(v) + " (w=" + str(w) + "): " + str(v) + " already in the tree")
            continue
        seen[v] = True
        total += w
        count += 1
        print("  add " + str(v) + " via " + str(frm) + "-" + str(v) + " (w=" + str(w) + ")")
        for nxt, nw in adj[v]:
            if not seen[nxt]:
                heapq.heappush(heap, (nw, nxt, v))
    return total, count
~~~

- \`heapq\` turns a plain list into a **min-heap**: \`heap[0]\` is always the smallest item, and \`heappush\` / \`heappop\` are O(log n) (Python docs, \`heapq\` module). \`heapify\` builds the starting heap in O(n).
- Entries are tuples \`(weight, vertex, from)\`. Tuples compare element by element, so equal weights are broken by the vertex number. If the tuple held something that cannot be compared (a node object, a dict), an equal weight would make Python compare those objects and raise \`TypeError: '<' not supported\`, which a test run confirmed; put a counter or an index second in the tuple to avoid it.
- \`if seen[v]: continue\` is the lazy deletion. Python's \`heapq\` has no decrease-key, so lazy deletion is the idiomatic Python Prim.

## 6. Verified: Running the Code

Each example on this page was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kruskal and Prim traced on the same graph** prints:

~~~text
Kruskal (edges sorted by weight):
  take 1-2 (w=1)
  take 1-3 (w=2)
  take 3-4 (w=2)
  take 0-2 (w=3)
  skip 0-1 (w=4): both ends already connected
  skip 2-3 (w=4): both ends already connected
  take 3-5 (w=5)
Kruskal total = 13 using 5 edges
Prim from vertex 0 (min-heap of crossing edges):
  add 2 via 0-2 (w=3)
  add 1 via 2-1 (w=1)
  add 3 via 1-3 (w=2)
  add 4 via 3-4 (w=2)
  stale 0-1 (w=4): 1 already in the tree
  stale 2-3 (w=4): 3 already in the tree
  add 5 via 3-5 (w=5)
  stale 4-5 (w=6): 5 already in the tree
  stale 2-4 (w=7): 4 already in the tree
Prim total = 13 using 5 edges
Disconnected graph, Kruskal:
  take 0-2 (w=1)
  take 0-1 (w=2)
  skip 1-2 (w=3): both ends already connected
  take 3-4 (w=5)
forest total = 8, edges = 3 (a tree would need 4)
Disconnected graph, Prim from 0:
  add 2 via 0-2 (w=1)
  add 1 via 0-1 (w=2)
  stale 2-1 (w=3): 1 already in the tree
Prim reached 3 of 5 vertices, total = 3
~~~

Reading it: Kruskal takes the four cheapest edges, skips 0-1 and 2-3 because their ends are already connected, takes 3-5 and stops at 5 edges without ever looking at weights 6 and 7. Prim adds the vertices in the order 2, 1, 3, 4, 5, and its "stale" lines are heap entries for vertices that had already joined the tree. Both pick the same five edges and total 13. On the disconnected graph, Kruskal returns a forest of 3 edges (weight 8) while Prim from 0 only reaches its own component.

**Example 2 — three MST algorithms on a sparse and a dense random graph** prints:

~~~text
sparse graph: V=1000, E=3000
  Kruskal     weight 195702 | sorted 3000 edges, examined 2918
  Prim heap   weight 195702 | 3001 heap pushes, 2001 stale pops
  Prim array  weight 195702 | 1000000 scan steps
  all three agree: true
dense graph: V=300, E=44850
  Kruskal     weight 1320 | sorted 44850 edges, examined 1173
  Prim heap   weight 1320 | 44851 heap pushes, 44551 stale pops
  Prim array  weight 1320 | 90000 scan steps
  all three agree: true
~~~

Reading it: all three algorithms agree on the weight every time. On the dense graph Kruskal must sort all 44 850 edges but only examines 1173 of them before it has 299 tree edges; the heap version pushes nearly every edge (44 851 pushes) and discards 44 551 of them as stale; the array version does 90 000 cheap scan steps and no heap work. On the sparse graph the picture flips: the array version's V² = 1 000 000 steps are far more than the heap's 3001 pushes.

## 7. Complexity

| Algorithm | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kruskal | O(E log E) | O(V + E) | the sort dominates; union-find operations are near O(1) each |
| Prim, lazy binary heap | O(E log E) = O(E log V) | O(V + E) | every edge can be pushed once, each push and pop is O(log E) |
| Prim, eager with decrease-key | O(E log V) | O(V) heap | at most V heap entries; needs an indexed heap |
| Prim, adjacency matrix and array | O(V²) | O(V²) matrix | V rounds, each scans V vertices; no heap at all |

log E and log V differ by at most a factor of 2, because E is at most V², so O(E log E) and O(E log V) are the same class. Example 2 makes the costs concrete: on the sparse graph (V = 1000, E = 3000) the array version needs 1 000 000 scan steps while the heap does 3001 pushes; on the dense graph (V = 300, E = 44 850) the array needs only 90 000 steps while the heap does 44 851 pushes, each costing a logarithmic number of swaps. See [Big-O notation](/interview-question/what-is-big-o-notation) and [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).

## 8. Which One Should You Pick?

- **Edge list given, sparse graph** (roads, cables, most interview inputs): **Kruskal**. Sorting is one library call and union-find is ten lines.
- **Dense graph or an adjacency matrix** (all pairs of points, as in "minimum cost to connect all points"): **Prim with an array**, O(V²), and no edge list of size V² has to be built and sorted.
- **Adjacency lists, medium density**: Prim with a heap; it never sorts all edges at once.
- **The graph may be disconnected**: Kruskal gives the minimum spanning forest for free; Prim must be restarted from each unvisited vertex.
- **Edges arrive over time** and you need the forest so far: Kruskal's union-find structure handles additions naturally if the edges arrive in sorted order.

Both return the same **total weight**. When several edges share a weight, they may return different edge sets, all equally minimal. If every weight is distinct, the MST is unique and both return exactly the same edges.

## 9. Edge Cases

- **One vertex, no edges:** the MST is empty, total 0.
- **Disconnected graph:** Kruskal accepts fewer than V - 1 edges (Example 1: 3 edges for 5 vertices); Prim reaches only part of the graph (3 of 5). Decide with the interviewer whether that is an error or a forest.
- **Parallel edges between the same pair:** both algorithms handle them; the cheaper one wins, the other is skipped as a cycle or a stale entry.
- **Self-loops:** Kruskal skips them because both ends have the same root; Prim skips them because the end is already in the tree.
- **Negative weights:** allowed. Unlike Dijkstra, MST algorithms only compare weights, so negative values are fine.
- **Equal weights:** the total is still minimal, but the chosen edges depend on tie-breaking. The examples break ties by vertex numbers so that every language prints the same trace.

## Common Pitfalls

- **Keying Prim's heap by distance** (\`dist + w\`) instead of the edge weight \`w\`. That is Dijkstra and gives a shortest-path tree, not an MST.
- **Non-comparable items in heap tuples.** \`(w, node_object)\` raises \`TypeError\` when two weights tie. Use \`(w, index)\` or \`(w, counter, obj)\`.
- **Forgetting the visited check when popping** in lazy Prim: a vertex gets added twice and the total is too large.
- **Using Kruskal without union-find**, for example running a DFS per edge to test connectivity: O(E · V) instead of O(E log E).
- **Assuming the graph is connected.** Check that Kruskal accepted n - 1 edges, or that Prim visited all n vertices, before returning a "tree".
- **Sorting the caller's list in place** with \`edges.sort()\` when they did not expect it; \`sorted(...)\` makes a copy.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Goal:</strong> <span style="color:#f0e2c8;">An MST connects all V vertices with V - 1 edges of minimum total weight, on an undirected weighted graph.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kruskal:</strong> <span style="color:#f0e2c8;">Sort edges with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(..., key=...)</code>; take each edge whose ends have different union-find roots. O(E log E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prim:</strong> <span style="color:#f0e2c8;">Grow one tree from a start vertex with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(w, v)</code>; skip popped entries whose vertex is already in. O(E log V).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why correct:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">cut property</strong>: the cheapest edge crossing any cut is safe, so greedy choices never need undoing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use which:</strong> <span style="color:#f0e2c8;">Kruskal for sparse edge lists or a forest; Prim for adjacency lists, and the O(V²) array Prim for dense graphs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do they always return the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same total weight, always. The same edges only when all weights are distinct; with ties, tie-breaking decides.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is Prim different from Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, different key: Prim uses the edge weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, Dijkstra uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about negative weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fine for both: MST algorithms only compare weights, they never add them up along paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why lazy deletion in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> has no decrease-key, so I push a new entry and skip stale ones; the heap holds at most E entries, still O(E log V).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Maximum spanning tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort descending in Kruskal, or push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-w</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> for Prim.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Spanning tree** | V - 1 edges that connect every vertex, with no cycle |
| **Minimum spanning tree (MST)** | the spanning tree with the smallest total weight |
| **Minimum spanning forest** | one MST per connected component of a disconnected graph |
| **Cut** | a split of the vertices into two groups; crossing edges join the groups |
| **Cut property** | the cheapest edge across any cut is safe to take |
| **Cycle property** | the heaviest edge on a cycle is never needed |
| **Greedy algorithm** | always takes the best-looking option now, never undoes it |
| **Kruskal's algorithm** | sort edges, take each one that joins two components |
| **Prim's algorithm** | grow one tree, always adding the cheapest edge leaving it |
| **Lazy deletion (stale entries)** | push duplicates into the heap and skip outdated ones when popped |
| **\`heapq\`** | standard-library functions that keep a list as a min-heap |

---
**Conclusion:** Kruskal and Prim solve the same problem with the same guarantee, the cut property, from opposite directions. Kruskal looks at edges globally: sort them, then let union-find reject every edge that would close a cycle. Prim looks outward from one tree: a min-heap hands it the cheapest edge leaving the tree, and stale entries are skipped. Both are O(E log V); Kruskal suits sparse edge lists and disconnected graphs, Prim suits adjacency lists, and its heap-free O(V²) form wins on dense graphs. In Python, Kruskal is \`sorted\` plus a ten-line union-find, and Prim is \`heapq\` with lazy deletion; keep heap tuples comparable.
`,
        examples: [
          { label: `Kruskal and Prim traced on the same graph, plus a disconnected graph`, code: `import heapq

# Kruskal and Prim on the same weighted undirected graph, with a trace of every decision.
N = 6
EDGES = [(0, 1, 4), (0, 2, 3), (1, 2, 1), (1, 3, 2), (2, 3, 4), (3, 4, 2), (3, 5, 5), (4, 5, 6), (2, 4, 7)]


def find(parent, x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path halving: skip to the grandparent
        x = parent[x]
    return x


def kruskal(n, edges):
    parent = list(range(n))
    total, taken = 0, []
    for u, v, w in sorted(edges, key=lambda e: (e[2], e[0], e[1])):
        ru, rv = find(parent, u), find(parent, v)
        if ru == rv:
            print("  skip " + str(u) + "-" + str(v) + " (w=" + str(w) + "): both ends already connected")
            continue
        parent[ru] = rv
        total += w
        taken.append((u, v))
        print("  take " + str(u) + "-" + str(v) + " (w=" + str(w) + ")")
        if len(taken) == n - 1:
            break                        # a spanning tree has exactly n - 1 edges
    return total, len(taken)


def prim(n, edges, start):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    seen = [False] * n
    seen[start] = True
    heap = [(w, v, start) for v, w in adj[start]]
    heapq.heapify(heap)                  # heapq is a min-heap: smallest tuple first
    total, count = 0, 0
    while heap:
        w, v, frm = heapq.heappop(heap)
        if seen[v]:
            print("  stale " + str(frm) + "-" + str(v) + " (w=" + str(w) + "): " + str(v) + " already in the tree")
            continue
        seen[v] = True
        total += w
        count += 1
        print("  add " + str(v) + " via " + str(frm) + "-" + str(v) + " (w=" + str(w) + ")")
        for nxt, nw in adj[v]:
            if not seen[nxt]:
                heapq.heappush(heap, (nw, nxt, v))
    return total, count


print("Kruskal (edges sorted by weight):")
k_total, k_edges = kruskal(N, EDGES)
print("Kruskal total = " + str(k_total) + " using " + str(k_edges) + " edges")
print("Prim from vertex 0 (min-heap of crossing edges):")
p_total, p_edges = prim(N, EDGES, 0)
print("Prim total = " + str(p_total) + " using " + str(p_edges) + " edges")

# A graph in two pieces: Kruskal returns a spanning forest, Prim only spans the start piece.
FOREST = [(0, 1, 2), (1, 2, 3), (0, 2, 1), (3, 4, 5)]
print("Disconnected graph, Kruskal:")
f_total, f_edges = kruskal(5, FOREST)
print("forest total = " + str(f_total) + ", edges = " + str(f_edges) + " (a tree would need 4)")
print("Disconnected graph, Prim from 0:")
g_total, g_edges = prim(5, FOREST, 0)
print("Prim reached " + str(g_edges + 1) + " of 5 vertices, total = " + str(g_total))
` },
          { label: `Three MST algorithms agree; their work on sparse vs dense graphs`, code: `import heapq

# Same MST weight from three algorithms, and how much work each does on a sparse vs a dense graph.
seed = 12345


def rand():
    global seed
    seed = seed * 48271 % 2147483647    # small LCG, identical in every language
    return seed


def sparse_graph(n, m):
    edges = []
    for v in range(1, n):                # a random tree first, so the graph is connected
        edges.append((rand() % v, v, rand() % 1000 + 1))
    while len(edges) < m:
        u, v = rand() % n, rand() % n
        if u != v:
            edges.append((min(u, v), max(u, v), rand() % 1000 + 1))
    return edges


def dense_graph(n):
    return [(u, v, rand() % 1000 + 1) for u in range(n) for v in range(u + 1, n)]


def kruskal(n, edges):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = taken = examined = 0
    for u, v, w in sorted(edges, key=lambda e: (e[2], e[0], e[1])):
        examined += 1
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            total += w
            taken += 1
            if taken == n - 1:
                break
    return total, examined


def prim_heap(n, edges):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    seen = [False] * n
    heap, total, pushes, stale = [(0, 0)], 0, 1, 0
    while heap:
        w, v = heapq.heappop(heap)
        if seen[v]:
            stale += 1
            continue
        seen[v] = True
        total += w
        for nxt, nw in adj[v]:
            if not seen[nxt]:
                heapq.heappush(heap, (nw, nxt))
                pushes += 1
    return total, pushes, stale


def prim_array(n, edges):
    INF = 10 ** 9
    cost = [[INF] * n for _ in range(n)]
    for u, v, w in edges:
        if w < cost[u][v]:
            cost[u][v] = cost[v][u] = w
    best = [INF] * n                     # cheapest known edge from the tree to each vertex
    best[0] = 0
    in_tree = [False] * n
    total = steps = 0
    for _ in range(n):
        u = -1
        for v in range(n):               # O(V) scan for the closest vertex, no heap
            steps += 1
            if not in_tree[v] and (u == -1 or best[v] < best[u]):
                u = v
        in_tree[u] = True
        total += best[u]
        row = cost[u]
        for v in range(n):
            if not in_tree[v] and row[v] < best[v]:
                best[v] = row[v]
    return total, steps


for name, n, edges in [("sparse", 1000, sparse_graph(1000, 3000)), ("dense", 300, dense_graph(300))]:
    print(name + " graph: V=" + str(n) + ", E=" + str(len(edges)))
    k, examined = kruskal(n, edges)
    p, pushes, stale = prim_heap(n, edges)
    a, steps = prim_array(n, edges)
    print("  Kruskal     weight " + str(k) + " | sorted " + str(len(edges)) + " edges, examined " + str(examined))
    print("  Prim heap   weight " + str(p) + " | " + str(pushes) + " heap pushes, " + str(stale) + " stale pops")
    print("  Prim array  weight " + str(a) + " | " + str(steps) + " scan steps")
    print("  all three agree: " + str(k == p == a).lower())
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Both Kruskal's and Prim's algorithms find a minimum spanning tree. How does each one work, why are both correct, and which would you pick for a given graph? Please implement both in JavaScript."

**What a strong answer should cover:**
- The goal: a minimum spanning tree connects all V vertices with V - 1 edges of minimum total weight, for a connected, undirected, weighted graph.
- Kruskal is edge-first: sort all edges, take each one that joins two different components (checked with union-find), O(E log E).
- Prim is vertex-first: grow one tree from a start vertex, always adding the cheapest edge that leaves it, using a min-heap, O(E log V); an O(V²) array version suits dense graphs.
- Why both are correct: the cut property (the cheapest edge across any cut is safe); and the practical differences: sparse vs dense, edge list vs adjacency list, a spanning forest for disconnected graphs (Kruskal) vs one component (Prim).
- JavaScript specifics: there is no built-in priority queue, so Prim needs a small binary heap (or the O(V²) array version); edges must be sorted with a numeric comparator such as \`(a, b) => a[2] - b[2]\`, because the default \`sort\` compares strings.

**Clarifying questions expected:**
- "Is the graph connected, and if not, do you want a spanning forest?"
- "How is the graph given: an edge list or an adjacency list? Roughly how many edges per vertex?"

**Code / implementation expected:** Yes — both in JavaScript: Kruskal with a small union-find, and lazy Prim with a hand-written binary heap.`,
        answer: `**Target Audience:** Interview candidates who know what a graph and a heap are; minimum spanning trees are explained from scratch
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Six villages want to be connected by roads so that anyone can drive from any village to any other. A contractor has quoted a price for every possible road. Building all of them is wasteful: you only need enough roads that everything is connected, and you want the cheapest such set.

Two planners attack it differently.

**Planner K** spreads every quote on a big table and sorts them from cheapest to most expensive. Going down the list, she approves a road unless the two villages it joins are already connected by roads she has approved; that road would be redundant. She stops once every village is connected.

**Planner P** starts at the town hall's village. She looks at every road that leaves "the villages we have connected so far" and builds the cheapest one. That pulls a new village into the network, which opens up new roads to look at. She repeats until every village is in.

Both planners end with the same total cost. That is not luck; there is a short proof behind it, and knowing *how* they differ (global sort versus growing outward) is exactly what interviewers probe when they ask "Kruskal or Prim?".

## 2. What a Minimum Spanning Tree Is

📌 **Interview term: Spanning tree** — a subset of a graph's edges that connects all V vertices and has no cycle. It always has exactly V - 1 edges.

📌 **Interview term: Minimum spanning tree (MST)** — a spanning tree whose total edge weight is as small as possible. It is defined for **undirected**, weighted, connected graphs. (The directed version, a minimum arborescence, needs a different algorithm.)

📌 **Interview term: Minimum spanning forest** — for a disconnected graph, one minimum spanning tree per connected component.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Six vertices with weighted edges. The minimum spanning tree edges 1 to 2 weight 1, 1 to 3 weight 2, 3 to 4 weight 2, 0 to 2 weight 3 and 3 to 5 weight 5 are highlighted, total 13.">
  <rect class="d-box" x="40" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="70" y="157" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="57" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="267" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="420" y="157" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="267" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="57" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 96 136 L 212 66" fill="none"/>
  <text class="d-sub" x="140" y="88" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 96 168 L 212 248" fill="none"/>
  <text class="d-text d-accent" x="140" y="228" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 76 L 240 238" fill="none"/>
  <text class="d-text d-accent" x="256" y="162" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 268 66 L 392 140" fill="none"/>
  <text class="d-text d-accent" x="330" y="88" text-anchor="middle">2</text>
  <path class="d-edge-dashed" d="M 268 250 L 392 166" fill="none"/>
  <text class="d-sub" x="340" y="226" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 448 166 L 562 250" fill="none"/>
  <text class="d-text d-accent" x="500" y="226" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 448 140 L 562 64" fill="none"/>
  <text class="d-text d-accent" x="500" y="88" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 590 76 L 590 238" fill="none"/>
  <text class="d-sub" x="608" y="162" text-anchor="middle">6</text>
  <path class="d-edge-dashed" d="M 272 268 L 556 266" fill="none"/>
  <text class="d-sub" x="414" y="290" text-anchor="middle">7</text>
</svg>

This is the graph used in Example 1. The highlighted edges (weights 1, 2, 2, 3 and 5) are its minimum spanning tree, total 13. The dashed edges (4, 4, 6 and 7) are left out: each one would join two vertices that the highlighted edges already connect.

## 3. Why Greedy Works: the Cut Property

Both algorithms are **greedy**: they commit to the locally cheapest choice and never undo it. That is only safe because of one fact.

📌 **Interview term: Cut** — a split of the vertices into two non-empty groups. An edge **crosses** the cut if its two ends are in different groups.

📌 **Interview term: Cut property** — for any cut, the cheapest edge crossing it belongs to some minimum spanning tree. (If the cheapest crossing edge is unique, it belongs to every MST.) Proof sketch: take an MST without that edge, add it, and you get a cycle; that cycle must cross the cut a second time through a more expensive edge; swap them and the total does not go up.

📌 **Interview term: Cycle property** — the most expensive edge on any cycle is not needed (with distinct weights, it is in no MST). This is why skipping an edge that would close a cycle is safe.

- **Prim** applies the cut property literally: the cut is "the tree so far" versus "everything else", and it takes the cheapest crossing edge.
- **Kruskal** applies it implicitly: when it accepts edge (u, v), u and v are in different components; cut u's component from the rest, and since edges are taken in weight order, nothing cheaper crosses that cut.

📌 **Interview term: Greedy algorithm** — builds a solution step by step, always taking the best-looking option now. Greedy is correct only when a property like the cut property guarantees it.

## 4. The Two Algorithms Side by Side

### Kruskal: edges first, globally

1. Sort all edges by weight.
2. Start with every vertex in its own component ([Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure)).
3. For each edge (u, v) in order: if \`find(u) != find(v)\`, take it and \`union(u, v)\`; otherwise skip it (it would close a cycle).
4. Stop after V - 1 edges, or when the list runs out (then you have a spanning forest).

📌 **Interview term: Kruskal's algorithm** — the sorted-edges method above, published by Joseph Kruskal in "On the shortest spanning subtree of a graph and the traveling salesman problem", *Proceedings of the AMS* 7(1), 1956.

### Prim: one tree, growing outward

1. Mark a start vertex as "in the tree" and push every edge leaving it into a min-heap keyed by weight.
2. Pop the cheapest edge. If its far end is already in the tree, discard it. Otherwise add that vertex, add the weight, and push the vertex's edges to vertices not yet in the tree.
3. Repeat until the heap is empty.

📌 **Interview term: Prim's algorithm** — the grow-one-tree method above. It was described by Vojtěch Jarník in 1930 and independently by Robert Prim in the *Bell System Technical Journal* in 1957 (and again by Dijkstra in 1959), which is why it is also called the Jarník–Prim or DJP algorithm.

📌 **Interview term: Lazy deletion (stale entries)** — instead of updating a heap entry when a cheaper edge to the same vertex appears, push a new entry and **skip** old ones when they are popped. Simple, and the heap holds at most E entries. The eager alternative uses a decrease-key operation, which most standard library heaps do not offer.

Prim's loop looks almost identical to [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work). The one difference: Dijkstra keys the heap by **distance from the source** (\`dist[u] + w\`), Prim keys it by **the edge weight alone** (\`w\`). Mixing them up is a classic bug.

| | Kruskal | Prim (binary heap) |
| :--- | :--- | :--- |
| Grows | a forest of components that merge | a single tree from a start vertex |
| Main data structure | sorted edge list + union-find | adjacency list + min-heap |
| Picks next | the globally cheapest remaining edge | the cheapest edge leaving the tree |
| Time | O(E log E), which equals O(E log V) | O(E log V) |
| Best when | the graph is sparse, or given as an edge list | the graph is dense or given as adjacency lists |
| Disconnected graph | returns a minimum spanning forest | spans only the start vertex component |
| Can stop early | after V - 1 accepted edges | after V vertices are in the tree |

For **dense** graphs (E close to V²), the heap-free Prim that scans an array of "cheapest known edge to each vertex" runs in O(V²), which beats both heap-based versions there. Example 2 runs all three.

## 5. Both Algorithms in JavaScript

### Kruskal

~~~javascript
function find(parent, x) {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]]; // path halving: skip to the grandparent
    x = parent[x];
  }
  return x;
}
~~~

~~~javascript
function kruskal(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  let total = 0, taken = 0;
  const sorted = [...edges].sort((e, f) => e[2] - f[2] || e[0] - f[0] || e[1] - f[1]);
  for (const [u, v, w] of sorted) {
    const ru = find(parent, u), rv = find(parent, v);
    if (ru === rv) {
      console.log('  skip ' + u + '-' + v + ' (w=' + w + '): both ends already connected');
      continue;
    }
    parent[ru] = rv;
    total += w;
    taken++;
    console.log('  take ' + u + '-' + v + ' (w=' + w + ')');
    if (taken === n - 1) break; // a spanning tree has exactly n - 1 edges
  }
  return [total, taken];
}
~~~

- \`[...edges].sort(...)\` copies first because \`Array.prototype.sort\` sorts **in place**. The comparator \`e[2] - f[2] || e[0] - f[0] || e[1] - f[1]\` sorts by weight and breaks ties by endpoints: \`||\` moves on to the next key when the difference is 0. Without a comparator, \`sort\` would compare the arrays as strings.
- \`find\` uses **path halving** (\`parent[x] = parent[parent[x]]\`), a one-loop form of path compression.
- The early \`break\` at n - 1 accepted edges skips the rest of the list.

### Prim (lazy, with a hand-written heap)

JavaScript has no priority queue in the language or the browser, so Example 1 includes a 40-line binary \`MinHeap\` whose \`less\` compares \`[weight, vertex, from]\` arrays element by element. With it, Prim is:

~~~javascript
function prim(n, edges, start) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    adj[u].push([v, w]);
    adj[v].push([u, w]);
  }
  const seen = new Array(n).fill(false);
  seen[start] = true;
  const heap = new MinHeap();
  for (const [v, w] of adj[start]) heap.push([w, v, start]);
  let total = 0, count = 0;
  while (heap.size > 0) {
    const [w, v, from] = heap.pop();
    if (seen[v]) {
      console.log('  stale ' + from + '-' + v + ' (w=' + w + '): ' + v + ' already in the tree');
      continue;
    }
    seen[v] = true;
    total += w;
    count++;
    console.log('  add ' + v + ' via ' + from + '-' + v + ' (w=' + w + ')');
    for (const [next, nw] of adj[v]) if (!seen[next]) heap.push([nw, next, v]);
  }
  return [total, count];
}
~~~

- \`if (seen[v]) continue;\` is the lazy deletion: the heap may hold several entries for the same vertex, and only the first one popped counts.
- \`const [w, v, from] = heap.pop();\` destructures the entry. Weights are JavaScript numbers (doubles), so totals are exact only up to 2^53; that is far beyond any interview input.
- If you cannot write a heap under time pressure, the O(V²) array version in Example 2 (\`primArray\`) needs no heap at all and is the better choice for dense graphs anyway.

## 6. Verified: Running the Code

Each example on this page was saved as \`main.js\` and run with \`node main.js\` (the same code runs unchanged in the page, it only uses \`console.log\`). The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kruskal and Prim traced on the same graph** prints:

~~~text
Kruskal (edges sorted by weight):
  take 1-2 (w=1)
  take 1-3 (w=2)
  take 3-4 (w=2)
  take 0-2 (w=3)
  skip 0-1 (w=4): both ends already connected
  skip 2-3 (w=4): both ends already connected
  take 3-5 (w=5)
Kruskal total = 13 using 5 edges
Prim from vertex 0 (min-heap of crossing edges):
  add 2 via 0-2 (w=3)
  add 1 via 2-1 (w=1)
  add 3 via 1-3 (w=2)
  add 4 via 3-4 (w=2)
  stale 0-1 (w=4): 1 already in the tree
  stale 2-3 (w=4): 3 already in the tree
  add 5 via 3-5 (w=5)
  stale 4-5 (w=6): 5 already in the tree
  stale 2-4 (w=7): 4 already in the tree
Prim total = 13 using 5 edges
Disconnected graph, Kruskal:
  take 0-2 (w=1)
  take 0-1 (w=2)
  skip 1-2 (w=3): both ends already connected
  take 3-4 (w=5)
forest total = 8, edges = 3 (a tree would need 4)
Disconnected graph, Prim from 0:
  add 2 via 0-2 (w=1)
  add 1 via 0-1 (w=2)
  stale 2-1 (w=3): 1 already in the tree
Prim reached 3 of 5 vertices, total = 3
~~~

Reading it: Kruskal takes the four cheapest edges, skips 0-1 and 2-3 because their ends are already connected, takes 3-5 and stops at 5 edges without ever looking at weights 6 and 7. Prim adds the vertices in the order 2, 1, 3, 4, 5, and its "stale" lines are heap entries for vertices that had already joined the tree. Both pick the same five edges and total 13. On the disconnected graph, Kruskal returns a forest of 3 edges (weight 8) while Prim from 0 only reaches its own component.

**Example 2 — three MST algorithms on a sparse and a dense random graph** prints:

~~~text
sparse graph: V=1000, E=3000
  Kruskal     weight 195702 | sorted 3000 edges, examined 2918
  Prim heap   weight 195702 | 3001 heap pushes, 2001 stale pops
  Prim array  weight 195702 | 1000000 scan steps
  all three agree: true
dense graph: V=300, E=44850
  Kruskal     weight 1320 | sorted 44850 edges, examined 1173
  Prim heap   weight 1320 | 44851 heap pushes, 44551 stale pops
  Prim array  weight 1320 | 90000 scan steps
  all three agree: true
~~~

Reading it: all three algorithms agree on the weight every time. On the dense graph Kruskal must sort all 44 850 edges but only examines 1173 of them before it has 299 tree edges; the heap version pushes nearly every edge (44 851 pushes) and discards 44 551 of them as stale; the array version does 90 000 cheap scan steps and no heap work. On the sparse graph the picture flips: the array version's V² = 1 000 000 steps are far more than the heap's 3001 pushes.

## 7. Complexity

| Algorithm | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kruskal | O(E log E) | O(V + E) | the sort dominates; union-find operations are near O(1) each |
| Prim, lazy binary heap | O(E log E) = O(E log V) | O(V + E) | every edge can be pushed once, each push and pop is O(log E) |
| Prim, eager with decrease-key | O(E log V) | O(V) heap | at most V heap entries; needs an indexed heap |
| Prim, adjacency matrix and array | O(V²) | O(V²) matrix | V rounds, each scans V vertices; no heap at all |

log E and log V differ by at most a factor of 2, because E is at most V², so O(E log E) and O(E log V) are the same class. Example 2 makes the costs concrete: on the sparse graph (V = 1000, E = 3000) the array version needs 1 000 000 scan steps while the heap does 3001 pushes; on the dense graph (V = 300, E = 44 850) the array needs only 90 000 steps while the heap does 44 851 pushes, each costing a logarithmic number of swaps. See [Big-O notation](/interview-question/what-is-big-o-notation) and [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).

## 8. Which One Should You Pick?

- **Edge list given, sparse graph** (roads, cables, most interview inputs): **Kruskal**. Sorting is one library call and union-find is ten lines.
- **Dense graph or an adjacency matrix** (all pairs of points, as in "minimum cost to connect all points"): **Prim with an array**, O(V²), and no edge list of size V² has to be built and sorted.
- **Adjacency lists, medium density**: Prim with a heap; it never sorts all edges at once.
- **The graph may be disconnected**: Kruskal gives the minimum spanning forest for free; Prim must be restarted from each unvisited vertex.
- **Edges arrive over time** and you need the forest so far: Kruskal's union-find structure handles additions naturally if the edges arrive in sorted order.

Both return the same **total weight**. When several edges share a weight, they may return different edge sets, all equally minimal. If every weight is distinct, the MST is unique and both return exactly the same edges.

## 9. Edge Cases

- **One vertex, no edges:** the MST is empty, total 0.
- **Disconnected graph:** Kruskal accepts fewer than V - 1 edges (Example 1: 3 edges for 5 vertices); Prim reaches only part of the graph (3 of 5). Decide with the interviewer whether that is an error or a forest.
- **Parallel edges between the same pair:** both algorithms handle them; the cheaper one wins, the other is skipped as a cycle or a stale entry.
- **Self-loops:** Kruskal skips them because both ends have the same root; Prim skips them because the end is already in the tree.
- **Negative weights:** allowed. Unlike Dijkstra, MST algorithms only compare weights, so negative values are fine.
- **Equal weights:** the total is still minimal, but the chosen edges depend on tie-breaking. The examples break ties by vertex numbers so that every language prints the same trace.

## Common Pitfalls

- **\`edges.sort()\` with no comparator.** It sorts by string value, so a weight of 10 sorts before 9. Always pass \`(a, b) => a[2] - b[2]\`.
- **Sorting the caller's array in place.** \`sort\` mutates; copy with \`[...edges]\` first if the input must be preserved.
- **Using an array with \`shift()\` as a "priority queue"** after sorting it each round: O(E² log E) overall. Write the small heap, or use the O(V²) array Prim.
- **Keying Prim's heap by distance** (\`dist + w\`) instead of the edge weight \`w\`. That is Dijkstra.
- **Forgetting the visited check when popping** in lazy Prim, so a vertex is counted twice.
- **Assuming the graph is connected.** Check the number of accepted edges or visited vertices before returning.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Goal:</strong> <span style="color:#f0e2c8;">An MST connects all V vertices with V - 1 edges of minimum total weight, on an undirected weighted graph.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kruskal:</strong> <span style="color:#f0e2c8;">Copy and sort edges with a numeric comparator; take each edge whose ends have different union-find roots. O(E log E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prim:</strong> <span style="color:#f0e2c8;">Grow one tree with a min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[w, v]</code> (JS has none built in, so I write a small one); skip stale entries. O(E log V).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why correct:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">cut property</strong>: the cheapest edge crossing any cut is safe, so greedy choices never need undoing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use which:</strong> <span style="color:#f0e2c8;">Kruskal for sparse edge lists or a forest; heap Prim for adjacency lists; the O(V²) array Prim for dense graphs, with no heap needed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do they always return the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same total weight, always; the same edges only when all weights are distinct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is Prim different from Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, different key: Prim uses the edge weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, Dijkstra uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">No time to write a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For dense inputs I would use the array Prim, O(V²), which needs no heap; for sparse ones Kruskal needs only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> and union-find.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why copy before sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.sort</code> mutates the array; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...edges].sort(cmp)</code> leaves the caller's data alone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Negative weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fine for both; MST algorithms only compare weights.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Spanning tree** | V - 1 edges that connect every vertex, with no cycle |
| **Minimum spanning tree (MST)** | the spanning tree with the smallest total weight |
| **Minimum spanning forest** | one MST per connected component of a disconnected graph |
| **Cut** | a split of the vertices into two groups; crossing edges join the groups |
| **Cut property** | the cheapest edge across any cut is safe to take |
| **Cycle property** | the heaviest edge on a cycle is never needed |
| **Greedy algorithm** | always takes the best-looking option now, never undoes it |
| **Kruskal's algorithm** | sort edges, take each one that joins two components |
| **Prim's algorithm** | grow one tree, always adding the cheapest edge leaving it |
| **Lazy deletion (stale entries)** | push duplicates into the heap and skip outdated ones when popped |
| **Binary heap** | array-based tree where each parent is no larger than its children; JS has no built-in one |

---
**Conclusion:** Kruskal and Prim solve the same problem with the same guarantee, the cut property, from opposite directions. Kruskal looks at edges globally: sort them, then let union-find reject every edge that would close a cycle. Prim looks outward from one tree: a min-heap hands it the cheapest edge leaving the tree, and stale entries are skipped. Both are O(E log V); Kruskal suits sparse edge lists and disconnected graphs, Prim suits adjacency lists, and its heap-free O(V²) form wins on dense graphs. In JavaScript, Kruskal is the easier one to write because the language has \`sort\` but no heap; never sort numbers without a comparator.
`,
        examples: [
          { label: `Kruskal and Prim traced on the same graph, plus a disconnected graph`, code: `// Kruskal and Prim on the same weighted undirected graph, with a trace of every decision.
const N = 6;
const EDGES = [[0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 2], [2, 3, 4], [3, 4, 2], [3, 5, 5], [4, 5, 6], [2, 4, 7]];

// JavaScript has no built-in heap, so here is a small binary min-heap of arrays,
// ordered lexicographically: [weight, vertex, from].
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  static less(x, y) {
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i];
    return false;
  }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!MinHeap.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && MinHeap.less(a[l], a[m])) m = l;
        if (r < a.length && MinHeap.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function find(parent, x) {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]]; // path halving: skip to the grandparent
    x = parent[x];
  }
  return x;
}

function kruskal(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  let total = 0, taken = 0;
  const sorted = [...edges].sort((e, f) => e[2] - f[2] || e[0] - f[0] || e[1] - f[1]);
  for (const [u, v, w] of sorted) {
    const ru = find(parent, u), rv = find(parent, v);
    if (ru === rv) {
      console.log('  skip ' + u + '-' + v + ' (w=' + w + '): both ends already connected');
      continue;
    }
    parent[ru] = rv;
    total += w;
    taken++;
    console.log('  take ' + u + '-' + v + ' (w=' + w + ')');
    if (taken === n - 1) break; // a spanning tree has exactly n - 1 edges
  }
  return [total, taken];
}

function prim(n, edges, start) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    adj[u].push([v, w]);
    adj[v].push([u, w]);
  }
  const seen = new Array(n).fill(false);
  seen[start] = true;
  const heap = new MinHeap();
  for (const [v, w] of adj[start]) heap.push([w, v, start]);
  let total = 0, count = 0;
  while (heap.size > 0) {
    const [w, v, from] = heap.pop();
    if (seen[v]) {
      console.log('  stale ' + from + '-' + v + ' (w=' + w + '): ' + v + ' already in the tree');
      continue;
    }
    seen[v] = true;
    total += w;
    count++;
    console.log('  add ' + v + ' via ' + from + '-' + v + ' (w=' + w + ')');
    for (const [next, nw] of adj[v]) if (!seen[next]) heap.push([nw, next, v]);
  }
  return [total, count];
}

console.log('Kruskal (edges sorted by weight):');
const [kTotal, kEdges] = kruskal(N, EDGES);
console.log('Kruskal total = ' + kTotal + ' using ' + kEdges + ' edges');
console.log('Prim from vertex 0 (min-heap of crossing edges):');
const [pTotal, pEdges] = prim(N, EDGES, 0);
console.log('Prim total = ' + pTotal + ' using ' + pEdges + ' edges');

// A graph in two pieces: Kruskal returns a spanning forest, Prim only spans the start piece.
const FOREST = [[0, 1, 2], [1, 2, 3], [0, 2, 1], [3, 4, 5]];
console.log('Disconnected graph, Kruskal:');
const [fTotal, fEdges] = kruskal(5, FOREST);
console.log('forest total = ' + fTotal + ', edges = ' + fEdges + ' (a tree would need 4)');
console.log('Disconnected graph, Prim from 0:');
const [gTotal, gEdges] = prim(5, FOREST, 0);
console.log('Prim reached ' + (gEdges + 1) + ' of 5 vertices, total = ' + gTotal);
` },
          { label: `Three MST algorithms agree; their work on sparse vs dense graphs`, code: `// Same MST weight from three algorithms, and how much work each does on a sparse vs a dense graph.
let seed = 12345;
function rand() {
  seed = (seed * 48271) % 2147483647; // small LCG: the product stays below 2^53, so it is exact
  return seed;
}

function sparseGraph(n, m) {
  const edges = [];
  for (let v = 1; v < n; v++) {        // a random tree first, so the graph is connected
    const u = rand() % v;
    edges.push([u, v, (rand() % 1000) + 1]);
  }
  while (edges.length < m) {
    const u = rand() % n, v = rand() % n;
    if (u !== v) edges.push([Math.min(u, v), Math.max(u, v), (rand() % 1000) + 1]);
  }
  return edges;
}

function denseGraph(n) {
  const edges = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) edges.push([u, v, (rand() % 1000) + 1]);
  return edges;
}

class MinHeap { // binary min-heap of [weight, vertex] pairs
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  static less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!MinHeap.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && MinHeap.less(a[l], a[m])) m = l;
        if (r < a.length && MinHeap.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kruskal(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  let total = 0, taken = 0, examined = 0;
  const sorted = [...edges].sort((e, f) => e[2] - f[2] || e[0] - f[0] || e[1] - f[1]);
  for (const [u, v, w] of sorted) {
    examined++;
    const ru = find(u), rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
      total += w;
      if (++taken === n - 1) break;
    }
  }
  return [total, examined];
}

function primHeap(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }
  const seen = new Array(n).fill(false);
  const heap = new MinHeap();
  heap.push([0, 0]);
  let total = 0, pushes = 1, stale = 0;
  while (heap.size > 0) {
    const [w, v] = heap.pop();
    if (seen[v]) { stale++; continue; }
    seen[v] = true;
    total += w;
    for (const [next, nw] of adj[v]) {
      if (!seen[next]) { heap.push([nw, next]); pushes++; }
    }
  }
  return [total, pushes, stale];
}

function primArray(n, edges) {
  const INF = 1e9;
  const cost = Array.from({ length: n }, () => new Array(n).fill(INF));
  for (const [u, v, w] of edges) if (w < cost[u][v]) { cost[u][v] = w; cost[v][u] = w; }
  const best = new Array(n).fill(INF);   // cheapest known edge from the tree to each vertex
  best[0] = 0;
  const inTree = new Array(n).fill(false);
  let total = 0, steps = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) {          // O(V) scan for the closest vertex, no heap
      steps++;
      if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v;
    }
    inTree[u] = true;
    total += best[u];
    for (let v = 0; v < n; v++) if (!inTree[v] && cost[u][v] < best[v]) best[v] = cost[u][v];
  }
  return [total, steps];
}

for (const [name, n, edges] of [['sparse', 1000, sparseGraph(1000, 3000)], ['dense', 300, denseGraph(300)]]) {
  console.log(name + ' graph: V=' + n + ', E=' + edges.length);
  const [k, examined] = kruskal(n, edges);
  const [p, pushes, stale] = primHeap(n, edges);
  const [a, steps] = primArray(n, edges);
  console.log('  Kruskal     weight ' + k + ' | sorted ' + edges.length + ' edges, examined ' + examined);
  console.log('  Prim heap   weight ' + p + ' | ' + pushes + ' heap pushes, ' + stale + ' stale pops');
  console.log('  Prim array  weight ' + a + ' | ' + steps + ' scan steps');
  console.log('  all three agree: ' + (k === p && p === a));
}
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Both Kruskal's and Prim's algorithms find a minimum spanning tree. How does each one work, why are both correct, and which would you pick for a given graph? Please implement both in Java."

**What a strong answer should cover:**
- The goal: a minimum spanning tree connects all V vertices with V - 1 edges of minimum total weight, for a connected, undirected, weighted graph.
- Kruskal is edge-first: sort all edges, take each one that joins two different components (checked with union-find), O(E log E).
- Prim is vertex-first: grow one tree from a start vertex, always adding the cheapest edge that leaves it, using a min-heap, O(E log V); an O(V²) array version suits dense graphs.
- Why both are correct: the cut property (the cheapest edge across any cut is safe); and the practical differences: sparse vs dense, edge list vs adjacency list, a spanning forest for disconnected graphs (Kruskal) vs one component (Prim).
- Java specifics: \`PriorityQueue<int[]>\` with a comparator built from \`Integer.compare\` (not \`a[0] - b[0]\`, which overflows), \`Comparator.comparingInt(...).thenComparingInt(...)\` for sorting edges, and a \`long\` total for large weights.

**Clarifying questions expected:**
- "Is the graph connected, and if not, do you want a spanning forest?"
- "How is the graph given: an edge list or an adjacency list? Roughly how many edges per vertex?"

**Code / implementation expected:** Yes — both in Java: Kruskal with a union-find over \`int[]\`, and lazy Prim with \`PriorityQueue<int[]>\`.`,
        answer: `**Target Audience:** Interview candidates who know what a graph and a heap are; minimum spanning trees are explained from scratch
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Six villages want to be connected by roads so that anyone can drive from any village to any other. A contractor has quoted a price for every possible road. Building all of them is wasteful: you only need enough roads that everything is connected, and you want the cheapest such set.

Two planners attack it differently.

**Planner K** spreads every quote on a big table and sorts them from cheapest to most expensive. Going down the list, she approves a road unless the two villages it joins are already connected by roads she has approved; that road would be redundant. She stops once every village is connected.

**Planner P** starts at the town hall's village. She looks at every road that leaves "the villages we have connected so far" and builds the cheapest one. That pulls a new village into the network, which opens up new roads to look at. She repeats until every village is in.

Both planners end with the same total cost. That is not luck; there is a short proof behind it, and knowing *how* they differ (global sort versus growing outward) is exactly what interviewers probe when they ask "Kruskal or Prim?".

## 2. What a Minimum Spanning Tree Is

📌 **Interview term: Spanning tree** — a subset of a graph's edges that connects all V vertices and has no cycle. It always has exactly V - 1 edges.

📌 **Interview term: Minimum spanning tree (MST)** — a spanning tree whose total edge weight is as small as possible. It is defined for **undirected**, weighted, connected graphs. (The directed version, a minimum arborescence, needs a different algorithm.)

📌 **Interview term: Minimum spanning forest** — for a disconnected graph, one minimum spanning tree per connected component.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Six vertices with weighted edges. The minimum spanning tree edges 1 to 2 weight 1, 1 to 3 weight 2, 3 to 4 weight 2, 0 to 2 weight 3 and 3 to 5 weight 5 are highlighted, total 13.">
  <rect class="d-box" x="40" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="70" y="157" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="57" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="267" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="420" y="157" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="267" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="57" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 96 136 L 212 66" fill="none"/>
  <text class="d-sub" x="140" y="88" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 96 168 L 212 248" fill="none"/>
  <text class="d-text d-accent" x="140" y="228" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 76 L 240 238" fill="none"/>
  <text class="d-text d-accent" x="256" y="162" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 268 66 L 392 140" fill="none"/>
  <text class="d-text d-accent" x="330" y="88" text-anchor="middle">2</text>
  <path class="d-edge-dashed" d="M 268 250 L 392 166" fill="none"/>
  <text class="d-sub" x="340" y="226" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 448 166 L 562 250" fill="none"/>
  <text class="d-text d-accent" x="500" y="226" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 448 140 L 562 64" fill="none"/>
  <text class="d-text d-accent" x="500" y="88" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 590 76 L 590 238" fill="none"/>
  <text class="d-sub" x="608" y="162" text-anchor="middle">6</text>
  <path class="d-edge-dashed" d="M 272 268 L 556 266" fill="none"/>
  <text class="d-sub" x="414" y="290" text-anchor="middle">7</text>
</svg>

This is the graph used in Example 1. The highlighted edges (weights 1, 2, 2, 3 and 5) are its minimum spanning tree, total 13. The dashed edges (4, 4, 6 and 7) are left out: each one would join two vertices that the highlighted edges already connect.

## 3. Why Greedy Works: the Cut Property

Both algorithms are **greedy**: they commit to the locally cheapest choice and never undo it. That is only safe because of one fact.

📌 **Interview term: Cut** — a split of the vertices into two non-empty groups. An edge **crosses** the cut if its two ends are in different groups.

📌 **Interview term: Cut property** — for any cut, the cheapest edge crossing it belongs to some minimum spanning tree. (If the cheapest crossing edge is unique, it belongs to every MST.) Proof sketch: take an MST without that edge, add it, and you get a cycle; that cycle must cross the cut a second time through a more expensive edge; swap them and the total does not go up.

📌 **Interview term: Cycle property** — the most expensive edge on any cycle is not needed (with distinct weights, it is in no MST). This is why skipping an edge that would close a cycle is safe.

- **Prim** applies the cut property literally: the cut is "the tree so far" versus "everything else", and it takes the cheapest crossing edge.
- **Kruskal** applies it implicitly: when it accepts edge (u, v), u and v are in different components; cut u's component from the rest, and since edges are taken in weight order, nothing cheaper crosses that cut.

📌 **Interview term: Greedy algorithm** — builds a solution step by step, always taking the best-looking option now. Greedy is correct only when a property like the cut property guarantees it.

## 4. The Two Algorithms Side by Side

### Kruskal: edges first, globally

1. Sort all edges by weight.
2. Start with every vertex in its own component ([Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure)).
3. For each edge (u, v) in order: if \`find(u) != find(v)\`, take it and \`union(u, v)\`; otherwise skip it (it would close a cycle).
4. Stop after V - 1 edges, or when the list runs out (then you have a spanning forest).

📌 **Interview term: Kruskal's algorithm** — the sorted-edges method above, published by Joseph Kruskal in "On the shortest spanning subtree of a graph and the traveling salesman problem", *Proceedings of the AMS* 7(1), 1956.

### Prim: one tree, growing outward

1. Mark a start vertex as "in the tree" and push every edge leaving it into a min-heap keyed by weight.
2. Pop the cheapest edge. If its far end is already in the tree, discard it. Otherwise add that vertex, add the weight, and push the vertex's edges to vertices not yet in the tree.
3. Repeat until the heap is empty.

📌 **Interview term: Prim's algorithm** — the grow-one-tree method above. It was described by Vojtěch Jarník in 1930 and independently by Robert Prim in the *Bell System Technical Journal* in 1957 (and again by Dijkstra in 1959), which is why it is also called the Jarník–Prim or DJP algorithm.

📌 **Interview term: Lazy deletion (stale entries)** — instead of updating a heap entry when a cheaper edge to the same vertex appears, push a new entry and **skip** old ones when they are popped. Simple, and the heap holds at most E entries. The eager alternative uses a decrease-key operation, which most standard library heaps do not offer.

Prim's loop looks almost identical to [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work). The one difference: Dijkstra keys the heap by **distance from the source** (\`dist[u] + w\`), Prim keys it by **the edge weight alone** (\`w\`). Mixing them up is a classic bug.

| | Kruskal | Prim (binary heap) |
| :--- | :--- | :--- |
| Grows | a forest of components that merge | a single tree from a start vertex |
| Main data structure | sorted edge list + union-find | adjacency list + min-heap |
| Picks next | the globally cheapest remaining edge | the cheapest edge leaving the tree |
| Time | O(E log E), which equals O(E log V) | O(E log V) |
| Best when | the graph is sparse, or given as an edge list | the graph is dense or given as adjacency lists |
| Disconnected graph | returns a minimum spanning forest | spans only the start vertex component |
| Can stop early | after V - 1 accepted edges | after V vertices are in the tree |

For **dense** graphs (E close to V²), the heap-free Prim that scans an array of "cheapest known edge to each vertex" runs in O(V²), which beats both heap-based versions there. Example 2 runs all three.

## 5. Both Algorithms in Java

### Kruskal

~~~java
static int find(int[] parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving: skip to the grandparent
        x = parent[x];
    }
    return x;
}
~~~

~~~java
static int[] kruskal(int n, int[][] edges) {
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    int[][] sorted = edges.clone();
    Arrays.sort(sorted, Comparator.<int[]>comparingInt(e -> e[2]).thenComparingInt(e -> e[0]).thenComparingInt(e -> e[1]));
    int total = 0, taken = 0;
    for (int[] e : sorted) {
        int u = e[0], v = e[1], w = e[2];
        int ru = find(parent, u), rv = find(parent, v);
        if (ru == rv) {
            System.out.println("  skip " + u + "-" + v + " (w=" + w + "): both ends already connected");
            continue;
        }
        parent[ru] = rv;
        total += w;
        taken++;
        System.out.println("  take " + u + "-" + v + " (w=" + w + ")");
        if (taken == n - 1) break;       // a spanning tree has exactly n - 1 edges
    }
    return new int[]{total, taken};
}
~~~

- \`edges.clone()\` copies the outer array so the caller's order is untouched (\`Arrays.sort\` sorts in place). The comparator chain \`Comparator.<int[]>comparingInt(e -> e[2]).thenComparingInt(e -> e[0]).thenComparingInt(e -> e[1])\` sorts by weight, then endpoints. The explicit \`<int[]>\` type witness is needed because Java cannot infer the lambda type through the chained call.
- \`find\` uses **path halving** (\`parent[x] = parent[parent[x]]\`).
- The early \`break\` at n - 1 accepted edges skips the rest of the list.

### Prim (lazy, with PriorityQueue)

~~~java
static int[] prim(int n, int[][] edges, int start) {
    List<List<int[]>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(new int[]{e[1], e[2]});
        adj.get(e[1]).add(new int[]{e[0], e[2]});
    }
    boolean[] seen = new boolean[n];
    seen[start] = true;
    // PriorityQueue is a min-heap by its comparator: (weight, vertex, from)
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
        a[0] != b[0] ? Integer.compare(a[0], b[0]) : a[1] != b[1] ? Integer.compare(a[1], b[1]) : Integer.compare(a[2], b[2]));
    for (int[] vw : adj.get(start)) heap.add(new int[]{vw[1], vw[0], start});
    int total = 0, count = 0;
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int w = top[0], v = top[1], from = top[2];
        if (seen[v]) {
            System.out.println("  stale " + from + "-" + v + " (w=" + w + "): " + v + " already in the tree");
            continue;
        }
        seen[v] = true;
        total += w;
        count++;
        System.out.println("  add " + v + " via " + from + "-" + v + " (w=" + w + ")");
        for (int[] nw : adj.get(v)) if (!seen[nw[0]]) heap.add(new int[]{nw[1], nw[0], v});
    }
    return new int[]{total, count};
}
~~~

- \`PriorityQueue\` is a min-heap: its head is the least element according to the comparator (Java SE docs, \`java.util.PriorityQueue\`). The same docs say ties are broken arbitrarily, so the comparator compares weight, then vertex, then \`from\` to make the order fully defined.
- The comparator uses \`Integer.compare\`, never \`a[0] - b[0]\`: the subtraction overflows. In a test, \`2_000_000_000 - (-2_000_000_000)\` printed \`-294967296\`, and a queue using the subtraction comparator polled \`2000000000\` before \`-2000000000\`.
- \`if (seen[v]) continue;\` is the lazy deletion. \`PriorityQueue.remove(Object)\` exists but is O(n), so decrease-key by remove-and-add is slower than lazy deletion.

## 6. Verified: Running the Code

Each example on this page was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kruskal and Prim traced on the same graph** prints:

~~~text
Kruskal (edges sorted by weight):
  take 1-2 (w=1)
  take 1-3 (w=2)
  take 3-4 (w=2)
  take 0-2 (w=3)
  skip 0-1 (w=4): both ends already connected
  skip 2-3 (w=4): both ends already connected
  take 3-5 (w=5)
Kruskal total = 13 using 5 edges
Prim from vertex 0 (min-heap of crossing edges):
  add 2 via 0-2 (w=3)
  add 1 via 2-1 (w=1)
  add 3 via 1-3 (w=2)
  add 4 via 3-4 (w=2)
  stale 0-1 (w=4): 1 already in the tree
  stale 2-3 (w=4): 3 already in the tree
  add 5 via 3-5 (w=5)
  stale 4-5 (w=6): 5 already in the tree
  stale 2-4 (w=7): 4 already in the tree
Prim total = 13 using 5 edges
Disconnected graph, Kruskal:
  take 0-2 (w=1)
  take 0-1 (w=2)
  skip 1-2 (w=3): both ends already connected
  take 3-4 (w=5)
forest total = 8, edges = 3 (a tree would need 4)
Disconnected graph, Prim from 0:
  add 2 via 0-2 (w=1)
  add 1 via 0-1 (w=2)
  stale 2-1 (w=3): 1 already in the tree
Prim reached 3 of 5 vertices, total = 3
~~~

Reading it: Kruskal takes the four cheapest edges, skips 0-1 and 2-3 because their ends are already connected, takes 3-5 and stops at 5 edges without ever looking at weights 6 and 7. Prim adds the vertices in the order 2, 1, 3, 4, 5, and its "stale" lines are heap entries for vertices that had already joined the tree. Both pick the same five edges and total 13. On the disconnected graph, Kruskal returns a forest of 3 edges (weight 8) while Prim from 0 only reaches its own component.

**Example 2 — three MST algorithms on a sparse and a dense random graph** prints:

~~~text
sparse graph: V=1000, E=3000
  Kruskal     weight 195702 | sorted 3000 edges, examined 2918
  Prim heap   weight 195702 | 3001 heap pushes, 2001 stale pops
  Prim array  weight 195702 | 1000000 scan steps
  all three agree: true
dense graph: V=300, E=44850
  Kruskal     weight 1320 | sorted 44850 edges, examined 1173
  Prim heap   weight 1320 | 44851 heap pushes, 44551 stale pops
  Prim array  weight 1320 | 90000 scan steps
  all three agree: true
~~~

Reading it: all three algorithms agree on the weight every time. On the dense graph Kruskal must sort all 44 850 edges but only examines 1173 of them before it has 299 tree edges; the heap version pushes nearly every edge (44 851 pushes) and discards 44 551 of them as stale; the array version does 90 000 cheap scan steps and no heap work. On the sparse graph the picture flips: the array version's V² = 1 000 000 steps are far more than the heap's 3001 pushes.

## 7. Complexity

| Algorithm | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kruskal | O(E log E) | O(V + E) | the sort dominates; union-find operations are near O(1) each |
| Prim, lazy binary heap | O(E log E) = O(E log V) | O(V + E) | every edge can be pushed once, each push and pop is O(log E) |
| Prim, eager with decrease-key | O(E log V) | O(V) heap | at most V heap entries; needs an indexed heap |
| Prim, adjacency matrix and array | O(V²) | O(V²) matrix | V rounds, each scans V vertices; no heap at all |

log E and log V differ by at most a factor of 2, because E is at most V², so O(E log E) and O(E log V) are the same class. Example 2 makes the costs concrete: on the sparse graph (V = 1000, E = 3000) the array version needs 1 000 000 scan steps while the heap does 3001 pushes; on the dense graph (V = 300, E = 44 850) the array needs only 90 000 steps while the heap does 44 851 pushes, each costing a logarithmic number of swaps. See [Big-O notation](/interview-question/what-is-big-o-notation) and [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).

## 8. Which One Should You Pick?

- **Edge list given, sparse graph** (roads, cables, most interview inputs): **Kruskal**. Sorting is one library call and union-find is ten lines.
- **Dense graph or an adjacency matrix** (all pairs of points, as in "minimum cost to connect all points"): **Prim with an array**, O(V²), and no edge list of size V² has to be built and sorted.
- **Adjacency lists, medium density**: Prim with a heap; it never sorts all edges at once.
- **The graph may be disconnected**: Kruskal gives the minimum spanning forest for free; Prim must be restarted from each unvisited vertex.
- **Edges arrive over time** and you need the forest so far: Kruskal's union-find structure handles additions naturally if the edges arrive in sorted order.

Both return the same **total weight**. When several edges share a weight, they may return different edge sets, all equally minimal. If every weight is distinct, the MST is unique and both return exactly the same edges.

## 9. Edge Cases

- **One vertex, no edges:** the MST is empty, total 0.
- **Disconnected graph:** Kruskal accepts fewer than V - 1 edges (Example 1: 3 edges for 5 vertices); Prim reaches only part of the graph (3 of 5). Decide with the interviewer whether that is an error or a forest.
- **Parallel edges between the same pair:** both algorithms handle them; the cheaper one wins, the other is skipped as a cycle or a stale entry.
- **Self-loops:** Kruskal skips them because both ends have the same root; Prim skips them because the end is already in the tree.
- **Negative weights:** allowed. Unlike Dijkstra, MST algorithms only compare weights, so negative values are fine.
- **Equal weights:** the total is still minimal, but the chosen edges depend on tie-breaking. The examples break ties by vertex numbers so that every language prints the same trace.

## Common Pitfalls

- **\`(a, b) -> a[0] - b[0]\` comparators.** Subtraction overflows for large or negative weights and silently mis-orders the queue (shown in the test above). Use \`Integer.compare\`.
- **Summing weights in an \`int\`.** V - 1 edges of up to 10^9 each overflow; keep the total in a \`long\`.
- **Relying on \`PriorityQueue\` iteration order.** Iterating or printing the queue does not visit elements in priority order; only \`poll()\` does.
- **Keying Prim's heap by distance** (\`dist + w\`) instead of the edge weight \`w\`. That is Dijkstra.
- **Forgetting the visited check when polling** in lazy Prim, so a vertex is counted twice.
- **Assuming the graph is connected.** Check the number of accepted edges or visited vertices before returning.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Goal:</strong> <span style="color:#f0e2c8;">An MST connects all V vertices with V - 1 edges of minimum total weight, on an undirected weighted graph.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kruskal:</strong> <span style="color:#f0e2c8;">Sort edges with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator.comparingInt</code> chain; take each edge whose ends have different union-find roots. O(E log E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prim:</strong> <span style="color:#f0e2c8;">Grow one tree with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{w, v}</code>; skip polled entries whose vertex is already in. O(E log V).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why correct:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">cut property</strong>: the cheapest edge crossing any cut is safe, so greedy choices never need undoing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Comparators use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code>, not subtraction, and the total is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do they always return the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same total weight, always; the same edges only when all weights are distinct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is Prim different from Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, different key: Prim uses the edge weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, Dijkstra uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not decrease-key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> has no decrease-key and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(Object)</code> is O(n), so lazy deletion is simpler and still O(E log V).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which for a dense graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The O(V²) array Prim over an adjacency matrix: no heap, no sort of V² edges.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Negative weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fine for both; MST algorithms only compare weights.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Spanning tree** | V - 1 edges that connect every vertex, with no cycle |
| **Minimum spanning tree (MST)** | the spanning tree with the smallest total weight |
| **Minimum spanning forest** | one MST per connected component of a disconnected graph |
| **Cut** | a split of the vertices into two groups; crossing edges join the groups |
| **Cut property** | the cheapest edge across any cut is safe to take |
| **Cycle property** | the heaviest edge on a cycle is never needed |
| **Greedy algorithm** | always takes the best-looking option now, never undoes it |
| **Kruskal's algorithm** | sort edges, take each one that joins two components |
| **Prim's algorithm** | grow one tree, always adding the cheapest edge leaving it |
| **Lazy deletion (stale entries)** | push duplicates into the heap and skip outdated ones when popped |
| **\`PriorityQueue\`** | Java min-heap ordered by a comparator; ties are broken arbitrarily |

---
**Conclusion:** Kruskal and Prim solve the same problem with the same guarantee, the cut property, from opposite directions. Kruskal looks at edges globally: sort them, then let union-find reject every edge that would close a cycle. Prim looks outward from one tree: a min-heap hands it the cheapest edge leaving the tree, and stale entries are skipped. Both are O(E log V); Kruskal suits sparse edge lists and disconnected graphs, Prim suits adjacency lists, and its heap-free O(V²) form wins on dense graphs. In Java, both are short with \`Arrays.sort\` and \`PriorityQueue\`; the marks are overflow-safe comparators and a \`long\` total.
`,
        examples: [
          { label: `Kruskal and Prim traced on the same graph, plus a disconnected graph`, code: `import java.util.*;

public class Main {
    // Kruskal and Prim on the same weighted undirected graph, with a trace of every decision.
    static int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving: skip to the grandparent
            x = parent[x];
        }
        return x;
    }

    // returns {total weight, edges used}
    static int[] kruskal(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int[][] sorted = edges.clone();
        Arrays.sort(sorted, Comparator.<int[]>comparingInt(e -> e[2]).thenComparingInt(e -> e[0]).thenComparingInt(e -> e[1]));
        int total = 0, taken = 0;
        for (int[] e : sorted) {
            int u = e[0], v = e[1], w = e[2];
            int ru = find(parent, u), rv = find(parent, v);
            if (ru == rv) {
                System.out.println("  skip " + u + "-" + v + " (w=" + w + "): both ends already connected");
                continue;
            }
            parent[ru] = rv;
            total += w;
            taken++;
            System.out.println("  take " + u + "-" + v + " (w=" + w + ")");
            if (taken == n - 1) break;       // a spanning tree has exactly n - 1 edges
        }
        return new int[]{total, taken};
    }

    static int[] prim(int n, int[][] edges, int start) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        boolean[] seen = new boolean[n];
        seen[start] = true;
        // PriorityQueue is a min-heap by its comparator: (weight, vertex, from)
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
            a[0] != b[0] ? Integer.compare(a[0], b[0]) : a[1] != b[1] ? Integer.compare(a[1], b[1]) : Integer.compare(a[2], b[2]));
        for (int[] vw : adj.get(start)) heap.add(new int[]{vw[1], vw[0], start});
        int total = 0, count = 0;
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int w = top[0], v = top[1], from = top[2];
            if (seen[v]) {
                System.out.println("  stale " + from + "-" + v + " (w=" + w + "): " + v + " already in the tree");
                continue;
            }
            seen[v] = true;
            total += w;
            count++;
            System.out.println("  add " + v + " via " + from + "-" + v + " (w=" + w + ")");
            for (int[] nw : adj.get(v)) if (!seen[nw[0]]) heap.add(new int[]{nw[1], nw[0], v});
        }
        return new int[]{total, count};
    }

    public static void main(String[] args) {
        int n = 6;
        int[][] edges = {{0, 1, 4}, {0, 2, 3}, {1, 2, 1}, {1, 3, 2}, {2, 3, 4}, {3, 4, 2}, {3, 5, 5}, {4, 5, 6}, {2, 4, 7}};
        System.out.println("Kruskal (edges sorted by weight):");
        int[] k = kruskal(n, edges);
        System.out.println("Kruskal total = " + k[0] + " using " + k[1] + " edges");
        System.out.println("Prim from vertex 0 (min-heap of crossing edges):");
        int[] p = prim(n, edges, 0);
        System.out.println("Prim total = " + p[0] + " using " + p[1] + " edges");

        // A graph in two pieces: Kruskal returns a spanning forest, Prim only spans the start piece.
        int[][] forest = {{0, 1, 2}, {1, 2, 3}, {0, 2, 1}, {3, 4, 5}};
        System.out.println("Disconnected graph, Kruskal:");
        int[] f = kruskal(5, forest);
        System.out.println("forest total = " + f[0] + ", edges = " + f[1] + " (a tree would need 4)");
        System.out.println("Disconnected graph, Prim from 0:");
        int[] g = prim(5, forest, 0);
        System.out.println("Prim reached " + (g[1] + 1) + " of 5 vertices, total = " + g[0]);
    }
}
` },
          { label: `Three MST algorithms agree; their work on sparse vs dense graphs`, code: `import java.util.*;

public class Main {
    // Same MST weight from three algorithms, and how much work each does on a sparse vs a dense graph.
    static long seed = 12345;

    static int rand() {
        seed = seed * 48271 % 2147483647L;   // small LCG; long arithmetic, so no int overflow
        return (int) seed;
    }

    static List<int[]> sparseGraph(int n, int m) {
        List<int[]> edges = new ArrayList<>();
        for (int v = 1; v < n; v++) {        // a random tree first, so the graph is connected
            int u = rand() % v;
            edges.add(new int[]{u, v, rand() % 1000 + 1});
        }
        while (edges.size() < m) {
            int u = rand() % n, v = rand() % n;
            if (u != v) edges.add(new int[]{Math.min(u, v), Math.max(u, v), rand() % 1000 + 1});
        }
        return edges;
    }

    static List<int[]> denseGraph(int n) {
        List<int[]> edges = new ArrayList<>();
        for (int u = 0; u < n; u++) for (int v = u + 1; v < n; v++) edges.add(new int[]{u, v, rand() % 1000 + 1});
        return edges;
    }

    static int find(int[] parent, int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    static long[] kruskal(int n, List<int[]> edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        List<int[]> sorted = new ArrayList<>(edges);
        sorted.sort(Comparator.<int[]>comparingInt(e -> e[2]).thenComparingInt(e -> e[0]).thenComparingInt(e -> e[1]));
        long total = 0;
        int taken = 0, examined = 0;
        for (int[] e : sorted) {
            examined++;
            int ru = find(parent, e[0]), rv = find(parent, e[1]);
            if (ru != rv) {
                parent[ru] = rv;
                total += e[2];
                if (++taken == n - 1) break;
            }
        }
        return new long[]{total, examined};
    }

    static long[] primHeap(int n, List<int[]> edges) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(new int[]{e[1], e[2]}); adj.get(e[1]).add(new int[]{e[0], e[2]}); }
        boolean[] seen = new boolean[n];
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        heap.add(new int[]{0, 0});
        long total = 0;
        int pushes = 1, stale = 0;
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int w = top[0], v = top[1];
            if (seen[v]) { stale++; continue; }
            seen[v] = true;
            total += w;
            for (int[] nw : adj.get(v)) if (!seen[nw[0]]) { heap.add(new int[]{nw[1], nw[0]}); pushes++; }
        }
        return new long[]{total, pushes, stale};
    }

    static long[] primArray(int n, List<int[]> edges) {
        final int INF = 1_000_000_000;
        int[][] cost = new int[n][n];
        for (int[] row : cost) Arrays.fill(row, INF);
        for (int[] e : edges) if (e[2] < cost[e[0]][e[1]]) { cost[e[0]][e[1]] = e[2]; cost[e[1]][e[0]] = e[2]; }
        int[] best = new int[n];               // cheapest known edge from the tree to each vertex
        Arrays.fill(best, INF);
        best[0] = 0;
        boolean[] inTree = new boolean[n];
        long total = 0, steps = 0;
        for (int k = 0; k < n; k++) {
            int u = -1;
            for (int v = 0; v < n; v++) {      // O(V) scan for the closest vertex, no heap
                steps++;
                if (!inTree[v] && (u == -1 || best[v] < best[u])) u = v;
            }
            inTree[u] = true;
            total += best[u];
            for (int v = 0; v < n; v++) if (!inTree[v] && cost[u][v] < best[v]) best[v] = cost[u][v];
        }
        return new long[]{total, steps};
    }

    public static void main(String[] args) {
        String[] names = {"sparse", "dense"};
        int[] sizes = {1000, 300};
        for (int g = 0; g < 2; g++) {
            int n = sizes[g];
            List<int[]> edges = g == 0 ? sparseGraph(n, 3000) : denseGraph(n);
            System.out.println(names[g] + " graph: V=" + n + ", E=" + edges.size());
            long[] k = kruskal(n, edges), p = primHeap(n, edges), a = primArray(n, edges);
            System.out.println("  Kruskal     weight " + k[0] + " | sorted " + edges.size() + " edges, examined " + k[1]);
            System.out.println("  Prim heap   weight " + p[0] + " | " + p[1] + " heap pushes, " + p[2] + " stale pops");
            System.out.println("  Prim array  weight " + a[0] + " | " + a[1] + " scan steps");
            System.out.println("  all three agree: " + (k[0] == p[0] && p[0] == a[0]));
        }
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Both Kruskal's and Prim's algorithms find a minimum spanning tree. How does each one work, why are both correct, and which would you pick for a given graph? Please implement both in C++."

**What a strong answer should cover:**
- The goal: a minimum spanning tree connects all V vertices with V - 1 edges of minimum total weight, for a connected, undirected, weighted graph.
- Kruskal is edge-first: sort all edges, take each one that joins two different components (checked with union-find), O(E log E).
- Prim is vertex-first: grow one tree from a start vertex, always adding the cheapest edge that leaves it, using a min-heap, O(E log V); an O(V²) array version suits dense graphs.
- Why both are correct: the cut property (the cheapest edge across any cut is safe); and the practical differences: sparse vs dense, edge list vs adjacency list, a spanning forest for disconnected graphs (Kruskal) vs one component (Prim).
- C++ specifics: \`std::priority_queue\` is a max-heap by default, so Prim needs \`std::greater<>\` (or negated weights); \`std::sort\` with a \`std::tie\` comparator for Kruskal; copy \`top()\` before \`pop()\`; and \`long long\` for the total.

**Clarifying questions expected:**
- "Is the graph connected, and if not, do you want a spanning forest?"
- "How is the graph given: an edge list or an adjacency list? Roughly how many edges per vertex?"

**Code / implementation expected:** Yes — both in C++: Kruskal with a union-find over \`vector<int>\`, and lazy Prim with a min-\`priority_queue\`.`,
        answer: `**Target Audience:** Interview candidates who know what a graph and a heap are; minimum spanning trees are explained from scratch
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Six villages want to be connected by roads so that anyone can drive from any village to any other. A contractor has quoted a price for every possible road. Building all of them is wasteful: you only need enough roads that everything is connected, and you want the cheapest such set.

Two planners attack it differently.

**Planner K** spreads every quote on a big table and sorts them from cheapest to most expensive. Going down the list, she approves a road unless the two villages it joins are already connected by roads she has approved; that road would be redundant. She stops once every village is connected.

**Planner P** starts at the town hall's village. She looks at every road that leaves "the villages we have connected so far" and builds the cheapest one. That pulls a new village into the network, which opens up new roads to look at. She repeats until every village is in.

Both planners end with the same total cost. That is not luck; there is a short proof behind it, and knowing *how* they differ (global sort versus growing outward) is exactly what interviewers probe when they ask "Kruskal or Prim?".

## 2. What a Minimum Spanning Tree Is

📌 **Interview term: Spanning tree** — a subset of a graph's edges that connects all V vertices and has no cycle. It always has exactly V - 1 edges.

📌 **Interview term: Minimum spanning tree (MST)** — a spanning tree whose total edge weight is as small as possible. It is defined for **undirected**, weighted, connected graphs. (The directed version, a minimum arborescence, needs a different algorithm.)

📌 **Interview term: Minimum spanning forest** — for a disconnected graph, one minimum spanning tree per connected component.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 330" role="img" aria-label="Six vertices with weighted edges. The minimum spanning tree edges 1 to 2 weight 1, 1 to 3 weight 2, 3 to 4 weight 2, 0 to 2 weight 3 and 3 to 5 weight 5 are highlighted, total 13.">
  <rect class="d-box" x="40" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="70" y="157" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="57" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="240" y="267" text-anchor="middle">2</text>
  <rect class="d-box" x="390" y="130" width="60" height="44" rx="22"/>
  <text class="d-text" x="420" y="157" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="240" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="267" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="30" width="60" height="44" rx="22"/>
  <text class="d-text" x="590" y="57" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 96 136 L 212 66" fill="none"/>
  <text class="d-sub" x="140" y="88" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 96 168 L 212 248" fill="none"/>
  <text class="d-text d-accent" x="140" y="228" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 76 L 240 238" fill="none"/>
  <text class="d-text d-accent" x="256" y="162" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 268 66 L 392 140" fill="none"/>
  <text class="d-text d-accent" x="330" y="88" text-anchor="middle">2</text>
  <path class="d-edge-dashed" d="M 268 250 L 392 166" fill="none"/>
  <text class="d-sub" x="340" y="226" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 448 166 L 562 250" fill="none"/>
  <text class="d-text d-accent" x="500" y="226" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 448 140 L 562 64" fill="none"/>
  <text class="d-text d-accent" x="500" y="88" text-anchor="middle">5</text>
  <path class="d-edge-dashed" d="M 590 76 L 590 238" fill="none"/>
  <text class="d-sub" x="608" y="162" text-anchor="middle">6</text>
  <path class="d-edge-dashed" d="M 272 268 L 556 266" fill="none"/>
  <text class="d-sub" x="414" y="290" text-anchor="middle">7</text>
</svg>

This is the graph used in Example 1. The highlighted edges (weights 1, 2, 2, 3 and 5) are its minimum spanning tree, total 13. The dashed edges (4, 4, 6 and 7) are left out: each one would join two vertices that the highlighted edges already connect.

## 3. Why Greedy Works: the Cut Property

Both algorithms are **greedy**: they commit to the locally cheapest choice and never undo it. That is only safe because of one fact.

📌 **Interview term: Cut** — a split of the vertices into two non-empty groups. An edge **crosses** the cut if its two ends are in different groups.

📌 **Interview term: Cut property** — for any cut, the cheapest edge crossing it belongs to some minimum spanning tree. (If the cheapest crossing edge is unique, it belongs to every MST.) Proof sketch: take an MST without that edge, add it, and you get a cycle; that cycle must cross the cut a second time through a more expensive edge; swap them and the total does not go up.

📌 **Interview term: Cycle property** — the most expensive edge on any cycle is not needed (with distinct weights, it is in no MST). This is why skipping an edge that would close a cycle is safe.

- **Prim** applies the cut property literally: the cut is "the tree so far" versus "everything else", and it takes the cheapest crossing edge.
- **Kruskal** applies it implicitly: when it accepts edge (u, v), u and v are in different components; cut u's component from the rest, and since edges are taken in weight order, nothing cheaper crosses that cut.

📌 **Interview term: Greedy algorithm** — builds a solution step by step, always taking the best-looking option now. Greedy is correct only when a property like the cut property guarantees it.

## 4. The Two Algorithms Side by Side

### Kruskal: edges first, globally

1. Sort all edges by weight.
2. Start with every vertex in its own component ([Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure)).
3. For each edge (u, v) in order: if \`find(u) != find(v)\`, take it and \`union(u, v)\`; otherwise skip it (it would close a cycle).
4. Stop after V - 1 edges, or when the list runs out (then you have a spanning forest).

📌 **Interview term: Kruskal's algorithm** — the sorted-edges method above, published by Joseph Kruskal in "On the shortest spanning subtree of a graph and the traveling salesman problem", *Proceedings of the AMS* 7(1), 1956.

### Prim: one tree, growing outward

1. Mark a start vertex as "in the tree" and push every edge leaving it into a min-heap keyed by weight.
2. Pop the cheapest edge. If its far end is already in the tree, discard it. Otherwise add that vertex, add the weight, and push the vertex's edges to vertices not yet in the tree.
3. Repeat until the heap is empty.

📌 **Interview term: Prim's algorithm** — the grow-one-tree method above. It was described by Vojtěch Jarník in 1930 and independently by Robert Prim in the *Bell System Technical Journal* in 1957 (and again by Dijkstra in 1959), which is why it is also called the Jarník–Prim or DJP algorithm.

📌 **Interview term: Lazy deletion (stale entries)** — instead of updating a heap entry when a cheaper edge to the same vertex appears, push a new entry and **skip** old ones when they are popped. Simple, and the heap holds at most E entries. The eager alternative uses a decrease-key operation, which most standard library heaps do not offer.

Prim's loop looks almost identical to [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work). The one difference: Dijkstra keys the heap by **distance from the source** (\`dist[u] + w\`), Prim keys it by **the edge weight alone** (\`w\`). Mixing them up is a classic bug.

| | Kruskal | Prim (binary heap) |
| :--- | :--- | :--- |
| Grows | a forest of components that merge | a single tree from a start vertex |
| Main data structure | sorted edge list + union-find | adjacency list + min-heap |
| Picks next | the globally cheapest remaining edge | the cheapest edge leaving the tree |
| Time | O(E log E), which equals O(E log V) | O(E log V) |
| Best when | the graph is sparse, or given as an edge list | the graph is dense or given as adjacency lists |
| Disconnected graph | returns a minimum spanning forest | spans only the start vertex component |
| Can stop early | after V - 1 accepted edges | after V vertices are in the tree |

For **dense** graphs (E close to V²), the heap-free Prim that scans an array of "cheapest known edge to each vertex" runs in O(V²), which beats both heap-based versions there. Example 2 runs all three.

## 5. Both Algorithms in C++

### Kruskal

~~~cpp
int findRoot(vector<int>& parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving: skip to the grandparent
        x = parent[x];
    }
    return x;
}
~~~

~~~cpp
pair<int, int> kruskal(int n, vector<Edge> edges) {   // by value: we sort a copy
    vector<int> parent(n);
    for (int i = 0; i < n; ++i) parent[i] = i;
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return tie(a[2], a[0], a[1]) < tie(b[2], b[0], b[1]);
    });
    int total = 0, taken = 0;
    for (auto [u, v, w] : edges) {
        int ru = findRoot(parent, u), rv = findRoot(parent, v);
        if (ru == rv) {
            cout << "  skip " << u << "-" << v << " (w=" << w << "): both ends already connected\\n";
            continue;
        }
        parent[ru] = rv;
        total += w;
        ++taken;
        cout << "  take " << u << "-" << v << " (w=" << w << ")\\n";
        if (taken == n - 1) break;       // a spanning tree has exactly n - 1 edges
    }
    return {total, taken};
}
~~~

- \`edges\` is taken **by value**, so \`std::sort\` reorders a copy. The lambda compares \`std::tie(a[2], a[0], a[1]) < std::tie(b[2], b[0], b[1])\`: weight first, then the endpoints, lexicographically. \`std::sort\` is not stable, which is exactly why the comparator spells out every tie-breaker.
- \`Edge\` is \`std::array<int, 3>\`, so \`auto [u, v, w] : edges\` unpacks it with structured bindings.
- \`findRoot\` uses **path halving** (\`parent[x] = parent[parent[x]]\`). It is not called \`find\` to avoid confusion with \`std::find\` under \`using namespace std\`.

### Prim (lazy, with priority_queue)

~~~cpp
pair<int, int> prim(int n, const vector<Edge>& edges, int start) {
    vector<vector<pair<int, int>>> adj(n);
    for (auto [u, v, w] : edges) {
        adj[u].push_back({v, w});
        adj[v].push_back({u, w});
    }
    vector<bool> seen(n, false);
    seen[start] = true;
    // std::priority_queue is a max-heap; greater<> turns it into a min-heap of (weight, vertex, from)
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> heap;
    for (auto [v, w] : adj[start]) heap.push({w, v, start});
    int total = 0, count = 0;
    while (!heap.empty()) {
        auto [w, v, from] = heap.top();
        heap.pop();
        if (seen[v]) {
            cout << "  stale " << from << "-" << v << " (w=" << w << "): " << v << " already in the tree\\n";
            continue;
        }
        seen[v] = true;
        total += w;
        ++count;
        cout << "  add " << v << " via " << from << "-" << v << " (w=" << w << ")\\n";
        for (auto [next, nw] : adj[v]) if (!seen[next]) heap.push({nw, next, v});
    }
    return {total, count};
}
~~~

- \`std::priority_queue\` is a **max-heap** by default: \`top()\` is the largest element (cppreference, \`std::priority_queue\`). Passing \`std::greater<>\` as the third template argument flips it into a min-heap. The other common trick is pushing negated weights.
- \`std::tuple\` compares lexicographically, so \`(weight, vertex, from)\` breaks ties by vertex.
- \`auto [w, v, from] = heap.top();\` **copies** the top before \`heap.pop()\`. Binding a reference (\`const auto& t = heap.top();\`) and then calling \`pop()\` leaves a dangling reference, because \`pop()\` destroys that element.
- \`vector<bool>\` is a bit-packed specialisation; it is fine for \`seen\`, but you cannot take a \`bool&\` to one of its elements.

## 6. Verified: Running the Code

Each example on this page was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kruskal and Prim traced on the same graph** prints:

~~~text
Kruskal (edges sorted by weight):
  take 1-2 (w=1)
  take 1-3 (w=2)
  take 3-4 (w=2)
  take 0-2 (w=3)
  skip 0-1 (w=4): both ends already connected
  skip 2-3 (w=4): both ends already connected
  take 3-5 (w=5)
Kruskal total = 13 using 5 edges
Prim from vertex 0 (min-heap of crossing edges):
  add 2 via 0-2 (w=3)
  add 1 via 2-1 (w=1)
  add 3 via 1-3 (w=2)
  add 4 via 3-4 (w=2)
  stale 0-1 (w=4): 1 already in the tree
  stale 2-3 (w=4): 3 already in the tree
  add 5 via 3-5 (w=5)
  stale 4-5 (w=6): 5 already in the tree
  stale 2-4 (w=7): 4 already in the tree
Prim total = 13 using 5 edges
Disconnected graph, Kruskal:
  take 0-2 (w=1)
  take 0-1 (w=2)
  skip 1-2 (w=3): both ends already connected
  take 3-4 (w=5)
forest total = 8, edges = 3 (a tree would need 4)
Disconnected graph, Prim from 0:
  add 2 via 0-2 (w=1)
  add 1 via 0-1 (w=2)
  stale 2-1 (w=3): 1 already in the tree
Prim reached 3 of 5 vertices, total = 3
~~~

Reading it: Kruskal takes the four cheapest edges, skips 0-1 and 2-3 because their ends are already connected, takes 3-5 and stops at 5 edges without ever looking at weights 6 and 7. Prim adds the vertices in the order 2, 1, 3, 4, 5, and its "stale" lines are heap entries for vertices that had already joined the tree. Both pick the same five edges and total 13. On the disconnected graph, Kruskal returns a forest of 3 edges (weight 8) while Prim from 0 only reaches its own component.

**Example 2 — three MST algorithms on a sparse and a dense random graph** prints:

~~~text
sparse graph: V=1000, E=3000
  Kruskal     weight 195702 | sorted 3000 edges, examined 2918
  Prim heap   weight 195702 | 3001 heap pushes, 2001 stale pops
  Prim array  weight 195702 | 1000000 scan steps
  all three agree: true
dense graph: V=300, E=44850
  Kruskal     weight 1320 | sorted 44850 edges, examined 1173
  Prim heap   weight 1320 | 44851 heap pushes, 44551 stale pops
  Prim array  weight 1320 | 90000 scan steps
  all three agree: true
~~~

Reading it: all three algorithms agree on the weight every time. On the dense graph Kruskal must sort all 44 850 edges but only examines 1173 of them before it has 299 tree edges; the heap version pushes nearly every edge (44 851 pushes) and discards 44 551 of them as stale; the array version does 90 000 cheap scan steps and no heap work. On the sparse graph the picture flips: the array version's V² = 1 000 000 steps are far more than the heap's 3001 pushes.

## 7. Complexity

| Algorithm | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kruskal | O(E log E) | O(V + E) | the sort dominates; union-find operations are near O(1) each |
| Prim, lazy binary heap | O(E log E) = O(E log V) | O(V + E) | every edge can be pushed once, each push and pop is O(log E) |
| Prim, eager with decrease-key | O(E log V) | O(V) heap | at most V heap entries; needs an indexed heap |
| Prim, adjacency matrix and array | O(V²) | O(V²) matrix | V rounds, each scans V vertices; no heap at all |

log E and log V differ by at most a factor of 2, because E is at most V², so O(E log E) and O(E log V) are the same class. Example 2 makes the costs concrete: on the sparse graph (V = 1000, E = 3000) the array version needs 1 000 000 scan steps while the heap does 3001 pushes; on the dense graph (V = 300, E = 44 850) the array needs only 90 000 steps while the heap does 44 851 pushes, each costing a logarithmic number of swaps. See [Big-O notation](/interview-question/what-is-big-o-notation) and [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).

## 8. Which One Should You Pick?

- **Edge list given, sparse graph** (roads, cables, most interview inputs): **Kruskal**. Sorting is one library call and union-find is ten lines.
- **Dense graph or an adjacency matrix** (all pairs of points, as in "minimum cost to connect all points"): **Prim with an array**, O(V²), and no edge list of size V² has to be built and sorted.
- **Adjacency lists, medium density**: Prim with a heap; it never sorts all edges at once.
- **The graph may be disconnected**: Kruskal gives the minimum spanning forest for free; Prim must be restarted from each unvisited vertex.
- **Edges arrive over time** and you need the forest so far: Kruskal's union-find structure handles additions naturally if the edges arrive in sorted order.

Both return the same **total weight**. When several edges share a weight, they may return different edge sets, all equally minimal. If every weight is distinct, the MST is unique and both return exactly the same edges.

## 9. Edge Cases

- **One vertex, no edges:** the MST is empty, total 0.
- **Disconnected graph:** Kruskal accepts fewer than V - 1 edges (Example 1: 3 edges for 5 vertices); Prim reaches only part of the graph (3 of 5). Decide with the interviewer whether that is an error or a forest.
- **Parallel edges between the same pair:** both algorithms handle them; the cheaper one wins, the other is skipped as a cycle or a stale entry.
- **Self-loops:** Kruskal skips them because both ends have the same root; Prim skips them because the end is already in the tree.
- **Negative weights:** allowed. Unlike Dijkstra, MST algorithms only compare weights, so negative values are fine.
- **Equal weights:** the total is still minimal, but the chosen edges depend on tie-breaking. The examples break ties by vertex numbers so that every language prints the same trace.

## Common Pitfalls

- **Forgetting that \`priority_queue\` is a max-heap.** Without \`std::greater<>\` (or negated weights) Prim pops the most expensive edge first and builds a maximum spanning tree.
- **Holding a reference to \`top()\` across \`pop()\`.** Copy the element first; \`pop()\` destroys it.
- **A comparator that is not a strict weak ordering**, such as using \`<=\`. \`std::sort\` requires strict ordering; \`<=\` is undefined behaviour and can crash or loop.
- **\`int\` totals.** Sum weights in \`long long\`; V - 1 large weights overflow \`int\`, and signed overflow is undefined behaviour.
- **Keying Prim's heap by distance** (\`dist + w\`) instead of the edge weight \`w\`. That is Dijkstra.
- **Assuming the graph is connected.** Check the number of accepted edges or visited vertices before returning.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Goal:</strong> <span style="color:#f0e2c8;">An MST connects all V vertices with V - 1 edges of minimum total weight, on an undirected weighted graph.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kruskal:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> the edges with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::tie</code> comparator; take each edge whose ends have different union-find roots. O(E log E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prim:</strong> <span style="color:#f0e2c8;">Grow one tree with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;..., greater&lt;&gt;&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(w, v)</code>; skip popped entries whose vertex is already in. O(E log V).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why correct:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">cut property</strong>: the cheapest edge crossing any cut is safe, so greedy choices never need undoing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is a max-heap by default, so I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code>; I copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and sum in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do they always return the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same total weight, always; the same edges only when all weights are distinct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is Prim different from Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, different key: Prim uses the edge weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, Dijkstra uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why lazy deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> has no decrease-key; pushing duplicates and skipping stale ones keeps it simple and O(E log V).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which for a dense graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The O(V²) array Prim over an adjacency matrix: no heap, no sort of V² edges.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Negative weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fine for both; MST algorithms only compare weights.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Spanning tree** | V - 1 edges that connect every vertex, with no cycle |
| **Minimum spanning tree (MST)** | the spanning tree with the smallest total weight |
| **Minimum spanning forest** | one MST per connected component of a disconnected graph |
| **Cut** | a split of the vertices into two groups; crossing edges join the groups |
| **Cut property** | the cheapest edge across any cut is safe to take |
| **Cycle property** | the heaviest edge on a cycle is never needed |
| **Greedy algorithm** | always takes the best-looking option now, never undoes it |
| **Kruskal's algorithm** | sort edges, take each one that joins two components |
| **Prim's algorithm** | grow one tree, always adding the cheapest edge leaving it |
| **Lazy deletion (stale entries)** | push duplicates into the heap and skip outdated ones when popped |
| **\`std::priority_queue\`** | C++ heap adaptor, a max-heap unless given \`std::greater<>\` |

---
**Conclusion:** Kruskal and Prim solve the same problem with the same guarantee, the cut property, from opposite directions. Kruskal looks at edges globally: sort them, then let union-find reject every edge that would close a cycle. Prim looks outward from one tree: a min-heap hands it the cheapest edge leaving the tree, and stale entries are skipped. Both are O(E log V); Kruskal suits sparse edge lists and disconnected graphs, Prim suits adjacency lists, and its heap-free O(V²) form wins on dense graphs. In C++, the marks are remembering that \`priority_queue\` is a max-heap, a strict comparator for \`std::sort\`, and \`long long\` totals.
`,
        examples: [
          { label: `Kruskal and Prim traced on the same graph, plus a disconnected graph`, code: `#include <algorithm>
#include <array>
#include <functional>
#include <iostream>
#include <queue>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;

// Kruskal and Prim on the same weighted undirected graph, with a trace of every decision.
using Edge = array<int, 3>;   // {u, v, w}

int findRoot(vector<int>& parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving: skip to the grandparent
        x = parent[x];
    }
    return x;
}

pair<int, int> kruskal(int n, vector<Edge> edges) {   // by value: we sort a copy
    vector<int> parent(n);
    for (int i = 0; i < n; ++i) parent[i] = i;
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return tie(a[2], a[0], a[1]) < tie(b[2], b[0], b[1]);
    });
    int total = 0, taken = 0;
    for (auto [u, v, w] : edges) {
        int ru = findRoot(parent, u), rv = findRoot(parent, v);
        if (ru == rv) {
            cout << "  skip " << u << "-" << v << " (w=" << w << "): both ends already connected\\n";
            continue;
        }
        parent[ru] = rv;
        total += w;
        ++taken;
        cout << "  take " << u << "-" << v << " (w=" << w << ")\\n";
        if (taken == n - 1) break;       // a spanning tree has exactly n - 1 edges
    }
    return {total, taken};
}

pair<int, int> prim(int n, const vector<Edge>& edges, int start) {
    vector<vector<pair<int, int>>> adj(n);
    for (auto [u, v, w] : edges) {
        adj[u].push_back({v, w});
        adj[v].push_back({u, w});
    }
    vector<bool> seen(n, false);
    seen[start] = true;
    // std::priority_queue is a max-heap; greater<> turns it into a min-heap of (weight, vertex, from)
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> heap;
    for (auto [v, w] : adj[start]) heap.push({w, v, start});
    int total = 0, count = 0;
    while (!heap.empty()) {
        auto [w, v, from] = heap.top();
        heap.pop();
        if (seen[v]) {
            cout << "  stale " << from << "-" << v << " (w=" << w << "): " << v << " already in the tree\\n";
            continue;
        }
        seen[v] = true;
        total += w;
        ++count;
        cout << "  add " << v << " via " << from << "-" << v << " (w=" << w << ")\\n";
        for (auto [next, nw] : adj[v]) if (!seen[next]) heap.push({nw, next, v});
    }
    return {total, count};
}

int main() {
    vector<Edge> edges = {{0, 1, 4}, {0, 2, 3}, {1, 2, 1}, {1, 3, 2}, {2, 3, 4}, {3, 4, 2}, {3, 5, 5}, {4, 5, 6}, {2, 4, 7}};
    cout << "Kruskal (edges sorted by weight):\\n";
    auto [kTotal, kEdges] = kruskal(6, edges);
    cout << "Kruskal total = " << kTotal << " using " << kEdges << " edges\\n";
    cout << "Prim from vertex 0 (min-heap of crossing edges):\\n";
    auto [pTotal, pEdges] = prim(6, edges, 0);
    cout << "Prim total = " << pTotal << " using " << pEdges << " edges\\n";

    // A graph in two pieces: Kruskal returns a spanning forest, Prim only spans the start piece.
    vector<Edge> forest = {{0, 1, 2}, {1, 2, 3}, {0, 2, 1}, {3, 4, 5}};
    cout << "Disconnected graph, Kruskal:\\n";
    auto [fTotal, fEdges] = kruskal(5, forest);
    cout << "forest total = " << fTotal << ", edges = " << fEdges << " (a tree would need 4)\\n";
    cout << "Disconnected graph, Prim from 0:\\n";
    auto [gTotal, gEdges] = prim(5, forest, 0);
    cout << "Prim reached " << gEdges + 1 << " of 5 vertices, total = " << gTotal << "\\n";
}
` },
          { label: `Three MST algorithms agree; their work on sparse vs dense graphs`, code: `#include <algorithm>
#include <array>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;

// Same MST weight from three algorithms, and how much work each does on a sparse vs a dense graph.
using Edge = array<int, 3>;   // {u, v, w}
long long seed = 12345;

int rnd() {
    seed = seed * 48271 % 2147483647LL;   // small LCG; 64-bit arithmetic, so no overflow
    return (int)seed;
}

vector<Edge> sparseGraph(int n, int m) {
    vector<Edge> edges;
    for (int v = 1; v < n; ++v) {          // a random tree first, so the graph is connected
        int u = rnd() % v;
        edges.push_back({u, v, rnd() % 1000 + 1});
    }
    while ((int)edges.size() < m) {
        int u = rnd() % n, v = rnd() % n;
        if (u != v) edges.push_back({min(u, v), max(u, v), rnd() % 1000 + 1});
    }
    return edges;
}

vector<Edge> denseGraph(int n) {
    vector<Edge> edges;
    for (int u = 0; u < n; ++u)
        for (int v = u + 1; v < n; ++v) edges.push_back({u, v, rnd() % 1000 + 1});
    return edges;
}

int findRoot(vector<int>& parent, int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
}

pair<long long, int> kruskal(int n, vector<Edge> edges) {
    vector<int> parent(n);
    for (int i = 0; i < n; ++i) parent[i] = i;
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) { return tie(a[2], a[0], a[1]) < tie(b[2], b[0], b[1]); });
    long long total = 0;
    int taken = 0, examined = 0;
    for (auto [u, v, w] : edges) {
        ++examined;
        int ru = findRoot(parent, u), rv = findRoot(parent, v);
        if (ru != rv) {
            parent[ru] = rv;
            total += w;
            if (++taken == n - 1) break;
        }
    }
    return {total, examined};
}

tuple<long long, int, int> primHeap(int n, const vector<Edge>& edges) {
    vector<vector<pair<int, int>>> adj(n);
    for (auto [u, v, w] : edges) { adj[u].push_back({v, w}); adj[v].push_back({u, w}); }
    vector<bool> seen(n, false);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap;   // min-heap of (weight, vertex)
    heap.push({0, 0});
    long long total = 0;
    int pushes = 1, stale = 0;
    while (!heap.empty()) {
        auto [w, v] = heap.top();
        heap.pop();
        if (seen[v]) { ++stale; continue; }
        seen[v] = true;
        total += w;
        for (auto [next, nw] : adj[v]) if (!seen[next]) { heap.push({nw, next}); ++pushes; }
    }
    return {total, pushes, stale};
}

pair<long long, long long> primArray(int n, const vector<Edge>& edges) {
    const int INF = 1000000000;
    vector<vector<int>> cost(n, vector<int>(n, INF));
    for (auto [u, v, w] : edges) if (w < cost[u][v]) cost[u][v] = cost[v][u] = w;
    vector<int> best(n, INF);              // cheapest known edge from the tree to each vertex
    best[0] = 0;
    vector<bool> inTree(n, false);
    long long total = 0, steps = 0;
    for (int k = 0; k < n; ++k) {
        int u = -1;
        for (int v = 0; v < n; ++v) {      // O(V) scan for the closest vertex, no heap
            ++steps;
            if (!inTree[v] && (u == -1 || best[v] < best[u])) u = v;
        }
        inTree[u] = true;
        total += best[u];
        for (int v = 0; v < n; ++v) if (!inTree[v] && cost[u][v] < best[v]) best[v] = cost[u][v];
    }
    return {total, steps};
}

int main() {
    cout << boolalpha;
    string names[] = {"sparse", "dense"};
    int sizes[] = {1000, 300};
    for (int g = 0; g < 2; ++g) {
        int n = sizes[g];
        vector<Edge> edges = g == 0 ? sparseGraph(n, 3000) : denseGraph(n);
        cout << names[g] << " graph: V=" << n << ", E=" << edges.size() << "\\n";
        auto [k, examined] = kruskal(n, edges);
        auto [p, pushes, stale] = primHeap(n, edges);
        auto [a, steps] = primArray(n, edges);
        cout << "  Kruskal     weight " << k << " | sorted " << edges.size() << " edges, examined " << examined << "\\n";
        cout << "  Prim heap   weight " << p << " | " << pushes << " heap pushes, " << stale << " stale pops\\n";
        cout << "  Prim array  weight " << a << " | " << steps << " scan steps\\n";
        cout << "  all three agree: " << (k == p && p == a) << "\\n";
    }
}
` },
        ],
      },
    },
  },
  {
    title: `How do you find strongly connected components in a directed graph?`,
    difficulty: "hard",
    seoDescription: `Strongly connected components in Python, JavaScript, Java and C++: Kosaraju two-pass DFS, Tarjan low-links, the condensation DAG, iterative DFS.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a directed graph with n vertices and a list of edges, group the vertices into strongly connected components, where every vertex in a group can reach every other one. Walk me through an O(V + E) approach and code it in Python."

**What a strong answer should cover:**
- The definition: u and v are in the same SCC exactly when u reaches v and v reaches u; SCCs partition the vertices, and every directed cycle lies inside one SCC.
- Why the naive approach (a BFS or DFS from every vertex, then compare reachability) is O(V · (V + E)), and that linear-time algorithms exist.
- Kosaraju: DFS to record finish order, then DFS the reversed graph in decreasing finish order; each tree of the second pass is one SCC. Or Tarjan: one DFS with discovery indices, low-links and a stack.
- The condensation: contracting each SCC to one node gives a DAG, which is what makes SCCs useful (topological order, 2-SAT, dependency groups).
- Python specifics: adjacency as a list of lists; recursive DFS is fine for small inputs but hits the default recursion limit of 1000 (a 100 000-vertex path raised \`RecursionError\`), so production code uses an explicit stack, or \`sys.setrecursionlimit\` with care.

**Clarifying questions expected:**
- "Can there be self-loops or duplicate edges? Are the vertices numbered 0 to n - 1?"
- "How large can the graph be? Is deep recursion a concern?"
- "Should the components come out in any particular order?"

**Code / implementation expected:** Yes — Kosaraju or Tarjan in Python, returning the list of components; an iterative version is a strong bonus.`,
        answer: `**Target Audience:** Interview candidates who know BFS and DFS on graphs; strongly connected components are explained from scratch
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a city where every street is **one-way**. From your house you can drive to the bakery, but maybe there is no legal route back. Some neighbourhoods are friendly: inside them, you can get from any corner to any other corner and back again. Others are traps: once you drive out of the old town onto the ring road, no street ever leads you back in.

A city planner wants to know those friendly neighbourhoods. Within one of them, a delivery van can serve every address and return to its depot. Between them, traffic only flows one way, so the neighbourhoods themselves line up like a river system: upstream areas feed downstream ones, and nothing flows back up.

Those friendly neighbourhoods are the **strongly connected components** of the street graph. Finding them is a classic hard interview question because the simple idea, "check every pair of corners in both directions", is far too slow, and the fast algorithms are two clever uses of depth-first search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the graph directed? | SCCs only make sense for directed graphs. For an undirected graph, plain [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) are the answer. |
| How are vertices numbered, and can there be self-loops or duplicate edges? | 0..n-1 lets you use arrays. Self-loops and duplicates are harmless for both algorithms but worth confirming. |
| How large can V and E get? | Above a few thousand vertices on a long path, recursive DFS can overflow the stack; plan an iterative version. |
| What output do you want: the groups, a component id per vertex, or just the count? | Changes the return type, and whether you also need the condensation graph. |
| Does the order of the components matter? | Kosaraju naturally outputs them in topological order of the condensation, Tarjan in reverse topological order. |

## 3. The Core Idea

📌 **Interview term: Reachability** — vertex v is reachable from u if there is a directed path from u to v (following the arrows).

📌 **Interview term: Strongly connected component (SCC)** — a maximal set of vertices in which every vertex is reachable from every other one. "Maximal" means you cannot add another vertex and keep that property. Every vertex belongs to exactly one SCC (possibly just itself), so the SCCs partition the graph, and every directed cycle lies entirely inside one SCC.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Directed graph with nine vertices grouped into four strongly connected components: 0 1 2 form a cycle, 3 4 5 form a cycle, 6 and 7 point at each other, and 8 is alone. Edge 2 to 3 and edge 6 to 5 connect the groups.">
  <defs>
    <marker id="scc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="240" width="250" height="80" rx="14"/>
  <rect class="d-box-muted" x="610" y="240" width="76" height="80" rx="14"/>
  <rect class="d-box" x="40" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="67" y="66" text-anchor="middle">0</text>
  <rect class="d-box" x="196" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="223" y="66" text-anchor="middle">1</text>
  <rect class="d-box" x="118" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="145" y="166" text-anchor="middle">2</text>
  <path class="d-edge" d="M 96 60 L 188 60" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 214 82 L 170 136" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 122 138 L 78 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="428" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="455" y="66" text-anchor="middle">4</text>
  <rect class="d-box" x="506" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="166" text-anchor="middle">5</text>
  <path class="d-edge" d="M 386 138 L 432 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 478 82 L 522 134" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 160 L 412 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 174 160 L 342 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="286" text-anchor="middle">6</text>
  <rect class="d-box" x="506" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="286" text-anchor="middle">7</text>
  <path class="d-edge" d="M 406 274 L 498 274" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 290 L 412 290" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 390 258 L 520 186" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="621" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="648" y="286" text-anchor="middle">8</text>
</svg>

This is the graph in the examples: edges 0→1, 1→2, 2→0, 2→3, 3→4, 4→5, 5→3, 6→5, 6→7, 7→6, and vertex 8 with no edges. The shaded groups are its four SCCs: {0, 1, 2}, {3, 4, 5}, {6, 7} and {8}. The two highlighted edges, 2→3 and 6→5, run **between** components, and no path leads back, which is why 2 and 3 are in different components even though 2 reaches 3.

📌 **Interview term: Condensation (component graph)** — the graph you get by shrinking every SCC to a single node and keeping one edge between two components when any original edge connects them. It is always a **DAG** (directed acyclic graph): if two components could reach each other, they would be one component.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 200" role="img" aria-label="Condensation DAG: component of 6 and 7 points to the component of 3 4 5, and the component of 0 1 2 also points to it. The component of 8 has no edges.">
  <defs>
    <marker id="scc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="61" text-anchor="middle">{0, 1, 2}</text>
  <rect class="d-box" x="30" y="120" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="151" text-anchor="middle">{6, 7}</text>
  <rect class="d-box-accent" x="260" y="75" width="130" height="50" rx="10"/>
  <text class="d-text" x="325" y="106" text-anchor="middle">{3, 4, 5}</text>
  <rect class="d-box-muted" x="460" y="75" width="110" height="50" rx="10"/>
  <text class="d-text" x="515" y="106" text-anchor="middle">{8}</text>
  <path class="d-edge" d="M 162 60 L 252 92" fill="none" marker-end="url(#scc2-arrow)"/>
  <path class="d-edge" d="M 162 140 L 252 110" fill="none" marker-end="url(#scc2-arrow)"/>
</svg>

The condensation has no cycles, so it has a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used). The component {3, 4, 5} is a **sink**: nothing leaves it. That observation is the key to Kosaraju's algorithm.

### Brute force first

For every vertex, run a BFS to find everything it reaches, then u and v share a component when each is in the other's reachable set. That is V searches of O(V + E) each: O(V · (V + E)) time and O(V²) memory for the reachability table. Fine for 100 vertices, hopeless for 100 000. Both algorithms below do it in one or two DFS passes: O(V + E).

## 4. Kosaraju's Algorithm: Two DFS Passes

📌 **Interview term: Finish order (post-order)** — the order in which a DFS finishes vertices: a vertex finishes after all vertices reachable from it through unvisited paths have finished.

📌 **Interview term: Transpose graph** — the same vertices with every edge reversed. A graph and its transpose have exactly the same SCCs (reversing every arrow keeps "u reaches v and v reaches u"), but the edges of the condensation are reversed.

The algorithm:

1. Run a DFS over the whole graph and record vertices in **finish order**.
2. Build the transpose.
3. Take vertices in **decreasing** finish order. Each time you meet an unassigned vertex, DFS from it **in the transpose**; every vertex that DFS reaches is one SCC.

**Why it works, in two sentences.** The vertex that finishes last in pass 1 lies in a **source** component of the condensation (nothing outside points into it). In the transpose that component becomes a sink, so a DFS started there cannot leak into any other component; remove it, and the next-latest finisher sits in a source of what remains, and so on.

It is credited to S. Rao Kosaraju (1978) and was published by Micha Sharir in 1981, which is why some books call it the Kosaraju–Sharir algorithm.

## 5. Tarjan's Algorithm: One DFS With Low-Links

Tarjan's algorithm finds the same components in a single DFS, without building the transpose.

📌 **Interview term: Discovery index** — a counter value given to each vertex the moment DFS first visits it: 0, 1, 2, ...

📌 **Interview term: Low-link** — for a vertex u, the smallest discovery index reachable from u's DFS subtree using tree edges plus at most one edge back to a vertex that is **still on the stack**. If \`low[u] == index[u]\`, nothing below u can climb above it, so u is the root of a component.

The algorithm:

1. On visiting u: set \`index[u] = low[u] = counter++\`, push u on a stack, mark it on-stack.
2. For each edge u → v: if v is unvisited, recurse, then \`low[u] = min(low[u], low[v])\`. If v is visited **and still on the stack**, \`low[u] = min(low[u], index[v])\`. If v is visited but no longer on the stack, it belongs to a finished component: ignore it.
3. After the loop, if \`low[u] == index[u]\`, pop the stack down to and including u. Those vertices are one SCC.

📌 **Interview term: On-stack check** — the condition "v is still on the stack" is what separates an edge back into the current, unfinished component (which lowers the low-link) from an edge into a component that is already complete (which must not).

It was published by Robert Tarjan in "Depth-First Search and Linear Graph Algorithms", *SIAM Journal on Computing* 1(2), 1972, with linear time and space bounds. Tarjan emits components in **reverse topological order** of the condensation (sinks first); Kosaraju emits them in topological order (sources first). Example 2 checks that claim on 300 random graphs instead of asserting it.

| | Kosaraju | Tarjan |
| :--- | :--- | :--- |
| DFS passes | 2 (graph, then transpose) | 1 |
| Extra memory | the transpose graph, O(V + E) | index, low-link, on-stack flag and stack, O(V) |
| Output order | topological order of the condensation | reverse topological order |
| Easier to | explain and get right | write once you know it; no transpose |

## 6. The Code in Python

### Kosaraju (Example 1)

~~~python
def kosaraju(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]          # the transpose: every edge reversed
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)

    seen = [False] * n
    order = []                             # vertices in the order their DFS finished

    def dfs1(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]:
                dfs1(v)
        order.append(u)                    # post-order: appended after all descendants

    for u in range(n):
        if not seen[u]:
            dfs1(u)

    comp = [-1] * n
    comps = []

    def dfs2(u, c):
        comp[u] = c
        comps[c].append(u)
        for v in radj[u]:
            if comp[v] == -1:
                dfs2(v, c)

    for u in reversed(order):              # latest finisher first
        if comp[u] == -1:
            comps.append([])
            dfs2(u, len(comps) - 1)
    return order, comps, comp
~~~

- \`adj\` and \`radj\` are lists of lists built in one loop: \`adj[u].append(v)\` and \`radj[v].append(u)\`, so the transpose costs one extra append per edge.
- \`dfs1\` appends \`u\` to \`order\` **after** its loop: that is post-order, so \`order\` is the finish order.
- \`reversed(order)\` walks it latest-finisher-first without copying the list.
- The nested functions read and mutate \`seen\`, \`order\`, \`comp\` and \`comps\` from the enclosing scope. They mutate the lists (allowed), never rebind the names, so no \`nonlocal\` is needed here.

### Tarjan (Example 2)

~~~python
def tarjan(n, adj):
    index = [-1] * n                     # discovery time of each vertex
    low = [0] * n                        # smallest index reachable while staying in the DFS subtree + one back edge
    on_stack = [False] * n
    stack, comps = [], []
    counter = 0

    def dfs(u):
        nonlocal counter
        index[u] = low[u] = counter
        counter += 1
        stack.append(u)
        on_stack[u] = True
        for v in adj[u]:
            if index[v] == -1:           # tree edge: recurse, then inherit the child low-link
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:            # edge back into the current, unfinished component
                low[u] = min(low[u], index[v])
        if low[u] == index[u]:           # u is the root of a component: pop it off
            comp = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp.append(w)
                if w == u:
                    break
            comps.append(sorted(comp))

    for u in range(n):
        if index[u] == -1:
            dfs(u)
    return comps, index, low
~~~

- \`counter\` **is** rebound (\`counter += 1\`), so it needs \`nonlocal counter\`; forgetting it raises \`UnboundLocalError\`.
- \`index[u] = low[u] = counter\` is chained assignment: both get the same value.
- \`on_stack\` is a separate list of booleans so the "still on the stack?" test is O(1); \`v in stack\` would be O(V).
- Recursion depth equals the DFS depth. A 100 000-vertex path raised \`RecursionError\` with the default limit of 1000 in a test run. Calling \`sys.setrecursionlimit(300000)\` first let the same run finish on Python 3.13, but that is a global setting and the safe ceiling depends on the interpreter build and platform, so for big inputs the iterative version in Example 3 is the robust answer.

### Iterative DFS (Example 3)

Each stack frame is a two-element list \`[vertex, index of the next edge to try]\`, which is exactly what the call stack would remember:

~~~python
# pass 1: explicit stack of [vertex, index of the next edge to try]
seen = [False] * n
order = []
for s in range(n):
    if seen[s]:
        continue
    seen[s] = True
    stack = [[s, 0]]
    while stack:
        frame = stack[-1]
        u, i = frame
        if i < len(adj[u]):
            frame[1] = i + 1
            v = adj[u][i]
            if not seen[v]:
                seen[v] = True
                stack.append([v, 0])
        else:
            stack.pop()
            order.append(u)              # finished: all edges of u were tried
~~~

\`frame[1] = i + 1\` updates the frame in place before pushing a child, so when the child finishes, the parent resumes at its next edge. The vertex is appended to \`order\` only when all its edges are used: the same post-order as the recursive version. Pass 2 does not care about order inside a component, so a simple flood fill with a list as a stack is enough.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS from every vertex | O(V · (V + E)) | O(V²) | V full searches plus a reachability table |
| Kosaraju | O(V + E) | O(V + E) | two DFS passes; the transpose has E edges |
| Tarjan | O(V + E) | O(V) beyond the graph | one DFS; each vertex is pushed and popped once |
| Iterative Kosaraju (Example 3) | O(V + E) | O(V + E) | same work; the explicit stack replaces the call stack |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why a recursive DFS needs O(V) stack in the worst case (a long path).

## 8. Verified: Running the Code

Each example on this page was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kosaraju with its finish order** prints:

~~~text
finish order of pass 1: [5, 4, 3, 2, 1, 0, 7, 6, 8]
pass 2 found component 0: [8]
pass 2 found component 1: [6, 7]
pass 2 found component 2: [0, 1, 2]
pass 2 found component 3: [3, 4, 5]
component id of each vertex: [2, 2, 2, 3, 3, 3, 1, 1, 0]
condensation edges: C1->C3, C2->C3
~~~

Reading it: vertex 8 finished last, so pass 2 starts there and finds {8} alone; then 6 finds {6, 7}; then 0 finds {0, 1, 2}; then 3 finds {3, 4, 5}. The components come out as C0 to C3 in a topological order of the condensation, and the two condensation edges, C1->C3 and C2->C3, both point forward.

**Example 2 — Tarjan, checked against Kosaraju** prints:

~~~text
Tarjan completes components in this order:
  [3, 4, 5]
  [0, 1, 2]
  [6, 7]
  [8]
index: [0, 1, 2, 3, 4, 5, 6, 7, 8]
low:   [0, 0, 0, 3, 3, 3, 6, 6, 8]
random graphs: 300, same partition as Kosaraju: 300, Tarjan order is reverse topological: 300
~~~

Reading it: Tarjan completes {3, 4, 5} first, because it is a sink, and the roots of the components are exactly the vertices with \`low == index\` (0, 3, 6 and 8). On 300 random directed graphs with up to 40 vertices, Tarjan and Kosaraju produced the same partition every time, and Tarjan's output order was always reverse topological: every edge goes from a later-emitted component to an earlier-emitted one, or stays inside one.

**Example 3 — iterative Kosaraju on 100 000 vertices** prints:

~~~text
one long path: 100000 vertices, 99999 edges -> 100000 SCCs, largest SCC size 1
path closed into a ring: 100000 vertices, 100000 edges -> 1 SCCs, largest SCC size 100000
1000 rings in a row: 100000 vertices, 100999 edges -> 1000 SCCs, largest SCC size 100
rings plus one back edge: 100000 vertices, 101000 edges -> 1 SCCs, largest SCC size 100000
~~~

Reading it: a path is a DAG, so every vertex is its own SCC; closing it into a ring makes one SCC of everything; 1000 rings chained forward stay 1000 SCCs; one back edge from the last ring to the first merges them all. Each run goes 100 000 vertices deep, with no recursion at all.

## 9. Where SCCs Are Used

- **Detecting directed cycles, with detail.** A graph has a directed cycle exactly when some SCC has more than one vertex or a self-loop. Plain [directed cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) answers yes or no; SCCs tell you every group of mutually dependent nodes, which is what a build tool reports for circular imports, or a scheduler for a [course schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) that cannot be finished.
- **Turning any directed graph into a DAG.** After condensation you can run DP or [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) on components, for example "the maximum total value collectable on a walk" where a walk may loop inside a component.
- **2-SAT.** A boolean formula of two-literal clauses is satisfiable exactly when no variable shares an SCC with its negation in the implication graph.
- **Social and web graphs:** groups of accounts that all follow each other, link farms of pages pointing at each other.

SCCs are a directed-graph tool. For undirected graphs every connected component is already "strongly" connected, and [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) or BFS is enough.

## 10. Edge Cases

- **No edges:** every vertex is its own SCC (vertex 8 in the examples).
- **Self-loop u → u:** u is still a one-vertex SCC; the self-loop does not merge it with anything.
- **Duplicate edges:** harmless; the second copy finds its target already visited.
- **A single big cycle:** one SCC containing all vertices (Example 3: "path closed into a ring").
- **A DAG:** every SCC has size 1 (Example 3: "one long path" gives 100 000 SCCs).
- **Deep graphs:** a path of 100 000 vertices makes a recursive DFS 100 000 calls deep; see the stack notes for your language below.

## Common Pitfalls

- **Recursion on big graphs.** A 100 000-vertex path raised \`RecursionError\` with the default limit. \`sys.setrecursionlimit\` can lift it (it worked at 300 000 on Python 3.13 in a test), but the explicit-stack version needs no global setting.
- **Forgetting \`nonlocal counter\`** in a nested Tarjan DFS: \`counter += 1\` then raises \`UnboundLocalError\`.
- **Lowering a low-link through a finished component.** Without the \`on_stack[v]\` check, the edge 2→3 into the already-finished {3, 4, 5} would wrongly merge components.
- **Running pass 2 on the original graph** instead of the transpose in Kosaraju: it leaks from one component into the components downstream of it.
- **Using finish order ascending** instead of descending in pass 2.
- **\`v in stack\`** on a Python list is O(V); keep a parallel boolean list.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An SCC is a maximal set where every vertex reaches every other; SCCs partition the vertices, and shrinking them gives a DAG, the condensation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kosaraju:</strong> <span style="color:#f0e2c8;">DFS once and record finish order; reverse every edge; DFS the reversed graph in decreasing finish order. Each tree is one SCC.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tarjan:</strong> <span style="color:#f0e2c8;">One DFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> and a stack: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low[u]</code> is the smallest index reachable back on the stack; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low[u] == index[u]</code>, pop a component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time; Kosaraju stores the transpose, Tarjan only O(V) extra arrays.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">The default recursion limit is 1000, so for big graphs I write the DFS with an explicit stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[vertex, next_edge]</code> frames.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why reverse the graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transpose has the same SCCs but reversed condensation edges, so the source component found last in pass 1 becomes a sink and its DFS cannot escape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the on-stack check in Tarjan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A visited vertex that is off the stack belongs to a finished component; using its index would merge two different SCCs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do components come out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kosaraju: topological order of the condensation. Tarjan: reverse topological order. Example 2 checks it on 300 graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the condensation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Map each vertex to its component id, then add an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(comp[u], comp[v])</code> for every edge whose ends differ, deduplicated with a set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then SCCs are just connected components; BFS or union-find is simpler.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachability** | v can be reached from u by following directed edges |
| **Strongly connected component (SCC)** | a maximal group in which every vertex reaches every other |
| **Condensation** | the DAG obtained by shrinking each SCC to one node |
| **Finish order (post-order)** | the order in which DFS finishes vertices |
| **Transpose graph** | the graph with every edge reversed; same SCCs |
| **Discovery index** | the visit counter value DFS gives each vertex |
| **Low-link** | smallest index reachable from a subtree with one edge back to the stack |
| **On-stack check** | only edges to vertices still on the stack may lower a low-link |
| **\`nonlocal\`** | lets a nested function rebind a variable of the enclosing function |

---
**Conclusion:** A strongly connected component is a maximal group of vertices that can all reach each other, and shrinking the components turns any directed graph into a DAG. Checking reachability pair by pair is O(V · (V + E)); Kosaraju does it in O(V + E) with two DFS passes, finish order on the graph then trees on the transpose, and Tarjan does it in one DFS by tracking discovery indices, low-links and a stack. They return the same partition, in opposite topological orders. In Python, the recursive versions are short and clear, but the 1000-frame recursion limit means a production answer uses an explicit stack.
`,
        examples: [
          { label: `Kosaraju: finish order, reversed graph, condensation edges`, code: `# Kosaraju: DFS once to get finish order, then DFS the reversed graph in reverse finish order.
N = 9
EDGES = [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3), (6, 5), (6, 7), (7, 6)]


def fmt(xs):
    return "[" + ", ".join(fmt(x) if isinstance(x, list) else str(x) for x in xs) + "]"


def kosaraju(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]          # the transpose: every edge reversed
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)

    seen = [False] * n
    order = []                             # vertices in the order their DFS finished

    def dfs1(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]:
                dfs1(v)
        order.append(u)                    # post-order: appended after all descendants

    for u in range(n):
        if not seen[u]:
            dfs1(u)

    comp = [-1] * n
    comps = []

    def dfs2(u, c):
        comp[u] = c
        comps[c].append(u)
        for v in radj[u]:
            if comp[v] == -1:
                dfs2(v, c)

    for u in reversed(order):              # latest finisher first
        if comp[u] == -1:
            comps.append([])
            dfs2(u, len(comps) - 1)
    return order, comps, comp


order, comps, comp = kosaraju(N, EDGES)
print("finish order of pass 1: " + fmt(order))
for i, c in enumerate(comps):
    print("pass 2 found component " + str(i) + ": " + fmt(sorted(c)))
print("component id of each vertex: " + fmt(comp))

dag = sorted({(comp[u], comp[v]) for u, v in EDGES if comp[u] != comp[v]})
print("condensation edges: " + ", ".join("C" + str(a) + "->C" + str(b) for a, b in dag))
` },
          { label: `Tarjan low-links, checked against Kosaraju on 300 random graphs`, code: `# Tarjan: one DFS with discovery indices, low-links and a stack; checked against Kosaraju.

def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def tarjan(n, adj):
    index = [-1] * n                     # discovery time of each vertex
    low = [0] * n                        # smallest index reachable while staying in the DFS subtree + one back edge
    on_stack = [False] * n
    stack, comps = [], []
    counter = 0

    def dfs(u):
        nonlocal counter
        index[u] = low[u] = counter
        counter += 1
        stack.append(u)
        on_stack[u] = True
        for v in adj[u]:
            if index[v] == -1:           # tree edge: recurse, then inherit the child low-link
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:            # edge back into the current, unfinished component
                low[u] = min(low[u], index[v])
        if low[u] == index[u]:           # u is the root of a component: pop it off
            comp = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp.append(w)
                if w == u:
                    break
            comps.append(sorted(comp))

    for u in range(n):
        if index[u] == -1:
            dfs(u)
    return comps, index, low


def kosaraju(n, adj):
    radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)
    seen, order = [False] * n, []

    def dfs1(u):
        seen[u] = True
        for v in adj[u]:
            if not seen[v]:
                dfs1(v)
        order.append(u)

    for u in range(n):
        if not seen[u]:
            dfs1(u)
    comp, comps = [-1] * n, []

    def dfs2(u, c):
        comp[u] = c
        comps[c].append(u)
        for v in radj[u]:
            if comp[v] == -1:
                dfs2(v, c)

    for u in reversed(order):
        if comp[u] == -1:
            comps.append([])
            dfs2(u, len(comps) - 1)
    return [sorted(c) for c in comps]


N = 9
EDGES = [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3), (6, 5), (6, 7), (7, 6)]
adj = [[] for _ in range(N)]
for u, v in EDGES:
    adj[u].append(v)
comps, index, low = tarjan(N, adj)
print("Tarjan completes components in this order:")
for c in comps:
    print("  " + fmt(c))
print("index: " + fmt(index))
print("low:   " + fmt(low))

seed = 2024


def rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed


graphs = same = reverse_topo = 0
for trial in range(300):
    n = rand() % 40 + 1
    m = rand() % (2 * n + 1)
    g = [[] for _ in range(n)]
    for _ in range(m):
        u = rand() % n
        g[u].append(rand() % n)
    t_comps = tarjan(n, g)[0]
    k_comps = kosaraju(n, g)
    graphs += 1
    if sorted(t_comps) == sorted(k_comps):
        same += 1
    pos = [0] * n                        # position of each vertex's component in Tarjan output
    for i, c in enumerate(t_comps):
        for x in c:
            pos[x] = i
    if all(pos[v] <= pos[u] for u in range(n) for v in g[u]):
        reverse_topo += 1
print("random graphs: " + str(graphs) + ", same partition as Kosaraju: " + str(same) +
      ", Tarjan order is reverse topological: " + str(reverse_topo))
` },
          { label: `Iterative Kosaraju on 100 000-vertex graphs (no recursion)`, code: `# Iterative Kosaraju: no recursion, so a 100 000-vertex path cannot overflow the call stack.

def scc_iterative(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)

    # pass 1: explicit stack of [vertex, index of the next edge to try]
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [[s, 0]]
        while stack:
            frame = stack[-1]
            u, i = frame
            if i < len(adj[u]):
                frame[1] = i + 1
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append([v, 0])
            else:
                stack.pop()
                order.append(u)              # finished: all edges of u were tried

    # pass 2: plain stack flood fill on the transpose, latest finisher first
    comp = [-1] * n
    sizes = []
    for s in reversed(order):
        if comp[s] != -1:
            continue
        c = len(sizes)
        comp[s] = c
        todo, size = [s], 0
        while todo:
            u = todo.pop()
            size += 1
            for v in radj[u]:
                if comp[v] == -1:
                    comp[v] = c
                    todo.append(v)
        sizes.append(size)
    return sizes


def report(name, n, edges):
    sizes = scc_iterative(n, edges)
    print(name + ": " + str(n) + " vertices, " + str(len(edges)) + " edges -> " + str(len(sizes)) +
          " SCCs, largest SCC size " + str(max(sizes)))


n = 100000
path = [(i, i + 1) for i in range(n - 1)]
report("one long path", n, path)
report("path closed into a ring", n, path + [(n - 1, 0)])
rings = []
for k in range(1000):                        # 1000 rings of 100 vertices, ring k -> ring k+1
    base = k * 100
    rings += [(base + j, base + (j + 1) % 100) for j in range(100)]
    if k + 1 < 1000:
        rings.append((base, base + 100))
report("1000 rings in a row", n, rings)
rings.append((99900, 0))                     # one edge back from the last ring to the first
report("rings plus one back edge", n, rings)
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a directed graph with n vertices and a list of edges, group the vertices into strongly connected components, where every vertex in a group can reach every other one. Walk me through an O(V + E) approach and code it in JavaScript."

**What a strong answer should cover:**
- The definition: u and v are in the same SCC exactly when u reaches v and v reaches u; SCCs partition the vertices, and every directed cycle lies inside one SCC.
- Why the naive approach (a BFS or DFS from every vertex, then compare reachability) is O(V · (V + E)), and that linear-time algorithms exist.
- Kosaraju: DFS to record finish order, then DFS the reversed graph in decreasing finish order; each tree of the second pass is one SCC. Or Tarjan: one DFS with discovery indices, low-links and a stack.
- The condensation: contracting each SCC to one node gives a DAG, which is what makes SCCs useful (topological order, 2-SAT, dependency groups).
- JavaScript specifics: arrays of arrays for adjacency; recursive DFS throws \`RangeError: Maximum call stack size exceeded\` on long paths (it did on a 100 000-vertex path in Node 22), so large inputs need an iterative DFS with an explicit stack of \`[vertex, nextEdgeIndex]\` frames.

**Clarifying questions expected:**
- "Can there be self-loops or duplicate edges? Are the vertices numbered 0 to n - 1?"
- "How large can the graph be? Is deep recursion a concern?"
- "Should the components come out in any particular order?"

**Code / implementation expected:** Yes — Kosaraju or Tarjan in JavaScript, returning an array of components; an iterative version is a strong bonus.`,
        answer: `**Target Audience:** Interview candidates who know BFS and DFS on graphs; strongly connected components are explained from scratch
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a city where every street is **one-way**. From your house you can drive to the bakery, but maybe there is no legal route back. Some neighbourhoods are friendly: inside them, you can get from any corner to any other corner and back again. Others are traps: once you drive out of the old town onto the ring road, no street ever leads you back in.

A city planner wants to know those friendly neighbourhoods. Within one of them, a delivery van can serve every address and return to its depot. Between them, traffic only flows one way, so the neighbourhoods themselves line up like a river system: upstream areas feed downstream ones, and nothing flows back up.

Those friendly neighbourhoods are the **strongly connected components** of the street graph. Finding them is a classic hard interview question because the simple idea, "check every pair of corners in both directions", is far too slow, and the fast algorithms are two clever uses of depth-first search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the graph directed? | SCCs only make sense for directed graphs. For an undirected graph, plain [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) are the answer. |
| How are vertices numbered, and can there be self-loops or duplicate edges? | 0..n-1 lets you use arrays. Self-loops and duplicates are harmless for both algorithms but worth confirming. |
| How large can V and E get? | Above a few thousand vertices on a long path, recursive DFS can overflow the stack; plan an iterative version. |
| What output do you want: the groups, a component id per vertex, or just the count? | Changes the return type, and whether you also need the condensation graph. |
| Does the order of the components matter? | Kosaraju naturally outputs them in topological order of the condensation, Tarjan in reverse topological order. |

## 3. The Core Idea

📌 **Interview term: Reachability** — vertex v is reachable from u if there is a directed path from u to v (following the arrows).

📌 **Interview term: Strongly connected component (SCC)** — a maximal set of vertices in which every vertex is reachable from every other one. "Maximal" means you cannot add another vertex and keep that property. Every vertex belongs to exactly one SCC (possibly just itself), so the SCCs partition the graph, and every directed cycle lies entirely inside one SCC.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Directed graph with nine vertices grouped into four strongly connected components: 0 1 2 form a cycle, 3 4 5 form a cycle, 6 and 7 point at each other, and 8 is alone. Edge 2 to 3 and edge 6 to 5 connect the groups.">
  <defs>
    <marker id="scc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="240" width="250" height="80" rx="14"/>
  <rect class="d-box-muted" x="610" y="240" width="76" height="80" rx="14"/>
  <rect class="d-box" x="40" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="67" y="66" text-anchor="middle">0</text>
  <rect class="d-box" x="196" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="223" y="66" text-anchor="middle">1</text>
  <rect class="d-box" x="118" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="145" y="166" text-anchor="middle">2</text>
  <path class="d-edge" d="M 96 60 L 188 60" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 214 82 L 170 136" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 122 138 L 78 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="428" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="455" y="66" text-anchor="middle">4</text>
  <rect class="d-box" x="506" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="166" text-anchor="middle">5</text>
  <path class="d-edge" d="M 386 138 L 432 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 478 82 L 522 134" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 160 L 412 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 174 160 L 342 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="286" text-anchor="middle">6</text>
  <rect class="d-box" x="506" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="286" text-anchor="middle">7</text>
  <path class="d-edge" d="M 406 274 L 498 274" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 290 L 412 290" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 390 258 L 520 186" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="621" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="648" y="286" text-anchor="middle">8</text>
</svg>

This is the graph in the examples: edges 0→1, 1→2, 2→0, 2→3, 3→4, 4→5, 5→3, 6→5, 6→7, 7→6, and vertex 8 with no edges. The shaded groups are its four SCCs: {0, 1, 2}, {3, 4, 5}, {6, 7} and {8}. The two highlighted edges, 2→3 and 6→5, run **between** components, and no path leads back, which is why 2 and 3 are in different components even though 2 reaches 3.

📌 **Interview term: Condensation (component graph)** — the graph you get by shrinking every SCC to a single node and keeping one edge between two components when any original edge connects them. It is always a **DAG** (directed acyclic graph): if two components could reach each other, they would be one component.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 200" role="img" aria-label="Condensation DAG: component of 6 and 7 points to the component of 3 4 5, and the component of 0 1 2 also points to it. The component of 8 has no edges.">
  <defs>
    <marker id="scc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="61" text-anchor="middle">{0, 1, 2}</text>
  <rect class="d-box" x="30" y="120" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="151" text-anchor="middle">{6, 7}</text>
  <rect class="d-box-accent" x="260" y="75" width="130" height="50" rx="10"/>
  <text class="d-text" x="325" y="106" text-anchor="middle">{3, 4, 5}</text>
  <rect class="d-box-muted" x="460" y="75" width="110" height="50" rx="10"/>
  <text class="d-text" x="515" y="106" text-anchor="middle">{8}</text>
  <path class="d-edge" d="M 162 60 L 252 92" fill="none" marker-end="url(#scc2-arrow)"/>
  <path class="d-edge" d="M 162 140 L 252 110" fill="none" marker-end="url(#scc2-arrow)"/>
</svg>

The condensation has no cycles, so it has a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used). The component {3, 4, 5} is a **sink**: nothing leaves it. That observation is the key to Kosaraju's algorithm.

### Brute force first

For every vertex, run a BFS to find everything it reaches, then u and v share a component when each is in the other's reachable set. That is V searches of O(V + E) each: O(V · (V + E)) time and O(V²) memory for the reachability table. Fine for 100 vertices, hopeless for 100 000. Both algorithms below do it in one or two DFS passes: O(V + E).

## 4. Kosaraju's Algorithm: Two DFS Passes

📌 **Interview term: Finish order (post-order)** — the order in which a DFS finishes vertices: a vertex finishes after all vertices reachable from it through unvisited paths have finished.

📌 **Interview term: Transpose graph** — the same vertices with every edge reversed. A graph and its transpose have exactly the same SCCs (reversing every arrow keeps "u reaches v and v reaches u"), but the edges of the condensation are reversed.

The algorithm:

1. Run a DFS over the whole graph and record vertices in **finish order**.
2. Build the transpose.
3. Take vertices in **decreasing** finish order. Each time you meet an unassigned vertex, DFS from it **in the transpose**; every vertex that DFS reaches is one SCC.

**Why it works, in two sentences.** The vertex that finishes last in pass 1 lies in a **source** component of the condensation (nothing outside points into it). In the transpose that component becomes a sink, so a DFS started there cannot leak into any other component; remove it, and the next-latest finisher sits in a source of what remains, and so on.

It is credited to S. Rao Kosaraju (1978) and was published by Micha Sharir in 1981, which is why some books call it the Kosaraju–Sharir algorithm.

## 5. Tarjan's Algorithm: One DFS With Low-Links

Tarjan's algorithm finds the same components in a single DFS, without building the transpose.

📌 **Interview term: Discovery index** — a counter value given to each vertex the moment DFS first visits it: 0, 1, 2, ...

📌 **Interview term: Low-link** — for a vertex u, the smallest discovery index reachable from u's DFS subtree using tree edges plus at most one edge back to a vertex that is **still on the stack**. If \`low[u] == index[u]\`, nothing below u can climb above it, so u is the root of a component.

The algorithm:

1. On visiting u: set \`index[u] = low[u] = counter++\`, push u on a stack, mark it on-stack.
2. For each edge u → v: if v is unvisited, recurse, then \`low[u] = min(low[u], low[v])\`. If v is visited **and still on the stack**, \`low[u] = min(low[u], index[v])\`. If v is visited but no longer on the stack, it belongs to a finished component: ignore it.
3. After the loop, if \`low[u] == index[u]\`, pop the stack down to and including u. Those vertices are one SCC.

📌 **Interview term: On-stack check** — the condition "v is still on the stack" is what separates an edge back into the current, unfinished component (which lowers the low-link) from an edge into a component that is already complete (which must not).

It was published by Robert Tarjan in "Depth-First Search and Linear Graph Algorithms", *SIAM Journal on Computing* 1(2), 1972, with linear time and space bounds. Tarjan emits components in **reverse topological order** of the condensation (sinks first); Kosaraju emits them in topological order (sources first). Example 2 checks that claim on 300 random graphs instead of asserting it.

| | Kosaraju | Tarjan |
| :--- | :--- | :--- |
| DFS passes | 2 (graph, then transpose) | 1 |
| Extra memory | the transpose graph, O(V + E) | index, low-link, on-stack flag and stack, O(V) |
| Output order | topological order of the condensation | reverse topological order |
| Easier to | explain and get right | write once you know it; no transpose |

## 6. The Code in JavaScript

### Kosaraju (Example 1)

~~~javascript
function kosaraju(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const radj = Array.from({ length: n }, () => []); // the transpose: every edge reversed
  for (const [u, v] of edges) {
    adj[u].push(v);
    radj[v].push(u);
  }

  const seen = new Array(n).fill(false);
  const order = [];                                 // vertices in the order their DFS finished
  function dfs1(u) {
    seen[u] = true;
    for (const v of adj[u]) if (!seen[v]) dfs1(v);
    order.push(u);                                  // post-order: pushed after all descendants
  }
  for (let u = 0; u < n; u++) if (!seen[u]) dfs1(u);

  const comp = new Array(n).fill(-1);
  const comps = [];
  function dfs2(u, c) {
    comp[u] = c;
    comps[c].push(u);
    for (const v of radj[u]) if (comp[v] === -1) dfs2(v, c);
  }
  for (let i = order.length - 1; i >= 0; i--) {     // latest finisher first
    const u = order[i];
    if (comp[u] === -1) {
      comps.push([]);
      dfs2(u, comps.length - 1);
    }
  }
  return [order, comps, comp];
}
~~~

- \`Array.from({ length: n }, () => [])\` creates n **separate** arrays. \`new Array(n).fill([])\` would put the same array in every slot, so every vertex would share one neighbour list.
- \`dfs1\` pushes \`u\` onto \`order\` **after** its loop: post-order, so \`order\` is the finish order.
- The second pass walks \`order\` backwards with an index loop instead of \`order.reverse()\`, which would mutate the array.
- Nested function declarations close over \`seen\`, \`order\` and \`comp\`, so no state is passed around.

### Tarjan (Example 2)

~~~javascript
function tarjan(n, adj) {
  const index = new Array(n).fill(-1); // discovery time of each vertex
  const low = new Array(n).fill(0);    // smallest index reachable from the subtree with one back edge
  const onStack = new Array(n).fill(false);
  const stack = [], comps = [];
  let counter = 0;
  function dfs(u) {
    index[u] = low[u] = counter++;
    stack.push(u);
    onStack[u] = true;
    for (const v of adj[u]) {
      if (index[v] === -1) {           // tree edge: recurse, then inherit the child low-link
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
      } else if (onStack[v]) {         // edge back into the current, unfinished component
        low[u] = Math.min(low[u], index[v]);
      }
    }
    if (low[u] === index[u]) {         // u is the root of a component: pop it off
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        comp.push(w);
      } while (w !== u);
      comps.push(comp.sort((a, b) => a - b));
    }
  }
  for (let u = 0; u < n; u++) if (index[u] === -1) dfs(u);
  return [comps, index, low];
}
~~~

- \`index[u] = low[u] = counter++\` assigns the current counter to both, then increments it.
- \`onStack\` is a separate boolean array so the "still on the stack?" test is O(1); \`stack.includes(v)\` would be O(V).
- The \`do { ... } while (w !== u)\` loop pops at least once, which is exactly what is needed: u itself is always part of its component.
- \`comp.sort((a, b) => a - b)\` sorts numerically; plain \`sort()\` would put 10 before 9.
- Recursion depth equals the DFS depth. A 100 000-vertex path threw \`RangeError: Maximum call stack size exceeded\` in Node 22; Example 3 is the iterative fix.

### Iterative DFS (Example 3)

Each stack frame is \`[vertex, index of the next edge to try]\`, which is exactly what the call stack would remember:

~~~javascript
// pass 1: explicit stack of [vertex, index of the next edge to try]
const seen = new Array(n).fill(false);
const order = [];
for (let s = 0; s < n; s++) {
  if (seen[s]) continue;
  seen[s] = true;
  const stack = [[s, 0]];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const u = frame[0], i = frame[1];
    if (i < adj[u].length) {
      frame[1] = i + 1;
      const v = adj[u][i];
      if (!seen[v]) {
        seen[v] = true;
        stack.push([v, 0]);
      }
    } else {
      stack.pop();
      order.push(u);                 // finished: all edges of u were tried
    }
  }
}
~~~

\`frame[1] = i + 1\` updates the frame in place before pushing a child, so when the child finishes, the parent resumes at its next edge. The vertex goes into \`order\` only when all its edges are used: the same post-order as the recursive version. Note also the comment in \`report\`: \`Math.max(...sizes)\` spreads every element as a function argument; with 100 000 elements it worked in Node 22, but with 1 000 000 it threw \`RangeError\`, so the example uses a loop.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS from every vertex | O(V · (V + E)) | O(V²) | V full searches plus a reachability table |
| Kosaraju | O(V + E) | O(V + E) | two DFS passes; the transpose has E edges |
| Tarjan | O(V + E) | O(V) beyond the graph | one DFS; each vertex is pushed and popped once |
| Iterative Kosaraju (Example 3) | O(V + E) | O(V + E) | same work; the explicit stack replaces the call stack |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why a recursive DFS needs O(V) stack in the worst case (a long path).

## 8. Verified: Running the Code

Each example on this page was saved as \`main.js\` and run with \`node main.js\` (the same code runs unchanged in the page, it only uses \`console.log\`). The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kosaraju with its finish order** prints:

~~~text
finish order of pass 1: [5, 4, 3, 2, 1, 0, 7, 6, 8]
pass 2 found component 0: [8]
pass 2 found component 1: [6, 7]
pass 2 found component 2: [0, 1, 2]
pass 2 found component 3: [3, 4, 5]
component id of each vertex: [2, 2, 2, 3, 3, 3, 1, 1, 0]
condensation edges: C1->C3, C2->C3
~~~

Reading it: vertex 8 finished last, so pass 2 starts there and finds {8} alone; then 6 finds {6, 7}; then 0 finds {0, 1, 2}; then 3 finds {3, 4, 5}. The components come out as C0 to C3 in a topological order of the condensation, and the two condensation edges, C1->C3 and C2->C3, both point forward.

**Example 2 — Tarjan, checked against Kosaraju** prints:

~~~text
Tarjan completes components in this order:
  [3, 4, 5]
  [0, 1, 2]
  [6, 7]
  [8]
index: [0, 1, 2, 3, 4, 5, 6, 7, 8]
low:   [0, 0, 0, 3, 3, 3, 6, 6, 8]
random graphs: 300, same partition as Kosaraju: 300, Tarjan order is reverse topological: 300
~~~

Reading it: Tarjan completes {3, 4, 5} first, because it is a sink, and the roots of the components are exactly the vertices with \`low == index\` (0, 3, 6 and 8). On 300 random directed graphs with up to 40 vertices, Tarjan and Kosaraju produced the same partition every time, and Tarjan's output order was always reverse topological: every edge goes from a later-emitted component to an earlier-emitted one, or stays inside one.

**Example 3 — iterative Kosaraju on 100 000 vertices** prints:

~~~text
one long path: 100000 vertices, 99999 edges -> 100000 SCCs, largest SCC size 1
path closed into a ring: 100000 vertices, 100000 edges -> 1 SCCs, largest SCC size 100000
1000 rings in a row: 100000 vertices, 100999 edges -> 1000 SCCs, largest SCC size 100
rings plus one back edge: 100000 vertices, 101000 edges -> 1 SCCs, largest SCC size 100000
~~~

Reading it: a path is a DAG, so every vertex is its own SCC; closing it into a ring makes one SCC of everything; 1000 rings chained forward stay 1000 SCCs; one back edge from the last ring to the first merges them all. Each run goes 100 000 vertices deep, with no recursion at all.

## 9. Where SCCs Are Used

- **Detecting directed cycles, with detail.** A graph has a directed cycle exactly when some SCC has more than one vertex or a self-loop. Plain [directed cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) answers yes or no; SCCs tell you every group of mutually dependent nodes, which is what a build tool reports for circular imports, or a scheduler for a [course schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) that cannot be finished.
- **Turning any directed graph into a DAG.** After condensation you can run DP or [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) on components, for example "the maximum total value collectable on a walk" where a walk may loop inside a component.
- **2-SAT.** A boolean formula of two-literal clauses is satisfiable exactly when no variable shares an SCC with its negation in the implication graph.
- **Social and web graphs:** groups of accounts that all follow each other, link farms of pages pointing at each other.

SCCs are a directed-graph tool. For undirected graphs every connected component is already "strongly" connected, and [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) or BFS is enough.

## 10. Edge Cases

- **No edges:** every vertex is its own SCC (vertex 8 in the examples).
- **Self-loop u → u:** u is still a one-vertex SCC; the self-loop does not merge it with anything.
- **Duplicate edges:** harmless; the second copy finds its target already visited.
- **A single big cycle:** one SCC containing all vertices (Example 3: "path closed into a ring").
- **A DAG:** every SCC has size 1 (Example 3: "one long path" gives 100 000 SCCs).
- **Deep graphs:** a path of 100 000 vertices makes a recursive DFS 100 000 calls deep; see the stack notes for your language below.

## Common Pitfalls

- **Recursion on big graphs.** A 100 000-vertex path threw \`RangeError\`. Use the explicit-stack version for large inputs.
- **\`new Array(n).fill([])\`** shares one array between all vertices; use \`Array.from({ length: n }, () => [])\`.
- **Lowering a low-link through a finished component.** Without the \`onStack[v]\` check, the edge 2→3 into the already-finished {3, 4, 5} would wrongly merge components.
- **Running pass 2 on the original graph** instead of the transpose in Kosaraju.
- **\`order.reverse()\`** mutates \`order\`; if you need it again later, iterate backwards instead.
- **\`Math.max(...bigArray)\`** to find the largest component: it threw \`RangeError\` at 1 000 000 elements; use a loop or \`reduce\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An SCC is a maximal set where every vertex reaches every other; SCCs partition the vertices, and shrinking them gives a DAG, the condensation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kosaraju:</strong> <span style="color:#f0e2c8;">DFS once and record finish order; reverse every edge; DFS the reversed graph in decreasing finish order. Each tree is one SCC.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tarjan:</strong> <span style="color:#f0e2c8;">One DFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> and a stack; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low[u] === index[u]</code>, pop a component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time; Kosaraju stores the transpose, Tarjan only O(V) extra arrays.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS detail:</strong> <span style="color:#f0e2c8;">Deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>, so for large inputs I keep an explicit stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[vertex, nextEdge]</code> frames; and I build adjacency with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill([])</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why reverse the graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transpose has the same SCCs but reversed condensation edges, so the source component found last in pass 1 becomes a sink and its DFS cannot escape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the on-stack check in Tarjan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A visited vertex that is off the stack belongs to a finished component; using its index would merge two different SCCs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do components come out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kosaraju: topological order of the condensation. Tarjan: reverse topological order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build the condensation without duplicate edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of encoded pairs such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a * n + b</code>, because two arrays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a, b]</code> are never equal by identity in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then SCCs are just connected components; BFS or union-find is simpler.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachability** | v can be reached from u by following directed edges |
| **Strongly connected component (SCC)** | a maximal group in which every vertex reaches every other |
| **Condensation** | the DAG obtained by shrinking each SCC to one node |
| **Finish order (post-order)** | the order in which DFS finishes vertices |
| **Transpose graph** | the graph with every edge reversed; same SCCs |
| **Discovery index** | the visit counter value DFS gives each vertex |
| **Low-link** | smallest index reachable from a subtree with one edge back to the stack |
| **On-stack check** | only edges to vertices still on the stack may lower a low-link |
| **\`RangeError\`** | what V8 throws when the call stack is exhausted by deep recursion |

---
**Conclusion:** A strongly connected component is a maximal group of vertices that can all reach each other, and shrinking the components turns any directed graph into a DAG. Checking reachability pair by pair is O(V · (V + E)); Kosaraju does it in O(V + E) with two DFS passes, finish order on the graph then trees on the transpose, and Tarjan does it in one DFS by tracking discovery indices, low-links and a stack. They return the same partition, in opposite topological orders. In JavaScript, the same caution applies: deep recursion throws \`RangeError\`, so know the explicit-stack form and build adjacency arrays with \`Array.from\`.
`,
        examples: [
          { label: `Kosaraju: finish order, reversed graph, condensation edges`, code: `// Kosaraju: DFS once to get finish order, then DFS the reversed graph in reverse finish order.
const N = 9;
const EDGES = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [6, 5], [6, 7], [7, 6]];

function fmt(xs) {
  return '[' + xs.map((x) => (Array.isArray(x) ? fmt(x) : String(x))).join(', ') + ']';
}

function kosaraju(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const radj = Array.from({ length: n }, () => []); // the transpose: every edge reversed
  for (const [u, v] of edges) {
    adj[u].push(v);
    radj[v].push(u);
  }

  const seen = new Array(n).fill(false);
  const order = [];                                 // vertices in the order their DFS finished
  function dfs1(u) {
    seen[u] = true;
    for (const v of adj[u]) if (!seen[v]) dfs1(v);
    order.push(u);                                  // post-order: pushed after all descendants
  }
  for (let u = 0; u < n; u++) if (!seen[u]) dfs1(u);

  const comp = new Array(n).fill(-1);
  const comps = [];
  function dfs2(u, c) {
    comp[u] = c;
    comps[c].push(u);
    for (const v of radj[u]) if (comp[v] === -1) dfs2(v, c);
  }
  for (let i = order.length - 1; i >= 0; i--) {     // latest finisher first
    const u = order[i];
    if (comp[u] === -1) {
      comps.push([]);
      dfs2(u, comps.length - 1);
    }
  }
  return [order, comps, comp];
}

const [order, comps, comp] = kosaraju(N, EDGES);
console.log('finish order of pass 1: ' + fmt(order));
comps.forEach((c, i) => {
  console.log('pass 2 found component ' + i + ': ' + fmt([...c].sort((a, b) => a - b)));
});
console.log('component id of each vertex: ' + fmt(comp));

const dagSet = new Set();
for (const [u, v] of EDGES) if (comp[u] !== comp[v]) dagSet.add(comp[u] * N + comp[v]); // encode the pair as one number
const dag = [...dagSet].sort((a, b) => a - b).map((k) => 'C' + Math.floor(k / N) + '->C' + (k % N));
console.log('condensation edges: ' + dag.join(', '));
` },
          { label: `Tarjan low-links, checked against Kosaraju on 300 random graphs`, code: `// Tarjan: one DFS with discovery indices, low-links and a stack; checked against Kosaraju.
function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function tarjan(n, adj) {
  const index = new Array(n).fill(-1); // discovery time of each vertex
  const low = new Array(n).fill(0);    // smallest index reachable from the subtree with one back edge
  const onStack = new Array(n).fill(false);
  const stack = [], comps = [];
  let counter = 0;
  function dfs(u) {
    index[u] = low[u] = counter++;
    stack.push(u);
    onStack[u] = true;
    for (const v of adj[u]) {
      if (index[v] === -1) {           // tree edge: recurse, then inherit the child low-link
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
      } else if (onStack[v]) {         // edge back into the current, unfinished component
        low[u] = Math.min(low[u], index[v]);
      }
    }
    if (low[u] === index[u]) {         // u is the root of a component: pop it off
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        comp.push(w);
      } while (w !== u);
      comps.push(comp.sort((a, b) => a - b));
    }
  }
  for (let u = 0; u < n; u++) if (index[u] === -1) dfs(u);
  return [comps, index, low];
}

function kosaraju(n, adj) {
  const radj = Array.from({ length: n }, () => []);
  for (let u = 0; u < n; u++) for (const v of adj[u]) radj[v].push(u);
  const seen = new Array(n).fill(false), order = [];
  function dfs1(u) {
    seen[u] = true;
    for (const v of adj[u]) if (!seen[v]) dfs1(v);
    order.push(u);
  }
  for (let u = 0; u < n; u++) if (!seen[u]) dfs1(u);
  const comp = new Array(n).fill(-1), comps = [];
  function dfs2(u, c) {
    comp[u] = c;
    comps[c].push(u);
    for (const v of radj[u]) if (comp[v] === -1) dfs2(v, c);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    if (comp[order[i]] === -1) {
      comps.push([]);
      dfs2(order[i], comps.length - 1);
    }
  }
  return comps.map((c) => c.sort((a, b) => a - b));
}

const key = (comps) => comps.map(fmt).sort().join(' ');  // order-independent fingerprint

const N = 9;
const EDGES = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [6, 5], [6, 7], [7, 6]];
const adj = Array.from({ length: N }, () => []);
for (const [u, v] of EDGES) adj[u].push(v);
const [comps, index, low] = tarjan(N, adj);
console.log('Tarjan completes components in this order:');
for (const c of comps) console.log('  ' + fmt(c));
console.log('index: ' + fmt(index));
console.log('low:   ' + fmt(low));

let seed = 2024;
function rand() {
  seed = (seed * 48271) % 2147483647;
  return seed;
}

let graphs = 0, same = 0, reverseTopo = 0;
for (let trial = 0; trial < 300; trial++) {
  const n = (rand() % 40) + 1;
  const m = rand() % (2 * n + 1);
  const g = Array.from({ length: n }, () => []);
  for (let i = 0; i < m; i++) {
    const u = rand() % n;
    g[u].push(rand() % n);
  }
  const tComps = tarjan(n, g)[0];
  graphs++;
  if (key(tComps) === key(kosaraju(n, g))) same++;
  const pos = new Array(n).fill(0);    // position of each vertex's component in Tarjan output
  tComps.forEach((c, i) => { for (const x of c) pos[x] = i; });
  let ok = true;
  for (let u = 0; u < n; u++) for (const v of g[u]) if (pos[v] > pos[u]) ok = false;
  if (ok) reverseTopo++;
}
console.log('random graphs: ' + graphs + ', same partition as Kosaraju: ' + same +
  ', Tarjan order is reverse topological: ' + reverseTopo);
` },
          { label: `Iterative Kosaraju on 100 000-vertex graphs (no recursion)`, code: `// Iterative Kosaraju: no recursion, so a 100 000-vertex path cannot overflow the call stack.
function sccIterative(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const radj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    radj[v].push(u);
  }

  // pass 1: explicit stack of [vertex, index of the next edge to try]
  const seen = new Array(n).fill(false);
  const order = [];
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    seen[s] = true;
    const stack = [[s, 0]];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const u = frame[0], i = frame[1];
      if (i < adj[u].length) {
        frame[1] = i + 1;
        const v = adj[u][i];
        if (!seen[v]) {
          seen[v] = true;
          stack.push([v, 0]);
        }
      } else {
        stack.pop();
        order.push(u);                 // finished: all edges of u were tried
      }
    }
  }

  // pass 2: plain stack flood fill on the transpose, latest finisher first
  const comp = new Array(n).fill(-1);
  const sizes = [];
  for (let k = order.length - 1; k >= 0; k--) {
    const s = order[k];
    if (comp[s] !== -1) continue;
    const c = sizes.length;
    comp[s] = c;
    const todo = [s];
    let size = 0;
    while (todo.length > 0) {
      const u = todo.pop();
      size++;
      for (const v of radj[u]) {
        if (comp[v] === -1) {
          comp[v] = c;
          todo.push(v);
        }
      }
    }
    sizes.push(size);
  }
  return sizes;
}

function report(name, n, edges) {
  const sizes = sccIterative(n, edges);
  let largest = 0;
  for (const s of sizes) largest = Math.max(largest, s); // Math.max(...sizes) can overflow the stack for huge arrays
  console.log(name + ': ' + n + ' vertices, ' + edges.length + ' edges -> ' + sizes.length +
    ' SCCs, largest SCC size ' + largest);
}

const n = 100000;
const path = [];
for (let i = 0; i < n - 1; i++) path.push([i, i + 1]);
report('one long path', n, path);
report('path closed into a ring', n, [...path, [n - 1, 0]]);
const rings = [];
for (let k = 0; k < 1000; k++) {       // 1000 rings of 100 vertices, ring k -> ring k+1
  const base = k * 100;
  for (let j = 0; j < 100; j++) rings.push([base + j, base + ((j + 1) % 100)]);
  if (k + 1 < 1000) rings.push([base, base + 100]);
}
report('1000 rings in a row', n, rings);
rings.push([99900, 0]);                // one edge back from the last ring to the first
report('rings plus one back edge', n, rings);
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a directed graph with n vertices and a list of edges, group the vertices into strongly connected components, where every vertex in a group can reach every other one. Walk me through an O(V + E) approach and code it in Java."

**What a strong answer should cover:**
- The definition: u and v are in the same SCC exactly when u reaches v and v reaches u; SCCs partition the vertices, and every directed cycle lies inside one SCC.
- Why the naive approach (a BFS or DFS from every vertex, then compare reachability) is O(V · (V + E)), and that linear-time algorithms exist.
- Kosaraju: DFS to record finish order, then DFS the reversed graph in decreasing finish order; each tree of the second pass is one SCC. Or Tarjan: one DFS with discovery indices, low-links and a stack.
- The condensation: contracting each SCC to one node gives a DAG, which is what makes SCCs useful (topological order, 2-SAT, dependency groups).
- Java specifics: \`List<List<Integer>>\` or compact \`int[]\` adjacency; recursive DFS on a 100 000-vertex path threw \`StackOverflowError\` with the default thread stack, so use an iterative DFS (or run the work in a \`Thread\` with a larger stack size).

**Clarifying questions expected:**
- "Can there be self-loops or duplicate edges? Are the vertices numbered 0 to n - 1?"
- "How large can the graph be? Is deep recursion a concern?"
- "Should the components come out in any particular order?"

**Code / implementation expected:** Yes — Kosaraju or Tarjan in Java, returning \`List<List<Integer>>\`; an iterative version is a strong bonus.`,
        answer: `**Target Audience:** Interview candidates who know BFS and DFS on graphs; strongly connected components are explained from scratch
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a city where every street is **one-way**. From your house you can drive to the bakery, but maybe there is no legal route back. Some neighbourhoods are friendly: inside them, you can get from any corner to any other corner and back again. Others are traps: once you drive out of the old town onto the ring road, no street ever leads you back in.

A city planner wants to know those friendly neighbourhoods. Within one of them, a delivery van can serve every address and return to its depot. Between them, traffic only flows one way, so the neighbourhoods themselves line up like a river system: upstream areas feed downstream ones, and nothing flows back up.

Those friendly neighbourhoods are the **strongly connected components** of the street graph. Finding them is a classic hard interview question because the simple idea, "check every pair of corners in both directions", is far too slow, and the fast algorithms are two clever uses of depth-first search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the graph directed? | SCCs only make sense for directed graphs. For an undirected graph, plain [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) are the answer. |
| How are vertices numbered, and can there be self-loops or duplicate edges? | 0..n-1 lets you use arrays. Self-loops and duplicates are harmless for both algorithms but worth confirming. |
| How large can V and E get? | Above a few thousand vertices on a long path, recursive DFS can overflow the stack; plan an iterative version. |
| What output do you want: the groups, a component id per vertex, or just the count? | Changes the return type, and whether you also need the condensation graph. |
| Does the order of the components matter? | Kosaraju naturally outputs them in topological order of the condensation, Tarjan in reverse topological order. |

## 3. The Core Idea

📌 **Interview term: Reachability** — vertex v is reachable from u if there is a directed path from u to v (following the arrows).

📌 **Interview term: Strongly connected component (SCC)** — a maximal set of vertices in which every vertex is reachable from every other one. "Maximal" means you cannot add another vertex and keep that property. Every vertex belongs to exactly one SCC (possibly just itself), so the SCCs partition the graph, and every directed cycle lies entirely inside one SCC.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Directed graph with nine vertices grouped into four strongly connected components: 0 1 2 form a cycle, 3 4 5 form a cycle, 6 and 7 point at each other, and 8 is alone. Edge 2 to 3 and edge 6 to 5 connect the groups.">
  <defs>
    <marker id="scc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="240" width="250" height="80" rx="14"/>
  <rect class="d-box-muted" x="610" y="240" width="76" height="80" rx="14"/>
  <rect class="d-box" x="40" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="67" y="66" text-anchor="middle">0</text>
  <rect class="d-box" x="196" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="223" y="66" text-anchor="middle">1</text>
  <rect class="d-box" x="118" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="145" y="166" text-anchor="middle">2</text>
  <path class="d-edge" d="M 96 60 L 188 60" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 214 82 L 170 136" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 122 138 L 78 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="428" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="455" y="66" text-anchor="middle">4</text>
  <rect class="d-box" x="506" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="166" text-anchor="middle">5</text>
  <path class="d-edge" d="M 386 138 L 432 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 478 82 L 522 134" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 160 L 412 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 174 160 L 342 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="286" text-anchor="middle">6</text>
  <rect class="d-box" x="506" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="286" text-anchor="middle">7</text>
  <path class="d-edge" d="M 406 274 L 498 274" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 290 L 412 290" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 390 258 L 520 186" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="621" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="648" y="286" text-anchor="middle">8</text>
</svg>

This is the graph in the examples: edges 0→1, 1→2, 2→0, 2→3, 3→4, 4→5, 5→3, 6→5, 6→7, 7→6, and vertex 8 with no edges. The shaded groups are its four SCCs: {0, 1, 2}, {3, 4, 5}, {6, 7} and {8}. The two highlighted edges, 2→3 and 6→5, run **between** components, and no path leads back, which is why 2 and 3 are in different components even though 2 reaches 3.

📌 **Interview term: Condensation (component graph)** — the graph you get by shrinking every SCC to a single node and keeping one edge between two components when any original edge connects them. It is always a **DAG** (directed acyclic graph): if two components could reach each other, they would be one component.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 200" role="img" aria-label="Condensation DAG: component of 6 and 7 points to the component of 3 4 5, and the component of 0 1 2 also points to it. The component of 8 has no edges.">
  <defs>
    <marker id="scc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="61" text-anchor="middle">{0, 1, 2}</text>
  <rect class="d-box" x="30" y="120" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="151" text-anchor="middle">{6, 7}</text>
  <rect class="d-box-accent" x="260" y="75" width="130" height="50" rx="10"/>
  <text class="d-text" x="325" y="106" text-anchor="middle">{3, 4, 5}</text>
  <rect class="d-box-muted" x="460" y="75" width="110" height="50" rx="10"/>
  <text class="d-text" x="515" y="106" text-anchor="middle">{8}</text>
  <path class="d-edge" d="M 162 60 L 252 92" fill="none" marker-end="url(#scc2-arrow)"/>
  <path class="d-edge" d="M 162 140 L 252 110" fill="none" marker-end="url(#scc2-arrow)"/>
</svg>

The condensation has no cycles, so it has a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used). The component {3, 4, 5} is a **sink**: nothing leaves it. That observation is the key to Kosaraju's algorithm.

### Brute force first

For every vertex, run a BFS to find everything it reaches, then u and v share a component when each is in the other's reachable set. That is V searches of O(V + E) each: O(V · (V + E)) time and O(V²) memory for the reachability table. Fine for 100 vertices, hopeless for 100 000. Both algorithms below do it in one or two DFS passes: O(V + E).

## 4. Kosaraju's Algorithm: Two DFS Passes

📌 **Interview term: Finish order (post-order)** — the order in which a DFS finishes vertices: a vertex finishes after all vertices reachable from it through unvisited paths have finished.

📌 **Interview term: Transpose graph** — the same vertices with every edge reversed. A graph and its transpose have exactly the same SCCs (reversing every arrow keeps "u reaches v and v reaches u"), but the edges of the condensation are reversed.

The algorithm:

1. Run a DFS over the whole graph and record vertices in **finish order**.
2. Build the transpose.
3. Take vertices in **decreasing** finish order. Each time you meet an unassigned vertex, DFS from it **in the transpose**; every vertex that DFS reaches is one SCC.

**Why it works, in two sentences.** The vertex that finishes last in pass 1 lies in a **source** component of the condensation (nothing outside points into it). In the transpose that component becomes a sink, so a DFS started there cannot leak into any other component; remove it, and the next-latest finisher sits in a source of what remains, and so on.

It is credited to S. Rao Kosaraju (1978) and was published by Micha Sharir in 1981, which is why some books call it the Kosaraju–Sharir algorithm.

## 5. Tarjan's Algorithm: One DFS With Low-Links

Tarjan's algorithm finds the same components in a single DFS, without building the transpose.

📌 **Interview term: Discovery index** — a counter value given to each vertex the moment DFS first visits it: 0, 1, 2, ...

📌 **Interview term: Low-link** — for a vertex u, the smallest discovery index reachable from u's DFS subtree using tree edges plus at most one edge back to a vertex that is **still on the stack**. If \`low[u] == index[u]\`, nothing below u can climb above it, so u is the root of a component.

The algorithm:

1. On visiting u: set \`index[u] = low[u] = counter++\`, push u on a stack, mark it on-stack.
2. For each edge u → v: if v is unvisited, recurse, then \`low[u] = min(low[u], low[v])\`. If v is visited **and still on the stack**, \`low[u] = min(low[u], index[v])\`. If v is visited but no longer on the stack, it belongs to a finished component: ignore it.
3. After the loop, if \`low[u] == index[u]\`, pop the stack down to and including u. Those vertices are one SCC.

📌 **Interview term: On-stack check** — the condition "v is still on the stack" is what separates an edge back into the current, unfinished component (which lowers the low-link) from an edge into a component that is already complete (which must not).

It was published by Robert Tarjan in "Depth-First Search and Linear Graph Algorithms", *SIAM Journal on Computing* 1(2), 1972, with linear time and space bounds. Tarjan emits components in **reverse topological order** of the condensation (sinks first); Kosaraju emits them in topological order (sources first). Example 2 checks that claim on 300 random graphs instead of asserting it.

| | Kosaraju | Tarjan |
| :--- | :--- | :--- |
| DFS passes | 2 (graph, then transpose) | 1 |
| Extra memory | the transpose graph, O(V + E) | index, low-link, on-stack flag and stack, O(V) |
| Output order | topological order of the condensation | reverse topological order |
| Easier to | explain and get right | write once you know it; no transpose |

## 6. The Code in Java

### Kosaraju (Example 1)

~~~java
static void dfs1(int u) {
    seen[u] = true;
    for (int v : adj.get(u)) if (!seen[v]) dfs1(v);
    order.add(u);                                  // post-order: added after all descendants
}

static void dfs2(int u, int c) {
    comp[u] = c;
    comps.get(c).add(u);
    for (int v : radj.get(u)) if (comp[v] == -1) dfs2(v, c);
}
~~~

And the driver in \`main\`:

~~~java
seen = new boolean[n];
for (int u = 0; u < n; u++) if (!seen[u]) dfs1(u);

comp = new int[n];
Arrays.fill(comp, -1);
for (int i = order.size() - 1; i >= 0; i--) {  // latest finisher first
    int u = order.get(i);
    if (comp[u] == -1) {
        comps.add(new ArrayList<>());
        dfs2(u, comps.size() - 1);
    }
}
~~~

- The graph state lives in \`static\` fields so the recursive methods do not need long parameter lists; in production code you would wrap it in an object.
- \`order.add(u)\` happens **after** the loop in \`dfs1\`: post-order, so \`order\` is the finish order.
- \`for (int v : adj.get(u))\` auto-unboxes each \`Integer\` to \`int\`. For millions of edges, \`int[]\` adjacency (as in Example 3) avoids those objects.
- \`Arrays.fill(comp, -1)\` marks every vertex unassigned; a new \`int[]\` starts as all zeros, which would wrongly mean "component 0".

### Tarjan (Example 2)

~~~java
void dfs(int u) {
    index[u] = low[u] = counter++;
    stack.push(u);
    onStack[u] = true;
    for (int v : adj.get(u)) {
        if (index[v] == -1) {            // tree edge: recurse, then inherit the child low-link
            dfs(v);
            low[u] = Math.min(low[u], low[v]);
        } else if (onStack[v]) {         // edge back into the current, unfinished component
            low[u] = Math.min(low[u], index[v]);
        }
    }
    if (low[u] == index[u]) {            // u is the root of a component: pop it off
        List<Integer> comp = new ArrayList<>();
        int w;
        do {
            w = stack.pop();
            onStack[w] = false;
            comp.add(w);
        } while (w != u);
        Collections.sort(comp);
        comps.add(comp);
    }
}
~~~

- \`index[u] = low[u] = counter++;\` assigns the current counter to both, then increments it.
- The stack is an \`ArrayDeque<Integer>\` used through \`push\` / \`pop\`; \`java.util.Stack\` also works but is synchronised and older.
- \`onStack\` is a \`boolean[]\` so the "still on the stack?" test is O(1); \`stack.contains(v)\` would be O(V).
- Recursion depth equals the DFS depth. A 100 000-vertex path threw \`StackOverflowError\` with the default thread stack in a test run; Example 3 is iterative. (The site verifier runs Java with a 64 MB stack, but you cannot count on that in an interview environment.)

### Iterative DFS (Example 3)

The Java version also shows a memory trick: adjacency stored in **CSR form** (compressed sparse row), two flat \`int[]\` arrays instead of \`List<List<Integer>>\`, so 100 000 vertices do not create 100 000 \`ArrayList\` objects full of boxed \`Integer\`s. The explicit stack is two parallel arrays, the vertex and the index of its next edge:

~~~java
// pass 1: explicit stacks of vertex and index of the next edge to try
boolean[] seen = new boolean[n];
int[] order = new int[n];
int done = 0;
int[] stackV = new int[n], stackI = new int[n];
for (int s = 0; s < n; s++) {
    if (seen[s]) continue;
    seen[s] = true;
    int top = 0;
    stackV[0] = s;
    stackI[0] = outDeg[s];
    while (top >= 0) {
        int u = stackV[top];
        if (stackI[top] < outDeg[u + 1]) {
            int v = out[stackI[top]++];
            if (!seen[v]) {
                seen[v] = true;
                top++;
                stackV[top] = v;
                stackI[top] = outDeg[v];
            }
        } else {
            top--;
            order[done++] = u;           // finished: all edges of u were tried
        }
    }
}
~~~

\`stackI[top]++\` advances the parent frame before pushing a child, so when the child finishes, the parent resumes at its next edge. A vertex goes into \`order\` only when all its edges are used: the same post-order as the recursive version.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS from every vertex | O(V · (V + E)) | O(V²) | V full searches plus a reachability table |
| Kosaraju | O(V + E) | O(V + E) | two DFS passes; the transpose has E edges |
| Tarjan | O(V + E) | O(V) beyond the graph | one DFS; each vertex is pushed and popped once |
| Iterative Kosaraju (Example 3) | O(V + E) | O(V + E) | same work; the explicit stack replaces the call stack |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why a recursive DFS needs O(V) stack in the worst case (a long path).

## 8. Verified: Running the Code

Each example on this page was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kosaraju with its finish order** prints:

~~~text
finish order of pass 1: [5, 4, 3, 2, 1, 0, 7, 6, 8]
pass 2 found component 0: [8]
pass 2 found component 1: [6, 7]
pass 2 found component 2: [0, 1, 2]
pass 2 found component 3: [3, 4, 5]
component id of each vertex: [2, 2, 2, 3, 3, 3, 1, 1, 0]
condensation edges: C1->C3, C2->C3
~~~

Reading it: vertex 8 finished last, so pass 2 starts there and finds {8} alone; then 6 finds {6, 7}; then 0 finds {0, 1, 2}; then 3 finds {3, 4, 5}. The components come out as C0 to C3 in a topological order of the condensation, and the two condensation edges, C1->C3 and C2->C3, both point forward.

**Example 2 — Tarjan, checked against Kosaraju** prints:

~~~text
Tarjan completes components in this order:
  [3, 4, 5]
  [0, 1, 2]
  [6, 7]
  [8]
index: [0, 1, 2, 3, 4, 5, 6, 7, 8]
low:   [0, 0, 0, 3, 3, 3, 6, 6, 8]
random graphs: 300, same partition as Kosaraju: 300, Tarjan order is reverse topological: 300
~~~

Reading it: Tarjan completes {3, 4, 5} first, because it is a sink, and the roots of the components are exactly the vertices with \`low == index\` (0, 3, 6 and 8). On 300 random directed graphs with up to 40 vertices, Tarjan and Kosaraju produced the same partition every time, and Tarjan's output order was always reverse topological: every edge goes from a later-emitted component to an earlier-emitted one, or stays inside one.

**Example 3 — iterative Kosaraju on 100 000 vertices** prints:

~~~text
one long path: 100000 vertices, 99999 edges -> 100000 SCCs, largest SCC size 1
path closed into a ring: 100000 vertices, 100000 edges -> 1 SCCs, largest SCC size 100000
1000 rings in a row: 100000 vertices, 100999 edges -> 1000 SCCs, largest SCC size 100
rings plus one back edge: 100000 vertices, 101000 edges -> 1 SCCs, largest SCC size 100000
~~~

Reading it: a path is a DAG, so every vertex is its own SCC; closing it into a ring makes one SCC of everything; 1000 rings chained forward stay 1000 SCCs; one back edge from the last ring to the first merges them all. Each run goes 100 000 vertices deep, with no recursion at all.

## 9. Where SCCs Are Used

- **Detecting directed cycles, with detail.** A graph has a directed cycle exactly when some SCC has more than one vertex or a self-loop. Plain [directed cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) answers yes or no; SCCs tell you every group of mutually dependent nodes, which is what a build tool reports for circular imports, or a scheduler for a [course schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) that cannot be finished.
- **Turning any directed graph into a DAG.** After condensation you can run DP or [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) on components, for example "the maximum total value collectable on a walk" where a walk may loop inside a component.
- **2-SAT.** A boolean formula of two-literal clauses is satisfiable exactly when no variable shares an SCC with its negation in the implication graph.
- **Social and web graphs:** groups of accounts that all follow each other, link farms of pages pointing at each other.

SCCs are a directed-graph tool. For undirected graphs every connected component is already "strongly" connected, and [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) or BFS is enough.

## 10. Edge Cases

- **No edges:** every vertex is its own SCC (vertex 8 in the examples).
- **Self-loop u → u:** u is still a one-vertex SCC; the self-loop does not merge it with anything.
- **Duplicate edges:** harmless; the second copy finds its target already visited.
- **A single big cycle:** one SCC containing all vertices (Example 3: "path closed into a ring").
- **A DAG:** every SCC has size 1 (Example 3: "one long path" gives 100 000 SCCs).
- **Deep graphs:** a path of 100 000 vertices makes a recursive DFS 100 000 calls deep; see the stack notes for your language below.

## Common Pitfalls

- **Recursion on big graphs.** A 100 000-vertex path threw \`StackOverflowError\` with the default stack. Use the iterative version, or run the DFS in \`new Thread(null, task, "dfs", 1L << 27)\` with a bigger stack.
- **Forgetting \`Arrays.fill(comp, -1)\`**: a fresh \`int[]\` is all zeros, so every vertex looks already assigned to component 0.
- **Lowering a low-link through a finished component.** Without the \`onStack[v]\` check, the edge 2→3 into the already-finished {3, 4, 5} would wrongly merge components.
- **Running pass 2 on the original graph** instead of the transpose in Kosaraju.
- **Comparing boxed \`Integer\` vertices with \`==\`** when adjacency is \`List<List<Integer>>\`; compare after unboxing to \`int\`, as the enhanced \`for (int v : ...)\` loop does.
- **\`stack.contains(v)\`** on a \`Deque\` is O(V); keep a \`boolean[] onStack\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An SCC is a maximal set where every vertex reaches every other; SCCs partition the vertices, and shrinking them gives a DAG, the condensation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kosaraju:</strong> <span style="color:#f0e2c8;">DFS once and record finish order; reverse every edge; DFS the reversed graph in decreasing finish order. Each tree is one SCC.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tarjan:</strong> <span style="color:#f0e2c8;">One DFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> stack and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[] onStack</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low[u] == index[u]</code>, pop a component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time; Kosaraju stores the transpose, Tarjan only O(V) extra arrays.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Recursion on a 100 000-vertex path throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> with the default stack, so I use an explicit stack, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> (CSR) adjacency for big graphs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why reverse the graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transpose has the same SCCs but reversed condensation edges, so the source component found last in pass 1 becomes a sink and its DFS cannot escape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the on-stack check in Tarjan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A visited vertex that is off the stack belongs to a finished component; using its index would merge two different SCCs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do components come out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kosaraju: topological order of the condensation. Tarjan: reverse topological order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid the StackOverflowError without rewriting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the DFS in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> created with a large stack size argument; but the iterative version is the robust answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then SCCs are just connected components; BFS or union-find is simpler.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachability** | v can be reached from u by following directed edges |
| **Strongly connected component (SCC)** | a maximal group in which every vertex reaches every other |
| **Condensation** | the DAG obtained by shrinking each SCC to one node |
| **Finish order (post-order)** | the order in which DFS finishes vertices |
| **Transpose graph** | the graph with every edge reversed; same SCCs |
| **Discovery index** | the visit counter value DFS gives each vertex |
| **Low-link** | smallest index reachable from a subtree with one edge back to the stack |
| **On-stack check** | only edges to vertices still on the stack may lower a low-link |
| **CSR adjacency** | two flat \`int[]\` arrays: edge offsets per vertex and edge targets |

---
**Conclusion:** A strongly connected component is a maximal group of vertices that can all reach each other, and shrinking the components turns any directed graph into a DAG. Checking reachability pair by pair is O(V · (V + E)); Kosaraju does it in O(V + E) with two DFS passes, finish order on the graph then trees on the transpose, and Tarjan does it in one DFS by tracking discovery indices, low-links and a stack. They return the same partition, in opposite topological orders. In Java, the default thread stack throws \`StackOverflowError\` on deep paths, so an iterative DFS with primitive arrays is the robust choice.
`,
        examples: [
          { label: `Kosaraju: finish order, reversed graph, condensation edges`, code: `import java.util.*;

public class Main {
    // Kosaraju: DFS once to get finish order, then DFS the reversed graph in reverse finish order.
    static List<List<Integer>> adj = new ArrayList<>(), radj = new ArrayList<>();
    static boolean[] seen;
    static List<Integer> order = new ArrayList<>();
    static int[] comp;
    static List<List<Integer>> comps = new ArrayList<>();

    static void dfs1(int u) {
        seen[u] = true;
        for (int v : adj.get(u)) if (!seen[v]) dfs1(v);
        order.add(u);                                  // post-order: added after all descendants
    }

    static void dfs2(int u, int c) {
        comp[u] = c;
        comps.get(c).add(u);
        for (int v : radj.get(u)) if (comp[v] == -1) dfs2(v, c);
    }

    public static void main(String[] args) {
        int n = 9;
        int[][] edges = {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 5}, {5, 3}, {6, 5}, {6, 7}, {7, 6}};
        for (int i = 0; i < n; i++) { adj.add(new ArrayList<>()); radj.add(new ArrayList<>()); }
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); radj.get(e[1]).add(e[0]); } // radj is the transpose

        seen = new boolean[n];
        for (int u = 0; u < n; u++) if (!seen[u]) dfs1(u);

        comp = new int[n];
        Arrays.fill(comp, -1);
        for (int i = order.size() - 1; i >= 0; i--) {  // latest finisher first
            int u = order.get(i);
            if (comp[u] == -1) {
                comps.add(new ArrayList<>());
                dfs2(u, comps.size() - 1);
            }
        }

        System.out.println("finish order of pass 1: " + order);
        for (int i = 0; i < comps.size(); i++) {
            List<Integer> c = new ArrayList<>(comps.get(i));
            Collections.sort(c);
            System.out.println("pass 2 found component " + i + ": " + c);
        }
        System.out.println("component id of each vertex: " + Arrays.toString(comp));

        TreeSet<List<Integer>> dag = new TreeSet<>((a, b) -> a.get(0).equals(b.get(0)) ? a.get(1) - b.get(1) : a.get(0) - b.get(0));
        for (int[] e : edges) if (comp[e[0]] != comp[e[1]]) dag.add(List.of(comp[e[0]], comp[e[1]]));
        StringBuilder sb = new StringBuilder();
        for (List<Integer> p : dag) sb.append(sb.length() > 0 ? ", " : "").append("C" + p.get(0) + "->C" + p.get(1));
        System.out.println("condensation edges: " + sb);
    }
}
` },
          { label: `Tarjan low-links, checked against Kosaraju on 300 random graphs`, code: `import java.util.*;

public class Main {
    // Tarjan: one DFS with discovery indices, low-links and a stack; checked against Kosaraju.
    static class Tarjan {
        final List<List<Integer>> adj;
        final int[] index, low;
        final boolean[] onStack;
        final Deque<Integer> stack = new ArrayDeque<>();
        final List<List<Integer>> comps = new ArrayList<>();
        int counter = 0;

        Tarjan(List<List<Integer>> adj) {
            this.adj = adj;
            int n = adj.size();
            index = new int[n];
            low = new int[n];
            onStack = new boolean[n];
            Arrays.fill(index, -1);              // -1 = not discovered yet
            for (int u = 0; u < n; u++) if (index[u] == -1) dfs(u);
        }

        void dfs(int u) {
            index[u] = low[u] = counter++;
            stack.push(u);
            onStack[u] = true;
            for (int v : adj.get(u)) {
                if (index[v] == -1) {            // tree edge: recurse, then inherit the child low-link
                    dfs(v);
                    low[u] = Math.min(low[u], low[v]);
                } else if (onStack[v]) {         // edge back into the current, unfinished component
                    low[u] = Math.min(low[u], index[v]);
                }
            }
            if (low[u] == index[u]) {            // u is the root of a component: pop it off
                List<Integer> comp = new ArrayList<>();
                int w;
                do {
                    w = stack.pop();
                    onStack[w] = false;
                    comp.add(w);
                } while (w != u);
                Collections.sort(comp);
                comps.add(comp);
            }
        }
    }

    static List<List<Integer>> kosaraju(List<List<Integer>> adj) {
        int n = adj.size();
        List<List<Integer>> radj = new ArrayList<>();
        for (int i = 0; i < n; i++) radj.add(new ArrayList<>());
        for (int u = 0; u < n; u++) for (int v : adj.get(u)) radj.get(v).add(u);
        boolean[] seen = new boolean[n];
        List<Integer> order = new ArrayList<>();
        for (int u = 0; u < n; u++) if (!seen[u]) dfs1(u, adj, seen, order);
        int[] comp = new int[n];
        Arrays.fill(comp, -1);
        List<List<Integer>> comps = new ArrayList<>();
        for (int i = n - 1; i >= 0; i--) {
            int u = order.get(i);
            if (comp[u] == -1) { comps.add(new ArrayList<>()); dfs2(u, comps.size() - 1, radj, comp, comps); }
        }
        for (List<Integer> c : comps) Collections.sort(c);
        return comps;
    }

    static void dfs1(int u, List<List<Integer>> adj, boolean[] seen, List<Integer> order) {
        seen[u] = true;
        for (int v : adj.get(u)) if (!seen[v]) dfs1(v, adj, seen, order);
        order.add(u);
    }

    static void dfs2(int u, int c, List<List<Integer>> radj, int[] comp, List<List<Integer>> comps) {
        comp[u] = c;
        comps.get(c).add(u);
        for (int v : radj.get(u)) if (comp[v] == -1) dfs2(v, c, radj, comp, comps);
    }

    static String key(List<List<Integer>> comps) {       // order-independent fingerprint
        List<String> parts = new ArrayList<>();
        for (List<Integer> c : comps) parts.add(c.toString());
        Collections.sort(parts);
        return String.join(" ", parts);
    }

    static long seed = 2024;
    static int rand() { seed = seed * 48271 % 2147483647L; return (int) seed; }

    static List<List<Integer>> emptyGraph(int n) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        return g;
    }

    public static void main(String[] args) {
        int[][] edges = {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 5}, {5, 3}, {6, 5}, {6, 7}, {7, 6}};
        List<List<Integer>> adj = emptyGraph(9);
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        Tarjan t = new Tarjan(adj);
        System.out.println("Tarjan completes components in this order:");
        for (List<Integer> c : t.comps) System.out.println("  " + c);
        System.out.println("index: " + Arrays.toString(t.index));
        System.out.println("low:   " + Arrays.toString(t.low));

        int graphs = 0, same = 0, reverseTopo = 0;
        for (int trial = 0; trial < 300; trial++) {
            int n = rand() % 40 + 1;
            int m = rand() % (2 * n + 1);
            List<List<Integer>> g = emptyGraph(n);
            for (int i = 0; i < m; i++) {
                int u = rand() % n;
                g.get(u).add(rand() % n);
            }
            List<List<Integer>> tComps = new Tarjan(g).comps;
            graphs++;
            if (key(tComps).equals(key(kosaraju(g)))) same++;
            int[] pos = new int[n];          // position of each vertex's component in Tarjan output
            for (int i = 0; i < tComps.size(); i++) for (int x : tComps.get(i)) pos[x] = i;
            boolean ok = true;
            for (int u = 0; u < n; u++) for (int v : g.get(u)) if (pos[v] > pos[u]) ok = false;
            if (ok) reverseTopo++;
        }
        System.out.println("random graphs: " + graphs + ", same partition as Kosaraju: " + same
            + ", Tarjan order is reverse topological: " + reverseTopo);
    }
}
` },
          { label: `Iterative Kosaraju on 100 000-vertex graphs (no recursion)`, code: `import java.util.*;

public class Main {
    // Iterative Kosaraju: no recursion, so a 100 000-vertex path cannot overflow the call stack.
    static List<Integer> sccIterative(int n, List<int[]> edges) {
        // adjacency as int arrays (CSR style): no boxing of 100 000 Integer objects per list
        int[] outDeg = new int[n + 1], inDeg = new int[n + 1];
        for (int[] e : edges) { outDeg[e[0] + 1]++; inDeg[e[1] + 1]++; }
        for (int i = 0; i < n; i++) { outDeg[i + 1] += outDeg[i]; inDeg[i + 1] += inDeg[i]; }
        int[] out = new int[edges.size()], in = new int[edges.size()];
        int[] po = outDeg.clone(), pi = inDeg.clone();
        for (int[] e : edges) { out[po[e[0]]++] = e[1]; in[pi[e[1]]++] = e[0]; }

        // pass 1: explicit stacks of vertex and index of the next edge to try
        boolean[] seen = new boolean[n];
        int[] order = new int[n];
        int done = 0;
        int[] stackV = new int[n], stackI = new int[n];
        for (int s = 0; s < n; s++) {
            if (seen[s]) continue;
            seen[s] = true;
            int top = 0;
            stackV[0] = s;
            stackI[0] = outDeg[s];
            while (top >= 0) {
                int u = stackV[top];
                if (stackI[top] < outDeg[u + 1]) {
                    int v = out[stackI[top]++];
                    if (!seen[v]) {
                        seen[v] = true;
                        top++;
                        stackV[top] = v;
                        stackI[top] = outDeg[v];
                    }
                } else {
                    top--;
                    order[done++] = u;           // finished: all edges of u were tried
                }
            }
        }

        // pass 2: plain stack flood fill on the transpose, latest finisher first
        int[] comp = new int[n];
        Arrays.fill(comp, -1);
        List<Integer> sizes = new ArrayList<>();
        int[] todo = new int[n];
        for (int k = n - 1; k >= 0; k--) {
            int s = order[k];
            if (comp[s] != -1) continue;
            int c = sizes.size(), size = 0, top = 0;
            comp[s] = c;
            todo[top++] = s;
            while (top > 0) {
                int u = todo[--top];
                size++;
                for (int j = inDeg[u]; j < inDeg[u + 1]; j++) {
                    int v = in[j];
                    if (comp[v] == -1) { comp[v] = c; todo[top++] = v; }
                }
            }
            sizes.add(size);
        }
        return sizes;
    }

    static void report(String name, int n, List<int[]> edges) {
        List<Integer> sizes = sccIterative(n, edges);
        System.out.println(name + ": " + n + " vertices, " + edges.size() + " edges -> " + sizes.size()
            + " SCCs, largest SCC size " + Collections.max(sizes));
    }

    public static void main(String[] args) {
        int n = 100000;
        List<int[]> path = new ArrayList<>();
        for (int i = 0; i < n - 1; i++) path.add(new int[]{i, i + 1});
        report("one long path", n, path);
        List<int[]> ring = new ArrayList<>(path);
        ring.add(new int[]{n - 1, 0});
        report("path closed into a ring", n, ring);
        List<int[]> rings = new ArrayList<>();
        for (int k = 0; k < 1000; k++) {         // 1000 rings of 100 vertices, ring k -> ring k+1
            int base = k * 100;
            for (int j = 0; j < 100; j++) rings.add(new int[]{base + j, base + (j + 1) % 100});
            if (k + 1 < 1000) rings.add(new int[]{base, base + 100});
        }
        report("1000 rings in a row", n, rings);
        rings.add(new int[]{99900, 0});          // one edge back from the last ring to the first
        report("rings plus one back edge", n, rings);
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a directed graph with n vertices and a list of edges, group the vertices into strongly connected components, where every vertex in a group can reach every other one. Walk me through an O(V + E) approach and code it in C++."

**What a strong answer should cover:**
- The definition: u and v are in the same SCC exactly when u reaches v and v reaches u; SCCs partition the vertices, and every directed cycle lies inside one SCC.
- Why the naive approach (a BFS or DFS from every vertex, then compare reachability) is O(V · (V + E)), and that linear-time algorithms exist.
- Kosaraju: DFS to record finish order, then DFS the reversed graph in decreasing finish order; each tree of the second pass is one SCC. Or Tarjan: one DFS with discovery indices, low-links and a stack.
- The condensation: contracting each SCC to one node gives a DAG, which is what makes SCCs useful (topological order, 2-SAT, dependency groups).
- C++ specifics: \`vector<vector<int>>\` adjacency; recursion uses the native stack (a 100 000-deep recursive DFS ran fine with the 8 MB default here, but the limit is platform-dependent); an iterative DFS must not keep a reference into the stack vector across \`push_back\`.

**Clarifying questions expected:**
- "Can there be self-loops or duplicate edges? Are the vertices numbered 0 to n - 1?"
- "How large can the graph be? Is deep recursion a concern?"
- "Should the components come out in any particular order?"

**Code / implementation expected:** Yes — Kosaraju or Tarjan in C++, returning \`vector<vector<int>>\`; an iterative version is a strong bonus.`,
        answer: `**Target Audience:** Interview candidates who know BFS and DFS on graphs; strongly connected components are explained from scratch
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a city where every street is **one-way**. From your house you can drive to the bakery, but maybe there is no legal route back. Some neighbourhoods are friendly: inside them, you can get from any corner to any other corner and back again. Others are traps: once you drive out of the old town onto the ring road, no street ever leads you back in.

A city planner wants to know those friendly neighbourhoods. Within one of them, a delivery van can serve every address and return to its depot. Between them, traffic only flows one way, so the neighbourhoods themselves line up like a river system: upstream areas feed downstream ones, and nothing flows back up.

Those friendly neighbourhoods are the **strongly connected components** of the street graph. Finding them is a classic hard interview question because the simple idea, "check every pair of corners in both directions", is far too slow, and the fast algorithms are two clever uses of depth-first search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the graph directed? | SCCs only make sense for directed graphs. For an undirected graph, plain [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) are the answer. |
| How are vertices numbered, and can there be self-loops or duplicate edges? | 0..n-1 lets you use arrays. Self-loops and duplicates are harmless for both algorithms but worth confirming. |
| How large can V and E get? | Above a few thousand vertices on a long path, recursive DFS can overflow the stack; plan an iterative version. |
| What output do you want: the groups, a component id per vertex, or just the count? | Changes the return type, and whether you also need the condensation graph. |
| Does the order of the components matter? | Kosaraju naturally outputs them in topological order of the condensation, Tarjan in reverse topological order. |

## 3. The Core Idea

📌 **Interview term: Reachability** — vertex v is reachable from u if there is a directed path from u to v (following the arrows).

📌 **Interview term: Strongly connected component (SCC)** — a maximal set of vertices in which every vertex is reachable from every other one. "Maximal" means you cannot add another vertex and keep that property. Every vertex belongs to exactly one SCC (possibly just itself), so the SCCs partition the graph, and every directed cycle lies entirely inside one SCC.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Directed graph with nine vertices grouped into four strongly connected components: 0 1 2 form a cycle, 3 4 5 form a cycle, 6 and 7 point at each other, and 8 is alone. Edge 2 to 3 and edge 6 to 5 connect the groups.">
  <defs>
    <marker id="scc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="20" width="250" height="180" rx="14"/>
  <rect class="d-box-muted" x="330" y="240" width="250" height="80" rx="14"/>
  <rect class="d-box-muted" x="610" y="240" width="76" height="80" rx="14"/>
  <rect class="d-box" x="40" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="67" y="66" text-anchor="middle">0</text>
  <rect class="d-box" x="196" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="223" y="66" text-anchor="middle">1</text>
  <rect class="d-box" x="118" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="145" y="166" text-anchor="middle">2</text>
  <path class="d-edge" d="M 96 60 L 188 60" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 214 82 L 170 136" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 122 138 L 78 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="428" y="40" width="54" height="40" rx="20"/>
  <text class="d-text" x="455" y="66" text-anchor="middle">4</text>
  <rect class="d-box" x="506" y="140" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="166" text-anchor="middle">5</text>
  <path class="d-edge" d="M 386 138 L 432 86" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 478 82 L 522 134" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 160 L 412 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 174 160 L 342 160" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="350" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="377" y="286" text-anchor="middle">6</text>
  <rect class="d-box" x="506" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="533" y="286" text-anchor="middle">7</text>
  <path class="d-edge" d="M 406 274 L 498 274" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge" d="M 504 290 L 412 290" fill="none" marker-end="url(#scc1-arrow)"/>
  <path class="d-edge-accent" d="M 390 258 L 520 186" fill="none" marker-end="url(#scc1-arrow)"/>
  <rect class="d-box" x="621" y="260" width="54" height="40" rx="20"/>
  <text class="d-text" x="648" y="286" text-anchor="middle">8</text>
</svg>

This is the graph in the examples: edges 0→1, 1→2, 2→0, 2→3, 3→4, 4→5, 5→3, 6→5, 6→7, 7→6, and vertex 8 with no edges. The shaded groups are its four SCCs: {0, 1, 2}, {3, 4, 5}, {6, 7} and {8}. The two highlighted edges, 2→3 and 6→5, run **between** components, and no path leads back, which is why 2 and 3 are in different components even though 2 reaches 3.

📌 **Interview term: Condensation (component graph)** — the graph you get by shrinking every SCC to a single node and keeping one edge between two components when any original edge connects them. It is always a **DAG** (directed acyclic graph): if two components could reach each other, they would be one component.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 200" role="img" aria-label="Condensation DAG: component of 6 and 7 points to the component of 3 4 5, and the component of 0 1 2 also points to it. The component of 8 has no edges.">
  <defs>
    <marker id="scc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="61" text-anchor="middle">{0, 1, 2}</text>
  <rect class="d-box" x="30" y="120" width="130" height="50" rx="10"/>
  <text class="d-text" x="95" y="151" text-anchor="middle">{6, 7}</text>
  <rect class="d-box-accent" x="260" y="75" width="130" height="50" rx="10"/>
  <text class="d-text" x="325" y="106" text-anchor="middle">{3, 4, 5}</text>
  <rect class="d-box-muted" x="460" y="75" width="110" height="50" rx="10"/>
  <text class="d-text" x="515" y="106" text-anchor="middle">{8}</text>
  <path class="d-edge" d="M 162 60 L 252 92" fill="none" marker-end="url(#scc2-arrow)"/>
  <path class="d-edge" d="M 162 140 L 252 110" fill="none" marker-end="url(#scc2-arrow)"/>
</svg>

The condensation has no cycles, so it has a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used). The component {3, 4, 5} is a **sink**: nothing leaves it. That observation is the key to Kosaraju's algorithm.

### Brute force first

For every vertex, run a BFS to find everything it reaches, then u and v share a component when each is in the other's reachable set. That is V searches of O(V + E) each: O(V · (V + E)) time and O(V²) memory for the reachability table. Fine for 100 vertices, hopeless for 100 000. Both algorithms below do it in one or two DFS passes: O(V + E).

## 4. Kosaraju's Algorithm: Two DFS Passes

📌 **Interview term: Finish order (post-order)** — the order in which a DFS finishes vertices: a vertex finishes after all vertices reachable from it through unvisited paths have finished.

📌 **Interview term: Transpose graph** — the same vertices with every edge reversed. A graph and its transpose have exactly the same SCCs (reversing every arrow keeps "u reaches v and v reaches u"), but the edges of the condensation are reversed.

The algorithm:

1. Run a DFS over the whole graph and record vertices in **finish order**.
2. Build the transpose.
3. Take vertices in **decreasing** finish order. Each time you meet an unassigned vertex, DFS from it **in the transpose**; every vertex that DFS reaches is one SCC.

**Why it works, in two sentences.** The vertex that finishes last in pass 1 lies in a **source** component of the condensation (nothing outside points into it). In the transpose that component becomes a sink, so a DFS started there cannot leak into any other component; remove it, and the next-latest finisher sits in a source of what remains, and so on.

It is credited to S. Rao Kosaraju (1978) and was published by Micha Sharir in 1981, which is why some books call it the Kosaraju–Sharir algorithm.

## 5. Tarjan's Algorithm: One DFS With Low-Links

Tarjan's algorithm finds the same components in a single DFS, without building the transpose.

📌 **Interview term: Discovery index** — a counter value given to each vertex the moment DFS first visits it: 0, 1, 2, ...

📌 **Interview term: Low-link** — for a vertex u, the smallest discovery index reachable from u's DFS subtree using tree edges plus at most one edge back to a vertex that is **still on the stack**. If \`low[u] == index[u]\`, nothing below u can climb above it, so u is the root of a component.

The algorithm:

1. On visiting u: set \`index[u] = low[u] = counter++\`, push u on a stack, mark it on-stack.
2. For each edge u → v: if v is unvisited, recurse, then \`low[u] = min(low[u], low[v])\`. If v is visited **and still on the stack**, \`low[u] = min(low[u], index[v])\`. If v is visited but no longer on the stack, it belongs to a finished component: ignore it.
3. After the loop, if \`low[u] == index[u]\`, pop the stack down to and including u. Those vertices are one SCC.

📌 **Interview term: On-stack check** — the condition "v is still on the stack" is what separates an edge back into the current, unfinished component (which lowers the low-link) from an edge into a component that is already complete (which must not).

It was published by Robert Tarjan in "Depth-First Search and Linear Graph Algorithms", *SIAM Journal on Computing* 1(2), 1972, with linear time and space bounds. Tarjan emits components in **reverse topological order** of the condensation (sinks first); Kosaraju emits them in topological order (sources first). Example 2 checks that claim on 300 random graphs instead of asserting it.

| | Kosaraju | Tarjan |
| :--- | :--- | :--- |
| DFS passes | 2 (graph, then transpose) | 1 |
| Extra memory | the transpose graph, O(V + E) | index, low-link, on-stack flag and stack, O(V) |
| Output order | topological order of the condensation | reverse topological order |
| Easier to | explain and get right | write once you know it; no transpose |

## 6. The Code in C++

### Kosaraju (Example 1)

~~~cpp
vector<vector<int>> adj(n), radj(n);         // radj is the transpose: every edge reversed
for (auto [u, v] : edges) { adj[u].push_back(v); radj[v].push_back(u); }

vector<bool> seen(n, false);
vector<int> order;                           // vertices in the order their DFS finished
function<void(int)> dfs1 = [&](int u) {
    seen[u] = true;
    for (int v : adj[u]) if (!seen[v]) dfs1(v);
    order.push_back(u);                      // post-order: pushed after all descendants
};
for (int u = 0; u < n; ++u) if (!seen[u]) dfs1(u);

vector<int> comp(n, -1);
vector<vector<int>> comps;
function<void(int, int)> dfs2 = [&](int u, int c) {
    comp[u] = c;
    comps[c].push_back(u);
    for (int v : radj[u]) if (comp[v] == -1) dfs2(v, c);
};
for (auto it = order.rbegin(); it != order.rend(); ++it) {   // latest finisher first
    if (comp[*it] == -1) {
        comps.push_back({});
        dfs2(*it, (int)comps.size() - 1);
    }
}
~~~

- \`vector<vector<int>> adj(n), radj(n)\` creates n empty neighbour lists each; one loop fills the graph and its transpose.
- \`std::function<void(int)> dfs1 = [&](int u) { ... dfs1(v); ... }\` lets a lambda call itself: the lambda captures \`dfs1\` by reference, and by the time it runs the variable is initialised. \`std::function\` adds a small indirect-call cost; a plain recursive free function is faster.
- \`order.push_back(u)\` happens after the loop: post-order, so \`order\` is the finish order.
- \`order.rbegin()\` / \`rend()\` walk it backwards without copying.

### Tarjan (Example 2)

~~~cpp
void dfs(int u) {
    index[u] = low[u] = counter++;
    stack.push_back(u);
    onStack[u] = true;
    for (int v : adj[u]) {
        if (index[v] == -1) {            // tree edge: recurse, then inherit the child low-link
            dfs(v);
            low[u] = min(low[u], low[v]);
        } else if (onStack[v]) {         // edge back into the current, unfinished component
            low[u] = min(low[u], index[v]);
        }
    }
    if (low[u] == index[u]) {            // u is the root of a component: pop it off
        vector<int> comp;
        int w;
        do {
            w = stack.back();
            stack.pop_back();
            onStack[w] = false;
            comp.push_back(w);
        } while (w != u);
        sort(comp.begin(), comp.end());
        comps.push_back(comp);
    }
}
~~~

- The stack is a plain \`vector<int>\` with \`push_back\` / \`back\` / \`pop_back\`; \`std::stack\` would work too, it is just an adaptor over \`deque\`.
- \`onStack\` is a \`vector<bool>\` (bit-packed) so the "still on the stack?" test is O(1).
- \`index[u] = low[u] = counter++;\` assigns the current counter to both, then increments it.
- The \`Tarjan\` struct stores \`const Graph& adj\`: a reference member, so the graph must outlive the object; in Example 2 it does, because the struct is used immediately.
- Recursion uses the native stack. A 100 000-deep recursive Kosaraju ran fine here with the 8 MB default stack, but stack limits vary by platform and threads often get less, so Example 3 shows the iterative form.

### Iterative DFS (Example 3)

Each stack entry is \`(vertex, index of the next edge to try)\`, which is exactly what the call stack would remember:

~~~cpp
// pass 1: explicit stack of (vertex, index of the next edge to try)
vector<bool> seen(n, false);
vector<int> order;
order.reserve(n);
vector<pair<int, size_t>> stack;
for (int s = 0; s < n; ++s) {
    if (seen[s]) continue;
    seen[s] = true;
    stack.push_back({s, 0});
    while (!stack.empty()) {
        auto& [u, i] = stack.back();       // reference into the vector...
        if (i < adj[u].size()) {
            int v = adj[u][i++];           // ...so advance i BEFORE push_back can reallocate it
            if (!seen[v]) {
                seen[v] = true;
                stack.push_back({v, 0});
            }
        } else {
            order.push_back(u);            // finished: all edges of u were tried
            stack.pop_back();
        }
    }
}
~~~

The comment in the middle is the C++-specific trap. \`auto& [u, i] = stack.back()\` binds references into the vector; \`stack.push_back\` may reallocate and leave them dangling. The code advances \`i\` **before** pushing, and does not touch \`u\` or \`i\` after the push. In the finish branch it reads \`u\` before \`pop_back()\` for the same reason. The example was also compiled with \`-fsanitize=address,undefined\` during testing and ran clean.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS from every vertex | O(V · (V + E)) | O(V²) | V full searches plus a reachability table |
| Kosaraju | O(V + E) | O(V + E) | two DFS passes; the transpose has E edges |
| Tarjan | O(V + E) | O(V) beyond the graph | one DFS; each vertex is pushed and popped once |
| Iterative Kosaraju (Example 3) | O(V + E) | O(V + E) | same work; the explicit stack replaces the call stack |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why a recursive DFS needs O(V) stack in the worst case (a long path).

## 8. Verified: Running the Code

Each example on this page was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Kosaraju with its finish order** prints:

~~~text
finish order of pass 1: [5, 4, 3, 2, 1, 0, 7, 6, 8]
pass 2 found component 0: [8]
pass 2 found component 1: [6, 7]
pass 2 found component 2: [0, 1, 2]
pass 2 found component 3: [3, 4, 5]
component id of each vertex: [2, 2, 2, 3, 3, 3, 1, 1, 0]
condensation edges: C1->C3, C2->C3
~~~

Reading it: vertex 8 finished last, so pass 2 starts there and finds {8} alone; then 6 finds {6, 7}; then 0 finds {0, 1, 2}; then 3 finds {3, 4, 5}. The components come out as C0 to C3 in a topological order of the condensation, and the two condensation edges, C1->C3 and C2->C3, both point forward.

**Example 2 — Tarjan, checked against Kosaraju** prints:

~~~text
Tarjan completes components in this order:
  [3, 4, 5]
  [0, 1, 2]
  [6, 7]
  [8]
index: [0, 1, 2, 3, 4, 5, 6, 7, 8]
low:   [0, 0, 0, 3, 3, 3, 6, 6, 8]
random graphs: 300, same partition as Kosaraju: 300, Tarjan order is reverse topological: 300
~~~

Reading it: Tarjan completes {3, 4, 5} first, because it is a sink, and the roots of the components are exactly the vertices with \`low == index\` (0, 3, 6 and 8). On 300 random directed graphs with up to 40 vertices, Tarjan and Kosaraju produced the same partition every time, and Tarjan's output order was always reverse topological: every edge goes from a later-emitted component to an earlier-emitted one, or stays inside one.

**Example 3 — iterative Kosaraju on 100 000 vertices** prints:

~~~text
one long path: 100000 vertices, 99999 edges -> 100000 SCCs, largest SCC size 1
path closed into a ring: 100000 vertices, 100000 edges -> 1 SCCs, largest SCC size 100000
1000 rings in a row: 100000 vertices, 100999 edges -> 1000 SCCs, largest SCC size 100
rings plus one back edge: 100000 vertices, 101000 edges -> 1 SCCs, largest SCC size 100000
~~~

Reading it: a path is a DAG, so every vertex is its own SCC; closing it into a ring makes one SCC of everything; 1000 rings chained forward stay 1000 SCCs; one back edge from the last ring to the first merges them all. Each run goes 100 000 vertices deep, with no recursion at all.

## 9. Where SCCs Are Used

- **Detecting directed cycles, with detail.** A graph has a directed cycle exactly when some SCC has more than one vertex or a self-loop. Plain [directed cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph) answers yes or no; SCCs tell you every group of mutually dependent nodes, which is what a build tool reports for circular imports, or a scheduler for a [course schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) that cannot be finished.
- **Turning any directed graph into a DAG.** After condensation you can run DP or [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) on components, for example "the maximum total value collectable on a walk" where a walk may loop inside a component.
- **2-SAT.** A boolean formula of two-literal clauses is satisfiable exactly when no variable shares an SCC with its negation in the implication graph.
- **Social and web graphs:** groups of accounts that all follow each other, link farms of pages pointing at each other.

SCCs are a directed-graph tool. For undirected graphs every connected component is already "strongly" connected, and [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) or BFS is enough.

## 10. Edge Cases

- **No edges:** every vertex is its own SCC (vertex 8 in the examples).
- **Self-loop u → u:** u is still a one-vertex SCC; the self-loop does not merge it with anything.
- **Duplicate edges:** harmless; the second copy finds its target already visited.
- **A single big cycle:** one SCC containing all vertices (Example 3: "path closed into a ring").
- **A DAG:** every SCC has size 1 (Example 3: "one long path" gives 100 000 SCCs).
- **Deep graphs:** a path of 100 000 vertices makes a recursive DFS 100 000 calls deep; see the stack notes for your language below.

## Common Pitfalls

- **Dangling references into a vector.** In the iterative DFS, a reference from \`stack.back()\` is invalid after \`push_back\` reallocates; update the frame first, then push.
- **Deep recursion.** Fine at 100 000 here with an 8 MB stack, but threads and other platforms often have far less; know the iterative form.
- **Lowering a low-link through a finished component.** Without the \`onStack[v]\` check, the edge 2→3 into the already-finished {3, 4, 5} would wrongly merge components.
- **Running pass 2 on the original graph** instead of the transpose in Kosaraju.
- **A recursive lambda without \`std::function\`.** \`auto dfs = [&](int u) { dfs(v); }\` does not compile, because the lambda cannot name itself before its type is known; use \`std::function\` or a free function.
- **A reference member to a temporary graph.** \`Tarjan t(buildGraph());\` would bind \`const Graph&\` to a temporary that dies at the end of the statement.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An SCC is a maximal set where every vertex reaches every other; SCCs partition the vertices, and shrinking them gives a DAG, the condensation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kosaraju:</strong> <span style="color:#f0e2c8;">DFS once and record finish order; reverse every edge; DFS the reversed graph in decreasing finish order. Each tree is one SCC.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tarjan:</strong> <span style="color:#f0e2c8;">One DFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> stack and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onStack</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low[u] == index[u]</code>, pop a component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time; Kosaraju stores the transpose, Tarjan only O(V) extra arrays.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Recursion depth is limited by the native stack, so I can write it iteratively, taking care that a reference into the stack vector is not used after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why reverse the graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transpose has the same SCCs but reversed condensation edges, so the source component found last in pass 1 becomes a sink and its DFS cannot escape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the on-stack check in Tarjan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A visited vertex that is off the stack belongs to a finished component; using its index would merge two different SCCs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do components come out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kosaraju: topological order of the condensation. Tarjan: reverse topological order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build the condensation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Component id per vertex, then insert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{comp[u], comp[v]}</code> into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::set&lt;pair&lt;int, int&gt;&gt;</code> for every edge whose ends differ.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then SCCs are just connected components; BFS or union-find is simpler.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachability** | v can be reached from u by following directed edges |
| **Strongly connected component (SCC)** | a maximal group in which every vertex reaches every other |
| **Condensation** | the DAG obtained by shrinking each SCC to one node |
| **Finish order (post-order)** | the order in which DFS finishes vertices |
| **Transpose graph** | the graph with every edge reversed; same SCCs |
| **Discovery index** | the visit counter value DFS gives each vertex |
| **Low-link** | smallest index reachable from a subtree with one edge back to the stack |
| **On-stack check** | only edges to vertices still on the stack may lower a low-link |
| **Iterator / reference invalidation** | after \`push_back\` reallocates, references into the old buffer dangle |

---
**Conclusion:** A strongly connected component is a maximal group of vertices that can all reach each other, and shrinking the components turns any directed graph into a DAG. Checking reachability pair by pair is O(V · (V + E)); Kosaraju does it in O(V + E) with two DFS passes, finish order on the graph then trees on the transpose, and Tarjan does it in one DFS by tracking discovery indices, low-links and a stack. They return the same partition, in opposite topological orders. In C++, recursion survives deeper thanks to the native stack, but the iterative version must respect reference invalidation in \`std::vector\`.
`,
        examples: [
          { label: `Kosaraju: finish order, reversed graph, condensation edges`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <set>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Kosaraju: DFS once to get finish order, then DFS the reversed graph in reverse finish order.
string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

int main() {
    const int n = 9;
    vector<pair<int, int>> edges = {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 5}, {5, 3}, {6, 5}, {6, 7}, {7, 6}};
    vector<vector<int>> adj(n), radj(n);         // radj is the transpose: every edge reversed
    for (auto [u, v] : edges) { adj[u].push_back(v); radj[v].push_back(u); }

    vector<bool> seen(n, false);
    vector<int> order;                           // vertices in the order their DFS finished
    function<void(int)> dfs1 = [&](int u) {
        seen[u] = true;
        for (int v : adj[u]) if (!seen[v]) dfs1(v);
        order.push_back(u);                      // post-order: pushed after all descendants
    };
    for (int u = 0; u < n; ++u) if (!seen[u]) dfs1(u);

    vector<int> comp(n, -1);
    vector<vector<int>> comps;
    function<void(int, int)> dfs2 = [&](int u, int c) {
        comp[u] = c;
        comps[c].push_back(u);
        for (int v : radj[u]) if (comp[v] == -1) dfs2(v, c);
    };
    for (auto it = order.rbegin(); it != order.rend(); ++it) {   // latest finisher first
        if (comp[*it] == -1) {
            comps.push_back({});
            dfs2(*it, (int)comps.size() - 1);
        }
    }

    cout << "finish order of pass 1: " << fmt(order) << "\\n";
    for (size_t i = 0; i < comps.size(); ++i) {
        vector<int> c = comps[i];
        sort(c.begin(), c.end());
        cout << "pass 2 found component " << i << ": " << fmt(c) << "\\n";
    }
    cout << "component id of each vertex: " << fmt(comp) << "\\n";

    set<pair<int, int>> dag;                     // std::set keeps pairs sorted and unique
    for (auto [u, v] : edges) if (comp[u] != comp[v]) dag.insert({comp[u], comp[v]});
    string s;
    for (auto [a, b] : dag) s += (s.empty() ? "" : ", ") + string("C") + to_string(a) + "->C" + to_string(b);
    cout << "condensation edges: " << s << "\\n";
}
` },
          { label: `Tarjan low-links, checked against Kosaraju on 300 random graphs`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Tarjan: one DFS with discovery indices, low-links and a stack; checked against Kosaraju.
using Graph = vector<vector<int>>;

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

struct Tarjan {
    const Graph& adj;
    vector<int> index, low, stack;
    vector<bool> onStack;
    vector<vector<int>> comps;
    int counter = 0;

    explicit Tarjan(const Graph& g) : adj(g), index(g.size(), -1), low(g.size(), 0), onStack(g.size(), false) {
        for (int u = 0; u < (int)g.size(); ++u) if (index[u] == -1) dfs(u);
    }

    void dfs(int u) {
        index[u] = low[u] = counter++;
        stack.push_back(u);
        onStack[u] = true;
        for (int v : adj[u]) {
            if (index[v] == -1) {            // tree edge: recurse, then inherit the child low-link
                dfs(v);
                low[u] = min(low[u], low[v]);
            } else if (onStack[v]) {         // edge back into the current, unfinished component
                low[u] = min(low[u], index[v]);
            }
        }
        if (low[u] == index[u]) {            // u is the root of a component: pop it off
            vector<int> comp;
            int w;
            do {
                w = stack.back();
                stack.pop_back();
                onStack[w] = false;
                comp.push_back(w);
            } while (w != u);
            sort(comp.begin(), comp.end());
            comps.push_back(comp);
        }
    }
};

vector<vector<int>> kosaraju(const Graph& adj) {
    int n = adj.size();
    Graph radj(n);
    for (int u = 0; u < n; ++u) for (int v : adj[u]) radj[v].push_back(u);
    vector<bool> seen(n, false);
    vector<int> order, comp(n, -1);
    function<void(int)> dfs1 = [&](int u) {
        seen[u] = true;
        for (int v : adj[u]) if (!seen[v]) dfs1(v);
        order.push_back(u);
    };
    for (int u = 0; u < n; ++u) if (!seen[u]) dfs1(u);
    vector<vector<int>> comps;
    function<void(int, int)> dfs2 = [&](int u, int c) {
        comp[u] = c;
        comps[c].push_back(u);
        for (int v : radj[u]) if (comp[v] == -1) dfs2(v, c);
    };
    for (int i = n - 1; i >= 0; --i)
        if (comp[order[i]] == -1) { comps.push_back({}); dfs2(order[i], (int)comps.size() - 1); }
    for (auto& c : comps) sort(c.begin(), c.end());
    return comps;
}

long long seed = 2024;
int rnd() { seed = seed * 48271 % 2147483647LL; return (int)seed; }

int main() {
    vector<pair<int, int>> edges = {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 5}, {5, 3}, {6, 5}, {6, 7}, {7, 6}};
    Graph adj(9);
    for (auto [u, v] : edges) adj[u].push_back(v);
    Tarjan t(adj);
    cout << "Tarjan completes components in this order:\\n";
    for (auto& c : t.comps) cout << "  " << fmt(c) << "\\n";
    cout << "index: " << fmt(t.index) << "\\n";
    cout << "low:   " << fmt(t.low) << "\\n";

    int graphs = 0, same = 0, reverseTopo = 0;
    for (int trial = 0; trial < 300; ++trial) {
        int n = rnd() % 40 + 1;
        int m = rnd() % (2 * n + 1);
        Graph g(n);
        for (int i = 0; i < m; ++i) {
            int u = rnd() % n;
            g[u].push_back(rnd() % n);
        }
        vector<vector<int>> tComps = Tarjan(g).comps;
        vector<vector<int>> a = tComps, b = kosaraju(g);
        sort(a.begin(), a.end());           // vectors compare lexicographically
        sort(b.begin(), b.end());
        ++graphs;
        if (a == b) ++same;
        vector<int> pos(n, 0);              // position of each vertex's component in Tarjan output
        for (int i = 0; i < (int)tComps.size(); ++i) for (int x : tComps[i]) pos[x] = i;
        bool ok = true;
        for (int u = 0; u < n; ++u) for (int v : g[u]) if (pos[v] > pos[u]) ok = false;
        if (ok) ++reverseTopo;
    }
    cout << "random graphs: " << graphs << ", same partition as Kosaraju: " << same
         << ", Tarjan order is reverse topological: " << reverseTopo << "\\n";
}
` },
          { label: `Iterative Kosaraju on 100 000-vertex graphs (no recursion)`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Iterative Kosaraju: no recursion, so a 100 000-vertex path cannot overflow the call stack.
vector<int> sccIterative(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n), radj(n);
    for (auto [u, v] : edges) { adj[u].push_back(v); radj[v].push_back(u); }

    // pass 1: explicit stack of (vertex, index of the next edge to try)
    vector<bool> seen(n, false);
    vector<int> order;
    order.reserve(n);
    vector<pair<int, size_t>> stack;
    for (int s = 0; s < n; ++s) {
        if (seen[s]) continue;
        seen[s] = true;
        stack.push_back({s, 0});
        while (!stack.empty()) {
            auto& [u, i] = stack.back();       // reference into the vector...
            if (i < adj[u].size()) {
                int v = adj[u][i++];           // ...so advance i BEFORE push_back can reallocate it
                if (!seen[v]) {
                    seen[v] = true;
                    stack.push_back({v, 0});
                }
            } else {
                order.push_back(u);            // finished: all edges of u were tried
                stack.pop_back();
            }
        }
    }

    // pass 2: plain stack flood fill on the transpose, latest finisher first
    vector<int> comp(n, -1), sizes, todo;
    for (auto it = order.rbegin(); it != order.rend(); ++it) {
        int s = *it;
        if (comp[s] != -1) continue;
        int c = sizes.size(), size = 0;
        comp[s] = c;
        todo.push_back(s);
        while (!todo.empty()) {
            int u = todo.back();
            todo.pop_back();
            ++size;
            for (int v : radj[u]) if (comp[v] == -1) { comp[v] = c; todo.push_back(v); }
        }
        sizes.push_back(size);
    }
    return sizes;
}

void report(const string& name, int n, const vector<pair<int, int>>& edges) {
    vector<int> sizes = sccIterative(n, edges);
    cout << name << ": " << n << " vertices, " << edges.size() << " edges -> " << sizes.size()
         << " SCCs, largest SCC size " << *max_element(sizes.begin(), sizes.end()) << "\\n";
}

int main() {
    const int n = 100000;
    vector<pair<int, int>> path;
    for (int i = 0; i < n - 1; ++i) path.push_back({i, i + 1});
    report("one long path", n, path);
    vector<pair<int, int>> ring = path;
    ring.push_back({n - 1, 0});
    report("path closed into a ring", n, ring);
    vector<pair<int, int>> rings;
    for (int k = 0; k < 1000; ++k) {           // 1000 rings of 100 vertices, ring k -> ring k+1
        int base = k * 100;
        for (int j = 0; j < 100; ++j) rings.push_back({base + j, base + (j + 1) % 100});
        if (k + 1 < 1000) rings.push_back({base, base + 100});
    }
    report("1000 rings in a row", n, rings);
    rings.push_back({99900, 0});               // one edge back from the last ring to the first
    report("rings plus one back edge", n, rings);
}
` },
        ],
      },
    },
  },
  {
    title: `Longest increasing path in matrix — why DFS + memo beats brute force?`,
    difficulty: "hard",
    seoDescription: `Longest increasing path in a matrix in Python, JavaScript, Java and C++: why DFS + memo is O(m·n), measured call counts, and a Kahn layering version.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an m by n matrix of integers, return the length of the longest strictly increasing path, moving only up, down, left or right. Start with the brute force, explain why it is slow, then make it fast. Please write it in Python."

**What a strong answer should cover:**
- The model: every cell is a node with an edge to each strictly larger neighbour; strictly increasing means no cycles, so it is a DAG, and the answer is its longest path.
- Brute force: DFS from every cell exploring every increasing path is exponential, because the same cells are re-explored from many starts.
- DFS + memo: the longest path starting at a cell does not depend on how you reached it, so cache it; each cell is solved once and each edge is followed once: O(m·n) time and space.
- No visited set is needed (values strictly increase, so a path cannot revisit a cell), and the alternative is Kahn topological layering, which avoids recursion.
- Python specifics: a nested \`dfs\` closing over a \`memo\` list of lists (or \`functools.lru_cache(maxsize=None)\` on a nested function), and the recursion limit: a 1 x 1000 strictly increasing row already raised \`RecursionError\`, so large inputs need the iterative topological version.

**Clarifying questions expected:**
- "Strictly increasing, or is equal allowed?" (equal values would create cycles and break memoisation)
- "Only four directions, no diagonals? Can the matrix be empty?"

**Code / implementation expected:** Yes — \`longest_increasing_path(matrix)\` in Python with DFS + memo; the Kahn layering version is a bonus.`,
        answer: `**Target Audience:** Interview candidates who know recursion and grid DFS; memoisation and the DAG view are explained from scratch
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A hiker stands on a field of hills laid out as a grid; each square has a height. She wants the longest walk that goes **strictly uphill** at every step, moving north, south, east or west.

The naive plan: from every square, try every uphill walk, and remember the longest. It works, but think about a popular square halfway up a big hill. Walks starting from dozens of squares below all pass through it, and every single time, the hiker re-explores every possible walk above it, as if for the first time.

The clever plan: the first time she fully explores the walks from a square, she writes the answer on a signpost there: "the longest uphill walk starting here is 5 squares". Next time any walk arrives at that square, she reads the sign and adds it, instead of climbing again.

That signpost is **memoisation**, and on this problem it turns an exponential search into one visit per square. Example 2 below measures it: on a 10 x 10 grid the naive plan makes 705 310 recursive calls, and the signposts make 280.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or is "greater or equal" allowed? | With equal steps allowed, two equal neighbours form a cycle; the graph is no longer a DAG and memoisation by cell breaks. |
| Four directions only, or diagonals too? | Changes the neighbour list from 4 to 8 offsets; the algorithm is the same. |
| Can the matrix be empty, or have one row or column? | Return 0 for empty; a single row is a common deep-recursion trap. |
| How large can m and n be? | Up to a few hundred each, recursive DFS + memo is the expected answer; a long path may still be deep enough to need an iterative version. |
| Do you want the length or the path itself? | The path can be rebuilt from the memo table after the fact (Example 1 does it). |

## 3. The Core Idea: It Is a Longest Path in a DAG

Turn the grid into a graph:

- every cell is a **node**;
- there is an edge from cell A to a neighbouring cell B whenever \`B > A\`.

📌 **Interview term: Implicit graph** — a graph that is never stored as adjacency lists; neighbours are computed on the fly (here, the four adjacent cells with a larger value).

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycles. Because every step goes to a strictly larger value, you can never return to a cell, so this graph is a DAG.

That matters enormously. In a general graph, the longest simple path is an NP-hard problem. In a DAG it is easy: the longest path starting at a node is 1 plus the longest path starting at its best successor, and those successors can be solved first.

<svg class="iq-diagram" width="100%" viewBox="0 0 420 330" role="img" aria-label="Three by three grid 9 9 4, 6 6 8, 2 1 1. The longest increasing path 1 to 2 to 6 to 9 is highlighted along the left side.">
  <defs>
    <marker id="lip1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="170" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="71" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="40" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="170" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="300" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="171" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="40" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="271" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="271" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="271" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 168 265 L 128 265" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 228 L 80 206" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 128 L 80 106" fill="none" marker-end="url(#lip1-arrow)"/>
</svg>

For the matrix \`[[9, 9, 4], [6, 6, 8], [2, 1, 1]]\` the answer is 4, along 1 → 2 → 6 → 9 (the highlighted cells). Note the two 6s side by side: moving between them is not allowed, because the path must be strictly increasing.

## 4. Brute Force, and Exactly Why It Is Slow

The brute force is a DFS from every cell that tries every increasing neighbour and returns \`1 + the best\` of them:

~~~text
dfs(cell) = 1 + max(dfs(n) for each neighbour n with value > value(cell)), or 1 if there is none
answer    = max(dfs(cell) for every cell)
~~~

It is correct. The problem is **how often the same call happens**.

📌 **Interview term: Overlapping subproblems** — the same smaller problem is solved again and again inside a recursion. Here, \`dfs(cell)\` is called once for **every increasing path that reaches that cell**, from every starting cell.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Two different starting cells, A and B, both step into the same cell C. Brute force explores everything above C twice, memoisation explores it once and reuses the stored answer.">
  <defs>
    <marker id="lip2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="61" text-anchor="middle">start A</text>
  <rect class="d-box" x="40" y="170" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="201" text-anchor="middle">start B</text>
  <rect class="d-box-accent" x="250" y="100" width="120" height="50" rx="10"/>
  <text class="d-text" x="310" y="131" text-anchor="middle">cell C</text>
  <rect class="d-box-muted" x="450" y="100" width="130" height="50" rx="10"/>
  <text class="d-text" x="515" y="131" text-anchor="middle">paths above C</text>
  <path class="d-edge" d="M 162 62 L 244 112" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge" d="M 162 188 L 244 140" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge-accent" d="M 372 125 L 444 125" fill="none" marker-end="url(#lip2-arrow)"/>
</svg>

Every arrow into cell C repeats the whole exploration to its right. With many cells feeding many others, the repeats multiply.

How bad is it? Take the grid where each value is \`row + col\`. Every step right or down increases the value, so the number of increasing paths is the number of monotone lattice paths, which grows exponentially with the grid size. Example 2 counts the calls: 226 for 4 x 4, 3 382 for 6 x 6, 48 538 for 8 x 8 and 705 310 for 10 x 10, roughly 14 times more for every 2 added to the side. The answer only grows from 7 to 19.

## 5. The Fix: Memoise on the Cell

📌 **Interview term: Memoisation** — storing the result of a function call keyed by its arguments and returning the stored value when the same arguments come back. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming); the JavaScript section has a page on [memoization as a general technique](/interview-question/what-is-memoization).

📌 **Interview term: State** — the information a subproblem's answer depends on. Here the state is **just the cell**: the longest increasing path starting at a cell does not depend on how you arrived there. That is the whole justification for memoising on \`(r, c)\`, and it is true only because of the DAG property.

Two consequences of the DAG property that interviewers like to hear:

1. **No visited set.** An ordinary grid DFS needs one to avoid walking in circles; here a path cannot revisit a cell because values only go up.
2. **The memo is never stale.** A general DFS with a visited set gives answers that depend on what is already visited, so caching them would be wrong. Here each cell's answer is a fixed fact about the grid.

With the memo, each cell's body runs once, and each increasing edge triggers exactly one call. Example 2 confirms the count exactly: memo calls = cells + increasing edges (100 + 180 = 280 for 10 x 10).

📌 **Interview term: Top-down vs bottom-up DP** — top-down recurses and caches (memoisation); bottom-up computes subproblems in a dependency order without recursion. For this problem the bottom-up order is a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used) of the cells, which is what the Kahn version in section 7 uses.

## 6. DFS + Memo in Python

~~~python
def longest_increasing_path(matrix):
    if not matrix or not matrix[0]:
        return 0, []
    rows, cols = len(matrix), len(matrix[0])
    memo = [[0] * cols for _ in range(rows)]  # 0 = not computed yet; real answers are >= 1

    def dfs(r, c):
        if memo[r][c]:
            return memo[r][c]
        best = 1                              # the path that is just this cell
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[r][c] = best
        return best

    best, start = 0, (0, 0)
    for r in range(rows):
        for c in range(cols):
            length = dfs(r, c)
            if length > best:
                best, start = length, (r, c)
~~~

- \`memo = [[0] * cols for _ in range(rows)]\` builds independent rows. \`[[0] * cols] * rows\` would make every row the same list object, so writing one cell would write a whole column.
- \`0\` means "not computed yet". Real answers are at least 1, so \`if memo[r][c]:\` is a safe check.
- \`0 <= nr < rows\` is Python's chained comparison: one bounds check that reads like maths.
- \`dfs\` is nested, so it sees \`matrix\`, \`rows\`, \`cols\` and \`memo\` without parameters, and it only **mutates** \`memo\`, so no \`nonlocal\` is needed.
- Example 1 continues after this loop: it rebuilds one longest path by repeatedly stepping to a larger neighbour whose memo value is exactly one less.

**The \`lru_cache\` variant.** Decorating the nested function with \`@functools.lru_cache(maxsize=None)\` replaces the manual memo table; define it inside the function so the cache is not shared between different matrices. The manual table is easier to inspect (for path rebuilding) and avoids hashing a tuple per call.

**Recursion depth.** Python's default limit is 1000 frames. In a test run a 1 x 900 increasing row worked and a 1 x 1000 row raised \`RecursionError\`, so for large or adversarial grids use the Kahn version in section 7.

## 7. Without Recursion: Kahn Layering

The memoised DFS recurses as deep as the longest path. On a 1 x 40 000 strictly increasing row that is 40 000 nested calls. The bottom-up alternative peels the DAG layer by layer, exactly like [Kahn's topological sort](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs):

1. For each cell, count how many **smaller** neighbours point into it (its in-degree).
2. The first layer is every cell with in-degree 0 (local minima).
3. Repeatedly: for each cell in the current layer, decrement the in-degree of each larger neighbour; a neighbour whose in-degree reaches 0 joins the next layer.
4. The number of layers is the length of the longest increasing path.

📌 **Interview term: Kahn's algorithm** — topological sorting by repeatedly removing nodes with in-degree 0. Counting the rounds (layers) gives the longest path in a DAG measured in nodes.

Why the layer count equals the answer: a cell joins layer k exactly when its longest increasing path **ending** there has k cells, because it waits for all its smaller neighbours. So the last layer holds the ends of the longest paths. Example 3 checks it against DFS + memo on 200 random grids and runs it on a 1 x 40 000 row and a 200 x 200 snake with no recursion at all.

### The Kahn version in Python

~~~python
def lip_kahn(matrix):
    if not matrix or not matrix[0]:
        return 0
    rows, cols = len(matrix), len(matrix[0])
    indeg = [[0] * cols for _ in range(rows)]  # how many smaller neighbours point into this cell
    for r in range(rows):
        for c in range(cols):
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] < matrix[r][c]:
                    indeg[r][c] += 1
    layer = [(r, c) for r in range(rows) for c in range(cols) if indeg[r][c] == 0]  # local minima
    layers = 0
    while layer:
        layers += 1
        nxt = []
        for r, c in layer:
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    indeg[nr][nc] -= 1
                    if indeg[nr][nc] == 0:
                        nxt.append((nr, nc))
        layer = nxt
    return layers
~~~

Each layer is a plain list of \`(r, c)\` tuples; building \`nxt\` and then replacing \`layer\` processes one layer per round, which is what makes the round count meaningful.

## 8. Verified: Running the Code

Each example on this page was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — DFS + memo, with one longest path rebuilt** prints:

~~~text
example 1: length 4, path [1, 2, 6, 9]
example 2: length 4, path [3, 4, 5, 6]
single cell: length 1, path [1]
all equal: length 1, path [7]
one row: length 3, path [1, 2, 3]
spiral: length 9, path [1, 2, 3, 4, 5, 6, 7, 8, 9]
empty: length 0, path []
~~~

Reading it: both classic examples give 4. "all equal" gives 1 because equal neighbours are not connected; "one row" stops at 3 because 0 breaks the run; the spiral visits all 9 cells in order.

**Example 2 — brute force vs memo, counting calls** prints:

~~~text
grid where value = row + col (very many increasing paths):
  2x2: answer 3 (brute force agrees: true), brute-force calls 10, memo calls 8 = 4 cells + 4 edges
  4x4: answer 7 (brute force agrees: true), brute-force calls 226, memo calls 40 = 16 cells + 24 edges
  6x6: answer 11 (brute force agrees: true), brute-force calls 3382, memo calls 96 = 36 cells + 60 edges
  8x8: answer 15 (brute force agrees: true), brute-force calls 48538, memo calls 176 = 64 cells + 112 edges
  10x10: answer 19 (brute force agrees: true), brute-force calls 705310, memo calls 280 = 100 cells + 180 edges
~~~

Reading it: both versions always agree on the answer, but brute force grows about 14 times for every 2 added to the side, while the memo count is exactly cells + increasing edges, which grows with the area.

**Example 3 — Kahn layering** prints:

~~~text
4
4
1
0
Kahn and DFS + memo agree on 200 of 200 random grids
200x200 snake grid: longest path 40000
1x40000 increasing row: longest path 40000, no recursion needed
~~~

Reading it: the layer count matches the memo answer on the samples and on 200 random grids, and it handles a path 40 000 cells long with no recursion at all.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS from every cell | exponential in the worst case | O(m·n) stack | one call per increasing path; 705 310 calls on a 10 x 10 grid |
| DFS + memo | O(m·n) | O(m·n) memo + O(m·n) stack worst case | each cell is solved once, each of at most 4·m·n edges followed once |
| Kahn layering | O(m·n) | O(m·n) in-degrees and layers | each cell enters a layer once; no recursion |

Here m·n is the number of cells. The memo version's stack is as deep as the longest path, which is m·n for a snake-shaped grid. See [Big-O notation](/interview-question/what-is-big-o-notation) and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 10. Edge Cases

- **Empty matrix (or empty rows):** return 0 (the examples handle \`[]\`).
- **Single cell:** 1.
- **All values equal:** no edges at all; every cell is a path of 1.
- **A single row or column:** a 1-D problem, but a long increasing run means deep recursion.
- **Plateaus and duplicates:** equal neighbours are not connected; using \`>=\` by mistake creates cycles and infinite recursion.
- **Negative numbers and \`0\`:** fine for comparisons, but do not use the cell value as a "not computed" marker; the memo stores lengths, which are always at least 1, so 0 is a safe sentinel.

## Common Pitfalls

- **Adding a visited set "to be safe".** It is unnecessary here, and if you then memoise results computed under a visited set, the cache can be wrong in variants where it matters.
- **Using \`>=\` instead of \`>\`.** Equal neighbours then point at each other and the recursion never ends (it ends in \`RecursionError\`).
- **\`[[0] * cols] * rows\`** for the memo: every row is the same list.
- **A module-level \`@lru_cache\` function** keyed only by \`(r, c)\`: the cache survives into the next test with a different matrix and returns stale answers. Define it inside, or call \`cache_clear()\`.
- **Deep recursion.** A 1 x 1000 increasing row raised \`RecursionError\`; use Kahn layering for big inputs.
- **Forgetting the empty matrix.** \`len(matrix[0])\` raises \`IndexError\` on \`[]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cells are nodes, with an edge to each strictly larger neighbour. Strictly increasing means no cycles: a DAG.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force:</strong> <span style="color:#f0e2c8;">DFS from every cell over every increasing path; exponential, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(cell)</code> repeats once per path that reaches it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Memo:</strong> <span style="color:#f0e2c8;">The longest path from a cell does not depend on how I got there, so I cache it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo[r][c]</code>; 0 means not computed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Each cell solved once, each edge followed once: O(m·n) time and space. No visited set needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">The recursion limit is 1000, so for big grids I switch to Kahn layering: peel local minima layer by layer; the layer count is the answer.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is memoisation valid here and not in a general grid DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the answer from a cell depends only on the cell; in a general DFS it depends on what is already visited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal values were allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then equal neighbours form cycles, it is no longer a DAG, and the problem becomes much harder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you return the path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: start at the cell with the biggest memo and repeatedly step to a larger neighbour whose memo is one less.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache</code> work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@lru_cache(maxsize=None)</code> on a nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(r, c)</code>; define it inside so the cache does not leak between matrices.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Bottom-up alternative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort cells by value descending and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[cell] = 1 + max(dp[larger neighbour])</code>, or use Kahn layering. Both avoid recursion.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | a graph whose edges are computed on the fly instead of stored |
| **DAG** | a directed graph with no cycles |
| **Overlapping subproblems** | the same sub-call is solved many times inside a recursion |
| **Memoisation** | caching a function's result by its arguments |
| **State** | what a subproblem's answer depends on; here only the cell |
| **Top-down vs bottom-up DP** | recursion plus cache, versus solving in dependency order |
| **Kahn's algorithm** | topological sort by removing in-degree-0 nodes, layer by layer |
| **\`functools.lru_cache\`** | a decorator that memoises a function by its arguments |

---
**Conclusion:** The longest increasing path is a longest path in a DAG in disguise: cells are nodes, edges go to strictly larger neighbours, and strictness rules out cycles. Brute-force DFS is correct but re-explores the same cells once per path reaching them, which is exponential (705 310 calls on a 10 x 10 grid). Because a cell's answer depends only on the cell, memoising it makes every cell and every edge cost one call, O(m·n) in total (280 calls on the same grid), and Kahn layering gives the same answer bottom-up without recursion. In Python, the memo is a list of lists (never \`[[0] * cols] * rows\`), and the 1000-frame recursion limit is the reason to know the Kahn version.
`,
        examples: [
          { label: `DFS + memo on sample matrices, with one longest path rebuilt`, code: `# Longest increasing path in a matrix: DFS from every cell, memoising the answer per cell.
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]   # up, down, left, right


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def longest_increasing_path(matrix):
    if not matrix or not matrix[0]:
        return 0, []
    rows, cols = len(matrix), len(matrix[0])
    memo = [[0] * cols for _ in range(rows)]  # 0 = not computed yet; real answers are >= 1

    def dfs(r, c):
        if memo[r][c]:
            return memo[r][c]
        best = 1                              # the path that is just this cell
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[r][c] = best
        return best

    best, start = 0, (0, 0)
    for r in range(rows):
        for c in range(cols):
            length = dfs(r, c)
            if length > best:
                best, start = length, (r, c)

    # rebuild one longest path by always stepping to a neighbour whose memo is one less
    path, (r, c) = [matrix[start[0]][start[1]]], start
    while memo[r][c] > 1:
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c] and memo[nr][nc] == memo[r][c] - 1:
                r, c = nr, nc
                break
        path.append(matrix[r][c])
    return best, path


tests = [
    ("example 1", [[9, 9, 4], [6, 6, 8], [2, 1, 1]]),
    ("example 2", [[3, 4, 5], [3, 2, 6], [2, 2, 1]]),
    ("single cell", [[1]]),
    ("all equal", [[7, 7], [7, 7]]),
    ("one row", [[1, 2, 3, 0, 5]]),
    ("spiral", [[1, 2, 3], [8, 9, 4], [7, 6, 5]]),
    ("empty", []),
]
for name, m in tests:
    length, path = longest_increasing_path(m)
    print(name + ": length " + str(length) + ", path " + fmt(path))
` },
          { label: `Brute-force DFS vs DFS + memo: counting calls`, code: `# Same answer, very different work: plain DFS from every cell versus DFS + memo.
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def solve(matrix, use_memo):
    rows, cols = len(matrix), len(matrix[0])
    memo = [[0] * cols for _ in range(rows)]
    calls = 0

    def dfs(r, c):
        nonlocal calls
        calls += 1
        if use_memo and memo[r][c]:
            return memo[r][c]
        best = 1
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[r][c] = best
        return best

    best = max(dfs(r, c) for r in range(rows) for c in range(cols))
    return best, calls


def increasing_edges(matrix):       # ordered pairs of neighbours (a, b) with b > a
    rows, cols = len(matrix), len(matrix[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    count += 1
    return count


def diagonal(n):                    # value = row + col: every right or down step increases
    return [[r + c for c in range(n)] for r in range(n)]


print("grid where value = row + col (very many increasing paths):")
for n in [2, 4, 6, 8, 10]:
    m = diagonal(n)
    brute, brute_calls = solve(m, False)
    memo, memo_calls = solve(m, True)
    print("  " + str(n) + "x" + str(n) + ": answer " + str(memo) + " (brute force agrees: " + str(brute == memo).lower() +
          "), brute-force calls " + str(brute_calls) + ", memo calls " + str(memo_calls) +
          " = " + str(n * n) + " cells + " + str(increasing_edges(m)) + " edges")
` },
          { label: `Kahn layering (no recursion), checked against DFS + memo`, code: `# No recursion: peel the grid layer by layer (Kahn topological sort). Layers = longest path.
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def lip_kahn(matrix):
    if not matrix or not matrix[0]:
        return 0
    rows, cols = len(matrix), len(matrix[0])
    indeg = [[0] * cols for _ in range(rows)]  # how many smaller neighbours point into this cell
    for r in range(rows):
        for c in range(cols):
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] < matrix[r][c]:
                    indeg[r][c] += 1
    layer = [(r, c) for r in range(rows) for c in range(cols) if indeg[r][c] == 0]  # local minima
    layers = 0
    while layer:
        layers += 1
        nxt = []
        for r, c in layer:
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    indeg[nr][nc] -= 1
                    if indeg[nr][nc] == 0:
                        nxt.append((nr, nc))
        layer = nxt
    return layers


def lip_memo(matrix):
    rows, cols = len(matrix), len(matrix[0])
    memo = [[0] * cols for _ in range(rows)]

    def dfs(r, c):
        if memo[r][c]:
            return memo[r][c]
        best = 1
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[r][c] = best
        return best

    return max(dfs(r, c) for r in range(rows) for c in range(cols))


print(lip_kahn([[9, 9, 4], [6, 6, 8], [2, 1, 1]]))  # 4
print(lip_kahn([[3, 4, 5], [3, 2, 6], [2, 2, 1]]))  # 4
print(lip_kahn([[1]]))  # 1
print(lip_kahn([]))  # 0

seed = 7


def rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed


agree = 0
for trial in range(200):
    rows, cols = rand() % 8 + 1, rand() % 8 + 1
    m = [[rand() % 10 for _ in range(cols)] for _ in range(rows)]
    if lip_kahn(m) == lip_memo(m):
        agree += 1
print("Kahn and DFS + memo agree on " + str(agree) + " of 200 random grids")

n = 200                                        # snake: one increasing path through every cell
snake = [[r * n + (c if r % 2 == 0 else n - 1 - c) for c in range(n)] for r in range(n)]
print("200x200 snake grid: longest path " + str(lip_kahn(snake)))
row = [list(range(40000))]                    # 1 x 40000, strictly increasing
print("1x40000 increasing row: longest path " + str(lip_kahn(row)) + ", no recursion needed")
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an m by n matrix of integers, return the length of the longest strictly increasing path, moving only up, down, left or right. Start with the brute force, explain why it is slow, then make it fast. Please write it in JavaScript."

**What a strong answer should cover:**
- The model: every cell is a node with an edge to each strictly larger neighbour; strictly increasing means no cycles, so it is a DAG, and the answer is its longest path.
- Brute force: DFS from every cell exploring every increasing path is exponential, because the same cells are re-explored from many starts.
- DFS + memo: the longest path starting at a cell does not depend on how you reached it, so cache it; each cell is solved once and each edge is followed once: O(m·n) time and space.
- No visited set is needed (values strictly increase, so a path cannot revisit a cell), and the alternative is Kahn topological layering, which avoids recursion.
- JavaScript specifics: a closure over \`memo\` built with \`Array.from\` (not \`fill([])\`), and the call stack: a 1 x 10 000 increasing row threw \`RangeError\` in Node 22, so large inputs need the iterative topological version.

**Clarifying questions expected:**
- "Strictly increasing, or is equal allowed?" (equal values would create cycles and break memoisation)
- "Only four directions, no diagonals? Can the matrix be empty?"

**Code / implementation expected:** Yes — \`longestIncreasingPath(matrix)\` in JavaScript with DFS + memo; the Kahn layering version is a bonus.`,
        answer: `**Target Audience:** Interview candidates who know recursion and grid DFS; memoisation and the DAG view are explained from scratch
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A hiker stands on a field of hills laid out as a grid; each square has a height. She wants the longest walk that goes **strictly uphill** at every step, moving north, south, east or west.

The naive plan: from every square, try every uphill walk, and remember the longest. It works, but think about a popular square halfway up a big hill. Walks starting from dozens of squares below all pass through it, and every single time, the hiker re-explores every possible walk above it, as if for the first time.

The clever plan: the first time she fully explores the walks from a square, she writes the answer on a signpost there: "the longest uphill walk starting here is 5 squares". Next time any walk arrives at that square, she reads the sign and adds it, instead of climbing again.

That signpost is **memoisation**, and on this problem it turns an exponential search into one visit per square. Example 2 below measures it: on a 10 x 10 grid the naive plan makes 705 310 recursive calls, and the signposts make 280.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or is "greater or equal" allowed? | With equal steps allowed, two equal neighbours form a cycle; the graph is no longer a DAG and memoisation by cell breaks. |
| Four directions only, or diagonals too? | Changes the neighbour list from 4 to 8 offsets; the algorithm is the same. |
| Can the matrix be empty, or have one row or column? | Return 0 for empty; a single row is a common deep-recursion trap. |
| How large can m and n be? | Up to a few hundred each, recursive DFS + memo is the expected answer; a long path may still be deep enough to need an iterative version. |
| Do you want the length or the path itself? | The path can be rebuilt from the memo table after the fact (Example 1 does it). |

## 3. The Core Idea: It Is a Longest Path in a DAG

Turn the grid into a graph:

- every cell is a **node**;
- there is an edge from cell A to a neighbouring cell B whenever \`B > A\`.

📌 **Interview term: Implicit graph** — a graph that is never stored as adjacency lists; neighbours are computed on the fly (here, the four adjacent cells with a larger value).

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycles. Because every step goes to a strictly larger value, you can never return to a cell, so this graph is a DAG.

That matters enormously. In a general graph, the longest simple path is an NP-hard problem. In a DAG it is easy: the longest path starting at a node is 1 plus the longest path starting at its best successor, and those successors can be solved first.

<svg class="iq-diagram" width="100%" viewBox="0 0 420 330" role="img" aria-label="Three by three grid 9 9 4, 6 6 8, 2 1 1. The longest increasing path 1 to 2 to 6 to 9 is highlighted along the left side.">
  <defs>
    <marker id="lip1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="170" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="71" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="40" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="170" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="300" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="171" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="40" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="271" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="271" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="271" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 168 265 L 128 265" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 228 L 80 206" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 128 L 80 106" fill="none" marker-end="url(#lip1-arrow)"/>
</svg>

For the matrix \`[[9, 9, 4], [6, 6, 8], [2, 1, 1]]\` the answer is 4, along 1 → 2 → 6 → 9 (the highlighted cells). Note the two 6s side by side: moving between them is not allowed, because the path must be strictly increasing.

## 4. Brute Force, and Exactly Why It Is Slow

The brute force is a DFS from every cell that tries every increasing neighbour and returns \`1 + the best\` of them:

~~~text
dfs(cell) = 1 + max(dfs(n) for each neighbour n with value > value(cell)), or 1 if there is none
answer    = max(dfs(cell) for every cell)
~~~

It is correct. The problem is **how often the same call happens**.

📌 **Interview term: Overlapping subproblems** — the same smaller problem is solved again and again inside a recursion. Here, \`dfs(cell)\` is called once for **every increasing path that reaches that cell**, from every starting cell.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Two different starting cells, A and B, both step into the same cell C. Brute force explores everything above C twice, memoisation explores it once and reuses the stored answer.">
  <defs>
    <marker id="lip2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="61" text-anchor="middle">start A</text>
  <rect class="d-box" x="40" y="170" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="201" text-anchor="middle">start B</text>
  <rect class="d-box-accent" x="250" y="100" width="120" height="50" rx="10"/>
  <text class="d-text" x="310" y="131" text-anchor="middle">cell C</text>
  <rect class="d-box-muted" x="450" y="100" width="130" height="50" rx="10"/>
  <text class="d-text" x="515" y="131" text-anchor="middle">paths above C</text>
  <path class="d-edge" d="M 162 62 L 244 112" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge" d="M 162 188 L 244 140" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge-accent" d="M 372 125 L 444 125" fill="none" marker-end="url(#lip2-arrow)"/>
</svg>

Every arrow into cell C repeats the whole exploration to its right. With many cells feeding many others, the repeats multiply.

How bad is it? Take the grid where each value is \`row + col\`. Every step right or down increases the value, so the number of increasing paths is the number of monotone lattice paths, which grows exponentially with the grid size. Example 2 counts the calls: 226 for 4 x 4, 3 382 for 6 x 6, 48 538 for 8 x 8 and 705 310 for 10 x 10, roughly 14 times more for every 2 added to the side. The answer only grows from 7 to 19.

## 5. The Fix: Memoise on the Cell

📌 **Interview term: Memoisation** — storing the result of a function call keyed by its arguments and returning the stored value when the same arguments come back. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming); the JavaScript section has a page on [memoization as a general technique](/interview-question/what-is-memoization).

📌 **Interview term: State** — the information a subproblem's answer depends on. Here the state is **just the cell**: the longest increasing path starting at a cell does not depend on how you arrived there. That is the whole justification for memoising on \`(r, c)\`, and it is true only because of the DAG property.

Two consequences of the DAG property that interviewers like to hear:

1. **No visited set.** An ordinary grid DFS needs one to avoid walking in circles; here a path cannot revisit a cell because values only go up.
2. **The memo is never stale.** A general DFS with a visited set gives answers that depend on what is already visited, so caching them would be wrong. Here each cell's answer is a fixed fact about the grid.

With the memo, each cell's body runs once, and each increasing edge triggers exactly one call. Example 2 confirms the count exactly: memo calls = cells + increasing edges (100 + 180 = 280 for 10 x 10).

📌 **Interview term: Top-down vs bottom-up DP** — top-down recurses and caches (memoisation); bottom-up computes subproblems in a dependency order without recursion. For this problem the bottom-up order is a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used) of the cells, which is what the Kahn version in section 7 uses.

## 6. DFS + Memo in JavaScript

~~~javascript
function longestIncreasingPath(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [0, []];
  const rows = matrix.length, cols = matrix[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0)); // 0 = not computed yet

  function dfs(r, c) {
    if (memo[r][c] !== 0) return memo[r][c];
    let best = 1;                                  // the path that is just this cell
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c]) {
        best = Math.max(best, 1 + dfs(nr, nc));
      }
    }
    memo[r][c] = best;
    return best;
  }

  let best = 0, start = [0, 0];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const length = dfs(r, c);
      if (length > best) { best = length; start = [r, c]; }
    }
  }
~~~

- \`Array.from({ length: rows }, () => new Array(cols).fill(0))\` builds independent rows. \`new Array(rows).fill(new Array(cols).fill(0))\` would put one shared row in every slot.
- \`0\` means "not computed yet"; real answers are at least 1.
- \`for (const [dr, dc] of DIRS)\` destructures each direction pair. In very hot loops, indexing \`DIRS[k][0]\` avoids the iterator overhead, but clarity wins in an interview.
- \`dfs\` is a nested function declaration, so it closes over \`matrix\`, \`rows\`, \`cols\` and \`memo\`.
- Example 1 continues after this loop: it rebuilds one longest path by repeatedly stepping to a larger neighbour whose memo value is exactly one less.

**Recursion depth.** The call stack is limited by the engine. In Node 22, a 1 x 1000 increasing row worked and a 1 x 10 000 row threw \`RangeError: Maximum call stack size exceeded\`. For large or adversarial grids use the Kahn version in section 7; browsers have their own, different limits, so do not rely on a specific depth.

## 7. Without Recursion: Kahn Layering

The memoised DFS recurses as deep as the longest path. On a 1 x 40 000 strictly increasing row that is 40 000 nested calls. The bottom-up alternative peels the DAG layer by layer, exactly like [Kahn's topological sort](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs):

1. For each cell, count how many **smaller** neighbours point into it (its in-degree).
2. The first layer is every cell with in-degree 0 (local minima).
3. Repeatedly: for each cell in the current layer, decrement the in-degree of each larger neighbour; a neighbour whose in-degree reaches 0 joins the next layer.
4. The number of layers is the length of the longest increasing path.

📌 **Interview term: Kahn's algorithm** — topological sorting by repeatedly removing nodes with in-degree 0. Counting the rounds (layers) gives the longest path in a DAG measured in nodes.

Why the layer count equals the answer: a cell joins layer k exactly when its longest increasing path **ending** there has k cells, because it waits for all its smaller neighbours. So the last layer holds the ends of the longest paths. Example 3 checks it against DFS + memo on 200 random grids and runs it on a 1 x 40 000 row and a 200 x 200 snake with no recursion at all.

### The Kahn version in JavaScript

~~~javascript
function lipKahn(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return 0;
  const rows = matrix.length, cols = matrix[0].length;
  const inside = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const indeg = Array.from({ length: rows }, () => new Array(cols).fill(0)); // smaller neighbours pointing in
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (const [dr, dc] of DIRS)
        if (inside(r + dr, c + dc) && matrix[r + dr][c + dc] < matrix[r][c]) indeg[r][c]++;
  let layer = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (indeg[r][c] === 0) layer.push([r, c]); // local minima
  let layers = 0;
  while (layer.length > 0) {
    layers++;
    const next = [];
    for (const [r, c] of layer) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inside(nr, nc) && matrix[nr][nc] > matrix[r][c] && --indeg[nr][nc] === 0) next.push([nr, nc]);
      }
    }
    layer = next;
  }
  return layers;
}
~~~

\`--indeg[nr][nc] === 0\` decrements and tests in one expression. Each layer is a fresh array, so the number of rounds is the number of layers.

## 8. Verified: Running the Code

Each example on this page was saved as \`main.js\` and run with \`node main.js\` (the same code runs unchanged in the page, it only uses \`console.log\`). The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — DFS + memo, with one longest path rebuilt** prints:

~~~text
example 1: length 4, path [1, 2, 6, 9]
example 2: length 4, path [3, 4, 5, 6]
single cell: length 1, path [1]
all equal: length 1, path [7]
one row: length 3, path [1, 2, 3]
spiral: length 9, path [1, 2, 3, 4, 5, 6, 7, 8, 9]
empty: length 0, path []
~~~

Reading it: both classic examples give 4. "all equal" gives 1 because equal neighbours are not connected; "one row" stops at 3 because 0 breaks the run; the spiral visits all 9 cells in order.

**Example 2 — brute force vs memo, counting calls** prints:

~~~text
grid where value = row + col (very many increasing paths):
  2x2: answer 3 (brute force agrees: true), brute-force calls 10, memo calls 8 = 4 cells + 4 edges
  4x4: answer 7 (brute force agrees: true), brute-force calls 226, memo calls 40 = 16 cells + 24 edges
  6x6: answer 11 (brute force agrees: true), brute-force calls 3382, memo calls 96 = 36 cells + 60 edges
  8x8: answer 15 (brute force agrees: true), brute-force calls 48538, memo calls 176 = 64 cells + 112 edges
  10x10: answer 19 (brute force agrees: true), brute-force calls 705310, memo calls 280 = 100 cells + 180 edges
~~~

Reading it: both versions always agree on the answer, but brute force grows about 14 times for every 2 added to the side, while the memo count is exactly cells + increasing edges, which grows with the area.

**Example 3 — Kahn layering** prints:

~~~text
4
4
1
0
Kahn and DFS + memo agree on 200 of 200 random grids
200x200 snake grid: longest path 40000
1x40000 increasing row: longest path 40000, no recursion needed
~~~

Reading it: the layer count matches the memo answer on the samples and on 200 random grids, and it handles a path 40 000 cells long with no recursion at all.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS from every cell | exponential in the worst case | O(m·n) stack | one call per increasing path; 705 310 calls on a 10 x 10 grid |
| DFS + memo | O(m·n) | O(m·n) memo + O(m·n) stack worst case | each cell is solved once, each of at most 4·m·n edges followed once |
| Kahn layering | O(m·n) | O(m·n) in-degrees and layers | each cell enters a layer once; no recursion |

Here m·n is the number of cells. The memo version's stack is as deep as the longest path, which is m·n for a snake-shaped grid. See [Big-O notation](/interview-question/what-is-big-o-notation) and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 10. Edge Cases

- **Empty matrix (or empty rows):** return 0 (the examples handle \`[]\`).
- **Single cell:** 1.
- **All values equal:** no edges at all; every cell is a path of 1.
- **A single row or column:** a 1-D problem, but a long increasing run means deep recursion.
- **Plateaus and duplicates:** equal neighbours are not connected; using \`>=\` by mistake creates cycles and infinite recursion.
- **Negative numbers and \`0\`:** fine for comparisons, but do not use the cell value as a "not computed" marker; the memo stores lengths, which are always at least 1, so 0 is a safe sentinel.

## Common Pitfalls

- **Adding a visited set "to be safe".** It is unnecessary here, and memoising results computed under a visited set can be wrong in variants where it matters.
- **Using \`>=\` instead of \`>\`.** Equal neighbours then point at each other and the recursion never ends (it ends in \`RangeError\`).
- **\`new Array(rows).fill(new Array(cols).fill(0))\`** for the memo: every row is the same array.
- **Memoising with string keys** such as \`memo[r + ',' + c]\` in an object: correct but far slower than a 2-D array, and the string building allocates on every call.
- **Deep recursion.** A 1 x 10 000 increasing row threw \`RangeError\` in Node 22; use Kahn layering for big inputs.
- **Forgetting the empty matrix.** \`matrix[0].length\` throws \`TypeError\` on \`[]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cells are nodes, with an edge to each strictly larger neighbour. Strictly increasing means no cycles: a DAG.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force:</strong> <span style="color:#f0e2c8;">DFS from every cell over every increasing path; exponential, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(cell)</code> repeats once per path that reaches it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Memo:</strong> <span style="color:#f0e2c8;">The longest path from a cell does not depend on how I got there, so I cache it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo[r][c]</code>; 0 means not computed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Each cell solved once, each edge followed once: O(m·n) time and space. No visited set needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS detail:</strong> <span style="color:#f0e2c8;">Deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>, so for big grids I switch to Kahn layering; and I build the memo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, not a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is memoisation valid here and not in a general grid DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the answer from a cell depends only on the cell; in a general DFS it depends on what is already visited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal values were allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then equal neighbours form cycles, it is no longer a DAG, and the problem becomes much harder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you return the path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: start at the cell with the biggest memo and repeatedly step to a larger neighbour whose memo is one less.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> memo work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, keyed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code>, but a 2-D array (or one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code> of size rows · cols) is faster and simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Bottom-up alternative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort cells by value descending and fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, or use Kahn layering. Both avoid recursion.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | a graph whose edges are computed on the fly instead of stored |
| **DAG** | a directed graph with no cycles |
| **Overlapping subproblems** | the same sub-call is solved many times inside a recursion |
| **Memoisation** | caching a function's result by its arguments |
| **State** | what a subproblem's answer depends on; here only the cell |
| **Top-down vs bottom-up DP** | recursion plus cache, versus solving in dependency order |
| **Kahn's algorithm** | topological sort by removing in-degree-0 nodes, layer by layer |
| **\`RangeError\`** | what V8 throws when deep recursion exhausts the call stack |

---
**Conclusion:** The longest increasing path is a longest path in a DAG in disguise: cells are nodes, edges go to strictly larger neighbours, and strictness rules out cycles. Brute-force DFS is correct but re-explores the same cells once per path reaching them, which is exponential (705 310 calls on a 10 x 10 grid). Because a cell's answer depends only on the cell, memoising it makes every cell and every edge cost one call, O(m·n) in total (280 calls on the same grid), and Kahn layering gives the same answer bottom-up without recursion. In JavaScript, build the memo with \`Array.from\`, and remember that a long increasing run throws \`RangeError\`, which the Kahn version avoids.
`,
        examples: [
          { label: `DFS + memo on sample matrices, with one longest path rebuilt`, code: `// Longest increasing path in a matrix: DFS from every cell, memoising the answer per cell.
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function longestIncreasingPath(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [0, []];
  const rows = matrix.length, cols = matrix[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0)); // 0 = not computed yet

  function dfs(r, c) {
    if (memo[r][c] !== 0) return memo[r][c];
    let best = 1;                                  // the path that is just this cell
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c]) {
        best = Math.max(best, 1 + dfs(nr, nc));
      }
    }
    memo[r][c] = best;
    return best;
  }

  let best = 0, start = [0, 0];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const length = dfs(r, c);
      if (length > best) { best = length; start = [r, c]; }
    }
  }

  // rebuild one longest path by always stepping to a neighbour whose memo is one less
  let [r, c] = start;
  const path = [matrix[r][c]];
  while (memo[r][c] > 1) {
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c] && memo[nr][nc] === memo[r][c] - 1) {
        r = nr;
        c = nc;
        break;
      }
    }
    path.push(matrix[r][c]);
  }
  return [best, path];
}

const tests = [
  ['example 1', [[9, 9, 4], [6, 6, 8], [2, 1, 1]]],
  ['example 2', [[3, 4, 5], [3, 2, 6], [2, 2, 1]]],
  ['single cell', [[1]]],
  ['all equal', [[7, 7], [7, 7]]],
  ['one row', [[1, 2, 3, 0, 5]]],
  ['spiral', [[1, 2, 3], [8, 9, 4], [7, 6, 5]]],
  ['empty', []],
];
for (const [name, m] of tests) {
  const [length, path] = longestIncreasingPath(m);
  console.log(name + ': length ' + length + ', path ' + fmt(path));
}
` },
          { label: `Brute-force DFS vs DFS + memo: counting calls`, code: `// Same answer, very different work: plain DFS from every cell versus DFS + memo.
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function solve(matrix, useMemo) {
  const rows = matrix.length, cols = matrix[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let calls = 0;
  function dfs(r, c) {
    calls++;
    if (useMemo && memo[r][c] !== 0) return memo[r][c];
    let best = 1;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c]) {
        best = Math.max(best, 1 + dfs(nr, nc));
      }
    }
    memo[r][c] = best;
    return best;
  }
  let best = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) best = Math.max(best, dfs(r, c));
  return [best, calls];
}

function increasingEdges(matrix) { // ordered pairs of neighbours (a, b) with b > a
  const rows = matrix.length, cols = matrix[0].length;
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c]) count++;
      }
    }
  }
  return count;
}

function diagonal(n) { // value = row + col: every right or down step increases
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r + c));
}

console.log('grid where value = row + col (very many increasing paths):');
for (const n of [2, 4, 6, 8, 10]) {
  const m = diagonal(n);
  const [brute, bruteCalls] = solve(m, false);
  const [memo, memoCalls] = solve(m, true);
  console.log('  ' + n + 'x' + n + ': answer ' + memo + ' (brute force agrees: ' + (brute === memo) +
    '), brute-force calls ' + bruteCalls + ', memo calls ' + memoCalls +
    ' = ' + (n * n) + ' cells + ' + increasingEdges(m) + ' edges');
}
` },
          { label: `Kahn layering (no recursion), checked against DFS + memo`, code: `// No recursion: peel the grid layer by layer (Kahn topological sort). Layers = longest path.
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function lipKahn(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return 0;
  const rows = matrix.length, cols = matrix[0].length;
  const inside = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const indeg = Array.from({ length: rows }, () => new Array(cols).fill(0)); // smaller neighbours pointing in
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (const [dr, dc] of DIRS)
        if (inside(r + dr, c + dc) && matrix[r + dr][c + dc] < matrix[r][c]) indeg[r][c]++;
  let layer = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (indeg[r][c] === 0) layer.push([r, c]); // local minima
  let layers = 0;
  while (layer.length > 0) {
    layers++;
    const next = [];
    for (const [r, c] of layer) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inside(nr, nc) && matrix[nr][nc] > matrix[r][c] && --indeg[nr][nc] === 0) next.push([nr, nc]);
      }
    }
    layer = next;
  }
  return layers;
}

function lipMemo(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0));
  function dfs(r, c) {
    if (memo[r][c] !== 0) return memo[r][c];
    let best = 1;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c]) best = Math.max(best, 1 + dfs(nr, nc));
    }
    memo[r][c] = best;
    return best;
  }
  let best = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) best = Math.max(best, dfs(r, c));
  return best;
}

console.log(lipKahn([[9, 9, 4], [6, 6, 8], [2, 1, 1]])); // 4
console.log(lipKahn([[3, 4, 5], [3, 2, 6], [2, 2, 1]])); // 4
console.log(lipKahn([[1]])); // 1
console.log(lipKahn([])); // 0

let seed = 7;
function rand() {
  seed = (seed * 48271) % 2147483647;
  return seed;
}

let agree = 0;
for (let trial = 0; trial < 200; trial++) {
  const rows = (rand() % 8) + 1, cols = (rand() % 8) + 1;
  const m = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(rand() % 10);
    m.push(row);
  }
  if (lipKahn(m) === lipMemo(m)) agree++;
}
console.log('Kahn and DFS + memo agree on ' + agree + ' of 200 random grids');

const n = 200; // snake: one increasing path through every cell
const snake = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + (r % 2 === 0 ? c : n - 1 - c)));
console.log('200x200 snake grid: longest path ' + lipKahn(snake));
const row = [Array.from({ length: 40000 }, (_, i) => i)]; // 1 x 40000, strictly increasing
console.log('1x40000 increasing row: longest path ' + lipKahn(row) + ', no recursion needed');
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an m by n matrix of integers, return the length of the longest strictly increasing path, moving only up, down, left or right. Start with the brute force, explain why it is slow, then make it fast. Please write it in Java."

**What a strong answer should cover:**
- The model: every cell is a node with an edge to each strictly larger neighbour; strictly increasing means no cycles, so it is a DAG, and the answer is its longest path.
- Brute force: DFS from every cell exploring every increasing path is exponential, because the same cells are re-explored from many starts.
- DFS + memo: the longest path starting at a cell does not depend on how you reached it, so cache it; each cell is solved once and each edge is followed once: O(m·n) time and space.
- No visited set is needed (values strictly increase, so a path cannot revisit a cell), and the alternative is Kahn topological layering, which avoids recursion.
- Java specifics: \`int[][] memo\` is zero-filled by \`new\`, so 0 can mean "not computed"; recursion depth: a 1 x 40 000 increasing row threw \`StackOverflowError\` with the default stack, so large inputs need the iterative topological version.

**Clarifying questions expected:**
- "Strictly increasing, or is equal allowed?" (equal values would create cycles and break memoisation)
- "Only four directions, no diagonals? Can the matrix be empty?"

**Code / implementation expected:** Yes — \`int longestIncreasingPath(int[][] matrix)\` in Java with DFS + memo; the Kahn layering version is a bonus.`,
        answer: `**Target Audience:** Interview candidates who know recursion and grid DFS; memoisation and the DAG view are explained from scratch
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A hiker stands on a field of hills laid out as a grid; each square has a height. She wants the longest walk that goes **strictly uphill** at every step, moving north, south, east or west.

The naive plan: from every square, try every uphill walk, and remember the longest. It works, but think about a popular square halfway up a big hill. Walks starting from dozens of squares below all pass through it, and every single time, the hiker re-explores every possible walk above it, as if for the first time.

The clever plan: the first time she fully explores the walks from a square, she writes the answer on a signpost there: "the longest uphill walk starting here is 5 squares". Next time any walk arrives at that square, she reads the sign and adds it, instead of climbing again.

That signpost is **memoisation**, and on this problem it turns an exponential search into one visit per square. Example 2 below measures it: on a 10 x 10 grid the naive plan makes 705 310 recursive calls, and the signposts make 280.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or is "greater or equal" allowed? | With equal steps allowed, two equal neighbours form a cycle; the graph is no longer a DAG and memoisation by cell breaks. |
| Four directions only, or diagonals too? | Changes the neighbour list from 4 to 8 offsets; the algorithm is the same. |
| Can the matrix be empty, or have one row or column? | Return 0 for empty; a single row is a common deep-recursion trap. |
| How large can m and n be? | Up to a few hundred each, recursive DFS + memo is the expected answer; a long path may still be deep enough to need an iterative version. |
| Do you want the length or the path itself? | The path can be rebuilt from the memo table after the fact (Example 1 does it). |

## 3. The Core Idea: It Is a Longest Path in a DAG

Turn the grid into a graph:

- every cell is a **node**;
- there is an edge from cell A to a neighbouring cell B whenever \`B > A\`.

📌 **Interview term: Implicit graph** — a graph that is never stored as adjacency lists; neighbours are computed on the fly (here, the four adjacent cells with a larger value).

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycles. Because every step goes to a strictly larger value, you can never return to a cell, so this graph is a DAG.

That matters enormously. In a general graph, the longest simple path is an NP-hard problem. In a DAG it is easy: the longest path starting at a node is 1 plus the longest path starting at its best successor, and those successors can be solved first.

<svg class="iq-diagram" width="100%" viewBox="0 0 420 330" role="img" aria-label="Three by three grid 9 9 4, 6 6 8, 2 1 1. The longest increasing path 1 to 2 to 6 to 9 is highlighted along the left side.">
  <defs>
    <marker id="lip1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="170" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="71" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="40" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="170" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="300" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="171" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="40" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="271" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="271" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="271" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 168 265 L 128 265" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 228 L 80 206" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 128 L 80 106" fill="none" marker-end="url(#lip1-arrow)"/>
</svg>

For the matrix \`[[9, 9, 4], [6, 6, 8], [2, 1, 1]]\` the answer is 4, along 1 → 2 → 6 → 9 (the highlighted cells). Note the two 6s side by side: moving between them is not allowed, because the path must be strictly increasing.

## 4. Brute Force, and Exactly Why It Is Slow

The brute force is a DFS from every cell that tries every increasing neighbour and returns \`1 + the best\` of them:

~~~text
dfs(cell) = 1 + max(dfs(n) for each neighbour n with value > value(cell)), or 1 if there is none
answer    = max(dfs(cell) for every cell)
~~~

It is correct. The problem is **how often the same call happens**.

📌 **Interview term: Overlapping subproblems** — the same smaller problem is solved again and again inside a recursion. Here, \`dfs(cell)\` is called once for **every increasing path that reaches that cell**, from every starting cell.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Two different starting cells, A and B, both step into the same cell C. Brute force explores everything above C twice, memoisation explores it once and reuses the stored answer.">
  <defs>
    <marker id="lip2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="61" text-anchor="middle">start A</text>
  <rect class="d-box" x="40" y="170" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="201" text-anchor="middle">start B</text>
  <rect class="d-box-accent" x="250" y="100" width="120" height="50" rx="10"/>
  <text class="d-text" x="310" y="131" text-anchor="middle">cell C</text>
  <rect class="d-box-muted" x="450" y="100" width="130" height="50" rx="10"/>
  <text class="d-text" x="515" y="131" text-anchor="middle">paths above C</text>
  <path class="d-edge" d="M 162 62 L 244 112" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge" d="M 162 188 L 244 140" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge-accent" d="M 372 125 L 444 125" fill="none" marker-end="url(#lip2-arrow)"/>
</svg>

Every arrow into cell C repeats the whole exploration to its right. With many cells feeding many others, the repeats multiply.

How bad is it? Take the grid where each value is \`row + col\`. Every step right or down increases the value, so the number of increasing paths is the number of monotone lattice paths, which grows exponentially with the grid size. Example 2 counts the calls: 226 for 4 x 4, 3 382 for 6 x 6, 48 538 for 8 x 8 and 705 310 for 10 x 10, roughly 14 times more for every 2 added to the side. The answer only grows from 7 to 19.

## 5. The Fix: Memoise on the Cell

📌 **Interview term: Memoisation** — storing the result of a function call keyed by its arguments and returning the stored value when the same arguments come back. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming); the JavaScript section has a page on [memoization as a general technique](/interview-question/what-is-memoization).

📌 **Interview term: State** — the information a subproblem's answer depends on. Here the state is **just the cell**: the longest increasing path starting at a cell does not depend on how you arrived there. That is the whole justification for memoising on \`(r, c)\`, and it is true only because of the DAG property.

Two consequences of the DAG property that interviewers like to hear:

1. **No visited set.** An ordinary grid DFS needs one to avoid walking in circles; here a path cannot revisit a cell because values only go up.
2. **The memo is never stale.** A general DFS with a visited set gives answers that depend on what is already visited, so caching them would be wrong. Here each cell's answer is a fixed fact about the grid.

With the memo, each cell's body runs once, and each increasing edge triggers exactly one call. Example 2 confirms the count exactly: memo calls = cells + increasing edges (100 + 180 = 280 for 10 x 10).

📌 **Interview term: Top-down vs bottom-up DP** — top-down recurses and caches (memoisation); bottom-up computes subproblems in a dependency order without recursion. For this problem the bottom-up order is a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used) of the cells, which is what the Kahn version in section 7 uses.

## 6. DFS + Memo in Java

~~~java
static int dfs(int r, int c) {
    if (memo[r][c] != 0) return memo[r][c];   // 0 = not computed yet; real answers are >= 1
    int best = 1;                             // the path that is just this cell
    for (int[] d : DIRS) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c])
            best = Math.max(best, 1 + dfs(nr, nc));
    }
    memo[r][c] = best;
    return best;
}
~~~

The driver resets the fields and tries every cell:

~~~java
matrix = m;
rows = m.length;
cols = m[0].length;
memo = new int[rows][cols];               // Java zero-fills new int arrays
int best = 0, sr = 0, sc = 0;
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++) {
        int length = dfs(r, c);
        if (length > best) { best = length; sr = r; sc = c; }
    }
~~~

- \`new int[rows][cols]\` is zero-filled by the language, so 0 can mean "not computed yet"; real answers are at least 1.
- The grid, its size and the memo live in \`static\` fields so \`dfs\` takes only \`(r, c)\`. That keeps the recursive signature short; the cost is that the method is not re-entrant, which is fine for a single call.
- \`final int[][] DIRS\` makes the reference final, not the contents; nothing writes to it.
- \`Math.max(best, 1 + dfs(nr, nc))\` uses \`int\` arithmetic; path lengths are at most rows · cols, far below \`Integer.MAX_VALUE\`.

**Recursion depth.** In a test with the default thread stack, a 1 x 10 000 increasing row worked and a 1 x 40 000 row threw \`StackOverflowError\`. For large or adversarial grids use the Kahn version in section 7, or run the DFS in a \`Thread\` constructed with a bigger stack size.

## 7. Without Recursion: Kahn Layering

The memoised DFS recurses as deep as the longest path. On a 1 x 40 000 strictly increasing row that is 40 000 nested calls. The bottom-up alternative peels the DAG layer by layer, exactly like [Kahn's topological sort](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs):

1. For each cell, count how many **smaller** neighbours point into it (its in-degree).
2. The first layer is every cell with in-degree 0 (local minima).
3. Repeatedly: for each cell in the current layer, decrement the in-degree of each larger neighbour; a neighbour whose in-degree reaches 0 joins the next layer.
4. The number of layers is the length of the longest increasing path.

📌 **Interview term: Kahn's algorithm** — topological sorting by repeatedly removing nodes with in-degree 0. Counting the rounds (layers) gives the longest path in a DAG measured in nodes.

Why the layer count equals the answer: a cell joins layer k exactly when its longest increasing path **ending** there has k cells, because it waits for all its smaller neighbours. So the last layer holds the ends of the longest paths. Example 3 checks it against DFS + memo on 200 random grids and runs it on a 1 x 40 000 row and a 200 x 200 snake with no recursion at all.

### The Kahn version in Java

~~~java
static int lipKahn(int[][] m) {
    if (m.length == 0 || m[0].length == 0) return 0;
    int rows = m.length, cols = m[0].length;
    int[][] indeg = new int[rows][cols];            // smaller neighbours pointing into each cell
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] < m[r][c]) indeg[r][c]++;
            }
    ArrayDeque<int[]> layer = new ArrayDeque<>();
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (indeg[r][c] == 0) layer.add(new int[]{r, c}); // local minima
    int layers = 0;
    while (!layer.isEmpty()) {
        layers++;
        ArrayDeque<int[]> next = new ArrayDeque<>();
        for (int[] cell : layer) {
            for (int[] d : DIRS) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[cell[0]][cell[1]] && --indeg[nr][nc] == 0)
                    next.add(new int[]{nr, nc});
            }
        }
        layer = next;
    }
    return layers;
}
~~~

\`ArrayDeque<int[]>\` holds each layer; a fresh deque per round keeps the layers separate. \`--indeg[nr][nc] == 0\` decrements and tests in one expression.

## 8. Verified: Running the Code

Each example on this page was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — DFS + memo, with one longest path rebuilt** prints:

~~~text
example 1: length 4, path [1, 2, 6, 9]
example 2: length 4, path [3, 4, 5, 6]
single cell: length 1, path [1]
all equal: length 1, path [7]
one row: length 3, path [1, 2, 3]
spiral: length 9, path [1, 2, 3, 4, 5, 6, 7, 8, 9]
empty: length 0, path []
~~~

Reading it: both classic examples give 4. "all equal" gives 1 because equal neighbours are not connected; "one row" stops at 3 because 0 breaks the run; the spiral visits all 9 cells in order.

**Example 2 — brute force vs memo, counting calls** prints:

~~~text
grid where value = row + col (very many increasing paths):
  2x2: answer 3 (brute force agrees: true), brute-force calls 10, memo calls 8 = 4 cells + 4 edges
  4x4: answer 7 (brute force agrees: true), brute-force calls 226, memo calls 40 = 16 cells + 24 edges
  6x6: answer 11 (brute force agrees: true), brute-force calls 3382, memo calls 96 = 36 cells + 60 edges
  8x8: answer 15 (brute force agrees: true), brute-force calls 48538, memo calls 176 = 64 cells + 112 edges
  10x10: answer 19 (brute force agrees: true), brute-force calls 705310, memo calls 280 = 100 cells + 180 edges
~~~

Reading it: both versions always agree on the answer, but brute force grows about 14 times for every 2 added to the side, while the memo count is exactly cells + increasing edges, which grows with the area.

**Example 3 — Kahn layering** prints:

~~~text
4
4
1
0
Kahn and DFS + memo agree on 200 of 200 random grids
200x200 snake grid: longest path 40000
1x40000 increasing row: longest path 40000, no recursion needed
~~~

Reading it: the layer count matches the memo answer on the samples and on 200 random grids, and it handles a path 40 000 cells long with no recursion at all.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS from every cell | exponential in the worst case | O(m·n) stack | one call per increasing path; 705 310 calls on a 10 x 10 grid |
| DFS + memo | O(m·n) | O(m·n) memo + O(m·n) stack worst case | each cell is solved once, each of at most 4·m·n edges followed once |
| Kahn layering | O(m·n) | O(m·n) in-degrees and layers | each cell enters a layer once; no recursion |

Here m·n is the number of cells. The memo version's stack is as deep as the longest path, which is m·n for a snake-shaped grid. See [Big-O notation](/interview-question/what-is-big-o-notation) and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 10. Edge Cases

- **Empty matrix (or empty rows):** return 0 (the examples handle \`[]\`).
- **Single cell:** 1.
- **All values equal:** no edges at all; every cell is a path of 1.
- **A single row or column:** a 1-D problem, but a long increasing run means deep recursion.
- **Plateaus and duplicates:** equal neighbours are not connected; using \`>=\` by mistake creates cycles and infinite recursion.
- **Negative numbers and \`0\`:** fine for comparisons, but do not use the cell value as a "not computed" marker; the memo stores lengths, which are always at least 1, so 0 is a safe sentinel.

## Common Pitfalls

- **Adding a visited set "to be safe".** It is unnecessary here, and memoising results computed under a visited set can be wrong in variants where it matters.
- **Using \`>=\` instead of \`>\`.** Equal neighbours then point at each other and the recursion ends in \`StackOverflowError\`.
- **Static state not reset between calls.** If \`memo\` is a static field, allocate a new one per matrix, as the driver does; otherwise the second test reads the first test's answers.
- **\`HashMap<String, Integer>\` memo keyed by \`r + "," + c\`**: correct but slow, with string building and boxing on every call; use \`int[][]\`.
- **Deep recursion.** A 1 x 40 000 increasing row threw \`StackOverflowError\` with the default stack; use Kahn layering for big inputs.
- **Forgetting the empty matrix.** \`matrix[0].length\` throws \`ArrayIndexOutOfBoundsException\` on a zero-row array.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cells are nodes, with an edge to each strictly larger neighbour. Strictly increasing means no cycles: a DAG.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force:</strong> <span style="color:#f0e2c8;">DFS from every cell over every increasing path; exponential, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(cell)</code> repeats once per path that reaches it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Memo:</strong> <span style="color:#f0e2c8;">The longest path from a cell does not depend on how I got there, so I cache it in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][] memo</code>, which Java zero-fills; 0 means not computed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Each cell solved once, each edge followed once: O(m·n) time and space. No visited set needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Deep paths throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> with the default stack, so for big grids I switch to Kahn layering with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> per layer.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is memoisation valid here and not in a general grid DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the answer from a cell depends only on the cell; in a general DFS it depends on what is already visited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal values were allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then equal neighbours form cycles, it is no longer a DAG, and the problem becomes much harder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you return the path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: start at the cell with the biggest memo and repeatedly step to a larger neighbour whose memo is one less.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why static fields?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(r, c)</code> short. In production I would put the grid and memo in an instance, so calls are re-entrant and thread-safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Bottom-up alternative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort cells by value descending and fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, or use Kahn layering. Both avoid recursion.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | a graph whose edges are computed on the fly instead of stored |
| **DAG** | a directed graph with no cycles |
| **Overlapping subproblems** | the same sub-call is solved many times inside a recursion |
| **Memoisation** | caching a function's result by its arguments |
| **State** | what a subproblem's answer depends on; here only the cell |
| **Top-down vs bottom-up DP** | recursion plus cache, versus solving in dependency order |
| **Kahn's algorithm** | topological sort by removing in-degree-0 nodes, layer by layer |
| **\`StackOverflowError\`** | thrown when recursion exceeds the thread stack size |

---
**Conclusion:** The longest increasing path is a longest path in a DAG in disguise: cells are nodes, edges go to strictly larger neighbours, and strictness rules out cycles. Brute-force DFS is correct but re-explores the same cells once per path reaching them, which is exponential (705 310 calls on a 10 x 10 grid). Because a cell's answer depends only on the cell, memoising it makes every cell and every edge cost one call, O(m·n) in total (280 calls on the same grid), and Kahn layering gives the same answer bottom-up without recursion. In Java, a zero-filled \`int[][]\` is the natural memo, and \`StackOverflowError\` on long paths is the reason to know the Kahn version.
`,
        examples: [
          { label: `DFS + memo on sample matrices, with one longest path rebuilt`, code: `import java.util.*;

public class Main {
    // Longest increasing path in a matrix: DFS from every cell, memoising the answer per cell.
    static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};   // up, down, left, right
    static int[][] matrix, memo;
    static int rows, cols;

    static int dfs(int r, int c) {
        if (memo[r][c] != 0) return memo[r][c];   // 0 = not computed yet; real answers are >= 1
        int best = 1;                             // the path that is just this cell
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c])
                best = Math.max(best, 1 + dfs(nr, nc));
        }
        memo[r][c] = best;
        return best;
    }

    static List<Integer> longestIncreasingPath(int[][] m) {
        List<Integer> path = new ArrayList<>();
        if (m.length == 0 || m[0].length == 0) return path;
        matrix = m;
        rows = m.length;
        cols = m[0].length;
        memo = new int[rows][cols];               // Java zero-fills new int arrays
        int best = 0, sr = 0, sc = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                int length = dfs(r, c);
                if (length > best) { best = length; sr = r; sc = c; }
            }
        // rebuild one longest path by always stepping to a neighbour whose memo is one less
        int r = sr, c = sc;
        path.add(m[r][c]);
        while (memo[r][c] > 1) {
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[r][c] && memo[nr][nc] == memo[r][c] - 1) {
                    r = nr;
                    c = nc;
                    break;
                }
            }
            path.add(m[r][c]);
        }
        return path;
    }

    public static void main(String[] args) {
        String[] names = {"example 1", "example 2", "single cell", "all equal", "one row", "spiral", "empty"};
        int[][][] tests = {
            {{9, 9, 4}, {6, 6, 8}, {2, 1, 1}},
            {{3, 4, 5}, {3, 2, 6}, {2, 2, 1}},
            {{1}},
            {{7, 7}, {7, 7}},
            {{1, 2, 3, 0, 5}},
            {{1, 2, 3}, {8, 9, 4}, {7, 6, 5}},
            {},
        };
        for (int i = 0; i < tests.length; i++) {
            List<Integer> path = longestIncreasingPath(tests[i]);
            System.out.println(names[i] + ": length " + path.size() + ", path " + path);
        }
    }
}
` },
          { label: `Brute-force DFS vs DFS + memo: counting calls`, code: `public class Main {
    // Same answer, very different work: plain DFS from every cell versus DFS + memo.
    static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    static int[][] matrix, memo;
    static int rows, cols;
    static boolean useMemo;
    static long calls;

    static int dfs(int r, int c) {
        calls++;
        if (useMemo && memo[r][c] != 0) return memo[r][c];
        int best = 1;
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr][nc] > matrix[r][c])
                best = Math.max(best, 1 + dfs(nr, nc));
        }
        memo[r][c] = best;
        return best;
    }

    static int solve(int[][] m, boolean withMemo) {
        matrix = m;
        rows = m.length;
        cols = m[0].length;
        memo = new int[rows][cols];
        useMemo = withMemo;
        calls = 0;
        int best = 0;
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) best = Math.max(best, dfs(r, c));
        return best;
    }

    static int increasingEdges(int[][] m) {   // ordered pairs of neighbours (a, b) with b > a
        int count = 0;
        for (int r = 0; r < m.length; r++)
            for (int c = 0; c < m[0].length; c++)
                for (int[] d : DIRS) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr >= 0 && nr < m.length && nc >= 0 && nc < m[0].length && m[nr][nc] > m[r][c]) count++;
                }
        return count;
    }

    public static void main(String[] args) {
        System.out.println("grid where value = row + col (very many increasing paths):");
        for (int n : new int[]{2, 4, 6, 8, 10}) {
            int[][] m = new int[n][n];
            for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) m[r][c] = r + c; // every right or down step increases
            int brute = solve(m, false);
            long bruteCalls = calls;
            int best = solve(m, true);
            long memoCalls = calls;
            System.out.println("  " + n + "x" + n + ": answer " + best + " (brute force agrees: " + (brute == best)
                + "), brute-force calls " + bruteCalls + ", memo calls " + memoCalls
                + " = " + (n * n) + " cells + " + increasingEdges(m) + " edges");
        }
    }
}
` },
          { label: `Kahn layering (no recursion), checked against DFS + memo`, code: `import java.util.*;

public class Main {
    // No recursion: peel the grid layer by layer (Kahn topological sort). Layers = longest path.
    static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    static int lipKahn(int[][] m) {
        if (m.length == 0 || m[0].length == 0) return 0;
        int rows = m.length, cols = m[0].length;
        int[][] indeg = new int[rows][cols];            // smaller neighbours pointing into each cell
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                for (int[] d : DIRS) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] < m[r][c]) indeg[r][c]++;
                }
        ArrayDeque<int[]> layer = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (indeg[r][c] == 0) layer.add(new int[]{r, c}); // local minima
        int layers = 0;
        while (!layer.isEmpty()) {
            layers++;
            ArrayDeque<int[]> next = new ArrayDeque<>();
            for (int[] cell : layer) {
                for (int[] d : DIRS) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[cell[0]][cell[1]] && --indeg[nr][nc] == 0)
                        next.add(new int[]{nr, nc});
                }
            }
            layer = next;
        }
        return layers;
    }

    static int[][] grid, memo;

    static int dfs(int r, int c) {
        if (memo[r][c] != 0) return memo[r][c];
        int best = 1;
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] > grid[r][c])
                best = Math.max(best, 1 + dfs(nr, nc));
        }
        return memo[r][c] = best;
    }

    static int lipMemo(int[][] m) {
        grid = m;
        memo = new int[m.length][m[0].length];
        int best = 0;
        for (int r = 0; r < m.length; r++) for (int c = 0; c < m[0].length; c++) best = Math.max(best, dfs(r, c));
        return best;
    }

    static long seed = 7;
    static int rand() { seed = seed * 48271 % 2147483647L; return (int) seed; }

    public static void main(String[] args) {
        System.out.println(lipKahn(new int[][]{{9, 9, 4}, {6, 6, 8}, {2, 1, 1}})); // 4
        System.out.println(lipKahn(new int[][]{{3, 4, 5}, {3, 2, 6}, {2, 2, 1}})); // 4
        System.out.println(lipKahn(new int[][]{{1}})); // 1
        System.out.println(lipKahn(new int[][]{})); // 0

        int agree = 0;
        for (int trial = 0; trial < 200; trial++) {
            int rows = rand() % 8 + 1, cols = rand() % 8 + 1;
            int[][] m = new int[rows][cols];
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) m[r][c] = rand() % 10;
            if (lipKahn(m) == lipMemo(m)) agree++;
        }
        System.out.println("Kahn and DFS + memo agree on " + agree + " of 200 random grids");

        int n = 200;                                     // snake: one increasing path through every cell
        int[][] snake = new int[n][n];
        for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) snake[r][c] = r * n + (r % 2 == 0 ? c : n - 1 - c);
        System.out.println("200x200 snake grid: longest path " + lipKahn(snake));
        int[][] row = new int[1][40000];                 // 1 x 40000, strictly increasing
        for (int i = 0; i < 40000; i++) row[0][i] = i;
        System.out.println("1x40000 increasing row: longest path " + lipKahn(row) + ", no recursion needed");
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an m by n matrix of integers, return the length of the longest strictly increasing path, moving only up, down, left or right. Start with the brute force, explain why it is slow, then make it fast. Please write it in C++."

**What a strong answer should cover:**
- The model: every cell is a node with an edge to each strictly larger neighbour; strictly increasing means no cycles, so it is a DAG, and the answer is its longest path.
- Brute force: DFS from every cell exploring every increasing path is exponential, because the same cells are re-explored from many starts.
- DFS + memo: the longest path starting at a cell does not depend on how you reached it, so cache it; each cell is solved once and each edge is followed once: O(m·n) time and space.
- No visited set is needed (values strictly increase, so a path cannot revisit a cell), and the alternative is Kahn topological layering, which avoids recursion.
- C++ specifics: \`vector<vector<int>> memo(rows, vector<int>(cols, 0))\`, a recursive lambda through \`std::function\`, and the native stack: 40 000 levels ran fine here but 1 000 000 crashed with a segmentation fault, so very large inputs need the iterative topological version.

**Clarifying questions expected:**
- "Strictly increasing, or is equal allowed?" (equal values would create cycles and break memoisation)
- "Only four directions, no diagonals? Can the matrix be empty?"

**Code / implementation expected:** Yes — \`int longestIncreasingPath(vector<vector<int>>& matrix)\` in C++ with DFS + memo; the Kahn layering version is a bonus.`,
        answer: `**Target Audience:** Interview candidates who know recursion and grid DFS; memoisation and the DAG view are explained from scratch
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A hiker stands on a field of hills laid out as a grid; each square has a height. She wants the longest walk that goes **strictly uphill** at every step, moving north, south, east or west.

The naive plan: from every square, try every uphill walk, and remember the longest. It works, but think about a popular square halfway up a big hill. Walks starting from dozens of squares below all pass through it, and every single time, the hiker re-explores every possible walk above it, as if for the first time.

The clever plan: the first time she fully explores the walks from a square, she writes the answer on a signpost there: "the longest uphill walk starting here is 5 squares". Next time any walk arrives at that square, she reads the sign and adds it, instead of climbing again.

That signpost is **memoisation**, and on this problem it turns an exponential search into one visit per square. Example 2 below measures it: on a 10 x 10 grid the naive plan makes 705 310 recursive calls, and the signposts make 280.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or is "greater or equal" allowed? | With equal steps allowed, two equal neighbours form a cycle; the graph is no longer a DAG and memoisation by cell breaks. |
| Four directions only, or diagonals too? | Changes the neighbour list from 4 to 8 offsets; the algorithm is the same. |
| Can the matrix be empty, or have one row or column? | Return 0 for empty; a single row is a common deep-recursion trap. |
| How large can m and n be? | Up to a few hundred each, recursive DFS + memo is the expected answer; a long path may still be deep enough to need an iterative version. |
| Do you want the length or the path itself? | The path can be rebuilt from the memo table after the fact (Example 1 does it). |

## 3. The Core Idea: It Is a Longest Path in a DAG

Turn the grid into a graph:

- every cell is a **node**;
- there is an edge from cell A to a neighbouring cell B whenever \`B > A\`.

📌 **Interview term: Implicit graph** — a graph that is never stored as adjacency lists; neighbours are computed on the fly (here, the four adjacent cells with a larger value).

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycles. Because every step goes to a strictly larger value, you can never return to a cell, so this graph is a DAG.

That matters enormously. In a general graph, the longest simple path is an NP-hard problem. In a DAG it is easy: the longest path starting at a node is 1 plus the longest path starting at its best successor, and those successors can be solved first.

<svg class="iq-diagram" width="100%" viewBox="0 0 420 330" role="img" aria-label="Three by three grid 9 9 4, 6 6 8, 2 1 1. The longest increasing path 1 to 2 to 6 to 9 is highlighted along the left side.">
  <defs>
    <marker id="lip1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="170" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="71" text-anchor="middle">9</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="71" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="40" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="170" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="171" text-anchor="middle">6</text>
  <rect class="d-box" x="300" y="130" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="171" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="40" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="80" y="271" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="210" y="271" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="230" width="80" height="70" rx="8"/>
  <text class="d-text" x="340" y="271" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 168 265 L 128 265" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 228 L 80 206" fill="none" marker-end="url(#lip1-arrow)"/>
  <path class="d-edge-accent" d="M 80 128 L 80 106" fill="none" marker-end="url(#lip1-arrow)"/>
</svg>

For the matrix \`[[9, 9, 4], [6, 6, 8], [2, 1, 1]]\` the answer is 4, along 1 → 2 → 6 → 9 (the highlighted cells). Note the two 6s side by side: moving between them is not allowed, because the path must be strictly increasing.

## 4. Brute Force, and Exactly Why It Is Slow

The brute force is a DFS from every cell that tries every increasing neighbour and returns \`1 + the best\` of them:

~~~text
dfs(cell) = 1 + max(dfs(n) for each neighbour n with value > value(cell)), or 1 if there is none
answer    = max(dfs(cell) for every cell)
~~~

It is correct. The problem is **how often the same call happens**.

📌 **Interview term: Overlapping subproblems** — the same smaller problem is solved again and again inside a recursion. Here, \`dfs(cell)\` is called once for **every increasing path that reaches that cell**, from every starting cell.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 250" role="img" aria-label="Two different starting cells, A and B, both step into the same cell C. Brute force explores everything above C twice, memoisation explores it once and reuses the stored answer.">
  <defs>
    <marker id="lip2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="61" text-anchor="middle">start A</text>
  <rect class="d-box" x="40" y="170" width="120" height="50" rx="10"/>
  <text class="d-text" x="100" y="201" text-anchor="middle">start B</text>
  <rect class="d-box-accent" x="250" y="100" width="120" height="50" rx="10"/>
  <text class="d-text" x="310" y="131" text-anchor="middle">cell C</text>
  <rect class="d-box-muted" x="450" y="100" width="130" height="50" rx="10"/>
  <text class="d-text" x="515" y="131" text-anchor="middle">paths above C</text>
  <path class="d-edge" d="M 162 62 L 244 112" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge" d="M 162 188 L 244 140" fill="none" marker-end="url(#lip2-arrow)"/>
  <path class="d-edge-accent" d="M 372 125 L 444 125" fill="none" marker-end="url(#lip2-arrow)"/>
</svg>

Every arrow into cell C repeats the whole exploration to its right. With many cells feeding many others, the repeats multiply.

How bad is it? Take the grid where each value is \`row + col\`. Every step right or down increases the value, so the number of increasing paths is the number of monotone lattice paths, which grows exponentially with the grid size. Example 2 counts the calls: 226 for 4 x 4, 3 382 for 6 x 6, 48 538 for 8 x 8 and 705 310 for 10 x 10, roughly 14 times more for every 2 added to the side. The answer only grows from 7 to 19.

## 5. The Fix: Memoise on the Cell

📌 **Interview term: Memoisation** — storing the result of a function call keyed by its arguments and returning the stored value when the same arguments come back. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming); the JavaScript section has a page on [memoization as a general technique](/interview-question/what-is-memoization).

📌 **Interview term: State** — the information a subproblem's answer depends on. Here the state is **just the cell**: the longest increasing path starting at a cell does not depend on how you arrived there. That is the whole justification for memoising on \`(r, c)\`, and it is true only because of the DAG property.

Two consequences of the DAG property that interviewers like to hear:

1. **No visited set.** An ordinary grid DFS needs one to avoid walking in circles; here a path cannot revisit a cell because values only go up.
2. **The memo is never stale.** A general DFS with a visited set gives answers that depend on what is already visited, so caching them would be wrong. Here each cell's answer is a fixed fact about the grid.

With the memo, each cell's body runs once, and each increasing edge triggers exactly one call. Example 2 confirms the count exactly: memo calls = cells + increasing edges (100 + 180 = 280 for 10 x 10).

📌 **Interview term: Top-down vs bottom-up DP** — top-down recurses and caches (memoisation); bottom-up computes subproblems in a dependency order without recursion. For this problem the bottom-up order is a [topological order](/interview-question/what-is-topological-sort-and-when-is-it-used) of the cells, which is what the Kahn version in section 7 uses.

## 6. DFS + Memo in C++

~~~cpp
vector<vector<int>> memo(rows, vector<int>(cols, 0));   // 0 = not computed yet
auto inside = [&](int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; };

function<int(int, int)> dfs = [&](int r, int c) -> int {
    if (memo[r][c] != 0) return memo[r][c];
    int best = 1;                                         // the path that is just this cell
    for (auto& d : DIRS) {
        int nr = r + d[0], nc = c + d[1];
        if (inside(nr, nc) && m[nr][nc] > m[r][c]) best = max(best, 1 + dfs(nr, nc));
    }
    return memo[r][c] = best;
};

int best = 0, sr = 0, sc = 0;
for (int r = 0; r < rows; ++r)
    for (int c = 0; c < cols; ++c) {
        int length = dfs(r, c);
        if (length > best) { best = length; sr = r; sc = c; }
    }
~~~

- \`vector<vector<int>> memo(rows, vector<int>(cols, 0))\` builds \`rows\` independent copies of a zero row; 0 means "not computed yet".
- \`inside\` is a small lambda for the bounds check. Comparing \`int\` indices with \`rows\` and \`cols\` (also \`int\`) avoids signed / unsigned comparisons against \`size()\`.
- \`function<int(int, int)> dfs = [&](...) -> int { ... }\` is a lambda that can call itself, because it captures the \`std::function\` variable by reference. The explicit \`-> int\` return type is needed since the body has several returns.
- \`return memo[r][c] = best;\` stores and returns in one expression.
- Example 1 continues after this loop: it rebuilds one longest path by repeatedly stepping to a larger neighbour whose memo value is exactly one less.

**Recursion depth.** C++ uses the native thread stack (8 MB by default on this Linux machine). A 1 x 40 000 increasing row ran fine, and a 1 x 1 000 000 row crashed with a segmentation fault: there is no exception to catch. For very large grids use the Kahn version in section 7.

## 7. Without Recursion: Kahn Layering

The memoised DFS recurses as deep as the longest path. On a 1 x 40 000 strictly increasing row that is 40 000 nested calls. The bottom-up alternative peels the DAG layer by layer, exactly like [Kahn's topological sort](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs):

1. For each cell, count how many **smaller** neighbours point into it (its in-degree).
2. The first layer is every cell with in-degree 0 (local minima).
3. Repeatedly: for each cell in the current layer, decrement the in-degree of each larger neighbour; a neighbour whose in-degree reaches 0 joins the next layer.
4. The number of layers is the length of the longest increasing path.

📌 **Interview term: Kahn's algorithm** — topological sorting by repeatedly removing nodes with in-degree 0. Counting the rounds (layers) gives the longest path in a DAG measured in nodes.

Why the layer count equals the answer: a cell joins layer k exactly when its longest increasing path **ending** there has k cells, because it waits for all its smaller neighbours. So the last layer holds the ends of the longest paths. Example 3 checks it against DFS + memo on 200 random grids and runs it on a 1 x 40 000 row and a 200 x 200 snake with no recursion at all.

### The Kahn version in C++

~~~cpp
int lipKahn(const Matrix& m) {
    if (m.empty() || m[0].empty()) return 0;
    int rows = m.size(), cols = m[0].size();
    auto inside = [&](int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; };
    vector<vector<int>> indeg(rows, vector<int>(cols, 0));   // smaller neighbours pointing into each cell
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            for (auto& d : DIRS)
                if (inside(r + d[0], c + d[1]) && m[r + d[0]][c + d[1]] < m[r][c]) ++indeg[r][c];
    vector<pair<int, int>> layer;
    for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) if (indeg[r][c] == 0) layer.push_back({r, c}); // local minima
    int layers = 0;
    while (!layer.empty()) {
        ++layers;
        vector<pair<int, int>> next;
        for (auto [r, c] : layer)
            for (auto& d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (inside(nr, nc) && m[nr][nc] > m[r][c] && --indeg[nr][nc] == 0) next.push_back({nr, nc});
            }
        layer.swap(next);
    }
    return layers;
}
~~~

\`layer.swap(next)\` exchanges the two vectors in O(1) instead of copying. \`--indeg[nr][nc] == 0\` decrements and tests in one expression.

## 8. Verified: Running the Code

Each example on this page was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — DFS + memo, with one longest path rebuilt** prints:

~~~text
example 1: length 4, path [1, 2, 6, 9]
example 2: length 4, path [3, 4, 5, 6]
single cell: length 1, path [1]
all equal: length 1, path [7]
one row: length 3, path [1, 2, 3]
spiral: length 9, path [1, 2, 3, 4, 5, 6, 7, 8, 9]
empty: length 0, path []
~~~

Reading it: both classic examples give 4. "all equal" gives 1 because equal neighbours are not connected; "one row" stops at 3 because 0 breaks the run; the spiral visits all 9 cells in order.

**Example 2 — brute force vs memo, counting calls** prints:

~~~text
grid where value = row + col (very many increasing paths):
  2x2: answer 3 (brute force agrees: true), brute-force calls 10, memo calls 8 = 4 cells + 4 edges
  4x4: answer 7 (brute force agrees: true), brute-force calls 226, memo calls 40 = 16 cells + 24 edges
  6x6: answer 11 (brute force agrees: true), brute-force calls 3382, memo calls 96 = 36 cells + 60 edges
  8x8: answer 15 (brute force agrees: true), brute-force calls 48538, memo calls 176 = 64 cells + 112 edges
  10x10: answer 19 (brute force agrees: true), brute-force calls 705310, memo calls 280 = 100 cells + 180 edges
~~~

Reading it: both versions always agree on the answer, but brute force grows about 14 times for every 2 added to the side, while the memo count is exactly cells + increasing edges, which grows with the area.

**Example 3 — Kahn layering** prints:

~~~text
4
4
1
0
Kahn and DFS + memo agree on 200 of 200 random grids
200x200 snake grid: longest path 40000
1x40000 increasing row: longest path 40000, no recursion needed
~~~

Reading it: the layer count matches the memo answer on the samples and on 200 random grids, and it handles a path 40 000 cells long with no recursion at all.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS from every cell | exponential in the worst case | O(m·n) stack | one call per increasing path; 705 310 calls on a 10 x 10 grid |
| DFS + memo | O(m·n) | O(m·n) memo + O(m·n) stack worst case | each cell is solved once, each of at most 4·m·n edges followed once |
| Kahn layering | O(m·n) | O(m·n) in-degrees and layers | each cell enters a layer once; no recursion |

Here m·n is the number of cells. The memo version's stack is as deep as the longest path, which is m·n for a snake-shaped grid. See [Big-O notation](/interview-question/what-is-big-o-notation) and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 10. Edge Cases

- **Empty matrix (or empty rows):** return 0 (the examples handle \`[]\`).
- **Single cell:** 1.
- **All values equal:** no edges at all; every cell is a path of 1.
- **A single row or column:** a 1-D problem, but a long increasing run means deep recursion.
- **Plateaus and duplicates:** equal neighbours are not connected; using \`>=\` by mistake creates cycles and infinite recursion.
- **Negative numbers and \`0\`:** fine for comparisons, but do not use the cell value as a "not computed" marker; the memo stores lengths, which are always at least 1, so 0 is a safe sentinel.

## Common Pitfalls

- **Adding a visited set "to be safe".** It is unnecessary here, and memoising results computed under a visited set can be wrong in variants where it matters.
- **Using \`>=\` instead of \`>\`.** Equal neighbours then point at each other; the recursion never ends and crashes the process.
- **\`m[0].size()\` on an empty matrix** is undefined behaviour (no bounds check); test \`m.empty()\` first.
- **Stack overflow is a crash, not an exception.** The 1 x 1 000 000 row ended in a segmentation fault; use Kahn layering for big inputs.
- **Unsigned arithmetic in bounds checks.** With \`size_t r\`, \`r - 1\` on row 0 wraps to a huge number; keep indices \`int\` and check \`nr >= 0\`.
- **Passing the matrix by value** into a recursive helper copies it on every call; pass \`const Matrix&\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cells are nodes, with an edge to each strictly larger neighbour. Strictly increasing means no cycles: a DAG.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force:</strong> <span style="color:#f0e2c8;">DFS from every cell over every increasing path; exponential, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dfs(cell)</code> repeats once per path that reaches it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Memo:</strong> <span style="color:#f0e2c8;">The longest path from a cell does not depend on how I got there, so I cache it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt; memo</code>; 0 means not computed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Each cell solved once, each edge followed once: O(m·n) time and space. No visited set needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Recursion uses the native stack and an overflow is a segfault, so for huge grids I use Kahn layering, swapping layer vectors in O(1).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is memoisation valid here and not in a general grid DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the answer from a cell depends only on the cell; in a general DFS it depends on what is already visited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal values were allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then equal neighbours form cycles, it is no longer a DAG, and the problem becomes much harder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you return the path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: start at the cell with the biggest memo and repeatedly step to a larger neighbour whose memo is one less.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::function</code> for the lambda?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A lambda cannot name itself with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::function</code> gives it a type to capture. A free function with the memo passed by reference is faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Bottom-up alternative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort cells by value descending and fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, or use Kahn layering. Both avoid recursion.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | a graph whose edges are computed on the fly instead of stored |
| **DAG** | a directed graph with no cycles |
| **Overlapping subproblems** | the same sub-call is solved many times inside a recursion |
| **Memoisation** | caching a function's result by its arguments |
| **State** | what a subproblem's answer depends on; here only the cell |
| **Top-down vs bottom-up DP** | recursion plus cache, versus solving in dependency order |
| **Kahn's algorithm** | topological sort by removing in-degree-0 nodes, layer by layer |
| **\`std::function\`** | a type-erased callable wrapper; lets a lambda refer to itself |

---
**Conclusion:** The longest increasing path is a longest path in a DAG in disguise: cells are nodes, edges go to strictly larger neighbours, and strictness rules out cycles. Brute-force DFS is correct but re-explores the same cells once per path reaching them, which is exponential (705 310 calls on a 10 x 10 grid). Because a cell's answer depends only on the cell, memoising it makes every cell and every edge cost one call, O(m·n) in total (280 calls on the same grid), and Kahn layering gives the same answer bottom-up without recursion. In C++, the memo is a \`vector<vector<int>>\`, the recursive lambda goes through \`std::function\`, and a stack overflow is a crash, which the Kahn version avoids.
`,
        examples: [
          { label: `DFS + memo on sample matrices, with one longest path rebuilt`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Longest increasing path in a matrix: DFS from every cell, memoising the answer per cell.
using Matrix = vector<vector<int>>;
const int DIRS[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};   // up, down, left, right

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

pair<int, vector<int>> longestIncreasingPath(const Matrix& m) {
    if (m.empty() || m[0].empty()) return {0, {}};
    int rows = m.size(), cols = m[0].size();
    vector<vector<int>> memo(rows, vector<int>(cols, 0));   // 0 = not computed yet
    auto inside = [&](int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; };

    function<int(int, int)> dfs = [&](int r, int c) -> int {
        if (memo[r][c] != 0) return memo[r][c];
        int best = 1;                                         // the path that is just this cell
        for (auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (inside(nr, nc) && m[nr][nc] > m[r][c]) best = max(best, 1 + dfs(nr, nc));
        }
        return memo[r][c] = best;
    };

    int best = 0, sr = 0, sc = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            int length = dfs(r, c);
            if (length > best) { best = length; sr = r; sc = c; }
        }

    // rebuild one longest path by always stepping to a neighbour whose memo is one less
    int r = sr, c = sc;
    vector<int> path = {m[r][c]};
    while (memo[r][c] > 1) {
        for (auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (inside(nr, nc) && m[nr][nc] > m[r][c] && memo[nr][nc] == memo[r][c] - 1) {
                r = nr;
                c = nc;
                break;
            }
        }
        path.push_back(m[r][c]);
    }
    return {best, path};
}

int main() {
    vector<pair<string, Matrix>> tests = {
        {"example 1", {{9, 9, 4}, {6, 6, 8}, {2, 1, 1}}},
        {"example 2", {{3, 4, 5}, {3, 2, 6}, {2, 2, 1}}},
        {"single cell", {{1}}},
        {"all equal", {{7, 7}, {7, 7}}},
        {"one row", {{1, 2, 3, 0, 5}}},
        {"spiral", {{1, 2, 3}, {8, 9, 4}, {7, 6, 5}}},
        {"empty", {}},
    };
    for (auto& [name, m] : tests) {
        auto [length, path] = longestIncreasingPath(m);
        cout << name << ": length " << length << ", path " << fmt(path) << "\\n";
    }
}
` },
          { label: `Brute-force DFS vs DFS + memo: counting calls`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>
using namespace std;

// Same answer, very different work: plain DFS from every cell versus DFS + memo.
using Matrix = vector<vector<int>>;
const int DIRS[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

pair<int, long long> solve(const Matrix& m, bool useMemo) {
    int rows = m.size(), cols = m[0].size();
    vector<vector<int>> memo(rows, vector<int>(cols, 0));
    long long calls = 0;
    function<int(int, int)> dfs = [&](int r, int c) -> int {
        ++calls;
        if (useMemo && memo[r][c] != 0) return memo[r][c];
        int best = 1;
        for (auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[r][c]) best = max(best, 1 + dfs(nr, nc));
        }
        return memo[r][c] = best;
    };
    int best = 0;
    for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) best = max(best, dfs(r, c));
    return {best, calls};
}

int increasingEdges(const Matrix& m) {        // ordered pairs of neighbours (a, b) with b > a
    int rows = m.size(), cols = m[0].size(), count = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            for (auto& d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[r][c]) ++count;
            }
    return count;
}

int main() {
    cout << boolalpha;
    cout << "grid where value = row + col (very many increasing paths):\\n";
    for (int n : {2, 4, 6, 8, 10}) {
        Matrix m(n, vector<int>(n));
        for (int r = 0; r < n; ++r) for (int c = 0; c < n; ++c) m[r][c] = r + c;   // every right or down step increases
        auto [brute, bruteCalls] = solve(m, false);
        auto [best, memoCalls] = solve(m, true);
        cout << "  " << n << "x" << n << ": answer " << best << " (brute force agrees: " << (brute == best)
             << "), brute-force calls " << bruteCalls << ", memo calls " << memoCalls
             << " = " << n * n << " cells + " << increasingEdges(m) << " edges\\n";
    }
}
` },
          { label: `Kahn layering (no recursion), checked against DFS + memo`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

// No recursion: peel the grid layer by layer (Kahn topological sort). Layers = longest path.
using Matrix = vector<vector<int>>;
const int DIRS[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

int lipKahn(const Matrix& m) {
    if (m.empty() || m[0].empty()) return 0;
    int rows = m.size(), cols = m[0].size();
    auto inside = [&](int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; };
    vector<vector<int>> indeg(rows, vector<int>(cols, 0));   // smaller neighbours pointing into each cell
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            for (auto& d : DIRS)
                if (inside(r + d[0], c + d[1]) && m[r + d[0]][c + d[1]] < m[r][c]) ++indeg[r][c];
    vector<pair<int, int>> layer;
    for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) if (indeg[r][c] == 0) layer.push_back({r, c}); // local minima
    int layers = 0;
    while (!layer.empty()) {
        ++layers;
        vector<pair<int, int>> next;
        for (auto [r, c] : layer)
            for (auto& d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (inside(nr, nc) && m[nr][nc] > m[r][c] && --indeg[nr][nc] == 0) next.push_back({nr, nc});
            }
        layer.swap(next);
    }
    return layers;
}

int lipMemo(const Matrix& m) {
    int rows = m.size(), cols = m[0].size();
    vector<vector<int>> memo(rows, vector<int>(cols, 0));
    function<int(int, int)> dfs = [&](int r, int c) -> int {
        if (memo[r][c] != 0) return memo[r][c];
        int best = 1;
        for (auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[r][c]) best = max(best, 1 + dfs(nr, nc));
        }
        return memo[r][c] = best;
    };
    int best = 0;
    for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) best = max(best, dfs(r, c));
    return best;
}

long long seed = 7;
int rnd() { seed = seed * 48271 % 2147483647LL; return (int)seed; }

int main() {
    cout << lipKahn({{9, 9, 4}, {6, 6, 8}, {2, 1, 1}}) << "\\n"; // 4
    cout << lipKahn({{3, 4, 5}, {3, 2, 6}, {2, 2, 1}}) << "\\n"; // 4
    cout << lipKahn({{1}}) << "\\n"; // 1
    cout << lipKahn({}) << "\\n"; // 0

    int agree = 0;
    for (int trial = 0; trial < 200; ++trial) {
        int rows = rnd() % 8 + 1;
        int cols = rnd() % 8 + 1;
        Matrix m(rows, vector<int>(cols));
        for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) m[r][c] = rnd() % 10;
        if (lipKahn(m) == lipMemo(m)) ++agree;
    }
    cout << "Kahn and DFS + memo agree on " << agree << " of 200 random grids\\n";

    const int n = 200;                                       // snake: one increasing path through every cell
    Matrix snake(n, vector<int>(n));
    for (int r = 0; r < n; ++r) for (int c = 0; c < n; ++c) snake[r][c] = r * n + (r % 2 == 0 ? c : n - 1 - c);
    cout << "200x200 snake grid: longest path " << lipKahn(snake) << "\\n";
    Matrix row(1, vector<int>(40000));                       // 1 x 40000, strictly increasing
    for (int i = 0; i < 40000; ++i) row[0][i] = i;
    cout << "1x40000 increasing row: longest path " << lipKahn(row) << ", no recursion needed\\n";
}
` },
        ],
      },
    },
  },
];

export default augments;
