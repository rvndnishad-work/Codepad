/**
 * DSA ULTRA — batch 23: Graphs II — ordering, cycles and connectivity
 * (topological sort, course schedule, Kahn vs DFS, directed cycle detection,
 * alien dictionary). One complete answer per language (Python, JavaScript,
 * Java, C++). Every example was run with python3 / node / javac+java /
 * g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted output is
 * that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `What is topological sort and when is it used?`,
    difficulty: "medium",
    seoDescription: `Topological sort in Python, JavaScript, Java and C++: DAGs, Kahn's in-degree queue, DFS reverse post-order, cycle detection and real uses.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a topological sort, and when would you use one? Walk me through an algorithm for it and code it in Python."

**What a strong answer should cover:**
- A topological order lists every node so that each edge u -> v has u before v; it exists only for a DAG (no cycles), and it is usually not unique.
- Kahn's algorithm: in-degrees, a queue of in-degree-0 nodes, decrement neighbours; fewer than n nodes placed means a cycle.
- The DFS alternative: reverse post-order, with three colours to catch a back edge.
- O(V + E) time and space for both, and real uses: build order, package installs, spreadsheets, course prerequisites, DP on a DAG.
- Python specifics: \`collections.deque\` for an O(1) \`popleft\` (not \`list.pop(0)\`), \`heapq\` (a min-heap) for the smallest order, the 1000-frame default recursion limit for DFS, and the standard-library \`graphlib.TopologicalSorter\`.

**Code / implementation expected:** Yes — a \`kahn(n, edges)\` function in Python that returns an order or signals a cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think about getting dressed in the morning. Socks go on before shoes. Underwear goes on before trousers. Trousers go on before shoes and before the belt. A shirt goes on before a tie. Nobody writes this down, but there are rules: **some things must happen before other things**. Some pairs have no rule at all — you can put on your watch whenever you like.

Now imagine a computer has to do the same thing for 50,000 jobs: compile these files before linking that program, install this package before that one, recalculate cell B2 before cell C7 because C7 uses B2. It needs **one list** of all the jobs in an order that never breaks a rule. That list is a **topological order**, and the procedure that produces it is a **topological sort**.

There is one way to make it impossible: a loop of rules. If shoes must go on before socks *and* socks before shoes, no order works. So every topological sort also answers a second question for free: *is there a loop in these rules?*

## 2. The Core Idea

📌 **Interview term: Directed graph** — a set of nodes (here: tasks) joined by one-way arrows (edges). An arrow \`u -> v\` means "u must happen before v". If graphs are new to you, start with [what a graph is and how to store one](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Topological order** — a list of **all** the nodes such that for **every** edge \`u -> v\`, \`u\` appears earlier in the list than \`v\`. Topological sort is the algorithm that finds one.

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycle. A topological order exists **exactly when** the graph is a DAG. If there is a cycle, the first node of the cycle in any list would need some other cycle node before it, which is impossible.

Here is a small software build. Each box is a module; each arrow means "build this first". The number under each name is its **in-degree** — how many arrows point into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 300" role="img" aria-label="Build graph: utils points to auth and db, config points to db, auth and db point to api, api points to web">
  <defs>
    <marker id="topo1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="74" text-anchor="middle">utils</text>
  <text class="d-sub" x="90" y="94" text-anchor="middle">in-degree 0</text>
  <rect class="d-box-accent" x="30" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="234" text-anchor="middle">config</text>
  <text class="d-sub" x="90" y="254" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="250" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">auth</text>
  <text class="d-sub" x="310" y="94" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="250" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="234" text-anchor="middle">db</text>
  <text class="d-sub" x="310" y="254" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="450" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="510" y="154" text-anchor="middle">api</text>
  <text class="d-sub" x="510" y="174" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="630" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="690" y="154" text-anchor="middle">web</text>
  <text class="d-sub" x="690" y="174" text-anchor="middle">in-degree 1</text>
  <path class="d-edge" d="M 150 77 L 244 77" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 100 L 246 214" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 237 L 244 237" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 90 L 446 140" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 224 L 446 174" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 570 157 L 624 157" marker-end="url(#topo1-arrow)"/>
</svg>

\`utils\` and \`config\` (highlighted) depend on nothing, so either can go first. \`utils -> config -> auth -> db -> api -> web\` is a valid order, and so is \`config -> utils -> auth -> db -> api -> web\`. Both are printed by the examples below.

**Topological orders are usually not unique.** Whenever two tasks have no path between them, either can go first. For the classic six-node graph in Example 2, there are **13** valid orders; a straight chain has exactly 1; four nodes with no edges have 4! = 24. When an interviewer wants one specific answer (often "the lexicographically smallest"), you change a single data structure, as shown below.

📌 **Interview term: Cycle** — a path of arrows that comes back to where it started, like \`a -> b -> c -> a\`. A self-loop \`a -> a\` is the shortest cycle. Finding one is its own question: [how to detect a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 520 250" role="img" aria-label="A cycle of three tasks a b c where every task has in-degree 1, so no task can start">
  <defs>
    <marker id="topo2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="120" height="54" rx="8"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">a</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="40" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="100" y="194" text-anchor="middle">c</text>
  <text class="d-sub" x="100" y="214" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="360" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">b</text>
  <text class="d-sub" x="420" y="214" text-anchor="middle">in-degree 1</text>
  <path class="d-edge-accent" d="M 320 60 L 396 164" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 356 197 L 166 197" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 124 166 L 200 62" marker-end="url(#topo2-arrow)"/>
</svg>

In a cycle every node waits for another node in the same cycle, so no node ever reaches in-degree 0 and nothing can start. That is exactly how the algorithms below notice the cycle.

## 3. Algorithm 1 — Kahn's Algorithm (peel off what is ready)

📌 **Interview term: In-degree** — the number of edges pointing **into** a node: how many things it is still waiting for.

📌 **Interview term: Kahn's algorithm** — the queue-based topological sort (described by A. B. Kahn in a 1962 Communications of the ACM paper, per [Wikipedia: Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)). It is a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)-style loop:

1. Count the in-degree of every node.
2. Put every node with in-degree 0 into a queue — these are ready now.
3. Repeatedly take a node from the queue, append it to the output, and "remove" its outgoing edges by decrementing each neighbour in-degree. Any neighbour that drops to 0 joins the queue.
4. If the output has all n nodes, it is a topological order. If it is shorter, the missing nodes are stuck behind a cycle.

Here is the trace on the build graph (tasks numbered utils=0, config=1, db=2, auth=3, api=4, web=5):

| Step | Take from queue | In-degrees that drop | Queue after |
| :--- | :--- | :--- | :--- |
| start | — | — | utils, config |
| 1 | utils | auth 1 to 0, db 2 to 1 | config, auth |
| 2 | config | db 1 to 0 | auth, db |
| 3 | auth | api 2 to 1 | db |
| 4 | db | api 1 to 0 | api |
| 5 | api | web 1 to 0 | web |
| 6 | web | — | empty |

Six nodes placed, so the order \`utils, config, auth, db, api, web\` is valid. Add one more edge \`web -> utils\` and \`utils\` now has in-degree 1: only \`config\` starts, it lowers \`db\` to 1, and the queue runs dry after **1 of 6** tasks. That is the cycle signal (Example 1 prints it).

## 4. Algorithm 2 — DFS and Reverse Post-Order

📌 **Interview term: Post-order (finish order)** — in a depth-first search, a node "finishes" when every node reachable from it has been fully explored. The finish order lists nodes in the order they finish.

📌 **Interview term: Reverse post-order** — the finish order read backwards. On a DAG it is always a topological order.

**Why it works.** When DFS finishes \`u\`, everything \`u\` points to has already finished (DFS explored it first, or it was already done). So in the finish list, every arrow points **backwards**: \`v\` is written before \`u\`. Reversing the list makes every arrow point forwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Finish order web api db auth utils config, and the same list reversed gives config utils auth db api web">
  <defs>
    <marker id="topo3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="28">finish order, first to finish on the left</text>
  <rect class="d-box-muted" x="30" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">web</text>
  <rect class="d-box-muted" x="150" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">api</text>
  <rect class="d-box-muted" x="270" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="70" text-anchor="middle">db</text>
  <rect class="d-box-muted" x="390" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">auth</text>
  <rect class="d-box-muted" x="510" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">utils</text>
  <rect class="d-box-muted" x="630" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">config</text>
  <path class="d-edge-dashed" d="M 380 98 L 380 150" marker-end="url(#topo3-arrow)"/>
  <text class="d-sub" x="400" y="130">reverse</text>
  <text class="d-sub" x="30" y="160">topological order</text>
  <rect class="d-box-accent" x="30" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="200" text-anchor="middle">config</text>
  <rect class="d-box-accent" x="150" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="200" text-anchor="middle">utils</text>
  <rect class="d-box-accent" x="270" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="200" text-anchor="middle">auth</text>
  <rect class="d-box-accent" x="390" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="200" text-anchor="middle">db</text>
  <rect class="d-box-accent" x="510" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="200" text-anchor="middle">api</text>
  <rect class="d-box-accent" x="630" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="200" text-anchor="middle">web</text>
</svg>

DFS started at \`utils\` and went \`utils -> db -> api -> web\`, so \`web\` finished first. The DFS version detects cycles with three colours (unvisited, on the current path, finished): an edge into a node that is still on the current path is a cycle. Which of the two algorithms to pick, and why, is the subject of [Kahn vs DFS for Course Schedule](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 5. When Is It Used?

Reach for topological sort whenever a problem says **"depends on", "prerequisite", "before/after", "build order", "schedule"** on one-way relationships:

- **Build systems and compilers:** compile modules after the modules they import.
- **Package managers:** install dependencies before the packages that need them.
- **Spreadsheets:** recompute a cell only after the cells its formula reads.
- **Course planning:** take prerequisites first — the classic [course schedule problem](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem).
- **Deriving an unknown order from examples:** the [Alien Dictionary](/interview-question/alien-dictionary-given-sorted-words-in-an-alien-language-how-do-you-derive-the-c) builds a letter graph and sorts it.
- **Dynamic programming on a DAG:** longest or shortest path in a DAG takes one pass in topological order, because each node is processed after all its predecessors. [Longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force) is this idea on an implicit DAG.

## 6. The Code in Python

~~~python
from collections import deque

def kahn(n, edges):
    """Kahn's algorithm. edges are (u, v) pairs meaning u must come before v."""
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)   # ready to run now
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1            # one dependency of v is now done
            if indegree[v] == 0:
                queue.append(v)
    return order                        # shorter than n means a cycle
~~~

**Why each line is there:**

- \`adj = [[] for _ in range(n)]\` builds n **separate** lists. \`[[]] * n\` would create n references to **one** list, and every \`append\` would show up in every node.
- \`collections.deque\` gives O(1) \`popleft()\`. A plain list with \`pop(0)\` shifts every remaining element, which turns the loop into O(V^2) on large inputs.
- The return value doubles as the cycle test: \`len(order) < n\` means some node never reached in-degree 0.

**The smallest order: \`heapq\`.** Python \`heapq\` is a **min-heap** on a plain list: \`heapq.heappop\` always returns the smallest item. Swapping the deque for a heap gives the lexicographically smallest topological order (Example 2), at O(log V) per push and pop:

~~~python
def kahn_smallest(n, edges):
    """Same algorithm, but a min-heap always releases the smallest ready node."""
    adj, indegree = build(n, edges)
    heap = [i for i in range(n) if indegree[i] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                heapq.heappush(heap, v)
    return order
~~~

**The DFS version and the recursion limit.** Example 3 writes nodes into \`finish\` as they complete and returns \`finish[::-1]\`. It is recursive, and CPython stops recursion at a default limit of 1000 frames (\`sys.getrecursionlimit()\` printed \`1000\` on the Python 3.13 used here), so a dependency chain longer than about 1000 nodes raises \`RecursionError\`. Kahn has no recursion at all, which is one reason it is the safer default in Python. If you need DFS on deep graphs, use an explicit stack — shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

**There is a standard-library version.** Since Python 3.9, \`graphlib.TopologicalSorter\` does this for you ([Python docs: graphlib](https://docs.python.org/3/library/graphlib.html)). You give it a mapping from each node to its **predecessors**, and \`static_order()\` yields a valid order; a cycle raises \`graphlib.CycleError\` (a \`ValueError\` subclass) whose second argument is the cycle. Run on Python 3.13:

~~~python
from graphlib import TopologicalSorter, CycleError

ts = TopologicalSorter({"app": {"lib", "utils"}, "lib": {"utils"}})
print(list(ts.static_order()))
try:
    list(TopologicalSorter({"a": {"b"}, "b": {"a"}}).static_order())
except CycleError as e:
    print(e.args)
~~~

~~~text
['utils', 'lib', 'app']
('nodes are in a cycle', ['a', 'b', 'a'])
~~~

In an interview, mention it, then write Kahn yourself: the interviewer wants to see the algorithm.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn's algorithm on a build graph, then with a cycle** prints:

~~~text
build order: utils -> config -> auth -> db -> api -> web
valid: true
with web -> utils: placed 1 of 6 tasks
never ready: utils, db, auth, api, web
valid: false
empty graph of 3 nodes: [0, 1, 2]
~~~

**Example 2 — The queue picks the order: FIFO vs min-heap, and all 13 orders** prints:

~~~text
FIFO queue order: [4, 5, 2, 0, 3, 1]
min-heap order: [4, 5, 0, 2, 3, 1]
valid orders: 13
  [4, 5, 0, 2, 3, 1]
  [4, 5, 2, 0, 3, 1]
  [4, 5, 2, 3, 0, 1]
  [4, 5, 2, 3, 1, 0]
  [5, 2, 3, 4, 0, 1]
  [5, 2, 3, 4, 1, 0]
  [5, 2, 4, 0, 3, 1]
  [5, 2, 4, 3, 0, 1]
  [5, 2, 4, 3, 1, 0]
  [5, 4, 0, 2, 3, 1]
  [5, 4, 2, 0, 3, 1]
  [5, 4, 2, 3, 0, 1]
  [5, 4, 2, 3, 1, 0]
chain 0->1->2->3: 1 order(s)
4 nodes, no edges: 24 order(s)
~~~

**Example 3 — DFS reverse post-order on the same build graph** prints:

~~~text
finish order: web api db auth utils config
reversed:     config -> utils -> auth -> db -> api -> web
valid: true
with web -> utils: cycle found
~~~

**Reading the output:** Example 1 shows Kahn on the build graph: \`utils\` and \`config\` both start with in-degree 0, and the queue releases them in the order they were added. With the extra edge \`web -> utils\`, only 1 of 6 tasks is placed, and the five \`never ready\` tasks include \`db\`, which is not on the loop itself but sits downstream of it. Example 2 shows that the queue type is the tie-breaker: FIFO gives \`[4, 5, 2, 0, 3, 1]\`, the min-heap gives the lexicographically smallest order \`[4, 5, 0, 2, 3, 1]\`, and both appear in the full list of 13 valid orders. Example 3 is the DFS version on the same build graph: a different valid order (\`config\` first), and the same cycle verdict.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kahn with a FIFO queue | O(V + E) | O(V + E) | each node is queued once, each edge decremented once; the adjacency list holds E entries |
| Kahn with a min-heap | O(V log V + E) | O(V + E) | each of the V pushes and pops costs O(log V) |
| DFS reverse post-order | O(V + E) | O(V + E) | each node visited once, each edge looked at once; recursion depth up to V |
| Listing every order | O(V! * V) worst case | O(V) | there can be V! orders (no edges at all) |

V is the number of nodes and E the number of edges. Building the adjacency list from the edge list is part of the O(V + E). For "what is Big-O", see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **No edges:** every node has in-degree 0, so any order is valid; Kahn returns them in index order (\`[0, 1, 2]\` in Example 1).
- **Disconnected pieces:** both algorithms handle them — Kahn seeds the queue with every in-degree-0 node, DFS restarts from every unvisited node.
- **Self-loop \`a -> a\`:** a cycle of length 1; \`a\` has in-degree at least 1 forever.
- **Duplicate edges:** Kahn counts the in-degree twice and decrements it twice, so it still works; just do not de-duplicate in one place and not the other.
- **Nodes downstream of a cycle:** they are not on the cycle but are still never placed by Kahn (\`db\` in Example 1).
- **Very deep chains:** recursive DFS uses one stack frame per node on the path; see the language notes below.

## Common Pitfalls

- **Edge direction backwards.** If "a depends on b", the edge is \`b -> a\` (b first). Reversing it produces a perfectly valid order of the wrong graph.
- **\`list.pop(0)\` as a queue.** It is O(n) per call; use \`collections.deque.popleft()\`.
- **\`[[]] * n\` for the adjacency list.** All n entries are the same list object; use a comprehension.
- **Forgetting the cycle check.** Kahn silently returns a partial list on a cycle; compare \`len(order)\` with \`n\` before using it.
- **Recursive DFS on long chains.** The default recursion limit is 1000; raising it with \`sys.setrecursionlimit\` can crash the interpreter on a real stack overflow. Prefer Kahn or an explicit stack.
- **Assuming one answer.** Many orders are valid; if a test expects a specific one, use \`heapq\` or ask which tie-break rule they want.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A topological order lists every node so each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u -&gt; v</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> first. It exists only for a DAG, and there are usually many.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees, put every in-degree-0 node in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>, pop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code>, append to the output, decrement each neighbour and enqueue it when it hits 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle check:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(order) &lt; n</code>, some nodes never became ready: there is a cycle and no order exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DFS alternative:</strong> <span style="color:#f0e2c8;">Append each node when it finishes, then reverse; a GRAY neighbour means a cycle. Mind Python recursion limit of 1000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and uses:</strong> <span style="color:#f0e2c8;">O(V + E) time and space. Build order, package installs, spreadsheets, course prerequisites, DP on a DAG.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the lexicographically smallest order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap the deque for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>: push ready nodes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappop</code> the smallest. Cost becomes O(V log V + E). Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 0, 2, 3, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know the order is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Kahn, if the queue ever holds two or more nodes at once, either could go next, so the order is not unique. If the queue never holds more than one node, the order is unique: every neighbouring pair in it is joined by an edge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a library for this in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">graphlib.TopologicalSorter</code> (Python 3.9+): <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static_order()</code> yields an order and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CycleError</code> on a cycle. Mention it, then write Kahn.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just sort the nodes by in-degree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-degree only counts direct arrows. A node with in-degree 1 can depend on a long chain; Kahn works because in-degrees are updated as nodes are removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn or DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(V + E). Kahn avoids recursion and gives the level structure; DFS gives the cycle path easily. In Python, Kahn is safer on deep graphs.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed graph** | nodes joined by one-way arrows |
| **Topological order** | a list of all nodes where every arrow points forward |
| **DAG** | directed acyclic graph: a directed graph with no cycle |
| **Cycle** | a path of arrows that returns to its start |
| **In-degree** | number of arrows pointing into a node |
| **Kahn's algorithm** | queue-based topological sort that removes in-degree-0 nodes |
| **Post-order (finish order)** | the order in which DFS finishes nodes |
| **Reverse post-order** | finish order read backwards; a topological order on a DAG |
| **collections.deque** | double-ended queue with O(1) append and popleft |
| **heapq** | functions that treat a list as a min-heap |

---
**Conclusion:** A topological sort lists the nodes of a directed graph so that every arrow points forward, and it exists exactly when the graph has no cycle. Kahn's algorithm peels off in-degree-0 nodes with a queue; DFS writes nodes down as they finish and reverses the list; both run in O(V + E) and both report a cycle when they cannot place every node. Reach for it whenever a problem talks about dependencies, prerequisites or build order. In Python, use \`collections.deque\` for the queue, \`heapq\` when the smallest order is required, avoid deep recursion, and know that \`graphlib.TopologicalSorter\` exists.`,
        examples: [
          { label: `Kahn's algorithm on a build graph, then with a cycle`, code: `from collections import deque


def kahn(n, edges):
    """Kahn's algorithm. edges are (u, v) pairs meaning u must come before v."""
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)   # ready to run now
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1            # one dependency of v is now done
            if indegree[v] == 0:
                queue.append(v)
    return order                        # shorter than n means a cycle


def is_valid(order, n, edges):
    if len(order) != n:
        return False
    pos = [0] * n
    for i, node in enumerate(order):
        pos[node] = i
    return all(pos[u] < pos[v] for u, v in edges)


tasks = ["utils", "config", "db", "auth", "api", "web"]
deps = [(0, 2), (1, 2), (0, 3), (2, 4), (3, 4), (4, 5)]

order = kahn(len(tasks), deps)
print("build order: " + " -> ".join(tasks[i] for i in order))
print("valid: " + str(is_valid(order, len(tasks), deps)).lower())

cyclic = deps + [(5, 0)]                # web now also needed by utils
order = kahn(len(tasks), cyclic)
print("with web -> utils: placed " + str(len(order)) + " of " + str(len(tasks)) + " tasks")
stuck = [tasks[i] for i in range(len(tasks)) if i not in order]
print("never ready: " + ", ".join(stuck))
print("valid: " + str(is_valid(order, len(tasks), cyclic)).lower())

print("empty graph of 3 nodes: " + str(kahn(3, [])))  # empty graph of 3 nodes: [0, 1, 2]` },
          { label: `The queue picks the order: FIFO vs min-heap, and all 13 orders`, code: `import heapq
from collections import deque


def build(n, edges):
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1
    return adj, indegree


def kahn_fifo(n, edges):
    adj, indegree = build(n, edges)
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return order


def kahn_smallest(n, edges):
    """Same algorithm, but a min-heap always releases the smallest ready node."""
    adj, indegree = build(n, edges)
    heap = [i for i in range(n) if indegree[i] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                heapq.heappush(heap, v)
    return order


def all_orders(n, edges):
    """Backtracking: try every ready node at every step (exponential, small n only)."""
    adj, indegree = build(n, edges)
    used = [False] * n
    path, out = [], []

    def go():
        if len(path) == n:
            out.append(list(path))
            return
        for u in range(n):
            if not used[u] and indegree[u] == 0:
                used[u] = True
                path.append(u)
                for v in adj[u]:
                    indegree[v] -= 1
                go()
                for v in adj[u]:
                    indegree[v] += 1
                path.pop()
                used[u] = False

    go()
    return out


edges = [(5, 2), (5, 0), (4, 0), (4, 1), (2, 3), (3, 1)]
print("FIFO queue order: " + str(kahn_fifo(6, edges)))  # FIFO queue order: [4, 5, 2, 0, 3, 1]
print("min-heap order: " + str(kahn_smallest(6, edges)))  # min-heap order: [4, 5, 0, 2, 3, 1]
orders = all_orders(6, edges)
print("valid orders: " + str(len(orders)))
for o in orders:
    print("  " + str(o))
print("chain 0->1->2->3: " + str(len(all_orders(4, [(0, 1), (1, 2), (2, 3)]))) + " order(s)")
print("4 nodes, no edges: " + str(len(all_orders(4, []))) + " order(s)")` },
          { label: `DFS reverse post-order on the same build graph`, code: `WHITE, GRAY, BLACK = 0, 1, 2      # unvisited, on the current path, finished


def dfs_topo(n, edges):
    """Reverse post-order DFS. Returns (order, finish_order), or (None, finish) on a cycle."""
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    color = [WHITE] * n
    finish = []

    def visit(u):
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:          # back edge: v is still on the path
                return False
            if color[v] == WHITE and not visit(v):
                return False
        color[u] = BLACK
        finish.append(u)                  # u finishes after everything it points to
        return True

    for s in range(n):
        if color[s] == WHITE and not visit(s):
            return None, finish
    return finish[::-1], finish


def is_valid(order, n, edges):
    pos = [0] * n
    for i, node in enumerate(order):
        pos[node] = i
    return len(order) == n and all(pos[u] < pos[v] for u, v in edges)


tasks = ["utils", "config", "db", "auth", "api", "web"]
deps = [(0, 2), (1, 2), (0, 3), (2, 4), (3, 4), (4, 5)]

order, finish = dfs_topo(len(tasks), deps)
print("finish order: " + " ".join(tasks[i] for i in finish))
print("reversed:     " + " -> ".join(tasks[i] for i in order))
print("valid: " + str(is_valid(order, len(tasks), deps)).lower())

order, finish = dfs_topo(len(tasks), deps + [(5, 0)])
print("with web -> utils: " + ("cycle found" if order is None else "no cycle"))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a topological sort, and when would you use one? Walk me through an algorithm for it and code it in JavaScript."

**What a strong answer should cover:**
- A topological order lists every node so that each edge u -> v has u before v; it exists only for a DAG (no cycles), and it is usually not unique.
- Kahn's algorithm: in-degrees, a queue of in-degree-0 nodes, decrement neighbours; fewer than n nodes placed means a cycle.
- The DFS alternative: reverse post-order, with three colours to catch a back edge.
- O(V + E) time and space for both, and real uses: build order, package installs, spreadsheets, course prerequisites, DP on a DAG.
- JavaScript specifics: an array plus a head index as the queue (\`shift()\` re-indexes the array), \`Array.from({ length: n }, () => [])\` rather than \`fill([])\` for adjacency lists, no built-in heap, and the call-stack limit for deep recursive DFS.

**Code / implementation expected:** Yes — a \`kahn(n, edges)\` function in JavaScript that returns an order or signals a cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think about getting dressed in the morning. Socks go on before shoes. Underwear goes on before trousers. Trousers go on before shoes and before the belt. A shirt goes on before a tie. Nobody writes this down, but there are rules: **some things must happen before other things**. Some pairs have no rule at all — you can put on your watch whenever you like.

Now imagine a computer has to do the same thing for 50,000 jobs: compile these files before linking that program, install this package before that one, recalculate cell B2 before cell C7 because C7 uses B2. It needs **one list** of all the jobs in an order that never breaks a rule. That list is a **topological order**, and the procedure that produces it is a **topological sort**.

There is one way to make it impossible: a loop of rules. If shoes must go on before socks *and* socks before shoes, no order works. So every topological sort also answers a second question for free: *is there a loop in these rules?*

## 2. The Core Idea

📌 **Interview term: Directed graph** — a set of nodes (here: tasks) joined by one-way arrows (edges). An arrow \`u -> v\` means "u must happen before v". If graphs are new to you, start with [what a graph is and how to store one](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Topological order** — a list of **all** the nodes such that for **every** edge \`u -> v\`, \`u\` appears earlier in the list than \`v\`. Topological sort is the algorithm that finds one.

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycle. A topological order exists **exactly when** the graph is a DAG. If there is a cycle, the first node of the cycle in any list would need some other cycle node before it, which is impossible.

Here is a small software build. Each box is a module; each arrow means "build this first". The number under each name is its **in-degree** — how many arrows point into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 300" role="img" aria-label="Build graph: utils points to auth and db, config points to db, auth and db point to api, api points to web">
  <defs>
    <marker id="topo1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="74" text-anchor="middle">utils</text>
  <text class="d-sub" x="90" y="94" text-anchor="middle">in-degree 0</text>
  <rect class="d-box-accent" x="30" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="234" text-anchor="middle">config</text>
  <text class="d-sub" x="90" y="254" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="250" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">auth</text>
  <text class="d-sub" x="310" y="94" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="250" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="234" text-anchor="middle">db</text>
  <text class="d-sub" x="310" y="254" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="450" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="510" y="154" text-anchor="middle">api</text>
  <text class="d-sub" x="510" y="174" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="630" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="690" y="154" text-anchor="middle">web</text>
  <text class="d-sub" x="690" y="174" text-anchor="middle">in-degree 1</text>
  <path class="d-edge" d="M 150 77 L 244 77" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 100 L 246 214" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 237 L 244 237" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 90 L 446 140" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 224 L 446 174" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 570 157 L 624 157" marker-end="url(#topo1-arrow)"/>
</svg>

\`utils\` and \`config\` (highlighted) depend on nothing, so either can go first. \`utils -> config -> auth -> db -> api -> web\` is a valid order, and so is \`config -> utils -> auth -> db -> api -> web\`. Both are printed by the examples below.

**Topological orders are usually not unique.** Whenever two tasks have no path between them, either can go first. For the classic six-node graph in Example 2, there are **13** valid orders; a straight chain has exactly 1; four nodes with no edges have 4! = 24. When an interviewer wants one specific answer (often "the lexicographically smallest"), you change a single data structure, as shown below.

📌 **Interview term: Cycle** — a path of arrows that comes back to where it started, like \`a -> b -> c -> a\`. A self-loop \`a -> a\` is the shortest cycle. Finding one is its own question: [how to detect a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 520 250" role="img" aria-label="A cycle of three tasks a b c where every task has in-degree 1, so no task can start">
  <defs>
    <marker id="topo2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="120" height="54" rx="8"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">a</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="40" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="100" y="194" text-anchor="middle">c</text>
  <text class="d-sub" x="100" y="214" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="360" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">b</text>
  <text class="d-sub" x="420" y="214" text-anchor="middle">in-degree 1</text>
  <path class="d-edge-accent" d="M 320 60 L 396 164" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 356 197 L 166 197" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 124 166 L 200 62" marker-end="url(#topo2-arrow)"/>
</svg>

In a cycle every node waits for another node in the same cycle, so no node ever reaches in-degree 0 and nothing can start. That is exactly how the algorithms below notice the cycle.

## 3. Algorithm 1 — Kahn's Algorithm (peel off what is ready)

📌 **Interview term: In-degree** — the number of edges pointing **into** a node: how many things it is still waiting for.

📌 **Interview term: Kahn's algorithm** — the queue-based topological sort (described by A. B. Kahn in a 1962 Communications of the ACM paper, per [Wikipedia: Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)). It is a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)-style loop:

1. Count the in-degree of every node.
2. Put every node with in-degree 0 into a queue — these are ready now.
3. Repeatedly take a node from the queue, append it to the output, and "remove" its outgoing edges by decrementing each neighbour in-degree. Any neighbour that drops to 0 joins the queue.
4. If the output has all n nodes, it is a topological order. If it is shorter, the missing nodes are stuck behind a cycle.

Here is the trace on the build graph (tasks numbered utils=0, config=1, db=2, auth=3, api=4, web=5):

| Step | Take from queue | In-degrees that drop | Queue after |
| :--- | :--- | :--- | :--- |
| start | — | — | utils, config |
| 1 | utils | auth 1 to 0, db 2 to 1 | config, auth |
| 2 | config | db 1 to 0 | auth, db |
| 3 | auth | api 2 to 1 | db |
| 4 | db | api 1 to 0 | api |
| 5 | api | web 1 to 0 | web |
| 6 | web | — | empty |

Six nodes placed, so the order \`utils, config, auth, db, api, web\` is valid. Add one more edge \`web -> utils\` and \`utils\` now has in-degree 1: only \`config\` starts, it lowers \`db\` to 1, and the queue runs dry after **1 of 6** tasks. That is the cycle signal (Example 1 prints it).

## 4. Algorithm 2 — DFS and Reverse Post-Order

📌 **Interview term: Post-order (finish order)** — in a depth-first search, a node "finishes" when every node reachable from it has been fully explored. The finish order lists nodes in the order they finish.

📌 **Interview term: Reverse post-order** — the finish order read backwards. On a DAG it is always a topological order.

**Why it works.** When DFS finishes \`u\`, everything \`u\` points to has already finished (DFS explored it first, or it was already done). So in the finish list, every arrow points **backwards**: \`v\` is written before \`u\`. Reversing the list makes every arrow point forwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Finish order web api db auth utils config, and the same list reversed gives config utils auth db api web">
  <defs>
    <marker id="topo3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="28">finish order, first to finish on the left</text>
  <rect class="d-box-muted" x="30" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">web</text>
  <rect class="d-box-muted" x="150" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">api</text>
  <rect class="d-box-muted" x="270" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="70" text-anchor="middle">db</text>
  <rect class="d-box-muted" x="390" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">auth</text>
  <rect class="d-box-muted" x="510" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">utils</text>
  <rect class="d-box-muted" x="630" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">config</text>
  <path class="d-edge-dashed" d="M 380 98 L 380 150" marker-end="url(#topo3-arrow)"/>
  <text class="d-sub" x="400" y="130">reverse</text>
  <text class="d-sub" x="30" y="160">topological order</text>
  <rect class="d-box-accent" x="30" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="200" text-anchor="middle">config</text>
  <rect class="d-box-accent" x="150" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="200" text-anchor="middle">utils</text>
  <rect class="d-box-accent" x="270" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="200" text-anchor="middle">auth</text>
  <rect class="d-box-accent" x="390" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="200" text-anchor="middle">db</text>
  <rect class="d-box-accent" x="510" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="200" text-anchor="middle">api</text>
  <rect class="d-box-accent" x="630" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="200" text-anchor="middle">web</text>
</svg>

DFS started at \`utils\` and went \`utils -> db -> api -> web\`, so \`web\` finished first. The DFS version detects cycles with three colours (unvisited, on the current path, finished): an edge into a node that is still on the current path is a cycle. Which of the two algorithms to pick, and why, is the subject of [Kahn vs DFS for Course Schedule](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 5. When Is It Used?

Reach for topological sort whenever a problem says **"depends on", "prerequisite", "before/after", "build order", "schedule"** on one-way relationships:

- **Build systems and compilers:** compile modules after the modules they import.
- **Package managers:** install dependencies before the packages that need them.
- **Spreadsheets:** recompute a cell only after the cells its formula reads.
- **Course planning:** take prerequisites first — the classic [course schedule problem](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem).
- **Deriving an unknown order from examples:** the [Alien Dictionary](/interview-question/alien-dictionary-given-sorted-words-in-an-alien-language-how-do-you-derive-the-c) builds a letter graph and sorts it.
- **Dynamic programming on a DAG:** longest or shortest path in a DAG takes one pass in topological order, because each node is processed after all its predecessors. [Longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force) is this idea on an implicit DAG.

## 6. The Code in JavaScript

~~~javascript
function kahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [u, v] of edges) {
    adj[u].push(v);
    indegree[v]++;
  }
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i); // ready now
  let head = 0;                       // read pointer: avoids O(n) queue.shift()
  const order = [];
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      indegree[v]--;                  // one dependency of v is now done
      if (indegree[v] === 0) queue.push(v);
    }
  }
  return order;                       // shorter than n means a cycle
}
~~~

**Why each line is there:**

- \`Array.from({ length: n }, () => [])\` calls the arrow function once per slot, so each node gets its **own** array. \`new Array(n).fill([])\` puts the **same** array in every slot; pushing to one shows up in all of them (in Node, \`a = new Array(3).fill([]); a[0].push(7)\` gives \`[[7],[7],[7]]\`).
- JavaScript has no queue type. \`queue.shift()\` works, but the ECMAScript specification defines it as moving every remaining element down one slot, so the loop can degrade to O(V^2). A plain array plus a \`head\` read index is O(1) per pop.
- \`for (const [u, v] of edges)\` destructures each pair; \`indegree[v]++\` works because the array is filled with numbers, not \`undefined\`.
- The return value doubles as the cycle test: \`order.length < n\` means some node never reached in-degree 0.

**The smallest order needs your own heap.** JavaScript has no priority queue in the standard library, so Example 2 includes a 30-line binary \`MinHeap\`. Replacing the FIFO queue with it gives the lexicographically smallest topological order:

~~~javascript
function kahnSmallest(n, edges) {
  const { adj, indegree } = build(n, edges);
  const heap = new MinHeap();
  for (let i = 0; i < n; i++) if (indegree[i] === 0) heap.push(i);
  const order = [];
  while (heap.size > 0) {
    const u = heap.pop();
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) heap.push(v);
  }
  return order;
}
~~~

Do not "fake" a heap with \`array.sort()\` and no comparator: the default sort compares values as **strings**, so \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`.

**The DFS version and the call stack.** Example 3 pushes nodes into \`finish\` as they complete and reverses it. It is recursive, and every engine has a call-stack limit: on Node 22 here, a 200,000-node chain made the recursive version throw \`RangeError: Maximum call stack size exceeded\`. The exact depth depends on the engine and on frame size, so do not quote a number. Kahn has no recursion, which makes it the safer default; an explicit-stack DFS is shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (they use only \`console.log\`, so they also run in the browser runner on this page). The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn's algorithm on a build graph, then with a cycle** prints:

~~~text
build order: utils -> config -> auth -> db -> api -> web
valid: true
with web -> utils: placed 1 of 6 tasks
never ready: utils, db, auth, api, web
valid: false
empty graph of 3 nodes: [0, 1, 2]
~~~

**Example 2 — The queue picks the order: FIFO vs min-heap, and all 13 orders** prints:

~~~text
FIFO queue order: [4, 5, 2, 0, 3, 1]
min-heap order: [4, 5, 0, 2, 3, 1]
valid orders: 13
  [4, 5, 0, 2, 3, 1]
  [4, 5, 2, 0, 3, 1]
  [4, 5, 2, 3, 0, 1]
  [4, 5, 2, 3, 1, 0]
  [5, 2, 3, 4, 0, 1]
  [5, 2, 3, 4, 1, 0]
  [5, 2, 4, 0, 3, 1]
  [5, 2, 4, 3, 0, 1]
  [5, 2, 4, 3, 1, 0]
  [5, 4, 0, 2, 3, 1]
  [5, 4, 2, 0, 3, 1]
  [5, 4, 2, 3, 0, 1]
  [5, 4, 2, 3, 1, 0]
chain 0->1->2->3: 1 order(s)
4 nodes, no edges: 24 order(s)
~~~

**Example 3 — DFS reverse post-order on the same build graph** prints:

~~~text
finish order: web api db auth utils config
reversed:     config -> utils -> auth -> db -> api -> web
valid: true
with web -> utils: cycle found
~~~

**Reading the output:** Example 1 shows Kahn on the build graph: \`utils\` and \`config\` both start with in-degree 0, and the queue releases them in the order they were added. With the extra edge \`web -> utils\`, only 1 of 6 tasks is placed, and the five \`never ready\` tasks include \`db\`, which is not on the loop itself but sits downstream of it. Example 2 shows that the queue type is the tie-breaker: FIFO gives \`[4, 5, 2, 0, 3, 1]\`, the min-heap gives the lexicographically smallest order \`[4, 5, 0, 2, 3, 1]\`, and both appear in the full list of 13 valid orders. Example 3 is the DFS version on the same build graph: a different valid order (\`config\` first), and the same cycle verdict.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kahn with a FIFO queue | O(V + E) | O(V + E) | each node is queued once, each edge decremented once; the adjacency list holds E entries |
| Kahn with a min-heap | O(V log V + E) | O(V + E) | each of the V pushes and pops costs O(log V) |
| DFS reverse post-order | O(V + E) | O(V + E) | each node visited once, each edge looked at once; recursion depth up to V |
| Listing every order | O(V! * V) worst case | O(V) | there can be V! orders (no edges at all) |

V is the number of nodes and E the number of edges. Building the adjacency list from the edge list is part of the O(V + E). For "what is Big-O", see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **No edges:** every node has in-degree 0, so any order is valid; Kahn returns them in index order (\`[0, 1, 2]\` in Example 1).
- **Disconnected pieces:** both algorithms handle them — Kahn seeds the queue with every in-degree-0 node, DFS restarts from every unvisited node.
- **Self-loop \`a -> a\`:** a cycle of length 1; \`a\` has in-degree at least 1 forever.
- **Duplicate edges:** Kahn counts the in-degree twice and decrements it twice, so it still works; just do not de-duplicate in one place and not the other.
- **Nodes downstream of a cycle:** they are not on the cycle but are still never placed by Kahn (\`db\` in Example 1).
- **Very deep chains:** recursive DFS uses one stack frame per node on the path; see the language notes below.

## Common Pitfalls

- **Edge direction backwards.** If "a depends on b", the edge is \`b -> a\` (b first). Reversing it produces a perfectly valid order of the wrong graph.
- **\`queue.shift()\` in a hot loop.** It re-indexes the array; use a head pointer.
- **\`new Array(n).fill([])\`.** Every slot shares one array; use \`Array.from({ length: n }, () => [])\`.
- **Forgetting the cycle check.** Kahn silently returns a partial list on a cycle; compare \`order.length\` with \`n\` before using it.
- **Default \`sort()\` on numbers.** It sorts as strings (\`[1, 10, 9]\`); pass \`(a, b) => a - b\` or use a real heap.
- **Recursive DFS on long chains.** It throws \`RangeError\` once the call stack is exhausted; prefer Kahn or an explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A topological order lists every node so each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u -&gt; v</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> first. It exists only for a DAG, and there are usually many.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees, push every in-degree-0 node into an array, read it with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, decrement each neighbour and push it when it hits 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle check:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.length &lt; n</code>, some nodes never became ready: there is a cycle and no order exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DFS alternative:</strong> <span style="color:#f0e2c8;">Push each node when it finishes, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code>; a GRAY neighbour means a cycle. Deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and uses:</strong> <span style="color:#f0e2c8;">O(V + E) time and space. Build order, package installs, spreadsheets, course prerequisites, DP on a DAG.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the lexicographically smallest order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a min-heap instead of the FIFO queue. JavaScript has none built in, so write a small binary heap; cost becomes O(V log V + E). Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 5, 0, 2, 3, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.shift()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It moves every remaining element down by one, so a loop of V shifts can cost O(V^2). A head index keeps each pop O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know the order is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds two or more ready nodes at once, either could go next, so the order is not unique.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if node ids are strings, like package names?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from name to neighbour list and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for in-degrees, or map names to indices first. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps insertion order, so the output is deterministic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn or DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(V + E). Kahn avoids recursion and gives levels; DFS gives the cycle path easily. On deep graphs in JavaScript, Kahn is safer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed graph** | nodes joined by one-way arrows |
| **Topological order** | a list of all nodes where every arrow points forward |
| **DAG** | directed acyclic graph: a directed graph with no cycle |
| **Cycle** | a path of arrows that returns to its start |
| **In-degree** | number of arrows pointing into a node |
| **Kahn's algorithm** | queue-based topological sort that removes in-degree-0 nodes |
| **Post-order (finish order)** | the order in which DFS finishes nodes |
| **Reverse post-order** | finish order read backwards; a topological order on a DAG |
| **Head index** | a read pointer that turns an array into an O(1) queue |
| **Min-heap** | a tree in an array whose root is always the smallest value |

---
**Conclusion:** A topological sort lists the nodes of a directed graph so that every arrow points forward, and it exists exactly when the graph has no cycle. Kahn's algorithm peels off in-degree-0 nodes with a queue; DFS writes nodes down as they finish and reverses the list; both run in O(V + E) and both report a cycle when they cannot place every node. Reach for it whenever a problem talks about dependencies, prerequisites or build order. In JavaScript, use an array with a head index as the queue, build adjacency lists with \`Array.from\`, bring your own heap for the smallest order, and avoid deep recursion.`,
        examples: [
          { label: `Kahn's algorithm on a build graph, then with a cycle`, code: `// Kahn's algorithm. edges are [u, v] pairs meaning u must come before v.
function kahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [u, v] of edges) {
    adj[u].push(v);
    indegree[v]++;
  }
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i); // ready now
  let head = 0;                       // read pointer: avoids O(n) queue.shift()
  const order = [];
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      indegree[v]--;                  // one dependency of v is now done
      if (indegree[v] === 0) queue.push(v);
    }
  }
  return order;                       // shorter than n means a cycle
}

function isValid(order, n, edges) {
  if (order.length !== n) return false;
  const pos = new Array(n).fill(0);
  order.forEach((node, i) => { pos[node] = i; });
  return edges.every(([u, v]) => pos[u] < pos[v]);
}

const fmt = (a) => '[' + a.join(', ') + ']';

const tasks = ['utils', 'config', 'db', 'auth', 'api', 'web'];
const deps = [[0, 2], [1, 2], [0, 3], [2, 4], [3, 4], [4, 5]];

let order = kahn(tasks.length, deps);
console.log('build order: ' + order.map((i) => tasks[i]).join(' -> '));
console.log('valid: ' + isValid(order, tasks.length, deps));

const cyclic = deps.concat([[5, 0]]); // web now also needed by utils
order = kahn(tasks.length, cyclic);
console.log('with web -> utils: placed ' + order.length + ' of ' + tasks.length + ' tasks');
const stuck = tasks.filter((_, i) => !order.includes(i));
console.log('never ready: ' + stuck.join(', '));
console.log('valid: ' + isValid(order, tasks.length, cyclic));

console.log('empty graph of 3 nodes: ' + fmt(kahn(3, []))); // empty graph of 3 nodes: [0, 1, 2]` },
          { label: `The queue picks the order: FIFO vs min-heap, and all 13 orders`, code: `// JavaScript has no built-in heap, so here is a small binary min-heap of numbers.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
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
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function build(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); indegree[v]++; }
  return { adj, indegree };
}

function kahnFifo(n, edges) {
  const { adj, indegree } = build(n, edges);
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) queue.push(v);
  }
  return order;
}

// Same algorithm, but a min-heap always releases the smallest ready node.
function kahnSmallest(n, edges) {
  const { adj, indegree } = build(n, edges);
  const heap = new MinHeap();
  for (let i = 0; i < n; i++) if (indegree[i] === 0) heap.push(i);
  const order = [];
  while (heap.size > 0) {
    const u = heap.pop();
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) heap.push(v);
  }
  return order;
}

// Backtracking: try every ready node at every step (exponential, small n only).
function allOrders(n, edges) {
  const { adj, indegree } = build(n, edges);
  const used = new Array(n).fill(false);
  const path = [], out = [];
  function go() {
    if (path.length === n) { out.push(path.slice()); return; }
    for (let u = 0; u < n; u++) {
      if (used[u] || indegree[u] !== 0) continue;
      used[u] = true; path.push(u);
      for (const v of adj[u]) indegree[v]--;
      go();
      for (const v of adj[u]) indegree[v]++;
      path.pop(); used[u] = false;
    }
  }
  go();
  return out;
}

const fmt = (a) => '[' + a.join(', ') + ']';
const edges = [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]];
console.log('FIFO queue order: ' + fmt(kahnFifo(6, edges))); // FIFO queue order: [4, 5, 2, 0, 3, 1]
console.log('min-heap order: ' + fmt(kahnSmallest(6, edges))); // min-heap order: [4, 5, 0, 2, 3, 1]
const orders = allOrders(6, edges);
console.log('valid orders: ' + orders.length);
for (const o of orders) console.log('  ' + fmt(o));
console.log('chain 0->1->2->3: ' + allOrders(4, [[0, 1], [1, 2], [2, 3]]).length + ' order(s)');
console.log('4 nodes, no edges: ' + allOrders(4, []).length + ' order(s)');` },
          { label: `DFS reverse post-order on the same build graph`, code: `const WHITE = 0, GRAY = 1, BLACK = 2; // unvisited, on the current path, finished

// Reverse post-order DFS. Returns { order, finish }; order is null on a cycle.
function dfsTopo(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  const color = new Array(n).fill(WHITE);
  const finish = [];

  function visit(u) {
    color[u] = GRAY;
    for (const v of adj[u]) {
      if (color[v] === GRAY) return false;            // back edge: v is still on the path
      if (color[v] === WHITE && !visit(v)) return false;
    }
    color[u] = BLACK;
    finish.push(u);                                   // u finishes after everything it points to
    return true;
  }

  for (let s = 0; s < n; s++) {
    if (color[s] === WHITE && !visit(s)) return { order: null, finish };
  }
  return { order: finish.slice().reverse(), finish };
}

function isValid(order, n, edges) {
  const pos = new Array(n).fill(0);
  order.forEach((node, i) => { pos[node] = i; });
  return order.length === n && edges.every(([u, v]) => pos[u] < pos[v]);
}

const tasks = ['utils', 'config', 'db', 'auth', 'api', 'web'];
const deps = [[0, 2], [1, 2], [0, 3], [2, 4], [3, 4], [4, 5]];

let r = dfsTopo(tasks.length, deps);
console.log('finish order: ' + r.finish.map((i) => tasks[i]).join(' '));
console.log('reversed:     ' + r.order.map((i) => tasks[i]).join(' -> '));
console.log('valid: ' + isValid(r.order, tasks.length, deps));

r = dfsTopo(tasks.length, deps.concat([[5, 0]]));
console.log('with web -> utils: ' + (r.order === null ? 'cycle found' : 'no cycle'));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a topological sort, and when would you use one? Walk me through an algorithm for it and code it in Java."

**What a strong answer should cover:**
- A topological order lists every node so that each edge u -> v has u before v; it exists only for a DAG (no cycles), and it is usually not unique.
- Kahn's algorithm: in-degrees, a queue of in-degree-0 nodes, decrement neighbours; fewer than n nodes placed means a cycle.
- The DFS alternative: reverse post-order, with three colours to catch a back edge.
- O(V + E) time and space for both, and real uses: build order, package installs, spreadsheets, course prerequisites, DP on a DAG.
- Java specifics: \`List<List<Integer>>\` adjacency, \`ArrayDeque\` as the FIFO queue and \`PriorityQueue\` (a min-heap) for the smallest order, \`int[]\` in-degrees, and \`StackOverflowError\` for deep recursive DFS.

**Code / implementation expected:** Yes — a \`kahn(int n, int[][] edges)\` method in Java that returns an order or signals a cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think about getting dressed in the morning. Socks go on before shoes. Underwear goes on before trousers. Trousers go on before shoes and before the belt. A shirt goes on before a tie. Nobody writes this down, but there are rules: **some things must happen before other things**. Some pairs have no rule at all — you can put on your watch whenever you like.

Now imagine a computer has to do the same thing for 50,000 jobs: compile these files before linking that program, install this package before that one, recalculate cell B2 before cell C7 because C7 uses B2. It needs **one list** of all the jobs in an order that never breaks a rule. That list is a **topological order**, and the procedure that produces it is a **topological sort**.

There is one way to make it impossible: a loop of rules. If shoes must go on before socks *and* socks before shoes, no order works. So every topological sort also answers a second question for free: *is there a loop in these rules?*

## 2. The Core Idea

📌 **Interview term: Directed graph** — a set of nodes (here: tasks) joined by one-way arrows (edges). An arrow \`u -> v\` means "u must happen before v". If graphs are new to you, start with [what a graph is and how to store one](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Topological order** — a list of **all** the nodes such that for **every** edge \`u -> v\`, \`u\` appears earlier in the list than \`v\`. Topological sort is the algorithm that finds one.

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycle. A topological order exists **exactly when** the graph is a DAG. If there is a cycle, the first node of the cycle in any list would need some other cycle node before it, which is impossible.

Here is a small software build. Each box is a module; each arrow means "build this first". The number under each name is its **in-degree** — how many arrows point into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 300" role="img" aria-label="Build graph: utils points to auth and db, config points to db, auth and db point to api, api points to web">
  <defs>
    <marker id="topo1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="74" text-anchor="middle">utils</text>
  <text class="d-sub" x="90" y="94" text-anchor="middle">in-degree 0</text>
  <rect class="d-box-accent" x="30" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="234" text-anchor="middle">config</text>
  <text class="d-sub" x="90" y="254" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="250" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">auth</text>
  <text class="d-sub" x="310" y="94" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="250" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="234" text-anchor="middle">db</text>
  <text class="d-sub" x="310" y="254" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="450" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="510" y="154" text-anchor="middle">api</text>
  <text class="d-sub" x="510" y="174" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="630" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="690" y="154" text-anchor="middle">web</text>
  <text class="d-sub" x="690" y="174" text-anchor="middle">in-degree 1</text>
  <path class="d-edge" d="M 150 77 L 244 77" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 100 L 246 214" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 237 L 244 237" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 90 L 446 140" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 224 L 446 174" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 570 157 L 624 157" marker-end="url(#topo1-arrow)"/>
</svg>

\`utils\` and \`config\` (highlighted) depend on nothing, so either can go first. \`utils -> config -> auth -> db -> api -> web\` is a valid order, and so is \`config -> utils -> auth -> db -> api -> web\`. Both are printed by the examples below.

**Topological orders are usually not unique.** Whenever two tasks have no path between them, either can go first. For the classic six-node graph in Example 2, there are **13** valid orders; a straight chain has exactly 1; four nodes with no edges have 4! = 24. When an interviewer wants one specific answer (often "the lexicographically smallest"), you change a single data structure, as shown below.

📌 **Interview term: Cycle** — a path of arrows that comes back to where it started, like \`a -> b -> c -> a\`. A self-loop \`a -> a\` is the shortest cycle. Finding one is its own question: [how to detect a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 520 250" role="img" aria-label="A cycle of three tasks a b c where every task has in-degree 1, so no task can start">
  <defs>
    <marker id="topo2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="120" height="54" rx="8"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">a</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="40" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="100" y="194" text-anchor="middle">c</text>
  <text class="d-sub" x="100" y="214" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="360" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">b</text>
  <text class="d-sub" x="420" y="214" text-anchor="middle">in-degree 1</text>
  <path class="d-edge-accent" d="M 320 60 L 396 164" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 356 197 L 166 197" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 124 166 L 200 62" marker-end="url(#topo2-arrow)"/>
</svg>

In a cycle every node waits for another node in the same cycle, so no node ever reaches in-degree 0 and nothing can start. That is exactly how the algorithms below notice the cycle.

## 3. Algorithm 1 — Kahn's Algorithm (peel off what is ready)

📌 **Interview term: In-degree** — the number of edges pointing **into** a node: how many things it is still waiting for.

📌 **Interview term: Kahn's algorithm** — the queue-based topological sort (described by A. B. Kahn in a 1962 Communications of the ACM paper, per [Wikipedia: Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)). It is a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)-style loop:

1. Count the in-degree of every node.
2. Put every node with in-degree 0 into a queue — these are ready now.
3. Repeatedly take a node from the queue, append it to the output, and "remove" its outgoing edges by decrementing each neighbour in-degree. Any neighbour that drops to 0 joins the queue.
4. If the output has all n nodes, it is a topological order. If it is shorter, the missing nodes are stuck behind a cycle.

Here is the trace on the build graph (tasks numbered utils=0, config=1, db=2, auth=3, api=4, web=5):

| Step | Take from queue | In-degrees that drop | Queue after |
| :--- | :--- | :--- | :--- |
| start | — | — | utils, config |
| 1 | utils | auth 1 to 0, db 2 to 1 | config, auth |
| 2 | config | db 1 to 0 | auth, db |
| 3 | auth | api 2 to 1 | db |
| 4 | db | api 1 to 0 | api |
| 5 | api | web 1 to 0 | web |
| 6 | web | — | empty |

Six nodes placed, so the order \`utils, config, auth, db, api, web\` is valid. Add one more edge \`web -> utils\` and \`utils\` now has in-degree 1: only \`config\` starts, it lowers \`db\` to 1, and the queue runs dry after **1 of 6** tasks. That is the cycle signal (Example 1 prints it).

## 4. Algorithm 2 — DFS and Reverse Post-Order

📌 **Interview term: Post-order (finish order)** — in a depth-first search, a node "finishes" when every node reachable from it has been fully explored. The finish order lists nodes in the order they finish.

📌 **Interview term: Reverse post-order** — the finish order read backwards. On a DAG it is always a topological order.

**Why it works.** When DFS finishes \`u\`, everything \`u\` points to has already finished (DFS explored it first, or it was already done). So in the finish list, every arrow points **backwards**: \`v\` is written before \`u\`. Reversing the list makes every arrow point forwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Finish order web api db auth utils config, and the same list reversed gives config utils auth db api web">
  <defs>
    <marker id="topo3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="28">finish order, first to finish on the left</text>
  <rect class="d-box-muted" x="30" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">web</text>
  <rect class="d-box-muted" x="150" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">api</text>
  <rect class="d-box-muted" x="270" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="70" text-anchor="middle">db</text>
  <rect class="d-box-muted" x="390" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">auth</text>
  <rect class="d-box-muted" x="510" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">utils</text>
  <rect class="d-box-muted" x="630" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">config</text>
  <path class="d-edge-dashed" d="M 380 98 L 380 150" marker-end="url(#topo3-arrow)"/>
  <text class="d-sub" x="400" y="130">reverse</text>
  <text class="d-sub" x="30" y="160">topological order</text>
  <rect class="d-box-accent" x="30" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="200" text-anchor="middle">config</text>
  <rect class="d-box-accent" x="150" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="200" text-anchor="middle">utils</text>
  <rect class="d-box-accent" x="270" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="200" text-anchor="middle">auth</text>
  <rect class="d-box-accent" x="390" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="200" text-anchor="middle">db</text>
  <rect class="d-box-accent" x="510" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="200" text-anchor="middle">api</text>
  <rect class="d-box-accent" x="630" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="200" text-anchor="middle">web</text>
</svg>

DFS started at \`utils\` and went \`utils -> db -> api -> web\`, so \`web\` finished first. The DFS version detects cycles with three colours (unvisited, on the current path, finished): an edge into a node that is still on the current path is a cycle. Which of the two algorithms to pick, and why, is the subject of [Kahn vs DFS for Course Schedule](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 5. When Is It Used?

Reach for topological sort whenever a problem says **"depends on", "prerequisite", "before/after", "build order", "schedule"** on one-way relationships:

- **Build systems and compilers:** compile modules after the modules they import.
- **Package managers:** install dependencies before the packages that need them.
- **Spreadsheets:** recompute a cell only after the cells its formula reads.
- **Course planning:** take prerequisites first — the classic [course schedule problem](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem).
- **Deriving an unknown order from examples:** the [Alien Dictionary](/interview-question/alien-dictionary-given-sorted-words-in-an-alien-language-how-do-you-derive-the-c) builds a letter graph and sorts it.
- **Dynamic programming on a DAG:** longest or shortest path in a DAG takes one pass in topological order, because each node is processed after all its predecessors. [Longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force) is this idea on an implicit DAG.

## 6. The Code in Java

~~~java
static List<Integer> kahn(int n, int[][] edges) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[n];
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        indegree[e[1]]++;
    }
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i); // ready now
    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int v : adj.get(u)) {
            indegree[v]--;                  // one dependency of v is now done
            if (indegree[v] == 0) queue.add(v);
        }
    }
    return order;                           // shorter than n means a cycle
}
~~~

**Why each line is there:**

- \`List<List<Integer>>\` with one \`new ArrayList<>()\` per node is the usual adjacency list. The in-degrees are a primitive \`int[]\`, which starts at all zeros and avoids boxing on every \`++\`.
- \`ArrayDeque\` is the standard FIFO queue: \`add\` at the tail, \`poll\` from the head, both O(1) amortised. \`poll()\` returns \`null\` on an empty queue, and \`int u = queue.poll()\` would then throw a \`NullPointerException\` while unboxing, which is why the loop checks \`isEmpty()\` first.
- \`List.toString()\` prints \`[0, 1, 2]\`, which is the format every example on this page uses.
- The return value doubles as the cycle test: \`order.size() < n\` means some node never reached in-degree 0.

**The smallest order: \`PriorityQueue\`.** Java \`PriorityQueue\` is a **min-heap** in natural order, so \`poll()\` always returns the smallest ready node. Example 2 passes the queue in as a \`Queue<Integer>\` parameter, so the same method gives the FIFO order with \`new ArrayDeque<>()\` and the lexicographically smallest order with \`new PriorityQueue<>()\`:

~~~java
static List<Integer> kahn(int n, int[][] edges, Queue<Integer> ready) {
    build(n, edges);
    for (int i = 0; i < n; i++) if (indegree[i] == 0) ready.add(i);
    List<Integer> order = new ArrayList<>();
    while (!ready.isEmpty()) {
        int u = ready.poll();
        order.add(u);
        for (int v : adj.get(u)) if (--indegree[v] == 0) ready.add(v);
    }
    return order;
}
~~~

**The DFS version and the thread stack.** Example 3 adds nodes to \`finish\` as they complete and reverses the list with \`Collections.reverse\`. It is recursive, and Java throws \`StackOverflowError\` when the thread stack runs out: on the JDK used here, a recursive DFS on a 200,000-node chain overflowed with the default stack and finished with \`-Xss64m\`. Stack size is a JVM setting you often cannot change in an online judge, so Kahn (no recursion) is the safer default. An explicit-stack DFS is in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

**Small trap in Example 1:** \`order.contains(i)\` is O(n) per call. It is fine for six tasks; for big graphs keep a \`boolean[] placed\` instead.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn's algorithm on a build graph, then with a cycle** prints:

~~~text
build order: utils -> config -> auth -> db -> api -> web
valid: true
with web -> utils: placed 1 of 6 tasks
never ready: utils, db, auth, api, web
valid: false
empty graph of 3 nodes: [0, 1, 2]
~~~

**Example 2 — The queue picks the order: FIFO vs min-heap, and all 13 orders** prints:

~~~text
FIFO queue order: [4, 5, 2, 0, 3, 1]
min-heap order: [4, 5, 0, 2, 3, 1]
valid orders: 13
  [4, 5, 0, 2, 3, 1]
  [4, 5, 2, 0, 3, 1]
  [4, 5, 2, 3, 0, 1]
  [4, 5, 2, 3, 1, 0]
  [5, 2, 3, 4, 0, 1]
  [5, 2, 3, 4, 1, 0]
  [5, 2, 4, 0, 3, 1]
  [5, 2, 4, 3, 0, 1]
  [5, 2, 4, 3, 1, 0]
  [5, 4, 0, 2, 3, 1]
  [5, 4, 2, 0, 3, 1]
  [5, 4, 2, 3, 0, 1]
  [5, 4, 2, 3, 1, 0]
chain 0->1->2->3: 1 order(s)
4 nodes, no edges: 24 order(s)
~~~

**Example 3 — DFS reverse post-order on the same build graph** prints:

~~~text
finish order: web api db auth utils config
reversed:     config -> utils -> auth -> db -> api -> web
valid: true
with web -> utils: cycle found
~~~

**Reading the output:** Example 1 shows Kahn on the build graph: \`utils\` and \`config\` both start with in-degree 0, and the queue releases them in the order they were added. With the extra edge \`web -> utils\`, only 1 of 6 tasks is placed, and the five \`never ready\` tasks include \`db\`, which is not on the loop itself but sits downstream of it. Example 2 shows that the queue type is the tie-breaker: FIFO gives \`[4, 5, 2, 0, 3, 1]\`, the min-heap gives the lexicographically smallest order \`[4, 5, 0, 2, 3, 1]\`, and both appear in the full list of 13 valid orders. Example 3 is the DFS version on the same build graph: a different valid order (\`config\` first), and the same cycle verdict.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kahn with a FIFO queue | O(V + E) | O(V + E) | each node is queued once, each edge decremented once; the adjacency list holds E entries |
| Kahn with a min-heap | O(V log V + E) | O(V + E) | each of the V pushes and pops costs O(log V) |
| DFS reverse post-order | O(V + E) | O(V + E) | each node visited once, each edge looked at once; recursion depth up to V |
| Listing every order | O(V! * V) worst case | O(V) | there can be V! orders (no edges at all) |

V is the number of nodes and E the number of edges. Building the adjacency list from the edge list is part of the O(V + E). For "what is Big-O", see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **No edges:** every node has in-degree 0, so any order is valid; Kahn returns them in index order (\`[0, 1, 2]\` in Example 1).
- **Disconnected pieces:** both algorithms handle them — Kahn seeds the queue with every in-degree-0 node, DFS restarts from every unvisited node.
- **Self-loop \`a -> a\`:** a cycle of length 1; \`a\` has in-degree at least 1 forever.
- **Duplicate edges:** Kahn counts the in-degree twice and decrements it twice, so it still works; just do not de-duplicate in one place and not the other.
- **Nodes downstream of a cycle:** they are not on the cycle but are still never placed by Kahn (\`db\` in Example 1).
- **Very deep chains:** recursive DFS uses one stack frame per node on the path; see the language notes below.

## Common Pitfalls

- **Edge direction backwards.** If "a depends on b", the edge is \`b -> a\` (b first). Reversing it produces a perfectly valid order of the wrong graph.
- **Unboxing \`null\`.** \`int u = queue.poll()\` on an empty \`ArrayDeque\` throws \`NullPointerException\`; loop on \`!queue.isEmpty()\`.
- **\`list.remove(i)\` on a \`List<Integer>\`.** With an \`int\` argument it removes by **index**, not by value; \`List.of(5, 6, 7)\` copied into an \`ArrayList\` becomes \`[5, 7]\` after \`remove(1)\`.
- **Forgetting the cycle check.** Kahn silently returns a partial list on a cycle; compare \`order.size()\` with \`n\`.
- **Comparing boxed \`Integer\`s with \`==\`.** It compares references; \`Integer x = 1000, y = 1000; x == y\` printed \`false\` here. Use \`int\` or \`.equals\`.
- **Recursive DFS on long chains.** \`StackOverflowError\` with the default stack; prefer Kahn or an explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A topological order lists every node so each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u -&gt; v</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> first. It exists only for a DAG, and there are usually many.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, add every in-degree-0 node to an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code> one, add it to the output, decrement each neighbour and enqueue it when it hits 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle check:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.size() &lt; n</code>, some nodes never became ready: there is a cycle and no order exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DFS alternative:</strong> <span style="color:#f0e2c8;">Add each node when it finishes, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverse</code>; a GRAY neighbour means a cycle. Deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and uses:</strong> <span style="color:#f0e2c8;">O(V + E) time and space. Build order, package installs, spreadsheets, course prerequisites, DP on a DAG.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the lexicographically smallest order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;Integer&gt;</code> instead of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>: it is a min-heap, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code> returns the smallest ready node. Cost becomes O(V log V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> for in-degrees instead of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nodes are 0..n-1, so an array is direct indexing with no hashing and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> boxing. Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> only when ids are arbitrary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know the order is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds two or more ready nodes at once, either could go next, so the order is not unique.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with 10^5 nodes in a chain and recursive DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the default thread stack it can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> (it did here at 200,000). Use Kahn, an explicit stack, or run DFS in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> created with a bigger stack size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn or DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(V + E). Kahn avoids recursion and gives levels; DFS gives the cycle path easily.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed graph** | nodes joined by one-way arrows |
| **Topological order** | a list of all nodes where every arrow points forward |
| **DAG** | directed acyclic graph: a directed graph with no cycle |
| **Cycle** | a path of arrows that returns to its start |
| **In-degree** | number of arrows pointing into a node |
| **Kahn's algorithm** | queue-based topological sort that removes in-degree-0 nodes |
| **Post-order (finish order)** | the order in which DFS finishes nodes |
| **Reverse post-order** | finish order read backwards; a topological order on a DAG |
| **ArrayDeque** | resizable array FIFO queue / stack |
| **PriorityQueue** | Java binary min-heap in natural order |

---
**Conclusion:** A topological sort lists the nodes of a directed graph so that every arrow points forward, and it exists exactly when the graph has no cycle. Kahn's algorithm peels off in-degree-0 nodes with a queue; DFS writes nodes down as they finish and reverses the list; both run in O(V + E) and both report a cycle when they cannot place every node. Reach for it whenever a problem talks about dependencies, prerequisites or build order. In Java, use \`ArrayDeque\` for the queue, \`PriorityQueue\` for the smallest order, primitive \`int[]\` in-degrees, and avoid deep recursion on the default thread stack.`,
        examples: [
          { label: `Kahn's algorithm on a build graph, then with a cycle`, code: `import java.util.*;

public class Main {
    // Kahn's algorithm. edges are {u, v} pairs meaning u must come before v.
    static List<Integer> kahn(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indegree[e[1]]++;
        }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i); // ready now
        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                indegree[v]--;                  // one dependency of v is now done
                if (indegree[v] == 0) queue.add(v);
            }
        }
        return order;                           // shorter than n means a cycle
    }

    static boolean isValid(List<Integer> order, int n, int[][] edges) {
        if (order.size() != n) return false;
        int[] pos = new int[n];
        for (int i = 0; i < n; i++) pos[order.get(i)] = i;
        for (int[] e : edges) if (pos[e[0]] >= pos[e[1]]) return false;
        return true;
    }

    static String names(List<Integer> order, String[] tasks, String sep) {
        StringJoiner sj = new StringJoiner(sep);
        for (int i : order) sj.add(tasks[i]);
        return sj.toString();
    }

    public static void main(String[] args) {
        String[] tasks = {"utils", "config", "db", "auth", "api", "web"};
        int[][] deps = {{0, 2}, {1, 2}, {0, 3}, {2, 4}, {3, 4}, {4, 5}};

        List<Integer> order = kahn(tasks.length, deps);
        System.out.println("build order: " + names(order, tasks, " -> "));
        System.out.println("valid: " + isValid(order, tasks.length, deps));

        int[][] cyclic = Arrays.copyOf(deps, deps.length + 1);
        cyclic[deps.length] = new int[]{5, 0};  // web now also needed by utils
        order = kahn(tasks.length, cyclic);
        System.out.println("with web -> utils: placed " + order.size() + " of " + tasks.length + " tasks");
        List<Integer> stuck = new ArrayList<>();
        for (int i = 0; i < tasks.length; i++) if (!order.contains(i)) stuck.add(i);
        System.out.println("never ready: " + names(stuck, tasks, ", "));
        System.out.println("valid: " + isValid(order, tasks.length, cyclic));

        System.out.println("empty graph of 3 nodes: " + kahn(3, new int[0][])); // [0, 1, 2]
    }
}` },
          { label: `The queue picks the order: FIFO vs min-heap, and all 13 orders`, code: `import java.util.*;

public class Main {
    static List<List<Integer>> adj;
    static int[] indegree;

    static void build(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        indegree = new int[n];
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); indegree[e[1]]++; }
    }

    // queue decides the tie-break: ArrayDeque is FIFO, PriorityQueue is a min-heap.
    static List<Integer> kahn(int n, int[][] edges, Queue<Integer> ready) {
        build(n, edges);
        for (int i = 0; i < n; i++) if (indegree[i] == 0) ready.add(i);
        List<Integer> order = new ArrayList<>();
        while (!ready.isEmpty()) {
            int u = ready.poll();
            order.add(u);
            for (int v : adj.get(u)) if (--indegree[v] == 0) ready.add(v);
        }
        return order;
    }

    // Backtracking: try every ready node at every step (exponential, small n only).
    static void go(int n, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == n) { out.add(new ArrayList<>(path)); return; }
        for (int u = 0; u < n; u++) {
            if (used[u] || indegree[u] != 0) continue;
            used[u] = true; path.add(u);
            for (int v : adj.get(u)) indegree[v]--;
            go(n, used, path, out);
            for (int v : adj.get(u)) indegree[v]++;
            path.remove(path.size() - 1); used[u] = false;
        }
    }

    static List<List<Integer>> allOrders(int n, int[][] edges) {
        build(n, edges);
        List<List<Integer>> out = new ArrayList<>();
        go(n, new boolean[n], new ArrayList<>(), out);
        return out;
    }

    public static void main(String[] args) {
        int[][] edges = {{5, 2}, {5, 0}, {4, 0}, {4, 1}, {2, 3}, {3, 1}};
        System.out.println("FIFO queue order: " + kahn(6, edges, new ArrayDeque<>()));    // [4, 5, 2, 0, 3, 1]
        System.out.println("min-heap order: " + kahn(6, edges, new PriorityQueue<>()));   // [4, 5, 0, 2, 3, 1]
        List<List<Integer>> orders = allOrders(6, edges);
        System.out.println("valid orders: " + orders.size());
        for (List<Integer> o : orders) System.out.println("  " + o);
        System.out.println("chain 0->1->2->3: " + allOrders(4, new int[][]{{0, 1}, {1, 2}, {2, 3}}).size() + " order(s)");
        System.out.println("4 nodes, no edges: " + allOrders(4, new int[0][]).size() + " order(s)");
    }
}` },
          { label: `DFS reverse post-order on the same build graph`, code: `import java.util.*;

public class Main {
    static final int WHITE = 0, GRAY = 1, BLACK = 2;   // unvisited, on the current path, finished
    static List<List<Integer>> adj;
    static int[] color;
    static List<Integer> finish;

    static boolean visit(int u) {
        color[u] = GRAY;
        for (int v : adj.get(u)) {
            if (color[v] == GRAY) return false;               // back edge: v is still on the path
            if (color[v] == WHITE && !visit(v)) return false;
        }
        color[u] = BLACK;
        finish.add(u);                                        // u finishes after everything it points to
        return true;
    }

    // Reverse post-order DFS. Returns null on a cycle.
    static List<Integer> dfsTopo(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        color = new int[n];
        finish = new ArrayList<>();
        for (int s = 0; s < n; s++) {
            if (color[s] == WHITE && !visit(s)) return null;
        }
        List<Integer> order = new ArrayList<>(finish);
        Collections.reverse(order);
        return order;
    }

    static boolean isValid(List<Integer> order, int n, int[][] edges) {
        if (order.size() != n) return false;
        int[] pos = new int[n];
        for (int i = 0; i < n; i++) pos[order.get(i)] = i;
        for (int[] e : edges) if (pos[e[0]] >= pos[e[1]]) return false;
        return true;
    }

    static String names(List<Integer> ids, String[] tasks, String sep) {
        StringJoiner sj = new StringJoiner(sep);
        for (int i : ids) sj.add(tasks[i]);
        return sj.toString();
    }

    public static void main(String[] args) {
        String[] tasks = {"utils", "config", "db", "auth", "api", "web"};
        int[][] deps = {{0, 2}, {1, 2}, {0, 3}, {2, 4}, {3, 4}, {4, 5}};

        List<Integer> order = dfsTopo(tasks.length, deps);
        System.out.println("finish order: " + names(finish, tasks, " "));
        System.out.println("reversed:     " + names(order, tasks, " -> "));
        System.out.println("valid: " + isValid(order, tasks.length, deps));

        int[][] cyclic = Arrays.copyOf(deps, deps.length + 1);
        cyclic[deps.length] = new int[]{5, 0};
        order = dfsTopo(tasks.length, cyclic);
        System.out.println("with web -> utils: " + (order == null ? "cycle found" : "no cycle"));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a topological sort, and when would you use one? Walk me through an algorithm for it and code it in C++."

**What a strong answer should cover:**
- A topological order lists every node so that each edge u -> v has u before v; it exists only for a DAG (no cycles), and it is usually not unique.
- Kahn's algorithm: in-degrees, a queue of in-degree-0 nodes, decrement neighbours; fewer than n nodes placed means a cycle.
- The DFS alternative: reverse post-order, with three colours to catch a back edge.
- O(V + E) time and space for both, and real uses: build order, package installs, spreadsheets, course prerequisites, DP on a DAG.
- C++ specifics: \`vector<vector<int>>\` adjacency, \`std::queue\`, \`std::priority_queue\` is a max-heap unless you pass \`greater<int>\`, and deep recursive DFS can overflow the native stack and crash without an exception.

**Code / implementation expected:** Yes — a \`kahn(int n, const vector<pair<int,int>>& edges)\` function in C++ that returns an order or signals a cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think about getting dressed in the morning. Socks go on before shoes. Underwear goes on before trousers. Trousers go on before shoes and before the belt. A shirt goes on before a tie. Nobody writes this down, but there are rules: **some things must happen before other things**. Some pairs have no rule at all — you can put on your watch whenever you like.

Now imagine a computer has to do the same thing for 50,000 jobs: compile these files before linking that program, install this package before that one, recalculate cell B2 before cell C7 because C7 uses B2. It needs **one list** of all the jobs in an order that never breaks a rule. That list is a **topological order**, and the procedure that produces it is a **topological sort**.

There is one way to make it impossible: a loop of rules. If shoes must go on before socks *and* socks before shoes, no order works. So every topological sort also answers a second question for free: *is there a loop in these rules?*

## 2. The Core Idea

📌 **Interview term: Directed graph** — a set of nodes (here: tasks) joined by one-way arrows (edges). An arrow \`u -> v\` means "u must happen before v". If graphs are new to you, start with [what a graph is and how to store one](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Topological order** — a list of **all** the nodes such that for **every** edge \`u -> v\`, \`u\` appears earlier in the list than \`v\`. Topological sort is the algorithm that finds one.

📌 **Interview term: DAG (directed acyclic graph)** — a directed graph with no cycle. A topological order exists **exactly when** the graph is a DAG. If there is a cycle, the first node of the cycle in any list would need some other cycle node before it, which is impossible.

Here is a small software build. Each box is a module; each arrow means "build this first". The number under each name is its **in-degree** — how many arrows point into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 300" role="img" aria-label="Build graph: utils points to auth and db, config points to db, auth and db point to api, api points to web">
  <defs>
    <marker id="topo1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="74" text-anchor="middle">utils</text>
  <text class="d-sub" x="90" y="94" text-anchor="middle">in-degree 0</text>
  <rect class="d-box-accent" x="30" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="234" text-anchor="middle">config</text>
  <text class="d-sub" x="90" y="254" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="250" y="50" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">auth</text>
  <text class="d-sub" x="310" y="94" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="250" y="210" width="120" height="54" rx="8"/>
  <text class="d-text" x="310" y="234" text-anchor="middle">db</text>
  <text class="d-sub" x="310" y="254" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="450" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="510" y="154" text-anchor="middle">api</text>
  <text class="d-sub" x="510" y="174" text-anchor="middle">in-degree 2</text>
  <rect class="d-box" x="630" y="130" width="120" height="54" rx="8"/>
  <text class="d-text" x="690" y="154" text-anchor="middle">web</text>
  <text class="d-sub" x="690" y="174" text-anchor="middle">in-degree 1</text>
  <path class="d-edge" d="M 150 77 L 244 77" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 100 L 246 214" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 150 237 L 244 237" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 90 L 446 140" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 370 224 L 446 174" marker-end="url(#topo1-arrow)"/>
  <path class="d-edge" d="M 570 157 L 624 157" marker-end="url(#topo1-arrow)"/>
</svg>

\`utils\` and \`config\` (highlighted) depend on nothing, so either can go first. \`utils -> config -> auth -> db -> api -> web\` is a valid order, and so is \`config -> utils -> auth -> db -> api -> web\`. Both are printed by the examples below.

**Topological orders are usually not unique.** Whenever two tasks have no path between them, either can go first. For the classic six-node graph in Example 2, there are **13** valid orders; a straight chain has exactly 1; four nodes with no edges have 4! = 24. When an interviewer wants one specific answer (often "the lexicographically smallest"), you change a single data structure, as shown below.

📌 **Interview term: Cycle** — a path of arrows that comes back to where it started, like \`a -> b -> c -> a\`. A self-loop \`a -> a\` is the shortest cycle. Finding one is its own question: [how to detect a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 520 250" role="img" aria-label="A cycle of three tasks a b c where every task has in-degree 1, so no task can start">
  <defs>
    <marker id="topo2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="120" height="54" rx="8"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">a</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="40" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="100" y="194" text-anchor="middle">c</text>
  <text class="d-sub" x="100" y="214" text-anchor="middle">in-degree 1</text>
  <rect class="d-box-muted" x="360" y="170" width="120" height="54" rx="8"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">b</text>
  <text class="d-sub" x="420" y="214" text-anchor="middle">in-degree 1</text>
  <path class="d-edge-accent" d="M 320 60 L 396 164" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 356 197 L 166 197" marker-end="url(#topo2-arrow)"/>
  <path class="d-edge-accent" d="M 124 166 L 200 62" marker-end="url(#topo2-arrow)"/>
</svg>

In a cycle every node waits for another node in the same cycle, so no node ever reaches in-degree 0 and nothing can start. That is exactly how the algorithms below notice the cycle.

## 3. Algorithm 1 — Kahn's Algorithm (peel off what is ready)

📌 **Interview term: In-degree** — the number of edges pointing **into** a node: how many things it is still waiting for.

📌 **Interview term: Kahn's algorithm** — the queue-based topological sort (described by A. B. Kahn in a 1962 Communications of the ACM paper, per [Wikipedia: Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)). It is a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)-style loop:

1. Count the in-degree of every node.
2. Put every node with in-degree 0 into a queue — these are ready now.
3. Repeatedly take a node from the queue, append it to the output, and "remove" its outgoing edges by decrementing each neighbour in-degree. Any neighbour that drops to 0 joins the queue.
4. If the output has all n nodes, it is a topological order. If it is shorter, the missing nodes are stuck behind a cycle.

Here is the trace on the build graph (tasks numbered utils=0, config=1, db=2, auth=3, api=4, web=5):

| Step | Take from queue | In-degrees that drop | Queue after |
| :--- | :--- | :--- | :--- |
| start | — | — | utils, config |
| 1 | utils | auth 1 to 0, db 2 to 1 | config, auth |
| 2 | config | db 1 to 0 | auth, db |
| 3 | auth | api 2 to 1 | db |
| 4 | db | api 1 to 0 | api |
| 5 | api | web 1 to 0 | web |
| 6 | web | — | empty |

Six nodes placed, so the order \`utils, config, auth, db, api, web\` is valid. Add one more edge \`web -> utils\` and \`utils\` now has in-degree 1: only \`config\` starts, it lowers \`db\` to 1, and the queue runs dry after **1 of 6** tasks. That is the cycle signal (Example 1 prints it).

## 4. Algorithm 2 — DFS and Reverse Post-Order

📌 **Interview term: Post-order (finish order)** — in a depth-first search, a node "finishes" when every node reachable from it has been fully explored. The finish order lists nodes in the order they finish.

📌 **Interview term: Reverse post-order** — the finish order read backwards. On a DAG it is always a topological order.

**Why it works.** When DFS finishes \`u\`, everything \`u\` points to has already finished (DFS explored it first, or it was already done). So in the finish list, every arrow points **backwards**: \`v\` is written before \`u\`. Reversing the list makes every arrow point forwards.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Finish order web api db auth utils config, and the same list reversed gives config utils auth db api web">
  <defs>
    <marker id="topo3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="28">finish order, first to finish on the left</text>
  <rect class="d-box-muted" x="30" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">web</text>
  <rect class="d-box-muted" x="150" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">api</text>
  <rect class="d-box-muted" x="270" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="70" text-anchor="middle">db</text>
  <rect class="d-box-muted" x="390" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">auth</text>
  <rect class="d-box-muted" x="510" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">utils</text>
  <rect class="d-box-muted" x="630" y="42" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">config</text>
  <path class="d-edge-dashed" d="M 380 98 L 380 150" marker-end="url(#topo3-arrow)"/>
  <text class="d-sub" x="400" y="130">reverse</text>
  <text class="d-sub" x="30" y="160">topological order</text>
  <rect class="d-box-accent" x="30" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="200" text-anchor="middle">config</text>
  <rect class="d-box-accent" x="150" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="200" y="200" text-anchor="middle">utils</text>
  <rect class="d-box-accent" x="270" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="320" y="200" text-anchor="middle">auth</text>
  <rect class="d-box-accent" x="390" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="440" y="200" text-anchor="middle">db</text>
  <rect class="d-box-accent" x="510" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="560" y="200" text-anchor="middle">api</text>
  <rect class="d-box-accent" x="630" y="172" width="100" height="46" rx="8"/>
  <text class="d-text" x="680" y="200" text-anchor="middle">web</text>
</svg>

DFS started at \`utils\` and went \`utils -> db -> api -> web\`, so \`web\` finished first. The DFS version detects cycles with three colours (unvisited, on the current path, finished): an edge into a node that is still on the current path is a cycle. Which of the two algorithms to pick, and why, is the subject of [Kahn vs DFS for Course Schedule](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 5. When Is It Used?

Reach for topological sort whenever a problem says **"depends on", "prerequisite", "before/after", "build order", "schedule"** on one-way relationships:

- **Build systems and compilers:** compile modules after the modules they import.
- **Package managers:** install dependencies before the packages that need them.
- **Spreadsheets:** recompute a cell only after the cells its formula reads.
- **Course planning:** take prerequisites first — the classic [course schedule problem](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem).
- **Deriving an unknown order from examples:** the [Alien Dictionary](/interview-question/alien-dictionary-given-sorted-words-in-an-alien-language-how-do-you-derive-the-c) builds a letter graph and sorts it.
- **Dynamic programming on a DAG:** longest or shortest path in a DAG takes one pass in topological order, because each node is processed after all its predecessors. [Longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force) is this idea on an implicit DAG.

## 6. The Code in C++

~~~cpp
vector<int> kahn(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        indegree[v]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);   // ready now
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (--indegree[v] == 0) q.push(v);   // last dependency of v is done
        }
    }
    return order;                                // shorter than n means a cycle
}
~~~

**Why each line is there:**

- \`vector<vector<int>> adj(n)\` creates n empty inner vectors; \`vector<int> indegree(n, 0)\` is the counter array.
- \`for (auto [u, v] : edges)\` is a C++17 structured binding over each \`pair<int, int>\`.
- \`std::queue<int>\` is a FIFO adapter (over \`std::deque\` by default): \`front()\` reads, \`pop()\` removes and returns nothing, so the two calls come as a pair.
- \`if (--indegree[v] == 0)\` decrements first and then tests, in one expression.
- The return value doubles as the cycle test: \`order.size() < n\` means some node never reached in-degree 0. Cast with \`(int)order.size()\` before comparing with an \`int\` to avoid a signed/unsigned comparison warning.

**The smallest order: flip the heap.** \`std::priority_queue\` is a **max-heap** by default, so \`top()\` is the largest element. For the lexicographically smallest order, pass \`greater<int>\` as the comparator:

~~~cpp
vector<int> kahnSmallest(int n, const Edges& edges) {
    build(n, edges);
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) pq.push(i);
    vector<int> order;
    while (!pq.empty()) {
        int u = pq.top(); pq.pop();
        order.push_back(u);
        for (int v : adj[u]) if (--indegree[v] == 0) pq.push(v);
    }
    return order;
}
~~~

**The DFS version and the native stack.** Example 3 pushes nodes into \`finish\` as they complete and builds the answer with \`vector<int>(finish.rbegin(), finish.rend())\`, returning \`std::nullopt\` on a cycle. It is recursive, and C++ has no stack-overflow exception: on this machine (8 MB default stack), a recursive DFS handled a 100,000-node chain but a 200,000-node chain died with a segmentation fault. Kahn has no recursion, so it is the safer default; an explicit-stack DFS is in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn's algorithm on a build graph, then with a cycle** prints:

~~~text
build order: utils -> config -> auth -> db -> api -> web
valid: true
with web -> utils: placed 1 of 6 tasks
never ready: utils, db, auth, api, web
valid: false
empty graph of 3 nodes: [0, 1, 2]
~~~

**Example 2 — The queue picks the order: FIFO vs min-heap, and all 13 orders** prints:

~~~text
FIFO queue order: [4, 5, 2, 0, 3, 1]
min-heap order: [4, 5, 0, 2, 3, 1]
valid orders: 13
  [4, 5, 0, 2, 3, 1]
  [4, 5, 2, 0, 3, 1]
  [4, 5, 2, 3, 0, 1]
  [4, 5, 2, 3, 1, 0]
  [5, 2, 3, 4, 0, 1]
  [5, 2, 3, 4, 1, 0]
  [5, 2, 4, 0, 3, 1]
  [5, 2, 4, 3, 0, 1]
  [5, 2, 4, 3, 1, 0]
  [5, 4, 0, 2, 3, 1]
  [5, 4, 2, 0, 3, 1]
  [5, 4, 2, 3, 0, 1]
  [5, 4, 2, 3, 1, 0]
chain 0->1->2->3: 1 order(s)
4 nodes, no edges: 24 order(s)
~~~

**Example 3 — DFS reverse post-order on the same build graph** prints:

~~~text
finish order: web api db auth utils config
reversed:     config -> utils -> auth -> db -> api -> web
valid: true
with web -> utils: cycle found
~~~

**Reading the output:** Example 1 shows Kahn on the build graph: \`utils\` and \`config\` both start with in-degree 0, and the queue releases them in the order they were added. With the extra edge \`web -> utils\`, only 1 of 6 tasks is placed, and the five \`never ready\` tasks include \`db\`, which is not on the loop itself but sits downstream of it. Example 2 shows that the queue type is the tie-breaker: FIFO gives \`[4, 5, 2, 0, 3, 1]\`, the min-heap gives the lexicographically smallest order \`[4, 5, 0, 2, 3, 1]\`, and both appear in the full list of 13 valid orders. Example 3 is the DFS version on the same build graph: a different valid order (\`config\` first), and the same cycle verdict.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Kahn with a FIFO queue | O(V + E) | O(V + E) | each node is queued once, each edge decremented once; the adjacency list holds E entries |
| Kahn with a min-heap | O(V log V + E) | O(V + E) | each of the V pushes and pops costs O(log V) |
| DFS reverse post-order | O(V + E) | O(V + E) | each node visited once, each edge looked at once; recursion depth up to V |
| Listing every order | O(V! * V) worst case | O(V) | there can be V! orders (no edges at all) |

V is the number of nodes and E the number of edges. Building the adjacency list from the edge list is part of the O(V + E). For "what is Big-O", see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **No edges:** every node has in-degree 0, so any order is valid; Kahn returns them in index order (\`[0, 1, 2]\` in Example 1).
- **Disconnected pieces:** both algorithms handle them — Kahn seeds the queue with every in-degree-0 node, DFS restarts from every unvisited node.
- **Self-loop \`a -> a\`:** a cycle of length 1; \`a\` has in-degree at least 1 forever.
- **Duplicate edges:** Kahn counts the in-degree twice and decrements it twice, so it still works; just do not de-duplicate in one place and not the other.
- **Nodes downstream of a cycle:** they are not on the cycle but are still never placed by Kahn (\`db\` in Example 1).
- **Very deep chains:** recursive DFS uses one stack frame per node on the path; see the language notes below.

## Common Pitfalls

- **Edge direction backwards.** If "a depends on b", the edge is \`b -> a\` (b first). Reversing it produces a perfectly valid order of the wrong graph.
- **Max-heap surprise.** \`std::priority_queue<int>\` pops the **largest** value; you need \`priority_queue<int, vector<int>, greater<int>>\` for the smallest order.
- **\`q.pop()\` returns \`void\`.** Read \`q.front()\` first, then pop.
- **Forgetting the cycle check.** Kahn silently returns a partial list on a cycle; compare \`order.size()\` with \`n\`.
- **Signed/unsigned comparisons.** \`order.size()\` is \`size_t\`; compare against \`n\` after a cast, and never compute \`size() - 1\` on an empty vector.
- **Recursive DFS on long chains.** A stack overflow is a crash (segmentation fault), not an exception you can catch; prefer Kahn or an explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A topological order lists every node so each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u -&gt; v</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> first. It exists only for a DAG, and there are usually many.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code>, push every in-degree-0 node into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>, take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and push each neighbour when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--indegree[v] == 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle check:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.size() &lt; n</code>, some nodes never became ready: there is a cycle and no order exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DFS alternative:</strong> <span style="color:#f0e2c8;">Push each node when it finishes, then reverse; a GRAY neighbour means a cycle. Deep recursion can crash the process.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and uses:</strong> <span style="color:#f0e2c8;">O(V + E) time and space. Build order, package installs, spreadsheets, course prerequisites, DP on a DAG.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the lexicographically smallest order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code>. The default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is a max-heap and would give the largest order. Cost becomes O(V log V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">q.pop()</code> not give you the element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue::pop</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>; read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> first. The standard adapters separate reading and removing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know the order is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds two or more ready nodes at once, either could go next, so the order is not unique.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a 200,000-node chain and recursive DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Here it crashed with a segmentation fault on an 8 MB stack. There is no exception to catch, so use Kahn or an explicit-stack DFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn or DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same O(V + E). Kahn avoids recursion and gives levels; DFS gives the cycle path easily.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed graph** | nodes joined by one-way arrows |
| **Topological order** | a list of all nodes where every arrow points forward |
| **DAG** | directed acyclic graph: a directed graph with no cycle |
| **Cycle** | a path of arrows that returns to its start |
| **In-degree** | number of arrows pointing into a node |
| **Kahn's algorithm** | queue-based topological sort that removes in-degree-0 nodes |
| **Post-order (finish order)** | the order in which DFS finishes nodes |
| **Reverse post-order** | finish order read backwards; a topological order on a DAG |
| **std::queue** | FIFO adapter: push, front, pop |
| **std::priority_queue** | heap adapter, max-heap unless given greater |

---
**Conclusion:** A topological sort lists the nodes of a directed graph so that every arrow points forward, and it exists exactly when the graph has no cycle. Kahn's algorithm peels off in-degree-0 nodes with a queue; DFS writes nodes down as they finish and reverses the list; both run in O(V + E) and both report a cycle when they cannot place every node. Reach for it whenever a problem talks about dependencies, prerequisites or build order. In C++, use \`std::queue\` for the queue, \`priority_queue\` with \`greater<int>\` for the smallest order, and avoid deep recursion because a stack overflow is a crash.`,
        examples: [
          { label: `Kahn's algorithm on a build graph, then with a cycle`, code: `#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Kahn's algorithm. edges are {u, v} pairs meaning u must come before v.
vector<int> kahn(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        indegree[v]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);   // ready now
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (--indegree[v] == 0) q.push(v);   // last dependency of v is done
        }
    }
    return order;                                // shorter than n means a cycle
}

bool isValid(const vector<int>& order, int n, const vector<pair<int, int>>& edges) {
    if ((int)order.size() != n) return false;
    vector<int> pos(n);
    for (int i = 0; i < n; i++) pos[order[i]] = i;
    for (auto [u, v] : edges) if (pos[u] >= pos[v]) return false;
    return true;
}

string join(const vector<string>& parts, const string& sep) {
    string s;
    for (size_t i = 0; i < parts.size(); i++) s += (i ? sep : "") + parts[i];
    return s;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    cout << boolalpha;
    vector<string> tasks = {"utils", "config", "db", "auth", "api", "web"};
    vector<pair<int, int>> deps = {{0, 2}, {1, 2}, {0, 3}, {2, 4}, {3, 4}, {4, 5}};
    int n = tasks.size();

    vector<int> order = kahn(n, deps);
    vector<string> parts;
    for (int i : order) parts.push_back(tasks[i]);
    cout << "build order: " << join(parts, " -> ") << "\\n";
    cout << "valid: " << isValid(order, n, deps) << "\\n";

    auto cyclic = deps;
    cyclic.push_back({5, 0});                    // web now also needed by utils
    order = kahn(n, cyclic);
    cout << "with web -> utils: placed " << order.size() << " of " << n << " tasks\\n";
    vector<bool> placed(n, false);
    for (int i : order) placed[i] = true;
    vector<string> stuck;
    for (int i = 0; i < n; i++) if (!placed[i]) stuck.push_back(tasks[i]);
    cout << "never ready: " << join(stuck, ", ") << "\\n";
    cout << "valid: " << isValid(order, n, cyclic) << "\\n";

    cout << "empty graph of 3 nodes: " << fmt(kahn(3, {})) << "\\n";   // [0, 1, 2]
}` },
          { label: `The queue picks the order: FIFO vs min-heap, and all 13 orders`, code: `#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Edges = vector<pair<int, int>>;
vector<vector<int>> adj;
vector<int> indegree;

void build(int n, const Edges& edges) {
    adj.assign(n, {});
    indegree.assign(n, 0);
    for (auto [u, v] : edges) { adj[u].push_back(v); indegree[v]++; }
}

vector<int> kahnFifo(int n, const Edges& edges) {
    build(n, edges);
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) if (--indegree[v] == 0) q.push(v);
    }
    return order;
}

// std::priority_queue is a MAX-heap by default; greater<int> turns it into a min-heap.
vector<int> kahnSmallest(int n, const Edges& edges) {
    build(n, edges);
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) pq.push(i);
    vector<int> order;
    while (!pq.empty()) {
        int u = pq.top(); pq.pop();
        order.push_back(u);
        for (int v : adj[u]) if (--indegree[v] == 0) pq.push(v);
    }
    return order;
}

// Backtracking: try every ready node at every step (exponential, small n only).
void go(int n, vector<bool>& used, vector<int>& path, vector<vector<int>>& out) {
    if ((int)path.size() == n) { out.push_back(path); return; }
    for (int u = 0; u < n; u++) {
        if (used[u] || indegree[u] != 0) continue;
        used[u] = true; path.push_back(u);
        for (int v : adj[u]) indegree[v]--;
        go(n, used, path, out);
        for (int v : adj[u]) indegree[v]++;
        path.pop_back(); used[u] = false;
    }
}

vector<vector<int>> allOrders(int n, const Edges& edges) {
    build(n, edges);
    vector<bool> used(n, false);
    vector<int> path;
    vector<vector<int>> out;
    go(n, used, path, out);
    return out;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    Edges edges = {{5, 2}, {5, 0}, {4, 0}, {4, 1}, {2, 3}, {3, 1}};
    cout << "FIFO queue order: " << fmt(kahnFifo(6, edges)) << "\\n";      // [4, 5, 2, 0, 3, 1]
    cout << "min-heap order: " << fmt(kahnSmallest(6, edges)) << "\\n";    // [4, 5, 0, 2, 3, 1]
    auto orders = allOrders(6, edges);
    cout << "valid orders: " << orders.size() << "\\n";
    for (auto& o : orders) cout << "  " << fmt(o) << "\\n";
    cout << "chain 0->1->2->3: " << allOrders(4, {{0, 1}, {1, 2}, {2, 3}}).size() << " order(s)\\n";
    cout << "4 nodes, no edges: " << allOrders(4, {}).size() << " order(s)\\n";
}` },
          { label: `DFS reverse post-order on the same build graph`, code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>
using namespace std;

enum Color { WHITE, GRAY, BLACK };   // unvisited, on the current path, finished
vector<vector<int>> adj;
vector<Color> color;
vector<int> finish;

bool visit(int u) {
    color[u] = GRAY;
    for (int v : adj[u]) {
        if (color[v] == GRAY) return false;               // back edge: v is still on the path
        if (color[v] == WHITE && !visit(v)) return false;
    }
    color[u] = BLACK;
    finish.push_back(u);                                  // u finishes after everything it points to
    return true;
}

// Reverse post-order DFS. std::nullopt means a cycle was found.
optional<vector<int>> dfsTopo(int n, const vector<pair<int, int>>& edges) {
    adj.assign(n, {});
    for (auto [u, v] : edges) adj[u].push_back(v);
    color.assign(n, WHITE);
    finish.clear();
    for (int s = 0; s < n; s++) {
        if (color[s] == WHITE && !visit(s)) return nullopt;
    }
    return vector<int>(finish.rbegin(), finish.rend());
}

bool isValid(const vector<int>& order, int n, const vector<pair<int, int>>& edges) {
    if ((int)order.size() != n) return false;
    vector<int> pos(n);
    for (int i = 0; i < n; i++) pos[order[i]] = i;
    for (auto [u, v] : edges) if (pos[u] >= pos[v]) return false;
    return true;
}

string names(const vector<int>& ids, const vector<string>& tasks, const string& sep) {
    string s;
    for (size_t i = 0; i < ids.size(); i++) s += (i ? sep : "") + tasks[ids[i]];
    return s;
}

int main() {
    cout << boolalpha;
    vector<string> tasks = {"utils", "config", "db", "auth", "api", "web"};
    vector<pair<int, int>> deps = {{0, 2}, {1, 2}, {0, 3}, {2, 4}, {3, 4}, {4, 5}};
    int n = tasks.size();

    auto order = dfsTopo(n, deps);
    cout << "finish order: " << names(finish, tasks, " ") << "\\n";
    cout << "reversed:     " << names(*order, tasks, " -> ") << "\\n";
    cout << "valid: " << isValid(*order, n, deps) << "\\n";

    auto cyclic = deps;
    cyclic.push_back({5, 0});
    order = dfsTopo(n, cyclic);
    cout << "with web -> utils: " << (order ? "no cycle" : "cycle found") << "\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How do you solve the course schedule (prerequisites) problem?`,
    difficulty: "medium",
    seoDescription: `Course Schedule I and II in Python, JavaScript, Java and C++: prerequisite graph, Kahn's algorithm, cycle detection, O(V+E) and minimum semesters.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"There are numCourses courses labelled 0 to numCourses - 1, and a list of pairs [a, b] meaning you must take course b before course a. Can you finish all the courses? If so, give me one valid order. Please code it in Python."

**What a strong answer should cover:**
- Model it as a directed graph with an edge b -> a for each pair, and recognise that "can finish" means "the graph has no cycle".
- Kahn's algorithm: in-degree counts, a queue of courses with no remaining prerequisites, and \`len(order) == numCourses\` as the cycle test; the same function answers both Course Schedule I and II.
- O(V + E) time and space, compared with the O(V * (V + E)) rescan brute force.
- The DFS three-colour alternative, and the follow-up of minimum semesters via level-by-level Kahn.
- Python specifics: \`collections.deque\` for the queue, \`[[] for _ in range(n)]\` (not \`[[]] * n\`) for adjacency, \`all(...)\` in the brute force, and the 1000-frame default recursion limit if you choose DFS.

**Clarifying questions expected:**
- "Does [a, b] mean b comes before a?"
- "Do you want just true/false, or an order — and is any valid order acceptable?"
- "Can pairs repeat, or can a course list itself?"

**Code / implementation expected:** Yes — \`findOrder\` (and \`canFinish\` on top of it) in Python, using Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You have just enrolled at a university and the catalogue says: *"Data Structures requires Intro to Programming. Algorithms requires Data Structures and Discrete Maths. Compilers requires Algorithms."* You want to know two things before you sign up: **can I actually finish every course**, and **in what order should I take them**?

Usually the answer is yes. But catalogues are written by humans, and sometimes two departments each list the other course as a prerequisite: "Statistics requires Probability", "Probability requires Statistics". Then nobody can ever take either one, and any student who needs both is stuck forever.

That is the **Course Schedule** problem. LeetCode 207 asks the yes/no question ("can you finish all courses?") and LeetCode 210 asks for an actual order. Both are the same algorithm: a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) that also reports a cycle.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the pair \`[a, b]\` mean "take b before a"? | The direction of every edge depends on it. In the LeetCode statement, \`[a, b]\` means b is the prerequisite of a, so the edge is \`b -> a\`. |
| Do you want yes/no, or an order? | Yes/no is Course Schedule I; an order (or \`[]\` if impossible) is Course Schedule II. Same code, different return. |
| If several orders work, is any one fine? | Usually yes. If they want the smallest course number first, you swap the queue for a min-heap. |
| Can there be duplicate pairs or a course that requires itself? | Duplicates are harmless with in-degree counting; \`[0, 0]\` is a cycle of length 1 and makes the answer false. |
| How many courses and pairs? | With up to 10^5 of each, O(V + E) is required and a recursive DFS may run out of stack. |

## 3. Turning Courses into a Graph

📌 **Interview term: Prerequisite graph** — a directed graph with one node per course and an edge \`b -> a\` for every pair \`[a, b]\` ("b before a"). Courses with no incoming edge can be taken right away.

📌 **Interview term: In-degree** — the number of edges pointing into a node. For a course, it is **the number of prerequisites still not taken**.

For \`numCourses = 4\` and \`prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="Course 0 points to courses 1 and 2, and both of those point to course 3">
  <defs>
    <marker id="cs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">course 0</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="260" y="20" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="45" text-anchor="middle">course 1</text>
  <text class="d-sub" x="325" y="66" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="260" y="180" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="205" text-anchor="middle">course 2</text>
  <text class="d-sub" x="325" y="226" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="500" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="565" y="125" text-anchor="middle">course 3</text>
  <text class="d-sub" x="565" y="146" text-anchor="middle">in-degree 2</text>
  <path class="d-edge" d="M 160 115 L 254 64" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 160 143 L 254 194" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 64 L 494 115" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 194 L 494 143" marker-end="url(#cs1-arrow)"/>
</svg>

Course 0 has no prerequisites. Taking it drops courses 1 and 2 to in-degree 0. Taking both of those drops course 3 to 0. One valid plan is \`[0, 1, 2, 3]\`; \`[0, 2, 1, 3]\` is equally valid.

📌 **Interview term: Cycle** — a loop of prerequisites such as \`0 -> 1 -> 2 -> 0\`. Every course on it waits for another course on it, so none can ever be taken. **"Can I finish all courses?" is exactly "does the prerequisite graph have no cycle?"** — the general check is covered in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Courses 0 1 2 form a loop so none can start, while course 3 leads to course 4 and both are fine">
  <defs>
    <marker id="cs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="150" y="20" width="110" height="50" rx="8"/>
  <text class="d-text" x="205" y="51" text-anchor="middle">course 0</text>
  <rect class="d-box-muted" x="30" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="85" y="201" text-anchor="middle">course 2</text>
  <rect class="d-box-muted" x="270" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="325" y="201" text-anchor="middle">course 1</text>
  <path class="d-edge-accent" d="M 240 74 L 300 164" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 266 195 L 146 195" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 100 166 L 170 76" marker-end="url(#cs2-arrow)"/>
  <rect class="d-box-accent" x="460" y="95" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">course 3</text>
  <rect class="d-box" x="460" y="190" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="221" text-anchor="middle">course 4</text>
  <path class="d-edge" d="M 515 145 L 515 184" marker-end="url(#cs2-arrow)"/>
</svg>

This is the input \`numCourses = 5, prerequisites = [[1, 0], [2, 1], [0, 2], [4, 3]]\`. Courses 3 and 4 are fine, but 0, 1 and 2 form a loop, so the whole plan is impossible and the answer is \`false\` (and \`[]\` for the order).

## 4. Brute Force First

The most literal approach: keep scanning the course list from the start, and take the first course whose prerequisites are all already taken; repeat until everything is taken or a full scan finds nothing. It is correct — if a scan finds nothing, every remaining course waits for another remaining course, which means a cycle.

But each round rescans from course 0 and rechecks prerequisite lists. On a chain where course \`i\` needs course \`i + 1\` (so the last course must go first), Example 2 counts exactly \`n^2 + 2n - 1\` steps: 1,001,999 for 1,000 courses and 9,005,999 for 3,000. That is O(V * (V + E)).

## 5. The Optimal Approach: Kahn's Algorithm

The waste in the brute force is re-checking courses that cannot have changed. Kahn's algorithm only looks at a course when one of its prerequisites has **just** been taken:

1. Build the adjacency list \`b -> a\` and count each course's in-degree.
2. Put every course with in-degree 0 into a queue.
3. Pop a course, append it to the order, and decrement the in-degree of every course that needed it. When one reaches 0, push it.
4. If the order has \`numCourses\` entries, return it (or \`true\`). Otherwise there is a cycle: return \`[]\` (or \`false\`).

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing in-degree-0 nodes with a queue. Each course is pushed and popped once and each prerequisite pair is processed once, so it is O(V + E): **2n - 1** steps on the same chain (1,999 for 1,000 courses).

**Why one function solves both versions.** \`canFinish\` is just \`len(findOrder(...)) == numCourses\`. Writing \`findOrder\` first and deriving \`canFinish\` keeps one source of truth.

**The DFS alternative.** A depth-first search with three colours (unvisited, in progress, done) answers the same question: meeting an "in progress" course means a cycle, and the reverse finish order is a valid plan. It has the same O(V + E) cost but uses recursion; the trade-offs are compared in [Course Schedule: Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

📌 **Interview term: Level-by-level Kahn** — process the queue one "wave" at a time; every course in a wave can be taken in the same semester. The number of waves is the **minimum number of semesters** (the "Parallel Courses" variant). For the six-course plan \`[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]\` the waves are \`{0, 1}\`, \`{2}\`, \`{3}\`, \`{4, 5}\`, so Example 2 prints 4.

## 6. The Code in Python

~~~python
from collections import deque

def find_order(num_courses, prerequisites):
    """LeetCode 207/210. A pair [a, b] means: take b BEFORE a, so the edge is b -> a."""
    adj = [[] for _ in range(num_courses)]
    indegree = [0] * num_courses
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    order = []
    while queue:
        c = queue.popleft()
        order.append(c)
        for nxt in adj[c]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return order if len(order) == num_courses else []


def can_finish(num_courses, prerequisites):
    return len(find_order(num_courses, prerequisites)) == num_courses
~~~

**Line by line:**

- \`for a, b in prerequisites\` unpacks each pair; the edge is \`adj[b].append(a)\` because b comes first. Getting this backwards is the most common bug, and it does not crash — it quietly returns the reverse of a valid plan.
- \`deque(c for c in range(num_courses) if indegree[c] == 0)\` seeds the queue with **every** course that is ready, including courses that appear in no pair.
- \`popleft()\` is O(1) on a \`deque\`; \`list.pop(0)\` would be O(n).
- \`return order if len(order) == num_courses else []\` is the cycle test and the Course Schedule II contract in one line.

**The brute force, for comparison** (Example 2). It reads naturally in Python thanks to \`all()\`, which stops at the first prerequisite not yet taken, but the outer loop restarts from course 0 every time:

~~~python
def brute_force(n, prerequisites):
    """Rescan all courses from the start; take the first whose prerequisites are all taken."""
    needs = [[] for _ in range(n)]
    for a, b in prerequisites:
        needs[a].append(b)
    taken = [False] * n
    count, steps = 0, 0
    progress = True
    while progress:
        progress = False
        for c in range(n):
            steps += 1                                 # look at course c
            if taken[c]:
                continue
            steps += len(needs[c])                     # check each of its prerequisites
            if all(taken[p] for p in needs[c]):
                taken[c] = True
                count += 1
                progress = True
                break                                  # restart the scan from course 0
    return count == n, steps
~~~

**If you choose DFS in Python:** CPython limits recursion to 1000 frames by default (\`sys.getrecursionlimit()\` returned 1000 here), so any prerequisite chain longer than that raises \`RecursionError\`. Either raise the limit (risky) or use Kahn, which has no recursion.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — canFinish and findOrder on normal, cyclic and tricky inputs** prints:

~~~text
n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
n=1 prereqs=[] -> canFinish=true order=[0]
n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]
~~~

**Example 2 — Brute-force rescan vs Kahn step counts, plus minimum semesters** prints:

~~~text
chain n=10 possible=true brute_steps=119 kahn_steps=19
chain n=100 possible=true brute_steps=10199 kahn_steps=199
chain n=1000 possible=true brute_steps=1001999 kahn_steps=1999
chain n=3000 possible=true brute_steps=9005999 kahn_steps=5999
minimum semesters for the 6-course plan: 4
minimum semesters with a cycle: -1
~~~

**Reading the output:** In Example 1, \`[[1, 0]]\` gives \`[0, 1]\` (0 first), the two-course loop gives \`false\` and \`[]\`, and the self-loop \`[[0, 0]]\` is also impossible. The five-course input is \`false\` even though courses 3 and 4 are fine, because the question is about **all** courses. The duplicated pair \`[[1, 0], [1, 0]]\` still works: course 1 starts at in-degree 2 and is decremented twice. In Example 2, both methods agree on every chain, but the brute force grows like n^2 (\`n^2 + 2n - 1\`) while Kahn grows like n (\`2n - 1\` = V + E); the semester count is 4, and -1 marks a plan with a cycle.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rescan until stuck (brute force) | O(V * (V + E)) | O(V + E) | up to V rounds, each rescanning courses and their prerequisite lists |
| Kahn's algorithm | O(V + E) | O(V + E) | each course queued once, each pair decremented once |
| Three-colour DFS | O(V + E) | O(V + E) | each course visited once; recursion depth up to V |
| Level-by-level Kahn (semesters) | O(V + E) | O(V + E) | same work, grouped into waves |

V is \`numCourses\` and E is the number of prerequisite pairs.

## 9. Edge Cases

- **No prerequisites at all:** every course has in-degree 0; the answer is \`true\` and \`[0, 1, ..., n-1]\`.
- **One course:** \`[0]\`.
- **A course that requires itself, \`[0, 0]\`:** a cycle; the answer is \`false\`.
- **Duplicate pairs:** harmless as long as you count and decrement each copy.
- **A cycle in one corner of a big catalogue:** still \`false\` for the whole question, even though most courses are fine.
- **Courses that appear in no pair:** they have in-degree 0 and are placed at the start; do not build the node list only from the pairs.

## Common Pitfalls

- **Reversed edges.** \`[a, b]\` means b first, so \`adj[b].append(a)\`. The reversed graph gives a reversed (wrong) plan with no error.
- **Seeding the queue from the pairs only.** Courses with no prerequisites and no dependants never appear in a pair; loop over \`range(num_courses)\`.
- **\`[[]] * n\`.** All entries are one shared list.
- **\`list.pop(0)\` as the queue.** O(n) per pop; use \`deque.popleft()\`.
- **Returning a partial order.** On a cycle, \`order\` is shorter than \`num_courses\`; return \`[]\` instead.
- **Recursive DFS on long chains.** \`RecursionError\` past 1000 frames by default.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Each pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a, b]</code> is an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b -&gt; a</code>. Finishing every course is possible exactly when this directed graph has no cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees, seed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> with every course at 0, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code>, append to the order, decrement the courses that needed it and enqueue any that hit 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(order) == num_courses</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">can_finish</code> is that length check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not brute force:</strong> <span style="color:#f0e2c8;">Rescanning for a ready course is O(V * (V + E)); Kahn only touches a course when a prerequisite was just taken: O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code>, a comprehension for adjacency lists, and no recursion, so no 1000-frame limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the minimum number of semesters if you can take any number of courses at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run Kahn in waves: each wave is one semester. The count of waves is the answer (4 for the six-course plan in Example 2), or -1 on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer "is course x a prerequisite of course y" for many queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Precompute reachability: BFS from every course (O(V * (V + E))), or process courses in topological order and union each course set of ancestors into its children. Then each query is O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you also had to return which courses form the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kahn only tells you which courses were never placed. Use three-colour DFS and keep the current path; when you meet an in-progress course, the path from it to the top of the stack is the loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with DFS instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, three colours: in-progress means cycle, and the reverse finish order is a plan. In Python, mind the 1000-frame recursion limit on long chains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deque</code> and not a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> shifts every element, so the loop could become O(V^2). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.popleft()</code> is O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prerequisite graph** | one node per course, an edge from each prerequisite to the course that needs it |
| **In-degree** | number of prerequisites a course still waits for |
| **Cycle** | a loop of prerequisites; makes finishing impossible |
| **Kahn's algorithm** | topological sort by repeatedly taking in-degree-0 nodes from a queue |
| **Level-by-level Kahn** | Kahn processed in waves; the wave count is the minimum number of semesters |
| **collections.deque** | queue with O(1) popleft |

---
**Conclusion:** Course Schedule is topological sort in disguise: turn each pair \`[a, b]\` into an edge \`b -> a\`, run Kahn's algorithm, and the courses come out in a valid order unless a prerequisite loop leaves some of them stuck, in which case the answer is \`false\` or \`[]\`. It runs in O(V + E), replaces a quadratic rescan, and extends naturally to the minimum number of semesters by processing the queue in waves. In Python the whole solution is a \`deque\`, two lists and one length check, with no recursion to worry about.`,
        examples: [
          { label: `canFinish and findOrder on normal, cyclic and tricky inputs`, code: `from collections import deque


def find_order(num_courses, prerequisites):
    """LeetCode 207/210. A pair [a, b] means: take b BEFORE a, so the edge is b -> a."""
    adj = [[] for _ in range(num_courses)]
    indegree = [0] * num_courses
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    order = []
    while queue:
        c = queue.popleft()
        order.append(c)
        for nxt in adj[c]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return order if len(order) == num_courses else []


def can_finish(num_courses, prerequisites):
    return len(find_order(num_courses, prerequisites)) == num_courses


def show(n, pre):
    pairs = "[" + ", ".join("[" + str(a) + ", " + str(b) + "]" for a, b in pre) + "]"
    return ("n=" + str(n) + " prereqs=" + pairs + " -> canFinish=" + str(can_finish(n, pre)).lower()
            + " order=" + str(find_order(n, pre)))


print(show(2, [[1, 0]]))  # n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
print(show(2, [[1, 0], [0, 1]]))  # n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
print(show(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))  # n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
print(show(1, []))  # n=1 prereqs=[] -> canFinish=true order=[0]
print(show(3, []))  # n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
print(show(3, [[0, 0]]))  # n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
print(show(5, [[1, 0], [2, 1], [0, 2], [4, 3]]))  # n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
print(show(2, [[1, 0], [1, 0]]))  # n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
print(show(6, [[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]))  # n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]` },
          { label: `Brute-force rescan vs Kahn step counts, plus minimum semesters`, code: `from collections import deque


def brute_force(n, prerequisites):
    """Rescan all courses from the start; take the first whose prerequisites are all taken."""
    needs = [[] for _ in range(n)]
    for a, b in prerequisites:
        needs[a].append(b)
    taken = [False] * n
    count, steps = 0, 0
    progress = True
    while progress:
        progress = False
        for c in range(n):
            steps += 1                                 # look at course c
            if taken[c]:
                continue
            steps += len(needs[c])                     # check each of its prerequisites
            if all(taken[p] for p in needs[c]):
                taken[c] = True
                count += 1
                progress = True
                break                                  # restart the scan from course 0
    return count == n, steps


def kahn(n, prerequisites):
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    queue = deque(c for c in range(n) if indegree[c] == 0)
    count, steps = 0, 0
    while queue:
        c = queue.popleft()
        count += 1
        steps += 1                                     # one pop per course
        for nxt in adj[c]:
            steps += 1                                 # one decrement per edge
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return count == n, steps


def semesters(n, prerequisites):
    """Kahn level by level: every course whose prerequisites are done is taken together."""
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    level = [c for c in range(n) if indegree[c] == 0]
    terms, done = 0, 0
    while level:
        terms += 1
        done += len(level)
        nxt_level = []
        for c in level:
            for nxt in adj[c]:
                indegree[nxt] -= 1
                if indegree[nxt] == 0:
                    nxt_level.append(nxt)
        level = nxt_level
    return terms if done == n else -1


for n in [10, 100, 1000, 3000]:
    chain = [[i, i + 1] for i in range(n - 1)]         # course i needs course i + 1
    ok1, s1 = brute_force(n, chain)
    ok2, s2 = kahn(n, chain)
    print("chain n=" + str(n) + " possible=" + str(ok1 and ok2).lower()
          + " brute_steps=" + str(s1) + " kahn_steps=" + str(s2))

six = [[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]
print("minimum semesters for the 6-course plan: " + str(semesters(6, six)))  # minimum semesters for the 6-course plan: 4
print("minimum semesters with a cycle: " + str(semesters(2, [[0, 1], [1, 0]])))  # minimum semesters with a cycle: -1` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"There are numCourses courses labelled 0 to numCourses - 1, and a list of pairs [a, b] meaning you must take course b before course a. Can you finish all the courses? If so, give me one valid order. Please code it in JavaScript."

**What a strong answer should cover:**
- Model it as a directed graph with an edge b -> a for each pair, and recognise that "can finish" means "the graph has no cycle".
- Kahn's algorithm: in-degree counts, a queue of courses with no remaining prerequisites, and \`len(order) == numCourses\` as the cycle test; the same function answers both Course Schedule I and II.
- O(V + E) time and space, compared with the O(V * (V + E)) rescan brute force.
- The DFS three-colour alternative, and the follow-up of minimum semesters via level-by-level Kahn.
- JavaScript specifics: an array with a head index (not \`shift()\`) as the queue, \`Array.from({ length: n }, () => [])\` for adjacency, destructuring \`[a, b]\` pairs, and returning \`[]\` rather than \`null\` when impossible.

**Clarifying questions expected:**
- "Does [a, b] mean b comes before a?"
- "Do you want just true/false, or an order — and is any valid order acceptable?"
- "Can pairs repeat, or can a course list itself?"

**Code / implementation expected:** Yes — \`findOrder\` (and \`canFinish\` on top of it) in JavaScript, using Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You have just enrolled at a university and the catalogue says: *"Data Structures requires Intro to Programming. Algorithms requires Data Structures and Discrete Maths. Compilers requires Algorithms."* You want to know two things before you sign up: **can I actually finish every course**, and **in what order should I take them**?

Usually the answer is yes. But catalogues are written by humans, and sometimes two departments each list the other course as a prerequisite: "Statistics requires Probability", "Probability requires Statistics". Then nobody can ever take either one, and any student who needs both is stuck forever.

That is the **Course Schedule** problem. LeetCode 207 asks the yes/no question ("can you finish all courses?") and LeetCode 210 asks for an actual order. Both are the same algorithm: a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) that also reports a cycle.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the pair \`[a, b]\` mean "take b before a"? | The direction of every edge depends on it. In the LeetCode statement, \`[a, b]\` means b is the prerequisite of a, so the edge is \`b -> a\`. |
| Do you want yes/no, or an order? | Yes/no is Course Schedule I; an order (or \`[]\` if impossible) is Course Schedule II. Same code, different return. |
| If several orders work, is any one fine? | Usually yes. If they want the smallest course number first, you swap the queue for a min-heap. |
| Can there be duplicate pairs or a course that requires itself? | Duplicates are harmless with in-degree counting; \`[0, 0]\` is a cycle of length 1 and makes the answer false. |
| How many courses and pairs? | With up to 10^5 of each, O(V + E) is required and a recursive DFS may run out of stack. |

## 3. Turning Courses into a Graph

📌 **Interview term: Prerequisite graph** — a directed graph with one node per course and an edge \`b -> a\` for every pair \`[a, b]\` ("b before a"). Courses with no incoming edge can be taken right away.

📌 **Interview term: In-degree** — the number of edges pointing into a node. For a course, it is **the number of prerequisites still not taken**.

For \`numCourses = 4\` and \`prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="Course 0 points to courses 1 and 2, and both of those point to course 3">
  <defs>
    <marker id="cs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">course 0</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="260" y="20" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="45" text-anchor="middle">course 1</text>
  <text class="d-sub" x="325" y="66" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="260" y="180" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="205" text-anchor="middle">course 2</text>
  <text class="d-sub" x="325" y="226" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="500" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="565" y="125" text-anchor="middle">course 3</text>
  <text class="d-sub" x="565" y="146" text-anchor="middle">in-degree 2</text>
  <path class="d-edge" d="M 160 115 L 254 64" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 160 143 L 254 194" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 64 L 494 115" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 194 L 494 143" marker-end="url(#cs1-arrow)"/>
</svg>

Course 0 has no prerequisites. Taking it drops courses 1 and 2 to in-degree 0. Taking both of those drops course 3 to 0. One valid plan is \`[0, 1, 2, 3]\`; \`[0, 2, 1, 3]\` is equally valid.

📌 **Interview term: Cycle** — a loop of prerequisites such as \`0 -> 1 -> 2 -> 0\`. Every course on it waits for another course on it, so none can ever be taken. **"Can I finish all courses?" is exactly "does the prerequisite graph have no cycle?"** — the general check is covered in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Courses 0 1 2 form a loop so none can start, while course 3 leads to course 4 and both are fine">
  <defs>
    <marker id="cs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="150" y="20" width="110" height="50" rx="8"/>
  <text class="d-text" x="205" y="51" text-anchor="middle">course 0</text>
  <rect class="d-box-muted" x="30" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="85" y="201" text-anchor="middle">course 2</text>
  <rect class="d-box-muted" x="270" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="325" y="201" text-anchor="middle">course 1</text>
  <path class="d-edge-accent" d="M 240 74 L 300 164" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 266 195 L 146 195" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 100 166 L 170 76" marker-end="url(#cs2-arrow)"/>
  <rect class="d-box-accent" x="460" y="95" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">course 3</text>
  <rect class="d-box" x="460" y="190" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="221" text-anchor="middle">course 4</text>
  <path class="d-edge" d="M 515 145 L 515 184" marker-end="url(#cs2-arrow)"/>
</svg>

This is the input \`numCourses = 5, prerequisites = [[1, 0], [2, 1], [0, 2], [4, 3]]\`. Courses 3 and 4 are fine, but 0, 1 and 2 form a loop, so the whole plan is impossible and the answer is \`false\` (and \`[]\` for the order).

## 4. Brute Force First

The most literal approach: keep scanning the course list from the start, and take the first course whose prerequisites are all already taken; repeat until everything is taken or a full scan finds nothing. It is correct — if a scan finds nothing, every remaining course waits for another remaining course, which means a cycle.

But each round rescans from course 0 and rechecks prerequisite lists. On a chain where course \`i\` needs course \`i + 1\` (so the last course must go first), Example 2 counts exactly \`n^2 + 2n - 1\` steps: 1,001,999 for 1,000 courses and 9,005,999 for 3,000. That is O(V * (V + E)).

## 5. The Optimal Approach: Kahn's Algorithm

The waste in the brute force is re-checking courses that cannot have changed. Kahn's algorithm only looks at a course when one of its prerequisites has **just** been taken:

1. Build the adjacency list \`b -> a\` and count each course's in-degree.
2. Put every course with in-degree 0 into a queue.
3. Pop a course, append it to the order, and decrement the in-degree of every course that needed it. When one reaches 0, push it.
4. If the order has \`numCourses\` entries, return it (or \`true\`). Otherwise there is a cycle: return \`[]\` (or \`false\`).

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing in-degree-0 nodes with a queue. Each course is pushed and popped once and each prerequisite pair is processed once, so it is O(V + E): **2n - 1** steps on the same chain (1,999 for 1,000 courses).

**Why one function solves both versions.** \`canFinish\` is just \`len(findOrder(...)) == numCourses\`. Writing \`findOrder\` first and deriving \`canFinish\` keeps one source of truth.

**The DFS alternative.** A depth-first search with three colours (unvisited, in progress, done) answers the same question: meeting an "in progress" course means a cycle, and the reverse finish order is a valid plan. It has the same O(V + E) cost but uses recursion; the trade-offs are compared in [Course Schedule: Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

📌 **Interview term: Level-by-level Kahn** — process the queue one "wave" at a time; every course in a wave can be taken in the same semester. The number of waves is the **minimum number of semesters** (the "Parallel Courses" variant). For the six-course plan \`[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]\` the waves are \`{0, 1}\`, \`{2}\`, \`{3}\`, \`{4, 5}\`, so Example 2 prints 4.

## 6. The Code in JavaScript

~~~javascript
function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    adj[b].push(a);
    indegree[a]++;
  }
  const queue = [];
  for (let c = 0; c < numCourses; c++) if (indegree[c] === 0) queue.push(c);
  const order = [];
  for (let head = 0; head < queue.length; head++) {   // index pointer instead of shift()
    const c = queue[head];
    order.push(c);
    for (const next of adj[c]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return order.length === numCourses ? order : [];
}

function canFinish(numCourses, prerequisites) {
  return findOrder(numCourses, prerequisites).length === numCourses;
}
~~~

**Line by line:**

- \`for (const [a, b] of prerequisites)\` destructures each pair; the edge is \`adj[b].push(a)\` because b comes first. Getting this backwards does not crash — it quietly returns the reverse of a valid plan.
- \`Array.from({ length: numCourses }, () => [])\` gives every course its own array; \`new Array(n).fill([])\` would share one array between all of them.
- The \`for (let head = 0; head < queue.length; head++)\` loop reads the array as a queue. It keeps working while new items are pushed, and each pop is O(1), unlike \`shift()\`.
- \`if (--indegree[next] === 0)\` decrements and tests in one step; use \`===\` so no type coercion sneaks in.
- Returning \`[]\` (not \`null\` or \`undefined\`) for an impossible plan matches the LeetCode 210 contract, and \`.length\` on it is always safe.

**The brute force, for comparison** (Example 2). \`needs[c].every((p) => taken[p])\` stops at the first missing prerequisite, but the outer loop still restarts at course 0 each round:

~~~javascript
function bruteForce(n, prerequisites) {
  const needs = Array.from({ length: n }, () => []);
  for (const [a, b] of prerequisites) needs[a].push(b);
  const taken = new Array(n).fill(false);
  let count = 0, steps = 0, progress = true;
  while (progress) {
    progress = false;
    for (let c = 0; c < n; c++) {
      steps++;                                         // look at course c
      if (taken[c]) continue;
      steps += needs[c].length;                        // check each of its prerequisites
      if (needs[c].every((p) => taken[p])) {
        taken[c] = true;
        count++;
        progress = true;
        break;                                         // restart the scan from course 0
      }
    }
  }
  return [count === n, steps];
}
~~~

**If you choose DFS in JavaScript:** recursion depth equals the longest chain, and a deep enough chain throws \`RangeError: Maximum call stack size exceeded\` (it did on Node 22 for a 200,000-course chain). Kahn has no recursion.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (they use only \`console.log\`, so they also run in the browser runner on this page). The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — canFinish and findOrder on normal, cyclic and tricky inputs** prints:

~~~text
n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
n=1 prereqs=[] -> canFinish=true order=[0]
n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]
~~~

**Example 2 — Brute-force rescan vs Kahn step counts, plus minimum semesters** prints:

~~~text
chain n=10 possible=true brute_steps=119 kahn_steps=19
chain n=100 possible=true brute_steps=10199 kahn_steps=199
chain n=1000 possible=true brute_steps=1001999 kahn_steps=1999
chain n=3000 possible=true brute_steps=9005999 kahn_steps=5999
minimum semesters for the 6-course plan: 4
minimum semesters with a cycle: -1
~~~

**Reading the output:** In Example 1, \`[[1, 0]]\` gives \`[0, 1]\` (0 first), the two-course loop gives \`false\` and \`[]\`, and the self-loop \`[[0, 0]]\` is also impossible. The five-course input is \`false\` even though courses 3 and 4 are fine, because the question is about **all** courses. The duplicated pair \`[[1, 0], [1, 0]]\` still works: course 1 starts at in-degree 2 and is decremented twice. In Example 2, both methods agree on every chain, but the brute force grows like n^2 (\`n^2 + 2n - 1\`) while Kahn grows like n (\`2n - 1\` = V + E); the semester count is 4, and -1 marks a plan with a cycle.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rescan until stuck (brute force) | O(V * (V + E)) | O(V + E) | up to V rounds, each rescanning courses and their prerequisite lists |
| Kahn's algorithm | O(V + E) | O(V + E) | each course queued once, each pair decremented once |
| Three-colour DFS | O(V + E) | O(V + E) | each course visited once; recursion depth up to V |
| Level-by-level Kahn (semesters) | O(V + E) | O(V + E) | same work, grouped into waves |

V is \`numCourses\` and E is the number of prerequisite pairs.

## 9. Edge Cases

- **No prerequisites at all:** every course has in-degree 0; the answer is \`true\` and \`[0, 1, ..., n-1]\`.
- **One course:** \`[0]\`.
- **A course that requires itself, \`[0, 0]\`:** a cycle; the answer is \`false\`.
- **Duplicate pairs:** harmless as long as you count and decrement each copy.
- **A cycle in one corner of a big catalogue:** still \`false\` for the whole question, even though most courses are fine.
- **Courses that appear in no pair:** they have in-degree 0 and are placed at the start; do not build the node list only from the pairs.

## Common Pitfalls

- **Reversed edges.** \`[a, b]\` means b first, so \`adj[b].push(a)\`. The reversed graph gives a reversed (wrong) plan with no error.
- **Seeding the queue from the pairs only.** Loop over every course id from 0 to \`numCourses - 1\`.
- **\`new Array(n).fill([])\`.** All slots share one array.
- **\`queue.shift()\` in the loop.** It re-indexes the array; use a head index.
- **Returning a partial order.** On a cycle, return \`[]\`, not the half-built array.
- **Recursive DFS on long chains.** \`RangeError\` once the call stack is exhausted.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Each pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a, b]</code> is an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b -&gt; a</code>. Finishing every course is possible exactly when this directed graph has no cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees, push every course at 0 into an array, read it with a head index, decrement the courses that needed it and push any that hit 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order.length === numCourses</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canFinish</code> is that length check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not brute force:</strong> <span style="color:#f0e2c8;">Rescanning for a ready course is O(V * (V + E)); Kahn only touches a course when a prerequisite was just taken: O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code> for adjacency lists, a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> comparisons, and no recursion.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the minimum number of semesters if you can take any number of courses at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run Kahn in waves: each wave is one semester. The count of waves is the answer (4 for the six-course plan in Example 2), or -1 on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer "is course x a prerequisite of course y" for many queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Precompute reachability: BFS from every course, or walk courses in topological order and merge each course ancestor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> into its children. Then each query is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.has</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if course ids were strings like "CS101"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from name to neighbour array and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for in-degrees, or map names to indices first. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps insertion order, so output stays deterministic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with DFS instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, three colours: in-progress means cycle, and the reverse finish order is a plan. Deep chains can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>, so Kahn is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.shift()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The specification moves every remaining element down by one on each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, so V shifts can cost O(V^2). A head index is O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prerequisite graph** | one node per course, an edge from each prerequisite to the course that needs it |
| **In-degree** | number of prerequisites a course still waits for |
| **Cycle** | a loop of prerequisites; makes finishing impossible |
| **Kahn's algorithm** | topological sort by repeatedly taking in-degree-0 nodes from a queue |
| **Level-by-level Kahn** | Kahn processed in waves; the wave count is the minimum number of semesters |
| **Head index** | read pointer that turns an array into an O(1) queue |

---
**Conclusion:** Course Schedule is topological sort in disguise: turn each pair \`[a, b]\` into an edge \`b -> a\`, run Kahn's algorithm, and the courses come out in a valid order unless a prerequisite loop leaves some of them stuck, in which case the answer is \`false\` or \`[]\`. It runs in O(V + E), replaces a quadratic rescan, and extends naturally to the minimum number of semesters by processing the queue in waves. In JavaScript the whole solution is two arrays, a head index used as a queue, and one length check, with no recursion to worry about.`,
        examples: [
          { label: `canFinish and findOrder on normal, cyclic and tricky inputs`, code: `// LeetCode 207/210. A pair [a, b] means: take b BEFORE a, so the edge is b -> a.
function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    adj[b].push(a);
    indegree[a]++;
  }
  const queue = [];
  for (let c = 0; c < numCourses; c++) if (indegree[c] === 0) queue.push(c);
  const order = [];
  for (let head = 0; head < queue.length; head++) {   // index pointer instead of shift()
    const c = queue[head];
    order.push(c);
    for (const next of adj[c]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return order.length === numCourses ? order : [];
}

function canFinish(numCourses, prerequisites) {
  return findOrder(numCourses, prerequisites).length === numCourses;
}

const fmt = (a) => '[' + a.join(', ') + ']';

function show(n, pre) {
  const pairs = '[' + pre.map((p) => fmt(p)).join(', ') + ']';
  return 'n=' + n + ' prereqs=' + pairs + ' -> canFinish=' + canFinish(n, pre) +
    ' order=' + fmt(findOrder(n, pre));
}

console.log(show(2, [[1, 0]])); // n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
console.log(show(2, [[1, 0], [0, 1]])); // n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
console.log(show(4, [[1, 0], [2, 0], [3, 1], [3, 2]])); // n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
console.log(show(1, [])); // n=1 prereqs=[] -> canFinish=true order=[0]
console.log(show(3, [])); // n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
console.log(show(3, [[0, 0]])); // n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
console.log(show(5, [[1, 0], [2, 1], [0, 2], [4, 3]])); // n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
console.log(show(2, [[1, 0], [1, 0]])); // n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
console.log(show(6, [[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]])); // n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]` },
          { label: `Brute-force rescan vs Kahn step counts, plus minimum semesters`, code: `// Rescan all courses from the start; take the first whose prerequisites are all taken.
function bruteForce(n, prerequisites) {
  const needs = Array.from({ length: n }, () => []);
  for (const [a, b] of prerequisites) needs[a].push(b);
  const taken = new Array(n).fill(false);
  let count = 0, steps = 0, progress = true;
  while (progress) {
    progress = false;
    for (let c = 0; c < n; c++) {
      steps++;                                         // look at course c
      if (taken[c]) continue;
      steps += needs[c].length;                        // check each of its prerequisites
      if (needs[c].every((p) => taken[p])) {
        taken[c] = true;
        count++;
        progress = true;
        break;                                         // restart the scan from course 0
      }
    }
  }
  return [count === n, steps];
}

function kahn(n, prerequisites) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indegree[a]++; }
  const queue = [];
  for (let c = 0; c < n; c++) if (indegree[c] === 0) queue.push(c);
  let count = 0, steps = 0;
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    count++;
    steps++;                                           // one pop per course
    for (const next of adj[c]) {
      steps++;                                         // one decrement per edge
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return [count === n, steps];
}

// Kahn level by level: every course whose prerequisites are done is taken together.
function semesters(n, prerequisites) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indegree[a]++; }
  let level = [];
  for (let c = 0; c < n; c++) if (indegree[c] === 0) level.push(c);
  let terms = 0, done = 0;
  while (level.length > 0) {
    terms++;
    done += level.length;
    const nextLevel = [];
    for (const c of level) {
      for (const next of adj[c]) if (--indegree[next] === 0) nextLevel.push(next);
    }
    level = nextLevel;
  }
  return done === n ? terms : -1;
}

for (const n of [10, 100, 1000, 3000]) {
  const chain = [];
  for (let i = 0; i < n - 1; i++) chain.push([i, i + 1]);  // course i needs course i + 1
  const [ok1, s1] = bruteForce(n, chain);
  const [ok2, s2] = kahn(n, chain);
  console.log('chain n=' + n + ' possible=' + (ok1 && ok2) + ' brute_steps=' + s1 + ' kahn_steps=' + s2);
}

const six = [[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]];
console.log('minimum semesters for the 6-course plan: ' + semesters(6, six)); // minimum semesters for the 6-course plan: 4
console.log('minimum semesters with a cycle: ' + semesters(2, [[0, 1], [1, 0]])); // minimum semesters with a cycle: -1` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"There are numCourses courses labelled 0 to numCourses - 1, and a list of pairs [a, b] meaning you must take course b before course a. Can you finish all the courses? If so, give me one valid order. Please code it in Java."

**What a strong answer should cover:**
- Model it as a directed graph with an edge b -> a for each pair, and recognise that "can finish" means "the graph has no cycle".
- Kahn's algorithm: in-degree counts, a queue of courses with no remaining prerequisites, and \`len(order) == numCourses\` as the cycle test; the same function answers both Course Schedule I and II.
- O(V + E) time and space, compared with the O(V * (V + E)) rescan brute force.
- The DFS three-colour alternative, and the follow-up of minimum semesters via level-by-level Kahn.
- Java specifics: \`List<List<Integer>>\` adjacency, \`int[]\` in-degrees, \`ArrayDeque<Integer>\` as the queue, returning \`new int[0]\` for impossible, and \`StackOverflowError\` risk with recursive DFS.

**Clarifying questions expected:**
- "Does [a, b] mean b comes before a?"
- "Do you want just true/false, or an order — and is any valid order acceptable?"
- "Can pairs repeat, or can a course list itself?"

**Code / implementation expected:** Yes — \`findOrder\` (and \`canFinish\` on top of it) in Java, using Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You have just enrolled at a university and the catalogue says: *"Data Structures requires Intro to Programming. Algorithms requires Data Structures and Discrete Maths. Compilers requires Algorithms."* You want to know two things before you sign up: **can I actually finish every course**, and **in what order should I take them**?

Usually the answer is yes. But catalogues are written by humans, and sometimes two departments each list the other course as a prerequisite: "Statistics requires Probability", "Probability requires Statistics". Then nobody can ever take either one, and any student who needs both is stuck forever.

That is the **Course Schedule** problem. LeetCode 207 asks the yes/no question ("can you finish all courses?") and LeetCode 210 asks for an actual order. Both are the same algorithm: a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) that also reports a cycle.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the pair \`[a, b]\` mean "take b before a"? | The direction of every edge depends on it. In the LeetCode statement, \`[a, b]\` means b is the prerequisite of a, so the edge is \`b -> a\`. |
| Do you want yes/no, or an order? | Yes/no is Course Schedule I; an order (or \`[]\` if impossible) is Course Schedule II. Same code, different return. |
| If several orders work, is any one fine? | Usually yes. If they want the smallest course number first, you swap the queue for a min-heap. |
| Can there be duplicate pairs or a course that requires itself? | Duplicates are harmless with in-degree counting; \`[0, 0]\` is a cycle of length 1 and makes the answer false. |
| How many courses and pairs? | With up to 10^5 of each, O(V + E) is required and a recursive DFS may run out of stack. |

## 3. Turning Courses into a Graph

📌 **Interview term: Prerequisite graph** — a directed graph with one node per course and an edge \`b -> a\` for every pair \`[a, b]\` ("b before a"). Courses with no incoming edge can be taken right away.

📌 **Interview term: In-degree** — the number of edges pointing into a node. For a course, it is **the number of prerequisites still not taken**.

For \`numCourses = 4\` and \`prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="Course 0 points to courses 1 and 2, and both of those point to course 3">
  <defs>
    <marker id="cs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">course 0</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="260" y="20" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="45" text-anchor="middle">course 1</text>
  <text class="d-sub" x="325" y="66" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="260" y="180" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="205" text-anchor="middle">course 2</text>
  <text class="d-sub" x="325" y="226" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="500" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="565" y="125" text-anchor="middle">course 3</text>
  <text class="d-sub" x="565" y="146" text-anchor="middle">in-degree 2</text>
  <path class="d-edge" d="M 160 115 L 254 64" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 160 143 L 254 194" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 64 L 494 115" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 194 L 494 143" marker-end="url(#cs1-arrow)"/>
</svg>

Course 0 has no prerequisites. Taking it drops courses 1 and 2 to in-degree 0. Taking both of those drops course 3 to 0. One valid plan is \`[0, 1, 2, 3]\`; \`[0, 2, 1, 3]\` is equally valid.

📌 **Interview term: Cycle** — a loop of prerequisites such as \`0 -> 1 -> 2 -> 0\`. Every course on it waits for another course on it, so none can ever be taken. **"Can I finish all courses?" is exactly "does the prerequisite graph have no cycle?"** — the general check is covered in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Courses 0 1 2 form a loop so none can start, while course 3 leads to course 4 and both are fine">
  <defs>
    <marker id="cs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="150" y="20" width="110" height="50" rx="8"/>
  <text class="d-text" x="205" y="51" text-anchor="middle">course 0</text>
  <rect class="d-box-muted" x="30" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="85" y="201" text-anchor="middle">course 2</text>
  <rect class="d-box-muted" x="270" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="325" y="201" text-anchor="middle">course 1</text>
  <path class="d-edge-accent" d="M 240 74 L 300 164" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 266 195 L 146 195" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 100 166 L 170 76" marker-end="url(#cs2-arrow)"/>
  <rect class="d-box-accent" x="460" y="95" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">course 3</text>
  <rect class="d-box" x="460" y="190" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="221" text-anchor="middle">course 4</text>
  <path class="d-edge" d="M 515 145 L 515 184" marker-end="url(#cs2-arrow)"/>
</svg>

This is the input \`numCourses = 5, prerequisites = [[1, 0], [2, 1], [0, 2], [4, 3]]\`. Courses 3 and 4 are fine, but 0, 1 and 2 form a loop, so the whole plan is impossible and the answer is \`false\` (and \`[]\` for the order).

## 4. Brute Force First

The most literal approach: keep scanning the course list from the start, and take the first course whose prerequisites are all already taken; repeat until everything is taken or a full scan finds nothing. It is correct — if a scan finds nothing, every remaining course waits for another remaining course, which means a cycle.

But each round rescans from course 0 and rechecks prerequisite lists. On a chain where course \`i\` needs course \`i + 1\` (so the last course must go first), Example 2 counts exactly \`n^2 + 2n - 1\` steps: 1,001,999 for 1,000 courses and 9,005,999 for 3,000. That is O(V * (V + E)).

## 5. The Optimal Approach: Kahn's Algorithm

The waste in the brute force is re-checking courses that cannot have changed. Kahn's algorithm only looks at a course when one of its prerequisites has **just** been taken:

1. Build the adjacency list \`b -> a\` and count each course's in-degree.
2. Put every course with in-degree 0 into a queue.
3. Pop a course, append it to the order, and decrement the in-degree of every course that needed it. When one reaches 0, push it.
4. If the order has \`numCourses\` entries, return it (or \`true\`). Otherwise there is a cycle: return \`[]\` (or \`false\`).

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing in-degree-0 nodes with a queue. Each course is pushed and popped once and each prerequisite pair is processed once, so it is O(V + E): **2n - 1** steps on the same chain (1,999 for 1,000 courses).

**Why one function solves both versions.** \`canFinish\` is just \`len(findOrder(...)) == numCourses\`. Writing \`findOrder\` first and deriving \`canFinish\` keeps one source of truth.

**The DFS alternative.** A depth-first search with three colours (unvisited, in progress, done) answers the same question: meeting an "in progress" course means a cycle, and the reverse finish order is a valid plan. It has the same O(V + E) cost but uses recursion; the trade-offs are compared in [Course Schedule: Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

📌 **Interview term: Level-by-level Kahn** — process the queue one "wave" at a time; every course in a wave can be taken in the same semester. The number of waves is the **minimum number of semesters** (the "Parallel Courses" variant). For the six-course plan \`[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]\` the waves are \`{0, 1}\`, \`{2}\`, \`{3}\`, \`{4, 5}\`, so Example 2 prints 4.

## 6. The Code in Java

~~~java
static int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[numCourses];
    for (int[] p : prerequisites) {
        adj.get(p[1]).add(p[0]);
        indegree[p[0]]++;
    }
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) queue.add(c);
    int[] order = new int[numCourses];
    int taken = 0;
    while (!queue.isEmpty()) {
        int c = queue.poll();
        order[taken++] = c;
        for (int next : adj.get(c)) {
            if (--indegree[next] == 0) queue.add(next);
        }
    }
    return taken == numCourses ? order : new int[0];
}

static boolean canFinish(int numCourses, int[][] prerequisites) {
    return findOrder(numCourses, prerequisites).length == numCourses;
}
~~~

**Line by line:**

- \`adj.get(p[1]).add(p[0])\`: the pair is \`{a, b}\` = \`{p[0], p[1]}\`, and b comes first, so the edge is \`p[1] -> p[0]\`. Getting this backwards does not crash — it quietly returns the reverse of a valid plan.
- \`int[] indegree\` is primitive, so \`indegree[p[0]]++\` never boxes. The adjacency list holds \`Integer\`s, which is fine because each one is read once.
- \`ArrayDeque<Integer>\` is the FIFO queue; \`poll()\` returns \`null\` when empty, so the loop checks \`isEmpty()\` before unboxing into \`int c\`.
- The order is written straight into an \`int[]\` with a \`taken\` counter, which is what LeetCode 210 returns; \`new int[0]\` signals an impossible plan, and \`Arrays.toString\` prints it as \`[]\`.

**The brute force, for comparison** (Example 2). It returns \`long\` step counts because the counts grow like n^2:

~~~java
static long[] bruteForce(int n, int[][] prerequisites) {
    List<List<Integer>> needs = adjacency(n);
    for (int[] p : prerequisites) needs.get(p[0]).add(p[1]);
    boolean[] taken = new boolean[n];
    long count = 0, steps = 0;
    boolean progress = true;
    while (progress) {
        progress = false;
        for (int c = 0; c < n; c++) {
            steps++;                                       // look at course c
            if (taken[c]) continue;
            steps += needs.get(c).size();                  // check each of its prerequisites
            boolean ready = true;
            for (int p : needs.get(c)) if (!taken[p]) { ready = false; break; }
            if (ready) {
                taken[c] = true;
                count++;
                progress = true;
                break;                                     // restart the scan from course 0
            }
        }
    }
    return new long[]{count == n ? 1 : 0, steps};
}
~~~

**If you choose DFS in Java:** recursion depth equals the longest chain, and the default thread stack can throw \`StackOverflowError\` on long chains (a 200,000-node chain did here). Kahn has no recursion.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — canFinish and findOrder on normal, cyclic and tricky inputs** prints:

~~~text
n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
n=1 prereqs=[] -> canFinish=true order=[0]
n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]
~~~

**Example 2 — Brute-force rescan vs Kahn step counts, plus minimum semesters** prints:

~~~text
chain n=10 possible=true brute_steps=119 kahn_steps=19
chain n=100 possible=true brute_steps=10199 kahn_steps=199
chain n=1000 possible=true brute_steps=1001999 kahn_steps=1999
chain n=3000 possible=true brute_steps=9005999 kahn_steps=5999
minimum semesters for the 6-course plan: 4
minimum semesters with a cycle: -1
~~~

**Reading the output:** In Example 1, \`[[1, 0]]\` gives \`[0, 1]\` (0 first), the two-course loop gives \`false\` and \`[]\`, and the self-loop \`[[0, 0]]\` is also impossible. The five-course input is \`false\` even though courses 3 and 4 are fine, because the question is about **all** courses. The duplicated pair \`[[1, 0], [1, 0]]\` still works: course 1 starts at in-degree 2 and is decremented twice. In Example 2, both methods agree on every chain, but the brute force grows like n^2 (\`n^2 + 2n - 1\`) while Kahn grows like n (\`2n - 1\` = V + E); the semester count is 4, and -1 marks a plan with a cycle.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rescan until stuck (brute force) | O(V * (V + E)) | O(V + E) | up to V rounds, each rescanning courses and their prerequisite lists |
| Kahn's algorithm | O(V + E) | O(V + E) | each course queued once, each pair decremented once |
| Three-colour DFS | O(V + E) | O(V + E) | each course visited once; recursion depth up to V |
| Level-by-level Kahn (semesters) | O(V + E) | O(V + E) | same work, grouped into waves |

V is \`numCourses\` and E is the number of prerequisite pairs.

## 9. Edge Cases

- **No prerequisites at all:** every course has in-degree 0; the answer is \`true\` and \`[0, 1, ..., n-1]\`.
- **One course:** \`[0]\`.
- **A course that requires itself, \`[0, 0]\`:** a cycle; the answer is \`false\`.
- **Duplicate pairs:** harmless as long as you count and decrement each copy.
- **A cycle in one corner of a big catalogue:** still \`false\` for the whole question, even though most courses are fine.
- **Courses that appear in no pair:** they have in-degree 0 and are placed at the start; do not build the node list only from the pairs.

## Common Pitfalls

- **Reversed edges.** \`{a, b}\` means b first, so \`adj.get(p[1]).add(p[0])\`. The reversed graph gives a reversed (wrong) plan with no error.
- **Seeding the queue from the pairs only.** Loop over every course id from 0 to \`numCourses - 1\`.
- **Unboxing \`null\`.** \`int c = queue.poll()\` on an empty queue throws \`NullPointerException\`; loop on \`!queue.isEmpty()\`.
- **Returning a partial order.** On a cycle, return \`new int[0]\`, not a half-filled array (its tail would be zeros, which look like course 0).
- **\`int\` overflow in counters.** Step or path counts that grow like n^2 need \`long\`.
- **Recursive DFS on long chains.** \`StackOverflowError\` with the default stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Each pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{a, b}</code> is an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b -&gt; a</code>. Finishing every course is possible exactly when this directed graph has no cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, seed an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with every course at 0, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code>, write it into the order, decrement the courses that needed it and enqueue any that hit 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Answer:</strong> <span style="color:#f0e2c8;">the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> order if all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numCourses</code> were taken, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[0]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canFinish</code> is the length check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not brute force:</strong> <span style="color:#f0e2c8;">Rescanning for a ready course is O(V * (V + E)); Kahn only touches a course when a prerequisite was just taken: O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;">primitive in-degrees, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEmpty()</code> before unboxing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for big counters, and no recursion, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the minimum number of semesters if you can take any number of courses at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run Kahn in waves: each wave is one semester. The count of waves is the answer (4 for the six-course plan in Example 2), or -1 on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer "is course x a prerequisite of course y" for many queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Precompute reachability: BFS from every course, or walk courses in topological order and OR each course <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitSet</code> of ancestors into its children. Then each query is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits.get(x)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new int[0]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It matches LeetCode 210, and callers can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.length</code> without a null check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with DFS instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, three colours: in-progress means cycle, and the reverse finish order is a plan. Recursive DFS can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> on deep chains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is array-backed and fast for FIFO use; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> is LIFO (wrong order for BFS-style Kahn) and synchronized.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prerequisite graph** | one node per course, an edge from each prerequisite to the course that needs it |
| **In-degree** | number of prerequisites a course still waits for |
| **Cycle** | a loop of prerequisites; makes finishing impossible |
| **Kahn's algorithm** | topological sort by repeatedly taking in-degree-0 nodes from a queue |
| **Level-by-level Kahn** | Kahn processed in waves; the wave count is the minimum number of semesters |
| **ArrayDeque** | array-backed FIFO queue; poll returns null when empty |

---
**Conclusion:** Course Schedule is topological sort in disguise: turn each pair \`[a, b]\` into an edge \`b -> a\`, run Kahn's algorithm, and the courses come out in a valid order unless a prerequisite loop leaves some of them stuck, in which case the answer is \`false\` or \`[]\`. It runs in O(V + E), replaces a quadratic rescan, and extends naturally to the minimum number of semesters by processing the queue in waves. In Java the whole solution is an \`ArrayDeque\`, a primitive in-degree array and one length check, with no recursion to worry about.`,
        examples: [
          { label: `canFinish and findOrder on normal, cyclic and tricky inputs`, code: `import java.util.*;

public class Main {
    // LeetCode 207/210. A pair {a, b} means: take b BEFORE a, so the edge is b -> a.
    static int[] findOrder(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[numCourses];
        for (int[] p : prerequisites) {
            adj.get(p[1]).add(p[0]);
            indegree[p[0]]++;
        }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) queue.add(c);
        int[] order = new int[numCourses];
        int taken = 0;
        while (!queue.isEmpty()) {
            int c = queue.poll();
            order[taken++] = c;
            for (int next : adj.get(c)) {
                if (--indegree[next] == 0) queue.add(next);
            }
        }
        return taken == numCourses ? order : new int[0];
    }

    static boolean canFinish(int numCourses, int[][] prerequisites) {
        return findOrder(numCourses, prerequisites).length == numCourses;
    }

    static String show(int n, int[][] pre) {
        StringJoiner pairs = new StringJoiner(", ", "[", "]");
        for (int[] p : pre) pairs.add(Arrays.toString(p));
        return "n=" + n + " prereqs=" + pairs + " -> canFinish=" + canFinish(n, pre)
            + " order=" + Arrays.toString(findOrder(n, pre));
    }

    public static void main(String[] args) {
        System.out.println(show(2, new int[][]{{1, 0}}));
        System.out.println(show(2, new int[][]{{1, 0}, {0, 1}}));
        System.out.println(show(4, new int[][]{{1, 0}, {2, 0}, {3, 1}, {3, 2}}));
        System.out.println(show(1, new int[][]{}));
        System.out.println(show(3, new int[][]{}));
        System.out.println(show(3, new int[][]{{0, 0}}));
        System.out.println(show(5, new int[][]{{1, 0}, {2, 1}, {0, 2}, {4, 3}}));
        System.out.println(show(2, new int[][]{{1, 0}, {1, 0}}));
        System.out.println(show(6, new int[][]{{2, 0}, {2, 1}, {3, 2}, {4, 3}, {5, 3}}));
    }
}` },
          { label: `Brute-force rescan vs Kahn step counts, plus minimum semesters`, code: `import java.util.*;

public class Main {
    static List<List<Integer>> adjacency(int n) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        return adj;
    }

    // Rescan all courses from the start; take the first whose prerequisites are all taken.
    static long[] bruteForce(int n, int[][] prerequisites) {
        List<List<Integer>> needs = adjacency(n);
        for (int[] p : prerequisites) needs.get(p[0]).add(p[1]);
        boolean[] taken = new boolean[n];
        long count = 0, steps = 0;
        boolean progress = true;
        while (progress) {
            progress = false;
            for (int c = 0; c < n; c++) {
                steps++;                                       // look at course c
                if (taken[c]) continue;
                steps += needs.get(c).size();                  // check each of its prerequisites
                boolean ready = true;
                for (int p : needs.get(c)) if (!taken[p]) { ready = false; break; }
                if (ready) {
                    taken[c] = true;
                    count++;
                    progress = true;
                    break;                                     // restart the scan from course 0
                }
            }
        }
        return new long[]{count == n ? 1 : 0, steps};
    }

    static long[] kahn(int n, int[][] prerequisites) {
        List<List<Integer>> adj = adjacency(n);
        int[] indegree = new int[n];
        for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indegree[p[0]]++; }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int c = 0; c < n; c++) if (indegree[c] == 0) queue.add(c);
        long count = 0, steps = 0;
        while (!queue.isEmpty()) {
            int c = queue.poll();
            count++;
            steps++;                                           // one pop per course
            for (int next : adj.get(c)) {
                steps++;                                       // one decrement per edge
                if (--indegree[next] == 0) queue.add(next);
            }
        }
        return new long[]{count == n ? 1 : 0, steps};
    }

    // Kahn level by level: every course whose prerequisites are done is taken together.
    static int semesters(int n, int[][] prerequisites) {
        List<List<Integer>> adj = adjacency(n);
        int[] indegree = new int[n];
        for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indegree[p[0]]++; }
        List<Integer> level = new ArrayList<>();
        for (int c = 0; c < n; c++) if (indegree[c] == 0) level.add(c);
        int terms = 0, done = 0;
        while (!level.isEmpty()) {
            terms++;
            done += level.size();
            List<Integer> nextLevel = new ArrayList<>();
            for (int c : level)
                for (int next : adj.get(c)) if (--indegree[next] == 0) nextLevel.add(next);
            level = nextLevel;
        }
        return done == n ? terms : -1;
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 100, 1000, 3000}) {
            int[][] chain = new int[n - 1][];
            for (int i = 0; i < n - 1; i++) chain[i] = new int[]{i, i + 1};  // course i needs course i + 1
            long[] a = bruteForce(n, chain), b = kahn(n, chain);
            System.out.println("chain n=" + n + " possible=" + (a[0] == 1 && b[0] == 1)
                + " brute_steps=" + a[1] + " kahn_steps=" + b[1]);
        }
        int[][] six = {{2, 0}, {2, 1}, {3, 2}, {4, 3}, {5, 3}};
        System.out.println("minimum semesters for the 6-course plan: " + semesters(6, six));      // 4
        System.out.println("minimum semesters with a cycle: " + semesters(2, new int[][]{{0, 1}, {1, 0}}));  // -1
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"There are numCourses courses labelled 0 to numCourses - 1, and a list of pairs [a, b] meaning you must take course b before course a. Can you finish all the courses? If so, give me one valid order. Please code it in C++."

**What a strong answer should cover:**
- Model it as a directed graph with an edge b -> a for each pair, and recognise that "can finish" means "the graph has no cycle".
- Kahn's algorithm: in-degree counts, a queue of courses with no remaining prerequisites, and \`len(order) == numCourses\` as the cycle test; the same function answers both Course Schedule I and II.
- O(V + E) time and space, compared with the O(V * (V + E)) rescan brute force.
- The DFS three-colour alternative, and the follow-up of minimum semesters via level-by-level Kahn.
- C++ specifics: \`vector<vector<int>>\` adjacency, \`std::queue<int>\` (\`front()\` then \`pop()\`), \`order.reserve(n)\`, returning an empty vector for impossible, and native stack overflow with recursive DFS.

**Clarifying questions expected:**
- "Does [a, b] mean b comes before a?"
- "Do you want just true/false, or an order — and is any valid order acceptable?"
- "Can pairs repeat, or can a course list itself?"

**Code / implementation expected:** Yes — \`findOrder\` (and \`canFinish\` on top of it) in C++, using Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You have just enrolled at a university and the catalogue says: *"Data Structures requires Intro to Programming. Algorithms requires Data Structures and Discrete Maths. Compilers requires Algorithms."* You want to know two things before you sign up: **can I actually finish every course**, and **in what order should I take them**?

Usually the answer is yes. But catalogues are written by humans, and sometimes two departments each list the other course as a prerequisite: "Statistics requires Probability", "Probability requires Statistics". Then nobody can ever take either one, and any student who needs both is stuck forever.

That is the **Course Schedule** problem. LeetCode 207 asks the yes/no question ("can you finish all courses?") and LeetCode 210 asks for an actual order. Both are the same algorithm: a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used) that also reports a cycle.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does the pair \`[a, b]\` mean "take b before a"? | The direction of every edge depends on it. In the LeetCode statement, \`[a, b]\` means b is the prerequisite of a, so the edge is \`b -> a\`. |
| Do you want yes/no, or an order? | Yes/no is Course Schedule I; an order (or \`[]\` if impossible) is Course Schedule II. Same code, different return. |
| If several orders work, is any one fine? | Usually yes. If they want the smallest course number first, you swap the queue for a min-heap. |
| Can there be duplicate pairs or a course that requires itself? | Duplicates are harmless with in-degree counting; \`[0, 0]\` is a cycle of length 1 and makes the answer false. |
| How many courses and pairs? | With up to 10^5 of each, O(V + E) is required and a recursive DFS may run out of stack. |

## 3. Turning Courses into a Graph

📌 **Interview term: Prerequisite graph** — a directed graph with one node per course and an edge \`b -> a\` for every pair \`[a, b]\` ("b before a"). Courses with no incoming edge can be taken right away.

📌 **Interview term: In-degree** — the number of edges pointing into a node. For a course, it is **the number of prerequisites still not taken**.

For \`numCourses = 4\` and \`prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 260" role="img" aria-label="Course 0 points to courses 1 and 2, and both of those point to course 3">
  <defs>
    <marker id="cs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">course 0</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">in-degree 0</text>
  <rect class="d-box" x="260" y="20" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="45" text-anchor="middle">course 1</text>
  <text class="d-sub" x="325" y="66" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="260" y="180" width="130" height="58" rx="8"/>
  <text class="d-text" x="325" y="205" text-anchor="middle">course 2</text>
  <text class="d-sub" x="325" y="226" text-anchor="middle">in-degree 1</text>
  <rect class="d-box" x="500" y="100" width="130" height="58" rx="8"/>
  <text class="d-text" x="565" y="125" text-anchor="middle">course 3</text>
  <text class="d-sub" x="565" y="146" text-anchor="middle">in-degree 2</text>
  <path class="d-edge" d="M 160 115 L 254 64" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 160 143 L 254 194" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 64 L 494 115" marker-end="url(#cs1-arrow)"/>
  <path class="d-edge" d="M 390 194 L 494 143" marker-end="url(#cs1-arrow)"/>
</svg>

Course 0 has no prerequisites. Taking it drops courses 1 and 2 to in-degree 0. Taking both of those drops course 3 to 0. One valid plan is \`[0, 1, 2, 3]\`; \`[0, 2, 1, 3]\` is equally valid.

📌 **Interview term: Cycle** — a loop of prerequisites such as \`0 -> 1 -> 2 -> 0\`. Every course on it waits for another course on it, so none can ever be taken. **"Can I finish all courses?" is exactly "does the prerequisite graph have no cycle?"** — the general check is covered in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Courses 0 1 2 form a loop so none can start, while course 3 leads to course 4 and both are fine">
  <defs>
    <marker id="cs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="150" y="20" width="110" height="50" rx="8"/>
  <text class="d-text" x="205" y="51" text-anchor="middle">course 0</text>
  <rect class="d-box-muted" x="30" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="85" y="201" text-anchor="middle">course 2</text>
  <rect class="d-box-muted" x="270" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="325" y="201" text-anchor="middle">course 1</text>
  <path class="d-edge-accent" d="M 240 74 L 300 164" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 266 195 L 146 195" marker-end="url(#cs2-arrow)"/>
  <path class="d-edge-accent" d="M 100 166 L 170 76" marker-end="url(#cs2-arrow)"/>
  <rect class="d-box-accent" x="460" y="95" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="126" text-anchor="middle">course 3</text>
  <rect class="d-box" x="460" y="190" width="110" height="50" rx="8"/>
  <text class="d-text" x="515" y="221" text-anchor="middle">course 4</text>
  <path class="d-edge" d="M 515 145 L 515 184" marker-end="url(#cs2-arrow)"/>
</svg>

This is the input \`numCourses = 5, prerequisites = [[1, 0], [2, 1], [0, 2], [4, 3]]\`. Courses 3 and 4 are fine, but 0, 1 and 2 form a loop, so the whole plan is impossible and the answer is \`false\` (and \`[]\` for the order).

## 4. Brute Force First

The most literal approach: keep scanning the course list from the start, and take the first course whose prerequisites are all already taken; repeat until everything is taken or a full scan finds nothing. It is correct — if a scan finds nothing, every remaining course waits for another remaining course, which means a cycle.

But each round rescans from course 0 and rechecks prerequisite lists. On a chain where course \`i\` needs course \`i + 1\` (so the last course must go first), Example 2 counts exactly \`n^2 + 2n - 1\` steps: 1,001,999 for 1,000 courses and 9,005,999 for 3,000. That is O(V * (V + E)).

## 5. The Optimal Approach: Kahn's Algorithm

The waste in the brute force is re-checking courses that cannot have changed. Kahn's algorithm only looks at a course when one of its prerequisites has **just** been taken:

1. Build the adjacency list \`b -> a\` and count each course's in-degree.
2. Put every course with in-degree 0 into a queue.
3. Pop a course, append it to the order, and decrement the in-degree of every course that needed it. When one reaches 0, push it.
4. If the order has \`numCourses\` entries, return it (or \`true\`). Otherwise there is a cycle: return \`[]\` (or \`false\`).

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing in-degree-0 nodes with a queue. Each course is pushed and popped once and each prerequisite pair is processed once, so it is O(V + E): **2n - 1** steps on the same chain (1,999 for 1,000 courses).

**Why one function solves both versions.** \`canFinish\` is just \`len(findOrder(...)) == numCourses\`. Writing \`findOrder\` first and deriving \`canFinish\` keeps one source of truth.

**The DFS alternative.** A depth-first search with three colours (unvisited, in progress, done) answers the same question: meeting an "in progress" course means a cycle, and the reverse finish order is a valid plan. It has the same O(V + E) cost but uses recursion; the trade-offs are compared in [Course Schedule: Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs).

📌 **Interview term: Level-by-level Kahn** — process the queue one "wave" at a time; every course in a wave can be taken in the same semester. The number of waves is the **minimum number of semesters** (the "Parallel Courses" variant). For the six-course plan \`[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]]\` the waves are \`{0, 1}\`, \`{2}\`, \`{3}\`, \`{4, 5}\`, so Example 2 prints 4.

## 6. The Code in C++

~~~cpp
vector<int> findOrder(int numCourses, const vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> indegree(numCourses, 0);
    for (const auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    queue<int> q;
    for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) q.push(c);
    vector<int> order;
    order.reserve(numCourses);
    while (!q.empty()) {
        int c = q.front(); q.pop();
        order.push_back(c);
        for (int next : adj[c]) {
            if (--indegree[next] == 0) q.push(next);
        }
    }
    if ((int)order.size() != numCourses) return {};
    return order;
}

bool canFinish(int numCourses, const vector<vector<int>>& prerequisites) {
    return (int)findOrder(numCourses, prerequisites).size() == numCourses;
}
~~~

**Line by line:**

- \`adj[p[1]].push_back(p[0])\`: each pair is \`{a, b}\` and b comes first, so the edge is \`p[1] -> p[0]\`. Getting this backwards does not crash — it quietly returns the reverse of a valid plan.
- \`const vector<vector<int>>& prerequisites\` takes the input by reference: no copy of up to 10^5 small vectors.
- \`std::queue\` splits reading and removing: \`front()\` then \`pop()\` (which returns \`void\`).
- \`order.reserve(numCourses)\` avoids reallocations, and \`return {};\` returns an empty vector for an impossible plan.
- \`(int)order.size() != numCourses\` casts the unsigned size before comparing with a signed \`int\`.

**The brute force, for comparison** (Example 2). Step counts use \`long long\` because they grow like n^2, which overflows 32 bits for large n:

~~~cpp
pair<bool, long long> bruteForce(int n, const Pairs& prerequisites) {
    vector<vector<int>> needs(n);
    for (auto [a, b] : prerequisites) needs[a].push_back(b);
    vector<bool> taken(n, false);
    long long count = 0, steps = 0;
    bool progress = true;
    while (progress) {
        progress = false;
        for (int c = 0; c < n; c++) {
            steps++;                                         // look at course c
            if (taken[c]) continue;
            steps += needs[c].size();                        // check each of its prerequisites
            bool ready = true;
            for (int p : needs[c]) if (!taken[p]) { ready = false; break; }
            if (ready) {
                taken[c] = true;
                count++;
                progress = true;
                break;                                       // restart the scan from course 0
            }
        }
    }
    return {count == n, steps};
}
~~~

**If you choose DFS in C++:** recursion depth equals the longest chain, and a native stack overflow is a crash, not an exception. On this machine (8 MB stack) a recursive DFS survived a 100,000-node chain and crashed on 200,000. Kahn has no recursion.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — canFinish and findOrder on normal, cyclic and tricky inputs** prints:

~~~text
n=2 prereqs=[[1, 0]] -> canFinish=true order=[0, 1]
n=2 prereqs=[[1, 0], [0, 1]] -> canFinish=false order=[]
n=4 prereqs=[[1, 0], [2, 0], [3, 1], [3, 2]] -> canFinish=true order=[0, 1, 2, 3]
n=1 prereqs=[] -> canFinish=true order=[0]
n=3 prereqs=[] -> canFinish=true order=[0, 1, 2]
n=3 prereqs=[[0, 0]] -> canFinish=false order=[]
n=5 prereqs=[[1, 0], [2, 1], [0, 2], [4, 3]] -> canFinish=false order=[]
n=2 prereqs=[[1, 0], [1, 0]] -> canFinish=true order=[0, 1]
n=6 prereqs=[[2, 0], [2, 1], [3, 2], [4, 3], [5, 3]] -> canFinish=true order=[0, 1, 2, 3, 4, 5]
~~~

**Example 2 — Brute-force rescan vs Kahn step counts, plus minimum semesters** prints:

~~~text
chain n=10 possible=true brute_steps=119 kahn_steps=19
chain n=100 possible=true brute_steps=10199 kahn_steps=199
chain n=1000 possible=true brute_steps=1001999 kahn_steps=1999
chain n=3000 possible=true brute_steps=9005999 kahn_steps=5999
minimum semesters for the 6-course plan: 4
minimum semesters with a cycle: -1
~~~

**Reading the output:** In Example 1, \`[[1, 0]]\` gives \`[0, 1]\` (0 first), the two-course loop gives \`false\` and \`[]\`, and the self-loop \`[[0, 0]]\` is also impossible. The five-course input is \`false\` even though courses 3 and 4 are fine, because the question is about **all** courses. The duplicated pair \`[[1, 0], [1, 0]]\` still works: course 1 starts at in-degree 2 and is decremented twice. In Example 2, both methods agree on every chain, but the brute force grows like n^2 (\`n^2 + 2n - 1\`) while Kahn grows like n (\`2n - 1\` = V + E); the semester count is 4, and -1 marks a plan with a cycle.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Rescan until stuck (brute force) | O(V * (V + E)) | O(V + E) | up to V rounds, each rescanning courses and their prerequisite lists |
| Kahn's algorithm | O(V + E) | O(V + E) | each course queued once, each pair decremented once |
| Three-colour DFS | O(V + E) | O(V + E) | each course visited once; recursion depth up to V |
| Level-by-level Kahn (semesters) | O(V + E) | O(V + E) | same work, grouped into waves |

V is \`numCourses\` and E is the number of prerequisite pairs.

## 9. Edge Cases

- **No prerequisites at all:** every course has in-degree 0; the answer is \`true\` and \`[0, 1, ..., n-1]\`.
- **One course:** \`[0]\`.
- **A course that requires itself, \`[0, 0]\`:** a cycle; the answer is \`false\`.
- **Duplicate pairs:** harmless as long as you count and decrement each copy.
- **A cycle in one corner of a big catalogue:** still \`false\` for the whole question, even though most courses are fine.
- **Courses that appear in no pair:** they have in-degree 0 and are placed at the start; do not build the node list only from the pairs.

## Common Pitfalls

- **Reversed edges.** \`{a, b}\` means b first, so \`adj[p[1]].push_back(p[0])\`. The reversed graph gives a reversed (wrong) plan with no error.
- **Seeding the queue from the pairs only.** Loop over every course id from 0 to \`numCourses - 1\`.
- **\`q.pop()\` returns nothing.** Read \`q.front()\` first.
- **Returning a partial order.** On a cycle, \`return {};\` instead of the half-built vector.
- **Passing the input by value.** \`vector<vector<int>>\` by value copies every pair; take \`const&\`.
- **Recursive DFS on long chains.** A stack overflow is a segmentation fault, not an exception.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Each pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{a, b}</code> is an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b -&gt; a</code>. Finishing every course is possible exactly when this directed graph has no cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Kahn:</strong> <span style="color:#f0e2c8;">Count in-degrees in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code>, seed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> with every course at 0, take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and push any course whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--indegree</code> hits 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order</code> if its size is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numCourses</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canFinish</code> is the size check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not brute force:</strong> <span style="color:#f0e2c8;">Rescanning for a ready course is O(V * (V + E)); Kahn only touches a course when a prerequisite was just taken: O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ notes:</strong> <span style="color:#f0e2c8;">take the input by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> the order, cast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> before comparing, and no recursion, so no stack crash.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the minimum number of semesters if you can take any number of courses at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run Kahn in waves: each wave is one semester. The count of waves is the answer (4 for the six-course plan in Example 2), or -1 on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer "is course x a prerequisite of course y" for many queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Precompute reachability: walk courses in topological order and OR each course <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bitset</code> of ancestors into its children. With n up to a few thousand, that is fast and each query is one bit test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::queue</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either gives a valid topological order, but a stack changes the tie-break order; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> matches the usual Kahn explanation and the level-by-level variant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with DFS instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, three colours: in-progress means cycle, and the reverse finish order is a plan. A recursive DFS can crash on deep chains, so Kahn is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How large can the step counts get?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The brute force on 3,000 courses already does 9,005,999 steps; for 10^5 it is about 10^10, beyond 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, which is why Example 2 uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prerequisite graph** | one node per course, an edge from each prerequisite to the course that needs it |
| **In-degree** | number of prerequisites a course still waits for |
| **Cycle** | a loop of prerequisites; makes finishing impossible |
| **Kahn's algorithm** | topological sort by repeatedly taking in-degree-0 nodes from a queue |
| **Level-by-level Kahn** | Kahn processed in waves; the wave count is the minimum number of semesters |
| **std::queue** | FIFO adapter: front, then pop |

---
**Conclusion:** Course Schedule is topological sort in disguise: turn each pair \`[a, b]\` into an edge \`b -> a\`, run Kahn's algorithm, and the courses come out in a valid order unless a prerequisite loop leaves some of them stuck, in which case the answer is \`false\` or \`[]\`. It runs in O(V + E), replaces a quadratic rescan, and extends naturally to the minimum number of semesters by processing the queue in waves. In C++ the whole solution is a \`std::queue\`, two vectors and one size check, with no recursion to worry about.`,
        examples: [
          { label: `canFinish and findOrder on normal, cyclic and tricky inputs`, code: `#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

// LeetCode 207/210. A pair {a, b} means: take b BEFORE a, so the edge is b -> a.
vector<int> findOrder(int numCourses, const vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> indegree(numCourses, 0);
    for (const auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    queue<int> q;
    for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) q.push(c);
    vector<int> order;
    order.reserve(numCourses);
    while (!q.empty()) {
        int c = q.front(); q.pop();
        order.push_back(c);
        for (int next : adj[c]) {
            if (--indegree[next] == 0) q.push(next);
        }
    }
    if ((int)order.size() != numCourses) return {};
    return order;
}

bool canFinish(int numCourses, const vector<vector<int>>& prerequisites) {
    return (int)findOrder(numCourses, prerequisites).size() == numCourses;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

string show(int n, const vector<vector<int>>& pre) {
    string pairs = "[";
    for (size_t i = 0; i < pre.size(); i++) pairs += (i ? ", " : "") + fmt(pre[i]);
    pairs += "]";
    return "n=" + to_string(n) + " prereqs=" + pairs + " -> canFinish=" +
           (canFinish(n, pre) ? "true" : "false") + " order=" + fmt(findOrder(n, pre));
}

int main() {
    cout << show(2, {{1, 0}}) << "\\n";
    cout << show(2, {{1, 0}, {0, 1}}) << "\\n";
    cout << show(4, {{1, 0}, {2, 0}, {3, 1}, {3, 2}}) << "\\n";
    cout << show(1, {}) << "\\n";
    cout << show(3, {}) << "\\n";
    cout << show(3, {{0, 0}}) << "\\n";
    cout << show(5, {{1, 0}, {2, 1}, {0, 2}, {4, 3}}) << "\\n";
    cout << show(2, {{1, 0}, {1, 0}}) << "\\n";
    cout << show(6, {{2, 0}, {2, 1}, {3, 2}, {4, 3}, {5, 3}}) << "\\n";
}` },
          { label: `Brute-force rescan vs Kahn step counts, plus minimum semesters`, code: `#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;

using Pairs = vector<pair<int, int>>;   // {a, b}: take b before a

// Rescan all courses from the start; take the first whose prerequisites are all taken.
pair<bool, long long> bruteForce(int n, const Pairs& prerequisites) {
    vector<vector<int>> needs(n);
    for (auto [a, b] : prerequisites) needs[a].push_back(b);
    vector<bool> taken(n, false);
    long long count = 0, steps = 0;
    bool progress = true;
    while (progress) {
        progress = false;
        for (int c = 0; c < n; c++) {
            steps++;                                         // look at course c
            if (taken[c]) continue;
            steps += needs[c].size();                        // check each of its prerequisites
            bool ready = true;
            for (int p : needs[c]) if (!taken[p]) { ready = false; break; }
            if (ready) {
                taken[c] = true;
                count++;
                progress = true;
                break;                                       // restart the scan from course 0
            }
        }
    }
    return {count == n, steps};
}

pair<bool, long long> kahn(int n, const Pairs& prerequisites) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [a, b] : prerequisites) { adj[b].push_back(a); indegree[a]++; }
    queue<int> q;
    for (int c = 0; c < n; c++) if (indegree[c] == 0) q.push(c);
    long long count = 0, steps = 0;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        count++;
        steps++;                                             // one pop per course
        for (int next : adj[c]) {
            steps++;                                         // one decrement per edge
            if (--indegree[next] == 0) q.push(next);
        }
    }
    return {count == n, steps};
}

// Kahn level by level: every course whose prerequisites are done is taken together.
int semesters(int n, const Pairs& prerequisites) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [a, b] : prerequisites) { adj[b].push_back(a); indegree[a]++; }
    vector<int> level;
    for (int c = 0; c < n; c++) if (indegree[c] == 0) level.push_back(c);
    int terms = 0, done = 0;
    while (!level.empty()) {
        terms++;
        done += level.size();
        vector<int> nextLevel;
        for (int c : level)
            for (int next : adj[c]) if (--indegree[next] == 0) nextLevel.push_back(next);
        level = nextLevel;
    }
    return done == n ? terms : -1;
}

int main() {
    cout << boolalpha;
    for (int n : {10, 100, 1000, 3000}) {
        Pairs chain;
        for (int i = 0; i < n - 1; i++) chain.push_back({i, i + 1});   // course i needs course i + 1
        auto [ok1, s1] = bruteForce(n, chain);
        auto [ok2, s2] = kahn(n, chain);
        cout << "chain n=" << n << " possible=" << (ok1 && ok2)
             << " brute_steps=" << s1 << " kahn_steps=" << s2 << "\\n";
    }
    Pairs six = {{2, 0}, {2, 1}, {3, 2}, {4, 3}, {5, 3}};
    cout << "minimum semesters for the 6-course plan: " << semesters(6, six) << "\\n";      // 4
    cout << "minimum semesters with a cycle: " << semesters(2, {{0, 1}, {1, 0}}) << "\\n";  // -1
}` },
        ],
      },
    },
  },
  {
    title: `Course Schedule: detect cycle with topological sort (Kahn vs DFS)?`,
    difficulty: "medium",
    seoDescription: `Kahn vs DFS for Course Schedule in Python, JavaScript, Java and C++: in-degree queue vs three-colour back edges, stuck set vs cycle path, deep graphs.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"For Course Schedule you can detect the cycle with Kahn's algorithm or with DFS. Explain both, tell me how each one spots a cycle, and when you would choose one over the other. Show me both in Python."

**What a strong answer should cover:**
- Kahn: in-degrees plus a queue; a cycle exists when fewer than V nodes get placed, and the leftover nodes are the cycle plus everything downstream of it.
- DFS: WHITE/GRAY/BLACK colours; an edge into a GRAY node (a back edge) is a cycle, and the GRAY path gives the exact cycle; reverse finish order is the topological order.
- Both are O(V + E) time and O(V + E) space; they usually produce different valid orders.
- Trade-offs: Kahn has no recursion and gives levels and easy lexicographic order; DFS stops at the first cycle and can print it, but needs an explicit stack on deep graphs.
- Python specifics: recursive DFS hits the default 1000-frame recursion limit (\`RecursionError\`), so an explicit stack (a list of \`[node, index]\` frames) or Kahn with \`collections.deque\` is the robust choice.

**Code / implementation expected:** Yes — both a Kahn function and a three-colour DFS function in Python, ideally with the DFS able to return the cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are asked to plan a pile of chores where some chores must come before others ("buy paint before painting", "move the sofa before painting", "paint before hanging pictures").

**Friend K** looks at the list and asks: *"What can I do right now, with nothing blocking it?"* She does those, crosses them off, and asks the question again. When nothing is left that she can start, either she is done or some chores are blocking each other in a loop.

**Friend D** picks a chore and asks: *"What does this need to unlock?"* She follows that thread as deep as it goes, and only writes a chore on her list **on the way back**, once everything after it is planned. If, while following a thread, she runs into a chore she is still in the middle of planning, she has found a loop — and she can tell you exactly which chores form it.

Friend K is **Kahn's algorithm**. Friend D is **depth-first search (DFS)**. Both solve [Course Schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) in O(V + E), and interviewers love asking which one you would choose and why.

## 2. The Core Distinction

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing a node with **in-degree 0** (no remaining incoming edges) from a queue. If some nodes are never removed, the graph has a cycle. The basics are in [what topological sort is](/interview-question/what-is-topological-sort-and-when-is-it-used).

📌 **Interview term: DFS topological sort** — run a depth-first search, record each node when it **finishes** (after all its descendants), and reverse that list. If the search ever follows an edge into a node that is still in progress, the graph has a cycle.

| | Kahn (BFS-style) | DFS (three colours) |
| :--- | :--- | :--- |
| Core question | what has no unfinished prerequisites? | what does this node lead to? |
| Data structure | in-degree array + queue | colour array + recursion (or an explicit stack) |
| Cycle signal | fewer than V nodes placed | an edge into a GRAY (in-progress) node |
| On a cycle you learn | the **stuck set**: cycle nodes **and everything downstream** | the **exact cycle** as a path |
| Recursion | none | depth up to V; needs an explicit stack on deep graphs |
| Order you get | sources first, wave by wave | reverse finish order |
| Levels / minimum semesters | natural (process the queue in waves) | not natural |
| Smallest order (min-heap) | swap the queue for a heap | awkward |
| Time / space | O(V + E) / O(V + E) | O(V + E) / O(V + E) |

**One-line verdict for interviews:** use Kahn by default (no recursion, easy to explain, gives levels); use DFS when you need the **actual cycle**, when you are already doing a DFS for something else, or when the interviewer asks for it.

### What Kahn tells you on a cycle

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Node 0 points to 1, nodes 1 2 3 form a loop, 3 also points to 4, node 5 is alone. Kahn places 0 and 5, while 1 2 3 and 4 stay stuck">
  <defs>
    <marker id="kd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="80" y="124" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="144" text-anchor="middle">placed</text>
  <rect class="d-box-muted" x="210" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="260" y="124" text-anchor="middle">1</text>
  <text class="d-sub" x="260" y="144" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="20" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="44" text-anchor="middle">2</text>
  <text class="d-sub" x="440" y="64" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">3</text>
  <text class="d-sub" x="440" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="590" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="214" text-anchor="middle">4</text>
  <text class="d-sub" x="640" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-accent" x="590" y="40" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="64" text-anchor="middle">5</text>
  <text class="d-sub" x="640" y="84" text-anchor="middle">placed</text>
  <path class="d-edge" d="M 130 127 L 204 127" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 310 112 L 386 62" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 440 74 L 440 184" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 390 205 L 314 148" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge" d="M 490 217 L 584 217" marker-end="url(#kd1-arrow)"/>
</svg>

Kahn places \`0\` and \`5\` and then the queue is empty. It reports \`1, 2, 3, 4\` as stuck — but \`4\` is **not** on the loop; it is only waiting for \`3\`. So "the stuck nodes" is not "the cycle". If the interviewer asks *which* courses form the loop, Kahn alone cannot say.

### What DFS tells you on a cycle

📌 **Interview term: Three colours** — WHITE = not visited yet, GRAY = visited and still on the current DFS path, BLACK = finished (everything reachable from it is explored).

📌 **Interview term: Back edge** — an edge from the current node to a GRAY node, i.e. to one of its own ancestors on the current path. A directed graph has a cycle **if and only if** DFS finds a back edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="DFS path 0 then 1 then 2 then 3, all gray, and the edge from 3 back to 1 is a back edge that closes the cycle 1 2 3">
  <defs>
    <marker id="kd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="64" text-anchor="middle">0</text>
  <text class="d-sub" x="90" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="220" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="280" y="64" text-anchor="middle">1</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="410" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="470" y="64" text-anchor="middle">2</text>
  <text class="d-sub" x="470" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="600" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="660" y="64" text-anchor="middle">3</text>
  <text class="d-sub" x="660" y="84" text-anchor="middle">GRAY</text>
  <path class="d-edge" d="M 150 67 L 214 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 340 67 L 404 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 594 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge-dashed" d="M 660 98 C 660 170, 280 170, 280 102" fill="none" marker-end="url(#kd2-arrow)"/>
  <text class="d-sub" x="470" y="186" text-anchor="middle">back edge 3 to 1</text>
</svg>

When DFS stands on \`3\`, the GRAY path is \`0, 1, 2, 3\`. The edge \`3 -> 1\` points at a GRAY node, so the cycle is the part of the path from \`1\` to the top, plus \`1\` again: \`1 -> 2 -> 3 -> 1\` (Example 1 prints exactly that). Keep the path in a list next to the colours and the cycle costs nothing extra to report.

**Why GRAY and BLACK must be different.** Meeting a BLACK node is fine: it was fully explored earlier and cannot lead back to the current path (if it could, it would not have finished first). Using a single "visited" flag treats those harmless meetings as cycles — the exact bug dissected in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

### The recursion problem, and the explicit stack

Recursive DFS uses one call frame per node on the current path, so a chain of 200,000 prerequisites needs 200,000 nested calls. Kahn has no such problem. If you want DFS anyway, replace recursion with your own stack of **(node, index of the next neighbour to try)** frames:

📌 **Interview term: Iterative DFS (explicit stack)** — DFS that keeps its own stack in a growable array instead of using the call stack. Each frame remembers where it was in the neighbour list, so a node is finished (turned BLACK and appended) exactly when its frame runs out of neighbours. Example 2 runs it on a 200,000-node chain and its deepest stack reaches 200,000 frames without trouble.

A simpler "push all neighbours at once" iterative DFS is **not** enough for topological sort or cycle detection: it loses the moment a node finishes, so it cannot tell GRAY from BLACK.

## 6. Both Algorithms in Python

**Kahn**, returning the order and the stuck nodes:

~~~python
def kahn(n, edges):
    """Returns (order, stuck): stuck lists nodes that never reached in-degree 0."""
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    stuck = [i for i in range(n) if indegree[i] > 0]
    return order, stuck
~~~

**Recursive three-colour DFS**, returning the order or the first cycle as a path:

~~~python
def dfs(n, edges):
    """Returns (order, cycle): reverse post-order, or the first cycle found as a path."""
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    path, finish = [], []                  # path = the GRAY nodes, in order

    def visit(u):
        color[u] = GRAY
        path.append(u)
        for v in adj[u]:
            if color[v] == GRAY:           # back edge u -> v closes a cycle
                return path[path.index(v):] + [v]
            if color[v] == WHITE:
                cycle = visit(v)
                if cycle:
                    return cycle
        path.pop()
        color[u] = BLACK
        finish.append(u)
        return None

    for s in range(n):
        if color[s] == WHITE:
            cycle = visit(s)
            if cycle:
                return None, cycle
    return finish[::-1], None
~~~

- \`path\` holds the GRAY nodes in order, so \`path[path.index(v):] + [v]\` slices out the cycle the moment a back edge \`u -> v\` appears. \`list.index\` is O(length of path), paid once.
- \`visit\` is a nested function that closes over \`color\`, \`path\` and \`finish\`, so no globals are needed; it only reads and mutates them, so no \`nonlocal\` is required.
- \`finish[::-1]\` is the reversed finish order.

**Iterative DFS for deep graphs.** The recursive version fails on long chains: on this Python 3.13, recursing down a 200,000-node chain raised \`RecursionError: maximum recursion depth exceeded\` (the default limit, \`sys.getrecursionlimit()\`, is 1000). Raising the limit with \`sys.setrecursionlimit\` moves the problem to the C stack and can crash the interpreter, so the clean fix is an explicit stack:

~~~python
def dfs_iterative(n, adj):
    """Three-colour DFS with an explicit stack of (node, next neighbour index): no recursion."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    finish = []
    max_depth = 0
    for s in range(n):
        if color[s] != WHITE:
            continue
        color[s] = GRAY
        stack = [[s, 0]]
        while stack:
            max_depth = max(max_depth, len(stack))
            frame = stack[-1]
            u, i = frame
            if i < len(adj[u]):
                frame[1] += 1                  # next time, look at the next neighbour
                v = adj[u][i]
                if color[v] == GRAY:
                    return None, max_depth     # back edge: cycle
                if color[v] == WHITE:
                    color[v] = GRAY
                    stack.append([v, 0])
            else:
                stack.pop()                    # all neighbours done: u finishes
                color[u] = BLACK
                finish.append(u)
    return finish[::-1], max_depth
~~~

Each frame is a two-item list \`[node, next_index]\`, mutated in place with \`frame[1] += 1\`, so returning to a node continues where it left off. Lists are used rather than tuples precisely because tuples cannot be changed.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn and DFS side by side: orders, stuck sets and the actual cycle** prints:

~~~text
DAG
  Kahn: order [4, 5, 2, 0, 3, 1]
  DFS:  order [5, 4, 2, 3, 1, 0]
cycle 1-2-3 with tail 3 -> 4
  Kahn: cycle, placed [0, 5], stuck [1, 2, 3, 4]
  DFS:  cycle 1 -> 2 -> 3 -> 1
self-loop on 1
  Kahn: cycle, placed [0], stuck [1, 2]
  DFS:  cycle 1 -> 1
two components, cycle in the second
  Kahn: cycle, placed [0, 1], stuck [2, 3, 4]
  DFS:  cycle 2 -> 3 -> 4 -> 2
~~~

**Example 2 — A 200,000-node chain: Kahn and explicit-stack DFS, no recursion** prints:

~~~text
chain of 200000: kahn placed 200000, dfs placed 200000
same order: true, starts [0, 1, 2], ends [199997, 199998, 199999]
deepest explicit stack: 200000 frames
closed into a ring: kahn cycle, dfs cycle
~~~

**Reading the output:** In Example 1 both methods agree on whether each graph has a cycle, but they report it differently: Kahn lists the stuck nodes (\`[1, 2, 3, 4]\`, including \`4\`, which is only downstream of the loop), while DFS prints the loop itself (\`1 -> 2 -> 3 -> 1\`). On the DAG they print **different but equally valid** orders (\`[4, 5, 2, 0, 3, 1]\` and \`[5, 4, 2, 3, 1, 0]\`). In the self-loop case DFS reports \`1 -> 1\`. In Example 2, on a 200,000-node chain both produce the same single valid order, and the explicit stack grows to 200,000 frames; closing the chain into a ring makes both report a cycle.

## 8. Complexity

| | Kahn | Recursive DFS | Iterative DFS |
| :--- | :--- | :--- | :--- |
| Time | O(V + E) | O(V + E) | O(V + E) |
| Extra space | O(V) in-degrees + queue | O(V) colours + O(V) call stack | O(V) colours + O(V) heap-allocated stack |
| Adjacency list | O(V + E) | O(V + E) | O(V + E) |
| Fails on deep chains? | no | yes, when the call stack runs out | no |

Every node is queued (Kahn) or visited (DFS) once and every edge is examined once, which gives O(V + E) for all three.

## 9. Which One Should You Pick?

- **Just need yes/no or any valid order?** Kahn. Shortest code, no recursion.
- **Need the minimum number of rounds or semesters?** Kahn in waves.
- **Need the lexicographically smallest order?** Kahn with a min-heap.
- **Need to print the actual cycle?** DFS with a path list.
- **Need to stop at the first cycle quickly?** DFS returns as soon as it sees a back edge; Kahn has to drain the queue first.
- **Already doing a DFS** (for example, computing something per node with memoisation, as in [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force))? Add colours to the DFS you have.
- **Graph could be very deep?** Kahn, or the explicit-stack DFS.

## Common Pitfalls

- **One "visited" set instead of three colours.** A diamond (\`0 -> 1 -> 3\`, \`0 -> 2 -> 3\`) is then reported as a cycle.
- **Calling Kahn's stuck set "the cycle".** It also contains nodes downstream of the cycle.
- **Forgetting to restart DFS from every WHITE node.** A cycle in a second, disconnected piece is missed.
- **Recursive DFS on long chains.** \`RecursionError\` past 1000 frames by default; \`sys.setrecursionlimit\` is a band-aid that can segfault.
- **Push-all-neighbours iterative DFS.** It cannot tell when a node finishes, so it cannot produce reverse post-order; store \`[node, next_index]\` frames.
- **Tuples as frames.** \`frame[1] += 1\` fails on a tuple; use a list.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Kahn:</strong> <span style="color:#f0e2c8;">In-degrees plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>; pop in-degree-0 nodes and decrement neighbours. Fewer than V placed means a cycle; the leftovers are the cycle plus its downstream nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DFS:</strong> <span style="color:#f0e2c8;">Colours WHITE, GRAY, BLACK. An edge into a GRAY node is a back edge, which means a cycle; the GRAY <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> list gives the exact cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Kahn gives sources first; DFS gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finish[::-1]</code>. Both are valid and usually different.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time and space. Kahn uses no recursion; recursive DFS hits Python 1000-frame limit on deep chains.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choice:</strong> <span style="color:#f0e2c8;">Kahn by default and for levels or smallest order; DFS to print the cycle or stop at the first one, with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, index]</code> stack when deep.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does DFS need GRAY and BLACK, not just visited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meeting a BLACK node is harmless: it finished earlier and cannot reach the current path. Only GRAY means an ancestor, so only GRAY means a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn says nodes 1 to 4 are stuck. Which ones are the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kahn cannot say. Run DFS on the stuck nodes, or repeatedly strip stuck nodes with no outgoing edge to another stuck node; what remains lies on or between cycles.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make the DFS non-recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, next_index]</code> lists. Finish a node when its index reaches the end of its neighbour list. Example 2 handles 200,000 frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one finds a cycle faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same worst case. DFS can return at the first back edge; Kahn must drain the queue before it knows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.setrecursionlimit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only lifts the Python check; the C stack can still overflow and crash the interpreter. An explicit stack is safe.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kahn's algorithm** | topological sort that repeatedly removes in-degree-0 nodes from a queue |
| **DFS topological sort** | record nodes as DFS finishes them, then reverse |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | an edge into a GRAY node; exists exactly when there is a cycle |
| **Stuck set** | nodes Kahn never places: the cycles plus everything downstream of them |
| **Iterative DFS (explicit stack)** | DFS with your own stack of (node, next neighbour index) frames |
| **RecursionError** | raised when Python recursion passes the limit (1000 by default) |

---
**Conclusion:** Kahn and DFS are two views of the same fact — a directed graph has a topological order exactly when it has no cycle. Kahn peels off nodes with no remaining prerequisites and calls it a cycle when some are left; DFS walks paths, calls it a cycle when it meets a node still on the current path, and can hand you that cycle. Both are O(V + E). Pick Kahn for simplicity, levels and no recursion; pick DFS when you need the cycle itself or are already doing a DFS. In Python, prefer Kahn with a \`deque\`, and when you need DFS on large inputs, use a stack of \`[node, next_index]\` lists instead of recursion.`,
        examples: [
          { label: `Kahn and DFS side by side: orders, stuck sets and the actual cycle`, code: `from collections import deque


def kahn(n, edges):
    """Returns (order, stuck): stuck lists nodes that never reached in-degree 0."""
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    stuck = [i for i in range(n) if indegree[i] > 0]
    return order, stuck


def dfs(n, edges):
    """Returns (order, cycle): reverse post-order, or the first cycle found as a path."""
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    path, finish = [], []                  # path = the GRAY nodes, in order

    def visit(u):
        color[u] = GRAY
        path.append(u)
        for v in adj[u]:
            if color[v] == GRAY:           # back edge u -> v closes a cycle
                return path[path.index(v):] + [v]
            if color[v] == WHITE:
                cycle = visit(v)
                if cycle:
                    return cycle
        path.pop()
        color[u] = BLACK
        finish.append(u)
        return None

    for s in range(n):
        if color[s] == WHITE:
            cycle = visit(s)
            if cycle:
                return None, cycle
    return finish[::-1], None


def report(name, n, edges):
    order, stuck = kahn(n, edges)
    d_order, cycle = dfs(n, edges)
    print(name)
    if not stuck:
        print("  Kahn: order " + str(order))
    else:
        print("  Kahn: cycle, placed " + str(order) + ", stuck " + str(stuck))
    if cycle is None:
        print("  DFS:  order " + str(d_order))
    else:
        print("  DFS:  cycle " + " -> ".join(str(x) for x in cycle))


report("DAG", 6, [(5, 2), (5, 0), (4, 0), (4, 1), (2, 3), (3, 1)])
report("cycle 1-2-3 with tail 3 -> 4", 6, [(0, 1), (1, 2), (2, 3), (3, 1), (3, 4)])
report("self-loop on 1", 3, [(0, 1), (1, 1), (1, 2)])
report("two components, cycle in the second", 5, [(0, 1), (2, 3), (3, 4), (4, 2)])` },
          { label: `A 200,000-node chain: Kahn and explicit-stack DFS, no recursion`, code: `from collections import deque


def kahn(n, adj):
    indegree = [0] * n
    for u in range(n):
        for v in adj[u]:
            indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return order if len(order) == n else None


def dfs_iterative(n, adj):
    """Three-colour DFS with an explicit stack of (node, next neighbour index): no recursion."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    finish = []
    max_depth = 0
    for s in range(n):
        if color[s] != WHITE:
            continue
        color[s] = GRAY
        stack = [[s, 0]]
        while stack:
            max_depth = max(max_depth, len(stack))
            frame = stack[-1]
            u, i = frame
            if i < len(adj[u]):
                frame[1] += 1                  # next time, look at the next neighbour
                v = adj[u][i]
                if color[v] == GRAY:
                    return None, max_depth     # back edge: cycle
                if color[v] == WHITE:
                    color[v] = GRAY
                    stack.append([v, 0])
            else:
                stack.pop()                    # all neighbours done: u finishes
                color[u] = BLACK
                finish.append(u)
    return finish[::-1], max_depth


n = 200000
chain = [[i + 1] for i in range(n - 1)] + [[]]          # 0 -> 1 -> ... -> n-1
k = kahn(n, chain)
d, depth = dfs_iterative(n, chain)
print("chain of " + str(n) + ": kahn placed " + str(len(k)) + ", dfs placed " + str(len(d)))
print("same order: " + str(k == d).lower() + ", starts " + str(d[:3]) + ", ends " + str(d[-3:]))
print("deepest explicit stack: " + str(depth) + " frames")

chain[n - 1] = [0]                                     # close the loop: n-1 -> 0
d, depth = dfs_iterative(n, chain)
print("closed into a ring: kahn " + ("cycle" if kahn(n, chain) is None else "ok")
      + ", dfs " + ("cycle" if d is None else "ok"))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"For Course Schedule you can detect the cycle with Kahn's algorithm or with DFS. Explain both, tell me how each one spots a cycle, and when you would choose one over the other. Show me both in JavaScript."

**What a strong answer should cover:**
- Kahn: in-degrees plus a queue; a cycle exists when fewer than V nodes get placed, and the leftover nodes are the cycle plus everything downstream of it.
- DFS: WHITE/GRAY/BLACK colours; an edge into a GRAY node (a back edge) is a cycle, and the GRAY path gives the exact cycle; reverse finish order is the topological order.
- Both are O(V + E) time and O(V + E) space; they usually produce different valid orders.
- Trade-offs: Kahn has no recursion and gives levels and easy lexicographic order; DFS stops at the first cycle and can print it, but needs an explicit stack on deep graphs.
- JavaScript specifics: deep recursion throws \`RangeError: Maximum call stack size exceeded\`; an explicit array stack or Kahn with a head-indexed array avoids it, and \`shift()\` should not be the queue.

**Code / implementation expected:** Yes — both a Kahn function and a three-colour DFS function in JavaScript, ideally with the DFS able to return the cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are asked to plan a pile of chores where some chores must come before others ("buy paint before painting", "move the sofa before painting", "paint before hanging pictures").

**Friend K** looks at the list and asks: *"What can I do right now, with nothing blocking it?"* She does those, crosses them off, and asks the question again. When nothing is left that she can start, either she is done or some chores are blocking each other in a loop.

**Friend D** picks a chore and asks: *"What does this need to unlock?"* She follows that thread as deep as it goes, and only writes a chore on her list **on the way back**, once everything after it is planned. If, while following a thread, she runs into a chore she is still in the middle of planning, she has found a loop — and she can tell you exactly which chores form it.

Friend K is **Kahn's algorithm**. Friend D is **depth-first search (DFS)**. Both solve [Course Schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) in O(V + E), and interviewers love asking which one you would choose and why.

## 2. The Core Distinction

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing a node with **in-degree 0** (no remaining incoming edges) from a queue. If some nodes are never removed, the graph has a cycle. The basics are in [what topological sort is](/interview-question/what-is-topological-sort-and-when-is-it-used).

📌 **Interview term: DFS topological sort** — run a depth-first search, record each node when it **finishes** (after all its descendants), and reverse that list. If the search ever follows an edge into a node that is still in progress, the graph has a cycle.

| | Kahn (BFS-style) | DFS (three colours) |
| :--- | :--- | :--- |
| Core question | what has no unfinished prerequisites? | what does this node lead to? |
| Data structure | in-degree array + queue | colour array + recursion (or an explicit stack) |
| Cycle signal | fewer than V nodes placed | an edge into a GRAY (in-progress) node |
| On a cycle you learn | the **stuck set**: cycle nodes **and everything downstream** | the **exact cycle** as a path |
| Recursion | none | depth up to V; needs an explicit stack on deep graphs |
| Order you get | sources first, wave by wave | reverse finish order |
| Levels / minimum semesters | natural (process the queue in waves) | not natural |
| Smallest order (min-heap) | swap the queue for a heap | awkward |
| Time / space | O(V + E) / O(V + E) | O(V + E) / O(V + E) |

**One-line verdict for interviews:** use Kahn by default (no recursion, easy to explain, gives levels); use DFS when you need the **actual cycle**, when you are already doing a DFS for something else, or when the interviewer asks for it.

### What Kahn tells you on a cycle

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Node 0 points to 1, nodes 1 2 3 form a loop, 3 also points to 4, node 5 is alone. Kahn places 0 and 5, while 1 2 3 and 4 stay stuck">
  <defs>
    <marker id="kd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="80" y="124" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="144" text-anchor="middle">placed</text>
  <rect class="d-box-muted" x="210" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="260" y="124" text-anchor="middle">1</text>
  <text class="d-sub" x="260" y="144" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="20" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="44" text-anchor="middle">2</text>
  <text class="d-sub" x="440" y="64" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">3</text>
  <text class="d-sub" x="440" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="590" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="214" text-anchor="middle">4</text>
  <text class="d-sub" x="640" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-accent" x="590" y="40" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="64" text-anchor="middle">5</text>
  <text class="d-sub" x="640" y="84" text-anchor="middle">placed</text>
  <path class="d-edge" d="M 130 127 L 204 127" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 310 112 L 386 62" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 440 74 L 440 184" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 390 205 L 314 148" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge" d="M 490 217 L 584 217" marker-end="url(#kd1-arrow)"/>
</svg>

Kahn places \`0\` and \`5\` and then the queue is empty. It reports \`1, 2, 3, 4\` as stuck — but \`4\` is **not** on the loop; it is only waiting for \`3\`. So "the stuck nodes" is not "the cycle". If the interviewer asks *which* courses form the loop, Kahn alone cannot say.

### What DFS tells you on a cycle

📌 **Interview term: Three colours** — WHITE = not visited yet, GRAY = visited and still on the current DFS path, BLACK = finished (everything reachable from it is explored).

📌 **Interview term: Back edge** — an edge from the current node to a GRAY node, i.e. to one of its own ancestors on the current path. A directed graph has a cycle **if and only if** DFS finds a back edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="DFS path 0 then 1 then 2 then 3, all gray, and the edge from 3 back to 1 is a back edge that closes the cycle 1 2 3">
  <defs>
    <marker id="kd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="64" text-anchor="middle">0</text>
  <text class="d-sub" x="90" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="220" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="280" y="64" text-anchor="middle">1</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="410" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="470" y="64" text-anchor="middle">2</text>
  <text class="d-sub" x="470" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="600" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="660" y="64" text-anchor="middle">3</text>
  <text class="d-sub" x="660" y="84" text-anchor="middle">GRAY</text>
  <path class="d-edge" d="M 150 67 L 214 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 340 67 L 404 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 594 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge-dashed" d="M 660 98 C 660 170, 280 170, 280 102" fill="none" marker-end="url(#kd2-arrow)"/>
  <text class="d-sub" x="470" y="186" text-anchor="middle">back edge 3 to 1</text>
</svg>

When DFS stands on \`3\`, the GRAY path is \`0, 1, 2, 3\`. The edge \`3 -> 1\` points at a GRAY node, so the cycle is the part of the path from \`1\` to the top, plus \`1\` again: \`1 -> 2 -> 3 -> 1\` (Example 1 prints exactly that). Keep the path in a list next to the colours and the cycle costs nothing extra to report.

**Why GRAY and BLACK must be different.** Meeting a BLACK node is fine: it was fully explored earlier and cannot lead back to the current path (if it could, it would not have finished first). Using a single "visited" flag treats those harmless meetings as cycles — the exact bug dissected in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

### The recursion problem, and the explicit stack

Recursive DFS uses one call frame per node on the current path, so a chain of 200,000 prerequisites needs 200,000 nested calls. Kahn has no such problem. If you want DFS anyway, replace recursion with your own stack of **(node, index of the next neighbour to try)** frames:

📌 **Interview term: Iterative DFS (explicit stack)** — DFS that keeps its own stack in a growable array instead of using the call stack. Each frame remembers where it was in the neighbour list, so a node is finished (turned BLACK and appended) exactly when its frame runs out of neighbours. Example 2 runs it on a 200,000-node chain and its deepest stack reaches 200,000 frames without trouble.

A simpler "push all neighbours at once" iterative DFS is **not** enough for topological sort or cycle detection: it loses the moment a node finishes, so it cannot tell GRAY from BLACK.

## 6. Both Algorithms in JavaScript

**Kahn**, returning the order and the stuck nodes:

~~~javascript
function kahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); indegree[v]++; }
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) queue.push(v);
  }
  const stuck = [];
  for (let i = 0; i < n; i++) if (indegree[i] > 0) stuck.push(i);
  return { order, stuck };
}
~~~

**Recursive three-colour DFS**, returning the order or the first cycle as a path:

~~~javascript
function dfs(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const path = [], finish = [];                 // path = the GRAY nodes, in order

  function visit(u) {
    color[u] = GRAY;
    path.push(u);
    for (const v of adj[u]) {
      if (color[v] === GRAY) return path.slice(path.indexOf(v)).concat([v]); // back edge
      if (color[v] === WHITE) {
        const cycle = visit(v);
        if (cycle) return cycle;
      }
    }
    path.pop();
    color[u] = BLACK;
    finish.push(u);
    return null;
  }

  for (let s = 0; s < n; s++) {
    if (color[s] === WHITE) {
      const cycle = visit(s);
      if (cycle) return { order: null, cycle };
    }
  }
  return { order: finish.reverse(), cycle: null };
}
~~~

- \`path\` holds the GRAY nodes in order, so \`path.slice(path.indexOf(v)).concat([v])\` builds the cycle the moment a back edge \`u -> v\` appears.
- \`visit\` is an inner function declaration that closes over \`color\`, \`path\` and \`finish\`.
- \`finish.reverse()\` reverses **in place** and returns the same array; that is fine here because \`finish\` is not used afterwards, but it would surprise a caller that kept a reference.

**Iterative DFS for deep graphs.** On Node 22 here, recursing down a 200,000-node chain threw \`RangeError: Maximum call stack size exceeded\`. The limit depends on the engine and on frame size, so do not promise a number — use an explicit stack:

~~~javascript
function dfsIterative(n, adj) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const finish = [];
  let maxDepth = 0;
  for (let s = 0; s < n; s++) {
    if (color[s] !== WHITE) continue;
    color[s] = GRAY;
    const stack = [[s, 0]];
    while (stack.length > 0) {
      maxDepth = Math.max(maxDepth, stack.length);
      const frame = stack[stack.length - 1];
      const u = frame[0], i = frame[1];
      if (i < adj[u].length) {
        frame[1]++;                                  // next time, look at the next neighbour
        const v = adj[u][i];
        if (color[v] === GRAY) return { order: null, maxDepth };   // back edge: cycle
        if (color[v] === WHITE) { color[v] = GRAY; stack.push([v, 0]); }
      } else {
        stack.pop();                                 // all neighbours done: u finishes
        color[u] = BLACK;
        finish.push(u);
      }
    }
  }
  return { order: finish.reverse(), maxDepth };
}
~~~

Each frame is a two-element array \`[node, nextIndex]\`, updated in place with \`frame[1]++\`. The stack lives on the heap, so its size is limited by memory, not by the call stack.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (they use only \`console.log\`, so they also run in the browser runner on this page). The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn and DFS side by side: orders, stuck sets and the actual cycle** prints:

~~~text
DAG
  Kahn: order [4, 5, 2, 0, 3, 1]
  DFS:  order [5, 4, 2, 3, 1, 0]
cycle 1-2-3 with tail 3 -> 4
  Kahn: cycle, placed [0, 5], stuck [1, 2, 3, 4]
  DFS:  cycle 1 -> 2 -> 3 -> 1
self-loop on 1
  Kahn: cycle, placed [0], stuck [1, 2]
  DFS:  cycle 1 -> 1
two components, cycle in the second
  Kahn: cycle, placed [0, 1], stuck [2, 3, 4]
  DFS:  cycle 2 -> 3 -> 4 -> 2
~~~

**Example 2 — A 200,000-node chain: Kahn and explicit-stack DFS, no recursion** prints:

~~~text
chain of 200000: kahn placed 200000, dfs placed 200000
same order: true, starts [0, 1, 2], ends [199997, 199998, 199999]
deepest explicit stack: 200000 frames
closed into a ring: kahn cycle, dfs cycle
~~~

**Reading the output:** In Example 1 both methods agree on whether each graph has a cycle, but they report it differently: Kahn lists the stuck nodes (\`[1, 2, 3, 4]\`, including \`4\`, which is only downstream of the loop), while DFS prints the loop itself (\`1 -> 2 -> 3 -> 1\`). On the DAG they print **different but equally valid** orders (\`[4, 5, 2, 0, 3, 1]\` and \`[5, 4, 2, 3, 1, 0]\`). In the self-loop case DFS reports \`1 -> 1\`. In Example 2, on a 200,000-node chain both produce the same single valid order, and the explicit stack grows to 200,000 frames; closing the chain into a ring makes both report a cycle.

## 8. Complexity

| | Kahn | Recursive DFS | Iterative DFS |
| :--- | :--- | :--- | :--- |
| Time | O(V + E) | O(V + E) | O(V + E) |
| Extra space | O(V) in-degrees + queue | O(V) colours + O(V) call stack | O(V) colours + O(V) heap-allocated stack |
| Adjacency list | O(V + E) | O(V + E) | O(V + E) |
| Fails on deep chains? | no | yes, when the call stack runs out | no |

Every node is queued (Kahn) or visited (DFS) once and every edge is examined once, which gives O(V + E) for all three.

## 9. Which One Should You Pick?

- **Just need yes/no or any valid order?** Kahn. Shortest code, no recursion.
- **Need the minimum number of rounds or semesters?** Kahn in waves.
- **Need the lexicographically smallest order?** Kahn with a min-heap.
- **Need to print the actual cycle?** DFS with a path list.
- **Need to stop at the first cycle quickly?** DFS returns as soon as it sees a back edge; Kahn has to drain the queue first.
- **Already doing a DFS** (for example, computing something per node with memoisation, as in [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force))? Add colours to the DFS you have.
- **Graph could be very deep?** Kahn, or the explicit-stack DFS.

## Common Pitfalls

- **One "visited" set instead of three colours.** A diamond (\`0 -> 1 -> 3\`, \`0 -> 2 -> 3\`) is then reported as a cycle.
- **Calling Kahn's stuck set "the cycle".** It also contains nodes downstream of the cycle.
- **Forgetting to restart DFS from every WHITE node.** A cycle in a second, disconnected piece is missed.
- **Recursive DFS on long chains.** \`RangeError\` once the call stack is exhausted; the limit is engine-dependent.
- **\`reverse()\` surprises.** It mutates the array in place; use \`slice().reverse()\` if the original is still needed.
- **Push-all-neighbours iterative DFS.** It cannot tell when a node finishes; store \`[node, nextIndex]\` frames.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Kahn:</strong> <span style="color:#f0e2c8;">In-degrees plus an array queue with a head index; take in-degree-0 nodes and decrement neighbours. Fewer than V placed means a cycle; leftovers include downstream nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DFS:</strong> <span style="color:#f0e2c8;">Colours WHITE, GRAY, BLACK. An edge into a GRAY node is a back edge, which means a cycle; the GRAY <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> array gives the exact cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Kahn gives sources first; DFS gives the reversed finish order. Both are valid and usually different.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time and space. Kahn uses no recursion; recursive DFS throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on deep chains.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choice:</strong> <span style="color:#f0e2c8;">Kahn by default and for levels or smallest order; DFS to print the cycle or stop at the first one, with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, index]</code> stack when deep.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does DFS need GRAY and BLACK, not just visited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meeting a BLACK node is harmless: it finished earlier and cannot reach the current path. Only GRAY means an ancestor, so only GRAY means a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn says nodes 1 to 4 are stuck. Which ones are the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kahn cannot say; 4 is only downstream. Run the colour DFS to get the actual path <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 -&gt; 2 -&gt; 3 -&gt; 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make the DFS non-recursive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: an array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, nextIndex]</code> frames, finishing a node when its index reaches the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj[u]</code>. Example 2 handles 200,000 frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How deep can recursion go in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the engine and frame size, so there is no portable number. Here a 200,000-deep chain threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on Node 22; treat deep inputs as needing an explicit stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one finds a cycle faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same worst case. DFS can return at the first back edge; Kahn must drain the queue before it knows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kahn's algorithm** | topological sort that repeatedly removes in-degree-0 nodes from a queue |
| **DFS topological sort** | record nodes as DFS finishes them, then reverse |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | an edge into a GRAY node; exists exactly when there is a cycle |
| **Stuck set** | nodes Kahn never places: the cycles plus everything downstream of them |
| **Iterative DFS (explicit stack)** | DFS with your own stack of (node, next neighbour index) frames |
| **RangeError** | thrown when the JavaScript call stack is exhausted |

---
**Conclusion:** Kahn and DFS are two views of the same fact — a directed graph has a topological order exactly when it has no cycle. Kahn peels off nodes with no remaining prerequisites and calls it a cycle when some are left; DFS walks paths, calls it a cycle when it meets a node still on the current path, and can hand you that cycle. Both are O(V + E). Pick Kahn for simplicity, levels and no recursion; pick DFS when you need the cycle itself or are already doing a DFS. In JavaScript, prefer Kahn with a head-indexed array, and when you need DFS on large inputs, use an array of \`[node, nextIndex]\` frames instead of recursion.`,
        examples: [
          { label: `Kahn and DFS side by side: orders, stuck sets and the actual cycle`, code: `// Returns { order, stuck }: stuck lists nodes that never reached in-degree 0.
function kahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); indegree[v]++; }
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) queue.push(v);
  }
  const stuck = [];
  for (let i = 0; i < n; i++) if (indegree[i] > 0) stuck.push(i);
  return { order, stuck };
}

// Returns { order, cycle }: reverse post-order, or the first cycle found as a path.
function dfs(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const path = [], finish = [];                 // path = the GRAY nodes, in order

  function visit(u) {
    color[u] = GRAY;
    path.push(u);
    for (const v of adj[u]) {
      if (color[v] === GRAY) return path.slice(path.indexOf(v)).concat([v]); // back edge
      if (color[v] === WHITE) {
        const cycle = visit(v);
        if (cycle) return cycle;
      }
    }
    path.pop();
    color[u] = BLACK;
    finish.push(u);
    return null;
  }

  for (let s = 0; s < n; s++) {
    if (color[s] === WHITE) {
      const cycle = visit(s);
      if (cycle) return { order: null, cycle };
    }
  }
  return { order: finish.reverse(), cycle: null };
}

const fmt = (a) => '[' + a.join(', ') + ']';

function report(name, n, edges) {
  const k = kahn(n, edges);
  const d = dfs(n, edges);
  console.log(name);
  if (k.stuck.length === 0) console.log('  Kahn: order ' + fmt(k.order));
  else console.log('  Kahn: cycle, placed ' + fmt(k.order) + ', stuck ' + fmt(k.stuck));
  if (d.cycle === null) console.log('  DFS:  order ' + fmt(d.order));
  else console.log('  DFS:  cycle ' + d.cycle.join(' -> '));
}

report('DAG', 6, [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]]);
report('cycle 1-2-3 with tail 3 -> 4', 6, [[0, 1], [1, 2], [2, 3], [3, 1], [3, 4]]);
report('self-loop on 1', 3, [[0, 1], [1, 1], [1, 2]]);
report('two components, cycle in the second', 5, [[0, 1], [2, 3], [3, 4], [4, 2]]);` },
          { label: `A 200,000-node chain: Kahn and explicit-stack DFS, no recursion`, code: `function kahn(n, adj) {
  const indegree = new Array(n).fill(0);
  for (let u = 0; u < n; u++) for (const v of adj[u]) indegree[v]++;
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) queue.push(v);
  }
  return order.length === n ? order : null;
}

// Three-colour DFS with an explicit stack of [node, next neighbour index]: no recursion.
function dfsIterative(n, adj) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const finish = [];
  let maxDepth = 0;
  for (let s = 0; s < n; s++) {
    if (color[s] !== WHITE) continue;
    color[s] = GRAY;
    const stack = [[s, 0]];
    while (stack.length > 0) {
      maxDepth = Math.max(maxDepth, stack.length);
      const frame = stack[stack.length - 1];
      const u = frame[0], i = frame[1];
      if (i < adj[u].length) {
        frame[1]++;                                  // next time, look at the next neighbour
        const v = adj[u][i];
        if (color[v] === GRAY) return { order: null, maxDepth };   // back edge: cycle
        if (color[v] === WHITE) { color[v] = GRAY; stack.push([v, 0]); }
      } else {
        stack.pop();                                 // all neighbours done: u finishes
        color[u] = BLACK;
        finish.push(u);
      }
    }
  }
  return { order: finish.reverse(), maxDepth };
}

const fmt = (a) => '[' + a.join(', ') + ']';
const n = 200000;
const chain = [];
for (let i = 0; i < n - 1; i++) chain.push([i + 1]);  // 0 -> 1 -> ... -> n-1
chain.push([]);
const k = kahn(n, chain);
let d = dfsIterative(n, chain);
console.log('chain of ' + n + ': kahn placed ' + k.length + ', dfs placed ' + d.order.length);
const same = k.length === d.order.length && k.every((x, i) => x === d.order[i]);
console.log('same order: ' + same + ', starts ' + fmt(d.order.slice(0, 3)) + ', ends ' + fmt(d.order.slice(-3)));
console.log('deepest explicit stack: ' + d.maxDepth + ' frames');

chain[n - 1] = [0];                                   // close the loop: n-1 -> 0
d = dfsIterative(n, chain);
console.log('closed into a ring: kahn ' + (kahn(n, chain) === null ? 'cycle' : 'ok') +
  ', dfs ' + (d.order === null ? 'cycle' : 'ok'));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"For Course Schedule you can detect the cycle with Kahn's algorithm or with DFS. Explain both, tell me how each one spots a cycle, and when you would choose one over the other. Show me both in Java."

**What a strong answer should cover:**
- Kahn: in-degrees plus a queue; a cycle exists when fewer than V nodes get placed, and the leftover nodes are the cycle plus everything downstream of it.
- DFS: WHITE/GRAY/BLACK colours; an edge into a GRAY node (a back edge) is a cycle, and the GRAY path gives the exact cycle; reverse finish order is the topological order.
- Both are O(V + E) time and O(V + E) space; they usually produce different valid orders.
- Trade-offs: Kahn has no recursion and gives levels and easy lexicographic order; DFS stops at the first cycle and can print it, but needs an explicit stack on deep graphs.
- Java specifics: deep recursion throws \`StackOverflowError\` on the default thread stack; an explicit stack in primitive \`int[]\` arrays or Kahn with \`ArrayDeque\` avoids it.

**Code / implementation expected:** Yes — both a Kahn function and a three-colour DFS function in Java, ideally with the DFS able to return the cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are asked to plan a pile of chores where some chores must come before others ("buy paint before painting", "move the sofa before painting", "paint before hanging pictures").

**Friend K** looks at the list and asks: *"What can I do right now, with nothing blocking it?"* She does those, crosses them off, and asks the question again. When nothing is left that she can start, either she is done or some chores are blocking each other in a loop.

**Friend D** picks a chore and asks: *"What does this need to unlock?"* She follows that thread as deep as it goes, and only writes a chore on her list **on the way back**, once everything after it is planned. If, while following a thread, she runs into a chore she is still in the middle of planning, she has found a loop — and she can tell you exactly which chores form it.

Friend K is **Kahn's algorithm**. Friend D is **depth-first search (DFS)**. Both solve [Course Schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) in O(V + E), and interviewers love asking which one you would choose and why.

## 2. The Core Distinction

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing a node with **in-degree 0** (no remaining incoming edges) from a queue. If some nodes are never removed, the graph has a cycle. The basics are in [what topological sort is](/interview-question/what-is-topological-sort-and-when-is-it-used).

📌 **Interview term: DFS topological sort** — run a depth-first search, record each node when it **finishes** (after all its descendants), and reverse that list. If the search ever follows an edge into a node that is still in progress, the graph has a cycle.

| | Kahn (BFS-style) | DFS (three colours) |
| :--- | :--- | :--- |
| Core question | what has no unfinished prerequisites? | what does this node lead to? |
| Data structure | in-degree array + queue | colour array + recursion (or an explicit stack) |
| Cycle signal | fewer than V nodes placed | an edge into a GRAY (in-progress) node |
| On a cycle you learn | the **stuck set**: cycle nodes **and everything downstream** | the **exact cycle** as a path |
| Recursion | none | depth up to V; needs an explicit stack on deep graphs |
| Order you get | sources first, wave by wave | reverse finish order |
| Levels / minimum semesters | natural (process the queue in waves) | not natural |
| Smallest order (min-heap) | swap the queue for a heap | awkward |
| Time / space | O(V + E) / O(V + E) | O(V + E) / O(V + E) |

**One-line verdict for interviews:** use Kahn by default (no recursion, easy to explain, gives levels); use DFS when you need the **actual cycle**, when you are already doing a DFS for something else, or when the interviewer asks for it.

### What Kahn tells you on a cycle

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Node 0 points to 1, nodes 1 2 3 form a loop, 3 also points to 4, node 5 is alone. Kahn places 0 and 5, while 1 2 3 and 4 stay stuck">
  <defs>
    <marker id="kd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="80" y="124" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="144" text-anchor="middle">placed</text>
  <rect class="d-box-muted" x="210" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="260" y="124" text-anchor="middle">1</text>
  <text class="d-sub" x="260" y="144" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="20" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="44" text-anchor="middle">2</text>
  <text class="d-sub" x="440" y="64" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">3</text>
  <text class="d-sub" x="440" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="590" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="214" text-anchor="middle">4</text>
  <text class="d-sub" x="640" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-accent" x="590" y="40" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="64" text-anchor="middle">5</text>
  <text class="d-sub" x="640" y="84" text-anchor="middle">placed</text>
  <path class="d-edge" d="M 130 127 L 204 127" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 310 112 L 386 62" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 440 74 L 440 184" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 390 205 L 314 148" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge" d="M 490 217 L 584 217" marker-end="url(#kd1-arrow)"/>
</svg>

Kahn places \`0\` and \`5\` and then the queue is empty. It reports \`1, 2, 3, 4\` as stuck — but \`4\` is **not** on the loop; it is only waiting for \`3\`. So "the stuck nodes" is not "the cycle". If the interviewer asks *which* courses form the loop, Kahn alone cannot say.

### What DFS tells you on a cycle

📌 **Interview term: Three colours** — WHITE = not visited yet, GRAY = visited and still on the current DFS path, BLACK = finished (everything reachable from it is explored).

📌 **Interview term: Back edge** — an edge from the current node to a GRAY node, i.e. to one of its own ancestors on the current path. A directed graph has a cycle **if and only if** DFS finds a back edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="DFS path 0 then 1 then 2 then 3, all gray, and the edge from 3 back to 1 is a back edge that closes the cycle 1 2 3">
  <defs>
    <marker id="kd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="64" text-anchor="middle">0</text>
  <text class="d-sub" x="90" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="220" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="280" y="64" text-anchor="middle">1</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="410" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="470" y="64" text-anchor="middle">2</text>
  <text class="d-sub" x="470" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="600" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="660" y="64" text-anchor="middle">3</text>
  <text class="d-sub" x="660" y="84" text-anchor="middle">GRAY</text>
  <path class="d-edge" d="M 150 67 L 214 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 340 67 L 404 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 594 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge-dashed" d="M 660 98 C 660 170, 280 170, 280 102" fill="none" marker-end="url(#kd2-arrow)"/>
  <text class="d-sub" x="470" y="186" text-anchor="middle">back edge 3 to 1</text>
</svg>

When DFS stands on \`3\`, the GRAY path is \`0, 1, 2, 3\`. The edge \`3 -> 1\` points at a GRAY node, so the cycle is the part of the path from \`1\` to the top, plus \`1\` again: \`1 -> 2 -> 3 -> 1\` (Example 1 prints exactly that). Keep the path in a list next to the colours and the cycle costs nothing extra to report.

**Why GRAY and BLACK must be different.** Meeting a BLACK node is fine: it was fully explored earlier and cannot lead back to the current path (if it could, it would not have finished first). Using a single "visited" flag treats those harmless meetings as cycles — the exact bug dissected in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

### The recursion problem, and the explicit stack

Recursive DFS uses one call frame per node on the current path, so a chain of 200,000 prerequisites needs 200,000 nested calls. Kahn has no such problem. If you want DFS anyway, replace recursion with your own stack of **(node, index of the next neighbour to try)** frames:

📌 **Interview term: Iterative DFS (explicit stack)** — DFS that keeps its own stack in a growable array instead of using the call stack. Each frame remembers where it was in the neighbour list, so a node is finished (turned BLACK and appended) exactly when its frame runs out of neighbours. Example 2 runs it on a 200,000-node chain and its deepest stack reaches 200,000 frames without trouble.

A simpler "push all neighbours at once" iterative DFS is **not** enough for topological sort or cycle detection: it loses the moment a node finishes, so it cannot tell GRAY from BLACK.

## 6. Both Algorithms in Java

**Kahn**, filling the order and returning the stuck nodes:

~~~java
static List<Integer> kahn(int n, int[][] edges, List<Integer> order) {
    List<List<Integer>> adj = adjacency(n, edges);
    int[] indegree = new int[n];
    for (int[] e : edges) indegree[e[1]]++;
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i);
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int v : adj.get(u)) if (--indegree[v] == 0) queue.add(v);
    }
    List<Integer> stuck = new ArrayList<>();
    for (int i = 0; i < n; i++) if (indegree[i] > 0) stuck.add(i);
    return stuck;
}
~~~

**Recursive three-colour DFS**, filling the order or returning the first cycle:

~~~java
static List<Integer> visit(int u) {
    color[u] = GRAY;
    path.add(u);
    for (int v : g.get(u)) {
        if (color[v] == GRAY) {                       // back edge u -> v closes a cycle
            List<Integer> cycle = new ArrayList<>(path.subList(path.indexOf(v), path.size()));
            cycle.add(v);
            return cycle;
        }
        if (color[v] == WHITE) {
            List<Integer> cycle = visit(v);
            if (cycle != null) return cycle;
        }
    }
    path.remove(path.size() - 1);
    color[u] = BLACK;
    finish.add(u);
    return null;
}
~~~

- \`path\` holds the GRAY nodes in order; \`path.subList(path.indexOf(v), path.size())\` is a **view**, so it is copied into a new \`ArrayList\` before \`path\` changes again.
- \`path.remove(path.size() - 1)\` calls \`remove(int index)\`. On a \`List<Integer>\`, \`path.remove(u)\` with an \`int\` would also remove by index, not by value — a classic Java trap.
- \`path.indexOf(v)\` autoboxes \`v\` and compares with \`equals\`, so it is correct even for values outside the small-\`Integer\` cache.

**Iterative DFS for deep graphs.** With the JVM default thread stack, a recursive DFS down a 200,000-node chain threw \`StackOverflowError\` here; it only finished with \`-Xss64m\`. You rarely control JVM flags in an online judge, so use an explicit stack. Example 2 keeps it in two primitive \`int[]\` arrays (node and next-neighbour index), which avoids boxing entirely:

~~~java
static int[] dfsIterative(int n, int[][] adj) {
    final int WHITE = 0, GRAY = 1, BLACK = 2;
    int[] color = new int[n];
    int[] stackNode = new int[n], stackNext = new int[n];
    int[] finish = new int[n];
    int done = 0;
    maxDepth = 0;
    for (int s = 0; s < n; s++) {
        if (color[s] != WHITE) continue;
        color[s] = GRAY;
        int top = 0;
        stackNode[0] = s; stackNext[0] = 0;
        while (top >= 0) {
            maxDepth = Math.max(maxDepth, top + 1);
            int u = stackNode[top], i = stackNext[top];
            if (i < adj[u].length) {
                stackNext[top]++;                  // next time, look at the next neighbour
                int v = adj[u][i];
                if (color[v] == GRAY) return null; // back edge: cycle
                if (color[v] == WHITE) {
                    color[v] = GRAY;
                    top++;
                    stackNode[top] = v; stackNext[top] = 0;
                }
            } else {
                top--;                             // all neighbours done: u finishes
                color[u] = BLACK;
                finish[done++] = u;
            }
        }
    }
    int[] order = new int[n];
    for (int i = 0; i < n; i++) order[i] = finish[n - 1 - i];
    return order;
}
~~~

Example 2 also writes Kahn with an \`int[]\` array as the queue: since every node is enqueued at most once, an array of size n with head and tail indices is enough, and the array itself ends up holding the order.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn and DFS side by side: orders, stuck sets and the actual cycle** prints:

~~~text
DAG
  Kahn: order [4, 5, 2, 0, 3, 1]
  DFS:  order [5, 4, 2, 3, 1, 0]
cycle 1-2-3 with tail 3 -> 4
  Kahn: cycle, placed [0, 5], stuck [1, 2, 3, 4]
  DFS:  cycle 1 -> 2 -> 3 -> 1
self-loop on 1
  Kahn: cycle, placed [0], stuck [1, 2]
  DFS:  cycle 1 -> 1
two components, cycle in the second
  Kahn: cycle, placed [0, 1], stuck [2, 3, 4]
  DFS:  cycle 2 -> 3 -> 4 -> 2
~~~

**Example 2 — A 200,000-node chain: Kahn and explicit-stack DFS, no recursion** prints:

~~~text
chain of 200000: kahn placed 200000, dfs placed 200000
same order: true, starts [0, 1, 2], ends [199997, 199998, 199999]
deepest explicit stack: 200000 frames
closed into a ring: kahn cycle, dfs cycle
~~~

**Reading the output:** In Example 1 both methods agree on whether each graph has a cycle, but they report it differently: Kahn lists the stuck nodes (\`[1, 2, 3, 4]\`, including \`4\`, which is only downstream of the loop), while DFS prints the loop itself (\`1 -> 2 -> 3 -> 1\`). On the DAG they print **different but equally valid** orders (\`[4, 5, 2, 0, 3, 1]\` and \`[5, 4, 2, 3, 1, 0]\`). In the self-loop case DFS reports \`1 -> 1\`. In Example 2, on a 200,000-node chain both produce the same single valid order, and the explicit stack grows to 200,000 frames; closing the chain into a ring makes both report a cycle.

## 8. Complexity

| | Kahn | Recursive DFS | Iterative DFS |
| :--- | :--- | :--- | :--- |
| Time | O(V + E) | O(V + E) | O(V + E) |
| Extra space | O(V) in-degrees + queue | O(V) colours + O(V) call stack | O(V) colours + O(V) heap-allocated stack |
| Adjacency list | O(V + E) | O(V + E) | O(V + E) |
| Fails on deep chains? | no | yes, when the call stack runs out | no |

Every node is queued (Kahn) or visited (DFS) once and every edge is examined once, which gives O(V + E) for all three.

## 9. Which One Should You Pick?

- **Just need yes/no or any valid order?** Kahn. Shortest code, no recursion.
- **Need the minimum number of rounds or semesters?** Kahn in waves.
- **Need the lexicographically smallest order?** Kahn with a min-heap.
- **Need to print the actual cycle?** DFS with a path list.
- **Need to stop at the first cycle quickly?** DFS returns as soon as it sees a back edge; Kahn has to drain the queue first.
- **Already doing a DFS** (for example, computing something per node with memoisation, as in [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force))? Add colours to the DFS you have.
- **Graph could be very deep?** Kahn, or the explicit-stack DFS.

## Common Pitfalls

- **One "visited" array instead of three colours.** A diamond (\`0 -> 1 -> 3\`, \`0 -> 2 -> 3\`) is then reported as a cycle.
- **Calling Kahn's stuck set "the cycle".** It also contains nodes downstream of the cycle.
- **\`subList\` is a view.** Copy it (\`new ArrayList<>(...)\`) before the backing list changes, or you get wrong data or a \`ConcurrentModificationException\`.
- **\`remove(int)\` vs \`remove(Object)\`.** On \`List<Integer>\`, an \`int\` argument removes by index.
- **Recursive DFS on long chains.** \`StackOverflowError\` with the default stack.
- **Push-all-neighbours iterative DFS.** It cannot tell when a node finishes; keep a next-neighbour index per frame.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Kahn:</strong> <span style="color:#f0e2c8;">In-degrees in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> plus an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>; poll in-degree-0 nodes and decrement neighbours. Fewer than V placed means a cycle; leftovers include downstream nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DFS:</strong> <span style="color:#f0e2c8;">Colours WHITE, GRAY, BLACK. An edge into a GRAY node is a back edge, which means a cycle; the GRAY <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> list gives the exact cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Kahn gives sources first; DFS gives the reversed finish order. Both are valid and usually different.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time and space. Kahn uses no recursion; recursive DFS can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> on deep chains.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choice:</strong> <span style="color:#f0e2c8;">Kahn by default and for levels or smallest order; DFS to print the cycle or stop at the first one, with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> stack when deep.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does DFS need GRAY and BLACK, not just visited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meeting a BLACK node is harmless: it finished earlier and cannot reach the current path. Only GRAY means an ancestor, so only GRAY means a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn says nodes 1 to 4 are stuck. Which ones are the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kahn cannot say; 4 is only downstream. Run the colour DFS to get the actual path <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 -&gt; 2 -&gt; 3 -&gt; 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StackOverflowError</code> without changing JVM flags?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an explicit stack (two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays for node and next index), or run the recursive DFS inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Thread(null, task, name, stackSize)</code> with a large stack size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> arrays for the explicit stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> boxing and no per-frame object allocation; the arrays are sized n once because the stack never holds more than n frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one finds a cycle faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same worst case. DFS can return at the first back edge; Kahn must drain the queue before it knows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kahn's algorithm** | topological sort that repeatedly removes in-degree-0 nodes from a queue |
| **DFS topological sort** | record nodes as DFS finishes them, then reverse |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | an edge into a GRAY node; exists exactly when there is a cycle |
| **Stuck set** | nodes Kahn never places: the cycles plus everything downstream of them |
| **Iterative DFS (explicit stack)** | DFS with your own stack of (node, next neighbour index) frames |
| **StackOverflowError** | thrown when a Java thread runs out of stack |

---
**Conclusion:** Kahn and DFS are two views of the same fact — a directed graph has a topological order exactly when it has no cycle. Kahn peels off nodes with no remaining prerequisites and calls it a cycle when some are left; DFS walks paths, calls it a cycle when it meets a node still on the current path, and can hand you that cycle. Both are O(V + E). Pick Kahn for simplicity, levels and no recursion; pick DFS when you need the cycle itself or are already doing a DFS. In Java, prefer Kahn with an \`ArrayDeque\` or an \`int[]\` queue, and when you need DFS on large inputs, use an explicit \`int[]\` stack instead of recursion.`,
        examples: [
          { label: `Kahn and DFS side by side: orders, stuck sets and the actual cycle`, code: `import java.util.*;

public class Main {
    static List<List<Integer>> adjacency(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        return adj;
    }

    // Kahn: fills order and returns the stuck nodes (never reached in-degree 0).
    static List<Integer> kahn(int n, int[][] edges, List<Integer> order) {
        List<List<Integer>> adj = adjacency(n, edges);
        int[] indegree = new int[n];
        for (int[] e : edges) indegree[e[1]]++;
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i);
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order.add(u);
            for (int v : adj.get(u)) if (--indegree[v] == 0) queue.add(v);
        }
        List<Integer> stuck = new ArrayList<>();
        for (int i = 0; i < n; i++) if (indegree[i] > 0) stuck.add(i);
        return stuck;
    }

    static final int WHITE = 0, GRAY = 1, BLACK = 2;
    static List<List<Integer>> g;
    static int[] color;
    static List<Integer> path, finish;

    static List<Integer> visit(int u) {
        color[u] = GRAY;
        path.add(u);
        for (int v : g.get(u)) {
            if (color[v] == GRAY) {                       // back edge u -> v closes a cycle
                List<Integer> cycle = new ArrayList<>(path.subList(path.indexOf(v), path.size()));
                cycle.add(v);
                return cycle;
            }
            if (color[v] == WHITE) {
                List<Integer> cycle = visit(v);
                if (cycle != null) return cycle;
            }
        }
        path.remove(path.size() - 1);
        color[u] = BLACK;
        finish.add(u);
        return null;
    }

    // DFS: fills order (reverse post-order) or returns the first cycle found.
    static List<Integer> dfs(int n, int[][] edges, List<Integer> order) {
        g = adjacency(n, edges);
        color = new int[n];
        path = new ArrayList<>();
        finish = new ArrayList<>();
        for (int s = 0; s < n; s++) {
            if (color[s] == WHITE) {
                List<Integer> cycle = visit(s);
                if (cycle != null) return cycle;
            }
        }
        for (int i = finish.size() - 1; i >= 0; i--) order.add(finish.get(i));
        return null;
    }

    static String arrows(List<Integer> xs) {
        StringJoiner sj = new StringJoiner(" -> ");
        for (int x : xs) sj.add(String.valueOf(x));
        return sj.toString();
    }

    static void report(String name, int n, int[][] edges) {
        List<Integer> kOrder = new ArrayList<>(), dOrder = new ArrayList<>();
        List<Integer> stuck = kahn(n, edges, kOrder);
        List<Integer> cycle = dfs(n, edges, dOrder);
        System.out.println(name);
        if (stuck.isEmpty()) System.out.println("  Kahn: order " + kOrder);
        else System.out.println("  Kahn: cycle, placed " + kOrder + ", stuck " + stuck);
        if (cycle == null) System.out.println("  DFS:  order " + dOrder);
        else System.out.println("  DFS:  cycle " + arrows(cycle));
    }

    public static void main(String[] args) {
        report("DAG", 6, new int[][]{{5, 2}, {5, 0}, {4, 0}, {4, 1}, {2, 3}, {3, 1}});
        report("cycle 1-2-3 with tail 3 -> 4", 6, new int[][]{{0, 1}, {1, 2}, {2, 3}, {3, 1}, {3, 4}});
        report("self-loop on 1", 3, new int[][]{{0, 1}, {1, 1}, {1, 2}});
        report("two components, cycle in the second", 5, new int[][]{{0, 1}, {2, 3}, {3, 4}, {4, 2}});
    }
}` },
          { label: `A 200,000-node chain: Kahn and explicit-stack DFS, no recursion`, code: `import java.util.*;

public class Main {
    static int[] kahn(int n, int[][] adj) {
        int[] indegree = new int[n];
        for (int u = 0; u < n; u++) for (int v : adj[u]) indegree[v]++;
        int[] queue = new int[n];                  // array queue: no Integer boxing
        int head = 0, tail = 0;
        for (int i = 0; i < n; i++) if (indegree[i] == 0) queue[tail++] = i;
        while (head < tail) {
            int u = queue[head++];
            for (int v : adj[u]) if (--indegree[v] == 0) queue[tail++] = v;
        }
        return tail == n ? queue : null;           // the queue array IS the order
    }

    static int maxDepth;

    // Three-colour DFS with an explicit stack of (node, next neighbour index): no recursion.
    static int[] dfsIterative(int n, int[][] adj) {
        final int WHITE = 0, GRAY = 1, BLACK = 2;
        int[] color = new int[n];
        int[] stackNode = new int[n], stackNext = new int[n];
        int[] finish = new int[n];
        int done = 0;
        maxDepth = 0;
        for (int s = 0; s < n; s++) {
            if (color[s] != WHITE) continue;
            color[s] = GRAY;
            int top = 0;
            stackNode[0] = s; stackNext[0] = 0;
            while (top >= 0) {
                maxDepth = Math.max(maxDepth, top + 1);
                int u = stackNode[top], i = stackNext[top];
                if (i < adj[u].length) {
                    stackNext[top]++;                  // next time, look at the next neighbour
                    int v = adj[u][i];
                    if (color[v] == GRAY) return null; // back edge: cycle
                    if (color[v] == WHITE) {
                        color[v] = GRAY;
                        top++;
                        stackNode[top] = v; stackNext[top] = 0;
                    }
                } else {
                    top--;                             // all neighbours done: u finishes
                    color[u] = BLACK;
                    finish[done++] = u;
                }
            }
        }
        int[] order = new int[n];
        for (int i = 0; i < n; i++) order[i] = finish[n - 1 - i];
        return order;
    }

    public static void main(String[] args) {
        int n = 200000;
        int[][] chain = new int[n][];
        for (int i = 0; i < n - 1; i++) chain[i] = new int[]{i + 1};   // 0 -> 1 -> ... -> n-1
        chain[n - 1] = new int[0];
        int[] k = kahn(n, chain);
        int[] d = dfsIterative(n, chain);
        System.out.println("chain of " + n + ": kahn placed " + k.length + ", dfs placed " + d.length);
        System.out.println("same order: " + Arrays.equals(k, d)
            + ", starts " + Arrays.toString(Arrays.copyOfRange(d, 0, 3))
            + ", ends " + Arrays.toString(Arrays.copyOfRange(d, n - 3, n)));
        System.out.println("deepest explicit stack: " + maxDepth + " frames");

        chain[n - 1] = new int[]{0};                                   // close the loop: n-1 -> 0
        int[] d2 = dfsIterative(n, chain);
        System.out.println("closed into a ring: kahn " + (kahn(n, chain) == null ? "cycle" : "ok")
            + ", dfs " + (d2 == null ? "cycle" : "ok"));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"For Course Schedule you can detect the cycle with Kahn's algorithm or with DFS. Explain both, tell me how each one spots a cycle, and when you would choose one over the other. Show me both in C++."

**What a strong answer should cover:**
- Kahn: in-degrees plus a queue; a cycle exists when fewer than V nodes get placed, and the leftover nodes are the cycle plus everything downstream of it.
- DFS: WHITE/GRAY/BLACK colours; an edge into a GRAY node (a back edge) is a cycle, and the GRAY path gives the exact cycle; reverse finish order is the topological order.
- Both are O(V + E) time and O(V + E) space; they usually produce different valid orders.
- Trade-offs: Kahn has no recursion and gives levels and easy lexicographic order; DFS stops at the first cycle and can print it, but needs an explicit stack on deep graphs.
- C++ specifics: deep recursion overflows the native stack and crashes with no exception; an explicit \`vector<pair<int, size_t>>\` stack (careful with references into it) or Kahn with \`std::queue\` avoids it.

**Code / implementation expected:** Yes — both a Kahn function and a three-colour DFS function in C++, ideally with the DFS able to return the cycle.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are asked to plan a pile of chores where some chores must come before others ("buy paint before painting", "move the sofa before painting", "paint before hanging pictures").

**Friend K** looks at the list and asks: *"What can I do right now, with nothing blocking it?"* She does those, crosses them off, and asks the question again. When nothing is left that she can start, either she is done or some chores are blocking each other in a loop.

**Friend D** picks a chore and asks: *"What does this need to unlock?"* She follows that thread as deep as it goes, and only writes a chore on her list **on the way back**, once everything after it is planned. If, while following a thread, she runs into a chore she is still in the middle of planning, she has found a loop — and she can tell you exactly which chores form it.

Friend K is **Kahn's algorithm**. Friend D is **depth-first search (DFS)**. Both solve [Course Schedule](/interview-question/how-do-you-solve-the-course-schedule-prerequisites-problem) in O(V + E), and interviewers love asking which one you would choose and why.

## 2. The Core Distinction

📌 **Interview term: Kahn's algorithm** — topological sort by repeatedly removing a node with **in-degree 0** (no remaining incoming edges) from a queue. If some nodes are never removed, the graph has a cycle. The basics are in [what topological sort is](/interview-question/what-is-topological-sort-and-when-is-it-used).

📌 **Interview term: DFS topological sort** — run a depth-first search, record each node when it **finishes** (after all its descendants), and reverse that list. If the search ever follows an edge into a node that is still in progress, the graph has a cycle.

| | Kahn (BFS-style) | DFS (three colours) |
| :--- | :--- | :--- |
| Core question | what has no unfinished prerequisites? | what does this node lead to? |
| Data structure | in-degree array + queue | colour array + recursion (or an explicit stack) |
| Cycle signal | fewer than V nodes placed | an edge into a GRAY (in-progress) node |
| On a cycle you learn | the **stuck set**: cycle nodes **and everything downstream** | the **exact cycle** as a path |
| Recursion | none | depth up to V; needs an explicit stack on deep graphs |
| Order you get | sources first, wave by wave | reverse finish order |
| Levels / minimum semesters | natural (process the queue in waves) | not natural |
| Smallest order (min-heap) | swap the queue for a heap | awkward |
| Time / space | O(V + E) / O(V + E) | O(V + E) / O(V + E) |

**One-line verdict for interviews:** use Kahn by default (no recursion, easy to explain, gives levels); use DFS when you need the **actual cycle**, when you are already doing a DFS for something else, or when the interviewer asks for it.

### What Kahn tells you on a cycle

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Node 0 points to 1, nodes 1 2 3 form a loop, 3 also points to 4, node 5 is alone. Kahn places 0 and 5, while 1 2 3 and 4 stay stuck">
  <defs>
    <marker id="kd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="80" y="124" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="144" text-anchor="middle">placed</text>
  <rect class="d-box-muted" x="210" y="100" width="100" height="54" rx="8"/>
  <text class="d-text" x="260" y="124" text-anchor="middle">1</text>
  <text class="d-sub" x="260" y="144" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="20" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="44" text-anchor="middle">2</text>
  <text class="d-sub" x="440" y="64" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="390" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">3</text>
  <text class="d-sub" x="440" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-muted" x="590" y="190" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="214" text-anchor="middle">4</text>
  <text class="d-sub" x="640" y="234" text-anchor="middle">stuck</text>
  <rect class="d-box-accent" x="590" y="40" width="100" height="54" rx="8"/>
  <text class="d-text" x="640" y="64" text-anchor="middle">5</text>
  <text class="d-sub" x="640" y="84" text-anchor="middle">placed</text>
  <path class="d-edge" d="M 130 127 L 204 127" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 310 112 L 386 62" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 440 74 L 440 184" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge-accent" d="M 390 205 L 314 148" marker-end="url(#kd1-arrow)"/>
  <path class="d-edge" d="M 490 217 L 584 217" marker-end="url(#kd1-arrow)"/>
</svg>

Kahn places \`0\` and \`5\` and then the queue is empty. It reports \`1, 2, 3, 4\` as stuck — but \`4\` is **not** on the loop; it is only waiting for \`3\`. So "the stuck nodes" is not "the cycle". If the interviewer asks *which* courses form the loop, Kahn alone cannot say.

### What DFS tells you on a cycle

📌 **Interview term: Three colours** — WHITE = not visited yet, GRAY = visited and still on the current DFS path, BLACK = finished (everything reachable from it is explored).

📌 **Interview term: Back edge** — an edge from the current node to a GRAY node, i.e. to one of its own ancestors on the current path. A directed graph has a cycle **if and only if** DFS finds a back edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="DFS path 0 then 1 then 2 then 3, all gray, and the edge from 3 back to 1 is a back edge that closes the cycle 1 2 3">
  <defs>
    <marker id="kd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="90" y="64" text-anchor="middle">0</text>
  <text class="d-sub" x="90" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="220" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="280" y="64" text-anchor="middle">1</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="410" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="470" y="64" text-anchor="middle">2</text>
  <text class="d-sub" x="470" y="84" text-anchor="middle">GRAY</text>
  <rect class="d-box-accent" x="600" y="40" width="120" height="54" rx="8"/>
  <text class="d-text" x="660" y="64" text-anchor="middle">3</text>
  <text class="d-sub" x="660" y="84" text-anchor="middle">GRAY</text>
  <path class="d-edge" d="M 150 67 L 214 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 340 67 L 404 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 594 67" marker-end="url(#kd2-arrow)"/>
  <path class="d-edge-dashed" d="M 660 98 C 660 170, 280 170, 280 102" fill="none" marker-end="url(#kd2-arrow)"/>
  <text class="d-sub" x="470" y="186" text-anchor="middle">back edge 3 to 1</text>
</svg>

When DFS stands on \`3\`, the GRAY path is \`0, 1, 2, 3\`. The edge \`3 -> 1\` points at a GRAY node, so the cycle is the part of the path from \`1\` to the top, plus \`1\` again: \`1 -> 2 -> 3 -> 1\` (Example 1 prints exactly that). Keep the path in a list next to the colours and the cycle costs nothing extra to report.

**Why GRAY and BLACK must be different.** Meeting a BLACK node is fine: it was fully explored earlier and cannot lead back to the current path (if it could, it would not have finished first). Using a single "visited" flag treats those harmless meetings as cycles — the exact bug dissected in [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

### The recursion problem, and the explicit stack

Recursive DFS uses one call frame per node on the current path, so a chain of 200,000 prerequisites needs 200,000 nested calls. Kahn has no such problem. If you want DFS anyway, replace recursion with your own stack of **(node, index of the next neighbour to try)** frames:

📌 **Interview term: Iterative DFS (explicit stack)** — DFS that keeps its own stack in a growable array instead of using the call stack. Each frame remembers where it was in the neighbour list, so a node is finished (turned BLACK and appended) exactly when its frame runs out of neighbours. Example 2 runs it on a 200,000-node chain and its deepest stack reaches 200,000 frames without trouble.

A simpler "push all neighbours at once" iterative DFS is **not** enough for topological sort or cycle detection: it loses the moment a node finishes, so it cannot tell GRAY from BLACK.

## 6. Both Algorithms in C++

**Kahn**, filling the order and returning the stuck nodes:

~~~cpp
vector<int> kahn(int n, const Edges& edges, vector<int>& order) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [u, v] : edges) { adj[u].push_back(v); indegree[v]++; }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) if (--indegree[v] == 0) q.push(v);
    }
    vector<int> stuck;
    for (int i = 0; i < n; i++) if (indegree[i] > 0) stuck.push_back(i);
    return stuck;
}
~~~

**Recursive three-colour DFS**, returning the first cycle (empty if none below \`u\`):

~~~cpp
vector<int> visit(int u) {
    color[u] = GRAY;
    path.push_back(u);
    for (int v : g[u]) {
        if (color[v] == GRAY) {                           // back edge u -> v closes a cycle
            vector<int> cycle(find(path.begin(), path.end(), v), path.end());
            cycle.push_back(v);
            return cycle;
        }
        if (color[v] == WHITE) {
            vector<int> cycle = visit(v);
            if (!cycle.empty()) return cycle;
        }
    }
    path.pop_back();
    color[u] = BLACK;
    finish.push_back(u);
    return {};
}
~~~

- \`enum Color { WHITE, GRAY, BLACK }\` makes the three states readable; \`vector<Color>\` holds them.
- \`find(path.begin(), path.end(), v)\` locates the start of the cycle, and the iterator-range constructor copies from there to the end.

**Iterative DFS for deep graphs.** C++ gives no exception for stack overflow: on this machine (8 MB default stack, \`g++ -O2\`), the recursive version handled a 100,000-node chain and crashed with a segmentation fault on 200,000. Use an explicit stack:

~~~cpp
optional<vector<int>> dfsIterative(int n, const vector<vector<int>>& adj) {
    enum { WHITE, GRAY, BLACK };
    vector<int> color(n, WHITE), finish;
    finish.reserve(n);
    maxDepth = 0;
    for (int s = 0; s < n; s++) {
        if (color[s] != WHITE) continue;
        color[s] = GRAY;
        vector<pair<int, size_t>> stack{{s, 0}};
        while (!stack.empty()) {
            maxDepth = max(maxDepth, (int)stack.size());
            auto& [u, i] = stack.back();     // reference: becomes dangling after push_back
            if (i < adj[u].size()) {
                int v = adj[u][i++];         // next time, look at the next neighbour
                if (color[v] == GRAY) return nullopt;   // back edge: cycle
                if (color[v] == WHITE) { color[v] = GRAY; stack.push_back({v, 0}); }
            } else {
                color[u] = BLACK;            // all neighbours done: u finishes
                finish.push_back(u);
                stack.pop_back();
            }
        }
    }
    reverse(finish.begin(), finish.end());
    return finish;
}
~~~

**Watch the reference.** \`auto& [u, i] = stack.back();\` binds to the last element. \`stack.push_back\` may reallocate the vector, which **invalidates** that reference, so the code reads \`u\` and advances \`i\` **before** pushing and never touches them after. In the finish branch it uses \`u\` before \`pop_back()\` for the same reason.

\`std::optional<vector<int>>\` (C++17) returns "no order" as \`std::nullopt\` without a sentinel value.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Kahn and DFS side by side: orders, stuck sets and the actual cycle** prints:

~~~text
DAG
  Kahn: order [4, 5, 2, 0, 3, 1]
  DFS:  order [5, 4, 2, 3, 1, 0]
cycle 1-2-3 with tail 3 -> 4
  Kahn: cycle, placed [0, 5], stuck [1, 2, 3, 4]
  DFS:  cycle 1 -> 2 -> 3 -> 1
self-loop on 1
  Kahn: cycle, placed [0], stuck [1, 2]
  DFS:  cycle 1 -> 1
two components, cycle in the second
  Kahn: cycle, placed [0, 1], stuck [2, 3, 4]
  DFS:  cycle 2 -> 3 -> 4 -> 2
~~~

**Example 2 — A 200,000-node chain: Kahn and explicit-stack DFS, no recursion** prints:

~~~text
chain of 200000: kahn placed 200000, dfs placed 200000
same order: true, starts [0, 1, 2], ends [199997, 199998, 199999]
deepest explicit stack: 200000 frames
closed into a ring: kahn cycle, dfs cycle
~~~

**Reading the output:** In Example 1 both methods agree on whether each graph has a cycle, but they report it differently: Kahn lists the stuck nodes (\`[1, 2, 3, 4]\`, including \`4\`, which is only downstream of the loop), while DFS prints the loop itself (\`1 -> 2 -> 3 -> 1\`). On the DAG they print **different but equally valid** orders (\`[4, 5, 2, 0, 3, 1]\` and \`[5, 4, 2, 3, 1, 0]\`). In the self-loop case DFS reports \`1 -> 1\`. In Example 2, on a 200,000-node chain both produce the same single valid order, and the explicit stack grows to 200,000 frames; closing the chain into a ring makes both report a cycle.

## 8. Complexity

| | Kahn | Recursive DFS | Iterative DFS |
| :--- | :--- | :--- | :--- |
| Time | O(V + E) | O(V + E) | O(V + E) |
| Extra space | O(V) in-degrees + queue | O(V) colours + O(V) call stack | O(V) colours + O(V) heap-allocated stack |
| Adjacency list | O(V + E) | O(V + E) | O(V + E) |
| Fails on deep chains? | no | yes, when the call stack runs out | no |

Every node is queued (Kahn) or visited (DFS) once and every edge is examined once, which gives O(V + E) for all three.

## 9. Which One Should You Pick?

- **Just need yes/no or any valid order?** Kahn. Shortest code, no recursion.
- **Need the minimum number of rounds or semesters?** Kahn in waves.
- **Need the lexicographically smallest order?** Kahn with a min-heap.
- **Need to print the actual cycle?** DFS with a path list.
- **Need to stop at the first cycle quickly?** DFS returns as soon as it sees a back edge; Kahn has to drain the queue first.
- **Already doing a DFS** (for example, computing something per node with memoisation, as in [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force))? Add colours to the DFS you have.
- **Graph could be very deep?** Kahn, or the explicit-stack DFS.

## Common Pitfalls

- **One "visited" array instead of three colours.** A diamond (\`0 -> 1 -> 3\`, \`0 -> 2 -> 3\`) is then reported as a cycle.
- **Calling Kahn's stuck set "the cycle".** It also contains nodes downstream of the cycle.
- **Dangling references after \`push_back\`.** A reference or iterator into the explicit stack is invalid once the vector grows.
- **Recursive DFS on long chains.** A stack overflow is a crash, not an exception.
- **Signed/unsigned index mix-ups.** Keep the next-neighbour index as \`size_t\` to compare with \`adj[u].size()\` cleanly.
- **Push-all-neighbours iterative DFS.** It cannot tell when a node finishes; keep a next-neighbour index per frame.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Kahn:</strong> <span style="color:#f0e2c8;">In-degrees in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>; take in-degree-0 nodes and decrement neighbours. Fewer than V placed means a cycle; leftovers include downstream nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DFS:</strong> <span style="color:#f0e2c8;">Colours WHITE, GRAY, BLACK. An edge into a GRAY node is a back edge, which means a cycle; the GRAY <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> vector gives the exact cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Kahn gives sources first; DFS gives the reversed finish order. Both are valid and usually different.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time and space. Kahn uses no recursion; recursive DFS can crash on deep chains with no exception.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choice:</strong> <span style="color:#f0e2c8;">Kahn by default and for levels or smallest order; DFS to print the cycle or stop at the first one, with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> stack when deep.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does DFS need GRAY and BLACK, not just visited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meeting a BLACK node is harmless: it finished earlier and cannot reach the current path. Only GRAY means an ancestor, so only GRAY means a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Kahn says nodes 1 to 4 are stuck. Which ones are the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kahn cannot say; 4 is only downstream. Run the colour DFS to get the actual path <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 -&gt; 2 -&gt; 3 -&gt; 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you hold a reference into the explicit stack and then <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push_back</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The vector can reallocate, so the reference dangles: undefined behaviour. Read what you need first, or copy the values out of the frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you catch a stack overflow in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is not a C++ exception; the process is killed (a segmentation fault here at 200,000 levels). Avoid deep recursion instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one finds a cycle faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same worst case. DFS can return at the first back edge; Kahn must drain the queue before it knows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Kahn's algorithm** | topological sort that repeatedly removes in-degree-0 nodes from a queue |
| **DFS topological sort** | record nodes as DFS finishes them, then reverse |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | an edge into a GRAY node; exists exactly when there is a cycle |
| **Stuck set** | nodes Kahn never places: the cycles plus everything downstream of them |
| **Iterative DFS (explicit stack)** | DFS with your own stack of (node, next neighbour index) frames |
| **Reference invalidation** | a reference into a vector becomes dangling when the vector reallocates |

---
**Conclusion:** Kahn and DFS are two views of the same fact — a directed graph has a topological order exactly when it has no cycle. Kahn peels off nodes with no remaining prerequisites and calls it a cycle when some are left; DFS walks paths, calls it a cycle when it meets a node still on the current path, and can hand you that cycle. Both are O(V + E). Pick Kahn for simplicity, levels and no recursion; pick DFS when you need the cycle itself or are already doing a DFS. In C++, prefer Kahn with a \`std::queue\`, and when you need DFS on large inputs, use an explicit \`vector\` stack and never keep a reference into it across a \`push_back\`.`,
        examples: [
          { label: `Kahn and DFS side by side: orders, stuck sets and the actual cycle`, code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Edges = vector<pair<int, int>>;

// Kahn: fills order and returns the stuck nodes (never reached in-degree 0).
vector<int> kahn(int n, const Edges& edges, vector<int>& order) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto [u, v] : edges) { adj[u].push_back(v); indegree[v]++; }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) if (--indegree[v] == 0) q.push(v);
    }
    vector<int> stuck;
    for (int i = 0; i < n; i++) if (indegree[i] > 0) stuck.push_back(i);
    return stuck;
}

enum Color { WHITE, GRAY, BLACK };
vector<vector<int>> g;
vector<Color> color;
vector<int> path, finish;

// Returns the cycle as a path (empty vector if none was found below u).
vector<int> visit(int u) {
    color[u] = GRAY;
    path.push_back(u);
    for (int v : g[u]) {
        if (color[v] == GRAY) {                           // back edge u -> v closes a cycle
            vector<int> cycle(find(path.begin(), path.end(), v), path.end());
            cycle.push_back(v);
            return cycle;
        }
        if (color[v] == WHITE) {
            vector<int> cycle = visit(v);
            if (!cycle.empty()) return cycle;
        }
    }
    path.pop_back();
    color[u] = BLACK;
    finish.push_back(u);
    return {};
}

// DFS: fills order (reverse post-order) or returns the first cycle found.
vector<int> dfs(int n, const Edges& edges, vector<int>& order) {
    g.assign(n, {});
    for (auto [u, v] : edges) g[u].push_back(v);
    color.assign(n, WHITE);
    path.clear();
    finish.clear();
    for (int s = 0; s < n; s++) {
        if (color[s] == WHITE) {
            vector<int> cycle = visit(s);
            if (!cycle.empty()) return cycle;
        }
    }
    order.assign(finish.rbegin(), finish.rend());
    return {};
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

string arrows(const vector<int>& a) {
    string s;
    for (size_t i = 0; i < a.size(); i++) s += (i ? " -> " : "") + to_string(a[i]);
    return s;
}

void report(const string& name, int n, const Edges& edges) {
    vector<int> kOrder, dOrder;
    vector<int> stuck = kahn(n, edges, kOrder);
    vector<int> cycle = dfs(n, edges, dOrder);
    cout << name << "\\n";
    if (stuck.empty()) cout << "  Kahn: order " << fmt(kOrder) << "\\n";
    else cout << "  Kahn: cycle, placed " << fmt(kOrder) << ", stuck " << fmt(stuck) << "\\n";
    if (cycle.empty()) cout << "  DFS:  order " << fmt(dOrder) << "\\n";
    else cout << "  DFS:  cycle " << arrows(cycle) << "\\n";
}

int main() {
    report("DAG", 6, {{5, 2}, {5, 0}, {4, 0}, {4, 1}, {2, 3}, {3, 1}});
    report("cycle 1-2-3 with tail 3 -> 4", 6, {{0, 1}, {1, 2}, {2, 3}, {3, 1}, {3, 4}});
    report("self-loop on 1", 3, {{0, 1}, {1, 1}, {1, 2}});
    report("two components, cycle in the second", 5, {{0, 1}, {2, 3}, {3, 4}, {4, 2}});
}` },
          { label: `A 200,000-node chain: Kahn and explicit-stack DFS, no recursion`, code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>
using namespace std;

optional<vector<int>> kahn(int n, const vector<vector<int>>& adj) {
    vector<int> indegree(n, 0);
    for (int u = 0; u < n; u++) for (int v : adj[u]) indegree[v]++;
    vector<int> order;                       // used as the queue too: head walks forward
    order.reserve(n);
    for (int i = 0; i < n; i++) if (indegree[i] == 0) order.push_back(i);
    for (size_t head = 0; head < order.size(); head++) {
        int u = order[head];
        for (int v : adj[u]) if (--indegree[v] == 0) order.push_back(v);
    }
    if ((int)order.size() != n) return nullopt;
    return order;
}

int maxDepth;

// Three-colour DFS with an explicit stack of (node, next neighbour index): no recursion.
optional<vector<int>> dfsIterative(int n, const vector<vector<int>>& adj) {
    enum { WHITE, GRAY, BLACK };
    vector<int> color(n, WHITE), finish;
    finish.reserve(n);
    maxDepth = 0;
    for (int s = 0; s < n; s++) {
        if (color[s] != WHITE) continue;
        color[s] = GRAY;
        vector<pair<int, size_t>> stack{{s, 0}};
        while (!stack.empty()) {
            maxDepth = max(maxDepth, (int)stack.size());
            auto& [u, i] = stack.back();     // reference: becomes dangling after push_back
            if (i < adj[u].size()) {
                int v = adj[u][i++];         // next time, look at the next neighbour
                if (color[v] == GRAY) return nullopt;   // back edge: cycle
                if (color[v] == WHITE) { color[v] = GRAY; stack.push_back({v, 0}); }
            } else {
                color[u] = BLACK;            // all neighbours done: u finishes
                finish.push_back(u);
                stack.pop_back();
            }
        }
    }
    reverse(finish.begin(), finish.end());
    return finish;
}

string fmt(vector<int>::const_iterator b, vector<int>::const_iterator e) {
    string s = "[";
    for (auto it = b; it != e; ++it) s += (it != b ? ", " : "") + to_string(*it);
    return s + "]";
}

int main() {
    cout << boolalpha;
    int n = 200000;
    vector<vector<int>> chain(n);
    for (int i = 0; i < n - 1; i++) chain[i] = {i + 1};      // 0 -> 1 -> ... -> n-1
    auto k = kahn(n, chain);
    auto d = dfsIterative(n, chain);
    cout << "chain of " << n << ": kahn placed " << k->size() << ", dfs placed " << d->size() << "\\n";
    cout << "same order: " << (*k == *d) << ", starts " << fmt(d->begin(), d->begin() + 3)
         << ", ends " << fmt(d->end() - 3, d->end()) << "\\n";
    cout << "deepest explicit stack: " << maxDepth << " frames\\n";

    chain[n - 1] = {0};                                         // close the loop: n-1 -> 0
    auto d2 = dfsIterative(n, chain);
    cout << "closed into a ring: kahn " << (kahn(n, chain) ? "ok" : "cycle")
         << ", dfs " << (d2 ? "ok" : "cycle") << "\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How do you detect a cycle in a directed graph?`,
    difficulty: "medium",
    seoDescription: `Detect a cycle in a directed graph in Python, JavaScript, Java and C++: three-colour DFS, back edges, why a visited set fails, and Kahn's algorithm.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a directed graph with n nodes and a list of edges, tell me whether it contains a cycle. If you can, return one cycle as a list of nodes. Please code it in Python."

**What a strong answer should cover:**
- Why a single "visited" flag gives false positives in a directed graph (a diamond is not a cycle).
- Three-colour DFS: WHITE/GRAY/BLACK, a cycle exactly when an edge reaches a GRAY node (a back edge), and why BLACK nodes are safe.
- Restarting DFS from every unvisited node, self-loops, and recovering the cycle from the current path.
- O(V + E) time and O(V) extra space, with Kahn's algorithm as the non-recursive alternative.
- Python specifics: a nested \`visit\` function closing over a \`color\` list, \`any(...)\` over start nodes, the 1000-frame default recursion limit, and returning the cycle with list slicing.

**Clarifying questions expected:**
- "Do you need just true/false, or the cycle itself?"
- "Can there be self-loops, and is the graph connected?"

**Code / implementation expected:** Yes — a three-colour DFS \`hasCycle\` (ideally returning the cycle) in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture an office where nobody may start work until someone else hands them something. Ana waits for Ben's report. Ben waits for Chen's numbers. Chen waits for... Ana's sign-off. Everyone is busy *waiting*, nobody is working, and nothing will ever happen. Computers call this a **deadlock**, and the classic way to detect one is exactly this: draw an arrow from each waiting party to the party it waits for (a *wait-for graph*), and look for a loop.

The same loop check appears everywhere: a spreadsheet formula that refers to itself through three other cells, a package that (indirectly) depends on itself, a course that is its own prerequisite. In each case the arrows are **one-way**, so the question is: **does this directed graph contain a cycle?**

It sounds like the "visited set" trick you may know from undirected graphs. It is not — and the reason why is the heart of the interview question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want true/false, or the cycle itself? | Returning the cycle needs the current DFS path; true/false needs only colours (or Kahn). |
| How is the graph given — edge list, adjacency list, n nodes numbered 0 to n-1? | Decides whether you build an adjacency list first. |
| Can there be self-loops or repeated edges? | \`a -> a\` is a cycle of length 1; repeated edges are harmless. |
| Is the graph connected? | Usually not guaranteed; you must start a search from every unvisited node. |
| How many nodes, and how long can a path be? | A path of 10^5 nodes overflows a recursive DFS in most languages. |

## 3. Why "Seen It Before" Is Not a Cycle

📌 **Interview term: Directed cycle** — a path that follows the arrows and returns to its starting node, such as \`0 -> 1 -> 2 -> 0\`. A self-loop \`0 -> 0\` counts.

In an **undirected** graph, meeting an already-visited node (other than the one you came from) does mean a cycle. In a **directed** graph it does not. Look at this diamond:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Diamond graph: 0 points to 1 and 2, both 1 and 2 point to 3. There is no directed cycle even though 3 is reached twice">
  <defs>
    <marker id="dc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="137" text-anchor="middle">0</text>
  <rect class="d-box" x="260" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="260" y="190" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="222" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="555" y="129" text-anchor="middle">3</text>
  <text class="d-sub" x="555" y="149" text-anchor="middle">reached twice</text>
  <path class="d-edge" d="M 140 120 L 254 62" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 140 144 L 254 204" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 370 62 L 494 120" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 204 L 494 144" marker-end="url(#dc1-arrow)"/>
</svg>

DFS goes \`0 -> 1 -> 3\`, finishes 3, backs up, then tries \`0 -> 2 -> 3\` (dashed). Node 3 has been seen before, but there is **no way to follow the arrows from 3 back to 2 or 0**. The diamond is a perfectly good DAG (directed acyclic graph). A single \`visited\` flag reports a cycle here — Example 2 shows it getting the diamond and the "two roots share a sink" graph wrong.

The missing information is **"is that node still on my current path?"** That is what the three colours add.

## 4. The Three-Colour DFS

📌 **Interview term: Three colours (WHITE / GRAY / BLACK)** — WHITE: not visited yet. GRAY: entered, and still on the current DFS path (its call has not returned). BLACK: finished; everything reachable from it has been explored.

📌 **Interview term: Back edge** — an edge \`u -> v\` where \`v\` is GRAY, i.e. an ancestor of \`u\` on the current path. **A directed graph has a cycle if and only if a DFS finds a back edge.**

The algorithm:

1. Colour every node WHITE.
2. For each WHITE node \`s\`, run \`visit(s)\`.
3. \`visit(u)\`: colour \`u\` GRAY; for each neighbour \`v\`: if \`v\` is GRAY, **cycle**; if \`v\` is WHITE, \`visit(v)\`; if \`v\` is BLACK, ignore it. Then colour \`u\` BLACK.

**Why it is correct, both directions.**

- *Back edge means cycle:* if \`u -> v\` and \`v\` is GRAY, then \`v\` is an ancestor of \`u\`, so there is a path \`v -> ... -> u\` along the DFS tree. Add the edge \`u -> v\` and you have a cycle.
- *Cycle means back edge:* take the cycle node \`v\` that DFS discovers first. While \`v\` is GRAY, DFS reaches every node reachable from \`v\`, including the cycle node \`w\` just before \`v\` on the cycle. When DFS examines \`w -> v\`, \`v\` is still GRAY: a back edge.
- *BLACK is safe:* a BLACK node finished before we got here; if it could reach the current path it would have reached a GRAY node and reported a cycle already.

### All four kinds of edges

📌 **Interview term: Edge classification** — DFS sorts every edge \`u -> v\` into one of four kinds: **tree** (\`v\` was WHITE, DFS went there), **back** (\`v\` GRAY: cycle), **forward** (\`v\` BLACK and discovered after \`u\`: a descendant reached by a shortcut), **cross** (\`v\` BLACK and discovered before \`u\`: another, finished branch). Only back edges matter for cycles; forward and cross edges are exactly the "seen before but harmless" cases that fool the single-flag version.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Diamond with shortcut: tree edges 0 to 1, 1 to 3 and 0 to 2, a cross edge 2 to 3 and a forward edge 0 to 3">
  <defs>
    <marker id="dc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="152" text-anchor="middle">0</text>
  <rect class="d-box" x="280" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="226" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="258" text-anchor="middle">2</text>
  <rect class="d-box" x="540" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 140 134 L 274 62" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="84">tree</text>
  <path class="d-edge" d="M 390 62 L 534 134" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="84">tree</text>
  <path class="d-edge" d="M 140 160 L 274 238" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="226">tree</text>
  <path class="d-edge-dashed" d="M 390 238 L 534 160" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="226">cross</text>
  <path class="d-edge-accent" d="M 140 147 L 534 147" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="300" y="138">forward</text>
</svg>

DFS from 0 visits 1 and then 3 (tree edges), finishes them, then visits 2 (tree). The edge \`2 -> 3\` meets a BLACK node discovered earlier: **cross**. The edge \`0 -> 3\` meets a BLACK descendant of 0: **forward**. No GRAY node is ever met, so there is no cycle. Example 1 prints exactly these labels, using discovery times to tell forward from cross.

### Returning the cycle itself

Keep a list \`path\` of the GRAY nodes in order (push on entry, pop on exit). When a back edge \`u -> v\` appears, the cycle is the part of \`path\` from \`v\` to the end, followed by \`v\` again. For \`0 -> 1 -> 2 -> 0\` the path is \`[0, 1, 2]\` when \`2 -> 0\` is examined, giving \`0 -> 1 -> 2 -> 0\`.

## 5. Other Ways to Answer the Same Question

- **Kahn's algorithm:** repeatedly remove nodes with in-degree 0; if some are never removed, there is a cycle. No recursion, but it cannot name the cycle. The two are compared in detail in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs), and Kahn itself is the core of [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).
- **Strongly connected components:** a directed graph has a cycle exactly when some component has two or more nodes, or a node has a self-loop. Overkill for yes/no, useful when you need *every* cycle group: see [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Every node has exactly one outgoing edge** (a "functional graph", like a linked list): Floyd's tortoise and hare works with O(1) extra space, as in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list).
- **Undirected graphs** are a different problem: a visited set with a parent check, or [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure), works there.

## 6. The Code in Python

The minimal yes/no version (from Example 2):

~~~python
def three_colour(n, edges):
    """Correct: a cycle only when we meet a node that is still on the current path."""
    adj = adjacency(n, edges)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n

    def visit(u):
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:
                return True
            if color[v] == WHITE and visit(v):
                return True
        color[u] = BLACK                 # finished: safe to meet again later
        return False

    return any(color[s] == WHITE and visit(s) for s in range(n))
~~~

- \`any(color[s] == WHITE and visit(s) for s in range(n))\` restarts DFS from every untouched node and stops at the first cycle, because \`any\` short-circuits.
- \`visit\` is nested, so it can read \`adj\` and mutate \`color\` without globals.
- Constants \`WHITE, GRAY, BLACK = 0, 1, 2\` make the three states readable; Python has \`enum.Enum\` too, but plain ints are faster to compare and print.

**The full version** (Example 1) keeps \`path\` (the GRAY nodes in order) and discovery times. When it meets a GRAY \`v\`, \`path[path.index(v):] + [v]\` is the cycle. Discovery times tell a forward edge (\`disc[u] < disc[v]\`) from a cross edge. Because a nested function cannot rebind an outer integer without \`nonlocal\`, the clock is a one-element list \`clock = [0]\` that the function mutates:

~~~python
def visit(u):
    clock[0] += 1
    disc[u] = clock[0]
    color[u] = GRAY
    path.append(u)
    for v in adj[u]:
        if color[v] == WHITE:
            labels.append((u, v, "tree"))
            visit(v)
        elif color[v] == GRAY:      # v is an ancestor still on the path
            labels.append((u, v, "BACK"))
            if not first_cycle:
                first_cycle.extend(path[path.index(v):] + [v])
        elif disc[u] < disc[v]:     # finished descendant of u
            labels.append((u, v, "forward"))
        else:                       # finished node in another branch
            labels.append((u, v, "cross"))
    path.pop()
    color[u] = BLACK
~~~

**Recursion depth.** Each GRAY node is one Python frame. The default limit is 1000 (\`sys.getrecursionlimit()\` printed 1000 on Python 3.13 here), so a path longer than that raises \`RecursionError\`. For big inputs use Kahn or an explicit stack.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Three-colour DFS that labels every edge and returns the cycle** prints:

~~~text
diamond with a shortcut
  edges: 0->1 tree, 1->3 tree, 0->2 tree, 2->3 cross, 0->3 forward
  has cycle: false
loop 0-1-2 with an exit
  edges: 0->1 tree, 1->2 tree, 2->0 BACK, 2->3 tree
  has cycle: true, e.g. 0 -> 1 -> 2 -> 0
self-loop
  edges: 0->0 BACK
  has cycle: true, e.g. 0 -> 0
cycle only in the second piece
  edges: 0->1 tree, 2->1 cross, 2->3 tree, 3->2 BACK
  has cycle: true, e.g. 2 -> 3 -> 2
two loops
  edges: 0->1 tree, 1->0 BACK, 1->2 tree, 2->3 tree, 3->4 tree, 4->2 BACK
  has cycle: true, e.g. 0 -> 1 -> 0
~~~

**Example 2 — Why one visited flag is wrong: naive vs three colours vs Kahn** prints:

~~~text
graph | truth | naive visited | three-colour | kahn
diamond 0->1->3, 0->2->3 | false | true (WRONG) | false | false
two roots share a sink | false | true (WRONG) | false | false
plain chain | false | false | false | false
triangle 0->1->2->0 | true | true | true | true
self-loop | true | true | true | true
~~~

**Reading the output:** Example 1 labels every edge. The diamond with a shortcut has tree, cross and forward edges but no back edge, so no cycle. In the loop graph, \`2->0\` is the back edge and the cycle is \`0 -> 1 -> 2 -> 0\`; a self-loop is a back edge to itself. In the graph whose cycle is only in the second piece, the outer loop restarts DFS at node 2 and finds \`3->2\`. With two loops, both back edges are labelled, and the first cycle reported is \`0 -> 1 -> 0\`. Example 2 is the table that justifies three colours: the single \`visited\` flag says \`true (WRONG)\` on the diamond and on two roots sharing a sink, while three-colour DFS and Kahn match the truth on every graph.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Single visited flag | O(V + E) | O(V) | wrong for directed graphs (false positives) |
| Three-colour DFS | O(V + E) | O(V) colours + O(V) recursion | can return the cycle; early exit on first back edge |
| Kahn's algorithm | O(V + E) | O(V) in-degrees + queue | no recursion; cannot name the cycle |
| SCC (Tarjan or Kosaraju) | O(V + E) | O(V) | finds every cycle group, more code |

Plus O(V + E) for the adjacency list itself. Each node gets coloured GRAY once and BLACK once, and each edge is examined once.

## 9. Edge Cases

- **Self-loop \`a -> a\`:** \`a\` is GRAY when its own edge is examined, so it is a back edge and a cycle of length 1.
- **Disconnected graph:** the outer \`for s in all nodes\` loop is required; a cycle in a piece unreachable from node 0 is otherwise missed.
- **Repeated edges:** examined twice, harmless.
- **Empty graph or no edges:** no cycle.
- **Two-node cycle \`a -> b -> a\`:** a real cycle in a directed graph (in an undirected graph the same pair would be one edge).
- **Very deep paths:** recursion depth equals the longest DFS path; use an explicit stack (shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs)) or Kahn.

## Common Pitfalls

- **One visited set.** False positives on diamonds and shared sinks (Example 2).
- **Never turning nodes BLACK.** If finished nodes stay GRAY, every later revisit looks like a cycle; if you reset them to WHITE instead of BLACK, they get explored again and the search can take exponential time.
- **Starting only from node 0.** Cycles in other pieces are missed; loop over all nodes.
- **Rebinding an outer int inside \`visit\`.** \`clock += 1\` in a nested function raises \`UnboundLocalError\` without \`nonlocal\`; use \`nonlocal clock\` or a one-element list.
- **Recursion limit.** Paths longer than about 1000 nodes raise \`RecursionError\`.
- **Forgetting self-loops.** They are cycles; a "skip if v == parent" check copied from undirected code would wrongly ignore them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Trap:</strong> <span style="color:#f0e2c8;">A single visited set is wrong for directed graphs: a diamond reaches the same node twice without any cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Colours:</strong> <span style="color:#f0e2c8;">WHITE unvisited, GRAY on the current path, BLACK finished. An edge into a GRAY node is a back edge, and a back edge exists exactly when there is a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">For every WHITE node run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visit</code>: mark GRAY, recurse into WHITE neighbours, report a cycle on GRAY, then mark BLACK. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any(...)</code> short-circuits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cycle:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> of GRAY nodes; on a back edge to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[path.index(v):] + [v]</code> is the cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(V + E) time, O(V) extra; Kahn is the no-recursion alternative because Python stops at 1000 frames by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is meeting a BLACK node not a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finished before we reached it, so nothing reachable from it is on the current path; otherwise it would have hit a GRAY node and we would already have stopped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all nodes that are on some cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute strongly connected components; every node in a component of size 2 or more, or with a self-loop, is on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each node has exactly one outgoing edge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a functional graph; Floyd tortoise and hare from each unvisited node finds cycles with O(1) extra memory per walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a graph with 10^5 nodes in a line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion would hit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>. Use Kahn with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>, or an explicit stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, next_index]</code> frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from cycle detection in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undirected uses a visited set plus a parent check, or Union-Find. Directed needs GRAY versus BLACK because edges are one-way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed cycle** | a path along the arrows that returns to its start |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | edge into a GRAY ancestor; exists exactly when there is a cycle |
| **Edge classification** | tree, back, forward and cross edges of a DFS |
| **Forward edge** | edge to an already finished descendant |
| **Cross edge** | edge to an already finished node in another branch |
| **nonlocal** | lets a nested function rebind a variable of the enclosing function |

---
**Conclusion:** In a directed graph, reaching a node twice is not a cycle; reaching a node that is **still on your current path** is. Three-colour DFS captures exactly that: WHITE, GRAY, BLACK, and a cycle precisely when an edge points at a GRAY node. It runs in O(V + E), stops at the first back edge, and the GRAY path hands you the cycle itself; Kahn's algorithm gives the same yes/no without recursion. In Python it fits in a dozen lines with a nested \`visit\` and \`any\`, as long as the paths stay under the recursion limit; beyond that, switch to Kahn or an explicit stack.`,
        examples: [
          { label: `Three-colour DFS that labels every edge and returns the cycle`, code: `WHITE, GRAY, BLACK = 0, 1, 2


def classify(n, edges):
    """Three-colour DFS that labels every edge and returns the first cycle it closes."""
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    color = [WHITE] * n
    disc = [0] * n                      # discovery time, to tell forward from cross
    clock = [0]
    path = []                           # the GRAY nodes, root first
    labels = []
    first_cycle = []

    def visit(u):
        clock[0] += 1
        disc[u] = clock[0]
        color[u] = GRAY
        path.append(u)
        for v in adj[u]:
            if color[v] == WHITE:
                labels.append((u, v, "tree"))
                visit(v)
            elif color[v] == GRAY:      # v is an ancestor still on the path
                labels.append((u, v, "BACK"))
                if not first_cycle:
                    first_cycle.extend(path[path.index(v):] + [v])
            elif disc[u] < disc[v]:     # finished descendant of u
                labels.append((u, v, "forward"))
            else:                       # finished node in another branch
                labels.append((u, v, "cross"))
        path.pop()
        color[u] = BLACK

    for s in range(n):
        if color[s] == WHITE:
            visit(s)
    return labels, first_cycle


def report(name, n, edges):
    labels, cycle = classify(n, edges)
    print(name)
    print("  edges: " + ", ".join(str(u) + "->" + str(v) + " " + t for u, v, t in labels))
    if cycle:
        print("  has cycle: true, e.g. " + " -> ".join(str(x) for x in cycle))
    else:
        print("  has cycle: false")


report("diamond with a shortcut", 4, [(0, 1), (0, 2), (1, 3), (2, 3), (0, 3)])
report("loop 0-1-2 with an exit", 4, [(0, 1), (1, 2), (2, 0), (2, 3)])
report("self-loop", 1, [(0, 0)])
report("cycle only in the second piece", 4, [(0, 1), (2, 1), (2, 3), (3, 2)])
report("two loops", 5, [(0, 1), (1, 0), (1, 2), (2, 3), (3, 4), (4, 2)])` },
          { label: `Why one visited flag is wrong: naive vs three colours vs Kahn`, code: `from collections import deque


def adjacency(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    return adj


def naive_visited(n, edges):
    """WRONG for directed graphs: says cycle whenever it meets ANY visited node."""
    adj = adjacency(n, edges)
    visited = [False] * n

    def visit(u):
        visited[u] = True
        for v in adj[u]:
            if visited[v] or visit(v):
                return True
        return False

    return any(not visited[s] and visit(s) for s in range(n))


def three_colour(n, edges):
    """Correct: a cycle only when we meet a node that is still on the current path."""
    adj = adjacency(n, edges)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n

    def visit(u):
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:
                return True
            if color[v] == WHITE and visit(v):
                return True
        color[u] = BLACK                 # finished: safe to meet again later
        return False

    return any(color[s] == WHITE and visit(s) for s in range(n))


def kahn_has_cycle(n, edges):
    adj = adjacency(n, edges)
    indegree = [0] * n
    for _, v in edges:
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    placed = 0
    while queue:
        u = queue.popleft()
        placed += 1
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return placed < n


tests = [
    ("diamond 0->1->3, 0->2->3", 4, [(0, 1), (0, 2), (1, 3), (2, 3)], False),
    ("two roots share a sink", 3, [(0, 2), (1, 2)], False),
    ("plain chain", 3, [(0, 1), (1, 2)], False),
    ("triangle 0->1->2->0", 3, [(0, 1), (1, 2), (2, 0)], True),
    ("self-loop", 2, [(0, 1), (1, 1)], True),
]
print("graph | truth | naive visited | three-colour | kahn")
for name, n, edges, truth in tests:
    row = [truth, naive_visited(n, edges), three_colour(n, edges), kahn_has_cycle(n, edges)]
    marks = [str(x).lower() + ("" if x == truth else " (WRONG)") for x in row]
    print(name + " | " + " | ".join(marks))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a directed graph with n nodes and a list of edges, tell me whether it contains a cycle. If you can, return one cycle as a list of nodes. Please code it in JavaScript."

**What a strong answer should cover:**
- Why a single "visited" flag gives false positives in a directed graph (a diamond is not a cycle).
- Three-colour DFS: WHITE/GRAY/BLACK, a cycle exactly when an edge reaches a GRAY node (a back edge), and why BLACK nodes are safe.
- Restarting DFS from every unvisited node, self-loops, and recovering the cycle from the current path.
- O(V + E) time and O(V) extra space, with Kahn's algorithm as the non-recursive alternative.
- JavaScript specifics: an inner function closing over arrays, \`Array.from\` adjacency lists, \`RangeError\` on deep recursion, and building the cycle with \`slice\` and \`concat\`.

**Clarifying questions expected:**
- "Do you need just true/false, or the cycle itself?"
- "Can there be self-loops, and is the graph connected?"

**Code / implementation expected:** Yes — a three-colour DFS \`hasCycle\` (ideally returning the cycle) in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture an office where nobody may start work until someone else hands them something. Ana waits for Ben's report. Ben waits for Chen's numbers. Chen waits for... Ana's sign-off. Everyone is busy *waiting*, nobody is working, and nothing will ever happen. Computers call this a **deadlock**, and the classic way to detect one is exactly this: draw an arrow from each waiting party to the party it waits for (a *wait-for graph*), and look for a loop.

The same loop check appears everywhere: a spreadsheet formula that refers to itself through three other cells, a package that (indirectly) depends on itself, a course that is its own prerequisite. In each case the arrows are **one-way**, so the question is: **does this directed graph contain a cycle?**

It sounds like the "visited set" trick you may know from undirected graphs. It is not — and the reason why is the heart of the interview question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want true/false, or the cycle itself? | Returning the cycle needs the current DFS path; true/false needs only colours (or Kahn). |
| How is the graph given — edge list, adjacency list, n nodes numbered 0 to n-1? | Decides whether you build an adjacency list first. |
| Can there be self-loops or repeated edges? | \`a -> a\` is a cycle of length 1; repeated edges are harmless. |
| Is the graph connected? | Usually not guaranteed; you must start a search from every unvisited node. |
| How many nodes, and how long can a path be? | A path of 10^5 nodes overflows a recursive DFS in most languages. |

## 3. Why "Seen It Before" Is Not a Cycle

📌 **Interview term: Directed cycle** — a path that follows the arrows and returns to its starting node, such as \`0 -> 1 -> 2 -> 0\`. A self-loop \`0 -> 0\` counts.

In an **undirected** graph, meeting an already-visited node (other than the one you came from) does mean a cycle. In a **directed** graph it does not. Look at this diamond:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Diamond graph: 0 points to 1 and 2, both 1 and 2 point to 3. There is no directed cycle even though 3 is reached twice">
  <defs>
    <marker id="dc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="137" text-anchor="middle">0</text>
  <rect class="d-box" x="260" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="260" y="190" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="222" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="555" y="129" text-anchor="middle">3</text>
  <text class="d-sub" x="555" y="149" text-anchor="middle">reached twice</text>
  <path class="d-edge" d="M 140 120 L 254 62" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 140 144 L 254 204" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 370 62 L 494 120" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 204 L 494 144" marker-end="url(#dc1-arrow)"/>
</svg>

DFS goes \`0 -> 1 -> 3\`, finishes 3, backs up, then tries \`0 -> 2 -> 3\` (dashed). Node 3 has been seen before, but there is **no way to follow the arrows from 3 back to 2 or 0**. The diamond is a perfectly good DAG (directed acyclic graph). A single \`visited\` flag reports a cycle here — Example 2 shows it getting the diamond and the "two roots share a sink" graph wrong.

The missing information is **"is that node still on my current path?"** That is what the three colours add.

## 4. The Three-Colour DFS

📌 **Interview term: Three colours (WHITE / GRAY / BLACK)** — WHITE: not visited yet. GRAY: entered, and still on the current DFS path (its call has not returned). BLACK: finished; everything reachable from it has been explored.

📌 **Interview term: Back edge** — an edge \`u -> v\` where \`v\` is GRAY, i.e. an ancestor of \`u\` on the current path. **A directed graph has a cycle if and only if a DFS finds a back edge.**

The algorithm:

1. Colour every node WHITE.
2. For each WHITE node \`s\`, run \`visit(s)\`.
3. \`visit(u)\`: colour \`u\` GRAY; for each neighbour \`v\`: if \`v\` is GRAY, **cycle**; if \`v\` is WHITE, \`visit(v)\`; if \`v\` is BLACK, ignore it. Then colour \`u\` BLACK.

**Why it is correct, both directions.**

- *Back edge means cycle:* if \`u -> v\` and \`v\` is GRAY, then \`v\` is an ancestor of \`u\`, so there is a path \`v -> ... -> u\` along the DFS tree. Add the edge \`u -> v\` and you have a cycle.
- *Cycle means back edge:* take the cycle node \`v\` that DFS discovers first. While \`v\` is GRAY, DFS reaches every node reachable from \`v\`, including the cycle node \`w\` just before \`v\` on the cycle. When DFS examines \`w -> v\`, \`v\` is still GRAY: a back edge.
- *BLACK is safe:* a BLACK node finished before we got here; if it could reach the current path it would have reached a GRAY node and reported a cycle already.

### All four kinds of edges

📌 **Interview term: Edge classification** — DFS sorts every edge \`u -> v\` into one of four kinds: **tree** (\`v\` was WHITE, DFS went there), **back** (\`v\` GRAY: cycle), **forward** (\`v\` BLACK and discovered after \`u\`: a descendant reached by a shortcut), **cross** (\`v\` BLACK and discovered before \`u\`: another, finished branch). Only back edges matter for cycles; forward and cross edges are exactly the "seen before but harmless" cases that fool the single-flag version.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Diamond with shortcut: tree edges 0 to 1, 1 to 3 and 0 to 2, a cross edge 2 to 3 and a forward edge 0 to 3">
  <defs>
    <marker id="dc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="152" text-anchor="middle">0</text>
  <rect class="d-box" x="280" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="226" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="258" text-anchor="middle">2</text>
  <rect class="d-box" x="540" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 140 134 L 274 62" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="84">tree</text>
  <path class="d-edge" d="M 390 62 L 534 134" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="84">tree</text>
  <path class="d-edge" d="M 140 160 L 274 238" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="226">tree</text>
  <path class="d-edge-dashed" d="M 390 238 L 534 160" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="226">cross</text>
  <path class="d-edge-accent" d="M 140 147 L 534 147" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="300" y="138">forward</text>
</svg>

DFS from 0 visits 1 and then 3 (tree edges), finishes them, then visits 2 (tree). The edge \`2 -> 3\` meets a BLACK node discovered earlier: **cross**. The edge \`0 -> 3\` meets a BLACK descendant of 0: **forward**. No GRAY node is ever met, so there is no cycle. Example 1 prints exactly these labels, using discovery times to tell forward from cross.

### Returning the cycle itself

Keep a list \`path\` of the GRAY nodes in order (push on entry, pop on exit). When a back edge \`u -> v\` appears, the cycle is the part of \`path\` from \`v\` to the end, followed by \`v\` again. For \`0 -> 1 -> 2 -> 0\` the path is \`[0, 1, 2]\` when \`2 -> 0\` is examined, giving \`0 -> 1 -> 2 -> 0\`.

## 5. Other Ways to Answer the Same Question

- **Kahn's algorithm:** repeatedly remove nodes with in-degree 0; if some are never removed, there is a cycle. No recursion, but it cannot name the cycle. The two are compared in detail in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs), and Kahn itself is the core of [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).
- **Strongly connected components:** a directed graph has a cycle exactly when some component has two or more nodes, or a node has a self-loop. Overkill for yes/no, useful when you need *every* cycle group: see [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Every node has exactly one outgoing edge** (a "functional graph", like a linked list): Floyd's tortoise and hare works with O(1) extra space, as in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list).
- **Undirected graphs** are a different problem: a visited set with a parent check, or [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure), works there.

## 6. The Code in JavaScript

The minimal yes/no version (from Example 2):

~~~javascript
function threeColour(n, edges) {
  const adj = adjacency(n, edges);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  function visit(u) {
    color[u] = GRAY;
    for (const v of adj[u]) {
      if (color[v] === GRAY) return true;
      if (color[v] === WHITE && visit(v)) return true;
    }
    color[u] = BLACK;                 // finished: safe to meet again later
    return false;
  }
  for (let s = 0; s < n; s++) if (color[s] === WHITE && visit(s)) return true;
  return false;
}
~~~

- The outer \`for\` loop restarts DFS from every WHITE node and returns at the first cycle.
- \`visit\` is an inner function, so it closes over \`adj\` and \`color\`; no globals.
- \`const WHITE = 0, GRAY = 1, BLACK = 2\` keeps the states readable; comparisons use \`===\`.

**The full version** (Example 1) keeps \`path\` (the GRAY nodes in order) and discovery times. When it meets a GRAY \`v\`, \`path.slice(path.indexOf(v)).concat([v])\` is the cycle; discovery times (\`disc[u] < disc[v]\`) separate forward from cross edges. The \`clock\` is a \`let\` in the outer function, which the inner \`visit\` can update directly through the closure:

~~~javascript
function visit(u) {
  disc[u] = ++clock;
  color[u] = GRAY;
  path.push(u);
  for (const v of adj[u]) {
    if (color[v] === WHITE) {
      labels.push(u + '->' + v + ' tree');
      visit(v);
    } else if (color[v] === GRAY) {         // v is an ancestor still on the path
      labels.push(u + '->' + v + ' BACK');
      if (firstCycle.length === 0) firstCycle = path.slice(path.indexOf(v)).concat([v]);
    } else if (disc[u] < disc[v]) {         // finished descendant of u
      labels.push(u + '->' + v + ' forward');
    } else {                                // finished node in another branch
      labels.push(u + '->' + v + ' cross');
    }
  }
  path.pop();
  color[u] = BLACK;
}
~~~

**Recursion depth.** Each GRAY node is one call frame. A deep enough path throws \`RangeError: Maximum call stack size exceeded\` (a 200,000-node chain did on Node 22 here); the exact limit depends on the engine. For big inputs use Kahn or an explicit stack.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (they use only \`console.log\`, so they also run in the browser runner on this page). The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Three-colour DFS that labels every edge and returns the cycle** prints:

~~~text
diamond with a shortcut
  edges: 0->1 tree, 1->3 tree, 0->2 tree, 2->3 cross, 0->3 forward
  has cycle: false
loop 0-1-2 with an exit
  edges: 0->1 tree, 1->2 tree, 2->0 BACK, 2->3 tree
  has cycle: true, e.g. 0 -> 1 -> 2 -> 0
self-loop
  edges: 0->0 BACK
  has cycle: true, e.g. 0 -> 0
cycle only in the second piece
  edges: 0->1 tree, 2->1 cross, 2->3 tree, 3->2 BACK
  has cycle: true, e.g. 2 -> 3 -> 2
two loops
  edges: 0->1 tree, 1->0 BACK, 1->2 tree, 2->3 tree, 3->4 tree, 4->2 BACK
  has cycle: true, e.g. 0 -> 1 -> 0
~~~

**Example 2 — Why one visited flag is wrong: naive vs three colours vs Kahn** prints:

~~~text
graph | truth | naive visited | three-colour | kahn
diamond 0->1->3, 0->2->3 | false | true (WRONG) | false | false
two roots share a sink | false | true (WRONG) | false | false
plain chain | false | false | false | false
triangle 0->1->2->0 | true | true | true | true
self-loop | true | true | true | true
~~~

**Reading the output:** Example 1 labels every edge. The diamond with a shortcut has tree, cross and forward edges but no back edge, so no cycle. In the loop graph, \`2->0\` is the back edge and the cycle is \`0 -> 1 -> 2 -> 0\`; a self-loop is a back edge to itself. In the graph whose cycle is only in the second piece, the outer loop restarts DFS at node 2 and finds \`3->2\`. With two loops, both back edges are labelled, and the first cycle reported is \`0 -> 1 -> 0\`. Example 2 is the table that justifies three colours: the single \`visited\` flag says \`true (WRONG)\` on the diamond and on two roots sharing a sink, while three-colour DFS and Kahn match the truth on every graph.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Single visited flag | O(V + E) | O(V) | wrong for directed graphs (false positives) |
| Three-colour DFS | O(V + E) | O(V) colours + O(V) recursion | can return the cycle; early exit on first back edge |
| Kahn's algorithm | O(V + E) | O(V) in-degrees + queue | no recursion; cannot name the cycle |
| SCC (Tarjan or Kosaraju) | O(V + E) | O(V) | finds every cycle group, more code |

Plus O(V + E) for the adjacency list itself. Each node gets coloured GRAY once and BLACK once, and each edge is examined once.

## 9. Edge Cases

- **Self-loop \`a -> a\`:** \`a\` is GRAY when its own edge is examined, so it is a back edge and a cycle of length 1.
- **Disconnected graph:** the outer \`for s in all nodes\` loop is required; a cycle in a piece unreachable from node 0 is otherwise missed.
- **Repeated edges:** examined twice, harmless.
- **Empty graph or no edges:** no cycle.
- **Two-node cycle \`a -> b -> a\`:** a real cycle in a directed graph (in an undirected graph the same pair would be one edge).
- **Very deep paths:** recursion depth equals the longest DFS path; use an explicit stack (shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs)) or Kahn.

## Common Pitfalls

- **One visited set.** False positives on diamonds and shared sinks (Example 2).
- **Never turning nodes BLACK.** Resetting to WHITE on exit instead of BLACK can make the search exponential.
- **Starting only from node 0.** Cycles in other pieces are missed; loop over all nodes.
- **\`if (color[v] = GRAY)\`.** A single \`=\` assigns and is always truthy for \`1\`; use \`===\`.
- **Deep recursion.** \`RangeError\` once the call stack runs out.
- **Forgetting self-loops.** They are cycles; a "skip if v is the parent" check copied from undirected code would wrongly ignore them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Trap:</strong> <span style="color:#f0e2c8;">A single visited set is wrong for directed graphs: a diamond reaches the same node twice without any cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Colours:</strong> <span style="color:#f0e2c8;">WHITE unvisited, GRAY on the current path, BLACK finished. An edge into a GRAY node is a back edge, and a back edge exists exactly when there is a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">For every WHITE node run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visit</code>: mark GRAY, recurse into WHITE neighbours, report a cycle on GRAY, then mark BLACK.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cycle:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> of GRAY nodes; on a back edge to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path.slice(path.indexOf(v)).concat([v])</code> is the cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(V + E) time, O(V) extra; Kahn is the no-recursion alternative because deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is meeting a BLACK node not a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finished before we reached it, so nothing reachable from it is on the current path; otherwise it would have hit a GRAY node and we would already have stopped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all nodes that are on some cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute strongly connected components; every node in a component of size 2 or more, or with a self-loop, is on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Nodes are strings, like module names. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from name to neighbour array and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for colours (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">color.get(v)</code>); missing means WHITE. The algorithm is identical.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a graph with 10^5 nodes in a line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion may throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>. Use Kahn with a head-indexed array, or an explicit stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, nextIndex]</code> frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from cycle detection in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undirected uses a visited set plus a parent check, or Union-Find. Directed needs GRAY versus BLACK because edges are one-way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed cycle** | a path along the arrows that returns to its start |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | edge into a GRAY ancestor; exists exactly when there is a cycle |
| **Edge classification** | tree, back, forward and cross edges of a DFS |
| **Forward edge** | edge to an already finished descendant |
| **Cross edge** | edge to an already finished node in another branch |
| **Closure** | an inner function that keeps access to the outer function variables |

---
**Conclusion:** In a directed graph, reaching a node twice is not a cycle; reaching a node that is **still on your current path** is. Three-colour DFS captures exactly that: WHITE, GRAY, BLACK, and a cycle precisely when an edge points at a GRAY node. It runs in O(V + E), stops at the first back edge, and the GRAY path hands you the cycle itself; Kahn's algorithm gives the same yes/no without recursion. In JavaScript it fits in a dozen lines with an inner \`visit\` closure, as long as the paths stay within the call-stack limit; beyond that, switch to Kahn or an explicit stack.`,
        examples: [
          { label: `Three-colour DFS that labels every edge and returns the cycle`, code: `const WHITE = 0, GRAY = 1, BLACK = 2;

// Three-colour DFS that labels every edge and returns the first cycle it closes.
function classify(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  const color = new Array(n).fill(WHITE);
  const disc = new Array(n).fill(0);          // discovery time, to tell forward from cross
  let clock = 0;
  const path = [];                            // the GRAY nodes, root first
  const labels = [];
  let firstCycle = [];

  function visit(u) {
    disc[u] = ++clock;
    color[u] = GRAY;
    path.push(u);
    for (const v of adj[u]) {
      if (color[v] === WHITE) {
        labels.push(u + '->' + v + ' tree');
        visit(v);
      } else if (color[v] === GRAY) {         // v is an ancestor still on the path
        labels.push(u + '->' + v + ' BACK');
        if (firstCycle.length === 0) firstCycle = path.slice(path.indexOf(v)).concat([v]);
      } else if (disc[u] < disc[v]) {         // finished descendant of u
        labels.push(u + '->' + v + ' forward');
      } else {                                // finished node in another branch
        labels.push(u + '->' + v + ' cross');
      }
    }
    path.pop();
    color[u] = BLACK;
  }

  for (let s = 0; s < n; s++) if (color[s] === WHITE) visit(s);
  return { labels, firstCycle };
}

function report(name, n, edges) {
  const { labels, firstCycle } = classify(n, edges);
  console.log(name);
  console.log('  edges: ' + labels.join(', '));
  if (firstCycle.length > 0) console.log('  has cycle: true, e.g. ' + firstCycle.join(' -> '));
  else console.log('  has cycle: false');
}

report('diamond with a shortcut', 4, [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]]);
report('loop 0-1-2 with an exit', 4, [[0, 1], [1, 2], [2, 0], [2, 3]]);
report('self-loop', 1, [[0, 0]]);
report('cycle only in the second piece', 4, [[0, 1], [2, 1], [2, 3], [3, 2]]);
report('two loops', 5, [[0, 1], [1, 0], [1, 2], [2, 3], [3, 4], [4, 2]]);` },
          { label: `Why one visited flag is wrong: naive vs three colours vs Kahn`, code: `function adjacency(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  return adj;
}

// WRONG for directed graphs: says cycle whenever it meets ANY visited node.
function naiveVisited(n, edges) {
  const adj = adjacency(n, edges);
  const visited = new Array(n).fill(false);
  function visit(u) {
    visited[u] = true;
    for (const v of adj[u]) if (visited[v] || visit(v)) return true;
    return false;
  }
  for (let s = 0; s < n; s++) if (!visited[s] && visit(s)) return true;
  return false;
}

// Correct: a cycle only when we meet a node that is still on the current path.
function threeColour(n, edges) {
  const adj = adjacency(n, edges);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  function visit(u) {
    color[u] = GRAY;
    for (const v of adj[u]) {
      if (color[v] === GRAY) return true;
      if (color[v] === WHITE && visit(v)) return true;
    }
    color[u] = BLACK;                 // finished: safe to meet again later
    return false;
  }
  for (let s = 0; s < n; s++) if (color[s] === WHITE && visit(s)) return true;
  return false;
}

function kahnHasCycle(n, edges) {
  const adj = adjacency(n, edges);
  const indegree = new Array(n).fill(0);
  for (const [, v] of edges) indegree[v]++;
  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  let placed = 0;
  for (let head = 0; head < queue.length; head++) {
    placed++;
    for (const v of adj[queue[head]]) if (--indegree[v] === 0) queue.push(v);
  }
  return placed < n;
}

const tests = [
  ['diamond 0->1->3, 0->2->3', 4, [[0, 1], [0, 2], [1, 3], [2, 3]], false],
  ['two roots share a sink', 3, [[0, 2], [1, 2]], false],
  ['plain chain', 3, [[0, 1], [1, 2]], false],
  ['triangle 0->1->2->0', 3, [[0, 1], [1, 2], [2, 0]], true],
  ['self-loop', 2, [[0, 1], [1, 1]], true],
];
console.log('graph | truth | naive visited | three-colour | kahn');
for (const [name, n, edges, truth] of tests) {
  const row = [truth, naiveVisited(n, edges), threeColour(n, edges), kahnHasCycle(n, edges)];
  const marks = row.map((x) => String(x) + (x === truth ? '' : ' (WRONG)'));
  console.log(name + ' | ' + marks.join(' | '));
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a directed graph with n nodes and a list of edges, tell me whether it contains a cycle. If you can, return one cycle as a list of nodes. Please code it in Java."

**What a strong answer should cover:**
- Why a single "visited" flag gives false positives in a directed graph (a diamond is not a cycle).
- Three-colour DFS: WHITE/GRAY/BLACK, a cycle exactly when an edge reaches a GRAY node (a back edge), and why BLACK nodes are safe.
- Restarting DFS from every unvisited node, self-loops, and recovering the cycle from the current path.
- O(V + E) time and O(V) extra space, with Kahn's algorithm as the non-recursive alternative.
- Java specifics: static fields or a small class for the colour array and adjacency, \`List<List<Integer>>\`, \`subList\` being a view, and \`StackOverflowError\` on deep recursion.

**Clarifying questions expected:**
- "Do you need just true/false, or the cycle itself?"
- "Can there be self-loops, and is the graph connected?"

**Code / implementation expected:** Yes — a three-colour DFS \`hasCycle\` (ideally returning the cycle) in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture an office where nobody may start work until someone else hands them something. Ana waits for Ben's report. Ben waits for Chen's numbers. Chen waits for... Ana's sign-off. Everyone is busy *waiting*, nobody is working, and nothing will ever happen. Computers call this a **deadlock**, and the classic way to detect one is exactly this: draw an arrow from each waiting party to the party it waits for (a *wait-for graph*), and look for a loop.

The same loop check appears everywhere: a spreadsheet formula that refers to itself through three other cells, a package that (indirectly) depends on itself, a course that is its own prerequisite. In each case the arrows are **one-way**, so the question is: **does this directed graph contain a cycle?**

It sounds like the "visited set" trick you may know from undirected graphs. It is not — and the reason why is the heart of the interview question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want true/false, or the cycle itself? | Returning the cycle needs the current DFS path; true/false needs only colours (or Kahn). |
| How is the graph given — edge list, adjacency list, n nodes numbered 0 to n-1? | Decides whether you build an adjacency list first. |
| Can there be self-loops or repeated edges? | \`a -> a\` is a cycle of length 1; repeated edges are harmless. |
| Is the graph connected? | Usually not guaranteed; you must start a search from every unvisited node. |
| How many nodes, and how long can a path be? | A path of 10^5 nodes overflows a recursive DFS in most languages. |

## 3. Why "Seen It Before" Is Not a Cycle

📌 **Interview term: Directed cycle** — a path that follows the arrows and returns to its starting node, such as \`0 -> 1 -> 2 -> 0\`. A self-loop \`0 -> 0\` counts.

In an **undirected** graph, meeting an already-visited node (other than the one you came from) does mean a cycle. In a **directed** graph it does not. Look at this diamond:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Diamond graph: 0 points to 1 and 2, both 1 and 2 point to 3. There is no directed cycle even though 3 is reached twice">
  <defs>
    <marker id="dc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="137" text-anchor="middle">0</text>
  <rect class="d-box" x="260" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="260" y="190" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="222" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="555" y="129" text-anchor="middle">3</text>
  <text class="d-sub" x="555" y="149" text-anchor="middle">reached twice</text>
  <path class="d-edge" d="M 140 120 L 254 62" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 140 144 L 254 204" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 370 62 L 494 120" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 204 L 494 144" marker-end="url(#dc1-arrow)"/>
</svg>

DFS goes \`0 -> 1 -> 3\`, finishes 3, backs up, then tries \`0 -> 2 -> 3\` (dashed). Node 3 has been seen before, but there is **no way to follow the arrows from 3 back to 2 or 0**. The diamond is a perfectly good DAG (directed acyclic graph). A single \`visited\` flag reports a cycle here — Example 2 shows it getting the diamond and the "two roots share a sink" graph wrong.

The missing information is **"is that node still on my current path?"** That is what the three colours add.

## 4. The Three-Colour DFS

📌 **Interview term: Three colours (WHITE / GRAY / BLACK)** — WHITE: not visited yet. GRAY: entered, and still on the current DFS path (its call has not returned). BLACK: finished; everything reachable from it has been explored.

📌 **Interview term: Back edge** — an edge \`u -> v\` where \`v\` is GRAY, i.e. an ancestor of \`u\` on the current path. **A directed graph has a cycle if and only if a DFS finds a back edge.**

The algorithm:

1. Colour every node WHITE.
2. For each WHITE node \`s\`, run \`visit(s)\`.
3. \`visit(u)\`: colour \`u\` GRAY; for each neighbour \`v\`: if \`v\` is GRAY, **cycle**; if \`v\` is WHITE, \`visit(v)\`; if \`v\` is BLACK, ignore it. Then colour \`u\` BLACK.

**Why it is correct, both directions.**

- *Back edge means cycle:* if \`u -> v\` and \`v\` is GRAY, then \`v\` is an ancestor of \`u\`, so there is a path \`v -> ... -> u\` along the DFS tree. Add the edge \`u -> v\` and you have a cycle.
- *Cycle means back edge:* take the cycle node \`v\` that DFS discovers first. While \`v\` is GRAY, DFS reaches every node reachable from \`v\`, including the cycle node \`w\` just before \`v\` on the cycle. When DFS examines \`w -> v\`, \`v\` is still GRAY: a back edge.
- *BLACK is safe:* a BLACK node finished before we got here; if it could reach the current path it would have reached a GRAY node and reported a cycle already.

### All four kinds of edges

📌 **Interview term: Edge classification** — DFS sorts every edge \`u -> v\` into one of four kinds: **tree** (\`v\` was WHITE, DFS went there), **back** (\`v\` GRAY: cycle), **forward** (\`v\` BLACK and discovered after \`u\`: a descendant reached by a shortcut), **cross** (\`v\` BLACK and discovered before \`u\`: another, finished branch). Only back edges matter for cycles; forward and cross edges are exactly the "seen before but harmless" cases that fool the single-flag version.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Diamond with shortcut: tree edges 0 to 1, 1 to 3 and 0 to 2, a cross edge 2 to 3 and a forward edge 0 to 3">
  <defs>
    <marker id="dc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="152" text-anchor="middle">0</text>
  <rect class="d-box" x="280" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="226" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="258" text-anchor="middle">2</text>
  <rect class="d-box" x="540" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 140 134 L 274 62" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="84">tree</text>
  <path class="d-edge" d="M 390 62 L 534 134" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="84">tree</text>
  <path class="d-edge" d="M 140 160 L 274 238" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="226">tree</text>
  <path class="d-edge-dashed" d="M 390 238 L 534 160" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="226">cross</text>
  <path class="d-edge-accent" d="M 140 147 L 534 147" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="300" y="138">forward</text>
</svg>

DFS from 0 visits 1 and then 3 (tree edges), finishes them, then visits 2 (tree). The edge \`2 -> 3\` meets a BLACK node discovered earlier: **cross**. The edge \`0 -> 3\` meets a BLACK descendant of 0: **forward**. No GRAY node is ever met, so there is no cycle. Example 1 prints exactly these labels, using discovery times to tell forward from cross.

### Returning the cycle itself

Keep a list \`path\` of the GRAY nodes in order (push on entry, pop on exit). When a back edge \`u -> v\` appears, the cycle is the part of \`path\` from \`v\` to the end, followed by \`v\` again. For \`0 -> 1 -> 2 -> 0\` the path is \`[0, 1, 2]\` when \`2 -> 0\` is examined, giving \`0 -> 1 -> 2 -> 0\`.

## 5. Other Ways to Answer the Same Question

- **Kahn's algorithm:** repeatedly remove nodes with in-degree 0; if some are never removed, there is a cycle. No recursion, but it cannot name the cycle. The two are compared in detail in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs), and Kahn itself is the core of [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).
- **Strongly connected components:** a directed graph has a cycle exactly when some component has two or more nodes, or a node has a self-loop. Overkill for yes/no, useful when you need *every* cycle group: see [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Every node has exactly one outgoing edge** (a "functional graph", like a linked list): Floyd's tortoise and hare works with O(1) extra space, as in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list).
- **Undirected graphs** are a different problem: a visited set with a parent check, or [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure), works there.

## 6. The Code in Java

The minimal yes/no version (from Example 2), with the adjacency list and colour array held in static fields so the recursive method stays short:

~~~java
static boolean colourVisit(int u) {
    color[u] = GRAY;
    for (int v : adj.get(u)) {
        if (color[v] == GRAY) return true;
        if (color[v] == WHITE && colourVisit(v)) return true;
    }
    color[u] = BLACK;                  // finished: safe to meet again later
    return false;
}

static boolean threeColour(int n, int[][] edges) {
    build(n, edges);
    color = new int[n];
    for (int s = 0; s < n; s++) if (color[s] == WHITE && colourVisit(s)) return true;
    return false;
}
~~~

- \`new int[n]\` starts at 0, which is \`WHITE\`, so no initialisation loop is needed.
- \`static final int WHITE = 0, GRAY = 1, BLACK = 2\` are compile-time constants; an \`enum\` would also work but costs an object array.
- The outer loop restarts DFS from every WHITE node.

**The full version** (Example 1) keeps \`path\` and discovery times. On a back edge it copies \`path.subList(path.indexOf(v), path.size())\` into a new \`ArrayList\` — \`subList\` is only a view of \`path\`, which keeps changing:

~~~java
static void visit(int u) {
    disc[u] = ++clock;
    color[u] = GRAY;
    path.add(u);
    for (int v : adj.get(u)) {
        if (color[v] == WHITE) {
            labels.add(u + "->" + v + " tree");
            visit(v);
        } else if (color[v] == GRAY) {             // v is an ancestor still on the path
            labels.add(u + "->" + v + " BACK");
            if (firstCycle.isEmpty()) {
                firstCycle.addAll(path.subList(path.indexOf(v), path.size()));
                firstCycle.add(v);
            }
        } else if (disc[u] < disc[v]) {            // finished descendant of u
            labels.add(u + "->" + v + " forward");
        } else {                                   // finished node in another branch
            labels.add(u + "->" + v + " cross");
        }
    }
    path.remove(path.size() - 1);
    color[u] = BLACK;
}
~~~

**Recursion depth.** Each GRAY node is one stack frame. On the default thread stack, a 200,000-deep chain threw \`StackOverflowError\` here (it worked with \`-Xss64m\`). For big inputs use Kahn or an explicit stack.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Three-colour DFS that labels every edge and returns the cycle** prints:

~~~text
diamond with a shortcut
  edges: 0->1 tree, 1->3 tree, 0->2 tree, 2->3 cross, 0->3 forward
  has cycle: false
loop 0-1-2 with an exit
  edges: 0->1 tree, 1->2 tree, 2->0 BACK, 2->3 tree
  has cycle: true, e.g. 0 -> 1 -> 2 -> 0
self-loop
  edges: 0->0 BACK
  has cycle: true, e.g. 0 -> 0
cycle only in the second piece
  edges: 0->1 tree, 2->1 cross, 2->3 tree, 3->2 BACK
  has cycle: true, e.g. 2 -> 3 -> 2
two loops
  edges: 0->1 tree, 1->0 BACK, 1->2 tree, 2->3 tree, 3->4 tree, 4->2 BACK
  has cycle: true, e.g. 0 -> 1 -> 0
~~~

**Example 2 — Why one visited flag is wrong: naive vs three colours vs Kahn** prints:

~~~text
graph | truth | naive visited | three-colour | kahn
diamond 0->1->3, 0->2->3 | false | true (WRONG) | false | false
two roots share a sink | false | true (WRONG) | false | false
plain chain | false | false | false | false
triangle 0->1->2->0 | true | true | true | true
self-loop | true | true | true | true
~~~

**Reading the output:** Example 1 labels every edge. The diamond with a shortcut has tree, cross and forward edges but no back edge, so no cycle. In the loop graph, \`2->0\` is the back edge and the cycle is \`0 -> 1 -> 2 -> 0\`; a self-loop is a back edge to itself. In the graph whose cycle is only in the second piece, the outer loop restarts DFS at node 2 and finds \`3->2\`. With two loops, both back edges are labelled, and the first cycle reported is \`0 -> 1 -> 0\`. Example 2 is the table that justifies three colours: the single \`visited\` flag says \`true (WRONG)\` on the diamond and on two roots sharing a sink, while three-colour DFS and Kahn match the truth on every graph.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Single visited flag | O(V + E) | O(V) | wrong for directed graphs (false positives) |
| Three-colour DFS | O(V + E) | O(V) colours + O(V) recursion | can return the cycle; early exit on first back edge |
| Kahn's algorithm | O(V + E) | O(V) in-degrees + queue | no recursion; cannot name the cycle |
| SCC (Tarjan or Kosaraju) | O(V + E) | O(V) | finds every cycle group, more code |

Plus O(V + E) for the adjacency list itself. Each node gets coloured GRAY once and BLACK once, and each edge is examined once.

## 9. Edge Cases

- **Self-loop \`a -> a\`:** \`a\` is GRAY when its own edge is examined, so it is a back edge and a cycle of length 1.
- **Disconnected graph:** the outer \`for s in all nodes\` loop is required; a cycle in a piece unreachable from node 0 is otherwise missed.
- **Repeated edges:** examined twice, harmless.
- **Empty graph or no edges:** no cycle.
- **Two-node cycle \`a -> b -> a\`:** a real cycle in a directed graph (in an undirected graph the same pair would be one edge).
- **Very deep paths:** recursion depth equals the longest DFS path; use an explicit stack (shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs)) or Kahn.

## Common Pitfalls

- **One \`boolean[] visited\`.** False positives on diamonds and shared sinks (Example 2).
- **Never turning nodes BLACK.** Resetting to WHITE on exit instead of BLACK can make the search exponential.
- **Starting only from node 0.** Cycles in other pieces are missed; loop over all nodes.
- **Keeping a \`subList\` view.** It reflects later changes to \`path\`; copy it into a new list.
- **Deep recursion.** \`StackOverflowError\` with the default thread stack.
- **Static state between test cases.** Re-create \`color\`, \`path\` and the adjacency list for every graph, or results leak from one call to the next.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Trap:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[] visited</code> is wrong for directed graphs: a diamond reaches the same node twice without any cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Colours:</strong> <span style="color:#f0e2c8;">WHITE unvisited, GRAY on the current path, BLACK finished. An edge into a GRAY node is a back edge, and a back edge exists exactly when there is a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">For every WHITE node run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visit</code>: mark GRAY, recurse into WHITE neighbours, report a cycle on GRAY, then mark BLACK. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n]</code> starts all WHITE.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cycle:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> of GRAY nodes; on a back edge to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path.subList(path.indexOf(v), path.size())</code> and append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(V + E) time, O(V) extra; Kahn is the no-recursion alternative because deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is meeting a BLACK node not a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finished before we reached it, so nothing reachable from it is on the current path; otherwise it would have hit a GRAY node and we would already have stopped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all nodes that are on some cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute strongly connected components; every node in a component of size 2 or more, or with a self-loop, is on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why copy the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">subList</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subList</code> returns a view backed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>. After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path.remove(...)</code> the view is stale and using it can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConcurrentModificationException</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a graph with 10^5 nodes in a line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>. Use Kahn with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>, an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> stack, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> constructed with a larger stack size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from cycle detection in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undirected uses a visited set plus a parent check, or Union-Find. Directed needs GRAY versus BLACK because edges are one-way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed cycle** | a path along the arrows that returns to its start |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | edge into a GRAY ancestor; exists exactly when there is a cycle |
| **Edge classification** | tree, back, forward and cross edges of a DFS |
| **Forward edge** | edge to an already finished descendant |
| **Cross edge** | edge to an already finished node in another branch |
| **subList view** | a window onto a list that changes when the list changes |

---
**Conclusion:** In a directed graph, reaching a node twice is not a cycle; reaching a node that is **still on your current path** is. Three-colour DFS captures exactly that: WHITE, GRAY, BLACK, and a cycle precisely when an edge points at a GRAY node. It runs in O(V + E), stops at the first back edge, and the GRAY path hands you the cycle itself; Kahn's algorithm gives the same yes/no without recursion. In Java it fits in a short recursive method over an \`int[]\` of colours, as long as the paths stay within the thread stack; beyond that, switch to Kahn or an explicit stack.`,
        examples: [
          { label: `Three-colour DFS that labels every edge and returns the cycle`, code: `import java.util.*;

public class Main {
    static final int WHITE = 0, GRAY = 1, BLACK = 2;
    static List<List<Integer>> adj;
    static int[] color, disc;
    static int clock;
    static List<Integer> path, firstCycle;
    static List<String> labels;

    static void visit(int u) {
        disc[u] = ++clock;
        color[u] = GRAY;
        path.add(u);
        for (int v : adj.get(u)) {
            if (color[v] == WHITE) {
                labels.add(u + "->" + v + " tree");
                visit(v);
            } else if (color[v] == GRAY) {             // v is an ancestor still on the path
                labels.add(u + "->" + v + " BACK");
                if (firstCycle.isEmpty()) {
                    firstCycle.addAll(path.subList(path.indexOf(v), path.size()));
                    firstCycle.add(v);
                }
            } else if (disc[u] < disc[v]) {            // finished descendant of u
                labels.add(u + "->" + v + " forward");
            } else {                                   // finished node in another branch
                labels.add(u + "->" + v + " cross");
            }
        }
        path.remove(path.size() - 1);
        color[u] = BLACK;
    }

    // Three-colour DFS that labels every edge and records the first cycle it closes.
    static void classify(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        color = new int[n];
        disc = new int[n];
        clock = 0;
        path = new ArrayList<>();
        firstCycle = new ArrayList<>();
        labels = new ArrayList<>();
        for (int s = 0; s < n; s++) if (color[s] == WHITE) visit(s);
    }

    static void report(String name, int n, int[][] edges) {
        classify(n, edges);
        System.out.println(name);
        System.out.println("  edges: " + String.join(", ", labels));
        if (!firstCycle.isEmpty()) {
            StringJoiner sj = new StringJoiner(" -> ");
            for (int x : firstCycle) sj.add(String.valueOf(x));
            System.out.println("  has cycle: true, e.g. " + sj);
        } else {
            System.out.println("  has cycle: false");
        }
    }

    public static void main(String[] args) {
        report("diamond with a shortcut", 4, new int[][]{{0, 1}, {0, 2}, {1, 3}, {2, 3}, {0, 3}});
        report("loop 0-1-2 with an exit", 4, new int[][]{{0, 1}, {1, 2}, {2, 0}, {2, 3}});
        report("self-loop", 1, new int[][]{{0, 0}});
        report("cycle only in the second piece", 4, new int[][]{{0, 1}, {2, 1}, {2, 3}, {3, 2}});
        report("two loops", 5, new int[][]{{0, 1}, {1, 0}, {1, 2}, {2, 3}, {3, 4}, {4, 2}});
    }
}` },
          { label: `Why one visited flag is wrong: naive vs three colours vs Kahn`, code: `import java.util.*;

public class Main {
    static List<List<Integer>> adj;
    static boolean[] visited;
    static int[] color;
    static final int WHITE = 0, GRAY = 1, BLACK = 2;

    static void build(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
    }

    // WRONG for directed graphs: says cycle whenever it meets ANY visited node.
    static boolean naiveVisit(int u) {
        visited[u] = true;
        for (int v : adj.get(u)) if (visited[v] || naiveVisit(v)) return true;
        return false;
    }

    static boolean naiveVisited(int n, int[][] edges) {
        build(n, edges);
        visited = new boolean[n];
        for (int s = 0; s < n; s++) if (!visited[s] && naiveVisit(s)) return true;
        return false;
    }

    // Correct: a cycle only when we meet a node that is still on the current path.
    static boolean colourVisit(int u) {
        color[u] = GRAY;
        for (int v : adj.get(u)) {
            if (color[v] == GRAY) return true;
            if (color[v] == WHITE && colourVisit(v)) return true;
        }
        color[u] = BLACK;                  // finished: safe to meet again later
        return false;
    }

    static boolean threeColour(int n, int[][] edges) {
        build(n, edges);
        color = new int[n];
        for (int s = 0; s < n; s++) if (color[s] == WHITE && colourVisit(s)) return true;
        return false;
    }

    static boolean kahnHasCycle(int n, int[][] edges) {
        build(n, edges);
        int[] indegree = new int[n];
        for (int[] e : edges) indegree[e[1]]++;
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i);
        int placed = 0;
        while (!queue.isEmpty()) {
            int u = queue.poll();
            placed++;
            for (int v : adj.get(u)) if (--indegree[v] == 0) queue.add(v);
        }
        return placed < n;
    }

    static String mark(boolean x, boolean truth) {
        return x + (x == truth ? "" : " (WRONG)");
    }

    public static void main(String[] args) {
        String[] names = {"diamond 0->1->3, 0->2->3", "two roots share a sink", "plain chain",
                          "triangle 0->1->2->0", "self-loop"};
        int[] sizes = {4, 3, 3, 3, 2};
        int[][][] graphs = {
            {{0, 1}, {0, 2}, {1, 3}, {2, 3}}, {{0, 2}, {1, 2}}, {{0, 1}, {1, 2}},
            {{0, 1}, {1, 2}, {2, 0}}, {{0, 1}, {1, 1}}};
        boolean[] truths = {false, false, false, true, true};
        System.out.println("graph | truth | naive visited | three-colour | kahn");
        for (int i = 0; i < names.length; i++) {
            boolean t = truths[i];
            System.out.println(names[i] + " | " + mark(t, t)
                + " | " + mark(naiveVisited(sizes[i], graphs[i]), t)
                + " | " + mark(threeColour(sizes[i], graphs[i]), t)
                + " | " + mark(kahnHasCycle(sizes[i], graphs[i]), t));
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a directed graph with n nodes and a list of edges, tell me whether it contains a cycle. If you can, return one cycle as a list of nodes. Please code it in C++."

**What a strong answer should cover:**
- Why a single "visited" flag gives false positives in a directed graph (a diamond is not a cycle).
- Three-colour DFS: WHITE/GRAY/BLACK, a cycle exactly when an edge reaches a GRAY node (a back edge), and why BLACK nodes are safe.
- Restarting DFS from every unvisited node, self-loops, and recovering the cycle from the current path.
- O(V + E) time and O(V) extra space, with Kahn's algorithm as the non-recursive alternative.
- C++ specifics: an \`enum Color\`, \`vector<vector<int>>\` adjacency, \`std::find\` to cut the cycle out of the path, and native stack overflow (a crash) on deep recursion.

**Clarifying questions expected:**
- "Do you need just true/false, or the cycle itself?"
- "Can there be self-loops, and is the graph connected?"

**Code / implementation expected:** Yes — a three-colour DFS \`hasCycle\` (ideally returning the cycle) in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture an office where nobody may start work until someone else hands them something. Ana waits for Ben's report. Ben waits for Chen's numbers. Chen waits for... Ana's sign-off. Everyone is busy *waiting*, nobody is working, and nothing will ever happen. Computers call this a **deadlock**, and the classic way to detect one is exactly this: draw an arrow from each waiting party to the party it waits for (a *wait-for graph*), and look for a loop.

The same loop check appears everywhere: a spreadsheet formula that refers to itself through three other cells, a package that (indirectly) depends on itself, a course that is its own prerequisite. In each case the arrows are **one-way**, so the question is: **does this directed graph contain a cycle?**

It sounds like the "visited set" trick you may know from undirected graphs. It is not — and the reason why is the heart of the interview question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want true/false, or the cycle itself? | Returning the cycle needs the current DFS path; true/false needs only colours (or Kahn). |
| How is the graph given — edge list, adjacency list, n nodes numbered 0 to n-1? | Decides whether you build an adjacency list first. |
| Can there be self-loops or repeated edges? | \`a -> a\` is a cycle of length 1; repeated edges are harmless. |
| Is the graph connected? | Usually not guaranteed; you must start a search from every unvisited node. |
| How many nodes, and how long can a path be? | A path of 10^5 nodes overflows a recursive DFS in most languages. |

## 3. Why "Seen It Before" Is Not a Cycle

📌 **Interview term: Directed cycle** — a path that follows the arrows and returns to its starting node, such as \`0 -> 1 -> 2 -> 0\`. A self-loop \`0 -> 0\` counts.

In an **undirected** graph, meeting an already-visited node (other than the one you came from) does mean a cycle. In a **directed** graph it does not. Look at this diamond:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Diamond graph: 0 points to 1 and 2, both 1 and 2 point to 3. There is no directed cycle even though 3 is reached twice">
  <defs>
    <marker id="dc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="137" text-anchor="middle">0</text>
  <rect class="d-box" x="260" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="260" y="190" width="110" height="54" rx="8"/>
  <text class="d-text" x="315" y="222" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="105" width="110" height="54" rx="8"/>
  <text class="d-text" x="555" y="129" text-anchor="middle">3</text>
  <text class="d-sub" x="555" y="149" text-anchor="middle">reached twice</text>
  <path class="d-edge" d="M 140 120 L 254 62" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 140 144 L 254 204" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge" d="M 370 62 L 494 120" marker-end="url(#dc1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 204 L 494 144" marker-end="url(#dc1-arrow)"/>
</svg>

DFS goes \`0 -> 1 -> 3\`, finishes 3, backs up, then tries \`0 -> 2 -> 3\` (dashed). Node 3 has been seen before, but there is **no way to follow the arrows from 3 back to 2 or 0**. The diamond is a perfectly good DAG (directed acyclic graph). A single \`visited\` flag reports a cycle here — Example 2 shows it getting the diamond and the "two roots share a sink" graph wrong.

The missing information is **"is that node still on my current path?"** That is what the three colours add.

## 4. The Three-Colour DFS

📌 **Interview term: Three colours (WHITE / GRAY / BLACK)** — WHITE: not visited yet. GRAY: entered, and still on the current DFS path (its call has not returned). BLACK: finished; everything reachable from it has been explored.

📌 **Interview term: Back edge** — an edge \`u -> v\` where \`v\` is GRAY, i.e. an ancestor of \`u\` on the current path. **A directed graph has a cycle if and only if a DFS finds a back edge.**

The algorithm:

1. Colour every node WHITE.
2. For each WHITE node \`s\`, run \`visit(s)\`.
3. \`visit(u)\`: colour \`u\` GRAY; for each neighbour \`v\`: if \`v\` is GRAY, **cycle**; if \`v\` is WHITE, \`visit(v)\`; if \`v\` is BLACK, ignore it. Then colour \`u\` BLACK.

**Why it is correct, both directions.**

- *Back edge means cycle:* if \`u -> v\` and \`v\` is GRAY, then \`v\` is an ancestor of \`u\`, so there is a path \`v -> ... -> u\` along the DFS tree. Add the edge \`u -> v\` and you have a cycle.
- *Cycle means back edge:* take the cycle node \`v\` that DFS discovers first. While \`v\` is GRAY, DFS reaches every node reachable from \`v\`, including the cycle node \`w\` just before \`v\` on the cycle. When DFS examines \`w -> v\`, \`v\` is still GRAY: a back edge.
- *BLACK is safe:* a BLACK node finished before we got here; if it could reach the current path it would have reached a GRAY node and reported a cycle already.

### All four kinds of edges

📌 **Interview term: Edge classification** — DFS sorts every edge \`u -> v\` into one of four kinds: **tree** (\`v\` was WHITE, DFS went there), **back** (\`v\` GRAY: cycle), **forward** (\`v\` BLACK and discovered after \`u\`: a descendant reached by a shortcut), **cross** (\`v\` BLACK and discovered before \`u\`: another, finished branch). Only back edges matter for cycles; forward and cross edges are exactly the "seen before but harmless" cases that fool the single-flag version.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Diamond with shortcut: tree edges 0 to 1, 1 to 3 and 0 to 2, a cross edge 2 to 3 and a forward edge 0 to 3">
  <defs>
    <marker id="dc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="85" y="152" text-anchor="middle">0</text>
  <rect class="d-box" x="280" y="20" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="52" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="226" width="110" height="54" rx="8"/>
  <text class="d-text" x="335" y="258" text-anchor="middle">2</text>
  <rect class="d-box" x="540" y="120" width="110" height="54" rx="8"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 140 134 L 274 62" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="84">tree</text>
  <path class="d-edge" d="M 390 62 L 534 134" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="84">tree</text>
  <path class="d-edge" d="M 140 160 L 274 238" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="170" y="226">tree</text>
  <path class="d-edge-dashed" d="M 390 238 L 534 160" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="480" y="226">cross</text>
  <path class="d-edge-accent" d="M 140 147 L 534 147" marker-end="url(#dc2-arrow)"/>
  <text class="d-sub" x="300" y="138">forward</text>
</svg>

DFS from 0 visits 1 and then 3 (tree edges), finishes them, then visits 2 (tree). The edge \`2 -> 3\` meets a BLACK node discovered earlier: **cross**. The edge \`0 -> 3\` meets a BLACK descendant of 0: **forward**. No GRAY node is ever met, so there is no cycle. Example 1 prints exactly these labels, using discovery times to tell forward from cross.

### Returning the cycle itself

Keep a list \`path\` of the GRAY nodes in order (push on entry, pop on exit). When a back edge \`u -> v\` appears, the cycle is the part of \`path\` from \`v\` to the end, followed by \`v\` again. For \`0 -> 1 -> 2 -> 0\` the path is \`[0, 1, 2]\` when \`2 -> 0\` is examined, giving \`0 -> 1 -> 2 -> 0\`.

## 5. Other Ways to Answer the Same Question

- **Kahn's algorithm:** repeatedly remove nodes with in-degree 0; if some are never removed, there is a cycle. No recursion, but it cannot name the cycle. The two are compared in detail in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs), and Kahn itself is the core of [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).
- **Strongly connected components:** a directed graph has a cycle exactly when some component has two or more nodes, or a node has a self-loop. Overkill for yes/no, useful when you need *every* cycle group: see [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Every node has exactly one outgoing edge** (a "functional graph", like a linked list): Floyd's tortoise and hare works with O(1) extra space, as in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list).
- **Undirected graphs** are a different problem: a visited set with a parent check, or [Union-Find](/interview-question/what-is-the-union-find-disjoint-set-data-structure), works there.

## 6. The Code in C++

The minimal yes/no version (from Example 2):

~~~cpp
enum Color { WHITE, GRAY, BLACK };
vector<Color> color;
bool colourVisit(int u) {
    color[u] = GRAY;
    for (int v : adj[u]) {
        if (color[v] == GRAY) return true;
        if (color[v] == WHITE && colourVisit(v)) return true;
    }
    color[u] = BLACK;                   // finished: safe to meet again later
    return false;
}
bool threeColour(int n, const Edges& edges) {
    build(n, edges);
    color.assign(n, WHITE);
    for (int s = 0; s < n; s++) if (color[s] == WHITE && colourVisit(s)) return true;
    return false;
}
~~~

- \`enum Color { WHITE, GRAY, BLACK }\` gives readable states; \`color.assign(n, WHITE)\` resets them for each graph.
- The outer loop restarts DFS from every WHITE node.

**The full version** (Example 1) keeps \`path\` and discovery times. On a back edge, \`firstCycle.assign(find(path.begin(), path.end(), v), path.end())\` copies the cycle out of the path:

~~~cpp
void visit(int u) {
    disc[u] = ++timer;
    color[u] = GRAY;
    path.push_back(u);
    for (int v : adj[u]) {
        string e = to_string(u) + "->" + to_string(v);
        if (color[v] == WHITE) {
            labels.push_back(e + " tree");
            visit(v);
        } else if (color[v] == GRAY) {                   // v is an ancestor still on the path
            labels.push_back(e + " BACK");
            if (firstCycle.empty()) {
                firstCycle.assign(find(path.begin(), path.end(), v), path.end());
                firstCycle.push_back(v);
            }
        } else if (disc[u] < disc[v]) {                  // finished descendant of u
            labels.push_back(e + " forward");
        } else {                                         // finished node in another branch
            labels.push_back(e + " cross");
        }
    }
    path.pop_back();
    color[u] = BLACK;
}
~~~

**Recursion depth.** Each GRAY node is one native stack frame, and overflowing the stack is a crash, not an exception: on this machine (8 MB stack) a recursive DFS survived a 100,000-node chain and died with a segmentation fault on 200,000. For big inputs use Kahn or an explicit stack.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Three-colour DFS that labels every edge and returns the cycle** prints:

~~~text
diamond with a shortcut
  edges: 0->1 tree, 1->3 tree, 0->2 tree, 2->3 cross, 0->3 forward
  has cycle: false
loop 0-1-2 with an exit
  edges: 0->1 tree, 1->2 tree, 2->0 BACK, 2->3 tree
  has cycle: true, e.g. 0 -> 1 -> 2 -> 0
self-loop
  edges: 0->0 BACK
  has cycle: true, e.g. 0 -> 0
cycle only in the second piece
  edges: 0->1 tree, 2->1 cross, 2->3 tree, 3->2 BACK
  has cycle: true, e.g. 2 -> 3 -> 2
two loops
  edges: 0->1 tree, 1->0 BACK, 1->2 tree, 2->3 tree, 3->4 tree, 4->2 BACK
  has cycle: true, e.g. 0 -> 1 -> 0
~~~

**Example 2 — Why one visited flag is wrong: naive vs three colours vs Kahn** prints:

~~~text
graph | truth | naive visited | three-colour | kahn
diamond 0->1->3, 0->2->3 | false | true (WRONG) | false | false
two roots share a sink | false | true (WRONG) | false | false
plain chain | false | false | false | false
triangle 0->1->2->0 | true | true | true | true
self-loop | true | true | true | true
~~~

**Reading the output:** Example 1 labels every edge. The diamond with a shortcut has tree, cross and forward edges but no back edge, so no cycle. In the loop graph, \`2->0\` is the back edge and the cycle is \`0 -> 1 -> 2 -> 0\`; a self-loop is a back edge to itself. In the graph whose cycle is only in the second piece, the outer loop restarts DFS at node 2 and finds \`3->2\`. With two loops, both back edges are labelled, and the first cycle reported is \`0 -> 1 -> 0\`. Example 2 is the table that justifies three colours: the single \`visited\` flag says \`true (WRONG)\` on the diamond and on two roots sharing a sink, while three-colour DFS and Kahn match the truth on every graph.

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Single visited flag | O(V + E) | O(V) | wrong for directed graphs (false positives) |
| Three-colour DFS | O(V + E) | O(V) colours + O(V) recursion | can return the cycle; early exit on first back edge |
| Kahn's algorithm | O(V + E) | O(V) in-degrees + queue | no recursion; cannot name the cycle |
| SCC (Tarjan or Kosaraju) | O(V + E) | O(V) | finds every cycle group, more code |

Plus O(V + E) for the adjacency list itself. Each node gets coloured GRAY once and BLACK once, and each edge is examined once.

## 9. Edge Cases

- **Self-loop \`a -> a\`:** \`a\` is GRAY when its own edge is examined, so it is a back edge and a cycle of length 1.
- **Disconnected graph:** the outer \`for s in all nodes\` loop is required; a cycle in a piece unreachable from node 0 is otherwise missed.
- **Repeated edges:** examined twice, harmless.
- **Empty graph or no edges:** no cycle.
- **Two-node cycle \`a -> b -> a\`:** a real cycle in a directed graph (in an undirected graph the same pair would be one edge).
- **Very deep paths:** recursion depth equals the longest DFS path; use an explicit stack (shown in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs)) or Kahn.

## Common Pitfalls

- **One \`vector<bool> visited\`.** False positives on diamonds and shared sinks (Example 2).
- **Never turning nodes BLACK.** Resetting to WHITE on exit instead of BLACK can make the search exponential.
- **Starting only from node 0.** Cycles in other pieces are missed; loop over all nodes.
- **Global state not reset.** Use \`assign\`/\`clear\` on the globals for every graph, as Example 1 does.
- **Deep recursion.** A stack overflow kills the process; there is nothing to catch.
- **Forgetting self-loops.** They are cycles; a "skip if v is the parent" check copied from undirected code would wrongly ignore them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Trap:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt; visited</code> is wrong for directed graphs: a diamond reaches the same node twice without any cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Colours:</strong> <span style="color:#f0e2c8;">WHITE unvisited, GRAY on the current path, BLACK finished. An edge into a GRAY node is a back edge, and a back edge exists exactly when there is a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">For every WHITE node run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visit</code>: mark GRAY, recurse into WHITE neighbours, report a cycle on GRAY, then mark BLACK.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cycle:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> of GRAY nodes; on a back edge to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, copy from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(path.begin(), path.end(), v)</code> to the end and append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(V + E) time, O(V) extra; Kahn is the no-recursion alternative because deep recursion can crash the process.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is meeting a BLACK node not a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finished before we reached it, so nothing reachable from it is on the current path; otherwise it would have hit a GRAY node and we would already have stopped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all nodes that are on some cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute strongly connected components; every node in a component of size 2 or more, or with a self-loop, is on a cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">enum</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You need three states. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> is a bit-packed specialisation with only two, and its elements are proxies, not real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool&amp;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a graph with 10^5 nodes in a line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion can overflow the stack and crash. Use Kahn with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>, or an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> of (node, next index) frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from cycle detection in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undirected uses a visited set plus a parent check, or Union-Find. Directed needs GRAY versus BLACK because edges are one-way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed cycle** | a path along the arrows that returns to its start |
| **Three colours** | WHITE unvisited, GRAY on the current path, BLACK finished |
| **Back edge** | edge into a GRAY ancestor; exists exactly when there is a cycle |
| **Edge classification** | tree, back, forward and cross edges of a DFS |
| **Forward edge** | edge to an already finished descendant |
| **Cross edge** | edge to an already finished node in another branch |
| **enum** | a named set of integer constants, here the three colours |

---
**Conclusion:** In a directed graph, reaching a node twice is not a cycle; reaching a node that is **still on your current path** is. Three-colour DFS captures exactly that: WHITE, GRAY, BLACK, and a cycle precisely when an edge points at a GRAY node. It runs in O(V + E), stops at the first back edge, and the GRAY path hands you the cycle itself; Kahn's algorithm gives the same yes/no without recursion. In C++ it fits in a short recursive function over a \`vector<Color>\`, as long as the paths stay within the native stack; beyond that, switch to Kahn or an explicit stack, because an overflow is a crash.`,
        examples: [
          { label: `Three-colour DFS that labels every edge and returns the cycle`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

enum Color { WHITE, GRAY, BLACK };
vector<vector<int>> adj;
vector<Color> color;
vector<int> disc, path, firstCycle;
vector<string> labels;
int timer;

void visit(int u) {
    disc[u] = ++timer;
    color[u] = GRAY;
    path.push_back(u);
    for (int v : adj[u]) {
        string e = to_string(u) + "->" + to_string(v);
        if (color[v] == WHITE) {
            labels.push_back(e + " tree");
            visit(v);
        } else if (color[v] == GRAY) {                   // v is an ancestor still on the path
            labels.push_back(e + " BACK");
            if (firstCycle.empty()) {
                firstCycle.assign(find(path.begin(), path.end(), v), path.end());
                firstCycle.push_back(v);
            }
        } else if (disc[u] < disc[v]) {                  // finished descendant of u
            labels.push_back(e + " forward");
        } else {                                         // finished node in another branch
            labels.push_back(e + " cross");
        }
    }
    path.pop_back();
    color[u] = BLACK;
}

// Three-colour DFS that labels every edge and records the first cycle it closes.
void classify(int n, const vector<pair<int, int>>& edges) {
    adj.assign(n, {});
    for (auto [u, v] : edges) adj[u].push_back(v);
    color.assign(n, WHITE);
    disc.assign(n, 0);
    timer = 0;
    path.clear();
    firstCycle.clear();
    labels.clear();
    for (int s = 0; s < n; s++) if (color[s] == WHITE) visit(s);
}

string join(const vector<string>& xs, const string& sep) {
    string s;
    for (size_t i = 0; i < xs.size(); i++) s += (i ? sep : "") + xs[i];
    return s;
}

void report(const string& name, int n, const vector<pair<int, int>>& edges) {
    classify(n, edges);
    cout << name << "\\n";
    cout << "  edges: " << join(labels, ", ") << "\\n";
    if (!firstCycle.empty()) {
        vector<string> parts;
        for (int x : firstCycle) parts.push_back(to_string(x));
        cout << "  has cycle: true, e.g. " << join(parts, " -> ") << "\\n";
    } else {
        cout << "  has cycle: false\\n";
    }
}

int main() {
    report("diamond with a shortcut", 4, {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {0, 3}});
    report("loop 0-1-2 with an exit", 4, {{0, 1}, {1, 2}, {2, 0}, {2, 3}});
    report("self-loop", 1, {{0, 0}});
    report("cycle only in the second piece", 4, {{0, 1}, {2, 1}, {2, 3}, {3, 2}});
    report("two loops", 5, {{0, 1}, {1, 0}, {1, 2}, {2, 3}, {3, 4}, {4, 2}});
}` },
          { label: `Why one visited flag is wrong: naive vs three colours vs Kahn`, code: `#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Edges = vector<pair<int, int>>;
vector<vector<int>> adj;

void build(int n, const Edges& edges) {
    adj.assign(n, {});
    for (auto [u, v] : edges) adj[u].push_back(v);
}

// WRONG for directed graphs: says cycle whenever it meets ANY visited node.
vector<bool> visited;
bool naiveVisit(int u) {
    visited[u] = true;
    for (int v : adj[u]) if (visited[v] || naiveVisit(v)) return true;
    return false;
}
bool naiveVisited(int n, const Edges& edges) {
    build(n, edges);
    visited.assign(n, false);
    for (int s = 0; s < n; s++) if (!visited[s] && naiveVisit(s)) return true;
    return false;
}

// Correct: a cycle only when we meet a node that is still on the current path.
enum Color { WHITE, GRAY, BLACK };
vector<Color> color;
bool colourVisit(int u) {
    color[u] = GRAY;
    for (int v : adj[u]) {
        if (color[v] == GRAY) return true;
        if (color[v] == WHITE && colourVisit(v)) return true;
    }
    color[u] = BLACK;                   // finished: safe to meet again later
    return false;
}
bool threeColour(int n, const Edges& edges) {
    build(n, edges);
    color.assign(n, WHITE);
    for (int s = 0; s < n; s++) if (color[s] == WHITE && colourVisit(s)) return true;
    return false;
}

bool kahnHasCycle(int n, const Edges& edges) {
    build(n, edges);
    vector<int> indegree(n, 0);
    for (auto [u, v] : edges) indegree[v]++;
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);
    int placed = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        placed++;
        for (int v : adj[u]) if (--indegree[v] == 0) q.push(v);
    }
    return placed < n;
}

string mark(bool x, bool truth) {
    return string(x ? "true" : "false") + (x == truth ? "" : " (WRONG)");
}

int main() {
    struct Test { string name; int n; Edges edges; bool truth; };
    vector<Test> tests = {
        {"diamond 0->1->3, 0->2->3", 4, {{0, 1}, {0, 2}, {1, 3}, {2, 3}}, false},
        {"two roots share a sink", 3, {{0, 2}, {1, 2}}, false},
        {"plain chain", 3, {{0, 1}, {1, 2}}, false},
        {"triangle 0->1->2->0", 3, {{0, 1}, {1, 2}, {2, 0}}, true},
        {"self-loop", 2, {{0, 1}, {1, 1}}, true},
    };
    cout << "graph | truth | naive visited | three-colour | kahn\\n";
    for (const auto& t : tests) {
        cout << t.name << " | " << mark(t.truth, t.truth)
             << " | " << mark(naiveVisited(t.n, t.edges), t.truth)
             << " | " << mark(threeColour(t.n, t.edges), t.truth)
             << " | " << mark(kahnHasCycle(t.n, t.edges), t.truth) << "\\n";
    }
}` },
        ],
      },
    },
  },
  {
    title: `Alien Dictionary: given sorted words in an alien language, how do you derive the character order?`,
    difficulty: "hard",
    seoDescription: `Alien Dictionary in Python, JavaScript, Java and C++: first-difference letter edges, the prefix trap, Kahn's topological sort, cycles and uniqueness.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of words from an alien language, and the list is sorted in that language's alphabetical order. The letters are ordinary lowercase letters, but their order is unknown. Return a string with one possible ordering of the letters, or an empty string if no ordering is consistent with the list. Please write it in Python."

**What a strong answer should cover:**
- Only adjacent words are compared, and only their first differing letters give a rule (an edge a -> b); letters after that carry no information.
- The prefix trap: a longer word directly before its own prefix makes the input invalid.
- A topological sort (Kahn) over the letters that appear, adding each edge once; a cycle means contradictory rules and the answer is "".
- Complexity O(C + U^2) with C total characters and U at most 26 letters, and how to tell whether the order is unique.
- Python specifics: \`zip(words, words[1:])\` for adjacent pairs, \`for ... else\` to detect "no difference found", \`ord(ch) - 97\` indexing, \`collections.deque\`, and \`"".join\` to build the answer.

**Clarifying questions expected:**
- "Is any valid ordering acceptable, or do you want a specific one?"
- "What should I return if the list is contradictory or a word comes before its own prefix?"
- "Are all characters lowercase a to z?"

**Code / implementation expected:** Yes — \`alienOrder(words)\` in Python: build edges from adjacent pairs, then Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Archaeologists dig up a dictionary from an alien civilisation. It uses our letters, but in a different alphabetical order, and nobody knows what that order is. The words, however, are clearly **sorted** — it is a dictionary, after all. Can you work out the alien alphabet just from the order of the words?

You can, and the trick is the same one you use when you check whether "apple" comes before "apply" in English: you walk both words letter by letter until they first differ. "appl**e**" vs "appl**y**" — the first difference is e vs y, so in English e comes before y. Every pair of neighbouring words in the alien dictionary gives you **one such clue**. Collect the clues, and you have a set of "this letter comes before that letter" rules. Turning rules like that into one ordering is a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).

Sometimes the clues contradict each other ("z before x" and "x before z"), and sometimes the dictionary itself is broken ("abc" listed before "ab"). A good answer detects both and returns an empty string.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all characters lowercase English letters? | Lets you use arrays of size 26 instead of hash maps. |
| If several alphabets fit, may I return any of them? | Usually yes. If not, you need a tie-break (smallest letter first, with a min-heap). |
| Should letters that appear but have no rules be included? | Yes in the standard version: every letter that appears must be in the answer. |
| What if the input is not actually sortable — a contradiction, or "abc" before "ab"? | The standard contract is to return \`""\`. |
| How many words and how long are they? | Building the clues costs the total number of characters, so this bounds the running time. |

## 3. One Clue per Neighbouring Pair

📌 **Interview term: Lexicographic order** — dictionary order: compare two words letter by letter; the first position where they differ decides. If one word runs out first and everything so far matched, the shorter word comes first ("ab" before "abc").

So for each pair of **adjacent** words, find the first position where they differ. If the letters there are \`a\` and \`b\`, then \`a\` comes before \`b\` in the alien alphabet. That is all the pair tells you; letters **after** the first difference carry no information.

📌 **Interview term: Precedence edge** — the directed edge \`a -> b\` meaning "a comes before b", one per adjacent pair with a difference.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="Comparing wrt with wrf: w and r match, t and f differ so t comes before f, nothing after that position counts">
  <defs>
    <marker id="al1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="66">word 1</text>
  <rect class="d-box-muted" x="130" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="68" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="68" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="68" text-anchor="middle">t</text>
  <text class="d-sub" x="40" y="176">word 2</text>
  <rect class="d-box-muted" x="130" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="178" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="178" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="178" text-anchor="middle">f</text>
  <text class="d-sub" x="165" y="122" text-anchor="middle">same</text>
  <text class="d-sub" x="255" y="122" text-anchor="middle">same</text>
  <path class="d-edge-accent" d="M 345 88 L 345 144" marker-end="url(#al1-arrow)"/>
  <rect class="d-box" x="440" y="95" width="150" height="44" rx="8"/>
  <text class="d-text" x="515" y="123" text-anchor="middle">edge t to f</text>
</svg>

\`wrt\` and \`wrf\` agree on \`w\` and \`r\`, then differ at the third letter, so \`t\` comes before \`f\`.

**Why adjacent pairs are enough.** Dictionary order is transitive: if word 1 is before word 2 and word 2 is before word 3 under some alphabet, then word 1 is before word 3 under that alphabet too. So any alphabet that satisfies every adjacent pair automatically sorts the whole list, and comparing non-adjacent pairs adds no new information — only more work. Example 2 checks this: it re-verifies every list against the derived alphabet and prints \`words sorted under it=true\`.

📌 **Interview term: Prefix rule (invalid input)** — if the first word is longer and the shorter word is a prefix of it (\`"abc"\` before \`"ab"\`), no alphabet can sort the list, because the shorter word must come first in every alphabet. Return \`""\` immediately. The reverse (\`"ab"\` before \`"abc"\`) is fine and gives no clue.

## 4. Build the Letter Graph, Then Topologically Sort It

For \`["wrt", "wrf", "er", "ett", "rftt"]\` the four adjacent pairs give:

| Pair | First difference | Edge |
| :--- | :--- | :--- |
| wrt, wrf | t vs f | t -> f |
| wrf, er | w vs e | w -> e |
| er, ett | r vs t | r -> t |
| ett, rftt | e vs r | e -> r |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 140" role="img" aria-label="Letter graph w to e to r to t to f, a single chain">
  <defs>
    <marker id="al2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="65" y="64" text-anchor="middle">w</text>
  <text class="d-sub" x="65" y="84" text-anchor="middle">in 0</text>
  <rect class="d-box" x="160" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="205" y="64" text-anchor="middle">e</text>
  <text class="d-sub" x="205" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="300" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">r</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="440" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="485" y="64" text-anchor="middle">t</text>
  <text class="d-sub" x="485" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="580" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="625" y="64" text-anchor="middle">f</text>
  <text class="d-sub" x="625" y="84" text-anchor="middle">in 1</text>
  <path class="d-edge" d="M 110 67 L 154 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 250 67 L 294 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 390 67 L 434 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 574 67" marker-end="url(#al2-arrow)"/>
</svg>

The edges happen to form a single chain, so the alphabet is \`"wertf"\` and it is the only possible answer.

Then run **Kahn's algorithm** on the letters:

1. Mark every letter that appears in any word (letters with no clues must still appear in the answer).
2. Add each precedence edge **once** and count in-degrees; the same clue can come from several pairs, and counting it twice would need two decrements.
3. Queue the letters with in-degree 0, pop one, append it, decrement its successors, enqueue any that reach 0.
4. If fewer letters come out than appeared, the clues contain a cycle (\`["z", "x", "z"]\` gives z -> x and x -> z): return \`""\`.

📌 **Interview term: Unique order** — the alphabet is fully determined only if, at every step of Kahn, **exactly one** letter is ready. If the queue ever holds two letters, nothing orders them and several alphabets fit. \`["ab", "adc"]\` gives only \`b -> d\`, so \`a\` and \`c\` float freely: Example 2 prints \`unique=false\`.

With only 26 letters, a 26 x 26 boolean matrix is a simple and fast way to store "edge already added", and scanning letters \`a\` to \`z\` makes the output deterministic (ties are broken alphabetically by queue order).

📌 **Interview term: Verifying an alien dictionary** — the easier reverse problem (LeetCode 953): given the alphabet, check whether the words are sorted. Map each letter to its rank and compare adjacent words with the same first-difference and prefix rules. Example 2 includes it.

A DFS-based topological sort works here too (three colours on the letter graph; a GRAY letter means a contradiction); the trade-offs are the same as in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs). Building a graph out of words and then searching it is also the idea behind [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem), where the edges are one-letter changes instead of precedence clues.

## 6. The Code in Python

~~~python
from collections import deque

def alien_order(words):
    """Return one valid letter order, or "" if the word list is contradictory."""
    present = [False] * 26
    for w in words:
        for ch in w:
            present[ord(ch) - 97] = True
    edge = [[False] * 26 for _ in range(26)]       # edge[a][b]: a comes before b
    indegree = [0] * 26
    for first, second in zip(words, words[1:]):    # only ADJACENT pairs are needed
        for a, b in zip(first, second):
            if a != b:                             # the first difference is the only clue
                x, y = ord(a) - 97, ord(b) - 97
                if not edge[x][y]:                 # ignore repeated clues
                    edge[x][y] = True
                    indegree[y] += 1
                break
        else:                                      # no difference found in the overlap
            if len(first) > len(second):           # "abc" before "ab" is impossible
                return ""
    queue = deque(c for c in range(26) if present[c] and indegree[c] == 0)
    order = []
    while queue:
        c = queue.popleft()
        order.append(chr(c + 97))
        for d in range(26):
            if edge[c][d]:
                indegree[d] -= 1
                if indegree[d] == 0:
                    queue.append(d)
    if len(order) < sum(present):                  # some letters sit on a cycle
        return ""
    return "".join(order)
~~~

**Python idioms doing the work:**

- \`zip(words, words[1:])\` yields each adjacent pair; \`zip(first, second)\` walks both words together and stops at the shorter one.
- **\`for ... else\`**: the \`else\` block runs only if the loop finished **without** \`break\`, i.e. no difference was found in the overlap. That is exactly when the prefix rule must be checked. It reads oddly the first time, so say it out loud in the interview.
- \`ord(ch) - 97\` maps \`'a'..'z'\` to \`0..25\` (97 is \`ord('a')\`), and \`chr(c + 97)\` maps back.
- \`if not edge[x][y]\` adds each clue once, so in-degrees match the number of **distinct** predecessors.
- \`sum(present)\` counts \`True\` values (booleans are ints in Python).
- \`"".join(order)\` builds the string once at the end; repeated \`+=\` on strings can copy the whole string each time.

**A dict/set version** (Example 2) is just as idiomatic when letters are not limited to a to z: \`sorted(set("".join(words)))\` gives the letters, \`after = {ch: set() ...}\` holds successors, and the queue is checked with \`len(queue) > 1\` to detect a non-unique order. Successors are iterated with \`sorted(after[ch])\` because set iteration order is not something to rely on for deterministic output.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Derive the alien alphabet: normal, contradictory and prefix cases** prints:

~~~text
[wrt, wrf, er, ett, rftt] -> "wertf"
[z, x] -> "zx"
[z, x, z] -> "" (invalid)
[abc, ab] -> "" (invalid)
[ab, abc] -> "abc"
[z, z] -> "z"
[ab, adc] -> "abcd"
[baa, abcd, abca, cab, cad] -> "bdac"
[caa, aaa, aab] -> "cab"
~~~

**Example 2 — Is the order unique, and does it really sort the words? (LeetCode 953 check)** prints:

~~~text
[wrt, wrf, er, ett, rftt] order=wertf unique=true words sorted under it=true
[ab, adc] order=abcd unique=false words sorted under it=true
[caa, aaa, aab] order=cab unique=true words sorted under it=true
[z, x, z] order=- unique=false words sorted under it=false
check hello, leetcode: true
check word, world, row: false
check apple, app: false
~~~

**Reading the output:** In Example 1, the classic input gives \`"wertf"\`. \`[z, x, z]\` gives contradictory clues (z before x, then x before z), so it is invalid. \`[abc, ab]\` breaks the prefix rule and is rejected before any sorting. \`[ab, abc]\` yields no clue at all, so the three letters come out alphabetically by queue order: \`"abc"\`. \`[z, z]\` has one letter. \`[ab, adc]\` only knows b before d, and the queue releases a, b, c, then d. In Example 2, \`unique=true\` for the chain inputs and \`unique=false\` for \`[ab, adc]\`; every derived alphabet re-sorts its own word list, and the three verification checks match LeetCode 953 (\`hello, leetcode\` is sorted under its alphabet; \`word, world, row\` and \`apple, app\` are not).

## 9. Complexity

Let **C** be the total number of characters in all words, **N** the number of words, and **U** the number of distinct letters (at most 26).

| Step | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Mark letters that appear | O(C) | O(U) | read every character once |
| Compare adjacent pairs | O(C) | O(min(U^2, N)) edges | each pair scans at most the shorter word; at most one edge per pair |
| Kahn on the letter graph (matrix) | O(U^2) | O(U^2) | for each letter, scan 26 possible successors |
| Total | O(C + U^2) | O(U^2) | with U at most 26, the letter part is effectively constant |

With an adjacency list instead of the 26 x 26 matrix, Kahn is O(U + E). Either way, the work is dominated by reading the input once.

## 10. Edge Cases

- **One word:** no pairs, no clues; return its distinct letters in any order.
- **Identical neighbours (\`["z", "z"]\`):** no difference, no clue, and no prefix problem.
- **Prefix in the right order (\`["ab", "abc"]\`):** fine, no clue.
- **Prefix in the wrong order (\`["abc", "ab"]\`):** invalid, return \`""\`.
- **Contradiction (\`["z", "x", "z"]\`):** a cycle in the letter graph, return \`""\`.
- **Letters with no clues:** must still be in the answer; seed the queue from **all** letters that appear.
- **The same clue twice:** add the edge once, or count and decrement it consistently.

## Common Pitfalls

- **Comparing every pair of words.** O(N^2 * L) and adds nothing; adjacent pairs are enough.
- **Using letters after the first difference.** Only the first differing position is a clue; \`break\` right after it.
- **Missing the prefix trap.** Without the \`for ... else\` check, \`["abc", "ab"]\` returns a "valid" order.
- **Dropping letters with no clues.** Seed the queue from every letter that **appears**, not only from letters in edges.
- **Counting a repeated clue twice.** Guard with \`if not edge[x][y]\` (or a set), or decrement consistently.
- **Relying on set iteration order.** Sort before iterating if you need deterministic output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clues:</strong> <span style="color:#f0e2c8;">For each adjacent pair from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip(words, words[1:])</code>, the first differing letters give one edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -&gt; b</code>; ignore the rest of the words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Invalid input:</strong> <span style="color:#f0e2c8;">If no difference is found (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for ... else</code>) and the first word is longer, it is a prefix violation: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Graph:</strong> <span style="color:#f0e2c8;">Nodes are all letters that appear; add each edge once in a 26 x 26 matrix and count in-degrees.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sort:</strong> <span style="color:#f0e2c8;">Kahn with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>; if fewer letters come out than appeared, the clues have a cycle: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(C + U^2) for C characters and U at most 26 letters; effectively linear in the input size.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are adjacent pairs enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lexicographic order is transitive, so an alphabet that sorts every adjacent pair sorts the whole list. Example 2 re-checks each derived alphabet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know if the answer is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds more than one letter, those letters are unordered by any clue, so several alphabets fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the smallest valid alphabet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> instead of the deque so the smallest ready letter always goes next.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the alphabet can contain any Unicode characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch to dicts and sets keyed by character, as in Example 2; the algorithm is the same, and complexity becomes O(C + U + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of Kahn?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three colours on the letter graph, a GRAY letter means a contradiction, and the reverse finish order is the alphabet. Kahn avoids recursion and makes uniqueness easy to check.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lexicographic order** | dictionary order decided by the first differing letter |
| **Precedence edge** | a -> b meaning letter a comes before letter b |
| **Prefix rule** | a longer word cannot come before its own prefix; that input is invalid |
| **Unique order** | only one letter is ever ready in Kahn, so only one alphabet fits |
| **Verifying an alien dictionary** | the reverse check: are the words sorted under a given alphabet |
| **Topological sort** | ordering nodes so every edge points forward; here, the letters |
| **for ... else** | the else block runs only when the loop ended without break |

---
**Conclusion:** The Alien Dictionary is a topological sort hiding behind string comparison. Each pair of neighbouring words contributes at most one rule — the first letters where they differ — and a longer word before its own prefix makes the input invalid. Put the rules into a letter graph, run Kahn's algorithm over every letter that appears, and either all letters come out in a valid alphabet or a cycle proves the rules contradict each other. It runs in time linear in the input plus a constant for the 26 letters, and the same queue tells you whether the alphabet is unique. In Python, \`zip\` and \`for ... else\` make the clue extraction almost read like the explanation.`,
        examples: [
          { label: `Derive the alien alphabet: normal, contradictory and prefix cases`, code: `from collections import deque


def alien_order(words):
    """Return one valid letter order, or "" if the word list is contradictory."""
    present = [False] * 26
    for w in words:
        for ch in w:
            present[ord(ch) - 97] = True
    edge = [[False] * 26 for _ in range(26)]       # edge[a][b]: a comes before b
    indegree = [0] * 26
    for first, second in zip(words, words[1:]):    # only ADJACENT pairs are needed
        for a, b in zip(first, second):
            if a != b:                             # the first difference is the only clue
                x, y = ord(a) - 97, ord(b) - 97
                if not edge[x][y]:                 # ignore repeated clues
                    edge[x][y] = True
                    indegree[y] += 1
                break
        else:                                      # no difference found in the overlap
            if len(first) > len(second):           # "abc" before "ab" is impossible
                return ""
    queue = deque(c for c in range(26) if present[c] and indegree[c] == 0)
    order = []
    while queue:
        c = queue.popleft()
        order.append(chr(c + 97))
        for d in range(26):
            if edge[c][d]:
                indegree[d] -= 1
                if indegree[d] == 0:
                    queue.append(d)
    if len(order) < sum(present):                  # some letters sit on a cycle
        return ""
    return "".join(order)


def show(words):
    result = alien_order(words)
    return "[" + ", ".join(words) + "] -> " + ('"' + result + '"' if result else '"" (invalid)')


print(show(["wrt", "wrf", "er", "ett", "rftt"]))
print(show(["z", "x"]))
print(show(["z", "x", "z"]))  # [z, x, z] -> "" (invalid)
print(show(["abc", "ab"]))  # [abc, ab] -> "" (invalid)
print(show(["ab", "abc"]))
print(show(["z", "z"]))
print(show(["ab", "adc"]))
print(show(["baa", "abcd", "abca", "cab", "cad"]))
print(show(["caa", "aaa", "aab"]))` },
          { label: `Is the order unique, and does it really sort the words? (LeetCode 953 check)`, code: `from collections import deque


def derive(words):
    """Kahn on letters. Returns (order, unique); order is "" when the input is invalid."""
    present = sorted(set("".join(words)))
    after = {ch: set() for ch in present}          # after[a] = letters that must follow a
    indegree = {ch: 0 for ch in present}
    for first, second in zip(words, words[1:]):
        for a, b in zip(first, second):
            if a != b:
                if b not in after[a]:
                    after[a].add(b)
                    indegree[b] += 1
                break
        else:
            if len(first) > len(second):
                return "", False
    queue = deque(ch for ch in present if indegree[ch] == 0)
    order, unique = [], True
    while queue:
        if len(queue) > 1:                         # two letters ready at once: no clue orders them
            unique = False
        ch = queue.popleft()
        order.append(ch)
        for nxt in sorted(after[ch]):              # sorted: sets have no fixed order
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    if len(order) < len(present):
        return "", False
    return "".join(order), unique


def is_sorted(words, order):
    """LeetCode 953: are the words sorted under this alphabet?"""
    rank = {ch: i for i, ch in enumerate(order)}
    for first, second in zip(words, words[1:]):
        for a, b in zip(first, second):
            if a != b:
                if rank[a] > rank[b]:
                    return False
                break
        else:
            if len(first) > len(second):
                return False
    return True


for words in (["wrt", "wrf", "er", "ett", "rftt"], ["ab", "adc"], ["caa", "aaa", "aab"], ["z", "x", "z"]):
    order, unique = derive(words)
    check = is_sorted(words, order) if order else False
    print("[" + ", ".join(words) + "] order=" + (order or "-") + " unique=" + str(unique).lower()
          + " words sorted under it=" + str(check).lower())

english = "abcdefghijklmnopqrstuvwxyz"
print("check hello, leetcode: " + str(is_sorted(["hello", "leetcode"], "hlabcdefgijkmnopqrstuvwxyz")).lower())  # check hello, leetcode: true
print("check word, world, row: " + str(is_sorted(["word", "world", "row"], "worldabcefghijkmnpqstuvxyz")).lower())  # check word, world, row: false
print("check apple, app: " + str(is_sorted(["apple", "app"], english)).lower())  # check apple, app: false` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given a list of words from an alien language, and the list is sorted in that language's alphabetical order. The letters are ordinary lowercase letters, but their order is unknown. Return a string with one possible ordering of the letters, or an empty string if no ordering is consistent with the list. Please write it in JavaScript."

**What a strong answer should cover:**
- Only adjacent words are compared, and only their first differing letters give a rule (an edge a -> b); letters after that carry no information.
- The prefix trap: a longer word directly before its own prefix makes the input invalid.
- A topological sort (Kahn) over the letters that appear, adding each edge once; a cycle means contradictory rules and the answer is "".
- Complexity O(C + U^2) with C total characters and U at most 26 letters, and how to tell whether the order is unique.
- JavaScript specifics: \`charCodeAt\` and \`String.fromCharCode\` for letter indices, \`new Set(words.join(''))\` and default string \`sort()\` for the letter set, \`Map\`/\`Set\` insertion order, and a head-indexed array as the queue.

**Clarifying questions expected:**
- "Is any valid ordering acceptable, or do you want a specific one?"
- "What should I return if the list is contradictory or a word comes before its own prefix?"
- "Are all characters lowercase a to z?"

**Code / implementation expected:** Yes — \`alienOrder(words)\` in JavaScript: build edges from adjacent pairs, then Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Archaeologists dig up a dictionary from an alien civilisation. It uses our letters, but in a different alphabetical order, and nobody knows what that order is. The words, however, are clearly **sorted** — it is a dictionary, after all. Can you work out the alien alphabet just from the order of the words?

You can, and the trick is the same one you use when you check whether "apple" comes before "apply" in English: you walk both words letter by letter until they first differ. "appl**e**" vs "appl**y**" — the first difference is e vs y, so in English e comes before y. Every pair of neighbouring words in the alien dictionary gives you **one such clue**. Collect the clues, and you have a set of "this letter comes before that letter" rules. Turning rules like that into one ordering is a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).

Sometimes the clues contradict each other ("z before x" and "x before z"), and sometimes the dictionary itself is broken ("abc" listed before "ab"). A good answer detects both and returns an empty string.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all characters lowercase English letters? | Lets you use arrays of size 26 instead of hash maps. |
| If several alphabets fit, may I return any of them? | Usually yes. If not, you need a tie-break (smallest letter first, with a min-heap). |
| Should letters that appear but have no rules be included? | Yes in the standard version: every letter that appears must be in the answer. |
| What if the input is not actually sortable — a contradiction, or "abc" before "ab"? | The standard contract is to return \`""\`. |
| How many words and how long are they? | Building the clues costs the total number of characters, so this bounds the running time. |

## 3. One Clue per Neighbouring Pair

📌 **Interview term: Lexicographic order** — dictionary order: compare two words letter by letter; the first position where they differ decides. If one word runs out first and everything so far matched, the shorter word comes first ("ab" before "abc").

So for each pair of **adjacent** words, find the first position where they differ. If the letters there are \`a\` and \`b\`, then \`a\` comes before \`b\` in the alien alphabet. That is all the pair tells you; letters **after** the first difference carry no information.

📌 **Interview term: Precedence edge** — the directed edge \`a -> b\` meaning "a comes before b", one per adjacent pair with a difference.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="Comparing wrt with wrf: w and r match, t and f differ so t comes before f, nothing after that position counts">
  <defs>
    <marker id="al1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="66">word 1</text>
  <rect class="d-box-muted" x="130" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="68" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="68" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="68" text-anchor="middle">t</text>
  <text class="d-sub" x="40" y="176">word 2</text>
  <rect class="d-box-muted" x="130" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="178" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="178" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="178" text-anchor="middle">f</text>
  <text class="d-sub" x="165" y="122" text-anchor="middle">same</text>
  <text class="d-sub" x="255" y="122" text-anchor="middle">same</text>
  <path class="d-edge-accent" d="M 345 88 L 345 144" marker-end="url(#al1-arrow)"/>
  <rect class="d-box" x="440" y="95" width="150" height="44" rx="8"/>
  <text class="d-text" x="515" y="123" text-anchor="middle">edge t to f</text>
</svg>

\`wrt\` and \`wrf\` agree on \`w\` and \`r\`, then differ at the third letter, so \`t\` comes before \`f\`.

**Why adjacent pairs are enough.** Dictionary order is transitive: if word 1 is before word 2 and word 2 is before word 3 under some alphabet, then word 1 is before word 3 under that alphabet too. So any alphabet that satisfies every adjacent pair automatically sorts the whole list, and comparing non-adjacent pairs adds no new information — only more work. Example 2 checks this: it re-verifies every list against the derived alphabet and prints \`words sorted under it=true\`.

📌 **Interview term: Prefix rule (invalid input)** — if the first word is longer and the shorter word is a prefix of it (\`"abc"\` before \`"ab"\`), no alphabet can sort the list, because the shorter word must come first in every alphabet. Return \`""\` immediately. The reverse (\`"ab"\` before \`"abc"\`) is fine and gives no clue.

## 4. Build the Letter Graph, Then Topologically Sort It

For \`["wrt", "wrf", "er", "ett", "rftt"]\` the four adjacent pairs give:

| Pair | First difference | Edge |
| :--- | :--- | :--- |
| wrt, wrf | t vs f | t -> f |
| wrf, er | w vs e | w -> e |
| er, ett | r vs t | r -> t |
| ett, rftt | e vs r | e -> r |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 140" role="img" aria-label="Letter graph w to e to r to t to f, a single chain">
  <defs>
    <marker id="al2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="65" y="64" text-anchor="middle">w</text>
  <text class="d-sub" x="65" y="84" text-anchor="middle">in 0</text>
  <rect class="d-box" x="160" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="205" y="64" text-anchor="middle">e</text>
  <text class="d-sub" x="205" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="300" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">r</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="440" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="485" y="64" text-anchor="middle">t</text>
  <text class="d-sub" x="485" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="580" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="625" y="64" text-anchor="middle">f</text>
  <text class="d-sub" x="625" y="84" text-anchor="middle">in 1</text>
  <path class="d-edge" d="M 110 67 L 154 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 250 67 L 294 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 390 67 L 434 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 574 67" marker-end="url(#al2-arrow)"/>
</svg>

The edges happen to form a single chain, so the alphabet is \`"wertf"\` and it is the only possible answer.

Then run **Kahn's algorithm** on the letters:

1. Mark every letter that appears in any word (letters with no clues must still appear in the answer).
2. Add each precedence edge **once** and count in-degrees; the same clue can come from several pairs, and counting it twice would need two decrements.
3. Queue the letters with in-degree 0, pop one, append it, decrement its successors, enqueue any that reach 0.
4. If fewer letters come out than appeared, the clues contain a cycle (\`["z", "x", "z"]\` gives z -> x and x -> z): return \`""\`.

📌 **Interview term: Unique order** — the alphabet is fully determined only if, at every step of Kahn, **exactly one** letter is ready. If the queue ever holds two letters, nothing orders them and several alphabets fit. \`["ab", "adc"]\` gives only \`b -> d\`, so \`a\` and \`c\` float freely: Example 2 prints \`unique=false\`.

With only 26 letters, a 26 x 26 boolean matrix is a simple and fast way to store "edge already added", and scanning letters \`a\` to \`z\` makes the output deterministic (ties are broken alphabetically by queue order).

📌 **Interview term: Verifying an alien dictionary** — the easier reverse problem (LeetCode 953): given the alphabet, check whether the words are sorted. Map each letter to its rank and compare adjacent words with the same first-difference and prefix rules. Example 2 includes it.

A DFS-based topological sort works here too (three colours on the letter graph; a GRAY letter means a contradiction); the trade-offs are the same as in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs). Building a graph out of words and then searching it is also the idea behind [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem), where the edges are one-letter changes instead of precedence clues.

## 6. The Code in JavaScript

~~~javascript
function alienOrder(words) {
  const A = 'a'.charCodeAt(0);
  const present = new Array(26).fill(false);
  for (const w of words) for (const ch of w) present[ch.charCodeAt(0) - A] = true;
  const edge = Array.from({ length: 26 }, () => new Array(26).fill(false)); // edge[a][b]: a before b
  const indegree = new Array(26).fill(0);
  for (let i = 0; i + 1 < words.length; i++) {       // only ADJACENT pairs are needed
    const first = words[i], second = words[i + 1];
    const len = Math.min(first.length, second.length);
    let j = 0;
    while (j < len && first[j] === second[j]) j++;
    if (j === len) {                                 // no difference found in the overlap
      if (first.length > second.length) return '';   // "abc" before "ab" is impossible
      continue;
    }
    const x = first.charCodeAt(j) - A, y = second.charCodeAt(j) - A;  // the only clue
    if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }           // ignore repeats
  }
  const queue = [];
  for (let c = 0; c < 26; c++) if (present[c] && indegree[c] === 0) queue.push(c);
  let order = '';
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    order += String.fromCharCode(c + A);
    for (let d = 0; d < 26; d++) {
      if (edge[c][d] && --indegree[d] === 0) queue.push(d);
    }
  }
  const letters = present.filter(Boolean).length;
  return order.length < letters ? '' : order;        // some letters sit on a cycle
}
~~~

**JavaScript details doing the work:**

- \`ch.charCodeAt(0) - A\` (with \`A = 'a'.charCodeAt(0)\`, which is 97) maps letters to \`0..25\`; \`String.fromCharCode(c + A)\` maps back.
- \`for (const ch of w)\` iterates characters of a string; \`first[j]\` indexes a string directly.
- The \`while (j < len && first[j] === second[j]) j++;\` loop finds the first difference; \`j === len\` means none, which triggers the prefix check.
- \`Array.from({ length: 26 }, () => new Array(26).fill(false))\` makes 26 **separate** rows; \`fill(new Array(26))\` would share one row.
- \`present.filter(Boolean).length\` counts the letters that appear.
- Building the answer with \`order += ...\` is fine for at most 26 characters.

**A Set/Map version** (Example 2) handles arbitrary characters: \`[...new Set(words.join(''))].sort()\` gives the distinct letters, and here the default \`sort()\` — which compares as strings — is exactly what we want. A \`Map\` of \`Set\`s holds successors; both iterate in insertion order, and the example still sorts successors to make the tie-break explicit.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (they use only \`console.log\`, so they also run in the browser runner on this page). The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Derive the alien alphabet: normal, contradictory and prefix cases** prints:

~~~text
[wrt, wrf, er, ett, rftt] -> "wertf"
[z, x] -> "zx"
[z, x, z] -> "" (invalid)
[abc, ab] -> "" (invalid)
[ab, abc] -> "abc"
[z, z] -> "z"
[ab, adc] -> "abcd"
[baa, abcd, abca, cab, cad] -> "bdac"
[caa, aaa, aab] -> "cab"
~~~

**Example 2 — Is the order unique, and does it really sort the words? (LeetCode 953 check)** prints:

~~~text
[wrt, wrf, er, ett, rftt] order=wertf unique=true words sorted under it=true
[ab, adc] order=abcd unique=false words sorted under it=true
[caa, aaa, aab] order=cab unique=true words sorted under it=true
[z, x, z] order=- unique=false words sorted under it=false
check hello, leetcode: true
check word, world, row: false
check apple, app: false
~~~

**Reading the output:** In Example 1, the classic input gives \`"wertf"\`. \`[z, x, z]\` gives contradictory clues (z before x, then x before z), so it is invalid. \`[abc, ab]\` breaks the prefix rule and is rejected before any sorting. \`[ab, abc]\` yields no clue at all, so the three letters come out alphabetically by queue order: \`"abc"\`. \`[z, z]\` has one letter. \`[ab, adc]\` only knows b before d, and the queue releases a, b, c, then d. In Example 2, \`unique=true\` for the chain inputs and \`unique=false\` for \`[ab, adc]\`; every derived alphabet re-sorts its own word list, and the three verification checks match LeetCode 953 (\`hello, leetcode\` is sorted under its alphabet; \`word, world, row\` and \`apple, app\` are not).

## 9. Complexity

Let **C** be the total number of characters in all words, **N** the number of words, and **U** the number of distinct letters (at most 26).

| Step | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Mark letters that appear | O(C) | O(U) | read every character once |
| Compare adjacent pairs | O(C) | O(min(U^2, N)) edges | each pair scans at most the shorter word; at most one edge per pair |
| Kahn on the letter graph (matrix) | O(U^2) | O(U^2) | for each letter, scan 26 possible successors |
| Total | O(C + U^2) | O(U^2) | with U at most 26, the letter part is effectively constant |

With an adjacency list instead of the 26 x 26 matrix, Kahn is O(U + E). Either way, the work is dominated by reading the input once.

## 10. Edge Cases

- **One word:** no pairs, no clues; return its distinct letters in any order.
- **Identical neighbours (\`["z", "z"]\`):** no difference, no clue, and no prefix problem.
- **Prefix in the right order (\`["ab", "abc"]\`):** fine, no clue.
- **Prefix in the wrong order (\`["abc", "ab"]\`):** invalid, return \`""\`.
- **Contradiction (\`["z", "x", "z"]\`):** a cycle in the letter graph, return \`""\`.
- **Letters with no clues:** must still be in the answer; seed the queue from **all** letters that appear.
- **The same clue twice:** add the edge once, or count and decrement it consistently.

## Common Pitfalls

- **Comparing every pair of words.** O(N^2 * L) and adds nothing; adjacent pairs are enough.
- **Using letters after the first difference.** Only the first differing position is a clue.
- **Missing the prefix trap.** \`["abc", "ab"]\` must return \`''\`.
- **Dropping letters with no clues.** Seed the queue from every letter that appears.
- **Shared rows from \`fill\`.** \`new Array(26).fill(new Array(26))\` makes every row the same array.
- **Truthiness of \`''\`.** The empty string is falsy; \`if (result)\` is a fine "valid?" test, but do not confuse it with a missing value.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clues:</strong> <span style="color:#f0e2c8;">For each adjacent pair, walk both words with an index until they differ; that one position gives an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -&gt; b</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Invalid input:</strong> <span style="color:#f0e2c8;">If no difference is found and the first word is longer, it is a prefix violation: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Graph:</strong> <span style="color:#f0e2c8;">Nodes are all letters that appear; add each edge once in a 26 x 26 boolean array and count in-degrees.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sort:</strong> <span style="color:#f0e2c8;">Kahn with a head-indexed array; if fewer letters come out than appeared, the clues have a cycle: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(C + U^2) for C characters and U at most 26 letters; effectively linear in the input size.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are adjacent pairs enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lexicographic order is transitive, so an alphabet that sorts every adjacent pair sorts the whole list. Example 2 re-checks each derived alphabet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know if the answer is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds more than one letter, those letters are unordered by any clue, so several alphabets fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the default <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort()</code> fine for the letter set but not for numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compares as strings. For single letters that is alphabetical, which is what we want; for numbers it gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10, 9]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if characters can be anything, not just a to z?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>s keyed by character, as in Example 2; the algorithm is the same, and complexity becomes O(C + U + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of Kahn?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three colours on the letter graph, a GRAY letter means a contradiction, and the reverse finish order is the alphabet. Kahn avoids recursion and makes uniqueness easy to check.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lexicographic order** | dictionary order decided by the first differing letter |
| **Precedence edge** | a -> b meaning letter a comes before letter b |
| **Prefix rule** | a longer word cannot come before its own prefix; that input is invalid |
| **Unique order** | only one letter is ever ready in Kahn, so only one alphabet fits |
| **Verifying an alien dictionary** | the reverse check: are the words sorted under a given alphabet |
| **Topological sort** | ordering nodes so every edge points forward; here, the letters |
| **charCodeAt** | returns the UTF-16 code unit of a character, 97 for a |

---
**Conclusion:** The Alien Dictionary is a topological sort hiding behind string comparison. Each pair of neighbouring words contributes at most one rule — the first letters where they differ — and a longer word before its own prefix makes the input invalid. Put the rules into a letter graph, run Kahn's algorithm over every letter that appears, and either all letters come out in a valid alphabet or a cycle proves the rules contradict each other. It runs in time linear in the input plus a constant for the 26 letters, and the same queue tells you whether the alphabet is unique. In JavaScript, \`charCodeAt\`, separate rows from \`Array.from\`, and a head-indexed queue keep it short and correct.`,
        examples: [
          { label: `Derive the alien alphabet: normal, contradictory and prefix cases`, code: `// Return one valid letter order, or "" if the word list is contradictory.
function alienOrder(words) {
  const A = 'a'.charCodeAt(0);
  const present = new Array(26).fill(false);
  for (const w of words) for (const ch of w) present[ch.charCodeAt(0) - A] = true;
  const edge = Array.from({ length: 26 }, () => new Array(26).fill(false)); // edge[a][b]: a before b
  const indegree = new Array(26).fill(0);
  for (let i = 0; i + 1 < words.length; i++) {       // only ADJACENT pairs are needed
    const first = words[i], second = words[i + 1];
    const len = Math.min(first.length, second.length);
    let j = 0;
    while (j < len && first[j] === second[j]) j++;
    if (j === len) {                                 // no difference found in the overlap
      if (first.length > second.length) return '';   // "abc" before "ab" is impossible
      continue;
    }
    const x = first.charCodeAt(j) - A, y = second.charCodeAt(j) - A;  // the only clue
    if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }           // ignore repeats
  }
  const queue = [];
  for (let c = 0; c < 26; c++) if (present[c] && indegree[c] === 0) queue.push(c);
  let order = '';
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    order += String.fromCharCode(c + A);
    for (let d = 0; d < 26; d++) {
      if (edge[c][d] && --indegree[d] === 0) queue.push(d);
    }
  }
  const letters = present.filter(Boolean).length;
  return order.length < letters ? '' : order;        // some letters sit on a cycle
}

function show(words) {
  const result = alienOrder(words);
  return '[' + words.join(', ') + '] -> ' + (result ? '"' + result + '"' : '"" (invalid)');
}

console.log(show(['wrt', 'wrf', 'er', 'ett', 'rftt']));
console.log(show(['z', 'x']));
console.log(show(['z', 'x', 'z'])); // [z, x, z] -> "" (invalid)
console.log(show(['abc', 'ab'])); // [abc, ab] -> "" (invalid)
console.log(show(['ab', 'abc']));
console.log(show(['z', 'z']));
console.log(show(['ab', 'adc']));
console.log(show(['baa', 'abcd', 'abca', 'cab', 'cad']));
console.log(show(['caa', 'aaa', 'aab']));` },
          { label: `Is the order unique, and does it really sort the words? (LeetCode 953 check)`, code: `// Kahn on letters. Returns { order, unique }; order is '' when the input is invalid.
function derive(words) {
  const present = [...new Set(words.join(''))].sort();    // letters, a to z
  const after = new Map(present.map((ch) => [ch, new Set()])); // letters that must follow
  const indegree = new Map(present.map((ch) => [ch, 0]));
  for (let i = 0; i + 1 < words.length; i++) {
    const first = words[i], second = words[i + 1];
    const len = Math.min(first.length, second.length);
    let j = 0;
    while (j < len && first[j] === second[j]) j++;
    if (j === len) {
      if (first.length > second.length) return { order: '', unique: false };
      continue;
    }
    const a = first[j], b = second[j];
    if (!after.get(a).has(b)) { after.get(a).add(b); indegree.set(b, indegree.get(b) + 1); }
  }
  const queue = present.filter((ch) => indegree.get(ch) === 0);
  let order = '', unique = true;
  for (let head = 0; head < queue.length; head++) {
    if (queue.length - head > 1) unique = false;          // two letters ready at once
    const ch = queue[head];
    order += ch;
    for (const next of [...after.get(ch)].sort()) {        // Set keeps insertion order; sort to be explicit
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length < present.length) return { order: '', unique: false };
  return { order, unique };
}

// LeetCode 953: are the words sorted under this alphabet?
function isSorted(words, order) {
  const rank = new Map([...order].map((ch, i) => [ch, i]));
  for (let i = 0; i + 1 < words.length; i++) {
    const first = words[i], second = words[i + 1];
    const len = Math.min(first.length, second.length);
    let j = 0;
    while (j < len && first[j] === second[j]) j++;
    if (j === len) { if (first.length > second.length) return false; continue; }
    if (rank.get(first[j]) > rank.get(second[j])) return false;
  }
  return true;
}

for (const words of [['wrt', 'wrf', 'er', 'ett', 'rftt'], ['ab', 'adc'], ['caa', 'aaa', 'aab'], ['z', 'x', 'z']]) {
  const { order, unique } = derive(words);
  const check = order ? isSorted(words, order) : false;
  console.log('[' + words.join(', ') + '] order=' + (order || '-') + ' unique=' + unique +
    ' words sorted under it=' + check);
}

const english = 'abcdefghijklmnopqrstuvwxyz';
console.log('check hello, leetcode: ' + isSorted(['hello', 'leetcode'], 'hlabcdefgijkmnopqrstuvwxyz')); // check hello, leetcode: true
console.log('check word, world, row: ' + isSorted(['word', 'world', 'row'], 'worldabcefghijkmnpqstuvxyz')); // check word, world, row: false
console.log('check apple, app: ' + isSorted(['apple', 'app'], english)); // check apple, app: false` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given a list of words from an alien language, and the list is sorted in that language's alphabetical order. The letters are ordinary lowercase letters, but their order is unknown. Return a string with one possible ordering of the letters, or an empty string if no ordering is consistent with the list. Please write it in Java."

**What a strong answer should cover:**
- Only adjacent words are compared, and only their first differing letters give a rule (an edge a -> b); letters after that carry no information.
- The prefix trap: a longer word directly before its own prefix makes the input invalid.
- A topological sort (Kahn) over the letters that appear, adding each edge once; a cycle means contradictory rules and the answer is "".
- Complexity O(C + U^2) with C total characters and U at most 26 letters, and how to tell whether the order is unique.
- Java specifics: \`char\` arithmetic (\`ch - 'a'\`), \`boolean[26][26]\` and \`int[26]\`, \`charAt\` in the comparison loop, \`StringBuilder\` for the result, and \`ArrayDeque<Integer>\` as the queue.

**Clarifying questions expected:**
- "Is any valid ordering acceptable, or do you want a specific one?"
- "What should I return if the list is contradictory or a word comes before its own prefix?"
- "Are all characters lowercase a to z?"

**Code / implementation expected:** Yes — \`alienOrder(words)\` in Java: build edges from adjacent pairs, then Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Archaeologists dig up a dictionary from an alien civilisation. It uses our letters, but in a different alphabetical order, and nobody knows what that order is. The words, however, are clearly **sorted** — it is a dictionary, after all. Can you work out the alien alphabet just from the order of the words?

You can, and the trick is the same one you use when you check whether "apple" comes before "apply" in English: you walk both words letter by letter until they first differ. "appl**e**" vs "appl**y**" — the first difference is e vs y, so in English e comes before y. Every pair of neighbouring words in the alien dictionary gives you **one such clue**. Collect the clues, and you have a set of "this letter comes before that letter" rules. Turning rules like that into one ordering is a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).

Sometimes the clues contradict each other ("z before x" and "x before z"), and sometimes the dictionary itself is broken ("abc" listed before "ab"). A good answer detects both and returns an empty string.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all characters lowercase English letters? | Lets you use arrays of size 26 instead of hash maps. |
| If several alphabets fit, may I return any of them? | Usually yes. If not, you need a tie-break (smallest letter first, with a min-heap). |
| Should letters that appear but have no rules be included? | Yes in the standard version: every letter that appears must be in the answer. |
| What if the input is not actually sortable — a contradiction, or "abc" before "ab"? | The standard contract is to return \`""\`. |
| How many words and how long are they? | Building the clues costs the total number of characters, so this bounds the running time. |

## 3. One Clue per Neighbouring Pair

📌 **Interview term: Lexicographic order** — dictionary order: compare two words letter by letter; the first position where they differ decides. If one word runs out first and everything so far matched, the shorter word comes first ("ab" before "abc").

So for each pair of **adjacent** words, find the first position where they differ. If the letters there are \`a\` and \`b\`, then \`a\` comes before \`b\` in the alien alphabet. That is all the pair tells you; letters **after** the first difference carry no information.

📌 **Interview term: Precedence edge** — the directed edge \`a -> b\` meaning "a comes before b", one per adjacent pair with a difference.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="Comparing wrt with wrf: w and r match, t and f differ so t comes before f, nothing after that position counts">
  <defs>
    <marker id="al1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="66">word 1</text>
  <rect class="d-box-muted" x="130" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="68" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="68" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="68" text-anchor="middle">t</text>
  <text class="d-sub" x="40" y="176">word 2</text>
  <rect class="d-box-muted" x="130" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="178" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="178" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="178" text-anchor="middle">f</text>
  <text class="d-sub" x="165" y="122" text-anchor="middle">same</text>
  <text class="d-sub" x="255" y="122" text-anchor="middle">same</text>
  <path class="d-edge-accent" d="M 345 88 L 345 144" marker-end="url(#al1-arrow)"/>
  <rect class="d-box" x="440" y="95" width="150" height="44" rx="8"/>
  <text class="d-text" x="515" y="123" text-anchor="middle">edge t to f</text>
</svg>

\`wrt\` and \`wrf\` agree on \`w\` and \`r\`, then differ at the third letter, so \`t\` comes before \`f\`.

**Why adjacent pairs are enough.** Dictionary order is transitive: if word 1 is before word 2 and word 2 is before word 3 under some alphabet, then word 1 is before word 3 under that alphabet too. So any alphabet that satisfies every adjacent pair automatically sorts the whole list, and comparing non-adjacent pairs adds no new information — only more work. Example 2 checks this: it re-verifies every list against the derived alphabet and prints \`words sorted under it=true\`.

📌 **Interview term: Prefix rule (invalid input)** — if the first word is longer and the shorter word is a prefix of it (\`"abc"\` before \`"ab"\`), no alphabet can sort the list, because the shorter word must come first in every alphabet. Return \`""\` immediately. The reverse (\`"ab"\` before \`"abc"\`) is fine and gives no clue.

## 4. Build the Letter Graph, Then Topologically Sort It

For \`["wrt", "wrf", "er", "ett", "rftt"]\` the four adjacent pairs give:

| Pair | First difference | Edge |
| :--- | :--- | :--- |
| wrt, wrf | t vs f | t -> f |
| wrf, er | w vs e | w -> e |
| er, ett | r vs t | r -> t |
| ett, rftt | e vs r | e -> r |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 140" role="img" aria-label="Letter graph w to e to r to t to f, a single chain">
  <defs>
    <marker id="al2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="65" y="64" text-anchor="middle">w</text>
  <text class="d-sub" x="65" y="84" text-anchor="middle">in 0</text>
  <rect class="d-box" x="160" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="205" y="64" text-anchor="middle">e</text>
  <text class="d-sub" x="205" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="300" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">r</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="440" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="485" y="64" text-anchor="middle">t</text>
  <text class="d-sub" x="485" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="580" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="625" y="64" text-anchor="middle">f</text>
  <text class="d-sub" x="625" y="84" text-anchor="middle">in 1</text>
  <path class="d-edge" d="M 110 67 L 154 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 250 67 L 294 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 390 67 L 434 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 574 67" marker-end="url(#al2-arrow)"/>
</svg>

The edges happen to form a single chain, so the alphabet is \`"wertf"\` and it is the only possible answer.

Then run **Kahn's algorithm** on the letters:

1. Mark every letter that appears in any word (letters with no clues must still appear in the answer).
2. Add each precedence edge **once** and count in-degrees; the same clue can come from several pairs, and counting it twice would need two decrements.
3. Queue the letters with in-degree 0, pop one, append it, decrement its successors, enqueue any that reach 0.
4. If fewer letters come out than appeared, the clues contain a cycle (\`["z", "x", "z"]\` gives z -> x and x -> z): return \`""\`.

📌 **Interview term: Unique order** — the alphabet is fully determined only if, at every step of Kahn, **exactly one** letter is ready. If the queue ever holds two letters, nothing orders them and several alphabets fit. \`["ab", "adc"]\` gives only \`b -> d\`, so \`a\` and \`c\` float freely: Example 2 prints \`unique=false\`.

With only 26 letters, a 26 x 26 boolean matrix is a simple and fast way to store "edge already added", and scanning letters \`a\` to \`z\` makes the output deterministic (ties are broken alphabetically by queue order).

📌 **Interview term: Verifying an alien dictionary** — the easier reverse problem (LeetCode 953): given the alphabet, check whether the words are sorted. Map each letter to its rank and compare adjacent words with the same first-difference and prefix rules. Example 2 includes it.

A DFS-based topological sort works here too (three colours on the letter graph; a GRAY letter means a contradiction); the trade-offs are the same as in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs). Building a graph out of words and then searching it is also the idea behind [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem), where the edges are one-letter changes instead of precedence clues.

## 6. The Code in Java

~~~java
static String alienOrder(String[] words) {
    boolean[] present = new boolean[26];
    for (String w : words) for (char ch : w.toCharArray()) present[ch - 'a'] = true;
    boolean[][] edge = new boolean[26][26];            // edge[a][b]: a comes before b
    int[] indegree = new int[26];
    for (int i = 0; i + 1 < words.length; i++) {       // only ADJACENT pairs are needed
        String first = words[i], second = words[i + 1];
        int len = Math.min(first.length(), second.length());
        int j = 0;
        while (j < len && first.charAt(j) == second.charAt(j)) j++;
        if (j == len) {                                // no difference found in the overlap
            if (first.length() > second.length()) return "";   // "abc" before "ab"
            continue;
        }
        int x = first.charAt(j) - 'a', y = second.charAt(j) - 'a';   // the only clue
        if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }      // ignore repeats
    }
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    int letters = 0;
    for (int c = 0; c < 26; c++) {
        if (!present[c]) continue;
        letters++;
        if (indegree[c] == 0) queue.add(c);
    }
    StringBuilder order = new StringBuilder();
    while (!queue.isEmpty()) {
        int c = queue.poll();
        order.append((char) ('a' + c));
        for (int d = 0; d < 26; d++) {
            if (edge[c][d] && --indegree[d] == 0) queue.add(d);
        }
    }
    return order.length() < letters ? "" : order.toString();   // some letters on a cycle
}
~~~

**Java details doing the work:**

- \`ch - 'a'\` is \`char\` arithmetic: both are promoted to \`int\`, giving \`0..25\`. \`(char) ('a' + c)\` maps back; the cast is needed because \`'a' + c\` is an \`int\`.
- \`boolean[][] edge = new boolean[26][26]\` and \`int[] indegree = new int[26]\` start at \`false\`/\`0\` automatically.
- \`first.charAt(j) == second.charAt(j)\` compares primitive \`char\`s, so \`==\` is correct here (unlike comparing \`String\`s or boxed \`Character\`s, where you need \`equals\`).
- \`StringBuilder\` collects the answer; string \`+\` in a loop creates a new \`String\` every time.
- \`static String show(String... words)\` uses varargs, so test calls read naturally.

Example 2 adds the unique-order check (\`queue.size() > 1\` at any step) and LeetCode 953 verification with an \`int[26]\` rank table.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Derive the alien alphabet: normal, contradictory and prefix cases** prints:

~~~text
[wrt, wrf, er, ett, rftt] -> "wertf"
[z, x] -> "zx"
[z, x, z] -> "" (invalid)
[abc, ab] -> "" (invalid)
[ab, abc] -> "abc"
[z, z] -> "z"
[ab, adc] -> "abcd"
[baa, abcd, abca, cab, cad] -> "bdac"
[caa, aaa, aab] -> "cab"
~~~

**Example 2 — Is the order unique, and does it really sort the words? (LeetCode 953 check)** prints:

~~~text
[wrt, wrf, er, ett, rftt] order=wertf unique=true words sorted under it=true
[ab, adc] order=abcd unique=false words sorted under it=true
[caa, aaa, aab] order=cab unique=true words sorted under it=true
[z, x, z] order=- unique=false words sorted under it=false
check hello, leetcode: true
check word, world, row: false
check apple, app: false
~~~

**Reading the output:** In Example 1, the classic input gives \`"wertf"\`. \`[z, x, z]\` gives contradictory clues (z before x, then x before z), so it is invalid. \`[abc, ab]\` breaks the prefix rule and is rejected before any sorting. \`[ab, abc]\` yields no clue at all, so the three letters come out alphabetically by queue order: \`"abc"\`. \`[z, z]\` has one letter. \`[ab, adc]\` only knows b before d, and the queue releases a, b, c, then d. In Example 2, \`unique=true\` for the chain inputs and \`unique=false\` for \`[ab, adc]\`; every derived alphabet re-sorts its own word list, and the three verification checks match LeetCode 953 (\`hello, leetcode\` is sorted under its alphabet; \`word, world, row\` and \`apple, app\` are not).

## 9. Complexity

Let **C** be the total number of characters in all words, **N** the number of words, and **U** the number of distinct letters (at most 26).

| Step | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Mark letters that appear | O(C) | O(U) | read every character once |
| Compare adjacent pairs | O(C) | O(min(U^2, N)) edges | each pair scans at most the shorter word; at most one edge per pair |
| Kahn on the letter graph (matrix) | O(U^2) | O(U^2) | for each letter, scan 26 possible successors |
| Total | O(C + U^2) | O(U^2) | with U at most 26, the letter part is effectively constant |

With an adjacency list instead of the 26 x 26 matrix, Kahn is O(U + E). Either way, the work is dominated by reading the input once.

## 10. Edge Cases

- **One word:** no pairs, no clues; return its distinct letters in any order.
- **Identical neighbours (\`["z", "z"]\`):** no difference, no clue, and no prefix problem.
- **Prefix in the right order (\`["ab", "abc"]\`):** fine, no clue.
- **Prefix in the wrong order (\`["abc", "ab"]\`):** invalid, return \`""\`.
- **Contradiction (\`["z", "x", "z"]\`):** a cycle in the letter graph, return \`""\`.
- **Letters with no clues:** must still be in the answer; seed the queue from **all** letters that appear.
- **The same clue twice:** add the edge once, or count and decrement it consistently.

## Common Pitfalls

- **Comparing every pair of words.** O(N^2 * L) and adds nothing; adjacent pairs are enough.
- **Using letters after the first difference.** Only the first differing position is a clue.
- **Missing the prefix trap.** \`{"abc", "ab"}\` must return \`""\`.
- **Dropping letters with no clues.** Seed the queue from every letter that appears.
- **\`==\` on \`String\`s or \`Character\`s.** Fine for primitive \`char\`; for objects use \`equals\`.
- **Forgetting the \`(char)\` cast.** \`order.append('a' + c)\` appends the **number** (for example \`119\`), not the letter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clues:</strong> <span style="color:#f0e2c8;">For each adjacent pair, walk both words with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code> until they differ; that one position gives an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -&gt; b</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Invalid input:</strong> <span style="color:#f0e2c8;">If no difference is found and the first word is longer, it is a prefix violation: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Graph:</strong> <span style="color:#f0e2c8;">Nodes are all letters that appear; add each edge once in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[26][26]</code> and count in-degrees in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sort:</strong> <span style="color:#f0e2c8;">Kahn with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>; if fewer letters come out than appeared, the clues have a cycle: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(C + U^2) for C characters and U at most 26 letters; effectively linear in the input size.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are adjacent pairs enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lexicographic order is transitive, so an alphabet that sorts every adjacent pair sorts the whole list. Example 2 re-checks each derived alphabet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know if the answer is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds more than one letter, those letters are unordered by any clue, so several alphabets fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the smallest valid alphabet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;Integer&gt;</code> (a min-heap) instead of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">order.append('a' + c)</code> print numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'a' + c</code> is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder.append(int)</code> is chosen. Cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(char)</code> to append the letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of Kahn?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three colours on the letter graph, a GRAY letter means a contradiction, and the reverse finish order is the alphabet. Kahn avoids recursion and makes uniqueness easy to check.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lexicographic order** | dictionary order decided by the first differing letter |
| **Precedence edge** | a -> b meaning letter a comes before letter b |
| **Prefix rule** | a longer word cannot come before its own prefix; that input is invalid |
| **Unique order** | only one letter is ever ready in Kahn, so only one alphabet fits |
| **Verifying an alien dictionary** | the reverse check: are the words sorted under a given alphabet |
| **Topological sort** | ordering nodes so every edge points forward; here, the letters |
| **char arithmetic** | chars promote to int, so ch - 'a' gives 0 to 25 |

---
**Conclusion:** The Alien Dictionary is a topological sort hiding behind string comparison. Each pair of neighbouring words contributes at most one rule — the first letters where they differ — and a longer word before its own prefix makes the input invalid. Put the rules into a letter graph, run Kahn's algorithm over every letter that appears, and either all letters come out in a valid alphabet or a cycle proves the rules contradict each other. It runs in time linear in the input plus a constant for the 26 letters, and the same queue tells you whether the alphabet is unique. In Java, \`char\` arithmetic, fixed-size primitive arrays, and a \`StringBuilder\` (with the \`(char)\` cast) keep it short and correct.`,
        examples: [
          { label: `Derive the alien alphabet: normal, contradictory and prefix cases`, code: `import java.util.*;

public class Main {
    // Return one valid letter order, or "" if the word list is contradictory.
    static String alienOrder(String[] words) {
        boolean[] present = new boolean[26];
        for (String w : words) for (char ch : w.toCharArray()) present[ch - 'a'] = true;
        boolean[][] edge = new boolean[26][26];            // edge[a][b]: a comes before b
        int[] indegree = new int[26];
        for (int i = 0; i + 1 < words.length; i++) {       // only ADJACENT pairs are needed
            String first = words[i], second = words[i + 1];
            int len = Math.min(first.length(), second.length());
            int j = 0;
            while (j < len && first.charAt(j) == second.charAt(j)) j++;
            if (j == len) {                                // no difference found in the overlap
                if (first.length() > second.length()) return "";   // "abc" before "ab"
                continue;
            }
            int x = first.charAt(j) - 'a', y = second.charAt(j) - 'a';   // the only clue
            if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }      // ignore repeats
        }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        int letters = 0;
        for (int c = 0; c < 26; c++) {
            if (!present[c]) continue;
            letters++;
            if (indegree[c] == 0) queue.add(c);
        }
        StringBuilder order = new StringBuilder();
        while (!queue.isEmpty()) {
            int c = queue.poll();
            order.append((char) ('a' + c));
            for (int d = 0; d < 26; d++) {
                if (edge[c][d] && --indegree[d] == 0) queue.add(d);
            }
        }
        return order.length() < letters ? "" : order.toString();   // some letters on a cycle
    }

    static String show(String... words) {
        String result = alienOrder(words);
        return "[" + String.join(", ", words) + "] -> "
            + (result.isEmpty() ? "\\"\\" (invalid)" : "\\"" + result + "\\"");
    }

    public static void main(String[] args) {
        System.out.println(show("wrt", "wrf", "er", "ett", "rftt"));
        System.out.println(show("z", "x"));
        System.out.println(show("z", "x", "z"));
        System.out.println(show("abc", "ab"));
        System.out.println(show("ab", "abc"));
        System.out.println(show("z", "z"));
        System.out.println(show("ab", "adc"));
        System.out.println(show("baa", "abcd", "abca", "cab", "cad"));
        System.out.println(show("caa", "aaa", "aab"));
    }
}` },
          { label: `Is the order unique, and does it really sort the words? (LeetCode 953 check)`, code: `import java.util.*;

public class Main {
    static boolean unique;

    // Kahn on letters. Returns "" when the input is invalid; sets the unique flag.
    static String derive(String[] words) {
        boolean[] present = new boolean[26];
        for (String w : words) for (char ch : w.toCharArray()) present[ch - 'a'] = true;
        boolean[][] edge = new boolean[26][26];
        int[] indegree = new int[26];
        unique = false;
        for (int i = 0; i + 1 < words.length; i++) {
            String first = words[i], second = words[i + 1];
            int len = Math.min(first.length(), second.length());
            int j = 0;
            while (j < len && first.charAt(j) == second.charAt(j)) j++;
            if (j == len) {
                if (first.length() > second.length()) return "";
                continue;
            }
            int x = first.charAt(j) - 'a', y = second.charAt(j) - 'a';
            if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }
        }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        int letters = 0;
        for (int c = 0; c < 26; c++) if (present[c]) { letters++; if (indegree[c] == 0) queue.add(c); }
        StringBuilder order = new StringBuilder();
        boolean onlyOne = true;
        while (!queue.isEmpty()) {
            if (queue.size() > 1) onlyOne = false;         // two letters ready at once
            int c = queue.poll();
            order.append((char) ('a' + c));
            for (int d = 0; d < 26; d++) if (edge[c][d] && --indegree[d] == 0) queue.add(d);
        }
        if (order.length() < letters) return "";
        unique = onlyOne;
        return order.toString();
    }

    // LeetCode 953: are the words sorted under this alphabet?
    static boolean isSorted(String[] words, String order) {
        int[] rank = new int[26];
        for (int i = 0; i < order.length(); i++) rank[order.charAt(i) - 'a'] = i;
        for (int i = 0; i + 1 < words.length; i++) {
            String first = words[i], second = words[i + 1];
            int len = Math.min(first.length(), second.length());
            int j = 0;
            while (j < len && first.charAt(j) == second.charAt(j)) j++;
            if (j == len) { if (first.length() > second.length()) return false; continue; }
            if (rank[first.charAt(j) - 'a'] > rank[second.charAt(j) - 'a']) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        String[][] lists = {{"wrt", "wrf", "er", "ett", "rftt"}, {"ab", "adc"}, {"caa", "aaa", "aab"}, {"z", "x", "z"}};
        for (String[] words : lists) {
            String order = derive(words);
            boolean check = !order.isEmpty() && isSorted(words, order);
            System.out.println("[" + String.join(", ", words) + "] order=" + (order.isEmpty() ? "-" : order)
                + " unique=" + unique + " words sorted under it=" + check);
        }
        String english = "abcdefghijklmnopqrstuvwxyz";
        System.out.println("check hello, leetcode: " + isSorted(new String[]{"hello", "leetcode"}, "hlabcdefgijkmnopqrstuvwxyz"));
        System.out.println("check word, world, row: " + isSorted(new String[]{"word", "world", "row"}, "worldabcefghijkmnpqstuvxyz"));
        System.out.println("check apple, app: " + isSorted(new String[]{"apple", "app"}, english));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a list of words from an alien language, and the list is sorted in that language's alphabetical order. The letters are ordinary lowercase letters, but their order is unknown. Return a string with one possible ordering of the letters, or an empty string if no ordering is consistent with the list. Please write it in C++."

**What a strong answer should cover:**
- Only adjacent words are compared, and only their first differing letters give a rule (an edge a -> b); letters after that carry no information.
- The prefix trap: a longer word directly before its own prefix makes the input invalid.
- A topological sort (Kahn) over the letters that appear, adding each edge once; a cycle means contradictory rules and the answer is "".
- Complexity O(C + U^2) with C total characters and U at most 26 letters, and how to tell whether the order is unique.
- C++ specifics: \`char\` arithmetic (\`ch - 'a'\`), zero-initialised \`bool edge[26][26] = {}\`, \`std::queue<int>\`, \`size_t\` lengths with \`min\`, and \`std::string\` appends for the result.

**Clarifying questions expected:**
- "Is any valid ordering acceptable, or do you want a specific one?"
- "What should I return if the list is contradictory or a word comes before its own prefix?"
- "Are all characters lowercase a to z?"

**Code / implementation expected:** Yes — \`alienOrder(words)\` in C++: build edges from adjacent pairs, then Kahn's algorithm.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Archaeologists dig up a dictionary from an alien civilisation. It uses our letters, but in a different alphabetical order, and nobody knows what that order is. The words, however, are clearly **sorted** — it is a dictionary, after all. Can you work out the alien alphabet just from the order of the words?

You can, and the trick is the same one you use when you check whether "apple" comes before "apply" in English: you walk both words letter by letter until they first differ. "appl**e**" vs "appl**y**" — the first difference is e vs y, so in English e comes before y. Every pair of neighbouring words in the alien dictionary gives you **one such clue**. Collect the clues, and you have a set of "this letter comes before that letter" rules. Turning rules like that into one ordering is a [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used).

Sometimes the clues contradict each other ("z before x" and "x before z"), and sometimes the dictionary itself is broken ("abc" listed before "ab"). A good answer detects both and returns an empty string.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all characters lowercase English letters? | Lets you use arrays of size 26 instead of hash maps. |
| If several alphabets fit, may I return any of them? | Usually yes. If not, you need a tie-break (smallest letter first, with a min-heap). |
| Should letters that appear but have no rules be included? | Yes in the standard version: every letter that appears must be in the answer. |
| What if the input is not actually sortable — a contradiction, or "abc" before "ab"? | The standard contract is to return \`""\`. |
| How many words and how long are they? | Building the clues costs the total number of characters, so this bounds the running time. |

## 3. One Clue per Neighbouring Pair

📌 **Interview term: Lexicographic order** — dictionary order: compare two words letter by letter; the first position where they differ decides. If one word runs out first and everything so far matched, the shorter word comes first ("ab" before "abc").

So for each pair of **adjacent** words, find the first position where they differ. If the letters there are \`a\` and \`b\`, then \`a\` comes before \`b\` in the alien alphabet. That is all the pair tells you; letters **after** the first difference carry no information.

📌 **Interview term: Precedence edge** — the directed edge \`a -> b\` meaning "a comes before b", one per adjacent pair with a difference.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="Comparing wrt with wrf: w and r match, t and f differ so t comes before f, nothing after that position counts">
  <defs>
    <marker id="al1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="66">word 1</text>
  <rect class="d-box-muted" x="130" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="68" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="68" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="40" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="68" text-anchor="middle">t</text>
  <text class="d-sub" x="40" y="176">word 2</text>
  <rect class="d-box-muted" x="130" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="178" text-anchor="middle">w</text>
  <rect class="d-box-muted" x="220" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="178" text-anchor="middle">r</text>
  <rect class="d-box-accent" x="310" y="150" width="70" height="44" rx="6"/>
  <text class="d-text" x="345" y="178" text-anchor="middle">f</text>
  <text class="d-sub" x="165" y="122" text-anchor="middle">same</text>
  <text class="d-sub" x="255" y="122" text-anchor="middle">same</text>
  <path class="d-edge-accent" d="M 345 88 L 345 144" marker-end="url(#al1-arrow)"/>
  <rect class="d-box" x="440" y="95" width="150" height="44" rx="8"/>
  <text class="d-text" x="515" y="123" text-anchor="middle">edge t to f</text>
</svg>

\`wrt\` and \`wrf\` agree on \`w\` and \`r\`, then differ at the third letter, so \`t\` comes before \`f\`.

**Why adjacent pairs are enough.** Dictionary order is transitive: if word 1 is before word 2 and word 2 is before word 3 under some alphabet, then word 1 is before word 3 under that alphabet too. So any alphabet that satisfies every adjacent pair automatically sorts the whole list, and comparing non-adjacent pairs adds no new information — only more work. Example 2 checks this: it re-verifies every list against the derived alphabet and prints \`words sorted under it=true\`.

📌 **Interview term: Prefix rule (invalid input)** — if the first word is longer and the shorter word is a prefix of it (\`"abc"\` before \`"ab"\`), no alphabet can sort the list, because the shorter word must come first in every alphabet. Return \`""\` immediately. The reverse (\`"ab"\` before \`"abc"\`) is fine and gives no clue.

## 4. Build the Letter Graph, Then Topologically Sort It

For \`["wrt", "wrf", "er", "ett", "rftt"]\` the four adjacent pairs give:

| Pair | First difference | Edge |
| :--- | :--- | :--- |
| wrt, wrf | t vs f | t -> f |
| wrf, er | w vs e | w -> e |
| er, ett | r vs t | r -> t |
| ett, rftt | e vs r | e -> r |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 140" role="img" aria-label="Letter graph w to e to r to t to f, a single chain">
  <defs>
    <marker id="al2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="65" y="64" text-anchor="middle">w</text>
  <text class="d-sub" x="65" y="84" text-anchor="middle">in 0</text>
  <rect class="d-box" x="160" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="205" y="64" text-anchor="middle">e</text>
  <text class="d-sub" x="205" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="300" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="345" y="64" text-anchor="middle">r</text>
  <text class="d-sub" x="345" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="440" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="485" y="64" text-anchor="middle">t</text>
  <text class="d-sub" x="485" y="84" text-anchor="middle">in 1</text>
  <rect class="d-box" x="580" y="40" width="90" height="54" rx="8"/>
  <text class="d-text" x="625" y="64" text-anchor="middle">f</text>
  <text class="d-sub" x="625" y="84" text-anchor="middle">in 1</text>
  <path class="d-edge" d="M 110 67 L 154 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 250 67 L 294 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 390 67 L 434 67" marker-end="url(#al2-arrow)"/>
  <path class="d-edge" d="M 530 67 L 574 67" marker-end="url(#al2-arrow)"/>
</svg>

The edges happen to form a single chain, so the alphabet is \`"wertf"\` and it is the only possible answer.

Then run **Kahn's algorithm** on the letters:

1. Mark every letter that appears in any word (letters with no clues must still appear in the answer).
2. Add each precedence edge **once** and count in-degrees; the same clue can come from several pairs, and counting it twice would need two decrements.
3. Queue the letters with in-degree 0, pop one, append it, decrement its successors, enqueue any that reach 0.
4. If fewer letters come out than appeared, the clues contain a cycle (\`["z", "x", "z"]\` gives z -> x and x -> z): return \`""\`.

📌 **Interview term: Unique order** — the alphabet is fully determined only if, at every step of Kahn, **exactly one** letter is ready. If the queue ever holds two letters, nothing orders them and several alphabets fit. \`["ab", "adc"]\` gives only \`b -> d\`, so \`a\` and \`c\` float freely: Example 2 prints \`unique=false\`.

With only 26 letters, a 26 x 26 boolean matrix is a simple and fast way to store "edge already added", and scanning letters \`a\` to \`z\` makes the output deterministic (ties are broken alphabetically by queue order).

📌 **Interview term: Verifying an alien dictionary** — the easier reverse problem (LeetCode 953): given the alphabet, check whether the words are sorted. Map each letter to its rank and compare adjacent words with the same first-difference and prefix rules. Example 2 includes it.

A DFS-based topological sort works here too (three colours on the letter graph; a GRAY letter means a contradiction); the trade-offs are the same as in [Kahn vs DFS](/interview-question/course-schedule-detect-cycle-with-topological-sort-kahn-vs-dfs). Building a graph out of words and then searching it is also the idea behind [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem), where the edges are one-letter changes instead of precedence clues.

## 6. The Code in C++

~~~cpp
string alienOrder(const vector<string>& words) {
    bool present[26] = {};
    for (const string& w : words) for (char ch : w) present[ch - 'a'] = true;
    bool edge[26][26] = {};                              // edge[a][b]: a comes before b
    int indegree[26] = {};
    for (size_t i = 0; i + 1 < words.size(); i++) {      // only ADJACENT pairs are needed
        const string& first = words[i];
        const string& second = words[i + 1];
        size_t len = min(first.size(), second.size());
        size_t j = 0;
        while (j < len && first[j] == second[j]) j++;
        if (j == len) {                                  // no difference found in the overlap
            if (first.size() > second.size()) return "";  // "abc" before "ab" is impossible
            continue;
        }
        int x = first[j] - 'a', y = second[j] - 'a';     // the first difference is the only clue
        if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }   // ignore repeated clues
    }
    queue<int> q;
    int letters = 0;
    for (int c = 0; c < 26; c++) {
        if (!present[c]) continue;
        letters++;
        if (indegree[c] == 0) q.push(c);
    }
    string order;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        order += char('a' + c);
        for (int d = 0; d < 26; d++) {
            if (edge[c][d] && --indegree[d] == 0) q.push(d);
        }
    }
    return (int)order.size() < letters ? "" : order;     // some letters sit on a cycle
}
~~~

**C++ details doing the work:**

- \`ch - 'a'\` maps letters to \`0..25\`; \`char('a' + c)\` maps back.
- \`bool present[26] = {};\`, \`bool edge[26][26] = {};\` and \`int indegree[26] = {};\` are **zero-initialised** by the empty braces. Without \`= {}\`, local arrays hold garbage.
- \`size_t len = min(first.size(), second.size())\` keeps lengths unsigned and avoids signed/unsigned comparison warnings in the loop.
- \`const string& first = words[i];\` avoids copying each word.
- \`order += char('a' + c)\` appends to a \`std::string\`; for at most 26 letters that is trivially cheap.

Example 2 adds the unique-order check (\`q.size() > 1\` at any step) and LeetCode 953 verification with an \`int rank[26]\` table.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Derive the alien alphabet: normal, contradictory and prefix cases** prints:

~~~text
[wrt, wrf, er, ett, rftt] -> "wertf"
[z, x] -> "zx"
[z, x, z] -> "" (invalid)
[abc, ab] -> "" (invalid)
[ab, abc] -> "abc"
[z, z] -> "z"
[ab, adc] -> "abcd"
[baa, abcd, abca, cab, cad] -> "bdac"
[caa, aaa, aab] -> "cab"
~~~

**Example 2 — Is the order unique, and does it really sort the words? (LeetCode 953 check)** prints:

~~~text
[wrt, wrf, er, ett, rftt] order=wertf unique=true words sorted under it=true
[ab, adc] order=abcd unique=false words sorted under it=true
[caa, aaa, aab] order=cab unique=true words sorted under it=true
[z, x, z] order=- unique=false words sorted under it=false
check hello, leetcode: true
check word, world, row: false
check apple, app: false
~~~

**Reading the output:** In Example 1, the classic input gives \`"wertf"\`. \`[z, x, z]\` gives contradictory clues (z before x, then x before z), so it is invalid. \`[abc, ab]\` breaks the prefix rule and is rejected before any sorting. \`[ab, abc]\` yields no clue at all, so the three letters come out alphabetically by queue order: \`"abc"\`. \`[z, z]\` has one letter. \`[ab, adc]\` only knows b before d, and the queue releases a, b, c, then d. In Example 2, \`unique=true\` for the chain inputs and \`unique=false\` for \`[ab, adc]\`; every derived alphabet re-sorts its own word list, and the three verification checks match LeetCode 953 (\`hello, leetcode\` is sorted under its alphabet; \`word, world, row\` and \`apple, app\` are not).

## 9. Complexity

Let **C** be the total number of characters in all words, **N** the number of words, and **U** the number of distinct letters (at most 26).

| Step | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Mark letters that appear | O(C) | O(U) | read every character once |
| Compare adjacent pairs | O(C) | O(min(U^2, N)) edges | each pair scans at most the shorter word; at most one edge per pair |
| Kahn on the letter graph (matrix) | O(U^2) | O(U^2) | for each letter, scan 26 possible successors |
| Total | O(C + U^2) | O(U^2) | with U at most 26, the letter part is effectively constant |

With an adjacency list instead of the 26 x 26 matrix, Kahn is O(U + E). Either way, the work is dominated by reading the input once.

## 10. Edge Cases

- **One word:** no pairs, no clues; return its distinct letters in any order.
- **Identical neighbours (\`["z", "z"]\`):** no difference, no clue, and no prefix problem.
- **Prefix in the right order (\`["ab", "abc"]\`):** fine, no clue.
- **Prefix in the wrong order (\`["abc", "ab"]\`):** invalid, return \`""\`.
- **Contradiction (\`["z", "x", "z"]\`):** a cycle in the letter graph, return \`""\`.
- **Letters with no clues:** must still be in the answer; seed the queue from **all** letters that appear.
- **The same clue twice:** add the edge once, or count and decrement it consistently.

## Common Pitfalls

- **Comparing every pair of words.** O(N^2 * L) and adds nothing; adjacent pairs are enough.
- **Using letters after the first difference.** Only the first differing position is a clue.
- **Missing the prefix trap.** \`{"abc", "ab"}\` must return \`""\`.
- **Dropping letters with no clues.** Seed the queue from every letter that appears.
- **Uninitialised arrays.** \`bool edge[26][26];\` inside a function is garbage; write \`= {}\`.
- **\`i < words.size() - 1\` as the loop bound.** \`size()\` is unsigned, so for an empty list \`size() - 1\` wraps around to a huge number and the loop reads out of bounds; write \`i + 1 < words.size()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clues:</strong> <span style="color:#f0e2c8;">For each adjacent pair, walk both words with an index until they differ; that one position gives an edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -&gt; b</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Invalid input:</strong> <span style="color:#f0e2c8;">If no difference is found and the first word is longer, it is a prefix violation: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Graph:</strong> <span style="color:#f0e2c8;">Nodes are all letters that appear; add each edge once in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool edge[26][26] = {}</code> and count in-degrees in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int indegree[26] = {}</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sort:</strong> <span style="color:#f0e2c8;">Kahn with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue&lt;int&gt;</code>; if fewer letters come out than appeared, the clues have a cycle: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(C + U^2) for C characters and U at most 26 letters; effectively linear in the input size.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are adjacent pairs enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lexicographic order is transitive, so an alphabet that sorts every adjacent pair sorts the whole list. Example 2 re-checks each derived alphabet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know if the answer is unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the Kahn queue ever holds more than one letter, those letters are unordered by any clue, so several alphabets fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the smallest valid alphabet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code>; the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is a max-heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">= {}</code> on the arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Local built-in arrays are not initialised in C++; empty braces zero them. Forgetting it gives random edges and in-degrees.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of Kahn?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three colours on the letter graph, a GRAY letter means a contradiction, and the reverse finish order is the alphabet. Kahn avoids recursion and makes uniqueness easy to check.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lexicographic order** | dictionary order decided by the first differing letter |
| **Precedence edge** | a -> b meaning letter a comes before letter b |
| **Prefix rule** | a longer word cannot come before its own prefix; that input is invalid |
| **Unique order** | only one letter is ever ready in Kahn, so only one alphabet fits |
| **Verifying an alien dictionary** | the reverse check: are the words sorted under a given alphabet |
| **Topological sort** | ordering nodes so every edge points forward; here, the letters |
| **Zero-initialisation** | = {} on a local array sets every element to zero |

---
**Conclusion:** The Alien Dictionary is a topological sort hiding behind string comparison. Each pair of neighbouring words contributes at most one rule — the first letters where they differ — and a longer word before its own prefix makes the input invalid. Put the rules into a letter graph, run Kahn's algorithm over every letter that appears, and either all letters come out in a valid alphabet or a cycle proves the rules contradict each other. It runs in time linear in the input plus a constant for the 26 letters, and the same queue tells you whether the alphabet is unique. In C++, \`char\` arithmetic, zero-initialised fixed arrays, and a \`std::queue\` keep it short and correct.`,
        examples: [
          { label: `Derive the alien alphabet: normal, contradictory and prefix cases`, code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

// Return one valid letter order, or "" if the word list is contradictory.
string alienOrder(const vector<string>& words) {
    bool present[26] = {};
    for (const string& w : words) for (char ch : w) present[ch - 'a'] = true;
    bool edge[26][26] = {};                              // edge[a][b]: a comes before b
    int indegree[26] = {};
    for (size_t i = 0; i + 1 < words.size(); i++) {      // only ADJACENT pairs are needed
        const string& first = words[i];
        const string& second = words[i + 1];
        size_t len = min(first.size(), second.size());
        size_t j = 0;
        while (j < len && first[j] == second[j]) j++;
        if (j == len) {                                  // no difference found in the overlap
            if (first.size() > second.size()) return "";  // "abc" before "ab" is impossible
            continue;
        }
        int x = first[j] - 'a', y = second[j] - 'a';     // the first difference is the only clue
        if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }   // ignore repeated clues
    }
    queue<int> q;
    int letters = 0;
    for (int c = 0; c < 26; c++) {
        if (!present[c]) continue;
        letters++;
        if (indegree[c] == 0) q.push(c);
    }
    string order;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        order += char('a' + c);
        for (int d = 0; d < 26; d++) {
            if (edge[c][d] && --indegree[d] == 0) q.push(d);
        }
    }
    return (int)order.size() < letters ? "" : order;     // some letters sit on a cycle
}

string show(const vector<string>& words) {
    string result = alienOrder(words);
    string s = "[";
    for (size_t i = 0; i < words.size(); i++) s += (i ? ", " : "") + words[i];
    return s + "] -> " + (result.empty() ? "\\"\\" (invalid)" : "\\"" + result + "\\"");
}

int main() {
    cout << show({"wrt", "wrf", "er", "ett", "rftt"}) << "\\n";
    cout << show({"z", "x"}) << "\\n";
    cout << show({"z", "x", "z"}) << "\\n";
    cout << show({"abc", "ab"}) << "\\n";
    cout << show({"ab", "abc"}) << "\\n";
    cout << show({"z", "z"}) << "\\n";
    cout << show({"ab", "adc"}) << "\\n";
    cout << show({"baa", "abcd", "abca", "cab", "cad"}) << "\\n";
    cout << show({"caa", "aaa", "aab"}) << "\\n";
}` },
          { label: `Is the order unique, and does it really sort the words? (LeetCode 953 check)`, code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

// Kahn on letters. Returns "" when the input is invalid; sets unique.
string derive(const vector<string>& words, bool& unique) {
    bool present[26] = {};
    for (const string& w : words) for (char ch : w) present[ch - 'a'] = true;
    bool edge[26][26] = {};
    int indegree[26] = {};
    unique = false;
    for (size_t i = 0; i + 1 < words.size(); i++) {
        const string& first = words[i];
        const string& second = words[i + 1];
        size_t len = min(first.size(), second.size()), j = 0;
        while (j < len && first[j] == second[j]) j++;
        if (j == len) {
            if (first.size() > second.size()) return "";
            continue;
        }
        int x = first[j] - 'a', y = second[j] - 'a';
        if (!edge[x][y]) { edge[x][y] = true; indegree[y]++; }
    }
    queue<int> q;
    int letters = 0;
    for (int c = 0; c < 26; c++) if (present[c]) { letters++; if (indegree[c] == 0) q.push(c); }
    string order;
    bool onlyOne = true;
    while (!q.empty()) {
        if (q.size() > 1) onlyOne = false;                // two letters ready at once
        int c = q.front(); q.pop();
        order += char('a' + c);
        for (int d = 0; d < 26; d++) if (edge[c][d] && --indegree[d] == 0) q.push(d);
    }
    if ((int)order.size() < letters) return "";
    unique = onlyOne;
    return order;
}

// LeetCode 953: are the words sorted under this alphabet?
bool isSorted(const vector<string>& words, const string& order) {
    int rank[26] = {};
    for (size_t i = 0; i < order.size(); i++) rank[order[i] - 'a'] = i;
    for (size_t i = 0; i + 1 < words.size(); i++) {
        const string& first = words[i];
        const string& second = words[i + 1];
        size_t len = min(first.size(), second.size()), j = 0;
        while (j < len && first[j] == second[j]) j++;
        if (j == len) { if (first.size() > second.size()) return false; continue; }
        if (rank[first[j] - 'a'] > rank[second[j] - 'a']) return false;
    }
    return true;
}

int main() {
    cout << boolalpha;
    vector<vector<string>> lists = {{"wrt", "wrf", "er", "ett", "rftt"}, {"ab", "adc"}, {"caa", "aaa", "aab"}, {"z", "x", "z"}};
    for (const auto& words : lists) {
        bool unique;
        string order = derive(words, unique);
        bool check = !order.empty() && isSorted(words, order);
        string joined;
        for (size_t i = 0; i < words.size(); i++) joined += (i ? ", " : "") + words[i];
        cout << "[" << joined << "] order=" << (order.empty() ? "-" : order)
             << " unique=" << unique << " words sorted under it=" << check << "\\n";
    }
    string english = "abcdefghijklmnopqrstuvwxyz";
    cout << "check hello, leetcode: " << isSorted({"hello", "leetcode"}, "hlabcdefgijkmnopqrstuvwxyz") << "\\n";
    cout << "check word, world, row: " << isSorted({"word", "world", "row"}, "worldabcefghijkmnpqstuvxyz") << "\\n";
    cout << "check apple, app: " << isSorted({"apple", "app"}, english) << "\\n";
}` },
        ],
      },
    },
  },
];

export default augments;
